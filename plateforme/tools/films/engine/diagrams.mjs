// Schémas animés des films. Chaque schéma reçoit (ctx, L, tm, k, u) :
// L le calque (x, y, s, paramètres), tm les temps du plan, k l'apparition (0..1), u le temps écoulé depuis l'apparition.
import { W, H, PI, TAU, C, clamp, lerp, E, pr, rng, rr, circle, line, poly, hexA, glowDot, font, text, fr, icon, badge, mixC, R } from './base.mjs';
import { earth, iss } from './scenes.mjs';

const at = (tm, s, d = 0) => (s === undefined ? d : tm.at(s));
const CARD = 'rgba(16,22,58,0.92)';
function card(ctx, x, y, w, h, r = 22, fill = CARD) { ctx.save(); ctx.shadowColor = 'rgba(4,8,30,0.4)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.restore(); }
function label(ctx, s, x, y, o = {}) { return text(ctx, s, x, y, Object.assign({ font: font(o.w || 700, o.px || 26), color: o.color || C.ink, align: o.align || 'center' }, o)); }
function capsule(ctx, x1, y1, x2, y2, r) { const a = Math.atan2(y2 - y1, x2 - x1); ctx.moveTo(x2 + Math.cos(a - PI / 2) * r, y2 + Math.sin(a - PI / 2) * r); ctx.arc(x2, y2, r, a - PI / 2, a + PI / 2); ctx.arc(x1, y1, r, a + PI / 2, a + PI * 1.5); ctx.closePath(); }
function arrow(ctx, x1, y1, x2, y2, w, col, head = 16) { line(ctx, x1, y1, x2, y2, w, col); const a = Math.atan2(y2 - y1, x2 - x1); poly(ctx, [[x2 + Math.cos(a) * head * 0.4, y2 + Math.sin(a) * head * 0.4], [x2 + Math.cos(a + 2.5) * head, y2 + Math.sin(a + 2.5) * head], [x2 + Math.cos(a - 2.5) * head, y2 + Math.sin(a - 2.5) * head]], col); }
function popIn(ctx, k, cx, cy, fn) { if (k <= 0) return; const s = 0.7 + 0.3 * E.back(k); ctx.save(); ctx.globalAlpha *= clamp(k * 1.6, 0, 1); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore(); }

// ---------------------------------------------------------------- silhouette humaine (1 = hauteur du corps, origine au centre)
const BODY = {
  head: [0, -0.415, 0.072],
  arms: s => [[s * 0.165, -0.29, s * 0.2, -0.06, 0.038], [s * 0.2, -0.06, s * 0.215, 0.12, 0.032]],
  legs: s => [[s * 0.065, 0.04, s * 0.075, 0.25, 0.058], [s * 0.075, 0.25, s * 0.08, 0.46, 0.045]]
};
function bodyPath(ctx, cx, cy, h) {
  const P = (x, y) => [cx + x * h, cy + y * h];
  ctx.beginPath();
  const [hx, hy, hr] = BODY.head; const c = P(hx, hy); ctx.moveTo(c[0] + hr * h, c[1]); ctx.arc(c[0], c[1], hr * h, 0, TAU);
  let q = P(0, -0.37); const q2 = P(0, -0.3); capsule(ctx, q[0], q[1], q2[0], q2[1], 0.032 * h);
  const tp = [[-0.15, -0.31], [0.15, -0.31], [0.12, -0.12], [0.115, -0.04], [0.13, 0.05], [0, 0.08], [-0.13, 0.05], [-0.115, -0.04], [-0.12, -0.12]].map(p => P(...p));
  ctx.moveTo(tp[0][0], tp[0][1]); ctx.quadraticCurveTo(cx, cy - 0.335 * h, tp[1][0], tp[1][1]); for (let i = 2; i < tp.length; i++) ctx.lineTo(tp[i][0], tp[i][1]); ctx.closePath();
  for (const s of [-1, 1]) {
    for (const [x1, y1, x2, y2, r] of [...BODY.arms(s), ...BODY.legs(s)]) { const a = P(x1, y1), b = P(x2, y2); capsule(ctx, a[0], a[1], b[0], b[1], r * h); }
    const hd = P(s * 0.218, 0.155); ctx.moveTo(hd[0] + 0.03 * h, hd[1]); ctx.arc(hd[0], hd[1], 0.03 * h, 0, TAU);
    const ft = P(s * 0.09, 0.485); ctx.moveTo(ft[0] + 0.05 * h, ft[1]); ctx.ellipse(ft[0], ft[1], 0.05 * h, 0.022 * h, 0, 0, TAU);
  }
}
// zones musculaires (vue de face ou de dos)
const ZONES = {
  chest: [['e', -0.06, -0.24, 0.055, 0.042], ['e', 0.06, -0.24, 0.055, 0.042]],
  abs: [['r', -0.05, -0.18, 0.1, 0.15]],
  shoulders: [['e', -0.16, -0.285, 0.042, 0.04], ['e', 0.16, -0.285, 0.042, 0.04]],
  biceps: [['c', -0.17, -0.25, -0.195, -0.09, 0.03], ['c', 0.17, -0.25, 0.195, -0.09, 0.03]],
  triceps: [['c', -0.17, -0.25, -0.195, -0.09, 0.03], ['c', 0.17, -0.25, 0.195, -0.09, 0.03]],
  back: [['r', -0.11, -0.29, 0.22, 0.14]],
  lowback: [['r', -0.07, -0.14, 0.14, 0.12]],
  glutes: [['e', -0.06, 0.035, 0.055, 0.04], ['e', 0.06, 0.035, 0.055, 0.04]],
  quads: [['c', -0.068, 0.07, -0.075, 0.22, 0.042], ['c', 0.068, 0.07, 0.075, 0.22, 0.042]],
  hams: [['c', -0.068, 0.08, -0.075, 0.22, 0.042], ['c', 0.068, 0.08, 0.075, 0.22, 0.042]],
  calves: [['c', -0.076, 0.29, -0.079, 0.4, 0.036], ['c', 0.076, 0.29, 0.079, 0.4, 0.036]]
};
function zone(ctx, cx, cy, h, name, a) {
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.coral; ctx.shadowColor = hexA(C.coral, 0.8); ctx.shadowBlur = 18;
  for (const z of ZONES[name] || []) {
    ctx.beginPath();
    if (z[0] === 'e') ctx.ellipse(cx + z[1] * h, cy + z[2] * h, z[3] * h, z[4] * h, 0, 0, TAU);
    else if (z[0] === 'r') rr(ctx, cx + z[1] * h, cy + z[2] * h, z[3] * h, z[4] * h, 0.03 * h);
    else capsule(ctx, cx + z[1] * h, cy + z[2] * h, cx + z[3] * h, cy + z[4] * h, z[5] * h);
    ctx.fill();
  }
  ctx.restore();
}

export const D = {};

// ---------------------------------------------------------------- arrivée : oreille interne et yeux en désaccord
D.senses = (ctx, L, tm, k, u) => {
  const cx = W * 0.36, cy = H * 0.52, R0 = 250;
  popIn(ctx, E.out(pr(u, 0, 0.6)), cx, cy, () => {
    circle(ctx, cx, cy, R0 + 14, 'rgba(255,255,255,0.08)'); circle(ctx, cx, cy, R0, '#DDE6F7');
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.clip();
    const pose = R.P.look(tm.t, { face: { mouth: tm.n > at(tm, 's1') ? 'wavy' : 'neutral', eye: 'open', brow: tm.n > at(tm, 's1') ? 1 : 0, blink: false } });
    const j = R.solve(pose), s = 2000;
    R.draw(ctx, pose, { who: L.who || 'lucas', s, x: cx - j.H[0] * s - 60, y: cy - j.H[1] * s + 40, t: tm.t });
    ctx.restore();
  });
  // oreille interne : petite spirale dorée, et l'œil
  const hr = R.L.head * 2000, hd = -0.05 + 0.04 * Math.sin(tm.t * 0.5) + 0.1, hc = [cx - 60, cy + 40];
  const fp = (x, y) => [hc[0] + (x * Math.cos(hd) - y * Math.sin(hd)) * hr, hc[1] + (x * Math.sin(hd) + y * Math.cos(hd)) * hr];
  const ear = fp(-0.1, 0.08), eye = fp(0.48, -0.08), brain = [W * 0.74, H * 0.3];
  const kE = E.out(pr(u, 0.4, 0.6));
  if (kE > 0) {
    ctx.save(); ctx.globalAlpha = kE; ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU * 1.6 + tm.t * 2, r = 4 + i * 0.75; const x = ear[0] + Math.cos(a) * r, y = ear[1] + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    glowDot(ctx, eye[0], eye[1], 50, C.atmo, 0.55); ctx.restore();
  }
  // deux signaux vers le cerveau
  const sig = (from, col, txt, a0, ly) => {
    const kk = E.out(pr(tm.n, a0, 0.8)); if (kk <= 0) return;
    ctx.save(); ctx.globalAlpha = kk; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.setLineDash([3, 14]); ctx.lineDashOffset = -tm.t * 40; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.quadraticCurveTo((from[0] + brain[0]) / 2, from[1] - 120, brain[0] - 60, brain[1] + ly * 0.2); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha = kk; card(ctx, W * 0.6, H * 0.52 + ly, 450, 92, 22);
    badge(ctx, col === C.gold ? 'ear' : 'eye', W * 0.6 + 52, H * 0.52 + ly + 46, 30, col, '#10163A');
    text(ctx, txt, W * 0.6 + 98, H * 0.52 + ly + 56, { font: font(700, 27), color: C.ink, maxW: 330 });
    ctx.restore();
  };
  sig(ear, C.gold, 'Oreille : ni haut ni bas', at(tm, 's0@0.1'), 0);
  sig(eye, C.atmo, 'Yeux : un sol, un plafond', at(tm, 's0@0.55'), 112);
  // le cerveau s'embrouille
  const kb = E.back(pr(tm.n, at(tm, 's0@0.1'), 0.6));
  if (kb > 0) {
    popIn(ctx, kb, brain[0], brain[1], () => {
      const conf = pr(tm.n, at(tm, 's1'), 0.4);
      circle(ctx, brain[0], brain[1], 66, conf > 0 ? mixC('#F3A7B8', '#FF6F6F', 0.5 + 0.5 * Math.sin(tm.t * 9) * conf) : '#F3A7B8');
      ctx.strokeStyle = 'rgba(120,40,70,0.45)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(brain[0] - 30 + i * 20, brain[1] - 8 + (i % 2) * 14, 16, PI * 0.1, PI * 1.1); ctx.stroke(); }
      if (conf > 0) for (let i = 0; i < 3; i++) { const a = tm.t * 2 + i * TAU / 3; text(ctx, '?', brain[0] + Math.cos(a) * 92, brain[1] + Math.sin(a) * 40 - 60, { font: font(800, 46), color: C.gold, align: 'center' }); }
    });
  }
};

// ---------------------------------------------------------------- jours qui passent (cartes cochées)
D.days = (ctx, L, tm, k, u) => {
  const n = L.n || 3, w = 128, h = 150, gap = 22, cx = L.x * W, cy = L.y * H, x0 = cx - (n * w + (n - 1) * gap) / 2;
  const span = Math.max(1.5, tm.dur - at(tm, L.at) - 0.4);
  for (let i = 0; i < n; i++) {
    const ki = pr(u, i * 0.18, 0.5), x = x0 + i * (w + gap);
    popIn(ctx, ki, x + w / 2, cy, () => {
      card(ctx, x, cy - h / 2, w, h, 22);
      ctx.fillStyle = C.atmo2; rr(ctx, x, cy - h / 2, w, 38, 22); ctx.fill(); ctx.fillRect(x, cy - h / 2 + 20, w, 18);
      label(ctx, 'Jour ' + (i + 1), x + w / 2, cy - h / 2 + 28, { px: 22, color: '#FFFFFF' });
      const done = pr(u, 0.6 + (i + 1) * span / (n + 1), 0.4);
      if (done > 0) { circle(ctx, x + w / 2, cy + 22, 30 * E.back(done), i === n - 1 ? C.ok : 'rgba(123,227,198,0.35)'); icon(ctx, 'check', x + w / 2, cy + 22, 34 * E.back(done), i === n - 1 ? '#10163A' : C.ok, 3); }
    });
  }
  const kl = pr(u, 0.5, 0.5);
  if (kl > 0) { ctx.save(); ctx.globalAlpha = kl; ctx.font = font(700, 28); const tw = ctx.measureText('En général, ça passe').width + 56; card(ctx, cx - tw / 2, cy + h / 2 + 22, tw, 60, 30); label(ctx, 'En général, ça passe', cx, cy + h / 2 + 62, { px: 28 }); ctx.restore(); }
};

// ---------------------------------------------------------------- déplacement des liquides (sur Terre / en orbite)
D.fluid = (ctx, L, tm, k, u) => {
  const cy = L.y * H + 10, h = 430;
  const shift = E.inOut(pr(tm.n, at(tm, 's0@0.25'), 2.2));
  const fig = (cx, lvl, title) => {
    // lvl : 0 = liquides en bas, 1 = remontés
    bodyPath(ctx, cx, cy, h); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    ctx.save(); bodyPath(ctx, cx, cy, h); ctx.clip();
    const g = ctx.createLinearGradient(0, cy - h * 0.5, 0, cy + h * 0.5);
    const earthA = [0.08, 0.1, 0.2, 0.6, 0.95, 1], orbitA = [0.95, 0.9, 0.75, 0.4, 0.22, 0.18];
    [0, 0.2, 0.42, 0.55, 0.75, 1].forEach((p, i) => g.addColorStop(p, hexA(C.water, lerp(earthA[i], orbitA[i], lvl))));
    ctx.fillStyle = g; ctx.fillRect(cx - h, cy - h, h * 2, h * 2);
    ctx.restore();
    label(ctx, title, cx, cy + h * 0.5 + 56, { px: 28, color: C.ink2 });
  };
  popIn(ctx, E.out(pr(u, 0, 0.5)), W * 0.3, cy, () => fig(W * 0.3, 0, 'Sur Terre'));
  popIn(ctx, E.out(pr(u, 0.25, 0.5)), W * 0.62, cy, () => fig(W * 0.62, shift, 'En orbite'));
  if (shift > 0.05) {
    ctx.save(); ctx.globalAlpha = Math.min(1, shift * 2);
    for (let i = 0; i < 3; i++) { const q = (tm.t * 0.6 + i / 3) % 1; ctx.globalAlpha = Math.min(1, shift * 2) * Math.sin(q * PI); arrow(ctx, W * 0.62 + 120, cy + 110 - q * 160, W * 0.62 + 120, cy + 70 - q * 160, 7, C.atmo, 22); }
    ctx.restore();
  }
  const kb = E.back(pr(tm.n, at(tm, 's0@0.55'), 0.5));
  popIn(ctx, kb, W * 0.84, cy - 60, () => { card(ctx, W * 0.84 - 100, cy - 125, 200, 130, 26); label(ctx, '≈ 2 L', W * 0.84, cy - 46, { px: 58, w: 800, color: C.atmo }); label(ctx, 'vers le haut', W * 0.84, cy - 10, { px: 22, color: C.ink2, w: 500 }); });
};

// ---------------------------------------------------------------- personnes (un sur deux, sept sur dix)
D.people = (ctx, L, tm, k, u) => {
  const n = L.n || 10, on = L.on || 5, cols = 5, sz = 92, gx = 120, gy = 150;
  const cx = L.x * W, cy = L.y * H;
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols, x = cx + (c - (cols - 1) / 2) * gx, y = cy + (r - 0.5) * gy;
    const ki = pr(u, i * 0.07, 0.4), lit = i < on ? pr(u, 0.9 + i * 0.12, 0.35) : 0;
    popIn(ctx, ki, x, y, () => {
      const col = lit > 0 ? mixC('#4A5385', C.coral, lit) : '#4A5385';
      circle(ctx, x, y - sz * 0.32, sz * 0.2, col);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - sz * 0.32, y + sz * 0.45); ctx.quadraticCurveTo(x - sz * 0.32, y - sz * 0.08, x, y - sz * 0.08); ctx.quadraticCurveTo(x + sz * 0.32, y - sz * 0.08, x + sz * 0.32, y + sz * 0.45); ctx.closePath(); ctx.fill();
    });
  }
};

