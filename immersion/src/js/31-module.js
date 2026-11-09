/* ================= module de la station, patient et matériel ================= */
function rackTexture(seed, kind) {
  return canvasTexture(1024, 1024, (c, W, H) => {
    const r = mulberry32(seed);
    c.fillStyle = '#d9dbdc'; c.fillRect(0, 0, W, H);
    const cols = 2;
    for (let i = 0; i < cols; i++) {
      const x0 = i * W / cols;
      c.fillStyle = '#c7cacc'; c.fillRect(x0 + 6, 0, 10, H); c.fillRect(x0 + W / cols - 16, 0, 10, H);
      let y = 20;
      while (y < H - 40) {
        const h = 60 + Math.floor(r() * 4) * 55;
        const t = r();
        if (t < 0.32) {
          // sac de rangement en tissu blanc cassé
          c.fillStyle = '#e9e5da'; c.fillRect(x0 + 24, y, W / cols - 48, h - 8);
          c.strokeStyle = '#bdb7a8'; c.lineWidth = 3; c.strokeRect(x0 + 24, y, W / cols - 48, h - 8);
          c.fillStyle = '#2f3b8f'; c.fillRect(x0 + 40, y + 12, 90, 16);
          c.fillStyle = '#ffffff'; c.font = 'bold 12px sans-serif'; c.fillText('CTB ' + (100 + Math.floor(r() * 900)), x0 + 46, y + 25);
          c.fillStyle = '#9e9789'; c.fillRect(x0 + 24, y + h / 2 - 4, W / cols - 48, 3);
        } else if (t < 0.62) {
          // façade d'équipement avec voyants et connecteurs
          c.fillStyle = '#b8bcbf'; c.fillRect(x0 + 24, y, W / cols - 48, h - 8);
          c.fillStyle = '#9da2a6'; c.fillRect(x0 + 24, y + h - 20, W / cols - 48, 12);
          for (let k = 0; k < 5; k++) { c.fillStyle = '#333'; c.beginPath(); c.arc(x0 + 60 + k * 46, y + h / 2, 9, 0, 7); c.fill(); c.fillStyle = '#777'; c.beginPath(); c.arc(x0 + 60 + k * 46, y + h / 2, 4, 0, 7); c.fill(); }
          c.fillStyle = r() < 0.5 ? '#3ec46d' : '#e8a33a'; c.fillRect(x0 + W / cols - 80, y + 14, 12, 8);
          c.fillStyle = '#20242a'; c.font = '11px sans-serif'; c.fillText(['PWR', 'DATA', 'COOL', 'MSG', 'HRF'][Math.floor(r() * 5)], x0 + W / cols - 120, y + 22);
        } else if (t < 0.8) {
          // tableau de câbles et bande Velcro
          c.fillStyle = '#cfd1d2'; c.fillRect(x0 + 24, y, W / cols - 48, h - 8);
          for (let k = 0; k < 4; k++) { c.strokeStyle = ['#202020', '#3953a4', '#7a7a7a', '#b0302a'][k]; c.lineWidth = 5; c.beginPath(); c.moveTo(x0 + 30, y + 15 + k * 9); c.bezierCurveTo(x0 + 140, y + 60 + k * 6, x0 + 260, y + 5, x0 + W / cols - 30, y + 30 + k * 8); c.stroke(); }
          c.fillStyle = '#e2ddd0'; c.fillRect(x0 + 60, y + h - 30, 120, 14);
        } else {
          // écran d'ordinateur portable fixé
          c.fillStyle = '#2b2e33'; c.fillRect(x0 + 60, y, 260, Math.min(h - 8, 160));
          c.fillStyle = kind === 'lab' ? '#2d4f7c' : '#355d4a'; c.fillRect(x0 + 70, y + 10, 240, Math.min(h - 8, 160) - 20);
          c.fillStyle = 'rgba(255,255,255,0.7)'; for (let k = 0; k < 6; k++) c.fillRect(x0 + 82, y + 22 + k * 14, 90 + r() * 110, 5);
        }
        y += h;
      }
    }
    // bandeau de main courante et étiquettes
    c.fillStyle = '#e7e2c9'; c.fillRect(0, 0, W, 10); c.fillRect(0, H - 10, W, 10);
  });
}

