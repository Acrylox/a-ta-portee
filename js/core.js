'use strict';
/* Outils de base : DOM, hasard, stockage local, noms de notes. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (typeof v === 'boolean') el[k] = v;
    else el.setAttribute(k, v);
  }
  const add = c => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mod = (a, n) => ((a % n) + n) % n;
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const sum = a => a.reduce((x, y) => x + y, 0);
function wpick(items, wf) {
  const ws = items.map(wf);
  let r = Math.random() * sum(ws);
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
const fmtDur = s => { s = Math.round(s); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min' + (s % 60 ? ' ' + String(s % 60).padStart(2, '0') : ''); };
const plural = (n, one, many) => n + ' ' + (n > 1 ? (many || one + 's') : one);

/* ---------- Stockage (progression et réglages, dans le navigateur) */
const Store = {
  KEY: 'a-ta-portee.v1',
  d: null,
  init() {
    const settings = { naming: 'fr', theme: 'auto', echoMidi: true, volume: 0.8, keyLabels: 'do', dock: true, welcomed: false, goalMin: 10, hints: false, names: false };
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(this.KEY) || '{}') || {}; } catch (e) { saved = {}; }
    this.d = Object.assign({ xp: 0, days: {}, lessons: {}, notes: {}, best: {} }, saved);
    this.d.settings = Object.assign(settings, saved.settings || {});
  },
  _write: null,
  save() {
    if (!this._write) this._write = debounce(() => { try { localStorage.setItem(this.KEY, JSON.stringify(this.d)); } catch (e) { /* stockage indisponible */ } }, 250);
    this._write();
  },
  get s() { return this.d.settings; },
  set(k, v) { this.d.settings[k] = v; this.save(); },
  dayKey(date = new Date()) { return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); },
  day() { const k = this.dayKey(); return this.d.days[k] || (this.d.days[k] = { sec: 0, xp: 0 }); },
  addXp(n) { if (n <= 0) return; this.d.xp += n; this.day().xp += n; this.save(); if (typeof App !== 'undefined') App.drawFoot(); },
  addTime(sec) { this.day().sec += sec; this.save(); },
  level() { const lvl = Math.floor(Math.sqrt(this.d.xp / 40)) + 1; return { lvl, cur: this.d.xp - 40 * (lvl - 1) ** 2, need: 40 * (lvl ** 2 - (lvl - 1) ** 2) }; },
  streak() {
    let n = 0; const d = new Date();
    const active = k => { const x = this.d.days[k]; return x && (x.sec >= 30 || x.xp > 0); };
    if (!active(this.dayKey(d))) d.setDate(d.getDate() - 1);
    while (active(this.dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  noteStat(key, clean, ms) {
    const n = this.d.notes[key] || (this.d.notes[key] = { ok: 0, ko: 0, ms: 0 });
    if (clean) { n.ok++; n.ms += ms; } else n.ko++;
    this.save();
  },
  best(id, acc) { const b = this.d.best[id] || 0; if (acc > b) { this.d.best[id] = acc; this.save(); } return Math.max(b, acc); },
};

/* ---------- Notes */
const Notes = {
  STEPS: 'CDEFGAB',
  SEMI: { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 },
  FR: { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' },
  SHARPS: 'FCGDAEB', FLATS: 'BEADGCF',
  parse(s) {
    const m = /^([A-G])(##|#|bb|b)?(-?\d)$/.exec(s);
    if (!m) throw new Error('Note invalide : ' + s);
    return { step: m[1], alter: { '#': 1, '##': 2, b: -1, bb: -2 }[m[2]] || 0, octave: +m[3] };
  },
  midi(p) { return 12 * (p.octave + 1) + this.SEMI[p.step] + (p.alter || 0); },
  fromMidi(m, flats) {
    const S = [['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0]];
    const F = [['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]];
    const t = (flats ? F : S)[mod(m, 12)];
    return { step: t[0], alter: t[1], octave: Math.floor(m / 12) - 1 };
  },
  acc(a) { return a === 1 ? '♯' : a === -1 ? '♭' : a === 2 ? '♯♯' : a === -2 ? '♭♭' : ''; },
  /* Nom affiché selon le réglage (Do Ré Mi ou C D E). En notation française, le Do central est Do3. */
  name(p, withOct) {
    if (typeof p === 'number') p = this.fromMidi(p);
    const fr = Store.s.naming === 'fr';
    let s = (fr ? this.FR[p.step] : p.step) + this.acc(p.alter || 0);
    if (withOct) s += fr ? p.octave - 1 : p.octave;
    return s;
  },
  both(midi) { const a = this.fromMidi(midi), b = this.fromMidi(midi, true); return a.alter ? this.name(a) + ' / ' + this.name(b) : this.name(a); },
  keyAlter(step, fifths) {
    if (fifths > 0 && this.SHARPS.indexOf(step) < fifths) return 1;
    if (fifths < 0 && this.FLATS.indexOf(step) < -fifths) return -1;
    return 0;
  },
  /* Index diatonique : Do0 = 0, chaque nom de note suivant +1. */
  dia(p) { return p.octave * 7 + this.STEPS.indexOf(p.step); },
  fromDia(i, fifths = 0) { const step = this.STEPS[mod(i, 7)]; return { step, alter: this.keyAlter(step, fifths), octave: Math.floor(i / 7) }; },
  str(p) { return p.step + (p.alter === 1 ? '#' : p.alter === -1 ? 'b' : '') + p.octave; },
  tonic(fifths, minor) {
    let idx = mod(fifths * 4, 7);
    if (minor) idx = (idx + 5) % 7;
    const step = this.STEPS[idx];
    return { step, alter: this.keyAlter(step, fifths), octave: 4 };
  },
  keyName(fifths, minor) { return this.name(this.tonic(fifths, minor)) + (minor ? ' mineur' : ' majeur'); },
  armure(f) {
    if (!f) return 'aucune altération à la clé';
    const fr = s => this.name({ step: s, alter: f > 0 ? 1 : -1, octave: 4 });
    const list = (f > 0 ? this.SHARPS : this.FLATS).slice(0, Math.abs(f)).split('').map(fr).join(', ');
    return plural(Math.abs(f), f > 0 ? 'dièse' : 'bémol') + ' à la clé : ' + list;
  },
};

/* ---------- Petits éléments d'interface */
function toast(msg, kind = '') {
  const t = h('div', { class: 'toast ' + kind }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), 2800);
  setTimeout(() => t.remove(), 3200);
}
function modal(title, body, buttons = []) {
  const close = () => wrap.remove();
  const wrap = h('div', { class: 'modal-wrap', onclick: e => { if (e.target === wrap && !buttons.some(b => b.must)) close(); } },
    h('div', { class: 'modal' }, h('h2', null, title), body,
      h('div', { class: 'modal-actions' }, buttons.map(b => h('button', { class: 'btn ' + (b.cls || ''), onclick: () => { if (!b.fn || b.fn() !== false) close(); } }, b.label)))));
  document.body.append(wrap);
  return close;
}
function seg(options, value, onChange) {
  const el = h('div', { class: 'seg' });
  const draw = () => {
    el.innerHTML = '';
    for (const [v, l] of options) el.append(h('button', { type: 'button', class: v === value ? 'on' : '', onclick: () => { if (v === value) return; value = v; draw(); onChange(v); } }, l));
  };
  draw();
  return el;
}
function field(label, control) { return h('label', { class: 'field' }, h('span', null, label), control); }
function select(options, value, onChange) {
  const s = h('select', { onchange: () => { onChange(s.value); s.blur(); } }, options.map(([v, l]) => h('option', { value: String(v), selected: String(v) === String(value) }, l)));
  return s;
}
function check(label, value, onChange) {
  const c = h('input', { type: 'checkbox', checked: !!value, onchange: () => { onChange(c.checked); c.blur(); } });
  return h('label', { class: 'check' }, c, h('span', null, label));
}
function stars(acc) { const n = acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : acc >= 0.6 ? 1 : 0; return '★'.repeat(n) + '☆'.repeat(3 - n); }
