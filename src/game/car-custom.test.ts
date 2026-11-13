import { describe, expect, it } from "vitest";
import { DEFAULT_GARAGE_CUSTOM } from "./car-custom";
import {
  effectiveColor, factoryCustom, loadCustom, PART_FINISHES, resetPart, saveCustom, setPartColor, setPartFinish,
} from "./car-custom";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe("garage customisation", () => {
  it("body, seats, rims and brakes can each take their own colour", () => {
    let c = factoryCustom();
    c = setPartColor(c, "body", "#C8101A");
    c = setPartColor(c, "seats", "#6b3a1e");
    c = setPartColor(c, "rims", "#0a0a0c");
    c = setPartColor(c, "calipers", "#f5c400");
    expect(c.body.color).toBe("#c8101a");
    expect(c.seats.color).toBe("#6b3a1e");
    expect(c.rims.color).toBe("#0a0a0c");
    expect(c.calipers.color).toBe("#f5c400");
  });
  it("carbon fibre is offered for the body, rims and seats", () => {
    expect(PART_FINISHES.body).toContain("carbon");
    expect(PART_FINISHES.rims).toContain("carbon");
    expect(PART_FINISHES.seats).toContain("carbon");
    expect(setPartFinish(factoryCustom(), "body", "carbon").body.finish).toBe("carbon");
  });
  it("a finish a part does not allow is ignored", () => {
    expect(setPartFinish(factoryCustom(), "calipers", "carbon").calipers.finish).toBeNull();
    expect(setPartFinish(factoryCustom(), "seats", "chrome").seats.finish).toBeNull();
  });
  it("untouched parts keep the factory look (Chiron rims stay black)", () => {
    expect(factoryCustom().rims).toEqual({ color: null, finish: null });
    expect(effectiveColor(factoryCustom().rims)).toBeNull();
  });
  it("carbon without a colour is black weave", () => {
    expect(effectiveColor({ color: null, finish: "carbon" })).toBe("#1c1d20");
  });
  it("restoring a part brings back the factory look", () => {
    const c = setPartFinish(setPartColor(factoryCustom(), "body", "#1546c8"), "body", "matte");
    expect(resetPart(c, "body").body).toEqual({ color: null, finish: null });
  });
  it("each car remembers its own setup", () => {
    const store = memory();
    const saved = { ...DEFAULT_GARAGE_CUSTOM, revuelto: setPartColor(factoryCustom(), "body", "#1546c8"), chiron: setPartFinish(factoryCustom(), "rims", "chrome") };
    saveCustom(store, saved);
    const back = loadCustom(store);
    expect(back.revuelto.body.color).toBe("#1546c8");
    expect(back.chiron.rims.finish).toBe("chrome");
    expect(back.chiron.body.color).toBeNull();
  });
  it("broken saved data falls back to factory", () => {
    const store = memory();
    store.setItem("car-custom-v1", "{bad");
    expect(loadCustom(store).revuelto).toEqual(factoryCustom());
  });
});
