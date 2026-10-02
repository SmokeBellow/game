// Уровни собраны вручную. Поле — 22 x 11 клеток (рамка стен добавляется автоматически).
// Конструктор room() гарантирует размеры и не даёт ставить предметы друг на друга.
import { FURN, IN_W, IN_H } from './defs.js';

function room() {
  const g = Array.from({ length: IN_H }, () => Array(IN_W).fill('.'));
  const gr = Array.from({ length: IN_H }, () => Array(IN_W).fill('.'));
  const inb = (x, y) => x >= 0 && y >= 0 && x < IN_W && y < IN_H;
  const free = (x, y) => inb(x, y) && g[y][x] === '.';
  const set = (x, y, c) => {
    if (!free(x, y)) throw new Error(`room: клетка (${x},${y}) занята или вне поля, ставим '${c}', там '${g[y]?.[x]}'`);
    g[y][x] = c;
  };
  const api = {
    p(x, y) { set(x, y, 'P'); return api; },
    put(ch, x, y) {
      const fp = FURN[ch];
      if (!fp) { set(x, y, ch); return api; }
      for (let yy = 0; yy < fp.h; yy++) for (let xx = 0; xx < fp.w; xx++) set(x + xx, y + yy, ch);
      return api;
    },
    wall(x, y, w = 1, h = 1) {
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) set(x + xx, y + yy, '#');
      return api;
    },
    // шерсть: пары [x,y]
    w(...pts) { for (const [x, y] of pts) set(x, y, 'w'); return api; },
    // шерсть по линии с шагом (пропускает занятые клетки)
    trail(x1, y1, x2, y2, step = 2) {
      const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
      for (let i = 0; i <= n; i += step) {
        const x = Math.round(x1 + ((x2 - x1) * i) / (n || 1));
        const y = Math.round(y1 + ((y2 - y1) * i) / (n || 1));
        if (free(x, y)) g[y][x] = 'w';
      }
      return api;
    },
    rug(x, y, w, h) { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) gr[y + yy][x + xx] = 'r'; return api; },
    ice(x, y, w, h) { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) gr[y + yy][x + xx] = 'i'; return api; },
    yarn(x, y) { set(x, y, 'Y'); return api; },
    cat(x, y) { set(x, y, 'c'); return api; },
    sleeper(x, y) { set(x, y, 'z'); return api; },
    turbo(x, y) { set(x, y, 'T'); return api; },
    robot(x, y) { set(x, y, 'R'); return api; },
    boss(x, y) {
      for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 3; xx++) set(x + xx, y + yy, 'B');
      return api;
    },
    out() {
      return { map: g.map((r) => r.join('')), ground: gr.map((r) => r.join('')) };
    },
  };
  return api;
}

const level = (def, r) => ({ ...def, ...r.out() });

// Подсказки появляются один раз, когда вводится новая механика
const INTRO = {
  rug: { icon: 'rug', title: 'Пушистый ковёр', text: 'На мягком ковре идти тяжелее. Иногда лучше обойти его стороной.' },
  cat: { icon: 'cat', title: 'Кошка линяет!', text: 'Пока кошка гуляет по комнате, она роняет шерсть. Комната будет убрана, когда шерсти не останется совсем. Спугнуть кошку нельзя.' },
  hug: { icon: 'heart', title: 'Обнимашки', text: 'Эта кошка любит обниматься. Если она тебя поймает, придётся постоять, а после объятий она оставит ещё шерсти.' },
  bowl: { icon: 'bowl', title: 'Миска с кормом', text: 'Поставь миску — и кошки побегут есть. Даже самая сонная проснётся и освободит проход.', keys: 'Кнопка: Пробел или E.', touch: 'Кнопка с миской — справа внизу.' },
  laser: { icon: 'laser', title: 'Лазерная указка', text: 'Включи лазер, и красная точка побежит перед тобой. Кошки обожают за ней гоняться. Повторное нажатие выключает его.', keys: 'Нажми Shift, F или кликни мышкой: точка поедет за курсором.', touch: 'Кнопка с лазером — справа внизу.' },
  pouf: { icon: 'pouf', title: 'Пуфики', text: 'Пуфик можно подвинуть, если упереться в него. Двигай, чтобы пробраться к шерсти.' },
  ice: { icon: 'ice', title: 'Натёртый паркет', text: 'На блестящем полу сложно остановиться. Рассчитывай разгон и торможение.' },
  robot: { icon: 'robot', title: 'Робот-пылесос', text: 'Робот ездит сам и собирает шерсть. Он упрямый, так что подожди, пока он уступит дорогу.' },
  turbo: { icon: 'turbo', title: 'Турбо-пылесос', text: 'Батарейка на несколько секунд ускоряет тебя и притягивает шерсть издалека.' },
  boss: { icon: 'boss', title: 'Сама Лапка!', text: 'Лапка отдыхает с книжкой, но время от времени чихает так, что шерсть летит во все стороны. Собирай её, пока Лапка не уснёт.' },
};

