/* ================= Simulation 1 : allergie grave (anaphylaxie) ================= */
const SRC = {
  rcukAna: { title: 'Resuscitation Council UK (2021). Emergency treatment of anaphylaxis', url: 'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis/emergency-treatment' },
  rcukAls: { title: 'Resuscitation Council UK (2021). Adult advanced life support guidelines', url: 'https://www.resus.org.uk/library/2021-resuscitation-guidelines/adult-advanced-life-support-guidelines' },
  hink: { title: 'Hinkelbein J. et al. (2020). Cardiopulmonary resuscitation (CPR) during spaceflight: a guideline for CPR in microgravity (DGLRM, ESAM-SMG). Scand J Trauma Resusc Emerg Med 28:108', url: 'https://doi.org/10.1186/s13049-020-00793-y' },
  coTox: { title: 'StatPearls. Carbon Monoxide Toxicity (NCBI Bookshelf NBK430740, mis à jour en 2025)', url: 'https://www.ncbi.nlm.nih.gov/books/NBK430740/' },
  smac: { title: 'NASA JSC 20584 Rev. A (2020). Spacecraft Maximum Allowable Concentrations for Airborne Contaminants', url: 'https://www.nasa.gov/wp-content/uploads/2015/03/jsc_20584_signed.pdf' },
  jones: { title: 'Jones J.A. et al. (2009). Diagnostic ultrasound at Mach 20: retroperitoneal and pelvic imaging in space. Ultrasound Med Biol 35(7):1059-1067', url: 'https://doi.org/10.1016/j.ultrasmedbio.2009.01.002' },
  issKit: { title: 'Liste publiée des médicaments de l\'ISS (données de 2023), reprise dans les fiches AURA', url: '' }
};

