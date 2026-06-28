import { describe, expect, it } from 'vitest';
import { PlaybackLockService } from './playbackLockService';

function fixedService() {
  let now = new Date('2026-06-25T10:30:00.000Z');

  return {
    service: new PlaybackLockService({
      tokenSecret: 'test-secret',
      now: () => now,
    }),
    advance(seconds: number) {
      now = new Date(now.getTime() + seconds * 1000);
    },
  };
}

describe('PlaybackLockService', () => {
  it('acquires a lock and refreshes when the same device starts again', () => {
    const { service } = fixedService();

    const first = service.startPlayback({
      userId: 'user_1',
      deviceId: 'dev_1',
      lessonId: 'lesson_1',
      courseId: 'course_1',
      ipAddress: '192.0.2.1',
      userAgent: 'Expo',
    });
    const second = service.startPlayback({
      userId: 'user_1',
      deviceId: 'dev_1',
      lessonId: 'lesson_1',
      courseId: 'course_1',
      ipAddress: '192.0.2.1',
      userAgent: 'Expo',
    });

    expect(first.status).toBe('success');
    expect(second.status).toBe('success');

    if (first.status === 'success' && second.status === 'success') {
      expect(first.action).toBe('acquired');
      expect(second.action).toBe('refreshed');
      expect(second.sessionId).toBe(first.sessionId);
      expect(second.lockVersion).toBe(first.lockVersion);
    }
  });

  it('returns conflict and records conflict count for another device', () => {
    const { service } = fixedService();

    service.startPlayback({
      userId: 'user_1',
      deviceId: 'dev_1',
      lessonId: 'lesson_1',
      courseId: 'course_1',
    });
    const conflict = service.startPlayback({
      userId: 'user_1',
      deviceId: 'dev_2',
      lessonId: 'lesson_1',
      courseId: 'course_1',
    });

    expect(conflict).toMatchObject({
      status: 'conflict',
      currentDevice: 'dev_1',
      canForce: true,
    });
    expect(service.getConflictCount('user_1', 'dev_2')).toBe(1);
  });

  it('rejects stale heartbeats with a mismatched lock version', () => {
    const { service } = fixedService();

    const first = service.startPlayback({
      userId: 'user_1',
      deviceId: 'dev_1',
      lessonId: 'lesson_1',
      courseId: 'course_1',
    });

    expect(first.status).toBe('success');
    if (first.status !== 'success') return;

    const heartbeat = service.refreshHeartbeat({
      userId: 'user_1',
      deviceId: 'dev_1',
      sessionId: first.sessionId,
      lockVersion: first.lockVersion + 1,
    });

    expect(heartbeat).toMatchObject({
      status: 'error',
      reason: 'version_mismatch',
      currentVersion: first.lockVersion,
    });
  });

  it('force switches to a new session and rejects the old session heartbeat', () => {
    const { service } = fixedService();

    const first = service.startPlayback({
      userId: 'user_1',
      deviceId: 'dev_1',
      lessonId: 'lesson_1',
      courseId: 'course_1',
    });

    expect(first.status).toBe('success');
    if (first.status !== 'success') return;

    const switched = service.forceSwitch({
      userId: 'user_1',
      newDeviceId: 'dev_2',
      lessonId: 'lesson_1',
      courseId: 'course_1',
    });

    expect(switched.status).toBe('success');
    if (switched.status !== 'success') return;

    expect(switched.oldSessionId).toBe(first.sessionId);
    expect(switched.oldDeviceId).toBe('dev_1');
    expect(switched.lockVersion).toBeGreaterThan(first.lockVersion);

    expect(
      service.refreshHeartbeat({
        userId: 'user_1',
        deviceId: 'dev_1',
        sessionId: first.sessionId,
        lockVersion: first.lockVersion,
      }),
    ).toMatchObject({ status: 'error', reason: 'session_mismatch' });
  });

  it('expires locks when heartbeats stop', () => {
    const env = fixedService();
    const first = env.service.startPlayback({
      userId: 'user_1',
      deviceId: 'dev_1',
      lessonId: 'lesson_1',
      courseId: 'course_1',
    });

    expect(first.status).toBe('success');
    if (first.status !== 'success') return;

    env.advance(91);

    expect(
      env.service.refreshHeartbeat({
        userId: 'user_1',
        deviceId: 'dev_1',
        sessionId: first.sessionId,
        lockVersion: first.lockVersion,
      }),
    ).toMatchObject({ status: 'error', reason: 'lock_expired' });
  });

  it('only ends a session when session and device match', () => {
    const { service } = fixedService();
    const first = service.startPlayback({
      userId: 'user_1',
      deviceId: 'dev_1',
      lessonId: 'lesson_1',
      courseId: 'course_1',
    });

    expect(first.status).toBe('success');
    if (first.status !== 'success') return;

    expect(
      service.endPlayback({
        userId: 'user_1',
        deviceId: 'dev_wrong',
        sessionId: first.sessionId,
      }),
    ).toMatchObject({ status: 'error', reason: 'session_not_found' });

    expect(
      service.endPlayback({
        userId: 'user_1',
        deviceId: 'dev_1',
        sessionId: first.sessionId,
      }),
    ).toMatchObject({ status: 'success' });
    expect(service.getStatus('user_1')).toMatchObject({ status: 'idle' });
  });
});
