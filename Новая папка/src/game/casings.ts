// @ts-nocheck
import * as THREE from 'three';

/* ====================== ГИЛЬЗЫ ======================
   Вылетающие из оружия и падающие на пол стреляные гильзы.
   • eject(pos, vel, kind) — выбросить гильзу (мировые координаты)
   • later(delay, fn)      — отложенный выброс (затвор, помпа, барабан)
   • update(dt, cols)      — физика: гравитация, отскок от пола и стен, укладка гильзы на бок
   Гильзы лежат на полу до конца вылазки (самые старые перерабатываются, когда пул заполнен). */

const MAX = 90;
// размеры гильз (м): длина, радиус, цвет
export const CASING = {
  pistol:   { len: 0.030, r: 0.0068, color: 0xd9a63f },
  revolver: { len: 0.042, r: 0.0080, color: 0xd9a63f },
  rifle:    { len: 0.066, r: 0.0092, color: 0xe0b14a },
  mosin:    { len: 0.068, r: 0.0094, color: 0xc9983a },
  ak74:     { len: 0.046, r: 0.0072, color: 0xb98c3a },
  asval:    { len: 0.040, r: 0.0082, color: 0xc89d44 },
  shotgun:  { len: 0.066, r: 0.0125, color: 0xb3281c, hull: true }
};

CASING.deagle = { len: 0.040, r: 0.0082, color: 0xd9a63f };
CASING.an94 = CASING.ak74; CASING.groza = CASING.asval; CASING.vintorez = CASING.asval; CASING.kar98 = CASING.mosin; CASING.spas = CASING.shotgun;

export function createCasings(parent) {
  const group = new THREE.Group(); parent.add(group);
  const geoCache = {}, matCache = {};
  const geo = kind => geoCache[kind] || (geoCache[kind] = new THREE.CylinderGeometry(CASING[kind].r, CASING[kind].r * 0.92, CASING[kind].len, 8, 1));
  const mats = kind => matCache[kind] || (matCache[kind] = new THREE.MeshStandardMaterial({
    color: CASING[kind].color, roughness: CASING[kind].hull ? 0.7 : 0.32, metalness: CASING[kind].hull ? 0.1 : 0.85,
    emissive: CASING[kind].color, emissiveIntensity: 0.18
  }));
  // латунное донышко картечной гильзы
  const capGeo = new THREE.CylinderGeometry(0.0132, 0.0132, 0.016, 8, 1);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xd2a23c, roughness: 0.3, metalness: 0.85, emissive: 0xd2a23c, emissiveIntensity: 0.15 });

  const pool = [];
  let head = 0;
  const pending = [];

  function take(kind) {
    let c;
    if (pool.length < MAX) {
      const mesh = new THREE.Mesh(geo(kind), mats(kind));
      mesh.rotation.order = 'YXZ'; mesh.castShadow = false; mesh.receiveShadow = false;
      group.add(mesh);
      c = { mesh, cap: null, kind, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, bounces: 0, rest: true };
      pool.push(c);
    } else { c = pool[head]; head = (head + 1) % MAX; }
    c.kind = kind; c.mesh.geometry = geo(kind); c.mesh.material = mats(kind);
    if (CASING[kind].hull) {
      if (!c.cap) { c.cap = new THREE.Mesh(capGeo, capMat); c.mesh.add(c.cap); }
      c.cap.visible = true; c.cap.position.y = -CASING[kind].len / 2 + 0.008;
    } else if (c.cap) c.cap.visible = false;
    return c;
  }

  function eject(pos, vel, kind, spin = 1) {
    if (!CASING[kind]) return;
    const c = take(kind);
    c.mesh.position.copy(pos); c.mesh.visible = true;
    c.mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, 0);
    c.vx = vel.x; c.vy = vel.y; c.vz = vel.z;
    c.wx = (Math.random() * 2 - 1) * 30 * spin; c.wy = (Math.random() * 2 - 1) * 24 * spin;
    c.rest = false; c.bounces = 0;
  }
  function later(delay, fn) { pending.push({ t: delay, fn }); }

  function update(dt, cols, onImpact) {
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i]; p.t -= dt;
      if (p.t <= 0) { pending.splice(i, 1); p.fn(); }
    }
    const k = Math.PI / 2;
    for (const c of pool) {
      if (c.rest) continue;
      const m = c.mesh, r = CASING[c.kind].r;
      c.vy -= 9.8 * dt;
      const px = m.position.x, pz = m.position.z;
      let nx = px + c.vx * dt, ny = m.position.y + c.vy * dt, nz = pz + c.vz * dt;
      // стены и препятствия: отскок по осям
      if (cols) for (const b of cols) {
        if (nx > b.minX && nx < b.maxX && nz > b.minZ && nz < b.maxZ) {
          const inside = px > b.minX && px < b.maxX && pz > b.minZ && pz < b.maxZ;
          if (inside) { c.vx = c.vz = 0; nx = px; nz = pz; }
          else if (px <= b.minX || px >= b.maxX) { nx = px; c.vx *= -0.35; }
          else { nz = pz; c.vz *= -0.35; }
          c.wy *= 0.5; c.wx *= 0.5;
          if (onImpact) onImpact(c, 0.4);
          break;
        }
      }
      m.position.x = nx; m.position.z = nz;
      if (ny <= r) {
        ny = r; c.bounces++;
        const sp = Math.abs(c.vy);
        if (sp > 0.9 && c.bounces < 5) {
          c.vy = sp * 0.38; c.vx *= 0.6; c.vz *= 0.6; c.wx *= 0.6; c.wy *= 0.6;
          if (onImpact) onImpact(c, Math.min(1, sp / 4));
        } else {
          c.vy = 0; const f = Math.max(0, 1 - 9 * dt); c.vx *= f; c.vz *= f; c.wx *= 0.7; c.wy *= 0.7;
          if (Math.hypot(c.vx, c.vz) < 0.06) { c.rest = true; c.vx = c.vz = 0; }
        }
        // падая, гильза укладывается набок
        const tgt = Math.round((m.rotation.x - k) / Math.PI) * Math.PI + k;
        m.rotation.x += (tgt - m.rotation.x) * Math.min(1, dt * 14);
      }
      m.position.y = ny;
      if (c.rest) { m.rotation.x = Math.round((m.rotation.x - k) / Math.PI) * Math.PI + k; m.position.y = r; }
      else { m.rotation.x += c.wx * dt; m.rotation.y += c.wy * dt; }
    }
  }
  function clear() { pending.length = 0; for (const c of pool) { c.mesh.visible = false; c.rest = true; } }
  return { eject, later, update, clear, group };
}
