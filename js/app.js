'use strict';
/* Assemblage : navigation, barre du haut, clavier du bas, bienvenue. */

const App = {
  cleanup: null, token: 0,
  ROUTES: {
    '': ['home', 'Accueil'], seance: ['seance', 'Séance du jour'], cours: ['cours', 'Cours de solfège'], notes: ['notes', 'Lecture de notes'], dechiffrage: ['dechiffrage', 'Déchiffrage'],
    rythme: ['rythme', 'Rythme'], oreille: ['oreille', 'Oreille'], gammes: ['gammes', 'Gammes et accords'], morceaux: ['morceaux', 'Morceaux'],
    progres: ['progres', 'Progrès'], reglages: ['reglages', 'Réglages'],
  },

  init() {
    Store.init();
    this.theme();
    this.drawNav(); this.drawTop(); this.drawDock(); this.drawFoot();
    Piano.mount($('#piano'));
    Input.on(ev => {
      if (ev.type === 'on') {
        if (ev.src !== 'midi' || Store.s.echoMidi) Sound.noteOn(ev.midi, ev.vel);
        this.blink();
      } else Sound.noteOff(ev.midi);
    });
    PcKeys.init();
    Midi.onChange(() => this.drawTop());
    Midi.auto();
    addEventListener('pointerdown', () => Sound.ensure(), { capture: true });
    addEventListener('hashchange', () => this.route());
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.theme());
    /* Temps de pratique : on compte tant que des notes sont jouées. */
    setInterval(() => {
      if (!document.hidden && Input.last && performance.now() - Input.last < 20000) { Store.addTime(5); this.drawFoot(); }
    }, 5000);
    this.route();
    if (!Store.s.welcomed) this.welcome();
  },

  theme() {
    const t = Store.s.theme, dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  },
  title(t) { $('#page-title').textContent = t; document.title = t + ' — À ta portée'; },

  route() {
    const [path, arg] = location.hash.replace(/^#\/?/, '').split('/');
    const known = path in this.ROUTES, r = this.ROUTES[known ? path : ''], my = ++this.token;
    if (this.cleanup) { try { this.cleanup(); } catch (e) { console.error(e); } this.cleanup = null; }
    Piano.clear('target'); Piano.clear('play');
    const main = $('#main'), page = h('div', { class: 'page' });
    main.innerHTML = ''; main.append(page); main.scrollTop = 0;
    this.title(r[1]);
    $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.path === (known ? path : '')));
    const fail = e => { console.error(e); if (my === this.token) page.append(h('div', { class: 'banner' }, 'Une erreur est survenue : ' + (e && e.message ? e.message : e))); };
    let out;
    try { out = Views[r[0]](page, arg ? decodeURIComponent(arg) : undefined); } catch (e) { fail(e); }
    Promise.resolve(out).then(c => {
      if (typeof c !== 'function') return;
      if (my === this.token) this.cleanup = c; else c();
    }).catch(fail);
  },

  drawNav() {
    const nav = $('#nav');
    nav.innerHTML = '';
    for (const s of SECTIONS) {
      if (s.sep != null) nav.append(h('div', { class: 'sep' }, s.sep));
      else nav.append(h('a', { href: '#/' + s.path, 'data-path': s.path }, h('span', { class: 'ico' }, s.ico), s.name));
    }
  },
  drawFoot() {
    const st = Store.streak(), g = Skill.global();
    const el = $('#side-foot');
    el.innerHTML = '';
    el.append(h('div', null, 'Série : ', h('b', null, plural(st, 'jour'))), h('div', null, 'Niveau : ', h('b', null, g.label)), h('div', null, h('b', null, Store.d.xp), ' points'));
  },
  drawTop() {
    const t = $('#top-tools');
    t.innerHTML = '';
    const warn = Midi.status === 'denied' || Midi.status === 'unsupported';
    t.append(
      h('button', { class: 'chip ' + (Midi.connected ? 'on' : warn ? 'warn' : ''), id: 'midi-chip', title: 'Piano MIDI', onclick: () => modal('Piano MIDI', midiPanel(), [{ label: 'Fermer' }]) },
        h('span', { class: 'dot' }), Midi.connected ? Midi.label() : Midi.status === 'idle' ? 'Connecter mon piano' : Midi.label()),
      h('label', { class: 'vol', title: 'Volume des sons du site' }, 'Volume',
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: Store.s.volume, oninput: e => Sound.setVolume(+e.target.value), onchange: e => e.target.blur() })),
      h('button', { class: 'icon-btn', title: 'Thème clair ou sombre', onclick: () => { Store.set('theme', document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); this.theme(); } }, '◐'));
  },
  blink() {
    const c = $('#midi-chip');
    if (!c) return;
    c.classList.add('blink');
    clearTimeout(this._blink);
    this._blink = setTimeout(() => c.classList.remove('blink'), 110);
  },
  drawDock() {
    const bar = $('#dock-bar'), open = Store.s.dock, k = c => h('kbd', null, PcKeys.label(c));
    $('#dock').classList.toggle('closed', !open);
    bar.innerHTML = '';
    bar.append(
      h('span', null, open ? ['Sans piano : clique sur les touches, ou joue au clavier d\'ordinateur — ', k('KeyA'), ' ', k('KeyS'), ' ', k('KeyD'), ' ', k('KeyF'), ' ', k('KeyG'), ' ', k('KeyH'), ' ', k('KeyJ'), ' pour Do à Si, la rangée du dessus pour les touches noires, ', k('KeyZ'), ' et ', k('KeyX'), ' pour changer d\'octave' + (PcKeys.octave ? ` (${PcKeys.octave > 0 ? '+' : ''}${PcKeys.octave})` : '') + '.'] : 'Clavier masqué'),
      h('span', { class: 'tools' },
        open && seg([['none', 'Sans noms'], ['do', 'Do'], ['all', 'Toutes']], Store.s.keyLabels, v => { Store.set('keyLabels', v); Piano.build(); }),
        h('button', { class: 'btn sm ghost', style: { color: '#c9cfdb', borderColor: '#394258' }, onclick: () => { Store.set('dock', !open); this.drawDock(); dispatchEvent(new Event('resize')); } }, open ? 'Masquer le clavier' : 'Afficher le clavier')));
  },

  welcome() {
    const body = h('div', { class: 'stack' },
      h('p', null, 'Ce site t\'apprend à lire la musique en jouant : il écoute ton piano et te répond en direct.'),
      midiPanel(),
      h('div', null,
        h('p', null, h('b', null, 'Ton piano produit-il déjà du son tout seul ?')),
        seg([[false, 'Oui, il a ses haut-parleurs'], [true, 'Non, c\'est un clavier muet']], Store.s.echoMidi, v => Store.set('echoMidi', v)),
        h('p', { class: 'muted small' }, 'Dans le second cas, le site jouera lui-même le son de tes notes. Tu pourras changer d\'avis dans les réglages.')),
      h('p', { class: 'muted small' }, 'Pas de piano sous la main ? Tout fonctionne aussi avec le clavier à l\'écran et les touches de l\'ordinateur.'));
    modal('Bienvenue !', body, [{ label: 'C\'est parti', cls: 'primary', fn: () => { Store.set('welcomed', true); } }]);
  },
};

App.init();
