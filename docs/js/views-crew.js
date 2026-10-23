/* AURA : pages de l’équipage.
   Aujourd’hui, Mesurer, Je ne me sens pas bien, Bien-être, Entretien de la
   semaine. Le ton est celui d’un compagnon de bord : il rassure d’abord,
   propose sans imposer, et laisse chaque personne décider. */
(function (root) {
  'use strict';
  const V = root.AURA_VIEWS;
  const D = root.AURA_DATA, E = root.AURA_ENGINE, S = root.AURA_STORE, UI = root.AURA_UI, AI = root.AURA_AI;
  const H = V.H;
  const f = E.fmt, esc = UI.esc, NB = E.NBSP, DAY = 1440;
  const METRICS = H.METRICS;
  const lower = t => t.charAt(0).toLowerCase() + t.slice(1);
  const EFFECT = { aucun: 'Aucun effet', partiel: 'Un peu', complet: 'Oui, bien' };

  /* ------------------------------------------------------------------ */
  /* Aujourd’hui                                                         */
  /* ------------------------------------------------------------------ */
  function flagPhrase(code) {
    if (!code) return '';
    if (code.indexOf('sommeil') === 0) return 'Votre sommeil est plus court en ce moment';
    if (code.indexOf('humeur') === 0) return 'Votre moral est un peu plus bas ces jours-ci';
    if (code === 'reaction') return 'La fatigue se fait sentir ces jours-ci';
    if (code === 'stress') return 'Votre stress est élevé cette semaine';
    if (code === 'charge') return 'Votre charge de travail est lourde depuis quelques jours';
    return 'Votre semaine a été un peu plus difficile';
  }
  V.flagPhrase = flagPhrase;

  function crewState(A) {
    const s = A.s, id = s.me, d = H.today(A);
    if (s.emergency) return { level: 'urgence', text: 'Mode urgence en cours : ' + lower(s.emergency.title) + '.', sub: 'Suivez la procédure, une étape à la fois. <a href="#/urgence">Ouvrir la procédure</a>' };
    const al = s.alerts.filter(x => x.st !== 'close' && x.a === id);
    const urg = al.find(x => x.lv === 'urgence');
    if (urg) return { level: 'urgence', text: 'Une valeur demande votre attention maintenant.', sub: esc(urg.crew) };
    const lasts = METRICS.map(k => S.lastMeasurement(s, id, k)).filter(Boolean);
    const todays = lasts.filter(m => Math.floor(m.t / DAY) === d);
    const out = lasts.filter(m => m.lv !== 'normal');
    let sub = H.phaseText(A) + ', jour ' + d + ' de la mission. ' + H.earthLine(A);
    if (al.length || out.length) return { level: 'vigilance', text: 'Une mesure est un peu en dehors de votre zone.', sub: 'Rien d’urgent. Vous pouvez la reprendre au calme, un peu plus tard. ' + sub };
    const wb = S.wellbeingState(s, id);
    const text = todays.length === 3 ? 'Tout va bien ' + H.moment(A) + '. Vos trois mesures sont dans votre zone.' : lasts.length ? 'Tout va bien. Vos dernières mesures sont dans votre zone.' : 'Prenez une première mesure quand vous voulez.';
    if (wb.level !== 'none') sub += ' ' + flagPhrase(wb.flags[0].code) + ' : une pause peut aider, dans <a href="#/bien-etre">Bien-être</a>.';
    return { level: 'normal', text, sub };
  }
  V.crewState = crewState;

  function later(A, k) { return A.s.later && A.s.later[k] === H.today(A); }

  function todayItems(A) {
    const s = A.s, me = s.me, d = H.today(A), items = [];
    S.pendingFollowUps(s).filter(ad => ad.a === me).forEach(ad => {
      const med = S.medById[ad.med];
      items.push({
        title: 'Le ' + lower(med.name.split(' ')[0]) + ' a-t-il fait effet ?',
        meta: 'Pris ' + H.ago(A, ad.t) + '. Votre réponse aide la médecin de bord à ajuster la dose si besoin.',
        actions: ['complet', 'partiel', 'aucun'].map(e => '<button class="btn sm' + (e === 'complet' ? ' primary' : '') + '" data-act="effect" data-id="' + ad.id + '" data-effect="' + e + '">' + EFFECT[e] + '</button>').join('')
      });
    });
    s.todo.filter(td => td.kind === 'reprise' && td.a === me).forEach(td => {
      items.push({ title: 'Reprendre la mesure : ' + D.metrics[td.k].lc, meta: 'Demandée ' + H.ago(A, td.t) + ', pour confirmer une valeur isolée.', actions: '<button class="btn sm" data-act="retake" data-a="' + td.a + '" data-k="' + td.k + '" data-ref="' + td.ref + '">Reprendre</button>' });
    });
    S.inboxFor(s, me).filter(m => !m.read && s.now - m.arrAt < 2 * DAY).slice(0, 2).forEach(m => {
      items.push({ title: m.from === 'Médecin au sol' ? 'Message du médecin au sol' : 'Réponse du sol', meta: m.title.replace(/^Réponse : /, '') + ', reçu ' + H.ago(A, m.arrAt) + '.', actions: '<a class="btn sm" href="#/liaison?msg=' + m.id + '">Lire</a>' });
    });
    const evening = s.wb.some(w => w.a === me && Math.floor(w.t / DAY) === d && w.src === 'saisie');
    if (!evening && H.hour(A) >= 16 && !later(A, 'soir')) items.push({ title: 'Votre point du soir', meta: 'Deux minutes, quand vous voulez. Vos réponses restent privées.', actions: '<a class="btn sm" href="#/bien-etre?point=1">Faire le point</a><button class="btn sm quiet" data-act="later" data-k="soir">Plus tard</button>' });
    const itv = S.currentInterview(s, me);
    if ((!itv || itv.status === 'en cours') && !later(A, 'conf')) items.push({ title: itv ? 'Reprendre votre entretien de la semaine' : 'Votre entretien de la semaine', meta: 'Environ cinq minutes, à la voix ou par écrit. Vous choisissez ce qui part vers la Terre.', actions: '<a class="btn sm" href="#/conference">' + (itv ? 'Reprendre' : 'Commencer') + '</a><button class="btn sm quiet" data-act="later" data-k="conf">Plus tard</button>' });
    return items;
  }
  V.todayItems = todayItems;

  function todoHtml(items) {
    return '<ul class="todo">' + items.map(it => '<li><span class="t-mark"></span><div class="t-body"><div class="t-title">' + esc(it.title) + '</div><div class="t-meta">' + esc(it.meta) + '</div></div><div class="btn-row">' + it.actions + '</div></li>').join('') + '</ul>';
  }
  V.todoHtml = todoHtml;

  V.today = function (A) {
    const s = A.s, me = H.me(A);
    const st = crewState(A);
    let body = '<section class="section" style="margin-top:28px">' + V.vitals(A, s.me) +
      '<div class="btn-row between" style="margin-top:12px"><a class="btn quiet sm" href="#/dossier">Comment AURA lit vos valeurs</a><a class="btn quiet sm" href="#/mesurer">Prendre une mesure</a></div></section>';
    const items = todayItems(A);
    if (items.length) body += H.section('Pour aujourd’hui', null, todoHtml(items));
    body += H.section('Besoin de quelque chose ?', null, '<div class="big-actions">' +
      '<a class="big-action warm" href="#/mesurer/symptome">Je ne me sens pas bien<span>Dites ce qui ne va pas : AURA cherche aussi la cause dans la cabine</span></a>' +
      '<a class="big-action" href="#/assistant">Poser une question<span>Réponses tirées des fiches de bord, avec leurs sources</span></a>' +
      '<a class="big-action" href="#/mesurer">Prendre une mesure<span>Température, pouls, oxygène</span></a></div>');
    // Votre semaine
    const wb = S.wellbeingState(s, s.me);
    const sleepFlag = wb.flags.find(x => x.code.indexOf('sommeil') === 0);
    const moodFlag = wb.flags.find(x => x.code.indexOf('humeur') === 0);
    let week = '<dl class="kv">';
    week += '<dt>Sommeil</dt><dd>' + (wb.an.sleep7 !== null ? esc(f.hours(wb.an.sleep7)) + ' par nuit en moyenne' + (sleepFlag ? ', plus court que d’habitude' : ', comme d’habitude') : 'pas encore de point du soir') + '</dd>';
    week += '<dt>Moral</dt><dd>' + (wb.an.mood7 !== null ? (moodFlag ? 'un peu plus bas que d’habitude' : wb.an.mood7 >= 3.8 ? 'plutôt bon' : 'correct') : 'n.d.') + '</dd>';
    if (wb.rt.last) week += '<dt>Réaction</dt><dd>' + esc(f.num(wb.rt.last.median, 0)) + NB + 'ms au dernier test' + (wb.rt.slower ? ', plus lent que d’habitude' : '') + '</dd>';
    week += '</dl>';
    body += H.section('Votre semaine', null, '<div class="panel soft">' + week + '<div class="btn-row" style="margin-top:14px"><a class="btn sm" href="#/bien-etre">Voir le bien-être</a></div></div>');
    // Autour de vous
    const co2 = S.co2At(s, s.now), co2lv = E.co2Level(D.habitat.co2, co2);
    const tasks = S.upcomingTasks(s, s.me, 48);
    let around = '<dl class="kv">';
    around += '<dt>Air de la cabine</dt><dd>CO₂ ' + esc(f.num(co2, 1)) + NB + 'mmHg' + (co2lv === 'normal' ? ', sous la limite de 3' : ' ' + UI.pill(co2lv, 'au-dessus de la limite')) + '</dd>';
    around += '<dt>Rayonnement</dt><dd>' + esc(f.num(S.radTotalNow(s), 0)) + NB + 'mSv reçus depuis le départ</dd>';
    around += '<dt>La Terre</dt><dd>' + esc(H.earthLine(A).replace('La Terre reçoit vos messages', 'Messages reçus').replace(/\.$/, '')) + '</dd>';
    if (tasks.length) around += '<dt>Prochainement</dt><dd>' + esc(tasks[0].label + ', ' + tasks[0].when) + (tasks[0].crew.length > 1 ? ', avec ' + esc(tasks[0].crew.filter(x => x !== s.me).map(x => H.first(S.name(x))).join(' et ')) : '') + '</dd>';
    around += '</dl>';
    body += H.section('Autour de vous', null, around + '<div class="btn-row" style="margin-top:12px"><a class="btn quiet sm" href="#/mission">Mission et cabine</a></div>');
    return H.page({ title: H.greet(A) + ' ' + H.first(me.name), hello: true, calm: true, state: H.state(st.level, st.text, st.sub), body });
  };

  /* ------------------------------------------------------------------ */
  /* Mesurer                                                              */
  /* ------------------------------------------------------------------ */
  function forWhom(A) { return H.crew(A) ? A.s.me : (A.flow.who || 'a1'); }
  V.forWhom = forWhom;
  function whoPicker(A, a) {
    if (H.crew(A)) return '';
    return '<div class="field" style="max-width:360px"><label for="who">Pour qui ?</label><select id="who" name="a" data-change="who">' + H.crewOptions(A, a) + '</select></div>';
  }

  V.measureHome = function (A) {
    const a = forWhom(A);
    let tiles = '<div class="tiles">';
    METRICS.forEach(k => {
      const cfg = D.metrics[k], m = S.lastMeasurement(A.s, a, k);
      tiles += '<a class="tile" href="#/mesurer/' + k + '"><b>' + esc(k === 'spo2' ? 'Oxygène dans le sang (SpO₂)' : cfg.label) + '</b><span>' + (m ? 'Dernière : ' + esc(f.unit(m.v, cfg)) + ', ' + esc(lower(V.word(m, cfg, false))) + ', ' + esc(H.ago(A, m.t)) : 'Pas encore de mesure') + '</span></a>';
    });
    tiles += '<a class="tile" href="#/mesurer/symptome" style="border-color:var(--amber)"><b>Je ne me sens pas bien</b><span>Dites ce qui ne va pas. AURA cherche d’abord une cause dans les conditions du vol.</span></a>';
    tiles += '</div>';
    const body = '<div style="margin-top:8px">' + whoPicker(A, a) + '</div>' + tiles +
      '<p class="note" style="margin-top:18px">Chaque mesure est lue avec la référence de la personne à ce moment du vol, construite avant le départ puis ajustée chaque jour. Les seuils fixes de sécurité restent valables pour tout le monde.</p>';
    return H.page({ title: 'Mesurer', calm: true, lead: H.crew(A) ? 'Que voulez-vous mesurer ?' : 'Saisir une mesure ou un symptôme pour un membre d’équipage.', body });
  };

  const EXAMPLES = {
    temp: [['38.1', '38,1 °C'], ['37.9', '37,9 °C'], ['39.3', '39,3 °C (seuil fixe)'], ['45.3', '45,3 °C (valeur impossible)'], ['', 'Champ vide (donnée manquante)']],
    hr: [['92', '92 bpm au repos'], ['52', '52 bpm au repos'], ['130', '130 bpm (seuil fixe)'], ['0', '0 bpm (valeur impossible)']],
    spo2: [['91', '91 % juste après une mesure normale'], ['88', '88 % (seuil fixe)'], ['12', '12 % (valeur impossible)']]
  };
  const HOW = {
    temp: 'Au repos, assis, au moins dix minutes après un effort.',
    hr: 'Au repos, assis, après cinq minutes de calme.',
    spo2: 'Doigt réchauffé, capteur bien en place, main immobile.'
  };

  V.measure = function (A, k) {
    const cfg = D.metrics[k];
    if (!cfg) return V.measureHome(A);
    const a = forWhom(A);
    const fm = A.flow.m && A.flow.m.k === k ? A.flow.m : (A.flow.m = { a, k, v: '', ctx: {}, retakeOf: A.route.q.reprise || null, result: null });
    if (A.route.q.reprise && !fm.retakeOf) fm.retakeOf = A.route.q.reprise;
    const r = fm.result;
    const title = k === 'spo2' ? 'Oxygène dans le sang' : cfg.short;
    if (r) {
      let body = '<div aria-live="polite" id="result" style="margin-top:8px">' + measureResult(A, r) + '</div>';
      body += '<div class="btn-row" style="margin-top:20px"><a class="btn primary" href="#/" data-act="measure-done">Terminé</a><button class="btn" data-act="measure-again">Nouvelle mesure</button><a class="btn quiet" href="#/dossier/' + r.a + '?m=' + k + '">Voir l’historique</a></div>';
      return H.page({ title, calm: true, lead: null, body });
    }
    const last = S.lastMeasurement(A.s, a, k);
    const ctxKeys = Object.keys(cfg.context || {});
    let form = '<form data-form="measure" class="panel" novalidate style="margin-top:8px">';
    form += '<input type="hidden" name="k" value="' + k + '">';
    form += whoPicker(A, a);
    form += '<div class="field"><label for="m-v">Valeur mesurée</label><div class="big-number">' +
      '<button type="button" class="step-btn" data-act="nudge" data-d="-' + cfg.step + '" aria-label="Diminuer">−</button>' +
      '<input id="m-v" name="v" type="number" inputmode="decimal" step="' + cfg.step + '" value="' + esc(fm.v) + '" placeholder="' + (last ? esc(f.num(last.v, cfg.decimals)) : '') + '" aria-describedby="m-v-h">' +
      '<button type="button" class="step-btn" data-act="nudge" data-d="' + cfg.step + '" aria-label="Augmenter">+</button><span class="unit">' + esc(cfg.unit) + '</span></div>' +
      '<span class="hint" id="m-v-h">' + esc(HOW[k]) + (last ? ' Dernière mesure : ' + esc(f.unit(last.v, cfg)) + ', ' + esc(H.ago(A, last.t)) + '.' : '') + '</span></div>';
    if (ctxKeys.length) form += '<fieldset><legend>Juste avant la mesure</legend><div class="toggles">' + ctxKeys.map(ck => '<label class="toggle"><input type="checkbox" name="ctx" value="' + ck + '"' + (fm.ctx[ck] ? ' checked' : '') + '><span>' + esc(D.contextLabels[ck]) + '</span></label>').join('') + '</div></fieldset>';
    if (fm.retakeOf) form += '<input type="hidden" name="retakeOf" value="' + esc(fm.retakeOf) + '"><p class="note">Cette mesure confirme ou corrige la précédente.</p>';
    form += '<button class="btn primary lg" type="submit">Lire la mesure</button></form>';
    form += '<details class="disclose"><summary>Exemples pour la démonstration</summary><div class="chips" style="margin-top:6px">' + EXAMPLES[k].map(e => '<button type="button" class="chip" data-act="example" data-k="' + k + '" data-v="' + e[0] + '">' + esc(e[1]) + '</button>').join('') + '</div></details>';
    return H.page({ title, calm: true, lead: 'AURA lit la valeur avec la référence ' + (H.crew(A) ? 'de votre corps' : esc(H.de(H.first(S.name(a))))) + ' à ce moment du vol, puis vous dit simplement ce qu’elle signifie.', body: form });
  };

  function measureResult(A, r) {
    const cfg = D.metrics[r.k];
    const med = H.medical(A);
    if (r.status === 'missing') return '<div class="panel"><p class="result-title" style="margin-top:0">Aucune valeur n’a été saisie</p><p class="result-text">Rien n’est enregistré. AURA continue avec la dernière référence connue, sans erreur ni alerte.</p>' + (med ? '<p class="note">Contrôle 2 sur 3 (donnée manquante) : pas de mise à jour du filtre.</p>' : '') + '<div class="btn-row" style="margin-top:12px"><button class="btn" data-act="measure-again">Saisir une valeur</button></div></div>';
    if (r.status === 'rejected') return '<div class="panel"><div class="result-head"><div class="result-value">' + esc(f.num(r.v, cfg.decimals)) + '<small>' + esc(cfg.unit) + '</small></div>' + UI.pill('info', 'Ignorée') + '</div><p class="result-title">Cette valeur ne peut pas venir du corps humain</p><p class="result-text">Le capteur ou la saisie est en cause. La valeur n’est pas enregistrée et ne change pas votre référence.</p>' + (med ? '<p class="note">Contrôle 1 sur 3 (plausibilité) : hors de la plage physiologique de ' + f.num(cfg.plausible.min, 0) + ' à ' + f.num(cfg.plausible.max, 0) + ' ' + esc(cfg.unit) + '.</p>' : '') + '<div class="btn-row" style="margin-top:12px"><button class="btn primary" data-act="measure-again">Reprendre la mesure</button></div>' + UI.sources(['aura']) + '</div>';
    if (r.status === 'retake') return '<div class="panel"><div class="result-head"><div class="result-value">' + esc(f.num(r.v, cfg.decimals)) + '<small>' + esc(cfg.unit) + '</small></div>' + UI.pill('vigilance', 'À confirmer') + '</div><p class="result-title">Reprenez la mesure avant de conclure</p><p class="result-text">Cette valeur est très éloignée de vos mesures récentes, sans raison apparente. Le plus souvent, c’est un capteur mal placé. Si la deuxième mesure confirme, l’alerte part tout de suite.</p>' + (med ? '<p class="note">Contrôle 3 sur 3 (valeur isolée) : |z| supérieur à 4 juste après une mesure normale, sans contexte. Alerte suspendue jusqu’à confirmation.</p>' : '') + '<div class="btn-row" style="margin-top:12px"><button class="btn primary" data-act="retake" data-a="' + r.a + '" data-k="' + r.k + '" data-ref="' + r.id + '">Reprendre la mesure</button></div>' + UI.sources(['aura']) + '</div>';
    let h = V.reading(A, r.rec, { animate: true, fresh: r.fresh, layout: 'calm' });
    if (r.emergency) h += '<div class="callout urgent" style="margin-top:14px"><p><b>Mode urgence déclenché.</b> La valeur dépasse un seuil fixe de sécurité. <a href="#/urgence">Ouvrir la procédure</a></p></div>';
    else if (r.alertTitle) h += '<p class="note" style="margin-top:12px">La médecin de bord voit cette mesure dans ses alertes.</p>';
    return h;
  }
  V.measureResult = measureResult;

  /* ------------------------------------------------------------------ */
  /* Je ne me sens pas bien                                               */
  /* ------------------------------------------------------------------ */
  V.symptom = function (A) {
    const a = forWhom(A);
    const fy = A.flow.sy || (A.flow.sy = { a, sym: '', intensity: 3, note: '', result: null });
    if (fy.result) return symptomResult(A, fy);
    let form = '<form data-form="symptom" class="panel" novalidate style="margin-top:8px">';
    form += whoPicker(A, a);
    form += '<fieldset><legend>Ce que vous ressentez</legend><div class="choices">' + D.symptoms.map(x => '<label class="choice"><input type="radio" name="sym" value="' + x.id + '"' + (x.id === fy.sym ? ' checked' : '') + '><span>' + esc(x.label) + '</span></label>').join('') + '</div></fieldset>';
    form += '<div class="field"><label for="s-i">À quel point est-ce gênant ? <output id="s-io" class="muted">' + fy.intensity + ' sur 10</output></label><input id="s-i" name="intensity" type="range" min="0" max="10" step="1" value="' + fy.intensity + '" data-change="intensity"><div class="range-words"><span>À peine</span><span>Très fort</span></div></div>';
    form += '<div class="field"><label for="s-n">En quelques mots (facultatif)</label><textarea id="s-n" name="note" placeholder="Depuis quand, ce qui aggrave ou soulage">' + esc(fy.note || '') + '</textarea></div>';
    form += '<button class="btn primary lg" type="submit">Voir ce qu’AURA en pense</button></form>';
    form += '<div class="panel soft" style="margin-top:16px"><h3>C’est urgent ?</h3><p class="muted" style="margin-bottom:12px">Douleur dans la poitrine, difficulté à respirer, malaise, saignement important, faiblesse d’un côté du corps : ces signes passent avant tout calcul.</p><a class="btn danger" href="#/urgence">Signaler un signe d’alarme</a></div>';
    return H.page({ title: 'Qu’est-ce qui ne va pas ?', calm: true, lead: 'Dites ce que vous ressentez. AURA regarde d’abord les conditions du vol : air de la cabine, sommeil, changement de gravité. Les gestes sans médicament passent en premier.', body: form });
  };

  function actionPlan(A, a, symId, severe) {
    const plan = S.actionOptions(A.s, a, symId, severe);
    if (!plan) return '';
    let h = '<h3 style="margin-top:22px">Si un médicament est nécessaire</h3><p class="small muted">Avant de proposer un médicament, AURA vérifie dans l’ordre : qu’il est à bord, en quantité suffisante, encore bon, faisable en apesanteur, compatible avec les tâches à venir, et le temps de réponse du sol.</p>';
    plan.options.forEach(o => {
      const med = S.medById[o.med];
      const rec = plan.recommended === o.med;
      const status = o.blocked ? ['vigilance', 'À éviter maintenant'] : rec ? ['normal', 'Proposé'] : o.caution ? ['vigilance', 'Avec précaution'] : ['info', 'Possible aussi'];
      const fac = A.s.factor[o.med];
      h += '<div class="fiche" style="margin-top:10px"><div class="row"><div><b style="margin:0">' + esc(med.name) + '</b><span class="small muted">' + esc(H.unitsTxt(o.units, med)) + ' par prise, dose validée' + (fac.f !== 1 ? ' (facteur ' + esc(f.num(fac.f, 2)) + ')' : '') + '</span></div>' + UI.pill(status[0], status[1]) + '</div>';
      const bad = o.checks.filter(c => c.state === 'no'), warn = o.checks.filter(c => c.state === 'warn');
      if (bad.length) h += bad.map(c => '<p class="fiche-line no"><span class="ck" aria-hidden="true">' + H.mark('no') + '</span><span>' + esc(c.text) + '.</span></p>').join('');
      else if (warn.length) h += warn.map(c => '<p class="fiche-line warn"><span class="ck" aria-hidden="true">' + H.mark('warn') + '</span><span>' + esc(c.text) + '.</span></p>').join('');
      else h += '<p class="fiche-line"><span class="ck" aria-hidden="true">' + H.mark('ok') + '</span><span>Toutes les vérifications sont bonnes.</span></p>';
      h += '<details class="more"><summary>Voir les ' + o.checks.length + ' vérifications</summary><ul class="checks">' + o.checks.map(c => '<li class="' + c.state + '"><span class="ck" aria-hidden="true">' + H.mark(c.state) + '</span><span><b>' + esc(c.label) + '</b> : ' + esc(c.text) + '</span></li>').join('') + '</ul></details>';
      if (!o.blocked) {
        if (A.ui.admin && A.ui.admin.med === o.med) h += V.adminForm(A, o.med, a);
        else h += '<div class="btn-row" style="margin-top:8px"><button class="btn sm" data-act="admin-open" data-med="' + o.med + '" data-a="' + a + '">' + (H.crew(A) ? 'Noter une prise' : 'Administrer') + '</button></div>';
      }
      h += '</div>';
    });
    if (plan.allBlocked) h += '<div class="callout attention" style="margin-top:12px"><p>Aucun médicament ne passe toutes les vérifications en ce moment. La médecin de bord décide avec vous ; elle peut aussi décaler la tâche prévue.</p></div>';
    h += '<p class="note" style="margin-top:10px">Proposition à valider par la médecin de bord. AURA ne change jamais une dose.</p>';
    return h;
  }
  V.actionPlan = actionPlan;

  function symptomResult(A, fy) {
    const r = fy.result, an = r.analysis, sy = S.symptomById[fy.sym];
    const med = H.medical(A, 'sy');
    const cabin = an.findings.some(x => x.source === 'law2014');
    const title = an.level === 'vigilance' ? 'À montrer à la médecin de bord' : cabin ? 'La cause est peut-être dans la cabine' : an.findings.length ? 'Ce que la mission change pour ce symptôme' : 'Pas de lien particulier avec le vol en ce moment';
    let h = '<div class="panel" style="margin-top:8px" aria-live="polite" id="result">';
    h += '<div class="row"><div class="row-meta">' + esc(sy.label) + (H.crew(A) && fy.a === A.s.me ? '' : ', ' + esc(S.name(fy.a))) + ', ' + esc(f.when(r.t)) + (fy.intensity ? ', intensité ' + fy.intensity + ' sur 10' : '') + '</div>' + H.flipLink(A, 'sy') + '</div>';
    h += '<p class="result-title">' + esc(title) + '</p>';
    if (an.findings.length) h += '<ul class="list">' + an.findings.map(x => '<li>' + esc(med ? x.doctor : x.crew) + (x.source ? ' <span class="src" style="display:inline">' + UI.src(x.source) + '</span>' : '') + '</li>').join('') + '</ul>';
    const adv = med ? an.crewAdvice.concat(an.doctorAdvice) : an.crewAdvice;
    if (adv.length) h += '<h3 style="margin-top:18px">À faire, dans l’ordre</h3><ol style="padding-left:1.3rem">' + adv.map(x => '<li style="margin:6px 0">' + esc(x) + '</li>').join('') + '</ol>';
    h += actionPlan(A, fy.a, fy.sym, an.level === 'vigilance');
    if (r.alertTitle) h += '<div class="callout calm" style="margin-top:14px"><p>La médecin de bord est prévenue. Elle voit ce symptôme dans ses alertes.</p></div>';
    if (sy.kb.length) h += '<p class="small" style="margin-top:16px">En savoir plus : ' + sy.kb.map(id => { const c = A.cardById(id); return c ? '<a href="#/assistant?fiche=' + id + '">' + esc(c.title) + '</a>' : ''; }).filter(Boolean).join(', ') + '</p>';
    h += '</div><div class="btn-row" style="margin-top:20px"><a class="btn primary" href="#/" data-act="symptom-done">Terminé</a><button class="btn" data-act="symptom-again">Signaler autre chose</button><a class="btn quiet" href="#/assistant">Poser une question</a></div>';
    return H.page({ title: sy.label, calm: true, body: h });
  }

  V.adminForm = function (A, mid, a) {
    const med = S.medById[mid], units = S.validatedUnits(A.s, mid);
    return '<form data-form="administer" class="btn-row" style="margin-top:10px"><input type="hidden" name="med" value="' + mid + '">' +
      (H.crew(A) ? '<input type="hidden" name="a" value="' + esc(a || A.s.me) + '">' : '<label class="visually-hidden" for="ad-a-' + mid + '">Pour</label><select id="ad-a-' + mid + '" name="a" style="width:auto">' + H.crewOptions(A, a || A.s.me) + '</select>') +
      '<label class="visually-hidden" for="ad-u-' + mid + '">Unités</label><input id="ad-u-' + mid + '" name="units" type="number" min="0.5" step="' + (med.units === 'comprimé' ? '0.5' : '1') + '" value="' + units + '" style="width:90px">' +
      '<span class="small muted">' + esc(med.units) + (units > 1 ? 's' : '') + '</span><button class="btn sm primary" type="submit">Confirmer la prise</button><button class="btn sm quiet" type="button" data-act="admin-cancel">Annuler</button></form>';
  };

  /* ------------------------------------------------------------------ */
  /* Bien-être                                                            */
  /* ------------------------------------------------------------------ */
  const SCALES = {
    mood: ['Très bas', 'Bas', 'Correct', 'Bien', 'Très bien'],
    stress: ['Très calme', 'Calme', 'Moyen', 'Tendu', 'Très tendu'],
    sq: ['Très mauvais', 'Mauvais', 'Moyen', 'Bon', 'Très bon'],
    load: ['Très légère', 'Légère', 'Normale', 'Lourde', 'Très lourde']
  };
  function scale(name, label, val) {
    return '<fieldset><legend>' + esc(label) + '</legend><div class="choices">' + SCALES[name].map((w, i) => '<label class="choice"><input type="radio" name="' + name + '" value="' + (i + 1) + '"' + (val === i + 1 ? ' checked' : '') + '><span>' + esc(w) + '</span></label>').join('') + '</div></fieldset>';
  }

  function wbCharts(A, id, days, layout) {
    const from = (H.today(A) - days + 1) * DAY;
    const list = A.s.wb.filter(w => w.a === id && w.t >= from && w.t <= A.s.now);
    if (!list.length) return '<p class="empty">Pas encore de point du soir.</p>';
    const mood = list.map(w => ({ x: w.t / DAY, y: w.mood, w })), stress = list.map(w => ({ x: w.t / DAY, y: w.stress, w }));
    const c1 = UI.xyChart({
      label: 'Humeur et stress, sur 5, ' + days + ' derniers jours', height: 210, yMin: 0.5, yMax: 5.5, yTicks: 5, layout,
      lines: [{ pts: stress, cls: 'series-3' }, { pts: mood, cls: 'series-2' }],
      xFmt: v => f.day(v), hover: list.map(w => ({ x: w.t / DAY, y: w.mood, w })),
      tip: p => ['Humeur ' + p.w.mood + ' sur 5, stress ' + p.w.stress + ' sur 5', f.when(p.w.t)],
      legend: '<div class="legend"><span><i class="key line" style="background:var(--aura)"></i>Humeur (5 : très bien)</span><span><i class="key line" style="background:var(--ink-3)"></i>Stress (5 : très tendu)</span></div>',
      table: { head: ['Jour', 'Humeur', 'Stress', 'Sommeil', 'Charge'], rows: list.slice().reverse().map(w => [f.day(w.t / DAY), w.mood + ' sur 5', w.stress + ' sur 5', f.hours(w.sleep), w.load + ' sur 5']) }
    });
    const c2 = UI.xyChart({
      label: 'Heures de sommeil, ' + days + ' derniers jours', height: 190, yMin: 3, yMax: 9, yTicks: 6, layout,
      lines: [{ pts: list.map(w => ({ x: w.t / DAY, y: w.sleep })), cls: 'series' }],
      dots: list.map(w => ({ x: w.t / DAY, y: w.sleep, level: w.sleep < 5.5 ? 'vigilance' : '' })),
      hlines: [{ y: 6, cls: 'guide' }],
      legend: '<div class="legend"><span><i class="key line"></i>Heures de sommeil</span><span><i class="key dot attention"></i>Moins de 5 h 30</span><span><i class="key dash"></i>Environ 6 h : moyenne observée en mission</span></div>',
      xFmt: v => f.day(v), hover: list.map(w => ({ x: w.t / DAY, y: w.sleep, w })),
      tip: p => [f.hours(p.w.sleep) + ' de sommeil', f.when(p.w.t), 'Qualité : ' + SCALES.sq[p.w.sq - 1].toLowerCase()]
    });
    return '<h3>Humeur et stress</h3>' + c1 + '<h3 style="margin-top:22px">Sommeil</h3>' + c2 + UI.sources(['barger2014']);
  }
  V.wbCharts = wbCharts;

  function rtChart(A, id, layout) {
    const tr = S.reactionTrend(A.s, id);
    if (!tr.list.length) return '<p class="empty">Pas encore de test de réaction.</p>';
    const pts = tr.list.map(x => ({ x: x.t / DAY, y: x.median, rec: x, level: tr.base && x.median > tr.base * 1.08 ? 'vigilance' : '' }));
    return UI.xyChart({
      label: 'Temps de réaction médian, en millisecondes, à chaque test', height: 190, layout, yTitle: 'ms',
      lines: [{ pts, cls: 'series' }], dots: pts,
      hlines: tr.base ? [{ y: tr.base, cls: 'guide' }] : [],
      legend: '<div class="legend"><span><i class="key line"></i>Temps médian à chaque test</span>' + (tr.base ? '<span><i class="key dash"></i>Habituel : ' + f.num(tr.base, 0) + ' ms</span>' : '') + '<span><i class="key dot attention"></i>Plus lent que d’habitude</span></div>',
      xFmt: v => f.day(v), hover: pts,
      tip: p => [f.num(p.rec.median, 0) + ' ms', f.when(p.rec.t), p.rec.lapses + ' réponse' + (p.rec.lapses > 1 ? 's' : '') + ' lente' + (p.rec.lapses > 1 ? 's' : '') + (p.rec.src === 'sim' ? ', test simulé' : ', test fait à bord')],
      table: { head: ['Quand', 'Médiane', 'Réponses lentes', 'Origine'], rows: tr.list.slice().reverse().map(r => [f.when(r.t), f.num(r.median, 0) + ' ms', String(r.lapses), r.src === 'sim' ? 'simulé' : 'fait à bord']) }
    }) + UI.sources(['basner2011']);
  }
  V.rtChart = rtChart;

  V.wellbeing = function (A) {
    if (!H.crew(A)) return V.wellbeingDoctor(A);
    const s = A.s, me = s.me, d = H.today(A);
    const wbs = S.wellbeingState(s, me);
    const st = wbs.level === 'none' ? ['normal', 'Rien de particulier en ce moment.', 'Vos réponses restent privées entre vous et la médecin de bord.']
      : wbs.level === 'light' ? ['normal', flagPhrase(wbs.flags[0].code) + '.', 'Rien d’inquiétant en soi. Quelques minutes de pause peuvent aider, et vous pouvez en parler quand vous voulez.']
        : ['vigilance', 'Votre semaine a été plus difficile que d’habitude.', 'Ce n’est pas un diagnostic : AURA repère seulement une baisse qui dure. Vous pouvez en parler, quand vous voulez.'];
    let body = '';
    if (wbs.flags.length) body += '<section class="section" style="margin-top:24px"><div class="panel soft"><h3>Ce qu’AURA a remarqué</h3><ul class="list">' + wbs.flags.map(x => '<li>' + esc(x.crew) + '</li>').join('') + '</ul></div></section>';
    body += H.section('Ce qui pourrait vous faire du bien', null, '<div class="big-actions">' +
      '<a class="big-action" href="#/bien-etre/respiration">Une pause respiration<span>Cinq minutes, guidées par un cercle qui respire</span></a>' +
      '<a class="big-action" href="#/bien-etre/paysage">Un paysage de la Terre<span>À regarder tout autour de vous, pour souffler</span></a>' +
      '<a class="big-action" href="#/bien-etre/reaction">Le test de réaction<span>Trois minutes, pour repérer la fatigue</span></a></div>' +
      (wbs.level === 'moderate' ? psyRequest(A) : ''));
    // Point du soir
    const cur = s.wb.find(w => w.a === me && Math.floor(w.t / DAY) === d && w.src === 'saisie') || { mood: 0, stress: 0, sleep: '', sq: 0, load: 0, contact: 0, note: '', share: 0 };
    let form = '<form data-form="wellbeing" class="panel">' + scale('mood', 'Votre humeur aujourd’hui', cur.mood) + scale('stress', 'Votre niveau de tension', cur.stress) +
      '<div class="field"><label for="wb-s">Heures de sommeil la nuit dernière</label><div class="big-number"><button type="button" class="step-btn" data-act="nudge" data-target="wb-s" data-d="-0.25" aria-label="Moins">−</button><input id="wb-s" name="sleep" type="number" min="0" max="14" step="0.25" value="' + esc(cur.sleep) + '" placeholder="6,5"><button type="button" class="step-btn" data-act="nudge" data-target="wb-s" data-d="0.25" aria-label="Plus">+</button><span class="unit">h</span></div></div>' +
      scale('sq', 'Qualité du sommeil', cur.sq) + scale('load', 'Charge de travail', cur.load) +
      '<div class="toggles"><label class="toggle"><input type="checkbox" name="contact"' + (cur.contact ? ' checked' : '') + '><span>J’ai pu échanger avec mes proches aujourd’hui</span></label></div>' +
      '<div class="field" style="margin-top:18px"><label for="wb-n">Une note pour vous (facultatif)</label><textarea id="wb-n" name="note">' + esc(cur.note) + '</textarea></div>' +
      '<div class="toggles" style="margin-bottom:18px"><label class="toggle"><input type="checkbox" name="share"' + (cur.share ? ' checked' : '') + '><span>Partager cette note avec la médecin de bord</span></label></div>' +
      '<button class="btn primary" type="submit">Enregistrer mon point</button><p class="note" style="margin-top:12px">Les réponses servent à repérer une baisse qui dure, jamais à vous noter. Vous pouvez sauter un soir.</p></form>';
    body += H.section('Votre point du soir', 'Deux minutes, quand vous voulez.', form, { id: 'point' });
    body += H.section('Vos dernières semaines', null, wbCharts(A, me, 21, 'calm') + '<h3 style="margin-top:22px">Temps de réaction</h3>' + rtChart(A, me, 'calm'));
    body += H.section('Si l’ambiance est tendue à bord', 'Pendant la simulation Mars-520, deux personnes, les plus stressées et les plus fatiguées, représentaient 85 % des conflits ressentis.', '<ul class="list">' + D.wellbeingHelp.conflicts.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' + UI.sources(['basner2014']));
    body += H.section('Pourquoi suivre le moral et le sommeil', null, '<div class="prose"><p>En mission, les astronautes dorment en moyenne environ six heures par nuit, et trois quarts des équipages de l’ISS ont utilisé un médicament pour dormir. Pendant la simulation Mars-520, l’activité a baissé et le sommeil a changé au fil des mois, avec de grandes différences d’une personne à l’autre. D’où un suivi court, personnel et privé.</p></div>' + UI.sources(['barger2014', 'basner2013']));
    return H.page({ title: 'Bien-être', calm: true, state: H.state(st[0], st[1], st[2]), body });
  };

  function psyRequest(A) {
    const s = A.s, me = s.me;
    const sent = s.queue.find(q => q.kind === 'psy' && q.a === me && s.now - q.t < 7 * DAY);
    if (sent) return '<div class="callout calm" style="margin-top:14px"><p>Votre demande d’entretien avec le psychologue au sol est partie ' + esc(H.ago(A, sent.t)) + '. ' + (sent.arrAt && sent.arrAt <= s.now ? 'Elle est arrivée.' : 'Elle est en route.') + '</p></div>';
    if (A.ui.psy) return '<div class="panel" style="margin-top:14px"><h3>Demander un entretien au psychologue au sol</h3><p class="muted">AURA enverra seulement cette phrase : « ' + esc(S.name(me)) + ' souhaite un entretien privé avec le psychologue au sol. » Rien d’autre ne part sans votre accord.</p><div class="btn-row" style="margin-top:12px"><button class="btn primary" data-act="psy-send">Envoyer la demande</button><button class="btn quiet" data-act="psy-cancel">Pas maintenant</button></div></div>';
    return '<div class="panel soft" style="margin-top:14px"><h3>En parler</h3><p class="muted">Vous pouvez en parler à la médecin de bord, pendant votre entretien de la semaine, ou demander un entretien privé avec le psychologue au sol.</p><div class="btn-row" style="margin-top:12px"><a class="btn" href="#/conference">Mon entretien de la semaine</a><button class="btn quiet" data-act="psy-open">Prévenir le psychologue au sol</button></div></div>';
  }

  V.breathing = function (A) {
    const cfg = D.wellbeingHelp.breathing;
    const mins = A.flow.breathMin || cfg.minutes;
    const body = '<div class="breath" id="breath" data-in="' + cfg.inhale + '" data-out="' + cfg.exhale + '" data-min="' + mins + '">' +
      '<div class="breath-stage"><div class="breath-orb" id="breath-orb"></div></div>' +
      '<p class="breath-word" id="breath-word" aria-live="polite">Prêt quand vous l’êtes</p><p class="breath-time" id="breath-time">' + mins + ' minutes</p></div>' +
      '<div class="btn-row" style="justify-content:center;margin-top:8px"><button class="btn primary lg" data-act="breath-start" id="breath-btn">Commencer</button></div>' +
      '<div class="btn-row" style="justify-content:center;margin-top:14px"><div class="seg" role="group" aria-label="Durée">' + [3, 5, 10].map(m => '<button data-act="breath-min" data-min="' + m + '" aria-pressed="' + (m === mins) + '">' + m + ' min</button>').join('') + '</div></div>' +
      '<p class="note" style="text-align:center;margin-top:18px">Cinq secondes pour inspirer, cinq pour expirer, environ six respirations par minute. Si la tête vous tourne, reprenez une respiration normale.</p>' +
      '<div class="btn-row" style="justify-content:center;margin-top:10px"><a class="btn quiet" href="#/bien-etre/paysage">Faire la pause devant un paysage</a><a class="btn quiet" href="#/bien-etre">Revenir</a></div>';
    return H.page({ title: 'Une pause respiration', calm: true, lead: 'Suivez le cercle : il grandit quand vous inspirez, il se pose quand vous expirez.', body });
  };

  V.landscape = function (A) {
    const mood = A.flow.scene || 'aube';
    const body = '<div class="scene" id="scene" data-mood="' + mood + '"><canvas id="scene-canvas" aria-label="Paysage de montagnes et de lac, à regarder tout autour de soi" role="img"></canvas>' +
      '<div class="scene-guide" id="scene-guide"' + (A.flow.sceneBreath ? '' : ' hidden') + '><div class="breath-orb small" id="scene-orb"></div><p class="breath-word" id="scene-word"></p></div>' +
      '<div class="scene-bar"><div class="seg" role="group" aria-label="Moment de la journée">' + [['aube', 'Aube'], ['jour', 'Jour'], ['soir', 'Crépuscule'], ['nuit', 'Nuit']].map(m => '<button data-act="scene-mood" data-mood="' + m[0] + '" aria-pressed="' + (m[0] === mood) + '">' + m[1] + '</button>').join('') + '</div>' +
      '<div class="btn-row"><button class="btn sm" data-act="scene-breath" aria-pressed="' + !!A.flow.sceneBreath + '">' + (A.flow.sceneBreath ? 'Masquer le guide' : 'Respirer avec le guide') + '</button><button class="btn sm" data-act="scene-full">Plein écran</button></div></div></div>' +
      '<p class="note" style="margin-top:12px">Faites glisser pour regarder tout autour de vous. Le paysage est dessiné à bord, sans connexion ; il change doucement avec le temps.</p>' +
      '<div class="btn-row" style="margin-top:6px"><a class="btn quiet" href="#/bien-etre">Revenir au bien-être</a></div>';
    return H.page({ title: 'Un paysage de la Terre', lead: 'Quelques minutes pour regarder loin, comme on le ferait dehors.', body });
  };

  V.reaction = function (A) {
    const s = A.s, a = s.me;
    const cfg = D.wellbeingHelp.reaction;
    const secs = A.flow.rtSecs || cfg.seconds;
    const last = A.flow.rtResult;
    let body = '<div class="rt" id="rt" tabindex="0" role="button" aria-label="Zone du test de réaction : touchez ou appuyez sur Espace" data-secs="' + secs + '" data-isimin="' + cfg.isiMin + '" data-isimax="' + cfg.isiMax + '">' +
      '<div class="rt-orb" id="rt-orb"></div><p class="rt-msg" id="rt-msg">Touchez ici pour commencer</p><p class="rt-ms" id="rt-ms" aria-live="polite"></p><p class="rt-left" id="rt-left"></p></div>';
    body += '<div class="btn-row" style="justify-content:center;margin-top:14px"><div class="seg" role="group" aria-label="Durée du test">' + [[180, '3 minutes (standard)'], [60, '1 minute (démonstration)']].map(x => '<button data-act="rt-secs" data-secs="' + x[0] + '" aria-pressed="' + (x[0] === secs) + '">' + x[1] + '</button>').join('') + '</div></div>';
    if (last) {
      const tr = S.reactionTrend(s, a);
      body += '<div class="panel" style="margin-top:22px" id="rt-result"><h3>Votre résultat</h3><div class="stats" style="margin-top:10px">' +
        '<div class="stat"><div class="s-label">Temps de réaction médian</div><div class="s-value">' + esc(f.num(last.median, 0)) + '<small>ms</small></div></div>' +
        '<div class="stat"><div class="s-label">Réponses lentes</div><div class="s-value">' + last.lapses + '</div><div class="s-sub">au-delà de ' + cfg.lapse + ' ms</div></div>' +
        '<div class="stat"><div class="s-label">Réponses trop tôt</div><div class="s-value">' + last.falseStarts + '</div></div>' +
        '<div class="stat"><div class="s-label">Signaux</div><div class="s-value">' + last.n + '</div></div></div>' +
        '<p style="margin-top:14px">' + (tr.base ? (last.median > tr.base * 1.08 ? 'C’est plus lent que votre habitude (' + esc(f.num(tr.base, 0)) + ' ms). Cela arrive avec la fatigue : rien d’alarmant en soi, mais un bon sommeil aide.' : 'C’est dans vos habitudes (' + esc(f.num(tr.base, 0)) + ' ms en moyenne).') : 'C’est votre premier test : il servira de point de comparaison.') + '</p></div>';
    }
    body += H.section('Vos tests', null, rtChart(A, a, 'calm'));
    body += '<p class="note" style="margin-top:16px">Ce test repère surtout la fatigue et le manque de sommeil ; il ne mesure pas vos compétences. C’est la version courte du test de vigilance utilisé sur l’ISS (Reaction Self Test) : un signal toutes les 1 à 4 secondes, réponse lente au-delà de 355 ms. La version d’une minute sert à la démonstration.</p>' + UI.sources(['basner2011']);
    return H.page({ title: 'Test de réaction', calm: true, lead: 'Quand le cercle s’allume, touchez la zone ou appuyez sur la barre d’espace, le plus vite possible.', body });
  };

  /* ------------------------------------------------------------------ */
  /* Entretien de la semaine (vue équipage)                               */
  /* ------------------------------------------------------------------ */
  function modeNow(A) {
    const day = A.s.now / DAY;
    const M = D.interview.modes;
    if (E.isBlackout(D.mission, day)) return M[3];
    const L = E.lightMinutes(D.mission, day);
    return L <= M[0].maxDelay ? M[0] : L <= M[1].maxDelay ? M[1] : M[2];
  }
  V.modeNow = modeNow;
  function modesTable(A) {
    const cur = modeNow(A);
    return '<div class="table-wrap"><table class="table stack"><thead><tr><th>Situation de communication</th><th>Le médecin au sol</th><th>L’assistant d’AURA</th></tr></thead><tbody>' +
      D.interview.modes.map(m => '<tr' + (m.id === cur.id ? ' style="background:var(--aura-soft)"' : '') + '><td data-label="Situation"><b>' + esc(m.label) + '</b>' + (m.id === cur.id ? ' ' + UI.pill('normal', 'en ce moment') : '') + '</td><td data-label="Médecin au sol">' + esc(m.doctor) + '</td><td data-label="Assistant">' + esc(m.ai) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  V.modesTable = modesTable;

  function factsList(A, a) {
    const fx = S.weekFacts(A.s, a);
    const items = [];
    if (fx.sleep7 !== null) items.push('Sommeil : ' + f.hours(fx.sleep7) + ' par nuit en moyenne' + (fx.sleepDrop >= 0.5 ? ', contre ' + f.hours(fx.sleepBase) + ' d’habitude' : ''));
    if (fx.mood7 !== null) items.push('Moral : ' + (fx.moodDrop >= 0.8 ? 'plus bas que les semaines précédentes' : fx.mood7 >= 3.8 ? 'plutôt bon' : 'correct'));
    if (fx.partialMed) items.push(fx.partialMed + ' : effet partiel ou nul plusieurs fois');
    if (fx.alerts) items.push(fx.alerts + ' alerte' + (fx.alerts > 1 ? 's' : '') + ' cette semaine');
    if (fx.symptoms.length) items.push('Symptômes signalés : ' + fx.symptoms.join(', ').toLowerCase());
    if (fx.reaction) items.push('Temps de réaction : ' + f.num(fx.reaction.median, 0) + NB + 'ms sur les deux derniers tests' + (fx.reaction.median > fx.reaction.prev * 1.08 ? ', plus lent que d’habitude' : ''));
    return items;
  }
  V.factsList = factsList;

  V.conferenceCrew = function (A) {
    const s = A.s, me = s.me, name = S.name(me);
    const itv = S.currentInterview(s, me);
    const mode = modeNow(A);
    const aiOn = A.aiReady();
    // Pas encore commencé
    if (!itv) {
      const facts = factsList(A, me);
      let body = '<section class="section" style="margin-top:24px"><div class="panel soft"><h3>Ce que l’assistant sait déjà de votre semaine</h3>' + (facts.length ? '<ul class="facts">' + facts.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<p class="muted">Pas encore de données cette semaine.</p>') + '<p class="note" style="margin-top:10px">Ces informations viennent de vos points du soir, de vos mesures et de la pharmacie. Vous pouvez les corriger pendant l’entretien.</p></div></section>';
      body += '<section class="section"><div class="toggles">' +
        (A.speech.canSpeak ? '<label class="toggle"><input type="checkbox" data-change="voice-read"' + (A.set.voice.read ? ' checked' : '') + '><span>Lire les questions à voix haute</span></label>' : '') +
        '</div><p class="small muted" style="margin:12px 0 16px">' + (aiOn ? 'L’entretien est mené par l’IA (' + esc(A.aiLabel()) + '), à partir de la liste de questions habituelle et de votre semaine.' : 'Sans IA connectée, AURA pose les questions habituelles, préparées à partir de votre semaine (<a href="#/reglages">connecter une IA</a>).') + (A.speech.canListen ? ' Vous pouvez répondre à la voix.' : '') + '</p>' +
        '<button class="btn primary lg" data-act="itv-start">Commencer l’entretien</button></section>';
      body += H.section('Comment se passe la conférence vers Mars', 'Sur l’ISS, chaque astronaute a un entretien médical privé de 15 minutes chaque semaine. Vers Mars, le délai change le rôle de chacun.', modesTable(A) + UI.sources(['nasaPmc']));
      return H.page({ title: 'Votre entretien de la semaine', calm: true, state: H.state('normal', 'Une conversation d’environ cinq minutes, à la voix ou par écrit.', 'Vous relisez le résumé et vous choisissez ce qui part vers le médecin au sol. ' + esc(mode.label) + ' : l’assistant ' + esc(lower(mode.ai)) + '.'), body });
    }
    // Interrompu par un signe d’alarme
    if (itv.status === 'interrompu') {
      const body = '<div class="callout urgent" style="margin-top:20px"><p><b>L’entretien s’est arrêté : un signe d’alarme a été repéré (' + esc(itv.flags.join(', ').toLowerCase()) + ').</b></p><p>La médecin de bord est prévenue et le message prioritaire est parti vers la Terre. Suivez les premiers gestes.</p><div class="btn-row" style="margin-top:10px"><a class="btn danger" href="#/urgence">Ouvrir la procédure</a></div></div>';
      return H.page({ title: 'Entretien de la semaine', calm: true, body });
    }
    // En cours
    if (itv.status === 'en cours') {
      const total = itv.plan.length + 1;
      const pos = Math.min(total, itv.step + 1);
      let chat = '<div class="chat" id="itv-chat">';
      itv.answers.forEach(an => {
        chat += '<div class="msg ai"><div class="who">' + UI.orb('normal', { sm: true, live: false }) + '<span>' + esc(an.label) + '</span></div><div class="body"><p>' + esc(an.q) + '</p></div></div>';
        chat += '<div class="msg user">' + (an.skipped ? '<span class="muted">Question passée</span>' : esc(an.text)) + '</div>';
      });
      const cur = itv.current;
      const busy = A.busy.itv;
      chat += '<div class="msg ai" id="itv-current"><div class="who">' + UI.orb('normal', { sm: true, live: !!busy }) + '<span>' + esc(cur && cur.follow ? 'Une précision' : (itv.plan[itv.step] ? itv.plan[itv.step].label : 'Pour finir')) + (itv.ai ? ', avec ' + esc(itv.ai) : '') + '</span></div><div class="body" id="itv-q" aria-live="polite">' + (cur && cur.q ? '<p>' + esc(cur.q) + '</p>' : '<span class="typing" aria-label="Question en préparation"><i></i><i></i><i></i></span>') + '</div>' +
        (cur && cur.q && A.speech.canSpeak ? '<div class="btn-row" style="margin-top:6px"><button class="btn sm quiet" data-act="speak-q">Écouter la question</button></div>' : '') + '</div>';
      chat += '</div>';
      let form = '<form data-form="itv-answer" class="composer" style="position:static;background:none;padding-top:20px"><div class="field" style="margin-bottom:10px"><label for="itv-a" class="visually-hidden">Votre réponse</label><textarea id="itv-a" name="text" placeholder="' + (A.speech.canListen ? 'Répondez ici, ou appuyez sur le micro' : 'Répondez ici') + '"' + (busy ? ' disabled' : '') + '>' + esc(A.flow.itvDraft || '') + '</textarea></div>' +
        '<div class="btn-row">' + (A.speech.canListen ? '<button type="button" class="btn" data-act="listen" data-target="itv-a" aria-pressed="' + (A.speech.listening === 'itv-a') + '">' + (A.speech.listening === 'itv-a' ? 'Arrêter la dictée' : 'Répondre à la voix') + '</button>' : '') +
        '<button class="btn primary" type="submit"' + (busy || !(cur && cur.q) ? ' disabled' : '') + '>Envoyer la réponse</button><button type="button" class="btn quiet" data-act="itv-skip"' + (busy ? ' disabled' : '') + '>Passer cette question</button><button type="button" class="btn quiet" data-act="itv-finish"' + (busy ? ' disabled' : '') + '>Terminer maintenant</button></div>' +
        '<p class="note" style="margin-top:12px">Vous pouvez passer une question. Rien ne part vers la Terre sans votre accord.' + (A.speech.canListen ? ' La dictée du navigateur peut se tromper : relisez avant d’envoyer.' : '') + '</p></form>';
      if (A.flow.itvError) form = '<div class="callout attention" style="margin-top:14px"><p>' + esc(A.flow.itvError) + '</p><div class="btn-row" style="margin-top:8px"><button class="btn sm" data-act="itv-retry">Réessayer</button><button class="btn sm quiet" data-act="itv-norules">Continuer sans IA</button></div></div>' + form;
      return H.page({ title: 'Entretien de la semaine', calm: true, lead: 'Question ' + pos + ' sur ' + total + ', à votre rythme.', body: chat + form });
    }
    // Terminé : relecture et accord
    if (itv.status === 'terminé') {
      const sum = itv.summary || { med: '', psy: '' };
      const busy = A.busy.itvSum;
      let body = '<form data-form="itv-send" style="margin-top:20px">';
      body += V.origin({ ai: itv.summaryAi || null });
      body += '<div class="panel"><h3>Partie médicale</h3><textarea name="med" class="ai-edit" id="itv-med" aria-label="Partie médicale du résumé"' + (busy ? ' disabled' : '') + '>' + esc(sum.med) + '</textarea>' +
        '<div class="toggles" style="margin-top:12px"><label class="toggle"><input type="checkbox" name="cmed" checked><span>Envoyer la partie médicale au médecin au sol</span></label></div></div>';
      body += '<div class="panel" style="margin-top:14px"><h3>Partie psychologique, confidentielle</h3>' + (sum.psy ? '<textarea name="psy" class="ai-edit" style="min-height:140px" aria-label="Partie psychologique du résumé"' + (busy ? ' disabled' : '') + '>' + esc(sum.psy) + '</textarea>' : '<p class="muted">Non abordée cette semaine.</p><input type="hidden" name="psy" value="">') +
        (sum.psy ? '<div class="toggles" style="margin-top:12px"><label class="toggle"><input type="checkbox" name="cpsy"><span>La partager aussi avec le médecin au sol</span></label></div><p class="note" style="margin-top:8px">Sans votre accord, elle reste à bord et vous seul la voyez.</p>' : '') + '</div>';
      body += '<div class="btn-row" style="margin-top:18px"><button class="btn primary lg" type="submit"' + (busy ? ' disabled' : '') + '>Envoyer</button><button class="btn quiet" type="button" data-act="itv-keep">Garder à bord</button></div></form>';
      return H.page({ title: 'Votre résumé', calm: true, state: H.state('normal', 'Relisez le résumé, modifiez-le si besoin.', 'Vous décidez de ce qui part vers le médecin au sol.'), body });
    }
    // Envoyé ou gardé à bord
    const sentItem = itv.sentId ? s.queue.find(q => q.id === itv.sentId) : null;
    const reply = sentItem ? s.inbox.find(m => m.ref === sentItem.id && m.status === 'reçu') : null;
    let txt, sub;
    if (itv.status === 'envoyé') {
      txt = sentItem && sentItem.status === 'reçu' ? 'Votre résumé est arrivé au sol.' : 'Votre résumé est en route vers la Terre.';
      sub = 'Parti ' + esc(H.ago(A, itv.tSent)) + (sentItem && sentItem.arrAt ? ', arrivée ' + (sentItem.arrAt <= s.now ? 'à ' : 'prévue à ') + esc(f.clock(sentItem.arrAt % DAY)) : ', il partira au retour de la liaison') + '. ' + (itv.consent.psy ? 'Partie psychologique comprise, avec votre accord.' : 'La partie psychologique reste à bord.');
    } else { txt = 'Votre résumé reste à bord.'; sub = 'Rien n’est parti vers la Terre. Vous pouvez en parler à la médecin de bord quand vous voulez.'; }
    let body = '';
    if (reply) body += '<section class="section" style="margin-top:24px"><div class="panel"><div class="row"><b>' + esc(reply.from) + '</b><span class="row-meta">reçu ' + esc(H.ago(A, reply.arrAt)) + '</span></div><p style="margin-top:8px">' + esc(reply.text) + '</p></div></section>';
    else if (itv.status === 'envoyé') body += '<p class="note" style="margin-top:20px">La réponse du médecin au sol arrivera ici et sur votre page Aujourd’hui.</p>';
    body += '<details class="disclose"><summary>Revoir votre résumé</summary><div class="prose"><p style="white-space:pre-wrap">' + esc(itv.summary ? itv.summary.med : '') + '</p>' + (itv.summary && itv.summary.psy ? '<p class="muted" style="white-space:pre-wrap">' + esc(itv.summary.psy) + '</p>' : '') + '</div></details>';
    body += '<div class="btn-row" style="margin-top:20px"><a class="btn" href="#/">Revenir à Aujourd’hui</a></div>';
    return H.page({ title: 'Entretien de la semaine', calm: true, state: H.state('normal', txt, sub), body });
  };
})(typeof self !== 'undefined' ? self : this);
