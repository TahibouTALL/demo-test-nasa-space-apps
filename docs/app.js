// AURA — interface du démonstrateur, branchée sur le moteur de calcul réel
// (engine.js), exécuté entièrement dans le navigateur. L'état repart de
// zéro à chaque rechargement de page.

let SCENARIOS = [];
let METRICS = {};
let STATE = null;

function el(id){ return document.getElementById(id); }

async function loadJson(path){
  const res = await fetch(path);
  return res.json();
}

function renderVitals(scenario, result){
  const vit = el("crew-vitals");
  if (!scenario || scenario.type !== "measurement"){
    vit.innerHTML = `<p class="empty-note">Pas de mesure physiologique associée à ce scénario.</p>`;
    return;
  }
  const label = METRICS[scenario.metric].label;
  vit.innerHTML = `<div><span class="k">${label}</span><span class="v">${scenario.value} ${METRICS[scenario.metric].unit}</span></div>`;
}

function renderNorm(scenario, result){
  const normBox = el("crew-norm");
  if (!scenario || scenario.type !== "measurement" || !result.normComparison){
    normBox.style.display = "none";
    normBox.innerHTML = "";
    return;
  }
  const cmp = result.normComparison;
  normBox.style.display = "grid";
  normBox.innerHTML = `
    <div class="today">
      <span class="label">LECTURE TERRESTRE</span>
      <p>Plage habituelle : ${cmp.terrestrial}</p>
    </div>
    <div class="aura">
      <span class="label">LECTURE AURA (calculée en direct)</span>
      <p>Plage adaptée : ${cmp.aura}</p>
    </div>`;
}

function renderAlert(level){
  const alertBox = el("crew-alert");
  const alertText = { none: "Aucune alerte en cours", watch: "Point de vigilance", critical: "MODE URGENCE" };
  alertBox.className = "alert-banner " + level;
  alertBox.textContent = alertText[level] || level;
}

function renderAction(scenario, entry){
  const box = el("crew-action");
  if (!scenario) { box.innerHTML = ""; return; }
  if (scenario.type === "event"){
    box.innerHTML = `<h3>${scenario.title}</h3><p>${entry.action}</p>`;
    return;
  }
  if (entry.status === "to_retake"){
    box.innerHTML = `<h3>Mesure à reprendre</h3><p>${entry.reason}</p>`;
    return;
  }
  box.innerHTML = `<h3>${entry.action.action}</h3><p>${entry.action.reason}</p>`;
}

function renderDoctor(scenario, entry){
  el("doctor-tag").textContent = scenario ? scenario.tag : "";
  el("doctor-crew").textContent = scenario
    ? (scenario.type === "event" ? scenario.crew : entry.journalEntry.astronautName)
    : "";
  el("doctor-note").textContent = scenario
    ? (scenario.type === "event" ? entry.reason : entry.action.reason)
    : "";
}

function renderJournal(){
  const log = el("journal-log");
  log.innerHTML = "";
  STATE.journal.slice(0, 6).forEach(e => {
    const line = document.createElement("div");
    line.className = "journal-line";
    const label = e.event ? e.event : `${e.metricLabel} ${e.value}${e.unit} — ${e.astronautName}`;
    line.textContent = `${new Date(e.timestamp).toLocaleTimeString("fr-FR")} · ${label}${e.alert ? " — " + e.alert : ""}`;
    log.appendChild(line);
  });
}

function loadScenario(id){
  document.querySelectorAll(".scn-btn").forEach(b => b.classList.toggle("active", b.dataset.id === id));
  const scenario = SCENARIOS.find(s => s.id === id);

  STATE.linkStatus = scenario.linkDown ? "down" : "up";

  let entry;
  if (scenario.type === "event"){
    entry = {
      timestamp: new Date().toISOString(),
      astronautId: null,
      astronautName: scenario.crew,
      event: scenario.title,
      alert: scenario.emergency ? "critical" : "none",
      action: scenario.note,
      reason: scenario.journal
    };
    STATE.journal.unshift(entry);
    STATE.journal = STATE.journal.slice(0, 50);

    renderVitals(scenario, null);
    renderNorm(scenario, null);
    renderAlert(entry.alert);
    renderAction(scenario, entry);
    renderDoctor(scenario, entry);
  } else {
    const result = AuraEngine.processMeasurement({
      state: STATE, metrics: METRICS,
      astronautId: scenario.astronautId, metric: scenario.metric, value: scenario.value,
      context: scenario.context || {}
    });

    renderVitals(scenario, result);
    renderNorm(scenario, result);
    renderAlert(result.status === "to_retake" ? "watch" : result.alert);
    renderAction(scenario, result);
    renderDoctor(scenario, result);
  }

  renderJournal();
}

function switchTab(tab){
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  el("panel-" + tab).classList.add("active");
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add("active");
}

async function init(){
  const [metrics, astronauts, scenarios] = await Promise.all([
    loadJson("data/metrics.json"),
    loadJson("data/astronauts.seed.json"),
    loadJson("data/scenarios.json")
  ]);
  METRICS = metrics;
  SCENARIOS = scenarios;
  STATE = { astronauts, journal: [], transmissionQueue: [], linkStatus: "up" };

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
}

document.addEventListener("DOMContentLoaded", init);