export const LEVELS = [];
const add = (def, r) => LEVELS.push(level({ id: LEVELS.length + 1, ...def }, r));

// =====================  МИР 1. ГОСТИНАЯ  =====================
add({
  world: 1, name: 'Первый комок', par: 35,
  hint: 'Двигайся стрелками или WASD и собери всю шерсть.',
  hintTouch: 'Води пальцем по левой половине экрана — появится джойстик. Собери всю шерсть!',
}, room()
  .p(2, 8).put('f', 1, 0).put('f', 20, 0).put('t', 9, 4).put('h', 8, 5).put('h', 12, 5)
  .w([5, 8], [9, 8], [13, 8], [17, 8], [19, 5], [16, 2], [12, 2], [6, 2], [3, 5])
  .yarn(21, 0));

add({
  world: 1, name: 'Пушистый ковёр', par: 55, intro: 'rug',
  hint: 'Ковёр замедляет, зато шерсть на нём не спрячется. Клубок ниток — необязательный бонус за третью звезду.',
}, room()
  .p(1, 5).rug(5, 2, 10, 7)
  .put('t', 9, 4).put('h', 8, 4).put('h', 12, 4).put('d', 17, 1).put('k', 0, 0).put('f', 20, 9)
  .w([6, 3], [8, 2], [10, 2], [13, 3], [14, 5], [6, 5], [6, 7], [8, 7], [11, 7], [13, 7], [3, 2], [3, 8], [10, 10], [19, 6], [16, 9], [18, 5])
  .yarn(3, 0));

add({
  world: 1, name: 'Генеральная уборка', par: 60,
  hint: 'Большая комната — маршрут решает всё.',
}, room()
  .p(10, 10).rug(2, 3, 5, 4).rug(14, 5, 5, 4)
  .put('v', 9, 0).put('s', 8, 3).put('k', 1, 0).put('k', 17, 0).put('t', 15, 3).put('d', 0, 8).put('f', 6, 9)
  .put('h', 14, 2).put('h', 19, 3).put('l', 21, 4).put('f', 12, 8).put('t', 3, 8)
  .wall(13, 7, 1, 3).wall(7, 7, 1, 2)
  .w([4, 2], [6, 2], [2, 4], [4, 5], [5, 6], [12, 2], [13, 4], [11, 6], [9, 6], [9, 9], [10, 8], [16, 6], [18, 7], [20, 7], [20, 10], [17, 10], [15, 10], [3, 10], [8, 10], [1, 6])
  .yarn(21, 0));

// =====================  МИР 2. СПАЛЬНЯ  =====================
add({
  world: 2, name: 'Пушистая соседка', par: 45, intro: ['cat', 'hug'],
  cats: [{ budget: 5, prowl: true, color: 'gray' }],
  hint: 'Серая кошка роняет шерсть и любит обниматься. Обходи её или привыкай к объятиям.',
}, room()
  .p(2, 9).put('d', 1, 1).put('k', 8, 0).put('l', 20, 5).put('f', 10, 9).put('h', 6, 6).put('h', 14, 4)
  .wall(11, 5, 1, 4).cat(15, 8)
  .w([4, 5], [8, 3], [9, 7], [14, 2], [16, 6], [18, 3], [18, 8], [5, 9])
  .yarn(21, 0));

