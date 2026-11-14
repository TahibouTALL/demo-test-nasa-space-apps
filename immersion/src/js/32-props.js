/* ================= matériel médical et de sécurité (modèles faits à la main) ================= */
// boîte aux coins arrondis : largeur (x), hauteur (y), profondeur (z)
function rbox(w, h, d, r = 0.01, seg = 3) {
  r = Math.min(r, w / 2 - 1e-4, d / 2 - 1e-4, h / 2 - 1e-4);
  const s = new THREE.Shape();
  const x = -w / 2 + r, y = -d / 2 + r, W = w - 2 * r, D = d - 2 * r;
  s.moveTo(x, y - r); s.lineTo(x + W, y - r); s.quadraticCurveTo(x + W + r, y - r, x + W + r, y);
  s.lineTo(x + W + r, y + D); s.quadraticCurveTo(x + W + r, y + D + r, x + W, y + D + r);
  s.lineTo(x, y + D + r); s.quadraticCurveTo(x - r, y + D + r, x - r, y + D);
  s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-4, h - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: seg, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -(h - 2 * r) / 2, 0);
  g.computeVertexNormals();
  return g;
}
const std = (color, roughness = 0.6, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness }, extra));
function labelTexture(w, h, draw) {
  const t = canvasTexture(w, h, (g, W, H) => draw(g, W, H));
  t.anisotropy = 8;
  return t;
}
function plane(w, h, mat) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); }
const FONT = '"Atkinson Hyperlegible Next", system-ui, sans-serif';

