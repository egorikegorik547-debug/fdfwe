// @ts-nocheck
/* ============================================================
   САУНДТРЕК ГЛАВНОГО МЕНЮ — 5 постапокалиптических композиций.
   Всё синтезируется в реальном времени через Web Audio (внешних файлов нет).
   При каждом входе в меню (menuMusic.start() после stop()) выбирается СЛУЧАЙНЫЙ трек из списка TRACKS
   (два раза подряд один и тот же не выпадает).

     1. «Ржавый горизонт»      — пустошь, гитарный перебор, медленный пульс, губная гармошка
     2. «Пепел и тишина»       — разреженное пианино, хоровые пады, дозиметр
     3. «Сирена в тумане»      — индустриальный дрон, лязг металла, сирена вдали
     4. «Последний марш»       — маршевая дробь, литавры, медные
     5. «Радио из бункера»     — вальс из старого радиоприёмника, треск и морзянка
   ============================================================ */

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOf = a => a[Math.floor(Math.random() * a.length)];

let ctx = null, session = null, wantPlay = false, unlockBound = false;
let volume = 0.6, reverbBuf = null, noiseBuf = null, pinkBuf = null, lastTrack = -1;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { ctx = null; }
  return ctx;
}

function makeBuffers(ac) {
  if (reverbBuf) return;
  const sr = ac.sampleRate, len = Math.floor(sr * 5.2), pre = Math.floor(sr * 0.026);
  reverbBuf = ac.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = reverbBuf.getChannelData(c); let y = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / (len - pre), a = 0.88 - 0.8 * Math.pow(t, 0.35);
      y += ((Math.random() * 2 - 1) - y) * Math.max(0.06, a);
      d[i] = y * Math.pow(1 - t, 3.0) * (i - pre < 400 ? (i - pre) / 400 : 1) * 2.4;
    }
  }
  noiseBuf = ac.createBuffer(1, sr * 2, sr);
  const n = noiseBuf.getChannelData(0); for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  const pl = sr * 4; pinkBuf = ac.createBuffer(1, pl, sr);
  const p = pinkBuf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < pl; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
    p[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  const f = Math.floor(sr * 0.25);
  for (let i = 0; i < f; i++) { const k = i / f; p[i] *= k; p[pl - 1 - i] *= k; }
}

/* ------------------------------------------------------------
   Общий граф: мастер-цепь, реверб, эхо, шины
   ------------------------------------------------------------ */
function createSession(ac, T) {
  makeBuffers(ac);
  const BEAT = 60 / T.bpm;
  const S = { ac, T, BEAT, alive: true, timer: 0, persistent: [], beat: 0, nextT: 0, crackleT: 0, melNext: 2 };
  const g = (v = 1) => { const n = ac.createGain(); n.gain.value = v; return n; };
  S.g = g;

  S.out = g(0); S.vol = g(volume);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = T.lp || 9000; lp.Q.value = 0.5;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = T.hp || 20; hp.Q.value = 0.5;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3.4; comp.attack.value = 0.02; comp.release.value = 0.32;
  const mix = g(1);
  mix.connect(lp); lp.connect(hp); hp.connect(comp); comp.connect(S.out); S.out.connect(S.vol); S.vol.connect(ac.destination);
  S.mix = mix;

  const conv = ac.createConvolver(); conv.buffer = reverbBuf;
  const rvIn = g(1), rvOut = g(T.reverb ?? 0.85);
  const rvHP = ac.createBiquadFilter(); rvHP.type = 'highpass'; rvHP.frequency.value = 170;
  rvIn.connect(rvHP); rvHP.connect(conv); conv.connect(rvOut); rvOut.connect(mix);

  const dL = ac.createDelay(3), dR = ac.createDelay(3);
  dL.delayTime.value = BEAT * (T.dl ?? 0.75); dR.delayTime.value = BEAT * (T.dr ?? 1);
  const fb = T.fb ?? 0.38, fbL = g(fb), fbR = g(fb);
  const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1900;
  const fr = ac.createBiquadFilter(); fr.type = 'lowpass'; fr.frequency.value = 1500;
  const pL = ac.createStereoPanner(), pR = ac.createStereoPanner(); pL.pan.value = -0.65; pR.pan.value = 0.65;
  const dlIn = g(1);
  dlIn.connect(dL); dlIn.connect(dR);
  dL.connect(fl); fl.connect(fbL); fbL.connect(dL); fl.connect(pL); pL.connect(mix); fl.connect(rvIn);
  dR.connect(fr); fr.connect(fbR); fbR.connect(dR); fr.connect(pR); pR.connect(mix);

  const bus = (dry, rev, dly) => {
    const b = g(1), d = g(dry), r = g(rev), e = g(dly);
    b.connect(d); d.connect(mix); b.connect(r); r.connect(rvIn); b.connect(e); e.connect(dlIn);
    return b;
  };
  S.bus = bus;
  S.padBus = bus(0.55, 0.55, 0.0); S.droneBus = bus(0.9, 0.12, 0); S.pluckBus = bus(0.5, 0.55, 0.65);
  S.leadBus = bus(0.45, 0.8, 0.4); S.drumBus = bus(0.85, 0.3, 0); S.fxBus = bus(0.5, 0.8, 0.1);
  S.windBus = bus(0.7, 0.35, 0); S.tickBus = bus(0.5, 0.5, 0.15); S.pianoBus = bus(0.6, 0.7, 0.3);

  if (T.setup) T.setup(S);

  const t0 = ac.currentTime;
  S.out.gain.cancelScheduledValues(t0); S.out.gain.setValueAtTime(0, t0); S.out.gain.linearRampToValueAtTime(1, t0 + 4);
  S.nextT = t0 + 0.15;
  return S;
}

/* ------------------------------------------------------------
   Постоянные слои
   ------------------------------------------------------------ */
