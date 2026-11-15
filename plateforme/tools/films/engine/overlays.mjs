// Textes à l'écran (en français) : titre, chiffres, pastilles, alertes, étiquettes, bulles, étapes, carte de fin.
import { W, H, PI, TAU, C, CAT, clamp, lerp, E, pr, rr, circle, line, hexA, glowDot, font, text, wrap, fr, icon, badge } from './base.mjs';

const CARD = 'rgba(16,22,58,0.92)';
function card(ctx, x, y, w, h, r = 18, fill = CARD) {
  ctx.save(); ctx.shadowColor = 'rgba(4,8,30,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.restore();
}
// apparition : léger rebond d'échelle, fondu, petite montée
function pop(ctx, k, cx, cy, fn) {
  if (k <= 0) return;
  const s = 0.82 + 0.18 * E.back(k), a = clamp(k * 1.6, 0, 1);
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy + (1 - E.out(k)) * 14); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore();
}
const accentOf = cat => (cat === 'securite' ? C.signal : C.ok);

// ---------------------------------------------------------------- titre du film (premier plan)
export function title(ctx, L, tm, film) {
  const n = tm.n, cat = CAT[film.cat];
  // voile sombre à gauche pour la lisibilité
  const g = ctx.createLinearGradient(0, 0, W * 0.72, 0); g.addColorStop(0, 'rgba(8,12,36,0.88)'); g.addColorStop(0.6, 'rgba(8,12,36,0.55)'); g.addColorStop(1, 'rgba(8,12,36,0)');
  ctx.save(); ctx.globalAlpha = E.out(pr(n, -0.6, 0.6)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  const x = 92;
  // pastille de catégorie
  const k0 = pr(n, -0.45, 0.5);
  pop(ctx, k0, x + 80, 196, () => {
    ctx.font = font(700, 22); const lw = ctx.measureText(cat.label).width;
    ctx.fillStyle = hexA(cat.col, 0.18); rr(ctx, x, 176, lw + 54, 42, 21); ctx.fill();
    circle(ctx, x + 22, 197, 6, cat.col);
    ctx.fillStyle = cat.col; ctx.fillText(cat.label, x + 38, 205);
    if (film.fiche) { ctx.font = font(500, 20); ctx.fillStyle = C.ink3; ctx.fillText('Fiche ' + film.fiche, x + lw + 72, 205); }
  });
  // le titre, mot par mot
  ctx.font = font(800, 74);
  const lines = wrap(ctx, film.title, 640);
  let wi = 0;
  lines.forEach((ln, li) => {
    let xx = x; const yy = 300 + li * 84;
    for (const w of ln.split(' ')) {
      const k = pr(n, -0.25 + wi * 0.085, 0.45); wi++;
      if (k > 0) { ctx.save(); ctx.globalAlpha = clamp(k * 1.5, 0, 1); ctx.fillStyle = C.ink; ctx.font = font(800, 74); ctx.translate(0, (1 - E.back(k)) * 26); ctx.fillText(w, xx, yy); ctx.restore(); }
      ctx.font = font(800, 74); xx += ctx.measureText(w + ' ').width;
    }
  });
  // trait d'accent
  const kb = E.out(pr(n, 0.25 + wi * 0.085, 0.6));
  line(ctx, x, 300 + lines.length * 84 - 30, x + 120 * kb, 300 + lines.length * 84 - 30, 8, accentOf(film.cat));
  // marque AURA en bas
  ctx.save(); ctx.globalAlpha = E.out(pr(n, 0.4, 0.6)) * 0.85; ctx.font = font(800, 22); ctx.fillStyle = C.ink2; ctx.fillText('AURA', x, H - 64); ctx.font = font(500, 20); ctx.fillStyle = C.ink3; ctx.fillText('Films de santé et de sécurité', x + 72, H - 64); ctx.restore();
}

// ---------------------------------------------------------------- grand chiffre
export function stat(ctx, L, tm, film, k) {
  const cx = (L.x ?? 0.5) * W, cy = (L.y ?? 0.5) * H;
  const size = L.size || (String(L.big).length > 8 ? 70 : 92);
  ctx.font = font(800, size); const bw = ctx.measureText(fr(L.big)).width;
  ctx.font = font(500, 28); const sw = ctx.measureText(fr(L.small || '')).width;
  const w = Math.max(bw, sw) + 72, h = size + (L.small ? 58 : 20) + 24;
  const x0 = clamp(cx - w / 2, 28, W - 28 - w), y0 = clamp(cy - h / 2, 28, H - 28 - h), mx = x0 + w / 2;
  pop(ctx, k, mx, y0 + h / 2, () => {
    card(ctx, x0, y0, w, h, 22);
    text(ctx, L.big, mx, y0 + size * 0.98, { font: font(800, size), color: L.col || C.gold, align: 'center' });
    if (L.small) text(ctx, L.small, mx, y0 + h - 28, { font: font(500, 28), color: C.ink2, align: 'center' });
  });
}

// ---------------------------------------------------------------- pastilles (conseils), apparaissent avec la voix
const CHIP_COL = [C.atmo, C.ok, C.gold, C.sophie, C.warn];
export function chips(ctx, L, tm, film) {
  const x = (L.x ?? 0.55) * W; let y = (L.y ?? 0.2) * H;
  const ats = L.at || [];
  L.items.forEach(([ic, label], i) => {
    const a = ats[i] !== undefined ? tm.at(ats[i]) : -99;
    const k = pr(tm.n, a, 0.5);
    ctx.font = font(700, 30); const w = ctx.measureText(fr(label)).width + 108, h = 74;
    pop(ctx, k, x + w / 2, y + h / 2, () => {
      card(ctx, x, y, w, h, 37);
      badge(ctx, ic, x + 38, y + 37, 25, CHIP_COL[i % CHIP_COL.length], '#10163A');
      text(ctx, label, x + 76, y + 47, { font: font(700, 30), color: C.ink });
    });
    y += h + 16;
  });
}

// ---------------------------------------------------------------- alerte (rouge) et note (couleur au choix), en haut de l'image
export function warn(ctx, L, tm, film, k, kout) { banner(ctx, L, k, kout, C.signal, '#FFFFFF', 'warn', tm); }
export function note(ctx, L, tm, film, k, kout) {
  const col = { ok: C.ok, violet: C.sophie, gold: C.gold, blue: C.atmo }[L.tone || 'ok'];
  banner(ctx, L, k, kout, col, '#0E1433', L.icon || 'check', tm);
}
function banner(ctx, L, k, kout, bg, fg, ic, tm) {
  if (k <= 0) return;
  ctx.font = font(800, 31);
  const label = fr(L.text), tw = ctx.measureText(label).width, w = tw + 120, h = 78;
  const cx = (L.x ?? 0.5) * W, y0 = (L.y ?? 0.075) * H;
  const x = clamp(cx - w / 2, 24, W - 24 - w);
  const shake = L === undefined ? 0 : Math.sin(tm.n * 40) * 5 * Math.max(0, 1 - pr(tm.n, tm.at(L.at), 0.5)) * (ic === 'warn' ? 1 : 0);
  ctx.save(); ctx.globalAlpha *= clamp(k * 1.5, 0, 1) * (1 - (kout || 0));
  ctx.translate(shake, (1 - E.back(k)) * -40);
  ctx.save(); ctx.shadowColor = hexA(bg, 0.45); ctx.shadowBlur = 30; ctx.shadowOffsetY = 6; ctx.fillStyle = bg; rr(ctx, x, y0, w, h, 39); ctx.fill(); ctx.restore();
  circle(ctx, x + 40, y0 + h / 2, 24, ic === 'warn' ? 'rgba(255,255,255,0.22)' : 'rgba(14,20,51,0.14)');
  icon(ctx, ic, x + 40, y0 + h / 2 - 1, 30, fg, 2.4);
  ctx.fillStyle = fg; ctx.fillText(label, x + 78, y0 + 50);
  ctx.restore();
}

// ---------------------------------------------------------------- étiquette (avec un trait vers un point)
export function tag(ctx, L, tm, film, k, kout, target) {
  if (k <= 0) return;
  ctx.font = font(700, 26);
  const label = fr(L.text), w = ctx.measureText(label).width + 40, h = 50;
  let x = (L.x ?? 0.5) * W, y = (L.y ?? 0.2) * H;
  if (L.center) x -= w / 2;
  ctx.save(); ctx.globalAlpha *= clamp(k * 1.5, 0, 1) * (1 - (kout || 0));
  if (target) {
    const sx = target[0] < x ? x : target[0] > x + w ? x + w : target[0], sy = y + h / 2;
    const kl = E.out(pr(k, 0.3, 0.7));
    const ex = lerp(sx, target[0], kl), ey = lerp(sy, target[1], kl);
    line(ctx, sx, sy, ex, ey, 3, 'rgba(255,255,255,0.9)');
    if (kl > 0.95) { circle(ctx, target[0], target[1], 9, 'rgba(255,255,255,0.35)'); circle(ctx, target[0], target[1], 5, '#FFFFFF'); }
  }
  const s = 0.85 + 0.15 * E.back(k);
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.save(); ctx.shadowColor = 'rgba(4,8,30,0.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
  ctx.fillStyle = L.tone === 'signal' ? C.signal : '#FFFFFF'; rr(ctx, x, y, w, h, 25); ctx.fill(); ctx.restore();
  ctx.fillStyle = L.tone === 'signal' ? '#FFFFFF' : '#141A3C'; ctx.fillText(label, x + 20, y + 34);
  ctx.restore();
}

// ---------------------------------------------------------------- bulle de parole
export function bubble(ctx, L, tm, film, k) {
  if (k <= 0) return;
  ctx.font = font(700, 28);
  const lines = wrap(ctx, L.text, 380), w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 48, h = lines.length * 36 + 30;
  const cx = (L.x ?? 0.5) * W, cy = (L.y ?? 0.2) * H, x = cx - w / 2, y = cy - h / 2;
  pop(ctx, k, cx, cy + h / 2, () => {
    ctx.save(); ctx.shadowColor = 'rgba(4,8,30,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.fillStyle = '#FFFFFF';
    rr(ctx, x, y, w, h, 24); ctx.fill();
    const tx = L.side === 'left' ? x + 40 : x + w - 50; ctx.beginPath(); ctx.moveTo(tx, y + h - 2); ctx.lineTo(tx + 26, y + h - 2); ctx.lineTo(tx + 8, y + h + 24); ctx.closePath(); ctx.fill(); ctx.restore();
    lines.forEach((l, i) => { ctx.fillStyle = '#141A3C'; ctx.fillText(l, x + 24, y + 42 + i * 36); });
  });
}

// ---------------------------------------------------------------- tampon (lieu, date), en haut à gauche, lettre par lettre
export function stamp(ctx, L, tm, film, k) {
  if (k <= 0) return;
  const s = fr(L.text), nC = Math.floor(s.length * clamp(k * 1.6, 0, 1));
  ctx.font = font(800, 30); const w = ctx.measureText(s).width + 92, h = 62, x = 40, y = 34;
  ctx.save(); ctx.globalAlpha *= clamp(k * 3, 0, 1);
  card(ctx, x, y, w, h, 31);
  circle(ctx, x + 32, y + h / 2, 7, accentOf(film.cat));
  ctx.fillStyle = C.ink; ctx.fillText(s.slice(0, nC), x + 56, y + 42);
  ctx.restore();
}

// ---------------------------------------------------------------- grande phrase au centre
export function big(ctx, L, tm, film) {
  const n = tm.n, a = tm.at(L.at ?? 0);
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, W * 0.55); g.addColorStop(0, 'rgba(8,12,36,0.7)'); g.addColorStop(1, 'rgba(8,12,36,0)');
  ctx.save(); ctx.globalAlpha = E.out(pr(n, a, 0.5)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.font = font(800, 86);
  const words = fr(L.text).split(' '); const total = ctx.measureText(fr(L.text)).width;
  let xx = W / 2 - total / 2;
  words.forEach((w, i) => {
    const k = pr(n, a + i * 0.12, 0.45);
    ctx.font = font(800, 86); const ww = ctx.measureText(w + ' ').width;
    if (k > 0) { ctx.save(); ctx.globalAlpha = clamp(k * 1.5, 0, 1); ctx.translate(xx + ww / 2, H * 0.44); const s = 0.6 + 0.4 * E.back(k); ctx.scale(s, s); ctx.fillStyle = C.ink; ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 20; ctx.fillText(w, -ww / 2, 0); ctx.restore(); }
    xx += ww;
  });
  const kl = E.out(pr(n, a + words.length * 0.12 + 0.2, 0.5));
  line(ctx, W / 2 - 70 * kl, H * 0.44 + 40, W / 2 + 70 * kl, H * 0.44 + 40, 8, accentOf(film.cat));
}

// ---------------------------------------------------------------- étapes numérotées (une séquence)
export function steps(ctx, L, tm, film, k) {
  const n = tm.n, items = L.items, N = items.length, acc = accentOf(film.cat);
  const cur = L.cur;
  if (L.big) {
    const w = 300, h = 300, gap = 44, x0 = W / 2 - (N * w + (N - 1) * gap) / 2, y0 = H * 0.42 - h / 2;
    items.forEach((label, i) => {
      const ki = pr(n, (L.at !== undefined ? tm.at(L.at) : -0.3) + i * 0.32, 0.55);
      const x = x0 + i * (w + gap);
      const done = L.done ? n >= tm.at(L.done[i]) : false;
      pop(ctx, ki, x + w / 2, y0 + h / 2, () => {
        card(ctx, x, y0, w, h, 32);
        circle(ctx, x + w / 2, y0 + 96, 58, done ? C.ok : hexA(acc, 0.2));
        if (done) icon(ctx, 'check', x + w / 2, y0 + 96, 56, '#10163A', 3);
        else icon(ctx, (L.icons || [])[i] || 'check', x + w / 2, y0 + 96, 56, acc, 2.4);
        text(ctx, String(i + 1), x + 34, y0 + 58, { font: font(800, 34), color: C.ink3 });
        text(ctx, label, x + w / 2, y0 + 232, { font: font(800, 38), color: C.ink, align: 'center' });
      });
    });
    return;
  }
  // bandeau compact en haut, l'étape en cours mise en avant
  const w = 250, h = 64, gap = 14, x0 = W / 2 - (N * w + (N - 1) * gap) / 2, y0 = 30;
  ctx.save(); ctx.globalAlpha *= clamp(k * 1.6, 0, 1);
  items.forEach((label, i) => {
    const x = x0 + i * (w + gap), on = i === cur, past = cur !== undefined && i < cur;
    ctx.save(); if (on) { ctx.shadowColor = hexA(acc, 0.6); ctx.shadowBlur = 26; }
    ctx.fillStyle = on ? acc : past ? 'rgba(16,22,58,0.85)' : 'rgba(16,22,58,0.7)'; rr(ctx, x, y0, w, h, 32); ctx.fill(); ctx.restore();
    const fg = on ? '#160B12' : past ? C.ok : C.ink3;
    circle(ctx, x + 34, y0 + h / 2, 20, on ? 'rgba(22,11,18,0.15)' : 'rgba(255,255,255,0.08)');
    if (past) icon(ctx, 'check', x + 34, y0 + h / 2, 24, C.ok, 3); else text(ctx, String(i + 1), x + 34, y0 + h / 2 + 9, { font: font(800, 26), color: fg, align: 'center' });
    text(ctx, label, x + 64, y0 + h / 2 + 10, { font: font(800, 27), color: on ? '#160B12' : past ? C.ink : C.ink2 });
  });
  ctx.restore();
}

// ---------------------------------------------------------------- carte de fin : la fiche, les sources
export function endCard(ctx, t, film, srcs) {
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#141C45'); g.addColorStop(1, '#0A0F2A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glowDot(ctx, W * 0.85, H * 0.2, 420, accentOf(film.cat), 0.12);
  const k = s => E.out(pr(t, s, 0.6));
  ctx.save(); ctx.globalAlpha = k(0.1);
  text(ctx, 'AURA', 92, 150, { font: font(800, 54), color: C.ink });
  text(ctx, 'Films de santé et de sécurité', 92, 192, { font: font(500, 26), color: C.ink3 });
  ctx.restore();
  ctx.save(); ctx.globalAlpha = k(0.4);
  text(ctx, film.title, 92, 290, { font: font(800, 44), color: C.ink, maxW: 820 });
  if (film.fiche) {
    ctx.font = font(700, 24); const lbl = 'Fiche ' + film.fiche + ' dans AURA', w = ctx.measureText(lbl).width + 60;
    ctx.fillStyle = hexA(accentOf(film.cat), 0.16); rr(ctx, 92, 330, w, 50, 25); ctx.fill(); circle(ctx, 118, 355, 6, accentOf(film.cat));
    ctx.fillStyle = accentOf(film.cat); ctx.fillText(lbl, 134, 363);
  }
  ctx.restore();
  ctx.save(); ctx.globalAlpha = k(0.8);
  text(ctx, 'Sources', 92, 460, { font: font(700, 24), color: C.ink2 });
  let sy = 500; srcs.slice(0, 3).forEach(s => { sy += text(ctx, s.t, 92, sy, { font: font(500, 21), color: C.ink3, maxW: 760, lh: 1.25 }) + 8; });
  ctx.restore();
}

export const OVERLAYS = { title, stat, chips, warn, note, tag, bubble, stamp, big, steps };
