// Rendu d'un film AURA : minutage d'après la voix, images (1280 x 720, 30 i/s), sous-titres, liste des sons.
// usage : node film.mjs <id>                 rendu complet (vidéo sans le son, sous-titres, événements sonores)
//         node film.mjs <id> --sheet         planche de contrôle (une image par plan) dans preview/
//         node film.mjs <id> --at 3.2,10     images aux temps donnés (secondes) dans preview/
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import { spawn } from 'child_process';
import { STORY, SOURCES } from './story.mjs';
import { W, H, FPS, C, clamp, lerp, E, pr, R } from './engine/base.mjs';
import * as S from './engine/scenes.mjs';
import { OVERLAYS, endCard } from './engine/overlays.mjs';
import { D } from './engine/diagrams.mjs';
import { actor, exercise } from './engine/actors.mjs';

const LEAD0 = 0.8, LEAD = 0.45, TAIL = 0.75, TAIL0 = 1.1, TAIL_LAST = 1.3, END = 5.0, XF = 0.5;
const pad = i => String(i).padStart(2, '0');

// ---------------------------------------------------------------- minutage
export function timeline(id) {
  const F = STORY[id]; if (!F) throw new Error('film inconnu : ' + id);
  let t = 0;
  const shots = F.shots.map((sh, i) => {
    const meta = JSON.parse(fs.readFileSync(`audio/${id}/s${pad(i)}.json`, 'utf8'));
    const lead = i === 0 ? LEAD0 : LEAD, tail = i === 0 ? TAIL0 : i === F.shots.length - 1 ? TAIL_LAST : TAIL;
    const dur = Math.max(3, lead + meta.dur + tail);
    const s = Object.assign({}, sh, { i, start: t, dur, lead, narr: meta.dur, cues: meta.cues });
    t += dur;
    return s;
  });
  return { F, shots, end: { start: t, dur: END }, total: t + END };
}

// temps relatifs à la voix d'un plan : nombre, 's1', 'e1', 's1@0.5', 'end', avec +x ou -x
function timer(sh, t) {
  const at = spec => {
    if (spec === undefined || spec === null) return -sh.lead;
    if (typeof spec === 'number') return spec;
    let m = /^end([+-][\d.]+)?$/.exec(spec); if (m) return sh.narr + (m[1] ? +m[1] : 0);
    m = /^start([+-][\d.]+)?$/.exec(spec); if (m) return -sh.lead + (m[1] ? +m[1] : 0);
    m = /^([se])(\d+)(?:@([\d.]+))?([+-][\d.]+)?$/.exec(spec);
    if (!m) throw new Error('temps illisible : ' + spec);
    const c = sh.cues[+m[2]]; if (!c) throw new Error(`phrase ${m[2]} absente (plan ${sh.i})`);
    let v = m[1] === 'e' ? c.end : c.start;
    if (m[3] !== undefined) v = c.start + (+m[3]) * (c.end - c.start);
    return v + (m[4] ? +m[4] : 0);
  };
  return { t, n: t - sh.lead, lead: sh.lead, dur: sh.narr, at };
}

