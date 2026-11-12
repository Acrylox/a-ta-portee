'use strict';
/* Entrées et sorties : bus de notes, Web MIDI, clavier d'ordinateur, synthé, clavier à l'écran. */

/* Toutes les notes jouées (piano MIDI, clavier à l'écran, clavier d'ordinateur) passent par ici. */
const Input = {
  subs: new Set(), held: new Set(), last: 0,
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  send(ev) { for (const fn of [...this.subs]) { try { fn(ev); } catch (e) { console.error(e); } } },
  noteOn(midi, vel = 90, src = 'virtual') {
    this.held.add(midi); this.last = performance.now();
    this.send({ type: 'on', midi, vel, src, t: this.last });
  },
  noteOff(midi, src = 'virtual') {
    this.held.delete(midi);
    this.send({ type: 'off', midi, src, t: performance.now() });
  },
};

const Midi = {
  supported: typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess,
  status: 'idle', access: null, inputs: [], subs: new Set(),
  onChange(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { for (const fn of [...this.subs]) fn(this); },
  get connected() { return this.status === 'ready' && this.inputs.length > 0; },
  async auto() {
    if (!this.supported) { this.status = 'unsupported'; return this.emit(); }
    try {
      const p = await navigator.permissions.query({ name: 'midi' });
      if (p.state === 'granted') return this.connect();
    } catch (e) { /* certains navigateurs ne connaissent pas cette permission */ }
    this.emit();
  },
  async connect() {
    if (!this.supported) { this.status = 'unsupported'; this.emit(); return false; }
    this.status = 'pending'; this.emit();
    try { this.access = await navigator.requestMIDIAccess({ sysex: false }); }
    catch (e) { this.status = 'denied'; this.emit(); return false; }
    this.access.onstatechange = () => this.refresh();
    this.refresh();
    return true;
  },
  refresh() {
    this.inputs = [...this.access.inputs.values()].filter(i => i.state !== 'disconnected');
    for (const i of this.inputs) i.onmidimessage = e => this.msg(e.data);
    this.status = 'ready'; this.emit();
  },
  msg(d) {
    const cmd = d[0] & 0xf0;
    if (cmd === 0x90 && d[2] > 0) Input.noteOn(d[1], d[2], 'midi');
    else if (cmd === 0x80 || (cmd === 0x90 && d[2] === 0)) Input.noteOff(d[1], 'midi');
  },
  label() {
    if (this.status === 'unsupported') return 'MIDI non pris en charge par ce navigateur';
    if (this.status === 'denied') return 'Accès MIDI refusé';
    if (this.status === 'pending') return 'Connexion…';
    if (this.connected) return this.inputs.map(i => i.name).join(', ');
    return this.status === 'ready' ? 'Aucun piano détecté' : 'Connecter mon piano';
  },
};

/* Clavier d'ordinateur : la rangée du milieu joue les touches blanches (position physique, AZERTY ou QWERTY). */
const PcKeys = {
  MAP: { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16 },
  octave: 0, down: new Map(), layout: null,
  init() {
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { this.layout = m; if (typeof App !== 'undefined') App.drawDock(); }).catch(() => {});
    addEventListener('keydown', e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && /^(text|number|search|email|url|password)$/.test(t.type)))) return;
      if (e.code === 'KeyZ' || e.code === 'KeyX') { this.octave = clamp(this.octave + (e.code === 'KeyX' ? 1 : -1), -3, 3); if (typeof App !== 'undefined') App.drawDock(); return; }
      if (!(e.code in this.MAP) || this.down.has(e.code)) return;
      const m = 60 + 12 * this.octave + this.MAP[e.code];
      this.down.set(e.code, m);
      Sound.ensure(); Input.noteOn(m, 85, 'keys');
    });
    addEventListener('keyup', e => {
      const m = this.down.get(e.code);
      if (m != null) { this.down.delete(e.code); Input.noteOff(m, 'keys'); }
    });
  },
  label(code) { const k = this.layout && this.layout.get(code); return (k || code.replace('Key', '')).toUpperCase(); },
};

/* Petit synthétiseur : sert au clavier à l'écran, aux exemples sonores et au métronome. */
const Sound = {
  ctx: null, out: null, wave: null, voices: new Map(),
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 5;
      this.out = this.ctx.createGain();
      this.out.gain.value = Store.s.volume;
      this.out.connect(comp); comp.connect(this.ctx.destination);
      const amps = [0, 1, 0.42, 0.2, 0.11, 0.06, 0.035, 0.02, 0.012, 0.008];
      this.wave = this.ctx.createPeriodicWave(new Float32Array(amps.length), new Float32Array(amps));
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  setVolume(v) { Store.set('volume', v); if (this.out) this.out.gain.value = v; },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  freq(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  voice(midi, vel, at) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    const fr = this.freq(midi);
    o.setPeriodicWave(this.wave); o.frequency.value = fr;
    f.type = 'lowpass'; f.frequency.setValueAtTime(Math.min(11000, fr * 6 + 900), at);
    f.frequency.setTargetAtTime(Math.min(6000, fr * 2 + 400), at, 0.35);
    const peak = 0.3 * Math.pow(clamp(vel, 20, 127) / 127, 1.2);
    const decay = clamp(1.3 - (midi - 36) * 0.014, 0.3, 1.4);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.006);
    g.gain.setTargetAtTime(0.0001, at + 0.008, decay);
    o.connect(f); f.connect(g); g.connect(this.out);
    o.start(at);
    return { o, g };
  },
  release(v, at) { v.g.gain.setTargetAtTime(0, at, 0.07); v.o.stop(at + 0.6); },
  noteOn(midi, vel = 90) {
    if (!this.ensure()) return;
    this.noteOff(midi);
    this.voices.set(midi, this.voice(midi, vel, this.ctx.currentTime));
  },
  noteOff(midi) {
    const v = this.voices.get(midi);
    if (v) { this.release(v, this.ctx.currentTime); this.voices.delete(midi); }
  },
  /* Note programmée : `delay` secondes après maintenant, ou à l'instant audio `at`. */
  play(midi, dur = 0.5, vel = 80, delay = 0, at = null) {
    if (!this.ensure()) return;
    const t = at != null ? Math.max(at, this.ctx.currentTime) : this.ctx.currentTime + delay;
    this.release(this.voice(midi, vel, t), t + dur);
  },
  click(accent, at) {
    if (!this.ensure()) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    at = Math.max(at == null ? 0 : at, c.currentTime);
    o.type = 'triangle'; o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(accent ? 0.6 : 0.38, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    o.connect(g); g.connect(this.out);
    o.start(at); o.stop(at + 0.08);
  },
};

