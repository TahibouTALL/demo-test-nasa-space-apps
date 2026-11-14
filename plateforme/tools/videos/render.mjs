// Montage des vidéos AURA : images 3D, schémas animés, voix, musique, sous-titres.
// usage : node render.mjs <id> [--preview t1,t2,...]   (aperçu : images PNG aux instants donnés)
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { VIDEOS, SOURCES } from './scripts.mjs';
import { DIAGRAMS } from './diagrams.mjs';

const W = 1280, H = 720, FPS = 30, XF = 0.55;
for (const w of [400, 500, 700, 800]) GlobalFonts.registerFromPath(`fonts/atkinson-${w}.ttf`, 'Atk' + w);
export const F = (w, px) => `${px}px Atk${w}`;
const CAT = {
  prevention: { accent: '#7FE7FF', soft: 'rgba(127,231,255,', label: 'Prévention' },
  securite: { accent: '#FFB45C', soft: 'rgba(255,180,92,', label: 'Sécurité' }
};
const INK = '#F4F6FA', INK2 = '#C3CCDA', INK3 = '#8C97AA';

const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const easeOut = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const appear = (t, t0, d = 0.5) => easeOut((t - t0) / d);

// ---------------------------------------------------------------- texte
export function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
export function text(ctx, s, x, y, { font, color = INK, maxW = 1e9, lh = 1.2, align = 'left', alpha = 1, base = 'alphabetic' } = {}) {
  ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.globalAlpha *= alpha; ctx.textAlign = align; ctx.textBaseline = base;
  const px = parseFloat(font); const lines = wrap(ctx, s, maxW);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * px * lh));
  ctx.restore();
  return lines.length * px * lh;
}

// ---------------------------------------------------------------- images
const IMG = {}, BLUR = {};
async function img(key) {
  if (!IMG[key]) {
    const f = ['stills/' + key + '.jpg', 'stills/' + key + '.png'].find(p => fs.existsSync(p));
    IMG[key] = f ? await loadImage(f) : null;
  }
  return IMG[key];
}
function blurred(key) {
  if (BLUR[key]) return BLUR[key];
  const im = IMG[key]; const c = createCanvas(W, H); const x = c.getContext('2d');
  if (!im) { x.fillStyle = '#0b1020'; x.fillRect(0, 0, W, H); return (BLUR[key] = c); }
  // flou par réduction puis agrandissement, en plusieurs passes
  const s1 = createCanvas(160, 90), a = s1.getContext('2d'); a.imageSmoothingQuality = 'high'; a.drawImage(im, 0, 0, 160, 90);
  const s2 = createCanvas(40, 23), b2 = s2.getContext('2d'); b2.imageSmoothingQuality = 'high'; b2.drawImage(s1, 0, 0, 40, 23);
  x.imageSmoothingQuality = 'high'; x.drawImage(s2, 0, 0, W, H);
  x.fillStyle = 'rgba(6,9,18,0.62)'; x.fillRect(0, 0, W, H);
  return (BLUR[key] = c);
}
function cover(ctx, im, zoom = 1, px = 0, py = 0, alpha = 1) {
  if (!im) { ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H); return; }
  const s = Math.max(W / im.width, H / im.height) * zoom;
  const sw = W / s, sh = H / s;
  const sx = clamp((im.width - sw) / 2 + px * im.width, 0, im.width - sw), sy = clamp((im.height - sh) / 2 + py * im.height, 0, im.height - sh);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(im, sx, sy, sw, sh, 0, 0, W, H); ctx.restore();
}
function kenburns(ctx, im, move, p) {
  const e = 0.5 - 0.5 * Math.cos(Math.PI * clamp(p, 0, 1));
  const m = move || 'in';
  if (m === 'in') cover(ctx, im, 1.0 + 0.09 * e);
  else if (m === 'out') cover(ctx, im, 1.09 - 0.09 * e);
  else if (m === 'l') cover(ctx, im, 1.1, 0.03 - 0.06 * e, 0);
  else if (m === 'r') cover(ctx, im, 1.1, -0.03 + 0.06 * e, 0);
  else if (m === 'u') cover(ctx, im, 1.1, 0, 0.025 - 0.05 * e);
  else cover(ctx, im, 1.1, 0, -0.025 + 0.05 * e);
}

