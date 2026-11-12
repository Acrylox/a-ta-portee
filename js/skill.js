'use strict';
/* Moteur de niveau : pour chaque discipline, un niveau et une jauge de maîtrise qui évoluent selon les résultats.
   On ne monte pas sur un coup de chance : il faut plusieurs bonnes performances pour remplir la jauge,
   et des résultats faibles répétés la vident jusqu'à redescendre d'un niveau. */

const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const WHITE = m => ![1, 3, 6, 8, 10].includes(mod(m, 12));

/* Niveaux des jeux d'oreille. */
const EAR = {
  CHORDS: {
    maj: [[0, 4, 7], 'Majeur'], min: [[0, 3, 7], 'Mineur'], dim: [[0, 3, 6], 'Diminué'], aug: [[0, 4, 8], 'Augmenté'],
    dom7: [[0, 4, 7, 10], 'Septième de dominante'], maj7: [[0, 4, 7, 11], 'Septième majeure'], min7: [[0, 3, 7, 10], 'Mineur septième'],
  },
  INTERVALS: ['', 'Seconde mineure', 'Seconde majeure', 'Tierce mineure', 'Tierce majeure', 'Quarte juste', 'Triton', 'Quinte juste', 'Sixte mineure', 'Sixte majeure', 'Septième mineure', 'Septième majeure', 'Octave'],
  note: [
    { name: 'De Do à Sol', set: [60, 62, 64, 65, 67], ref: true },
    { name: 'Touches blanches, une octave', set: range(60, 72).filter(WHITE), ref: true },
    { name: 'Toutes les touches, une octave', set: range(60, 72), ref: true },
    { name: 'Touches blanches, deux octaves', set: range(55, 79).filter(WHITE), ref: true },
    { name: 'Toutes les touches, deux octaves', set: range(55, 79), ref: true },
    { name: 'Sans Do de référence, d\'après la note précédente', set: range(55, 79), ref: false, tip: 'Tu n\'entends plus le Do : chaque note se déduit de la précédente, dont le nom t\'est donné.' },
  ],
  int: [
    { name: 'Seconde, tierce, quinte, octave', set: [2, 4, 7, 12], dir: 'up' },
    { name: 'Avec la tierce mineure et la quarte', set: [2, 3, 4, 5, 7, 12], dir: 'up' },
    { name: 'Avec les sixtes', set: [2, 3, 4, 5, 7, 8, 9, 12], dir: 'up' },
    { name: 'Tous les intervalles, ascendants', set: range(1, 12), dir: 'up' },
    { name: 'Ascendants et descendants', set: range(1, 12), dir: 'both' },
    { name: 'Harmoniques : les deux notes ensemble', set: range(1, 12), dir: 'harm', tip: 'Les deux notes sont jouées en même temps : écoute la couleur de l\'ensemble.' },
  ],
  chord: [
    { name: 'Majeur ou mineur', set: ['maj', 'min'] },
    { name: 'Avec l\'accord diminué', set: ['maj', 'min', 'dim'] },
    { name: 'Avec l\'accord augmenté', set: ['maj', 'min', 'dim', 'aug'] },
    { name: 'Majeur et mineur, renversés', set: ['maj', 'min'], inv: true, tip: 'L\'accord peut être renversé : sa note la plus grave n\'est plus forcément la fondamentale.' },
    { name: 'Accords de septième', set: ['maj', 'min', 'dom7', 'maj7', 'min7'] },
    { name: 'Tout mélangé, avec renversements', set: ['maj', 'min', 'dim', 'aug', 'dom7', 'maj7', 'min7'], inv: true },
  ],
  dictee: [
    { name: '3 notes conjointes, de Do à Sol', n: 3, lo: 0, hi: 4, leap: 1 },
    { name: '4 notes, de Do à Sol', n: 4, lo: 0, hi: 4, leap: 2 },
    { name: '5 notes sur une octave', n: 5, lo: 0, hi: 7, leap: 2 },
    { name: '5 notes, avec des sauts de quarte et de quinte', n: 5, leap: 4 },
    { name: '6 notes en Sol, Fa ou Ré majeur', n: 6, leap: 4, keys: [1, -1, 2] },
    { name: '6 notes en mineur', n: 6, leap: 4, keys: [0, 1, -1], minor: 1 },
    { name: '8 notes, majeur ou mineur', n: 8, leap: 4, keys: [0, 1, -1, 2, -2], minor: 0.4 },
    { name: '8 notes, chromatismes et grands sauts', n: 8, leap: 7, keys: [0, 1, -1, 2, -2, 3, -3], minor: 0.4, chroma: 0.25 },
  ],
};

