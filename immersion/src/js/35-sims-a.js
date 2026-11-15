/* ================= simulations (1) : cœur, allergie, feu, air, pression ================= */
const DECK = -1.095;          // pont (sol) du laboratoire Destiny, en mètres sous l'axe de l'allée
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// oriente un objet : axe X local vers xDir, axe Y local vers yDir
function faceBasis(obj, xDir, yDir) {
  const x = xDir.clone().normalize(), y = yDir.clone().normalize(), z = new THREE.Vector3().crossVectors(x, y).normalize();
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
// installation commune du laboratoire : table médicale au pont, panneau d'alarme à tribord
function labKit(W, { board = true, alarm = true, kit = true } = {}) {
  if (board) {
    const b = Props.cmrs(); b.position.set(0, DECK + 0.14, 0.05); W.add(b); W.props.board = b;
    W.anchors.cmrs = () => b.localToWorld(V3(0.16, 0.06, 0.45));
  }
  if (alarm) {
    const a = Props.alarmPanel(); a.position.set(1.11, 0.12, -0.55); faceBasis(a, V3(0, 0, 1), V3(-1, 0, 0)); W.add(a); W.props.alarm = a;
    W.every(dt => a.userData.update(dt));
    W.anchors.alarm = () => a.localToWorld(V3(-0.09, 0.03, 0.012));
    W.anchors.alarmATM = () => a.localToWorld(V3(0.03, 0.03, 0.012));
    W.anchors.alarmDP = () => a.localToWorld(V3(-0.03, 0.03, 0.012));
    W.anchors.alarmWARN = () => a.localToWorld(V3(0.09, 0.03, 0.012));
    W.shots.alarm = { pos: V3(0.35, 0.25, 0.05), target: V3(1.1, 0.12, -0.55), fov: 46 };
  }
  if (kit) {
    const k = Props.medkit('TROUSSE D\'URGENCE'); k.position.set(-0.55, DECK + 0.07, 0.75); k.rotation.y = 0.35; W.add(k); W.props.kit = k;
    W.anchors.kit = () => k.localToWorld(V3(0, 0.07, 0));
    W.shots.kit = fit(() => (W.patient ? k.position.clone().lerp(W.patient.world('belly'), 0.5) : k.position.clone()), { size: 1.7, dir: V3(0.55, 0.45, 1), fov: 52 });
  }
}
// plans de caméra autour d'un patient allongé sur la table (tête vers -Z, ventre vers le haut)
function boardShots(W) {
  const P = W.patient;
  const mid = () => P.world('sternum').lerp(P.world('kneeR'), 0.45);
  Object.assign(W.shots, {
    board: fit(mid, { size: 1.75, dir: V3(0.62, 0.72, 0.55), fov: 55 }),
    chest: fit('sternum', { size: 0.62, dir: V3(0.62, 0.78, 0.32), fov: 44 }),
    face: fit('face', { size: 0.4, dir: V3(0.5, 0.78, -0.42), fov: 40 }),
    thigh: fit('thighR', { size: 0.72, dir: V3(-0.5, 0.8, 0.35), fov: 44 }),
    above: fit('sternum', { size: 1.05, dir: V3(0.18, 1, 0.22), fov: 48 })
  });
}
// directions autour d'un patient « debout » (az : vers sa gauche si positif ; el : vers le haut)
function aroundP(P, az, el = 0) {
  return () => { const f = P.front(), u = P.up(), sd = u.clone().cross(f).normalize(); return f.multiplyScalar(Math.cos(az)).addScaledVector(sd, Math.sin(az)).addScaledVector(u, el); };
}
// patient vertical (en apesanteur, il « tient debout » dans l'allée) : plans de caméra autour de lui
function uprightShots(W) {
  const P = W.patient;
  const bodyC = () => P.world('head').lerp(P.world('kneeR'), 0.5);
  Object.assign(W.shots, {
    body: fit(bodyC, { size: 1.5, dir: aroundP(P, -0.38, 0.1), fov: 50 }),
    full: fit(() => P.world('head').lerp(P.world('kneeR'), 0.62), { size: 2.0, dir: aroundP(P, -0.3, 0.08), fov: 55 }),
    chestUp: fit('chest', { size: 0.75, dir: aroundP(P, -0.3, 0.15), fov: 44 }),
    face: fit('face', { size: 0.36, dir: aroundP(P, -0.32, 0.06), fov: 36 }),
    eye: fit('eyeR', { size: 0.13, dir: aroundP(P, -0.28, 0.04), fov: 30 }),
    thigh: fit('thighR', { size: 0.8, dir: aroundP(P, -0.55, 0.25), fov: 44 }),
    thighL: fit('thighL', { size: 0.8, dir: aroundP(P, 0.55, 0.25), fov: 44 }),
    arm: fit('forearmR', { size: 0.6, dir: aroundP(P, -0.7, 0.35), fov: 42 }),
    hand: fit('handR', { size: 0.42, dir: aroundP(P, -0.55, 0.3), fov: 40 }),
    back: fit('back', { size: 0.95, dir: aroundP(P, Math.PI + 0.45, 0.18), fov: 48 })
  });
  W.shots.wide = W.shots.body;
}
// pose un objet sur le visage du patient (masque) : axe Z local vers l'avant
function onFace(W, obj, anchor = 'face', out = 0.03) {
  const P = W.patient, f = P.front(), up = P.up(), side = up.clone().cross(f).normalize();
  faceBasis(obj, side, up);
  obj.position.copy(P.world(anchor)).addScaledVector(f, out);
}
// stylo auto-injecteur : pointe (axe -Y local) vers « inward », au contact du point « at »
function aimPen(pen, at, inward, up) { faceBasis(pen, up, inward.clone().negate()); pen.position.copy(at).addScaledVector(inward, -0.093); }
// masque du sauveteur : voile sur les bords de l'image
function rescuerMask(on) { $('#trHud').classList.toggle('masked', !!on); }
// objet tenu devant soi, en bas à droite de l'image
function inHand(obj, d = 0.6, x = 0.2, y = -0.12) {
  camera.updateMatrixWorld(true);
  obj.position.copy(new THREE.Vector3(x, y, -d).applyMatrix4(camera.matrixWorld));
  obj.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion()));
}
// matériel de sécurité fixé à la paroi bâbord du laboratoire
function wallKit(W, which) {
  if (which.includes('pba')) {
    const m = Props.pba(); m.position.set(-0.86, 0.32, 0.55); m.rotation.y = Math.PI; W.add(m); W.props.pba = m;
    W.anchors.pba = () => m.localToWorld(V3(-0.08, 0.02, 0));
  }
  if (which.includes('ext')) {
    const e = Props.extinguisher(); e.position.set(-0.84, -0.32, 1.05); e.rotation.set(0, Math.PI / 2, 0.15); W.add(e); W.props.ext = e;
    W.anchors.ext = () => e.localToWorld(V3(0, 0.05, 0));
  }
  if (which.includes('csa')) {
    const a = Props.analyzer(); a.position.set(-0.84, 0.0, -0.25); a.rotation.set(0, 0, -Math.PI / 2); W.add(a); W.props.csa = a;
    W.anchors.csa = () => a.localToWorld(V3(0, 0.03, -0.03));
  }
  if (which.includes('resp')) {
    const r = Props.respirator(); r.position.set(-0.86, 0.32, 0.95); r.rotation.y = -Math.PI / 2; W.add(r); W.props.resp = r;
    W.anchors.resp = () => r.localToWorld(V3(0, 0, 0.04));
  }
  W.shots.port = { pos: V3(0.55, 0.25, 0.55), target: V3(-0.86, 0.1, 0.55), fov: 48 };
  const wall = d => V3(1, 0.18, d);
  if (W.props.pba) W.shots.pba = fit('pba', { size: 0.62, dir: wall(-0.35), fov: 44 });
  if (W.props.csa) W.shots.csa = fit('csa', { size: 0.55, dir: wall(0.3), fov: 44 });
  if (W.props.resp) W.shots.resp = fit('resp', { size: 0.6, dir: wall(-0.3), fov: 44 });
  if (W.props.ext) W.shots.ext = fit('ext', { size: 0.7, dir: wall(-0.4), fov: 44 });
}
// écoutilles des deux extrémités du laboratoire (avant : vers le nœud 2 et les vaisseaux de retour)
function labHatches(W) {
  for (const [k, z, dir] of [['hatchFwd', -3.78, 1], ['hatchAft', 3.78, -1]]) {
    const h = Props.hatchDoor(0.98); h.position.set(-0.49, 0, z); h.userData.door.rotation.y = dir * Math.PI * 0.48; W.add(h); W.props[k] = h;
    W.anchors[k] = () => h.localToWorld(V3(0.49, 0, 0.15 * dir));
  }
  W.shots.fwd = { pos: V3(0.45, 0.15, -2.1), target: V3(0, 0, -3.78), fov: 52 };
  W.shots.aft = { pos: V3(-0.4, 0.15, 2.1), target: V3(0, 0, 3.78), fov: 52 };
}
async function closeHatch(h) { await tweenObj(h.userData.door, { quat: new THREE.Quaternion(), dur: 1.4 }); Sound.beep(120, 0.25, 0.12, 'square'); }

