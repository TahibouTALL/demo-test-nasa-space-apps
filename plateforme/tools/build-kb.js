// Construit les données des fiches à partir de l'export Markdown du document.
const fs = require('fs');
const path = require('path');
const [md, out] = process.argv.slice(2);
const SRC = path.join(__dirname, '..', 'src', 'js');
const LIB = require(path.join(SRC, 'kb', 'fiches.js'));
const VOCAB = require(path.join(SRC, 'kb', 'vocab.js'));
const PHARMA = require(path.join(SRC, 'core', 'pharma.js'));
const kb = LIB.build(fs.readFileSync(md, 'utf8'), VOCAB, PHARMA, { etat: 'brouillon' });
kb.source = { titre: 'AURA : fiches et règles de la base de connaissances', export: new Date().toISOString().slice(0, 10) };
const body = '/* Généré par tools/build-kb.js à partir du document des fiches. Ne pas modifier à la main. */\n' +
  '(function (root) { var d = ' + JSON.stringify(kb) + ';\n' +
  'if (typeof module === "object" && module.exports) module.exports = d; else root.AURA_KB_DATA = d; })(typeof self !== "undefined" ? self : this);\n';
fs.writeFileSync(out, body);
console.log('fiches', kb.fiches.length, '; index', kb.stats.index, '; règles', kb.regles.length, '; métiers', kb.metiers.length, ';', (body.length / 1024).toFixed(0), 'Ko');
const noPrior = kb.fiches.filter(f => !f.apriori.iss).map(f => f.id);
console.log('sans probabilité :', noPrior.join(' '));
const noFacts = kb.fiches.filter(f => !f.pour.length).map(f => f.id + ' ' + f.nom);
console.log('sans fait « pour » :', noFacts.length, noFacts.join(' | '));
