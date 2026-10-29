/* AURA : composants communs des pages.
   Les pages sont du HTML produit à partir de l’état. Les mots passent avant
   les chiffres, les détails restent repliés tant qu’on ne les demande pas. */
(function (root) {
  'use strict';
  const V = root.AURA_VIEWS = root.AURA_VIEWS || {};
  const D = root.AURA_DATA, E = root.AURA_ENGINE, S = root.AURA_STORE, UI = root.AURA_UI, AI = root.AURA_AI;
  const f = E.fmt, esc = UI.esc, NB = E.NBSP, DAY = 1440;
  const METRICS = ['temp', 'hr', 'spo2'];

  /* ------------------------------------------------------------------ */
  /* Aides                                                                */
  /* ------------------------------------------------------------------ */
  const H = V.H = {
    METRICS,
    role(A) { return A.s.role; },
    doc(A) { return A.s.role === 'doctor'; },
    ground(A) { return A.s.role === 'ground'; },
    crew(A) { return A.s.role === 'crew'; },
    today(A) { return Math.floor(A.s.now / DAY); },
    hour(A) { return Math.floor((A.s.now % DAY) / 60); },
    first(name) { return String(name || '').split(' ')[0]; },
    de(n) { return S.de(n); },
    // Minuscule après deux-points, sauf sigle (CO₂, SpO₂, EVA…)
    lc1(t) { t = String(t || ''); return /^[A-ZÀ-Ý][a-zà-ÿ’' ,]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t; },
    me(A) { return S.crewById[A.s.me]; },
    level(A) { return (A.set.level && A.set.level[A.s.role]) || (A.s.role === 'crew' ? 'simple' : 'medical'); },
    medical(A, key) { const m = H.level(A) === 'medical'; return key && A.ui.flip && A.ui.flip[key] ? !m : m; },
    T(A, o, key) { return H.medical(A, key) ? o.doctor : o.crew; },
    greet(A) { const h = H.hour(A); return h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir'; },
    moment(A) { const h = H.hour(A); return h >= 5 && h < 12 ? 'ce matin' : h < 18 ? 'aujourd’hui' : 'ce soir'; },
    ago(A, t) {
      const d = A.s.now - t;
      if (d < 1) return 'à l’instant';
      if (d < 60) return 'il y a ' + Math.round(d) + NB + 'min';
      if (Math.floor(t / DAY) === Math.floor(A.s.now / DAY)) return 'à ' + f.clock(t % DAY);
      if (Math.floor(t / DAY) === Math.floor(A.s.now / DAY) - 1) return 'hier à ' + f.clock(t % DAY);
      return f.when(t);
    },
    since(A, t) {
      const d = Math.max(0, A.s.now - t);
      if (d < 1) return 'à l’instant';
      if (d < 60) return 'il y a ' + Math.round(d) + NB + 'min';
      if (d < 1440) return 'il y a ' + f.hours(d / 60);
      return 'il y a ' + f.num(d / 1440, 1) + NB + 'jours';
    },
    who(A, id) { return (H.crew(A) && id === A.s.me) ? 'vous' : S.name(id); },
    canSee(A, id) { return !H.crew(A) || id === A.s.me; },
    range(cfg, band) { return cfg.oneSided === 'low' ? 'au-dessus de ' + f.unit(band[0], cfg) : 'de ' + f.unit(band[0], cfg) + ' à ' + f.unit(band[1], cfg); },
    crewOptions(A, sel) {
      return D.crew.map(c => '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + (c.id === A.s.me && H.crew(A) ? ' (vous)' : '') + '</option>').join('');
    },
    unitsTxt(n, med) { return f.num(n, n % 1 ? 1 : 0) + NB + med.units + (n > 1 ? 's' : ''); },
    phaseText(A) {
      const day = A.s.now / DAY, ph = E.phaseAt(D.mission, day);
      return ph.id === 'aller' ? 'En route vers Mars' : ph.id === 'surface' ? 'Sur Mars' : 'Retour vers la Terre';
    },
    earthLine(A) {
      const day = A.s.now / DAY, L = E.lightMinutes(D.mission, day);
      if (E.isBlackout(D.mission, day)) return 'La liaison avec la Terre est coupée jusqu’à ' + f.day(D.mission.conjunction.end) + ' ; tout continue à bord.';
      return 'La Terre reçoit vos messages en ' + f.delay(L) + '.';
    },
    // Coquille de page
    page(o) {
      let h = '<div class="page' + (o.calm ? ' calm' : '') + '">';
      h += '<header class="page-head"><div>';
      h += '<h1 id="page-title" tabindex="-1" class="' + (o.hello ? 'hello' : 'page-title') + '">' + esc(o.title) + '</h1>';
      if (o.state) h += o.state;
      else if (o.lead) h += '<p class="lead">' + o.lead + '</p>';
      h += '</div>' + (o.actions ? '<div class="btn-row">' + o.actions + '</div>' : '') + '</header>';
      return h + o.body + '</div>';
    },
    state(level, text, sub, opts) {
      opts = opts || {};
      return '<div class="state">' + UI.orb(level, { live: opts.live !== false }) + '<p class="state-text">' + esc(text) + '</p></div>' + (sub ? '<p class="state-sub">' + sub + '</p>' : '');
    },
    section(title, sub, body, opts) {
      opts = opts || {};
      return '<section class="section"' + (opts.id ? ' id="' + opts.id + '"' : '') + '><div class="section-head"><div><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (opts.right || '') + '</div>' + body + '</section>';
    },
    flipLink(A, key) {
      const m = H.medical(A, key);
      return '<button type="button" class="btn quiet sm" data-act="flip" data-key="' + esc(key) + '">' + (m ? 'Voir en langage simple' : 'Voir en langage médical') + '</button>';
    },
    mark(state) { return state === 'ok' ? '✓' : state === 'warn' ? '!' : state === 'no' ? '✕' : 'i'; }
  };

  /* ------------------------------------------------------------------ */
  /* Lecture d’une mesure                                                 */
  /* ------------------------------------------------------------------ */
  function word(rec, cfg, medical) {
    if (medical) return rec.lv === 'normal' ? 'Dans la plage attendue' : rec.lv === 'vigilance' ? 'Vigilance' : 'Alerte';
    const fem = rec.k === 'temp' || rec.k === 'spo2';
    if (rec.lv === 'normal') return fem ? 'Habituelle pour vous' : 'Habituel pour vous';
    if (rec.lv === 'vigilance') {
      const up = rec.z > 0;
      return (up ? 'Un peu haut' : 'Un peu bas') + (fem ? 'e' : '') + ' pour vous';
    }
    return 'À regarder maintenant';
  }
  V.word = word;

  function layersList(A, cfg, ex, rec) {
    const L = ex.layers, ev = ex.ev, doc = H.medical(A);
    const U = v => f.unit(v, cfg, 1);
    const sp = cfg.spatial;
    const ctxNames = ev.context.notes.map(k => D.contextLabels[k].toLowerCase());
    const items = [
      { name: 'Norme terrestre', val: U(L.steps[0].center), note: 'Point de départ : ' + cfg.terrestrial.text + '.' },
      { name: 'Effet connu du vol', val: U(L.steps[1].center), note: (sp.kind === 'none' ? 'Aucun décalage moyen retenu : ' + sp.crew + '.' : 'Décalage de ' + f.signed(L.delta, cfg.decimals + 1) + NB + cfg.unit + ' à ' + f.day(rec.t / DAY) + ' : ' + sp.crew + '.') + (doc ? ' ' + sp.doctor + '.' : ''), src: sp.source },
      { name: 'Référence de la personne avant le départ', val: U(L.steps[2].center), note: 'Moyenne de ' + L.preN + ' mesures au repos avant le vol, pondérée avec la norme : ' + U(L.preMu) + ', plus l’effet du vol.' },
      { name: 'Ajustement avec les mesures en vol', val: U(L.steps[3].center), note: L.n + ' mesure' + (L.n > 1 ? 's' : '') + ' en vol intégrée' + (L.n > 1 ? 's' : '') + (L.out ? ', ' + L.out + ' écartée' + (L.out > 1 ? 's' : '') + ' parce qu’' + (L.out > 1 ? 'elles étaient' : 'elle était') + ' hors plage' : '') + '. Écart avec la référence d’avant vol : ' + f.signed(L.adaptation, cfg.decimals + 1) + NB + cfg.unit + '.' + (doc ? ' Filtre bayésien (Kalman, niveau local) : la référence est prédite chaque jour avec l’effet attendu du vol, puis corrigée par la mesure si elle est normale.' : '') },
      { name: 'Contexte du moment', val: ctxNames.length ? U(L.steps[4].center) : 'aucun', note: ctxNames.length ? 'Pris en compte : ' + ctxNames.join(', ') + '. Plage décalée de ' + f.signed(ev.context.offset, cfg.decimals + 1) + NB + cfg.unit + ' et élargie × ' + f.num(ev.context.tol, 1) + '.' : 'Aucun effort, stress ou médicament signalé avec cette mesure.' }
    ];
    let h = '<ol class="layers" aria-label="Les cinq étapes de la lecture">';
    items.forEach(it => {
      h += '<li><span class="l-name">' + esc(it.name) + '</span><span class="l-val">' + esc(it.val) + '</span><span class="l-note">' + esc(it.note) + (it.src ? ' ' + UI.src(it.src) + '.' : '') + '</span></li>';
    });
    h += '<li class="result"><span class="l-name">Plage attendue</span><span class="l-val">' + esc(H.range(cfg, ev.band)) + '</span><span class="l-note">' +
      esc(doc ? 'Centre ' + U(ev.center) + ', écart type prédictif ' + f.num(ev.sd, cfg.decimals + 1) + ', z = ' + f.signed(ev.z, 2) + '. Vigilance au-delà de 2,5 écarts types, alerte au-delà de 3,5, et toujours au-delà des seuils fixes.' : 'Au-delà, AURA passe en vigilance, puis en alerte. Les seuils fixes de sécurité restent les mêmes pour tout le monde.') +
      '</span></li></ol>';
    return h;
  }
  V.layersList = layersList;

  // Carte de résultat : la valeur, un titre, une phrase, et le détail replié
  function reading(A, rec, opts) {
    opts = opts || {};
    const cfg = D.metrics[rec.k];
    const ex = opts.fresh || S.explain(A.s, rec);
    const ev = ex.ev;
    const key = 'r-' + rec.id;
    const med = H.medical(A, key);
    const title = med ? ex.text.doctorTitle : ex.text.crewTitle;
    const self = H.crew(A) && rec.a === A.s.me;
    let h = '<div class="panel reading-card">';
    h += '<div class="row"><div class="row-meta">' + esc(cfg.label + (self ? '' : ' ' + H.de(S.name(rec.a)))) + ', ' + esc(f.when(rec.t)) + (rec.src === 'sim' ? ' (capteur)' : '') + '</div>' + H.flipLink(A, key) + '</div>';
    h += '<div class="result-head" style="margin-top:8px"><div class="result-value">' + esc(f.num(rec.v, cfg.decimals)) + '<small>' + esc(cfg.unit) + '</small></div>' + (med ? UI.pill(ev.level, ev.level === 'normal' ? 'Dans la plage attendue' : UI.LEVEL[ev.level]) : '') + '</div>';
    h += '<p class="result-title">' + UI.orb(ev.level, { live: ev.level !== 'normal' }) + '<span>' + esc(title) + '</span></p>';
    if (med && ex.text.doctorLines) h += '<div class="result-text doc-lines">' + ex.text.doctorLines.map(l => '<p>' + esc(l) + '</p>').join('') + '</div>';
    else h += '<p class="result-text">' + esc(ex.text.crew) + '</p>';
    if (opts.action !== false && ex.action) {
      const act = med ? ex.action.doctor : ex.action.crew;
      h += '<div class="callout ' + (ev.level === 'normal' ? 'calm' : ev.level === 'vigilance' ? 'attention' : 'urgent') + '" style="margin-top:16px"><p><b>' + (ev.level === 'normal' ? 'À faire : ' : 'Ce que vous pouvez faire : ') + '</b>' + esc(H.lc1(act)) + '</p></div>';
    }
    h += '<details class="disclose"' + (opts.open ? ' open' : '') + '><summary>Comment AURA a lu cette mesure</summary>';
    h += '<p class="small muted" style="margin-top:4px">La même valeur, lue de deux façons : avec la norme du sol, et avec la référence de la personne à ce moment du vol.</p>';
    h += UI.ruler(cfg, ev, { animate: !!opts.animate, who: (H.crew(A) && rec.a === A.s.me ? 'vous, à ' : S.name(rec.a) + ', à ') + f.day(rec.t / DAY), width: UI.readingInner(opts.layout || 'calm') });
    h += layersList(A, cfg, ex, rec);
    h += UI.sources([cfg.spatial.source, 'aura'].filter(Boolean));
    h += '</details></div>';
    return h;
  }
  V.reading = reading;

  /* ------------------------------------------------------------------ */
  /* Mesures d’une personne : trois colonnes calmes                       */
  /* ------------------------------------------------------------------ */
  function vitals(A, a, opts) {
    opts = opts || {};
    let h = '<div class="vitals">';
    METRICS.forEach(k => {
      const cfg = D.metrics[k];
      const m = S.lastMeasurement(A.s, a, k);
      const href = '#/dossier/' + a + '?m=' + k;
      if (!m) { h += '<a class="vital" href="' + href + '"><div class="vital-label">' + esc(cfg.short) + '</div><div class="vital-value faint">n.d.</div><div class="vital-earth">Pas encore de mesure</div></a>'; return; }
      const ex = S.explain(A.s, m);
      const terr = ex.ev.terrestrial;
      const med = H.medical(A);
      h += '<a class="vital" href="' + href + '" aria-label="' + esc(cfg.label + ' : ' + f.unit(m.v, cfg) + ', ' + word(m, cfg, med)) + '">';
      h += '<div class="vital-label">' + esc(k === 'spo2' ? 'Oxygène (SpO₂)' : cfg.short) + '</div>';
      h += '<div class="vital-value">' + esc(f.num(m.v, cfg.decimals)) + '<small>' + esc(cfg.unit) + '</small></div>';
      h += '<div class="vital-word' + (m.lv === 'vigilance' ? ' attention' : m.lv === 'urgence' ? ' urgent' : '') + '">' + esc(word(m, cfg, med)) + '</div>';
      h += UI.abar(cfg, ex.ev);
      h += '<div class="vital-earth">' + (terr.level !== 'normal' ? 'Sur Terre, on dirait : ' + esc(terr.label) : 'Sur Terre aussi : dans la norme') + ', ' + esc(H.ago(A, m.t)) + '</div>';
      h += '</a>';
    });
    return h + '</div>';
  }
  V.vitals = vitals;

  // État d’une personne, en une phrase (vue médecin)
  function personStatus(A, id) {
    const s = A.s;
    const al = s.alerts.filter(x => x.st !== 'close' && x.a === id);
    const top = al.find(x => x.lv === 'urgence') || al[0];
    const wbs = S.wellbeingState(s, id);
    const drift = s.vals.find(v => v.a === id && v.st === 'ouverte');
    const fu = S.pendingFollowUps(s).filter(x => x.a === id).length;
    if (s.emergency && s.emergency.a === id) return { level: 'urgence', text: s.emergency.title + ' : procédure en cours.' };
    if (top) {
      let text;
      if (top.kind === 'mesure') text = D.metrics[top.k].short + (top.lv === 'urgence' ? ' : alerte en cours.' : ' un peu en dehors de sa zone.');
      else if (top.kind === 'symptome') { const sy = S.symptomById[(top.ref || '').split(':')[1]]; text = 'Symptôme signalé : ' + (sy ? sy.label.toLowerCase() : 'à voir') + '.'; }
      else if (top.kind === 'alarme') text = top.title.replace(/ \(.+\)$/, '') + '.';
      else text = top.title + '.';
      return { level: top.lv, text };
    }
    if (drift) return { level: 'vigilance', text: 'Décalage durable de la ' + D.metrics[drift.k].lc + ' : référence à valider.' };
    if (wbs.level !== 'none') {
      const fl = wbs.flags[0];
      return { level: 'vigilance', text: (fl.code.indexOf('sommeil') === 0 ? 'Sommeil plus court depuis quelques jours' : fl.code === 'reaction' ? 'Temps de réaction plus lent que d’habitude' : fl.code.indexOf('humeur') === 0 ? 'Moral plus bas que d’habitude' : 'À accompagner cette semaine') + '.' };
    }
    if (fu) return { level: 'normal', text: 'Dans sa zone. Un suivi de traitement à noter.' };
    return { level: 'normal', text: 'Dans sa zone.' };
  }
  V.personStatus = personStatus;

  function personPanel(A, c) {
    const st = personStatus(A, c.id);
    const wb = S.wellbeingState(A.s, c.id);
    let h = '<a class="person" href="#/dossier/' + c.id + '">';
    h += '<div class="person-head">' + UI.avatar(c.name, { lg: true }) + '<div style="flex:1;min-width:0"><div class="person-name">' + esc(c.name) + '</div><div class="person-role">' + esc(c.role) + (c.backup ? ', suppléante médicale' : '') + '</div></div>' + UI.orb(st.level, { live: st.level !== 'normal' }) + '</div>';
    h += '<p class="person-state' + (st.level === 'vigilance' ? ' attention' : st.level === 'urgence' ? ' urgent' : '') + '">' + esc(st.text) + '</p>';
    h += '<div class="mini-vitals">';
    METRICS.forEach(k => {
      const cfg = D.metrics[k], m = S.lastMeasurement(A.s, c.id, k);
      h += '<div><div class="mv-label">' + esc(k === 'spo2' ? 'SpO₂' : k === 'hr' ? 'Pouls' : 'Temp.') + '</div>';
      if (m) { const ex = S.explain(A.s, m); h += '<div class="mv-value">' + esc(f.unit(m.v, cfg)) + '</div>' + UI.abar(cfg, ex.ev); }
      else h += '<div class="mv-value faint">n.d.</div>';
      h += '</div>';
    });
    h += '</div>';
    h += '<div class="person-foot">' + (wb.an.n7 ? 'Sommeil ' + esc(f.hours(wb.an.sleep7)) + ', moral ' + esc(f.num(wb.an.mood7, 1)) + ' sur 5' : 'Pas de point du soir cette semaine') + (wb.rt.last ? ', réaction ' + esc(f.num(wb.rt.last.median, 0)) + NB + 'ms' : '') + '</div>';
    const cst = S.conferenceStatus(A.s, c.id);
    h += '<div class="person-foot" style="margin-top:4px">Conférence : ' + esc(cst.done ? H.lc1(H.confHistoryLine(cst).replace(/\.$/, '')) : (cst.mode === 'ia' ? 'avec l’IA, ' : cst.mode === 'direct' ? 'en direct, ' : 'avec le médecin au sol, ') + (cst.state === 'non faite' ? 'non faite' : H.confWhen(A, cst.t))) + '</div>';
    return h + '</a>';
  }
  V.personPanel = personPanel;

  /* ------------------------------------------------------------------ */
  /* Conférence médicale de la semaine : libellés communs                 */
  /* ------------------------------------------------------------------ */
  const CONF = D.conference;
  // Qui mène la conférence
  function confModePill(st) {
    if (st.mode === 'direct') return UI.pill('normal', 'Avec le médecin au sol');
    if (st.mode === 'differe') return UI.pill('normal', 'Avec le médecin, en différé');
    return UI.pill('info', 'Avec AURA');
  }
  // Où en est la conférence, vue du vaisseau
  function confStatePill(st, opts) {
    opts = opts || {};
    const map = {
      'faite': ['normal', 'Faite'], 'prête': ['info', 'À faire cette semaine'], 'en cours': ['info', 'En cours'], 'à venir': ['info', 'À venir'],
      'questions en route': ['info', 'Questions en route'], 'non faite': [opts.doctor ? 'vigilance' : 'info', 'Non faite'], 'interrompue': ['urgence', 'Interrompue : signe d’alarme']
    };
    const m = map[st.state] || ['info', st.state];
    return UI.pill(m[0], m[1]);
  }
  function confReason(st) { return st.reason && CONF.reasons[st.reason] ? CONF.reasons[st.reason] : ''; }
  // Phrase courte : « J+58 à 18:00 », ou « aujourd’hui à 18:00 »
  function confWhen(A, t) {
    const d = Math.floor(t / DAY), today = H.today(A);
    const clock = f.clock(t % DAY);
    if (d === today) return 'aujourd’hui à ' + clock;
    if (d === today + 1) return 'demain à ' + clock;
    if (d === today - 1) return 'hier à ' + clock;
    return f.day(d) + ' à ' + clock;
  }
  // Ce que fait la conférence de la semaine passée, en une ligne
  function confHistoryLine(st) {
    const r = st.rec;
    if (st.state === 'non faite') return 'Non faite.';
    if (!r) return 'Pas de conférence enregistrée.';
    const when = f.day(Math.floor((r.tSent || r.tDone || r.t) / DAY));
    if (r.mode === 'direct') return 'Faite à ' + when + ' en visioconférence avec le médecin au sol.';
    if (r.mode === 'differe') return 'Faite à ' + when + ' avec le médecin au sol, en différé' + (r.status === 'gardé à bord' ? ', rien n’a été envoyé.' : '.');
    return 'Faite à ' + when + ' avec AURA, l’IA du vaisseau' + (r.reason && CONF.reasons[r.reason] ? ' : ' + CONF.reasons[r.reason] : '') + (r.status === 'gardé à bord' ? ', rien n’a été envoyé.' : '.');
  }
  Object.assign(H, { confModePill, confStatePill, confReason, confWhen, confHistoryLine });

  // Les périodes de la mission : qui peut mener la conférence
  function confBand(A) {
    const W = Math.round(Math.max(320, UI.layoutWidth())), Hh = 112, x = UI.linear(0, D.mission.durationDays, 8, W - 8);
    const now = A.s.now / DAY;
    const runs = S.modeTimeline();
    const LAB = { direct: 'Médecin', differe: 'En différé', ia: 'Avec AURA, l’IA du vaisseau', coupure: 'Coupure' };
    let s = '<svg class="arch conf-band" viewBox="0 0 ' + W + ' ' + Hh + '" width="' + W + '" height="' + Hh + '" role="img" aria-label="Qui mène la conférence de la semaine au fil de la mission : en direct, en différé avec le médecin au sol, ou avec l’IA du vaisseau">';
    runs.forEach(r => {
      const x0 = x(r.start), x1 = x(r.end), w = Math.max(2, x1 - x0);
      s += '<rect x="' + x0.toFixed(1) + '" y="34" width="' + w.toFixed(1) + '" height="24" rx="5" class="cb-' + r.id + '"/>';
      if (w > 64) s += '<text x="' + (x0 + w / 2).toFixed(1) + '" y="50" class="t-sub cb-t-' + r.id + '" text-anchor="middle">' + esc(LAB[r.id]) + '</text>';
    });
    // Repères de jours
    [0, 180, 360, 540, 720, 900].forEach(d => { s += '<text x="' + x(d).toFixed(1) + '" y="78" class="t-sub" text-anchor="' + (d === 0 ? 'start' : d === 900 ? 'end' : 'middle') + '">' + esc(f.day(d)) + '</text>'; });
    s += '<path d="M' + (x(now) - 6).toFixed(1) + ' 21 L' + (x(now) + 6).toFixed(1) + ' 21 L' + x(now).toFixed(1) + ' 30 Z" style="fill:var(--aura);stroke:none"/>';
    s += '<text x="' + x(now).toFixed(1) + '" y="14" class="t-head" text-anchor="' + (now > 800 ? 'end' : now < 60 ? 'start' : 'middle') + '" style="fill:var(--aura-ink)">' + esc(f.day(now)) + ', aujourd’hui</text>';
    s += '</svg>';
    const legend = '<div class="legend"><span><i class="key cb-direct"></i>Avec le médecin au sol</span><span><i class="key cb-ia"></i>Avec AURA, l’IA du vaisseau</span><span><i class="key cb-coupure"></i>Coupure de la liaison</span></div>';
    return '<div class="chart-wrap">' + legend + s + '</div>';
  }
  V.confBand = confBand;
  // AURA en visioconférence : un petit astre qui parle, écoute et réagit
  function buddy(o) {
    o = o || {};
    const cls = ['buddy'].concat(o.state ? [o.state] : []).join(' ');
    return '<div class="' + cls + '" id="buddy" role="img" aria-label="AURA, l’IA du vaisseau' + (o.state === 'talking' ? ', parle' : o.state === 'listening' ? ', écoute' : o.state === 'thinking' ? ', réfléchit' : '') + '">' +
      '<svg viewBox="0 0 220 230" aria-hidden="true">' +
      '<defs><radialGradient id="bd-body" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#8f7cff"/><stop offset=".55" stop-color="#5b49d1"/><stop offset="1" stop-color="#9aa0ee"/></radialGradient>' +
      '<radialGradient id="bd-tip" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6c9"/><stop offset="1" stop-color="#ffc864"/></radialGradient></defs>' +
      '<g class="bd-halo"><circle cx="110" cy="128" r="96"/></g>' +
      '<g class="bd-ring"><ellipse cx="110" cy="128" rx="104" ry="24"/></g>' +
      '<g class="bd-float">' +
        '<g class="bd-antenna"><path d="M110 58 C 108 40, 118 30, 122 22"/><circle cx="123" cy="19" r="8" fill="url(#bd-tip)"/></g>' +
        '<g class="bd-squash"><circle class="bd-body" cx="110" cy="128" r="72" fill="url(#bd-body)"/>' +
        '<ellipse class="bd-shine" cx="84" cy="96" rx="20" ry="11"/>' +
        '<ellipse class="bd-cheek" cx="72" cy="150" rx="11" ry="6"/><ellipse class="bd-cheek" cx="148" cy="150" rx="11" ry="6"/>' +
        '<g class="bd-eyes" id="buddy-eyes"><g class="bd-eye"><ellipse cx="90" cy="122" rx="10" ry="16"/><circle class="bd-pupil" cx="92" cy="125" r="5.5"/><circle class="bd-glint" cx="95" cy="114" r="3"/></g><g class="bd-eye"><ellipse cx="130" cy="122" rx="10" ry="16"/><circle class="bd-pupil" cx="132" cy="125" r="5.5"/><circle class="bd-glint" cx="135" cy="114" r="3"/></g>' +
        '<path class="bd-happy" d="M80 124 Q90 112 100 124 M120 124 Q130 112 140 124"/></g>' +
        '<g class="bd-mouth"><path class="bd-smile" d="M98 152 Q110 162 122 152"/><ellipse class="bd-talk" cx="110" cy="155" rx="9" ry="6"/></g>' +
        '</g>' +
      '</g>' +
      '<g class="bd-dots"><circle cx="160" cy="62" r="5"/><circle cx="176" cy="48" r="6.5"/><circle cx="195" cy="32" r="8"/></g>' +
      '</svg></div>';
  }
  V.buddy = buddy;
  // Le tableau des règles, avec la situation de la semaine en évidence
  function confRules(A, st) {
    const cur = st ? (st.reason === 'coupure' ? 'coupure' : st.reason === 'indisponible' ? 'indisponible' : st.mode) : null;
    return '<div class="table-wrap"><table class="table stack"><thead><tr><th>Situation</th><th>Le médecin au sol</th><th>L’IA du vaisseau</th></tr></thead><tbody>' +
      CONF.rules.map(m => '<tr' + (m.id === cur ? ' class="current"' : '') + '><td data-label="Situation"><b>' + esc(m.label) + '</b>' + (m.id === cur ? ' ' + UI.pill('normal', 'cette semaine') : '') + '</td><td data-label="Médecin au sol">' + esc(m.doctor) + '</td><td data-label="IA du vaisseau">' + esc(m.ai) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  V.confRules = confRules;
  function confExplain(A, st) {
    return '<p class="small" style="max-width:62ch">Comme sur l’ISS, chaque membre d’équipage a chaque semaine une visioconférence médicale privée de 15 minutes : alimentation, sommeil, exercice, élimination, charge de travail et bien-être. Le médecin au sol la mène tant qu’on peut se parler en direct, c’est-à-dire avec moins de 10 secondes de délai. Au-delà, pendant la conjonction ou s’il n’est pas disponible, AURA, l’IA du vaisseau, la mène avec les mêmes sujets et lui envoie le résumé relu par la personne.</p>' +
      confBand(A) + confRules(A, st) + UI.sources(['nasaPmc']);
  }
  V.confExplain = confExplain;

  /* ------------------------------------------------------------------ */
  /* Journal                                                              */
  /* ------------------------------------------------------------------ */
  function journal(A, n, filterA) {
    let items = A.s.journal.slice().sort((x, y) => y.t - x.t);
    if (filterA) items = items.filter(j => j.a === filterA);
    else { let seen = false; items = items.filter(j => { if (j.type !== 'rapport') return true; if (seen) return false; seen = true; return true; }); }
    if (H.crew(A)) items = items.filter(j => !j.a || j.a === A.s.me || j.type === 'mission' || j.type === 'urgence');
    items = items.filter(j => j.t <= A.s.now && j.type !== 'demo').slice(0, n || 8);
    if (!items.length) return '<p class="empty">Rien pour le moment.</p>';
    return '<ul class="journal">' + items.map(j => '<li><time>' + esc(f.when(j.t)) + '</time><span>' + esc(j.text) + '</span></li>').join('') + '</ul>';
  }
  V.journal = journal;

  /* ------------------------------------------------------------------ */
  /* Alertes                                                              */
  /* ------------------------------------------------------------------ */
  function alertList(A, list, opts) {
    opts = opts || {};
    if (!list.length) return '<p class="empty">' + (opts.empty || 'Aucune alerte.') + '</p>';
    return '<ul class="list">' + list.map(al => {
      const visible = !al.a || H.canSee(A, al.a);
      const key = 'al-' + al.id;
      let h = '<li><div class="row"><div style="flex:1 1 320px;min-width:0"><div class="btn-row">' + UI.pill(al.lv, al.st === 'close' ? 'Close' : UI.LEVEL[al.lv]) + '<span class="row-title">' + esc(visible ? al.title : 'Suivi médical en cours pour ' + S.name(al.a)) + '</span></div>';
      h += '<div class="row-meta" style="margin-top:4px">' + esc(f.when(al.t)) + (al.st === 'vue' ? ', vue' : '') + (al.st === 'close' ? ', close ' + esc(f.when(al.closeT)) : '') + '</div>';
      if (visible && !opts.compact) h += '<p style="margin:8px 0 0">' + esc(H.T(A, al, key)) + '</p>' + (opts.flip !== false ? '<div style="margin-top:4px">' + H.flipLink(A, key) + '</div>' : '');
      if (al.st === 'close' && al.closeNote && !opts.compact) h += '<p class="note" style="margin:4px 0 0">' + esc(al.closeNote) + '</p>';
      h += '</div><div class="btn-row">';
      if (al.st === 'active' && visible && !opts.compact) h += '<button class="btn sm" data-act="see-alert" data-id="' + al.id + '">J’ai vu</button>';
      if (al.st !== 'close' && H.doc(A) && !opts.compact) {
        if (A.ui.closing === al.id) h += '<form data-form="close-alert" class="btn-row"><input type="hidden" name="id" value="' + al.id + '"><label class="visually-hidden" for="cl-' + al.id + '">Note de clôture</label><input id="cl-' + al.id + '" name="note" type="text" placeholder="Note de clôture" style="min-width:220px"><button class="btn sm primary" type="submit">Clore</button></form>';
        else h += '<button class="btn sm" data-act="close-open" data-id="' + al.id + '">Clore</button>';
      }
      return h + '</div></div></li>';
    }).join('') + '</ul>';
  }
  V.alertList = alertList;

  /* ------------------------------------------------------------------ */
  /* Procédure d’urgence                                                  */
  /* ------------------------------------------------------------------ */
  function procedure(A) {
    const s = A.s, em = s.emergency;
    if (!em) return '';
    const next = em.steps.findIndex(x => !x.done);
    let h = '<div class="panel" style="border-color:var(--red)">';
    h += '<div class="row"><div class="row-meta">Depuis ' + esc(f.when(em.t)) + (em.a ? ', ' + esc(S.name(em.a)) : '') + '</div>' + UI.pill('urgence', em.over ? 'Événement terminé' : 'En cours') + '</div>';
    h += next >= 0 ? '<p class="emergency-step">Étape ' + (next + 1) + ' sur ' + em.steps.length + ' : ' + esc(em.steps[next].label) + '</p>' : '<p class="emergency-step">Toutes les étapes sont faites.</p>';
    h += '<ol class="proto" aria-label="Procédure">' + em.steps.map((st, i) => '<li class="' + (st.done ? 'done' : i === next ? 'next' : '') + '"><label><input type="checkbox" data-act="step" data-i="' + i + '"' + (st.done ? ' checked' : '') + '><span>' + esc(st.label) + '</span></label></li>').join('') + '</ol>';
    const msg = s.queue.filter(q => q.prio === 1 && q.t >= em.t).sort((a, b) => a.t - b.t)[0];
    const L = E.lightMinutes(D.mission, s.now / DAY);
    if (msg) h += '<p class="note" style="margin-top:16px">Message prioritaire vers la Terre : ' + esc(msg.status) + (msg.arrAt ? ', arrivée ' + (msg.arrAt <= s.now ? 'à ' : 'prévue à ') + esc(f.clock(msg.arrAt % DAY)) : '') + '. Délai actuel : ' + esc(f.delay(L)) + ' dans chaque sens. Agissez sans attendre la réponse.</p>';
    if (em.over) h += '<div class="callout calm" style="margin-top:14px"><p>L’événement est terminé depuis ' + esc(f.clock(em.over % DAY)) + '. Vous pouvez sortir de l’abri et terminer le mode urgence.</p></div>';
    const spe = em.kind === 'spe' ? S.speAt(s, s.now) : null;
    if (spe) h += '<p class="note" style="margin-top:10px">Débit de dose : ' + esc(f.num(S.doseRateAt(s, s.now), 0)) + ' mSv par jour, ' + spe.factor + ' fois le niveau habituel. Fin prévue de l’éruption à ' + esc(f.when(spe.end)) + '.</p><div class="btn-row"><button class="btn sm" data-act="advance-to" data-t="' + (spe.end + 5) + '">Avancer jusqu’à la fin de l’éruption</button></div>';
    h += '<div class="btn-row" style="margin-top:18px"><button class="btn' + (em.over || next < 0 ? ' primary' : '') + '" data-act="end-emergency">Terminer le mode urgence</button></div>';
    h += UI.sources(em.kind === 'spe' ? ['ochmoRad'] : em.kind === 'co2' ? ['ochmoCo2'] : ['aura']);
    return h + '</div>';
  }
  V.procedure = procedure;

  /* ------------------------------------------------------------------ */
  /* Sorties de l’IA                                                      */
  /* ------------------------------------------------------------------ */
  // Bandeau d’origine d’un texte : IA (fournisseur, modèle) ou règles de bord
  function origin(info) {
    if (!info) return '';
    if (info.ai) return '<div class="ai-label">' + UI.orb('normal', { sm: true, live: false }) + 'Rédigé par l’IA (' + esc(info.ai) + ') à partir des données de bord : à relire</div>';
    return '<div class="ai-label" style="color:var(--ink-2)">' + UI.orb('normal', { sm: true, live: false }) + 'Préparé à bord par des règles, sans IA</div>';
  }
  V.origin = origin;

  function sourcesList(A, cardIds, prefix) {
    const cards = cardIds.map(id => A.cardById(id)).filter(Boolean);
    if (!cards.length) return '';
    return '<details class="disclose" style="margin-top:10px"><summary>' + (cards.length > 1 ? cards.length + ' fiches de bord utilisées' : 'Fiche de bord utilisée') + '</summary><div class="fiches">' +
      cards.map((c, i) => '<div class="fiche" id="fiche-' + prefix + (i + 1) + '"><b><span class="n">' + (i + 1) + '</span>' + esc(c.title) + '</b>' + esc(c.text) + (A.cardContext(c) ? '<p class="small" style="margin:8px 0 0"><b>Dans la mission en ce moment : </b>' + esc(A.cardContext(c)) + '</p>' : '') + UI.sources(c.sources) + '</div>').join('') +
      '</div></details>';
  }
  V.sourcesList = sourcesList;

  function chatMessage(A, m, opts) {
    opts = opts || {};
    if (m.role === 'user') return '<div class="msg user">' + esc(m.text) + '</div>';
    const prefix = m.id + '-';
    let h = '<div class="msg ai" id="m-' + m.id + '">';
    const by = m.mode === 'ai' ? 'AURA, avec ' + esc(m.model || 'l’IA') : m.mode === 'alarm' ? 'AURA, signe d’alarme' : 'AURA, fiches de bord';
    h += '<div class="who">' + UI.orb(m.mode === 'alarm' ? 'urgence' : 'normal', { sm: true, live: !!opts.live }) + '<span>' + by + '</span></div>';
    if (m.mode === 'alarm') {
      const fl = D.redFlags.find(x => x.id === m.flag);
      h += '<div class="callout urgent"><p><b>' + esc(fl && fl.care ? 'Ce que vous ressentez compte. Parlez-en maintenant à la médecin de bord.' : 'Prévenez la médecin de bord maintenant.') + '</b></p>' +
        (fl ? '<ol style="padding-left:1.3rem;margin:8px 0 0">' + fl.steps.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>' : '') +
        '<p style="margin-top:10px">' + esc(m.text) + '</p><div class="btn-row" style="margin-top:10px"><a class="btn sm danger" href="#/urgence">Ouvrir la procédure</a></div></div>';
      return h + '</div>';
    }
    if (m.soft) {
      const fl = D.redFlags.find(x => x.id === m.soft);
      if (fl) h += '<div class="callout attention" style="margin-bottom:12px"><p>Votre question parle d’un signe d’alarme (' + esc(fl.label.toLowerCase()) + '). Si c’est ce que vous ressentez maintenant, signalez-le.</p><div class="btn-row" style="margin-top:8px"><button class="btn sm danger" data-act="redflag" data-flag="' + fl.id + '" data-a="' + esc(A.s.me) + '" data-src="assistant">C’est ce que je ressens</button></div></div>';
    }
    h += '<div class="body" id="body-' + m.id + '"' + (opts.live ? ' aria-live="polite"' : '') + '>' + (m.text ? AI.md(m.text, { cites: (m.cards || []).length, prefix }) : '<span class="typing" aria-label="Rédaction en cours"><i></i><i></i><i></i></span>') + '</div>';
    if (m.error) h += '<p class="note" style="margin-top:6px">' + esc(m.error) + '</p>';
    if (m.cards && m.cards.length && !opts.live) h += sourcesList(A, m.cards, prefix);
    if (!opts.live && m.text) {
      h += '<div class="btn-row" style="margin-top:10px">';
      if (A.speech.canSpeak) h += '<button class="btn sm" data-act="speak" data-id="' + m.id + '">' + (A.speech.speaking === m.id ? 'Arrêter la lecture' : 'Écouter') + '</button>';
      if (m.mode === 'ai' && A.aiReady()) {
        h += '<button class="btn sm quiet" data-act="rephrase" data-id="' + m.id + '" data-mode="simple">Plus simple</button>';
        h += '<button class="btn sm quiet" data-act="rephrase" data-id="' + m.id + '" data-mode="detail">Plus détaillé</button>';
        h += '<button class="btn sm quiet" data-act="rephrase" data-id="' + m.id + '" data-mode="english">En anglais</button>';
      }
      if (m.q && H.crew(A)) h += '<button class="btn sm quiet" data-act="to-conf" data-q="' + esc(m.q) + '">Garder pour la conférence</button>';
      h += '</div>';
    }
    return h + '</div>';
  }
  V.chatMessage = chatMessage;

  // Étapes d’une vraie séquence
  function steps(list) {
    return '<ol class="steps">' + list.map(x => '<li class="' + (x.state || '') + '"><h3>' + esc(x.title) + '</h3>' + (x.text ? '<p class="muted">' + x.text + '</p>' : '') + '</li>').join('') + '</ol>';
  }
  V.steps = steps;
})(typeof self !== 'undefined' ? self : this);
