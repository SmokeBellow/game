// Награды: шапочки привязаны к локациям. Убрал все комнаты мира — получил шапочку этого мира.
import { LEVELS } from './levels.js';
import { WORLDS } from './defs.js';

export const HAT_RULES = {
  none: {},
  beanie: { world: 1 },
  nightcap: { world: 2 },
  chef: { world: 3 },
  grad: { world: 4 },
  crown: { world: 5 },
  bow: { yarn: 5 },
  ears: { yarn: 10 },
};

export function worldDone(n, levels) {
  const ids = LEVELS.filter((l) => l.world === n).map((l) => l.id);
  return ids.length > 0 && ids.every((id) => levels[id]);
}

export function isUnlocked(hatId, levels) {
  const r = HAT_RULES[hatId];
  if (!r) return false;
  if (r.world) return worldDone(r.world, levels);
  if (r.yarn) return Object.values(levels).filter((l) => l.yarn).length >= r.yarn;
  return true;
}

export function unlockText(hatId) {
  const r = HAT_RULES[hatId] || {};
  if (r.world) return `Убери мир «${WORLDS[r.world - 1].name}»`;
  if (r.yarn) return `Найди ${r.yarn} клубков`;
  return '';
}

export const lastLevelOfWorld = (n) => LEVELS.filter((l) => l.world === n).map((l) => l.id).pop();
