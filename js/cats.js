// Поведение котов. Спугнуть кота нельзя — его можно только отвлечь миской или лазером.
import { TILE, CFG } from './defs.js';
import { range, dist } from './util.js';

const catTile = (c) => [Math.floor(c.x / TILE), Math.floor((c.y - 5) / TILE)];

export function makeCat(w, cfg, kind, tx, ty) {
  const sleeper = kind === 'sleeper';
  return {
    id: w.nextId++, kind, color: cfg.color || 'black',
    budget: sleeper ? 0 : (cfg.budget ?? 4),
    prowl: !!cfg.prowl,
    state: sleeper ? 'sleep' : 'idle',
    solid: sleeper, htx: tx, hty: ty,
    t: range(w.rng, 0.4, 2), shedT: range(w.rng, 1.5, 3.5),
    x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE + 5,
    dir: 'down', path: null, pi: 0, hugCd: 2, hugT: 0, pathT: 0, eatT: 0, fed: 0,
    prowlT: 0, anim: 0, moving: false, pounce: false, ignoreBowl: null,
  };
}

// прямоугольник для столкновений (спящий кот перекрывает всю клетку)
export function catRect(c) {
  if (c.solid) return [c.htx * TILE, c.hty * TILE, c.htx * TILE + TILE, c.hty * TILE + TILE];
  return [c.x - 6, c.y - 8, c.x + 6, c.y];
}

export function wakeCat(w, c) {
  if (c.state !== 'sleep') return;
  c.solid = false;
  c.state = 'idle';
  c.t = 0;
  w.stats.woke++;
  w.ev.push({ t: 'meow', x: c.x, y: c.y, kind: 'wake' });
}

function goTo(w, c, tx, ty) {
  const [sx, sy] = catTile(c);
  const path = w.findPath(sx, sy, tx, ty);
  if (!path) return false;
  c.path = path;
  c.pi = 0;
  return true;
}

