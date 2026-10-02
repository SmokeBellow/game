import { VW, VH, WORLDS, CFG } from './defs.js';
import { LEVELS, INTRO, DEMO } from './levels.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { getArt } from './art.js';
import { THEMES } from './sprites_props.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import * as store from './save.js';
import { HATS } from './sprites_chars.js';
import * as rewards from './rewards.js';
import * as ach from './achievements.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ------------------------------------------------------------ тексты из оригинальной игры
const LEVEL_PHRASES = [
  'Великолепно! Уровень покорен!', 'Ты молодец! Еще одна победа!', 'Супер! Дом стал чище!',
  'Превосходно! На шаг ближе к цели!', 'Ура! Уровень успешно пройден!', 'Чистота — залог уюта!',
];
const CAT_FACTS = [
  '😺 У каждой кошки свой уникальный отпечаток носа — как у людей отпечатки пальцев!',
  '👂 В каждом ушке кошки 32 мышцы — они вращают ими, словно антеннами!',
  '🌙 Кошки видят в темноте в 6 раз лучше человека — идеальные ночные охотницы!',
  '😸 Мурлыканье — это не только удовольствие, но и способ успокоиться и даже исцелиться.',
  '🎯 Усы кошки — это сенсоры: они чувствуют всё, даже воздух перед преградой.',
  '🔊 Кошки слышат ультразвук — именно так они выслеживают мышей и других мелких зверьков.',
  '😴 Кошки спят по 16–20 часов в сутки — настоящие мастера отдыха и расслабления.',
  '🐈 У кошек тоже есть ведущая лапа — они бывают правшами и левшами, как и мы!',
];

// ------------------------------------------------------------ состояние
const state = {
  mode: 'boot',          // boot | menu | game
  screen: null,
  world: null,
  levelId: 1,
  paused: false,
  overlay: false,        // открыта карточка механики
  winShown: false,
  last: 0,
};

const app = $('#app');
const stage = $('#stage');
const art = getArt();
const sound = new Sound();
const input = new Input(stage);
const renderer = new Renderer($('#game'));
const bgRenderer = new Renderer($('#bg-canvas'));
let demoWorld = null;
let demoT = 0;

function currentHat() {
  const d = store.data();
  const h = HATS.find((x) => x.id === d.hat);
  return h && rewards.isUnlocked(h.id, d.levels) ? h.id : 'none';
}
function applyHat() { art.setHat(currentHat()); }

const SCREENS = ['logo', 'title', 'menu', 'char', 'map', 'ach', 'about', 'ending', 'game'];
const BG_SCREENS = new Set(['menu', 'char', 'map', 'ach', 'about']);
const hideTimers = {};

function show(name) {
  state.screen = name;
  for (const s of SCREENS) {
    const el = $(`#scr-${s}`);
    if (s === name) continue;
    el.classList.remove('show');
    clearTimeout(hideTimers[s]);
    hideTimers[s] = setTimeout(() => { if (state.screen !== s) el.classList.remove('on'); }, 480);
  }
  const el = $(`#scr-${name}`);
  clearTimeout(hideTimers[name]);
  el.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  app.classList.toggle('bg-on', BG_SCREENS.has(name));
  document.body.classList.toggle('in-game', name === 'game');
  state.mode = name === 'game' ? 'game' : 'menu';
  input.enabled = name === 'game';
}

function fadeThrough(fn, ms = 350) {
  const f = $('#fade');
  f.classList.add('on');
  setTimeout(() => { fn(); requestAnimationFrame(() => f.classList.remove('on')); }, ms);
}

// ------------------------------------------------------------ размеры
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const s = Math.max(1, Math.floor(Math.min(vw / VW, vh / VH) * 32) / 32);
  stage.style.width = `${VW * s}px`;
  stage.style.height = `${VH * s}px`;
  const root = document.documentElement.style;
  root.setProperty('--u', `${s}px`);
  // интерфейс поверх игры не мельче ~3px на «пиксель игры», иначе на телефоне текст нечитаем
  root.setProperty('--hu', `${Math.max(s, VW * s < 560 ? 2.6 : 3)}px`);
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);


