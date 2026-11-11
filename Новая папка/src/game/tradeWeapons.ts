// @ts-nocheck
// Модели редкого оружия торговца. Огнестрельное строится на основе «семейства» (pistol / ak74 / asval / mosin / shotgun):
// те же подвижные части (магазин, затвор, цевьё), поэтому работают те же анимации рук и перезарядки,
// но цвета и детали другие. Ближний бой (катана, электро-дубинка) — отдельные модели.
// Ствол смотрит в −Z, верх — +Y, правая сторона — +X.
import * as THREE from 'three';

const box = (g, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
};
const cylZ = (g, mat, rFront, rBack, len, x, y, z, seg = 16) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rBack, rFront, len, seg), mat);
  m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m); return m;
};
const ball = (g, mat, r, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m;
};
// плоский клинок по контуру: pts — [вперёд (к острию), вверх]; толщина вдоль X
const blade = (g, mat, pts, th, x = 0) => {
  const sh = new THREE.Shape(); pts.forEach(([u, v], i) => (i ? sh.lineTo(u, v) : sh.moveTo(u, v)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false, curveSegments: 8 });
  geo.translate(0, 0, -th / 2); geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.x = x; g.add(m); return m;
};
const curve = (pts, n = 6) => new THREE.SplineCurve(pts.map(([u, v]) => new THREE.Vector2(u, v))).getPoints(pts.length * n).map(q => [q.x, q.y]);

// MatFn с перекраской: map — {исходный цвет: новый цвет}
const tint = (M, map) => (c, o) => M(map[c] ?? c, o);
const removeWhere = (g, fn) => { for (const c of [...g.children]) if (fn(c)) g.remove(c); };

/* ---------- Desert Eagle: хромированный, с вентилируемой планкой и тяжёлым стволом ---------- */
function buildDeagle(M, base) {
  const g = base.pistol(tint(M, { 0x3d444b: 0xbfc7cd, 0x8b959d: 0xf0f4f7, 0x15171a: 0x80898f, 0x7a4524: 0x1b1d20, 0x0b0c0e: 0x14161a }));
  // убираем тактический фонарь и лазер (в «Орле» их нет)
  removeWhere(g, c => Math.abs(c.position.y + 0.052) < 0.002 && c.position.z < -0.18 && c.position.z > -0.27);
  removeWhere(g, c => Math.abs(c.position.x + 0.0165) < 0.001 && Math.abs(c.position.y + 0.046) < 0.002);
  const chrome = M(0xdfe5ea, { metal: 0.95, rough: 0.18 }), dark = M(0x101214, { metal: 0.5, rough: 0.5 }), steel = M(0x9aa3aa, { metal: 0.9, rough: 0.25 });
  box(g, chrome, 0.018, 0.009, 0.3, 0, 0.0555, -0.16);                              // верхняя вентилируемая планка
  for (let k = 0; k < 5; k++) box(g, dark, 0.02, 0.004, 0.012, 0, 0.0602, -0.07 - k * 0.04);
  box(g, steel, 0.05, 0.014, 0.19, 0, -0.012, -0.235);                               // массивная «юбка» ствола
  cylZ(g, chrome, 0.0155, 0.0155, 0.05, 0, 0.012, -0.335, 18);                       // дульная часть
  cylZ(g, dark, 0.0095, 0.0095, 0.052, 0, 0.012, -0.336, 12);
  for (const x of [-0.0236, 0.0236]) box(g, dark, 0.003, 0.012, 0.08, x, 0.012, -0.13);   // окно выброса
  g.userData.muzzle = new THREE.Vector3(0, 0.012, -0.362);
  return g;
}

