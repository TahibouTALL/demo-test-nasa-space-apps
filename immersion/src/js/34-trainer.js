/* ================= entraîneur : urgences pas à pas =================
   Une consigne courte, un pictogramme animé, un geste à faire dans la scène (toucher,
   maintenir, rythmer, choisir), puis l'animation du geste. Le décor est l'intérieur réel
   de l'ISS (modèle NASA) ; le patient est un mannequin d'entraînement. */
const SIMS2 = {};
const SIM_ORDER = [];
function defineSim(def) { SIMS2[def.key] = def; SIM_ORDER.push(def.key); }

const SIM_SRC = {
  hink: { title: 'Hinkelbein J. et al. (2020). Réanimation cardio-pulmonaire en apesanteur : recommandations DGLRM et ESAM-SMG. Scand J Trauma Resusc Emerg Med 28:108', url: 'https://doi.org/10.1186/s13049-020-00793-y' },
  esc25: { title: 'European Society of Cardiology (2025). Arrêt cardiaque dans l\'espace : le massage automatique plus efficace en apesanteur', url: 'https://www.escardio.org/news/press/press-releases/cardiac-arrest-in-space-new-research-shows-that-automatic-chest-compressions-are-more-effective-for-cpr-when-both-rescuer-and-patient-are-floating-in-microgravity/' },
  rcukAna: { title: 'Resuscitation Council UK (2021). Emergency treatment of anaphylaxis', url: 'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis/emergency-treatment' },
  erc21: { title: 'European Resuscitation Council (2021). Guidelines : premiers secours (First Aid)', url: 'https://cprguidelines.eu/' },
  tobias: { title: 'Tobias B. et McMillan C. (2023). Evolution of hardware and philosophy of emergency response actions on the International Space Station. SpaceOps 2023 (NASA JSC)', url: 'https://ntrs.nasa.gov/citations/20220019247' },
  dcs: { title: 'NASA OCHMO (2026). Decompression Sickness (DCS) Risk Mitigation, NASA-STD-3001 Technical Brief OCHMO-TB-037', url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-037-decompression-sickness.pdf' },
  jones: { title: 'Jones J.A. et al. (2009). Diagnostic ultrasound at Mach 20 : retroperitoneal and pelvic imaging in space. Ultrasound Med Biol 35(7):1059-1067', url: 'https://doi.org/10.1016/j.ultrasmedbio.2009.01.002' },
  uwKidney: { title: 'University of Washington (2018). Ultrasound to reposition kidney stones, for astronauts on long missions (NSBRI)', url: 'https://newsroom.uw.edu/news-releases/keeping-kidney-stones-bay-during-space-flights' },
  hemo: { title: 'External hemorrhage control techniques for human space exploration : lessons from the battlefield. Aerosp Med Hum Perform (2023)', url: 'https://pubmed.ncbi.nlm.nih.gov/36906432/' },
  eyeSpace: { title: 'Ocular complaints and diagnoses in spaceflight. npj Microgravity (2024)', url: 'https://www.nature.com/articles/s41526-023-00335-7' },
  fiches: { title: 'Base de connaissances AURA : fiches et probabilités du modèle médical intégré de la NASA (IMM)', url: '' }
};

const Trainer = {
  def: null, W: null, exp: null, i: -1, running: false, errors: 0, t0: 0, orbit: null, camTween: null, exam: false,
  hots: new Map(), beats: [], quality: { inRange: 0, total: 0 }, token: 0,

  ensureOrbit() {
    if (this.orbit) return this.orbit;
    const o = new OrbitControls(camera, canvas);
    o.enableDamping = true; o.dampingFactor = 0.09; o.enablePan = false;
    o.rotateSpeed = 0.55; o.zoomSpeed = 0.8; o.minDistance = 0.3; o.maxDistance = 3.2;
    o.enabled = false;
    o.addEventListener('start', () => { const h = $('#trHint'); if (h) h.style.opacity = '0'; });
    this.orbit = o;
    return o;
  },
  // déplacement de caméra en douceur vers un plan (position, cible, focale)
  shot(spec, dur = 1.3) {
    const o = this.ensureOrbit();
    const pos = typeof spec.pos === 'function' ? spec.pos(this.free || 0.6) : spec.pos.clone();
    const tgt = typeof spec.target === 'function' ? spec.target() : spec.target.clone();
    const d = pos.distanceTo(tgt);
    o.minDistance = Math.max(0.18, d * 0.45); o.maxDistance = Math.max(1.2, d * 2.2);
    this.camTween = { p0: camera.position.clone(), t0: o.target.clone(), p1: pos, t1: tgt, f0: camera.fov, f1: spec.fov || 50, t: 0, dur };
    o.enabled = false;
    return new Promise(r => { this.camTween.done = r; });
  },
  orbitUpdate(dt) {
    const o = this.orbit, c = this.camTween;
    const lift = !this.running ? 0 : (this.liftTarget ?? 0.13);
    this.lift = this.lift === undefined ? lift : this.lift + (lift - this.lift) * Math.min(1, dt * 4);
    const key = innerWidth + 'x' + innerHeight + ':' + this.lift.toFixed(3);
    if (key !== this._vo) { this._vo = key; camera.setViewOffset(innerWidth, innerHeight, 0, Math.round(innerHeight * this.lift), innerWidth, innerHeight); }
    if (c) {
      c.t = Math.min(1, c.t + dt / c.dur);
      const e = easeIO(c.t);
      camera.position.lerpVectors(c.p0, c.p1, e);
      o.target.lerpVectors(c.t0, c.t1, e);
      camera.fov = c.f0 + (c.f1 - c.f0) * e; camera.updateProjectionMatrix();
      camera.lookAt(o.target);
      if (c.t >= 1) { this.camTween = null; o.enabled = this.running; c.done && c.done(); }
    } else if (o) o.update();
    this.placeHots();
  },

  // zone libre de l'écran (entre la barre du haut et le bloc de consigne) : centre et hauteur
  layout(s) {
    const top = 104;
    const card = $('#trCard').getBoundingClientRect();
    const perRow = Math.max(1, Math.floor(Math.min(680, innerWidth - 32) / 160));
    const wh = !s ? 0 : s.type === 'choice' ? 70 * Math.ceil(s.options.length / perRow) + 10 : s.type === 'rhythm' ? 118 : s.btn ? 64 : 0;
    const bottom = (card.top || innerHeight * 0.8) - wh - 10;
    this.free = clamp((bottom - top) / innerHeight, 0.28, 0.85);
    this.liftTarget = 0.5 - (top + bottom) / 2 / innerHeight;
  },
  // garde la caméra dans le module : on avance vers la cible si la paroi est plus proche
  clampCam(p, a) {
    const mod = this.exp && this.exp.module; if (!mod) return p;
    const u = mod.userData, m = 0.1;
    const lo = new THREE.Vector3(-(u.aisle.xn - m), -(u.aisle.yn - m), -(u.half + 0.3)), hi = new THREE.Vector3(u.aisle.xp - m, u.aisle.yp - m, u.half + 0.3);
    const d = p.clone().sub(a); const L = d.length(); if (L < 1e-6) return p; d.divideScalar(L);
    let t = L;
    for (const k of ['x', 'y', 'z']) {
      if (d[k] > 1e-6) t = Math.min(t, (hi[k] - a[k]) / d[k]);
      else if (d[k] < -1e-6) t = Math.min(t, (lo[k] - a[k]) / d[k]);
    }
    return a.clone().addScaledVector(d, Math.max(0.12, t));
  },

  /* ---------- démarrage ---------- */
  intro(key) {
    const def = SIMS2[key];
    if (!def) return;
    this.def = def;
    $('#tiTitle').textContent = def.title;
    $('#tiText').textContent = def.intro;
    $('#tiRole').textContent = def.role;
    $('#tiMeta').innerHTML = [def.fiche ? 'Fiche ' + def.fiche : 'Urgence du vaisseau', def.steps.length + ' étapes', 'environ ' + (def.minutes || 3) + ' min'].map(x => `<span class="chip">${esc(x)}</span>`).join('');
    $('#tiImg').style.backgroundImage = `url('img/sims/${def.key}.webp')`;
    $('#trIntro').hidden = false;
    $('#tiGo').onclick = () => { $('#trIntro').hidden = true; Sound.init(); this.start(key); };
    $('#tiBack').onclick = () => { $('#trIntro').hidden = true; if (EMBED) { postParent({ type: 'aura-exit' }); } };
  },
  async start(key) {
    const def = SIMS2[key];
    this.def = def;
    this.token++;
    Sound.init();
    App.view = 'sim';
    $('#menu').hidden = true;
    App.setTitle(def.title);
    let exp;
    try { exp = await openExperience('iss-' + def.env, { loadingText: 'Préparation du module' }); } catch (e) { console.error(e); App.loading(false); return; }
    exp.clearExtras();
    this.exp = exp;
    App.loading(true, 'Préparation du patient');
    const W = this.W = await this.world(exp, def);
    App.loading(false);
    App.camMode = 'orbit';
    App.orbitUpdate = dt => this.orbitUpdate(dt);
    const o = this.ensureOrbit();
    camera.near = 0.02; camera.updateProjectionMatrix();
    const first = W.shots[def.steps[0].cam] || W.shots.wide;
    $('#trHud').hidden = false; this.layout(def.steps[0]);
    camera.position.copy(typeof first.pos === 'function' ? first.pos(this.free) : first.pos);
    o.target.copy(typeof first.target === 'function' ? first.target() : first.target);
    camera.fov = first.fov || 50; camera.updateProjectionMatrix(); camera.lookAt(o.target);
    Sound.setAmbience(stationAudio);
    this.errors = 0; this.quality = { inRange: 0, total: 0 }; this.t0 = performance.now(); this.running = true;
    $('#trHud').hidden = false; $('#trEnd').hidden = true;
    $('#trHint').style.opacity = '1'; setTimeout(() => { const h = $('#trHint'); if (h) h.style.opacity = '0'; }, 8000);
    $('#trDots').innerHTML = def.steps.map(() => '<i></i>').join('');
    const my = this.token;
    for (let i = 0; i < def.steps.length; i++) {
      if (my !== this.token) return;
      this.i = i;
      await this.runStep(def.steps[i], i);
    }
    if (my !== this.token) return;
    this.finish(true);
  },

  /* ---------- monde de la simulation ---------- */
  async world(exp, def) {
    const W = {
      exp, def, extras: exp.extras, props: {}, anchors: {}, shots: {}, st: {},
      add(o) { exp.extras.add(o); return o; },
      every(f) { exp.updaters.add(f); return () => exp.updaters.delete(f); },
      anchor(k) {
        const a = W.anchors[k];
        if (a) return typeof a === 'function' ? a() : a.clone();
        if (W.patient) return W.patient.world(k);
        return new THREE.Vector3();
      },
      toast: (t, kind) => this.toast(t, kind),
      voice: t => Sound.speak(t),
      wait,
      shot: (k, d) => this.shot(typeof k === 'string' ? W.shots[k] : k, d)
    };
    if (def.patient) {
      W.patient = await buildPatient(def.patient);
      W.add(W.patient.root);
      W.every(dt => W.patient.update(dt));
    }
    W.gloveR = await makeGlove('open', 'R', 'real'); W.gloveL = await makeGlove('open', 'L', 'real');
    W.gloveR.visible = W.gloveL.visible = false; W.add(W.gloveR); W.add(W.gloveL);
    W.ghostR = await makeGlove('open', 'R', 'ghost'); W.ghostL = await makeGlove('open', 'L', 'ghost');
    W.ghostGrip = await makeGlove('grip', 'R', 'ghost'); W.gripR = await makeGlove('grip', 'R', 'real');
    for (const g of [W.ghostR, W.ghostL, W.ghostGrip, W.gripR]) { g.visible = false; W.add(g); }
    // plan large par défaut
    W.shots.wide = { pos: new THREE.Vector3(0.7, 0.35, 1.6), target: new THREE.Vector3(0, -0.1, -0.3), fov: 55 };
    await def.setup(W);
    return W;
  },

  /* ---------- une étape ---------- */
  async runStep(s, i) {
    const def = this.def, W = this.W, my = this.token;
    this._complete = null;
    $$('#trDots i').forEach((d, k) => d.className = k < i ? 'ok' : k === i ? 'now' : '');
    $('#trN').textContent = `Étape ${i + 1} sur ${def.steps.length}`;
    $('#trSay').textContent = s.say;
    $('#trSub').textContent = s.sub || '';
    $('#trPicto').innerHTML = picto(s.picto || 'question');
    $('#trCard').classList.remove('done'); $('#trCard').classList.add('in');
    setTimeout(() => $('#trCard').classList.remove('in'), 450);
    $('#trWidget').innerHTML = ''; $('#trWidget').hidden = true;
    if (s.enter) await s.enter(W);
    this.layout(s);
    if (s.cam) W.shot(s.cam);
    if (s.voice !== false) Sound.speak(s.voice || s.say);
    let stopDemo = null;
    const demo = () => { if (s.demo && !this.exam) { if (stopDemo) stopDemo(); stopDemo = s.demo(W); } };
    demo();
    $('#trReplay').hidden = !s.demo || this.exam;
    $('#trReplay').onclick = () => { demo(); Sound.speak(s.voice || s.say); };
    try {
      if (s.type === 'tap' || s.type === 'hold') await this.doTap(s);
      else if (s.type === 'rhythm') await this.doRhythm(s);
      else if (s.type === 'choice') await this.doChoice(s);
      else await this.doWatch(s);
    } finally { if (stopDemo) stopDemo(); this.clearHots(); }
    if (my !== this.token) return;
    $('#trWidget').innerHTML = ''; $('#trWidget').hidden = true;
    if (s.done) await s.done(W);
    if (my !== this.token) return;
    if (s.ok) this.toast(s.ok, 'ok');
    Sound.ok();
    $('#trCard').classList.add('done');
    await wait(s.pause ?? 900);
  },

  /* ---------- toucher ou maintenir un point de la scène ---------- */
  doTap(s) {
    const W = this.W;
    const goods = [].concat(s.hot);
    const need = s.all ? goods.length : 1;
    let got = 0;
    return new Promise(res => {
      const doneOne = (k) => {
        got++;
        const h = this.hots.get(k); if (h) { h.el.classList.add('hit'); h.dead = true; }
        if (s.each) s.each(W, k, got);
        if (got >= need) res();
      };
      this._complete = () => goods.forEach(k => { const h = this.hots.get(k); if (h && !h.dead) doneOne(k); });
      const lab = k => this.exam ? null : (s.labels || {})[k] || (goods.includes(k) ? s.label : null);
      goods.forEach(k => this.addHot(k, { label: lab(k), hold: s.type === 'hold' ? (s.secs || 3) : 0, onDone: () => doneOne(k) }));
      (s.decoys || []).forEach(k => this.addHot(k, { label: lab(k), onDone: () => { this.errors++; Sound.err(); this.toast((s.why || {})[k] || 'Pas ici. Regarde la consigne.', 'ko'); const h = this.hots.get(k); if (h) { h.el.classList.add('shake'); setTimeout(() => h.el.classList.remove('shake'), 500); } } }));
    });
  },
  addHot(key, { label, hold = 0, onDone }) {
    const el = document.createElement('button');
    el.className = 'hot' + (hold ? ' holdable' : '');
    el.setAttribute('aria-label', label || 'Toucher ici');
    el.innerHTML = `<span class="ring"></span><span class="core"></span>${hold ? '<svg class="prog" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28"/></svg>' : ''}${label ? `<span class="tag">${esc(label)}</span>` : ''}`;
    $('#trHots').appendChild(el);
    const h = { key, el, dead: false };
    this.hots.set(key, h);
    if (!hold) {
      el.onclick = () => { if (h.dead) return; Sound.click(); onDone(); };
    } else {
      let t0 = 0, raf = 0;
      const circ = el.querySelector('.prog circle');
      const len = 2 * Math.PI * 28;
      circ.style.strokeDasharray = len; circ.style.strokeDashoffset = len;
      const stop = (complete) => {
        cancelAnimationFrame(raf);
        if (!complete) { circ.style.strokeDashoffset = len; if (t0 && !h.dead) this.toast('Garde appuyé jusqu\'au bout du cercle', 'info'); }
        t0 = 0; el.classList.remove('holding');
      };
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / (hold * 1000));
        circ.style.strokeDashoffset = len * (1 - k);
        if (k >= 1) { stop(true); Sound.click(); onDone(); return; }
        raf = requestAnimationFrame(tick);
      };
      el.onpointerdown = e => { if (h.dead) return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } t0 = performance.now(); el.classList.add('holding'); if (this.def && this.W && this.def.steps[this.i].onHold) this.def.steps[this.i].onHold(this.W); tick(); };
      el.onpointerup = el.onpointercancel = () => { if (t0) stop(false); };
      el.onkeydown = e => { if ((e.key === ' ' || e.key === 'Enter') && !t0 && !h.dead) { e.preventDefault(); t0 = performance.now(); el.classList.add('holding'); tick(); } };
      el.onkeyup = e => { if ((e.key === ' ' || e.key === 'Enter') && t0) stop(false); };
    }
    this.placeHots();
    return h;
  },
  clearHots() { this.hots.forEach(h => h.el.remove()); this.hots.clear(); },
  placeHots() {
    if (!this.hots.size || !this.W) return;
    const w = innerWidth, hgt = innerHeight;
    for (const h of this.hots.values()) {
      const p = this.W.anchor(h.key).project(camera);
      const vis = p.z < 1 && p.z > -1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
      h.el.style.display = vis ? '' : 'none';
      if (vis) h.el.style.transform = `translate(${((p.x + 1) / 2 * w).toFixed(1)}px, ${((1 - p.y) / 2 * hgt).toFixed(1)}px)`;
    }
  },

  /* ---------- rythme (massage cardiaque, tapes) ---------- */
  doRhythm(s) {
    const W = this.W;
    const [lo, hi] = s.bpm || [100, 120];
    const n = s.count || 30;
    const wg = $('#trWidget');
    wg.hidden = false;
    wg.innerHTML = `<div class="rhythm"><button class="beat" id="rhBtn" aria-label="Appuyer"><span class="pulse" style="animation-duration:${(60 / ((lo + hi) / 2)).toFixed(3)}s"></span><b id="rhCount">0</b><small>sur ${n}</small></button>
      <div class="rate"><div class="bar"><i class="zone" style="left:${((lo - 60) / 100 * 100).toFixed(0)}%;width:${((hi - lo) / 100 * 100).toFixed(0)}%"></i><i class="needle" id="rhNeedle"></i></div><div class="lbls"><span>lent</span><span>${lo} à ${hi} par minute</span><span>rapide</span></div><p id="rhMsg">${esc(s.hint || 'Appuie sur le bouton, ou sur la barre d\'espace, au rythme du cercle')}</p></div></div>`;
    const times = [];
    let count = 0, metroT = 0;
    const metro = W.every(dt => { metroT += dt; const per = 60 / ((lo + hi) / 2); if (metroT >= per) { metroT -= per; if (count < n) Sound.tick(); } });
    return new Promise(res => {
      const beat = () => {
        if (count >= n) return;
        const now = performance.now();
        times.push(now); count++;
        $('#rhCount').textContent = count;
        $('#rhBtn').classList.remove('hit'); void $('#rhBtn').offsetWidth; $('#rhBtn').classList.add('hit');
        if (s.onBeat) s.onBeat(W, count);
        if (times.length >= 3) {
          const last = times.slice(-5); const per = (last[last.length - 1] - last[0]) / (last.length - 1) / 1000;
          const rate = 60 / per;
          this.quality.total++;
          if (rate >= lo - 5 && rate <= hi + 5) this.quality.inRange++;
          $('#rhNeedle').style.left = clamp((rate - 60) / 100 * 100, 0, 100).toFixed(1) + '%';
          $('#rhMsg').textContent = rate < lo - 5 ? 'Plus vite' : rate > hi + 5 ? 'Un peu moins vite' : 'Bon rythme, continue';
          $('#rhMsg').className = rate < lo - 5 || rate > hi + 5 ? 'warn' : 'good';
        }
        if (count >= n) { window.removeEventListener('keydown', key); metro(); setTimeout(res, 350); }
      };
      const key = e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) beat(); } };
      this._complete = () => { let k = 0; const iv = setInterval(() => { beat(); if (++k >= n) clearInterval(iv); }, 545); };
      window.addEventListener('keydown', key);
      $('#rhBtn').addEventListener('pointerdown', e => { e.preventDefault(); beat(); });
    });
  },

  /* ---------- choix rapide ---------- */
  doChoice(s) {
    const wg = $('#trWidget');
    wg.hidden = false;
    wg.innerHTML = `<div class="choices">${s.options.map((o, k) => `<button class="opt" data-k="${k}">${o.picto ? picto(o.picto) : ''}<span>${esc(o.label)}</span></button>`).join('')}</div>`;
    return new Promise(res => {
      this._complete = () => { const k = s.options.findIndex(o => o.ok); $$('.opt', wg)[k].click(); };
      $$('.opt', wg).forEach(b => b.onclick = () => {
        const o = s.options[+b.dataset.k];
        if (o.ok) { b.classList.add('good'); Sound.click(); setTimeout(res, 450); }
        else { this.errors++; Sound.err(); b.classList.add('bad'); this.toast(o.why || 'Pas tout à fait. Relis la consigne.', 'ko'); setTimeout(() => b.classList.remove('bad'), 700); }
      });
    });
  },

  /* ---------- observer (l'action se déroule seule) ---------- */
  async doWatch(s) {
    const wg = $('#trWidget');
    if (s.btn) {
      wg.hidden = false;
      wg.innerHTML = `<div class="choices one"><button class="opt primary" id="wBtn"><span>${esc(s.btn)}</span></button></div>`;
    }
    const p = s.watch ? s.watch(this.W) : wait(s.secs ? s.secs * 1000 : 1500);
    await p;
    if (s.btn) await new Promise(r => { this._complete = r; $('#wBtn').onclick = () => { Sound.click(); r(); }; });
  },

  toast(text, kind = 'info') {
    const el = $('#trToast');
    el.textContent = text; el.className = 'tr-toast ' + kind; el.hidden = false;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { el.hidden = true; }, kind === 'ko' ? 4200 : 2600);
  },

  /* ---------- fin et bilan ---------- */
  finish(success) {
    if (!this.running) return;
    this.running = false;
    this.token++;
    const def = this.def;
    const secs = Math.round((performance.now() - this.t0) / 1000);
    const rq = this.quality.total ? this.quality.inRange / this.quality.total : 1;
    const verdict = !success ? 'Interrompue' : this.errors === 0 && rq >= 0.6 ? 'Bien mené' : this.errors <= 2 ? 'Correct' : 'À revoir';
    try { speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* rien */ }
    Sound.stopAlarm();
    const hist = store.get('sims', []);
    hist.unshift({ d: Date.now(), k: def.key, v: verdict, t: secs });
    store.set('sims', hist.slice(0, 40));
    $('#trHud').hidden = true;
    if (this.orbit) this.orbit.enabled = false;
    $('#teBody').innerHTML = `
      <div class="te-head"><span class="medal ${success ? 'ok' : ''}">${picto(success ? 'check' : 'clock')}</span>
      <div><p class="te-k">${success ? 'Simulation terminée' : 'Simulation interrompue'}</p><h2 id="teTitle">${esc(def.title)}</h2>
      <div class="te-chips"><span class="chip strong">${esc(verdict)}</span><span class="chip">${fmtDur(secs)}</span>${this.errors ? `<span class="chip">${this.errors} erreur${this.errors > 1 ? 's' : ''} corrigée${this.errors > 1 ? 's' : ''}</span>` : '<span class="chip">sans erreur</span>'}${this.quality.total ? `<span class="chip">rythme juste ${Math.round(rq * 100)} %</span>` : ''}</div></div></div>
      ${success && def.outcome ? `<p class="lead">${esc(def.outcome)}</p>` : ''}
      <h3>À retenir</h3><ul class="learn">${def.learn.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <h3>Sources</h3><ul class="src">${def.sources.map(k => SIM_SRC[k] || k).map(s => s.url ? `<li><a class="link" href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a></li>` : `<li>${esc(s.title)}</li>`).join('')}</ul>
      <p class="small-print">Entraînement sur mannequin. Les gestes suivent la fiche AURA et les sources citées ; les réactions du patient sont simplifiées.</p>
      <div class="actions"><button class="btn" id="teAgain">Recommencer</button><button class="btn primary" id="teMenu">${EMBED ? 'Revenir à AURA' : 'Retour au menu'}</button></div>`;
    $('#trEnd').hidden = false;
    $('#teAgain').onclick = () => { $('#trEnd').hidden = true; this.start(def.key); };
    $('#teMenu').onclick = () => {
      $('#trEnd').hidden = true;
      this.stop();
      if (EMBED) { postParent({ type: 'aura-sim-end', key: def.key, outcome: success ? 'succes' : 'arret', verdict, seconds: secs }); return; }
      goMenu();
    };
  },
  stop() {
    this.token++;
    this.running = false;
    this.clearHots();
    $('#trHud').hidden = true; $('#trIntro').hidden = true;
    if (this.orbit) this.orbit.enabled = false;
    camera.clearViewOffset(); this._vo = null; this.lift = undefined;
    App.camMode = 'look'; App.orbitUpdate = null;
    Sound.stopAlarm();
    if (this.exp) this.exp.clearExtras();
    this.W = null;
  }
};