// ------------------------------------------------------------ полный экран
const rootEl = document.documentElement;
const fsRequest = rootEl.requestFullscreen || rootEl.webkitRequestFullscreen;
const fsSupported = !!fsRequest;
const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
// игра установлена на главный экран и сама открывается без интерфейса браузера
// (display-mode: fullscreen совпадает и при обычном полном экране через API, поэтому его учитываем только без fullscreenElement)
const isInstalled = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches
  || (matchMedia('(display-mode: fullscreen)').matches && !document.fullscreenElement && !document.webkitFullscreenElement);
const isTouchDevice = matchMedia('(pointer: coarse)').matches;
const inFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || isInstalled();
let fsExpected = false; // мы сами запросили или закрыли режим (отличаем от выхода пользователем)

let sysToastTimer = null;
function sysToast(text, ms = 5000) {
  let el = $('#sys-toast');
  if (!el) { el = document.createElement('div'); el.id = 'sys-toast'; app.appendChild(el); }
  el.textContent = text;
  void el.offsetWidth;
  el.classList.add('on');
  clearTimeout(sysToastTimer);
  sysToastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

async function enterFullscreen() {
  if (!fsSupported) return false;
  fsExpected = true;
  try {
    await fsRequest.call(rootEl, { navigationUI: 'hide' });
    // на Android в полном экране можно зафиксировать горизонтальную ориентацию
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { /* не везде доступно */ }
    return true;
  } catch (e) { fsExpected = false; return false; }
}

async function exitFullscreen() {
  fsExpected = true;
  try { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* уже вышли */ }
  try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) { /* ок */ }
}

function updateFsButtons() {
  const on = inFullscreen();
  const label = on ? 'Выйти из полного экрана' : 'Полный экран';
  const pfs = $('#p-fs');
  if (pfs) pfs.textContent = on ? 'Выйти из полного экрана' : 'Полный экран';
  const mfs = $('#m-fs');
  if (mfs) { mfs.title = label; mfs.setAttribute('aria-label', label); mfs.classList.toggle('active', on); }
  // кнопки не нужны, если режим не поддерживается и это не iPhone (там показываем подсказку)
  const show = fsSupported || isIPhone;
  if (pfs) pfs.style.display = show && !isInstalled() ? '' : 'none';
  if (mfs) mfs.style.display = show && !isInstalled() ? '' : 'none';
}

async function toggleFullscreen() {
  sound.unlock(); sound.click();
  const d = store.data();
  if (!fsSupported) {
    // iPhone не умеет полноэкранный режим для страниц: единственный путь — ярлык на главном экране
    sysToast('На iPhone: кнопка «Поделиться» → «На экран Домой». Игра будет открываться во весь экран, без адресной строки.', 8000);
    return;
  }
  if (inFullscreen()) { d.settings.fullscreen = false; store.save(); await exitFullscreen(); } else { d.settings.fullscreen = true; store.save(); await enterFullscreen(); }
  updateFsButtons();
}

document.addEventListener('fullscreenchange', () => {
  fit(); updateFsButtons();
  // пользователь вышел сам (кнопка «назад», жест) — больше не загоняем его в полный экран
  if (!inFullscreen() && !fsExpected) { store.data().settings.fullscreen = false; store.save(); }
  fsExpected = false;
});
document.addEventListener('webkitfullscreenchange', () => { fit(); updateFsButtons(); });

// на телефоне первое же касание включает полный экран (браузер разрешает его только по жесту)
window.addEventListener('pointerup', (e) => {
  if (!isTouchDevice || e.pointerType !== 'touch' || !fsSupported || inFullscreen()) return;
  const pref = store.data().settings.fullscreen;
  if (pref === false) return;
  enterFullscreen();
}, { capture: true });

$('#m-fs').onclick = toggleFullscreen;
$('#p-fs').onclick = toggleFullscreen;

// ------------------------------------------------------------ заставки
function runLogo() {
  show('logo');
  const el = $('#scr-logo');
  let done = false;
  const next = () => {
    if (done) return; done = true;
    el.style.opacity = 0;
    setTimeout(runTitle, 900);
  };
  setTimeout(next, 3000);
  el.addEventListener('pointerdown', next, { once: true });
}

