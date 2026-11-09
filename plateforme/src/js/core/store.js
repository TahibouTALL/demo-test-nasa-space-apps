/* AURA : état de la plateforme, données de démonstration et actions.
   Tout reste dans ce navigateur (stockage local). L'équipage et ses mesures
   sont fictifs et reproductibles ; les règles viennent des fiches. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const DATA = root.AURA_DATA, E = root.AURA_ENGINE, PH = root.AURA_PHARMA;
  const KEY = 'aura-v2';
  const VERSION = 3;

  // Compléments de démonstration : sexe (pour les fiches propres à un sexe), couleur, appareils
  const CREW_EXTRA = {
    a1: { sexe: 'F', hue: 196, conf: 3 },
    a2: { sexe: 'H', hue: 28, conf: 1 },
    a3: { sexe: 'F', hue: 262, conf: 0 },
    a4: { sexe: 'H', hue: 152, conf: 5 }
  };
  const TODAY = 58;
  const METRICS = ['temp', 'hr', 'spo2'];

  const S = { state: null };
  A.store = S;

  /* ---------------------------------------------------------------- */
  /* Données de démonstration                                           */
  /* ---------------------------------------------------------------- */
  function seedCrew(c, i) {
    const r = A.rng(1000 + i * 77);
    const g = () => A.gauss(r);
    const ex = CREW_EXTRA[c.id];
    const filters = {};
    METRICS.forEach(m => { filters[m] = E.initFilter(DATA.metrics[m], c.pre[m]); });
    const measures = { temp: [], hr: [], spo2: [], sleep: [], mood: [] };
    const exercise = [];
    for (let d = 1; d < TODAY; d++) {
      const t = d + 7 / 24;
      const vals = {
        temp: +(c.pre.temp.mean + c.truth.tempRise * (1 - Math.exp(-d / 30)) + g() * 0.14).toFixed(1),
        hr: Math.round(c.truth.hr + g() * 2.6),
        spo2: Math.min(100, +(c.truth.spo2 + g() * 0.45).toFixed(0))
      };
      METRICS.forEach(m => {
        const res = E.processMeasurement(DATA.metrics[m], filters[m], { t, value: vals[m] });
        if (res.status === 'processed') filters[m] = res.filter;
        measures[m].push({ d, t, v: vals[m], lvl: res.ev ? res.ev.level : 'normal' });
      });
      let sleep = c.wb.sleep + g() * 0.45;
      if (c.sleepDecline && d >= c.sleepDecline.from) sleep = A.lerp(c.wb.sleep, c.sleepDecline.to, (d - c.sleepDecline.from) / (TODAY - c.sleepDecline.from)) + g() * 0.3;
      measures.sleep.push({ d, v: +A.clamp(sleep, 3.5, 8.5).toFixed(1) });
      measures.mood.push({ d, v: Math.round(A.clamp(c.wb.mood + g() * 0.6, 1, 5)) });
      // séances d'exercice : vélo ou tapis (cardio), musculation (force)
      if (r() < 0.9) { const min = Math.round(30 + r() * 25); exercise.push({ d, type: r() < 0.55 ? 'velo' : 'tapis', min, km: 0 }); }
      if (r() < 0.82) exercise.push({ d, type: 'muscu', min: Math.round(35 + r() * 25), km: 0 });
    }
    exercise.forEach(x => { x.km = kmOf(x.type, x.min); });
    // aujourd'hui : rien encore, sauf pour Aminata qui a déjà fait sa mesure et du vélo
    if (c.id === 'a1') {
      const t = TODAY + 7 / 24;
      const v = { temp: 37.9, hr: 58, spo2: 98 };
      METRICS.forEach(m => {
        const res = E.processMeasurement(DATA.metrics[m], filters[m], { t, value: v[m] });
        if (res.status === 'processed') filters[m] = res.filter;
        measures[m].push({ d: TODAY, t, v: v[m], lvl: res.ev ? res.ev.level : 'normal' });
      });
      exercise.push({ d: TODAY, type: 'velo', min: 35, km: kmOf('velo', 35) });
    }
    if (c.id === 'a3') exercise.push({ d: TODAY, type: 'velo', min: 25, km: kmOf('velo', 25) });
    const videos = {};
    ['incendie', 'dos', 'os'].forEach((v, k) => { if (r() < 0.8) videos[v] = { d: 20 + k * 9 + Math.round(r() * 6), n: 1 }; });
    if (c.id !== 'a3') videos.sommeil = { d: 40, n: 1 };
    const journal = c.id === 'a3' ? [
      { id: 'j1', d: 55, min: 22 * 60 + 10, mood: 3, text: 'Longue journée au laboratoire. La Terre est maintenant un point bleu dans le hublot, ça me fait quelque chose de la voir si petite.' },
      { id: 'j2', d: 57, min: 22 * 60 + 40, mood: 2, text: 'Encore une nuit courte. Je me réveille vers 4 heures et je n\'arrive plus à me rendormir.' }
    ] : [];
    return {
      id: c.id, sexe: ex.sexe, hue: ex.hue, confDay: ex.conf,
      prefs: { sophieName: 'Sophie', voice: 'f', guided: true, rate: 1 },
      filters, measures, exercise, videos, journal,
      xp: 0, badges: {}, sims: {}, escapes: [], conferences: [
        { id: 'c' + c.id + '0', d: TODAY - 7 + (ex.conf === 0 ? 0 : 0), mode: 'voix', resume: 'Semaine calme, appétit correct, quelques réveils nocturnes.', partage: true }
      ],
      triages: [], treatments: [], chat: [], missions: {}
    };
  }
  function kmOf(type, min) { return type === 'velo' ? +(min * 0.42).toFixed(1) : type === 'tapis' ? +(min * 0.15).toFixed(1) : 0; }
  S.kmOf = kmOf;

  function seed() {
    const crew = {};
    DATA.crew.forEach((c, i) => { crew[c.id] = seedCrew(c, i); });
    const stocks = {};
    PH.meds.forEach(m => { stocks[m.id] = m.stock; });
    // quelques prises passées
    stocks.paracetamol -= 23; stocks.ibuprofene -= 17; stocks.melatonine -= 12; stocks.pseudoephedrine -= 9; stocks.loratadine -= 4; stocks.zolpidem -= 6;
    const st = {
      v: VERSION,
      who: null, role: 'crew',
      settings: {
        day: TODAY, mission: 'mars', pco2: 4.2, ppo2: 152, cabinTemp: 22.5, sound: true, textScale: 1,
        circadien: true, timeOverride: null,
        ai: { provider: 'aucune', key: '', model: '', url: '' },
        engine: {}
      },
      crew, stocks, medLog: [],
      videosLib: [], queue: [
        { id: 'q1', d: TODAY - 1, min: 21 * 60, prio: 2, kind: 'paquet', who: null, titre: 'Paquet médical du jour 57', statut: 'envoyé' }
      ],
      alerts: [], validations: [], kb: { edits: {}, imported: null, importedAt: null }
    };
    // points d'expérience de départ : refaits à partir de l'historique
    S.state = st;
    Object.values(crew).forEach(c => { c.xp = A.gamify ? A.gamify.historyXP(c) : 0; if (A.gamify) A.gamify.recheckBadges(c, true); });
    return st;
  }

  /* ---------------------------------------------------------------- */
  /* Chargement et sauvegarde                                          */
  /* ---------------------------------------------------------------- */
  S.load = function () {
    const saved = A.storage.get(KEY, null);
    S.state = saved && saved.v === VERSION ? saved : seed();
    if (!saved || saved.v !== VERSION) S.save();
    return S.state;
  };
  let saveTimer = null;
  S.save = function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => A.storage.set(KEY, S.state), 120);
  };
  S.reset = function () { A.storage.del(KEY); S.state = seed(); S.save(); A.emit('state:reset'); };

  /* ---------------------------------------------------------------- */
  /* Sélecteurs                                                         */
  /* ---------------------------------------------------------------- */
  S.day = () => S.state.settings.day;
  S.minute = () => {
    const o = S.state.settings.timeOverride;
    if (o !== null && o !== undefined) return o;
    const d = new Date(); return d.getHours() * 60 + d.getMinutes();
  };
  S.now = () => S.day() + S.minute() / 1440;
  S.profile = id => DATA.crew.find(c => c.id === id);
  S.crewIds = () => DATA.crew.map(c => c.id);
  S.member = id => S.state.crew[id];
  S.me = () => S.state.who ? S.state.crew[S.state.who] : null;
  S.meProfile = () => S.state.who ? S.profile(S.state.who) : null;
  S.cmoId = () => 'a3';
  S.isCmo = id => id === 'a3';
  S.sophieName = id => { const m = S.member(id || S.state.who); return (m && m.prefs.sophieName) || 'Sophie'; };
  S.light = () => E.lightMinutes(DATA.mission, S.day());
  S.phase = () => E.phaseAt(DATA.mission, S.day());
  S.blackout = () => E.isBlackout(DATA.mission, S.day());
  S.tasksAhead = (id, hours) => {
    const now = S.now();
    return DATA.mission.tasks.filter(tk => tk.crew.includes(id)).map(tk => Object.assign({}, tk, { start: tk.day + tk.minute / 1440 }))
      .filter(tk => tk.start >= now && tk.start - now <= (hours || 24) / 24)
      .map(tk => Object.assign(tk, { when: tk.day === S.day() ? 'aujourd\'hui à ' + A.hm(tk.minute) : 'demain à ' + A.hm(tk.minute) }));
  };
  S.lastMeasure = (id, m) => { const a = S.member(id).measures[m]; return a[a.length - 1] || null; };
  S.measuredToday = id => METRICS.some(m => { const l = S.lastMeasure(id, m); return l && l.d === S.day(); });
  S.exerciseToday = id => {
    const ex = S.member(id).exercise.filter(x => x.d === S.day());
    const cardio = ex.filter(x => x.type !== 'muscu').reduce((a, x) => a + x.min, 0);
    const force = ex.filter(x => x.type === 'muscu').reduce((a, x) => a + x.min, 0);
    return { cardio, force, list: ex };
  };
  S.reference = (id, m) => {
    const f = S.member(id).filters[m];
    const cfg = DATA.metrics[m];
    const p = E.predict(cfg, f, S.now());
    const sd = Math.sqrt(p.P + cfg.withinSd * cfg.withinSd);
    return { x: p.x, lo: p.x - E.Z_NORMAL * sd, hi: p.x + E.Z_NORMAL * sd, pre: f.preMu };
  };
  S.confDue = id => {
    const m = S.member(id);
    const last = m.conferences.reduce((a, c) => Math.max(a, c.d), -99);
    const due = last + 7;
    return { last, due, today: S.day() >= due, inDays: Math.max(0, due - S.day()) };
  };
  S.pendingValidations = () => S.state.validations.filter(v => v.statut === 'attente');
  S.unreadAlerts = () => S.state.alerts.filter(a => !a.lu);

  /* ---------------------------------------------------------------- */
  /* Actions                                                            */
  /* ---------------------------------------------------------------- */
  S.setWho = (id, role) => { S.state.who = id; S.state.role = role || 'crew'; S.save(); A.emit('who', id); };
  S.setPref = (k, v, id) => { const m = S.member(id || S.state.who); if (!m) return; m.prefs[k] = v; S.save(); A.emit('prefs', { k, v }); };
  S.setSetting = (k, v) => { S.state.settings[k] = v; S.save(); A.emit('settings', { k, v }); };

  S.addMeasure = (id, metric, value, context) => {
    const m = S.member(id);
    const cfg = DATA.metrics[metric];
    const t = S.now();
    const res = E.processMeasurement(cfg, m.filters[metric], { t, value, context: context || {} });
    if (res.status === 'processed') {
      m.filters[metric] = res.filter;
      m.measures[metric].push({ d: S.day(), t, v: value, lvl: res.ev.level });
      if (res.ev.level !== 'normal') S.alert({ who: id, niveau: res.ev.level === 'urgence' ? 'urgence' : 'vigilance', titre: cfg.short + ' à regarder', texte: A.num(value, cfg.decimals) + ' ' + cfg.unit + ' pour ' + A.first(S.profile(id).name) });
      res.reward = A.gamify ? A.gamify.award(id, 'mesure') : null;
      S.save();
      A.emit('measure', { id, metric, res });
    }
    return res;
  };
  S.addSimple = (id, metric, value) => { // sommeil, humeur
    const m = S.member(id);
    const arr = m.measures[metric];
    const last = arr[arr.length - 1];
    if (last && last.d === S.day()) last.v = value; else arr.push({ d: S.day(), v: value });
    S.save();
  };

  S.logExercise = (id, type, min) => {
    const m = S.member(id);
    const x = { d: S.day(), type, min: Math.round(min), km: kmOf(type, min), at: S.minute() };
    m.exercise.push(x);
    const res = A.gamify ? A.gamify.award(id, 'sport', { min: x.min, type }) : null;
    S.save();
    A.emit('exercise', { id, x, res });
    return { x, res };
  };

  S.addJournal = (id, text, mood) => {
    const m = S.member(id);
    const e = { id: A.uid('j'), d: S.day(), min: S.minute(), text, mood: mood || null };
    m.journal.push(e);
    S.save();
    return e;
  };

  S.saveConference = (id, conf) => {
    const m = S.member(id);
    const c = Object.assign({ id: A.uid('c'), d: S.day(), min: S.minute() }, conf);
    m.conferences.push(c);
    S.queue({ prio: 3, kind: 'conference', who: id, titre: 'Résumé de conférence : ' + S.profile(id).name, prive: !c.partage });
    S.save();
    return c;
  };

  S.queue = (msg) => {
    const q = Object.assign({ id: A.uid('q'), d: S.day(), min: S.minute(), statut: S.blackout() ? 'en attente de liaison' : 'en file' }, msg);
    S.state.queue.push(q);
    S.state.queue.sort((a, b) => (a.statut === 'envoyé') - (b.statut === 'envoyé') || a.prio - b.prio);
    S.save();
    return q;
  };
  S.alert = (a) => {
    const x = Object.assign({ id: A.uid('a'), d: S.day(), min: S.minute(), lu: false }, a);
    S.state.alerts.unshift(x);
    S.save();
    A.emit('alert', x);
    return x;
  };

  S.addTriage = (id, tr) => {
    const m = S.member(id);
    const x = Object.assign({ id: A.uid('t'), d: S.day(), min: S.minute() }, tr);
    m.triages.push(x);
    S.save();
    return x;
  };
  S.proposeTreatment = (id, p) => {
    const v = Object.assign({ id: A.uid('v'), d: S.day(), min: S.minute(), who: id, statut: 'attente' }, p);
    S.state.validations.unshift(v);
    S.alert({ who: id, niveau: p.urgent ? 'urgence' : 'info', titre: 'À valider : ' + p.ficheNom, texte: A.first(S.profile(id).name) + ' : ' + (p.medNom || 'gestes de la fiche'), validation: v.id });
    S.save();
    A.emit('validation', v);
    return v;
  };
  S.decide = (vid, decision, note) => {
    const v = S.state.validations.find(x => x.id === vid);
    if (!v) return null;
    v.statut = decision; v.note = note || ''; v.decideD = S.day(); v.decideMin = S.minute();
    if (decision === 'validé' && v.med) {
      const units = 1;
      S.state.stocks[v.med] = Math.max(0, (S.state.stocks[v.med] || 0) - units);
      S.state.medLog.push({ d: S.day(), min: S.minute(), who: v.who, med: v.med, units, fiche: v.fiche, par: S.state.who });
      S.member(v.who).treatments.push({ id: A.uid('m'), d: S.day(), min: S.minute(), med: v.med, fiche: v.fiche, effet: null });
    }
    S.state.alerts.filter(a => a.validation === vid).forEach(a => { a.lu = true; });
    S.save();
    A.emit('decision', v);
    return v;
  };

  S.markVideo = (id, vid) => {
    const m = S.member(id);
    const prev = m.videos[vid];
    m.videos[vid] = { d: S.day(), n: (prev ? prev.n : 0) + 1 };
    const res = A.gamify ? A.gamify.award(id, 'video', { vid }) : null;
    S.save();
    return res;
  };
  S.simResult = (id, key, r) => {
    const m = S.member(id);
    const prev = m.sims[key] || { runs: 0, best: null, wins: 0 };
    prev.runs += 1; prev.last = S.day();
    if (r && r.ok) prev.wins += 1;
    if (r && r.score !== undefined && (prev.best === null || r.score > prev.best)) prev.best = r.score;
    m.sims[key] = prev;
    const res = A.gamify ? A.gamify.award(id, 'simulation', { key, ok: r && r.ok }) : null;
    S.save();
    return res;
  };
  S.escapeDone = (id, scene, minutes) => {
    const m = S.member(id);
    m.escapes.push({ d: S.day(), scene, min: minutes || 0 });
    const res = A.gamify ? A.gamify.award(id, 'evasion', { scene }) : null;
    S.save();
    return res;
  };

  S.pharmaMeds = () => PH.meds;
  S.stock = medId => S.state.stocks[medId];
})(typeof self !== 'undefined' ? self : this);
