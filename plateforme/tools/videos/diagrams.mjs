// Schémas animés des vidéos AURA (dessin vectoriel, une fonction par schéma).
// Chaque schéma reçoit le temps local t (s), la durée de la scène, les couleurs de la catégorie et des outils.
const TAU = Math.PI * 2;
const LINE = '#DDE6F5', DIM = 'rgba(221,230,245,0.35)';
function stroke(ctx, w, c, a = 1) { ctx.lineWidth = w; ctx.strokeStyle = c; ctx.globalAlpha = a; }
function label(U, ctx, s, x, y, a, o = {}) { U.text(ctx, s, x, y, Object.assign({ font: U.F(500, 25), color: U.INK, alpha: a }, o)); }
function leader(ctx, x1, y1, x2, y2, a, c = DIM) { ctx.save(); stroke(ctx, 1.5, c, a); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x1, y1, 3.5, 0, TAU); ctx.fill(); ctx.restore(); }
function title(U, ctx, s, t) { U.text(ctx, s, 72, 132, { font: U.F(800, 38), color: U.INK, alpha: U.appear(t, 0.1, 0.6), maxW: 1100 }); }
// silhouette humaine simple, de face (x, y = sommet de la tête, h = taille en px)
function body(ctx, x, y, h) {
  const k = h / 100;
  ctx.beginPath();
  ctx.arc(x, y + 7 * k, 7 * k, 0, TAU);
  ctx.moveTo(x - 11 * k, y + 20 * k);
  const P = [[-3, 14], [-11, 18], [-17, 22], [-20, 50], [-16, 51], [-13, 28], [-12, 52], [-11, 96], [-4, 96], [-1, 58], [1, 58], [4, 96], [11, 96], [12, 52], [13, 28], [16, 51], [20, 50], [17, 22], [11, 18], [3, 14]];
  ctx.moveTo(x + P[0][0] * k, y + P[0][1] * k);
  for (const [px, py] of P.slice(1)) ctx.lineTo(x + px * k, y + py * k);
  ctx.closePath();
}

