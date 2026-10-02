// Мебель, предметы, полы и стены. Всё рисуется кодом в едином пиксельном стиле.
import { TILE, GW, GH, IN_X, IN_Y, IN_W, IN_H, FURN } from './defs.js';
import { mk, rect, dot, rrect, ellipse, outline, shade, mix, hash2 } from './px.js';

export const THEMES = {
  living: {
    wall: '#e6bf90', wallD: '#d6a972', stripe: '#dcb07e', wains: '#8f5d3a', wainsL: '#a97449', trim: '#fff1d6',
    floorA: '#c98f55', floorB: '#bf844b', seam: '#8d5c33', floorHi: '#d9a068',
    sofa: '#21a879', cush: '#3c78b4', rug: '#c04a3c', rugB: '#f1d8a8', wood: '#a8693a', accent: '#e8b323',
    sky: ['#ffd9a0', '#ff9f68'], light: '#fff0c0', fur: 'wood',
  },
  bedroom: {
    wall: '#d9b6d6', wallD: '#c79cc4', stripe: '#cfa8cc', wains: '#7c5a82', wainsL: '#94709a', trim: '#fbeaf8',
    floorA: '#dcb78e', floorB: '#d0aa80', seam: '#a8825a', floorHi: '#e8c9a4',
    sofa: '#d98aa8', cush: '#7a6fc4', rug: '#79b5cc', rugB: '#f4efe0', wood: '#b07a52', accent: '#f2c35a',
    sky: ['#c9b6ff', '#7b6ac8'], light: '#e8dcff', fur: 'wood',
  },
  kitchen: {
    wall: '#bde3d2', wallD: '#a3d3bd', stripe: '#b0dbc7', wains: '#f1f5ef', wainsL: '#ffffff', trim: '#ffffff',
    floorA: '#f3e8d0', floorB: '#c7dccd', seam: '#b9b49c', floorHi: '#ffffff',
    sofa: '#e0674f', cush: '#e8b323', rug: '#e0674f', rugB: '#fff1d6', wood: '#d6a56c', accent: '#e0674f',
    sky: ['#a8dcff', '#6cb8f0'], light: '#fffbe0', fur: 'light',
  },
  study: {
    wall: '#69977f', wallD: '#567f69', stripe: '#5f8c75', wains: '#4a3426', wainsL: '#62463a', trim: '#e8d9b0',
    floorA: '#8e5b3b', floorB: '#7f4f32', seam: '#55321f', floorHi: '#a06c4a',
    sofa: '#7a3a45', cush: '#d9a24a', rug: '#7a3a45', rugB: '#d9b968', wood: '#6b4630', accent: '#d9a24a',
    sky: ['#2c3566', '#141a3c'], light: '#ffe9a8', fur: 'dark',
  },
  manor: {
    wall: '#8189b8', wallD: '#6d75a8', stripe: '#7880b0', wains: '#363a68', wainsL: '#474c80', trim: '#e6c866',
    floorA: '#ece8f1', floorB: '#bab5cf', seam: '#9a96b2', floorHi: '#ffffff',
    sofa: '#8a2f4a', cush: '#e6c866', rug: '#8a2f4a', rugB: '#e6c866', wood: '#4a3045', accent: '#e6c866',
    sky: ['#ffb08a', '#7a5aa8'], light: '#ffe8c8', fur: 'dark',
  },
};

const W_ = (T) => ({
  light: T.fur === 'light' ? '#e4c08a' : T.fur === 'dark' ? '#7a5238' : '#b97a47',
  mid: T.fur === 'light' ? '#cfa56a' : T.fur === 'dark' ? '#62402b' : '#a2693a',
  dark: T.fur === 'light' ? '#a8814c' : T.fur === 'dark' ? '#472d1f' : '#7c4b27',
});

// ----------------------------------------------------------------- мебель
function drawChair(x, T) {
  const w = W_(T);
  rect(x, 2, 20, 2, 5, w.dark); rect(x, 12, 20, 2, 5, w.dark);
  rect(x, 3, 17, 2, 3, w.mid); rect(x, 11, 17, 2, 3, w.mid);
  rect(x, 2, 0, 12, 14, w.mid); rect(x, 2, 0, 12, 1, w.light);
  rect(x, 4, 2, 8, 10, T.cush);
  for (let yy = 0; yy < 10; yy++) for (let xx = 0; xx < 8; xx++) {
    const h = hash2(xx, yy, 3);
    if (h > 0.72) dot(x, 4 + xx, 2 + yy, h > 0.88 ? '#e8884a' : '#d95b4f');
    else if (h < 0.2) dot(x, 4 + xx, 2 + yy, shade(T.cush, 0.28));
  }
  rect(x, 1, 13, 14, 6, shade(T.cush, 0.12)); rect(x, 1, 13, 14, 1, shade(T.cush, 0.4));
  rect(x, 1, 18, 14, 2, w.dark);
}

function drawPouf(x, T, v) {
  const cols = ['#e8745e', '#e8b84a', '#52b8b0', '#9a7ad0'];
  const c = cols[v % cols.length];
  ellipse(x, 8, 15, 7, 3, shade(c, -0.35));
  rrect(x, 1, 5, 14, 11, shade(c, -0.15));
  rrect(x, 1, 3, 14, 9, c);
  rect(x, 3, 3, 10, 2, shade(c, 0.3)); rect(x, 2, 4, 2, 4, shade(c, 0.18));
  for (const sx of [3, 6, 9, 12]) dot(x, sx, 12, shade(c, -0.4));
  rect(x, 2, 11, 12, 1, shade(c, -0.3));
}

