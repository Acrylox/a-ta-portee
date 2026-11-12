'use strict';
/* Écrans : lecture de notes, déchiffrage, rythme, oreille, gammes, morceaux (et import), progrès, réglages. */

/* ---------- Partitions importées, conservées dans le navigateur (IndexedDB) */
const Lib = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('a-ta-portee', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('scores', { keyPath: 'id' });
      r.onsuccess = () => res(this.db = r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async run(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const rq = fn(db.transaction('scores', mode).objectStore('scores'));
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  },
  all() { return this.run('readonly', s => s.getAll()); },
  get(id) { return this.run('readonly', s => s.get(id)); },
  put(o) { return this.run('readwrite', s => s.put(o)); },
  del(id) { return this.run('readwrite', s => s.delete(id)); },
};

async function importFile(file) {
  const base = file.name.replace(/\.[^.]+$/, ''), ext = (file.name.split('.').pop() || '').toLowerCase();
  const rec = { id: 'u' + Date.now().toString(36) + rnd(1000), title: base, added: Date.now() };
  if (ext === 'mid' || ext === 'midi') {
    const model = MidiFile.toScore(MidiFile.parse(await file.arrayBuffer()), base);
    Object.assign(rec, { kind: 'xml', data: MX.build(model), bpm: model.tempo, from: 'MIDI' });
  } else if (ext === 'mxl') {
    const b = new Uint8Array(await file.arrayBuffer());
    if (b[0] !== 0x50 || b[1] !== 0x4b) throw new Error('fichier .mxl illisible.');
    let s = '';
    for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
    Object.assign(rec, { kind: 'mxl', data: s, from: 'MusicXML' });
  } else if (ext === 'musicxml' || ext === 'xml') {
    const text = (await file.text()).replace(/^﻿/, '');
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror') || !doc.querySelector('score-partwise')) throw new Error('ce fichier n\'est pas une partition MusicXML lisible. Réexporte-le depuis MuseScore au format MusicXML.');
    const t = doc.querySelector('work-title, movement-title');
    if (t && t.textContent.trim()) rec.title = t.textContent.trim();
    Object.assign(rec, { kind: 'xml', data: text, from: 'MusicXML' });
  } else if (ext === 'mscz' || ext === 'mscx') throw new Error('les fichiers MuseScore (.mscz) ne se lisent pas directement. Dans MuseScore : Fichier → Exporter → MusicXML, puis importe le fichier obtenu.');
  else if (ext === 'pdf') throw new Error('un PDF est une image de la partition : le site ne peut pas le suivre note à note. Il faut un fichier MusicXML ou MIDI.');
  else throw new Error('format non reconnu. Formats acceptés : .musicxml, .mxl, .xml, .mid.');
  await Lib.put(rec);
  return rec;
}

/* ---------- Lecture de notes */

/* Séance chronométrée : des séries de 8 notes jusqu'à la fin du temps (ou jusqu'à « Terminer »).
   Appelle onEnd(stats) une seule fois ; renvoie { stop, end }.
   cfg : { spec: () => palier à utiliser pour la prochaine série, dur (secondes), hints, noButton, onSeries(série, palier) } */
function noteDrill(stage, cfg, onEnd) {
  const S = { n: 0, clean: 0, ms: 0, errs: 0, miss: {}, t0: performance.now(), stopped: false, tr: null };
  const timer = h('div', { class: 'timer' }, h('i')), live = h('div', { class: 'plive' }), paper = h('div', { class: 'paper' }), sh = h('div');
  paper.append(sh);
  stage.innerHTML = '';
  stage.append(h('div', { class: 'spread' }, live, !cfg.noButton && h('button', { class: 'btn sm', onclick: () => end() }, 'Terminer')), timer, paper);
  const view = new ScoreView(sh, { zoom: 1.5, fit: true, osmd: { drawTimeSignatures: false, drawMeasureNumbers: false } });
  const key = pk => pk.clef + ':' + Notes.str(pk.item.p);
  /* Les notes souvent ratées, lentes ou encore peu vues reviennent plus souvent. */
  const weight = (it, clefs) => {
    const st = Store.d.notes[clefs[it.staff] + ':' + Notes.str(it.p)];
    if (!st) return 2.5;
    const n = st.ok + st.ko, avg = st.ok ? st.ms / st.ok : 3000;
    return 1 + 4 * (st.ko / n) + clamp((avg - 1200) / 1500, 0, 2) + (n < 4 ? 1 : 0);
  };
  const draw = () => { live.innerHTML = `<b>${S.n}</b> ${S.n > 1 ? 'notes lues' : 'note lue'} · ${S.n ? Math.round(S.clean / S.n * 100) : 100} % justes du premier coup` + (S.clean ? ` · ${(S.ms / S.clean / 1000).toFixed(1)} s par note` : ''); };
  let model, k, ser, sp;
  async function round() {
    if (S.stopped) return;
    sp = cfg.spec();
    model = Gen.noteSeries(sp, 8, weight);
    k = 0; ser = { n: 0, clean: 0, ms: 0 };
    await view.load(MX.build(model));
    if (S.stopped) return;
    S.tr = new Trainer(view, {
      mode: 'wait', hints: cfg.hints,
      onNote: r => {
        const pk = model.picks[k++];
        S.n++; ser.n++;
        if (r.clean) { S.clean++; S.ms += r.ms; ser.clean++; ser.ms += r.ms; Store.addXp(1); }
        if (pk && pk.item) Store.noteStat(key(pk), r.clean, r.ms);
        draw();
      },
      onError: () => { const pk = model.picks[k]; S.errs++; if (pk && pk.item) { const kk = key(pk); S.miss[kk] = (S.miss[kk] || 0) + 1; } },
      onDone: () => { if (cfg.onSeries) cfg.onSeries(ser, sp); round().catch(e => console.error(e)); },
    });
    S.tr.start();
  }
  const iv = setInterval(() => {
    const el = (performance.now() - S.t0) / 1000;
    timer.firstChild.style.width = clamp(100 - el / cfg.dur * 100, 0, 100) + '%';
    if (el >= cfg.dur) end();
  }, 200);
  function stop() {
    if (S.stopped) return;
    S.stopped = true; clearInterval(iv);
    if (S.tr) S.tr.stop();
    view.destroy();
  }
  function end() {
    if (S.stopped) return;
    stop(); onEnd(S);
  }
  draw();
  round().catch(e => console.error(e));
  return { stop, end };
}

