/* AURA : moteur de calcul.
   Fonctions pures, sans accès au réseau ni à l’interface. Le même fichier
   tourne dans le navigateur (window.AURA_ENGINE) et dans Node pour les
   tests (npm test). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AURA_ENGINE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ================================================================== */
  /* Mise en forme (français)                                            */
  /* ================================================================== */
  const NBSP = ' ';
  const nfCache = {};
  function nf(d) {
    if (!nfCache[d]) nfCache[d] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
    return nfCache[d];
  }
  const fmt = {
    num(v, d) {
      if (v === null || v === undefined || Number.isNaN(v)) return 'n.d.';
      return nf(d === undefined ? 1 : d).format(v);
    },
    signed(v, d) {
      if (v === null || v === undefined || Number.isNaN(v)) return 'n.d.';
      const r = Number(v.toFixed(d === undefined ? 1 : d));
      if (r === 0) return nf(d === undefined ? 1 : d).format(0);
      return (r > 0 ? '+' : '−') + nf(d === undefined ? 1 : d).format(Math.abs(r));
    },
    unit(v, cfg, extra) {
      const d = cfg.decimals + (extra || 0);
      return fmt.num(v, d) + NBSP + cfg.unit;
    },
    day(d) {
      const n = Math.floor(d);
      return n < 0 ? 'J−' + Math.abs(n) : 'J+' + n;
    },
    clock(minuteOfDay) {
      const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
      return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    },
    when(t) {
      return fmt.day(Math.floor(t / 1440)) + ', ' + fmt.clock(t % 1440);
    },
    dur(min) {
      if (min === null || min === undefined) return 'n.d.';
      if (min < 1) return Math.max(1, Math.round(min * 60)) + NBSP + 's';
      if (min < 60) {
        const m = Math.floor(min), s = Math.round((min - m) * 60);
        return m + NBSP + 'min' + (s ? ' ' + String(s).padStart(2, '0') + NBSP + 's' : '');
      }
      if (min < 2880) {
        const h = Math.floor(min / 60), m = Math.round(min % 60);
        return h + NBSP + 'h' + (m ? ' ' + String(m).padStart(2, '0') : '');
      }
      return fmt.num(min / 1440, 1) + NBSP + 'jours';
    },
    pct(p, d) { return fmt.num(p * 100, d === undefined ? 0 : d) + NBSP + '%'; },
    hours(h) {
      if (h === null || h === undefined || Number.isNaN(h)) return 'n.d.';
      const H = Math.floor(h), M = Math.round((h - H) * 60);
      if (M === 60) return (H + 1) + NBSP + 'h';
      if (H === 0) return M + NBSP + 'min';
      return H + NBSP + 'h' + (M ? ' ' + String(M).padStart(2, '0') : '');
    }
  };

  /* ================================================================== */
  /* Aléatoire reproductible (simulation des capteurs et Monte Carlo)     */
  /* ================================================================== */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFor() {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < arguments.length; i++) {
      const s = String(arguments[i]);
      for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 16777619) >>> 0; }
      h ^= 0x9e3779b9; h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function gauss(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function poisson(r, lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(r)));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  }
  function uniformInt(r, min, max) { return min + Math.floor(r() * (max - min + 1)); }

  /* ================================================================== */
  /* Mission : phases, délai radio, conjonction                           */
  /* ================================================================== */
  function phaseAt(mission, day) {
    for (const p of mission.phases) if (day >= p.start && day < p.end) return p;
    return day < 0 ? { id: 'avant', label: 'Avant le départ', start: -Infinity, end: 0, gravity: 1 }
      : { id: 'apres', label: 'Après le retour', start: mission.durationDays, end: Infinity, gravity: 1 };
  }
  function smooth(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
  /* Temps de trajet d’un signal radio, en minutes, dans un seul sens.
     Modèle simplifié : la distance grandit pendant l’aller, suit la géométrie
     Terre-Mars pendant le séjour (maximum à la conjonction), puis diminue. */
  function lightMinutes(mission, day) {
    const L = mission.light;
    const arr = mission.phases[0].end, dep = mission.phases[1].end, end = mission.durationDays;
    if (day <= 0) return 0.02;
    if (day < arr) return Math.max(0.02, L.atArrival * smooth(day / arr));
    if (day < dep) {
      const u = (day - arr) / (dep - arr);
      const base = L.atArrival + (L.atDeparture - L.atArrival) * u;
      return base + (L.peak - base) * Math.sin(Math.PI * u);
    }
    if (day < end) return Math.max(0.02, L.atDeparture * (1 - smooth((day - dep) / (end - dep))));
    return 0.02;
  }
  function isBlackout(mission, day) {
    const c = mission.conjunction;
    return day >= c.start && day < c.end;
  }
  function linkUpAt(mission, t) {
    return isBlackout(mission, t / 1440) ? mission.conjunction.end * 1440 : t;
  }

  /* ================================================================== */
  /* Normes adaptées : le modèle à cinq couches                           */
  /* ================================================================== */
  const Z_NORMAL = 2.5;   // au-delà : vigilance
  const Z_ALERT = 3.5;    // au-delà : alerte
  const Z_RETAKE = 4;     // valeur isolée au-delà : on redemande une mesure
  // Couche 2 : effet du vol attendu au jour t (jours depuis le départ)
  function spatialOffset(cfg, t) {
    const s = cfg.spatial;
    if (!s || t <= 0) return 0;
    if (s.kind === 'exp') return s.max * (1 - Math.exp(-t / s.tau));
    return 0;
  }
  function spatialSd(cfg, t) {
    const s = cfg.spatial;
    if (!s || !s.sd || t <= 0) return 0;
    if (s.kind === 'exp') return s.sd * (1 - Math.exp(-t / s.tau));
    return s.sd;
  }

  // Couches 1 et 3 : la norme de population sert d’a priori, les mesures
  // d’avant vol donnent la référence personnelle (moyenne pondérée par la
  // précision de chaque source).
  function preflightBaseline(cfg, pre) {
    const popVar = cfg.popSd * cfg.popSd, w = cfg.withinSd * cfg.withinSd;
    const prec = 1 / popVar + pre.n / w;
    const mu = (cfg.popMean / popVar + (pre.n * pre.mean) / w) / prec;
    return { mu, variance: 1 / prec, n: pre.n };
  }

  function initFilter(cfg, pre) {
    const b = preflightBaseline(cfg, pre);
    return {
      x: b.mu, P: b.variance, t: 0,
      preMu: b.mu, preVar: b.variance, preN: pre.n,
      n: 0, out: 0,
      streak: 0, streakSign: 0, streakValues: [],
      drift: null, last: null, shifts: []
    };
  }

  // Couche 4, étape de prédiction : on avance la référence jusqu’au moment
  // de la mesure en ajoutant l’effet spatial attendu entre-temps, et on
  // élargit l’incertitude (dérive autorisée + incertitude de l’effet).
  function predict(cfg, f, t) {
    const dt = Math.max(0, t - f.t);
    const dOff = spatialOffset(cfg, t) - spatialOffset(cfg, f.t);
    const s1 = spatialSd(cfg, t), s0 = spatialSd(cfg, f.t);
    const dVar = Math.max(0, s1 * s1 - s0 * s0);
    return { x: f.x + dOff, P: f.P + cfg.q * dt + dVar, t };
  }

  // Couche 5 : le contexte du moment décale ou élargit la plage.
  function contextAdjust(cfg, ctx) {
    const out = { offset: 0, tol: 1, notes: [], mask: false };
    if (!ctx) return out;
    const table = cfg.context || {};
    for (const key of Object.keys(ctx)) {
      if (!ctx[key] || !table[key]) continue;
      out.offset += table[key].offset || 0;
      out.tol *= table[key].tol || 1;
      if (table[key].mask) out.mask = true;
      out.notes.push(key);
    }
    return out;
  }

  function terrestrialReading(cfg, v) {
    const t = cfg.terrestrial;
    if (t.alertHigh !== null && t.alertHigh !== undefined && v >= t.alertHigh) return { level: 'alerte', label: t.alertHighLabel };
    if (t.alertLow !== null && t.alertLow !== undefined && v < t.alertLow) return { level: 'alerte', label: t.alertLowLabel };
    if (v > t.high) return { level: 'hors norme', label: t.highLabel };
    if (v < t.low) return { level: 'hors norme', label: t.lowLabel };
    return { level: 'normal', label: 'dans la norme' };
  }

  function evaluate(cfg, pred, value, ctx) {
    const adj = contextAdjust(cfg, ctx);
    const center = pred.x + adj.offset;
    const sd = Math.sqrt(pred.P + cfg.withinSd * cfg.withinSd) * adj.tol;
    const z = (value - center) / sd;
    const zEff = cfg.oneSided === 'low' ? Math.min(0, z) : z;
    // Seuils choisis pour limiter les fausses alertes : environ 1 mesure
    // normale sur 80 tombe en vigilance par hasard, contre 1 sur 20 à 2 σ.
    let level = Math.abs(zEff) <= Z_NORMAL ? 'normal' : Math.abs(zEff) <= Z_ALERT ? 'vigilance' : 'urgence';
    let hard = null;
    if (cfg.hard) {
      if (cfg.hard.low !== null && cfg.hard.low !== undefined && value < cfg.hard.low) hard = 'low';
      if (cfg.hard.high !== null && cfg.hard.high !== undefined && value > cfg.hard.high) hard = 'high';
    }
    if (hard) level = 'urgence';
    const cap = (lo, hi) => cfg.oneSided === 'low' ? [lo, Math.min(hi, cfg.plausible.max)] : [lo, hi];
    return {
      value, center, sd, z, zEff, level, hard,
      band: cap(center - Z_NORMAL * sd, center + Z_NORMAL * sd),
      wide: cap(center - Z_ALERT * sd, center + Z_ALERT * sd),
      terrestrial: terrestrialReading(cfg, value),
      context: adj,
      predicted: pred.x
    };
  }

  // Trajectoire attendue sans aucune mesure en vol (couches 1 à 3 + effet)
  function expectedTrajectory(cfg, f, t) {
    const s = spatialSd(cfg, t);
    return {
      mu: f.preMu + spatialOffset(cfg, t),
      sd: Math.sqrt(f.preVar + s * s + cfg.driftAllow * cfg.driftAllow)
    };
  }

  /* Traitement complet d’une mesure.
     m = { t (jours depuis le départ, fractionnaire), value, context, retake }
     Retourne le nouveau filtre (jamais modifié en place) et le verdict. */
  function processMeasurement(cfg, filter, m) {
    const out = { status: null, ev: null, absorbed: false, filter, flags: [] };
    const raw = m.value;
    if (raw === null || raw === undefined || raw === '' || Number.isNaN(Number(raw))) {
      out.status = 'missing';
      return out;
    }
    const v = Number(raw);
    if (v < cfg.plausible.min || v > cfg.plausible.max) {
      out.status = 'rejected';
      return out;
    }
    const pred = predict(cfg, filter, m.t);
    const ev = evaluate(cfg, pred, v, m.context);
    out.ev = ev;

    // Contrôle 3 : valeur isolée très éloignée, juste après une mesure
    // normale, sans contexte qui l’explique : on redemande une mesure.
    const prev = filter.last;
    const prevNormal = prev && prev.level === 'normal' && (m.t - prev.t) <= 2;
    const isolated = Math.abs(ev.zEff) > Z_RETAKE && !ev.hard && prevNormal && ev.context.notes.length === 0 && !m.retake;
    if (isolated) {
      out.status = 'retake';
      return out;
    }

    out.status = 'processed';
    const nf2 = Object.assign({}, filter, {
      x: pred.x, P: pred.P, t: m.t,
      last: { t: m.t, level: ev.level },
      streakValues: filter.streakValues.slice(),
      shifts: filter.shifts.slice()
    });

    if (ev.level === 'normal' && !ev.context.mask) {
      // Une valeur normale enrichit la référence (correction de Kalman).
      const r = cfg.withinSd * cfg.withinSd;
      const K = nf2.P / (nf2.P + r);
      nf2.x = nf2.x + K * (v - ev.context.offset - nf2.x);
      nf2.P = (1 - K) * nf2.P;
      nf2.n = filter.n + 1;
      nf2.streak = 0; nf2.streakSign = 0; nf2.streakValues = [];
      out.absorbed = true;
    } else {
      // Une valeur anormale n’apprend pas au système que l’anormal est normal.
      nf2.out = filter.out + (ev.level === 'normal' ? 0 : 1);
      const sign = Math.sign(ev.z);
      if (ev.level === 'vigilance') {
        if (sign === filter.streakSign && filter.streak > 0) {
          nf2.streak = filter.streak + 1;
        } else {
          nf2.streak = 1; nf2.streakSign = sign; nf2.streakValues = [];
        }
        nf2.streakValues.push(v);
        if (nf2.streakValues.length > 8) nf2.streakValues.shift();
        if (nf2.streak >= 4 && !nf2.drift) {
          nf2.drift = { kind: 'persistant', sign, since: m.t, values: nf2.streakValues.slice() };
          out.flags.push('drift');
        }
      } else if (ev.level === 'urgence') {
        nf2.streak = 0; nf2.streakSign = 0; nf2.streakValues = [];
      }
    }

    // Garde-fou contre une dérive lente de la référence elle-même.
    const exp = expectedTrajectory(cfg, filter, m.t);
    if (!nf2.drift && Math.abs(nf2.x - exp.mu) > 3 * exp.sd) {
      nf2.drift = { kind: 'lente', sign: Math.sign(nf2.x - exp.mu), since: m.t, values: [] };
      out.flags.push('drift');
    }
    out.filter = nf2;
    return out;
  }

  // Décision du médecin face à un décalage persistant
  function validateDrift(cfg, filter, t) {
    const f = Object.assign({}, filter, { shifts: filter.shifts.slice() });
    if (filter.drift && filter.drift.kind === 'persistant' && filter.drift.values.length) {
      const mean = filter.drift.values.reduce((s, v) => s + v, 0) / filter.drift.values.length;
      f.shifts.push({ t, from: f.x, to: mean });
      f.x = mean;
      f.P = Math.max(f.P, (cfg.withinSd * cfg.withinSd) / filter.drift.values.length);
    } else {
      f.shifts.push({ t, from: f.x, to: f.x });
      // La nouvelle trajectoire devient la référence : on recentre l’a priori.
      f.preMu = f.x - spatialOffset(cfg, t);
    }
    f.drift = null; f.streak = 0; f.streakSign = 0; f.streakValues = [];
    return f;
  }
  function maintainDrift(filter) {
    return Object.assign({}, filter, { drift: null, streak: 0, streakSign: 0, streakValues: [] });
  }

  // Les étapes du calcul, pour les montrer à l’écran
  function layers(cfg, filter, ev, t) {
    const delta = spatialOffset(cfg, t);
    const withSpace = cfg.popMean + delta;
    const personal = filter.preMu + delta;
    const inflight = ev.predicted;
    return {
      steps: [
        { key: 'terrestre', center: cfg.popMean, delta: null },
        { key: 'spatial', center: withSpace, delta },
        { key: 'personnel', center: personal, delta: filter.preMu - cfg.popMean },
        { key: 'vol', center: inflight, delta: inflight - personal },
        { key: 'contexte', center: ev.center, delta: ev.context.offset }
      ],
      delta, personalOffset: filter.preMu - cfg.popMean, adaptation: inflight - personal,
      n: filter.n, out: filter.out, preN: filter.preN, preMu: filter.preMu
    };
  }

  /* ================================================================== */
  /* Textes : la même mesure expliquée à l’équipage et au médecin          */
  /* ================================================================== */
  function describe(cfg, ev, lay, opts) {
    opts = opts || {};
    const U = v => fmt.unit(v, cfg);
    const U2 = v => fmt.unit(v, cfg, 1);
    const low = ev.band[0], high = ev.band[1];
    const range = cfg.oneSided === 'low' ? 'au-dessus de ' + U(low) : 'de ' + U(low) + ' à ' + U(high);
    const up = ev.z > 0;

    // Quelle couche explique le mieux l’écart avec la norme terrestre ?
    const w = cfg.withinSd;
    const parts = [
      { k: 'spatial', v: Math.abs(lay.delta) / w },
      { k: 'personnel', v: Math.abs(lay.personalOffset) / w },
      { k: 'vol', v: Math.abs(lay.adaptation) / w }
    ].sort((a, b) => b.v - a.v);
    let why = '';
    if (parts[0].k === 'spatial') why = cfg.spatial.crew;
    else if (parts[0].k === 'personnel') why = 'votre valeur habituelle était déjà ' + (lay.personalOffset < 0 ? 'plus basse' : 'plus haute') + ' que la moyenne avant le départ (' + U(lay.preMu) + ')';
    else why = 'vos mesures des dernières semaines se sont stabilisées autour de ' + U(ev.predicted);

    const crewTitle = ev.level === 'normal' ? 'Normale pour vous en ce moment'
      : ev.level === 'vigilance' ? (up ? 'Un peu plus haute que d’habitude pour vous' : 'Un peu plus basse que d’habitude pour vous')
        : 'Valeur à traiter maintenant';
    const doctorTitle = ev.level === 'normal' ? 'Dans la plage attendue'
      : ev.level === 'vigilance' ? 'Écart modéré (entre 2,5 et 3,5 écarts types)'
        : ev.hard ? 'Garde-fou absolu franchi' : 'Écart important (plus de 3,5 écarts types)';

    const terrAbn = ev.terrestrial.level !== 'normal';
    const crew = [];
    if (ev.level === 'normal' && terrAbn) {
      crew.push('Sur Terre, ' + U(ev.value) + ' serait lu comme ' + ev.terrestrial.label + '. Pour vous, à bord, c’est attendu : ' + why + '.');
    } else if (ev.level === 'normal') {
      crew.push('Votre plage habituelle en ce moment va ' + range + '.');
    } else if (!terrAbn) {
      crew.push('Sur Terre, ' + U(ev.value) + ' passerait pour normal. Pour vous, c’est inhabituel : votre plage en ce moment va ' + range + '.');
    } else {
      crew.push('Sur Terre aussi, cette valeur serait lue comme ' + ev.terrestrial.label + '. Votre plage habituelle va ' + range + '.');
    }
    if (ev.hard) crew.push('Elle dépasse un seuil de sécurité fixe, valable pour tout le monde.');
    if (ev.context.notes.indexOf('effort') >= 0) crew.push('Vous avez signalé un effort récent : la plage a été élargie.');
    if (ev.context.notes.indexOf('stress') >= 0) crew.push('Vous avez signalé du stress : la plage a été élargie.');
    if (ev.context.mask) crew.push('Vous avez pris un médicament contre la fièvre : il peut faire baisser la température, cette mesure n’est pas utilisée pour mettre à jour votre référence.');

    const L = lay.steps;
    const doctor = [];
    doctor.push(cfg.short + ' = ' + U(ev.value) + '. Attendu ' + U2(ev.center) + ' (σ prédictive ' + fmt.num(ev.sd, cfg.decimals + 1) + ', plage attendue ±2,5 σ : ' + U2(ev.band[0]) + (cfg.oneSided === 'low' ? '' : ' à ' + U2(ev.band[1])) + '). z = ' + fmt.signed(ev.z, 2) + '.');
    doctor.push('Lecture terrestre : ' + ev.terrestrial.label + ' (' + cfg.terrestrial.text + ').');
    doctor.push('Décomposition : norme ' + U2(L[0].center) + ' ; effet du vol ' + fmt.signed(lay.delta, cfg.decimals + 1) + ' ; écart personnel avant vol ' + fmt.signed(lay.personalOffset, cfg.decimals + 1) + ' ; adaptation en vol ' + fmt.signed(lay.adaptation, cfg.decimals + 1) + (ev.context.notes.length ? ' ; contexte ' + fmt.signed(ev.context.offset, cfg.decimals + 1) + ', tolérance × ' + fmt.num(ev.context.tol, 1) : '') + '.');
    if (ev.hard) doctor.push('Garde-fou absolu : ' + (ev.hard === 'high' ? 'au-dessus de ' + U(cfg.hard.high) : 'en dessous de ' + U(cfg.hard.low)) + '.');
    if (opts.absorbed !== undefined) doctor.push(opts.absorbed ? 'Mesure intégrée à la référence (n = ' + (lay.n + 1) + ').' : 'Mesure non intégrée à la référence.');

    return { crewTitle, doctorTitle, crew: crew.join(' '), doctor: doctor.join(' '), doctorLines: doctor, why };
  }

  /* ================================================================== */
  /* Habitat : CO₂ et radiation                                           */
  /* ================================================================== */
  function co2Level(cfg, v) {
    if (v > cfg.urgent) return 'urgence';
    if (v > cfg.limit) return 'vigilance';
    return 'normal';
  }
  function radiationRate(mission, habitat, day) {
    const p = phaseAt(mission, day);
    if (p.id === 'surface') return habitat.radiation.surface;
    if (p.id === 'aller' || p.id === 'retour') return habitat.radiation.transit;
    return habitat.radiation.earthYear / 365;
  }
  function radiationProjection(mission, habitat, fromDay, cumulative) {
    let total = cumulative;
    for (let d = Math.ceil(fromDay); d < mission.durationDays; d++) total += radiationRate(mission, habitat, d);
    return total;
  }

  /* ================================================================== */
  /* Symptômes : relier ce que ressent l’équipage aux conditions du vol    */
  /* ================================================================== */
  function analyzeSymptom(id, ctx, DATA) {
    const f = [], crewAdvice = [], doctorAdvice = [];
    let level = 'info', notify = false;
    const co2 = DATA.habitat.co2;
    const n1 = v => fmt.num(v, 1);
    const intensity = ctx.intensity || 0;
    const add = (crew, doctor, source) => f.push({ crew, doctor, source: source || null });

    switch (id) {
      case 'cephalee':
        if (ctx.co2Now !== null && ctx.co2Now > co2.limit) {
          add('Le CO₂ de la cabine est à ' + n1(ctx.co2Now) + NBSP + 'mmHg, au-dessus de la limite de 3' + NBSP + 'mmHg. À bord, le risque de mal de tête augmente nettement avec le CO₂.',
            'ppCO₂ sur 1 h = ' + n1(ctx.co2Now) + NBSP + 'mmHg (> 3 mmHg, NASA-STD-3001 V2 6004). Chances de céphalée multipliées par environ 2 par mmHg (Law et al., 2014).', 'law2014');
          crewAdvice.push('Vérifiez la ventilation de votre zone de travail et allez dans un module mieux ventilé.');
          doctorAdvice.push('Corriger l’environnement avant le traitement symptomatique ; vérifier l’épuration du CO₂.');
        } else if (ctx.co2Hours > 0) {
          add('Le CO₂ a dépassé 3' + NBSP + 'mmHg pendant ' + ctx.co2Hours + NBSP + 'h ces dernières 24 heures.',
            'ppCO₂ > 3 mmHg pendant ' + ctx.co2Hours + ' h sur 24 h.', 'law2014');
        }
        if (ctx.sleepLast !== null && ctx.sleepLast < 6) {
          add('Vous avez dormi ' + fmt.hours(ctx.sleepLast) + ' cette nuit : le manque de sommeil favorise les maux de tête.',
            'Sommeil de la nuit : ' + fmt.hours(ctx.sleepLast) + '.', 'barger2014');
        }
        if (ctx.daysSinceTransition !== null && ctx.daysSinceTransition < 7) {
          add('Vous êtes au début d’une période sans pesanteur : la remontée des liquides vers la tête donne souvent des maux de tête.',
            'Phase d’adaptation (J+' + Math.floor(ctx.daysSinceTransition) + ' depuis le changement de gravité) : redistribution liquidienne céphalique.', 'general');
        }
        crewAdvice.push('Buvez un verre d’eau et faites une pause d’écran.');
        if (intensity >= 8) {
          level = 'vigilance'; notify = true;
          crewAdvice.push('Douleur très forte : prévenez le médecin de bord.');
          doctorAdvice.push('Céphalée intense : examen neurologique, recherche de signes de gravité.');
        }
        break;

      case 'nausee':
        if (ctx.daysSinceTransition !== null && ctx.daysSinceTransition < 4) {
          add('Vous êtes à ' + Math.max(0, Math.floor(ctx.daysSinceTransition)) + ' jour(s) d’un changement de gravité : le mal de l’espace est l’explication la plus probable.',
            'J+' + Math.floor(ctx.daysSinceTransition) + ' après transition gravitaire : syndrome d’adaptation à l’espace probable.', 'general');
          crewAdvice.push('Bougez la tête lentement, gardez un repère visuel fixe et buvez par petites gorgées.');
          doctorAdvice.push('Antiémétique selon protocole (prométhazine injectable par le médecin de bord).');
        } else {
          level = 'vigilance'; notify = true;
          add('En dehors des premiers jours d’adaptation, des nausées peuvent avoir d’autres causes.',
            'Nausées hors période d’adaptation : rechercher une cause digestive, infectieuse ou médicamenteuse.', 'general');
          crewAdvice.push('Prévenez le médecin de bord.');
        }
        break;

      case 'dos':
        if (ctx.daysSinceTransition !== null && ctx.daysSinceTransition < 30) {
          add('Sans pesanteur, la colonne s’allonge : les douleurs de dos sont fréquentes pendant le premier mois.',
            'Lombalgie précoce attendue (allongement rachidien), J+' + Math.floor(ctx.daysSinceTransition) + ' depuis la transition.', 'general');
        }
        crewAdvice.push('Faites des étirements doux et essayez la position recroquevillée quelques minutes.');
        if (intensity >= 7) {
          level = 'vigilance'; notify = true;
          crewAdvice.push('Douleur forte : prévenez le médecin de bord, surtout en cas d’engourdissement d’une jambe.');
          doctorAdvice.push('Examen neurologique des membres inférieurs.');
        }
        break;

      case 'sommeil':
        if (ctx.sleep7 !== null && ctx.sleep7 < 6) {
          add('Vous dormez en moyenne ' + fmt.hours(ctx.sleep7) + ' par nuit cette semaine.',
            'Sommeil moyen sur 7 jours : ' + fmt.hours(ctx.sleep7) + ' (moyenne en mission d’environ 6 h selon Barger et al., 2014).', 'barger2014');
        }
        if (ctx.co2Now !== null && ctx.co2Now > co2.limit) {
          add('Le CO₂ élevé de la cabine peut aussi gêner le sommeil.', 'ppCO₂ élevé associé aux troubles du sommeil (Law et al., 2014).', 'law2014');
        }
        crewAdvice.push('Gardez des horaires réguliers et baissez écrans et lumière une heure avant de dormir.');
        doctorAdvice.push('Mélatonine pour recaler le rythme ; hypnotique selon protocole et suivi de l’effet le lendemain.');
        break;

      case 'oeil':
        add('En apesanteur, poussières et petits débris flottent et finissent souvent dans les yeux.', 'Corps étranger oculaire : cause fréquente en microgravité.', 'general');
        crewAdvice.push('Rincez avec des larmes artificielles, sans frotter.');
        crewAdvice.push('Si la douleur dure plus d’une heure ou si la vue baisse, prévenez le médecin.');
        doctorAdvice.push('Examen à la fluorescéine si disponible ; surveillance de l’acuité.');
        break;

      case 'vision':
        level = 'vigilance'; notify = true;
        add('Après ' + Math.floor(ctx.day) + ' jours de vol, un changement de la vue peut venir du syndrome neuro-oculaire des vols longs.',
          'Suspicion de SANS à J+' + Math.floor(ctx.day) + ' : œdème papillaire, aplatissement du globe, plis choroïdiens, décalage hypermétropique.', 'sans2020');
        crewAdvice.push('Notez ce qui a changé : de près, de loin, un œil ou les deux. Un examen de l’œil vous sera proposé.');
        doctorAdvice.push('Acuité visuelle, fond d’œil ou échographie oculaire selon les moyens du bord.');
        break;

      case 'nez':
        add('En apesanteur, les liquides du corps remontent vers la tête : nez bouché et visage gonflé sont attendus.', 'Congestion liée à la redistribution liquidienne céphalique.', 'general');
        crewAdvice.push('Un décongestionnant est possible à la dose validée si la gêne empêche de dormir ou de travailler.');
        break;

      case 'peau':
        add('Le système immunitaire change en vol et les réactions de la peau sont fréquentes.', 'Hypersensibilité cutanée fréquente en vol (Crucian et al., 2018).', 'crucian2018');
        crewAdvice.push('Une éruption douloureuse en bande, d’un seul côté du corps, doit être signalée au médecin.');
        doctorAdvice.push('Penser à une réactivation du virus de la varicelle (zona) si éruption douloureuse métamérique.');
        break;

      case 'fievre':
        if (ctx.lastTemp) {
          add('Votre dernière température, il y a ' + fmt.dur(ctx.lastTemp.ago) + ', était ' + fmt.num(ctx.lastTemp.value, 1) + NBSP + '°C : ' + (ctx.lastTemp.level === 'normal' ? 'normale pour vous en vol.' : 'au-dessus de votre plage habituelle.'),
            'Dernière température : ' + fmt.num(ctx.lastTemp.value, 1) + ' °C, z = ' + fmt.signed(ctx.lastTemp.z, 2) + '.', 'stahn2017');
          if (ctx.lastTemp.level !== 'normal') { level = 'vigilance'; notify = true; }
        }
        crewAdvice.push('Mesurez votre température maintenant : AURA la lira avec votre référence en vol.');
        break;

      case 'moral':
        add('Le moral bas et l’irritabilité sont fréquents lors des longs isolements, et ils varient beaucoup d’une personne à l’autre.', 'Variabilité interindividuelle forte en isolement prolongé (Basner et al., 2013).', 'basner2013');
        if (ctx.co2Now !== null && ctx.co2Now > co2.limit) add('Le CO₂ élevé de la cabine peut aussi rendre irritable.', 'Irritabilité associée au CO₂ élevé (Law et al., 2014).', 'law2014');
        crewAdvice.push('Faites votre point du jour dans Bien-être. Vous pouvez demander un entretien privé avec le médecin.');
        doctorAdvice.push('Proposer l’entretien psychologique privé ; pas de traitement sans évaluation.');
        break;

      default:
        break;
    }
    return { findings: f, crewAdvice, doctorAdvice, level, notify };
  }

  /* ================================================================== */
  /* Pharmacie                                                           */
  /* ================================================================== */
  function doseUnits(med, factor) {
    const raw = med.dose * (factor || 1);
    const halves = med.units === 'comprimé';
    return halves ? Math.max(0.5, Math.round(raw * 2) / 2) : Math.max(1, Math.round(raw));
  }
  function medFlags(med, stock, day, mission) {
    const flags = [];
    if (med.expiryDay < mission.durationDays) {
      const lvl = day >= med.expiryDay ? 'urgence' : (med.expiryDay - day <= 120 ? 'vigilance' : 'info');
      flags.push({ code: 'peremption', level: lvl, text: day >= med.expiryDay ? 'Périmé depuis ' + fmt.day(med.expiryDay) : 'Périme à ' + fmt.day(med.expiryDay) + ', avant la fin de la mission', source: 'wotring2015' });
    }
    if (day >= med.checkAfterDay) {
      flags.push({ code: 'puissance', level: 'vigilance', text: 'À bord depuis plus de ' + Math.round(med.checkAfterDay / 30.4) + ' mois : puissance à vérifier', source: 'du2011' });
    }
    if (stock <= 0) flags.push({ code: 'stock', level: 'urgence', text: 'Stock épuisé', source: null });
    else if (stock <= med.minStock) flags.push({ code: 'stock', level: 'vigilance', text: 'Stock bas', source: null });
    return flags;
  }
  function responseSummary(list) {
    const rated = list.filter(a => a.effect);
    const c = { aucun: 0, partiel: 0, complet: 0 };
    rated.forEach(a => { c[a.effect] = (c[a.effect] || 0) + 1; });
    let hint = null;
    if (rated.length >= 3 && (c.aucun + c.partiel) / rated.length >= 0.66) {
      hint = 'Effet souvent incomplet : un ajustement du facteur de dose peut être discuté en conférence.';
    }
    return { total: list.length, rated: rated.length, counts: c, hint };
  }

  /* ================================================================== */
  /* Planification de la pharmacie : Monte Carlo                          */
  /* ================================================================== */
  function simulatePharmacy(o) {
    return simulateMission(o).meds;
  }

  /* ================================================================== */
  /* Bien-être : repérer une baisse qui dure, sans poser de diagnostic     */
  /* ================================================================== */
  function analyzeWellbeing(entries, today) {
    const dayOf = e => Math.floor(e.t / 1440);
    const last7 = entries.filter(e => dayOf(e) > today - 7 && dayOf(e) <= today);
    const prev = entries.filter(e => dayOf(e) <= today - 7 && dayOf(e) > today - 21);
    const avg = (arr, k) => arr.length ? arr.reduce((s, e) => s + e[k], 0) / arr.length : null;
    const res = {
      n7: last7.length,
      mood7: avg(last7, 'mood'), stress7: avg(last7, 'stress'), sleep7: avg(last7, 'sleep'), load7: avg(last7, 'load'),
      moodPrev: avg(prev, 'mood'), stressPrev: avg(prev, 'stress'), sleepPrev: avg(prev, 'sleep'),
      flags: []
    };
    const push = (code, crew, doctor) => res.flags.push({ code, crew, doctor });
    if (res.sleep7 !== null && res.sleep7 < 5.5) {
      push('sommeil', 'Vous dormez en moyenne ' + fmt.hours(res.sleep7) + ' par nuit cette semaine.', 'Sommeil moyen 7 j : ' + fmt.hours(res.sleep7) + ' (< 5 h 30).');
    }
    if (res.sleep7 !== null && res.sleepPrev !== null && res.sleepPrev - res.sleep7 >= 0.75) {
      push('sommeil-baisse', 'C’est moins que les semaines précédentes (' + fmt.hours(res.sleepPrev) + ').', 'Baisse de ' + fmt.hours(res.sleepPrev - res.sleep7) + ' par rapport aux 14 jours précédents.');
    }
    if (res.mood7 !== null && res.moodPrev !== null && res.moodPrev - res.mood7 >= 0.8) {
      push('humeur', 'Votre moral est plus bas que les semaines précédentes.', 'Humeur moyenne en baisse de ' + fmt.num(res.moodPrev - res.mood7, 1) + ' point.');
    }
    let low = 0, maxLow = 0;
    last7.forEach(e => { low = e.mood <= 2 ? low + 1 : 0; maxLow = Math.max(maxLow, low); });
    if (maxLow >= 3) push('humeur-basse', 'Plusieurs jours de suite avec un moral bas.', maxLow + ' jours consécutifs avec humeur ≤ 2.');
    if (res.stress7 !== null && res.stress7 >= 4) push('stress', 'Votre niveau de stress est élevé cette semaine.', 'Stress moyen 7 j : ' + fmt.num(res.stress7, 1) + ' sur 5.');
    const heavy = last7.slice(-5).filter(e => e.load >= 4).length;
    if (heavy >= 3) push('charge', 'Votre charge de travail est lourde depuis plusieurs jours.', 'Charge ≥ 4 sur ' + heavy + ' des 5 derniers jours.');
    return res;
  }

  /* ================================================================== */
  /* Liaison avec la Terre : file d’attente par priorité                  */
  /* ================================================================== */
  function processQueue(mission, queue, inbox, now, makeReply) {
    const kbPerMin = mission.linkKbPerMin;
    let channel = -Infinity;
    queue.forEach(it => { if (it.sentAt !== null && it.sentAt !== undefined) channel = Math.max(channel, it.sentAt + Math.max(1, it.kb / kbPerMin)); });
    const pending = queue.filter(it => it.sentAt === null || it.sentAt === undefined);
    let time = pending.length ? Math.max(channel, Math.min.apply(null, pending.map(p => p.t))) : 0;
    let guard = 0;
    while (pending.length && guard++ < 10000) {
      time = linkUpAt(mission, time);
      if (time > now) break;
      const ready = pending.filter(p => p.t <= time);
      if (!ready.length) { time = Math.min.apply(null, pending.map(p => p.t)); continue; }
      ready.sort((a, b) => a.prio - b.prio || a.t - b.t);
      const it = ready[0];
      it.sentAt = time;
      it.arrAt = time + lightMinutes(mission, time / 1440);
      time += Math.max(1, it.kb / kbPerMin);
      pending.splice(pending.indexOf(it), 1);
    }
    const blocked = isBlackout(mission, now / 1440);
    queue.forEach(it => {
      if (it.sentAt === null || it.sentAt === undefined) { it.status = blocked ? 'bloqué' : 'en attente'; return; }
      it.status = it.arrAt <= now ? 'reçu' : 'en route';
      // La réponse simulée du sol part après un temps de réflexion. Tant
      // qu’elle n’est pas partie, le médecin au sol peut répondre lui-même.
      if (it.reply && !it.replied && it.arrAt <= now && makeReply) {
        const gs = linkUpAt(mission, it.arrAt + (it.prio === 1 ? 15 : 45));
        if (gs <= now) {
          const msg = makeReply(it, gs, gs + lightMinutes(mission, gs / 1440));
          if (msg) inbox.push(msg);
          it.replied = true;
        }
      }
    });
    inbox.forEach(m => { m.status = m.arrAt <= now ? 'reçu' : 'en route'; });
  }

  /* ================================================================== */
  /* Signes d’alarme (F5) : vérifiés avant tout autre calcul              */
  /* ================================================================== */
  const NEG = new Set(['pas', 'aucun', 'aucune', 'sans', 'jamais', 'ni', 'non']);
  const SELF = new Set(['j', 'je', 'me', 'm', 'moi', 'ma', 'mon', 'mes', 'il', 'elle', 'on', 'lui', 'ai', 'suis', 'ressens']);
  function words(s) { return normalize(s).split(' ').filter(Boolean); }
  function detectRedFlags(text, flags, opts) {
    opts = opts || {};
    const toks = words(text);
    if (!toks.length) return [];
    const names = new Set((opts.names || []).map(n => normalize(n)));
    const info = /(^| )(question|questions|savoir|est ce que|frequent|frequente|risque|risques|pourquoi|comment|c est quoi|qu est ce)( |$)/.test(toks.join(' '));
    const found = [];
    for (const fl of flags) {
      let best = null;
      for (const phrase of fl.words) {
        const p = words(phrase);
        if (!p.length) continue;
        for (let i = 0; i + p.length <= toks.length; i++) {
          let hit = true;
          for (let j = 0; j < p.length; j++) if (toks[i + j] !== p[j]) { hit = false; break; }
          if (!hit) continue;
          const before = toks.slice(Math.max(0, i - 4), i);
          const negated = before.some(w => NEG.has(w)) || (before.indexOf('plus') >= 0 && (before.indexOf('n') >= 0 || before.indexOf('ne') >= 0));
          if (negated) continue;
          const isSelf = w => SELF.has(w) || names.has(w);
          const strong = toks.slice(Math.max(0, i - 2), i).concat(p).some(isSelf);
          const weak = toks.slice(Math.max(0, i - 5), i).some(isSelf);
          const self = strong || (weak && !info);
          if (!best || (self && !best.self)) best = { phrase, self, at: i };
        }
      }
      if (best) found.push({ id: fl.id, flag: fl, phrase: best.phrase, self: best.self });
    }
    return found;
  }

  /* ================================================================== */
  /* Proposition d’action adaptée au vol (F6)                             */
  /* Chaque médicament passe une série de vérifications, dans l’ordre.     */
  /* ================================================================== */
  function actionChecks(med, o) {
    const units = doseUnits(med, o.factor || 1);
    const stock = o.stock;
    const checks = [];
    const add = (id, label, state, text) => checks.push({ id, label, state, text });
    add('bord', 'À bord', stock > 0 ? 'ok' : 'no', stock > 0 ? fmt.num(stock, stock % 1 ? 1 : 0) + ' ' + med.units + (stock > 1 ? 's' : '') + ' dans la pharmacie' : 'Plus aucune unité à bord');
    if (stock > 0) {
      if (stock < units) add('quantite', 'Quantité', 'no', 'Pas assez pour une prise complète');
      else if (stock <= med.minStock) add('quantite', 'Quantité', 'warn', 'Stock bas : à économiser jusqu’à la fin de la mission');
      else add('quantite', 'Quantité', 'ok', 'Assez pour cette prise et les suivantes');
    }
    if (o.day >= med.expiryDay) add('etat', 'Encore bon', 'no', 'Périmé depuis ' + fmt.day(med.expiryDay));
    else if (o.day >= med.checkAfterDay) add('etat', 'Encore bon', 'warn', 'À bord depuis plus de ' + Math.round(med.checkAfterDay / 30.4) + ' mois : puissance à vérifier');
    else add('etat', 'Encore bon', 'ok', 'Valable jusqu’à ' + fmt.day(med.expiryDay));
    if (med.route === 'injectable') add('geste', 'Faisable à bord', 'warn', 'Injection : geste réservé à la médecin de bord');
    else add('geste', 'Faisable à bord', 'ok', med.route === 'oculaire' ? 'Possible en apesanteur, sans pencher la tête' : 'Facile à prendre en apesanteur');
    const risky = (o.tasks || []).filter(tk => tk.kind === 'eva');
    if (med.drowsy && risky.length) add('taches', 'Tâches à venir', 'no', 'Peut endormir, et une sortie extravéhiculaire est prévue ' + risky[0].when);
    else if (med.drowsy) add('taches', 'Tâches à venir', 'ok', 'Peut endormir, mais aucune sortie n’est prévue d’ici demain soir');
    else add('taches', 'Tâches à venir', 'ok', 'Pas de somnolence connue');
    if (o.blackout) add('reponse', 'Avis du sol', 'info', 'Liaison coupée : la décision se prend à bord');
    else if (o.light !== undefined) add('reponse', 'Avis du sol', 'info', 'Réponse du sol au plus tôt dans ' + fmt.dur(Math.round(2 * o.light + 45)) + ' : la décision se prend à bord');
    const blocked = checks.some(c => c.state === 'no');
    const caution = checks.some(c => c.state === 'warn');
    return { med: med.id, units, checks, blocked, caution };
  }
  function planActions(meds, o) {
    const options = meds.map(m => actionChecks(m, Object.assign({}, o, { stock: o.stocks[m.id], factor: o.factors[m.id] })));
    const order = options.slice().sort((a, b) => (a.blocked - b.blocked) || (a.caution - b.caution));
    const best = order.find(x => !x.blocked) || null;
    let level = 'conseil';
    if (!best && options.length) level = 'medecin';
    if (o.severe) level = 'medecin';
    return { options, recommended: best ? best.med : null, level, allBlocked: !best && options.length > 0 };
  }

  /* ================================================================== */
  /* Test de réaction (PVT-B, 3 minutes)                                  */
  /* ================================================================== */
  function reactionStats(rts, falseStarts, cfg) {
    cfg = cfg || { lapse: 355 };
    const v = rts.filter(x => x >= 100).slice().sort((a, b) => a - b);
    const n = v.length;
    if (!n) return { n: 0, median: null, mean: null, lapses: 0, falseStarts: falseStarts || 0, speed: null };
    const median = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
    const mean = v.reduce((a, b) => a + b, 0) / n;
    const speed = v.reduce((a, b) => a + 1000 / b, 0) / n;
    return { n, median, mean, lapses: v.filter(x => x > cfg.lapse).length, falseStarts: falseStarts || 0, speed, fastest: v[0], slowest: v[n - 1] };
  }

  /* ================================================================== */
  /* Mission simulée : besoins en médicaments et temps de travail perdu   */
  /* ================================================================== */
  function simulateMission(o) {
    const r = rng(o.seed || 1);
    const years = Math.max(0, o.endDay - o.startDay) / 365.25;
    const idx = {};
    o.meds.forEach((m, i) => { idx[m.id] = i; });
    const totals = o.meds.map(() => new Float64Array(o.runs));
    const lost = new Float64Array(o.runs);
    const nT = (o.transitions || []).filter(d => d >= o.startDay && d < o.endDay).length;
    for (let k = 0; k < o.runs; k++) {
      for (const c of o.conditions) {
        for (let p = 0; p < o.crewSize; p++) {
          let events = 0;
          if (c.perTransition !== undefined) {
            const pr = Math.min(1, c.perTransition * o.multiplier);
            for (let t = 0; t < nT; t++) if (r() < pr) events++;
          } else {
            events = poisson(r, c.rate * o.multiplier * years);
          }
          if (!events) continue;
          lost[k] += events * (c.hoursLost || 0);
          for (const need of c.meds) {
            const i = idx[need.med];
            if (i === undefined) continue;
            if (need.min === need.max) { totals[i][k] += events * need.min; continue; }
            for (let e = 0; e < events; e++) totals[i][k] += uniformInt(r, need.min, need.max);
          }
        }
      }
    }
    const meds = o.meds.map((m, i) => {
      const arr = Array.from(totals[i]).sort((a, b) => a - b);
      const q = p => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
      const stock = o.stock[m.id];
      let over = 0, sum = 0;
      for (const v of arr) { if (v > stock) over++; sum += v; }
      const max = arr[arr.length - 1] || 0;
      const top = Math.max(max, stock, 1);
      const nb = 24, hist = new Array(nb).fill(0);
      for (const v of arr) hist[Math.min(nb - 1, Math.floor((v / top) * nb))]++;
      return {
        med: m.id, stock, mean: sum / arr.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), max,
        pStockout: over / arr.length, hist, histTop: top
      };
    });
    const L = Array.from(lost).sort((a, b) => a - b);
    const work = o.crewSize * Math.max(1, o.endDay - o.startDay) * (o.workHoursPerDay || 8);
    const meanL = L.reduce((a, b) => a + b, 0) / Math.max(1, L.length);
    const p90L = L[Math.min(L.length - 1, Math.floor(0.9 * L.length))] || 0;
    return { meds, lost: { mean: meanL, p90: p90L, pctMean: meanL / work, pctP90: p90L / work, workHours: work } };
  }

  /* ================================================================== */
  /* Conférence de la semaine (F7) : questions et résumé sans IA          */
  /* ================================================================== */
  function interviewPlan(IV, facts, weekIndex) {
    const plan = IV.base.map(x => Object.assign({}, x));
    const sleep = plan.find(x => x.id === 'sommeil');
    if (sleep && facts) {
      if (facts.sleepDrop && facts.sleepDrop >= 0.5 && facts.sleepFrom !== null) {
        sleep.q = 'Comment avez-vous dormi cette semaine ? Je vois que vos nuits sont plus courtes depuis ' + fmt.day(facts.sleepFrom) + ' : ' + fmt.hours(facts.sleep7) + ' en moyenne, contre ' + fmt.hours(facts.sleepBase) + ' d’habitude.';
        sleep.why = 'sommeil';
      } else if (facts.sleep7 !== null && facts.sleep7 !== undefined) {
        sleep.q = 'Comment avez-vous dormi cette semaine ? D’après vos points du soir, vous dormez ' + fmt.hours(facts.sleep7) + ' par nuit en moyenne.';
      }
    }
    const gene = plan.find(x => x.id === 'gene');
    if (facts && facts.partialMed) {
      const medTxt = 'le ' + facts.partialMed.toLowerCase() + ' n’a pas toujours suffi';
      if (facts.partialSleep && sleep) sleep.q += ' Et ' + medTxt + ' ces derniers soirs.';
      else if (gene) gene.q = medTxt.charAt(0).toUpperCase() + medTxt.slice(1) + ' cette semaine. Avez-vous une douleur ou une gêne dont vous aimeriez parler ?';
    }
    const psy = weekIndex % 2 === 1 || (facts && facts.moodDrop >= 0.8);
    if (psy) IV.psy.forEach(x => plan.push(Object.assign({}, x)));
    return plan;
  }
  function followUpNeeded(answer) {
    const t = normalize(answer);
    return /\b(mal|douleur|douleurs|gene|fatigue|fatiguee|epuise|epuisee|mauvais|mauvaise|difficile|dur|inquiet|inquiete|stress|stresse|stressee|tendu|tendue|triste|peu|pas bien|moins)\b/.test(t);
  }
  function interviewSummary(itv, facts, nameOf) {
    const med = [], psy = [];
    const who = nameOf ? nameOf(itv.a) : '';
    if (facts) {
      const bits = [];
      if (facts.sleep7 !== null && facts.sleep7 !== undefined) bits.push('sommeil moyen ' + fmt.hours(facts.sleep7) + (facts.sleepBase ? ' (habituel : ' + fmt.hours(facts.sleepBase) + ')' : ''));
      if (facts.mood7 !== null && facts.mood7 !== undefined) bits.push('humeur ' + fmt.num(facts.mood7, 1) + ' sur 5');
      if (facts.alerts) bits.push(facts.alerts + ' alerte' + (facts.alerts > 1 ? 's' : '') + ' dans la semaine');
      if (facts.partialMed) bits.push(facts.partialMed + ' : effet partiel ou nul plusieurs fois');
      if (facts.reaction) bits.push('temps de réaction médian ' + fmt.num(facts.reaction.median, 0) + ' ms' + (facts.reaction.prev ? ' (habituel : ' + fmt.num(facts.reaction.prev, 0) + ' ms)' : ''));
      if (bits.length) med.push('Données de la semaine : ' + bits.join(', ') + '.');
    }
    (itv.answers || []).forEach(an => {
      const line = an.label + ' : ' + (an.skipped ? 'question passée.' : (an.text || '').trim().replace(/\s+/g, ' ') + (/[.!?]$/.test((an.text || '').trim()) ? '' : '.'));
      (an.part === 'psy' ? psy : med).push(line);
    });
    if (itv.flags && itv.flags.length) med.unshift('Signe d’alarme repéré pendant l’entretien : ' + itv.flags.join(', ') + '. Alerte déclenchée à bord.');
    return {
      med: (who ? 'Entretien ' + (/^[AEIOUYÂÀÉÈÊËÎÏÔÖÛÜ]/i.test(who) ? 'd’' : 'de ') + who + '. ' : '') + med.join('\n'),
      psy: psy.length ? psy.join('\n') : ''
    };
  }

  /* ================================================================== */
  /* Recherche documentaire hors connexion (BM25)                         */
  /* ================================================================== */
  const STOP = new Set(('le la les un une des du de d l au aux et ou a en dans sur sous pour par avec sans ce cet cette ces ' +
    'mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs je tu il elle on nous vous ils elles me te se y ne pas ' +
    'plus moins que qui quoi dont est sont etre ete ai as avons avez ont fait faire suis es c j m n s t qu comment pourquoi ' +
    'quand quel quelle quels quelles ca cela ceci tres bien aussi alors donc car mais si tout tous toute toutes peu peut peux ' +
    'dois doit faut quoi chez etc ici la-bas avoir j ai moi toi lui eux leur cest jai suisje estce').split(/\s+/));
  function normalize(s) {
    return String(s || '').replace(/œ/g, 'oe').replace(/Œ/g, 'oe').replace(/æ/g, 'ae')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function stem(w) {
    if (w.length > 4 && /[sx]$/.test(w)) w = w.slice(0, -1);
    if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
    return w;
  }
  function tokenize(s) {
    return normalize(s).split(' ').filter(w => w.length >= 2 && !STOP.has(w)).map(stem);
  }
  function expandQuery(q, synonyms) {
    const nq = ' ' + normalize(q) + ' ';
    let extra = '';
    for (const pair of synonyms || []) {
      if (nq.indexOf(' ' + pair[0] + ' ') >= 0) extra += ' ' + pair[1].join(' ');
    }
    return Array.from(new Set(tokenize(nq + extra)));
  }
  function buildIndex(cards) {
    const docs = cards.map(c => {
      const tf = new Map();
      const add = (text, w) => { for (const tok of tokenize(text)) tf.set(tok, (tf.get(tok) || 0) + w); };
      add(c.title, 3); add(c.tags, 2); add(c.text, 1);
      let len = 0; tf.forEach(v => { len += v; });
      return { id: c.id, tf, len };
    });
    const df = new Map();
    docs.forEach(d => d.tf.forEach((v, k) => df.set(k, (df.get(k) || 0) + 1)));
    const avgdl = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
    return { docs, df, avgdl, N: docs.length };
  }
  function search(index, query, synonyms, k) {
    const terms = expandQuery(query, synonyms);
    const k1 = 1.4, b = 0.75;
    const res = [];
    for (const d of index.docs) {
      let score = 0;
      const matched = [];
      for (const t of terms) {
        const tf = d.tf.get(t);
        if (!tf) continue;
        const df = index.df.get(t) || 0;
        const idf = Math.log(1 + (index.N - df + 0.5) / (df + 0.5));
        score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * d.len / index.avgdl));
        matched.push(t);
      }
      if (score > 0) res.push({ id: d.id, score, matched });
    }
    res.sort((a, b2) => b2.score - a.score);
    return { terms, results: res.slice(0, k || 3) };
  }

  return {
    fmt, NBSP, Z_NORMAL, Z_ALERT, Z_RETAKE, rng, seedFor, gauss, poisson, uniformInt,
    phaseAt, lightMinutes, isBlackout, linkUpAt,
    spatialOffset, spatialSd, preflightBaseline, initFilter, predict, contextAdjust,
    terrestrialReading, evaluate, expectedTrajectory, processMeasurement, validateDrift, maintainDrift,
    layers, describe,
    co2Level, radiationRate, radiationProjection,
    analyzeSymptom, doseUnits, medFlags, responseSummary, simulatePharmacy, simulateMission,
    analyzeWellbeing, processQueue,
    detectRedFlags, actionChecks, planActions, reactionStats,
    interviewPlan, followUpNeeded, interviewSummary,
    normalize, tokenize, expandQuery, buildIndex, search
  };
});