// ---------------------------------------------------------------- colonne vertébrale : les disques gonflent
D.spine = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H;
  const sw = E.inOut(pr(tm.n, at(tm, 's0@0.4'), 2.2));
  const N = 5, vh = 58, dh0 = 14, dh = lerp(dh0, 30, sw), total = N * vh + (N - 1) * dh;
  const draw = (x, swell, title, show) => {
    const d = lerp(dh0, 30, swell), tot = N * vh + (N - 1) * d; let y = cy - tot / 2;
    for (let i = 0; i < N; i++) {
      ctx.fillStyle = C.bone; rr(ctx, x - 70, y, 140, vh, 16); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.08)'; rr(ctx, x - 70, y + vh * 0.6, 140, vh * 0.4, 14); ctx.fill();
      ctx.fillStyle = mixC('#E9DCC0', '#D8C7A2', 0.5); rr(ctx, x + 60, y + 14, 46, 26, 10); ctx.fill();
      y += vh;
      if (i < N - 1) { ctx.fillStyle = mixC('#7FB6E8', '#4FB3FF', swell); rr(ctx, x - 64 - swell * 6, y + 2, 128 + swell * 12, d - 4, (d - 4) / 2); ctx.fill(); y += d; }
    }
    label(ctx, title, x, cy + total / 2 + 66, { px: 28, color: C.ink2 });
    if (show && swell > 0.2) for (let i = 0; i < 6; i++) { const q = (tm.t * 0.7 + i / 6) % 1; ctx.globalAlpha = Math.sin(q * PI) * swell; circle(ctx, x - 150 + q * 60, cy - 120 + i * 48, 7, C.atmo); ctx.globalAlpha = 1; }
  };
  popIn(ctx, E.out(pr(u, 0, 0.5)), W * 0.3, cy, () => draw(W * 0.3, 0, 'Sur Terre'));
  popIn(ctx, E.out(pr(u, 0.3, 0.5)), W * 0.66, cy, () => draw(W * 0.66, sw, 'En orbite', true));
  const kt = pr(tm.n, at(tm, 's0@0.25'), 0.5);
  if (kt > 0) { ctx.save(); ctx.globalAlpha = kt; line(ctx, W * 0.66 + 90, cy - 6, W * 0.66 + 200, cy - 60, 3, '#FFFFFF'); circle(ctx, W * 0.66 + 90, cy - 6, 6, '#FFFFFF'); card(ctx, W * 0.66 + 180, cy - 104, 180, 52, 26, '#FFFFFF'); label(ctx, 'Le disque', W * 0.66 + 270, cy - 68, { px: 26, color: '#141A3C' }); ctx.restore(); }
};

// ---------------------------------------------------------------- toise : plus 5 cm
D.ruler = (ctx, L, tm, k, u) => {
  const x = L.x * W, y0 = H * 0.12, y1 = H * 0.86;
  ctx.save(); ctx.globalAlpha = E.out(pr(u, 0, 0.5));
  ctx.fillStyle = 'rgba(16,22,58,0.85)'; rr(ctx, x - 26, y0, 52, y1 - y0, 14); ctx.fill();
  for (let i = 0; i <= 30; i++) { const y = y1 - 14 - i * (y1 - y0 - 28) / 30; line(ctx, x - 26, y, x - 26 + (i % 5 ? 14 : 26), y, 3, 'rgba(255,255,255,0.6)'); }
  ctx.restore();
  const g = E.inOut(pr(u, 0.2, 1.4)), yTop = H * 0.2, yUp = yTop - 34 * g;
  if (u > 0.2) {
    line(ctx, x - 40, yTop, x + 40, yTop, 3, 'rgba(255,255,255,0.45)');
    line(ctx, x - 40, yUp, x + 40, yUp, 5, C.gold); arrow(ctx, x + 60, yTop, x + 60, yUp - 2, 4, C.gold, 14);
    const kb = E.back(pr(u, 1.2, 0.5)); popIn(ctx, kb, x + 150, yUp, () => { card(ctx, x + 84, yUp - 34, 160, 68, 34); label(ctx, '+ 5 cm', x + 164, yUp + 12, { px: 34, w: 800, color: C.gold }); });
  }
};

// ---------------------------------------------------------------- os spongieux qui s'éclaircit
const BONE = (() => { const r = rng(17); const p = Array.from({ length: 70 }, () => { const a = r() * TAU, d = Math.sqrt(r()) * 0.92; return [Math.cos(a) * d, Math.sin(a) * d]; }); const e = []; p.forEach((a, i) => p.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.3) e.push([i, j, r()]); })); return { p, e }; })();
D.bone = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, R0 = 190 * (L.s || 1);
  const loss = E.inOut(pr(u, 0.6, Math.max(2, tm.dur - at(tm, L.at) - 0.6)));
  popIn(ctx, E.out(pr(u, 0, 0.6)), cx, cy, () => {
    circle(ctx, cx, cy, R0 + 22, '#E9DFC6'); circle(ctx, cx, cy, R0, '#5A2E3A');
    ctx.strokeStyle = C.bone; ctx.lineCap = 'round';
    for (const [i, j, r] of BONE.e) { if (r < loss * 0.55) continue; const a = BONE.p[i], b = BONE.p[j]; ctx.lineWidth = lerp(14, 5, loss) * (0.7 + r * 0.6) * (R0 / 190); ctx.beginPath(); ctx.moveTo(cx + a[0] * R0, cy + a[1] * R0); ctx.lineTo(cx + b[0] * R0, cy + b[1] * R0); ctx.stroke(); }
    ctx.strokeStyle = '#F6EEDA'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(cx, cy, R0 + 8, 0, TAU); ctx.stroke();
  });
};

// ---------------------------------------------------------------- squelette : hanches et colonne
D.skeleton = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H + 10, h = 520;
  const P = (x, y) => [cx + x * h, cy + y * h];
  ctx.save(); ctx.globalAlpha = E.out(pr(u, 0, 0.5));
  bodyPath(ctx, cx, cy, h); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  const bone = '#F3E9D2', bw = 10;
  const ln = (a, b, w = bw) => { const p = P(...a), q = P(...b); line(ctx, p[0], p[1], q[0], q[1], w, bone); circle(ctx, p[0], p[1], w * 0.75, bone); circle(ctx, q[0], q[1], w * 0.75, bone); };
  // crâne
  const sk = P(0, -0.415); circle(ctx, sk[0], sk[1], 0.062 * h, bone); circle(ctx, sk[0] - 12, sk[1], 8, '#1E2650'); circle(ctx, sk[0] + 12, sk[1], 8, '#1E2650');
  // côtes
  ctx.strokeStyle = bone; ctx.lineWidth = 6; for (let i = 0; i < 4; i++) { const y = -0.28 + i * 0.045; const a = P(0, y); ctx.beginPath(); ctx.ellipse(a[0], a[1] + 0.02 * h, (0.1 - i * 0.004) * h, 0.03 * h, 0, PI * 0.05, PI * 0.95); ctx.stroke(); }
  for (const s of [-1, 1]) { ln([s * 0.15, -0.3], [s * 0.2, -0.07]); ln([s * 0.2, -0.07], [s * 0.215, 0.12], 8); ln([s * 0.07, 0.07], [s * 0.075, 0.25], 12); ln([s * 0.075, 0.27], [s * 0.08, 0.46], 10); ln([s * 0.03, -0.31], [s * 0.15, -0.3], 7); }
  ctx.restore();
  // colonne et bassin, mis en avant
  const lit = (0.55 + 0.45 * Math.sin(tm.t * 4)) * E.out(pr(u, 0.5, 0.6));
  const spineCol = mixC(bone, C.coral, lit);
  for (let i = 0; i < 9; i++) { const p = P(0, -0.34 + i * 0.038); ctx.fillStyle = spineCol; rr(ctx, p[0] - 11, p[1], 22, 14, 5); ctx.fill(); }
  const pv = P(0, 0.04);
  ctx.fillStyle = spineCol; ctx.beginPath(); ctx.moveTo(pv[0] - 0.13 * h, pv[1] - 0.04 * h); ctx.quadraticCurveTo(pv[0], pv[1] - 0.015 * h, pv[0] + 0.13 * h, pv[1] - 0.04 * h); ctx.quadraticCurveTo(pv[0] + 0.12 * h, pv[1] + 0.05 * h, pv[0] + 0.04 * h, pv[1] + 0.05 * h); ctx.lineTo(pv[0], pv[1] + 0.02 * h); ctx.lineTo(pv[0] - 0.04 * h, pv[1] + 0.05 * h); ctx.quadraticCurveTo(pv[0] - 0.12 * h, pv[1] + 0.05 * h, pv[0] - 0.13 * h, pv[1] - 0.04 * h); ctx.fill();
  if (lit > 0.05) { glowDot(ctx, pv[0], pv[1], 110, C.coral, 0.35 * lit); const sp = P(0, -0.17); glowDot(ctx, sp[0], sp[1], 90, C.coral, 0.25 * lit); }
};

