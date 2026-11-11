// Модели костюмов и бронежилетов + миниатюры снаряжения (для верстака). Рюкзаки/шлемы/противогазы — в gearParts.ts.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { std, cloth, put, mesh, rbox, ball, cyl, limb } from './gearKit';
import { GEAR } from './gearDefs';
import { shade, glow, addPack, addHelmet, addMask } from './gearParts';

export { addPack, addHelmet, addMask };
type G = THREE.Group;
const steelM = () => std(0x8a9399, { rough: 0.35, metal: 0.85 });
const darkM = () => std(0x17191c, { rough: 0.6, metal: 0.3 });
const strapM = () => std(0x232428, { rough: 0.9 });
const tor = (p: THREE.Object3D, mat: THREE.Material, R: number, r: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
  put(p, mesh(new THREE.TorusGeometry(R, r, 10, 28), mat), x, y, z, rx, ry, rz);

/* ======================= КОСТЮМЫ ======================= */
function patterned(draw: (x: CanvasRenderingContext2D) => void, rep = 2) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return std(0xffffff, { rough: 0.9, map: t });
}
const hx = (c: number) => '#' + c.toString(16).padStart(6, '0');
function camoMat(base: number, tones: number[]) {
  return patterned(x => {
    x.fillStyle = hx(base); x.fillRect(0, 0, 256, 256);
    for (const t of tones) {
      x.fillStyle = hx(t);
      for (let i = 0; i < 26; i++) {
        const cx = Math.random() * 256, cy = Math.random() * 256, r = 14 + Math.random() * 26;
        for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
          x.beginPath(); x.ellipse(cx + ox, cy + oy, r, r * (0.5 + Math.random() * 0.6), Math.random() * 3, 0, Math.PI * 2); x.fill();
        }
      }
    }
  });
}
function digitalMat(base: number) {
  return patterned(x => {
    x.fillStyle = hx(base); x.fillRect(0, 0, 256, 256);
    const k = [shade(base, 0.7), shade(base, 1.35), shade(base, 0.5)];
    for (let i = 0; i < 520; i++) { x.fillStyle = hx(k[i % 3]); x.fillRect(Math.floor(Math.random() * 32) * 8, Math.floor(Math.random() * 32) * 8, 8 * (1 + (i % 3)), 8); }
  }, 3);
}
function quiltMat(base: number) {
  return patterned(x => {
    x.fillStyle = hx(base); x.fillRect(0, 0, 256, 256);
    x.strokeStyle = hx(shade(base, 0.6)); x.lineWidth = 3;
    for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  }, 2);
}

export function suitMaterials(id: string | null) {
  if (!id) return { jacket: cloth(0x4c5a3e), jacketD: cloth(0x3d4932), pants: cloth(0x3f4137, 4) };
  const g = GEAR[id], c: number = g.color, c2: number = g.color2;
  const D = shade(c, 0.8);
  switch (id) {
    case 'suit2': return { jacket: std(0xffffff, { rough: 0.95, map: (quiltMat(c).map as THREE.Texture) }), jacketD: cloth(D), pants: cloth(c2, 4) };
    case 'suit3': { const m = camoMat(c, [shade(c, 0.6), 0x6b5a3a, 0x2f3a24]); return { jacket: m, jacketD: cloth(D), pants: camoMat(c2, [shade(c2, 0.65), 0x6b5a3a, 0x2f3a24]) }; }
    case 'suit4': return { jacket: std(c, { rough: 0.3, metal: 0.05 }), jacketD: std(D, { rough: 0.3 }), pants: std(c2, { rough: 0.3 }) };
    case 'suit7': return { jacket: std(c, { rough: 0.4 }), jacketD: std(D, { rough: 0.4 }), pants: cloth(c2, 4) };
    case 'suit8': return { jacket: std(c, { rough: 0.5, metal: 0.15 }), jacketD: std(D, { rough: 0.5 }), pants: std(c2, { rough: 0.5, metal: 0.15 }) };
    case 'suit9': return { jacket: digitalMat(c), jacketD: cloth(D), pants: digitalMat(c2) };
    case 'suit10': return { jacket: std(c, { rough: 0.35 }), jacketD: std(D, { rough: 0.35 }), pants: std(c2, { rough: 0.35 }) };
    default: return { jacket: cloth(c), jacketD: cloth(D), pants: cloth(c2, 4) };
  }
}

