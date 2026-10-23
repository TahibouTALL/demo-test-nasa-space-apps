/* AURA : application.
   Navigation selon le profil (équipage, médecin de bord, médecin au sol),
   actions, étage IA en continu, voix, démonstration guidée, sauvegarde
   locale et fonctionnement hors connexion. */
(function (root) {
  'use strict';
  const D = root.AURA_DATA, E = root.AURA_ENGINE, S = root.AURA_STORE, UI = root.AURA_UI, V = root.AURA_VIEWS, KB = root.AURA_KB, AI = root.AURA_AI, R = root.AURA_RELAX;
  const H = V.H;
  const f = E.fmt, esc = UI.esc, DAY = 1440;
  const SET_KEY = 'aura.reglages';

  const cards = KB.cards.concat(KB.medCards(D));
  const A = {
    s: null, D, E, S, UI, KB, AI, cards, idx: E.buildIndex(cards),
    route: { path: [], q: {} }, routeKey: null, ui: {}, flow: {}, busy: {},
    plan: { mode: 'avant', scenario: 'median', runs: 5000, result: null, med: null },
    set: null, ai: null,
    speech: { canSpeak: false, canListen: false, listening: null, speaking: null },
    donki: { status: 'idle', list: [], t: 0, error: null },
    runtime: null, runtime2: null, ctrl: null, rec: null, pendingAsk: null
  };
  root.AURA_APP = A;
  const $ = id => document.getElementById(id);

  A.cardById = id => cards.find(c => c.id === id) || null;
  A.aiReady = () => AI.ready(A.ai);
  A.aiLabel = () => AI.label(A.ai);
  A.chatKey = () => A.s.role === 'crew' ? 'crew:' + A.s.me : A.s.role;

  /* ------------------------------------------------------------------ */
  /* Contexte de mission pour les fiches et pour l’IA                     */
  /* ------------------------------------------------------------------ */
  A.cardContext = function (card) {
    const s = A.s, me = s.role === 'crew' ? s.me : null, d = Math.floor(s.now / DAY);
    const ctx = card.context || '';
    if (ctx.indexOf('med:') === 0) {
      const id = ctx.slice(4), m = S.medById[id];
      if (!m) return '';
      const u = S.validatedUnits(s, id);
      return 'Stock à bord : ' + f.num(s.stock[id], s.stock[id] % 1 ? 1 : 0) + ' ' + m.units + 's. Dose validée par la médecin de bord : ' + H.unitsTxt(u, m) + ' par prise' + (s.factor[id].f !== 1 ? ' (facteur ' + f.num(s.factor[id].f, 2) + ')' : '') + '.';
    }
    switch (ctx) {
      case 'temp': {
        if (!me) return '';
        const m = S.lastMeasurement(s, me, 'temp');
        if (!m) return '';
        const ex = S.explain(s, m);
        return 'Votre dernière température : ' + f.unit(m.v, D.metrics.temp) + ' (' + f.when(m.t) + '). Votre plage en ce moment : ' + H.range(D.metrics.temp, ex.ev.band) + '. Sur Terre, on dirait : ' + ex.ev.terrestrial.label + '.';
      }
      case 'co2': { const v = S.co2At(s, s.now); return 'CO₂ de la cabine : ' + f.num(v, 1) + ' mmHg, ' + (v > 3 ? 'au-dessus' : 'en dessous') + ' de la limite de 3 mmHg.'; }
      case 'sleep': { if (!me) return ''; const an = E.analyzeWellbeing(s.wb.filter(w => w.a === me), d); return an.sleep7 !== null ? 'Votre sommeil moyen cette semaine : ' + f.hours(an.sleep7) + ' par nuit.' : ''; }
      case 'radiation': return 'Dose reçue depuis le départ : ' + f.num(S.radTotalNow(s), 0) + ' mSv. Débit actuel : ' + f.num(S.doseRateAt(s, s.now), 2) + ' mSv par jour.';
      case 'link': return 'Délai radio : ' + f.dur(Math.round(E.lightMinutes(D.mission, s.now / DAY))) + ' dans chaque sens. Liaison ' + (E.isBlackout(D.mission, s.now / DAY) ? 'coupée (conjonction solaire)' : 'établie') + '.';
      case 'pharmacy': { const n = D.meds.reduce((x, m) => x + E.medFlags(m, s.stock[m.id], d, D.mission).filter(fl => fl.level !== 'info').length, 0); return n ? n + ' point(s) de vigilance dans la pharmacie de bord.' : 'Aucun point de vigilance dans la pharmacie de bord.'; }
      case 'transition': { let last = null; D.mission.gravityTransitions.forEach(x => { if (x <= d) last = x; }); return last === null ? '' : 'Dernier changement de gravité : ' + f.day(last) + ', il y a ' + (d - last) + ' jours.'; }
      default: return '';
    }
  };
  function boardContext() {
    const s = A.s, day = s.now / DAY, L = [];
    const ph = E.phaseAt(D.mission, day);
    L.push('Moment : ' + f.when(s.now) + ', ' + ph.label.toLowerCase() + (ph.gravity ? ' (gravité ' + f.num(ph.gravity, 2) + ' g)' : ' (apesanteur)') + '. Délai radio : ' + (E.isBlackout(D.mission, day) ? 'liaison coupée.' : f.dur(Math.round(E.lightMinutes(D.mission, day))) + ' dans chaque sens.'));
    L.push('CO₂ cabine : ' + f.num(S.co2At(s, s.now), 1) + ' mmHg (limite 3). Dose reçue : ' + f.num(S.radTotalNow(s), 0) + ' mSv.');
    const who = s.role === 'crew' ? [s.me] : D.crew.map(c => c.id);
    who.forEach(id => {
      const c = S.crewById[id];
      const parts = ['temp', 'hr', 'spo2'].map(k => { const m = S.lastMeasurement(s, id, k); if (!m) return null; const ex = S.explain(s, m); return D.metrics[k].short + ' ' + f.unit(m.v, D.metrics[k]) + ' (' + (m.lv === 'normal' ? 'dans sa plage habituelle' : m.lv === 'vigilance' ? 'un peu hors de sa plage' : 'alerte') + ', plage ' + H.range(D.metrics[k], ex.ev.band) + ', sur Terre : ' + ex.ev.terrestrial.label + ')'; }).filter(Boolean);
      const wb = S.wellbeingState(s, id);
      L.push((s.role === 'crew' ? 'Personne qui pose la question : ' : 'Membre d’équipage : ') + c.name + ', ' + c.role.toLowerCase() + '. Dernières mesures : ' + parts.join(' ; ') + '. Sommeil moyen 7 jours : ' + f.hours(wb.an.sleep7) + '.' + (wb.flags.length ? ' À noter : ' + wb.flags.map(x => x.doctor).join(' ') : ''));
      const tasks = S.upcomingTasks(s, id, 36);
      if (tasks.length) L.push('Tâches à venir : ' + tasks.map(t => t.label + ' ' + t.when).join(' ; ') + '.');
    });
    const al = s.alerts.filter(a => a.st !== 'close' && (s.role !== 'crew' || !a.a || a.a === s.me));
    if (al.length) L.push('Alertes ouvertes : ' + al.map(a => a.title).join(' ; ') + '.');
    return L.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* Réglages (navigateur)                                                */
  /* ------------------------------------------------------------------ */
  function loadSettings() {
    const def = { level: {}, text: 'normal', theme: 'auto', voice: { read: false }, donkiKey: '', welcomed: false };
    try {
      const raw = localStorage.getItem(SET_KEY);
      const o = raw ? JSON.parse(raw) : {};
      if (!raw) { const old = localStorage.getItem('aura.theme'); if (old) o.theme = old; }
      return Object.assign(def, o, { voice: Object.assign({ read: false }, o.voice || {}), level: Object.assign({}, o.level || {}) });
    } catch (e) { return def; }
  }
  function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(A.set)); } catch (e) { /* rien */ } }
  function applyDisplay() {
    const el = document.documentElement;
    if (A.set.theme === 'light' || A.set.theme === 'dark') el.setAttribute('data-theme', A.set.theme); else el.removeAttribute('data-theme');
    if (A.set.text === 'large') el.setAttribute('data-text', 'large'); else el.removeAttribute('data-text');
  }

  /* ------------------------------------------------------------------ */
  /* Sauvegarde                                                          */
  /* ------------------------------------------------------------------ */
  function persist() {
    if (!S.save(A.s) && !A.warned) { A.warned = true; toast('Sauvegarde locale indisponible dans ce navigateur : les changements seront perdus au rechargement.'); }
  }

  /* ------------------------------------------------------------------ */
  /* Navigation par profil                                                */
  /* ------------------------------------------------------------------ */
  const NAV = {
    crew: [['', 'Aujourd’hui'], ['mesurer', 'Mesurer'], ['bien-etre', 'Bien-être'], ['assistant', 'Assistant'], ['conference', 'Entretien de la semaine'], null, ['dossier', 'Mon dossier'], ['liaison', 'Liaison Terre'], ['mission', 'Mission et cabine']],
    doctor: [['', 'Équipage'], ['alertes', 'Alertes'], ['conference', 'Conférence'], ['pharmacie', 'Pharmacie'], ['planification', 'Planification'], ['bien-etre', 'Bien-être'], null, ['assistant', 'Assistant'], ['liaison', 'Liaison Terre'], ['mission', 'Mission et cabine']],
    ground: [['', 'Reçu du vaisseau'], ['equipage', 'Équipage vu du sol'], ['liaison', 'Écrire au vaisseau'], null, ['mission', 'Mission']]
  };
  const TABS = {
    crew: [['', 'Aujourd’hui'], ['mesurer', 'Mesurer'], ['assistant', 'Assistant'], ['bien-etre', 'Bien-être']],
    doctor: [['', 'Équipage'], ['alertes', 'Alertes'], ['conference', 'Conférence'], ['pharmacie', 'Pharmacie']],
    ground: [['', 'Reçu'], ['equipage', 'Équipage'], ['liaison', 'Écrire'], ['mission', 'Mission']]
  };
  function mesurer(A) { const k = A.route.path[1]; return k === 'symptome' ? V.symptom(A) : D.metrics[k] ? V.measure(A, k) : V.measureHome(A); }
  function bienEtre(A) { const k = A.route.path[1]; return k === 'respiration' ? V.breathing(A) : k === 'paysage' ? V.landscape(A) : k === 'reaction' && H.crew(A) ? V.reaction(A) : V.wellbeing(A); }
  const COMMON = { 'reglages': V.settings, 'a-propos': V.about, 'bienvenue': V.welcome };
  const BOARD = Object.assign({}, COMMON, {
    'mesurer': mesurer, 'bien-etre': bienEtre, 'assistant': V.assistant, 'dossier': a => V.dossier(a, a.route.path[1]), 'liaison': V.link, 'mission': V.mission,
    'urgence': V.emergency, 'alertes': V.alerts, 'pharmacie': V.pharmacy, 'planification': V.planning
  });
  const ROUTES = {
    crew: Object.assign({}, BOARD, { '': V.today, 'conference': V.conferenceCrew }),
    doctor: Object.assign({}, BOARD, { '': V.crewOverview, 'conference': V.conferenceDoctor }),
    ground: Object.assign({}, COMMON, { '': V.groundHome, 'equipage': V.groundCrew, 'liaison': V.link, 'mission': V.mission })
  };
  function view(A) {
    const key = A.route.path[0] || '';
    const r = ROUTES[A.s.role] || ROUTES.crew;
    if (r[key]) return r[key](A);
    if (A.s.role === 'ground') return H.page({ title: 'Cette page est à bord', calm: true, lead: 'Le médecin au sol voit seulement ce qui est arrivé sur Terre.', body: '<div class="btn-row" style="margin-top:16px"><a class="btn primary" href="#/">Reçu du vaisseau</a><a class="btn" href="#/bienvenue">Changer de profil</a></div>' });
    return H.page({ title: 'Page introuvable', calm: true, lead: 'Cette page n’existe pas, ou plus.', body: '<p><a href="#/">Revenir à l’accueil</a></p>' });
  }

  /* ------------------------------------------------------------------ */
  /* Coquille                                                            */
  /* ------------------------------------------------------------------ */
  function counts() {
    const s = A.s, role = s.role;
    const open = s.alerts.filter(a => a.st !== 'close' && (role !== 'crew' || !a.a || a.a === s.me));
    const fu = S.pendingFollowUps(s).filter(ad => role !== 'crew' || ad.a === s.me).length;
    const unread = role === 'ground' ? S.groundItems(s).filter(it => !s.ground.read[it.id] && it.kind !== 'donnees').length : S.inboxFor(s, role === 'crew' ? s.me : 'doctor').filter(m => !m.read).length;
    return {
      alertes: open.length ? [open.length, open.some(a => a.lv === 'urgence') ? 'red' : 'amber'] : null,
      pharmacie: fu ? [fu, 'amber'] : null,
      liaison: role !== 'ground' && unread ? [unread, ''] : null,
      '': role === 'ground' && unread ? [unread, 'amber'] : null
    };
  }
  function profileName() {
    const s = A.s;
    if (s.role === 'doctor') return ['Médecin de bord', 'MB', true];
    if (s.role === 'ground') return ['Médecin au sol', 'MS', true];
    const c = S.crewById[s.me];
    return [H.first(c.name), UI.initials(c.name), false];
  }
  function renderTop() {
    const s = A.s, day = s.now / DAY;
    const L = E.lightMinutes(D.mission, day), bo = E.isBlackout(D.mission, day);
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const pn = profileName();
    let h = '<a class="brand" href="#/" aria-label="AURA, accueil"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">AURA</span></a>';
    h += '<div class="clock"><b>' + esc(f.day(day)) + ', ' + esc(f.clock(s.now % DAY)) + '</b><span class="hide-s">' + (s.role === 'ground' ? 'heure de la mission' : 'heure de bord') + '</span></div>';
    h += '<div class="top-right">';
    h += '<a class="chip-status" href="#/liaison" title="Liaison avec la Terre"><span class="dot' + (bo ? ' off' : '') + '"></span>' + (bo ? 'Liaison coupée' : '<span class="hide-s">' + (s.role === 'ground' ? 'Vaisseau' : 'Terre') + ' : </span>' + esc(f.dur(Math.round(L)))) + '</a>';
    if (offline) h += '<span class="chip-status" title="AURA fonctionne sans connexion"><span class="dot"></span><span class="hide-s">Hors connexion, </span>tout fonctionne</span>';
    h += '<a class="chip-status hide-s" href="#/reglages" title="Intelligence artificielle"><span class="dot' + (A.aiReady() ? ' ai' : '') + '" style="' + (A.aiReady() ? '' : 'background:var(--ink-3)') + '"></span>' + esc(A.aiReady() ? 'IA : ' + A.aiLabel() : 'Sans IA') + '</a>';
    if (s.role !== 'ground') h += '<a class="chip-status" href="#/urgence" style="color:var(--red-ink);border-color:color-mix(in srgb, var(--red) 40%, var(--line))">Urgence</a>';
    h += '<button class="profile-btn" data-act="menu" aria-haspopup="menu" aria-expanded="' + !!A.ui.menu + '" aria-label="Profil et réglages">' + UI.avatar(pn[0], { text: pn[1], doc: pn[2] }) + '<span class="p-name">' + esc(pn[0]) + '</span></button>';
    h += '</div>';
    $('top').innerHTML = h;
  }
  function renderNav() {
    const cur = A.route.path[0] || '';
    const c = counts();
    let h = '<div class="nav">';
    (NAV[A.s.role] || NAV.crew).forEach(it => {
      if (!it) { h += '<div class="sep"></div>'; return; }
      const n = c[it[0]];
      h += '<a href="#/' + it[0] + '"' + (cur === it[0] ? ' aria-current="page"' : '') + '><span>' + esc(it[1]) + '</span>' + (n ? '<span class="count ' + n[1] + '">' + n[0] + '</span>' : '') + '</a>';
    });
    h += '</div><div class="side-foot"><button class="demo-launch" data-act="demo-open"><span><b>Démonstration</b><small>Avancer le temps, scénarios, profils</small></span></button></div>';
    $('nav').innerHTML = h;
  }
  function renderTabbar() {
    const cur = A.route.path[0] || '';
    const c = counts();
    let h = '';
    (TABS[A.s.role] || TABS.crew).forEach(it => {
      const n = c[it[0]];
      h += '<a href="#/' + it[0] + '"' + (cur === it[0] ? ' aria-current="page"' : '') + '><span class="t-dot"></span><span class="' + (n ? 't-badge' : '') + '">' + esc(it[1]) + '</span></a>';
    });
    const inTabs = (TABS[A.s.role] || []).some(x => x[0] === cur);
    h += '<button data-act="more"' + (!inTabs ? ' aria-current="page"' : '') + '><span class="t-dot"></span><span>Plus</span></button>';
    $('tabbar').innerHTML = h;
  }
  function renderUrgency() {
    const em = A.s.emergency, slot = $('urgency');
    if (!em || A.s.role === 'ground' || A.route.path[0] === 'urgence') { slot.hidden = true; slot.innerHTML = ''; return; }
    const done = em.steps.filter(x => x.done).length, next = em.steps.find(x => !x.done);
    slot.hidden = false;
    slot.className = 'urgency' + (em.over ? ' over' : '');
    slot.innerHTML = '<div class="urgency-in" role="alert"><strong>' + (em.over ? 'Fin de l’événement : ' : 'Mode urgence : ') + esc(em.title) + '</strong><span>' + (next ? 'Étape ' + (done + 1) + ' sur ' + em.steps.length + ' : ' + esc(next.label) : 'Toutes les étapes sont faites') + '</span><a class="btn sm" href="#/urgence">Ouvrir la procédure</a></div>';
  }
  function demoBar() {
    const s = A.s, id = s.scenario;
    if (!id) return '';
    const i = D.scenarios.findIndex(x => x.id === id);
    if (i < 0) return '';
    const sc = D.scenarios[i], st = sc.steps[s.step] || sc.steps[0];
    const more = s.step < sc.steps.length - 1;
    return '<div class="demo-bar" role="region" aria-label="Démonstration guidée"><p><b>Scénario ' + (i + 1) + ' sur ' + D.scenarios.length + ' : ' + esc(sc.title) + (sc.steps.length > 1 ? ', étape ' + (s.step + 1) + ' sur ' + sc.steps.length : '') + '.</b> ' + esc(st.look) + '</p><div class="btn-row">' +
      (more ? '<button class="btn sm primary" data-act="demo-next">Étape suivante</button>' : i < D.scenarios.length - 1 ? '<button class="btn sm primary" data-act="scenario" data-id="' + D.scenarios[i + 1].id + '">Scénario suivant</button>' : '<button class="btn sm primary" data-act="demo-open">Revoir la liste</button>') +
      '<button class="btn sm" data-act="demo-exit">Quitter</button></div></div>';
  }
  function renderMain(opts) {
    opts = opts || {};
    unmountRuntime();
    UI.resetCharts(); UI.tipHide();
    const main = $('main');
    let html;
    try { html = view(A); }
    catch (err) {
      console.error(err);
      html = '<div class="page calm"><h1 id="page-title" tabindex="-1" class="page-title">Cette page n’a pas pu s’afficher</h1><p class="lead">Une erreur est survenue. Les autres pages restent utilisables.</p><p><a href="#/">Revenir à l’accueil</a></p></div>';
    }
    const y = window.scrollY;
    document.body.classList.toggle('is-welcome', A.route.path[0] === 'bienvenue');
    main.innerHTML = html + demoBar();
    UI.mount(main);
    const db = main.querySelector('.demo-bar');
    document.body.classList.toggle('has-demo', !!db);
    if (db) document.documentElement.style.setProperty('--demo-h', db.offsetHeight + 'px');
    const h1 = $('page-title');
    document.title = (h1 ? h1.textContent : 'AURA') + ' : AURA';
    if (opts.scrollTop) { window.scrollTo(0, 0); if (h1 && opts.focus !== false) h1.focus({ preventScroll: true }); }
    else if (opts.keep !== false) window.scrollTo(0, y);
    afterRender();
  }
  function render(opts) { renderTop(); renderNav(); renderTabbar(); renderUrgency(); renderMain(opts); if (A.ui.menu) renderMenu(); }
  function refreshChrome() { renderTop(); renderNav(); renderTabbar(); renderUrgency(); }

  function afterRender() {
    const key = A.route.path.join('/');
    mountRuntime();
    if (A.route.path[0] === 'liaison' && A.s.role !== 'ground') {
      let changed = false;
      S.inboxFor(A.s, A.s.role === 'crew' ? A.s.me : 'doctor').forEach(m => { if (!m.read) { m.read = true; changed = true; } });
      if (changed) { persist(); setTimeout(refreshChrome, 0); }
      packNote();
    }
    if (A.route.path[0] === 'mission' && A.donki.status === 'idle') fetchDonki(false);
    if (key === 'assistant' || key === 'conference') {
      const chat = $('chat') || $('itv-chat');
      if (chat && (A.busy.ask || A.flow.scrollChat)) { A.flow.scrollChat = false; const last = chat.lastElementChild; if (last) last.scrollIntoView({ block: 'nearest' }); }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Menus et tiroirs                                                     */
  /* ------------------------------------------------------------------ */
  function renderMenu() {
    let m = $('menu');
    if (!A.ui.menu) { if (m) m.remove(); return; }
    if (!m) { m = document.createElement('div'); m.id = 'menu'; m.className = 'menu'; m.setAttribute('role', 'menu'); document.body.appendChild(m); }
    const s = A.s;
    const who = s.role === 'crew' ? S.name(s.me) + ', ' + S.crewById[s.me].role.toLowerCase() : s.role === 'doctor' ? 'Médecin de bord, Keiko Tanaka' : 'Médecin au sol, sur Terre';
    m.innerHTML = '<div class="menu-head">' + esc(who) + '</div><a role="menuitem" href="#/bienvenue">Changer de profil</a><a role="menuitem" href="#/reglages">Réglages</a><button role="menuitem" data-act="demo-open">Démonstration</button><a role="menuitem" href="#/a-propos">À propos d’AURA</a>';
  }
  function closeMenu() { if (A.ui.menu) { A.ui.menu = false; renderMenu(); const b = document.querySelector('.profile-btn'); if (b) b.setAttribute('aria-expanded', 'false'); } }
  function openSheet(kind) {
    closeMenu();
    closeSheet();
    const sc = document.createElement('div'); sc.className = 'scrim'; sc.id = 'scrim'; sc.setAttribute('data-act', 'sheet-close');
    const sh = document.createElement('div'); sh.className = 'sheet'; sh.id = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
    sh.dataset.kind = kind;
    document.body.appendChild(sc); document.body.appendChild(sh);
    renderSheet();
    sh.tabIndex = -1; sh.focus({ preventScroll: true });
  }
  function closeSheet() { const a = $('sheet'), b = $('scrim'); if (a) a.remove(); if (b) b.remove(); }
  function renderSheet() {
    const sh = $('sheet');
    if (!sh) return;
    const s = A.s, kind = sh.dataset.kind;
    let h = '';
    if (kind === 'more') {
      const tabs = (TABS[s.role] || []).map(x => x[0]);
      h += '<div class="sheet-head"><h2>Plus</h2><button class="btn sm quiet" data-act="sheet-close">Fermer</button></div><div class="nav">';
      (NAV[s.role] || []).filter(it => it && tabs.indexOf(it[0]) < 0).forEach(it => { h += '<a href="#/' + it[0] + '" data-act="sheet-close-nav">' + esc(it[1]) + '</a>'; });
      if (s.role !== 'ground') h += '<a href="#/urgence" data-act="sheet-close-nav" style="color:var(--red-ink)">Urgence</a>';
      h += '<div class="sep"></div><a href="#/reglages" data-act="sheet-close-nav">Réglages</a><a href="#/bienvenue" data-act="sheet-close-nav">Changer de profil</a><a href="#/a-propos" data-act="sheet-close-nav">À propos d’AURA</a></div>';
      h += '<button class="demo-launch" style="margin-top:16px" data-act="demo-open"><span><b>Démonstration</b><small>Avancer le temps, scénarios, profils</small></span></button>';
    } else {
      h += '<div class="sheet-head"><h2>Démonstration</h2><button class="btn sm quiet" data-act="sheet-close">Fermer</button></div>';
      h += '<p class="note" style="margin-top:0">Ces commandes servent à présenter AURA. Dans une vraie mission, le temps avance tout seul et chaque personne a son propre accès.</p>';
      h += '<h3>Heure de bord</h3><div class="sheet-clock">' + esc(f.when(s.now)) + '</div><div class="btn-row" style="margin-top:10px">' + [[15, '+15 min'], [60, '+1 h'], [360, '+6 h'], [1440, '+1 jour']].map(x => '<button class="btn sm" data-act="advance" data-min="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
      h += '<h3>Scénarios guidés</h3><ol class="scn-list">' + D.scenarios.map(sc => '<li><button data-act="scenario" data-id="' + sc.id + '"' + (s.scenario === sc.id ? ' aria-current="true"' : '') + '><span><b>' + esc(sc.title) + '</b><span>' + esc(sc.features) + (sc.steps.length > 1 ? ', ' + sc.steps.length + ' étapes' : '') + '</span></span></button></li>').join('') + '</ol>';
      h += '<h3>Profil</h3><div class="choices">' + D.crew.map(c => '<button class="chip" data-act="profile" data-role="crew" data-me="' + c.id + '"' + (s.role === 'crew' && s.me === c.id ? ' style="border-color:var(--aura);color:var(--aura-ink)"' : '') + '>' + esc(H.first(c.name)) + '</button>').join('') + '<button class="chip" data-act="profile" data-role="doctor" data-me="a3"' + (s.role === 'doctor' ? ' style="border-color:var(--aura);color:var(--aura-ink)"' : '') + '>Médecin de bord</button><button class="chip" data-act="profile" data-role="ground"' + (s.role === 'ground' ? ' style="border-color:var(--aura);color:var(--aura-ink)"' : '') + '>Médecin au sol</button></div>';
      h += '<h3>Simulation</h3><div class="toggles"><label class="toggle"><input type="checkbox" data-change="sensors"' + (s.sim.sensors ? ' checked' : '') + '><span>Capteurs simulés : mesures automatiques chaque matin</span></label></div>';
      h += '<form data-form="goto-day" class="btn-row" style="align-items:flex-end;margin-top:12px"><div class="field" style="margin:0"><label for="gd">Recommencer la mission au jour</label><input id="gd" name="day" type="number" min="1" max="' + (D.mission.durationDays - 1) + '" value="' + Math.floor(s.now / DAY) + '" style="width:120px"></div><button class="btn sm" type="submit">Recommencer</button></form>';
      h += '<div class="btn-row" style="margin-top:16px"><button class="btn sm" data-act="reset">' + (A.ui.confirmReset ? 'Toucher encore pour confirmer' : 'Réinitialiser la démonstration') + '</button></div>';
    }
    sh.innerHTML = h;
  }

  /* ------------------------------------------------------------------ */
  /* Routage                                                              */
  /* ------------------------------------------------------------------ */
  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('?');
    const path = parts[0].split('/').filter(Boolean).map(decodeURIComponent);
    const q = {};
    if (parts[1]) parts[1].split('&').forEach(kv => {
      const i = kv.indexOf('=');
      const k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
      if (k) q[k] = decodeURIComponent((i < 0 ? '' : kv.slice(i + 1)).replace(/\+/g, ' '));
    });
    return { path, q };
  }
  function redirect(r) {
    const p = r.path, role = A.s.role;
    if (p[0] === 'saisie') return r.q.type === 'symptome' ? '#/mesurer/symptome' : '#/mesurer';
    if (p[0] === 'questions') { if (r.q.q) A.flow.askDraft = r.q.q; return r.q.fiche ? '#/assistant?fiche=' + r.q.fiche : '#/assistant'; }
    if (p[0] === 'habitat') return '#/mission';
    if (p[0] === 'demo') { setTimeout(() => openSheet('demo'), 30); return '#/'; }
    if (p[0] === 'equipage' && role !== 'ground') return p[1] ? '#/dossier/' + p[1] : '#/';
    return null;
  }
  function onRoute() {
    let r = parseHash();
    if (!location.hash && !A.set.welcomed) { location.replace('#/bienvenue'); return; }
    const red = redirect(r);
    if (red) { location.replace(red); return; }
    const prev = A.routeKey;
    A.route = r;
    const key = r.path.join('/') + '?' + Object.keys(r.q).filter(k => k !== 'msg').join('&');
    const changed = key !== prev;
    A.routeKey = key;
    if (changed) A.ui = { flip: {}, open: {} };
    closeMenu(); closeSheet();
    stopListening();
    render({ scrollTop: changed });
    if (A.pendingAsk && r.path[0] === 'assistant') { const q = A.pendingAsk; A.pendingAsk = null; setTimeout(() => ask(q), 350); }
  }
  function go(hash) { if (location.hash === hash) onRoute(); else location.hash = hash; }

  /* ------------------------------------------------------------------ */
  /* Messages courts                                                      */
  /* ------------------------------------------------------------------ */
  function toast(text, level) {
    const box = $('toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'toast' + (level === 'urgence' ? ' urgent' : '');
    t.textContent = text;
    box.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 4800);
    while (box.children.length > 3) box.removeChild(box.firstChild);
  }
  function toastEvents(list) {
    if (!list || !list.length) return;
    const urgent = list.filter(e => e.kind === 'urgence');
    const rest = list.filter(e => e.kind !== 'urgence');
    urgent.slice(0, 1).forEach(e => toast(e.text, 'urgence'));
    const byKind = {};
    rest.forEach(e => { (byKind[e.kind] = byKind[e.kind] || []).push(e); });
    Object.keys(byKind).slice(0, 3).forEach(k => {
      const arr = byKind[k];
      toast(arr.length > 1 && k === 'mesures' ? arr.length + ' matinées de mesures traitées. ' + arr[arr.length - 1].text : arr[arr.length - 1].text);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Temps, mesures, symptômes, planification                             */
  /* ------------------------------------------------------------------ */
  function advance(minutes) {
    const s = A.s;
    const beforeIn = s.inbox.filter(m => m.status === 'reçu').length;
    const beforeGround = S.groundItems(s).length;
    const ev = S.advanceTo(s, s.now + minutes);
    const afterIn = s.inbox.filter(m => m.status === 'reçu').length;
    if (afterIn > beforeIn && s.role !== 'ground') ev.push({ kind: 'liaison', text: UI.plural(afterIn - beforeIn, 'message') + ' reçu' + (afterIn - beforeIn > 1 ? 's' : '') + ' de la Terre.' });
    const afterGround = S.groundItems(s).length;
    if (s.role === 'ground' && afterGround > beforeGround) ev.push({ kind: 'liaison', text: UI.plural(afterGround - beforeGround, 'information') + ' arrivée' + (afterGround - beforeGround > 1 ? 's' : '') + ' du vaisseau.' });
    persist(); render();
    renderSheet();
    if (!ev.length) toast('Heure de bord : ' + f.when(s.now) + '.');
    toastEvents(ev);
  }
  function advanceTo(t) { if (t > A.s.now) advance(t - A.s.now); }

  function doMeasure() {
    const fm = A.flow.m;
    const ctx = {};
    Object.keys(fm.ctx || {}).forEach(k => { if (fm.ctx[k]) ctx[k] = true; });
    const raw = String(fm.v === null || fm.v === undefined ? '' : fm.v).trim().replace(',', '.');
    const v = raw === '' ? null : Number(raw);
    const res = S.addMeasurement(A.s, { a: fm.a, k: fm.k, v, ctx, src: 'saisie', retakeOf: fm.retakeOf || null });
    fm.result = {
      status: res.status, a: fm.a, k: fm.k, v, id: res.record.id, rec: res.record,
      fresh: res.ev ? { ev: res.ev, layers: res.layers, text: res.text, action: res.action } : null,
      alertTitle: res.alert ? res.alert.title : null,
      emergency: !!(A.s.emergency && A.s.emergency.t === A.s.now && A.s.emergency.kind === 'vital')
    };
    fm.retakeOf = null;
    persist();
    if (res.status === 'processed' && res.ev) {
      const lv = res.ev.level;
      toast(lv === 'normal' ? 'Mesure enregistrée : dans votre zone.' : lv === 'vigilance' ? 'Mesure enregistrée : un peu en dehors de la zone.' : 'Mesure enregistrée : alerte.', lv === 'urgence' ? 'urgence' : null);
    }
  }
  function doSymptom() {
    const fy = A.flow.sy;
    const res = S.reportSymptom(A.s, { a: fy.a, sym: fy.sym, intensity: +fy.intensity || 0, note: fy.note || '' });
    fy.result = { t: res.record.t, analysis: res.analysis, alertTitle: res.alert ? res.alert.title : null };
    persist();
  }
  function runPlan() {
    const p = A.plan, s = A.s;
    const start = p.mode === 'avant' ? 0 : Math.floor(s.now / DAY);
    const stock = {};
    D.meds.forEach(m => { stock[m.id] = p.mode === 'avant' ? m.stock : s.stock[m.id]; });
    const t0 = performance.now();
    const out = E.simulateMission({
      conditions: D.conditions, meds: D.meds, crewSize: D.crew.length, startDay: start, endDay: D.mission.durationDays,
      transitions: D.mission.gravityTransitions, multiplier: D.planningScenarios[p.scenario].multiplier, runs: p.runs, seed: 7 + p.runs, stock
    });
    p.result = { rows: out.meds, lost: out.lost, ms: performance.now() - t0, runs: p.runs, scenario: p.scenario, mode: p.mode, start };
    const worst = out.meds.slice().sort((a, b) => b.pStockout - a.pStockout)[0];
    if (!p.med || !out.meds.find(r => r.med === p.med)) p.med = worst.med;
  }

  /* ------------------------------------------------------------------ */
  /* Démonstration guidée                                                 */
  /* ------------------------------------------------------------------ */
  function resetFlows() { A.flow = {}; A.ui = { flip: {}, open: {} }; A.busy = {}; if (A.ctrl) { try { A.ctrl.abort(); } catch (e) { /* rien */ } A.ctrl = null; } }
  function runScenario(id) {
    const r = S.runScenario(id);
    A.s = r.state;
    resetFlows();
    const sc = D.scenarios.find(x => x.id === id);
    if (r.extra.planning) { A.plan = { mode: r.extra.planning.mode, scenario: r.extra.planning.scenario, runs: 5000, result: null, med: 'zolpidem' }; runPlan(); A.plan.med = 'zolpidem'; }
    if (r.extra.measure) { A.flow.m = { a: r.extra.measure.a, k: r.extra.measure.k, v: String(r.extra.measure.v), ctx: {}, retakeOf: null, result: null }; doMeasure(); }
    if (r.extra.symptom) { A.flow.sy = { a: r.extra.symptom.a, sym: r.extra.symptom.sym, intensity: r.extra.symptom.intensity, note: '', result: null }; doSymptom(); }
    if (r.extra.assistant) A.pendingAsk = r.extra.assistant.text;
    A.set.welcomed = true; saveSettings();
    persist();
    closeSheet();
    A.routeKey = null;
    go(sc.steps[0].route);
  }
  function demoNext() {
    const s = A.s;
    const sc = D.scenarios.find(x => x.id === s.scenario);
    if (!sc) return;
    const i = s.step + 1;
    if (i >= sc.steps.length) {
      const k = D.scenarios.indexOf(sc);
      if (k < D.scenarios.length - 1) runScenario(D.scenarios[k + 1].id);
      return;
    }
    const st = sc.steps[i];
    s.step = i; s.role = st.role; if (st.me) s.me = st.me;
    resetFlows();
    let ev = [];
    if (st.advance) ev = S.advanceTo(s, s.now + st.advance);
    persist();
    A.routeKey = null;
    go(st.route);
    toastEvents(ev);
  }

  /* ------------------------------------------------------------------ */
  /* Étage IA                                                             */
  /* ------------------------------------------------------------------ */
  function live(id, html) { const el = $(id); if (el) el.innerHTML = html; }
  function throttled(fn) {
    let pending = null, scheduled = false;
    return v => { pending = v; if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; fn(pending); }); };
  }
  async function streamText(prompt, onText) {
    if (A.ctrl) { try { A.ctrl.abort(); } catch (e) { /* rien */ } }
    const ctrl = new AbortController();
    A.ctrl = ctrl;
    const up = throttled(onText);
    try {
      const r = await AI.stream(A.ai, { system: prompt.system, messages: prompt.messages, maxTokens: prompt.maxTokens, signal: ctrl.signal, onText: t => up(t) });
      onText(r.text);
      return r;
    } finally { if (A.ctrl === ctrl) A.ctrl = null; }
  }
  function aiStop() { if (A.ctrl) { try { A.ctrl.abort(); } catch (e) { /* rien */ } } }
  function logAI(what) { const s = A.s; s.journal.unshift({ t: s.now, type: 'ia', text: what + ' (IA : ' + A.aiLabel() + ').', a: s.role === 'crew' ? s.me : null }); }

  function extractive(ids) {
    const top = A.cardById(ids[0]);
    let text = top.text + ' [1]';
    const ctx = A.cardContext(top);
    if (ctx) text += '\n\nDans la mission en ce moment : ' + ctx;
    if (ids.length > 1) text += '\n\nVoir aussi : ' + ids.slice(1).map((id, i) => '« ' + A.cardById(id).title + ' » [' + (i + 2) + ']').join(', ') + '.';
    return text;
  }

  async function ask(q) {
    const s = A.s, key = A.chatKey();
    q = String(q || '').trim();
    if (!q || A.busy.ask) return;
    A.flow.askDraft = '';
    const level = A.flow.askLevel || (H.medical(A) ? 'medical' : 'simple');
    const history = (s.chats[key] || []).filter(m => m.mode !== 'alarm').slice(-6);
    S.chatAdd(s, key, { role: 'user', text: q });
    A.flow.scrollChat = true;
    // 1. Les signes d’alarme passent avant tout
    const names = D.crew.map(c => H.first(c.name));
    const flags = E.detectRedFlags(q, D.redFlags, { names });
    const strong = flags.find(x => x.self);
    const named = D.crew.find(c => E.normalize(q).split(' ').indexOf(E.normalize(H.first(c.name))) >= 0);
    const who = named ? named.id : s.role === 'crew' ? s.me : null;
    if (strong && who && s.role !== 'ground') {
      S.reportRedFlag(s, { a: who, flag: strong.id, text: q, src: 'assistant' });
      S.chatAdd(s, key, { role: 'ai', mode: 'alarm', flag: strong.id, text: 'Alerte envoyée à la médecin de bord à ' + f.clock(s.now % DAY) + '. Un message prioritaire passe en tête de la file vers la Terre. Vos autres mesures ne changent rien : ce signe passe avant tout calcul.' });
      persist(); render();
      toast('Signe d’alarme : la médecin de bord est prévenue.', 'urgence');
      return;
    }
    const soft = flags.length ? flags[0].id : null;
    // 2. Fiches de bord
    const r = E.search(A.idx, q, KB.synonyms, 4);
    const best = r.results[0] ? r.results[0].score : 0;
    const ids = r.results.filter(x => x.score >= 1.2 && x.score >= best * 0.35).map(x => x.id).slice(0, 4);
    if (!ids.length) {
      S.chatAdd(s, key, { role: 'ai', mode: 'idk', text: 'Je ne trouve pas de fiche de bord qui réponde à cette question, et je préfère ne pas inventer. Vous pouvez la garder pour la conférence de la semaine, ou l’envoyer au médecin au sol.', q, soft, cards: [] });
      persist(); renderMain();
      return;
    }
    if (!A.aiReady() || (level === 'english' && !A.aiReady())) {
      S.chatAdd(s, key, { role: 'ai', mode: 'kb', text: extractive(ids), cards: ids, q, soft });
      persist(); renderMain();
      return;
    }
    // 3. Réponse rédigée par l’IA, à partir des fiches seulement
    const m = S.chatAdd(s, key, { role: 'ai', mode: 'ai', text: '', cards: ids, q, soft, model: A.aiLabel(), level });
    A.busy.ask = true; renderMain();
    const cardsCtx = ids.map(id => { const c = A.cardById(id); return { title: c.title, text: c.text, ctx: A.cardContext(c) }; });
    const prompt = AI.assistantPrompt({ level, context: boardContext(), cards: cardsCtx, history, question: q });
    try {
      await streamText(prompt, text => { m.text = AI.clean(text); live('body-' + m.id, AI.md(m.text, { cites: ids.length, prefix: m.id + '-' })); });
      logAI('Réponse de l’assistant rédigée à partir de ' + ids.length + ' fiche' + (ids.length > 1 ? 's' : ''));
    } catch (err) {
      if (!m.text) { m.mode = 'kb'; m.text = extractive(ids); m.error = err.message + ' Voici les passages des fiches de bord.'; }
      else m.error = err.message;
    } finally {
      A.busy.ask = false; persist(); renderMain();
      const ta = $('ask-q'); if (ta) ta.focus({ preventScroll: true });
    }
  }

  async function rephrase(id, mode) {
    const s = A.s, key = A.chatKey();
    const src = (s.chats[key] || []).find(x => x.id === id);
    if (!src || !A.aiReady() || A.busy.ask) return;
    const m = S.chatAdd(s, key, { role: 'ai', mode: 'ai', text: '', cards: src.cards || [], q: src.q, model: A.aiLabel() + ', ' + { simple: 'reformulé plus simplement', detail: 'avec plus de détails', english: 'in English', medical: 'en langage médical' }[mode] });
    A.busy.ask = true; A.flow.scrollChat = true; renderMain();
    try {
      await streamText(AI.rephrasePrompt({ mode, text: src.text }), text => { m.text = AI.clean(text); live('body-' + m.id, AI.md(m.text, { cites: (m.cards || []).length, prefix: m.id + '-' })); });
    } catch (err) { m.error = err.message; if (!m.text) m.text = src.text; }
    finally { A.busy.ask = false; persist(); renderMain(); }
  }

  /* Entretien de la semaine ------------------------------------------- */
  function factsText(a) {
    return V.factsList(A, a).map(x => '- ' + x).join('\n') || '- Pas de données particulières cette semaine.';
  }
  function curItv() { return S.currentInterview(A.s, A.s.me); }
  async function itvNext(itv, opts) {
    opts = opts || {};
    const s = A.s;
    const name = S.name(itv.a), first = H.first(name);
    const next = itv.step < itv.plan.length ? itv.plan[itv.step] : null;
    const closingDone = itv.answers.some(x => x.topic === 'fin');
    if (!next && closingDone) return itvFinish(itv);
    const scripted = () => {
      if (opts.followQ) return { q: opts.followQ, follow: true };
      if (!next) return { q: D.interview.closing, topic: 'fin' };
      return { q: (opts.first ? 'Bonjour ' + first + '. ' : '') + next.q, topic: next.id };
    };
    if (!A.aiReady() || !itv.ai || opts.followQ) {
      itv.current = scripted();
      persist(); renderMain(); A.flow.scrollChat = true; speakQuestion(itv);
      focusAnswer();
      return;
    }
    const last = itv.answers[itv.answers.length - 1];
    const follows = itv.answers.filter(x => x.follow).length;
    const canFollow = !!last && !last.follow && !last.skipped && follows < 3 && !(itv.followed || {})[last.topic];
    itv.current = { q: '', topic: next ? next.id : 'fin' };
    A.busy.itv = true; A.flow.itvError = null; renderMain();
    const prompt = AI.interviewTurn({ name, first: opts.first ? first : null, facts: factsText(itv.a), next, last: last ? (last.skipped ? '(question passée)' : last.text) : '', canFollow });
    try {
      let txt = '';
      await streamText(prompt, t => { txt = t; live('itv-q', '<p>' + esc(AI.parseTurn(t).text) + '</p>'); });
      const turn = AI.parseTurn(txt);
      if (!turn.text) throw new Error('Réponse vide du service d’IA.');
      if (turn.tag === 'precision' && canFollow) { itv.current = { q: turn.text, follow: true, topic: last.topic }; itv.followed = itv.followed || {}; itv.followed[last.topic] = 1; }
      else itv.current = { q: turn.text, topic: next ? next.id : 'fin' };
    } catch (err) {
      A.flow.itvError = (err && err.message ? err.message : 'Le service d’IA n’a pas répondu.') + ' La question habituelle est affichée à la place.';
      itv.current = scripted();
    } finally {
      A.busy.itv = false; persist(); renderMain(); speakQuestion(itv); focusAnswer();
    }
  }
  function focusAnswer() { setTimeout(() => { const t = $('itv-a'); if (t && !t.disabled) t.focus({ preventScroll: true }); const c = $('itv-current'); if (c) c.scrollIntoView({ block: 'nearest' }); }, 40); }
  function speakQuestion(itv) { if (A.set.voice.read && itv.current && itv.current.q) speak(itv.current.q, 'itv'); }
  function itvStart() {
    const s = A.s;
    const itv = S.startInterview(s, s.me, { ai: A.aiReady() ? A.aiLabel() : null });
    A.flow.itvDraft = ''; A.flow.itvError = null;
    persist();
    itvNext(itv, { first: true });
  }
  function itvAnswer(text) {
    const s = A.s, itv = curItv();
    if (!itv || itv.status !== 'en cours' || !itv.current) return;
    text = String(text || '').trim();
    if (!text) { toast('Écrivez ou dictez une réponse, ou passez la question.'); return; }
    const flags = E.detectRedFlags(text, D.redFlags, { names: D.crew.map(c => H.first(c.name)) });
    if (flags.length) {
      S.flagInterview(s, itv.id, flags.map(x => x.id));
      S.reportRedFlag(s, { a: itv.a, flag: flags[0].id, text, src: 'conference' });
      A.flow.itvDraft = '';
      persist(); render();
      toast('Signe d’alarme : l’entretien s’arrête, la médecin de bord est prévenue.', 'urgence');
      return;
    }
    const cur = itv.current;
    S.answerInterview(s, itv.id, { q: cur.q, text, follow: !!cur.follow });
    if (cur.follow) { const a = itv.answers[itv.answers.length - 1]; const prev = itv.plan[itv.step - 1]; a.label = (prev ? prev.label : 'Précision') + ', précision'; a.topic = prev ? prev.id : a.topic; a.part = prev ? prev.part : a.part; }
    if (cur.topic === 'fin') { const a = itv.answers[itv.answers.length - 1]; a.topic = 'fin'; a.label = 'Pour le médecin au sol'; }
    A.flow.itvDraft = '';
    if (cur.topic === 'fin') { itvFinish(itv); return; }
    const followed = itv.answers.filter(x => x.follow).length;
    const prevTopic = itv.plan[itv.step - 1];
    if ((!A.aiReady() || !itv.ai) && !cur.follow && prevTopic && E.followUpNeeded(text) && !(itv.followed || {})[prevTopic.id] && followed < 3) {
      itv.followed = itv.followed || {}; itv.followed[prevTopic.id] = 1;
      itvNext(itv, { followQ: 'Pouvez-vous m’en dire un peu plus : depuis quand, et à quel point cela vous gêne ?' });
      return;
    }
    itvNext(itv);
  }
  function itvSkip() {
    const s = A.s, itv = curItv();
    if (!itv || !itv.current) return;
    const cur = itv.current;
    S.answerInterview(s, itv.id, { q: cur.q, text: '', skipped: true, follow: !!cur.follow });
    if (cur.topic === 'fin') { itvFinish(itv); return; }
    itvNext(itv);
  }
  async function itvFinish(itv) {
    const s = A.s;
    itv = itv || curItv();
    if (!itv) return;
    S.finishInterview(s, itv.id);
    persist();
    if (!A.aiReady() || !itv.ai || !itv.answers.some(x => !x.skipped)) { render(); return; }
    A.busy.itvSum = true; render();
    const prompt = AI.summaryPrompt({ name: S.name(itv.a), facts: factsText(itv.a), transcript: itv.answers });
    try {
      let txt = '';
      await streamText(prompt, t => { txt = t; });
      const sum = AI.parseSummary(txt);
      if (sum.med) { itv.summary = sum; itv.summaryAi = A.aiLabel(); logAI('Résumé de l’entretien de la semaine rédigé'); }
    } catch (err) { toast(err.message + ' Le résumé préparé par des règles reste affiché.'); }
    finally { A.busy.itvSum = false; persist(); renderMain(); }
  }

  /* Synthèse de la semaine (médecin de bord) --------------------------- */
  async function synth() {
    const s = A.s, today = Math.floor(s.now / DAY);
    const end = Math.min(today, Math.max(6, parseInt(A.route.q.fin, 10) || today));
    const rep = S.weeklyReport(s, end);
    A.flow.synth = { end, text: '', ai: A.aiLabel() };
    A.busy.synth = true; A.ui.synthEdit = false; renderMain();
    try {
      await streamText(AI.synthesisPrompt({ report: S.reportText(s, rep) }), t => { A.flow.synth.text = AI.clean(t); live('synth-out', AI.md(A.flow.synth.text)); });
      logAI('Synthèse de la semaine rédigée');
    } catch (err) { A.flow.synth.error = err.message; }
    finally { A.busy.synth = false; persist(); renderMain(); }
  }
  async function synthRephrase(mode) {
    const sy = A.flow.synth;
    if (!sy || !sy.text) return;
    const old = sy.text;
    A.busy.synth = true; sy.text = ''; renderMain();
    try { await streamText(AI.rephrasePrompt({ mode, text: old }), t => { sy.text = AI.clean(t); live('synth-out', AI.md(sy.text)); }); }
    catch (err) { sy.text = old; sy.error = err.message; }
    finally { A.busy.synth = false; renderMain(); }
  }

  /* Messages vers la Terre ---------------------------------------------- */
  function readMsgForm() {
    const t = $('msg-t'), b = $('msg-b');
    A.flow.msg = Object.assign(A.flow.msg || {}, { title: t ? t.value : '', text: b ? b.value : '' });
    return A.flow.msg;
  }
  function msgTitleFrom(text) {
    const first = String(text || '').replace(/^Contexte :[^\n]*\n+/, '').split(/[.!?\n]/)[0].trim();
    return first ? (first.length > 60 ? first.slice(0, 57).replace(/\s+\S*$/, '') + '…' : first) : 'Message au médecin au sol';
  }
  function msgUndo() {
    const dr = A.flow.msg;
    if (dr && dr.orig) { dr.title = dr.orig.title; dr.text = dr.orig.text; }
    if (dr) { dr.prepared = false; dr.ai = null; dr.orig = null; }
    renderMain();
  }
  async function msgDraft() {
    const s = A.s, dr = readMsgForm();
    const notes = (dr.text || '').trim();
    if (!notes) { toast('Écrivez d’abord quelques mots.'); const b = $('msg-b'); if (b) b.focus(); return; }
    dr.orig = { title: dr.title, text: dr.text };
    const who = s.role === 'crew' ? S.name(s.me) : 'la médecin de bord';
    const delay = E.isBlackout(D.mission, s.now / DAY) ? 'plusieurs jours (conjonction)' : f.dur(Math.round(E.lightMinutes(D.mission, s.now / DAY)));
    if (!A.aiReady()) {
      dr.title = dr.title || msgTitleFrom(notes);
      dr.text = 'Contexte : ' + who + ', ' + f.when(s.now) + ', ' + E.phaseAt(D.mission, s.now / DAY).label.toLowerCase() + '. Ce message met ' + delay + ' à arriver.\n\n' + notes + '\n\nMerci de répondre lors de la prochaine liaison.';
      dr.ai = null; dr.prepared = true;
      renderMain();
      return;
    }
    A.busy.msg = true; renderMain();
    try {
      let txt = '';
      await streamText(AI.messagePrompt({ name: who, delay, context: boardContext(), notes }), t => { txt = t; const b = $('msg-b'); if (b) b.value = AI.parseMessage(t).text; });
      const pm = AI.parseMessage(txt);
      if (pm.text) { dr.title = pm.title || dr.title || msgTitleFrom(notes); dr.text = pm.text; dr.ai = A.aiLabel(); dr.prepared = true; }
      else { dr.text = dr.orig.text; dr.orig = null; }
    } catch (err) { dr.text = dr.orig ? dr.orig.text : dr.text; dr.orig = null; toast(err.message); }
    finally { A.busy.msg = false; renderMain(); }
  }

  /* Médecin au sol ------------------------------------------------------ */
  function carePlanTemplate(it) {
    if (it.kind === 'alerte') return 'Alerte bien reçue. La conduite engagée à bord est la bonne. Continuez la procédure, reprenez les constantes toutes les 15 minutes et envoyez un point de situation dans une heure. Rappelez le sol en priorité si l’état s’aggrave.';
    if (it.kind === 'conference') return 'Merci pour ce résumé. Rien d’urgent de notre côté. Pour la semaine qui vient : gardez des horaires de sommeil réguliers, continuez les points du soir, et signalez toute gêne qui dure plus de deux jours. Nous en reparlerons à la prochaine liaison vidéo.';
    if (it.kind === 'psy') return 'Demande bien reçue. Le psychologue au sol propose un entretien privé à la prochaine fenêtre de liaison vidéo. En attendant, n’hésitez pas à en parler à la médecin de bord.';
    return 'Bien reçu. Nous avons pris connaissance de votre message et nous revenons vers vous à la prochaine liaison.';
  }
  async function careDraft(id) {
    const s = A.s, it = s.queue.find(q => q.id === id);
    if (!it) return;
    A.flow.reply = A.flow.reply || {};
    const dr = A.flow.reply[id] = A.flow.reply[id] || { title: 'Réponse : ' + it.title, text: '' };
    const delay = f.dur(Math.round(E.lightMinutes(D.mission, s.now / DAY)));
    A.busy['reply-' + id] = true; renderMain();
    try {
      await streamText(AI.carePlanPrompt({ title: it.title, body: it.body || '', delay }), t => { dr.text = AI.clean(t); const b = $('gr-b-' + id); if (b) b.value = dr.text; });
      dr.ai = A.aiLabel();
    } catch (err) { toast(err.message); }
    finally { A.busy['reply-' + id] = false; renderMain(); }
  }

  /* ------------------------------------------------------------------ */
  /* Voix                                                                 */
  /* ------------------------------------------------------------------ */
  function initSpeech() {
    A.speech.canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    A.speech.canListen = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
  function pickVoice(lang) {
    try {
      const vs = speechSynthesis.getVoices() || [];
      return vs.find(v => v.lang && v.lang.toLowerCase().indexOf(lang) === 0 && /google|natural|premium|enhanced/i.test(v.name)) || vs.find(v => v.lang && v.lang.toLowerCase().indexOf(lang) === 0) || null;
    } catch (e) { return null; }
  }
  function speak(text, id) {
    if (!A.speech.canSpeak) return;
    try {
      speechSynthesis.cancel();
      if (A.speech.speaking === id && id !== 'itv') { A.speech.speaking = null; updateSpeakButtons(); return; }
      const english = /^(the|this|you|your|in|it|a|if)\b/i.test(String(text).trim());
      const u = new SpeechSynthesisUtterance(AI.plain(text));
      u.lang = english ? 'en-US' : 'fr-FR';
      const v = pickVoice(english ? 'en' : 'fr'); if (v) u.voice = v;
      u.rate = 0.98;
      u.onend = () => { if (A.speech.speaking === id) { A.speech.speaking = null; updateSpeakButtons(); } };
      A.speech.speaking = id;
      speechSynthesis.speak(u);
      updateSpeakButtons();
    } catch (e) { toast('La lecture à voix haute n’est pas disponible.'); }
  }
  function updateSpeakButtons() {
    document.querySelectorAll('button[data-act="speak"]').forEach(b => { b.textContent = A.speech.speaking === b.dataset.id ? 'Arrêter la lecture' : 'Écouter'; });
  }
  function stopListening() { if (A.rec) { try { A.rec.stop(); } catch (e) { /* rien */ } } A.rec = null; A.speech.listening = null; }
  function listen(targetId, btn) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (A.speech.listening === targetId) { stopListening(); updateListenButtons(); return; }
    stopListening();
    const ta = $(targetId);
    if (!ta) return;
    const rec = new SR();
    rec.lang = 'fr-FR'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    const base = ta.value.trim();
    rec.onresult = e => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      ta.value = (base ? base + ' ' : '') + txt.trim();
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    };
    rec.onerror = e => { toast(e.error === 'not-allowed' ? 'Le micro n’est pas autorisé pour cette page.' : e.error === 'network' ? 'La dictée a besoin d’une connexion dans ce navigateur. Répondez au clavier.' : 'La dictée s’est arrêtée.'); };
    rec.onend = () => { if (A.rec === rec) { A.rec = null; A.speech.listening = null; updateListenButtons(); } };
    try { rec.start(); A.rec = rec; A.speech.listening = targetId; updateListenButtons(); ta.focus(); }
    catch (e) { toast('La dictée n’a pas pu démarrer.'); }
  }
  function updateListenButtons() {
    document.querySelectorAll('button[data-act="listen"]').forEach(b => {
      const on = A.speech.listening === b.dataset.target;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = b.dataset.target === 'ask-q' ? (on ? 'Stop' : 'Micro') : b.dataset.target === 'msg-n' ? (on ? 'Arrêter la dictée' : 'Dicter') : (on ? 'Arrêter la dictée' : 'Répondre à la voix');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Respiration, paysage, test de réaction                               */
  /* ------------------------------------------------------------------ */
  function mountRuntime() {
    const key = A.route.path.join('/');
    if (key === 'bien-etre/respiration') {
      const el = $('breath');
      if (!el) return;
      A.runtime = R.breathing({ orb: $('breath-orb'), word: $('breath-word'), time: $('breath-time'), inhale: +el.dataset.in, exhale: +el.dataset.out, minutes: +el.dataset.min, onState: st => { const b = $('breath-btn'); if (b) b.textContent = st === 'running' ? 'Arrêter' : 'Recommencer'; } });
    } else if (key === 'bien-etre/paysage') {
      const cv = $('scene-canvas');
      if (!cv) return;
      A.runtime = R.scene(cv, { mood: A.flow.scene || 'aube', yaw: A.flow.sceneYaw });
      if (A.flow.sceneBreath && $('scene-orb')) { A.runtime2 = R.breathing({ orb: $('scene-orb'), word: $('scene-word'), inhale: 5, exhale: 5, minutes: 30 }); A.runtime2.start(); }
    } else if (key === 'bien-etre/reaction' && A.s.role === 'crew') {
      const zone = $('rt');
      if (!zone) return;
      const secs = +zone.dataset.secs;
      A.runtime = R.reaction({ zone, orb: $('rt-orb'), msg: $('rt-msg'), ms: $('rt-ms'), left: $('rt-left'), secs, isiMin: +zone.dataset.isimin, isiMax: +zone.dataset.isimax, onDone: res => {
        const rec = S.addReaction(A.s, { a: A.s.me, rts: res.rts, falseStarts: res.falseStarts, secs });
        A.flow.rtResult = rec;
        persist(); renderMain();
        const r2 = $('rt-result'); if (r2) r2.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (!rec) toast('Aucune réponse enregistrée : recommencez quand vous voulez.');
      } });
    }
  }
  function unmountRuntime() {
    if (A.runtime) { if (typeof A.runtime.yaw === 'number') A.flow.sceneYaw = A.runtime.yaw; A.runtime.destroy(); A.runtime = null; }
    if (A.runtime2) { A.runtime2.destroy(); A.runtime2 = null; }
  }

  /* ------------------------------------------------------------------ */
  /* NASA DONKI (éruptions solaires réelles)                              */
  /* ------------------------------------------------------------------ */
  async function fetchDonki(force) {
    const CK = 'aura.donki';
    if (!force) {
      try { const c = JSON.parse(localStorage.getItem(CK) || 'null'); if (c && Date.now() - c.t < 6 * 3600 * 1000) { A.donki = { status: 'ok', list: c.list, t: c.t, error: null }; return; } } catch (e) { /* rien */ }
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { A.donki = { status: 'error', list: [], t: 0, error: 'hors connexion' }; return; }
    A.donki = { status: 'loading', list: [], t: 0, error: null };
    if (A.route.path[0] === 'mission') renderMain();
    const iso = d => d.toISOString().slice(0, 10);
    const end = new Date(), start = new Date(end.getTime() - 30 * 86400000);
    const url = 'https://api.nasa.gov/DONKI/FLR?startDate=' + iso(start) + '&endDate=' + iso(end) + '&api_key=' + encodeURIComponent((A.set.donkiKey || '').trim() || 'DEMO_KEY');
    try {
      const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tm);
      if (!res.ok) throw new Error(res.status === 429 ? 'trop de requêtes avec la clé de démonstration' : 'erreur ' + res.status);
      const list = await res.json();
      A.donki = { status: 'ok', list: Array.isArray(list) ? list : [], t: Date.now(), error: null };
      try { localStorage.setItem(CK, JSON.stringify({ t: A.donki.t, list: A.donki.list })); } catch (e) { /* rien */ }
    } catch (e) {
      A.donki = { status: 'error', list: [], t: 0, error: e && e.message && /trop|erreur/.test(e.message) ? e.message : 'pas de réponse' };
    }
    if (A.route.path[0] === 'mission') renderMain();
  }

  /* Taille réelle du paquet de données du jour, avant et après compression */
  async function packNote() {
    const el = $('pack-note');
    if (!el || typeof CompressionStream === 'undefined') return;
    try {
      const d = Math.floor(A.s.now / DAY);
      const pk = S.packet(A.s, d, A.s.now);
      const data = JSON.stringify({ meas: A.s.meas.filter(m => Math.floor(m.t / DAY) === d), wb: A.s.wb.filter(w => Math.floor(w.t / DAY) === d), snap: pk.snap });
      const raw = new TextEncoder().encode(data);
      const cs = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
      const out = await new Response(cs).arrayBuffer();
      if ($('pack-note') === el) el.textContent = 'Paquet de données du jour : ' + f.num(raw.length / 1024, 1) + ' ko avant compression, ' + f.num(out.byteLength / 1024, 1) + ' ko après (gzip, calculé dans ce navigateur). Il part à 22 h, après les messages plus importants.';
    } catch (e) { /* rien */ }
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                              */
  /* ------------------------------------------------------------------ */
  function copyText(text) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? 'Texte copié.' : 'Copie impossible dans ce navigateur.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('Texte copié.'), fallback);
    else fallback();
  }
  function setProfile(role, me) {
    const s = A.s;
    s.role = role;
    if (me) s.me = me;
    A.set.welcomed = true; saveSettings();
    resetFlows(); persist();
    closeSheet();
    A.routeKey = null;
    go('#/');
    toast(role === 'doctor' ? 'Vue de la médecin de bord : tout l’équipage, vocabulaire clinique.' : role === 'ground' ? 'Vue du médecin au sol : ce qui est arrivé sur Terre, avec le délai.' : 'Vue ' + S.deName(s.me) + ' : vos propres données, en mots simples.');
  }

  function onClick(e) {
    const cite = e.target.closest('a.cite');
    if (cite) {
      e.preventDefault();
      const id = cite.getAttribute('href').slice(1);
      const box = cite.closest('.msg') || document;
      const det = box.querySelector('details.disclose');
      if (det) det.open = true;
      const el = $(id);
      if (el) { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); el.style.outline = '2px solid var(--aura)'; setTimeout(() => { el.style.outline = ''; }, 1400); }
      return;
    }
    const row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a,button,input,select,label,textarea')) { location.hash = row.getAttribute('data-href'); return; }
    if (A.ui.menu && !e.target.closest('#menu') && !e.target.closest('.profile-btn')) closeMenu();
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const ds = el.dataset, s = A.s, act = el.getAttribute('data-act');
    if (el.tagName === 'INPUT' && el.type === 'checkbox' && act !== 'step') return;
    switch (act) {
      case 'menu': A.ui.menu = !A.ui.menu; el.setAttribute('aria-expanded', String(A.ui.menu)); renderMenu(); break;
      case 'more': openSheet('more'); break;
      case 'demo-open': openSheet('demo'); break;
      case 'sheet-close': closeSheet(); break;
      case 'sheet-close-nav': closeSheet(); break;
      case 'profile': setProfile(ds.role, ds.me); break;
      case 'advance': advance(+ds.min); break;
      case 'advance-to': advanceTo(+ds.t); break;
      case 'scenario': runScenario(ds.id); break;
      case 'demo-next': demoNext(); break;
      case 'demo-exit': s.scenario = null; persist(); renderMain(); toast('Démonstration terminée. La mission continue.'); break;
      case 'reset':
        if (A.ui.confirmReset) { S.clear(); A.s = S.createState({}); resetFlows(); A.plan.result = null; persist(); closeSheet(); go('#/'); toast('Démonstration réinitialisée.'); }
        else { A.ui.confirmReset = true; renderSheet(); }
        break;
      case 'flip': A.ui.flip[ds.key] = !A.ui.flip[ds.key]; renderMain({ keep: true }); break;
      case 'later': s.later = s.later || {}; s.later[ds.k] = Math.floor(s.now / DAY); persist(); renderMain(); break;
      case 'nudge': {
        const inp = $(ds.target || 'm-v');
        if (!inp) break;
        const step = Math.abs(+ds.d), cur = inp.value === '' ? parseFloat(inp.placeholder || '0') || 0 : parseFloat(String(inp.value).replace(',', '.')) || 0;
        const dec = (String(step).split('.')[1] || '').length;
        inp.value = (cur + +ds.d).toFixed(dec);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
      case 'example':
        A.flow.m = { a: V.forWhom(A), k: ds.k, v: ds.v, ctx: {}, retakeOf: null, result: null };
        doMeasure(); renderMain({ keep: false }); window.scrollTo(0, 0);
        break;
      case 'measure-again': if (A.flow.m) { A.flow.m.result = null; A.flow.m.v = ''; } renderMain(); setTimeout(() => { const i = $('m-v'); if (i) i.focus(); }, 30); break;
      case 'measure-done': A.flow.m = null; break;
      case 'retake':
        A.flow.m = { a: ds.a, k: ds.k, v: '', ctx: {}, retakeOf: ds.ref, result: null };
        if (A.route.path[0] === 'mesurer' && A.route.path[1] === ds.k) renderMain(); else go('#/mesurer/' + ds.k);
        setTimeout(() => { const i = $('m-v'); if (i) i.focus(); }, 60);
        break;
      case 'symptom-again': A.flow.sy = null; renderMain(); break;
      case 'symptom-done': A.flow.sy = null; break;
      case 'effect': {
        const side = ($('side-' + ds.id) || {}).value || '';
        S.recordEffect(s, ds.id, ds.effect, side.trim()); persist(); render();
        toast(ds.effect === 'complet' ? 'Merci, c’est noté.' : 'Merci, c’est noté. La médecin de bord en tiendra compte.');
        break;
      }
      case 'admin-open': A.ui.admin = { med: ds.med, a: ds.a || s.me }; A.ui.factor = null; renderMain(); break;
      case 'admin-cancel': A.ui.admin = null; renderMain(); break;
      case 'factor-open': A.ui.factor = ds.med; A.ui.admin = null; renderMain(); break;
      case 'factor-cancel': A.ui.factor = null; renderMain(); break;
      case 'plan-med': A.plan.med = ds.med; renderMain(); break;
      case 'see-alert': S.seeAlert(s, ds.id); persist(); render(); break;
      case 'close-open': A.ui.closing = ds.id; renderMain(); setTimeout(() => { const i = $('cl-' + ds.id); if (i) i.focus(); }, 20); break;
      case 'step': S.toggleStep(s, +ds.i); persist(); render(); break;
      case 'end-emergency': S.endEmergency(s); persist(); render(); toast('Mode urgence terminé.'); break;
      case 'spe-now': {
        s.events.push({ kind: 'spe', start: s.now + 1, end: s.now + 1 + 8 * 60, factor: 40 });
        const ev = S.advanceTo(s, s.now + 2);
        persist(); toastEvents(ev); go('#/urgence');
        break;
      }
      case 'replay-flare': {
        const factor = /^X/.test(ds.cls) ? 40 : 10;
        s.events.push({ kind: 'spe', start: s.now + 1, end: s.now + 1 + 6 * 60, factor });
        const ev = S.advanceTo(s, s.now + 2);
        persist(); toastEvents(ev); toast('Exercice : éruption de classe ' + ds.cls + ' rejouée à bord.');
        go('#/urgence');
        break;
      }
      case 'drill': S.startEmergency(s, ds.kind, s.now, 'Exercice déclenché à bord'); persist(); go('#/urgence'); toast('Exercice : mode urgence activé.', 'urgence'); break;
      case 'drift': S.decideDrift(s, ds.id, ds.decision); persist(); render(); toast(ds.decision === 'valider' ? 'Nouvelle référence validée.' : 'Référence actuelle maintenue.'); break;
      case 'redflag': {
        const a = ds.a || (A.route.path[0] === 'urgence' ? (A.flow.who || ($('rf-who') || {}).value || s.me) : s.me);
        S.reportRedFlag(s, { a, flag: ds.flag, text: '', src: ds.src || 'urgence' });
        persist(); go('#/urgence');
        toast('Signe d’alarme : la médecin de bord est prévenue.', 'urgence');
        break;
      }
      case 'copy-report': copyText(($('synth-rules') || {}).value || S.reportText(s, S.weeklyReport(s, +ds.end))); break;
      case 'send-report': {
        const rep = S.weeklyReport(s, +ds.end);
        const body = ($('synth-rules') || {}).value || S.reportText(s, rep);
        const it = S.enqueue(s, { t: s.now, title: 'Synthèse de la semaine (' + f.day(rep.start) + ' à ' + f.day(rep.end) + ')', kind: 'synthese', prio: 3, kb: 60 + 12 * rep.points.length, reply: true, points: rep.points.map(p => p.text).slice(0, 2), body });
        persist(); render();
        toast(it.arrAt ? 'Synthèse envoyée : arrivée au sol à ' + f.clock(it.arrAt % DAY) + '.' : 'Synthèse en file : elle partira au retour de la liaison.');
        break;
      }
      // Assistant
      case 'ask-chip': ask(ds.q); break;
      case 'ask-level': A.flow.askLevel = ds.level; renderMain(); break;
      case 'chat-clear': S.chatClear(s, A.chatKey()); persist(); renderMain(); break;
      case 'speak': { const m = (s.chats[A.chatKey()] || []).find(x => x.id === ds.id); if (m) speak(m.text, m.id); break; }
      case 'rephrase': rephrase(ds.id, ds.mode); break;
      case 'to-conf': { const r = S.askQuestion(s, { a: s.me, q: ds.q }, A.idx, KB); S.flagQuestion(s, r.record.id); persist(); toast('Question gardée pour la conférence de la semaine.'); break; }
      case 'ai-stop': aiStop(); break;
      case 'listen': listen(ds.target, el); break;
      // Entretien
      case 'itv-start': itvStart(); break;
      case 'itv-skip': itvSkip(); break;
      case 'itv-finish': itvFinish(); break;
      case 'itv-retry': { const itv = curItv(); if (itv) { A.flow.itvError = null; const last = itv.answers.length; if (itv.current) itv.current = null; itvNext(itv, { first: last === 0 }); } break; }
      case 'itv-norules': { const itv = curItv(); if (itv) { itv.ai = null; A.flow.itvError = null; persist(); renderMain(); } break; }
      case 'itv-keep': { const itv = curItv(); if (itv) { S.sendInterview(s, itv.id, { med: false, psy: false }); persist(); renderMain(); toast('Rien n’est parti : votre résumé reste à bord.'); } break; }
      case 'speak-q': { const itv = curItv(); if (itv && itv.current) speak(itv.current.q, 'itv'); break; }
      // Bien-être
      case 'psy-open': A.ui.psy = true; renderMain(); break;
      case 'psy-cancel': A.ui.psy = false; renderMain(); break;
      case 'psy-send': {
        const it = S.sendMessage(s, { title: 'Demande d’entretien avec le psychologue au sol', text: S.name(s.me) + ' souhaite un entretien privé avec le psychologue au sol.', prio: 2, kind: 'psy', a: s.me });
        A.ui.psy = false; persist(); renderMain();
        toast(it.arrAt ? 'Demande partie : arrivée au sol à ' + f.clock(it.arrAt % DAY) + '.' : 'Demande en file : elle partira au retour de la liaison.');
        break;
      }
      case 'breath-start': if (A.runtime) { if (A.runtime.running) A.runtime.stop(false); else A.runtime.start(); } break;
      case 'breath-min': A.flow.breathMin = +ds.min; renderMain(); break;
      case 'scene-mood': A.flow.scene = ds.mood; A.runtime = (A.runtime && A.runtime.destroy(), null); A.flow.sceneYaw = undefined; renderMain(); break;
      case 'scene-breath': A.flow.sceneBreath = !A.flow.sceneBreath; renderMain(); break;
      case 'scene-full': { const sc = $('scene'); if (sc && sc.requestFullscreen) sc.requestFullscreen().catch(() => toast('Le plein écran n’est pas disponible ici.')); break; }
      case 'rt-secs': A.flow.rtSecs = +ds.secs; renderMain(); break;
      // Conférence (médecin)
      case 'synth': synth(); break;
      case 'synth-edit': A.ui.synthEdit = !A.ui.synthEdit; renderMain(); break;
      case 'synth-rephrase': synthRephrase(ds.mode); break;
      case 'synth-send': {
        const sy = A.flow.synth; if (!sy || !sy.text) break;
        const rep = S.weeklyReport(s, sy.end);
        const it = S.enqueue(s, { t: s.now, title: 'Synthèse de la semaine (' + f.day(rep.start) + ' à ' + f.day(rep.end) + ')', kind: 'synthese', prio: 3, kb: Math.max(4, Math.round(sy.text.length / 400)), reply: true, body: sy.text, ai: sy.ai });
        logAI('Synthèse de la semaine relue et envoyée au médecin au sol');
        persist(); render();
        toast(it.arrAt ? 'Synthèse envoyée : arrivée au sol à ' + f.clock(it.arrAt % DAY) + '.' : 'Synthèse en file : elle partira au retour de la liaison.');
        break;
      }
      // Messages
      case 'msg-draft': msgDraft(); break;
      case 'msg-undo': msgUndo(); break;
      // Médecin au sol
      case 'reply-open': A.ui.reply = ds.id; s.ground.read[ds.id] = s.now; persist(); refreshChrome(); renderMain(); setTimeout(() => { const t = $('gr-b-' + ds.id); if (t) t.focus(); }, 30); break;
      case 'reply-close': A.ui.reply = null; renderMain(); break;
      case 'care-draft': careDraft(ds.id); break;
      case 'care-template': { const it = s.queue.find(q => q.id === ds.id); if (it) { A.flow.reply = A.flow.reply || {}; A.flow.reply[ds.id] = { title: 'Réponse : ' + it.title, text: carePlanTemplate(it), ai: null }; renderMain(); } break; }
      case 'g-read': S.markGroundRead(s, ds.id); persist(); refreshChrome(); renderMain(); break;
      case 'g-open': A.ui.open[ds.id] = !A.ui.open[ds.id]; S.markGroundRead(s, ds.id); persist(); refreshChrome(); renderMain(); break;
      case 'g-validate': {
        const it = s.queue.find(q => q.id === ds.id); if (!it) break;
        S.markGroundRead(s, ds.id);
        const msg = S.sendDown(s, { ref: it.id, title: 'Conduite validée par le médecin au sol', text: 'Le médecin au sol a lu « ' + it.title + ' ». La conduite engagée à bord est validée. Envoyez un point de situation à la prochaine liaison.', prio: it.prio === 1 ? 1 : 2, a: it.a || null, act: 'valide' });
        persist(); render();
        toast('Validation envoyée : arrivée à bord à ' + f.clock(msg.arrAt % DAY) + '.');
        break;
      }
      // Réglages
      case 'set-level': A.set.level[s.role] = ds.v; saveSettings(); render(); break;
      case 'set-text': A.set.text = ds.v; saveSettings(); applyDisplay(); render(); break;
      case 'set-theme': A.set.theme = ds.v; saveSettings(); applyDisplay(); render(); break;
      case 'voice-test': speak('Bonjour. Je suis la voix d’AURA. Je peux lire les questions de votre entretien de la semaine.', 'test'); break;
      case 'ai-provider': A.ai.provider = ds.id; AI.save(A.ai); A.flow.aiTest = null; render(); break;
      case 'ai-test': aiTest(); break;
      case 'ai-models': aiModels(); break;
      case 'donki': fetchDonki(true); break;
      default: break;
    }
  }

  function readAiForm() {
    const c = AI.current(A.ai);
    const own = A.ai.providers[c.id] = A.ai.providers[c.id] || {};
    const k = $('ai-key'), m = $('ai-model'), b = $('ai-base');
    if (k) own.key = k.value.trim();
    if (m) own.model = m.value.trim();
    if (b) own.base = b.value.trim();
    AI.save(A.ai);
  }
  async function aiTest() {
    readAiForm();
    if (!A.aiReady()) { A.flow.aiTest = 'Renseignez la clé et le modèle, puis réessayez.'; renderMain(); return; }
    A.flow.aiTest = 'Test en cours…'; renderMain();
    const t0 = performance.now();
    try {
      const r = await AI.test(A.ai);
      A.flow.aiTest = 'Connexion réussie avec ' + A.aiLabel() + ' : réponse « ' + AI.plain(r.text).slice(0, 40) + ' » en ' + f.num((performance.now() - t0) / 1000, 1) + ' s.';
    } catch (err) { A.flow.aiTest = err.message; }
    render();
  }
  async function aiModels() {
    readAiForm();
    const c = AI.current(A.ai);
    A.flow.aiTest = 'Recherche des modèles…'; renderMain();
    try {
      const list = await AI.listModels(A.ai);
      A.flow.models = { id: c.id, list };
      A.flow.aiTest = list.length ? UI.plural(list.length, 'modèle') + ' trouvé' + (list.length > 1 ? 's' : '') + ' : choisissez dans la liste.' : 'Aucun modèle trouvé.';
    } catch (err) { A.flow.aiTest = err.message; }
    renderMain();
  }

  function onSubmit(e) {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const fd = new FormData(form), s = A.s;
    const get = k => (fd.get(k) === null ? '' : String(fd.get(k)));
    switch (form.getAttribute('data-form')) {
      case 'measure': {
        const ctx = {};
        fd.getAll('ctx').forEach(k => { ctx[k] = true; });
        A.flow.m = { a: get('a') || V.forWhom(A), k: get('k'), v: get('v'), ctx, retakeOf: get('retakeOf') || null, result: null };
        doMeasure(); renderMain({ keep: false }); window.scrollTo(0, 0);
        break;
      }
      case 'symptom': {
        if (!get('sym')) { toast('Choisissez ce que vous ressentez.'); return; }
        A.flow.sy = { a: get('a') || V.forWhom(A), sym: get('sym'), intensity: +get('intensity') || 0, note: get('note').trim(), result: null };
        doSymptom(); renderMain({ keep: false }); window.scrollTo(0, 0);
        break;
      }
      case 'administer': {
        const med = S.medById[get('med')];
        const rec = S.administer(s, { a: get('a') || s.me, med: get('med'), units: +get('units'), reason: 'Saisie à bord' });
        A.ui.admin = null; persist(); render();
        toast(rec ? med.name + ' : prise notée. AURA vous demandera l’effet à ' + f.clock(rec.due % DAY) + '.' : 'Stock insuffisant pour cette prise.');
        break;
      }
      case 'close-alert': S.closeAlert(s, get('id'), get('note').trim()); A.ui.closing = null; persist(); render(); toast('Alerte close.'); break;
      case 'factor': {
        if (!get('note').trim()) { toast('Une justification est obligatoire.'); const t = $('fac-n'); if (t) t.focus(); return; }
        S.setFactor(s, get('med'), +get('f') || 1, get('note').trim());
        A.ui.factor = null; persist(); render(); toast('Dose validée. Le changement part vers le médecin au sol.');
        break;
      }
      case 'plan':
        A.plan.mode = get('mode') || 'avant'; A.plan.scenario = get('scenario') || 'median'; A.plan.runs = +get('runs') || 5000;
        runPlan(); renderMain();
        toast(f.num(A.plan.runs, 0) + ' missions simulées en ' + f.num(A.plan.result.ms, 0) + ' ms.');
        break;
      case 'wellbeing': {
        const need = ['mood', 'stress', 'sq', 'load'];
        if (need.some(k => !get(k)) || get('sleep') === '') { toast('Il manque une réponse. Vous pouvez aussi revenir plus tard.'); return; }
        S.addWellbeing(s, { a: s.me, mood: +get('mood'), stress: +get('stress'), sleep: +get('sleep').replace(',', '.'), sq: +get('sq'), load: +get('load'), contact: !!fd.get('contact'), note: get('note').trim(), share: !!fd.get('share') });
        persist(); render(); toast('Merci. Votre point du soir est enregistré.');
        break;
      }
      case 'ask': ask(get('q')); break;
      case 'itv-answer': itvAnswer(get('text')); break;
      case 'itv-send': {
        const itv = curItv(); if (!itv) return;
        const consent = { med: !!fd.get('cmed'), psy: !!fd.get('cpsy') };
        const r = S.sendInterview(s, itv.id, consent, { med: get('med'), psy: get('psy') });
        persist(); render();
        if (r && r.item) toast(r.item.arrAt ? 'Résumé parti : arrivée au sol à ' + f.clock(r.item.arrAt % DAY) + '.' : 'Résumé en file : il partira au retour de la liaison.');
        else toast('Rien n’est parti : votre résumé reste à bord.');
        break;
      }
      case 'synth-edit': if (A.flow.synth) { A.flow.synth.text = get('text'); A.flow.synth.edited = true; } A.ui.synthEdit = false; renderMain(); toast('Modifications gardées.'); break;
      case 'message': {
        const dr = readMsgForm();
        const text = get('text').trim();
        if (!text) { toast('Écrivez le message avant de l’envoyer.'); const b = $('msg-b'); if (b) b.focus(); return; }
        const it = S.sendMessage(s, { title: get('title').trim() || msgTitleFrom(text), text, prio: +get('prio') || 2, a: s.role === 'crew' ? s.me : null, ai: dr.ai || null });
        A.flow.msg = null; persist(); render();
        toast(it.arrAt ? 'Message parti : arrivée au sol à ' + f.clock(it.arrAt % DAY) + '.' : 'Message en file : il partira au retour de la liaison.');
        break;
      }
      case 'ground-reply': {
        const ref = get('ref'), it = s.queue.find(q => q.id === ref);
        if (!get('text').trim()) { toast('Écrivez la réponse avant de l’envoyer.'); return; }
        const dr = (A.flow.reply || {})[ref] || {};
        const msg = S.sendDown(s, { ref, title: get('title').trim() || 'Réponse du médecin au sol', text: get('text').trim(), prio: +get('prio') || 2, a: it ? it.a : null, ai: dr.ai || null });
        S.markGroundRead(s, ref);
        A.ui.reply = null; persist(); render();
        toast('Réponse partie : arrivée à bord à ' + f.clock(msg.arrAt % DAY) + '.');
        break;
      }
      case 'ground-message': {
        const to = get('a') || 'all';
        const msg = S.sendDown(s, { title: get('title').trim(), text: get('text').trim(), prio: +get('prio') || 2, to, a: /^a\d/.test(to) ? to : null });
        persist(); render();
        toast('Message parti : arrivée à bord à ' + f.clock(msg.arrAt % DAY) + '.');
        break;
      }
      case 'ai-config': readAiForm(); A.flow.aiTest = A.aiReady() ? 'Réglages enregistrés. Vous pouvez tester la connexion.' : 'Réglages enregistrés. Il manque encore la clé ou le modèle.'; render(); break;
      case 'donki-key': A.set.donkiKey = get('key').trim(); saveSettings(); toast('Clé enregistrée.'); fetchDonki(true); break;
      case 'goto-day': {
        const day = Math.max(1, Math.min(D.mission.durationDays - 1, parseInt(get('day'), 10) || D.mission.defaultDay));
        const role = s.role, me = s.me;
        A.s = S.createState({ day, minute: 9 * 60 });
        A.s.role = role; A.s.me = me;
        resetFlows(); A.plan.result = null; persist(); closeSheet(); render();
        toast('Mission recalculée jusqu’à ' + f.day(day) + '.');
        break;
      }
      default: break;
    }
  }

  function onChange(e) {
    const el = e.target, ch = el.getAttribute && el.getAttribute('data-change');
    if (!ch) return;
    if (ch === 'who') { A.flow.who = el.value; if (A.flow.m) A.flow.m.a = el.value; if (A.flow.sy) A.flow.sy.a = el.value; renderMain(); return; }
    if (ch === 'voice-read') { A.set.voice.read = !!el.checked; saveSettings(); return; }
    if (ch === 'sensors') { A.s.sim.sensors = !!el.checked; persist(); toast(A.s.sim.sensors ? 'Capteurs simulés activés.' : 'Capteurs simulés désactivés : seules vos saisies comptent.'); return; }
  }
  function onInput(e) {
    const el = e.target;
    if (el.id === 's-i') { const o = $('s-io'); if (o) o.textContent = el.value + ' sur 10'; return; }
    if (el.id === 'ask-q') { A.flow.askDraft = el.value; el.style.height = 'auto'; el.style.height = Math.min(180, el.scrollHeight) + 'px'; return; }
    if (el.id === 'itv-a') { A.flow.itvDraft = el.value; return; }
    if (el.id === 'msg-n' || el.id === 'msg-t' || el.id === 'msg-b') { readMsgForm(); return; }
    if (el.id && el.id.indexOf('gr-b-') === 0) { const id = el.id.slice(5); A.flow.reply = A.flow.reply || {}; A.flow.reply[id] = Object.assign(A.flow.reply[id] || {}, { text: el.value }); return; }
    if (el.id && el.id.indexOf('gr-t-') === 0) { const id = el.id.slice(5); A.flow.reply = A.flow.reply || {}; A.flow.reply[id] = Object.assign(A.flow.reply[id] || {}, { title: el.value }); return; }
    if (el.id === 'm-v' && A.flow.m) { A.flow.m.v = el.value; }
  }
  function onKey(e) {
    if (e.key === 'Escape') { closeMenu(); closeSheet(); UI.tipHide(); return; }
    if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'ask-q') { e.preventDefault(); ask(e.target.value); }
  }

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                            */
  /* ------------------------------------------------------------------ */
  function init() {
    A.set = loadSettings(); applyDisplay();
    A.ai = AI.load();
    initSpeech();
    A.s = S.load() || S.createState({});
    if (!A.s.later) A.s.later = {};
    window.addEventListener('hashchange', onRoute);
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    window.addEventListener('online', () => { renderTop(); toast('Connexion retrouvée.'); });
    window.addEventListener('offline', () => { renderTop(); toast('Connexion perdue : AURA continue de fonctionner à bord.'); });
    if (A.speech.canSpeak && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { /* voix chargées */ });
    let lastW = window.innerWidth, timer = null;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const w = window.innerWidth;
        if (Math.abs(w - lastW) > 40) { lastW = w; const k = A.route.path.join('/'); if (k !== 'bien-etre/paysage' && k !== 'bien-etre/reaction' && k !== 'bien-etre/respiration' && !A.busy.ask && !A.busy.itv) renderMain(); }
      }, 200);
    });
    onRoute();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* le site reste utilisable */ });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof self !== 'undefined' ? self : this);
