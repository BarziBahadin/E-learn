import { createHash, createHmac, randomUUID } from 'node:crypto';
import { InMemoryPlaybackStore } from './inMemoryPlaybackStore';
import {
  playbackConflictKey,
  playbackCooldownKey,
  playbackLockKey,
  playbackRateLimitKey,
  playbackSessionKey,
  playbackVersionKey,
} from './redisKeys';
import type {
  AcquirePlaybackLockResult,
  EndPlaybackInput,
  EndPlaybackResult,
  ForceSwitchInput,
  ForceSwitchResult,
  HeartbeatInput,
  HeartbeatResult,
  PlaybackCooldown,
  PlaybackLockMetadata,
  PlaybackSessionBinding,
  PlaybackStatusResult,
  RequestFingerprint,
  StartPlaybackInput,
} from './types';

type PlaybackLockServiceOptions = {
  store?: InMemoryPlaybackStore;
  lockTtlSeconds?: number;
  cooldownTtlSeconds?: number;
  acquireRateLimit?: number;
  forceSwitchRateLimit?: number;
  tokenSecret?: string;
  now?: () => Date;
};

export class PlaybackLockService {
  private readonly store: InMemoryPlaybackStore;
  private readonly lockTtlSeconds: number;
  private readonly cooldownTtlSeconds: number;
  private readonly acquireRateLimit: number;
  private readonly forceSwitchRateLimit: number;
  private readonly tokenSecret: string;
  private readonly now: () => Date;

  constructor(options: PlaybackLockServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.store =
      options.store ??
      new InMemoryPlaybackStore(() => this.now().getTime());
    this.lockTtlSeconds = options.lockTtlSeconds ?? 90;
    this.cooldownTtlSeconds = options.cooldownTtlSeconds ?? 10;
    this.acquireRateLimit = options.acquireRateLimit ?? 10;
    this.forceSwitchRateLimit = options.forceSwitchRateLimit ?? 3;
    this.tokenSecret =
      options.tokenSecret ?? 'local-development-playback-token-secret';
  }

  startPlayback(input: StartPlaybackInput): AcquirePlaybackLockResult {
    const limited = this.hitRateLimit(
      playbackRateLimitKey(input.userId, 'start'),
      this.acquireRateLimit,
    );

    if (limited) {
      return {
        status: 'blocked',
        reason: 'rate_limited',
        retryAfterSeconds: 60,
      };
    }

    const currentTime = this.currentTime();
    const cooldown = this.readJson<PlaybackCooldown>(
      playbackCooldownKey(input.userId),
    );

    if (cooldown && cooldown.cooldownEnd > currentTime) {
      return {
        status: 'blocked',
        reason: 'cooldown_active',
        cooldownUntil: cooldown.cooldownEnd,
      };
    }

    const lockKey = playbackLockKey(input.userId);
    const existingLock = this.readJson<PlaybackLockMetadata>(lockKey);

    if (existingLock) {
      if (existingLock.deviceId === input.deviceId) {
        const refreshedLock = {
          ...existingLock,
          lastHeartbeat: currentTime,
          playbackToken: this.createPlaybackToken({
            userId: input.userId,
            deviceId: input.deviceId,
            sessionId: existingLock.sessionId,
            lockVersion: existingLock.lockVersion,
          }),
          ...this.hashFingerprint(input),
        };

        this.writeJson(lockKey, this.lockTtlSeconds, refreshedLock);
        this.store.expire(
          playbackSessionKey(existingLock.sessionId),
          this.lockTtlSeconds,
        );

        return {
          status: 'success',
          action: 'refreshed',
          sessionId: refreshedLock.sessionId,
          lockVersion: refreshedLock.lockVersion,
          playbackToken: refreshedLock.playbackToken,
          expiresAt: this.expiresAt(),
        };
      }

      this.store.incr(playbackConflictKey(input.userId, input.deviceId));
      return {
        status: 'conflict',
        currentDevice: existingLock.deviceId,
        currentSession: existingLock.sessionId,
        lockVersion: existingLock.lockVersion,
        canForce: true,
      };
    }

    return this.createNewLock({
      userId: input.userId,
      deviceId: input.deviceId,
      lessonId: input.lessonId,
      courseId: input.courseId,
      fingerprint: input,
      action: 'acquired',
    });
  }

  refreshHeartbeat(input: HeartbeatInput): HeartbeatResult {
    const lock = this.readJson<PlaybackLockMetadata>(
      playbackLockKey(input.userId),
    );

    if (!lock) {
      return { status: 'error', reason: 'lock_expired' };
    }

    if (lock.sessionId !== input.sessionId) {
      return { status: 'error', reason: 'session_mismatch' };
    }

    if (lock.lockVersion !== input.lockVersion) {
      return {
        status: 'error',
        reason: 'version_mismatch',
        currentVersion: lock.lockVersion,
      };
    }

    if (lock.deviceId !== input.deviceId) {
      return { status: 'error', reason: 'device_mismatch' };
    }

    const refreshedAt = this.currentTime();
    this.writeJson(playbackLockKey(input.userId), this.lockTtlSeconds, {
      ...lock,
      lastHeartbeat: refreshedAt,
    });
    this.store.expire(playbackSessionKey(input.sessionId), this.lockTtlSeconds);

    return {
      status: 'success',
      refreshedAt,
      lockExpiresAt: this.expiresAt(),
    };
  }