// ---------------------------------------------------------------- calques fixes (vignette, dégradés, grain)
const VIGN = (() => { const c = createCanvas(W, H), x = c.getContext('2d'); const g = x.createRadialGradient(W / 2, H * 0.46, H * 0.35, W / 2, H / 2, H * 0.98); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,4,10,0.55)'); x.fillStyle = g; x.fillRect(0, 0, W, H); return c; })();
const LOW = (() => { const c = createCanvas(W, H), x = c.getContext('2d'); const g = x.createLinearGradient(0, H * 0.5, 0, H); g.addColorStop(0, 'rgba(4,6,14,0)'); g.addColorStop(1, 'rgba(4,6,14,0.82)'); x.fillStyle = g; x.fillRect(0, 0, W, H); return c; })();
const TOP = (() => { const c = createCanvas(W, 150), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, 'rgba(4,6,14,0.55)'); g.addColorStop(1, 'rgba(4,6,14,0)'); x.fillStyle = g; x.fillRect(0, 0, W, 150); return c; })();
const LEFT = (() => { const c = createCanvas(W, H), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, W * 0.75, 0); g.addColorStop(0, 'rgba(4,6,14,0.86)'); g.addColorStop(0.55, 'rgba(4,6,14,0.45)'); g.addColorStop(1, 'rgba(4,6,14,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); return c; })();
const GRAIN = (() => { const c = createCanvas(256, 256), x = c.getContext('2d'); const d = x.createImageData(256, 256); let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() - 0.5) * 70; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 14; } x.putImageData(d, 0, 0); return c; })();
function grain(ctx, f) { const ox = (f * 73) % 256, oy = (f * 151) % 256; ctx.save(); ctx.globalCompositeOperation = 'overlay'; for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(GRAIN, x, y); ctx.restore(); }

function mark(ctx, V, a = 1, big = false) {
  // marque AURA en haut à gauche
  ctx.save(); ctx.globalAlpha *= a;
  const x = 48, y = big ? 64 : 52;
  ctx.fillStyle = V.C.accent; ctx.beginPath(); ctx.arc(x + 5, y - 7, 5, 0, Math.PI * 2); ctx.fill();
  text(ctx, 'AURA', x + 18, y, { font: F(800, big ? 24 : 19), color: INK, alpha: 0.92 });
  if (!big) text(ctx, V.title, x + 86, y, { font: F(500, 17), color: INK2, alpha: 0.75 });
  ctx.restore();
}
function sourceLine(ctx, s, a) { if (s) text(ctx, 'Source : ' + s, 48, H - 34, { font: F(400, 16), color: INK3, alpha: a }); }