function windLayer(S, level = 1) {
  const ac = S.ac, g = S.g;
  const src = (freq, q, gain, lfoF, lfoD, glfo) => {
    const s = ac.createBufferSource(); s.buffer = pinkBuf; s.loop = true; s.playbackRate.value = rnd(0.85, 1.1);
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const o = ac.createOscillator(); o.frequency.value = lfoF; const od = g(lfoD); o.connect(od); od.connect(f.frequency);
    const v = g(gain * level); const o2 = ac.createOscillator(); o2.frequency.value = glfo; const o2d = g(gain * level * 0.7); o2.connect(o2d); o2d.connect(v.gain);
    const pn = ac.createStereoPanner(); pn.pan.value = rnd(-0.6, 0.6);
    s.connect(f); f.connect(v); v.connect(pn); pn.connect(S.windBus);
    s.start(); o.start(); o2.start(); S.persistent.push(s, o, o2);
  };
  src(420, 0.7, 0.08, 0.055, 220, 0.043); src(900, 1.3, 0.04, 0.071, 400, 0.031); src(2300, 5, 0.012, 0.047, 700, 0.057);
}
function droneLayer(S, midi, vol = 0.3, types = ['sine', 'triangle']) {
  const ac = S.ac, g = S.g, out = [];
  types.forEach((type, i) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = mtof(midi) * (1 + i * 0.003);
    const l = ac.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = 170;
    const vg = g(vol / (1 + i * 2.5)); o.connect(l); l.connect(vg); vg.connect(S.droneBus); o.start(); S.persistent.push(o); out.push(o);
  });
  return out;
}
function steadyNoise(S, kind, freq, q, gain, bus) {
  const ac = S.ac, g = S.g;
  const s = ac.createBufferSource(); s.buffer = kind === 'white' ? noiseBuf : pinkBuf; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const v = g(gain); s.connect(f); f.connect(v); v.connect(bus); s.start(); S.persistent.push(s);
  return v;
}

/* ------------------------------------------------------------
   Голоса
   ------------------------------------------------------------ */
