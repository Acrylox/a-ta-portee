'use strict';
/* Générateurs : séries de lecture de notes, mélodies de déchiffrage, rythmes, dictées, gammes et accords.
   Chaque discipline a une échelle de niveaux ; le moteur de niveau (skill.js) choisit lequel utiliser. */

const T3 = 4 / 3;                                   // durée d'une croche de triolet, en doubles croches
const r6 = x => Math.round(x * 1e6) / 1e6;

/* Paliers de la lecture de notes. T = temps visé par note (ou par accord), en secondes. */
const NOTE_STAGES = [
  { label: 'Clé de sol, de Do à Sol, avec le nom des notes', clefs: ['G'], range: 0, names: true, T: 4, tip: 'Le nom est écrit sous chaque note : sers-t\'en pour repérer la touche, puis essaie de ne plus le regarder.' },
  { label: 'Clé de sol, de Do à Sol', clefs: ['G'], range: 0, T: 2.5 },
  { label: 'Clé de fa, de Fa à Do, avec le nom des notes', clefs: ['F'], range: 0, names: true, T: 4, tip: 'En clé de fa, les notes ne sont pas au même endroit qu\'en clé de sol : le Fa est sur la 4ᵉ ligne.' },
  { label: 'Clé de fa, de Fa à Do', clefs: ['F'], range: 0, T: 2.5 },
  { label: 'Les deux clés, autour du Do central', clefs: ['G', 'F'], range: 0, T: 2.2 },
  { label: 'Clé de sol, toute la portée', clefs: ['G'], range: 1, T: 2 },
  { label: 'Clé de fa, toute la portée', clefs: ['F'], range: 1, T: 2 },
  { label: 'Les deux portées complètes', clefs: ['G', 'F'], range: 1, T: 1.8 },
  { label: 'Lignes supplémentaires', clefs: ['G', 'F'], range: 2, T: 1.8, tip: 'Au-delà de la portée, continue de compter ligne, interligne, ligne… à partir d\'un repère connu.' },
  { label: 'Dièses et bémols accidentels', clefs: ['G', 'F'], range: 2, acc: true, T: 1.8, tip: 'Une altération vaut jusqu\'à la fin de la mesure pour la même note.' },
  { label: 'Armures jusqu\'à 2 altérations', clefs: ['G', 'F'], range: 2, keys: [1, 2, -1, -2], T: 1.7, tip: 'L\'armure change à chaque série : regarde-la avant de jouer, elle vaut pour toutes les octaves.' },
  { label: 'Armures jusqu\'à 4 altérations', clefs: ['G', 'F'], range: 2, keys: [3, 4, -3, -4, 2, -2], T: 1.7 },
  { label: 'Intervalles : deux notes à la fois', clefs: ['G', 'F'], range: 1, kind: 'int', T: 2.4, tip: 'Lis la note du bas, puis la distance : notes collées = seconde, ligne à ligne = tierce…' },
  { label: 'Accords de trois sons', clefs: ['G', 'F'], range: 1, kind: 'chord', T: 3, tip: 'Trois notes empilées régulièrement : accord à l\'état fondamental. Un écart plus grand : renversement.' },
  { label: 'Grande étendue, armures, lecture rapide', clefs: ['G', 'F'], range: 3, keys: [0, 1, -1, 2, -2, 3, -3, 4, -4], T: 1.3 },
  { label: 'Lecture experte : notes, intervalles et accords mêlés', clefs: ['G', 'F'], range: 3, kind: 'mix', keys: [0, 1, -1, 2, -2, 3, -3, 4, -4], T: 1.6 },
];

