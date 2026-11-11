// Модели рюкзаков, шлемов и противогазов (по 10 разных). Рюкзаки добавляются в группу верхней части тела,
// шлемы и противогазы — в группу головы (начало координат головы: шея, центр черепа на y = 0.15, лицо смотрит в +Z).
import * as THREE from 'three';
import { std, cloth, put, mesh, rbox, ball, cyl, limb, type V3 } from './gearKit';
import { GEAR } from './gearDefs';

type G = THREE.Group;
export const shade = (c: number, f: number) => new THREE.Color(c).multiplyScalar(f).getHex();
export const glow = (c: number, ei = 2.2) => std(c, { emissive: c, ei, rough: 0.3 });
export const glass = (c: number, op = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.08, metalness: 0.35, transparent: true, opacity: op, side: THREE.DoubleSide });
const twoSided = <T extends THREE.Material>(m: T) => { m.side = THREE.DoubleSide; return m; };
const steelM = () => std(0x8a9399, { rough: 0.35, metal: 0.85 });
const darkM = () => std(0x17191c, { rough: 0.6, metal: 0.3 });
const rubber = (c: number) => std(c, { rough: 0.55, metal: 0.02 });
const tor = (p: THREE.Object3D, mat: THREE.Material, R: number, r: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2) =>
  put(p, mesh(new THREE.TorusGeometry(R, r, 10, 28, arc), mat), x, y, z, rx, ry, rz);

/* ======================= РЮКЗАКИ ======================= */
function straps(u: G, mat: THREE.Material, zf = 0.145) {
  for (const s of [-1, 1]) {
    rbox(u, mat, 0.052, 0.022, 0.3, s * 0.125, 1.5, 0, 0.01);
    rbox(u, mat, 0.05, 0.34, 0.016, s * 0.125, 1.32, zf, 0.008, -0.04, 0, 0);
  }
  rbox(u, mat, 0.25, 0.02, 0.012, 0, 1.36, zf + 0.005, 0.006);
  rbox(u, steelM(), 0.03, 0.026, 0.016, 0, 1.36, zf + 0.012, 0.004);
}
export interface PackInfo { rear: number; bot: number }

