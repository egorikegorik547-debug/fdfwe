// @ts-nocheck
/* ============================================================
   ЛАВКА ВЫЖИВШЕГО-ТОРГОВЦА
   • «Оружие» — редкое оружие (8 видов, в лавке каждый раз лежит случайная часть), цена — набор ресурсов из рюкзака;
   • «Припасы» — ресурсы, патроны и редкие аптечки (армейская / научная);
   • «Обмен» — отдать один ресурс, получить другой по курсу (торговец берёт комиссию).
   Расчёт идёт ресурсами из рюкзака игрока, поэтому сделка невозможна, если не хватает ресурса или нет места.
   ============================================================ */
import { WeaponPreviewer } from './weaponModels';
import { TRADE_CARDS } from './data';
import { ensureQuests, questTitle, questState } from './quests';

export const TRADE_IDS = TRADE_CARDS.map(c => c.id);

// цена оружия: набор ресурсов (нужно иметь их в рюкзаке)
export const WEAPON_PRICE = {
  deagle:   { scrap: 12, meds: 2, powder: 3 },
  an94:     { scrap: 20, meds: 2, powder: 4, band: 2 },
  groza:    { scrap: 22, meds: 3, powder: 5, batt: 2 },
  vintorez: { scrap: 20, meds: 2, powder: 4, batt: 3 },
  kar98:    { scrap: 14, meds: 1, powder: 3 },
  spas:     { scrap: 16, meds: 2, powder: 3, shells: 6 },
  katana:   { scrap: 12, food: 2, band: 2 },
  baton:    { scrap: 10, batt: 3, powder: 1 }
};
// товары-припасы: купить n штук за стоимость cost; lim — сколько у торговца в наличии (если не указано — не ограничено)
export const SUPPLIES = [
  { id: 'food', n: 2, cost: { scrap: 4 } },
  { id: 'band', n: 3, cost: { scrap: 3 } },
  { id: 'meds', n: 1, cost: { scrap: 6 } },
  { id: 'batt', n: 2, cost: { scrap: 4 } },
  { id: 'powder', n: 2, cost: { scrap: 3 } },
  { id: 'pick', n: 2, cost: { scrap: 3 } },
  { id: 'ammo', n: 12, cost: { scrap: 3 } },
  { id: 'ammoRv', n: 6, cost: { scrap: 4 } },
  { id: 'ammoR', n: 5, cost: { scrap: 4 } },
  { id: 'ammoK', n: 15, cost: { scrap: 4 } },
  { id: 'ammoV', n: 10, cost: { scrap: 5 } },
  { id: 'shells', n: 6, cost: { scrap: 4 } },
  { id: 'fuel', n: 15, cost: { scrap: 3 } },
  { id: 'armyMed', n: 1, cost: { scrap: 10, band: 2 }, rare: true },
  { id: 'sciMed', n: 1, cost: { scrap: 12, meds: 2, batt: 2 }, rare: true },
  { id: 'key', n: 1, cost: { scrap: 10, batt: 2 }, rare: true }
];
// ценность единицы ресурса для обмена (в «металлоломе»)
export const VALUE = {
  scrap: 1, wood: 1, cable: 1, fuel: 0.4, ammo: 0.45, ammoRv: 0.75, ammoR: 0.85, ammoK: 0.6, ammoV: 0.7, shells: 0.7,
  band: 2, food: 2, powder: 2, batt: 2, pick: 1.5, water: 1.5, caffeine: 1.5, energy: 2.5, meds: 5,
  armyMed: 13, sciMed: 24, key: 11
};
export const EXCHANGE_FEE = 0.75;     // сколько ценности доходит при обмене (остальное — комиссия торговца)
const GREET = [
  '«Не дёргайся, я не из Бывших. Бери что нужно — только плати честно.»',
  '«Тридцать лет торгую в бункерах. Ни разу не прогадал — и тебе не дам.»',
  '«Оружие редкое, цена не торгуется. Зато бьёт — как в день, когда его сделали.»',
  '«Нет металлолома — обменяю одно на другое. Только комиссия моя.»',
  '«Тише. Я слышал, как они ходят за стеной. Здесь им меня не взять.»'
];