function runTitle() {
  show('title');
  const el = $('#scr-title');
  const txt = $('#sherstiny-text');
  const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS'];
  let i = 0;
  const iv = setInterval(() => { txt.style.fontFamily = fonts[i]; i = (i + 1) % fonts.length; }, 300);
  let done = false;
  const next = () => {
    if (done) return; done = true;
    clearInterval(iv);
    el.style.opacity = 0;
    setTimeout(() => { el.style.opacity = ''; showMenu(); }, 700);
  };
  setTimeout(next, 4500);
  el.addEventListener('pointerdown', next, { once: true });
}

// ------------------------------------------------------------ фон меню
function startDemo() {
  const d = store.data();
  demoWorld = new World(DEMO, { character: d.character || 'masha' });
  bgRenderer.setWorld(demoWorld);
  demoT = 0;
}

function menuFrame(dt) {
  if (!BG_SCREENS.has(state.screen) || !demoWorld) return;
  demoT += dt;
  demoWorld.update(dt, {});
  demoWorld.ev.length = 0;
  bgRenderer.update(dt);
  bgRenderer.draw(demoWorld);
  if (demoT > 40) startDemo();
}

// ------------------------------------------------------------ меню
function updateMenuStats() {
  const d = store.data();
  const hasProgress = Object.keys(d.levels).length > 0;
  $('#m-play').textContent = hasProgress ? 'Продолжить' : 'Играть';
  $('#menu-stats').innerHTML = `<span>★ ${store.totalStars()} / ${LEVELS.length * 3}</span><span>🧶 ${store.totalYarn()} / ${LEVELS.length}</span>`;
  $('#m-music').textContent = d.settings.music > 0 ? '♪' : '✕';
  const am = $('#m-ach');
  if (am) am.textContent = `Достижения ${ach.count(d)} / ${ach.ACH.length}`;
}

function showMenu() {
  show('menu');
  updateMenuStats();
  if (!demoWorld) startDemo();
  sound.playMusic('music');
}

$('#m-play').onclick = () => {
  sound.unlock(); sound.click();
  const d = store.data();
  const go = () => fadeThrough(() => startLevel(store.highestUnlocked(LEVELS.length)));
  if (!d.character) showChar(go); else go();
};
$('#m-char').onclick = () => { sound.unlock(); sound.click(); showChar(() => showMenu()); };
$('#m-about').onclick = () => { sound.unlock(); sound.click(); showAbout(false); };
$('#m-music').onclick = () => {
  sound.unlock();
  const d = store.data();
  const on = d.settings.music > 0;
  d.settings.music = on ? 0 : 0.5;
  store.save();
  sound.setVolumes(d.settings.music, d.settings.sfx);
  updateMenuStats();
  sound.click();
};
$('#m-reset').onclick = () => {
  if (confirm('Сбросить весь прогресс? Звёзды и открытые комнаты будут удалены.')) {
    store.reset(); updateMenuStats(); sound.click();
  }
};

// добавляем кнопку «Комнаты» между «Играть» и «Персонаж»
{
  const b = document.createElement('button');
  b.className = 'btn'; b.id = 'm-levels'; b.textContent = 'Комнаты';
  $('#m-play').after(b);
  b.onclick = () => { sound.unlock(); sound.click(); showMap(); };
  const a = document.createElement('button');
  a.className = 'btn'; a.id = 'm-ach'; a.textContent = 'Достижения';
  $('#m-char').after(a);
  a.onclick = () => { sound.unlock(); sound.click(); showAch(); };
}

$$('[data-back]').forEach((b) => { b.onclick = () => { sound.back(); showMenu(); }; });

// ------------------------------------------------------------ выбор персонажа
let charAfter = null;
let charAnim = null;

function buildHatRow() {
  const row = $('#hat-row');
  row.innerHTML = '';
  const d = store.data();
  const cur = currentHat();
  HATS.forEach((h) => {
    const ok = rewards.isUnlocked(h.id, d.levels);
    const b = document.createElement('button');
    b.className = `hat-btn${ok ? '' : ' locked'}${h.id === cur ? ' sel' : ''}`;
    b.innerHTML = `<img alt=""><span>${ok ? h.name : rewards.unlockText(h.id)}</span>`;
    $('img', b).src = art.hatIcon(h.id).toDataURL();
    b.title = ok ? h.name : rewards.unlockText(h.id);
    if (ok) b.onclick = () => {
      sound.unlock(); sound.click();
      d.hat = h.id; store.save();
      applyHat(); buildHatRow(); if (demoWorld) startDemo();
    };
    row.appendChild(b);
  });
}

