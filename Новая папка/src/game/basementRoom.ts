// @ts-nocheck
import * as THREE from 'three';
import { buildFurniture, furnDims, SOLID_FURN, setRackWeapons } from './furniture';

/* ============================================================
   ПОДВАЛ убежища: пустое бетонное помещение под жилой комнатой. Строится на продвинутом верстаке.
   Внутри — только лестница наверх: всё остальное игрок расставляет сам (ящики, стойки, стулья, свечи, картины, радио).
   API полностью совпадает с жилой комнатой (hubRoom.ts), поэтому расстановка и хранение работают как наверху.
   ============================================================ */
export const BASEMENT = { W: 12, D: 10, H: 3.0 };

const TAU = Math.PI * 2;

function mkTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}
function grain(x, w, h, n, a) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    x.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
  }
}
function concrete(base, seams, seed = 0) {
  return mkTex(512, 512, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const g = x.createRadialGradient(Math.random() * w, Math.random() * h, 0, Math.random() * w, Math.random() * h, 30 + Math.random() * 80);
      const v = Math.random() < 0.5 ? '0,0,0' : '255,255,255';
      g.addColorStop(0, `rgba(${v},${0.05 + Math.random() * 0.06})`); g.addColorStop(1, `rgba(${v},0)`);
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    grain(x, w, h, 5000, 0.2);
    if (seams) {
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
      x.strokeRect(1, 1, w - 2, h - 2);
      x.strokeStyle = 'rgba(255,255,255,.05)'; x.strokeRect(4, 4, w - 8, h - 8);
    }
    // потёки сырости
    for (let i = 0; i < 6; i++) {
      const sx = Math.random() * w, g = x.createLinearGradient(sx, 0, sx, 160 + Math.random() * 220);
      g.addColorStop(0, 'rgba(20,24,20,.28)'); g.addColorStop(1, 'rgba(20,24,20,0)');
      x.fillStyle = g; x.fillRect(sx, 0, 6 + Math.random() * 14, 400);
    }
    void seed;
  });
}

