/* AURA : pages (1/2) : vue d’ensemble, équipage, fiche, saisie, alertes. */
(function (root) {
  'use strict';
  const V = root.AURA_VIEWS = root.AURA_VIEWS || {};
  const D = root.AURA_DATA, E = root.AURA_ENGINE, S = root.AURA_STORE, UI = root.AURA_UI;
  const f = E.fmt, esc = UI.esc, NB = E.NBSP, DAY = 1440;
  const METRICS = ['temp', 'hr', 'spo2'];

  const H = V.helpers = {
    doc(A) { return A.s.role === 'doctor'; },
    T(A, o) { return A.s.role === 'doctor' ? o.doctor : o.crew; },
    today(A) { return Math.floor(A.s.now / DAY); },
    page(title, lead, actions, body) {
      return '<div class="page"><div class="page-head"><div><h1 id="page-title" tabindex="-1">' + esc(title) + '</h1>' +
        (lead ? '<p class="lead">' + lead + '</p>' : '') + '</div>' +
        (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>' + body + '</div>';
    },
    section(title, sub, body, extra) {
      return '<section class="section"' + (extra || '') + '><div class="section-head"><div><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div></div>' + body + '</section>';
    },
    ago(A, t) {
      const d = A.s.now - t;
      if (d < 1) return 'à l’instant';
      if (d < 60) return 'il y a ' + Math.round(d) + NB + 'min';
      if (Math.floor(t / DAY) === Math.floor(A.s.now / DAY)) return 'à ' + f.clock(t % DAY);
      if (d < 2 * DAY && Math.floor(t / DAY) === Math.floor(A.s.now / DAY) - 1) return 'hier à ' + f.clock(t % DAY);
      return f.when(t);
    },
    who(A, id) { return (!H.doc(A) && id === A.s.me) ? 'vous' : S.name(id); },
    canSee(A, id) { return H.doc(A) || id === A.s.me; },
    crewOptions(A, sel) {
      return D.crew.map(c => '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + (c.id === A.s.me && !H.doc(A) ? ' (vous)' : '') + '</option>').join('');
    },
    openAlerts(A) { return A.s.alerts.filter(a => a.st !== 'close'); },
    alertsFor(A, id) { return A.s.alerts.filter(a => a.st !== 'close' && a.a === id); },
    range(cfg, band) { return cfg.oneSided === 'low' ? 'au-dessus de ' + f.unit(band[0], cfg) : 'de ' + f.unit(band[0], cfg) + ' à ' + f.unit(band[1], cfg); }
  };

  /* ------------------------------------------------------------------ */
  /* Lecture d’une mesure (composant central)                             */
  /* ------------------------------------------------------------------ */
  function reading(A, rec, opts) {
    opts = opts || {};
    const cfg = D.metrics[rec.k];
    const ex = opts.fresh || S.explain(A.s, rec);
    const ev = ex.ev, doc = H.doc(A);
    const title = doc ? ex.text.doctorTitle : ex.text.crewTitle;
    const body = doc ? ex.text.doctor : ex.text.crew;
    const who = (!doc && rec.a === A.s.me) ? 'vous, à ' + f.day(rec.t / DAY) : S.name(rec.a) + ', à ' + f.day(rec.t / DAY);
    const terrDiff = ev.terrestrial.level !== 'normal';
    let h = '<div class="reading">';
    h += '<div class="reading-head"><div>';
    h += '<div class="reading-meta">' + esc(cfg.label) + ' de ' + esc(S.name(rec.a)) + ', ' + esc(f.when(rec.t)) + (rec.src === 'sim' ? ' (capteur simulé)' : ' (saisie)') + '</div>';
    h += '<div class="reading-value">' + esc(f.num(rec.v, cfg.decimals)) + '<small>' + esc(cfg.unit) + '</small></div></div>';
    h += '<div class="btn-row">' + UI.pill(ev.level, 'Lecture AURA : ' + UI.LEVEL[ev.level].toLowerCase()) +
      UI.pill(terrDiff ? 'info' : 'info', 'Sur Terre : ' + ev.terrestrial.label) + '</div></div>';
    h += '<p class="reading-title">' + esc(title) + '</p>';
    if (doc && ex.text.doctorLines) h += '<div class="reading-text doc-lines">' + ex.text.doctorLines.map(l => '<p>' + esc(l) + '</p>').join('') + '</div>';
    else h += '<p class="reading-text">' + esc(body) + '</p>';
    h += UI.ruler(cfg, ev, { animate: !!opts.animate, who, width: UI.readingInner(opts.layout) });
    if (opts.layers !== false) h += layersList(A, cfg, ex, rec);
    if (opts.action !== false && ex.action) {
      h += '<div class="callout ' + (ev.level === 'normal' ? 'normal' : ev.level) + '" style="margin-top:16px"><p><b>À faire : </b>' + esc(H.T(A, ex.action)) + '</p></div>';
    }
    h += '</div>';
    return h;
  }
  V.reading = reading;

  function layersList(A, cfg, ex, rec) {
    const L = ex.layers, ev = ex.ev, doc = H.doc(A);
    const U = v => f.unit(v, cfg, 1);
    const sp = cfg.spatial;
    const ctxNames = ev.context.notes.map(k => D.contextLabels[k].toLowerCase());
    const items = [
      { name: 'Norme terrestre', val: U(L.steps[0].center), note: 'Point de départ : ' + cfg.terrestrial.text + '.' },
      { name: 'Effet du vol connu', val: U(L.steps[1].center), note: (sp.kind === 'none' ? 'Aucun décalage moyen retenu : ' + sp.crew + '.' : 'Décalage de ' + f.signed(L.delta, cfg.decimals + 1) + NB + cfg.unit + ' à ' + f.day(rec.t / DAY) + ' : ' + sp.crew + '.') + (doc ? ' ' + sp.doctor + '.' : ''), src: sp.source },
      { name: 'Référence personnelle avant le départ', val: U(L.steps[2].center), note: 'Moyenne de ' + L.preN + ' mesures au repos avant le vol, pondérée avec la norme : ' + U(L.preMu) + ', plus l’effet du vol.' },
      { name: 'Ajustement avec les mesures en vol', val: U(L.steps[3].center), note: L.n + ' mesure' + (L.n > 1 ? 's' : '') + ' en vol intégrée' + (L.n > 1 ? 's' : '') + (L.out ? ', ' + L.out + ' écartée' + (L.out > 1 ? 's' : '') + ' parce qu’elle' + (L.out > 1 ? 's étaient' : ' était') + ' hors plage' : '') + '. Écart avec la référence d’avant vol : ' + f.signed(L.adaptation, cfg.decimals + 1) + NB + cfg.unit + '.' + (doc ? ' Filtre bayésien (Kalman, niveau local) : chaque jour, la référence est prédite avec l’effet du vol attendu, puis corrigée par la mesure si elle est normale.' : '') },
      { name: 'Contexte du moment', val: ctxNames.length ? U(L.steps[4].center) : 'aucun', note: ctxNames.length ? 'Pris en compte : ' + ctxNames.join(', ') + '. Plage décalée de ' + f.signed(ev.context.offset, cfg.decimals + 1) + NB + cfg.unit + ' et élargie × ' + f.num(ev.context.tol, 1) + '.' : 'Aucun effort, stress ou médicament signalé avec cette mesure.' }
    ];
    let h = '<ol class="layers" aria-label="Comment AURA lit cette mesure">';
    items.forEach(it => {
      h += '<li><span class="l-name">' + esc(it.name) + '</span><span class="l-val">' + esc(it.val) + '</span><span class="l-note">' + esc(it.note) + (it.src ? ' ' + UI.src(it.src) + '.' : '') + '</span></li>';
    });
    h += '<li class="result"><span class="l-name">Plage attendue</span><span class="l-val">' + esc(H.range(cfg, ev.band)) + '</span><span class="l-note">' +
      esc(doc ? 'Centre ' + U(ev.center) + ', écart type prédictif ' + f.num(ev.sd, cfg.decimals + 1) + ', z = ' + f.signed(ev.z, 2) + '. Vigilance au-delà de 2,5 écarts types, alerte au-delà de 3,5, et toujours au-delà des seuils fixes.' : 'Au-delà, AURA passe en vigilance puis en alerte. Les seuils fixes de sécurité restent valables pour tout le monde.') +
      '</span></li></ol>';
    return h;
  }

  /* ------------------------------------------------------------------ */
  /* Tableau de l’équipage                                                */
  /* ------------------------------------------------------------------ */
  function crewTable(A) {
    const doc = H.doc(A);
    let h = '<div class="table-wrap"><table class="table stack"><thead><tr><th>Membre d’équipage</th>';
    METRICS.forEach(k => { h += '<th>' + esc(D.metrics[k].short) + '</th>'; });
    h += '<th>Bien-être (7 jours)</th><th>État</th></tr></thead><tbody>';
    D.crew.forEach(c => {
      const visible = H.canSee(A, c.id);
      h += '<tr class="clickable" data-href="#/equipage/' + c.id + '"><td><a href="#/equipage/' + c.id + '"><b>' + esc(c.name) + '</b></a>' + (c.id === A.s.me && !doc ? ' (vous)' : '') + '<span class="sub">' + esc(c.role) + '</span></td>';
      METRICS.forEach(k => {
        const cfg = D.metrics[k];
        const m = S.lastMeasurement(A.s, c.id, k);
        const dl = ' data-label="' + esc(cfg.short) + '"';
        if (!visible) { h += '<td class="faint small"' + dl + '>réservé</td>'; return; }
        if (!m) { h += '<td class="faint"' + dl + '>n.d.</td>'; return; }
        const terr = E.terrestrialReading(cfg, m.v);
        h += '<td' + dl + '><span class="val">' + esc(f.unit(m.v, cfg)) + '</span>' + (m.lv !== 'normal' ? ' ' + UI.pill(m.lv) : '') +
          '<span class="sub">' + (terr.level !== 'normal' ? 'sur Terre : ' + esc(terr.label) : 'dans la norme terrestre') + (doc ? ', z ' + esc(f.signed(m.z, 1)) : '') + '</span></td>';
      });
      if (!visible) h += '<td class="faint small" data-label="Bien-être">réservé</td>';
      else {
        const wb = E.analyzeWellbeing(A.s.wb.filter(w => w.a === c.id), H.today(A));
        h += '<td data-label="Bien-être">' + (wb.n7 ? 'humeur ' + esc(f.num(wb.mood7, 1)) + ' sur 5<span class="sub">sommeil ' + esc(f.hours(wb.sleep7)) + ' par nuit</span>' : '<span class="faint">pas de point</span>') + (wb.flags.length ? ' ' + UI.pill('vigilance', UI.plural(wb.flags.length, 'point')) : '') + '</td>';
      }
      const al = H.alertsFor(A, c.id);
      const top = al.find(a => a.lv === 'urgence') || al[0];
      h += '<td data-label="État">' + (top ? UI.pill(top.lv, visible ? (top.lv === 'urgence' ? 'Alerte' : 'Vigilance') : 'Suivi en cours') : UI.pill('normal', 'Rien à signaler')) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    if (!doc) h += '<p class="note" style="margin-top:8px">Les valeurs des autres membres d’équipage sont réservées au médecin de bord et à la personne concernée.</p>';
    return h;
  }
  V.crewTable = crewTable;

  function journal(A, n, filterA) {
    let items = A.s.journal.slice().sort((x, y) => y.t - x.t);
    if (filterA) items = items.filter(j => j.a === filterA);
    else { let seenReport = false; items = items.filter(j => { if (j.type !== 'rapport') return true; if (seenReport) return false; seenReport = true; return true; }); }
    if (!H.doc(A)) items = items.filter(j => !j.a || j.a === A.s.me || j.type === 'mission' || j.type === 'urgence');
    items = items.filter(j => j.t <= A.s.now).slice(0, n || 8);
    if (!items.length) return '<p class="empty">Rien pour le moment.</p>';
    return '<ul class="journal list">' + items.map(j => '<li><time>' + esc(f.when(j.t)) + '</time><span>' + esc(j.text) + '</span></li>').join('') + '</ul>';
  }
  V.journal = journal;

  /* ------------------------------------------------------------------ */
  /* À faire                                                              */
  /* ------------------------------------------------------------------ */
  function todoList(A) {
    const doc = H.doc(A), me = A.s.me;
    const items = [];
    S.pendingFollowUps(A.s).filter(ad => doc || ad.a === me).forEach(ad => {
      items.push('<li><div class="list-row"><div><span class="list-title">Noter l’effet : ' + esc(S.medById[ad.med].name) + '</span><div class="list-meta">Pris par ' + esc(H.who(A, ad.a)) + ' ' + esc(H.ago(A, ad.t)) + '</div></div><a class="btn small" href="#/pharmacie">Noter l’effet</a></div></li>');
    });
    A.s.todo.filter(td => td.kind === 'reprise' && (doc || td.a === me)).forEach(td => {
      items.push('<li><div class="list-row"><div><span class="list-title">Reprendre la mesure : ' + esc(D.metrics[td.k].lc) + '</span><div class="list-meta">' + esc(H.who(A, td.a)) + ', demandée ' + esc(H.ago(A, td.t)) + '</div></div><button class="btn small" data-act="retake" data-a="' + td.a + '" data-k="' + td.k + '" data-ref="' + td.ref + '">Reprendre</button></div></li>');
    });
    if (!doc) {
      const done = A.s.wb.some(w => w.a === me && Math.floor(w.t / DAY) === H.today(A) && w.src === 'saisie');
      if (!done) items.push('<li><div class="list-row"><div><span class="list-title">Faire votre point du jour</span><div class="list-meta">Humeur, stress, sommeil : deux minutes, réponses privées</div></div><a class="btn small" href="#/bien-etre">Faire le point</a></div></li>');
    } else {
      A.s.vals.filter(v => v.st === 'ouverte').forEach(v => {
        items.push('<li><div class="list-row"><div><span class="list-title">Valider une référence : ' + esc(D.metrics[v.k].lc) + ' de ' + esc(S.name(v.a)) + '</span><div class="list-meta">Décalage persistant depuis ' + esc(f.when(v.drift.since * DAY)) + '</div></div><a class="btn small" href="#/equipage/' + v.a + '?m=' + v.k + '">Examiner</a></div></li>');
      });
      D.crew.forEach(c => D.meds.forEach(m => {
        const r = S.responses(A.s, c.id, m.id);
        if (r.hint && !(A.s.factor[m.id].t)) items.push('<li><div class="list-row"><div><span class="list-title">Discuter la dose : ' + esc(m.name) + '</span><div class="list-meta">' + esc(c.name) + ' : effet partiel ou nul ' + (r.counts.aucun + r.counts.partiel) + ' fois sur ' + r.rated + '</div></div><a class="btn small" href="#/pharmacie">Voir</a></div></li>');
      }));
    }
    if (!items.length) return '<p class="empty">Rien à faire pour le moment.</p>';
    return '<ul class="list">' + items.join('') + '</ul>';
  }

  /* ------------------------------------------------------------------ */
  /* Vue d’ensemble                                                       */
  /* ------------------------------------------------------------------ */
  V.dashboard = function (A) {
    const s = A.s, doc = H.doc(A), d = H.today(A);
    const co2 = S.co2At(s, s.now), co2lv = E.co2Level(D.habitat.co2, co2);
    const rad = S.radTotalNow(s);
    const light = E.lightMinutes(D.mission, s.now / DAY);
    const blackout = E.isBlackout(D.mission, s.now / DAY);
    const pending = s.queue.filter(q => q.status === 'en attente' || q.status === 'bloqué').length;
    const phase = E.phaseAt(D.mission, s.now / DAY);
    let body = '';

    if (!doc) {
      const me = S.crewById[s.me];
      const last = S.lastMeasurement(s, s.me, 'temp');
      body += '<section class="section" aria-labelledby="hero-t"><div class="section-head"><div><h2 id="hero-t">Votre température ce matin</h2><p>La même valeur, lue de deux façons : avec la norme du sol, et avec votre référence en vol.</p></div><a class="btn quiet" href="#/equipage/' + s.me + '?m=temp">Voir l’historique</a></div>';
      body += last ? reading(A, last, { animate: true, layers: false }) : '<p class="empty">Pas encore de mesure.</p>';
      body += '</section>';
      body += '<section class="section"><div class="section-head"><div><h2>Vos autres mesures</h2></div><a class="btn quiet" href="#/saisie">Nouvelle mesure</a></div><div class="stats">';
      ['hr', 'spo2'].forEach(k => {
        const m = S.lastMeasurement(s, s.me, k), cfg = D.metrics[k];
        if (!m) return;
        const ex = S.explain(s, m);
        body += '<div class="stat"><div class="s-label">' + esc(cfg.label) + '</div><div class="s-value">' + esc(f.num(m.v, cfg.decimals)) + '<small>' + esc(cfg.unit) + '</small></div><div>' + UI.pill(m.lv, m.lv === 'normal' ? 'Normal pour vous' : UI.LEVEL[m.lv]) + '</div><div class="s-sub">Votre plage : ' + esc(H.range(cfg, ex.ev.band)) + '</div></div>';
      });
      const wb = E.analyzeWellbeing(s.wb.filter(w => w.a === s.me), d);
      const sleepFlag = wb.flags.find(x => x.code.indexOf('sommeil') === 0);
      body += '<div class="stat"><div class="s-label">Sommeil moyen (7 jours)</div><div class="s-value">' + esc(f.hours(wb.sleep7)) + '</div><div class="s-sub">' + (sleepFlag ? esc(sleepFlag.crew) : 'Dans vos habitudes de la mission.') + '</div></div>';
      body += '<div class="stat"><div class="s-label">Dose de radiation depuis le départ</div><div class="s-value">' + esc(f.num(rad, 0)) + '<small>mSv</small></div><div class="s-sub">Limite de carrière : 600 mSv</div></div>';
      body += '</div></section>';
      body += H.section('À faire', null, todoList(A));
      body += H.section('Votre équipage', null, crewTable(A));
    } else {
      const open = H.openAlerts(A);
      const vals = s.vals.filter(v => v.st === 'ouverte').length + S.pendingFollowUps(s).length;
      body += '<section class="section"><div class="stats">' +
        '<div class="stat"><div class="s-label">Alertes ouvertes</div><div class="s-value">' + open.length + '</div><div class="s-sub">' + (open.length ? esc(open[0].title) : 'Aucune') + '</div></div>' +
        '<div class="stat"><div class="s-label">À examiner ou noter</div><div class="s-value">' + vals + '</div><div class="s-sub">validations et suivis de traitement</div></div>' +
        '<div class="stat"><div class="s-label">CO₂ cabine (1 h)</div><div class="s-value">' + esc(f.num(co2, 1)) + '<small>mmHg</small></div><div>' + UI.pill(co2lv, co2lv === 'normal' ? 'Sous la limite de 3 mmHg' : 'Au-dessus de 3 mmHg') + '</div></div>' +
        '<div class="stat"><div class="s-label">Dose cumulée par personne</div><div class="s-value">' + esc(f.num(rad, 0)) + '<small>mSv</small></div><div class="meter' + (rad > 480 ? ' alert' : rad > 300 ? ' watch' : '') + '"><span style="width:' + Math.min(100, rad / 6).toFixed(1) + '%"></span></div><div class="s-sub">sur 600 mSv de limite de carrière</div></div>' +
        '</div></section>';
      body += H.section('Équipage', 'Chaque valeur est lue avec la référence en vol de la personne. La ligne grise rappelle ce que dirait la norme du sol.', crewTable(A));
      body += '<div class="cols">' +
        '<section class="section"><div class="section-head"><div><h2>Alertes ouvertes</h2></div><a class="btn quiet" href="#/alertes">Toutes les alertes</a></div>' + alertList(A, open.slice(0, 4), true) + '</section>' +
        '<section class="section"><div class="section-head"><div><h2>À examiner</h2></div></div>' + todoList(A) + '</section></div>';
    }
    body += '<div class="cols">' +
      '<section class="section"><div class="section-head"><div><h2>Habitat et liaison</h2></div><a class="btn quiet" href="#/liaison">Liaison Terre</a></div><dl class="kv">' +
      '<dt>Phase</dt><dd>' + esc(phase.label) + ', gravité ' + esc(phase.gravity ? f.num(phase.gravity, 2) + ' g' : 'nulle') + '</dd>' +
      '<dt>CO₂ cabine</dt><dd>' + esc(f.num(co2, 1)) + ' mmHg ' + UI.pill(co2lv, co2lv === 'normal' ? 'normal' : 'au-dessus de la limite') + '</dd>' +
      '<dt>Délai radio</dt><dd>' + esc(f.dur(light)) + ' dans chaque sens</dd>' +
      '<dt>Liaison</dt><dd>' + (blackout ? UI.pill('urgence', 'coupée (conjonction solaire)') : UI.pill('normal', 'établie')) + '</dd>' +
      '<dt>Messages en file</dt><dd>' + pending + '</dd></dl></section>' +
      '<section class="section"><div class="section-head"><div><h2>Journal de bord</h2></div></div>' + journal(A, 7) + '</section></div>';

    const lead = doc ? 'Médecin de bord : ' + esc(S.name('a3')) + '. Heure de bord ' + esc(f.when(s.now)) + '.'
      : 'Bonjour ' + esc(UI.first(S.name(s.me))) + '. Heure de bord ' + esc(f.when(s.now)) + ', ' + esc(phase.label.toLowerCase()) + '.';
    return H.page('Vue d’ensemble', lead, '<a class="btn primary" href="#/saisie">Nouvelle saisie</a>', body);
  };

  /* ------------------------------------------------------------------ */
  /* Équipage                                                             */
  /* ------------------------------------------------------------------ */
  V.crew = function (A) {
    const body = H.section('Les quatre membres d’équipage', 'Équipage fictif de démonstration. Cliquez sur une ligne pour ouvrir la fiche.', crewTable(A)) +
      H.section('Ce que montre ce tableau', null, '<div class="prose"><p>La norme du sol considère 37,7 °C comme une fébricule et 52 battements par minute comme une bradycardie. À bord, après plusieurs semaines de vol, ce sont des valeurs attendues pour certaines personnes. À l’inverse, un pouls de 92 au repos passe pour normal sur Terre, mais il est inhabituel pour un astronaute dont la référence est à 51.</p><p>AURA lit chaque valeur avec la référence de la personne, construite avant le départ puis ajustée chaque jour en vol, sans jamais franchir les seuils fixes de sécurité.</p></div>');
    return H.page('Équipage', 'Dernières mesures de chaque membre d’équipage, lues avec sa propre référence.', null, body);
  };

  /* ------------------------------------------------------------------ */
  /* Fiche astronaute                                                     */
  /* ------------------------------------------------------------------ */
  V.astronaut = function (A, id) {
    const s = A.s, c = S.crewById[id];
    if (!c) return H.page('Fiche introuvable', 'Ce membre d’équipage n’existe pas.', null, '<p><a href="#/equipage">Retour à l’équipage</a></p>');
    const doc = H.doc(A);
    if (!H.canSee(A, id)) {
      return H.page(c.name, esc(c.role), null, '<div class="callout"><p>Les données médicales de ' + esc(c.name) + ' sont visibles par ' + esc(UI.first(c.name)) + ' et par le médecin de bord. C’est la règle à bord : chacun voit ses propres mesures.</p><p><a href="#/equipage/' + s.me + '">Ouvrir votre fiche</a></p></div>');
    }
    const k = METRICS.indexOf(A.route.q.m) >= 0 ? A.route.q.m : 'temp';
    const cfg = D.metrics[k];
    const rangeDays = A.route.q.p === 'tout' ? null : A.route.q.p === '14' ? 14 : 30;
    let body = '<div class="tabs" role="tablist" aria-label="Mesure affichée">' + METRICS.map(m => '<a role="tab" href="#/equipage/' + id + '?m=' + m + (A.route.q.p ? '&p=' + A.route.q.p : '') + '" aria-selected="' + (m === k) + '">' + esc(D.metrics[m].short) + '</a>').join('') + '</div>';
    const last = S.lastMeasurement(s, id, k);
    body += '<section class="section" style="border-top:0;padding-top:0">' + (last ? reading(A, last, { animate: true }) : '<p class="empty">Pas encore de mesure.</p>') + '</section>';

    // Décisions du médecin
    const vals = s.vals.filter(v => v.a === id && v.k === k);
    const open = vals.filter(v => v.st === 'ouverte');
    if (open.length || (doc && vals.length)) {
      let vb = '';
      open.forEach(v => {
        const dr = v.drift;
        vb += '<div class="callout vigilance"><p><b>Décalage persistant depuis ' + esc(f.when(dr.since * DAY)) + '.</b> ' + (dr.kind === 'persistant' ? 'Plusieurs mesures de suite sont hors plage dans le même sens (' + esc(dr.values.map(x => f.num(x, cfg.decimals)).join(', ')) + ' ' + esc(cfg.unit) + '). Elles n’ont pas été intégrées à la référence.' : 'La référence s’éloigne de la trajectoire attendue pour le vol.') + '</p>' +
          (doc ? '<p>Si ce changement est physiologique et attendu, validez la nouvelle référence. Sinon, maintenez la référence actuelle : les alertes continueront.</p><div class="btn-row"><button class="btn primary" data-act="drift" data-id="' + v.id + '" data-decision="valider">Valider la nouvelle référence</button><button class="btn" data-act="drift" data-id="' + v.id + '" data-decision="maintenir">Maintenir la référence actuelle</button></div>' : '<p>Le médecin de bord doit décider si votre référence évolue.</p>') + '</div>';
      });
      vals.filter(v => v.st !== 'ouverte').forEach(v => { vb += '<p class="note">' + esc(f.when(v.dt)) + ' : ' + (v.st === 'validee' ? 'nouvelle référence validée' : 'référence maintenue') + ' par le médecin de bord.</p>'; });
      body += H.section('Décisions du médecin', 'AURA n’adapte jamais seul la référence quand les valeurs sortent de la plage : c’est une décision médicale.', vb);
    }

    // Historique
    const all = S.series(s, id, k, rangeDays ? Math.max(0, H.today(A) - rangeDays) : 0);
    const dense = all.length > 120;
    const pts = all.map(m => ({ x: m.t / DAY, y: m.v, level: m.lv, hide: dense && m.lv === 'normal', m }));
    const band = all.map(m => ({ x: m.t / DAY, lo: Math.max(cfg.plausible.min, m.c - E.Z_NORMAL * m.sd), hi: cfg.oneSided === 'low' ? Math.min(cfg.plausible.max, m.c + E.Z_NORMAL * m.sd) : m.c + E.Z_NORMAL * m.sd, c: m.c }));
    const terrHi = cfg.oneSided === 'low' ? cfg.plausible.max : cfg.terrestrial.high;
    const chart = all.length ? UI.xyChart({
      label: cfg.label + ' de ' + c.name + ', mesures en vol avec la plage AURA et la norme terrestre',
      height: 280, yTitle: cfg.unit,
      hrects: [{ lo: cfg.terrestrial.low, hi: terrHi, cls: 'terr-band' }],
      bands: [{ pts: band, cls: 'aura-band', center: true }],
      lines: [{ pts: pts.map(p => ({ x: p.x, y: p.y })), cls: 'series' + (dense ? '' : ''), endLabel: null }],
      dots: pts,
      yMax: cfg.oneSided === 'low' ? 100.5 : undefined,
      xFmt: v => f.day(v),
      hover: pts.map(p => ({ x: p.x, y: p.y, m: p.m })),
      tip: p => {
        const m = p.m, terr = E.terrestrialReading(cfg, m.v);
        return [f.unit(m.v, cfg), f.when(m.t), 'Lecture AURA : ' + UI.LEVEL[m.lv].toLowerCase() + ', plage ' + H.range(cfg, [m.c - E.Z_NORMAL * m.sd, m.c + E.Z_NORMAL * m.sd]), 'Sur Terre : ' + terr.label];
      },
      legend: '<div class="legend"><span><i class="key terr"></i>Norme terrestre</span><span><i class="key aura" style="opacity:.35"></i>Plage attendue AURA, jour par jour</span><span><i class="key dot"></i>Mesure</span><span><i class="key dot vigilance"></i>Vigilance</span><span><i class="key dot urgence"></i>Alerte</span></div>',
      table: { summary: 'Voir les ' + all.length + ' valeurs', head: ['Quand', 'Valeur', 'Plage AURA', 'Sur Terre', 'Lecture AURA'], num: false, rows: all.slice().reverse().map(m => [f.when(m.t), f.unit(m.v, cfg), H.range(cfg, [m.c - E.Z_NORMAL * m.sd, m.c + E.Z_NORMAL * m.sd]), E.terrestrialReading(cfg, m.v).label, UI.LEVEL[m.lv]]) }
    }) : '<p class="empty">Pas de données sur la période.</p>';
    const periods = [['14', '14 jours'], ['30', '30 jours'], ['tout', 'Depuis le départ']];
    const cur = A.route.q.p || '30';
    body += '<section class="section"><div class="section-head"><div><h2>Historique en vol</h2><p>La bande violette suit la référence de ' + esc(H.doc(A) ? UI.first(c.name) : (id === s.me ? 'vous' : UI.first(c.name))) + ' jour après jour. La bande grise reste la norme du sol.</p></div><div class="seg" role="group" aria-label="Période">' +
      periods.map(p => '<a href="#/equipage/' + id + '?m=' + k + '&p=' + p[0] + '" aria-pressed="' + (p[0] === cur) + '">' + p[1] + '</a>').join('') + '</div></div>' + chart + '</section>';

    // Médicaments
    const ads = s.admins.filter(a => a.a === id).slice().reverse();
    let mb = '';
    if (!ads.length) mb = '<p class="empty">Aucun médicament pris depuis le départ.</p>';
    else {
      mb += '<div class="table-wrap"><table class="table"><thead><tr><th>Quand</th><th>Médicament</th><th>Dose</th><th>Effet noté</th></tr></thead><tbody>';
      ads.slice(0, 12).forEach(a => {
        const med = S.medById[a.med];
        mb += '<tr><td class="nowrap">' + esc(f.when(a.t)) + '</td><td>' + esc(med.name) + '</td><td class="nowrap">' + esc(f.num(a.units, a.units % 1 ? 1 : 0) + ' ' + med.units + (a.units > 1 ? 's' : '')) + (a.f !== 1 ? '<span class="sub">facteur ' + esc(f.num(a.f, 2)) + '</span>' : '') + '</td><td>' + (a.effect ? esc({ aucun: 'Aucun effet', partiel: 'Effet partiel', complet: 'Effet complet' }[a.effect]) + (a.side ? '<span class="sub">' + esc(a.side) + '</span>' : '') : '<span class="faint">à noter</span>') + '</td></tr>';
      });
      mb += '</tbody></table></div>';
      if (doc) D.meds.forEach(m => { const r = S.responses(s, id, m.id); if (r.hint) mb += '<div class="callout vigilance" style="margin-top:12px"><p><b>' + esc(m.name) + ' : </b>' + esc(r.hint) + ' (' + r.counts.partiel + ' effet partiel, ' + r.counts.aucun + ' sans effet, ' + r.counts.complet + ' complet).</p><p><a href="#/pharmacie">Ouvrir la pharmacie</a></p></div>'; });
    }
    body += H.section('Médicaments', null, mb);
    body += H.section('Journal', null, journal(A, 8, id));
    return H.page(c.name, esc(c.role) + '. Référence d’avant vol établie sur 20 mesures au repos. Équipage fictif.', '<a class="btn" href="#/saisie?a=' + id + '&k=' + k + '">Nouvelle mesure</a>', body);
  };

  /* ------------------------------------------------------------------ */
  /* Nouvelle saisie : mesure ou symptôme                                 */
  /* ------------------------------------------------------------------ */
  V.entry = function (A) {
    const s = A.s, doc = H.doc(A);
    const type = A.route.q.type === 'symptome' ? 'symptome' : 'mesure';
    const fm = A.form.m, fy = A.form.sy;
    let body = '<div class="tabs" role="tablist"><a role="tab" href="#/saisie?type=mesure" aria-selected="' + (type === 'mesure') + '">Mesure</a><a role="tab" href="#/saisie?type=symptome" aria-selected="' + (type === 'symptome') + '">Symptôme</a></div>';

    if (type === 'mesure') {
      const cfg = D.metrics[fm.k];
      const ctxKeys = Object.keys(cfg.context || {});
      let form = '<form data-form="measure" class="entry-form" novalidate>';
      form += '<div class="field"><label for="m-a">Membre d’équipage</label><select id="m-a" name="a" data-change="form-m">' + H.crewOptions(A, fm.a) + '</select></div>';
      form += '<fieldset><legend>Mesure</legend><div class="choices">' + METRICS.map(k => '<label class="choice"><input type="radio" name="k" value="' + k + '" data-change="form-m"' + (k === fm.k ? ' checked' : '') + '><span>' + esc(D.metrics[k].label) + '</span></label>').join('') + '</div></fieldset>';
      form += '<div class="field"><label for="m-v">Valeur</label><div class="input-unit"><input id="m-v" name="v" type="number" inputmode="decimal" step="' + cfg.step + '" value="' + esc(fm.v) + '" aria-describedby="m-v-h"><span>' + esc(cfg.unit) + '</span></div><span class="hint" id="m-v-h">Laissez vide pour voir comment AURA gère une donnée manquante.</span></div>';
      form += '<fieldset><legend>Contexte</legend>' + ctxKeys.map(ck => '<label class="check"><input type="checkbox" name="ctx" value="' + ck + '"' + (fm.ctx[ck] ? ' checked' : '') + '><span>' + esc(D.contextLabels[ck]) + '</span></label>').join('') + '</fieldset>';
      if (fm.retakeOf) form += '<p class="note">Cette saisie reprend une mesure précédente.</p><input type="hidden" name="retakeOf" value="' + esc(fm.retakeOf) + '">';
      form += '<div class="btn-row"><button class="btn primary" type="submit">Analyser la mesure</button></div></form>';
      const ex = [
        ['a2', 'temp', '38.1', '38,1 °C pour Lucas Moreau'],
        ['a4', 'hr', '92', '92 bpm au repos pour Rafael Ortiz'],
        ['a4', 'hr', '52', '52 bpm pour Rafael Ortiz'],
        ['a1', 'temp', '45.3', '45,3 °C (valeur impossible)'],
        ['a2', 'spo2', '91', '91 % juste après une mesure normale'],
        ['a1', 'temp', '39.3', '39,3 °C (seuil fixe)'],
        ['a3', 'temp', '', 'Champ vide (donnée manquante)']
      ];
      form += '<div style="margin-top:22px"><p class="small muted" style="margin-bottom:8px">Exemples à essayer</p><div class="chips">' + ex.map(e => '<button type="button" class="chip" data-act="example" data-a="' + e[0] + '" data-k="' + e[1] + '" data-v="' + e[2] + '">' + esc(e[3]) + '</button>').join('') + '</div></div>';

      let result = '';
      const r = A.flash.m;
      if (r) result = measureResult(A, r);
      else result = '<div class="callout accent"><p><b>Comment AURA lit une mesure.</b> La valeur est comparée à la norme du sol, puis à la plage attendue pour cette personne à ce moment du vol. Les cinq étapes du calcul s’affichent avec le résultat.</p></div>' + UI.sources(['stahn2017']);
      body += '<div class="cols-wide" style="align-items:start"><div aria-live="polite" id="result">' + result + '</div><div>' + form + '</div></div>';
    } else {
      let form = '<form data-form="symptom" novalidate>';
      form += '<div class="field"><label for="s-a">Membre d’équipage</label><select id="s-a" name="a" data-change="form-sy">' + H.crewOptions(A, fy.a) + '</select></div>';
      form += '<fieldset><legend>Ce que vous ressentez</legend><div class="choices">' + D.symptoms.map(x => '<label class="choice"><input type="radio" name="sym" value="' + x.id + '" data-change="form-sy"' + (x.id === fy.sym ? ' checked' : '') + '><span>' + esc(x.label) + '</span></label>').join('') + '</div></fieldset>';
      form += '<div class="field"><label for="s-i">Intensité : <output id="s-io">' + fy.intensity + '</output> sur 10</label><input id="s-i" name="intensity" type="range" min="0" max="10" step="1" value="' + fy.intensity + '" data-change="intensity" style="max-width:320px;accent-color:var(--accent)"></div>';
      form += '<div class="field"><label for="s-n">Précisions (facultatif)</label><textarea id="s-n" name="note" placeholder="Depuis quand, ce qui aggrave ou soulage">' + esc(fy.note || '') + '</textarea></div>';
      form += '<div class="btn-row"><button class="btn primary" type="submit">Analyser le symptôme</button></div></form>';
      const r = A.flash.sy;
      const result = r ? symptomResult(A, r) : '<div class="callout accent"><p><b>Le contexte du vol d’abord.</b> AURA relie ce que vous ressentez aux conditions de la mission : CO₂ de la cabine, sommeil récent, jours depuis un changement de gravité, dernière température. Les actions sans médicament passent en premier.</p></div>';
      body += '<div class="cols-wide" style="align-items:start"><div aria-live="polite" id="result">' + result + '</div><div>' + form + '</div></div>';
    }
    return H.page('Nouvelle saisie', doc ? 'Saisir une mesure ou un symptôme pour un membre d’équipage.' : 'Saisissez une mesure ou dites ce que vous ressentez. AURA l’interprète avec les conditions du vol.', null, body);
  };

  function measureResult(A, r) {
    const cfg = D.metrics[r.k];
    if (r.status === 'missing') return '<div class="callout"><p><b>Aucune valeur : rien n’a été enregistré.</b></p><p>' + (H.doc(A) ? 'Contrôle 2 (donnée manquante) : pas de mise à jour du filtre, la dernière référence reste utilisée, aucune erreur bloquante.' : 'La plateforme continue de fonctionner avec la dernière référence connue. Reprenez la mesure quand le capteur est disponible.') + '</p></div>';
    if (r.status === 'rejected') return '<div class="callout urgence"><p><b>Valeur impossible ignorée : ' + esc(f.unit(r.v, cfg)) + '.</b></p><p>' + esc(H.doc(A) ? 'Contrôle 1 (plausibilité) : hors de la plage physiologique ' + f.num(cfg.plausible.min, 0) + ' à ' + f.num(cfg.plausible.max, 0) + ' ' + cfg.unit + '. Non enregistrée, n’entre pas dans la référence.' : 'Une telle valeur ne peut pas venir du corps humain : le capteur ou la saisie est en cause. Elle n’a pas été enregistrée et ne fausse pas votre référence.') + '</p></div>' + UI.sources(['aura']);
    if (r.status === 'retake') return '<div class="callout vigilance"><p><b>Reprenez la mesure avant toute conclusion.</b></p><p>' + esc(H.doc(A) ? 'Contrôle 3 (valeur isolée) : |z| > 4 juste après une mesure normale, sans contexte. Alerte suspendue jusqu’à confirmation.' : 'Cette valeur est très éloignée de vos mesures récentes, sans raison apparente. Le plus souvent, c’est un capteur mal placé. Si la deuxième mesure confirme, l’alerte part tout de suite.') + '</p><div class="btn-row"><button class="btn primary" data-act="retake" data-a="' + r.a + '" data-k="' + r.k + '" data-ref="' + r.id + '">Reprendre la mesure</button></div></div>' + UI.sources(['aura']);
    let h = reading(A, r.rec, { animate: true, fresh: r.fresh, layout: 'wide-left' });
    if (r.alertTitle) h += '<p class="note" style="margin-top:10px">' + esc(r.alertTitle) + ' : visible dans Alertes' + (r.emergency ? ', mode urgence déclenché' : '') + '.</p>';
    return h;
  }

  function symptomResult(A, r) {
    const doc = H.doc(A), an = r.analysis, sy = S.symptomById[r.sym];
    let h = '<div class="reading"><div class="reading-meta">' + esc(sy.label) + ', signalé par ' + esc(S.name(r.a)) + ', ' + esc(f.when(r.t)) + (r.intensity ? ', intensité ' + r.intensity + ' sur 10' : '') + '</div>';
    h += '<p class="reading-title">' + (an.level === 'vigilance' ? 'À montrer au médecin de bord' : 'Ce que la mission change pour ce symptôme') + '</p>';
    if (an.findings.length) {
      h += '<ul class="list" style="margin-top:6px">' + an.findings.map(x => '<li>' + esc(doc ? x.doctor : x.crew) + (x.source ? ' <span class="src">' + UI.src(x.source) + '</span>' : '') + '</li>').join('') + '</ul>';
    } else h += '<p class="muted">Pas de lien particulier avec les conditions du vol en ce moment.</p>';
    const adv = doc ? an.crewAdvice.concat(an.doctorAdvice) : an.crewAdvice;
    if (adv.length) h += '<h3 style="margin-top:16px">À faire, dans l’ordre</h3><ol style="padding-left:20px">' + adv.map(a => '<li style="margin:4px 0">' + esc(a) + '</li>').join('') + '</ol>';
    if (sy.meds.length) {
      h += '<h3 style="margin-top:16px">Si un médicament est nécessaire</h3><div class="table-wrap"><table class="table"><tbody>';
      sy.meds.forEach(mid => {
        const med = S.medById[mid], units = S.validatedUnits(A.s, mid), fac = A.s.factor[mid];
        const flags = E.medFlags(med, A.s.stock[mid], H.today(A), D.mission).filter(x => x.level !== 'info');
        h += '<tr><td><b>' + esc(med.name) + '</b><span class="sub">' + esc(med.use) + '</span></td><td class="nowrap">' + esc(f.num(units, units % 1 ? 1 : 0) + ' ' + med.units + (units > 1 ? 's' : '')) + '<span class="sub">dose validée' + (fac.f !== 1 ? ', facteur ' + esc(f.num(fac.f, 2)) : '') + '</span></td><td>' + flags.map(x => UI.pill(x.level, x.text)).join(' ') + '</td><td class="num">' +
          (A.ui.admin && A.ui.admin.med === mid ? adminForm(A, mid, r.a) : '<button class="btn small" data-act="admin-open" data-med="' + mid + '" data-a="' + r.a + '">Administrer</button>') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    if (sy.kb.length) h += '<p class="small" style="margin-top:14px">En savoir plus : ' + sy.kb.map(id => { const c = A.KB.cards.find(x => x.id === id); return c ? '<a href="#/questions?fiche=' + id + '">' + esc(c.title) + '</a>' : ''; }).filter(Boolean).join(', ') + '</p>';
    if (r.alertTitle) h += '<p class="note">' + esc(r.alertTitle) + ' : le médecin de bord est prévenu.</p>';
    return h + '</div>';
  }

  function adminForm(A, mid, a) {
    const med = S.medById[mid], units = S.validatedUnits(A.s, mid);
    return '<form data-form="administer" class="btn-row" style="justify-content:flex-end"><input type="hidden" name="med" value="' + mid + '"><label class="visually-hidden" for="ad-a-' + mid + '">Pour</label><select id="ad-a-' + mid + '" name="a">' + H.crewOptions(A, a || A.s.me) + '</select><label class="visually-hidden" for="ad-u-' + mid + '">Unités</label><input id="ad-u-' + mid + '" name="units" type="number" min="0.5" step="' + (med.units === 'comprimé' ? '0.5' : '1') + '" value="' + units + '" style="width:80px"><button class="btn small primary" type="submit">Confirmer</button><button class="btn small" type="button" data-act="admin-cancel">Annuler</button></form>';
  }
  V.adminForm = adminForm;

  /* ------------------------------------------------------------------ */
  /* Alertes et mode urgence                                              */
  /* ------------------------------------------------------------------ */
  function alertList(A, list, compact) {
    const doc = H.doc(A);
    if (!list.length) return '<p class="empty">Aucune alerte.</p>';
    return '<ul class="list">' + list.map(al => {
      const visible = !al.a || H.canSee(A, al.a);
      let h = '<li><div class="list-row"><div style="flex:1 1 320px;min-width:0"><div class="btn-row">' + UI.pill(al.lv) + '<span class="list-title">' + esc(visible ? al.title : 'Suivi médical en cours pour ' + S.name(al.a)) + '</span></div>';
      h += '<div class="list-meta">' + esc(f.when(al.t)) + (al.st === 'vue' ? ', vue' : '') + (al.st === 'close' ? ', close ' + esc(f.when(al.closeT)) : '') + '</div>';
      if (visible && !compact) h += '<p style="margin:6px 0 0">' + esc(doc ? al.doctor : al.crew) + '</p>';
      if (al.st === 'close' && al.closeNote && !compact) h += '<p class="note" style="margin:4px 0 0">' + esc(al.closeNote) + '</p>';
      h += '</div><div class="btn-row">';
      if (al.st === 'active' && visible) h += '<button class="btn small" data-act="see-alert" data-id="' + al.id + '">J’ai vu</button>';
      if (al.st !== 'close' && doc) {
        if (A.ui.closing === al.id) h += '<form data-form="close-alert" class="btn-row"><input type="hidden" name="id" value="' + al.id + '"><label class="visually-hidden" for="cl-' + al.id + '">Note de clôture</label><input id="cl-' + al.id + '" name="note" type="text" placeholder="Note de clôture" style="min-width:200px"><button class="btn small primary" type="submit">Clore</button></form>';
        else h += '<button class="btn small" data-act="close-open" data-id="' + al.id + '">Clore</button>';
      }
      return h + '</div></div></li>';
    }).join('') + '</ul>';
  }
  V.alertList = alertList;

  V.alerts = function (A) {
    const s = A.s, doc = H.doc(A);
    let body = '';
    if (s.emergency) {
      const em = s.emergency;
      const msg = s.queue.filter(q => q.prio === 1 && q.t >= em.t).sort((a, b) => a.t - b.t)[0];
      body += '<section class="section" style="border-top:0;padding-top:0"><div class="reading" style="border-color:var(--alert)"><div class="reading-head"><div><div class="reading-meta">Mode urgence depuis ' + esc(f.when(em.t)) + '</div><p class="reading-title" style="margin-top:4px">' + esc(em.title) + '</p><p class="muted" style="margin:0">' + esc(em.cause) + '</p></div>' + UI.pill('urgence', em.over ? 'Fin de l’événement' : 'En cours') + '</div>';
      body += '<ol class="layers" aria-label="Procédure">' + em.steps.map((st, i) => '<li><label class="check" style="padding:0"><input type="checkbox" data-act="step" data-i="' + i + '"' + (st.done ? ' checked' : '') + '><span class="l-name">' + esc(st.label) + '</span></label><span class="l-val">' + (st.done ? 'fait' : '') + '</span></li>').join('') + '</ol>';
      if (msg) body += '<p class="note" style="margin-top:12px">Message prioritaire vers la Terre : ' + esc(msg.status) + (msg.arrAt ? ', arrivée ' + (msg.arrAt <= s.now ? 'à ' : 'prévue à ') + esc(f.when(msg.arrAt)) : '') + '. Délai actuel : ' + esc(f.dur(E.lightMinutes(D.mission, s.now / DAY))) + ' dans chaque sens. L’équipage agit sans attendre la réponse.</p>';
      if (em.over) body += '<div class="callout normal" style="margin-top:12px"><p>L’événement est terminé depuis ' + esc(f.when(em.over)) + '. Vous pouvez quitter l’abri et terminer le mode urgence.</p></div>';
      const spe = em.kind === 'spe' ? S.speAt(s, s.now) : null;
      if (spe) body += '<p class="note" style="margin-top:12px">Débit de dose actuel : ' + esc(f.num(S.doseRateAt(s, s.now), 0)) + ' mSv par jour, soit ' + spe.factor + ' fois le niveau habituel. Fin prévue de l’éruption à ' + esc(f.when(spe.end)) + '.</p><div class="btn-row"><button class="btn" data-act="advance-to" data-t="' + (spe.end + 5) + '">Avancer jusqu’à la fin de l’éruption</button></div>';
      body += '<div class="btn-row" style="margin-top:14px"><button class="btn" data-act="end-emergency">Terminer le mode urgence</button></div>';
      body += UI.sources(em.kind === 'spe' ? ['ochmoRad'] : em.kind === 'co2' ? ['ochmoCo2'] : ['aura']) + '</div></section>';
    }
    const showAll = A.route.q.vue === 'toutes';
    const open = H.openAlerts(A);
    const list = showAll ? s.alerts.filter(a => a.t <= s.now).slice(0, 60) : open;
    body += '<section class="section"' + (s.emergency ? '' : ' style="border-top:0;padding-top:0"') + '><div class="tabs" role="tablist"><a role="tab" href="#/alertes" aria-selected="' + !showAll + '">Ouvertes (' + open.length + ')</a><a role="tab" href="#/alertes?vue=toutes" aria-selected="' + showAll + '">Historique</a></div>' + alertList(A, list, false) + '</section>';
    body += H.section('Exercices', 'Déclenchez une situation pour voir la réaction de la plateforme. Les exercices sont notés comme tels dans le journal.',
      '<div class="btn-row"><button class="btn" data-act="spe-now">Simuler une éruption solaire maintenant</button><button class="btn" data-act="drill" data-kind="co2">Exercice CO₂ critique</button><button class="btn" data-act="drill" data-kind="vital">Exercice valeur vitale critique</button></div>');
    body += H.section('Comment AURA décide d’alerter', null, '<div class="prose"><p><b>Vigilance</b> : la valeur sort de la plage attendue pour la personne (plus de 2,5 écarts types). Elle se referme seule si la mesure suivante est normale.</p><p><b>Alerte</b> : écart de plus de 3,5 écarts types, ou seuil fixe franchi (par exemple 39 °C, saturation sous 90 %, pouls de repos au-dessus de 120). Seul le médecin de bord la clôt.</p><p><b>Mode urgence</b> : seuil fixe franchi, éruption solaire ou CO₂ critique. La procédure s’affiche sur toutes les pages et un message prioritaire passe en tête de la file vers la Terre.</p></div>' + UI.sources(['aura', 'ochmoCo2', 'ochmoRad']));
    return H.page('Alertes', doc ? 'Alertes de l’équipage et de l’habitat, avec leur explication clinique.' : 'Ce qui demande votre attention, et pourquoi.', null, body);
  };
})(typeof self !== 'undefined' ? self : this);
