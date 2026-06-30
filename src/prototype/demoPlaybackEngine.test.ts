import { describe, expect, it } from 'vitest';
import {
  advanceDemoTime,
  createDemoState,
  endPlayback,
  forceSwitch,
  getLockTtlSeconds,
  heartbeat,
  registerDevice,
  setRedisAvailable,
  startPlayback,
} from './demoPlaybackEngine';

function setup() {
  let state = createDemoState(Date.parse('2026-06-28T10:00:00Z'));
  const registered = registerDevice(state, {
    user_id: 'user_123',
    device_name: 'Chrome on Mac',
    platform: 'web',
  });
  state = registered.state;
  return { state, device: registered.result };
}

describe('demo playback engine', () => {
  it('provides student, parent, teacher, and admin demo roles', () => {
    expect(createDemoState().users.map((user) => user.role)).toEqual(['student', 'admin', 'teacher', 'parent']);
  });

  it('registers a device and creates a 90 second lock', () => {
    const setupState = setup();
    const started = startPlayback(setupState.state, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      course_id: 'course_001', lesson_id: 'lesson_001',
    });
    expect(started.result.allowed).toBe(true);
    if (!started.result.allowed) throw new Error('Expected playback to start.');
    expect(started.result.watermark).toMatchObject({
      display_text: '@darya.ahmed',
      session_id: started.result.session_id,
    });
    expect(started.result.watermark.trace_code).toMatch(/^EL-[0-9A-F]{8}$/);
    expect(getLockTtlSeconds(started.state, 'user_123')).toBe(90);
    expect(started.state.playback_sessions).toHaveLength(1);
  });

  it('blocks a second device and stores a risk event', () => {
    let setupState = setup();
    const second = registerDevice(setupState.state, {
      user_id: 'user_123', device_name: 'iPhone 15 Pro', platform: 'ios',
    });
    setupState.state = second.state;
    const first = startPlayback(setupState.state, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      course_id: 'course_001', lesson_id: 'lesson_001',
    });
    const conflict = startPlayback(first.state, {
      user_id: 'user_123', device_id: second.result.device_id,
      course_id: 'course_001', lesson_id: 'lesson_001',
    });
    expect(conflict.result.allowed).toBe(false);
    expect('watermark' in conflict.result).toBe(false);
    expect(conflict.state.playback_risk_events[0]?.event_type).toBe('ACTIVE_SESSION_CONFLICT');
  });

  it('refreshes only a matching heartbeat', () => {
    const setupState = setup();
    const started = startPlayback(setupState.state, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      course_id: 'course_001', lesson_id: 'lesson_001',
    });
    if (!started.result.allowed) throw new Error('Expected playback to start.');
    const moved = advanceDemoTime(started.state, 20);
    const refreshed = heartbeat(moved, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      session_id: started.result.session_id, lock_version: 1,
    });
    expect(refreshed.result.ok).toBe(true);
    expect(getLockTtlSeconds(refreshed.state, 'user_123')).toBe(90);

    const rejected = heartbeat(refreshed.state, {
      user_id: 'user_123', device_id: 'device_wrong',
      session_id: started.result.session_id, lock_version: 1,
    });
    expect(rejected.result.reason).toBe('DEVICE_MISMATCH');
  });

  it('force switches and rejects the old session heartbeat', () => {
    let setupState = setup();
    const second = registerDevice(setupState.state, {
      user_id: 'user_123', device_name: 'iPhone 15 Pro', platform: 'ios',
    });
    setupState.state = second.state;
    const first = startPlayback(setupState.state, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      course_id: 'course_001', lesson_id: 'lesson_001',
    });
    if (!first.result.allowed) throw new Error('Expected playback to start.');
    const switched = forceSwitch(first.state, {
      user_id: 'user_123', device_id: second.result.device_id,
      course_id: 'course_001', lesson_id: 'lesson_001',
    });
    const stale = heartbeat(switched.state, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      session_id: first.result.session_id, lock_version: 1,
    });
    expect(stale.result.reason).toBe('SESSION_MISMATCH');
    if (!switched.result.allowed) throw new Error('Expected force switch to succeed.');
    expect(switched.result.watermark.session_id).toBe(switched.result.session_id);
    expect(switched.state.playback_sessions[1]?.end_reason).toBe('FORCE_SWITCHED');
  });

  it('expires a lock and records the permanent session result', () => {
    const setupState = setup();
    const started = startPlayback(setupState.state, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      course_id: 'course_001', lesson_id: 'lesson_001',
    });
    const expired = advanceDemoTime(started.state, 91);
    expect(expired.locks.user_123).toBeUndefined();
    expect(expired.playback_sessions[0]?.end_reason).toBe('LOCK_EXPIRED');
    expect(expired.playback_risk_events[0]?.event_type).toBe('SESSION_EXPIRED');
  });

  it('only lets the matching session end playback', () => {
    const setupState = setup();
    const started = startPlayback(setupState.state, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      course_id: 'course_001', lesson_id: 'lesson_001',
    });
    if (!started.result.allowed) throw new Error('Expected playback to start.');
    const stale = endPlayback(started.state, {
      user_id: 'user_123', device_id: setupState.device.device_id, session_id: 'session_wrong',
    });
    expect(stale.result.ok).toBe(false);
    expect(stale.state.locks.user_123).toBeDefined();
    const ended = endPlayback(stale.state, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      session_id: started.result.session_id,
    });
    expect(ended.result.ok).toBe(true);
    expect(ended.state.locks.user_123).toBeUndefined();
  });

  it('fails closed when Redis is unavailable', () => {
    const setupState = setup();
    const unavailable = setRedisAvailable(setupState.state, false);
    const started = startPlayback(unavailable, {
      user_id: 'user_123', device_id: setupState.device.device_id,
      course_id: 'course_001', lesson_id: 'lesson_001',
    });
    expect(started.result.allowed).toBe(false);
    if (started.result.allowed) throw new Error('Expected playback to be blocked.');
    expect(started.result.reason).toBe('LOCK_SERVICE_UNAVAILABLE');
  });
});
