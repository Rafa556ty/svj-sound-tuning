import { describe, expect, it } from "vitest";
import { lampLevels, lampRole } from "./player-lights";
import { lightsOn } from "./world";
import { TUNNEL_FROM, TUNNEL_TO } from "./world";

describe("player car lamps", () => {
  it("maps each requested car's real lamp materials", () => {
    expect(lampRole("laferrari", "uv1MAT_Light1")).toBe("lamp");
    expect(lampRole("huracan-evo", "EVOLamborghini_HuracanEVOTNR0_2021LightA_Material1")).toBe("lamp");
    expect(lampRole("tourbillon", "red_glass")).toBe("tail");
    expect(lampRole("utopia-roadster", "utopiared_glass")).toBe("tail");
    expect(lampRole("huayra", "pag_brakelight")).toBe("brake");
    expect(lampRole("demon", "lightglass")).toBe("lamp");
    expect(lampRole("svj", "Puncheffnuminnernaddlightadditapuncheffnuminnernad")).toBe("lamp");
    expect(lampRole("demon", "CARS")).toBeNull();
  });
  it("turns lights on in the tunnel and off again after it", () => {
    expect(lightsOn(TUNNEL_FROM - 200)).toBe(false);
    expect(lightsOn((TUNNEL_FROM + TUNNEL_TO) / 2)).toBe(true);
    expect(lampLevels(true, false).head).toBeGreaterThan(lampLevels(false, false).head);
    expect(lampLevels(false, false).brake).toBe(0);
  });
});
