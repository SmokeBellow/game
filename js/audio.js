// Звук: музыка из файла, эффекты синтезируются в Web Audio (кроме оригинального «поп» сбора шерсти).
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicVol = 0.5;
    this.sfxVol = 0.8;
    this.music = new Audio('audio/music.mp3');
    this.music.loop = true;
    this.music.preload = 'auto';
    this.ending = new Audio('audio/ending.mp3');
    this.ending.loop = false;
    this.ending.preload = 'none';
    this.duck = 1;
    this.pop = null;
    this.current = null;
    this.unlocked = false;
    this.noiseBuf = null;
    this.lastStep = 0;
  }

  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    this.applyVolumes();
  }

  applyVolumes() {
    if (this.current) this.current.volume = Math.min(1, this.musicVol * this.duck);
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVol;
  }

  // вызывается из пользовательского жеста
  unlock() {
    if (this.unlocked) { this.ctx && this.ctx.state === 'suspended' && this.ctx.resume(); return; }
    this.unlocked = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.master);
      // шум для эффектов
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      fetch('audio/pop.mp3').then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).then((buf) => { this.pop = buf; }).catch(() => {});
    } catch (e) { this.ctx = null; }
    if (this.current) this.current.play().catch(() => {});
  }

  playMusic(which = 'music') {
    const next = which === 'ending' ? this.ending : this.music;
    if (this.current === next && !next.paused) return;
    if (this.current && this.current !== next) this.current.pause();
    this.current = next;
    if (which === 'ending') next.currentTime = 0;
    next.volume = Math.min(1, this.musicVol * this.duck);
    if (this.unlocked) next.play().catch(() => {});
  }

  suspend() {
    if (this.current) this.current.pause();
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this.current && this.unlocked) this.current.play().catch(() => {});
  }

  setDuck(v) { this.duck = v; this.applyVolumes(); }

  // ---- синтез ----
  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0, attack = 0.005, lp = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    let node = o;
    if (lp) {
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
      o.connect(f); node = f;
    }
    node.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise(dur, { vol = 0.2, lp = 800, hp = 0, delay = 0, slide = 0 } = {}) {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(lp, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(60, lp + slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    let node = s;
    if (hp) { const h = this.ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; s.connect(h); node = h; }
    node.connect(f); f.connect(g); g.connect(this.sfxGain);
    s.start(t); s.stop(t + dur + 0.05);
  }

  // ---- события игры ----
  collect(combo = 1) {
    if (!this.ctx) return;
    const i = Math.min(Math.max(combo, 1) - 1, PENTA.length - 1);
    if (this.pop) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.pop;
      s.playbackRate.value = 1 + i * 0.09;
      const g = this.ctx.createGain(); g.gain.value = 0.55;
      s.connect(g); g.connect(this.sfxGain);
      s.start(0, 0, 0.45);
    }
    this.tone(PENTA[i], 0.22, { type: 'triangle', vol: 0.22 });
    this.tone(PENTA[i] * 2, 0.14, { type: 'sine', vol: 0.08, delay: 0.02 });
  }

  step(ice) {
    const now = performance.now();
    if (now - this.lastStep < 120) return;
    this.lastStep = now;
    if (ice) this.noise(0.09, { vol: 0.05, lp: 5000, hp: 2500 });
    else this.noise(0.04, { vol: 0.045, lp: 700 });
  }

  meow(kind) {
    if (!this.ctx) return;
    if (kind === 'alert') {
      this.tone(760, 0.18, { type: 'sawtooth', vol: 0.08, slide: 300, lp: 1800 });
      this.tone(1100, 0.12, { type: 'square', vol: 0.03, delay: 0.1, lp: 1500 });
    } else if (kind === 'call') {
      this.tone(620, 0.22, { type: 'sawtooth', vol: 0.06, slide: 260, lp: 1700 });
      this.tone(900, 0.16, { type: 'sine', vol: 0.05, slide: -250, delay: 0.1 });
    } else if (kind === 'happy') {
      this.purr(0.9, 0.09);
      this.tone(520, 0.3, { type: 'sine', vol: 0.12, slide: 180 });
    } else {
      this.tone(480, 0.45, { type: 'sawtooth', vol: 0.07, slide: 300, lp: 1500 });
      this.tone(720, 0.3, { type: 'sine', vol: 0.06, slide: -200, delay: 0.1 });
    }
  }

  purr(dur = 1, vol = 0.1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 62;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 24;
    const lg = this.ctx.createGain(); lg.gain.value = 0.5;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.15); g.gain.linearRampToValueAtTime(0, t + dur);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const am = this.ctx.createGain(); am.gain.value = 0.5;
    lfo.connect(lg); lg.connect(am.gain);
    o.connect(f); f.connect(am); am.connect(g); g.connect(this.sfxGain);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }

  // «ты-гы-дык»: быстрый топот лапок, когда кошка бежит к миске
  gallop() {
    const now = performance.now();
    if (now - (this.lastGallop || 0) < 200) return;
    this.lastGallop = now;
    this.noise(0.03, { vol: 0.07, lp: 800 });
    this.tone(180, 0.05, { type: 'sine', vol: 0.09, slide: -60 });
    this.noise(0.03, { vol: 0.06, lp: 1000, delay: 0.075 });
    this.tone(210, 0.05, { type: 'sine', vol: 0.07, slide: -60, delay: 0.075 });
    this.noise(0.05, { vol: 0.1, lp: 650, delay: 0.17 });
    this.tone(130, 0.08, { type: 'sine', vol: 0.12, slide: -50, delay: 0.17 });
  }

  hug() { this.purr(1.3, 0.12); this.tone(880, 0.2, { type: 'sine', vol: 0.12, delay: 0.05 }); this.tone(1174, 0.25, { type: 'sine', vol: 0.1, delay: 0.15 }); }
  shed() { this.noise(0.18, { vol: 0.08, lp: 900, slide: -500 }); }
  land() { this.noise(0.08, { vol: 0.05, lp: 600 }); }
  push() { this.tone(120, 0.14, { type: 'sine', vol: 0.28, slide: -60 }); this.noise(0.1, { vol: 0.1, lp: 500 }); }
  bowl() { this.tone(1320, 0.1, { type: 'triangle', vol: 0.18 }); this.tone(1760, 0.14, { type: 'triangle', vol: 0.14, delay: 0.09 }); this.noise(0.12, { vol: 0.06, lp: 3000, hp: 1500, delay: 0.02 }); }
  laserOn() { this.tone(900, 0.12, { type: 'sine', vol: 0.1, slide: 700 }); }
  laserOff() { this.tone(1500, 0.1, { type: 'sine', vol: 0.06, slide: -900 }); }
  yarn() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.16, delay: i * 0.07 })); }
  turbo() { this.tone(260, 0.5, { type: 'sawtooth', vol: 0.12, slide: 1300, lp: 2500 }); this.noise(0.4, { vol: 0.07, lp: 1500, slide: 2500 }); }
  bump() { this.tone(180, 0.07, { type: 'square', vol: 0.05, lp: 600 }); }
  bossWarn() { this.tone(70, 1.2, { type: 'sine', vol: 0.4, slide: 40 }); this.tone(55, 1.2, { type: 'sine', vol: 0.3, delay: 0.1 }); }
  bossBurst() { this.noise(0.7, { vol: 0.35, lp: 4000, slide: -3500 }); this.tone(220, 0.5, { type: 'triangle', vol: 0.2, slide: -120 }); }
  click() { this.tone(660, 0.06, { type: 'triangle', vol: 0.12 }); }
  back() { this.tone(440, 0.07, { type: 'triangle', vol: 0.1, slide: -90 }); }
  star(i = 0) { this.tone(PENTA[2 + i * 2] || 1318, 0.5, { type: 'triangle', vol: 0.22 }); this.tone((PENTA[2 + i * 2] || 1318) * 2, 0.4, { type: 'sine', vol: 0.08, delay: 0.03 }); }
  ach() {
    [880, 1108.7, 1318.5, 1760].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.16, delay: i * 0.07 }));
    this.tone(2093, 0.5, { type: 'sine', vol: 0.07, delay: 0.3 });
  }

  cheat() {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 0.25, { type: 'square', vol: 0.06, delay: i * 0.05, lp: 2400 }));
    this.noise(0.5, { vol: 0.12, lp: 6000, hp: 2500, delay: 0.1 });
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 0.55, { type: 'triangle', vol: 0.2, delay: i * 0.1 }));
    this.tone(261.6, 1.2, { type: 'sine', vol: 0.2, delay: 0 });
  }

  // разбор событий мира
  handle(events) {
    for (const e of events) {
      switch (e.t) {
        case 'collect': this.collect(e.combo); break;
        case 'collectRobot': this.tone(1000, 0.08, { type: 'sine', vol: 0.07 }); break;
        case 'step': this.step(e.ice); break;
        case 'meow': this.meow(e.kind); break;
        case 'hug': this.hug(); break;
        case 'gallop': this.gallop(); break;
        case 'shed': this.shed(); break;
        case 'land': this.land(); break;
        case 'push': this.push(); break;
        case 'bowl': this.bowl(); break;
        case 'laserOn': this.laserOn(); break;
        case 'laserOff': this.laserOff(); break;
        case 'yarn': this.yarn(); break;
        case 'turbo': this.turbo(); break;
        case 'bump': this.bump(); break;
        case 'bossWarn': this.bossWarn(); break;
        case 'bossBurst': this.bossBurst(); break;
        case 'cheat': this.cheat(); break;
        case 'won': this.win(); break;
        default: break;
      }
    }
  }
}
