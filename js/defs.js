// Общие константы и справочники. Модуль не зависит от DOM, чтобы его можно было
// запускать и в браузере, и в Node (тесты проходимости уровней).

export const TILE = 16;
export const GW = 24;           // ширина комнаты в тайлах (с рамкой стен)
export const GH = 14;           // высота комнаты в тайлах (с рамкой стен)
export const VW = GW * TILE;    // 384 — логическая ширина экрана
export const VH = GH * TILE;    // 224 — логическая высота экрана
export const IN_X = 1;          // смещение игрового поля внутри рамки
export const IN_Y = 2;          // сверху две строки занимает стена
export const IN_W = 22;         // размер игрового поля в тайлах
export const IN_H = 11;

// Мебель: footprint (w x h в тайлах, solid-часть) и extra — сколько пикселей спрайта
// торчит над footprint (спинки, шкафы). Спрайты рисуются в sprites.js.
export const FURN = {
  h: { name: 'chair',    w: 1, h: 1, extra: 9 },
  o: { name: 'pouf',     w: 1, h: 1, extra: 3, pushable: true },
  t: { name: 'table',    w: 3, h: 2, extra: 6 },
  s: { name: 'sofa',     w: 4, h: 2, extra: 8 },
  d: { name: 'bed',      w: 3, h: 3, extra: 8 },
  k: { name: 'shelf',    w: 3, h: 1, extra: 24 },
  f: { name: 'plant',    w: 1, h: 1, extra: 13 },
  F: { name: 'fridge',   w: 1, h: 1, extra: 24 },
  C: { name: 'counter',  w: 2, h: 1, extra: 10 },
  D: { name: 'desk',     w: 3, h: 2, extra: 12 },
  v: { name: 'tv',       w: 3, h: 1, extra: 14 },
  l: { name: 'lamp',     w: 1, h: 1, extra: 22 },
  p: { name: 'piano',    w: 3, h: 2, extra: 12 },
};

// Символы карты уровня (22 x 11), см. levels.js
export const CH = {
  WALL: '#', FLOOR: '.', SPAWN: 'P', WOOL: 'w', YARN: 'Y', CAT: 'c', SLEEPER: 'z',
  RUG: 'r', ICE: 'i', TURBO: 'T', ROBOT: 'R', BOSS: 'B',
};

export const DIRS = {
  down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0],
};

// Параметры игры
export const CFG = {
  playerSpeed: 72,
  playerAccel: 700,
  playerFriction: 800,
  iceAccel: 170,
  iceFriction: 58,
  rugSlow: 0.72,
  turboTime: 8,
  turboSpeed: 1.22,
  pickRadius: 9,
  pickRadiusTurbo: 12,
  turboPullRadius: 68,
  turboPullSpeed: 55,
  comboWindow: 1.7,
  hugTime: 1.25,
  hugRadius: 10,
  prowlRadius: 72,
  catWanderSpeed: 22,
  catProwlSpeed: 44,
  catLureSpeed: 88,
  bowlTime: 12,
  eatTime: 8,
  bowlCooldown: 3,
  laserMax: 4.5,
  laserRecharge: 0.8,
  laserReach: 58,
  laserReachMouse: 130,
};

export const WORLDS = [
  { id: 1, name: 'Гостиная',  sub: 'Тёплый вечер дома',  theme: 'living'  },
  { id: 2, name: 'Спальня',   sub: 'Пушистые соседи',    theme: 'bedroom' },
  { id: 3, name: 'Кухня',     sub: 'Лазер и пуфики',     theme: 'kitchen' },
  { id: 4, name: 'Кабинет',   sub: 'Роботы и скользкий пол', theme: 'study' },
  { id: 5, name: 'Особняк',   sub: 'Финальная уборка',   theme: 'manor'   },
];