// ---------------------------------------------------------------- dessin d'un plan
const BG = new Set(['module', 'cupola', 'orbit', 'space', 'flat', 'earth', 'outside']);
const OV = new Set(['title', 'stat', 'chips', 'warn', 'note', 'tag', 'bubble', 'stamp', 'big', 'steps']);
function drawShot(ctx, sh, t, F) {
  const tm = timer(sh, t);
  const cam = sh.cam || [1, 1.045];
  const z = lerp(cam[0], cam[1], E.inOut(clamp(t / sh.dur, 0, 1)));
  const reg = [];
  ctx.fillStyle = C.night; ctx.fillRect(0, 0, W, H);
  const zoomAbout = (k) => { ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2); };
  const toScreen = p => [W / 2 + (p[0] - W / 2) * z, H / 2 + (p[1] - H / 2) * z];
  let ai = 0;
  for (const L of sh.L) {
    ctx.save();
    if (BG.has(L.k)) {
      zoomAbout(1 + (z - 1) * 0.6);
      if (L.k === 'module') S.moduleScene(ctx, t, L, tm);
      else if (L.k === 'cupola') S.cupola(ctx, t, L);
      else if (L.k === 'orbit') S.orbit(ctx, t, L);
      else if (L.k === 'space') S.space(ctx, t, L);
      else if (L.k === 'flat') S.flat(ctx, t, L);
      else if (L.k === 'earth') S.earthGround(ctx, t, L);
      else if (L.k === 'outside') S.outside(ctx, t, L, tm);
    } else if (L.k === 'actor') { zoomAbout(z); actor(ctx, L, tm, reg, ai++); }
    else if (L.k === 'ex') { zoomAbout(z); exercise(ctx, L, tm, reg); ai++; }
    else if (L.k === 'd') {
      const A = tm.at(L.at);
      if (tm.n >= A) {
        let fade = 1;
        if (L.out !== undefined) fade = 1 - pr(tm.n, tm.at(L.out), 0.35);
        if (fade > 0) { zoomAbout(z); ctx.globalAlpha *= fade; const fn = D[L.d]; if (!fn) throw new Error('schéma inconnu : ' + L.d); fn(ctx, L, tm, pr(tm.n, A, 0.6), tm.n - A); }
      }
    } else if (OV.has(L.k)) {
      const A = tm.at(Array.isArray(L.at) ? L.at[0] : L.at);
      const k = pr(tm.n, A, 0.5), kout = L.out !== undefined ? pr(tm.n, tm.at(L.out), 0.35) : 0;
      let target = null;
      if (L.to) {
        if (Array.isArray(L.to)) target = [L.to[0] * W, L.to[1] * H];
        else { const [mark, idx] = L.to.split(':'); const r = reg[+(idx || 0)]; if (r && r[mark]) target = toScreen(r[mark]); }
      }
      if (L.k === 'title' || L.k === 'chips' || L.k === 'big') OVERLAYS[L.k](ctx, L, tm, F);
      else if (tm.n >= A || L.k === 'steps') OVERLAYS[L.k](ctx, L, tm, F, L.k === 'steps' && L.at === undefined ? 1 : k, kout, target);
    } else throw new Error('calque inconnu : ' + L.k);
    ctx.restore();
  }
}

function drawEnd(ctx, t, F) {
  endCard(ctx, t, F, F.sources.map(k => SOURCES[k]).filter(s => s && s.u !== undefined));
  const who = (F.thumb && F.thumb.who) || 'lucas';
  const k = E.out(pr(t, 0.3, 0.8));
  R.draw(ctx, R.P.wave(t), { who, s: 360, x: W * 0.82, y: H * 0.52 + (1 - k) * 300 + Math.sin(t * 1.2) * 5, t, alpha: k });
}

