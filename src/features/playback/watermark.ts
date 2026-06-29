export type PlaybackWatermark = {
  display_text: string;
  trace_code: string;
  session_id: string;
};

const POSITIONS = [
  { x: 0.08, y: 0.12 },
  { x: 0.62, y: 0.2 },
  { x: 0.32, y: 0.48 },
  { x: 0.7, y: 0.68 },
  { x: 0.12, y: 0.74 },
  { x: 0.5, y: 0.36 },
] as const;

export function watermarkPosition(traceCode: string, step: number) {
  const offset = stableHash(traceCode) % POSITIONS.length;
  return POSITIONS[(offset + step) % POSITIONS.length] ?? POSITIONS[0];
}

export function watermarkDelayMs(traceCode: string, step: number) {
  return 5_000 + ((stableHash(`${traceCode}:${step}`) % 5) * 1_000);
}

export function createDemoWatermark(
  username: string,
  sessionId: string,
): PlaybackWatermark {
  return {
    display_text: username.startsWith('@') ? username : `@${username}`,
    trace_code: `EL-${stableHash(sessionId).toString(16).toUpperCase().padStart(8, '0')}`,
    session_id: sessionId,
  };
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
