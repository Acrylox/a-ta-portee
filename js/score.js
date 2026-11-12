'use strict';
/* Affichage des partitions (OpenSheetMusicDisplay), moteur d'entraînement et panneau de pratique. */

const INK = { ok: '#2e9a5e', warn: '#d48a1c', bad: '#d6452f', base: '#000000' };

class ScoreView {
  constructor(host, o = {}) {
    this.host = host; this.o = o; this.zoom = o.zoom || 1;
    this.steps = []; this.positions = 0; this.pos = 0; this.colors = new Map();
    this.loaded = false; this.cursorOn = false; this.staffCount = 1; this.firstMeasure = 1; this.lastMeasure = 1;
    if (typeof opensheetmusicdisplay === 'undefined') {
      host.append(h('div', { class: 'banner' }, 'Le moteur de partitions n\'a pas pu être chargé. Vérifie ta connexion internet, puis recharge la page.'));
      return;
    }
    this.osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(host, Object.assign({
      backend: 'svg', autoResize: false, drawTitle: false, drawSubtitle: false, drawComposer: false, drawLyricist: false, drawCredits: false,
      drawPartNames: false, drawPartAbbreviations: false, drawMeasureNumbers: true, autoBeam: false, followCursor: false,
      disableCursor: o.cursor === false,
      cursorsOptions: [{ type: 0, color: '#e8573f', alpha: 0.3, follow: false }],
    }, o.osmd || {}));
    this.onResize = debounce(() => { if (this.loaded && this.host.isConnected && this.box().clientWidth !== this.w) this.render(false); }, 250);
    addEventListener('resize', this.onResize);
  }
  box() { return this.host.parentElement || this.host; }

  async load(src) {
    if (!this.osmd) throw new Error('Moteur de partitions indisponible.');
    this.loaded = false; this.colors.clear(); this.cursorOn = false;
    this.host.style.width = ''; this.host.style.height = '';
    await this.osmd.load(src);
    if (this.dead) return;
    this.osmd.zoom = this.zoom;
    this.loaded = true;
    this.render(true);
  }

  render(first) {
    const keep = first ? 0 : this.pos, was = this.cursorOn;
    this.host.style.width = ''; this.host.style.height = '';
    this.w = this.box().clientWidth;
    this.osmd.render();
    this.pos = 0; this.cursorOn = false;
    if (first && this.o.cursor !== false) this.extract();
    if (this.o.fit) this.fit();
    for (const [src, col] of this.colors) this.paint(src, col);
    if (was) this.seek(keep, true);
  }

  /* Partition courte : on resserre le cadre autour de la musique pour pouvoir la centrer. */
  fit() {
    const svg = this.host.querySelector('svg'), inner = this.host.firstElementChild;
    if (!svg || !inner) return;
    try {
      /* getBBox répond en unités du dessin : on convertit en pixels (le zoom change l'échelle). */
      const bb = svg.getBBox(), vb = svg.viewBox && svg.viewBox.baseVal;
      const k = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
      const w = Math.ceil((bb.x + bb.width) * k + 14);
      if (w < this.w - 30) Object.assign(this.host.style, { width: w + 'px', margin: '0 auto' });
      /* On rogne aussi les marges blanches au-dessus et en dessous. */
      const top = Math.max(0, Math.floor(bb.y * k - 12));
      inner.style.marginTop = -top + 'px';
      Object.assign(this.host.style, { height: Math.ceil(bb.height * k + 24) + 'px', overflow: 'hidden' });
    } catch (e) { /* sans importance */ }
  }

