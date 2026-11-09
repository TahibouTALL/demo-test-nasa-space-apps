import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ================= utilitaires ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const DEG = Math.PI / 180;
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('aura-vr:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('aura-vr:' + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
};
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s).padStart(2, '0');
}
function fmtDur(sec) {
  sec = Math.round(sec);
  if (sec < 60) return sec + ' s';
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  if (h) return h + ' h ' + (m ? String(m).padStart(2, '0') : '');
  return m + ' min' + (s ? ' ' + String(s).padStart(2, '0') + ' s' : '');
}
const nf1 = v => v.toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
function seg(el, value, onChange) {
  const btns = $$('button', el);
  const set = v => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
  if (value !== undefined) set(value);
  btns.forEach(b => b.onclick = () => { set(b.dataset.v); onChange && onChange(b.dataset.v); });
  return { set, get: () => (btns.find(b => b.getAttribute('aria-pressed') === 'true') || {}).dataset?.v };
}

/* ================= rendu ================= */
const canvas = $('#gl');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  console.warn('WebGL indisponible', e);
}
const HAS_GL = !!renderer;
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 20000);
const rig = new THREE.Group();
rig.name = 'rig';
rig.add(camera);
if (HAS_GL) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');
}
function onResize() {
  camera.aspect = innerWidth / Math.max(1, innerHeight);
  camera.updateProjectionMatrix();
  if (HAS_GL) renderer.setSize(innerWidth, innerHeight, false);
  App.onResize.forEach(f => f());
}
window.addEventListener('resize', onResize);

const texLoader = new THREE.TextureLoader();
async function loadTexture(url, srgb = true) {
  const t = await texLoader.loadAsync(url);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (HAS_GL) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function disposeScene(scene) {
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
      if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k].value; if (v && v.isTexture) v.dispose(); }
      m.dispose();
    }
  });
}

/* ================= regard (souris, doigt, clavier) ================= */
const look = { yaw: 0, pitch: 0, fov: 70, enabled: true, pointers: new Map(), pinch0: 0, fov0: 70, moved: false, minPitch: -88 * DEG, maxPitch: 88 * DEG, drift: 0 };
function setFov(f) { look.fov = clamp(f, 28, 90); }
canvas.addEventListener('pointerdown', e => {
  look.pointers.set(e.pointerId, [e.clientX, e.clientY]);
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
  canvas.classList.add('dragging');
  if (look.pointers.size === 2) {
    const [a, b] = [...look.pointers.values()];
    look.pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); look.fov0 = look.fov;
  }
});
canvas.addEventListener('pointermove', e => {
  const p = look.pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p[0], dy = e.clientY - p[1];
  look.pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (look.pointers.size === 1 && look.enabled) {
    const k = (look.fov * DEG / Math.max(300, canvas.clientHeight)) * 1.25;
    look.yaw += dx * k;
    look.pitch = clamp(look.pitch + dy * k, look.minPitch, look.maxPitch);
    if (Math.abs(dx) + Math.abs(dy) > 3 && !look.moved) { look.moved = true; App.hideHint(); }
  } else if (look.pointers.size === 2) {
    const [a, b] = [...look.pointers.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (look.pinch0 > 0 && d > 0) setFov(look.fov0 * look.pinch0 / d);
  }
});
function endPointer(e) { look.pointers.delete(e.pointerId); if (!look.pointers.size) canvas.classList.remove('dragging'); }
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => { e.preventDefault(); if (look.enabled) setFov(look.fov * Math.exp(e.deltaY * 0.0011)); }, { passive: false });
window.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  if (!look.enabled || App.view === 'menu') return;
  const s = 0.06;
  if (e.key === 'ArrowLeft') look.yaw += s;
  else if (e.key === 'ArrowRight') look.yaw -= s;
  else if (e.key === 'ArrowUp') look.pitch = clamp(look.pitch + s, look.minPitch, look.maxPitch);
  else if (e.key === 'ArrowDown') look.pitch = clamp(look.pitch - s, look.minPitch, look.maxPitch);
  else return;
  e.preventDefault();
});