// ---------------------------------------------------------------- mois de mission et densité qui baisse
D.months = (ctx, L, tm, k, u) => {
  const n = L.n || 6, cx = L.x * W, cy = L.y * H, w = 360, h = 300;
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    card(ctx, cx - w / 2, cy - h / 2, w, h, 28);
    const span = Math.max(1.5, tm.dur - at(tm, L.at) - 0.3), m = Math.min(n, Math.floor(pr(u, 0.2, span) * n) + 1);
    label(ctx, m + (m > 1 ? ' mois' : ' mois'), cx, cy - h / 2 + 64, { px: 44, w: 800 });
    for (let i = 0; i < n; i++) { const x = cx - 135 + i * 54, on = i < m; ctx.fillStyle = on ? C.atmo2 : 'rgba(255,255,255,0.12)'; rr(ctx, x, cy - 40, 42, 42, 10); ctx.fill(); }
    label(ctx, 'Densité osseuse', cx, cy + 50, { px: 22, color: C.ink2, w: 500 });
    const d = 1 - 0.55 * (m - 1) / (n - 1) * pr(u, 0.2, span);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, cx - 140, cy + 70, 280, 28, 14); ctx.fill();
    ctx.fillStyle = mixC(C.ok, C.coral, 1 - d); rr(ctx, cx - 140, cy + 70, 280 * d, 28, 14); ctx.fill();
  });
};

// ---------------------------------------------------------------- calcium : de l'os vers les reins
function kidneyShape(ctx, x, y, s, col) {
  // uretère, puis le haricot (creusé à gauche, au niveau du hile)
  ctx.strokeStyle = R.shade(col, 0.8); ctx.lineWidth = 12 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 30 * s, y + 6 * s); ctx.quadraticCurveTo(x - 60 * s, y + 60 * s, x - 48 * s, y + 120 * s); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x - 10 * s, y - 78 * s);
  ctx.bezierCurveTo(x + 60 * s, y - 92 * s, x + 88 * s, y - 20 * s, x + 76 * s, y + 20 * s);
  ctx.bezierCurveTo(x + 64 * s, y + 70 * s, x + 20 * s, y + 92 * s, x - 20 * s, y + 78 * s);
  ctx.bezierCurveTo(x - 58 * s, y + 66 * s, x - 66 * s, y + 30 * s, x - 38 * s, y + 10 * s);
  ctx.bezierCurveTo(x - 24 * s, y + 2 * s, x - 24 * s, y - 14 * s, x - 38 * s, y - 24 * s);
  ctx.bezierCurveTo(x - 66 * s, y - 44 * s, x - 52 * s, y - 72 * s, x - 10 * s, y - 78 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(x + 30 * s, y - 40 * s, 22 * s, 12 * s, -0.5, 0, TAU); ctx.fill();
}
function boneIcon(ctx, x, y, s, col) { ctx.fillStyle = col; rr(ctx, x - 90 * s, y - 18 * s, 180 * s, 36 * s, 16 * s); ctx.fill(); for (const sx of [-1, 1]) for (const sy of [-1, 1]) circle(ctx, x + sx * 92 * s, y + sy * 20 * s, 26 * s, col); }
D.calcium = (ctx, L, tm, k, u) => {
  const cy = Math.max(L.y, 0.52) * H, bx = W * 0.26, kx = W * 0.72;
  popIn(ctx, E.out(pr(u, 0, 0.5)), bx, cy, () => { boneIcon(ctx, bx, cy, 1.1, C.bone); label(ctx, 'Os', bx, cy + 110, { px: 28, color: C.ink2 }); });
  popIn(ctx, E.out(pr(u, 0.2, 0.5)), kx, cy, () => { kidneyShape(ctx, kx, cy, 1.4, '#E07A8B'); label(ctx, 'Reins', kx, cy + 205, { px: 28, color: C.ink2 }); });
  const flow = pr(u, 0.6, 0.6);
  if (flow > 0) {
    for (let i = 0; i < 18; i++) {
      const q = (tm.t * 0.35 + i / 18) % 1; const x = lerp(bx + 110, kx - 80, q), y = cy - Math.sin(q * PI) * 140;
      ctx.globalAlpha = flow * Math.sin(q * PI); circle(ctx, x, y, 11, '#FFFFFF'); ctx.globalAlpha = 1;
    }
    const kc = E.back(pr(u, 1.2, 0.5));
    popIn(ctx, kc, W * 0.49, cy - 190, () => { card(ctx, W * 0.49 - 105, cy - 230, 210, 74, 37); circle(ctx, W * 0.49 - 62, cy - 193, 13, '#FFFFFF'); label(ctx, 'Calcium', W * 0.49 + 18, cy - 183, { px: 28 }); });
  }
};

// ---------------------------------------------------------------- rein : cristaux puis calcul
D.kidney = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H;
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => kidneyShape(ctx, cx, cy, 2.6, '#E07A8B'));
  const r0 = rng(4), c0 = at(tm, 's0@0.4'), stone = E.out(pr(tm.n, at(tm, 's0@0.85'), 1.0));
  for (let i = 0; i < 16; i++) {
    const a = r0() * TAU, d = 30 + r0() * 90, ki = E.back(pr(tm.n, c0 + i * 0.08, 0.4));
    if (ki <= 0) continue;
    const x = lerp(cx + 40 + Math.cos(a) * d, cx + 20, stone), y = lerp(cy + Math.sin(a) * d * 1.3, cy + 40, stone);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(ki, ki); poly(ctx, [[0, -12], [10, 0], [0, 12], [-10, 0]], '#FFFFFF'); ctx.restore();
  }
  if (stone > 0) { ctx.save(); ctx.globalAlpha = stone; ctx.translate(cx + 30, cy + 40); poly(ctx, [[-30, -10], [-8, -32], [26, -24], [36, 6], [12, 30], [-24, 24]], '#C9B79A'); poly(ctx, [[-14, -12], [6, -22], [18, -4], [-2, 8]], '#DCCDB2'); ctx.restore(); }
  const kw = E.back(pr(tm.n, at(tm, 's1'), 0.5));
  popIn(ctx, kw, cx + 300, cy - 140, () => { card(ctx, cx + 190, cy - 180, 230, 80, 40, C.signal); icon(ctx, 'warn', cx + 232, cy - 140, 34, '#FFFFFF', 2.5); label(ctx, 'Calcul', cx + 320, cy - 129, { px: 30, w: 800, color: '#FFFFFF' }); });
};

// ---------------------------------------------------------------- poches d'eau sur la journée
D.pouches = (ctx, L, tm, k, u) => {
  const cy = L.y * H, x0 = W * 0.18, x1 = W * 0.82, n = 5;
  ctx.save(); ctx.globalAlpha = E.out(pr(u, 0, 0.5));
  line(ctx, x0, cy + 120, x1, cy + 120, 6, 'rgba(255,255,255,0.25)');
  label(ctx, 'Matin', x0, cy + 170, { px: 24, color: C.ink2 }); label(ctx, 'Soir', x1, cy + 170, { px: 24, color: C.ink2 });
  icon(ctx, 'sun', x0, cy + 120, 30, C.gold); icon(ctx, 'moon', x1, cy + 120, 30, C.sophie);
  ctx.restore();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0 + 120, x1 - 120, i / (n - 1)), ki = E.back(pr(u, 0.3 + i * 0.45, 0.45)), fill = E.inOut(pr(u, 0.5 + i * 0.45, 0.6));
    popIn(ctx, ki, x, cy, () => {
      ctx.fillStyle = 'rgba(143,211,255,0.25)'; rr(ctx, x - 42, cy - 70, 84, 140, 22); ctx.fill();
      ctx.save(); rr(ctx, x - 42, cy - 70, 84, 140, 22); ctx.clip(); ctx.fillStyle = C.water; ctx.fillRect(x - 42, cy + 70 - 140 * fill * 0.85, 84, 140); ctx.restore();
      line(ctx, x + 18, cy - 70, x + 26, cy - 100, 6, '#F2F4FF');
      label(ctx, '0,5 L', x, cy + 102, { px: 20, color: C.ink2, w: 500 });
    });
  }
};

// ---------------------------------------------------------------- anneau de pourcentage (eau recyclée)
D.ring = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, r = 170, pct = L.pct || 98;
  const f = E.inOut(pr(u, 0.1, 2.0)) * pct / 100;
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 34; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.water; ctx.beginPath(); ctx.arc(cx, cy, r, -PI / 2, -PI / 2 + TAU * f); ctx.stroke();
    label(ctx, Math.round(f * 100) + ' %', cx, cy + 22, { px: 78, w: 800 });
    label(ctx, L.label || '', cx, cy + r + 76, { px: 28, color: C.ink2 });
    for (let i = 0; i < 5; i++) { const a = -PI / 2 + tm.t * 0.8 + i * TAU / 5; ctx.save(); ctx.translate(cx + Math.cos(a) * (r + 46), cy + Math.sin(a) * (r + 46)); icon(ctx, 'drop', 0, 0, 22, C.atmo, 2.4); ctx.restore(); }
  });
};

// ---------------------------------------------------------------- nuancier des urines
D.urine = (ctx, L, tm, k, u) => {
  const cols = ['#FBF6D9', '#F8EDB0', '#F4E07F', '#EFCF55', '#E5B83A', '#D79A29', '#B87A1D', '#93591A'];
  const cx = L.x * W, cy = L.y * H, w = 104, gap = 10, x0 = cx - (cols.length * (w + gap) - gap) / 2;
  cols.forEach((c, i) => { const ki = E.back(pr(u, i * 0.06, 0.4)); popIn(ctx, ki, x0 + i * (w + gap) + w / 2, cy, () => { ctx.fillStyle = c; rr(ctx, x0 + i * (w + gap), cy - 70, w, 140, 18); ctx.fill(); }); });
  const s1 = at(tm, 's1'), good = pr(tm.n, at(tm, 's0@0.4'), 0.6), bad = pr(tm.n, s1, 0.6);
  if (good > 0) { ctx.save(); ctx.globalAlpha = good; ctx.strokeStyle = C.ok; ctx.lineWidth = 6; rr(ctx, x0 - 10, cy - 82, 3 * (w + gap) + 10, 164, 24); ctx.stroke(); label(ctx, 'Tu bois assez', x0 + 1.5 * (w + gap) - 5, cy + 130, { px: 28, color: C.ok }); ctx.restore(); }
  if (bad > 0) { ctx.save(); ctx.globalAlpha = bad; ctx.strokeStyle = C.warn; ctx.lineWidth = 6; const xb = x0 + 5 * (w + gap) - 10; rr(ctx, xb, cy - 82, 3 * (w + gap) + 10, 164, 24); ctx.stroke(); label(ctx, 'Bois davantage', xb + 1.5 * (w + gap) + 5, cy + 130, { px: 28, color: C.warn }); ctx.restore(); }
};

