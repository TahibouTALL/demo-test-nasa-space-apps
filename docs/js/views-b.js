/* AURA : pages (2/2) : pharmacie, planification, bien-être, habitat,
   conférence, questions, liaison, mission, démonstration, à propos. */
(function (root) {
  'use strict';
  const V = root.AURA_VIEWS;
  const D = root.AURA_DATA, E = root.AURA_ENGINE, S = root.AURA_STORE, UI = root.AURA_UI;
  const H = V.helpers;
  const f = E.fmt, esc = UI.esc, NB = E.NBSP, DAY = 1440;
  const EFFECT = { aucun: 'Aucun effet', partiel: 'Effet partiel', complet: 'Effet complet' };
  const unitsTxt = (n, med) => f.num(n, n % 1 ? 1 : 0) + ' ' + med.units + (n > 1 ? 's' : '');

  /* ------------------------------------------------------------------ */
  /* Pharmacie                                                           */
  /* ------------------------------------------------------------------ */
  V.pharmacy = function (A) {
    const s = A.s, doc = H.doc(A), d = H.today(A);
    let body = '';
    const due = S.pendingFollowUps(s).filter(ad => doc || ad.a === s.me);
    let fb = '';
    if (!due.length) fb = '<p class="empty">Aucun suivi en attente.</p>';
    else fb = '<ul class="list">' + due.map(ad => {
      const med = S.medById[ad.med];
      return '<li><div class="list-row"><div style="flex:1 1 280px"><span class="list-title">' + esc(med.name) + ' : ' + esc(unitsTxt(ad.units, med)) + ' pour ' + esc(H.who(A, ad.a)) + '</span><div class="list-meta">Pris ' + esc(H.ago(A, ad.t)) + '. Comment ' + (H.who(A, ad.a) === 'vous' ? 'vous sentez-vous' : 'se sent ' + esc(UI.first(S.name(ad.a)))) + ' depuis ?</div>' +
        '<label class="visually-hidden" for="side-' + ad.id + '">Effet indésirable</label><input id="side-' + ad.id + '" type="text" placeholder="Effet indésirable éventuel (facultatif)" style="margin-top:8px;width:100%;max-width:420px"></div>' +
        '<div class="btn-row">' + ['aucun', 'partiel', 'complet'].map(e => '<button class="btn small' + (e === 'complet' ? ' primary' : '') + '" data-act="effect" data-id="' + ad.id + '" data-effect="' + e + '">' + EFFECT[e] + '</button>').join('') + '</div></div></li>';
    }).join('') + '</ul>';
    body += H.section('Suivis après une prise', 'Noter l’effet de chaque prise sert au médecin pour décider d’un éventuel ajustement de dose. C’est ainsi qu’AURA traite l’idée qu’en vol, un comprimé n’a peut-être pas le même effet qu’au sol.', fb, ' style="border-top:0;padding-top:0"');

    let tb = '<div class="table-wrap"><table class="table"><thead><tr><th>Médicament</th><th class="num">Stock</th><th>Dose validée</th><th>État</th><th></th></tr></thead><tbody>';
    D.meds.forEach(m => {
      const stock = s.stock[m.id], fac = s.factor[m.id], units = S.validatedUnits(s, m.id);
      const flags = E.medFlags(m, stock, d, D.mission);
      tb += '<tr><td><b>' + esc(m.name) + '</b><span class="sub">' + esc(m.use) + '</span></td>';
      tb += '<td class="num"><span class="val">' + esc(f.num(stock, stock % 1 ? 1 : 0)) + '</span><span class="sub">sur ' + m.stock + '</span></td>';
      tb += '<td class="nowrap">' + esc(unitsTxt(units, m)) + '<span class="sub">' + (fac.f !== 1 ? 'facteur ' + esc(f.num(fac.f, 2)) + ' validé ' + esc(f.when(fac.t)) : 'dose standard') + '</span></td>';
      tb += '<td>' + (flags.length ? flags.map(x => UI.pill(x.level === 'info' ? 'info' : x.level, x.text)).join(' ') : '<span class="faint">rien à signaler</span>') + '</td><td class="num">';
      if (A.ui.admin && A.ui.admin.med === m.id) tb += V.adminForm(A, m.id, A.ui.admin.a);
      else if (A.ui.factor === m.id) tb += '';
      else tb += '<div class="btn-row" style="justify-content:flex-end"><button class="btn small" data-act="admin-open" data-med="' + m.id + '" data-a="' + s.me + '">Administrer</button>' + (doc ? '<button class="btn small quiet" data-act="factor-open" data-med="' + m.id + '">Modifier la dose</button>' : '') + '</div>';
      tb += '</td></tr>';
      if (doc && A.ui.factor === m.id) {
        tb += '<tr><td colspan="5"><form data-form="factor" class="callout accent"><input type="hidden" name="med" value="' + m.id + '"><p><b>Facteur de dose pour ' + esc(m.name) + '</b>. La dose standard est de ' + esc(unitsTxt(m.dose, m)) + '. Le facteur s’applique à toute prise suivante et la décision part vers le médecin au sol.</p><div class="field"><span class="label">Facteur</span><div class="choices">' +
          [0.5, 0.75, 1, 1.25, 1.5, 2].map(v => '<label class="choice"><input type="radio" name="f" value="' + v + '"' + (v === fac.f ? ' checked' : '') + '><span>× ' + esc(f.num(v, 2)) + ' (' + esc(unitsTxt(E.doseUnits(m, v), m)) + ')</span></label>').join('') + '</div></div>' +
          '<div class="field"><label for="fac-n">Justification (obligatoire)</label><textarea id="fac-n" name="note" required placeholder="Par exemple : effet partiel sur trois prises, pas d’effet indésirable"></textarea></div><div class="btn-row"><button class="btn primary" type="submit">Valider la dose</button><button class="btn" type="button" data-act="factor-cancel">Annuler</button></div></form></td></tr>';
      }
    });
    tb += '</tbody></table></div>';
    body += H.section('Stock et état des médicaments', 'Stock à bord, dose validée par le médecin et points à surveiller : péremption avant la fin de mission et puissance des produits stockés longtemps à bord.', tb + UI.sources(['du2011', 'wotring2015']));

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
      body += H.section('Réponses aux traitements', 'Ce tableau croise chaque prise avec l’effet noté. Quand l’effet reste partiel, AURA propose d’en discuter ; il ne change jamais la dose lui-même.', (n ? rb : '<p class="empty">Aucune prise pour le moment.</p>') + UI.sources(['dellorusso2022']));
    }
    body += H.section('Pourquoi ces précautions', null, '<div class="prose"><p>Après 28 mois sur la Station spatiale internationale, une plus grande part de médicaments avaient une teneur en principe actif plus faible que les mêmes lots gardés au sol. Une autre étude a trouvé huit médicaments sur neuf encore conformes après 550 jours à bord. Le stockage long et le rayonnement sont donc à surveiller, sans conclure qu’un produit est inefficace.</p><p>L’apesanteur modifie aussi la répartition des liquides du corps, ce qui peut changer l’effet d’un médicament, mais les mesures chez les astronautes restent rares. AURA garde la dose standard tant que le médecin n’a pas validé un facteur, et note l’effet de chaque prise pour éclairer cette décision.</p></div>' + UI.sources(['du2011', 'wotring2015', 'dellorusso2022']));
    return H.page('Pharmacie', doc ? 'Stock, doses validées, stabilité des produits et réponses de chaque membre d’équipage.' : 'Médicaments disponibles à bord et suivi de leur effet.', null, body);
  };

  /* ------------------------------------------------------------------ */
  /* Planification de la pharmacie (Monte Carlo)                          */
  /* ------------------------------------------------------------------ */
  V.planning = function (A) {
    const p = A.plan;
    let form = '<form data-form="plan" class="btn-row" style="align-items:flex-end;gap:20px">';
    form += '<fieldset style="margin:0"><legend>Période</legend><div class="choices">' +
      [['avant', 'Mission complète, stock de départ'], ['reste', 'Reste de la mission, stock actuel']].map(o => '<label class="choice"><input type="radio" name="mode" value="' + o[0] + '"' + (p.mode === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>').join('') + '</div></fieldset>';
    form += '<fieldset style="margin:0"><legend>Scénario</legend><div class="choices">' +
      Object.keys(D.planningScenarios).map(k => '<label class="choice"><input type="radio" name="scenario" value="' + k + '"' + (p.scenario === k ? ' checked' : '') + '><span>' + esc(D.planningScenarios[k].label) + ' (× ' + esc(f.num(D.planningScenarios[k].multiplier, 1)) + ')</span></label>').join('') + '</div></fieldset>';
    form += '<div class="field" style="margin:0"><label for="pl-r">Missions simulées</label><select id="pl-r" name="runs">' + [1000, 5000, 20000].map(n => '<option value="' + n + '"' + (p.runs === n ? ' selected' : '') + '>' + f.num(n, 0) + '</option>').join('') + '</select></div>';
    form += '<button class="btn primary" type="submit">Lancer la simulation</button></form>';
    let body = '<section class="section" style="border-top:0;padding-top:0">' + form + '</section>';

    if (p.result) {
      const res = p.result.rows.slice().sort((a, b) => b.pStockout - a.pStockout || b.p99 / b.stock - a.p99 / a.stock);
      const risky = res.filter(r => r.pStockout > 0.05);
      const sc = D.planningScenarios[p.result.scenario];
      body += '<section class="section"><div class="section-head"><div><h2>Résultat</h2><p>' + esc(f.num(p.result.runs, 0)) + ' missions simulées en scénario ' + esc(sc.label.toLowerCase()) + ', ' + (p.result.mode === 'avant' ? 'de ' + f.day(0) + ' à ' + f.day(D.mission.durationDays) + ' avec le stock de départ' : 'de ' + f.day(p.result.start) + ' à ' + f.day(D.mission.durationDays) + ' avec le stock actuel') + '. Calcul fait dans votre navigateur en ' + esc(f.num(p.result.ms, 0)) + NB + 'ms.</p></div></div>';
      body += '<div class="callout ' + (risky.length ? 'vigilance' : 'normal') + '"><p>' + (risky.length ? '<b>' + UI.plural(risky.length, 'médicament') + ' risque' + (risky.length > 1 ? 'nt' : '') + ' de manquer dans plus de 5 % des missions simulées : </b>' + esc(risky.map(r => S.medById[r.med].name).join(', ')) + '.' : '<b>Aucun médicament ne manque dans plus de 5 % des missions simulées.</b>') + '</p></div>';
      let tb = '<div class="table-wrap" style="margin-top:14px"><table class="table"><thead><tr><th>Médicament</th><th class="num">Stock</th><th class="num">Besoin médian</th><th class="num">Besoin à 90 %</th><th class="num">Besoin à 99 %</th><th class="num">Risque de rupture</th><th>Recommandation</th></tr></thead><tbody>';
      res.forEach(r => {
        const m = S.medById[r.med];
        const lvl = r.pStockout > 0.05 ? 'urgence' : r.pStockout > 0.01 ? 'vigilance' : 'normal';
        let reco;
        if (r.pStockout > 0.01) reco = p.result.mode === 'avant' ? 'Embarquer au moins ' + f.num(Math.max(0, Math.ceil(r.p99 - r.stock)), 0) + ' ' + m.units + 's de plus' : 'Pas de réapprovisionnement possible : économiser et en parler en conférence';
        else if (r.p99 < r.stock * 0.5) reco = 'Largement suffisant';
        else reco = 'Suffisant';
        tb += '<tr class="clickable" data-act="plan-med" data-med="' + r.med + '"' + (p.med === r.med ? ' style="background:var(--accent-wash-2)"' : '') + '><td><b>' + esc(m.name) + '</b></td><td class="num">' + esc(f.num(r.stock, 0)) + '</td><td class="num">' + esc(f.num(r.p50, 0)) + '</td><td class="num">' + esc(f.num(r.p90, 0)) + '</td><td class="num">' + esc(f.num(r.p99, 0)) + '</td><td class="num">' + UI.pill(lvl, f.pct(r.pStockout, r.pStockout > 0 && r.pStockout < 0.01 ? 1 : 0)) + '</td><td>' + esc(reco) + '</td></tr>';
      });
      tb += '</tbody></table></div>';
      body += tb;
      const sel = res.find(r => r.med === p.med) || res[0];
      const m = S.medById[sel.med];
      body += '<h3 style="margin-top:24px">' + esc(m.name) + ' : répartition des besoins</h3><p class="note">Chaque barre regroupe des missions simulées selon la quantité consommée. À droite du trait, la mission manque de ce médicament. Cliquez une ligne du tableau pour changer de médicament.</p>';
      body += UI.histogram({ hist: sel.hist, top: sel.histTop, stock: sel.stock, label: 'Répartition de la consommation de ' + m.name + ' sur les missions simulées', unitLabel: m.units + 's', xTitle: m.units + 's consommés sur la période' });
      body += '</section>';
    } else {
      body += '<div class="callout accent"><p>Choisissez une période et un scénario, puis lancez la simulation. Le calcul se fait à bord, sans connexion.</p></div>';
    }
    let cond = '<div class="table-wrap"><table class="table"><thead><tr><th>Situation</th><th class="num">Épisodes par personne et par an</th><th>Besoin par épisode</th></tr></thead><tbody>';
    D.conditions.forEach(c => {
      cond += '<tr><td>' + esc(c.label) + '</td><td class="num">' + (c.perTransition !== undefined ? esc(f.pct(c.perTransition)) + ' par changement de gravité' : esc(f.num(c.rate, c.rate < 1 ? 2 : 0))) + '</td><td>' + esc(c.meds.map(n => S.medById[n.med].name + ' : ' + (n.min === n.max ? n.min : n.min + ' à ' + n.max)).join(' ; ')) + '</td></tr>';
    });
    cond += '</tbody></table></div>';
    body += H.section('Méthode', null, '<div class="prose"><p>Pour chaque mission simulée, AURA tire au hasard le nombre d’épisodes de chaque situation médicale pour chaque membre d’équipage (loi de Poisson), puis la quantité de médicament utilisée par épisode. En répétant l’opération des milliers de fois, on obtient la répartition des besoins et la probabilité de manquer. Le scénario pessimiste multiplie toutes les fréquences par 1,4, l’optimiste par 0,7.</p><p><b>Les fréquences ci-dessous sont illustratives.</b> Elles sont à remplacer par celles du modèle médical intégré de la NASA (IMM) et de la surveillance de santé des astronautes (LSAH), accessibles sur demande.</p></div><details class="values"><summary>Voir les fréquences utilisées</summary>' + cond + '</details>' + UI.sources(['barger2014']));
    return H.page('Planification de la pharmacie', 'Combien de médicaments emporter pour une mission sans réapprovisionnement possible ?', null, body);
  };

  /* ------------------------------------------------------------------ */
  /* Bien-être                                                           */
  /* ------------------------------------------------------------------ */
  const SCALES = {
    mood: ['Très bas', 'Bas', 'Correct', 'Bien', 'Très bien'],
    stress: ['Très calme', 'Calme', 'Moyen', 'Stressé', 'Très stressé'],
    sq: ['Très mauvais', 'Mauvais', 'Moyen', 'Bon', 'Très bon'],
    load: ['Très légère', 'Légère', 'Normale', 'Lourde', 'Très lourde']
  };
  function scale(name, label, val) {
    return '<fieldset><legend>' + esc(label) + '</legend><div class="scale">' + SCALES[name].map((w, i) => '<label class="choice"><input type="radio" name="' + name + '" value="' + (i + 1) + '"' + (val === i + 1 ? ' checked' : '') + ' aria-label="' + (i + 1) + ' : ' + esc(w) + '"><span>' + (i + 1) + '</span></label>').join('') + '</div><div class="scale-words"><span>' + esc(SCALES[name][0]) + '</span><span>' + esc(SCALES[name][4]) + '</span></div></fieldset>';
  }
  function wbCharts(A, id, days, layout) {
    const from = (H.today(A) - days + 1) * DAY;
    const list = A.s.wb.filter(w => w.a === id && w.t >= from && w.t <= A.s.now);
    if (!list.length) return '<p class="empty">Pas encore de point du jour.</p>';
    const mood = list.map(w => ({ x: w.t / DAY, y: w.mood, w })), stress = list.map(w => ({ x: w.t / DAY, y: w.stress, w }));
    const c1 = UI.xyChart({
      label: 'Humeur et stress, sur 5, ' + days + ' derniers jours', height: 220, yMin: 0.5, yMax: 5.5, yTicks: 5, padR: 70, layout,
      lines: [{ pts: mood, cls: 'series-2', endLabel: 'humeur' }, { pts: stress, cls: 'series', endLabel: 'stress' }],
      xFmt: v => f.day(v), hover: list.map(w => ({ x: w.t / DAY, y: w.mood, w })),
      tip: p => ['Humeur ' + p.w.mood + ' sur 5, stress ' + p.w.stress + ' sur 5', f.when(p.w.t)],
      legend: '<div class="legend"><span><i class="key line" style="background:var(--accent)"></i>Humeur (5 = très bien)</span><span><i class="key line"></i>Stress (5 = très stressé)</span></div>',
      table: { head: ['Jour', 'Humeur', 'Stress', 'Sommeil', 'Charge'], rows: list.slice().reverse().map(w => [f.day(w.t / DAY), w.mood + ' sur 5', w.stress + ' sur 5', f.hours(w.sleep), w.load + ' sur 5']) }
    });
    const c2 = UI.xyChart({
      label: 'Heures de sommeil, ' + days + ' derniers jours', height: 200, yMin: 3, yMax: 9, yTicks: 6, layout,
      lines: [{ pts: list.map(w => ({ x: w.t / DAY, y: w.sleep })), cls: 'series' }],
      dots: list.map(w => ({ x: w.t / DAY, y: w.sleep, level: w.sleep < 5.5 ? 'vigilance' : '' })),
      hlines: [{ y: 6, cls: 'grid', label: 'environ 6 h : moyenne observée en mission', textCls: 'axis-text' }],
      xFmt: v => f.day(v), hover: list.map(w => ({ x: w.t / DAY, y: w.sleep, w })),
      tip: p => [f.hours(p.w.sleep) + ' de sommeil', f.when(p.w.t), 'Qualité ' + p.w.sq + ' sur 5']
    });
    return '<h3>Humeur et stress</h3>' + c1 + '<h3 style="margin-top:22px">Sommeil</h3>' + c2 + UI.sources(['barger2014']);
  }
  V.wellbeing = function (A) {
    const s = A.s, doc = H.doc(A), d = H.today(A);
    let body = '';
    if (!doc) {
      const cur = s.wb.find(w => w.a === s.me && Math.floor(w.t / DAY) === d && w.src === 'saisie') || { mood: 0, stress: 0, sleep: '', sq: 0, load: 0, contact: 0, note: '', share: 0 };
      let form = '<form data-form="wellbeing">' + scale('mood', 'Votre humeur aujourd’hui', cur.mood) + scale('stress', 'Votre niveau de stress', cur.stress) +
        '<div class="field"><label for="wb-s">Heures de sommeil la nuit dernière</label><div class="input-unit"><input id="wb-s" name="sleep" type="number" min="0" max="14" step="0.25" value="' + esc(cur.sleep) + '" required><span>h</span></div></div>' +
        scale('sq', 'Qualité du sommeil', cur.sq) + scale('load', 'Charge de travail', cur.load) +
        '<label class="check"><input type="checkbox" name="contact"' + (cur.contact ? ' checked' : '') + '><span>J’ai pu échanger avec mes proches aujourd’hui</span></label>' +
        '<div class="field" style="margin-top:12px"><label for="wb-n">Note personnelle (facultatif)</label><textarea id="wb-n" name="note">' + esc(cur.note) + '</textarea><label class="check"><input type="checkbox" name="share"' + (cur.share ? ' checked' : '') + '><span>Partager cette note avec le médecin de bord</span></label></div>' +
        '<div class="btn-row"><button class="btn primary" type="submit">Enregistrer mon point du jour</button></div></form>';
      const an = E.analyzeWellbeing(s.wb.filter(w => w.a === s.me), d);
      let flags = an.flags.length ? '<div class="callout vigilance"><p><b>À évoquer lors de votre entretien privé avec le médecin :</b></p><ul style="padding-left:20px">' + an.flags.map(x => '<li>' + esc(x.crew) + '</li>').join('') + '</ul></div>' : '<div class="callout normal"><p>Rien de particulier cette semaine.</p></div>';
      body += '<div class="cols-wide" style="align-items:start"><div>' + flags + '<div style="margin-top:20px">' + wbCharts(A, s.me, 21, 'wide-left') + '</div></div><div>' + form + '<p class="note" style="margin-top:14px">Vos réponses ne sont visibles que par vous et par le médecin de bord. Votre note reste privée, sauf si vous choisissez de la partager. AURA ne pose pas de diagnostic : il repère une baisse qui dure et propose d’en parler.</p></div></div>';
    } else {
      const sel = A.route.q.a && S.crewById[A.route.q.a] ? A.route.q.a : 'a3';
      let tb = '<div class="table-wrap"><table class="table"><thead><tr><th>Membre d’équipage</th><th class="num">Humeur</th><th class="num">Stress</th><th class="num">Sommeil</th><th class="num">Charge</th><th>Points d’attention</th></tr></thead><tbody>';
      D.crew.forEach(c => {
        const an = E.analyzeWellbeing(s.wb.filter(w => w.a === c.id), d);
        tb += '<tr class="clickable" data-href="#/bien-etre?a=' + c.id + '"' + (c.id === sel ? ' style="background:var(--accent-wash-2)"' : '') + '><td><b>' + esc(c.name) + '</b></td><td class="num">' + esc(f.num(an.mood7, 1)) + '</td><td class="num">' + esc(f.num(an.stress7, 1)) + '</td><td class="num">' + esc(f.hours(an.sleep7)) + '</td><td class="num">' + esc(f.num(an.load7, 1)) + '</td><td>' + (an.flags.length ? an.flags.map(x => esc(x.doctor)).join('<br>') : '<span class="faint">rien de particulier</span>') + '</td></tr>';
      });
      tb += '</tbody></table></div><p class="note" style="margin-top:8px">Moyennes sur 7 jours. Humeur, stress et charge sur 5.</p>';
      body += H.section('Équipage', 'Ces indicateurs servent à préparer l’entretien psychologique privé de la semaine. Ce ne sont pas des diagnostics.', tb, ' style="border-top:0;padding-top:0"');
      const notes = s.wb.filter(w => w.a === sel && w.share && w.note).slice(-5).reverse();
      body += H.section(S.name(sel), null, wbCharts(A, sel, 21) + (notes.length ? '<h3 style="margin-top:20px">Notes partagées</h3><ul class="list">' + notes.map(w => '<li><span class="list-meta">' + esc(f.when(w.t)) + '</span><p style="margin:4px 0 0">' + esc(w.note) + '</p></li>').join('') + '</ul>' : ''));
    }
    body += H.section('Pourquoi suivre le moral et le sommeil', null, '<div class="prose"><p>En mission, les astronautes dorment en moyenne environ six heures par nuit, et trois quarts des équipages de l’ISS ont utilisé un médicament pour dormir. Pendant la simulation Mars-520, l’activité a baissé et le sommeil a changé au fil des mois, avec de grandes différences d’une personne à l’autre. D’où un suivi individuel, court et quotidien.</p></div>' + UI.sources(['barger2014', 'basner2013']));
    return H.page('Bien-être', doc ? 'Moral, stress, sommeil et charge de travail de l’équipage.' : 'Votre point du jour : deux minutes, réponses privées.', null, body);
  };

  /* ------------------------------------------------------------------ */
  /* Habitat                                                             */
  /* ------------------------------------------------------------------ */
  V.habitat = function (A) {
    const s = A.s, now = s.now, d = H.today(A);
    const cfg = D.habitat.co2;
    const co2 = S.co2At(s, now), lv = E.co2Level(cfg, co2);
    const pts = [];
    for (let t = Math.floor((now - 72 * 60) / 60) * 60; t <= now; t += 60) if (t >= 0) pts.push({ x: t / DAY, y: S.co2At(s, t), t });
    const max24 = Math.max.apply(null, pts.filter(p => p.t > now - DAY).map(p => p.y));
    const rate = S.doseRateAt(s, now), spe = S.speAt(s, now), rad = S.radTotalNow(s);
    let body = '<section class="section" style="border-top:0;padding-top:0"><div class="stats">' +
      '<div class="stat"><div class="s-label">CO₂ cabine, moyenne sur 1 h</div><div class="s-value">' + esc(f.num(co2, 1)) + '<small>mmHg</small></div>' + UI.pill(lv, lv === 'normal' ? 'Sous la limite' : lv === 'urgence' ? 'Critique' : 'Au-dessus de la limite') + '</div>' +
      '<div class="stat"><div class="s-label">CO₂ maximal sur 24 h</div><div class="s-value">' + esc(f.num(max24, 1)) + '<small>mmHg</small></div><div class="s-sub">limite : 3 mmHg sur une heure</div></div>' +
      '<div class="stat"><div class="s-label">Débit de dose actuel</div><div class="s-value">' + esc(f.num(rate, rate < 10 ? 2 : 0)) + '<small>mSv par jour</small></div>' + (spe ? UI.pill('urgence', 'Éruption solaire en cours') : UI.pill('normal', 'Niveau habituel')) + '</div>' +
      '<div class="stat"><div class="s-label">Dose reçue depuis le départ</div><div class="s-value">' + esc(f.num(rad, 0)) + '<small>mSv</small></div><div class="s-sub">limite de carrière : 600 mSv</div></div></div></section>';
    body += '<section class="section"><div class="section-head"><div><h2>CO₂ de la cabine, 72 dernières heures</h2><p>Les chances de mal de tête doublent environ pour chaque hausse de 1 mmHg. La norme NASA limite la moyenne sur une heure à 3 mmHg.</p></div></div>' +
      UI.xyChart({
        label: 'Pression partielle de CO2 dans la cabine, heure par heure, sur 72 heures', height: 240, yMin: 0, yMax: Math.max(6.5, Math.ceil(max24 + 1)), yTicks: 6, yTitle: 'mmHg',
        lines: [{ pts, cls: 'series' }], hlines: [{ y: cfg.limit, cls: 'limit', label: 'limite NASA : 3 mmHg' }],
        xFmt: v => f.day(v), xTicksValues: [d - 3, d - 2, d - 1, d].filter(x => x >= 0),
        hover: pts, tip: p => [f.num(p.y, 2) + ' mmHg', f.when(p.t), p.y > cfg.limit ? 'au-dessus de la limite' : 'sous la limite'],
        table: { head: ['Heure', 'CO₂ (mmHg)'], rows: pts.slice().reverse().map(p => [f.when(p.t), f.num(p.y, 2)]) }
      }) + UI.sources(['ochmoCo2', 'law2014']) + '</section>';
    // Radiation : cumul et projection
    const cum = [{ x: 0, y: 0 }];
    let acc = 0;
    s.hab.slice().sort((a, b) => a.d - b.d).forEach(h => { acc += h.rad; cum.push({ x: h.d + 1, y: acc }); });
    cum.push({ x: now / DAY, y: rad });
    const proj = [{ x: now / DAY, y: rad }];
    let pr = rad;
    for (let dd = Math.ceil(now / DAY); dd <= D.mission.durationDays; dd += 10) {
      pr = rad + E.radiationProjection(D.mission, D.habitat, now / DAY, 0) * ((dd - now / DAY) / (D.mission.durationDays - now / DAY || 1));
      proj.push({ x: dd, y: pr });
    }
    const end = E.radiationProjection(D.mission, D.habitat, now / DAY, rad);
    proj.push({ x: D.mission.durationDays, y: end });
    const hov = cum.filter((p, i) => i % 5 === 0).concat(proj.filter((p, i) => i % 3 === 0));
    body += '<section class="section"><div class="section-head"><div><h2>Dose de radiation sur la mission</h2><p>Cumul mesuré jusqu’à aujourd’hui, puis projection jusqu’au retour avec les débits publiés pour le trajet et la surface de Mars : environ ' + esc(f.num(end, 0)) + NB + 'mSv à la fin de la mission.</p></div></div>' +
      UI.xyChart({
        label: 'Dose cumulée en millisieverts depuis le départ, et projection jusqu’au retour', height: 260, yMin: 0, yMax: Math.max(1100, end * 1.1), yTitle: 'mSv', xMin: 0, xMax: D.mission.durationDays,
        lines: [{ pts: cum, cls: 'series' }, { pts: proj, cls: 'proj' }],
        hlines: [{ y: D.habitat.radiation.careerLimit, cls: 'limit', label: 'limite de carrière NASA : 600 mSv' }],
        vlines: [{ x: now / DAY, label: 'aujourd’hui' }],
        xFmt: v => f.day(v), xTicksValues: [0, 180, 360, 540, 720, 900],
        hover: hov.sort((a, b) => a.x - b.x), tip: p => [f.num(p.y, 0) + ' mSv', f.day(p.x), p.x <= now / DAY ? 'cumul mesuré' : 'projection'],
        legend: '<div class="legend"><span><i class="key line"></i>Cumul mesuré</span><span><i class="key line" style="background:var(--ink-3)"></i>Projection (pointillés)</span><span><i class="key line" style="background:var(--alert)"></i>Limite de carrière</span></div>'
      }) +
      '<div class="prose" style="margin-top:14px"><p>Pendant le trajet, l’exposition mesurée par la sonde Curiosity était d’environ 1,8 mSv par jour ; à la surface de Mars, environ 0,64 mSv par jour. Pour 180 jours d’aller, 500 jours sur place et 180 jours de retour, l’estimation publiée est d’environ 1 Sv, au-dessus de la limite de carrière de 600 mSv : c’est une limite connue des missions vers Mars, pas une erreur de calcul.</p></div>' + UI.sources(['zeitlin2013', 'hassler2014', 'ochmoRad']) +
      '<div class="btn-row" style="margin-top:12px"><button class="btn" data-act="spe-now">Simuler une éruption solaire maintenant</button></div></section>';
    return H.page('Habitat', 'Air de la cabine et rayonnement : les deux conditions du vol qui pèsent le plus sur la santé au quotidien.', null, body);
  };

  /* ------------------------------------------------------------------ */
  /* Conférence hebdomadaire                                              */
  /* ------------------------------------------------------------------ */
  V.conference = function (A) {
    const s = A.s, doc = H.doc(A), today = H.today(A);
    const end = Math.min(today, Math.max(6, parseInt(A.route.q.fin, 10) || today));
    const rep = S.weeklyReport(s, end);
    const mine = p => doc || !p.who || p.who === s.me;
    const points = rep.points.filter(mine);
    let body = '<section class="section" style="border-top:0;padding-top:0"><div class="btn-row" style="justify-content:space-between"><div class="btn-row"><a class="btn small" href="#/conference?fin=' + (end - 7) + '">Semaine précédente</a>' + (end < today ? '<a class="btn small" href="#/conference?fin=' + Math.min(today, end + 7) + '">Semaine suivante</a>' : '') + '</div>' +
      '<div class="btn-row"><button class="btn small" data-act="copy-report" data-end="' + end + '">Copier le texte</button>' + (doc ? '<button class="btn small primary" data-act="send-report" data-end="' + end + '">Envoyer au médecin au sol</button>' : '') + '</div></div></section>';
    body += H.section('Points à discuter', 'Repérés automatiquement dans le journal de la semaine : sommeil, moral, réponses aux traitements, alertes ouvertes, habitat, questions posées.',
      points.length ? '<ul class="list">' + points.map(p => '<li><div class="btn-row">' + UI.pill('info', { bienetre: 'Bien-être', pharmacie: 'Pharmacie', alerte: 'Alertes', habitat: 'Habitat', medecin: 'Référence', question: 'Question' }[p.kind] || 'Point') + '<span>' + esc(p.text) + '</span></div></li>').join('') + '</ul>' : '<p class="empty">Aucun point particulier cette semaine.</p>');
    let tb = '<div class="table-wrap"><table class="table"><thead><tr><th>Membre d’équipage</th><th>Température</th><th>Pouls au repos</th><th>SpO₂</th><th>Sommeil</th><th>Humeur</th></tr></thead><tbody>';
    rep.crew.filter(c => doc || c.id === s.me).forEach(c => {
      const cell = k => {
        const m = c.metrics[k], cfg = D.metrics[k];
        if (!m.n) return '<td class="faint">n.d.</td>';
        return '<td><span class="val">' + esc(f.unit(m.mean, cfg, 1)) + '</span><span class="sub">' + (m.prev !== null ? 'semaine précédente ' + esc(f.unit(m.prev, cfg, 1)) : '') + (m.out ? ', ' + m.out + ' hors plage' : '') + '</span></td>';
      };
      tb += '<tr><td><b>' + esc(c.name) + '</b><span class="sub">' + esc(c.role) + '</span></td>' + cell('temp') + cell('hr') + cell('spo2') + '<td>' + esc(f.hours(c.wb.sleep7)) + '</td><td>' + esc(f.num(c.wb.mood7, 1)) + ' sur 5</td></tr>';
    });
    tb += '</tbody></table></div>';
    body += H.section(doc ? 'Équipage' : 'Vos mesures de la semaine', 'Moyennes de la semaine, comparées à la semaine précédente.', tb);
    body += '<div class="cols">' + H.section('Habitat', null, '<dl class="kv"><dt>CO₂ moyen</dt><dd>' + esc(f.num(rep.habitat.co2Mean, 1)) + ' mmHg</dd><dt>CO₂ maximal</dt><dd>' + esc(f.num(rep.habitat.co2Max, 1)) + ' mmHg</dd><dt>Au-dessus de 3 mmHg</dt><dd>' + rep.habitat.co2Hours + ' h</dd><dt>Dose de la semaine</dt><dd>' + esc(f.num(rep.habitat.radWeek, 1)) + ' mSv</dd><dt>Cumul depuis le départ</dt><dd>' + esc(f.num(rep.habitat.radTotal, 0)) + ' mSv</dd></dl>') +
      H.section('Activité', null, '<dl class="kv"><dt>Alertes</dt><dd>' + rep.alerts.total + ' (' + rep.alerts.vigilance + ' vigilance, ' + rep.alerts.urgence + ' alerte)</dd><dt>Encore ouvertes</dt><dd>' + rep.alerts.open + '</dd><dt>Prises de médicament</dt><dd>' + rep.admins + '</dd><dt>Symptômes signalés</dt><dd>' + rep.symptoms + '</dd></dl>') + '</div>';
    body += H.section('Ajouter une question pour la conférence', null, '<form data-form="conf-question" class="btn-row" style="align-items:flex-end"><div class="field" style="margin:0;flex:1 1 320px"><label for="cq">Votre question</label><input id="cq" name="q" type="text" placeholder="Par exemple : faut-il adapter ma dose de paracétamol ?" required></div><button class="btn primary" type="submit">Ajouter</button></form>');
    body += '<p class="note" style="margin-top:20px">Synthèse préparée à bord par des règles, sans intelligence artificielle, à partir du journal de mission. Avec l’étage IA, elle pourrait être reformulée, mais les faits restent ceux-ci.</p>';
    return H.page('Conférence de la semaine', 'Semaine de ' + esc(f.day(rep.start)) + ' à ' + esc(f.day(rep.end)) + '. ' + (doc ? 'Synthèse pour l’entretien médical avec le médecin au sol.' : 'Ce qui sera discuté vous concernant.'), null, body);
  };

  /* ------------------------------------------------------------------ */
  /* Questions                                                           */
  /* ------------------------------------------------------------------ */
  function contextBox(A, card) {
    const s = A.s, me = A.s.role === 'doctor' ? 'a3' : s.me;
    switch (card.context) {
      case 'temp': {
        const m = S.lastMeasurement(s, me, 'temp');
        if (!m) return '';
        const ex = S.explain(s, m);
        return 'Votre dernière température : ' + f.unit(m.v, D.metrics.temp) + ' (' + f.when(m.t) + '). Plage attendue pour vous : ' + H.range(D.metrics.temp, ex.ev.band) + '. Sur Terre : ' + ex.ev.terrestrial.label + '.';
      }
      case 'co2': { const v = S.co2At(s, s.now); return 'CO₂ de la cabine en ce moment : ' + f.num(v, 1) + ' mmHg, ' + (v > 3 ? 'au-dessus' : 'en dessous') + ' de la limite de 3 mmHg.'; }
      case 'sleep': { const an = E.analyzeWellbeing(s.wb.filter(w => w.a === me), H.today(A)); return an.sleep7 !== null ? 'Votre sommeil moyen cette semaine : ' + f.hours(an.sleep7) + ' par nuit.' : ''; }
      case 'radiation': return 'Dose reçue depuis le départ : ' + f.num(S.radTotalNow(s), 0) + ' mSv. Débit actuel : ' + f.num(S.doseRateAt(s, s.now), 2) + ' mSv par jour.';
      case 'link': return 'Délai radio actuel : ' + f.dur(E.lightMinutes(D.mission, s.now / DAY)) + ' dans chaque sens. Liaison ' + (E.isBlackout(D.mission, s.now / DAY) ? 'coupée (conjonction solaire)' : 'établie') + '.';
      case 'pharmacy': { const n = D.meds.reduce((x, m) => x + E.medFlags(m, s.stock[m.id], H.today(A), D.mission).filter(fl => fl.level !== 'info').length, 0); return n ? n + ' point(s) de vigilance dans la pharmacie de bord en ce moment.' : 'Aucun point de vigilance dans la pharmacie de bord en ce moment.'; }
      case 'transition': { let last = null; D.mission.gravityTransitions.forEach(x => { if (x <= H.today(A)) last = x; }); return last === null ? '' : 'Dernier changement de gravité : ' + f.day(last) + ', il y a ' + (H.today(A) - last) + ' jours.'; }
      default: return '';
    }
  }
  function cardHtml(A, card, matched, qid) {
    const ctx = contextBox(A, card);
    return '<article class="answer"><h3>' + esc(card.title) + '</h3><p>' + esc(card.text) + '</p>' +
      (ctx ? '<div class="callout accent"><p><b>Dans votre mission : </b>' + esc(ctx) + '</p></div>' : '') +
      UI.sources(card.sources) +
      (matched && H.doc(A) ? '<p class="note">Termes retrouvés : ' + esc(matched.join(', ')) + '</p>' : '') + '</article>';
  }
  V.questions = function (A) {
    const s = A.s, q = (A.route.q.q || '').trim(), fiche = A.route.q.fiche;
    let body = '<section class="section" style="border-top:0;padding-top:0"><form data-form="ask" class="btn-row" style="align-items:flex-end"><div class="field" style="margin:0;flex:1 1 380px"><label for="ask-q">Votre question</label><input id="ask-q" name="q" type="search" value="' + esc(q) + '" placeholder="Par exemple : j’ai mal à la tête, est-ce le CO₂ ?" autocomplete="off"></div><button class="btn primary" type="submit">Chercher</button></form>' +
      '<div class="chips" style="margin-top:12px">' + ['J’ai mal à la tête', 'Pourquoi ma température est plus haute ?', 'Je dors mal', 'Combien de radiations sur Mars ?', 'Faut-il prendre 1,5 comprimé en vol ?', 'Que se passe-t-il pendant la conjonction ?'].map(x => '<button type="button" class="chip" data-act="ask-chip" data-q="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div></section>';
    if (fiche) {
      const card = A.KB.cards.find(c => c.id === fiche);
      if (card) body += H.section('Fiche', null, cardHtml(A, card, null));
    } else if (q) {
      const r = E.search(A.idx, q, A.KB.synonyms, 3);
      const rec = s.questions.find(x => x.q === q);
      let res = '';
      if (!r.results.length || r.results[0].score < 1.2) {
        res += '<div class="callout vigilance"><p><b>Aucune fiche de la base embarquée ne répond clairement.</b> Reformulez avec d’autres mots, ou transmettez la question au médecin.</p><div class="btn-row">' + (rec ? '<button class="btn small" data-act="flag-q" data-id="' + rec.id + '"' + (rec.conf ? ' disabled' : '') + '>' + (rec.conf ? 'Ajoutée à la conférence' : 'Ajouter à la conférence') + '</button>' : '') + '<a class="btn small" href="#/liaison?objet=' + encodeURIComponent(q) + '">Envoyer au médecin au sol</a></div></div>';
      }
      r.results.forEach(x => { const c = A.KB.cards.find(cc => cc.id === x.id); if (c) res += cardHtml(A, c, x.matched); });
      if (r.results.length && rec) res += '<div class="btn-row" style="margin-top:8px"><button class="btn small" data-act="flag-q" data-id="' + rec.id + '"' + (rec.conf ? ' disabled' : '') + '>' + (rec.conf ? 'Question ajoutée à la conférence' : 'Ajouter cette question à la conférence') + '</button></div>';
      body += H.section('Ce que dit la base embarquée', 'Les fiches les plus proches de votre question, avec leurs sources. Rien n’est inventé : sans fiche pertinente, AURA le dit.', res);
    }
    body += H.section('Comment fonctionne cette recherche', null, '<div class="prose"><p>La recherche tourne à bord, sans internet : AURA compare les mots de votre question à ceux de ' + A.KB.cards.length + ' fiches rédigées à partir de sources publiées, en tenant compte des synonymes (par exemple « mal de tête » et « céphalée »), puis classe les fiches par pertinence (méthode BM25). Il ajoute ensuite le contexte de votre mission.</p><p>Un étage d’intelligence artificielle peut rédiger une réponse à partir de ces fiches, s’il est disponible. Sans lui, vous lisez directement les passages sourcés.</p></div>' + UI.sources(['buras2025']) +
      '<details class="values"><summary>Voir toutes les fiches</summary><ul class="list">' + A.KB.cards.map(c => '<li><a href="#/questions?fiche=' + c.id + '">' + esc(c.title) + '</a></li>').join('') + '</ul></details>');
    return H.page('Questions', 'Posez une question en français : AURA cherche dans sa base documentaire embarquée et ajoute le contexte de votre mission.', null, body);
  };

  /* ------------------------------------------------------------------ */
  /* Liaison avec la Terre                                                */
  /* ------------------------------------------------------------------ */
  const PRIO = { 1: 'Urgent', 2: 'Important', 3: 'Routine' };
  V.link = function (A) {
    const s = A.s, now = s.now;
    const L = E.lightMinutes(D.mission, now / DAY), blackout = E.isBlackout(D.mission, now / DAY);
    const pending = s.queue.filter(q => !q.sentAt);
    let body = '<section class="section" style="border-top:0;padding-top:0"><div class="stats">' +
      '<div class="stat"><div class="s-label">Délai radio, dans chaque sens</div><div class="s-value">' + esc(f.dur(L)) + '</div><div class="s-sub">temps de trajet de la lumière</div></div>' +
      '<div class="stat"><div class="s-label">Question et réponse</div><div class="s-value">' + esc(f.dur(2 * L + 45)) + '</div><div class="s-sub">aller, retour et 45 min de réflexion au sol</div></div>' +
      '<div class="stat"><div class="s-label">Liaison</div><div class="s-value">' + (blackout ? 'Coupée' : 'Établie') + '</div><div class="s-sub">' + (blackout ? 'conjonction solaire jusqu’à ' + esc(f.day(D.mission.conjunction.end)) : 'prochaine coupure à ' + esc(f.day(D.mission.conjunction.start))) + '</div></div>' +
      '<div class="stat"><div class="s-label">Messages en attente</div><div class="s-value">' + pending.length + '</div><div class="s-sub">' + (pending.length ? 'envoyés par ordre de priorité' : 'tout est parti') + '</div></div></div>' +
      (blackout ? '<div class="callout urgence" style="margin-top:18px"><p><b>La liaison est coupée jusqu’à ' + esc(f.day(D.mission.conjunction.end)) + '.</b> Tout continue à bord : mesures, alertes, pharmacie, synthèse. Les messages attendent ici, sans rien perdre.</p><div class="btn-row"><button class="btn primary" data-act="advance-to" data-t="' + (D.mission.conjunction.end * DAY + 90) + '">Avancer jusqu’à la fin de la conjonction</button></div></div>' : '') + '</section>';
    const pts = [];
    for (let d = 0; d <= D.mission.durationDays; d += 3) pts.push({ x: d, y: E.lightMinutes(D.mission, d) });
    body += '<section class="section"><div class="section-head"><div><h2>Délai radio sur toute la mission</h2><p>De quelques secondes au départ à plus de 22 minutes quand Mars passe derrière le Soleil, avec deux semaines de coupure totale.</p></div></div>' +
      UI.xyChart({
        label: 'Délai radio en minutes, dans un seul sens, du départ au retour', height: 230, yMin: 0, yMax: 24, yTicks: 6, xMin: 0, xMax: D.mission.durationDays, yTitle: 'minutes',
        lines: [{ pts, cls: 'series' }], vrects: [{ x0: D.mission.conjunction.start, x1: D.mission.conjunction.end, cls: 'blackout', label: 'coupure' }],
        vlines: [{ x: now / DAY, label: 'aujourd’hui', anchor: now / DAY > 700 ? 'end' : 'start' }],
        xFmt: v => f.day(v), xTicksValues: [0, 180, 360, 540, 720, 900],
        hover: pts, tip: p => [f.dur(p.y) + ' dans chaque sens', f.day(p.x), E.isBlackout(D.mission, p.x) ? 'liaison coupée' : E.phaseAt(D.mission, p.x).label],
        legend: '<div class="legend"><span><i class="key line"></i>Délai dans un sens</span><span><i class="key" style="background:var(--alert);opacity:.3"></i>Conjonction solaire</span><span><i class="key line" style="background:var(--accent)"></i>Aujourd’hui</span></div>'
      }) + '<p class="note">Modèle simplifié : la distance augmente pendant l’aller, suit la position de Mars pendant le séjour, puis diminue au retour.</p>' + UI.sources(['conjonction']) + '</section>';
    const rows = s.queue.slice().sort((a, b) => (a.sentAt ? 1 : 0) - (b.sentAt ? 1 : 0) || (a.sentAt ? b.t - a.t : a.prio - b.prio || a.t - b.t)).slice(0, 16);
    let tb = '<div class="table-wrap"><table class="table"><thead><tr><th>Message</th><th>Priorité</th><th>Créé</th><th>État</th><th>Arrivée au sol</th></tr></thead><tbody>';
    rows.forEach(q => {
      const st = q.status === 'reçu' ? UI.pill('normal', 'reçu') : q.status === 'en route' ? UI.pill('accent', 'en route') : q.status === 'bloqué' ? UI.pill('urgence', 'bloqué') : UI.pill('vigilance', 'en attente');
      tb += '<tr><td>' + esc(q.title) + '</td><td>' + esc(PRIO[q.prio]) + '</td><td class="nowrap">' + esc(f.when(q.t)) + '</td><td>' + st + '</td><td class="nowrap">' + (q.arrAt ? esc(f.when(q.arrAt)) : '<span class="faint">après la coupure</span>') + '</td></tr>';
    });
    tb += '</tbody></table></div>';
    body += H.section('File d’attente vers la Terre', 'Les alertes passent avant les messages importants, qui passent avant la routine. Pendant une coupure, tout attend à bord, sans rien perdre.', tb);
    const inbox = s.inbox.slice().sort((a, b) => b.arrAt - a.arrAt).slice(0, 8);
    body += H.section('Messages reçus du sol', 'Réponses simulées du médecin au sol, arrivées avec le délai réel du moment.', inbox.length ? '<ul class="list">' + inbox.map(m => '<li><div class="list-row"><div style="flex:1 1 320px"><span class="list-title">' + esc(m.title) + '</span><p style="margin:4px 0 0">' + esc(m.status === 'reçu' ? m.text : 'En route, arrivée prévue à ' + f.when(m.arrAt) + '.') + '</p><div class="list-meta">' + esc(m.from) + (m.status === 'reçu' ? ', reçu ' + esc(f.when(m.arrAt)) : '') + '</div></div>' + (m.status === 'reçu' ? UI.pill('normal', 'reçu') : UI.pill('accent', 'en route')) + '</div></li>').join('') + '</ul>' : '<p class="empty">Aucun message pour le moment.</p>');
    const subj = A.route.q.objet || '';
    body += H.section('Écrire au médecin au sol', null, '<form data-form="message"><div class="field"><label for="msg-t">Objet</label><input id="msg-t" name="title" type="text" value="' + esc(subj) + '" required></div><div class="field"><label for="msg-b">Message</label><textarea id="msg-b" name="text" required></textarea></div><fieldset><legend>Priorité</legend><div class="choices">' + [1, 2, 3].map(p => '<label class="choice"><input type="radio" name="prio" value="' + p + '"' + (p === 2 ? ' checked' : '') + '><span>' + PRIO[p] + '</span></label>').join('') + '</div></fieldset><div class="btn-row"><button class="btn primary" type="submit">Mettre en file</button></div></form>');
    return H.page('Liaison avec la Terre', 'Tout ce qui part vers la Terre attend son tour, et met plusieurs minutes à arriver. Avancez le temps pour voir les messages partir et les réponses revenir.', null, body);
  };

  /* ------------------------------------------------------------------ */
  /* Mission                                                             */
  /* ------------------------------------------------------------------ */
  function timeline(A) {
    const W = 720, Hh = 96, padL = 8, padR = 8, x = UI.linear(0, D.mission.durationDays, padL, W - padR);
    const now = A.s.now / DAY;
    let s = '<svg class="arch" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Frise de la mission : transit aller, séjour en surface, transit retour, conjonction solaire et jour actuel">';
    D.mission.phases.forEach((p, i) => {
      s += '<rect x="' + (x(p.start) + 1).toFixed(1) + '" y="30" width="' + (x(p.end) - x(p.start) - 2).toFixed(1) + '" height="26" class="box"' + (now >= p.start && now < p.end ? ' style="fill:var(--accent-wash);stroke:var(--accent)"' : '') + '/>';
      s += '<text x="' + (x(p.start) + 8).toFixed(1) + '" y="48" class="t-sub">' + esc(p.label) + '</text>';
      s += '<text x="' + x(p.start).toFixed(1) + '" y="74" class="t-sub">' + esc(f.day(p.start)) + '</text>';
    });
    s += '<text x="' + x(D.mission.durationDays).toFixed(1) + '" y="74" class="t-sub" text-anchor="end">' + esc(f.day(D.mission.durationDays)) + '</text>';
    const c0 = x(D.mission.conjunction.start), c1 = x(D.mission.conjunction.end);
    s += '<rect x="' + c0.toFixed(1) + '" y="26" width="' + (c1 - c0).toFixed(1) + '" height="34" style="fill:var(--alert);opacity:.35"/>';
    s += '<text x="' + ((c0 + c1) / 2).toFixed(1) + '" y="90" class="t-sub" text-anchor="middle">conjonction</text>';
    s += '<line x1="' + x(now).toFixed(1) + '" y1="14" x2="' + x(now).toFixed(1) + '" y2="62" style="stroke:var(--accent);stroke-width:2"/>';
    s += '<text x="' + x(now).toFixed(1) + '" y="12" class="t-head" text-anchor="' + (now > 800 ? 'end' : now < 60 ? 'start' : 'middle') + '" style="fill:var(--accent-ink)">' + esc(f.day(now)) + '</text>';
    return s + '</svg>';
  }
  V.mission = function (A) {
    const s = A.s, now = s.now / DAY, ph = E.phaseAt(D.mission, now);
    let body = '<section class="section" style="border-top:0;padding-top:0">' + timeline(A) + '</section>';
    body += '<div class="cols">' + H.section('Profil de la mission', null, '<dl class="kv"><dt>Mission</dt><dd>' + esc(D.mission.name) + ' (fictive)</dd><dt>Durée</dt><dd>' + D.mission.durationDays + ' jours</dd><dt>Phase actuelle</dt><dd>' + esc(ph.label) + '</dd><dt>Gravité</dt><dd>' + (ph.gravity ? esc(f.num(ph.gravity, 2)) + ' g' : 'nulle') + '</dd><dt>Délai radio</dt><dd>' + esc(f.dur(E.lightMinutes(D.mission, now))) + ' dans chaque sens</dd><dt>Conjonction solaire</dt><dd>' + esc(f.day(D.mission.conjunction.start)) + ' à ' + esc(f.day(D.mission.conjunction.end)) + '</dd><dt>Évacuation vers la Terre</dt><dd>impossible</dd><dt>Réapprovisionnement</dt><dd>aucun</dd></dl>') +
      H.section('Équipage (fictif)', null, '<ul class="list">' + D.crew.map(c => '<li><span class="list-title">' + esc(c.name) + '</span><div class="list-meta">' + esc(c.role) + '</div></li>').join('') + '</ul>') + '</div>';
    body += H.section('Ce qui change par rapport à la Station spatiale internationale', null, '<div class="prose"><p>Sur l’ISS, un problème sérieux peut se régler en quelques heures avec un médecin au sol joignable en direct, et un retour sur Terre est possible en cas d’urgence. Vers Mars, chaque question met jusqu’à 44 minutes pour obtenir une réponse, la liaison se coupe deux semaines pendant la conjonction, et aucun retour anticipé n’est possible.</p><p>L’équipage doit donc interpréter ses propres mesures, décider et agir à bord, avec les médicaments emportés au départ. C’est ce que vise AURA : mettre à bord la connaissance des conditions du vol que le médecin au sol a aujourd’hui en tête.</p></div>' + UI.sources(['russell2023', 'conjonction']));
    body += H.section('Moyens médicaux à bord', null, '<ul class="list">' + D.mission.onboard.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>');
    body += H.section('Données', 'Toutes les mesures de cette démonstration sont simulées, de façon reproductible. Les sources de données réelles prévues pour la suite :', '<ul class="list">' + D.realData.map(r => '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.name) + '</a><div class="list-meta">' + esc(r.use) + '</div></li>').join('') + '</ul>');
    body += H.section('Réglages de la simulation', null,
      '<form data-form="goto-day" class="btn-row" style="align-items:flex-end"><div class="field" style="margin:0"><label for="gd">Recommencer la mission au jour</label><div class="input-unit"><span>J+</span><input id="gd" name="day" type="number" min="1" max="' + (D.mission.durationDays - 1) + '" value="' + Math.floor(now) + '" style="width:110px;font-size:16px"></div></div><button class="btn" type="submit">Recommencer à ce jour</button></form>' +
      '<p class="note">Recommencer recalcule tout l’historique jusqu’au jour choisi. Vos saisies sont effacées.</p>' +
      '<div class="btn-row" style="margin-top:12px"><label class="check"><input type="checkbox" data-act="sensors"' + (s.sim.sensors ? ' checked' : '') + '><span>Capteurs simulés actifs (mesures automatiques chaque matin)</span></label></div>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn" data-act="reset">Réinitialiser la démonstration</button></div>');
    return H.page('Mission', 'Profil de la mission, contraintes de la distance et réglages de la simulation.', null, body);
  };

  /* ------------------------------------------------------------------ */
  /* Démonstration guidée                                                 */
  /* ------------------------------------------------------------------ */
  V.demo = function (A) {
    const cur = A.s.scenario;
    let body = '<ol class="scn">' + D.scenarios.map(sc => '<li><div><h3>' + esc(sc.title) + '</h3><p>' + esc(sc.shows) + '</p><p class="look"><b>À regarder : </b>' + esc(sc.look) + '</p></div><div class="btn-row">' + (cur === sc.id ? UI.pill('accent', 'en cours') : '') + '<button class="btn' + (cur === sc.id ? '' : ' primary') + '" data-act="scenario" data-id="' + sc.id + '">' + (cur === sc.id ? 'Relancer' : 'Lancer') + '</button></div></li>').join('') + '</ol>';
    body += '<p class="note" style="margin-top:16px">Chaque scénario recalcule la mission jusqu’au bon jour, toujours de la même façon, puis ouvre la page à montrer. Un bandeau en bas de l’écran rappelle quoi regarder et permet de passer au suivant.</p>';
    return H.page('Démonstration guidée', 'Six situations pour présenter AURA, dans l’ordre conseillé.', null, body);
  };

  /* ------------------------------------------------------------------ */
  /* À propos                                                            */
  /* ------------------------------------------------------------------ */
  function architecture() {
    return '<svg class="arch" viewBox="0 0 720 300" role="img" aria-label="Architecture en deux étages : un cœur qui fonctionne sans connexion ni IA, et un étage IA facultatif">' +
      '<rect class="ai" x="1" y="1" width="718" height="78" rx="4"/>' +
      '<text x="18" y="26" class="t-head">Étage IA, facultatif</text><text x="18" y="46" class="t-sub">modèle local ou en ligne, utilisé s’il est disponible</text>' +
      '<text x="18" y="66" class="t-sub">rédiger une réponse à partir des fiches, reformuler la synthèse de la semaine</text>' +
      '<path d="M360 80 L360 104"/><path d="M354 98 L360 106 L366 98"/>' +
      '<rect class="core" x="1" y="108" width="718" height="190" rx="4"/>' +
      '<text x="18" y="134" class="t-head">Cœur, à bord, sans connexion et sans IA</text>' +
      [['Mesures et symptômes', 'trois contrôles de cohérence'], ['Normes adaptées', 'cinq couches, filtre bayésien'], ['Alertes et urgence', 'seuils fixes de sécurité'], ['Actions et pharmacie', 'doses validées par le médecin'],
        ['Planification', 'Monte Carlo des besoins'], ['Bien-être', 'suivi individuel, privé'], ['Synthèse de la semaine', 'règles, journal de bord'], ['File vers la Terre', 'priorités, conjonction']]
        .map((b, i) => { const col = i % 4, row = Math.floor(i / 4); const x = 18 + col * 176, y = 150 + row * 70; return '<rect class="box" x="' + x + '" y="' + y + '" width="164" height="58" rx="3"/><text x="' + (x + 10) + '" y="' + (y + 24) + '" class="t-head" style="font-size:13px">' + b[0] + '</text><text x="' + (x + 10) + '" y="' + (y + 44) + '" class="t-sub">' + b[1] + '</text>'; }).join('') +
      '</svg>';
  }
  V.about = function (A) {
    const src = Object.keys(D.SOURCES).filter(k => k !== 'aura' && k !== 'general');
    let body = H.section('Ce qu’est AURA', null, '<div class="prose"><p>AURA est une plateforme de suivi de la santé des astronautes pour les missions lointaines, préparée pour le défi « Create Health Monitoring Software for Astronauts on Space Missions » du NASA Space Apps Challenge 2026, au sein de l’événement local de Dakar.</p><p>Aujourd’hui, l’adaptation des repères médicaux aux conditions du vol se fait surtout dans la tête du médecin au sol : il sait que la température monte en apesanteur, qu’un mal de tête peut venir du CO₂, qu’un médicament stocké longtemps peut perdre de sa puissance. Vers Mars, ce médecin répond avec plusieurs dizaines de minutes de retard, et parfois plus du tout. AURA met cette connaissance à bord, écrite, sourcée et vérifiable.</p></div>', ' style="border-top:0;padding-top:0"');
    body += H.section('Les conditions du vol prises en compte partout', null, '<ul class="list">' +
      [['#/equipage', 'Dans les repères', 'chaque mesure est lue avec l’effet du vol connu et la référence de la personne'],
        ['#/alertes', 'Dans les alertes', 'moins de fausses alertes, et des écarts repérés que la norme du sol aurait manqués'],
        ['#/saisie?type=symptome', 'Dans les symptômes', 'le CO₂, le sommeil ou un changement de gravité sont proposés comme causes avant le médicament'],
        ['#/pharmacie', 'Dans les traitements', 'stabilité des produits à bord, dose validée par le médecin, effet noté après chaque prise'],
        ['#/planification', 'Dans la préparation', 'les besoins en médicaments sont estimés pour une mission sans réapprovisionnement'],
        ['#/liaison', 'Dans la communication', 'délai radio réel, file par priorité, fonctionnement pendant la conjonction'],
        ['#/habitat', 'Dans l’environnement', 'CO₂ de la cabine et dose de radiation suivis avec les limites NASA']]
        .map(x => '<li><a href="' + x[0] + '"><b>' + esc(x[1]) + '</b></a> : ' + esc(x[2]) + '.</li>').join('') + '</ul>');
    body += H.section('Architecture', 'Le cœur fonctionne à bord sans internet et sans intelligence artificielle. L’IA n’est qu’un étage facultatif.', architecture());
    body += '<div class="cols">' + H.section('Ce qui est réellement calculé', null, '<ul class="list"><li>Le filtre bayésien de chaque référence personnelle, mesure après mesure</li><li>Les plages attendues, les alertes et les garde-fous absolus</li><li>Les trois contrôles de cohérence des mesures</li><li>Le lien entre symptômes et conditions du vol</li><li>La simulation Monte Carlo des besoins en médicaments</li><li>La file d’attente vers la Terre, avec délai et conjonction</li><li>La recherche documentaire hors connexion</li><li>La synthèse hebdomadaire</li></ul>') +
      H.section('Ce qui est simulé', null, '<ul class="list"><li>L’équipage, ses mesures et ses réponses du soir (fictifs)</li><li>Le CO₂ de la cabine et l’éruption solaire</li><li>Les réponses du médecin au sol</li><li>Les fréquences des situations médicales (illustratives)</li><li>Le modèle de distance Terre-Mars (simplifié)</li></ul><p class="note">Les données réelles prévues sont listées dans la page Mission.</p>') + '</div>';
    body += H.section('Règles de sécurité', null, '<ul class="list"><li>Une valeur anormale n’est jamais intégrée à la référence : le système n’apprend pas que l’anormal est normal.</li><li>Les seuils fixes de sécurité ne sont jamais personnalisés.</li><li>Un décalage persistant de la référence demande la décision du médecin de bord.</li><li>AURA ne change jamais une dose : il propose d’en discuter, le médecin valide.</li><li>Chaque repère cite sa source ; sans fiche pertinente, AURA le dit au lieu d’inventer.</li></ul>');
    body += H.section('Sources', null, '<ul class="sources-list">' + src.map(k => { const s = D.SOURCES[k]; return '<li><b>' + esc(s.label) + '</b>. ' + esc(s.ref) + (s.url ? ' <a href="' + esc(s.url) + '" target="_blank" rel="noopener">Lien</a>' : '') + '</li>'; }).join('') + '</ul>');
    body += H.section('Limites et suite', null, '<div class="prose"><p>Les écarts types, les fréquences des situations médicales et les effets du contexte sont des valeurs de démonstration, à calibrer avec les données réelles des archives de la NASA. Le modèle de distance Terre-Mars est simplifié. Les procédures d’urgence affichées sont des procédures de démonstration, pas des procédures de vol.</p><p>Suite prévue : brancher de vrais capteurs portés, calibrer les modèles sur les données LSDA et OSDR, ajouter l’étage IA en local, et faire relire les règles par des médecins.</p></div>');
    body += '<div class="cols">' + H.section('Le projet', null, '<div class="prose"><p>NASA Space Apps Challenge 2026, événement local de Dakar. Code source ouvert sur GitHub :</p><p><a href="https://github.com/TahibouTALL/demo-test-nasa-space-apps" target="_blank" rel="noopener">github.com/TahibouTALL/demo-test-nasa-space-apps</a></p><p class="note">Le code et les textes de cette plateforme ont été produits avec l’aide d’un assistant d’intelligence artificielle, ce qui est à déclarer dans la soumission, conformément aux règles du concours.</p></div>') +
      H.section('Ouvrir sur un téléphone', null, '<img class="qr" src="assets/qr-aura.svg" alt="Code QR vers la plateforme AURA en ligne" width="140" height="140"><p class="note">tahiboutall.github.io/demo-test-nasa-space-apps</p>') + '</div>';
    body += H.section('Affichage', null, '<div class="seg" role="group" aria-label="Thème">' + [['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(t => '<button data-act="theme" data-theme="' + t[0] + '" aria-pressed="' + (A.theme === t[0]) + '">' + t[1] + '</button>').join('') + '</div>');
    return H.page('À propos d’AURA', 'Ce que fait la plateforme, ce qui est calculé, ce qui est simulé, et d’où viennent les chiffres.', null, body);
  };
})(typeof self !== 'undefined' ? self : this);
