import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

type JsonRecord = Record<string, unknown>;

type RedisResponse<T> = {
  result?: T;
  error?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const lockTtlSeconds = 90;
const cooldownTtlSeconds = 10;
const conflictTtlSeconds = 300;
const startLimitPerMinute = 10;
const forceSwitchLimitPerFiveMinutes = 3;

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const tokenSecret = Deno.env.get('PLAYBACK_TOKEN_SECRET');
const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

if (!tokenSecret) {
  throw new Error('Missing PLAYBACK_TOKEN_SECRET.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');
    const action = url.pathname.split('/').filter(Boolean).at(-1);

    if (
      req.method === 'POST' &&
      (action === 'register-device' || path.endsWith('/devices/register'))
    ) {
      return json(await registerDevice(user.id, await readJson(req), req));
    }

    if (req.method === 'POST' && action === 'start') {
      return json(await startPlayback(user.id, await readJson(req), req));
    }

    if (req.method === 'POST' && action === 'heartbeat') {
      return json(await heartbeat(user.id, await readJson(req)));
    }

    if (req.method === 'POST' && action === 'force-switch') {
      return json(await forceSwitch(user.id, await readJson(req), req));
    }

    if (req.method === 'POST' && action === 'end') {
      return json(await endPlayback(user.id, await readJson(req)));
    }

    if (req.method === 'POST' && action === 'validate-token') {
      return json(await validateToken(user.id, await readJson(req)));
    }

    if (req.method === 'GET' && action === 'status') {
      return json(await status(user.id));
    }

    if (req.method === 'GET' && action === 'playback-sessions') {
      requireAdmin(user);
      return json(await listPlaybackSessions());
    }

    if (req.method === 'GET' && action === 'risk-events') {
      requireAdmin(user);
      return json(await listRiskEvents());
    }

    return json({ status: 'error', message: 'Route not found.' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    const status = message === 'Unauthorized.' ? 401 : message === 'Forbidden.' ? 403 : 400;
    return json({ status: 'error', message }, status);
  }
});

async function requireUser(req: Request) {
  const authorization = req.headers.get('authorization');

  if (!authorization) {
    throw new Error('Unauthorized.');
  }

  const jwt = authorization.replace(/^Bearer\s+/i, '');
  const { data, error } = await admin.auth.getUser(jwt);

  if (error || !data.user) {
    throw new Error('Unauthorized.');
  }

  return data.user;
}

function requireAdmin(user: { app_metadata?: Record<string, unknown> }) {
  if (user.app_metadata?.playback_admin !== true) {
    throw new Error('Forbidden.');
  }
}

async function listPlaybackSessions() {
  const { data, error } = await admin
    .from('playback_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return { status: 'success', data };
}

async function listRiskEvents() {
  const { data, error } = await admin
    .from('playback_risk_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return { status: 'success', data };
}

async function registerDevice(userId: string, body: JsonRecord, req: Request) {
  return rpc('register_device', {
    p_user_id: userId,
    p_device_name: optionalString(body.device_name),
    p_platform: optionalString(body.platform),
    p_device_model: optionalString(body.device_model),
    p_os_version: optionalString(body.os_version),
    p_app_version: optionalString(body.app_version),
    p_ip_hash: await sha256(clientIp(req)),
    p_user_agent_hash: await sha256(req.headers.get('user-agent') ?? 'unknown'),
  });
}

async function startPlayback(userId: string, body: JsonRecord, req: Request) {
  const deviceId = requiredString(body.device_id, 'device_id');
  const lessonId = requiredString(body.lesson_id, 'lesson_id');
  const courseId = requiredString(body.course_id, 'course_id');
  const fingerprint = await requestFingerprint(req);

  if (!await isPlaybackAuthorized(userId, courseId, lessonId)) {
    await logRiskEvent(userId, deviceId, null, 'entitlement_denied', 'medium', {
      course_id: courseId,
      lesson_id: lessonId,
    }, fingerprint);
    return { status: 'blocked', reason: 'entitlement_required' };
  }

  const device = await ensureDeviceUsable(userId, deviceId);

  if (!device.ok) {
    return device.response;
  }

  const rateLimit = await redisRateLimit(
    `playback:ratelimit:${userId}:start`,
    startLimitPerMinute,
    60,
  );

  if (rateLimit.blocked) {
    await logRiskEvent(userId, deviceId, null, 'rate_limited', 'medium', {
      action: 'start',
      limit: startLimitPerMinute,
    }, fingerprint);
    return {
      status: 'blocked',
      reason: 'rate_limited',
      retry_after_seconds: rateLimit.retryAfterSeconds,
    };
  }

  const sessionId = `sess_${crypto.randomUUID()}`;
  const lockVersion = Date.now();
  const expiresAt = expiresAtIso();
  const playbackToken = await createPlaybackToken({
    user_id: userId,
    device_id: deviceId,
    session_id: sessionId,
    lock_version: lockVersion,
    expires_at: expiresAt,
  });
  const tokenHash = await sha256(playbackToken);

  const redisResult = await redisAcquireLock({
    userId,
    deviceId,
    sessionId,
    lessonId,
    courseId,
    lockVersion,
    playbackToken,
    ipHash: fingerprint.ipHash,
    userAgentHash: fingerprint.userAgentHash,
  });

  if (redisResult.ok) {
    if (redisResult.data.status === 'conflict') {
      await persistConflict(userId, deviceId, redisResult.data, fingerprint);
      return {
        status: 'conflict',
        data: {
          current_device: redisResult.data.current_device,
          current_session: redisResult.data.current_session,
          lock_version: redisResult.data.lock_version,
          can_force: true,
        },
      };
    }

    if (redisResult.data.status === 'blocked') {
      return redisResult.data;
    }

    await persistSessionStart({
      userId,
      deviceId,
      sessionId,
      lessonId,
      courseId,
      lockVersion: redisResult.data.lock_version ?? lockVersion,
      tokenHash,
      expiresAt,
      fingerprint,
    });

    return {
      status: 'success',
      data: {
        session_id: sessionId,
        lock_version: redisResult.data.lock_version ?? lockVersion,
        playback_token: playbackToken,
        watermark: await watermarkForUser(userId, sessionId),
        expires_at: expiresAt,
        action: redisResult.data.action,
      },
    };
  }

  await logRiskEvent(userId, deviceId, null, 'redis_fallback', 'high', {
    action: 'start',
    error: redisResult.error,
  }, fingerprint);

  const fallbackResult = await rpc('start_playback_lock', {
    p_user_id: userId,
    p_device_id: deviceId,
    p_session_id: sessionId,
    p_lesson_id: lessonId,
    p_course_id: courseId,
    p_lock_version: lockVersion,
    p_playback_token_hash: tokenHash,
    p_ip_hash: fingerprint.ipHash,
    p_user_agent_hash: fingerprint.userAgentHash,
    p_expires_at: expiresAt,
    p_response_playback_token: playbackToken,
  });

  return attachWatermarkToSuccess(fallbackResult, userId);
}

async function heartbeat(userId: string, body: JsonRecord) {
  const deviceId = requiredString(body.device_id, 'device_id');
  const sessionId = requiredString(body.session_id, 'session_id');
  const lockVersion = requiredNumber(body.lock_version, 'lock_version');
  const positionSeconds = optionalNumber(body.position_seconds);

  const redisResult = await redisRefreshHeartbeat({
    userId,
    deviceId,
    sessionId,
    lockVersion,
  });

  if (redisResult.ok) {
    if (redisResult.data.status !== 'success') {
      await markSessionProblem(userId, deviceId, sessionId, redisResult.data.reason);
      return redisResult.data;
    }

    await rpc('heartbeat_playback_lock', {
      p_user_id: userId,
      p_device_id: deviceId,
      p_session_id: sessionId,
      p_lock_version: lockVersion,
      p_position_seconds: positionSeconds,
    });

    return {
      status: 'success',
      data: {
        refreshed_at: redisResult.data.refreshed_at,
        lock_expires_at: expiresAtIso(),
      },
    };
  }

  await logRiskEvent(userId, deviceId, sessionId, 'redis_fallback', 'high', {
    action: 'heartbeat',
    error: redisResult.error,
  });

  return rpc('heartbeat_playback_lock', {
    p_user_id: userId,
    p_device_id: deviceId,
    p_session_id: sessionId,
    p_lock_version: lockVersion,
    p_position_seconds: positionSeconds,
  });
}

async function forceSwitch(userId: string, body: JsonRecord, req: Request) {
  const newDeviceId = requiredString(body.device_id, 'device_id');
  const lessonId = requiredString(body.lesson_id, 'lesson_id');
  const courseId = requiredString(body.course_id, 'course_id');
  const fingerprint = await requestFingerprint(req);

  if (!await isPlaybackAuthorized(userId, courseId, lessonId)) {
    await logRiskEvent(userId, newDeviceId, null, 'entitlement_denied', 'medium', {
      action: 'force_switch',
      course_id: courseId,
      lesson_id: lessonId,
    }, fingerprint);
    return { status: 'blocked', reason: 'entitlement_required' };
  }

  const device = await ensureDeviceUsable(userId, newDeviceId);

  if (!device.ok) {
    return device.response;
  }

  const rateLimit = await redisRateLimit(
    `playback:ratelimit:${userId}:force-switch`,
    forceSwitchLimitPerFiveMinutes,
    300,
  );

  if (rateLimit.blocked) {
    await blockDevice(userId, newDeviceId, 'force_switch_rate_limit');
    await logRiskEvent(userId, newDeviceId, null, 'force_switch_rate_limited', 'critical', {
      limit: forceSwitchLimitPerFiveMinutes,
    }, fingerprint);
    return { status: 'error', reason: 'rate_limited' };
  }

  const currentLock = await redisGetJson<{ session_id: string }>(
    `playback:lock:${userId}`,
  );
  const oldSessionId = currentLock?.session_id ?? 'unknown';
  const sessionId = `sess_${crypto.randomUUID()}`;
  const lockVersion = Date.now();
  const expiresAt = expiresAtIso();
  const playbackToken = await createPlaybackToken({
    user_id: userId,
    device_id: newDeviceId,
    session_id: sessionId,
    lock_version: lockVersion,
    expires_at: expiresAt,
  });
  const tokenHash = await sha256(playbackToken);

  const redisResult = await redisForceSwitch({
    userId,
    oldSessionId,
    newDeviceId,
    newSessionId: sessionId,
    lessonId,
    courseId,
    lockVersion,
    playbackToken,
    ipHash: fingerprint.ipHash,
    userAgentHash: fingerprint.userAgentHash,
  });

  if (redisResult.ok) {
    if (redisResult.data.status !== 'success') {
      return redisResult.data;
    }

    await rpc('force_switch_playback_lock', {
      p_user_id: userId,
      p_new_device_id: newDeviceId,
      p_new_session_id: sessionId,
      p_lesson_id: lessonId,
      p_course_id: courseId,
      p_new_lock_version: lockVersion,
      p_playback_token_hash: tokenHash,
      p_ip_hash: fingerprint.ipHash,
      p_user_agent_hash: fingerprint.userAgentHash,
      p_expires_at: expiresAt,
      p_response_playback_token: playbackToken,
    });

    return {
      status: 'success',
      data: {
        session_id: sessionId,
        lock_version: lockVersion,
        playback_token: playbackToken,
        watermark: await watermarkForUser(userId, sessionId),
        old_session_ended: true,
        old_session_id: redisResult.data.old_session_id,
        old_device_id: redisResult.data.old_device_id,
        expires_at: expiresAt,
      },
    };
  }

  await logRiskEvent(userId, newDeviceId, null, 'redis_fallback', 'high', {
    action: 'force-switch',
    error: redisResult.error,
  }, fingerprint);

  const fallbackResult = await rpc('force_switch_playback_lock', {
    p_user_id: userId,
    p_new_device_id: newDeviceId,
    p_new_session_id: sessionId,
    p_lesson_id: lessonId,
    p_course_id: courseId,
    p_new_lock_version: lockVersion,
    p_playback_token_hash: tokenHash,
    p_ip_hash: fingerprint.ipHash,
    p_user_agent_hash: fingerprint.userAgentHash,
    p_expires_at: expiresAt,
    p_response_playback_token: playbackToken,
  });

  return attachWatermarkToSuccess(fallbackResult, userId);
}

async function endPlayback(userId: string, body: JsonRecord) {
  const deviceId = requiredString(body.device_id, 'device_id');
  const sessionId = requiredString(body.session_id, 'session_id');

  const redisResult = await redisEndSession(userId, deviceId, sessionId);

  if (!redisResult.ok) {
    await logRiskEvent(userId, deviceId, sessionId, 'redis_fallback', 'medium', {
      action: 'end',
      error: redisResult.error,
    });
  }

  return rpc('end_playback_lock', {
    p_user_id: userId,
    p_device_id: deviceId,
    p_session_id: sessionId,
    p_position_seconds: optionalNumber(body.position_seconds),
    p_completed: Boolean(body.completed),
    p_end_reason: optionalString(body.end_reason) ?? 'user_ended',
  });
}

async function validateToken(userId: string, body: JsonRecord) {
  const token = requiredString(body.playback_token, 'playback_token');
  const tokenPayload = await verifyPlaybackToken(token);

  if (!tokenPayload || tokenPayload.user_id !== userId) {
    return { status: 'error', reason: 'invalid_token' };
  }

  if (new Date(String(tokenPayload.expires_at)).getTime() <= Date.now()) {
    return { status: 'error', reason: 'token_expired' };
  }

  const lock = await redisGetJson<{
    lock_version: number;
    device_id: string;
    session_id: string;
  }>(`playback:lock:${userId}`);

  if (lock) {
    const valid =
      lock.session_id === tokenPayload.session_id &&
      lock.device_id === tokenPayload.device_id &&
      lock.lock_version === tokenPayload.lock_version;

    return valid
      ? { status: 'success', data: { session_active: true } }
      : { status: 'error', reason: 'token_replayed_or_stale' };
  }

  const fallbackStatus = await rpc('get_playback_lock_status', { p_user_id: userId });

  if (
    fallbackStatus.status === 'active' &&
    fallbackStatus.data?.session_id === tokenPayload.session_id &&
    fallbackStatus.data?.device_id === tokenPayload.device_id &&
    fallbackStatus.data?.lock_version === tokenPayload.lock_version
  ) {
    return { status: 'success', data: { session_active: true, fallback: true } };
  }

  return { status: 'error', reason: 'session_not_active' };
}

async function status(userId: string) {
  const lock = await redisGetJson(`playback:lock:${userId}`);

  if (lock) {
    return { status: 'active', data: lock, source: 'redis' };
  }

  return rpc('get_playback_lock_status', {
    p_user_id: userId,
  });
}

async function redisAcquireLock(input: {
  userId: string;
  deviceId: string;
  sessionId: string;
  lessonId: string;
  courseId: string;
  lockVersion: number;
  playbackToken: string;
  ipHash: string;
  userAgentHash: string;
}) {
  return redisEval<JsonRecord>(acquireLockLua, [
    `playback:lock:${input.userId}`,
    `playback:cooldown:${input.userId}`,
    `playback:conflict:${input.userId}:${input.deviceId}`,
  ], [
    input.userId,
    input.deviceId,
    input.sessionId,
    input.lessonId,
    input.courseId,
    String(input.lockVersion),
    input.playbackToken,
    input.ipHash,
    input.userAgentHash,
    String(cooldownTtlSeconds),
    String(lockTtlSeconds),
    String(Math.floor(Date.now() / 1000)),
    String(conflictTtlSeconds),
  ]);
}

async function ensureDeviceUsable(userId: string, deviceId: string) {
  const { data, error } = await admin
    .from('user_devices')
    .select('id, is_blocked, blocked_reason')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      ok: false as const,
      response: {
        status: 'error',
        message: 'Device is not registered.',
      },
    };
  }

  if (data.is_blocked) {
    return {
      ok: false as const,
      response: {
        status: 'blocked',
        reason: 'device_blocked',
        message: data.blocked_reason,
      },
    };
  }

  return { ok: true as const };
}

async function redisRefreshHeartbeat(input: {
  userId: string;
  deviceId: string;
  sessionId: string;
  lockVersion: number;
}) {
  return redisEval<JsonRecord>(refreshHeartbeatLua, [
    `playback:lock:${input.userId}`,
    `playback:session:${input.sessionId}`,
  ], [
    input.userId,
    input.deviceId,
    input.sessionId,
    String(input.lockVersion),
    String(lockTtlSeconds),
    String(Math.floor(Date.now() / 1000)),
  ]);
}

async function redisForceSwitch(input: {
  userId: string;
  oldSessionId: string;
  newDeviceId: string;
  newSessionId: string;
  lessonId: string;
  courseId: string;
  lockVersion: number;
  playbackToken: string;
  ipHash: string;
  userAgentHash: string;
}) {
  return redisEval<JsonRecord>(forceDisconnectLua, [
    `playback:lock:${input.userId}`,
    `playback:cooldown:${input.userId}`,
    `playback:session:${input.oldSessionId}`,
    `playback:session:${input.newSessionId}`,
  ], [
    input.userId,
    '',
    input.newDeviceId,
    input.newSessionId,
    String(input.lockVersion),
    input.playbackToken,
    input.lessonId,
    input.courseId,
    input.ipHash,
    input.userAgentHash,
    String(lockTtlSeconds),
    String(cooldownTtlSeconds),
    String(Math.floor(Date.now() / 1000)),
  ]);
}

async function redisEndSession(userId: string, deviceId: string, sessionId: string) {
  return redisEval<JsonRecord>(endSessionLua, [
    `playback:lock:${userId}`,
    `playback:session:${sessionId}`,
  ], [
    sessionId,
    deviceId,
  ]);
}

async function redisRateLimit(key: string, limit: number, ttlSeconds: number) {
  const result = await redisEval<{ count: number; blocked: boolean }>(
    rateLimitLua,
    [key],
    [String(limit), String(ttlSeconds)],
  );

  if (!result.ok) {
    return { blocked: false, retryAfterSeconds: ttlSeconds };
  }

  return {
    blocked: Boolean(result.data.blocked),
    retryAfterSeconds: ttlSeconds,
  };
}

async function redisGetJson<T>(key: string) {
  const result = await redisCommand<string | null>(['GET', key]);

  if (!result.ok || !result.data) {
    return null;
  }

  return JSON.parse(result.data) as T;
}

async function redisEval<T>(script: string, keys: string[], args: string[]) {
  const result = await redisCommand<string>([
    'EVAL',
    script,
    String(keys.length),
    ...keys,
    ...args,
  ]);

  if (!result.ok) {
    return result as { ok: false; error: string };
  }

  return { ok: true as const, data: JSON.parse(result.data) as T };
}

async function redisCommand<T>(command: string[]) {
  if (!redisUrl || !redisToken) {
    return { ok: false as const, error: 'Redis is not configured.' };
  }

  try {
    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    const body = (await response.json()) as RedisResponse<T>;

    if (!response.ok || body.error) {
      return {
        ok: false as const,
        error: body.error ?? `Redis command failed with ${response.status}.`,
      };
    }

    return { ok: true as const, data: body.result as T };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Redis command failed.',
    };
  }
}