/* ---------- 1. Arrêt cardiaque en apesanteur ---------- */
defineSim({
  key: 'arret', title: 'Arrêt cardiaque en apesanteur', fiche: 'F-CVN-07', env: 'lab', minutes: 4,
  card: 'Lucas s\'effondre dans le laboratoire. Massage en flottant, table médicale, défibrillateur.',
  intro: 'Lucas travaille dans le laboratoire Destiny quand il perd connaissance. Il flotte, immobile.',
  role: 'Tu es le premier à côté de lui. Chaque minute compte.',
  patient: { who: 'lucas', skin: 'clair', shirt: 0x24365f },
  outcome: 'Le cœur de Lucas est reparti. Le médecin de bord prend le relais pour la suite des soins.',
  learn: [
    'En flottant, on s\'accroche au patient pour masser : jambes autour de son torse (méthode Evetts-Russomano).',
    'Pour les soins avancés, le patient est attaché sur la table médicale ; le choc ne se donne que là.',
    'Au centre de la poitrine, 5 à 6 cm, 100 à 120 compressions par minute, sans s\'arrêter longtemps.'
  ],
  sources: ['hink', 'esc25', 'fiches'],
  async setup(W) {
    labKit(W);
    const P = W.patient;
    P.setPose('neutral'); P.float = 1;
    P.place(V3(0.08, -0.25, -0.85), new THREE.Euler(0.15, 0.55, 0.08));
    P.breathing = false; P.tint({ cyan: 0.55, pale: 0.4 });
    boardShots(W);
    W.shots.float = fit(() => P.world('chest').lerp(P.world('head'), 0.2), { size: 1.05, dir: aroundP(P, -0.55, 0.3), fov: 48 });
    W.shots.wide = W.shots.float;
    W.shots.toBoard = fit(() => W.props.board.position.clone().add(V3(0, 0.3, 0)), { size: 2.0, dir: V3(0.55, 0.55, 0.8), fov: 55 });
    const aed = Props.aed(); aed.position.set(0.47, DECK + 0.04, -0.3); aed.rotation.y = -0.25; aed.visible = false; W.add(aed); W.props.aed = aed;
    W.every(dt => aed.userData.update(dt));
    W.anchors.shockBtn = () => aed.localToWorld(V3(0.07, 0.06, 0.045));
    W.shots.aed = fit(() => aed.position.clone().lerp(P.world('sternum'), 0.45), { size: 0.95, dir: V3(0.7, 0.8, 0.35), fov: 45 });
    W.shots.shock = fit('shockBtn', { size: 0.42, dir: V3(0.5, 0.85, 0.4), fov: 40 });
    W.anchors.padR = () => P.world('padR'); W.anchors.padL = () => P.world('padL');
  },
  steps: [
    { say: 'Vérifie s\'il répond et s\'il respire', sub: 'Touche ses épaules et regarde sa poitrine. Dix secondes au plus.', picto: 'tap', cam: 'float', type: 'tap', hot: 'shoulderR', label: 'Épaule',
      demo: W => { const P = W.patient; const a = ghostMove(W, W.ghostR, () => P.world('shoulderR').addScaledVector(P.front(), 0.12), () => P.world('shoulderR').addScaledVector(P.front(), 0.035), { period: 1.4 }); orientGlove(W.ghostR, P.front().negate(), P.up().negate()); return a; },
      done: async W => { W.toast('Il ne répond pas et ne respire pas normalement : arrêt cardiaque', 'ko'); await wait(1800); }, ok: null, pause: 400 },
    { say: 'Donne l\'alarme', sub: 'Le bouton d\'alarme prévient tout l\'équipage. Il faut le défibrillateur tout de suite.', picto: 'alarm', cam: 'alarm', type: 'tap', hot: 'alarmWARN', label: 'Alarme',
      done: async W => { W.props.alarm.userData.set('WARN'); Sound.alarm('warn'); await wait(1600); Sound.stopAlarm(); W.props.aed.visible = true; }, ok: 'Alarme donnée : Rafael apporte le défibrillateur' },
    { say: 'Comment masser en flottant ?', sub: 'Choisis la bonne position.', picto: 'question', cam: 'float', type: 'choice',
      options: [
        { label: 'Je m\'accroche avec les jambes autour de son torse', picto: 'legs', ok: true },
        { label: 'Comme sur Terre, sans m\'accrocher', picto: 'cpr', why: 'Sans appui, chaque poussée vous éloigne l\'un de l\'autre : le massage ne sert à rien.' },
        { label: 'J\'attends la table médicale', picto: 'board', why: 'Pas d\'attente : sans massage, les chances baissent à chaque minute.' }
      ], ok: 'Méthode Evetts-Russomano : tu es accroché, tes mains appuient' },
    { say: 'Masse : 30 compressions', sub: 'Au centre de la poitrine, fort et vite : 5 à 6 cm, 100 à 120 par minute.', picto: 'cpr', cam: 'float', type: 'rhythm', count: 30,
      demo: W => { const P = W.patient; return ghostPress(W, () => P.world('sternum'), { palm: P.front().negate(), fingers: P.up().cross(P.front()).normalize() }); },
      enter: async W => { W.patient.showShirt(false); },
      onBeat: (W) => { const P = W.patient; W.gloveR.visible = W.gloveL.visible = true; const palm = P.front().negate(), fing = P.up().cross(P.front()).normalize(); P.press(1); pressHands(W.gloveR, W.gloveL, () => P.world('sternum'), palm, fing, 1, 0.01, 0.045); setTimeout(() => { P.press(0); pressHands(W.gloveR, W.gloveL, () => P.world('sternum'), palm, fing, 0, 0.01, 0.045); }, 170); },
      done: async W => { W.gloveR.visible = W.gloveL.visible = false; }, ok: 'Bien. Rafael est là avec le défibrillateur' },
    { say: 'Attache-le sur la table médicale', sub: 'Les sangles le tiennent pendant le choc et les soins.', picto: 'board', cam: 'toBoard', type: 'tap', hot: 'cmrs', label: 'Table médicale',
      enter: W => { W.patient.hoverOver(W.props.board, 0.32, 1.8); },
      done: async W => { await W.patient.layOn(W.props.board, 1.8); W.props.board.userData.strap(true); }, ok: 'Il est attaché sur la table' },
    { say: 'Colle les deux électrodes', sub: 'Une sous la clavicule droite, une sur le côté gauche de la poitrine.', picto: 'pads', cam: 'chest', type: 'tap', hot: ['padR', 'padL'], all: true, labels: { padR: 'Sous la clavicule', padL: 'Côté gauche' },
      each: (W, k) => { const p = Props.pad(); W.add(p); const P = W.patient; const at = W.anchor(k); p.position.copy(W.props.aed.position).add(V3(0, 0.08, 0)); const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), P.front()); tweenObj(p, { pos: at.addScaledVector(P.front(), 0.004), quat: q, dur: 0.7 }); W.props.aed.userData.setMode('analyse'); },
      ok: 'Électrodes en place' },
    { say: 'Le défibrillateur analyse : personne ne touche', sub: 'Écarte tes mains et tes genoux de la table.', picto: 'handoff', cam: 'aed', type: 'watch',
      watch: async W => { W.props.aed.userData.setMode('analyse'); Sound.speak('Analyse du rythme. Ne touchez pas le patient.'); await wait(3600); W.props.aed.userData.setMode('shock'); Sound.speak('Choc conseillé.'); await wait(1600); }, voice: false },
    { say: 'Appuie sur le bouton de choc', sub: 'Le choc ne se donne que patient attaché sur la table isolée.', picto: 'shock', cam: 'shock', type: 'tap', hot: 'shockBtn', label: 'Choc',
      done: async W => { const r = W.patient.root; const y = r.position.y; await tweenObj(r, { pos: r.position.clone().add(V3(0, 0.025, 0)), dur: 0.08 }); await tweenObj(r, { pos: V3(r.position.x, y, r.position.z), dur: 0.2 }); W.props.aed.userData.setMode('cpr'); Sound.speak('Choc délivré. Reprenez le massage.'); }, ok: 'Choc délivré' },
    { say: 'Reprends le massage : 30 compressions', sub: 'Pieds calés au plafond, bras tendus : la position du poirier.', picto: 'handstand', cam: 'above', type: 'rhythm', count: 30,
      demo: W => { const P = W.patient; return ghostPress(W, () => P.world('sternum'), { palm: V3(0, -1, 0), fingers: V3(-1, 0, 0) }); },
      onBeat: (W) => { const P = W.patient; W.gloveR.visible = W.gloveL.visible = true; P.press(1); pressHands(W.gloveR, W.gloveL, () => P.world('sternum'), V3(0, -1, 0), V3(-1, 0, 0), 1, 0.01, 0.045); setTimeout(() => { P.press(0); pressHands(W.gloveR, W.gloveL, () => P.world('sternum'), V3(0, -1, 0), V3(-1, 0, 0), 0, 0.01, 0.045); }, 170); },
      done: async W => { W.gloveR.visible = W.gloveL.visible = false; W.props.aed.userData.setMode('sinus'); const P = W.patient; P.breathing = true; P.breathRate = 10; await wait(600); P.tint({ pale: 0.25 }); }, ok: 'Le pouls est revenu, il respire' }
  ]
});