function showChar(after) {
  charAfter = after;
  show('char');
  buildHatRow();
  const sel = store.data().character;
  $$('.char-card').forEach((c) => c.classList.toggle('sel', c.dataset.char === sel));
  clearInterval(charAnim);
  let f = 0;
  const draw = () => {
    f++;
    $$('.char-card').forEach((card) => {
      const cv = $('.char-sprite', card);
      const x = cv.getContext('2d');
      x.clearRect(0, 0, cv.width, cv.height);
      const set = art.players[card.dataset.char].down;
      const fr = f % 8 < 4 ? set.idle[f % 2] : set.walk[f % 4];
      x.drawImage(fr.c, 0, 0);
    });
  };
  draw();
  charAnim = setInterval(draw, 220);
}

$$('.char-card').forEach((card) => {
  card.onclick = () => {
    sound.unlock(); sound.click();
    const d = store.data();
    d.character = card.dataset.char;
    store.save();
    clearInterval(charAnim);
    if (demoWorld) startDemo();
    const cb = charAfter; charAfter = null;
    if (cb) cb(); else showMenu();
  };
});

// ------------------------------------------------------------ карта комнат
function mixHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

function showMap() {
  show('map');
  const list = $('#map-list');
  list.innerHTML = '';
  const d = store.data();
  WORLDS.forEach((w) => {
    const T = THEMES[w.theme];
    const lv = LEVELS.filter((l) => l.world === w.id);
    const stars = lv.reduce((s, l) => s + ((d.levels[l.id] && d.levels[l.id].stars.filter(Boolean).length) || 0), 0);
    const card = document.createElement('div');
    card.className = 'world-card';
    card.style.background = `linear-gradient(135deg, ${mixHex(T.wall, '#ffffff', 0.35)}, ${mixHex(T.wallD, '#ffffff', 0.15)})`;
    card.innerHTML = `<div class="world-head"><h3>Мир ${w.id}. ${w.name}</h3><span>${w.sub}</span><div class="wstars">★ ${stars} / ${lv.length * 3}</div></div><div class="world-levels"></div>`;
    const row = $('.world-levels', card);
    lv.forEach((l) => {
      const r = d.levels[l.id];
      const unlocked = store.isUnlocked(l.id);
      const b = document.createElement('button');
      b.className = `lvl${unlocked ? '' : ' locked'}${l.id === LEVELS.length ? ' boss' : ''}`;
      const st = r ? r.stars.map((s) => (s ? '★' : '<i>★</i>')).join('') : '<i>★★★</i>';
      b.innerHTML = `${unlocked && [].concat(l.intro || []).some((k) => !d.seen[k]) ? '<span class="new">новое</span>' : ''}${r && r.yarn ? '<img class="yrn" alt="клубок">' : ''}<span class="n">${l.id}</span><span class="nm">${l.name}</span><span class="st">${unlocked ? st : '🔒'}</span>`;
      const y = $('.yrn', b);
      if (y) y.src = art.yarn[(l.id * 3) % 8].c.toDataURL();
      if (unlocked) b.onclick = () => {
        sound.unlock(); sound.click();
        const go = () => fadeThrough(() => startLevel(l.id));
        if (!d.character) showChar(go); else go();
      };
      row.appendChild(b);
    });
    list.appendChild(card);
  });
  $('#map-total').textContent = `★ ${store.totalStars()} / ${LEVELS.length * 3}  ·  🧶 ${store.totalYarn()}`;
  // прокрутка к текущему миру
  const cur = LEVELS[store.highestUnlocked(LEVELS.length) - 1];
  const cards = $$('.world-card', list);
  if (cur && cards[cur.world - 1]) list.scrollTop = Math.max(0, cards[cur.world - 1].offsetTop - 120);
}

// ------------------------------------------------------------ достижения
function achIcon(a) {
  const theme = WORLDS[(state.levelId ? LEVELS[state.levelId - 1].world : 1) - 1].theme;
  if (a.icon === 'hat') return art.hatIcon('chef').toDataURL();
  return art.icon(a.icon, theme).toDataURL();
}