  /* Parcourt la partition avec le curseur et note, pour chaque position, les notes à jouer. */
  extract() {
    const sheet = this.osmd.Sheet, sm = sheet.SourceMeasures, c = this.osmd.cursor;
    this.steps = []; this.positions = 0;
    const ts = sm[0] && sm[0].ActiveTimeSignature;
    this.time = ts ? [ts.Numerator, ts.Denominator] : [4, 4];
    this.measureLen = this.time[0] * 4 / this.time[1];
    const d0 = sm[0] && sm[0].Duration ? sm[0].Duration.RealValue * 4 : this.measureLen;
    this.anchor = d0 < this.measureLen - 0.01 ? d0 : 0;
    this.bpm = sheet.DefaultStartTempoInBpm || (sm[0] && sm[0].TempoInBPM) || 100;
    this.staffCount = sheet.Staves ? sheet.Staves.length : 1;
    if (!c) return;
    c.reset();
    let pos = 0;
    for (let guard = 0; guard < 200000; guard++) {
      const it = c.iterator || c.Iterator;
      if (!it || it.EndReached) break;
      const notes = [];
      for (const ve of it.CurrentVoiceEntries || []) {
        if (ve.IsGrace) continue;
        for (const n of ve.Notes) {
          if (!n || n.isRest()) continue;
          const tie = n.NoteTie, tied = !!(tie && tie.StartNote && tie.StartNote !== n);
          let dur = n.Length.RealValue * 4;
          if (tie && !tied && tie.Duration) dur = tie.Duration.RealValue * 4;
          const staff = n.ParentStaff || (ve.ParentSourceStaffEntry && ve.ParentSourceStaffEntry.ParentStaff);
          notes.push({ midi: n.halfTone + 12, staff: staff ? staff.idInMusicSheet : 0, tied, dur, src: n });
        }
      }
      if (notes.length) {
        const mi = it.CurrentMeasureIndex, m = sm[mi];
        const src = (it.CurrentSourceTimestamp || it.currentTimeStamp).RealValue * 4;
        const enr = (it.CurrentEnrolledTimestamp || it.CurrentSourceTimestamp || it.currentTimeStamp).RealValue * 4;
        const mt = enr - (src - (m ? m.AbsoluteTimestamp.RealValue * 4 : 0));
        this.steps.push({ pos, t: enr, mt, mnum: m && m.MeasureNumber != null ? m.MeasureNumber : mi + 1, notes });
      }
      c.next(); pos++;
    }
    this.positions = pos;
    c.reset();
    this.firstMeasure = this.steps.reduce((a, s) => Math.min(a, s.mnum), Infinity);
    this.lastMeasure = this.steps.reduce((a, s) => Math.max(a, s.mnum), -Infinity);
    if (!this.steps.length) { this.firstMeasure = 1; this.lastMeasure = 1; }
  }

  seek(pos, force) {
    const c = this.osmd && this.osmd.cursor;
    if (!c || !this.loaded) return;
    pos = clamp(pos, 0, Math.max(0, this.positions - 1));
    if ((pos < this.pos || pos - this.pos > 6) && this.cursorOn) { c.hide(); this.cursorOn = false; }
    if (pos < this.pos) { c.reset(); this.pos = 0; }
    while (this.pos < pos) { c.next(); this.pos++; }
    if (!this.cursorOn || force) { c.show(); this.cursorOn = true; }
    this.scroll();
  }
  hideCursor() { const c = this.osmd && this.osmd.cursor; if (c && this.cursorOn) { c.hide(); this.cursorOn = false; } }

  scroll() {
    const sc = this.o.scroller, c = this.osmd.cursor, el = c && c.cursorElement;
    if (!sc || !el) return;
    const r = el.getBoundingClientRect(), R = sc.getBoundingClientRect();
    if (!r.height) return;
    if (r.top < R.top + 70 || r.bottom > R.bottom - 20) sc.scrollTo({ top: sc.scrollTop + r.top - R.top - 110, behavior: 'smooth' });
  }

  paint(src, col) {
    try {
      const g = this.osmd.EngravingRules.GNote(src), el = g && g.getSVGGElement && g.getSVGGElement();
      if (!el) return;
      for (const p of el.querySelectorAll('path')) { p.setAttribute('fill', col); p.setAttribute('stroke', col); }
    } catch (e) { /* la couleur est un bonus */ }
  }
  color(notes, col) { for (const n of notes) { this.colors.set(n.src, col); this.paint(n.src, col); } }
  clearColors() { for (const src of this.colors.keys()) this.paint(src, INK.base); this.colors.clear(); }

  destroy() {
    removeEventListener('resize', this.onResize);
    this.loaded = false; this.dead = true;
    try { if (this.osmd) this.osmd.clear(); } catch (e) { /* rien */ }
    this.host.innerHTML = '';
  }
}

