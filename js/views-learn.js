'use strict';
/* Écrans : accueil, cours, leçon et moteurs d'exercices des leçons. */

const Views = {};

const SECTIONS = [
  { path: '', ico: '⌂', name: 'Accueil' },
  { path: 'seance', ico: '★', name: 'Séance du jour' },
  { sep: 'Apprendre' },
  { path: 'cours', ico: '✎', name: 'Cours de solfège', desc: 'Seize leçons progressives, du « où est le Do ? » jusqu\'aux accords.' },
  { sep: 'S\'entraîner' },
  { path: 'notes', ico: '♪', name: 'Lecture de notes', desc: 'Une note s\'affiche, tu la joues. Le site insiste sur celles que tu connais le moins.' },
  { path: 'dechiffrage', ico: '♫', name: 'Déchiffrage', desc: 'Des mélodies toujours nouvelles à lire à vue, sur huit niveaux.' },
  { path: 'rythme', ico: '♩', name: 'Rythme', desc: 'Tape le rythme affiché en suivant le métronome.' },
  { path: 'oreille', ico: '◉', name: 'Oreille', desc: 'Retrouve une note, reconnais un intervalle ou un accord.' },
  { path: 'gammes', ico: '♯', name: 'Gammes et accords', desc: 'Toutes les tonalités, avec les doigtés.' },
  { sep: 'Jouer' },
  { path: 'morceaux', ico: '♬', name: 'Morceaux', desc: 'Apprends un morceau pas à pas, ou importe tes partitions MuseScore.' },
  { sep: 'Suivi' },
  { path: 'progres', ico: '↗', name: 'Progrès' },
  { path: 'reglages', ico: '⚙', name: 'Réglages' },
];

const tile = (v, l, s) => h('div', { class: 'tile' }, h('div', { class: 'l' }, l), h('div', { class: 'v' }, v), s && h('div', { class: 's' }, s));
const lessonDone = l => !!(Store.d.lessons[l.id] && Store.d.lessons[l.id].done);

/* Carte « niveau réel » : le niveau global et l'avancement dans chaque discipline. */
function levelCard() {
  const g = Skill.global(), owned = Store.d.scaleStars || {};
  const scales = Object.values(owned).filter(s => s.R && s.L && s.T).length;
  return h('div', { class: 'card' },
    h('div', { class: 'spread' }, h('div', null, h('span', { class: 'kicker' }, 'Ton niveau réel'), h('h3', { style: { margin: 0 } }, g.label)),
      h('span', { class: 'muted small' }, 'Mesuré sur tes résultats, pas sur le temps passé.')),
    h('div', { class: 'bar', style: { margin: '10px 0 6px' } }, h('i', { style: { width: Math.round(g.f * 100) + '%' } })),
    h('div', { class: 'levels' }, Object.keys(SKILLS).map(id => {
      const s = Skill.get(id), n = SKILLS[id].levels.length;
      return h('a', { class: 'level-row', href: '#/' + SKILLS[id].path },
        h('span', { class: 'grow' }, h('b', null, SKILLS[id].name), h('div', { class: 'muted small' }, Skill.label(id))),
        h('span', { class: 'lv' }, `${s.lvl + 1} / ${n}`),
        h('div', { class: 'bar' }, h('i', { style: { width: Math.round(Skill.frac(id) * 100) + '%' } })));
    }),
    h('a', { class: 'level-row', href: '#/gammes' }, h('span', { class: 'grow' }, h('b', null, 'Gammes'), h('div', { class: 'muted small' }, 'Trois étoiles : chaque main, puis les deux au métronome')),
      h('span', { class: 'lv' }, `${scales} / 24`), h('div', { class: 'bar' }, h('i', { style: { width: Math.round(scales / 24 * 100) + '%' } })))),
    h('p', { class: 'muted small', style: { margin: '12px 0 0' } }, 'Chaque discipline a sa jauge : plusieurs bons résultats de suite sont nécessaires pour valider un niveau, et des résultats faibles font redescendre.'));
}

