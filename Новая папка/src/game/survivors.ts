// @ts-nocheck
/* ============================================================
   ВЫЖИВШИЕ ЗА СТОЛОМ В ЛАВКЕ
   В лавке торговца за столом сидят 1–2 выживших. С ними можно поговорить, выменять ресурсы (у них дешевле, чем у
   торговца, но выбор меньше и товара мало) и взять задание. Задание сдаётся торговцу (вкладка «Задания» в лавке).
   ============================================================ */
import * as THREE from 'three';
import { S } from './bunkerProps';
import { SUPPLIES, VALUE } from './shop';
import { MAX_ACTIVE_QUESTS, ensureQuests, rollQuest, questTitle, questState } from './quests';

const mb = (g, w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
const ball = (g, mat, r, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
const cylY = (g, mat, rt, rb, h, x, y, z, seg = 14) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); g.add(m); return m; };
function limb(g, a, b, r1, r2, mat) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = va.distanceTo(vb);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 10), mat);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.add(m); return m;
}
const pick = a => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- Модель сидящего выжившего ----------
   Начало координат — на полу под центром сиденья, лицом к +Z. Сиденье стула — на высоте ~0.5, стол — 0.77. */
export function buildSurvivor(look) {
  const root = new THREE.Group();
  const jacket = S(look.jacket, 0.92, 0.03), jacketD = S(look.jacketD || 0x2b2b27, 0.92, 0.03), pants = S(look.pants, 0.9, 0), skin = S(look.skin, 0.78, 0);
  const boots = S(0x2a1d14, 0.85, 0.05), hairM = S(look.hair, 0.9, 0), dark = S(0x1c1a17, 0.9, 0), glove = S(0x1e1e1c, 0.85, 0);

  for (const s of [-1, 1]) {
    const x = s * 0.1;
    mb(root, 0.15, 0.15, 0.46, pants, x, 0.6, 0.2);        // бедро
    mb(root, 0.14, 0.5, 0.14, pants, x, 0.27, 0.43);       // голень
    mb(root, 0.15, 0.09, 0.28, boots, x, 0.045, 0.53);     // ботинок
  }
  const body = new THREE.Group(); body.position.set(0, 0.52, -0.03); root.add(body);
  mb(body, 0.4, 0.54, 0.25, jacket, 0, 0.27, 0);
  mb(body, 0.42, 0.07, 0.27, dark, 0, 0.03, 0);            // ремень
  mb(body, 0.43, 0.1, 0.26, jacketD, 0, 0.5, 0);           // плечи
  if (look.vest) { mb(body, 0.42, 0.34, 0.28, S(0x4a5a3a, 0.9, 0.02), 0, 0.3, 0.01); for (const x of [-0.1, 0.1]) mb(body, 0.1, 0.1, 0.05, jacketD, x, 0.26, 0.15); }
  if (look.scarf) { cylY(body, S(look.scarf, 0.95, 0), 0.12, 0.14, 0.1, 0, 0.58, 0.01); mb(body, 0.1, 0.22, 0.03, S(look.scarf, 0.95, 0), 0.05, 0.42, 0.14); }
  if (look.pack) mb(body, 0.34, 0.4, 0.14, S(0x4a4331, 0.92, 0), 0, 0.3, -0.19);   // рюкзак за спиной (между спиной и спинкой стула)

  // руки: плечо → локоть → кисть на столе
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = [s * 0.25, 0.47, 0], el = [s * 0.28, 0.14, 0.13], hd = [s * 0.17, 0.31, 0.52];
    limb(body, sh, el, 0.065, 0.055, jacket); ball(body, jacket, 0.058, ...el);
    limb(body, el, hd, 0.055, 0.045, jacket); ball(body, glove, 0.05, hd[0], hd[1], hd[2], 1, 0.8, 1.15);
    arms.push(hd);
  }
  // кружка в руках у одного из выживших
  if (look.mug) { cylY(body, S(look.mug, 0.6, 0.1), 0.045, 0.04, 0.1, -0.17, 0.38, 0.5, 12); }

  // голова
  const head = new THREE.Group(); head.position.set(0, 0.74, 0.02); body.add(head);
  ball(head, skin, 0.125, 0, 0, 0, 1, 1.12, 1.02);
  cylY(head, skin, 0.05, 0.06, 0.1, 0, -0.14, 0, 10);
  const white = S(0xf2eee6, 0.3, 0), pupil = S(0x15100c, 0.2, 0);
  for (const s of [-1, 1]) { ball(head, white, 0.017, s * 0.045, 0.02, 0.113, 1, 0.85, 0.6); ball(head, pupil, 0.009, s * 0.045, 0.02, 0.124, 1, 1, 0.6); mb(head, 0.05, 0.011, 0.014, hairM, s * 0.047, 0.065, 0.113); ball(head, skin, 0.022, s * 0.124, 0, 0, 0.6, 1.2, 1); }
  ball(head, skin, 0.024, 0, -0.015, 0.123, 0.8, 1.15, 1.2);
  mb(head, 0.05, 0.009, 0.012, S(0x7d3a30, 0.6, 0), 0, -0.07, 0.115);
  if (look.beard) ball(head, hairM, 0.1, 0, -0.065, 0.03, 1, 0.8, 0.95);
  if (look.hat === 'cap') {
    const c = ball(head, S(look.hatC, 0.9, 0), 0.13, 0, 0.04, -0.005, 1, 0.8, 1.04); c.scale.y = 0.75;
    mb(head, 0.2, 0.014, 0.12, S(look.hatC, 0.9, 0), 0, 0.045, 0.13);
  } else if (look.hat === 'beanie') {
    ball(head, S(look.hatC, 1, 0), 0.134, 0, 0.05, -0.005, 1, 0.85, 1.04);
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 20), S(look.hatC, 1, 0)); t.rotation.x = Math.PI / 2; t.position.set(0, 0.035, 0); head.add(t);
  } else if (look.hat === 'hood') {
    ball(head, jacketD, 0.15, 0, 0.0, -0.03, 1, 1.12, 1.08);
    mb(head, 0.2, 0.2, 0.01, S(0x15130f, 1, 0), 0, 0, 0.115);
    ball(head, skin, 0.1, 0, -0.015, 0.045, 0.95, 1.05, 0.7);
  } else if (look.hat === 'bandana') {
    cylY(head, S(look.hatC, 1, 0), 0.128, 0.128, 0.05, 0, 0.08, 0, 18);
    ball(head, hairM, 0.12, 0, 0.0, -0.045, 1, 1.08, 0.92);
  } else ball(head, hairM, 0.128, 0, 0.035, -0.03, 1, 0.9, 1.0);
  if (look.glasses) { const gm = S(0x1d1f20, 0.5, 0.4); mb(head, 0.22, 0.012, 0.012, gm, 0, 0.025, 0.125); for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 14), gm); r.position.set(s * 0.05, 0.022, 0.127); head.add(r); } }

  root.userData.head = head; root.userData.body = body;
  root.userData.phase = Math.random() * 6;
  const wp = new THREE.Vector3();
  root.userData.update = (time, px, pz) => {
    const ph = root.userData.phase;
    body.scale.y = 1 + 0.01 * Math.sin(time * 1.5 + ph);
    root.getWorldPosition(wp);
    const want = Math.atan2(px - wp.x, pz - wp.z) - root.rotation.y;
    const d = ((want + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    const near = Math.hypot(px - wp.x, pz - wp.z) < 5;
    const target = near ? Math.max(-0.9, Math.min(0.9, d)) * 0.9 : Math.sin(time * 0.4 + ph) * 0.15;
    head.rotation.y += (target - head.rotation.y) * 0.07;
    head.rotation.x = 0.05 + Math.sin(time * 0.9 + ph) * 0.02 + (near ? 0.03 : 0.08);
  };
  return root;
}

/* ---------- Выжившие: кто они, что говорят, чем торгуют ---------- */
const PEOPLE = [
  { name: 'Гена', role: 'бывший слесарь', bio: 'Двадцать лет чинил вентиляцию в третьем секторе. Теперь чиню себя. Руки помнят всё, а голова — не всё.' },
  { name: 'Марфа', role: 'медсестра', bio: 'Работала в медпункте сети. Когда началось, успела вынести пару ящиков бинтов. Сейчас делюсь по-честному.' },
  { name: 'Степаныч', role: 'сторож', bio: 'Сторожил этот коридор ещё до того, как он стал «зоной». Дверей знаю больше, чем людей.' },
  { name: 'Лёха', role: 'бывший охотник', bio: 'Ходил на поверхность за дичью. Теперь охочусь на то, что вылезает из стен. Дичь, надо сказать, стала хуже.' },
  { name: 'Тоня', role: 'повар из столовой', bio: 'Кормила пол-сети. Теперь кормлю себя консервами и иногда — таких, как ты.' },
  { name: 'Витя', role: 'связист', bio: 'Сидел на радио. Эфир молчит третий год, но привычка слушать осталась. Слышу, как они ходят под полом.' },
  { name: 'Борис', role: 'механик генераторной', bio: 'Если в сети ещё где-то горит свет — это моя заслуга. Ну или чья-то ещё. Но скорее моя.' },
  { name: 'Зина', role: 'кладовщица', bio: 'Всё считаю, всё записываю. Что принёс, что унёс. У меня каждая банка на счету.' },
  { name: 'Кирилл', role: 'студент-практикант', bio: 'Приехал на практику за неделю до всего этого. Практика затянулась.' },
  { name: 'Клава', role: 'бывшая уборщица', bio: 'Мыла эти полы тридцать лет. Знаю каждую плитку. И каждый закоулок, где они прячутся.' }
];
const LOOKS = [
  { jacket: 0x4a5a3a, jacketD: 0x2f3a26, pants: 0x3a3d3a, hat: 'cap', hatC: 0x6b5a2e, vest: true, beard: true },
  { jacket: 0x7a3a30, jacketD: 0x4a221c, pants: 0x2b2f3a, hat: 'beanie', hatC: 0x2f4f7f, scarf: 0xd0c8b0 },
  { jacket: 0x5a4d3a, jacketD: 0x352d22, pants: 0x2a2d2b, hat: 'hood', pack: true },
  { jacket: 0x3d4a5a, jacketD: 0x262f3a, pants: 0x4a4638, hat: 'bandana', hatC: 0xa8372c, beard: true, glasses: true },
  { jacket: 0x6a6a5a, jacketD: 0x3e3e33, pants: 0x34322d, hat: 'none', scarf: 0xb4561d, mug: 0xe8e4d8 },
  { jacket: 0x2f3a3a, jacketD: 0x1d2626, pants: 0x403a2e, hat: 'cap', hatC: 0x23282c, glasses: true, pack: true },
  { jacket: 0x8a6d3a, jacketD: 0x4e3d20, pants: 0x30322e, hat: 'beanie', hatC: 0x7a2b22, beard: true, mug: 0x4b78a8 }
];
const SKINS = [0xc79a76, 0xd6a47f, 0xb98a68, 0xe0b090, 0x9a7050];
const HAIRS = [0x2a1d16, 0x4a3524, 0x8a8a84, 0x1b1b1b, 0x6a4a2a];

const GREETS = [
  '«А, живой человек. Садись, не бойся — они сюда не заходят.»',
  '«Тише, не топай. Хотя… здесь можно. Здесь стены толстые.»',
  '«Торговца видел? Он дерёт втридорога. У меня — подешевле, но и добра мало.»',
  '«Присаживайся. Чай не предлагаю — нет чая. Зато есть разговор.»',
  '«Ты из тех, кто ходит по сетям? Тогда у нас найдётся о чём поговорить.»'
];
const RUMORS = [
  'Говорят, в больших сетях встречаются убежища, где хозяева так и не вернулись. Запасы там нетронутые.',
  'Слышал, пауки собираются там, где темно и пахнет мясом. Фонарь экономь — но и в темноте не лезь.',
  'Громилы почти не слышат, зато бьют так, что бронежилет — как бумага. Заходи с дубинкой: током их хорошо глушит.',
  'Свиньи в сети — это не шутка. Молодые бегают быстрее тебя, а матёрые не останавливаются, пока не упадут.',
  'Один парень рассказывал: в армейских шкафчиках бывает снаряжение. Только замки там крепкие — без отмычек не суйся.',
  'Подрывников лучше убивать издалека. Вблизи они разлетаются так, что мало не покажется.',
  'Торговец у нас один на всю сеть, а лавки у него — везде. Как он это делает — не спрашивай.',
  'Кислотники плюются на десять шагов. Если услышал бульканье — прячься за угол.'
];
const TIPS = [
  'Присядь — шаги почти не слышны. Бывшие реагируют на шум, а не на свет.',
  'Не носись без нужды. Выдохнешься — станешь мишенью. Лучше медленно, но тихо.',
  'Внутрь убежищ и лавок они не ходят. Если прижало — ныряй в ближайшую дверь и переводи дух.',
  'Сейфы открывает только карта доступа, отмычкой их не взять. А шкафчикам хватит отмычки.',
  'Катана рубит до троих за взмах, а если враг тебя не заметил — убивает с одного удара.',
  'Оптика на «Винторезе» и «Абакане» работает по-настоящему: ПКМ — и смотришь через неё. Но бегом с прицелом не побегаешь.',
  'Порох — самое дорогое. Без него ни патронов, ни сделки. Не продавай его за бесценок.',
  'Перед выходом проверь, сколько ячеек в рюкзаке. Пустой рюкзак с трофеями — это тоже потеря.'
];
const TRADER = [
  '«Торговец? Знаю его давно. Не дурак, но с ним хоть торгуйся, хоть нет — цена одна.»',
  '«У него товара — завались, а у меня только то, что сам не доел. Зато я беру меньше.»',
  '«Задание выполнил? Отнеси ему — он расплатится от моего имени. Мы так договорились.»'
];

// у выжившего ходовые припасы и боеприпасы (без редких аптечек и карт); в лавке цена — за вычетом скидки
const SV_DISCOUNT = 0.6;
const SV_FEE = 0.9;       // при обмене — комиссия всего 10% (у торговца 25%)
const BASE_STOCK = SUPPLIES.filter(o => !o.rare);

export function rollSurvivors(count, day, activeKeys = []) {
  const people = shuffle(PEOPLE.slice()).slice(0, count), looks = shuffle(LOOKS.slice());
  const used = [...activeKeys], out = [];
  people.forEach((p, i) => {
    const look = { ...looks[i % looks.length], skin: pick(SKINS), hair: pick(HAIRS) };
    // товар: всего 3–5 видов из обычных, и по 1–2 «порции» каждого — заметно меньше, чем у торговца
    const stock = {};
    for (const o of shuffle(BASE_STOCK.slice()).slice(0, ri(3, 5))) stock[o.id] = o.n * ri(1, 2);
    const quest = rollQuest(day, p.name, used);
    if (quest) used.push(quest.key);
    out.push({ id: 'sv' + i, name: p.name, role: p.role, bio: p.bio, look, stock, quest, seed: Math.random(), met: false });
  });
  return out;
}

/* ---------- Экран разговора ---------- */
export function createTalk(api) {
  const $ = id => document.getElementById(id);
  let sv = null, tab = 'talk', open = false, say = '', flash = '', giveId = null, giveN = 1;

  const ITEMS = () => api.ITEMS, bag = () => api.bag();
  const have = id => api.countIn(bag(), id);
  const nm = id => ITEMS()[id].name;
  const chip = (id, n, lack) => `<span class="shop-chip ${lack ? 'lack' : ''}" title="${nm(id)}">${ITEMS()[id].icon}<b>${n}</b> <i>${nm(id)}</i></span>`;
  const costHTML = cost => Object.entries(cost).map(([id, n]) => chip(id, n, have(id) < n)).join('');
  const canPay = cost => Object.entries(cost).every(([id, n]) => have(id) >= n);
  const priceOf = o => Object.fromEntries(Object.entries(o.cost).map(([id, n]) => [id, Math.max(1, Math.round(n * SV_DISCOUNT))]));
  const traderPrice = o => o.cost;

  function trade(cost, give) {
    for (const [id, n] of Object.entries(cost)) if (have(id) < n) { fail(`Не хватает: ${nm(id)} ×${n - have(id)}`); return false; }
    const sim = bag().map(s => ({ ...s }));
    for (const [id, n] of Object.entries(cost)) api.removeFrom(sim, id, n);
    for (const [id, n] of give) if (api.addTo(sim, api.cap(), id, n) > 0) { fail('Рюкзак полон — освободите ячейки (Tab)'); return false; }
    for (const [id, n] of Object.entries(cost)) api.removeFrom(bag(), id, n);
    for (const [id, n] of give) api.addTo(bag(), api.cap(), id, n);
    api.changed(); return true;
  }
  function fail(msg) { api.sfx.empty(); flash = '⚠ ' + msg; render(); }

  const stockLeft = () => Object.values(sv.stock).reduce((a, b) => a + b, 0);

  function buy(i) {
    const o = BASE_STOCK[i], left = sv.stock[o.id] || 0;
    if (left < o.n) { fail('Этого у меня больше нет'); return; }
    if (!trade(priceOf(o), [[o.id, o.n]])) return;
    sv.stock[o.id] -= o.n; if (sv.stock[o.id] <= 0) delete sv.stock[o.id];
    api.sfx.pick(); flash = `Куплено: ${nm(o.id)} ×${o.n}. «Бери-бери, мне меньше таскать.»`; render();
  }
  const getAmount = (target, gid = giveId, gn = giveN) => Math.min(sv.stock[target] || 0, Math.floor(gn * VALUE[gid] * SV_FEE / VALUE[target]));
  function exchange(target) {
    if (!giveId || giveN <= 0) return;
    const n = getAmount(target); if (n < 1) { fail('За такое количество я ничего не дам — добавь ещё'); return; }
    // сколько нужно отдать за n штук (если у выжившего меньше — берём только необходимое)
    let need = giveN;
    while (need > 1 && Math.floor((need - 1) * VALUE[giveId] * SV_FEE / VALUE[target]) >= n) need--;
    if (!trade({ [giveId]: need }, [[target, n]])) return;
    sv.stock[target] -= n; if (sv.stock[target] <= 0) delete sv.stock[target];
    api.sfx.pick();
    flash = `Обмен: ${nm(giveId)} ×${need} → ${nm(target)} ×${n}. «По рукам.»`;
    if (have(giveId) <= 0) giveId = null; else giveN = Math.min(giveN, have(giveId));
    render();
  }
  function takeQuest() {
    const Q = ensureQuests(api.save);
    if (!sv.quest) return;
    if (Q.active.length >= MAX_ACTIVE_QUESTS) { fail(`У тебя уже ${MAX_ACTIVE_QUESTS} задания. Сдай хотя бы одно торговцу`); return; }
    const q = sv.quest; q.uid = Q.uid++; q.got = 0; Q.active.push(q); sv.quest = null;
    api.store(); api.sfx.pick(); api.toast('📜 Взято задание: ' + questTitle(q, ITEMS()) + ' — сдайте торговцу', 'good');
    flash = '«Договорились. Закончишь — иди к торговцу, он выдаст награду.»'; render();
  }

  /* ---------- вкладки ---------- */
  function talkHTML() {
    const topics = [['who', 'Кто ты такой?'], ['rumor', 'Что слышно в сети?'], ['tip', 'Дай совет'], ['trader', 'Что за торговец?']];
    return `<div class="talk-bio"><b>${sv.name}</b> · ${sv.role}</div>
      <div class="talk-say">${say}</div>
      <div class="talk-topics">${topics.map(([k, t]) => `<button class="btn sm" data-act="topic" data-k="${k}">💬 ${t}</button>`).join('')}</div>
      <p class="text-[11px] text-white/45 mt-3">У выжившего можно <b>выменять ресурсы дешевле</b>, чем у торговца (но выбор небольшой), и <b>взять задание</b>. Выполненное задание сдают <b>торговцу</b>.</p>`;
  }
  function buyHTML() {
    const rows = BASE_STOCK.map((o, i) => ({ o, i, left: sv.stock[o.id] || 0 })).filter(r => r.left > 0);
    if (!rows.length) return '<p class="text-white/60 text-sm p-3">«Всё раздал. Заходи в другой раз — когда найду что-нибудь ещё.»</p>';
    return `<div class="text-xs text-white/55 mb-2">У выжившего осталось немного: цены ниже, чем у торговца (−${Math.round((1 - SV_DISCOUNT) * 100)}%).</div><div class="shop-list">${rows.map(({ o, i, left }) => {
      const d = ITEMS()[o.id], pr = priceOf(o), ok = canPay(pr) && left >= o.n;
      return `<div class="shop-row">
        <div class="shop-ico">${d.icon}</div>
        <div class="shop-info"><b>${d.name} ×${o.n}</b> <span class="shop-tag">осталось: ${left}</span><div class="shop-sub">у торговца: ${Object.entries(traderPrice(o)).map(([id, n]) => `${n} ${nm(id).toLowerCase()}`).join(', ')}</div></div>
        <div class="shop-cost">${costHTML(pr)}</div>
        <button class="btn sm ${ok ? 'main' : ''}" data-act="buy" data-i="${i}" ${left < o.n ? 'disabled' : ''}>Купить</button>
      </div>`;
    }).join('')}</div>`;
  }
  function swapHTML() {
    const mine = bag().filter(s => VALUE[s.id] != null && s.id !== 'note' && s.id !== 'key').reduce((m, s) => (m[s.id] = (m[s.id] || 0) + s.n, m), {});
    const ids = Object.keys(mine);
    if (giveId && !mine[giveId]) giveId = null;
    if (giveId) giveN = Math.max(1, Math.min(giveN, mine[giveId]));
    const left = ids.length ? ids.map(id => `<button class="shop-give ${id === giveId ? 'on' : ''}" data-act="give" data-id="${id}">${ITEMS()[id].icon}<b>${mine[id]}</b><i>${nm(id)}</i></button>`).join('') : '<p class="text-white/55 text-sm">В рюкзаке нечего предложить.</p>';
    let right = '<p class="text-white/55 text-sm p-2">← Выбери, что отдать.</p>';
    if (giveId) {
      const targets = Object.keys(sv.stock).filter(t => t !== giveId && VALUE[t] != null && ITEMS()[t]);
      right = `<div class="shop-qty">Отдать: <button class="btn sm" data-act="qty" data-d="-5">−5</button><button class="btn sm" data-act="qty" data-d="-1">−1</button><b>${giveN}</b> × ${nm(giveId)}<button class="btn sm" data-act="qty" data-d="1">+1</button><button class="btn sm" data-act="qty" data-d="5">+5</button><button class="btn sm" data-act="qty" data-d="999">Все</button></div>
        <div class="shop-targets">${targets.length ? targets.map(t => {
          const n = getAmount(t), can = n >= 1;
          return `<button class="shop-tgt ${can ? '' : 'no'}" data-act="exch" data-id="${t}" ${can ? '' : 'disabled'}>${ITEMS()[t].icon}<span>${nm(t)} <small>(есть ${sv.stock[t]})</small></span><b>${can ? '×' + n : '—'}</b></button>`;
        }).join('') : '<p class="text-white/55 text-sm">Выжившему нечего дать взамен.</p>'}</div>
        <p class="text-[11px] text-white/45 mt-2">Комиссия всего ${Math.round((1 - SV_FEE) * 100)}% (у торговца — 25%), но менять можно только на то, что у выжившего есть, и не больше, чем он может отдать.</p>`;
    }
    return `<div class="shop-ex"><div class="shop-exl"><div class="text-xs text-white/55 mb-1.5">Твой рюкзак — что отдать:</div><div class="shop-gives">${left}</div></div><div class="shop-exr"><div class="text-xs text-white/55 mb-1.5">Что получить:</div>${right}</div></div>`;
  }
  function questHTML() {
    const Q = ensureQuests(api.save);
    let html = '';
    if (sv.quest) {
      const q = sv.quest;
      html += `<div class="quest-card offer"><div class="quest-h">📜 ${q.kind === 'fetch' ? 'Принести' : 'Охота'} — предложение</div>
        <div class="quest-say">«${q.say}»</div>
        <div class="quest-task"><b>${questTitle(q, ITEMS())}</b></div>
        <div class="quest-rew"><span class="text-white/55 text-xs">Награда:</span> <span class="shop-cost">${q.reward.map(([id, n]) => chip(id, n, false)).join('')}</span></div>
        <div class="text-[11px] text-white/45 mt-1">Сдать выполненное задание нужно у торговца (вкладка «Задания»).</div>
        <button class="btn sm main mt-2" data-act="take">✔ Взять задание</button></div>`;
    } else html += '<p class="text-white/60 text-sm p-2">«Для тебя у меня больше ничего нет. Загляни позже.»</p>';
    html += `<div class="text-xs text-white/55 mt-3 mb-1">Твои задания (${Q.active.length}/${MAX_ACTIVE_QUESTS}):</div>`;
    html += Q.active.length ? Q.active.map(q => { const st = questState(q, have); return `<div class="quest-card"><div class="quest-h">${questTitle(q, ITEMS())}</div><div class="quest-bar"><i style="width:${st.cur / st.need * 100}%"></i></div><div class="text-[11px] text-white/55">${st.cur}/${st.need}${st.ready ? ' — <b class="text-emerald-300">готово, сдай торговцу</b>' : ''} · от: ${q.giver}</div></div>`; }).join('') : '<p class="text-white/45 text-xs">Пока заданий нет.</p>';
    return html;
  }

  function render() {
    const body = $('talkBody'); if (!body || !sv) return;
    $('talkTitle').innerHTML = `🧑 ${sv.name} <span class="talk-role">· ${sv.role}</span>`;
    $('talkBag').textContent = `Рюкзак: ${bag().length} / ${api.cap()} ячеек`;
    const g = $('talkGreet'); g.textContent = flash || say; g.classList.toggle('bad', flash.startsWith('⚠'));
    document.querySelectorAll('#scr-talk [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const qn = $('talkQn'); if (qn) qn.textContent = sv.quest ? '●' : '';
    body.innerHTML = tab === 'talk' ? talkHTML() : tab === 'buy' ? buyHTML() : tab === 'swap' ? swapHTML() : questHTML();
  }

  const root = $('scr-talk');
  if (root) root.addEventListener('click', e => {
    const b = e.target.closest('[data-act],[data-tab]'); if (!b || !open) return;
    if (b.dataset.tab) { tab = b.dataset.tab; flash = ''; api.sfx.click(); render(); return; }
    const a = b.dataset.act;
    if (a === 'close') api.close();
    else if (a === 'topic') {
      const k = b.dataset.k; api.sfx.click(); flash = '';
      say = k === 'who' ? '«' + sv.bio + '»' : k === 'rumor' ? '«' + pick(RUMORS) + '»' : k === 'tip' ? '«' + pick(TIPS) + '»' : pick(TRADER);
      render();
    }
    else if (a === 'buy') buy(+b.dataset.i);
    else if (a === 'give') { giveId = b.dataset.id; giveN = 1; api.sfx.click(); render(); }
    else if (a === 'qty') { giveN = Math.max(1, Math.min(have(giveId), giveN + (+b.dataset.d))); api.sfx.click(); render(); }
    else if (a === 'exch') exchange(b.dataset.id);
    else if (a === 'take') takeQuest();
  });
  return {
    isOpen: () => open,
    open(s) {
      sv = s; open = true; tab = 'talk'; giveId = null; giveN = 1; flash = '';
      say = s.met ? '«Опять ты. Чего хотел?»' : pick(GREETS); s.met = true;
      api.show('scr-talk'); render();
    },
    close() { open = false; api.show('scr-talk', false); },
    refresh() { if (open) render(); }
  };
}
