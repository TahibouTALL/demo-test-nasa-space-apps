/* AURA : moteur d'orientation par fiche (règles R-RAI-01 à R-RAI-11 du document des fiches)
   et score d'alerte adapté de NEWS2 (R-URG-31).
   Fonctions pures : aucun accès à l'interface ni au réseau.
   AURA parle d'orientation, jamais de diagnostic (R-RAI-08) ; un humain décide. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AURA_TRIAGE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = {
    autre: 0.10,          // part de la classe « autre » au départ (R-RAI-01)
    fenetreAdaptation: 14, // jours après un changement de gravité (R-RAI-01)
    horsFenetre: 0.01,     // réduction forte hors de cette fenêtre (choix AURA)
    echelle: { 'très typique': 0.9, 'fréquent': 0.6, 'possible': 0.3, 'rare': 0.1, 'contre': 0.03 },
    nonCite: 0.1,          // fait que la fiche ne cite pas (R-RAI-02)
    plancher: 0.01,        // R-RAI-03
    autreSeuil: 0.30,      // tableau non reconnu (R-RAI-05)
    alarmePremier: 0.05,   // R-RAI-06
    arretP: 0.80, arretGain: 0.05, arretQuestions: 8, // R-RAI-07
    evaFacteur: 10,        // R-RAI-04 (choix AURA)
    causeCommune: 5,       // R-RAI-11 (choix AURA)
    probaInconnue: 0.01,   // probabilité provisoire d'une condition sans valeur publiée (choix AURA, à fournir par la NASA)
    utiliserBrouillons: true
  };
  const EVA_FICHES = ['F-EXP-02', 'F-EXP-03', 'F-EXP-05', 'F-EXP-15'];
  const CO2_FICHES = ['F-EXP-01', 'F-EXP-11'];
  const COMMUNES = ['F-DIG-02', 'F-INF-02', 'F-INF-06', 'F-DIG-01'];
  // faits de contexte : ils modifient les chances, sans décrire la plainte elle-même
  const CONTEXTE = new Set(['eva_recente', 'changement_gravite', 'se_lever', 'medicament_pris']);

  function H(ps) { let h = 0; for (const p of ps) if (p > 0) h -= p * Math.log2(p); return h; }

  // Probabilité d'au moins un épisode pour cette personne et cette mission
  function priorP(f, ctx, S) {
    const key = ctx.mission === 'iss' ? 'iss' : 'mars';
    const alt = key === 'iss' ? 'mars' : 'iss';
    const src = f.apriori[key] || f.apriori[alt];
    const D = (f.apriori[key] ? key : alt) === 'iss' ? 182.5 : 1095;
    if (!src) return { p: S.probaInconnue, D: 182.5, provisoire: true };
    const sx = ctx.sexe === 'H' ? 'H' : 'F';
    return { p: src[sx] || 0, D, provisoire: false };
  }

  function create(KB, VOCAB, ctx, settings) {
    const S = Object.assign({}, DEFAULTS, settings || {});
    ctx = Object.assign({ mission: 'mars', sexe: 'F', day: 0, gravityChanges: [0], pco2: 2.5, evaRecente: false, causeCommune: false }, ctx || {});
    const fiches = KB.fiches.filter(f => S.utiliserBrouillons || f.version.etat === 'en service');
    const facts = VOCAB.FACTS;

    // R-RAI-01 et R-RAI-04 : probabilités de départ et modificateurs
    const lambda = fiches.map(f => {
      const pr = priorP(f, ctx, S);
      if (!pr.p) return 0;
      const base = -Math.log(1 - Math.min(0.999999, pr.p));
      let l;
      if (f.adaptation) {
        const since = (ctx.gravityChanges || []).filter(d => d <= ctx.day).map(d => ctx.day - d);
        const inside = since.some(d => d <= S.fenetreAdaptation);
        l = base / S.fenetreAdaptation * (inside ? 1 : S.horsFenetre);
      } else l = base / pr.D;
      if (ctx.pco2 > 3 && CO2_FICHES.includes(f.id)) l *= Math.pow(2, ctx.pco2 - 3);
      if (ctx.evaRecente && EVA_FICHES.includes(f.id)) l *= S.evaFacteur;
      if (ctx.causeCommune && (COMMUNES.includes(f.id) || f.famille === 'EXP')) l *= S.causeCommune;
      return l;
    });
    const sumL = lambda.reduce((a, b) => a + b, 0) || 1;
    const P0 = lambda.map(l => (1 - S.autre) * l / sumL);

    // force d'un fait pour une fiche (probabilité de le voir chez une personne qui a la condition)
    const forceIdx = fiches.map(f => {
      const m = {};
      (f.pour || []).forEach(x => { m[x.fait] = S.echelle[x.force] || S.nonCite; });
      (f.contre || []).forEach(x => { m[x.fait] = S.echelle.contre; });
      return m;
    });
    const lrIdx = fiches.map(f => {
      const m = {};
      (f.preuves || []).forEach(x => { if (!x.sexe || x.sexe === ctx.sexe) m[x.fait] = x; });
      return m;
    });
    const vPresent = (i, code) => (i < 0 ? S.nonCite : (forceIdx[i][code] !== undefined ? forceIdx[i][code] : S.nonCite));

    const st = { known: {}, asked: [], log: [], texts: [], mild: {} };

    function derived() {
      const k = Object.assign({}, st.known);
      if (k.brulure_urinaire === true && k.envies_frequentes === true && k.pertes_vaginales === false && k.irritation_vaginale === false) k.triade_urinaire = true;
      if (k.faiblesse_un_cote === true || k.trouble_parole === true) k.signe_fast = true;
      else if (k.faiblesse_un_cote === false && k.trouble_parole === false) k.signe_fast = false;
      return k;
    }

    // R-RAI-02 et R-RAI-03 : calcul en mots, puis valeurs publiées sur les chances
    function posterior(known) {
      known = known || derived();
      const codes = Object.keys(known).filter(c => known[c] === true || known[c] === false);
      const n = fiches.length;
      const sc = new Float64Array(n + 1);
      // Seules les fiches qui citent au moins un fait présent peuvent expliquer le tableau ; pour un événement
      // (blessure, exposition, deuil), seules celles qui citent cet événement. Les probabilités de départ sont
      // réparties entre elles (R-RAI-01 appliquée à ce sous-ensemble) et la classe « autre » garde sa part.
      // Choix AURA, à valider par le responsable médical.
      let base = P0;
      const pos = codes.filter(c => known[c] === true && facts[c] && !facts[c].lieu && !CONTEXTE.has(c));
      const ev = pos.filter(c => facts[c].evenement);
      const keys = ev.length ? ev : pos;
      if (keys.length) {
        const ok = fiches.map((f, i) => keys.some(c => forceIdx[i][c] !== undefined && forceIdx[i][c] > S.echelle.contre));
        const sumOk = lambda.reduce((a, l, i) => a + (ok[i] ? l : 0), 0);
        if (sumOk > 0) base = lambda.map((l, i) => ok[i] ? (1 - S.autre) * l / sumOk : 0);
      }
      for (let i = 0; i < n; i++) {
        if (!base[i]) { sc[i] = 0; continue; }
        let s = base[i];
        for (const c of codes) {
          if (lrIdx[i][c]) continue;
          const vp = vPresent(i, c);
          const v = known[c] ? vp : 1 - vp;
          s *= Math.max(v, S.plancher);
        }
        sc[i] = s;
      }
      let so = S.autre;
      for (const c of codes) so *= Math.max(known[c] ? S.nonCite : 1 - S.nonCite, S.plancher);
      sc[n] = so;
      const tot = sc.reduce((a, b) => a + b, 0) || 1;
      const P = Array.from(sc, s => s / tot);
      // valeurs publiées : P' = O × RV / (1 + O × RV), les autres se partagent le reste
      const fixed = {};
      let fixedSum = 0;
      for (let i = 0; i < n; i++) {
        const lr = lrIdx[i];
        const used = Object.keys(lr).filter(c => known[c] === true || known[c] === false);
        if (!used.length || !P[i]) continue;
        let O = P[i] / Math.max(1e-12, 1 - P[i]);
        used.forEach(c => {
          const r = known[c] ? lr[c].rvP : lr[c].rvA;
          if (r) O *= r;
        });
        fixed[i] = O / (1 + O);
        fixedSum += fixed[i];
      }
      if (fixedSum > 0) {
        const restOld = P.reduce((a, p, i) => a + (fixed[i] === undefined ? p : 0), 0) || 1;
        const restNew = Math.max(0, 1 - Math.min(0.999, fixedSum));
        for (let i = 0; i <= n; i++) P[i] = fixed[i] !== undefined ? fixed[i] : P[i] * restNew / restOld;
      }
      return P;
    }

    function pPresent(P, code) {
      let s = 0;
      for (let i = 0; i < fiches.length; i++) if (P[i]) s += P[i] * vPresent(i, code);
      return s + P[fiches.length] * S.nonCite;
    }

    function candidates(P) {
      const set = new Set();
      fiches.forEach((f, i) => {
        if (P[i] < 0.01) return;
        (f.pour || []).forEach(x => set.add(x.fait));
        (f.contre || []).forEach(x => set.add(x.fait));
        (f.alarmeFaits || []).forEach(x => set.add(x));
      });
      return Array.from(set).filter(c => facts[c] && st.known[c] === undefined && !st.asked.includes(c) && (!facts[c].sexe || facts[c].sexe === ctx.sexe));
    }

    // Une fiche n'explique le tableau que si elle cite au moins un fait présent : sinon, sa probabilité
    // ne vient que de sa fréquence, et ses questions ou ses alarmes seraient hors sujet.
    function explains(i, known) {
      return (fiches[i].pour || []).some(x => known[x.fait] === true && !(facts[x.fait] && facts[x.fait].lieu));
    }

    function nextQuestion() {
      const known = derived();
      const P = posterior(known);
      // un signe d'alarme décrit à demi-mot (« je me suis cogné la tête ») : on demande d'abord s'il était fort
      const toConfirm = Object.keys(st.mild).find(c => st.mild[c] && !st.asked.includes(c));
      if (toConfirm) return { code: toConfirm, question: facts[toConfirm].question, label: facts[toConfirm].label, kind: 'alarme', fiche: null, gain: null };
      // R-RAI-06 : la question d'alarme d'une condition au-dessus de 5 % passe d'abord
      const order = fiches.map((f, i) => i).filter(i => P[i] > S.alarmePremier && explains(i, known)).sort((a, b) => P[b] - P[a]);
      for (const i of order) {
        const code = (fiches[i].alarmeFaits || []).find(c => facts[c] && st.known[c] === undefined && !st.asked.includes(c) && (!facts[c].sexe || facts[c].sexe === ctx.sexe));
        if (code) return { code, question: facts[code].question, label: facts[code].label, kind: 'alarme', fiche: fiches[i].id, gain: null };
      }
      const H0 = H(P);
      let best = null;
      for (const code of candidates(P)) {
        const pp = Math.min(0.999, Math.max(0.001, pPresent(P, code)));
        const ky = Object.assign({}, known, { [code]: true });
        const kn = Object.assign({}, known, { [code]: false });
        const g = H0 - (pp * H(posterior(ky)) + (1 - pp) * H(posterior(kn)));
        if (!best || g > best.gain) best = { code, gain: g };
      }
      if (!best) return null;
      return { code: best.code, question: facts[best.code].question, label: facts[best.code].label, kind: 'gain', gain: best.gain };
    }

    function urgences() {
      const known = derived();
      const out = [];
      (VOCAB.URGENCES || []).forEach(u => {
        const hit = u.facts.find(c => known[c] === true && !st.mild[c]);
        if (hit) out.push({ type: 'signe', ref: u.ref, fait: hit, titre: u.titre, penser: u.penser, gestes: u.gestes });
      });
      const P = posterior(known);
      fiches.forEach((f, i) => {
        if (P[i] < S.alarmePremier || !explains(i, known)) return;
        const hit = (f.alarmeFaits || []).find(c => known[c] === true);
        if (hit) out.push({ type: 'fiche', fiche: f.id, nom: f.nom, fait: hit, titre: facts[hit] ? facts[hit].label : hit, alarme: f.textes.alarme, p: P[i] });
        else if (f.urgenceEnSoi && P[i] > 0.3) out.push({ type: 'fiche', fiche: f.id, nom: f.nom, fait: null, titre: f.nom, alarme: f.textes.alarme, p: P[i] });
      });
      return out;
    }

    function setFact(code, value, from) {
      if (!facts[code] && !['triade_urinaire', 'signe_fast'].includes(code)) return false;
      if (value === null || value === undefined) { delete st.known[code]; return true; }
      st.known[code] = !!value;
      st.log.push({ code, value: !!value, from: from || 'reponse' });
      return true;
    }

    function addText(text, pats) {
      const LIB = (typeof module === 'object' && module.exports) ? require('./fiches.js') : (typeof self !== 'undefined' ? self : globalThis).AURA_FICHES_LIB;
      const found = LIB.findFacts(text, pats);
      st.texts.push(text);
      found.facts.forEach(f => {
        if (found.info && !f.neg) return;
        if (!f.neg) imply(f.code, 'texte');
        // forme légère d'un signe d'alarme : elle compte pour les fiches, sans alerte tant que la gravité n'est pas confirmée
        const parent = facts[f.code] && facts[f.code].leger;
        if (parent && !f.neg) { if (st.known[parent] !== true) { setFact(parent, true, 'texte'); st.mild[parent] = true; } return; }
        setFact(f.code, !f.neg, 'texte');
      });
      return found;
    }

    // un fait précis entraîne son fait général (vomir, c'est avoir la nausée ; mal en bas à droite, c'est mal au ventre)
    function imply(code, from) {
      let c = facts[code] && facts[code].parent, guard = 0;
      while (c && guard++ < 4) {
        if (st.known[c] === undefined) setFact(c, true, from);
        c = facts[c] && facts[c].parent;
      }
    }

    function answer(code, value) {
      if (!st.asked.includes(code)) st.asked.push(code);
      if (value === true) imply(code, 'reponse');
      if (st.mild[code]) {
        // « oui, c'était fort » : le signe d'alarme est confirmé ; « non » : le choc léger reste un fait
        if (value === true) { delete st.mild[code]; setFact(code, true, 'reponse'); }
        return;
      }
      if (value === true || value === false) setFact(code, value, 'reponse');
    }

    function state() {
      const known = derived();
      const P = posterior(known);
      const n = fiches.length;
      const anyFact = Object.keys(known).some(c => known[c] === true);
      const ranked = fiches.map((f, i) => ({ f, p: P[i], i })).filter(r => !anyFact || explains(r.i, known)).sort((a, b) => b.p - a.p);
      // la part des fiches qui n'expliquent rien rejoint la classe « autre » (R-RAI-05)
      const autre = anyFact ? 1 - ranked.reduce((a, r) => a + r.p, 0) : P[n];
      const top = ranked[0];
      const q = st.asked.length >= S.arretQuestions ? null : nextQuestion();
      let stop = null;
      // une question d'alarme passe toujours avant l'arrêt (R-RAI-06)
      if (q && q.kind === 'alarme') stop = null;
      else if (top && top.p >= S.arretP) stop = 'seuil';
      else if (st.asked.length >= S.arretQuestions) stop = 'questions';
      else if (!q || (q.kind === 'gain' && q.gain < S.arretGain)) stop = 'gain';
      const describe = r => {
        const pour = (r.f.pour || []).filter(x => known[x.fait] === true).map(x => x.fait);
        const contre = (r.f.pour || []).filter(x => known[x.fait] === false).map(x => x.fait)
          .concat((r.f.contre || []).filter(x => known[x.fait] === true).map(x => x.fait));
        const manque = (r.f.pour || []).filter(x => known[x.fait] === undefined).map(x => x.fait);
        return { id: r.f.id, nom: r.f.nom, p: r.p, pour, contre, manque };
      };
      return {
        top: ranked.slice(0, 3).map(describe),
        autre,
        reconnu: autre <= S.autreSeuil,
        stop, next: stop ? null : q,
        asked: st.asked.length,
        known: Object.assign({}, st.known),
        urgences: urgences(),
        entropie: H(P)
      };
    }

    return { ctx, settings: S, fiches, setFact, answer, addText, nextQuestion, posterior: () => posterior(), state, urgences, _st: st, P0 };
  }

  /* ---------------------------------------------------------------- */
  /* Proposition de traitement : options de la fiche dans l'ordre,      */
  /* chacune passée aux six vérifications (R-TRT)                       */
  /* ---------------------------------------------------------------- */
  function plan(fiche, o, ENGINE, meds) {
    const out = [];
    (fiche.options || []).forEach(opt => {
      const res = (opt.ressources || []).map(id => {
        const m = meds.find(x => x.id === id);
        if (!m) return { id, name: id, blocked: true, checks: [{ id: 'bord', label: 'À bord', state: 'no', text: 'Absent de la pharmacie de bord' }] };
        const c = ENGINE.actionChecks(m, Object.assign({}, o, { stock: o.stocks[id] !== undefined ? o.stocks[id] : m.stock, factor: 1 }));
        return Object.assign({ id, name: m.name, materiel: m.route === 'materiel' }, c);
      });
      const blocked = res.length > 0 && res.every(r => r.blocked);
      out.push({ rang: opt.rang, action: opt.action, competence: opt.competence, ressources: res, blocked });
    });
    const firstMed = out.find(x => x.ressources.some(r => !r.materiel) && !x.blocked) || null;
    const gestes = out.filter(x => !x.ressources.some(r => !r.materiel));
    const allBlocked = out.some(x => x.ressources.some(r => !r.materiel)) && !firstMed;
    return { options: out, propose: firstMed, gestes, allBlocked };
  }

  /* ---------------------------------------------------------------- */
  /* Score d'alerte NEWS2 adapté au vol (R-URG-31)                      */
  /* ---------------------------------------------------------------- */
  function news2(v, opts) {
    opts = opts || {};
    const pts = {};
    const T = v.temp !== undefined && v.temp !== null ? v.temp - (opts.tempShift || 0) : null;
    if (v.rr != null) pts.rr = v.rr <= 8 ? 3 : v.rr <= 11 ? 1 : v.rr <= 20 ? 0 : v.rr <= 24 ? 2 : 3;
    if (v.spo2 != null) pts.spo2 = v.spo2 <= 91 ? 3 : v.spo2 <= 93 ? 2 : v.spo2 <= 95 ? 1 : 0;
    if (v.o2 != null) pts.o2 = v.o2 ? 2 : 0;
    if (v.sys != null) pts.sys = v.sys <= 90 ? 3 : v.sys <= 100 ? 2 : v.sys <= 110 ? 1 : v.sys <= 219 ? 0 : 3;
    if (v.hr != null) pts.hr = v.hr <= 40 ? 3 : v.hr <= 50 ? 1 : v.hr <= 90 ? 0 : v.hr <= 110 ? 1 : v.hr <= 130 ? 2 : 3;
    if (v.conscience != null) pts.conscience = v.conscience === 'normale' ? 0 : 3;
    if (T != null) pts.temp = T <= 35.0 ? 3 : T <= 36.0 ? 1 : T <= 38.0 ? 0 : T <= 39.0 ? 1 : 2;
    const keys = Object.keys(pts);
    const total = keys.reduce((a, k) => a + pts[k], 0);
    const single3 = keys.some(k => pts[k] === 3);
    const partial = keys.length < 7;
    let niveau = 'bas';
    if (total >= 7) niveau = 'urgence';
    else if (total >= 5 || single3) niveau = 'avis urgent';
    else if (total >= 1) niveau = 'surveillance';
    return { pts, total, partial, niveau, tCorrigee: T, rassure: !partial && niveau === 'bas' };
  }

  return { create, plan, news2, DEFAULTS };
});