// ---------------------------------------------------------------- corps entier : zones musculaires, nerf, signes
D.body = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H + 6, h = 540;
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    bodyPath(ctx, cx, cy, h); ctx.fillStyle = L.view === 'back' ? '#4A5486' : '#5160A0'; ctx.fill();
    if (L.view === 'back') { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3; line(ctx, cx, cy - 0.3 * h, cx, cy + 0.03 * h, 3, 'rgba(255,255,255,0.15)'); }
  });
  for (const [name, a] of L.seq || []) { const kz = pr(tm.n, tm.at(a), 0.5); if (kz > 0) zone(ctx, cx, cy, h, name, kz * (0.65 + 0.35 * Math.sin(tm.t * 4))); }
  if (L.zap) {
    const kz = pr(tm.n, at(tm, L.at) + 0.4, 1.0);
    if (kz > 0) {
      zone(ctx, cx, cy, h, 'lowback', 0.8);
      const pts = []; for (let i = 0; i <= 12; i++) { const q = i / 12; pts.push([cx + (0.04 + q * 0.04) * h + (i % 2 ? 10 : -10), cy + (-0.06 + q * 0.5) * h]); }
      const m = Math.max(2, Math.floor(pts.length * kz));
      ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.shadowColor = C.gold; ctx.shadowBlur = 16; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(tm.t * 14);
      ctx.beginPath(); pts.slice(0, m).forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore();
    }
  }
  const SPOTS = { knee: [0.075, 0.25], arm: [-0.2, -0.06], hand: [0.218, 0.155], head: [0, -0.43], leg: [0.08, 0.3] };
  for (const [name, a] of L.marks || []) {
    const km = E.back(pr(tm.n, tm.at(a), 0.45)); if (km <= 0) continue;
    const [sx, sy] = SPOTS[name]; const x = cx + sx * h, y = cy + sy * h;
    const ring = (tm.t * 1.2) % 1;
    ctx.save(); ctx.globalAlpha = 1 - ring; ctx.strokeStyle = C.signal; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 18 + ring * 30, 0, TAU); ctx.stroke(); ctx.restore();
    circle(ctx, x, y, 16 * km, C.signal); circle(ctx, x, y, 6 * km, '#FFFFFF');
  }
};

// ---------------------------------------------------------------- muscle qui fond
D.muscle = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, f = 1 - 0.2 * E.inOut(pr(tm.n, at(tm, 's0@0.3'), 2.4));
  const shape = (s, fill, stroke) => { ctx.beginPath(); ctx.moveTo(cx, cy - 210); ctx.bezierCurveTo(cx + 150 * s, cy - 120, cx + 150 * s, cy + 120, cx, cy + 210); ctx.bezierCurveTo(cx - 150 * s, cy + 120, cx - 150 * s, cy - 120, cx, cy - 210); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.setLineDash([10, 10]); ctx.strokeStyle = stroke; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]); } };
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    shape(1, null, 'rgba(255,255,255,0.45)');
    shape(f, C.coral);
    ctx.strokeStyle = 'rgba(120,30,30,0.3)'; ctx.lineWidth = 4; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 22 * f, cy - 150); ctx.quadraticCurveTo(cx + i * 40 * f, cy, cx + i * 22 * f, cy + 150); ctx.stroke(); }
    line(ctx, cx, cy - 210, cx, cy - 250, 14, C.bone); line(ctx, cx, cy + 210, cx, cy + 250, 14, C.bone);
  });
};

// ---------------------------------------------------------------- horloge : deux heures
D.clock = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, r = 170, f = E.inOut(pr(u, 0.2, 1.6)) * (L.hours || 2) / 12;
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    circle(ctx, cx, cy, r + 16, 'rgba(16,22,58,0.9)'); circle(ctx, cx, cy, r, '#1E2A66');
    ctx.fillStyle = hexA(C.ok, 0.85); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 12, -PI / 2, -PI / 2 + TAU * f); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; line(ctx, cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14), cx + Math.cos(a) * (r - 30), cy + Math.sin(a) * (r - 30), i % 3 ? 3 : 6, 'rgba(255,255,255,0.7)'); }
    const a = -PI / 2 + TAU * f; line(ctx, cx, cy, cx + Math.cos(a) * (r - 40), cy + Math.sin(a) * (r - 40), 8, '#FFFFFF'); line(ctx, cx, cy, cx, cy - r * 0.45, 10, '#FFFFFF'); circle(ctx, cx, cy, 12, '#FFFFFF');
  });
};
D.dayclock = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, r = 74;
  popIn(ctx, E.back(pr(u, 0, 0.5)), cx, cy, () => {
    circle(ctx, cx, cy, r + 8, 'rgba(16,22,58,0.92)'); circle(ctx, cx, cy, r, '#F5F7FC');
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; line(ctx, cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8), cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16), 3, '#5A6273'); }
    const sp = L.fast ? 2.2 : 1.2, a = -PI / 2 + u * sp * TAU, b = -PI / 2 + u * sp * TAU / 12;
    line(ctx, cx, cy, cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18), 5, '#141A3C'); line(ctx, cx, cy, cx + Math.cos(b) * (r - 34), cy + Math.sin(b) * (r - 34), 7, C.coral); circle(ctx, cx, cy, 6, '#141A3C');
  });
};

// ---------------------------------------------------------------- minuteur (anneau qui se vide)
D.timer = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, r = 84, total = L.secs || 30;
  const span = Math.max(1, tm.dur - at(tm, L.at) + 0.4), f = clamp(u / span, 0, 1), left = Math.ceil(total * (1 - f));
  popIn(ctx, E.back(pr(u, 0, 0.5)), cx, cy, () => {
    circle(ctx, cx, cy, r + 20, 'rgba(16,22,58,0.92)');
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.ok; ctx.beginPath(); ctx.arc(cx, cy, r, -PI / 2, -PI / 2 + TAU * (1 - f)); ctx.stroke();
    const s = total >= 60 ? Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : String(left);
    label(ctx, s, cx, cy + (total >= 60 ? 16 : 10), { px: total >= 60 ? 46 : 56, w: 800 });
    if (total < 60) label(ctx, 'secondes', cx, cy + 40, { px: 18, color: C.ink2, w: 500 });
  });
};

// ---------------------------------------------------------------- l'œil : icône, schéma en coupe, carte floue
D.eyeIcon = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, blink = ((tm.t * 0.35) % 1) > 0.94 ? 0.12 : 1;
  popIn(ctx, E.out(pr(u, 0, 0.6)), cx, cy, () => {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, blink);
    ctx.fillStyle = '#F5F7FC'; ctx.beginPath(); ctx.moveTo(-230, 0); ctx.quadraticCurveTo(0, -200, 230, 0); ctx.quadraticCurveTo(0, 200, -230, 0); ctx.fill();
    circle(ctx, Math.sin(tm.t * 0.7) * 30, 0, 96, '#7A66F0'); circle(ctx, Math.sin(tm.t * 0.7) * 30, 0, 48, '#141A3C'); circle(ctx, Math.sin(tm.t * 0.7) * 30 - 26, -30, 18, 'rgba(255,255,255,0.9)');
    ctx.restore();
  });
};
D.blurCard = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, w = 360, h = 250;
  popIn(ctx, E.back(pr(u, 0, 0.5)), cx, cy, () => {
    card(ctx, cx - w / 2, cy - h / 2, w, h, 26, '#F5F7FC');
    label(ctx, 'Liste de contrôle', cx - w / 2 + 30, cy - h / 2 + 50, { px: 26, color: '#141A3C', align: 'left' });
    const blur = 0.5 + 0.5 * Math.sin(tm.t * 1.4);
    for (let i = 0; i < 4; i++) { const y = cy - h / 2 + 96 + i * 36; for (let d = -2; d <= 2; d++) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#5A6273'; rr(ctx, cx - w / 2 + 30 + d * 3 * blur, y + d * 1.5 * blur, 240 - i * 30, 14, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  });
};
D.headFluid = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, f = E.inOut(pr(u, 0.2, 2.0));
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    ctx.save(); ctx.beginPath();
    ctx.moveTo(cx - 70, cy + 260); ctx.lineTo(cx - 62, cy + 90); ctx.bezierCurveTo(cx - 170, cy + 40, cx - 175, cy - 190, cx - 10, cy - 200);
    ctx.bezierCurveTo(cx + 110, cy - 205, cx + 150, cy - 120, cx + 140, cy - 60); ctx.lineTo(cx + 176, cy - 10); ctx.lineTo(cx + 142, cy + 2);
    ctx.bezierCurveTo(cx + 150, cy + 40, cx + 130, cy + 70, cx + 96, cy + 80); ctx.lineTo(cx + 70, cy + 96); ctx.lineTo(cx + 74, cy + 260); ctx.closePath();
    ctx.fillStyle = '#5160A0'; ctx.fill(); ctx.clip();
    const g = ctx.createLinearGradient(0, cy + 260, 0, cy - 190); g.addColorStop(0, hexA(C.water, 0.9)); g.addColorStop(clamp(f, 0.01, 0.99), hexA(C.water, 0.6)); g.addColorStop(Math.min(1, f + 0.01), hexA(C.water, 0)); ctx.fillStyle = g; ctx.fillRect(cx - 200, cy - 200, 400, 480); ctx.restore();
    circle(ctx, cx + 70, cy - 60, 30, '#F5F7FC'); circle(ctx, cx + 80, cy - 60, 13, '#141A3C');
    for (let i = 0; i < 3; i++) { const q = (tm.t * 0.6 + i / 3) % 1; ctx.globalAlpha = Math.sin(q * PI) * f; arrow(ctx, cx - 10, cy + 160 - q * 200, cx - 10, cy + 120 - q * 200, 7, C.atmo, 20); ctx.globalAlpha = 1; }
  });
};
D.eye = (ctx, L, tm, k, u) => {
  const s = L.s || 1, cx = L.x * W, cy = L.y * H, R0 = 150 * s;
  const flat = L.stage === 2 ? E.inOut(pr(u, 0.4, 1.6)) : 0, push = L.stage >= 1 ? 1 : 0;
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    // nerf optique (à droite), qui gonfle
    const nw = lerp(46, 70, flat) * s;
    ctx.fillStyle = mixC('#F2C9A0', C.coral, flat); rr(ctx, cx + R0 * 0.8, cy - nw / 2, 200 * s, nw, nw / 2); ctx.fill();
    // globe : l'arrière s'aplatit
    ctx.fillStyle = '#F5F7FC'; ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; let x = Math.cos(a) * R0, y = Math.sin(a) * R0; if (x > R0 * (1 - 0.12 * flat)) x = R0 * (1 - 0.12 * flat); i ? ctx.lineTo(cx + x, cy + y) : ctx.moveTo(cx + x, cy + y); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#D85A6A'; ctx.lineWidth = 8 * s; ctx.beginPath(); for (let i = -20; i <= 20; i++) { const a = i / 20 * 1.2; let x = Math.cos(a) * (R0 - 8 * s); if (x > R0 * (1 - 0.12 * flat) - 8 * s) x = R0 * (1 - 0.12 * flat) - 8 * s; const y = Math.sin(a) * (R0 - 8 * s); i > -20 ? ctx.lineTo(cx + x, cy + y) : ctx.moveTo(cx + x, cy + y); } ctx.stroke();
    // cornée, iris, cristallin (à gauche)
    ctx.fillStyle = 'rgba(160,210,255,0.5)'; ctx.beginPath(); ctx.ellipse(cx - R0 * 0.96, cy, 34 * s, 70 * s, 0, PI / 2, PI * 1.5); ctx.fill();
    ctx.fillStyle = '#7A66F0'; rr(ctx, cx - R0 * 0.9, cy - 60 * s, 16 * s, 120 * s, 8 * s); ctx.fill();
    ctx.fillStyle = 'rgba(200,220,255,0.9)'; ctx.beginPath(); ctx.ellipse(cx - R0 * 0.7, cy, 22 * s, 48 * s, 0, 0, TAU); ctx.fill();
  });
  if (push) {
    for (let i = 0; i < 3; i++) { const y = cy + (i - 1) * 70 * s, q = (tm.t * 1.2 + i * 0.3) % 1; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(q * PI); arrow(ctx, cx + R0 + 120 * s + 30 * (1 - q), y, cx + R0 + 30 * s, y, 7 * s, C.atmo, 22 * s); ctx.globalAlpha = 1; }
  }
};

