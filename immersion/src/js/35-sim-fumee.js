/* ================= Simulation 3 : inhalation de fumée ================= */
const SMAC1H = { co: 425, hcn: 8, hcl: 5 };
SIMS.fumee = {
  id: 'fumee', title: 'Inhalation de fumée', fiche: 'F-EXP-06',
  patient: { name: 'Aminata Sarr', role: 'commandante', look: { skin: 0x5e3a26, shirt: 0x24324f, pants: 0x4b4a44, hair: 0x120d0b, bun: true } },
  context: 'Jour 61. Pendant une expérience dans le laboratoire, une carte électronique surchauffe dans un rack. Aminata Sarr travaillait à trente centimètres quand la fumée est sortie, et elle l\'a respirée plusieurs secondes avant de reculer. L\'alarme incendie retentit. Lucas Moreau et Rafael Ortiz sont dans le module voisin.',
  facts: [['Votre rôle', 'Keiko Tanaka, médecin de bord'], ['Avec vous', 'Lucas Moreau et Rafael Ortiz'], ['Patiente', 'Aminata Sarr, exposée à la fumée sans masque'], ['Fiche AURA', 'F-EXP-06 · Inhalation de fumée'], ['Durée', 'Environ 20 minutes, avec des avances de temps pour la surveillance']],
  note: 'La simulation suit la demi-vie du monoxyde de carbone dans le sang (environ 5 heures à l\'air, environ 80 minutes sous oxygène pur) et les seuils d\'une heure de la NASA pour l\'air de la cabine. Le gonflement de la gorge et la dose de cyanure sont des choix AURA. Personnages fictifs.',
  firstLog: 'Alerte incendie dans le laboratoire : fumée sortant d\'un rack. Aminata tousse près de la source.',
  crew: [{ id: 'lucas', name: 'Lucas Moreau', short: 'Lucas', skill: 'crew' }, { id: 'rafael', name: 'Rafael Ortiz', short: 'Rafael', skill: 'crew' }, { id: 'vous', name: 'Keiko Tanaka', short: 'Vous', skill: 'medecin', you: true }],
  cats: ['securite', 'evaluer', 'air', 'surveiller', 'circ', 'medic', 'equipe'],
  stock: { masques: 8, salbu: 2, fluid: 3 },
  init(S) {
    Object.assign(S.flags, { co: 640, hcn: 13, hcl: 21, source: true, smoke: 1, evac: false, filt: false, youMask: null, aMask: null, crewMask: null,
      cohb: 17, youCohb: 1, cn: 0.25, edema: 0.05, bronch: 0.6, o2: null, o2Stopped: null, intub: null, measures: [], minSpo2Shown: 99, sol: null, env: null, crewChecked: null,
      masksOff: null, maskLeft: { you: 0, a: 0 }, worstEdema: 0, ox: 'air' });
    S.v.temp = 37.2;
  },
  physio(S, dt) {
    const F = S.flags, v = S.v;
    // air du module où se trouve la patiente
    if (F.source) { F.co += 3.2 * dt; F.hcn += 0.05 * dt; F.hcl += 0.08 * dt; }
    const tau = F.evac ? 240 : (F.filt ? 700 : 1900);
    if (!F.source || F.evac) { F.co -= F.co / tau * dt; F.hcn -= F.hcn / tau * dt; F.hcl -= F.hcl / (tau * 0.7) * dt; }
    F.co = Math.max(F.co, 2); F.hcn = Math.max(F.hcn, 0.05); F.hcl = Math.max(F.hcl, 0.05);
    F.smoke = clamp(F.co / 700, 0, 1) * (F.evac ? 0.15 : 1);
    // masques : 15 minutes d'oxygène chacun
    for (const k of ['you', 'a']) {
      const on = k === 'you' ? F.youMask : F.aMask;
      if (on !== null && F.maskLeft[k] > 0) {
        F.maskLeft[k] -= dt;
        if (F.maskLeft[k] <= 0) { Sim.addLog(S.t, 'alarm', k === 'you' ? 'Votre masque est vide : changez-le ou sortez de la fumée.' : 'Le masque d\'Aminata est vide.'); if (k === 'you') F.youMask = null; else { F.aMask = null; if (F.ox === 'masque') F.ox = 'air'; } }
      }
    }
    const exposedA = F.aMask === null && F.intub === null && F.co > 30;
    const exposedYou = F.youMask === null && F.co > 30;
    // monoxyde de carbone : absorption sans masque, élimination selon l'oxygène reçu
    const half = (F.ox === 'air' ? 320 : 80) * 60;
    F.cohb += dt * ((exposedA ? 2.1e-5 * F.co : 0) - F.cohb * Math.LN2 / half);
    F.youCohb += dt * ((exposedYou ? 2.1e-5 * F.co : 0) - F.youCohb * Math.LN2 / ((F.youMask !== null ? 80 : 320) * 60));
    F.cn += dt * ((exposedA ? 0.0009 * F.hcn : 0) - F.cn * Math.LN2 / 3600);
    // gonflement de la gorge qui progresse pendant des heures, bronches irritées qui se calment
    const emax = 0.92;
    F.edema = F.intub !== null ? F.edema : Math.min(emax, F.edema + dt * (emax - F.edema) / 4300);
    F.worstEdema = Math.max(F.worstEdema, F.edema);
    const salbu = F.salbuT !== undefined && S.t - F.salbuT < 2400 ? smoothstep(0, 300, S.t - F.salbuT) : 0;
    F.bronch = Math.max(0.05, F.bronch - dt * F.bronch / 9000);
    const b = F.bronch * (1 - 0.5 * salbu);
    const crit = clamp((F.edema - 0.8) / 0.12, 0, 1);
    const tubeOk = F.intub !== null;
    // valeurs : la saturation au doigt confond le CO avec l'oxygène
    let sp = 98.5 - 3 * b - (tubeOk ? 0 : 30 * crit * crit);
    if (F.ox !== 'air') sp += 1;
    v.spo2 = clamp(sp, 55, 99.5);
    if (v.spo2Probe) F.minSpo2Shown = Math.min(F.minSpo2Shown, v.spo2);
    v.hr = clamp(92 + 0.8 * F.cohb + 14 * b + 45 * crit + 25 * Math.max(0, F.cn - 0.5), 55, 180);
    v.sbp = clamp(132 - 45 * Math.max(0, F.cn - 0.6) - 40 * crit * crit, 50, 180);
    v.dbp = clamp(82 - 25 * Math.max(0, F.cn - 0.6) - 25 * crit * crit, 30, 110);
    v.rr = tubeOk ? 14 : 18 + 8 * b + 14 * crit;
    v.effort = 0.6 + b * 0.5 + crit;
    v.perf = clamp((v.sbp - 45) / 70, 0, 1);
    v.etco2 = 36;
    F.stridor = !tubeOk && F.edema > 0.55;
    F.conf = F.cohb + 20 * Math.max(0, F.cn - 0.5);
    S.look = { soot: 1, cyan: crit, pale: clamp((F.cohb - 20) / 30, 0, 1), eyesClosed: F.conf > 42 || crit > 0.85, mask: F.aMask !== null || F.ox === 'nrb' || tubeOk, smoke: F.smoke, ext: !!F.extT && S.t - F.extT < 600, iv: !!F.iv };
    F.deadT = (crit > 0.95 && !tubeOk) || F.cohb > 62 ? (F.deadT || 0) + dt : 0;
  },
  observe(S) {
    const F = S.flags, o = [];
    if (F.conf > 42) o.push('Aminata ne répond plus.');
    else if (F.conf > 28) o.push('Aminata est somnolente, lente à répondre.');
    else if (F.conf > 16) o.push('Aminata est confuse, se plaint d\'un mal de tête et de nausées.');
    else if (F.conf > 9) o.push('Aminata a mal à la tête.');
    else o.push('Aminata répond normalement.');
    if (F.intub !== null) o.push('Elle est intubée et ventilée.');
    else if (F.edema > 0.8) o.push('Bruit aigu et fort à chaque inspiration, elle lutte pour respirer.');
    else if (F.stridor) o.push('Un bruit aigu apparaît à l\'inspiration.');
    else if (F.edema > 0.3) o.push('Voix rauque.');
    o.push('Suie autour du nez et de la bouche.');
    if (F.bronch > 0.35 && F.intub === null) o.push('Elle tousse.');
    if (F.smoke > 0.3) o.push('La fumée est épaisse dans le module.');
    return o.join(' ');
  },
  inSmoke(S) { return !S.flags.evac && S.flags.co > SMAC1H.co; },
  actions: [
    { id: 'masque_vous', cat: 'securite', label: 'Mettre votre propre masque à oxygène', detail: 'Avant tout geste · 8 s', dur: 8, who: 'vous', stock: 'masques',
      req: S => S.flags.youMask !== null ? 'Vous avez déjà un masque.' : true,
      run(S) { S.flags.youMask = S.t; S.flags.maskLeft.you = 900; if (S.flags.firstYouMask === undefined) S.flags.firstYouMask = S.t; return 'masque à oxygène en place sur votre visage (15 minutes d\'autonomie).'; } },
    { id: 'masques_equipe', cat: 'securite', label: 'Faire mettre leur masque à Lucas et Rafael', detail: '10 s', dur: 0, once: true,
      run(S) { S.flags.crewMask = S.t; S.stock.masques -= 2; return 'Lucas et Rafael mettent leur masque.'; } },
    { id: 'masque_a', cat: 'securite', label: 'Mettre un masque à oxygène à Aminata', detail: 'Il lui donne de l\'oxygène pur · 12 s', dur: 12, stock: 'masques',
      req: S => S.flags.aMask !== null ? 'Aminata a déjà un masque.' : (S.flags.intub !== null ? 'Elle est intubée.' : (SIMS.fumee.inSmoke(S) && S.flags.youMask === null ? 'Mettez d\'abord votre propre masque : sans lui, vous serez la prochaine victime.' : true)),
      run(S) { S.flags.aMask = S.t; S.flags.maskLeft.a = 900; S.flags.ox = 'masque'; if (S.flags.o2 === null) S.flags.o2 = S.t; return 'masque à oxygène en place sur Aminata, oxygène pur.'; } },
    { id: 'couper', cat: 'securite', label: 'Couper l\'alimentation électrique du rack', detail: '15 s', dur: 15, once: true, who: 'autre',
      req: S => S.flags.crewMask === null ? 'Lucas et Rafael doivent d\'abord mettre leur masque.' : true,
      run(S) { S.flags.source = false; S.flags.cutT = S.t; return 'alimentation du rack coupée : la carte ne chauffe plus.'; } },
    { id: 'extincteur', cat: 'securite', label: 'Utiliser l\'extincteur à CO₂ dans le rack', detail: '20 s', dur: 20, once: true, who: 'autre',
      req: S => S.flags.crewMask === null ? 'Lucas et Rafael doivent d\'abord mettre leur masque.' : true,
      run(S) { S.flags.extT = S.t; S.flags.source = false; return 'extincteur vidé dans le rack : plus de fumée qui sort.'; } },
    { id: 'evacuer', cat: 'securite', label: 'Emmener Aminata dans le module voisin et fermer l\'écoutille', detail: '40 s', dur: 40, once: true,
      run(S) { S.flags.evac = S.t; S.flags.co = Math.min(S.flags.co, 60); S.flags.hcn = Math.min(S.flags.hcn, 1.2); S.flags.hcl = Math.min(S.flags.hcl, 2); if (Sim.exp) Sim.exp.setPose('table'); return 'Aminata est dans le module voisin, écoutille fermée. L\'air y est presque propre.'; } },
    { id: 'analyseur', cat: 'securite', label: 'Mesurer l\'air avec l\'analyseur des produits de combustion', detail: '20 s', dur: 20, kind: 'find',
      run(S) {
        const F = S.flags; F.measures.push(S.t); F.lastMeasure = { t: S.t, co: F.co, hcn: F.hcn, hcl: F.hcl };
        const below = F.co < SMAC1H.co && F.hcn < SMAC1H.hcn && F.hcl < SMAC1H.hcl;
        return `Air ${F.evac ? 'du module voisin' : 'du laboratoire'} : monoxyde de carbone ${Math.round(F.co)} ppm (seuil d'une heure ${SMAC1H.co}), cyanure d'hydrogène ${nf1(F.hcn)} ppm (seuil ${SMAC1H.hcn}), chlorure d'hydrogène ${nf1(F.hcl)} ppm (seuil ${SMAC1H.hcl}). ${below ? 'Tout est sous les seuils d\'une heure.' : 'Au-dessus des seuils : on garde les masques.'}`;
      } },
    { id: 'filtration', cat: 'securite', label: 'Lancer la filtration de secours de l\'air', detail: '30 s', dur: 30, once: true, who: 'autre',
      run(S) { S.flags.filt = S.t; return 'filtration de secours en marche.'; } },
    { id: 'enlever_masques', cat: 'securite', label: 'Retirer les masques de l\'équipe', detail: 'Seulement si l\'air mesuré est sous les seuils', dur: 0, once: true,
      req: S => { const m = S.flags.lastMeasure; if (!m || S.t - m.t > 300) return 'Mesurez d\'abord l\'air (mesure de moins de 5 minutes).'; return m.co < SMAC1H.co && m.hcn < SMAC1H.hcn && m.hcl < SMAC1H.hcl ? true : 'La dernière mesure dépasse les seuils.'; },
      run(S) { S.flags.masksOff = S.t; S.flags.youMask = null; return 'Masques retirés pour l\'équipe. Aminata garde son oxygène.'; } },
    { id: 'abcde', cat: 'evaluer', label: 'Examiner : gorge, respiration, circulation, conscience, peau', detail: '45 s', dur: 45, kind: 'find',
      run(S) {
        const F = S.flags, v = S.v;
        const A = F.intub !== null ? 'intubée' : F.edema > 0.8 ? 'bruit aigu fort à l\'inspiration, gorge très gonflée' : F.stridor ? 'bruit aigu à l\'inspiration, voix rauque' : F.edema > 0.3 ? 'voix rauque, suie dans la bouche' : 'suie dans le nez et la bouche, voix normale';
        return `Voies aériennes : ${A}. Respiration : ${Math.round(v.rr)} par minute${F.bronch > 0.3 ? ', sifflements, toux' : ''}${v.spo2Probe ? `, saturation affichée ${Math.round(v.spo2)} %` : ''}. Circulation : pouls ${Math.round(v.hr)}, peau rosée. Conscience : ${F.conf > 28 ? 'somnolente' : F.conf > 16 ? 'confuse, mal de tête' : 'bien orientée'}. Peau : pas de brûlure, suie sur le visage.`;
      } },
    { id: 'voix', cat: 'evaluer', label: 'Écouter la voix et l\'inspiration', detail: 'À refaire régulièrement · 15 s', dur: 15, kind: 'find',
      run(S) { const F = S.flags; F.voiceChecks = (F.voiceChecks || 0) + 1; return F.intub !== null ? 'Elle est intubée.' : F.edema > 0.8 ? 'Bruit aigu fort à chaque inspiration : la gorge se ferme.' : F.stridor ? 'Un bruit aigu à l\'inspiration est apparu.' : F.edema > 0.3 ? 'Voix rauque, pas de bruit à l\'inspiration.' : 'Voix presque normale.'; } },
    { id: 'conscience', cat: 'evaluer', label: 'Évaluer la confusion par quelques questions', detail: '30 s', dur: 30, kind: 'find',
      run(S) { const c = S.flags.conf; return c > 28 ? 'Aminata ne sait plus quel jour on est et s\'endort entre les questions.' : c > 16 ? 'Aminata répond lentement, se trompe sur l\'heure, se plaint d\'un mal de tête.' : c > 9 ? 'Réponses justes, mal de tête léger.' : 'Réponses justes et rapides.'; } },
    { id: 'o2pur', cat: 'air', label: 'Oxygène pur au masque à haute concentration, en continu', detail: 'Hors de la fumée · 20 s', dur: 20,
      req: S => S.flags.ox === 'nrb' ? 'C\'est déjà en place.' : (S.flags.intub !== null ? 'Elle est intubée, sous oxygène pur.' : true),
      run(S) { S.flags.ox = 'nrb'; S.flags.aMask = null; if (S.flags.o2 === null) S.flags.o2 = S.t; return 'masque à haute concentration, oxygène pur en continu.'; } },
    { id: 'o2stop', cat: 'air', label: 'Arrêter l\'oxygène : la saturation est à 98 %', dur: 0, hidden: S => S.flags.ox === 'air' || S.flags.intub !== null,
      run(S) { S.flags.ox = 'air'; S.flags.aMask = null; S.flags.o2Stopped = S.t; return 'oxygène arrêté.'; } },
    { id: 'salbu', cat: 'air', label: 'Salbutamol en spray, avec chambre d\'inhalation', detail: 'Pour les sifflements · 40 s', dur: 40, stock: 'salbu', req: S => S.flags.intub !== null ? 'Elle est intubée : il passera dans la sonde, plus tard.' : true,
      run(S) { S.flags.salbuT = S.t; return 'salbutamol inhalé.'; } },
    { id: 'intub', cat: 'air', label: 'Intubation précoce (vous, médecin)', detail: 'Avant que la gorge ne se ferme · 90 s', dur: 90, who: 'medecin', once: true,
      run(S) {
        const F = S.flags;
        const p = F.edema < 0.8 ? 0.95 : 0.5;
        if (S.rnd() < p) { F.intub = S.t; F.ox = 'tube'; F.intubEdema = F.edema; return `intubation réussie${F.edema > 0.8 ? ', difficile : la gorge était déjà très gonflée' : ''}. Ventilation à l'oxygène pur.`; }
        S.done.intub = undefined;
        return 'échec de l\'intubation : la gorge est trop gonflée. Oxygène au masque, nouvelle tentative possible.';
      } },
    { id: 'cyanure', cat: 'medic', label: 'Antidote du cyanure (hydroxocobalamine)', dur: 0, req: () => 'Absent de la liste publiée des médicaments de l\'ISS : oxygène pur et surveillance seulement.' },
    { id: 'ecg', cat: 'surveiller', label: 'Poser les électrodes de l\'ECG', detail: '30 s', dur: 30, once: true, run(S) { S.v.leads = true; return 'électrodes posées.'; } },
    { id: 'spo2', cat: 'surveiller', label: 'Poser le capteur de saturation au doigt', detail: '10 s', dur: 10, once: true, run(S) { S.v.spo2Probe = true; return 'capteur au doigt posé.'; } },
    { id: 'cuff', cat: 'surveiller', label: 'Poser le brassard de tension (toutes les 3 min)', detail: '25 s', dur: 25, once: true, run(S) { S.v.cuff = true; S.flags.nibpAuto = true; Sim.measureNIBP(); return 'brassard posé.'; } },
    { id: 'att15', cat: 'surveiller', label: 'Surveiller 15 minutes (le temps avance)', detail: 'Hors de la fumée', dur: 0,
      req: S => S.flags.evac || (!S.flags.source && S.flags.co < SMAC1H.co) ? true : 'Pas tant que la fumée menace.', run(S) { S.skip = 900; return 'Surveillance de 15 minutes.'; } },
    { id: 'att60', cat: 'surveiller', label: 'Surveiller 1 heure (le temps avance)', detail: 'Hors de la fumée', dur: 0,
      req: S => S.flags.evac || (!S.flags.source && S.flags.co < SMAC1H.co) ? true : 'Pas tant que la fumée menace.', run(S) { S.skip = 3600; return 'Surveillance d\'une heure.'; } },
    { id: 'iv', cat: 'circ', label: 'Poser une voie veineuse', detail: '2 min', dur: 120, once: true, run(S) { S.flags.iv = S.t; return 'voie veineuse posée.'; } },
    { id: 'fluid', cat: 'circ', label: 'Perfuser 500 mL de sérum, poche sous pression', detail: '30 s', dur: 30, stock: 'fluid', req: S => S.flags.iv ? true : 'Il faut d\'abord une voie veineuse.', run(S) { S.flags.fluidT = S.t; return 'perfusion de sérum en cours.'; } },
    { id: 'sol', cat: 'equipe', label: 'Appeler le médecin de vol', detail: '30 s', dur: 30,
      run(S) {
        S.flags.sol = S.flags.sol ?? S.t;
        Sim.callGround(S2 => ({ text: `Médecin de vol : reçu, inhalation de fumée avec ${S2.flags.conf > 16 ? 'confusion' : 'mal de tête'}. Ne vous fiez pas à la saturation : le monoxyde de carbone la fausse. Oxygène pur en continu pendant plusieurs heures. Surveillez la voix et le bruit à l'inspiration ; au premier bruit, on discute d'une intubation précoce. Pas d'antidote du cyanure à bord : si elle s'endort ou si la tension baisse, rappelez-nous tout de suite.` }));
        return 'appel au médecin de vol.';
      } },
    { id: 'env', cat: 'equipe', label: 'Prévenir l\'équipe environnement au sol (qualité de l\'air)', detail: '20 s', dur: 20, once: true,
      run(S) { S.flags.env = S.t; Sim.callGround(() => ({ text: 'Équipe environnement : gardez les masques tant que les mesures dépassent les seuils d\'une heure. Filtration de secours en marche, nouvelle mesure toutes les 15 minutes. Le laboratoire reste fermé jusqu\'à notre feu vert.' })); return 'équipe environnement prévenue.'; } },
    { id: 'equipage', cat: 'equipe', label: 'Examiner Lucas et Rafael, exposés eux aussi', detail: '1 min', dur: 60, once: true, who: 'vous', kind: 'find',
      run(S) { S.flags.crewChecked = S.t; return S.flags.crewMask !== null && S.flags.crewMask < 60 ? 'Lucas et Rafael vont bien : masques mis tôt, pas de symptôme.' : 'Lucas a un léger mal de tête, Rafael tousse un peu : à surveiller aussi.'; } }
  ],
  guide: [
    { text: 'Votre masque d\'abord, puis ceux de l\'équipe.', done: S => S.flags.firstYouMask !== undefined && S.flags.crewMask !== null },
    { text: 'Masque à oxygène pour Aminata, et la sortir de la fumée.', done: S => S.flags.o2 !== null && !!S.flags.evac },
    { text: 'Couper l\'alimentation du rack, extincteur si la fumée continue.', done: S => !S.flags.source },
    { text: 'Oxygène pur en continu, même si la saturation affiche 98 %.', done: S => S.flags.o2 !== null && S.flags.o2Stopped === null },
    { text: 'Appeler le médecin de vol et l\'équipe environnement.', done: S => S.flags.sol !== null && S.flags.env !== null },
    { text: 'Surveiller la voix et le bruit à l\'inspiration ; intuber tôt si un bruit apparaît.', done: S => S.flags.intub !== null || (S.flags.voiceChecks || 0) >= 2 },
    { text: 'Mesurer l\'air avant de retirer les masques.', done: S => S.flags.masksOff !== null || S.flags.measures.length > 0 },
    { text: 'Examiner aussi le reste de l\'équipage.', done: S => S.flags.crewChecked !== null }
  ],
  tip(S) {
    const F = S.flags;
    if (F.firstYouMask === undefined && SIMS.fumee.inSmoke(S)) return 'Votre masque avant tout : dans cette fumée, vous seriez la prochaine victime.';
    if (F.o2 === null) return 'Aminata a respiré la fumée : oxygène pur tout de suite, le masque à oxygène en donne.';
    if (F.source) return 'La carte chauffe toujours : faites couper l\'alimentation du rack.';
    if (!F.evac && F.co > SMAC1H.co) return 'L\'air du laboratoire dépasse les seuils : emmenez Aminata dans le module voisin.';
    if (F.o2Stopped !== null && F.ox === 'air' && F.cohb > 5) return 'La saturation à 98 % est trompeuse : le capteur confond le monoxyde de carbone avec l\'oxygène. Remettez l\'oxygène pur.';
    if (F.stridor && F.intub === null) return 'Bruit aigu à l\'inspiration : la gorge gonfle. Intuber maintenant est plus sûr que dans une heure, quand ce sera peut-être impossible.';
    if (F.ox === 'masque' && F.maskLeft.a < 240) return 'Le masque d\'Aminata sera vide dans quelques minutes : passez au masque à haute concentration branché sur l\'oxygène de la station.';
    if (F.sol === null) return 'Appelez le médecin de vol : il faut décider avec lui de la surveillance et d\'un éventuel retour.';
    if (F.cohb > 5) return `Le monoxyde de carbone quitte le sang lentement : avec l'oxygène pur, il en reste environ la moitié toutes les 80 minutes. Surveillance de la voix et de la conscience.`;
    return 'Le plus dur est passé. Surveillance pendant 24 heures : la gorge peut gonfler tard.';
  },
  afterSkip(S) {
    const F = S.flags;
    Sim.addLog(S.t, 'aura', `Point de surveillance : ${F.intub !== null ? 'intubée, ventilée' : F.edema > 0.8 ? 'gorge très gonflée, bruit fort à l\'inspiration' : F.stridor ? 'bruit aigu à l\'inspiration' : F.edema > 0.3 ? 'voix rauque' : 'voix presque normale'} ; ${F.conf > 16 ? 'toujours confuse' : 'mieux réveillée'}.`);
  },
  check(S) {
    const F = S.flags;
    if (F.deadT > 90) return { outcome: 'echec', title: F.cohb > 60 ? 'Intoxication mortelle' : 'La gorge s\'est fermée', text: F.cohb > 60 ? 'Le monoxyde de carbone a atteint un niveau mortel.' : 'Le gonflement de la gorge a bloqué la respiration avant l\'intubation.' };
    if (F.youCohb > 25) return { outcome: 'echec', title: 'Vous êtes intoxiquée à votre tour', text: 'Sans masque dans la fumée, vous avez respiré assez de monoxyde de carbone pour ne plus pouvoir soigner personne.' };
    if (S.t > 4 * 3600 && F.cohb < 5 && (F.intub !== null || F.edema > 0.8 - 1) && !F.source) {
      const safe = F.intub !== null || F.edema < 0.8;
      if (safe) return { outcome: 'succes', title: 'Aminata est hors de danger immédiat', text: 'Quatre heures après l\'incendie, le monoxyde de carbone a quitté son sang et sa respiration est protégée. La surveillance continue pendant 24 heures, et le sol décide d\'un éventuel retour.' };
    }
    return null;
  },
  debrief(S) {
    const F = S.flags, cr = [];
    cr.push({ ok: F.firstYouMask !== undefined && F.firstYouMask <= 30 ? true : F.firstYouMask !== undefined ? 'mid' : false, text: F.firstYouMask !== undefined ? `Votre masque à ${fmtClock(F.firstYouMask)}. Le sauveteur se protège d'abord.` : 'Vous n\'avez pas mis de masque.' });
    cr.push({ ok: F.o2 !== null && F.o2 <= 120 ? true : F.o2 !== null ? 'mid' : false, text: F.o2 !== null ? `Oxygène pur pour Aminata à ${fmtClock(F.o2)}.` : 'Aminata n\'a pas reçu d\'oxygène pur.' });
    cr.push({ ok: !F.source && (F.cutT || F.extT) <= 120 ? true : !F.source ? 'mid' : false, text: !F.source ? `Source arrêtée à ${fmtClock(F.cutT || F.extT)}.` : 'La carte a continué à chauffer.' });
    cr.push({ ok: F.o2Stopped === null || F.cohb < 5, text: F.o2Stopped !== null ? `Oxygène arrêté à ${fmtClock(F.o2Stopped)} parce que la saturation affichait 98 % : elle était fausse, le monoxyde de carbone était encore là.` : 'Oxygène gardé malgré une saturation rassurante, qui était fausse.' });
    const needIntub = F.worstEdema > 0.55;
    cr.push({ ok: needIntub ? (F.intub !== null && F.intubEdema < 0.8 ? true : F.intub !== null ? 'mid' : false) : true, text: needIntub ? (F.intub !== null ? `Intubation à ${fmtClock(F.intub)}${F.intubEdema >= 0.8 ? ', tardive, sur une gorge déjà très gonflée' : ', avant que la gorge ne se ferme'}.` : 'Le bruit à l\'inspiration est apparu sans intubation.') : 'La gorge n\'a pas gonflé au point d\'imposer une intubation pendant la simulation.' });
    cr.push({ ok: F.sol !== null && F.env !== null ? true : (F.sol !== null || F.env !== null ? 'mid' : false), text: 'Médecin de vol et équipe environnement prévenus.' });
    cr.push({ ok: F.masksOff === null || F.measures.length > 0, text: F.masksOff !== null ? 'Masques retirés après une mesure de l\'air sous les seuils.' : 'Masques gardés.' });
    cr.push({ ok: F.crewChecked !== null ? true : 'mid', text: F.crewChecked !== null ? 'Le reste de l\'équipage a été examiné.' : 'Lucas et Rafael n\'ont pas été examinés.' });
    const good = cr.filter(c => c.ok === true).length;
    const verdict = S.ended.outcome === 'echec' ? 'À reprendre' : good >= 7 ? 'Bien mené' : good >= 5 ? 'Correct' : 'À reprendre';
    return {
      verdict, criteria: cr,
      learn: [
        'Le capteur de saturation au doigt ne distingue pas l\'oxygène du monoxyde de carbone : 98 % peut cacher une intoxication. On traite selon l\'exposition et les signes.',
        'Le monoxyde de carbone quitte le sang lentement : quelques heures à l\'air ambiant, 40 à 80 minutes de demi-vie sous oxygène. Il n\'y a pas de caisson hyperbare à bord.',
        'Une voix rauque et de la suie dans la bouche annoncent un gonflement de la gorge qui peut s\'aggraver pendant des heures. Au premier bruit à l\'inspiration, on intube tant que c\'est encore possible.',
        'Seuils d\'une heure de la NASA pour l\'air de la cabine : monoxyde de carbone 425 ppm, cyanure d\'hydrogène 8 ppm, chlorure d\'hydrogène 5 ppm.'
      ],
      sources: [SRC.coTox, SRC.smac, SRC.issKit]
    };
  }
};
