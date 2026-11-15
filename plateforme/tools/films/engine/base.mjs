// Outils de dessin communs aux films : palette, courbes d'animation, texte, formes, pictogrammes.
import { R } from '../lib.mjs';
export { R };

export const W = 1280, H = 720, FPS = 30;
export const PI = Math.PI, TAU = Math.PI * 2;

// palette d'AURA (mêmes valeurs que la plateforme)
export const C = {
  night: '#0C1230', night2: '#141C45', hull: '#182050',
  ink: '#F2F4FF', ink2: '#B9C0E3', ink3: '#8C95C2',
  atmo: '#79D8FF', atmo2: '#3D8BFF', sophie: '#B3A6FF', sophie2: '#7A66F0',
  gold: '#FFC870', gold2: '#FF9F45', ok: '#7BE3C6', warn: '#FFB65C', signal: '#FF6F6F', coral: '#FF6B5A',
  water: '#4FB3FF', bone: '#F3E9D2', paper: '#F5F7FC', dark: '#1B2142'
};
// teintes des fonds unis (haut, bas)
export const TONES = {
  blue: ['#1C2C6B', '#0C1435'], teal: ['#0F4A57', '#0A1E2E'], violet: ['#33246E', '#130F36'],
  orange: ['#5A3018', '#1E1214'], red: ['#5C1B26', '#1D0A12'], night: ['#151B48', '#070A1E'], gold: ['#5A4212', '#1C1408']
};
export const CAT = {
  prevention: { label: 'Prévention', col: C.ok, deep: '#0F4A57' },
  securite: { label: 'Sécurité', col: C.signal, deep: '#5C1B26' }
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const E = {
  out: t => 1 - Math.pow(1 - clamp(t, 0, 1), 3),
  in: t => Math.pow(clamp(t, 0, 1), 3),
  inOut: t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  back: t => { t = clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  smooth: t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
};
// progression de 0 à 1 entre a et a + d
export const pr = (t, a, d) => clamp((t - a) / (d || 1e-6), 0, 1);

// générateur pseudo-aléatoire reproductible
export function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

export const font = (w, px) => `${w} ${Math.round(px)}px Atkinson`;

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function circle(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill(); }
export function line(ctx, x1, y1, x2, y2, w, col, cap = 'round') { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = cap; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
export function poly(ctx, pts, col) { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); }
// couleurs : accepte '#RRGGBB' ou 'rgb(r,g,b)'
export function rgb(c) {
  if (Array.isArray(c)) return c;
  if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
}
const toS = a => `rgb(${a.map(v => Math.round(clamp(v, 0, 255))).join(',')})`;
export function mixC(a, b, t) { const p = rgb(a), q = rgb(b); return toS(p.map((v, i) => v + (q[i] - v) * t)); }
export function shadeC(c, k) { const p = rgb(c); return toS(p.map(v => k < 1 ? v * k : v + (255 - v) * (k - 1))); }
export function hexA(c, a) { const p = rgb(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }
export function glowDot(ctx, x, y, r, col, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// typographie française : espaces insécables avant : ; ? ! et à l'intérieur des guillemets
export function fr(s) { return String(s).replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« '); }
export function wrap(ctx, text, maxW) {
  const words = fr(text).split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
// texte sur plusieurs lignes ; renvoie la hauteur occupée
export function text(ctx, s, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font || font(700, 32); ctx.fillStyle = o.color || C.ink; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const px = parseInt(ctx.font.match(/(\d+)px/)[1], 10), lh = px * (o.lh || 1.18);
  const lines = o.maxW ? wrap(ctx, s, o.maxW) : [fr(s)];
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = px * 0.35; ctx.shadowOffsetY = px * 0.06; }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  ctx.restore();
  return lines.length * lh;
}

// ---------------------------------------------------------------- pictogrammes (grille de 24, trait de 2)
// dessinés au trait, comme une famille d'icônes d'interface ; s = taille en pixels
export function icon(ctx, name, x, y, s, col, lw) {
  ctx.save(); ctx.translate(x - s / 2, y - s / 2); ctx.scale(s / 24, s / 24);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw || 2.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const P = (d) => { ctx.beginPath(); d(); ctx.stroke(); };
  const F = (d) => { ctx.beginPath(); d(); ctx.fill(); };
  const arc = (cx, cy, r, a0 = 0, a1 = TAU) => ctx.arc(cx, cy, r, a0, a1);
  const L = (...p) => { ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); };
  const slash = () => P(() => L(4, 4, 20, 20));
  switch (name) {
    case 'head': P(() => arc(12, 12, 5.5)); P(() => arc(12, 12, 9.5, PI * 1.15, PI * 1.75)); P(() => L(17.5, 3.6, 18.2, 6.6, 15.2, 6.9)); break;
    case 'up': P(() => L(12, 20, 12, 4)); P(() => L(6, 10, 12, 4, 18, 10)); P(() => L(4, 21, 20, 21)); break;
    case 'food': P(() => arc(13, 13, 7)); P(() => arc(13, 13, 3.2)); P(() => L(3, 4, 3, 20)); P(() => L(1.5, 4, 1.5, 8.5, 4.5, 8.5, 4.5, 4)); break;
    case 'drop': P(() => { ctx.moveTo(12, 3); ctx.bezierCurveTo(16, 9, 19, 12, 19, 15); ctx.arc(12, 15, 7, 0, PI); ctx.bezierCurveTo(5, 12, 8, 9, 12, 3); }); break;
    case 'pill': ctx.save(); ctx.translate(12, 12); ctx.rotate(-PI / 4); P(() => { rr(ctx, -9, -4, 18, 8, 4); }); P(() => L(0, -4, 0, 4)); ctx.restore(); break;
    case 'sun': P(() => arc(12, 12, 4.2)); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; P(() => L(12 + Math.cos(a) * 7, 12 + Math.sin(a) * 7, 12 + Math.cos(a) * 9.8, 12 + Math.sin(a) * 9.8)); } break;
    case 'salt': P(() => { ctx.moveTo(8, 9); ctx.lineTo(16, 9); ctx.lineTo(17, 21); ctx.lineTo(7, 21); ctx.closePath(); }); P(() => { rr(ctx, 8.5, 4, 7, 5, 2); }); F(() => arc(11, 6.5, 0.8)); F(() => arc(13.5, 6.5, 0.8)); slash(); break;
    case 'bed': P(() => L(3, 6, 3, 19)); P(() => L(3, 15, 21, 15, 21, 19)); P(() => { rr(ctx, 9, 9, 12, 6, 2.5); }); P(() => arc(6.3, 11.8, 1.9)); break;
    case 'dumbbell': P(() => L(7, 12, 17, 12)); P(() => { rr(ctx, 3.5, 7, 3.5, 10, 1.2); }); P(() => { rr(ctx, 17, 7, 3.5, 10, 1.2); }); P(() => L(2, 10, 2, 14)); P(() => L(22, 10, 22, 14)); break;
    case 'clock': P(() => arc(12, 12, 9)); P(() => L(12, 7, 12, 12, 15.5, 14)); break;
    case 'calendar': P(() => { rr(ctx, 3.5, 5, 17, 15, 3); }); P(() => L(3.5, 10, 20.5, 10)); P(() => L(8, 3, 8, 7)); P(() => L(16, 3, 16, 7)); F(() => arc(8.5, 14.5, 1.2)); F(() => arc(12, 14.5, 1.2)); F(() => arc(15.5, 14.5, 1.2)); break;
    case 'coffee': case 'nocoffee': P(() => { ctx.moveTo(5, 9); ctx.lineTo(16, 9); ctx.lineTo(15, 19); ctx.quadraticCurveTo(14.6, 20.5, 13, 20.5); ctx.lineTo(8, 20.5); ctx.quadraticCurveTo(6.4, 20.5, 6, 19); ctx.closePath(); }); P(() => arc(17.5, 13, 2.6, -PI / 2, PI / 2)); P(() => L(9, 3.5, 9, 6)); P(() => L(12, 3.5, 12, 6)); if (name === 'nocoffee') slash(); break;
    case 'moon': P(() => { ctx.moveTo(15, 3.5); ctx.arc(12, 12, 8.5, -1.2, PI * 0.95 + 1.2, false); ctx.quadraticCurveTo(10, 18, 9.5, 11); ctx.quadraticCurveTo(10, 5, 15, 3.5); }); break;
    case 'mask': P(() => { ctx.moveTo(2.5, 10); ctx.quadraticCurveTo(12, 5, 21.5, 10); ctx.quadraticCurveTo(21, 16, 16, 16); ctx.quadraticCurveTo(13, 16, 12, 13.5); ctx.quadraticCurveTo(11, 16, 8, 16); ctx.quadraticCurveTo(3, 16, 2.5, 10); }); break;
    case 'ear': P(() => { ctx.moveTo(7, 9); ctx.bezierCurveTo(7, 3, 17, 3, 17, 9.5); ctx.bezierCurveTo(17, 13, 13, 13.5, 13, 17); ctx.bezierCurveTo(13, 20.5, 8.5, 21, 8, 18); }); P(() => { ctx.moveTo(10.5, 9.5); ctx.bezierCurveTo(10.5, 6.8, 14, 6.8, 14, 9.5); }); F(() => arc(18.5, 17.5, 2.6)); break;
    case 'chart': P(() => L(4, 20, 20, 20)); P(() => L(7, 16, 7, 12)); P(() => L(12, 16, 12, 7)); P(() => L(17, 16, 17, 10)); break;
    case 'heart': P(() => { ctx.moveTo(12, 20); ctx.bezierCurveTo(4, 14, 2.5, 10, 4.5, 7); ctx.bezierCurveTo(6.5, 4, 10.5, 4.5, 12, 8); ctx.bezierCurveTo(13.5, 4.5, 17.5, 4, 19.5, 7); ctx.bezierCurveTo(21.5, 10, 20, 14, 12, 20); }); break;
    case 'chat': P(() => { ctx.moveTo(5, 4.5); ctx.lineTo(19, 4.5); ctx.quadraticCurveTo(21, 4.5, 21, 6.5); ctx.lineTo(21, 14); ctx.quadraticCurveTo(21, 16, 19, 16); ctx.lineTo(10, 16); ctx.lineTo(5.5, 20); ctx.lineTo(6, 16); ctx.lineTo(5, 16); ctx.quadraticCurveTo(3, 16, 3, 14); ctx.lineTo(3, 6.5); ctx.quadraticCurveTo(3, 4.5, 5, 4.5); }); break;
    case 'people': P(() => arc(9, 8, 3.4)); P(() => { ctx.moveTo(2.5, 20); ctx.quadraticCurveTo(3, 13.5, 9, 13.5); ctx.quadraticCurveTo(15, 13.5, 15.5, 20); }); P(() => arc(17, 8.5, 2.7)); P(() => { ctx.moveTo(17.5, 13.5); ctx.quadraticCurveTo(21.5, 14, 21.7, 19); }); break;
    case 'alarm': P(() => { ctx.moveTo(6, 17); ctx.lineTo(6, 11); ctx.arc(12, 11, 6, PI, 0); ctx.lineTo(18, 17); }); P(() => L(4, 17, 20, 17)); P(() => L(10, 20.5, 14, 20.5)); P(() => L(12, 2.5, 12, 4)); P(() => L(4, 5, 5, 6)); P(() => L(20, 5, 19, 6)); break;
    case 'fire': P(() => { ctx.moveTo(12, 21); ctx.bezierCurveTo(5.5, 21, 4.5, 14.5, 7.5, 10.5); ctx.bezierCurveTo(8, 13, 9.5, 13.5, 10, 13); ctx.bezierCurveTo(9, 8, 11, 5, 14, 3); ctx.bezierCurveTo(14, 7, 19.5, 9.5, 19, 14.5); ctx.bezierCurveTo(18.6, 18.5, 15.5, 21, 12, 21); }); break;
    case 'check': P(() => L(4.5, 12.5, 9.5, 17.5, 19.5, 6.5)); break;
    case 'warn': P(() => { ctx.moveTo(12, 3.5); ctx.lineTo(21.5, 20); ctx.lineTo(2.5, 20); ctx.closePath(); }); P(() => L(12, 9.5, 12, 14)); F(() => arc(12, 17.2, 1.2)); break;
    case 'glasses': P(() => arc(7, 14, 4)); P(() => arc(17, 14, 4)); P(() => { ctx.moveTo(11, 13.5); ctx.quadraticCurveTo(12, 12.2, 13, 13.5); }); P(() => L(3, 13, 2, 9)); P(() => L(21, 13, 22, 9)); break;
    case 'eye': P(() => { ctx.moveTo(2, 12); ctx.quadraticCurveTo(12, 3, 22, 12); ctx.quadraticCurveTo(12, 21, 2, 12); }); P(() => arc(12, 12, 3.5)); break;
    case 'play': P(() => { ctx.moveTo(8, 5); ctx.lineTo(19, 12); ctx.lineTo(8, 19); ctx.closePath(); }); break;
    case 'mask2': P(() => { ctx.moveTo(6, 9); ctx.quadraticCurveTo(12, 5, 18, 9); ctx.lineTo(17, 16); ctx.quadraticCurveTo(12, 21, 7, 16); ctx.closePath(); }); P(() => L(3, 7, 6, 9)); P(() => L(21, 7, 18, 9)); P(() => L(10, 13, 14, 13)); break;
    case 'gauge': P(() => arc(12, 14, 9, PI, 0)); P(() => L(12, 14, 7.5, 9)); P(() => L(3, 14, 21, 14)); break;
    case 'joint': P(() => arc(12, 12, 3.5)); P(() => L(9.5, 9.5, 4, 4)); P(() => L(14.5, 14.5, 20, 20)); P(() => L(17, 4.5, 19.5, 7)); P(() => L(19.5, 3.5, 20.5, 4.5)); break;
    case 'itch': P(() => { ctx.moveTo(4, 8); ctx.quadraticCurveTo(8, 4, 12, 8); ctx.quadraticCurveTo(16, 12, 20, 8); }); P(() => { ctx.moveTo(4, 14); ctx.quadraticCurveTo(8, 10, 12, 14); ctx.quadraticCurveTo(16, 18, 20, 14); }); P(() => L(6, 19, 8, 21)); P(() => L(11, 19, 13, 21)); P(() => L(16, 19, 18, 21)); break;
    case 'tingle': P(() => L(13, 2.5, 7, 13, 12, 13, 10, 21.5, 17.5, 9.5, 12, 9.5, 13, 2.5)); break;
    case 'tired': P(() => { rr(ctx, 2.5, 7.5, 16, 9, 2.2); }); P(() => L(21, 10.5, 21, 13.5)); F(() => { rr(ctx, 5, 10, 3.5, 4, 1); }); break;
    case 'shield': P(() => { ctx.moveTo(12, 2.5); ctx.lineTo(20, 5.5); ctx.lineTo(20, 11); ctx.quadraticCurveTo(20, 18, 12, 21.5); ctx.quadraticCurveTo(4, 18, 4, 11); ctx.lineTo(4, 5.5); ctx.closePath(); }); break;
    case 'bolt': P(() => L(13, 2.5, 6, 13.5, 11.5, 13.5, 10, 21.5, 18, 10, 12.5, 10, 13, 2.5)); break;
    default: P(() => arc(12, 12, 8));
  }
  ctx.restore();
}

// pastille ronde avec pictogramme
export function badge(ctx, name, x, y, r, bg, fg) { circle(ctx, x, y, r, bg); icon(ctx, name, x, y, r * 1.12, fg, 2.2); }