export function createShop(api) {
  const $ = id => document.getElementById(id);
  let rec = null, tab = 'weapons', giveId = null, giveN = 1, open = false, previewer = null, greet = GREET[0], flash = '';

  const ITEMS = () => api.ITEMS, bag = () => api.bag();
  const have = id => api.countIn(bag(), id);
  const nm = id => ITEMS()[id].name;
  const chip = (id, n, lack) => `<span class="shop-chip ${lack ? 'lack' : ''}" title="${nm(id)}">${ITEMS()[id].icon}<b>${n}</b> <i>${nm(id)}</i></span>`;
  const costHTML = cost => Object.entries(cost).map(([id, n]) => chip(id, n, have(id) < n)).join('');
  const canPay = cost => Object.entries(cost).every(([id, n]) => have(id) >= n);

  // атомарная сделка: списать cost, выдать give; ничего не меняется, если не хватает ресурсов или места
  function trade(cost, give) {
    for (const [id, n] of Object.entries(cost)) if (have(id) < n) { fail(`Не хватает: ${nm(id)} ×${n - have(id)}`); return false; }
    const sim = bag().map(s => ({ ...s }));
    for (const [id, n] of Object.entries(cost)) api.removeFrom(sim, id, n);
    for (const [id, n] of give) if (api.addTo(sim, api.cap(), id, n) > 0) { fail('Рюкзак полон — освободите ячейки (Tab)'); return false; }
    for (const [id, n] of Object.entries(cost)) api.removeFrom(bag(), id, n);
    for (const [id, n] of give) api.addTo(bag(), api.cap(), id, n);
    api.changed(); return true;
  }
  function fail(msg) { api.sfx.empty(); greet = '⚠ ' + msg; render(); }

  const owned = id => api.owned(id) || have('wp_' + id) > 0;

  function buyWeapon(id) {
    if (!rec.stock.weapons.includes(id)) return;
    if (owned(id)) { fail('У вас уже есть это оружие'); return; }
    if (!trade(WEAPON_PRICE[id], [['wp_' + id, 1]])) return;
    api.save.weapons[id] = true; api.store();
    rec.stock.weapons = rec.stock.weapons.filter(w => w !== id); api.sold && api.sold(id);
    api.sfx.pick(); api.sfx.open();
    api.toast(`Куплено: ${api.WEAPONS[id].name}. Экипируйте его в инвентаре или здесь`, 'good');
    greet = `«Хорошая сделка. Береги его — второго такого не будет.» (куплено: ${api.WEAPONS[id].name})`;
    render();
  }
  function buySupply(i) {
    const o = SUPPLIES[i], left = o.rare ? (rec.stock.rare[o.id] ?? 0) : Infinity;
    if (left <= 0) { fail('Этого больше нет в наличии'); return; }
    if (!trade(o.cost, [[o.id, o.n]])) return;
    if (o.rare) rec.stock.rare[o.id]--;
    api.sfx.pick(); greet = `Куплено: ${nm(o.id)} ×${o.n}. «Не болей.»`; render();
  }
  // сколько получим за giveN единиц giveId в виде target
  const getAmount = (target, gid = giveId, gn = giveN) => Math.floor(gn * VALUE[gid] * EXCHANGE_FEE / VALUE[target]);
  function exchange(target) {
    if (!giveId || giveN <= 0) return;
    const n = getAmount(target); if (n < 1) { fail('За такое количество торговец ничего не даст — добавьте ещё'); return; }
    if (!trade({ [giveId]: giveN }, [[target, Math.min(n, ITEMS()[target].max * 20)]])) return;
    api.sfx.pick();
    greet = `Обмен: ${nm(giveId)} ×${giveN} → ${nm(target)} ×${n}. «Обмен — дело святое.»`;
    if (have(giveId) <= 0) giveId = null; else giveN = Math.min(giveN, have(giveId));
    render();
  }

  /* ---------- отрисовка ---------- */
  function weaponsHTML() {
    const list = rec.stock.weapons;
    if (!list.length) return '<p class="text-white/60 text-sm p-3">Торговец продал всё редкое оружие. Загляните в другую сеть — товар у него всегда разный.</p>';
    return `<div class="shop-grid">${list.map(id => {
      const c = TRADE_CARDS.find(x => x.id === id), W = api.WEAPONS[id], price = WEAPON_PRICE[id], ok = canPay(price), has = owned(id);
      const slot = W.slot === 'pistol' ? 'Пистолет' : W.slot === 'melee' ? 'Ближний бой' : 'Основное';
      return `<div class="shop-card">
        <div class="shop-cv"><canvas data-wpn="${id}"></canvas><span class="shop-slot">${slot}</span></div>
        <div class="shop-name">${W.icon} ${c.name}</div>
        <div class="shop-desc">${c.desc}</div>
        <div class="shop-stats">${c.stats.map(([k, v]) => `<div><span>${k}</span><i><b style="width:${v}%"></b></i></div>`).join('')}</div>
        <div class="shop-cost">${costHTML(price)}</div>
        <button class="btn sm main" data-act="buyw" data-id="${id}" ${has ? 'disabled' : ''}>${has ? 'Уже есть' : ok ? '🛒 Купить' : '🛒 Купить (не хватает)'}</button>
      </div>`;
    }).join('')}</div>`;
  }
  function suppliesHTML() {
    return `<div class="shop-list">${SUPPLIES.map((o, i) => {
      const left = o.rare ? (rec.stock.rare[o.id] ?? 0) : null, ok = canPay(o.cost) && (left === null || left > 0);
      const d = ITEMS()[o.id];
      return `<div class="shop-row ${o.rare ? 'rare' : ''}">
        <div class="shop-ico">${d.icon}</div>
        <div class="shop-info"><b>${d.name} ×${o.n}</b>${o.rare ? ` <span class="shop-tag">редкость · в наличии: ${left}</span>` : ''}<div class="shop-sub">${d.desc.split('. ')[0]}.</div></div>
        <div class="shop-cost">${costHTML(o.cost)}</div>
        <button class="btn sm ${ok ? 'main' : ''}" data-act="buys" data-i="${i}" ${left === 0 ? 'disabled' : ''}>${left === 0 ? 'Нет' : 'Купить'}</button>
      </div>`;
    }).join('')}</div>`;
  }
  function exchangeHTML() {
    const mine = bag().filter(s => VALUE[s.id] != null && s.id !== 'note').reduce((m, s) => (m[s.id] = (m[s.id] || 0) + s.n, m), {});
    const ids = Object.keys(mine);
    if (giveId && !mine[giveId]) giveId = null;
    if (giveId) giveN = Math.max(1, Math.min(giveN, mine[giveId]));
    const left = ids.length ? ids.map(id => `<button class="shop-give ${id === giveId ? 'on' : ''}" data-act="give" data-id="${id}">${ITEMS()[id].icon}<b>${mine[id]}</b><i>${nm(id)}</i></button>`).join('') : '<p class="text-white/55 text-sm">В рюкзаке нет ничего, что торговец принимает на обмен. Принесите ресурсы со стеллажей сети.</p>';
    let right = '<p class="text-white/55 text-sm p-2">← Выберите, что отдать.</p>';
    if (giveId) {
      const targets = Object.keys(VALUE).filter(t => t !== giveId && t !== 'key' && ITEMS()[t]);
      right = `<div class="shop-qty">Отдать: <button class="btn sm" data-act="qty" data-d="-5">−5</button><button class="btn sm" data-act="qty" data-d="-1">−1</button><b>${giveN}</b> × ${nm(giveId)}<button class="btn sm" data-act="qty" data-d="1">+1</button><button class="btn sm" data-act="qty" data-d="5">+5</button><button class="btn sm" data-act="qty" data-d="999">Все</button></div>
        <div class="shop-targets">${targets.map(t => {
          const n = getAmount(t); const can = n >= 1;
          return `<button class="shop-tgt ${can ? '' : 'no'}" data-act="exch" data-id="${t}" ${can ? '' : 'disabled'}>${ITEMS()[t].icon}<span>${nm(t)}</span><b>${can ? '×' + n : '—'}</b></button>`;
        }).join('')}</div>
        <p class="text-[11px] text-white/45 mt-2">Курс — по ценности предметов, комиссия торговца ${Math.round((1 - EXCHANGE_FEE) * 100)}%. Дорогое меняется на много дешёвого, дешёвое — на крупицу дорогого.</p>`;
    }
    return `<div class="shop-ex"><div class="shop-exl"><div class="text-xs text-white/55 mb-1.5">Ваш рюкзак — что отдать:</div><div class="shop-gives">${left}</div></div><div class="shop-exr"><div class="text-xs text-white/55 mb-1.5">Что получить:</div>${right}</div></div>`;
  }
  /* ---------- задания выживших: сдаются торговцу ---------- */
  function questsHTML() {
    const Q = ensureQuests(api.save);
    if (!Q.active.length) return '<p class="text-white/60 text-sm p-3">У вас нет взятых заданий. За столом в лавке сидят выжившие — поговорите с ними: они дают поручения, а награду выдаёт торговец.</p>';
    return `<div class="text-xs text-white/55 mb-2">Торговец принимает выполненные задания выживших и выдаёт награду. Выполнено заданий всего: ${Q.done}.</div>` + Q.active.map(q => {
      const st = questState(q, have), pct = Math.round(st.cur / st.need * 100);
      return `<div class="quest-card ${st.ready ? 'ready' : ''}">
        <div class="quest-h">📜 ${questTitle(q, ITEMS())} <span class="shop-tag">от: ${q.giver}</span></div>
        <div class="quest-say">«${q.say}»</div>
        <div class="quest-bar"><i style="width:${pct}%"></i></div>
        <div class="text-[11px] text-white/60 mb-1">${q.kind === 'fetch' ? 'В рюкзаке' : 'Убито'}: <b>${st.cur}/${st.need}</b></div>
        <div class="quest-rew"><span class="text-white/55 text-xs">Награда:</span> <span class="shop-cost">${q.reward.map(([id, n]) => chip(id, n, false)).join('')}</span></div>
        <button class="btn sm ${st.ready ? 'main' : ''}" data-act="qturn" data-uid="${q.uid}" ${st.ready ? '' : 'disabled'}>${st.ready ? '✔ Сдать задание' : 'Ещё не выполнено'}</button>
      </div>`;
    }).join('');
  }
  function turnIn(uid) {
    const Q = ensureQuests(api.save), q = Q.active.find(x => x.uid === uid); if (!q) return;
    const st = questState(q, have); if (!st.ready) { fail('Задание ещё не выполнено'); return; }
    if (!trade(q.kind === 'fetch' ? { [q.item]: q.n } : {}, q.reward)) return;
    Q.active = Q.active.filter(x => x.uid !== uid); Q.done++; api.store();
    api.sfx.pick(); api.sfx.open();
    api.toast('📜 Задание сдано: ' + questTitle(q, ITEMS()), 'good');
    greet = `«Это от ${q.giver}? Хорошая работа. Вот твоя награда.»`; render();
  }
  function bagHTML() {
    const eq = id => api.isEquipped(id);
    const wps = bag().filter(s => ITEMS()[s.id] && ITEMS()[s.id].wp);
    return wps.length ? `<div class="shop-bagw">Оружие в рюкзаке: ${wps.map(s => { const w = ITEMS()[s.id].wp; return `<button class="btn sm" data-act="equip" data-id="${w}">⚔ Экипировать: ${api.WEAPONS[w].name}</button>`; }).join(' ')}</div>` : '';
  }
  function render() {
    const body = $('shopBody'); if (!body || !rec) return;
    const used = bag().length, cap = api.cap();
    $('shopGreet').textContent = greet; $('shopGreet').classList.toggle('bad', greet.startsWith('⚠'));
    $('shopBag').textContent = `Рюкзак: ${used} / ${cap} ячеек`;
    document.querySelectorAll('#scr-shop [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const Qr = ensureQuests(api.save).active.filter(q => questState(q, have).ready).length, qb = $('shopQn'); if (qb) qb.textContent = Qr ? ' ● ' + Qr : '';
    body.innerHTML = (tab === 'weapons' ? weaponsHTML() : tab === 'supplies' ? suppliesHTML() : tab === 'quests' ? questsHTML() : exchangeHTML()) + (tab === 'quests' ? '' : bagHTML());
    if (previewer) previewer.stop();
    if (tab === 'weapons') {
      try {
        if (!previewer) previewer = new WeaponPreviewer(TRADE_IDS);
        previewer.attach([...body.querySelectorAll('canvas[data-wpn]')]); previewer.start();
      } catch (e) { console.warn('shop preview failed', e); }
    }
  }

  const root = $('scr-shop');
  if (root) {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-act],[data-tab]'); if (!b || !open) return;
      if (b.dataset.tab) { tab = b.dataset.tab; api.sfx.click(); render(); return; }
      const a = b.dataset.act;
      if (a === 'close') api.close();
      else if (a === 'buyw') buyWeapon(b.dataset.id);
      else if (a === 'buys') buySupply(+b.dataset.i);
      else if (a === 'give') { giveId = b.dataset.id; giveN = 1; api.sfx.click(); render(); }
      else if (a === 'qty') { giveN = Math.max(1, Math.min(have(giveId), giveN + (+b.dataset.d))); api.sfx.click(); render(); }
      else if (a === 'exch') exchange(b.dataset.id);
      else if (a === 'equip') { api.equip(b.dataset.id); render(); }
      else if (a === 'qturn') turnIn(+b.dataset.uid);
    });
  }
  return {
    isOpen: () => open,
    open(r) {
      rec = r; open = true; giveId = null; giveN = 1;
      tab = ensureQuests(api.save).active.some(q => questState(q, have).ready) ? 'quests' : 'weapons';   // есть что сдать — сразу показываем задания
      greet = r.visited ? '«Опять ты. Что на этот раз?»' : GREET[Math.floor(Math.random() * GREET.length)]; r.visited = true;
      api.show('scr-shop'); render();
    },
    close() { open = false; if (previewer) previewer.stop(); api.show('scr-shop', false); },
    refresh() { if (open) render(); }
  };
}
