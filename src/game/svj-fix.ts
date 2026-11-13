// Aventador SVJ model fixes: its texture-atlas body is alpha-blended (parts of
// the rear vanished behind each other), and one "glass" material covers both
// the windows and the lamp lenses (dark glass hid the headlights).
import * as THREE from "three";

export const SVJ_HEAD_LENS = "svj_headlens";
export const SVJ_TAIL_LENS = "svj_taillens";

/** Lens or window, from a triangle centre in normalised car space (+z = rear). */
export function svjGlassPart(z: number, y: number): "head" | "tail" | "window" {
  if (z < -1.7 && y < 0.7) return "head";
  if (z > 1.9 && y < 0.86) return "tail";
  return "window";
}

export function fixSvj(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const glass: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (/^Glass/.test(mat.name)) { glass.push(m); return; }
    if (/^Bodyunrefunblend/.test(mat.name) && mat.transparent) {
      // Cut-out instead of blending: every rear panel draws in correct depth order.
      mat.transparent = false;
      mat.alphaTest = 0.5;
      mat.depthWrite = true;
      mat.needsUpdate = true;
    }
  });
  const window = new THREE.MeshStandardMaterial({ name: "svj_window", color: 0x010102, metalness: 0.3, roughness: 0.04 });
  const head = new THREE.MeshStandardMaterial({ name: SVJ_HEAD_LENS, color: 0xdfe6f0, metalness: 0.1, roughness: 0.1 });
  const tail = new THREE.MeshStandardMaterial({ name: SVJ_TAIL_LENS, color: 0x7a0503, metalness: 0.1, roughness: 0.2 });
  const v = new THREE.Vector3();
  for (const m of glass) {
    const geo = m.geometry;
    const pos = geo.getAttribute("position");
    const index = geo.getIndex();
    const tri = (index ? index.count : pos.count) / 3;
    const vi = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);
    const lists = { head: [] as number[], tail: [] as number[], window: [] as number[] };
    for (let t = 0; t < tri; t++) {
      let z = 0, y = 0;
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, vi(t, k)).applyMatrix4(m.matrixWorld); z += v.z; y += v.y; }
      lists[svjGlassPart(z / 3, y / 3)].push(vi(t, 0), vi(t, 1), vi(t, 2));
    }
    const parent = m.parent ?? root;
    for (const [kind, mat] of [["head", head], ["tail", tail], ["window", window]] as const) {
      if (!lists[kind].length) continue;
      const g = geo.clone();
      g.setIndex(lists[kind]);
      const piece = new THREE.Mesh(g, mat);
      piece.name = `${m.name}-${kind}`;
      piece.position.copy(m.position); piece.quaternion.copy(m.quaternion); piece.scale.copy(m.scale);
      parent.add(piece);
    }
    parent.remove(m);
  }
}
