// Vignettes des films, dans l'esprit des vignettes de vidéos : un personnage en grand, trois ou quatre mots.
// Écrit out/<id>.thumb.jpg (1280 x 720, affiche du lecteur) et out/<id>.card.jpg (640 x 360, grille).
// usage : node thumbs.mjs [id ...]
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import { STORY, ORDER } from './story.mjs';
import { W, H, C, R, font, fr, wrap, rr, glowDot, hexA } from './engine/base.mjs';
import * as S from './engine/scenes.mjs';
import { D } from './engine/diagrams.mjs';
import { PROPS } from './engine/actors.mjs';

const TONE = { blue: ['#3D7BFF', '#1A2A8F'], orange: ['#FF9248', '#B23F1C'], teal: ['#1FC2A3', '#0A5C67'], violet: ['#9A6BFF', '#3B1F94'], red: ['#FF5D63', '#8E1A2C'], night: ['#4553C9', '#111653'], gold: ['#FFC14D', '#B5601A'] };

function thumb(id) {
  const F = STORY[id], T = F.thumb, cv = createCanvas(W, H), ctx = cv.getContext('2d');
  const t = 1.35, tm = { t, n: 9, lead: 0.5, dur: 9, at: () => 0 };
  // décor, puis un voile de couleur franc à gauche
  if (T.bg === 'module') S.moduleScene(ctx, t, { light: T.light || (T.tone === 'night' ? 'night' : 'day'), variant: 'node' }, tm);
  else if (T.bg === 'cupola') S.cupola(ctx, t, {});
  else if (T.bg === 'outside') S.outside(ctx, t, { focus: 'eva' }, tm);
  else S.space(ctx, t);
  const [a, b] = TONE[T.tone] || TONE.blue;
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, hexA(a, 0.96)); g.addColorStop(0.5, hexA(b, 0.82)); g.addColorStop(1, hexA(b, 0.25));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glowDot(ctx, W * 0.74, H * 0.5, 420, '#FFFFFF', 0.22);
  // élément de décor (schéma) derrière le personnage
  if (T.d === 'bone') D.bone(ctx, { x: 0.8, y: 0.42, s: 0.9 }, tm, 1, 0.3);
  if (T.d === 'gauge') D.gauge(ctx, { x: 0.82, y: 0.36, s: 0.75, drop: [0, 1] }, Object.assign({}, tm, { n: 0.6, at: s => s }), 1, 3);
  if (T.bg === 'sun') D.sun(ctx, { x: 0.86, y: 0.3, s: 1.2 }, tm, 1, 3);
  // le personnage, en grand
  if (T.d === 'heart') D.heart(ctx, { x: 0.86, y: 0.34, bpm: 60, noEcg: true }, Object.assign({}, tm, { t: 0.2 }), 1, 3);
  if (T.ex) { ctx.save(); ctx.translate(W * 0.46, H * 0.04); R.drawExercise(ctx, T.ex, 0.9, W * 0.52, H * 0.98, { who: T.who, hl: T.hl }); ctx.restore(); }
  else {
    const pose = R.P[T.pose](t, {});
    const front = pose.view === 'front';
    const prop = T.item ? PROPS[T.item] : null;
    ctx.save();
    const gl = T.pose === 'glide';
    R.draw(ctx, pose, { who: T.who, s: H * 0.9, x: W * (gl ? 0.7 : 0.76), y: H * (gl ? 0.52 : 0.645), t, suit: T.suit, rot: gl ? -0.35 : 0, headK: 1.05,
      itemFront: prop ? (c, j) => prop(c, j, t, front, { spraying: true }) : null });
    ctx.restore();
    const j = R.solve(pose), hx = W * 0.76 + j.H[0] * H * 0.9, hy = H * 0.645 + j.H[1] * H * 0.9;
    if (T.fx === 'stars') R.fx.stars(ctx, hx, hy - 120, H * 1.4, 0.4);
    if (T.fx === 'pain') R.fx.pain(ctx, W * 0.76 - 80, H * 0.52, H * 1.6, 0.2);
    if (T.fx === 'zzz') R.fx.zzz(ctx, hx + 90, hy - 60, H * 1.3, 0.6);
    if (T.fx === 'fire') D.fire(ctx, { x: 0.93, y: 0.62, s: 1.1 }, tm, 1, 2);
  }
  // le texte : deux lignes au plus, très lisible même en petit
  ctx.font = font(800, 118);
  const lines = wrap(ctx, T.text, 620);
  const size = lines.length > 2 ? 96 : 118;
  ctx.font = font(800, size);
  const L2 = wrap(ctx, T.text, 640);
  const y0 = H * 0.5 - (L2.length * size * 1.02) / 2 + size * 0.82;
  L2.forEach((l, i) => {
    ctx.save(); ctx.shadowColor = 'rgba(5,8,30,0.55)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#FFFFFF'; ctx.fillText(l, 70, y0 + i * size * 1.02); ctx.restore();
  });
  // trait de couleur sous le texte (catégorie)
  ctx.fillStyle = F.cat === 'securite' ? C.signal : C.ok; rr(ctx, 72, y0 + (L2.length - 1) * size * 1.02 + 34, 120, 14, 7); ctx.fill();
  return cv;
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ORDER;
fs.mkdirSync('out', { recursive: true });
for (const id of ids) {
  const cv = thumb(id);
  fs.writeFileSync(`out/${id}.thumb.jpg`, cv.toBuffer('image/jpeg', 86));
  const sm = createCanvas(640, 360), x = sm.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cv, 0, 0, 640, 360);
  fs.writeFileSync(`out/${id}.card.jpg`, sm.toBuffer('image/jpeg', 84));
}
console.log(ids.length, 'vignettes');
