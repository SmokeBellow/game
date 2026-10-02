// Персонажи: Маша и Антон (спрайты для анимации), коты и босс Лапка.
import { mk, rect, dot, flipX, outline, shade, ellipse } from './px.js';

// ---------------------------------------------------------------- игроки
const PAL = {
  masha: {
    hair: '#c9a066', hairD: '#97703f', hairL: '#e8c68f', skin: '#f6cba5', skinD: '#e2a881',
    eye: '#3a2a25', blush: '#ec9f8d', mouth: '#c0705f',
    plA: '#c4291f', plB: '#1b2448', plC: '#85191a', under: '#14586a', underL: '#1f8095',
    cuff: '#27bdd2', pants: '#1fa6c4', pantsD: '#147a92', shoe: '#4a2c27', bead: '#58e0d2',
  },
  anton: {
    hair: '#b2562b', hairD: '#7c391b', hairL: '#d77f48', skin: '#f0c29c', skinD: '#d9a07a',
    eye: '#2a1d1a', blush: '#e49a86', mouth: '#8a4a3a',
    beard: '#a2512a', beardD: '#7a3a1c', hood: '#4d5aa8', hoodD: '#39448a', hoodL: '#6676c4',
    strap: '#42424c', glass: '#22222b', lens: '#cfe8f5', tee: '#e6dcc8',
    pants: '#2b3254', pantsD: '#1e2440', shoe: '#ecebf2', sole: '#9998a8',
    pack: '#5e6458', packD: '#454a40',
  },
};

const STEP = [0, 1, 0, -1];
const BOB = [0, 1, 0, 1];

function plaid(x, P, px, py, w, h) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const vx = (xx + 1) % 4 === 0, hy = (yy + 1) % 4 === 0;
      let c = P.plA;
      if (vx && hy) c = P.plC;
      else if (vx || hy) c = P.plB;
      else if ((xx + yy) % 5 === 0) c = P.plC;
      dot(x, px + xx, py + yy, c);
    }
  }
}

function legs(x, P, who, step, by) {
  const lift = (s) => (step === s ? 1 : 0);
  const pants = P.pants;
  rect(x, 4, 17 + by - lift(1), 3, 5 + lift(1), pants);
  rect(x, 9, 17 + by - lift(-1), 3, 5 + lift(-1), pants);
  if (who === 'masha') {
    rect(x, 4, 19, 1, 2, P.pantsD); rect(x, 9, 19, 1, 2, P.pantsD);
  }
  rect(x, 3, 22 - lift(1), 4, 2, P.shoe);
  rect(x, 9, 22 - lift(-1), 4, 2, P.shoe);
  if (who === 'anton') { rect(x, 3, 23 - lift(1), 4, 1, P.sole); rect(x, 9, 23 - lift(-1), 4, 1, P.sole); }
}