// accès au monde courant pour les plans de caméra définis dans les étapes
function W0() { return Trainer.W; }

/* ---------- 2. Allergie grave (anaphylaxie) ---------- */
defineSim({
  key: 'anaphylaxie', title: 'Allergie grave', fiche: 'F-INF-08', env: 'lab', minutes: 4,
  card: 'Rafael réagit à un antibiotique : plaques, lèvres qui gonflent, souffle qui siffle.',
  intro: 'Dix minutes après son premier comprimé d\'antibiotique, Rafael se couvre de plaques. Ses lèvres gonflent et il respire en sifflant.',
  role: 'Tu es seul avec lui. Le médecin de bord se prépare dans le sas.',
  patient: { who: 'rafael', skin: 'mat', shirt: 0x2c3e6a },
  outcome: 'Après deux doses d\'adrénaline, Rafael respire librement. Il reste sous surveillance plusieurs heures.',
  learn: [
    'Lèvres ou gorge qui gonflent et respiration qui siffle après une exposition : c\'est une anaphylaxie.',
    'Adrénaline tout de suite, dans la face externe de la cuisse, en tenant le stylo 3 secondes.',
    'Pas d\'amélioration après 5 minutes : deuxième dose. Puis surveillance de près, la réaction peut revenir.'
  ],
  sources: ['rcukAna', 'fiches'],
  async setup(W) {
    labKit(W, { board: false });
    const P = W.patient;
    P.setPose('stand'); P.float = 0.6;
    P.place(V3(0.12, -0.05, -0.75), new THREE.Euler(0, 0.4, 0));
    P.breathRate = 28; P.U.hives.value = 0.85; P.U.swell.value = 0.8; P.tint({ flush: 0.6 });
    uprightShots(W);
    const pen = Props.epipen(); pen.visible = false; W.add(pen); W.props.pen = pen;
    const pen2 = Props.epipen(); pen2.visible = false; W.add(pen2); W.props.pen2 = pen2;
    const o2 = Props.o2(); o2.visible = false; W.add(o2); W.props.o2 = o2;
    W.anchors.armR = () => P.world('arm'); W.anchors.belly = () => P.world('belly');
  },
  steps: [
    { say: 'Qu\'est-ce qui lui arrive ?', sub: 'Plaques sur la peau, lèvres qui gonflent, souffle qui siffle, juste après un médicament.', picto: 'question', cam: 'face', type: 'choice',
      options: [
        { label: 'Une allergie grave (anaphylaxie)', picto: 'alarm', ok: true },
        { label: 'Une simple réaction de la peau', picto: 'arm', why: 'Les lèvres qui gonflent et le sifflement montrent que la gorge et les bronches sont touchées : c\'est grave.' },
        { label: 'Une crise d\'angoisse', picto: 'question', why: 'L\'angoisse ne donne ni plaques ni lèvres gonflées.' }
      ], ok: 'Anaphylaxie : chaque minute compte' },
    { say: 'Donne l\'alarme médicale', sub: 'L\'équipage arrive, le médecin de bord est prévenu.', picto: 'alarm', cam: 'alarm', type: 'tap', hot: 'alarmWARN', label: 'Alarme',
      done: async W => { W.props.alarm.userData.set('WARN'); Sound.alarm('warn'); await wait(1200); Sound.stopAlarm(); }, ok: 'Alarme donnée' },
    { say: 'Prends le stylo d\'adrénaline', sub: 'Il est dans la trousse d\'urgence.', picto: 'pen', cam: 'kit', type: 'tap', hot: 'kit', label: 'Trousse',
      done: async W => { const pen = W.props.pen; pen.visible = true; pen.position.copy(W.props.kit.position).add(V3(0, 0.1, 0)); const P = W.patient; const at = P.world('thighR').addScaledVector(P.front(), 0.0).addScaledVector(P.up().cross(P.front()).normalize(), -0.2); await tweenObj(pen, { pos: at, dur: 0.9 }); }, ok: 'Stylo en main, capuchon bleu retiré' },
    { say: 'Où piquer ?', sub: 'Touche le bon endroit sur son corps.', picto: 'pen', cam: 'body', type: 'tap', hot: 'thighR', decoys: ['armR', 'belly'], labels: { thighR: 'Cuisse', armR: 'Bras', belly: 'Ventre' },
      why: { armR: 'Pas dans le bras : c\'est dans le muscle de la cuisse que l\'adrénaline agit le plus vite.', belly: 'Pas dans le ventre : face externe de la cuisse, même à travers le vêtement.' },
      done: async W => { const P = W.patient, side = P.up().cross(P.front()).normalize(); const pen = W.props.pen; const q = new THREE.Object3D(); aimPen(q, P.world('thighR'), side.clone(), P.up()); await tweenObj(pen, { pos: q.position.clone().addScaledVector(side, -0.06), quat: q.quaternion, dur: 0.8 }); }, ok: 'Face externe de la cuisse' },
    { say: 'Appuie fort et tiens 3 secondes', sub: 'Garde le doigt appuyé jusqu\'au bout du cercle.', picto: 'hold', cam: 'thigh', type: 'hold', hot: 'thighR', secs: 3, label: 'Maintenir',
      onHold: W => { const P = W.patient, side = P.up().cross(P.front()).normalize(); const q = new THREE.Object3D(); aimPen(q, P.world('thighR'), side, P.up()); tweenObj(W.props.pen, { pos: q.position, dur: 0.25 }); },
      done: async W => { const pen = W.props.pen; pen.userData.tip.scale.y = 1.6; Sound.beep(520, 0.05, 0.08, 'square'); await wait(500); const P = W.patient, side = P.up().cross(P.front()).normalize(); await tweenObj(pen, { pos: pen.position.clone().addScaledVector(side, -0.25), dur: 0.7 }); pen.visible = false; }, ok: 'Adrénaline injectée à 0:00' },
    { say: 'Pose le masque à oxygène', sub: 'L\'oxygène l\'aide à respirer pendant que l\'adrénaline agit.', picto: 'oxygen', cam: 'face', type: 'tap', hot: 'face', label: 'Visage',
      done: async W => { const m = W.props.o2; m.visible = true; const tmp = new THREE.Object3D(); onFace({ patient: W.patient }, tmp, 'mouth', 0.035); m.position.copy(tmp.position).addScaledVector(W.patient.front(), 0.3); m.quaternion.copy(tmp.quaternion); await tweenObj(m, { pos: tmp.position, dur: 0.8 }); W.every(() => { onFace({ patient: W.patient }, m, 'mouth', 0.035); }); }, ok: 'Oxygène en place' },
    { say: 'Cinq minutes passent : surveille', sub: 'Regarde ses lèvres et écoute sa respiration.', picto: 'clock', cam: 'face', type: 'watch',
      watch: async W => { const P = W.patient; for (let i = 0; i <= 20; i++) { P.U.hives.value = 0.85 - i * 0.008; await wait(110); } W.toast('Cinq minutes plus tard : il siffle encore, ses lèvres restent gonflées', 'ko'); await wait(2600); } },
    { say: 'Deuxième dose, dans l\'autre cuisse', sub: 'Pas d\'amélioration après 5 minutes : on refait une injection. Tiens 3 secondes.', picto: 'hold', cam: 'thighL', type: 'hold', hot: 'thighL', secs: 3, label: 'Maintenir',
      enter: async W => { const P = W.patient, side = P.up().cross(P.front()).normalize(); const pen = W.props.pen2; pen.visible = true; aimPen(pen, P.world('thighL'), side.clone().negate(), P.up()); pen.position.addScaledVector(side, 0.08); },
      onHold: W => { const P = W.patient, side = P.up().cross(P.front()).normalize(); const q = new THREE.Object3D(); aimPen(q, P.world('thighL'), side.clone().negate(), P.up()); tweenObj(W.props.pen2, { pos: q.position, dur: 0.25 }); },
      done: async W => { const pen = W.props.pen2; pen.userData.tip.scale.y = 1.6; await wait(400); pen.visible = false; const P = W.patient; for (let i = 0; i <= 30; i++) { P.U.hives.value = Math.max(0, 0.69 - i * 0.025); P.U.swell.value = Math.max(0, 0.8 - i * 0.027); P.breathRate = 28 - i * 0.4; P.tint({ flush: 0.6 - i * 0.02 }); await wait(70); } }, ok: 'Il respire mieux, les lèvres dégonflent' },
    { say: 'Et maintenant ?', sub: 'La crise semble passée.', picto: 'question', cam: 'body', type: 'choice',
      options: [
        { label: 'Je le surveille de près pendant des heures', picto: 'clock', ok: true },
        { label: 'C\'est fini, il peut reprendre son travail', picto: 'check', why: 'La réaction peut revenir dans les heures qui suivent : surveillance rapprochée, et nouvelle dose si les signes reviennent.' }
      ], ok: 'La réaction peut revenir : on reste à côté' }
  ]
});

