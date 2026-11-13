import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Per-model light signatures (front/rear) and windscreen wipers for traffic cars.
 * Coordinates: x in fractions of half-width (+ = right), y in fractions of height,
 * w/h in metres. Front is -z, rear is +z (see normalizeCar).
 */
type Shape = { x: number; y: number; w: number; h: number; round?: boolean; tilt?: number };
type Signature = { front: Shape[]; rear: Shape[] };

const mirror = (s: Shape[]): Shape[] =>
  s.flatMap((p) => [p, { ...p, x: -p.x }]);

export const SIGNATURES: Record<string, Signature> = {
  // Chiron: four LED projectors per side, single continuous C-shaped LED strip at the rear.
  bugatti: {
    front: mirror([0.42, 0.52, 0.62, 0.72].map((x, i) => ({ x, y: 0.5 + i * 0.012, w: 0.07, h: 0.06 }))),
    rear: [
      { x: 0, y: 0.66, w: 1.7, h: 0.035 },
      ...mirror([{ x: 0.85, y: 0.6, w: 0.035, h: 0.16 }]),
    ],
  },
  // SF90: slim slanted LED blade up front, two rectangular lights per side at the rear.
  ferrari: {
    front: mirror([{ x: 0.66, y: 0.52, w: 0.42, h: 0.035, tilt: 0.18 }]),
    rear: mirror([
      { x: 0.55, y: 0.6, w: 0.17, h: 0.06 },
      { x: 0.76, y: 0.6, w: 0.17, h: 0.06 },
    ]),
  },
  // 992 GT3: round headlamps with four-point LED, full-width rear light bar.
  porsche: {
    front: mirror([
      { x: 0.66, y: 0.58, w: 0.2, h: 0.2, round: true },
    ]),
    rear: [{ x: 0, y: 0.7, w: 1.6, h: 0.035 }],
  },
  // Mustang GT: tri-bar vertical LED taillights, three-slash DRL under each headlamp.
  mustang: {
    front: mirror([
      { x: 0.68, y: 0.6, w: 0.3, h: 0.05, tilt: 0.12 },
      ...[0.6, 0.68, 0.76].map((x) => ({ x, y: 0.52, w: 0.03, h: 0.07, tilt: 0.4 })),
    ]),
    rear: mirror([0.5, 0.6, 0.7].map((x) => ({ x, y: 0.6, w: 0.05, h: 0.14 }))),
  },
  // M4: angular twin-L LED headlights, L-shaped rear lamps.
  bmw: {
    front: mirror([
      { x: 0.66, y: 0.58, w: 0.28, h: 0.035 },
      { x: 0.66, y: 0.53, w: 0.24, h: 0.03 },
    ]),
    rear: mirror([
      { x: 0.7, y: 0.66, w: 0.32, h: 0.04 },
      { x: 0.84, y: 0.61, w: 0.04, h: 0.12 },
    ]),
  },
};

const GENERIC: Signature = {
  front: mirror([{ x: 0.7, y: 0.5, w: 0.3, h: 0.12 }]),
  rear: mirror([{ x: 0.75, y: 0.55, w: 0.22, h: 0.12 }]),
};

export const signatureFor = (key: string) => SIGNATURES[key] ?? GENERIC;

/** Lights on when it gets dark, in/near a tunnel or in rain; daytime keeps only a dim DRL. */
export function lightLevels(lightsOn: boolean) {
  return { front: lightsOn ? 1 : 0.18, rear: lightsOn ? 1 : 0, glow: lightsOn ? 1 : 0 };
}

/** Wiper sweep angle (radians) — runs whenever it's raining, faster in heavy rain. */
export function wiperAngle(time: number, rain: number, phase = 0) {
  if (rain < 0.08) return 0;
  const speed = rain > 0.55 ? 2.4 : 1.4;
  const t = (Math.sin((time + phase) * speed * Math.PI) + 1) / 2;
  return t * 1.75;
}

