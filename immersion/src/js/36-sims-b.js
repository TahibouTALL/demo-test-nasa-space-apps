/* ================= simulations (2) : yeux, plaies, nez, rein, sorties, étouffement, brûlure ================= */

/* ---------- image d'échographie du rein (calculée) ---------- */
function drawUltrasound(c, { on = true, contact = 0, stone = true, t = 0 } = {}) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  x.fillStyle = '#05070a'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#8fb4c9'; x.font = '600 16px ' + FONT; x.fillText(on ? 'ÉCHOGRAPHIE · REIN DROIT · 3,5 MHz' : 'VEILLE', 14, 24);
  if (!on) return;
  const cx = W / 2, top = 40, R = H - 50, a0 = Math.PI / 2 - 0.62, a1 = Math.PI / 2 + 0.62;
  x.save(); x.beginPath(); x.moveTo(cx + Math.cos(a0) * 20, top + Math.sin(a0) * 20); x.arc(cx, top, R, a0, a1); x.lineTo(cx + Math.cos(a1) * 20, top + Math.sin(a1) * 20); x.closePath(); x.clip();
  const img = x.createImageData(W, H), d = img.data;
  const rnd = mulberry32(Math.floor(t * 8) + 3);
  const kx = cx, ky = top + R * 0.55, ka = R * 0.32, kb = R * 0.17;
  for (let py = top; py < H; py += 2) for (let px = 0; px < W; px += 2) {
    let v = 28 + rnd() * 34;
    const ex = (px - kx) / ka, ey = (py - ky) / kb, e = ex * ex + ey * ey;
    if (e < 1) v = 70 + rnd() * 50;                                  // cortex
    if (e < 0.45) v = 120 + rnd() * 70;                              // sinus du rein, plus brillant
    if (Math.abs(e - 1) < 0.05) v = 170 + rnd() * 50;                // capsule
    if (stone) {
      const sx = kx - ka * 0.18, sy = ky - kb * 0.05, dd = Math.hypot(px - sx, py - sy);
      if (dd < 9) v = 250;
      else if (py > sy && Math.abs(px - sx) < 9) v *= 0.18;          // ombre acoustique sous le calcul
    }
    v *= contact;
    const k = (py * W + px) * 4;
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const kk = k + (oy * W + ox) * 4; d[kk] = d[kk + 1] = d[kk + 2] = v; d[kk + 3] = 255; }
  }
  x.putImageData(img, 0, 0);
  x.restore();
  x.strokeStyle = 'rgba(143,180,201,0.4)'; x.beginPath(); x.arc(cx, top, R, a0, a1); x.stroke();
}

