/* AURA : pages communes à tous les profils.
   Bienvenue, Assistant, Urgence, Mon dossier, Liaison avec la Terre,
   Mission et cabine, Réglages, À propos. */
(function (root) {
  'use strict';
  const V = root.AURA_VIEWS;
  const D = root.AURA_DATA, E = root.AURA_ENGINE, S = root.AURA_STORE, UI = root.AURA_UI, AI = root.AURA_AI;
  const H = V.H;
  const f = E.fmt, esc = UI.esc, NB = E.NBSP, DAY = 1440;
  const METRICS = H.METRICS;

  /* ------------------------------------------------------------------ */
  /* Bienvenue                                                            */
  /* ------------------------------------------------------------------ */
  V.welcome = function (A) {
    let h = '<div class="welcome"><span class="orb live welcome-orb" aria-hidden="true"></span>';
    h += '<h1 id="page-title" tabindex="-1" class="hello">Bienvenue à bord</h1>';
    h += '<p class="lead">AURA aide un équipage en route vers Mars à suivre sa santé avec les repères de l’espace, pas seulement ceux de la Terre. Tout fonctionne à bord, même sans connexion.</p>';
    h += '<h2 style="margin-top:36px;font-size:1.25rem">Qui utilise AURA ?</h2>';
    h += '<p class="pick-label">À bord, chacun voit ses propres données</p><div class="people-pick">';
    D.crew.forEach(c => { h += '<button class="tile" data-act="profile" data-role="crew" data-me="' + c.id + '">' + UI.avatar(c.name, { lg: true }) + '<div><b>' + esc(c.name) + '</b><span>' + esc(c.role) + '</span></div></button>'; });
    h += '</div><p class="pick-label">Le suivi médical</p><div class="people-pick">';
    h += '<button class="tile" data-act="profile" data-role="doctor" data-me="a3">' + UI.avatar('Médecin de bord', { lg: true, doc: true, text: 'MB' }) + '<div><b>Médecin de bord</b><span>Keiko Tanaka, vue clinique de tout l’équipage</span></div></button>';
    h += '<button class="tile" data-act="profile" data-role="ground">' + UI.avatar('Médecin au sol', { lg: true, doc: true, text: 'MS' }) + '<div><b>Médecin au sol</b><span>Sur Terre, avec le délai de la liaison</span></div></button>';
    h += '</div><p class="note" style="margin-top:16px">Équipage et mission fictifs, simulés de façon reproductible. Vous pourrez changer de profil à tout moment, depuis le menu du profil.</p>';
    h += '<div class="btn-row" style="margin-top:20px"><button class="btn" data-act="demo-open">Présenter AURA : démonstration guidée</button><a class="btn quiet" href="#/a-propos">En savoir plus sur le projet</a></div></div>';
    return h;
  };

  /* ------------------------------------------------------------------ */
  /* Assistant (questions libres, réponses sourcées)                      */
  /* ------------------------------------------------------------------ */
  const SUGGEST = {
    crew: ['J’ai mal à la tête, est-ce le CO₂ ?', 'Pourquoi ma température est plus haute ?', 'Je dors mal, que faire ?', 'Tous les combien puis-je prendre du paracétamol ?', 'Combien de radiations sur Mars ?', 'Que se passe-t-il pendant la conjonction ?'],
    doctor: ['Quel est le risque de céphalée lié au CO₂ ?', 'Comment AURA adapte la norme de température ?', 'Que dit la littérature sur la stabilité des médicaments ?', 'Quels médicaments éviter avant une sortie ?', 'Que mesure le test de réaction ?', 'Quelle dose de radiation pour la mission ?']
  };
  V.assistant = function (A) {
    const s = A.s;
    const key = A.chatKey();
    const list = s.chats[key] || [];
    const aiOn = A.aiReady();
    const fiche = A.route.q.fiche ? A.cardById(A.route.q.fiche) : null;
    let body = '';
    if (fiche) {
      body += '<section class="section" style="margin-top:22px"><div class="panel"><div class="row-meta">Fiche de bord</div><h2 style="margin-top:6px">' + esc(fiche.title) + '</h2><p style="margin-top:10px">' + esc(fiche.text) + '</p>' + (A.cardContext(fiche) ? '<div class="callout calm"><p><b>Dans la mission en ce moment : </b>' + esc(A.cardContext(fiche)) + '</p></div>' : '') + UI.sources(fiche.sources) + '<div class="btn-row" style="margin-top:12px"><a class="btn sm" href="#/assistant">Poser une question</a></div></div></section>';
    }
    const lv = A.flow.askLevel || (H.medical(A) ? 'medical' : 'simple');
    const seg = '<div class="seg" role="group" aria-label="Langage des réponses">' + [['simple', 'Simple'], ['medical', 'Médical'], ['english', 'English']].map(x => '<button data-act="ask-level" data-level="' + x[0] + '" aria-pressed="' + (lv === x[0]) + '"' + (x[0] === 'english' && !aiOn ? ' disabled title="Demande une IA connectée"' : '') + '>' + x[1] + '</button>').join('') + '</div>';
    body += '<div class="row ask-tools" style="margin-top:20px;align-items:center"><p class="small muted" style="margin:0;max-width:52ch">' + (aiOn ? 'Réponses rédigées par ' + esc(A.aiLabel()) + ' à partir des fiches de bord seulement, avec leurs numéros.' : 'Sans IA connectée, AURA vous montre directement les passages des fiches de bord. <a href="#/reglages">Connecter une IA</a>') + '</p>' + seg + '</div>';
    let chat = '<div class="chat" id="chat">';
    if (!list.length) {
      chat += '<div class="panel soft"><p style="margin-bottom:12px">Posez votre question avec vos mots, à l’écrit ou à la voix. Si aucune fiche ne répond, AURA le dit au lieu d’inventer.</p><div class="chips">' + (H.crew(A) ? SUGGEST.crew : SUGGEST.doctor).map(q => '<button type="button" class="chip" data-act="ask-chip" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div></div>';
    }
    list.forEach((m, i) => { chat += V.chatMessage(A, m, { live: A.busy.ask && i === list.length - 1 && m.role === 'ai' }); });
    chat += '</div>';
    const busy = A.busy.ask;
    const form = '<div class="composer"><form data-form="ask"><label for="ask-q" class="visually-hidden">Votre question</label><textarea id="ask-q" name="q" rows="1" placeholder="Votre question">' + esc(A.flow.askDraft || '') + '</textarea>' +
      (A.speech.canListen ? '<button type="button" class="btn" data-act="listen" data-target="ask-q" aria-pressed="' + (A.speech.listening === 'ask-q') + '" aria-label="Dicter la question">' + (A.speech.listening === 'ask-q' ? 'Stop' : 'Micro') + '</button>' : '') +
      (busy ? '<button type="button" class="btn" data-act="ai-stop">Arrêter</button>' : '<button class="btn primary" type="submit">Envoyer</button>') + '</form>' +
      (list.length ? '<div class="btn-row" style="margin-top:8px"><button class="btn quiet sm" data-act="chat-clear">Nouvelle conversation</button></div>' : '') + '</div>';
    body += chat + form;
    body += '<details class="disclose" style="margin-top:28px"><summary>Comment l’assistant répond</summary><div class="prose"><p>Pour chaque question, AURA vérifie d’abord les signes d’alarme. Puis il cherche, sans internet, les fiches de bord les plus proches parmi ' + A.cards.length + ' fiches rédigées à partir de sources publiées (méthode BM25, avec les synonymes comme « mal de tête » et « céphalée »), et y ajoute le contexte de la mission. Avec une IA connectée, le modèle rédige la réponse à partir de ces fiches seulement et cite chacune. Sans IA, vous lisez directement les passages.</p><p>Dans une étude en médecine aérospatiale, un modèle qui cherchait ainsi dans des documents a donné 85 % de bonnes réponses, contre 70 % et 55 % pour deux modèles qui répondaient de mémoire.</p></div>' + UI.sources(['anderson2025', 'buras2025']) +
      '<details class="values"><summary>Voir toutes les fiches</summary><ul class="list">' + A.cards.map(c => '<li><a href="#/assistant?fiche=' + c.id + '">' + esc(c.title) + '</a></li>').join('') + '</ul></details></details>';
    return H.page({ title: 'Assistant', calm: true, lead: 'Une question sur votre santé à bord ? Les réponses s’appuient sur les fiches de bord, avec leurs sources.', body });
  };

  /* ------------------------------------------------------------------ */
  /* Urgence                                                              */
  /* ------------------------------------------------------------------ */
  V.emergency = function (A) {
    const s = A.s;
    if (s.emergency) {
      const em = s.emergency;
      return H.page({ title: em.title, calm: true, state: H.state('urgence', em.over ? 'L’événement est terminé.' : 'Suivez les étapes, une à la fois.', esc(em.cause) + '. Mode urgence depuis ' + esc(f.clock(em.t % DAY)) + '.'), body: '<section class="section" style="margin-top:24px">' + V.procedure(A) + '</section>' });
    }
    const a = V.forWhom(A);
    let body = '<section class="section" style="margin-top:22px">' + (H.crew(A) ? '<div class="field" style="max-width:360px"><label for="rf-who">Pour qui ?</label><select id="rf-who" data-change="who">' + H.crewOptions(A, A.flow.who || a) + '</select></div>' : '<div class="field" style="max-width:360px"><label for="rf-who">Pour qui ?</label><select id="rf-who" data-change="who">' + H.crewOptions(A, a) + '</select></div>');
    body += '<div class="tiles">' + D.redFlags.map(fl => '<button class="tile" data-act="redflag" data-flag="' + fl.id + '" data-src="urgence" style="border-color:color-mix(in srgb, var(--red) 35%, var(--line))"><b>' + esc(fl.label) + '</b><span>' + esc(fl.steps[0]) + '</span></button>').join('') + '</div></section>';
    body += '<p class="note" style="margin-top:16px">Ces signes passent avant tout calcul : même si les mesures sont normales, l’alerte part, la procédure s’affiche et un message prioritaire passe en tête de la file vers la Terre. Liste de démonstration, à valider par le référent médical.</p>';
    if (H.doc(A)) body += H.section('Exercices', null, '<div class="btn-row"><button class="btn" data-act="spe-now">Simuler une éruption solaire maintenant</button><button class="btn" data-act="drill" data-kind="co2">Exercice CO₂ critique</button><button class="btn" data-act="drill" data-kind="vital">Exercice valeur vitale critique</button></div>');
    return H.page({ title: 'Urgence', calm: true, state: H.state('normal', 'Aucune urgence en cours.', 'Si vous ou un membre de l’équipage ressentez l’un de ces signes, touchez-le : la médecin de bord est prévenue et les premiers gestes s’affichent.', { live: false }), body });
  };

  /* ------------------------------------------------------------------ */
  /* Dossier d’une personne                                               */
  /* ------------------------------------------------------------------ */
  V.dossier = function (A, idArg) {
    const s = A.s;
    const id = idArg || (H.crew(A) ? s.me : 'a1');
    const c = S.crewById[id];
    if (!c) return H.page({ title: 'Dossier introuvable', lead: 'Ce membre d’équipage n’existe pas.', body: '<p><a href="#/">Revenir à l’accueil</a></p>' });
    if (!H.canSee(A, id)) return H.page({ title: c.name, lead: esc(c.role), body: '<div class="callout" style="margin-top:20px"><p>Les données médicales ' + esc(H.de(c.name)) + ' sont visibles par ' + esc(H.first(c.name)) + ' et par la médecin de bord. À bord, chacun voit ses propres mesures.</p><p><a href="#/dossier">Ouvrir votre dossier</a></p></div>' });
    const k = METRICS.indexOf(A.route.q.m) >= 0 ? A.route.q.m : 'temp';
    const cfg = D.metrics[k];
    const base = '#/dossier' + (idArg ? '/' + id : '');
    let body = '<div class="tabs" role="tablist" aria-label="Mesure" style="margin-top:22px">' + METRICS.map(m => '<a role="tab" href="' + base + '?m=' + m + (A.route.q.p ? '&p=' + A.route.q.p : '') + '" aria-selected="' + (m === k) + '">' + esc(m === 'spo2' ? 'Oxygène' : D.metrics[m].short) + '</a>').join('') + '</div>';
    const last = S.lastMeasurement(s, id, k);
    body += last ? V.reading(A, last, { animate: true, layout: 'default', open: !H.crew(A) }) : '<p class="empty">Pas encore de mesure.</p>';
    // Décisions du médecin
    const vals = s.vals.filter(v => v.a === id && v.k === k);
    const open = vals.filter(v => v.st === 'ouverte');
    if (open.length || (!H.crew(A) && vals.length)) {
      let vb = '';
      open.forEach(v => {
        const dr = v.drift;
        vb += '<div class="callout attention"><p><b>Décalage durable depuis ' + esc(f.when(dr.since * DAY)) + '.</b> ' + (dr.kind === 'persistant' ? 'Plusieurs mesures de suite sont hors plage dans le même sens (' + esc(dr.values.map(x => f.num(x, cfg.decimals)).join(', ')) + ' ' + esc(cfg.unit) + '). Elles n’ont pas été intégrées à la référence.' : 'La référence s’éloigne de la trajectoire attendue pour le vol.') + '</p>' +
          (H.doc(A) ? '<p>Si ce changement est physiologique et attendu, validez la nouvelle référence. Sinon, maintenez la référence actuelle : les alertes continueront.</p><div class="btn-row"><button class="btn primary" data-act="drift" data-id="' + v.id + '" data-decision="valider">Valider la nouvelle référence</button><button class="btn" data-act="drift" data-id="' + v.id + '" data-decision="maintenir">Maintenir la référence actuelle</button></div>' : '<p>La médecin de bord décide si votre référence évolue.</p>') + '</div>';
      });
      vals.filter(v => v.st !== 'ouverte').forEach(v => { vb += '<p class="note">' + esc(f.when(v.dt)) + ' : ' + (v.st === 'validee' ? 'nouvelle référence validée' : 'référence maintenue') + ' par la médecin de bord.</p>'; });
      body += H.section('Décisions de la médecin', 'AURA n’adapte jamais seul la référence quand les valeurs sortent de la plage : c’est une décision médicale.', vb);
    }
    // Historique
    const rangeDays = A.route.q.p === 'tout' ? null : A.route.q.p === '14' ? 14 : 30;
    const all = S.series(s, id, k, rangeDays ? Math.max(0, H.today(A) - rangeDays) : 0);
    const dense = all.length > 120;
    const pts = all.map(m => ({ x: m.t / DAY, y: m.v, level: m.lv, hide: dense && m.lv === 'normal', m }));
    const band = all.map(m => ({ x: m.t / DAY, lo: Math.max(cfg.plausible.min, m.c - E.Z_NORMAL * m.sd), hi: cfg.oneSided === 'low' ? Math.min(cfg.plausible.max, m.c + E.Z_NORMAL * m.sd) : m.c + E.Z_NORMAL * m.sd, c: m.c }));
    const terrHi = cfg.oneSided === 'low' ? cfg.plausible.max : cfg.terrestrial.high;
    const chart = all.length ? UI.xyChart({
      label: cfg.label + ' ' + H.de(c.name) + ', mesures en vol avec la plage AURA et la norme terrestre', height: 270, yTitle: cfg.unit,
      hrects: [{ lo: cfg.terrestrial.low, hi: terrHi, cls: 'terr-band' }],
      bands: [{ pts: band, cls: 'aura-band', center: true }],
      lines: [{ pts: pts.map(p => ({ x: p.x, y: p.y })), cls: 'series' }],
      dots: pts, yMax: cfg.oneSided === 'low' ? 100.5 : undefined, xFmt: v => f.day(v),
      hover: pts.map(p => ({ x: p.x, y: p.y, m: p.m })),
      tip: p => { const m = p.m, terr = E.terrestrialReading(cfg, m.v); return [f.unit(m.v, cfg), f.when(m.t), 'AURA : ' + UI.LEVEL[m.lv].toLowerCase() + ', plage ' + H.range(cfg, [m.c - E.Z_NORMAL * m.sd, m.c + E.Z_NORMAL * m.sd]), 'Sur Terre : ' + terr.label]; },
      legend: '<div class="legend"><span><i class="key terr"></i>Norme terrestre</span><span><i class="key aura" style="opacity:.35"></i>Plage attendue, jour par jour</span><span><i class="key dot"></i>Mesure</span><span><i class="key dot attention"></i>À regarder</span><span><i class="key dot urgent"></i>Alerte</span></div>',
      table: { summary: 'Voir les ' + all.length + ' valeurs', head: ['Quand', 'Valeur', 'Plage AURA', 'Sur Terre', 'Lecture AURA'], num: false, rows: all.slice().reverse().map(m => [f.when(m.t), f.unit(m.v, cfg), H.range(cfg, [m.c - E.Z_NORMAL * m.sd, m.c + E.Z_NORMAL * m.sd]), E.terrestrialReading(cfg, m.v).label, UI.LEVEL[m.lv]]) }
    }) : '<p class="empty">Pas de données sur la période.</p>';
    const cur = A.route.q.p || '30';
    body += '<section class="section"><div class="section-head"><div><h2>Historique en vol</h2><p>La bande violette suit la référence ' + (H.crew(A) && id === s.me ? 'de votre corps' : esc(H.de(H.first(c.name)))) + ' jour après jour. La bande grise reste la norme du sol.</p></div><div class="seg" role="group" aria-label="Période">' + [['14', '14 jours'], ['30', '30 jours'], ['tout', 'Depuis le départ']].map(p => '<a href="' + base + '?m=' + k + '&p=' + p[0] + '" aria-pressed="' + (p[0] === cur) + '">' + p[1] + '</a>').join('') + '</div></div>' + chart + '</section>';
    // Médicaments
    const ads = s.admins.filter(x => x.a === id).slice().reverse();
    let mb = '';
    if (!ads.length) mb = '<p class="empty">Aucun médicament pris depuis le départ.</p>';
    else {
      mb += '<div class="table-wrap"><table class="table stack"><thead><tr><th>Quand</th><th>Médicament</th><th>Dose</th><th>Effet noté</th></tr></thead><tbody>';
      ads.slice(0, 12).forEach(x => {
        const med = S.medById[x.med];
        mb += '<tr><td class="nowrap">' + esc(f.when(x.t)) + '</td><td data-label="Médicament">' + esc(med.name) + '</td><td class="nowrap" data-label="Dose">' + esc(H.unitsTxt(x.units, med)) + (x.f !== 1 ? '<span class="sub">facteur ' + esc(f.num(x.f, 2)) + '</span>' : '') + '</td><td data-label="Effet">' + (x.effect ? esc({ aucun: 'Aucun effet', partiel: 'Effet partiel', complet: 'Effet complet' }[x.effect]) + (x.side ? '<span class="sub">' + esc(x.side) + '</span>' : '') : '<span class="faint">à noter</span>') + '</td></tr>';
      });
      mb += '</tbody></table></div>';
      if (!H.crew(A)) D.meds.forEach(m => { const r = S.responses(s, id, m.id); if (r.hint) mb += '<div class="callout attention" style="margin-top:12px"><p><b>' + esc(m.name) + ' : </b>' + esc(r.hint) + ' (' + r.counts.partiel + ' effet partiel, ' + r.counts.aucun + ' sans effet, ' + r.counts.complet + ' complet).</p><p><a href="#/pharmacie">Ouvrir la pharmacie</a></p></div>'; });
    }
    body += H.section('Médicaments', null, mb);
    body += H.section('Bien-être et vigilance', null, V.wbCharts(A, id, 21) + '<h3 style="margin-top:22px">Temps de réaction</h3>' + V.rtChart(A, id));
    body += H.section('Journal', null, V.journal(A, 8, id));
    const mine = H.crew(A) && id === s.me;
    return H.page({ title: mine ? 'Mon dossier' : c.name, lead: esc(c.role) + (c.backup ? '. ' + esc(c.backup) : '') + '. Référence d’avant vol établie sur 20 mesures au repos. Équipage fictif.', actions: '<a class="btn" href="#/mesurer/' + k + '">Nouvelle mesure</a>', body });
  };

  /* ------------------------------------------------------------------ */
  /* Liaison avec la Terre                                                */
  /* ------------------------------------------------------------------ */
  const PRIO = { 1: 'Urgent', 2: 'Important', 3: 'Routine' };
  function delayChart(A) {
    const now = A.s.now;
    const pts = [];
    for (let d = 0; d <= D.mission.durationDays; d += 3) pts.push({ x: d, y: E.lightMinutes(D.mission, d) });
    return UI.xyChart({
      label: 'Délai radio en minutes, dans un seul sens, du départ au retour', height: 230, yMin: 0, yMax: 30, yTicks: 6, xMin: 0, xMax: D.mission.durationDays, yTitle: 'minutes',
      lines: [{ pts, cls: 'series' }], vrects: [{ x0: D.mission.conjunction.start, x1: D.mission.conjunction.end, cls: 'blackout', label: 'coupure' }],
      vlines: [{ x: now / DAY, label: 'aujourd’hui', anchor: now / DAY > 700 ? 'end' : 'start' }],
      xFmt: v => f.day(v), xTicksValues: [0, 180, 360, 540, 720, 900],
      hover: pts, tip: p => [f.dur(Math.round(p.y * 10) / 10) + ' dans chaque sens', f.day(p.x), E.isBlackout(D.mission, p.x) ? 'liaison coupée' : E.phaseAt(D.mission, p.x).label],
      legend: '<div class="legend"><span><i class="key line"></i>Délai dans un sens</span><span><i class="key" style="background:var(--red);opacity:.3"></i>Conjonction solaire</span><span><i class="key line" style="background:var(--aura)"></i>Aujourd’hui</span></div>'
    }) + '<p class="note">Modèle simplifié : la distance augmente pendant l’aller, suit la position de Mars pendant le séjour, puis diminue au retour.</p>' + UI.sources(['conjonction']);
  }
  function queueTable(A) {
    const s = A.s;
    // Chacun voit ses propres envois et ceux de tout l’équipage ; une demande au psychologue reste privée
    const visible = q => q.kind === 'psy' ? q.a === s.me : H.doc(A) || !q.a || q.a === s.me;
    const all = s.queue.filter(visible).sort((a, b) => (a.sentAt ? 1 : 0) - (b.sentAt ? 1 : 0) || (a.sentAt ? b.t - a.t : a.prio - b.prio || a.t - b.t));
    if (!all.length) return '<p class="empty">Rien dans la file.</p>';
    const head = '<div class="table-wrap"><table class="table stack"><thead><tr><th>Message</th><th>Priorité</th><th>Créé</th><th>État</th><th>Arrivée au sol</th></tr></thead><tbody>';
    const row = q => {
      const st = q.status === 'reçu' ? UI.pill('normal', 'reçu') : q.status === 'en route' ? UI.pill('info', 'en route') : q.status === 'bloqué' ? UI.pill('urgence', 'bloqué') : UI.pill('vigilance', 'en attente');
      return '<tr><td>' + esc(q.title) + '</td><td data-label="Priorité">' + esc(PRIO[q.prio]) + '</td><td class="nowrap" data-label="Créé">' + esc(f.when(q.t)) + '</td><td data-label="État">' + st + '</td><td class="nowrap" data-label="Arrivée">' + (q.arrAt ? esc(f.when(q.arrAt)) : '<span class="faint">après la coupure</span>') + '</td></tr>';
    };
    const first = all.filter(q => !q.sentAt || q.status !== 'reçu').concat(all.filter(q => q.status === 'reçu').slice(0, 6));
    const rest = all.filter(q => first.indexOf(q) < 0).slice(0, 40);
    return head + first.map(row).join('') + '</tbody></table></div>' + (rest.length ? '<details class="values"><summary>Voir ' + rest.length + ' envois plus anciens</summary>' + head + rest.map(row).join('') + '</tbody></table></div></details>' : '');
  }
  V.link = function (A) {
    const s = A.s, now = s.now;
    const L = E.lightMinutes(D.mission, now / DAY), blackout = E.isBlackout(D.mission, now / DAY);
    const ground = H.ground(A);
    const pending = s.queue.filter(q => !q.sentAt);
    let body = '';
    const st = blackout ? ['urgence', 'La liaison est coupée jusqu’à ' + f.day(D.mission.conjunction.end) + '.', ground ? 'Le vaisseau continue seul. Vos messages partiront au retour du signal.' : 'Tout continue à bord : mesures, alertes, pharmacie, synthèse. Les messages attendent ici, sans rien perdre.']
      : [ 'normal', (ground ? 'Le vaisseau reçoit vos messages en ' : 'La Terre reçoit vos messages en ') + f.delay(L) + '.', 'Une question et sa réponse prennent au moins ' + f.dur(Math.round(2 * L + 45)) + ', réflexion du médecin comprise.' ];
    if (blackout && !ground) body += '<div class="callout attention" style="margin-top:22px"><p>Pour la démonstration, vous pouvez avancer le temps jusqu’au retour du signal : la file se vide par ordre de priorité.</p><div class="btn-row" style="margin-top:8px"><button class="btn primary" data-act="advance-to" data-t="' + (D.mission.conjunction.end * DAY + 90) + '">Avancer jusqu’à la fin de la conjonction</button></div></div>';
    if (ground) {
      // Le médecin au sol écrit au vaisseau
      body += H.section('Écrire au vaisseau', 'Le message part tout de suite, sauf pendant la conjonction, et arrive avec le délai du moment.', '<form data-form="ground-message" class="panel"><div class="field"><label for="gm-a">Pour</label><select id="gm-a" name="a" style="max-width:320px"><option value="all">Tout l’équipage</option><option value="doctor">La médecin de bord</option>' + D.crew.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('') + '</select></div><div class="field"><label for="gm-t">Objet</label><input id="gm-t" name="title" type="text" required></div><div class="field"><label for="gm-b">Message</label><textarea id="gm-b" name="text" required></textarea></div><fieldset><legend>Priorité</legend><div class="choices">' + [1, 2, 3].map(p => '<label class="choice"><input type="radio" name="prio" value="' + p + '"' + (p === 2 ? ' checked' : '') + '><span>' + PRIO[p] + '</span></label>').join('') + '</div></fieldset><button class="btn primary" type="submit">Envoyer vers le vaisseau</button></form>');
      const down = s.inbox.filter(m => m.from === 'Médecin au sol').sort((a, b) => b.t - a.t).slice(0, 10);
      body += H.section('Vos messages vers le vaisseau', null, down.length ? '<ul class="list">' + down.map(m => '<li><div class="row"><div><div class="row-title">' + esc(m.title) + '</div><div class="row-meta">Envoyé ' + esc(H.ago(A, m.t)) + ', ' + (m.status === 'reçu' ? 'arrivé à bord à ' + esc(f.clock(m.arrAt % DAY)) : 'arrivée prévue à ' + esc(f.clock(m.arrAt % DAY))) + ', pour ' + esc(S.audienceLabel(m)) + '</div></div>' + UI.pill(m.status === 'reçu' ? 'normal' : 'info', m.status) + '</div></li>').join('') + '</ul>' : '<p class="empty">Aucun message envoyé pour le moment.</p>');
      body += H.section('Délai radio sur toute la mission', null, delayChart(A));
      return H.page({ title: 'Écrire au vaisseau', state: H.state(st[0], st[1], st[2]), body });
    }
    // Équipage et médecin de bord
    const sel = A.route.q.msg;
    const viewer = H.doc(A) ? 'doctor' : s.me;
    const inbox = S.inboxFor(s, viewer).slice(0, 12);
    const enroute = S.enrouteFor(s, viewer);
    const msgLi = m => '<li' + (m.id === sel ? ' class="sel"' : '') + '><div class="row"><div style="flex:1 1 320px"><div class="row-title">' + esc(m.title) + '</div><p style="margin:6px 0 0;white-space:pre-wrap">' + esc(m.text) + '</p><div class="row-meta" style="margin-top:6px">' + esc(m.from) + ', reçu ' + esc(H.ago(A, m.arrAt)) + (H.doc(A) && S.audienceLabel(m) !== 'la médecin de bord' ? ', pour ' + esc(S.audienceLabel(m)) : '') + (m.ai ? ', brouillon rédigé avec l’IA puis relu' : '') + '</div>' + (/^conf-/.test(m.kind) || (m.kind === 'reponse' && m.week !== undefined && /Conférence/.test(m.title)) ? '<div class="btn-row" style="margin-top:8px"><a class="btn sm" href="#/conference">Ouvrir la conférence</a></div>' : '') + '</div>' + (m.read ? '' : UI.pill('normal', 'nouveau')) + '</div></li>';
    const firstMsgs = inbox.slice(0, 3), olderMsgs = inbox.slice(3);
    body += H.section('Messages de la Terre', enroute.length ? UI.plural(enroute.length, 'message') + ' en route vers le vaisseau.' : null, inbox.length ? '<ul class="list msgs">' + firstMsgs.map(msgLi).join('') + '</ul>' + (olderMsgs.length ? '<details class="more"><summary>Voir ' + UI.plural(olderMsgs.length, 'message plus ancien', 'messages plus anciens') + '</summary><ul class="list msgs">' + olderMsgs.map(msgLi).join('') + '</ul></details>' : '') : '<p class="empty">Aucun message pour vous en ce moment.</p>');
    // Écrire au sol : un seul texte, AURA peut le compléter
    const dr = A.flow.msg || { title: A.route.q.objet || '', text: '' };
    const busy = A.busy.msg;
    const delayTxt = blackout ? 'Pendant la coupure, il attendra ici le retour du signal.' : 'Il mettra ' + f.delay(L) + ' à arriver.';
    const helpTxt = dr.prepared ? (dr.ai ? 'Mis en forme par l’IA (' + dr.ai + ') à partir de votre texte : relisez avant l’envoi.' : 'Contexte de la mission ajouté : relisez avant l’envoi.') : (A.aiReady() ? 'L’IA peut en faire un message clair, qui se comprend sans aller-retour.' : 'AURA peut ajouter le contexte de la mission, pour que le message se comprenne sans aller-retour.');
    let form = '<form data-form="message" class="panel">';
    form += '<div class="field"><label for="msg-b">Votre message</label><textarea id="msg-b" name="text" class="ai-edit" style="min-height:150px" placeholder="Ce qui se passe, ce que vous voulez demander. Quelques mots suffisent." required>' + esc(dr.text) + '</textarea><span class="hint">' + esc(delayTxt + ' ' + helpTxt) + '</span></div>';
    form += '<div class="btn-row" style="margin:-6px 0 20px">' + (busy ? '<button type="button" class="btn sm" data-act="ai-stop">Arrêter</button>' : dr.prepared ? '<button type="button" class="btn sm" data-act="msg-undo">Revenir à votre texte</button>' : '<button type="button" class="btn sm" data-act="msg-draft">' + (A.aiReady() ? 'Mettre en forme avec l’IA' : 'Ajouter le contexte de la mission') + '</button>') + (A.speech.canListen ? '<button type="button" class="btn sm quiet" data-act="listen" data-target="msg-b">' + (A.speech.listening === 'msg-b' ? 'Arrêter la dictée' : 'Dicter') + '</button>' : '') + '</div>';
    form += '<div class="field"><label for="msg-t">Objet <span class="opt">facultatif</span></label><input id="msg-t" name="title" type="text" value="' + esc(dr.title) + '" placeholder="Repris du message si vous le laissez vide"></div>';
    form += '<fieldset><legend>Priorité</legend><div class="choices">' + [1, 2, 3].map(p => '<label class="choice"><input type="radio" name="prio" value="' + p + '"' + (p === 2 ? ' checked' : '') + '><span>' + PRIO[p] + '</span></label>').join('') + '</div></fieldset>';
    form += '<button class="btn primary" type="submit">Mettre en file vers la Terre</button></form>';
    body += H.section('Écrire au médecin au sol', null, form);
    body += H.section('File d’attente vers la Terre', 'Les alertes passent avant les messages importants, qui passent avant la routine. Pendant une coupure, tout attend à bord.', queueTable(A) + '<p class="note" id="pack-note" style="margin-top:10px">Les données du jour sont compressées avant l’envoi.</p>');
    body += H.section('Délai radio sur toute la mission', null, delayChart(A));
    return H.page({ title: 'Liaison avec la Terre', state: H.state(st[0], st[1], st[2]), body });
  };

  /* ------------------------------------------------------------------ */
  /* Mission et cabine (contexte du vol, F1)                              */
  /* ------------------------------------------------------------------ */
  function timeline(A) {
    const W = Math.round(Math.max(320, UI.layoutWidth())), Hh = 96, x = UI.linear(0, D.mission.durationDays, 8, W - 8);
    const now = A.s.now / DAY;
    let s = '<svg class="arch" viewBox="0 0 ' + W + ' ' + Hh + '" width="' + W + '" height="' + Hh + '" role="img" aria-label="Frise de la mission : aller, séjour en surface, retour, conjonction solaire et jour actuel">';
    D.mission.phases.forEach(p => {
      const cur = now >= p.start && now < p.end;
      s += '<rect x="' + (x(p.start) + 1).toFixed(1) + '" y="30" width="' + (x(p.end) - x(p.start) - 2).toFixed(1) + '" height="26" rx="6" class="box"' + (cur ? ' style="fill:var(--aura-soft);stroke:var(--aura)"' : '') + '/>';
      s += '<text x="' + (x(p.start) + 10).toFixed(1) + '" y="48" class="t-sub">' + esc(p.label) + '</text>';
      s += '<text x="' + x(p.start).toFixed(1) + '" y="76" class="t-sub">' + esc(f.day(p.start)) + '</text>';
    });
    s += '<text x="' + x(D.mission.durationDays).toFixed(1) + '" y="76" class="t-sub" text-anchor="end">' + esc(f.day(D.mission.durationDays)) + '</text>';
    const c0 = x(D.mission.conjunction.start), c1 = x(D.mission.conjunction.end);
    s += '<rect x="' + c0.toFixed(1) + '" y="26" width="' + Math.max(3, c1 - c0).toFixed(1) + '" height="34" style="fill:var(--red);opacity:.35"/>';
    s += '<text x="' + ((c0 + c1) / 2).toFixed(1) + '" y="92" class="t-sub" text-anchor="middle">conjonction</text>';
    s += '<path d="M' + (x(now) - 6).toFixed(1) + ' 17 L' + (x(now) + 6).toFixed(1) + ' 17 L' + x(now).toFixed(1) + ' 26 Z" style="fill:var(--aura)"/>';
    s += '<text x="' + x(now).toFixed(1) + '" y="12" class="t-head" text-anchor="' + (now > 800 ? 'end' : now < 60 ? 'start' : 'middle') + '" style="fill:var(--aura-ink)">' + esc(f.day(now)) + ', aujourd’hui</text>';
    return s + '</svg>';
  }
  function contextTable(A) {
    const s = A.s, day = s.now / DAY, ph = E.phaseAt(D.mission, day);
    const L = E.lightMinutes(D.mission, day), bo = E.isBlackout(D.mission, day);
    const co2 = S.co2At(s, s.now), spe = S.speAt(s, s.now);
    const dk = A.donki;
    const recentFlr = dk.status === 'ok' ? dk.list.filter(x => /^[MX]/.test(x.classType || '')).length : null;
    const rows = [
      ['Phase', ph.label + (ph.gravity ? ', gravité ' + f.num(ph.gravity, 2) + ' g' : ', apesanteur'), 'Profil de mission (fictif)', 'à jour'],
      ['Jour de vol', f.day(day) + ' sur ' + D.mission.durationDays, 'Horloge de bord', 'à jour'],
      ['Délai radio', bo ? 'liaison coupée' : f.delay(L) + ' dans chaque sens', 'Modèle Terre-Mars simplifié', 'à jour'],
      ['CO₂ de la cabine', f.num(co2, 1) + ' mmHg sur une heure (limite 3)', 'Capteur de cabine (simulé)', 'il y a moins d’une heure'],
      ['Débit de dose', f.num(S.doseRateAt(s, s.now), S.doseRateAt(s, s.now) < 10 ? 2 : 0) + ' mSv par jour' + (spe ? ', éruption solaire en cours' : ''), 'Débits publiés, Curiosity (simulé)', 'à jour'],
      ['Dose reçue', f.num(S.radTotalNow(s), 0) + ' mSv depuis le départ (limite de carrière 600)', 'Calcul de bord', 'à jour'],
      ['Activité solaire réelle', dk.status === 'ok' ? recentFlr + ' éruption' + (recentFlr > 1 ? 's' : '') + ' de classe M ou X sur les 30 derniers jours' : dk.status === 'loading' ? 'interrogation en cours' : 'indisponible' + (dk.error ? ' (' + dk.error + ')' : ''), 'NASA DONKI, données réelles', dk.status === 'ok' ? 'interrogée ' + new Date(dk.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ', heure de votre ordinateur' : 'hors connexion ou non interrogée']
    ];
    return '<div class="table-wrap"><table class="table stack"><thead><tr><th>Information</th><th>En ce moment</th><th>Source</th><th>Fraîcheur</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td><b>' + esc(r[0]) + '</b></td><td data-label="Valeur">' + esc(r[1]) + '</td><td data-label="Source">' + esc(r[2]) + '</td><td data-label="Fraîcheur" class="' + (r[3].indexOf('indisponible') === 0 || r[3].indexOf('hors connexion') === 0 ? 'faint' : '') + '">' + esc(r[3]) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="note" style="margin-top:8px">Quand une information manque, AURA l’affiche comme indisponible au lieu d’inventer une valeur.</p>';
  }
  function donkiBlock(A) {
    const dk = A.donki;
    if (dk.status === 'loading') return '<p class="muted">Interrogation de la base DONKI de la NASA…</p>';
    if (dk.status !== 'ok') return '<div class="ai-off"><p style="margin:0">' + esc(dk.error ? 'DONKI n’a pas répondu : ' + dk.error + '. ' : '') + 'Les éruptions solaires réelles s’affichent ici quand la connexion le permet. Sans elle, AURA continue avec sa simulation.</p><div class="btn-row" style="margin-top:10px"><button class="btn sm" data-act="donki">Interroger DONKI maintenant</button></div></div>';
    const list = dk.list.slice().sort((a, b) => String(b.peakTime || '').localeCompare(String(a.peakTime || ''))).slice(0, 8);
    if (!list.length) return '<p class="empty">Aucune éruption enregistrée sur les 30 derniers jours.</p>';
    return '<ul class="list">' + list.map(x => {
      const cls = x.classType || '?';
      const big = /^X/.test(cls) ? 'vigilance' : 'info';
      const when = x.peakTime ? new Date(x.peakTime).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' (UTC)' : 'date inconnue';
      return '<li><div class="row"><div><div class="btn-row">' + UI.pill(big, 'Classe ' + cls) + '<span class="row-title">' + esc(when) + '</span></div><div class="row-meta" style="margin-top:4px">' + (x.sourceLocation ? 'Position ' + esc(x.sourceLocation) : '') + (x.activeRegionNum ? ', région active ' + esc(x.activeRegionNum) : '') + '</div></div>' + (/^[MX]/.test(cls) && !H.ground(A) ? '<button class="btn sm" data-act="replay-flare" data-cls="' + esc(cls) + '">Rejouer à bord, comme exercice</button>' : '') + '</div></li>';
    }).join('') + '</ul><p class="note">Rejouer une éruption crée un exercice : débit de dose multiplié par 40 pour une éruption de classe X, par 10 pour une classe M (valeurs de démonstration).</p>';
  }
  V.mission = function (A) {
    const s = A.s, now = s.now, d = H.today(A);
    const cfg = D.habitat.co2;
    const co2 = S.co2At(s, now), lv = E.co2Level(cfg, co2);
    const pts = [];
    for (let t = Math.floor((now - 72 * 60) / 60) * 60; t <= now; t += 60) if (t >= 0) pts.push({ x: t / DAY, y: S.co2At(s, t), t });
    const max24 = Math.max.apply(null, pts.filter(p => p.t > now - DAY).map(p => p.y));
    const rad = S.radTotalNow(s);
    let body = '<section class="section" style="margin-top:24px">' + timeline(A) + '</section>';
    body += H.section('Le contexte du vol, en ce moment', 'Ce que toutes les autres fonctions d’AURA prennent en compte : un même symptôme ne veut pas dire la même chose selon le contexte.', contextTable(A));
    body += H.section('Air de la cabine, 72 dernières heures', 'Les chances de mal de tête doublent environ pour chaque hausse de 1 mmHg. La norme NASA limite la moyenne sur une heure à 3 mmHg.', UI.xyChart({
      label: 'Pression partielle de CO2 dans la cabine, heure par heure, sur 72 heures', height: 230, yMin: 0, yMax: Math.max(6.5, Math.ceil(max24 + 1)), yTicks: 6, yTitle: 'mmHg',
      lines: [{ pts, cls: 'series' }], hlines: [{ y: cfg.limit, cls: 'limit', label: 'limite NASA : 3 mmHg' }],
      xFmt: v => f.day(v), xTicksValues: [d - 3, d - 2, d - 1, d].filter(x => x >= 0),
      hover: pts, tip: p => [f.num(p.y, 2) + ' mmHg', f.when(p.t), p.y > cfg.limit ? 'au-dessus de la limite' : 'sous la limite'],
      table: { head: ['Heure', 'CO₂ (mmHg)'], rows: pts.slice().reverse().map(p => [f.when(p.t), f.num(p.y, 2)]) }
    }) + '<p class="small" style="margin-top:10px">En ce moment : ' + esc(f.num(co2, 1)) + ' mmHg ' + UI.pill(lv, lv === 'normal' ? 'sous la limite' : 'au-dessus de la limite') + ', maximum sur 24 h : ' + esc(f.num(max24, 1)) + ' mmHg.</p>' + UI.sources(['ochmoCo2', 'law2014']));
    const cum = [{ x: 0, y: 0 }];
    let acc = 0;
    s.hab.slice().sort((a, b) => a.d - b.d).forEach(h => { acc += h.rad; cum.push({ x: h.d + 1, y: acc }); });
    cum.push({ x: now / DAY, y: rad });
    const end = E.radiationProjection(D.mission, D.habitat, now / DAY, rad);
    const proj = [{ x: now / DAY, y: rad }];
    for (let dd = Math.ceil(now / DAY / 10) * 10; dd < D.mission.durationDays; dd += 10) proj.push({ x: dd, y: E.radiationProjection(D.mission, D.habitat, now / DAY, rad) - E.radiationProjection(D.mission, D.habitat, dd, 0) });
    proj.push({ x: D.mission.durationDays, y: end });
    const hov = cum.filter((p, i) => i % 5 === 0).concat(proj.filter((p, i) => i % 3 === 0)).sort((a, b) => a.x - b.x);
    body += H.section('Rayonnement sur la mission', 'Cumul jusqu’à aujourd’hui, puis projection jusqu’au retour avec les débits publiés : environ ' + esc(f.num(end, 0)) + NB + 'mSv à la fin.', UI.xyChart({
      label: 'Dose cumulée en millisieverts depuis le départ, et projection jusqu’au retour', height: 250, yMin: 0, yMax: Math.max(1100, end * 1.1), yTitle: 'mSv', xMin: 0, xMax: D.mission.durationDays,
      lines: [{ pts: cum, cls: 'series' }, { pts: proj, cls: 'proj' }], hlines: [{ y: D.habitat.radiation.careerLimit, cls: 'limit', label: 'limite de carrière NASA : 600 mSv' }],
      vlines: [{ x: now / DAY, label: 'aujourd’hui' }], xFmt: v => f.day(v), xTicksValues: [0, 180, 360, 540, 720, 900],
      hover: hov, tip: p => [f.num(p.y, 0) + ' mSv', f.day(p.x), p.x <= now / DAY ? 'cumul' : 'projection'],
      legend: '<div class="legend"><span><i class="key line"></i>Cumul</span><span><i class="key line" style="background:var(--ink-3)"></i>Projection (pointillés)</span><span><i class="key line" style="background:var(--red)"></i>Limite de carrière</span></div>'
    }) + '<div class="prose" style="margin-top:12px"><p>Pendant le trajet, la sonde Curiosity a mesuré environ 1,8 mSv par jour ; à la surface de Mars, environ 0,64 mSv par jour. Pour 180 jours d’aller, 500 jours sur place et 180 jours de retour, l’estimation publiée est d’environ 1 Sv, au-dessus de la limite de carrière de 600 mSv : c’est une limite connue des missions vers Mars, pas une erreur de calcul.</p></div>' + UI.sources(['zeitlin2013', 'hassler2014', 'ochmoRad']));
    body += H.section('Activité solaire réelle', 'Éruptions des 30 derniers jours, lues en direct dans la base DONKI de la NASA quand la connexion le permet.', donkiBlock(A) + UI.sources(['donki']));
    body += H.section('Ce qui change par rapport à la Station spatiale internationale', null, '<div class="prose"><p>Sur l’ISS, un problème sérieux se règle avec un médecin au sol joignable en direct, et un retour sur Terre est possible en cas d’urgence. Vers Mars, chaque question met jusqu’à 44 minutes pour obtenir une réponse, la liaison se coupe deux semaines pendant la conjonction, et aucun retour anticipé n’est possible.</p><p>L’équipage doit donc interpréter ses propres mesures, décider et agir à bord, avec les médicaments emportés au départ. C’est ce que vise AURA : mettre à bord la connaissance des conditions du vol que le médecin au sol a aujourd’hui en tête.</p></div>' + UI.sources(['russell2023', 'conjonction']));
    body += '<div class="cols">' + H.section('Moyens médicaux à bord', null, '<ul class="list">' + D.mission.onboard.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>') +
      H.section('Données réelles prévues', 'Toutes les mesures de cette démonstration sont simulées, de façon reproductible.', '<ul class="list">' + D.realData.map(r => '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.name) + '</a><div class="row-meta">' + esc(r.use) + '</div></li>').join('') + '</ul>') + '</div>';
    return H.page({ title: 'Mission et cabine', state: H.state(lv === 'normal' && !S.speAt(s, now) ? 'normal' : 'vigilance', H.phaseText(A) + ', jour ' + d + ' sur ' + D.mission.durationDays + '.', esc(D.mission.name) + ', fictive. ' + esc(H.earthLine(A))), body });
  };

  /* ------------------------------------------------------------------ */
  /* Réglages                                                             */
  /* ------------------------------------------------------------------ */
  V.settings = function (A) {
    const set = A.set;
    const cfg = A.ai;
    const cur = AI.current(cfg);
    const role = A.s.role;
    const seg = (act, items, val, label) => '<div class="seg" role="group" aria-label="' + esc(label) + '">' + items.map(x => '<button data-act="' + act + '" data-v="' + x[0] + '" aria-pressed="' + (x[0] === val) + '">' + esc(x[1]) + '</button>').join('') + '</div>';
    let body = '';
    const who = role === 'crew' ? S.name(A.s.me) + ', vue de l’équipage' : role === 'doctor' ? 'Médecin de bord (Keiko Tanaka)' : 'Médecin au sol';
    body += H.section('Profil', null, '<div class="row"><p style="margin:0">Vous utilisez AURA en tant que : <b>' + esc(who) + '</b>.</p><a class="btn sm" href="#/bienvenue">Changer de profil</a></div>');
    body += H.section('Langage', 'La même alerte peut s’afficher de deux façons : en mots simples pour un membre d’équipage, en vocabulaire clinique pour la médecin. Le responsable médical à bord n’est pas toujours médecin, et il peut être lui-même le malade.', seg('set-level', [['simple', 'Simple, non-médecin'], ['medical', 'Médical, expert']], H.level(A), 'Niveau de langage'));
    body += H.section('Affichage', null, '<div class="btn-row" style="gap:18px"><div><p class="small muted" style="margin-bottom:6px">Taille du texte</p>' + seg('set-text', [['normal', 'Normal'], ['large', 'Grand']], set.text || 'normal', 'Taille du texte') + '</div><div><p class="small muted" style="margin-bottom:6px">Thème</p>' + seg('set-theme', [['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']], set.theme || 'auto', 'Thème') + '</div></div>');
    body += H.section('Voix', A.speech.canListen ? 'La dictée utilise la reconnaissance vocale du navigateur, qui peut avoir besoin d’une connexion. Une version sans internet (Whisper) est prévue pour la suite.' : 'Ce navigateur ne propose pas la dictée. Vous pouvez toujours répondre au clavier.', '<div class="toggles">' + (A.speech.canSpeak ? '<label class="toggle"><input type="checkbox" data-change="voice-read"' + (set.voice.read ? ' checked' : '') + '><span>Lire à voix haute les questions de l’entretien de la semaine</span></label>' : '<p class="muted">La lecture à voix haute n’est pas disponible dans ce navigateur.</p>') + '</div>' + (A.speech.canSpeak ? '<div class="btn-row" style="margin-top:10px"><button class="btn sm" data-act="voice-test">Essayer la voix</button></div>' : ''));
    // IA
    let ai = '<p class="muted">Facultative. Le cœur d’AURA (normes, alertes, pharmacie, liaison) n’en a jamais besoin. Une IA connectée rédige les réponses de l’assistant à partir des fiches, mène l’entretien de la semaine, prépare la synthèse et les messages. Les textes de l’IA sont toujours signalés et à relire.</p>';
    ai += '<div class="tiles" style="margin-top:14px">' + Object.keys(AI.PRESETS).map(id => { const p = AI.PRESETS[id]; return '<button class="tile' + (cur.id === id ? ' selected' : '') + '" data-act="ai-provider" data-id="' + id + '" aria-pressed="' + (cur.id === id) + '"><b>' + esc(p.label) + '</b><span>' + esc(id === 'none' ? 'Fiches de bord et règles, rien ne sort du navigateur' : id === 'anthropic' ? 'Claude Sonnet, Opus, Fable ou Haiku' : id === 'ollama' ? 'Modèle sur l’ordinateur, sans internet' : id === 'custom' ? 'Adresse et modèle au choix' : 'Service compatible avec l’API OpenAI') + '</span></button>'; }).join('') + '</div>';
    if (cur.kind !== 'none') {
      const p = cur.preset;
      ai += '<form data-form="ai-config" class="panel" style="margin-top:16px" autocomplete="off">';
      if (p.note) ai += '<p class="small muted">' + esc(p.note) + '</p>';
      if (!p.noKey) ai += '<div class="field"><label for="ai-key">Clé d’accès</label><input id="ai-key" name="key" type="password" value="' + esc(cur.key) + '" placeholder="' + esc(p.keyHint || '') + '" spellcheck="false"><span class="hint">Gardée seulement dans ce navigateur, envoyée seulement à ' + esc(p.label) + '. Jamais dans le dépôt GitHub.' + (p.keyUrl ? ' <a href="' + esc(p.keyUrl) + '" target="_blank" rel="noopener">Créer une clé</a>' : '') + '</span></div>';
      if (p.models) ai += '<div class="field"><label for="ai-model">Modèle</label><select id="ai-model" name="model">' + p.models.concat(A.flow.models && A.flow.models.id === cur.id ? A.flow.models.list.filter(m => !p.models.some(x => x.id === m.id)) : []).map(m => '<option value="' + esc(m.id) + '"' + (m.id === cur.model ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') + '</select></div>';
      else ai += '<div class="field"><label for="ai-model">Modèle</label><input id="ai-model" name="model" type="text" value="' + esc(cur.model) + '" placeholder="' + esc(p.modelHint || '') + '" list="ai-models" spellcheck="false"><datalist id="ai-models">' + (A.flow.models && A.flow.models.id === cur.id ? A.flow.models.list.map(m => '<option value="' + esc(m.id) + '">').join('') : '') + '</datalist></div>';
      if (cur.id === 'custom' || cur.id === 'ollama') ai += '<div class="field"><label for="ai-base">Adresse de l’API</label><input id="ai-base" name="base" type="url" value="' + esc(cur.base) + '" placeholder="https://…/v1" spellcheck="false"></div>';
      ai += '<div class="btn-row"><button class="btn primary" type="submit">Enregistrer</button><button class="btn" type="button" data-act="ai-test">Tester la connexion</button><button class="btn quiet" type="button" data-act="ai-models">Lister les modèles</button></div>';
      if (A.flow.aiTest) ai += '<p class="note" style="margin-top:12px" aria-live="polite">' + esc(A.flow.aiTest) + '</p>';
      ai += '</form>';
      ai += '<p class="note" style="margin-top:12px">Ce qui part vers le service choisi : votre question, les fiches de bord retrouvées et un court résumé de la situation de bord (fictive). Avec Ollama, rien ne quitte l’ordinateur.</p>';
    }
    body += H.section('Intelligence artificielle', null, ai);
    body += H.section('Données de la NASA', 'AURA lit les éruptions solaires réelles dans la base DONKI. La clé de démonstration DEMO_KEY suffit pour quelques requêtes par heure.', '<form data-form="donki-key" class="btn-row" style="align-items:flex-end"><div class="field" style="margin:0;flex:1 1 280px"><label for="dk">Clé api.nasa.gov (facultative)</label><input id="dk" name="key" type="text" value="' + esc(set.donkiKey || '') + '" placeholder="DEMO_KEY" spellcheck="false"></div><button class="btn" type="submit">Enregistrer</button></form>');
    body += H.section('Démonstration', null, '<div class="btn-row"><button class="btn" data-act="demo-open">Ouvrir les commandes de démonstration</button></div>');
    return H.page({ title: 'Réglages', calm: true, lead: 'Ces réglages restent dans ce navigateur.', body });
  };

  /* ------------------------------------------------------------------ */
  /* À propos                                                            */
  /* ------------------------------------------------------------------ */
  function architecture() {
    return '<svg class="arch" viewBox="0 0 720 300" role="img" aria-label="Architecture en deux étages : un cœur qui fonctionne sans connexion ni IA, et un étage IA facultatif">' +
      '<rect class="ai" x="1" y="1" width="718" height="78" rx="12"/>' +
      '<text x="20" y="28" class="t-head">Étage IA, facultatif</text><text x="20" y="48" class="t-sub">Claude, service compatible OpenAI, ou Ollama sur l’ordinateur, sans internet</text>' +
      '<text x="20" y="66" class="t-sub">assistant sourcé, entretien de la semaine, synthèse, reformulation, messages</text>' +
      '<path d="M360 80 L360 104"/><path d="M354 98 L360 106 L366 98"/>' +
      '<rect class="core" x="1" y="108" width="718" height="190" rx="12"/>' +
      '<text x="20" y="134" class="t-head">Cœur, à bord, sans connexion et sans IA</text>' +
      [['Mesures et symptômes', 'trois contrôles de cohérence'], ['Normes adaptées', 'cinq couches, filtre bayésien'], ['Alarmes et urgence', 'vérifiées avant tout calcul'], ['Actions et pharmacie', 'six vérifications avant traitement'],
        ['Planification', 'Monte Carlo des besoins'], ['Bien-être', 'privé, test de réaction'], ['Synthèse de la semaine', 'règles, journal de bord'], ['File vers la Terre', 'priorités, conjonction']]
        .map((b, i) => { const col = i % 4, row = Math.floor(i / 4); const x = 18 + col * 176, y = 150 + row * 70; return '<rect class="box" x="' + x + '" y="' + y + '" width="164" height="58" rx="8"/><text x="' + (x + 10) + '" y="' + (y + 24) + '" class="t-head" style="font-size:13px">' + b[0] + '</text><text x="' + (x + 10) + '" y="' + (y + 44) + '" class="t-sub">' + b[1] + '</text>'; }).join('') +
      '</svg>';
  }
  V.about = function (A) {
    const src = Object.keys(D.SOURCES).filter(k => k !== 'aura' && k !== 'general');
    const feats = [
      ['F1', 'Profil de mission et contexte spatial', '#/mission'], ['F2', 'Préparation de la trousse médicale, trois scénarios', '#/planification'],
      ['F3', 'Lecture et vérification des mesures', '#/mesurer'], ['F4', 'Normes adaptées à l’espace et à chaque astronaute', '#/dossier'],
      ['F5', 'Signes d’alarme et mode urgence', '#/urgence'], ['F6', 'Proposition d’action adaptée au vol', '#/mesurer/symptome'],
      ['F7', 'Conférence médicale de la semaine avec l’IA', '#/conference'], ['F8', 'Questions libres, réponses sourcées', '#/assistant'],
      ['F9', 'Langage adapté à la personne', '#/reglages'], ['F10', 'Moral, stress et isolement', '#/bien-etre'],
      ['F11', 'Envoi des informations vers la Terre', '#/liaison'], ['F12', 'Écran du médecin et vue de l’équipage', '#/'], ['F13', 'Fonctionnement sans connexion', '#/a-propos']
    ];
    let body = H.section('Ce qu’est AURA', null, '<div class="prose"><p>AURA est une plateforme de suivi de la santé des astronautes pour les missions lointaines, préparée pour le défi « Create Health Monitoring Software for Astronauts on Space Missions » du NASA Space Apps Challenge 2026, au sein de l’événement local de Dakar.</p><p>Aujourd’hui, l’adaptation des repères médicaux aux conditions du vol se fait surtout dans la tête du médecin au sol : il sait que la température monte en apesanteur, qu’un mal de tête peut venir du CO₂, qu’un médicament stocké longtemps peut perdre de sa puissance. Vers Mars, ce médecin répond avec plusieurs dizaines de minutes de retard, et parfois plus du tout. AURA met cette connaissance à bord, écrite, sourcée et vérifiable.</p></div>');
    body += H.section('Les treize fonctionnalités', null, '<ul class="list">' + feats.map(x => '<li><div class="row"><a href="' + x[2] + '"><b>' + x[0] + '</b> ' + esc(x[1]) + '</a></div></li>').join('') + '</ul>');
    body += H.section('Deux étages', 'Le cœur fonctionne à bord sans internet et sans intelligence artificielle. L’IA n’est qu’un étage facultatif.', architecture());
    body += '<div class="cols">' + H.section('Ce qui est réellement calculé', null, '<ul class="list"><li>Le filtre bayésien de chaque référence personnelle, mesure après mesure</li><li>Les plages attendues, les alertes et les seuils fixes</li><li>Les trois contrôles de cohérence des mesures</li><li>La détection des signes d’alarme, avant tout calcul</li><li>Les six vérifications avant un traitement</li><li>La simulation Monte Carlo des besoins en médicaments</li><li>La file vers la Terre, avec délai et conjonction</li><li>La recherche documentaire hors connexion</li><li>La synthèse de la semaine et le test de réaction</li></ul>') +
      H.section('Ce qui est simulé', null, '<ul class="list"><li>L’équipage, ses mesures, ses points du soir et ses tests de réaction (fictifs)</li><li>Le CO₂ de la cabine et l’éruption solaire de démonstration</li><li>Les réponses automatiques du médecin au sol</li><li>Les fréquences des situations médicales et les heures perdues (illustratives)</li><li>Le modèle de distance Terre-Mars (simplifié)</li></ul><p class="note">Les éruptions solaires listées dans Mission et cabine sont réelles (NASA DONKI), quand la connexion le permet.</p>') + '</div>';
    body += H.section('Règles de sécurité', null, '<ul class="list"><li>Un signe d’alarme déclenche toujours l’alerte, même si les mesures sont normales.</li><li>Une valeur anormale n’est jamais intégrée à la référence : le système n’apprend pas que l’anormal est normal.</li><li>Les seuils fixes de sécurité ne sont jamais personnalisés.</li><li>Un décalage durable de la référence demande la décision de la médecin de bord.</li><li>AURA ne change jamais une dose : il propose d’en discuter, la médecin valide.</li><li>L’IA répond seulement à partir des fiches de bord et cite chacune ; sans fiche pertinente, elle le dit.</li><li>La partie psychologique de l’entretien ne part qu’avec l’accord de la personne.</li></ul>');
    body += H.section('Fonctionnement sans connexion', null, '<div class="prose"><p>Après le premier chargement, la plateforme s’ouvre et calcule sans réseau : le navigateur garde une copie de tous les fichiers, polices comprises. L’IA peut elle aussi fonctionner sans internet avec Ollama, sur l’ordinateur de bord.</p></div>');
    body += H.section('Sources', null, '<ul class="list">' + src.map(k => { const x = D.SOURCES[k]; return '<li><b>' + esc(x.label) + '</b>. ' + esc(x.ref) + (x.url ? ' <a href="' + esc(x.url) + '" target="_blank" rel="noopener">Lien</a>' : '') + '</li>'; }).join('') + '</ul>');
    body += H.section('Limites et suite', null, '<div class="prose"><p>Les écarts types, les fréquences des situations médicales, les heures perdues et les effets du contexte sont des valeurs de démonstration, à calibrer avec les données réelles des archives de la NASA. Les listes de signes d’alarme et les procédures d’urgence affichées sont des versions de démonstration, à valider par des médecins.</p><p>Suite prévue : brancher de vrais capteurs portés, calibrer les modèles sur les données LSDA et OSDR, faire tourner l’IA et la dictée (Whisper) en local, et faire relire les règles par des médecins.</p></div>');
    body += '<div class="cols">' + H.section('Le projet', null, '<div class="prose"><p>NASA Space Apps Challenge 2026, événement local de Dakar. Code source ouvert :</p><p><a href="https://github.com/TahibouTALL/demo-test-nasa-space-apps" target="_blank" rel="noopener">github.com/TahibouTALL/demo-test-nasa-space-apps</a></p><p class="note">Le code et les textes de cette plateforme ont été produits avec l’aide d’un assistant d’intelligence artificielle, ce qui est à déclarer dans la soumission, conformément aux règles du concours.</p></div>') +
      H.section('Ouvrir sur un téléphone', null, '<img class="qr" src="assets/qr-aura.svg" alt="Code QR vers la plateforme AURA en ligne" width="140" height="140"><p class="note">tahiboutall.github.io/demo-test-nasa-space-apps</p>') + '</div>';
    return H.page({ title: 'À propos d’AURA', lead: 'Ce que fait la plateforme, ce qui est calculé, ce qui est simulé, et d’où viennent les chiffres.', body });
  };
})(typeof self !== 'undefined' ? self : this);