/* Affiche un modèle de partition sans curseur (corrigé d'une dictée, par exemple). */
async function drawModel(host, model, zoom = 1.15) {
  const inner = h('div');
  host.append(inner);
  const v = new ScoreView(inner, { zoom, cursor: false, fit: true, osmd: { drawTimeSignatures: false, drawMeasureNumbers: false } });
  await v.load(MX.build(model));
  return v;
}

Views.notes = root => {
  const cfg = Store.d.drill || (Store.d.drill = { clef: 'G', level: 0, fifths: 0, acc: false, names: false, hints: false, dur: 120 });
  const setup = h('div', { class: 'card' }), stage = h('div');
  let session = null;
  const save = () => Store.save();
  const describe = k => { const [c, s] = k.split(':'); return Notes.name(Notes.parse(s), true) + (c === 'G' ? ' (clé de sol)' : ' (clé de fa)'); };
  const bar = skillBar('notes', { freeSelect: false, onChange: () => { if (!session) drawSetup(); } });
  root.append(h('p', { class: 'lead' }, 'Des notes défilent, tu les joues une à une. Le site mesure ta justesse et ta vitesse : quand tu lis un palier sans hésiter, il passe au suivant, jusqu\'aux accords et aux armures chargées.'), bar, setup, stage, bar.track);

  function drawSetup() {
    setup.hidden = false; setup.innerHTML = '';
    const dur = field('Durée', seg([[60, '1 min'], [120, '2 min'], [300, '5 min']], cfg.dur, v => { cfg.dur = v; save(); }));
    const go = h('button', { class: 'btn primary', style: { marginLeft: 'auto' }, onclick: start }, '▶ Commencer');
    if (bar.auto()) {
      setup.append(h('div', { class: 'row' }, dur, go),
        h('p', { class: 'muted small', style: { margin: '12px 0 0' } }, 'La clé, l\'étendue et les altérations sont choisies selon ton niveau. Chaque série de 8 notes est évaluée : justesse du premier coup et temps par note.'));
      return;
    }
    setup.append(h('div', { class: 'row' },
      field('Clé', seg([['G', 'Clé de sol'], ['F', 'Clé de fa'], ['GF', 'Les deux']], cfg.clef, v => { cfg.clef = v; save(); })),
      field('Étendue', seg([[0, 'Autour du Do central'], [1, 'Toute la portée'], [2, 'Lignes supplémentaires'], [3, 'Très étendue']], cfg.level, v => { cfg.level = v; save(); })),
      field('Armure', select([[0, 'Aucune'], [1, '1 dièse'], [2, '2 dièses'], [3, '3 dièses'], [4, '4 dièses'], [-1, '1 bémol'], [-2, '2 bémols'], [-3, '3 bémols'], [-4, '4 bémols']], cfg.fifths, v => { cfg.fifths = +v; save(); })),
      field('Contenu', seg([['note', 'Notes'], ['int', 'Intervalles'], ['chord', 'Accords']], cfg.kind || 'note', v => { cfg.kind = v; save(); })),
      dur),
    h('div', { class: 'row center', style: { marginTop: '14px' } },
      check('Dièses et bémols au hasard', cfg.acc, v => { cfg.acc = v; save(); }),
      check('Nom sous chaque note', cfg.names, v => { cfg.names = v; save(); }),
      check('Montrer la touche sur le clavier', cfg.hints, v => { cfg.hints = v; save(); }),
      go));
  }

  function start() {
    if (session) session.stop();
    setup.hidden = true;
    const auto = bar.auto(), kind = cfg.kind || 'note';
    const manual = { clefs: cfg.clef === 'GF' ? ['G', 'F'] : [cfg.clef], range: kind === 'note' ? cfg.level : Math.max(1, cfg.level), keys: [cfg.fifths], acc: cfg.acc, names: cfg.names, kind, T: 2 };
    session = noteDrill(stage, {
      spec: () => (auto ? NOTE_STAGES[Skill.level('notes')] : manual), dur: cfg.dur, hints: auto ? false : cfg.hints,
      onSeries: (ser, sp) => { if (auto && ser.n >= 6) bar.report(Skill.record('notes', Skill.q.notes(sp, ser), 0.6)); },
    }, S => { session = null; summary(S, auto); });
  }

  function summary(S, auto) {
    const acc = S.n ? S.clean / S.n : 0, bk = 'drill:' + (auto ? 'auto' : cfg.clef + cfg.level), prev = Store.d.best[bk] || 0;
    if (S.clean > prev) { Store.d.best[bk] = S.clean; Store.save(); }
    const worst = Object.entries(S.miss).sort((a, b) => b[1] - a[1]).slice(0, 4);
    stage.innerHTML = '';
    stage.append(h('div', { class: 'card' }, h('h3', null, 'Séance terminée'),
      h('div', { class: 'tiles' }, tile(S.n, 'Notes lues'), tile(Math.round(acc * 100) + ' %', 'Justes du premier coup'), tile(S.clean ? (S.ms / S.clean / 1000).toFixed(1) + ' s' : '—', 'Par note, en moyenne'), tile(Math.max(prev, S.clean), 'Record', S.clean > prev && prev ? 'Nouveau record !' : 'notes justes en une séance')),
      worst.length ? h('p', null, 'À revoir en priorité : ', worst.map(([kk]) => [h('span', { class: 'tag' }, describe(kk)), ' '])) : S.n ? h('p', { class: 'muted' }, 'Aucune fausse note sur les notes isolées.') : null,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: start }, 'Rejouer'), h('button', { class: 'btn', onclick: () => { stage.innerHTML = ''; drawSetup(); } }, 'Changer les réglages'))));
    bar.draw();
  }

  drawSetup();
  return () => { if (session) session.stop(); };
};