function showAch() {
  show('ach');
  const d = store.data();
  const c = ach.context(d);
  const grid = $('#ach-grid');
  grid.innerHTML = '';
  for (const a of ach.ACH) {
    const done = !!d.ach[a.id];
    const pr = ach.progress(a, c);
    const hidden = a.secret && !done;
    const card = document.createElement('div');
    card.className = `ach-card ${done ? 'done' : 'locked'}`;
    const bar = pr && !done ? `<div class="bar"><i style="width:${Math.round((pr.value / pr.goal) * 100)}%"></i></div><div class="n">${pr.value} / ${pr.goal}</div>` : '';
    card.innerHTML = `<img alt=""><div><div class="t">${hidden ? '???' : a.name}</div><div class="d">${hidden ? 'Секретное достижение' : a.desc}</div>${bar}</div>`;
    $('img', card).src = hidden ? art.icon('key').toDataURL() : achIcon(a);
    grid.appendChild(card);
  }
  $('#ach-total').textContent = `🏆 ${ach.count(d)} / ${ach.ACH.length}`;
}

const achQueue = [];
let achBusy = false;
function showAchToast() {
  if (achBusy || !achQueue.length) return;
  achBusy = true;
  const a = achQueue.shift();
  $('#ach-toast-icon').src = achIcon(a);
  $('#ach-toast-name').textContent = a.name;
  $('#ach-toast').classList.add('on');
  sound.ach();
  setTimeout(() => {
    $('#ach-toast').classList.remove('on');
    setTimeout(() => { achBusy = false; showAchToast(); }, 450);
  }, 3000);
}

function liveOf(w, committed = false) {
  return {
    stats: committed ? {} : w.stats, hugs: committed ? 0 : w.hugs, maxCombo: committed ? 0 : w.maxCombo, roomHugs: w.hugs,
    won: w.state === 'won', cheated: w.cheated, hasProwler: (w.def.cats || []).some((c) => c.prowl),
  };
}

function awardAchievements(w, committed = false) {
  const fresh = ach.check(store.data(), liveOf(w, committed));
  for (const a of fresh) { achQueue.push(a); (state.runAch = state.runAch || []).push(a); }
  showAchToast();
  return fresh;
}

// ------------------------------------------------------------ об игре и финал
let creditTimers = [];
function showAbout(afterEnding) {
  show('about');
  if (afterEnding) sound.playMusic('ending');
  const credits = $$('.credit');
  credits.forEach((c) => c.classList.remove('visible'));
  creditTimers.forEach(clearTimeout);
  creditTimers = credits.map((c, i) => setTimeout(() => c.classList.add('visible'), 500 + i * 1500));
  $('#about-done').onclick = () => {
    sound.click();
    if (afterEnding) sound.playMusic('music');
    showMenu();
  };
}

function showEnding() {
  store.data().ending = true; store.save();
  sound.playMusic('ending');
  show('ending');
  renderer.confetti(0);
  $('#ending-next').onclick = () => { sound.click(); showAbout(true); };
}