function drawTable(x, T) {
  const w = W_(T);
  rect(x, 8, 22, 3, 10, w.dark); rect(x, 37, 22, 3, 10, w.dark);
  rect(x, 3, 24, 3, 14, w.mid); rect(x, 42, 24, 3, 14, w.mid);
  rect(x, 3, 24, 1, 14, w.light);
  rect(x, 0, 0, 48, 24, w.light);
  for (let i = 1; i < 6; i++) rect(x, 0, i * 4, 48, 1, w.mid);
  for (let i = 0; i < 6; i++) { const o = (i * 17) % 40; rect(x, o + 3, i * 4 + 2, 1, 2, w.mid); }
  rect(x, 0, 24, 48, 3, w.dark); rect(x, 0, 0, 48, 1, shade(w.light, 0.3));
  // кружка и книга
  rect(x, 30, 7, 5, 5, '#f6f1e6'); rect(x, 35, 8, 2, 3, '#f6f1e6'); rect(x, 31, 8, 3, 1, '#7a4a30');
  rect(x, 10, 9, 9, 6, '#4a7aa8'); rect(x, 10, 9, 9, 1, '#6a9ac8'); rect(x, 11, 14, 8, 1, '#f1ead6');
}

function drawSofa(x, T) {
  const s = T.sofa, sd = shade(s, -0.3), sl = shade(s, 0.22);
  const wood = W_(T).dark;
  rect(x, 3, 35, 4, 5, wood); rect(x, 57, 35, 4, 5, wood);
  rrect(x, 0, 0, 64, 20, sd);
  for (const [cx, cw] of [[6, 16], [24, 16], [42, 16]]) { rrect(x, cx, 2, cw, 15, s); rect(x, cx + 1, 2, cw - 2, 2, sl); }
  rrect(x, 0, 8, 10, 26, sd); rrect(x, 54, 8, 10, 26, sd);
  rrect(x, 1, 8, 8, 8, s); rrect(x, 55, 8, 8, 8, s);
  rect(x, 2, 8, 6, 2, sl); rect(x, 56, 8, 6, 2, sl);
  rect(x, 10, 19, 44, 14, s);
  for (const cx of [10, 25, 40]) { rrect(x, cx, 19, 14, 14, s); rect(x, cx + 1, 19, 12, 2, sl); rect(x, cx, 31, 14, 2, sd); }
  rect(x, 10, 33, 44, 2, sd);
  // подушки
  rrect(x, 12, 9, 10, 10, '#c9402f'); rect(x, 13, 10, 8, 2, '#e06a55'); rect(x, 14, 14, 4, 3, '#a02f22');
  rrect(x, 43, 9, 10, 10, T.accent); rect(x, 44, 10, 8, 2, shade(T.accent, 0.3)); rect(x, 46, 14, 4, 3, shade(T.accent, -0.25));
}

function drawBed(x, T) {
  const w = W_(T);
  const blanket = T.fur === 'dark' ? '#4a7a9a' : '#2fb5a8';
  rrect(x, 0, 0, 48, 16, w.mid); rect(x, 2, 2, 44, 3, w.light); rect(x, 2, 6, 44, 8, w.dark);
  for (const px of [4, 25]) { rrect(x, px, 7, 19, 11, '#f6f4ee'); rect(x, px + 1, 7, 17, 2, '#ffffff'); rect(x, px + 2, 15, 15, 2, '#d5d2c8'); }
  rect(x, 0, 16, 48, 34, blanket);
  rect(x, 0, 21, 48, 8, shade(blanket, 0.28)); rect(x, 0, 28, 48, 1, shade(blanket, -0.2));
  for (let i = 0; i < 12; i++) rect(x, 3 + i * 4, 32 + (i % 2) * 4, 2, 2, shade(blanket, 0.16));
  for (let i = 0; i < 24; i++) { const h = hash2(i, 5); if (h > 0.5) dot(x, Math.floor(h * 90) % 46 + 1, 30 + Math.floor(h * 100) % 16, shade(blanket, -0.15)); }
  rect(x, 0, 16, 1, 34, shade(blanket, -0.25)); rect(x, 47, 16, 1, 34, shade(blanket, -0.25));
  rect(x, 0, 49, 48, 5, '#8a3a30'); rect(x, 0, 49, 48, 1, '#a94a3e');
  rect(x, 2, 53, 4, 3, '#5c241e'); rect(x, 42, 53, 4, 3, '#5c241e');
}

function drawShelf(x, T) {
  const w = W_(T);
  rect(x, 0, 0, 48, 40, w.mid); rect(x, 0, 0, 48, 2, w.light);
  rect(x, 2, 3, 44, 34, shade(w.dark, -0.3));
  const bookCols = ['#c9402f', '#3c78b4', '#e8b323', '#52a868', '#8a5ac0', '#d98a3a', '#e8e0cc', '#2f8a9a'];
  for (let row = 0; row < 3; row++) {
    const y0 = 3 + row * 12;
    rect(x, 2, y0 + 10, 44, 2, w.light);
    let bx = 3;
    while (bx < 44) {
      const h = hash2(bx, row, 9);
      const bw = 2 + Math.floor(h * 3);
      const bh = 6 + Math.floor(hash2(bx, row, 4) * 4);
      if (hash2(bx, row, 7) > 0.9) { bx += 3; continue; }
      const col = bookCols[Math.floor(hash2(bx, row, 2) * bookCols.length)];
      rect(x, bx, y0 + 10 - bh, bw, bh, col); rect(x, bx, y0 + 10 - bh, 1, bh, shade(col, 0.25));
      bx += bw;
    }
  }
  rect(x, 0, 37, 48, 3, w.dark);
  // фигурка на полке
  rect(x, 36, 1, 4, 3, '#f0d070');
}