/* Bloc « connexion du piano » : état, bouton, conseils et test en direct. Sert à l'accueil, aux réglages et à la bienvenue. */
function midiPanel() {
  const state = h('div'), last = h('span', { class: 'muted' }, 'Joue une touche pour tester…');
  const el = h('div', { class: 'stack' }, state, h('div', null, h('b', null, 'Test : '), last));
  const draw = () => {
    state.innerHTML = '';
    if (Midi.status === 'unsupported') {
      state.append(h('div', { class: 'banner' }, 'Ce navigateur ne sait pas parler aux instruments MIDI. Utilise Chrome, Edge ou Firefox sur ordinateur. En attendant, le clavier à l\'écran fonctionne.'));
    } else if (Midi.connected) {
      state.append(h('p', null, h('span', { class: 'tag ok' }, 'Connecté'), ' ', Midi.inputs.map(i => i.name).join(', ')));
    } else {
      state.append(h('div', null,
        h('ol', { class: 'steps' },
          h('li', null, 'Relie ton piano à l\'ordinateur avec un câble USB (prise « USB to Host » du piano), ou avec un adaptateur MIDI-USB, puis allume-le.'),
          h('li', null, 'Clique sur le bouton ci-dessous et autorise l\'accès aux appareils MIDI quand le navigateur le demande.'),
          h('li', null, 'Joue une touche : elle doit s\'allumer sur le clavier en bas de l\'écran.')),
        Midi.status === 'denied' && h('div', { class: 'banner' }, 'L\'accès MIDI a été refusé. Clique sur le cadenas à gauche de l\'adresse du site pour l\'autoriser, puis réessaie.'),
        Midi.status === 'ready' && h('p', { class: 'muted' }, 'Accès autorisé, mais aucun instrument détecté pour l\'instant. Vérifie le câble et que le piano est allumé : il apparaîtra tout seul.'),
        h('button', { class: 'btn primary', onclick: () => Midi.connect() }, Midi.status === 'pending' ? 'Connexion…' : 'Connecter mon piano')));
    }
  };
  draw();
  const offM = Midi.onChange(() => { if (!el.isConnected) return offM(); draw(); });
  const offI = Input.on(ev => {
    if (!el.isConnected) return offI();
    if (ev.type === 'on') last.textContent = Notes.both(ev.midi) + ' — reçu ' + (ev.src === 'midi' ? 'du piano MIDI' : ev.src === 'keys' ? 'du clavier d\'ordinateur' : 'du clavier à l\'écran');
  });
  return el;
}

/* ---------- Accueil */
Views.home = root => {
  const day = Store.day(), glob = Skill.global();
  const done = LESSONS.filter(lessonDone).length, next = LESSONS.find(l => !lessonDone(l));
  const min = Math.floor(day.sec / 60), goal = Store.s.goalMin, streak = Store.streak();
  root.append(h('section', { class: 'hero' },
    h('div', null, h('h2', null, 'Le solfège, enfin à ta portée.'), h('p', null, 'Branche ton piano, lis la note, joue-la : le site t\'écoute et te corrige en direct.')),
    /* Tant que les bases ne sont pas vues, on pousse le cours ; ensuite, la séance du jour. */
    done >= 3 && !Daily.doneToday() ? h('a', { class: 'btn primary', href: '#/seance' }, 'Séance du jour →')
      : h('a', { class: 'btn primary', href: next ? '#/cours/' + next.id : '#/morceaux' }, next ? (done ? 'Continuer le cours →' : 'Commencer le cours →') : 'Jouer un morceau →')));

  const midi = h('div');
  const drawMidi = () => {
    midi.innerHTML = '';
    if (!Midi.connected) midi.append(h('div', { class: 'card', style: { marginTop: '14px' } }, h('h3', null, 'Connecte ton piano'), midiPanel()));
  };
  drawMidi();
  const off = Midi.onChange(() => { if (Midi.connected === !!midi.firstChild) drawMidi(); });
  root.append(midi);

  root.append(h('div', { class: 'tiles' },
    tile(streak, 'Série en cours', streak > 1 ? 'jours d\'affilée' : streak === 1 ? 'jour — reviens demain !' : 'Joue aujourd\'hui pour la lancer'),
    h('div', { class: 'tile' }, h('div', { class: 'l' }, 'Aujourd\'hui'), h('div', { class: 'v' }, min + ' min'), h('div', { class: 's' }, `objectif : ${goal} min`), h('div', { class: 'bar ok' }, h('i', { style: { width: clamp(min / goal * 100, 0, 100) + '%' } }))),
    h('a', { class: 'tile', href: '#/progres', style: { textDecoration: 'none', color: 'inherit' } }, h('div', { class: 'l' }, 'Niveau réel'), h('div', { class: 'v' }, glob.label), h('div', { class: 's' }, 'mesuré sur tes résultats'), h('div', { class: 'bar' }, h('i', { style: { width: Math.round(glob.f * 100) + '%' } }))),
    h('div', { class: 'tile' }, h('div', { class: 'l' }, 'Cours'), h('div', { class: 'v' }, `${done} / ${LESSONS.length}`), h('div', { class: 's' }, 'leçons terminées'), h('div', { class: 'bar' }, h('i', { style: { width: (done / LESSONS.length * 100) + '%' } })))));

  const daily = Daily.doneToday();
  root.append(h('div', { class: 'grid', style: { marginBottom: '6px' } },
    h('a', { class: 'card act', href: '#/seance' },
      h('span', { class: 'kicker' }, daily ? 'Séance du jour · faite ✓' : `Séance du jour · ${goal} min`),
      h('strong', null, daily ? 'Envie d\'en refaire une ?' : 'Lecture, rythme, déchiffrage, morceau'),
      h('span', null, 'Une séance guidée à ton niveau : les étapes s\'enchaînent, tu n\'as rien à choisir.')),
    next && h('a', { class: 'card act', href: '#/cours/' + next.id },
      h('span', { class: 'kicker' }, `Prochaine leçon · ${LESSONS.indexOf(next) + 1} / ${LESSONS.length}`), h('strong', null, next.title), h('span', null, next.goal))));

  root.append(h('h2', { class: 'section-title' }, 'Que veux-tu faire ?'),
    h('div', { class: 'grid' }, SECTIONS.filter(s => s.desc).map(s => h('a', { class: 'card act', href: '#/' + s.path }, h('span', { class: 'ico' }, s.ico), h('strong', null, s.name), h('span', null, s.desc)))));
  return off;
};

