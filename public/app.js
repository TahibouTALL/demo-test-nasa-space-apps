// AURA — démonstrateur connecté à l'API réelle (server/server.js).
// Chaque clic sur un scénario appelle POST /api/scenarios/:id/replay, qui
// fait tourner la vraie chaîne de traitement (validation, mise à jour
// bayésienne, norme adaptée, alarme, action) côté serveur. Rien n'est
// pré-calculé côté client.

const API = "/api";
let SCENARIOS = [];

function el(id){ return document.getElementById(id); }

async function api(path, options) {
  const res = await fetch(API + path, options);
  if (!res.ok) throw new Error("Erreur API " + path);
  return res.json();
}

function renderVitals(result){
  const vit = el("crew-vitals");
  if (!result || result.scenario.type !== "measurement"){
    vit.innerHTML = `<p class="empty-note">Pas de mesure physiologique associée à ce scénario.</p>`;
    return;
  }
  const { scenario, result: r } = result;
  const labels = { temp:"Température", hr:"Fréq. cardiaque", co2:"CO₂ cabine", spo2:"SpO₂" };
  vit.innerHTML = `<div><span class="k">${labels[scenario.metric]}</span><span class="v">${scenario.value} ${r.band ? "" : ""}</span></div>`;
}

function renderNorm(result){
  const normBox = el("crew-norm");
  if (!result || result.scenario.type !== "measurement" || !result.result.normComparison){
    normBox.style.display = "none";
    normBox.innerHTML = "";
    return;
  }
  const cmp = result.result.normComparison;
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

function renderAlert(result){
  const alertBox = el("crew-alert");
  const alertText = { none: "Aucune alerte en cours", watch: "Point de vigilance", critical: "MODE URGENCE" };
  const level = result ? (result.result ? result.result.alert : result.journalEntry.alert) : "none";
  alertBox.className = "alert-banner " + level;
  alertBox.textContent = alertText[level] || level;
}

function renderAction(result){
  const box = el("crew-action");
  if (!result) { box.innerHTML = ""; return; }
  if (result.scenario.type === "event"){
    box.innerHTML = `<h3>${result.scenario.title}</h3><p>${result.journalEntry.action}</p>`;
    return;
  }
  const r = result.result;
  if (r.status === "to_retake"){
    box.innerHTML = `<h3>Mesure à reprendre</h3><p>${r.reason}</p>`;
    return;
  }
  box.innerHTML = `<h3>${r.action.action}</h3><p>${r.action.reason}</p>`;
}

function renderDoctor(result){
  el("doctor-tag").textContent = result ? result.scenario.tag : "";
  el("doctor-crew").textContent = result
    ? (result.scenario.type === "event" ? result.scenario.crew : result.result.journalEntry.astronautName)
    : "";
  el("doctor-note").textContent = result
    ? (result.scenario.type === "event" ? result.journalEntry.reason : result.result.action.reason)
    : "";
}

async function renderJournal(){
  const entries = await api("/journal");
  const log = el("journal-log");
  log.innerHTML = "";
  entries.slice(0, 6).forEach(e => {
    const line = document.createElement("div");
    line.className = "journal-line";
    const label = e.event ? e.event : `${e.metricLabel} ${e.value}${e.unit} — ${e.astronautName}`;
    line.textContent = `${new Date(e.timestamp).toLocaleTimeString("fr-FR")} · ${label}${e.alert ? " — " + e.alert : ""}`;
    log.appendChild(line);
  });
}

async function loadScenario(id){
  document.querySelectorAll(".scn-btn").forEach(b => b.classList.toggle("active", b.dataset.id === id));
  const result = await api(`/scenarios/${id}/replay`, { method: "POST" });

  renderVitals(result);
  renderNorm(result);
  renderAlert(result);
  renderAction(result);
  renderDoctor(result);
  await renderJournal();
}

function switchTab(tab){
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  el("panel-" + tab).classList.add("active");
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add("active");
}

async function init(){
  SCENARIOS = await api("/scenarios");
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

  await renderJournal();
  await loadScenario("s2");
}

document.addEventListener("DOMContentLoaded", init);