/* ---------- 3. Feu à bord ---------- */
defineSim({
  key: 'incendie', title: 'Feu à bord', fiche: 'F-EXP-06', env: 'lab', minutes: 4,
  card: 'Une fumée sort d\'un rack du laboratoire. Alerter, se regrouper, agir : dans cet ordre.',
  intro: 'Une odeur de brûlé, puis une fumée grise sort d\'un équipement du laboratoire. Lucas est juste à côté et tousse.',
  role: 'Sur l\'ISS, la règle est la même pour toutes les urgences du vaisseau : alerter, se regrouper, agir.',
  patient: { who: 'lucas', skin: 'clair', shirt: 0x24365f },
  outcome: 'Le feu est éteint, l\'air redevient sûr. Lucas, qui a respiré la fumée, reçoit de l\'oxygène et sera surveillé 24 heures.',
  learn: [
    'Alerter, se regrouper, agir : toujours dans cet ordre, en gardant le chemin libre vers le vaisseau de retour.',
    'Masque d\'abord ; on coupe le courant de l\'appareil, puis on vide l\'extincteur dans son port incendie.',
    'On n\'enlève les masques qu\'après la mesure de l\'air. Toute personne exposée reçoit de l\'oxygène.'
  ],
  sources: ['tobias', 'fiches'],
  async setup(W) {
    labKit(W, { board: false, kit: false });
    wallKit(W, ['pba', 'ext', 'csa']);
    const P = W.patient;
    P.setPose('neutral'); P.float = 0.5; P.place(V3(-0.15, -0.2, 2.2), new THREE.Euler(0, -2.6, 0)); P.root.visible = false;
    uprightShots(W);
    // rack qui fume (paroi tribord) avec son interrupteur et son port incendie
    const smoke = Props.smoke(50); smoke.position.set(1.0, -0.25, 1.75); W.add(smoke); W.props.smoke = smoke; smoke.userData.set(0.85);
    W.every(dt => smoke.userData.update(dt));
    const sw = new THREE.Group(); sw.position.set(1.11, 0.3, 1.45);
    const plate = new THREE.Mesh(rbox(0.14, 0.02, 0.1, 0.006), std(0x2f3237, 0.5)); plate.rotation.z = Math.PI / 2; sw.add(plate);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.05, 0.018), std(0xd8342b, 0.4)); lever.position.set(-0.025, 0.012, 0); lever.rotation.z = 0.5; sw.add(lever);
    W.add(sw); W.props.sw = sw; W.props.lever = lever;
    const port = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 10, 24), std(0xc8ccd0, 0.35, 0.7)); port.position.set(1.12, -0.05, 1.75); port.rotation.y = Math.PI / 2; W.add(port);
    W.anchors.rack = V3(1.08, -0.15, 1.75); W.anchors.power = () => sw.localToWorld(V3(-0.02, 0.02, 0)); W.anchors.firePort = V3(1.1, -0.05, 1.75);
    W.shots.rack = fit(V3(1.05, -0.12, 1.75), { size: 1.0, dir: V3(-1, 0.3, -0.45), fov: 50 });
    W.shots.gather = { pos: V3(0.2, 0.2, 1.2), target: V3(0, 0, -3.5), fov: 60 };
  },
  steps: [
    { say: 'Fumée ! Donne l\'alarme incendie', sub: 'Le bouton FIRE prévient tout l\'équipage et arrête la ventilation.', picto: 'alarm', cam: 'alarm', type: 'tap', hot: 'alarm', label: 'FIRE',
      done: async W => { W.props.alarm.userData.set('FIRE'); Sound.alarm('fire'); await wait(1500); }, ok: 'Alarme donnée : la ventilation s\'arrête' },
    { say: 'Mets ton masque', sub: 'Le masque de secours te donne de l\'oxygène pur.', picto: 'mask', cam: 'pba', type: 'tap', hot: 'pba', label: 'Masque',
      done: async W => { W.props.pba.visible = false; rescuerMask(true); Sound.stopAlarm(); }, ok: 'Masque en place' },
    { say: 'Où regrouper l\'équipage ?', sub: 'Choisis l\'endroit le plus sûr.', picto: 'question', cam: 'gather', type: 'choice',
      options: [
        { label: 'Côté vaisseaux de retour, chemin libre', picto: 'hatch', ok: true },
        { label: 'Près du feu, pour aider', picto: 'smoke', why: 'Personne ne reste près du feu sans raison : on se regroupe côté vaisseaux de retour.' },
        { label: 'Chacun dans sa cabine', picto: 'question', why: 'On se regroupe ensemble, pour se compter et garder le chemin libre vers le vaisseau.' }
      ], ok: 'Tout le monde est compté, le chemin est libre' },
    { say: 'Trouve l\'appareil qui fume', sub: 'Regarde d\'où sort la fumée.', picto: 'search', cam: 'rack', type: 'tap', hot: 'rack', label: 'Rack', ok: 'Source trouvée' },
    { say: 'Coupe son alimentation électrique', sub: 'Sans courant, l\'appareil ne chauffe plus.', picto: 'power', cam: 'rack', type: 'tap', hot: 'power', label: 'Courant',
      done: async W => { await tweenObj(W.props.lever, { quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.5)), dur: 0.3 }); W.props.smoke.userData.set(0.45); }, ok: 'Courant coupé' },
    { say: 'Vide l\'extincteur dans le port incendie', sub: 'Garde appuyé 3 secondes.', picto: 'extinguisher', cam: 'rack', type: 'hold', hot: 'firePort', secs: 3, label: 'Port incendie',
      onHold: W => { const e = W.props.ext; tweenObj(e, { pos: V3(0.95, -0.15, 1.75), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, -1.3)), dur: 0.5 }); },
      done: async W => { Sound.beep(90, 1.2, 0.05, 'sawtooth'); for (let i = 0; i <= 20; i++) { W.props.smoke.userData.set(0.45 * (1 - i / 20)); await wait(60); } }, ok: 'Le feu est éteint' },
    { say: 'Mesure l\'air avant d\'enlever les masques', sub: 'L\'analyseur mesure les gaz du feu.', picto: 'analyzer', cam: 'csa', type: 'tap', hot: 'csa', label: 'Analyseur',
      done: async W => { const a = W.props.csa.userData; a.show(['CO   58 ppm', 'HCl   3 ppm', 'HCN   1 ppm', 'O₂   21 %'], false); W.toast('Encore trop de monoxyde de carbone : masques gardés, l\'air est filtré', 'info'); await wait(2600); a.show(['CO    4 ppm', 'HCl   0 ppm', 'HCN   0 ppm', 'O₂   21 %'], true); await wait(1200); rescuerMask(false); }, ok: 'Air redevenu sûr : masques retirés' },
    { say: 'Lucas tousse : donne-lui de l\'oxygène', sub: 'Toute personne exposée à la fumée reçoit de l\'oxygène pur.', picto: 'oxygen', cam: 'face', type: 'tap', hot: 'face', label: 'Lucas',
      enter: async W => { W.patient.root.visible = true; W.patient.breathRate = 22; W.patient.tint({ pale: 0.3 }); },
      done: async W => { const m = Props.o2(); W.add(m); onFace(W, m, 'mouth', 0.035); W.every(() => onFace(W, m, 'mouth', 0.035)); }, ok: 'Oxygène pour Lucas, surveillance 24 heures' }
  ]
});