/* ---------- 6. Corps étranger dans l'œil ---------- */
defineSim({
  key: 'oeil', title: 'Poussière dans l\'œil', fiche: 'F-TET-01', env: 'lab', minutes: 3,
  card: 'Le plus fréquent des petits accidents en vol : ne pas frotter, rincer, examiner.',
  intro: 'En apesanteur, rien ne tombe : poussières et miettes flottent. Aminata a reçu une particule dans l\'œil droit en nettoyant un filtre.',
  role: 'Sur une mission de six mois, le modèle de la NASA estime à 72 % la probabilité de ce problème.',
  patient: { who: 'aminata', skin: 'fonce', shirt: 0x2f4f45 },
  outcome: 'La particule est partie. Une petite rayure de la cornée est soignée par une pommade ; si la gêne dure plus de 24 heures, on appelle le sol.',
  learn: [
    'Ne pas frotter : on risque de rayer la cornée.',
    'Rincer, puis absorber l\'eau avec une compresse : en apesanteur, elle reste en boule sur l\'œil.',
    'Le médecin de bord cherche une rayure avec la fluorescéine et une lumière bleue.'
  ],
  sources: ['eyeSpace', 'fiches'],
  async setup(W) {
    labKit(W, { board: false, alarm: false });
    const P = W.patient;
    P.setPose('stand'); P.float = 0.5; P.place(V3(0.1, -0.12, -0.6), new THREE.Euler(0, 0.35, 0));
    uprightShots(W);
    const ew = Props.eyewash(); ew.visible = false; W.add(ew); W.props.eyewash = ew;
    const gz = Props.gauze(); gz.visible = false; W.add(gz); W.props.gauze = gz;
    const bl = Props.bluelight(); bl.visible = false; W.add(bl); W.props.blue = bl;
    const tb = Props.tube(); tb.visible = false; W.add(tb); W.props.tube = tb;
    const drops = Props.droplets('water', 14); W.add(drops); W.props.drops = drops; W.every(dt => drops.userData.update(dt));
    P.U.redEye.value = 0.9;
  },
  steps: [
    { say: 'Que faut-il éviter ?', sub: 'Elle a l\'impression d\'avoir du sable dans l\'œil.', picto: 'noRub', cam: 'face', type: 'choice',
      options: [
        { label: 'Frotter l\'œil', picto: 'noRub', ok: true },
        { label: 'Rincer l\'œil', picto: 'eye', why: 'Rincer est justement la bonne chose à faire. Ce qu\'il faut éviter, c\'est frotter.' }
      ], ok: 'On ne frotte pas : la particule pourrait rayer la cornée' },
    { say: 'Prends le lave-œil dans la trousse', sub: null, picto: 'eye', cam: 'body', type: 'tap', hot: 'kit', label: 'Trousse',
      done: async W => { const ew = W.props.eyewash, P = W.patient, f = P.front(); ew.visible = true; ew.position.copy(W.props.kit.position); faceBasis(ew, P.up().cross(f).normalize(), f.clone().negate()); await tweenObj(ew, { pos: P.world('eyeR').addScaledVector(f, 0.13), dur: 0.9 }); }, ok: null },
    { say: 'Rince l\'œil', sub: 'Garde appuyé 4 secondes.', picto: 'eye', cam: 'eye', type: 'hold', hot: 'eyeR', secs: 4, label: 'Œil droit',
      onHold: W => { const P = W.patient; W.props.drops.userData.emit(P.world('eyeR').addScaledVector(P.front(), 0.015), 8, 0.012); },
      done: async W => { W.props.eyewash.visible = false; W.toast('L\'eau ne coule pas : elle forme une boule sur l\'œil', 'info'); await wait(1800); }, ok: null },
    { say: 'Absorbe l\'eau avec une compresse', sub: 'Touche l\'œil pour éponger doucement.', picto: 'gauze', cam: 'eye', type: 'tap', hot: 'eyeR', label: 'Éponger',
      done: async W => { const g = W.props.gauze, P = W.patient, f = P.front(); g.visible = true; faceBasis(g, P.up().cross(f).normalize(), f); g.position.copy(P.world('eyeR')).addScaledVector(f, 0.15); await tweenObj(g, { pos: P.world('eyeR').addScaledVector(f, 0.02), dur: 0.6 }); W.props.drops.userData.clear(); await wait(400); g.visible = false; W.patient.U.redEye.value = 0.55; }, ok: 'L\'œil est rincé' },
    { say: 'Encore une gêne : que fait-on ?', sub: 'Elle sent toujours quelque chose quand elle cligne.', picto: 'question', cam: 'face', type: 'choice',
      options: [
        { label: 'Le médecin de bord examine l\'œil à la lumière bleue', picto: 'search', ok: true },
        { label: 'On attend que ça passe', picto: 'clock', why: 'Une rayure de la cornée se soigne vite quand on la voit : examen à la fluorescéine et à la lumière bleue.' }
      ], ok: 'Examen avec la fluorescéine' },
    { say: 'Éclaire l\'œil à la lumière bleue', sub: 'Avec la fluorescéine, une rayure apparaît en vert.', picto: 'search', cam: 'eye', type: 'tap', hot: 'eyeR', label: 'Lumière bleue',
      done: async W => { const b = W.props.blue, P = W.patient, f = P.front(); b.visible = true; faceBasis(b, P.up().cross(f).normalize(), P.up()); b.lookAt(P.world('eyeR')); b.position.copy(P.world('eyeR')).addScaledVector(f, 0.14).addScaledVector(P.up(), 0.03); b.lookAt(P.world('eyeR')); b.userData.light.intensity = 1.6; const sp = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 16), new THREE.MeshBasicMaterial({ color: 0x5dff7a, toneMapped: false })); W.add(sp); W.every(() => onFace(W, sp, 'eyeR', 0.006)); await wait(1800); }, ok: 'Petite rayure vue : pommade antibiotique' },
    { say: 'Applique la pommade antibiotique', sub: 'Puis repos de l\'œil. Gêne au-delà de 24 heures : on appelle le sol.', picto: 'eye', cam: 'face', type: 'tap', hot: 'eyeR', label: 'Pommade',
      done: async W => { W.props.blue.visible = false; const t = W.props.tube, P = W.patient, f = P.front(); t.visible = true; t.position.copy(P.world('eyeR')).addScaledVector(f, 0.12); t.lookAt(P.world('eyeR')); await wait(900); t.visible = false; W.patient.U.redEye.value = 0.25; }, ok: 'Soin fait' }
  ]
});

