/* AURA : motivation (points, niveaux, écussons, série, objectif d'équipage).
   Pas de classement entre équipiers : on avance seul ou ensemble, jamais les uns contre les autres. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const G = A.gamify = {};

  G.GOALS = { cardio: 45, force: 45 };
  G.LEVELS = ['Rampe de lancement', 'Orbite basse', 'Station', 'Orbite lunaire', 'Point de Lagrange', 'Phobos', 'Orbite martienne', 'Olympus Mons', 'Ceinture d\'astéroïdes', 'Jupiter', 'Saturne', 'Au-delà'];
  const T = n => 120 * (n - 1) * n; // points nécessaires pour atteindre le niveau n
  G.level = xp => {
    let n = 1;
    while (n < G.LEVELS.length && xp >= T(n + 1)) n++;
    const lo = T(n), hi = T(n + 1);
    return { n, name: G.LEVELS[n - 1], next: G.LEVELS[n] || null, lo, hi, frac: A.clamp((xp - lo) / (hi - lo), 0, 1), toNext: hi - xp };
  };

  // Écussons de mission : forme, couleurs et condition
  G.PATCHES = [
    { id: 'premier-pas', nom: 'Premier pas', texte: 'Première séance enregistrée', icon: 'run', c: ['#79D8FF', '#2E5BFF'] },
    { id: 'serie-7', nom: 'Sept jours de suite', texte: 'Objectif sport atteint sept jours d\'affilée', icon: 'flame', c: ['#FFC870', '#FF7A59'] },
    { id: 'cent-km', nom: 'Cent kilomètres', texte: '100 km parcourus sur le vélo', icon: 'bike', c: ['#7BE3C6', '#1F8F8A'] },
    { id: 'marathon', nom: 'Marathon en orbite', texte: '42 km parcourus sur le tapis', icon: 'run', c: ['#B3A6FF', '#5B47D6'] },
    { id: 'force-30', nom: 'Os solides', texte: '30 séances de musculation', icon: 'dumbbell', c: ['#FFD9A0', '#C9822B'] },
    { id: 'coeur', nom: 'Gardien du cœur', texte: 'Arrêt cardiaque en apesanteur : simulation réussie', icon: 'health', c: ['#FF9E9E', '#C83A4E'] },
    { id: 'adrenaline', nom: 'Bon réflexe', texte: 'Allergie grave : simulation réussie', icon: 'sparkle', c: ['#FFE08A', '#D99A1E'] },
    { id: 'masque', nom: 'Sous le masque', texte: 'Inhalation de fumée : simulation réussie', icon: 'wind', c: ['#C9D4E8', '#5D6B8A'] },
    { id: 'echo', nom: 'Main sûre', texte: 'Calcul rénal et échographie : simulation réussie', icon: 'eye', c: ['#9FE8FF', '#1E7FB8'] },
    { id: 'serein', nom: 'Esprit serein', texte: 'Cinq séances d\'évasion', icon: 'escape', c: ['#A8F0D8', '#2C9C7A'] },
    { id: 'informe', nom: 'Bien informé', texte: 'Dix vidéos regardées', icon: 'video', c: ['#9FC4FF', '#3F63D9'] },
    { id: 'plume', nom: 'Carnet de bord', texte: 'Sept pages de journal', icon: 'journal', c: ['#F6C9FF', '#A74AC7'] },
    { id: 'rdv', nom: 'Rendez-vous tenu', texte: 'Quatre conférences médicales', icon: 'call', c: ['#C2B8FF', '#6B5BE0'] },
    { id: 'equipage', nom: 'Équipage soudé', texte: 'L\'équipage a franchi une étape du tour de la Terre', icon: 'users', c: ['#FFE3A3', '#2E5BFF'] }
  ];

  // Tour de la Terre en équipage, au départ de Dakar, vers l'est
  G.ROUTE = [
    ['Dakar', 14.72, -17.47], ['Bamako', 12.64, -8.0], ['Niamey', 13.51, 2.11], ['N\'Djamena', 12.13, 15.06], ['Khartoum', 15.5, 32.56],
    ['Mascate', 23.59, 58.41], ['Mumbai', 19.08, 72.88], ['Dacca', 23.81, 90.41], ['Hanoï', 21.03, 105.85], ['Manille', 14.6, 120.98],
    ['Guam', 13.44, 144.79], ['Honolulu', 21.31, -157.86], ['Mexico', 19.43, -99.13], ['Caracas', 10.48, -66.9], ['Praia', 14.93, -23.51], ['Dakar', 14.72, -17.47]
  ];
  function hav(a, b) {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dl = rad(b[2] - a[2]), dp = rad(b[1] - a[1]);
    const h = Math.sin(dp / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  G.route = (() => {
    let acc = 0;
    return G.ROUTE.map((p, i) => { if (i) acc += hav(G.ROUTE[i - 1], p); return { nom: p[0], km: Math.round(acc) }; });
  })();
  G.routeTotal = () => G.route[G.route.length - 1].km;
  G.teamKm = () => {
    const S = A.store;
    return Object.values(S.state.crew).reduce((a, c) => a + c.exercise.reduce((b, x) => b + (x.km || 0), 0), 0);
  };
  G.teamStage = () => {
    const km = G.teamKm();
    let i = 0;
    while (i < G.route.length - 1 && G.route[i + 1].km <= km) i++;
    const a = G.route[i], b = G.route[i + 1] || a;
    return { km, from: a, to: b, frac: b.km > a.km ? (km - a.km) / (b.km - a.km) : 1, passed: i, total: G.routeTotal() };
  };

  // Points
  const RULES = { sport: 1, mesure: 10, video: 20, journal: 10, conference: 60, simulation: 40, simulationOk: 40, evasion: 15, journee: 50 };
  G.RULES = RULES;
  G.historyXP = c => {
    let xp = 0;
    const days = {};
    c.exercise.forEach(x => { days[x.d] = (days[x.d] || 0) + x.min; });
    Object.values(days).forEach(m => { xp += Math.min(m, 120) * RULES.sport; });
    const md = new Set(c.measures.temp.map(m => m.d));
    xp += md.size * RULES.mesure;
    Object.values(c.videos).forEach(v => { xp += v.n * RULES.video; });
    xp += c.journal.length * RULES.journal + c.conferences.length * RULES.conference;
    return xp;
  };

  G.streak = c => {
    const S = A.store;
    const byDay = {};
    c.exercise.forEach(x => { byDay[x.d] = (byDay[x.d] || 0) + x.min; });
    const goal = G.GOALS.cardio + G.GOALS.force;
    let n = 0;
    let d = S.day();
    if ((byDay[d] || 0) < goal) d -= 1; // la journée en cours n'interrompt pas la série
    while (d > 0 && (byDay[d] || 0) >= goal * 0.8) { n++; d--; }
    return n;
  };

  G.dayMissions = id => {
    const S = A.store;
    const ex = S.exerciseToday(id);
    const vid = A.videos ? A.videos.daily(id) : null;
    const conf = S.confDue(id);
    const m = S.member(id);
    const sante = conf.today ? { kind: 'conference', done: m.conferences.some(c => c.d === S.day()) } : { kind: 'mesure', done: S.measuredToday(id) };
    return {
      sport: { cardio: ex.cardio, force: ex.force, done: ex.cardio >= G.GOALS.cardio && ex.force >= G.GOALS.force },
      video: { v: vid, done: vid ? !!(m.videos[vid.id] && m.videos[vid.id].d === S.day()) : true },
      sante
    };
  };

  function count(c) {
    const km = t => c.exercise.filter(x => x.type === t).reduce((a, x) => a + x.km, 0);
    return {
      seances: c.exercise.length,
      veloKm: km('velo'), tapisKm: km('tapis'),
      muscu: c.exercise.filter(x => x.type === 'muscu').length,
      videos: Object.values(c.videos).reduce((a, v) => a + v.n, 0),
      journal: c.journal.length, conf: c.conferences.length,
      escapes: c.escapes.length, streak: G.streak(c)
    };
  }
  G.recheckBadges = (c, silent) => {
    const k = count(c);
    const S = A.store;
    const got = [];
    const give = id => { if (!c.badges[id]) { c.badges[id] = S && S.state ? S.day() : 0; got.push(id); } };
    if (k.seances >= 1) give('premier-pas');
    if (k.streak >= 7) give('serie-7');
    if (k.veloKm >= 100) give('cent-km');
    if (k.tapisKm >= 42) give('marathon');
    if (k.muscu >= 30) give('force-30');
    if (k.escapes >= 5) give('serein');
    if (k.videos >= 10) give('informe');
    if (k.journal >= 7) give('plume');
    if (k.conf >= 4) give('rdv');
    const simMap = { arret: 'coeur', anaphylaxie: 'adrenaline', fumee: 'masque', calcul: 'echo' };
    Object.keys(simMap).forEach(s => { if (c.sims[s] && c.sims[s].wins > 0) give(simMap[s]); });
    if (S && S.state && G.teamStage().passed >= 1) give('equipage');
    return silent ? [] : got;
  };

  // Attribution des points après une action ; renvoie ce qu'il faut célébrer
  G.award = (id, kind, o) => {
    const S = A.store;
    const c = S.member(id);
    if (!c) return null;
    o = o || {};
    const today = S.day();
    c.missions[today] = c.missions[today] || {};
    const flags = c.missions[today];
    let pts = 0;
    if (kind === 'sport') {
      const done = flags.sportMin || 0;
      const add = Math.max(0, Math.min(o.min, 120 - done));
      flags.sportMin = done + add;
      pts = add * RULES.sport;
    } else if (kind === 'mesure') { if (!flags.mesure) { flags.mesure = true; pts = RULES.mesure; } }
    else if (kind === 'video') { const key = 'v-' + o.vid; if (!flags[key]) { flags[key] = true; pts = RULES.video; } }
    else if (kind === 'journal') { if (!flags.journal) { flags.journal = true; pts = RULES.journal; } }
    else if (kind === 'conference') pts = RULES.conference;
    else if (kind === 'simulation') pts = RULES.simulation + (o.ok ? RULES.simulationOk : 0);
    else if (kind === 'evasion') { if (!flags.evasion) { flags.evasion = true; pts = RULES.evasion; } }
    const before = G.level(c.xp);
    c.xp += pts;
    let bonus = 0;
    const dm = G.dayMissions(id);
    if (!flags.journee && dm.sport.done && dm.video.done && dm.sante.done) { flags.journee = true; bonus = RULES.journee; c.xp += bonus; }
    const after = G.level(c.xp);
    const badges = G.recheckBadges(c);
    const res = { pts: pts + bonus, bonus, levelUp: after.n > before.n ? after : null, badges: badges.map(b => G.PATCHES.find(p => p.id === b)) };
    A.emit('reward', { id, kind, res });
    return res;
  };
})(typeof self !== 'undefined' ? self : this);