function drawPlant(x, T) {
  rect(x, 4, 20, 8, 9, '#c0643c'); rect(x, 3, 19, 10, 3, '#d97a4c'); rect(x, 5, 27, 6, 2, '#8a4428');
  rect(x, 4, 21, 1, 7, '#e08a5c');
  const g = ['#2f8a4a', '#3fae5c', '#58c874'];
  const blobs = [[8, 9, 5, 5], [4, 12, 3, 4], [12, 12, 3, 4], [8, 4, 3, 4], [5, 7, 3, 3], [11, 7, 3, 3]];
  blobs.forEach(([cx, cy, rx, ry], i) => ellipse(x, cx, cy, rx, ry, g[i % 3]));
  dot(x, 7, 5, '#9de8a8'); dot(x, 10, 9, '#9de8a8'); dot(x, 5, 12, '#9de8a8');
  rect(x, 7, 15, 2, 6, '#2a7a40');
}

function drawFridge(x, T) {
  rrect(x, 1, 0, 14, 40, '#dfe9ee'); rect(x, 1, 0, 14, 2, '#fff'); rect(x, 13, 2, 2, 36, '#b9c8d0');
  rect(x, 2, 17, 12, 1, '#9fb0b8'); rect(x, 11, 6, 1, 8, '#7a8a92'); rect(x, 11, 20, 1, 9, '#7a8a92');
  rect(x, 4, 5, 4, 4, '#e0674f'); rect(x, 5, 22, 5, 3, '#e8b323');
  rect(x, 2, 38, 12, 2, '#b9c8d0');
}

function drawCounter(x, T, v) {
  rect(x, 0, 0, 32, 11, '#efe9d9'); rect(x, 0, 0, 32, 1, '#fff'); rect(x, 0, 10, 32, 2, '#b5ae98');
  const cab = T.fur === 'light' ? '#d6a56c' : '#8a5a38';
  rect(x, 0, 12, 32, 14, cab); rect(x, 0, 12, 32, 1, shade(cab, -0.3));
  for (const dx of [2, 17]) { rect(x, dx, 14, 13, 10, shade(cab, 0.12)); rect(x, dx, 14, 13, 1, shade(cab, 0.3)); }
  dot(x, 13, 18, '#e8d8a0'); dot(x, 18, 18, '#e8d8a0');
  rect(x, 0, 24, 32, 2, shade(cab, -0.45));
  if (v % 2 === 0) { // плита
    for (const [cx, cy] of [[8, 4], [20, 4], [8, 8], [20, 8]]) ellipse(x, cx, cy, 3, 1, '#35353d');
    rect(x, 4, 12, 24, 1, '#35353d');
  } else { // мойка
    rect(x, 7, 3, 18, 6, '#9fb5c1'); rect(x, 8, 4, 16, 4, '#7d96a4'); rect(x, 15, 0, 2, 3, '#c8d4da');
  }
}

function drawDesk(x, T) {
  const w = W_(T);
  rect(x, 3, 31, 4, 13, w.dark); rect(x, 41, 31, 4, 13, w.dark);
  rect(x, 0, 12, 48, 20, w.mid); rect(x, 0, 12, 48, 1, w.light);
  rect(x, 0, 30, 48, 3, w.dark);
  rect(x, 29, 33, 16, 8, w.mid); rect(x, 30, 34, 14, 3, w.light); rect(x, 36, 35, 2, 1, '#f0d070');
  // монитор
  rect(x, 14, 0, 20, 14, '#22222b'); rect(x, 15, 1, 18, 11, '#2a5a7a'); rect(x, 15, 1, 18, 3, '#3f86ad');
  rect(x, 17, 6, 8, 1, '#a8e0f0'); rect(x, 17, 8, 12, 1, '#a8e0f0'); rect(x, 22, 14, 4, 2, '#22222b');
  rect(x, 18, 18, 12, 3, '#d6d4dc'); rect(x, 18, 18, 12, 1, '#fff');
  rect(x, 34, 17, 3, 4, '#e8e8f0'); rect(x, 4, 14, 6, 6, '#f6f1e6'); rect(x, 5, 15, 4, 1, '#7a4a30');
  rect(x, 40, 15, 4, 8, '#d9a24a'); rect(x, 41, 14, 2, 2, '#fff0b0');
}

