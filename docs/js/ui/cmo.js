/* AURA : espace du médecin de bord (responsable médical, CMO).
   Il voit les données médicales de tous (R-CONF-01), décide des traitements
   proposés, prépare la pharmacie (Monte Carlo), tient les fiches et les vidéos,
   et règle la mission. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, E = root.AURA_ENGINE, DATA = root.AURA_DATA, PH = root.AURA_PHARMA, TR = root.AURA_TRIAGE, VOCAB = root.AURA_VOCAB, LIB = root.AURA_FICHES_LIB;
  const $ = A.$, esc = A.esc, icon = A.icon;

  const NAV = [
    ['', 'users', 'Équipage'], ['valider', 'stetho', 'À valider'], ['pharmacie', 'pill', 'Pharmacie'],
    ['fiches', 'book', 'Fiches'], ['videos', 'video', 'Vidéos'], ['sol', 'satellite', 'Liaison Terre'], ['reglages', 'gear', 'Réglages']
  ];
  const tagLevel = l => l === 'urgence' ? 'bad' : l === 'vigilance' ? 'warn' : l === 'info' ? 'sophie' : 'ok';
  const pct = p => A.pct(p, p < 0.1 ? 1 : 0);

  A.views.cmo = {
    wide: true,
    render(node, params) {
      const sec = (params.arg || [])[0] || '';
      const n = S.pendingValidations().length;
      const rail = '<nav class="rail" aria-label="Espace médecin de bord">' + NAV.map(([k, ic, l]) => '<button data-nav="' + k + '"' + (k === sec || (k === '' && sec === 'membre') ? ' aria-current="page"' : '') + '>' + icon(ic) + '<span>' + l + '</span>' + (k === 'valider' && n ? '<span class="n">' + n + '</span>' : '') + '</button>').join('') +
        '<div class="foot"><button data-me>' + icon('home') + '<span>Mon espace</span></button></div></nav>';
      const body = (SECTIONS[sec] || SECTIONS['']).render(params);
      node.parentElement.classList.add('cmo-host');
      node.style.padding = '0';
      node.style.maxWidth = 'none';
      return '<div class="cmo">' + rail + '<div class="cmo-main enter">' + body + '</div></div>';
    },
    mount(node, params) {
      const sec = (params.arg || [])[0] || '';
      node.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => A.go('cmo' + (b.dataset.nav ? '/' + b.dataset.nav : '')));
      node.querySelector('[data-me]').onclick = () => A.go('accueil');
      const S2 = SECTIONS[sec] || SECTIONS[''];
      if (S2.mount) S2.mount(node, params);
    }
  };
  function head(title, sub, right) {
    return '<div class="screen-head" style="margin-top:14px"><div class="titles"><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>';
  }

  /* ---------------- calculs utiles ---------------- */
  function vitalsOf(id) {
    const last = k => S.lastMeasure(id, k);
    const m = S.member(id);
    const shift = m.filters.temp.x - m.filters.temp.preMu;
    const nw = TR.news2({ temp: last('temp') ? last('temp').v : null, hr: last('hr') ? last('hr').v : null, spo2: last('spo2') ? last('spo2').v : null }, { tempShift: shift });
    const sl = m.measures.sleep.slice(-7);
    const ex = m.exercise.filter(x => x.d > S.day() - 7).reduce((a, x) => a + x.min, 0) / 7;
    const bad = ['temp', 'hr', 'spo2'].some(k => last(k) && last(k).lvl !== 'normal' && last(k).d >= S.day() - 1);
    return { last, nw, sleep: sl.reduce((a, x) => a + x.v, 0) / Math.max(1, sl.length), ex, bad, shift };
  }

  /* ================================================================ */
  const SECTIONS = {};

  /* ---------------- Équipage ---------------- */
  SECTIONS[''] = {
    render() {
      const alerts = S.state.alerts.slice(0, 6);
      const tiles = S.crewIds().map(id => {
        const p = S.profile(id), m = S.member(id), v = vitalsOf(id);
        const conf = m.conferences[m.conferences.length - 1];
        const wins = Object.values(m.sims).reduce((a, s) => a + (s.wins || 0), 0);
        const pend = S.pendingValidations().filter(x => x.who === id).length;
        return '<button class="crew-tile" data-member="' + id + '"><div class="hd"><span class="avatar lg" style="--h:' + m.hue + '">' + A.initials(p.name) + '</span><div class="nm"><b>' + esc(p.name) + '</b><div class="muted small">' + esc(p.role) + '</div></div>' +
          (pend ? '<span class="tag warn">' + pend + ' à valider</span>' : v.bad ? '<span class="tag warn">À regarder</span>' : '<span class="tag ok">Stable</span>') + '</div>' +
          '<div class="nums">' +
            '<div><small>Température</small><b>' + (v.last('temp') ? A.num(v.last('temp').v, 1) : '·') + '</b></div>' +
            '<div><small>Pouls</small><b>' + (v.last('hr') ? v.last('hr').v : '·') + '</b></div>' +
            '<div><small>Sommeil (7 j)</small><b>' + A.num(v.sleep, 1) + ' h</b></div>' +
            '<div><small>Score d\'alerte</small><b>' + v.nw.total + (v.nw.partial ? '<span class="faint small"> partiel</span>' : '') + '</b></div>' +
          '</div><p class="muted small" style="margin-top:12px">Sport ' + Math.round(v.ex) + ' min par jour · ' + A.plural(wins, 'simulation réussie', 'simulations réussies') + ' · conférence ' + (conf ? A.dayLabel(conf.d, S.day()) : 'à faire') + '</p></button>';
      }).join('');
      return head('Équipage', 'Jour ' + S.day() + ' · CO₂ de la cabine ' + A.num(S.state.settings.pco2, 1) + ' mmHg' + (S.state.settings.pco2 > 3 ? ' <span class="tag warn">au-dessus de 3</span>' : '')) +
        '<div class="crew-grid">' + tiles + '</div>' +
        '<div class="panel" style="margin-top:22px"><div class="panel-title"><h2>' + icon('alert') + ' Dernières alertes</h2>' + (alerts.length ? '<button class="btn small ghost" data-readall>Tout marquer comme lu</button>' : '') + '</div>' +
        (alerts.length ? '<div>' + alerts.map(a => '<div class="alert-row"><span class="tag ' + tagLevel(a.niveau) + '">' + esc(a.niveau) + '</span><span><b>' + esc(a.titre) + '</b> <span class="muted">' + esc(a.texte || '') + '</span></span><span class="faint small" style="white-space:nowrap">' + A.dayLabel(a.d, S.day()) + ' ' + A.hm(a.min || 0) + '</span></div>').join('') + '</div>' : '<p class="muted">Aucune alerte. Tout est calme.</p>') + '</div>';
    },
    mount(node) {
      node.querySelectorAll('[data-member]').forEach(b => b.onclick = () => A.go('cmo/membre/' + b.dataset.member));
      const r = node.querySelector('[data-readall]');
      if (r) r.onclick = () => { S.state.alerts.forEach(a => { a.lu = true; }); S.save(); A.render(); };
    }
  };

  /* ---------------- Fiche d'un membre ---------------- */
  function lineChart(arr, color, ref, unit, d) {
    if (arr.length < 2) return '';
    const W = 640, H = 170;
    const vals = arr.map(x => x.v);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (ref) { lo = Math.min(lo, ref.lo); hi = Math.max(hi, ref.hi); }
    const pad = (hi - lo) * 0.18 || 1; lo -= pad; hi += pad;
    const X = i => 40 + (i / (vals.length - 1)) * (W - 50), Y = v => H - 22 - ((v - lo) / (hi - lo)) * (H - 36);
    const p = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const band = ref ? '<rect x="40" y="' + Y(ref.hi).toFixed(1) + '" width="' + (W - 50) + '" height="' + (Y(ref.lo) - Y(ref.hi)).toFixed(1) + '" fill="' + color + '" opacity=".1" rx="5"/>' : '';
    const ticks = [lo + pad, hi - pad].map(v => '<text x="34" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end" fill="#8C95C2" font-size="11">' + A.num(v, d) + '</text>').join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">' + band + ticks + '<path d="' + p + '" fill="none" stroke="' + color + '" stroke-width="2.2"/>' + arr.map((x, i) => x.lvl && x.lvl !== 'normal' ? '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(x.v).toFixed(1) + '" r="4" fill="#FFB65C"/>' : '').join('') + '<text x="40" y="' + (H - 4) + '" fill="#8C95C2" font-size="11">J' + arr[0].d + '</text><text x="' + (W - 10) + '" y="' + (H - 4) + '" fill="#8C95C2" font-size="11" text-anchor="end">J' + arr[arr.length - 1].d + ' (' + unit + ')</text></svg>';
  }
  SECTIONS.membre = {
    render(params) {
      const id = (params.arg || [])[1];
      const p = S.profile(id), m = S.member(id);
      if (!p) return head('Membre introuvable');
      const v = vitalsOf(id);
      const rad = E.radiationProjection ? null : null;
      const dose = S.day() * 1.8;
      const tr = m.triages.slice().reverse().slice(0, 5);
      const confs = m.conferences.slice().reverse().slice(0, 4);
      const meds = S.state.medLog.filter(x => x.who === id).slice(-6).reverse();
      const ex14 = Array.from({ length: 14 }, (_, i) => { const d = S.day() - 13 + i; return m.exercise.filter(x => x.d === d).reduce((a, x) => a + x.min, 0); });
      const bars = '<svg viewBox="0 0 420 110" style="width:100%;height:auto">' + ex14.map((mm, i) => '<rect x="' + (i * 30 + 4) + '" y="' + (96 - Math.min(90, mm) ) + '" width="22" height="' + Math.min(90, mm) + '" rx="5" fill="' + (mm >= 72 ? '#FFC870' : '#4A5BA8') + '"/>').join('') + '<line x1="0" x2="420" y1="' + (96 - 90 * 0.8) + '" y2="' + (96 - 90 * 0.8) + '" stroke="#FFC870" stroke-dasharray="4 4" opacity=".5"/></svg>';
      return head(p.name, esc(p.role) + ' · ' + (m.sexe === 'F' ? 'femme' : 'homme') + ' · niveau ' + A.gamify.level(m.xp).n, '<button class="btn" data-back>' + icon('back') + 'Équipage</button>') +
        '<div class="grid3">' +
          '<div class="panel tight"><span class="muted small">Score d\'alerte (NEWS2 adapté)</span><h2 style="margin-top:6px">' + v.nw.total + ' <span class="tag ' + (v.nw.niveau === 'bas' ? 'ok' : v.nw.niveau === 'surveillance' ? 'sophie' : 'bad') + '">' + esc(v.nw.niveau) + '</span></h2><p class="faint small">' + (v.nw.partial ? 'Partiel : température, pouls et saturation seulement. Il peut faire monter l\'alerte, jamais rassurer.' : 'Complet.') + ' Température corrigée de ' + A.num(v.shift, 1) + ' °C.</p></div>' +
          '<div class="panel tight"><span class="muted small">Dose de radiations cumulée</span><h2 style="margin-top:6px">' + A.num(dose, 0) + ' mSv</h2><p class="faint small">Environ 1,8 mSv par jour en trajet (Zeitlin, 2013). Limite de carrière : 600 mSv.</p></div>' +
          '<div class="panel tight"><span class="muted small">Sommeil moyen sur 7 jours</span><h2 style="margin-top:6px">' + A.num(v.sleep, 1) + ' h</h2><p class="faint small">' + (v.sleep < 5.8 ? 'En baisse : à aborder en conférence.' : 'Dans les habitudes de la mission.') + '</p></div>' +
        '</div>' +
        '<div class="grid2" style="margin-top:20px">' +
          '<div class="panel"><h3>Température et plage personnelle</h3>' + lineChart(m.measures.temp.slice(-30), '#FFB38A', S.reference(id, 'temp'), '°C', 1) + '</div>' +
          '<div class="panel"><h3>Pouls au repos</h3>' + lineChart(m.measures.hr.slice(-30), '#FF8FA3', S.reference(id, 'hr'), '/min', 0) + '</div>' +
        '</div>' +
        '<div class="grid2" style="margin-top:20px">' +
          '<div class="panel"><h3>Orientations récentes</h3>' + (tr.length ? '<div class="stack" style="margin-top:12px">' + tr.map(t => '<div><div class="spread"><b>' + esc(t.ficheNom || 'Non reconnu') + '</b><span class="faint small">' + A.dayLabel(t.d, S.day()) + '</span></div><p class="muted small">« ' + esc(t.texte || '') + ' »</p>' + (t.top ? '<div class="bars" style="margin-top:8px">' + t.top.map(x => '<div class="b"><span>' + esc(x.nom) + '</span><span class="t"><i style="width:' + (x.p * 100).toFixed(0) + '%"></i></span><span class="p">' + pct(x.p) + '</span></div>').join('') + '</div>' : '') + '</div>').join('<hr class="hair">') + '</div>' : '<p class="muted">Aucune orientation récente.</p>') + '</div>' +
          '<div class="panel"><h3>Conférences</h3>' + (confs.length ? '<div class="stack" style="margin-top:12px">' + confs.map(c => '<div><div class="spread"><b>' + A.dayLabel(c.d, S.day()) + '</b><span class="tag ' + (c.partage ? 'sophie' : '') + '">' + (c.partage ? 'moral partagé' : 'moral privé') + '</span></div><p class="muted small">' + esc(c.resume || '') + '</p></div>').join('') + '</div>' : '<p class="muted">Pas encore de conférence.</p>') +
          '<h3 style="margin-top:20px">Sport sur 14 jours</h3>' + bars +
          (meds.length ? '<h3 style="margin-top:20px">Prises récentes</h3><div class="stack">' + meds.map(x => '<div class="spread small"><span>' + esc((PH.meds.find(mm => mm.id === x.med) || {}).name || x.med) + '</span><span class="faint">' + A.dayLabel(x.d, S.day()) + '</span></div>').join('') + '</div>' : '') + '</div>' +
        '</div>';
    },
    mount(node) { const b = node.querySelector('[data-back]'); if (b) b.onclick = () => A.go('cmo'); }
  };

  /* ---------------- À valider ---------------- */
  SECTIONS.valider = {
    render() {
      const pend = S.pendingValidations();
      const done = S.state.validations.filter(v => v.statut !== 'attente').slice(0, 8);
      const card = v => {
        const p = S.profile(v.who), m = S.member(v.who);
        const f = A.kb.get(v.fiche);
        const plan = f ? A.kb.plan(f, v.who) : null;
        const opts = plan ? plan.options.filter(o => o.ressources.some(r => !r.materiel)) : [];
        return '<div class="panel valid-card" data-v="' + v.id + '"><div class="spread"><div class="who"><span class="avatar" style="--h:' + m.hue + '">' + A.initials(p.name) + '</span><div><b>' + esc(p.name) + '</b><div class="faint small">' + A.dayLabel(v.d, S.day()) + ' à ' + A.hm(v.min) + '</div></div></div>' + (v.urgent ? '<span class="tag bad">urgent</span>' : '<span class="tag warn">à décider</span>') + '</div>' +
          '<p class="muted">« ' + esc(v.texte || '') + ' »</p>' +
          '<div class="bars"><div class="b"><span><b>' + esc(v.ficheNom) + '</b></span><span class="t"><i style="width:' + (v.p * 100).toFixed(0) + '%"></i></span><span class="p">' + pct(v.p) + '</span></div>' + (v.autres || []).map(o => '<div class="b"><span>' + esc(o.nom) + '</span><span class="t"><i style="width:' + (o.p * 100).toFixed(0) + '%;opacity:.55"></i></span><span class="p">' + pct(o.p) + '</span></div>').join('') + '</div>' +
          '<p class="small"><span class="muted">Faits pour :</span> ' + esc((v.pour || []).map(c => (VOCAB.FACTS[c] || {}).label || c).join(', ') || 'aucun') + (v.contre && v.contre.length ? ' · <span class="muted">contre :</span> ' + esc(v.contre.map(c => (VOCAB.FACTS[c] || {}).label || c).join(', ')) : '') + '</p>' +
          (v.med ? '<div><b>Proposition : ' + esc(v.medNom) + '</b><div class="checks" style="margin-top:10px">' + (v.checks || []).map(c => '<div class="check"><span class="st ' + c.state + '">' + icon(c.state === 'ok' ? 'check' : c.state === 'no' ? 'close' : 'info') + '</span><span class="lab muted">' + esc(c.label) + '</span><span>' + esc(c.text) + '</span></div>').join('') + '</div></div>' : '<p><b>' + (v.allBlocked ? 'Tous les médicaments de la fiche sont bloqués : décision à bord, sol informé (R-TRT-02).' : 'Gestes de la fiche, sans médicament.') + '</b></p>') +
          (opts.length > 1 ? '<label class="field"><span>Autre option de la fiche</span><select data-alt>' + opts.flatMap(o => o.ressources.filter(r => !r.materiel)).filter((r, i, a) => a.findIndex(x => x.id === r.id) === i).map(r => '<option value="' + r.id + '"' + (r.id === v.med ? ' selected' : '') + (r.blocked ? ' disabled' : '') + '>' + esc(r.name) + (r.blocked ? ' (bloqué)' : '') + '</option>').join('') + '</select></label>' : '') +
          '<div class="row wrap"><button class="btn primary" data-ok>' + icon('check') + 'Valider</button><button class="btn" data-sol>' + icon('satellite') + 'Demander l\'avis du sol</button><button class="btn ghost" data-no>' + icon('close') + 'Refuser</button><button class="btn ghost" data-fiche="' + esc(v.fiche) + '">' + icon('book') + 'Fiche</button></div></div>';
      };
      return head('À valider', 'AURA propose, le responsable médical décide, le sol conseille quand il peut répondre.') +
        (pend.length ? '<div class="grid2">' + pend.map(card).join('') + '</div>' : '<div class="panel"><p class="muted">Rien n\'attend ta décision.</p></div>') +
        (done.length ? '<h2 style="margin:30px 0 14px">Décisions récentes</h2><div class="panel"><table class="table"><thead><tr><th>Quand</th><th>Qui</th><th>Orientation</th><th>Décision</th></tr></thead><tbody>' + done.map(v => '<tr><td>' + A.dayLabel(v.decideD || v.d, S.day()) + '</td><td>' + esc(A.first(S.profile(v.who).name)) + '</td><td>' + esc(v.ficheNom) + (v.medNom ? ' · ' + esc(v.medNom) : '') + '</td><td><span class="tag ' + (v.statut === 'validé' ? 'ok' : v.statut === 'avis du sol' ? 'sophie' : 'bad') + '">' + esc(v.statut) + '</span></td></tr>').join('') + '</tbody></table></div>' : '');
    },
    mount(node) {
      node.querySelectorAll('[data-v]').forEach(c => {
        const vid = c.dataset.v;
        const v = S.state.validations.find(x => x.id === vid);
        const alt = c.querySelector('[data-alt]');
        if (alt) alt.onchange = () => { v.med = alt.value; v.medNom = (PH.meds.find(m => m.id === alt.value) || {}).name; const f = A.kb.get(v.fiche); const pl = A.kb.plan(f, v.who); const r = pl.options.flatMap(o => o.ressources).find(x => x.id === alt.value); v.checks = r ? r.checks : v.checks; S.save(); A.render(); };
        c.querySelector('[data-ok]').onclick = () => { S.decide(vid, 'validé'); A.toast(icon('check') + 'Traitement validé, prise notée'); A.render(); };
        c.querySelector('[data-no]').onclick = () => { S.decide(vid, 'refusé'); A.render(); };
        c.querySelector('[data-sol]').onclick = () => solSheet(v);
        c.querySelector('[data-fiche]').onclick = () => A.go('cmo/fiche/' + v.fiche);
      });
    }
  };
  // Appel au sol en un seul message clair (R-COM-05)
  function solSheet(v) {
    const p = S.profile(v.who);
    const L = S.light();
    const msg = 'Qui : ' + p.name + ' (' + p.role + '). Depuis : jour ' + v.d + ' à ' + A.hm(v.min) + '. Signes : ' + ((v.pour || []).map(c => (VOCAB.FACTS[c] || {}).label || c).join(', ') || v.texte) + '. Mesures : ' + ['temp', 'hr', 'spo2'].map(k => { const l = S.lastMeasure(v.who, k); return l ? DATA.metrics[k].short + ' ' + A.num(l.v, DATA.metrics[k].decimals) : ''; }).filter(Boolean).join(', ') + '. Orientations : ' + [{ nom: v.ficheNom, p: v.p }].concat(v.autres || []).map(o => o.nom + ' ' + pct(o.p)).join(' ; ') + '. Traitement envisagé : ' + (v.medNom || 'gestes de la fiche') + '. Question : confirmez-vous ce traitement ? Réponse souhaitée avant : jour ' + (S.day() + (L > 10 ? 1 : 0)) + '.';
    const sh = A.sheet('Demander l\'avis du sol', '<p class="muted">Un seul message clair, comme le demande la règle R-COM-05. Réponse au plus tôt dans ' + A.dur(2 * L + 45) + '.</p><label class="field" style="margin-top:14px"><span>Message</span><textarea id="solMsg">' + esc(msg) + '</textarea></label><button class="btn primary block" id="solGo" style="margin-top:16px">' + icon('send') + 'Mettre en tête de la file</button>', { wide: true });
    sh.querySelector('#solGo').onclick = () => { S.queue({ prio: v.urgent ? 0 : 1, kind: 'avis', who: v.who, titre: 'Avis demandé : ' + v.ficheNom + ' (' + p.name + ')', texte: sh.querySelector('#solMsg').value }); S.decide(v.id, 'avis du sol'); A.closeSheet(); A.toast(icon('satellite') + 'Message placé dans la file vers la Terre'); A.render(); };
  }

  /* ---------------- Pharmacie et Monte Carlo ---------------- */
  let mcResult = null, mcScenario = 'median';
  function conditionsFromFiches() {
    const mission = S.state.settings.mission === 'iss' ? 'iss' : 'mars';
    const years = mission === 'iss' ? 0.5 : 3;
    const out = [];
    A.kb.fiches().forEach(f => {
      const ap = f.apriori[mission] || f.apriori.iss;
      if (!ap) return;
      const p = (ap.H + ap.F) / 2;
      if (!p) return;
      const opt = (f.options || []).find(o => o.ressources.some(r => { const m = PH.meds.find(x => x.id === r); return m && m.route !== 'materiel'; }));
      if (!opt) return;
      const medId = opt.ressources.find(r => { const m = PH.meds.find(x => x.id === r); return m && m.route !== 'materiel'; });
      const med = PH.meds.find(x => x.id === medId);
      const units = med.route === 'oral' ? [6, 20] : med.route === 'injectable' ? [1, 3] : med.route === 'oculaire' ? [2, 8] : [1, 2];
      const c = { id: f.id, label: f.nom, hoursLost: f.adaptation ? 8 : 4, meds: [{ med: medId, min: units[0], max: units[1] }] };
      if (f.adaptation) c.perTransition = p; else c.rate = -Math.log(1 - Math.min(0.999, p)) / years;
      out.push(c);
    });
    return out;
  }
  function runMC(scn) {
    const mult = scn === 'optimiste' ? 0.6 : scn === 'pessimiste' ? 1.6 : 1;
    return E.simulateMission({ seed: 7, runs: 1500, startDay: S.day(), endDay: DATA.mission.durationDays, crewSize: 4, conditions: conditionsFromFiches(), meds: PH.meds.filter(m => m.route !== 'materiel'), stock: S.state.stocks, multiplier: mult, transitions: DATA.mission.gravityTransitions, workHoursPerDay: 8 });
  }
  SECTIONS.pharmacie = {
    render() {
      const day = S.day(), end = DATA.mission.durationDays;
      const rows = PH.meds.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(m => {
        const st = S.state.stocks[m.id];
        const flags = E.medFlags(m, st, day, DATA.mission);
        return '<tr><td><b>' + esc(m.name) + '</b><div class="faint small">' + esc(m.use) + '</div></td><td class="num">' + A.num(st) + '</td><td class="num faint">' + m.minStock + '</td><td>' + (m.expiryDay >= 99999 ? '<span class="faint">matériel</span>' : 'jour ' + m.expiryDay) + '</td><td>' + flags.map(f => '<span class="tag ' + (f.level === 'urgence' ? 'bad' : f.level === 'vigilance' ? 'warn' : '') + '">' + esc(f.text) + '</span>').join(' ') + '</td></tr>';
      }).join('');
      const expiring = PH.meds.filter(m => m.expiryDay < end).length;
      return head('Pharmacie', 'Stocks illustratifs, d\'après la liste de l\'ISS (2023). ' + expiring + ' produits périment avant la fin de la mission (jour ' + end + ').') +
        '<div class="panel"><div class="panel-title"><h2>' + icon('chart') + ' Préparer la pharmacie par simulation</h2><div class="seg" id="mcSeg">' + [['optimiste', 'Optimiste'], ['median', 'Médian'], ['pessimiste', 'Pessimiste']].map(([k, l]) => '<button data-k="' + k + '" aria-pressed="' + (k === mcScenario) + '">' + l + '</button>').join('') + '</div></div>' +
        '<p class="muted">AURA rejoue la fin de la mission 1 500 fois, en tirant les épisodes de chaque maladie selon sa fréquence dans la liste IMM de la NASA (probabilités des fiches). Les quantités par épisode sont illustratives (R-PHA-01, R-PHA-02).</p>' +
        '<div class="row" style="margin-top:16px"><button class="btn primary" id="mcRun">' + icon('play') + 'Lancer la simulation</button><span class="muted small" id="mcInfo"></span></div><div id="mcOut" style="margin-top:20px"></div></div>' +
        '<div class="panel scroll-x" style="margin-top:22px"><table class="table"><thead><tr><th>Produit</th><th class="num">À bord</th><th class="num">Minimum</th><th>Péremption</th><th>À surveiller</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    },
    mount(node) {
      const out = $('#mcOut', node);
      const paint = res => {
        const meds = res.meds.filter(x => x.mean > 0.5).sort((a, b) => b.pStockout - a.pStockout || b.p90 / (b.stock || 1) - a.p90 / (a.stock || 1)).slice(0, 10);
        const name = id => (PH.meds.find(m => m.id === id) || {}).name || id;
        out.innerHTML = '<div class="grid2"><div><h3>Risque de rupture avant la fin</h3><div class="bars" style="margin-top:12px">' + meds.map(x => '<div class="b"><span>' + esc(name(x.med)) + '</span><span class="t"><i style="width:' + Math.max(2, x.pStockout * 100).toFixed(0) + '%;background:' + (x.pStockout > 0.1 ? 'linear-gradient(90deg,#F05252,#FF9A9A)' : x.pStockout > 0.01 ? 'linear-gradient(90deg,#FF9F45,#FFC870)' : 'linear-gradient(90deg,#1E9E8C,#7BE3C6)') + '"></i></span><span class="p">' + pct(x.pStockout) + '</span></div>').join('') + '</div></div>' +
          '<div><h3>Besoin d\'une fin de mission difficile (90 %)</h3><table class="table" style="margin-top:8px"><thead><tr><th>Produit</th><th class="num">Médian</th><th class="num">90 %</th><th class="num">À bord</th></tr></thead><tbody>' + meds.slice(0, 7).map(x => '<tr><td>' + esc(name(x.med)) + '</td><td class="num">' + Math.round(x.p50) + '</td><td class="num">' + Math.round(x.p90) + '</td><td class="num">' + x.stock + '</td></tr>').join('') + '</tbody></table>' +
          '<p class="muted small" style="margin-top:12px">Temps de travail perdu : ' + A.num(res.lost.mean, 0) + ' heures en moyenne, ' + A.num(res.lost.p90, 0) + ' heures dans 10 % des cas (heures par épisode illustratives, à fournir par la NASA).</p></div></div>';
      };
      node.querySelectorAll('#mcSeg button').forEach(b => b.onclick = () => { mcScenario = b.dataset.k; node.querySelectorAll('#mcSeg button').forEach(x => x.setAttribute('aria-pressed', x === b)); mcResult = null; out.innerHTML = ''; });
      $('#mcRun', node).onclick = () => {
        const info = $('#mcInfo', node);
        info.textContent = 'Simulation en cours…';
        out.innerHTML = '<div class="bars"><div class="b"><span>Missions simulées</span><span class="t"><i id="mcBar" style="width:0%;transition:width .9s ease"></i></span><span class="p">1 500</span></div></div>';
        requestAnimationFrame(() => { const b = $('#mcBar', node); if (b) b.style.width = '100%'; });
        setTimeout(() => { const t0 = performance.now(); mcResult = runMC(mcScenario); info.textContent = 'Terminé en ' + Math.round(performance.now() - t0) + ' ms, scénario ' + mcScenario + '.'; paint(mcResult); }, 950);
      };
      if (mcResult) paint(mcResult);
    }
  };

  /* ---------------- Fiches ---------------- */
  let ficheQuery = '', ficheFam = '';
  SECTIONS.fiches = {
    render() {
      const all = A.kb.fiches();
      const fams = Object.entries(LIB.FAMILLES);
      let list = all;
      if (ficheFam) list = list.filter(f => f.famille === ficheFam);
      if (ficheQuery.trim()) { const ix = LIB.buildIndex(list); const ids = LIB.search(ix, ficheQuery, 40).map(r => r.id); list = ids.map(id => list.find(f => f.id === id)); }
      const src = A.kb.source();
      const states = all.reduce((a, f) => { a[f.version.etat] = (a[f.version.etat] || 0) + 1; return a; }, {});
      return head('Fiches', all.length + ' fiches · ' + Object.entries(states).map(([k, n]) => n + ' ' + esc(k)).join(', ') + ' · source : ' + esc(src.titre || '') + (src.export ? ' (' + esc(src.export) + ')' : ''),
        '<div class="row wrap"><label class="btn" style="cursor:pointer">' + icon('upload') + 'Importer le document<input type="file" id="fImp" accept=".md,.markdown,.txt" hidden></label><button class="btn ghost" id="fRules">' + icon('book') + 'Règles</button></div>') +
        '<div class="row wrap" style="margin-bottom:16px"><form class="ask" id="fSearch" style="margin:0;width:min(420px,100%)"><input id="fQ" value="' + esc(ficheQuery) + '" placeholder="Chercher un signe, une maladie, un médicament" aria-label="Chercher dans les fiches"><button class="icon-btn" aria-label="Chercher">' + icon('search') + '</button></form>' +
        '<select class="input" id="fFam" style="width:auto;min-height:46px" aria-label="Famille"><option value="">Toutes les familles</option>' + fams.map(([k, l]) => '<option value="' + k + '"' + (k === ficheFam ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></div>' +
        '<div class="fiche-list">' + list.map(f => {
          const p = f.apriori[S.state.settings.mission === 'iss' ? 'iss' : 'mars'] || f.apriori.iss;
          return '<button class="fiche-row" data-f="' + f.id + '"><code>' + f.id + '</code><span><b>' + esc(f.nom) + '</b><span class="faint small"> · ' + esc(f.familleNom) + '</span></span><span class="row"><span class="faint small">' + (p ? pct((p.H + p.F) / 2) : 'à fournir') + '</span><span class="tag ' + (f.version.etat === 'en service' ? 'ok' : f.version.etat === 'relue' ? 'sophie' : f.version.etat === 'à revoir' ? 'warn' : '') + '">' + esc(f.version.etat) + '</span></span></button>';
        }).join('') + '</div>';
    },
    mount(node) {
      $('#fSearch', node).onsubmit = e => { e.preventDefault(); ficheQuery = $('#fQ', node).value; A.render(); };
      $('#fFam', node).onchange = e => { ficheFam = e.target.value; A.render(); };
      node.querySelectorAll('[data-f]').forEach(b => b.onclick = () => A.go('cmo/fiche/' + b.dataset.f));
      $('#fImp', node).onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        file.text().then(md => {
          try { const st = A.kb.importMarkdown(md); A.toast(icon('check') + st.fiches + ' fiches importées, codage automatique à relire'); A.render(); }
          catch (err) { A.toast(icon('alert') + esc(err.message)); }
        });
      };
      $('#fRules', node).onclick = rulesSheet;
    }
  };
  function mdLite(md) {
    const lines = String(md).split('\n');
    let html = '', inTable = false, inList = false;
    const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
    lines.forEach(l => {
      if (/^\|/.test(l)) {
        if (/^\|\s*-/.test(l)) return;
        const c = l.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
        if (!inTable) { html += '<div class="scroll-x"><table class="table"><tr>' + c.map(x => '<th>' + inline(x) + '</th>').join('') + '</tr>'; inTable = true; } else html += '<tr>' + c.map(x => '<td>' + inline(x) + '</td>').join('') + '</tr>';
        return;
      }
      if (inTable) { html += '</table></div>'; inTable = false; }
      if (/^- /.test(l)) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + inline(l.slice(2)) + '</li>'; return; }
      if (inList) { html += '</ul>'; inList = false; }
      if (/^```/.test(l) || /^&#91;embedded/.test(l)) return;
      if (l.trim()) html += '<p>' + inline(l) + '</p>';
    });
    if (inTable) html += '</table></div>';
    if (inList) html += '</ul>';
    return html;
  }
  function rulesSheet() {
    const rs = A.kb.regles();
    A.sheet('Règles de la base de connaissances', '<div class="fiche-body">' + rs.map(r => '<h3 style="color:var(--ink);font-size:1.1rem;margin-top:22px">' + esc(r.titre) + '</h3>' + mdLite(r.md)).join('') + '</div>', { wide: true });
  }

  SECTIONS.fiche = {
    render(params) {
      const f = A.kb.get((params.arg || [])[1]);
      if (!f) return head('Fiche introuvable');
      const facts = VOCAB.FACTS;
      const factRow = (x, kind) => '<span class="chip" style="height:auto;padding:6px 6px 6px 14px">' + esc((facts[x.fait] || {}).label || x.fait) + '<select data-force="' + kind + ':' + x.fait + '" aria-label="Force" style="background:none;border:0;color:var(--ink-2)">' + (kind === 'contre' ? '<option>contre</option>' : ['très typique', 'fréquent', 'possible', 'rare'].map(o => '<option' + (o === x.force ? ' selected' : '') + '>' + o + '</option>').join('')) + '</select><button class="icon-btn" style="width:30px;height:30px" data-del="' + kind + ':' + x.fait + '" aria-label="Retirer">' + icon('close') + '</button></span>';
      const etats = ['brouillon', 'relue', 'en service', 'à revoir'];
      const ap = f.apriori;
      return head(f.nom, esc(f.id) + ' · ' + esc(f.familleNom) + (f.imm ? ' · IMM : ' + esc(f.imm) : '') + ' · ISS 6 mois : ' + esc(ap.issTexte || 'à fournir') + ' · Mars 3 ans : ' + esc(ap.marsTexte || 'à fournir'), '<button class="btn" data-back>' + icon('back') + 'Fiches</button>') +
        '<div class="split"><div class="panel fiche-body">' +
          [['reconnaitre', 'Comment le reconnaître'], ['alarme', 'Signes d\'alarme'], ['bord', 'Ce qu\'on fait à bord'], ['sol', 'Quand appeler le sol'], ['sansSol', 'Si le sol ne répond pas'], ['clinique', 'Médecine clinique'], ['manque', 'Ce qui manque']].filter(r => f.textes[r[0]]).map(r => '<h3>' + r[1] + '</h3><p>' + esc(f.textes[r[0]]) + '</p>').join('') +
        '</div><div class="stack">' +
          '<div class="panel"><div class="panel-title"><h3>Cycle de vie</h3><span class="faint small">version ' + esc(f.version.num) + '</span></div><div class="seg" id="fEtat">' + etats.map(e => '<button data-e="' + e + '" aria-pressed="' + (f.version.etat === e) + '">' + e + '</button>').join('') + '</div><p class="faint small" style="margin-top:10px">Le moteur n\'utilise que les fiches en service ; les brouillons servent aussi tant que l\'option démonstration est active (Réglages). Codage des faits : ' + esc(f.version.codage || 'manuel') + '.</p></div>' +
          '<div class="panel"><h3>Faits codés</h3><p class="muted small">La force dit à quel point le signe est fréquent chez une personne qui a cette condition (R-RAI-02).</p><div class="factlist" style="margin-top:10px">' + (f.pour || []).map(x => factRow(x, 'pour')).join('') + '</div>' +
            '<p class="muted small" style="margin-top:14px">Orientent ailleurs</p><div class="factlist">' + ((f.contre || []).map(x => factRow(x, 'contre')).join('') || '<span class="faint small">aucun</span>') + '</div>' +
            '<p class="muted small" style="margin-top:14px">Signes d\'alarme codés</p><div class="factlist">' + ((f.alarmeFaits || []).map(c => '<span class="tag bad">' + esc((facts[c] || {}).label || c) + '</span>').join(' ') || '<span class="faint small">aucun</span>') + '</div>' +
            '<div class="row wrap" style="margin-top:14px"><select class="input" id="fAdd" style="width:auto;min-height:44px" aria-label="Ajouter un fait"><option value="">Ajouter un fait…</option>' + Object.values(facts).map(x => '<option value="' + x.code + '">' + esc(x.label) + '</option>').join('') + '</select><select class="input" id="fAddKind" style="width:auto;min-height:44px" aria-label="Type"><option value="pour">pour, fréquent</option><option value="contre">contre</option></select></div></div>' +
          '<div class="panel"><h3>Tester avec un patient fictif</h3><p class="muted small">Un patient fictif qui a tous les faits « pour » de cette fiche. Il sert à vérifier le moteur, pas à l\'entraîner (R-APP-05).</p><button class="btn" id="fTest" style="margin-top:12px">' + icon('play') + 'Lancer le test</button><div id="fTestOut" style="margin-top:12px"></div></div>' +
          '<div class="panel"><h3>Options de traitement, dans l\'ordre</h3><ol class="steps" style="margin-top:10px">' + (f.options || []).map((o, i) => '<li><span class="n">' + (i + 1) + '</span><span>' + esc(o.action) + '<br><span class="tag">' + esc(o.competence === 'rmb' ? 'responsable médical' : o.competence) + '</span> ' + o.ressources.map(r => '<span class="tag sophie">' + esc((PH.meds.find(m => m.id === r) || {}).name || r) + '</span>').join(' ') + '</span></li>').join('') + '</ol></div>' +
        '</div></div>';
    },
    mount(node, params) {
      const id = (params.arg || [])[1];
      const f = A.kb.get(id);
      if (!f) return;
      node.querySelector('[data-back]').onclick = () => A.go('cmo/fiches');
      node.querySelectorAll('#fEtat [data-e]').forEach(b => b.onclick = () => { A.kb.setEtat(id, b.dataset.e); A.toast(icon('check') + 'Fiche ' + esc(b.dataset.e)); A.render(); });
      const save = (pour, contre) => { A.kb.edit(id, { pour, contre, version: Object.assign({}, f.version, { codage: 'corrigé à bord' }) }); A.render(); };
      node.querySelectorAll('[data-force]').forEach(s => s.onchange = () => { const [k, c] = s.dataset.force.split(':'); if (k !== 'pour') return; save(f.pour.map(x => x.fait === c ? { fait: c, force: s.value } : x), f.contre); });
      node.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const [k, c] = b.dataset.del.split(':'); save(k === 'pour' ? f.pour.filter(x => x.fait !== c) : f.pour, k === 'contre' ? f.contre.filter(x => x.fait !== c) : f.contre); });
      $('#fAdd', node).onchange = e => { const c = e.target.value; if (!c) return; const kind = $('#fAddKind', node).value; if (kind === 'pour') save(f.pour.filter(x => x.fait !== c).concat([{ fait: c, force: 'fréquent' }]), f.contre); else save(f.pour, f.contre.filter(x => x.fait !== c).concat([{ fait: c, force: 'contre' }])); };
      $('#fTest', node).onclick = () => {
        const sess = TR.create({ fiches: A.kb.fiches() }, VOCAB, { mission: S.state.settings.mission, sexe: 'F', day: S.day(), gravityChanges: DATA.mission.gravityTransitions, pco2: S.state.settings.pco2 }, S.state.settings.engine);
        (f.pour || []).forEach(x => sess.setFact(x.fait, true));
        const st = sess.state();
        const rank = st.top.findIndex(t => t.id === id);
        $('#fTestOut', node).innerHTML = '<div class="bars">' + st.top.map(t => '<div class="b"><span>' + esc(t.nom) + '</span><span class="t"><i style="width:' + (t.p * 100).toFixed(0) + '%"></i></span><span class="p">' + pct(t.p) + '</span></div>').join('') + '</div><p class="small" style="margin-top:10px">' + (rank === 0 ? '<span class="tag ok">Trouvée en premier</span>' : rank > 0 ? '<span class="tag warn">Trouvée en position ' + (rank + 1) + '</span>' : '<span class="tag bad">Absente des trois premières : les faits codés sont à revoir</span>') + '</p>';
      };
    }
  };

  /* ---------------- Vidéos (bibliothèque) ---------------- */
  SECTIONS.videos = {
    render() {
      const all = A.videos.all();
      const crew = S.crewIds();
      const today = crew.map(id => { const d = A.videos.daily(id); const m = S.member(id); return '<tr><td><span class="row"><span class="avatar" style="--h:' + m.hue + '">' + A.initials(S.profile(id).name) + '</span>' + esc(A.first(S.profile(id).name)) + '</span></td><td>' + esc(d.title) + '</td><td class="muted">' + esc(d.reason || '') + '</td><td>' + (m.videos[d.id] && m.videos[d.id].d === S.day() ? '<span class="tag ok">vue</span>' : '<span class="tag">à voir</span>') + '</td></tr>'; }).join('');
      const rows = all.map(v => '<tr><td><b>' + esc(v.title) + '</b><div class="faint small">' + (v.kind === 'capsule' ? 'Vidéo AURA, animée et lue' : 'Ajoutée à bord') + '</div></td><td>' + (v.cat === 'securite' ? 'Sécurité' : 'Prévention') + '</td><td>' + crew.map(id => { const w = S.member(id).videos[v.id]; return '<span class="tag ' + (w ? 'ok' : '') + '" title="' + esc(S.profile(id).name) + '">' + A.initials(S.profile(id).name) + (w ? ' J' + w.d : '') + '</span>'; }).join(' ') + '</td><td>' + (v.kind === 'media' ? '<button class="btn small ghost" data-del="' + esc(v.id) + '">' + icon('trash') + 'Retirer</button>' : '<button class="btn small ghost" data-mand="' + esc(v.id) + '">' + (S.state.mandatory && S.state.mandatory[v.id] ? icon('check') + 'Demandée' : 'Demander à tous') + '</button>') + '</td></tr>').join('');
      return head('Vidéos', 'Chaque jour, AURA propose à chacun la vidéo la plus utile : sortie prévue, sommeil en baisse, rappel de sécurité, ou ta demande.') +
        '<div class="panel"><h2>Aujourd\'hui</h2><table class="table" style="margin-top:10px"><thead><tr><th>Qui</th><th>Vidéo proposée</th><th>Pourquoi</th><th></th></tr></thead><tbody>' + today + '</tbody></table></div>' +
        '<div class="panel" style="margin-top:22px"><div class="panel-title"><h2>Ajouter une vidéo</h2></div><div class="grid2"><label class="field"><span>Titre</span><input id="vTitle" placeholder="Par exemple : utiliser l\'extincteur"></label><label class="field"><span>Catégorie</span><select id="vCat"><option value="securite">Sécurité</option><option value="prevention">Prévention</option></select></label></div>' +
        '<div class="grid2" style="margin-top:14px"><label class="drop" id="vDrop">' + icon('upload') + '<span>Choisir un fichier vidéo<br><span class="faint small">gardé sur cet appareil</span></span><input type="file" id="vFile" accept="video/*" hidden></label><label class="field"><span>Ou un lien vers la vidéo</span><input id="vUrl" placeholder="https://"></label></div>' +
        '<button class="btn primary" id="vAdd" style="margin-top:16px">' + icon('plus') + 'Ajouter</button></div>' +
        '<div class="panel scroll-x" style="margin-top:22px"><table class="table"><thead><tr><th>Vidéo</th><th>Catégorie</th><th>Vue par</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    },
    mount(node) {
      let file = null;
      $('#vFile', node).onchange = e => { file = e.target.files[0] || null; $('#vDrop', node).querySelector('span').innerHTML = file ? esc(file.name) : 'Choisir un fichier vidéo'; if (file && !$('#vTitle', node).value) $('#vTitle', node).value = file.name.replace(/\.[^.]+$/, ''); };
      const drop = $('#vDrop', node);
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); file = e.dataTransfer.files[0]; drop.querySelector('span').textContent = file ? file.name : ''; };
      $('#vAdd', node).onclick = async () => {
        const title = $('#vTitle', node).value.trim(), url = $('#vUrl', node).value.trim();
        if (!title || (!file && !url)) { A.toast(icon('info') + 'Donne un titre et un fichier ou un lien.'); return; }
        const v = { id: A.uid('v'), title, cat: $('#vCat', node).value, dur: 180, hue: ['#9FD8FF', '#2F6FE0'] };
        if (file) { try { await A.videoStore.put(v.id, file); v.blob = true; } catch (e) { A.toast(icon('alert') + 'Impossible de garder ce fichier ici.'); return; } } else v.src = url;
        S.state.videosLib.push(v); S.save();
        A.toast(icon('check') + 'Vidéo ajoutée');
        A.render();
      };
      node.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.state.videosLib = S.state.videosLib.filter(v => v.id !== b.dataset.del); A.videoStore.del(b.dataset.del); S.save(); A.render(); });
      node.querySelectorAll('[data-mand]').forEach(b => b.onclick = () => {
        S.state.mandatory = S.state.mandatory || {};
        const id = b.dataset.mand;
        S.state.mandatory[id] = !S.state.mandatory[id];
        const cap = A.videos.CAPS.find(c => c.id === id);
        if (cap) cap.mandatory = S.state.mandatory[id];
        S.crewIds().forEach(cid => { const m = S.member(cid); if (m.missions[S.day()]) delete m.missions[S.day()].video; });
        S.save(); A.render();
      });
    }
  };

  /* ---------------- Liaison Terre ---------------- */
  SECTIONS.sol = {
    render() {
      const L = S.light();
      const q = S.state.queue.slice().sort((a, b) => (a.statut === 'envoyé') - (b.statut === 'envoyé') || a.prio - b.prio);
      const prioName = p => p === 0 ? 'urgence' : p === 1 ? 'avis' : p === 2 ? 'paquet du jour' : 'privé, conférence';
      return head('Liaison Terre', S.blackout() ? 'Liaison coupée : conjonction solaire. Tout est gardé à bord.' : 'Un message met ' + A.num(L, 0) + ' minutes à arriver. Réponse au plus tôt dans ' + A.dur(2 * L + 45) + ', ou ' + A.dur(2 * L + 15) + ' pour une urgence (R-COM-03).') +
        '<div class="panel"><p class="muted">Ordre d\'envoi : urgences, paquet médical du jour, puis messages privés et résumés de conférence (R-COM-01). Les données médicales partent par une voie privée (R-CONF-04).</p><table class="table" style="margin-top:12px"><thead><tr><th>Priorité</th><th>Message</th><th>Quand</th><th>État</th></tr></thead><tbody>' +
        q.map(x => '<tr><td><span class="tag ' + (x.prio === 0 ? 'bad' : x.prio === 1 ? 'warn' : x.prio === 3 ? 'sophie' : '') + '">' + prioName(x.prio) + '</span></td><td>' + esc(x.titre) + (x.prive ? ' <span class="tag">partie moral non partagée</span>' : '') + '</td><td class="faint">' + A.dayLabel(x.d, S.day()) + ' ' + A.hm(x.min || 0) + '</td><td>' + esc(x.statut) + '</td></tr>').join('') + '</tbody></table>' +
        '<div class="row" style="margin-top:16px"><button class="btn primary" id="qSend">' + icon('send') + 'Envoyer la file maintenant</button></div></div>';
    },
    mount(node) {
      $('#qSend', node).onclick = () => {
        if (S.blackout()) { A.toast(icon('info') + 'Liaison coupée : la file partira au retour de la liaison.'); return; }
        S.state.queue.forEach(x => { if (x.statut !== 'envoyé') x.statut = 'envoyé'; });
        S.save(); A.toast(icon('satellite') + 'File envoyée vers la Terre'); A.render();
      };
    }
  };

  /* ---------------- Réglages de la mission ---------------- */
  SECTIONS.reglages = {
    render() {
      const st = S.state.settings, ai = st.ai || {};
      const P = A.llm.PROVIDERS;
      const eng = Object.assign({}, TR.DEFAULTS, st.engine || {});
      return head('Réglages de la mission', 'Les réglages de base de la plateforme, pour tout l\'équipage.') +
        '<div class="grid2"><div class="panel"><h2>Mission</h2>' +
          '<div class="setting"><div class="txt"><b>Jour de mission</b><small>Transit aller jusqu\'au jour 180.</small></div><div class="row"><button class="icon-btn" data-day="-1" aria-label="Jour précédent">' + icon('minus') + '</button><b style="min-width:4ch;text-align:center">' + st.day + '</b><button class="icon-btn" data-day="1" aria-label="Jour suivant">' + icon('plus') + '</button></div></div>' +
          '<div class="setting"><div class="txt"><b>Mission de référence des fréquences</b><small>Probabilités IMM utilisées par le moteur.</small></div><div class="seg" data-seg="mission"><button data-v="mars" aria-pressed="' + (st.mission !== 'iss') + '">Mars, 3 ans</button><button data-v="iss" aria-pressed="' + (st.mission === 'iss') + '">ISS, 6 mois</button></div></div>' +
          '<div class="setting"><div class="txt"><b>CO₂ de la cabine</b><small>' + A.num(st.pco2, 1) + ' mmHg ; limite NASA : 3 mmHg sur une heure.</small></div><input type="range" min="1" max="8" step="0.1" value="' + st.pco2 + '" id="rCo2" style="max-width:200px" aria-label="CO₂"></div>' +
          '<div class="setting"><div class="txt"><b>Alerte d\'éruption solaire</b><small>Abri, sorties reportées, vidéo de rappel proposée à tous.</small></div><button class="toggle" role="switch" data-tog="alerteEruption" aria-checked="' + !!st.alerteEruption + '" aria-label="Alerte d\'éruption"></button></div>' +
          '<div class="setting"><div class="txt"><b>Adresse publique</b><small>Pour ouvrir l\'évasion dans un casque.</small></div><input class="input" id="rUrl" style="max-width:260px" value="' + esc(st.publicUrl || 'https://tahiboutall.github.io/demo-test-nasa-space-apps/') + '" aria-label="Adresse publique"></div>' +
        '</div><div class="panel"><h2>Moteur d\'orientation</h2><p class="muted small">Réglages des règles R-RAI, en choix AURA à valider.</p>' +
          '<div class="setting"><div class="txt"><b>Utiliser les fiches en brouillon</b><small>Pour la démonstration. En mission, seules les fiches en service.</small></div><button class="toggle" role="switch" data-eng="utiliserBrouillons" aria-checked="' + !!eng.utiliserBrouillons + '" aria-label="Fiches en brouillon"></button></div>' +
          '<div class="setting"><div class="txt"><b>Fait non cité par la fiche</b><small>0,1 comme dans le document (R-RAI-02). Seules les fiches qui citent au moins un fait décrit sont comparées (choix AURA).</small></div><div class="seg" data-engseg="nonCite">' + [0.02, 0.05, 0.1].map(v => '<button data-v="' + v + '" aria-pressed="' + (eng.nonCite === v) + '">' + A.num(v, 2) + '</button>').join('') + '</div></div>' +
          '<div class="setting"><div class="txt"><b>Arrêt des questions</b><small>Seuil de probabilité et nombre de questions au plus.</small></div><div class="seg" data-engseg="arretQuestions">' + [6, 8, 10].map(v => '<button data-v="' + v + '" aria-pressed="' + (eng.arretQuestions === v) + '">' + v + ' questions</button>').join('') + '</div></div>' +
        '</div></div>' +
        '<div class="panel" style="margin-top:22px"><h2>Intelligence artificielle de langage (facultative)</h2><p class="muted">Sans elle, tout fonctionne. Avec elle, Sophie converse plus librement, à partir des fiches seulement ; elle ne calcule rien et ne choisit aucun traitement. La clé reste dans ce navigateur.</p>' +
          '<div class="grid3" style="margin-top:16px"><label class="field"><span>Service</span><select id="aiP">' + Object.entries(P).map(([k, p]) => '<option value="' + k + '"' + (k === (ai.provider || 'aucune') ? ' selected' : '') + '>' + esc(p.label) + '</option>').join('') + '</select></label>' +
          '<label class="field"><span>Clé</span><input id="aiK" type="password" autocomplete="off" value="' + esc(ai.key || '') + '" placeholder="Non nécessaire pour Ollama"></label>' +
          '<label class="field"><span>Modèle</span><input id="aiM" value="' + esc(ai.model || '') + '" placeholder="par défaut"></label></div>' +
          '<label class="field" style="margin-top:14px"><span>Adresse du service (compatible OpenAI ou Ollama)</span><input id="aiU" value="' + esc(ai.url || '') + '" placeholder="laisser vide pour l\'adresse par défaut"></label>' +
          '<div class="row" style="margin-top:16px"><button class="btn primary" id="aiSave">' + icon('check') + 'Enregistrer</button><button class="btn" id="aiTest">' + icon('sparkle') + 'Tester</button><span class="muted small" id="aiOut"></span></div></div>' +
        '<div class="panel" style="margin-top:22px"><div class="spread"><div><h2>Données de démonstration</h2><p class="muted small">Équipage fictif et mesures simulées, reproductibles.</p></div><button class="btn ghost" id="rReset">' + icon('replay') + 'Réinitialiser</button></div></div>';
    },
    mount(node) {
      const st = S.state.settings;
      node.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { st.day = A.clamp(st.day + +b.dataset.day, 1, DATA.mission.durationDays); S.save(); A.render(); });
      node.querySelectorAll('[data-seg="mission"] button').forEach(b => b.onclick = () => { S.setSetting('mission', b.dataset.v); A.kb.invalidate(); A.render(); });
      $('#rCo2', node).onchange = e => { S.setSetting('pco2', +e.target.value); A.render(); };
      $('#rUrl', node).onchange = e => S.setSetting('publicUrl', e.target.value.trim());
      node.querySelectorAll('[data-tog]').forEach(t => t.onclick = () => { const on = t.getAttribute('aria-checked') !== 'true'; t.setAttribute('aria-checked', on); S.setSetting(t.dataset.tog, on); if (t.dataset.tog === 'alerteEruption') S.crewIds().forEach(id => { const m = S.member(id); if (m.missions[S.day()]) delete m.missions[S.day()].video; }); });
      const eng = () => { st.engine = st.engine || {}; return st.engine; };
      node.querySelectorAll('[data-eng]').forEach(t => t.onclick = () => { const on = t.getAttribute('aria-checked') !== 'true'; t.setAttribute('aria-checked', on); eng()[t.dataset.eng] = on; S.save(); });
      node.querySelectorAll('[data-engseg]').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => { sg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); eng()[sg.dataset.engseg] = +b.dataset.v; S.save(); }));
      const read = () => ({ provider: $('#aiP', node).value, key: $('#aiK', node).value.trim(), model: $('#aiM', node).value.trim(), url: $('#aiU', node).value.trim() });
      $('#aiSave', node).onclick = () => { S.setSetting('ai', read()); A.toast(icon('check') + 'Réglage enregistré dans ce navigateur'); };
      $('#aiTest', node).onclick = async () => {
        S.setSetting('ai', read());
        const out = $('#aiOut', node);
        if (!A.llm.ready()) { out.textContent = A.llm.inArtifact() ? 'Dans cet aperçu, Sophie converse avec Claude quand on lui écrit : l\'accord est demandé au premier message.' : 'Aucun service choisi, ou clé manquante.'; return; }
        out.textContent = 'Test en cours…';
        try { const r = await A.llm.test(); out.textContent = r && r.say ? 'Réponse : ' + r.say : 'Pas de réponse.'; } catch (e) { out.textContent = 'Échec : ' + e.message; }
      };
      A.armConfirm($('#rReset', node), 'Confirmer : tout réinitialiser', () => { S.reset(); A.go(''); });
    }
  };
})(typeof self !== 'undefined' ? self : this);