/* ---------- 7. Coupure qui saigne ---------- */
defineSim({
  key: 'plaie', title: 'Coupure qui saigne', fiche: 'F-TRA-02', env: 'lab', minutes: 3,
  card: 'Une entaille à l\'avant-bras : en apesanteur, le sang forme des gouttes qui flottent.',
  intro: 'Lucas s\'est entaillé l\'avant-bras sur le bord d\'un panneau. Le sang ne coule pas : il forme des gouttes qui s\'envolent.',
  role: 'Arrête le saignement et empêche les gouttes de se disperser dans le module.',
  patient: { who: 'lucas', skin: 'clair', shirt: 0x24365f },
  outcome: 'Le saignement est arrêté. Le médecin de bord fermera la plaie (colle, bandelettes ou points) et surveillera l\'infection.',
  learn: [
    'Gants d\'abord, puis compression ferme et directe sur la plaie.',
    'En apesanteur, les gouttes de sang flottent : on les capte avant qu\'elles ne se dispersent.',
    'Nettoyage abondant, pansement, puis fermeture de la plaie par le médecin de bord.'
  ],
  sources: ['hemo', 'fiches'],
  async setup(W) {
    labKit(W, { board: false, alarm: false });
    const P = W.patient;
    P.setPose('armOut'); P.float = 0.4; P.place(V3(0.05, -0.12, -0.55), new THREE.Euler(0, 0.55, 0));
    uprightShots(W);
    const drops = Props.droplets('blood', 18); W.add(drops); W.props.drops = drops; W.every(dt => drops.userData.update(dt));
    const cut = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.008), new THREE.MeshBasicMaterial({ color: 0x8e1018 })); W.add(cut); W.props.cut = cut;
    W.every(() => { const a = P.world('forearmR'); cut.position.copy(a); cut.lookAt(camera.position); });
    W.st.bleed = 1; let acc = 0;
    W.every(dt => { acc += dt * W.st.bleed; if (acc > 0.5) { acc = 0; drops.userData.emit(P.world('forearmR'), 1, 0.01); } });
    W.anchors.drop1 = () => (drops.userData.alive()[0] || { position: P.world('forearmR') }).position.clone();
    W.anchors.drop2 = () => (drops.userData.alive()[2] || { position: P.world('forearmR') }).position.clone();
    W.anchors.drop3 = () => (drops.userData.alive()[4] || { position: P.world('forearmR') }).position.clone();
    const gz = Props.gauze(); gz.visible = false; W.add(gz); W.props.gauze = gz;
    const bd = Props.bandage(); bd.visible = false; W.add(bd); W.props.band = bd;
  },
  steps: [
    { say: 'Mets des gants', sub: 'Le sang en gouttelettes peut toucher tout le module.', picto: 'glove', cam: 'body', type: 'tap', hot: 'kit', label: 'Gants',
      done: async W => { W.toast('Gants en place', 'ok'); }, ok: null },
    { say: 'Appuie fort sur la plaie avec une compresse', sub: 'Compression directe. Garde appuyé 5 secondes.', picto: 'press', cam: 'arm', type: 'hold', hot: 'forearmR', secs: 5, label: 'Plaie',
      onHold: W => { const g = W.props.gauze, P = W.patient; g.visible = true; g.position.copy(P.world('forearmR')).add(V3(0, 0.02, 0)); W.st.bleed = 0.2; W.gloveR.visible = true; orientGlove(W.gloveR, V3(0, -1, 0), V3(-1, 0, 0)); glovePlace(W.gloveR, P.world('forearmR').add(V3(0, 0.03, 0)), V3(0, -1, 0), V3(-1, 0, 0)); },
      done: async W => { W.st.bleed = 0; W.gloveR.visible = false; }, ok: 'Le saignement ralentit puis s\'arrête' },
    { say: 'Capte les gouttes qui flottent', sub: 'Touche chaque goutte avec la compresse.', picto: 'gauze', cam: 'arm', type: 'tap', hot: ['drop1', 'drop2', 'drop3'], all: true, label: 'Goutte',
      each: (W, k, n) => { const al = W.props.drops.userData.alive(); al.slice(0, Math.ceil(al.length / (4 - n))).forEach(m => { m.userData.alive = false; m.visible = false; }); },
      done: async W => { W.props.drops.userData.clear(); }, ok: 'Plus de gouttes en l\'air' },
    { say: 'Nettoie la plaie à grande eau', sub: 'Avec une compresse mouillée : l\'eau ne coule pas. Garde appuyé 3 secondes.', picto: 'cool', cam: 'arm', type: 'hold', hot: 'forearmR', secs: 3, label: 'Nettoyer', ok: 'Plaie propre' },
    { say: 'Pose un pansement', sub: 'Il tient la compresse en place.', picto: 'bandage', cam: 'arm', type: 'tap', hot: 'forearmR', label: 'Pansement',
      done: async W => { const b = W.props.band, P = W.patient; b.visible = true; b.position.copy(P.world('forearmR')); b.scale.set(1, 1.25, 1.25); const el = P.world('elbowR'), wr = P.world('handR'); b.lookAt(wr); b.rotateY(Math.PI / 2); W.props.cut.visible = false; W.props.gauze.visible = false; await wait(500); }, ok: 'Pansement posé' },
    { say: 'Et ensuite ?', sub: null, picto: 'question', cam: 'body', type: 'choice',
      options: [
        { label: 'Le médecin de bord ferme la plaie et surveille l\'infection', picto: 'check', ok: true },
        { label: 'Rien de plus, c\'est fini', picto: 'clock', why: 'Une plaie ouverte se ferme (colle, bandelettes ou points) et se surveille : l\'infection est le risque suivant.' }
      ], ok: null }
  ]
});