// ---------------------------------------------------------------- barres comparées (heures de sommeil)
D.bars = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, w = 760, x0 = cx - w / 2 + 230, bw = w - 260;
  L.items.forEach(([name, v, col, val], i) => {
    const y = cy - 70 + i * 140, f = E.inOut(pr(u, 0.2 + i * 0.5, 1.2)) * v / L.max, c = col === 'ok' ? C.ok : col === 'coral' ? C.coral : C.atmo;
    popIn(ctx, E.out(pr(u, i * 0.3, 0.4)), cx, y, () => {
      text(ctx, name, x0 - 30, y + 12, { font: font(700, 28), color: C.ink, align: 'right', maxW: 260 });
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, x0, y - 34, bw, 68, 34); ctx.fill();
      ctx.fillStyle = c; rr(ctx, x0, y - 34, Math.max(68, bw * f), 68, 34); ctx.fill();
      text(ctx, val, x0 + Math.max(68, bw * f) - 22, y + 12, { font: font(800, 30), color: '#10163A', align: 'right' });
    });
  });
};

// ---------------------------------------------------------------- seize levers de soleil
D.orbit16 = (ctx, L, tm, k, u) => {
  const cx = W * 0.36, cy = H * 0.5, r = 150, ro = 230;
  popIn(ctx, E.out(pr(u, 0, 0.6)), cx, cy, () => {
    earth(ctx, cx, cy, r, tm.t, { spin: 0.05, night: true });
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; ctx.setLineDash([6, 10]); ctx.beginPath(); ctx.arc(cx, cy, ro, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  });
  glowDot(ctx, -60, cy, 260, '#FFE9A8', 0.55); circle(ctx, -20, cy, 70, '#FFE9A8');
  const span = Math.max(3, tm.dur - 0.5), laps = 16 * clamp((u - 0.4) / span, 0, 1);
  const a = PI + laps * TAU; const sx = cx + Math.cos(a) * ro, sy = cy + Math.sin(a) * ro;
  if (u > 0.3) { iss(ctx, sx, sy, 0.06, tm.t, { soyuz: false }); glowDot(ctx, sx, sy, 30, '#FFFFFF', 0.25); }
  const done = Math.floor(laps);
  const gx = W * 0.62, gy = H * 0.3;
  card(ctx, gx - 30, gy - 80, 470, 380, 28);
  label(ctx, done + ' / 16', gx + 205, gy - 10, { px: 54, w: 800, color: C.gold });
  label(ctx, 'levers de soleil par jour', gx + 205, gy + 28, { px: 22, color: C.ink2, w: 500 });
  for (let i = 0; i < 16; i++) { const x = gx + 30 + (i % 8) * 50, y = gy + 100 + Math.floor(i / 8) * 70; const on = i < done; circle(ctx, x + 10, y, 18, on ? C.gold : 'rgba(255,255,255,0.1)'); if (on) icon(ctx, 'sun', x + 10, y, 26, '#5A3A08', 2.2); }
};

// ---------------------------------------------------------------- petites illustrations
D.fan = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H;
  popIn(ctx, E.back(pr(u, 0, 0.5)), cx, cy, () => {
    circle(ctx, cx, cy, 82, 'rgba(16,22,58,0.9)'); circle(ctx, cx, cy, 70, '#9AA6BA');
    for (let i = 0; i < 4; i++) { const a = tm.t * 9 + i * PI / 2; ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.fillStyle = '#E9EDF3'; ctx.beginPath(); ctx.ellipse(32, 0, 34, 14, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    circle(ctx, cx, cy, 12, '#3A4256');
    for (let i = 0; i < 3; i++) { const q = (tm.t * 0.8 + i / 3) % 1; ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 100 + q * 70, -0.5, 0.5); ctx.stroke(); ctx.globalAlpha = 1; }
  });
};
D.bedclock = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H;
  popIn(ctx, E.back(pr(u, 0, 0.5)), cx, cy, () => {
    card(ctx, cx - 190, cy - 190, 380, 380, 40);
    circle(ctx, cx, cy - 20, 110, '#F5F7FC'); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; line(ctx, cx + Math.cos(a) * 92, cy - 20 + Math.sin(a) * 92, cx + Math.cos(a) * 102, cy - 20 + Math.sin(a) * 102, 4, '#5A6273'); }
    const hA = -PI / 2 + (10.5 / 12) * TAU, mA = -PI / 2 + 0.5 * TAU; line(ctx, cx, cy - 20, cx + Math.cos(hA) * 58, cy - 20 + Math.sin(hA) * 58, 9, '#141A3C'); line(ctx, cx, cy - 20, cx + Math.cos(mA) * 84, cy - 20 + Math.sin(mA) * 84, 6, '#141A3C');
    icon(ctx, 'moon', cx + 120, cy - 130, 52, C.sophie, 2.6);
    label(ctx, 'Même heure, chaque soir', cx, cy + 150, { px: 26 });
  });
};
D.nocoffee = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H;
  popIn(ctx, E.back(pr(u, 0, 0.5)), cx, cy, () => {
    card(ctx, cx - 190, cy - 190, 380, 380, 40);
    icon(ctx, 'coffee', cx, cy - 26, 190, C.gold, 2);
    const ks = E.out(pr(u, 0.4, 0.4)); line(ctx, cx - 110, cy - 130, cx - 110 + 220 * ks, cy - 130 + 210 * ks, 14, C.signal);
    label(ctx, "Pas de café l'après-midi", cx, cy + 150, { px: 26 });
  });
};
D.pill = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H;
  popIn(ctx, E.back(pr(u, 0, 0.5)), cx, cy, () => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.5 + 0.05 * Math.sin(tm.t * 2));
    ctx.fillStyle = '#F5F7FC'; rr(ctx, -120, -50, 240, 100, 50); ctx.fill(); ctx.fillStyle = C.sophie2; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(70, -50); ctx.arc(70, 0, 50, -PI / 2, PI / 2); ctx.lineTo(0, 50); ctx.closePath(); ctx.fill();
    ctx.restore();
    text(ctx, '?', cx + 140, cy - 80, { font: font(800, 96), color: C.gold, align: 'center' });
  });
};
D.pouchFloat = (ctx, L, tm, k, u) => {
  const cx = L.x * W + Math.sin(tm.t * 0.6) * 14, cy = L.y * H + Math.sin(tm.t * 0.9) * 10;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.3 * Math.sin(tm.t * 0.5));
  ctx.fillStyle = '#8FD3FF'; rr(ctx, -40, -60, 80, 120, 22); ctx.fill(); ctx.fillStyle = C.water; rr(ctx, -40, -20, 80, 80, 22); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; rr(ctx, -28, -48, 14, 70, 7); ctx.fill(); line(ctx, 14, -60, 22, -96, 7, '#F2F4FF');
  ctx.restore();
  const km = pr(tm.n, at(tm, 's2'), 0.4); if (km > 0) { ctx.save(); ctx.globalAlpha = km; text(ctx, 'plein', cx, cy + 100, { font: font(700, 24), color: '#141A3C', align: 'center' }); ctx.restore(); }
};
D.drops = (ctx, L, tm, k, u) => { for (let i = 0; i < 6; i++) { const q = (tm.t * 0.5 + i / 6) % 1; ctx.globalAlpha = Math.sin(q * PI) * 0.9; icon(ctx, 'drop', L.x * W + Math.cos(i * 2.1) * 120, L.y * H + Math.sin(i * 1.3) * 80 - q * 40, 30, C.atmo, 2.6); } ctx.globalAlpha = 1; };
D.hearts = (ctx, L, tm, k, u) => { for (let i = 0; i < 7; i++) { const q = (tm.t * 0.4 + i / 7) % 1; ctx.globalAlpha = Math.sin(q * PI) * k; ctx.save(); ctx.translate(L.x * W + Math.sin(i * 2.3 + tm.t) * 70, L.y * H - q * 150); ctx.fillStyle = C.coral; ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-22, -4, -12, -22, 0, -10); ctx.bezierCurveTo(12, -22, 22, -4, 0, 12); ctx.fill(); ctx.restore(); } ctx.globalAlpha = 1; };
D.camera = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H;
  popIn(ctx, E.back(pr(u, 0, 0.5)), cx, cy, () => {
    ctx.fillStyle = '#2A3150'; rr(ctx, cx - 130, cy - 90, 260, 180, 22); ctx.fill(); ctx.fillStyle = '#3D4A7A'; rr(ctx, cx - 116, cy - 76, 232, 152, 14); ctx.fill();
    circle(ctx, cx, cy - 6, 34, '#7E4E32'); ctx.fillStyle = '#15A58E'; ctx.beginPath(); ctx.ellipse(cx, cy + 66, 62, 40, 0, PI, 0); ctx.fill();
    circle(ctx, cx + 92, cy - 58, 9, (tm.t % 1) < 0.6 ? C.signal : 'rgba(255,111,111,0.25)');
    line(ctx, cx, cy + 90, cx, cy + 150, 10, '#5A6273'); line(ctx, cx - 50, cy + 150, cx + 50, cy + 150, 10, '#5A6273');
  });
};
D.nature = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, w = 620, h = 360;
  popIn(ctx, E.out(pr(u, 0, 0.6)), cx, cy, () => {
    ctx.save(); rr(ctx, cx - w / 2, cy - h / 2, w, h, 30); ctx.clip();
    const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, '#9FD8FF'); g.addColorStop(1, '#E6F6FF'); ctx.fillStyle = g; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.fillStyle = '#8FB7D9'; ctx.beginPath(); ctx.moveTo(cx - w / 2, cy + 40); ctx.lineTo(cx - 140, cy - 110); ctx.lineTo(cx - 20, cy + 10); ctx.lineTo(cx + 110, cy - 80); ctx.lineTo(cx + w / 2, cy + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4FA36A'; ctx.fillRect(cx - w / 2, cy + 40, w, h); ctx.fillStyle = '#5BB8E8'; ctx.beginPath(); ctx.ellipse(cx + 60, cy + 120, 170, 34, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 9; i++) { const x = cx - w / 2 + 40 + i * 70, y = cy + 60 + (i % 3) * 18; ctx.fillStyle = '#2E7A48'; ctx.beginPath(); ctx.moveTo(x, y - 70); ctx.lineTo(x + 26, y); ctx.lineTo(x - 26, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5A3E2A'; ctx.fillRect(x - 4, y, 8, 14); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 6; rr(ctx, cx - w / 2, cy - h / 2, w, h, 30); ctx.stroke();
    // casque de réalité virtuelle
    ctx.fillStyle = '#20264A'; rr(ctx, cx - 120, cy + h / 2 - 20, 240, 100, 40); ctx.fill(); circle(ctx, cx - 50, cy + h / 2 + 30, 26, '#4C5A9C'); circle(ctx, cx + 50, cy + h / 2 + 30, 26, '#4C5A9C');
  });
};