function vPad(S, notes, t, dur, vol, o = {}) {
  const ac = S.ac, end = t + dur, type = o.type || 'sawtooth', top = o.bright ?? 1500;
  notes.forEach((m, i) => {
    const freq = mtof(m), tt = t + i * (o.spread ?? 0.09);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(320, tt); f.frequency.linearRampToValueAtTime(top + freq * 0.6, tt + dur * 0.55); f.frequency.linearRampToValueAtTime(420, end + 2.5);
    const v = ac.createGain(); v.gain.setValueAtTime(0.0001, tt); v.gain.setTargetAtTime(Math.max(0.005, vol - i * 0.004), tt, o.att ?? 1.1); v.gain.setTargetAtTime(0.0001, end, 1.3);
    const lfo = ac.createOscillator(); lfo.frequency.value = rnd(0.12, 0.3);
    const ld = ac.createGain(); ld.gain.value = 5; lfo.connect(ld);
    for (const det of [-11, -3, 4, 12]) {
      const os = ac.createOscillator(); os.type = type; os.frequency.value = freq; os.detune.value = det; ld.connect(os.detune);
      const og = ac.createGain(); og.gain.value = 0.26; os.connect(og); og.connect(f); os.start(tt); os.stop(end + 7);
    }
    const sub = ac.createOscillator(); sub.type = 'triangle'; sub.frequency.value = freq / 2;
    const sg = ac.createGain(); sg.gain.value = 0.4; sub.connect(sg); sg.connect(f); sub.start(tt); sub.stop(end + 7);
    lfo.start(tt); lfo.stop(end + 7);
    f.connect(v); v.connect(o.bus || S.padBus);
  });
}
// «хоровой» пад: пилы через формантные фильтры
function vChoir(S, notes, t, dur, vol) {
  const ac = S.ac, end = t + dur;
  notes.forEach((m, i) => {
    const f0 = mtof(m), tt = t + i * 0.2;
    const v = ac.createGain(); v.gain.setValueAtTime(0.0001, tt); v.gain.setTargetAtTime(vol, tt, 1.8); v.gain.setTargetAtTime(0.0001, end, 2.0);
    const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 650; f1.Q.value = 4;
    const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1080; f2.Q.value = 5;
    const vib = ac.createOscillator(); vib.frequency.value = rnd(4.6, 5.6); const vd = ac.createGain(); vd.gain.value = 7; vib.connect(vd);
    for (const det of [-6, 5]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f0; o.detune.value = det; vd.connect(o.detune);
      const og = ac.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(f1); og.connect(f2); o.start(tt); o.stop(end + 8);
    }
    f1.connect(v); const g2 = ac.createGain(); g2.gain.value = 0.55; f2.connect(g2); g2.connect(v);
    vib.start(tt); vib.stop(end + 8); v.connect(S.padBus);
  });
}
function vSub(S, midi, t, dur, vol = 0.42) {
  const ac = S.ac;
  const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(midi);
  const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = mtof(midi + 12);
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 280;
  const v = ac.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.setTargetAtTime(vol, t, 0.5); v.gain.setTargetAtTime(0.0001, t + dur, 0.8);
  const v2 = ac.createGain(); v2.gain.value = 0.3; o2.connect(v2); v2.connect(f); o.connect(f); f.connect(v); v.connect(S.droneBus);
  o.start(t); o.stop(t + dur + 4); o2.start(t); o2.stop(t + dur + 4);
}
// короткий «удар» баса (пульс)
function vThump(S, midi, t, vol = 0.4, len = 0.5) {
  const ac = S.ac, o = ac.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(mtof(midi) * 1.8, t); o.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.08);
  const v = ac.createGain(); v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(v); v.connect(S.drumBus); o.start(t); o.stop(t + len + 0.05);
}
// музыкальная шкатулка / пианино / электропиано
function vPluck(S, midi, t, vol, o = {}) {
  const ac = S.ac, f0 = mtof(midi), dec = o.decay ?? 2.4;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.bright ?? 4200, t); f.frequency.exponentialRampToValueAtTime(900, t + dec * 0.4); f.Q.value = 0.5;
  const v = ac.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(vol, t + 0.006); v.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  const pn = ac.createStereoPanner(); pn.pan.value = o.pan ?? 0;
  const wob = o.wobble ? ac.createOscillator() : null; let wd = null;
  if (wob) { wob.frequency.value = rnd(0.7, 1.3); wd = ac.createGain(); wd.gain.value = o.wobble; wob.connect(wd); wob.start(t); wob.stop(t + dec + 0.2); }
  for (const [m, type, a] of (o.parts || [[1, 'triangle', 1], [2, 'sine', 0.38], [3.01, 'sine', 0.12], [4.2, 'sine', 0.05]])) {
    const os = ac.createOscillator(); os.type = type; os.frequency.value = f0 * m; if (wd) wd.connect(os.detune);
    const og = ac.createGain(); og.gain.setValueAtTime(a, t); if (m > 1.5) og.gain.exponentialRampToValueAtTime(a * 0.05, t + 0.6);
    os.connect(og); og.connect(f); os.start(t); os.stop(t + dec + 0.2);
  }
  f.connect(v); v.connect(pn); pn.connect(o.bus || S.pluckBus);
}
const PIANO_PARTS = [[1, 'triangle', 1], [2, 'sine', 0.5], [3, 'sine', 0.2], [4.01, 'sine', 0.09], [5.02, 'sine', 0.04]];
function vPiano(S, midi, t, vol, pan = 0) {
  vPluck(S, midi, t, vol, { decay: 4.2, bright: 3000, pan, parts: PIANO_PARTS, bus: S.pianoBus });
  const ac = S.ac, n = ac.createBufferSource(); n.buffer = noiseBuf;     // стук молоточка
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = mtof(midi) * 3; f.Q.value = 1.5;
  const v = ac.createGain(); v.gain.setValueAtTime(vol * 0.5, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  n.connect(f); f.connect(v); v.connect(S.pianoBus); n.start(t, rnd(0, 1)); n.stop(t + 0.08);
}
// гитара «пустоши»: щипок со скольжением и хвостом
function vGuitar(S, midi, t, vol, o = {}) {
  const ac = S.ac, f0 = mtof(midi), dec = o.decay ?? 1.6;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3.5;
  f.frequency.setValueAtTime(3600, t); f.frequency.exponentialRampToValueAtTime(520, t + 0.5);
  const v = ac.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(vol, t + 0.004); v.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.18); v.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  const pn = ac.createStereoPanner(); pn.pan.value = o.pan ?? rnd(-0.2, 0.2);
  for (const [type, m, a, det] of [['sawtooth', 1, 0.5, -4], ['sawtooth', 1, 0.5, 4], ['square', 2, 0.1, 0], ['triangle', 0.5, 0.35, 0]]) {
    const os = ac.createOscillator(); os.type = type; os.detune.value = det;
    if (o.slide) { os.frequency.setValueAtTime(f0 * m * Math.pow(2, o.slide / 12), t); os.frequency.exponentialRampToValueAtTime(f0 * m, t + 0.12); }
    else os.frequency.value = f0 * m;
    const og = ac.createGain(); og.gain.value = a; os.connect(og); og.connect(f); os.start(t); os.stop(t + dec + 0.1);
  }
  const n = ac.createBufferSource(); n.buffer = noiseBuf;                 // щелчок медиатора
  const nf = ac.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 2500;
  const nv = ac.createGain(); nv.gain.setValueAtTime(vol * 0.35, t); nv.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  n.connect(nf); nf.connect(nv); nv.connect(f); n.start(t, rnd(0, 1)); n.stop(t + 0.05);
  f.connect(v); v.connect(pn); pn.connect(S.pluckBus);
}
// соло: смычок / губная гармошка / медь
function vLead(S, midi, t, dur, vol, kind = 'bow') {
  const ac = S.ac, f0 = mtof(midi), end = t + dur;
  const f = ac.createBiquadFilter(); f.type = kind === 'harmonica' ? 'bandpass' : 'lowpass';
  f.Q.value = kind === 'harmonica' ? 2.2 : kind === 'brass' ? 2 : 1.2;
  if (kind === 'brass') { f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(2100, t + 0.35); f.frequency.linearRampToValueAtTime(900, end + 0.5); }
  else if (kind === 'harmonica') f.frequency.value = Math.min(3200, f0 * 2.6);
  else { f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1900, t + Math.min(0.9, dur * 0.5)); f.frequency.linearRampToValueAtTime(700, end + 0.8); }
  const att = kind === 'brass' ? 0.18 : kind === 'harmonica' ? 0.12 : 0.45;
  const v = ac.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(vol, t + att); v.gain.setValueAtTime(vol, Math.max(t + att, end - 0.1)); v.gain.setTargetAtTime(0.0001, end, 0.4);
  const vib = ac.createOscillator(); vib.frequency.value = kind === 'harmonica' ? 5.8 : 5.1; const vd = ac.createGain();
  vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(kind === 'brass' ? 5 : 11, t + 1.0); vib.connect(vd);
  const dets = kind === 'brass' ? [-9, 0, 9] : [-7, 6];
  for (const det of dets) {
    const o = ac.createOscillator(); o.type = kind === 'harmonica' ? 'square' : 'sawtooth'; o.frequency.value = f0; o.detune.value = det; vd.connect(o.detune);
    const og = ac.createGain(); og.gain.value = kind === 'harmonica' ? 0.28 : 0.5; o.connect(og); og.connect(f); o.start(t); o.stop(end + 3);
  }
  const o8 = ac.createOscillator(); o8.type = 'sine'; o8.frequency.value = f0 / 2; const g8 = ac.createGain(); g8.gain.value = 0.5; o8.connect(g8); g8.connect(f); o8.start(t); o8.stop(end + 3);
  vib.start(t); vib.stop(end + 3);
  const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = f0 * 2; nf.Q.value = 3;
  const ng = ac.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(kind === 'harmonica' ? 0.12 : 0.06, t + 0.3); ng.gain.setTargetAtTime(0.0001, end, 0.3);
  n.connect(nf); nf.connect(ng); ng.connect(f); n.start(t); n.stop(end + 2);
  f.connect(v); v.connect(S.leadBus);
}
function vKick(S, t, vol, pitch = 1, len = 1.1) {
  const ac = S.ac, o = ac.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(130 * pitch, t); o.frequency.exponentialRampToValueAtTime(38 * pitch, t + 0.28);
  const v = ac.createGain(); v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(v); v.connect(S.drumBus); o.start(t); o.stop(t + len + 0.1);
  const n = ac.createBufferSource(); n.buffer = noiseBuf;
  const nf = ac.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 420 * pitch;
  const nv = ac.createGain(); nv.gain.setValueAtTime(vol * 0.55, t); nv.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  n.connect(nf); nf.connect(nv); nv.connect(S.drumBus); n.start(t, rnd(0, 1)); n.stop(t + 0.2);
}
function vSnare(S, t, vol, o = {}) {
  const ac = S.ac, n = ac.createBufferSource(); n.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.f ?? 2300; f.Q.value = 0.8;
  const v = ac.createGain(); v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + (o.len ?? 0.2));
  n.connect(f); f.connect(v); v.connect(S.drumBus); n.start(t, rnd(0, 1)); n.stop(t + (o.len ?? 0.2) + 0.05);
  const os = ac.createOscillator(); os.type = 'triangle'; os.frequency.setValueAtTime(210, t); os.frequency.exponentialRampToValueAtTime(130, t + 0.1);
  const ov = ac.createGain(); ov.gain.setValueAtTime(vol * 0.5, t); ov.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  os.connect(ov); ov.connect(S.drumBus); os.start(t); os.stop(t + 0.15);
}
function vHat(S, t, vol, len = 0.05) {
  const ac = S.ac, n = ac.createBufferSource(); n.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
  const v = ac.createGain(); v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const pn = ac.createStereoPanner(); pn.pan.value = rnd(-0.4, 0.4);
  n.connect(f); f.connect(v); v.connect(pn); pn.connect(S.drumBus); n.start(t, rnd(0, 1)); n.stop(t + len + 0.03);
}
function vRim(S, t, vol) {
  const ac = S.ac, o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 1750;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1750; f.Q.value = 6;
  const v = ac.createGain(); v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(f); f.connect(v); v.connect(S.drumBus); o.start(t); o.stop(t + 0.08);
}
function vClank(S, t, vol) {
  const ac = S.ac, base = rnd(380, 620);
  const v = ac.createGain(); v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  const pn = ac.createStereoPanner(); pn.pan.value = rnd(-0.5, 0.5);
  for (const [m, a, d] of [[1, 1, 2.0], [2.76, 0.7, 1.3], [5.4, 0.45, 0.8], [8.93, 0.25, 0.45]]) {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = base * m;
    const og = ac.createGain(); og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(og); og.connect(v); o.start(t); o.stop(t + d + 0.1);
  }
  const n = ac.createBufferSource(); n.buffer = noiseBuf;
  const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = base * 3.2; nf.Q.value = 6;
  const ng = ac.createGain(); ng.gain.setValueAtTime(0.9, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  n.connect(nf); nf.connect(ng); ng.connect(v); n.start(t, rnd(0, 1)); n.stop(t + 0.12);
  v.connect(pn); pn.connect(S.fxBus);
}
function vSwell(S, t, dur, vol) {
  const ac = S.ac, n = ac.createBufferSource(); n.buffer = pinkBuf; n.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
  f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(5200, t + dur);
  const v = ac.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + dur * 0.97); v.gain.linearRampToValueAtTime(0, t + dur + 0.05);
  n.connect(f); f.connect(v); v.connect(S.fxBus); n.start(t); n.stop(t + dur + 0.2);
}
function vImpact(S, t, vol) {
  const ac = S.ac, o = ac.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(26, t + 2.4);
  const v = ac.createGain(); v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  o.connect(v); v.connect(S.fxBus); o.start(t); o.stop(t + 3.3);
  const n = ac.createBufferSource(); n.buffer = noiseBuf;
  const nf = ac.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.setValueAtTime(900, t); nf.frequency.exponentialRampToValueAtTime(90, t + 1.4);
  const nv = ac.createGain(); nv.gain.setValueAtTime(vol * 0.6, t); nv.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  n.connect(nf); nf.connect(nv); nv.connect(S.fxBus); n.start(t, rnd(0, 1)); n.stop(t + 1.7);
}
function vTick(S, t, a = rnd(0.02, 0.07)) {
  const ac = S.ac, n = ac.createBufferSource(); n.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = rnd(2400, 4200);
  const v = ac.createGain();
  v.gain.setValueAtTime(a, t); v.gain.exponentialRampToValueAtTime(0.0001, t + rnd(0.004, 0.012));
  const pn = ac.createStereoPanner(); pn.pan.value = rnd(-0.9, 0.9);
  n.connect(f); f.connect(v); v.connect(pn); pn.connect(S.tickBus); n.start(t, rnd(0, 1.5)); n.stop(t + 0.03);
}
// далёкая сирена: медленный подъём и спад тона
function vSiren(S, t, dur, vol, base = 392) {
  const ac = S.ac;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 1.72, t + dur * 0.5); o.frequency.exponentialRampToValueAtTime(base, t + dur);
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 2;
  const v = ac.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(vol, t + dur * 0.35); v.gain.linearRampToValueAtTime(0.0001, t + dur);
  const pn = ac.createStereoPanner(); pn.pan.setValueAtTime(-0.6, t); pn.pan.linearRampToValueAtTime(0.6, t + dur);
  o.connect(f); f.connect(v); v.connect(pn); pn.connect(S.fxBus); o.start(t); o.stop(t + dur + 0.1);
}
// сухой короткий тон (морзянка, сигнал)
function vBeep(S, t, f, dur, vol = 0.04) {
  const ac = S.ac, o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
  const v = ac.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(vol, t + 0.004); v.gain.setValueAtTime(vol, t + dur - 0.01); v.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(v); v.connect(S.tickBus); o.start(t); o.stop(t + dur + 0.02);
}
// всплеск радиопомех
function vStatic(S, t, dur, vol) {
  const ac = S.ac, n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(rnd(900, 2400), t); f.Q.value = 0.8;
  f.frequency.linearRampToValueAtTime(rnd(900, 3200), t + dur);
  const v = ac.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(vol, t + 0.03); v.gain.linearRampToValueAtTime(0.0001, t + dur);
  n.connect(f); f.connect(v); v.connect(S.tickBus); n.start(t, rnd(0, 1)); n.stop(t + dur + 0.05);
}
// индустриальный «стаб» (рубленая пила)
function vStab(S, midi, t, dur, vol) {
  const ac = S.ac, f0 = mtof(midi);
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 5; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(240, t + dur);
  const v = ac.createGain(); v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const det of [-8, 8]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f0; o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 0.05); }
  f.connect(v); v.connect(S.padBus);
}

