// Mise à jour bayésienne de la référence personnelle (modèle normal-normal conjugué).
//
// On modélise la vraie valeur "au repos" d'un astronaute pour une mesure donnée
// comme une variable normale. Le "prior" est construit avant le vol (plusieurs
// mesures de référence) ; chaque nouvelle mesure en vol vient resserrer cette
// estimation, proportionnellement à sa fiabilité relative.
//
//   prior      : N(mu0, sigma0^2)        — connaissance avant la mesure
//   mesure     : x, avec bruit connu sigma_m^2
//   posterior  : N(mu1, sigma1^2)
//
//   mu1    = (sigma_m^2 * mu0 + sigma0^2 * x) / (sigma0^2 + sigma_m^2)
//   sigma1^2 = (sigma0^2 * sigma_m^2) / (sigma0^2 + sigma_m^2)
//
// Avec peu de mesures (petit échantillon, cf. étape 5 du parcours), sigma0
// reste grand au début : chaque nouvelle mesure a alors plus de poids. Au fil
// de la mission, sigma1 diminue : la référence devient plus précise et plus
// stable.

function updateBaseline(prior, measurementValue, measurementVariance) {
  const { mu: mu0, variance: sigma0sq } = prior;
  const sigmaMsq = measurementVariance;

  const denom = sigma0sq + sigmaMsq;
  const mu1 = (sigmaMsq * mu0 + sigma0sq * measurementValue) / denom;
  const sigma1sq = (sigma0sq * sigmaMsq) / denom;

  return { mu: mu1, variance: sigma1sq };
}

// Score d'écart standardisé par rapport à la référence courante (z-score),
// utilisé pour repérer une mesure isolée aberrante avant de déclencher une
// alarme.
function zScore(value, baseline) {
  const sd = Math.sqrt(baseline.variance) || 1e-6;
  return (value - baseline.mu) / sd;
}

module.exports = { updateBaseline, zScore };