function buildModule() {
  const g = new THREE.Group();
  const L = 9, half = 1.06;
  const texA = rackTexture(3, 'lab'), texB = rackTexture(9, 'node'), texC = rackTexture(17, 'lab'), texD = rackTexture(29, 'node');
  for (const t of [texA, texB, texC, texD]) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(L / 2.1, 1); }
  const wall = (tex, w, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L, w), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.05 }));
    m.position.copy(pos); m.rotation.copy(rot);
    g.add(m);
    return m;
  };
  const w = 1.42;
  wall(texA, w, new THREE.Vector3(-half, 1.1, 0), new THREE.Euler(0, Math.PI / 2, 0));
  wall(texB, w, new THREE.Vector3(half, 1.1, 0), new THREE.Euler(0, -Math.PI / 2, 0));
  wall(texC, w, new THREE.Vector3(0, 1.1 - half, 0), new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2));
  wall(texD, w, new THREE.Vector3(0, 1.1 + half, 0), new THREE.Euler(Math.PI / 2, 0, Math.PI / 2));
  // angles coupés : éclairage et passages de câbles
  const cornerMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.7 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6ea, emissiveIntensity: 1.6 });
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const cw = 0.5;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(cw, L), cornerMat);
    m.position.set(sx * (half - 0.18), 1.1 + sy * (half - 0.18), 0);
    m.rotation.x = Math.PI / 2;
    m.rotation.y = sx * sy * Math.PI / 4;
    m.lookAt(new THREE.Vector3(0, 1.1, 0).add(new THREE.Vector3(0, 0, 0)));
    m.rotation.z = 0;
    const n = new THREE.Vector3(-sx, -sy, 0).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(sy, -sx, 0).normalize().multiplyScalar(1), new THREE.Vector3(0, 0, 1), n));
    g.add(m);
    if (sy > 0) {
      for (let z = -3; z <= 3; z += 2) {
        const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.9), lightMat);
        lp.position.set(sx * (half - 0.19), 1.1 + (half - 0.19), z);
        lp.quaternion.copy(m.quaternion);
        lp.translateZ(0.005);
        g.add(lp);
      }
    }
  }
  // écoutille au fond et mains courantes
  const hatch = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.06, 12, 48), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.5 }));
  hatch.position.set(0, 1.1, -L / 2 + 0.05);
  g.add(hatch);
  const dark = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ color: 0x40464e }));
  dark.position.set(0, 1.1, -L / 2 + 0.03);
  g.add(dark);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshStandardMaterial({ color: 0xbfc2c6, roughness: 0.8 }));
  back.position.set(0, 1.1, -L / 2); g.add(back);
  const back2 = back.clone(); back2.position.z = L / 2; back2.rotation.y = Math.PI; g.add(back2);
  const railMat = new THREE.MeshStandardMaterial({ color: 0xd7c27a, roughness: 0.45, metalness: 0.2 });
  for (const z of [-2.6, -0.4, 1.8]) {
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.42, 4, 8), railMat);
      r.rotation.z = Math.PI / 2; r.position.set(s * (half - 0.04), 1.55, z);
      r.rotation.set(0, 0, 0); r.rotation.x = Math.PI / 2;
      g.add(r);
    }
  }
  const lights = [];
  for (const z of [-2.6, 0, 2.6]) {
    const p = new THREE.PointLight(0xfff3e6, 9, 7, 1.6);
    p.position.set(0, 1.9, z);
    g.add(p); lights.push(p);
  }
  g.add(new THREE.HemisphereLight(0xf4f1ea, 0x8a8f96, 0.9));
  g.userData.lights = lights;
  return g;
}