const SKILLS = {
  notes: { name: 'Lecture de notes', levels: NOTE_STAGES, path: 'notes', w: 0.3 },
  sight: { name: 'Déchiffrage', levels: Gen.LEVELS, path: 'dechiffrage', w: 0.3 },
  rhythm: { name: 'Rythme', levels: Gen.RHYTHM_LEVELS, path: 'rythme', w: 0.2 },
  earNote: { name: 'Oreille · notes', levels: EAR.note, path: 'oreille', w: 0.05 },
  earInt: { name: 'Oreille · intervalles', levels: EAR.int, path: 'oreille', w: 0.05 },
  earChord: { name: 'Oreille · accords', levels: EAR.chord, path: 'oreille', w: 0.05 },
  dictee: { name: 'Dictée', levels: EAR.dictee, path: 'oreille', w: 0.05 },
};

const Skill = {
  max(id) { return SKILLS[id].levels.length - 1; },
  get(id) {
    const all = Store.d.skills || (Store.d.skills = {});
    const s = all[id] || (all[id] = { lvl: 0, m: 0, streak: 0, n: 0, best: 0, hist: [] });
    s.lvl = clamp(s.lvl || 0, 0, this.max(id));
    return s;
  },
  level(id) { return this.get(id).lvl; },
  def(id, lvl) { return SKILLS[id].levels[lvl == null ? this.level(id) : lvl]; },
  label(id, lvl) { const d = this.def(id, lvl); return d.label || d.name; },
  /* Placement manuel : on repart avec une jauge vide, à confirmer par les résultats. */
  set(id, lvl) { const s = this.get(id); s.lvl = clamp(lvl, 0, this.max(id)); s.m = 0; s.streak = 0; s.best = Math.max(s.best || 0, s.lvl); this.log(s, null, false); Store.save(); },
  /* Journal par jour, pour le suivi : exercices comptés, performance cumulée, niveau et jauge en fin de journée. */
  log(s, p, up) {
    const day = Store.dayKey(), days = s.days || (s.days = {}), e = days[day] || (days[day] = { n: 0, p: 0 });
    if (p != null) { e.n++; e.p += p; }
    e.lvl = s.lvl; e.m = Math.round(clamp(s.m, 0, 100));
    if (up) (s.ups || (s.ups = [])).push({ d: day, lvl: s.lvl });
    const keys = Object.keys(days).sort();
    while (keys.length > 120) delete days[keys.shift()];
  },

  /* Enregistre une performance p (0 à 1) de poids w. o.cap : plafond de jauge pour ce type de preuve.
     Une série de résultats excellents accélère la montée : un joueur déjà avancé ne piétine pas dans les premiers niveaux. */
  record(id, p, w = 1, o = {}) {
    const s = this.get(id), max = this.max(id), from = s.m;
    p = clamp(p, 0, 1);
    s.n++; s.hist.push(Math.round(p * 100));
    if (s.hist.length > 12) s.hist.shift();
    if (p >= 0.95) s.streak = (s.streak || 0) + 1; else if (p < 0.85) s.streak = 0;
    let d = p >= 0.95 ? 20 : p >= 0.85 ? 12 : p >= 0.7 ? 4 : p >= 0.5 ? -5 : -12;
    if (d > 0) d *= [1, 1, 1.5, 2.5, 4][Math.min(s.streak, 4)];
    d *= w;
    let m = s.m + d, up = false, down = false, capped = false;
    if (d > 0 && o.cap != null && m > o.cap) { m = Math.max(s.m, o.cap); capped = true; }
    if (m >= 100) {
      if (s.lvl < max) { s.lvl++; m = Math.min(m - 100, 40); up = true; } else m = 100;
    } else if (m < -25) {
      if (s.lvl > 0) { s.lvl--; m = 55; down = true; s.streak = 0; } else m = 0;
    }
    if (s.lvl === 0 && m < 0) m = 0;
    s.m = m; s.best = Math.max(s.best || 0, s.lvl);
    this.log(s, p, up);
    Store.save();
    return { id, p, up, down, capped, lvl: s.lvl, m, d: up || down ? d : m - from };
  },

  /* ----- Qualité d'une performance, entre 0 et 1 */
  q: {
    /* Lecture : justesse du premier coup, pondérée par la vitesse par rapport au temps visé du palier. */
    notes(stage, ser) {
      if (!ser.n) return 0;
      const avg = ser.clean ? ser.ms / ser.clean / 1000 : 99, speed = clamp((2 * stage.T - avg) / stage.T, 0, 1);
      return (ser.clean / ser.n) * (0.6 + 0.4 * speed);
    },
    /* Déchiffrage sans métronome : justesse, pénalisée si l'on s'arrête beaucoup. */
    sightWait(r, model) {
      const nominal = model.measures.length * (model.time[0] * 4 / model.time[1]) * 60 / model.tempo, ratio = r.sec / nominal;
      return r.acc * (ratio <= 1.6 ? 1 : ratio >= 4 ? 0.6 : 1 - 0.4 * (ratio - 1.6) / 2.4);
    },
    /* Au métronome : justesse en rythme, un peu minorée si le tempo a été beaucoup ralenti. */
    tempo(r, ratio) { return r.acc * (ratio >= 0.85 ? 1 : ratio >= 0.6 ? 0.88 : 0.75); },
    /* Rythme : la précision exigée se resserre avec le niveau. */
    rhythm(r, ratio, lvl) {
      const tol = clamp(75 - 3 * lvl, 42, 75), timing = r.avgMs <= tol ? 1 : r.avgMs >= 2.2 * tol ? 0.75 : 1 - 0.25 * (r.avgMs - tol) / (1.2 * tol);
      return r.acc * timing * (ratio >= 0.85 ? 1 : ratio >= 0.6 ? 0.88 : 0.75);
    },
  },

  /* ----- Niveau global : moyenne pondérée de l'avancement dans chaque discipline */
  frac(id) { const s = this.get(id); return (s.lvl + clamp(s.m, 0, 100) / 100) / SKILLS[id].levels.length; },
  global() {
    const f = sum(Object.keys(SKILLS).map(id => SKILLS[id].w * this.frac(id)));
    const label = f < 0.06 ? 'Découverte' : f < 0.22 ? 'Débutant' : f < 0.42 ? 'Élémentaire' : f < 0.62 ? 'Intermédiaire' : f < 0.82 ? 'Avancé' : 'Confirmé';
    return { f, label };
  },
};