// ---------------------------------------------------------------- Terre et Mars : le message qui voyage
D.mars = (ctx, L, tm, k, u) => {
  const ex = W * 0.16, mx = W * 0.84, cy = H * 0.58;
  popIn(ctx, E.out(pr(u, 0, 0.5)), ex, cy, () => { earth(ctx, ex, cy, 90, tm.t, { spin: 0.05 }); label(ctx, 'Terre', ex, cy + 150, { px: 26, color: C.ink2 }); });
  popIn(ctx, E.out(pr(u, 0.2, 0.5)), mx, cy, () => { const g = ctx.createRadialGradient(mx - 20, cy - 20, 10, mx, cy, 70); g.addColorStop(0, '#F0A26B'); g.addColorStop(1, '#B4552E'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, cy, 70, 0, TAU); ctx.fill(); label(ctx, 'Mars', mx, cy + 130, { px: 26, color: C.ink2 }); });
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3; ctx.setLineDash([8, 12]); ctx.beginPath(); ctx.moveTo(ex + 110, cy); ctx.quadraticCurveTo(W / 2, cy - 200, mx - 90, cy); ctx.stroke(); ctx.restore();
  const span = Math.max(2, tm.dur - 0.5), q = E.inOut(clamp((u - 0.6) / span, 0, 1));
  const bx = (1 - q) * (1 - q) * (ex + 110) + 2 * (1 - q) * q * (W / 2) + q * q * (mx - 90), by = (1 - q) * (1 - q) * cy + 2 * (1 - q) * q * (cy - 200) + q * q * cy;
  if (u > 0.6) { ctx.fillStyle = '#F5F7FC'; rr(ctx, bx - 30, by - 20, 60, 40, 6); ctx.fill(); ctx.strokeStyle = '#7A84B0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 30, by - 20); ctx.lineTo(bx, by + 4); ctx.lineTo(bx + 30, by - 20); ctx.stroke(); }
  const mins = Math.round(20 * q);
  card(ctx, W / 2 - 130, H * 0.12, 260, 92, 46);
  icon(ctx, 'clock', W / 2 - 78, H * 0.12 + 46, 40, C.gold, 2.6);
  label(ctx, mins + ' min', W / 2 + 30, H * 0.12 + 62, { px: 44, w: 800 });
};

// ---------------------------------------------------------------- feu
D.fire = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, s = (L.s || 1) * E.out(pr(u, 0, 0.8));
  if (s <= 0) return;
  ctx.fillStyle = '#5A6273'; rr(ctx, cx - 50 * s, cy + 10 * s, 100 * s, 90 * s, 12 * s); ctx.fill(); ctx.fillStyle = '#7C879C'; rr(ctx, cx - 50 * s, cy + 10 * s, 100 * s, 20 * s, 8 * s); ctx.fill();
  glowDot(ctx, cx, cy - 40 * s, 230 * s, '#FF8A3D', 0.45);
  const fl = (sc, col, ph) => { ctx.fillStyle = col; ctx.beginPath(); const w = 70 * s * sc, h = (180 + 25 * Math.sin(tm.t * 11 + ph)) * s * sc; ctx.moveTo(cx, cy + 14 * s); ctx.bezierCurveTo(cx - w * 1.3, cy - h * 0.2, cx - w * 0.3, cy - h * 0.55, cx + 8 * Math.sin(tm.t * 7 + ph) * s, cy - h); ctx.bezierCurveTo(cx + w * 0.4, cy - h * 0.5, cx + w * 1.3, cy - h * 0.2, cx, cy + 14 * s); ctx.fill(); };
  fl(1, '#FF5A2E', 0); fl(0.75, '#FF9F45', 1); fl(0.48, '#FFE08A', 2);
  for (let i = 0; i < 8; i++) { const q = (tm.t * 1.4 + i / 8) % 1; ctx.globalAlpha = 1 - q; circle(ctx, cx + Math.sin(i * 3 + tm.t * 4) * 50 * s, cy - 120 * s - q * 120 * s, 4 * s, '#FFD27A'); } ctx.globalAlpha = 1;
};

// ---------------------------------------------------------------- pression : manomètre, sablier, compartiments
D.gauge = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, s = L.s || 1, r = 170 * s;
  const d0 = L.drop ? at(tm, L.drop[0]) : 0, d1 = L.drop ? at(tm, L.drop[1]) : 1;
  const v = 1 - 0.32 * E.inOut(clamp((tm.n - d0) / Math.max(0.5, d1 - d0), 0, 1));
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    circle(ctx, cx, cy, r + 22 * s, 'rgba(16,22,58,0.94)'); circle(ctx, cx, cy, r, '#F5F7FC');
    const a0 = PI * 0.75, a1 = PI * 2.25;
    for (const [f0, f1, col] of [[0, 0.3, C.signal], [0.3, 0.55, C.warn], [0.55, 1, C.ok]]) { ctx.strokeStyle = col; ctx.lineWidth = 22 * s; ctx.beginPath(); ctx.arc(cx, cy, r - 30 * s, lerp(a0, a1, f0), lerp(a0, a1, f1)); ctx.stroke(); }
    for (let i = 0; i <= 10; i++) { const a = lerp(a0, a1, i / 10); line(ctx, cx + Math.cos(a) * (r - 52 * s), cy + Math.sin(a) * (r - 52 * s), cx + Math.cos(a) * (r - 66 * s), cy + Math.sin(a) * (r - 66 * s), 4 * s, '#5A6273'); }
    const a = lerp(a0, a1, v * 0.92);
    line(ctx, cx, cy, cx + Math.cos(a) * (r - 46 * s), cy + Math.sin(a) * (r - 46 * s), 10 * s, '#141A3C'); circle(ctx, cx, cy, 18 * s, '#141A3C');
    label(ctx, 'Pression', cx, cy + r * 0.62, { px: 26 * s, color: '#5A6273' });
  });
};
D.hourglass = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, f = clamp(u / 6, 0, 1);
  popIn(ctx, E.back(pr(u, 0, 0.5)), cx, cy, () => {
    ctx.fillStyle = '#8A6B3E'; rr(ctx, cx - 110, cy - 170, 220, 26, 12); ctx.fill(); rr(ctx, cx - 110, cy + 144, 220, 26, 12); ctx.fill();
    ctx.fillStyle = 'rgba(200,230,255,0.25)'; ctx.beginPath(); ctx.moveTo(cx - 90, cy - 144); ctx.lineTo(cx + 90, cy - 144); ctx.lineTo(cx + 12, cy); ctx.lineTo(cx + 90, cy + 144); ctx.lineTo(cx - 90, cy + 144); ctx.lineTo(cx - 12, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gold; const t1 = lerp(0.85, 0.25, f); ctx.beginPath(); ctx.moveTo(cx - 90 * t1, cy - 144 * t1 + 0); ctx.lineTo(cx + 90 * t1, cy - 144 * t1); ctx.lineTo(cx, cy - 8); ctx.closePath(); ctx.fill();
    const b = lerp(0.15, 0.7, f); ctx.beginPath(); ctx.moveTo(cx - 90, cy + 144); ctx.lineTo(cx + 90, cy + 144); ctx.lineTo(cx + 90 * (1 - b * 0.5), cy + 144 - 144 * b); ctx.lineTo(cx - 90 * (1 - b * 0.5), cy + 144 - 144 * b); ctx.closePath(); ctx.fill();
    line(ctx, cx, cy, cx, cy + 144 - 144 * b, 4, C.gold);
  });
};
// rangée de modules : l'équipage se regroupe, on ferme les écoutilles, on trouve la fuite
D.hatches = (ctx, L, tm, k, u) => {
  const cy = L.y * H, n = L.segments ? 2 : 5, mw = L.segments ? 420 : 190, gap = 34, x0 = W / 2 - (n * mw + (n - 1) * gap) / 2;
  const c0 = L.close ? at(tm, L.close[0]) : 99, c1 = L.close ? at(tm, L.close[1]) : 99;
  const closedAt = i => lerp(c0, c1, n > 2 ? i / (n - 2) : 0);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (mw + gap), leak = L.leak === i, alarm = L.segments && i === 0;
    const allClosed = tm.n > c1 + 0.3;
    let col = '#2D3A78';
    if (leak && allClosed) col = mixC('#2D3A78', C.signal, 0.6 + 0.3 * Math.sin(tm.t * 6));
    else if (alarm) col = mixC('#2D3A78', C.signal, 0.35 + 0.25 * Math.sin(tm.t * 6));
    else if (allClosed && !L.segments) col = mixC('#2D3A78', C.ok, 0.35);
    else if (L.segments && i === 1) col = mixC('#2D3A78', C.ok, 0.35);
    popIn(ctx, E.out(pr(u, i * 0.1, 0.4)), x + mw / 2, cy, () => {
      ctx.fillStyle = col; rr(ctx, x, cy - 80, mw, 160, 40); ctx.fill();
      for (let r2 = 1; r2 < 4; r2++) line(ctx, x + mw * r2 / 4, cy - 80, x + mw * r2 / 4, cy + 80, 2, 'rgba(255,255,255,0.08)');
      if (L.segments) label(ctx, i === 0 ? 'Segment américain' : 'Segment sûr', x + mw / 2, cy - 110, { px: 26, color: C.ink2 });
      if (leak && allClosed) { for (let j = 0; j < 5; j++) { const q = (tm.t + j / 5) % 1; ctx.globalAlpha = 1 - q; circle(ctx, x + mw / 2 + q * 60, cy - 80 - q * 60, 8 + q * 12, '#DDE7F5'); } ctx.globalAlpha = 1; }
    });
    // écoutille entre i et i + 1
    if (i < n - 1) {
      const hx = x + mw + gap / 2, closed = tm.n > closedAt(i) ? E.out(pr(tm.n, closedAt(i), 0.35)) : 0;
      ctx.fillStyle = '#5A6496'; rr(ctx, hx - gap / 2, cy - 34, gap, 68, 8); ctx.fill();
      if (closed > 0) { ctx.fillStyle = C.gold; rr(ctx, hx - 8, cy - 34 * closed, 16, 68 * closed, 6); ctx.fill(); }
    }
  }
  // l'équipage : des points qui se regroupent puis changent de segment
  const g = L.gather !== undefined ? E.inOut(pr(tm.n, at(tm, L.gather), 1.2)) : 1;
  const crew = L.segments ? 4 : 4;
  for (let c = 0; c < crew; c++) {
    let tx, ty = cy + (c % 2 ? 20 : -20);
    if (L.segments) { const mv = E.inOut(pr(tm.n, at(tm, 's0@0.1'), 1.6)); tx = lerp(x0 + 100 + c * 70, x0 + mw + gap + 120 + c * 60, mv); }
    else { const home = x0 + (c + (c > 1 ? 1 : 0)) * (mw + gap) + mw / 2, mid = x0 + 2 * (mw + gap) + mw / 2 - 50 + c * 34; tx = lerp(home, mid, g); }
    circle(ctx, tx, ty, 14, ['#3567D6', '#F08A3C', '#15A58E', '#7C5CDB'][c]); circle(ctx, tx, ty, 14, 'rgba(255,255,255,0.0)');
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, 14, 0, TAU); ctx.stroke();
  }
};
D.simcard = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, w = 520, h = 300;
  popIn(ctx, E.back(pr(u, 0, 0.6)), cx, cy, () => {
    card(ctx, cx - w / 2, cy - h / 2, w, h, 34, '#1B2563');
    glowDot(ctx, cx + 150, cy - 80, 220, C.atmo2, 0.35);
    badge(ctx, L.icon === 'gauge' ? 'gauge' : L.icon || 'play', cx - w / 2 + 70, cy - h / 2 + 70, 36, C.gold, '#2A1D06');
    label(ctx, 'Simulation', cx - w / 2 + 40, cy + 10, { px: 26, color: C.ink2, align: 'left', w: 500 });
    label(ctx, L.label || '', cx - w / 2 + 40, cy + 58, { px: 40, w: 800, align: 'left' });
    const p = 1 + 0.06 * Math.sin(tm.t * 5); ctx.save(); ctx.translate(cx + w / 2 - 80, cy + h / 2 - 70); ctx.scale(p, p); circle(ctx, 0, 0, 38, C.ok); icon(ctx, 'play', 3, 0, 34, '#0E1433', 2.8); ctx.restore();
  });
};

