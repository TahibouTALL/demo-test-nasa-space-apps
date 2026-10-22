// Tests minimaux, sans dépendance externe (node:assert).
// Lancer avec : npm test

const assert = require("assert");
const { updateBaseline, zScore } = require("./lib/bayesian");
const { isImpossible, isIsolatedOutlier } = require("./lib/validate");
const { computeAdaptedBand, evaluateAlert } = require("./lib/norms");

// 1) La mise à jour bayésienne doit rapprocher la moyenne vers la mesure,
//    et réduire la variance (plus de confiance après une mesure).
{
  const prior = { mu: 36.8, variance: 0.09 };
  const posterior = updateBaseline(prior, 38.1, 0.04);
  assert.ok(posterior.mu > prior.mu, "la moyenne doit se déplacer vers la mesure");
  assert.ok(posterior.variance < prior.variance, "la variance doit diminuer après une mesure");
}

// 2) Valeur impossible -> ignorée.
{
  assert.strictEqual(isImpossible("temp", 90), true);
  assert.strictEqual(isImpossible("temp", 37), false);
}

// 3) Mesure isolée aberrante détectée seulement si le voisinage est normal.
{
  assert.strictEqual(isIsolatedOutlier(4, [0.2, -0.3]), true);
  assert.strictEqual(isIsolatedOutlier(4, [3.5, 3.8]), false);
}

// 4) La bande adaptée doit intégrer le décalage spatial : une fièvre
//    terrestre (38.1 °C) doit retomber dans la bande "none" une fois
//    l'effet spatial et la mise à jour bayésienne pris en compte — c'est
//    exactement l'enchaînement utilisé par pipeline.js.
{
  const metricConfig = {
    terrestrial: { center: 36.8, tolerance: 0.6 },
    spatialOffset: 1.0
  };
  const priorBaseline = { mu: 36.9, variance: 0.09 };
  const baselineAfter = updateBaseline(priorBaseline, 38.1, 0.04);
  const band = computeAdaptedBand(metricConfig, baselineAfter, {});
  const alert = evaluateAlert(38.1, band);
  assert.strictEqual(alert, "none", `38.1°C devrait être "none" une fois ajusté, obtenu: ${alert} (bande ${band.lower}-${band.upper})`);
}

console.log("Tous les tests sont passés.");