/* ------------------------------------------------------------
   ТРЕКИ
   ------------------------------------------------------------ */
const crackleLoop = (S, ahead, rate = [0.25, 1.9], p = 0.8) => {
  const ac = S.ac;
  while (S.crackleT < ahead) {
    if (S.crackleT < ac.currentTime) S.crackleT = ac.currentTime;
    S.crackleT += rnd(rate[0], rate[1]);
    if (Math.random() < p) vTick(S, S.crackleT);
    if (Math.random() < 0.18) { const b = S.crackleT; for (let k = 1; k < 4; k++) vTick(S, b + k * rnd(0.02, 0.09)); }
  }
};
// блуждающая мелодия: выбирает ноту, близкую к предыдущей
function wander(S, pool) {
  const last = S.lastMel || pickOf(pool); let m = pickOf(pool), best = 99;
  for (let k = 0; k < 3; k++) { const c = pickOf(pool), d = Math.abs(c - last); if (d < best && (d > 0 || k === 2)) { best = d; m = c; } }
  S.lastMel = m; return m;
}
const driftDrone = (S, midi, t, tc = 2.5) => S.drone && S.drone.forEach((o, i) => { o.frequency.cancelScheduledValues(t); o.frequency.setTargetAtTime(mtof(midi) * (1 + i * 0.003), t, tc); });