/* Bandeau de niveau d'un entraînement : niveau, jauge de maîtrise, mode adaptatif ou libre.
   o : { onChange() appelé quand le niveau à utiliser change, freeSelect: false pour masquer le choix libre } */
function skillBar(id, o = {}) {
  const el = h('div', { class: 'card skill' });
  const mode = () => (Store.d.mode && Store.d.mode[id]) || 'auto';
  const free = () => clamp((Store.d.free && Store.d.free[id]) || 0, 0, Skill.max(id));
  const levels = SKILLS[id].levels;
  let note = '', kind = '';
  el.auto = () => !!o.compact || mode() === 'auto';
  el.level = () => (el.auto() ? Skill.level(id) : free());
  el.note = (t, k) => { note = t || ''; kind = k || ''; el.draw(); };
  el.track = o.compact ? null : skillTrack(id);          // panneau de suivi, à placer où l'on veut dans la page
  function place() {
    let v = Skill.level(id);
    modal('Me placer à un autre niveau', h('div', { class: 'stack' },
      h('p', null, 'Choisis le niveau qui te correspond. Ta jauge repart de zéro : si le niveau est trop haut, tes résultats te feront redescendre ; s\'il est trop bas, tu remonteras très vite.'),
      select(levels.map((l, i) => [i, `${i + 1} — ${l.label || l.name}`]), v, x => { v = +x; })),
    [{ label: 'Annuler' }, { label: 'Valider', cls: 'primary', fn: () => { Skill.set(id, v); note = ''; el.draw(); if (o.onChange) o.onChange(); } }]);
  }
  el.draw = () => {
    const s = Skill.get(id), auto = el.auto(), lvl = el.level(), def = levels[lvl], full = s.lvl === Skill.max(id) && s.m >= 100;
    el.innerHTML = '';
    el.append(h('div', null,
      h('div', { class: 'spread' },
        h('div', null, h('span', { class: 'kicker' }, auto ? 'Ton niveau' : 'Niveau choisi'), h('div', { class: 'skill-title' }, h('b', null, `Niveau ${lvl + 1} / ${levels.length}`), ' · ', def.label || def.name)),
        !o.compact && seg([['auto', 'Adaptatif'], ['free', 'Libre']], mode(), v => { (Store.d.mode || (Store.d.mode = {}))[id] = v; Store.save(); note = ''; el.draw(); if (o.onChange) o.onChange(); })),
      auto
        ? h('div', { class: 'skill-row' }, h('div', { class: 'bar' + (full ? ' ok' : '') }, h('i', { style: { width: clamp(s.m, 0, 100) + '%' } })),
          h('span', { class: 'small muted' }, full ? 'Dernier niveau maîtrisé' : `Maîtrise du niveau : ${Math.round(clamp(s.m, 0, 100))} %`),
          !o.compact && h('button', { class: 'btn sm ghost', onclick: place }, 'Me placer à un autre niveau'))
        : h('div', { class: 'skill-row' },
          o.freeSelect !== false && select(levels.map((l, i) => [i, `${i + 1} — ${l.label || l.name}`]), free(), v => { (Store.d.free || (Store.d.free = {}))[id] = +v; Store.save(); el.draw(); if (o.onChange) o.onChange(); }),
          h('span', { class: 'small muted' }, 'Mode libre : tes résultats ne modifient pas ton niveau.')),
      def.tip && h('p', { class: 'small skill-tip' }, h('b', null, 'À ce niveau : '), def.tip),
      note && h('p', { class: 'small skill-note ' + kind }, note)));
    if (el.track) el.track.draw();
  };
  /* Affiche l'effet d'un résultat renvoyé par Skill.record. */
  el.report = (res, extra) => {
    if (res.up) { toast(`Niveau ${res.lvl + 1} débloqué : ${Skill.label(id, res.lvl)}`, 'ok'); note = 'Niveau validé : tu passes au suivant.'; kind = 'ok'; }
    else if (res.down) { toast('On redescend d\'un niveau pour consolider.'); note = 'Niveau trop difficile pour l\'instant : on consolide le précédent.'; kind = 'bad'; }
    else {
      const d = Math.round(res.d);
      note = (d > 0 ? `+${d} % de maîtrise` : d < 0 ? `${d} % de maîtrise` : 'Maîtrise inchangée') + ` (performance : ${Math.round(res.p * 100)} %)`;
      kind = d > 0 ? 'ok' : d < 0 ? 'bad' : '';
    }
    if (extra) note += ' · ' + extra;
    el.draw();
  };
  el.draw();
  return el;
}