/* ---------- 4. Dépressurisation ---------- */
defineSim({
  key: 'depress', title: 'Fuite d\'air : dépressurisation', fiche: null, env: 'lab', minutes: 3,
  card: 'La pression baisse. Calculer le temps qui reste, isoler la fuite, ne jamais se couper du vaisseau.',
  intro: 'Une alarme retentit : la pression de la station baisse lentement. Quelque part, l\'air s\'échappe.',
  role: 'Tu es dans le laboratoire. Le vaisseau de retour est amarré à l\'avant, côté nœud 2.',
  patient: null,
  outcome: 'La fuite est isolée dans le laboratoire. Le sol aide à la localiser et à la boucher, comme pour le petit trou trouvé dans un Soyuz en 2018.',
  learn: [
    'Alerter et se regrouper, puis calculer le temps de réserve : le temps avant que la pression tombe à 490 mmHg.',
    'Plus de 10 minutes de réserve : on cherche la fuite en fermant des écoutilles. 10 minutes ou moins : repli.',
    'Ne jamais fermer une écoutille entre soi et son vaisseau de retour.'
  ],
  sources: ['tobias'],
  async setup(W) {
    labKit(W, { board: false, kit: false });
    labHatches(W);
    const g = Props.gauge(); g.position.set(-0.9, 0.25, -0.9); g.rotation.y = Math.PI / 2; W.add(g); W.props.gauge = g;
    W.st.p = 742; W.st.rate = 5.4; // mmHg par minute (temps accéléré)
    W.every(dt => { if (W.st.rate > 0) W.st.p -= W.st.rate * dt / 6; g.userData.set(W.st.p); });
    W.anchors.gauge = () => g.localToWorld(V3(0, 0, 0.02));
    W.shots.gauge = fit('gauge', { size: 0.5, dir: V3(1, 0.12, 0.35), fov: 42 });
    W.shots.wide = { pos: V3(0.5, 0.25, 1.4), target: V3(0, 0, -2), fov: 60 };
  },
  steps: [
    { say: 'Alarme de pression : donne l\'alerte', sub: 'Le bouton ΔP prévient tout l\'équipage.', picto: 'alarm', cam: 'alarm', type: 'tap', hot: 'alarmDP', label: 'ΔP',
      done: async W => { W.props.alarm.userData.set('ΔP'); Sound.alarm('depress'); await wait(2200); Sound.stopAlarm(); }, ok: 'Alerte donnée, l\'équipage se regroupe côté vaisseaux' },
    { say: 'Lis la pression de la cabine', sub: 'Le manomètre donne la pression en millimètres de mercure.', picto: 'gauge', cam: 'gauge', type: 'tap', hot: 'gauge', label: 'Manomètre',
      done: async W => { await wait(2500); }, ok: null },
    { say: 'Combien de temps reste-t-il ?', sub: 'La pression baisse d\'environ 5 mmHg par minute ; le seuil est 490 mmHg.', picto: 'clock', cam: 'gauge', type: 'choice',
      options: [
        { label: 'Environ 45 minutes', picto: 'clock', ok: true },
        { label: 'Moins de 5 minutes', picto: 'alarm', why: 'De 740 à 490 mmHg, il y a 250 mmHg à perdre : à 5 mmHg par minute, cela fait environ 45 minutes.' },
        { label: 'Plusieurs jours', picto: 'question', why: '250 mmHg à perdre, 5 par minute : environ 45 minutes, pas des jours.' }
      ], ok: 'Temps de réserve : environ 45 minutes' },
    { say: 'Avec 45 minutes, que fais-tu ?', sub: 'Choisis la bonne stratégie.', picto: 'question', cam: 'wide', type: 'choice',
      options: [
        { label: 'Je cherche la fuite en fermant des écoutilles', picto: 'hatch', ok: true },
        { label: 'J\'évacue tout de suite dans le vaisseau', picto: 'alarm', why: 'Avec plus de 10 minutes de réserve, on cherche et on isole la fuite. On se replie à 10 minutes ou moins.' }
      ], ok: 'On isole module par module' },
    { say: 'Sors vers l\'avant et ferme l\'écoutille du labo', sub: 'Touche l\'écoutille à fermer. Jamais entre toi et ton vaisseau.', picto: 'hatch', cam: 'wide', type: 'tap', hot: 'hatchFwd', decoys: ['hatchAft'], labels: { hatchFwd: 'Avant, vers le vaisseau', hatchAft: 'Arrière' },
      why: { hatchAft: 'Pas celle-ci : tu te retrouverais du mauvais côté, loin de ton vaisseau de retour.' },
      done: async W => { await W.shot('fwd'); await closeHatch(W.props.hatchFwd); }, ok: 'Écoutille fermée' },
    { say: 'La pression tient-elle de ton côté ?', sub: 'Lis le manomètre du nœud 2.', picto: 'gauge', cam: 'fwd', type: 'watch',
      watch: async W => { await wait(1200); W.st.rate = 0; W.toast('Pression stable de ton côté : la fuite est dans le laboratoire, isolée', 'ok'); await wait(2600); } }
  ]
});