/* 1. РЖАВЫЙ ГОРИЗОНТ — пустошь, гитара, медленный пульс */
const T1_CH = [
  { root: 33, pad: [57, 60, 64, 67], arp: [57, 60, 64, 67, 69, 72], mel: [69, 72, 74, 76, 79, 67] },
  { root: 29, pad: [53, 57, 60, 64], arp: [53, 57, 60, 64, 65, 69], mel: [72, 69, 65, 67, 76, 77] },
  { root: 36, pad: [55, 60, 64, 67], arp: [55, 60, 64, 67, 72, 76], mel: [72, 76, 79, 67, 74, 71] },
  { root: 28, pad: [52, 56, 59, 62], arp: [52, 56, 59, 62, 64, 68], mel: [71, 68, 64, 76, 74, 68] }
];
const T1_LAYERS = [{ gtr: 0.55, drum: 0, lead: 0, pad: 0.5 }, { gtr: 1, drum: 0.7, lead: 0, pad: 0.6 }, { gtr: 1, drum: 1, lead: 1, pad: 0.8 }, { gtr: 0.6, drum: 0.3, lead: 0.5, pad: 0.5 }];
const T1_PAT = [[0, 0], [1.5, 2], [3, 4], [4, 1], [5.5, 3], [7, 5]];
const TRACK1 = {
  name: 'Ржавый горизонт', mood: 'пустошь, гитара и ветер', bpm: 76, lp: 8200, hp: 30, reverb: 0.7, fb: 0.34,
  setup(S) { windLayer(S, 1.5); S.drone = droneLayer(S, 33 - 12, 0.3, ['sine', 'triangle', 'sawtooth']); },
  beat(S, beat, t) {
    const B = S.BEAT, bi = beat % 8, ci = Math.floor(beat / 8) % 4, li = Math.floor(beat / 32) % 4, L = T1_LAYERS[li], ch = T1_CH[ci];
    if (bi === 0) {
      vPad(S, ch.pad, t, 8 * B + 0.4, 0.05 * L.pad, { bright: 1100 });
      vSub(S, ch.root, t, 8 * B);
      if (ci === 0) vImpact(S, t, li % 2 ? 0.35 : 0.5);
      driftDrone(S, ch.root - 12, t);
    }
    for (const [pos, idx] of T1_PAT) {
      if (Math.floor(pos) !== bi) continue;
      if (Math.random() < L.gtr * 0.92) {
        const m = ch.arp[(idx + (li === 3 ? 1 : 0)) % ch.arp.length];
        vGuitar(S, m, t + (pos - bi) * B, 0.085, { slide: Math.random() < 0.2 ? -2 : 0, pan: rnd(-0.25, 0.25) });
      }
    }
    if (L.drum > 0) {
      if (bi === 0 || bi === 4) vKick(S, t, 0.75 * L.drum, 1, 1.0);
      if (bi === 2 || bi === 6) vRim(S, t, 0.07 * L.drum);
      if (bi === 3 && Math.random() < 0.5) vRim(S, t + B * 0.5, 0.04 * L.drum);
      if (bi === 7 && li === 2) vKick(S, t + B * 0.5, 0.35, 0.8);
    }
    if (L.lead > 0 && beat >= S.melNext) {
      if (Math.random() < 0.65 * L.lead) {
        const m = wander(S, ch.mel), beats = pickOf([2, 3, 4]), dur = Math.min(beats, 8 - bi + 1) * B;
        vLead(S, m, t, dur, 0.04, 'harmonica'); S.melNext = beat + Math.ceil(dur / B) + pickOf([1, 2, 2, 3]);
      } else S.melNext = beat + pickOf([1, 2]);
    }
    if (bi === 5 && Math.random() < 0.22) vClank(S, t + rnd(0, B), 0.06);
  },
  tick(S, ahead) { crackleLoop(S, ahead, [0.8, 3.0], 0.35); }
};