// mannequin articulé : posture neutre d'apesanteur ou allongé sur la table médicale
function buildMannequin(cfg) {
  const skin = new THREE.MeshStandardMaterial({ color: cfg.skin, roughness: 0.58 });
  const shirt = new THREE.MeshStandardMaterial({ color: cfg.shirt || 0x26365e, roughness: 0.86 });
  const pants = new THREE.MeshStandardMaterial({ color: cfg.pants || 0x59584f, roughness: 0.9 });
  const sock = new THREE.MeshStandardMaterial({ color: 0x2a2b30, roughness: 0.9 });
  const hairM = new THREE.MeshStandardMaterial({ color: cfg.hair || 0x1d1714, roughness: 0.75 });
  const root = new THREE.Group();
  const cap = (r, l, mat) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), mat);
  const pelvis = new THREE.Group(); root.add(pelvis);
  const hips = cap(0.15, 0.1, pants); hips.scale.set(1.18, 1, 0.78); pelvis.add(hips);
  const spine = new THREE.Group(); spine.position.y = 0.1; pelvis.add(spine);
  const chest = cap(0.165, 0.32, shirt); chest.scale.set(1.12, 1, 0.72); chest.position.y = 0.26; spine.add(chest);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.1, 12), skin); neck.position.y = 0.58; spine.add(neck);
  const headG = new THREE.Group(); headG.position.y = 0.7; spine.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), skin); head.scale.set(0.9, 1.1, 1.0); headG.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, 0, Math.PI * (cfg.longHair ? 0.62 : 0.48)), hairM);
  hair.scale.set(0.92, 1.12, 1.03); hair.position.set(0, 0.012, -0.008); hair.rotation.x = -0.25; headG.add(hair);
  if (cfg.bun) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), hairM); b.position.set(0, 0.06, -0.11); headG.add(b); }
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x15120f, roughness: 0.3 });
  const lidM = new THREE.MeshStandardMaterial({ color: cfg.skin, roughness: 0.6 });
  const eyes = [], lids = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), eyeM); e.position.set(s * 0.036, 0.018, 0.094); headG.add(e); eyes.push(e);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), lidM); l.position.copy(e.position); l.rotation.x = Math.PI / 2 + 0.3; l.visible = false; headG.add(l); lids.push(l);
  }
  const lip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshStandardMaterial({ color: new THREE.Color(cfg.skin).multiplyScalar(0.7), roughness: 0.5 }));
  lip.scale.set(1.2, 0.32, 0.5); lip.position.set(0, -0.052, 0.088); headG.add(lip);
  const limb = (parent, x, y, len1, r1, mat1, len2, r2, mat2, endMat, endGeo) => {
    const j1 = new THREE.Group(); j1.position.set(x, y, 0); parent.add(j1);
    const a = cap(r1, len1, mat1); a.position.y = -len1 / 2 - r1 * 0.3; j1.add(a);
    const j2 = new THREE.Group(); j2.position.y = -len1 - r1 * 0.6; j1.add(j2);
    const b = cap(r2, len2, mat2); b.position.y = -len2 / 2 - r2 * 0.3; j2.add(b);
    const e = new THREE.Mesh(endGeo, endMat); e.position.y = -len2 - r2 * 0.8; j2.add(e);
    return { j1, j2, end: e };
  };
  const armL = limb(spine, 0.215, 0.5, 0.25, 0.048, shirt, 0.23, 0.04, skin, skin, new THREE.SphereGeometry(0.048, 12, 10));
  const armR = limb(spine, -0.215, 0.5, 0.25, 0.048, shirt, 0.23, 0.04, skin, skin, new THREE.SphereGeometry(0.048, 12, 10));
  const footGeo = new THREE.BoxGeometry(0.09, 0.06, 0.24); footGeo.translate(0, 0, 0.06);
  const legL = limb(pelvis, 0.09, -0.08, 0.38, 0.072, pants, 0.36, 0.056, pants, sock, footGeo);
  const legR = limb(pelvis, -0.09, -0.08, 0.38, 0.072, pants, 0.36, 0.056, pants, sock, footGeo);
  const parts = { pelvis, spine, chest, headG, armL, armR, legL, legR, eyes, lids, lip, skin, lidM };
  root.userData.parts = parts;
  root.userData.baseSkin = new THREE.Color(cfg.skin);
  return root;
}
function poseMannequin(m, pose) {
  const p = m.userData.parts;
  const set = (o, x, y, z) => o.rotation.set(x, y, z);
  if (pose === 'neutre') {
    // posture neutre en apesanteur : bras flottants, genoux et hanches fléchis
    set(p.spine, 0.12, 0, 0); set(p.headG, -0.2, 0, 0);
    set(p.armL.j1, -0.7, 0, -0.55); set(p.armL.j2, -0.9, 0, 0);
    set(p.armR.j1, -0.7, 0, 0.55); set(p.armR.j2, -0.9, 0, 0);
    set(p.legL.j1, -0.75, 0, -0.08); set(p.legL.j2, 0.95, 0, 0);
    set(p.legR.j1, -0.7, 0, 0.08); set(p.legR.j2, 0.9, 0, 0);
  } else {
    // allongé sur la table de contention, bras le long du corps
    set(p.spine, 0, 0, 0); set(p.headG, 0, 0, 0);
    set(p.armL.j1, 0, 0, -0.12); set(p.armL.j2, -0.12, 0, 0);
    set(p.armR.j1, 0, 0, 0.12); set(p.armR.j2, -0.12, 0, 0);
    set(p.legL.j1, 0, 0, -0.03); set(p.legL.j2, 0.05, 0, 0);
    set(p.legR.j1, 0, 0, 0.03); set(p.legR.j2, 0.05, 0, 0);
  }
}

