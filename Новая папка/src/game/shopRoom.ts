// @ts-nocheck
import * as THREE from 'three';
import { S } from './bunkerProps';
import { mkTex } from './bunkerTextures';
import { buildWeaponModel, litMat } from './weaponModels';

/* ============================================================
   Лавка выжившего-торговца: дверь в стене коридора, сама комната, торговец, прилавок, оружейная стена.
   Локальные координаты реквизита: z = 0 — поверхность стены, z > 0 — внутрь помещения.
   ============================================================ */
const mb = (g, w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
const cyl = (g, rt, rb, h, mat, x, y, z, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); g.add(m); return m; };
const cylZ = (g, r, len, mat, x, y, z, seg = 12) => { const m = cyl(g, r, r, len, mat, x, y, z, seg); m.rotation.x = Math.PI / 2; return m; };
const pl = (g, w, h, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
const rnd = (a, b) => a + Math.random() * (b - a);

const signCache = {};
function signMat(key, draw, w = 512, h = 160, emissive = false) {
  if (signCache[key]) return signCache[key];
  const t = mkTex(w, h, draw, false);
  signCache[key] = emissive ? new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: true }) : new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  return signCache[key];
}
const shopSign = () => signMat('door', (x, w, h) => {
  x.fillStyle = '#3a2a18'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,220,160'},${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1 + Math.random() * 2); }
  x.strokeStyle = '#d4af37'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
  x.fillStyle = '#ffd84a'; x.font = 'bold 74px "Marck Script", cursive, sans-serif'; x.textAlign = 'center'; x.fillText('ЛАВКА', w / 2, 84);
  x.fillStyle = '#f0e4c0'; x.font = 'bold 28px "Marck Script", cursive, sans-serif'; x.fillText('товар · обмен · без вопросов', w / 2, 128);
});
const neonSign = () => signMat('neon', (x, w, h) => {
  x.clearRect(0, 0, w, h);
  x.shadowColor = '#ffb020'; x.shadowBlur = 22; x.fillStyle = '#ffd36a'; x.font = 'bold 84px "Marck Script", cursive, sans-serif'; x.textAlign = 'center';
  x.fillText('ТОРГОВЛЯ', w / 2, 92); x.shadowBlur = 8; x.font = 'bold 30px sans-serif'; x.fillStyle = '#ffeab0'; x.fillText('ОБМЕН · ОРУЖИЕ · МЕДИЦИНА', w / 2, 138);
}, 512, 160, true);

/* ---------- Дверь в лавку (снаружи, в стене коридора) ---------- */
export function buildShopDoor() {
  const g = new THREE.Group();
  const frame = S(0x2a2d2f, 0.55, 0.7), slab = S(0x5b4430, 0.6, 0.45), steel = S(0x9aa3aa, 0.4, 0.8), dark = S(0x1d1f20, 0.5, 0.8), brass = S(0xc9a227, 0.35, 0.85);
  mb(g, 0.16, 2.4, 0.2, frame, -0.74, 1.2, 0.1); mb(g, 0.16, 2.4, 0.2, frame, 0.74, 1.2, 0.1); mb(g, 1.64, 0.18, 0.2, frame, 0, 2.31, 0.1);
  mb(g, 1.32, 2.2, 0.1, slab, 0, 1.1, 0.1);
  for (let i = 0; i < 8; i++) mb(g, 1.26, 0.025, 0.12, S(0x3b2c1d, 0.7, 0.4), 0, 0.25 + i * 0.27, 0.1);
  mb(g, 1.4, 0.1, 0.06, dark, 0, 1.1, 0.19);
  for (const y of [0.4, 1.8]) mb(g, 1.3, 0.08, 0.04, dark, 0, y, 0.17);
  // зарешёченное окошко и тёплый свет изнутри
  mb(g, 0.4, 0.3, 0.05, dark, 0, 1.75, 0.16);
  pl(g, 0.32, 0.22, new THREE.MeshBasicMaterial({ color: 0xffbe5c }), 0, 1.75, 0.19);
  for (const x of [-0.1, 0, 0.1]) mb(g, 0.02, 0.26, 0.02, steel, x, 1.75, 0.2);
  cyl(g, 0.045, 0.045, 0.16, brass, 0.46, 1.0, 0.2, 10).rotation.x = Math.PI / 2;           // ручка
  // вывеска над дверью
  mb(g, 1.6, 0.5, 0.06, S(0x241709, 0.8, 0.2), 0, 2.72, 0.1);
  pl(g, 1.5, 0.44, shopSign(), 0, 2.72, 0.135);
  for (const x of [-0.7, 0.7]) mb(g, 0.04, 0.34, 0.04, dark, x, 2.46, 0.1);
  // фонарь на кронштейне
  mb(g, 0.04, 0.04, 0.4, dark, 1.0, 2.25, 0.2); mb(g, 0.1, 0.14, 0.1, dark, 1.0, 2.15, 0.4);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc86a })); bulb.position.set(1.0, 2.14, 0.4); bulb.userData.keep = true; g.add(bulb);
  g.userData.bulb = bulb;
  // ящик у двери
  mb(g, 0.55, 0.4, 0.45, S(0x6a5030, 0.9, 0.05), -1.05, 0.2, 0.45);
  return { group: g };
}