/* Clavier à l'écran : montre ce qui est joué, les touches à trouver, et se joue à la souris. */
const Piano = {
  el: null, lo: 36, hi: 96, keys: new Map(), marks: new Map(), ptr: null,
  isBlack(m) { return [1, 3, 6, 8, 10].includes(mod(m, 12)); },
  mount(el) {
    this.el = el; this.build();
    Input.on(ev => { this.ensure(ev.midi); const k = this.keys.get(ev.midi); if (k) k.classList.toggle('down', ev.type === 'on'); });
    el.addEventListener('pointerdown', e => {
      const k = e.target.closest('.key'); if (!k) return;
      e.preventDefault(); this.ptr = +k.dataset.midi;
      Sound.ensure(); Input.noteOn(this.ptr, 85, 'virtual');
    });
    el.addEventListener('pointermove', e => {
      if (this.ptr == null) return;
      const t = document.elementFromPoint(e.clientX, e.clientY), k = t && t.closest && t.closest('#piano .key');
      if (k && +k.dataset.midi !== this.ptr) { Input.noteOff(this.ptr, 'virtual'); this.ptr = +k.dataset.midi; Input.noteOn(this.ptr, 85, 'virtual'); }
    });
    const up = () => { if (this.ptr != null) { Input.noteOff(this.ptr, 'virtual'); this.ptr = null; } };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
  },
  build() {
    this.el.innerHTML = ''; this.keys.clear();
    const whites = [];
    for (let m = this.lo; m <= this.hi; m++) if (!this.isBlack(m)) whites.push(m);
    const W = 100 / whites.length, mode = Store.s.keyLabels;
    let wi = 0;
    for (let m = this.lo; m <= this.hi; m++) {
      const black = this.isBlack(m);
      const k = h('div', { class: 'key ' + (black ? 'black' : 'white') + (m === 60 ? ' middle' : ''), 'data-midi': m });
      if (black) { k.style.left = (wi * W - W * 0.3) + '%'; k.style.width = (W * 0.6) + '%'; }
      else {
        k.style.left = (wi * W) + '%'; k.style.width = W + '%'; wi++;
        const isC = mod(m, 12) === 0;
        if (mode === 'all' || (mode === 'do' && isC)) k.append(h('span', { class: 'lbl' }, Notes.name(m, isC && mode === 'do')));
      }
      this.el.append(k); this.keys.set(m, k);
    }
    for (const [cls, list] of this.marks) for (const m of list) { const k = this.keys.get(m); if (k) k.classList.add(cls); }
  },
  ensure(m) { if (m < this.lo || m > this.hi) { this.lo = 21; this.hi = 108; this.build(); } },
  mark(list, cls = 'target') {
    this.clear(cls);
    list = list.filter(m => m >= 21 && m <= 108);
    for (const m of list) this.ensure(m);
    for (const m of list) { const k = this.keys.get(m); if (k) k.classList.add(cls); }
    this.marks.set(cls, list);
  },
  clear(cls = 'target') {
    for (const m of this.marks.get(cls) || []) { const k = this.keys.get(m); if (k) k.classList.remove(cls); }
    this.marks.delete(cls);
  },
  flash(m, cls) {
    const k = this.keys.get(m); if (!k) return;
    k.classList.add(cls); setTimeout(() => k.classList.remove(cls), 320);
  },
};

/* Petit clavier d'illustration pour les leçons. `marks` : { numéroMidi: étiquette | true }. */
function miniPiano(lo, hi, marks = {}) {
  const el = h('div', { class: 'mini-piano' }), whites = [];
  for (let m = lo; m <= hi; m++) if (!Piano.isBlack(m)) whites.push(m);
  const W = 100 / whites.length;
  let wi = 0;
  for (let m = lo; m <= hi; m++) {
    const b = Piano.isBlack(m), k = h('div', { class: 'key ' + (b ? 'black' : 'white') + (m in marks ? ' marked' : '') });
    if (b) { k.style.left = (wi * W - W * 0.3) + '%'; k.style.width = (W * 0.6) + '%'; }
    else { k.style.left = (wi * W) + '%'; k.style.width = W + '%'; wi++; }
    if (m in marks) k.append(h('span', { class: 'lbl' }, marks[m] === true ? Notes.name(m) : marks[m]));
    el.append(k);
  }
  el.style.maxWidth = whites.length * 46 + 'px';
  return el;
}