/* ---------- Cours : liste des leçons */
Views.cours = (root, id) => {
  if (id) return Views.lesson(root, id);
  const d = Store.d.lessons, next = LESSONS.find(l => !lessonDone(l));
  root.append(h('p', { class: 'lead' }, 'Seize leçons courtes, dans l\'ordre où un professeur les enseignerait. Chacune se termine par des exercices à jouer sur ton piano.'));
  const exTotal = sum(LESSONS.map(l => l.ex.length)), exDone = sum(LESSONS.map(l => Object.keys((d[l.id] || {}).ex || {}).length));
  root.append(h('div', { class: 'card' }, h('h3', null, 'Suivi de ton avancement'),
    h('div', { class: 'tiles' }, tile(`${LESSONS.filter(lessonDone).length} / ${LESSONS.length}`, 'Leçons terminées'), tile(`${exDone} / ${exTotal}`, 'Exercices validés'),
      tile(next ? 'Leçon ' + (LESSONS.indexOf(next) + 1) : 'Terminé', 'Où tu en es', next ? next.title : 'Tout le cours est validé')),
    h('div', { class: 'levels' }, CHAPTERS.map((name, c) => {
      const ls = LESSONS.filter(l => l.ch === c), ok = ls.filter(lessonDone).length;
      return h('div', { class: 'level-row' }, h('span', { class: 'grow' }, h('b', null, `${c + 1}. ${name}`)), h('span', { class: 'lv' }, `${ok} / ${ls.length}`),
        h('div', { class: 'bar' + (ok === ls.length ? ' ok' : '') }, h('i', { style: { width: (ok / ls.length * 100) + '%' } })));
    }))));
  CHAPTERS.forEach((name, c) => {
    root.append(h('h2', { class: 'section-title' }, `${c + 1}. ${name}`),
      h('div', { class: 'lesson-list' }, LESSONS.filter(l => l.ch === c).map(l => {
        const p = d[l.id], nEx = p ? Object.keys(p.ex || {}).length : 0, ok = lessonDone(l);
        return h('a', { class: 'lesson-row' + (ok ? ' done' : l === next ? ' next' : ''), href: '#/cours/' + l.id },
          h('span', { class: 'num' }, ok ? '✓' : LESSONS.indexOf(l) + 1),
          h('span', { class: 'grow' }, h('strong', null, l.title), h('div', { class: 'muted small' }, l.goal)),
          h('span', { class: 'muted small' }, ok ? 'Terminée' : nEx ? `${nEx} / ${l.ex.length} exercices` : `≈ ${l.min} min`));
      })));
  });
};

/* ---------- Une leçon */
const EX_KIND = { find: 'Sur le clavier', read: 'Lecture de notes', quiz: 'Quiz', score: 'Partition à jouer', rhythm: 'Rythme à taper' };