async function persistSessionStart(input: {
  userId: string;
  deviceId: string;
  sessionId: string;
  lessonId: string;
  courseId: string;
  lockVersion: number;
  tokenHash: string;
  expiresAt: string;
  fingerprint: { ipHash: string; userAgentHash: string };
}) {
  await rpc('persist_playback_session_start', {
    p_user_id: input.userId,
    p_device_id: input.deviceId,
    p_session_id: input.sessionId,
    p_lesson_id: input.lessonId,
    p_course_id: input.courseId,
    p_lock_version: input.lockVersion,
    p_playback_token_hash: input.tokenHash,
    p_ip_hash: input.fingerprint.ipHash,
    p_user_agent_hash: input.fingerprint.userAgentHash,
    p_expires_at: input.expiresAt,
  });
}

async function persistConflict(
  userId: string,
  deviceId: string,
  conflict: JsonRecord,
  fingerprint: { ipHash: string; userAgentHash: string },
) {
  await logRiskEvent(userId, deviceId, optionalString(conflict.current_session), 'lock_conflict', 'medium', conflict, fingerprint);
}

async function markSessionProblem(
  userId: string,
  deviceId: string,
  sessionId: string,
  reason: unknown,
) {
  await logRiskEvent(userId, deviceId, sessionId, 'heartbeat_rejected', 'high', {
    reason,
  });
}