/* ---------- sons de l'entraînement ---------- */
Object.assign(Sound, {
  alarmNode: null,
  ok() { this.beep(660, 0.09, 0.07, 'sine'); this.beep(990, 0.14, 0.07, 'sine', 0.09); },
  err() { this.beep(180, 0.18, 0.08, 'square'); },
  click() { this.beep(1400, 0.03, 0.05, 'triangle'); },
  tick() { this.beep(1800, 0.02, 0.03, 'square'); },
  // tonalités d'urgence (approchées) : incendie, dépressurisation, atmosphère toxique
  alarm(kind = 'fire') {
    this.stopAlarm();
    const ctx = this.init(); if (!ctx) return;
    let t = 0; const per = kind === 'depress' ? 1.2 : kind === 'atm' ? 0.9 : 0.5;
    const id = setInterval(() => {
      if (!this.on) return;
      if (kind === 'fire') { this.beep(t % 2 ? 1250 : 950, 0.24, 0.05, 'square'); }
      else if (kind === 'depress') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1400, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.9); g.gain.setValueAtTime(0.04, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1); o.connect(g).connect(this.out); o.start(); o.stop(ctx.currentTime + 1.05); }
      else { this.beep(880, 0.12, 0.05, 'square'); this.beep(880, 0.12, 0.05, 'square', 0.25); }
      t++;
    }, per * 1000);
    this.alarmNode = id;
  },
  stopAlarm() { if (this.alarmNode) { clearInterval(this.alarmNode); this.alarmNode = null; } }
});

