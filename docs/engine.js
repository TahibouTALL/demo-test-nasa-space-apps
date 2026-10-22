// AURA — moteur de calcul exécuté dans le navigateur.
// Port exact de la logique validée côté serveur (server/lib/*.js), pour que
// le site statique déployé sur GitHub Pages fasse tourner le vrai calcul
// (pas de résultats écrits en dur) sans avoir besoin d'un serveur.
//
// L'état (références personnelles, journal) vit en mémoire le temps de la
// session du navigateur : il repart de zéro à chaque rechargement de page.

(function (global) {

  // ---------- bayesian.js ----------
  function updateBaseline(prior, measurementValue, measurementVariance) {
    const { mu: mu0, variance: sigma0sq } = prior;
    const sigmaMsq = measurementVariance;
    const denom = sigma0sq + sigmaMsq;
    const mu1 = (sigmaMsq * mu0 + sigma0sq * measurementValue) / denom;
    const sigma1sq = (sigma0sq * sigmaMsq) / denom;
    return { mu: mu1, variance: sigma1sq };
  }

  function zScore(value, baseline) {
    const sd = Math.sqrt(baseline.variance) || 1e-6;
    return (value - baseline.mu) / sd;
  }

  // ---------- validate.js ----------
  const PHYSIO_LIMITS = {
    temp: { min: 30, max: 43 },
    hr:   { min: 25, max: 220 },
    co2:  { min: 0,  max: 5 },
    spo2: { min: 40, max: 100 }
  };

  function isImpossible(metric, value) {
    const limits = PHYSIO_LIMITS[metric];
    if (!limits) return false;
    return value === null || value === undefined || Number.isNaN(value) ||
      value < limits.min || value > limits.max;
  }

  function isIsolatedOutlier(zscore, recentZScores, threshold = 3) {
    if (!recentZScores || recentZScores.length === 0) return false;
    const current = Math.abs(zscore) >= threshold;
    const neighborsNormal = recentZScores.every(z => Math.abs(z) < threshold);
    return current && neighborsNormal;
  }

  // ---------- norms.js ----------
  function round(n) { return Math.round(n * 100) / 100; }

  function computeAdaptedBand(metricConfig, baseline, context) {
    const { terrestrial, spatialOffset } = metricConfig;
    const spaceAdjustedCenter = terrestrial.center + spatialOffset;

    const personalWeight = 1 / (1 + baseline.variance);
    const genericWeight = 1 - Math.min(personalWeight, 0.9);
    const center = genericWeight * spaceAdjustedCenter + (1 - genericWeight) * baseline.mu;

    const contextFactor = context && context.highStress ? 1.3 : 1.0;
    const halfWidth = terrestrial.tolerance * contextFactor;

    return {
      center: round(center),
      lower: round(center - halfWidth),
      upper: round(center + halfWidth),
      watchMargin: round(halfWidth * 0.6)
    };
  }

  function evaluateAlert(value, band) {
    if (value >= band.lower && value <= band.upper) return "none";
    const dist = value < band.lower ? band.lower - value : value - band.upper;
    if (dist <= band.watchMargin) return "watch";
    return "critical";
  }

  // ---------- actions.js ----------
  const RULES = [
    { metric: "temp", alert: "none", action: "Aucune action requise.", reason: "Valeur dans la plage attendue compte tenu de l'élévation thermique documentée en vol (Stahn et al., 2017)." },
    { metric: "temp", alert: "watch", action: "Reprendre la mesure dans 2 heures ; surveiller l'apparition d'autres symptômes.", reason: "Écart modéré par rapport à la référence personnelle ajustée." },
    { metric: "temp", alert: "critical", action: "Alerter le médecin de garde ; envisager un traitement antipyrétique à dose adaptée au vol.", reason: "Écart important, en dehors de la bande tolérée même après ajustement spatial." },
    { metric: "co2", alert: "watch", action: "Vérifier la ventilation cabine avant tout traitement symptomatique.", reason: "Un CO2 cabine élevé est une cause fréquente et corrigible de céphalée en vol (Law et al., 2014)." },
    { metric: "co2", alert: "critical", action: "Activer la ventilation de secours ; évacuer vers un module mieux ventilé si disponible.", reason: "Niveau de CO2 pouvant affecter les performances cognitives de l'équipage." },
    { metric: "spo2", alert: "watch", action: "Reprendre la mesure ; vérifier le bon positionnement du capteur.", reason: "Écart isolé, à confirmer avant toute action." },
    { metric: "spo2", alert: "critical", action: "Administrer de l'oxygène d'appoint si disponible ; alerter le médecin de garde immédiatement.", reason: "Désaturation significative." },
    { metric: "hr", alert: "watch", action: "Noter le contexte (effort récent, stress) et reprendre la mesure au repos.", reason: "La fréquence cardiaque au repos varie avec la charge de travail et le stress en mission." },
    { metric: "hr", alert: "critical", action: "Alerter le médecin de garde ; mettre l'astronaute au repos strict.", reason: "Écart important par rapport à la référence personnelle." }
  ];

  function suggestAction(metric, alert) {
    const specific = RULES.find(r => r.metric === metric && r.alert === alert);
    if (specific) return specific;
    if (alert === "none") {
      return { action: "Aucune action requise.", reason: "Valeur dans la plage attendue compte tenu des ajustements spatiaux et de la référence personnelle de l'astronaute." };
    }
    return { action: "Signaler pour revue médicale.", reason: "Cas non couvert explicitement par la table de règles actuelle — vérification humaine recommandée." };
  }

  // ---------- pipeline.js ----------
  function getRecentZScores(state, astronautId, metric, limit = 3) {
    const astronaut = state.astronauts.find(a => a.id === astronautId);
    if (!astronaut) return [];
    const baseline = astronaut.baseline[metric];
    return state.journal
      .filter(e => e.astronautId === astronautId && e.metric === metric)
      .slice(0, limit)
      .map(e => zScore(e.value, baseline));
  }

  function processMeasurement({ state, metrics, astronautId, metric, value, context, recentZScores }) {
    const astronaut = state.astronauts.find(a => a.id === astronautId);
    if (!astronaut) return { ok: false, error: "astronaute inconnu" };

    const metricConfig = metrics[metric];
    if (!metricConfig) return { ok: false, error: "mesure inconnue" };

    if (isImpossible(metric, value)) {
      return { ok: false, status: "ignored", reason: "Valeur hors plage physiologiquement possible — mesure ignorée." };
    }

    if (recentZScores === undefined) recentZScores = getRecentZScores(state, astronautId, metric);

    const baselineBefore = astronaut.baseline[metric];
    const z = zScore(value, baselineBefore);

    if (isIsolatedOutlier(z, recentZScores)) {
      return {
        ok: true, status: "to_retake",
        reason: "Écart important mais isolé par rapport aux mesures récentes — nouvelle mesure demandée avant toute alarme.",
        zScore: round(z)
      };
    }

    const baselineAfter = updateBaseline(baselineBefore, value, metricConfig.measurementVariance);
    astronaut.baseline[metric] = baselineAfter;

    const band = computeAdaptedBand(metricConfig, baselineAfter, context || {});
    const alert = evaluateAlert(value, band);
    const action = suggestAction(metric, alert);

    const journalEntry = {
      timestamp: new Date().toISOString(),
      astronautId, astronautName: astronaut.name,
      metric, metricLabel: metricConfig.label,
      value, unit: metricConfig.unit,
      band, alert,
      action: action.action, reason: action.reason
    };

    state.journal.unshift(journalEntry);
    state.journal = state.journal.slice(0, 50);
    if (state.linkStatus === "down") state.transmissionQueue.push(journalEntry);

    return {
      ok: true, status: "processed",
      baselineBefore, baselineAfter, band, alert, action,
      normComparison: {
        terrestrial: `${round(metricConfig.terrestrial.center - metricConfig.terrestrial.tolerance)} – ${round(metricConfig.terrestrial.center + metricConfig.terrestrial.tolerance)} ${metricConfig.unit}`,
        aura: `${band.lower} – ${band.upper} ${metricConfig.unit} (source écart spatial : ${metricConfig.spatialSource})`
      },
      journalEntry
    };
  }

  global.AuraEngine = { updateBaseline, zScore, computeAdaptedBand, evaluateAlert, suggestAction, processMeasurement, getRecentZScores };

})(window);
