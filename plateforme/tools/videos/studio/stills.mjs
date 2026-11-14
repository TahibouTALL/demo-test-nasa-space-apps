// Images fixes des vidéos : décor réel de l'ISS (modèle NASA), équipage MakeHuman, accessoires des simulations.
// Variables disponibles dans « setup » : S (outils), A (window.__aura), exp (scène ouverte), V (vecteur).
const key = `const L = new A.THREE.DirectionalLight(0xfff0e0, 1.1); L.position.set(1.5, 1.2, 2.2); exp.scene.add(L); const L2 = new A.THREE.DirectionalLight(0xcfe2ff, 0.35); L2.position.set(-2, 0.5, -1); exp.scene.add(L2);`;
const T = 'const T = A.Trainer, W = T.W; T.clearHots && T.clearHots();';
// plan centré sur un point d'ancrage de la simulation
const camAt = (anchor, off, fov = 45, tgtOff = [0, 0, 0]) => `{ const p = W.anchor('${anchor}'); S.cam([p.x + ${off[0]}, p.y + ${off[1]}, p.z + ${off[2]}], [p.x + ${tgtOff[0]}, p.y + ${tgtOff[1]}, p.z + ${tgtOff[2]}], ${fov}); }`;

export const STILLS = {
  // ---------------- décors et équipage
  lab_aisle: { url: 'scene=iss-lab&clean=1', setup: `S.cam([0.35, 0.18, 2.9], [0, -0.05, -3], 60);` },
  lab_crew: { url: 'scene=iss-lab&clean=1', setup: `
    const P = await S.crew('lucas', 'work', [0.32, -0.12, -0.55], [0, -0.75, 0.05]);
    await S.crew('keiko', 'float', [-0.3, -0.2, -2.1], [0.1, 0.55, 0]);
    S.cam([0.25, 0.12, 1.55], [0.05, -0.05, -1.2], 52);
    S.light(P, { at: 'chest', amb: 0.8, pts: 0.9, env: 0.5, key: 1.1, rim: 0.7, side: 0.3, exposure: 0.88 });` },
  lucas_face: { url: 'scene=iss-lab&clean=1', setup: `
    const P = await S.crew('lucas', 'stand', [0.1, -0.2, -0.6], [0, 0.35, 0]);
    S.portrait(P, { exposure: 0.86 });` },
  aminata_face: { url: 'scene=iss-node1&clean=1', setup: `
    const P = await S.crew('aminata', 'stand', [0.0, -0.18, -0.2], [0, 0.4, 0]);
    S.portrait(P, { exposure: 0.9, key: 2.1, env: 0.45 });` },
  rafael_face: { url: 'scene=iss-lab&clean=1', setup: `
    const P = await S.crew('rafael', 'stand', [0.0, -0.2, -0.9], [0, -0.35, 0]);
    S.portrait(P, { side: 0.32, shift: -0.12, exposure: 0.88 });` },
  keiko_portrait: { url: 'scene=iss-node2&clean=1', setup: `
    const P = await S.crew('keiko', 'work', [0.05, -0.2, -0.5], [0, 0.45, 0]);
    S.portrait(P, { dist: 1.05, fov: 40, side: -0.4, shift: 0.1, tilt: -0.1, up: 0.08, exposure: 0.88 });` },
  rafael_curled: { url: 'scene=iss-node2&clean=1', setup: `
    const P = await S.crew('rafael', 'curled', [0.05, -0.05, -0.4], [0.2, 0.9, 0.1]);
    const f = P.world('chest'); S.cam([f.x + 0.9, f.y + 0.3, f.z + 1.35], [f.x, f.y - 0.05, f.z], 46);
    S.light(P, { at: 'chest', side: 0.4, amb: 0.7, env: 0.45, exposure: 0.88 });` },
  aminata_drink: { url: 'scene=iss-node1&clean=1', setup: `
    const P = await S.crew('aminata', 'drink', [0.05, -0.18, -0.25], [0, 0.5, 0]);
    const b = A.Props.drinkBag(); exp.extras.add(b); const m = P.world('mouth'); const fr = P.front();
    b.position.copy(m).addScaledVector(fr, 0.06).add(V(0, -0.07, 0)); b.lookAt(m);
    S.portrait(P, { dist: 0.95, fov: 40, side: -0.35, tilt: -0.09, exposure: 0.9, key: 2.1, env: 0.45 });` },
  node1_meal: { url: 'scene=iss-node1&clean=1', setup: `
    const P = await S.crew('aminata', 'drink', [-0.5, -0.18, -0.45], [0, 1.1, 0]);
    await S.crew('rafael', 'work', [0.55, -0.15, -0.6], [0, -1.15, 0.05]);
    const b = A.Props.drinkBag(); exp.extras.add(b); const m = P.world('mouth'); b.position.copy(m).addScaledVector(P.front(), 0.06).add(V(0, -0.07, 0)); b.lookAt(m);
    S.cam([0.05, 0.22, 1.7], [0.0, -0.25, -0.55], 52);
    S.light(P, { at: 'chest', amb: 0.8, pts: 0.9, env: 0.5, key: 1.1, rim: 0.8, side: -0.3, exposure: 0.9 });` },
  node2_cq: { url: 'scene=iss-node2&clean=1', setup: `S.cam([0.25, 0.15, 1.9], [0, -0.05, -2], 58);` },
  node3: { url: 'scene=iss-node3&clean=1', setup: `
    const P = await S.crew('lucas', 'work', [0.15, -0.15, -0.9], [0, -0.7, 0]);
    S.cam([-0.25, 0.1, 1.2], [0.1, -0.15, -1.2], 58);
    S.light(P, { at: 'chest', amb: 0.8, pts: 0.9, env: 0.5, key: 1.1, rim: 0.7, side: 0.3, exposure: 0.9 });` },
  // ---------------- coupole et Terre
  cupola_day: { url: 'scene=earth&clean=1', setup: `S.cam([0, 0.05, 0.1], [0.35, -1, -0.55], 74);` },
  cupola_aminata: { url: 'scene=earth&clean=1', settle: 4000, setup: `
    const P = await S.crew('aminata', { spine: [-0.12, 0, 0], head: [-0.6, 0, 0], shR: [-0.5, 0, -0.45], shL: [-0.4, 0, 0.5], elR: [-1.0, 0, 0], elL: [-0.9, 0, 0], hpR: [-0.25, 0, -0.05], hpL: [-0.2, 0, 0.05], knR: [0.45, 0, 0], knL: [0.4, 0, 0] }, [0.05, 0.5, 0.15]);
    { const T3 = A.THREE; P.root.quaternion.copy(new T3.Quaternion().setFromAxisAngle(V(0, 1, 0), 0.4).multiply(new T3.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI))); P.update(0.016); }
    const h = P.world('head');
    S.cam([h.x + 0.42, h.y + 0.62, h.z + 0.5], [h.x - 0.1, h.y - 0.75, h.z - 0.35], 68);
    S.light(P, { at: 'head', amb: 1, env: 0.5, key: 1.2, rim: 1.0, side: 0.3 });` },
  earth_day: { url: 'scene=earth&clean=1&menu=1', setup: `exp.menuMode(true); S.cam([0, 0, 0], [0.2, -0.45, -1], 60);` },
  earth_night: { url: 'scene=earth&clean=1&menu=1&preset=nuit', setup: `exp.menuMode(true); exp.setPreset('nuit'); S.cam([0, 0, 0], [0.2, -0.5, -1], 60);`, settle: 6000 },
  earth_dawn: { url: 'scene=earth&clean=1&menu=1&preset=crepuscule', setup: `exp.menuMode(true); exp.setPreset('crepuscule'); exp.update(0.016); exp.faceSun(); const c = A.camera; A.App.camMode = 'look'; A.look.pitch = -0.12;`, settle: 6000 },
  // ---------------- simulations (on rejoue jusqu'à l'étape voulue)
  cpr_float: { url: 'sim=arret&go=1', step: 3, wait: 3000, setup: `${T} const P = W.patient; P.showShirt(false); W.ghostR.visible = W.ghostL.visible = false; W.gloveR.visible = W.gloveL.visible = true; const palm = P.front().negate(), fing = P.up().cross(P.front()).normalize(); A.pressHands(W.gloveR, W.gloveL, P.world('sternum'), palm, fing, 0.6, 0.01, 0.045); ${camAt('sternum', [0.75, 0.35, 0.95], 44, [0, 0.05, 0])} S.light(W.patient, { at: 'sternum', amb: 0.8, pts: 0.9, env: 0.5, key: 1.0, rim: 0.6, side: 0.4, exposure: 0.9 });` },
  aed_board: { url: 'sim=arret&go=1', step: 7, wait: 3500, setup: `${T} ${camAt('sternum', [0.95, 0.85, 0.55], 46, [0.15, -0.05, -0.05])} S.light(W.patient, { at: 'sternum', amb: 0.8, pts: 0.9, env: 0.5, key: 1.0, rim: 0.6, side: 0.4, exposure: 0.9 });` },
  cpr_above: { url: 'sim=arret&go=1', step: 8, wait: 3000, setup: `${T} const P = W.patient; W.ghostR.visible = W.ghostL.visible = false; W.gloveR.visible = W.gloveL.visible = true; A.pressHands(W.gloveR, W.gloveL, P.world('sternum'), V(0, -1, 0), V(-1, 0, 0), 0.6, 0.01, 0.045); ${camAt('sternum', [0.55, 0.95, 0.65], 46)} S.light(W.patient, { at: 'sternum', amb: 0.8, pts: 0.9, env: 0.5, key: 1.0, rim: 0.6, side: 0.4, exposure: 0.9 });` },
  fire_smoke: { url: 'sim=incendie&go=1', step: 3, wait: 6000, setup: `${T} S.cam([-0.35, 0.2, 0.25], [1.0, -0.15, 1.8], 52);` },
  fire_alarm: { url: 'sim=incendie&go=1', step: 0, wait: 2500, setup: `${T} W.props.alarm.userData.set('FIRE'); ${camAt('alarm', [-0.55, 0.12, 0.35], 40, [0.06, 0, 0])}`, settle: 4500 },
  pba: { url: 'sim=incendie&go=1', step: 1, wait: 2500, setup: `${T} ${camAt('pba', [0.7, 0.12, -0.2], 42)}` },
  extinguisher: { url: 'sim=incendie&go=1', step: 5, wait: 2500, setup: `${T} ${camAt('firePort', [-0.75, 0.25, -0.35], 46)}` },
  gauge: { url: 'sim=depress&go=1', step: 1, wait: 2500, setup: `${T} ${camAt('gauge', [0.45, 0.06, 0.18], 40)}` },
  hatch_closed: { url: 'sim=depress&go=1', step: 5, wait: 4000, setup: `${T} S.cam([0.35, 0.1, -1.6], [-0.05, 0, -3.8], 52);` },
  ammonia_haze: { url: 'sim=ammoniac&go=1', step: 1, wait: 3000, setup: `${T} S.cam([0.4, 0.2, 2.6], [0, -0.1, -2], 58);` },
  eye_exam: { url: 'sim=oeil&go=1', step: 5, wait: 4500, setup: `${T} const P = W.patient; const f = P.world('face'); const fr = P.front(); const sd = P.up().cross(fr).normalize(); const c = f.clone().addScaledVector(fr, 0.55).addScaledVector(sd, -0.32); S.cam([c.x, c.y, c.z], [f.x, f.y, f.z], 36); S.light(P, { exposure: 0.9, side: -0.32 });` },
  kidney_us: { url: 'sim=calcul&go=1', step: 4, wait: 4000, setup: `${T} S.cam([0.95, -0.2, 0.6], [0.2, -0.85, -0.3], 48); S.light(W.patient, { at: 'belly', amb: 0.85, pts: 0.9, env: 0.5, key: 1.0, rim: 0.6, side: 0.4, exposure: 0.9 });` },
  airlock_emu: { url: 'scene=iss-airlock&clean=1', setup: `${key}
    const g = await A.Models.load('emu'); const suit = g.scene.clone(true); suit.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => { m.envMapIntensity = 0.6; }); });
    suit.scale.setScalar(0.92); suit.position.set(0.05, -0.95, -1.3); suit.rotation.y = 3.5; (exp.extras || exp.scene).add(suit);
    const c = new A.THREE.Box3().setFromObject(suit).getCenter(V(0, 0, 0));
    S.cam([0.32, 0.08, 0.55], [c.x, c.y + 0.12, c.z], 50);` },
  airlock_lucas: { url: 'sim=decompression&go=1', step: 2, wait: 3000, setup: `${T} const P = W.patient; const f = P.world('face'); const fr = P.front(); const sd = P.up().cross(fr).normalize(); const c = f.clone().addScaledVector(fr, 0.85).addScaledVector(sd, -0.3).add(V(0, 0.02, 0)); S.cam([c.x, c.y, c.z], [f.x, f.y - 0.1, f.z], 40); S.light(P, { exposure: 0.9, side: -0.3 });` }
};
