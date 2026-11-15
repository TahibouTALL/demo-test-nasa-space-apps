// Décors des films : intérieur de la station, coupole, orbite, espace, fonds unis, Terre, extérieur.
import { W, H, PI, TAU, C, TONES, clamp, lerp, E, pr, rng, rr, circle, line, poly, hexA, glowDot, mixC, shadeC } from './base.mjs';

const shade = shadeC, mix = mixC;

// ---------------------------------------------------------------- étoiles (fixes, scintillantes)
const STARS = (() => { const r = rng(7); return Array.from({ length: 230 }, () => [r() * W * 1.3 - W * 0.15, r() * H * 1.3 - H * 0.15, r() * 1.4 + 0.3, r() * TAU]); })();
export function stars(ctx, t, a = 1) {
  for (const [x, y, s, ph] of STARS) { ctx.globalAlpha = a * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + ph))); circle(ctx, x, y, s, '#FFFFFF'); }
  ctx.globalAlpha = 1;
}
export function spaceBg(ctx, t, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060A1C'); g.addColorStop(1, '#0E1638');
  ctx.fillStyle = g; ctx.fillRect(-W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
  glowDot(ctx, W * 0.78, H * 0.22, 420, '#3A2A7A', 0.35); glowDot(ctx, W * 0.15, H * 0.8, 380, '#173A7A', 0.3);
  stars(ctx, t, o.starA ?? 1);
}

// ---------------------------------------------------------------- la Terre vue d'orbite
const LAND = (() => { const r = rng(21); return Array.from({ length: 9 }, () => ({ a: r() * TAU, d: 0.15 + r() * 0.7, w: 0.1 + r() * 0.16, h: 0.05 + r() * 0.08, c: r() < 0.6 ? '#5E8F4E' : '#C8A86A', k: Array.from({ length: 7 }, () => 0.7 + r() * 0.5) })); })();
const CLOUDS = (() => { const r = rng(5); return Array.from({ length: 26 }, () => ({ a: r() * TAU, d: 0.05 + r() * 0.9, w: 0.04 + r() * 0.11, k: 0.6 + r() * 0.4 })); })();
// cx, cy, r : disque ; spin : rotation lente des nuages et des terres ; seule la calotte visible compte
export function earth(ctx, cx, cy, r, t, o = {}) {
  ctx.save();
  // atmosphère
  const ga = ctx.createRadialGradient(cx, cy, r * 0.98, cx, cy, r * 1.08);
  ga.addColorStop(0, 'rgba(121,216,255,0.75)'); ga.addColorStop(0.4, 'rgba(61,139,255,0.3)'); ga.addColorStop(1, 'rgba(61,139,255,0)');
  ctx.fillStyle = ga; ctx.beginPath(); ctx.arc(cx, cy, r * 1.08, 0, TAU); ctx.fill();
  // océan
  const go = ctx.createRadialGradient(cx, cy - r * 0.6, r * 0.2, cx, cy, r);
  go.addColorStop(0, '#2C86E8'); go.addColorStop(0.75, '#1659B8'); go.addColorStop(1, '#0E3D8A');
  ctx.fillStyle = go; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const spin = (o.spin ?? 0.012) * t;
  // terres : taches arrondies réparties sur la calotte visible (projection simple)
  for (const L of (o.land ? LAND : [])) {
    const a = L.a + spin * 2, px = cx + Math.sin(a) * r * L.d * 1.3, py = cy - r * (0.55 + 0.4 * Math.cos(a) * 0.3) + (L.d - 0.5) * r * 0.5;
    if (Math.cos(a) < -0.2) continue;
    ctx.fillStyle = L.c; ctx.beginPath();
    for (let i = 0; i < 7; i++) { const b = i / 7 * TAU, k = L.k[i]; const x = px + Math.cos(b) * r * L.w * k, y = py + Math.sin(b) * r * L.h * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
  }
  // nuages
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  for (const c of CLOUDS) {
    const a = c.a + spin * 3, px = cx + Math.sin(a) * r * 1.2, py = cy - r * (0.62 + 0.36 * c.d) + c.d * r * 0.3;
    if (Math.cos(a) < -0.1) continue;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(px + (i - 1) * r * c.w * 0.6, py + (i === 1 ? -r * c.w * 0.12 : 0), r * c.w * 0.55 * c.k, r * c.w * 0.22 * c.k, 0, 0, TAU); ctx.fill(); }
  }
  // ombre de la nuit (côté droit) et éclat du soleil
  if (o.night !== false) { const gn = ctx.createLinearGradient(cx + r * 0.2, 0, cx + r * 0.95, 0); gn.addColorStop(0, 'rgba(5,8,25,0)'); gn.addColorStop(1, 'rgba(5,8,25,0.55)'); ctx.fillStyle = gn; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); }
  glowDot(ctx, cx - r * 0.35, cy - r * 0.8, r * 0.6, '#FFFFFF', 0.12);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- la station vue de l'extérieur (unités : pixels à l'échelle 1)
