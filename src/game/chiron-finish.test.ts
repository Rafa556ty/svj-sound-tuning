import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CHIRON_RIM_FINISH, blackenChironRims, trimChironForTrack } from "./models3d";

const part = (name: string) =>
  new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ name, color: 0xffffff }));

describe("Chiron finish", () => {
  it("rims become black, tyres stay as they were", () => {
    const rim = part("ChironMI_Rim1");
    const tyre = part("ChironMI_ChangeA_Tyre1");
    const car = new THREE.Group().add(rim, tyre);
    blackenChironRims(car);
    expect((rim.material as THREE.MeshStandardMaterial).color.getHex()).toBe(CHIRON_RIM_FINISH.color);
    expect((tyre.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xffffff);
  });

  it("on track the cabin seats are skipped but the body stays", () => {
    const seats = part("ChironMI_Cabin_Leather_A1");
    const body = part("ChironMI_1245063001_014");
    body.castShadow = true;
    const car = new THREE.Group().add(seats, body);
    trimChironForTrack(car);
    expect(seats.visible).toBe(false);
    expect(body.visible).toBe(true);
    expect(body.castShadow).toBe(true);
  });
});