const Gen = {
  D(s) { return Notes.dia(Notes.parse(s)); },

  /* ---------- Lecture de notes */
  RANGES: { G: [['C4', 'G4'], ['C4', 'G5'], ['A3', 'C6'], ['F3', 'E6']], F: [['F3', 'C4'], ['E2', 'C4'], ['C2', 'E4'], ['A1', 'G4']] },
  pool(clefs, level, fifths = 0) {
    const out = [];
    clefs.forEach((c, staff) => {
      const [lo, hi] = this.RANGES[c][level].map(s => this.D(s));
      for (let i = lo; i <= hi; i++) out.push({ p: Notes.fromDia(i, fifths), staff });
    });
    return out;
  },
  rangePool(clefs, ranges, fifths = 0) {
    const out = [];
    clefs.forEach((c, staff) => {
      const [lo, hi] = ranges[staff].map(s => this.D(s));
      for (let i = lo; i <= hi; i++) out.push({ p: Notes.fromDia(i, fifths), staff });
    });
    return out;
  },
  accidental(p) {
    const a = Math.random() < 0.5 ? 1 : -1;
    if ((a === 1 && 'EB'.includes(p.step)) || (a === -1 && 'CF'.includes(p.step))) return p;
    return { step: p.step, alter: a, octave: p.octave };
  },
  /* Série simple (leçons) : n notes tirées dans `pool`, écrites en noires. */
  series(pool, n, o = {}) {
    const clefs = o.clefs || ['G'], picks = [];
    let last = null;
    for (let i = 0; i < n; i++) {
      let it, tries = 0;
      do { it = pick(pool); } while (pool.length > 1 && it === last && tries++ < 10);
      last = it;
      const p = o.accidentals && !it.p.alter && Math.random() < 0.35 ? this.accidental(it.p) : it.p;
      picks.push({ p, staff: it.staff, item: it });
    }
    const measures = [];
    for (let i = 0; i < n; i += 4) {
      const chunk = picks.slice(i, i + 4);
      measures.push(clefs.map((c, s) => chunk.map(k => (k.staff === s ? { d: 4, p: [k.p], l: o.names ? Notes.name(k.p) : null } : { d: 4, hidden: true }))));
    }
    return { clefs, fifths: o.fifths || 0, time: [4, 4], measures, picks };
  },
  /* Série d'un palier : spec = { clefs, range, keys, acc, names, kind } ; kind = 'note' | 'int' | 'chord' | 'mix'.
     `weight(item, clefs)` favorise les notes mal connues. */
  noteSeries(spec, n = 8, weight) {
    const clefs = spec.clefs, fifths = pick(spec.keys || [0]), pool = this.pool(clefs, spec.range, fifths), picks = [];
    let last = null;
    for (let i = 0; i < n; i++) {
      let it, tries = 0;
      do { it = weight ? wpick(pool, x => weight(x, clefs)) : pick(pool); } while (pool.length > 1 && it === last && tries++ < 10);
      last = it;
      const kind = spec.kind === 'mix' ? wpick(['note', 'int', 'chord'], k => ({ note: 3, int: 1.5, chord: 1 }[k])) : (spec.kind || 'note');
      let ps = [it.p];
      if (kind !== 'note') {
        const [lo, hi] = this.RANGES[clefs[it.staff]][spec.range].map(s => this.D(s));
        const shape = kind === 'int' ? [pick([1, 2, 2, 3, 4, 4, 5, 7])] : pick([[2, 4], [2, 5], [3, 5]]);
        const span = shape[shape.length - 1], base = clamp(Notes.dia(it.p), lo, Math.max(lo, hi - span));
        ps = [0].concat(shape).map(o => Notes.fromDia(base + o, fifths));
      } else if (spec.acc && !it.p.alter && Math.random() < 0.35) ps = [this.accidental(it.p)];
      picks.push({ ps, staff: it.staff, clef: clefs[it.staff], item: kind === 'note' ? it : null });
    }
    const measures = [];
    for (let i = 0; i < n; i += 4) {
      const chunk = picks.slice(i, i + 4);
      measures.push(clefs.map((c, s) => chunk.map(k => (k.staff === s ? { d: 4, p: k.ps, l: spec.names && k.ps.length === 1 ? Notes.name(k.ps[0]) : null } : { d: 4, hidden: true }))));
    }
    return { clefs, fifths, time: [4, 4], measures, picks };
  },

  /* ---------- Rythmes : cellules d'un ou plusieurs temps (négatif = silence), en doubles croches */
  CELLS: {
    q: [4], h: [8], w: [16], hd: [12], ee: [2, 2], qd_e: [6, 2], rq: [-4], re_e: [-2, 2], e_re: [2, -2], e_q_e: [2, 4, 2],
    ssss: [1, 1, 1, 1], e_ss: [2, 1, 1], ss_e: [1, 1, 2], ed_s: [3, 1], s_e_s: [1, 2, 1], rs_sss: [-1, 1, 1, 1], ttt: [T3, T3, T3],
  },
  RHY: {
    a: [['q', 6], ['h', 3]],
    b: [['q', 6], ['h', 3], ['w', 1], ['hd', 1.2]],
    c: [['q', 6], ['h', 3], ['w', 0.8], ['hd', 1], ['rq', 1.3]],
    d: [['q', 5], ['h', 2], ['ee', 3.2], ['hd', 0.8], ['rq', 0.8]],
    e: [['q', 5], ['h', 2], ['ee', 3], ['qd_e', 2.4], ['hd', 0.8], ['rq', 0.8]],
    f: [['q', 4], ['h', 1], ['ee', 3], ['qd_e', 1.6], ['re_e', 2.4], ['e_re', 1.2], ['rq', 1.2]],
    g: [['q', 4], ['h', 1], ['ee', 3], ['qd_e', 1.6], ['re_e', 1.2], ['e_q_e', 2.8], ['rq', 1]],
    h: [['q', 4], ['ee', 3], ['qd_e', 1.2], ['ssss', 2], ['e_ss', 2], ['ss_e', 1.6], ['rq', 0.8], ['h', 0.8]],
    i: [['q', 3], ['ee', 3], ['ed_s', 2.6], ['ssss', 1.4], ['e_ss', 1.2], ['ss_e', 1.2], ['s_e_s', 1.6], ['re_e', 1], ['rs_sss', 1], ['rq', 0.8]],
    j: [['q', 4], ['ee', 3], ['ttt', 3.2], ['qd_e', 1.2], ['h', 1], ['rq', 0.8]],
    k: [['q', 3], ['ee', 3], ['qd_e', 1.4], ['e_q_e', 1.6], ['re_e', 1.2], ['ttt', 1.8], ['ssss', 1.4], ['e_ss', 1.2], ['ss_e', 1], ['ed_s', 1.4], ['s_e_s', 1], ['rq', 0.8], ['h', 0.6]],
  },
  cellLen(c) { return r6(sum(this.CELLS[c].map(Math.abs))); },
  bar(len, table, last) {
    if (last) return len >= 16 ? pick([[4, 4, 8], [8, 8], [16]]) : len === 12 ? pick([[4, 8], [12], [4, 4, 4]]) : len === 8 ? pick([[8], [4, 4]]) : [len];
    const out = [];
    let pos = 0;
    while (pos < len - 1e-6) {
      const left = r6(len - pos);
      const ok = table.filter(([c]) => {
        const L = this.cellLen(c);
        if (L > left || (L >= 12 && pos !== 0)) return false;
        return r6(pos % (L >= 8 && len % 8 === 0 ? 8 : 4)) === 0;
      });
      const cell = ok.length ? this.CELLS[wpick(ok, x => x[1])[0]] : [Math.min(4, left)];
      out.push(...cell);
      pos = r6(pos + sum(cell.map(Math.abs)));
    }
    if (out.every(d => d < 0)) out[0] = -out[0];
    return out;
  },
  /* Mesures composées : `groups` groupes de trois croches (2 pour 6/8, 1 pour 3/8). */
  bar68(last, adv, groups = 2) {
    if (last) return groups === 2 ? pick([[6, 6], [12], [2, 2, 2, 6]]) : [6];
    const cells = [[[6], 3], [[2, 2, 2], 4], [[4, 2], 3], [[2, 4], 1], [[-6], 0.4]];
    if (adv) cells.push([[3, 1, 2], 2.4], [[2, 1, 1, 2], 1.6], [[1, 1, 1, 1, 2], 1.2], [[-2, 2, 2], 1.2], [[2, 2, 1, 1], 1.2]);
    const out = [];
    for (let g = 0; g < groups; g++) {
      const c = wpick(cells, x => x[1])[0];
      out.push(...(g === 0 && c[0] === -6 ? [6] : c));
    }
    return out;
  },
  ev(d, p) { return d < 0 ? { d: -d, tu: !Number.isInteger(d) } : { d, p, tu: !Number.isInteger(d) }; },

  /* ---------- Déchiffrage : 14 niveaux. `tempo` = la maîtrise du niveau se valide au métronome. */
  LEVELS: [
    { name: 'Main droite · de Do à Sol · noires et blanches', hand: 'R', R: ['C4', 'G4'], rhy: 'a', leap: 1, keys: [0], times: [[4, 4]], bpm: 60 },
    { name: 'Main droite · une octave · rondes et blanches pointées', hand: 'R', R: ['C4', 'C5'], rhy: 'b', leap: 2, keys: [0], times: [[4, 4]], bpm: 66 },
    { name: 'Main gauche · clé de fa', hand: 'L', L: ['C3', 'C4'], rhy: 'b', leap: 2, keys: [0], times: [[4, 4]], bpm: 66 },
    { name: 'Mains alternées · silences · mesure à 3 temps', hand: 'alt', R: ['C4', 'C5'], L: ['C3', 'C4'], rhy: 'c', leap: 2, keys: [0], times: [[4, 4], [3, 4]], bpm: 66 },
    { name: 'Croches · Sol majeur et Fa majeur', hand: 'alt', R: ['C4', 'E5'], L: ['A2', 'C4'], rhy: 'd', leap: 2, keys: [0, 1, -1], times: [[4, 4], [3, 4], [2, 4]], bpm: 69, tempo: true,
      tip: 'À partir d\'ici, le niveau se valide au métronome : garder la pulsation compte autant que les bonnes notes.' },
    { name: 'Mains ensemble · basse en rondes', hand: 'both', lh: 'A', R: ['C4', 'E5'], rhy: 'd', leap: 2, keys: [0, 1, -1], times: [[4, 4], [3, 4]], bpm: 63, tempo: true,
      tip: 'Les deux mains jouent en même temps. Lis de bas en haut : la basse d\'abord, puis la mélodie.' },
    { name: 'Mains ensemble · basse en blanches · rythmes pointés', hand: 'both', lh: 'B', R: ['C4', 'G5'], rhy: 'e', leap: 3, keys: [0, 1, -1, 2, -2], times: [[4, 4], [3, 4]], bpm: 66, tempo: true },
    { name: 'Mode mineur · sensible altérée', hand: 'both', lh: 'B', R: ['C4', 'G5'], rhy: 'e', leap: 3, keys: [0, 1, -1], minor: 1, times: [[4, 4], [3, 4]], bpm: 63, tempo: true,
      tip: 'En mineur, la 7ᵉ note de la gamme est haussée par un dièse ou un bécarre écrit devant la note : c\'est la sensible.' },
    { name: 'Basse en noires · accords brisés · contretemps', hand: 'both', lh: 'C', R: ['C4', 'G5'], rhy: 'f', leap: 3, keys: [0, 1, -1, 2, -2], minor: 0.3, times: [[4, 4], [3, 4]], bpm: 63, tempo: true },
    { name: 'Mesure à 6/8', hand: 'both', lh: ['A', 'B'], six: true, R: ['C4', 'G5'], leap: 3, keys: [0, 1, -1, 2, -2], minor: 0.3, times: [[6, 8]], bpm: 84, tempo: true,
      tip: 'En 6/8, on compte deux temps par mesure, chacun valant trois croches. Le métronome bat ces deux temps.' },
    { name: 'Doubles croches · basse d\'Alberti', hand: 'both', lh: 'D', R: ['C4', 'A5'], rhy: 'h', leap: 4, keys: [0, 1, -1, 2, -2, 3, -3], minor: 0.3, times: [[4, 4], [2, 4], [3, 4]], bpm: 54, tempo: true,
      tip: 'La basse d\'Alberti égrène l\'accord en croches : grave, aigu, milieu, aigu. Repère l\'accord d\'un coup d\'œil au lieu de lire note à note.' },
    { name: 'Accords à la main gauche · tierces à la main droite', hand: 'both', lh: ['E', 'W'], R: ['D4', 'A5'], rhy: 'g', leap: 4, doubles: 0.22, keys: [0, 1, -1, 2, -2, 3, -3], minor: 0.4, times: [[4, 4], [3, 4]], bpm: 58, tempo: true },
    { name: 'Triolets · chromatismes · grands sauts', hand: 'both', lh: ['C', 'D', 'E'], R: ['C4', 'B5'], rhy: 'j', leap: 7, chroma: 0.15, keys: [0, 1, -1, 2, -2, 3, -3, 4, -4], minor: 0.4, times: [[4, 4], [3, 4], [2, 4]], bpm: 58, tempo: true,
      tip: 'Un triolet répartit trois croches égales dans un seul temps. Un dièse ou un bécarre isolé signale souvent une note de passage.' },
    { name: 'Lecture à vue complète · tout mélangé · 8 mesures', hand: 'both', lh: ['B', 'C', 'D', 'E'], R: ['C4', 'C6'], rhy: 'k', leap: 7, chroma: 0.12, doubles: 0.15, six: 0.25, bars: 8, keys: [0, 1, -1, 2, -2, 3, -3, 4, -4], minor: 0.5, times: [[4, 4], [3, 4], [2, 4]], bpm: 66, tempo: true },
  ],
  melody(level, o = {}) {
    const L = this.LEVELS[level - 1];
    const six = L.six === true || (typeof L.six === 'number' && Math.random() < L.six);
    const time = six ? [6, 8] : pick(L.times), len = time[0] * 16 / time[1], nb = L.bars || o.bars || 4;
    const fifths = pick(L.keys), minor = Math.random() < (L.minor || 0);
    const tIdx = Notes.STEPS.indexOf(Notes.tonic(fifths, minor).step);
    /* En mineur, la sensible (7ᵉ degré) est haussée, comme dans la gamme mineure harmonique. */
    const P = dia => { const p = Notes.fromDia(dia, fifths); if (minor && mod(dia - tIdx, 7) === 6) p.alter += 1; return p; };
    const rh = L.R && L.R.map(s => this.D(s)), lh = L.L && L.L.map(s => this.D(s));
    const style = Array.isArray(L.lh) ? pick(L.lh.filter(s => s !== 'W' || len === 12)) : L.lh;
    const table = this.RHY[L.rhy || 'e'];
    const prog = nb <= 4 ? pick([[0, 3, 4, 0], [0, 0, 4, 0], [0, 5, 4, 0]])
      : pick([[0, 3, 0, 4], [0, 5, 3, 4], [0, 0, 3, 4]]).concat(pick([[0, 3, 4, 0], [5, 3, 4, 0]]));
    const who = i => (L.hand === 'alt' ? (Math.floor(i / (nb > 4 ? 2 : 1)) % 2 ? 'L' : 'R') : L.hand);
    const state = {}, W = [0.8, 5, 2.2, 1, 0.6, 0.4, 0.25, 0.35];
    const tones = (lo, hi, root) => { const t = []; for (let i = lo; i <= hi; i++) if ([0, 2, 4].includes(mod(i - tIdx - root, 7))) t.push(i); return t; };
    const nearest = (list, x) => list.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), list[0]);
    const line = (range, rhythm, chord, isLast, key) => {
      const [lo, hi] = range, evs = [];
      let cur = state[key], fresh = cur == null;
      if (fresh) cur = pick(tones(lo, hi, 0).slice(0, 3));
      const lastIdx = rhythm.reduce((a, d, j) => (d > 0 ? j : a), -1);
      rhythm.forEach((d, j) => {
        if (d < 0) { evs.push(this.ev(d)); return; }
        if (isLast && j === lastIdx) { const t = []; for (let i = lo; i <= hi; i++) if (mod(i, 7) === tIdx) t.push(i); cur = nearest(t.length ? t : [cur], cur); }
        else if (fresh) fresh = false;
        else if (j === 0 && chord != null) { const t = tones(lo, hi, chord), near = t.filter(i => Math.abs(i - cur) <= 2); cur = near.length ? pick(near) : nearest(t.length ? t : [cur], cur); }
        else {
          const max = d <= 1 ? 1 : d <= 2 ? Math.min(2, L.leap) : L.leap, steps = [];
          for (let s = -max; s <= max; s++) if (cur + s >= lo && cur + s <= hi) steps.push(s);
          cur += wpick(steps, s => W[Math.abs(s)]);
        }
        const e = this.ev(d, [P(cur)]);
        e.dia = cur;
        if (L.doubles && key === 'R' && d >= 4 && Math.random() < L.doubles) {
          const below = Math.random() < 0.75 ? 2 : 5;
          if (cur - below >= lo) e.p = [P(cur - below), P(cur)];
        }
        evs.push(e);
      });
      state[key] = cur;
      return evs;
    };
    /* Chromatisme : une note de passage haussée d'un demi-ton quand elle monte vers sa voisine. */
    const chroma = (evs, first) => {
      if (!L.chroma) return evs;
      for (let i = first ? 1 : 0; i + 1 < evs.length; i++) {
        const a = evs[i], b = evs[i + 1];
        if (!a.p || !b.p || a.p.length > 1 || b.p.length > 1 || b.dia !== a.dia + 1) continue;
        if (Notes.midi(b.p[0]) - Notes.midi(a.p[0]) === 2 && a.p[0].alter <= 0 && Math.random() < L.chroma) a.p[0].alter += 1;
      }
      return evs;
    };
    const measures = [];
    for (let i = 0; i < nb; i++) {
      const last = i === nb - 1, rhythm = six ? this.bar68(last, level >= 12) : this.bar(len, table, last);
      if (i === 0 && rhythm[0] < 0) rhythm[0] = -rhythm[0];
      if (L.hand === 'R') measures.push([line(rh, rhythm, null, last, 'R')]);
      else if (L.hand === 'L') measures.push([line(lh, rhythm, null, last, 'L')]);
      else if (L.hand === 'alt') measures.push(who(i) === 'R' ? [line(rh, rhythm, null, last, 'R'), [{ d: len }]] : [[{ d: len }], line(lh, rhythm, null, last, 'L')]);
      else measures.push([chroma(line(rh, rhythm, prog[i], last, 'R'), i === 0), this.accomp(style, prog[i], tIdx, len, last, P, six)]);
    }
    return { fifths, minor, time, tempo: L.bpm, clefs: L.hand === 'R' ? ['G'] : L.hand === 'L' ? ['F'] : ['G', 'F'], measures };
  },
  /* Main gauche. Styles : A note tenue, B deux notes, C accord brisé en noires, D basse d'Alberti en croches,
     E accords plaqués, W valse (basse puis deux fois l'accord). */
  accomp(style, deg, tIdx, len, last, P, six) {
    let root = 21 + tIdx + deg, base = 21 + tIdx;
    if (root > 24) root -= 7;
    if (base > 23) base -= 7;
    const N = (i, d) => ({ d, p: [P(i)] });
    const SHAPE = { 0: [0, 2, 4], 3: [0, 3, 5], 4: [-1, 1, 4], 5: [0, 2, 5] };
    const chord = d => ({ d, p: (SHAPE[deg] || SHAPE[0]).map(o => P(base + o)) });
    if (last) return [style === 'E' || style === 'W' ? { d: len, p: SHAPE[0].map(o => P(base + o)) } : N(root, len)];
    if (six) {
      if (style === 'A') return [N(root, 12)];
      if (style === 'E') return [chord(6), chord(6)];
      if (style === 'D') return [0, 2, 4, 0, 2, 4].map(s => N(root + s, 2));
      return [N(root, 6), N(root + 4, 6)];
    }
    if (style === 'B') return len === 16 ? [N(root, 8), N(root + 4, 8)] : len === 12 ? [N(root, 8), N(root + 4, 4)] : [N(root, 4), N(root + 4, 4)];
    if (style === 'C') return (len === 16 ? [0, 4, 2, 4] : len === 12 ? [0, 2, 4] : [0, 4]).map(s => N(root + s, 4));
    if (style === 'D') return (len === 16 ? [0, 4, 2, 4, 0, 4, 2, 4] : len === 12 ? [0, 4, 2, 4, 2, 4] : [0, 4, 2, 4]).map(s => N(root + s, 2));
    if (style === 'E') return len === 16 ? [chord(8), chord(8)] : [chord(len)];
    if (style === 'W' && len === 12) { const up = () => ({ d: 4, p: [P(root + 2), P(root + 4)] }); return [N(root, 4), up(), up()]; }
    return [N(root, len)];
  },

  /* ---------- Rythme seul (une seule hauteur) : 12 niveaux */
  RHYTHM_LEVELS: [
    { name: 'Noires et blanches', rhy: 'a', times: [[4, 4]], bpm: 72 },
    { name: 'Rondes, blanches pointées et soupirs', rhy: 'c', times: [[4, 4], [3, 4]], bpm: 72 },
    { name: 'Croches', rhy: 'd', times: [[4, 4], [3, 4], [2, 4]], bpm: 72, tip: 'Deux croches par temps : compte « 1 et 2 et ».' },
    { name: 'Noires pointées', rhy: 'e', times: [[4, 4], [3, 4]], bpm: 76, tip: 'La noire pointée dure un temps et demi ; la croche qui suit tombe sur le « et ».' },
    { name: 'Demi-soupirs et contretemps', rhy: 'f', times: [[4, 4], [2, 4]], bpm: 72, tip: 'Un contretemps : silence sur le temps, note sur le « et ».' },
    { name: 'Syncopes et liaisons', rhy: 'g', ties: 0.4, times: [[4, 4], [2, 4], [3, 4]], bpm: 72, tip: 'Une syncope commence sur un « et » et se prolonge sur le temps suivant. Une note liée ne se retape pas.' },
    { name: 'Doubles croches', rhy: 'h', times: [[4, 4], [2, 4]], bpm: 60, tip: 'Quatre doubles croches par temps : compte « 1 a et a ».' },
    { name: 'Croche pointée double et syncopette', rhy: 'i', times: [[4, 4], [2, 4], [3, 4]], bpm: 60 },
    { name: 'Mesure à 6/8', six: 'basic', times: [[6, 8]], bpm: 104, tip: 'Deux temps par mesure, chacun divisé en trois croches. Le métronome bat les deux temps.' },
    { name: 'Triolets', rhy: 'j', times: [[4, 4], [2, 4], [3, 4]], bpm: 66, tip: 'Trois croches égales dans un temps, au lieu de deux. Dis « tri-o-let » sur chaque temps.' },
    { name: 'Mesures composées avancées (6/8, 3/8)', six: 'adv', times: [[6, 8], [3, 8]], bpm: 112 },
    { name: 'Tout mélangé, tempo soutenu', rhy: 'k', ties: 0.3, times: [[4, 4], [3, 4], [2, 4]], bpm: 80 },
  ],
  rhythm(level, bars = 4) {
    const L = this.RHYTHM_LEVELS[level - 1], time = pick(L.times), len = time[0] * 16 / time[1], measures = [];
    const B4 = () => [{ step: 'B', alter: 0, octave: 4 }];
    for (let i = 0; i < bars; i++) {
      const last = i === bars - 1;
      const r = L.six ? this.bar68(last, L.six === 'adv', len / 6) : this.bar(len, this.RHY[L.rhy], last);
      if (i === 0 && r[0] < 0) r[0] = -r[0];
      measures.push([r.map(d => this.ev(d, B4()))]);
    }
    /* Liaisons par-dessus la barre de mesure : la note liée se tient, on ne la retape pas. */
    if (L.ties) for (let i = 0; i + 1 < bars; i++) {
      const a = measures[i][0], b = measures[i + 1][0], x = a[a.length - 1], y = b[0];
      if (x.p && y.p && !x.tu && !y.tu && !x.tie && Math.random() < L.ties) { x.tie = 'start'; y.tie = 'stop'; }
    }
    return { fifths: 0, time, tempo: L.bpm, clefs: ['G'], measures };
  },

  /* ---------- Dictée : une courte mélodie à rejouer d'oreille. L = niveau (voir EAR.dictee dans skill.js). */
  dictee(L) {
    const fifths = pick(L.keys || [0]), minor = Math.random() < (L.minor || 0);
    const tIdx = Notes.STEPS.indexOf(Notes.tonic(fifths, minor).step), base = 28 + tIdx - (tIdx > 4 ? 7 : 0);
    const lo = base + (L.lo == null ? -3 : L.lo), hi = base + (L.hi == null ? 7 : L.hi);
    const P = dia => { const p = Notes.fromDia(dia, fifths); if (minor && mod(dia - tIdx, 7) === 6) p.alter += 1; return p; };
    const W = [0.3, 5, 2.4, 1.2, 0.8, 0.4, 0.25, 0.35], dias = [base];
    let cur = base;
    for (let i = 1; i < L.n; i++) {
      if (i === L.n - 1) cur = base + 7 <= hi && Math.abs(base + 7 - cur) < Math.abs(base - cur) ? base + 7 : base;
      else {
        const steps = [];
        for (let s = -L.leap; s <= L.leap; s++) if (s !== 0 || L.leap > 1) if (cur + s >= lo && cur + s <= hi) steps.push(s);
        cur += wpick(steps, s => W[Math.abs(s)]);
      }
      dias.push(cur);
    }
    const ps = dias.map(P);
    if (L.chroma) for (let i = 1; i + 1 < ps.length; i++) {
      if (dias[i + 1] === dias[i] + 1 && Notes.midi(ps[i + 1]) - Notes.midi(ps[i]) === 2 && ps[i].alter <= 0 && Math.random() < L.chroma) ps[i].alter += 1;
    }
    return { fifths, minor, ps, midi: ps.map(p => Notes.midi(p)), tonic: Notes.midi(P(base)) };
  },

  /* ---------- Gammes et accords */
  FING: {
    R: { 0: '12312345', 1: '12312345', 2: '12312345', 3: '12312345', 4: '12312345', 5: '12312345', 6: '23412312', '-1': '12341234', '-2': '21231234', '-3': '31234123', '-4': '34123123', '-5': '23123412' },
    L: { 0: '54321321', 1: '54321321', 2: '54321321', 3: '54321321', 4: '54321321', 5: '43214321', 6: '43213214', '-1': '54321321', '-2': '32143213', '-3': '32143213', '-4': '32143213', '-5': '32143213' },
  },
  hands(hand, make) {
    const R = hand !== 'L' ? make('R') : null, Lh = hand !== 'R' ? make('L') : null;
    const measures = (R || Lh).map((_, i) => [R && R[i], Lh && Lh[i]].filter(Boolean));
    return { time: [4, 4], tempo: 72, clefs: hand === 'R' ? ['G'] : hand === 'L' ? ['F'] : ['G', 'F'], measures };
  },
  /* kind : 'maj' | 'nat' | 'harm' | 'mel' ; hand : 'R' | 'L' | 'both' */
  scale(fifths, kind, hand) {
    const minor = kind !== 'maj', ti = Notes.STEPS.indexOf(Notes.tonic(fifths, minor).step);
    const fing = hd => (minor ? ([0, 1, -1, -2, -3].includes(fifths) ? (hd === 'R' ? '12312345' : '54321321') : null) : this.FING[hd][fifths]);
    const model = this.hands(hand, hd => {
      const base = (hd === 'R' ? 4 : ti <= 2 ? 3 : 2) * 7 + ti, f = fing(hd);
      const P = (deg, up) => {
        const p = Notes.fromDia(base + deg, fifths), d = mod(deg, 7);
        if (kind === 'harm' && d === 6) p.alter += 1;
        if (kind === 'mel' && up && (d === 5 || d === 6)) p.alter += 1;
        return p;
      };
      const up = [0, 1, 2, 3, 4, 5, 6, 7].map((d, i) => ({ d: 4, p: [P(d, true)], f: f ? [+f[i]] : null }));
      const down = [6, 5, 4, 3, 2, 1, 0].map((d, i) => ({ d: i === 6 ? 8 : 4, p: [P(d, false)], f: f ? [+f[d]] : null }));
      return [up.slice(0, 4), up.slice(4), down.slice(0, 4), down.slice(4)];
    });
    return Object.assign(model, { fifths, minor });
  },
  /* kind : 'inv' (accord et renversements) | 'arp' (arpège) | 'cad' (cadence I–IV–V–I) */
  chords(fifths, minor, kind, hand) {
    const ti = Notes.STEPS.indexOf(Notes.tonic(fifths, minor).step);
    const model = this.hands(hand, hd => {
      const base = (hd === 'R' ? (ti <= 4 ? 4 : 3) : 2) * 7 + ti, R = hd === 'R';
      const P = i => { const p = Notes.fromDia(base + i, fifths); if (minor && kind === 'cad' && mod(i, 7) === 6) p.alter += 1; return p; };
      const C = (offs, d, f) => ({ d, p: offs.map(P), f });
      if (kind === 'inv') return [[C([0, 2, 4], 8, R ? [1, 3, 5] : [5, 3, 1]), C([2, 4, 7], 8, R ? [1, 2, 5] : [5, 3, 1])], [C([4, 7, 9], 8, R ? [1, 3, 5] : [5, 2, 1]), C([7, 9, 11], 8, R ? [1, 3, 5] : [5, 3, 1])]];
      if (kind === 'arp') {
        const up = R ? [1, 2, 3, 5] : [5, 3, 2, 1];
        return [[0, 2, 4, 7].map((o, i) => C([o], 4, [up[i]])), [C([4], 4, [up[2]]), C([2], 4, [up[1]]), C([0], 8, [up[0]])]];
      }
      if (hand === 'both' && !R) return [[C([0], 8), C([3], 8)], [C([4], 8), C([0], 8)]];
      return [[C([0, 2, 4], 8), C([0, 3, 5], 8)], [C([-1, 1, 4], 8), C([0, 2, 4], 8)]];
    });
    return Object.assign(model, { fifths, minor });
  },
};