async function blockDevice(userId: string, deviceId: string, reason: string) {
  const { error } = await admin
    .from('user_devices')
    .update({
      is_blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_reason: reason,
    })
    .eq('user_id', userId)
    .eq('device_id', deviceId);

  if (error) {
    throw new Error(error.message);
  }
}

async function logRiskEvent(
  userId: string,
  deviceId: string | null,
  sessionId: string | null,
  eventType: string,
  severity: string,
  details: JsonRecord,
  fingerprint?: { ipHash: string; userAgentHash: string },
) {
  await admin.from('playback_risk_events').insert({
    user_id: userId,
    device_id: deviceId,
    session_id: sessionId,
    event_type: eventType,
    severity,
    details,
    ip_hash: fingerprint?.ipHash,
    user_agent_hash: fingerprint?.userAgentHash,
    action_taken: eventType === 'redis_fallback' ? 'db_fallback' : null,
  });
}

async function rpc(name: string, payload: JsonRecord) {
  const { data, error } = await admin.rpc(name, payload);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function isPlaybackAuthorized(userId: string, courseId: string, lessonId: string) {
  const result = await rpc('authorize_lesson_playback', {
    p_user_id: userId,
    p_course_id: courseId,
    p_lesson_id: lessonId,
  });

  return result === true;
}

async function readJson(req: Request) {
  try {
    return (await req.json()) as JsonRecord;
  } catch {
    return {};
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing ${field}.`);
  }

  return value;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function requiredNumber(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Missing ${field}.`);
  }

  return value;
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clientIp(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}

async function requestFingerprint(req: Request) {
  return {
    ipHash: await sha256(clientIp(req)),
    userAgentHash: await sha256(req.headers.get('user-agent') ?? 'unknown'),
  };
}

function expiresAtIso() {
  return new Date(Date.now() + lockTtlSeconds * 1000).toISOString();
}

async function attachWatermarkToSuccess(result: unknown, userId: string) {
  if (!isJsonRecord(result) || result.status !== 'success' || !isJsonRecord(result.data)) {
    return result;
  }

  const sessionId = optionalString(result.data.session_id);
  if (!sessionId) return result;

  return {
    ...result,
    data: {
      ...result.data,
      watermark: await watermarkForUser(userId, sessionId),
    },
  };
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function watermarkForUser(userId: string, sessionId: string) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const user = data.user;
  const appMetadata = isJsonRecord(user?.app_metadata) ? user.app_metadata : {};
  const serverManagedUsername = optionalString(appMetadata.student_username) ??
    optionalString(appMetadata.username);
  const verifiedPhone = user?.phone && user.phone_confirmed_at
    ? maskPhone(user.phone)
    : null;
  const fallbackIdentifier = user?.email
    ? maskEmail(user.email)
    : `Student ${userId.slice(0, 6).toUpperCase()}`;
  const displayText = verifiedPhone ??
    (serverManagedUsername ? `@${serverManagedUsername.replace(/^@/, '')}` : fallbackIdentifier);
  const traceCode = `EL-${(await hmacSha256(sessionId, tokenSecret!)).slice(0, 8).toUpperCase()}`;

  if (error) {
    console.error('Unable to load the playback watermark identity.', error.message);
  }

  return {
    display_text: displayText,
    trace_code: traceCode,
    session_id: sessionId,
  };
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `•••• ${digits.slice(-4).padStart(4, '•')}`;
}

function maskEmail(email: string) {
  const [localPart = 'student', domain = 'e-lern'] = email.split('@');
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}•••@${domain}`;
}

async function createPlaybackToken(payload: JsonRecord) {
  const encodedPayload = JSON.stringify(payload);
  const signature = await hmacSha256(encodedPayload, tokenSecret!);
  return `${btoa(encodedPayload)}.${signature}`;
}

async function verifyPlaybackToken(token: string) {
  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    return null;
  }

  const decodedPayload = atob(payload);
  const expectedSignature = await hmacSha256(decodedPayload, tokenSecret!);

  if (expectedSignature !== signature) {
    return null;
  }

  return JSON.parse(decodedPayload) as JsonRecord;
}

async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
  return hex(signature);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return hex(digest);
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

const acquireLockLua = `
local lock_key = KEYS[1]
local cooldown_key = KEYS[2]
local conflict_key = KEYS[3]

local user_id = ARGV[1]
local device_id = ARGV[2]
local session_id = ARGV[3]
local lesson_id = ARGV[4]
local course_id = ARGV[5]
local lock_version = tonumber(ARGV[6])
local playback_token = ARGV[7]
local ip_hash = ARGV[8]
local user_agent_hash = ARGV[9]
local lock_ttl = tonumber(ARGV[11])
local current_time = ARGV[12]
local conflict_ttl = tonumber(ARGV[13])

local cooldown = redis.call('GET', cooldown_key)
if cooldown then
  local cooldown_data = cjson.decode(cooldown)
  if tonumber(cooldown_data.cooldown_end) > tonumber(current_time) then
    return cjson.encode({
      status = 'blocked',
      reason = 'cooldown_active',
      cooldown_until = cooldown_data.cooldown_end
    })
  end
end

local existing_lock = redis.call('GET', lock_key)
if existing_lock then
  local lock_data = cjson.decode(existing_lock)
  if lock_data.device_id == device_id then
    lock_data.last_heartbeat = current_time
    lock_data.playback_token = playback_token
    lock_data.ip_hash = ip_hash
    lock_data.user_agent_hash = user_agent_hash
    redis.call('SETEX', lock_key, lock_ttl, cjson.encode(lock_data))
    redis.call('EXPIRE', 'playback:session:' .. lock_data.session_id, lock_ttl)
    return cjson.encode({
      status = 'success',
      action = 'refreshed',
      lock_version = lock_data.lock_version
    })
  else
    redis.call('INCR', conflict_key)
    redis.call('EXPIRE', conflict_key, conflict_ttl)
    return cjson.encode({
      status = 'conflict',
      current_device = lock_data.device_id,
      current_session = lock_data.session_id,
      lock_version = lock_data.lock_version
    })
  end
end

local new_lock = {
  lock_version = lock_version,
  device_id = device_id,
  session_id = session_id,
  user_id = user_id,
  lesson_id = lesson_id,
  course_id = course_id,
  started_at = current_time,
  last_heartbeat = current_time,
  playback_token = playback_token,
  ip_hash = ip_hash,
  user_agent_hash = user_agent_hash
}
redis.call('SETEX', lock_key, lock_ttl, cjson.encode(new_lock))
redis.call('SETEX', 'playback:session:' .. session_id, lock_ttl, cjson.encode({
  user_id = user_id,
  device_id = device_id,
  lock_version = lock_version,
  playback_token = playback_token,
  created_at = current_time
}))

return cjson.encode({
  status = 'success',
  action = 'acquired',
  lock_version = lock_version
})
`;

const refreshHeartbeatLua = `
local lock_key = KEYS[1]
local session_key = KEYS[2]
local device_id = ARGV[2]
local session_id = ARGV[3]
local lock_version = tonumber(ARGV[4])
local lock_ttl = tonumber(ARGV[5])
local current_time = ARGV[6]

local lock_data = redis.call('GET', lock_key)
if not lock_data then
  return cjson.encode({status = 'error', reason = 'lock_expired'})
end

local lock = cjson.decode(lock_data)
if lock.session_id ~= session_id then
  return cjson.encode({status = 'error', reason = 'session_mismatch'})
end
if lock.lock_version ~= lock_version then
  return cjson.encode({
    status = 'error',
    reason = 'version_mismatch',
    current_version = lock.lock_version
  })
end
if lock.device_id ~= device_id then
  return cjson.encode({status = 'error', reason = 'device_mismatch'})
end

lock.last_heartbeat = current_time
redis.call('SETEX', lock_key, lock_ttl, cjson.encode(lock))
redis.call('EXPIRE', session_key, lock_ttl)

return cjson.encode({status = 'success', refreshed_at = current_time})
`;

const forceDisconnectLua = `
local lock_key = KEYS[1]
local cooldown_key = KEYS[2]
local old_session_key = KEYS[3]
local new_session_key = KEYS[4]

local user_id = ARGV[1]
local new_device_id = ARGV[3]
local new_session_id = ARGV[4]
local new_lock_version = tonumber(ARGV[5])
local new_playback_token = ARGV[6]
local new_lesson_id = ARGV[7]
local new_course_id = ARGV[8]
local ip_hash = ARGV[9]
local user_agent_hash = ARGV[10]
local lock_ttl = tonumber(ARGV[11])
local cooldown_ttl = tonumber(ARGV[12])
local current_time = ARGV[13]

local existing_lock = redis.call('GET', lock_key)
if not existing_lock then
  return cjson.encode({status = 'error', reason = 'no_active_session'})
end

local old_lock = cjson.decode(existing_lock)
local old_session_id = old_lock.session_id
local cooldown_end = tonumber(current_time) + cooldown_ttl
redis.call('SETEX', cooldown_key, cooldown_ttl, cjson.encode({
  device_id = old_lock.device_id,
  session_id = old_session_id,
  cooldown_start = current_time,
  cooldown_end = tostring(cooldown_end)
}))

local new_lock = {
  lock_version = new_lock_version,
  device_id = new_device_id,
  session_id = new_session_id,
  user_id = user_id,
  lesson_id = new_lesson_id,
  course_id = new_course_id,
  started_at = current_time,
  last_heartbeat = current_time,
  playback_token = new_playback_token,
  ip_hash = ip_hash,
  user_agent_hash = user_agent_hash
}
redis.call('SETEX', lock_key, lock_ttl, cjson.encode(new_lock))
redis.call('SETEX', new_session_key, lock_ttl, cjson.encode({
  user_id = user_id,
  device_id = new_device_id,
  lock_version = new_lock_version,
  playback_token = new_playback_token,
  created_at = current_time
}))
redis.call('DEL', old_session_key)

return cjson.encode({
  status = 'success',
  old_session_id = old_session_id,
  old_device_id = old_lock.device_id
})
`;

const endSessionLua = `
local lock_key = KEYS[1]
local session_key = KEYS[2]
local session_id = ARGV[1]
local device_id = ARGV[2]

local lock_data = redis.call('GET', lock_key)
if lock_data then
  local lock = cjson.decode(lock_data)
  if lock.session_id == session_id and lock.device_id == device_id then
    redis.call('DEL', lock_key)
    redis.call('DEL', session_key)
    return cjson.encode({status = 'success'})
  end
end

return cjson.encode({status = 'error', reason = 'session_not_found'})
`;

const rateLimitLua = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local count = redis.call('INCR', key)
if count == 1 then
  redis.call('EXPIRE', key, ttl)
end
return cjson.encode({count = count, blocked = count > limit})
`;
