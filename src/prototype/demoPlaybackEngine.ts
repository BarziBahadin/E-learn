import { createDemoWatermark, type PlaybackWatermark } from '../features/playback/watermark';

export const LOCK_TTL_SECONDS = 90;
export const HEARTBEAT_INTERVAL_SECONDS = 20;
export const VIDEO_TOKEN_TTL_SECONDS = 60;

export type DemoUser = {
  id: 'user_123' | 'user_456' | 'user_789';
  name: string;
  email: string;
  username: string;
  role: 'student' | 'teacher' | 'admin';
};

export type DemoDevice = {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  platform: string;
  user_agent_hash: string;
  last_ip_hash: string;
  created_at: string;
  last_seen_at: string;
  is_blocked: boolean;
};

export type ActivePlaybackLock = {
  user_id: string;
  device_id: string;
  session_id: string;
  lock_version: number;
  course_id: string;
  lesson_id: string;
  started_at: string;
  last_heartbeat: string;
  ip_hash: string;
  user_agent_hash: string;
  platform: string;
  expires_at_ms: number;
};

export type DemoPlaybackSession = {
  id: string;
  user_id: string;
  device_id: string;
  session_id: string;
  course_id: string;
  lesson_id: string;
  started_at: string;
  ended_at: string | null;
  last_heartbeat_at: string;
  end_reason: string | null;
  ip_hash: string;
  user_agent_hash: string;
  platform: string;
  created_at: string;
  updated_at: string;
};

export type DemoRiskEvent = {
  id: string;
  user_id: string;
  device_id: string | null;
  session_id: string | null;
  event_type: string;
  event_message: string;
  metadata_json: Record<string, string | number | boolean>;
  ip_hash: string;
  user_agent_hash: string;
  created_at: string;
};

export type DemoPlaybackState = {
  users: DemoUser[];
  devices: DemoDevice[];
  playback_sessions: DemoPlaybackSession[];
  playback_risk_events: DemoRiskEvent[];
  locks: Record<string, ActivePlaybackLock | undefined>;
  cooldowns: Record<string, number | undefined>;
  conflict_counts: Record<string, number | undefined>;
  lock_versions: Record<string, number | undefined>;
  redis_available: boolean;
  now_ms: number;
  sequence: number;
};

export type StartResult =
  | {
      allowed: true;
      session_id: string;
      heartbeat_interval_seconds: number;
      video_token: string;
      video_token_expires_at_ms: number;
      watermark: PlaybackWatermark;
    }
  | {
      allowed: false;
      reason: 'ACTIVE_SESSION_EXISTS' | 'LOCK_SERVICE_UNAVAILABLE' | 'DEVICE_NOT_REGISTERED' | 'DEVICE_BLOCKED' | 'COOLDOWN_ACTIVE';
      message: string;
      can_force_switch: boolean;
      active_lock?: ActivePlaybackLock;
    };

export type HeartbeatResult = {
  ok: boolean;
  ttl_refreshed: boolean;
  reason?: 'LOCK_SERVICE_UNAVAILABLE' | 'LOCK_EXPIRED' | 'SESSION_MISMATCH' | 'DEVICE_MISMATCH' | 'VERSION_MISMATCH';
};

export type EngineResult<T> = { state: DemoPlaybackState; result: T };

const users: DemoUser[] = [
  { id: 'user_123', name: 'Darya Ahmed', email: 'darya@example.com', username: 'darya.ahmed', role: 'student' },
  { id: 'user_456', name: 'Soran Karim', email: 'soran@example.com', username: 'soran.karim', role: 'admin' },
  { id: 'user_789', name: 'Ahmed Hassan', email: 'ahmed.teacher@example.com', username: 'ahmed.hassan', role: 'teacher' },
];

export function createDemoState(nowMs = Date.now()): DemoPlaybackState {
  return {
    users,
    devices: [],
    playback_sessions: [],
    playback_risk_events: [],
    locks: {},
    cooldowns: {},
    conflict_counts: {},
    lock_versions: {},
    redis_available: true,
    now_ms: nowMs,
    sequence: 0,
  };
}