/* ---------- Déchiffrage */
Views.dechiffrage = root => {
  const cfg = Store.d.sight || (Store.d.sight = { bars: 4 });
  const info = h('span', { class: 'muted' }), host = h('div');
  let P = null, model = null, counted = false, lvl = 0;
  const bar = skillBar('sight', { onChange: () => next() });
  const next = () => {
    lvl = bar.level();
    model = Gen.melody(lvl + 1, { bars: cfg.bars });
    counted = false;
    info.textContent = `${Notes.keyName(model.fifths, model.minor)} · mesure à ${model.time.join('/')}`;
    const L = Gen.LEVELS[lvl];
    bar.note(bar.auto() && L.tempo && Skill.get('sight').m >= 60 ? 'Pour valider ce niveau, joue maintenant au métronome : le mode « à mon rythme » ne fait plus monter la jauge.' : '');
    P.load(MX.build(model), { bpm: model.tempo }).catch(e => console.error(e));
  };
  const onDone = (r, st) => {
    if (!bar.auto()) return;
    if (counted) return bar.note('Seul le premier essai compte pour ton niveau : au deuxième, ce n\'est plus du déchiffrage. Passe à la mélodie suivante.');
    if (P.view.staffCount === 2 && st.hand !== 'both') return bar.note('Joue les deux mains pour que le résultat compte dans ton niveau.');
    counted = true;
    const L = Gen.LEVELS[lvl], w = model.measures.length / 4;
    const res = r.mode === 'tempo' ? Skill.record('sight', Skill.q.tempo(r, st.bpm / model.tempo), w)
      : Skill.record('sight', Skill.q.sightWait(r, model), w, L.tempo ? { cap: 60 } : {});
    bar.report(res, res.capped ? 'pour aller plus loin à ce niveau, joue au métronome' : '');
  };
  root.append(h('p', { class: 'lead' }, 'Déchiffrer, c\'est jouer une partition que l\'on n\'a jamais vue. Chaque mélodie est nouvelle, et seul ton premier essai compte : c\'est lui qui mesure ton vrai niveau de lecture.'),
    bar,
    h('div', { class: 'card' },
      h('div', { class: 'row' },
        field('Longueur', seg([[4, '4 mesures'], [8, '8 mesures']], cfg.bars, v => { cfg.bars = v; Store.save(); next(); })),
        h('button', { class: 'btn primary', onclick: () => next() }, 'Nouvelle mélodie'), info),
      h('p', { class: 'muted small', style: { margin: '12px 0 0' } }, 'Avant de jouer, repère la clé, l\'armure, le chiffrage et la première note. Ensuite, garde les yeux un peu en avance sur tes doigts et ne t\'arrête pas en cas d\'erreur.')),
    host, bar.track);
  P = Practice(host, { modes: ['wait', 'tempo', 'listen'], zoom: 1.15, onDone, actions: [{ label: 'Mélodie suivante →', fn: () => next() }] });
  next();
  return () => P.destroy();
};

/* ---------- Rythme */
Views.rythme = root => {
  const info = h('span', { class: 'muted' }), host = h('div');
  let P = null, model = null, counted = false, lvl = 0;
  const bar = skillBar('rhythm', { onChange: () => next() });
  const next = () => {
    lvl = bar.level();
    model = Gen.rhythm(lvl + 1, 4);
    counted = false;
    info.textContent = `Mesure à ${model.time.join('/')}`;
    bar.note('');
    P.load(MX.build(model), { bpm: model.tempo }).catch(e => console.error(e));
  };
  const onDone = (r, st) => {
    if (!bar.auto() || r.mode !== 'tempo') return;
    if (counted) return bar.note('Seul le premier essai compte pour ton niveau. Passe au rythme suivant.');
    counted = true;
    bar.report(Skill.record('rhythm', Skill.q.rhythm(r, st.bpm / model.tempo, lvl), 1));
  };
  root.append(h('p', { class: 'lead' }, 'Un rythme s\'affiche : tape-le sur n\'importe quelle touche du piano, ou sur la barre d\'espace, en suivant le métronome. Plus le niveau monte, plus la précision demandée est fine.'),
    bar,
    h('div', { class: 'card' }, h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => next() }, 'Nouveau rythme'), info)),
    host, bar.track);
  P = Practice(host, { modes: ['tempo', 'listen'], anyPitch: true, tap: true, hands: false, zoom: 1.3, fit: true, onDone, actions: [{ label: 'Rythme suivant →', fn: () => next() }] });
  next();
  return () => P.destroy();
};

