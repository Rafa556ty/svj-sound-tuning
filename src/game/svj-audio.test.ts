import { describe, it, expect } from 'vitest';
import { newSvjState, svjEvents, svjRpm, pullRate } from './svj-audio';

const step = (s = newSvjState(), i: Partial<Parameters<typeof svjEvents>[1]> = {}) =>
  svjEvents(s, { t: 0, speed: 100, throttle: false, brake: false, gear: 1, ...i });

describe('SVJ real sound timing', () => {
  it('plays the recorded upshift only when the game shifts up under throttle', () => {
    const s = newSvjState();
    step(s, { throttle: true, gear: 1 });
    expect(step(s, { throttle: true, gear: 1 })).toEqual([]);
    expect(step(s, { throttle: true, gear: 2 })).toEqual(['shift']);
  });
  it('plays the real lift-off sound when the throttle is released', () => {
    const s = newSvjState();
    step(s, { throttle: true });
    expect(step(s, { throttle: false })).toEqual(['lift']);
  });
  it('plays the real braking sound when the brake is pressed', () => {
    const s = newSvjState();
    step(s, { throttle: true });
    expect(step(s, { throttle: false, brake: true })).toEqual(['brake']);
    expect(step(s, { throttle: false, brake: true })).toEqual([]);
  });
  it('blips on downshift while slowing down', () => {
    const s = newSvjState();
    step(s, { gear: 3, t: 0 });
    expect(step(s, { gear: 2, t: 1 })).toEqual(['blip']);
  });
  it('the base loop has no gears of its own: pitch only follows game rpm', () => {
    expect(pullRate(svjRpm(74, 0))).toBeGreaterThan(pullRate(svjRpm(76, 1)));
  });
});
