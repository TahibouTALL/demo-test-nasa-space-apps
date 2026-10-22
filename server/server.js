// Serveur AURA facultatif : sert la plateforme (docs/) et expose une petite
// API HTTP pour brancher plus tard de vrais capteurs. Il réutilise exactement
// le même moteur que le navigateur (docs/js), sans dépendance externe.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const S = require('../docs/js/store.js');
const E = require('../docs/js/engine.js');
const D = require('../docs/js/data.js');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..', 'docs');
const STATE_FILE = path.join(__dirname, 'etat.json');
const disk = {
  getItem: () => (fs.existsSync(STATE_FILE) ? fs.readFileSync(STATE_FILE, 'utf8') : null),
  setItem: (k, v) => fs.writeFileSync(STATE_FILE, v),
  removeItem: () => { if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE); }
};
let state = S.load(disk) || S.createState({});
S.save(state, disk);

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };

function json(res, code, body) {
  const out = JSON.stringify(body, null, 2);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(out);
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function summary() {
  const day = state.now / 1440;
  return {
    heureDeBord: E.fmt.when(state.now),
    phase: E.phaseAt(D.mission, day).label,
    delaiRadioMinutes: Math.round(E.lightMinutes(D.mission, day) * 100) / 100,
    liaison: E.isBlackout(D.mission, day) ? 'coupée' : 'établie',
    alertesOuvertes: state.alerts.filter(a => a.st !== 'close').map(a => ({ niveau: a.lv, titre: a.title })),
    equipage: D.crew.map(c => ({
      id: c.id, nom: c.name,
      mesures: S.METRIC_IDS.reduce((o, k) => { const m = S.lastMeasurement(state, c.id, k); o[k] = m ? { valeur: m.v, lectureAura: m.lv, z: m.z, lectureTerrestre: E.terrestrialReading(D.metrics[k], m.v).label } : null; return o; }, {})
    }))
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/etat' && req.method === 'GET') return json(res, 200, summary());
    if (url.pathname === '/api/journal' && req.method === 'GET') return json(res, 200, state.journal.slice(0, 100));
    if (url.pathname === '/api/mesures' && req.method === 'POST') {
      const b = await body(req);
      if (!S.crewById[b.a] || !D.metrics[b.k]) return json(res, 400, { erreur: 'membre d’équipage ou mesure inconnus (a : a1 à a4, k : temp, hr, spo2)' });
      const r = S.addMeasurement(state, { a: b.a, k: b.k, v: b.v, ctx: b.ctx || {}, src: 'api' });
      S.save(state, disk);
      return json(res, 200, { statut: r.status, lectureAura: r.ev ? r.ev.level : null, z: r.ev ? r.ev.z : null, plageAttendue: r.ev ? r.ev.band : null, lectureTerrestre: r.ev ? r.ev.terrestrial.label : null, explicationEquipage: r.text ? r.text.crew : null, explicationMedecin: r.text ? r.text.doctor : null });
    }
    if (url.pathname === '/api/avancer' && req.method === 'POST') {
      const b = await body(req);
      const ev = S.advanceTo(state, state.now + Math.max(1, Math.min(30 * 1440, Number(b.minutes) || 60)));
      S.save(state, disk);
      return json(res, 200, { evenements: ev, etat: summary() });
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { erreur: 'route inconnue' });
    let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Interdit'); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Introuvable'); }
      res.writeHead(200, { 'Content-Type': (TYPES[path.extname(file)] || 'application/octet-stream') + (/\.(html|js|css|txt|webmanifest|svg)$/.test(file) ? '; charset=utf-8' : '') });
      res.end(data);
    });
  } catch (err) {
    json(res, 500, { erreur: String(err && err.message || err) });
  }
});
server.listen(PORT, () => console.log('AURA : http://localhost:' + PORT));