export function station(ctx, t, o = {}) {
  const panel = (x, y, w, h, flip) => {
    ctx.fillStyle = '#B47A22'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(60,35,10,0.55)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x, y + h * i / 8); ctx.lineTo(x + w, y + h * i / 8); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(255,220,150,0.35)'); g.addColorStop(0.5, 'rgba(255,220,150,0)'); g.addColorStop(1, 'rgba(255,240,200,0.18)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  const cyl = (x, y, w, h, vert) => {
    const g = vert ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#C9D0DC'); g.addColorStop(0.35, '#F4F6FA'); g.addColorStop(1, '#9EA8B9');
    ctx.fillStyle = g; rr(ctx, x, y, w, h, Math.min(w, h) * 0.18); ctx.fill();
    ctx.strokeStyle = 'rgba(80,90,110,0.35)'; ctx.lineWidth = 2;
    const n = Math.floor((vert ? h : w) / 34);
    for (let i = 1; i < n; i++) { ctx.beginPath(); if (vert) { ctx.moveTo(x, y + h * i / n); ctx.lineTo(x + w, y + h * i / n); } else { ctx.moveTo(x + w * i / n, y); ctx.lineTo(x + w * i / n, y + h); } ctx.stroke(); }
  };
  // panneaux solaires (4 ailes de chaque côté)
  for (const sx of [-1, 1]) for (const k of [0, 1]) {
    const x0 = sx * (380 + k * 150) - 36;
    panel(x0, -300, 72, 270); panel(x0, 30, 72, 270);
    line(ctx, x0 + 36, -300, x0 + 36, 300, 4, '#6B7387');
  }
  // radiateurs (blancs), avec les boucles d'ammoniac
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    const x0 = sx * (150 + k * 52);
    ctx.fillStyle = '#E9EDF3'; ctx.save(); ctx.translate(x0, 14); ctx.rotate(sx * 0.12);
    ctx.fillRect(-20, 0, 40, 170); ctx.strokeStyle = '#B7C0CF'; ctx.lineWidth = 1.5; for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-20, i * 21); ctx.lineTo(20, i * 21); ctx.stroke(); }
    if (o.flow) { ctx.strokeStyle = 'rgba(255,214,102,0.95)'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 60 * sx; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-12, 160); ctx.lineTo(12, 160); ctx.lineTo(12, 0); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  }
  // poutre
  ctx.fillStyle = '#8A93A6'; ctx.fillRect(-640, -14, 1280, 28);
  ctx.strokeStyle = 'rgba(50,58,75,0.6)'; ctx.lineWidth = 2; for (let x = -640; x < 640; x += 28) { ctx.beginPath(); ctx.moveTo(x, -14); ctx.lineTo(x + 28, 14); ctx.stroke(); }
  if (o.flow) { ctx.strokeStyle = 'rgba(255,214,102,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); ctx.lineDashOffset = t * 60; ctx.beginPath(); ctx.moveTo(-300, 0); ctx.lineTo(300, 0); ctx.stroke(); ctx.setLineDash([]); }
  // modules : une rangée horizontale et une colonne vers le bas
  cyl(-300, 26, 600, 64, false); cyl(-34, 70, 68, 220, true);
  cyl(-420, 36, 130, 44, false);
  // Soyouz amarré en bas : module orbital (sphère), module de descente, module de service, ailes
  const sy = 300;
  if (o.soyuz !== false) {
    line(ctx, -120, sy + 95, 120, sy + 95, 4, '#5A6273');
    for (const sx of [-1, 1]) { ctx.fillStyle = '#1E3E7A'; ctx.fillRect(sx > 0 ? 30 : -150, sy + 80, 120, 30); ctx.strokeStyle = 'rgba(140,180,255,0.35)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { const xx = (sx > 0 ? 30 : -150) + i * 20; ctx.beginPath(); ctx.moveTo(xx, sy + 80); ctx.lineTo(xx, sy + 110); ctx.stroke(); } }
    circle(ctx, 0, sy + 8, 30, '#7C8F5A'); circle(ctx, -8, sy, 12, 'rgba(255,255,255,0.18)');
    ctx.fillStyle = '#6F8150'; ctx.beginPath(); ctx.moveTo(-26, sy + 34); ctx.lineTo(26, sy + 34); ctx.lineTo(36, sy + 74); ctx.lineTo(-36, sy + 74); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C9CFD9'; rr(ctx, -30, sy + 74, 60, 50, 6); ctx.fill();
  }
}
export function iss(ctx, x, y, s, t, o) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); station(ctx, t, o || {}); ctx.restore(); }