// ---------------------------------------------------------------- le Soleil, l'alerte, l'abri
D.sun = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, s = L.s || 1, r = 150 * s;
  glowDot(ctx, cx, cy, r * 3, '#FFB347', 0.35); glowDot(ctx, cx, cy, r * 1.6, '#FFD27A', 0.6);
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); g.addColorStop(0, '#FFF3C4'); g.addColorStop(0.6, '#FFC24B'); g.addColorStop(1, '#FF8A3D');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + tm.t * 0.1; circle(ctx, cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.45, r * 0.08, 'rgba(255,140,40,0.35)'); }
  if (L.flare !== undefined) {
    const kf = E.out(pr(tm.n, at(tm, L.flare), 1.2));
    if (kf > 0) {
      ctx.save(); ctx.strokeStyle = '#FFF1C9'; ctx.lineWidth = 16 * s; ctx.lineCap = 'round'; ctx.globalAlpha = kf; ctx.shadowColor = '#FFD27A'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(cx + r * 0.9, cy - r * 0.2, r * 0.5 * kf, PI * 0.9, PI * 1.9); ctx.stroke(); ctx.restore();
      for (let i = 0; i < 60; i++) { const q = ((tm.t - at(tm, L.flare)) * (0.4 + (i % 7) * 0.08) + i / 60) % 1; if (q < 0) continue; const x = cx + r + q * (W - cx), y = cy + Math.sin(i * 1.7) * q * 260; circle(ctx, x, y, 4 + (i % 3), hexA('#FFD27A', (1 - q) * kf)); }
      const kl = E.back(pr(tm.n, at(tm, L.flare) + 0.8, 0.5)); popIn(ctx, kl, W * 0.74, H * 0.2, () => { card(ctx, W * 0.74 - 140, H * 0.2 - 40, 280, 80, 40); label(ctx, 'Protons', W * 0.74, H * 0.2 + 12, { px: 32, w: 800, color: C.gold }); });
    }
  }
};
D.forecast = (ctx, L, tm, k, u) => {
  const ex = W * 0.3, ey = H * 0.58, sx = W * 0.78, sy = H * 0.3;
  glowDot(ctx, -40, H * 0.1, 300, '#FFC24B', 0.5); circle(ctx, -10, H * 0.08, 80, '#FFD27A');
  popIn(ctx, E.out(pr(u, 0, 0.5)), ex, ey, () => { earth(ctx, ex, ey, 160, tm.t, { spin: 0.05 }); });
  // antenne qui surveille
  const ax = ex - 40, ay = ey - 168;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(-0.6 + 0.08 * Math.sin(tm.t)); ctx.fillStyle = '#E9EDF3'; ctx.beginPath(); ctx.arc(0, 0, 34, PI * 0.15, PI * 1.15); ctx.closePath(); ctx.fill(); line(ctx, 0, 0, -10, -26, 4, '#E9EDF3'); ctx.restore(); line(ctx, ax, ay, ax + 4, ay + 26, 6, '#9AA6BA');
  for (let i = 0; i < 3; i++) { const q = (tm.t * 0.6 + i / 3) % 1; ctx.globalAlpha = (1 - q) * 0.8; ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ax, ay, 40 + q * 90, PI * 1.05, PI * 1.45); ctx.stroke(); } ctx.globalAlpha = 1;
  const ka = pr(tm.n, at(tm, 's0@0.6'), 1.2);
  iss(ctx, sx, sy, 0.16, tm.t, {});
  if (ka > 0) {
    for (let i = 0; i < 4; i++) { const q = (tm.t * 0.9 + i / 4) % 1, x = lerp(ex + 120, sx - 60, q), y = lerp(ey - 110, sy + 30, q); ctx.globalAlpha = ka * Math.sin(q * PI); ctx.strokeStyle = C.signal; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 18, -1, 1); ctx.stroke(); } ctx.globalAlpha = 1;
    popIn(ctx, E.back(pr(tm.n, at(tm, 's0@0.6') + 0.6, 0.5)), sx, sy - 120, () => { card(ctx, sx - 110, sy - 160, 220, 76, 38, C.signal); icon(ctx, 'alarm', sx - 66, sy - 122, 34, '#FFFFFF', 2.6); label(ctx, 'Alerte', sx + 22, sy - 110, { px: 32, w: 800, color: '#FFFFFF' }); });
  }
};
D.shelter = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, w = 620, h = 380;
  const b0 = L.build ? at(tm, L.build[0]) : -9, b1 = L.build ? at(tm, L.build[1]) : -8;
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, cx - w / 2 - 30, cy - h / 2 - 30, w + 60, h + 60, 60); ctx.fill();
  // l'équipage au centre
  const crew = ['keiko', 'lucas', 'aminata'];
  crew.forEach((who, i) => R.draw(ctx, R.P.floatFront(tm.t + i, { face: { mouth: 'neutral' } }), { who, s: 190, x: cx - 110 + i * 110, y: cy + 20, t: tm.t + i }));
  // sacs d'eau et de réserves autour
  const bags = [];
  for (let i = 0; i < 7; i++) bags.push([cx - w / 2 + i * (w / 7) + 6, cy - h / 2, w / 7 - 12, 70, i % 2]);
  for (let i = 0; i < 7; i++) bags.push([cx - w / 2 + i * (w / 7) + 6, cy + h / 2 - 70, w / 7 - 12, 70, (i + 1) % 2]);
  for (let i = 0; i < 2; i++) { bags.push([cx - w / 2, cy - h / 2 + 82 + i * 112, 70, 100, i % 2]); bags.push([cx + w / 2 - 70, cy - h / 2 + 82 + i * 112, 70, 100, (i + 1) % 2]); }
  bags.forEach(([x, y, bw, bh, kind], i) => {
    const kb = E.back(clamp((tm.n - lerp(b0, b1, i / bags.length)) / 0.4, 0, 1)); if (kb <= 0) return;
    popIn(ctx, kb, x + bw / 2, y + bh / 2, () => { ctx.fillStyle = kind ? '#4FA3E0' : '#E8DFC8'; rr(ctx, x, y, bw, bh, 14); ctx.fill(); if (kind) icon(ctx, 'drop', x + bw / 2, y + bh / 2, 26, 'rgba(255,255,255,0.85)', 2.6); else line(ctx, x + 10, y + bh / 2, x + bw - 10, y + bh / 2, 4, 'rgba(120,100,70,0.5)'); });
  });
  if (L.particles) {
    const r0 = rng(8);
    for (let i = 0; i < 26; i++) {
      const y = cy - h / 2 - 40 + r0() * (h + 80), sp = 0.6 + r0() * 0.6, q = (tm.t * sp + r0()) % 1, x = lerp(-40, cx - w / 2 + 20, q);
      const pass = i % 9 === 0; const xx = pass ? lerp(-40, cx - 60, q) : x;
      ctx.globalAlpha = pass ? 0.9 : 1 - Math.max(0, (q - 0.8) * 5); line(ctx, xx, y, xx - 40, y, 3, '#FFD27A'); circle(ctx, xx, y, 4, '#FFF1C9');
    }
    ctx.globalAlpha = 1;
  }
};

// ---------------------------------------------------------------- pression du scaphandre, bulles d'azote
D.pressure = (ctx, L, tm, k, u) => {
  const cy = L.y * H;
  const col = (x, v, name, val, c, a0) => {
    const kk = E.out(pr(u, a0, 0.5)), f = E.inOut(pr(u, a0 + 0.3, 1.2)) * v;
    popIn(ctx, kk, x, cy, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, x - 70, cy - 200, 140, 360, 40); ctx.fill();
      ctx.fillStyle = c; rr(ctx, x - 70, cy + 160 - 360 * f, 140, 360 * f, 40); ctx.fill();
      label(ctx, name, x, cy + 212, { px: 28 }); label(ctx, val, x, cy + 250, { px: 26, color: C.ink2, w: 500 });
    });
  };
  col(W * 0.36, 1, 'Cabine', '1 bar', C.atmo2, 0);
  col(W * 0.64, 0.3, 'Scaphandre', '≈ 0,3 bar', C.gold, 0.4);
};
D.bubbles = (ctx, L, tm, k, u) => {
  const s = L.s || 1, cx = L.x * W, cy = L.y * H, w = 900 * s, h = 220 * s;
  const g0 = L.grow ? at(tm, L.grow[0]) : 99, f0 = L.flush ? at(tm, L.flush[0]) : 99;
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    ctx.fillStyle = '#7E1D2E'; rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = '#9C2639'; rr(ctx, cx - w / 2, cy - h / 2 + 16 * s, w, h - 32 * s, (h - 32 * s) / 2); ctx.fill();
    ctx.save(); rr(ctx, cx - w / 2, cy - h / 2 + 16 * s, w, h - 32 * s, (h - 32 * s) / 2); ctx.clip();
    const r0 = rng(12);
    for (let i = 0; i < 22; i++) { const y = cy + (r0() - 0.5) * h * 0.6, q = (tm.t * 0.12 + r0()) % 1, x = cx - w / 2 + q * w; ctx.fillStyle = '#E2465A'; ctx.beginPath(); ctx.ellipse(x, y, 22 * s, 13 * s, r0(), 0, TAU); ctx.fill(); }
    const grow = E.inOut(pr(tm.n, g0, 2)), flush = E.inOut(pr(tm.n, f0, 2));
    for (let i = 0; i < 16; i++) {
      const y = cy + (r0() - 0.5) * h * 0.55, q = (tm.t * 0.12 + r0()) % 1, x = cx - w / 2 + q * w;
      const rad = (4 + 22 * grow * (i % 3 === 0 ? 1 : 0.4)) * s * (1 - flush);
      if (rad <= 0.5) continue;
      ctx.fillStyle = 'rgba(230,245,255,0.85)'; ctx.beginPath(); ctx.arc(x, y - flush * 80 * s, rad, 0, TAU); ctx.fill();
    }
    ctx.restore();
    const kl = pr(u, 0.6, 0.5); if (kl > 0) { ctx.save(); ctx.globalAlpha = kl; const px = 30 * Math.max(s, 0.8); ctx.font = font(700, px); const tw = ctx.measureText("Bulles d'azote").width + 44; card(ctx, cx - tw / 2, cy - h / 2 - 34 * s - px * 1.2, tw, px * 1.7, px * 0.85); label(ctx, "Bulles d'azote", cx, cy - h / 2 - 34 * s, { px }); ctx.restore(); }
  });
};

