// Достижения. Условия считаются по накопленной статистике и по текущей комнате,
// поэтому большинство наград выдаётся прямо во время игры.
import { LEVELS } from './levels.js';
import { HATS } from './sprites_chars.js';
import * as rewards from './rewards.js';
import { save } from './save.js';

const n = LEVELS.length;

// c: { d — данные сохранения, s — накопленная статистика с текущей комнатой, clean — честно пройденные комнаты, live — текущая комната }
export const ACH = [
  { id: 'first', name: 'Первая уборка', desc: 'Убери любую комнату', icon: 'wool', goal: 1, value: (c) => c.clean.length },
  { id: 'rooms5', name: 'Генеральная уборка', desc: 'Убери 5 комнат', icon: 'wool', goal: 5, value: (c) => c.clean.length },
  { id: 'all', name: 'Дом сияет', desc: 'Убери все комнаты', icon: 'trophy', goal: n, value: (c) => c.clean.length },
  { id: 'wool150', name: 'Шерстяной десант', desc: 'Собери 150 шерстинок', icon: 'wool', goal: 150, value: (c) => c.s.wool },
  { id: 'wool600', name: 'Шерстяной король', desc: 'Собери 600 шерстинок', icon: 'wool', goal: 600, value: (c) => c.s.wool },
  { id: 'combo', name: 'Цепочка', desc: 'Подбери 8 шерстинок подряд, не сбавляя темп', icon: 'star', goal: 8, value: (c) => c.s.maxCombo },
  { id: 'hugs', name: 'Любимчик кошек', desc: 'Дай себя обнять 5 раз', icon: 'heart', goal: 5, value: (c) => c.s.hugs },
  {
    id: 'nohug', name: 'Неуловимый', desc: 'Убери комнату с кошкой-обнимашкой, ни разу не обнявшись', icon: 'cat',
    test: (c) => !!(c.live && c.live.won && !c.live.cheated && c.live.hasProwler && c.live.roomHugs === 0),
  },
  { id: 'fed', name: 'Кошачий повар', desc: 'Накорми кошек 10 раз', icon: 'bowl', goal: 10, value: (c) => c.s.fed },
  { id: 'woke', name: 'Будильник', desc: 'Разбуди спящую кошку', icon: 'bowl', goal: 1, value: (c) => c.s.woke },
  { id: 'laser', name: 'Лазерное шоу', desc: 'Води лазером в сумме 60 секунд', icon: 'laser', goal: 60, value: (c) => Math.floor(c.s.laserT) },
  { id: 'pouf', name: 'Грузчик', desc: 'Подвинь пуфики 15 раз', icon: 'pouf', goal: 15, value: (c) => c.s.pushes },
  { id: 'turbo', name: 'Турбо-режим', desc: 'Подбери 3 турбо-батарейки', icon: 'turbo', goal: 3, value: (c) => c.s.turbos },
  { id: 'robot', name: 'Напарник', desc: 'Пусть роботы соберут 10 шерстинок', icon: 'robot', goal: 10, value: (c) => c.s.robotWool },
  { id: 'yarn5', name: 'Клубочная лихорадка', desc: 'Найди 5 клубков ниток', icon: 'yarn', goal: 5, value: (c) => c.yarn },
  { id: 'yarnAll', name: 'Король клубков', desc: 'Найди клубок в каждой комнате', icon: 'yarn', goal: n, value: (c) => c.yarn },
  { id: 'stars20', name: 'Звездочёт', desc: 'Собери 20 звёзд', icon: 'star', goal: 20, value: (c) => c.stars },
  { id: 'stars45', name: 'Звёздное небо', desc: 'Собери все звёзды', icon: 'star', goal: n * 3, value: (c) => c.stars },
  { id: 'perfect', name: 'Идеально', desc: 'Получи три звезды в одной комнате', icon: 'star', test: (c) => c.clean.some((l) => l.stars.every(Boolean)) },
  { id: 'boss', name: 'Лапка довольна', desc: 'Пройди финальную комнату', icon: 'boss', test: (c) => c.clean.some((l) => l.id === n) },
  {
    id: 'hats', name: 'Модник', desc: 'Открой 3 шапочки', icon: 'hat', goal: 3,
    value: (c) => HATS.filter((h) => h.id !== 'none' && rewards.isUnlocked(h.id, c.d.levels)).length,
  },
  { id: 'secret', name: 'Знаю секрет', desc: 'Воспользуйся секретным кодом', icon: 'key', secret: true, test: (c) => c.d.stats.cheats > 0 },
];

// live: { stats, hugs, maxCombo, roomHugs, won, cheated, hasProwler } — текущая комната (необязательно).
// stats/hugs/maxCombo прибавляются к накопленным; после сохранения комнаты их передают пустыми.
export function context(d, live = null) {
  const s = { ...d.stats };
  if (live && !live.cheated) {
    for (const k of Object.keys(live.stats || {})) s[k] = (s[k] || 0) + live.stats[k];
    s.hugs += live.hugs || 0;
    s.maxCombo = Math.max(s.maxCombo, live.maxCombo || 0);
  }
  const clean = Object.entries(d.levels).filter(([, l]) => !l.cheat).map(([id, l]) => ({ id: +id, ...l }));
  const stars = Object.values(d.levels).reduce((t, l) => t + l.stars.filter(Boolean).length, 0);
  const yarn = Object.values(d.levels).filter((l) => l.yarn).length;
  return { d, s, clean, stars, yarn, live };
}

export function progress(a, c) {
  if (a.goal) return { value: Math.min(a.goal, a.value(c)), goal: a.goal };
  return null;
}

export function isDone(a, c) {
  if (a.goal) return a.value(c) >= a.goal;
  return !!a.test(c);
}

// проверяет всё и возвращает только что открытые достижения
export function check(d, live = null) {
  const c = context(d, live);
  const fresh = [];
  for (const a of ACH) {
    if (d.ach[a.id]) continue;
    if (isDone(a, c)) { d.ach[a.id] = Date.now(); fresh.push(a); }
  }
  if (fresh.length) save();
  return fresh;
}

export const count = (d) => ACH.filter((a) => d.ach[a.id]).length;
