import { describe, expect, it } from 'vitest';
import {
  createDemoWatermark,
  watermarkDelayMs,
  watermarkPosition,
} from './watermark';

describe('playback watermark', () => {
  it('creates a stable session trace without exposing an email or full phone number', () => {
    const watermark = createDemoWatermark('darya.ahmed', 'session_123');

    expect(watermark.display_text).toBe('@darya.ahmed');
    expect(watermark.trace_code).toMatch(/^EL-[0-9A-F]{8}$/);
    expect(watermark.session_id).toBe('session_123');
  });

  it('keeps every position inside normalized player bounds', () => {
    for (let step = 0; step < 24; step += 1) {
      const position = watermarkPosition('EL-12345678', step);
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThanOrEqual(1);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThanOrEqual(1);
    }
  });

  it('moves at irregular intervals between five and nine seconds', () => {
    const delays = Array.from({ length: 12 }, (_, step) => watermarkDelayMs('EL-12345678', step));

    expect(new Set(delays).size).toBeGreaterThan(1);
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(5_000);
    expect(Math.max(...delays)).toBeLessThanOrEqual(9_000);
  });
});
