// Клавиатура и сенсорное управление (плавающий джойстик + кнопки).
export class Input {
  constructor(stage) {
    this.keys = new Set();
    this.edge = { bowl: false, pause: false, restart: false, laserTap: false };
    this.stick = { x: 0, y: 0, active: false, id: null, cx: 0, cy: 0 };
    this.btn = { laser: false };
    this.touchMode = false;
    this.enabled = false;
    this.stage = stage;
    this.joyEl = stage.querySelector('#joy');
    this.knobEl = stage.querySelector('#joy-knob');
    this.bindKeys();
    this.bindTouch();
  }

  bindKeys() {
    const block = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    window.addEventListener('keydown', (e) => {
      if (this.enabled && block.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (!this.enabled) return;
      if (e.code === 'Space' || e.code === 'KeyE') this.edge.bowl = true;
      if (e.code === 'Escape' || e.code === 'KeyP') this.edge.pause = true;
      if (e.code === 'KeyR') this.edge.restart = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  bindTouch() {
    const st = this.stage;
    const zone = st.querySelector('#touch-zone');
    const R = 44; // радиус джойстика в CSS-пикселях
    const setKnob = (dx, dy) => {
      this.knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.touchMode = true;
      document.body.classList.add('touch');
      if (this.stick.active) return;
      this.stick.active = true;
      this.stick.id = e.pointerId;
      this.stick.cx = e.clientX; this.stick.cy = e.clientY;
      this.joyEl.style.left = `${e.clientX}px`;
      this.joyEl.style.top = `${e.clientY}px`;
      this.joyEl.classList.add('on');
      setKnob(0, 0);
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (!this.stick.active || e.pointerId !== this.stick.id) return;
      let dx = e.clientX - this.stick.cx, dy = e.clientY - this.stick.cy;
      const m = Math.hypot(dx, dy);
      if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R; }
      setKnob(dx, dy);
      const k = Math.min(1, m / R);
      this.stick.x = m > 6 ? (dx / (m || 1)) * k : 0;
      this.stick.y = m > 6 ? (dy / (m || 1)) * k : 0;
      if (k < 0.18) { this.stick.x = 0; this.stick.y = 0; }
    });
    const end = (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.active = false; this.stick.x = 0; this.stick.y = 0; this.stick.id = null;
      this.joyEl.classList.remove('on');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // экранные кнопки
    const bowl = st.querySelector('#btn-bowl');
    const laser = st.querySelector('#btn-laser');
    bowl.addEventListener('pointerdown', (e) => { e.preventDefault(); if (this.enabled) this.edge.bowl = true; });
    laser.addEventListener('pointerdown', (e) => { e.preventDefault(); this.btn.laser = true; laser.setPointerCapture(e.pointerId); });
    const lup = () => { this.btn.laser = false; };
    laser.addEventListener('pointerup', lup);
    laser.addEventListener('pointercancel', lup);
    laser.addEventListener('lostpointercapture', lup);
    window.addEventListener('touchstart', () => { this.touchMode = true; document.body.classList.add('touch'); }, { once: true, passive: true });
  }

  // осевое состояние для мира
  poll() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) y -= 1;
    if (k.has('ArrowDown') || k.has('KeyS')) y += 1;
    if (x === 0 && y === 0) { x = this.stick.x; y = this.stick.y; }
    const laser = k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyF') || this.btn.laser;
    const out = { x, y, bowl: this.edge.bowl, laser };
    this.edge.bowl = false;
    return out;
  }

  takePause() { const v = this.edge.pause; this.edge.pause = false; return v; }
  takeRestart() { const v = this.edge.restart; this.edge.restart = false; return v; }
  clearEdges() { this.edge.bowl = false; this.edge.pause = false; this.edge.restart = false; }
}