// ------------------------------------------------------------ игра
function fmtTime(t) {
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let toastTimer = null;
function toast(text, ms = 6000) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

function startLevel(id) {
  const def = LEVELS[id - 1];
  if (!def) { showMenu(); return; }
  state.levelId = id;
  state.paused = false;
  state.overlay = false;
  state.winShown = false;
  state.runAch = [];
  hudVals.clear();
  $$('.ov').forEach((o) => o.classList.remove('on'));
  $('#toast').classList.remove('on');
  const d = store.data();
  state.world = new World(def, { character: d.character || 'masha' });
  renderer.setWorld(state.world);
  const w = WORLDS[def.world - 1];
  $('#hud-level').textContent = `Уровень ${id}`;
  $('#hud-name').textContent = def.name;
  $('#time-par').textContent = `★ ${fmtTime(def.par)}`;
  const A = state.world.avail;
  $('#btn-bowl').classList.toggle('avail', !!A.bowl);
  $('#btn-laser').classList.toggle('avail', !!A.laser);
  $('#btn-bowl .ico').src = art.icon('bowl', w.theme).toDataURL();
  $('#btn-laser .ico').src = art.icon('laser', w.theme).toDataURL();
  const hasYarn = !!state.world.yarn;
  $('#hud-yarn').classList.toggle('none', !hasYarn);
  $('#yarn-icon').src = art.yarn[renderer.yarnCol].c.toDataURL();
  input.clearEdges();
  show('game');
  sound.playMusic('music');
  sound.setDuck(1);

  // баннер мира / уровня
  const first = LEVELS.findIndex((l) => l.world === def.world) === id - 1;
  const b = $('#banner');
  $('.b-world', b).textContent = first ? `Мир ${w.id} · ${w.name}` : w.name;
  $('.b-level', b).textContent = `${id}. ${def.name}`;
  b.classList.add('on');
  setTimeout(() => b.classList.remove('on'), 2400);

  state.introQueue = [].concat(def.intro || []).filter((k) => !d.seen[k]);
  if (state.introQueue.length) {
    state.overlay = true;
    setTimeout(() => openIntro(state.introQueue.shift(), w.theme), 900);
  } else if (def.hint) {
    setTimeout(() => toast(hintFor(def)), 2600);
  }
}

function hintFor(def) {
  return document.body.classList.contains('touch') && def.hintTouch ? def.hintTouch : def.hint;
}

function openIntro(key, theme) {
  const it = INTRO[key];
  if (!it) { state.overlay = false; return; }
  $('#intro-icon').src = art.icon(it.icon, theme).toDataURL();
  $('#intro-title').textContent = it.title;
  const touch = document.body.classList.contains('touch');
  $('#intro-text').textContent = it.text + (it.keys ? ` ${touch ? it.touch : it.keys}` : '');
  $('#ov-intro').classList.add('on');
  state.overlay = true;
  state.introKey = key;
  sound.click();
}

function closeIntro() {
  $('#ov-intro').classList.remove('on');
  state.overlay = false;
  const d = store.data();
  if (state.introKey) { d.seen[state.introKey] = true; store.save(); state.introKey = null; }
  input.clearEdges();
  const def = LEVELS[state.levelId - 1];
  if (state.introQueue && state.introQueue.length) {
    const theme = WORLDS[def.world - 1].theme;
    setTimeout(() => openIntro(state.introQueue.shift(), theme), 250);
    return;
  }
  if (def.hint) setTimeout(() => toast(hintFor(def)), 400);
}
$('#intro-ok').onclick = () => { sound.click(); closeIntro(); };

function setPause(on) {
  if (state.world.state === 'won' || state.overlay) return;
  state.paused = on;
  $('#ov-pause').classList.toggle('on', on);
  sound.setDuck(on ? 0.35 : 1);
  input.clearEdges();
  if (on) {
    const s = store.data().settings;
    $('#vol-music').value = Math.round(s.music * 100);
    $('#vol-sfx').value = Math.round(s.sfx * 100);
  }
}
$('#hud-pause').onclick = () => { sound.unlock(); sound.click(); setPause(true); };
$('#p-resume').onclick = () => { sound.click(); setPause(false); };
$('#p-restart').onclick = () => { sound.click(); setPause(false); startLevel(state.levelId); };
$('#p-map').onclick = () => { sound.click(); setPause(false); fadeThrough(showMap); };
$('#vol-music').oninput = (e) => {
  const s = store.data().settings; s.music = e.target.value / 100; store.save(); sound.setVolumes(s.music, s.sfx);
};
$('#vol-sfx').oninput = (e) => {
  const s = store.data().settings; s.sfx = e.target.value / 100; store.save(); sound.setVolumes(s.music, s.sfx);
};
$('#vol-sfx').onchange = () => sound.collect(1);

// ---- секретный код: Ctrl + Shift + P прямо в игре засчитывает комнату
// (одна звезда, без звёзд за скорость и клубок, без счётчиков и достижений, кроме секретного)
function applyCheat() {
  const w = state.world;
  if (!w || w.state !== 'play' || state.overlay) return false;
  if (state.paused) setPause(false);
  input.clearEdges();
  w.cheatWin();
  toast('Секретный код принят!', 2500);
  return true;
}

window.addEventListener('keydown', (e) => {
  if (state.mode !== 'game' || e.repeat) return;
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyP') {
    e.preventDefault();
    applyCheat();
  }
});

