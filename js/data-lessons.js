'use strict';
/* Le cours de solfège. Chaque leçon : du texte, des illustrations (portées, mini-claviers) et des exercices.
   Types d'exercices : find (trouver des notes ou des accords), read (lecture de notes), quiz, score (jouer une partition), rhythm (taper un rythme). */

const CHAPTERS = ['Découvrir le clavier', 'Lire les notes', 'Le rythme', 'Altérations, gammes et tonalités', 'Intervalles, accords et expression'];

const S16 = Array(16).fill('B4:s').join(' ').replace('B4:s', 'B4:s=doubles_croches');
const E8 = Array(8).fill('B4:e').join(' ').replace('B4:e', 'B4:e=croches');

const LESSONS = [
  /* ================= Chapitre 1 ================= */
  {
    id: 'clavier', ch: 0, title: 'Le clavier et le nom des notes', min: 8,
    goal: 'Te repérer sur le clavier et trouver n\'importe quelle note.',
    body: [
      `<p>Regarde ton clavier : les touches noires ne sont pas placées au hasard. Elles forment des groupes de <b>2</b>, puis de <b>3</b>, puis de 2, puis de 3… Ce motif sert de repère pour tout le reste.</p>
       <h3>Sept notes, pas une de plus</h3>
       <p>Les touches blanches portent seulement <b>sept noms</b>, toujours dans le même ordre : <b>Do, Ré, Mi, Fa, Sol, La, Si</b>. Après le Si, on retombe sur un Do, plus aigu. La distance entre deux notes du même nom s'appelle une <b>octave</b>.</p>`,
      { kbd: { lo: 60, hi: 72, marks: { 60: true, 62: true, 64: true, 65: true, 67: true, 69: true, 71: true, 72: true } }, cap: 'Une octave, de Do à Do.' },
      `<h3>Deux repères à connaître par cœur</h3>
       <ul><li>Le <b>Do</b> est la touche blanche juste <b>à gauche du groupe de 2 touches noires</b>.</li>
       <li>Le <b>Fa</b> est la touche blanche juste <b>à gauche du groupe de 3 touches noires</b>.</li></ul>
       <p>À partir de ces deux-là, tu retrouves toutes les autres en comptant.</p>`,
      { kbd: { lo: 48, hi: 83, marks: { 48: true, 53: true, 60: true, 65: true, 72: true, 77: true } }, cap: 'Tous les Do et tous les Fa, sur trois octaves.' },
      `<h3>Grave, aigu et Do central</h3>
       <p>Plus tu vas vers la <b>droite</b>, plus le son est <b>aigu</b> ; vers la <b>gauche</b>, plus il est <b>grave</b>. Le Do le plus proche du milieu du clavier s'appelle le <b>Do central</b> : c'est le point de rendez-vous des deux mains et le repère numéro un pour lire une partition.</p>
       <div class="tip">En France, le Do central se note <b>Do3</b> ; la notation internationale (celle de MuseScore et de la plupart des logiciels) l'appelle <b>C4</b>. Les lettres correspondent ainsi : C = Do, D = Ré, E = Mi, F = Fa, G = Sol, A = La, B = Si.</div>`,
    ],
    ex: [
      { type: 'find', title: 'Trouve les notes sur ton clavier', items: [{ n: 'C' }, { n: 'F' }, { n: 'G' }, { n: 'D' }, { n: 'A' }, { n: 'E' }, { n: 'B' }, { n: 'C' }, { n: 'G' }, { n: 'E' }] },
      { type: 'find', title: 'Le Do central et ses voisins', items: [
        { n: 'C4', exact: true, say: 'le Do central' }, { n: 'C5', exact: true, say: 'le Do juste au-dessus (une octave plus aigu)' },
        { n: 'C3', exact: true, say: 'le Do juste en dessous du Do central' }, { n: 'G4', exact: true, say: 'le Sol juste au-dessus du Do central' },
        { n: 'A3', exact: true, say: 'le La juste en dessous du Do central' }] },
      { type: 'quiz', title: 'As-tu bien retenu ?', questions: [
        { q: 'Combien de noms de notes différents existe-t-il ?', c: ['5', '7', '12'], a: 1, why: 'Do, Ré, Mi, Fa, Sol, La, Si… puis on recommence.' },
        { q: 'Quelle note se trouve juste à gauche du groupe de 3 touches noires ?', c: ['Do', 'Fa', 'Sol'], a: 1, why: 'Et le Do est à gauche du groupe de 2.' },
        { q: 'Quelle note vient juste après le Si ?', c: ['La', 'Do', 'Ré'], a: 1 },
        { q: 'Qu\'est-ce qu\'une octave ?', c: ['La distance entre deux touches voisines', 'La distance entre une note et la suivante du même nom', 'Un groupe de touches noires'], a: 1 },
        { q: 'Vers la gauche du clavier, les sons deviennent…', c: ['plus aigus', 'plus graves', 'plus forts'], a: 1 }] },
    ],
  },
  {
    id: 'doigtes', ch: 0, title: 'Position des mains et doigtés', min: 8,
    goal: 'Poser tes mains correctement et jouer cinq notes à la suite.',
    body: [
      `<p>Au piano, les doigts sont <b>numérotés de 1 à 5</b>, pareil pour les deux mains : <b>1</b> = pouce, <b>2</b> = index, <b>3</b> = majeur, <b>4</b> = annulaire, <b>5</b> = auriculaire. Sur une partition, un petit chiffre près d'une note t'indique quel doigt utiliser : c'est le <b>doigté</b>.</p>
       <h3>La posture</h3>
       <ul><li>Assieds-toi face au <b>Do central</b>, assez loin pour que tes coudes soient légèrement devant ton corps.</li>
       <li>Avant-bras à peu près horizontaux, épaules relâchées, poignets souples (ni cassés, ni relevés).</li>
       <li>Doigts <b>arrondis</b>, comme si tu tenais une petite balle : on joue avec le bout des doigts, le pouce sur sa tranche.</li></ul>
       <h3>La position de Do</h3>
       <p><b>Main droite</b> : pouce (1) sur le Do central, puis un doigt par touche blanche : Do, Ré, Mi, Fa, Sol.<br>
       <b>Main gauche</b> : auriculaire (5) sur le Do situé une octave sous le Do central, puis 4, 3, 2, 1 sur Ré, Mi, Fa, Sol.</p>
       <p>Dans cette position, tes mains ne bougent pas : chaque doigt a sa touche.</p>`,
      { fig: { time: [5, 4], names: true, parts: ['C4:q@1 D4:q@2 E4:q@3 F4:q@4 G4:q@5'] }, cap: 'Position de Do, main droite : les chiffres au-dessus des notes sont les doigtés.' },
      `<div class="tip">Dans les exercices ci-dessous, la partition <b>attend</b> que tu joues la bonne note pour avancer. Prends ton temps : la régularité viendra plus tard.</div>`,
    ],
    ex: [
      { type: 'score', title: 'Main droite : monte et redescends', piece: { tempo: 72, parts: ['C4:q@1 D4:q@2 E4:q@3 F4:q@4 | G4:h@5 G4:h | G4:q@5 F4:q@4 E4:q@3 D4:q@2 | C4:w@1'] } },
      { type: 'score', title: 'Main gauche : même chose en clé de fa', piece: { tempo: 72, clefs: ['F'], parts: ['C3:q@5 D3:q@4 E3:q@3 F3:q@2 | G3:h@1 G3:h | G3:q@1 F3:q@2 E3:q@3 D3:q@4 | C3:w@5'] } },
      { type: 'score', title: 'Les deux mains ensemble', piece: { tempo: 66, parts: ['C4:q@1 D4:q E4:q F4:q | G4:w@5 | G4:q F4:q E4:q D4:q | C4:w@1', 'C3:q@5 D3:q E3:q F3:q | G3:w@1 | G3:q F3:q E3:q D3:q | C3:w@5'] } },
      { type: 'quiz', title: 'Vérifions', questions: [
        { q: 'Quel numéro porte le pouce ?', c: ['1', '3', '5'], a: 0, why: 'Aux deux mains, le pouce est le doigt 1.' },
        { q: 'En position de Do à la main gauche, quel doigt joue le Do ?', c: ['Le pouce (1)', 'Le majeur (3)', 'L\'auriculaire (5)'], a: 2, why: 'La main gauche est en miroir : le 5 est sur la note la plus grave.' },
        { q: 'Que signifie un petit « 3 » écrit au-dessus d\'une note ?', c: ['Jouer la note trois fois', 'La jouer avec le majeur', 'La tenir trois temps'], a: 1 }] },
    ],
  },

  /* ================= Chapitre 2 ================= */
  {
    id: 'cle-de-sol', ch: 1, title: 'La portée et la clé de sol', min: 12,
    goal: 'Lire les notes de la main droite.',
    body: [
      `<p>La musique s'écrit sur une <b>portée</b> : <b>5 lignes</b> et <b>4 interlignes</b>, que l'on compte toujours <b>de bas en haut</b>. Plus une note est placée haut sur la portée, plus elle est aiguë (donc plus à droite sur le clavier).</p>
       <p>Une note se pose soit <b>sur une ligne</b> (la ligne la traverse), soit <b>dans un interligne</b> (entre deux lignes). Quand on monte d'une note à la suivante — Do, Ré, Mi… — on alterne : ligne, interligne, ligne, interligne.</p>
       <h3>La clé de sol</h3>
       <p>Au début de la portée, la <b>clé</b> indique à quelles notes correspondent les lignes. La boucle de la <b>clé de sol</b> s'enroule autour de la <b>2ᵉ ligne</b> : toute note posée sur cette ligne est un <b>Sol</b> (celui qui est juste au-dessus du Do central). C'est la clé de la main droite.</p>`,
      { fig: { parts: ['G4:w'], names: true }, cap: 'La 2ᵉ ligne est celle du Sol.' },
      `<h3>Les notes sur les lignes</h3><p>De bas en haut : <b>Mi – Sol – Si – Ré – Fa</b>.</p>`,
      { fig: { time: [5, 4], names: true, parts: ['E4 G4 B4 D5 F5'] } },
      `<h3>Les notes dans les interlignes</h3><p>De bas en haut : <b>Fa – La – Do – Mi</b>.</p>`,
      { fig: { names: true, parts: ['F4 A4 C5 E5'] } },
      `<h3>Et le Do central ?</h3>
       <p>Il est trop grave pour tenir sur la portée : on l'écrit <b>en dessous</b>, sur une petite <b>ligne supplémentaire</b>. Le Ré se glisse juste sous la première ligne.</p>`,
      { fig: { time: [5, 4], names: true, parts: ['C4 D4 E4 F4 G4'] }, cap: 'Les cinq notes de la position de Do.' },
      `<div class="tip"><b>Conseil :</b> n'essaie pas de tout apprendre d'un coup. Retiens trois repères — le <b>Do central</b> (sous la portée), le <b>Sol</b> (2ᵉ ligne) et le <b>Do aigu</b> (3ᵉ interligne) — puis lis les autres notes par rapport à eux, en montant ou en descendant.</div>`,
    ],
    ex: [
      { type: 'read', title: 'De Do à Sol, avec les noms pour démarrer', clefs: ['G'], range: [['C4', 'G4']], count: 8, names: true },
      { type: 'read', title: 'De Do à Sol, sans aide', clefs: ['G'], range: [['C4', 'G4']], count: 12 },
      { type: 'read', title: 'Toute la portée', clefs: ['G'], range: [['C4', 'G5']], count: 16 },
      { type: 'quiz', title: 'Vérifions', questions: [
        { q: 'Combien de lignes compte une portée ?', c: ['4', '5', '6'], a: 1 },
        { q: 'Dans quel sens compte-t-on les lignes ?', c: ['De haut en bas', 'De bas en haut'], a: 1 },
        { q: 'La clé de sol indique la ligne du Sol. Laquelle ?', c: ['La 1ʳᵉ', 'La 2ᵉ', 'La 3ᵉ'], a: 1 },
        { q: 'Quelles notes occupent les quatre interlignes en clé de sol, de bas en haut ?', c: ['Mi Sol Si Ré', 'Fa La Do Mi', 'Sol Si Ré Fa'], a: 1 },
        { q: 'Où s\'écrit le Do central en clé de sol ?', c: ['Sur la 1ʳᵉ ligne', 'Sur une petite ligne supplémentaire, sous la portée', 'Dans le 1ᵉʳ interligne'], a: 1 }] },
    ],
  },
  {
    id: 'cle-de-fa', ch: 1, title: 'La clé de fa', min: 12,
    goal: 'Lire les notes de la main gauche.',
    body: [
      `<p>Pour écrire les notes graves — celles de la <b>main gauche</b> — on utilise la <b>clé de fa</b>. Ses deux points encadrent la <b>4ᵉ ligne</b> : toute note posée sur cette ligne est un <b>Fa</b> (celui qui est juste en dessous du Do central).</p>
       <div class="tip"><b>Attention :</b> en clé de fa, les notes ne sont <b>pas</b> aux mêmes endroits qu'en clé de sol. C'est la difficulté classique des débuts, et c'est normal d'aller plus lentement.</div>
       <h3>Les notes sur les lignes</h3><p>De bas en haut : <b>Sol – Si – Ré – Fa – La</b>.</p>`,
      { fig: { clefs: ['F'], time: [5, 4], names: true, parts: ['G2 B2 D3 F3 A3'] } },
      `<h3>Les notes dans les interlignes</h3><p>De bas en haut : <b>La – Do – Mi – Sol</b>.</p>`,
      { fig: { clefs: ['F'], names: true, parts: ['A2 C3 E3 G3'] } },
      `<h3>Le Do central, vu d'en bas</h3>
       <p>Cette fois, le Do central est trop <b>aigu</b> pour la portée : on l'écrit <b>au-dessus</b>, sur une ligne supplémentaire.</p>`,
      { fig: { clefs: ['F'], time: [5, 4], names: true, parts: ['F3 G3 A3 B3 C4'] }, cap: 'Du Fa (4ᵉ ligne) au Do central.' },
      `<div class="tip"><b>Astuce :</b> une note en clé de fa porte le nom de la note située <b>deux crans plus haut</b> en clé de sol. Ce qui ressemblerait à un Mi (1ʳᵉ ligne) en clé de sol est donc un Sol en clé de fa. Mais à terme, mieux vaut connaître quelques repères directement : le <b>Fa</b> (4ᵉ ligne), le <b>Do</b> (2ᵉ interligne) et le <b>Do central</b> (au-dessus).</div>`,
    ],
    ex: [
      { type: 'read', title: 'De Fa à Do central, avec les noms', clefs: ['F'], range: [['F3', 'C4']], count: 8, names: true },
      { type: 'read', title: 'Une octave, de Do à Do', clefs: ['F'], range: [['C3', 'C4']], count: 12 },
      { type: 'read', title: 'Toute la portée', clefs: ['F'], range: [['G2', 'C4']], count: 16 },
      { type: 'quiz', title: 'Vérifions', questions: [
        { q: 'La clé de fa sert surtout à écrire…', c: ['les notes aiguës (main droite)', 'les notes graves (main gauche)'], a: 1 },
        { q: 'Les deux points de la clé de fa encadrent la ligne du Fa. Laquelle ?', c: ['La 2ᵉ', 'La 3ᵉ', 'La 4ᵉ'], a: 2 },
        { q: 'En clé de fa, quelle note est posée sur la ligne du haut (la 5ᵉ) ?', c: ['Fa', 'La', 'Sol'], a: 1, why: 'Sol – Si – Ré – Fa – La.' },
        { q: 'Où s\'écrit le Do central en clé de fa ?', c: ['Sous la portée', 'Au-dessus de la portée, sur une ligne supplémentaire', 'Sur la 3ᵉ ligne'], a: 1 }] },
    ],
  },
  {
    id: 'deux-portees', ch: 1, title: 'Les deux portées et les lignes supplémentaires', min: 12,
    goal: 'Lire les deux clés en même temps, comme sur une vraie partition de piano.',
    body: [
      `<p>Une partition de piano superpose <b>deux portées</b> reliées par une accolade : en haut la <b>clé de sol</b> (main droite), en bas la <b>clé de fa</b> (main gauche). Les notes alignées <b>verticalement</b> se jouent <b>en même temps</b>.</p>
       <h3>Le Do central fait le pont</h3>
       <p>Le Do central appartient aux deux portées : c'est <b>la même touche</b>, écrite sous la portée du haut ou au-dessus de la portée du bas, selon la main qui la joue.</p>`,
      { fig: { parts: ['r:w | r:w | C4 D4 E4 F4 | G4 A4 B4 C5', 'C3 D3 E3 F3 | G3 A3 B3 C4 | r:w | r:w'], names: true }, cap: 'Deux octaves de Do à Do : la main gauche passe le relais à la main droite au Do central.' },
      `<h3>Les lignes supplémentaires</h3>
       <p>Quand une note dépasse de la portée, vers le haut ou vers le bas, on lui ajoute de petites lignes rien que pour elle. Le principe ne change pas : on continue d'alterner ligne et interligne.</p>`,
      { fig: { time: [5, 4], names: true, parts: ['A3 B3 C4 D4 E4'] }, cap: 'En clé de sol, sous la portée : La et Do sont sur des lignes supplémentaires, Si et Ré entre deux.' },
      `<h3>La méthode des bons lecteurs</h3>
       <ul><li><b>Des repères</b> : Do central, Sol de la clé de sol, Fa de la clé de fa, puis les Do voisins.</li>
       <li><b>Des distances</b> : de ligne à interligne voisin, on joue la <b>touche d'à côté</b> ; de ligne à ligne (ou d'interligne à interligne), on <b>saute une touche</b>.</li></ul>
       <p>Avec l'habitude, tu ne nommeras plus chaque note : tu verras le dessin de la mélodie, et tes doigts suivront.</p>`,
    ],
    ex: [
      { type: 'read', title: 'Les deux clés autour du Do central', clefs: ['G', 'F'], range: [['C4', 'G4'], ['F3', 'C4']], count: 12 },
      { type: 'read', title: 'Les deux portées complètes', clefs: ['G', 'F'], range: [['C4', 'G5'], ['G2', 'C4']], count: 16 },
      { type: 'score', title: 'Une mélodie qui passe d\'une main à l\'autre', piece: { tempo: 66, parts: ['C4 D4 E4:h | r:w | E4 D4 C4:h | r:w | G4 F4 E4 D4 | C4:w', 'r:w | C4 B3 A3:h | r:w | A3 B3 C4:h | r:w | C3:w'] } },
      { type: 'quiz', title: 'Vérifions', questions: [
        { q: 'Deux notes alignées verticalement sur les deux portées se jouent…', c: ['l\'une après l\'autre', 'en même temps'], a: 1 },
        { q: 'Le Do écrit juste sous la portée en clé de sol et le Do écrit juste au-dessus en clé de fa sont…', c: ['la même touche', 'à une octave d\'écart'], a: 0, why: 'C\'est le Do central, vu depuis chacune des deux portées.' },
        { q: 'Une note passe d\'une ligne à la ligne juste au-dessus. Sur le clavier, on…', c: ['joue la touche blanche voisine', 'saute une touche blanche'], a: 1, why: 'Ligne → interligne : touche voisine. Ligne → ligne : on en saute une.' }] },
    ],
  },

  /* ================= Chapitre 3 ================= */
  {
    id: 'durees', ch: 2, title: 'La pulsation et les figures de notes', min: 12,
    goal: 'Savoir combien de temps dure chaque note.',
    body: [
      `<p>Une note dit deux choses : <b>quelle touche</b> jouer (sa hauteur sur la portée) et <b>combien de temps</b> la tenir (sa forme).</p>
       <h3>La pulsation</h3>
       <p>C'est le battement régulier de la musique, celui sur lequel on tape du pied. Chaque battement est un <b>temps</b>. Le <b>tempo</b> indique la vitesse : « ♩ = 60 » veut dire 60 temps par minute, soit un par seconde. Le <b>métronome</b> fait entendre cette pulsation.</p>
       <h3>Les figures de notes</h3>
       <table><tr><th>Figure</th><th>Durée</th><th>À quoi on la reconnaît</th></tr>
       <tr><td><b>Ronde</b></td><td>4 temps</td><td>Ovale vide, sans hampe</td></tr>
       <tr><td><b>Blanche</b></td><td>2 temps</td><td>Ovale vide, avec une hampe</td></tr>
       <tr><td><b>Noire</b></td><td>1 temps</td><td>Ovale plein, avec une hampe</td></tr>
       <tr><td><b>Croche</b></td><td>½ temps</td><td>Comme la noire, avec un crochet (ou une barre qui en relie plusieurs)</td></tr>
       <tr><td><b>Double croche</b></td><td>¼ de temps</td><td>Deux crochets ou deux barres</td></tr></table>
       <p>Chaque figure dure <b>la moitié</b> de la précédente : 1 ronde = 2 blanches = 4 noires = 8 croches = 16 doubles croches.</p>`,
      { fig: { showTime: true, parts: [`B4:w=ronde | B4:h=blanches B4:h | B4:q=noires B4:q B4:q B4:q | ${E8} | ${S16}`] }, cap: 'Cinq mesures de même durée (4 temps), remplies avec des notes de plus en plus courtes.' },
      `<h3>Compter</h3>
       <p>Pour les noires, on compte les temps : « <b>1, 2, 3, 4</b> ». Pour les croches, on ajoute un « et » entre les temps : « <b>1 et 2 et 3 et 4 et</b> ». Compte à voix haute au début, cela aide énormément.</p>`,
    ],
    ex: [
      { type: 'quiz', title: 'Les durées', questions: [
        { q: 'Combien de temps dure une blanche ?', c: ['1 temps', '2 temps', '4 temps'], a: 1 },
        { q: 'Combien de noires faut-il pour remplir la durée d\'une ronde ?', c: ['2', '4', '8'], a: 1 },
        { q: 'Deux croches durent autant que…', c: ['une noire', 'une blanche', 'une double croche'], a: 0 },
        { q: 'À ♩ = 120, combien y a-t-il de temps par seconde ?', c: ['1', '2', '4'], a: 1, why: '120 par minute, soit 2 par seconde.' },
        { q: 'Quatre doubles croches valent…', c: ['une croche', 'une noire', 'une blanche'], a: 1 }] },
      { type: 'rhythm', title: 'Tape : noires, blanches et ronde', piece: { tempo: 72, parts: ['B4:q B4:q B4:q B4:q | B4:h B4:h | B4:q B4:q B4:h | B4:w'] } },
      { type: 'rhythm', title: 'Tape : avec des croches', piece: { tempo: 66, parts: ['B4:q B4:e B4:e B4:q B4:q | B4:e B4:e B4:e B4:e B4:h | B4:q B4:q B4:e B4:e B4:q | B4:w'] } },
    ],
  },
  {
    id: 'silences', ch: 2, title: 'Les silences', min: 8,
    goal: 'Reconnaître les silences et continuer à compter pendant qu\'on ne joue pas.',
    body: [
      `<p>La musique respire : elle contient aussi des moments où l'on ne joue pas. Chaque figure de note a son <b>silence</b> de même durée.</p>
       <table><tr><th>Silence</th><th>Durée</th><th>Vaut autant que</th><th>À quoi on le reconnaît</th></tr>
       <tr><td><b>Pause</b></td><td>4 temps</td><td>une ronde</td><td>Petit rectangle <b>accroché sous</b> la 4ᵉ ligne</td></tr>
       <tr><td><b>Demi-pause</b></td><td>2 temps</td><td>une blanche</td><td>Petit rectangle <b>posé sur</b> la 3ᵉ ligne</td></tr>
       <tr><td><b>Soupir</b></td><td>1 temps</td><td>une noire</td><td>Une sorte de zigzag</td></tr>
       <tr><td><b>Demi-soupir</b></td><td>½ temps</td><td>une croche</td><td>Un petit « 7 » avec une boule</td></tr>
       <tr><td><b>Quart de soupir</b></td><td>¼ de temps</td><td>une double croche</td><td>Le même avec deux boules</td></tr></table>`,
      { fig: { showTime: true, parts: ['r:w | r:h r:h | r:q r:q r:q r:q | r:e r:e r:e r:e r:e r:e r:e r:e'] }, cap: 'Une pause, deux demi-pauses, quatre soupirs, huit demi-soupirs.' },
      `<div class="tip"><b>Pour ne pas confondre :</b> la pause est « lourde », elle pend sous sa ligne ; la demi-pause, plus légère, est posée dessus comme un chapeau.</div>
       <p>Pendant un silence, <b>la pulsation continue</b> : on compte les temps dans sa tête et on relève les doigts. Un silence bien respecté fait partie du rythme autant qu'une note.</p>`,
    ],
    ex: [
      { type: 'quiz', title: 'Les silences', questions: [
        { q: 'Comment s\'appelle le silence qui dure 1 temps ?', c: ['La pause', 'Le soupir', 'Le demi-soupir'], a: 1 },
        { q: 'La pause (4 temps) est un petit rectangle…', c: ['accroché sous la 4ᵉ ligne', 'posé sur la 3ᵉ ligne'], a: 0 },
        { q: 'Le demi-soupir dure autant que…', c: ['une noire', 'une croche', 'une blanche'], a: 1 },
        { q: 'Pendant un silence, la pulsation…', c: ['s\'arrête', 'continue : on compte dans sa tête'], a: 1 }] },
      { type: 'rhythm', title: 'Tape : noires et soupirs', piece: { tempo: 72, parts: ['B4:q r:q B4:q r:q | B4:q B4:q r:h | r:q B4:q B4:q B4:q | B4:h r:h'] } },
      { type: 'rhythm', title: 'Tape : un peu plus corsé', piece: { tempo: 72, parts: ['B4:q B4:q r:q B4:q | r:q B4:q r:q B4:q | B4:e B4:e B4:q r:q B4:q | B4:h. r:q'] } },
    ],
  },
  {
    id: 'mesure', ch: 2, title: 'La mesure et le chiffrage', min: 10,
    goal: 'Comprendre les deux chiffres au début de la partition.',
    body: [
      `<p>Les temps sont regroupés par paquets égaux, les <b>mesures</b>, séparées par des <b>barres de mesure</b> verticales. Une <b>double barre</b> épaisse marque la fin du morceau.</p>
       <h3>Le chiffrage</h3>
       <p>Juste après la clé, deux chiffres superposés :</p>
       <ul><li>celui <b>du haut</b> : le <b>nombre de temps</b> par mesure ;</li>
       <li>celui <b>du bas</b> : la <b>figure qui vaut un temps</b> (4 = la noire, 2 = la blanche, 8 = la croche).</li></ul>
       <table><tr><th>Chiffrage</th><th>Contenu d'une mesure</th><th>Caractère</th></tr>
       <tr><td><b>4/4</b> (parfois noté C)</td><td>4 noires</td><td>Le plus courant</td></tr>
       <tr><td><b>3/4</b></td><td>3 noires</td><td>La valse : <b>UN</b>-deux-trois</td></tr>
       <tr><td><b>2/4</b></td><td>2 noires</td><td>La marche : <b>UN</b>-deux</td></tr>
       <tr><td><b>6/8</b></td><td>6 croches, en 2 groupes de 3</td><td>Un balancement</td></tr></table>`,
      { fig: { time: [3, 4], showTime: true, parts: ['C5 C5 C5 | C5:h C5 | C5 C5:e C5:e C5 | C5:h.'] }, cap: 'Quatre mesures à 3/4 : chacune contient exactement 3 temps.' },
      `<h3>Temps forts</h3>
       <p>Le <b>premier temps</b> de chaque mesure est le <b>temps fort</b> : on l'appuie très légèrement, c'est lui qui donne son balancement à la musique. Le métronome du site le signale par un son plus aigu.</p>
       <div class="tip">Certains morceaux commencent <b>avant</b> le premier temps fort, par une mesure incomplète : c'est une <b>anacrouse</b> (ou levée). « Joyeux anniversaire » en est un bon exemple : « Joy-eux » vient avant le premier temps fort, sur « an- ».</div>`,
    ],
    ex: [
      { type: 'quiz', title: 'Le chiffrage', questions: [
        { q: 'Dans le chiffrage 3/4, que signifie le 3 ?', c: ['Il y a 3 temps par mesure', 'La noire vaut 3 temps', 'Le morceau dure 3 mesures'], a: 0 },
        { q: 'Et le 4 du bas ?', c: ['Il y a 4 mesures par ligne', 'L\'unité de temps est la noire', 'Il faut jouer 4 fois'], a: 1 },
        { q: 'Combien de noires dans une mesure à 2/4 ?', c: ['2', '3', '4'], a: 0 },
        { q: 'Quel temps est le plus appuyé dans une mesure ?', c: ['Le premier', 'Le dernier', 'Aucun'], a: 0 },
        { q: 'Une mesure à 6/8 contient l\'équivalent de…', c: ['6 noires', '6 croches', '8 croches'], a: 1 }] },
      { type: 'rhythm', title: 'Tape : une valse à 3/4', piece: { tempo: 84, time: [3, 4], parts: ['B4 B4 B4 | B4:h B4 | B4 B4:e B4:e B4 | B4:h.'] } },
      { type: 'rhythm', title: 'Tape : une marche à 2/4', piece: { tempo: 80, time: [2, 4], parts: ['B4 B4 | B4:e B4:e B4 | B4 B4:e B4:e | B4:h'] } },
    ],
  },
  {
    id: 'pointees', ch: 2, title: 'Notes pointées et liaisons', min: 8,
    goal: 'Lire les durées « entre deux ».',
    body: [
      `<h3>Le point</h3>
       <p>Un <b>point</b> placé juste <b>après</b> une note l'allonge de <b>la moitié de sa durée</b> :</p>
       <ul><li><b>blanche pointée</b> = 2 + 1 = <b>3 temps</b> ;</li>
       <li><b>noire pointée</b> = 1 + ½ = <b>1 temps et demi</b> (très souvent suivie d'une croche, pour retomber sur ses pieds).</li></ul>
       <h3>La liaison de prolongation</h3>
       <p>Une courbe qui relie <b>deux notes identiques</b> signifie qu'on ne rejoue pas la seconde : on joue la première et on la <b>tient</b> pendant la durée des deux. C'est indispensable pour faire durer un son par-dessus une barre de mesure.</p>`,
      { fig: { showTime: true, parts: ['C5:h.=3_temps C5:q | C5:q.=1_temps_½ C5:e C5:h | C5:q C5:q C5:h~=tenue | C5:q C5:q C5:h'] }, cap: 'Blanche pointée, noire pointée + croche, puis une blanche liée à une noire par-dessus la barre de mesure.' },
      `<div class="tip">Ne confonds pas avec la <b>liaison d'expression</b> : une courbe au-dessus de notes <b>différentes</b> demande de les jouer <b>liées</b> (legato), sans trou entre elles.</div>
       <p>Pour sentir la noire pointée, compte les croches : « <b>1</b> et 2 <b>et</b> » — la noire pointée dure « 1 et 2 », la croche tombe sur le « et ».</p>`,
    ],
    ex: [
      { type: 'quiz', title: 'Points et liaisons', questions: [
        { q: 'Combien de temps dure une blanche pointée ?', c: ['2 temps', '3 temps', '4 temps'], a: 1 },
        { q: 'Une noire pointée vaut…', c: ['1 temps', '1 temps et demi', '2 temps'], a: 1 },
        { q: 'Deux blanches identiques reliées par une liaison : combien de fois appuie-t-on sur la touche ?', c: ['Une seule fois, tenue 4 temps', 'Deux fois'], a: 0 },
        { q: 'Le point placé après une note…', c: ['la raccourcit', 'l\'allonge de la moitié de sa durée', 'la rend plus forte'], a: 1 }] },
      { type: 'rhythm', title: 'Tape : blanches et noires pointées', piece: { tempo: 76, parts: ['B4:h. B4:q | B4:q. B4:e B4:h | B4:q. B4:e B4:q B4:q | B4:w'] } },
      { type: 'rhythm', title: 'Tape : avec une liaison', piece: { tempo: 76, parts: ['B4:q B4:q B4:h~ | B4:q B4:q B4:h | B4:q. B4:e B4:h~ | B4:h B4:h'] } },
    ],
  },

  /* ================= Chapitre 4 ================= */
  {
    id: 'alterations', ch: 3, title: 'Tons, demi-tons et altérations', min: 12,
    goal: 'Jouer les touches noires et lire les dièses et les bémols.',
    body: [
      `<h3>Ton et demi-ton</h3>
       <p>Le <b>demi-ton</b> est la plus petite distance au piano : d'une touche à sa <b>voisine immédiate</b>, noire ou blanche. Deux demi-tons font un <b>ton</b>.</p>
       <p>Entre <b>Mi et Fa</b> et entre <b>Si et Do</b>, il n'y a pas de touche noire : ces notes ne sont séparées que d'un demi-ton. Partout ailleurs, deux touches blanches voisines sont à un ton d'écart.</p>
       <h3>Les trois altérations</h3>
       <ul><li>Le <b>dièse ♯</b> <b>monte</b> la note d'un demi-ton : on joue la touche juste à droite.</li>
       <li>Le <b>bémol ♭</b> <b>baisse</b> la note d'un demi-ton : on joue la touche juste à gauche.</li>
       <li>Le <b>bécarre ♮</b> <b>annule</b> un dièse ou un bémol : la note redevient naturelle.</li></ul>`,
      { kbd: { lo: 60, hi: 72, marks: { 61: true, 63: true, 66: true, 68: true, 70: true } }, cap: 'Les cinq touches noires, nommées ici avec des dièses.' },
      `<p>Chaque touche noire a donc <b>deux noms</b> : la touche entre Fa et Sol s'appelle Fa♯ (Fa monté) ou Sol♭ (Sol baissé). On appelle cela une <b>enharmonie</b>.</p>`,
      { fig: { names: true, parts: ['F4 F#4 G4 Gb4'] }, cap: 'Fa♯ et Sol♭ : deux écritures, une seule touche.' },
      `<h3>La règle de la mesure</h3>
       <p>Une altération écrite devant une note (on dit <b>accidentelle</b>) reste valable <b>jusqu'à la fin de la mesure</b> pour toutes les notes de même hauteur. À la barre de mesure suivante, tout est remis à zéro.</p>
       <div class="tip">Un dièse ne tombe pas toujours sur une touche noire : <b>Mi♯</b> se joue sur la touche du Fa, et <b>Do♭</b> sur celle du Si.</div>`,
    ],
    ex: [
      { type: 'find', title: 'Trouve les touches noires', items: [{ n: 'F#' }, { n: 'Bb' }, { n: 'C#' }, { n: 'Eb' }, { n: 'G#' }, { n: 'Ab' }, { n: 'D#' }, { n: 'Gb' }] },
      { type: 'read', title: 'Lecture avec dièses et bémols', clefs: ['G'], range: [['C4', 'C5']], count: 12, acc: true },
      { type: 'quiz', title: 'Vérifions', questions: [
        { q: 'Que fait un dièse (♯) ?', c: ['Il monte la note d\'un demi-ton', 'Il baisse la note d\'un demi-ton', 'Il annule une altération'], a: 0 },
        { q: 'Quelle touche joue-t-on pour un Mi♭ ?', c: ['La touche noire juste à gauche du Mi', 'La touche noire juste à droite du Mi', 'La touche blanche Ré'], a: 0 },
        { q: 'Entre quelles notes n\'y a-t-il pas de touche noire ?', c: ['Do–Ré et Fa–Sol', 'Mi–Fa et Si–Do', 'Sol–La et La–Si'], a: 1 },
        { q: 'Do♯ et Ré♭, c\'est…', c: ['la même touche', 'deux touches différentes'], a: 0, why: 'Deux noms pour un même son : une enharmonie.' },
        { q: 'Un Fa♯ apparaît au début d\'une mesure. Le Fa suivant, dans la même mesure et à la même hauteur, se joue…', c: ['Fa naturel', 'Fa♯ aussi'], a: 1, why: 'L\'altération vaut jusqu\'à la barre de mesure.' },
        { q: 'Combien de demi-tons dans un ton ?', c: ['1', '2', '3'], a: 1 }] },
    ],
  },
  {
    id: 'gamme-majeure', ch: 3, title: 'La gamme majeure', min: 12,
    goal: 'Comprendre comment se construit une gamme et jouer tes premières.',
    body: [
      `<p>Une <b>gamme</b> est une suite de notes qui monte de proche en proche jusqu'à l'octave. La plus simple, <b>Do majeur</b>, n'utilise que les touches blanches : Do, Ré, Mi, Fa, Sol, La, Si, Do.</p>
       <h3>La recette</h3>
       <p>Ce qui donne sa couleur à la gamme majeure, c'est l'ordre des tons (T) et des demi-tons (½) entre ses notes :</p>
       <p class="center"><b>T – T – ½ – T – T – T – ½</b></p>
       <p>Vérifie sur Do majeur : les deux demi-tons tombent bien entre Mi–Fa et Si–Do. En appliquant cette recette à partir de <b>n'importe quelle note</b>, on obtient une autre gamme majeure… à condition d'ajouter des altérations :</p>
       <ul><li><b>Sol majeur</b> : Sol, La, Si, Do, Ré, Mi, <b>Fa♯</b>, Sol ;</li>
       <li><b>Fa majeur</b> : Fa, Sol, La, <b>Si♭</b>, Do, Ré, Mi, Fa.</li></ul>
       <h3>Le doigté : le passage du pouce</h3>
       <p>Huit notes pour cinq doigts : il faut une astuce. À la main droite, on joue 1-2-3, puis le <b>pouce passe sous la main</b> pour jouer la 4ᵉ note, et on termine 1-2-3-4-5. En redescendant, c'est le majeur (3) qui enjambe le pouce.</p>`,
      { fig: { names: true, parts: ['C4:q@1 D4:q@2 E4:q@3 F4:q@1 | G4:q@2 A4:q@3 B4:q@4 C5:q@5'] }, cap: 'Do majeur, main droite : 1 2 3 – 1 2 3 4 5.' },
      `<div class="tip">La première note de la gamme s'appelle la <b>tonique</b> : c'est la « maison », la note sur laquelle la musique se repose. La septième, juste un demi-ton en dessous de la tonique, est la <b>sensible</b> : elle donne envie de rentrer à la maison.</div>`,
    ],
    ex: [
      { type: 'score', title: 'Do majeur, main droite', make: () => Gen.scale(0, 'maj', 'R') },
      { type: 'score', title: 'Do majeur, main gauche', make: () => Gen.scale(0, 'maj', 'L') },
      { type: 'score', title: 'Sol majeur, main droite (avec un Fa♯)', make: () => Gen.scale(1, 'maj', 'R') },
      { type: 'score', title: 'Fa majeur, main droite (avec un Si♭)', make: () => Gen.scale(-1, 'maj', 'R') },
      { type: 'quiz', title: 'Vérifions', questions: [
        { q: 'Quelle est la recette de la gamme majeure ?', c: ['T – T – ½ – T – T – T – ½', 'T – ½ – T – T – ½ – T – T', 'T – T – T – ½ – T – T – ½'], a: 0 },
        { q: 'Quelle altération contient la gamme de Sol majeur ?', c: ['Fa♯', 'Si♭', 'Aucune'], a: 0 },
        { q: 'Et la gamme de Fa majeur ?', c: ['Fa♯', 'Si♭', 'Do♯'], a: 1 },
        { q: 'En Do majeur à la main droite, quel doigt joue le Fa (la 4ᵉ note) ?', c: ['L\'annulaire (4)', 'Le pouce (1), qui passe sous la main'], a: 1 }] },
    ],
  },
  {
    id: 'armures', ch: 3, title: 'Armures et tonalités', min: 12,
    goal: 'Savoir dans quelle tonalité est un morceau d\'un simple coup d\'œil.',
    body: [
      `<p>Un morceau en Sol majeur utilise des Fa♯ partout. Plutôt que de les écrire un par un, on note le dièse <b>une fois pour toutes</b> au début de chaque portée, juste après la clé : c'est l'<b>armure</b>.</p>
       <p>L'armure vaut pour <b>tout le morceau</b> et pour <b>toutes les octaves</b> : avec un Fa♯ à la clé, tous les Fa se jouent Fa♯, graves comme aigus (sauf bécarre).</p>`,
      { row: [
        { fig: { fifths: 1, parts: ['G4:w'], names: true }, cap: '1 dièse : Sol majeur' },
        { fig: { fifths: 2, parts: ['D4:w'], names: true }, cap: '2 dièses : Ré majeur' },
        { fig: { fifths: -1, parts: ['F4:w'], names: true }, cap: '1 bémol : Fa majeur' },
        { fig: { fifths: -2, parts: ['Bb4:w'], names: true }, cap: '2 bémols : Si♭ majeur' }] },
      `<h3>Toujours dans le même ordre</h3>
       <ul><li>Ordre des <b>dièses</b> : <b>Fa – Do – Sol – Ré – La – Mi – Si</b>.</li>
       <li>Ordre des <b>bémols</b>, exactement l'inverse : <b>Si – Mi – La – Ré – Sol – Do – Fa</b>.</li></ul>
       <p>Une armure à 3 dièses contient donc forcément Fa♯, Do♯ et Sol♯.</p>
       <h3>Trouver la tonalité majeure</h3>
       <ul><li><b>Rien à la clé</b> : Do majeur.</li>
       <li><b>Des dièses</b> : la tonique est un demi-ton <b>au-dessus du dernier dièse</b>. Dernier dièse Do♯ → Ré majeur.</li>
       <li><b>Des bémols</b> : la tonalité porte le nom de l'<b>avant-dernier bémol</b>. Si♭ et Mi♭ → Si♭ majeur. Un seul bémol : Fa majeur, à retenir par cœur.</li></ul>
       <h3>Le cycle des quintes</h3>
       <p>En montant de quinte en quinte (cinq notes) à partir de Do, on ajoute <b>un dièse</b> à chaque étape : Do → Sol → Ré → La → Mi → Si. En descendant de quinte en quinte, on ajoute <b>un bémol</b> : Do → Fa → Si♭ → Mi♭ → La♭ → Ré♭.</p>
       <table><tr><th>À la clé</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
       <tr><td><b>Dièses</b></td><td>Do</td><td>Sol</td><td>Ré</td><td>La</td><td>Mi</td><td>Si</td></tr>
       <tr><td><b>Bémols</b></td><td>Do</td><td>Fa</td><td>Si♭</td><td>Mi♭</td><td>La♭</td><td>Ré♭</td></tr></table>`,
    ],
    ex: [
      { type: 'quiz', title: 'Reconnaître les tonalités', questions: [
        { q: 'Quel est l\'ordre des dièses ?', c: ['Fa Do Sol Ré La Mi Si', 'Si Mi La Ré Sol Do Fa', 'Do Ré Mi Fa Sol La Si'], a: 0 },
        { q: 'Une armure avec 2 dièses (Fa♯ et Do♯) : quelle tonalité majeure ?', c: ['Sol majeur', 'Ré majeur', 'La majeur'], a: 1, why: 'Un demi-ton au-dessus du dernier dièse (Do♯) : Ré.' },
        { q: 'Une armure avec 1 bémol (Si♭) ?', c: ['Fa majeur', 'Si♭ majeur', 'Do majeur'], a: 0 },
        { q: 'Une armure avec 3 bémols (Si♭, Mi♭, La♭) ?', c: ['Mi♭ majeur', 'La♭ majeur', 'Si♭ majeur'], a: 0, why: 'L\'avant-dernier bémol donne le nom : Mi♭.' },
        { q: 'L\'armure indique un Fa♯. Tu rencontres un Fa très aigu, deux octaves plus haut. Tu joues…', c: ['Fa naturel', 'Fa♯'], a: 1, why: 'L\'armure vaut pour toutes les octaves.' },
        { q: '3 dièses à la clé ?', c: ['La majeur', 'Mi majeur', 'Ré majeur'], a: 0, why: 'Fa♯, Do♯, Sol♯ : un demi-ton au-dessus de Sol♯, c\'est La.' }] },
      { type: 'read', title: 'Lecture en Sol majeur : pense au Fa♯', clefs: ['G'], range: [['D4', 'G5']], count: 12, fifths: 1 },
      { type: 'read', title: 'Lecture en Fa majeur : pense au Si♭', clefs: ['G'], range: [['C4', 'F5']], count: 12, fifths: -1 },
    ],
  },
  {
    id: 'mineur', ch: 3, title: 'Le mode mineur', min: 10,
    goal: 'Distinguer majeur et mineur, et jouer La mineur.',
    body: [
      `<p>Le <b>mode majeur</b> sonne plutôt clair et affirmé ; le <b>mode mineur</b>, plus sombre ou mélancolique. La différence tient, là encore, à la place des demi-tons.</p>
       <h3>La relative mineure</h3>
       <p>Chaque gamme majeure a une sœur mineure qui utilise <b>exactement les mêmes notes</b> — donc la <b>même armure</b> — mais commence <b>trois demi-tons plus bas</b> (sur la 6ᵉ note de la gamme majeure). On l'appelle sa <b>relative mineure</b>.</p>
       <ul><li>Do majeur ↔ <b>La mineur</b> (rien à la clé)</li><li>Sol majeur ↔ <b>Mi mineur</b> (Fa♯)</li><li>Fa majeur ↔ <b>Ré mineur</b> (Si♭)</li></ul>
       <h3>Trois variantes</h3>
       <ul><li><b>Mineur naturel</b> : les notes de l'armure, sans rien changer. La, Si, Do, Ré, Mi, Fa, Sol, La.</li>
       <li><b>Mineur harmonique</b> : on <b>monte la 7ᵉ note d'un demi-ton</b> (Sol♯ en La mineur) pour retrouver une sensible, qui attire vers la tonique. C'est la forme la plus courante. Cette altération s'écrit devant la note, jamais à l'armure.</li>
       <li><b>Mineur mélodique</b> : en montant, on hausse la 6ᵉ et la 7ᵉ ; en descendant, on revient au mineur naturel.</li></ul>`,
      { fig: { names: true, parts: ['A4 B4 C5 D5 | E5 F5 G#5 A5'] }, cap: 'La mineur harmonique : le Sol♯ est la signature sonore du mode mineur.' },
      `<div class="tip"><b>Majeur ou relatif mineur ?</b> Même armure, donc il faut d'autres indices : regarde la <b>dernière note</b> du morceau (c'est très souvent la tonique) et cherche une <b>sensible altérée</b> (un Sol♯ sans rien à la clé trahit La mineur).</div>`,
    ],
    ex: [
      { type: 'score', title: 'La mineur naturel, main droite', make: () => Gen.scale(0, 'nat', 'R') },
      { type: 'score', title: 'La mineur harmonique, main droite', make: () => Gen.scale(0, 'harm', 'R') },
      { type: 'score', title: 'La mineur harmonique, main gauche', make: () => Gen.scale(0, 'harm', 'L') },
      { type: 'quiz', title: 'Vérifions', questions: [
        { q: 'Quelle est la relative mineure de Do majeur ?', c: ['La mineur', 'Mi mineur', 'Ré mineur'], a: 0 },
        { q: 'Do majeur et La mineur ont…', c: ['la même armure', 'des armures différentes'], a: 0 },
        { q: 'En La mineur harmonique, quelle note est haussée ?', c: ['Fa♯', 'Sol♯', 'Do♯'], a: 1 },
        { q: 'Quelle est la relative mineure de Sol majeur ?', c: ['Mi mineur', 'Si mineur', 'Ré mineur'], a: 0 },
        { q: 'Pour trouver la relative mineure d\'une gamme majeure, on descend de…', c: ['3 demi-tons', '5 demi-tons', 'une octave'], a: 0 }] },
    ],
  },

  /* ================= Chapitre 5 ================= */
  {
    id: 'intervalles', ch: 4, title: 'Les intervalles', min: 10,
    goal: 'Mesurer la distance entre deux notes, à l\'œil et sous les doigts.',
    body: [
      `<p>Un <b>intervalle</b> est la distance entre deux notes. Pour le nommer, on <b>compte les noms de notes</b>, en incluant celle de départ et celle d'arrivée : de Do à Mi, il y a Do, Ré, Mi → trois noms → une <b>tierce</b>.</p>
       <table><tr><th>Noms comptés</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th></tr>
       <tr><td><b>Intervalle</b></td><td>seconde</td><td>tierce</td><td>quarte</td><td>quinte</td><td>sixte</td><td>septième</td><td>octave</td></tr></table>`,
      { fig: { parts: ['C4+D4:w=2de | C4+E4:w=3ce | C4+F4:w=4te | C4+G4:w=5te | C4+A4:w=6te | C4+B4:w=7e | C4+C5:w=8ve'] }, cap: 'Les intervalles à partir du Do central.' },
      `<h3>Les reconnaître sur la portée</h3>
       <ul><li><b>Seconde</b> : une ligne et l'interligne voisin — les deux notes se touchent.</li>
       <li><b>Tierce</b> : deux lignes voisines, ou deux interlignes voisins.</li>
       <li><b>Quinte</b> : de ligne à ligne en en sautant une (ou pareil avec les interlignes).</li>
       <li>Les intervalles <b>impairs</b> (3, 5, 7) vont de ligne à ligne ou d'interligne à interligne ; les <b>pairs</b> (2, 4, 6, 8) de ligne à interligne.</li></ul>
       <h3>Majeur, mineur, juste</h3>
       <p>Deux tierces n'ont pas forcément la même taille : Do–Mi fait 4 demi-tons (<b>tierce majeure</b>), Ré–Fa seulement 3 (<b>tierce mineure</b>). On précise donc la <b>qualité</b> de l'intervalle :</p>
       <table><tr><th>Intervalle</th><th>Demi-tons</th><th>Exemple</th></tr>
       <tr><td>Seconde mineure / majeure</td><td>1 / 2</td><td>Mi–Fa / Do–Ré</td></tr>
       <tr><td>Tierce mineure / majeure</td><td>3 / 4</td><td>Ré–Fa / Do–Mi</td></tr>
       <tr><td>Quarte juste</td><td>5</td><td>Do–Fa</td></tr>
       <tr><td>Quinte juste</td><td>7</td><td>Do–Sol</td></tr>
       <tr><td>Sixte mineure / majeure</td><td>8 / 9</td><td>Mi–Do / Do–La</td></tr>
       <tr><td>Septième mineure / majeure</td><td>10 / 11</td><td>Ré–Do / Do–Si</td></tr>
       <tr><td>Octave juste</td><td>12</td><td>Do–Do</td></tr></table>
       <div class="tip">Lire par intervalles — « ça monte d'une tierce, ça redescend d'une seconde » — est le secret d'un déchiffrage rapide : on n'a plus besoin de nommer chaque note.</div>`,
    ],
    ex: [
      { type: 'find', title: 'Joue les intervalles à partir du Do central', items: [
        { n: 'E4', exact: true, say: 'la note une tierce au-dessus du Do central' }, { n: 'G4', exact: true, say: 'la note une quinte au-dessus du Do central' },
        { n: 'F4', exact: true, say: 'la note une quarte au-dessus du Do central' }, { n: 'D4', exact: true, say: 'la note une seconde au-dessus du Do central' },
        { n: 'C5', exact: true, say: 'la note une octave au-dessus du Do central' }, { n: 'A4', exact: true, say: 'la note une sixte au-dessus du Do central' },
        { n: 'A3', exact: true, say: 'la note une tierce en dessous du Do central' }, { n: 'Eb4', exact: true, say: 'la note une tierce mineure (3 demi-tons) au-dessus du Do central' }] },
      { type: 'quiz', title: 'Vérifions', questions: [
        { q: 'Quel intervalle sépare Do et Mi ?', c: ['Une seconde', 'Une tierce', 'Une quarte'], a: 1 },
        { q: 'Et de Do à Sol ?', c: ['Une quarte', 'Une quinte', 'Une sixte'], a: 1 },
        { q: 'Deux notes posées sur deux lignes voisines de la portée forment…', c: ['une seconde', 'une tierce', 'une quinte'], a: 1 },
        { q: 'Combien de demi-tons dans une tierce majeure ?', c: ['3', '4', '5'], a: 1 },
        { q: 'Mi → Fa est une seconde…', c: ['majeure (un ton)', 'mineure (un demi-ton)'], a: 1 },
        { q: 'Combien de demi-tons dans une quinte juste ?', c: ['5', '6', '7'], a: 2 }] },
    ],
  },
  {
    id: 'accords', ch: 4, title: 'Les accords', min: 12,
    goal: 'Construire et jouer les accords majeurs et mineurs.',
    body: [
      `<p>Un <b>accord</b>, ce sont au moins trois notes jouées <b>en même temps</b>. Sur la partition, elles sont empilées sur la même hampe.</p>
       <h3>L'accord parfait</h3>
       <p>C'est l'accord de base : on empile <b>deux tierces</b>, en prenant une note sur deux. Ses trois notes s'appellent la <b>fondamentale</b>, la <b>tierce</b> et la <b>quinte</b>.</p>
       <ul><li><b>Accord majeur</b> : tierce majeure (4 demi-tons) puis tierce mineure (3). Exemple : Do – Mi – Sol.</li>
       <li><b>Accord mineur</b> : l'inverse, tierce mineure puis tierce majeure. Exemples : Do – Mi♭ – Sol, ou La – Do – Mi.</li></ul>
       <p>Une seule note change — la tierce, plus basse d'un demi-ton — et toute la couleur bascule.</p>`,
      { fig: { parts: ['C4+E4+G4:w=Do_majeur | C4+Eb4+G4:w=Do_mineur | A3+C4+E4:w=La_mineur'] } },
      `<h3>Les renversements</h3>
       <p>Les mêmes notes dans un autre ordre donnent le même accord, sous une autre forme :</p>`,
      { fig: { parts: ['C4+E4+G4:w=fondamental | E4+G4+C5:w=1er_renversement | G4+C5+E5:w=2e_renversement'] }, cap: 'Do majeur sous ses trois formes. Les renversements évitent de grands déplacements de la main.' },
      `<h3>Trois accords pour presque tout accompagner</h3>
       <p>Dans une tonalité, les accords construits sur les degrés <b>I</b>, <b>IV</b> et <b>V</b> (1ʳᵉ, 4ᵉ et 5ᵉ notes de la gamme) sont les piliers. En Do majeur : <b>Do</b>, <b>Fa</b> et <b>Sol</b>. Des milliers de chansons n'utilisent rien d'autre.</p>
       <div class="tip"><b>Doigté habituel :</b> 1 – 3 – 5 à la main droite, 5 – 3 – 1 à la main gauche. Un <b>arpège</b>, c'est le même accord dont on joue les notes l'une après l'autre.</div>`,
    ],
    ex: [
      { type: 'find', title: 'Joue les accords (les trois notes ensemble)', items: [
        { chord: ['C', 'E', 'G'], say: 'l\'accord de Do majeur (Do – Mi – Sol)' }, { chord: ['F', 'A', 'C'], say: 'l\'accord de Fa majeur (Fa – La – Do)' },
        { chord: ['G', 'B', 'D'], say: 'l\'accord de Sol majeur (Sol – Si – Ré)' }, { chord: ['A', 'C', 'E'], say: 'l\'accord de La mineur (La – Do – Mi)' },
        { chord: ['D', 'F', 'A'], say: 'l\'accord de Ré mineur (Ré – Fa – La)' }, { chord: ['E', 'G', 'B'], say: 'l\'accord de Mi mineur (Mi – Sol – Si)' },
        { chord: ['C', 'Eb', 'G'], say: 'l\'accord de Do mineur (Do – Mi♭ – Sol)' }] },
      { type: 'score', title: 'Do majeur et ses renversements', make: () => Gen.chords(0, false, 'inv', 'R') },
      { type: 'score', title: 'La cadence I – IV – V – I en Do majeur', make: () => Gen.chords(0, false, 'cad', 'R') },
      { type: 'quiz', title: 'Vérifions', questions: [
        { q: 'De quelles notes est fait l\'accord de Do majeur ?', c: ['Do – Mi – Sol', 'Do – Fa – La', 'Do – Ré – Mi'], a: 0 },
        { q: 'Qu\'est-ce qui distingue un accord mineur d\'un accord majeur ?', c: ['Sa tierce est plus basse d\'un demi-ton', 'Sa quinte est plus haute', 'Il a quatre notes'], a: 0 },
        { q: 'Mi – Sol – Do, c\'est…', c: ['un autre accord', 'l\'accord de Do majeur, renversé'], a: 1 },
        { q: 'Quels sont les trois accords principaux en Do majeur (degrés I, IV, V) ?', c: ['Do, Fa, Sol', 'Do, Ré, Mi', 'Do, Mi, Sol'], a: 0 },
        { q: 'Un arpège, c\'est…', c: ['les notes d\'un accord jouées l\'une après l\'autre', 'un accord joué très fort'], a: 0 }] },
    ],
  },
  {
    id: 'expression', ch: 4, title: 'Nuances, articulations et signes', min: 10,
    goal: 'Comprendre tous les petits signes qui entourent les notes.',
    body: [
      `<p>Jouer les bonnes notes au bon moment ne suffit pas à faire de la musique : la partition indique aussi <b>comment</b> jouer.</p>
       <h3>Les nuances (le volume)</h3>
       <table><tr><th>Signe</th><th>Mot italien</th><th>Sens</th></tr>
       <tr><td><b><i>pp</i></b></td><td>pianissimo</td><td>très doux</td></tr><tr><td><b><i>p</i></b></td><td>piano</td><td>doux</td></tr>
       <tr><td><b><i>mp</i></b></td><td>mezzo-piano</td><td>moyennement doux</td></tr><tr><td><b><i>mf</i></b></td><td>mezzo-forte</td><td>moyennement fort</td></tr>
       <tr><td><b><i>f</i></b></td><td>forte</td><td>fort</td></tr><tr><td><b><i>ff</i></b></td><td>fortissimo</td><td>très fort</td></tr></table>
       <p><b>Crescendo</b> (<i>cresc.</i> ou un soufflet qui s'ouvre « &lt; ») : de plus en plus fort. <b>Decrescendo</b> ou <b>diminuendo</b> (soufflet qui se ferme « &gt; ») : de plus en plus doux.</p>
       <h3>Les articulations (la manière d'attaquer)</h3>
       <ul><li><b>Staccato</b> — un point au-dessus ou en dessous de la note : détaché, bref.</li>
       <li><b>Legato</b> — une liaison au-dessus de plusieurs notes : lié, sans trou.</li>
       <li><b>Accent</b> — un petit « &gt; » sur la note : on l'appuie.</li>
       <li><b>Point d'orgue</b> — un demi-cercle avec un point : on tient la note plus longtemps, à volonté.</li></ul>
       <h3>Le tempo</h3>
       <p>Du plus lent au plus rapide : <b>Largo</b>, <b>Adagio</b>, <b>Andante</b> (allant), <b>Moderato</b>, <b>Allegro</b>, <b>Presto</b>. En cours de route : <b>rit.</b> (ritardando, ralentir), <b>accel.</b> (accélérer), <b>a tempo</b> (reprendre la vitesse initiale).</p>
       <h3>Le plan du morceau</h3>
       <ul><li><b>Barres de reprise</b> (double barre avec deux points) : on rejoue le passage encadré.</li>
       <li><b>Boîtes de 1ʳᵉ et 2ᵉ fois</b> : la première fois on joue la boîte 1, à la reprise on saute directement à la boîte 2.</li>
       <li><b>D.C.</b> (da capo) : reprendre au début. <b>Fine</b> : la vraie fin. <b>Coda</b> : le passage de conclusion.</li></ul>
       <h3>Et aussi</h3>
       <ul><li><b>Ped.</b> … ✱ : appuyer puis relâcher la pédale de droite, qui laisse résonner les notes.</li>
       <li><b>8va</b> : jouer une octave plus haut que ce qui est écrit.</li></ul>
       <div class="tip">Tu as maintenant toutes les bases du solfège. La suite, c'est de la pratique : un peu de <b>lecture de notes</b> et de <b>déchiffrage</b> chaque jour, et des <b>morceaux</b> qui te font envie.</div>`,
    ],
    ex: [
      { type: 'quiz', title: 'Le grand quiz des signes', questions: [
        { q: 'Que signifie « p » sur une partition ?', c: ['Piano : doux', 'Presto : rapide', 'Pédale'], a: 0 },
        { q: 'Et « ff » ?', c: ['Très doux', 'Très fort', 'Très vite'], a: 1 },
        { q: 'Un point au-dessus ou en dessous d\'une note (staccato) demande de la jouer…', c: ['détachée et brève', 'plus longue', 'plus fort'], a: 0 },
        { q: 'Crescendo veut dire…', c: ['de plus en plus fort', 'de plus en plus lent', 'de plus en plus vite'], a: 0 },
        { q: 'Laquelle de ces indications est la plus rapide ?', c: ['Adagio', 'Andante', 'Allegro'], a: 2 },
        { q: '« rit. » (ritardando) signifie…', c: ['ralentir progressivement', 'répéter', 'renforcer'], a: 0 },
        { q: 'Des barres de reprise indiquent de…', c: ['rejouer le passage', 's\'arrêter', 'changer de main'], a: 0 },
        { q: 'Le point d\'orgue au-dessus d\'une note…', c: ['permet de la tenir plus longtemps', 'la raccourcit', 'la répète'], a: 0 }] },
    ],
  },
];
