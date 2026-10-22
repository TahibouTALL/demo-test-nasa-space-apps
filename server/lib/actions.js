// F6 — proposition d'action adaptée au vol. Table de règles simple et
// traçable (pas un modèle opaque) : chaque ligne est justifiable devant un
// médecin.

const RULES = [
  {
    metric: "temp", alert: "none",
    action: "Aucune action requise.",
    reason: "Valeur dans la plage attendue compte tenu de l'élévation thermique documentée en vol (Stahn et al., 2017)."
  },
  {
    metric: "temp", alert: "watch",
    action: "Reprendre la mesure dans 2 heures ; surveiller l'apparition d'autres symptômes.",
    reason: "Écart modéré par rapport à la référence personnelle ajustée."
  },
  {
    metric: "temp", alert: "critical",
    action: "Alerter le médecin de garde ; envisager un traitement antipyrétique à dose adaptée au vol.",
    reason: "Écart important, en dehors de la bande tolérée même après ajustement spatial."
  },
  {
    metric: "co2", alert: "watch",
    action: "Vérifier la ventilation cabine avant tout traitement symptomatique.",
    reason: "Un CO2 cabine élevé est une cause fréquente et corrigible de céphalée en vol (Law et al., 2014)."
  },
  {
    metric: "co2", alert: "critical",
    action: "Activer la ventilation de secours ; évacuer vers un module mieux ventilé si disponible.",
    reason: "Niveau de CO2 pouvant affecter les performances cognitives de l'équipage."
  },
  {
    metric: "spo2", alert: "watch",
    action: "Reprendre la mesure ; vérifier le bon positionnement du capteur.",
    reason: "Écart isolé, à confirmer avant toute action."
  },
  {
    metric: "spo2", alert: "critical",
    action: "Administrer de l'oxygène d'appoint si disponible ; alerter le médecin de garde immédiatement.",
    reason: "Désaturation significative."
  },
  {
    metric: "hr", alert: "watch",
    action: "Noter le contexte (effort récent, stress) et reprendre la mesure au repos.",
    reason: "La fréquence cardiaque au repos varie avec la charge de travail et le stress en mission."
  },
  {
    metric: "hr", alert: "critical",
    action: "Alerter le médecin de garde ; mettre l'astronaute au repos strict.",
    reason: "Écart important par rapport à la référence personnelle."
  }
];

function suggestAction(metric, alert) {
  const specific = RULES.find(r => r.metric === metric && r.alert === alert);
  if (specific) return specific;

  // Repli générique — jamais une règle écrite pour une autre mesure : un
  // repli silencieux sur "la première règle qui correspond à ce niveau
  // d'alerte" aurait pu afficher un commentaire sur la température pour
  // une mesure de fréquence cardiaque.
  if (alert === "none") {
    return {
      action: "Aucune action requise.",
      reason: "Valeur dans la plage attendue compte tenu des ajustements spatiaux et de la référence personnelle de l'astronaute."
    };
  }
  return {
    action: "Signaler pour revue médicale.",
    reason: "Cas non couvert explicitement par la table de règles actuelle — vérification humaine recommandée."
  };
}

module.exports = { suggestAction, RULES };