/* 2. ПЕПЕЛ И ТИШИНА — разреженное пианино */
const T2_CH = [
  { root: 28, pad: [52, 59, 62, 66], pool: [64, 66, 67, 71, 74, 76, 69] },        // Em9
  { root: 29, pad: [53, 57, 60, 64], pool: [65, 69, 72, 64, 60, 76, 71] },        // Fmaj7
  { root: 36, pad: [55, 59, 64, 67], pool: [67, 71, 74, 64, 60, 72, 79] },        // Cmaj7
  { root: 26, pad: [50, 57, 60, 65], pool: [62, 65, 69, 72, 64, 74, 77] }         // Dm
];
const TRACK2 = {
  name: 'Пепел и тишина', mood: 'пианино над мёртвым городом', bpm: 50, lp: 7600, hp: 25, reverb: 1.15, fb: 0.46, dl: 1.5, dr: 2,
  setup(S) { windLayer(S, 0.8); droneLayer(S, 28 - 12, 0.32, ['sine', 'triangle']); S.melNext = 3; },
  beat(S, beat, t) {
    const B = S.BEAT, bi = beat % 8, ci = Math.floor(beat / 8) % 4, li = Math.floor(beat / 32) % 4, ch = T2_CH[ci];
    const dense = li === 1 || li === 2 ? 1 : 0.55;
    if (bi === 0) {
      vChoir(S, ch.pad.slice(0, 3), t, 8 * B + 0.5, 0.032 * (li === 3 ? 0.5 : 1));
      vPad(S, [ch.pad[0] - 12, ch.pad[1] - 12], t, 8 * B, 0.04, { type: 'triangle', bright: 700 });
      vSub(S, ch.root, t, 8 * B, 0.36);
      if (ci === 0) vImpact(S, t, 0.4);
    }
    if (bi % 2 === 0 || Math.random() < 0.2) {
      if (Math.random() < 0.36 * dense) {
        const m = pickOf(ch.pool);
        vPiano(S, m, t + rnd(0, 0.25), rnd(0.075, 0.11), rnd(-0.3, 0.3));
        if (Math.random() < 0.28) vPiano(S, m - pickOf([7, 12, 5]), t + rnd(0.25, 0.7), 0.06, rnd(-0.3, 0.3));
      }
    }
    if (bi === 0 && li !== 3) vPiano(S, ch.root + 24, t, 0.09, -0.1);
    if (beat >= S.melNext) {
      if (li === 2) {
        const m = wander(S, ch.pool), d = pickOf([4, 5, 6]) * B;
        vLead(S, m, t, d, 0.036, 'bow'); S.melNext = beat + Math.ceil(d / B) + 2;
      } else S.melNext = beat + 4;
    }
    if (beat % 32 === 28) vSwell(S, t, 4 * B, 0.14);
  },
  tick(S, ahead) { crackleLoop(S, ahead, [0.3, 2.0], 0.85); }
};

/* 3. СИРЕНА В ТУМАНЕ — индустриальный дрон */
const T3_CH = [
  { root: 30, pad: [42, 49, 54, 57], stab: [54, 57, 61] },
  { root: 31, pad: [43, 50, 55, 58], stab: [55, 58, 62] },
  { root: 30, pad: [42, 49, 54, 56], stab: [54, 56, 61] },
  { root: 28, pad: [40, 47, 52, 55], stab: [52, 55, 59] }
];
const TRACK3 = {
  name: 'Сирена в тумане', mood: 'гул заводов и далёкая тревога', bpm: 62, lp: 6800, hp: 28, reverb: 1.0, fb: 0.3,
  setup(S) {
    windLayer(S, 1.1); S.drone = droneLayer(S, 30 - 12, 0.34, ['sawtooth', 'sine', 'triangle']);
    S.hum = steadyNoise(S, 'pink', 120, 2.5, 0.12, S.droneBus);                                 // гул оборудования
  },
  beat(S, beat, t) {
    const B = S.BEAT, bi = beat % 8, ci = Math.floor(beat / 8) % 4, li = Math.floor(beat / 32) % 4, ch = T3_CH[ci];
    const active = li === 0 ? 0.4 : li === 3 ? 0.6 : 1;
    if (bi === 0) {
      vPad(S, ch.pad, t, 8 * B + 0.4, 0.05, { bright: 900 });
      vSub(S, ch.root, t, 8 * B, 0.4);
      driftDrone(S, ch.root - 12, t);
      if (ci === 0) vImpact(S, t, 0.55);
    }
    if (li > 0) vThump(S, ch.root, t, 0.3 * active, 0.45);                               // сердцебиение завода
    if (bi % 2 === 1 && li > 0) vHat(S, t + B * 0.5, 0.05 * active, 0.04);
    for (let h = 0; h < 2; h++) if (li > 0 && Math.random() < 0.55 * active) vHat(S, t + h * B * 0.5 + B * 0.25, rnd(0.015, 0.04), 0.025);
    if ((bi === 0 || bi === 3 || bi === 6) && li > 0 && Math.random() < 0.8 * active) vStab(S, ch.stab[(beat >> 1) % 3] - 12, t + (bi === 3 ? B * 0.5 : 0), 0.35, 0.05);
    if (bi === 4 && Math.random() < 0.65 * active) vClank(S, t + rnd(0, B), 0.12);
    if (bi === 6 && Math.random() < 0.3) vClank(S, t + rnd(0, B * 2), 0.08);
    if (beat % 32 === 12) vSiren(S, t, 12 * B, 0.018, pickOf([349, 392, 440]));          // сирена вдали
    if (beat % 32 === 28) vSwell(S, t, 4 * B, 0.16);
    if (S.hum) S.hum.gain.setTargetAtTime(0.08 + 0.1 * active, t, 3);
  },
  tick(S, ahead) { crackleLoop(S, ahead, [0.6, 3.0], 0.4); }
};

