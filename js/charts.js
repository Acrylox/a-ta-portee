'use strict';
/* Petits graphiques en SVG pour le suivi : une courbe d'évolution et des colonnes.
   Une seule série à chaque fois, donc une seule couleur ; le survol et le clavier donnent le détail,
   et un tableau de chiffres accompagne toujours le graphique. */

function sv(tag, attrs, ...kids) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, v);
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

const Chart = {
  /* Cadre commun : mesure la largeur disponible et redessine quand elle change. */
  mount(host, height, draw) {
    host.classList.add('chart-box');
    host.style.height = height + 'px';
    const tip = h('div', { class: 'chart-tip', hidden: true });
    let w = 0;
    const render = () => {
      const nw = Math.max(240, Math.round(host.clientWidth));
      if (!host.isConnected || nw === w) return;
      w = nw;
      host.innerHTML = '';
      const svg = sv('svg', { width: w, height, viewBox: `0 0 ${w} ${height}`, role: 'img' });
      host.append(svg, tip);
      draw(svg, w, height, tip);
    };
    /* Premier dessin dès que la boîte est dans la page (juste après le code qui l'y insère),
       puis à chaque changement de largeur. */
    Promise.resolve().then(render);
    setTimeout(render, 0);
    if (window.ResizeObserver) new ResizeObserver(render).observe(host);
    else addEventListener('resize', render);
    return host;
  },
  /* Bulle d'information : la valeur d'abord, en gras, puis le contexte. */
  tip(tip, host, x, y, lines) {
    tip.innerHTML = '';
    lines.forEach((t, i) => tip.append(h('div', { class: i ? 'l' : 'v' }, t)));
    tip.hidden = false;
    tip.style.left = clamp(x + 12, 0, Math.max(0, host.clientWidth - tip.offsetWidth - 2)) + 'px';
    tip.style.top = Math.max(0, y - 12 - tip.offsetHeight) + 'px';
  },
  /* Lignes de repère. Le seuil (pointillé) garde toujours son étiquette ; une autre étiquette trop proche est omise. */
  grid(svg, ticks, x1, x2, Y) {
    const shown = [];
    for (const t of ticks.slice().sort((a, b) => (b.dash ? 1 : 0) - (a.dash ? 1 : 0))) {
      svg.append(sv('line', { class: 'ch-grid' + (t.dash ? ' ch-thr' : ''), x1, x2, y1: Y(t.v), y2: Y(t.v) }));
      if (shown.some(y => Math.abs(y - Y(t.v)) < 14)) continue;
      shown.push(Y(t.v));
      svg.append(sv('text', { class: 'ch-txt', x: x1 - 8, y: Y(t.v) + 4, 'text-anchor': 'end' }, t.label));
    }
  },

  /* Courbe d'évolution. o : { pts: [{ label, y, tip: [valeur, ...contexte] }], yMin, yMax, ticks: [{ v, label }], end, aria } */
  line(host, o) {
    return this.mount(host, o.height || 190, (svg, W, H, tip) => {
      const m = { l: 30, r: 84, t: 12, b: 24 }, pw = W - m.l - m.r, ph = H - m.t - m.b, n = o.pts.length;
      const X = i => m.l + (n === 1 ? pw / 2 : pw * i / (n - 1)), Y = v => m.t + ph * (1 - (v - o.yMin) / (o.yMax - o.yMin));
      svg.setAttribute('aria-label', o.aria);
      this.grid(svg, o.ticks, m.l, m.l + pw, Y);
      const marks = n === 1 ? [0] : n < 6 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
      for (const i of marks) svg.append(sv('text', { class: 'ch-txt', x: X(i), y: H - 6, 'text-anchor': n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' }, o.pts[i].label));
      const d = o.pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
      if (n > 1) svg.append(
        sv('path', { class: 'ch-area', d: `${d} L${X(n - 1).toFixed(1)} ${Y(o.yMin)} L${X(0).toFixed(1)} ${Y(o.yMin)} Z` }),
        sv('path', { class: 'ch-line', d }));
      const last = o.pts[n - 1];
      svg.append(sv('circle', { class: 'ch-dot', cx: X(n - 1), cy: Y(last.y), r: 5 }));
      if (o.end) svg.append(sv('text', { class: 'ch-end', x: X(n - 1) + 11, y: Y(last.y) + 4 }, o.end));
      /* Survol : un repère vertical se cale sur le jour le plus proche ; les flèches du clavier font pareil. */
      const cross = sv('line', { class: 'ch-cross', y1: m.t, y2: m.t + ph, visibility: 'hidden' }), hot = sv('circle', { class: 'ch-dot', r: 5, visibility: 'hidden' });
      svg.append(cross, hot);
      let cur = -1;
      const at = i => {
        cur = clamp(i, 0, n - 1);
        const p = o.pts[cur];
        cross.setAttribute('x1', X(cur)); cross.setAttribute('x2', X(cur)); cross.setAttribute('visibility', 'visible');
        hot.setAttribute('cx', X(cur)); hot.setAttribute('cy', Y(p.y)); hot.setAttribute('visibility', 'visible');
        this.tip(tip, host, X(cur), Y(p.y), p.tip);
      };
      const hide = () => { cur = -1; cross.setAttribute('visibility', 'hidden'); hot.setAttribute('visibility', 'hidden'); tip.hidden = true; };
      svg.addEventListener('pointermove', e => { const x = e.clientX - svg.getBoundingClientRect().left; at(n === 1 ? 0 : Math.round((x - m.l) / pw * (n - 1))); });
      svg.addEventListener('pointerleave', hide);
      svg.setAttribute('tabindex', '0');
      svg.addEventListener('focus', () => at(n - 1));
      svg.addEventListener('blur', hide);
      svg.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); at((cur < 0 ? n - 1 : cur) + (e.key === 'ArrowRight' ? 1 : -1)); }
        else if (e.key === 'Escape') hide();
      });
    });
  },

  /* Colonnes. o : { vals: [{ v, tip: [valeur, ...contexte] }], max, ticks: [{ v, label, dash }], slots, aria } */
  columns(host, o) {
    return this.mount(host, o.height || 150, (svg, W, H, tip) => {
      const m = { l: 40, r: 10, t: 12, b: 8 }, pw = W - m.l - m.r, ph = H - m.t - m.b, n = Math.max(o.slots || 0, o.vals.length);
      const band = pw / n, bw = Math.max(3, Math.min(24, band - 2)), base = m.t + ph, Y = v => m.t + ph * (1 - v / o.max);
      svg.setAttribute('aria-label', o.aria);
      this.grid(svg, o.ticks, m.l, m.l + pw, Y);
      o.vals.forEach((p, i) => {
        const x = m.l + band * i + (band - bw) / 2, y = Math.min(Y(p.v), base - 1), r = Math.min(4, bw / 2, base - y);
        /* Colonne à sommet arrondi, base droite ; la zone sensible couvre toute la hauteur de la tranche. */
        const bar = sv('path', { class: 'ch-bar', d: `M${x} ${base} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + bw - r} Q${x + bw} ${y} ${x + bw} ${y + r} V${base} Z` });
        const hit = sv('rect', { class: 'ch-hit', x: m.l + band * i, y: m.t, width: band, height: ph, tabindex: 0 });
        const on = () => { bar.classList.add('hot'); this.tip(tip, host, x + bw / 2, y, p.tip); };
        const off = () => { bar.classList.remove('hot'); tip.hidden = true; };
        hit.addEventListener('pointerenter', on); hit.addEventListener('pointerleave', off);
        hit.addEventListener('focus', on); hit.addEventListener('blur', off);
        svg.append(bar, hit);
      });
    });
  },

  /* Le tableau de chiffres qui accompagne un graphique. */
  table(summary, headers, rows) {
    return h('details', { class: 'chart-table' }, h('summary', null, summary),
      h('table', { class: 'data' }, h('tr', null, headers.map(x => h('th', null, x))), rows.map(r => h('tr', null, r.map(c => h('td', null, c))))));
  },
};

const dayShort = k => k.slice(8) + '/' + k.slice(5, 7);
const dayLong = k => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8)).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