// ---------------------------------------------------------------- intérieur d'un module (perspective en tunnel)
const MOD = {
  day: { ceil: '#EEF1F6', wall: '#E2E7EF', floor: '#D3DAE5', far: '#C9D1DE', seam: '#C3CCDA', rail: '#E6B04B' },
  ru: { ceil: '#E9E8D8', wall: '#D9DCC0', floor: '#9C9A86', far: '#C9CBB0', seam: '#BFC2A6', rail: '#C9A24A' }
};
export function moduleScene(ctx, t, o = {}, tm) {
  const pal = o.variant === 'ru' ? MOD.ru : MOD.day;
  const cx = W / 2, cy = H * 0.46;
  const X0 = 780, Y0 = 470, zf = o.tight ? 2.5 : 3.4;
  const Z = o.tight ? [0.85, 1.2, 1.6, 2.05, 2.5] : [0.85, 1.15, 1.5, 1.95, 2.6, 3.4];
  const P = (x, y, z) => [cx + x / z, cy + y / z];
  ctx.save();
  if (o.roll) { ctx.translate(cx, cy); ctx.rotate(o.roll * Math.sin(t * 1.25) + o.roll * 0.4 * Math.sin(t * 2.7)); ctx.translate(-cx, -cy); }
  // fond (au cas où)
  ctx.fillStyle = pal.far; ctx.fillRect(-200, -200, W + 400, H + 400);
  const depthK = z => (z - Z[0]) / (zf - Z[0]);
  const fog = (col, z) => mix(col, '#8E9AB2', depthK(z) * 0.3);
  // un point d'une paroi : w = 'top' | 'bot' | 'left' | 'right' ; u (profondeur 0..1 de la travée), v (0..1 en travers)
  const wallPt = (w, z, v) => {
    if (w === 'top') return P(lerp(-X0, X0, v), -Y0, z);
    if (w === 'bot') return P(lerp(-X0, X0, v), Y0, z);
    if (w === 'left') return P(-X0, lerp(-Y0, Y0, v), z);
    return P(X0, lerp(-Y0, Y0, v), z);
  };
  const quad = (w, z0, z1, v0, v1, col) => poly(ctx, [wallPt(w, z0, v0), wallPt(w, z0, v1), wallPt(w, z1, v1), wallPt(w, z1, v0)], col);
  const R0 = rng(o.variant === 'ru' ? 33 : 11);
  // parois, travée par travée (de la plus lointaine à la plus proche)
  const walls = [['top', pal.ceil], ['left', pal.wall], ['right', shade(pal.wall, 0.97)], ['bot', pal.floor]];
  for (let i = Z.length - 2; i >= 0; i--) {
    const z0 = Z[i], z1 = Z[i + 1];
    for (const [w, base] of walls) {
      quad(w, z0, z1, 0, 1, fog(base, z0));
      // joint entre deux travées
      const a = wallPt(w, z0, 0), b = wallPt(w, z0, 1); line(ctx, a[0], a[1], b[0], b[1], Math.max(1, 5 / z0), fog(pal.seam, z0), 'butt');
      // panneau intérieur et équipements
      const zz0 = lerp(z0, z1, 0.08), zz1 = lerp(z0, z1, 0.92);
      const rk = R0();
      if (w === 'top') {
        // éclairage du plafond
        quad(w, zz0, zz1, 0.36, 0.64, fog(shade(base, 0.96), z0));
        const lit = o.light === 'night' || o.light === 'alarm' ? 0.25 : 1;
        quad(w, lerp(z0, z1, 0.25), lerp(z0, z1, 0.75), 0.43, 0.57, mix('#FFFFFF', '#FFF6DE', 0.3));
        ctx.globalAlpha = lit; const c0 = wallPt(w, (z0 + z1) / 2, 0.5); glowDot(ctx, c0[0], c0[1], 120 / z0, '#FFFFFF', 0.25); ctx.globalAlpha = 1;
      } else if (w === 'bot') {
        quad(w, zz0, zz1, 0.1, 0.9, fog(shade(base, 0.95), z0));
        if (rk < 0.6) { quad(w, lerp(z0, z1, 0.3), lerp(z0, z1, 0.45), 0.42, 0.58, fog('#7C879C', z0)); }
      } else {
        // baie de rangement ou d'expérience
        quad(w, zz0, zz1, 0.08, 0.92, fog(shade(base, 1.03), z0));
        const kind = o.variant === 'lab' ? (rk < 0.55 ? 'screen' : 'bags') : o.variant === 'galley' ? (i === 0 && w === 'left' ? 'galley' : rk < 0.5 ? 'bags' : 'panel') : rk < 0.45 ? 'bags' : rk < 0.75 ? 'panel' : 'screen';
        if (kind === 'bags') {
          for (let k = 0; k < 2; k++) { const v0 = 0.14 + k * 0.4; quad(w, lerp(z0, z1, 0.15), lerp(z0, z1, 0.85), v0, v0 + 0.3, fog(k ? '#F4F1E8' : '#5D7DB6', z0)); quad(w, lerp(z0, z1, 0.15), lerp(z0, z1, 0.85), v0 + 0.13, v0 + 0.16, fog(k ? '#D9D2BF' : '#46639A', z0)); }
        } else if (kind === 'panel') {
          quad(w, lerp(z0, z1, 0.2), lerp(z0, z1, 0.8), 0.3, 0.55, fog('#BFC8D6', z0));
          for (let k = 0; k < 3; k++) { const p = wallPt(w, lerp(z0, z1, 0.3 + k * 0.2), 0.42); circle(ctx, p[0], p[1], 7 / z0, fog(['#E2463F', '#3FB47A', '#E6B04B'][k], z0)); }
          quad(w, lerp(z0, z1, 0.2), lerp(z0, z1, 0.8), 0.62, 0.66, fog('#9AA6BA', z0));
        } else if (kind === 'screen') {
          quad(w, lerp(z0, z1, 0.22), lerp(z0, z1, 0.78), 0.3, 0.58, fog('#2A3352', z0));
          quad(w, lerp(z0, z1, 0.27), lerp(z0, z1, 0.73), 0.33, 0.55, fog(o.light === 'alarm' ? '#C8414A' : '#3D8BFF', z0));
          quad(w, lerp(z0, z1, 0.32), lerp(z0, z1, 0.6), 0.37, 0.4, fog('#9FD0FF', z0));
        } else if (kind === 'galley') {
          quad(w, lerp(z0, z1, 0.1), lerp(z0, z1, 0.9), 0.55, 0.9, fog('#C9D1DE', z0));
          for (let k = 0; k < 4; k++) quad(w, lerp(z0, z1, 0.15 + k * 0.2), lerp(z0, z1, 0.3 + k * 0.2), 0.6, 0.72, fog(['#FF9F45', '#7BE3C6', '#F4F1E8', '#FFC870'][k], z0));
          quad(w, lerp(z0, z1, 0.3), lerp(z0, z1, 0.7), 0.18, 0.42, fog('#E8EEF7', z0));
          const d = wallPt(w, lerp(z0, z1, 0.5), 0.3); circle(ctx, d[0], d[1], 10 / z0, fog('#4FB3FF', z0));
        }
        // rampe
        for (const v of [0.07, 0.93]) quad(w, z0, z1, v - 0.012, v + 0.012, fog(pal.rail, z0));
      }
    }
  }
  // arêtes du module
  for (const [x, y] of [[-X0, -Y0], [X0, -Y0], [-X0, Y0], [X0, Y0]]) { const a = P(x, y, Z[0]), b = P(x, y, zf); line(ctx, a[0], a[1], b[0], b[1], 6, 'rgba(120,132,155,0.35)'); }
  // mur du fond et écoutille
  const f0 = P(-X0, -Y0, zf), f1 = P(X0, Y0, zf);
  ctx.fillStyle = fog(pal.far, zf); ctx.fillRect(f0[0], f0[1], f1[0] - f0[0], f1[1] - f0[1]);
  const hw = (f1[1] - f0[1]) * 0.62, hx = cx - hw / 2, hy = cy - hw / 2;
  ctx.fillStyle = '#A9B3C5'; rr(ctx, hx - 8, hy - 8, hw + 16, hw + 16, hw * 0.3); ctx.fill();
  const gh = ctx.createRadialGradient(cx, cy, 2, cx, cy, hw * 0.6); gh.addColorStop(0, o.light === 'night' ? '#54608A' : '#F6F8FC'); gh.addColorStop(1, o.light === 'night' ? '#2A3150' : '#AEB9CB');
  ctx.fillStyle = gh; rr(ctx, hx, hy, hw, hw, hw * 0.26); ctx.fill();
  if (o.variant === 'node' || o.variant === 'ru') {
    // écoutilles latérales (nœud)
    for (const w of ['left', 'right']) { const a = wallPt(w, 1.55, 0.3), b = wallPt(w, 2.0, 0.7); const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]); ctx.fillStyle = '#A9B3C5'; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (a[1] + b[1]) / 2, (x1 - x0) / 2 + 6, Math.abs(b[1] - a[1]) / 2 + 8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = o.light === 'night' ? '#2E3658' : '#C3CCDB'; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (a[1] + b[1]) / 2, (x1 - x0) / 2 - 2, Math.abs(b[1] - a[1]) / 2, 0, 0, TAU); ctx.fill(); }
  }
  // câbles qui pendent un peu
  ctx.strokeStyle = 'rgba(70,80,100,0.45)'; ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) { const a = wallPt('left', 1.0 + k * 0.6, 0.2 + k * 0.2), b = wallPt('left', 1.4 + k * 0.6, 0.3 + k * 0.2); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2 + 20, (a[1] + b[1]) / 2 + 30, b[0], b[1]); ctx.stroke(); }
  // éléments propres au décor
  if (o.port) { const p = wallPt('right', 2.0, 0.55); circle(ctx, p[0], p[1], 26, '#8A94A8'); circle(ctx, p[0], p[1], 15, '#3A4256'); circle(ctx, p[0], p[1], 6, '#E2463F'); }
  if (o.bags) { for (let k = 0; k < 6; k++) { const a = k < 3 ? 'left' : 'right'; const z = 1.0 + (k % 3) * 0.35; quad(a, z, z + 0.3, 0.12, 0.88, '#5D9FD6'); quad(a, z + 0.05, z + 0.25, 0.45, 0.55, '#4683B8'); } }
  ctx.restore();
  // lumière : nuit, alarme, fumée
  lightFx(ctx, t, o, tm, cx, cy);
}

