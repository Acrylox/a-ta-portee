'use strict';
/* Comptes et sauvegarde en ligne, avec Firebase (connexion Google ou e-mail, base Firestore).
   Sans compte, rien ne change : la progression reste dans le navigateur.
   Connecté, toute la progression (Store.d) est copiée dans la fiche users/{uid}, sauf les réglages propres à l'appareil.
   Les partitions importées restent sur l'appareil. La bibliothèque Firebase n'est chargée que si l'on se connecte. */

const Cloud = {
  VER: '11.10.0',
  DEVICE: ['volume', 'echoMidi', 'dock', 'welcomed'],   // réglages propres à cet appareil, jamais synchronisés
  status: 'off',            // off (non configuré) · idle · loading · syncing · in · out · error
  user: null, err: '', busy: false, stale: false, last: 0,
  ok: false,                // la comparaison avec le compte a eu lieu : on peut envoyer
  subs: new Set(), timer: 0, ready: null, again: false, quiet: false,

  get enabled() { return typeof FIREBASE_CONFIG !== 'undefined' && !!FIREBASE_CONFIG; },
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { for (const fn of [...this.subs]) { try { fn(this); } catch (e) { console.error(e); } } },
  meta() { return Store.d.sync || (Store.d.sync = {}); },

  init() {
    if (!this.enabled) return;
    this.status = 'idle';
    if (this.meta().active) this.load().catch(e => this.fail(e));   // reprend la session précédente
    addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
    addEventListener('pagehide', () => this.flush());
    addEventListener('online', () => { if (this.status === 'error' && this.user) this.retry(); });
  },

  script(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = () => rej(Object.assign(new Error('Impossible de charger le service de connexion. Vérifie ta connexion internet.'), { code: 'load' }));
      document.head.append(s);
    });
  },
  load() {
    if (this.ready) return this.ready;
    this.status = 'loading'; this.emit();
    this.ready = (async () => {
      const base = `https://www.gstatic.com/firebasejs/${this.VER}/firebase-`;
      await this.script(base + 'app-compat.js');
      await Promise.all([this.script(base + 'auth-compat.js'), this.script(base + 'firestore-compat.js')]);
      firebase.initializeApp(FIREBASE_CONFIG);
      this.auth = firebase.auth();
      this.auth.languageCode = 'fr';
      this.db = firebase.firestore();
      await new Promise(res => {
        let first = true;
        this.auth.onAuthStateChanged(u => { this.onUser(u); if (first) { first = false; res(); } });
      });
    })();
    this.ready.catch(() => { this.ready = null; });
    return this.ready;
  },

  /* ----- Connexion */
  async google() {
    await this.load();
    const p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    await this.auth.signInWithPopup(p);
  },
  async email(create, address, password) {
    await this.load();
    if (create) await this.auth.createUserWithEmailAndPassword(address, password);
    else await this.auth.signInWithEmailAndPassword(address, password);
  },
  async resetPassword(address) { await this.load(); await this.auth.sendPasswordResetEmail(address); },
  /* wipe : effacer aussi la progression de cet appareil (ordinateur partagé). */
  async signOut(wipe) {
    if (this.user && this.meta().dirty && !this.stale) await this.push().catch(() => {});
    this.unwatch();
    await this.auth.signOut();
    if (wipe) {
      const keep = {};
      for (const k of this.DEVICE) keep[k] = Store.s[k];
      this.replace({ settings: keep });
    } else { this.meta().active = false; Store.save(); }
  },

  /* Remise à zéro de la progression, ici et dans le compte. */
  wipe() {
    const keep = {}, m = Object.assign({}, this.meta(), { dirty: true });
    for (const k of this.DEVICE) keep[k] = Store.s[k];
    this.replace({ settings: keep, sync: m });
    this.push().catch(e => console.error(e));
  },

  /* ----- Suivi de l'état de connexion */
  async onUser(u) {
    this.user = u; this.err = ''; this.stale = false; this.ok = false;
    if (!u) { this.unwatch(); this.status = 'out'; this.emit(); return; }
    this.status = 'syncing'; this.emit();
    try {
      await this.reconcile();
      this.status = 'in';
      this.watch();
    } catch (e) { return this.fail(e); }
    this.emit();
  },
  /* Nouvelle tentative après une erreur (réseau, base momentanément indisponible). */
  retry() { return this.user ? this.onUser(this.user) : Promise.resolve(); },
  fail(e) {
    console.error(e);
    this.err = this.explain(e);
    if (this.status !== 'in' || !this.user) this.status = this.user ? 'error' : (this.auth ? 'out' : 'error');
    this.emit();
  },

  /* ----- Synchronisation
     Chaque écriture porte un identifiant (rev). Si la fiche en ligne porte encore celui que cet appareil
     a vu en dernier, elle n'a pas changé ailleurs entre-temps. */
  ref() { return this.db.collection('users').doc(this.user.uid); },
  payload() {
    const d = Object.assign({}, Store.d);
    delete d.sync;
    d.settings = Object.assign({}, d.settings);
    for (const k of this.DEVICE) delete d.settings[k];
    return JSON.stringify(d);
  },
  progress(d) {
    return !!d && ((d.xp || 0) > 0 || Object.keys(d.lessons || {}).length > 0 || Object.values(d.skills || {}).some(s => s && s.n > 0));
  },
  async reconcile() {
    const snap = await this.ref().get(), m = this.meta(), uid = this.user.uid;
    let cloud = null, rev = null;
    if (snap.exists) { rev = snap.get('rev'); try { cloud = JSON.parse(snap.get('data')); } catch (e) { cloud = null; } }
    const same = m.uid === uid;
    m.uid = uid; m.active = true; this.ok = true;
    if (!cloud || !this.progress(cloud)) return this.push();                       // compte vide : on y envoie cet appareil
    if (snap.get('data') === this.payload()) { m.rev = rev; m.dirty = false; return this.done(); }   // déjà identiques
    if (same && rev === m.rev) return m.dirty ? this.push() : this.done();         // rien n'a changé ailleurs
    if (same && !m.dirty) return this.apply(cloud, rev);                           // changé ailleurs, rien de neuf ici
    if (!same && !this.progress(Store.d)) return this.apply(cloud, rev);           // appareil vierge : on récupère le compte
    return (await this.ask(cloud)) === 'cloud' ? this.apply(cloud, rev) : this.push();
  },
  done() { this.last = Date.now(); this.quiet = true; Store.save(); this.quiet = false; },
  /* Remplace la progression locale par celle du compte, en gardant les réglages propres à l'appareil. */
  apply(cloud, rev) {
    const keep = {};
    for (const k of this.DEVICE) keep[k] = Store.s[k];
    cloud.settings = Object.assign({}, cloud.settings, keep);
    cloud.sync = { uid: this.user.uid, rev, active: true, dirty: false };
    this.replace(cloud);
    this.last = Date.now();
    toast('Progression récupérée depuis ton compte', 'ok');
  },
  replace(data) {
    this.quiet = true;
    Store.init(data);
    Store.flush();
    this.quiet = false;
    App.theme(); App.drawFoot(); App.drawDock(); Piano.build(); App.route();
  },
  async push() {
    if (!this.user || this.stale || !this.ok) return;   // jamais d'envoi sans avoir comparé avec le compte
    clearTimeout(this.timer);
    if (this.busy) { this.again = true; return; }
    const m = this.meta(), body = this.payload(), rev = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    if (body.length > 900000) throw Object.assign(new Error('Progression trop volumineuse pour être sauvegardée.'), { code: 'size' });
    this.busy = true; m.dirty = false; this.emit();
    try {
      await this.ref().set({ data: body, rev, v: 1, updated: firebase.firestore.FieldValue.serverTimestamp() });
      m.rev = rev; this.last = Date.now(); this.err = '';
      this.quiet = true; Store.save(); this.quiet = false;
    } catch (e) {
      m.dirty = true; this.quiet = true; Store.save(); this.quiet = false;   // pas de nouvel essai automatique en boucle
      this.err = this.explain(e);
      throw e;
    } finally {
      this.busy = false; this.emit();
      if (this.again) { this.again = false; this.schedule(1000); }
    }
  },
  schedule(ms = 4000) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push().catch(e => console.error(e)), ms);
  },
  /* Appelé à chaque enregistrement local : la sauvegarde en ligne suit quelques secondes plus tard. */
  touch(key) {
    if (this.quiet || !this.enabled || this.DEVICE.includes(key)) return;   // un réglage propre à l'appareil ne change rien en ligne
    const m = Store.d.sync;
    if (!m || !m.active) return;
    m.dirty = true;
    if (this.status === 'in') this.schedule();
  },
  flush() {
    Store.flush();
    if (this.status === 'in' && this.meta().dirty && !this.stale) this.push().catch(() => {});
  },
  /* Si la fiche change sur un autre appareil, on suspend les écritures d'ici et on propose de recharger. */
  watch() {
    this.unwatch();
    this.stop = this.ref().onSnapshot(snap => {
      if (snap.metadata.hasPendingWrites || !snap.exists) return;
      const rev = snap.get('rev');
      if (rev && rev !== this.meta().rev && !this.busy) {
        this.stale = true; this.emit();
        toast('Ta progression a changé sur un autre appareil : recharge la page pour la récupérer.');
      }
    }, e => console.error(e));
  },
  unwatch() { if (this.stop) { this.stop(); this.stop = null; } },

  /* Choix entre deux progressions différentes. */
  ask(cloud) {
    const last = d => { const ks = Object.keys(d.days || {}).sort(); return ks.length ? dayLong(ks[ks.length - 1]) : '—'; };
    const done = d => Object.values(d.lessons || {}).filter(l => l && l.done).length;
    const line = (label, d) => h('tr', null, h('td', null, h('b', null, label)), h('td', null, `${done(d)} / ${LESSONS.length}`), h('td', null, String(d.xp || 0)), h('td', null, last(d)));
    return new Promise(res => modal('Deux progressions différentes', h('div', { class: 'stack' },
      h('p', null, 'Ton compte contient déjà une progression, et cet appareil en a une autre. Laquelle veux-tu garder ? L\'autre sera remplacée.'),
      h('table', { class: 'data' }, h('tr', null, h('th', null, ''), h('th', null, 'Leçons'), h('th', null, 'Points'), h('th', null, 'Dernière activité')),
        line('Dans ton compte', cloud), line('Sur cet appareil', Store.d))),
    [{ label: 'Garder celle de cet appareil', must: true, fn: () => res('local') }, { label: 'Garder celle du compte', cls: 'primary', must: true, fn: () => res('cloud') }]));
  },

  explain(e) {
    const c = (e && e.code) || '';
    const M = {
      'auth/popup-closed-by-user': 'Fenêtre de connexion fermée avant la fin.',
      'auth/cancelled-popup-request': 'Fenêtre de connexion fermée avant la fin.',
      'auth/popup-blocked': 'Le navigateur a bloqué la fenêtre de connexion : autorise les fenêtres pop-up pour ce site, puis réessaie.',
      'auth/invalid-credential': 'Adresse e-mail ou mot de passe incorrect.',
      'auth/wrong-password': 'Adresse e-mail ou mot de passe incorrect.',
      'auth/user-not-found': 'Adresse e-mail ou mot de passe incorrect.',
      'auth/invalid-email': 'Cette adresse e-mail n\'est pas valide.',
      'auth/missing-password': 'Indique ton mot de passe.',
      'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse : connecte-toi plutôt.',
      'auth/weak-password': 'Mot de passe trop court : 6 caractères au minimum.',
      'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
      'auth/network-request-failed': 'Pas de connexion internet.',
      'auth/unauthorized-domain': 'Cette adresse de site n\'est pas autorisée dans le projet Firebase.',
      'auth/operation-not-allowed': 'Ce mode de connexion n\'est pas activé dans le projet Firebase.',
      'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cette adresse, avec un autre mode de connexion.',
      'permission-denied': 'La base de données a refusé l\'accès à ta progression.',
      'unavailable': 'Service momentanément indisponible. Ta progression reste enregistrée sur cet appareil.',
    };
    return M[c] || (e && e.message) || 'Erreur inconnue.';
  },
  who() { const u = this.user; return u ? (u.displayName || u.email || 'Compte') : ''; },
};