let glowTex: THREE.CanvasTexture | null = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.35, "rgba(255,255,255,0.45)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export type TrafficLightRig = {
  front: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  rear: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  frontGlow: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  rearGlow: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  wipers: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  /** Wiper pivots in car space (left, right) with windscreen tilt and blade length. */
  wiper: { pivots: THREE.Vector3[]; tilt: number; length: number };
  all: THREE.InstancedMesh[];
};

type Tri = { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; n: THREE.Vector3; area: number; center: THREE.Vector3 };

/** All triangles (template space) of meshes whose mesh/material label matches. */
function trianglesOf(template: THREE.Object3D, test: (label: string) => boolean): Tri[] {
  template.updateMatrixWorld(true);
  const out: Tri[] = [];
  template.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o.parent?.name === "active-wing") return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (!test(`${m.name} ${mats.map((x) => x.name).join(" ")}`.toLowerCase())) return;
    const pos = m.geometry.getAttribute("position");
    const idx = m.geometry.getIndex();
    const n = idx ? idx.count : pos.count;
    const v = (i: number) =>
      new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld);
    for (let i = 0; i + 2 < n; i += 3) {
      const a = v(i), b = v(i + 1), c = v(i + 2);
      const cr = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      const area = cr.length() / 2;
      if (area < 1e-7) continue;
      out.push({ a, b, c, n: cr.normalize(), area, center: a.clone().add(b).add(c).divideScalar(3) });
    }
  });
  return out;
}

const isGlass = (l: string) =>
  /window|windshield|windscreen|glass/.test(l) && !/light|red|lamp|mirror/.test(l);
const isLamp = (l: string) =>
  /light|lamp|red_glass|redglass/.test(l) && !/amber|beacon|window/.test(l);

/**
 * Find the bottom edge of the windscreen (where wipers rest) and its slope from the
 * actual glass triangles; falls back to body proportions.
 */
export function findWindscreen(template: THREE.Object3D, box: THREE.Box3) {
  const size = box.getSize(new THREE.Vector3());
  const halfBody = size.x / 2;
  const midZ = (box.min.z + box.max.z) / 2;
  const tris = trianglesOf(template, isGlass).filter((t) => {
    // Outward normals point forward (-z) and up; some exporters flip winding.
    const n = t.n.z > 0 ? t.n.clone().negate() : t.n;
    return t.center.z < midZ && n.z < -0.3 && Math.abs(t.center.x) < halfBody * 0.55 && t.center.y > size.y * 0.35;
  });
  if (tris.length) {
    const normal = new THREE.Vector3();
    let low = Infinity, lowZ = 0, halfW = 0;
    for (const t of tris) {
      const n = t.n.z > 0 ? t.n.clone().negate() : t.n;
      normal.addScaledVector(n, t.area);
      for (const p of [t.a, t.b, t.c]) {
        halfW = Math.max(halfW, Math.abs(p.x));
        if (Math.abs(p.x) < halfBody * 0.4 && p.y < low) { low = p.y; lowZ = p.z; }
      }
    }
    if (!Number.isFinite(low)) for (const t of tris) for (const p of [t.a, t.b, t.c]) if (p.y < low) { low = p.y; lowZ = p.z; }
    normal.normalize();
    console.log('WSDBG', low, lowZ, normal.toArray(), tris.length);
    // tilt: rotation about X that lays the vertical blade plane onto the glass.
    const tilt = Math.atan2(Math.max(normal.y, 0), -normal.z);
    // Rest just above the lower glass edge, lifted off the surface by a few cm.
    const up = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
    const base = new THREE.Vector3(0, low, lowZ).addScaledVector(up, 0.035).addScaledVector(normal, 0.018);
    return { baseZ: base.z, baseY: base.y, halfW: Math.min(halfW, halfBody), tilt, found: true };
  }
  // No named glass: walk the body profile from the nose and take the hood→screen kink.
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const x = size.x * 0.12;
  const surf = (z: number) => {
    ray.set(new THREE.Vector3(x, box.max.y + 1, z), down);
    const hit = ray.intersectObject(template, true)[0];
    return hit ? hit.point.y : null;
  };
  for (let z = box.min.z + size.z * 0.12; z < midZ + size.z * 0.1; z += 0.04) {
    const y0 = surf(z), y1 = surf(z + 0.12);
    if (y0 === null || y1 === null) continue;
    const slope = (y1 - y0) / 0.12;
    console.log('WSP', z.toFixed(2), y0.toFixed(3), slope.toFixed(2));
    if (slope > 0.7 && y0 > size.y * 0.45) {
      const tilt = Math.atan2(1, slope);
      const normal = new THREE.Vector3(0, Math.sin(tilt), -Math.cos(tilt));
      const up = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
      const base = new THREE.Vector3(0, y0, z).addScaledVector(up, 0.06).addScaledVector(normal, 0.018);
      return { baseZ: base.z, baseY: base.y, halfW: halfBody * 0.62, tilt, found: true };
    }
  }
  return { baseZ: box.min.z + size.z * 0.3, baseY: size.y * 0.66, halfW: halfBody, tilt: 1.05, found: false };
}