/* ================= son ================= */
const Sound = {
  ctx: null, out: null, on: store.get('sound', true), buffers: {}, amb: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return this.ctx; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { this.ctx = new C(); } catch (e) { return null; }
    const ctx = this.ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.on ? 1 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.out.connect(comp).connect(ctx.destination);
    for (const k of ['white', 'pink', 'brown']) this.buffers[k] = this.makeNoise(k, 8);
    return ctx;
  },
  makeNoise(kind, sec) {
    const ctx = this.ctx, sr = ctx.sampleRate, n = Math.floor(sr * sec), fade = Math.floor(sr * 0.3);
    const buf = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch), tmp = new Float32Array(n + fade);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < n + fade; i++) {
        const w = Math.random() * 2 - 1;
        let v;
        if (kind === 'white') v = w * 0.4;
        else if (kind === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
          v = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; v = last * 3.2; }
        tmp[i] = v;
      }
      for (let i = 0; i < n; i++) d[i] = tmp[i];
      for (let i = 0; i < fade; i++) { const a = i / fade; d[i] = tmp[i] * a + tmp[n + i] * (1 - a); }
    }
    return buf;
  },
  noise(kind) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.buffers[kind]; s.loop = true;
    s.start(0, Math.random() * 6);
    return s;
  },
  setOn(v) {
    this.on = v; store.set('sound', v);
    if (this.out) this.out.gain.setTargetAtTime(v ? 1 : 0, this.ctx.currentTime, 0.08);
    if (!v && window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* rien */ }
  },
  // Ambiance : builder(ctx, sortie) renvoie { update(dt), stop() }
  setAmbience(builder) {
    const ctx = this.init();
    if (this.amb) {
      const old = this.amb; this.amb = null;
      try { old.gain.gain.setTargetAtTime(0, ctx ? ctx.currentTime : 0, 0.4); } catch (e) { /* rien */ }
      setTimeout(() => { try { old.api && old.api.stop && old.api.stop(); old.gain.disconnect(); } catch (e) { /* rien */ } }, 2500);
    }
    if (!ctx || !builder) return;
    const g = ctx.createGain();
    g.gain.value = 0; g.connect(this.out);
    g.gain.setTargetAtTime(1, ctx.currentTime + 0.1, 1.2);
    let api = null;
    try { api = builder(ctx, g); } catch (e) { console.warn('ambiance', e); }
    this.amb = { gain: g, api };
  },
  update(dt) { if (this.amb && this.amb.api && this.amb.api.update) this.amb.api.update(dt); },
  beep(freq, dur = 0.12, vol = 0.12, type = 'sine', when = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.on) return;
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.setValueAtTime(vol, t0 + Math.max(0.01, dur - 0.03));
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g).connect(this.out);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  speak(text) {
    if (!this.on || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR'; u.rate = 1.0; u.pitch = 0.9;
      const v = speechSynthesis.getVoices().find(x => /^fr/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* synthèse vocale indisponible */ }
  }
};
// petit utilitaire : bruit filtré vers une sortie
function noiseBand(ctx, out, kind, type, freq, q, gain) {
  const s = Sound.noise(kind), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = gain;
  s.connect(f).connect(g).connect(out);
  return { src: s, filter: f, gain: g, stop() { try { s.stop(); } catch (e) { /* rien */ } } };
}

/* ================= application ================= */
const App = {
  exp: null, view: 'menu', cache: {}, onResize: new Set(), frameHooks: new Set(), xrOK: false,
  hideHint() { const h = $('#lookHint'); if (h) h.style.opacity = '0'; },
  setTitle(t) { $('#topTitle').textContent = t || ''; },
  loading(on, txt) { $('#loading').hidden = !on; if (txt) $('#loadingTxt').textContent = txt; }
};
const EXPERIENCES = {};

async function openExperience(key, opts = {}) {
  if (!HAS_GL) return null;
  const def = EXPERIENCES[key];
  App.loading(true, opts.loadingText || 'Chargement de la scène');
  await new Promise(r => setTimeout(r, 40));
  if (App.exp && App.exp.key !== key) {
    App.exp.scene.remove(rig);
    App.exp.leave && App.exp.leave();
    if (!App.exp.keep) { App.exp.dispose && App.exp.dispose(); delete App.cache[App.exp.key]; }
    App.exp = null;
  }
  let exp = App.cache[key];
  try {
    if (!exp) { exp = await def.create(opts); exp.key = key; App.cache[key] = exp; }
  } catch (e) {
    console.error(e);
    App.loading(false);
    throw e;
  }
  exp.enter && exp.enter(opts);
  App.exp = exp;
  exp.scene.add(rig);
  rig.position.copy(exp.viewpoint);
  rig.rotation.set(0, 0, 0);
  look.yaw = exp.yaw ?? 0; look.pitch = exp.pitch ?? 0; look.fov = exp.fov ?? 70;
  look.minPitch = exp.minPitch ?? -88 * DEG; look.maxPitch = exp.maxPitch ?? 88 * DEG;
  camera.near = exp.near ?? 0.1; camera.far = exp.far ?? 20000; camera.fov = look.fov;
  camera.updateProjectionMatrix();
  renderer.toneMappingExposure = exp.exposure ?? 1;
  // première image hors écran pour compiler les shaders pendant le chargement
  try { renderer.compile(exp.scene, camera); } catch (e) { /* rien */ }
  App.loading(false);
  return exp;
}