Views.lesson = async (root, id) => {
  const L = LESSONS.find(l => l.id === id);
  if (!L) { root.append(h('p', null, 'Leçon introuvable. ', h('a', { href: '#/cours' }, 'Retour au cours'))); return; }
  const idx = LESSONS.indexOf(L), prog = Store.d.lessons[id] || (Store.d.lessons[id] = { ex: {} });
  if (!prog.ex) prog.ex = {};
  App.title(L.title);
  const figs = [], views = [];
  let active = null;

  const art = h('article', { class: 'lesson' }, h('p', { class: 'kicker' }, `Leçon ${idx + 1} · ${CHAPTERS[L.ch]}`), h('h2', null, L.title), h('p', { class: 'lead' }, L.goal));
  const addFig = (b, parent) => {
    const host = h('div', { class: 'paper fig' });
    parent.append(h('figure', null, host, b.cap && h('figcaption', null, b.cap)));
    figs.push([host, b.fig]);
  };
  for (const b of L.body) {
    if (typeof b === 'string') art.append(h('div', { class: 'prose', html: b }));
    else if (b.kbd) art.append(h('figure', null, miniPiano(b.kbd.lo, b.kbd.hi, b.kbd.marks), b.cap && h('figcaption', null, b.cap)));
    else if (b.fig) addFig(b, art);
    else if (b.row) { const row = h('div', { class: 'fig-row' }); art.append(row); b.row.forEach(x => addFig(x, row)); }
  }

  const exs = h('section', { class: 'exs' }, h('h3', null, 'À toi de jouer')), banner = h('div');
  const cards = L.ex.map((ex, i) => {
    const num = h('span', { class: 'ex-num' }), body = h('div', { class: 'ex-body' });
    const btn = h('button', { class: 'btn', onclick: () => open(i) });
    const card = h('div', { class: 'ex-card' }, h('div', { class: 'ex-head' }, num, h('div', null, h('strong', null, ex.title), h('div', { class: 'muted small' }, EX_KIND[ex.type])), btn), body);
    exs.append(card);
    return { card, num, body, btn };
  });
  const paint = () => {
    cards.forEach((c, i) => {
      const ok = !!prog.ex[i], isOpen = !!active && active.i === i;
      c.card.classList.toggle('done', ok); c.card.classList.toggle('open', isOpen);
      c.num.textContent = ok ? '✓' : i + 1;
      c.btn.textContent = isOpen ? 'Fermer' : ok ? 'Refaire' : 'Commencer';
      c.btn.className = 'btn' + (ok || isOpen ? '' : ' primary');
    });
    banner.innerHTML = '';
    const nxt = LESSONS[idx + 1];
    if (prog.done) banner.append(h('div', { class: 'presult good' }, h('div', null, h('div', { class: 't' }, 'Leçon terminée'), h('div', null, 'Tous les exercices sont validés.')),
      h('div', { class: 'acts' }, nxt ? h('a', { class: 'btn primary', href: '#/cours/' + nxt.id }, 'Leçon suivante : ' + nxt.title + ' →') : h('a', { class: 'btn primary', href: '#/morceaux' }, 'Passer aux morceaux →'))));
  };
  function close() {
    if (!active) return;
    active.h.stop(); cards[active.i].body.innerHTML = ''; active = null;
  }
  function open(i) {
    const same = active && active.i === i;
    close();
    if (!same) {
      active = { i, h: null };
      active.h = Exercises[L.ex[i].type](cards[i].body, L.ex[i], () => passed(i));
      cards[i].card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    paint();
  }
  function passed(i) {
    if (!prog.ex[i]) { prog.ex[i] = true; Store.addXp(10); }
    if (!prog.done && L.ex.every((_, k) => prog.ex[k])) { prog.done = true; Store.addXp(25); toast('Leçon terminée !', 'ok'); }
    Store.save(); paint();
  }
  paint();

  const prev = LESSONS[idx - 1], nxt = LESSONS[idx + 1];
  root.append(h('p', null, h('a', { href: '#/cours', class: 'small' }, '← Toutes les leçons')), art, exs, banner,
    h('div', { class: 'spread', style: { marginTop: '18px' } },
      prev ? h('a', { class: 'btn ghost', href: '#/cours/' + prev.id }, '← ' + prev.title) : h('span'),
      nxt ? h('a', { class: 'btn ghost', href: '#/cours/' + nxt.id }, nxt.title + ' →') : h('span')));

  for (const [host, f] of figs) {
    if (!root.isConnected) break;
    try { views.push(await drawFigure(host, f)); } catch (e) { console.error(e); }
  }
  return () => { close(); views.forEach(v => v.destroy()); };
};

/* ---------- Exercices des leçons. Chacun reçoit (zone, définition, validé) et renvoie { stop } */
const Exercises = {
  /* Trouver une note (n'importe quelle octave), une touche précise ou un accord. */
  find(host, ex, done) {
    const items = ex.items;
    let i = 0, tries = 0, lock = false, timer = 0;
    const pcOf = s => mod(Notes.midi(Notes.parse(/\d/.test(s) ? s : s + '4')), 12);
    const dots = h('div', { class: 'dots' }), prompt = h('div', { class: 'big-prompt' }), fb = h('div', { class: 'fb' });
    host.append(dots, prompt, fb, h('div', { class: 'center' }, h('button', { class: 'btn ghost sm', onclick: () => hint() }, 'Montre-moi la touche')));
    const targets = it => {
      if (it.chord) { let m = 60; return it.chord.map(s => { const pc = pcOf(s); while (mod(m, 12) !== pc) m++; return m++; }); }
      if (it.exact) return [Notes.midi(Notes.parse(it.n))];
      const pc = pcOf(it.n), out = [];
      for (let m = Piano.lo; m <= Piano.hi; m++) if (mod(m, 12) === pc) out.push(m);
      return out;
    };
    const hint = () => Piano.mark(targets(items[i]), 'target');
    function show() {
      tries = 0; lock = false; Piano.clear('target');
      fb.textContent = ''; fb.className = 'fb';
      dots.innerHTML = '';
      items.forEach((_, k) => dots.append(h('i', { class: k < i ? 'on' : k === i ? 'cur' : '' })));
      prompt.innerHTML = 'Joue <b>' + (items[i].say || 'un ' + Notes.name(Notes.parse(items[i].n + '4'))) + '</b>';
    }
    function finish() {
      off(); Piano.clear('target');
      host.innerHTML = '';
      host.append(h('div', { class: 'presult good' }, h('div', null, h('div', { class: 't' }, 'Exercice réussi !'), h('div', null, 'Tu peux passer au suivant.'))));
      done();
    }
    const off = Input.on(ev => {
      if (ev.type !== 'on' || lock) return;
      const it = items[i];
      let ok;
      if (it.chord) {
        const need = new Set(it.chord.map(pcOf)), held = new Set([...Input.held].map(m => mod(m, 12)));
        if (!need.has(mod(ev.midi, 12))) ok = false;
        else if ([...need].every(p => held.has(p)) && [...held].every(p => need.has(p))) ok = true;
        else return;
      } else ok = it.exact ? ev.midi === Notes.midi(Notes.parse(it.n)) : mod(ev.midi, 12) === pcOf(it.n);
      if (ok) {
        lock = true; Piano.flash(ev.midi, 'ok');
        fb.textContent = pick(['Oui !', 'Exact !', 'Bien joué !', 'C\'est ça !']); fb.className = 'fb ok';
        timer = setTimeout(() => { i++; if (i < items.length) show(); else finish(); }, 550);
      } else {
        tries++; Piano.flash(ev.midi, 'bad'); fb.className = 'fb bad';
        fb.textContent = it.exact && mod(ev.midi, 12) === pcOf(it.n) ? 'Bonne note, mais pas à la bonne hauteur.' : `Ça, c'est ${Notes.both(ev.midi)}. Cherche encore.`;
        if (tries >= 3) hint();
      }
    });
    show();
    return { stop() { off(); clearTimeout(timer); Piano.clear('target'); } };
  },

  quiz(host, ex, done) {
    const qs = ex.questions, box = h('div', { class: 'quiz' });
    let i = 0, first = 0;
    host.append(box);
    function show() {
      const q = qs[i], why = h('div', { class: 'why' });
      let tried = false, solved = false;
      box.innerHTML = '';
      box.append(h('div', { class: 'muted small' }, `Question ${i + 1} / ${qs.length}`), h('p', { class: 'q', html: q.q }),
        h('div', { class: 'choices' }, q.c.map((c, k) => h('button', { class: 'choice', html: c, onclick: e => {
          if (solved) return;
          const b = e.currentTarget;
          if (k === q.a) {
            solved = true; b.classList.add('ok');
            if (!tried) first++;
            why.innerHTML = '<b>Exact.</b> ' + (q.why || '');
            box.append(h('button', { class: 'btn primary', onclick: () => { i++; if (i < qs.length) show(); else end(); } }, i + 1 < qs.length ? 'Question suivante' : 'Terminer'));
          } else { tried = true; b.classList.add('bad'); b.disabled = true; why.textContent = 'Pas tout à fait, essaie encore.'; }
        } }))), why);
    }
    function end() {
      box.innerHTML = '';
      const ok = first / qs.length >= 0.6;
      box.append(h('div', { class: 'presult ' + (ok ? 'good' : 'mid') }, h('div', { class: 'stars' }, stars(first / qs.length)),
        h('div', null, h('div', { class: 't' }, ok ? 'Quiz réussi !' : 'Presque…'), h('div', null, `${first} / ${qs.length} bonnes réponses du premier coup.` + (ok ? '' : ' Relis la leçon puis retente ta chance.'))),
        h('div', { class: 'acts' }, h('button', { class: 'btn', onclick: () => { i = 0; first = 0; show(); } }, 'Refaire le quiz'))));
      if (ok) done();
    }
    show();
    return { stop() {} };
  },

  /* Mini lecture de notes : des séries de 8 notes jusqu'à atteindre `count` notes lues. */
  read(host, ex, done) {
    const pool = Gen.rangePool(ex.clefs, ex.range, ex.fifths || 0);
    let n = 0, clean = 0, tr = null, stopped = false;
    const paper = h('div', { class: 'paper' }), sh = h('div'), info = h('div', { class: 'plive' });
    paper.append(sh); host.append(paper, info);
    const view = new ScoreView(sh, { zoom: 1.35, fit: true, scroller: $('#main'), osmd: { drawTimeSignatures: false, drawMeasureNumbers: false } });
    const draw = () => { info.innerHTML = `<b>${n}</b> / ${ex.count} notes · ${clean} du premier coup` + (n === 0 ? ' — joue la note sous le curseur.' : ''); };
    async function round() {
      if (stopped) return;
      const size = Math.min(8, Math.max(4, Math.ceil((ex.count - n) / 4) * 4));
      const model = Gen.series(pool, size, { clefs: ex.clefs, fifths: ex.fifths || 0, accidentals: ex.acc, names: ex.names });
      await view.load(MX.build(model));
      if (stopped) return;
      tr = new Trainer(view, { mode: 'wait', hints: Store.s.hints,
        onNote: r => { n++; if (r.clean) clean++; draw(); },
        onDone: () => { if (n >= ex.count) finish(); else round(); } });
      tr.start(); draw();
    }
    function finish() {
      const acc = clean / n;
      Store.addXp(Math.round(clean / 2));
      info.innerHTML = '';
      info.append(h('div', { class: 'presult ' + (acc >= 0.7 ? 'good' : 'mid') }, h('div', { class: 'stars' }, stars(acc)),
        h('div', null, h('div', { class: 't' }, acc >= 0.7 ? 'Bien lu !' : 'Encore un petit effort'), h('div', null, `${clean} notes sur ${n} justes du premier coup.` + (acc >= 0.7 ? '' : ' Vise 70 % pour valider.'))),
        h('div', { class: 'acts' }, h('button', { class: 'btn', onclick: () => { n = 0; clean = 0; round(); } }, 'Recommencer'))));
      if (acc >= 0.7) done();
    }
    round().catch(e => { console.error(e); });
    return { stop() { stopped = true; if (tr) tr.stop(); view.destroy(); } };
  },

  score(host, ex, done) {
    const model = ex.make ? ex.make() : MX.piece(ex.piece);
    const p = Practice(host, { modes: ['wait', 'tempo', 'listen'], zoom: 1.15, fit: true, onDone: r => { if (r && r.mode !== 'listen' && r.acc >= 0.5) done(); } });
    p.load(MX.build(model), { bpm: model.tempo }).catch(e => console.error(e));
    return { stop: () => p.destroy() };
  },

  rhythm(host, ex, done) {
    const p = Practice(host, { modes: ['tempo', 'listen'], anyPitch: true, tap: true, hands: false, zoom: 1.2, fit: true, passAt: 0.7, onDone: r => { if (r && r.mode === 'tempo' && r.acc >= 0.7) done(); } });
    p.load(MX.build(MX.piece(ex.piece)), { bpm: ex.piece.tempo }).catch(e => console.error(e));
    return { stop: () => p.destroy() };
  },
};