function drawFront(x, who, step, b, mode) {
  const P = PAL[who];
  if (who === 'masha') {
    // длинные волосы позади
    rect(x, 2, 2 + b, 2, 13, P.hair); rect(x, 12, 2 + b, 2, 13, P.hair);
    rect(x, 2, 12 + b, 1, 3, P.hairD); rect(x, 13, 12 + b, 1, 3, P.hairD);
    legs(x, P, who, step, b);
    plaid(x, P, 4, 11 + b, 8, 7);
    rect(x, 7, 11 + b, 2, 7, P.under);
    rect(x, 5, 10 + b, 6, 2, P.under); rect(x, 5, 10 + b, 6, 1, P.underL);
    dot(x, 6, 12 + b, P.bead); dot(x, 9, 12 + b, P.bead); dot(x, 7, 13 + b, P.bead); dot(x, 8, 13 + b, P.bead);
    const sl = step === 1 ? 1 : step === -1 ? -1 : 0;
    for (const [ax, s] of [[2, sl], [12, -sl]]) {
      plaid(x, P, ax, 11 + b + s, 2, 4);
      rect(x, ax, 15 + b + s, 2, 1, P.cuff);
      rect(x, ax, 16 + b + s, 2, 2, P.skin);
    }
    // голова
    rect(x, 3, 2 + b, 10, 8, P.skin); rect(x, 4, 1 + b, 8, 1, P.skin); rect(x, 4, 10 + b, 8, 0, P.skin);
    dot(x, 3, 2 + b, '#0000');
    rect(x, 3, 1 + b, 10, 3, P.hair); rect(x, 4, 0 + b, 8, 1, P.hair);
    rect(x, 3, 3 + b, 2, 4, P.hair); rect(x, 11, 3 + b, 2, 3, P.hair);
    rect(x, 5, 3 + b, 3, 1, P.hair); // чёлка набок
    rect(x, 6, 1 + b, 3, 1, P.hairL); rect(x, 10, 1 + b, 2, 1, P.hairL);
    rect(x, 3, 6 + b, 1, 1, P.hairD); rect(x, 12, 5 + b, 1, 1, P.hairD);
    if (mode === 'hug') {
      rect(x, 5, 6 + b, 2, 1, P.eye); rect(x, 9, 6 + b, 2, 1, P.eye);
      dot(x, 5, 7 + b, P.skin); dot(x, 10, 7 + b, P.skin);
      rect(x, 7, 9 + b, 2, 1, P.mouth); dot(x, 6, 8 + b, P.mouth); dot(x, 9, 8 + b, P.mouth);
    } else {
      rect(x, 5, 6 + b, 1, 2, P.eye); rect(x, 10, 6 + b, 1, 2, P.eye);
      dot(x, 5, 6 + b, '#6a4a3e'); dot(x, 10, 6 + b, '#6a4a3e');
      rect(x, 7, 9 + b, 2, 1, P.mouth);
    }
    dot(x, 4, 8 + b, P.blush); dot(x, 11, 8 + b, P.blush);
  } else {
    legs(x, P, who, step, b);
    rect(x, 4, 11 + b, 8, 7, P.hood);
    rect(x, 4, 10 + b, 8, 2, P.hoodL); rect(x, 7, 10 + b, 2, 1, P.tee);
    rect(x, 6, 12 + b, 1, 2, '#c9cfe6'); rect(x, 9, 12 + b, 1, 2, '#c9cfe6');
    rect(x, 5, 11 + b, 1, 6, P.strap); rect(x, 10, 11 + b, 1, 6, P.strap);
    rect(x, 5, 15 + b, 6, 2, P.hoodD);
    const sl = step === 1 ? 1 : step === -1 ? -1 : 0;
    for (const [ax, s] of [[2, sl], [12, -sl]]) {
      rect(x, ax, 11 + b + s, 2, 5, P.hood);
      rect(x, ax, 15 + b + s, 2, 1, P.hoodD);
      rect(x, ax, 16 + b + s, 2, 2, P.skin);
    }
    rect(x, 3, 2 + b, 10, 8, P.skin); rect(x, 4, 1 + b, 8, 1, P.skin);
    rect(x, 3, 0 + b, 10, 3, P.hair); rect(x, 4, -1 + b < 0 ? 0 : -1 + b, 8, 1, P.hairL);
    rect(x, 3, 3 + b, 1, 3, P.hairD); rect(x, 12, 3 + b, 1, 3, P.hairD);
    rect(x, 4, 3 + b, 3, 1, P.hair); rect(x, 8, 3 + b, 3, 1, P.hair);
    // борода
    rect(x, 3, 7 + b, 10, 3, P.beard); rect(x, 4, 10 + b, 8, 0, P.beard);
    rect(x, 7, 9 + b, 2, 1, mode === 'hug' ? '#6a3a2e' : P.skinD);
    rect(x, 3, 9 + b, 2, 1, P.beardD); rect(x, 11, 9 + b, 2, 1, P.beardD);
    // очки
    rect(x, 4, 5 + b, 4, 3, P.glass); rect(x, 9, 5 + b, 4, 3, P.glass);
    rect(x, 5, 6 + b, 2, 1, P.lens); rect(x, 10, 6 + b, 2, 1, P.lens);
    rect(x, 8, 6 + b, 1, 1, P.glass);
    if (mode === 'hug') { rect(x, 5, 6 + b, 2, 1, P.glass); rect(x, 10, 6 + b, 2, 1, P.glass); } else {
      dot(x, 6, 6 + b, P.eye); dot(x, 11, 6 + b, P.eye);
    }
  }
}

