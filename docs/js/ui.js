/* AURA : composants d’interface (texte, règle de lecture, graphiques).
   Les graphiques sont en SVG, avec survol (infobulle) et une vue tableau
   pour chaque graphique, afin qu’aucune valeur ne dépende de la couleur
   ou du survol. */
(function (root) {
  'use strict';
  const E = root.AURA_ENGINE, D = root.AURA_DATA;
  const f = E.fmt, NB = E.NBSP;

  /* ------------------------------------------------------------------ */
  /* Texte                                                                */
  /* ------------------------------------------------------------------ */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const LEVEL = { normal: 'Dans la zone', vigilance: 'À regarder', urgence: 'Alerte', info: 'Information' };
  const CLS = { normal: 'calm', vigilance: 'attention', urgence: 'urgent', info: 'info', accent: 'calm', calm: 'calm', attention: 'attention', urgent: 'urgent', plain: 'info plain' };
  function cls(level) { return CLS[level] || 'info'; }
  function pill(level, text) { return '<span class="pill ' + cls(level) + '">' + esc(text || LEVEL[level] || level) + '</span>'; }
  function orb(level, opts) {
    opts = opts || {};
    const c = level === 'urgence' || level === 'urgent' ? ' urgent' : level === 'vigilance' || level === 'attention' ? ' attention' : '';
    return '<span class="orb' + c + (opts.live ? ' live' : '') + (opts.sm ? ' sm' : '') + '" aria-hidden="true"></span>';
  }
  function avatar(name, opts) {
    opts = opts || {};
    return '<span class="avatar' + (opts.lg ? ' lg' : '') + (opts.xs ? ' xs' : '') + (opts.doc ? ' doc' : '') + '" aria-hidden="true">' + esc(opts.text || initials(name)) + '</span>';
  }
  function src(id) {
    const s = D.SOURCES[id];
    if (!s) return '';
    return s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" title="' + esc(s.ref) + '">' + esc(s.label) + '</a>' : '<span title="' + esc(s.ref) + '">' + esc(s.label) + '</span>';
  }
  function sources(ids) {
    const list = (ids || []).filter(Boolean);
    if (!list.length) return '';
    return '<p class="src">Source' + (list.length > 1 ? 's' : '') + ' : ' + list.map(src).join(', ') + '</p>';
  }
  function plural(n, one, many) { return n + NB + (n > 1 ? (many || one + 's') : one); }
  function initials(name) { return name.split(' ').map(x => x[0]).join(''); }
  function first(name) { return name.split(' ')[0]; }

  /* ------------------------------------------------------------------ */
  /* Échelles                                                             */
  /* ------------------------------------------------------------------ */
  function linear(d0, d1, r0, r1) {
    const k = (r1 - r0) / ((d1 - d0) || 1);
    const fn = v => r0 + (v - d0) * k;
    fn.invert = p => d0 + (p - r0) / k;
    return fn;
  }
  function niceTicks(min, max, count) {
    const span = Math.max(1e-9, max - min);
    const step0 = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const err = step0 / mag;
    const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(Math.round(v / step) * step);
    return { ticks, step, dec: step >= 1 ? 0 : step >= 0.1 ? 1 : 2 };
  }
  function t(x, y, s, cls, anchor, extra) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + (cls ? ' class="' + cls + '"' : '') + (anchor ? ' text-anchor="' + anchor + '"' : '') + (extra || '') + '>' + esc(s) + '</text>';
  }
  function line(x1, y1, x2, y2, cls) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" class="' + cls + '"/>'; }
  function rect(x, y, w, h, cls, extra) { return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" class="' + cls + '"' + (extra || '') + '/>'; }

  /* ------------------------------------------------------------------ */
  /* Largeurs : les SVG sont dessinés à leur taille d’affichage, pour que  */
  /* le texte garde une taille lisible sur ordinateur comme sur téléphone. */
  /* ------------------------------------------------------------------ */
  function contentWidth() {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    if (w <= 900) return w - 40;
    if (w <= 1180) return Math.min(1120, w - 236 - 64);
    return Math.min(1120, w - 236 - 96);
  }
  function layoutWidth(kind) {
    const c = contentWidth();
    const wide = typeof window !== 'undefined' && window.innerWidth > 900;
    if (kind === 'calm') return Math.min(860, c);
    if (kind === 'wide-left' && wide) return Math.floor((c - 44) * 1.55 / 2.55);
    if (kind === 'half' && wide) return Math.floor((c - 40) / 2);
    return c;
  }
  // Largeur utile dans un panneau (padding de 24 px, 18 px sur téléphone)
  function readingInner(kind) {
    const pad = (typeof window !== 'undefined' && window.innerWidth <= 640) ? 38 : 50;
    return layoutWidth(kind) - pad;
  }

  /* ------------------------------------------------------------------ */
  /* La règle de lecture : norme terrestre contre lecture AURA            */
  /* ------------------------------------------------------------------ */
  function ruler(cfg, ev, opts) {
    opts = opts || {};
    const W = Math.round(Math.max(300, Math.min(980, opts.width || readingInner())));
    const narrow = W < 560;
    const padL = narrow ? 76 : 168, padR = narrow ? 10 : 26;
    const tr = cfg.terrestrial;
    const oneLow = cfg.oneSided === 'low';
    const has = v => v !== null && v !== undefined;
    const side = oneLow ? 'low' : (ev.value >= ev.center ? 'high' : 'low');
    const terrLo = tr.low, terrHi = oneLow ? cfg.plausible.max : tr.high;
    // Repères utiles pour cette lecture : ceux du côté où va la valeur
    const terrAlert = side === 'high' ? (has(tr.alertHigh) ? tr.alertHigh : null) : (has(tr.alertLow) ? tr.alertLow : null);
    const terrAlertLabel = side === 'high' ? tr.alertHighLabel : tr.alertLowLabel;
    const hard = side === 'high' ? cfg.hard.high : cfg.hard.low;
    let lo = Math.min(terrLo, ev.wide[0], ev.value), hi = Math.max(terrHi, ev.wide[1], ev.value);
    if (has(terrAlert)) { lo = Math.min(lo, terrAlert); hi = Math.max(hi, terrAlert); }
    const span0 = hi - lo;
    const showHard = has(hard) && Math.abs(hard - (side === 'high' ? hi : lo)) < span0 * 0.6;
    if (showHard) { lo = Math.min(lo, hard); hi = Math.max(hi, hard); }
    const pad = (hi - lo) * 0.07;
    lo -= pad; hi += pad;
    if (oneLow) hi = Math.min(hi, cfg.plausible.max + (hi - lo) * 0.015);
    const x = linear(lo, hi, padL, W - padR);
    const rowH = 20;
    const y1 = 44;
    const y2 = y1 + rowH + 22;
    const axisY = y2 + rowH + 16, H = axisY + 30;
    const tk = niceTicks(lo, hi, narrow ? 4 : 7);

    const terrText = oneLow ? ('au-dessus de ' + f.unit(tr.low, cfg)) : ('de ' + f.unit(tr.low, cfg) + ' à ' + f.unit(tr.high, cfg));
    const auraText = oneLow ? ('au-dessus de ' + f.unit(ev.band[0], cfg)) : ('de ' + f.unit(ev.band[0], cfg) + ' à ' + f.unit(ev.band[1], cfg));
    const label = 'Mesure ' + f.unit(ev.value, cfg) + '. Norme terrestre ' + terrText + ', lecture terrestre : ' + ev.terrestrial.label + '. Plage AURA ' + auraText + ', lecture AURA : ' + (LEVEL[ev.level] || ev.level).toLowerCase() + '.';

    let s = '<svg class="ruler' + (opts.animate ? ' animate' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(label) + '">';
    if (narrow) {
      s += t(0, y1 + 15, 'Sur Terre', 'row-label');
      s += t(0, y2 + 15, 'AURA', 'row-label');
    } else {
      s += t(0, y1 + 9, 'Norme terrestre', 'row-label');
      s += t(0, y1 + 25, 'repère clinique au sol', 'row-sub');
      s += t(0, y2 + 9, 'Lecture AURA', 'row-label');
      s += t(0, y2 + 25, opts.who || 'cette personne, aujourd’hui', 'row-sub');
    }
    s += rect(padL, y1, W - padR - padL, rowH, 'track');
    s += rect(padL, y2, W - padR - padL, rowH, 'track');
    const tx0 = x(Math.max(lo, terrLo)), tx1 = x(Math.min(hi, terrHi));
    s += rect(tx0, y1, tx1 - tx0, rowH, 'terr');
    const mx = x(ev.value);
    if (has(terrAlert) && terrAlert > lo && terrAlert < hi && !(showHard && Math.abs(terrAlert - hard) < 1e-9)) {
      const ax = x(terrAlert);
      s += line(ax, y1 - 4, ax, y1 + rowH, 'terr-alert');
      // Le libellé part du côté opposé au marqueur s’il risque de le croiser
      const labelTxt = terrAlertLabel + (side === 'high' ? ' dès ' : ' sous ') + f.num(terrAlert, cfg.decimals);
      const room = narrow ? 70 : 120;
      let anchor = side === 'high' ? 'start' : 'end';
      if (anchor === 'start' && mx > ax && mx - ax < room) anchor = 'end';
      if (anchor === 'end' && mx < ax && ax - mx < room) anchor = 'start';
      s += t(ax + (anchor === 'start' ? 5 : -5), y1 - 6, labelTxt, 'thr-label', anchor);
    }
    const bx0 = x(Math.max(lo, ev.band[0])), bx1 = x(Math.min(hi, ev.band[1]));
    const wx0 = x(Math.max(lo, ev.wide[0])), wx1 = x(Math.min(hi, ev.wide[1]));
    const fs = Math.max(0.05, (tx1 - tx0) / Math.max(1, bx1 - bx0));
    const fx = tx0 - bx0;
    s += '<g class="aura-g" style="transform-origin:' + bx0.toFixed(1) + 'px 0px;--fx:' + fx.toFixed(1) + 'px;--fs:' + fs.toFixed(3) + '">';
    s += rect(wx0, y2, wx1 - wx0, rowH, 'aura-wide');
    s += rect(bx0, y2, bx1 - bx0, rowH, 'aura');
    s += '</g>';
    if (showHard && hard > lo && hard < hi) {
      const hx = x(hard);
      s += line(hx, y1 - 2, hx, axisY, 'hard');
      let hAnchor = side === 'high' ? (hx > W - padR - 80 ? 'end' : 'start') : (hx < padL + 80 ? 'start' : 'end');
      if (hAnchor === 'end' && mx < hx && hx - mx < 90 && hx < W - padR - 80) hAnchor = 'start';
      if (hAnchor === 'start' && mx > hx && mx - hx < 90 && hx > padL + 80) hAnchor = 'end';
      const crosses = hAnchor === 'end' ? (mx < hx && hx - mx < 90) : (mx > hx && mx - hx < 90);
      if (!narrow && !crosses) s += t(hx + (hAnchor === 'start' ? 5 : -5), axisY - 5, 'seuil fixe ' + f.num(hard, cfg.decimals), 'hard-label', hAnchor);
    }
    s += line(padL, axisY, W - padR, axisY, 'axis');
    tk.ticks.forEach(v => {
      if (v < lo || v > hi) return;
      const px = x(v);
      s += line(px, axisY, px, axisY + 5, 'tick');
      s += t(px, axisY + 19, f.num(v, Math.max(tk.dec, 0)), null, 'middle');
    });
    s += line(mx, y1 - 14, mx, y2 + rowH + 6, 'marker');
    s += '<path class="marker-head" d="M' + (mx - 6).toFixed(1) + ' ' + (y1 - 20) + ' L' + (mx + 6).toFixed(1) + ' ' + (y1 - 20) + ' L' + mx.toFixed(1) + ' ' + (y1 - 12) + ' Z"/>';
    const anchorM = mx > W - padR - 50 ? 'end' : mx < padL + 50 ? 'start' : 'middle';
    s += t(Math.min(W - 2, Math.max(2, mx)), y1 - 25, f.unit(ev.value, cfg), 'marker-label', anchorM);
    s += '</svg>';

    const legend = '<div class="legend" aria-hidden="true">' +
      '<span><i class="key terr"></i>Norme terrestre</span>' +
      '<span><i class="key aura"></i>Plage attendue AURA</span>' +
      '<span><i class="key aura-wide"></i>Zone de vigilance</span>' +
      (showHard ? '<span><i class="key hard"></i>Seuil fixe de sécurité</span>' : '') +
      '</div>';
    return s + legend;
  }

  /* ------------------------------------------------------------------ */
  /* Bande aura : la zone de la personne, et où se place la valeur         */
  /* ------------------------------------------------------------------ */
  function abar(cfg, ev, opts) {
    opts = opts || {};
    const one = cfg.oneSided === 'low';
    const lo0 = ev.wide[0], hi0 = one ? cfg.plausible.max : ev.wide[1];
    let lo = Math.min(lo0, ev.value), hi = Math.max(hi0, ev.value);
    const pad = (hi - lo) * 0.18 || 1;
    lo -= pad; hi = one ? Math.max(hi, cfg.plausible.max) + pad * 0.2 : hi + pad;
    const P = v => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100));
    const z0 = P(ev.wide[0]), z1 = P(one ? cfg.plausible.max : ev.wide[1]);
    const c0 = P(ev.band[0]), c1 = P(one ? cfg.plausible.max : ev.band[1]);
    const lv = ev.level === 'urgence' ? ' urgent' : ev.level === 'vigilance' ? ' attention' : '';
    const label = opts.label || ('Valeur ' + f.unit(ev.value, cfg) + ', zone habituelle ' + (one ? 'au-dessus de ' + f.unit(ev.band[0], cfg) : 'de ' + f.unit(ev.band[0], cfg) + ' à ' + f.unit(ev.band[1], cfg)));
    return '<div class="abar" role="img" aria-label="' + esc(label) + '"><span class="abar-track"></span>' +
      '<span class="abar-zone" style="left:' + z0.toFixed(1) + '%;width:' + (z1 - z0).toFixed(1) + '%"></span>' +
      '<span class="abar-core" style="left:' + c0.toFixed(1) + '%;width:' + (c1 - c0).toFixed(1) + '%"></span>' +
      '<span class="abar-dot' + lv + '" style="left:' + P(ev.value).toFixed(1) + '%"></span></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Graphique X/Y générique (séries temporelles)                          */
  /* ------------------------------------------------------------------ */
  const charts = {};
  let seq = 0;

  function xyChart(o) {
    const id = 'ch' + (++seq);
    const W = Math.round(Math.max(300, o.width || layoutWidth(o.layout))), H = o.height || 260;
    const narrow = W < 520;
    const padL = o.padL || 48, padR = o.padR || (narrow ? 14 : 24), padT = o.padT || (o.yTitle ? 30 : 18), padB = 34;
    const xs = [], ys = [];
    (o.lines || []).forEach(L => L.pts.forEach(p => { xs.push(p.x); ys.push(p.y); }));
    (o.dots || []).forEach(p => { xs.push(p.x); ys.push(p.y); });
    (o.bands || []).forEach(B => B.pts.forEach(p => { xs.push(p.x); ys.push(p.lo, p.hi); }));
    (o.hlines || []).forEach(h => ys.push(h.y));
    (o.hrects || []).forEach(h => ys.push(h.lo, h.hi));
    let x0 = o.xMin !== undefined ? o.xMin : Math.min.apply(null, xs);
    let x1 = o.xMax !== undefined ? o.xMax : Math.max.apply(null, xs);
    if (x1 === x0) x1 = x0 + 1;
    let y0 = o.yMin !== undefined ? o.yMin : Math.min.apply(null, ys);
    let y1 = o.yMax !== undefined ? o.yMax : Math.max.apply(null, ys);
    if (o.yMin === undefined || o.yMax === undefined) {
      const pad = (y1 - y0) * 0.08 || 1;
      if (o.yMin === undefined) y0 -= pad;
      if (o.yMax === undefined) y1 += pad;
    }
    const X = linear(x0, x1, padL, W - padR), Y = linear(y0, y1, H - padB, padT);
    const yt = niceTicks(y0, y1, o.yTicks || 5);
    let xt = o.xTicksValues ? { ticks: o.xTicksValues } : niceTicks(x0, x1, o.xTicks || (narrow ? 4 : 6));
    if (narrow && xt.ticks.length > 4) xt = { ticks: xt.ticks.filter((v, i) => i % 2 === 0) };
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.label || '') + '" tabindex="0" data-chart="' + id + '">';
    // Grille et axe Y
    yt.ticks.forEach(v => {
      if (v < y0 || v > y1) return;
      s += line(padL, Y(v), W - padR, Y(v), 'grid');
      s += t(padL - 8, Y(v) + 4, o.yFmt ? o.yFmt(v) : f.num(v, yt.dec), 'axis-text', 'end');
    });
    xt.ticks.forEach(v => {
      if (v < x0 || v > x1) return;
      s += t(X(v), H - padB + 20, o.xFmt ? o.xFmt(v) : f.num(v, 0), 'axis-text', 'middle');
    });
    if (o.yTitle) s += t(4, 13, o.yTitle, 'title-text', 'start');
    // Zones verticales (ex. conjonction), rectangles horizontaux (ex. norme terrestre)
    (o.vrects || []).forEach(r => {
      const a = X(Math.max(x0, r.x0)), b = X(Math.min(x1, r.x1));
      if (b > a) { s += rect(a, padT, b - a, H - padB - padT, r.cls); if (r.label) s += t(a + 4, padT + 14, r.label, 'limit-text'); }
    });
    (o.hrects || []).forEach(r => {
      const a = Y(Math.min(y1, r.hi)), b = Y(Math.max(y0, r.lo));
      if (b > a) s += rect(padL, a, W - padR - padL, b - a, r.cls);
    });
    // Bandes variables (plage AURA)
    (o.bands || []).forEach(B => {
      if (!B.pts.length) return;
      const top = B.pts.map(p => X(p.x).toFixed(1) + ',' + Y(Math.min(y1, p.hi)).toFixed(1));
      const bot = B.pts.slice().reverse().map(p => X(p.x).toFixed(1) + ',' + Y(Math.max(y0, p.lo)).toFixed(1));
      s += '<polygon class="' + B.cls + '" points="' + top.concat(bot).join(' ') + '"/>';
      if (B.center) s += '<polyline class="aura-center" points="' + B.pts.map(p => X(p.x).toFixed(1) + ',' + Y(p.c).toFixed(1)).join(' ') + '"/>';
    });
    // Lignes de référence
    (o.hlines || []).forEach(h => {
      if (h.y < y0 || h.y > y1) return;
      s += line(padL, Y(h.y), W - padR, Y(h.y), h.cls || 'limit');
      if (h.label) s += t(W - padR, Y(h.y) - 6, h.label, h.textCls || 'limit-text', 'end');
    });
    // Séries
    (o.lines || []).forEach(L => {
      if (!L.pts.length) return;
      s += '<polyline class="' + (L.cls || 'series') + '" points="' + L.pts.map(p => X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ') + '"/>';
      if (L.endLabel) {
        const p = L.pts[L.pts.length - 1];
        s += t(Math.min(W - 4, X(p.x) + 8), Y(p.y) + 4, L.endLabel, 'axis-text', 'start');
      }
    });
    (o.dots || []).forEach(p => {
      if (p.hide) return;
      s += '<circle class="dot ' + (p.level || '') + '" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (p.r || 4) + '"/>';
    });
    // Repère « maintenant »
    (o.vlines || []).forEach(v => {
      if (v.x < x0 || v.x > x1) return;
      s += line(X(v.x), padT, X(v.x), H - padB, v.cls || 'now-line');
      if (v.label) s += t(X(v.x) + (v.anchor === 'end' ? -5 : 5), padT + 12, v.label, 'now-text', v.anchor || 'start');
    });
    // Couche de survol
    s += '<line class="crosshair" x1="0" y1="' + padT + '" x2="0" y2="' + (H - padB) + '" visibility="hidden"/>';
    s += '<circle class="hl-dot" r="5" cx="0" cy="0" visibility="hidden"/>';
    s += rect(padL, padT, W - padR - padL, H - padB - padT, 'hit');
    s += '</svg>';
    charts[id] = { W, padL, padR, X, Y, points: o.hover || [], tip: o.tip, x0, x1 };
    let out = '<div class="chart">' + (o.legend || '') + s + '</div>';
    if (o.table) out += valuesTable(o.table);
    return out;
  }

  function valuesTable(tb) {
    let h = '<details class="values"><summary>' + esc(tb.summary || 'Voir les valeurs') + '</summary><div class="table-wrap"><table class="table"><thead><tr>';
    tb.head.forEach((c, i) => { h += '<th' + (i > 0 && tb.num !== false ? ' class="num"' : '') + '>' + esc(c) + '</th>'; });
    h += '</tr></thead><tbody>';
    tb.rows.forEach(r => { h += '<tr>' + r.map((c, i) => '<td' + (i > 0 && tb.num !== false ? ' class="num"' : '') + '>' + esc(c) + '</td>').join('') + '</tr>'; });
    return h + '</tbody></table></div></details>';
  }

  /* Histogramme (planification de la pharmacie) */
  function histogram(o) {
    const id = 'ch' + (++seq);
    const W = Math.round(Math.max(300, o.width || layoutWidth())), H = 250, padL = 50, padR = 20, padT = 34, padB = 44;
    const n = o.hist.length, total = o.hist.reduce((a, b) => a + b, 0) || 1;
    const maxPct = Math.max.apply(null, o.hist.map(v => v / total)) || 1;
    const X = linear(0, o.top, padL, W - padR), Y = linear(0, maxPct * 1.1, H - padB, padT);
    const slot = (W - padR - padL) / n, bw = Math.min(24, slot - 2);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.label) + '" tabindex="0" data-chart="' + id + '">';
    const yt = niceTicks(0, maxPct * 1.1, 4);
    yt.ticks.forEach(v => { s += line(padL, Y(v), W - padR, Y(v), 'grid'); s += t(padL - 8, Y(v) + 4, f.num(v * 100, 0) + NB + '%', 'axis-text', 'end'); });
    const bars = [];
    o.hist.forEach((c, i) => {
      const a = (i / n) * o.top, b = ((i + 1) / n) * o.top;
      const pct = c / total;
      const h = Y(0) - Y(pct);
      const cx = padL + slot * i + (slot - bw) / 2;
      const over = a >= o.stock;
      if (h > 0.5) {
        const r = Math.min(4, h / 2, bw / 2);
        // extrémité arrondie, base carrée
        s += '<path class="bar' + (over ? ' over' : '') + '" data-i="' + i + '" d="M' + cx.toFixed(1) + ' ' + Y(0).toFixed(1) + ' V' + (Y(pct) + r).toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + Y(pct).toFixed(1) + ' ' + (cx + r).toFixed(1) + ' ' + Y(pct).toFixed(1) + ' H' + (cx + bw - r).toFixed(1) + ' Q' + (cx + bw).toFixed(1) + ' ' + Y(pct).toFixed(1) + ' ' + (cx + bw).toFixed(1) + ' ' + (Y(pct) + r).toFixed(1) + ' V' + Y(0).toFixed(1) + ' Z"/>';
      }
      bars.push({ x: (a + b) / 2, a, b, pct, count: c });
    });
    const xt = niceTicks(0, o.top, W < 520 ? 4 : 6);
    xt.ticks.forEach(v => { if (v <= o.top) s += t(X(v), H - padB + 18, f.num(v, 0), 'axis-text', 'middle'); });
    s += t(W - padR, H - 4, o.xTitle || '', 'axis-text', 'end');
    const sx = X(o.stock);
    s += line(sx, padT - 8, sx, H - padB, 'stock-line');
    s += t(sx + (sx > W - 160 ? -6 : 6), padT - 12, 'Stock à bord : ' + f.num(o.stock, 0), 'stock-text', sx > W - 160 ? 'end' : 'start');
    s += '<line class="crosshair" x1="0" y1="' + padT + '" x2="0" y2="' + (H - padB) + '" visibility="hidden"/>';
    s += '<circle class="hl-dot" r="0" cx="0" cy="0" visibility="hidden"/>';
    s += rect(padL, padT, W - padR - padL, H - padB - padT, 'hit');
    s += '</svg>';
    charts[id] = {
      W, padL, padR, X, Y, x0: 0, x1: o.top, bars: true,
      points: bars.map((b, i) => ({ x: b.x, y: b.pct, i, b })),
      tip: p => [[f.pct(p.b.pct, 1), 'des missions simulées'], ['de ' + f.num(Math.round(p.b.a), 0) + ' à ' + f.num(Math.round(p.b.b), 0) + ' ' + (o.unitLabel || ''), p.b.a >= o.stock ? 'au-delà du stock : rupture' : 'couvert par le stock']]
    };
    const legend = '<div class="legend"><span><i class="key" style="background:var(--ink-2)"></i>Missions couvertes par le stock</span><span><i class="key" style="background:var(--red)"></i>Missions en rupture</span><span><i class="key line"></i>Stock à bord</span></div>';
    return '<div class="chart">' + legend + s + '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Survol et clavier                                                    */
  /* ------------------------------------------------------------------ */
  let tipEl = null;
  function tipShow(lines, clientX, clientY) {
    if (!tipEl) tipEl = document.getElementById('tooltip');
    if (!tipEl) return;
    tipEl.textContent = '';
    lines.forEach((ln, i) => {
      const v = document.createElement('span');
      v.className = i === 0 ? 'tt-v' : 'tt-l';
      v.textContent = Array.isArray(ln) ? ln.filter(Boolean).join(' ') : ln;
      tipEl.appendChild(v);
    });
    const w = tipEl.offsetWidth || 220, h = tipEl.offsetHeight || 60;
    let left = clientX + 14, top = clientY - h - 12;
    if (left + w > window.innerWidth - 8) left = clientX - w - 14;
    if (top < 8) top = clientY + 16;
    tipEl.style.left = Math.max(8, left) + 'px';
    tipEl.style.top = top + 'px';
    tipEl.classList.add('show');
  }
  function tipHide() { if (tipEl) tipEl.classList.remove('show'); }

  function mount(rootEl) {
    rootEl.querySelectorAll('svg[data-chart]').forEach(svg => {
      const c = charts[svg.getAttribute('data-chart')];
      if (!c || !c.points.length) return;
      const cross = svg.querySelector('.crosshair'), hl = svg.querySelector('.hl-dot'), hit = svg.querySelector('.hit');
      let idx = c.points.length - 1;
      const show = (i, cx, cy) => {
        const p = c.points[i];
        if (!p) return;
        idx = i;
        const px = c.X(p.x);
        cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
        if (c.bars) {
          svg.querySelectorAll('.bar.hl').forEach(b => b.classList.remove('hl'));
          const bar = svg.querySelector('.bar[data-i="' + p.i + '"]');
          if (bar) bar.classList.add('hl');
          cross.setAttribute('visibility', 'hidden');
        } else if (p.y !== undefined && p.y !== null) {
          hl.setAttribute('cx', px); hl.setAttribute('cy', c.Y(p.y)); hl.setAttribute('visibility', 'visible');
        }
        if (cx === undefined) {
          const r = svg.getBoundingClientRect();
          cx = r.left + (px / c.W) * r.width; cy = r.top + r.height * 0.3;
        }
        tipShow(c.tip ? c.tip(p) : [String(p.y)], cx, cy);
      };
      const nearest = (clientX) => {
        const r = svg.getBoundingClientRect();
        const vx = (clientX - r.left) * (c.W / r.width);
        const xv = c.X.invert(vx);
        let best = 0, bd = Infinity;
        c.points.forEach((p, i) => { const d = Math.abs(p.x - xv); if (d < bd) { bd = d; best = i; } });
        return best;
      };
      hit.addEventListener('pointermove', e => show(nearest(e.clientX), e.clientX, e.clientY));
      hit.addEventListener('pointerdown', e => show(nearest(e.clientX), e.clientX, e.clientY));
      hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); hl.setAttribute('visibility', 'hidden'); svg.querySelectorAll('.bar.hl').forEach(b => b.classList.remove('hl')); tipHide(); });
      svg.addEventListener('focus', () => show(idx));
      svg.addEventListener('blur', () => { cross.setAttribute('visibility', 'hidden'); hl.setAttribute('visibility', 'hidden'); tipHide(); });
      svg.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(Math.max(0, idx - 1)); }
        if (e.key === 'ArrowRight') { e.preventDefault(); show(Math.min(c.points.length - 1, idx + 1)); }
        if (e.key === 'Escape') { tipHide(); }
      });
    });
  }
  function resetCharts() { Object.keys(charts).forEach(k => { delete charts[k]; }); }

  root.AURA_UI = { esc, pill, cls, orb, avatar, abar, LEVEL, src, sources, plural, initials, first, ruler, xyChart, histogram, valuesTable, mount, resetCharts, tipHide, niceTicks, linear, contentWidth, layoutWidth, readingInner };
})(typeof self !== 'undefined' ? self : this);