/* ---------- Oreille */
Views.oreille = root => {
  const cfg = Store.d.ear || (Store.d.ear = { tab: 'note' });
  const stage = h('div');
  let stop = null;
  const center = { justifyContent: 'center', marginTop: '10px' };
  const rec = (bar, id, p, w) => { if (bar.auto()) bar.report(Skill.record(id, p, w)); };

  /* Retrouver une note entendue. */
  const noteGame = () => {
    let target = null, prev = null, tries = 0, lock = false, timer = 0, good = 0, total = 0;
    const msg = h('div', { class: 'big-prompt' }), fb = h('div', { class: 'fb' }), score = h('div', { class: 'muted center' });
    const idle = () => { clearTimeout(timer); target = null; prev = null; msg.textContent = 'Clique sur « Nouvelle note » pour commencer.'; fb.textContent = ''; Piano.clear('target'); };
    const bar = skillBar('earNote', { onChange: idle });
    const L = () => EAR.note[bar.level()], wide = () => L().set[L().set.length - 1] - L().set[0] > 12;
    const play = () => { if (target == null) return; Sound.play(L().ref ? 60 : prev, 0.6, 80, 0); Sound.play(target, 1.2, 88, 0.85); };
    const next = () => {
      clearTimeout(timer); lock = false; tries = 0;
      const l = L();
      if (!l.ref) prev = target != null ? target : pick(l.set);
      target = pick(l.set.filter(m => m !== target && m !== prev));
      fb.textContent = ''; fb.className = 'fb'; Piano.clear('target');
      msg.innerHTML = (l.ref ? 'Tu entends d\'abord le <b>Do</b> de référence, puis une note mystère.' : `Tu entends d'abord <b>${Notes.both(prev)}</b>, puis une note mystère.`) + '<br>Retrouve-la sur ton piano' + (wide() ? ', à la bonne octave.' : '.');
      if (!l.ref) Piano.mark([prev], 'target');
      play();
    };
    const solved = p => { lock = true; total++; if (p === 1) good++; score.textContent = `${good} / ${total} trouvées du premier coup`; rec(bar, 'earNote', p, 0.5); timer = setTimeout(next, 1600); };
    stage.append(bar, h('div', { class: 'card' }, msg, fb,
      h('div', { class: 'row center', style: center }, h('button', { class: 'btn primary', onclick: next }, 'Nouvelle note'), h('button', { class: 'btn', onclick: play }, 'Réécouter'),
        h('button', { class: 'btn ghost', onclick: () => { if (target == null || lock) return; Piano.mark([target], 'target'); fb.className = 'fb'; fb.textContent = 'C\'était ' + Notes.both(target) + '.'; solved(0); } }, 'Solution')),
      score));
    idle();
    const off = Input.on(ev => {
      if (ev.type !== 'on' || target == null || lock) return;
      tries++;
      const samePc = mod(ev.midi, 12) === mod(target, 12);
      if (wide() ? ev.midi === target : samePc) {
        Store.addXp(tries === 1 ? 3 : 1);
        fb.className = 'fb ok'; fb.textContent = `Oui, c'était ${Notes.both(target)} !` + (tries === 1 ? ' Du premier coup.' : '');
        solved(tries === 1 ? 1 : tries === 2 ? 0.6 : 0.2);
      } else { fb.className = 'fb bad'; fb.textContent = samePc ? 'Bonne note, mais pas à la bonne octave.' : ev.midi < target ? 'Plus aigu…' : 'Plus grave…'; }
    });
    return () => { off(); clearTimeout(timer); };
  };

  /* Reconnaître un intervalle ou un accord parmi des propositions. */
  const choiceGame = kind => () => {
    const id = kind === 'int' ? 'earInt' : 'earChord';
    let q = null, answered = false, tried = false, good = 0, total = 0, timer = 0;
    const msg = h('div', { class: 'big-prompt' }), fb = h('div', { class: 'fb' }), score = h('div', { class: 'muted center' }), choices = h('div', { class: 'choices' });
    const L = () => EAR[kind][bar.level()];
    const options = () => (kind === 'int' ? L().set.map(v => [v, EAR.INTERVALS[v]]) : L().set.map(k => [k, EAR.CHORDS[k][1]]));
    const draw = () => {
      choices.innerHTML = '';
      options().forEach(([v, label]) => choices.append(h('button', { class: 'choice', disabled: !q, onclick: e => answer(v, e.currentTarget) }, label)));
    };
    const idle = () => { clearTimeout(timer); q = null; msg.textContent = 'Clique sur « Nouvelle écoute » pour commencer.'; fb.textContent = ''; Piano.clear('target'); draw(); };
    const bar = skillBar(id, { onChange: idle });
    const play = () => {
      if (!q) return;
      if (kind === 'chord' || q.dir === 'harm') { q.notes.forEach(m => Sound.play(m, 1.8, 76, 0)); return; }
      Sound.play(q.notes[0], 0.8, 85, 0); Sound.play(q.notes[1], 1.1, 85, 0.8);
      q.notes.forEach(m => Sound.play(m, 1.4, 70, 2));
    };
    const next = () => {
      clearTimeout(timer);
      const l = L(), v = pick(l.set);
      if (kind === 'int') {
        const root = 55 + rnd(12), desc = l.dir === 'both' && Math.random() < 0.5;
        q = { v, label: EAR.INTERVALS[v], dir: l.dir, notes: desc ? [root + v, root] : [root, root + v] };
      } else {
        let tones = EAR.CHORDS[v][0].slice();
        if (l.inv) { const k = rnd(tones.length); tones = tones.slice(k).concat(tones.slice(0, k).map(t => t + 12)); }
        const root = 52 + rnd(10);
        q = { v, label: EAR.CHORDS[v][1], notes: tones.map(t => root + t) };
      }
      answered = false; tried = false;
      fb.textContent = ''; fb.className = 'fb'; Piano.clear('target');
      msg.textContent = kind === 'int' ? 'Quel intervalle entends-tu ?' : 'Quel accord entends-tu ?';
      draw(); play();
    };
    const answer = (v, btn) => {
      if (!q || answered) return;
      if (v === q.v) {
        answered = true; total++;
        if (!tried) good++;
        Store.addXp(tried ? 1 : 3);
        btn.classList.add('ok'); Piano.mark(q.notes, 'target');
        fb.className = 'fb ok'; fb.textContent = `Oui : ${q.label.toLowerCase()} (${q.notes.map(m => Notes.both(m)).join(' – ')}).`;
        score.textContent = `${good} / ${total} reconnus du premier coup`;
        rec(bar, id, tried ? 0 : 1, 0.5);
        timer = setTimeout(next, 2400);
      } else { tried = true; btn.classList.add('bad'); btn.disabled = true; fb.className = 'fb bad'; fb.textContent = 'Non. Réécoute et compare.'; }
    };
    stage.append(bar, h('div', { class: 'card' }, msg, choices, fb,
      h('div', { class: 'row center', style: center }, h('button', { class: 'btn primary', onclick: next }, 'Nouvelle écoute'), h('button', { class: 'btn', onclick: play }, 'Réécouter')),
      score));
    idle();
    return () => clearTimeout(timer);
  };

  /* Dictée : rejouer une courte mélodie entendue. */
  const dictee = () => {
    let q = null, pos = 0, firstOk = 0, wrongHere = false, listens = 0, tries = 0, done = false, fig = null, timer = 0;
    const msg = h('div', { class: 'big-prompt' }), fb = h('div', { class: 'fb' }), dots = h('div', { class: 'dots' }), sheet = h('div');
    const idle = () => { q = null; done = false; dots.innerHTML = ''; fb.textContent = ''; clearSheet(); msg.textContent = 'Clique sur « Nouvelle dictée » pour commencer.'; Piano.clear('target'); };
    const clearSheet = () => { if (fig) { fig.destroy(); fig = null; } sheet.innerHTML = ''; };
    const bar = skillBar('dictee', { onChange: idle });
    const drawDots = () => { dots.innerHTML = ''; q.midi.forEach((_, i) => dots.append(h('i', { class: i < pos ? 'on' : i === pos && !done ? 'cur' : '' }))); };
    const play = () => { if (!q) return; listens++; Sound.play(q.tonic, 0.9, 78, 0); q.midi.forEach((m, i) => Sound.play(m, 0.56, 88, 1.4 + i * 0.62)); };
    const next = () => {
      q = Gen.dictee(EAR.dictee[bar.level()]);
      pos = 0; firstOk = 0; wrongHere = false; listens = 0; tries = 0; done = false;
      clearSheet(); fb.textContent = ''; fb.className = 'fb'; Piano.clear('target');
      msg.innerHTML = `Tonalité : <b>${Notes.keyName(q.fifths, q.minor)}</b>. Tu entends la tonique, puis ${q.midi.length} notes qui partent d'elle.<br>Rejoue la mélodie, note après note.`;
      Piano.mark([q.tonic], 'target');
      drawDots(); play();
    };
    const finish = () => {
      done = true; drawDots(); Piano.clear('target');
      const n = q.midi.length, p = clamp(firstOk / n - Math.max(0, listens - 2) * 0.1, 0, 1);
      Store.addXp(Math.round(2 + 4 * p));
      fb.className = 'fb ' + (p >= 0.85 ? 'ok' : ''); fb.textContent = `${firstOk} / ${n} notes trouvées du premier coup` + (listens > 2 ? ` · ${listens} écoutes` : '') + '. Voici la mélodie, écrite sur la portée :';
      const model = { clefs: ['G'], fifths: q.fifths, minor: q.minor, time: [n, 4], measures: [[q.ps.map(x => ({ d: 4, p: [x], l: Notes.name(x) }))]] };
      drawModel(sheet, model).then(v => { fig = v; }).catch(e => console.error(e));
      rec(bar, 'dictee', p, 1);
    };
    stage.append(bar, h('div', { class: 'card' }, msg, dots, fb, h('div', { class: 'paper fig', style: { margin: '10px 0' } }, sheet),
      h('div', { class: 'row center', style: center }, h('button', { class: 'btn primary', onclick: next }, 'Nouvelle dictée'), h('button', { class: 'btn', onclick: play }, 'Réécouter'),
        h('button', { class: 'btn ghost', onclick: () => { if (q && !done) { firstOk = Math.min(firstOk, pos); pos = q.midi.length; wrongHere = true; finish(); } } }, 'Voir la solution'))));
    idle();
    const off = Input.on(ev => {
      if (ev.type !== 'on' || !q || done) return;
      const want = q.midi[pos];
      if (mod(ev.midi, 12) === mod(want, 12)) {
        if (!wrongHere) firstOk++;
        pos++; wrongHere = false; tries = 0;
        fb.className = 'fb'; fb.textContent = '';
        if (pos >= q.midi.length) finish(); else drawDots();
      } else {
        wrongHere = true; tries++;
        fb.className = 'fb bad'; fb.textContent = tries >= 3 ? `C'était ${Notes.both(want)}.` : 'Ce n\'est pas cette note. Chante la mélodie dans ta tête et réessaie.';
        if (tries >= 3) Piano.mark([want], 'target');
      }
    });
    return () => { off(); clearTimeout(timer); clearSheet(); };
  };

  const GAMES = { note: noteGame, int: choiceGame('int'), chord: choiceGame('chord'), dictee };
  const run = () => {
    if (stop) stop();
    Piano.clear('target'); stage.innerHTML = '';
    stop = (GAMES[cfg.tab] || noteGame)();
    const bar = stage.querySelector('.skill');           // le suivi du jeu choisi, sous l'exercice
    if (bar && bar.track) stage.append(bar.track);
  };
  root.append(h('p', { class: 'lead' }, 'Lire, c\'est aussi entendre dans sa tête. Ces quatre exercices relient ce que tu entends au clavier et à la portée ; chacun a ses propres niveaux.'),
    h('div', { style: { marginBottom: '12px' } }, seg([['note', 'Retrouver la note'], ['int', 'Intervalles'], ['chord', 'Accords'], ['dictee', 'Dictée']], cfg.tab, v => { cfg.tab = v; Store.save(); run(); })),
    stage);
  run();
  return () => { if (stop) stop(); Piano.clear('target'); };
};