function drawBack(x, who, step, b) {
  const P = PAL[who];
  if (who === 'masha') {
    legs(x, P, who, step, b);
    plaid(x, P, 4, 11 + b, 8, 7);
    rect(x, 5, 10 + b, 6, 1, P.under);
    const sl = step === 1 ? 1 : step === -1 ? -1 : 0;
    for (const [ax, s] of [[2, sl], [12, -sl]]) {
      plaid(x, P, ax, 11 + b + s, 2, 4);
      rect(x, ax, 15 + b + s, 2, 1, P.cuff);
      rect(x, ax, 16 + b + s, 2, 2, P.skin);
    }
    rect(x, 3, 1 + b, 10, 15, P.hair); rect(x, 4, 0 + b, 8, 1, P.hair);
    rect(x, 3, 14 + b, 10, 2, P.hairD);
    for (const sx of [5, 8, 10]) rect(x, sx, 3 + b, 1, 11, P.hairL);
    rect(x, 7, 4 + b, 1, 11, P.hairD);
    rect(x, 3, 1 + b, 1, 14, P.hairD); rect(x, 12, 1 + b, 1, 14, P.hairD);
  } else {
    legs(x, P, who, step, b);
    rect(x, 4, 11 + b, 8, 7, P.hood);
    const sl = step === 1 ? 1 : step === -1 ? -1 : 0;
    for (const [ax, s] of [[2, sl], [12, -sl]]) {
      rect(x, ax, 11 + b + s, 2, 5, P.hood);
      rect(x, ax, 15 + b + s, 2, 1, P.hoodD);
      rect(x, ax, 16 + b + s, 2, 2, P.skin);
    }
    // рюкзак
    rect(x, 4, 11 + b, 8, 7, P.pack); rect(x, 5, 15 + b, 6, 3, P.packD); rect(x, 7, 16 + b, 2, 1, '#9aa090');
    rect(x, 4, 11 + b, 8, 1, P.packD);
    rect(x, 4, 10 + b, 8, 1, P.hoodL);
    rect(x, 3, 1 + b, 10, 9, P.hair); rect(x, 4, 0 + b, 8, 1, P.hairL);
    rect(x, 3, 7 + b, 10, 2, P.hairD); rect(x, 5, 9 + b, 6, 1, P.skinD);
    rect(x, 6, 3 + b, 4, 1, P.hairL);
  }
}