/* Suivi d'une discipline : chiffres clés, évolution du niveau jour après jour, dernières performances, échelle des niveaux. */
function skillTrack(id) {
  const el = h('div', { class: 'card track' });
  el.draw = () => {
    const s = Skill.get(id), levels = SKILLS[id].levels, N = levels.length, hist = s.hist || [];
    const days = Object.keys(s.days || {}).sort().slice(-30).map(k => Object.assign({ k }, s.days[k]));
    const recent = hist.length ? Math.round(sum(hist) / hist.length) : null, half = Math.floor(hist.length / 2);
    const diff = hist.length >= 6 ? sum(hist.slice(half)) / (hist.length - half) - sum(hist.slice(0, half)) / half : null;
    const trend = diff == null ? 'pas encore assez de résultats' : diff > 5 ? '↗ en progression' : diff < -5 ? '↘ en baisse' : '→ stable';
    const pct = Math.round(clamp(s.m, 0, 100));
    el.innerHTML = '';
    el.append(h('div', null,
      h('div', { class: 'spread' }, h('h3', { style: { margin: 0 } }, 'Suivi de ton niveau · ' + SKILLS[id].name),
        h('span', { class: 'muted small' }, 'Seuls les exercices en mode adaptatif sont comptés.')),
      h('div', { class: 'tiles' },
        tile(`${s.lvl + 1} / ${N}`, 'Niveau actuel', `maîtrise ${pct} %`),
        tile(String((s.best || 0) + 1), 'Meilleur niveau atteint'),
        tile(String(s.n || 0), 'Exercices comptés'),
        tile(recent == null ? '—' : recent + ' %', 'Performance récente', trend))));
    if (!s.n || !days.length) {
      el.append(h('p', { class: 'muted' }, 'Joue quelques exercices en mode adaptatif : la courbe de ton niveau et tes dernières performances s\'afficheront ici.'));
    } else {
      const top = clamp(Math.max(4, Math.ceil(Math.max(...days.map(d => d.lvl + 1 + d.m / 100))) + 1), 2, N + 1), step = top - 1 <= 6 ? 1 : top - 1 <= 12 ? 2 : 4, ticks = [];
      for (let v = 1; v <= top; v += step) ticks.push({ v, label: String(v) });
      const lineBox = h('div'), colBox = h('div');
      Chart.line(lineBox, {
        yMin: 1, yMax: top, ticks, end: 'Niveau ' + (s.lvl + 1), aria: 'Évolution du niveau, jour après jour',
        pts: days.map(d => ({ label: dayShort(d.k), y: d.lvl + 1 + d.m / 100,
          tip: [`Niveau ${d.lvl + 1} · maîtrise ${d.m} %`, dayLong(d.k), d.n ? `${plural(d.n, 'exercice')}, performance moyenne ${Math.round(d.p / d.n * 100)} %` : 'niveau réglé à la main'] })),
      });
      Chart.columns(colBox, {
        max: 100, slots: 12, aria: 'Tes dernières performances, de la plus ancienne à la plus récente',
        ticks: [{ v: 0, label: '0 %' }, { v: 50, label: '50 %' }, { v: 85, label: '85 %', dash: true }, { v: 100, label: '100 %' }],
        vals: hist.map((p, i) => ({ v: p, tip: [p + ' %', i === hist.length - 1 ? 'ton dernier exercice' : `il y a ${plural(hist.length - 1 - i, 'exercice')}`] })),
      });
      el.append(h('div', { class: 'track-charts' },
        h('figure', null, h('figcaption', null, h('b', null, 'Ton niveau, jour après jour'), ' — la partie décimale est la jauge de maîtrise'), lineBox),
        h('figure', null, h('figcaption', null, h('b', null, `Tes ${hist.length > 1 ? hist.length + ' dernières performances' : 'performances'}`), ' — au-dessus du trait pointillé (85 %), la jauge monte nettement'), colBox)),
        Chart.table('Voir les chiffres', ['Jour', 'Niveau', 'Maîtrise', 'Exercices', 'Performance moyenne'],
          days.slice().reverse().map(d => [dayLong(d.k), `${d.lvl + 1} / ${N}`, d.m + ' %', String(d.n), d.n ? Math.round(d.p / d.n * 100) + ' %' : '—'])
            .concat([['Dernières performances', hist.map(p => p + ' %').join(', '), '', '', '']])));
    }
    el.append(h('details', { class: 'chart-table' }, h('summary', null, `Voir les ${N} niveaux`),
      h('ol', { class: 'ladder' }, levels.map((l, i) => h('li', { class: i < s.lvl ? 'done' : i === s.lvl ? 'cur' : '' },
        h('span', { class: 'mk' }, i < s.lvl ? '✓' : i === s.lvl ? '●' : '○'), h('span', null, l.label || l.name),
        h('span', { class: 'muted small' }, i < s.lvl ? 'validé' : i === s.lvl ? `en cours · ${pct} %` : 'à venir'))))));
  };
  el.draw();
  return el;
}