/* ---------- Gammes et accords */
Views.gammes = root => {
  const cfg = Store.d.scales || (Store.d.scales = { key: 0, mode: 'maj', kind: 'scale', hand: 'R' });
  const owned = Store.d.scaleStars || (Store.d.scaleStars = {});
  const MAJ = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1], MIN = [0, 1, 2, 3, 4, 5, -6, -5, -4, -3, -2, -1];
  const ctl = h('div', { class: 'card' }), info = h('p', { class: 'muted' }), host = h('div'), grid = h('div', { class: 'card' });
  const sk = (minor, f) => (minor ? 'min' : 'maj') + ':' + f;
  const count = k => { const s = owned[k] || {}; return (s.R ? 1 : 0) + (s.L ? 1 : 0) + (s.T ? 1 : 0); };
  /* Trois étoiles par gamme : main droite, main gauche, puis les deux mains au métronome. */
  const onDone = (r, st) => {
    if (cfg.kind !== 'scale') return;
    const k = sk(cfg.mode !== 'maj', cfg.key), s = owned[k] || (owned[k] = {}), before = count(k);
    if (r.mode === 'wait' && r.acc >= 0.93) { if (cfg.hand !== 'L') s.R = 1; if (cfg.hand !== 'R') s.L = 1; }
    if (r.mode === 'tempo' && cfg.hand === 'both' && r.acc >= 0.9 && st.bpm >= 72) { s.R = 1; s.L = 1; s.T = 1; }
    if (count(k) > before) { Store.save(); toast(count(k) === 3 ? 'Gamme maîtrisée : trois étoiles !' : 'Une étoile de plus pour cette gamme', 'ok'); drawGrid(); }
  };
  root.append(h('p', { class: 'lead' }, 'Les gammes et les accords sont l\'alphabet des morceaux : les connaître sous les doigts rend la lecture bien plus facile. Les petits chiffres sont les doigtés.'), ctl, info, host, grid);
  const P = Practice(host, { modes: ['wait', 'tempo', 'listen'], zoom: 1.15, fit: true, hands: false, onDone });
  function drawGrid() {
    const all = MAJ.map(f => sk(false, f)).concat(MIN.map(f => sk(true, f))), full = all.filter(k => count(k) === 3).length;
    const row = (keys, minor) => h('div', { class: 'scale-row' }, keys.map(f => {
      const n = count(sk(minor, f)), on = cfg.key === f && (cfg.mode !== 'maj') === minor;
      return h('button', { class: 'scale-chip' + (on ? ' on' : '') + (n === 3 ? ' full' : ''), title: Notes.keyName(f, minor), onclick: () => { cfg.key = f; if ((cfg.mode !== 'maj') !== minor) cfg.mode = minor ? 'harm' : 'maj'; cfg.kind = 'scale'; go(); } },
        Notes.name(Notes.tonic(f, minor)), h('span', { class: 'stars' }, '★'.repeat(n) + '☆'.repeat(3 - n)));
    }));
    grid.innerHTML = '';
    const fullOf = (keys, minor) => keys.filter(f => count(sk(minor, f)) === 3).length, total = sum(all.map(count)), todo = [];
    for (const f of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]) for (const minor of [false, true]) if ((minor ? MIN : MAJ).includes(f) && count(sk(minor, f)) < 3) todo.push([minor, f]);
    grid.append(h('div', null, h('h3', null, 'Suivi de tes gammes'),
      h('div', { class: 'tiles' }, tile(`${full} / 24`, 'Gammes maîtrisées', 'trois étoiles'), tile(`${fullOf(MAJ, false)} / 12`, 'Majeures'), tile(`${fullOf(MIN, true)} / 12`, 'Mineures'), tile(`${total} / 72`, 'Étoiles gagnées')),
      todo.length ? h('p', null, 'Prochaine gamme conseillée : ', h('button', { class: 'btn sm', onclick: () => { cfg.key = todo[0][1]; cfg.mode = todo[0][0] ? 'harm' : 'maj'; cfg.kind = 'scale'; go(); $('#main').scrollTop = 0; } }, Notes.keyName(todo[0][1], todo[0][0]) + ' →')) : h('p', null, 'Toutes les gammes sont maîtrisées.'),
      h('p', { class: 'muted small' }, 'Une étoile pour la main droite, une pour la main gauche (jouées sans fausse note), une pour les deux mains au métronome à ♩ = 72 ou plus.'),
      h('div', { class: 'small muted' }, 'Majeures'), row(MAJ, false), h('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Mineures'), row(MIN, true)));
  }
  function go() {
    const minor = cfg.mode !== 'maj', keys = minor ? MIN : MAJ;
    if (!keys.includes(cfg.key)) cfg.key = 0;
    Store.save();
    ctl.innerHTML = '';
    ctl.append(h('div', { class: 'row' },
      field('Tonalité', select(keys.map(f => [f, Notes.keyName(f, minor)]), cfg.key, v => { cfg.key = +v; go(); })),
      field('Mode', seg([['maj', 'Majeur'], ['nat', 'Mineur naturel'], ['harm', 'Mineur harmonique'], ['mel', 'Mineur mélodique']], cfg.mode, v => { cfg.mode = v; go(); })),
      field('Exercice', seg([['scale', 'Gamme'], ['inv', 'Accord et renversements'], ['arp', 'Arpège'], ['cad', 'Cadence I–IV–V–I']], cfg.kind, v => { cfg.kind = v; go(); })),
      field('Main', seg([['R', 'Droite'], ['L', 'Gauche'], ['both', 'Les deux']], cfg.hand, v => { cfg.hand = v; go(); }))));
    const model = cfg.kind === 'scale' ? Gen.scale(cfg.key, cfg.mode, cfg.hand) : Gen.chords(cfg.key, minor, cfg.kind, cfg.hand);
    info.textContent = `${Notes.keyName(cfg.key, minor)} : ${Notes.armure(cfg.key)}. ${minor ? 'Relative majeure' : 'Relative mineure'} : ${Notes.keyName(cfg.key, !minor)}.`;
    drawGrid();
    P.load(MX.build(model), { bpm: 72 }).catch(e => console.error(e));
  }
  go();
  return () => P.destroy();
};

