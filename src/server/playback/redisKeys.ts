export function playbackLockKey(userId: string) {
  return `playback:lock:${userId}`;
}

export function playbackCooldownKey(userId: string) {
  return `playback:cooldown:${userId}`;
}

export function playbackSessionKey(sessionId: string) {
  return `playback:session:${sessionId}`;
}

export function playbackConflictKey(userId: string, deviceId: string) {
  return `playback:conflict:${userId}:${deviceId}`;
}

export function playbackRateLimitKey(userId: string, action: string) {
  return `playback:ratelimit:${userId}:${action}`;
}

export function playbackVersionKey(userId: string) {
  return `playback:version:${userId}`;
}