  forceSwitch(input: ForceSwitchInput): ForceSwitchResult {
    const limited = this.hitRateLimit(
      playbackRateLimitKey(input.userId, 'force-switch'),
      this.forceSwitchRateLimit,
    );

    if (limited) {
      return { status: 'error', reason: 'rate_limited' };
    }

    const oldLock = this.readJson<PlaybackLockMetadata>(
      playbackLockKey(input.userId),
    );

    if (!oldLock) {
      return { status: 'error', reason: 'no_active_session' };
    }

    const currentTime = this.currentTime();
    const cooldownEnd = new Date(
      this.now().getTime() + this.cooldownTtlSeconds * 1000,
    ).toISOString();

    this.writeJson<PlaybackCooldown>(
      playbackCooldownKey(input.userId),
      this.cooldownTtlSeconds,
      {
        deviceId: oldLock.deviceId,
        sessionId: oldLock.sessionId,
        cooldownStart: currentTime,
        cooldownEnd,
      },
    );

    const newLock = this.createNewLock({
      userId: input.userId,
      deviceId: input.newDeviceId,
      lessonId: input.lessonId,
      courseId: input.courseId,
      fingerprint: input,
      action: 'acquired',
    });

    this.store.del(playbackSessionKey(oldLock.sessionId));

    if (newLock.status !== 'success') {
      return { status: 'error', reason: 'no_active_session' };
    }

    return {
      status: 'success',
      sessionId: newLock.sessionId,
      lockVersion: newLock.lockVersion,
      playbackToken: newLock.playbackToken,
      oldSessionId: oldLock.sessionId,
      oldDeviceId: oldLock.deviceId,
      expiresAt: newLock.expiresAt,
    };
  }

  endPlayback(input: EndPlaybackInput): EndPlaybackResult {
    const lock = this.readJson<PlaybackLockMetadata>(
      playbackLockKey(input.userId),
    );

    if (
      lock &&
      lock.sessionId === input.sessionId &&
      lock.deviceId === input.deviceId
    ) {
      this.store.del(
        playbackLockKey(input.userId),
        playbackSessionKey(input.sessionId),
      );
      return { status: 'success' };
    }

    return { status: 'error', reason: 'session_not_found' };
  }

  getStatus(userId: string): PlaybackStatusResult {
    const lock = this.readJson<PlaybackLockMetadata>(playbackLockKey(userId));

    if (!lock) {
      return { status: 'idle' };
    }

    return {
      status: 'active',
      data: lock,
    };
  }

  getConflictCount(userId: string, deviceId: string) {
    return this.store.getCounter(playbackConflictKey(userId, deviceId));
  }

  private createNewLock(input: {
    userId: string;
    deviceId: string;
    lessonId: string;
    courseId: string;
    fingerprint: RequestFingerprint;
    action: 'acquired';
  }): AcquirePlaybackLockResult {
    const sessionId = `sess_${randomUUID()}`;
    const lockVersion = this.nextLockVersion(input.userId);
    const playbackToken = this.createPlaybackToken({
      userId: input.userId,
      deviceId: input.deviceId,
      sessionId,
      lockVersion,
    });
    const currentTime = this.currentTime();
    const fingerprint = this.hashFingerprint(input.fingerprint);

    const lock: PlaybackLockMetadata = {
      lockVersion,
      deviceId: input.deviceId,
      sessionId,
      userId: input.userId,
      lessonId: input.lessonId,
      courseId: input.courseId,
      startedAt: currentTime,
      lastHeartbeat: currentTime,
      playbackToken,
      ipHash: fingerprint.ipHash,
      userAgentHash: fingerprint.userAgentHash,
    };
    const session: PlaybackSessionBinding = {
      userId: input.userId,
      deviceId: input.deviceId,
      lockVersion,
      playbackToken,
      createdAt: currentTime,
    };

    this.writeJson(playbackLockKey(input.userId), this.lockTtlSeconds, lock);
    this.writeJson(
      playbackSessionKey(sessionId),
      this.lockTtlSeconds,
      session,
    );

    return {
      status: 'success',
      action: input.action,
      sessionId,
      lockVersion,
      playbackToken,
      expiresAt: this.expiresAt(),
    };
  }

  private nextLockVersion(userId: string) {
    return this.store.incr(playbackVersionKey(userId));
  }

  private hitRateLimit(key: string, limit: number) {
    const count = this.store.incr(key);

    if (count === 1) {
      this.store.setex(key, 60, JSON.stringify({ createdAt: this.currentTime() }));
      this.store.expire(key, 60);
    }

    return count > limit;
  }

  private createPlaybackToken(input: {
    userId: string;
    deviceId: string;
    sessionId: string;
    lockVersion: number;
  }) {
    const payload = JSON.stringify({
      ...input,
      expiresAt: this.expiresAt(),
    });

    return createHmac('sha256', this.tokenSecret).update(payload).digest('hex');
  }

  private hashFingerprint(input: RequestFingerprint) {
    return {
      ipHash: this.sha256(input.ipAddress ?? 'unknown-ip'),
      userAgentHash: this.sha256(input.userAgent ?? 'unknown-user-agent'),
    };
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private currentTime() {
    return this.now().toISOString();
  }

  private expiresAt() {
    return new Date(this.now().getTime() + this.lockTtlSeconds * 1000).toISOString();
  }

  private readJson<T>(key: string) {
    const value = this.store.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  private writeJson<T>(key: string, ttlSeconds: number, value: T) {
    this.store.setex(key, ttlSeconds, JSON.stringify(value));
  }
}