// ---------------------------------------------------------------- réanimation en apesanteur
function patient(ctx, x, y, s, t, rotA = -PI / 2) { R.draw(ctx, R.P.lie(t), { who: 'rafael', s, x, y, rot: rotA, t }); }
D.cprEarth = (ctx, L, tm, k, u) => {
  // fond terrestre simple : sol
  ctx.fillStyle = '#E9DFC6'; ctx.fillRect(0, H * 0.72, W, H * 0.3); const g = ctx.createLinearGradient(0, 0, 0, H * 0.72); g.addColorStop(0, '#BFE6FF'); g.addColorStop(1, '#EAF7FF'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.72);
  const push = 0.5 + 0.5 * Math.sin(tm.t * TAU * 1.8);
  patient(ctx, W * 0.5 - 20, H * 0.68, 380, tm.t);
  const pose = { view: 'side', world: true, spine: 0.55, head: 0.3, shN: 0.05 + 0.02 * push, elN: 0, shF: 0.03, elF: 0, hipN: 1.95, knN: 2.2, ankN: -0.8, hipF: 1.9, knF: 2.2, ankF: -0.8, face: { mouth: 'grit', brow: -0.3 } };
  R.draw(ctx, pose, { who: 'keiko', s: 360, x: W * 0.5 - 150, y: H * 0.6 + push * 6, t: tm.t });
  arrow(ctx, W * 0.5 - 60, H * 0.12, W * 0.5 - 60, H * 0.3, 8, C.coral, 26);
  card(ctx, W * 0.62, H * 0.14, 300, 70, 35); label(ctx, 'Ton poids aide', W * 0.62 + 150, H * 0.14 + 46, { px: 28 });
};
D.cprDrift = (ctx, L, tm, k, u) => {
  ctx.fillStyle = '#1C2C6B'; ctx.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) circle(ctx, (i * 211) % W, (i * 97) % H, 1.5, 'rgba(255,255,255,0.4)');
  const d = (u % 2.4) / 2.4, push = d < 0.15 ? d / 0.15 : 1, drift = E.out(clamp((d - 0.12) / 0.8, 0, 1));
  patient(ctx, W * 0.5 - 20, H * 0.62 + drift * 40, 380, tm.t, -PI / 2 + 0.1 * drift);
  const pose = { view: 'side', world: true, spine: 0.4, head: 0.3, shN: 0.1, elN: 0, shF: 0.08, elF: 0, hipN: 0.4, knN: 0.8, ankN: 0, hipF: 0.2, knF: 0.6, ankF: 0, face: { mouth: 'o', eye: 'wide', brow: 1 } };
  R.draw(ctx, pose, { who: 'keiko', s: 360, x: W * 0.5 - 140 - drift * 60, y: H * 0.42 - drift * 190, rot: -0.3 * drift, t: tm.t });
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = drift * (1 - i * 0.3); line(ctx, W * 0.5 - 200 + i * 40, H * 0.5 - drift * 120 + 70, W * 0.5 - 220 + i * 40, H * 0.5 - drift * 120 + 120, 5, '#FFFFFF'); } ctx.globalAlpha = 1;
  card(ctx, W * 0.6, H * 0.12, 420, 70, 35); label(ctx, 'Chaque poussée te repousse', W * 0.6 + 210, H * 0.12 + 46, { px: 28 });
};
D.cprBrace = (ctx, L, tm, k, u) => {
  const push = 0.5 + 0.5 * Math.sin(tm.t * TAU * 1.8);
  const kk = E.out(pr(u, 0, 0.5));
  ctx.save(); ctx.globalAlpha = kk;
  if (L.mode === 'legs') {
    // le sauveteur assis sur le patient, jambes autour du thorax
    patient(ctx, W * 0.5, H * 0.66, 380, tm.t);
    const pose = { view: 'side', world: true, spine: 0.25, head: 0.2, shN: 0.15 + 0.03 * push, elN: 0.05, shF: 0.12, elF: 0.05, hipN: 1.75, knN: 2.35, ankN: 0, hipF: 1.7, knF: 2.3, ankF: 0, face: { mouth: 'grit', brow: -0.3 } };
    R.draw(ctx, pose, { who: 'keiko', s: 360, x: W * 0.5 - 70, y: H * 0.58 + push * 5, t: tm.t });
    card(ctx, W * 0.64, H * 0.12, 380, 70, 35); label(ctx, 'Les jambes autour du thorax', W * 0.64 + 190, H * 0.12 + 46, { px: 26 });
  } else {
    // pieds au plafond, bras tendus vers le patient
    patient(ctx, W * 0.5, H * 0.78, 380, tm.t);
    const pose = R.P.handstand(tm.t, { face: { mouth: 'grit' } });
    R.draw(ctx, pose, { who: 'keiko', s: 400, x: W * 0.5 - 38, y: H * 0.33 + push * 6, rot: PI, t: tm.t });
    ctx.fillStyle = '#E6B04B'; rr(ctx, W * 0.5 - 120, H * 0.06, 170, 16, 8); ctx.fill();
    card(ctx, W * 0.64, H * 0.16, 340, 70, 35); label(ctx, 'Les pieds au plafond', W * 0.64 + 170, H * 0.16 + 46, { px: 26 });
  }
  ctx.restore();
};
D.cprTable = (ctx, L, tm, k, u) => {
  const s = L.s || 1, cx = L.x * W, cy = L.y * H;
  const push = 0.5 + 0.5 * Math.sin(tm.t * TAU * 1.8);
  // la table médicale
  ctx.fillStyle = '#5A6496'; rr(ctx, cx - 300 * s, cy + 60 * s, 600 * s, 34 * s, 14 * s); ctx.fill(); ctx.fillStyle = '#3E4778'; ctx.fillRect(cx - 250 * s, cy + 94 * s, 20 * s, 120 * s); ctx.fillRect(cx + 230 * s, cy + 94 * s, 20 * s, 120 * s);
  patient(ctx, cx - 10 * s, cy + 40 * s, 400 * s, tm.t);
  if (L.straps) L.straps.forEach((a, i) => { const ks = E.out(pr(tm.n, at(tm, a), 0.4)); if (ks > 0) { const x = cx + (i ? 200 : 60) * s; ctx.fillStyle = C.gold; rr(ctx, x - 14 * s, cy + 18 * s - 30 * s * ks, 28 * s, 80 * s * ks, 8 * s); ctx.fill(); } });
  const swapped = L.swap !== undefined && tm.n > at(tm, L.swap);
  const pumping = L.pumping || (L.straps && tm.n > at(tm, L.straps[1]) + 0.3);
  const pose = { view: 'side', world: true, spine: 0.65, head: 0.25, shN: 0.1 + (pumping ? 0.03 * push : 0), elN: 0.02, shF: 0.08, elF: 0.02, hipN: 0.3, knN: 0.6, ankN: 0, hipF: 0.1, knF: 0.4, ankF: 0, face: { mouth: pumping ? 'grit' : 'neutral', brow: -0.3 } };
  R.draw(ctx, pose, { who: swapped ? 'lucas' : 'keiko', s: 360 * s, x: cx - 150 * s, y: cy - 40 * s + (pumping ? push * 5 : 0), t: tm.t });
  if (L.swap !== undefined) { const kw = pr(tm.n, at(tm, L.swap) - 0.4, 0.8); if (kw > 0 && kw < 1) { const who = 'keiko'; R.draw(ctx, R.P.float(tm.t), { who, s: 320 * s, x: cx - 150 * s - kw * 500, y: cy - 60 * s - kw * 100, t: tm.t, alpha: 1 - kw }); } }
};
D.heart = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, bpm = L.bpm || 0;
  const beat = bpm ? Math.pow(Math.max(0, Math.sin(tm.t * PI * bpm / 60)), 8) : 0;
  const s = 1 + 0.08 * beat;
  popIn(ctx, E.out(pr(u, 0, 0.5)), cx, cy, () => {
    ctx.save(); ctx.translate(cx, cy - 30); ctx.scale(s * 6, s * 6); ctx.fillStyle = bpm ? C.coral : '#8A4A5A'; ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(-30, 2, -22, -22, 0, -8); ctx.bezierCurveTo(22, -22, 30, 2, 0, 22); ctx.fill(); ctx.restore();
    // tracé de l'électrocardiogramme
    if (L.noEcg) return;
    ctx.save(); ctx.strokeStyle = bpm ? '#FFFFFF' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const x = cx - 240 + i * 4; let y = cy + 190; if (bpm) { const ph = ((i / 120) * 3 - tm.t * bpm / 60) % 1; const q = ph < 0 ? ph + 1 : ph; if (q > 0.45 && q < 0.5) y -= 70; else if (q > 0.5 && q < 0.55) y += 40; } i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  });
};

// ---------------------------------------------------------------- le poids qui charge les os (sur Terre)
D.weight = (ctx, L, tm, k, u) => {
  const cx = L.x * W, gy = H * 0.84;
  for (let i = 0; i < 3; i++) { const q = (tm.t * 0.9 + i / 3) % 1; ctx.globalAlpha = k * Math.sin(q * PI); arrow(ctx, cx + (i - 1) * 46, gy - 110 + q * 60, cx + (i - 1) * 46, gy - 60 + q * 60, 7, C.coral, 20); }
  ctx.globalAlpha = 1;
  popIn(ctx, E.back(pr(u, 0.3, 0.5)), cx + 300, H * 0.3, () => { card(ctx, cx + 140, H * 0.3 - 40, 330, 80, 40); label(ctx, 'Le poids charge les os', cx + 305, H * 0.3 + 10, { px: 26 }); });
};

// ---------------------------------------------------------------- l'application AURA sur un téléphone
D.phone = (ctx, L, tm, k, u) => {
  const cx = L.x * W, cy = L.y * H, w = 330, h = 600, sc = L.s || 1;
  ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  popIn(ctx, E.out(pr(u, 0, 0.6)), cx, cy, () => {
    ctx.save(); ctx.shadowColor = 'rgba(4,8,30,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; ctx.fillStyle = '#05070F'; rr(ctx, cx - w / 2 - 12, cy - h / 2 - 12, w + 24, h + 24, 52); ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, '#141C45'); g.addColorStop(1, '#0C1230'); ctx.fillStyle = g; rr(ctx, cx - w / 2, cy - h / 2, w, h, 42); ctx.fill();
    const x0 = cx - w / 2 + 28; let y = cy - h / 2 + 70;
    text(ctx, 'AURA', x0, y, { font: font(800, 22), color: C.ink3 });
    y += 46;
    if (L.screen === 'sleep') {
      text(ctx, 'Tes nuits', x0, y, { font: font(800, 34), color: C.ink }); y += 40;
      const vals = [7.2, 6.8, 7.0, 4.6, 6.5, 6.9, 7.1], days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      vals.forEach((v, i) => { const f = E.out(pr(u, 0.4 + i * 0.12, 0.5)), bh = 230 * v / 8 * f, bx = x0 + i * 40, by = y + 250; ctx.fillStyle = i === 3 ? C.coral : C.sophie; rr(ctx, bx, by - bh, 26, bh, 13); ctx.fill(); text(ctx, days[i], bx + 13, by + 30, { font: font(700, 18), color: C.ink3, align: 'center' }); });
      const kn = E.back(pr(u, 1.6, 0.5)); popIn(ctx, kn, x0 + 133, y + 60, () => { card(ctx, x0 + 60, y + 30, 170, 52, 26, C.coral); text(ctx, 'Nuit courte', x0 + 145, y + 64, { font: font(800, 20), color: '#FFFFFF', align: 'center' }); });
      text(ctx, 'Moyenne : 6 h 50', x0, y + 340, { font: font(700, 22), color: C.ink2 });
    } else {
      text(ctx, 'Sport', x0, y, { font: font(800, 34), color: C.ink }); y += 30;
      ctx.fillStyle = hexA(C.gold, 0.16); rr(ctx, x0, y, 210, 44, 22); ctx.fill(); icon(ctx, 'fire', x0 + 24, y + 22, 22, C.gold, 2.4); text(ctx, '5 jours de suite', x0 + 44, y + 29, { font: font(700, 19), color: C.gold }); y += 72;
      [['run', 'Tapis', '30 min'], ['bike', 'Vélo', '20 min'], ['dumbbell', 'Musculation', '45 min']].forEach(([ic, a, b], i) => {
        const ki = E.out(pr(u, 0.5 + i * 0.35, 0.4));
        popIn(ctx, ki, cx, y + 40, () => {
          ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, x0, y, w - 56, 84, 22); ctx.fill();
          badge(ctx, ic === 'dumbbell' ? 'dumbbell' : ic === 'bike' ? 'heart' : 'up', x0 + 40, y + 42, 22, [C.atmo, C.ok, C.gold][i], '#10163A');
          text(ctx, a, x0 + 76, y + 38, { font: font(700, 22), color: C.ink }); text(ctx, b, x0 + 76, y + 64, { font: font(500, 18), color: C.ink3 });
          const kc = E.back(pr(u, 0.9 + i * 0.35, 0.4)); if (kc > 0) { circle(ctx, x0 + w - 96, y + 42, 18 * kc, C.ok); icon(ctx, 'check', x0 + w - 96, y + 42, 22 * kc, '#10163A', 3); }
        });
        y += 100;
      });
    }
  });
};
