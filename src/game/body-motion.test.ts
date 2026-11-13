import { describe, it, expect } from "vitest";
import { initialBodyMotion, stepBodyMotion, MAX_ROLL } from "./body-motion";

const run = (rot: number, speed: number, braking: boolean, secs: number) => {
  let m = { ...initialBodyMotion(), lastSpeed: speed };
  for (let t = 0; t < secs; t += 1 / 60) m = stepBodyMotion(m, rot, speed, braking, 1 / 60);
  return m;
};

describe("body motion", () => {
  it("leans away from the turn and settles within the roll limit", () => {
    const m = run(0.15, 200, false, 2);
    expect(m.roll).toBeGreaterThan(0);
    expect(Math.abs(m.roll)).toBeLessThanOrEqual(MAX_ROLL + 1e-6);
    expect(Math.abs(m.rollV)).toBeLessThan(0.01);
  });
  it("dives the nose when braking", () => {
    expect(run(0, 150, true, 1).pitch).toBeLessThan(0);
  });
  it("stays flat driving straight", () => {
    const m = run(0, 150, false, 1);
    expect(Math.abs(m.roll)).toBeLessThan(1e-6);
  });
});