/* 4. ПОСЛЕДНИЙ МАРШ — маршевая дробь и медные */
const T4_CH = [
  { root: 36, pad: [48, 51, 55, 60], mel: [67, 70, 72, 75, 79, 74] },    // Cm
  { root: 32, pad: [44, 48, 51, 56], mel: [68, 72, 75, 77, 80, 70] },    // Ab
  { root: 39, pad: [51, 55, 58, 63], mel: [70, 74, 75, 79, 82, 67] },    // Eb
  { root: 34, pad: [46, 50, 53, 58], mel: [70, 72, 74, 77, 65, 79] }     // Bb
];
const T4_LAYERS = [{ drum: 0.45, brass: 0.4, snare: 0 }, { drum: 0.85, brass: 0.7, snare: 0.7 }, { drum: 1, brass: 1, snare: 1 }, { drum: 0.6, brass: 0.5, snare: 0.5 }];
const TRACK4 = {
  name: 'Последний марш', mood: 'барабаны на руинах', bpm: 88, lp: 9000, hp: 30, reverb: 0.95, fb: 0.28,
  setup(S) { windLayer(S, 1.0); S.drone = droneLayer(S, 36 - 24, 0.34, ['sine', 'triangle']); },
  beat(S, beat, t) {
    const B = S.BEAT, bi = beat % 8, ci = Math.floor(beat / 8) % 4, li = Math.floor(beat / 32) % 4, L = T4_LAYERS[li], ch = T4_CH[ci];
    if (bi === 0) {
      vPad(S, ch.pad, t, 8 * B + 0.4, 0.05 * L.brass + 0.02, { bright: 1700, type: 'sawtooth' });
      vSub(S, ch.root - 12, t, 8 * B, 0.4);
      if (ci === 0) vImpact(S, t, 0.6);
      driftDrone(S, ch.root - 24, t, 2.0);
    }
    // тимпани на 1 и 3, маршевая дробь малого барабана
    if (bi % 4 === 0) vKick(S, t, 0.9 * L.drum, 0.95, 1.2);
    if (bi % 4 === 2) vKick(S, t, 0.55 * L.drum, 1.15, 0.9);
    if (L.snare > 0) {
      const v = 0.07 * L.snare;
      vSnare(S, t, v * 1.3, { f: 2600, len: 0.12 });
      vSnare(S, t + B * 0.5, v * 0.55, { f: 2800, len: 0.07 });
      if (bi % 2 === 1) { vSnare(S, t + B * 0.75, v * 0.5, { f: 3000, len: 0.06 }); vSnare(S, t + B * 0.25, v * 0.35, { f: 3000, len: 0.05 }); }
      if (beat % 32 === 31) for (let k = 0; k < 8; k++) vSnare(S, t + k * B / 8, 0.03 + k * 0.012, { f: 2900, len: 0.07 });   // дробь
    } else if (bi % 2 === 0) vSnare(S, t + B * 0.5, 0.03, { f: 2400, len: 0.1 });
    // медная тема: длинные ноты
    if (beat >= S.melNext) {
      if (L.brass > 0.45 && Math.random() < 0.8) {
        const m = wander(S, ch.mel), beats = pickOf([2, 3, 4, 4]), dur = Math.min(beats, 8 - bi + 1) * B;
        vLead(S, m, t, dur, 0.05 * L.brass, 'brass');
        if (Math.random() < 0.5) vLead(S, m - 12, t + 0.03, dur, 0.035 * L.brass, 'brass');
        S.melNext = beat + Math.ceil(dur / B) + pickOf([0, 1, 1]);
      } else S.melNext = beat + 2;
    }
    if (bi === 5 && Math.random() < 0.25) vClank(S, t + rnd(0, B), 0.07);
    if (beat % 32 === 28) vSwell(S, t, 4 * B, 0.2);
  },
  tick(S, ahead) { crackleLoop(S, ahead, [1.0, 4.0], 0.25); }
};