const Props = {
  // table de contention médicale (CMRS) : planche bleue, sangles, cale-tête
  cmrs() {
    const g = new THREE.Group(); g.name = 'cmrs';
    const board = new THREE.Mesh(rbox(0.52, 0.045, 1.9, 0.018), std(0x2d5aa8, 0.55));
    g.add(board);
    const pad = new THREE.Mesh(rbox(0.48, 0.02, 1.84, 0.009), std(0x264c90, 0.8)); pad.position.y = 0.03; g.add(pad);
    for (const s of [-1, 1]) { const hb = new THREE.Mesh(rbox(0.07, 0.09, 0.2, 0.025), std(0x1f3f7a, 0.7)); hb.position.set(s * 0.11, 0.08, -0.82); g.add(hb); }
    // sangles en arceau par-dessus le corps : ventre, cuisses, jambes
    const straps = [];
    const strapM = std(0x1c1e22, 0.85), buckleM = std(0x9aa0a6, 0.35, 0.7);
    for (const [z, h] of [[-0.215, 0.235], [0.2, 0.19], [0.62, 0.13]]) {
      const st = new THREE.Group();
      const pts = [];
      for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(new THREE.Vector3(Math.cos(a) * 0.27, 0.025 + Math.sin(a) * h, 0)); }
      const band = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.006, 6, false), strapM);
      band.scale.z = 4; st.add(band);
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.05), buckleM); buckle.position.set(0.12, 0.025 + h * 0.92, 0); buckle.rotation.z = -0.42; st.add(buckle);
      st.position.z = z; st.visible = false; g.add(st); straps.push(st);
    }
    for (const [x, z] of [[-0.2, -0.8], [0.2, -0.8], [-0.2, 0.8], [0.2, 0.8]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10), std(0x8f959b, 0.4, 0.6)); leg.position.set(x, -0.08, z); g.add(leg); }
    g.userData.straps = straps;
    g.userData.strap = on => straps.forEach(s => { s.visible = on; });
    return g;
  },
  // défibrillateur avec écran animé et bouton de choc
  aed() {
    const g = new THREE.Group(); g.name = 'aed';
    const body = new THREE.Mesh(rbox(0.26, 0.075, 0.21, 0.02), std(0x3b3f45, 0.5)); g.add(body);
    const face = new THREE.Mesh(rbox(0.24, 0.01, 0.19, 0.012), std(0x2b9a4a, 0.45)); face.position.y = 0.038; g.add(face);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 8, 20, Math.PI), std(0x2b9a4a, 0.5)); handle.rotation.y = Math.PI / 2; handle.position.set(0, 0.03, -0.115); handle.rotation.x = Math.PI / 2; g.add(handle);
    const scrC = document.createElement('canvas'); scrC.width = 320; scrC.height = 200;
    const scrT = new THREE.CanvasTexture(scrC); scrT.colorSpace = THREE.SRGBColorSpace;
    const scr = plane(0.12, 0.075, new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false })); scr.rotation.x = -Math.PI / 2; scr.position.set(-0.045, 0.0445, -0.03); g.add(scr);
    const btnMat = std(0xf08a24, 0.4, 0, { emissive: 0x000000 });
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.012, 24), btnMat); btn.position.set(0.07, 0.046, 0.045); g.add(btn);
    const bolt = plane(0.026, 0.026, new THREE.MeshBasicMaterial({ map: labelTexture(64, 64, (c, W) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(36, 4); c.lineTo(14, 36); c.lineTo(30, 36); c.lineTo(24, 60); c.lineTo(50, 24); c.lineTo(33, 24); c.closePath(); c.fill(); }), transparent: true, toneMapped: false }));
    bolt.rotation.x = -Math.PI / 2; bolt.position.set(0.07, 0.0525, 0.045); g.add(bolt);
    const on = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 16), std(0x2a7ce0, 0.4)); on.position.set(0.07, 0.044, -0.03); g.add(on);
    const lab = plane(0.1, 0.02, new THREE.MeshBasicMaterial({ map: labelTexture(256, 52, (c, W, H) => { c.fillStyle = '#fff'; c.font = `700 30px ${FONT}`; c.textBaseline = 'middle'; c.fillText('DÉFIBRILLATEUR', 6, H / 2); }), transparent: true }));
    lab.rotation.x = -Math.PI / 2; lab.position.set(-0.045, 0.0445, 0.07); g.add(lab);
    const st = { mode: 'off', t: 0, armed: false };
    const draw = () => {
      const c = scrC.getContext('2d'), W = 320, H = 200;
      c.fillStyle = '#0b1410'; c.fillRect(0, 0, W, H);
      if (st.mode === 'off') { scrT.needsUpdate = true; return; }
      c.strokeStyle = st.mode === 'vf' || st.mode === 'analyse' || st.mode === 'shock' ? '#ffd24a' : '#5df08a'; c.lineWidth = 3; c.beginPath();
      for (let x = 0; x < W; x += 2) {
        const tt = st.t * 1.4 + x / 90;
        let y;
        if (st.mode === 'sinus') { const ph = tt % 1; y = ph < 0.06 ? -Math.sin(ph / 0.06 * Math.PI) * 55 : Math.sin(tt * 6.28) * 2; }
        else if (st.mode === 'cpr') y = Math.sin(tt * 11.5) * 28;
        else y = Math.sin(tt * 9.1) * 22 + Math.sin(tt * 23.7) * 9 + Math.sin(tt * 4.3) * 6;
        if (x === 0) c.moveTo(x, 104 + y); else c.lineTo(x, 104 + y);
      }
      c.stroke();
      c.fillStyle = '#e9f5ee'; c.font = `700 26px ${FONT}`; c.textBaseline = 'top';
      const msg = { analyse: 'ANALYSE...', shock: 'CHOC CONSEILLÉ', cpr: 'MASSAGE', sinus: 'RYTHME ORGANISÉ', vf: 'NE TOUCHEZ PAS' }[st.mode] || '';
      c.fillText(msg, 14, 12);
      scrT.needsUpdate = true;
    };
    g.userData = {
      setMode(m) { st.mode = m; st.armed = m === 'shock'; draw(); },
      update(dt) {
        st.t += dt;
        if (st.mode !== 'off') draw();
        btnMat.emissive.setHex(st.armed && (st.t * 2.2 % 1) < 0.5 ? 0xff7a10 : 0x000000);
        btnMat.emissiveIntensity = 1.3;
      },
      button: btn
    };
    draw();
    return g;
  },
  pad() {
    const g = new THREE.Group();
    const p = new THREE.Mesh(rbox(0.11, 0.006, 0.14, 0.003), std(0xf3f1ea, 0.85)); g.add(p);
    const gel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.002, 24), std(0x9aa4ad, 0.3)); gel.position.y = 0.004; g.add(gel);
    const ic = plane(0.06, 0.06, new THREE.MeshBasicMaterial({ map: labelTexture(96, 96, (c, W) => { c.strokeStyle = '#d33'; c.lineWidth = 6; c.beginPath(); c.moveTo(48, 10); c.lineTo(30, 52); c.lineTo(52, 52); c.lineTo(40, 88); c.stroke(); }), transparent: true }));
    ic.rotation.x = -Math.PI / 2; ic.position.y = 0.0045; g.add(ic);
    return g;
  },
  // câble souple entre deux points (recalculé au besoin)
  cable(color = 0x23252a, r = 0.004) {
    const mat = std(color, 0.6);
    const m = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    m.userData.set = (a, b, sag = 0.12) => {
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= sag;
      const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, -sag * 0.3, 0)), mid, b.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, -sag * 0.3, 0)), b]);
      m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(curve, 40, r, 6, false);
    };
    return m;
  },
  // stylo auto-injecteur d'adrénaline
  epipen() {
    const g = new THREE.Group(); g.name = 'epipen';
    const tex = labelTexture(512, 96, (c, W, H) => {
      c.fillStyle = '#f2c41f'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#1b1b1b'; c.font = `700 34px ${FONT}`; c.textBaseline = 'middle'; c.fillText('ADRÉNALINE 0,3 mg', 24, H * 0.36);
      c.font = `500 24px ${FONT}`; c.fillText('auto-injecteur · cuisse, face externe', 24, H * 0.74);
    });
    tex.wrapS = THREE.RepeatWrapping;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.13, 28, 1, false), std(0xf2c41f, 0.45, 0, { map: tex }));
    g.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.0115, 0.03, 24), std(0x2f6fd8, 0.4)); cap.position.y = 0.08; g.add(cap);
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0118, 0.018, 6, 20), std(0xf07b1d, 0.45)); tip.position.y = -0.072; g.add(tip);
    g.userData = { cap, tip };
    return g;
  },
  // masque à oxygène, tuyau et bouteille
  o2() {
    const g = new THREE.Group(); g.name = 'o2';
    const mask = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xbfeccd, roughness: 0.15, transmission: 0.5, transparent: true, opacity: 0.6, thickness: 0.004 }));
    mask.scale.set(0.82, 1.05, 0.7); mask.rotation.x = Math.PI / 2; g.add(mask);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.004, 8, 32), std(0x8fd3a6, 0.4)); rim.scale.set(0.82, 1.05, 1); g.add(rim);
    const bottle = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.24, 8, 20), std(0x2e8b57, 0.4, 0.2)); bottle.add(b);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.05, 14), std(0xc8ccd0, 0.3, 0.8)); v.position.y = 0.17; bottle.add(v);
    g.userData = { mask, bottle };
    return g;
  },
  // masque complet de secours (PBA) avec sa petite bouteille d'oxygène
  pba() {
    const g = new THREE.Group(); g.name = 'pba';
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 18, -Math.PI / 2, Math.PI, 0.25, Math.PI * 0.62), new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.05, transmission: 0.85, transparent: true, opacity: 0.35, thickness: 0.003, side: THREE.DoubleSide }));
    visor.scale.set(0.95, 1.2, 0.85); g.add(visor);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.011, 10, 40), std(0x1f2226, 0.7)); frame.scale.set(0.93, 1.15, 1); frame.rotation.y = Math.PI / 2; frame.position.x = -0.002; g.add(frame);
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 10, 40), std(0xe86a1c, 0.8)); hood.rotation.x = Math.PI / 2; hood.position.y = -0.12; g.add(hood);
    const bottle = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.16, 8, 16), std(0x2e8b57, 0.4, 0.2)); bottle.position.set(0, -0.2, -0.08); bottle.rotation.x = 1.2; g.add(bottle);
    return g;
  },
  // masque filtrant contre l'ammoniac (cartouches vertes, type K)
  respirator() {
    const g = new THREE.Group(); g.name = 'respirator';
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.06, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), std(0x2a2d33, 0.65)); shell.scale.set(0.9, 1.0, 0.8); shell.rotation.x = Math.PI / 2; g.add(shell);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 24), std(0x3f9a5a, 0.5)); c.rotation.z = Math.PI / 2; c.rotation.y = s * 0.5; c.position.set(s * 0.055, -0.01, 0.035); g.add(c); }
    return g;
  },
  extinguisher() {
    const g = new THREE.Group(); g.name = 'extinguisher';
    const tex = labelTexture(256, 256, (c, W, H) => { c.fillStyle = '#c62f25'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.fillRect(0, 90, W, 76); c.fillStyle = '#1b1b1b'; c.font = `700 30px ${FONT}`; c.textBaseline = 'middle'; c.fillText('EXTINCTEUR', 30, 114); c.fillText('CO₂', 30, 146); });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.34, 8, 24), std(0xc62f25, 0.4, 0.2, { map: tex })); g.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 16), std(0x2a2c30, 0.4, 0.6)); head.position.y = 0.25; g.add(head);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.11), std(0x1d1f22, 0.4, 0.5)); lever.position.set(0, 0.285, 0.04); lever.rotation.x = -0.25; g.add(lever);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.14, 12), std(0x1d1f22, 0.5)); nozzle.position.set(0, 0.3, 0.09); nozzle.rotation.x = Math.PI / 2; g.add(nozzle);
    g.userData.nozzleTip = new THREE.Vector3(0, 0.3, 0.16);
    return g;
  },
  // analyseur de produits de combustion, écran lisible
  analyzer() {
    const g = new THREE.Group(); g.name = 'analyzer';
    const body = new THREE.Mesh(rbox(0.08, 0.04, 0.17, 0.012), std(0x6b7178, 0.5)); g.add(body);
    const c = document.createElement('canvas'); c.width = 256; c.height = 160;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const scr = plane(0.064, 0.04, new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); scr.rotation.x = -Math.PI / 2; scr.position.set(0, 0.0205, -0.03); g.add(scr);
    g.userData.show = (lines, ok) => {
      const x = c.getContext('2d'); x.fillStyle = '#081210'; x.fillRect(0, 0, 256, 160);
      x.fillStyle = ok ? '#7df0a0' : '#ffd24a'; x.font = `700 26px ${FONT}`; x.textBaseline = 'top';
      lines.forEach((l, i) => x.fillText(l, 12, 10 + i * 36));
      t.needsUpdate = true;
    };
    g.userData.show(['CO   -- ppm', 'HCl  -- ppm', 'HCN  -- ppm', 'O₂   -- %'], false);
    return g;
  },
  // flacon de lavage oculaire
  eyewash() {
    const g = new THREE.Group(); g.name = 'eyewash';
    const pts = [[0, 0], [0.026, 0], [0.03, 0.02], [0.03, 0.1], [0.022, 0.12], [0.012, 0.13], [0.012, 0.15]].map(p => new THREE.Vector2(p[0], p[1]));
    const b = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.25, transmission: 0.45, transparent: true, opacity: 0.85, thickness: 0.01 }));
    b.position.y = -0.075; g.add(b);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.012, 0.022, 20, 1, true), std(0x2f6fd8, 0.4, 0, { side: THREE.DoubleSide })); cup.position.y = 0.085; g.add(cup);
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0305, 0.0305, 0.05, 28, 1, true), new THREE.MeshBasicMaterial({ map: labelTexture(256, 64, (c, W, H) => { c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.fillStyle = '#2f6fd8'; c.font = `700 30px ${FONT}`; c.textBaseline = 'middle'; c.fillText('LAVE-ŒIL', 50, H / 2); }) }));
    lab.position.y = -0.03; g.add(lab);
    return g;
  },
  gauze() {
    const g = new THREE.Group(); g.name = 'gauze';
    const tex = labelTexture(128, 128, (c, W) => { c.fillStyle = '#f7f6f1'; c.fillRect(0, 0, W, W); c.strokeStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < W; i += 4) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, W); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(W, i); c.stroke(); } });
    const m = new THREE.Mesh(rbox(0.08, 0.008, 0.08, 0.003), std(0xffffff, 0.95, 0, { map: tex })); g.add(m);
    return g;
  },
  bandage() {
    const g = new THREE.Group(); g.name = 'bandage';
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 24), std(0xf4f1e8, 0.95)); roll.rotation.z = Math.PI / 2; g.add(roll);
    return g;
  },
  // compresse mouillée (refroidir une brûlure)
  wetPad() {
    const g = new THREE.Group(); g.name = 'wetpad';
    const m = new THREE.Mesh(rbox(0.1, 0.012, 0.08, 0.004), new THREE.MeshPhysicalMaterial({ color: 0xd8eef8, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1 })); g.add(m);
    return g;
  },
  // échographe : écran (image calculée) et sonde
  ultrasound() {
    const g = new THREE.Group(); g.name = 'ultrasound';
    const base = new THREE.Mesh(rbox(0.32, 0.025, 0.23, 0.01), std(0xdfe2e6, 0.45)); g.add(base);
    const c = document.createElement('canvas'); c.width = 480; c.height = 360;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const lid = new THREE.Group(); lid.position.set(0, 0.012, -0.11); lid.rotation.x = -1.25; g.add(lid);
    const back = new THREE.Mesh(rbox(0.32, 0.012, 0.22, 0.01), std(0xcfd3d8, 0.45)); back.position.set(0, 0, 0.11); lid.add(back);
    const scr = plane(0.28, 0.2, new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); scr.rotation.x = -Math.PI / 2; scr.position.set(0, 0.0065, 0.11); lid.add(scr);
    const probe = new THREE.Group(); probe.name = 'probe';
    const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.08, 6, 16), std(0xf1f2f4, 0.35)); probe.add(h);
    const head = new THREE.Mesh(rbox(0.045, 0.02, 0.022, 0.008), std(0x2a2c30, 0.5)); head.position.y = -0.06; probe.add(head);
    g.userData = { canvas: c, tex: t, probe };
    return g;
  },
  // panneau d'alarme (Caution & Warning) : quatre boutons d'urgence
  alarmPanel() {
    const g = new THREE.Group(); g.name = 'alarm';
    const box = new THREE.Mesh(rbox(0.26, 0.03, 0.13, 0.008), std(0x3a3e44, 0.5)); g.add(box);
    const keys = [['FIRE', 0xd8342b], ['ΔP', 0xe0822a], ['ATM', 0xe3c23a], ['WARN', 0xd9d9d9]];
    const btns = {};
    keys.forEach(([k, col], i) => {
      const m = std(col, 0.4, 0, { emissive: 0x000000 });
      const b = new THREE.Mesh(rbox(0.05, 0.016, 0.05, 0.006), m); b.position.set(-0.09 + i * 0.06, 0.02, 0.012); g.add(b);
      const lab = plane(0.046, 0.016, new THREE.MeshBasicMaterial({ map: labelTexture(128, 44, (c, W, H) => { c.fillStyle = '#111'; c.font = `800 28px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k, W / 2, H / 2 + 1); }), transparent: true }));
      lab.rotation.x = -Math.PI / 2; lab.position.set(-0.09 + i * 0.06, 0.0285, 0.012); g.add(lab);
      btns[k] = m;
    });
    const t0 = { on: null, t: 0 };
    g.userData = { btns, set(k) { t0.on = k; }, update(dt) { t0.t += dt; for (const [k, m] of Object.entries(btns)) { const lit = t0.on === k && (t0.t * 2.5 % 1) < 0.6; m.emissive.copy(lit ? m.color : new THREE.Color(0)); m.emissiveIntensity = lit ? 1.2 : 0; } } };
    return g;
  },
  // manomètre de la cabine (mmHg)
  gauge() {
    const g = new THREE.Group(); g.name = 'gauge';
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 40), std(0x6c737b, 0.35, 0.7)); ring.rotation.x = Math.PI / 2; g.add(ring);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.066, 48), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); face.position.z = 0.0155; g.add(face);
    const draw = v => {
      const x = c.getContext('2d'); x.fillStyle = '#f4f2ea'; x.fillRect(0, 0, 256, 256);
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = p => a0 + (a1 - a0) * (p - 400) / 400;
      x.lineWidth = 14; x.strokeStyle = '#d8342b'; x.beginPath(); x.arc(128, 128, 100, ang(400), ang(490)); x.stroke();
      x.strokeStyle = '#2a8a4a'; x.beginPath(); x.arc(128, 128, 100, ang(700), ang(800)); x.stroke();
      x.fillStyle = '#222'; x.font = `700 20px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let p = 400; p <= 800; p += 100) { const a = ang(p); x.fillText(String(p), 128 + Math.cos(a) * 74, 128 + Math.sin(a) * 74); }
      x.font = `600 16px ${FONT}`; x.fillText('mmHg', 128, 172);
      x.font = `800 26px ${FONT}`; x.fillText(Math.round(v), 128, 206);
      const a = ang(v); x.strokeStyle = '#111'; x.lineWidth = 5; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); x.stroke();
      x.fillStyle = '#111'; x.beginPath(); x.arc(128, 128, 8, 0, 7); x.fill();
      t.needsUpdate = true;
    };
    g.userData = { set: draw };
    draw(760);
    return g;
  },
  // écoutille (porte ronde-carrée) qu'on referme
  hatchDoor(size = 0.95) {
    const g = new THREE.Group(); g.name = 'hatch';
    const door = new THREE.Group(); g.add(door);
    // porte d'écoutille du mécanisme d'amarrage (CBM) : panneau carré à coins arrondis, hublot, manivelle
    const slab = new THREE.Mesh(rbox(size, 0.05, size, 0.16), std(0xd5d8db, 0.5, 0.25)); slab.rotation.x = Math.PI / 2; slab.position.x = size / 2; door.add(slab);
    const inner = new THREE.Mesh(rbox(size * 0.82, 0.02, size * 0.82, 0.12), std(0xbfc3c8, 0.55, 0.3)); inner.rotation.x = Math.PI / 2; inner.position.set(size / 2, 0, 0.03); door.add(inner);
    for (const [x, y] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12), std(0x6c7076, 0.4, 0.6)); b.rotation.x = Math.PI / 2; b.position.set(size * x, size * (y - 0.5), 0.04); door.add(b); }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 10, 36), std(0x34383e, 0.45, 0.5)); rim.position.set(size / 2, 0.2, 0.045); door.add(rim);
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.072, 32), new THREE.MeshPhysicalMaterial({ color: 0x1c2630, roughness: 0.04, metalness: 0.3 })); win.position.set(size / 2, 0.2, 0.046); door.add(win);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24), std(0x2b2e33, 0.4, 0.55)); hub.rotation.x = Math.PI / 2; hub.position.set(size / 2, -0.08, 0.055); door.add(hub);
    // manivelle droite sur le moyeu, et deux poignées verticales sur les côtés
    const crank = new THREE.Group(); crank.position.set(size / 2, -0.08, 0.075); crank.rotation.z = 0.35; door.add(crank);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.026, 0.02), std(0x2b2e33, 0.4, 0.5)); bar.position.x = 0.075; crank.add(bar);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 14), std(0x1d1f23, 0.5, 0.3)); knob.rotation.x = Math.PI / 2; knob.position.set(0.15, 0, 0.025); crank.add(knob);
    for (const x of [0.1, 0.9]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.22, 10), std(0x8a8f96, 0.35, 0.7)); grip.position.set(size * x, -0.02, 0.085); door.add(grip);
      for (const y of [-0.11, 0.09]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.05), std(0x8a8f96, 0.35, 0.7)); st.position.set(size * x, y, 0.06); door.add(st); }
    }
    const lab = plane(0.2, 0.05, new THREE.MeshBasicMaterial({ map: labelTexture(256, 64, (c, W, H) => { c.fillStyle = '#1d2a4d'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.font = `700 34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('HATCH', W / 2, H / 2 + 2); }) }));
    lab.position.set(size / 2, 0.36, 0.042); door.add(lab);
    g.userData = { door, size };
    return g;
  },
  // trousse médicale en tissu blanc, croix rouge et étiquette
  medkit(label = 'TROUSSE MÉDICALE') {
    const g = new THREE.Group(); g.name = 'medkit';
    const tex = labelTexture(512, 320, (c, W, H) => {
      c.fillStyle = '#eeebe2'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < W; i += 6) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); }
      c.fillStyle = '#d33a2c'; c.fillRect(56, 110, 100, 34); c.fillRect(89, 77, 34, 100);
      c.fillStyle = '#28395f'; c.fillRect(190, 104, 290, 64); c.fillStyle = '#fff'; c.font = `700 30px ${FONT}`; c.textBaseline = 'middle'; c.fillText(label, 202, 136);
      c.strokeStyle = '#9b958a'; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, H - 20);
    });
    const m = new THREE.Mesh(rbox(0.34, 0.12, 0.22, 0.035), [std(0xeeebe2, 0.95)]);
    g.add(m);
    const face = plane(0.32, 0.2, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })); face.rotation.x = -Math.PI / 2; face.position.y = 0.0605; g.add(face);
    return g;
  },
  // poche à boire (eau)
  drinkBag() {
    const g = new THREE.Group(); g.name = 'drink';
    const bag = new THREE.Mesh(rbox(0.09, 0.025, 0.13, 0.012), new THREE.MeshPhysicalMaterial({ color: 0xdff3ff, roughness: 0.15, transmission: 0.6, transparent: true, opacity: 0.8, thickness: 0.01 }));
    bag.rotation.x = Math.PI / 2; g.add(bag);
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 10), std(0xf2f2f2, 0.4)); straw.position.y = 0.095; g.add(straw);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.01), std(0xd33a2c, 0.5)); clip.position.y = 0.08; g.add(clip);
    return g;
  },
  // petite lampe à lumière bleue et bandelette de fluorescéine
  bluelight() {
    const g = new THREE.Group(); g.name = 'bluelight';
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.12, 16), std(0x2b2e33, 0.4, 0.5)); b.rotation.x = Math.PI / 2; g.add(b);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), new THREE.MeshBasicMaterial({ color: 0x4b8cff })); led.position.z = 0.062; g.add(led);
    const light = new THREE.PointLight(0x3c7dff, 0, 0.6, 2); light.position.z = 0.07; g.add(light);
    g.userData.light = light;
    return g;
  },
  tube() {
    const g = new THREE.Group(); g.name = 'tube';
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.009, 0.08, 18), std(0xf4f4f6, 0.4)); b.rotation.x = Math.PI / 2; g.add(b);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.014, 12), std(0xd33a2c, 0.4)); cap.rotation.x = Math.PI / 2; cap.position.z = -0.047; g.add(cap);
    return g;
  },
  // fumée : sprites gris qui montent et dérivent vers la ventilation
  smoke(n = 46) {
    const g = new THREE.Group(); g.name = 'smoke';
    const tex = canvasTexture(128, 128, (c, W) => { const gr = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(58,58,62,0.85)'); gr.addColorStop(0.45, 'rgba(66,66,70,0.45)'); gr.addColorStop(1, 'rgba(70,70,74,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, W); });
    const sp = [];
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })); s.userData.seed = Math.random() * 100; g.add(s); sp.push(s); }
    const st = { k: 0, t: 0, dir: new THREE.Vector3(-0.9, 0.35, -0.5) };
    g.userData = {
      set(k) { st.k = k; },
      update(dt) {
        st.t += dt;
        sp.forEach(s => {
          const u = (st.t * 0.07 + s.userData.seed) % 1;
          s.position.set(Math.sin(s.userData.seed * 3 + st.t * 0.3) * 0.12 + st.dir.x * u * 1.2, st.dir.y * u * 1.1, Math.cos(s.userData.seed * 2 + st.t * 0.2) * 0.12 + st.dir.z * u * 1.5);
          s.scale.setScalar(0.1 + u * 0.75);
          s.material.opacity = st.k * 0.8 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (1 - u * 0.6);
          s.visible = st.k > 0.01;
        });
      }
    };
    return g;
  },
  // gouttes qui flottent (sang ou eau) : elles ne tombent pas en apesanteur
  droplets(kind = 'blood', n = 14) {
    const g = new THREE.Group(); g.name = 'drops';
    const mat = kind === 'blood' ? new THREE.MeshPhysicalMaterial({ color: 0x7a0b12, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 })
      : new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.02, transmission: 0.9, transparent: true, opacity: 0.7, thickness: 0.01, ior: 1.33 });
    const D = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), mat);
      const r = 0.003 + Math.random() * 0.006;
      m.userData = { r, v: new THREE.Vector3((Math.random() - 0.5) * 0.03, (Math.random() - 0.3) * 0.03, (Math.random() - 0.5) * 0.03), ph: Math.random() * 6, alive: false };
      m.scale.setScalar(r); m.visible = false; g.add(m); D.push(m);
    }
    g.userData = {
      drops: D,
      emit(origin, count = 4, spread = 0.03) {
        let k = 0;
        for (const m of D) { if (k >= count) break; if (m.userData.alive) continue; m.userData.alive = true; m.visible = true; m.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)); m.scale.setScalar(m.userData.r); k++; }
      },
      clear() { D.forEach(m => { m.userData.alive = false; m.visible = false; }); },
      alive() { return D.filter(m => m.userData.alive); },
      update(dt) {
        for (const m of D) {
          if (!m.userData.alive) continue;
          m.userData.ph += dt * 6;
          m.position.addScaledVector(m.userData.v, dt);
          const w = 1 + Math.sin(m.userData.ph) * 0.12;
          m.scale.set(m.userData.r * w, m.userData.r / w, m.userData.r);
        }
      }
    };
    return g;
  },
  // anneau de mise en valeur posé sur un objet (lueur douce)
  glowRing(r = 0.06) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9, depthTest: false, toneMapped: false }));
    m.renderOrder = 10;
    return m;
  }
};

/* ---------- animations simples d'objets ---------- */
const easeIO = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function tweenObj(obj, { pos, quat, scale, dur = 0.8, ease = easeIO } = {}, exp = App.exp) {
  return new Promise(res => {
    // un nouveau mouvement remplace celui en cours sur le même objet (pas de tiraillement)
    const prev = obj.userData._tween;
    if (prev) { App.frameHooks.delete(prev.f); prev.res(); }
    const p0 = obj.position.clone(), q0 = obj.quaternion.clone(), s0 = obj.scale.clone();
    let t = 0;
    const f = dt => {
      t = Math.min(1, t + dt / dur);
      const e = ease(t);
      if (pos) obj.position.lerpVectors(p0, pos, e);
      if (quat) obj.quaternion.slerpQuaternions(q0, quat, e);
      if (scale !== undefined) obj.scale.lerpVectors(s0, typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale, e);
      if (t >= 1) { App.frameHooks.delete(f); if (obj.userData._tween && obj.userData._tween.f === f) obj.userData._tween = null; res(); }
    };
    obj.userData._tween = { f, res };
    App.frameHooks.add(f);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
