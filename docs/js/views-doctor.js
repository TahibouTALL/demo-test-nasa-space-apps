/* AURA : pages de la médecin de bord et du médecin au sol.
   Vocabulaire clinique par défaut (réglable), tout l’équipage, décisions de
   validation. Le médecin au sol ne voit que ce qui est arrivé sur Terre, avec
   l’âge de chaque information. */
(function (root) {
  'use strict';
  const V = root.AURA_VIEWS;
  const D = root.AURA_DATA, E = root.AURA_ENGINE, S = root.AURA_STORE, UI = root.AURA_UI, AI = root.AURA_AI;
  const H = V.H;
  const f = E.fmt, esc = UI.esc, NB = E.NBSP, DAY = 1440;
  const METRICS = H.METRICS;
  const EFFECT = { aucun: 'Aucun effet', partiel: 'Effet partiel', complet: 'Effet complet' };

  /* ------------------------------------------------------------------ */
  /* Équipage (accueil de la médecin de bord)                             */
  /* ------------------------------------------------------------------ */
  function doctorState(A) {
    const s = A.s;
    const co2 = S.co2At(s, s.now);
    const open = s.alerts.filter(a => a.st !== 'close');
    const sub = (open.length ? open.length + ' alerte' + (open.length > 1 ? 's' : '') + ' ouverte' + (open.length > 1 ? 's' : '') + '. ' : 'Aucune alerte ouverte. ') +
      'CO₂ cabine ' + f.num(co2, 1) + NB + 'mmHg, ' + (co2 > D.habitat.co2.limit ? 'au-dessus de la limite. ' : 'sous la limite. ') + H.phaseText(A) + ', jour ' + H.today(A) + '.';
    if (s.emergency) return { level: 'urgence', text: 'Mode urgence : ' + s.emergency.title.charAt(0).toLowerCase() + s.emergency.title.slice(1) + '.', sub: '<a href="#/urgence">Ouvrir la procédure</a>. ' + esc(sub) };
    const watch = D.crew.map(c => ({ c, st: V.personStatus(A, c.id) })).filter(x => x.st.level !== 'normal');
    const names = watch.map(x => x.c.name);
    const text = !watch.length ? 'Tout l’équipage est dans sa zone.' : watch.length === 1 ? 'Une personne à regarder : ' + names[0] + '.' : watch.length + ' personnes à regarder : ' + names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1] + '.';
    return { level: watch.some(x => x.st.level === 'urgence') ? 'urgence' : watch.length ? 'vigilance' : 'normal', text, sub: esc(sub) };
  }

  function todoDoctor(A) {
    const s = A.s, items = [];
    s.alerts.filter(a => a.st !== 'close').slice(0, 4).forEach(al => items.push({ title: al.title, meta: UI.LEVEL[al.lv] + ', ' + H.ago(A, al.t), actions: '<a class="btn sm" href="#/alertes">Voir</a>' }));
    s.vals.filter(v => v.st === 'ouverte').forEach(v => items.push({ title: 'Valider une référence : ' + D.metrics[v.k].lc + ' ' + S.deName(v.a), meta: 'Décalage durable depuis ' + f.when(v.drift.since * DAY), actions: '<a class="btn sm" href="#/dossier/' + v.a + '?m=' + v.k + '">Examiner</a>' }));
    S.pendingFollowUps(s).forEach(ad => items.push({ title: 'Noter l’effet : ' + S.medById[ad.med].name, meta: 'Pris par ' + S.name(ad.a) + ' ' + H.ago(A, ad.t), actions: '<a class="btn sm" href="#/pharmacie">Noter</a>' }));
    D.crew.forEach(c => D.meds.forEach(m => {
      const r = S.responses(s, c.id, m.id);
      if (r.hint && !s.factor[m.id].t) items.push({ title: 'Discuter la dose : ' + m.name, meta: c.name + ' : effet partiel ou nul ' + (r.counts.aucun + r.counts.partiel) + ' fois sur ' + r.rated, actions: '<a class="btn sm" href="#/pharmacie">Voir</a>' });
    }));
    return items;
  }

  V.crewOverview = function (A) {
    const s = A.s;
    const st = doctorState(A);
    let body = '<section class="section" style="margin-top:28px"><div class="people">' + D.crew.map(c => V.personPanel(A, c)).join('') + '</div>' +
      '<p class="note" style="margin-top:12px">Chaque valeur est lue avec la référence en vol de la personne. ' + esc(S.name('a1')) + ' est la suppléante de la médecin de bord.</p></section>';
    const items = todoDoctor(A);
    body += H.section('À traiter', null, items.length ? V.todoHtml(items) : '<p class="empty">Rien à traiter pour le moment.</p>');
    const week = Math.floor(H.today(A) / 7);
    const confs = D.crew.map(c => S.conferenceStatus(s, c.id, week));
    const done = confs.filter(x => x.done).length;
    const withDoc = confs.filter(x => x.mode !== 'ia').length;
    const L = E.lightMinutes(D.mission, s.now / DAY), bo = E.isBlackout(D.mission, s.now / DAY);
    body += '<div class="cols">' +
      H.section('Conférences de la semaine', null, '<p>' + (done ? done + ' sur ' + D.crew.length + ' faite' + (done > 1 ? 's' : '') + '.' : 'Aucune faite pour l’instant.') + ' ' + (withDoc === D.crew.length ? 'Cette semaine, le médecin au sol les mène.' : withDoc ? withDoc + ' avec le médecin au sol, ' + (D.crew.length - withDoc) + ' avec l’IA.' : 'Cette semaine, l’IA du vaisseau les mène.') + '</p><div class="btn-row"><a class="btn sm" href="#/conference">Voir la synthèse</a></div>') +
      H.section('Cabine et liaison', null, '<dl class="kv"><dt>CO₂ cabine</dt><dd>' + esc(f.num(S.co2At(s, s.now), 1)) + NB + 'mmHg</dd><dt>Dose cumulée</dt><dd>' + esc(f.num(S.radTotalNow(s), 0)) + NB + 'mSv par personne</dd><dt>Délai radio</dt><dd>' + (bo ? 'liaison coupée' : esc(f.delay(L)) + ' dans chaque sens') + '</dd><dt>Messages en file</dt><dd>' + s.queue.filter(q => !q.sentAt).length + '</dd></dl>') + '</div>';
    body += H.section('Journal de bord', null, V.journal(A, 8));
    return H.page({ title: 'Équipage', state: H.state(st.level, st.text, st.sub), body });
  };

  /* ------------------------------------------------------------------ */
  /* Alertes                                                              */
  /* ------------------------------------------------------------------ */
  V.alerts = function (A) {
    const s = A.s;
    const open = s.alerts.filter(a => a.st !== 'close' && (!H.crew(A) || !a.a || a.a === s.me));
    const showAll = A.route.q.vue === 'toutes';
    let body = '';
    if (s.emergency) body += '<section class="section" style="margin-top:24px">' + V.procedure(A) + '</section>';
    const list = showAll ? s.alerts.filter(a => a.t <= s.now && (!H.crew(A) || !a.a || a.a === s.me)).slice(0, 60) : open;
    body += '<section class="section"' + (s.emergency ? '' : ' style="margin-top:24px"') + '><div class="tabs" role="tablist"><a role="tab" href="#/alertes" aria-selected="' + !showAll + '">Ouvertes (' + open.length + ')</a><a role="tab" href="#/alertes?vue=toutes" aria-selected="' + showAll + '">Historique</a></div>' + V.alertList(A, list, { empty: showAll ? 'Aucune alerte.' : 'Aucune alerte ouverte. Tout est calme.' }) + '</section>';
    if (H.doc(A)) body += H.section('Exercices', 'Pour vérifier la réaction de la plateforme. Les exercices sont notés comme tels dans le journal.', '<div class="btn-row"><button class="btn" data-act="spe-now">Simuler une éruption solaire maintenant</button><button class="btn" data-act="drill" data-kind="co2">Exercice CO₂ critique</button><button class="btn" data-act="drill" data-kind="vital">Exercice valeur vitale critique</button></div>');
    body += H.section('Comment AURA décide d’alerter', null, '<div class="prose"><p><b>Signe d’alarme</b> : une douleur dans la poitrine, une difficulté à respirer, un malaise ou un autre signe grave déclenche toujours l’alerte, avant tout calcul et même si les mesures sont normales.</p><p><b>Vigilance</b> : la valeur sort de la plage attendue pour la personne (plus de 2,5 écarts types). Elle se referme seule si la mesure suivante est normale.</p><p><b>Alerte</b> : écart de plus de 3,5 écarts types, ou seuil fixe franchi (par exemple 39 °C, saturation sous 90 %, pouls de repos au-dessus de 120). Seule la médecin de bord la clôt.</p><p><b>Mode urgence</b> : seuil fixe franchi, signe d’alarme, éruption solaire ou CO₂ critique. La procédure s’affiche sur toutes les pages et un message prioritaire passe en tête de la file vers la Terre.</p></div>' + UI.sources(['aura', 'ochmoCo2', 'ochmoRad']));
    const st = s.emergency ? ['urgence', 'Mode urgence en cours.'] : open.some(a => a.lv === 'urgence') ? ['urgence', open.length + ' alerte' + (open.length > 1 ? 's' : '') + ' ouverte' + (open.length > 1 ? 's' : '') + ', dont une à traiter maintenant.'] : open.length ? ['vigilance', open.length + ' point' + (open.length > 1 ? 's' : '') + ' à regarder, rien d’urgent.'] : ['normal', 'Aucune alerte ouverte.'];
    return H.page({ title: 'Alertes', state: H.state(st[0], st[1], H.crew(A) ? 'Ce qui vous concerne, et pourquoi.' : 'Alertes de l’équipage et de la cabine, avec leur explication.'), body });
  };

  /* ------------------------------------------------------------------ */
  /* Pharmacie                                                           */
  /* ------------------------------------------------------------------ */
  V.pharmacy = function (A) {
    const s = A.s, doc = H.doc(A), d = H.today(A);
    let body = '';
    const due = S.pendingFollowUps(s).filter(ad => doc || ad.a === s.me);
    const fb = !due.length ? '<p class="empty">Aucun suivi en attente.</p>' : '<ul class="list">' + due.map(ad => {
      const med = S.medById[ad.med];
      return '<li><div class="row"><div style="flex:1 1 280px"><span class="row-title">' + esc(med.name) + ' : ' + esc(H.unitsTxt(ad.units, med)) + ' pour ' + esc(H.who(A, ad.a)) + '</span><div class="row-meta">Pris ' + esc(H.ago(A, ad.t)) + '.</div>' +
        '<label class="visually-hidden" for="side-' + ad.id + '">Effet indésirable</label><input id="side-' + ad.id + '" type="text" placeholder="Effet indésirable éventuel (facultatif)" style="margin-top:8px;max-width:420px"></div>' +
        '<div class="btn-row">' + ['aucun', 'partiel', 'complet'].map(e => '<button class="btn sm' + (e === 'complet' ? ' primary' : '') + '" data-act="effect" data-id="' + ad.id + '" data-effect="' + e + '">' + EFFECT[e] + '</button>').join('') + '</div></div></li>';
    }).join('') + '</ul>';
    body += H.section('Suivis après une prise', 'Noter l’effet de chaque prise permet de décider d’un ajustement de dose : en vol, un comprimé n’a peut-être pas le même effet qu’au sol.', fb);
    let tb = '<div class="table-wrap"><table class="table"><thead><tr><th>Médicament</th><th class="num">Stock</th><th>Dose validée</th><th>État</th><th></th></tr></thead><tbody>';
    D.meds.forEach(m => {
      const stock = s.stock[m.id], fac = s.factor[m.id], units = S.validatedUnits(s, m.id);
      const flags = E.medFlags(m, stock, d, D.mission);
      tb += '<tr><td><b>' + esc(m.name) + '</b><span class="sub">' + esc(m.use) + (m.drowsy ? ', peut endormir' : '') + '</span></td>';
      tb += '<td class="num"><span class="val">' + esc(f.num(stock, stock % 1 ? 1 : 0)) + '</span><span class="sub">sur ' + m.stock + '</span></td>';
      tb += '<td class="nowrap">' + esc(H.unitsTxt(units, m)) + '<span class="sub">' + (fac.f !== 1 ? 'facteur ' + esc(f.num(fac.f, 2)) + ', ' + esc(f.when(fac.t)) : 'dose standard') + '</span></td>';
      tb += '<td>' + (flags.length ? flags.map(x => UI.pill(x.level, x.text)).join(' ') : '<span class="faint">rien à signaler</span>') + '</td><td class="num">';
      if (A.ui.admin && A.ui.admin.med === m.id) tb += V.adminForm(A, m.id, A.ui.admin.a);
      else if (A.ui.factor !== m.id) tb += '<div class="btn-row" style="justify-content:flex-end"><button class="btn sm" data-act="admin-open" data-med="' + m.id + '" data-a="' + s.me + '">' + (doc ? 'Administrer' : 'Noter une prise') + '</button>' + (doc ? '<button class="btn sm quiet" data-act="factor-open" data-med="' + m.id + '">Modifier la dose</button>' : '') + '</div>';
      tb += '</td></tr>';
      if (doc && A.ui.factor === m.id) {
        tb += '<tr><td colspan="5"><form data-form="factor" class="callout calm"><input type="hidden" name="med" value="' + m.id + '"><p><b>Facteur de dose pour ' + esc(m.name) + '.</b> Dose standard : ' + esc(H.unitsTxt(m.dose, m)) + '. Le facteur s’applique aux prises suivantes, et la décision part vers le médecin au sol.</p><fieldset><legend>Facteur</legend><div class="choices">' +
          [0.5, 0.75, 1, 1.25, 1.5, 2].map(v => '<label class="choice"><input type="radio" name="f" value="' + v + '"' + (v === fac.f ? ' checked' : '') + '><span>× ' + esc(f.num(v, 2)) + ' (' + esc(H.unitsTxt(E.doseUnits(m, v), m)) + ')</span></label>').join('') + '</div></fieldset>' +
          '<div class="field"><label for="fac-n">Justification (obligatoire)</label><textarea id="fac-n" name="note" required placeholder="Par exemple : effet partiel sur trois prises, pas d’effet indésirable"></textarea></div><div class="btn-row"><button class="btn primary" type="submit">Valider la dose</button><button class="btn quiet" type="button" data-act="factor-cancel">Annuler</button></div></form></td></tr>';
      }
    });
    tb += '</tbody></table></div>';
    body += H.section('Stock et état des médicaments', 'Stock à bord, dose validée, péremption avant la fin de la mission et puissance des produits stockés longtemps.', tb + UI.sources(['du2011', 'wotring2015']));
    if (doc) {
      let rb = '<div class="table-wrap"><table class="table"><thead><tr><th>Membre d’équipage</th><th>Médicament</th><th class="num">Prises</th><th class="num">Complet</th><th class="num">Partiel</th><th class="num">Aucun</th><th>Lecture</th></tr></thead><tbody>';
      let n = 0;
      D.crew.forEach(c => D.meds.forEach(m => {
        const r = S.responses(s, c.id, m.id);
        if (!r.total) return;
        n++;
        rb += '<tr><td>' + esc(c.name) + '</td><td>' + esc(m.name) + '</td><td class="num">' + r.total + '</td><td class="num">' + r.counts.complet + '</td><td class="num">' + r.counts.partiel + '</td><td class="num">' + r.counts.aucun + '</td><td>' + (r.hint ? UI.pill('vigilance', 'Discuter la dose') : '<span class="faint">rien à signaler</span>') + '</td></tr>';
      }));
      rb += '</tbody></table></div>';
      body += H.section('Réponses aux traitements', 'Quand l’effet reste partiel, AURA propose d’en discuter. Il ne change jamais la dose lui-même.', (n ? rb : '<p class="empty">Aucune prise pour le moment.</p>') + UI.sources(['dellorusso2022']));
    }
    body += H.section('Avant chaque traitement, AURA vérifie', null, V.steps([
      { title: 'Qu’il est à bord', text: 'Le stock de la pharmacie, mis à jour à chaque prise.' },
      { title: 'Qu’il en reste assez', text: 'Pour cette prise, et sans vider la réserve d’une mission sans réapprovisionnement.' },
      { title: 'Qu’il est encore bon', text: 'Date de péremption du lot et puissance des produits stockés longtemps à bord.' },
      { title: 'Qu’il est faisable à bord', text: 'Une injection reste un geste de la médecin de bord.' },
      { title: 'Qu’il ne gêne pas les tâches à venir', text: 'Un médicament qui endort n’est pas proposé avant une sortie extravéhiculaire.' },
      { title: 'Le temps de réponse du sol', text: 'Quand la réponse du sol arrive trop tard, la décision se prend à bord.' }
    ]) + UI.sources(['aura']));
    body += H.section('Pourquoi ces précautions', null, '<div class="prose"><p>Après 28 mois sur la Station spatiale internationale, une plus grande part de médicaments avaient une teneur en principe actif plus faible que les mêmes lots gardés au sol. Une autre étude a trouvé huit médicaments sur neuf encore conformes après 550 jours à bord. Le stockage long est donc à surveiller, sans conclure qu’un produit est inefficace.</p><p>L’apesanteur modifie aussi la répartition des liquides du corps, ce qui peut changer l’effet d’un médicament, mais les mesures chez les astronautes restent rares. AURA garde la dose standard tant que la médecin n’a pas validé un facteur, et note l’effet de chaque prise pour éclairer cette décision.</p></div>' + UI.sources(['du2011', 'wotring2015', 'dellorusso2022']));
    const fuN = due.length;
    return H.page({ title: 'Pharmacie', state: H.state(fuN ? 'vigilance' : 'normal', fuN ? fuN + ' suivi' + (fuN > 1 ? 's' : '') + ' de traitement à noter.' : 'Pharmacie à jour.', 'Quatorze médicaments à bord, sans réapprovisionnement possible avant le retour.'), body });
  };

  /* ------------------------------------------------------------------ */
  /* Planification (Monte Carlo)                                          */
  /* ------------------------------------------------------------------ */
  V.planning = function (A) {
    const p = A.plan;
    let form = '<form data-form="plan" class="panel"><div class="cols" style="gap:0 28px">';
    form += '<fieldset><legend>Période</legend><div class="choices">' + [['avant', 'Mission complète, stock de départ'], ['reste', 'Reste de la mission, stock actuel']].map(o => '<label class="choice"><input type="radio" name="mode" value="' + o[0] + '"' + (p.mode === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>').join('') + '</div></fieldset>';
    form += '<fieldset><legend>Scénario</legend><div class="choices">' + Object.keys(D.planningScenarios).map(k => '<label class="choice"><input type="radio" name="scenario" value="' + k + '"' + (p.scenario === k ? ' checked' : '') + '><span>' + esc(D.planningScenarios[k].label) + ' (× ' + esc(f.num(D.planningScenarios[k].multiplier, 1)) + ')</span></label>').join('') + '</div></fieldset></div>';
    form += '<div class="btn-row" style="align-items:flex-end"><div class="field" style="margin:0"><label for="pl-r">Missions simulées</label><select id="pl-r" name="runs" style="width:auto">' + [1000, 5000, 20000].map(n => '<option value="' + n + '"' + (p.runs === n ? ' selected' : '') + '>' + f.num(n, 0) + '</option>').join('') + '</select></div><button class="btn primary" type="submit">Lancer la simulation</button></div></form>';
    let body = '<section class="section" style="margin-top:24px">' + form + '</section>';
    if (p.result) {
      const res = p.result.rows.slice().sort((a, b) => b.pStockout - a.pStockout || b.p99 / b.stock - a.p99 / a.stock);
      const risky = res.filter(r => r.pStockout > 0.05);
      const sc = D.planningScenarios[p.result.scenario];
      body += '<section class="section"><div class="section-head"><div><h2>Résultat</h2><p>' + esc(f.num(p.result.runs, 0)) + ' missions simulées en scénario ' + esc(sc.label.toLowerCase()) + ', ' + (p.result.mode === 'avant' ? 'de ' + f.day(0) + ' à ' + f.day(D.mission.durationDays) + ' avec le stock de départ' : 'de ' + f.day(p.result.start) + ' à ' + f.day(D.mission.durationDays) + ' avec le stock actuel') + '. Calcul fait dans ce navigateur en ' + esc(f.num(p.result.ms, 0)) + NB + 'ms.</p></div></div>';
      body += '<div class="callout ' + (risky.length ? 'attention' : 'calm') + '"><p>' + (risky.length ? '<b>' + UI.plural(risky.length, 'médicament') + ' risque' + (risky.length > 1 ? 'nt' : '') + ' de manquer dans plus de 5 % des missions simulées : </b>' + esc(risky.map(r => S.medById[r.med].name).join(', ')) + '.' : '<b>Aucun médicament ne manque dans plus de 5 % des missions simulées.</b>') + '</p></div>';
      if (p.result.lost) {
        const L = p.result.lost;
        body += '<div class="stats" style="margin-top:20px"><div class="stat"><div class="s-label">Temps de travail perdu, en moyenne</div><div class="s-value">' + esc(f.num(L.pctMean * 100, 1)) + '<small>%</small></div><div class="s-sub">' + esc(f.num(L.mean, 0)) + ' h pour l’équipage (illustratif)</div></div><div class="stat"><div class="s-label">Dans 10 % des missions, plus de</div><div class="s-value">' + esc(f.num(L.pctP90 * 100, 1)) + '<small>%</small></div><div class="s-sub">' + esc(f.num(L.p90, 0)) + ' h</div></div></div><p class="note">Idée reprise de l’outil IMPACT de la NASA. Heures perdues par épisode illustratives, sur une base de 8 heures de travail par jour et par personne.</p>';
      }
      let tb = '<div class="table-wrap" style="margin-top:16px"><table class="table"><thead><tr><th>Médicament</th><th class="num">Stock</th><th class="num">Besoin médian</th><th class="num">Besoin à 90 %</th><th class="num">Besoin à 99 %</th><th class="num">Risque de rupture</th><th>Recommandation</th></tr></thead><tbody>';
      res.forEach(r => {
        const m = S.medById[r.med];
        const lvl = r.pStockout > 0.05 ? 'urgence' : r.pStockout > 0.01 ? 'vigilance' : 'normal';
        let reco;
        const extra = Math.max(1, Math.ceil(r.p99 - r.stock));
        if (r.pStockout > 0.01) reco = p.result.mode === 'avant' ? 'Embarquer au moins ' + f.num(extra, 0) + ' ' + m.units + (extra > 1 ? 's' : '') + ' de plus' : 'Pas de réapprovisionnement possible : économiser et en parler en conférence';
        else if (r.p99 < r.stock * 0.5) reco = 'Largement suffisant';
        else reco = 'Suffisant';
        tb += '<tr class="clickable" data-act="plan-med" data-med="' + r.med + '"' + (p.med === r.med ? ' style="background:var(--aura-soft)"' : '') + '><td><b>' + esc(m.name) + '</b></td><td class="num">' + esc(f.num(r.stock, 0)) + '</td><td class="num">' + esc(f.num(r.p50, 0)) + '</td><td class="num">' + esc(f.num(r.p90, 0)) + '</td><td class="num">' + esc(f.num(r.p99, 0)) + '</td><td class="num">' + UI.pill(lvl, r.pStockout === 0 ? '0' + NB + '%' : r.pStockout < 0.001 ? '<' + NB + '0,1' + NB + '%' : f.pct(r.pStockout, r.pStockout < 0.1 ? 1 : 0)) + '</td><td>' + esc(reco) + '</td></tr>';
      });
      tb += '</tbody></table></div>';
      body += tb;
      const sel = res.find(r => r.med === p.med) || res[0];
      const m = S.medById[sel.med];
      body += '<h3 style="margin-top:24px">' + esc(m.name) + ' : répartition des besoins</h3><p class="note">Chaque barre regroupe des missions simulées selon la quantité consommée. À droite du trait, la mission manque de ce médicament. Cliquez une ligne du tableau pour changer de médicament.</p>';
      body += UI.histogram({ hist: sel.hist, top: sel.histTop, stock: sel.stock, label: 'Répartition de la consommation de ' + m.name + ' sur les missions simulées', unitLabel: m.units + 's', xTitle: m.units + 's consommés sur la période' });
      body += '</section>';
    } else body += '<div class="callout calm"><p>Choisissez une période et un scénario, puis lancez la simulation. Le calcul se fait à bord, sans connexion.</p></div>';
    // Péremption avant la fin
    const exp = D.meds.filter(m => m.expiryDay < D.mission.durationDays).sort((a, b) => a.expiryDay - b.expiryDay);
    body += H.section('Ce qui se périme avant la fin de la mission', 'Vers Mars, rien ne se remplace en route : un lot périmé à ' + f.day(730) + ' manque pendant tout le retour.', exp.length ? '<ul class="list">' + exp.map(m => '<li><div class="row"><span class="row-title">' + esc(m.name) + '</span><span class="row-meta">périme à ' + esc(f.day(m.expiryDay)) + ', ' + (D.mission.durationDays - m.expiryDay) + ' jours avant le retour</span></div></li>').join('') + '</ul><p class="note">À embarquer en lots plus récents, ou à prévoir en double avec des dates différentes.</p>' : '<p class="empty">Aucun lot ne se périme avant la fin.</p>');
    let cond = '<div class="table-wrap"><table class="table"><thead><tr><th>Situation</th><th class="num">Épisodes par personne et par an</th><th class="num">Heures perdues</th><th>Besoin par épisode</th></tr></thead><tbody>';
    D.conditions.forEach(c => {
      cond += '<tr><td>' + esc(c.label) + '</td><td class="num">' + (c.perTransition !== undefined ? esc(f.pct(c.perTransition)) + ' par changement de gravité' : esc(f.num(c.rate, c.rate < 1 ? 2 : 0))) + '</td><td class="num">' + esc(f.num(c.hoursLost || 0, c.hoursLost % 1 ? 1 : 0)) + '</td><td>' + esc(c.meds.map(n => S.medById[n.med].name + ' : ' + (n.min === n.max ? n.min : n.min + ' à ' + n.max)).join(' ; ')) + '</td></tr>';
    });
    cond += '</tbody></table></div>';
    body += H.section('Méthode', null, '<div class="prose"><p>Pour chaque mission simulée, AURA tire au hasard le nombre d’épisodes de chaque situation médicale pour chaque membre d’équipage (loi de Poisson), puis la quantité de médicament utilisée par épisode. En répétant l’opération des milliers de fois, on obtient la répartition des besoins et la probabilité de manquer. Le scénario pessimiste multiplie toutes les fréquences par 1,4, l’optimiste par 0,7.</p><p><b>Les fréquences ci-dessous sont illustratives.</b> Elles sont à remplacer par celles du modèle médical intégré de la NASA (IMM) et de la surveillance de santé des astronautes (LSAH).</p></div><details class="values"><summary>Voir les fréquences utilisées</summary>' + cond + '</details>');
    return H.page({ title: 'Planification de la pharmacie', lead: 'Combien de médicaments emporter pour une mission où rien ne se remplace ?', body });
  };

  /* ------------------------------------------------------------------ */
  /* Bien-être de l’équipage (vue médecin)                                */
  /* ------------------------------------------------------------------ */
  V.wellbeingDoctor = function (A) {
    const s = A.s, d = H.today(A);
    const sel = A.route.q.a && S.crewById[A.route.q.a] ? A.route.q.a : 'a3';
    let tb = '<div class="table-wrap"><table class="table stack"><thead><tr><th>Membre d’équipage</th><th class="num">Humeur</th><th class="num">Stress</th><th class="num">Sommeil</th><th class="num">Réaction</th><th>Points d’attention</th></tr></thead><tbody>';
    D.crew.forEach(c => {
      const w = S.wellbeingState(s, c.id);
      tb += '<tr class="clickable" data-href="#/bien-etre?a=' + c.id + '"' + (c.id === sel ? ' style="background:var(--aura-soft)"' : '') + '><td><b>' + esc(c.name) + '</b></td><td class="num" data-label="Humeur">' + esc(f.num(w.an.mood7, 1)) + '</td><td class="num" data-label="Stress">' + esc(f.num(w.an.stress7, 1)) + '</td><td class="num" data-label="Sommeil">' + esc(f.hours(w.an.sleep7)) + '</td><td class="num" data-label="Réaction">' + (w.rt.last ? esc(f.num(w.rt.last.median, 0)) + NB + 'ms' : 'n.d.') + '</td><td data-label="Attention">' + (w.flags.length ? w.flags.map(x => esc(x.doctor)).join('<br>') : '<span class="faint">rien de particulier</span>') + '</td></tr>';
    });
    tb += '</tbody></table></div><p class="note" style="margin-top:8px">Moyennes sur 7 jours. Humeur et stress sur 5. Ce ne sont pas des diagnostics : ces indicateurs aident à préparer l’entretien de la semaine.</p>';
    let body = H.section('Équipage', null, tb);
    const notes = s.wb.filter(w => w.a === sel && w.share && w.note).slice(-5).reverse();
    body += H.section(S.name(sel), null, V.wbCharts(A, sel, 21) + '<h3 style="margin-top:22px">Temps de réaction</h3>' + V.rtChart(A, sel) + (notes.length ? '<h3 style="margin-top:20px">Notes partagées</h3><ul class="list">' + notes.map(w => '<li><span class="row-meta">' + esc(f.when(w.t)) + '</span><p style="margin:4px 0 0">' + esc(w.note) + '</p></li>').join('') + '</ul>' : '<p class="note" style="margin-top:16px">Aucune note partagée. Les notes personnelles restent privées tant que la personne ne choisit pas de les partager.</p>'));
    const watch = D.crew.filter(c => S.wellbeingState(s, c.id).level !== 'none');
    return H.page({ title: 'Bien-être de l’équipage', state: H.state(watch.length ? 'vigilance' : 'normal', watch.length ? watch.map(c => c.name).join(' et ') + ' : à accompagner cette semaine.' : 'Rien de particulier cette semaine.', 'Sommeil, moral, stress et temps de réaction, pour préparer les entretiens.'), body });
  };

  /* ------------------------------------------------------------------ */
  /* Conférence (vue médecin de bord)                                     */
  /* ------------------------------------------------------------------ */
  // Les conférences de la semaine, sans leur contenu : qui, quand, avec qui, où on en est
  V.confList = function (A, confs) {
    return '<ul class="list">' + confs.map(x => {
      const st = x.st;
      const meta = st.done ? H.confHistoryLine(st) : st.state === 'non faite' ? 'Prévue ' + H.confWhen(A, st.t) + ', non faite.' : 'Rendez-vous ' + H.confWhen(A, st.t) + (st.mode === 'ia' ? ' : ' + H.confReason(st) + '.' : '.');
      return '<li><div class="row"><div class="btn-row" style="flex:1 1 280px;flex-wrap:nowrap">' + UI.avatar(x.c.name) + '<div style="min-width:0"><div class="row-title">' + esc(x.c.name) + '</div><div class="row-meta">' + esc(meta) + '</div></div></div><div class="btn-row">' + H.confModePill(st) + H.confStatePill(st, { doctor: true }) + '</div></div></li>';
    }).join('') + '</ul>';
  };

  V.conferenceDoctor = function (A) {
    const s = A.s, today = H.today(A);
    const end = Math.min(today, Math.max(6, parseInt(A.route.q.fin, 10) || today));
    const rep = S.weeklyReport(s, end);
    const week = Math.floor(today / 7);
    const confs = D.crew.map(c => ({ c, st: S.conferenceStatus(s, c.id, week) }));
    const done = confs.filter(x => x.st.done).length;
    let body = '';
    body += '<section class="section" style="margin-top:24px"><div class="btn-row" style="justify-content:space-between"><div class="btn-row"><a class="btn sm" href="#/conference?fin=' + (end - 7) + '">Semaine précédente</a>' + (end < today ? '<a class="btn sm" href="#/conference?fin=' + Math.min(today, end + 7) + '">Semaine suivante</a>' : '') + '</div></div></section>';
    body += H.section('Points à discuter', 'Repérés dans le journal de la semaine : sommeil, moral, temps de réaction, traitements, alertes, cabine, questions.', rep.points.length ? '<ul class="list">' + rep.points.map(p => '<li><div class="btn-row">' + UI.pill('info', { bienetre: 'Bien-être', pharmacie: 'Pharmacie', alerte: 'Alertes', habitat: 'Cabine', medecin: 'Référence', question: 'Question', conference: 'Conférence' }[p.kind] || 'Point') + '<span>' + esc(p.text) + '</span></div></li>').join('') + '</ul>' : '<p class="empty">Aucun point particulier cette semaine.</p>');
    // Synthèse
    const sy = A.flow.synth && A.flow.synth.end === end ? A.flow.synth : null;
    const busy = A.busy.synth;
    let box = '';
    if (A.aiReady()) {
      box += '<div class="ai-box">' + V.origin({ ai: sy && sy.ai ? sy.ai : A.aiLabel() }) +
        '<div class="ai-out" id="synth-out" aria-live="polite">' + (sy && sy.text ? AI.md(sy.text) : busy ? '<span class="typing"><i></i><i></i><i></i></span>' : '<p class="muted">L’IA rédige une synthèse claire à partir du rapport de la semaine, préparé à bord par des règles. Vous la relisez avant l’envoi.</p>') + '</div>' +
        (sy && sy.error ? '<p class="note">' + esc(sy.error) + '</p>' : '') +
        '<div class="btn-row" style="margin-top:14px">' + (busy ? '<button class="btn" data-act="ai-stop">Arrêter</button>' : '<button class="btn primary" data-act="synth">' + (sy && sy.text ? 'Rédiger à nouveau' : 'Rédiger avec l’IA') + '</button>') +
        (sy && sy.text && !busy ? '<button class="btn" data-act="synth-edit">Modifier</button><button class="btn" data-act="synth-send" data-end="' + end + '">Envoyer au médecin au sol</button><button class="btn quiet" data-act="synth-rephrase" data-mode="simple">Plus simple</button><button class="btn quiet" data-act="synth-rephrase" data-mode="english">En anglais</button>' : '') + '</div>';
      if (A.ui.synthEdit && sy) box += '<form data-form="synth-edit" style="margin-top:12px"><textarea name="text" class="ai-edit">' + esc(sy.text) + '</textarea><div class="btn-row" style="margin-top:8px"><button class="btn primary" type="submit">Garder ces modifications</button></div></form>';
      box += '</div>';
      box += '<details class="disclose"><summary>Rapport à base de règles, sans IA</summary><pre style="white-space:pre-wrap;font-family:inherit;font-size:.92rem;color:var(--ink-2)">' + esc(S.reportText(s, rep)) + '</pre></details>';
    } else {
      box += '<div class="ai-box">' + V.origin({ ai: null }) + '<textarea class="ai-edit" id="synth-rules" aria-label="Synthèse de la semaine">' + esc(S.reportText(s, rep)) + '</textarea><div class="btn-row" style="margin-top:12px"><button class="btn" data-act="copy-report" data-end="' + end + '">Copier le texte</button><button class="btn primary" data-act="send-report" data-end="' + end + '">Envoyer au médecin au sol</button></div></div><p class="note" style="margin-top:10px">Avec une IA connectée dans les <a href="#/reglages">réglages</a>, AURA peut rédiger une synthèse plus lisible à partir de ce même rapport. Les faits restent ceux-ci.</p>';
    }
    body += H.section('Synthèse pour le médecin au sol', null, box);
    // Conférences médicales de la semaine
    body += H.section('Conférences médicales de la semaine', 'Un rendez-vous par personne et par semaine. Le médecin au sol le mène tant qu’une conversation est possible ; sinon, l’IA du vaisseau.', V.confList(A, confs) + '<p class="note" style="margin-top:10px">Le contenu des conférences reste privé entre chaque personne et le médecin au sol. La partie psychologique ne part qu’avec l’accord de la personne.</p>');
    // Mesures
    let tb = '<div class="table-wrap"><table class="table stack"><thead><tr><th>Membre d’équipage</th><th>Température</th><th>Pouls au repos</th><th>SpO₂</th><th>Sommeil</th><th>Humeur</th></tr></thead><tbody>';
    rep.crew.forEach(c => {
      const cell = (k, lab) => {
        const m = c.metrics[k], cfg = D.metrics[k];
        if (!m.n) return '<td class="faint" data-label="' + lab + '">n.d.</td>';
        return '<td data-label="' + lab + '"><span class="val">' + esc(f.unit(m.mean, cfg, 1)) + '</span><span class="sub">' + (m.prev !== null ? 'avant : ' + esc(f.unit(m.prev, cfg, 1)) : '') + (m.out ? ', ' + m.out + ' hors plage' : '') + '</span></td>';
      };
      tb += '<tr><td><b>' + esc(c.name) + '</b><span class="sub">' + esc(c.role) + '</span></td>' + cell('temp', 'Température') + cell('hr', 'Pouls') + cell('spo2', 'SpO₂') + '<td data-label="Sommeil">' + esc(f.hours(c.wb.sleep7)) + '</td><td data-label="Humeur">' + esc(f.num(c.wb.mood7, 1)) + ' sur 5</td></tr>';
    });
    tb += '</tbody></table></div>';
    body += H.section('Mesures de la semaine', 'Moyennes de la semaine, comparées à la semaine précédente.', tb);
    body += '<div class="cols">' + H.section('Cabine', null, '<dl class="kv"><dt>CO₂ moyen</dt><dd>' + esc(f.num(rep.habitat.co2Mean, 1)) + ' mmHg</dd><dt>CO₂ maximal</dt><dd>' + esc(f.num(rep.habitat.co2Max, 1)) + ' mmHg</dd><dt>Au-dessus de 3 mmHg</dt><dd>' + rep.habitat.co2Hours + ' h</dd><dt>Dose de la semaine</dt><dd>' + esc(f.num(rep.habitat.radWeek, 1)) + ' mSv</dd><dt>Cumul</dt><dd>' + esc(f.num(rep.habitat.radTotal, 0)) + ' mSv</dd></dl>') +
      H.section('Activité', null, '<dl class="kv"><dt>Alertes</dt><dd>' + rep.alerts.total + ' (' + rep.alerts.vigilance + ' vigilance, ' + rep.alerts.urgence + ' alerte)</dd><dt>Encore ouvertes</dt><dd>' + rep.alerts.open + '</dd><dt>Prises de médicament</dt><dd>' + rep.admins + '</dd><dt>Symptômes signalés</dt><dd>' + rep.symptoms + '</dd></dl>') + '</div>';
    body += '<details class="disclose" style="margin-top:28px"><summary>Qui mène la conférence, et pourquoi</summary>' + V.confExplain(A, null) + '</details>';
    return H.page({ title: 'Synthèse de la semaine', state: H.state('normal', (done ? done + ' conférence' + (done > 1 ? 's' : '') + ' sur ' + D.crew.length + ' faite' + (done > 1 ? 's' : '') + ' cette semaine. ' : 'Aucune conférence faite cette semaine pour l’instant. ') + (rep.points.length ? rep.points.length + ' point' + (rep.points.length > 1 ? 's' : '') + ' à discuter.' : 'Rien de particulier à discuter.'), 'Semaine de ' + esc(f.day(rep.start)) + ' à ' + esc(f.day(rep.end)) + '. Délai radio : ' + (E.isBlackout(D.mission, s.now / DAY) ? 'liaison coupée.' : esc(f.delay(E.lightMinutes(D.mission, s.now / DAY))) + ' dans chaque sens.')), body });
  };

  /* ------------------------------------------------------------------ */
  /* Médecin au sol (F12)                                                 */
  /* ------------------------------------------------------------------ */
  const KIND = { alerte: 'Alerte prioritaire', conference: 'Conférence de la semaine', 'conf-prep': 'Conférence en direct', rapport: 'Rapport de la semaine', synthese: 'Synthèse de la semaine', donnees: 'Données du jour', message: 'Message', psy: 'Demande d’entretien' };
  function groundState(A) {
    const s = A.s;
    const items = S.groundItems(s);
    const unread = items.filter(it => !s.ground.read[it.id] && it.kind !== 'donnees');
    const L = E.lightMinutes(D.mission, s.now / DAY);
    const bo = E.isBlackout(D.mission, s.now / DAY);
    const urgent = unread.find(it => it.prio === 1);
    const last = items[0];
    const text = urgent ? 'Une alerte prioritaire est arrivée du vaisseau.' : unread.length ? (unread.length > 1 ? unread.length + ' nouvelles informations' : 'Une nouvelle information') + ' du vaisseau.' : 'Rien de nouveau depuis votre dernière lecture.';
    const sub = bo ? 'La liaison est coupée par la conjonction solaire jusqu’à ' + f.day(D.mission.conjunction.end) + ' : rien n’arrive, rien ne part.' : 'Ce que vous voyez a au moins ' + f.delay(L) + ' de retard : c’est le temps du trajet de la lumière depuis le vaisseau.' + (last ? ' Dernière arrivée ' + H.since(A, last.arrAt) + '.' : '');
    return { level: urgent ? 'urgence' : unread.length ? 'vigilance' : 'normal', text, sub };
  }

  function replyBox(A, it) {
    const draft = (A.flow.reply && A.flow.reply[it.id]) || { title: 'Réponse : ' + it.title, text: '' };
    const busy = A.busy['reply-' + it.id];
    return '<form data-form="ground-reply" class="panel soft" style="margin-top:12px"><input type="hidden" name="ref" value="' + it.id + '">' +
      '<div class="field"><label for="gr-t-' + it.id + '">Objet</label><input id="gr-t-' + it.id + '" name="title" type="text" value="' + esc(draft.title) + '"></div>' +
      '<div class="field"><label for="gr-b-' + it.id + '">Plan de soin ou réponse</label><textarea id="gr-b-' + it.id + '" name="text" class="ai-edit" style="min-height:150px">' + esc(draft.text) + '</textarea>' + (draft.ai ? '<span class="hint">Brouillon rédigé par l’IA (' + esc(draft.ai) + ') : relisez et corrigez avant l’envoi.</span>' : '') + '</div>' +
      '<fieldset><legend>Priorité</legend><div class="choices">' + [[1, 'Urgent'], [2, 'Important'], [3, 'Routine']].map(p => '<label class="choice"><input type="radio" name="prio" value="' + p[0] + '"' + (p[0] === (it.prio === 1 ? 1 : 2) ? ' checked' : '') + '><span>' + p[1] + '</span></label>').join('') + '</div></fieldset>' +
      '<div class="btn-row">' + (A.aiReady() ? (busy ? '<button type="button" class="btn" data-act="ai-stop">Arrêter</button>' : '<button type="button" class="btn" data-act="care-draft" data-id="' + it.id + '">Proposer un brouillon avec l’IA</button>') : '<button type="button" class="btn" data-act="care-template" data-id="' + it.id + '">Préparer un modèle de réponse</button>') +
      '<button class="btn primary" type="submit">Envoyer vers le vaisseau</button><button type="button" class="btn quiet" data-act="reply-close">Annuler</button></div></form>';
  }

  // Aperçu lisible : on saute l’en-tête des rapports préparés à bord
  function preview(it) {
    let b = String(it.body || '');
    if (it.kind === 'rapport' || it.kind === 'synthese') b = b.replace(/^AURA : synthèse[^\n]*\n(Préparée[^\n]*\n)?\s*/, '');
    return b;
  }
  V.groundHome = function (A) {
    const s = A.s;
    const st = groundState(A);
    const all = S.groundItems(s);
    const lastPacket = all.find(x => x.kind === 'donnees');
    const items = all.filter(it => A.route.q.tout || it.kind !== 'donnees' || it === lastPacket);
    const shown = A.route.q.tout ? items.slice(0, 40) : items.slice(0, 8);
    let body = '<section class="section" style="margin-top:24px">';
    if (!shown.length) body += '<p class="empty">Rien n’est encore arrivé du vaisseau.</p>';
    const isRead = it => it.kind === 'donnees' || !!s.ground.read[it.id];
    const autoReply = it => s.inbox.find(m => m.ref === it.id && m.kind === 'reponse');
    // Le récent en cartes, le plus ancien en lignes simples : rien ne s’accumule comme une dette
    const recent = shown.filter(it => !isRead(it) || s.now - it.arrAt < 7 * DAY || A.ui.open[it.id]);
    const older = shown.filter(it => recent.indexOf(it) < 0);
    const card = it => {
      const read = isRead(it);
      const act = s.ground.acts[it.id];
      const down = act ? s.inbox.find(m => m.id === act.id) : null;
      const auto = !down ? autoReply(it) : null;
      const kindLv = it.prio === 1 ? 'urgence' : it.kind === 'conference' || it.kind === 'psy' ? 'normal' : 'info';
      const prepared = it.sentAt && it.sentAt - it.t > 5;
      let b = '<article class="panel g-item' + (read ? ' read' : '') + '" id="g-' + it.id + '">';
      b += '<div class="row"><div class="btn-row">' + UI.pill(kindLv, KIND[it.kind] || 'Message') + (read ? '' : '<span class="pill info plain">Nouveau</span>') + '</div><span class="row-meta">reçu ' + esc(H.since(A, it.arrAt)) + '</span></div>';
      b += '<h3 style="margin-top:10px">' + esc(it.title) + '</h3>';
      b += '<p class="row-meta">' + (prepared ? 'Préparé à bord à ' + esc(f.when(it.t)) + ', parti à ' + esc(f.clock(it.sentAt % DAY)) : 'Parti du vaisseau à ' + esc(f.when(it.sentAt || it.t))) + ', arrivé à ' + esc(f.clock(it.arrAt % DAY)) + ' après ' + esc(f.dur(Math.max(1, Math.round(it.arrAt - (it.sentAt || it.t))))) + ' de trajet.' + (it.ai ? ' Texte relu à bord, rédigé avec l’IA (' + esc(it.ai) + ').' : '') + '</p>';
      const text = preview(it);
      if (text) {
        const open = A.ui.open[it.id] || (!read && it.prio === 1);
        const long = text.length > 220;
        b += '<p class="g-body">' + esc(long && !open ? text.slice(0, 220).replace(/\s+\S*$/, '') + '…' : text) + '</p>' + (long ? '<div class="btn-row" style="margin-top:2px"><button class="btn quiet sm" data-act="g-open" data-id="' + it.id + '">' + (open ? 'Réduire' : 'Lire tout') + '</button></div>' : '');
      }
      if (down) b += '<div class="callout calm" style="margin-top:12px"><p><b>Réponse envoyée ' + esc(H.ago(A, down.t)) + '</b>, ' + (down.status === 'reçu' ? 'arrivée à bord à ' : 'arrivée à bord prévue à ') + esc(f.clock(down.arrAt % DAY)) + ' : « ' + esc(down.title) + ' ».</p></div>';
      else if (auto && A.ui.reply !== it.id) b += '<div class="callout calm" style="margin-top:12px"><p><b>Accusé de réception envoyé automatiquement</b> (démonstration), ' + (auto.status === 'reçu' ? 'arrivé à bord à ' : 'arrivée prévue à ') + esc(f.clock(auto.arrAt % DAY)) + '. Vous pouvez compléter si besoin.</p><div class="btn-row" style="margin-top:6px"><button class="btn quiet sm" data-act="reply-open" data-id="' + it.id + '">Compléter la réponse</button></div></div>';
      else if (it.kind !== 'donnees') {
        if (A.ui.reply === it.id) b += replyBox(A, it);
        else b += '<div class="btn-row" style="margin-top:12px"><button class="btn ' + (read ? '' : 'primary ') + 'sm" data-act="reply-open" data-id="' + it.id + '">Répondre</button>' + (it.kind === 'alerte' ? '<button class="btn sm" data-act="g-validate" data-id="' + it.id + '">Je valide la conduite à bord</button>' : '') + (!read ? '<button class="btn quiet sm" data-act="g-read" data-id="' + it.id + '">Marquer comme lu</button>' : '') + '</div>';
      }
      return b + '</article>';
    };
    recent.forEach(it => { body += card(it); });
    if (older.length) {
      body += '<h2 style="margin:30px 0 4px;font-size:1.1rem">Plus ancien</h2><ul class="list older">' + older.map(it => {
        const act = s.ground.acts[it.id], auto = autoReply(it);
        const state = act ? 'réponse envoyée' : auto ? 'accusé de réception automatique' : it.kind === 'donnees' ? 'données' : 'sans réponse';
        return '<li><div class="row"><div style="flex:1 1 300px"><div class="row-title">' + esc(it.title) + '</div><div class="row-meta">reçu ' + esc(H.since(A, it.arrAt)) + ', ' + esc(state) + '</div></div><button class="btn sm quiet" data-act="g-open" data-id="' + it.id + '">Ouvrir</button></div></li>';
      }).join('') + '</ul>';
    }
    body += '</section>';
    const hidden = items.length - shown.length;
    body += '<div class="btn-row" style="margin-top:14px">' + (A.route.q.tout ? '<a class="btn quiet" href="#/">Voir seulement le plus récent</a>' : (hidden > 0 || all.length > items.length ? '<a class="btn quiet" href="#/?tout=1">Voir tout l’historique reçu</a>' : '')) + '</div>';
    return H.page({ title: 'Reçu du vaisseau', state: H.state(st.level, st.text, st.sub), body });
  };

  /* ------------------------------------------------------------------ */
  /* Médecin au sol : les conférences de la semaine                       */
  /* ------------------------------------------------------------------ */
  function groundConfState(g) {
    const map = { 'à préparer': ['info', 'Questions à envoyer'], 'questions envoyées': ['info', 'Questions envoyées'], 'réponses reçues': ['normal', 'Réponses reçues'], 'répondue': ['normal', 'Répondue'], 'prévue': ['info', 'Prévue'], 'à faire': ['info', 'À faire'], 'faite': ['normal', 'Faite'], 'avec l’IA': ['info', 'Menée par l’IA'] };
    const m = map[g.state] || ['info', g.state];
    return UI.pill(m[0], m[1]);
  }
  function answersBlock(A, it, open) {
    const text = String(it.body || '');
    return open ? '<p class="g-body" style="margin-top:12px">' + esc(text) + '</p>' : '<details class="more" style="margin-top:10px"><summary>Voir ' + (it.mode === 'differe' ? 'les réponses' : 'le résumé') + '</summary><p class="g-body" style="margin-top:8px">' + esc(text) + '</p></details>';
  }
  function confCard(A, c, g) {
    const s = A.s, first = H.first(c.name);
    const linkOk = g.linkMode !== 'ia';
    let h = '<article class="panel conf-card" id="conf-' + c.id + '"><div class="conf-head">' + UI.avatar(c.name, { lg: true }) + '<div class="who"><div class="row-title">' + esc(c.name) + '</div><div class="conf-meta">' + esc(c.role) + ', rendez-vous ' + esc(H.confWhen(A, g.t)) + ', heure de bord</div></div><div class="btn-row">' + H.confModePill(g) + groundConfState(g) + '</div></div><div class="conf-body">';
    const unavailBtn = '<button class="btn sm quiet" data-act="conf-unavail" data-a="' + c.id + '" data-week="' + g.week + '">Je ne suis pas disponible</button>';
    const answersPart = () => {
      let b = '<p style="margin:0">' + (g.answers.mode === 'differe' ? 'Réponses ' + esc(S.de(first)) : 'Résumé de la conférence ' + esc(S.de(first)) + ' avec l’IA') + ', arrivé' + (g.answers.mode === 'differe' ? 'es' : '') + ' ' + esc(H.since(A, g.answers.arrAt)) + (g.answers.sim ? ' (réponses simulées)' : '') + '.</p>';
      b += answersBlock(A, g.answers, !g.reply);
      if (g.reply) {
        const auto = /simulée/.test(g.reply.from || '');
        b += '<div class="callout calm" style="margin-top:12px"><p><b>' + (auto ? 'Réponse automatique envoyée (démonstration)' : 'Réponse envoyée ' + esc(H.ago(A, g.reply.t))) + '</b>, ' + (g.reply.status === 'reçu' ? 'arrivée à bord à ' : 'arrivée prévue à ') + esc(f.clock(g.reply.arrAt % DAY)) + '.</p>' + (auto && A.ui.reply !== g.answers.id ? '<div class="btn-row" style="margin-top:6px"><button class="btn quiet sm" data-act="reply-open" data-id="' + g.answers.id + '">Compléter la réponse</button></div>' : '') + '</div>';
      } else if (A.ui.reply !== g.answers.id) b += '<div class="btn-row" style="margin-top:12px"><button class="btn primary sm" data-act="reply-open" data-id="' + g.answers.id + '">Répondre à ' + esc(first) + '</button></div>';
      if (A.ui.reply === g.answers.id) b += replyBox(A, g.answers);
      return b;
    };
    if (g.answers) h += answersPart();
    else if (g.mode === 'differe') {
      if (!g.questions.length) {
        h += '<p style="margin:0">AURA a préparé vos questions à partir des données reçues. Elles partiront ' + esc(H.confWhen(A, g.sendAt)) + ', la veille du rendez-vous, sauf si vous les envoyez avant.</p>';
        if (A.ui.confEdit === c.id) {
          const qs = S.plannedQuestions(s, c.id, g.week);
          h += '<form data-form="conf-questions" class="panel soft" style="margin-top:12px"><input type="hidden" name="a" value="' + c.id + '"><input type="hidden" name="week" value="' + g.week + '">' +
            qs.map((q, i) => '<div class="field"><label for="cq-' + c.id + '-' + q.id + '">' + esc((i + 1) + '. ' + q.label) + (q.part === 'psy' ? ' <span class="opt">partie psychologique, confidentielle</span>' : '') + '</label><textarea id="cq-' + c.id + '-' + q.id + '" name="q_' + q.id + '" style="min-height:64px">' + esc(q.q) + '</textarea></div>').join('') +
            '<div class="field"><label for="cq-' + c.id + '-new">Une question à vous <span class="opt">facultatif</span></label><textarea id="cq-' + c.id + '-new" name="q_new" style="min-height:64px" placeholder="Par exemple : comment se passe la reprise après la sortie de demain ?"></textarea></div>' +
            '<div class="btn-row"><button class="btn primary" type="submit">Envoyer maintenant</button><button class="btn quiet" type="button" data-act="conf-edit" data-a="' + c.id + '">Fermer</button></div></form>';
        } else h += '<div class="btn-row" style="margin-top:12px"><button class="btn sm" data-act="conf-edit" data-a="' + c.id + '">Voir et modifier les questions</button>' + unavailBtn + '</div>';
      } else {
        const q = g.questions[0];
        h += '<p style="margin:0">Questions envoyées ' + esc(H.ago(A, q.t)) + ', ' + (q.status === 'reçu' ? 'arrivées à bord à ' : 'arrivée prévue à ') + esc(f.clock(q.arrAt % DAY)) + (q.auto ? ', préparées par AURA' : '') + '. Les réponses ' + esc(S.de(first)) + ' arriveront ici, avec ' + esc(f.delay(g.delay)) + ' de délai.</p>';
        const all = [];
        g.questions.forEach(m => (m.qs || []).forEach(x => { if (!all.some(y => y.id === x.id)) all.push(x); }));
        h += '<details class="more" style="margin-top:10px"><summary>Voir les ' + all.length + ' questions</summary><ol class="small" style="margin:8px 0 0;padding-left:1.3rem;color:var(--ink-2)">' + all.map(x => '<li style="margin:4px 0">' + esc(x.q) + '</li>').join('') + '</ol></details>';
        h += '<form data-form="conf-addq" class="btn-row" style="margin-top:12px;align-items:flex-end"><input type="hidden" name="a" value="' + c.id + '"><input type="hidden" name="week" value="' + g.week + '"><div class="field" style="margin:0;flex:1 1 280px"><label for="caq-' + c.id + '">Ajouter une question</label><input id="caq-' + c.id + '" name="text" type="text" placeholder="Elle rejoindra les autres à bord"></div><button class="btn sm" type="submit">Envoyer</button></form>';
        h += '<div class="btn-row" style="margin-top:10px">' + unavailBtn + '</div>';
      }
    } else if (g.mode === 'direct') {
      if (g.state === 'faite') h += '<p style="margin:0">Visioconférence faite' + (g.live && g.live.tDone ? ' ' + esc(H.ago(A, g.live.tDone)) : '') + '.' + (g.notes ? ' Compte rendu envoyé à bord.' : '') + '</p>' + (g.notes ? '<p class="g-body" style="margin-top:8px">' + esc(g.notes.text) + '</p>' : '');
      else {
        h += '<p style="margin:0">Visioconférence de 15 minutes ' + esc(H.confWhen(A, g.t)) + ', avec ' + esc(f.delay(g.delay)) + ' de délai : vous vous parlez comme sur l’ISS. Six sujets : alimentation, sommeil, exercice, élimination, charge de travail et bien-être.</p>';
        if (g.prep) h += '<div class="callout calm" style="margin-top:12px"><p><b>Ce que ' + esc(first) + ' veut aborder</b>, reçu ' + esc(H.since(A, g.prep.arrAt)) + ' : « ' + esc(g.prep.body) + ' »</p></div>';
        h += '<form data-form="conf-close" class="panel soft" style="margin-top:12px"><input type="hidden" name="a" value="' + c.id + '"><input type="hidden" name="week" value="' + g.week + '"><div class="field"><label for="cc-' + c.id + '">Compte rendu, envoyé à ' + esc(first) + ' <span class="opt">facultatif</span></label><textarea id="cc-' + c.id + '" name="notes" style="min-height:90px" placeholder="Ce qui a été dit, ce qui est convenu pour la semaine."></textarea></div><div class="btn-row"><button class="btn primary" type="submit">Conférence faite</button>' + unavailBtn + '</div></form>';
      }
    } else {
      h += '<p style="margin:0">Cette semaine, AURA, l’IA du vaisseau, mène la visioconférence ' + esc(S.de(first)) + ' : ' + esc(H.confReason(g)) + '. Le résumé relu par ' + esc(first) + ' arrivera ici, et vous pourrez lui répondre.</p>';
      if (g.unavailable && linkOk) h += '<div class="btn-row" style="margin-top:12px"><button class="btn sm" data-act="conf-avail" data-a="' + c.id + '" data-week="' + g.week + '">Je suis finalement disponible</button></div>';
    }
    return h + '</div></article>';
  }
  V.groundConferences = function (A) {
    const s = A.s, week = S.weekOf(s.now);
    const list = D.crew.map(c => ({ c, g: S.groundConference(s, c.id, week) }));
    const byDoc = list.filter(x => x.g.mode !== 'ia');
    const L = E.lightMinutes(D.mission, s.now / DAY), bo = E.isBlackout(D.mission, s.now / DAY);
    const modes = byDoc.map(x => x.g.mode);
    const text = byDoc.length === list.length ? 'Cette semaine, vous menez les quatre visioconférences.' : byDoc.length ? 'Cette semaine, vous menez ' + byDoc.length + ' conférence' + (byDoc.length > 1 ? 's' : '') + ' sur ' + list.length + ' ; l’IA du vaisseau mène les autres.' : 'Cette semaine, AURA, l’IA du vaisseau, mène les visioconférences.';
    const sub = 'Semaine de ' + f.day(week * 7) + ' à ' + f.day(week * 7 + 6) + '. ' + (bo ? 'La liaison est coupée jusqu’à ' + f.day(D.mission.conjunction.end) + '.' : 'Délai : ' + f.delay(L) + ' dans chaque sens.') + ' Vous menez la visioconférence de 15 minutes tant qu’on peut se parler en direct ; sinon, AURA, l’IA du vaisseau, la mène et vous envoie le résumé.';
    let body = '<section class="section" style="margin-top:24px">' + list.map(x => confCard(A, x.c, x.g)).join('') + '</section>';
    // La semaine prochaine
    const next = D.crew.map(c => S.groundConference(s, c.id, week + 1));
    const nm = next.every(x => x.mode === next[0].mode) ? next[0] : null;
    body += H.section('La semaine prochaine', null, '<p>' + (nm ? (nm.mode === 'ia' ? 'AURA, l’IA du vaisseau, mènera les visioconférences : ' + esc(H.confReason(nm)) + '.' : nm.mode === 'direct' ? 'Vous mènerez les visioconférences.' : 'Vous mènerez les conférences en différé ; vos questions partiront la veille de chaque rendez-vous.') : 'Selon les jours, vous mènerez certaines conférences et l’IA les autres.') + '</p>');
    body += H.section('Qui mène la conférence, au fil de la mission', null, V.confExplain(A, null));
    return H.page({ title: 'Conférences de la semaine', state: H.state('normal', text, sub), body });
  };

  V.groundCrew = function (A) {
    const s = A.s;
    const pk = S.groundKnown(s);
    if (!pk) return H.page({ title: 'Équipage, vu du sol', lead: 'Aucun paquet de données n’est encore arrivé.', body: '' });
    const snap = pk.snap;
    let tb = '<div class="table-wrap"><table class="table stack"><thead><tr><th>Membre d’équipage</th><th>Température</th><th>Pouls au repos</th><th>SpO₂</th><th>Sommeil (7 j)</th><th>Points</th></tr></thead><tbody>';
    D.crew.forEach(c => {
      const row = snap[c.id] || {};
      const cell = (k, lab) => {
        const m = row[k], cfg = D.metrics[k];
        if (!m) return '<td class="faint" data-label="' + lab + '">n.d.</td>';
        return '<td data-label="' + lab + '"><span class="val">' + esc(f.unit(m.v, cfg)) + '</span> ' + (m.lv !== 'normal' ? UI.pill(m.lv) : '') + '<span class="sub">mesuré ' + esc(f.when(m.t)) + '</span></td>';
      };
      tb += '<tr><td><b>' + esc(c.name) + '</b><span class="sub">' + esc(c.role) + '</span></td>' + cell('temp', 'Température') + cell('hr', 'Pouls') + cell('spo2', 'SpO₂') + '<td data-label="Sommeil">' + esc(f.hours(row.sleep7)) + '</td><td data-label="Points">' + ((row.flags || []).concat(row.alerts || []).map(esc).join('<br>') || '<span class="faint">rien de particulier</span>') + '</td></tr>';
    });
    tb += '</tbody></table></div>';
    const body = '<section class="section" style="margin-top:24px">' + tb + '<p class="note" style="margin-top:10px">Vous voyez l’équipage tel qu’il était au départ du dernier paquet, pas tel qu’il est maintenant. Les alertes prioritaires, elles, partent tout de suite.</p></section>' +
      H.section('Pourquoi ce retard', null, '<div class="prose"><p>Les données de routine partent une fois par jour, à 22 h, après les messages plus importants. Elles mettent ensuite entre quelques secondes et plus de vingt minutes à arriver, selon la distance entre la Terre et Mars, et rien ne passe pendant les deux semaines de conjonction solaire.</p></div>' + UI.sources(['conjonction']));
    return H.page({ title: 'Équipage, vu du sol', state: H.state('normal', 'Dernier paquet de données : ' + f.when(snap.t) + '.', 'Arrivé ' + esc(H.since(A, pk.arrAt)) + '. Les mesures prises depuis ne sont pas encore arrivées.'), body });
  };
})(typeof self !== 'undefined' ? self : this);
