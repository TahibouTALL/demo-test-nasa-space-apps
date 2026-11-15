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
    if (!h) return;
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
    this.redrawT -= dt;
    if (this.redrawT <= 0) { this.redrawT = App.view === 'relax' ? 0.06 : 0.25; this.draw(); }
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
    this.tex.needsUpdate = true;
  },
  drawMenu() {
    this.text('AURA Immersion', 40, 64, 38, '#eeeef3', 720);
    this.text('Se détendre', 40, 120, 24, '#9b8cf6', 650);
    RELAX_CARDS.slice(0, 8).forEach((c, i) => this.btn(40 + (i % 2) * 492, 140 + Math.floor(i / 2) * 96, 452, 82, c.title, () => { Relax.key = c.key; Relax.breath = true; Relax.dur = 600; Relax.moodBefore = null; Relax.start(true); }));
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
  }

};
App.frameHooks.add(dt => XR.update(dt));