function drawTV(x, T) {
  const w = W_(T);
  rect(x, 0, 14, 48, 16, w.mid); rect(x, 0, 14, 48, 1, w.light);
  rect(x, 2, 17, 20, 10, w.dark); rect(x, 26, 17, 20, 10, w.dark);
  rect(x, 4, 19, 4, 1, '#caa'); rect(x, 30, 19, 4, 1, '#caa');
  rect(x, 21, 12, 6, 3, '#22222b');
  rrect(x, 5, 0, 38, 14, '#18181f');
  rect(x, 7, 2, 34, 10, '#24485c'); rect(x, 7, 2, 34, 3, '#2f6580');
  rect(x, 9, 3, 6, 1, '#7ec8e0'); rect(x, 10, 4, 3, 1, '#7ec8e0');
  for (let i = 0; i < 12; i++) dot(x, 8 + i * 3, 9 + (i % 2), '#1d3a4a');
  rect(x, 38, 12, 2, 1, '#e0674f');
  rect(x, 38, 28, 8, 2, w.dark); rect(x, 3, 28, 8, 2, w.dark);
}

function drawLamp(x, T) {
  rect(x, 3, 33, 10, 3, '#4a3a30'); rect(x, 4, 32, 8, 2, '#6a5448'); rect(x, 7, 9, 2, 24, '#6a5448');
  rect(x, 2, 0, 12, 3, '#f8d878'); rect(x, 1, 3, 14, 4, '#f2c25a'); rect(x, 0, 7, 16, 3, '#d9a24a');
  rect(x, 3, 1, 4, 1, '#fff2c0'); rect(x, 2, 4, 2, 3, '#fff0b0');
}

function drawPiano(x, T) {
  rect(x, 0, 6, 48, 26, '#1c1c26'); rect(x, 0, 0, 48, 8, '#2b2b38'); rect(x, 2, 1, 44, 2, '#444458');
  rect(x, 4, 8, 40, 3, '#12121a'); rect(x, 6, 4, 30, 1, '#5a5a70');
  rect(x, 3, 24, 42, 8, '#f4f0e6'); rect(x, 3, 24, 42, 1, '#cfc9b8');
  for (let i = 0; i < 14; i++) rect(x, 3 + i * 3 + 3, 24, 1, 8, '#cfc9b8');
  for (const i of [0, 1, 3, 4, 5, 7, 8, 10, 11, 12]) rect(x, 5 + i * 3, 24, 2, 5, '#17171f');
  rect(x, 4, 32, 4, 12, '#12121a'); rect(x, 40, 32, 4, 12, '#12121a');
  rect(x, 3, 44 - 12 + 10, 2, 2, '#e6c866');
}

export function furnSprite(type, T, variant = 0) {
  const fp = FURN[type];
  const w = fp.w * TILE, h = fp.h * TILE + fp.extra;
  const [c, x] = mk(w, h);
  ({ h: drawChair, o: drawPouf, t: drawTable, s: drawSofa, d: drawBed, k: drawShelf, f: drawPlant,
    F: drawFridge, C: drawCounter, D: drawDesk, v: drawTV, l: drawLamp, p: drawPiano })[type](x, T, variant);
  return { c: outline(c), ox: -1, oy: -fp.extra - 1 };
}

// ----------------------------------------------------------------- предметы
export function woolSprite(v = 0) {
  const [c, x] = mk(10, 9);
  const base = '#f6f2ea', sh = '#cfc8bb', hi = '#ffffff';
  ellipse(x, 5, 5, 4, 3, sh);
  ellipse(x, 5, 4, 4, 3, base);
  ellipse(x, 2, 3, 2, 2, base); ellipse(x, 8, 3, 2, 2, base); ellipse(x, 5, 2, 2, 2, base);
  dot(x, 4, 2, hi); dot(x, 3, 3, hi); dot(x, 6, 3, hi);
  dot(x, 4, 6, sh); dot(x, 7, 5, sh); dot(x, 2, 5, sh);
  if (v % 2) { dot(x, 1, 6, '#ddd6c8'); dot(x, 9, 5, '#ddd6c8'); }
  return { c: outline(c, '#8a7f70'), ax: 6, ay: 6 };
}

export const YARN_COLS = ['#e8648c', '#4a9ae0', '#f2a03a', '#58c878', '#9a6ad8', '#e85a4a', '#2fc0c0', '#f0d050'];
export function yarnSprite(i = 0) {
  const col = YARN_COLS[i % YARN_COLS.length];
  const [c, x] = mk(13, 12);
  ellipse(x, 6, 6, 5, 5, col);
  ellipse(x, 6, 5, 4, 4, shade(col, 0.12));
  for (const [dx, dy, w] of [[2, 3, 6], [1, 5, 8], [2, 7, 7], [4, 2, 4]]) rect(x, dx + 1, dy, w, 1, shade(col, -0.28));
  rect(x, 3, 2, 3, 1, shade(col, 0.5)); dot(x, 2, 3, shade(col, 0.5));
  rect(x, 8, 9, 4, 1, col); rect(x, 11, 10, 1, 1, col); rect(x, 10, 11, 2, 1, shade(col, -0.2));
  return { c: outline(c), ax: 7, ay: 9 };
}

export function bowlSprite(f = 0) {
  const [c, x] = mk(16, 10);
  ellipse(x, 8, 7, 7, 2, '#b84a66');
  ellipse(x, 8, 5, 7, 3, '#e86a8a');
  ellipse(x, 8, 4, 5, 2, '#7a3a2a');
  for (const [dx, dy] of [[5, 4], [7, 3], [9, 4], [11, 3], [8, 5], [6, 5]]) dot(x, dx, dy, '#b87848');
  rect(x, 3, 6, 10, 1, '#f9a0b8'); dot(x, 2, 5, '#fff');
  if (f) { dot(x, 8, 1, '#fff'); dot(x, 10, 0, '#fff'); }
  return { c: outline(c), ax: 9, ay: 9 };
}

