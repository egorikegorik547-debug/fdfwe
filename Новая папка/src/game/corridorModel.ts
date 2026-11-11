// @ts-nocheck
// «Коридорный» — одиночный сверххищник сети: высокий, болезненно худой, в белой рубашке с галстуком,
// длинные руки до колен, бледная голова с чёрной тряпичной маской на лице. Ходит сутулым, бегает на полусогнутых.
import * as THREE from 'three';
import { Part, std, ball } from './modelKit';

export function buildCorridor(cfg) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a });

  const shirt = std(0xd8d5cb, { tex: 'cloth', rough: 0.95, bump: 0.8 });
  const shirtD = std(0xa9a69c, { tex: 'cloth', rough: 0.95, bump: 0.8 });
  const tie = std(0x0b0b0d, { rough: 0.7 });
  const pants = std(0x0e0e11, { tex: 'cloth', rough: 0.95, bump: 0.7 });
  const shoe = std(0x050506, { rough: 0.4, metal: 0.2 });
  const skin = std(0xcfcbc0, { tex: 'skin', rough: 0.7, bump: 0.6 });
  const skinD = std(0x9c988e, { tex: 'skin', rough: 0.8, bump: 0.6 });
  const face = std(0xe9e6dc, { tex: 'skin', rough: 0.55, bump: 0.35 });
  const cloth = std(0x070708, { tex: 'cloth', rough: 1, bump: 0.6 });
  const hole = std(0x000000, { rough: 1 });
  const nail = std(0x2a2824, { rough: 0.5 });

  const HIP = 0.98;
  // ---- ноги ----
  const mkLeg = s => {
    const l = new THREE.Group(); l.position.set(s * 0.11, HIP, 0); g.add(l);
    const p = new Part(l);
    p.limb(pants, [0, 0, 0], [0, -0.5, 0.02], 0.075, 0.056, 9);
    p.sphere(pants, 0.052, 0, -0.5, 0.025, 1, 1, 1, { w: 8, h: 6 });
    p.limb(pants, [0, -0.5, 0.025], [0, -0.93, 0], 0.054, 0.042, 9);
    p.box(shoe, 0.1, 0.07, 0.26, 0, -0.96, 0.06);
    p.sphere(shoe, 0.05, 0, -0.95, 0.19, 1, 0.75, 1.1, { w: 8, h: 6 });
    p.flush();
    return l;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // ---- верх тела ----
  const upper = new THREE.Group(); upper.position.set(0, HIP, 0); g.add(upper);
  const T = new Part(upper);
  T.sphere(pants, 0.13, 0, 0.02, 0, 1.05, 0.7, 0.75, { w: 12, h: 8 });
  // узкий торс — рубашка
  T.limb(shirt, [0, 0.02, 0], [0, 0.36, 0], 0.125, 0.115, 12);
  T.limb(shirt, [0, 0.36, 0], [0, 0.66, 0], 0.115, 0.15, 12);
  T.sphere(shirt, 0.17, 0, 0.66, 0, 1.3, 0.55, 0.85, { w: 14, h: 8 });                  // плечи
  // рёбра проступают сквозь рубашку
  for (let k = 0; k < 4; k++) T.box(shirtD, 0.2, 0.012, 0.02, 0, 0.3 + k * 0.07, 0.115, 0.15, 0, 0);
  // складки и грязные пятна
  T.sphere(shirtD, 0.05, -0.08, 0.2, 0.1, 1.3, 0.5, 0.3, { w: 8, h: 6 });
  T.sphere(shirtD, 0.04, 0.1, 0.5, 0.1, 1.2, 0.5, 0.3, { w: 8, h: 6 });
  // воротник и галстук
  T.box(shirt, 0.17, 0.035, 0.12, 0, 0.74, 0.03, 0.2, 0, 0);
  T.box(tie, 0.04, 0.05, 0.025, 0, 0.7, 0.115, 0.15);
  T.box(tie, 0.055, 0.38, 0.018, 0, 0.5, 0.118, 0.1);
  T.cone(tie, 0.03, 0.09, [0, 0.31, 0.12], [0, -1, 0.1], 4);
  // шея
  T.limb(skin, [0, 0.7, 0.02], [0, 0.86, 0.06], 0.036, 0.032, 8);
  T.flush();

  // ---- голова ----
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.08); upper.add(head);
  const H = new Part(head);
  H.sphere(face, 0.14, 0, 0, 0, 0.95, 1.12, 1.0, { lump: 0.015, w: 18, h: 14 });
  H.sphere(face, 0.05, 0, -0.03, 0.14, 0.9, 1, 0.8, { w: 8, h: 6 });                       // нос
  // глазницы — чёрные провалы
  for (const s of [-1, 1]) {
    H.sphere(hole, 0.036, s * 0.055, 0.025, 0.118, 1, 1.35, 0.55, { w: 10, h: 8 });
    H.sphere(skinD, 0.045, s * 0.057, 0.065, 0.1, 1.1, 0.35, 0.5, { w: 8, h: 6 });          // тень над бровью
  }
  // чёрная тряпичная маска на нижней половине лица, узел сзади
  H.sphere(cloth, 0.142, 0, -0.045, 0.01, 0.98, 0.62, 1.0, { lump: 0.03, w: 16, h: 10 });
  H.box(cloth, 0.3, 0.025, 0.04, 0, 0.0, 0.0, 0, 0, 0);
  H.cone(cloth, 0.02, 0.1, [0, -0.05, -0.14], [0, -1, -0.5], 4);
  H.cone(cloth, 0.016, 0.08, [0.02, -0.05, -0.14], [0.5, -1, -0.6], 4);
  // редкие тёмные волосы
  H.sphere(cloth, 0.125, 0, 0.045, -0.035, 1.0, 0.6, 1.0, { lump: 0.05, w: 12, h: 8 });
  H.flush();
  // горящие точки зрачков в провалах
  ball(head, eyeMat, 0.011, -0.055, 0.025, 0.128, 1, 1, 0.7, 8, 6);
  ball(head, eyeMat, 0.011, 0.055, 0.025, 0.128, 1, 1, 0.7, 8, 6);

  // ---- руки: длинные, до колен ----
  const mkArm = s => {
    const a = new THREE.Group(); a.position.set(s * 0.23, 0.66, 0); upper.add(a);
    const p = new Part(a);
    p.sphere(shirt, 0.06, 0, 0, 0, 1, 1, 1, { w: 9, h: 7 });
    p.limb(shirt, [0, 0, 0], [0, -0.2, 0.01], 0.058, 0.062, 9);                        // короткий рукав
    p.limb(skin, [0, -0.2, 0.01], [0, -0.52, 0.025], 0.042, 0.034, 8);
    p.sphere(skinD, 0.034, 0, -0.52, 0.025, 1, 1, 1, { w: 8, h: 6 });                  // локоть
    p.limb(skin, [0, -0.52, 0.025], [0, -1.0, 0.07], 0.032, 0.026, 8);
    p.sphere(skin, 0.036, 0, -1.03, 0.08, 0.9, 1.3, 0.8, { w: 8, h: 6 });             // кисть
    for (let k = -2; k <= 1; k++) {                                                    // длинные пальцы
      const x = (k + 0.5) * 0.017;
      p.limb(skin, [x, -1.06, 0.08], [x * 1.3, -1.2 - Math.abs(k + 0.5) * -0.02, 0.1], 0.011, 0.006, 5);
      p.cone(nail, 0.006, 0.03, [x * 1.3, -1.2, 0.1], [0, -1, 0.1], 4);
    }
    p.limb(skin, [s * 0.025, -1.05, 0.07], [s * 0.075, -1.14, 0.1], 0.011, 0.006, 5);
    p.flush();
    return a;
  };
  const armL = mkArm(-1), armR = mkArm(1);

  g.scale.setScalar(cfg.scale);
  const base = { lean: 0.6 };
  g.userData = {
    eyeMat, upper, head, legL, legR, armL, armR, kind: 'corridor',
    anim(m, amp, chase, time) {
      const off = m.off || 0, ph = m.phase || 0;
      const lean = (chase ? 0.85 : 0.62) + Math.sin(time * 1.3 + off) * 0.035;
      base.lean = lean;
      upper.rotation.x = lean;
      upper.rotation.z = Math.sin(ph * 0.5) * 0.06 * amp;
      upper.rotation.y = Math.sin(ph * 0.5 + 1) * 0.1 * amp;
      upper.position.y = HIP + Math.abs(Math.sin(ph * 0.7)) * 0.05 * amp;
      const sw = Math.sin(ph * 0.7);
      legL.rotation.x = sw * 1.0 * amp; legR.rotation.x = -sw * 1.0 * amp;
      // руки висят вертикально (компенсируем наклон), при беге — болтаются, при ударе — взмах
      const sd = (m.cfg && m.cfg.swing) || 0.22;
      let ax = -lean, bx = -lean;
      const flail = chase ? 0.55 : 0.25;
      ax += -sw * flail * amp + Math.sin(time * 1.7 + off) * 0.03;
      bx += sw * flail * amp + Math.sin(time * 1.7 + off + 2) * 0.03;
      if (m.swing > 0) {
        const t = 1 - m.swing / sd;
        const v = -lean - 2.3 + t * 2.7;
        ax = v; bx = v - 0.12;
      }
      armL.rotation.x = ax; armR.rotation.x = bx;
      armL.rotation.z = 0.06 + Math.sin(time * 1.1 + off) * 0.03 + (chase ? 0.18 : 0);
      armR.rotation.z = -0.06 - Math.sin(time * 1.1 + off + 1) * 0.03 - (chase ? 0.18 : 0);
      // голова: дёрганая, иногда резко склоняется набок
      const twitch = Math.pow(Math.max(0, Math.sin(time * 0.7 + off * 3)), 24);
      head.rotation.x = -lean * 0.78 + (chase ? 0.1 : 0);
      head.rotation.z = Math.sin(time * 9 + off) * (chase ? 0.06 : 0.025) + twitch * 0.55;
      head.rotation.y = chase ? Math.sin(time * 14 + off) * 0.05 : Math.sin(time * 0.5 + off) * 0.45 + twitch * 0.4;
      eyeMat.color.setHex(chase ? 0xff3a22 : 0xaa1a10);
    },
    die(f) {
      g.rotation.x = -f * 1.5;
      upper.rotation.x = 0.5 * (1 - f);
      armL.rotation.z = 0.2 + f * 0.7; armR.rotation.z = -0.2 - f * 0.7;
      armL.rotation.x = armR.rotation.x = -0.5 * f - upper.rotation.x * 0.3;
      legL.rotation.x = 0.2 * f; legR.rotation.x = -0.15 * f;
      head.rotation.z = f * 0.5;
    }
  };
  return g;
}
