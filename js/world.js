// Игровая логика одной комнаты. Никакого DOM/canvas — только состояние и правила,
// поэтому тот же код гоняется в Node для проверки проходимости всех уровней.
import {
  TILE, GW, GH, IN_X, IN_Y, IN_W, IN_H, FURN, CH, CFG, DIRS,
} from './defs.js';
import { clamp, approach, dist, sign, mulberry32, range } from './util.js';
import { updateCat, makeCat, wakeCat, catRect } from './cats.js';

const ti = (tx, ty) => ty * GW + tx;

export class World {
  constructor(def, opts = {}) {
    this.def = def;
    this.character = opts.character || 'masha';
    this.rng = mulberry32((def.id || 1) * 7919 + 13 + (opts.seed || 0));
    this.t = 0;
    this.state = 'play';       // play | won
    this.winT = 0;
    this.ev = [];              // события для звука и частиц
    this.wall = new Uint8Array(GW * GH);   // 1 — стена
    this.occ = new Uint8Array(GW * GH);    // 2 — мебель/босс (статическая преграда)
    this.ground = new Uint8Array(GW * GH); // 0 пол, 1 ковёр, 2 скользко
    this.furn = [];
    this.crates = [];
    this.wools = [];
    this.cats = [];
    this.robots = [];
    this.items = [];           // подбираемые усилители
    this.yarn = null;
    this.boss = null;
    this.bowl = null;
    this.bowlCd = 0;
    this.laser = { on: false, armed: false, x: 0, y: 0, energy: CFG.laserMax };
    this.collected = 0;
    this.score = 0;
    this.combo = 0;
    this.comboT = 0;
    this.maxCombo = 0;
    this.hugs = 0;
    this.cheated = false;
    // счётчики для достижений
    this.stats = { wool: 0, robotWool: 0, bowls: 0, laserT: 0, pushes: 0, turbos: 0, fed: 0, woke: 0 };
    this.nextId = 1;
    this.avail = Object.assign({ bowl: false, laser: false }, def.items || {});
    this.parse(def);
    this.total = this.wools.length + this.cats.reduce((s, c) => s + c.budget, 0)
      + (this.boss ? this.boss.waves * this.boss.per : 0);
    this.player = {
      x: this.spawn.x, y: this.spawn.y, vx: 0, vy: 0, ix: 0, iy: 0,
      dir: 'down', fx: 0, fy: 1, anim: 0, moving: false, frozen: 0, turbo: 0,
      stepT: 0, onIce: false, onRug: false,
    };
  }