export function turboSprite() {
  const [c, x] = mk(10, 14);
  rect(x, 3, 0, 4, 2, '#cfd6dc'); rrect(x, 1, 2, 8, 11, '#4cd964'); rect(x, 2, 3, 2, 8, '#8af0a0');
  rect(x, 4, 4, 3, 2, '#fff35a'); rect(x, 3, 6, 4, 2, '#fff35a'); rect(x, 5, 8, 2, 3, '#fff35a');
  rect(x, 1, 11, 8, 2, '#2f9a44');
  return { c: outline(c), ax: 6, ay: 15 };
}

export function robotSprite(f = 0) {
  const [c, x] = mk(18, 14);
  ellipse(x, 9, 10, 8, 3, '#8f98a8');
  ellipse(x, 9, 7, 8, 5, '#e8ecf2');
  ellipse(x, 9, 6, 7, 4, '#f6f8fb');
  ellipse(x, 9, 7, 5, 3, '#2a2f3e');
  rect(x, 6, 6, 2, 2, f ? '#38e0a0' : '#7cf0c8'); rect(x, 10, 6, 2, 2, f ? '#38e0a0' : '#7cf0c8');
  rect(x, 8, 9, 2, 1, '#e86a5a');
  rect(x, 2, 11, 3, 2, '#5a6070'); rect(x, 13, 11, 3, 2, '#5a6070');
  rect(x, 5, 3, 6, 1, '#fff');
  return { c: outline(c), ax: 10, ay: 13 };
}

export function heartSprite(big = false) {
  const [c, x] = mk(7, 6);
  const col = '#ff5a7a';
  rect(x, 1, 0, 2, 1, col); rect(x, 4, 0, 2, 1, col);
  rect(x, 0, 1, 7, 2, col); rect(x, 1, 3, 5, 1, col); rect(x, 2, 4, 3, 1, col); dot(x, 3, 5, col);
  dot(x, 1, 1, '#ffb0c0');
  return { c: outline(c, '#7a1a3a'), ax: 4, ay: 6 };
}

export function sparkSprite(col = '#fff6b0') {
  const [c, x] = mk(5, 5);
  rect(x, 2, 0, 1, 5, col); rect(x, 0, 2, 5, 1, col); dot(x, 2, 2, '#fff');
  return { c, ax: 2, ay: 2 };
}

export function iconCanvas(name, T = THEMES.living) {
  // иконки для карточек механик (рисуются в 24x24)
  const [c, x] = mk(24, 24);
  const put = (s, ox = 0, oy = 0) => x.drawImage(s.c, Math.round(12 - s.c.width / 2) + ox, Math.round(12 - s.c.height / 2) + oy);
  switch (name) {
    case 'rug': { rect(x, 2, 6, 20, 12, '#c04a3c'); rect(x, 4, 8, 16, 8, '#f1d8a8'); rect(x, 6, 10, 12, 4, '#c04a3c'); break; }
    case 'bowl': put(bowlSprite(0)); break;
    case 'heart': put(heartSprite(true)); x.drawImage(heartSprite().c, 0, 0); break;
    case 'pouf': put(furnSprite('o', T, 0)); break;
    case 'turbo': put(turboSprite()); break;
    case 'robot': put(robotSprite(0)); break;
    case 'ice': { rect(x, 2, 4, 20, 16, '#cfe4f4'); rect(x, 4, 6, 4, 2, '#fff'); rect(x, 12, 12, 6, 2, '#fff'); rect(x, 8, 15, 3, 1, '#fff'); break; }
    case 'laser': { rect(x, 3, 9, 11, 5, '#4a4a58'); rect(x, 3, 9, 11, 1, '#6a6a7c'); rect(x, 14, 10, 3, 3, '#ff4a4a'); rect(x, 18, 11, 3, 1, '#ff8a8a'); dot(x, 21, 11, '#fff'); break; }
    case 'cat': case 'boss': {
      const body = name === 'boss' ? '#2a2a33' : '#e88b3d', hi = name === 'boss' ? '#4a4a58' : '#f8bb78', eye = name === 'boss' ? '#e4ee55' : '#3a9a46';
      rect(x, 4, 8, 16, 13, body); rect(x, 5, 7, 14, 1, body);
      rect(x, 4, 3, 4, 6, body); rect(x, 16, 3, 4, 6, body); dot(x, 5, 5, '#e8a0b0'); dot(x, 18, 5, '#e8a0b0');
      rect(x, 6, 8, 12, 1, hi);
      rect(x, 7, 12, 3, 3, eye); rect(x, 14, 12, 3, 3, eye); rect(x, 8, 12, 1, 3, '#10100c'); rect(x, 15, 12, 1, 3, '#10100c');
      rect(x, 11, 16, 2, 1, '#e8a0b0'); rect(x, 10, 18, 4, 1, '#f6f1e6');
      if (name === 'boss') { rect(x, 0, 18, 7, 5, '#f1ead6'); rect(x, 0, 21, 7, 2, '#7a3b2e'); }
      break;
    }
    default: break;
  }
  return c;
}

// ----------------------------------------------------------------- полы, стены, комната целиком
function floorTile(x, T, fx, fy, theme, kind) {
  // fx, fy — глобальные пиксельные координаты
  return null;
}