function drawSide(x, who, step, b, mode) {
  const P = PAL[who];
  // порядок слоёв для взгляда вправо
  const front = step, back = -step;
  const legDraw = () => {
    // дальняя нога
    rect(x, 6 + back, 17 + b, 3, 5, who === 'masha' ? P.pantsD : P.pantsD);
    rect(x, 5 + back, 22 - (back === 1 ? 1 : 0), 4, 2, P.shoe);
    // ближняя нога
    rect(x, 7 + front, 17 + b, 3, 5, P.pants);
    rect(x, 7 + front, 22 - (front === 1 ? 1 : 0), 5, 2, P.shoe);
    if (who === 'anton') { rect(x, 5 + back, 23, 4, 1, P.sole); rect(x, 7 + front, 23, 5, 1, P.sole); }
  };
  if (who === 'masha') {
    rect(x, 2, 2 + b, 5, 14, P.hair); rect(x, 2, 13 + b, 3, 3, P.hairD);
    legDraw();
    plaid(x, P, 5, 11 + b, 6, 7);
    rect(x, 9, 11 + b, 2, 7, P.under); rect(x, 8, 10 + b, 3, 2, P.under);
    dot(x, 10, 12 + b, P.bead); dot(x, 10, 13 + b, P.bead);
    const arm = step;
    plaid(x, P, 7 + arm, 11 + b, 3, 4);
    rect(x, 7 + arm, 15 + b, 3, 1, P.cuff); rect(x, 7 + arm, 16 + b, 3, 2, P.skin);
    rect(x, 4, 2 + b, 8, 8, P.skin); rect(x, 5, 1 + b, 6, 1, P.skin);
    rect(x, 4, 1 + b, 7, 3, P.hair); rect(x, 5, 0 + b, 5, 1, P.hair);
    rect(x, 4, 3 + b, 4, 6, P.hair); rect(x, 8, 3 + b, 3, 1, P.hair); rect(x, 10, 4 + b, 1, 1, P.hair);
    rect(x, 6, 1 + b, 3, 1, P.hairL);
    rect(x, 10, 6 + b, 1, 2, P.eye); dot(x, 12, 7 + b, P.skinD);
    dot(x, 10, 9 + b, P.mouth); dot(x, 9, 8 + b, P.blush);
  } else {
    // рюкзак позади
    rect(x, 2, 11 + b, 4, 7, P.pack); rect(x, 2, 15 + b, 3, 3, P.packD);
    legDraw();
    rect(x, 5, 11 + b, 6, 7, P.hood); rect(x, 5, 10 + b, 6, 2, P.hoodL);
    rect(x, 5, 15 + b, 5, 2, P.hoodD);
    rect(x, 8, 11 + b, 1, 6, P.strap);
    const arm = step;
    rect(x, 7 + arm, 11 + b, 3, 5, P.hood); rect(x, 7 + arm, 15 + b, 3, 1, P.hoodD); rect(x, 7 + arm, 16 + b, 3, 2, P.skin);
    rect(x, 4, 2 + b, 8, 8, P.skin); rect(x, 5, 1 + b, 6, 1, P.skin);
    rect(x, 3, 0 + b, 8, 4, P.hair); rect(x, 4, -0 + b, 6, 1, P.hairL); rect(x, 3, 3 + b, 3, 5, P.hair);
    rect(x, 8, 3 + b, 3, 1, P.hair);
    rect(x, 7, 7 + b, 5, 3, P.beard); rect(x, 6, 8 + b, 1, 2, P.beardD);
    dot(x, 10, 9 + b, P.skinD);
    rect(x, 9, 5 + b, 3, 3, P.glass); rect(x, 10, 6 + b, 1, 1, P.lens); dot(x, 11, 6 + b, P.eye);
    rect(x, 6, 6 + b, 3, 1, P.glass);
  }
}


// ---------------------------------------------------------------- шапочки (награды за звёзды)
export const HATS = [
  { id: 'none', name: 'Без шапки', stars: 0 },
  { id: 'beanie', name: 'Вязаная шапка', stars: 8 },
  { id: 'bow', name: 'Бант', stars: 20 },
  { id: 'ears', name: 'Кошачьи ушки', stars: 32 },
  { id: 'chef', name: 'Колпак повара', stars: 46 },
  { id: 'crown', name: 'Корона уюта', stars: 60 },
];

// b — смещение головы по вертикали; side — вид сбоку (голова смещена влево на 1 px)
function drawHat(x, hat, dir, b) {
  if (!hat || hat === 'none') return;
  const side = dir === 'right';
  const x0 = side ? 3 : 3, w = side ? 9 : 10;
  switch (hat) {
    case 'beanie':
      rect(x, x0, -2 + b, w, 4, '#e8745e'); rect(x, x0, 1 + b, w, 1, '#f6b0a0');
      for (let i = 0; i < w; i += 2) dot(x, x0 + i, 0 + b, '#c4503c');
      rect(x, x0 + (w >> 1) - 1, -4 + b, 3, 2, '#ffffff'); dot(x, x0 + (w >> 1), -5 + b, '#ffffff');
      break;
    case 'bow': {
      const bx = side ? 9 : (dir === 'up' ? 11 : 10);
      rect(x, bx, -1 + b, 5, 4, '#ff7aa8'); rect(x, bx + 2, 0 + b, 1, 2, '#c43a70');
      dot(x, bx, -1 + b, '#ffc0d8'); dot(x, bx + 4, -1 + b, '#ffc0d8');
      break;
    }
    case 'ears':
      rect(x, x0, 0 + b, w, 1, '#2a2a33');
      rect(x, x0 + 1, -3 + b, 3, 3, '#2a2a33'); rect(x, x0 + w - 4, -3 + b, 3, 3, '#2a2a33');
      dot(x, x0 + 2, -2 + b, '#e8a0b0'); dot(x, x0 + w - 3, -2 + b, '#e8a0b0');
      break;
    case 'chef':
      rect(x, x0, -1 + b, w, 2, '#e6e2da');
      rect(x, x0 - 1, -4 + b, w + 2, 3, '#ffffff'); rect(x, x0 + 1, -6 + b, w - 2, 3, '#ffffff');
      rect(x, x0 + 2, -7 + b, w - 4, 1, '#ffffff'); dot(x, x0 + 3, -5 + b, '#d8d4cc'); dot(x, x0 + w - 4, -3 + b, '#d8d4cc');
      break;
    case 'crown':
      rect(x, x0, -1 + b, w, 3, '#f4c430'); rect(x, x0, 1 + b, w, 1, '#c99a10');
      rect(x, x0, -3 + b, 2, 2, '#f4c430'); rect(x, x0 + (w >> 1) - 1, -4 + b, 2, 3, '#f4c430'); rect(x, x0 + w - 2, -3 + b, 2, 2, '#f4c430');
      dot(x, x0 + (w >> 1), 0 + b, '#e84a5a'); dot(x, x0 + 2, 0 + b, '#58c8e8'); dot(x, x0 + w - 3, 0 + b, '#58e8a0');
      break;
    default: break;
  }
}

