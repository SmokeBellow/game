// Проверка уровней без браузера.
//   node tests/validate.mjs            — статические проверки всех уровней
//   node tests/validate.mjs --play     — плюс прохождение ботом через настоящую логику
//   node tests/validate.mjs --ascii 3  — нарисовать уровень 3 текстом
import { LEVELS } from '../js/levels.js';
import { World } from '../js/world.js';
import { TILE, GW, GH, IN_X, IN_Y, IN_W, IN_H, CFG } from '../js/defs.js';

const args = process.argv.slice(2);
const play = args.includes('--play');
const asciiIdx = args.indexOf('--ascii');
const only = args.includes('--only') ? Number(args[args.indexOf('--only') + 1]) : null;

let failed = 0;
const fail = (id, msg) => { failed++; console.log(`  ✗ L${id}: ${msg}`); };

function ascii(w) {
  const rows = [];
  for (let ty = 0; ty < GH; ty++) {
    let s = '';
    for (let tx = 0; tx < GW; tx++) {
      let ch = '.';
      if (w.wall[ty * GW + tx]) ch = '#';
      else if (w.occ[ty * GW + tx]) ch = '▒';
      else if (w.ground[ty * GW + tx] === 1) ch = ':';
      else if (w.ground[ty * GW + tx] === 2) ch = '~';
      s += ch;
    }
    rows.push(s.split(''));
  }
  const put = (x, y, c) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (rows[ty]) rows[ty][tx] = c; };
  for (const c of w.crates) put(c.x + 8, c.y + 8, 'o');
  for (const x of w.wools) put(x.x, x.y, 'w');
  for (const c of w.cats) put(c.x, c.y - 4, c.kind === 'sleeper' ? 'z' : 'c');
  for (const r of w.robots) put(r.x, r.y, 'R');
  for (const i of w.items) put(i.x, i.y, 'T');
  if (w.yarn) put(w.yarn.x, w.yarn.y, 'Y');
  put(w.player.x, w.player.y - 4, 'P');
  return rows.map((r) => r.join('')).join('\n');
}

// ---- статика ----
function staticCheck(def) {
  let w;
  try { w = new World(def); } catch (e) { fail(def.id, `ошибка разбора: ${e.message}`); return null; }
  // достижимость (4-соседство, пуфы считаем проходимыми — их можно сдвинуть)
  const seen = new Uint8Array(GW * GH);
  const sx = Math.floor(w.player.x / TILE), sy = Math.floor((w.player.y - 4) / TILE);
  const q = [[sx, sy]];
  seen[sy * GW + sx] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (w.staticBlocked(nx, ny) || seen[ny * GW + nx]) continue;
      seen[ny * GW + nx] = 1;
      q.push([nx, ny]);
    }
  }
  const reach = (x, y) => seen[Math.floor(y / TILE) * GW + Math.floor(x / TILE)];
  w.wools.forEach((x) => { if (!reach(x.x, x.y)) fail(def.id, `шерсть недостижима в (${Math.floor(x.x / TILE) - IN_X},${Math.floor(x.y / TILE) - IN_Y})`); });
  if (w.yarn && !reach(w.yarn.x, w.yarn.y)) fail(def.id, 'клубок недостижим');
  w.items.forEach((i) => { if (!reach(i.x, i.y)) fail(def.id, 'усилитель недостижим'); });
  w.cats.forEach((c) => { if (c.kind === 'wander' && !reach(c.x, c.y - 4)) fail(def.id, 'кот заперт'); });
  if (w.cats.some((c) => c.kind === 'sleeper') && !(w.avail.bowl || w.avail.laser)) fail(def.id, 'есть соня, но нет ни миски, ни лазера');
  if (w.cats.some((c) => c.kind === 'sleeper' && c.budget > 0)) fail(def.id, 'у сони не должно быть шерсти');
  if (w.cats.some((c) => c.kind === 'wander' && c.budget <= 0)) fail(def.id, 'у кота нет шерсти');
  if (w.total < 5) fail(def.id, 'слишком мало шерсти');
  if (w.total > 60) fail(def.id, `слишком много шерсти: ${w.total}`);
  return w;
}