/** Детали костюма: upper — верх тела, g — вся фигура (для ног) */
export function addSuitExtras(id: string, upper: G, g: G) {
  const c: number = GEAR[id].color, c2: number = GEAR[id].color2;
  const legs = (fn: (s: number) => void) => { for (const s of [-1, 1]) fn(s); };
  switch (id) {
    case 'suit1': {
      rbox(upper, cloth(c2, 4), 0.085, 0.075, 0.02, -0.1, 1.33, 0.13, 0.008);
      rbox(upper, cloth(c2, 4), 0.09, 0.02, 0.024, -0.1, 1.372, 0.13, 0.006);
      rbox(upper, std(0xe8e4d6, { rough: 0.6 }), 0.05, 0.02, 0.01, 0.1, 1.36, 0.128, 0.004);
      rbox(upper, std(0xd89a1f, { rough: 0.5 }), 0.4, 0.012, 0.254, 0, 1.12, 0, 0.004);
      legs(s => rbox(g, cloth(c2, 4), 0.105, 0.1, 0.02, s * 0.125, 0.52, 0.094, 0.01));
      break;
    }
    case 'suit2': {
      const fur = std(0xc9c3b4, { rough: 1 });
      tor(upper, fur, 0.085, 0.034, 0, 1.5, 0, Math.PI / 2);
      for (const y of [1.12, 1.26]) rbox(upper, cloth(shade(c, 0.9)), 0.414, 0.05, 0.268, 0, y, 0, 0.022);
      for (const s of [-1, 1]) ball(upper, cloth(c), 0.098, s * 0.226, 1.39, 0, 1, 1, 1.05, 16);
      legs(s => rbox(g, cloth(c2, 4), 0.046, 0.15, 0.115, s * 0.208, 0.75, 0.0, 0.015));
      break;
    }
    case 'suit3': {
      const leaf = cloth(0x3a4a28, 6);
      for (const s of [-1, 1]) { ball(upper, leaf, 0.06, s * 0.235, 1.46, -0.01, 1.3, 0.55, 1.1, 10); ball(upper, leaf, 0.04, s * 0.2, 1.47, 0.05, 1, 0.6, 1, 8); }
      legs(s => rbox(g, cloth(c2, 4), 0.05, 0.13, 0.11, s * 0.208, 0.72, 0.0, 0.015));
      rbox(upper, cloth(shade(c, 0.6), 6), 0.34, 0.03, 0.26, 0, 1.12, 0, 0.012);
      break;
    }
    case 'suit4': {
      const tape = std(0xe5e0a0, { rough: 0.35 });
      rbox(upper, tape, 0.02, 0.38, 0.012, 0, 1.28, 0.127, 0.004);
      for (const s of [-1, 1]) rbox(upper, tape, 0.012, 0.36, 0.26, s * 0.2, 1.27, 0, 0.003);
      tor(upper, std(shade(c, 0.7), { rough: 0.3 }), 0.083, 0.026, 0, 1.49, 0, Math.PI / 2);
      rbox(upper, std(shade(c, 0.6), { rough: 0.4 }), 0.4, 0.035, 0.26, 0, 1.1, 0, 0.012);
      legs(s => { rbox(g, tape, 0.012, 0.42, 0.02, s * 0.208, 0.75, 0.0, 0.004); cyl(g, std(shade(c, 0.6), { rough: 0.3 }), 0.062, 0.05, s * 0.125, 0.27, 0.0); });
      break;
    }
    case 'suit5': {
      const pad = std(0x1e2123, { rough: 0.5, metal: 0.3 });
      for (const s of [-1, 1]) {
        ball(upper, pad, 0.1, s * 0.245, 1.43, 0, 1, 0.55, 1.15, 16);
        rbox(upper, std(0x6a5d3d, { rough: 0.7 }), 0.03, 0.02, 0.1, s * 0.255, 1.43, 0.0, 0.006);
      }
      rbox(upper, pad, 0.2, 0.05, 0.2, 0, 1.5, 0, 0.02);
      legs(s => { rbox(g, pad, 0.12, 0.14, 0.06, s * 0.125, 0.52, 0.1, 0.03); rbox(g, strapM(), 0.13, 0.025, 0.14, s * 0.125, 0.45, 0.02, 0.01); });
      break;
    }
    case 'suit6': {
      const plate = std(c2, { rough: 0.7, metal: 0.1 });
      rbox(upper, plate, 0.3, 0.2, 0.04, 0, 1.28, 0.14, 0.02);
      rbox(upper, plate, 0.3, 0.12, 0.04, 0, 1.12, 0.136, 0.02);
      rbox(upper, plate, 0.28, 0.3, 0.04, 0, 1.25, -0.14, 0.02);
      for (const s of [-1, 1]) ball(upper, plate, 0.105, s * 0.245, 1.43, 0, 1, 0.65, 1.2, 16);
      cyl(upper, plate, 0.09, 0.08, 0, 1.5, 0, 0, 0, 0, 18);
      legs(s => rbox(g, plate, 0.13, 0.26, 0.03, s * 0.115, 0.78, 0.108, 0.02));
      break;
    }
    case 'suit7': {
      const pts = [[0.0, 1.53], [0.16, 1.51], [0.25, 1.44], [0.3, 1.3], [0.33, 1.05], [0.35, 0.82]].map(p => new THREE.Vector2(p[0], p[1]));
      const poncho = mesh(new THREE.LatheGeometry(pts, 28), std(c, { rough: 0.4 })); poncho.material.side = THREE.DoubleSide;
      poncho.scale.z = 0.78; upper.add(poncho);
      tor(upper, std(shade(c, 0.7), { rough: 0.5 }), 0.1, 0.03, 0, 1.5, -0.01, Math.PI / 2);
      const hood = ball(upper, std(shade(c, 0.9), { rough: 0.4 }), 0.12, 0, 1.56, -0.1, 1, 0.9, 0.8, 16); hood.material.side = THREE.DoubleSide;
      rbox(upper, std(0xd8d4a0, { rough: 0.4 }), 0.012, 0.4, 0.01, 0, 1.15, 0.27, 0.003);
      legs(s => cyl(g, std(shade(c2, 0.8), { rough: 0.5 }), 0.07, 0.05, s * 0.125, 0.27, 0.0));
      break;
    }
    case 'suit8': {
      const fr = std(0x585e66, { rough: 0.35, metal: 0.8 }), cy = glow(0x4fe0ff, 2);
      rbox(upper, fr, 0.04, 0.42, 0.03, 0, 1.27, -0.14, 0.01);
      rbox(upper, fr, 0.3, 0.03, 0.03, 0, 1.4, -0.14, 0.01);
      rbox(upper, cy, 0.012, 0.3, 0.008, 0, 1.27, -0.158, 0.003);
      tor(g, fr, 0.2, 0.014, 0, 1.03, 0, Math.PI / 2);
      for (const s of [-1, 1]) {
        tor(upper, fr, 0.1, 0.012, s * 0.235, 1.39, 0, 0, Math.PI / 2, 0);
        cyl(g, fr, 0.05, 0.06, s * 0.215, 0.98, 0, 0, 0, Math.PI / 2, 16); cyl(g, cy, 0.03, 0.065, s * 0.215, 0.98, 0, 0, 0, Math.PI / 2, 16);
        limb(g, [s * 0.215, 0.98, 0], [s * 0.225, 0.54, 0.0], 0.018, 0.018, fr, 8);
        cyl(g, fr, 0.04, 0.06, s * 0.225, 0.54, 0, 0, 0, Math.PI / 2, 16); cyl(g, cy, 0.024, 0.065, s * 0.225, 0.54, 0, 0, 0, Math.PI / 2, 16);
        limb(g, [s * 0.225, 0.54, 0], [s * 0.2, 0.12, 0.02], 0.016, 0.016, fr, 8);
        rbox(g, fr, 0.03, 0.12, 0.05, s * 0.2, 0.3, 0.02, 0.008);
      }
      break;
    }
    case 'suit9': {
      const l = glow(0x6fd0ff, 1.8);
      for (const s of [-1, 1]) { rbox(upper, l, 0.01, 0.3, 0.008, s * 0.075, 1.27, 0.128, 0.003); rbox(upper, l, 0.1, 0.01, 0.01, s * 0.2, 1.46, 0.0, 0.003); }
      rbox(upper, l, 0.15, 0.01, 0.008, 0, 1.1, 0.13, 0.003);
      legs(s => rbox(g, l, 0.008, 0.38, 0.01, s * 0.1, 0.72, 0.1, 0.003));
      tor(upper, cloth(shade(c, 0.8)), 0.075, 0.032, 0, 1.49, 0, Math.PI / 2);
      break;
    }
    default: {          // suit10 — герметичный «Страж»
      const refl = std(0xcfd6da, { rough: 0.25, metal: 0.6 }), yel = std(0xe0b61a, { rough: 0.4 });
      for (const y of [1.2, 1.34]) rbox(upper, refl, 0.42, 0.032, 0.272, 0, y, 0, 0.008);
      cyl(upper, steelM(), 0.062, 0.03, 0, 1.38, 0.13, Math.PI / 2, 0, 0, 22); tor(upper, yel, 0.062, 0.01, 0, 1.38, 0.146);
      for (const s of [-1, 1]) cyl(upper, darkM(), 0.022, 0.04, s * 0.12, 1.12, 0.135, Math.PI / 2, 0, 0, 14);
      tor(upper, steelM(), 0.095, 0.028, 0, 1.485, 0, Math.PI / 2);
      rbox(upper, yel, 0.4, 0.02, 0.255, 0, 1.1, 0, 0.005);
      legs(s => {
        cyl(g, refl, 0.1, 0.035, s * 0.113, 0.74, 0.004, 0.08, 0, 0.05, 20);
        rbox(g, yel, 0.012, 0.4, 0.03, s * 0.21, 0.74, 0.0, 0.004);
        cyl(g, steelM(), 0.065, 0.05, s * 0.125, 0.27, 0.0);
      });
      break;
    }
  }
}

