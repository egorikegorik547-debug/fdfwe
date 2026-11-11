// @ts-nocheck
import * as THREE from 'three';
import { S, TM } from './bunkerProps';
import { TEX, mkTex } from './bunkerTextures';

/* ============================================================
   Заброшенное убежище другого выжившего: модели двери (снаружи и изнутри) и обстановки.
   Локальные координаты (как у реквизита): z = 0 — поверхность стены, z > 0 — внутрь помещения.
   ============================================================ */

const rnd = (a, b) => a + Math.random() * (b - a);
const mb = (g, w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
const cyl = (g, rt, rb, h, mat, x, y, z, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); g.add(m); return m; };
const cylZ = (g, r, len, mat, x, y, z, seg = 12) => { const m = cyl(g, r, r, len, mat, x, y, z, seg); m.rotation.x = Math.PI / 2; return m; };
const pl = (g, w, h, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); g.add(m); return m; };

let _signMat = null, _tallyMat = null;
// надпись «мелом» на двери
function signMat() {
  if (_signMat) return _signMat;
  const t = mkTex(256, 128, (x, w, h) => {
    x.fillStyle = '#3d4a42'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); }
    x.fillStyle = '#e8e2cc'; x.font = 'bold 30px "Marck Script", cursive, sans-serif'; x.textAlign = 'center';
    x.save(); x.translate(w / 2, 48); x.rotate(-0.04); x.fillText('ТИХО.', 0, 0); x.restore();
    x.font = 'bold 22px "Marck Script", cursive, sans-serif';
    x.save(); x.translate(w / 2, 88); x.rotate(0.03); x.fillText('Здесь живут.', 0, 0); x.restore();
    x.strokeStyle = 'rgba(232,226,204,.7)'; x.lineWidth = 3; x.beginPath(); x.moveTo(40, 104); x.lineTo(w - 40, 108); x.stroke();
  }, false);
  _signMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  return _signMat;
}
// стена со счётом дней: чёрточки по пять
function tallyMat() {
  if (_tallyMat) return _tallyMat;
  const t = mkTex(256, 192, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.strokeStyle = 'rgba(220,214,190,.85)'; x.lineWidth = 3; x.lineCap = 'round';
    let n = 0;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const bx = 20 + c * 56, by = 24 + r * 38;
      for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(bx + i * 9, by + rnd(-1, 1)); x.lineTo(bx + i * 9 + rnd(-1, 1), by + 28); x.stroke(); }
      x.beginPath(); x.moveTo(bx - 4, by + 22); x.lineTo(bx + 40, by + 6); x.stroke(); n += 5;
    }
    x.fillStyle = 'rgba(220,214,190,.9)'; x.font = 'bold 18px sans-serif'; x.textAlign = 'right'; x.fillText('день ' + n + '…', w - 8, h - 8);
  }, false);
  _tallyMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, opacity: 0.9 });
  return _tallyMat;
}

/* ---------- Дверь в убежище выжившего (снаружи, в стене коридора) ---------- */
export function buildSurvivorDoor() {
  const g = new THREE.Group();
  const frame = S(0x2a2d2f, 0.55, 0.7), slab = S(0x3f5247, 0.55, 0.55), rust = S(0x7a4a2a, 0.8, 0.4), steel = S(0x9aa3aa, 0.4, 0.8);
  mb(g, 0.16, 2.4, 0.2, frame, -0.74, 1.2, 0.1); mb(g, 0.16, 2.4, 0.2, frame, 0.74, 1.2, 0.1); mb(g, 1.64, 0.18, 0.2, frame, 0, 2.31, 0.1);
  mb(g, 1.32, 2.2, 0.1, slab, 0, 1.1, 0.1);
  for (let i = 0; i < 7; i++) mb(g, 1.26, 0.03, 0.12, S(0x2f3d35, 0.6, 0.5), 0, 0.3 + i * 0.3, 0.1);
  for (const x of [-0.58, 0.58]) for (let i = 0; i < 6; i++) cylZ(g, 0.02, 0.03, steel, x, 0.2 + i * 0.38, 0.17, 8);
  mb(g, 0.5, 0.14, 0.04, rust, -0.3, 1.02, 0.17).rotation.z = 0.03;
  mb(g, 1.4, 0.1, 0.06, S(0x1d1f20, 0.5, 0.8), 0, 1.1, 0.19);
  for (const x of [-0.7, 0.7]) mb(g, 0.1, 0.22, 0.1, S(0x1d1f20, 0.5, 0.8), x, 1.1, 0.18);
  const wheel = new THREE.Group(); wheel.position.set(0.38, 1.12, 0.2); g.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 20), steel));
  for (let k = 0; k < 3; k++) mb(wheel, 0.2, 0.016, 0.016, steel, 0, 0, 0).rotation.z = k * Math.PI / 3;
  cylZ(g, 0.02, 0.1, steel, 0.38, 1.12, 0.16, 8);
  cylZ(g, 0.025, 0.04, S(0x0b0b0b, 0.3, 0.5), -0.1, 1.7, 0.17, 10);
  pl(g, 0.9, 0.45, signMat(), 0, 1.72, 0.162);
  cylZ(g, 0.06, 0.1, S(0x1a1a1a, 0.5, 0.5), 0, 2.5, 0.12, 10);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb040 })); bulb.position.set(0, 2.5, 0.2); bulb.userData.keep = true; g.add(bulb);
  pl(g, 1.8, 0.4, TM(TEX.hazard, 0.8, 0), 0, 0.02, 0.5, 0, -Math.PI / 2);
  g.userData.bulb = bulb;
  return { group: g, w: 1.8, d: 0.4 };
}

