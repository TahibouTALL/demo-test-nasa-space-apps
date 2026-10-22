// Persistance simple par fichier JSON. Suffisant pour un MVP de hackathon ;
// à remplacer par une vraie base (SQLite/Postgres) si le projet continue.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const SEED_FILE = path.join(DATA_DIR, "astronauts.seed.json");

function load() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  }
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  const state = {
    astronauts: seed,
    journal: [],
    transmissionQueue: [],
    linkStatus: "up"
  };
  save(state);
  return state;
}

function save(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function reset() {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  return load();
}

module.exports = { load, save, reset };