/* ======================= БРОНЕЖИЛЕТЫ ======================= */
export function addVest(id: string, u: G) {
  const c: number = GEAR[id].color, c2: number = GEAR[id].color2, d = shade(c, 0.7);
  const base = (h = 0.34, dp = 0.272, y = 1.27, w = 0.388, m: THREE.Material = cloth(c, 4)) => rbox(u, m, w, h, dp, 0, y, 0, 0.05);
  const sh = (m: THREE.Material, w = 0.075) => { for (const s of [-1, 1]) rbox(u, m, w, 0.03, 0.275, s * 0.115, 1.468, 0, 0.01); };
  const plateM = (col = 0x1c2220, r = 0.5, m = 0.45) => std(col, { rough: r, metal: m });
  const edge = std(0x4a5650, { rough: 0.4, metal: 0.6 });
  const pouch = (m: THREE.Material, x: number, y: number, w = 0.082, h = 0.1, z = 0.16) => { rbox(u, m, w, h, 0.05, x, y, z, 0.015); rbox(u, strapM(), w + 0.002, 0.018, 0.054, x, y + h * 0.3, z + 0.001, 0.008); };
  const hexa = (x: number, y: number, z: number, r: number, m: THREE.Material) => { const o = cyl(u, m, r, 0.028, x, y, z, Math.PI / 2, 0, Math.PI / 6, 6); return o; };
  switch (id) {
    case 'vest1': {
      base(); sh(cloth(c, 4));
      rbox(u, plateM(), 0.27, 0.26, 0.05, 0, 1.3, 0.15, 0.03); rbox(u, edge, 0.27, 0.012, 0.052, 0, 1.425, 0.15, 0.004);
      rbox(u, plateM(), 0.27, 0.26, 0.05, 0, 1.3, -0.15, 0.03);
      for (const x of [-0.1, 0, 0.1]) pouch(cloth(c2, 5), x, 1.115);
      break;
    }
    case 'vest2': {
      const st = std(c, { rough: 0.5, metal: 0.7 }), lea = std(c2, { rough: 0.8 });
      rbox(u, lea, 0.39, 0.3, 0.26, 0, 1.26, 0, 0.04); sh(lea);
      rbox(u, st, 0.3, 0.34, 0.045, 0, 1.28, 0.152, 0.06); rbox(u, st, 0.03, 0.3, 0.02, 0, 1.28, 0.18, 0.01);
      rbox(u, st, 0.3, 0.34, 0.045, 0, 1.28, -0.152, 0.06);
      for (const s of [-1, 1]) { rbox(u, st, 0.1, 0.03, 0.2, s * 0.17, 1.49, 0, 0.015, 0, 0, -s * 0.25); for (const k of [-0.1, 0.1]) for (const yy of [1.4, 1.17]) ball(u, steelM(), 0.009, s * 0.13 + k * 0 + (k > 0 ? 0.02 : -0.02), yy, 0.176); }
      rbox(u, lea, 0.42, 0.03, 0.27, 0, 1.15, 0, 0.01); rbox(u, steelM(), 0.04, 0.04, 0.02, 0, 1.15, 0.14, 0.006);
      break;
    }
    case 'vest3': {
      const k = cloth(c, 5);
      base(0.36, 0.262, 1.27, 0.395, k); sh(k, 0.08);
      rbox(u, cloth(0x2e3336, 5), 0.2, 0.05, 0.2, 0, 1.5, 0, 0.02);
      for (const y of [1.12, 1.4]) rbox(u, cloth(0x30363a, 5), 0.4, 0.03, 0.268, 0, y, 0, 0.01);
      for (const s of [-1, 1]) rbox(u, cloth(c2, 5), 0.012, 0.3, 0.2, s * 0.2, 1.27, 0, 0.004);
      rbox(u, std(0xe0e0e0, { rough: 0.5 }), 0.1, 0.014, 0.01, 0, 1.38, 0.136, 0.004);
      rbox(u, cloth(0x30363a, 5), 0.012, 0.34, 0.01, 0, 1.27, 0.134, 0.004);
      break;
    }
    case 'vest4': {
      base(); sh(cloth(c, 4));
      rbox(u, cloth(d, 4), 0.412, 0.1, 0.285, 0, 1.12, 0, 0.03);
      for (const x of [-0.12, -0.04, 0.04, 0.12]) pouch(cloth(c2, 5), x, 1.31, 0.07, 0.09, 0.158);
      for (const x of [-0.1, 0, 0.1]) pouch(cloth(c2, 5), x, 1.115, 0.085, 0.1, 0.165);
      rbox(u, cloth(c2, 5), 0.06, 0.14, 0.05, -0.15, 1.37, 0.155, 0.015);
      limb(u, [-0.15, 1.44, 0.155], [-0.16, 1.62, 0.14], 0.004, 0.004, darkM(), 6);
      break;
    }
    case 'vest5': {
      base(); sh(cloth(c, 4));
      const cer = std(0x4a5440, { rough: 0.6, metal: 0.1 });
      rbox(u, cer, 0.28, 0.28, 0.04, 0, 1.3, 0.155, 0.02); rbox(u, cer, 0.28, 0.28, 0.04, 0, 1.3, -0.155, 0.02);
      rbox(u, cloth(d, 4), 0.412, 0.08, 0.285, 0, 1.12, 0, 0.03);
      for (const x of [-0.1, 0, 0.1]) pouch(cloth(c2, 5), x, 1.115, 0.085, 0.1, 0.17);
      for (const s of [-1, 1]) { rbox(u, cloth(c, 4), 0.1, 0.04, 0.2, s * 0.17, 1.49, 0, 0.02, 0, 0, -s * 0.2); rbox(u, strapM(), 0.012, 0.28, 0.01, s * 0.12, 1.3, 0.178, 0.004); }
      rbox(u, cloth(d, 4), 0.18, 0.05, 0.17, 0, 1.5, 0, 0.02);
      break;
    }
    case 'vest6': {
      base(0.36, 0.285, 1.27, 0.4, cloth(c2, 4)); sh(cloth(c2, 4), 0.09);
      const st = std(c, { rough: 0.45, metal: 0.6 });
      rbox(u, st, 0.31, 0.3, 0.07, 0, 1.29, 0.16, 0.03); rbox(u, std(shade(c, 0.6), { rough: 0.5, metal: 0.6 }), 0.04, 0.26, 0.02, 0, 1.29, 0.2, 0.008);
      rbox(u, st, 0.3, 0.3, 0.06, 0, 1.28, -0.16, 0.03);
      for (const s of [-1, 1]) {
        rbox(u, st, 0.05, 0.22, 0.2, s * 0.215, 1.25, 0, 0.02);
        rbox(u, st, 0.15, 0.05, 0.2, s * 0.2, 1.5, 0, 0.02, 0, 0, -s * 0.3); rbox(u, st, 0.12, 0.04, 0.18, s * 0.255, 1.455, 0, 0.02, 0, 0, -s * 0.5);
      }
      rbox(u, st, 0.2, 0.07, 0.2, 0, 1.51, 0, 0.02);
      rbox(u, st, 0.16, 0.15, 0.05, 0, 0.93, 0.145, 0.02, 0.2, 0, 0);
      for (const x of [-0.12, 0.12]) for (const y of [1.4, 1.18]) ball(u, steelM(), 0.01, x, y, 0.2);
      break;
    }
    case 'vest7': {
      const k = cloth(c, 6);
      rbox(u, k, 0.392, 0.36, 0.258, 0, 1.27, 0, 0.05); sh(k, 0.06);
      const pip = cloth(c2, 6);
      for (const x of [-0.1, 0, 0.1]) rbox(u, pip, 0.01, 0.32, 0.006, x, 1.27, 0.131, 0.002);
      for (const y of [1.14, 1.4]) rbox(u, pip, 0.38, 0.01, 0.006, 0, y, 0.131, 0.002);
      rbox(u, std(0x888b8d, { rough: 0.5 }), 0.05, 0.02, 0.006, 0.12, 1.4, 0.135, 0.002);
      for (const s of [-1, 1]) rbox(u, pip, 0.01, 0.34, 0.24, s * 0.197, 1.27, 0, 0.003);
      break;
    }
    case 'vest8': {
      base(0.34, 0.275); sh(cloth(c, 4));
      const pl = std(c2, { rough: 0.55, metal: 0.25 });
      rbox(u, pl, 0.29, 0.3, 0.045, 0, 1.3, 0.155, 0.012);
      for (const s of [-1, 1]) { rbox(u, pl, 0.07, 0.07, 0.046, s * 0.145, 1.43, 0.155, 0.01, 0, 0, s * 0.8); rbox(u, pl, 0.05, 0.22, 0.2, s * 0.213, 1.2, 0, 0.012); rbox(u, cloth(c, 4), 0.1, 0.04, 0.21, s * 0.18, 1.5, 0, 0.02, 0, 0, -s * 0.3); }
      rbox(u, pl, 0.29, 0.3, 0.045, 0, 1.3, -0.155, 0.012);
      for (const x of [-0.1, 0, 0.1]) pouch(cloth(d, 5), x, 1.1, 0.065, 0.11, 0.172);
      rbox(u, cloth(d, 5), 0.2, 0.12, 0.05, 0, 1.2, -0.2, 0.015);
      rbox(u, darkM(), 0.04, 0.1, 0.05, 0.12, 1.25, -0.2, 0.01); limb(u, [0.12, 1.3, -0.2], [0.125, 1.5, -0.2], 0.004, 0.004, darkM(), 6);
      rbox(u, cloth(d, 4), 0.18, 0.05, 0.17, 0, 1.5, 0, 0.02);
      break;
    }
    case 'vest9': {
      base(0.4, 0.29, 1.27, 0.4, cloth(0x25282b, 4)); sh(cloth(0x25282b, 4), 0.09);
      const st = std(c, { rough: 0.4, metal: 0.65 }), or = std(c2, { rough: 0.5, metal: 0.2 });
      rbox(u, st, 0.34, 0.36, 0.07, 0, 1.28, 0.165, 0.035); rbox(u, or, 0.34, 0.022, 0.073, 0, 1.18, 0.166, 0.004);
      rbox(u, st, 0.3, 0.08, 0.06, 0, 1.47, 0.15, 0.02);
      for (const y of [1.06, 0.99]) rbox(u, st, 0.3, 0.06, 0.06, 0, y, 0.15, 0.02);
      rbox(u, st, 0.34, 0.36, 0.07, 0, 1.28, -0.165, 0.035);
      for (const s of [-1, 1]) { rbox(u, st, 0.06, 0.3, 0.22, s * 0.225, 1.25, 0, 0.02); ball(u, st, 0.1, s * 0.255, 1.48, 0, 1.1, 0.7, 1.25, 16); tor(u, or, 0.09, 0.008, s * 0.255, 1.46, 0, Math.PI / 2); }
      cyl(u, st, 0.09, 0.09, 0, 1.52, 0, 0, 0, 0, 18);
      rbox(u, st, 0.17, 0.18, 0.06, 0, 0.9, 0.145, 0.02, 0.15, 0, 0);
      break;
    }
    default: {          // vest10 — «Эгида»
      const gr = cloth(c, 5), hexM = std(shade(c, 1.5), { rough: 0.3, metal: 0.7 }), gl = glow(c2, 2.2);
      base(0.36, 0.272, 1.27, 0.39, gr); sh(gr, 0.08);
      let row = 0;
      for (const y of [1.4, 1.335, 1.27, 1.205, 1.14]) { for (let i = -2; i <= 2; i++) { const x = i * 0.056 + (row % 2 ? 0.028 : 0); if (Math.abs(x) < 0.16) hexa(x, y, 0.15, 0.03, hexM); } row++; }
      for (const s of [-1, 1]) { rbox(u, gl, 0.01, 0.3, 0.01, s * 0.17, 1.27, 0.142, 0.003); rbox(u, hexM, 0.1, 0.03, 0.2, s * 0.18, 1.49, 0, 0.015, 0, 0, -s * 0.3); rbox(u, gl, 0.1, 0.008, 0.2, s * 0.185, 1.508, 0, 0.003, 0, 0, -s * 0.3); }
      rbox(u, gl, 0.28, 0.01, 0.01, 0, 1.1, 0.15, 0.003);
      for (let i = 0; i < 3; i++) for (let j = -1; j <= 1; j++) hexa(j * 0.06 + (i % 2 ? 0.03 : 0), 1.36 - i * 0.07, -0.15, 0.03, hexM);
      rbox(u, gr, 0.2, 0.05, 0.19, 0, 1.5, 0, 0.02);
      cyl(u, gl, 0.022, 0.012, 0, 1.3, 0.17, Math.PI / 2, 0, 0, 16);
      break;
    }
  }
}