/* ---------- 8. Saignement de nez ---------- */
defineSim({
  key: 'nez', title: 'Saignement de nez', fiche: 'F-APE-10', env: 'node1', minutes: 2,
  card: 'Air sec et sang qui monte à la tête : pincer, capter les gouttes, attendre.',
  intro: 'Au repas, dans le nœud Unity, Rafael saigne du nez. En apesanteur, les liquides montent vers la tête et l\'air de la station est sec.',
  role: 'Aide-le à arrêter le saignement sans répandre de gouttes.',
  patient: { who: 'rafael', skin: 'mat', shirt: 0x5a3d2b },
  outcome: 'Le saignement s\'est arrêté. Au-delà de 20 minutes malgré la compression, on aurait appelé le sol.',
  learn: [
    'Tête droite, pas en arrière : sinon le sang coule dans la gorge.',
    'Pincer la partie souple du nez 10 minutes, sans relâcher.',
    'Capter les gouttes avec une compresse ; plus de 20 minutes de saignement : appeler le sol.'
  ],
  sources: ['fiches'],
  async setup(W) {
    const P = W.patient;
    P.setPose('stand'); P.float = 0.5; P.place(V3(0.05, -0.15, -0.4), new THREE.Euler(0, 0.3, 0));
    uprightShots(W);
    const drops = Props.droplets('blood', 12); W.add(drops); W.props.drops = drops; W.every(dt => drops.userData.update(dt));
    W.st.bleed = 1; let acc = 0;
    W.every(dt => { acc += dt * W.st.bleed; if (acc > 0.7) { acc = 0; drops.userData.emit(P.world('nose').addScaledVector(P.front(), 0.01).addScaledVector(P.up(), -0.02), 1, 0.006); } });
    W.anchors.drop1 = () => (drops.userData.alive()[0] || { position: P.world('nose') }).position.clone();
    const gz = Props.gauze(); gz.visible = false; W.add(gz); W.props.gauze = gz;
    const k = Props.medkit('TROUSSE MÉDICALE'); k.position.set(0.55, -0.9, 0.35); k.rotation.y = -0.4; W.add(k); W.anchors.kit = () => k.localToWorld(V3(0, 0.07, 0));
  },
  steps: [
    { say: 'Tête en avant ou en arrière ?', sub: 'Choisis la bonne position.', picto: 'question', cam: 'face', type: 'choice',
      options: [
        { label: 'Tête droite, légèrement en avant', picto: 'nose', ok: true },
        { label: 'Tête en arrière', picto: 'nose', why: 'Tête en arrière, le sang coule dans la gorge et peut faire vomir.' }
      ], ok: 'Tête droite' },
    { say: 'Pince la partie souple du nez', sub: 'Juste sous l\'os, sans relâcher. Garde appuyé 6 secondes : dix minutes en accéléré.', picto: 'nose', cam: 'face', type: 'hold', hot: 'nose', secs: 6, label: 'Nez',
      onHold: W => { W.st.bleed = 0.25; const P = W.patient; W.gripR.visible = true; orientGlove(W.gripR, P.front().negate(), P.up().negate()); W.gripR.position.copy(P.world('nose')).addScaledVector(P.front(), 0.05).addScaledVector(P.up(), 0.02); },
      done: async W => { W.st.bleed = 0; W.gripR.visible = false; }, ok: 'Dix minutes plus tard, ça ne saigne plus' },
    { say: 'Capte les gouttes avec une compresse', sub: 'Touche la goutte qui flotte.', picto: 'gauze', cam: 'face', type: 'tap', hot: 'drop1', label: 'Goutte',
      done: async W => { W.props.drops.userData.clear(); }, ok: 'Aucune goutte ne s\'échappe' },
    { say: 'Si ça saignait encore après 20 minutes ?', sub: null, picto: 'question', cam: 'face', type: 'choice',
      options: [
        { label: 'On appelle le sol', picto: 'call', ok: true },
        { label: 'On attend sans rien dire', picto: 'clock', why: 'Plus de 20 minutes de saignement malgré la compression : on appelle le sol. Le médecin de bord a d\'autres soins (mèche, nitrate d\'argent).' }
      ], ok: null }
  ]
});