// ---- результаты
function showWin() {
  state.winShown = true;
  const w = state.world;
  const res = w.result();
  const hatsBefore = new Set(HATS.filter((h) => rewards.isUnlocked(h.id, store.data().levels)).map((h) => h.id));
  const saved = store.recordLevel(state.levelId, res);
  store.commitStats(w);
  awardAchievements(w, true);
  const freshAch = state.runAch || [];
  const newHat = HATS.find((h) => !hatsBefore.has(h.id) && rewards.isUnlocked(h.id, store.data().levels));
  renderer.confetti(36);
  sound.setDuck(0.6);
  const worldDone = rewards.lastLevelOfWorld(LEVELS[state.levelId - 1].world) === state.levelId && state.levelId < LEVELS.length;
  $('#win-title').textContent = res.cheated ? 'Секретный код сработал!' : worldDone
    ? `Мир «${WORLDS[LEVELS[state.levelId - 1].world - 1].name}» убран!`
    : LEVEL_PHRASES[(state.levelId * 7 + Math.floor(Math.random() * 3)) % LEVEL_PHRASES.length];
  const lines = res.cheated ? [
    { ok: true, text: 'Комната убрана секретным кодом' },
    { ok: false, text: `Быстрее ${fmtTime(res.par)}: с кодом не считается` },
  ] : [
    { ok: res.stars[0], text: 'Комната убрана' },
    { ok: res.stars[1], text: `Быстрее ${fmtTime(res.par)} (у тебя ${fmtTime(res.time)})` },
  ];
  if (res.hasYarn) lines.push({ ok: res.stars[2], text: 'Найден клубок ниток' });
  const box = $('#win-stars');
  box.innerHTML = lines.map((l) => `<div class="star-line pending"><span class="s">★</span><span>${l.text}</span></div>`).join('');
  $('#win-stats').innerHTML = `<div><b>${res.score}</b>очки уюта</div><div><b>x${res.maxCombo}</b>лучшая цепочка</div><div><b>${w.hugs}</b>объятий</div>`;
  $('#win-ach').textContent = freshAch.length ? `🏆 ${freshAch.length > 1 ? 'Новые достижения' : 'Новое достижение'}: ${freshAch.map((a) => a.name).join(', ')}` : '';
  $('#win-fact').textContent = newHat
    ? `🎩 Новая шапочка: ${newHat.name}! Надеть её можно в меню «Персонаж».`
    : CAT_FACTS[Math.floor(Math.random() * CAT_FACTS.length)];
  const last = state.levelId >= LEVELS.length;
  $('#w-next').textContent = last ? 'Финал' : 'Дальше';
  $('#ov-win').classList.add('on');
  $$('.star-line', box).forEach((el, i) => {
    setTimeout(() => {
      el.classList.remove('pending');
      el.classList.add(lines[i].ok ? 'got' : 'no');
      if (lines[i].ok) sound.star(i);
    }, 500 + i * 550);
  });
  void saved;
}
$('#w-retry').onclick = () => { sound.click(); startLevel(state.levelId); };
$('#w-map').onclick = () => { sound.click(); fadeThrough(showMap); };
$('#w-next').onclick = () => {
  sound.click();
  if (state.levelId >= LEVELS.length) fadeThrough(showEnding);
  else fadeThrough(() => startLevel(state.levelId + 1));
};

// ---- HUD
// HUD обновляется каждый кадр, поэтому элементы кешируются, а DOM трогается только при изменении значения
const hudEls = {};
const hudVals = new Map();
function hudEl(sel) { return hudEls[sel] || (hudEls[sel] = $(sel)); }
function hudText(sel, v) { if (hudVals.get(`t${sel}`) !== v) { hudVals.set(`t${sel}`, v); hudEl(sel).textContent = v; } }
function hudStyle(sel, prop, v) { const k = `s${sel}${prop}`; if (hudVals.get(k) !== v) { hudVals.set(k, v); hudEl(sel).style[prop] = v; } }
function hudClass(sel, cls, on) { const k = `c${sel}${cls}`; if (hudVals.get(k) !== on) { hudVals.set(k, on); hudEl(sel).classList.toggle(cls, on); } }