add({
  world: 2, name: 'Миска для сони', par: 45, intro: 'bowl', items: { bowl: true },
  cats: [{ budget: 3, prowl: true, color: 'orange' }], sleepers: [{ color: 'black' }],
  hint: 'Чёрная соня загородила проход. Поставь миску подальше от неё.',
}, room()
  .p(2, 6).put('d', 1, 1).put('k', 6, 0).put('h', 8, 5).put('f', 12, 9).put('l', 13, 1)
  .wall(15, 0, 1, 5).wall(15, 6, 1, 5).sleeper(15, 5).put('k', 17, 0).put('f', 20, 1).cat(10, 8)
  .w([5, 5], [4, 8], [8, 2], [10, 6], [12, 4], [8, 9])
  .w([17, 3], [20, 3], [18, 6], [20, 8], [17, 9], [21, 5])
  .yarn(21, 10));

add({
  world: 2, name: 'Ночные гости', par: 50, items: { bowl: true },
  cats: [{ budget: 4, prowl: true, color: 'gray' }, { budget: 3, prowl: false, color: 'white' }],
  sleepers: [{ color: 'black' }],
  hint: 'Клубок спрятан в уголке, который охраняет сонная кошка.',
}, room()
  .p(2, 9).put('d', 1, 1).put('k', 6, 0).put('d', 8, 5).put('f', 12, 1).put('h', 13, 7).put('l', 20, 6).put('f', 20, 9)
  .rug(3, 5, 4, 4)
  .wall(14, 0, 1, 4).wall(14, 4, 4, 1).wall(19, 4, 3, 1).sleeper(18, 4).cat(5, 3).cat(16, 8)
  .w([4, 6], [6, 8], [7, 3], [11, 3], [11, 8], [16, 6], [18, 9], [13, 5])
  .w([16, 1], [19, 1], [21, 3], [17, 3])
  .yarn(21, 0));

// =====================  МИР 3. КУХНЯ  =====================
add({
  world: 3, name: 'Лазерная указка', par: 55, intro: 'laser', items: { bowl: true, laser: true },
  cats: [{ budget: 4, prowl: true, color: 'orange' }, { budget: 4, prowl: true, color: 'gray' }],
  hint: 'Включи лазер, чтобы увести кошек в сторону.',
}, room()
  .p(2, 9).put('C', 1, 0).put('C', 3, 0).put('F', 5, 0).put('C', 6, 0).put('t', 9, 4).put('h', 8, 4).put('h', 12, 4)
  .put('h', 10, 6).put('f', 20, 0).put('f', 20, 10).put('C', 18, 5).cat(15, 5).cat(5, 6)
  .w([3, 3], [8, 2], [13, 2], [16, 3], [16, 7], [13, 8], [8, 8], [4, 7], [19, 9], [20, 3])
  .yarn(21, 5));

add({
  world: 3, name: 'Пуфики', par: 50, intro: 'pouf', items: { bowl: true, laser: true },
  cats: [{ budget: 4, prowl: true, color: 'gray' }],
  hint: 'Упрись в пуфик, чтобы подвинуть его, и проход откроется.',
}, room()
  .p(2, 5).put('C', 1, 0).put('F', 3, 0).put('t', 4, 7).put('h', 3, 7)
  .wall(10, 0, 1, 5).wall(10, 6, 1, 5).put('o', 10, 5)
  .put('t', 14, 3).put('h', 13, 3).put('h', 17, 3).put('C', 16, 0).put('F', 18, 0).cat(7, 3)
  .w([3, 3], [6, 3], [8, 2], [8, 9], [2, 9], [8, 6])
  .w([12, 2], [13, 7], [17, 1], [18, 6], [20, 4], [16, 9], [19, 8])
  .yarn(21, 10));