// ---- бот ----
function botPlay(def, seed = 0) {
  const w = new World(def, { seed });
  const dt = 1 / 60;
  let stuckT = 0, lastX = w.player.x, lastY = w.player.y, bowlWait = 0;
  const maxT = 420;
  let avoid = new Set();
  const walkableP = (tx, ty, allowCrate) => {
    if (w.staticBlocked(tx, ty)) return false;
    if (avoid.has(`${tx},${ty}`)) return false;
    if (!allowCrate && w.crateAtTile(tx, ty)) return false;
    for (const c of w.cats) if (c.solid && c.htx === tx && c.hty === ty) return false;
    return true;
  };
  function bfs(sx, sy, goalFn, allowCrate, allowSleeper) {
    const prev = new Map();
    const key = (x, y) => y * GW + x;
    const q = [[sx, sy]];
    prev.set(key(sx, sy), null);
    for (let h = 0; h < q.length; h++) {
      const [x, y] = q[h];
      if (goalFn(x, y)) {
        const path = [];
        let k = key(x, y);
        while (prev.get(k)) { path.push([k % GW, (k / GW) | 0]); k = prev.get(k); }
        return path.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (prev.has(key(nx, ny))) continue;
        let ok = walkableP(nx, ny, false);
        if (!ok && allowSleeper) ok = !w.staticBlocked(nx, ny) && !w.crateAtTile(nx, ny);
        if (!ok && allowCrate) {
          const c = w.crateAtTile(nx, ny);
          if (c && walkableP(nx + dx, ny + dy, false)) ok = true;
        }
        if (!ok) continue;
        prev.set(key(nx, ny), key(x, y));
        q.push([nx, ny]);
      }
    }
    return null;
  }
  const tileOf = (x, y) => [Math.floor(x / TILE), Math.floor((y - 4) / TILE)];
  let wp = null;       // текущий путь
  let repath = 0;
  while (w.t < maxT && w.state === 'play') {
    const p = w.player;
    const inp = { x: 0, y: 0, bowl: false, laser: false };
    repath -= dt;
    const [ptx, pty] = tileOf(p.x, p.y);
    if (p.frozen <= 0) {
      if (repath <= 0 || !wp || wp.length === 0) {
        repath = 0.25;
        // цель: ближайшая шерсть / клубок / усилитель
        const targets = new Set();
        for (const x of w.wools) if (!x.taken && !x.fly) targets.add(`${Math.floor(x.x / TILE)},${Math.floor(x.y / TILE)}`);
        if (w.yarn && !w.yarn.taken) targets.add(`${Math.floor(w.yarn.x / TILE)},${Math.floor(w.yarn.y / TILE)}`);
        const goal = (x, y) => targets.has(`${x},${y}`);
        avoid = new Set();
        for (const r of w.robots) {
          const rx = Math.floor(r.x / TILE), ry = Math.floor(r.y / TILE);
          for (let ddx = -1; ddx <= 1; ddx++) for (let ddy = -1; ddy <= 1; ddy++) avoid.add(`${rx + ddx},${ry + ddy}`);
        }
        avoid.delete(`${ptx},${pty}`);
        wp = bfs(ptx, pty, goal, false, false) || bfs(ptx, pty, goal, true, false);
        if (!wp) { avoid = new Set(); wp = bfs(ptx, pty, goal, false, false) || bfs(ptx, pty, goal, true, false); }
        if (!wp && targets.size) {
          // что-то перекрыто: соня?
          const sleeper = w.cats.find((c) => c.solid);
          if (sleeper && w.avail.bowl && !w.bowl && w.bowlCd <= 0) {
            const far = bfs(ptx, pty, (x, y) => Math.hypot(x - sleeper.htx, y - sleeper.hty) >= 4, false, false);
            if (far && far.length) wp = far; else if (!far) { inp.bowl = true; bowlWait = 8; }
            else { inp.bowl = true; bowlWait = 8; }
          } else if (sleeper && w.avail.laser) {
            inp.laser = true;
          }
        }
      }
      if (w.bowl) bowlWait = 6;
      if (wp && wp.length === 0) {
        // цель в той же клетке: подходим к ближайшей шерсти напрямую
        let best = null, bd = 1e9;
        const cand = [...w.wools.filter((x) => !x.taken && !x.fly), ...(w.yarn && !w.yarn.taken ? [w.yarn] : [])];
        for (const x of cand) { const d = Math.hypot(x.x - p.x, x.y - (p.y - 6)); if (d < bd) { bd = d; best = x; } }
        if (best && bd < 40) { const m = bd || 1; inp.x = (best.x - p.x) / m; inp.y = (best.y - (p.y - 6)) / m; }
      } else if (wp && wp.length) {
        const [tx, ty] = wp[0];
        const gx = (tx + 0.5) * TILE, gy = (ty + 0.5) * TILE + 4;
        const dx = gx - p.x, dy = gy - p.y;
        if (Math.hypot(dx, dy) < 3) wp.shift();
        else { const m = Math.hypot(dx, dy); inp.x = dx / m; inp.y = dy / m; }
      } else if (w.remainingWool() === 0 || w.cats.some((c) => c.solid)) {
        // ждём линьку — стоим; если нужно разбудить соню, ставим миску вдали
        const sleeper = w.cats.find((c) => c.solid);
        if (sleeper && w.avail.bowl && !w.bowl && w.bowlCd <= 0 && Math.hypot(ptx - sleeper.htx, pty - sleeper.hty) >= 3) inp.bowl = true;
        if (sleeper && !w.avail.bowl && w.avail.laser && Math.hypot(ptx - sleeper.htx, pty - sleeper.hty) < 8) inp.laser = true;
      }
    }
    w.update(dt, inp);
    w.ev.length = 0;
    // застревание
    if (Math.hypot(p.x - lastX, p.y - lastY) < 0.05) stuckT += dt; else { stuckT = 0; lastX = p.x; lastY = p.y; }
    if (stuckT > 4 && p.frozen <= 0 && (inp.x || inp.y)) { wp = null; repath = 0; stuckT = 0; }
  }
  return w;
}

