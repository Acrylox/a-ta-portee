'use strict';
/* Morceaux intégrés : mélodies traditionnelles et œuvres du domaine public, en arrangements simples.
   parts[0] = main droite, parts[1] = main gauche (notation décrite dans musicxml.js). */

const PIECES = (() => {
  /* Prélude en Do de Bach : chaque mesure répète deux fois un motif de 5 notes (2 à la main gauche, 3 à la droite). */
  const preludeBars = ['C4 E4 G4 C5 E5', 'C4 D4 A4 D5 F5', 'B3 D4 G4 D5 F5', 'C4 E4 G4 C5 E5', 'C4 E4 A4 E5 A5', 'C4 D4 F#4 A4 D5', 'B3 D4 G4 D5 G5', 'B3 C4 E4 G4 C5', 'A3 C4 E4 G4 C5', 'D3 A3 D4 F#4 C5', 'G3 B3 D4 G4 B4'];
  const twice = s => s + ' ' + s;
  const preludeR = preludeBars.map(b => { const n = b.split(' '); return twice(`r:e ${n[2]}:s ${n[3]}:s ${n[4]}:s ${n[2]}:s ${n[3]}:s ${n[4]}:s`); }).join(' | ') + ' | E4+G4+C5:w';
  const preludeL = preludeBars.map(b => { const n = b.split(' '); return twice(`${n[0]}:s ${n[1]}:s r:e r:q`); }).join(' | ') + ' | C3:w';

  /* Hanon n° 1 : un motif de 8 doubles croches qui monte d'un degré à chaque mesure, puis redescend. */
  const hanon = shift => {
    const bar = (start, pat) => pat.map(o => Notes.str(Notes.fromDia(start + o + shift)) + ':s').join(' ');
    const up = [0, 1, 2, 3, 4, 5, 6, 7].map(d => bar(28 + d, [0, 2, 3, 4, 5, 4, 3, 2]));
    const down = [11, 10, 9, 8, 7, 6, 5, 4].map(d => bar(28 + d, [0, -2, -3, -4, -5, -4, -3, -2]));
    return up.concat(down).join(' | ') + ' | ' + Notes.str(Notes.fromDia(28 + shift)) + ':h';
  };

  return [
    {
      id: 'clair-de-la-lune', title: 'Au clair de la lune', composer: 'Traditionnel', level: 1, tempo: 92, time: [4, 4],
      parts: [
        'C4 C4 C4 D4 | E4:h D4:h | C4 E4 D4 D4 | C4:w | C4 C4 C4 D4 | E4:h D4:h | C4 E4 D4 D4 | C4:w | D4 D4 D4 D4 | A3:h A3:h | D4 C4 B3 A3 | G3:w | C4 C4 C4 D4 | E4:h D4:h | C4 E4 D4 D4 | C4:w',
        'C3:w | C3:h G2:h | C3:h G2:h | C3:w | C3:w | C3:h G2:h | C3:h G2:h | C3:w | G2:w | D3:w | G2:h D3:h | G2:w | C3:w | C3:h G2:h | C3:h G2:h | C3:w'],
    },
    {
      id: 'frere-jacques', title: 'Frère Jacques', composer: 'Traditionnel', level: 1, tempo: 100, time: [4, 4],
      parts: [
        'C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:h | E4 F4 G4:h | G4:e A4:e G4:e F4:e E4 C4 | G4:e A4:e G4:e F4:e E4 C4 | C4 G3 C4:h | C4 G3 C4:h',
        'C3:h G2:h | C3:h G2:h | C3:h G2:h | C3:h G2:h | C3:h G2:h | C3:h G2:h | C3:h G2:h | C3:w'],
    },
    {
      id: 'ah-vous-dirai-je', title: 'Ah ! vous dirai-je, maman', composer: 'Traditionnel', level: 1, tempo: 96, time: [4, 4],
      parts: [
        'C4 C4 G4 G4 | A4 A4 G4:h | F4 F4 E4 E4 | D4 D4 C4:h | G4 G4 F4 F4 | E4 E4 D4:h | G4 G4 F4 F4 | E4 E4 D4:h | C4 C4 G4 G4 | A4 A4 G4:h | F4 F4 E4 E4 | D4 D4 C4:h',
        'C3:w | F3:h C3:h | F3:h C3:h | G2:h C3:h | C3:h F3:h | C3:h G2:h | C3:h F3:h | C3:h G2:h | C3:w | F3:h C3:h | F3:h C3:h | G2:h C3:h'],
    },
    {
      id: 'ode-a-la-joie', title: 'Ode à la joie', composer: 'Ludwig van Beethoven', level: 2, tempo: 100, time: [4, 4],
      parts: [
        'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:q. D4:e D4:h | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:q. C4:e C4:h | D4 D4 E4 C4 | D4 E4:e F4:e E4 C4 | D4 E4:e F4:e E4 D4 | C4 D4 G3:h | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:q. C4:e C4:h',
        'C3:w | G2:w | C3:w | G2:w | C3:w | G2:w | C3:w | G2:h C3:h | G2:w | G2:h C3:h | G2:w | C3:h G2:h | C3:w | G2:w | C3:w | G2:h C3:h'],
    },
    {
      id: 'pont-d-avignon', title: 'Sur le pont d\'Avignon', composer: 'Traditionnel', level: 2, tempo: 88, time: [2, 4],
      parts: [
        'C4:e C4:e C4 | D4:e D4:e D4 | E4:e F4:e G4:e C4:e | B3:e C4:e D4:e G3:e | C4:e C4:e C4 | D4:e D4:e D4 | E4:e F4:e G4:e C4:e | D4:e B3:e C4',
        'C3:h | G2:h | C3:h | G2:h | C3:h | G2:h | C3:h | G2 C3'],
    },
    {
      id: 'vive-le-vent', title: 'Vive le vent (Jingle Bells)', composer: 'James Pierpont', level: 2, tempo: 108, time: [4, 4],
      parts: [
        'E4 E4 E4:h | E4 E4 E4:h | E4 G4 C4:q. D4:e | E4:w | F4 F4 F4:q. F4:e | F4 E4 E4 E4:e E4:e | E4 D4 D4 E4 | D4:h G4:h | E4 E4 E4:h | E4 E4 E4:h | E4 G4 C4:q. D4:e | E4:w | F4 F4 F4:q. F4:e | F4 E4 E4 E4:e E4:e | G4 G4 F4 D4 | C4:w',
        'C3:w | C3:w | C3:w | C3:w | F3:w | C3:w | G2:w | G2:w | C3:w | C3:w | C3:w | C3:w | F3:w | C3:w | G2:w | C3:w'],
    },
    {
      id: 'joyeux-anniversaire', title: 'Joyeux anniversaire', composer: 'Traditionnel', level: 2, tempo: 96, time: [3, 4],
      parts: [
        'G4:e. G4:s | A4 G4 C5 | B4:h G4:e. G4:s | A4 G4 D5 | C5:h G4:e. G4:s | G5 E5 C5 | B4 A4 F5:e. F5:s | E5 C5 D5 | C5:h.',
        'r:q | C3:h. | G2:h. | G2:h. | C3:h. | C3:h. | F3:h. | C3:h G2 | C3:h.'],
    },
    {
      id: 'menuet-sol', title: 'Menuet en Sol', composer: 'Christian Petzold (Petit livre d\'Anna Magdalena Bach)', level: 3, tempo: 104, time: [3, 4], fifths: 1,
      parts: [
        'D5 G4:e A4:e B4:e C5:e | D5 G4 G4 | E5 C5:e D5:e E5:e F#5:e | G5 G4 G4 | C5 D5:e C5:e B4:e A4:e | B4 C5:e B4:e A4:e G4:e | F#4 G4:e A4:e B4:e G4:e | B4 A4:h | D5 G4:e A4:e B4:e C5:e | D5 G4 G4 | E5 C5:e D5:e E5:e F#5:e | G5 G4 G4 | C5 D5:e C5:e B4:e A4:e | B4 C5:e B4:e A4:e G4:e | A4 B4:e A4:e G4:e F#4:e | G4:h.',
        'G3:h A3 | B3:h. | C4:h. | B3:h. | A3:h. | G3:h. | D4 B3 G3 | D4 D3:e C4:e B3:e A3:e | B3:h A3 | G3 B3 G3 | C4:h. | B3 C4:e B3:e A3:e G3:e | A3:h F#3 | G3:h B3 | C4 D4 D3 | G3:h G2'],
    },
    {
      id: 'hanon-1', title: 'Hanon n° 1 (exercice de vélocité)', composer: 'Charles-Louis Hanon', level: 3, tempo: 60, time: [2, 4],
      parts: [hanon(0), hanon(-14)],
    },
    {
      id: 'prelude-do', title: 'Prélude en Do majeur (début)', composer: 'Johann Sebastian Bach, BWV 846 — version simplifiée', level: 4, tempo: 66, time: [4, 4],
      parts: [preludeR, preludeL],
    },
    {
      id: 'lettre-a-elise', title: 'La Lettre à Élise (thème)', composer: 'Ludwig van Beethoven', level: 4, tempo: 60, time: [3, 8], minor: true,
      parts: [
        'E5:s D#5:s | E5:s D#5:s E5:s B4:s D5:s C5:s | A4:e r:s C4:s E4:s A4:s | B4:e r:s E4:s G#4:s B4:s | C5:e r:s E4:s E5:s D#5:s | E5:s D#5:s E5:s B4:s D5:s C5:s | A4:e r:s C4:s E4:s A4:s | B4:e r:s E4:s C5:s B4:s | A4:q.',
        'r:e | r:q. | A2:s E3:s A3:s r:s r:e | E2:s E3:s G#3:s r:s r:e | A2:s E3:s A3:s r:s r:e | r:q. | A2:s E3:s A3:s r:s r:e | E2:s E3:s G#3:s r:s r:e | A2:s E3:s A3:s r:s r:e'],
    },
  ];
})();