/* ---------- АН-94 «Абакан»: оливковый полимер, оптика, закрытое дульное устройство ---------- */
function buildAn94(M, base) {
  const g = base.ak74(tint(M, { 0x262b2f: 0x2e3329, 0x4d565c: 0x6a7260, 0x1c1e21: 0x2c3024, 0x30353a: 0x434a38, 0x5e2a19: 0x24271f, 0x4f2214: 0x1c1f18 }));
  const black = M(0x0c0d0e, { metal: 0.4, rough: 0.5 }), steel = M(0x4c545a, { metal: 0.9, rough: 0.3 }), lens = M(0x6cc8ff, { emissive: 0x6cc8ff });
  cylZ(g, black, 0.0145, 0.0145, 0.2, 0, 0.082, -0.01, 18);                             // тубус прицела
  cylZ(g, black, 0.021, 0.0145, 0.05, 0, 0.082, -0.135, 18);                            // объектив
  cylZ(g, black, 0.017, 0.0145, 0.035, 0, 0.082, 0.11, 18);                             // окуляр
  cylZ(g, lens, 0.0155, 0.0155, 0.003, 0, 0.082, -0.162, 16);
  box(g, steel, 0.026, 0.03, 0.03, 0, 0.056, -0.05); box(g, steel, 0.026, 0.03, 0.03, 0, 0.056, 0.07);   // кольца крепления
  box(g, black, 0.03, 0.005, 0.12, 0, 0.0445, 0.01);
  cylZ(g, steel, 0.0185, 0.0185, 0.13, 0, 0.012, -0.595, 18);                            // кожух дульного устройства
  cylZ(g, black, 0.0105, 0.0105, 0.006, 0, 0.012, -0.662, 12);
  g.userData.muzzle = g.userData.muzzle.clone();
  return g;
}

/* ---------- ОЦ-14 «Гроза»: чёрный булпап-стиль, вертикальная рукоять, глушитель, коллиматор ---------- */
function buildGroza(M, base) {
  const g = base.ak74(tint(M, { 0x262b2f: 0x1d2022, 0x4d565c: 0x34393c, 0x1c1e21: 0x0f1011, 0x30353a: 0x1c1f21, 0x5e2a19: 0x171819, 0x4f2214: 0x101112 }));
  const black = M(0x0e0f10, { metal: 0.5, rough: 0.45 }), steel = M(0x3a4046, { metal: 0.9, rough: 0.3 }), red = M(0xff3030, { emissive: 0xff3030 });
  const orange = M(0xd9742a, { metal: 0.2, rough: 0.5 });
  box(g, black, 0.03, 0.1, 0.034, 0, -0.1, -0.29, 0.12);                             // вертикальная рукоять
  box(g, orange, 0.032, 0.012, 0.036, 0, -0.152, -0.285, 0.12);
  cylZ(g, black, 0.027, 0.027, 0.26, 0, 0.012, -0.72, 20);                             // интегрированный глушитель
  for (let k = 0; k < 4; k++) cylZ(g, steel, 0.0282, 0.0282, 0.008, 0, 0.012, -0.62 - k * 0.07, 20);
  cylZ(g, black, 0.0105, 0.0105, 0.006, 0, 0.012, -0.853, 12);
  box(g, black, 0.034, 0.02, 0.07, 0, 0.0545, 0.0);                                    // коллиматор
  box(g, M(0x1b2a33, { metal: 0.1, rough: 0.1 }), 0.024, 0.024, 0.004, 0, 0.073, -0.032);
  box(g, red, 0.004, 0.004, 0.002, 0, 0.073, -0.0345);
  box(g, orange, 0.052, 0.006, 0.02, 0, -0.056, -0.14);                                // оранжевый акцент у магазина
  g.userData.muzzle = new THREE.Vector3(0, 0.012, -0.86);
  return g;
}

/* ---------- ВСС «Винторез»: скелетный приклад с деревянной щекой, ПСО-1, длинный глушитель ---------- */
function buildVintorez(M, base) {
  const g = base.asval(tint(M, { 0x39402e: 0x7a4a26, 0x252a2d: 0x2b3236, 0x1c1f21: 0x23201c }));
  const black = M(0x0b0c0d, { metal: 0.45, rough: 0.5 }), steel = M(0x505860, { metal: 0.9, rough: 0.3 });
  const lens = M(0x7fd0ff, { emissive: 0x7fd0ff }), wood = M(0x8a5a30, { rough: 0.5 });
  cylZ(g, black, 0.0145, 0.0145, 0.21, 0, 0.1, -0.02, 18);                             // ПСО-1
  cylZ(g, black, 0.024, 0.0145, 0.06, 0, 0.1, -0.155, 18);
  cylZ(g, lens, 0.0225, 0.0225, 0.003, 0, 0.1, -0.186, 18);
  cylZ(g, black, 0.017, 0.0145, 0.04, 0, 0.1, 0.1, 18);
  box(g, steel, 0.024, 0.04, 0.03, 0, 0.073, -0.06); box(g, steel, 0.024, 0.04, 0.03, 0, 0.073, 0.05);
  box(g, wood, 0.034, 0.05, 0.16, 0, 0.035, 0.34, -0.05);                              // деревянная «щека»
  box(g, wood, 0.04, 0.12, 0.03, 0, -0.03, 0.46, 0.08);                                 // затыльник приклада
  return g;
}

