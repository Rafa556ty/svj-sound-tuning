// Pure chassis motion: a damped spring that turns cornering/braking/accel into body roll and pitch.
export type BodyMotion = { roll: number; rollV: number; pitch: number; pitchV: number; lastRot: number; lastSpeed: number };
export const initialBodyMotion = (): BodyMotion => ({ roll: 0, rollV: 0, pitch: 0, pitchV: 0, lastRot: 0, lastSpeed: 0 });

export const ROLL_PER_YAW = 0.55; // body roll (rad) per rad of yaw towards the turn
export const MAX_ROLL = 0.045;
export const MAX_PITCH = 0.03;
const STIFF = 90; // spring stiffness (1/s²)
const DAMP = 13; // damping (1/s) — slightly under critical: one soft settle, no wobble

export function stepBodyMotion(m: BodyMotion, rot: number, speedKmh: number, braking: boolean, dt: number): BodyMotion {
  const h = Math.min(dt, 0.05);
  if (h <= 0) return m;
  const accel = (speedKmh - m.lastSpeed) / h; // km/h per s
  const speedF = Math.min(1, speedKmh / 120);
  // Car leans away from the turn: yaw right (positive rot) gives +Z roll, which drops the outer (left) side as seen from the chase camera.
  const rollTarget = clamp(rot * ROLL_PER_YAW * speedF, -MAX_ROLL, MAX_ROLL);
  // Nose dives under braking, squats under acceleration.
  const pitchTarget = clamp((braking ? -0.022 : 0) + clamp(accel / 60, -1, 1) * 0.008, -MAX_PITCH, MAX_PITCH);
  const rollV = m.rollV + (STIFF * (rollTarget - m.roll) - DAMP * m.rollV) * h;
  const pitchV = m.pitchV + (STIFF * (pitchTarget - m.pitch) - DAMP * m.pitchV) * h;
  return {
    roll: clamp(m.roll + rollV * h, -MAX_ROLL * 1.3, MAX_ROLL * 1.3),
    rollV,
    pitch: clamp(m.pitch + pitchV * h, -MAX_PITCH * 1.3, MAX_PITCH * 1.3),
    pitchV,
    lastRot: rot,
    lastSpeed: speedKmh,
  };
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