function updateHud() {
  const w = state.world;
  hudText('#meter-count', `${w.collected} / ${w.total}`);
  hudStyle('#meter-fill', 'width', `${Math.round(w.progress() * 100)}%`);
  hudText('#time-now', fmtTime(w.t));
  hudClass('#hud-time', 'late', w.t > w.def.par);
  if (w.yarn) {
    hudText('#yarn-count', w.yarn.taken ? '1/1' : '0/1');
    hudClass('#hud-yarn', 'got', w.yarn.taken);
  }
  if (w.avail.bowl) {
    const cdFrac = w.bowl ? 0 : Math.max(0, w.bowlCd) / CFG.bowlCooldown;
    hudClass('#btn-bowl', 'ready', !w.bowl && w.bowlCd <= 0);
    hudClass('#btn-bowl', 'active', !!w.bowl);
    hudStyle('#btn-bowl .cd', 'height', `${Math.round(cdFrac * 100)}%`);
  }
  if (w.avail.laser) {
    hudClass('#btn-laser', 'active', w.laser.on);
    hudClass('#btn-laser', 'ready', !w.laser.on && w.laser.energy > 1.2);
    hudStyle('#btn-laser .cd', 'height', `${Math.round((1 - w.laser.energy / CFG.laserMax) * 100)}%`);
  }
  hudClass('#turbo-bar', 'on', w.player.turbo > 0);
  if (w.player.turbo > 0) hudStyle('#turbo-bar i', 'width', `${Math.round((w.player.turbo / CFG.turboTime) * 100)}%`);
}

function gameFrame(dt) {
  const w = state.world;
  if (!w) return;
  if (input.takePause()) {
    if (state.paused) setPause(false); else if (!state.overlay) setPause(true);
  }
  if (input.takeRestart() && !state.paused && !state.overlay && w.state === 'play') startLevel(state.levelId);
  const active = !state.paused && !state.overlay;
  if (active) {
    const inp = w.state === 'play' ? input.poll() : { x: 0, y: 0 };
    w.update(dt, inp);
    sound.handle(w.ev);
    renderer.consume(w.ev);
    renderer.update(dt);
  } else {
    input.clearEdges();
    renderer.update(0);
  }
  renderer.draw(w);
  updateHud();
  state.achT = (state.achT || 0) + dt;
  if (state.achT > 0.5 && w.state === 'play') { state.achT = 0; awardAchievements(w); }
  if (w.state === 'won' && !state.winShown && w.winT > 1.1) showWin();
}

function frame(ts) {
  const dt = Math.min(0.05, (ts - state.last) / 1000 || 0);
  state.last = ts;
  if (state.mode === 'game') gameFrame(dt);
  else menuFrame(dt);
  requestAnimationFrame(frame);
}

// ---- клавиатура в оверлеях
window.addEventListener('keydown', (e) => {
  if (state.mode !== 'game') return;
  if (e.code === 'Enter' || e.code === 'Space') {
    if ($('#ov-intro').classList.contains('on')) { e.preventDefault(); $('#intro-ok').click(); }
    else if ($('#ov-win').classList.contains('on') && e.code === 'Enter') $('#w-next').click();
  }
});

// вкладку свернули — ставим на паузу и приглушаем звук
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state.mode === 'game' && state.world && state.world.state === 'play' && !state.overlay && !state.paused) setPause(true);
    sound.suspend();
  } else sound.resume();
});

// звук можно включить только по жесту пользователя
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
  window.addEventListener(ev, () => sound.unlock(), { passive: true });
});

// ------------------------------------------------------------ запуск
async function boot() {
  store.load();
  const d = store.data();
  sound.setVolumes(d.settings.music, d.settings.sfx);
  fit();
  applyHat();
  if (isTouchDevice) { document.body.classList.add('touch'); input.touchMode = true; }
  updateFsButtons();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { await Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('800 16px "Nunito"')]); } catch (e) { /* шрифты подтянутся позже */ }
  startDemo();
  requestAnimationFrame(frame);
  const q = new URLSearchParams(location.search);
  if (q.has('skip')) { showMenu(); } else runLogo();
  window.__game = { state, store, sound, startLevel, showMenu, showMap, showEnding, showAbout, input, renderer, LEVELS };
}
boot();