if (args.includes('--par')) {
  const out = [];
  for (const def of LEVELS) {
    const ts = [0, 1, 2, 3, 4].map((sd) => botPlay(def, sd)).map((r) => (r.state === 'won' ? r.t : 999)).sort((a, b) => a - b);
    const med = ts[2];
    out.push(Math.max(30, Math.round((med * 2.5 + 12) / 5) * 5));
  }
  console.log(JSON.stringify(out));
  process.exit(0);
}
let ok = 0;
for (const def of LEVELS) {
  if (only && def.id !== only) continue;
  const w = staticCheck(def);
  if (asciiIdx >= 0 && Number(args[asciiIdx + 1]) === def.id && w) console.log(ascii(w));
  if (w && play) {
    const r = botPlay(def);
    const res = r.result();
    const status = r.state === 'won' ? 'OK ' : 'FAIL';
    if (r.state !== 'won') {
      fail(def.id, `бот не прошёл за ${r.t.toFixed(0)}с (осталось шерсти ${r.remainingWool()}, бюджет ${r.pendingShed()})`);
      if (args.includes('--dump')) console.log(ascii(r), '\nигрок', r.player.x.toFixed(0), r.player.y.toFixed(0), 'frozen', r.player.frozen.toFixed(1));
    }
    console.log(`  ${status} L${def.id} «${def.name}» время ${r.t.toFixed(0)}с (пар ${def.par}), шерсти ${r.total}, объятий ${r.hugs}, клубок ${res.yarn ? 'да' : 'нет'}`);
  } else if (w) {
    ok++;
  }
}
console.log(failed ? `\nОшибок: ${failed}` : `\nВсе проверки пройдены (${LEVELS.length} уровней)`);
process.exit(failed ? 1 : 0);
