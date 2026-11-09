/* ================= Simulation 4 : calcul rénal et échographie ================= */
SIMS.calcul = {
  id: 'calcul', title: 'Calcul rénal et échographie', fiche: 'F-DIG-12',
  patient: { name: 'Keiko Tanaka', role: 'médecin de bord', look: { skin: 0xe2b791, shirt: 0x394a68, pants: 0x4a4a46, hair: 0x14100e, longHair: true } },
  context: 'Jour 120. Keiko Tanaka, la médecin de bord, se réveille vers 3 heures avec une douleur très forte du flanc droit qui descend vers l\'aine. Elle a vomi une fois. Elle peut parler et donner son avis, mais elle a trop mal pour s\'examiner seule : c\'est vous qui menez.',
  facts: [['Votre rôle', 'Aminata Sarr, suppléante médicale'], ['Avec vous', 'Rafael Ortiz et Lucas Moreau'], ['Matériel', 'Échographe, bandelettes urinaires, trousse de bord'], ['Fiche AURA', 'F-DIG-12 · Calcul rénal'], ['Durée', '15 à 25 minutes ; la surveillance avance par paliers de 4 heures']],
  note: 'Sur l\'ISS, un membre d\'équipage non médecin a déjà réalisé une échographie des reins et de la vessie guidée en direct par des experts au sol, avec des images utilisables pour le diagnostic (Jones et coll., 2009). Ici, AURA joue ce rôle de guide. L\'anatomie est simplifiée ; les doses viendront des procédures de la NASA. Personnages fictifs.',
  firstLog: 'Alerte : Keiko signale une douleur très forte du flanc droit qui irradie vers l\'aine, avec un vomissement.',
  pauseDuringUS: true,
  crew: [{ id: 'rafael', name: 'Rafael Ortiz', short: 'Rafael', skill: 'crew' }, { id: 'lucas', name: 'Lucas Moreau', short: 'Lucas', skill: 'crew' }, { id: 'vous', name: 'Aminata Sarr', short: 'Vous', skill: 'cmo', you: true }],
  cats: ['evaluer', 'medic', 'gestes', 'surveiller', 'equipe'],
  stock: { ketorolac: 4, ibu: 10, ondan: 4, tamsu: 10, opio: 6, ceftri: 3 },
  init(S) {
    const r = S.rnd;
    Object.assign(S.flags, { variant: r() < 0.4 ? 'fievre' : 'simple', hydro: 0.65, nausea: 0.8, nsaid: null, nsaidOral: null, opioid: null, ondan: null, tamsu: null, water: null, filter: null,
      antibio: null, evac: null, feverOn: null, tempChecks: [], passed: null, collected: false, pain: 8, sepsisT: 0 });
    S.flags.feverAt = (11 + r() * 5) * 3600;
    S.flags.passBase = (38 + (r() - 0.5) * 10) * 3600;
    S.v.temp = 37.2;
  },
  effect(t0, t, onset, hold, decay, amp) {
    if (t0 === null) return 0;
    const tau = t - t0;
    if (tau < 0) return 0;
    return amp * smoothstep(0, onset, tau) * Math.exp(-Math.max(0, tau - hold) / decay);
  },
  physio(S, dt) {
    const F = S.flags, v = S.v, t = S.t, e = this.effect;
    const passAt = F.passBase - (F.tamsu !== null && F.tamsu < 6 * 3600 ? 12 * 3600 : 0) - (F.water !== null ? 3 * 3600 : 0);
    if (F.passed === null && t >= passAt && !(F.variant === 'fievre' && F.feverOn !== null)) {
      F.passed = t; F.hydro = 0.1;
      F.collected = F.filter !== null;
      Sim.addLog(t, 'find', F.collected ? 'Keiko a senti une brûlure en urinant, puis plus rien : un petit calcul d\'environ 5 mm est resté dans le filtre. La douleur a disparu.' : 'Keiko a senti une brûlure en urinant, puis la douleur a disparu. Le calcul est sans doute parti, mais personne ne l\'a récupéré : on ne pourra pas l\'analyser.');
    }
    const obstructed = F.passed === null;
    const base = obstructed ? 7.6 * (F.tamsu !== null && t - F.tamsu > 1800 ? 0.88 : 1) : 0.8;
    const waves = obstructed ? 1.3 * Math.sin(2 * Math.PI * t / 1300) + 0.6 * Math.sin(2 * Math.PI * t / 470) : 0;
    const nsaid = Math.max(e(F.nsaid, t, 1500, 3 * 3600, 3 * 3600, 4.3), e(F.nsaidOral, t, 2400, 3 * 3600, 3 * 3600, 3.6));
    const opio = e(F.opioid, t, 900, 2 * 3600, 2 * 3600, 3.8);
    F.pain = clamp(base + waves - nsaid - opio, 0, 10);
    const ond = e(F.ondan, t, 600, 5 * 3600, 3 * 3600, 1);
    F.nausea = clamp((obstructed ? 0.25 + 0.06 * F.pain : 0.05) * (1 - 0.85 * ond) * (F.opioid !== null && t - F.opioid < 4 * 3600 ? 1.2 : 1), 0, 1);
    // fièvre d'un rein bloqué et infecté
    if (F.variant === 'fievre' && obstructed && t >= F.feverAt) { if (F.feverOn === null) F.feverOn = t; }
    let fever = 0;
    if (F.feverOn !== null) {
      fever = 1.6 * smoothstep(0, 3600, t - F.feverOn) * (F.antibio !== null ? Math.exp(-Math.max(0, t - F.antibio - 3600) / 14400) * 0.8 + 0.2 : 1);
      if (F.antibio === null && t - F.feverOn > 3 * 3600) F.sepsisT += dt; else F.sepsisT = Math.max(0, F.sepsisT - dt);
    }
    const sep = clamp(F.sepsisT / 7200, 0, 1);
    v.temp = 37.0 + 0.15 + fever + 0.05 * Math.sin(t / 3000);
    v.hr = 76 + 3.0 * F.pain + 14 * fever + 30 * sep;
    v.sbp = 124 + 2.2 * F.pain - 55 * sep; v.dbp = 78 + 1.2 * F.pain - 30 * sep;
    v.rr = 14 + 0.6 * F.pain + 6 * sep; v.spo2 = 98.5 - sep * 4;
    v.perf = clamp((v.sbp - 45) / 70, 0, 1); v.effort = 0.6;
    S.look = { pale: clamp(F.pain / 12 + sep * 0.5, 0, 1), flush: fever > 0.8 ? 0.3 : 0, eyesClosed: sep > 0.7, probe: !$('#usPanel').hidden, iv: !!F.iv };
  },
  observe(S) {
    const F = S.flags, o = [];
    if (F.sepsisT > 3600) o.push('Keiko est grise, en sueur, confuse.');
    if (F.pain >= 7) o.push('Keiko se tord de douleur et ne trouve aucune position, par vagues.');
    else if (F.pain >= 4) o.push('Keiko a encore mal, par moments.');
    else if (F.pain >= 1.5) o.push('Keiko est soulagée, la douleur reste sourde.');
    else o.push('Keiko n\'a presque plus mal.');
    if (F.nausea > 0.5) o.push('Elle a la nausée.');
    if (F.feverOn !== null && S.t - F.feverOn > 1200) o.push('Elle frissonne.');
    return o.join(' ');
  },
  painLine(S) { return `Keiko : « J'ai mal à ${Math.round(S.flags.pain)} sur 10. »`; },
  actions: [
    { id: 'histoire', cat: 'evaluer', label: 'Faire raconter la douleur', detail: 'Début, trajet, signes associés · 40 s', dur: 40, who: 'vous', once: true, kind: 'find',
      run: () => 'Keiko : douleur brutale vers 3 heures dans le flanc droit, qui descend vers l\'aine, par vagues. Une fois vomi. Pas de brûlure en urinant, pas de fièvre ressentie. Jamais eu de calcul. Elle boit peu depuis une semaine, à cause d\'un planning chargé.' },
    { id: 'avis', cat: 'evaluer', label: 'Demander son avis à Keiko, médecin', detail: '15 s', dur: 15, who: 'vous', once: true, kind: 'crew',
      run: () => 'Keiko : « Je pense à un calcul. Fais une échographie des deux reins et de la vessie, donne-moi l\'anti-inflammatoire, et surveille ma température. »' },
    { id: 'examen', cat: 'evaluer', label: 'Examiner le ventre et les flancs', detail: '1 min', dur: 60, kind: 'find',
      run: S => `Ventre souple, sans défense. Douleur vive quand on tape doucement la fosse lombaire droite, rien à gauche. ${S.flags.pain > 6 ? 'Elle est agitée, ne tient pas en place.' : 'Elle est plus calme.'}` },
    { id: 'bandelette', cat: 'evaluer', label: 'Bandelette urinaire', detail: 'Recueil avec le kit d\'urine de la station · 90 s', dur: 90, kind: 'find',
      run: S => S.flags.feverOn !== null ? 'Bandelette : sang +++, leucocytes ++, nitrites positifs. Signes d\'infection des urines.' : 'Bandelette : sang +++, pas de leucocytes, pas de nitrites.' },
    { id: 'temp', cat: 'evaluer', label: 'Prendre la température', detail: '30 s', dur: 30, kind: 'find',
      run: S => { S.flags.tempChecks.push(S.t); if (S.flags.feverOn !== null && S.flags.feverSeen === undefined && S.v.temp > 38) S.flags.feverSeen = S.t; return `Température : ${nf1(S.v.temp)} °C.`; } },
    { id: 'douleur', cat: 'evaluer', label: 'Demander la douleur de 0 à 10', dur: 10, who: 'vous', kind: 'crew', run: S => SIMS.calcul.painLine(S).replace('Keiko : ', '') },
    { id: 'echo', cat: 'evaluer', label: 'Échographie des reins et de la vessie', detail: 'Vous tenez la sonde, AURA vous guide · la simulation s\'arrête pendant l\'examen', dur: 0, kind: 'aura',
      run(S) {
        US.open(() => {
          if (!Sim.S) return;
          S.flags.usDone = (S.flags.usDone || 0) + 1;
          S.skip = 480;
          Sim.addLog(S.t, 'aura', `Échographie terminée (${S.flags.usShots || 0} image${(S.flags.usShots || 0) > 1 ? 's' : ''} enregistrée${(S.flags.usShots || 0) > 1 ? 's' : ''}). L'examen a pris environ 8 minutes.`);
        });
        return 'Vous installez l\'échographe à côté de Keiko.';
      } },
    { id: 'ketorolac', cat: 'medic', label: 'Kétorolac en injection intramusculaire', detail: 'Anti-inflammatoire, premier choix · 60 s', dur: 60, stock: 'ketorolac',
      run: S => { S.flags.nsaid = S.t; return 'kétorolac injecté dans la cuisse.'; } },
    { id: 'ibu', cat: 'medic', label: 'Ibuprofène par la bouche', detail: '20 s', dur: 20, stock: 'ibu', req: S => S.flags.nausea > 0.45 ? 'Elle a des nausées : un comprimé risque d\'être vomi.' : true,
      run: S => { S.flags.nsaidOral = S.t; return 'ibuprofène pris avec de l\'eau.'; } },
    { id: 'ondan', cat: 'medic', label: 'Ondansétron contre les nausées', detail: '30 s', dur: 30, stock: 'ondan', run: S => { S.flags.ondan = S.t; return 'ondansétron donné.'; } },
    { id: 'tamsu', cat: 'medic', label: 'Tamsulosine par la bouche', detail: 'Aide le calcul à descendre dans l\'uretère · 20 s', dur: 20, stock: 'tamsu', once: true,
      req: S => S.flags.nausea > 0.5 ? 'Traitez d\'abord la nausée.' : true, run: S => { S.flags.tamsu = S.t; return 'tamsulosine prise, à poursuivre chaque jour.'; } },
    { id: 'opio', cat: 'medic', label: 'Hydrocodone avec paracétamol', detail: 'Si la douleur persiste malgré l\'anti-inflammatoire · 20 s', dur: 20, stock: 'opio',
      req: S => S.flags.nausea > 0.5 ? 'Traitez d\'abord la nausée.' : true,
      run: S => { if (S.flags.nsaid === null && S.flags.nsaidOral === null) S.flags.opioFirst = true; S.flags.opioid = S.t; return 'hydrocodone avec paracétamol pris.'; } },
    { id: 'antibio', cat: 'medic', label: 'Ceftriaxone en injection (antibiotique)', detail: 'En cas d\'infection · 60 s', dur: 60, stock: 'ceftri', once: true,
      run: S => { S.flags.antibio = S.t; if (S.flags.feverOn === null) S.flags.antibioNoFever = true; return 'ceftriaxone injectée.'; } },
    { id: 'boire', cat: 'gestes', label: 'Faire boire régulièrement : 2 à 3 litres par jour', detail: 'Poches d\'eau de la station · 20 s', dur: 20, once: true, run: S => { S.flags.water = S.t; return 'plan d\'hydratation lancé, une poche toutes les deux heures.'; } },
    { id: 'filtrer', cat: 'gestes', label: 'Filtrer toutes les urines pour récupérer le calcul', detail: '20 s', dur: 20, once: true, run: S => { S.flags.filter = S.t; return 'filtre installé sur le recueil d\'urine.'; } },
    { id: 'iv', cat: 'gestes', label: 'Poser une voie veineuse', detail: '2 min', dur: 120, once: true, run: S => { S.flags.iv = S.t; return 'voie veineuse posée.'; } },
    { id: 'ecg', cat: 'surveiller', label: 'Poser les électrodes de l\'ECG', detail: '30 s', dur: 30, once: true, run(S) { S.v.leads = true; return 'électrodes posées.'; } },
    { id: 'spo2', cat: 'surveiller', label: 'Capteur de saturation au doigt', detail: '10 s', dur: 10, once: true, run(S) { S.v.spo2Probe = true; return 'capteur posé.'; } },
    { id: 'cuff', cat: 'surveiller', label: 'Brassard de tension (toutes les 3 min)', detail: '25 s', dur: 25, once: true, run(S) { S.v.cuff = true; S.flags.nibpAuto = true; Sim.measureNIBP(); return 'brassard posé.'; } },
    { id: 'att4', cat: 'surveiller', label: 'Surveiller 4 heures (le temps avance)', detail: 'La fiche demande douleur et température toutes les 4 heures', dur: 0,
      req: S => (S.flags.nsaid !== null || S.flags.nsaidOral !== null || S.flags.opioid !== null) ? true : 'Traitez d\'abord la douleur.',
      run(S) { S.flags.lastSkipFrom = S.t; S.skip = 4 * 3600; return 'Surveillance de 4 heures.'; } },
    { id: 'sol', cat: 'equipe', label: 'Appeler le médecin de vol', detail: 'Avec les images enregistrées, s\'il y en a · 30 s', dur: 30,
      run(S) {
        S.flags.sol = S.flags.sol ?? S.t;
        const imgs = !!(S.flags.us_rein_d || S.flags.us_vessie);
        Sim.callGround(S2 => ({ text: `Médecin de vol : ${imgs ? 'images reçues : cavités du rein droit modérément dilatées, et un calcul d\'environ 5 mm à l\'entrée de l\'uretère droit dans la vessie. ' : 'sans images, on part sur un calcul probable ; une échographie nous aiderait beaucoup. '}Anti-inflammatoire, tamsulosine, eau, filtre sur les urines. Douleur et température toutes les 4 heures. ${S2.flags.feverOn !== null ? 'Avec de la fièvre, c\'est une urgence : antibiotique tout de suite, et on prépare le retour.' : 'Au moindre signe de fièvre, rappelez-nous immédiatement.'}` }));
        return 'appel au médecin de vol.';
      } },
    { id: 'retour', cat: 'equipe', label: 'Demander un retour sur Terre en urgence', detail: 'Décision avec le sol', dur: 0, once: true,
      run: S => { S.flags.evac = S.t; return S.flags.feverOn !== null ? 'Demande de retour envoyée : rein bloqué et infecté, impossible à déboucher à bord.' : 'Demande de retour envoyée.'; } }
  ],
  guide: [
    { text: 'Faire raconter la douleur et examiner les flancs.', done: S => !!S.done.histoire && !!S.done.examen },
    { text: 'Calmer la douleur : anti-inflammatoire en premier (kétorolac).', done: S => S.flags.nsaid !== null || S.flags.nsaidOral !== null },
    { text: 'Traiter la nausée si elle vomit.', done: S => S.flags.ondan !== null || S.flags.nausea < 0.3 },
    { text: 'Bandelette urinaire et température.', done: S => !!S.done.bandelette && S.flags.tempChecks.length > 0 },
    { text: 'Échographie : rein droit, rein gauche pour comparer, vessie.', done: S => !!S.flags.us_rein_d && !!S.flags.us_rein_g },
    { text: 'Tamsulosine, eau en abondance, filtre sur les urines.', done: S => S.flags.tamsu !== null && S.flags.water !== null && S.flags.filter !== null },
    { text: 'Appeler le sol, avec les images.', done: S => S.flags.sol !== undefined && S.flags.sol !== null },
    { text: 'Douleur et température toutes les 4 heures. Fièvre : antibiotique et appel immédiat.', done: S => S.flags.tempChecks.length >= 3 }
  ],
  tip(S) {
    const F = S.flags;
    if (F.feverSeen !== undefined && F.antibio === null) return 'Fièvre avec un rein bloqué : c\'est l\'alarme de la fiche. Antibiotique tout de suite, appel du sol, et discussion d\'un retour, car on ne peut pas déboucher le rein à bord.';
    if (F.nsaid === null && F.nsaidOral === null) return 'D\'abord la douleur : l\'anti-inflammatoire en injection est le premier choix et agit en 20 à 30 minutes.';
    if (F.nausea > 0.5 && F.ondan === null) return 'Elle vomit : ondansétron, puis les comprimés pourront passer.';
    if (!F.us_rein_d) return 'L\'échographie confirme le blocage : on cherche des cavités du rein dilatées par l\'urine. Commencez par le rein droit, sur le flanc.';
    if (!F.us_rein_g) return 'Regardez aussi le rein gauche : la comparaison aide à juger la dilatation.';
    if (F.tamsu === null) return 'La tamsulosine aide un calcul de l\'uretère à descendre jusqu\'à la vessie.';
    if (F.filter === null) return 'Filtrer les urines permet de récupérer le calcul et de l\'analyser au retour.';
    const last = F.tempChecks.length ? F.tempChecks[F.tempChecks.length - 1] : -1e9;
    if (S.t - last > 4 * 3600) return 'Plus de 4 heures sans prendre la température : la fièvre est le signe qui change tout.';
    if (F.pain > 5 && (F.nsaid !== null || F.nsaidOral !== null) && F.opioid === null && S.t - (F.nsaid ?? F.nsaidOral) > 2400) return 'La douleur persiste malgré l\'anti-inflammatoire : la fiche prévoit l\'hydrocodone avec paracétamol.';
    return 'Surveillance : douleur et température toutes les 4 heures, eau, filtre.';
  },
  afterSkip(S) {
    const F = S.flags;
    Sim.addLog(S.t, 'aura', `Point à ${fmtDur(S.t)} : ${SIMS.calcul.painLine(S)}${F.passed !== null ? ' Le calcul est passé.' : ''} Pensez à la température.`);
  },
  check(S) {
    const F = S.flags;
    if (F.sepsisT > 5 * 3600) return { outcome: 'echec', title: 'Infection grave non traitée', text: 'La fièvre d\'un rein bloqué n\'a pas été traitée : l\'infection s\'est étendue au sang et la tension s\'effondre.' };
    if (F.feverOn !== null && F.antibio !== null && F.evac !== null) return { outcome: 'succes', title: 'Infection traitée, retour décidé', text: 'Le rein bloqué s\'est infecté. L\'antibiotique est donné et le retour sur Terre est en préparation avec le sol : on ne peut pas déboucher un rein à bord.' };
    if (F.passed !== null && S.t - F.passed > 2 * 3600) return { outcome: 'succes', title: 'Le calcul est passé', text: F.collected ? 'Le calcul est sorti et a été récupéré pour analyse. Keiko reprendra le travail après contrôle échographique et avis du sol.' : 'Le calcul est sorti, sans être récupéré. Keiko reprendra le travail après contrôle échographique et avis du sol.' };
    if (S.t > 72 * 3600) return { outcome: 'arret', title: 'Fin de la simulation', text: 'Trois jours ont passé.' };
    return null;
  },
  debrief(S) {
    const F = S.flags, cr = [];
    const n1 = F.nsaid ?? F.nsaidOral;
    cr.push({ ok: S.done.histoire !== undefined && S.done.examen !== undefined && S.done.bandelette !== undefined, text: 'Histoire de la douleur, examen des flancs et bandelette urinaire.' });
    cr.push({ ok: n1 !== null && n1 !== undefined ? (n1 <= 1800 ? true : 'mid') : false, text: n1 !== null && n1 !== undefined ? `Anti-inflammatoire à ${fmtClock(n1)}${F.opioFirst ? ', après un opioïde donné en premier' : ''}.` : 'Pas d\'anti-inflammatoire.' });
    cr.push({ ok: F.us_rein_d ? (F.us_rein_g ? true : 'mid') : false, text: F.us_rein_d ? `Échographie : rein droit${F.us_rein_g ? ', rein gauche' : ''}${F.us_vessie ? ', vessie avec le calcul' : ''}.` : 'Pas d\'image utilisable du rein droit.' });
    const quizOk = [F.quiz_qd, F.quiz_qg, F.quiz_qv].filter(x => x !== undefined);
    cr.push({ ok: quizOk.length ? (quizOk.every(Boolean) ? true : 'mid') : 'mid', text: quizOk.length ? `Lecture des images : ${quizOk.filter(Boolean).length} réponse(s) juste(s) sur ${quizOk.length}.` : 'Images non interprétées.' });
    cr.push({ ok: F.tamsu !== null && F.water !== null && F.filter !== null ? true : (F.tamsu !== null || F.water !== null || F.filter !== null ? 'mid' : false), text: 'Tamsulosine, eau en abondance et filtre sur les urines.' });
    const expected = Math.max(1, Math.floor(S.t / (4 * 3600)));
    cr.push({ ok: F.tempChecks.length >= expected ? true : F.tempChecks.length ? 'mid' : false, text: `${F.tempChecks.length} prise(s) de température pour ${fmtDur(S.t)} de surveillance (la fiche en demande une toutes les 4 heures).` });
    cr.push({ ok: F.sol !== undefined && F.sol !== null ? true : (S.comm === 'coupee' ? 'mid' : false), text: F.sol ? `Sol appelé à ${fmtClock(F.sol)}${F.us_rein_d ? ', images à l\'appui' : ''}.` : 'Le sol n\'a pas été appelé.' });
    if (F.variant === 'fievre') cr.push({ ok: F.antibio !== null && F.evac !== null ? true : (F.antibio !== null ? 'mid' : false), text: F.feverOn !== null ? `Fièvre apparue vers ${fmtDur(F.feverOn)} : ${F.feverSeen !== undefined ? 'vue à ' + fmtDur(F.feverSeen) : 'jamais mesurée'}, antibiotique ${F.antibio !== null ? 'à ' + fmtDur(F.antibio) : 'non donné'}, retour ${F.evac !== null ? 'demandé' : 'non demandé'}.` : 'Variante avec fièvre.' });
    if (F.antibioNoFever) cr.push({ ok: 'mid', text: 'Antibiotique donné sans fièvre ni signe d\'infection : il n\'était pas indiqué.' });
    const good = cr.filter(c => c.ok === true).length;
    const verdict = S.ended.outcome === 'echec' ? 'À reprendre' : good >= cr.length - 1 ? 'Bien mené' : good >= cr.length - 3 ? 'Correct' : 'À reprendre';
    return {
      verdict, criteria: cr,
      learn: [
        'Le calcul rénal fait partie des risques connus des longs séjours : la perte osseuse augmente le calcium dans les urines, et on boit souvent trop peu.',
        'L\'anti-inflammatoire est le premier traitement de la douleur ; la tamsulosine aide un calcul de l\'uretère à descendre ; l\'hydrocodone avec paracétamol vient si la douleur persiste.',
        'La fièvre avec un rein bloqué est une urgence : antibiotique, et décision de retour avec le sol, car on ne peut pas déboucher le rein à bord.',
        'Sur l\'ISS, une échographie des reins et de la vessie faite par un non-médecin guidé depuis le sol a donné des images utilisables pour le diagnostic.'
      ],
      sources: [SRC.jones, SRC.issKit]
    };
  }
};