// ближайшая к цели клетка среди тех, куда кошка вообще может дойти
function nearestReachable(w, c, gx, gy) {
  const [sx, sy] = catTile(c);
  const seen = new Set([`${sx},${sy}`]);
  const q = [[sx, sy]];
  let best = null, bd = Infinity;
  for (let h = 0; h < q.length && h < 900; h++) {
    const [x, y] = q[h];
    const d = (x - gx) ** 2 + (y - gy) ** 2;
    if (d < bd) { bd = d; best = [x, y]; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (seen.has(k) || !w.walkable(nx, ny)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return best;
}

function follow(c, dt, speed) {
  c.moving = false;
  if (!c.path || c.pi >= c.path.length) return true;
  const [tx, ty] = c.path[c.pi];
  const gx = (tx + 0.5) * TILE, gy = (ty + 0.5) * TILE + 5;
  const dx = gx - c.x, dy = gy - c.y;
  const d = Math.hypot(dx, dy);
  const step = speed * dt;
  c.moving = true;
  if (Math.abs(dx) > Math.abs(dy) * 0.8) c.dir = dx > 0 ? 'right' : 'left';
  else c.dir = dy > 0 ? 'down' : 'up';
  if (d <= step) {
    c.x = gx; c.y = gy; c.pi++;
    return c.pi >= c.path.length;
  }
  c.x += (dx / d) * step;
  c.y += (dy / d) * step;
  return false;
}

export function shed(w, c, n) {
  for (let i = 0; i < n && c.budget > 0; i++) {
    const ox = (i === 0 ? -1 : 1) * range(w.rng, 2, 5) * (n > 1 ? 1 : (w.rng() < 0.5 ? -1 : 1));
    const oy = range(w.rng, -2, 3);
    w.addWool(c.x + ox, c.y - 3 + oy);
    c.budget--;
    w.ev.push({ t: 'shed', x: c.x + ox, y: c.y - 3 + oy });
  }
}

function startIdle(c, w, lo = 1, hi = 3) {
  c.lureBowl = null;
  c.partial = false;
  c.state = 'idle';
  c.path = null;
  c.t = range(w.rng, lo, hi);
  c.moving = false;
}

function wander(w, c) {
  const [cx, cy] = catTile(c);
  const r = c.budget > 0 ? 7 : 5;
  for (let k = 0; k < 10; k++) {
    const tx = cx + Math.round(range(w.rng, -r, r));
    const ty = cy + Math.round(range(w.rng, -r * 0.7, r * 0.7));
    if (!w.walkable(tx, ty)) continue;
    if (goTo(w, c, tx, ty)) { c.state = 'walk'; return; }
  }
  startIdle(c, w, 0.8, 1.6);
}

function startLure(w, c) {
  const b = w.bowl;
  const slots = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 0]];
  const off = slots[(b.eaters + (c.id % 3)) % slots.length];
  let ok = false;
  for (let i = 0; i < slots.length && !ok; i++) {
    const s = slots[(slots.indexOf(off) + i) % slots.length];
    const tx = b.tx + s[0], ty = b.ty + s[1];
    if (w.walkable(tx, ty) && goTo(w, c, tx, ty)) ok = true;
  }
  if (ok) {
    c.state = 'lure';
    c.lureBowl = b;
    c.eatT = 0;
    c.gallopT = 0;
    w.ev.push({ t: 'meow', x: c.x, y: c.y, kind: 'call' });
  } else {
    // дойти до миски нельзя (стена, пуфик): бежим к ближайшей доступной точке и ждём там
    c.ignoreBowl = b;
    const best = nearestReachable(w, c, b.tx, b.ty);
    if (best && goTo(w, c, best[0], best[1])) {
      c.state = 'lure';
      c.lureBowl = b;
      c.partial = true;
      c.gallopT = 0;
      w.ev.push({ t: 'meow', x: c.x, y: c.y, kind: 'call' });
    }
  }
}

function startLaser(w, c) {
  const L = w.laser;
  const tile = w.nearestWalkable(Math.floor(L.x / TILE), Math.floor(L.y / TILE));
  if (!tile) return;
  if (goTo(w, c, tile[0], tile[1])) { c.state = 'laser'; c.pathT = 0.3; }
}

export function updateCat(w, c, dt) {
  const p = w.player;
  if (c.hugCd > 0) c.hugCd -= dt;
  if (c.fed > 0) c.fed -= dt;
  c.anim += dt;

  if (c.state === 'sleep') {
    // лазер тоже будит спящего кота
    if (w.laser.on && dist(c.x, c.y, w.laser.x, w.laser.y) < 150) wakeCat(w, c);
    return;
  }

  // линька: шерсть падает, пока кот не занят
  const sheds = c.state !== 'hug' && c.state !== 'eat';
  if (sheds && c.budget > 0) {
    // когда вся шерсть на полу уже убрана, коты торопятся — не заставляем ждать
    if (w.remainingWool() === 0 && c.shedT > 0.9) c.shedT = 0.9;
    c.shedT -= dt;
    if (c.shedT <= 0) {
      shed(w, c, 1);
      c.shedT = range(w.rng, 3.2, 5.2);
    }
  }

  // отвлечение: миска важнее лазера, лазер важнее погони
  const busy = c.state === 'hug' || c.state === 'eat';
  if (!busy) {
    const b = w.bowl;
    if (b && c.fed <= 0 && c.state !== 'lure' && c.ignoreBowl !== b) startLure(w, c);
    else if (!b && w.laser.on && c.state !== 'laser') startLaser(w, c);
    else if (c.state === 'laser' && !w.laser.on) { startIdle(c, w, 1, 2); c.pounce = false; }
    else if (c.state === 'lure' && (!w.bowl || w.bowl !== c.lureBowl)) startIdle(c, w, 0.5, 1.5);
    else if (c.prowl && c.budget > 0 && c.hugCd <= 0 && p.frozen <= 0 && !w.laser.on
      && (c.state === 'idle' || c.state === 'walk')
      && dist(c.x, c.y - 4, p.x, p.y - 4) < CFG.prowlRadius) {
      c.state = 'prowl';
      c.prowlT = 0;
      c.pathT = 0;
      w.ev.push({ t: 'meow', x: c.x, y: c.y, kind: 'alert' });
    }
  }

  switch (c.state) {
    case 'idle': {
      c.moving = false;
      c.t -= dt;
      if (c.t <= 0) wander(w, c);
      break;
    }
    case 'walk': {
      const slow = c.budget > 0 ? CFG.catWanderSpeed : CFG.catWanderSpeed * 0.8;
      if (follow(c, dt, slow)) startIdle(c, w, c.budget > 0 ? 1 : 2.5, c.budget > 0 ? 3 : 6);
      break;
    }
    case 'prowl': {
      c.prowlT += dt;
      c.pathT -= dt;
      const d = dist(c.x, c.y - 4, p.x, p.y - 4);
      if (c.budget <= 0 || c.prowlT > 9 || d > CFG.prowlRadius * 1.7 || w.laser.on) { startIdle(c, w, 1, 2); c.hugCd = 3; break; }
      if (d < CFG.hugRadius) {
        c.state = 'hug';
        c.hugT = CFG.hugTime;
        c.moving = false;
        p.frozen = CFG.hugTime;
        p.vx = 0; p.vy = 0;
        c.dir = p.x > c.x ? 'right' : 'left';
        w.hugs++;
        w.ev.push({ t: 'hug', x: c.x, y: c.y - 6 });
        break;
      }
      if (c.pathT <= 0) {
        c.pathT = 0.35;
        const tx = Math.floor(p.x / TILE), ty = Math.floor((p.y - 4) / TILE);
        if (!goTo(w, c, tx, ty)) {
          const t2 = w.nearestWalkable(tx, ty);
          if (!t2 || !goTo(w, c, t2[0], t2[1])) { startIdle(c, w, 1, 2); c.hugCd = 2; break; }
        }
      }
      follow(c, dt, CFG.catProwlSpeed);
      break;
    }
    case 'hug': {
      c.hugT -= dt;
      c.moving = false;
      if (c.hugT <= 0) {
        shed(w, c, Math.min(2, c.budget));
        // объятия — это ещё и лишняя работа: кошка оставляет добавку шерсти
        w.addWool(c.x + range(w.rng, -6, 6), c.y - 3 + range(w.rng, -1, 3));
        w.total++;
        c.hugCd = 9;
        w.ev.push({ t: 'meow', x: c.x, y: c.y, kind: 'happy' });
        startIdle(c, w, 0.2, 0.6);
      }
      break;
    }
    case 'lure': {
      const b = w.bowl;
      if (!b) { startIdle(c, w); break; }
      c.gallopT -= dt;
      if (c.gallopT <= 0 && c.moving) { c.gallopT = 0.34; w.ev.push({ t: 'gallop', x: c.x, y: c.y }); }
      if (follow(c, dt, CFG.catLureSpeed)) {
        if (c.partial) { c.partial = false; c.state = 'wait'; c.moving = false; break; }
        c.state = 'eat';
        c.eatT = CFG.eatTime;
        b.eaters++;
        c.dir = c.x < b.x ? 'right' : 'left';
      }
      break;
    }
    case 'wait': {
      c.moving = false;
      if (!w.bowl || w.bowl !== c.lureBowl) startIdle(c, w, 0.5, 1.5);
      break;
    }
    case 'eat': {
      c.moving = false;
      c.eatT -= dt;
      const b = w.bowl;
      if (!b || c.eatT <= 0) {
        if (b) b.fedOnce = true;
        w.stats.fed++;
        c.fed = 5;
        w.ev.push({ t: 'meow', x: c.x, y: c.y, kind: 'happy' });
        startIdle(c, w, 0.5, 1.5);
      }
      break;
    }
    case 'laser': {
      c.pathT -= dt;
      if (c.pathT <= 0) {
        c.pathT = 0.3;
        const tile = w.nearestWalkable(Math.floor(w.laser.x / TILE), Math.floor(w.laser.y / TILE));
        if (tile) goTo(w, c, tile[0], tile[1]);
      }
      const done = follow(c, dt, CFG.catLureSpeed);
      c.pounce = done;
      if (done) c.dir = w.laser.x < c.x ? 'left' : 'right';
      break;
    }
    default:
      startIdle(c, w);
  }
}
