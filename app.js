// AURA — démonstrateur interactif (données simulées)
// Ceci ne connecte aucun capteur réel : chaque scénario charge un jeu de
// données fixé à l'avance, pour montrer comment l'interface réagirait.

const SCENARIOS = [
  {
    id: "s1",
    tag: "AVANT LE VOL",
    title: "Planification pessimiste vers Mars",
    crew: "Équipage complet — préparation mission",
    vitals: null,
    norm: null,
    alert: "none",
    actionTitle: "Dimensionnement de la trousse médicale",
    actionText: "Simulation sur le scénario le plus défavorable (incidence haute, mission longue) : la quantité d'antalgiques et d'antibiotiques à emporter est recalculée à la hausse plutôt que sur une moyenne statistique.",
    journal: "J-90 · Planification — trousse médicale dimensionnée sur l'hypothèse pessimiste (modèle IMM).",
    doctorNote: "Stock recommandé : +34 % sur les antalgiques par rapport à une planification moyenne, pour couvrir le scénario défavorable sur 9 mois sans réapprovisionnement."
  },
  {
    id: "s2",
    tag: "J+12",
    title: "Fausse fièvre à 38,1 °C",
    crew: "Astronaute 2",
    vitals: { temp: "38.1 °C", hr: "78 bpm", co2: "0.4 %", spo2: "98 %" },
    norm: { today: "Fièvre — seuil dépassé (37.8 °C)", aura: "Dans la plage attendue en vol (+1 °C documenté, Stahn et al. 2017)" },
    alert: "none",
    actionTitle: "Aucune action requise",
    actionText: "La mesure serait signalée comme fièvre par une norme terrestre. AURA la replace dans la plage attendue pour ce stade de mission et ne déclenche pas d'alerte inutile.",
    journal: "J+12 · Mesure température 38.1 °C — classée normale (référence spatiale), aucune alerte envoyée.",
    doctorNote: "Aucune intervention. Si la valeur se maintenait au-dessus de 38.4 °C sur deux mesures consécutives, le seuil réel d'alarme s'activerait."
  },
  {
    id: "s3",
    tag: "J+30",
    title: "Mal de tête et CO₂",
    crew: "Astronaute 4",
    vitals: { temp: "37.0 °C", hr: "74 bpm", co2: "0.6 %", spo2: "97 %" },
    norm: { today: "Symptôme isolé — traitement symptomatique par défaut", aura: "CO₂ cabine élevé depuis 6 h — cause probable identifiée (Law et al. 2014)" },
    alert: "watch",
    actionTitle: "Vérifier la ventilation avant de traiter",
    actionText: "Plutôt que de proposer un antalgique en premier réflexe, AURA relie le symptôme au taux de CO₂ mesuré dans la cabine et propose de vérifier la ventilation d'abord.",
    journal: "J+30 · Céphalée signalée — corrélée à CO₂ cabine 0.6 %. Action proposée : ventilation avant traitement symptomatique.",
    doctorNote: "Si le CO₂ cabine reste élevé après correction de la ventilation, reconsidérer un antalgique standard à dose adaptée."
  },
  {
    id: "s4",
    tag: "J+58",
    title: "Éruption solaire",
    crew: "Équipage complet",
    vitals: { temp: "37.1 °C", hr: "88 bpm", co2: "0.4 %", spo2: "97 %" },
    norm: { today: "—", aura: "Risque radiatif en hausse rapide (alerte externe reçue)" },
    alert: "critical",
    actionTitle: "Mode urgence activé",
    actionText: "Déclenchement automatique : repli vers la zone protégée, suspension des activités extravéhiculaires, surveillance renforcée des signes vitaux pour les 6 prochaines heures.",
    journal: "J+58 · MODE URGENCE — éruption solaire détectée. Repli zone protégée ordonné. Transmission prioritaire envoyée au sol.",
    doctorNote: "Message prioritaire envoyé malgré la latence de communication ; accusé de réception attendu, action déjà engagée côté équipage sans attendre la réponse."
  },
  {
    id: "s5",
    tag: "CHAQUE SEMAINE",
    title: "Conférence médicale IA",
    crew: "Équipage complet",
    vitals: null,
    norm: null,
    alert: "none",
    actionTitle: "Synthèse hebdomadaire préparée",
    actionText: "Avant l'échange avec le médecin au sol, une synthèse est générée : tendances sur 7 jours, deux points d'attention identifiés, aucune anomalie critique cette semaine.",
    journal: "J+63 · Synthèse hebdomadaire générée — 2 points d'attention, 0 alerte critique.",
    doctorNote: "Points à discuter en conférence : sommeil légèrement réduit (astronaute 3), charge de travail élevée deux jours consécutifs (astronaute 1)."
  },
  {
    id: "s6",
    tag: "J+140",
    title: "Conjonction solaire",
    crew: "Équipage complet",
    vitals: { temp: "37.0 °C", hr: "70 bpm", co2: "0.4 %", spo2: "98 %" },
    norm: { today: "—", aura: "Liaison avec la Terre coupée (conjonction) — autonomie requise" },
    alert: "watch",
    actionTitle: "Fonctionnement autonome, étage cœur seul",
    actionText: "Aucune liaison possible pendant plusieurs jours. Les normes, alarmes et actions restent disponibles localement ; les messages sont mis en file et partiront à la reprise du signal.",
    journal: "J+140 · Liaison coupée (conjonction prévue). Étage cœur actif seul. 4 messages en file d'attente.",
    doctorNote: "Rien à valider au sol pendant la coupure : les décisions prises en autonomie seront revues à la reprise de la liaison, avec le journal complet."
  }
];

