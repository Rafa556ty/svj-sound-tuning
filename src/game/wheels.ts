// Wheel spin rules (pure, no three.js): the renderer reads these every frame.

/**
 * Angular speed of a wheel in rad/s for a given road speed.
 * Braking locks the wheels dead (skid), like a real car without ABS
 * stamping the brake: the tyre stops turning even though the car still slides.
 */
export function wheelOmega(speedKmh: number, braking: boolean, radiusM: number): number {
  if (braking) return 0;
  return speedKmh / 3.6 / Math.max(0.05, radiusM);
}

/** Max front-wheel lock in radians (~28°). */
export const MAX_STEER = 0.49;
/** Front-wheel yaw for steering input -1 (left) .. 1 (right); car faces -Z, so right is negative yaw. */
export function steerAngle(steer: number): number {
  return -Math.max(-1, Math.min(1, steer)) * MAX_STEER;
}
