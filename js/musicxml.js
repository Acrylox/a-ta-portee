'use strict';
/* Fabrique du MusicXML à partir d'une notation texte compacte, et convertit les fichiers MIDI.

   Notation texte : jetons séparés par des espaces, « | » pour les barres de mesure.
     C4:q      note (Do central), durée w h q e s (ronde, blanche, noire, croche, double) ; « . » = pointée
     E4+G4:h   accord        r:q  silence        C4:h~  liée à la note suivante
     C4:q@1    doigté        C4:w=Do  texte sous la note (« _ » = espace)
   Les durées sont comptées en doubles croches (noire = 4). */

const MX = {
  DUR: { w: 16, h: 8, q: 4, e: 2, s: 1 },
  TYPE: { 16: ['whole', 0], 12: ['half', 1], 8: ['half', 0], 6: ['quarter', 1], 4: ['quarter', 0], 3: ['eighth', 1], 2: ['eighth', 0], 1: ['16th', 0] },
  esc(s) { return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); },

  parse(str) {
    const bars = [[]];
    let tied = false;
    for (const tok of str.trim().split(/\s+/)) {
      if (tok === '|') { bars.push([]); continue; }
      const m = /^([^:@=~]+)(?::([whqes])(\.)?)?(~)?(?:@([\d,]+))?(?:=(.+))?$/.exec(tok);
      if (!m) throw new Error('Notation invalide : ' + tok);
      const ev = { d: this.DUR[m[2] || 'q'] * (m[3] ? 1.5 : 1) };
      if (m[1] !== 'r') {
        ev.p = m[1].split('+').map(s => Notes.parse(s));
        if (tied && m[4]) ev.tie = 'both'; else if (tied) ev.tie = 'stop'; else if (m[4]) ev.tie = 'start';
        tied = !!m[4];
        if (m[5]) ev.f = m[5].split(',').map(Number);
        if (m[6]) ev.l = m[6].replace(/_/g, ' ');
      } else tied = false;
      bars[bars.length - 1].push(ev);
    }
    return bars;
  },
  autoBars(evs, len) {
    const out = [[]];
    let pos = 0;
    for (const e of evs) {
      if (pos >= len) { out.push([]); pos = 0; }
      out[out.length - 1].push(e); pos += e.d;
    }
    return out;
  },

  /* { title, fifths, time, tempo, clefs, parts: ['main droite', 'main gauche'] } → modèle de partition */
  piece(def) {
    const time = def.time || [4, 4], len = time[0] * 16 / time[1];
    const staves = def.parts.map(s => { const bars = this.parse(s); return bars.length > 1 ? bars : this.autoBars(bars[0], len); });
    const n = Math.max(...staves.map(b => b.length)), measures = [];
    for (let i = 0; i < n; i++) {
      const row = staves.map(b => b[i] || null);
      const mlen = Math.max(...row.map(evs => evs ? sum(evs.map(e => e.d)) : 0)) || len;
      measures.push(row.map((evs, k) => {
        if (!evs) return [{ d: mlen }];
        const l = sum(evs.map(e => e.d));
        if (l !== mlen || (l !== len && i > 0 && i < n - 1)) console.warn(`[${def.title || 'partition'}] portée ${k + 1}, mesure ${i + 1} : durée ${l}, attendu ${l !== mlen ? mlen : len}`);
        return l < mlen ? evs.concat([{ d: mlen - l, hidden: true }]) : evs;
      }));
    }
    return { title: def.title, fifths: def.fifths || 0, minor: !!def.minor, time, tempo: def.tempo, clefs: def.clefs || (def.parts.length > 1 ? ['G', 'F'] : ['G']), measures };
  },

  /* Ligatures : les croches et doubles croches d'un même temps sont reliées (par groupes de 3 croches en 6/8). */
  beams(evs, time) {
    const G = time[1] === 8 && time[0] % 3 === 0 ? 6 : 4, out = evs.map(() => null);
    let pos = 0, run = [], runPos = 0;
    const flush = () => {
      if (run.length > 1) run.forEach((i, k) => { out[i] = k === 0 ? 'begin' : k === run.length - 1 ? 'end' : 'continue'; });
      run = [];
    };
    evs.forEach((e, i) => {
      const ok = !!e.p && e.d <= 3;
      if (ok && run.length && Math.floor(pos / G) !== Math.floor(runPos / G)) flush();
      if (ok) { if (!run.length) runPos = pos; run.push(i); } else flush();
      pos += e.d;
    });
    flush();
    return out;
  },

  /* Triolets : repère le début et la fin de chaque groupe (événements marqués tu, durée 4/3 pour une croche de triolet). */
  tuplets(evs) {
    const out = evs.map(() => null);
    let acc = 0, open = false;
    evs.forEach((e, i) => {
      if (!e.tu) { open = false; acc = 0; return; }
      if (!open) { out[i] = 'start'; open = true; acc = 0; }
      acc += e.d;
      if (Math.abs(acc / 4 - Math.round(acc / 4)) < 1e-6) { if (out[i] !== 'start') out[i] = 'stop'; open = false; acc = 0; }
    });
    return out;
  },

  /* modèle → chaîne MusicXML. modèle.measures[i][portée] = [{ d, p?, tie?, f?, l?, hidden?, tu? }]
     Les durées du fichier sont en douzièmes de noire, pour pouvoir écrire les triolets. */
  build(sc) {
    const time = sc.time || [4, 4], len = time[0] * 16 / time[1], clefs = sc.clefs || ['G'];
    const mlen = evs => sum(evs.map(e => e.d)), D = d => Math.round(d * 3);
    const pickup = sc.measures.length > 1 && Math.max(...sc.measures[0].map(mlen)) < len - 1e-6;
    const out = ['<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1">',
      `<work><work-title>${this.esc(sc.title || '')}</work-title></work>`,
      '<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">'];
    sc.measures.forEach((staves, i) => {
      out.push(`<measure number="${pickup ? i : i + 1}"${pickup && i === 0 ? ' implicit="yes"' : ''}>`);
      if (i === 0) {
        out.push(`<attributes><divisions>12</divisions><key><fifths>${sc.fifths || 0}</fifths><mode>${sc.minor ? 'minor' : 'major'}</mode></key><time><beats>${time[0]}</beats><beat-type>${time[1]}</beat-type></time>`);
        if (clefs.length > 1) out.push(`<staves>${clefs.length}</staves>`);
        clefs.forEach((c, k) => out.push(`<clef number="${k + 1}"><sign>${c}</sign><line>${c === 'F' ? 4 : 2}</line></clef>`));
        out.push('</attributes>');
        if (sc.tempo) out.push(`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${sc.tempo}</per-minute></metronome></direction-type><staff>1</staff><sound tempo="${sc.tempo}"/></direction>`);
      }
      staves.forEach((evs, k) => {
        if (k > 0) out.push(`<backup><duration>${D(mlen(staves[k - 1]))}</duration></backup>`);
        const whole = evs.length === 1 && !evs[0].p && !evs[0].hidden, beam = this.beams(evs, time), tup = this.tuplets(evs);
        evs.forEach((e, ei) => {
          if (!e.p && e.hidden) { out.push(`<forward><duration>${D(e.d)}</duration></forward>`); return; }
          const [type, dots] = this.TYPE[e.tu ? Math.round(e.d * 1.5) : e.d] || ['quarter', 0];
          (e.p || [null]).forEach((p, j) => {
            let x = '<note>';
            if (j > 0) x += '<chord/>';
            x += p ? `<pitch><step>${p.step}</step>${p.alter ? `<alter>${p.alter}</alter>` : ''}<octave>${p.octave}</octave></pitch>` : (whole ? '<rest measure="yes"/>' : '<rest/>');
            x += `<duration>${D(e.d)}</duration>`;
            if (p && e.tie) x += (e.tie !== 'start' ? '<tie type="stop"/>' : '') + (e.tie !== 'stop' ? '<tie type="start"/>' : '');
            x += `<voice>${k * 4 + 1}</voice>`;
            if (p || !whole) x += `<type>${type}</type>` + '<dot/>'.repeat(dots);
            if (e.tu) x += '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>';
            x += `<staff>${k + 1}</staff>`;
            if (p && j === 0 && beam[ei]) x += `<beam number="1">${beam[ei]}</beam>`;
            let nt = '';
            if (p && e.tie) nt += (e.tie !== 'start' ? '<tied type="stop"/>' : '') + (e.tie !== 'stop' ? '<tied type="start"/>' : '');
            if (j === 0 && tup[ei]) nt += `<tuplet type="${tup[ei]}" bracket="no"/>`;
            if (p && e.f && e.f[j] != null) nt += `<technical><fingering>${e.f[j]}</fingering></technical>`;
            if (nt) x += `<notations>${nt}</notations>`;
            if (p && e.l && j === 0) x += `<lyric number="1"><syllabic>single</syllabic><text>${this.esc(e.l)}</text></lyric>`;
            out.push(x + '</note>');
          });
        });
      });
      if (i === sc.measures.length - 1) out.push('<barline location="right"><bar-style>light-heavy</bar-style></barline>');
      out.push('</measure>');
    });
    out.push('</part></score-partwise>');
    return out.join('');
  },
};

