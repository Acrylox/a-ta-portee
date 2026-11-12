'use strict';
/* Séance du jour : une séance guidée qui enchaîne lecture de notes, rythme, déchiffrage et morceau.
   Chaque étape se joue au niveau mesuré par le moteur (skill.js), et chaque résultat le fait évoluer. */

const Daily = {
  state() {
    const d = Store.d.daily || (Store.d.daily = {});
    if (!d.done) d.done = {};
    return d;
  },
  doneToday() { return !!this.state().done[Store.dayKey()]; },
  /* Dosage des étapes selon l'objectif quotidien (en minutes). */
  plan(goal) {
    return {
      notes: goal <= 5 ? 90 : goal <= 10 ? 150 : goal <= 20 ? 240 : 300,
      rhythms: goal <= 5 ? 1 : goal <= 10 ? 2 : 3,
      sights: goal <= 5 ? 2 : goal <= 10 ? 3 : goal <= 20 ? 4 : 5,
    };
  },
  /* Le morceau en cours : le dernier ouvert, sinon le premier morceau intégré pas encore maîtrisé. */
  pieceId(imported) {
    const last = Store.d.lastPiece;
    if (last && (PIECES.some(p => p.id === last) || imported.some(r => r.id === last))) return last;
    return (PIECES.find(p => (Store.d.best['piece:' + p.id] || 0) < 0.9) || PIECES[0]).id;
  },
};