export function registerDevice(
  source: DemoPlaybackState,
  input: { user_id: string; device_name: string; platform: string },
): EngineResult<DemoDevice> {
  const state = cloneState(source);
  const existing = state.devices.find(
    (device) => device.user_id === input.user_id && device.device_name === input.device_name,
  );

  if (existing) {
    existing.last_seen_at = iso(state.now_ms);
    return { state, result: existing };
  }

  const deviceId = nextId(state, 'device');
  const device: DemoDevice = {
    id: nextId(state, 'row'),
    user_id: input.user_id,
    device_id: deviceId,
    device_name: input.device_name,
    platform: input.platform,
    user_agent_hash: demoHash(`${input.platform}:user-agent`),
    last_ip_hash: demoHash(`${input.user_id}:127.0.0.1`),
    created_at: iso(state.now_ms),
    last_seen_at: iso(state.now_ms),
    is_blocked: false,
  };

  state.devices.unshift(device);
  return { state, result: device };
}

export function startPlayback(
  source: DemoPlaybackState,
  input: { user_id: string; device_id: string; course_id: string; lesson_id: string },
): EngineResult<StartResult> {
  const state = expireStaleLocks(source);
  const fingerprint = fingerprintFor(input.user_id, input.device_id);

  if (!state.redis_available) {
    addRisk(state, input, 'REDIS_UNAVAILABLE', 'Playback start failed because the lock service was unavailable.', {});
    return blocked(state, 'LOCK_SERVICE_UNAVAILABLE', 'The playback lock service is unavailable.', false);
  }

  const device = state.devices.find(
    (candidate) => candidate.user_id === input.user_id && candidate.device_id === input.device_id,
  );

  if (!device) {
    return blocked(state, 'DEVICE_NOT_REGISTERED', 'Register this device before starting playback.', false);
  }

  if (device.is_blocked) {
    return blocked(state, 'DEVICE_BLOCKED', 'This device has been blocked.', false);
  }

  const cooldownUntil = state.cooldowns[input.user_id] ?? 0;
  if (cooldownUntil > state.now_ms) {
    return blocked(state, 'COOLDOWN_ACTIVE', 'Please wait for the device-switch cooldown.', false);
  }

  const existing = state.locks[input.user_id];
  if (existing) {
    const conflictKey = `${input.user_id}:${input.device_id}`;
    state.conflict_counts[conflictKey] = (state.conflict_counts[conflictKey] ?? 0) + 1;
    addRisk(
      state,
      { ...input, session_id: existing.session_id },
      'ACTIVE_SESSION_CONFLICT',
      'A second device attempted playback while another session was active.',
      { active_device_id: existing.device_id, conflict_count: state.conflict_counts[conflictKey] ?? 1 },
    );
    return {
      state,
      result: {
        allowed: false,
        reason: 'ACTIVE_SESSION_EXISTS',
        message: 'This account is already playing on another device.',
        can_force_switch: true,
        active_lock: existing,
      },
    };
  }

  const sessionId = nextId(state, 'session');
  const lockVersion = (state.lock_versions[input.user_id] ?? 0) + 1;
  state.lock_versions[input.user_id] = lockVersion;
  const now = iso(state.now_ms);
  const lock: ActivePlaybackLock = {
    user_id: input.user_id,
    device_id: input.device_id,
    session_id: sessionId,
    lock_version: lockVersion,
    course_id: input.course_id,
    lesson_id: input.lesson_id,
    started_at: now,
    last_heartbeat: now,
    ip_hash: fingerprint.ip_hash,
    user_agent_hash: fingerprint.user_agent_hash,
    platform: device.platform,
    expires_at_ms: state.now_ms + LOCK_TTL_SECONDS * 1000,
  };
  state.locks[input.user_id] = lock;
  device.last_seen_at = now;
  state.playback_sessions.unshift({
    id: nextId(state, 'row'),
    user_id: input.user_id,
    device_id: input.device_id,
    session_id: sessionId,
    course_id: input.course_id,
    lesson_id: input.lesson_id,
    started_at: now,
    ended_at: null,
    last_heartbeat_at: now,
    end_reason: null,
    ip_hash: fingerprint.ip_hash,
    user_agent_hash: fingerprint.user_agent_hash,
    platform: device.platform,
    created_at: now,
    updated_at: now,
  });

  return {
    state,
    result: {
      allowed: true,
      session_id: sessionId,
      heartbeat_interval_seconds: HEARTBEAT_INTERVAL_SECONDS,
      video_token: tokenFor(input.user_id, input.device_id, sessionId, lockVersion, state.now_ms),
      video_token_expires_at_ms: state.now_ms + VIDEO_TOKEN_TTL_SECONDS * 1000,
      watermark: createDemoWatermark(
        state.users.find((user) => user.id === input.user_id)?.username ?? input.user_id,
        sessionId,
      ),
    },
  };
}