/* ======================= МИНИАТЮРЫ ДЛЯ ВЕРСТАКА ======================= */
const thumbCache = new Map<string, string>();
let tr: THREE.WebGLRenderer | null = null, tEnv: THREE.Texture | null = null;
const SIZE = 192;

function mannequin(suit: string | null) {
  const root = new THREE.Group(), g = new THREE.Group(), upper = new THREE.Group(); root.add(g); g.add(upper);
  const m = suit ? suitMaterials(suit) : { jacket: cloth(0x6d7480), jacketD: cloth(0x5a616c), pants: cloth(0x4d535c, 4) };
  const skin = std(0xc9b49e, { rough: 0.7 }), boots = std(0x2b2119, { rough: 0.7 });
  rbox(upper, m.jacket, 0.4, 0.4, 0.25, 0, 1.27, 0, 0.08); rbox(upper, m.jacket, 0.416, 0.09, 0.266, 0, 1.1, 0, 0.04); rbox(upper, m.jacket, 0.3, 0.09, 0.2, 0, 1.46, 0, 0.04);
  for (const s of [-1, 1]) {
    ball(upper, m.jacket, 0.087, s * 0.225, 1.39, 0, 1, 1, 1.05, 16);
    limb(g, [s * 0.235, 1.39, 0], [s * 0.285, 1.12, 0.03], 0.062, 0.053, m.jacket); ball(g, m.jacket, 0.055, s * 0.285, 1.12, 0.03);
    limb(g, [s * 0.285, 1.12, 0.03], [s * 0.3, 0.88, 0.07], 0.053, 0.044, m.jacket); ball(g, skin, 0.045, s * 0.3, 0.86, 0.075);
    const hx_ = s * 0.1;
    limb(g, [s * 0.125, 0.2, 0], [s * 0.125, 0.3, 0], 0.066, 0.07, boots); rbox(g, boots, 0.118, 0.1, 0.3, s * 0.125, 0.055, 0.06, 0.035);
    limb(g, [s * 0.125, 0.26, 0], [s * 0.125, 0.52, 0.012], 0.074, 0.084, m.pants); ball(g, m.pants, 0.086, s * 0.125, 0.52, 0.012);
    limb(g, [s * 0.125, 0.52, 0.012], [hx_, 0.96, 0], 0.088, 0.104, m.pants);
  }
  rbox(g, m.pants, 0.37, 0.22, 0.23, 0, 0.98, 0, 0.07);
  rbox(g, std(0x241b14, { rough: 0.75 }), 0.38, 0.055, 0.24, 0, 1.03, 0, 0.02);
  limb(upper, [0, 1.46, 0], [0, 1.55, 0], 0.055, 0.052, skin);
  const head = new THREE.Group(); put(upper, head, 0, 1.5, 0);
  ball(head, skin, 1, 0, 0.15, 0, 0.095, 0.115, 0.105, 24);
  ball(head, std(0x2a1d16, { rough: 0.9 }), 1, 0, 0.145, -0.04, 0.099, 0.095, 0.082, 14);
  for (const s of [-1, 1]) { ball(head, std(0xf2eee6, { rough: 0.3 }), 0.014, s * 0.037, 0.168, 0.093, 1, 0.85, 0.7, 10); ball(head, std(0x1b120c, { rough: 0.2 }), 0.0085, s * 0.037, 0.168, 0.103, 1, 1, 0.6, 8); }
  ball(head, skin, 0.022, 0, 0.135, 0.108, 0.8, 1.15, 1.2, 10);
  return { root, upper, g, head };
}