export function createBasementRoom() {
  const { W, D, H } = BASEMENT;
  const group = new THREE.Group();
  const colliders = [];
  const stations = [];
  const markers = [];
  const mats = {};
  const S = (c, r = 0.8, m = 0.1) => mats[`${c}_${r}_${m}`] || (mats[`${c}_${r}_${m}`] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }));
  const B = c => mats['b' + c] || (mats['b' + c] = new THREE.MeshBasicMaterial({ color: c, fog: false }));
  const box = (w, h, d, mat, x, y, z, p = group) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); p.add(m); return m; };
  const cylX = (r, len, mat, x, y, z, p = group) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat); m.rotation.z = Math.PI / 2; m.position.set(x, y, z); p.add(m); return m; };
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0, p = group) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); p.add(m); return m; };
  const solid = (x0, z0, x1, z1) => colliders.push({ x0, x1, z0, z1 });

  const floorT = concrete('#6f716d', true), wallT = concrete('#7d7f78', false), ceilT = concrete('#5a5c58', false);
  floorT.repeat.set(W / 3, D / 3); wallT.repeat.set(3, 1);
  const floorM = new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.9 });
  const ceilM = new THREE.MeshStandardMaterial({ map: ceilT, roughness: 0.95 });
  const wallM = len => { const t = wallT.clone(); t.needsUpdate = true; t.repeat.set(len / 3.3, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 }); };

  /* ===== Оболочка ===== */
  const floor = plane(W, D, floorM, W / 2, 0, D / 2, 0, -Math.PI / 2);
  plane(W, D, ceilM, W / 2, H, D / 2, 0, Math.PI / 2);
  [
    plane(W, H, wallM(W), W / 2, H / 2, 0),
    plane(W, H, wallM(W), W / 2, H / 2, D, Math.PI),
    plane(D, H, wallM(D), 0, H / 2, D / 2, Math.PI / 2),
    plane(D, H, wallM(D), W, H / 2, D / 2, -Math.PI / 2)
  ].forEach(w => { w.userData.isWall = true; });
  // плинтус, бетонные пояса и потолочные балки
  const trim = S(0x2a2b29, 0.9, 0.1);
  box(W, 0.12, 0.06, trim, W / 2, 0.06, 0.03); box(W, 0.12, 0.06, trim, W / 2, 0.06, D - 0.03);
  box(0.06, 0.12, D, trim, 0.03, 0.06, D / 2); box(0.06, 0.12, D, trim, W - 0.03, 0.06, D / 2);
  for (const bx of [2.2, 6, 9.8]) box(0.34, 0.32, D, S(0x4a4c49, 0.95, 0.05), bx, H - 0.16, D / 2);
  // трубы под потолком
  cylX(0.07, W, S(0x6b4a34, 0.6, 0.5), W / 2, H - 0.42, 0.35);
  cylX(0.05, W, S(0x3c5a6b, 0.5, 0.5), W / 2, H - 0.34, 0.6);
  cylX(0.09, W, S(0x4d5358, 0.6, 0.6), W / 2, H - 0.45, D - 0.35);
  for (let i = 1; i < 7; i++) cylX(0.105, 0.07, S(0x2c3034, 0.6, 0.6), i * 1.7, H - 0.45, D - 0.35);
  // слив в полу
  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), S(0x1b1c1b, 0.6, 0.6)); drain.rotation.x = -Math.PI / 2; drain.position.set(W / 2 + 0.6, 0.006, D / 2 - 0.4); group.add(drain);
  // чуть более тёмная полоса-«дорожка» вдоль входа
  plane(1.6, 3.4, new THREE.MeshStandardMaterial({ color: 0x3a3b39, roughness: 0.95, transparent: true, opacity: 0.4 }), 1.0, 0.004, 3.4, 0, -Math.PI / 2).userData.noPick = true;

  /* ===== Свет: пустой подвал должен быть виден целиком ===== */
  group.add(new THREE.HemisphereLight(0xdfe8f0, 0x2a2a28, 0.85));
  const lamps = [];
  const ceilLamp = (x, z, intensity, color) => {
    box(0.6, 0.06, 0.16, S(0x1d1f20, 0.6, 0.5), x, H - 0.46, z);
    const tube = box(0.54, 0.03, 0.1, B(0xf2f6ff), x, H - 0.5, z); tube.userData.noPick = true;
    const L = new THREE.PointLight(color, intensity, 15, 2); L.position.set(x, H - 0.8, z); group.add(L);
    lamps.push({ L, tube, base: intensity, ph: Math.random() * 10 });
  };
  ceilLamp(3.0, 3.2, 9, 0xe6efff); ceilLamp(9.0, 3.2, 9, 0xe6efff);
  ceilLamp(3.0, 7.2, 9, 0xe6efff); ceilLamp(9.0, 7.2, 9, 0xe6efff);
  ceilLamp(6.0, 5.0, 6, 0xffe2b8);

  /* ===== Лестница наверх (СЗ угол): подъём к потолку, люк светится ===== */
  const stairs = new THREE.Group(); group.add(stairs);
  {
    const stepM = S(0x5b5e5a, 0.7, 0.3), railM = S(0x23282c, 0.5, 0.7);
    const n = 8, rise = (H - 0.15) / n, run = 0.3, x0 = 0.4, wd = 1.2, zTop = 0.15;
    for (let i = 0; i < n; i++) {
      const h = rise * (i + 1), z = zTop + (n - 1 - i) * run + run / 2;
      const m = box(wd, h, run, stepM, x0 + wd / 2, h / 2, z, stairs); m.userData.noPick = true;
      const edge = box(wd, 0.025, 0.04, S(0xd9a21b, 0.5, 0.3), x0 + wd / 2, h + 0.002, z + run / 2 - 0.02, stairs); edge.userData.noPick = true;
    }
    // перила
    const zEnd = zTop + n * run;
    for (const x of [x0 + wd + 0.04]) {
      const rail = box(0.04, 0.04, n * run + 0.2, railM, x, 1.0, zTop + n * run / 2, stairs); rail.userData.noPick = true;
      for (let i = 0; i <= n; i += 2) { const p = box(0.04, 1.0 - 0.0, 0.04, railM, x, 0.5, zEnd - 0.1 - i * run * 0.97, stairs); p.userData.noPick = true; }
    }
    // квадратный проём в потолке с тёплым светом сверху
    const hatch = box(wd, 0.04, 1.0, B(0xffc88a), x0 + wd / 2, H - 0.01, 0.65, stairs); hatch.userData.noPick = true;
    const hl = new THREE.PointLight(0xffc88a, 3, 5, 2); hl.position.set(x0 + wd / 2, H - 0.4, 1.0); group.add(hl);
    solid(x0 - 0.05, 0.05, x0 + wd + 0.15, zEnd + 0.05);
    stations.push({ id: 'stairs', label: 'Лестница', x: x0 + wd / 2 + 0.3, z: zEnd + 0.9, reach: 2.4, marker: [x0 + wd / 2, 2.0, zEnd + 0.1] });
    // табличка
    const sign = mkTex(256, 64, (x, w, h) => {
      x.fillStyle = '#1b1d1c'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#d9a21b'; x.fillRect(0, 0, w, 6); x.fillRect(0, h - 6, w, 6);
      x.fillStyle = '#e8e2cc'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText('ПОДВАЛ · ПОДЪЁМ', w / 2, 42);
    });
    sign.repeat.set(1, 1);
    plane(1.1, 0.28, new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }), 0.8, 2.15, 0.035).userData.noPick = true;
  }

  /* ===== Маркер станции ===== */
  for (const s of stations) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshBasicMaterial({ color: 0x4aff8a, fog: false, transparent: true, opacity: 0.9 }));
    m.position.set(...s.marker); m.userData.y0 = s.marker[1]; m.userData.id = s.id; m.userData.noPick = true; m.userData.station = s; group.add(m); markers.push(m);
    const halo = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: 0x4aff8a, fog: false, wireframe: true, transparent: true, opacity: 0.45 }));
    halo.userData.noPick = true; m.add(halo);
  }

  /* ===== Тени и пыль ===== */
  group.traverse(o => {
    if (!o.isMesh) return;
    const std = o.material && o.material.isMeshStandardMaterial;
    o.receiveShadow = !!std; o.castShadow = false;
  });
  floor.receiveShadow = true;
  const DUST = 140, dg = new THREE.BufferGeometry(), dp = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) { dp[i * 3] = 0.5 + Math.random() * (W - 1); dp[i * 3 + 1] = 0.3 + Math.random() * (H - 0.6); dp[i * 3 + 2] = 0.5 + Math.random() * (D - 1); }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dotTex = mkTex(32, 32, (x, w, h) => {
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.clearRect(0, 0, w, h); x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  dotTex.repeat.set(1, 1);
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xdfe6ee, map: dotTex, size: 0.03, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
  dust.frustumCulled = false; dust.userData.noPick = true; group.add(dust);

  /* ===== МЕБЕЛЬ И ЯЩИКИ (те же правила, что в жилой комнате) ===== */
  const fstate = { radioOn: false };
  const inst = new Map();
  const candleL = new THREE.PointLight(0xff9a45, 0, 7, 2); candleL.position.set(6, 1.5, 5); group.add(candleL);
  const footprint = (id, x, z, ry) => {
    const d = furnDims(id), c = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
    const hx = c * d.w / 2 + sn * d.d / 2, hz = sn * d.w / 2 + c * d.d / 2;
    return { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz };
  };
  function addPlaced(rec) {
    if (inst.has(rec.uid)) return inst.get(rec.uid);
    const model = buildFurniture(rec.id); if (!model) return null;
    model.position.set(rec.x, rec.y, rec.z); model.rotation.y = rec.ry; group.add(model);
    model.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    if (model.userData.rack) setRackWeapons(model, (rec.items || []).map(s => s.id.slice(3)));
    let col = null;
    if (SOLID_FURN[rec.id] && rec.y < 0.06) { col = footprint(rec.id, rec.x, rec.z, rec.ry); colliders.push(col); }
    const it = { rec, model, col, dims: furnDims(rec.id), lit: true };
    inst.set(rec.uid, it); return it;
  }
  function removePlaced(uid) {
    const it = inst.get(uid); if (!it) return;
    group.remove(it.model);
    if (it.col) { const i = colliders.indexOf(it.col); if (i >= 0) colliders.splice(i, 1); }
    inst.delete(uid);
  }
  function syncPlaced(list) {
    const want = new Set(list.map(r => r.uid));
    for (const uid of [...inst.keys()]) if (!want.has(uid)) removePlaced(uid);
    for (const r of list) addPlaced(r);
  }
  function floorFree(id, x, z, ry, px, pz) {
    const f = footprint(id, x, z, ry), m = 0.14;
    if (f.x0 < m || f.x1 > W - m || f.z0 < m || f.z1 > D - m) return false;
    for (const b of colliders) {
      if (b.active === false) continue;
      if (f.x0 < b.x1 && f.x1 > b.x0 && f.z0 < b.z1 && f.z1 > b.z0) return false;
    }
    if (px !== undefined) {
      const cx = Math.max(f.x0, Math.min(f.x1, px)), cz = Math.max(f.z0, Math.min(f.z1, pz));
      if (Math.hypot(px - cx, pz - cz) < 0.55) return false;
    }
    return true;
  }
  const pickables = () => { const out = []; group.traverse(o => { if (o.isMesh && !o.userData.noPick) out.push(o); }); return out; };
  function restingOn(uid) {
    const a = inst.get(uid); if (!a || a.rec.id === 'painting') return null;
    const f = footprint(a.rec.id, a.rec.x, a.rec.z, a.rec.ry), top = a.rec.y + a.dims.h;
    for (const [id2, b] of inst) {
      if (id2 === uid || b.rec.id === 'painting') continue;
      if (b.rec.y > a.rec.y + 0.05 && b.rec.y <= top + 0.05 && b.rec.x > f.x0 - 0.05 && b.rec.x < f.x1 + 0.05 && b.rec.z > f.z0 - 0.05 && b.rec.z < f.z1 + 0.05) return b;
    }
    return null;
  }

  /* ===== API ===== */
  function refresh() {
    for (const it of inst.values()) if (it.rec.id === 'rack') setRackWeapons(it.model, (it.rec.items || []).map(s => s.id.slice(3)));
  }
  function setPower() { /* подвал освещён от общей сети убежища */ }
  function setLit(uid, on) { const it = inst.get(uid); if (it) it.lit = on; }
  function setRadio(on) { fstate.radioOn = on; }
  function update(t, dt, near, px = 5, pz = 5) {
    for (const l of lamps) {
      const flick = Math.random() < 0.004 ? 0.55 : 1;
      l.L.intensity = l.base * flick * (1 + Math.sin(t * 1.3 + l.ph) * 0.02);
    }
    for (const m of markers) {
      m.visible = m.userData.station.enabled !== false;
      m.position.y = m.userData.y0 + Math.sin(t * 2 + m.position.x) * 0.04;
      m.rotation.y = t * 1.2;
      const s = near === m.userData.id ? 1.6 : 1;
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * Math.min(1, dt * 8));
    }
    let bestC = null, bd = 1e9;
    for (const it of inst.values()) {
      if (it.rec.id === 'candle') {
        const fl = it.model.userData.flame;
        for (const m of fl) m.visible = it.lit;
        if (it.lit) {
          const k = 1 + Math.sin(t * 17 + it.rec.x) * 0.07 + Math.sin(t * 29.3) * 0.05 + (Math.random() - 0.5) * 0.06;
          fl[0].scale.set(0.8 / Math.sqrt(k), 2.1 * k, 0.8 / Math.sqrt(k)); fl[0].rotation.z = Math.sin(t * 5.3) * 0.12;
          fl[2].material.opacity = 0.1 + 0.04 * k;
          const d = Math.hypot(it.rec.x - px, it.rec.z - pz); if (d < bd) { bd = d; bestC = it; }
        }
      } else if (it.rec.id === 'radio') {
        const r = it.model.userData.radio, on = fstate.radioOn;
        r.dialMat.emissiveIntensity += ((on ? 0.65 + Math.sin(t * 7) * 0.05 : 0) - r.dialMat.emissiveIntensity) * Math.min(1, dt * 8);
        r.led.material.color.set(on ? 0x4aff7a : 0x3a1410);
        r.needle.position.x = r.needleX + (on ? (0.5 + 0.5 * Math.sin(t * 0.35)) * 0.07 : 0);
      }
    }
    if (bestC) {
      candleL.position.set(bestC.rec.x, bestC.rec.y + 0.32, bestC.rec.z);
      const k = 1 + Math.sin(t * 17) * 0.07 + Math.sin(t * 29.3) * 0.05 + (Math.random() - 0.5) * 0.06;
      candleL.intensity += ((3.4 * k) - candleL.intensity) * Math.min(1, dt * 14);
    } else candleL.intensity += (0 - candleL.intensity) * Math.min(1, dt * 10);
    const pa = dust.geometry.attributes.position;
    for (let i = 0; i < DUST; i++) {
      pa.array[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.0015 + 0.0008;
      pa.array[i * 3] += Math.cos(t * 0.2 + i * 1.7) * 0.0012;
      if (pa.array[i * 3 + 1] > H - 0.2) pa.array[i * 3 + 1] = 0.3;
    }
    pa.needsUpdate = true;
  }
  function collide(p, r) {
    p.x = Math.max(r + 0.12, Math.min(W - r - 0.12, p.x));
    p.z = Math.max(r + 0.12, Math.min(D - r - 0.12, p.z));
    for (const b of colliders) {
      if (b.active === false) continue;
      const cx = Math.max(b.x0, Math.min(b.x1, p.x)), cz = Math.max(b.z0, Math.min(b.z1, p.z));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      else {
        const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bt = b.z1 - p.z, m = Math.min(l, rr, t, bt);
        if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r; else if (m === t) p.z = b.z0 - r; else p.z = b.z1 + r;
      }
    }
  }
  void TAU;
  return { group, stations, collide, update, refresh, setPower, setLit, setRadio, addPlaced, removePlaced, syncPlaced, placed: inst, floorFree, pickables, restingOn, ROOM_DIMS: { W, D, H }, spawn: { x: 2.6, z: 4.2, yaw: -Math.PI / 2, pitch: 0 } };
}
