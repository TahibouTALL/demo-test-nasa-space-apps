// Les personnages dans les films : position, entrée, poses successives, objets tenus, effets.
import { W, H, PI, TAU, C, clamp, lerp, E, pr, rr, circle, line, glowDot, hexA, R, icon } from './base.mjs';

// ---------------------------------------------------------------- objets (dessinés dans le repère du personnage : 1 = sa taille)
const HR = R.L.head;
const rot = (a, x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const sideFace = (j, x, y) => { const d = rot(j.hd, x * HR, y * HR); return [j.H[0] + d[0], j.H[1] + d[1]]; };
const hands = (j, front) => front ? [j.armR.W, j.armL.W] : [j.armN.W, j.armF.W];
function box(ctx, x, y, w, h, r, col) { ctx.fillStyle = col; rr(ctx, x - w / 2, y - h / 2, w, h, r); ctx.fill(); }

export const PROPS = {
  pouch(ctx, j, t, front) { const [h] = hands(j, front); ctx.save(); ctx.translate(h[0] + 0.012, h[1] - 0.03); ctx.rotate(-0.35); box(ctx, 0, 0, 0.065, 0.095, 0.018, '#8FD3FF'); box(ctx, -0.012, -0.005, 0.016, 0.06, 0.008, 'rgba(255,255,255,0.65)'); box(ctx, 0, 0.012, 0.05, 0.04, 0.012, '#4FB3FF'); line(ctx, 0.012, -0.045, 0.02, -0.075, 0.009, '#F2F4FF'); ctx.restore(); },
  tablet(ctx, j, t, front) { const [a, b] = hands(j, front); const x = (a[0] + b[0]) / 2 + 0.03, y = (a[1] + b[1]) / 2 - 0.035; ctx.save(); ctx.translate(x, y); ctx.rotate(front ? 0 : -1.05); box(ctx, 0, 0, 0.17, 0.115, 0.016, '#2A3150'); box(ctx, 0, 0, 0.15, 0.095, 0.01, '#79D8FF'); for (let i = 0; i < 3; i++) box(ctx, -0.02, -0.025 + i * 0.025, 0.09, 0.008, 0.004, 'rgba(16,22,58,0.55)'); ctx.restore(); },
  laptop(ctx, j, t, front) { const [a] = hands(j, front); const x = a[0] - 0.02, y = a[1] + 0.025; box(ctx, x, y, 0.2, 0.018, 0.006, '#9AA6BA'); ctx.save(); ctx.translate(x + 0.1, y); ctx.rotate(-1.25); box(ctx, 0.07, 0, 0.14, 0.014, 0.005, '#3A4256'); ctx.restore(); glowDot(ctx, x + 0.13, y - 0.07, 0.06, '#79D8FF', 0.35); },
  medkit(ctx, j, t, front) { const [h] = hands(j, front); const x = h[0], y = h[1] + 0.055; line(ctx, x - 0.02, y - 0.05, x + 0.02, y - 0.05, 0.012, '#C9CFD9'); box(ctx, x, y, 0.13, 0.095, 0.016, '#F5F7FC'); box(ctx, x, y, 0.045, 0.014, 0.004, '#E2463F'); box(ctx, x, y, 0.014, 0.045, 0.004, '#E2463F'); },
  o2mask(ctx, j, t, front) {
    if (front) { const c = [j.H[0], j.H[1] + HR * 0.42]; line(ctx, c[0], c[1] + 0.03, c[0] + 0.06, j.S[1] + 0.12, 0.012, '#5A6273'); box(ctx, c[0] + 0.07, j.S[1] + 0.15, 0.04, 0.08, 0.014, '#F2A33A'); ctx.fillStyle = '#E9EEF5'; ctx.beginPath(); ctx.ellipse(c[0], c[1], HR * 0.5, HR * 0.4, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8E98AC'; ctx.lineWidth = 0.008; ctx.stroke(); line(ctx, c[0] - HR * 0.5, c[1] - 0.01, c[0] - HR, c[1] - 0.04, 0.008, '#3A4256'); line(ctx, c[0] + HR * 0.5, c[1] - 0.01, c[0] + HR, c[1] - 0.04, 0.008, '#3A4256'); return; }
    const c = sideFace(j, 0.78, 0.42);
    line(ctx, c[0], c[1] + 0.02, j.S[0] + 0.07, j.S[1] + 0.13, 0.012, '#5A6273');
    box(ctx, j.S[0] + 0.07, j.S[1] + 0.17, 0.04, 0.085, 0.014, '#F2A33A');
    ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(j.hd); ctx.fillStyle = '#E9EEF5'; ctx.beginPath(); ctx.ellipse(0, 0, HR * 0.42, HR * 0.48, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8E98AC'; ctx.lineWidth = 0.008; ctx.stroke(); ctx.restore();
    const s0 = sideFace(j, 0.4, 0.2), s1 = sideFace(j, -0.95, -0.1); line(ctx, s0[0], s0[1], s1[0], s1[1], 0.009, '#3A4256');
  },
  extinguisher(ctx, j, t, front, A) {
    const [h] = hands(j, front); const x = h[0] - 0.01, y = h[1] + 0.05;
    box(ctx, x, y, 0.06, 0.17, 0.025, '#E2463F'); box(ctx, x - 0.01, y, 0.014, 0.12, 0.007, 'rgba(255,255,255,0.35)'); box(ctx, x, y - 0.09, 0.04, 0.02, 0.006, '#2A2F3B');
    const nx = h[0] + 0.07, ny = h[1] - 0.02; line(ctx, x, y - 0.1, nx, ny, 0.014, '#2A2F3B');
    if (A && A.spraying) { for (let i = 0; i < 14; i++) { const q = (t * 2.2 + i / 14) % 1; ctx.globalAlpha = (1 - q) * 0.8; circle(ctx, nx + q * 0.55, ny + Math.sin(i * 7.1) * q * 0.12, 0.015 + q * 0.05, '#F2F4FF'); } ctx.globalAlpha = 1; }
  },
  scope(ctx, j, t, front) { const [h] = hands(j, front); box(ctx, h[0] + 0.01, h[1] - 0.03, 0.025, 0.09, 0.01, '#2A2F3B'); circle(ctx, h[0] + 0.012, h[1] - 0.085, 0.02, '#4A5264'); glowDot(ctx, h[0] + 0.05, h[1] - 0.088, 0.07, '#FFF3C4', 0.6); },
  aed(ctx, j, t, front) { const [a, b] = hands(j, front); const x = (a[0] + b[0]) / 2 + 0.03, y = (a[1] + b[1]) / 2 + 0.03; box(ctx, x, y, 0.16, 0.12, 0.02, '#FFC24B'); box(ctx, x, y - 0.075, 0.07, 0.02, 0.008, '#C98B2B'); ctx.save(); ctx.translate(x, y); ctx.scale(0.0042, 0.0042); icon(ctx, 'bolt', 0, 0, 24, '#2A1D06', 2.6); ctx.restore(); },
  tray(ctx, j, t, front) { const [, b] = hands(j, front); const x = b[0] + 0.03, y = b[1] + 0.005; box(ctx, x, y, 0.2, 0.018, 0.008, '#C9D1DE'); box(ctx, x - 0.05, y - 0.025, 0.05, 0.035, 0.01, '#FF9F45'); box(ctx, x + 0.01, y - 0.022, 0.045, 0.03, 0.01, '#7BE3C6'); box(ctx, x + 0.065, y - 0.02, 0.035, 0.025, 0.008, '#F4F1E8'); },
  sleepbag(ctx, j) { const top = j.S[1] - 0.005, bot = Math.max(j.legN.T[1], j.legF.T[1], j.legN.A[1]) + 0.05; ctx.fillStyle = '#4F6FB0'; rr(ctx, -0.13, top, 0.27, bot - top, 0.11); ctx.fill(); ctx.fillStyle = '#5E80C4'; rr(ctx, -0.13, top, 0.27, 0.07, 0.035); ctx.fill(); ctx.strokeStyle = 'rgba(30,40,80,0.35)'; ctx.lineWidth = 0.008; for (let i = 1; i < 5; i++) { const y = top + (bot - top) * i / 5; ctx.beginPath(); ctx.moveTo(-0.12, y); ctx.lineTo(0.13, y); ctx.stroke(); } line(ctx, 0.0, top + 0.07, 0.0, bot - 0.04, 0.006, 'rgba(255,255,255,0.4)'); },
  alarmpanel(ctx, j, t, front) { const [h] = hands(j, front); const x = h[0] + 0.05, y = h[1]; box(ctx, x + 0.04, y, 0.08, 0.2, 0.012, '#9AA6BA'); box(ctx, x + 0.04, y, 0.06, 0.17, 0.01, '#C3CCDA'); circle(ctx, x + 0.025, y, 0.03, '#E2463F'); glowDot(ctx, x + 0.025, y, 0.08, '#FF4A4A', 0.4 + 0.3 * Math.sin(t * 8)); },
  patch(ctx, j, t, front) { const [h] = hands(j, front); box(ctx, h[0] + 0.03, h[1], 0.02, 0.09, 0.004, '#F5F2E8'); box(ctx, h[0] + 0.045, h[1], 0.012, 0.2, 0.004, '#B7C0CF'); }
};
// objets portés sur le visage ou la poitrine (après la tête)
function faceProps(ctx, j, A, front) {
  if (A.glasses) {
    ctx.strokeStyle = '#1C1B26'; ctx.lineWidth = 0.009;
    if (front) { const y = j.H[1] - HR * 0.04; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(j.H[0] + s * HR * 0.34, y, HR * 0.24, 0, TAU); ctx.stroke(); } line(ctx, j.H[0] - HR * 0.1, y, j.H[0] + HR * 0.1, y, 0.008, '#1C1B26'); }
    else { const e = sideFace(j, 0.5, -0.08), b = sideFace(j, -0.1, -0.12); ctx.beginPath(); ctx.arc(e[0], e[1], HR * 0.26, 0, TAU); ctx.stroke(); line(ctx, e[0] - HR * 0.25, e[1] - 0.003, b[0], b[1], 0.008, '#1C1B26'); }
  }
  if (A.eyemask) {
    if (front) { box(ctx, j.H[0], j.H[1] - HR * 0.05, HR * 2.05, HR * 0.42, HR * 0.18, '#3B4A86'); }
    else { ctx.save(); ctx.translate(j.H[0], j.H[1]); ctx.rotate(j.hd); box(ctx, HR * 0.05, -HR * 0.08, HR * 2.0, HR * 0.4, HR * 0.18, '#3B4A86'); ctx.restore(); }
  }
  if (A.badge) { const p = front ? [j.S[0] + 0.05, j.S[1] + 0.07] : [j.S[0] + 0.05, j.S[1] + 0.08]; box(ctx, p[0], p[1], 0.04, 0.05, 0.008, '#FFC870'); box(ctx, p[0], p[1] + 0.008, 0.026, 0.018, 0.004, '#C98B2B'); }
}

// ---------------------------------------------------------------- un personnage
function poseOf(name, t, face) {
  const f = R.P[name]; if (!f) throw new Error('pose inconnue : ' + name);
  return f(t, { face });
}
// position (normalisée) au temps n, avec les images clés de déplacement
function posAt(A, tm) {
  if (!A.move) return [A.x, A.y];
  const keys = A.move.map(([at, x, y]) => [tm.at(at), x, y]);
  if (tm.n <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, x0, y0] = keys[i], [b, x1, y1] = keys[i + 1];
    if (tm.n <= b) { const k = E.inOut((tm.n - a) / Math.max(0.01, b - a)); return [lerp(x0, x1, k), lerp(y0, y1, k)]; }
  }
  const l = keys[keys.length - 1]; return [l[1], l[2]];
}

// dessine le calque ; enregistre la position de quelques repères pour les étiquettes
export function actor(ctx, A, tm, reg, idx) {
  const t = tm.t, n = tm.n;
  const a0 = A.at !== undefined ? tm.at(A.at) : -tm.lead;
  if (n < a0) return;
  const a1 = A.out !== undefined ? tm.at(A.out) : 1e9;
  if (n > a1 + 0.35) return;
  let [x, y] = posAt(A, tm);
  // entrée
  let alpha = 1, sc = 1, rotIn = 0;
  if (A.in) {
    const k = E.out(pr(n, a0, 0.85));
    if (A.in === 'left') { x = lerp(-0.25, x, k); rotIn = (1 - k) * -0.4; }
    else if (A.in === 'right') { x = lerp(1.25, x, k); rotIn = (1 - k) * 0.4; }
    else if (A.in === 'top') y = lerp(-0.4, y, k);
    else if (A.in === 'bottom') y = lerp(1.4, y, k);
    else if (A.in === 'pop') sc = E.back(pr(n, a0, 0.55));
    else if (A.in === 'fade') alpha = k;
  } else if (A.at !== undefined) sc = E.back(pr(n, a0, 0.45));
  if (n > a1) { const k = pr(n, a1, 0.35); alpha *= 1 - k; sc *= 1 - 0.15 * k; }
  if (sc <= 0.01 || alpha <= 0) return;
  // pose (avec enchaînements)
  const face = A.faceAt && n >= tm.at(A.faceAt[0]) ? Object.assign({}, A.face, A.faceAt[1]) : A.face;
  let pose = poseOf(A.pose, t, face);
  if (A.poses) for (const [at, name] of A.poses) { const k = E.inOut(pr(n, tm.at(at), 0.4)); if (k > 0) pose = R.blend(pose, poseOf(name, t, face), k); }
  const front = pose.view === 'front';
  // flottement
  const bob = A.walk !== undefined || A.bob === 0 ? 0 : (A.bob ?? 1);
  const ph = idx * 1.7;
  y += bob * 0.008 * Math.sin(t * 1.15 + ph);
  let r = (A.rot || 0) + (A.spin || 0) * t + rotIn + bob * 0.025 * Math.sin(t * 0.8 + ph);
  let s = A.h * H * sc;
  if (A.grow !== undefined) s *= 1 + 0.045 * E.inOut(pr(n, tm.at(A.grow), 1.4));
  const headK = A.puffy !== undefined ? 1 + 0.15 * E.inOut(pr(n, tm.at(A.puffy), 1.0)) : 1;
  const legK = A.thin !== undefined ? 1 - 0.3 * E.inOut(pr(n, tm.at(A.thin), 1.0)) : 1;
  let hl = A.hl ? Object.fromEntries(Object.entries(A.hl).map(([k, v]) => [k, v * (0.55 + 0.45 * Math.sin(t * 4))])) : null;
  if (A.hlAt && n >= tm.at(A.hlAt[0])) hl = Object.fromEntries(Object.entries(A.hlAt[1]).map(([k, v]) => [k, v * (0.55 + 0.45 * Math.sin(t * 4)) * pr(n, tm.at(A.hlAt[0]), 0.5)]));
  const st = { spraying: A.spray !== undefined && n >= tm.at(A.spray), glasses: A.glasses !== undefined && n >= tm.at(A.glasses), eyemask: A.eyemask !== undefined && n >= tm.at(A.eyemask), badge: A.badge };
  const itemAt = A.maskAt !== undefined ? tm.at(A.maskAt) : -1e9;
  const prop = A.item && n >= itemAt ? PROPS[A.item] : null;
  const behind = A.item === 'tray' || A.item === 'laptop';
  const px = x * W, py = y * H, flip = !!A.flip;
  ctx.save(); ctx.globalAlpha *= alpha;
  const j = R.draw(ctx, pose, {
    who: A.who, s, x: px, y: py, flip, rot: r, t: t + idx * 3.1, hl, suit: A.suit, headK, legK,
    item: prop && behind ? (c2, jj) => prop(c2, jj, t, front, st) : null,
    itemFront: (c2, jj) => { if (prop && !behind) prop(c2, jj, t, front, st); faceProps(c2, jj, st, front); }
  });
  ctx.restore();
  // repères en pixels
  const fl = flip ? -1 : 1, cr = Math.cos(r), sr = Math.sin(r);
  const P = (jx, jy) => [px + (cr * fl * jx - sr * jy) * s, py + (sr * fl * jx + cr * jy) * s];
  const headP = P(j.H[0], j.H[1]);
  const marks = {
    head: P(j.H[0] + (front ? 0 : 0.03), j.H[1] - 0.02), nose: front ? P(j.H[0], j.H[1] + HR * 0.18) : P(...sideFace(j, 0.95, 0.1)),
    legs: front ? P(j.legR.K[0], j.legR.K[1] + 0.05) : P(j.legN.K[0], j.legN.K[1] + 0.05), pelvis: P(0, 0),
    badge: P(j.S[0] + 0.05, j.S[1] + 0.08), top: P(j.H[0], j.H[1] - HR * 1.4)
  };
  reg.push(marks);
  // effets
  for (const fx of A.fx || []) {
    const [name, fa, fb] = Array.isArray(fx) ? fx : [fx];
    if (fa !== undefined && n < tm.at(fa)) continue;
    if (fb !== undefined && n > tm.at(fb)) continue;
    const [kind, where] = name.split('@');
    let p = headP;
    if (where === 'lowback') p = front ? P(0.09, -0.06) : P(-0.09, -0.08);
    else if (where === 'side') p = P(front ? 0.12 : 0.02, -0.14);
    else if (where === 'head') p = P(j.H[0], j.H[1] - HR);
    if (kind === 'stars') R.fx.stars(ctx, headP[0], headP[1] - HR * 1.1 * s, s, t);
    else if (kind === 'zzz') R.fx.zzz(ctx, headP[0] + 0.1 * s * fl, headP[1] - 0.1 * s, s, t);
    else if (kind === 'pain') R.fx.pain(ctx, p[0], p[1], s * 1.4, t);
    else if (kind === 'sweat') R.fx.sweat(ctx, headP[0] + 0.1 * s * fl, headP[1] - 0.04 * s, s, t);
    else if (kind === 'sparkle') R.fx.sparkle(ctx, px, py - 0.25 * s, s * 1.5, t);
    else if (kind === 'mark') R.fx.mark(ctx, headP[0] + 0.12 * s * fl, headP[1] - 0.16 * s, s, t, where || '?');
  }
}

// ---------------------------------------------------------------- un exercice sur son appareil (cadre w x h)
export function exercise(ctx, A, tm, reg) {
  const n = tm.n, t = tm.t;
  const a0 = A.at !== undefined ? tm.at(A.at) : -tm.lead;
  if (n < a0) return;
  const k = A.in === 'pop' || A.at !== undefined ? E.back(pr(n, a0, 0.55)) : 1;
  const w = A.w * W, h = A.h * H, x = A.x * W - w / 2, y = A.y * H - h / 2;
  let key = A.ex, hl = A.hl;
  let swapK = 1;
  if (A.swap) { const at = tm.at(A.swap[0]); if (n >= at) { key = A.swap[1]; hl = A.swap[2]; swapK = E.back(pr(n, at, 0.5)); } }
  ctx.save(); ctx.translate(x + w / 2, y + h); ctx.scale(k * swapK, k * swapK); ctx.translate(-w / 2, -h);
  R.drawExercise(ctx, key, t, w, h, { who: A.who, hl });
  ctx.restore();
  reg.push({ head: [x + w / 2, y + h * 0.2], pelvis: [x + w / 2, y + h * 0.55] });
}
