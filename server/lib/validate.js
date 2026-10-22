// Les trois vérifications de cohérence retenues pour F3 (voir le document de
// fonctionnalités). Volontairement simples : pas d'indice de fiabilité
// capteur, pas de correction liée au matériel — ce périmètre a été écarté
// (cf. perspectives).

const PHYSIO_LIMITS = {
  temp: { min: 30, max: 43 },      // °C — en dehors : incompatible avec la vie
  hr:   { min: 25, max: 220 },     // bpm
  co2:  { min: 0,  max: 5 },       // % — cabine
  spo2: { min: 40, max: 100 }      // %
};

// 1) Valeur impossible : ignorée (ne met pas à jour la référence, ne déclenche pas d'alarme).
function isImpossible(metric, value) {
  const limits = PHYSIO_LIMITS[metric];
  if (!limits) return false;
  return value === null || value === undefined || Number.isNaN(value) ||
    value < limits.min || value > limits.max;
}

// 2) Donnée manquante : ne doit jamais arrêter la plateforme — on renvoie un
//    statut explicite plutôt que de lever une exception.
function handleMissing(metric) {
  return { status: "missing", metric, message: "Mesure absente — la plateforme continue de fonctionner avec les dernières données disponibles." };
}

// 3) Mesure isolée aberrante : si elle s'écarte fortement de la référence
//    mais que les mesures précédentes/suivantes sont normales, on la met en
//    attente de re-mesure plutôt que de déclencher une alarme immédiate.
function isIsolatedOutlier(zscore, recentZScores, threshold = 3) {
  // Sans historique récent, on ne peut pas affirmer que "les mesures
  // voisines sont normales" — on ne déclenche donc pas ce statut sur la
  // toute première mesure d'un astronaute pour une donnée donnée.
  if (!recentZScores || recentZScores.length === 0) return false;
  const current = Math.abs(zscore) >= threshold;
  const neighborsNormal = recentZScores.every(z => Math.abs(z) < threshold);
  return current && neighborsNormal;
}

module.exports = { isImpossible, handleMissing, isIsolatedOutlier, PHYSIO_LIMITS };