/* ---------- Kar 98k: светлый орех, воронёная сталь, носовой колпак ---------- */
function buildKar98(M, base) {
  const g = base.mosin(tint(M, { 0x80502a: 0x9b6b3b, 0x4d2c15: 0x5c3820, 0xa56b38: 0xb98550, 0x2b3238: 0x1f262c, 0x1c242b: 0x161d23 }));
  const mz = g.userData.muzzle, steel = M(0x59626a, { metal: 0.9, rough: 0.3 });
  if (mz) {
    cylZ(g, steel, 0.0135, 0.0135, 0.04, mz.x, mz.y, mz.z + 0.05, 14);                  // носовой колпак
    box(g, M(0x0e1012, { metal: 0.5, rough: 0.5 }), 0.012, 0.016, 0.03, mz.x, mz.y + 0.018, mz.z + 0.045);   // мушка в «капюшоне»
  }
  return g;
}

/* ---------- SPAS-12: чёрный матовый, ребристый термокожух, складной приклад с крюком ---------- */
function buildSpas(M, base) {
  const g = base.shotgun(tint(M, { 0x8a5530: 0x1a1c1e, 0x4f2f18: 0x0d0e0f, 0x2b3035: 0x1b1f23, 0x5a636c: 0x454c53 }));
  const mz = g.userData.muzzle, steel = M(0x4a525a, { metal: 0.9, rough: 0.3 }), black = M(0x0b0c0d, { metal: 0.4, rough: 0.55 });
  if (mz) {
    box(g, steel, 0.026, 0.006, 0.34, mz.x, mz.y + 0.03, mz.z + 0.22);                  // термокожух ствола
    for (let k = 0; k < 8; k++) box(g, black, 0.028, 0.0075, 0.007, mz.x, mz.y + 0.0305, mz.z + 0.1 + k * 0.04);
    box(g, black, 0.02, 0.016, 0.03, mz.x, mz.y + 0.018, mz.z + 0.015);
  }
  box(g, black, 0.012, 0.09, 0.02, 0, -0.07, 0.5, 0.15);                                // крюк упора под предплечье
  return g;
}