/* ---------- Торговец ---------- */
export function buildMerchant() {
  const root = new THREE.Group();
  const coat = S(0x4f3d2a, 0.92, 0.04), coatD = S(0x2c2318, 0.9, 0.05), skin = S(0xc79a76, 0.8, 0), cloth = S(0x7a2b22, 0.9, 0), leather = S(0x3a2616, 0.85, 0.05);
  const pants = S(0x2a2d2b, 0.9, 0), hatM = S(0x2a2823, 0.9, 0.05), metal = S(0x6a737a, 0.5, 0.7), amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  for (const x of [-0.11, 0.11]) { mb(root, 0.16, 0.82, 0.19, pants, x, 0.41, 0); mb(root, 0.17, 0.09, 0.28, leather, x, 0.045, 0.04); }
  const body = new THREE.Group(); body.position.y = 0.82; root.add(body);
  const tor = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.33, 0.98, 14), coat); tor.position.y = 0.5; body.add(tor);
  mb(body, 0.62, 0.07, 0.4, leather, 0, 0.18, 0);                                          // ремень
  mb(body, 0.07, 0.62, 0.02, leather, 0.06, 0.62, 0.23).rotation.z = 0.7;                   // патронташ
  for (let i = 0; i < 5; i++) cyl(body, 0.012, 0.012, 0.05, S(0xd9ad45, 0.3, 0.9), -0.12 + i * 0.075, 0.76 - i * 0.08, 0.255, 6);
  const bp = mb(body, 0.48, 0.68, 0.26, S(0x4a5a3a, 0.9, 0), 0, 0.62, -0.3);                // рюкзак
  cylZ(body, 0.1, 0.56, S(0x6b5a3a, 0.9, 0), 0, 1.02, -0.3, 10).rotation.z = Math.PI / 2;    // скатка
  for (const s of [-1, 1]) {                                                               // руки на прилавке
    const arm = new THREE.Group(); arm.position.set(s * 0.33, 0.88, 0.02); arm.rotation.x = -0.95; body.add(arm);
    mb(arm, 0.14, 0.5, 0.14, coat, 0, -0.22, 0); ball(arm, skin, 0.07, 0, -0.5, 0.0);
  }
  const head = new THREE.Group(); head.position.set(0, 1.12, 0.02); body.add(head);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), skin); hd.scale.set(1, 1.1, 1); head.add(hd);
  cyl(head, 0.2, 0.2, 0.03, hatM, 0, 0.1, 0, 16); cyl(head, 0.15, 0.16, 0.15, hatM, 0, 0.18, 0, 16);   // шляпа
  mb(head, 0.3, 0.025, 0.02, cloth, 0, 0.115, 0.15);
  cyl(head, 0.16, 0.18, 0.16, cloth, 0, -0.14, 0.02, 14);                                  // шарф
  mb(head, 0.1, 0.02, 0.02, S(0x1c1a17, 0.9, 0), 0, -0.01, 0.145); mb(head, 0.03, 0.03, 0.02, S(0x1c1a17, 0.9, 0), -0.05, 0.04, 0.14); mb(head, 0.03, 0.03, 0.02, S(0x1c1a17, 0.9, 0), 0.05, 0.04, 0.14);
  const gg = new THREE.Group(); gg.position.set(0, 0.095, 0.1); head.add(gg);                // очки/маска, сдвинутые на лоб
  mb(gg, 0.3, 0.05, 0.04, S(0x1d1f20, 0.6, 0.3), 0, 0, 0);
  for (const x of [-0.065, 0.065]) { cylZ(gg, 0.04, 0.03, metal, x, 0, 0.03, 14); cylZ(gg, 0.032, 0.02, amber, x, 0, 0.046, 14); }
  root.userData.body = body; root.userData.head = head;
  root.userData.update = (time, px, pz) => {
    body.scale.y = 1 + 0.012 * Math.sin(time * 1.7); body.position.y = 0.82;
    const wp = new THREE.Vector3(); root.getWorldPosition(wp);
    const want = Math.atan2(px - wp.x, pz - wp.z) - root.rotation.y;
    const d = ((want + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    const target = Math.max(-1.0, Math.min(1.0, d)) * 0.85 + Math.sin(time * 0.6) * 0.06;
    head.rotation.y += (target - head.rotation.y) * 0.08; head.rotation.x = 0.05 + Math.sin(time * 1.1) * 0.015;
  };
  return root;
  function ball(g, mat, r, x, y, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat); m.position.set(x, y, z); g.add(m); return m; }
}