/* ---------- Fichiers MIDI (.mid) : lecture puis conversion en partition simplifiée */
const MidiFile = {
  parse(buf) {
    const d = new DataView(buf);
    let p = 0;
    const u8 = () => d.getUint8(p++);
    const u16 = () => { const v = d.getUint16(p); p += 2; return v; };
    const u32 = () => { const v = d.getUint32(p); p += 4; return v; };
    const str = n => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(u8()); return s; };
    const vlq = () => { let v = 0, b; do { b = u8(); v = (v << 7) | (b & 127); } while (b & 128); return v; };
    if (d.byteLength < 14 || str(4) !== 'MThd') throw new Error('Ce fichier n\'est pas un fichier MIDI valide.');
    const hl = u32(); u16();
    const nt = u16(), div = u16();
    p = 8 + hl;
    if (div & 0x8000) throw new Error('Ce fichier MIDI utilise un format de temps non pris en charge.');
    const out = { ppq: div, tracks: [], bpm: null, time: null, fifths: null };
    for (let t = 0; t < nt && p + 8 <= d.byteLength; t++) {
      const id = str(4), len = u32(), end = Math.min(p + len, d.byteLength);
      if (id !== 'MTrk') { p = end; continue; }
      let tick = 0, run = 0;
      const open = new Map(), notes = [];
      while (p < end) {
        tick += vlq();
        let st = u8();
        if (st < 0x80) { p--; st = run; } else if (st < 0xf0) run = st;
        const cmd = st & 0xf0;
        if (st === 0xff) {
          const type = u8(), l = vlq(), s = p;
          if (type === 0x51 && out.bpm == null && l >= 3) out.bpm = Math.round(6e7 / ((d.getUint8(s) << 16) | (d.getUint8(s + 1) << 8) | d.getUint8(s + 2)));
          else if (type === 0x58 && !out.time && l >= 2) out.time = [d.getUint8(s), 1 << d.getUint8(s + 1)];
          else if (type === 0x59 && out.fifths == null && l >= 1) out.fifths = d.getInt8(s);
          p = s + l;
        } else if (st === 0xf0 || st === 0xf7) { const l = vlq(); p += l; }
        else if (cmd === 0x90 || cmd === 0x80) {
          const n = u8(), v = u8(), ch = st & 15, key = ch * 128 + n;
          if (cmd === 0x90 && v > 0) { if (!open.has(key)) open.set(key, tick); }
          else if (open.has(key)) { if (ch !== 9) notes.push({ t: open.get(key), d: tick - open.get(key), midi: n }); open.delete(key); }
        } else if (cmd === 0xc0 || cmd === 0xd0) p += 1;
        else p += 2;
      }
      p = end;
      if (notes.length) out.tracks.push({ notes });
    }
    return out;
  },

  toScore(mf, title) {
    const q = mf.ppq / 4, time = mf.time || [4, 4], len = time[0] * 16 / time[1], fifths = clamp(mf.fifths || 0, -7, 7);
    const tr = mf.tracks;
    if (!tr.length) throw new Error('Aucune note trouvée dans ce fichier MIDI.');
    const avg = ns => sum(ns.map(n => n.midi)) / ns.length;
    let hands;
    if (tr.length === 2) hands = avg(tr[0].notes) >= avg(tr[1].notes) ? [tr[0].notes, tr[1].notes] : [tr[1].notes, tr[0].notes];
    else { const all = tr.flatMap(t => t.notes); hands = [all.filter(n => n.midi >= 60), all.filter(n => n.midi < 60)]; }
    let clefs = ['G', 'F'];
    if (!hands[1].length) { clefs = [avg(hands[0]) < 55 ? 'F' : 'G']; hands = [hands[0]]; }
    else if (!hands[0].length) { clefs = ['F']; hands = [hands[1]]; }
    const total = hands.flat().reduce((a, n) => Math.max(a, Math.round((n.t + n.d) / q)), 1);
    const nMeas = Math.max(1, Math.ceil(total / len));
    const staves = hands.map(ns => this.voice(ns, q, len, nMeas, fifths));
    const measures = [];
    for (let i = 0; i < nMeas; i++) measures.push(staves.map(s => s[i]));
    return { title, fifths, time, tempo: mf.bpm || 100, clefs, measures };
  },

  /* Une voix par portée : notes simultanées regroupées en accords, durées arrondies à la double croche. */
  voice(notes, q, len, nMeas, fifths) {
    const groups = new Map(), endAll = nMeas * len;
    for (const n of notes) {
      const s = Math.round(n.t / q), e = Math.max(s + 1, Math.round((n.t + n.d) / q));
      if (!groups.has(s)) groups.set(s, { s, e, m: new Set() });
      const g = groups.get(s); g.e = Math.max(g.e, e); g.m.add(n.midi);
    }
    const gs = [...groups.values()].sort((a, b) => a.s - b.s), segs = [];
    let cur = 0;
    gs.forEach((g, i) => {
      const next = i + 1 < gs.length ? gs[i + 1].s : endAll;
      let e = Math.min(g.e, next, endAll);
      if (next - e === 1 && e - g.s >= 2) e = next;
      if (g.s > cur) segs.push({ s: cur, d: g.s - cur });
      if (e > g.s) segs.push({ s: g.s, d: e - g.s, p: [...g.m].sort((a, b) => a - b).map(m => Notes.fromMidi(m, fifths < 0)) });
      cur = Math.max(cur, e);
    });
    if (cur < endAll) segs.push({ s: cur, d: endAll - cur });
    const out = Array.from({ length: nMeas }, () => []);
    for (const sg of segs) {
      let s = sg.s, left = sg.d, first = true;
      while (left > 0) {
        const mi = Math.floor(s / len), pos = s - mi * len;
        if (mi >= nMeas) break;
        const v = [16, 12, 8, 6, 4, 3, 2, 1].find(x => x <= left && x <= len - pos && pos % (x >= 16 ? 16 : x >= 8 ? 8 : x >= 4 ? 4 : x >= 2 ? 2 : 1) === 0);
        const ev = { d: v };
        if (sg.p) {
          ev.p = sg.p;
          const more = left - v > 0;
          if (first && more) ev.tie = 'start'; else if (!first) ev.tie = more ? 'both' : 'stop';
        }
        out[mi].push(ev); s += v; left -= v; first = false;
      }
    }
    return out;
  },
};