function lightFx(ctx, t, o, tm, cx, cy) {
  const at = (s, d) => (s !== undefined && tm ? tm.at(s) : d);
  const n = tm ? tm.n : t;
  let night = o.light === 'night' ? 1 : 0;
  if (o.lights !== undefined) night = 1 - E.inOut(pr(n, at(o.lights, 0), 0.8));          // la lumière s'allume
  if (o.dim) night = E.inOut(pr(n, at(o.dim[0], 0), Math.max(0.4, at(o.dim[1], 1) - at(o.dim[0], 0))));
  if (night > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = mix('#FFFFFF', '#2E3874', night); ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = night; glowDot(ctx, W * 0.5, H * 0.08, 380, '#3D8BFF', 0.18);
    if (o.lamp) glowDot(ctx, W * 0.2, H * 0.3, 260, '#FFC870', 0.35);
    for (let k = 0; k < 5; k++) circle(ctx, W * (0.12 + k * 0.19), H * 0.9, 3, k % 2 ? '#7BE3C6' : '#79D8FF');
    ctx.restore();
  }
  let alarm = o.light === 'alarm' ? 1 : 0;
  if (o.alarmAt !== undefined) alarm = pr(n, at(o.alarmAt, 0), 0.2) > 0 ? 1 : 0;
  if (alarm) {
    const p = 0.5 + 0.5 * Math.sin(t * TAU * 0.9);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = mix('#FFFFFF', '#E8737B', 0.55 + 0.25 * p); ctx.fillRect(0, 0, W, H); ctx.restore();
    glowDot(ctx, W * 0.5, H * 0.04, 300, '#FF4A4A', 0.25 + 0.35 * p);
    glowDot(ctx, W * 0.08, H * 0.2, 160, '#FF4A4A', 0.2 * p); glowDot(ctx, W * 0.92, H * 0.2, 160, '#FF4A4A', 0.2 * p);
  }
  let smoke = o.light === 'smoke' ? 1 : 0;
  if (o.smoke !== undefined) smoke = E.inOut(pr(n, at(o.smoke, 0), 3));
  if (smoke > 0) {
    ctx.save(); ctx.globalAlpha = smoke;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(70,64,70,0.62)'); g.addColorStop(0.6, 'rgba(90,84,90,0.35)'); g.addColorStop(1, 'rgba(90,84,90,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r0 = rng(99);
    for (let k = 0; k < 14; k++) { const x = (r0() * W * 1.4 + t * (20 + r0() * 30)) % (W * 1.4) - W * 0.2, y = r0() * H * 0.9; glowDot(ctx, x, y + Math.sin(t * 0.7 + k) * 20, 140 + r0() * 120, '#5E5860', 0.35); }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- la coupole : sept hublots ouverts sur la Terre
export function cupola(ctx, t, o = {}) {
  spaceBg(ctx, t);
  earth(ctx, W * 0.5, H * 0.5 + 1050, 1180, t, { spin: 0.006 });
  const cx = W / 2, cy = H * 0.4, r0 = 190, r1 = 222, r2 = 430;
  // cadre : tout sauf les hublots
  ctx.save(); ctx.beginPath(); ctx.rect(-50, -50, W + 100, H + 100);
  ctx.moveTo(cx + r0, cy); ctx.arc(cx, cy, r0, 0, TAU, true);
  for (let k = 0; k < 6; k++) {
    const a0 = k / 6 * TAU - PI / 2 + 0.07, a1 = (k + 1) / 6 * TAU - PI / 2 - 0.07;
    const p = [[cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1], [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1], [cx + Math.cos(a1) * r2, cy + Math.sin(a1) * r2], [cx + Math.cos(a0) * r2, cy + Math.sin(a0) * r2]];
    ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[3][0], p[3][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.closePath();
  }
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, W * 0.75); g.addColorStop(0, '#465073'); g.addColorStop(0.45, '#2C3454'); g.addColorStop(1, '#161B33');
  ctx.fillStyle = g; ctx.fill('evenodd');
  ctx.restore();
  // reflets sur les vitres
  ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(cx - 120, cy - 200); ctx.lineTo(cx - 60, cy - 200); ctx.lineTo(cx - 200, cy + 200); ctx.lineTo(cx - 260, cy + 200); ctx.closePath(); ctx.fill(); ctx.restore();
  // rivets
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; circle(ctx, cx + Math.cos(a) * 206, cy + Math.sin(a) * 206, 2.4, 'rgba(255,255,255,0.25)'); }
  // poignées dorées
  ctx.strokeStyle = '#E6B04B'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(90, 560); ctx.lineTo(90, 700); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W - 90, 560); ctx.lineTo(W - 90, 700); ctx.stroke();
}

// ---------------------------------------------------------------- orbite : limbe de la Terre et station qui passe
export function orbit(ctx, t, o = {}) {
  spaceBg(ctx, t);
  earth(ctx, W * 0.42, H + 980, 1400, t, { spin: 0.01 });
  if (o.iss) { const x = W * 0.46 + t * 9; iss(ctx, x, H * 0.17, 0.16, t, { soyuz: true }); }
}

// ---------------------------------------------------------------- espace profond (pour les schémas Terre, Mars, Soleil)
export function space(ctx, t) { spaceBg(ctx, t); }

// ---------------------------------------------------------------- fond uni, très légèrement texturé
export function flat(ctx, t, o = {}) {
  const [a, b] = TONES[o.tone] || TONES.blue;
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(-W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
  // grandes formes douces qui dérivent lentement
  glowDot(ctx, W * (0.2 + 0.03 * Math.sin(t * 0.2)), H * 0.25, 520, '#FFFFFF', 0.05);
  glowDot(ctx, W * (0.85 + 0.03 * Math.cos(t * 0.17)), H * 0.85, 460, '#000000', 0.18);
  // trame de points
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let y = 24; y < H; y += 36) for (let x = 24 + ((y / 36) % 2) * 18; x < W; x += 36) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); }
}

