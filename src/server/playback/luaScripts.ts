export const acquireLockLua = `
-- acquire_lock.lua
-- KEYS[1] = playback:lock:{user_id}
-- KEYS[2] = playback:cooldown:{user_id}
-- KEYS[3] = playback:conflict:{user_id}:{device_id}
-- ARGV = user_id, device_id, session_id, lesson_id, course_id,
--        lock_version, playback_token, ip_hash, user_agent_hash,
--        cooldown_ttl, lock_ttl, current_time

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

local cooldown = redis.call('GET', cooldown_key)
if cooldown then
  local cooldown_data = cjson.decode(cooldown)
  if cooldown_data.cooldown_end > current_time then
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
    return cjson.encode({
      status = 'success',
      action = 'refreshed',
      lock_version = lock_data.lock_version
    })
  else
    redis.call('INCR', conflict_key)
    redis.call('EXPIRE', conflict_key, 300)
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

export const refreshHeartbeatLua = `
-- refresh_heartbeat.lua
-- KEYS[1] = playback:lock:{user_id}
-- KEYS[2] = playback:session:{session_id}
-- ARGV = user_id, device_id, session_id, lock_version, lock_ttl, current_time

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

export const forceDisconnectLua = `
-- force_disconnect.lua
-- KEYS[1] = playback:lock:{user_id}
-- KEYS[2] = playback:cooldown:{user_id}
-- KEYS[3] = playback:session:{old_session_id}
-- KEYS[4] = playback:session:{new_session_id}
-- ARGV = user_id, old_device_id, new_device_id, new_session_id,
--        new_lock_version, new_playback_token, new_lesson_id,
--        new_course_id, ip_hash, user_agent_hash,
--        lock_ttl, cooldown_ttl, current_time

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

export const endSessionLua = `
-- end_session.lua
-- KEYS[1] = playback:lock:{user_id}
-- KEYS[2] = playback:session:{session_id}
-- ARGV[1] = session_id
-- ARGV[2] = device_id

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