// ---------------------------------------------------------------- scènes
const SCENES = {
  open(ctx, sc, t, V) {
    kenburns(ctx, IMG[sc.v.img], 'in', t / sc.dur);
    ctx.drawImage(LEFT, 0, 0); ctx.drawImage(VIGN, 0, 0);
    mark(ctx, V, appear(t, 0.1, 0.8), true);
    const a1 = appear(t, 0.35, 0.7), a2 = appear(t, 0.7, 0.8);
    text(ctx, sc.v.kicker, 72, 330 - 10 * (1 - a1), { font: F(700, 24), color: V.C.accent, alpha: a1 });
    ctx.save(); ctx.globalAlpha = a2; ctx.fillStyle = V.C.accent; ctx.fillRect(72, 352, 64 * a2, 4); ctx.restore();
    text(ctx, sc.v.title, 70, 430 - 16 * (1 - a2), { font: F(800, 62), color: INK, alpha: a2, maxW: 760, lh: 1.08 });
    const a3 = appear(t, 1.3, 0.8);
    text(ctx, V.short, 72, 560, { font: F(400, 22), color: INK2, alpha: a3 * 0.95, maxW: 640, lh: 1.35 });
  },
  img(ctx, sc, t, V) {
    kenburns(ctx, IMG[sc.v.img], sc.v.move, t / sc.dur);
    ctx.drawImage(VIGN, 0, 0);
    ctx.drawImage(TOP, 0, 0);
    if (sc.v.cap) {
      ctx.drawImage(LOW, 0, 0);
      const a = appear(t, 0.45, 0.6);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = V.C.accent; ctx.fillRect(48, H - 118, 4, 46); ctx.restore();
      text(ctx, sc.v.cap, 66 - 10 * (1 - a), H - 84, { font: F(700, 32), color: INK, alpha: a, maxW: 980 });
    }
    mark(ctx, V, 0.9);
  },
  fact(ctx, sc, t, V) {
    const im = IMG[sc.v.img];
    cover(ctx, im, 1.06 + 0.04 * ease(t / sc.dur));
    ctx.drawImage(blurred(sc.v.img), 0, 0);
    ctx.drawImage(LEFT, 0, 0);
    const a1 = appear(t, 0.25, 0.7), a2 = appear(t, 0.65, 0.6), a3 = appear(t, 1.0, 0.6);
    ctx.save(); ctx.translate(72, 360); ctx.scale(0.96 + 0.04 * a1, 0.96 + 0.04 * a1);
    text(ctx, sc.v.big, 0, 0, { font: F(800, 148), color: V.C.accent, alpha: a1 });
    ctx.restore();
    text(ctx, sc.v.label, 76, 430, { font: F(500, 34), color: INK, alpha: a2, maxW: 760, lh: 1.25 });
    sourceLine(ctx, sc.v.src, a3);
    mark(ctx, V, 0.9);
  },
  chapter(ctx, sc, t, V) {
    cover(ctx, IMG[sc.v.img], 1.12 - 0.04 * ease(t / sc.dur));
    ctx.fillStyle = 'rgba(5,8,16,0.72)'; ctx.fillRect(0, 0, W, H);
    const a1 = appear(t, 0.15, 0.6), a2 = appear(t, 0.4, 0.7);
    text(ctx, 'Partie ' + sc.v.n, 72, 318, { font: F(700, 22), color: V.C.accent, alpha: a1 });
    ctx.save(); ctx.globalAlpha = a2; ctx.fillStyle = V.C.accent; ctx.fillRect(72, 340, 48 * a2, 3); ctx.restore();
    text(ctx, sc.v.title, 70, 410 - 14 * (1 - a2), { font: F(800, 58), color: INK, alpha: a2, maxW: 1000 });
    mark(ctx, V, 0.9);
  },
  steps(ctx, sc, t, V) {
    cover(ctx, IMG[sc.v.img], 1.05 + 0.03 * ease(t / sc.dur));
    ctx.drawImage(blurred(sc.v.img), 0, 0);
    ctx.drawImage(LEFT, 0, 0);
    const a0 = appear(t, 0.15, 0.6);
    text(ctx, sc.v.title, 72, 168, { font: F(800, 44), color: INK, alpha: a0, maxW: 1000 });
    ctx.save(); ctx.globalAlpha = a0; ctx.fillStyle = V.C.accent; ctx.fillRect(72, 190, 56, 3); ctx.restore();
    const n = sc.v.items.length, span = Math.max(1.2, sc.narr * 0.85);
    let y = 262;
    sc.v.items.forEach((it, k) => {
      const tk = sc.lead + (k / n) * span;
      const a = appear(t, tk, 0.55);
      ctx.save(); ctx.globalAlpha = a;
      ctx.strokeStyle = V.C.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(94, y - 11, 19, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      text(ctx, String(k + 1), 94, y - 2, { font: F(800, 21), color: V.C.accent, alpha: a, align: 'center' });
      const h = text(ctx, it, 134 + 14 * (1 - a), y, { font: F(500, 31), color: INK, alpha: a, maxW: 960, lh: 1.25 });
      y += Math.max(70, h + 30);
    });
    mark(ctx, V, 0.9);
  },
  bars(ctx, sc, t, V) {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a0f1e'); g.addColorStop(1, '#121b33'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const a0 = appear(t, 0.15, 0.6);
    text(ctx, sc.v.title, 72, 150, { font: F(800, 42), color: INK, alpha: a0 });
    const max = Math.max(...sc.v.data.map(d => d[1]));
    const x0 = 72, bw = 760, top = 230, gap = 118;
    sc.v.data.forEach(([lab, val], k) => {
      const tk = 0.6 + k * 0.35, a = appear(t, tk, 0.5), grow = easeOut((t - tk) / 1.1);
      const y = top + k * gap;
      text(ctx, lab, x0, y, { font: F(500, 27), color: INK2, alpha: a });
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(ctx, x0, y + 16, bw, 26, 13); ctx.fill();
      ctx.fillStyle = k === 0 ? V.C.accent : V.C.soft + '0.75)'; roundRect(ctx, x0, y + 16, Math.max(26, bw * (val / max) * grow), 26, 13); ctx.fill();
      ctx.restore();
      const shown = sc.v.unit === 'h' ? (val * grow).toFixed(1).replace('.', ',') + ' h' : Math.round(val * grow) + ' %';
      text(ctx, shown, x0 + bw + 28, y + 38, { font: F(800, 36), color: k === 0 ? V.C.accent : INK, alpha: a });
    });
    sourceLine(ctx, sc.v.src, appear(t, 1.4, 0.6));
    mark(ctx, V, 0.9);
  },
  diagram(ctx, sc, t, V) {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 50, W * 0.5, H * 0.5, W * 0.75); g.addColorStop(0, '#16213d'); g.addColorStop(1, '#070b16'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const d = DIAGRAMS[sc.v.d];
    if (d) d(ctx, t, sc.dur, V.C, { text, F, appear, ease, easeOut, W, H, INK, INK2, INK3, roundRect, lead: sc.lead, narr: sc.narr });
    mark(ctx, V, 0.9);
  },
  end(ctx, sc, t, V) {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a0f1e'); g.addColorStop(1, '#141d36'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    mark(ctx, V, appear(t, 0.1, 0.6), true);
    const a0 = appear(t, 0.2, 0.6);
    text(ctx, 'À retenir', 72, 170, { font: F(800, 50), color: INK, alpha: a0 });
    ctx.save(); ctx.globalAlpha = a0; ctx.fillStyle = V.C.accent; ctx.fillRect(72, 192, 56, 3); ctx.restore();
    let y = 262;
    const n = sc.v.items.length, span = Math.max(1.5, sc.narr * 0.8);
    sc.v.items.forEach((it, k) => {
      const a = appear(t, sc.lead + (k / n) * span, 0.55);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = V.C.accent; ctx.beginPath(); ctx.arc(84, y - 10, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      const h = text(ctx, it, 108, y, { font: F(500, 29), color: INK, alpha: a, maxW: 1060, lh: 1.25 });
      y += h + 26;
    });
    const as = appear(t, sc.lead + span + 0.8, 0.8);
    let sy = Math.max(y + 24, 560);
    text(ctx, 'Sources', 72, sy, { font: F(700, 17), color: INK2, alpha: as });
    V.sources.map(k => SOURCES[k]).filter(Boolean).slice(0, 4).forEach((s, k) => text(ctx, s.t, 72, sy + 28 + k * 24, { font: F(400, 16), color: INK3, alpha: as, maxW: 1120 }));
  }
};
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ---------------------------------------------------------------- minutage
const LEAD = { open: 1.5, chapter: 0.55, end: 0.8, fact: 0.6, steps: 0.6, bars: 0.7, diagram: 0.7, img: 0.45 };
const TAIL = { open: 0.9, chapter: 0.7, end: 3.4, fact: 1.0, steps: 1.1, bars: 1.2, diagram: 1.0, img: 0.75 };
function timeline(V) {
  let t = 0;
  return V.scenes.map((s, i) => {
    const meta = JSON.parse(fs.readFileSync(`audio/${V.id}/s${String(i).padStart(2, '0')}.json`, 'utf8'));
    const lead = LEAD[s.v.t] ?? 0.5, tail = TAIL[s.v.t] ?? 0.8;
    const dur = Math.max(3.2, lead + meta.dur + tail);
    const sc = { ...s, i, start: t, dur, lead, narr: meta.dur, cues: meta.cues };
    t += dur - XF;
    return sc;
  });
}

// ---------------------------------------------------------------- audio (voix + nappe musicale), sous-titres
function readWav(f) {
  const b = fs.readFileSync(f);
  let o = 12, fmt = null, data = null;
  while (o < b.length) { const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4); if (id === 'fmt ') fmt = { ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22), tag: b.readUInt16LE(o + 8) }; if (id === 'data') data = b.subarray(o + 8, o + 8 + sz); o += 8 + sz + (sz % 2); }
  const n = data.length / (fmt.bits / 8); const out = new Float32Array(n);
  if (fmt.bits === 16) for (let i = 0; i < n; i++) out[i] = data.readInt16LE(i * 2) / 32768;
  else if (fmt.tag === 3) for (let i = 0; i < n; i++) out[i] = data.readFloatLE(i * 4);
  else for (let i = 0; i < n; i++) out[i] = data.readInt32LE(i * 4) / 2147483648;
  return { sr: fmt.sr, x: out };
}
function writeWav(f, x, sr) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(clamp(x[i], -1, 1) * 32767), 44 + i * 2);
  fs.writeFileSync(f, b);
}
function music(total, sr, cat, seed) {
  // nappe douce : accords tenus, harmoniques graves, souffle filtré ; plus sombre pour la sécurité
  const n = Math.ceil(total * sr), out = new Float32Array(n);
  const prog = cat === 'securite' ? [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 58, 62], [40, 47, 52, 55, 59]]
    : [[48, 55, 60, 64, 67, 71], [45, 52, 57, 60, 64, 67], [41, 48, 53, 57, 60, 64], [43, 50, 55, 59, 62, 67]];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const seg = 9.6;
  let rs = seed; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  for (let s = 0; s * seg < total + seg; s++) {
    const ch = prog[s % prog.length];
    const t0 = s * seg;
    for (const m of ch) {
      const f = hz(m), ph = rnd() * 6.28, det = 1 + (rnd() - 0.5) * 0.004, amp = 0.018 / Math.sqrt(ch.length) * (m < 50 ? 1.3 : 1);
      const i0 = Math.max(0, Math.floor((t0 - 2.5) * sr)), i1 = Math.min(n, Math.floor((t0 + seg + 2.5) * sr));
      for (let i = i0; i < i1; i++) {
        const t = i / sr - t0;
        const env = t < 0 ? Math.max(0, 1 + t / 2.5) * 0.0 + (t > -2.5 ? (t + 2.5) / 2.5 * 0 : 0) : 1;
        const fade = clamp((t + 2.5) / 3.5, 0, 1) * clamp((seg + 2.5 - t) / 3.5, 0, 1);
        const v = Math.sin(6.2831853 * f * det * (i / sr) + ph) + 0.25 * Math.sin(6.2831853 * f * 2 * (i / sr) + ph * 1.7);
        out[i] += v * amp * fade * (0.85 + 0.15 * Math.sin(6.2831853 * 0.07 * (i / sr) + ph));
        void env;
      }
    }
  }
  // souffle très doux (bruit filtré)
  let lp = 0; for (let i = 0; i < n; i++) { lp += 0.02 * ((rnd() * 2 - 1) - lp); out[i] += lp * 0.05; }
  // entrée et sortie
  for (let i = 0; i < n; i++) { const t = i / sr; out[i] *= clamp(t / 2.5, 0, 1) * clamp((total - t) / 3, 0, 1); }
  return out;
}
function buildAudio(V, scenes, total, file) {
  const sr = 24000, n = Math.ceil(total * sr);
  const voice = new Float32Array(n);
  scenes.forEach(sc => {
    const { x } = readWav(`audio/${V.id}/s${String(sc.i).padStart(2, '0')}.wav`);
    const o = Math.floor((sc.start + sc.lead) * sr);
    for (let i = 0; i < x.length && o + i < n; i++) voice[o + i] += x[i] * 0.92;
  });
  const mus = music(total, sr, V.cat, V.id.length * 7919 + 13);
  // la musique baisse sous la voix
  const env = new Float32Array(n); let e = 0; const att = 1 - Math.exp(-1 / (0.05 * sr)), rel = 1 - Math.exp(-1 / (0.6 * sr));
  for (let i = 0; i < n; i++) { const v = Math.abs(voice[i]) > 0.02 ? 1 : 0; e += (v - e) * (v > e ? att : rel); env[i] = e; }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = voice[i] + mus[i] * (1 - 0.55 * env[i]) * 1.6;
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  const g = pk > 0.95 ? 0.95 / pk : 1;
  for (let i = 0; i < n; i++) out[i] *= g;
  writeWav(file, out, sr);
}
function vtt(V, scenes, file) {
  const ts = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).padStart(6, '0')}`; };
  let out = 'WEBVTT\n\n', k = 1;
  for (const sc of scenes) for (const c of sc.cues) {
    // une réplique longue est coupée en deux lignes au plus près du milieu
    let t = c.text;
    if (t.length > 84) { const mid = t.lastIndexOf(' ', Math.floor(t.length / 2) + 8); if (mid > 20) t = t.slice(0, mid) + '\n' + t.slice(mid + 1); }
    out += `${k++}\n${ts(sc.start + sc.lead + c.t0)} --> ${ts(sc.start + sc.lead + c.t1 + 0.15)}\n${t}\n\n`;
  }
  fs.writeFileSync(file, out);
}

// ---------------------------------------------------------------- rendu
async function main() {
  const id = process.argv[2];
  const V0 = VIDEOS.find(v => v.id === id); if (!V0) throw new Error('vidéo inconnue ' + id);
  const V = { ...V0, C: CAT[V0.cat] };
  const scenes = timeline(V);
  const total = scenes[scenes.length - 1].start + scenes[scenes.length - 1].dur;
  for (const sc of scenes) if (sc.v.img) await img(sc.v.img);
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  const tmp = createCanvas(W, H), tctx = tmp.getContext('2d');
  const draw = (f) => {
    const t = f / FPS;
    const act = scenes.filter(sc => t >= sc.start && t < sc.start + sc.dur);
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
    act.forEach((sc, k) => {
      const lt = t - sc.start;
      if (k === 0) SCENES[sc.v.t](ctx, sc, lt, V);
      else {
        tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalAlpha = 1; tctx.fillStyle = '#05070d'; tctx.fillRect(0, 0, W, H);
        SCENES[sc.v.t](tctx, sc, lt, V);
        ctx.save(); ctx.globalAlpha = ease(lt / XF); ctx.drawImage(tmp, 0, 0); ctx.restore();
      }
    });
    // fondu d'entrée et de sortie
    const fi = clamp(t / 0.6, 0, 1), fo = clamp((total - t) / 0.8, 0, 1);
    if (fi < 1 || fo < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.min(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
    if (process.env.GRAIN) grain(ctx, f);
  };
  const pv = process.argv.indexOf('--preview');
  if (pv > 0) {
    fs.mkdirSync('preview', { recursive: true });
    for (const s of process.argv[pv + 1].split(',')) { const t = +s; draw(Math.round(t * FPS)); fs.writeFileSync(`preview/${id}-${s}.png`, cv.toBuffer('image/png')); }
    console.log('aperçu', id, 'durée', total.toFixed(1), 's');
    return;
  }
  fs.mkdirSync('out', { recursive: true });
  const rg = process.argv.indexOf('--range');
  if (rg > 0) {
    const [a, b] = process.argv[rg + 1].split(',').map(Number);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', process.env.PRESET || 'medium', '-crf', process.env.CRF || '24', '-tune', process.env.TUNE || 'stillimage', '-pix_fmt', 'yuv420p', '-g', process.env.GOP || '60', `preview/${id}-range.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now(); let dt = 0;
    for (let f = Math.round(a * FPS); f < Math.round(b * FPS); f++) { const d0 = Date.now(); draw(f); dt += Date.now() - d0; if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise(r => ff.stdin.once('drain', r)); }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    const sz = fs.statSync(`preview/${id}-range.mp4`).size;
    console.log(`plage ${a}-${b} s : ${((Date.now() - t0) / 1000).toFixed(1)} s (dessin ${(dt / 1000).toFixed(1)} s), ${(sz / 1024).toFixed(0)} Ko, ${(sz * 8 / (b - a) / 1000).toFixed(0)} kbit/s`);
    return;
  }
  const base = `out/${id}`;
  buildAudio(V, scenes, total, base + '.wav');
  vtt(V, scenes, base + '.vtt');
  const tmpOut = base + '.part.mp4';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-', '-i', base + '.wav',
    '-c:v', 'libx264', '-preset', process.env.PRESET || 'slow', '-crf', process.env.CRF || '28', '-tune', 'film', '-pix_fmt', 'yuv420p', '-g', '300',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '24000', '-c:a', 'aac', '-b:a', '80k', '-ac', '1', '-movflags', '+faststart', '-shortest', tmpOut], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.ceil(total * FPS);
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    draw(f);
    const buf = cv.data();
    if (!ff.stdin.write(Buffer.from(buf))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 900 === 0) process.stdout.write(`${id} ${Math.round(f / N * 100)} %  `);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  fs.renameSync(tmpOut, base + '.mp4');
  // affiche (image de couverture) : la première scène, titre visible
  draw(Math.round(Math.min(4.2, scenes[0].dur - 0.6) * FPS));
  fs.writeFileSync(base + '.poster.png', cv.toBuffer('image/png'));
  const meta = { id, title: V.title, cat: V.cat, fiche: V.fiche || null, short: V.short, dur: Math.round(total), sources: V.sources.map(k => SOURCES[k]).filter(Boolean), chapters: scenes.filter(s => s.v.t === 'chapter').map(s => ({ t: Math.round(s.start * 10) / 10, title: s.v.title })) };
  fs.writeFileSync(base + '.json', JSON.stringify(meta, null, 1));
  console.log(`\n${id} : ${total.toFixed(1)} s, rendu en ${Math.round((Date.now() - t0) / 1000)} s`);
}
main().catch(e => { console.error(e); process.exit(1); });