function drawFloor(x, T, themeName) {
  const x0 = IN_X * TILE, y0 = IN_Y * TILE, w = IN_W * TILE, h = IN_H * TILE;
  if (themeName === 'kitchen' || themeName === 'manor') {
    for (let ty = 0; ty < IN_H; ty++) for (let tx = 0; tx < IN_W; tx++) {
      const a = (tx + ty) % 2 === 0;
      const base = a ? T.floorA : T.floorB;
      rect(x, x0 + tx * TILE, y0 + ty * TILE, TILE, TILE, base);
      rect(x, x0 + tx * TILE, y0 + ty * TILE, TILE, 1, T.seam); rect(x, x0 + tx * TILE, y0 + ty * TILE, 1, TILE, T.seam);
      rect(x, x0 + tx * TILE + 1, y0 + ty * TILE + 1, TILE - 2, 1, T.floorHi);
      if (themeName === 'manor') {
        for (let i = 0; i < 3; i++) {
          const hx = Math.floor(hash2(tx, ty, i) * 11) + 2, hy = Math.floor(hash2(tx, ty, i + 9) * 11) + 2;
          rect(x, x0 + tx * TILE + hx, y0 + ty * TILE + hy, 3, 1, mix(base, T.seam, 0.5));
        }
      } else if (hash2(tx, ty, 5) > 0.7) {
        dot(x, x0 + tx * TILE + 6, y0 + ty * TILE + 7, mix(base, T.seam, 0.4));
      }
    }
  } else {
    // дощатый пол: горизонтальные доски по 8 пикселей
    rect(x, x0, y0, w, h, T.floorA);
    for (let r = 0; r < h / 8; r++) {
      const y = y0 + r * 8;
      rect(x, x0, y, w, 1, T.seam);
      let px = x0 - Math.floor(hash2(r, 1, 2) * 40);
      while (px < x0 + w) {
        const len = 34 + Math.floor(hash2(px, r, 3) * 28);
        const shadeC = hash2(px, r, 4);
        const col = shadeC > 0.66 ? T.floorHi : shadeC > 0.33 ? T.floorA : T.floorB;
        const sx = Math.max(px, x0), ex = Math.min(px + len, x0 + w);
        if (ex > sx) {
          rect(x, sx, y + 1, ex - sx, 7, col);
          rect(x, sx, y + 1, ex - sx, 1, mix(col, T.floorHi, 0.4));
        }
        if (px >= x0) rect(x, px, y, 1, 8, T.seam);
        // сучки
        if (hash2(px, r, 8) > 0.82 && ex - sx > 12) {
          const kx = sx + 6 + Math.floor(hash2(px, r, 6) * (ex - sx - 12));
          dot(x, kx, y + 4, T.seam); dot(x, kx + 1, y + 4, mix(col, T.seam, 0.5));
        }
        px += len;
      }
    }
  }
}

function drawWallTop(x, T, themeName, id) {
  // верхняя стена (32px): обои + панель + плинтус
  rect(x, 0, 0, GW * TILE, 32, T.wall);
  for (let px = 0; px < GW * TILE; px += 16) rect(x, px, 0, 8, 20, T.stripe);
  if (themeName === 'bedroom') for (let px = 4; px < GW * TILE; px += 16) for (let py = 3; py < 18; py += 8) dot(x, px, py + ((px / 16) % 2) * 4, shade(T.wall, 0.4));
  if (themeName === 'manor') for (let px = 8; px < GW * TILE; px += 16) { rect(x, px - 1, 2, 3, 3, T.trim); rect(x, px, 5, 1, 12, mix(T.wall, T.trim, 0.3)); }
  rect(x, 0, 0, GW * TILE, 2, T.trim); rect(x, 0, 2, GW * TILE, 1, T.wallD);
  // панель
  rect(x, 0, 20, GW * TILE, 12, T.wains);
  if (themeName === 'kitchen') {
    for (let px = 0; px < GW * TILE; px += 8) rect(x, px, 20, 1, 12, '#d6e0d6');
    for (let py = 20; py < 32; py += 6) rect(x, 0, py, GW * TILE, 1, '#d6e0d6');
  } else {
    for (let px = 0; px < GW * TILE; px += 24) { rect(x, px + 3, 23, 18, 7, T.wainsL); rect(x, px + 4, 24, 16, 5, T.wains); }
  }
  rect(x, 0, 20, GW * TILE, 2, T.trim); rect(x, 0, 21, GW * TILE, 1, mix(T.trim, T.wains, 0.5));
  rect(x, 0, 30, GW * TILE, 2, mix(T.wains, '#000000', 0.35));
  // декор
  const slots = [3, 8, 13, 18];
  slots.forEach((sx, i) => {
    const kind = Math.floor(hash2(id, i, 11) * 3);
    const px = sx * 16 + 8;
    if (themeName === 'kitchen' && i === 2) return;
    if (i === 1 || (i === 3 && id % 2)) drawWindow(x, T, px - 12, 3, themeName);
    else if (kind === 0) drawPicture(x, px - 8, 5, T, id + i);
    else if (kind === 1) drawClock(x, px, 11, T);
    else drawPicture(x, px - 6, 6, T, id * 3 + i);
  });
}

