// Calcul de la "norme d'interprétation" adaptée (F4), à partir du modèle à
// cinq couches :
//   1. norme terrestre
//   2. effet spatial connu (littérature)
//   3. référence personnelle pré-vol
//   4. mise à jour bayésienne en vol (bayesian.js)
//   5. correction de contexte (phase de mission, stress, isolement)

function computeAdaptedBand(metricConfig, baseline, context) {
  const { terrestrial, spatialOffset } = metricConfig;

  // Couches 1 + 2 : on décale le centre terrestre de l'effet spatial documenté.
  const spaceAdjustedCenter = terrestrial.center + spatialOffset;

  // Couches 3 + 4 : la référence personnelle (prior pré-vol, mis à jour en vol)
  // vient recentrer encore l'estimation — pondérée par la confiance qu'on a
  // dans chacune (peu de mesures en vol -> on garde plus de poids sur l'effet
  // spatial générique ; beaucoup de mesures -> la référence personnelle domine).
  const personalWeight = 1 / (1 + baseline.variance);
  const genericWeight = 1 - Math.min(personalWeight, 0.9);
  const center = genericWeight * spaceAdjustedCenter + (1 - genericWeight) * baseline.mu;

  // Couche 5 : correction de contexte — élargit la bande tolérée en situation
  // de stress ou de charge de travail élevée, pour éviter les fausses alarmes.
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

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { computeAdaptedBand, evaluateAlert };