/* ---------- 5. Fuite d'ammoniac ---------- */
defineSim({
  key: 'ammoniac', title: 'Fuite d\'ammoniac', fiche: 'F-EXP-10', env: 'lab', minutes: 3,
  card: 'Odeur piquante, yeux qui brûlent : masque, repli, écoutille fermée, puis rinçage.',
  intro: 'Une alarme d\'atmosphère toxique sonne. Une odeur piquante envahit le laboratoire : sans doute l\'ammoniac du circuit de refroidissement.',
  role: 'Sur l\'ISS, toute alarme toxique inexpliquée est traitée comme de l\'ammoniac.',
  patient: { who: 'rafael', skin: 'mat', shirt: 0x2c3e6a },
  outcome: 'L\'équipage est à l\'abri. Rafael, dont les yeux ont été touchés, a été rincé longtemps. Le sol prend la suite pour le circuit de refroidissement.',
  learn: [
    'Alarme toxique : masque tout de suite, repli hors du segment américain, écoutille fermée derrière soi.',
    'Puis masque filtrant à cartouches contre l\'ammoniac, purgé avant de le mettre.',
    'Yeux ou peau touchés : rinçage long et abondant, puis oxygène si la respiration gêne.'
  ],
  sources: ['tobias', 'fiches'],
  async setup(W) {
    labKit(W, { board: false, kit: false });
    labHatches(W);
    wallKit(W, ['pba', 'resp']);
    const P = W.patient;
    P.setPose('stand'); P.float = 0.5; P.place(V3(0.15, -0.1, 3.0), new THREE.Euler(0, Math.PI, 0)); P.root.visible = false;
    uprightShots(W);
    const ew = Props.eyewash(); ew.visible = false; W.add(ew); W.props.eyewash = ew;
    const drops = Props.droplets('water', 12); W.add(drops); W.props.drops = drops; W.every(dt => drops.userData.update(dt));
    const haze = Props.smoke(26); haze.position.set(0, -0.4, 0); W.add(haze); haze.userData.set(0.25); W.every(dt => haze.userData.update(dt)); W.props.haze = haze;
    haze.children.forEach(s => s.material.color.setHex(0xd9e8c8));
  },
  steps: [
    { say: 'Alarme toxique : mets ton masque', sub: 'Tout de suite, sans chercher la cause.', picto: 'mask', cam: 'pba', type: 'tap', hot: 'pba', label: 'Masque',
      enter: async W => { W.props.alarm.userData.set('ATM'); Sound.alarm('atm'); },
      done: async W => { W.props.pba.visible = false; rescuerMask(true); }, ok: 'Masque en place' },
    { say: 'Où vas-tu ?', sub: 'L\'ammoniac vient des circuits du segment américain.', picto: 'question', cam: 'wide', type: 'choice',
      options: [
        { label: 'Vers le segment russe, par l\'arrière', picto: 'hatch', ok: true },
        { label: 'Je reste dans le labo pour chercher la fuite', picto: 'search', why: 'Avec de l\'ammoniac, on ne cherche pas : on quitte le segment américain et on ferme derrière soi.' }
      ], ok: 'Repli vers le segment russe' },
    { say: 'Passe l\'écoutille et ferme-la derrière toi', sub: 'L\'ammoniac reste de l\'autre côté.', picto: 'hatch', cam: 'aft', type: 'tap', hot: 'hatchAft', label: 'Écoutille arrière',
      done: async W => { await closeHatch(W.props.hatchAft); W.props.haze.userData.set(0); Sound.stopAlarm(); }, ok: 'Écoutille fermée' },
    { say: 'Prends le masque à cartouches vertes', sub: 'Il filtre l\'ammoniac. Purge-le avant de le mettre.', picto: 'mask', cam: 'resp', type: 'tap', hot: 'resp', label: 'Masque filtrant',
      done: async W => { W.props.resp.visible = false; }, ok: 'Masque filtrant en place' },
    { say: 'Rafael a les yeux qui brûlent : rince-les', sub: 'Rinçage long. Garde appuyé 4 secondes.', picto: 'eye', cam: 'face', type: 'hold', hot: 'eyeR', secs: 4, label: 'Yeux',
      enter: async W => { const P = W.patient; P.root.visible = true; P.place(V3(0.15, -0.1, 0.6), new THREE.Euler(0, 0.35, 0)); P.tint({ flush: 0.3 }); const ew = W.props.eyewash; ew.visible = true; const f = P.front(); faceBasis(ew, P.up().cross(f).normalize(), f.clone().negate()); ew.position.copy(P.world('eyeR')).addScaledVector(f, 0.13); },
      onHold: W => { W.props.drops.userData.emit(W.patient.world('eyeR').addScaledVector(W.patient.front(), 0.012), 6, 0.02); },
      done: async W => { W.props.eyewash.visible = false; W.toast('L\'eau ne coule pas en apesanteur : on l\'absorbe avec une compresse', 'info'); await wait(1600); W.props.drops.userData.clear(); W.patient.tint({}); }, ok: 'Yeux rincés' }
  ]
});