add({
  world: 3, name: 'Обед для котов', par: 80, items: { bowl: true, laser: true },
  cats: [
    { budget: 3, prowl: true, color: 'orange' }, { budget: 3, prowl: true, color: 'gray' }, { budget: 3, prowl: false, color: 'white' },
  ], sleepers: [{ color: 'black' }],
  hint: 'Три кошки и ещё одна соня. Пользуйся и миской, и лазером.',
}, room()
  .p(2, 9).put('C', 1, 0).put('C', 3, 0).put('F', 5, 0).put('o', 6, 5).put('f', 1, 5)
  .wall(9, 0, 1, 3).wall(12, 0, 1, 3).wall(9, 3, 1, 1).wall(11, 3, 2, 1).put('o', 10, 3)
  .wall(15, 6, 7, 1).wall(15, 7, 1, 2).sleeper(15, 9).wall(15, 10, 1, 1)
  .put('t', 4, 7).put('h', 3, 7).put('C', 17, 0).put('f', 20, 3).put('h', 13, 7)
  .cat(16, 3).cat(4, 5).cat(11, 8)
  .w([11, 1], [11, 2], [3, 3], [7, 3], [7, 8], [12, 5], [17, 2], [18, 4], [13, 9], [8, 6])
  .w([17, 8], [20, 8], [18, 10], [21, 10])
  .yarn(21, 7));

// =====================  МИР 4. КАБИНЕТ  =====================
add({
  world: 4, name: 'Скользкий пол', par: 55, intro: 'ice',
  hint: 'Тормози заранее и пользуйся стенами и мебелью, как упорами.',
}, room()
  .p(2, 9).put('k', 1, 0).put('k', 6, 0).put('D', 15, 0).put('f', 19, 0).ice(4, 3, 14, 5).put('f', 10, 5).put('f', 14, 6)
  .w([3, 2], [20, 3], [19, 8], [9, 9], [2, 6], [6, 4], [8, 6], [12, 4], [16, 5], [11, 7], [17, 7], [5, 7])
  .yarn(21, 0));

add({
  world: 4, name: 'Робот-помощник', par: 40, intro: ['robot', 'turbo'],
  hint: 'Робот собирает шерсть по пути, а батарейка включает турбо: шерсть сама летит к тебе!',
}, room()
  .p(2, 9).put('k', 1, 0).put('D', 8, 0).put('k', 14, 0).put('h', 9, 2).put('s', 14, 6).put('l', 20, 3).put('f', 20, 10)
  .robot(10, 6).turbo(18, 8)
  .w([3, 3], [6, 5], [4, 8], [8, 8], [12, 9], [12, 4], [16, 3], [18, 5], [19, 9], [13, 9], [20, 6], [7, 2])
  .yarn(21, 0));

add({
  world: 4, name: 'Кабинет директора', par: 60, items: { bowl: true, laser: true },
  cats: [{ budget: 3, prowl: true, color: 'orange' }, { budget: 3, prowl: false, color: 'white' }],
  sleepers: [{ color: 'gray' }],
  hint: 'Всё вместе: лёд, робот, кошки и сонная охрана клубка.',
}, room()
  .p(2, 9).put('k', 6, 0).put('D', 10, 0).put('h', 11, 2).put('l', 13, 9).put('o', 8, 8)
  .ice(6, 3, 10, 5).rug(1, 4, 4, 4)
  .wall(16, 0, 1, 3).wall(16, 3, 3, 1).wall(20, 3, 2, 1).sleeper(19, 3)
  .turbo(2, 5).robot(10, 9).cat(12, 5).cat(5, 9)
  .w([8, 4], [11, 5], [14, 4], [9, 7], [13, 6], [3, 3], [2, 7], [4, 5], [18, 6], [19, 9], [17, 8])
  .w([17, 1], [20, 1], [18, 2])
  .yarn(21, 0));