// ---------------------------------------------------------------- une image du film au temps T
function makeRenderer(TL) {
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  const A = createCanvas(W, H), a = A.getContext('2d'), B = createCanvas(W, H), b = B.getContext('2d');
  const { F, shots, end, total } = TL;
  const seq = [...shots, Object.assign({ isEnd: true, tr: 'fade' }, end)];
  const paint = (c, s, t) => { c.save(); if (s.isEnd) drawEnd(c, t, F); else drawShot(c, s, t, F); c.restore(); };
  function frame(T) {
    let i = seq.findIndex(s => T >= s.start && T < s.start + s.dur); if (i < 0) i = seq.length - 1;
    const s = seq[i];
    // transition avec le plan précédent ou le suivant
    let pairIdx = -1, p = 0;
    if (i > 0 && T - s.start < XF / 2 && (s.tr || 'slide') !== 'cut') { pairIdx = i; p = (T - s.start + XF / 2) / XF; }
    else if (i < seq.length - 1 && s.start + s.dur - T < XF / 2 && (seq[i + 1].tr || 'slide') !== 'cut') { pairIdx = i + 1; p = (T - (s.start + s.dur) + XF / 2) / XF; }
    if (pairIdx < 0) paint(ctx, s, T - s.start);
    else {
      const P = seq[pairIdx - 1], N = seq[pairIdx], tr = N.tr || 'slide', e = E.inOut(p);
      paint(a, P, T - P.start); paint(b, N, T - N.start);
      ctx.save(); ctx.fillStyle = C.night; ctx.fillRect(0, 0, W, H);
      if (tr === 'fade') { ctx.drawImage(A, 0, 0); ctx.globalAlpha = e; ctx.drawImage(B, 0, 0); }
      else if (tr === 'zoom') { ctx.save(); ctx.globalAlpha = 1 - e; ctx.translate(W / 2, H / 2); ctx.scale(1 + 0.35 * e, 1 + 0.35 * e); ctx.drawImage(A, -W / 2, -H / 2); ctx.restore(); ctx.save(); ctx.globalAlpha = e; ctx.translate(W / 2, H / 2); ctx.scale(0.88 + 0.12 * e, 0.88 + 0.12 * e); ctx.drawImage(B, -W / 2, -H / 2); ctx.restore(); }
      else if (tr === 'circle') { ctx.drawImage(A, 0, 0); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * e, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); }
      else { const off = W * e; ctx.drawImage(A, -off, 0); ctx.drawImage(B, W - off, 0); ctx.fillStyle = `rgba(12,18,48,${0.35 * Math.sin(e * Math.PI)})`; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
    // fondu d'ouverture et de fermeture
    const fi = clamp(T / 0.45, 0, 1), fo = clamp((total - T) / 0.9, 0, 1);
    if (fi < 1 || fo < 1) { ctx.fillStyle = `rgba(5,7,16,${1 - Math.min(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
    return cv;
  }
  return { frame, cv };
}

// ---------------------------------------------------------------- sons à placer (lus par mix.py)
function events(TL, id) {
  const { F, shots, end, total } = TL, ev = [], voice = [];
  shots.forEach(sh => {
    const tm = timer(sh, 0), base = sh.start + sh.lead;
    voice.push({ file: `audio/${id}/s${pad(sh.i)}.wav`, t: +(base).toFixed(3) });
    if (sh.i > 0) { const tr = sh.tr || 'slide'; if (tr !== 'cut') ev.push({ k: tr === 'fade' ? 'swoosh' : 'whoosh', t: sh.start - 0.22 }); }
    for (const L of sh.L) {
      const T = s => base + tm.at(s);
      if (L.k === 'module' && L.light === 'alarm') ev.push({ k: 'alarm', t: sh.start, d: sh.dur });
      if (L.k === 'module' && L.alarmAt !== undefined) ev.push({ k: 'alarm', t: T(L.alarmAt), d: sh.start + sh.dur - T(L.alarmAt) });
      if (L.k === 'title') ev.push({ k: 'title', t: sh.start + 0.3 });
      if (L.k === 'chips') (L.at || []).forEach((a, i) => ev.push({ k: 'pop', t: T(a), v: i }));
      if (['stat', 'tag', 'bubble'].includes(L.k) && L.at !== undefined) ev.push({ k: L.k === 'stat' ? 'pop2' : 'pop', t: T(L.at) });
      if (L.k === 'warn') ev.push({ k: 'warn', t: T(L.at ?? 0) });
      if (L.k === 'note') ev.push({ k: 'ding', t: T(L.at ?? 0) });
      if (L.k === 'stamp') ev.push({ k: 'type', t: T(L.at ?? 0), d: 0.6 });
      if (L.k === 'big') ev.push({ k: 'pop2', t: T(L.at ?? 0) });
      if (L.k === 'steps' && L.big) { L.items.forEach((_, i) => ev.push({ k: 'pop', t: T(L.at !== undefined ? L.at : 'start') + 0.3 + i * 0.32, v: i })); (L.done || []).forEach(a => ev.push({ k: 'ding', t: T(a) })); }
      if (L.k === 'steps' && !L.big) ev.push({ k: 'pop', t: sh.start + 0.2 });
      if (L.k === 'd' && L.d === 'heart' && L.bpm) ev.push({ k: 'heart', t: sh.start, d: sh.dur, bpm: L.bpm });
      if (L.k === 'd' && L.d === 'fire') ev.push({ k: 'fire', t: T(L.at), d: sh.start + sh.dur - T(L.at) });
      if (L.k === 'd' && ['people', 'days', 'pouches', 'urine'].includes(L.d)) ev.push({ k: 'pop', t: T(L.at) + 0.1 });
      if (L.k === 'd' && L.d === 'timer') ev.push({ k: 'tick', t: T(L.at), d: sh.start + sh.dur - T(L.at) });
      if (L.k === 'd' && L.d === 'hatches' && L.close) ev.push({ k: 'clunk', t: T(L.close[0]) }, { k: 'clunk', t: T(L.close[1]) });
    }
  });
  ev.push({ k: 'chime', t: end.start + 0.2 });
  return { id, cat: F.cat, total: +total.toFixed(3), voice, sfx: ev.filter(e => e.t >= 0).sort((a, b) => a.t - b.t) };
}

// ---------------------------------------------------------------- sous-titres (français par défaut, anglais)
function vtt(TL, lang) {
  const ts = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).padStart(6, '0')}`; };
  const cues = [];
  for (const sh of TL.shots) for (const c of sh.cues) cues.push({ a: sh.start + sh.lead + c.start, b: sh.start + sh.lead + c.end, s: c[lang] });
  const MAX = 42;
  const lines = (s, max) => { const out = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; };
  // découpe une réplique en morceaux de longueur voisine, de préférence après une ponctuation
  const chunks = (s, p) => {
    if (p <= 1) return [s];
    const words = s.split(' '), target = s.length / p, out = []; let cur = '';
    words.forEach((w, i) => {
      cur = cur ? cur + ' ' + w : w;
      const rest = words.length - i - 1, left = p - out.length - 1;
      const punct = /[,.:;?!]$/.test(w) && cur.length > target * 0.6;
      if (left > 0 && rest > 0 && (cur.length >= target * 1.05 || punct)) { out.push(cur); cur = ''; }
    });
    if (cur) out.push(cur);
    return out;
  };
  let out = 'WEBVTT\n\n', k = 1;
  cues.forEach((c, i) => {
    const next = cues[i + 1] ? cues[i + 1].a - 0.04 : c.b + 1;
    const end = Math.min(c.b + 0.3, next);
    const txt = lang === 'fr' ? c.s.replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ') : c.s;
    const nParts = Math.ceil(lines(txt, MAX).length / 2);
    const parts = chunks(txt, nParts).map(p => lines(p, MAX).join('\n'));
    // chaque morceau reste à l'écran au prorata de son nombre de lettres
    const tot = parts.reduce((s, p) => s + p.length, 0); let a = c.a;
    parts.forEach((p, j) => { const b = j === parts.length - 1 ? end : a + (end - c.a) * p.length / tot; out += `${k++}\n${ts(a)} --> ${ts(b)}\n${p}\n\n`; a = b; });
  });
  return out;
}

// ---------------------------------------------------------------- programme
async function main() {
  const id = process.argv[2];
  const TL = timeline(id), { F, shots, total } = TL;
  const R0 = makeRenderer(TL);
  fs.mkdirSync('preview', { recursive: true }); fs.mkdirSync('out', { recursive: true });
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  if (process.argv.includes('--sheet')) {
    const cols = 3, sw = 640, shh = 360, rows = Math.ceil((shots.length + 1) / cols);
    const sheet = createCanvas(cols * sw, rows * shh), sx = sheet.getContext('2d');
    const times = shots.map(s => s.start + s.lead + s.narr * 0.75).concat([TL.end.start + 3]);
    times.forEach((T, i) => { const cv = R0.frame(T); sx.drawImage(cv, (i % cols) * sw, Math.floor(i / cols) * shh, sw, shh); sx.fillStyle = '#FFF'; sx.font = '700 22px Atkinson'; sx.fillText(`${i} · ${T.toFixed(1)} s`, (i % cols) * sw + 12, Math.floor(i / cols) * shh + 30); });
    fs.writeFileSync(`preview/${id}-sheet.png`, sheet.toBuffer('image/png'));
    console.log(id, 'durée', total.toFixed(1), 's, planche', `preview/${id}-sheet.png`);
    return;
  }
  if (arg('--at')) {
    for (const s of arg('--at').split(',')) { const cv = R0.frame(+s); fs.writeFileSync(`preview/${id}-${s}.png`, cv.toBuffer('image/png')); }
    console.log(id, 'durée', total.toFixed(1), 's'); return;
  }
  // rendu complet
  const base = `out/${id}`;
  fs.writeFileSync(base + '.events.json', JSON.stringify(events(TL, id), null, 1));
  fs.writeFileSync(base + '.fr.vtt', vtt(TL, 'fr'));
  fs.writeFileSync(base + '.en.vtt', vtt(TL, 'en'));
  const chapters = shots.filter(s => s.ch).map(s => ({ t: Math.round(s.start * 10) / 10, title: s.ch }));
  fs.writeFileSync(base + '.json', JSON.stringify({ id, title: F.title, cat: F.cat, fiche: F.fiche || null, short: F.short, dur: Math.round(total), chapters, sources: F.sources.map(k => SOURCES[k]).filter(Boolean) }, null, 1));
  const tmp = base + '.video.part.mp4';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', process.env.PRESET || 'medium', '-crf', process.env.CRF || '22', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-g', '60', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.ceil(total * FPS), t0 = Date.now();
  for (let f = 0; f < N; f++) {
    const cv = R0.frame(f / FPS);
    if (!ff.stdin.write(Buffer.from(cv.data()))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  fs.renameSync(tmp, base + '.video.mp4');
  console.log(`${id} : ${total.toFixed(1)} s, ${N} images en ${Math.round((Date.now() - t0) / 1000)} s`);
}
if (process.argv[1] && process.argv[1].endsWith('film.mjs')) main().catch(e => { console.error(e); process.exit(1); });
