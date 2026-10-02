// Сохранения в localStorage. Все обращения обёрнуты в try/catch: игра работает и без хранилища.
const KEY = 'murmyak-sherstiny-v3';
const OLD_KEY = 'murmyak-sherstiny-v2'; // в версии 2 было 25 комнат: переносим только настройки

const defaults = () => ({
  character: null,
  hat: 'none',
  levels: {},          // id -> { stars:[bool,bool,bool], time, score, yarn }
  seen: {},            // показанные подсказки механик
  settings: { music: 0.5, sfx: 0.8 },
  ending: false,
});

let state = defaults();

export function load() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      const old = localStorage.getItem(OLD_KEY);
      if (old) {
        const o = JSON.parse(old);
        raw = JSON.stringify({ character: o.character, settings: o.settings, seen: o.seen });
      }
    }
    if (raw) {
      const p = JSON.parse(raw);
      state = { ...defaults(), ...p, settings: { ...defaults().settings, ...(p.settings || {}) } };
    }
  } catch (e) { state = defaults(); }
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* хранилище недоступно */ }
}

export const data = () => state;

export function reset() {
  const keep = { settings: state.settings, character: state.character };
  state = { ...defaults(), ...keep };
  save();
}

export function levelResult(id) { return state.levels[id] || null; }

export function recordLevel(id, res) {
  const prev = state.levels[id];
  const stars = res.stars.map((s, i) => !!(s || (prev && prev.stars[i])));
  state.levels[id] = {
    stars,
    time: prev ? Math.min(prev.time, res.time) : res.time,
    score: prev ? Math.max(prev.score, res.score) : res.score,
    yarn: !!(res.yarn || (prev && prev.yarn)),
  };
  save();
  return state.levels[id];
}

export function isUnlocked(id) {
  if (id <= 1) return true;
  return !!state.levels[id - 1];
}

export function highestUnlocked(total) {
  let n = 1;
  while (n < total && state.levels[n]) n++;
  return n;
}

export const totalStars = () => Object.values(state.levels).reduce((s, l) => s + l.stars.filter(Boolean).length, 0);
export const totalYarn = () => Object.values(state.levels).filter((l) => l.yarn).length;