/* ---------- 9. Calcul rénal et échographie ---------- */
defineSim({
  key: 'calcul', title: 'Calcul rénal et échographie', fiche: 'F-DIG-12', env: 'lab', minutes: 3,
  card: 'Une douleur du flanc qui vient par vagues. L\'échographie montre le calcul.',
  intro: 'Keiko, le médecin de bord, a une douleur très forte du flanc droit, par vagues. Les os perdent du calcium en vol : le risque de calcul augmente.',
  role: 'C\'est toi qui fais l\'échographie, guidé par AURA.',
  patient: { who: 'keiko', skin: 'keiko', shirt: 0x3d3266 },
  outcome: 'Le calcul est vu. Keiko prend un anti-inflammatoire, boit et filtre ses urines. Des chercheurs testent même des ultrasons pour déplacer un calcul sans opérer.',
  learn: [
    'Douleur très forte du flanc, par vagues, qui descend vers l\'aine : on pense au calcul rénal.',
    'À l\'échographie, le calcul est une tache blanche avec une ombre noire derrière.',
    'Fièvre avec douleur du flanc : c\'est une urgence, on appelle le sol.'
  ],
  sources: ['jones', 'uwKidney', 'fiches'],
  async setup(W) {
    labKit(W, { alarm: false });
    const P = W.patient;
    await P.layOn(W.props.board, 0.01); W.props.board.userData.strap(false);
    boardShots(W);
    const us = Props.ultrasound(); us.position.set(0.5, DECK + 0.04, -0.35); us.rotation.y = -0.9; W.add(us); W.props.us = us;
    const probe = us.userData.probe; W.add(probe); probe.position.set(0.42, DECK + 0.12, -0.12); probe.rotation.z = 1.2;
    const gel = new THREE.Group(); const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.12, 18), std(0x4a8fe0, 0.35)); gel.add(gb); gel.position.set(0.62, DECK + 0.08, -0.05); W.add(gel); W.props.gel = gel;
    W.st.us = { on: false, contact: 0, stone: true }; let t = 0, acc = 0;
    W.every(dt => { t += dt; acc += dt; if (acc > 0.12) { acc = 0; drawUltrasound(us.userData.canvas, Object.assign({ t }, W.st.us)); us.userData.tex.needsUpdate = true; } });
    W.anchors.us = () => us.localToWorld(V3(0, 0.03, 0.05));
    W.anchors.gel = () => gel.localToWorld(V3(0, 0.05, 0));
    W.anchors.screenStone = () => us.localToWorld(V3(0, 0.012, -0.11)).add(new THREE.Vector3(0, 0, 0)).lerp(us.localToWorld(V3(-0.035, 0.2, -0.17)), 1);
    W.shots.us = fit(() => us.localToWorld(V3(0, 0.12, -0.1)), { size: 0.5, dir: () => V3(0, 0.55, 1).applyQuaternion(us.quaternion), fov: 40 });
    W.shots.flank = fit(() => P.world('flankR').lerp(P.world('sternum'), 0.25), { size: 0.75, dir: V3(-0.65, 0.75, 0.25), fov: 44 });
    W.shots.probe = fit(() => P.world('flankR').lerp(us.position, 0.5), { size: 1.0, dir: V3(-0.3, 0.85, 0.5), fov: 46 });
  },
  steps: [
    { say: 'Où a-t-elle mal ?', sub: 'Douleur très forte, par vagues, qui descend vers l\'aine.', picto: 'stone', cam: 'flank', type: 'tap', hot: 'flankR', decoys: ['chest'], labels: { flankR: 'Flanc droit', chest: 'Poitrine' },
      why: { chest: 'Pas la poitrine : la douleur est dans le flanc, sur le côté, sous les côtes.' }, ok: 'Le flanc droit : on pense au rein' },
    { say: 'Allume l\'échographe', sub: null, picto: 'probe', cam: 'us', type: 'tap', hot: 'us', label: 'Échographe',
      done: async W => { W.st.us.on = true; }, ok: null },
    { say: 'Mets du gel sur la sonde', sub: 'Le gel fait passer les ultrasons.', picto: 'gel', cam: 'probe', type: 'tap', hot: 'gel', label: 'Gel', ok: null },
    { say: 'Pose la sonde sur le flanc, sous les côtes', sub: 'Touche le flanc droit.', picto: 'probe', cam: 'flank', type: 'tap', hot: 'flankR', label: 'Sonde ici',
      done: async W => { const pr = W.props.us.userData.probe, P = W.patient; const at = P.world('flankR'); await tweenObj(pr, { pos: at.clone().add(V3(-0.07, 0.02, 0)), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 1.45)), dur: 0.9 }); for (let i = 0; i <= 10; i++) { W.st.us.contact = i / 10; await wait(60); } await W.shot('us'); }, ok: 'Image du rein' },
    { say: 'Trouve le calcul sur l\'écran', sub: 'Une tache blanche, avec une ombre noire derrière.', picto: 'search', cam: 'us', type: 'tap', hot: 'screenStone', label: 'Ici ?', ok: 'Le calcul est vu' },
    { say: 'Quel traitement ?', sub: 'Le médecin de bord décide, c\'est elle la patiente : son suppléant applique la fiche.', picto: 'question', cam: 'board', type: 'choice',
      options: [
        { label: 'Anti-inflammatoire, boire et filtrer les urines', picto: 'drink', ok: true },
        { label: 'Rien, ça passera seul', picto: 'clock', why: 'La douleur est très forte : la fiche prévoit un anti-inflammatoire, puis de quoi aider le calcul à descendre.' }
      ], ok: null }
  ]
});