export function gearThumb(id: string): string {
  const hit = thumbCache.get(id); if (hit !== undefined) return hit;
  let url = '';
  try {
    const def = GEAR[id]; if (!def) return '';
    if (!tr) {
      tr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      tr.setSize(SIZE, SIZE, false); tr.setPixelRatio(1); tr.toneMapping = THREE.ACESFilmicToneMapping; tr.outputColorSpace = THREE.SRGBColorSpace;
      const pm = new THREE.PMREMGenerator(tr); tEnv = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    }
    const scene = new THREE.Scene(); scene.environment = tEnv; scene.environmentIntensity = 0.7;
    const key = new THREE.DirectionalLight(0xfff0dd, 2.6); key.position.set(2.2, 4, 3.2); scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fb8ff, 1.6); rim.position.set(-3, 2, -2.5); scene.add(rim);
    const back = new THREE.DirectionalLight(0xffe0b0, 1.2); back.position.set(2, 2, -3); scene.add(back);
    const M = mannequin(def.slot === 'suit' ? id : null);
    scene.add(M.root);
    let target: [number, number, number] = [0, 1.28, 0], dist = 1.7, yaw = 0.5;
    switch (def.slot) {
      case 'suit': addSuitExtras(id, M.upper, M.g); target = [0, 0.86, 0]; dist = 3.5; yaw = 0.55; break;
      case 'vest': addVest(id, M.upper); target = [0, 1.28, 0]; dist = 1.55; yaw = 0.5; break;
      case 'pack': addPack(id, M.upper, 0.4); target = [0, 1.2, -0.2]; dist = 2.15; yaw = Math.PI + 0.55; break;
      case 'helmet': addHelmet(id, M.head); target = [0, 1.66, 0.02]; dist = 0.85; yaw = 0.6; break;
      default: addMask(id, M.head); target = [0, 1.6, 0.04]; dist = 0.95; yaw = 0.55; break;
    }
    const cam = new THREE.PerspectiveCamera(28, 1, 0.05, 30);
    cam.position.set(target[0] + Math.sin(yaw) * dist, target[1] + dist * 0.12, target[2] + Math.cos(yaw) * dist);
    cam.lookAt(target[0], target[1], target[2]);
    tr.render(scene, cam);
    url = tr.domElement.toDataURL('image/png');
    M.root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); const ms = Array.isArray(m.material) ? m.material : [m.material]; for (const x of ms) x.dispose(); } });
  } catch (e) { console.warn('gear thumb failed', id, e); }
  thumbCache.set(id, url); return url;
}