/* ---------- Катана: длинный изогнутый клинок, цуба, обмотка рукояти ---------- */
function buildKatana(M) {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g); g.position.z = -0.1;   // хват — на середине рукояти
  const steel = M(0xb7c0c7, { metal: 0.95, rough: 0.22 }), edge = M(0xf1f5f7, { metal: 1, rough: 0.12 }), spine = M(0x59626a, { metal: 0.9, rough: 0.35 });
  const gold = M(0xd4af37, { metal: 0.95, rough: 0.28 }), tsuba = M(0x1b1d20, { metal: 0.8, rough: 0.4 }), ito = M(0x16181b, { rough: 0.85 }), same = M(0xe6e1d0, { rough: 0.7 }), red = M(0x8a1c1c, { rough: 0.8 });
  const top = curve([[0.02, 0.016], [0.25, 0.018], [0.5, 0.026], [0.72, 0.042], [0.8, 0.054]], 6);
  const bot = curve([[0.8, 0.044], [0.72, 0.026], [0.5, 0.0], [0.25, -0.012], [0.02, -0.016]], 6);
  blade(g, steel, [...top, ...bot], 0.006);
  blade(g, edge, [...curve([[0.8, 0.046], [0.72, 0.026], [0.5, 0.0], [0.25, -0.012], [0.02, -0.016]], 6), [0.02, -0.006], ...curve([[0.25, -0.002], [0.5, 0.01], [0.72, 0.032], [0.79, 0.047]], 6)], 0.0075);   // лезвие (хамон)
  blade(g, spine, [[0.02, 0.018], [0.25, 0.02], [0.5, 0.028], [0.72, 0.044], [0.8, 0.056], [0.8, 0.05], [0.72, 0.038], [0.5, 0.022], [0.25, 0.014], [0.02, 0.01]], 0.009);   // обух
  cylZ(g, gold, 0.019, 0.019, 0.02, 0, 0.0, 0.0, 14);                                    // хабаки
  cylZ(g, tsuba, 0.045, 0.045, 0.008, 0, 0, 0.017, 24);                                  // цуба
  cylZ(g, gold, 0.047, 0.047, 0.003, 0, 0, 0.0125, 24);
  cylZ(g, same, 0.0155, 0.0155, 0.04, 0, 0, 0.044, 12);                                  // кожа ската под обмоткой
  cylZ(g, ito, 0.0165, 0.0165, 0.25, 0, 0, 0.165, 12);                                   // рукоять
  for (let k = 0; k < 9; k++) { box(g, red, 0.012, 0.012, 0.012, 0.0145, 0, 0.055 + k * 0.025, 0, 0, Math.PI / 4); box(g, red, 0.012, 0.012, 0.012, -0.0145, 0, 0.055 + k * 0.025, 0, 0, Math.PI / 4); }
  cylZ(g, gold, 0.0185, 0.0185, 0.014, 0, 0, 0.297, 12);                                 // кашира
  ball(g, gold, 0.008, 0.017, 0.0, 0.1, 1, 1, 1.4); ball(g, gold, 0.008, -0.017, 0.0, 0.1, 1, 1, 1.4);   // менуки
  return root;
}

/* ---------- Электро-дубинка: рукоять в резине, стальной шток, катушки и разрядник ---------- */
function buildBaton(M) {
  const g = new THREE.Group();
  const rubber = M(0x121416, { rough: 0.9 }), steel = M(0x7c868f, { metal: 0.9, rough: 0.3 }), steelD = M(0x3d444a, { metal: 0.85, rough: 0.4 });
  const glow = M(0x5fd6ff, { emissive: 0x5fd6ff }), white = M(0xcff5ff, { emissive: 0xcff5ff }), yellow = M(0xffd24a, { rough: 0.5 });
  cylZ(g, rubber, 0.0245, 0.0245, 0.24, 0, 0, 0.07, 14);                                 // рукоять
  for (let k = 0; k < 6; k++) cylZ(g, M(0x232629, { rough: 0.9 }), 0.0262, 0.0262, 0.008, 0, 0, -0.03 + k * 0.04, 14);
  cylZ(g, steelD, 0.0275, 0.0275, 0.03, 0, 0, -0.07, 14);                                // гарда-муфта
  box(g, yellow, 0.01, 0.016, 0.03, 0, 0.0285, -0.07);                                   // кнопка «разряд»
  cylZ(g, steel, 0.0215, 0.0215, 0.44, 0, 0, -0.3, 14);                                  // шток
  for (const z of [-0.18, -0.26, -0.34, -0.42]) cylZ(g, glow, 0.0235, 0.0235, 0.012, 0, 0, z, 14);   // светящиеся катушки
  cylZ(g, steelD, 0.03, 0.03, 0.05, 0, 0, -0.55, 14);                                    // головка разрядника
  for (const x of [-0.017, 0.017]) { cylZ(g, steel, 0.006, 0.006, 0.06, x, 0, -0.6, 8); ball(g, white, 0.008, x, 0, -0.632); }   // электроды
  for (let k = 0; k < 4; k++) box(g, white, 0.004, 0.004, 0.014, 0, (k % 2 ? 1 : -1) * 0.006, -0.625 + 0.0, 0.0, 0.0, 0.0).position.x = -0.012 + k * 0.008;   // «дуга» между электродами
  return g;
}

export function makeTradeBuilders(base) {
  return {
    deagle: M => buildDeagle(M, base), an94: M => buildAn94(M, base), groza: M => buildGroza(M, base),
    vintorez: M => buildVintorez(M, base), kar98: M => buildKar98(M, base), spas: M => buildSpas(M, base),
    katana: M => buildKatana(M), baton: M => buildBaton(M)
  };
}