/* ---------- Прилавок с товарами (центр — в нуле, длина вдоль Z) ---------- */
export function buildCounter(parent, x, z, len = 3.4) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const wood = S(0x6b4a2a, 0.75, 0.05), woodD = S(0x3e2a16, 0.8, 0.05), steel = S(0x7a838a, 0.5, 0.7);
  mb(g, 0.9, 1.0, len, woodD, 0, 0.5, 0);
  for (let i = 0; i < Math.round(len / 0.34); i++) mb(g, 0.02, 0.92, 0.3, wood, -0.46, 0.5, -len / 2 + 0.2 + i * 0.34);
  mb(g, 1.05, 0.07, len + 0.14, wood, 0, 1.035, 0);
  mb(g, 0.04, 0.12, len + 0.14, steel, -0.51, 1.0, 0);
  // товары на витрине: аптечки, консервы, патроны, фонарь
  const army = S(0x55633f, 0.8, 0.05), white = S(0xeaf1f4, 0.7, 0.05), cross = S(0xf3f1e8, 0.8, 0), green = S(0x34c27a, 0.6, 0), tin = S(0xaab4be, 0.4, 0.7), red = S(0xc0392b, 0.7, 0.1);
  for (const [dz, m] of [[-1.35, army], [-1.0, army], [-0.65, white]]) { mb(g, 0.34, 0.12, 0.26, m, -0.05, 1.13, dz); mb(g, 0.1, 0.02, 0.03, m === white ? green : cross, -0.05, 1.195, dz); mb(g, 0.03, 0.02, 0.1, m === white ? green : cross, -0.05, 1.196, dz); }
  for (let i = 0; i < 6; i++) cyl(g, 0.045, 0.045, 0.11, i % 2 ? tin : red, -0.12 + (i % 3) * 0.1, 1.125, 0.15 + Math.floor(i / 3) * 0.12 + 0.2, 10);
  for (let i = 0; i < 4; i++) mb(g, 0.2, 0.09, 0.1, S(0xb99a4a, 0.4, 0.8), -0.2, 1.115 + (i > 1 ? 0.09 : 0), 0.95 + (i % 2) * 0.13, 0).rotation.y = rnd(-0.3, 0.3);
  // весы и ящик-касса
  mb(g, 0.34, 0.08, 0.3, woodD, 0.05, 1.11, 1.4); cyl(g, 0.012, 0.012, 0.26, steel, 0.05, 1.28, 1.4, 6); mb(g, 0.34, 0.012, 0.012, steel, 0.05, 1.4, 1.4);
  for (const s of [-1, 1]) cyl(g, 0.07, 0.04, 0.02, steel, 0.05 + s * 0.16, 1.28, 1.4, 12);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a })); lamp.position.set(0.25, 1.2, -1.55); lamp.userData.keep = true; g.add(lamp);
  mb(g, 0.1, 0.08, 0.1, S(0x1d1f20, 0.6, 0.6), 0.25, 1.12, -1.55);
  return g;
}