/** Lamp lens geometry of the model itself, split into front and rear clusters. */
function lampGeometry(template: THREE.Object3D, box: THREE.Box3, rear: boolean) {
  const len = box.max.z - box.min.z;
  const zone = Math.min(len * 0.25, 1.4);
  const tris = trianglesOf(template, isLamp).filter((t) =>
    rear ? t.center.z > box.max.z - zone : t.center.z < box.min.z + zone,
  );
  if (tris.length < 4) return null;
  const arr = new Float32Array(tris.length * 9);
  tris.forEach((t, i) => {
    // Nudge outward so the lit lens sits on (not inside) the original lamp.
    const push = t.n.clone().multiplyScalar(0.004);
    [t.a, t.b, t.c].forEach((p, k) => p.clone().add(push).toArray(arr, i * 9 + k * 3));
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  // Glow centres: one per side, at the area-weighted lamp centre.
  const sides = [-1, 1].map((sx) => {
    const c = new THREE.Vector3();
    const b = new THREE.Box3();
    let w = 0;
    for (const t of tris) if (Math.sign(t.center.x || 1) === sx) {
      c.addScaledVector(t.center, t.area); w += t.area;
      b.expandByPoint(t.a).expandByPoint(t.b).expandByPoint(t.c);
    }
    return w ? { c: c.divideScalar(w), size: b.getSize(new THREE.Vector3()) } : null;
  }).filter((x): x is { c: THREE.Vector3; size: THREE.Vector3 } => !!x);
  return { geo, sides };
}

/** Signature overlay snapped onto the body surface (raycast back from the bumper). */
function snappedSignature(shapes: Shape[], template: THREE.Object3D, box: THREE.Box3, halfW: number, height: number, rear: boolean, scale = 1) {
  const ray = new THREE.Raycaster();
  const dir = new THREE.Vector3(0, 0, rear ? -1 : 1);
  const geos = shapes.map((s) => {
    const g = s.round
      ? new THREE.CircleGeometry((s.w / 2) * scale, 20)
      : new THREE.PlaneGeometry(s.w * scale, s.h * scale);
    if (s.tilt) g.rotateZ(s.tilt * Math.sign(s.x || 1));
    const x = s.x * halfW, y = s.y * height;
    ray.set(new THREE.Vector3(x, y, rear ? box.max.z + 1 : box.min.z - 1), dir);
    const hit = ray.intersectObject(template, true)[0];
    const z = hit ? hit.point.z + (rear ? 0.01 : -0.01) : rear ? box.max.z - 0.05 : box.min.z + 0.05;
    g.translate(x, y, z);
    return g;
  });
  return mergeGeometries(geos) ?? geos[0]!;
}

export function createTrafficLightRig(
  key: string,
  template: THREE.Object3D,
  max: number,
  tall: boolean,
): TrafficLightRig {
  const box = new THREE.Box3().setFromObject(template);
  const halfW = (box.max.x - box.min.x) / 2;
  const height = tall ? Math.min(box.max.y, 1.35) : box.max.y;
  const sig = signatureFor(key);
  const make = <M extends THREE.Material>(geo: THREE.BufferGeometry, mat: M, n = max) => {
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.renderOrder = 2;
    return mesh;
  };
  template.updateMatrixWorld(true);
  const lampF = lampGeometry(template, box, false);
  const lampR = lampGeometry(template, box, true);
  const lensMat = (color: number) =>
    new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
      transparent: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  const front = make(
    lampF?.geo ?? snappedSignature(sig.front, template, box, halfW, height, false),
    lensMat(0xf2f6ff),
  );
  const rear = make(
    lampR?.geo ?? snappedSignature(sig.rear, template, box, halfW, height, true),
    lensMat(0xff1206),
  );
  const glowMat = (color: number) =>
    new THREE.MeshBasicMaterial({
      color,
      map: glowTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
  const glowGeo = (lamp: ReturnType<typeof lampGeometry>, shapes: Shape[], isRear: boolean) => {
    if (lamp?.sides.length) {
      const geos = lamp.sides.map(({ c, size }) => {
        const w = Math.min(Math.max(size.x, 0.15) * 2.2 + 0.3, 1.4);
        const h = Math.min(Math.max(size.y, 0.1) * 2.6 + 0.3, 0.9);
        return new THREE.PlaneGeometry(w, h).translate(c.x, c.y, c.z + (isRear ? 0.06 : -0.06));
      });
      return mergeGeometries(geos) ?? geos[0]!;
    }
    const big = shapes.map((p) => ({ ...p, w: Math.max(p.w, 0.12) * 2.6 + 0.3, h: Math.max(p.h, 0.12) * 2.6 + 0.3, round: false, tilt: 0 }));
    return snappedSignature(big, template, box, halfW, height, isRear);
  };
  const frontGlow = make(glowGeo(lampF, sig.front, false), glowMat(0xdfe8ff));
  const rearGlow = make(glowGeo(lampR, sig.rear, true), glowMat(0xff2010));

  const ws = findWindscreen(template, box);
  console.log("WS", key, JSON.stringify(ws), JSON.stringify(box.min.toArray()), JSON.stringify(box.max.toArray()));
  const length = Math.min(0.62, ws.halfW * 0.6) * (tall ? 1.4 : 1);
  // Blade lies along +x from its pivot; thin and dark.
  const bladeGeo = new THREE.BoxGeometry(length, 0.018, 0.025).translate(length / 2, 0.012, 0);
  const wipers = make(
    bladeGeo,
    new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.5, metalness: 0.3 }),
    max * 2,
  );
  const pivots = [
    new THREE.Vector3(-ws.halfW * 0.62, ws.baseY, ws.baseZ),
    new THREE.Vector3(ws.halfW * 0.02, ws.baseY, ws.baseZ),
  ];
  const all = [front, rear, frontGlow, rearGlow, wipers];
  return { front, rear, frontGlow, rearGlow, wipers, wiper: { pivots, tilt: ws.found ? ws.tilt : tall ? 0.15 : ws.tilt, length }, all };
}

const _local = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qs = new THREE.Quaternion();
const _e = new THREE.Euler();
const _one = new THREE.Vector3(1, 1, 1);
const _out = new THREE.Matrix4();

/** Matrix for a wiper blade on a car (car-space pivot, windscreen tilt, sweep angle). */
export function wiperMatrix(
  carMatrix: THREE.Matrix4,
  pivot: THREE.Vector3,
  tilt: number,
  angle: number,
  target = _out,
) {
  // Lay blade onto the windscreen plane (tilted back around X), then sweep up around its normal.
  _e.set(tilt, 0, 0);
  _q.setFromEuler(_e);
  _qs.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle * 0.95);
  _q.multiply(_qs);
  _local.compose(pivot, _q, _one);
  return target.multiplyMatrices(carMatrix, _local);
}
