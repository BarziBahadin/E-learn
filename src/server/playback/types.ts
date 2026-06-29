import type { PlaybackWatermark } from '../../features/playback/watermark';

export type PlaybackLockAction = 'acquired' | 'refreshed';

export type PlaybackLockMetadata = {
  lockVersion: number;
  deviceId: string;
  sessionId: string;
  userId: string;
  lessonId: string;
  courseId: string;
  startedAt: string;
  lastHeartbeat: string;
  playbackToken: string;
  ipHash: string;
  userAgentHash: string;
};

export type PlaybackSessionBinding = {
  userId: string;
  deviceId: string;
  lockVersion: number;
  playbackToken: string;
  createdAt: string;
};

export type PlaybackCooldown = {
  deviceId: string;
  sessionId: string;
  cooldownStart: string;
  cooldownEnd: string;
};

export type PlaybackLockSuccess = {
  status: 'success';
  action: PlaybackLockAction;
  sessionId: string;
  lockVersion: number;
  playbackToken: string;
  expiresAt: string;
  watermark?: PlaybackWatermark;
};

export type PlaybackLockConflict = {
  status: 'conflict';
  currentDevice: string;
  currentSession: string;
  lockVersion: number;
  canForce: boolean;
};

export type PlaybackLockBlocked = {
  status: 'blocked';
  reason: 'cooldown_active' | 'rate_limited';
  cooldownUntil?: string;
  retryAfterSeconds?: number;
};

export type AcquirePlaybackLockResult =
  | PlaybackLockSuccess
  | PlaybackLockConflict
  | PlaybackLockBlocked;

export type HeartbeatResult =
  | {
      status: 'success';
      refreshedAt: string;
      lockExpiresAt: string;
    }
  | {
      status: 'error';
      reason:
        | 'lock_expired'
        | 'session_mismatch'
        | 'version_mismatch'
        | 'device_mismatch';
      currentVersion?: number;
    };

export type ForceSwitchResult =
  | {
      status: 'success';
      sessionId: string;
      lockVersion: number;
      playbackToken: string;
      oldSessionId: string;
      oldDeviceId: string;
      expiresAt: string;
      watermark?: PlaybackWatermark;
    }
  | {
      status: 'error';
      reason: 'no_active_session' | 'rate_limited';
    };

export type EndPlaybackResult =
  | {
      status: 'success';
    }
  | {
      status: 'error';
      reason: 'session_not_found';
    };

export type PlaybackStatusResult =
  | {
      status: 'active';
      data: PlaybackLockMetadata;
    }
  | {
      status: 'idle';
    };

export type RequestFingerprint = {
  ipAddress?: string;
  userAgent?: string;
};

export type StartPlaybackInput = RequestFingerprint & {
  userId: string;
  deviceId: string;
  lessonId: string;
  courseId: string;
};

export type HeartbeatInput = {
  userId: string;
  deviceId: string;
  sessionId: string;
  lockVersion: number;
};

export type ForceSwitchInput = RequestFingerprint & {
  userId: string;
  newDeviceId: string;
  lessonId: string;
  courseId: string;
};

export type EndPlaybackInput = {
  userId: string;
  deviceId: string;
  sessionId: string;
};
