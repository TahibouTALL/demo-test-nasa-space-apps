/* AURA : état de la plateforme et simulation de la mission.
   Toutes les actions de l’équipage et du médecin passent par ici, puis par
   le moteur (engine.js). L’horloge est l’heure de bord, en minutes depuis
   le départ. Les capteurs sont simulés de façon reproductible : la même
   graine donne toujours la même mission. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'), require('./engine.js'));
  else root.AURA_STORE = factory(root.AURA_DATA, root.AURA_ENGINE);
})(typeof self !== 'undefined' ? self : this, function (DATA, E) {
  'use strict';

  const VERSION = 4;
  const KEY = 'aura.etat.v4';
  const SEED = 20261114;
  const DAY = 1440;
  const METRIC_IDS = ['temp', 'hr', 'spo2'];
  const M = DATA.mission;

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                         */
  /* ------------------------------------------------------------------ */
  const crewById = {};
  DATA.crew.forEach(c => { crewById[c.id] = c; });
  const medById = {};
  DATA.meds.forEach(m => { medById[m.id] = m; });
  const symptomById = {};
  DATA.symptoms.forEach(x => { symptomById[x.id] = x; });

  function name(id) { return crewById[id] ? crewById[id].name : 'Équipage'; }
  function nextId(s, p) { s.seq += 1; return p + s.seq.toString(36); }
  function dayOf(t) { return Math.floor(t / DAY); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function round1(v) { return Math.round(v * 10) / 10; }
  function log(s, t, type, text, a) {
    s.journal.unshift({ t, type, text, a: a || null });
    if (s.journal.length > 400) s.journal.length = 400;
  }

  /* ------------------------------------------------------------------ */
  /* Événements du passé de la mission (appliqués à la création)          */
  /* ------------------------------------------------------------------ */
  const HISTORY = [
    { d: 1, m: 9 * 60, kind: 'symptom', a: 'a2', sym: 'nausee', intensity: 5 },
    { d: 1, m: 9 * 60 + 12, kind: 'admin', a: 'a2', med: 'promethazine', effect: 'complet' },
    { d: 2, m: 8 * 60, kind: 'symptom', a: 'a4', sym: 'dos', intensity: 4 },
    { d: 2, m: 8 * 60 + 6, kind: 'admin', a: 'a4', med: 'ibuprofene', effect: 'partiel' },
    { d: 3, m: 8 * 60, kind: 'admin', a: 'a4', med: 'ibuprofene', effect: 'complet' },
    { d: 4, m: 22 * 60, kind: 'admin', a: 'a1', med: 'melatonine', effect: 'complet' },
    { d: 12, m: 22 * 60, kind: 'admin', a: 'a3', med: 'zolpidem', effect: 'complet' },
    { d: 19, m: 14 * 60, kind: 'admin', a: 'a4', med: 'paracetamol', effect: 'partiel' },
    { d: 30, kind: 'co2', start: 4 * 60, end: 16 * 60, peak: 4.6 },
    { d: 30, m: 10 * 60, kind: 'symptom', a: 'a4', sym: 'cephalee', intensity: 5 },
    { d: 30, m: 10 * 60 + 20, kind: 'admin', a: 'a4', med: 'paracetamol', effect: 'partiel' },
    { d: 41, m: 15 * 60, kind: 'admin', a: 'a4', med: 'paracetamol', effect: 'partiel' },
    { d: 50, m: 22 * 60, kind: 'admin', a: 'a3', med: 'zolpidem', effect: 'partiel' },
    { d: 53, m: 22 * 60, kind: 'admin', a: 'a3', med: 'zolpidem', effect: 'partiel' },
    { d: 56, m: 22 * 60, kind: 'admin', a: 'a3', med: 'zolpidem', effect: 'aucun' }
  ];

  /* ------------------------------------------------------------------ */
  /* Création de l’état                                                   */
  /* ------------------------------------------------------------------ */
  function blank(seed) {
    const filters = {};
    DATA.crew.forEach(c => {
      filters[c.id] = {};
      METRIC_IDS.forEach(k => { filters[c.id][k] = E.initFilter(DATA.metrics[k], c.pre[k]); });
    });
    const stock = {}, factor = {};
    DATA.meds.forEach(m => { stock[m.id] = m.stock; factor[m.id] = { f: 1, note: '', t: null }; });
    return {
      v: VERSION, seed: seed || SEED, now: 0, role: 'crew', me: 'a2',
      filters, meas: [], hab: [], radTotal: 0,
      alerts: [], emergency: null, todo: [],
      stock, factor, admins: [], symptoms: [], wb: [],
      queue: [], inbox: [], vals: [], questions: [], journal: [],
      events: [], seq: 1, sim: { sensors: true }, scenario: null, creating: false
    };
  }

  function createState(opts) {
    opts = opts || {};
    const day = opts.day !== undefined ? opts.day : M.defaultDay;
    const minute = opts.minute !== undefined ? opts.minute : M.defaultMinute;
    const target = day * DAY + minute;
    const s = blank(opts.seed);
    s.creating = true;
    log(s, 0, 'mission', 'Départ de la mission. Références d’avant vol chargées pour les quatre membres d’équipage.');
    // Les événements passés programmés jusqu’à la cible
    const hist = HISTORY.filter(h => h.kind === 'co2' ? (h.d * DAY + h.start) <= target : (h.d * DAY + h.m) < target);
    hist.filter(h => h.kind === 'co2').forEach(h => s.events.push({ kind: 'co2', start: h.d * DAY + h.start, end: h.d * DAY + h.end, peak: h.peak }));
    const timed = hist.filter(h => h.kind !== 'co2').map(h => Object.assign({ at: h.d * DAY + h.m }, h)).sort((a, b) => a.at - b.at);
    let cursor = 0;
    for (const h of timed) {
      advanceTo(s, h.at);
      applyHistory(s, h);
      cursor = h.at;
    }
    advanceTo(s, Math.max(cursor, target));
    s.creating = false;
    // Un mode urgence ancien a forcément été terminé par l’équipage.
    if (s.emergency && s.now - s.emergency.t > 6 * 60) {
      log(s, s.emergency.t + 60, 'urgence', 'Fin du mode urgence (' + s.emergency.title + ') après contrôle.');
      s.emergency = null;
    }
    // Les vigilances anciennes sont closes, comme le ferait le médecin.
    s.alerts.forEach(al => {
      if (al.st !== 'close' && s.now - al.t > 2 * DAY) { al.st = 'close'; al.closeT = al.t + DAY; al.closeNote = 'Revue lors de la conférence hebdomadaire.'; }
    });
    s.todo = s.todo.filter(td => s.now - td.t < DAY);
    return s;
  }

  function applyHistory(s, h) {
    if (h.kind === 'symptom') {
      reportSymptom(s, { a: h.a, sym: h.sym, intensity: h.intensity, t: h.at, note: '' });
    } else if (h.kind === 'admin') {
      const rec = administer(s, { a: h.a, med: h.med, t: h.at, reason: 'Selon protocole' });
      if (rec && h.effect) recordEffect(s, rec.id, h.effect, '', rec.due + 5);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Habitat simulé                                                      */
  /* ------------------------------------------------------------------ */
  function co2At(s, t) {
    const day = dayOf(t), m = ((t % DAY) + DAY) % DAY;
    const r = E.rng(E.seedFor(s.seed, 'co2', day, Math.floor(m / 60)));
    let v = 2.15 + 0.25 * Math.sin(2 * Math.PI * (m / DAY - 0.35)) + 0.15 * Math.sin(day / 9) + 0.1 * E.gauss(r);
    for (const ev of s.events) {
      if (ev.kind !== 'co2') continue;
      if (t >= ev.start && t < ev.end + 90) {
        const rise = clamp((t - ev.start) / 120, 0, 1);
        const fall = t > ev.end ? clamp(1 - (t - ev.end) / 90, 0, 1) : 1;
        v += (ev.peak - 2.3) * rise * fall;
      }
    }
    return Math.max(0.4, v);
  }
  function co2Hours(s, from, to) {
    let h = 0;
    for (let t = Math.ceil(from / 60) * 60; t < to; t += 60) if (co2At(s, t) > DATA.habitat.co2.limit) h++;
    return h;
  }
  function speAt(s, t) {
    return s.events.find(ev => ev.kind === 'spe' && t >= ev.start && t < ev.end) || null;
  }
  function doseRateAt(s, t) {
    const base = E.radiationRate(M, DATA.habitat, t / DAY);
    const spe = speAt(s, t);
    return base * (spe ? spe.factor : 1);
  }
  function doseBetween(s, from, to) {
    // mSv reçus entre deux instants (pas de 10 minutes), abri pris en compte
    let total = 0;
    const step = 10;
    for (let t = from; t < to; t += step) {
      const dt = Math.min(step, to - t);
      const base = E.radiationRate(M, DATA.habitat, t / DAY) / DAY;
      const spe = speAt(s, t);
      let extra = 0;
      if (spe) {
        const sheltered = s.emergency && s.emergency.kind === 'spe' && t >= s.emergency.t;
        extra = base * (spe.factor - 1) * (sheltered ? 0.5 : 1);
      }
      total += (base + extra) * dt;
    }
    return total;
  }
  function closeDay(s, d) {
    if (s.hab.find(h => h.d === d)) return;
    let sum = 0, max = 0;
    for (let h = 0; h < 24; h++) { const v = co2At(s, d * DAY + h * 60 + 30); sum += v; max = Math.max(max, v); }
    const rad = doseBetween(s, d * DAY, (d + 1) * DAY);
    s.radTotal += rad;
    s.hab.push({ d, co2m: round1(sum / 24 * 10) / 10, co2x: Math.round(max * 100) / 100, co2h: co2Hours(s, d * DAY, (d + 1) * DAY), rad: Math.round(rad * 1000) / 1000, spe: s.events.some(ev => ev.kind === 'spe' && ev.start < (d + 1) * DAY && ev.end > d * DAY) ? 1 : 0 });
  }
  function radTotalNow(s) {
    return s.radTotal + doseBetween(s, dayOf(s.now) * DAY, s.now);
  }

  /* ------------------------------------------------------------------ */
  /* Avancer le temps                                                     */
  /* ------------------------------------------------------------------ */
  function dailyPlan(d) {
    const plan = [{ m: 7 * 60, kind: 'mesures' }, { m: 21 * 60, kind: 'bienetre' }, { m: 22 * 60, kind: 'paquet' }];
    if (d > 0 && d % 7 === 0) plan.push({ m: 18 * 60, kind: 'rapport' });
    return plan;
  }

  function advanceTo(s, target) {
    const out = [];
    if (target <= s.now) return out;
    let t = s.now;
    while (t < target) {
      const d = dayOf(t);
      const dayEnd = (d + 1) * DAY;
      const stepEnd = Math.min(target, dayEnd);
      // Tâches horodatées dans l’intervalle ]t, stepEnd]
      const tasks = [];
      dailyPlan(d).forEach(p => { const te = d * DAY + p.m; if (te > t && te <= stepEnd) tasks.push({ te, kind: p.kind }); });
      for (let h = Math.floor(t / 60) + 1; h * 60 <= stepEnd; h++) tasks.push({ te: h * 60, kind: 'heure' });
      s.events.forEach(ev => {
        if (ev.kind === 'spe' && ev.start > t && ev.start <= stepEnd) tasks.push({ te: ev.start, kind: 'spe-debut', ev });
        if (ev.kind === 'spe' && ev.end > t && ev.end <= stepEnd) tasks.push({ te: ev.end, kind: 'spe-fin', ev });
      });
      s.todo.forEach(td => { if (td.kind === 'reprise-auto' && td.at > t && td.at <= stepEnd) tasks.push({ te: td.at, kind: 'reprise-auto', td }); });
      tasks.sort((a, b) => a.te - b.te);
      for (const task of tasks) {
        s.now = task.te;
        runTask(s, task, out);
      }
      if (stepEnd === dayEnd) closeDay(s, d);
      t = stepEnd;
      s.now = t;
    }
    s.now = target;
    refreshQueue(s);
    // Suivis après une prise arrivés à échéance
    s.admins.forEach(ad => { if (!ad.effect && !ad.notified && ad.due <= s.now) { ad.notified = true; out.push({ kind: 'suivi', text: 'Effet de ' + medById[ad.med].name + ' à noter pour ' + name(ad.a) + '.' }); } });
    return out;
  }

  function runTask(s, task, out) {
    const d = dayOf(task.te);
    switch (task.kind) {
      case 'mesures':
        if (s.sim.sensors) simulateMorning(s, d, task.te, out);
        break;
      case 'bienetre':
        simulateWellbeing(s, d, task.te);
        break;
      case 'paquet':
        enqueue(s, { t: task.te, title: 'Données de santé du jour (' + E.fmt.day(d) + ')', kind: 'donnees', prio: 3, kb: 180, reply: false });
        break;
      case 'rapport': {
        const rep = weeklyReport(s, d);
        enqueue(s, { t: task.te, title: 'Rapport médical hebdomadaire (' + E.fmt.day(rep.start) + ' à ' + E.fmt.day(rep.end) + ')', kind: 'rapport', prio: 3, kb: 60 + 12 * rep.points.length, reply: true, points: rep.points.map(p => p.text).slice(0, 2) });
        log(s, task.te, 'rapport', 'Rapport hebdomadaire préparé et mis en file vers la Terre.');
        break;
      }
      case 'heure':
        checkCo2(s, task.te, out);
        break;
      case 'spe-debut':
        startSpe(s, task.ev, task.te, out);
        break;
      case 'spe-fin':
        endSpe(s, task.ev, task.te, out);
        break;
      case 'reprise-auto': {
        const td = task.td;
        s.todo = s.todo.filter(x => x !== td);
        const truthV = sensorValue(s, td.a, td.k, d, 'reprise');
        const res = addMeasurement(s, { a: td.a, k: td.k, v: truthV, t: task.te, src: 'sim', retakeOf: td.ref });
        if (res.status === 'processed') out.push({ kind: 'mesure', text: 'Mesure reprise pour ' + name(td.a) + ' : ' + E.fmt.unit(truthV, DATA.metrics[td.k]) + '.' });
        break;
      }
      default: break;
    }
  }

  function sensorValue(s, a, k, d, salt) {
    const c = crewById[a];
    const r = E.rng(E.seedFor(s.seed, 'capteur', a, k, d, salt || ''));
    const cfg = DATA.metrics[k];
    if (k === 'temp') return round1(c.pre.temp.mean + c.truth.tempRise * (1 - Math.exp(-d / 30)) + E.gauss(r) * cfg.withinSd);
    if (k === 'hr') return Math.round(c.truth.hr + E.gauss(r) * 3.2);
    return Math.min(100, Math.round(c.truth.spo2 + E.gauss(r) * 0.6));
  }

  function simulateMorning(s, d, te, out) {
    let n = 0, abnormal = 0;
    DATA.crew.forEach((c, i) => {
      METRIC_IDS.forEach((k, j) => {
        const t = te + i * 3 + j;
        const r = E.rng(E.seedFor(s.seed, 'incident', c.id, k, d));
        const roll = r();
        let v = sensorValue(s, c.id, k, d);
        if (roll < 0.006) v = null;                                   // capteur muet
        else if (roll < 0.009) v = k === 'temp' ? 45.3 : k === 'hr' ? 0 : 12; // valeur impossible
        else if (roll < 0.016 && k === 'spo2') v = 91;                // capteur mal placé
        const res = addMeasurement(s, { a: c.id, k, v, t, src: 'sim' });
        n++;
        if (res.ev && res.ev.level !== 'normal' && res.status === 'processed') abnormal++;
        if (res.status === 'retake') s.todo.push({ id: nextId(s, 'r'), kind: 'reprise-auto', a: c.id, k, ref: res.record.id, t, at: t + 10 });
      });
    });
    if (!s.creating) out.push({ kind: 'mesures', text: n + ' mesures du matin traitées' + (abnormal ? ', dont ' + abnormal + ' hors plage.' : ', toutes dans la plage attendue.') });
  }

  function simulateWellbeing(s, d, te) {
    DATA.crew.forEach((c, i) => {
      const t = te + i * 4;
      if (s.wb.find(w => w.a === c.id && dayOf(w.t) === d)) return;
      const r = E.rng(E.seedFor(s.seed, 'bienetre', c.id, d));
      let sleep = c.wb.sleep + E.gauss(r) * 0.45;
      if (c.sleepDecline && d >= c.sleepDecline.from) {
        const u = clamp((d - c.sleepDecline.from) / 10, 0, 1);
        sleep = c.wb.sleep + (c.sleepDecline.to - c.wb.sleep) * u + E.gauss(r) * 0.3;
      }
      if (co2Hours(s, d * DAY, (d + 1) * DAY) > 4) sleep -= 0.4;
      const mood = clamp(Math.round(c.wb.mood + E.gauss(r) * 0.55 - (c.sleepDecline && d >= c.sleepDecline.from + 5 ? 0.6 : 0)), 1, 5);
      s.wb.push({
        id: nextId(s, 'w'), t, a: c.id,
        mood, stress: clamp(Math.round(c.wb.stress + E.gauss(r) * 0.6), 1, 5),
        sleep: Math.round(clamp(sleep, 3, 9) * 4) / 4, sq: clamp(Math.round(3.4 + E.gauss(r) * 0.7 - (sleep < 5.5 ? 1 : 0)), 1, 5),
        load: clamp(Math.round(c.wb.load + E.gauss(r) * 0.7), 1, 5), contact: r() < 0.55 ? 1 : 0, note: '', share: 0, src: 'sim'
      });
    });
    if (s.wb.length > 4000) s.wb.splice(0, s.wb.length - 4000);
  }

  function checkCo2(s, t, out) {
    const v = co2At(s, t);
    const cfg = DATA.habitat.co2;
    const lvl = E.co2Level(cfg, v);
    const active = s.alerts.find(a => a.kind === 'co2' && a.st !== 'close');
    if (lvl === 'normal') {
      if (active) {
        active.st = 'close'; active.closeT = t; active.closeNote = 'Retour sous 3 mmHg à ' + E.fmt.clock(t % DAY) + '.';
        log(s, t, 'habitat', 'CO₂ cabine revenu sous la limite (' + E.fmt.num(v, 1) + ' mmHg).');
        out.push({ kind: 'habitat', text: 'CO₂ cabine revenu sous la limite.' });
      }
      return;
    }
    const title = lvl === 'urgence' ? 'CO₂ cabine critique' : 'CO₂ cabine au-dessus de la limite';
    const crew = 'Le CO₂ de la cabine est à ' + E.fmt.num(v, 1) + E.NBSP + 'mmHg (limite 3' + E.NBSP + 'mmHg). Vérifiez la ventilation. Un CO₂ élevé donne souvent des maux de tête.';
    const doctor = 'ppCO₂ sur 1 h = ' + E.fmt.num(v, 2) + ' mmHg > 3 mmHg (NASA-STD-3001 V2 6004). Risque de céphalée multiplié par environ 2 par mmHg (Law et al., 2014).';
    if (active) {
      active.crew = crew; active.doctor = doctor;
      if (lvl === 'urgence' && active.lv !== 'urgence') { active.lv = 'urgence'; active.title = title; startEmergency(s, 'co2', t, 'CO₂ cabine à ' + E.fmt.num(v, 1) + ' mmHg'); }
      return;
    }
    raiseAlert(s, { t, lv: lvl, kind: 'co2', a: null, title, crew, doctor });
    log(s, t, 'habitat', 'CO₂ cabine à ' + E.fmt.num(v, 1) + ' mmHg, au-dessus de la limite de 3 mmHg.');
    out.push({ kind: 'habitat', text: title + ' (' + E.fmt.num(v, 1) + ' mmHg).' });
    if (lvl === 'urgence') startEmergency(s, 'co2', t, 'CO₂ cabine à ' + E.fmt.num(v, 1) + ' mmHg');
  }

  function startSpe(s, ev, t, out) {
    const rate = doseRateAt(s, t);
    raiseAlert(s, {
      t, lv: 'urgence', kind: 'radiation', a: null, title: 'Éruption solaire en cours',
      crew: 'Le rayonnement est ' + ev.factor + ' fois plus fort que d’habitude. Rejoignez l’abri maintenant et suivez la procédure.',
      doctor: 'Débit de dose ' + E.fmt.num(rate, 1) + ' mSv/j équivalent (× ' + ev.factor + ' le nominal). L’abri réduit d’environ moitié la dose des particules solaires (NASA OCHMO).'
    });
    startEmergency(s, 'spe', t, 'Débit de dose multiplié par ' + ev.factor);
    log(s, t, 'radiation', 'Éruption solaire détectée : débit de dose × ' + ev.factor + '. Mode urgence activé.');
    out.push({ kind: 'urgence', text: 'Éruption solaire : mode urgence activé.' });
  }
  function endSpe(s, ev, t, out) {
    const al = s.alerts.find(a => a.kind === 'radiation' && a.st !== 'close');
    if (al) { al.st = 'close'; al.closeT = t; al.closeNote = 'Fin de l’éruption : débit de dose revenu à la normale.'; }
    if (s.emergency && s.emergency.kind === 'spe') s.emergency.over = t;
    log(s, t, 'radiation', 'Fin de l’éruption solaire : le débit de dose est revenu à la normale. La sortie de l’abri est possible.');
    out.push({ kind: 'radiation', text: 'Fin de l’éruption : vous pouvez quitter l’abri.' });
  }

  /* ------------------------------------------------------------------ */
  /* Alertes et mode urgence                                              */
  /* ------------------------------------------------------------------ */
  function raiseAlert(s, o) {
    const al = Object.assign({ id: nextId(s, 'al'), st: 'active' }, o);
    s.alerts.unshift(al);
    if (s.alerts.length > 300) s.alerts.length = 300;
    return al;
  }
  function seeAlert(s, id) {
    const al = s.alerts.find(a => a.id === id);
    if (al && al.st === 'active') { al.st = 'vue'; al.seenT = s.now; }
    return al;
  }
  function closeAlert(s, id, note) {
    const al = s.alerts.find(a => a.id === id);
    if (!al) return null;
    al.st = 'close'; al.closeT = s.now; al.closeNote = note || 'Close par le médecin de bord.';
    log(s, s.now, 'alerte', 'Alerte close : ' + al.title + (note ? ' (' + note + ')' : '') + '.', al.a);
    return al;
  }
  function startEmergency(s, kind, t, cause) {
    if (s.emergency && !s.emergency.end) return s.emergency;
    const p = DATA.protocols[kind];
    s.emergency = { kind, t, cause, title: p.title, steps: p.steps.map(label => ({ label, done: false })), over: null, end: null };
    enqueue(s, { t, title: 'Alerte prioritaire : ' + p.title.toLowerCase() + ' (' + cause + ')', kind: 'alerte', prio: 1, kb: 12, reply: true });
    log(s, t, 'urgence', 'Mode urgence : ' + p.title + '. Message prioritaire mis en tête de file vers la Terre.');
    return s.emergency;
  }
  function toggleStep(s, i) {
    if (!s.emergency || !s.emergency.steps[i]) return;
    const st = s.emergency.steps[i];
    st.done = !st.done; st.t = s.now;
    if (st.done) log(s, s.now, 'urgence', 'Procédure : « ' + st.label + ' » fait.');
  }
  function endEmergency(s) {
    if (!s.emergency) return;
    log(s, s.now, 'urgence', 'Fin du mode urgence (' + s.emergency.title + '), ' + s.emergency.steps.filter(x => x.done).length + ' étapes sur ' + s.emergency.steps.length + ' faites.');
    s.emergency = null;
  }

  /* ------------------------------------------------------------------ */
  /* Mesures                                                             */
  /* ------------------------------------------------------------------ */
  function addMeasurement(s, o) {
    const cfg = DATA.metrics[o.k];
    const t = o.t !== undefined ? o.t : s.now;
    const f = s.filters[o.a][o.k];
    const ctx = o.ctx || {};
    const res = E.processMeasurement(cfg, f, { t: t / DAY, value: o.v, context: ctx, retake: !!o.retakeOf });
    const rec = {
      id: nextId(s, 'm'), t, a: o.a, k: o.k, v: o.v === null || o.v === undefined || o.v === '' ? null : Number(o.v),
      st: res.status, src: o.src || 'saisie'
    };
    const ctxKeys = Object.keys(ctx).filter(x => ctx[x]);
    if (ctxKeys.length) rec.cx = ctxKeys;
    if (o.retakeOf) rec.rt = o.retakeOf;
    const out = { status: res.status, record: rec, ev: res.ev, absorbed: res.absorbed, flags: res.flags, alert: null };

    if (res.status === 'missing') {
      if (o.src === 'sim') log(s, t, 'mesure', 'Donnée absente (' + cfg.lc + ', ' + name(o.a) + ') : la plateforme continue avec la dernière référence.', o.a);
      return out; // rien n’est enregistré
    }
    if (res.status === 'rejected') {
      log(s, t, 'mesure', 'Valeur impossible ignorée (' + cfg.lc + ' ' + rec.v + ' ' + cfg.unit + ', ' + name(o.a) + ').', o.a);
      return out;
    }
    const ev = res.ev;
    rec.lv = ev.level; rec.z = Math.round(ev.z * 100) / 100; rec.c = Math.round(ev.center * 1000) / 1000; rec.sd = Math.round(ev.sd * 1000) / 1000;
    rec.terr = ev.terrestrial.level;
    out.layers = E.layers(cfg, f, ev, t / DAY);
    out.text = E.describe(cfg, ev, out.layers, { absorbed: res.absorbed });
    out.action = DATA.measureActions[o.k][ev.level];
    s.meas.push(rec);

    if (res.status === 'retake') {
      if (o.src !== 'sim') s.todo.push({ id: nextId(s, 'r'), kind: 'reprise', a: o.a, k: o.k, ref: rec.id, t });
      log(s, t, 'mesure', cfg.short + ' de ' + name(o.a) + ' très éloignée des mesures récentes (' + E.fmt.unit(rec.v, cfg) + ') : nouvelle mesure demandée avant toute alerte.', o.a);
      return out;
    }
    rec.ab = res.absorbed ? 1 : 0;
    s.filters[o.a][o.k] = res.filter;
    s.todo = s.todo.filter(td => !(td.kind === 'reprise' && td.a === o.a && td.k === o.k));

    const key = o.a + ':' + o.k;
    const active = s.alerts.find(al => al.kind === 'mesure' && al.ref === key && al.st !== 'close');
    if (ev.level === 'normal') {
      if (active && active.lv === 'vigilance') { active.st = 'close'; active.closeT = t; active.closeNote = 'Mesure suivante dans la plage attendue.'; }
    } else {
      const title = (ev.level === 'urgence' ? 'Alerte : ' : 'Vigilance : ') + cfg.lc + ' de ' + name(o.a);
      const crewTxt = out.text.crew + ' ' + out.action.crew;
      const docTxt = out.text.doctor + ' ' + out.action.doctor;
      if (active && (active.lv === ev.level || active.lv === 'urgence')) {
        active.t = t; active.crew = crewTxt; active.doctor = docTxt; active.v = rec.v; out.alert = active;
      } else {
        if (active) { active.st = 'close'; active.closeT = t; active.closeNote = 'Remplacée par une alerte plus élevée.'; }
        out.alert = raiseAlert(s, { t, lv: ev.level, kind: 'mesure', a: o.a, k: o.k, ref: key, title, crew: crewTxt, doctor: docTxt, v: rec.v });
      }
      log(s, t, 'mesure', cfg.short + ' de ' + name(o.a) + ' : ' + E.fmt.unit(rec.v, cfg) + ', ' + (ev.level === 'urgence' ? 'alerte' : 'vigilance') + ' (z = ' + E.fmt.signed(ev.z, 1) + ').', o.a);
      if (ev.hard) startEmergency(s, 'vital', t, cfg.short + ' de ' + name(o.a) + ' : ' + E.fmt.unit(rec.v, cfg));
    }
    if (res.flags.indexOf('drift') >= 0) {
      s.vals.unshift({ id: nextId(s, 'v'), t, kind: 'derive', a: o.a, k: o.k, st: 'ouverte', drift: res.filter.drift });
      log(s, t, 'mesure', 'Décalage persistant de la ' + cfg.lc + ' de ' + name(o.a) + ' : validation du médecin demandée.', o.a);
    }
    if (o.src !== 'sim') log(s, t, 'mesure', 'Mesure saisie : ' + cfg.lc + ' ' + E.fmt.unit(rec.v, cfg) + ' pour ' + name(o.a) + ', ' + (ev.level === 'normal' ? 'dans la plage attendue' : 'hors plage') + '.', o.a);
    if (s.meas.length > 7000) s.meas.splice(0, s.meas.length - 7000);
    return out;
  }

  function decideDrift(s, id, decision) {
    const v = s.vals.find(x => x.id === id);
    if (!v || v.st !== 'ouverte') return null;
    const cfg = DATA.metrics[v.k];
    if (decision === 'valider') s.filters[v.a][v.k] = E.validateDrift(cfg, s.filters[v.a][v.k], s.now / DAY);
    else s.filters[v.a][v.k] = E.maintainDrift(s.filters[v.a][v.k]);
    v.st = decision === 'valider' ? 'validee' : 'maintenue'; v.dt = s.now;
    log(s, s.now, 'medecin', (decision === 'valider' ? 'Nouvelle référence validée' : 'Référence maintenue') + ' pour la ' + cfg.lc + ' de ' + name(v.a) + '.', v.a);
    return v;
  }

  /* ------------------------------------------------------------------ */
  /* Symptômes                                                           */
  /* ------------------------------------------------------------------ */
  function lastTransition(day) {
    let last = null;
    M.gravityTransitions.forEach(d => { if (d <= day) last = d; });
    return last;
  }
  function symptomContext(s, a, t) {
    t = t === undefined ? s.now : t;
    const day = t / DAY;
    const wb = s.wb.filter(w => w.a === a && w.t <= t);
    const lastWb = wb.length ? wb[wb.length - 1] : null;
    const an = E.analyzeWellbeing(wb, Math.floor(day));
    const temps = s.meas.filter(m => m.a === a && m.k === 'temp' && m.st === 'processed' && m.t <= t);
    const lt = temps.length ? temps[temps.length - 1] : null;
    const tr = lastTransition(Math.floor(day));
    return {
      day, t,
      co2Now: co2At(s, t),
      co2Hours: co2Hours(s, t - DAY, t),
      sleepLast: lastWb && t - lastWb.t < 1.5 * DAY ? lastWb.sleep : null,
      sleep7: an.sleep7,
      daysSinceTransition: tr === null ? null : day - tr,
      lastTemp: lt && t - lt.t < 12 * 60 ? { value: lt.v, level: lt.lv, z: lt.z, ago: t - lt.t } : null
    };
  }
  function reportSymptom(s, o) {
    const t = o.t !== undefined ? o.t : s.now;
    const ctx = symptomContext(s, o.a, t);
    ctx.intensity = o.intensity;
    const an = E.analyzeSymptom(o.sym, ctx, DATA);
    const rec = { id: nextId(s, 's'), t, a: o.a, sym: o.sym, intensity: o.intensity || 0, note: o.note || '', level: an.level };
    s.symptoms.push(rec);
    const sy = symptomById[o.sym];
    log(s, t, 'symptome', sy.label + ' signalé par ' + name(o.a) + (o.intensity ? ' (intensité ' + o.intensity + ' sur 10)' : '') + '.', o.a);
    let alert = null;
    if (an.notify) {
      alert = raiseAlert(s, { t, lv: 'vigilance', kind: 'symptome', a: o.a, ref: o.a + ':' + o.sym, title: 'Symptôme à voir : ' + sy.label.toLowerCase() + ' (' + name(o.a) + ')', crew: an.crewAdvice.join(' '), doctor: an.findings.map(x => x.doctor).join(' ') + ' ' + an.doctorAdvice.join(' ') });
    }
    return { record: rec, analysis: an, ctx, alert, symptom: sy };
  }

  /* ------------------------------------------------------------------ */
  /* Pharmacie                                                           */
  /* ------------------------------------------------------------------ */
  function validatedUnits(s, medId) {
    return E.doseUnits(medById[medId], s.factor[medId].f);
  }
  function administer(s, o) {
    const med = medById[o.med];
    if (!med) return null;
    const t = o.t !== undefined ? o.t : s.now;
    const units = o.units !== undefined ? Number(o.units) : validatedUnits(s, o.med);
    if (s.stock[o.med] < units) return null;
    s.stock[o.med] = Math.round((s.stock[o.med] - units) * 10) / 10;
    const rec = { id: nextId(s, 'p'), t, a: o.a, med: o.med, units, f: s.factor[o.med].f, reason: o.reason || '', due: t + med.followUp, effect: null, side: '', notified: false };
    s.admins.push(rec);
    log(s, t, 'pharmacie', med.name + ' : ' + E.fmt.num(units, units % 1 ? 1 : 0) + ' ' + med.units + (units > 1 ? 's' : '') + ' pour ' + name(o.a) + '. Effet à noter à ' + E.fmt.clock(rec.due % DAY) + '.', o.a);
    if (s.admins.length > 2000) s.admins.splice(0, s.admins.length - 2000);
    return rec;
  }
  function recordEffect(s, id, effect, side, t) {
    const ad = s.admins.find(x => x.id === id);
    if (!ad) return null;
    ad.effect = effect; ad.side = side || ''; ad.et = t !== undefined ? t : s.now; ad.notified = true;
    const label = { aucun: 'aucun effet', partiel: 'effet partiel', complet: 'effet complet' }[effect];
    log(s, ad.et, 'pharmacie', 'Suivi : ' + medById[ad.med].name + ' chez ' + name(ad.a) + ', ' + label + (side ? ', effet indésirable signalé : ' + side : '') + '.', ad.a);
    return ad;
  }
  function setFactor(s, medId, f, note) {
    const old = s.factor[medId].f;
    s.factor[medId] = { f: Number(f), note: note || '', t: s.now };
    log(s, s.now, 'medecin', 'Dose validée de ' + medById[medId].name + ' : facteur ' + E.fmt.num(old, 2) + ' → ' + E.fmt.num(Number(f), 2) + (note ? ' (« ' + note + ' »)' : '') + '.');
    enqueue(s, { t: s.now, title: 'Changement de dose à confirmer : ' + medById[medId].name, kind: 'message', prio: 2, kb: 4, reply: true });
  }
  function responses(s, a, medId) {
    return E.responseSummary(s.admins.filter(x => x.a === a && x.med === medId));
  }
  function pendingFollowUps(s) {
    return s.admins.filter(x => !x.effect && x.due <= s.now);
  }

  /* ------------------------------------------------------------------ */
  /* Bien-être                                                           */
  /* ------------------------------------------------------------------ */
  function addWellbeing(s, o) {
    const d = dayOf(s.now);
    s.wb = s.wb.filter(w => !(w.a === o.a && dayOf(w.t) === d));
    const rec = { id: nextId(s, 'w'), t: s.now, a: o.a, mood: +o.mood, stress: +o.stress, sleep: +o.sleep, sq: +o.sq, load: +o.load, contact: o.contact ? 1 : 0, note: o.note || '', share: o.share ? 1 : 0, src: 'saisie' };
    s.wb.push(rec);
    log(s, s.now, 'bienetre', 'Point du jour enregistré par ' + name(o.a) + '.', o.a);
    return { record: rec, analysis: E.analyzeWellbeing(s.wb.filter(w => w.a === o.a), d) };
  }

  /* ------------------------------------------------------------------ */
  /* Liaison avec la Terre                                                */
  /* ------------------------------------------------------------------ */
  function enqueue(s, o) {
    const it = Object.assign({ id: nextId(s, 'q'), sentAt: null, arrAt: null, status: 'en attente', replied: false }, o);
    s.queue.push(it);
    refreshQueue(s);
    return it;
  }
  function replyFor(it, gs, arr) {
    let text;
    if (it.kind === 'alerte') text = 'Alerte reçue. Le médecin au sol confirme la procédure engagée à bord. Envoyez un point de situation dans une heure.';
    else if (it.kind === 'rapport') text = 'Rapport reçu.' + (it.points && it.points.length ? ' Point retenu pour la conférence : ' + it.points[0].charAt(0).toLowerCase() + it.points[0].slice(1) : ' Rien à signaler côté médecin au sol.');
    else if (it.title.indexOf('dose') >= 0) text = 'Changement de dose noté. Le médecin au sol le confirmera lors de la prochaine conférence.';
    else text = 'Message reçu. Le médecin au sol vous répond lors de la prochaine conférence.';
    return { id: 'g' + it.id, t: gs, arrAt: arr, title: 'Réponse : ' + it.title, text, from: 'Médecin au sol (réponse simulée)', read: false, status: 'en route' };
  }
  function refreshQueue(s) {
    E.processQueue(M, s.queue, s.inbox, s.now, replyFor);
    // On garde l’historique récent seulement
    const limit = s.now - 30 * DAY;
    s.queue = s.queue.filter(it => !(it.status === 'reçu' && it.arrAt < limit));
    s.inbox = s.inbox.filter(m => !(m.status === 'reçu' && m.arrAt < limit));
  }
  function sendMessage(s, o) {
    const it = enqueue(s, { t: s.now, title: o.title || 'Message au médecin au sol', text: o.text || '', kind: 'message', prio: o.prio || 2, kb: Math.max(1, Math.round((o.text || '').length / 500)), reply: true });
    log(s, s.now, 'liaison', 'Message mis en file vers la Terre : « ' + it.title + ' ».');
    return it;
  }

  /* ------------------------------------------------------------------ */
  /* Questions (recherche documentaire)                                   */
  /* ------------------------------------------------------------------ */
  function askQuestion(s, o, index, KB) {
    const r = E.search(index, o.q, KB.synonyms, 3);
    const rec = { id: nextId(s, 'k'), t: s.now, a: o.a, q: o.q, cards: r.results.map(x => x.id), conf: 0 };
    s.questions.unshift(rec);
    if (s.questions.length > 200) s.questions.length = 200;
    return { record: rec, search: r };
  }
  function flagQuestion(s, id) {
    const q = s.questions.find(x => x.id === id);
    if (q) { q.conf = 1; log(s, s.now, 'question', 'Question ajoutée à la conférence : « ' + q.q + ' ».', q.a); }
    return q;
  }

  /* ------------------------------------------------------------------ */
  /* Séries pour les graphiques                                           */
  /* ------------------------------------------------------------------ */
  function series(s, a, k, fromDay) {
    const from = (fromDay || 0) * DAY;
    return s.meas.filter(m => m.a === a && m.k === k && m.st === 'processed' && m.t >= from);
  }
  function lastMeasurement(s, a, k) {
    for (let i = s.meas.length - 1; i >= 0; i--) {
      const m = s.meas[i];
      if (m.a === a && m.k === k && m.st === 'processed') return m;
    }
    return null;
  }
  // Réévalue une mesure passée pour l’afficher (bande, couches, textes)
  function explain(s, rec) {
    const cfg = DATA.metrics[rec.k];
    const ev = {
      value: rec.v, center: rec.c, sd: rec.sd, z: rec.z, zEff: cfg.oneSided === 'low' ? Math.min(0, rec.z) : rec.z, level: rec.lv,
      hard: null, terrestrial: E.terrestrialReading(cfg, rec.v), context: E.contextAdjust(cfg, (rec.cx || []).reduce((o, k) => { o[k] = true; return o; }, {}))
    };
    if (cfg.hard.high !== null && rec.v > cfg.hard.high) ev.hard = 'high';
    if (cfg.hard.low !== null && rec.v < cfg.hard.low) ev.hard = 'low';
    const half = (x) => cfg.oneSided === 'low' ? [x[0], Math.min(x[1], cfg.plausible.max)] : x;
    ev.band = half([rec.c - E.Z_NORMAL * rec.sd, rec.c + E.Z_NORMAL * rec.sd]);
    ev.wide = half([rec.c - E.Z_ALERT * rec.sd, rec.c + E.Z_ALERT * rec.sd]);
    ev.predicted = rec.c - ev.context.offset;
    const f = s.filters[rec.a][rec.k];
    const lay = E.layers(cfg, f, ev, rec.t / DAY);
    // n au moment de la mesure : on compte les mesures intégrées avant elle
    lay.n = s.meas.filter(m => m.a === rec.a && m.k === rec.k && m.ab === 1 && m.t < rec.t).length;
    return { ev, layers: lay, text: E.describe(cfg, ev, lay, { absorbed: rec.ab === 1 }), action: DATA.measureActions[rec.k][rec.lv] };
  }

  /* ------------------------------------------------------------------ */
  /* Synthèse hebdomadaire (préparée sans IA)                             */
  /* ------------------------------------------------------------------ */
  function weeklyReport(s, endDay) {
    const end = endDay === undefined ? dayOf(s.now) : endDay;
    const start = end - 6;
    const from = start * DAY, to = (end + 1) * DAY;
    const inWeek = x => x.t >= from && x.t < to;
    const inPrev = x => x.t >= from - 7 * DAY && x.t < from;
    const points = [];
    const crew = DATA.crew.map(c => {
      const metrics = {};
      METRIC_IDS.forEach(k => {
        const cur = s.meas.filter(m => m.a === c.id && m.k === k && m.st === 'processed' && inWeek(m));
        const prev = s.meas.filter(m => m.a === c.id && m.k === k && m.st === 'processed' && inPrev(m));
        const mean = arr => arr.length ? arr.reduce((x, m) => x + m.v, 0) / arr.length : null;
        metrics[k] = { n: cur.length, mean: mean(cur), prev: mean(prev), out: cur.filter(m => m.lv !== 'normal').length, ref: s.filters[c.id][k].x };
      });
      const wbAll = s.wb.filter(w => w.a === c.id && w.t < to);
      const wb = E.analyzeWellbeing(wbAll, end);
      wb.flags.forEach(fl => points.push({ who: c.id, kind: 'bienetre', text: c.name + ' : ' + fl.doctor.charAt(0).toLowerCase() + fl.doctor.slice(1) }));
      const meds = {};
      s.admins.filter(a => a.a === c.id && inWeek(a)).forEach(a => {
        meds[a.med] = meds[a.med] || { count: 0, effects: { aucun: 0, partiel: 0, complet: 0 } };
        meds[a.med].count++;
        if (a.effect) meds[a.med].effects[a.effect]++;
      });
      DATA.meds.forEach(m => {
        const r = responses(s, c.id, m.id);
        if (r.hint) points.push({ who: c.id, kind: 'pharmacie', text: m.name + ' chez ' + c.name + ' : effet partiel ou nul sur ' + (r.counts.aucun + r.counts.partiel) + ' prises sur ' + r.rated + '. Discuter un facteur de dose.' });
      });
      return { id: c.id, name: c.name, role: c.role, metrics, wb, meds };
    });
    const alerts = s.alerts.filter(inWeek);
    const openAlerts = s.alerts.filter(a => a.st !== 'close');
    if (openAlerts.length) points.push({ who: null, kind: 'alerte', text: openAlerts.length + ' alerte' + (openAlerts.length > 1 ? 's' : '') + ' encore ouverte' + (openAlerts.length > 1 ? 's' : '') + '.' });
    const habDays = s.hab.filter(h => h.d >= start && h.d <= end);
    const co2h = habDays.reduce((x, h) => x + h.co2h, 0);
    if (co2h > 0) points.push({ who: null, kind: 'habitat', text: 'CO₂ cabine au-dessus de 3 mmHg pendant ' + co2h + ' h cette semaine.' });
    const radWeek = habDays.reduce((x, h) => x + h.rad, 0);
    DATA.meds.forEach(m => {
      E.medFlags(m, s.stock[m.id], end, M).filter(fl => fl.level !== 'info').forEach(fl => points.push({ who: null, kind: 'pharmacie', text: m.name + ' : ' + fl.text.charAt(0).toLowerCase() + fl.text.slice(1) + '.' }));
    });
    s.vals.filter(v => v.st === 'ouverte').forEach(v => points.push({ who: v.a, kind: 'medecin', text: 'Décalage persistant de la ' + DATA.metrics[v.k].lc + ' de ' + name(v.a) + ' à valider.' }));
    const questions = s.questions.filter(q => q.conf && q.t < to);
    questions.forEach(q => points.push({ who: q.a, kind: 'question', text: 'Question de ' + name(q.a) + ' : « ' + q.q + ' »' }));
    const admins = s.admins.filter(inWeek);
    const symptoms = s.symptoms.filter(inWeek);
    return {
      start, end, crew, points,
      alerts: { total: alerts.length, vigilance: alerts.filter(a => a.lv === 'vigilance').length, urgence: alerts.filter(a => a.lv === 'urgence').length, open: openAlerts.length },
      habitat: { co2Mean: habDays.length ? habDays.reduce((x, h) => x + h.co2m, 0) / habDays.length : null, co2Max: habDays.reduce((x, h) => Math.max(x, h.co2x), 0), co2Hours: co2h, radWeek, radTotal: radTotalNow(s) },
      admins: admins.length, symptoms: symptoms.length, questions
    };
  }

  function reportText(s, rep) {
    const f = E.fmt;
    const L = [];
    L.push('AURA : synthèse médicale de la semaine ' + f.day(rep.start) + ' à ' + f.day(rep.end));
    L.push('Préparée à bord, sans intelligence artificielle, à partir du journal de mission.');
    L.push('');
    L.push('Points à discuter');
    if (!rep.points.length) L.push('  Aucun point particulier.');
    rep.points.forEach(p => L.push('  - ' + p.text));
    L.push('');
    L.push('Équipage');
    rep.crew.forEach(c => {
      L.push('  ' + c.name + ' (' + c.role + ')');
      METRIC_IDS.forEach(k => {
        const m = c.metrics[k], cfg = DATA.metrics[k];
        if (!m.n) return;
        L.push('    ' + cfg.short + ' : moyenne ' + f.unit(m.mean, cfg, 1) + (m.prev !== null ? ' (semaine précédente ' + f.unit(m.prev, cfg, 1) + ')' : '') + ', ' + m.out + ' mesure(s) hors plage sur ' + m.n + '.');
      });
      if (c.wb.n7) L.push('    Bien-être : humeur ' + f.num(c.wb.mood7, 1) + '/5, stress ' + f.num(c.wb.stress7, 1) + '/5, sommeil ' + f.hours(c.wb.sleep7) + '.');
    });
    L.push('');
    L.push('Habitat');
    L.push('  CO₂ moyen ' + f.num(rep.habitat.co2Mean, 1) + ' mmHg, maximum ' + f.num(rep.habitat.co2Max, 1) + ' mmHg, ' + rep.habitat.co2Hours + ' h au-dessus de 3 mmHg.');
    L.push('  Dose de la semaine ' + f.num(rep.habitat.radWeek, 1) + ' mSv, cumul depuis le départ ' + f.num(rep.habitat.radTotal, 0) + ' mSv.');
    L.push('');
    L.push('Activité');
    L.push('  ' + rep.alerts.total + ' alerte(s) cette semaine, ' + rep.admins + ' prise(s) de médicament, ' + rep.symptoms + ' symptôme(s) signalé(s).');
    return L.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* Démonstration guidée                                                 */
  /* ------------------------------------------------------------------ */
  function runScenario(id) {
    let s, extra = {};
    switch (id) {
      case 's1':
        s = createState({});
        extra = { planning: { mode: 'avant', scenario: 'pessimiste' } };
        break;
      case 's2':
        s = createState({ day: 70, minute: 7 * 60 + 25 });
        s.me = 'a2'; s.role = 'crew';
        extra = { measure: { a: 'a2', k: 'temp', v: 38.1, auto: true } };
        break;
      case 's3':
        s = createState({ day: 30, minute: 9 * 60 + 55 });
        s.me = 'a4'; s.role = 'crew';
        extra = { symptom: { a: 'a4', sym: 'cephalee', intensity: 5, auto: true } };
        break;
      case 's4': {
        s = createState({ day: 58, minute: 13 * 60 + 30 });
        s.events.push({ kind: 'spe', start: 58 * DAY + 13 * 60 + 40, end: 58 * DAY + 23 * 60 + 40, factor: 40 });
        advanceTo(s, 58 * DAY + 14 * 60);
        s.role = 'crew';
        break;
      }
      case 's5':
        s = createState({ day: 63, minute: 18 * 60 + 30 });
        s.role = 'doctor';
        extra = { reportEnd: 63 };
        break;
      case 's6':
        s = createState({ day: 446, minute: 9 * 60 });
        s.role = 'crew';
        // Une demande d’avis envoyée pendant la coupure : elle partira avant les données de routine.
        enqueue(s, { t: 444 * DAY + 10 * 60, title: 'Demande d’avis : sommeil de l’équipage depuis la coupure', kind: 'message', prio: 2, kb: 6, reply: true });
        break;
      default:
        s = createState({});
    }
    s.scenario = id;
    log(s, s.now, 'demo', 'Démonstration : scénario « ' + DATA.scenarios.find(x => x.id === id).title + ' ».');
    return { state: s, extra };
  }

  /* ------------------------------------------------------------------ */
  /* Persistance (navigateur)                                             */
  /* ------------------------------------------------------------------ */
  function save(s, storage) {
    try {
      const st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!st) return false;
      st.setItem(KEY, JSON.stringify(s));
      return true;
    } catch (e) { return false; }
  }
  function load(storage) {
    try {
      const st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!st) return null;
      const raw = st.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && s.v === VERSION ? s : null;
    } catch (e) { return null; }
  }
  function clear(storage) {
    try { (storage || localStorage).removeItem(KEY); } catch (e) { /* rien */ }
  }

  return {
    VERSION, DAY, METRIC_IDS, name, crewById, medById, symptomById,
    createState, advanceTo, addMeasurement, decideDrift, reportSymptom, symptomContext,
    administer, recordEffect, setFactor, responses, pendingFollowUps, validatedUnits,
    addWellbeing, enqueue, sendMessage, refreshQueue, askQuestion, flagQuestion,
    seeAlert, closeAlert, startEmergency, toggleStep, endEmergency,
    co2At, co2Hours, doseRateAt, radTotalNow, speAt,
    series, lastMeasurement, explain, weeklyReport, reportText, runScenario,
    save, load, clear, dayOf
  };
});
