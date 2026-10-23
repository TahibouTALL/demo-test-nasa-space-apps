/* AURA : moments de calme et test de vigilance (F10).
   Respiration guidée, paysage de la Terre à regarder tout autour de soi
   (dessiné à bord, sans connexion ni image extérieure), et test de réaction
   en version courte (PVT-B : 3 minutes, signal toutes les 1 à 4 secondes). */
(function (root) {
  'use strict';
  const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ------------------------------------------------------------------ */
  /* Respiration guidée                                                   */
  /* ------------------------------------------------------------------ */
  function breathing(o) {
    // o : { orb, word, time, inhale, exhale, minutes, onState }
    let timer = null, tick = null, running = false, phase = 'in', endAt = 0;
    const setScale = (sc, dur) => {
      if (!o.orb) return;
      if (reduce()) { o.orb.style.transition = 'opacity ' + dur + 's ease-in-out'; o.orb.style.opacity = sc > 0.8 ? '1' : '0.45'; return; }
      o.orb.style.transition = 'transform ' + dur + 's cubic-bezier(.45,.05,.55,.95), opacity ' + dur + 's ease';
      o.orb.style.transform = 'scale(' + sc + ')';
      o.orb.style.opacity = sc > 0.8 ? '1' : '0.75';
    };
    const step = () => {
      if (!running) return;
      if (now() >= endAt) { stop(true); return; }
      phase = phase === 'in' ? 'out' : 'in';
      const dur = phase === 'in' ? o.inhale : o.exhale;
      if (o.word) o.word.textContent = phase === 'in' ? 'Inspirez' : 'Expirez';
      setScale(phase === 'in' ? 1 : 0.55, dur);
      timer = setTimeout(step, dur * 1000);
    };
    function start() {
      if (running) return;
      running = true; phase = 'out'; endAt = now() + o.minutes * 60000;
      step();
      tick = setInterval(() => { if (o.time) o.time.textContent = mmss((endAt - now()) / 1000) + ' restantes'; }, 250);
      if (o.onState) o.onState('running');
    }
    function stop(done) {
      running = false;
      clearTimeout(timer); clearInterval(tick);
      setScale(0.7, 1.2);
      if (o.word) o.word.textContent = done ? 'C’est terminé. Prenez un moment avant de reprendre.' : 'Pause. Reprenez quand vous voulez.';
      if (o.time) o.time.textContent = done ? '' : '';
      if (o.onState) o.onState(done ? 'done' : 'stopped');
    }
    setScale(0.7, 0.01);
    return { start, stop, get running() { return running; }, destroy() { running = false; clearTimeout(timer); clearInterval(tick); } };
  }

  /* ------------------------------------------------------------------ */
  /* Paysage de la Terre, à 360°                                          */
  /* ------------------------------------------------------------------ */
  const MOODS = {
    aube: { sky: ['#2c3970', '#8a79b4', '#e9a9a0', '#f7d2a8'], sun: { yaw: 70, el: 0.26, r: 26, color: '#ffe3b8', glow: 'rgba(255,210,160,0.55)' }, far: '#9c8fb8', near: '#2a2440', mist: 'rgba(247,210,190,0.35)', water: ['#d9a7a6', '#4b4366'], stars: 0.25 },
    jour: { sky: ['#3f7fcf', '#6fa7e0', '#a9d2f0', '#e4f2fb'], sun: { yaw: 150, el: 0.42, r: 22, color: '#fffbe8', glow: 'rgba(255,255,230,0.45)' }, far: '#9fbfd6', near: '#1f3d36', mist: 'rgba(235,246,252,0.45)', water: ['#8fc0e2', '#24484a'], stars: 0 },
    soir: { sky: ['#1b2550', '#6a3f7d', '#d9706a', '#f6b26b'], sun: { yaw: 250, el: 0.22, r: 30, color: '#ffd08a', glow: 'rgba(255,150,90,0.55)' }, far: '#a2638a', near: '#1d1430', mist: 'rgba(250,170,130,0.3)', water: ['#e08a70', '#2c1f3d'], stars: 0.15 },
    nuit: { sky: ['#03060f', '#0a1430', '#15254a', '#22355c'], sun: { yaw: 300, el: 0.3, r: 16, color: '#eef1ff', glow: 'rgba(200,210,255,0.25)', moon: true }, far: '#2b3b5e', near: '#060a16', mist: 'rgba(120,140,190,0.12)', water: ['#22355c', '#03060f'], stars: 1 }
  };
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Crêtes périodiques : la somme de sinusoïdes de fréquences entières boucle sur 360°
  function ridge(seed, N, rough) {
    const r = rng(seed), waves = [];
    for (let k = 1; k <= 26; k++) waves.push({ k, a: Math.pow(k, -rough) * (0.6 + r() * 0.8), p: r() * Math.PI * 2 });
    const out = new Float32Array(N);
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < N; i++) {
      const u = i / N;
      let v = 0;
      for (const w of waves) v += w.a * Math.sin(2 * Math.PI * w.k * u + w.p);
      // Sommets un peu plus marqués
      v = v + 0.35 * Math.abs(v);
      out[i] = v; mn = Math.min(mn, v); mx = Math.max(mx, v);
    }
    for (let i = 0; i < N; i++) out[i] = (out[i] - mn) / (mx - mn || 1);
    return out;
  }

  function scene(canvas, o) {
    const ctx = canvas.getContext('2d');
    let mood = MOODS[o.mood] ? o.mood : 'aube';
    let yaw = typeof o.yaw === 'number' ? o.yaw : MOODS[mood].sun.yaw - 16, vel = 0, drag = null, raf = 0, last = now(), alive = true, idleSince = now();
    const FOV = 110; // degrés visibles
    const N = 2048;
    const layers = [
      { base: 0.60, amp: 0.24, rough: 1.0, seed: 11, snow: true },
      { base: 0.63, amp: 0.17, rough: 1.2, seed: 23 },
      { base: 0.665, amp: 0.12, rough: 1.4, seed: 37 },
      { base: 0.695, amp: 0.08, rough: 1.6, seed: 53 },
      { base: 0.722, amp: 0.045, rough: 1.8, seed: 71, trees: true }
    ].map(L => Object.assign(L, { h: ridge(L.seed, N, L.rough) }));
    const starR = rng(97), stars = [];
    for (let i = 0; i < 260; i++) stars.push({ u: starR(), v: Math.pow(starR(), 1.6) * 0.5, s: 0.4 + starR() * 1.3, t: starR() * 6.28 });
    const cloudR = rng(131), clouds = [];
    for (let i = 0; i < 9; i++) clouds.push({ u: cloudR(), v: 0.12 + cloudR() * 0.25, w: 0.06 + cloudR() * 0.1, h: 0.018 + cloudR() * 0.02, sp: 0.002 + cloudR() * 0.004 });
    // Arbres groupés en bosquets, avec des clairières entre eux
    const treeR = rng(151), trees = [];
    for (let c = 0; c < 26; c++) {
      const cu = treeR(), spread = 0.003 + treeR() * 0.01, n = 3 + Math.floor(treeR() * 11);
      for (let i = 0; i < n; i++) {
        const g = (treeR() + treeR() + treeR() - 1.5) / 1.5;
        trees.push({ u: ((cu + g * spread) % 1 + 1) % 1, s: 0.55 + treeR() * 0.9 });
      }
    }
    trees.sort((a, b) => a.s - b.s);

    function size() {
      const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1));
      const w = canvas.clientWidth || 800, h = canvas.clientHeight || 450;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    }
    function draw(t) {
      const { w, h } = size();
      const M = MOODS[mood];
      const horizon = h * 0.7;
      // Ciel
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      M.sky.forEach((c, i) => g.addColorStop(i / (M.sky.length - 1), c));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon + 2);
      const pxPerDeg = w / FOV;
      // Rotation sur place : tout le paysage tourne d’un même angle (pas de parallaxe)
      const worldX = deg => { const d = ((deg - yaw) % 360 + 540) % 360 - 180; return w / 2 + d * pxPerDeg; };
      // Étoiles
      if (M.stars) {
        stars.forEach(st => {
          const x = worldX(st.u * 360, 0.08); if (x < -4 || x > w + 4) return;
          const a = M.stars * (0.55 + 0.45 * Math.sin(t / 1400 + st.t));
          ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, st.v * horizon, st.s, 0, 6.283); ctx.fill();
        });
      }
      // Soleil ou lune
      const sx = worldX(M.sun.yaw, 0.12), sy = horizon - M.sun.el * horizon * 1.4;
      if (sx > -200 && sx < w + 200) {
        const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, M.sun.r * 7);
        rg.addColorStop(0, M.sun.glow); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg; ctx.fillRect(sx - M.sun.r * 7, sy - M.sun.r * 7, M.sun.r * 14, M.sun.r * 14);
        ctx.fillStyle = M.sun.color; ctx.beginPath(); ctx.arc(sx, sy, M.sun.r, 0, 6.283); ctx.fill();
        if (M.sun.moon) {
          // Croissant : le disque moins un disque décalé, sans masquer le ciel derrière
          const R0 = M.sun.r;
          ctx.save();
          ctx.beginPath(); ctx.arc(sx, sy, R0 + 1, 0, 6.283); ctx.clip();
          ctx.beginPath(); ctx.arc(sx + R0 * 0.42, sy - R0 * 0.18, R0 * 0.86, 0, 6.283); ctx.clip();
          ctx.fillStyle = g; ctx.fillRect(sx - R0 - 2, sy - R0 - 2, R0 * 2 + 4, R0 * 2 + 4);
          ctx.fillStyle = rg; ctx.fillRect(sx - R0 - 2, sy - R0 - 2, R0 * 2 + 4, R0 * 2 + 4);
          ctx.restore();
        }
      }
      // Nuages
      clouds.forEach(c => {
        c.u = (c.u + c.sp * 0.0002 * 16) % 1;
        const x = worldX(c.u * 360, 0.15); if (x < -w * 0.3 || x > w * 1.3) return;
        const cw = c.w * w * 2, ch = c.h * h * 2, cy = c.v * horizon;
        const cg = ctx.createRadialGradient(x, cy, 0, x, cy, cw / 2);
        cg.addColorStop(0, 'rgba(255,255,255,' + (mood === 'nuit' ? 0.05 : 0.32) + ')'); cg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save(); ctx.translate(x, cy); ctx.scale(1, ch / cw); ctx.translate(-x, -cy);
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, cy, cw / 2, 0, 6.283); ctx.fill(); ctx.restore();
      });
      // Montagnes, du plus loin au plus proche
      const period = 360 * pxPerDeg; // un tour complet, en pixels
      const off = ((yaw * pxPerDeg - w / 2) % period + period) % period;
      const ridgeY = (L, x) => { const u = (((x + off) / period) % 1 + 1) % 1; return h * (L.base - L.amp * L.h[Math.floor(u * N) % N]); };
      const stepPx = 3;
      layers.forEach((L, li) => {
        const col = mix(M.far, M.near, li / (layers.length - 1));
        const path = new Path2D();
        path.moveTo(0, h);
        for (let x = 0; x <= w + stepPx; x += stepPx) path.lineTo(x, Math.min(ridgeY(L, x), horizon + (li - 2) * 4));
        path.lineTo(w, h); path.closePath();
        ctx.fillStyle = col; ctx.fill(path);
        if (L.snow) {
          // Neige sur les plus hauts sommets
          ctx.save(); ctx.clip(path);
          const sy0 = h * (L.base - L.amp * 0.8);
          const sg = ctx.createLinearGradient(0, sy0 - h * 0.06, 0, sy0 + h * 0.012);
          sg.addColorStop(0, mix(M.far, '#ffffff', mood === 'nuit' ? 0.25 : 0.6)); sg.addColorStop(1, col);
          ctx.fillStyle = sg; ctx.fillRect(0, 0, w, sy0 + h * 0.012);
          ctx.restore();
        }
        if (L.trees) {
          ctx.fillStyle = mix(M.near, '#000000', 0.25);
          trees.forEach(tr => {
            const x = ((tr.u * period - off) % period + period) % period;
            if (x > w + 10) return;
            const y = Math.min(ridgeY(L, x), horizon);
            const th = 16 * tr.s, tw = 5 * tr.s;
            ctx.beginPath(); ctx.moveTo(x, y - th); ctx.lineTo(x - tw, y + 2); ctx.lineTo(x + tw, y + 2); ctx.closePath(); ctx.fill();
          });
        }
        // Brume entre les couches
        if (li < layers.length - 1) {
          const my = h * (L.base + 0.015);
          const mg = ctx.createLinearGradient(0, my - h * 0.07, 0, my + h * 0.03);
          mg.addColorStop(0, 'rgba(255,255,255,0)'); mg.addColorStop(1, M.mist);
          ctx.fillStyle = mg; ctx.fillRect(0, my - h * 0.07, w, h * 0.1);
        }
      });
      // Lac et reflets
      const lakeTop = horizon + 10;
      const lg = ctx.createLinearGradient(0, lakeTop, 0, h);
      lg.addColorStop(0, M.water[0]); lg.addColorStop(1, M.water[1]);
      ctx.fillStyle = lg; ctx.fillRect(0, lakeTop, w, h - lakeTop);
      // Reflet des montagnes, écrasé et estompé
      layers.slice(0, 3).forEach((L, li) => {
        ctx.fillStyle = mix(M.far, M.near, li / (layers.length - 1));
        ctx.globalAlpha = 0.16;
        ctx.beginPath(); ctx.moveTo(0, lakeTop);
        for (let x = 0; x <= w + stepPx; x += stepPx) { const y = ridgeY(L, x); ctx.lineTo(x, lakeTop + Math.max(0, horizon - y) * 0.45); }
        ctx.lineTo(w, lakeTop); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      });
      if (sx > -200 && sx < w + 200) {
        ctx.fillStyle = M.sun.glow;
        for (let k = 0; k < 14; k++) {
          const yy = lakeTop + 6 + k * (h - lakeTop) / 15;
          const ww = (M.sun.r * 2.2) * (1 + k * 0.12) * (0.7 + 0.3 * Math.sin(t / 900 + k));
          ctx.fillRect(sx - ww / 2, yy, ww, 2);
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
      for (let k = 0; k < 9; k++) {
        const yy = lakeTop + 8 + k * (h - lakeTop) / 9;
        const dx = (t / 60 + k * 47) % 120;
        ctx.beginPath();
        for (let x = -dx; x < w; x += 120) { ctx.moveTo(x, yy); ctx.lineTo(x + 40, yy); }
        ctx.stroke();
      }
      // Rive proche
      ctx.fillStyle = mix(M.near, '#000000', 0.35);
      ctx.fillRect(0, lakeTop - 2, w, 3);
    }
    function frame(t) {
      if (!alive) return;
      const dt = Math.min(64, t - last); last = t;
      if (!drag) {
        if (Math.abs(vel) > 0.001) { yaw += vel * dt; vel *= 0.94; }
        else if (!reduce() && t - idleSince > 2500) yaw += 0.0035 * dt;
      }
      yaw = ((yaw % 360) + 360) % 360;
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    const onDown = e => { drag = { x: e.clientX, yaw, t: now() }; vel = 0; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); };
    const onMove = e => {
      if (!drag) return;
      const w = canvas.clientWidth || 800;
      const d = (e.clientX - drag.x) / w * FOV;
      const ny = drag.yaw - d;
      const tt = now();
      vel = (ny - yaw) / Math.max(8, tt - (drag.lt || drag.t));
      drag.lt = tt;
      yaw = ny; idleSince = tt;
    };
    const onUp = () => { drag = null; idleSince = now(); };
    const onKey = e => { if (e.key === 'ArrowLeft') { yaw -= 6; idleSince = now(); e.preventDefault(); } if (e.key === 'ArrowRight') { yaw += 6; idleSince = now(); e.preventDefault(); } };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', onKey);
    raf = requestAnimationFrame(frame);
    return {
      setMood(m) { if (MOODS[m]) mood = m; },
      get yaw() { return yaw; },
      draw() { draw(now()); },
      destroy() { alive = false; cancelAnimationFrame(raf); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('keydown', onKey); }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Test de réaction (PVT-B)                                             */
  /* ------------------------------------------------------------------ */
  function reaction(o) {
    // o : { zone, orb, msg, ms, left, secs, isiMin, isiMax, onDone(result) }
    let state = 'idle', endAt = 0, t0 = 0, wait = null, counter = null, clock = null, timeout = null;
    const rts = [];
    let falseStarts = 0;
    const set = (el, txt) => { if (el) el.textContent = txt; };
    function schedule() {
      clearTimeout(wait);
      if (now() >= endAt) { finish(); return; }
      state = 'waiting';
      o.zone.classList.remove('on');
      const isi = (o.isiMin + Math.random() * (o.isiMax - o.isiMin)) * 1000;
      wait = setTimeout(stimulus, Math.max(1000, isi));
    }
    function stimulus() {
      state = 'stimulus'; t0 = now();
      o.zone.classList.add('on');
      set(o.msg, '');
      counter = setInterval(() => set(o.ms, Math.round(now() - t0) + ' ms'), 16);
      timeout = setTimeout(() => { if (state === 'stimulus') respond(true); }, 10000);
    }
    function respond(missed) {
      if (state === 'idle') { start(); return; }
      if (state === 'done') return;
      if (state === 'waiting') {
        falseStarts++;
        set(o.msg, 'Trop tôt. Attendez le cercle.');
        schedule();
        return;
      }
      if (state !== 'stimulus') return;
      clearInterval(counter); clearTimeout(timeout);
      const rt = missed ? 10000 : now() - t0;
      if (rt < 100) { falseStarts++; set(o.msg, 'Trop tôt. Attendez le cercle.'); }
      else { rts.push(rt); set(o.ms, Math.round(rt) + ' ms'); set(o.msg, ''); }
      o.zone.classList.remove('on');
      state = 'feedback';
      wait = setTimeout(schedule, 800);
    }
    function start() {
      rts.length = 0; falseStarts = 0;
      endAt = now() + o.secs * 1000;
      o.zone.classList.add('running');
      set(o.msg, 'Regardez le cercle…'); set(o.ms, '');
      clock = setInterval(() => set(o.left, mmss((endAt - now()) / 1000) + ' restantes'), 250);
      schedule();
    }
    function finish() {
      state = 'done';
      clearTimeout(wait); clearInterval(counter); clearInterval(clock); clearTimeout(timeout);
      o.zone.classList.remove('on', 'running');
      set(o.msg, 'Terminé.'); set(o.left, '');
      if (o.onDone) o.onDone({ rts: rts.slice(), falseStarts });
    }
    const onPointer = e => { e.preventDefault(); respond(false); };
    const onKey = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); respond(false); } };
    const onDocKey = e => { if (state !== 'idle' && state !== 'done' && e.key === ' ') { e.preventDefault(); respond(false); } };
    o.zone.addEventListener('pointerdown', onPointer);
    o.zone.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onDocKey);
    return {
      get state() { return state; },
      destroy() { clearTimeout(wait); clearInterval(counter); clearInterval(clock); clearTimeout(timeout); o.zone.removeEventListener('pointerdown', onPointer); o.zone.removeEventListener('keydown', onKey); document.removeEventListener('keydown', onDocKey); state = 'done'; }
    };
  }

  root.AURA_RELAX = { breathing, scene, reaction, MOODS };
})(typeof self !== 'undefined' ? self : this);
