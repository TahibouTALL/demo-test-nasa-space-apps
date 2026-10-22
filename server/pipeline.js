// La chaîne de traitement d'une mesure — F3 (vérification), F4 (norme
// adaptée), F5 (alarme), F6 (action). C'est la même fonction qui est
// utilisée que la mesure vienne d'un appel direct à l'API ou d'un scénario
// de démonstration rejoué : aucun résultat n'est pré-calculé à la main.

const { updateBaseline, zScore } = require("./lib/bayesian");
const { isImpossible, isIsolatedOutlier } = require("./lib/validate");
const { computeAdaptedBand, evaluateAlert } = require("./lib/norms");
const { suggestAction } = require("./lib/actions");

// Z-scores des dernières mesures réelles de cet astronaute pour cette
// donnée, recalculés par rapport à la référence courante — c'est l'historique
// qui alimente le contrôle "mesure isolée aberrante".
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
  if (recentZScores === undefined) {
    recentZScores = getRecentZScores(state, astronautId, metric);
  }
  const astronaut = state.astronauts.find(a => a.id === astronautId);
  if (!astronaut) {
    return { ok: false, error: "astronaute inconnu" };
  }

  const metricConfig = metrics[metric];
  if (!metricConfig) {
    return { ok: false, error: "mesure inconnue" };
  }

  // Vérification 1 : valeur impossible -> ignorée.
  if (isImpossible(metric, value)) {
    return { ok: false, status: "ignored", reason: "Valeur hors plage physiologiquement possible — mesure ignorée." };
  }

  const baselineBefore = astronaut.baseline[metric];
  const z = zScore(value, baselineBefore);

  // Vérification 3 : mesure isolée aberrante -> redemandée plutôt qu'alarme directe.
  if (isIsolatedOutlier(z, recentZScores)) {
    return {
      ok: true,
      status: "to_retake",
      reason: "Écart important mais isolé par rapport aux mesures récentes — nouvelle mesure demandée avant toute alarme.",
      zScore: round(z)
    };
  }

  // Couche 4 : mise à jour bayésienne de la référence personnelle.
  const baselineAfter = updateBaseline(baselineBefore, value, metricConfig.measurementVariance);
  astronaut.baseline[metric] = baselineAfter;

  // Couches 1+2+3+5 combinées : bande adaptée.
  const band = computeAdaptedBand(metricConfig, baselineAfter, context || {});
  const alert = evaluateAlert(value, band);
  const action = suggestAction(metric, alert);

  const journalEntry = {
    timestamp: new Date().toISOString(),
    astronautId,
    astronautName: astronaut.name,
    metric,
    metricLabel: metricConfig.label,
    value,
    unit: metricConfig.unit,
    band,
    alert,
    action: action.action,
    reason: action.reason
  };

  state.journal.unshift(journalEntry);
  state.journal = state.journal.slice(0, 50);

  if (state.linkStatus === "down") {
    state.transmissionQueue.push(journalEntry);
  }

  return {
    ok: true,
    status: "processed",
    baselineBefore,
    baselineAfter,
    band,
    alert,
    action,
    normComparison: {
      terrestrial: `${metricConfig.terrestrial.center - metricConfig.terrestrial.tolerance} – ${metricConfig.terrestrial.center + metricConfig.terrestrial.tolerance} ${metricConfig.unit}`,
      aura: `${band.lower} – ${band.upper} ${metricConfig.unit} (source écart spatial : ${metricConfig.spatialSource})`
    },
    journalEntry
  };
}

function round(n) { return Math.round(n * 100) / 100; }

module.exports = { processMeasurement, getRecentZScores };