/* Moteur d'entraînement sur une partition affichée.
   Modes : 'wait' (la partition attend la bonne note), 'tempo' (au métronome, noté en rythme), 'listen' (écoute). */
class Trainer {
  constructor(view, o) { this.v = view; this.o = o; this.done = false; this.raf = 0; this.off = null; }

  start() {
    const v = this.v, o = this.o, act = o.staves || null;
    Trainer.last = this;                                 // pratique pour le débogage dans la console
    this.seq = v.steps.filter(s => (o.from == null || s.mnum >= o.from) && (o.to == null || s.mnum <= o.to)).map(s => ({
      s, t: s.t,
      req: s.notes.filter(n => !n.tied && (!act || act.has(n.staff))),
      oth: s.notes.filter(n => !n.tied && act && !act.has(n.staff)),
      hit: new Set(),
    }));
    const playable = this.seq.filter(x => x.req.length);
    this.st = { total: playable.length, notes: sum(playable.map(x => x.req.length)), ok: 0, clean: 0, errors: 0, hits: 0, wrongs: 0, dsum: 0, dsig: 0, t0: performance.now() };
    v.clearColors();
    if (!playable.length) return this.finish();
    this.beat = 60 / (o.bpm || 80);
    this.off = Input.on(ev => { if (ev.type === 'on' && !this.done) this.input(ev); });
    if (o.mode === 'wait') { this.i = -1; this.advance(null); }
    else this.clock();
  }

  input(ev) {
    if (this.o.mode === 'wait') this.waitIn(ev);
    else if (this.o.mode === 'tempo') this.tempoIn(ev);
    if (this.o.onLive && !this.done) this.o.onLive(this.st);
  }

  /* ----- mode « à mon rythme » */
  advance(prev) {
    const seq = this.seq, acc = prev && this.o.accompany;
    const dur = n => clamp(n.dur * this.beat, 0.15, 2.5);
    let i = this.i + 1;
    if (acc) for (const n of prev.oth) Sound.play(n.midi, dur(n), 62);
    while (i < seq.length && !seq[i].req.length) {
      if (acc) for (const n of seq[i].oth) Sound.play(n.midi, dur(n), 62, clamp((seq[i].t - prev.t) * this.beat, 0, 4));
      i++;
    }
    this.i = i;
    if (i >= seq.length) return this.finish();
    this.got = new Set(); this.stepErr = false; this.stepT = performance.now();
    this.v.seek(seq[i].s.pos);
    if (this.o.hints) Piano.mark(seq[i].req.map(n => n.midi), 'target');
    if (this.o.onStep) this.o.onStep(seq[i], this.st);
  }
  waitIn(ev) {
    const cur = this.seq[this.i];
    if (!cur) return;
    const need = cur.req.map(n => n.midi);
    if (this.o.anyPitch || need.includes(ev.midi)) {
      this.got.add(ev.midi); Piano.flash(ev.midi, 'ok');
      if (this.o.anyPitch || need.every(m => this.got.has(m))) {
        this.st.ok++; if (!this.stepErr) this.st.clean++;
        this.v.color(cur.req, this.stepErr ? INK.warn : INK.ok);
        if (this.o.onNote) this.o.onNote({ step: cur, ms: performance.now() - this.stepT, clean: !this.stepErr });
        this.advance(cur);
      }
    } else {
      this.st.errors++; this.stepErr = true; Piano.flash(ev.midi, 'bad');
      if (this.o.onError) this.o.onError({ step: cur, played: ev.midi });
    }
  }