/* Panneau de compte : connexion, état de la sauvegarde, déconnexion. Utilisé dans la fenêtre du compte et les réglages. */
function accountPanel() {
  const el = h('div', { class: 'account stack' });
  let mode = 'in', info = '', wait = false;
  const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 10 ? 'à l\'instant' : s < 60 ? `il y a ${s} s` : s < 3600 ? `il y a ${Math.round(s / 60)} min` : `à ${new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`; };
  const run = async fn => {
    if (wait) return;
    wait = true; info = ''; Cloud.err = ''; draw();
    try { await fn(); } catch (e) { Cloud.err = Cloud.explain(e); if (e && e.code !== 'auth/popup-closed-by-user') console.error(e); }
    wait = false; draw();
  };
  const privacy = () => h('p', { class: 'muted small' }, 'Ton adresse e-mail et ta progression sont enregistrées chez Firebase (Google) pour que tu les retrouves sur tous tes appareils, et nulle part ailleurs. Les partitions importées restent sur cet appareil.');
  function draw() {
    if (!el.isConnected && el.dataset.mounted) return off();
    el.dataset.mounted = '1';
    el.innerHTML = '';
    const err = Cloud.err && h('div', { class: 'banner' }, Cloud.err);
    if (!Cloud.enabled) { el.append(h('p', { class: 'muted' }, 'Les comptes ne sont pas activés sur ce site.')); return; }
    if (Cloud.status === 'loading' || Cloud.status === 'syncing') { el.append(h('p', null, Cloud.status === 'syncing' ? 'Synchronisation de ta progression…' : 'Connexion…')); return; }
    if (Cloud.user) {
      const m = Cloud.meta();
      el.append(
        h('p', null, 'Connecté : ', h('b', null, Cloud.who()), Cloud.user.displayName && Cloud.user.email ? h('span', { class: 'muted' }, ' (' + Cloud.user.email + ')') : null),
        Cloud.stale ? h('div', { class: 'banner' }, 'Ta progression a changé sur un autre appareil. Recharge la page pour la récupérer ; en attendant, la sauvegarde est suspendue ici. ', h('button', { class: 'btn sm', onclick: () => location.reload() }, 'Recharger'))
          : !Cloud.ok ? h('div', { class: 'banner' }, 'La synchronisation avec ton compte n\'a pas pu se faire', Cloud.err ? ' : ' + Cloud.err : '.', ' Ta progression reste enregistrée sur cet appareil.')
          : h('p', { class: 'muted' }, Cloud.busy ? 'Sauvegarde en cours…' : m.dirty ? 'Modifications pas encore sauvegardées : elles partent dans quelques secondes.' : Cloud.last ? 'Progression sauvegardée ' + ago(Cloud.last) + '.' : 'Progression synchronisée.'),
        Cloud.ok ? err : '',
        h('div', { class: 'row' },
          !Cloud.stale && (Cloud.ok
            ? h('button', { class: 'btn', disabled: Cloud.busy || wait, onclick: () => run(() => Cloud.push()) }, 'Sauvegarder maintenant')
            : h('button', { class: 'btn primary', disabled: wait, onclick: () => run(() => Cloud.retry()) }, 'Réessayer')),
          h('button', { class: 'btn', disabled: wait, onclick: () => run(() => Cloud.signOut(false)) }, 'Se déconnecter')),
        h('p', { class: 'small' }, h('a', { href: '#', onclick: e => { e.preventDefault(); modal('Se déconnecter et effacer ?', h('p', null, 'Tu seras déconnecté et la progression de cet appareil sera effacée. Elle reste dans ton compte : tu la retrouveras en te reconnectant. Utile sur un ordinateur partagé.'), [{ label: 'Annuler' }, { label: 'Déconnecter et effacer', cls: 'primary', fn: () => { run(() => Cloud.signOut(true)); } }]); } }, 'Se déconnecter et effacer la progression de cet appareil')),
        privacy());
      return;
    }
    const mail = h('input', { class: 'input', type: 'email', placeholder: 'Adresse e-mail', autocomplete: 'email', required: true });
    const pass = h('input', { class: 'input', type: 'password', placeholder: 'Mot de passe (6 caractères minimum)', autocomplete: mode === 'create' ? 'new-password' : 'current-password', required: true });
    const submit = e => { e.preventDefault(); run(() => Cloud.email(mode === 'create', mail.value.trim(), pass.value)); };
    el.append(
      h('p', null, 'Connecte-toi pour sauvegarder ta progression et la retrouver sur n\'importe quel ordinateur ou navigateur.'),
      err, info && h('p', { class: 'skill-note ok' }, info),
      h('button', { class: 'btn primary google', disabled: wait, onclick: () => run(() => Cloud.google()) }, h('b', { class: 'g' }, 'G'), 'Continuer avec Google'),
      h('div', { class: 'or' }, h('span', null, 'ou avec une adresse e-mail')),
      h('form', { class: 'mailform', onsubmit: submit }, mail, pass,
        h('div', { class: 'row center' },
          h('button', { class: 'btn', type: 'submit', disabled: wait }, mode === 'create' ? 'Créer mon compte' : 'Se connecter'),
          h('a', { href: '#', class: 'small', onclick: e => { e.preventDefault(); mode = mode === 'create' ? 'in' : 'create'; Cloud.err = ''; draw(); } }, mode === 'create' ? 'J\'ai déjà un compte' : 'Créer un compte'),
          mode !== 'create' && h('a', { href: '#', class: 'small', onclick: e => {
            e.preventDefault();
            if (!mail.value.trim()) { Cloud.err = 'Indique d\'abord ton adresse e-mail.'; return draw(); }
            const a = mail.value.trim();
            run(async () => { await Cloud.resetPassword(a); info = `Un e-mail pour choisir un nouveau mot de passe a été envoyé à ${a}.`; });
          } }, 'Mot de passe oublié ?'))),
      privacy());
  }
  const off = Cloud.on(draw);
  draw();
  return el;
}

/* Puce de compte dans la barre du haut. */
function accountChip() {
  if (!Cloud.enabled) return null;
  const st = Cloud.status, u = Cloud.user;
  const cls = u ? (Cloud.stale || Cloud.err || !Cloud.ok ? 'warn' : 'on') : '';
  const label = st === 'loading' || st === 'syncing' ? 'Connexion…' : u ? (Cloud.stale ? 'À recharger' : Cloud.busy ? 'Sauvegarde…' : (u.displayName || u.email || 'Compte').split(/[ @]/)[0]) : 'Se connecter';
  return h('button', { class: 'chip ' + cls, title: u ? 'Mon compte : progression sauvegardée en ligne' : 'Se connecter pour sauvegarder sa progression', onclick: () => modal(u ? 'Mon compte' : 'Se connecter', accountPanel(), [{ label: 'Fermer' }]) },
    h('span', { class: 'dot' }), label);
}