export function heartbeat(
  source: DemoPlaybackState,
  input: { user_id: string; device_id: string; session_id: string; lock_version: number },
): EngineResult<HeartbeatResult> {
  const state = expireStaleLocks(source);
  if (!state.redis_available) {
    addRisk(state, input, 'REDIS_HEARTBEAT_FAILURE', 'Heartbeat failed because Redis was unavailable.', {});
    return { state, result: { ok: false, ttl_refreshed: false, reason: 'LOCK_SERVICE_UNAVAILABLE' } };
  }

  const lock = state.locks[input.user_id];
  let reason: HeartbeatResult['reason'];
  if (!lock) reason = 'LOCK_EXPIRED';
  else if (lock.session_id !== input.session_id) reason = 'SESSION_MISMATCH';
  else if (lock.device_id !== input.device_id) reason = 'DEVICE_MISMATCH';
  else if (lock.lock_version !== input.lock_version) reason = 'VERSION_MISMATCH';

  if (reason || !lock) {
    addRisk(state, input, 'HEARTBEAT_REJECTED', `Heartbeat rejected: ${reason ?? 'LOCK_EXPIRED'}.`, { reason: reason ?? 'LOCK_EXPIRED' });
    return { state, result: { ok: false, ttl_refreshed: false, reason: reason ?? 'LOCK_EXPIRED' } };
  }

  lock.last_heartbeat = iso(state.now_ms);
  lock.expires_at_ms = state.now_ms + LOCK_TTL_SECONDS * 1000;
  const session = state.playback_sessions.find((item) => item.session_id === input.session_id);
  if (session) {
    session.last_heartbeat_at = iso(state.now_ms);
    session.updated_at = iso(state.now_ms);
  }
  return { state, result: { ok: true, ttl_refreshed: true } };
}

export function forceSwitch(
  source: DemoPlaybackState,
  input: { user_id: string; device_id: string; course_id: string; lesson_id: string },
): EngineResult<StartResult> {
  let state = expireStaleLocks(source);
  const oldLock = state.locks[input.user_id];
  if (!oldLock) return startPlayback(state, input);

  closeSession(state, oldLock.session_id, 'FORCE_SWITCHED');
  delete state.locks[input.user_id];
  state.cooldowns[input.user_id] = state.now_ms + 10_000;
  addRisk(
    state,
    { ...input, session_id: oldLock.session_id },
    'FORCE_SWITCH',
    'Playback was moved to a new registered device.',
    { old_device_id: oldLock.device_id, new_device_id: input.device_id },
  );
  state.cooldowns[input.user_id] = undefined;
  const started = startPlayback(state, input);
  state = started.state;
  state.cooldowns[input.user_id] = state.now_ms + 10_000;
  return { state, result: started.result };
}

export function endPlayback(
  source: DemoPlaybackState,
  input: { user_id: string; device_id: string; session_id: string; reason?: string },
): EngineResult<{ ok: boolean; reason?: 'SESSION_NOT_FOUND' }> {
  const state = expireStaleLocks(source);
  const lock = state.locks[input.user_id];
  if (!lock || lock.device_id !== input.device_id || lock.session_id !== input.session_id) {
    addRisk(state, input, 'END_REJECTED', 'A stale or mismatched session attempted to delete the active lock.', {});
    return { state, result: { ok: false, reason: 'SESSION_NOT_FOUND' } };
  }

  delete state.locks[input.user_id];
  closeSession(state, input.session_id, input.reason ?? 'USER_STOPPED');
  return { state, result: { ok: true } };
}