function drawWindow(x, T, px, py, themeName) {
  rect(x, px, py, 26, 22, '#f3ead8'); rect(x, px + 1, py + 1, 24, 20, '#c9bda3');
  rect(x, px + 2, py + 2, 22, 17, T.sky[1]); rect(x, px + 2, py + 2, 22, 8, T.sky[0]);
  if (themeName === 'study') { dot(x, px + 18, py + 5, '#fff6c0'); rect(x, px + 17, py + 5, 3, 1, '#fff6c0'); dot(x, px + 6, py + 4, '#fff'); dot(x, px + 10, py + 9, '#fff'); }
  else if (themeName !== 'manor') { rect(x, px + 5, py + 6, 7, 2, '#ffffffaa'); rect(x, px + 15, py + 9, 6, 2, '#ffffffaa'); }
  rect(x, px + 12, py + 2, 2, 17, '#f3ead8'); rect(x, px + 2, py + 10, 22, 2, '#f3ead8');
  rect(x, px - 1, py + 20, 28, 3, '#e8dcc0'); rect(x, px - 1, py + 22, 28, 1, '#a89874');
}

function drawPicture(x, px, py, T, seed) {
  const w = 12 + Math.floor(hash2(seed, 1) * 4) * 2, h = 10 + Math.floor(hash2(seed, 2) * 3) * 2;
  rect(x, px, py, w, h, '#6a4a30'); rect(x, px + 1, py + 1, w - 2, h - 2, '#f3ead8');
  const kinds = hash2(seed, 3);
  if (kinds < 0.34) { // горы
    rect(x, px + 2, py + 2, w - 4, h - 4, '#9ad0e8');
    for (let i = 0; i < w - 4; i++) { const hh = Math.floor(3 + Math.sin(i * 0.9) * 2 + hash2(i, seed) * 2); rect(x, px + 2 + i, py + h - 2 - hh, 1, hh, '#5a8a6a'); }
  } else if (kinds < 0.67) { // кошачья мордочка
    rect(x, px + 2, py + 2, w - 4, h - 4, '#f1d8a8');
    const cx = px + Math.floor(w / 2) - 3, cy = py + Math.floor(h / 2) - 2;
    rect(x, cx, cy, 6, 5, '#2a2a33'); dot(x, cx, cy - 1, '#2a2a33'); dot(x, cx + 5, cy - 1, '#2a2a33');
    dot(x, cx + 1, cy + 2, '#e4ee55'); dot(x, cx + 4, cy + 2, '#e4ee55');
  } else { // абстракция
    rect(x, px + 2, py + 2, w - 4, h - 4, '#f0e0c0');
    rect(x, px + 3, py + 3, 4, 4, '#e0674f'); rect(x, px + 7, py + 5, 3, 3, '#3c78b4'); rect(x, px + 4, py + 7, 5, 1, '#e8b323');
  }
}

function drawClock(x, px, py, T) {
  ellipse(x, px, py, 6, 6, '#3a2a20'); ellipse(x, px, py, 5, 5, '#f6f0e0');
  rect(x, px, py - 3, 1, 3, '#2a2a33'); rect(x, px, py, 3, 1, '#2a2a33');
  for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) dot(x, px + dx, py + dy, '#b84a3a');
}

function wallBlock(x, T, tx, ty) {
  const px = tx * TILE, py = ty * TILE;
  const dark = mix(T.wains, '#000000', 0.3);
  rect(x, px, py, TILE, TILE, dark);
  rect(x, px, py, TILE, 9, mix(T.wall, '#ffffff', 0.12));
  rect(x, px, py, TILE, 1, T.trim);
  rect(x, px, py + 8, TILE, 1, mix(T.wall, '#000000', 0.25));
  rect(x, px + 1, py + 11, TILE - 2, 3, mix(T.wains, T.wainsL, 0.7));
  rect(x, px, py + 15, TILE, 1, mix(dark, '#000000', 0.5));
  rect(x, px, py, 1, TILE, mix(dark, '#000000', 0.45)); rect(x, px + TILE - 1, py, 1, TILE, mix(dark, '#000000', 0.45));
}

function drawRugTile(x, T, tx, ty, grid) {
  const px = tx * TILE, py = ty * TILE;
  const has = (dx, dy) => (grid[(ty + dy) * GW + (tx + dx)] === 1);
  rect(x, px, py, TILE, TILE, T.rug);
  const edge = !has(-1, 0) || !has(1, 0) || !has(0, -1) || !has(0, 1);
  // узор
  for (let yy = 0; yy < TILE; yy += 4) for (let xx = 0; xx < TILE; xx += 4) {
    if (((xx + yy) / 4) % 2 === 0) rect(x, px + xx + 1, py + yy + 1, 2, 2, T.rugB);
  }
  rect(x, px + 6, py + 6, 4, 4, shade(T.rug, -0.25));
  // кайма
  const b = T.rugB;
  if (!has(0, -1)) { rect(x, px, py, TILE, 3, T.rug); rect(x, px, py + 1, TILE, 1, b); }
  if (!has(0, 1)) { rect(x, px, py + TILE - 3, TILE, 3, T.rug); rect(x, px, py + TILE - 2, TILE, 1, b); }
  if (!has(-1, 0)) { rect(x, px, py, 3, TILE, T.rug); rect(x, px + 1, py, 1, TILE, b); }
  if (!has(1, 0)) { rect(x, px + TILE - 3, py, 3, TILE, T.rug); rect(x, px + TILE - 2, py, 1, TILE, b); }
  if (edge) {
    // бахрома
    if (!has(0, 1)) for (let xx = 1; xx < TILE; xx += 2) rect(x, px + xx, py + TILE, 1, 2, b);
    if (!has(0, -1)) for (let xx = 1; xx < TILE; xx += 2) rect(x, px + xx, py - 2, 1, 2, b);
  }
}