/* ---------- Внутренняя сторона двери: засовы, подпорка, сигнализация из банок ---------- */
export function buildRefugeInnerDoor() {
  const g = new THREE.Group();
  const frame = S(0x2a2d2f, 0.55, 0.7), slab = S(0x3f5247, 0.55, 0.55), steel = S(0x9aa3aa, 0.4, 0.8), wood = TM(TEX.wood, 0.8);
  mb(g, 0.16, 2.4, 0.2, frame, -0.74, 1.2, 0.1); mb(g, 0.16, 2.4, 0.2, frame, 0.74, 1.2, 0.1); mb(g, 1.64, 0.18, 0.2, frame, 0, 2.31, 0.1);
  mb(g, 1.32, 2.2, 0.08, slab, 0, 1.1, 0.06);
  for (const y of [0.7, 1.5]) { mb(g, 1.5, 0.08, 0.08, S(0x1d1f20, 0.5, 0.8), 0, y, 0.16); cylZ(g, 0.035, 0.12, steel, 0.5, y, 0.17, 8); }
  const brace = mb(g, 0.12, 1.5, 0.06, wood, -0.35, 0.75, 0.2); brace.rotation.z = 0.35;
  for (let i = 0; i < 4; i++) cyl(g, 0.035, 0.035, 0.09, S(0xa8a8a0, 0.4, 0.7), 0.5 + (i % 2) * 0.05, 1.75 - i * 0.12, 0.25, 10);
  pl(g, 1.3, 0.2, TM(TEX.hazard, 0.8, 0), 0, 0.02, 0.5, 0, -Math.PI / 2);
  return { group: g, w: 1.8, d: 0.4 };
}

/* ---------- Походная койка (стена — z = 0, койка вытянута от стены) ---------- */
export function buildCot(g) {
  const fr = S(0x3b3f44, 0.55, 0.7), blanket = S(0x6b5a3a, 1, 0), pillow = S(0xcfc7b4, 1, 0);
  for (const dx of [-0.42, 0.42]) mb(g, 0.05, 0.05, 1.95, fr, dx, 0.38, 1.05);
  for (const [dx, dz] of [[-0.42, 0.1], [0.42, 0.1], [-0.42, 1.95], [0.42, 1.95]]) mb(g, 0.05, 0.38, 0.05, fr, dx, 0.19, dz);
  mb(g, 0.84, 0.1, 1.9, S(0x4a4f42, 1, 0), 0, 0.42, 1.05);
  mb(g, 0.8, 0.07, 1.2, blanket, 0, 0.5, 1.45).rotation.z = 0.02;
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), pillow); p.scale.set(1.2, 0.4, 0.8); p.position.set(0, 0.52, 0.4); g.add(p);
  mb(g, 0.3, 0.2, 0.5, S(0x4a3a24, 0.9, 0), 0.58, 0.1, 1.1);
  mb(g, 0.12, 0.1, 0.28, S(0x1c1814, 0.8, 0), -0.6, 0.05, 1.4); mb(g, 0.12, 0.1, 0.28, S(0x1c1814, 0.8, 0), -0.76, 0.05, 1.45);
  return { w: 1.0, d: 2.1 };
}

/* ---------- Ковёр ---------- */
export function buildRug(parent, w, d, x, z, rotY = 0) {
  const m = pl(parent, w, d, TM(TEX.sheet, 1, 0, 0x8a4a3a), x, 0.022, z, 0, -Math.PI / 2); m.rotation.z = rotY; m.userData.keep = true; return m;
}

/* ---------- Подвесной фонарь, счёт дней, фото, мелочи на столе ---------- */
export function buildHangingLamp() {
  const g = new THREE.Group();
  cyl(g, 0.01, 0.01, 0.5, S(0x1a1a1a), 0, 0.25, 0, 6);
  cyl(g, 0.05, 0.12, 0.16, S(0x3a4a3a, 0.5, 0.5), 0, -0.02, 0, 12);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a })); bulb.position.set(0, -0.12, 0); bulb.userData.keep = true; g.add(bulb);
  return g;
}
export function buildTally(parent, x, y, z, ry) { const m = pl(parent, 1.3, 0.98, tallyMat(), x, y, z, ry); m.userData.keep = true; return m; }
export function buildWallPhoto(parent, x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  mb(g, 0.26, 0.34, 0.02, S(0x20150d, 0.7, 0), 0, 0, 0.012).rotation.z = 0.05;
  pl(g, 0.2, 0.28, TM(TEX.kids, 0.6, 0), 0, 0, 0.026).rotation.z = 0.05;
  return g;
}
export function buildTableStuff(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  mb(g, 0.26, 0.05, 0.34, S(0x35506b, 0.9, 0), 0, 0.025, 0).rotation.y = 0.3;
  mb(g, 0.22, 0.04, 0.3, S(0x7a3a2a, 0.9, 0), 0.01, 0.07, 0.01).rotation.y = 0.1;
  cyl(g, 0.045, 0.04, 0.09, S(0xb54b2a, 0.4, 0.1), 0.4, 0.045, 0.1, 10);
  cyl(g, 0.035, 0.035, 0.14, S(0xe8dfc4, 0.8, 0), -0.35, 0.07, -0.12, 10);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc860 })); fl.scale.set(0.8, 1.7, 0.8); fl.position.set(-0.35, 0.17, -0.12); fl.userData.keep = true; g.add(fl);
  return g;
}