export function advanceDemoTime(source: DemoPlaybackState, seconds: number) {
  const state = cloneState(source);
  state.now_ms += seconds * 1000;
  return expireStaleLocks(state);
}

export function setRedisAvailable(source: DemoPlaybackState, available: boolean) {
  const state = cloneState(source);
  state.redis_available = available;
  return state;
}

export function getLockTtlSeconds(state: DemoPlaybackState, userId: string) {
  const lock = state.locks[userId];
  if (!lock) return 0;
  return Math.max(0, Math.ceil((lock.expires_at_ms - state.now_ms) / 1000));
}

export function redisLockKey(userId: string) {
  return `active_playback:user:${userId}`;
}

export function redisCooldownKey(userId: string) {
  return `active_playback_cooldown:user:${userId}`;
}

export function redisConflictKey(userId: string) {
  return `playback_lock_conflict:user:${userId}`;
}

function expireStaleLocks(source: DemoPlaybackState) {
  const state = cloneState(source);
  for (const [userId, lock] of Object.entries(state.locks)) {
    if (lock && lock.expires_at_ms <= state.now_ms) {
      closeSession(state, lock.session_id, 'LOCK_EXPIRED');
      addRisk(state, lock, 'SESSION_EXPIRED', 'Playback lock expired after heartbeats stopped.', { ttl_seconds: LOCK_TTL_SECONDS });
      delete state.locks[userId];
    }
  }
  return state;
}

function blocked(
  state: DemoPlaybackState,
  reason: Extract<StartResult, { allowed: false }>['reason'],
  message: string,
  canForceSwitch: boolean,
): EngineResult<StartResult> {
  return { state, result: { allowed: false, reason, message, can_force_switch: canForceSwitch } };
}

function addRisk(
  state: DemoPlaybackState,
  input: { user_id: string; device_id?: string; session_id?: string },
  eventType: string,
  message: string,
  metadata: Record<string, string | number | boolean>,
) {
  const fingerprint = fingerprintFor(input.user_id, input.device_id ?? 'unknown');
  state.playback_risk_events.unshift({
    id: nextId(state, 'risk'),
    user_id: input.user_id,
    device_id: input.device_id ?? null,
    session_id: input.session_id ?? null,
    event_type: eventType,
    event_message: message,
    metadata_json: metadata,
    ip_hash: fingerprint.ip_hash,
    user_agent_hash: fingerprint.user_agent_hash,
    created_at: iso(state.now_ms),
  });
}

function closeSession(state: DemoPlaybackState, sessionId: string, reason: string) {
  const session = state.playback_sessions.find((item) => item.session_id === sessionId);
  if (!session || session.ended_at) return;
  session.ended_at = iso(state.now_ms);
  session.end_reason = reason;
  session.updated_at = iso(state.now_ms);
}

function fingerprintFor(userId: string, deviceId: string) {
  return {
    ip_hash: demoHash(`${userId}:127.0.0.1`),
    user_agent_hash: demoHash(`${deviceId}:demo-browser`),
  };
}

function tokenFor(userId: string, deviceId: string, sessionId: string, version: number, nowMs: number) {
  return `demo.${demoHash(`${userId}:${deviceId}:${sessionId}:${version}:${nowMs}`)}.${Math.floor((nowMs + 60_000) / 1000)}`;
}

function nextId(state: DemoPlaybackState, prefix: string) {
  state.sequence += 1;
  return `${prefix}_${state.sequence.toString(36).padStart(4, '0')}`;
}

function demoHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `sha256_demo_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function iso(time: number) {
  return new Date(time).toISOString();
}

function cloneState(state: DemoPlaybackState): DemoPlaybackState {
  return {
    ...state,
    users: state.users.map((user) => ({ ...user })),
    devices: state.devices.map((device) => ({ ...device })),
    playback_sessions: state.playback_sessions.map((session) => ({ ...session })),
    playback_risk_events: state.playback_risk_events.map((event) => ({ ...event, metadata_json: { ...event.metadata_json } })),
    locks: Object.fromEntries(Object.entries(state.locks).map(([key, value]) => [key, value ? { ...value } : undefined])),
    cooldowns: { ...state.cooldowns },
    conflict_counts: { ...state.conflict_counts },
    lock_versions: { ...state.lock_versions },
  };
}