/* ---------- plan cadré : « at » au centre de la zone libre, « size » mètres visibles en hauteur ---------- */
function fit(at, { size = 1, dir = new THREE.Vector3(0, 0.3, 1), fov = 45 } = {}) {
  const A = () => (typeof at === 'function' ? at() : typeof at === 'string' ? Trainer.W.anchor(at) : at.clone());
  return {
    fov, size,
    target: () => A(),
    pos: (free = 0.6) => {
      const a = A();
      const d = (typeof dir === 'function' ? dir() : dir.clone()).normalize();
      const dist = size / (2 * Math.tan(fov * Math.PI / 360) * free);
      return Trainer.clampCam(a.clone().addScaledVector(d, dist), a);
    }
  };
}

/* ---------- gestes fantômes : le geste se montre en boucle jusqu'à ce qu'on le fasse ---------- */
// objet qui va de « from » à « to » et revient, avec une pause à l'arrivée
function ghostMove(W, obj, from, to, { period = 2.2, quat } = {}) {
  obj.visible = true;
  if (quat) obj.quaternion.copy(quat);
  let t = 0;
  const off = W.every(dt => {
    t = (t + dt / period) % 1;
    const k = t < 0.45 ? easeIO(t / 0.45) : t < 0.75 ? 1 : 1 - easeIO((t - 0.75) / 0.25);
    obj.position.lerpVectors(typeof from === 'function' ? from() : from, typeof to === 'function' ? to() : to, k);
  });
  return () => { off(); obj.visible = false; };
}
// place un gant pour que le talon de la main touche « contact » (paume vers « palm »)
function glovePlace(g, contact, palm, fingers, heel = 0.028, thick = 0.016) {
  g.position.copy(contact).addScaledVector(fingers.clone().normalize(), -heel).addScaledVector(palm.clone().normalize(), -thick);
}
// mains empilées qui appuient en rythme sur un point (massage, compression d'une plaie)
function pressHands(R, L, at, palm, fingers, k, lift = 0.03, depth = 0.05) {
  const C = (typeof at === 'function' ? at() : at).clone().addScaledVector(palm, -lift + k * (lift + depth));
  orientGlove(R, palm, fingers); glovePlace(R, C, palm, fingers);
  if (L) { const f2 = fingers.clone().applyAxisAngle(palm.clone().normalize(), 0.35); orientGlove(L, palm, f2); glovePlace(L, C.clone().addScaledVector(palm, -0.032), palm, f2); }
}
function ghostPress(W, at, { palm = new THREE.Vector3(0, -1, 0), fingers = new THREE.Vector3(-1, 0, 0), rate = 110, depth = 0.05, both = true } = {}) {
  const R = W.ghostR, L = W.ghostL;
  R.visible = true; L.visible = both;
  let t = 0;
  const off = W.every(dt => {
    t += dt * rate / 60;
    const k = Math.max(0, Math.sin(t * Math.PI * 2));
    pressHands(R, both ? L : null, at, palm, fingers, k, 0.03, depth);
  });
  return () => { off(); R.visible = false; L.visible = false; };
}
