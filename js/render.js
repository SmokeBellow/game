// Отрисовка комнаты на пиксельном canvas 384x224.
import { TILE, VW, VH, FURN, WORLDS, CFG } from './defs.js';
import { getArt } from './art.js';
import { THEMES } from './sprites_props.js';
import { hash2 } from './px.js';

const FONT = '8px "Press Start 2P", monospace';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = VW;
    canvas.height = VH;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.art = getArt();
    this.parts = [];
    this.floaters = [];
    this.motes = [];
    this.shake = 0;
    this.world = null;
    this.t = 0;
    this.winSparkT = 0;
  }

  setWorld(world) {
    this.world = world;
    this.themeName = WORLDS[world.def.world - 1].theme;
    this.theme = THEMES[this.themeName];
    this.bg = this.art.roomBg(this.themeName, world, world.def.id);
    this.parts = [];
    this.floaters = [];
    this.shake = 0;
    this.motes = [];
    for (let i = 0; i < 16; i++) {
      this.motes.push({ x: 90 + Math.random() * 230, y: 40 + Math.random() * 160, p: Math.random() * 6.28, s: 2 + Math.random() * 4 });
    }
    this.yarnCol = (world.def.id * 3) % 8;
  }

  // ---- события мира -> частицы ----
  consume(events) {
    for (const e of events) {
      switch (e.t) {
        case 'collect': {
          this.burst(e.x, e.y, 6, '#ffffff', 28);
          this.spark(e.x, e.y - 4, '#fff6b0', 3);
          const txt = e.combo > 1 ? `x${e.combo}` : '+1';
          this.float(e.x, e.y - 10, txt, e.combo > 2 ? '#ffd24a' : '#ffffff');
          break;
        }
        case 'collectRobot': this.burst(e.x, e.y, 4, '#cfe9ff', 20); break;
        case 'shed': this.burst(e.x, e.y, 4, '#f3efe6', 16); break;
        case 'land': this.burst(e.x, e.y, 3, '#f3efe6', 14); break;
        case 'hug':
          for (let i = 0; i < 4; i++) this.parts.push({ k: 'heart', x: e.x + (i - 1.5) * 5, y: e.y - 6, vx: (i - 1.5) * 4, vy: -16 - i * 3, life: 1.2 + i * 0.1, max: 1.4 });
          break;
        case 'meow':
          if (e.kind === 'alert') this.float(e.x, e.y - 14, '!', '#ff5a5a');
          if (e.kind === 'happy') this.parts.push({ k: 'heart', x: e.x, y: e.y - 10, vx: 0, vy: -14, life: 1, max: 1 });
          break;
        case 'yarn':
          this.spark(e.x, e.y, '#ffe27a', 14);
          this.float(e.x, e.y - 12, 'Клубок!', '#ffe27a');
          break;
        case 'turbo':
          this.spark(e.x, e.y, '#8affc0', 12);
          this.float(e.x, e.y - 12, 'ТУРБО!', '#8affc0');
          break;
        case 'push': this.burst(e.x, e.y + 6, 3, '#e8d8c0', 12); break;
        case 'bowl': this.burst(e.x, e.y, 4, '#ffd0dc', 14); break;
        case 'bossWarn': this.shake = Math.max(this.shake, 0.7); break;
        case 'bossBurst':
          this.shake = 0.5;
          this.burst(e.x, e.y - 10, 22, '#f6f2ea', 70);
          this.float(e.x, e.y - 28, 'АПЧХИ!', '#ffffff');
          break;
        case 'bump': this.burst(e.x, e.y, 2, '#ffffff', 10); break;
        default: break;
      }
    }
    events.length = 0;
  }

  burst(x, y, n, col, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({ k: 'puff', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, life: 0.4 + Math.random() * 0.3, max: 0.7, col });
    }
  }

  spark(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = 20 + Math.random() * 40;
      this.parts.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: 0.5 + Math.random() * 0.5, max: 1, col });
    }
  }

  float(x, y, text, col) {
    this.floaters.push({ x, y, text, col, life: 1.0, max: 1.0 });
  }

  update(dt) {
    this.t += dt;
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'puff') { p.vx *= 0.92; p.vy = p.vy * 0.92 + 20 * dt; }
      if (p.k === 'spark') { p.vy += 40 * dt; }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.floaters) { f.life -= dt; f.y -= 14 * dt; }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
  }

  // ---- кадр ----
  draw(world, alpha = 1) {
    const ctx = this.ctx;
    const t = this.t;
    ctx.save();
    ctx.clearRect(0, 0, VW, VH);
    if (this.shake > 0) {
      const m = Math.min(2, this.shake * 3);
      ctx.translate(Math.round((Math.random() - 0.5) * m * 2), Math.round((Math.random() - 0.5) * m * 2));
    }
    ctx.drawImage(this.bg, 0, 0);

    // тени мебели (под всеми)
    ctx.fillStyle = 'rgba(30,12,40,0.2)';
    for (const f of world.furn) ctx.fillRect(f.tx * TILE + 2, f.ty * TILE + 3, f.w * TILE, f.h * TILE);
    if (world.boss) ctx.fillRect(world.boss.tx * TILE + 2, world.boss.ty * TILE + 4, 3 * TILE, 2 * TILE - 2);

    // предметы на полу
    this.drawFloorItems(ctx, world, t);

    // сортируемые объекты
    const list = [];
    for (const f of world.furn) list.push({ y: (f.ty + f.h) * TILE, fn: () => this.drawFurn(ctx, f) });
    for (const c of world.crates) list.push({ y: c.y + TILE, fn: () => this.drawCrate(ctx, c) });
    for (const c of world.cats) list.push({ y: c.y, fn: () => this.drawCat(ctx, c, t, world) });
    for (const r of world.robots) list.push({ y: r.y + r.hs, fn: () => this.drawRobot(ctx, r, t) });
    if (world.boss) list.push({ y: world.boss.y, fn: () => this.drawBoss(ctx, world.boss, t) });
    list.push({ y: world.player.y, fn: () => this.drawPlayer(ctx, world, t) });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) o.fn();
    this.drawOccluded(ctx, world);

    this.drawLaser(ctx, world, t);
    this.drawParticles(ctx, t);
    this.drawMotes(ctx, t);
    if (this.theme.tint) { ctx.fillStyle = this.theme.tint; ctx.fillRect(0, 0, VW, VH); }
    ctx.drawImage(this.art.vignette, 0, 0);
    ctx.restore();
  }

  drawFloorItems(ctx, world, t) {
    const A = this.art;
    // миска
    if (world.bowl) {
      const b = world.bowl;
      ctx.fillStyle = 'rgba(30,12,40,0.25)';
      ctx.fillRect(Math.round(b.x - 6), Math.round(b.y + 1), 12, 2);
      const sp = A.bowl[b.eaters > 0 ? Math.floor(t * 4) % 2 : 0];
      ctx.drawImage(sp.c, Math.round(b.x - sp.ax), Math.round(b.y - sp.ay + 3));
    }
    // шерсть
    for (const w of world.wools) {
      if (w.taken) continue;
      let x = w.x, y = w.y, lift = 0;
      if (w.fly) {
        const k = w.fly.t;
        x = w.fly.fx + (w.x - w.fly.fx) * k;
        y = w.fly.fy + (w.y - w.fly.fy) * k;
        lift = Math.sin(k * Math.PI) * 18;
      }
      const sp = A.wool[Math.floor(hash2(w.id, 1) * 2)];
      const bob = Math.sin(w.age * 2.4 + w.id) * 1;
      if (!w.fly) {
        ctx.fillStyle = 'rgba(30,12,40,0.22)';
        ctx.fillRect(Math.round(x - 3), Math.round(y + 3), 6, 2);
      }
      if (w.pulled) {
        const p = world.player, dx = p.x - x, dy = p.y - 6 - y, m = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = 'rgba(138,255,192,0.55)';
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5); ctx.lineTo(Math.round(x - (dx / m) * 7) + 0.5, Math.round(y - (dy / m) * 7) + 0.5); ctx.stroke();
        if (Math.random() < 0.3) this.parts.push({ k: 'spark', x, y, vx: (dx / m) * 18, vy: (dy / m) * 18, life: 0.3, max: 0.3, col: '#8affc0' });
      }
      ctx.drawImage(sp.c, Math.round(x - sp.ax), Math.round(y - sp.ay + 3 - lift + (w.fly ? 0 : bob)));
    }
    // клубок и усилители
    if (world.yarn && !world.yarn.taken) {
      const y = world.yarn;
      const sp = A.yarn[this.yarnCol];
      ctx.fillStyle = 'rgba(30,12,40,0.25)'; ctx.fillRect(Math.round(y.x - 5), Math.round(y.y + 4), 10, 2);
      ctx.drawImage(sp.c, Math.round(y.x - sp.ax), Math.round(y.y - sp.ay + 5 + Math.sin(y.t * 3) * 1.2));
      const tw = (Math.sin(y.t * 5) + 1) / 2;
      if (tw > 0.7) ctx.drawImage(A.spark.c, Math.round(y.x + 4), Math.round(y.y - 7));
    }
    for (const it of world.items) {
      if (it.taken) continue;
      const sp = A.turbo;
      const gl = 6 + Math.sin(it.t * 4) * 1.5;
      const g = ctx.createRadialGradient(it.x, it.y, 1, it.x, it.y, gl + 6);
      g.addColorStop(0, 'rgba(120,255,180,0.5)'); g.addColorStop(1, 'rgba(120,255,180,0)');
      ctx.fillStyle = g; ctx.fillRect(it.x - 14, it.y - 14, 28, 28);
      ctx.drawImage(sp.c, Math.round(it.x - sp.ax), Math.round(it.y - sp.ay + 8 + Math.sin(it.t * 3) * 1.5));
    }
  }

  // шерсть, клубок и батарейки за высокой мебелью просвечивают поверх неё,
  // чтобы последнюю шерстинку никогда не приходилось искать вслепую
  drawOccluded(ctx, world) {
    const rects = world.furn.map((f) => [f.tx * TILE - 1, f.ty * TILE - f.extra - 1, (f.tx + f.w) * TILE + 1, f.ty * TILE]);
    if (world.boss) rects.push([world.boss.tx * TILE - 8, world.boss.ty * TILE - 12, world.boss.tx * TILE + 56, world.boss.ty * TILE]);
    for (const c of world.crates) rects.push([c.x - 1, c.y - 4, c.x + TILE + 1, c.y + TILE]);
    const hidden = (x, y) => rects.some((r) => x + 5 > r[0] && x - 5 < r[2] && y + 5 > r[1] && y - 3 < r[3]);
    const A = this.art;
    ctx.globalAlpha = 0.75;
    for (const w of world.wools) {
      if (w.taken || w.fly || !hidden(w.x, w.y)) continue;
      const sp = A.wool[Math.floor(hash2(w.id, 1) * 2)];
      ctx.drawImage(sp.c, Math.round(w.x - sp.ax), Math.round(w.y - sp.ay + 3 + Math.sin(w.age * 2.4 + w.id)));
    }
    const y = world.yarn;
    if (y && !y.taken && hidden(y.x, y.y)) {
      const sp = A.yarn[this.yarnCol];
      ctx.drawImage(sp.c, Math.round(y.x - sp.ax), Math.round(y.y - sp.ay + 5));
    }
    for (const it of world.items) {
      if (!it.taken && hidden(it.x, it.y)) ctx.drawImage(A.turbo.c, Math.round(it.x - A.turbo.ax), Math.round(it.y - A.turbo.ay + 8));
    }
    ctx.globalAlpha = 1;
  }

  drawFurn(ctx, f) {
    const sp = this.art.furn(f.type, this.themeName, (f.tx * 7 + f.ty) % 4);
    const fp = FURN[f.type];
    ctx.drawImage(sp.c, f.tx * TILE + sp.ox, f.ty * TILE + sp.oy);
    if (f.type === 'l') { // тёплое свечение у торшера
      const cx = f.tx * TILE + 8, cy = f.ty * TILE - 14;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
      const k = this.theme.tint ? 0.55 : 0.35;
      g.addColorStop(0, `rgba(255,230,150,${k})`); g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 36, cy - 36, 72, 72);
    }
    void fp;
  }

  drawCrate(ctx, c) {
    const sp = this.art.furn('o', this.themeName, c.id);
    ctx.fillStyle = 'rgba(30,12,40,0.22)';
    ctx.fillRect(Math.round(c.x + 2), Math.round(c.y + 13), 14, 3);
    ctx.drawImage(sp.c, Math.round(c.x + sp.ox), Math.round(c.y + sp.oy));
  }

  drawPlayer(ctx, world, t) {
    const p = world.player;
    const set = this.art.players[world.character][p.dir];
    let fr;
    if (p.frozen > 0) fr = set.hug[Math.floor(t * 3) % 2];
    else if (p.moving) fr = set.walk[Math.floor(p.anim * 8) % 4];
    else fr = set.idle[Math.floor(t * 1.4) % 2];
    ctx.fillStyle = 'rgba(30,12,40,0.28)';
    ctx.beginPath(); ctx.ellipse(Math.round(p.x), Math.round(p.y) - 1, 7, 2.5, 0, 0, 6.28); ctx.fill();
    if (p.turbo > 0) {
      const pulse = 10 + Math.sin(t * 14) * 1.5;
      const g = ctx.createRadialGradient(p.x, p.y - 8, 2, p.x, p.y - 8, pulse + 10);
      g.addColorStop(0, 'rgba(120,255,190,0.45)'); g.addColorStop(1, 'rgba(120,255,190,0)');
      ctx.fillStyle = g; ctx.fillRect(p.x - 26, p.y - 34, 52, 52);
      if (Math.random() < 0.5) this.parts.push({ k: 'spark', x: p.x + (Math.random() - 0.5) * 14, y: p.y - 4, vx: 0, vy: -10, life: 0.4, max: 0.4, col: '#8affc0' });
    }
    if (p.turbo > 0) {
      // сжимающиеся кольца показывают радиус притяжения
      const R = CFG.turboPullRadius, cx = p.x, cy = p.y - 6;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 1.1 + k / 3) % 1;
        const r = R * (1 - ph) + 8;
        const n = Math.max(10, Math.round(r / 3.2));
        ctx.fillStyle = '#8affc0';
        ctx.globalAlpha = 0.9 * Math.min(1, ph * 3) * (1 - ph * 0.5) * Math.min(1, p.turbo);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.283 + t * 1.5;
          ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.85), 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }
    // лёгкое «приседание» при остановке на льду
    ctx.drawImage(fr.c, Math.round(p.x - fr.ax), Math.round(p.y - fr.ay));
    if (p.frozen > 0) ctx.drawImage(this.art.heart.c, Math.round(p.x - 3), Math.round(p.y - 33 - Math.sin(t * 6) * 1.5));
  }

  drawCat(ctx, c, t, world) {
    const set = this.art.cats[c.color];
    let fr, mirror = c.dir === 'left';
    const side = (r, l) => (mirror ? l : r);
    if (c.state === 'sleep') fr = set.sleep[Math.floor(t * 0.8 + c.id) % 2];
    else if (c.state === 'eat') fr = side(set.eatR, set.eatL)[Math.floor(t * 4) % 2];
    else if (c.state === 'laser' && c.pounce) fr = side(set.crouchR, set.crouchL)[Math.floor(t * 8) % 2];
    else if (c.moving) {
      if (c.dir === 'down') fr = set.walkD[Math.floor(c.anim * 8) % 2];
      else if (c.dir === 'up') fr = set.walkU[Math.floor(c.anim * 8) % 2];
      else fr = side(set.walkR, set.walkL)[Math.floor(c.anim * 9) % 4];
    } else {
      const blink = (t + c.id * 1.7) % 4 < 0.18 ? 1 : 0;
      fr = set.sit[blink];
    }
    ctx.fillStyle = 'rgba(30,12,40,0.28)';
    ctx.beginPath(); ctx.ellipse(Math.round(c.x), Math.round(c.y) - 1, 7, 2, 0, 0, 6.28); ctx.fill();
    const hop = c.state === 'hug' ? Math.abs(Math.sin(t * 8)) * 1 : 0;
    ctx.drawImage(fr.c, Math.round(c.x - fr.ax), Math.round(c.y - fr.ay - hop));
    if (c.state === 'sleep') {
      ctx.font = FONT; ctx.fillStyle = '#ffffff';
      const k = (t * 0.6 + c.id) % 3;
      ctx.globalAlpha = 1 - k / 3;
      ctx.fillText('z', Math.round(c.x + 6 + k * 3), Math.round(c.y - 12 - k * 4));
      ctx.globalAlpha = 1;
    }
    if (c.state === 'prowl') {
      ctx.fillStyle = '#ff5a5a'; ctx.font = FONT; ctx.fillText('!', Math.round(c.x - 2), Math.round(c.y - 14));
    }
    void world;
  }

  drawRobot(ctx, r, t) {
    const sp = this.art.robot[Math.floor(t * 2 + r.id) % 2];
    ctx.fillStyle = 'rgba(30,12,40,0.28)';
    ctx.beginPath(); ctx.ellipse(Math.round(r.x), Math.round(r.y + 6), 8, 2.5, 0, 0, 6.28); ctx.fill();
    const sh = r.bump > 0 ? (Math.random() - 0.5) * 2 : 0;
    ctx.drawImage(sp.c, Math.round(r.x - sp.ax + sh), Math.round(r.y + 7 - sp.ay + Math.sin(t * 20) * 0.4));
  }

  drawBoss(ctx, b, t) {
    const set = b.state === 'warn' ? this.art.boss.warn : this.art.boss.sleep;
    const fr = set[Math.floor(t * (b.state === 'warn' ? 6 : 1.1)) % 2];
    const sh = b.state === 'warn' ? Math.round((Math.random() - 0.5) * 2) : 0;
    ctx.fillStyle = 'rgba(30,12,40,0.25)';
    ctx.beginPath(); ctx.ellipse(Math.round(b.x), Math.round(b.y - 2), 26, 5, 0, 0, 6.28); ctx.fill();
    ctx.drawImage(fr.c, Math.round(b.x - fr.ax + sh), Math.round(b.y - fr.ay + 2));
    if (b.state === 'sleep' && b.waves > 0) {
      ctx.font = FONT; ctx.fillStyle = '#ffffff';
      const k = (t * 0.5) % 3;
      ctx.globalAlpha = 1 - k / 3;
      ctx.fillText('z', Math.round(b.x + 22 + k * 3), Math.round(b.y - 34 - k * 4));
      ctx.globalAlpha = 1;
    }
  }

  drawLaser(ctx, world, t) {
    const L = world.laser;
    if (!L.on) return;
    const p = world.player;
    const x = L.x + Math.sin(t * 17) * 0.8, y = L.y + Math.cos(t * 13) * 0.8;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
    g.addColorStop(0, 'rgba(255,60,60,0.7)'); g.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillStyle = '#ff3a3a'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    ctx.strokeStyle = 'rgba(255,80,80,0.28)';
    ctx.beginPath(); ctx.moveTo(Math.round(p.x) + 0.5, Math.round(p.y - 10) + 0.5); ctx.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5); ctx.stroke();
  }

  drawParticles(ctx) {
    for (const p of this.parts) {
      const k = Math.max(0, p.life / p.max);
      if (p.k === 'puff') {
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = p.col;
        const s = k > 0.5 ? 2 : 1;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s + 1, s + 1);
      } else if (p.k === 'spark') {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.col;
        const x = Math.round(p.x), y = Math.round(p.y);
        ctx.fillRect(x, y, 1, 1); if (k > 0.5) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      } else if (p.k === 'heart') {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.drawImage(this.art.heart.c, Math.round(p.x - 4), Math.round(p.y - 6));
      } else if (p.k === 'confetti') {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.col;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.font = FONT;
    for (const f of this.floaters) {
      const k = f.life / f.max;
      ctx.globalAlpha = Math.min(1, k * 2);
      const x = Math.round(f.x - f.text.length * 4);
      ctx.fillStyle = '#2a1830';
      ctx.fillText(f.text, x + 1, Math.round(f.y) + 1);
      ctx.fillStyle = f.col;
      ctx.fillText(f.text, x, Math.round(f.y));
    }
    ctx.globalAlpha = 1;
  }

  drawMotes(ctx, t) {
    ctx.fillStyle = '#fff4d0';
    for (const m of this.motes) {
      const x = m.x + Math.sin(t * 0.3 + m.p) * 14, y = m.y + Math.cos(t * 0.25 + m.p * 1.7) * 9 - ((t * m.s * 0.5) % 6);
      ctx.globalAlpha = 0.18 + 0.25 * (Math.sin(t * 1.4 + m.p * 3) + 1) / 2;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  confetti(n = 40) {
    const cols = ['#ff7aa8', '#ffd24a', '#7ae0ff', '#9aff9a', '#d09aff'];
    for (let i = 0; i < n; i++) {
      this.parts.push({ k: 'confetti', x: Math.random() * VW, y: -4 - Math.random() * 40, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 40, life: 2.5, max: 2.5, col: cols[i % cols.length] });
    }
  }
}
