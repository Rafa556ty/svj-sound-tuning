import { describe, expect, it } from "vitest";
import { detectUi, resolveUi, rotatedFrame, shadowOffset, toRotatedPoint, touchOrientation } from "./device-ui";

describe("device layout", () => {
  it("phones get touch controls", () => {
    expect(detectUi({ touchPoints: 5, coarse: true, width: 400 })).toBe("touch");
  });
  it("computers with mouse get the PC layout", () => {
    expect(detectUi({ touchPoints: 0, coarse: false, width: 1920 })).toBe("pc");
  });
  it("manual choice overrides detection", () => {
    expect(resolveUi("touch", "pc")).toBe("touch");
    expect(resolveUi("pc", "touch")).toBe("pc");
    expect(resolveUi("auto", "touch")).toBe("touch");
  });
});

describe("phone orientation", () => {
  it("phone lying down (landscape) plays", () => {
    expect(touchOrientation({ width: 780, height: 360 })).toBe("landscape");
  });
  it("phone standing up (portrait) turns the game sideways", () => {
    expect(touchOrientation({ width: 360, height: 780 })).toBe("rotate");
    const f = rotatedFrame({ width: 360, height: 780 });
    expect(f.width).toBe(780);
    expect(f.height).toBe(360);
    expect(f.transform).toBe("translateX(360px) rotate(90deg)");
  });
  it("a touch maps into the sideways game", () => {
    // Top-right corner of the upright screen is the game's top-left corner.
    expect(toRotatedPoint(360, 0, 360)).toEqual({ x: 0, y: 0 });
    // Bottom-left of the upright screen is the game's bottom-right corner.
    expect(toRotatedPoint(0, 780, 360)).toEqual({ x: 780, y: 360 });
  });
});

describe("moving car shadow", () => {
  it("shifts sideways as the road goes on", () => {
    const xs = [0, 500, 1000, 1500, 2000].map((z) => shadowOffset(z, false, 0).x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.3);
  });
  it("sweeps front to back under tunnel lamps", () => {
    expect(shadowOffset(2, true, 0).z).toBeLessThan(shadowOffset(22, true, 0).z);
  });
  it("fades at night", () => {
    expect(shadowOffset(100, false, 1).strength).toBeLessThan(shadowOffset(100, false, 0).strength);
  });
});