/* ---------- 10. Accident de décompression après une sortie ---------- */
defineSim({
  key: 'decompression', title: 'Après une sortie : la décompression', fiche: 'F-EXP-05', env: 'airlock', minutes: 3,
  card: 'Une douleur du coude deux heures après une sortie. Oxygène, sol, remise en pression.',
  intro: 'Lucas rentre d\'une sortie de six heures. Deux heures plus tard, dans le sas, il se plaint d\'une douleur profonde au coude.',
  role: 'Avec 50 sorties prévues vers Mars, la NASA estime ce risque à 44 % sur la mission.',
  patient: { who: 'lucas', skin: 'clair', shirt: 0x24365f },
  outcome: 'Sous oxygène et après la remise en pression, la douleur disparaît. Lucas est surveillé de près, et le sol revoit la procédure de la prochaine sortie.',
  learn: [
    'Dans les 24 heures après une sortie, une douleur d\'articulation fait penser d\'abord à la décompression.',
    'Oxygène pur tout de suite, puis remise en pression selon la procédure de la mission.',
    'Signes graves : faiblesse, trouble de la vue ou de la parole, confusion. On appelle toujours le sol.'
  ],
  sources: ['dcs', 'fiches'],
  async setup(W) {
    const P = W.patient;
    P.setPose('neutral'); P.float = 0.6; P.place(V3(0.05, -0.15, -0.6), new THREE.Euler(0, 0.4, 0));
    uprightShots(W);
    try {
      const g = await Models.load('emu');
      const suit = g.scene.clone(true); suit.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.envMapIntensity = 0.6; }); } });
      suit.scale.setScalar(0.92); suit.position.set(-0.45, -1.0, 0.95); suit.rotation.y = 0.6; W.add(suit); W.props.suit = suit;
      W.anchors.suit = () => suit.localToWorld(V3(0, 1.45, 0.15));
    } catch (e) { W.anchors.suit = V3(-0.45, 0.3, 0.95); }
    const o2 = Props.o2(); o2.visible = false; W.add(o2); W.props.o2 = o2;
    const comm = Props.alarmPanel(); comm.position.set(0.79, 0.15, -0.2); faceBasis(comm, V3(0, 0, 1), V3(-1, 0, 0)); W.add(comm); W.props.comm = comm; W.every(dt => comm.userData.update(dt));
    W.anchors.comm = () => comm.localToWorld(V3(0.09, 0.03, 0.012));
    const drink = Props.drinkBag(); drink.position.set(0.6, -0.4, 0.4); W.add(drink); W.props.drink = drink; W.anchors.drink = () => drink.localToWorld(V3(0, 0, 0));
    W.shots.suit = fit(() => W.anchor('suit').add(V3(0, -0.35, 0)), { size: 1.5, dir: V3(0.75, 0.15, -0.9), fov: 50 });
    W.shots.comm = fit('comm', { size: 0.45, dir: V3(-1, 0.15, 0.4), fov: 42 });
    W.anchors.elbow = () => P.world('elbowR');
  },
  steps: [
    { say: 'Douleur au coude, deux heures après la sortie', sub: 'Qu\'est-ce que ça peut être ?', picto: 'question', cam: 'body', type: 'choice',
      options: [
        { label: 'Un accident de décompression', picto: 'suit', ok: true },
        { label: 'Une simple courbature', picto: 'arm', why: 'Dans les 24 heures après une sortie, une douleur d\'articulation fait penser d\'abord à la décompression.' }
      ], ok: 'Des bulles d\'azote ont pu se former' },
    { say: 'Donne-lui de l\'oxygène pur', sub: 'Tout de suite, avec le masque.', picto: 'oxygen', cam: 'face', type: 'tap', hot: 'face', label: 'Masque',
      done: async W => { const m = W.props.o2; m.visible = true; onFace(W, m, 'mouth', 0.035); W.every(() => onFace(W, m, 'mouth', 0.035)); }, ok: 'Oxygène pur' },
    { say: 'Préviens le sol et le médecin de bord', sub: 'Pour la décompression, on appelle toujours le sol.', picto: 'call', cam: 'comm', type: 'tap', hot: 'comm', label: 'Appel',
      done: async W => { W.props.comm.userData.set('WARN'); await wait(800); }, ok: 'Le médecin de vol est en ligne' },
    { say: 'Comment le soigner à bord ?', sub: 'Il n\'y a pas de caisson hyperbare dans un vaisseau.', picto: 'question', cam: 'suit', type: 'choice',
      options: [
        { label: 'Remettre de la pression autour de lui, à l\'oxygène', picto: 'suit', ok: true },
        { label: 'Le laisser dormir', picto: 'clock', why: 'Le traitement, c\'est la pression et l\'oxygène : dans le scaphandre, en augmentant aussi la pression de la cabine.' }
      ], ok: 'Remise en pression dans le scaphandre' },
    { say: 'Prépare le scaphandre pour la remise en pression', sub: 'La NASA indique qu\'au moins 16,4 psi peuvent soulager les symptômes.', picto: 'suit', cam: 'suit', type: 'tap', hot: 'suit', label: 'Scaphandre',
      done: async W => { await wait(1200); }, ok: 'Remise en pression lancée, selon la procédure' },
    { say: 'Fais-le boire', sub: 'Boire fait partie du traitement.', picto: 'drink', cam: 'body', type: 'tap', hot: 'drink', label: 'Poche d\'eau',
      done: async W => { const d = W.props.drink, P = W.patient; await tweenObj(d, { pos: P.world('mouth').addScaledVector(P.front(), 0.12).add(V3(0, -0.08, 0)), dur: 0.8 }); }, ok: null },
    { say: 'Quels signes graves surveiller ?', sub: null, picto: 'question', cam: 'face', type: 'choice',
      options: [
        { label: 'Faiblesse, vue ou parole troublée, confusion', picto: 'alarm', ok: true },
        { label: 'Un peu de faim', picto: 'drink', why: 'Les signes graves sont neurologiques : faiblesse, trouble de la vue ou de la parole, confusion, essoufflement.' }
      ], ok: null }
  ]
});