// ---------------------------------------------------------------- sur Terre : ciel, collines, sol (Dakar, un baobab)
export function earthGround(ctx, t, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.8);
  if (o.dusk) { g.addColorStop(0, '#5C6FD6'); g.addColorStop(0.55, '#F7A86B'); g.addColorStop(1, '#FFD8A3'); }
  else { g.addColorStop(0, '#6FC3FF'); g.addColorStop(1, '#D9F1FF'); }
  ctx.fillStyle = g; ctx.fillRect(-W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
  glowDot(ctx, W * 0.8, H * (o.dusk ? 0.58 : 0.18), 200, '#FFF3C4', 0.9); circle(ctx, W * 0.8, H * (o.dusk ? 0.58 : 0.18), 46, '#FFF6D6');
  const scroll = t * (o.speed ?? 70);
  // nuages
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let k = 0; k < 5; k++) { const x = ((k * 330 - scroll * 0.15) % (W + 300) + W + 300) % (W + 300) - 150, y = 90 + (k % 3) * 55; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + i * 40, y - (i === 1 ? 14 : 0), 46, 22, 0, 0, TAU); ctx.fill(); } }
  // collines lointaines
  ctx.fillStyle = o.dusk ? '#C77E5E' : '#9CC98B';
  ctx.beginPath(); ctx.moveTo(-50, H * 0.74); for (let x = -50; x <= W + 50; x += 20) ctx.lineTo(x, H * 0.7 - 30 * Math.sin((x + scroll * 0.3) / 160) - 18 * Math.sin((x + scroll * 0.3) / 67)); ctx.lineTo(W + 50, H); ctx.lineTo(-50, H); ctx.closePath(); ctx.fill();
  // baobab
  const bx = ((900 - scroll * 0.6) % (W + 400) + W + 400) % (W + 400) - 200, by = H * 0.76;
  ctx.fillStyle = o.dusk ? '#6E4636' : '#7A5A44'; ctx.beginPath(); ctx.moveTo(bx - 26, by); ctx.quadraticCurveTo(bx - 20, by - 110, bx - 38, by - 150); ctx.lineTo(bx + 38, by - 150); ctx.quadraticCurveTo(bx + 20, by - 110, bx + 26, by); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 10; ctx.lineCap = 'round';
  for (const [dx, dy] of [[-80, -200], [-30, -215], [30, -212], [85, -195]]) { ctx.beginPath(); ctx.moveTo(bx + dx * 0.3, by - 150); ctx.quadraticCurveTo(bx + dx * 0.6, by - 175, bx + dx, by + dy); ctx.stroke(); }
  ctx.fillStyle = o.dusk ? '#4F7A45' : '#5E9E52'; for (const [dx, dy] of [[-80, -205], [-30, -222], [30, -218], [85, -200]]) { ctx.beginPath(); ctx.ellipse(bx + dx, by + dy, 34, 18, 0, 0, TAU); ctx.fill(); }
  // sol
  const gg = ctx.createLinearGradient(0, H * 0.76, 0, H); gg.addColorStop(0, o.dusk ? '#E2B983' : '#EBD4A2'); gg.addColorStop(1, o.dusk ? '#C99A66' : '#D9BC85');
  ctx.fillStyle = gg; ctx.fillRect(-W * 0.2, H * 0.76, W * 1.4, H * 0.5);
  ctx.fillStyle = 'rgba(150,110,60,0.35)';
  for (let k = 0; k < 16; k++) { const x = ((k * 97 - scroll) % (W + 100) + W + 100) % (W + 100) - 50; ctx.beginPath(); ctx.ellipse(x, H * 0.8 + (k % 4) * 30, 16, 4, 0, 0, TAU); ctx.fill(); }
}