EXPERIENCES.module = {
  title: 'Module de la station',
  async create() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2d31);
    const mod = buildModule();
    scene.add(mod);
    // table de contention médicale (CMRS)
    const board = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 1.95), new THREE.MeshStandardMaterial({ color: 0x2f5aa8, roughness: 0.6 }));
    board.add(plate);
    const strapM = new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.9 });
    for (const z of [-0.45, 0.05, 0.55]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.012, 0.07), strapM); s.position.set(0, 0.2, z); s.visible = false; board.add(s); }
    board.position.set(0, 0.72, -0.5);
    board.visible = false;
    scene.add(board);
    const holder = new THREE.Group();
    scene.add(holder);
    // matériel
    const props = {};
    const aed = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.24), new THREE.MeshStandardMaterial({ color: 0xf2c22b, roughness: 0.5 }));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), new THREE.MeshBasicMaterial({ color: 0x1b2a22 }));
    scr.rotation.x = -Math.PI / 2; scr.position.set(0.05, 0.051, -0.03); aed.add(box, scr);
    aed.position.set(0.42, 0.82, -1.05); aed.visible = false; scene.add(aed); props.aed = aed;
    const padM = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.7 });
    const pads = [new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.004, 0.14), padM), new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.004, 0.14), padM)];
    pads.forEach(p => { p.visible = false; scene.add(p); }); props.pads = pads;
    const maskM = new THREE.MeshStandardMaterial({ color: 0x9fe0b4, transparent: true, opacity: 0.55, roughness: 0.2 });
    const mask = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), maskM);
    mask.visible = false; scene.add(mask); props.mask = mask;
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.04), new THREE.MeshStandardMaterial({ color: 0xdfe9f2, transparent: true, opacity: 0.75, roughness: 0.15 }));
    const cuffBag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.24, 0.05), new THREE.MeshStandardMaterial({ color: 0x3a62b5, roughness: 0.6 }));
    const iv = new THREE.Group(); iv.add(cuffBag, bag); bag.position.z = 0.03;
    iv.position.set(0.5, 1.45, -0.6); iv.visible = false; scene.add(iv); props.iv = iv;
    const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xc0281f, roughness: 0.4, metalness: 0.2 }));
    ext.position.set(-0.85, 1.2, -1.6); ext.rotation.z = 0.4; ext.visible = false; scene.add(ext); props.ext = ext;
    const probe = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.08, 4, 8), new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.4 }));
    probe.visible = false; scene.add(probe); props.probe = probe;
    // écran de surveillance fixé à la paroi (même image que le moniteur à l'écran)
    const monCanvas = $('#monitor');
    const monTex = new THREE.CanvasTexture(monCanvas); monTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.3), new THREE.MeshBasicMaterial({ map: monTex, toneMapped: false }));
    const frameS = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.03), new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.5 }));
    const monG = new THREE.Group(); frameS.position.z = -0.018; monG.add(frameS, screen);
    monG.position.set(-0.98, 1.35, -0.55); monG.rotation.y = Math.PI / 2 - 0.25;
    scene.add(monG);
    // fumée pour l'incendie
    const smokeTex = canvasTexture(128, 128, (cx, W) => { const gr = cx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(90,92,96,0.55)'); gr.addColorStop(1, 'rgba(90,92,96,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, W, W); });
    const smoke = [];
    for (let i = 0; i < 40; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
      sp.userData = { seed: Math.random() * 100 };
      sp.visible = false; scene.add(sp); smoke.push(sp);
    }
    let patient = null;
    const st = { t: 0, breath: 0, cpr: false, cprPh: 0, rr: 14, effort: 0.6, tint: new THREE.Color(), pose: 'neutre', smoke: 0 };
    const exp = {
      scene, viewpoint: new THREE.Vector3(0.62, 1.36, 1.55), yaw: 17 * DEG, pitch: -9 * DEG, fov: 64, near: 0.05, far: 60, exposure: 1.0,
      monTex, props, board, st,
      setPatient(cfg) {
        if (patient) { holder.remove(patient); disposeScene(patient); }
        patient = buildMannequin(cfg);
        holder.add(patient);
        this.setPose('neutre');
        Object.values(props).forEach(p => { if (Array.isArray(p)) p.forEach(q => q.visible = false); else p.visible = false; });
        board.visible = false; board.children.forEach((c, i) => { if (i) c.visible = false; });
        smoke.forEach(s => s.visible = false); st.smoke = 0;
      },
      setPose(pose) {
        st.pose = pose;
        poseMannequin(patient, pose);
        if (pose === 'table') {
          board.visible = true;
          board.children.forEach((c, i) => { if (i) c.visible = true; });
          patient.position.set(0, 0.86, -0.62);
          patient.rotation.set(-Math.PI / 2, 0, 0);
        } else {
          patient.position.set(0.05, 1.02, -0.95);
          patient.rotation.set(0.12, -0.55, 0.04);
        }
      },
      headWorld() { const v = new THREE.Vector3(); patient.userData.parts.headG.getWorldPosition(v); return v; },
      chestWorld() { const v = new THREE.Vector3(); patient.userData.parts.chest.getWorldPosition(v); return v; },
      setLook(v) {
        // v : état visible du patient
        st.rr = v.rr; st.effort = v.effort ?? 0.6; st.cpr = !!v.cpr; st.cprRate = v.cprRate || 110;
        const P = patient.userData.parts;
        const base = patient.userData.baseSkin;
        st.tint.copy(base);
        if (v.flush) st.tint.lerp(new THREE.Color(0xc8504a), v.flush * 0.35);
        if (v.pale) st.tint.lerp(new THREE.Color(0xb9b2a6), v.pale * 0.35);
        if (v.cyan) st.tint.lerp(new THREE.Color(0x6f7fa8), v.cyan * 0.45);
        if (v.soot) st.tint.lerp(new THREE.Color(0x3a3634), v.soot * 0.25);
        P.skin.color.copy(st.tint); P.lidM.color.copy(st.tint);
        const closed = !!v.eyesClosed;
        P.lids.forEach(l => l.visible = closed); P.eyes.forEach(e => e.visible = !closed);
        P.lip.scale.set(1.2 + (v.swell || 0) * 0.5, 0.32 + (v.swell || 0) * 0.45, 0.5 + (v.swell || 0) * 0.3);
        props.mask.visible = !!v.mask;
        props.iv.visible = !!v.iv;
        props.aed.visible = !!v.aed;
        props.pads.forEach(p => p.visible = !!v.pads);
        props.ext.visible = !!v.ext;
        props.probe.visible = !!v.probe;
        st.smoke = v.smoke || 0;
      },
      update(dt) {
        st.t += dt;
        if (!patient) return;
        const P = patient.userData.parts;
        st.breath += dt * Math.max(st.rr, 0) / 60;
        let s = 1 + Math.sin(st.breath * Math.PI * 2) * 0.025 * clamp(st.effort, 0, 1.5);
        if (st.cpr) { st.cprPh += dt * st.cprRate / 60; s = 1 - 0.06 * Math.max(0, Math.sin(st.cprPh * Math.PI * 2)); }
        P.chest.scale.set(1.12 * (0.98 + 0.02 * s), 1, 0.72 * s);
        if (st.pose === 'neutre') {
          patient.position.y = 1.02 + Math.sin(st.t * 0.4) * 0.015;
          patient.rotation.z = 0.05 + Math.sin(st.t * 0.23) * 0.02;
        }
        const head = this.headWorld();
        props.mask.position.copy(head);
        if (st.pose === 'table') { props.mask.position.y += 0.1; props.mask.rotation.set(0, 0, 0); }
        else { props.mask.position.add(new THREE.Vector3(0.05, -0.02, 0.08)); props.mask.rotation.set(-Math.PI / 2 + 0.3, 0, 0); }
        const ch = this.chestWorld();
        props.pads[0].position.copy(ch).add(new THREE.Vector3(-0.08, 0.13, -0.12));
        props.pads[1].position.copy(ch).add(new THREE.Vector3(0.12, 0.11, 0.05));
        props.probe.position.copy(ch).add(new THREE.Vector3(0.2, 0.16, 0.25));
        // fumée qui dérive vers la ventilation
        smoke.forEach((sp, i) => {
          sp.visible = st.smoke > 0.01;
          if (!sp.visible) return;
          const k = (st.t * 0.06 + sp.userData.seed) % 1;
          sp.position.set(-0.7 + Math.sin(sp.userData.seed * 3 + st.t * 0.2) * 0.25 + k * 0.9, 1.0 + k * 1.0 + Math.sin(sp.userData.seed) * 0.2, -2.0 + k * 2.6 + Math.cos(sp.userData.seed * 2) * 0.4);
          sp.scale.setScalar(0.4 + k * 1.4);
          sp.material.opacity = st.smoke * 0.5 * Math.sin(k * Math.PI);
        });
      },
      dispose() { disposeScene(scene); }
    };
    return exp;
  }
};
