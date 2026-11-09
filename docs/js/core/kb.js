/* AURA : accès à la base des fiches (version embarquée, version importée par le
   responsable médical, corrections faites à bord). */
(function (root) {
  'use strict';
  const A = root.AURA;
  const K = A.kb = {};
  const LIB = root.AURA_FICHES_LIB, VOCAB = root.AURA_VOCAB, TR = root.AURA_TRIAGE, PH = root.AURA_PHARMA, E = root.AURA_ENGINE, DATA = root.AURA_DATA;
  let cache = null;

  K.base = () => {
    const st = A.store.state;
    return (st && st.kb && st.kb.imported) || root.AURA_KB_DATA;
  };
  K.invalidate = () => { cache = null; if (A.brain && A.brain.reindex) A.brain.reindex(); };
  K.fiches = () => {
    if (cache) return cache;
    const edits = (A.store.state && A.store.state.kb.edits) || {};
    cache = K.base().fiches.map(f => edits[f.id] ? Object.assign({}, f, edits[f.id], { version: Object.assign({}, f.version, (edits[f.id] || {}).version || {}) }) : f);
    return cache;
  };
  K.get = id => K.fiches().find(f => f.id === id) || null;
  K.regles = () => K.base().regles || [];
  K.metiers = () => K.base().metiers || [];
  K.source = () => K.base().source || {};
  K.facts = () => VOCAB.FACTS;
  K.fact = code => VOCAB.FACTS[code] || null;

  K.edit = (id, patch) => {
    const st = A.store.state;
    st.kb.edits[id] = Object.assign({}, st.kb.edits[id] || {}, patch, { modifie: { d: A.store.day(), par: st.who } });
    A.store.save();
    K.invalidate();
  };
  K.setEtat = (id, etat) => {
    const f = K.get(id);
    K.edit(id, { version: Object.assign({}, f.version, { etat }) });
  };

  // Import d'une nouvelle version du document (export Markdown)
  K.importMarkdown = md => {
    const kb = LIB.build(md, VOCAB, PH, { etat: 'brouillon' });
    if (!kb.fiches.length) throw new Error('Aucune fiche trouvée dans ce fichier.');
    kb.source = { titre: 'Import du responsable médical', export: 'jour ' + A.store.day() };
    A.store.state.kb.imported = kb;
    A.store.state.kb.importedAt = A.store.day();
    A.store.save();
    K.invalidate();
    return kb.stats;
  };
  K.resetImport = () => { A.store.state.kb.imported = null; A.store.save(); K.invalidate(); };

  // Session d'orientation pour un membre d'équipage, avec le contexte du moment
  K.triage = (id) => {
    const S = A.store;
    const m = S.member(id);
    const eva = DATA.mission.tasks.some(tk => tk.crew.includes(id) && S.now() - (tk.day + (tk.minute + tk.dur) / 1440) >= 0 && S.now() - (tk.day + (tk.minute + tk.dur) / 1440) <= 1);
    const others = S.crewIds().filter(x => x !== id).some(x => S.member(x).triages.some(tr => tr.d >= S.day() - 2 && tr.facts && tr.facts.some(f => ['diarrhee', 'vomissement', 'fievre', 'toux'].includes(f))));
    const ctx = { mission: S.state.settings.mission, sexe: m.sexe, day: S.day(), gravityChanges: DATA.mission.gravityTransitions, pco2: S.state.settings.pco2, evaRecente: eva, causeCommune: others };
    return TR.create({ fiches: K.fiches() }, VOCAB, ctx, S.state.settings.engine);
  };
  K.plan = (fiche, id) => {
    const S = A.store;
    return TR.plan(fiche, { day: S.day(), stocks: S.state.stocks, tasks: S.tasksAhead(id, 24), light: S.light(), blackout: S.blackout() }, E, PH.meds);
  };
})(typeof self !== 'undefined' ? self : this);