const clock = new THREE.Clock();
let elapsed = 0, lastFov = 0;
const perf = { acc: 0, n: 0, max: Math.min(window.devicePixelRatio || 1, 1.75) };
function adaptResolution(dt) {
  // résolution adaptée à la machine : on baisse si l'image ralentit, on remonte si elle est fluide
  perf.acc += dt; perf.n++;
  if (perf.acc < 2) return;
  const avg = perf.acc / perf.n;
  perf.acc = 0; perf.n = 0;
  if (renderer.xr.isPresenting) return;
  let pr = renderer.getPixelRatio();
  if (avg > 1 / 38 && pr > 0.75) pr = Math.max(0.75, pr - 0.25);
  else if (avg < 1 / 57 && pr < perf.max) pr = Math.min(perf.max, pr + 0.25);
  if (pr !== renderer.getPixelRatio()) { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); }
}
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;
  adaptResolution(dt);
  if (!renderer.xr.isPresenting) {
    if (App.view === 'menu') look.yaw += dt * 0.01;
    if (look.fov !== lastFov) { camera.fov = look.fov; camera.updateProjectionMatrix(); lastFov = look.fov; }
    camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  }
  Sound.update(dt);
  App.frameHooks.forEach(f => { try { f(dt, elapsed); } catch (e) { console.error(e); App.frameHooks.delete(f); } });
  if (App.exp) {
    App.exp.update(dt, elapsed);
    renderer.render(App.exp.scene, camera);
  }
}

/* textures de bruit produites à la volée */
function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (HAS_GL) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
// carte de normales tuilable à partir d'une somme d'ondes à nombres d'onde entiers
function tileableNormalMap(size, waves, strength, seed) {
  const rnd = mulberry32(seed);
  const W = [];
  for (let i = 0; i < waves.count; i++) {
    const a = rnd() * Math.PI * 2;
    const k = waves.kmin + Math.pow(rnd(), waves.pow || 1.6) * (waves.kmax - waves.kmin);
    let kx = Math.round(Math.cos(a) * k), ky = Math.round(Math.sin(a) * k);
    if (waves.dir !== undefined) {
      const b = waves.dir + (rnd() - 0.5) * (waves.spread || 0.6);
      kx = Math.round(Math.cos(b) * k); ky = Math.round(Math.sin(b) * k);
    }
    if (!kx && !ky) { kx = 1; }
    W.push([kx, ky, rnd() * Math.PI * 2, 1 / Math.pow(kx * kx + ky * ky, (waves.decay || 0.9) / 2)]);
  }
  const hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (const [kx, ky, ph, am] of W) {
      const s = Math.sin(2 * Math.PI * (kx * x + ky * y) / size + ph);
      v += am * (waves.sharp ? (1 - Math.abs(s)) * 2 - 1 : s);
    }
    hgt[y * size + x] = v;
  }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xl = hgt[y * size + ((x - 1 + size) % size)], xr = hgt[y * size + ((x + 1) % size)];
    const yu = hgt[((y - 1 + size) % size) * size + x], yd = hgt[((y + 1) % size) * size + x];
    let nx = (xl - xr) * strength, ny = (yu - yd) * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 4;
    data[i] = (nx * 0.5 + 0.5) * 255; data[i + 1] = (ny * 0.5 + 0.5) * 255; data[i + 2] = (nz * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  if (HAS_GL) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
// maillage radial dense près de l'observateur, lâche au loin
function radialGrid(rMin, rMax, rings, segs, heightFn) {
  const pos = [], idx = [];
  const q = Math.pow(rMax / rMin, 1 / (rings - 1));
  pos.push(0, heightFn(0, 0), 0);
  for (let i = 0; i < rings; i++) {
    const r = rMin * Math.pow(q, i);
    for (let j = 0; j < segs; j++) {
      const a = j / segs * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, heightFn(x, z), z);
    }
  }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = 1 + i * segs + j, b = 1 + i * segs + (j + 1) % segs;
      const c = a + segs, d = b + segs;
      idx.push(a, b, d, a, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