export function addPack(id: string, u: G, fill: number): PackInfo {
  const g = GEAR[id], c: number = g.color, d1 = shade(c, 0.78);
  const strapM = std(0x232428, { rough: 0.9 }), body = cloth(c, 4), dark = cloth(d1, 4);
  const f = fill * 0.05;
  switch (id) {
    case 'pack1': {   // холщовый мешок
      straps(u, std(0x5a3f26, { rough: 0.95 }));
      rbox(u, body, 0.26, 0.34, 0.15 + f, 0, 1.2, -0.2, 0.07);
      ball(u, body, 0.13, 0, 1.14, -0.2, 1, 1.1, 0.85, 18);
      cyl(u, body, 0.055, 0.07, 0, 1.4, -0.2);
      tor(u, std(0x5a3f26, { rough: 0.9 }), 0.055, 0.012, 0, 1.38, -0.2, Math.PI / 2);
      rbox(u, dark, 0.2, 0.012, 0.01, 0, 1.18, -0.285 - f, 0.004);
      rbox(u, dark, 0.012, 0.22, 0.01, 0.05, 1.14, -0.285 - f, 0.004);
      return { rear: -0.285 - f, bot: 1.0 };
    }
    case 'pack2': {   // школьный рюкзак
      straps(u, strapM);
      rbox(u, body, 0.3, 0.4, 0.16 + f, 0, 1.24, -0.205, 0.06);
      rbox(u, dark, 0.26, 0.17, 0.05, 0, 1.15, -0.3 - f, 0.03);
      rbox(u, std(0xe8e8e0, { rough: 0.5 }), 0.24, 0.008, 0.01, 0, 1.22, -0.325 - f, 0.004);
      rbox(u, std(0xe0b020, { rough: 0.6 }), 0.07, 0.07, 0.01, 0, 1.36, -0.292 - f, 0.01);
      rbox(u, strapM, 0.09, 0.03, 0.025, 0, 1.46, -0.2, 0.01);
      for (const s of [-1, 1]) rbox(u, dark, 0.04, 0.12, 0.1, s * 0.17, 1.12, -0.2, 0.02);
      return { rear: -0.325 - f, bot: 1.04 };
    }
    case 'pack3': {   // туристический
      straps(u, strapM);
      rbox(u, body, 0.34, 0.46, 0.2 + f, 0, 1.2, -0.23, 0.05);
      rbox(u, dark, 0.35, 0.1, 0.22 + f, 0, 1.43, -0.235, 0.04);
      rbox(u, dark, 0.3, 0.15, 0.08, 0, 1.0, -0.37 - f, 0.03);
      for (const s of [-1, 1]) rbox(u, dark, 0.07, 0.2, 0.15, s * 0.205, 1.1, -0.23, 0.03);
      cyl(u, cloth(0x4a6275, 4), 0.07, 0.36, 0, 0.9, -0.27, 0, 0, Math.PI / 2, 18);
      for (const x of [-0.09, 0.09]) rbox(u, strapM, 0.03, 0.17, 0.17, x, 0.9, -0.27, 0.01);
      rbox(u, strapM, 0.03, 0.4, 0.012, 0, 1.2, -0.335 - f, 0.005);
      return { rear: -0.37 - f, bot: 0.82 };
    }
    case 'pack4': {   // вещмешок
      straps(u, std(0x3a3226, { rough: 0.95 }));
      const bag = cyl(u, body, 0.125, 0.5, 0, 1.2, -0.25 - f / 2, 0.08, 0, 0, 20); bag.scale.z = 0.8 + f * 2;
      cyl(u, body, 0.07, 0.07, 0, 1.47, -0.24, 0.08);
      tor(u, strapM, 0.07, 0.012, 0, 1.45, -0.24, Math.PI / 2);
      tor(u, cloth(0x7a7050, 4), 0.14, 0.04, 0, 1.28, -0.37 - f, 0, 0, 0, Math.PI);       // скатка-«подкова»
      rbox(u, strapM, 0.03, 0.3, 0.012, 0, 1.15, -0.385 - f, 0.005);
      rbox(u, steelM(), 0.04, 0.03, 0.02, 0, 1.2, -0.39 - f, 0.006);
      cyl(u, steelM(), 0.03, 0.05, 0.1, 0.98, -0.37 - f);
      return { rear: -0.39 - f, bot: 0.95 };
    }
    case 'pack5': {   // штурмовой
      straps(u, strapM);
      rbox(u, body, 0.32, 0.42, 0.2 + f, 0, 1.25, -0.23, 0.045);
      rbox(u, dark, 0.3, 0.08, 0.21 + f, 0, 1.45, -0.23, 0.03);
      for (let i = 0; i < 5; i++) rbox(u, strapM, 0.29, 0.012, 0.012, 0, 1.08 + i * 0.07, -0.335 - f, 0.004);
      for (const s of [-1, 1]) rbox(u, dark, 0.07, 0.16, 0.12, s * 0.2, 1.14, -0.23, 0.025);
      limb(u, [0.1, 1.42, -0.3], [0.14, 1.56, -0.1], 0.01, 0.01, std(0x20262a, { rough: 0.6 }), 8);
      limb(u, [0.14, 1.56, -0.1], [0.135, 1.43, 0.12], 0.01, 0.01, std(0x20262a, { rough: 0.6 }), 8);
      ball(u, std(0xe0e0e0), 0.014, 0.135, 1.43, 0.125);
      return { rear: -0.34 - f, bot: 1.04 };
    }
    case 'pack6': {   // на раме «Ермак»
      straps(u, strapM);
      const frame = std(0x6f7479, { rough: 0.45, metal: 0.8 });
      for (const s of [-1, 1]) limb(u, [s * 0.14, 0.9, -0.18], [s * 0.14, 1.5, -0.18], 0.014, 0.014, frame, 8);
      for (const y of [0.95, 1.2, 1.45]) rbox(u, frame, 0.3, 0.02, 0.02, 0, y, -0.18, 0.005);
      rbox(u, body, 0.32, 0.36, 0.2 + f, 0, 1.3, -0.3, 0.05);
      const crate = std(0x7a5a38, { rough: 0.9 });
      rbox(u, crate, 0.3, 0.16, 0.2, 0, 0.99, -0.3, 0.01);
      for (const y of [0.95, 1.03]) rbox(u, std(0x5e4228, { rough: 0.9 }), 0.302, 0.008, 0.202, 0, y, -0.3, 0.002);
      for (const y of [1.15, 1.42]) rbox(u, strapM, 0.34, 0.025, 0.22 + f, 0, y, -0.3, 0.008);
      cyl(u, cloth(0x5d6a74, 4), 0.05, 0.32, 0, 1.53, -0.32, 0, 0, Math.PI / 2, 14);
      cyl(u, steelM(), 0.04, 0.06, 0.16, 0.99, -0.42);
      return { rear: -0.4 - f, bot: 0.9 };
    }
    case 'pack7': {   // тактический MOLLE
      straps(u, strapM);
      rbox(u, body, 0.36, 0.52, 0.24 + f, 0, 1.2, -0.25, 0.05);
      rbox(u, dark, 0.3, 0.3, 0.08, 0, 1.1, -0.37 - f, 0.035);
      rbox(u, dark, 0.2, 0.12, 0.06, 0, 1.38, -0.375 - f, 0.03);
      for (let i = 0; i < 5; i++) rbox(u, strapM, 0.3, 0.01, 0.012, 0, 0.98 + i * 0.06, -0.415 - f, 0.003);
      for (const s of [-1, 1]) {
        cyl(u, std(0x6b747a, { rough: 0.4, metal: 0.7 }), 0.04, 0.2, s * 0.215, 1.02, -0.27);
        rbox(u, strapM, 0.02, 0.4, 0.012, s * 0.12, 1.22, -0.375 - f, 0.004);
      }
      rbox(u, std(0x9a2a1a, { rough: 0.6 }), 0.06, 0.04, 0.01, 0.08, 1.4, -0.41 - f, 0.004);
      rbox(u, darkM(), 0.34, 0.03, 0.25, 0, 1.47, -0.25, 0.01);
      return { rear: -0.415 - f, bot: 0.94 };
    }
    case 'pack8': {   // медицинский ранец
      straps(u, strapM);
      const white = std(c, { rough: 0.5 }), red = std(0xc0201a, { rough: 0.5 });
      rbox(u, white, 0.34, 0.4, 0.22, 0, 1.25, -0.24, 0.025);
      rbox(u, red, 0.04, 0.16, 0.01, 0, 1.25, -0.355, 0.002); rbox(u, red, 0.16, 0.04, 0.01, 0, 1.25, -0.355, 0.002);
      for (const s of [-1, 1]) { rbox(u, red, 0.012, 0.1, 0.03, s * 0.176, 1.25, -0.24, 0.002); rbox(u, red, 0.012, 0.03, 0.1, s * 0.176, 1.25, -0.24, 0.002); }
      rbox(u, std(shade(c, 0.85), { rough: 0.5 }), 0.3, 0.1, 0.05, 0, 1.03, -0.37, 0.02);
      rbox(u, steelM(), 0.1, 0.03, 0.03, 0, 1.47, -0.24, 0.008);
      for (const x of [-0.1, 0.1]) rbox(u, steelM(), 0.04, 0.05, 0.02, x, 1.12, -0.355, 0.004);
      cyl(u, red, 0.03, 0.12, -0.14, 0.99, -0.37);
      return { rear: -0.395, bot: 0.98 };
    }
    case 'pack9': {   // экспедиционный
      straps(u, strapM);
      rbox(u, body, 0.4, 0.66, 0.26 + f, 0, 1.14, -0.27, 0.06);
      rbox(u, dark, 0.42, 0.14, 0.28 + f, 0, 1.44, -0.275, 0.05);
      for (const s of [-1, 1]) rbox(u, dark, 0.08, 0.28, 0.18, s * 0.24, 1.0, -0.27, 0.035);
      for (const y of [1.0, 1.25]) rbox(u, strapM, 0.42, 0.025, 0.27 + f, 0, y, -0.27, 0.008);
      cyl(u, std(0x6a7078, { rough: 0.8 }), 0.075, 0.42, 0, 0.74, -0.3, 0, 0, Math.PI / 2, 16);
      limb(u, [0.2, 0.85, -0.42 - f], [0.2, 1.4, -0.42 - f], 0.01, 0.01, steelM(), 8);
      rbox(u, steelM(), 0.1, 0.02, 0.02, 0.2, 1.4, -0.42 - f, 0.005);
      cyl(u, steelM(), 0.06, 0.08, -0.21, 0.86, -0.4 - f);
      return { rear: -0.4 - f, bot: 0.8 };
    }
    default: {        // pack10 — контейнер «Мамонт»
      const metal = std(c, { rough: 0.45, metal: 0.65 }), yel = std(0xe0b61a, { rough: 0.5 });
      straps(u, strapM);
      for (const s of [-1, 1]) rbox(u, darkM(), 0.04, 0.5, 0.04, s * 0.17, 1.2, -0.14, 0.01);
      rbox(u, metal, 0.42, 0.54, 0.32, 0, 1.2, -0.3, 0.015);
      for (let i = -2; i <= 2; i++) rbox(u, std(shade(c, 0.78), { rough: 0.5, metal: 0.6 }), 0.022, 0.5, 0.012, i * 0.08, 1.2, -0.462, 0.004);
      rbox(u, yel, 0.425, 0.05, 0.325, 0, 0.99, -0.3, 0.005);
      for (let i = 0; i < 6; i++) rbox(u, darkM(), 0.025, 0.052, 0.327, -0.17 + i * 0.068, 0.99, -0.3, 0.002, 0, 0, 0.5);
      for (const s of [-1, 1]) rbox(u, steelM(), 0.04, 0.07, 0.03, s * 0.12, 1.4, -0.465, 0.006);
      rbox(u, steelM(), 0.12, 0.03, 0.03, 0, 1.49, -0.3, 0.008);
      cyl(u, glow(0xff8a1f, 2.6), 0.022, 0.06, 0.14, 1.51, -0.3);
      limb(u, [-0.15, 1.47, -0.3], [-0.17, 1.72, -0.3], 0.005, 0.005, steelM(), 6);
      return { rear: -0.465, bot: 0.93 };
    }
  }
}