// ---------------------------------------------------------------- dehors : la station en grand, l'espace et la Terre
export function outside(ctx, t, o = {}, tm) {
  spaceBg(ctx, t);
  earth(ctx, W * 0.5, H + 1150, 1400, t, { spin: 0.012 });
  let x = W / 2, y = H * 0.38, s = 0.62;
  const n = tm ? tm.n : t;
  if (o.focus === 'soyuz') { const k = o.zoomAt !== undefined && tm ? E.inOut(pr(n, tm.at(o.zoomAt), 1.6)) : 0; s = lerp(1.25, 3.2, k); x = W / 2; y = H * 0.36 - lerp(300, 300, k) * s + lerp(0, 0, k); }
  else if (o.focus === 'radiators') { s = 1.3; x = W * 0.5; y = H * 0.24; }
  else if (o.focus === 'station') { s = 0.6; x = W * 0.48; y = H * 0.42; }
  if (o.focus === 'eva') evaHull(ctx, t);
  else iss(ctx, x, y, s, t, { flow: o.flow, soyuz: true });
  if (o.focus === 'soyuz') {
    // le petit trou et l'air qui s'échappe
    const hx = x + 18 * s, hy = y + 300 * s + 2 * s;
    const k = o.zoomAt !== undefined && tm ? E.out(pr(n, tm.at(o.zoomAt) + 1.2, 0.6)) : 0;
    if (k > 0) {
      ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = C.signal; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx, hy, 34 + 4 * Math.sin(t * 5), 0, TAU); ctx.stroke();
      circle(ctx, hx, hy, 3.5, '#1A1A22');
      for (let i = 0; i < 6; i++) { const q = (t * 0.9 + i / 6) % 1; ctx.globalAlpha = k * (1 - q) * 0.7; circle(ctx, hx + q * 80, hy - q * 30 + Math.sin(i * 2 + t * 3) * 6, 4 + q * 10, '#DDE7F5'); }
      ctx.restore();
    }
  }
  if (o.particles) {
    // protons : traits dorés venus du Soleil (en haut à gauche) qui traversent la station
    const r0 = rng(3);
    for (let i = 0; i < 46; i++) { const sp = 900 + r0() * 500, ph = r0(), yy = r0() * H * 1.2 - H * 0.2; const q = ((t * sp / 1400) + ph) % 1; const px = -200 + q * (W + 400), py = yy + q * 260; line(ctx, px, py, px - 60, py - 11, 2.5, hexA('#FFD27A', 0.85)); circle(ctx, px, py, 2.6, '#FFF1C9'); }
  }
}