export function hatIcon(hat) {
  const [c, x] = mk(16, 14);
  x.translate(0, 8);
  if (hat === 'none') { rect(x, 4, -2, 8, 6, '#00000000'); rect(x, 5, 0, 6, 1, '#b8a898'); rect(x, 7, -2, 2, 5, '#b8a898'); } else drawHat(x, hat, 'down', 0);
  return outline(c);
}

// frames[who][dir] = { walk: [4], idle: [2], hug: [1] }; каждый кадр — {c, ax, ay}
export function buildPlayers(hat = 'none') {
  const out = {};
  for (const who of ['masha', 'anton']) {
    out[who] = {};
    const make = (dir, mode, f) => {
      const [c, x] = mk(16, 29);
      x.translate(0, 5);
      const walking = mode === 'walk';
      const step = walking ? STEP[f] : 0;
      let b = walking ? BOB[f] : (mode === 'idle' ? f : 0);
      if (mode === 'hug') b = f;
      if (dir === 'down') drawFront(x, who, step, b, mode);
      else if (dir === 'up') drawBack(x, who, step, b);
      else drawSide(x, who, step, b, mode);
      drawHat(x, hat, dir, b);
      return { c: outline(c), ax: 9, ay: 30 };
    };
    for (const dir of ['down', 'up', 'right']) {
      out[who][dir] = {
        walk: [0, 1, 2, 3].map((f) => make(dir, 'walk', f)),
        idle: [0, 1].map((f) => make(dir, 'idle', f)),
        hug: [make(dir, 'hug', 0), make(dir, 'hug', 1)],
      };
    }
    out[who].left = {};
    for (const k of ['walk', 'idle', 'hug']) {
      out[who].left[k] = out[who].right[k].map((fr) => ({ c: flipX(fr.c), ax: fr.c.width - fr.ax, ay: fr.ay }));
    }
  }
  return out;
}

// ---------------------------------------------------------------- коты
export const CAT_PAL = {
  black: { b: '#2a2a33', d: '#16161c', l: '#4a4a58', belly: '#34343f', eye: '#e4ee55', nose: '#9a5a68', ear: '#6a4450', line: '#0c0a10' },
  orange: { b: '#e88b3d', d: '#b5601f', l: '#f8bb78', belly: '#fadcae', eye: '#3a9a46', nose: '#d86b7a', ear: '#f5a9a9', line: '#3a2418', stripe: '#c46a22' },
  gray: { b: '#8d93a6', d: '#666c80', l: '#bcc2d2', belly: '#d6dae6', eye: '#e8c640', nose: '#d58a96', ear: '#e5b0ba', line: '#2a2a3a' },
  white: { b: '#f2efe9', d: '#cdc8bf', l: '#ffffff', belly: '#ffffff', eye: '#3b7ec4', nose: '#f0a1ad', ear: '#f9c9d0', line: '#4a4256', patch: '#e08a3d', patch2: '#3a3a44' },
};