/* ======================= ШЛЕМЫ ======================= */
/** Купол/пояс на сфере головы. rimTop/rimBot — высоты краёв; gap — полуугол выреза спереди (для лица). */
function dome(par: G, mat: THREE.Material, sx: number, sy: number, sz: number, y: number, rimTop: number, rimBot?: number, gap = 0, z = 0) {
  const ph = (r: number) => Math.acos(Math.max(-1, Math.min(1, (r - y) / sy)));
  const t0 = rimBot === undefined ? 0 : ph(rimTop), t1 = rimBot === undefined ? ph(rimTop) : ph(rimBot);
  twoSided(mat);
  const m = mesh(new THREE.SphereGeometry(1, 36, 20, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap, t0, Math.max(0.05, t1 - t0)), mat);
  m.scale.set(sx, sy, sz); m.position.set(0, y, z); par.add(m); return m;
}
/** Накладка только на лице (по азимуту вокруг +Z). */
function patch(par: G, mat: THREE.Material, sx: number, sy: number, sz: number, yTop: number, yBot: number, half: number, y = 0.15, z = 0) {
  const ph = (r: number) => Math.acos(Math.max(-1, Math.min(1, (r - y) / sy)));
  const t0 = ph(yTop), t1 = ph(yBot);
  twoSided(mat);
  const m = mesh(new THREE.SphereGeometry(1, 32, 18, Math.PI / 2 - half, half * 2, t0, Math.max(0.05, t1 - t0)), mat);
  m.scale.set(sx, sy, sz); m.position.set(0, y, z); par.add(m); return m;
}
const brim = (par: G, mat: THREE.Material, r: number, y: number, sz: number, len = Math.PI) => {
  const m = mesh(new THREE.CylinderGeometry(r, r, 0.012, 28, 1, false, -len / 2, len), mat); m.scale.z = sz; return put(par, m, 0, y, 0.0);
};