/* ---------- 11. Étouffement ---------- */
defineSim({
  key: 'etouffement', title: 'Étouffement au repas', fiche: null, env: 'node1', minutes: 3,
  card: 'Une bouchée bloquée. Tapes dans le dos, compressions du ventre, et bien se caler.',
  intro: 'Pendant le repas dans le nœud Unity, Aminata porte les mains à sa gorge. Elle ne peut plus parler ni tousser.',
  role: 'En apesanteur, chaque poussée vous éloigne l\'un de l\'autre : il faut te caler.',
  patient: { who: 'aminata', skin: 'fonce', shirt: 0x2f4f45 },
  outcome: 'Le morceau est sorti, Aminata respire. Après des compressions du ventre, le médecin de bord l\'examine.',
  learn: [
    'Elle ne peut ni parler ni tousser : obstruction grave, on agit tout de suite.',
    'Jusqu\'à 5 tapes dans le dos, puis jusqu\'à 5 compressions du ventre, en alternant.',
    'En apesanteur, on se cale (pieds, dos contre une paroi) pour que la force passe dans le patient : adaptation AURA.'
  ],
  sources: ['erc21'],
  async setup(W) {
    const P = W.patient;
    P.setPose('throat'); P.float = 0.4; P.place(V3(0.05, -0.15, -0.45), new THREE.Euler(0, 0.25, 0));
    P.breathing = false; P.tint({ cyan: 0.15 });
    uprightShots(W);
    W.anchors.backPt = () => P.world('chest').addScaledVector(P.front(), -0.24).addScaledVector(P.up(), 0.05);
    W.anchors.bellyPt = () => P.world('belly').addScaledVector(P.front(), 0.03);
    const bite = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), std(0xc9a26b, 0.7)); bite.visible = false; W.add(bite); W.props.bite = bite;
  },
  steps: [
    { say: 'Elle ne peut ni parler ni tousser', sub: 'Que fais-tu ?', picto: 'question', cam: 'face', type: 'choice',
      options: [
        { label: 'J\'agis tout de suite : obstruction grave', picto: 'alarm', ok: true },
        { label: 'Je l\'encourage à tousser', picto: 'question', why: 'On encourage à tousser quand la personne tousse encore. Ici elle ne peut plus : il faut agir.' }
      ], ok: null },
    { say: 'Cale-toi d\'abord', sub: 'Sans appui, chaque poussée vous éloigne.', picto: 'question', cam: 'back', type: 'choice',
      options: [
        { label: 'Pieds dans les cale-pieds, dos contre la paroi', picto: 'legs', ok: true },
        { label: 'Je flotte librement derrière elle', picto: 'question', why: 'Sans appui, la force te repousse au lieu de passer dans son corps.' }
      ], ok: 'Bien calé' },
    { say: 'Donne 5 tapes fortes dans le dos', sub: 'Entre les omoplates, avec le talon de la main.', picto: 'tap', cam: 'back', type: 'rhythm', count: 5, bpm: [30, 90], hint: 'Une tape par appui, fort et net',
      onBeat: W => { const P = W.patient; W.gloveR.visible = true; orientGlove(W.gloveR, P.front(), P.up()); glovePlace(W.gloveR, W.anchor('backPt'), P.front(), P.up()); setTimeout(() => { W.gloveR.position.addScaledVector(P.front(), -0.06); }, 140); Sound.beep(160, 0.06, 0.09, 'square'); },
      done: async W => { W.gloveR.visible = false; W.toast('Toujours bloqué : compressions du ventre', 'ko'); await wait(1600); } },
    { say: 'Donne 5 compressions du ventre', sub: 'Poing au-dessus du nombril, tire vers toi et vers le haut.', picto: 'pressure', cam: 'back', type: 'rhythm', count: 5, bpm: [30, 90], hint: 'Une compression par appui, sèche et vers le haut',
      onBeat: (W, n) => { const P = W.patient; W.gripR.visible = true; orientGlove(W.gripR, P.front().negate(), P.up().negate()); W.gripR.position.copy(W.anchor('bellyPt')).addScaledVector(P.front(), 0.04); setTimeout(() => W.gripR.position.addScaledVector(P.front(), 0.03), 140); Sound.beep(140, 0.08, 0.09, 'square'); if (n === 4) { const b = W.props.bite; b.visible = true; b.position.copy(P.world('mouth')).addScaledVector(P.front(), 0.03); tweenObj(b, { pos: P.world('mouth').addScaledVector(P.front(), 0.6).add(V3(0, 0.15, 0)), dur: 1.5 }); } },
      done: async W => { W.gripR.visible = false; const P = W.patient; P.breathing = true; P.breathRate = 24; P.tint({}); P.setPose('stand', 1.2); }, ok: 'Le morceau est sorti, elle respire' },
    { say: 'Et après les compressions du ventre ?', sub: null, picto: 'question', cam: 'body', type: 'choice',
      options: [
        { label: 'Le médecin de bord l\'examine', picto: 'check', ok: true },
        { label: 'Rien, tout va bien', picto: 'clock', why: 'Les compressions du ventre peuvent blesser : un examen médical est recommandé ensuite.' }
      ], ok: null }
  ]
});