let current = null;

function el(id){ return document.getElementById(id); }

function renderCrewView(s){
  const vit = el("crew-vitals");
  const normBox = el("crew-norm");
  const alertBox = el("crew-alert");
  const actionBox = el("crew-action");

  if (!s.vitals){
    vit.innerHTML = `<p class="empty-note">Pas de mesure physiologique associée à ce scénario.</p>`;
  } else {
    vit.innerHTML = Object.entries(s.vitals).map(([k,v]) => {
      const labels = { temp:"Température", hr:"Fréq. cardiaque", co2:"CO₂ cabine", spo2:"SpO₂" };
      return `<div><span class="k">${labels[k]}</span><span class="v">${v}</span></div>`;
    }).join("");
  }

  if (!s.norm){
    normBox.innerHTML = "";
    normBox.style.display = "none";
  } else {
    normBox.style.display = "grid";
    normBox.innerHTML = `
      <div class="today">
        <span class="label">LECTURE TERRESTRE</span>
        <p>${s.norm.today}</p>
      </div>
      <div class="aura">
        <span class="label">LECTURE AURA</span>
        <p>${s.norm.aura}</p>
      </div>`;
  }

  alertBox.className = "alert-banner " + s.alert;
  const alertText = { none: "Aucune alerte en cours", watch: "Point de vigilance", critical: "MODE URGENCE" };
  alertBox.textContent = alertText[s.alert];

  actionBox.innerHTML = `<h3>${s.actionTitle}</h3><p>${s.actionText}</p>`;
}

function renderDoctorView(s){
  el("doctor-crew").textContent = s.crew;
  el("doctor-note").textContent = s.doctorNote;
  el("doctor-tag").textContent = s.tag;
}

function appendJournal(s){
  const log = el("journal-log");
  const line = document.createElement("div");
  line.className = "journal-line";
  line.textContent = s.journal;
  log.prepend(line);
  while (log.children.length > 6) log.removeChild(log.lastChild);
}

function loadScenario(id){
  const s = SCENARIOS.find(x => x.id === id);
  if (!s) return;
  current = s;

  document.querySelectorAll(".scn-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.id === id);
  });

  renderCrewView(s);
  renderDoctorView(s);
  appendJournal(s);
}

function switchTab(tab){
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  el("panel-" + tab).classList.add("active");
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
  const scnList = el("scn-list");
  SCENARIOS.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "scn-btn";
    btn.dataset.id = s.id;
    btn.innerHTML = `<span class="scn-tag">${s.tag}</span><span class="scn-title">${s.title}</span>`;
    btn.addEventListener("click", () => loadScenario(s.id));
    scnList.appendChild(btn);
  });

  document.querySelectorAll(".tab-btn").forEach(b => {
    b.addEventListener("click", () => switchTab(b.dataset.tab));
  });

  loadScenario("s2");
});