export function addHelmet(id: string, head: G) {
  const c: number = GEAR[id].color, d1 = shade(c, 0.75);
  const shell = (rough = 0.55, metal = 0.1) => std(c, { rough, metal });
  switch (id) {
    case 'helmet1': {   // строительная каска
      dome(head, shell(0.4), 0.115, 0.125, 0.125, 0.15, 0.212);
      rbox(head, std(d1, { rough: 0.4 }), 0.024, 0.014, 0.17, 0, 0.268, 0, 0.007);
      brim(head, shell(0.4), 0.13, 0.208, 1.18);
      rbox(head, std(0xdddddd, { rough: 0.5 }), 0.05, 0.02, 0.025, 0, 0.226, 0.13, 0.006);
      break;
    }
    case 'helmet2': {   // мотошлем
      dome(head, shell(0.2, 0.3), 0.118, 0.13, 0.124, 0.15, 0.212);
      dome(head, shell(0.2, 0.3), 0.118, 0.13, 0.124, 0.15, 0.212, 0.04, 0.9);
      patch(head, glass(0x12161c, 0.8), 0.125, 0.135, 0.13, 0.245, 0.115, 0.78);
      rbox(head, std(0xeeeeee, { rough: 0.3 }), 0.03, 0.01, 0.24, 0, 0.283, 0, 0.004);
      for (const s of [-1, 1]) cyl(head, steelM(), 0.014, 0.014, s * 0.122, 0.195, 0.025, 0, 0, Math.PI / 2);
      rbox(head, darkM(), 0.07, 0.03, 0.03, 0, 0.12, 0.118, 0.01);
      break;
    }
    case 'helmet3': {   // шахтёрская каска с лампой
      dome(head, shell(0.45), 0.115, 0.125, 0.125, 0.15, 0.212);
      brim(head, shell(0.45), 0.128, 0.208, 1.1);
      rbox(head, std(d1, { rough: 0.4 }), 0.024, 0.018, 0.2, 0, 0.274, 0, 0.01);
      rbox(head, darkM(), 0.08, 0.06, 0.06, 0, 0.238, 0.13, 0.015);
      cyl(head, glow(0xfff0c0, 2.8), 0.026, 0.02, 0, 0.238, 0.162, Math.PI / 2, 0, 0, 20);
      tor(head, steelM(), 0.027, 0.005, 0, 0.238, 0.16);
      limb(head, [0, 0.27, 0.1], [0, 0.28, -0.1], 0.006, 0.006, darkM(), 6);
      rbox(head, darkM(), 0.08, 0.12, 0.05, 0, 0.2, -0.14, 0.012);
      limb(head, [0, 0.27, -0.1], [0, 0.21, -0.14], 0.006, 0.006, darkM(), 6);
      break;
    }
    case 'helmet4': {   // стальной СШ-68
      dome(head, shell(0.45, 0.5), 0.117, 0.125, 0.125, 0.15, 0.185);
      const b = mesh(new THREE.CylinderGeometry(0.122, 0.152, 0.03, 32), shell(0.45, 0.5)); b.scale.z = 1.06; put(head, b, 0, 0.2, 0);
      for (const s of [-1, 1]) { ball(head, steelM(), 0.008, s * 0.12, 0.215, 0.02); limb(head, [s * 0.105, 0.16, 0.03], [s * 0.04, 0.02, 0.085], 0.006, 0.006, std(0x2a2118, { rough: 0.8 }), 6); }
      limb(head, [-0.04, 0.02, 0.085], [0.04, 0.02, 0.085], 0.006, 0.006, std(0x2a2118, { rough: 0.8 }), 6);
      break;
    }
    case 'helmet5': {   // 6Б47
      dome(head, shell(0.8), 0.116, 0.126, 0.126, 0.15, 0.205);
      dome(head, shell(0.8), 0.116, 0.126, 0.126, 0.15, 0.205, 0.075, 0.95);
      rbox(head, darkM(), 0.055, 0.04, 0.016, 0, 0.238, 0.128, 0.006);
      for (const s of [-1, 1]) rbox(head, std(shade(c, 0.6), { rough: 0.9 }), 0.012, 0.04, 0.1, s * 0.115, 0.17, 0.0, 0.004);
      limb(head, [-0.1, 0.1, 0.02], [0, 0.02, 0.085], 0.005, 0.005, std(0x16181b, { rough: 0.8 }), 6);
      limb(head, [0.1, 0.1, 0.02], [0, 0.02, 0.085], 0.005, 0.005, std(0x16181b, { rough: 0.8 }), 6);
      break;
    }
    case 'helmet6': {   // сапёр «Сфера»
      dome(head, shell(0.5, 0.35), 0.125, 0.132, 0.132, 0.15, 0.215);
      dome(head, shell(0.5, 0.35), 0.125, 0.132, 0.132, 0.15, 0.215, -0.03, 0.95);
      patch(head, glass(0x20262c, 0.5), 0.13, 0.138, 0.14, 0.235, 0.0, 0.95);
      rbox(head, shell(0.5, 0.35), 0.2, 0.03, 0.04, 0, 0.245, 0.135, 0.012);
      for (const s of [-1, 1]) cyl(head, steelM(), 0.015, 0.02, s * 0.115, 0.22, 0.11, 0, 0, Math.PI / 2);
      rbox(head, darkM(), 0.04, 0.05, 0.025, 0, 0.04, 0.14, 0.01);
      break;
    }
    case 'helmet7': {   // «Рысь»
      dome(head, shell(0.7), 0.114, 0.124, 0.124, 0.15, 0.21);
      dome(head, shell(0.7), 0.114, 0.124, 0.124, 0.15, 0.21, 0.12, 1.55);
      for (const s of [-1, 1]) {
        rbox(head, darkM(), 0.012, 0.025, 0.1, s * 0.117, 0.19, 0.03, 0.004);
        cyl(head, darkM(), 0.042, 0.032, s * 0.108, 0.14, 0.0, 0, 0, Math.PI / 2, 18);
        cyl(head, std(shade(c, 0.5), { rough: 0.8 }), 0.032, 0.012, s * 0.126, 0.14, 0.0, 0, 0, Math.PI / 2, 18);
      }
      rbox(head, darkM(), 0.07, 0.05, 0.04, 0, 0.245, 0.12, 0.01);
      limb(head, [-0.12, 0.12, 0.02], [-0.07, 0.07, 0.12], 0.005, 0.005, darkM(), 6);
      ball(head, darkM(), 0.011, -0.07, 0.07, 0.12);
      break;
    }
    case 'helmet8': {   // «Бастион»
      dome(head, shell(0.35, 0.2), 0.118, 0.128, 0.128, 0.15, 0.212);
      dome(head, shell(0.35, 0.2), 0.118, 0.128, 0.128, 0.15, 0.212, 0.075, 0.9);
      rbox(head, shell(0.3, 0.3), 0.03, 0.02, 0.22, 0, 0.278, 0, 0.008);
      rbox(head, darkM(), 0.1, 0.025, 0.02, 0, 0.26, 0.12, 0.008);
      patch(head, glass(0x14181c, 0.82), 0.128, 0.136, 0.14, 0.25, 0.105, 0.78);
      patch(head, shell(0.3, 0.3), 0.131, 0.139, 0.143, 0.255, 0.238, 0.8);
      for (const s of [-1, 1]) { rbox(head, darkM(), 0.012, 0.03, 0.1, s * 0.12, 0.2, 0.04, 0.004); ball(head, steelM(), 0.01, s * 0.123, 0.23, 0.07); }
      break;
    }
    case 'helmet9': {   // «Ночной охотник»
      dome(head, shell(0.8), 0.115, 0.125, 0.125, 0.15, 0.205);
      dome(head, shell(0.8), 0.115, 0.125, 0.125, 0.15, 0.205, 0.09, 0.95);
      rbox(head, darkM(), 0.035, 0.05, 0.05, 0, 0.235, 0.125, 0.01);
      rbox(head, darkM(), 0.12, 0.05, 0.05, 0, 0.222, 0.155, 0.015);
      for (const s of [-1, 1]) {
        cyl(head, std(0x1e2326, { rough: 0.4, metal: 0.5 }), 0.026, 0.07, s * 0.034, 0.222, 0.2, Math.PI / 2, 0, 0, 18);
        cyl(head, glow(0x5cff7a, 2.4), 0.019, 0.006, s * 0.034, 0.222, 0.238, Math.PI / 2, 0, 0, 18);
      }
      limb(head, [0, 0.24, 0.12], [0, 0.27, -0.1], 0.005, 0.005, darkM(), 6);
      rbox(head, darkM(), 0.07, 0.07, 0.04, 0, 0.19, -0.13, 0.012);
      break;
    }
    default: {          // helmet10 — герметичный «Страж»
      dome(head, std(c, { rough: 0.25, metal: 0.1 }), 0.13, 0.138, 0.138, 0.14, 0.27, -0.01);
      patch(head, std(0xd9a84a, { rough: 0.12, metal: 0.9 }), 0.134, 0.142, 0.142, 0.245, 0.095, 0.88, 0.14);
      tor(head, steelM(), 0.095, 0.022, 0, 0.0, 0, Math.PI / 2);
      rbox(head, std(0xe0b61a, { rough: 0.5 }), 0.025, 0.012, 0.28, 0, 0.278, 0, 0.005);
      rbox(head, glow(0x4fe0ff, 2), 0.1, 0.008, 0.012, 0, 0.262, 0.115, 0.003);
      for (const s of [-1, 1]) cyl(head, darkM(), 0.022, 0.03, s * 0.138, 0.16, 0.0, 0, 0, Math.PI / 2, 16);
      break;
    }
  }
}