/* ---------- Morceaux : bibliothèque et import */
Views.morceaux = async (root, id) => {
  if (id) return Views.piece(root, id);
  const best = pid => { const b = Store.d.best['piece:' + pid]; return b ? h('span', { class: 'stars', title: Math.round(b * 100) + ' %' }, stars(b)) : h('span', { class: 'muted small' }, 'Pas encore joué'); };
  /* Suivi du répertoire : morceaux maîtrisés (90 % ou plus, les deux mains) par niveau de difficulté. */
  const repertoire = () => {
    const b = p => Store.d.best['piece:' + p.id] || 0, okList = PIECES.filter(p => b(p) >= 0.9);
    return h('div', { class: 'card', style: { marginBottom: '14px' } }, h('h3', null, 'Suivi de ton répertoire'),
      h('div', { class: 'tiles' }, tile(`${okList.length} / ${PIECES.length}`, 'Morceaux maîtrisés', '90 % ou plus, les deux mains'), tile(String(PIECES.filter(p => b(p) > 0).length), 'Morceaux joués en entier'),
        tile(okList.length ? 'Niveau ' + Math.max(...okList.map(p => p.level)) : '—', 'Plus haut niveau maîtrisé')),
      h('div', { class: 'levels' }, [...new Set(PIECES.map(p => p.level))].sort().map(l => {
        const ps = PIECES.filter(p => p.level === l), ok = ps.filter(p => b(p) >= 0.9).length;
        return h('div', { class: 'level-row' }, h('span', { class: 'grow' }, h('b', null, 'Niveau ' + l), h('div', { class: 'muted small' }, ps.map(p => p.title).join(' · '))),
          h('span', { class: 'lv' }, `${ok} / ${ps.length}`), h('div', { class: 'bar' + (ok === ps.length ? ' ok' : '') }, h('i', { style: { width: (ok / ps.length * 100) + '%' } })));
      })));
  };
  const lib = h('div', { class: 'grid' }), libWrap = h('div', { hidden: true }, h('h2', { class: 'section-title' }, 'Mes partitions importées'), lib);
  const input = h('input', { type: 'file', accept: '.musicxml,.xml,.mxl,.mid,.midi', multiple: true, hidden: true, onchange: () => { addFiles(input.files); } });
  const drop = h('div', { class: 'drop' },
    h('p', null, h('strong', null, 'Dépose ici une partition MusicXML ou MIDI'), h('br'), h('span', { class: 'muted' }, 'Fichiers .musicxml, .mxl, .xml ou .mid — par exemple exportés depuis MuseScore')),
    h('button', { class: 'btn primary', onclick: () => input.click() }, 'Choisir un fichier…'), input);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });

  async function addFiles(files) {
    let lastRec = null, count = 0;
    for (const f of [...files]) {
      try { lastRec = await importFile(f); count++; } catch (e) { toast(`${f.name} : ${e.message}`, 'bad'); }
    }
    input.value = '';
    if (count === 1) location.hash = '#/morceaux/' + lastRec.id;
    else if (count > 1) { toast(count + ' partitions importées', 'ok'); drawLib(); }
  }
  async function drawLib() {
    let all = [];
    try { all = await Lib.all(); } catch (e) { console.error(e); }
    all.sort((a, b) => b.added - a.added);
    libWrap.hidden = !all.length; lib.innerHTML = '';
    for (const r of all) lib.append(h('a', { class: 'card piece', href: '#/morceaux/' + r.id },
      h('span', { class: 'tag' }, 'Import ' + (r.from || '')), h('strong', null, r.title), best(r.id),
      h('button', { class: 'btn sm ghost del', title: 'Supprimer cette partition', onclick: e => {
        e.preventDefault(); e.stopPropagation();
        modal('Supprimer cette partition ?', h('p', null, `« ${r.title} » sera retirée de ta bibliothèque.`), [{ label: 'Annuler' }, { label: 'Supprimer', cls: 'primary', fn: () => { Lib.del(r.id).then(drawLib); } }]);
      } }, '✕')));
  }

  root.append(h('p', { class: 'lead' }, 'Choisis un morceau : la partition avance quand tu joues la bonne note. Travaille une main à la fois, puis les deux, puis au métronome.'),
    repertoire(),
    h('div', { class: 'grid' }, PIECES.map(p => h('a', { class: 'card piece', href: '#/morceaux/' + p.id }, h('span', { class: 'tag' }, 'Niveau ' + p.level), h('strong', null, p.title), h('span', { class: 'muted small' }, p.composer), best(p.id)))),
    libWrap,
    h('h2', { class: 'section-title' }, 'Importer une partition'), drop,
    h('div', { class: 'card', style: { marginTop: '14px' } }, h('h3', null, 'Depuis MuseScore'),
      h('ol', { class: 'steps' },
        h('li', null, h('b', null, 'Dans le logiciel MuseScore Studio'), ' (gratuit) : ouvre la partition, puis Fichier → Exporter… et choisis le format ', h('b', null, 'MusicXML'), ' (.musicxml ou .mxl).'),
        h('li', null, h('b', null, 'Sur musescore.com'), ' : le bouton de téléchargement d\'une partition propose aussi les formats MusicXML et MIDI, selon la partition et ton compte.'),
        h('li', null, 'Dépose le fichier dans le cadre ci-dessus : la partition s\'ouvre et reste dans ta bibliothèque.')),
      h('p', { class: 'muted small' }, 'Le MusicXML est à préférer : il conserve la partition telle qu\'elle est écrite (mains, armure, doigtés). Avec un fichier MIDI, le site reconstitue une partition simplifiée. Il n\'existe pas de connexion directe à musescore.com, qui ne propose pas d\'accès public à son catalogue : l\'échange passe par ces fichiers.')));
  await drawLib();
};

