// @ts-nocheck
/* ============================================================
   ЗАДАНИЯ ВЫЖИВШИХ
   Выжившие, что сидят в лавке за столом, дают поручения. Взятое задание хранится в сохранении (save.quests) и переживает
   вылазки; сдать его можно у ТОРГОВЦА — в любой лавке, вкладка «Задания».
   • fetch — принести n штук ресурса (забираются из рюкзака при сдаче);
   • hunt  — убить n Бывших (все или определённого вида); счётчик ведётся на вылазках.
   ============================================================ */

export const MAX_ACTIVE_QUESTS = 3;

// ценность единицы (для расчёта награды)
const QVAL = { scrap: 1, wood: 1, cable: 1, band: 2, food: 2, powder: 2, batt: 2, pick: 1.5, water: 1.5, caffeine: 1.5, meds: 5, ammo: 0.45, ammoK: 0.6, ammoV: 0.7, ammoR: 0.85, shells: 0.7 };

// что просят принести: id, диапазон количества, минимальный день
const FETCH = [
  { id: 'scrap', n: [8, 14], d: 1, say: 'Мне нужен металлолом — латаю дверь и верстак.' },
  { id: 'wood', n: [4, 7], d: 1, say: 'Печка гаснет. Древесина у тебя найдётся?' },
  { id: 'band', n: [3, 5], d: 1, say: 'Бинты кончились. Принеси, я в долгу не останусь.' },
  { id: 'food', n: [3, 4], d: 1, say: 'Третий день на одних сухарях. Консервы нужны.' },
  { id: 'powder', n: [3, 5], d: 1, say: 'Порох. Сам знаешь, зачем. Банки хватит три-четыре.' },
  { id: 'batt', n: [2, 3], d: 2, say: 'Фонарь сдох. Батареи — на вес золота.' },
  { id: 'cable', n: [2, 4], d: 2, say: 'Генератор барахлит, нужен кабель.' },
  { id: 'water', n: [2, 3], d: 2, say: 'Вода. Чистая, из столовой. Пара бутылок.' },
  { id: 'caffeine', n: [2, 3], d: 3, say: 'Не спал двое суток. Кофеин — вот что меня спасёт.' },
  { id: 'meds', n: [1, 2], d: 3, say: 'Брат ранен. Нужна аптечка — настоящая.' },
  { id: 'pick', n: [2, 3], d: 2, say: 'Шкафчики не открываются, а отмычки сломались.' }
];
// на кого охота: монстр (или 'any'), родительный падеж множ. числа, диапазон, минимальный день
const HUNT = [
  { mon: 'any', gen: 'Бывших', n: [4, 7], d: 1, say: 'Они ходят под дверью каждую ночь. Проредите стаю.' },
  { mon: 'walker', gen: 'Бродяг', n: [3, 5], d: 1, say: 'Бродяги забрели к моему шлюзу. Убери их.' },
  { mon: 'spider', gen: 'пауков-мутантов', n: [3, 5], d: 1, say: 'Пауки в вентиляции. Ненавижу пауков.' },
  { mon: 'rat', gen: 'крыс-мутантов', n: [4, 7], d: 2, say: 'Крысы грызут запасы. Перебей их.' },
  { mon: 'runner', gen: 'Бегунов', n: [2, 4], d: 3, say: 'Бегуны — худшее. Не успеешь оглянуться. Убей хоть пару.' },
  { mon: 'spitter', gen: 'Кислотников', n: [1, 3], d: 3, say: 'Кислотники сожгли мне полкоридора. Отомсти.' },
  { mon: 'bloater', gen: 'Подрывников', n: [1, 2], d: 4, say: 'Подрывник лежит у моей двери. Сделай так, чтобы он не взорвался.' },
  { mon: 'brute', gen: 'Громил', n: [1, 1], d: 5, say: 'Громила. Один. Но если справишься — заплачу втройне.' }
];
const REWARD_POOL = ['scrap', 'batt', 'powder', 'band', 'meds', 'pick', 'food', 'ammo', 'ammoK', 'shells'];

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];

export function ensureQuests(save) {
  const q = save.quests;
  if (!q || typeof q !== 'object') save.quests = { active: [], done: 0, uid: 1 };
  else {
    if (!Array.isArray(q.active)) q.active = [];
    q.active = q.active.filter(x => x && (x.kind === 'fetch' || x.kind === 'hunt') && x.n > 0 && Array.isArray(x.reward));
    if (typeof q.done !== 'number') q.done = 0;
    if (typeof q.uid !== 'number') q.uid = 1;
  }
  return save.quests;
}

/** Придумать задание. Награда зависит от сложности; награда — ресурсами (1–2 вида). */
export function rollQuest(day, giver, avoidKeys = []) {
  const hunt = Math.random() < 0.45;
  const pool = (hunt ? HUNT : FETCH).filter(t => t.d <= Math.max(1, day) && !avoidKeys.includes(hunt ? 'h:' + t.mon : 'f:' + t.id));
  if (!pool.length) return null;
  const t = pick(pool), n = ri(t.n[0], t.n[1]);
  const worth = hunt ? n * (t.mon === 'brute' ? 16 : t.mon === 'bloater' || t.mon === 'spitter' ? 9 : t.mon === 'runner' ? 7 : 4.5) + 4 : n * QVAL[t.id] * 1.5 + 3;
  const reward = [];
  const first = pick(REWARD_POOL.filter(r => hunt || r !== t.id));
  let v = worth;
  // основной приз — примерно 70% ценности, второй — остаток
  const n1 = Math.max(1, Math.round(v * 0.7 / QVAL[first])); reward.push([first, Math.min(n1, 10)]);
  v -= reward[0][1] * QVAL[first];
  if (v >= 2 && Math.random() < 0.7) {
    const second = pick(REWARD_POOL.filter(r => r !== first && (hunt || r !== t.id)));
    const n2 = Math.max(1, Math.round(v / QVAL[second])); reward.push([second, Math.min(n2, 8)]);
  }
  return {
    uid: 0, kind: hunt ? 'hunt' : 'fetch', item: hunt ? null : t.id, mon: hunt ? t.mon : null, gen: hunt ? t.gen : null,
    n, got: 0, reward, giver, say: t.say, key: hunt ? 'h:' + t.mon : 'f:' + t.id
  };
}

export const questTitle = (q, ITEMS) => q.kind === 'fetch'
  ? `Принести: ${ITEMS[q.item].name} ×${q.n}`
  : `Убить ${q.gen}: ${q.n}`;

/** прогресс: have(id) → сколько есть в рюкзаке */
export function questState(q, have) {
  const cur = q.kind === 'fetch' ? Math.min(q.n, have(q.item)) : Math.min(q.n, q.got || 0);
  return { cur, need: q.n, ready: cur >= q.n };
}

/** убит монстр: засчитать в охотничьи задания; вернуть те, что стали выполненными */
export function questKill(save, type) {
  const Q = ensureQuests(save), done = [];
  for (const q of Q.active) {
    if (q.kind !== 'hunt' || (q.got || 0) >= q.n) continue;
    if (q.mon !== 'any' && q.mon !== type) continue;
    q.got = (q.got || 0) + 1;
    if (q.got >= q.n) done.push(q);
  }
  return done;
}
