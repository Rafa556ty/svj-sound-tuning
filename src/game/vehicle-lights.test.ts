import { describe, expect, it } from "vitest";
import { lightLevels, wiperAngle } from "./vehicle-lights";
import { lightsOn, RAIN_FROM, RAIN_TO, TUNNEL_FROM, NIGHT_FROM } from "./world";

describe("traffic car lights", () => {
  it("are on in the tunnel and at night, off on a clear day", () => {
    expect(lightLevels(lightsOn(TUNNEL_FROM + 100)).rear).toBe(1);
    expect(lightLevels(lightsOn(NIGHT_FROM + 200)).rear).toBe(1);
    expect(lightLevels(lightsOn(200)).rear).toBe(0);
  });
});

describe("wipers", () => {
  it("move only when it rains", () => {
    expect(wiperAngle(0.3, 0)).toBe(0);
    const mid = (RAIN_FROM + RAIN_TO) / 2;
    expect(mid).toBeGreaterThan(0);
    expect(wiperAngle(0.3, 0.9)).toBeGreaterThan(0);
  });
});
