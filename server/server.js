// Serveur AURA — API + fichiers statiques. Node.js natif (sans dépendance
// externe) pour rester facile à installer et à auditer.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { load, save, reset } = require("./store");
const { processMeasurement } = require("./pipeline");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const METRICS = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "metrics.json"), "utf8"));
const SCENARIOS = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "scenarios.json"), "utf8"));

let state = load();

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function serveStatic(req, res) {
  let filePath = path.join(PUBLIC_DIR, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end("Interdit"); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Introuvable"); return; }
    const ext = path.extname(filePath);
    const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
    res.writeHead(200, { "Content-Type": (types[ext] || "application/octet-stream") + "; charset=utf-8" });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.split("/").filter(Boolean);

  if (segments[0] !== "api") return serveStatic(req, res);

  try {
    // GET /api/astronauts
    if (req.method === "GET" && segments[1] === "astronauts" && segments.length === 2) {
      return sendJson(res, 200, state.astronauts.map(a => ({ id: a.id, name: a.name, baseline: a.baseline })));
    }

    // GET /api/astronauts/:id
    if (req.method === "GET" && segments[1] === "astronauts" && segments.length === 3) {
      const a = state.astronauts.find(x => x.id === segments[2]);
      if (!a) return sendJson(res, 404, { error: "astronaute inconnu" });
      return sendJson(res, 200, a);
    }

    // POST /api/measurements  { astronautId, metric, value, context }
    if (req.method === "POST" && segments[1] === "measurements") {
      const body = await readBody(req);
      const result = processMeasurement({
        state, metrics: METRICS,
        astronautId: body.astronautId, metric: body.metric, value: Number(body.value),
        context: body.context || {}
      });
      save(state);
      return sendJson(res, result.ok === false ? 400 : 200, result);
    }

    // GET /api/journal
    if (req.method === "GET" && segments[1] === "journal") {
      return sendJson(res, 200, state.journal);
    }

    // GET /api/metrics
    if (req.method === "GET" && segments[1] === "metrics") {
      return sendJson(res, 200, METRICS);
    }

    // GET /api/scenarios
    if (req.method === "GET" && segments[1] === "scenarios" && segments.length === 2) {
      return sendJson(res, 200, SCENARIOS.map(s => ({ id: s.id, tag: s.tag, title: s.title, type: s.type })));
    }

    // POST /api/scenarios/:id/replay
    if (req.method === "POST" && segments[1] === "scenarios" && segments[3] === "replay") {
      const scenario = SCENARIOS.find(s => s.id === segments[2]);
      if (!scenario) return sendJson(res, 404, { error: "scénario inconnu" });

      if (scenario.linkDown) state.linkStatus = "down";
      else state.linkStatus = "up";

      if (scenario.type === "event") {
        const entry = {
          timestamp: new Date().toISOString(),
          astronautId: null,
          astronautName: scenario.crew,
          event: scenario.title,
          alert: scenario.emergency ? "critical" : "none",
          action: scenario.note,
          reason: scenario.journal
        };
        state.journal.unshift(entry);
        state.journal = state.journal.slice(0, 50);
        save(state);
        return sendJson(res, 200, { ok: true, status: "event", scenario, journalEntry: entry });
      }

      const result = processMeasurement({
        state, metrics: METRICS,
        astronautId: scenario.astronautId, metric: scenario.metric, value: scenario.value,
        context: scenario.context || {}
      });
      save(state);
      return sendJson(res, 200, { ok: true, scenario, result, transmissionQueue: state.transmissionQueue.length, linkStatus: state.linkStatus });
    }

    // GET /api/state  (file d'attente de transmission, état de la liaison)
    if (req.method === "GET" && segments[1] === "state") {
      return sendJson(res, 200, { linkStatus: state.linkStatus, transmissionQueueLength: state.transmissionQueue.length });
    }

    // POST /api/reset  (remet l'état de démonstration à zéro)
    if (req.method === "POST" && segments[1] === "reset") {
      state = reset();
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: "route inconnue" });
  } catch (err) {
    return sendJson(res, 500, { error: "erreur serveur", detail: String(err && err.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`AURA — serveur démarré sur http://localhost:${PORT}`);
});