/* ======================= ПРОТИВОГАЗЫ ======================= */
function hose(par: G, from: V3, to: V3, mat: THREE.Material, r = 0.012) {
  const mid: V3 = [(from[0] + to[0]) / 2 + 0.03, Math.min(from[1], to[1]) - 0.03, (from[2] + to[2]) / 2 + 0.05];
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(...from), new THREE.Vector3(...mid), new THREE.Vector3(...to)]);
  par.add(mesh(new THREE.TubeGeometry(curve, 18, r, 8, false), mat));
}
const lens = (par: G, x: number, y: number, z: number, r: number, mat: THREE.Material, ring: THREE.Material) => {
  cyl(par, mat, r, 0.014, x, y, z, Math.PI / 2, 0, 0, 20); tor(par, ring, r + 0.002, 0.005, x, y, z + 0.006);
};
const harness = (par: G, ys: number[], mat: THREE.Material) => { for (const y of ys) { const t = tor(par, mat, 0.1, 0.004, 0, y, 0, Math.PI / 2); t.scale.set(1, 1.1, 1); } };

export function addMask(id: string, head: G) {
  const c: number = GEAR[id].color, strap = std(0x15171a, { rough: 0.8 });
  const rub = () => rubber(c);
  const metal = steelM(), dark = darkM();
  switch (id) {
    case 'mask1': {     // марля
      patch(head, std(c, { rough: 1 }), 0.102, 0.122, 0.112, 0.138, 0.05, 1.1);
      harness(head, [0.1], std(0xf4f2ea, { rough: 0.9 }));
      rbox(head, std(shade(c, 0.9), { rough: 1 }), 0.1, 0.006, 0.01, 0, 0.1, 0.1, 0.002);
      break;
    }
    case 'mask2': {     // респиратор
      patch(head, std(c, { rough: 0.7 }), 0.11, 0.13, 0.121, 0.145, 0.055, 0.85);
      rbox(head, std(0x8a8d90, { rough: 0.4, metal: 0.6 }), 0.04, 0.004, 0.01, 0, 0.145, 0.12, 0.001);
      cyl(head, std(0xd3d6d8, { rough: 0.4 }), 0.016, 0.02, 0, 0.09, 0.135, Math.PI / 2, 0, 0, 14);
      harness(head, [0.125, 0.07], strap);
      break;
    }
    case 'mask3': {     // ГП-5
      patch(head, rub(), 0.111, 0.128, 0.121, 0.215, 0.03, 1.25);
      for (const s of [-1, 1]) lens(head, s * 0.04, 0.17, 0.117, 0.03, glass(0x0c0f10, 0.9), metal);
      cyl(head, std(shade(c, 0.7), { rough: 0.5, metal: 0.3 }), 0.036, 0.06, 0, 0.07, 0.15, Math.PI / 2, 0, 0, 20);
      tor(head, metal, 0.036, 0.006, 0, 0.07, 0.18);
      harness(head, [0.23, 0.13, 0.06], strap);
      break;
    }
    case 'mask4': {     // полумаска с фильтрами и очками
      patch(head, rub(), 0.109, 0.126, 0.119, 0.145, 0.035, 1.05);
      for (const s of [-1, 1]) {
        cyl(head, std(0x3a3f44, { rough: 0.5, metal: 0.4 }), 0.028, 0.05, s * 0.065, 0.09, 0.125, Math.PI / 2, 0, s * -0.3, 16);
        tor(head, metal, 0.029, 0.005, s * 0.065, 0.09, 0.151, 0, s * -0.3);
        lens(head, s * 0.04, 0.17, 0.118, 0.032, glass(0x3a2c20, 0.6), strap);
      }
      rbox(head, strap, 0.04, 0.012, 0.012, 0, 0.17, 0.118, 0.004);
      harness(head, [0.17, 0.09], strap);
      break;
    }
    case 'mask5': {     // ГП-7
      patch(head, rub(), 0.111, 0.128, 0.121, 0.21, 0.03, 1.3);
      patch(head, glass(0x0a0d0e, 0.9), 0.116, 0.133, 0.126, 0.205, 0.13, 0.8);
      cyl(head, std(shade(c, 0.8), { rough: 0.5, metal: 0.3 }), 0.04, 0.06, -0.075, 0.07, 0.125, Math.PI / 2, 0, 0.2, 18);
      tor(head, metal, 0.041, 0.006, -0.075, 0.07, 0.155);
      cyl(head, metal, 0.016, 0.02, 0.035, 0.065, 0.14, Math.PI / 2, 0, 0, 12);
      harness(head, [0.235, 0.14, 0.06], strap);
      break;
    }
    case 'mask6': {     // «Бриз» со шлангом
      patch(head, rub(), 0.111, 0.128, 0.121, 0.215, 0.03, 1.25);
      for (const s of [-1, 1]) lens(head, s * 0.04, 0.17, 0.117, 0.03, glass(0x0c1114, 0.88), metal);
      cyl(head, metal, 0.02, 0.03, 0, 0.06, 0.145, Math.PI / 2, 0, 0, 14);
      hose(head, [0, 0.055, 0.16], [0, -0.1, 0.19], std(0x181b1e, { rough: 0.9 }));
      rbox(head, std(shade(c, 0.7), { rough: 0.5, metal: 0.4 }), 0.1, 0.12, 0.07, 0, -0.14, 0.2, 0.02);
      cyl(head, metal, 0.03, 0.02, 0, -0.14, 0.24, Math.PI / 2, 0, 0, 16);
      harness(head, [0.23, 0.13], strap);
      break;
    }
    case 'mask7': {     // ПБФ
      patch(head, rub(), 0.112, 0.13, 0.122, 0.215, 0.03, 1.3);
      patch(head, glass(0x07090a, 0.92), 0.117, 0.135, 0.127, 0.208, 0.14, 0.88);
      for (const s of [-1, 1]) {
        cyl(head, std(0x2a2e32, { rough: 0.45, metal: 0.5 }), 0.034, 0.055, s * 0.085, 0.07, 0.115, Math.PI / 2, 0, s * -0.35, 18);
        tor(head, metal, 0.035, 0.006, s * 0.085, 0.07, 0.143, 0, s * -0.35);
      }
      cyl(head, metal, 0.018, 0.03, 0, 0.065, 0.14, Math.PI / 2, 0, 0, 14);
      harness(head, [0.235, 0.15, 0.07], strap);
      break;
    }
    case 'mask8': {     // «Вектор»
      patch(head, rub(), 0.109, 0.126, 0.119, 0.145, 0.035, 1.1);
      cyl(head, std(0x1f2830, { rough: 0.4, metal: 0.5 }), 0.05, 0.035, 0, 0.09, 0.14, Math.PI / 2, 0, 0, 22);
      tor(head, glow(0x4fe0ff, 2.4), 0.046, 0.005, 0, 0.09, 0.159);
      for (let i = 0; i < 3; i++) rbox(head, dark, 0.07, 0.006, 0.006, 0, 0.075 + i * 0.015, 0.16, 0.002);
      rbox(head, glass(0x3a8fb0, 0.55) as any, 0.16, 0.035, 0.02, 0, 0.17, 0.108, 0.008);
      rbox(head, dark, 0.17, 0.01, 0.1, 0, 0.2, 0.065, 0.004);
      rbox(head, glow(0x4fe0ff, 2), 0.02, 0.008, 0.012, 0.075, 0.2, 0.108, 0.003);
      harness(head, [0.2, 0.09], strap);
      break;
    }
    case 'mask9': {     // «Ксенон»
      patch(head, std(c, { rough: 0.3, metal: 0.35 }), 0.108, 0.13, 0.118, 0.27, 0.0, Math.PI);
      for (const s of [-1, 1]) {
        const e = ball(head, glow(0xffa21f, 2.0), 0.03, s * 0.04, 0.168, 0.112, 1.2, 0.9, 0.35, 14); e.rotation.z = s * -0.1;
      }
      cyl(head, std(shade(c, 0.6), { rough: 0.4, metal: 0.5 }), 0.034, 0.05, 0, 0.082, 0.14, Math.PI / 2, 0, 0, 18);
      tor(head, metal, 0.035, 0.006, 0, 0.082, 0.166);
      hose(head, [0, 0.07, 0.15], [0.07, -0.12, 0.18], std(0x1b1d20, { rough: 0.9 }));
      rbox(head, std(shade(c, 0.7), { rough: 0.4, metal: 0.5 }), 0.1, 0.1, 0.07, 0.07, -0.15, 0.19, 0.02);
      tor(head, metal, 0.075, 0.02, 0, 0.0, 0, Math.PI / 2);
      break;
    }
    default: {          // mask10 — «Горгона»
      patch(head, std(c, { rough: 0.35, metal: 0.7 }), 0.112, 0.13, 0.122, 0.13, 0.02, 1.0);
      for (let i = 0; i < 4; i++) rbox(head, std(0x050505, { rough: 0.5 }), 0.1 - i * 0.012, 0.007, 0.012, 0, 0.11 - i * 0.025, 0.122, 0.002);
      patch(head, std(shade(c, 1.6), { rough: 0.35, metal: 0.7 }), 0.117, 0.135, 0.127, 0.215, 0.195, 1.1);
      rbox(head, glow(0xff2a1a, 2.6), 0.15, 0.02, 0.016, 0, 0.17, 0.112, 0.005);
      for (const s of [-1, 1]) {
        cyl(head, std(0x2a2c30, { rough: 0.4, metal: 0.7 }), 0.03, 0.06, s * 0.078, 0.07, 0.1, Math.PI / 2, 0, s * -0.5, 16);
        tor(head, std(0x8a1a12, { rough: 0.5 }), 0.031, 0.006, s * 0.078, 0.07, 0.13, 0, s * -0.5);
      }
      harness(head, [0.2, 0.09], strap);
      break;
    }
  }
}