// =====================  МИР 5. ОСОБНЯК  =====================
add({
  world: 5, name: 'Парадная зала', par: 55, items: { bowl: true, laser: true },
  cats: [
    { budget: 3, prowl: true, color: 'black' }, { budget: 3, prowl: true, color: 'orange' }, { budget: 3, prowl: true, color: 'gray' },
  ],
  hint: 'Три кошки сразу. Лазер и миска — твои лучшие друзья.',
}, room()
  .p(10, 10).put('p', 9, 0).put('s', 1, 3).put('s', 17, 3).rug(6, 3, 10, 6)
  .put('f', 0, 0).put('f', 21, 0).put('f', 0, 10).put('f', 21, 10).put('l', 5, 6).put('l', 16, 6)
  .robot(12, 8).turbo(2, 9).turbo(19, 9).cat(11, 5).cat(18, 8).cat(4, 7)
  .w([4, 1], [7, 2], [14, 2], [19, 1], [2, 6], [7, 6], [14, 5], [19, 6], [8, 8], [5, 9], [15, 9], [11, 3])
  .yarn(21, 5));

add({
  world: 5, name: 'Чердак', par: 55, items: { bowl: true, laser: true },
  cats: [{ budget: 3, prowl: true, color: 'orange' }, { budget: 3, prowl: true, color: 'gray' }],
  sleepers: [{ color: 'black' }],
  hint: 'Тесные закоулки, пуфики и сонная кошка у чердачного окошка.',
}, room()
  .p(1, 9).wall(4, 0, 1, 6).put('o', 4, 6).wall(4, 7, 1, 4)
  .wall(9, 2, 1, 9).wall(14, 0, 1, 8)
  .wall(18, 3, 1, 1).wall(20, 3, 2, 1).sleeper(19, 3)
  .put('f', 1, 0).put('h', 6, 4).put('k', 5, 0).put('o', 7, 8).put('l', 11, 1).put('h', 12, 6).put('f', 16, 9)
  .robot(11, 9).cat(7, 5).cat(12, 3)
  .w([2, 2], [2, 6], [6, 2], [8, 6], [6, 9], [11, 4], [12, 8], [11, 10], [16, 5], [20, 6], [18, 9], [15, 1])
  .w([19, 1], [21, 2], [20, 0])
  .yarn(21, 0));

add({
  world: 5, name: 'Лапка', par: 85, intro: 'boss', items: { bowl: true, laser: true },
  cats: [{ budget: 3, prowl: true, color: 'gray' }, { budget: 3, prowl: true, color: 'white' }],
  boss: { waves: 4, per: 8, interval: 9, first: 6 },
  hint: 'Лапка встряхивается всё сильнее. Не зевай и пользуйся турбо!',
}, room()
  .p(10, 10).boss(9, 4).ice(2, 1, 5, 3).ice(15, 1, 5, 3).rug(1, 7, 6, 3).rug(15, 7, 6, 3)
  .wall(5, 5, 1, 1).wall(16, 5, 1, 1).wall(5, 8, 1, 1).wall(16, 8, 1, 1)
  .put('o', 7, 5).put('o', 14, 5).put('f', 0, 0).put('f', 21, 0)
  .turbo(2, 0).turbo(19, 0).robot(3, 9).robot(18, 9).cat(4, 6).cat(17, 6)
  .w([3, 5], [7, 2], [14, 2], [18, 5], [6, 9], [15, 9], [10, 1], [10, 8])
  .yarn(21, 10));

// Демо-комната для фона меню (не входит в список уровней)
export const DEMO = {
  id: 99, world: 1, name: 'demo', par: 99,
  cats: [{ budget: 3, prowl: false, color: 'black' }],
  ...room()
    .p(12, 9).put('v', 8, 0).put('s', 8, 3).put('k', 1, 0).put('f', 1, 6).put('f', 20, 1).put('t', 14, 6).put('l', 20, 4)
    .put('h', 4, 4).put('h', 16, 3).cat(4, 8).w([6, 8], [18, 9])
    .out(),
};

export const MAX_LEVEL = () => LEVELS.length;
export { INTRO };