function drawIceTile(x, T, tx, ty, grid) {
  const px = tx * TILE, py = ty * TILE;
  rect(x, px, py, TILE, TILE, '#b9d9ee');
  rect(x, px, py, TILE, 1, '#8fbcdc'); rect(x, px, py, 1, TILE, '#8fbcdc');
  // блики
  for (let i = 0; i < 3; i++) {
    const sx = px + 2 + i * 5, sy = py + 11 - i * 4;
    rect(x, sx, sy, 3, 1, '#ffffff'); rect(x, sx + 1, sy - 1, 2, 1, '#ffffffcc');
  }
  dot(x, px + 12, py + 3, '#fff');
}

// Фон комнаты: полы, стены, ковры, лужи света. Возвращает canvas 384 x 224
export function buildRoomBg(themeName, world, id) {
  const T = THEMES[themeName] || THEMES.living;
  const [c, x] = mk(GW * TILE, GH * TILE);
  rect(x, 0, 0, GW * TILE, GH * TILE, T.wallD);
  drawFloor(x, T, themeName);
  // боковые и нижняя стена
  rect(x, 0, 32, 16, GH * TILE - 32, mix(T.wall, '#000000', 0.18));
  rect(x, 368, 32, 16, GH * TILE - 32, mix(T.wall, '#000000', 0.18));
  rect(x, 0, 208, GW * TILE, 16, mix(T.wall, '#000000', 0.22));
  rect(x, 15, 32, 1, 176, T.trim); rect(x, 368, 32, 1, 176, T.trim); rect(x, 16, 207, 352, 1, T.trim);
  rect(x, 0, 208, GW * TILE, 1, mix(T.wains, '#000000', 0.3));
  for (let py = 40; py < 208; py += 24) { rect(x, 4, py, 8, 1, mix(T.wall, '#000000', 0.3)); rect(x, 372, py, 8, 1, mix(T.wall, '#000000', 0.3)); }
  drawWallTop(x, T, themeName, id);
  // тени от стен на пол
  const grad = x.createLinearGradient(0, 32, 0, 44);
  grad.addColorStop(0, 'rgba(20,10,30,0.38)'); grad.addColorStop(1, 'rgba(20,10,30,0)');
  x.fillStyle = grad; x.fillRect(16, 32, 352, 12);
  const gl = x.createLinearGradient(16, 0, 26, 0);
  gl.addColorStop(0, 'rgba(20,10,30,0.28)'); gl.addColorStop(1, 'rgba(20,10,30,0)');
  x.fillStyle = gl; x.fillRect(16, 32, 10, 176);
  const gr = x.createLinearGradient(368, 0, 358, 0);
  gr.addColorStop(0, 'rgba(20,10,30,0.28)'); gr.addColorStop(1, 'rgba(20,10,30,0)');
  x.fillStyle = gr; x.fillRect(358, 32, 10, 176);
  const gb = x.createLinearGradient(0, 208, 0, 198);
  gb.addColorStop(0, 'rgba(20,10,30,0.22)'); gb.addColorStop(1, 'rgba(20,10,30,0)');
  x.fillStyle = gb; x.fillRect(16, 198, 352, 10);
  // ковры и скользкие плитки
  for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
    const g = world.ground[ty * GW + tx];
    if (g === 1) drawRugTile(x, T, tx, ty, world.ground);
    else if (g === 2) drawIceTile(x, T, tx, ty, world.ground);
  }
  // внутренние стены
  for (let ty = IN_Y; ty < IN_Y + IN_H; ty++) for (let tx = IN_X; tx < IN_X + IN_W; tx++) {
    if (world.wall[ty * GW + tx]) wallBlock(x, T, tx, ty);
  }
  x.fillStyle = 'rgba(20,10,30,0.28)';
  for (let ty = IN_Y; ty < IN_Y + IN_H - 1; ty++) for (let tx = IN_X; tx < IN_X + IN_W; tx++) {
    if (world.wall[ty * GW + tx] && !world.wall[(ty + 1) * GW + tx]) x.fillRect(tx * TILE, (ty + 1) * TILE, TILE, 4);
  }
  // солнечные лучи из окон
  x.save();
  x.globalAlpha = 0.1;
  x.fillStyle = T.light;
  for (const wx of [8 * 16 + 8, 18 * 16 + 4]) {
    x.beginPath();
    x.moveTo(wx - 8, 32); x.lineTo(wx + 18, 32); x.lineTo(wx + 70, 200); x.lineTo(wx + 38, 200);
    x.closePath(); x.fill();
  }
  x.restore();
  return c;
}

// мягкая виньетка для всей сцены (рисуется поверх)
export function buildVignette() {
  const [c, x] = mk(GW * TILE, GH * TILE);
  const g = x.createRadialGradient(192, 118, 90, 192, 118, 250);
  g.addColorStop(0, 'rgba(30,10,40,0)'); g.addColorStop(1, 'rgba(30,10,40,0.38)');
  x.fillStyle = g; x.fillRect(0, 0, GW * TILE, GH * TILE);
  return c;
}
