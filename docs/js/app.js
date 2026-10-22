/* AURA : application (navigation, actions, sauvegarde, hors connexion). */
(function (root) {
  'use strict';
  const D = root.AURA_DATA, E = root.AURA_ENGINE, S = root.AURA_STORE, UI = root.AURA_UI, V = root.AURA_VIEWS, KB = root.AURA_KB;
  const f = E.fmt, esc = UI.esc, DAY = 1440;

  const A = {
    s: null, D, E, S, UI, KB, idx: E.buildIndex(KB.cards),
    route: { path: [], q: {} }, routeKey: null, flash: {}, ui: {},
    form: null, plan: { mode: 'avant', scenario: 'median', runs: 5000, result: null, med: null },
    theme: 'auto', pendingAuto: null
  };
  root.AURA_APP = A;

  const ROUTES = {
    '': ['Vue d’ensemble', a => V.dashboard(a)],
    'equipage': ['Équipage', a => a.route.path[1] ? V.astronaut(a, a.route.path[1]) : V.crew(a)],
    'saisie': ['Nouvelle saisie', a => V.entry(a)],
    'alertes': ['Alertes', a => V.alerts(a)],
    'pharmacie': ['Pharmacie', a => V.pharmacy(a)],
    'planification': ['Planification', a => V.planning(a)],
    'bien-etre': ['Bien-être', a => V.wellbeing(a)],
    'habitat': ['Habitat', a => V.habitat(a)],
    'conference': ['Conférence', a => V.conference(a)],
    'questions': ['Questions', a => V.questions(a)],
    'liaison': ['Liaison Terre', a => V.link(a)],
    'mission': ['Mission', a => V.mission(a)],
    'demo': ['Démonstration guidée', a => V.demo(a)],
    'a-propos': ['À propos', a => V.about(a)]
  };
  const NAV = [
    { label: 'Suivi', items: [['', 'Vue d’ensemble'], ['equipage', 'Équipage'], ['saisie', 'Nouvelle saisie'], ['alertes', 'Alertes']] },
    { label: 'Soins', items: [['pharmacie', 'Pharmacie'], ['planification', 'Planification'], ['bien-etre', 'Bien-être']] },
    { label: 'Mission', items: [['habitat', 'Habitat'], ['conference', 'Conférence'], ['questions', 'Questions'], ['liaison', 'Liaison Terre'], ['mission', 'Mission']] },
    { label: 'Projet', items: [['demo', 'Démonstration guidée'], ['a-propos', 'À propos']] }
  ];

  function $(id) { return document.getElementById(id); }
  function resetForms() {
    A.form = {
      m: { a: A.s ? A.s.me : 'a2', k: 'temp', v: '', ctx: {}, retakeOf: null },
      sy: { a: A.s ? A.s.me : 'a2', sym: 'cephalee', intensity: 4, note: '' }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Thème                                                               */
  /* ------------------------------------------------------------------ */
  function readTheme() { try { return localStorage.getItem('aura.theme') || 'auto'; } catch (e) { return 'auto'; } }
  function applyTheme() {
    const el = document.documentElement;
    if (A.theme === 'light' || A.theme === 'dark') el.setAttribute('data-theme', A.theme);
    else el.removeAttribute('data-theme');
    try { localStorage.setItem('aura.theme', A.theme); } catch (e) { /* rien */ }
  }

  /* ------------------------------------------------------------------ */
  /* Sauvegarde                                                          */
  /* ------------------------------------------------------------------ */
  function persist() {
    if (!S.save(A.s) && !A.warned) {
      A.warned = true;
      toast('Sauvegarde locale indisponible dans ce navigateur : les changements seront perdus au rechargement.');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Rendu                                                               */
  /* ------------------------------------------------------------------ */
  function renderTop() {
    const s = A.s, day = s.now / DAY;
    const ph = E.phaseAt(D.mission, day), L = E.lightMinutes(D.mission, day), bo = E.isBlackout(D.mission, day);
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    let h = '<button class="btn small menu-btn" data-act="menu" aria-controls="nav" aria-expanded="' + ($('nav').classList.contains('open')) + '">Menu</button>';
    h += '<div class="brand"><a href="#/" aria-label="AURA, vue d’ensemble">AURA</a><span>Santé de l’équipage</span></div>';
    h += '<div class="clock"><span><span class="clock-day">' + esc(f.day(day)) + '</span><span class="clock-time">' + esc(f.clock(s.now % DAY)) + ' heure de bord</span></span>';
    h += '<span class="clock-item hide-s">' + esc(ph.label) + '</span>';
    h += '<span class="clock-item">Délai radio <b>' + esc(f.dur(L)) + '</b></span>';
    h += '<span class="clock-item"><i class="link-dot' + (bo ? ' down' : '') + '"></i>' + (bo ? 'Liaison coupée' : 'Liaison établie') + '</span>';
    if (offline) h += '<span class="clock-item"><b>Hors connexion</b>, tout fonctionne</span>';
    h += '</div><div class="tb-actions"><div class="advance" role="group" aria-label="Avancer l’heure de bord"><span class="label">Avancer</span>' +
      '<button class="btn small" data-act="advance" data-min="60">+1 h</button><button class="btn small" data-act="advance" data-min="360">+6 h</button><button class="btn small" data-act="advance" data-min="1440">+1 jour</button></div>';
    h += '<div class="seg" role="group" aria-label="Vue"><button data-act="role" data-role="crew" aria-pressed="' + (s.role === 'crew') + '">Équipage</button><button data-act="role" data-role="doctor" aria-pressed="' + (s.role === 'doctor') + '">Médecin de bord</button></div>';
    if (s.role === 'crew') h += '<label class="whoami"><span>Vous êtes</span><select data-change="me" aria-label="Membre d’équipage">' + D.crew.map(c => '<option value="' + c.id + '"' + (c.id === s.me ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>';
    h += '</div>';
    $('top').innerHTML = h;
  }

  function counts() {
    const s = A.s, doc = s.role === 'doctor';
    const open = s.alerts.filter(a => a.st !== 'close' && (doc || !a.a || a.a === s.me));
    const fu = S.pendingFollowUps(s).filter(ad => doc || ad.a === s.me).length;
    const q = s.queue.filter(x => !x.sentAt).length;
    return {
      alertes: open.length ? [open.length, open.some(a => a.lv === 'urgence') ? 'alert' : 'watch'] : null,
      pharmacie: fu ? [fu, 'watch'] : null,
      liaison: q ? [q, ''] : null
    };
  }
  function renderNav() {
    const cur = A.route.path[0] || '';
    const c = counts();
    let h = '';
    NAV.forEach(g => {
      h += '<div class="nav-group"><div class="nav-label">' + esc(g.label) + '</div>';
      g.items.forEach(it => {
        const n = c[it[0]];
        h += '<a href="#/' + it[0] + '"' + (cur === it[0] ? ' aria-current="page"' : '') + '><span>' + esc(it[1]) + '</span>' + (n ? '<span class="count ' + n[1] + '">' + n[0] + '</span>' : '') + '</a>';
      });
      h += '</div>';
    });
    h += '<div class="side-foot"><p>Équipage, mesures et mission fictifs, simulés de façon reproductible.</p><p>Fonctionne sans connexion après le premier chargement.</p></div>';
    $('nav').innerHTML = h;
  }

  function renderUrgency() {
    const em = A.s.emergency, slot = $('urgency');
    if (!em) { slot.hidden = true; slot.innerHTML = ''; return; }
    const done = em.steps.filter(x => x.done).length, next = em.steps.find(x => !x.done);
    slot.hidden = false;
    slot.className = 'urgency' + (em.over ? ' over' : '');
    slot.innerHTML = '<div class="urgency-in" role="alert"><strong>' + (em.over ? 'Fin de l’événement : ' : 'Mode urgence : ') + esc(em.title) + '</strong><span class="urg-step">' +
      (next ? 'Étape ' + (done + 1) + ' sur ' + em.steps.length + ' : ' + esc(next.label) : 'Toutes les étapes sont faites') + '</span>' +
      (A.route.path[0] !== 'alertes' ? '<a class="btn small" href="#/alertes">Ouvrir la procédure</a>' : '') + '</div>';
  }

  function demoBar() {
    const id = A.s.scenario;
    if (!id) return '';
    const i = D.scenarios.findIndex(x => x.id === id);
    if (i < 0) return '';
    const sc = D.scenarios[i];
    return '<div class="demo-bar" role="region" aria-label="Démonstration guidée"><p><b>Scénario ' + (i + 1) + ' sur ' + D.scenarios.length + ' : ' + esc(sc.title) + '.</b> À regarder : ' + esc(sc.look) + '</p><div class="btn-row">' +
      (i < D.scenarios.length - 1 ? '<button class="btn small primary" data-act="scenario" data-id="' + D.scenarios[i + 1].id + '">Scénario suivant</button>' : '<a class="btn small primary" href="#/demo">Revoir la liste</a>') +
      '<button class="btn small" data-act="demo-exit">Quitter la démonstration</button></div></div>';
  }

  function renderMain(opts) {
    opts = opts || {};
    UI.resetCharts(); UI.tipHide();
    const key = A.route.path[0] || '';
    const r = ROUTES[key] || ROUTES[''];
    const main = $('main');
    let html;
    try { html = r[1](A); }
    catch (err) {
      console.error(err);
      html = '<div class="page"><h1 id="page-title" tabindex="-1">Cette page n’a pas pu s’afficher</h1><p class="lead">Une erreur est survenue. Les autres pages restent utilisables.</p><p><a href="#/">Revenir à la vue d’ensemble</a></p></div>';
    }
    main.innerHTML = html + demoBar();
    UI.mount(main);
    document.title = r[0] + ' : AURA';
    if (opts.scrollTop) {
      window.scrollTo(0, 0);
      const h1 = $('page-title');
      if (h1 && opts.focus !== false) h1.focus({ preventScroll: true });
    }
  }
  function render(opts) {
    renderTop(); renderNav(); renderUrgency(); renderMain(opts);
    const top = $('top');
    if (top) document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px');
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
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
  function onRoute() {
    const prev = A.routeKey;
    A.route = parseHash();
    const key = A.route.path.join('/');
    const changed = key !== prev;
    A.routeKey = key;
    if (changed) { A.flash = {}; A.ui = {}; }
    if (A.route.path[0] === 'saisie') {
      if (A.route.q.a && S.crewById[A.route.q.a]) { A.form.m.a = A.route.q.a; A.form.sy.a = A.route.q.a; }
      if (A.route.q.k && D.metrics[A.route.q.k]) A.form.m.k = A.route.q.k;
    }
    closeMenu();
    if (A.pendingAuto === 'measure') { A.pendingAuto = null; doMeasure(); }
    else if (A.pendingAuto === 'symptom') { A.pendingAuto = null; doSymptom(); }
    render({ scrollTop: changed });
  }
  function go(hash) {
    if (location.hash === hash) onRoute();
    else location.hash = hash;
  }

  /* ------------------------------------------------------------------ */
  /* Messages courts                                                      */
  /* ------------------------------------------------------------------ */
  function toast(text, level) {
    const box = $('toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'toast' + (level === 'urgence' ? ' urgence' : '');
    t.textContent = text;
    box.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 4500);
    while (box.children.length > 3) box.removeChild(box.firstChild);
  }
  function toastEvents(list) {
    if (!list || !list.length) return;
    const urgent = list.filter(e => e.kind === 'urgence');
    const rest = list.filter(e => e.kind !== 'urgence');
    urgent.slice(0, 1).forEach(e => toast(e.text, 'urgence'));
    const byKind = {};
    rest.forEach(e => { byKind[e.kind] = byKind[e.kind] || []; byKind[e.kind].push(e); });
    Object.keys(byKind).slice(0, 3).forEach(k => {
      const arr = byKind[k];
      toast(arr.length > 1 && k === 'mesures' ? arr.length + ' matinées de mesures traitées. ' + arr[arr.length - 1].text : arr[arr.length - 1].text);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                              */
  /* ------------------------------------------------------------------ */
  function advance(minutes) {
    const before = A.s.inbox.filter(m => m.status === 'reçu').length;
    const ev = S.advanceTo(A.s, A.s.now + minutes);
    const after = A.s.inbox.filter(m => m.status === 'reçu').length;
    if (after > before) ev.push({ kind: 'liaison', text: (after - before) + ' message' + (after - before > 1 ? 's' : '') + ' reçu' + (after - before > 1 ? 's' : '') + ' du sol.' });
    persist(); render();
    if (!ev.length) toast('Heure de bord : ' + f.when(A.s.now) + '.');
    toastEvents(ev);
  }
  function advanceTo(t) {
    if (t <= A.s.now) return;
    advance(t - A.s.now);
  }

  function doMeasure() {
    const fm = A.form.m;
    const ctx = {};
    Object.keys(fm.ctx || {}).forEach(k => { if (fm.ctx[k]) ctx[k] = true; });
    const raw = String(fm.v === null || fm.v === undefined ? '' : fm.v).trim().replace(',', '.');
    const v = raw === '' ? null : Number(raw);
    const res = S.addMeasurement(A.s, { a: fm.a, k: fm.k, v, ctx, src: 'saisie', retakeOf: fm.retakeOf || null });
    A.flash.m = {
      status: res.status, a: fm.a, k: fm.k, v, id: res.record.id, rec: res.record,
      fresh: res.ev ? { ev: res.ev, layers: res.layers, text: res.text, action: res.action } : null,
      alertTitle: res.alert ? res.alert.title : null,
      emergency: !!(A.s.emergency && A.s.emergency.t === A.s.now)
    };
    A.form.m.retakeOf = null;
    persist();
    if (res.status === 'processed' && res.ev) {
      const lv = res.ev.level;
      toast(lv === 'normal' ? 'Mesure enregistrée : dans la plage attendue.' : lv === 'vigilance' ? 'Mesure enregistrée : vigilance.' : 'Mesure enregistrée : alerte.', lv === 'urgence' ? 'urgence' : null);
    } else if (res.status === 'retake') toast('Valeur isolée : reprenez la mesure.');
    else if (res.status === 'rejected') toast('Valeur impossible : ignorée.');
    else toast('Aucune valeur : rien n’a été enregistré.');
  }
  function doSymptom() {
    const fy = A.form.sy;
    const res = S.reportSymptom(A.s, { a: fy.a, sym: fy.sym, intensity: +fy.intensity || 0, note: fy.note || '' });
    A.flash.sy = { a: fy.a, sym: fy.sym, intensity: +fy.intensity || 0, t: res.record.t, analysis: res.analysis, alertTitle: res.alert ? res.alert.title : null };
    persist();
    toast(res.analysis.level === 'vigilance' ? 'Symptôme enregistré : le médecin de bord est prévenu.' : 'Symptôme enregistré.');
  }
  function runPlan() {
    const p = A.plan, s = A.s;
    const start = p.mode === 'avant' ? 0 : Math.floor(s.now / DAY);
    const stock = {};
    D.meds.forEach(m => { stock[m.id] = p.mode === 'avant' ? m.stock : s.stock[m.id]; });
    const t0 = (root.performance && performance.now) ? performance.now() : Date.now();
    const rows = E.simulatePharmacy({
      conditions: D.conditions, meds: D.meds, crewSize: D.crew.length, startDay: start, endDay: D.mission.durationDays,
      transitions: D.mission.gravityTransitions, multiplier: D.planningScenarios[p.scenario].multiplier, runs: p.runs, seed: 7 + p.runs, stock
    });
    const t1 = (root.performance && performance.now) ? performance.now() : Date.now();
    p.result = { rows, ms: t1 - t0, runs: p.runs, scenario: p.scenario, mode: p.mode, start };
    const worst = rows.slice().sort((a, b) => b.pStockout - a.pStockout)[0];
    if (!p.med || !rows.find(r => r.med === p.med)) p.med = worst.med;
  }
  function runScenario(id) {
    const r = S.runScenario(id);
    A.s = r.state;
    resetForms();
    A.flash = {}; A.ui = {};
    const sc = D.scenarios.find(x => x.id === id);
    let target = sc.route;
    if (r.extra.planning) {
      A.plan = { mode: r.extra.planning.mode, scenario: r.extra.planning.scenario, runs: 5000, result: null, med: 'zolpidem' };
      runPlan();
      A.plan.med = 'zolpidem';
    }
    if (r.extra.measure) { A.form.m = { a: r.extra.measure.a, k: r.extra.measure.k, v: String(r.extra.measure.v), ctx: {}, retakeOf: null }; A.pendingAuto = 'measure'; target += '?type=mesure'; }
    if (r.extra.symptom) { A.form.sy = { a: r.extra.symptom.a, sym: r.extra.symptom.sym, intensity: r.extra.symptom.intensity, note: '' }; A.pendingAuto = 'symptom'; target += '?type=symptome'; }
    if (r.extra.reportEnd) target += '?fin=' + r.extra.reportEnd;
    persist();
    A.routeKey = null;
    go(target);
    toast('Scénario « ' + sc.title + ' » prêt.');
  }

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

  function onClick(e) {
    const row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a,button,input,select,label,textarea')) { location.hash = row.getAttribute('data-href'); return; }
    const el = e.target.closest('[data-act]');
    if (!el) {
      if (e.target.closest('.scrim')) closeMenu();
      return;
    }
    const ds = el.dataset, s = A.s;
    switch (el.getAttribute('data-act')) {
      case 'menu': toggleMenu(); break;
      case 'advance': advance(+ds.min); break;
      case 'advance-to': advanceTo(+ds.t); break;
      case 'role':
        s.role = ds.role; persist(); render();
        toast(ds.role === 'doctor' ? 'Vue du médecin de bord : vocabulaire clinique, tout l’équipage.' : 'Vue équipage : langage simple, vos propres données.');
        break;
      case 'see-alert': S.seeAlert(s, ds.id); persist(); render(); break;
      case 'close-open': A.ui.closing = ds.id; renderMain(); { const i = $('cl-' + ds.id); if (i) i.focus(); } break;
      case 'step': S.toggleStep(s, +ds.i); persist(); render(); break;
      case 'end-emergency': S.endEmergency(s); persist(); render(); toast('Mode urgence terminé.'); break;
      case 'example':
        A.form.m = { a: ds.a, k: ds.k, v: ds.v, ctx: {}, retakeOf: null };
        doMeasure(); render();
        break;
      case 'retake':
        A.form.m = { a: ds.a, k: ds.k, v: '', ctx: {}, retakeOf: ds.ref };
        A.flash.m = null;
        if (A.route.path[0] !== 'saisie' || A.route.q.type === 'symptome') go('#/saisie?type=mesure');
        else renderMain();
        setTimeout(() => { const i = $('m-v'); if (i) i.focus(); }, 30);
        break;
      case 'admin-open': A.ui.admin = { med: ds.med, a: ds.a || s.me }; A.ui.factor = null; renderMain(); break;
      case 'admin-cancel': A.ui.admin = null; renderMain(); break;
      case 'factor-open': A.ui.factor = ds.med; A.ui.admin = null; renderMain(); break;
      case 'factor-cancel': A.ui.factor = null; renderMain(); break;
      case 'effect': {
        const side = ($('side-' + ds.id) || {}).value || '';
        S.recordEffect(s, ds.id, ds.effect, side.trim()); persist(); render(); toast('Effet noté.');
        break;
      }
      case 'plan-med': A.plan.med = ds.med; renderMain(); break;
      case 'ask-chip': { S.askQuestion(s, { a: s.me, q: ds.q }, A.idx, KB); persist(); go('#/questions?q=' + encodeURIComponent(ds.q)); break; }
      case 'flag-q': S.flagQuestion(s, ds.id); persist(); renderMain(); toast('Question ajoutée à la conférence de la semaine.'); break;
      case 'copy-report': copyText(S.reportText(s, S.weeklyReport(s, +ds.end))); break;
      case 'send-report': {
        const rep = S.weeklyReport(s, +ds.end);
        const it = S.enqueue(s, { t: s.now, title: 'Synthèse de la semaine (' + f.day(rep.start) + ' à ' + f.day(rep.end) + ')', kind: 'rapport', prio: 3, kb: 60 + 12 * rep.points.length, reply: true, points: rep.points.map(p => p.text).slice(0, 2) });
        persist(); render();
        toast(it.arrAt ? 'Synthèse envoyée : arrivée au sol à ' + f.when(it.arrAt) + '.' : 'Synthèse mise en file : elle partira au retour de la liaison.');
        break;
      }
      case 'sensors': s.sim.sensors = !!el.checked; persist(); toast(s.sim.sensors ? 'Capteurs simulés activés.' : 'Capteurs simulés désactivés : seules vos saisies comptent.'); break;
      case 'reset':
        if (A.ui.confirmReset) {
          S.clear(); A.s = S.createState({}); resetForms(); A.plan.result = null; persist();
          A.ui = {}; go('#/'); toast('Démonstration réinitialisée.');
        } else { A.ui.confirmReset = true; el.textContent = 'Cliquer encore pour confirmer'; }
        break;
      case 'scenario': runScenario(ds.id); break;
      case 'demo-exit': s.scenario = null; persist(); render(); toast('Démonstration terminée. La mission continue.'); break;
      case 'spe-now': {
        s.events.push({ kind: 'spe', start: s.now + 1, end: s.now + 1 + 8 * 60, factor: 40 });
        const ev = S.advanceTo(s, s.now + 2);
        persist(); toastEvents(ev); go('#/alertes');
        break;
      }
      case 'drill': S.startEmergency(s, ds.kind, s.now, 'Exercice déclenché à bord'); persist(); render(); toast('Exercice : mode urgence activé.', 'urgence'); break;
      case 'drift': S.decideDrift(s, ds.id, ds.decision); persist(); render(); toast(ds.decision === 'valider' ? 'Nouvelle référence validée.' : 'Référence actuelle maintenue.'); break;
      case 'theme': A.theme = ds.theme; applyTheme(); renderMain(); break;
      default: break;
    }
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
        A.form.m = { a: get('a'), k: get('k') || A.form.m.k, v: get('v'), ctx, retakeOf: get('retakeOf') || null };
        doMeasure(); render();
        const r = $('result'); if (r && window.innerWidth < 980) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'symptom':
        A.form.sy = { a: get('a'), sym: get('sym') || A.form.sy.sym, intensity: +get('intensity') || 0, note: get('note') };
        doSymptom(); render();
        { const r = $('result'); if (r && window.innerWidth < 980) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        break;
      case 'administer': {
        const med = S.medById[get('med')];
        const rec = S.administer(s, { a: get('a'), med: get('med'), units: +get('units'), reason: 'Saisie à bord' });
        A.ui.admin = null; persist(); render();
        toast(rec ? med.name + ' : prise notée. Effet à noter à ' + f.clock(rec.due % DAY) + '.' : 'Stock insuffisant pour cette prise.');
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
        if (need.some(k => !get(k)) || get('sleep') === '') { toast('Répondez aux cinq questions avant d’enregistrer.'); return; }
        S.addWellbeing(s, { a: s.me, mood: +get('mood'), stress: +get('stress'), sleep: +get('sleep').replace(',', '.'), sq: +get('sq'), load: +get('load'), contact: !!fd.get('contact'), note: get('note').trim(), share: !!fd.get('share') });
        persist(); render(); toast('Point du jour enregistré.');
        break;
      }
      case 'ask': {
        const q = get('q').trim();
        if (!q) return;
        S.askQuestion(s, { a: s.me, q }, A.idx, KB); persist();
        go('#/questions?q=' + encodeURIComponent(q));
        break;
      }
      case 'conf-question': {
        const q = get('q').trim();
        if (!q) return;
        const r = S.askQuestion(s, { a: s.me, q }, A.idx, KB);
        S.flagQuestion(s, r.record.id); persist(); renderMain(); toast('Question ajoutée à la conférence.');
        break;
      }
      case 'message': {
        const it = S.sendMessage(s, { title: get('title').trim() || 'Message au médecin au sol', text: get('text').trim(), prio: +get('prio') || 2 });
        persist(); render();
        toast(it.arrAt ? 'Message parti : arrivée au sol à ' + f.when(it.arrAt) + '.' : 'Message en file : il partira au retour de la liaison.');
        break;
      }
      case 'goto-day': {
        const day = Math.max(1, Math.min(D.mission.durationDays - 1, parseInt(get('day'), 10) || D.mission.defaultDay));
        const role = s.role, me = s.me;
        A.s = S.createState({ day, minute: 9 * 60 });
        A.s.role = role; A.s.me = me;
        resetForms(); A.plan.result = null; persist(); render();
        toast('Mission recalculée jusqu’à ' + f.day(day) + '.');
        break;
      }
      default: break;
    }
  }

  function onChange(e) {
    const el = e.target, ch = el.getAttribute && el.getAttribute('data-change');
    if (!ch) return;
    if (ch === 'me') { A.s.me = el.value; A.form.m.a = el.value; A.form.sy.a = el.value; persist(); render(); return; }
    if (ch === 'form-m') {
      const fd = new FormData(el.form);
      const k = String(fd.get('k') || A.form.m.k);
      const ctx = {};
      fd.getAll('ctx').forEach(x => { ctx[x] = true; });
      A.form.m.a = String(fd.get('a') || A.form.m.a);
      A.form.m.v = String(fd.get('v') || '');
      if (k !== A.form.m.k) { A.form.m.k = k; A.form.m.v = ''; A.form.m.ctx = {}; } else A.form.m.ctx = ctx;
      const focusSel = el.name === 'k' ? 'input[name="k"][value="' + k + '"]' : '#m-a';
      renderMain();
      const again = document.querySelector(focusSel); if (again) again.focus();
      return;
    }
    if (ch === 'form-sy') {
      const fd = new FormData(el.form);
      A.form.sy.a = String(fd.get('a') || A.form.sy.a);
      A.form.sy.sym = String(fd.get('sym') || A.form.sy.sym);
    }
  }
  function onInput(e) {
    if (e.target.getAttribute && e.target.getAttribute('data-change') === 'intensity') {
      const o = $('s-io'); if (o) o.textContent = e.target.value;
      A.form.sy.intensity = +e.target.value;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Menu (petits écrans)                                                 */
  /* ------------------------------------------------------------------ */
  function toggleMenu() {
    const nav = $('nav');
    if (nav.classList.contains('open')) { closeMenu(); return; }
    nav.classList.add('open');
    const sc = document.createElement('div'); sc.className = 'scrim'; sc.id = 'scrim';
    document.body.appendChild(sc);
    const btn = document.querySelector('.menu-btn'); if (btn) btn.setAttribute('aria-expanded', 'true');
    const first = nav.querySelector('a'); if (first) first.focus();
  }
  function closeMenu() {
    const nav = $('nav'); if (nav) nav.classList.remove('open');
    const sc = $('scrim'); if (sc) sc.parentNode.removeChild(sc);
    const btn = document.querySelector('.menu-btn'); if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                            */
  /* ------------------------------------------------------------------ */
  function init() {
    A.theme = readTheme(); applyTheme();
    A.s = S.load() || S.createState({});
    resetForms();
    window.addEventListener('hashchange', onRoute);
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); UI.tipHide(); } });
    window.addEventListener('online', () => renderTop());
    window.addEventListener('offline', () => { renderTop(); toast('Connexion perdue : AURA continue de fonctionner à bord.'); });
    let lastW = UI.contentWidth(), timer = null;
    window.addEventListener('resize', () => {
      const top = $('top'); if (top) document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px');
      clearTimeout(timer);
      timer = setTimeout(() => { const w = UI.contentWidth(); if (Math.abs(w - lastW) > 40) { lastW = w; renderMain(); } }, 200);
    });
    onRoute();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* le site reste utilisable */ });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof self !== 'undefined' ? self : this);