/* ---------- Оружейная стена: образцы выставленного на продажу оружия ---------- */
export function buildWeaponWall(parent, x, y, z, ry, ids) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const board = S(0x3a2a1a, 0.9, 0.05), peg = S(0x1d1f20, 0.5, 0.8), plank = S(0x5a4126, 0.8, 0.05);
  mb(g, 4.0, 1.6, 0.06, board, 0, 1.75, 0.03);
  for (const yy of [0.98, 2.52]) mb(g, 4.1, 0.08, 0.1, plank, 0, yy, 0.05);
  for (const xx of [-2.0, 2.0]) mb(g, 0.08, 1.7, 0.1, plank, xx, 1.75, 0.05);
  const models = {}, rows = [2.3, 1.78, 1.26];
  ids.forEach((id, i) => {
    const m = buildWeaponModel(id, litMat); if (!m) return;
    const bb = new THREE.Box3().setFromObject(m), len = Math.max(0.25, bb.max.z - bb.min.z);
    const holder = new THREE.Group(); holder.add(m);
    const col = i % 2, row = Math.floor(i / 2) % 3, cx = (col === 0 ? -1 : 1) * 0.95;
    const sc = Math.min(1, 1.75 / len);
    holder.scale.setScalar(sc); holder.rotation.y = -Math.PI / 2;
    const c = bb.getCenter(new THREE.Vector3());
    holder.position.set(cx + c.z * sc, rows[row] - c.y * sc, 0.1 + ((bb.max.x - bb.min.x) * sc) / 2 - c.x * sc);
    g.add(holder); models[id] = holder;
    for (const dx of [-0.35, 0.35]) mb(g, 0.04, 0.04, 0.08, peg, cx + dx * sc, rows[row] - 0.1, 0.1);
  });
  g.userData.models = models;
  return g;
}

/* ---------- Стеллаж с товарами (builder для размещения у стены) ---------- */
export function buildGoodsShelf(g) {
  const wood = S(0x4a3820, 0.85, 0.05), metal = S(0x59626a, 0.5, 0.6);
  for (const x of [-0.95, 0.95]) mb(g, 0.06, 2.1, 0.5, metal, x, 1.05, 0.28);
  const cols = [0xc0392b, 0x2e86c1, 0xb99a4a, 0x55633f, 0xaab4be, 0x8a5a2e];
  for (let r = 0; r < 4; r++) {
    mb(g, 1.96, 0.05, 0.52, wood, 0, 0.35 + r * 0.55, 0.28);
    for (let k = 0; k < 7; k++) {
      const c = cols[(r * 3 + k) % cols.length], h = rnd(0.12, 0.26);
      if (k % 3 === 0) cyl(g, 0.055, 0.055, h, S(c, 0.5, 0.4), -0.75 + k * 0.25, 0.375 + r * 0.55 + h / 2, 0.28, 10);
      else mb(g, rnd(0.14, 0.22), h, rnd(0.14, 0.24), S(c, 0.7, 0.1), -0.75 + k * 0.25, 0.375 + r * 0.55 + h / 2, 0.28);
    }
  }
  return { w: 2.0, d: 0.56 };
}
export function buildCrateStack(g) {
  const wood = S(0x6a5030, 0.9, 0.05), woodD = S(0x45331c, 0.9, 0.05), band = S(0x2a2d2f, 0.6, 0.6);
  const crate = (x, y, z, s, ry) => { const c = new THREE.Group(); c.position.set(x, y, z); c.rotation.y = ry; g.add(c); mb(c, s, s * 0.8, s, wood, 0, s * 0.4, 0); mb(c, s + 0.02, 0.05, s + 0.02, woodD, 0, s * 0.8, 0); mb(c, s + 0.02, 0.05, s + 0.02, woodD, 0, 0.03, 0); for (const sx of [-1, 1]) mb(c, 0.05, s * 0.8, s + 0.02, band, sx * s * 0.36, s * 0.4, 0); };
  crate(0.5, 0, 0.55, 0.9, 0.05); crate(1.45, 0, 0.5, 0.8, -0.1); crate(0.9, 0.72, 0.5, 0.7, 0.2);
  return { w: 2.0, d: 1.0 };
}

/* ---------- Неоновая вывеска на стену ---------- */
export function buildNeon(parent, x, y, z, ry) {
  const m = pl(parent, 2.6, 0.82, neonSign(), x, y, z, ry); m.userData.keep = true; return m;
}