function catSide(x, P, f, pose) {
  // кот смотрит вправо; холст 20 x 14
  const sway = pose === 'walk' ? (f % 2) : 0;
  const lift = pose === 'walk' ? [[1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]][f % 4] : [0, 0, 0, 0];
  const headY = pose === 'eat' ? 3 + (f % 2) : 0;
  const crouch = pose === 'crouch' ? 1 : 0;
  // хвост
  const tail = sway ? [[3, 8], [2, 7], [1, 6], [1, 5], [0, 4], [1, 3]] : [[3, 8], [2, 7], [2, 6], [1, 5], [1, 4], [2, 3]];
  for (const [tx, ty] of tail) rect(x, tx, ty + crouch, 2, 2, P.b);
  dot(x, tail[tail.length - 1][0], tail[tail.length - 1][1] + crouch, P.d);
  // тело
  rect(x, 4, 6 + crouch, 10, 5, P.b); rect(x, 3, 7 + crouch, 1, 3, P.b);
  rect(x, 5, 6 + crouch, 8, 1, P.l); rect(x, 5, 10 + crouch, 8, 1, P.belly);
  rect(x, 3, 7 + crouch, 3, 3, P.d);
  if (P.stripe) { for (const sx of [6, 8, 10]) rect(x, sx, 6 + crouch, 1, 3, P.stripe); }
  if (P.patch) { rect(x, 5, 6, 3, 3, P.patch); rect(x, 10, 7, 3, 3, P.patch2); }
  // ножки
  const ly = 11 + crouch;
  rect(x, 4, ly - lift[0], 2, 3 - crouch + lift[0], P.d);
  rect(x, 7, ly - lift[1], 2, 3 - crouch + lift[1], P.b);
  rect(x, 10, ly - lift[2], 2, 3 - crouch + lift[2], P.d);
  rect(x, 13, ly - lift[3], 2, 3 - crouch + lift[3], P.b);
  // голова
  const hy = 4 + headY + crouch;
  rect(x, 13, hy, 6, 6, P.b); rect(x, 14, hy - 1, 4, 1, P.b);
  rect(x, 13, hy - 2, 2, 2, P.b); rect(x, 17, hy - 2, 2, 2, P.b);
  dot(x, 14, hy - 1, P.ear); dot(x, 18, hy - 1, P.ear);
  rect(x, 14, hy, 4, 1, P.l);
  rect(x, 17, hy + 2, 2, 1, P.eye); dot(x, 18, hy + 2, '#10100c');
  dot(x, 19, hy + 3, P.nose); rect(x, 16, hy + 5, 3, 1, P.belly);
  if (P.patch) { rect(x, 13, hy - 2, 3, 3, P.patch2); }
}

function catFront(x, P, f, pose) {
  // холст 14 x 15
  const sit = pose === 'sit';
  const lift = pose === 'walk' ? (f % 2) : 0;
  // хвост сбоку
  rect(x, 11, sit ? 9 : 8, 2, 5, P.d); rect(x, 12, sit ? 8 : 7, 1, 2, P.d);
  // тело
  rect(x, 3, sit ? 7 : 7, 8, sit ? 7 : 6, P.b);
  rect(x, 5, sit ? 9 : 9, 4, sit ? 5 : 4, P.belly);
  if (P.stripe) { rect(x, 3, 8, 1, 2, P.stripe); rect(x, 10, 8, 1, 2, P.stripe); }
  // лапки
  const py = sit ? 13 : 12;
  rect(x, 4, py - (lift ? 1 : 0), 2, 2, P.l); rect(x, 8, py - (lift ? 0 : 1), 2, 2, P.l);
  // голова
  rect(x, 2, 2, 10, 7, P.b); rect(x, 3, 1, 8, 1, P.b);
  rect(x, 2, 0, 2, 3, P.b); rect(x, 10, 0, 2, 3, P.b);
  dot(x, 3, 1, P.ear); dot(x, 10, 1, P.ear);
  rect(x, 4, 2, 6, 1, P.l);
  const blink = pose === 'sit' && f === 1;
  if (blink) { rect(x, 3, 5, 3, 1, P.d); rect(x, 8, 5, 3, 1, P.d); }
  else { rect(x, 3, 4, 3, 2, P.eye); rect(x, 8, 4, 3, 2, P.eye); dot(x, 4, 4, '#10100c'); dot(x, 9, 4, '#10100c'); dot(x, 4, 5, '#10100c'); dot(x, 9, 5, '#10100c'); }
  rect(x, 6, 6, 2, 1, P.nose); rect(x, 5, 8, 4, 1, P.belly);
  if (P.patch) { rect(x, 2, 0, 5, 3, P.patch2); rect(x, 7, 5, 4, 3, P.patch); }
}

