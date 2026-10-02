// Проверка читкода и достижений без браузера: node tests/features.mjs
import assert from 'node:assert/strict';
import { LEVELS } from '../js/levels.js';
import { World } from '../js/world.js';
import * as store from '../js/save.js';
import * as ach from '../js/achievements.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`  ✓ ${name}`); };

const liveOf = (w, committed = false) => ({
  stats: committed ? {} : w.stats, hugs: committed ? 0 : w.hugs, maxCombo: committed ? 0 : w.maxCombo, roomHugs: w.hugs,
  won: w.state === 'won', cheated: w.cheated, hasProwler: (w.def.cats || []).some((c) => c.prowl),
});
function playByTeleport(w) {
  for (let i = 0; i < 60 * 900 && w.state === 'play'; i++) {
    const t = w.wools.find((x) => !x.taken && !x.fly);
    if (t) { w.player.x = t.x; w.player.y = t.y + 6; }
    w.update(1 / 60, {}); w.ev.length = 0;
  }
}

ok('у достижений уникальные id и есть иконки', () => {
  const ids = ach.ACH.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of ach.ACH) { assert.ok(a.icon && a.name && a.desc, a.id); assert.ok(a.goal ? typeof a.value === 'function' : typeof a.test === 'function', a.id); }
});

ok('читкод засчитывает каждую из комнат', () => {
  for (const def of LEVELS) {
    const w = new World(def);
    w.update(1 / 60, {});
    w.cheatWin();
    assert.equal(w.state, 'won', `L${def.id}`);
    assert.equal(w.remainingWool(), 0);
    assert.equal(w.pendingShed(), 0);
    assert.equal(w.collected, w.total);
    const r = w.result();
    assert.deepEqual(r.stars, [true, false, false]);
    assert.equal(r.cheated, true);
    assert.equal(r.yarn, false);
    // повторный вызов безопасен
    w.cheatWin();
    assert.equal(w.state, 'won');
  }
});

ok('честное прохождение: звёзды, статистика и достижение «Первая уборка»', () => {
  store.reset();
  const d = store.data();
  const w = new World(LEVELS[0]);
  playByTeleport(w);
  assert.equal(w.state, 'won');
  assert.equal(w.stats.wool, w.total);
  store.recordLevel(1, w.result());
  store.commitStats(w);
  const fresh = ach.check(d, liveOf(w, true));
  assert.ok(fresh.some((a) => a.id === 'first'));
  assert.equal(d.stats.wool, w.total);
  // повторная проверка ничего нового не выдаёт и статистика не удваивается
  assert.equal(ach.check(d).length, 0);
  assert.equal(ach.context(d).s.wool, w.total);
  assert.equal(d.levels[1].cheat, false);
});

ok('прохождение по коду: ★1, без статистики и без достижений, кроме секретного', () => {
  const d = store.data();
  const woolBefore = d.stats.wool;
  const w = new World(LEVELS[1]);
  w.update(1 / 60, {});
  w.cheatWin();
  const res = w.result();
  store.recordLevel(2, res);
  assert.equal(d.levels[2].cheat, true);
  assert.deepEqual(d.levels[2].stars, [true, false, false]);
  store.commitStats(w);
  const fresh = ach.check(d, liveOf(w, true));
  assert.equal(d.stats.wool, woolBefore, 'шерсть из кода не считается');
  assert.equal(d.stats.cheats, 1);
  assert.deepEqual(fresh.map((a) => a.id).sort(), ['secret']);
  assert.ok(store.isUnlocked(3), 'следующая комната открылась');
});

ok('честное прохождение поверх кода снимает пометку и звёзды сохраняются', () => {
  const d = store.data();
  const w = new World(LEVELS[1]);
  playByTeleport(w);
  store.recordLevel(2, w.result());
  assert.equal(d.levels[2].cheat, false);
  assert.ok(d.levels[2].stars[0]);
});

ok('прогресс счётчиков и секретное достижение скрыто до получения', () => {
  const d = store.data();
  const c = ach.context(d);
  const wool = ach.ACH.find((a) => a.id === 'wool150');
  const p = ach.progress(wool, c);
  assert.equal(p.goal, 150);
  assert.ok(p.value > 0 && p.value < 150);
  assert.equal(ach.progress(ach.ACH.find((a) => a.id === 'secret'), c), null);
});

ok('живая комната учитывается: цепочка, объятия и «Неуловимый»', () => {
  store.reset();
  const d = store.data();
  const w = new World(LEVELS[3]); // комната с кошкой-обнимашкой
  assert.ok(liveOf(w).hasProwler);
  w.maxCombo = 8;
  assert.ok(ach.check(d, liveOf(w)).some((a) => a.id === 'combo'));
  w.state = 'won'; w.hugs = 0;
  assert.ok(ach.check(d, liveOf(w)).some((a) => a.id === 'nohug'));
  const w2 = new World(LEVELS[3]);
  w2.state = 'won'; w2.hugs = 2;
  store.reset();
  assert.ok(!ach.check(store.data(), liveOf(w2)).some((a) => a.id === 'nohug'));
});

console.log(`\nГотово: ${n} проверок`);