/* Prépare un morceau (intégré ou importé) pour l'affichage : { title, sub, src, bpm }, ou null s'il n'existe plus. */
async function pieceSource(id) {
  const built = PIECES.find(p => p.id === id);
  if (built) return { title: built.title, sub: built.composer, src: MX.build(MX.piece(built)), bpm: built.tempo };
  const rec = await Lib.get(id).catch(() => null);
  if (!rec) return null;
  return {
    title: rec.title, bpm: rec.bpm,
    sub: 'Partition importée' + (rec.from === 'MIDI' ? ' depuis un fichier MIDI (notation simplifiée)' : ''),
    src: rec.kind === 'mxl' ? rec.data : new DOMParser().parseFromString(rec.data, 'application/xml'),
  };
}

Views.piece = async (root, id) => {
  const ps = await pieceSource(id);
  if (!ps) { root.append(h('p', null, 'Partition introuvable. ', h('a', { href: '#/morceaux' }, 'Retour aux morceaux'))); return; }
  const { title, sub, src, bpm } = ps;
  Store.d.lastPiece = id; Store.save();          // « morceau en cours » pour la séance du jour
  App.title(title);
  const bk = 'piece:' + id, bestEl = h('span');
  const drawBest = () => { const b = Store.d.best[bk]; bestEl.innerHTML = ''; if (b) bestEl.append(h('span', { class: 'muted small' }, 'Meilleur score : '), h('span', { class: 'stars' }, stars(b)), h('span', { class: 'muted small' }, ` ${Math.round(b * 100)} %`)); };
  drawBest();
  const host = h('div'), track = h('div');
  const logs = Store.d.pieceLog || (Store.d.pieceLog = {}), counts = Store.d.pieceCount || (Store.d.pieceCount = {});
  const HAND = { R: 'main droite', L: 'main gauche', both: 'deux mains' };
  /* Suivi du morceau : chaque passage complet est noté (précision, mode, mains, jour). */
  const drawTrack = () => {
    const L = logs[id] || [], b = Store.d.best[bk];
    const card = h('div', { class: 'card track', style: { marginTop: '14px' } }, h('h3', null, 'Suivi de ce morceau'),
      h('div', { class: 'tiles' }, tile(b ? Math.round(b * 100) + ' %' : '—', 'Meilleur score', 'les deux mains'), tile(String(counts[id] || 0), 'Passages complets'), tile(L.length ? dayShort(L[L.length - 1].d) : '—', 'Dernier passage')));
    if (!L.length) card.append(h('p', { class: 'muted' }, 'Joue le morceau (ou un passage) en entier : chaque essai sera ajouté ici.'));
    else {
      const box = h('div');
      Chart.columns(box, {
        max: 100, slots: 12, aria: 'Précision de tes derniers passages, du plus ancien au plus récent',
        ticks: [{ v: 0, label: '0 %' }, { v: 50, label: '50 %' }, { v: 90, label: '90 %', dash: true }, { v: 100, label: '100 %' }],
        vals: L.map(x => ({ v: x.a, tip: [x.a + ' %', (x.mo === 'tempo' ? 'au métronome' : 'à mon rythme') + ' · ' + (HAND[x.h] || 'deux mains'), dayLong(x.d)] })),
      });
      card.append(h('figure', null, h('figcaption', null, h('b', null, `Tes ${L.length > 1 ? L.length + ' derniers passages' : 'passages'}`), ' — au-dessus du trait pointillé (90 %), le morceau est considéré comme maîtrisé'), box),
        Chart.table('Voir les chiffres', ['Jour', 'Précision', 'Mode', 'Mains'], L.slice().reverse().map(x => [dayLong(x.d), x.a + ' %', x.mo === 'tempo' ? 'Au métronome' : 'À mon rythme', HAND[x.h] || 'deux mains'])));
    }
    track.innerHTML = ''; track.append(card);
  };
  root.append(h('div', { class: 'spread' }, h('div', null, h('a', { href: '#/morceaux', class: 'small' }, '← Tous les morceaux'), h('div', { class: 'muted' }, sub)), bestEl), host, track);
  const P = Practice(host, { range: true, zoom: 1, onDone: (r, ps) => {
    const two = P.view.staffCount === 2;
    if (!two || ps.hand === 'both') { Store.best(bk, r.acc); drawBest(); }
    const L = logs[id] || (logs[id] = []);
    L.push({ a: Math.round(r.acc * 100), mo: r.mode, h: two ? ps.hand : 'both', d: Store.dayKey() });
    if (L.length > 12) L.shift();
    counts[id] = (counts[id] || 0) + 1;
    Store.save(); drawTrack();
  } });
  drawTrack();
  try { await P.load(src, { bpm }); }
  catch (e) { console.error(e); host.prepend(h('div', { class: 'banner' }, 'Impossible d\'afficher cette partition : ' + (e && e.message ? e.message : e))); }
  return () => P.destroy();
};