export const DIAGRAMS = {
  // conflit entre les yeux et l'oreille interne
  vestibule(ctx, t, dur, C, U) {
    title(U, ctx, 'Deux messages qui ne collent pas', t);
    const a1 = U.appear(t, 0.4, 0.7), a2 = U.appear(t, 1.2, 0.7), a3 = U.appear(t, 2.2, 0.7);
    ctx.save();
    // œil
    const ex = 260, ey = 380;
    stroke(ctx, 3, LINE, a1); ctx.beginPath(); ctx.moveTo(ex - 80, ey); ctx.quadraticCurveTo(ex, ey - 62, ex + 80, ey); ctx.quadraticCurveTo(ex, ey + 62, ex - 80, ey); ctx.stroke();
    ctx.fillStyle = C.accent; ctx.globalAlpha = a1; ctx.beginPath(); ctx.arc(ex, ey, 26, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a0f1e'; ctx.beginPath(); ctx.arc(ex, ey, 11, 0, TAU); ctx.fill();
    label(U, ctx, 'Les yeux voient', ex, ey + 92, a1, { font: U.F(700, 26), align: 'center' });
    label(U, ctx, 'un sol et un plafond', ex, ey + 124, a1, { color: U.INK2, align: 'center' });
    // oreille interne : trois canaux semi-circulaires et la cochlée
    const ox = 1020, oy = 370;
    stroke(ctx, 3, LINE, a2);
    for (const [rx, ry, rot] of [[46, 30, 0], [42, 26, 1.1], [40, 24, 2.2]]) { ctx.beginPath(); ctx.ellipse(ox, oy - 30, rx, ry, rot, 0.3, TAU - 0.3); ctx.stroke(); }
    ctx.beginPath(); for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU * 2.4, r = 30 - i * 0.2; const px = ox + 40 + Math.cos(a) * r, py = oy + 40 + Math.sin(a) * r * 0.85; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    label(U, ctx, 'L\'oreille interne', ox + 10, ey + 92, a2, { font: U.F(700, 26), align: 'center' });
    label(U, ctx, 'ne sent plus le bas', ox + 10, ey + 124, a2, { color: U.INK2, align: 'center' });
    // cerveau au centre
    const bx = 640, by = 330, pulse = 1 + 0.04 * Math.sin(t * 5) * a3;
    stroke(ctx, 3, a3 > 0.5 ? C.accent : LINE, Math.max(a1, a3));
    ctx.beginPath(); ctx.ellipse(bx, by, 92 * pulse, 70 * pulse, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by - 68); ctx.bezierCurveTo(bx - 10, by - 30, bx + 10, by + 20, bx, by + 68); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx + s * 30, by - 50); ctx.quadraticCurveTo(bx + s * 70, by - 20, bx + s * 40, by + 10); ctx.quadraticCurveTo(bx + s * 70, by + 30, bx + s * 35, by + 52); ctx.stroke(); }
    // signaux
    const dash = (x1, y1, x2, y2, a, ph) => { ctx.save(); ctx.setLineDash([10, 12]); ctx.lineDashOffset = -ph * 40; stroke(ctx, 2.5, C.accent, a); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); };
    dash(ex + 100, ey - 10, bx - 100, by + 10, a1, t);
    dash(ox - 70, oy - 20, bx + 100, by + 10, a2, t);
    U.text(ctx, '?', bx, by + 26, { font: U.F(800, 74), color: C.accent, alpha: a3, align: 'center' });
    label(U, ctx, 'Le cerveau reçoit deux messages contraires', bx, 612, a3, { align: 'center', font: U.F(700, 30), color: C.accent });
    label(U, ctx, 'comme dans un bateau qui tangue', bx, 650, a3, { align: 'center', color: U.INK2 });
    ctx.restore();
  },
  // déplacement des liquides vers la tête
  fluid(ctx, t, dur, C, U) {
    title(U, ctx, 'Environ deux litres de liquide remontent', t);
    const k = U.ease((t - 1.2) / 3.5);
    const figs = [[380, 'Sur Terre', 0], [900, 'En apesanteur', k]];
    figs.forEach(([x, lab, shift], i) => {
      const a = U.appear(t, 0.3 + i * 0.5, 0.7);
      const top = 190, h = 400;
      ctx.save(); ctx.globalAlpha = a;
      body(ctx, x, top, h); ctx.save(); ctx.clip();
      // liquide : dégradé du bas (Terre) vers le haut (apesanteur)
      const g = ctx.createLinearGradient(0, top, 0, top + h);
      const hi = i === 0 ? 0.18 : 0.18 + 0.55 * shift, lo = i === 0 ? 0.72 : 0.72 - 0.5 * shift;
      g.addColorStop(0, C.soft + hi + ')'); g.addColorStop(1, C.soft + lo + ')');
      ctx.fillStyle = g; ctx.fillRect(x - 120, top, 240, h);
      ctx.restore();
      stroke(ctx, 2.5, LINE, a); body(ctx, x, top, h); ctx.stroke();
      ctx.restore();
      U.text(ctx, lab, x, top + h + 50, { font: U.F(700, 28), color: U.INK, alpha: a, align: 'center' });
    });
    // flèches vers le haut
    const aa = U.appear(t, 1.6, 0.6);
    ctx.save(); stroke(ctx, 3, C.accent, aa);
    for (const dx of [-70, 70]) { const y0 = 470 - 50 * ((t * 0.8) % 1); ctx.beginPath(); ctx.moveTo(900 + dx, y0 + 60); ctx.lineTo(900 + dx, y0); ctx.lineTo(900 + dx - 10, y0 + 14); ctx.moveTo(900 + dx, y0); ctx.lineTo(900 + dx + 10, y0 + 14); ctx.stroke(); }
    ctx.restore();
    U.text(ctx, 'Visage plus rond, jambes plus fines', 640, 680, { font: U.F(500, 24), color: U.INK2, alpha: U.appear(t, 3, 0.8), align: 'center' });
  },
  // colonne qui s'allonge
  spine(ctx, t, dur, C, U) {
    title(U, ctx, 'Les disques se gonflent, la colonne s\'allonge', t);
    const k = U.ease((t - 1.0) / 3.0);
    const x = 560, n = 8, vh = 34, d0 = 9, d1 = 17;
    const dh = d0 + (d1 - d0) * k;
    const total = n * vh + (n - 1) * dh;
    const y0 = 600 - total;
    for (let i = 0; i < n; i++) {
      const y = y0 + i * (vh + dh), a = U.appear(t, 0.2 + i * 0.06, 0.4);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#c9d3e4'; U.roundRect(ctx, x - 48, y, 96, vh, 9); ctx.fill();
      ctx.fillStyle = '#9fadc4'; ctx.beginPath(); ctx.moveTo(x + 48, y + 8); ctx.lineTo(x + 96, y + 2); ctx.lineTo(x + 100, y + 14); ctx.lineTo(x + 48, y + vh - 6); ctx.closePath(); ctx.fill();
      if (i < n - 1) { ctx.fillStyle = C.accent; ctx.globalAlpha = a * 0.9; ctx.beginPath(); ctx.ellipse(x, y + vh + dh / 2, 44, dh / 2, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // règle
    const a = U.appear(t, 1.2, 0.6);
    ctx.save(); stroke(ctx, 2, LINE, a);
    const yb = 600, yt = y0, ytRest = 600 - (n * vh + (n - 1) * d0);
    ctx.beginPath(); ctx.moveTo(760, yb); ctx.lineTo(760, yt); ctx.moveTo(748, yb); ctx.lineTo(772, yb); ctx.moveTo(748, yt); ctx.lineTo(772, yt); ctx.stroke();
    ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(470, ytRest); ctx.lineTo(780, ytRest); ctx.stroke();
    ctx.restore();
    U.text(ctx, 'Taille sur Terre', 800, ytRest + 8, { font: U.F(500, 22), color: U.INK2, alpha: a });
    U.text(ctx, 'Jusqu\'à 3 % de plus', 800, yt + 10, { font: U.F(800, 30), color: C.accent, alpha: U.appear(t, 3.2, 0.6) });
    U.text(ctx, 'Source : NASA, Human Research Program', 72, 690, { font: U.F(400, 16), color: U.INK3, alpha: U.appear(t, 3.5, 0.6) });
  },
  // perte osseuse au fil des mois
  bone(ctx, t, dur, C, U) {
    title(U, ctx, 'Densité osseuse pendant une mission de six mois', t);
    const X0 = 150, X1 = 1080, Y0 = 600, Y1 = 220, ymin = 88, ymax = 101;
    const px = m => X0 + (X1 - X0) * m / 6, py = v => Y0 - (Y0 - Y1) * (v - ymin) / (ymax - ymin);
    const a = U.appear(t, 0.3, 0.6);
    ctx.save(); stroke(ctx, 1.5, DIM, a);
    for (const v of [90, 95, 100]) { ctx.beginPath(); ctx.moveTo(X0, py(v)); ctx.lineTo(X1, py(v)); ctx.stroke(); U.text(ctx, v + ' %', X0 - 18, py(v) + 7, { font: U.F(500, 20), color: U.INK3, alpha: a, align: 'right' }); }
    for (let m = 0; m <= 6; m++) U.text(ctx, m === 0 ? 'Départ' : m + ' mois', px(m), Y0 + 36, { font: U.F(500, 19), color: U.INK3, alpha: a, align: 'center' });
    ctx.restore();
    // seuil de la norme NASA
    const as = U.appear(t, 3.4, 0.6);
    ctx.save(); ctx.setLineDash([10, 8]); stroke(ctx, 2.5, '#FF8A7A', as); ctx.beginPath(); ctx.moveTo(X0, py(95)); ctx.lineTo(X1, py(95)); ctx.stroke(); ctx.restore();
    U.text(ctx, 'Seuil à garder : 95 %', X1 - 4, py(95) - 12, { font: U.F(700, 22), color: '#FF8A7A', alpha: as, align: 'right' });
    // bande de perte : 1 % à 1,5 % par mois
    const k = U.ease((t - 0.8) / 2.6), mEnd = 6 * k;
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = C.accent;
    ctx.beginPath(); ctx.moveTo(px(0), py(100));
    for (let m = 0; m <= mEnd + 1e-6; m += 0.05) ctx.lineTo(px(m), py(100 - m));
    for (let m = mEnd; m >= 0; m -= 0.05) ctx.lineTo(px(m), py(100 - 1.5 * m));
    ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); stroke(ctx, 3.5, C.accent, 1); ctx.beginPath();
    for (let m = 0; m <= mEnd + 1e-6; m += 0.05) { const v = 100 - 1.25 * m; m ? ctx.lineTo(px(m), py(v)) : ctx.moveTo(px(m), py(v)); }
    ctx.stroke(); ctx.restore();
    U.text(ctx, '− 1 à 1,5 % par mois', px(3.2), py(94.4) + 52, { font: U.F(800, 30), color: C.accent, alpha: U.appear(t, 2.2, 0.6) });
    U.text(ctx, 'Source : NASA ; norme NASA-STD-3001 (fiche AURA F-APE-14)', 72, 690, { font: U.F(400, 16), color: U.INK3, alpha: U.appear(t, 3.6, 0.6) });
  },
  // os : destruction et reconstruction
  remodel(ctx, t, dur, C, U) {
    title(U, ctx, 'L\'os se détruit et se reconstruit sans cesse', t);
    const k = U.ease((t - 2.4) / 2.0);
    const cols = [[380, 'Sur Terre', 1, 1], [900, 'En apesanteur', 1 + 0.35 * k, 1 - 0.25 * k]];
    cols.forEach(([x, lab, des, con], i) => {
      const a = U.appear(t, 0.4 + i * 0.9, 0.6);
      const base = 560, sc = 230;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#FF8A7A'; U.roundRect(ctx, x - 110, base - sc * des * 0.8, 90, sc * des * 0.8, 12); ctx.fill();
      ctx.fillStyle = C.accent; U.roundRect(ctx, x + 20, base - sc * con * 0.8, 90, sc * con * 0.8, 12); ctx.fill();
      ctx.restore();
      U.text(ctx, 'détruit', x - 65, base + 34, { font: U.F(500, 21), color: U.INK2, alpha: a, align: 'center' });
      U.text(ctx, 'construit', x + 65, base + 34, { font: U.F(500, 21), color: U.INK2, alpha: a, align: 'center' });
      U.text(ctx, lab, x, base + 80, { font: U.F(700, 28), color: U.INK, alpha: a, align: 'center' });
    });
    U.text(ctx, 'La destruction prend de l\'avance : l\'os s\'affine', 640, 690, { font: U.F(700, 26), color: C.accent, alpha: U.appear(t, 3.6, 0.6), align: 'center' });
  },
  // œil : nerf optique qui gonfle, fond de l'œil aplati
  eye(ctx, t, dur, C, U) {
    title(U, ctx, 'Ce qui peut changer au fond de l\'œil', t);
    const k = U.ease((t - 1.5) / 3.0);
    const cx = 560, cy = 400, R = 170;
    const a = U.appear(t, 0.3, 0.7);
    ctx.save(); ctx.globalAlpha = a;
    // globe avec arrière qui s'aplatit
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const th = i / 200 * TAU; let x = Math.cos(th), y = Math.sin(th);
      const back = Math.max(0, x) ** 3; x = x - back * 0.13 * k;
      const px = cx + x * R, py = cy + y * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = 'rgba(221,230,245,0.06)'; ctx.fill(); stroke(ctx, 3, LINE, a); ctx.stroke();
    // cornée et cristallin
    ctx.beginPath(); ctx.arc(cx - R + 10, cy, 70, Math.PI * 0.62, Math.PI * 1.38); stroke(ctx, 3, LINE, a); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx - R + 62, cy, 20, 52, 0, 0, TAU); ctx.fillStyle = C.soft + '0.35)'; ctx.fill(); ctx.stroke();
    // nerf optique
    const nx = cx + R - 0.13 * k * R;
    ctx.fillStyle = 'rgba(221,230,245,0.18)'; ctx.fillRect(nx, cy - 34, 220, 68); stroke(ctx, 3, LINE, a); ctx.strokeRect(nx, cy - 34, 220, 68);
    // papille qui gonfle
    ctx.fillStyle = '#FF8A7A'; ctx.globalAlpha = a * (0.4 + 0.6 * k); ctx.beginPath(); ctx.ellipse(nx - 6 * k, cy, 10 + 18 * k, 30, 0, 0, TAU); ctx.fill();
    ctx.restore();
    const a2 = U.appear(t, 2.6, 0.6), a3 = U.appear(t, 3.6, 0.6);
    leader(ctx, nx - 10, cy - 20, 980, 230, a2); U.text(ctx, 'Le nerf optique gonfle', 990, 236, { font: U.F(700, 25), color: '#FF8A7A', alpha: a2 });
    leader(ctx, cx + R * 0.75, cy + R * 0.62, 980, 590, a3); U.text(ctx, 'L\'arrière de l\'œil s\'aplatit', 990, 597, { font: U.F(700, 25), color: U.INK, alpha: a3 });
    U.text(ctx, 'Lumière', cx - R - 120, cy - 70, { font: U.F(500, 20), color: U.INK3, alpha: a });
    U.text(ctx, 'Source : NASA, Human Research Program', 72, 690, { font: U.F(400, 16), color: U.INK3, alpha: a3 });
  },
  // rein : urine concentrée, cristal
  kidney(ctx, t, dur, C, U) {
    title(U, ctx, 'Comment se forme un calcul', t);
    const a = U.appear(t, 0.3, 0.7), k = U.ease((t - 1.6) / 3.2);
    const cx = 520, cy = 400;
    ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(cx + 40, cy - 170); ctx.bezierCurveTo(cx - 170, cy - 210, cx - 200, cy + 190, cx + 30, cy + 170);
    ctx.bezierCurveTo(cx + 110, cy + 160, cx + 120, cy + 70, cx + 70, cy + 40);
    ctx.bezierCurveTo(cx + 40, cy + 20, cx + 40, cy - 20, cx + 70, cy - 40);
    ctx.bezierCurveTo(cx + 130, cy - 80, cx + 120, cy - 160, cx + 40, cy - 170);
    ctx.fillStyle = 'rgba(255,138,122,0.16)'; ctx.fill(); stroke(ctx, 3, LINE, a); ctx.stroke();
    // bassinet et uretère
    ctx.beginPath(); ctx.moveTo(cx + 60, cy); ctx.quadraticCurveTo(cx + 140, cy + 30, cx + 160, cy + 250); stroke(ctx, 10, 'rgba(221,230,245,0.25)', a); ctx.stroke();
    ctx.restore();
    // particules de calcium qui se rassemblent
    let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 46; i++) {
      const sx = cx - 90 + r() * 170, sy = cy - 120 + r() * 240, tx = cx + 10 + (r() - 0.5) * 18, ty = cy + 6 + (r() - 0.5) * 18;
      const px = sx + (tx - sx) * k, py = sy + (ty - sy) * k;
      ctx.save(); ctx.globalAlpha = a * (1 - 0.6 * k); ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill(); ctx.restore();
    }
    const kc = U.ease((t - 3.6) / 1.2);
    ctx.save(); ctx.globalAlpha = kc; ctx.fillStyle = '#f2ead8'; ctx.beginPath();
    for (let i = 0; i < 7; i++) { const th = i / 7 * TAU, rr = (14 + (i % 2) * 7) * kc; ctx.lineTo(cx + 10 + Math.cos(th) * rr, cy + 6 + Math.sin(th) * rr); } ctx.closePath(); ctx.fill(); ctx.restore();
    const a2 = U.appear(t, 1.4, 0.6), a3 = U.appear(t, 3.9, 0.6);
    U.text(ctx, 'Moins d\'eau', 860, 300, { font: U.F(800, 30), color: U.INK, alpha: a2 });
    U.text(ctx, '+ plus de calcium', 860, 344, { font: U.F(800, 30), color: C.accent, alpha: a2 });
    U.text(ctx, '= un cristal qui grossit', 860, 410, { font: U.F(800, 30), color: '#f2ead8', alpha: a3 });
    U.text(ctx, 'Source : Whitson et al., NASA', 72, 690, { font: U.F(400, 16), color: U.INK3, alpha: a3 });
  },
  // délai des communications avec Mars
  delay(ctx, t, dur, C, U) {
    title(U, ctx, 'Un message depuis Mars', t);
    const a = U.appear(t, 0.3, 0.7);
    const ex = 230, mx = 1050, y = 400;
    ctx.save(); ctx.globalAlpha = a;
    const ge = ctx.createRadialGradient(ex - 20, y - 20, 10, ex, y, 70); ge.addColorStop(0, '#7fc3ff'); ge.addColorStop(1, '#1d4f9a'); ctx.fillStyle = ge; ctx.beginPath(); ctx.arc(ex, y, 66, 0, TAU); ctx.fill();
    const gm = ctx.createRadialGradient(mx - 10, y - 10, 5, mx, y, 40); gm.addColorStop(0, '#f2a27a'); gm.addColorStop(1, '#a5482c'); ctx.fillStyle = gm; ctx.beginPath(); ctx.arc(mx, y, 38, 0, TAU); ctx.fill();
    ctx.setLineDash([4, 14]); stroke(ctx, 2, DIM, a); ctx.beginPath(); ctx.moveTo(ex + 80, y); ctx.lineTo(mx - 50, y); ctx.stroke();
    ctx.restore();
    U.text(ctx, 'Terre', ex, y + 112, { font: U.F(700, 26), color: U.INK, alpha: a, align: 'center' });
    U.text(ctx, 'Mars', mx, y + 112, { font: U.F(700, 26), color: U.INK, alpha: a, align: 'center' });
    const k = Math.min(1, Math.max(0, (t - 1.0) / Math.max(2, dur - 3.0)));
    const px = mx - 50 - (mx - 50 - ex - 80) * k;
    ctx.save(); ctx.fillStyle = C.accent; ctx.shadowColor = C.accent; ctx.shadowBlur = 18; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(px, y, 9, 0, TAU); ctx.fill(); ctx.restore();
    const mins = Math.round(20 * k);
    U.text(ctx, mins + ' min', 640, 300, { font: U.F(800, 64), color: C.accent, alpha: a, align: 'center' });
    U.text(ctx, 'jusqu\'à une vingtaine de minutes, dans chaque sens', 640, 560, { font: U.F(500, 26), color: U.INK2, alpha: U.appear(t, 1.6, 0.6), align: 'center' });
  },
  // pression de la cabine et temps de réserve
  pressure(ctx, t, dur, C, U) {
    title(U, ctx, 'Temps de réserve : quand atteindra-t-on 490 mmHg ?', t);
    const X0 = 170, X1 = 1090, Y0 = 600, Y1 = 220, pmin = 460, pmax = 770;
    const px = m => X0 + (X1 - X0) * m / 50, py = p => Y0 - (Y0 - Y1) * (p - pmin) / (pmax - pmin);
    const a = U.appear(t, 0.3, 0.6);
    ctx.save(); stroke(ctx, 1.5, DIM, a);
    for (const p of [490, 600, 715, 760]) { ctx.beginPath(); ctx.moveTo(X0, py(p)); ctx.lineTo(X1, py(p)); ctx.stroke(); U.text(ctx, String(p), X0 - 16, py(p) + 7, { font: U.F(500, 19), color: U.INK3, alpha: a, align: 'right' }); }
    for (let m = 0; m <= 50; m += 10) U.text(ctx, m + ' min', px(m), Y0 + 34, { font: U.F(500, 19), color: U.INK3, alpha: a, align: 'center' });
    ctx.restore();
    const as = U.appear(t, 0.8, 0.6);
    ctx.save(); ctx.setLineDash([10, 8]); stroke(ctx, 2.5, '#FF8A7A', as); ctx.beginPath(); ctx.moveTo(X0, py(490)); ctx.lineTo(X1, py(490)); ctx.stroke(); ctx.restore();
    U.text(ctx, 'Seuil : 490 mmHg', X1, py(490) + 34, { font: U.F(700, 21), color: '#FF8A7A', alpha: as, align: 'right' });
    const k = U.ease((t - 1.6) / Math.max(2.5, dur * 0.5)), mEnd = 45 * k;
    ctx.save(); stroke(ctx, 4, C.accent, 1); ctx.beginPath(); ctx.moveTo(px(0), py(715)); ctx.lineTo(px(mEnd), py(715 - 5 * mEnd)); ctx.stroke();
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(px(mEnd), py(715 - 5 * mEnd), 7, 0, TAU); ctx.fill(); ctx.restore();
    U.text(ctx, 'Départ : 715 mmHg, − 5 par minute', px(0) + 12, py(715) - 18, { font: U.F(500, 21), color: U.INK2, alpha: U.appear(t, 1.4, 0.6) });
    const af = U.appear(t, 1.6 + Math.max(2.5, dur * 0.5), 0.6);
    U.text(ctx, '≈ 45 minutes', px(45) - 10, py(490) - 26, { font: U.F(800, 36), color: C.accent, alpha: af, align: 'right' });
  },
  // rayons cosmiques et particules d'une éruption
  radiation(ctx, t, dur, C, U) {
    title(U, ctx, 'Chaque seconde, dans un volume de la taille d\'une balle de golf', t);
    const cx = 470, cy = 410, R = 150;
    const a = U.appear(t, 0.3, 0.6);
    ctx.save(); stroke(ctx, 2.5, LINE, a); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.restore();
    const burst = U.ease((t - (dur * 0.45)) / 1.2);
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const nBase = 90, nBurst = Math.round(260 * burst);
    const fr = Math.floor(t * 12);
    ctx.save();
    for (let i = 0; i < nBase + nBurst; i++) {
      s = 1 + (i * 7919 + fr * 104729) % 2147483646;
      const th = r() * TAU, off = (r() - 0.5) * 2 * R, len = R * 2;
      const dx = Math.cos(th), dy = Math.sin(th), nx = -dy, ny = dx;
      const x0 = cx + nx * off - dx * len / 2, y0 = cy + ny * off - dy * len / 2;
      const isB = i >= nBase;
      ctx.globalAlpha = a * (isB ? 0.55 : 0.28); ctx.strokeStyle = isB ? C.accent : LINE; ctx.lineWidth = isB ? 1.6 : 1.2;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dx * len, y0 + dy * len); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    U.text(ctx, '≈ 90', 780, 360, { font: U.F(800, 70), color: U.INK, alpha: a });
    U.text(ctx, 'rayons cosmiques, en permanence', 780, 400, { font: U.F(500, 24), color: U.INK2, alpha: a });
    U.text(ctx, '+ 1 000', 780, 500, { font: U.F(800, 70), color: C.accent, alpha: burst });
    U.text(ctx, 'particules de plus pendant une éruption', 780, 540, { font: U.F(500, 24), color: U.INK2, alpha: burst });
    U.text(ctx, 'Source : NASA, « How NASA will protect astronauts from space radiation at the Moon »', 72, 690, { font: U.F(400, 16), color: U.INK3, alpha: burst });
  },
  // bulles d'azote quand la pression baisse
  bubbles(ctx, t, dur, C, U) {
    title(U, ctx, 'Quand la pression baisse trop vite', t);
    const a = U.appear(t, 0.3, 0.6), k = U.ease((t - 1.5) / 3.0);
    const y0 = 340, y1 = 480;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(200,40,60,0.18)'; ctx.fillRect(110, y0, 1060, y1 - y0);
    stroke(ctx, 3, LINE, a); ctx.beginPath(); ctx.moveTo(110, y0); ctx.lineTo(1170, y0); ctx.moveTo(110, y1); ctx.lineTo(1170, y1); ctx.stroke();
    let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) { const x = 130 + ((r() * 1040 + t * 60) % 1040), y = y0 + 20 + r() * (y1 - y0 - 40); ctx.fillStyle = '#d0485a'; ctx.globalAlpha = a * 0.75; ctx.beginPath(); ctx.ellipse(x, y, 13, 9, r(), 0, TAU); ctx.fill(); }
    for (let i = 0; i < 18; i++) { const x = 140 + ((r() * 1000 + t * 45) % 1000), y = y0 + 25 + r() * (y1 - y0 - 50), rr = (3 + r() * 10) * k; if (rr < 0.5) continue; ctx.globalAlpha = a; stroke(ctx, 2, '#eaf6ff', a); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke(); }
    ctx.restore();
    U.text(ctx, 'Un vaisseau sanguin', 110, y0 - 22, { font: U.F(500, 22), color: U.INK2, alpha: a });
    U.text(ctx, 'L\'azote dissous dans le sang forme des bulles', 640, 580, { font: U.F(800, 30), color: C.accent, alpha: U.appear(t, 2.6, 0.6), align: 'center' });
    U.text(ctx, 'comme dans une bouteille de soda qu\'on ouvre', 640, 620, { font: U.F(500, 24), color: U.INK2, alpha: U.appear(t, 3.2, 0.6), align: 'center' });
  },
  // seize levers de soleil par jour
  orbit(ctx, t, dur, C, U) {
    title(U, ctx, 'Un tour de la Terre en 93 minutes', t);
    const cx = 560, cy = 410, R = 150, OR = 215;
    const a = U.appear(t, 0.3, 0.6);
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(cx - R, 0, cx + R, 0); g.addColorStop(0, '#2c6fd0'); g.addColorStop(0.5, '#1b4a8f'); g.addColorStop(0.52, '#0a1730'); g.addColorStop(1, '#081022');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    stroke(ctx, 1.5, DIM, a); ctx.setLineDash([3, 9]); ctx.beginPath(); ctx.arc(cx, cy, OR, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    U.text(ctx, 'Soleil', 120, cy + 8, { font: U.F(700, 24), color: '#ffd27a', alpha: a });
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(90, cy - 40, 22, 0, TAU); ctx.fill(); ctx.restore();
    const turns = Math.max(0, t - 1.0) * 16 / Math.max(3, dur - 2.5);
    const th = -Math.PI / 2 + turns * TAU;
    ctx.save(); ctx.fillStyle = C.accent; ctx.shadowColor = C.accent; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(cx + Math.cos(th) * OR, cy + Math.sin(th) * OR, 9, 0, TAU); ctx.fill(); ctx.restore();
    const n = Math.min(16, Math.floor(turns + 0.25));
    U.text(ctx, String(n), 900, 400, { font: U.F(800, 110), color: C.accent, alpha: a });
    U.text(ctx, 'levers de soleil par jour', 900, 448, { font: U.F(500, 28), color: U.INK2, alpha: a });
  }
};