Views.seance = async root => {
  const st = Daily.state(), IDS = ['notes', 'rhythm', 'sight'];
  let imported = [];
  try { imported = await Lib.all(); } catch (e) { /* bibliothèque indisponible : on fait sans */ }
  let pieceId = Daily.pieceId(imported), piece = await pieceSource(pieceId);
  if (!piece) { pieceId = PIECES[0].id; piece = await pieceSource(pieceId); }

  const head = h('div'), stage = h('div');
  root.append(head, stage);
  const NAMES = ['Lecture de notes', 'Rythme', 'Déchiffrage', 'Morceau'], results = [];
  let plan = Daily.plan(Store.s.goalMin), cur = null, idx = -1, t0 = 0, adjustOpen = false, before = {};
  const title = (t, sub) => h('div', null, h('p', { class: 'kicker' }, `Étape ${idx + 1} sur ${NAMES.length}`), h('h2', { class: 'step-title' }, t), h('p', { class: 'muted' }, sub));

  function drawHead() {
    head.innerHTML = '';
    if (idx < 0) return;
    head.append(h('div', { class: 'stepper' },
      NAMES.map((n, i) => h('span', { class: 'step' + (i < idx ? ' done' : i === idx ? ' cur' : '') }, h('i', null, i < idx ? '✓' : i + 1), n)),
      idx < NAMES.length && h('button', { class: 'btn sm push', onclick: skip }, idx === NAMES.length - 1 ? 'Terminer la séance' : 'Passer à l\'étape suivante →')));
  }
  function go(i) {
    if (cur) { cur.stop(); cur = null; }
    idx = i; stage.innerHTML = ''; $('#main').scrollTop = 0;
    drawHead();
    if (i >= NAMES.length) finish(); else cur = [runNotes, () => runSeries('rhythm'), () => runSeries('sight'), runPiece][i]();
  }
  /* Une étape se termine en appelant done({ text, acc? }). */
  function done(res) { results[idx] = res; go(idx + 1); }
  function skip() { if (cur && cur.end) cur.end(); else done({ text: 'étape passée' }); }

  /* ----- Étape 1 : lecture de notes chronométrée, au palier du moment */
  function runNotes() {
    const bar = skillBar('notes', { compact: true }), box = h('div');
    stage.append(title('Lecture de notes', `${fmtDur(plan.notes)}. Joue la note sous le curseur : la justesse d'abord, la vitesse ensuite. Le palier change tout seul quand tu es à l'aise.`), bar, box);
    return noteDrill(box, {
      spec: () => NOTE_STAGES[Skill.level('notes')], dur: plan.notes, hints: false, noButton: true,
      onSeries: (ser, sp) => { if (ser.n >= 6) bar.report(Skill.record('notes', Skill.q.notes(sp, ser), 0.6)); },
    }, S => {
      const acc = S.n ? S.clean / S.n : null, avg = S.clean ? S.ms / S.clean / 1000 : 0;
      done({ acc, text: S.n ? `${plural(S.n, 'note lue', 'notes lues')}, ${Math.round(acc * 100)} % justes du premier coup` + (avg ? `, ${avg.toFixed(1)} s par note` : '') : 'étape passée' });
    });
  }

  /* ----- Étapes 2 et 3 : quelques rythmes à taper, puis quelques mélodies à déchiffrer. Seul le premier essai compte. */
  function runSeries(kind) {
    const isR = kind === 'rhythm', total = isR ? plan.rhythms : plan.sights, accs = [];
    const bar = skillBar(kind, { compact: true }), info = h('div', { class: 'plive' }), host = h('div');
    let k = 0, model = null, lvl = 0, counted = false;
    stage.append(title(isR ? 'Rythme' : 'Déchiffrage', isR
      ? 'Clique sur Démarrer, écoute la mesure de décompte, puis tape le rythme sur une touche du piano ou sur la barre d\'espace.'
      : 'Repère d\'abord la clé, l\'armure, le chiffrage et la première note, puis joue sans t\'arrêter.'), bar, info, host);
    const end = () => {
      const got = accs.filter(a => a != null), acc = got.length ? sum(got) / got.length : null;
      done({ acc, text: got.length ? `${plural(got.length, isR ? 'rythme' : 'mélodie')}, ${Math.round(acc * 100)} % en moyenne` : 'étape passée' });
    };
    const next = () => { k++; if (k >= total) end(); else load(); };
    const P = Practice(host, Object.assign({
      onDone: (r, ps) => {
        if (isR && r.mode !== 'tempo') return;
        if (counted) return bar.note('Seul le premier essai compte pour ton niveau.');
        if (!isR && P.view.staffCount === 2 && ps.hand !== 'both') return bar.note('Joue les deux mains pour que le résultat compte dans ton niveau.');
        counted = true; accs[k] = r.acc;
        const ratio = ps.bpm / model.tempo;
        const res = isR ? Skill.record('rhythm', Skill.q.rhythm(r, ratio, lvl), 1)
          : r.mode === 'tempo' ? Skill.record('sight', Skill.q.tempo(r, ratio), 1)
            : Skill.record('sight', Skill.q.sightWait(r, model), 1, Gen.LEVELS[lvl].tempo ? { cap: 60 } : {});
        bar.report(res, res.capped ? 'pour aller plus loin à ce niveau, joue au métronome' : '');
      },
      actions: () => [{ label: k + 1 >= total ? 'Étape suivante →' : isR ? 'Rythme suivant →' : 'Mélodie suivante →', fn: next }],
    }, isR ? { modes: ['tempo', 'listen'], anyPitch: true, tap: true, hands: false, zoom: 1.3, fit: true } : { modes: ['wait', 'tempo', 'listen'], zoom: 1.15 }));
    function load() {
      lvl = Skill.level(kind); counted = false;
      model = isR ? Gen.rhythm(lvl + 1, 4) : Gen.melody(lvl + 1, { bars: 4 });
      info.innerHTML = `<b>${isR ? 'Rythme' : 'Mélodie'} ${k + 1}</b> / ${total} · ${isR ? '' : Notes.keyName(model.fifths, model.minor) + ' · '}mesure à ${model.time.join('/')}`;
      P.load(MX.build(model), { bpm: model.tempo }).catch(e => console.error(e));
    }
    load();
    return { stop: () => P.destroy(), end };
  }

  /* ----- Étape 4 : le morceau en cours, sans limite de temps */
  function runPiece() {
    const host = h('div'), bk = 'piece:' + pieceId;
    let best = null;
    stage.append(title('Morceau : ' + piece.title, 'Travaille-le à ta façon : une main à la fois, quelques mesures en boucle, puis les deux mains. Quand tu as fini, termine la séance.'), host);
    const end = () => done({ acc: best, text: best == null ? 'morceau ouvert, sans passage complet' : `meilleur passage : ${Math.round(best * 100)} %` });
    const P = Practice(host, {
      range: true, zoom: 1, actions: [{ label: 'Terminer la séance ✓', fn: end }],
      onDone: r => { best = Math.max(best || 0, r.acc); if (P.state.hand === 'both' || P.view.staffCount !== 2) Store.best(bk, r.acc); },
    });
    P.load(piece.src, { bpm: piece.bpm }).catch(e => { console.error(e); host.prepend(h('div', { class: 'banner' }, 'Impossible d\'afficher ce morceau. Choisis-en un autre dans « Ajuster la séance ».')); });
    return { stop: () => P.destroy(), end };
  }

  /* ----- Bilan : ce que la séance a changé à ton niveau */
  function finish() {
    const changes = IDS.map(id => {
      const a = before[id], b = Skill.get(id), pct = x => Math.round(clamp(x, 0, 100));
      if (!a || (a.lvl === b.lvl && pct(a.m) === pct(b.m))) return null;
      const txt = b.lvl > a.lvl ? `niveau ${a.lvl + 1} → ${b.lvl + 1} : ${Skill.label(id, b.lvl)}`
        : b.lvl < a.lvl ? `retour au niveau ${b.lvl + 1} pour consolider : ${Skill.label(id, b.lvl)}`
          : `niveau ${b.lvl + 1}, maîtrise ${pct(a.m)} % → ${pct(b.m)} %`;
      return h('li', null, h('b', null, SKILLS[id].name + ' : '), txt);
    }).filter(Boolean);
    /* La séance ne compte que si au moins deux étapes ont réellement été jouées. */
    const counted = results.filter(r => r && r.acc != null).length >= 2;
    if (counted) {
      const first = !st.done[Store.dayKey()];
      st.done[Store.dayKey()] = true;
      Store.addXp(first ? 20 : 5);
    }
    Store.save();
    const min = Math.max(1, Math.round((performance.now() - t0) / 60000)), nextL = LESSONS.find(l => !lessonDone(l));
    stage.append(h('div', { class: 'card' }, h('p', { class: 'kicker' }, 'Séance du jour'), h('h2', { class: 'step-title' }, counted ? 'Séance terminée, bravo !' : 'Séance écourtée'),
      h('p', { class: 'muted' }, counted ? `${min} min de pratique · série en cours : ${plural(Store.streak(), 'jour')}.` : 'Elle ne compte pas comme séance du jour : il faut jouer au moins deux étapes.'),
      h('table', { class: 'data' }, NAMES.map((n, i) => h('tr', null, h('td', null, h('b', null, n)), h('td', null, results[i] ? results[i].text : '—'), h('td', { class: 'stars' }, results[i] && results[i].acc != null ? stars(results[i].acc) : '')))),
      changes.length ? h('div', null, h('h3', { style: { marginTop: '16px' } }, 'Ce que la séance a changé'), h('ul', null, changes)) : h('p', { class: 'muted', style: { marginTop: '12px' } }, 'Tes niveaux n\'ont pas bougé pendant cette séance.'),
      h('div', { class: 'row', style: { marginTop: '16px' } },
        nextL && h('a', { class: 'btn primary', href: '#/cours/' + nextL.id }, 'Continuer le cours : ' + nextL.title + ' →'),
        h('a', { class: 'btn' + (nextL ? '' : ' primary'), href: '#/' }, 'Retour à l\'accueil'),
        h('button', { class: 'btn ghost', onclick: intro }, 'Refaire une séance'))));
  }

  /* ----- Écran de départ : le programme du jour, et de quoi l'ajuster */
  function intro() {
    if (cur) { cur.stop(); cur = null; }
    idx = -1; results.length = 0;
    drawHead();
    plan = Daily.plan(Store.s.goalMin);
    const goal = Store.s.goalMin, l3 = LESSONS.find(l => l.id === 'cle-de-sol');
    const pieces = PIECES.map(p => [p.id, p.title]).concat(imported.map(r => [r.id, r.title + ' (importée)']));
    const lv = id => `Niveau ${Skill.level(id) + 1} / ${SKILLS[id].levels.length} : ${Skill.label(id)}`;
    /* Suivi des séances : total, jours de suite, et les 14 derniers jours. */
    const dayOf = i => { const dt = new Date(); dt.setDate(dt.getDate() - i); const k = Store.dayKey(dt); return { dt, k, on: !!st.done[k] }; };
    const last14 = [];
    for (let i = 13; i >= 0; i--) last14.push(dayOf(i));
    let streak = 0;
    for (let i = st.done[Store.dayKey()] ? 0 : 1; dayOf(i).on; i++) streak++;
    const follow = h('div', { class: 'card', style: { marginTop: '14px' } }, h('h3', null, 'Suivi de tes séances'),
      h('div', { class: 'tiles' }, tile(String(Object.keys(st.done).length), 'Séances faites'), tile(String(streak), 'Jours de suite', 'avec une séance'), tile(`${last14.slice(7).filter(x => x.on).length} / 7`, 'Ces 7 derniers jours')),
      h('div', { class: 'daystrip' }, last14.map(x => h('div', { class: 'day' + (x.on ? ' on' : ''), title: dayLong(x.k) + (x.on ? ' : séance faite' : ' : pas de séance') }, h('i', null, x.on ? '✓' : ''), h('span', null, 'DLMMJVS'[x.dt.getDay()])))),
      h('p', { class: 'muted small', style: { margin: '10px 0 0' } }, 'Le niveau de chaque étape est suivi dans son propre module : lecture de notes, rythme, déchiffrage et morceaux.'));
    const sel = id => field(SKILLS[id].name, select(SKILLS[id].levels.map((l, i) => [i, `${i + 1} — ${l.label || l.name}`]), Skill.level(id), v => { Skill.set(id, +v); intro(); }));
    stage.innerHTML = '';
    stage.append(h('div', null,
      h('p', { class: 'lead' }, `Une séance guidée d'environ ${goal} minutes. Tu n'as rien à choisir : les étapes s'enchaînent à ton niveau, et chaque résultat fait avancer ou reculer ta jauge de maîtrise.`),
      !lessonDone(l3) && h('div', { class: 'banner' }, `Tu n'as pas encore terminé la leçon « ${l3.title} ». La séance suppose que tu sais repérer les notes sur la portée : `, h('a', { href: '#/cours' }, 'commence par le cours'), ' si ce n\'est pas encore le cas.'),
      Daily.doneToday() && h('p', null, h('span', { class: 'tag ok' }, 'Séance du jour déjà faite'), ' Tu peux en refaire une : c\'est tout bénéfice.'),
      h('div', { class: 'card' }, h('h3', null, 'Au programme'),
        h('ol', { class: 'plan' },
          h('li', null, h('b', null, 'Lecture de notes'), ` · ${fmtDur(plan.notes)}`, h('div', { class: 'muted small' }, lv('notes'))),
          h('li', null, h('b', null, 'Rythme'), ` · ${plural(plan.rhythms, 'rythme')} à taper`, h('div', { class: 'muted small' }, lv('rhythm'))),
          h('li', null, h('b', null, 'Déchiffrage'), ` · ${plural(plan.sights, 'mélodie')} à lire à vue`, h('div', { class: 'muted small' }, lv('sight'))),
          h('li', null, h('b', null, 'Morceau'), ' · le temps que tu veux', h('div', { class: 'muted small' }, piece.title))),
        h('button', { class: 'btn primary', onclick: () => {
          t0 = performance.now(); Sound.ensure();
          before = {}; IDS.forEach(id => { const s = Skill.get(id); before[id] = { lvl: s.lvl, m: s.m }; });
          go(0);
        } }, '▶ Commencer la séance'),
        h('details', { class: 'adjust', open: adjustOpen, ontoggle: e => { adjustOpen = e.currentTarget.open; } }, h('summary', null, 'Ajuster la séance'),
          h('div', { class: 'row' },
            field('Durée', seg([[5, '5 min'], [10, '10 min'], [20, '20 min'], [30, '30 min']], goal, v => { Store.set('goalMin', v); intro(); })),
            field('Morceau', select(pieces, pieceId, async v => {
              const ps = await pieceSource(v);
              if (ps) { pieceId = v; piece = ps; Store.d.lastPiece = v; Store.save(); }
              intro();
            }))),
          h('p', { class: 'muted small', style: { margin: '12px 0 0' } }, 'Les niveaux se règlent tout seuls. Si l\'un d\'eux te paraît vraiment décalé, tu peux te placer ailleurs : ta jauge repart alors de zéro.'),
          h('div', { class: 'row' }, IDS.map(sel)))),
      follow));
  }

  intro();
  return () => { if (cur) cur.stop(); };
};