/* ---------- 12. Brûlure de la main ---------- */
defineSim({
  key: 'brulure', title: 'Brûlure de la main', fiche: 'F-EXP-07', env: 'node1', minutes: 2,
  card: 'Une bulle d\'eau chaude sur la main. Refroidir quand l\'eau ne coule pas.',
  intro: 'En réhydratant son repas, Aminata reçoit sur la main une bulle d\'eau très chaude, qui reste collée à sa peau.',
  role: 'Refroidis et protège la brûlure. En apesanteur, l\'eau ne coule pas.',
  patient: { who: 'aminata', skin: 'fonce', shirt: 0x2f4f45 },
  outcome: 'La brûlure est refroidie et couverte. Le sol est prévenu avec la surface brûlée estimée.',
  learn: [
    'Refroidir longtemps avec des compresses mouillées : l\'eau ne coule pas en apesanteur.',
    'Retirer bagues et bracelet avant que la main gonfle ; ne pas percer les cloques.',
    'On appelle toujours le sol, en donnant la surface brûlée estimée.'
  ],
  sources: ['erc21', 'fiches'],
  async setup(W) {
    const P = W.patient;
    P.setPose('handOut'); P.float = 0.4; P.place(V3(0.0, -0.15, -0.45), new THREE.Euler(0, 0.45, 0));
    uprightShots(W);
    const pad = Props.wetPad(); pad.visible = false; W.add(pad); W.props.pad = pad;
    const burn = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20), new THREE.MeshBasicMaterial({ color: 0xd2453c, transparent: true, opacity: 0.55, depthWrite: false })); W.add(burn); W.props.burn = burn;
    W.every(() => { burn.position.copy(P.world('handR')).add(V3(0, 0.022, 0)); burn.lookAt(camera.position); });
    const bd = Props.bandage(); bd.visible = false; W.add(bd); W.props.band = bd;
  },
  steps: [
    { say: 'Refroidis la brûlure', sub: 'Compresses mouillées : l\'eau ne coule pas en apesanteur. Garde appuyé 5 secondes.', picto: 'cool', cam: 'hand', type: 'hold', hot: 'handR', secs: 5, label: 'Main',
      onHold: W => { const p = W.props.pad; p.visible = true; p.position.copy(W.patient.world('handR')).add(V3(0, 0.03, 0)); },
      done: async W => { W.props.burn.material.opacity = 0.35; }, ok: 'Refroidie (au moins 20 minutes en vrai)' },
    { say: 'Avant que la main gonfle', sub: 'Que faut-il faire ?', picto: 'question', cam: 'hand', type: 'choice',
      options: [
        { label: 'Retirer bagues et bracelet', picto: 'arm', ok: true },
        { label: 'Percer les cloques', picto: 'arm', why: 'On ne perce pas les cloques : risque d\'infection.' }
      ], ok: null },
    { say: 'Couvre avec un pansement propre', sub: null, picto: 'bandage', cam: 'hand', type: 'tap', hot: 'handR', label: 'Pansement',
      done: async W => { W.props.pad.visible = false; W.props.burn.visible = false; const b = W.props.band; b.visible = true; b.scale.set(1.2, 1.3, 1.3); b.position.copy(W.patient.world('handR')); b.lookAt(W.patient.world('forearmR')); b.rotateY(Math.PI / 2); }, ok: 'Brûlure couverte' },
    { say: 'Faut-il prévenir le sol ?', sub: null, picto: 'question', cam: 'body', type: 'choice',
      options: [
        { label: 'Oui, avec la surface brûlée estimée', picto: 'call', ok: true },
        { label: 'Non, c\'est une petite brûlure', picto: 'check', why: 'Pour une brûlure, la fiche dit d\'appeler toujours le sol, avec la surface brûlée estimée.' }
      ], ok: null }
  ]
});