  // ---------- разбор карты ----------
  parse(def) {
    const map = def.map;
    if (map.length !== IN_H) throw new Error(`level ${def.id}: нужно ${IN_H} строк, их ${map.length}`);
    for (let ty = 0; ty < GH; ty++) {
      for (let tx = 0; tx < GW; tx++) {
        const inside = tx >= IN_X && tx < IN_X + IN_W && ty >= IN_Y && ty < IN_Y + IN_H;
        if (!inside) this.wall[ti(tx, ty)] = 1;
      }
    }
    const seen = new Set();
    let catIdx = 0, sleepIdx = 0;
    for (let y = 0; y < IN_H; y++) {
      const row = map[y];
      if (row.length !== IN_W) throw new Error(`level ${def.id}: строка ${y} имеет длину ${row.length}, нужно ${IN_W}`);
      for (let x = 0; x < IN_W; x++) {
        const ch = row[x];
        const tx = x + IN_X, ty = y + IN_Y;
        const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
        const g = def.ground ? def.ground[y][x] : '.';
        if (g === CH.RUG) this.ground[ti(tx, ty)] = 1;
        else if (g === CH.ICE) this.ground[ti(tx, ty)] = 2;
        if (ch === CH.WALL) this.wall[ti(tx, ty)] = 1;
        else if (ch === CH.SPAWN) this.spawn = { x: cx, y: cy + 4 };
        else if (ch === CH.WOOL) this.addWool(cx + (this.rng() - 0.5) * 3, cy + (this.rng() - 0.5) * 3);
        else if (ch === CH.YARN) this.yarn = { x: cx, y: cy, taken: false, t: 0 };
        else if (ch === CH.TURBO) this.items.push({ type: 'turbo', x: cx, y: cy, taken: false, t: this.rng() * 6 });
        else if (ch === CH.ROBOT) this.robots.push({ id: this.nextId++, x: cx, y: cy, dx: 1, dy: 0, speed: 26, turn: 0, bump: 0, hs: 7 });
        else if (ch === CH.CAT || ch === CH.SLEEPER) {
          const cfg = ch === CH.SLEEPER
            ? ((def.sleepers && def.sleepers[sleepIdx++]) || {})
            : ((def.cats && def.cats[catIdx++]) || {});
          this.cats.push(makeCat(this, cfg, ch === CH.SLEEPER ? 'sleeper' : 'wander', tx, ty));
        } else if (ch === CH.BOSS) {
          if (seen.has('boss')) continue;
          seen.add('boss');
          const b = def.boss || {};
          this.boss = {
            tx, ty, x: (tx + 1.5) * TILE, y: (ty + 2) * TILE,
            waves: b.waves ?? 5, per: b.per ?? 8, interval: b.interval ?? 9,
            timer: b.first ?? 6, state: 'sleep', warnT: 0, anim: 0,
          };
          for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 3; xx++) this.occ[ti(tx + xx, ty + yy)] = 2;
        } else if (FURN[ch]) {
          const key = `${tx},${ty}`;
          if (seen.has(key)) continue;
          const fp = FURN[ch];
          for (let yy = 0; yy < fp.h; yy++) {
            for (let xx = 0; xx < fp.w; xx++) {
              if ((map[y + yy] || '')[x + xx] !== ch) {
                throw new Error(`level ${def.id}: мебель '${ch}' в (${x},${y}) не вписывается в ${fp.w}x${fp.h}`);
              }
              seen.add(`${tx + xx},${ty + yy}`);
            }
          }
          if (fp.pushable) {
            this.crates.push({ id: this.nextId++, tx, ty, x: tx * TILE, y: ty * TILE, slide: null, pushT: 0, touched: false });
          } else {
            this.furn.push({ type: ch, name: fp.name, tx, ty, w: fp.w, h: fp.h, extra: fp.extra });
            for (let yy = 0; yy < fp.h; yy++) for (let xx = 0; xx < fp.w; xx++) this.occ[ti(tx + xx, ty + yy)] = 2;
          }
        }
      }
    }
    if (!this.spawn) throw new Error(`level ${def.id}: нет точки старта P`);
  }

  addWool(x, y, fromX, fromY) {
    const w = { id: this.nextId++, x, y, taken: false, age: this.rng() * 6, fly: null };
    if (fromX !== undefined) w.fly = { fx: fromX, fy: fromY, t: 0, dur: 0.45 };
    this.wools.push(w);
    return w;
  }

  // ---------- вспомогательные запросы ----------
  staticBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return true;
    const i = ti(tx, ty);
    return this.wall[i] === 1 || this.occ[i] !== 0;
  }

  crateAtTile(tx, ty) {
    for (const c of this.crates) if (c.tx === tx && c.ty === ty) return c;
    return null;
  }

  // проходима ли клетка для кота/робота (без учёта подвижных существ)
  walkable(tx, ty) {
    return !this.staticBlocked(tx, ty) && !this.crateAtTile(tx, ty);
  }

  groundAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return 0;
    return this.ground[ti(tx, ty)];
  }

  // прямоугольник [x0,y0,x1,y1] пересекает преграду?
  boxBlocked(x0, y0, x1, y1, who) {
    const tx0 = Math.floor(x0 / TILE), tx1 = Math.floor((x1 - 0.001) / TILE);
    const ty0 = Math.floor(y0 / TILE), ty1 = Math.floor((y1 - 0.001) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) if (this.staticBlocked(tx, ty)) return true;
    }
    for (const c of this.crates) {
      if (x0 < c.x + TILE - 1 && x1 > c.x + 1 && y0 < c.y + TILE - 1 && y1 > c.y + 1) return true;
    }
    for (const c of this.cats) {
      if (c.solid) {
        const r = catRect(c);
        if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return true;
      }
    }
    for (const r of this.robots) {
      if (r === who) continue;
      if (x0 < r.x + r.hs && x1 > r.x - r.hs && y0 < r.y + r.hs && y1 > r.y - r.hs) return true;
    }
    return false;
  }

  crateAtBox(x0, y0, x1, y1) {
    for (const c of this.crates) {
      if (x0 < c.x + TILE - 1 && x1 > c.x + 1 && y0 < c.y + TILE - 1 && y1 > c.y + 1) return c;
    }
    return null;
  }

  // BFS по клеткам, 8 направлений без срезания углов. Возвращает массив [tx,ty].
  findPath(sx, sy, gx, gy, maxNodes = 900) {
    if (sx === gx && sy === gy) return [];
    if (!this.walkable(gx, gy)) return null;
    const prev = new Int32Array(GW * GH).fill(-1);
    const q = [ti(sx, sy)];
    prev[q[0]] = q[0];
    let head = 0;
    const goal = ti(gx, gy);
    const N = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    while (head < q.length && head < maxNodes) {
      const cur = q[head++];
      if (cur === goal) break;
      const cx = cur % GW, cy = (cur / GW) | 0;
      for (const [dx, dy] of N) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.walkable(nx, ny)) continue;
        if (dx !== 0 && dy !== 0 && (!this.walkable(cx + dx, cy) || !this.walkable(cx, cy + dy))) continue;
        const ni = ti(nx, ny);
        if (prev[ni] !== -1) continue;
        prev[ni] = cur;
        q.push(ni);
      }
    }
    if (prev[goal] === -1) return null;
    const path = [];
    for (let c = goal; c !== q[0]; c = prev[c]) path.push([c % GW, (c / GW) | 0]);
    return path.reverse();
  }

  // ближайшая проходимая клетка к точке (для лазера/миски)
  nearestWalkable(tx, ty) {
    if (this.walkable(tx, ty)) return [tx, ty];
    for (let r = 1; r < 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.walkable(tx + dx, ty + dy)) return [tx + dx, ty + dy];
        }
      }
    }
    return null;
  }

  // ---------- шаг симуляции ----------
  update(dt, inp = {}) {
    dt = Math.min(dt, 0.05);
    if (this.state === 'won') {
      this.winT += dt;
      this.updateCosmetics(dt);
      return;
    }
    this.t += dt;
    this.updatePlayer(dt, inp);
    this.updateItemsUse(dt, inp);
    this.updateCrates(dt);
    for (const c of this.cats) updateCat(this, c, dt);
    this.updateBoss(dt);
    this.updateRobots(dt);
    this.updatePickups(dt);
    this.updateCosmetics(dt);
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    this.checkWin();
  }

  updateCosmetics(dt) {
    for (const w of this.wools) {
      w.age += dt;
      if (w.fly) {
        w.fly.t += dt / w.fly.dur;
        if (w.fly.t >= 1) { w.fly = null; this.ev.push({ t: 'land', x: w.x, y: w.y }); }
      }
    }
    if (this.yarn) this.yarn.t += dt;
    for (const it of this.items) it.t += dt;
  }

  updatePlayer(dt, inp) {
    const p = this.player;
    if (p.turbo > 0) p.turbo = Math.max(0, p.turbo - dt);
    let ix = clamp(inp.x || 0, -1, 1), iy = clamp(inp.y || 0, -1, 1);
    const mag = Math.hypot(ix, iy);
    if (mag > 1) { ix /= mag; iy /= mag; }
    if (p.frozen > 0) {
      p.frozen -= dt;
      ix = 0; iy = 0;
    }
    p.ix = ix; p.iy = iy;
    const g = this.groundAt(p.x, p.y - 3);
    p.onIce = g === 2;
    p.onRug = g === 1;
    let maxSp = CFG.playerSpeed * (p.turbo > 0 ? CFG.turboSpeed : 1) * (p.onRug ? CFG.rugSlow : 1);
    const accel = p.onIce ? CFG.iceAccel : CFG.playerAccel;
    const fric = p.onIce ? CFG.iceFriction : CFG.playerFriction;
    const tvx = ix * maxSp, tvy = iy * maxSp;
    p.vx = approach(p.vx, tvx, (ix !== 0 ? accel : fric) * dt);
    p.vy = approach(p.vy, tvy, (iy !== 0 ? accel : fric) * dt);
    if (p.frozen > 0) { p.vx = 0; p.vy = 0; }

    for (const c of this.crates) c.touched = false;
    // ось X
    let nx = p.x + p.vx * dt;
    if (!this.boxBlocked(nx - 5, p.y - 6, nx + 5, p.y)) p.x = nx;
    else {
      const c = this.crateAtBox(nx - 5, p.y - 6, nx + 5, p.y);
      if (c && Math.abs(ix) > 0.4) this.pushCrate(c, sign(ix), 0, dt);
      p.vx = 0;
    }
    // ось Y
    let ny = p.y + p.vy * dt;
    if (!this.boxBlocked(p.x - 5, ny - 6, p.x + 5, ny)) p.y = ny;
    else {
      const c = this.crateAtBox(p.x - 5, ny - 6, p.x + 5, ny);
      if (c && Math.abs(iy) > 0.4) this.pushCrate(c, 0, sign(iy), dt);
      p.vy = 0;
    }
    for (const c of this.crates) if (!c.touched) c.pushT = 0;

    const sp = Math.hypot(p.vx, p.vy);
    p.moving = sp > 6;
    if (ix !== 0 || iy !== 0) {
      // гистерезис: на диагоналях спрайт не мигает между боковым и фронтальным видом
      const ax = Math.abs(ix), ay = Math.abs(iy);
      const horiz = p.dir === 'left' || p.dir === 'right';
      if (horiz ? ay > ax * 1.4 : ax > ay * 1.4) p.dir = horiz ? (iy > 0 ? 'down' : 'up') : (ix > 0 ? 'right' : 'left');
      else if (horiz) p.dir = ix > 0 ? 'right' : (ix < 0 ? 'left' : p.dir);
      else p.dir = iy > 0 ? 'down' : (iy < 0 ? 'up' : p.dir);
      const m = Math.hypot(ix, iy);
      p.fx = ix / m; p.fy = iy / m;
    }
    if (p.moving) {
      p.anim += dt * (sp / CFG.playerSpeed);
      p.stepT -= dt * (sp / CFG.playerSpeed);
      if (p.stepT <= 0) { p.stepT = 0.28; this.ev.push({ t: 'step', ice: p.onIce }); }
    } else {
      p.anim = 0;
    }
  }

  pushCrate(c, dx, dy, dt) {
    c.touched = true;
    if (c.slide) return;
    c.pushT += dt;
    if (c.pushT < 0.17) return;
    c.pushT = 0;
    const ntx = c.tx + dx, nty = c.ty + dy;
    if (this.staticBlocked(ntx, nty) || this.crateAtTile(ntx, nty)) return;
    const [x0, y0, x1, y1] = [ntx * TILE, nty * TILE, ntx * TILE + TILE, nty * TILE + TILE];
    for (const r of this.robots) if (r.x + r.hs > x0 && r.x - r.hs < x1 && r.y + r.hs > y0 && r.y - r.hs < y1) return;
    for (const k of this.cats) {
      if (k.solid) { const r = catRect(k); if (r[2] > x0 && r[0] < x1 && r[3] > y0 && r[1] < y1) return; }
    }
    this.stats.pushes++;
    c.slide = { fx: c.x, fy: c.y, tx: ntx * TILE, ty: nty * TILE, t: 0, dur: 0.15 };
    c.tx = ntx; c.ty = nty;
    this.ev.push({ t: 'push', x: c.x + 8, y: c.y + 8 });
  }

  updateCrates(dt) {
    for (const c of this.crates) {
      if (!c.slide) continue;
      c.slide.t += dt / c.slide.dur;
      const k = Math.min(1, c.slide.t);
      const e = 1 - (1 - k) * (1 - k);
      c.x = c.slide.fx + (c.slide.tx - c.slide.fx) * e;
      c.y = c.slide.fy + (c.slide.ty - c.slide.fy) * e;
      if (k >= 1) { c.x = c.slide.tx; c.y = c.slide.ty; c.slide = null; }
    }
  }

  // ---------- предметы игрока: миска и лазер ----------
  updateItemsUse(dt, inp) {
    const p = this.player;
    if (this.bowlCd > 0) this.bowlCd -= dt;
    if (this.bowl) {
      const b = this.bowl;
      b.t += dt;
      // миска убирается, когда все прибежавшие кошки поели (или по таймеру)
      const busy = this.cats.some((k) => k.lureBowl === b && (k.state === 'lure' || k.state === 'eat'));
      if (b.t >= CFG.bowlTime || (b.fedOnce && !busy)) {
        this.ev.push({ t: 'bowlEnd', x: b.x, y: b.y });
        this.bowl = null;
        this.bowlCd = CFG.bowlCooldown;
      }
    }
    if (inp.bowl && this.avail.bowl && !this.bowl && this.bowlCd <= 0 && p.frozen <= 0) this.placeBowl();

    // лазер: нажатие включает и выключает, мышь может наводить точку
    const L = this.laser;
    if (!this.avail.laser) L.armed = false;
    if (inp.laserToggle && this.avail.laser) {
      if (L.armed) L.armed = false;
      else if (L.energy > 0.6) L.armed = true;
    }
    const want = (L.armed || !!inp.laser) && this.avail.laser;
    if (want && L.energy > 0) {
      if (!L.on) this.ev.push({ t: 'laserOn' });
      L.on = true;
      L.energy = Math.max(0, L.energy - dt);
      this.stats.laserT += dt;
      let dx = p.fx, dy = p.fy, reach = CFG.laserReach;
      if (inp.aim) {
        const ax = inp.aim.x - p.x, ay = inp.aim.y - (p.y - 4);
        const m = Math.hypot(ax, ay);
        if (m > 4) { dx = ax / m; dy = ay / m; reach = Math.min(m, CFG.laserReachMouse); }
      }
      let rx = p.x, ry = p.y - 4;
      const steps = Math.floor(reach / 3);
      for (let i = 1; i <= steps; i++) {
        const nx = p.x + dx * i * 3, ny = p.y - 4 + dy * i * 3;
        if (this.staticBlocked(Math.floor(nx / TILE), Math.floor(ny / TILE))) break;
        rx = nx; ry = ny;
      }
      L.x = rx; L.y = ry;
      if (L.energy <= 0) { L.on = false; L.armed = false; this.ev.push({ t: 'laserOff' }); }
    } else {
      if (L.on) this.ev.push({ t: 'laserOff' });
      L.on = false;
      L.energy = Math.min(CFG.laserMax, L.energy + CFG.laserRecharge * dt);
    }
  }

  placeBowl() {
    const p = this.player;
    const cands = [
      [p.x + p.fx * 14, p.y - 4 + p.fy * 14],
      [p.x, p.y - 4],
    ];
    for (const [x, y] of cands) {
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (this.walkable(tx, ty)) {
        this.bowl = { tx, ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE + 2, t: 0, eaters: 0, fedOnce: false };
        this.stats.bowls++;
        this.ev.push({ t: 'bowl', x: this.bowl.x, y: this.bowl.y });
        // кот-соня просыпается на запах еды
        for (const c of this.cats) if (c.state === 'sleep') wakeCat(this, c);
        return true;
      }
    }
    return false;
  }

  // ---------- босс: волны линьки ----------
  updateBoss(dt) {
    const b = this.boss;
    if (!b) return;
    b.anim += dt;
    if (b.waves <= 0) { b.state = 'sleep'; return; }
    if (b.state === 'sleep') {
      if (this.remainingWool() === 0 && b.timer > 2) b.timer = 2;
      b.timer -= dt;
      if (b.timer <= 0) { b.state = 'warn'; b.warnT = 1.3; this.ev.push({ t: 'bossWarn' }); }
    } else if (b.state === 'warn') {
      b.warnT -= dt;
      if (b.warnT <= 0) {
        b.state = 'sleep';
        b.timer = b.interval;
        b.waves--;
        this.bossBurst(b);
      }
    }
  }

  bossBurst(b) {
    this.ev.push({ t: 'bossBurst', x: b.x, y: b.y });
    const n = b.per;
    const base = this.rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      let placed = false;
      for (let k = 0; k < 14 && !placed; k++) {
        const a = base + (i / n) * Math.PI * 2 + (this.rng() - 0.5) * 0.5 + k * 0.37;
        const r = range(this.rng, 38, 92 + k * 4);
        const x = b.x + Math.cos(a) * r, y = b.y - 10 + Math.sin(a) * r * 0.8;
        const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        if (this.walkable(tx, ty) && x > 12 && x < 372 && y > 40 && y < 212) {
          this.addWool(x, y, b.x, b.y - 8);
          placed = true;
        }
      }
      if (!placed) this.total--;
    }
  }

  // ---------- роботы-пылесосы ----------
  updateRobots(dt) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const r of this.robots) {
      if (r.bump > 0) r.bump -= dt;
      const m = Math.hypot(r.dx, r.dy) || 1;
      const sx = (r.dx / m) * r.speed * dt, sy = (r.dy / m) * r.speed * dt;
      let hit = false;
      const pbox = this.player;
      // не наезжаем на игрока
      const overlapsPlayer = (x, y) => (
        x - r.hs < pbox.x + 5 && x + r.hs > pbox.x - 5 && y - r.hs < pbox.y && y + r.hs > pbox.y - 6
      );
      const tryMove = (nx, ny) => {
        if (this.boxBlocked(nx - r.hs, ny - r.hs, nx + r.hs, ny + r.hs, r) || overlapsPlayer(nx, ny)) return false;
        r.x = nx; r.y = ny; return true;
      };
      if (!tryMove(r.x + sx, r.y + sy)) {
        // скольжение вдоль стены возможно только по ненулевой составляющей, иначе поворот
        let slid = false;
        if (sx !== 0 && sy !== 0) slid = tryMove(r.x + sx, r.y) || tryMove(r.x, r.y + sy);
        if (!slid) hit = true;
      }
      if (hit) {
        // новое направление выбираем только из тех, куда реально можно поехать
        const free = dirs.filter(([ddx, ddy]) => {
          const k = Math.hypot(ddx, ddy);
          const nx = r.x + (ddx / k) * 3, ny = r.y + (ddy / k) * 3;
          return !(this.boxBlocked(nx - r.hs, ny - r.hs, nx + r.hs, ny + r.hs, r)) && !(ddx === r.dx && ddy === r.dy);
        });
        const pool = free.length ? free : dirs;
        const d = pool[Math.floor(this.rng() * pool.length)];
        r.dx = d[0]; r.dy = d[1]; r.bump = 0.4;
        this.ev.push({ t: 'bump', x: r.x, y: r.y });
      }
    }
  }

  // ---------- подбор шерсти и усилителей ----------
  updatePickups(dt) {
    const p = this.player;
    const rad = p.turbo > 0 ? CFG.pickRadiusTurbo : CFG.pickRadius;
    const px = p.x, py = p.y - 6;
    for (const w of this.wools) {
      if (w.taken || w.fly) continue;
      // турбо-пылесос тянет шерсть к себе, если между ними нет преград
      if (p.turbo > 0) {
        const d = dist(px, py, w.x, w.y);
        if (d < CFG.turboPullRadius && d >= rad && this.clearLine(px, py, w.x, w.y)) {
          const k = Math.min(d, (CFG.turboPullSpeed + (CFG.turboPullRadius - d) * 1.1) * dt) / d;
          w.x += (px - w.x) * k; w.y += (py - w.y) * k;
          w.pulled = true;
        } else w.pulled = false;
      }
      if (dist(px, py, w.x, w.y) < rad) this.takeWool(w, 'player');
      else {
        for (const r of this.robots) {
          if (dist(r.x, r.y, w.x, w.y) < r.hs + 3) { this.takeWool(w, 'robot'); break; }
        }
      }
    }
    if (this.yarn && !this.yarn.taken && dist(px, py, this.yarn.x, this.yarn.y) < 11) {
      this.yarn.taken = true;
      this.score += 100;
      this.ev.push({ t: 'yarn', x: this.yarn.x, y: this.yarn.y });
    }
    for (const it of this.items) {
      if (it.taken) continue;
      if (dist(px, py, it.x, it.y) < 11) {
        it.taken = true;
        if (it.type === 'turbo') { this.stats.turbos++; p.turbo = CFG.turboTime; this.ev.push({ t: 'turbo', x: it.x, y: it.y }); }
      }
    }
    this.wools = this.wools.filter((w) => !w.taken);
  }

  // между точками нет стен и мебели
  clearLine(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
    for (let i = 1; i < n; i++) {
      const k = i / n;
      if (this.staticBlocked(Math.floor((x0 + (x1 - x0) * k) / TILE), Math.floor((y0 + (y1 - y0) * k) / TILE))) return false;
    }
    return true;
  }

  takeWool(w, by) {
    w.taken = true;
    this.collected++;
    if (by === 'player') {
      this.combo = this.comboT > 0 ? this.combo + 1 : 1;
      this.comboT = CFG.comboWindow;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.stats.wool++;
      this.score += 10 * this.combo;
      this.ev.push({ t: 'collect', x: w.x, y: w.y, combo: this.combo });
    } else {
      this.stats.robotWool++;
      this.score += 5;
      this.ev.push({ t: 'collectRobot', x: w.x, y: w.y });
    }
  }

  // секретный код: комната засчитывается сразу, но без звёзд за скорость/клубок и без достижений
  cheatWin() {
    if (this.state === 'won') return;
    this.cheated = true;
    for (const w of this.wools) {
      if (w.taken) continue;
      w.taken = true;
      this.ev.push({ t: 'cheatPoof', x: w.x, y: w.y });
    }
    this.wools = [];
    for (const c of this.cats) c.budget = 0;
    if (this.boss) this.boss.waves = 0;
    this.collected = this.total;
    this.state = 'won';
    this.winT = 0;
    this.ev.push({ t: 'cheat' });
    this.ev.push({ t: 'won' });
  }

  remainingWool() {
    let n = 0;
    for (const w of this.wools) if (!w.taken) n++;
    return n;
  }

  pendingShed() {
    let n = this.cats.reduce((s, c) => s + c.budget, 0);
    if (this.boss) n += this.boss.waves;
    return n;
  }

  checkWin() {
    if (this.remainingWool() === 0 && this.pendingShed() === 0) {
      this.state = 'won';
      this.winT = 0;
      this.ev.push({ t: 'won' });
    }
  }

  progress() {
    return this.total > 0 ? Math.min(1, this.collected / this.total) : 1;
  }

  result() {
    const par = this.def.par || 60;
    return {
      time: this.t,
      score: Math.round(this.score),
      maxCombo: this.maxCombo,
      stars: this.cheated ? [true, false, false] : [true, this.t <= par, !!(this.yarn && this.yarn.taken)],
      cheated: this.cheated,
      yarn: !this.cheated && !!(this.yarn && this.yarn.taken),
      hasYarn: !!this.yarn,
      par,
    };
  }
}
