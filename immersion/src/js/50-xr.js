/* ================= mode casque (WebXR) ================= */
const XR = {
  supported: false, session: null, group: null, panel: null, canvas: null, ctx: null, tex: null, buttons: [], ctrls: [], ray: new THREE.Raycaster(), redrawT: 0, page: 0,
  async detect() {
    if (!HAS_GL || !navigator.xr || !window.isSecureContext) return false;
    try { this.supported = await navigator.xr.isSessionSupported('immersive-vr'); } catch (e) { this.supported = false; }
    return this.supported;
  },
  async enter() {
    if (!this.supported) return;
    if (this.session) { try { await this.session.end(); } catch (e) { /* rien */ } return; }
    try {
      Sound.init();
      const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'hand-tracking'] });
      this.session = s;
      s.addEventListener('end', () => this.onEnd());
      rig.rotation.set(0, look.yaw, 0);
      camera.rotation.set(0, 0, 0);
      await renderer.xr.setSession(s);
      this.build();
      updateVRButton();
    } catch (e) { console.warn('Casque indisponible', e); this.session = null; }
  },
  onEnd() {
    this.session = null;
    rig.rotation.set(0, 0, 0);
    if (this.group) { rig.remove(this.group); disposeScene(this.group); this.group = null; }
    for (const c of this.ctrls) rig.remove(c);
    this.ctrls = [];
    updateVRButton();
  },
  build() {
    this.group = new THREE.Group();
    rig.add(this.group);
    this.canvas = document.createElement('canvas'); this.canvas.width = 1024; this.canvas.height = 640;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.6), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false, depthTest: false }));
    this.panel.renderOrder = 100; this.panel.position.set(0, -0.3, -1.05); this.panel.rotation.x = -0.3;
    this.group.add(this.panel);
    this.monTex = new THREE.CanvasTexture($('#monitor')); this.monTex.colorSpace = THREE.SRGBColorSpace;
    this.monPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.4), new THREE.MeshBasicMaterial({ map: this.monTex, toneMapped: false, depthTest: false }));
    this.monPlane.renderOrder = 100; this.monPlane.position.set(-0.66, 0.06, -0.95); this.monPlane.rotation.y = 0.5;
    this.group.add(this.monPlane);
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x9b8cf6, transparent: true, opacity: 0.8 }));
      line.scale.z = 3; c.add(line);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
      dot.renderOrder = 101; dot.visible = false; this.group.add(dot);
      c.userData.dot = dot; c.userData.line = line;
      c.addEventListener('selectstart', () => this.select(c));
      rig.add(c); this.ctrls.push(c);
    }
    this.draw();
  },
  hit(c) {
    const m = new THREE.Matrix4().extractRotation(c.matrixWorld);
    this.ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
    this.ray.ray.direction.set(0, 0, -1).applyMatrix4(m);
    return this.ray.intersectObject(this.panel, false)[0];
  },
  select(c) {
    const h = this.hit(c);
    if (!h) { if (App.view === 'sim' && Sim.S && Sim.S.flags.cpr && Sim.S.flags.cpr.tap) cprTapNow(); return; }
    const x = h.uv.x * 1024, y = (1 - h.uv.y) * 640;
    const b = this.buttons.find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
    if (b) { Sound.beep(700, 0.04, 0.04); try { b.fn(); } catch (e) { console.error(e); } this.draw(); }
  },
  update(dt) {
    if (!this.session || !this.group) return;
    for (const c of this.ctrls) {
      const h = this.hit(c);
      c.userData.dot.visible = !!h;
      if (h) { c.userData.dot.position.copy(this.group.worldToLocal(h.point.clone())); c.userData.line.scale.z = h.distance; }
      else c.userData.line.scale.z = 3;
    }
    this.monPlane.visible = App.view === 'sim' && $('#usPanel').hidden;
    if (this.monPlane.visible) this.monTex.needsUpdate = true;
    this.redrawT -= dt;
    if (this.redrawT <= 0) { this.redrawT = App.view === 'relax' || !$('#usPanel').hidden ? 0.06 : 0.25; this.draw(); }
  },
  btn(x, y, w, h, label, fn, opts = {}) {
    const g = this.ctx;
    g.fillStyle = opts.on ? 'rgba(124,107,234,0.9)' : opts.primary ? '#7c6bea' : 'rgba(40,42,52,0.95)';
    g.strokeStyle = opts.on ? '#cfc6ff' : 'rgba(255,255,255,0.14)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 14) : g.rect(x, y, w, h); g.fill(); g.stroke();
    g.fillStyle = opts.dim ? '#8c8fa0' : '#eeeef3';
    g.font = `600 ${opts.size || 24}px ` + getComputedStyle(document.body).fontFamily;
    g.textBaseline = 'middle';
    this.wrap(label, x + 14, y + h / 2, w - 28, (opts.size || 24) * 1.15, opts.center);
    this.buttons.push({ x, y, w, h, fn });
  },
  wrap(text, x, y, maxW, lh, center, maxLines = 3) {
    const g = this.ctx, words = String(text).split(' ');
    const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    const L = lines.slice(0, maxLines);
    const y0 = y - (L.length - 1) * lh / 2;
    L.forEach((l, i) => { g.textAlign = center ? 'center' : 'left'; g.fillText(l, center ? x + maxW / 2 : x, y0 + i * lh); });
    g.textAlign = 'left';
  },
  text(t, x, y, size, color, weight = 500) {
    const g = this.ctx; g.fillStyle = color; g.font = `${weight} ${size}px ` + getComputedStyle(document.body).fontFamily; g.textBaseline = 'alphabetic'; g.fillText(t, x, y);
  },
  draw() {
    if (!this.ctx) return;
    const g = this.ctx, W = 1024, H = 640;
    this.buttons = [];
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(15,16,21,0.9)';
    g.beginPath(); g.roundRect ? g.roundRect(0, 0, W, H, 28) : g.rect(0, 0, W, H); g.fill();
    if (App.view === 'menu') this.drawMenu();
    else if (App.view === 'relax') this.drawRelax();
    else if (App.view === 'sim') { if (!$('#usPanel').hidden) this.drawUS(); else this.drawSim(); }
    this.tex.needsUpdate = true;
  },
  drawMenu() {
    this.text('AURA Immersion', 40, 64, 38, '#eeeef3', 720);
    this.text('Se détendre', 40, 120, 24, '#9b8cf6', 650);
    this.text('S\'entraîner', 532, 120, 24, '#9b8cf6', 650);
    RELAX_CARDS.forEach((c, i) => this.btn(40, 140 + i * 102, 452, 88, c.title, () => { Relax.key = c.key; Relax.breath = true; Relax.dur = 600; Relax.moodBefore = null; Relax.start(true); }));
    SIM_CARDS.forEach((c, i) => this.btn(532, 140 + i * 102, 452, 88, c.title, () => { Sim.def = SIMS[c.key]; Sim.mode = 'guide'; Sim.comm = 'directe'; Sim.start(); }));
    this.btn(392, 560, 240, 56, 'Quitter le casque', () => this.session && this.session.end(), { center: true, size: 22 });
  },
  drawRelax() {
    const g = this.ctx;
    this.text(EXPERIENCES[Relax.key] ? EXPERIENCES[Relax.key].title : '', 40, 60, 30, '#eeeef3', 700);
    this.text(isFinite(Relax.left) ? fmtClock(Relax.left) : '', 880, 60, 30, '#b7b9c7', 600);
    if (!Relax.running && !$('#after').hidden) {
      this.text('Séance terminée. Votre stress maintenant ?', 40, 140, 28, '#eeeef3', 650);
      STRESS.forEach((s, i) => this.btn(40 + i * 190, 170, 175, 96, `${i + 1} ${s}`, () => { Relax.after = i + 1; Relax.saveResult(Math.max(1, Math.round((performance.now() - Relax.startT) / 60000))); }, { on: Relax.after === i + 1, center: true }));
      if (Relax.after) this.text(`Stress ${Relax.moodBefore ?? '?'} avant, ${Relax.after} après.`, 40, 330, 26, '#bdebd3', 600);
      this.btn(40, 540, 300, 64, 'Rester dans la scène', () => { $('#after').hidden = true; Relax.left = Infinity; Relax.running = true; }, { center: true });
      this.btn(684, 540, 300, 64, 'Retour au menu', () => { $('#after').hidden = true; goMenu(); }, { primary: true, center: true });
      return;
    }
    const k = Relax.breathK ?? 0.5;
    g.strokeStyle = 'rgba(207,198,255,0.9)'; g.lineWidth = 6;
    g.beginPath(); g.arc(512, 290, 70 + 110 * k, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(155,140,246,0.18)'; g.fill();
    this.ctx.textAlign = 'center'; this.text(Relax.breathWord || 'Respirez', 512, 302, 40, '#eeeef3', 700); this.ctx.textAlign = 'left';
    const ex = App.exp;
    if (ex && ex.presets) Object.entries(ex.presets).forEach(([key, p], i) => this.btn(40, 120 + i * 80, 200, 64, p.label, () => { ex.setPreset(key); if (key === 'crepuscule') { ex.update(0.016); } }, { on: ex.st.preset === key, center: true }));
    this.btn(40, 550, 260, 64, Relax.breath ? 'Respiration : oui' : 'Respiration : non', () => { Relax.breath = !Relax.breath; }, { on: Relax.breath, center: true });
    this.btn(724, 550, 260, 64, 'Terminer', () => Relax.end(false), { primary: true, center: true });
  },
  drawSim() {
    const S = Sim.S, def = Sim.def, g = this.ctx;
    if (!S) return;
    this.text(`${def.title} · ${fmtClock(S.t)}`, 32, 50, 28, '#eeeef3', 700);
    const al = Sim.alarmNow();
    if (al) this.text('Alarme : ' + al.text, 640, 50, 24, '#ff8e85', 700);
    if (S.ended) {
      this.text(S.ended.title, 32, 130, 34, '#eeeef3', 700);
      g.font = '500 24px ' + getComputedStyle(document.body).fontFamily; g.fillStyle = '#b7b9c7';
      this.wrap(S.ended.text, 32, 200, 960, 30, false, 4);
      this.text('Le bilan détaillé s\'affiche à l\'écran, hors du casque.', 32, 330, 22, '#8c8fa0');
      this.btn(32, 540, 300, 64, 'Recommencer', () => { $('#debrief').hidden = true; Sim.stop(); Sim.start(); }, { center: true });
      this.btn(692, 540, 300, 64, 'Retour au menu', () => { $('#debrief').hidden = true; Sim.stop(); goMenu(); }, { primary: true, center: true });
      return;
    }
    g.font = '500 21px ' + getComputedStyle(document.body).fontFamily; g.fillStyle = '#c9ccd6';
    this.wrap(def.observe(S), 32, 104, 960, 26, false, 2);
    def.cats.forEach((c, i) => this.btn(32 + i * 138, 140, 128, 48, CAT_LABELS[c] || c, () => { Sim.tab = c; this.page = 0; Sim.renderTabs(); }, { on: Sim.tab === c, size: 18, center: true }));
    const acts = def.actions.filter(a => a.cat === Sim.tab && !(Sim.avail(a).hide));
    const per = 6, pages = Math.max(1, Math.ceil(acts.length / per));
    this.page = Math.min(this.page, pages - 1);
    acts.slice(this.page * per, this.page * per + per).forEach((a, i) => {
      const st = Sim.avail(a);
      const run = S.crew.some(c => c.busy && c.busy.act === a);
      const lab = (typeof a.label === 'function' ? a.label(S) : a.label) + (st.done ? ' (fait)' : run ? ' (en cours)' : '');
      this.btn(32 + (i % 2) * 484, 204 + Math.floor(i / 2) * 92, 470, 80, lab, () => Sim.act(a.id), { dim: !!(st.done || st.reason), size: 21, on: run });
    });
    if (pages > 1) this.btn(32, 486, 200, 48, `Page ${this.page + 1}/${pages}`, () => { this.page = (this.page + 1) % pages; }, { size: 20, center: true });
    const last = S.log[S.log.length - 1];
    if (last) { g.font = '500 19px ' + getComputedStyle(document.body).fontFamily; g.fillStyle = '#ddd7ff'; this.wrap(`${fmtClock(last.t)} ${last.text}`, 250, 510, 740, 22, false, 2); }
    this.btn(32, 560, 220, 56, Sim.speed === 0 ? 'Reprendre' : 'Pause', () => { Sim.speed = Sim.speed === 0 ? 1 : 0; seg($('#simSpeed'), String(Sim.speed)); }, { size: 22, center: true });
    if (S.flags.cpr && S.flags.cpr.tap) this.text(`Compressions : appuyez en dehors du panneau · ${Math.round(CprTap.rate || 0)} par minute`, 270, 595, 21, '#f3c25b', 600);
    this.btn(772, 560, 220, 56, 'Terminer', () => Sim.finish({ outcome: 'arret', title: 'Simulation arrêtée', text: 'Vous avez arrêté la simulation avant la fin.' }), { size: 22, center: true });
  },
  drawUS() {
    const g = this.ctx;
    this.text('Échographie', 32, 50, 28, '#eeeef3', 700);
    try { g.drawImage($('#usImage'), 32, 70, 560, 420); } catch (e) { /* rien */ }
    g.font = '500 20px ' + getComputedStyle(document.body).fontFamily; g.fillStyle = '#ddd7ff';
    this.wrap($('#usGuide').textContent, 610, 110, 390, 24, false, 6);
    const P = US.probe;
    const goto = (t, th, y, rot) => { US.target = t; Object.assign(P, { theta: th + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 3, rot: rot + (Math.random() - 0.5) * 30, tilt: 0 }); US.dirty = true; };
    this.btn(610, 270, 125, 52, 'Rein droit', () => goto('rein_d', -126, 2.0, -12), { size: 18, center: true, on: US.target === 'rein_d' });
    this.btn(742, 270, 125, 52, 'Rein gauche', () => goto('rein_g', 126, 3.6, 12), { size: 18, center: true, on: US.target === 'rein_g' });
    this.btn(874, 270, 125, 52, 'Vessie', () => goto('vessie', 0, -19.5, -90), { size: 18, center: true, on: US.target === 'vessie' });
    const nudge = (k, d) => { P[k] += d; US.dirty = true; };
    this.btn(610, 332, 92, 48, 'Haut', () => nudge('y', 1), { size: 18, center: true });
    this.btn(708, 332, 92, 48, 'Bas', () => nudge('y', -1), { size: 18, center: true });
    this.btn(806, 332, 92, 48, 'Dos', () => nudge('theta', Math.sign(P.theta || 1) * 4), { size: 18, center: true });
    this.btn(904, 332, 95, 48, 'Ventre', () => nudge('theta', -Math.sign(P.theta || 1) * 4), { size: 18, center: true });
    this.btn(610, 386, 190, 48, 'Tourner +5°', () => nudge('rot', 5), { size: 18, center: true });
    this.btn(808, 386, 191, 48, 'Tourner −5°', () => nudge('rot', -5), { size: 18, center: true });
    this.btn(610, 440, 190, 48, 'Inclinaison +', () => nudge('tilt', 3), { size: 18, center: true });
    this.btn(808, 440, 191, 48, 'Inclinaison −', () => nudge('tilt', -3), { size: 18, center: true });
    this.btn(32, 520, 230, 60, US.breath > 0.5 ? 'Respiration libre' : 'Inspiration bloquée', () => $('#usBreath').click(), { size: 20, center: true, on: US.breath > 0.5 });
    this.btn(272, 520, 230, 60, 'Enregistrer', () => US.snap(), { size: 20, center: true });
    this.btn(770, 520, 230, 60, 'Fermer', () => US.close(), { primary: true, size: 20, center: true });
  }
};
App.frameHooks.add(dt => XR.update(dt));