  /* ----- modes avec horloge : « au métronome » et « écouter » */
  clock() {
    const v = this.v, o = this.o, ts = v.time, compound = ts[1] === 8 && ts[0] % 3 === 0 && ts[0] > 3;
    this.clickQ = compound ? 1.5 : 4 / ts[1];           // intervalle entre deux battements, en noires
    this.perBar = compound ? ts[0] / 3 : ts[0];
    this.q0 = this.seq[0].s.mt;                          // origine du temps : début de la première mesure jouée
    this.endQ = this.seq.reduce((a, x) => Math.max(a, x.t + x.req.concat(x.oth).reduce((m, n) => Math.max(m, n.dur), 0.5)), 0);
    const lead = (o.mode === 'tempo' ? v.measureLen * this.beat : 0.35) + 0.12;
    Sound.ensure();
    this.lat = Sound.ctx ? (Sound.ctx.outputLatency || Sound.ctx.baseLatency || 0) : 0;
    this.aud0 = Sound.now() + lead; this.perf0 = performance.now() + lead * 1000;
    this.k = Math.ceil(((o.mode === 'tempo' ? this.q0 - v.measureLen : this.q0) - v.anchor) / this.clickQ - 1e-6);
    this.cur = -1; this.snd = 0; this.closed = 0; this.left = -1;
    this.win = clamp(this.beat * 0.4, 0.09, 0.22);
    this.v.seek(this.seq[0].s.pos);
    this.hint(0);
    const loop = () => { if (this.done) return; this.tick(); if (!this.done) this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  hint(from) {
    if (this.o.mode !== 'tempo' || !this.o.hints) return;
    const x = this.seq.slice(from).find(s => s.req.length);
    if (x) Piano.mark(x.req.map(n => n.midi), 'target');
  }
  tick() {
    const o = this.o, el = (performance.now() - this.perf0) / 1000, q = this.q0 + el / this.beat, ahead = q + 0.12 / this.beat;
    for (;;) {                                            // métronome (toujours pendant le décompte)
      const cq = this.v.anchor + this.k * this.clickQ;
      if (cq > ahead || cq >= this.endQ - 1e-6) break;
      if (cq < this.q0 - 1e-6 || o.metro) Sound.click(mod(this.k, this.perBar) === 0, this.aud0 + (cq - this.q0) * this.beat);
      this.k++;
    }
    /* Décompte affiché : 1, 2, 3, 4… au rythme des battements de la mesure d'avance. */
    const since = el / (this.clickQ * this.beat) + this.v.measureLen / this.clickQ;
    const left = el < 0 && o.mode === 'tempo' && since >= 0 ? Math.floor(since + 1e-3) + 1 : 0;
    if (left !== this.left) { this.left = left; if (o.onCount) o.onCount(left); }
    while (this.snd < this.seq.length && this.seq[this.snd].t <= ahead) {   // sons programmés légèrement en avance
      const x = this.seq[this.snd++], at = this.aud0 + (x.t - this.q0) * this.beat;
      const list = o.mode === 'listen' ? x.req : (o.accompany ? x.oth : []);
      for (const n of list) Sound.play(n.midi, clamp(n.dur * this.beat * 0.96, 0.12, 6), o.mode === 'listen' ? 78 : 60, 0, at);
    }
    let moved = false;
    while (this.cur + 1 < this.seq.length && this.seq[this.cur + 1].t <= q + 1e-6) { this.cur++; moved = true; }
    if (moved) {
      const x = this.seq[this.cur];
      this.v.seek(x.s.pos);
      if (o.mode === 'listen') Piano.mark(x.req.map(n => n.midi), 'play'); else this.hint(this.cur + 1);
    }
    if (o.mode === 'tempo') while (this.closed < this.seq.length && (this.seq[this.closed].t - this.q0) * this.beat + this.win < el - this.lat) {
      const x = this.seq[this.closed++];
      if (x.req.length && x.hit.size < x.req.length) this.v.color(x.req, INK.bad);
    }
    if (q >= this.endQ + 0.3) this.finish();
  }
  tempoIn(ev) {
    const el = (ev.t - this.perf0) / 1000 - this.lat;
    let best = null;
    for (let j = this.closed; j < this.seq.length; j++) {
      const x = this.seq[j], dt = el - (x.t - this.q0) * this.beat;
      if (dt < -this.win) break;
      if (dt > this.win) continue;
      x.req.forEach((n, k) => {
        if (x.hit.has(k) || (!this.o.anyPitch && n.midi !== ev.midi)) return;
        if (!best || Math.abs(dt) < Math.abs(best.dt)) best = { x, k, dt };
      });
    }
    if (best) {
      best.x.hit.add(best.k); this.st.hits++; this.st.dsum += Math.abs(best.dt); this.st.dsig += best.dt;
      Piano.flash(ev.midi, 'ok');
      if (best.x.hit.size === best.x.req.length) this.v.color(best.x.req, Math.abs(best.dt) < 0.075 ? INK.ok : INK.warn);
    } else if (el > -this.win) { this.st.wrongs++; Piano.flash(ev.midi, 'bad'); }
  }

  finish() {
    if (this.done) return;
    const s = this.st, mode = this.o.mode;
    let r = null;
    if (s.total) {
      if (mode === 'wait') r = { mode, total: s.total, errors: s.errors, clean: s.clean, acc: s.clean / s.total, sec: (performance.now() - s.t0) / 1000 };
      else if (mode === 'tempo') {
        for (const x of this.seq.slice(this.closed)) if (x.req.length && x.hit.size < x.req.length) this.v.color(x.req, INK.bad);
        r = { mode, total: s.notes, hits: s.hits, misses: s.notes - s.hits, wrongs: s.wrongs, acc: clamp((s.hits - 0.5 * s.wrongs) / s.notes, 0, 1), avgMs: s.hits ? s.dsum / s.hits * 1000 : 0, bias: s.hits ? s.dsig / s.hits * 1000 : 0 };
      } else r = { mode };
    }
    this.stop();
    if (this.o.onDone) this.o.onDone(r);
  }
  stop() {
    this.done = true;
    cancelAnimationFrame(this.raf);
    if (this.off) { this.off(); this.off = null; }
    Piano.clear('target'); Piano.clear('play');
    if (this.o.onCount) this.o.onCount(0);
  }
}

/* Panneau de pratique complet : barre de réglages + partition + résultat.
   cfg : { modes, mode, bpm, zoom, fit, hands, range, anyPitch, tap, passAt, actions, onDone, osmd } */
function Practice(host, cfg = {}) {
  const modes = cfg.modes || ['wait', 'tempo', 'listen'];
  const LBL = { wait: 'À mon rythme', tempo: 'Au métronome', listen: 'Écouter' };
  const st = { mode: cfg.mode || modes[0], bpm: cfg.bpm || 80, hand: 'both', metro: true, loop: false, from: null, to: null, accompany: true, sel: null };
  const bar = h('div', { class: 'pbar' }), paper = h('div', { class: 'paper' }), sh = h('div', { class: 'score-host' }), count = h('div', { class: 'count', hidden: true });
  const live = h('div', { class: 'plive' }), res = h('div');
  paper.append(sh, count);
  host.append(bar, paper, live, res);
  const view = new ScoreView(sh, { zoom: cfg.zoom || 1, scroller: $('#main'), fit: cfg.fit, osmd: cfg.osmd });
  let tr = null, running = false, loaded = false, dead = false, expect = '', loopT = 0;

  const staves = () => {
    if (view.staffCount === 2) return st.hand === 'both' ? null : new Set([st.hand === 'R' ? 0 : 1]);
    if (view.staffCount > 2 && st.sel) return st.sel;
    return null;
  };

  function drawBar() {
    bar.innerHTML = '';
    if (!loaded) return;
    if (modes.length > 1) bar.append(seg(modes.map(m => [m, LBL[m]]), st.mode, m => { st.mode = m; rearm(); }));
    if (cfg.hands !== false && view.staffCount === 2) bar.append(seg([['R', 'Main droite'], ['L', 'Main gauche'], ['both', 'Deux mains']], st.hand, v => { st.hand = v; rearm(); }));
    if (view.staffCount > 2) {
      if (!st.sel) st.sel = new Set([...Array(view.staffCount).keys()]);
      bar.append(h('span', { class: 'grp' }, 'Portées à jouer :', [...Array(view.staffCount).keys()].map(i => check(String(i + 1), st.sel.has(i), v => { if (v) st.sel.add(i); else st.sel.delete(i); rearm(); }))));
    }
    if (st.mode !== 'wait') {
      const tv = h('b', null, st.bpm);
      bar.append(h('label', { class: 'tempo', title: 'Tempo : nombre de noires par minute' }, '♩ =',
        h('input', { type: 'range', min: 30, max: 208, step: 2, value: st.bpm, oninput: e => { st.bpm = +e.target.value; tv.textContent = st.bpm; }, onchange: e => { e.target.blur(); if (running) rearm(); } }), tv));
    }
    if (st.mode === 'tempo') bar.append(check('Métronome', st.metro, v => { st.metro = v; if (tr) tr.o.metro = v; }));
    if (view.staffCount === 2 && st.hand !== 'both' && st.mode !== 'listen') bar.append(check('L\'autre main joue toute seule', st.accompany, v => { st.accompany = v; if (tr) tr.o.accompany = v; }));
    if (cfg.range && view.lastMeasure - view.firstMeasure >= 2) {
      const num = (val, set) => h('input', { type: 'number', min: view.firstMeasure, max: view.lastMeasure, value: val, onchange: e => { set(clamp(Math.round(+e.target.value) || view.firstMeasure, view.firstMeasure, view.lastMeasure)); e.target.blur(); rearm(); } });
      bar.append(h('span', { class: 'grp' }, 'Mesures', num(st.from, v => { st.from = v; if (st.to < v) st.to = v; }), 'à', num(st.to, v => { st.to = v; if (st.from > v) st.from = v; }), check('En boucle', st.loop, v => { st.loop = v; })));
    }
    if (st.mode !== 'listen' && !cfg.anyPitch) bar.append(h('span', { class: 'grp' },
      check('Montrer les touches', Store.s.hints, v => { Store.set('hints', v); rearm(); }),
      check('Nom des notes', Store.s.names, v => { Store.set('names', v); drawLive(); })));
    bar.append(st.mode === 'wait'
      ? h('button', { class: 'btn push', onclick: () => start() }, '↺ Recommencer')
      : h('button', { class: 'btn primary push', onclick: () => (running ? halt() : start()) }, running ? '■ Arrêter' : (st.mode === 'listen' ? '▶ Écouter' : '▶ Démarrer')));
  }

  function drawLive() {
    if (!loaded || dead) return;
    const s = tr && tr.st;
    if (!s) {
      live.innerHTML = st.mode === 'tempo' ? 'Clique sur <b>Démarrer</b> : une mesure de décompte, puis joue en suivant le curseur' + (cfg.tap ? ' (n\'importe quelle touche du piano, ou la barre d\'espace).' : '.')
        : st.mode === 'listen' ? 'Clique sur <b>Écouter</b> pour entendre la partition.' : '';
      return;
    }
    if (st.mode === 'wait') {
      live.innerHTML = `Note <b>${Math.min(s.ok + 1, s.total)}</b> / ${s.total} · ${plural(s.errors, 'fausse note', 'fausses notes')}`
        + (Store.s.names && expect ? ` · à jouer : <b>${expect}</b>` : '')
        + (s.ok === 0 && s.errors === 0 ? ' — joue la note sous le curseur, la partition avance toute seule.' : '');
    } else if (st.mode === 'tempo') live.innerHTML = `<b>${s.hits}</b> / ${s.notes} en rythme · ${plural(s.wrongs, 'note en trop', 'notes en trop')}`;
    else live.textContent = 'Lecture en cours…';
  }

  function start() {
    if (!loaded || dead) return;
    halt(true);
    res.innerHTML = ''; expect = '';
    if (document.activeElement && document.activeElement.blur && st.mode !== 'wait') document.activeElement.blur();
    tr = new Trainer(view, {
      mode: st.mode, bpm: st.bpm, staves: staves(), metro: st.metro, accompany: st.accompany,
      hints: Store.s.hints && !cfg.anyPitch, anyPitch: cfg.anyPitch,
      from: cfg.range ? st.from : null, to: cfg.range ? st.to : null,
      onStep: x => { expect = x.req.map(n => Notes.both(n.midi)).join(' + '); drawLive(); },
      onLive: drawLive, onNote: cfg.onNote, onError: cfg.onError,
      onCount: n => { count.hidden = !n; count.textContent = n || ''; },
      onDone: finish,
    });
    running = true;
    tr.start();
    drawBar(); drawLive();
  }
  function halt(silent) {
    clearTimeout(loopT);
    if (tr) { tr.stop(); tr = null; }
    running = false; count.hidden = true;
    if (!silent) { drawBar(); drawLive(); }
  }
  function rearm() {
    halt(true); res.innerHTML = '';
    if (st.mode === 'wait') start(); else { view.clearColors(); drawBar(); drawLive(); }
  }

  function finish(r) {
    running = false; tr = null;
    if (dead) return;
    if (!r) { drawBar(); live.textContent = st.mode === 'listen' ? '' : 'Aucune note à jouer dans cette sélection.'; return; }
    if (r.mode === 'listen') { drawBar(); drawLive(); return; }
    Store.addXp(Math.round(clamp(r.total * 0.5, 2, 30) * r.acc));
    if (cfg.onDone) cfg.onDone(r, st);
    if (st.loop && cfg.range) {
      toast(`${Math.round(r.acc * 100)} % — on recommence`, r.acc >= 0.8 ? 'ok' : '');
      loopT = setTimeout(start, 1100);
      return drawBar();
    }
    drawBar(); live.innerHTML = '';
    const pct = Math.round(r.acc * 100), cls = r.acc >= 0.8 ? 'good' : r.acc >= 0.6 ? 'mid' : '';
    const title = r.acc >= 0.95 ? 'Parfait !' : r.acc >= 0.8 ? 'Très bien !' : r.acc >= 0.6 ? 'Pas mal !' : 'Continue, ça vient.';
    const detail = r.mode === 'wait'
      ? `${pct} % des notes justes du premier coup · ${plural(r.errors, 'fausse note', 'fausses notes')} · ${fmtDur(r.sec)}`
      : `${r.hits} / ${r.total} notes en rythme (${pct} %) · ${plural(r.wrongs, 'note en trop', 'notes en trop')}`
        + (r.hits ? ` · décalage moyen ${Math.round(r.avgMs)} ms${Math.abs(r.bias) > 35 ? (r.bias > 0 ? ', plutôt en retard' : ', plutôt en avance') : ''}` : '');
    const note = cfg.passAt && r.mode === 'tempo' && r.acc < cfg.passAt ? h('div', { class: 'small muted' }, `Vise au moins ${Math.round(cfg.passAt * 100)} % pour valider l'exercice.`) : null;
    res.append(h('div', { class: 'presult ' + cls }, h('div', { class: 'stars' }, stars(r.acc)),
      h('div', null, h('div', { class: 't' }, title), h('div', null, detail), note),
      h('div', { class: 'acts' }, h('button', { class: 'btn', onclick: () => start() }, 'Recommencer'),
        (typeof cfg.actions === 'function' ? cfg.actions() : cfg.actions || []).map(a => h('button', { class: 'btn ' + (a.cls || 'primary'), onclick: a.fn }, a.label)))));
  }

  async function load(src, meta = {}) {
    halt(true);
    res.innerHTML = ''; loaded = false; bar.innerHTML = '';
    live.textContent = 'Préparation de la partition…';
    await view.load(src);
    if (dead) return;
    st.bpm = Math.round(meta.bpm || cfg.bpm || view.bpm || 80);
    st.from = view.firstMeasure; st.to = view.lastMeasure; st.sel = null;
    loaded = true; live.textContent = '';
    if (st.mode === 'wait') start(); else { drawBar(); drawLive(); }
  }

  const onKey = e => {
    if (e.code !== 'Space' || !running || st.mode !== 'tempo') return;
    e.preventDefault();
    if (e.repeat) return;
    Sound.ensure(); Input.noteOn(71, 90, 'keys');
    setTimeout(() => Input.noteOff(71, 'keys'), 90);
  };
  if (cfg.tap) addEventListener('keydown', onKey);

  return {
    load, start, stop: halt, view, state: st,
    destroy() { dead = true; halt(true); removeEventListener('keydown', onKey); view.destroy(); host.innerHTML = ''; },
  };
}

/* Illustration de leçon : une petite portée sans curseur. */
async function drawFigure(host, f) {
  const model = MX.piece(f);
  if (f.names) for (const m of model.measures) for (const stf of m) for (const e of stf) if (e.p && !e.l) e.l = e.p.map(p => Notes.name(p)).join(' ');
  const inner = h('div');
  host.append(inner);
  const v = new ScoreView(inner, { zoom: f.zoom || 1, cursor: false, fit: true, osmd: { drawTimeSignatures: !!f.showTime, drawMeasureNumbers: false } });
  await v.load(MX.build(model));
  return v;
}