function catBack(x, P, f) {
  const lift = f % 2;
  rect(x, 6, 0 + lift, 2, 8, P.d); rect(x, 5, 0 + lift, 4, 2, P.b);
  rect(x, 3, 6, 8, 7, P.b); rect(x, 3, 6, 8, 1, P.l);
  rect(x, 3, 3, 8, 5, P.b); rect(x, 3, 1, 2, 3, P.b); rect(x, 9, 1, 2, 3, P.b);
  dot(x, 4, 2, P.ear); dot(x, 9, 2, P.ear);
  rect(x, 4, 12 - (lift ? 1 : 0), 2, 2, P.d); rect(x, 8, 12 - (lift ? 0 : 1), 2, 2, P.d);
  if (P.stripe) { for (const sy of [8, 10]) rect(x, 3, sy, 8, 1, P.stripe); }
  if (P.patch) { rect(x, 3, 7, 4, 5, P.patch); rect(x, 8, 4, 3, 3, P.patch2); }
}

function catSleep(x, P, f) {
  // клубочек, холст 16 x 10
  const br = f % 2;
  rect(x, 1, 3 + br, 14, 6 - br, P.b);
  rect(x, 2, 2 + br, 12, 1, P.b);
  rect(x, 2, 3 + br, 12, 1, P.l);
  rect(x, 3, 8, 10, 1, P.d);
  // хвост вокруг
  rect(x, 1, 7, 12, 2, P.d);
  // голова, уткнувшаяся в бок
  rect(x, 9, 2, 6, 5, P.b); rect(x, 9, 0, 2, 3, P.b); rect(x, 13, 0, 2, 3, P.b);
  dot(x, 10, 1, P.ear); dot(x, 14, 1, P.ear);
  rect(x, 10, 4, 2, 1, P.d); rect(x, 13, 4, 2, 1, P.d);
  dot(x, 12, 5, P.nose);
  if (P.stripe) { for (const sx of [3, 5, 7]) rect(x, sx, 3 + br, 1, 3, P.stripe); }
  if (P.patch) { rect(x, 2, 3, 4, 5, P.patch); }
}

export function buildCats() {
  const out = {};
  for (const [name, P] of Object.entries(CAT_PAL)) {
    const col = P.line;
    const wrap = (c, w, h, ax, ay) => ({ c: outline(c, col), ax: ax + 1, ay: ay + 1, w, h });
    const side = (pose, f) => { const [c, x] = mk(20, 14); catSide(x, P, f, pose); return wrap(c, 20, 14, 10, 14); };
    const front = (pose, f) => { const [c, x] = mk(14, 15); catFront(x, P, f, pose); return wrap(c, 14, 15, 7, 15); };
    const back = (f) => { const [c, x] = mk(14, 14); catBack(x, P, f); return wrap(c, 14, 14, 7, 14); };
    const sleep = (f) => { const [c, x] = mk(16, 10); catSleep(x, P, f); return wrap(c, 16, 10, 8, 10); };
    const mirror = (fr) => ({ c: flipX(fr.c), ax: fr.c.width - fr.ax, ay: fr.ay });
    const set = {
      walkR: [0, 1, 2, 3].map((f) => side('walk', f)),
      eatR: [0, 1].map((f) => side('eat', f)),
      crouchR: [0, 1].map((f) => side('crouch', f)),
      idleR: [0, 1].map((f) => side('idle', f)),
      walkD: [0, 1].map((f) => front('walk', f)),
      sit: [0, 1].map((f) => front('sit', f)),
      walkU: [0, 1].map((f) => back(f)),
      sleep: [0, 1].map((f) => sleep(f)),
    };
    set.walkL = set.walkR.map(mirror);
    set.eatL = set.eatR.map(mirror);
    set.crouchL = set.crouchR.map(mirror);
    set.idleL = set.idleR.map(mirror);
    out[name] = set;
  }
  return out;
}