/* ---------- Progrès */
Views.progres = root => {
  const d = Store.d, done = LESSONS.filter(lessonDone).length, streak = Store.streak();
  const totalSec = sum(Object.values(d.days).map(x => x.sec || 0));
  const big = s => { const hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60); return hh ? `${hh} h ${String(mm).padStart(2, '0')}` : `${mm} min`; };
  root.append(h('div', { class: 'tiles' },
    tile(streak, 'Série en cours', streak > 1 ? 'jours d\'affilée' : 'jour'), tile(big(totalSec), 'Temps de pratique', 'au total'),
    tile(d.xp, 'Points', 'gagnés en jouant'), tile(`${done} / ${LESSONS.length}`, 'Leçons terminées')), levelCard());

  const days = [];
  for (let i = 13; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); days.push({ dt, min: Math.round(((d.days[Store.dayKey(dt)] || {}).sec || 0) / 60) }); }
  const max = Math.max(Store.s.goalMin, ...days.map(x => x.min));
  root.append(h('div', { class: 'card' }, h('h3', null, 'Minutes jouées, 14 derniers jours'),
    h('div', { class: 'chart' }, days.map((x, i) => h('div', { class: 'col' + (i === 13 ? ' today' : ''), title: `${x.dt.toLocaleDateString('fr-FR')} : ${x.min} min` }, x.min ? String(x.min) : '', h('i', { style: { height: Math.round(x.min / max * 88) + 'px' } }), 'DLMMJVS'[x.dt.getDay()])))));

  const seen = Object.entries(d.notes).filter(([k]) => k.includes(':')).map(([k, v]) => ({ k, n: v.ok + v.ko, acc: v.ok / (v.ok + v.ko), avg: v.ok ? v.ms / v.ok / 1000 : null })).filter(r => r.n >= 3);
  const rows = seen.filter(r => r.acc < 0.9 || (r.avg || 0) > 1.5);
  rows.sort((a, b) => a.acc - b.acc || (b.avg || 0) - (a.avg || 0));
  const card = h('div', { class: 'card' }, h('h3', null, 'Lecture de notes : celles à travailler'));
  if (!seen.length) card.append(h('p', { class: 'muted' }, 'Fais une séance de ', h('a', { href: '#/notes' }, 'lecture de notes'), ' pour voir apparaître tes statistiques.'));
  else if (!rows.length) card.append(h('p', { class: 'muted' }, `Aucune des ${seen.length} notes que tu as travaillées ne te pose de difficulté : plus de 90 % de réussite et moins de 1,5 s par note. Élargis l'étendue ou change de clé.`));
  else card.append(h('table', { class: 'data' }, h('tr', null, h('th', null, 'Note'), h('th', null, 'Clé'), h('th', null, 'Réussite'), h('th', null, 'Temps moyen'), h('th', null, 'Essais')),
    rows.slice(0, 10).map(r => { const [c, s] = r.k.split(':'); return h('tr', null, h('td', null, h('b', null, Notes.name(Notes.parse(s), true))), h('td', null, c === 'G' ? 'Sol' : 'Fa'), h('td', null, Math.round(r.acc * 100) + ' %'), h('td', null, r.avg ? r.avg.toFixed(1) + ' s' : '—'), h('td', null, r.n)); })));
  root.append(card);

  const played = PIECES.filter(p => d.best['piece:' + p.id]);
  if (played.length) root.append(h('div', { class: 'card' }, h('h3', null, 'Morceaux joués'),
    h('table', { class: 'data' }, played.map(p => h('tr', null, h('td', null, h('a', { href: '#/morceaux/' + p.id }, p.title)), h('td', { class: 'stars' }, stars(d.best['piece:' + p.id])), h('td', null, Math.round(d.best['piece:' + p.id] * 100) + ' %'))))));
};

/* ---------- Réglages */
Views.reglages = root => {
  const s = Store.s;
  const row = (title, desc, ctl) => h('div', { class: 'set-row' }, h('div', { style: { flex: '1 1 300px' } }, h('strong', null, title), h('div', { class: 'd' }, desc)), ctl);
  const reset = () => modal('Effacer ma progression ?', h('p', null, 'Leçons validées, points, statistiques et réglages seront remis à zéro. Tes partitions importées sont conservées.'),
    [{ label: 'Annuler' }, { label: 'Tout effacer', cls: 'primary', fn: () => { Store.save = () => {}; try { localStorage.removeItem(Store.KEY); } catch (e) { /* rien */ } location.hash = '#/'; location.reload(); } }]);
  root.append(
    h('div', { class: 'card' }, h('h3', null, 'Piano MIDI'), midiPanel(),
      row('Faire entendre mes notes par le site', 'À activer si ton clavier ne produit aucun son tout seul. À désactiver si ton piano a ses propres haut-parleurs, pour ne pas entendre chaque note en double.',
        seg([[true, 'Activé'], [false, 'Désactivé']], s.echoMidi, v => Store.set('echoMidi', v)))),
    h('div', { class: 'card' }, h('h3', null, 'Affichage'),
      row('Nom des notes', 'Do Ré Mi (solfège français, où le Do central est Do3) ou C D E (notation internationale, Do central = C4).', seg([['fr', 'Do Ré Mi'], ['en', 'C D E']], s.naming, v => { Store.set('naming', v); Piano.build(); })),
      row('Noms sur le clavier à l\'écran', 'Pratique au début ; à retirer dès que tu te repères.', seg([['none', 'Aucun'], ['do', 'Les Do'], ['all', 'Toutes les touches']], s.keyLabels, v => { Store.set('keyLabels', v); Piano.build(); App.drawDock(); })),
      row('Thème', 'Les partitions restent toujours sur fond clair.', seg([['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']], s.theme, v => { Store.set('theme', v); App.theme(); }))),
    h('div', { class: 'card' }, h('h3', null, 'Pratique'),
      row('Objectif quotidien', 'Mieux vaut dix minutes chaque jour qu\'une heure le dimanche.', seg([[5, '5 min'], [10, '10 min'], [20, '20 min'], [30, '30 min']], s.goalMin, v => Store.set('goalMin', v)))),
    h('div', { class: 'card' }, h('h3', null, 'Données'),
      row('Tout reste sur cet ordinateur', 'Progression, réglages et partitions importées sont enregistrés dans ce navigateur, sans compte ni envoi en ligne.', h('button', { class: 'btn', onclick: reset }, 'Effacer ma progression'))));
};