SIMS.anaphylaxie = {
  id: 'anaphylaxie', title: 'Allergie grave', fiche: 'F-INF-08',
  patient: { name: 'Rafael Ortiz', role: 'spécialiste scientifique', look: { skin: 0xa8754f, shirt: 0x2c3e6a, pants: 0x56544b, hair: 0x241912 } },
  context: 'Jour 87 de la mission. Il y a dix minutes, Rafael Ortiz a pris son premier comprimé d\'amoxicilline, prescrit pour une infection dentaire. Il vous appelle depuis le laboratoire : il a chaud, tout le corps le démange et il a du mal à avaler. Keiko Tanaka, la médecin de bord, se prépare à une sortie dans le sas et ne peut pas vous rejoindre avant une vingtaine de minutes.',
  facts: [['Votre rôle', 'Aminata Sarr, commandante et suppléante médicale (environ 40 heures de formation)'], ['Avec vous', 'Lucas Moreau, ingénieur de vol'], ['Fiche AURA', 'F-INF-08 · Réaction allergique grave'], ['Durée', '15 à 30 minutes, temps réel']],
  note: 'Les doses affichées sont celles des recommandations britanniques de 2021 pour un adulte sur Terre ; à bord, elles viendront des procédures médicales de la NASA. Les stocks de la simulation sont fictifs. Personnages fictifs.',
  firstLog: 'Alerte : Rafael signale démangeaisons, chaleur et gêne pour avaler, dix minutes après une prise d\'amoxicilline.',
  crew: [{ id: 'lucas', name: 'Lucas Moreau', short: 'Lucas', skill: 'crew' }, { id: 'vous', name: 'Aminata Sarr', short: 'Vous', skill: 'cmo', you: true }],
  cats: ['evaluer', 'medic', 'air', 'circ', 'surveiller', 'equipe'],
  stock: { autoinj: 2, adrIM: 4, diph: 2, cortico: 2, salbu: 1, fluid: 3 },
  init(S) {
    Object.assign(S.flags, { sev: 0.30, doses: [], fluids: [], ivTrap: [], lowT: 0, stableT: 0, minSbp: 200, firstAdr: null, sevAt5: null });
    S.v.temp = 37.1;
  },
  adrE(S) {
    const F = S.flags; let E = 0;
    for (const [t0, d] of F.doses) { const tau = S.t - t0; if (tau > 0) E += d * (Math.exp(-tau / 900) - Math.exp(-tau / 120)) / 0.635; }
    let Eiv = 0;
    for (const t0 of F.ivTrap) { const tau = S.t - t0; if (tau > 0) Eiv += 2.4 * Math.exp(-tau / 160); }
    return [E, Eiv];
  },
  physio(S, dt) {
    const F = S.flags, v = S.v;
    const [E, Eiv] = this.adrE(S);
    const drive = Math.exp(-S.t / 1500);
    F.sev = clamp(F.sev + dt * (0.0011 * (1.15 - F.sev) * (1 + F.sev) * drive - 0.0042 * (E + Eiv) * F.sev), 0, 1.15);
    const salbu = F.salbuT !== undefined && S.t - F.salbuT < 1500 ? smoothstep(0, 240, S.t - F.salbuT) : 0;
    const a = clamp((F.sev - 0.25) * 1.35, 0, 1.2);
    const b = clamp((F.sev - 0.2) * 1.25, 0, 1.2) * (1 - 0.45 * salbu);
    const c = clamp((F.sev - 0.32) * 1.45, 0, 1.3);
    let fb = 0;
    for (const f of F.fluids) {
      const tau = S.t - f;
      if (tau > 0) { const vol = Math.min(500, tau * 50 / 60); fb += 14 * vol / 500 * Math.exp(-Math.max(0, tau - 600) / 1500); }
    }
    v.hr = clamp(86 + 52 * c + 22 * F.sev + 20 * E + 70 * Math.min(Eiv, 1.5), 50, 210);
    v.sbp = clamp(126 - 78 * c + 18 * E + fb + 60 * Math.min(Eiv, 1.5), 30, 240);
    v.dbp = clamp(78 - 42 * c + 8 * E + fb * 0.5 + 30 * Math.min(Eiv, 1.5), 15, 140);
    v.rhythm = Eiv > 1.3 ? 'tv' : 'sinus';
    let sp = 98 - 15 * b - 10 * Math.max(0, a - 0.5);
    if (F.o2) sp += Math.min(4 + 7 * b, 99 - sp);
    v.spo2 = clamp(sp, 55, 99.5);
    v.rr = 16 + 12 * b + 6 * a;
    v.effort = 0.6 + b * 0.6;
    v.perf = clamp((v.sbp - 45) / 70, 0, 1);
    F.minSbp = Math.min(F.minSbp, v.sbp);
    F.a = a; F.b = b; F.c = c; F.E = E;
    if (F.firstAdr !== null && F.sevAt5 === null && S.t >= F.firstAdr + 300) F.sevAt5 = F.sev;
    F.lowT = (v.sbp < 48 || v.spo2 < 68) ? F.lowT + dt : 0;
    F.stableT = (F.sev < 0.2 && F.firstAdr !== null) ? F.stableT + dt : 0;
    const antiH = F.diphT !== undefined ? smoothstep(0, 900, S.t - F.diphT) : 0;
    S.look = { flush: clamp(F.sev * 1.4, 0, 1) * (1 - 0.6 * antiH), swell: clamp(a * 1.2, 0, 1), cyan: clamp((92 - v.spo2) / 20, 0, 1), pale: clamp(c - 0.4, 0, 1),
      eyesClosed: v.sbp < 58, mask: !!F.o2, iv: !!F.iv };
    if (F.keikoDue && S.t >= F.keikoDue) {
      F.keikoDue = null;
      S.crew.push({ id: 'keiko', name: 'Keiko Tanaka', short: 'Keiko', skill: 'medecin', busy: null });
      Sim.addLog(S.t, 'crew', 'Keiko Tanaka sort du sas et vous rejoint. Elle vous laisse mener, et prend les gestes que vous lui confiez.');
    }
  },
  observe(S) {
    const F = S.flags, v = S.v, o = [];
    if (v.sbp < 58) o.push('Rafael ne répond plus que par des grognements.');
    else if (v.sbp < 75) o.push('Rafael est confus, pâle, couvert de sueur.');
    if (F.a > 0.75) o.push('Bruit aigu à chaque inspiration, voix presque éteinte.');
    else if (F.a > 0.35) o.push('Voix rauque, lèvres et langue gonflées.');
    else if (F.a > 0.1) o.push('Il dit avoir la gorge serrée.');
    if (F.b > 0.6) o.push('Il respire vite et siffle en expirant.');
    else if (F.b > 0.25) o.push('Sifflements légers à l\'expiration.');
    if (S.look.flush > 0.45) o.push('Plaques rouges en relief sur le cou, le torse et les bras.');
    else if (S.look.flush > 0.15) o.push('Quelques plaques rouges qui pâlissent.');
    if (!o.length) o.push('Rafael respire calmement et parle normalement. Il est fatigué.');
    if (!F.restrained) o.push('Il flotte en se tenant à une main courante.');
    return o.join(' ');
  },
  actions: [
    { id: 'abcde', cat: 'evaluer', label: 'Examiner : gorge, respiration, circulation, conscience, peau', detail: '45 s', dur: 45, kind: 'find', slowUnrestrained: true,
      run(S) {
        const F = S.flags, v = S.v;
        const A = F.a > 0.75 ? 'bruit aigu à l\'inspiration, voix éteinte' : F.a > 0.35 ? 'voix rauque, langue et lèvres gonflées' : F.a > 0.1 ? 'gorge serrée, pas de bruit' : 'libres';
        const B = `${Math.round(v.rr)} respirations par minute${F.b > 0.25 ? ', sifflements' : ''}${v.spo2Probe ? ', saturation ' + Math.round(v.spo2) + ' %' : ''}`;
        const C = `pouls ${Math.round(v.hr)} par minute, ${v.sbp < 90 ? 'faible et filant, mains froides' : 'bien frappé'}`;
        const D = v.sbp < 58 ? 'répond à peine' : v.sbp < 75 ? 'confus' : 'conscient, inquiet';
        return `Voies aériennes : ${A}. Respiration : ${B}. Circulation : ${C}. Conscience : ${D}. Peau : ${S.look.flush > 0.3 ? 'plaques rouges en relief, démangeaisons' : 'quelques rougeurs'}.`;
      } },
    { id: 'histoire', cat: 'evaluer', label: 'Demander ce qui s\'est passé', detail: 'Médicament, heure, allergies connues · 30 s', dur: 30, who: 'vous', once: true, kind: 'find',
      run: () => 'Rafael : premier comprimé d\'amoxicilline il y a dix minutes, jamais d\'allergie connue. Rien mangé de nouveau.' },
    { id: 'reconnaitre', cat: 'evaluer', label: 'Nommer le problème : réaction allergique grave', detail: 'Décision, sans délai', dur: 0, once: true, kind: 'aura',
      run(S) { S.flags.recognized = S.t; return S.mode === 'exam' ? 'Vous annoncez une réaction allergique grave.' : 'AURA : début brutal après un nouveau médicament, gorge et respiration touchées, peau rouge : c\'est la réaction grave de la fiche F-INF-08.'; } },
    { id: 'autoinj', cat: 'medic', label: 'Adrénaline : stylo auto-injecteur 0,3 mg dans la cuisse', detail: 'Face externe de la cuisse, même à travers le pantalon · 20 s', dur: 20, stock: 'autoinj',
      run(S) { S.flags.doses.push([S.t, 0.6]); if (S.flags.firstAdr === null) S.flags.firstAdr = S.t; return 'stylo d\'adrénaline 0,3 mg injecté dans la cuisse.'; } },
    { id: 'adrIM', cat: 'medic', label: 'Adrénaline 0,5 mg en intramusculaire', detail: 'Ampoule 1 mg/mL, 0,5 mL, face externe de la cuisse · 60 s', dur: 60, stock: 'adrIM', slowUnrestrained: true,
      run(S) { S.flags.doses.push([S.t, 1.0]); if (S.flags.firstAdr === null) S.flags.firstAdr = S.t; return 'adrénaline 0,5 mg injectée dans la cuisse.'; } },
    { id: 'adrIV', cat: 'medic', label: 'Adrénaline 1 mg en injection directe dans la veine', detail: '20 s', dur: 20, req: S => S.flags.iv ? true : 'Il faut d\'abord une voie veineuse.',
      run(S) { S.flags.ivTrap.push(S.t); if (S.flags.firstAdr === null) S.flags.firstAdr = S.t; S.flags.ivError = S.t; setTimeout(() => Sim.S && Sim.addLog(Sim.S.t, 'find', 'Rafael : « Mon cœur cogne, j\'ai mal dans la poitrine. » Le moniteur s\'affole.'), 1500); return 'adrénaline 1 mg injectée directement dans la veine.'; } },
    { id: 'diph', cat: 'medic', label: 'Diphénhydramine injectable (antihistaminique)', detail: 'Pour les démangeaisons et les plaques · 40 s', dur: 40, stock: 'diph',
      run(S) { S.flags.diphT = S.t; if (S.flags.firstAdr === null) S.flags.antiBefore = true; return 'diphénhydramine injectée.'; } },
    { id: 'cortico', cat: 'medic', label: 'Corticoïde injectable (méthylprednisolone)', detail: '45 s', dur: 45, stock: 'cortico',
      run(S) { S.flags.corticoT = S.t; if (S.flags.firstAdr === null) S.flags.antiBefore = true; return 'corticoïde injecté. Son effet, s\'il y en a un, ne viendra pas avant des heures.'; } },
    { id: 'salbu', cat: 'medic', label: 'Salbutamol en spray, avec chambre d\'inhalation', detail: 'Pour les sifflements · 40 s', dur: 40, stock: 'salbu',
      run(S) { S.flags.salbuT = S.t; return 'salbutamol inhalé, 4 bouffées dans la chambre.'; } },
    { id: 'stopAmox', cat: 'medic', label: 'Arrêter l\'amoxicilline et garder la boîte', detail: 'Pour la suite et pour le dossier', dur: 0, once: true,
      run: S => { S.flags.stopAmox = true; return 'Vous mettez la boîte d\'amoxicilline de côté : plus aucune prise.'; } },
    { id: 'o2', cat: 'air', label: 'Oxygène au masque à haut débit', detail: '30 s', dur: 30, once: true,
      run(S) { S.flags.o2 = S.t; return 'masque à oxygène en place, haut débit.'; } },
    { id: 'attacher', cat: 'air', label: 'Attacher Rafael sur la table médicale (CMRS)', detail: 'Les gestes sont plus rapides une fois attaché · 60 s', dur: 60, once: true,
      run(S) { S.flags.restrained = true; if (Sim.exp) Sim.exp.setPose('table'); return 'Rafael est attaché sur la table médicale.'; } },
    { id: 'jambes', cat: 'air', label: 'Allonger Rafael et lui surélever les jambes', detail: 'Le geste de base sur Terre · 20 s', dur: 20, once: true, kind: 'aura',
      run(S) { S.flags.legs = true; return 'AURA : en apesanteur, il n\'y a pas de pesanteur qui retienne le sang dans les jambes : les surélever ne change rien. Ce qui compte ici, c\'est de l\'attacher pour pouvoir le soigner.'; } },
    { id: 'iv', cat: 'circ', label: 'Poser une voie veineuse', detail: '2 min, plus long s\'il n\'est pas attaché', dur: 120, once: true, slowUnrestrained: true,
      run(S) { S.flags.iv = S.t; return 'voie veineuse posée au pli du coude.'; } },
    { id: 'fluid', cat: 'circ', label: 'Perfuser 500 mL de sérum physiologique, poche sous pression', detail: 'En apesanteur, la poche ne coule pas seule · 30 s', dur: 30, stock: 'fluid', req: S => S.flags.iv ? true : 'Il faut d\'abord une voie veineuse.',
      run(S) { S.flags.fluids.push(S.t); return '500 mL de sérum en cours, poche dans le manchon de pression.'; } },
    { id: 'ecg', cat: 'surveiller', label: 'Poser les électrodes de l\'ECG', detail: '30 s', dur: 30, once: true, run(S) { S.v.leads = true; return 'électrodes posées.'; } },
    { id: 'spo2', cat: 'surveiller', label: 'Poser le capteur de saturation au doigt', detail: '10 s', dur: 10, once: true, run(S) { S.v.spo2Probe = true; return 'capteur au doigt posé.'; } },
    { id: 'cuff', cat: 'surveiller', label: 'Poser le brassard de tension (mesure toutes les 3 min)', detail: '25 s', dur: 25, once: true, run(S) { S.v.cuff = true; S.flags.nibpAuto = true; Sim.measureNIBP(); return 'brassard posé, première mesure en cours.'; } },
    { id: 'nibp', cat: 'surveiller', label: 'Mesurer la tension maintenant', dur: 0, req: S => S.v.cuff ? true : 'Le brassard n\'est pas posé.', run() { Sim.measureNIBP(); return false; } },
    { id: 'silence', cat: 'surveiller', label: 'Couper le son des alarmes 2 minutes', dur: 0, run(S) { S.silencedUntil = S.t + 120; return false; } },
    { id: 'attendre', cat: 'surveiller', label: 'Surveiller 15 minutes (le temps avance)', detail: 'Quand la situation est stable', dur: 0,
      req: S => S.flags.sev < 0.25 && S.flags.firstAdr !== null ? true : 'Pas tant que la réaction n\'est pas contrôlée.',
      run(S) { S.skip = 900; return 'Vous restez auprès de Rafael pour le surveiller.'; } },
    { id: 'sol', cat: 'equipe', label: 'Appeler le médecin de vol', detail: '30 s', dur: 30, kind: 'crew',
      run(S) {
        Sim.callGround(S2 => ({ text: `Médecin de vol : bien reçu, réaction allergique grave après amoxicilline. ${S2.flags.firstAdr !== null ? 'Vous avez donné l\'adrénaline : c\'est le bon geste.' : 'Donnez l\'adrénaline dans la cuisse tout de suite, c\'est la priorité.'} Si la respiration ou la tension ne s\'améliorent pas dans 5 minutes, refaites une dose. Oxygène, et perfusion de sérum si la tension baisse. L\'antihistaminique vient ensuite, pour la peau. Arrêtez l\'amoxicilline. On reste en ligne.` }));
        return 'appel au médecin de vol, situation résumée.';
      } },
    { id: 'keiko', cat: 'equipe', label: 'Demander à Keiko de quitter le sas au plus vite', detail: 'Elle arrivera dans 8 minutes environ', dur: 0, once: true,
      run(S) { S.flags.keikoDue = S.t + 480; return 'Keiko interrompt sa préparation et sort du sas.'; } },
    { id: 'dossier', cat: 'equipe', label: 'Noter l\'allergie à l\'amoxicilline dans le dossier médical', detail: '20 s', dur: 20, once: true, who: 'vous',
      run(S) { S.flags.dossier = true; return 'allergie à l\'amoxicilline notée, avec l\'heure et les signes.'; } }
  ],
  guide: [
    { text: 'Reconnaître la réaction grave : début brutal, gorge ou respiration ou tension touchées, peau rouge.', done: S => S.flags.recognized !== undefined || S.flags.firstAdr !== null },
    { text: 'Adrénaline dans la cuisse tout de suite, au stylo ou à la seringue.', done: S => S.flags.firstAdr !== null && !S.flags.ivError },
    { text: 'Appeler le sol dès les premiers gestes.', done: S => !!S.done.sol },
    { text: 'Oxygène à haut débit.', done: S => !!S.flags.o2 },
    { text: 'Surveiller : ECG, saturation, tension.', done: S => S.v.leads && S.v.spo2Probe && S.v.cuff },
    { text: 'Voie veineuse ; perfusion de sérum si la tension baisse.', done: S => !!S.flags.iv && (S.flags.fluids.length > 0 || S.flags.minSbp > 100) },
    { text: 'Après 5 minutes sans amélioration nette : nouvelle dose d\'adrénaline.', when: S => S.flags.firstAdr !== null, done: S => S.flags.doses.length >= 2 || (S.flags.sevAt5 !== null && S.flags.sevAt5 < 0.3) },
    { text: 'Ensuite seulement : antihistaminique pour la peau, salbutamol si sifflements.', when: S => S.flags.firstAdr !== null, done: S => S.flags.diphT !== undefined || S.flags.salbuT !== undefined },
    { text: 'Arrêter l\'amoxicilline, noter l\'allergie, surveiller plusieurs heures.', done: S => !!S.flags.stopAmox && !!S.flags.dossier }
  ],
  tip(S) {
    const F = S.flags, v = S.v;
    if (F.ivError && S.t - F.ivError < 240) return 'L\'adrénaline en injection directe dans la veine est réservée à l\'arrêt cardiaque : ici, elle provoque un emballement du cœur. La voie à utiliser est la cuisse.';
    if (F.antiBefore && F.firstAdr === null) return 'L\'antihistaminique et le corticoïde ne soignent ni la gorge ni la tension. Ils ne remplacent pas l\'adrénaline.';
    if (F.firstAdr === null) return S.t > 45 ? 'Gorge serrée, respiration qui siffle, peau rouge après un nouveau médicament : c\'est la réaction grave. L\'adrénaline dans la cuisse passe avant tout le reste, les deux stylos sont dans la trousse.' : 'Commencez par regarder Rafael : gorge, respiration, circulation, peau.';
    const since = S.t - F.doses[F.doses.length - 1][0];
    if (v.sbp < 90 && !F.fluids.length) return 'La tension baisse : perfusion rapide de sérum, 500 mL à 1 litre, dans une poche sous pression.';
    if (since < 300 && F.sev > 0.3) return `L'adrénaline agit en quelques minutes. Pendant ce temps : oxygène, moniteur, voie veineuse. Prochaine dose possible dans ${fmtDur(300 - since)} si rien ne s'améliore.`;
    if (since >= 300 && F.sev > 0.3) return 'Cinq minutes depuis la dernière dose et la réaction tient toujours : la fiche prévoit une nouvelle dose d\'adrénaline.';
    if (F.sev < 0.22) return 'Réaction contrôlée. Elle peut revenir dans les heures qui suivent : surveillance continue, allergie notée, boîte gardée.';
    return 'Continuez la surveillance : saturation, tension, voix.';
  },
  check(S) {
    const F = S.flags;
    if (F.lowT > 60) return { outcome: 'echec', title: 'Arrêt cardiaque', text: 'La tension et l\'oxygène sont restés trop bas pendant plus d\'une minute : le cœur de Rafael s\'est arrêté. Dans une vraie urgence, on passerait au massage et au défibrillateur.' };
    if (F.stableT > 900) return { outcome: 'succes', title: 'Réaction contrôlée', text: 'Depuis quinze minutes, Rafael respire sans gêne et sa tension tient. La surveillance continue pendant plusieurs heures, avec le sol.' };
    return null;
  },
  debrief(S) {
    const F = S.flags, D = S.done;
    const t1 = F.firstAdr;
    const needed2 = F.sevAt5 !== null && F.sevAt5 >= 0.3;
    const cr = [];
    cr.push({ ok: t1 !== null && !F.ivError ? (t1 <= 300 ? true : t1 <= 600 ? 'mid' : false) : false, text: t1 !== null ? `Première dose d'adrénaline à ${fmtClock(t1)}${F.ivError ? ', mais par injection directe dans la veine, qui est une erreur grave' : ''}. Objectif : dès que la réaction grave est reconnue, dans les toutes premières minutes.` : 'Pas d\'adrénaline : c\'est le seul traitement qui soigne la gorge, la respiration et la tension.' });
    cr.push({ ok: needed2 ? F.doses.length >= 2 : true, text: needed2 ? (F.doses.length >= 2 ? 'Seconde dose donnée quand la première n\'a pas suffi.' : 'La première dose n\'a pas suffi et il n\'y a pas eu de seconde dose.') : 'Une seule dose a suffi, ou la réaction n\'a pas été réévaluée à 5 minutes.' });
    cr.push({ ok: !F.antiBefore, text: F.antiBefore ? 'Antihistaminique ou corticoïde donné avant l\'adrénaline : ils ne traitent pas la réaction grave et font perdre du temps.' : 'Pas d\'antihistaminique ni de corticoïde à la place de l\'adrénaline.' });
    const mon = S.v.leads && S.v.spo2Probe && S.v.cuff;
    cr.push({ ok: F.o2 && mon ? true : (F.o2 || mon ? 'mid' : false), text: `Oxygène ${F.o2 ? 'à ' + fmtClock(F.o2) : 'non donné'} ; surveillance ${mon ? 'complète (ECG, saturation, tension)' : 'incomplète'}.` });
    cr.push({ ok: F.minSbp < 90 ? F.fluids.length > 0 : true, text: F.minSbp < 90 ? (F.fluids.length ? 'Perfusion de sérum quand la tension a baissé.' : `La tension est descendue à ${Math.round(F.minSbp)} mmHg sans perfusion.`) : 'La tension n\'est pas descendue sous 90 mmHg.' });
    cr.push({ ok: D.sol !== undefined ? (D.sol <= 600 ? true : 'mid') : (S.comm === 'coupee' ? 'mid' : false), text: D.sol !== undefined ? `Sol appelé à ${fmtClock(D.sol)}.` : (S.comm === 'coupee' ? 'Liaison coupée : le sol ne pouvait pas répondre.' : 'Le sol n\'a pas été appelé.') });
    cr.push({ ok: F.stopAmox && F.dossier ? true : (F.stopAmox || F.dossier ? 'mid' : false), text: 'Amoxicilline arrêtée et allergie notée dans le dossier, pour qu\'elle ne soit plus jamais donnée.' });
    const good = cr.filter(c => c.ok === true).length;
    const verdict = S.ended.outcome === 'echec' ? 'À reprendre' : good >= 6 ? 'Bien mené' : good >= 4 ? 'Correct' : 'À reprendre';
    return {
      verdict, criteria: cr,
      learn: [
        'L\'adrénaline en intramusculaire, dans la cuisse, est le traitement de la réaction grave. On la refait après 5 minutes si la respiration ou la circulation ne s\'améliorent pas.',
        'Les antihistaminiques ne traitent que la peau, et les corticoïdes ne sont plus donnés en routine dans l\'urgence.',
        'Après deux doses d\'adrénaline, la surveillance dure au moins 6 heures, et au moins 12 heures si la réaction a été sévère ou a demandé davantage de doses.',
        'En apesanteur, surélever les jambes ne change rien. On attache la personne pour pouvoir la soigner, et la perfusion passe dans une poche sous pression.'
      ],
      sources: [SRC.rcukAna, SRC.issKit]
    };
  }
};