// ---------------------------------------------------------------- босс Лапка (спит с книжкой)
export function buildBoss() {
  const P = CAT_PAL.black;
  const frames = {};
  const draw = (mode, f) => {
    const [c, x] = mk(52, 34);
    const br = f % 2;
    // книжка
    rect(x, 1, 20, 18, 11, '#7a3b2e'); rect(x, 2, 19, 16, 11, '#f1ead6'); rect(x, 9, 19, 1, 11, '#c9bfa0');
    for (let i = 0; i < 4; i++) { rect(x, 3, 21 + i * 2, 5, 1, '#a99f84'); rect(x, 11, 21 + i * 2, 5, 1, '#a99f84'); }
    rect(x, 1, 29, 18, 2, '#5c2a21');
    // хвост
    rect(x, 40, 22, 8, 3, P.d); rect(x, 46, 20, 3, 3, P.d); rect(x, 48, 17, 2, 4, P.d);
    // тело
    rect(x, 14, 14 + br, 28, 15 - br, P.b);
    rect(x, 15, 13 + br, 26, 1, P.b);
    rect(x, 16, 14 + br, 24, 2, P.l);
    rect(x, 14, 26, 28, 3, P.d);
    // пушистый хвост-плюш, лапа сзади
    rect(x, 34, 22, 9, 8, P.d); rect(x, 36, 24, 5, 5, P.b);
    // передние лапы к книжке
    rect(x, 8, 24, 14, 5, P.b); rect(x, 8, 26, 14, 3, P.d); rect(x, 6, 25, 3, 4, P.l);
    dot(x, 7, 27, '#9a7b84'); dot(x, 9, 28, '#9a7b84');
    // голова
    const hy = mode === 'warn' ? 6 : 10;
    rect(x, 6, hy, 16, 14, P.b); rect(x, 7, hy - 1, 14, 1, P.b);
    rect(x, 6, hy - 4, 4, 5, P.b); rect(x, 18, hy - 4, 4, 5, P.b);
    rect(x, 7, hy - 3, 2, 3, P.ear); rect(x, 19, hy - 3, 2, 3, P.ear);
    rect(x, 8, hy, 12, 2, P.l);
    if (mode === 'warn') {
      rect(x, 8, hy + 5, 4, 3, P.eye); rect(x, 16, hy + 5, 4, 3, P.eye);
      rect(x, 9, hy + 5, 2, 3, '#0c0a10'); rect(x, 17, hy + 5, 2, 3, '#0c0a10');
      rect(x, 11, hy + 10, 6, 3, '#14080c'); rect(x, 12, hy + 11, 4, 1, '#d86a7a');
    } else {
      rect(x, 8, hy + 6, 4, 1, P.eye); rect(x, 16, hy + 6, 4, 1, P.eye);
      rect(x, 8, hy + 5, 4, 1, P.d); rect(x, 16, hy + 5, 4, 1, P.d);
    }
    rect(x, 13, hy + 8, 2, 1, P.nose);
    rect(x, 11, hy + 10 + (mode === 'warn' ? 3 : 0), 6, 1, P.belly);
    // усы
    for (const [sx, dir] of [[3, -1], [22, 1]]) { rect(x, sx, hy + 8, 4, 1, '#8a8a96'); rect(x, sx + dir, hy + 10, 3, 1, '#8a8a96'); }
    return { c: outline(x.canvas, P.line), ax: 27, ay: 36, w: 52, h: 34 };
  };
  frames.sleep = [draw('sleep', 0), draw('sleep', 1)];
  frames.warn = [draw('warn', 0), draw('warn', 1)];
  return frames;
}