// gros plan d'un module vu de l'extérieur : la coque, les mains courantes, le câble de sécurité
function evaHull(ctx, t) {
  const g = ctx.createLinearGradient(0, -40, 0, 250); g.addColorStop(0, '#F4F6FA'); g.addColorStop(0.55, '#D9DFE8'); g.addColorStop(1, '#9EA8B9');
  ctx.save(); ctx.translate(0, Math.sin(t * 0.3) * 4);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-60, -40); ctx.lineTo(W + 60, -40); ctx.lineTo(W + 60, 190); ctx.quadraticCurveTo(W * 0.5, 250, -60, 200); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(80,90,110,0.25)'; ctx.lineWidth = 3; for (let x = 60; x < W; x += 150) { ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x - 12, 215); ctx.stroke(); }
  for (let k = 0; k < 6; k++) { const x = 110 + k * 210; ctx.strokeStyle = '#E6B04B'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, 196); ctx.lineTo(x + 18, 232); ctx.lineTo(x + 108, 232); ctx.lineTo(x + 126, 200); ctx.stroke(); }
  ctx.fillStyle = '#C9D0DC'; ctx.beginPath(); ctx.ellipse(W * 0.7, 120, 54, 36, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#3A4256'; ctx.beginPath(); ctx.ellipse(W * 0.7, 120, 38, 24, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // câble de sécurité qui part de la coque
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W * 0.62, 228); ctx.bezierCurveTo(W * 0.62, 320, W * 0.72, 300, W * 0.7, 330 + Math.sin(t * 0.8) * 8); ctx.stroke();
}
