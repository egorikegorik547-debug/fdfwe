import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type V3 = [number, number, number];

/* ---------------- материалы и вспомогательные функции ---------------- */
const fabricCache = new Map<string, THREE.CanvasTexture>();
export function fabric(base: number, amp = 26, rep = 3): THREE.CanvasTexture {
  const key = base + ':' + rep;
  const hit = fabricCache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#' + new THREE.Color(base).getHexString(); x.fillRect(0, 0, 128, 128);
  const img = x.getImageData(0, 0, 128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amp;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  x.putImageData(img, 0, 0);
  x.strokeStyle = 'rgba(0,0,0,.09)'; x.lineWidth = 1;
  for (let i = 0; i < 128; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  fabricCache.set(key, t); return t;
}
export interface MO { rough?: number; metal?: number; emissive?: number; ei?: number; map?: THREE.Texture | null }
export const std = (color: number, o: MO = {}) => new THREE.MeshStandardMaterial({
  color, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0.04, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, map: o.map ?? null
});
export const cloth = (color: number, rep = 3) => std(0xffffff, { rough: 0.92, map: fabric(color, 26, rep) });

export function put<T extends THREE.Object3D>(parent: THREE.Object3D, o: T, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): T {
  o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o;
}
export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
export const rbox = (p: THREE.Object3D, mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, r = 0.02, rx = 0, ry = 0, rz = 0) =>
  put(p, mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.2, h / 2.2, d / 2.2)), mat), x, y, z, rx, ry, rz);
export const ball = (p: THREE.Object3D, mat: THREE.Material, r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, seg = 16) => {
  const m = put(p, mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), mat), x, y, z); m.scale.set(sx, sy, sz); return m;
};
export const cyl = (p: THREE.Object3D, mat: THREE.Material, r: number, h: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, seg = 14) =>
  put(p, mesh(new THREE.CylinderGeometry(r, r, h, seg), mat), x, y, z, rx, ry, rz);
export const UP = new THREE.Vector3(0, 1, 0);
export function limb(p: THREE.Object3D, a: V3, b: V3, r1: number, r2: number, mat: THREE.Material, seg = 14) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const m = mesh(new THREE.CylinderGeometry(r2, r1, len, seg), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); p.add(m); return m;
}