/* 5. РАДИО ИЗ БУНКЕРА — вальс сквозь помехи (такт 3/4) */
const T5_CH = [
  { root: 29, bass: 41, up: [60, 65, 68], mel: [72, 75, 77, 80, 68, 70] },      // Fm
  { root: 25, bass: 37, up: [61, 65, 68], mel: [73, 77, 80, 68, 72, 65] },      // Db
  { root: 34, bass: 46, up: [62, 65, 70], mel: [74, 77, 70, 72, 82, 65] },      // Bbm
  { root: 36, bass: 36, up: [60, 64, 70], mel: [72, 76, 79, 70, 67, 64] }       // C7
];
const MORSE = [[1, 0, 1, 0], [1, 1, 0], [0, 1, 0, 1], [1, 0, 0, 1]];
const TRACK5 = {
  name: 'Радио из бункера', mood: 'старый вальс сквозь помехи', bpm: 96, lp: 3600, hp: 260, reverb: 0.6, fb: 0.3, dl: 1.5, dr: 3,
  setup(S) { S.hiss = steadyNoise(S, 'white', 3200, 0.4, 0.014, S.tickBus); windLayer(S, 0.5); S.melNext = 6; },
  beat(S, beat, t) {
    const B = S.BEAT, bi = beat % 6, ci = Math.floor(beat / 6) % 4, li = Math.floor(beat / 24) % 4, ch = T5_CH[ci];
    // вальс: бас на «раз», аккорд на «два-три»
    if (bi === 0) {
      vPluck(S, ch.bass, t, 0.16, { decay: 1.6, bright: 1200, wobble: 14, parts: [[1, 'sine', 1], [2, 'triangle', 0.3]], bus: S.droneBus });
      vSub(S, ch.root - 12, t, 5.5 * B, 0.28);
      if (ci === 0 && li !== 0) vPad(S, ch.up.map(m => m - 12), t, 24 * B, 0.025, { type: 'triangle', bright: 900 });
    }
    if (bi === 2 || bi === 4) ch.up.forEach((m, i) => vPluck(S, m, t + i * 0.012, 0.05, { decay: 1.1, bright: 2400, wobble: 18, pan: -0.2 + i * 0.2 }));
    // музыкальная шкатулка: мелодия
    if (beat >= S.melNext) {
      if (li !== 3 || Math.random() < 0.4) {
        const m = wander(S, ch.mel), d = pickOf([1, 2, 3]);
        vPluck(S, m, t, 0.085, { decay: 2.4, bright: 3800, wobble: 22, pan: rnd(-0.3, 0.3) });
        if (Math.random() < 0.35) vPluck(S, m + 12, t + B * 0.5, 0.04, { decay: 1.8, bright: 4200, wobble: 22 });
        S.melNext = beat + d + (Math.random() < 0.4 ? 1 : 0);
      } else S.melNext = beat + 2;
    }
    // помехи и морзянка
    if (bi === 0 && Math.random() < 0.22) vStatic(S, t + rnd(0, B * 2), rnd(0.15, 0.7), rnd(0.03, 0.07));
    if (beat % 24 === 20 && li !== 0) {
      const pat = pickOf(MORSE), f = pickOf([740, 880, 660]);
      pat.forEach((on, k) => { if (on) vBeep(S, t + k * B * 0.5, f, B * 0.28, 0.035); });
    }
    if (S.hiss) S.hiss.gain.setTargetAtTime(0.01 + (li === 2 ? 0.014 : 0.006) + Math.random() * 0.006, t, 0.5);
  },
  tick(S, ahead) { crackleLoop(S, ahead, [0.06, 0.35], 0.9); }          // виниловый треск
};

export const TRACKS = [TRACK1, TRACK2, TRACK3, TRACK4, TRACK5];

/* ------------------------------------------------------------
   Секвенсор и публичный API
   ------------------------------------------------------------ */
function tick() {
  const S = session; if (!S || !S.alive) return;
  const ac = S.ac;
  if (ac.state !== 'running') return;
  const ahead = ac.currentTime + 1.6;
  while (S.nextT < ahead) {
    if (S.nextT < ac.currentTime - 0.5) S.nextT = ac.currentTime + 0.05;
    try { S.T.beat(S, S.beat, S.nextT); } catch (e) { console.warn('music beat failed', e); }
    S.beat++; S.nextT += S.BEAT;
  }
  if (S.T.tick) S.T.tick(S, ahead);
}

function bindUnlock() {
  if (unlockBound) return; unlockBound = true;
  const h = () => { if (!wantPlay || !ctx) return; if (ctx.state !== 'running') ctx.resume().catch(() => {}); };
  for (const ev of ['pointerdown', 'keydown', 'touchend', 'mousedown']) addEventListener(ev, h, { capture: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) h(); });
}

// случайный трек, не равный предыдущему
function chooseTrack() {
  let i = Math.floor(Math.random() * TRACKS.length);
  if (TRACKS.length > 1 && i === lastTrack) i = (i + 1 + Math.floor(Math.random() * (TRACKS.length - 1))) % TRACKS.length;
  lastTrack = i; return i;
}

export const menuMusic = {
  onTrack: null,
  tracks: TRACKS,
  get playing() { return !!session && session.alive; },
  get current() { return session && session.alive ? session.T : null; },
  start() {
    wantPlay = true; bindUnlock();
    if (session && session.alive) {
      const t = ctx.currentTime; session.out.gain.cancelScheduledValues(t); session.out.gain.setValueAtTime(session.out.gain.value, t); session.out.gain.linearRampToValueAtTime(1, t + 1.5);
      if (session.stopTimer) { clearTimeout(session.stopTimer); session.stopTimer = 0; }
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      return;
    }
    const ac = ensureCtx(); if (!ac) return;
    const T = TRACKS[chooseTrack()];
    try { session = createSession(ac, T); } catch (e) { console.warn('music init failed', e); session = null; return; }
    session.timer = setInterval(tick, 110);
    if (ac.state !== 'running') ac.resume().catch(() => {});
    if (menuMusic.onTrack) menuMusic.onTrack(T);
    tick();
  },
  stop(fade = 1.6) {
    wantPlay = false;
    const S = session; if (!S || !S.alive) return;
    const ac = S.ac, t = ac.currentTime;
    S.out.gain.cancelScheduledValues(t); S.out.gain.setValueAtTime(S.out.gain.value, t); S.out.gain.linearRampToValueAtTime(0, t + fade);
    clearInterval(S.timer);
    S.stopTimer = setTimeout(() => {
      S.alive = false;
      for (const n of S.persistent) { try { n.stop(); } catch (e) {} }
      try { S.vol.disconnect(); } catch (e) {}
      if (session === S) session = null;
    }, fade * 1000 + 150);
    S.alive = false;     // следующий start() построит свежий граф и выберет новый случайный трек
  },
  setVolume(v) {
    volume = v;
    if (session && session.vol) session.vol.gain.setTargetAtTime(v, session.ac.currentTime, 0.05);
  }
};
