/* ================= Simulation 2 : arrêt cardiaque en apesanteur ================= */
const CPR_METHODS = {
  er: { label: 'Evetts-Russomano', depth: 0.86, fatigueT: 100, setup: 8, needFree: true },
  rbh: { label: 'étreinte inversée', depth: 0.62, fatigueT: 80, setup: 6, needFree: true },
  hs: { label: 'appui renversé sur la table', depth: 0.95, fatigueT: 150, setup: 6, needCmrs: true },
  str: { label: 'à califourchon sur la table', depth: 0.84, fatigueT: 120, setup: 8, needCmrs: true }
};
const CprTap = { times: [], rate: 0, last: -10 };
function cprTapNow() {
  const now = performance.now() / 1000;
  CprTap.times.push(now);
  if (CprTap.times.length > 8) CprTap.times.shift();
  CprTap.last = now;
  if (CprTap.times.length >= 3) {
    const iv = [];
    for (let i = 1; i < CprTap.times.length; i++) iv.push(CprTap.times[i] - CprTap.times[i - 1]);
    CprTap.rate = 60 / (iv.reduce((a, b) => a + b, 0) / iv.length);
  }
  Sound.beep(320, 0.04, 0.05, 'triangle');
}

SIMS.arret = {
  id: 'arret', title: 'Arrêt cardiaque en apesanteur', fiche: 'F-CVN-07',
  patient: { name: 'Lucas Moreau', role: 'ingénieur de vol', look: { skin: 0xe2bea0, shirt: 0x3a3f46, pants: 0x2f3136, hair: 0x5a4632 } },
  context: 'Jour 143. Lucas Moreau court sur le tapis de course, tenu par son harnais. Rafael Ortiz, qui travaille à côté, le voit s\'affaisser dans les sangles et vous appelle : Lucas ne répond plus. Vous arrivez trente secondes après le malaise.',
  facts: [['Votre rôle', 'Keiko Tanaka, médecin de bord : vous dirigez la réanimation'], ['Avec vous', 'Rafael Ortiz, tout de suite ; Aminata Sarr, dès que l\'alarme sonne'], ['Fiche AURA', 'F-CVN-07 · Arrêt cardiaque'], ['Durée', '15 à 25 minutes, temps réel']],
  note: 'Les méthodes de massage suivent la recommandation de 2020 pour la réanimation en apesanteur (Hinkelbein et coll.). Les doses sont celles des recommandations européennes et britanniques de 2021 pour un adulte. La qualité de chaque méthode et les chances de réussite des chocs sont des choix AURA simplifiés. Personnages fictifs.',
  firstLog: 'Alerte : Lucas ne répond plus, affaissé dans le harnais du tapis de course.',
  startPose: 'neutre',
  crew: [{ id: 'rafael', name: 'Rafael Ortiz', short: 'Rafael', skill: 'crew' }, { id: 'vous', name: 'Keiko Tanaka', short: 'Vous', skill: 'medecin', you: true }],
  cats: ['evaluer', 'gestes', 'circ', 'medic', 'air', 'equipe'],
  stock: { adre: 10, lido: 2 },
  init(S) {
    Object.assign(S.flags, { V: 0.92, rhythm: 'fv', cpr: null, cprTime: 0, firstCpr: null, shocks: 0, shockTimes: [], pauses: [], adre: [], lido: null, access: null,
      airway: null, rosc: null, roscSeen: null, aedHere: false, pads: false, analysis: null, charged: false, free: false, cmrs: false, pauseUntil: -1,
      pauseStart: null, aminataDue: 150, methods: [], relays: 0, lastVent: 0, postO2: false, ecg12: false, evac: false, alarm: null });
    S.v.temp = 36.9; S.v.rhythm = 'fv'; S.v.perf = 0; S.v.rr = 0; S.v.spo2 = 70;
    CprTap.times = []; CprTap.rate = 0; CprTap.last = -10;
  },
  q(S) {
    const F = S.flags, c = F.cpr;
    if (!c || S.t < F.pauseUntil || S.t < c.readyAt) return 0;
    const m = CPR_METHODS[c.method];
    const dur = S.t - c.start;
    const fatigue = dur < m.fatigueT ? 1 : Math.exp(-(dur - m.fatigueT) / 200);
    let rate;
    if (c.tap) {
      const age = performance.now() / 1000 - CprTap.last;
      if (age > 1.6) return 0;
      rate = CprTap.rate;
    } else rate = 110 + 5 * Math.sin(S.t * 0.3);
    c.rate = rate;
    const rateF = rate >= 100 && rate <= 120 ? 1 : Math.max(0.3, 1 - Math.abs(rate - 110) / 70);
    let q = m.depth * (0.55 + 0.45 * fatigue) * rateF;
    if (F.airway === 'bvm') q *= 0.82;
    return q;
  },
  physio(S, dt) {
    const F = S.flags, v = S.v;
    if (F.aminataDue !== null && S.t >= F.aminataDue) {
      F.aminataDue = null;
      S.crew.push({ id: 'aminata', name: 'Aminata Sarr', short: 'Aminata', skill: 'cmo', busy: null });
      Sim.addLog(S.t, 'crew', 'Aminata Sarr arrive avec la trousse de réanimation sous le bras.');
    }
    const q = this.q(S);
    F.qNow = q;
    if (q > 0) { F.cprTime += dt; if (F.firstCpr === null) F.firstCpr = S.t; }
    const vent = F.airway ? 1 : 0;
    if (vent) F.lastVent = S.t;
    if (!F.rosc) {
      const hypox = S.t - F.lastVent > 240 ? 1.2 : 1;
      F.V = clamp(F.V - dt * (1 - 0.85 * q) / 540 * hypox, 0, 1);
      if (F.rhythm === 'fv' && F.V < 0.13) { F.rhythm = 'asystolie'; Sim.addLog(S.t, 'find', 'Sur le tracé, la fibrillation s\'éteint : le rythme devient plat (asystolie).'); }
      v.rhythm = F.rhythm; v.vfAmp = 0.12 + 0.6 * F.V;
      v.hr = 0; v.perf = q * 0.25; v.sbp = 0; v.dbp = 0; v.rr = F.airway === 'tube' || F.airway === 'sga' ? 10 : (F.airway === 'bvm' ? 6 : 0);
      v.etco2 = v.capno ? 6 + 18 * q : 0;
      v.spo2 = 70;
    } else {
      const since = S.t - F.rosc;
      v.rhythm = 'sinus';
      v.hr = 118 - Math.min(18, since / 30);
      v.sbp = 92 + Math.min(16, since / 20); v.dbp = 56 + Math.min(10, since / 30);
      v.perf = clamp((v.sbp - 45) / 70, 0, 1);
      v.rr = F.airway ? 12 : 8;
      v.spo2 = clamp((F.postO2 ? 96 : F.airway ? 91 : 87) + Math.sin(S.t * 0.1), 80, 99);
      v.etco2 = v.capno ? 38 + 2 * Math.sin(S.t * 0.05) : 0;
    }
    v.cpr = q > 0; v.cprRate = F.cpr ? F.cpr.rate || 110 : 0;
    v.effort = F.rosc ? 0.5 : 0;
    S.look = { pale: F.rosc ? 0.4 : 0.8, cyan: F.rosc ? (F.postO2 ? 0 : 0.2) : 0.7, eyesClosed: true, aed: F.aedHere, pads: F.pads, mask: !!F.airway };
    // réanimation en cours : rappel de l'analyse toutes les 2 minutes
    if (F.cpr && !F.rosc && F.lastAnalysisEnd && S.t - F.lastAnalysisEnd > 120 && !F.reminded) { F.reminded = true; Sim.say('Deux minutes de massage : préparez l\'analyse du rythme.', 3500); }
  },
  observe(S) {
    const F = S.flags;
    if (F.roscSeen) return 'Lucas a un pouls. Il ne se réveille pas encore et respire faiblement, aidé par l\'insufflateur.';
    const o = [];
    o.push(F.free ? (F.cmrs ? 'Lucas est attaché sur la table médicale.' : 'Lucas flotte, détaché du tapis.') : 'Lucas pend dans le harnais du tapis de course.');
    o.push('Il ne répond pas, ne respire pas normalement, ses lèvres sont grises.');
    if (F.cpr) {
      const m = CPR_METHODS[F.cpr.method];
      const who = S.crew.find(c => c.id === F.cpr.who);
      o.push(`${who ? who.short : 'Quelqu\'un'} masse (${m.label})${F.qNow > 0 ? ` à ${Math.round(F.cpr.rate || 110)} par minute` : ', en pause'}.`);
      if (S.t - F.cpr.start > CPR_METHODS[F.cpr.method].fatigueT) o.push('Le masseur fatigue : les compressions deviennent moins profondes.');
    } else o.push('Personne ne masse.');
    return o.join(' ');
  },
  startCpr(S, crew, method, tap) {
    const F = S.flags;
    if (F.cpr) { const prev = S.crew.find(c => c.id === F.cpr.who); if (prev && prev.busy && prev.busy.cpr) prev.busy = null; }
    const m = CPR_METHODS[method];
    crew.busy = { act: { id: 'cpr', label: 'Massage cardiaque' }, end: Infinity, start: S.t, cpr: true };
    F.cpr = { who: crew.id, method, start: S.t, readyAt: S.t + m.setup, tap: !!tap, rate: 110 };
    if (!F.methods.length || F.methods[F.methods.length - 1][1] !== method) F.methods.push([S.t, method]);
    $('#cprPanel').hidden = !tap;
    $('#cprInfo').textContent = tap ? 'Vous massez' : '';
  },
  stopCpr(S) {
    const F = S.flags;
    if (!F.cpr) return;
    const c = S.crew.find(x => x.id === F.cpr.who);
    if (c && c.busy && c.busy.cpr) c.busy = null;
    F.cpr = null;
    $('#cprPanel').hidden = true;
  },
  cprAction(method, label, detail) {
    return {
      id: 'cpr_' + method, cat: 'gestes', label, detail, dur: 0,
      req: S => {
        const F = S.flags, m = CPR_METHODS[method];
        if (F.roscSeen) return 'Lucas a un pouls : on arrête le massage.';
        if (m.needFree && !F.free) return 'Il faut d\'abord détacher Lucas du harnais.';
        if (m.needCmrs && !F.cmrs) return 'Il faut d\'abord installer Lucas sur la table médicale.';
        if (F.cpr && F.cpr.method === method) return 'C\'est déjà la méthode en cours.';
        return true;
      },
      run(S) {
        const free = Sim.freeCrew({ who: 'autre' }) || (S.flags.cpr ? S.crew.find(c => c.id === S.flags.cpr.who) : null) || Sim.freeCrew({ who: 'any' });
        if (!free) { Sim.addLog(S.t, 'aura', 'Personne n\'est libre pour masser.'); return false; }
        SIMS.arret.startCpr(S, free, method, false);
        return `${free.short} commence le massage (${CPR_METHODS[method].label}).`;
      }, kind: 'crew'
    };
  },
  pause(S, sec) { S.flags.pauseUntil = Math.max(S.flags.pauseUntil, S.t + sec); },
  get actions() { return this._actions || (this._actions = this.buildActions()); },
  buildActions() {
    const A = SIMS.arret;
    return [
      { id: 'verifier', cat: 'evaluer', label: 'Vérifier réponse et respiration (10 s au plus)', dur: 10, who: 'vous', once: true, kind: 'find',
        run: S => { S.flags.recognized = S.t; return 'Lucas ne répond pas. Pas de respiration normale : seulement quelques mouvements de bouche espacés. C\'est un arrêt cardiaque.'; } },
      { id: 'alarme', cat: 'evaluer', label: 'Déclencher l\'alarme médicale de la station', dur: 0, once: true,
        run: S => { S.flags.alarm = S.t; if (S.flags.aminataDue !== null) S.flags.aminataDue = Math.min(S.flags.aminataDue, S.t + 40); return 'Alarme médicale déclenchée : Aminata arrive, le centre de contrôle est prévenu.'; } },
      { id: 'pouls', cat: 'evaluer', label: 'Pendant la pause : chercher le pouls et les signes de vie', detail: '5 s, massage arrêté', dur: 5, who: 'vous', kind: 'find',
        req: S => S.flags.pads || S.flags.rosc ? true : 'Collez d\'abord les électrodes pour voir le rythme.',
        start: S => A.pause(S, 5),
        run(S) {
          if (S.flags.rosc && !S.flags.roscSeen) {
            S.flags.roscSeen = S.t; A.stopCpr(S);
            Sim.say('Pouls présent : reprise d\'une activité cardiaque.', 4500);
            return 'Pouls carotidien présent, rythme régulier sur le moniteur : le cœur de Lucas est reparti. Massage arrêté.';
          }
          return S.flags.rosc ? 'Pouls toujours présent.' : 'Pas de pouls. Reprenez le massage.';
        } },
      { id: 'causes', cat: 'evaluer', label: 'Chercher les causes réversibles (4 H et 4 T)', detail: '30 s, pendant le massage', dur: 30, who: 'medecin', once: true, kind: 'find',
        run: S => { S.flags.causes = S.t; return 'Hypoxie : non, il courait sans gêne. Hypovolémie : non. Potassium : inconnu, pas d\'analyse rapide à bord. Hypothermie : non. Thrombose du cœur : possible. Pneumothorax : pas de signe. Tamponnade : l\'échographie peut aider. Toxique : aucun. AURA retient un trouble du rythme sur une maladie du cœur jusqu\'ici inconnue.'; } },
      { id: 'harnais', cat: 'gestes', label: 'Détacher Lucas du harnais du tapis', detail: '20 s', dur: 20, once: true,
        run: S => { S.flags.free = S.t; return 'Lucas est détaché du harnais.'; } },
      A.cprAction('er', 'Massage : méthode Evetts-Russomano', 'Jambes par-dessus ses épaules, chevilles croisées dans son dos, bras tendus'),
      A.cprAction('rbh', 'Massage : étreinte inversée', 'Derrière lui, bras autour du thorax, mains jointes sur le sternum'),
      { id: 'cmrs', cat: 'gestes', label: 'Installer Lucas sur la table médicale (CMRS)', detail: '90 s pour une personne ; le massage s\'interrompt 15 s au transfert', dur: 90, once: true, who: 'autre',
        req: S => S.flags.free ? true : 'Il faut d\'abord détacher Lucas du harnais.',
        run(S) { S.flags.cmrs = S.t; A.pause(S, 15); if (Sim.exp) Sim.exp.setPose('table'); if (S.flags.cpr && CPR_METHODS[S.flags.cpr.method].needFree) S.flags.cpr.method = S.flags.cpr.method; return 'table déployée, Lucas attaché dessus.'; } },
      A.cprAction('hs', 'Massage sur la table : appui renversé', 'Pieds contre la paroi d\'en face, poussée bras tendus'),
      A.cprAction('str', 'Massage sur la table : à califourchon, attaché', 'Sangle autour de la taille du masseur'),
      { id: 'cpr_moi', cat: 'gestes', label: 'Masser vous-même, au rythme', detail: 'Touchez le bouton ou la barre d\'espace 100 à 120 fois par minute', dur: 0, kind: 'crew',
        req: S => { const F = S.flags; if (F.roscSeen) return 'Lucas a un pouls.'; if (!F.free) return 'Il faut d\'abord détacher Lucas du harnais.'; const me = S.crew.find(c => c.you); if (me.busy && !me.busy.cpr) return 'Vous êtes occupée.'; return true; },
        run(S) { const me = S.crew.find(c => c.you); A.startCpr(S, me, S.flags.cmrs ? 'hs' : 'er', true); return 'vous prenez le massage.'; } },
      { id: 'relais', cat: 'gestes', label: 'Changer de masseur', detail: 'Toutes les 2 minutes, au moment de l\'analyse', dur: 0,
        req: S => { if (!S.flags.cpr) return 'Personne ne masse.'; const f = S.crew.find(c => !c.busy && c.id !== S.flags.cpr.who && !c.you); return f ? true : 'Aucun autre membre libre pour prendre le relais.'; },
        run(S) {
          const F = S.flags, f = S.crew.find(c => !c.busy && c.id !== F.cpr.who && !c.you);
          const method = F.cpr.method === 'rbh' && F.free ? 'er' : F.cpr.method;
          A.startCpr(S, f, method, false); F.relays++; A.pause(S, 3);
          return `${f.short} prend le relais du massage.`;
        } },
      { id: 'stopcpr', cat: 'gestes', label: 'Arrêter le massage', dur: 0, hidden: S => !S.flags.cpr, run(S) { A.stopCpr(S); return 'massage arrêté.'; } },
      { id: 'aed', cat: 'circ', label: 'Apporter le défibrillateur et le sac de réanimation', detail: '40 s', dur: 40, once: true,
        run: S => { S.flags.aedHere = S.t; return 'défibrillateur et sac de réanimation sur place.'; } },
      { id: 'pads', cat: 'circ', label: 'Coller les électrodes du défibrillateur', detail: '15 s, sans arrêter le massage', dur: 15, once: true,
        req: S => S.flags.aedHere ? (S.flags.free ? true : 'Détachez d\'abord Lucas du harnais.') : 'Le défibrillateur n\'est pas encore là.',
        run: S => { S.flags.pads = S.t; S.v.leads = true; Sim.say('Électrodes connectées.', 2500); return 'électrodes collées : le rythme s\'affiche sur le moniteur.'; } },
      { id: 'analyse', cat: 'circ', label: 'Analyser le rythme (massage en pause)', detail: 'Mode automatique · 6 s', dur: 6, who: 'any',
        req: S => S.flags.pads ? (S.flags.roscSeen ? 'Lucas a un pouls.' : true) : 'Collez d\'abord les électrodes.',
        start(S) { A.pause(S, 6); S.flags.pauseStart = S.t; Sim.say('Analyse du rythme en cours. Ne touchez pas le patient.', 4000); Sound.speak('Analyse en cours. Ne touchez pas le patient.'); },
        run(S) {
          const F = S.flags; F.lastAnalysisEnd = S.t; F.reminded = false;
          const shockable = !F.rosc && (F.rhythm === 'fv');
          F.analysis = shockable ? 'choc' : 'non';
          if (shockable) { A.pause(S, 6); Sim.say('Choc recommandé. Chargement. Écartez-vous du patient.', 4500); Sound.speak('Choc recommandé. Écartez-vous du patient.'); F.chargedAt = S.t + 6; return 'Le défibrillateur recommande un choc et se charge.'; }
          Sim.say('Choc non recommandé. Reprenez le massage.', 4000); Sound.speak('Choc non recommandé. Reprenez le massage.');
          return F.rosc ? 'Choc non recommandé : rythme régulier sur l\'écran. Cherchez le pouls.' : 'Choc non recommandé : le rythme n\'est pas choquable.';
        } },
      { id: 'charger', cat: 'circ', label: 'Mode manuel : charger à 150 J pendant le massage', detail: 'Réservé à la médecin ; réduit la pause avant le choc', dur: 4, who: 'medecin',
        req: S => S.flags.pads ? (S.flags.roscSeen ? 'Lucas a un pouls.' : true) : 'Collez d\'abord les électrodes.',
        run(S) { S.flags.manualCharged = S.t; return 'défibrillateur chargé à 150 J, massage poursuivi.'; } },
      { id: 'choc', cat: 'circ', label: 'Choc : tout le monde s\'écarte', detail: 'Personne ne touche Lucas ni la table · 3 s', dur: 3, who: 'any',
        req: S => {
          const F = S.flags;
          if (F.roscSeen) return 'Lucas a un pouls.';
          if (F.analysis === 'choc' && S.t >= (F.chargedAt || 0)) return true;
          if (F.analysis === 'choc') return 'Chargement en cours.';
          if (F.manualCharged && S.t - F.manualCharged < 60) return true;
          return 'Pas de choc sans analyse ou charge préalable.';
        },
        start(S) {
          const F = S.flags;
          if (F.manualCharged && F.analysis !== 'choc') { A.pause(S, 3); F.pauseStart = S.t; }
          else A.pause(S, 3);
        },
        run(S) {
          const F = S.flags;
          const manual = F.manualCharged && F.analysis !== 'choc';
          F.manualCharged = null; F.analysis = null;
          if (manual && F.rhythm !== 'fv') { Sim.say('Choc délivré.', 2500); return 'Choc délivré sur un rythme qui n\'était pas une fibrillation : erreur de lecture du tracé.'; }
          F.shocks++; F.shockTimes.push(S.t);
          const pause = F.pauseStart !== null ? S.t - F.pauseStart : 6;
          F.pauses.push(pause); F.pauseStart = null;
          Sim.say('Choc délivré. Reprenez immédiatement le massage.', 3500); Sound.speak('Choc délivré. Reprenez le massage.');
          Sound.beep(180, 0.25, 0.12, 'sawtooth');
          if (F.rhythm === 'fv') {
            const recentDrug = (F.lido !== null && S.t - F.lido < 900 ? 0.3 : 0) + (F.adre.length && S.t - F.adre[F.adre.length - 1] < 300 ? 0.08 : 0);
            let p = F.shocks <= 2 ? 0 : (F.shocks === 3 ? 0.35 : 0.62) * Math.pow(F.V, 1.2) * (1 + recentDrug);
            if (pause > 10) p *= 0.8;
            if (S.rnd() < p) { F.rosc = S.t; F.rhythm = 'sinus'; }
          }
          return `choc n° ${F.shocks} délivré (150 J biphasique).`;
        } },
      { id: 'io', cat: 'circ', label: 'Voie intra-osseuse au tibia', detail: 'Matériel à confirmer à bord · 45 s', dur: 45, once: true, req: S => S.flags.access ? 'Un accès existe déjà.' : true,
        run: S => { S.flags.access = 'io'; S.flags.accessT = S.t; return 'aiguille intra-osseuse posée au tibia.'; } },
      { id: 'iv', cat: 'circ', label: 'Voie veineuse', detail: '90 s, difficile pendant l\'arrêt', dur: 90, once: true, req: S => S.flags.access ? 'Un accès existe déjà.' : true,
        run: S => { if (S.rnd() < 0.3) { S.done.iv = undefined; return 'la veine n\'a pas pu être prise : essayez l\'intra-osseuse.'; } S.flags.access = 'iv'; S.flags.accessT = S.t; return 'voie veineuse posée.'; } },
      { id: 'adre', cat: 'medic', label: 'Adrénaline 1 mg en IV ou IO, puis rinçage', detail: 'Après le 3e choc, puis toutes les 3 à 5 min · 20 s', dur: 20, stock: 'adre',
        req: S => S.flags.access ? (S.flags.roscSeen ? 'Lucas a un pouls.' : true) : 'Il faut d\'abord un accès veineux ou intra-osseux.',
        run: S => { S.flags.adre.push(S.t); if (S.flags.shocks < 3 && S.flags.rhythm === 'fv') S.flags.adreEarly = true; return 'adrénaline 1 mg injectée, rinçage au sérum.'; } },
      { id: 'amio', cat: 'medic', label: 'Amiodarone 300 mg', detail: 'Après le 3e choc', dur: 0, req: () => 'Absente de la liste publiée des médicaments de l\'ISS (données 2023). Les recommandations de 2021 prévoient la lidocaïne à la place.' },
      { id: 'lido', cat: 'medic', label: 'Lidocaïne 100 mg en IV ou IO', detail: 'Si l\'amiodarone manque, après le 3e choc · 20 s', dur: 20, stock: 'lido', once: true,
        req: S => S.flags.access ? true : 'Il faut d\'abord un accès veineux ou intra-osseux.',
        run: S => { S.flags.lido = S.t; return 'lidocaïne 100 mg injectée. La forme disponible à bord pour cet usage reste à confirmer par la NASA.'; } },
      { id: 'bvm', cat: 'air', label: 'Insuffler au ballon et au masque', detail: '2 insufflations après 30 compressions', dur: 10, once: true,
        req: S => S.flags.airway ? 'Une ventilation est déjà en place.' : true,
        run: S => { S.flags.airway = 'bvm'; return 'ballon et masque en place, 30 compressions pour 2 insufflations.'; } },
      { id: 'sga', cat: 'air', label: 'Masque laryngé (dispositif supraglottique)', detail: 'Simple à poser · 40 s', dur: 40, once: true,
        req: S => S.flags.airway === 'tube' ? 'Lucas est déjà intubé.' : true,
        run: S => { S.flags.airway = 'sga'; S.v.capno = true; return 'masque laryngé posé : massage continu, 10 insufflations par minute, CO2 expiré affiché.'; } },
      { id: 'intub', cat: 'air', label: 'Intubation', detail: 'Médecin entraînée, pause de moins de 5 s · 60 s', dur: 60, who: 'medecin', once: true,
        start: S => SIMS.arret.pause(S, 4),
        run: S => { S.flags.airway = 'tube'; S.v.capno = true; return 'sonde d\'intubation en place, position vérifiée par le CO2 expiré.'; } },
      { id: 'post_o2', cat: 'air', label: 'Oxygène : viser 94 à 98 % de saturation', detail: 'Après la reprise du cœur', dur: 15, once: true, hidden: S => !S.flags.roscSeen,
        run: S => { S.flags.postO2 = S.t; S.v.spo2Probe = true; return 'oxygène réglé pour une saturation entre 94 et 98 %.'; } },
      { id: 'post_ecg', cat: 'equipe', label: 'ECG 12 dérivations et bilan après la reprise', detail: '2 min', dur: 120, once: true, who: 'medecin', hidden: S => !S.flags.roscSeen, kind: 'find',
        run: S => { S.flags.ecg12 = S.t; S.v.cuff = true; S.flags.nibpAuto = true; Sim.measureNIBP(); return 'ECG : pas de signe franc d\'infarctus, cœur rapide. Tension prise toutes les 3 minutes.'; } },
      { id: 'post_evac', cat: 'equipe', label: 'Préparer avec le sol un retour sur Terre en urgence', detail: '1 min', dur: 60, once: true, hidden: S => !S.flags.roscSeen,
        run: S => { S.flags.evac = S.t; Sim.callGround(() => ({ text: 'Médecin de vol : reçu, reprise du cœur après choc. Gardez l\'oxygène entre 94 et 98 %, la tension au-dessus de 100, et préparez Lucas pour un retour en urgence dans le véhicule amarré. On lance la procédure.' })); return 'demande de retour en urgence envoyée au sol.'; } },
      { id: 'sol', cat: 'equipe', label: 'Appeler le médecin de vol', detail: '20 s', dur: 20,
        run(S) { Sim.callGround(S2 => ({ text: `Médecin de vol : reçu, arrêt cardiaque${S2.flags.pads ? ' avec rythme choquable' : ''}. Massage continu, choc toutes les 2 minutes si le rythme reste choquable, adrénaline et antiarythmique après le troisième choc. Changez de masseur à chaque analyse. On reste avec vous.` })); return 'appel au médecin de vol.'; } },
      { id: 'stop', cat: 'equipe', label: 'Arrêter la réanimation, en accord avec le sol', detail: 'Décision grave', dur: 0, hidden: S => !!S.flags.roscSeen,
        req: S => S.t > 1200 ? true : 'Trop tôt : la réanimation dure depuis moins de 20 minutes.',
        run: S => { S.flags.terminated = S.t; return 'Décision prise d\'arrêter la réanimation.'; } }
    ];
  },
  guide: [
    { text: 'Reconnaître l\'arrêt : pas de réponse, pas de respiration normale.', done: S => S.flags.recognized !== undefined },
    { text: 'Donner l\'alarme et appeler le sol.', done: S => S.flags.alarm !== null && S.done.sol !== undefined },
    { text: 'Détacher Lucas et masser sans attendre : méthode Evetts-Russomano.', done: S => S.flags.firstCpr !== null },
    { text: 'Défibrillateur : électrodes, analyse, choc si recommandé.', done: S => S.flags.shocks > 0 || !!S.flags.roscSeen },
    { text: 'Table médicale dès qu\'on est assez nombreux, puis massage en appui renversé.', done: S => !!S.flags.cmrs },
    { text: 'Analyse et choc toutes les 2 minutes, relais du masseur à chaque fois.', done: S => S.flags.shocks >= 2 || !!S.flags.roscSeen },
    { text: 'Accès veineux ou intra-osseux.', done: S => !!S.flags.access },
    { text: 'Après le 3e choc : adrénaline 1 mg et antiarythmique (lidocaïne à bord).', done: S => (S.flags.adre.length > 0 && S.flags.lido !== null) || !!S.flags.roscSeen },
    { text: 'Masque laryngé, ou intubation par la médecin.', done: S => S.flags.airway === 'sga' || S.flags.airway === 'tube' },
    { text: 'Après la reprise : oxygène 94 à 98 %, ECG, retour sur Terre avec le sol.', when: S => !!S.flags.roscSeen, done: S => S.flags.postO2 && S.flags.ecg12 && S.flags.evac }
  ],
  tip(S) {
    const F = S.flags;
    if (F.roscSeen) return 'Le cœur est reparti. Évitez trop d\'oxygène comme trop peu : saturation entre 94 et 98 %. Préparez le retour avec le sol.';
    if (F.recognized === undefined) return 'Dix secondes au plus pour vérifier la réponse et la respiration. Pas de recherche de pouls prolongée.';
    if (F.firstCpr === null) return F.free ? 'Chaque minute sans massage fait perdre des chances. Commencez par la méthode Evetts-Russomano.' : 'Il pend dans le harnais : détachez-le, puis massez tout de suite.';
    if (F.analysis === 'choc') return 'Choc recommandé : tout le monde s\'écarte, personne ne touche Lucas ni la table, puis choc.';
    if (!F.pads) return 'Le massage tient le cœur en attente. Le défibrillateur peut le relancer : faites-le apporter et coller les électrodes sans arrêter de masser.';
    if (F.cpr && S.t - F.cpr.start > CPR_METHODS[F.cpr.method].fatigueT) return 'Le masseur fatigue : relais au prochain arrêt pour l\'analyse.';
    if (F.lastAnalysisEnd && S.t - F.lastAnalysisEnd > 115) return 'Deux minutes depuis la dernière analyse : nouvelle analyse, choc si recommandé, relais du masseur.';
    if (F.shocks >= 3 && (!F.adre.length || F.lido === null)) return 'Trois chocs sans reprise : adrénaline 1 mg et lidocaïne 100 mg, l\'amiodarone n\'étant pas à bord. Il faut un accès veineux ou intra-osseux.';
    if (F.adre.length && S.t - F.adre[F.adre.length - 1] > 240) return 'Adrénaline toutes les 3 à 5 minutes tant que le cœur ne repart pas.';
    if (F.rhythm === 'asystolie') return 'Le tracé est plat : plus de choc. Massage, adrénaline dès que possible, et recherche des causes réversibles.';
    if (!F.cmrs && S.crew.length >= 3) return 'Vous êtes trois : la table médicale permet un massage plus efficace en appui renversé.';
    return 'Massage continu, pauses les plus courtes possibles.';
  },
  check(S) {
    const F = S.flags;
    if (F.terminated) return { outcome: 'echec', title: 'Réanimation arrêtée', text: 'La réanimation a été arrêtée, sans reprise du cœur.' };
    if (F.roscSeen && S.t - F.roscSeen > 300) return { outcome: 'succes', title: 'Le cœur est reparti', text: 'Lucas a un pouls depuis cinq minutes. Il reste inconscient, sous oxygène, en attendant un retour sur Terre organisé avec le sol.' };
    if (!F.rosc && S.t > 2700) return { outcome: 'echec', title: 'Pas de reprise après 45 minutes', text: 'Sans reprise du cœur après 45 minutes, la décision d\'arrêter se prend avec le sol.' };
    return null;
  },
  debrief(S) {
    const F = S.flags, cr = [];
    const frac = F.cprTime / Math.max(1, (F.roscSeen || S.t));
    cr.push({ ok: F.recognized !== undefined && F.recognized <= 30 ? true : F.recognized !== undefined ? 'mid' : false, text: F.recognized !== undefined ? `Arrêt reconnu à ${fmtClock(F.recognized)}, alarme ${F.alarm !== null ? 'à ' + fmtClock(F.alarm) : 'jamais déclenchée'}.` : 'L\'arrêt n\'a pas été vérifié.' });
    cr.push({ ok: F.firstCpr !== null && F.firstCpr <= 60 ? true : F.firstCpr !== null && F.firstCpr <= 120 ? 'mid' : false, text: F.firstCpr !== null ? `Premières compressions à ${fmtClock(F.firstCpr)}.` : 'Pas de massage.' });
    const s1 = F.shockTimes[0];
    cr.push({ ok: s1 !== undefined ? (s1 <= 210 ? true : s1 <= 330 ? 'mid' : false) : !!F.roscSeen, text: s1 !== undefined ? `Premier choc à ${fmtClock(s1)}, ${fmtDur(s1 + 30)} après le malaise. Plus il est précoce, plus il a de chances de réussir.` : 'Aucun choc délivré.' });
    cr.push({ ok: frac >= 0.8 ? true : frac >= 0.6 ? 'mid' : false, text: `Massage pendant ${Math.round(frac * 100)} % du temps de l'arrêt (objectif : plus de 80 %).` });
    const maxP = F.pauses.length ? Math.max(...F.pauses) : 0;
    cr.push({ ok: !F.pauses.length ? 'mid' : maxP <= 10 ? true : 'mid', text: F.pauses.length ? `Pause la plus longue avant un choc : ${Math.round(maxP)} s (objectif : moins de 5 à 10 s ; la charge pendant le massage la raccourcit).` : 'Pas de pause avant choc à mesurer.' });
    const usedHS = F.methods.some(m => m[1] === 'hs');
    cr.push({ ok: F.methods.length && (F.methods[0][1] === 'er' || F.methods[0][1] === 'rbh') ? (F.cmrs ? (usedHS ? true : 'mid') : 'mid') : false, text: `Méthodes : ${F.methods.map(m => CPR_METHODS[m[1]].label + ' à ' + fmtClock(m[0])).join(', ') || 'aucune'}. La recommandation de 2020 prévoit Evetts-Russomano d'abord, puis l'appui renversé sur la table.` });
    cr.push({ ok: F.adre.length && !F.adreEarly ? true : F.adre.length ? 'mid' : (F.shocks >= 3 ? false : 'mid'), text: F.adre.length ? `Adrénaline à ${F.adre.map(fmtClock).join(', ')}${F.adreEarly ? ' : une dose avant le 3e choc, trop tôt pour un rythme choquable' : ''}.` : 'Pas d\'adrénaline.' });
    cr.push({ ok: F.lido !== null ? true : (F.shocks >= 3 ? false : 'mid'), text: F.lido !== null ? `Lidocaïne à ${fmtClock(F.lido)}, à la place de l'amiodarone absente.` : 'Pas d\'antiarythmique.' });
    cr.push({ ok: F.relays >= 1 ? true : 'mid', text: `${F.relays} relais du masseur. Un masseur fatigue vite, encore plus en apesanteur.` });
    if (F.roscSeen) cr.push({ ok: F.postO2 && F.ecg12 && F.evac ? true : 'mid', text: 'Soins après la reprise : oxygène dosé, ECG, retour sur Terre préparé avec le sol.' });
    const good = cr.filter(c => c.ok === true).length;
    const verdict = F.roscSeen ? (good >= cr.length - 2 ? 'Bien mené' : 'Correct') : 'À reprendre';
    return {
      verdict, criteria: cr,
      learn: [
        'En apesanteur, la méthode Evetts-Russomano est la première à utiliser ; si elle ne permet pas un massage efficace, on passe à l\'étreinte inversée. Sur la table médicale, l\'appui renversé est préféré si la taille du module et du masseur le permettent.',
        'Massage de 5 à 6 cm, 100 à 120 par minute ; choc toutes les 2 minutes tant que le rythme reste choquable.',
        'En rythme choquable, adrénaline 1 mg et antiarythmique après le troisième choc, puis adrénaline toutes les 3 à 5 minutes. Sans amiodarone à bord, la lidocaïne 100 mg est l\'alternative prévue.',
        'Après la reprise du cœur : saturation entre 94 et 98 %, bilan, et retour sur Terre préparé avec le sol.'
      ],
      sources: [SRC.hink, SRC.rcukAls, SRC.issKit]
    };
  }
};
