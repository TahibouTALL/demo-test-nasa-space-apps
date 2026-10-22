// Tests du moteur et de la simulation AURA (node:assert, sans dépendance).
// Lancer avec : npm test
'use strict';
const assert = require('assert');
const D = require('../docs/js/data.js');
const E = require('../docs/js/engine.js');
const S = require('../docs/js/store.js');
const KB = require('../docs/js/kb.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  ÉCHEC ' + name + '\n       ' + (e && e.message)); }
}

// Un filtre entraîné sur des mesures quotidiennes simulées
function trained(metric, astro, days, valueFn) {
  const cfg = D.metrics[metric];
  let f = E.initFilter(cfg, astro.pre[metric]);
  const r = E.rng(7);
  for (let d = 1; d <= days; d++) {
    const out = E.processMeasurement(cfg, f, { t: d + 0.3, value: valueFn(d, r) });
    f = out.filter;
  }
  return f;
}
const lucas = D.crew.find(c => c.id === 'a2');
const rafael = D.crew.find(c => c.id === 'a4');
const tempLucas = (d, r) => Math.round((lucas.pre.temp.mean + lucas.truth.tempRise * (1 - Math.exp(-d / 30)) + E.gauss(r) * 0.22) * 10) / 10;
const hrRafael = (d, r) => Math.round(52 + E.gauss(r) * 3);

console.log('Normes adaptées');
test('la référence avant vol se place entre la norme et la moyenne personnelle, plus près de la personne', () => {
  const b = E.preflightBaseline(D.metrics.hr, { mean: 51, n: 20 });
  assert.ok(b.mu > 51 && b.mu < 68);
  assert.ok(Math.abs(b.mu - 51) < Math.abs(b.mu - 68));
});
test('une valeur normale est intégrée et resserre l’incertitude', () => {
  const cfg = D.metrics.temp;
  const f = E.initFilter(cfg, lucas.pre.temp);
  const pred = E.predict(cfg, f, 1);
  const out = E.processMeasurement(cfg, f, { t: 1, value: 37.0 });
  assert.strictEqual(out.status, 'processed');
  assert.strictEqual(out.absorbed, true);
  assert.ok(out.filter.P < pred.P);
});
test('fausse fièvre : 38,1 °C à J+70 est normal pour Lucas, la norme terrestre dit fièvre', () => {
  const f = trained('temp', lucas, 70, tempLucas);
  const out = E.processMeasurement(D.metrics.temp, f, { t: 70.3, value: 38.1 });
  assert.strictEqual(out.ev.level, 'normal');
  assert.strictEqual(out.ev.terrestrial.label, 'fièvre');
});
test('une vraie fièvre à 38,9 °C à J+70 n’est pas lue comme normale', () => {
  const f = trained('temp', lucas, 70, tempLucas);
  const out = E.processMeasurement(D.metrics.temp, f, { t: 70.3, value: 38.9 });
  assert.notStrictEqual(out.ev.level, 'normal');
  assert.strictEqual(out.absorbed, false);
});
test('garde-fou absolu : 39,2 °C déclenche toujours une alerte', () => {
  const f = trained('temp', lucas, 70, tempLucas);
  const out = E.processMeasurement(D.metrics.temp, f, { t: 70.3, value: 39.2, context: { effort: true } });
  assert.strictEqual(out.ev.level, 'urgence');
  assert.strictEqual(out.ev.hard, 'high');
});
test('pouls de 52 chez Rafael : bradycardie sur Terre, normal pour lui', () => {
  const f = trained('hr', rafael, 58, hrRafael);
  const out = E.processMeasurement(D.metrics.hr, f, { t: 58.3, value: 52 });
  assert.strictEqual(out.ev.level, 'normal');
  assert.strictEqual(out.ev.terrestrial.label, 'bradycardie');
});
test('pouls de 92 chez Rafael : normal sur Terre, inhabituel pour lui', () => {
  const f = trained('hr', rafael, 58, hrRafael);
  const out = E.processMeasurement(D.metrics.hr, f, { t: 58.3, value: 92, retake: true });
  assert.strictEqual(out.ev.terrestrial.level, 'normal');
  assert.notStrictEqual(out.ev.level, 'normal');
});
test('un effort récent élargit la plage attendue', () => {
  const f = trained('hr', rafael, 58, hrRafael);
  const a = E.processMeasurement(D.metrics.hr, f, { t: 58.3, value: 70, retake: true });
  const b = E.processMeasurement(D.metrics.hr, f, { t: 58.3, value: 70, context: { effort: true } });
  assert.ok(b.ev.band[1] - b.ev.band[0] > a.ev.band[1] - a.ev.band[0]);
  assert.strictEqual(b.ev.level, 'normal');
});
test('après un antipyrétique, la température n’entre pas dans la référence', () => {
  const f = trained('temp', lucas, 30, tempLucas);
  const out = E.processMeasurement(D.metrics.temp, f, { t: 30.3, value: 37.4, context: { antipyretique: true } });
  assert.strictEqual(out.absorbed, false);
});

console.log('Les trois vérifications des mesures');
test('valeur impossible : ignorée', () => {
  const f = E.initFilter(D.metrics.temp, lucas.pre.temp);
  assert.strictEqual(E.processMeasurement(D.metrics.temp, f, { t: 1, value: 45.3 }).status, 'rejected');
});
test('donnée manquante : pas d’erreur, la plateforme continue', () => {
  const f = E.initFilter(D.metrics.temp, lucas.pre.temp);
  const out = E.processMeasurement(D.metrics.temp, f, { t: 1, value: null });
  assert.strictEqual(out.status, 'missing');
  assert.strictEqual(out.filter, f);
});
test('valeur isolée très éloignée : nouvelle mesure demandée, puis alerte si confirmée', () => {
  const cfg = D.metrics.spo2;
  const f = trained('spo2', lucas, 20, () => 98);
  const first = E.processMeasurement(cfg, f, { t: 20.4, value: 91 });
  assert.strictEqual(first.status, 'retake');
  const again = E.processMeasurement(cfg, f, { t: 20.41, value: 91, retake: true });
  assert.strictEqual(again.status, 'processed');
  assert.notStrictEqual(again.ev.level, 'normal');
});
test('quatre vigilances de suite dans le même sens : validation du médecin demandée', () => {
  const cfg = D.metrics.hr;
  let f = trained('hr', rafael, 30, hrRafael);
  let flagged = false;
  for (let i = 0; i < 6; i++) {
    const center = E.predict(cfg, f, 30.5 + i).x;
    const sd = Math.sqrt(E.predict(cfg, f, 30.5 + i).P + cfg.withinSd * cfg.withinSd);
    const out = E.processMeasurement(cfg, f, { t: 30.5 + i, value: Math.round(center + 3 * sd), retake: true });
    f = out.filter;
    if (out.flags.indexOf('drift') >= 0) flagged = true;
  }
  assert.ok(flagged);
  const v = E.validateDrift(cfg, f, 37);
  assert.strictEqual(v.drift, null);
});

console.log('Textes dans les deux langages');
test('la même mesure a une explication équipage et une explication médecin', () => {
  const f = trained('temp', lucas, 70, tempLucas);
  const out = E.processMeasurement(D.metrics.temp, f, { t: 70.3, value: 38.1 });
  const txt = E.describe(D.metrics.temp, out.ev, E.layers(D.metrics.temp, f, out.ev, 70.3), { absorbed: out.absorbed });
  assert.ok(/Sur Terre/.test(txt.crew));
  assert.ok(/z = /.test(txt.doctor));
  assert.ok(txt.crew.indexOf('—') < 0 && txt.doctor.indexOf('—') < 0);
});

console.log('Liaison avec la Terre');
test('délai radio entre 3 et 22,3 minutes pendant le séjour martien', () => {
  for (let d = 180; d < 720; d += 10) {
    const L = E.lightMinutes(D.mission, d);
    assert.ok(L >= 11.9 && L <= 22.31, 'J+' + d + ' : ' + L);
  }
});
test('conjonction solaire de deux semaines', () => {
  assert.strictEqual(E.isBlackout(D.mission, 446), true);
  assert.strictEqual(E.isBlackout(D.mission, 457), false);
  assert.strictEqual(D.mission.conjunction.end - D.mission.conjunction.start, 14);
});
test('après la coupure, le message le plus prioritaire part en premier', () => {
  const q = [
    { id: 'a', t: 444 * 1440, prio: 3, kb: 100 },
    { id: 'b', t: 445 * 1440, prio: 1, kb: 10 },
    { id: 'c', t: 443 * 1440 + 30, prio: 2, kb: 10 }
  ];
  E.processQueue(D.mission, q, [], 458 * 1440, null);
  const order = q.slice().sort((x, y) => x.sentAt - y.sentAt).map(x => x.id).join('');
  assert.strictEqual(order, 'bca');
});
test('sans coupure, un message part dès qu’il est créé', () => {
  const q = [{ id: 'a', t: 1000, prio: 3, kb: 50 }, { id: 'b', t: 2000, prio: 1, kb: 10 }];
  E.processQueue(D.mission, q, [], 3000, null);
  assert.strictEqual(q[0].sentAt, 1000);
  assert.strictEqual(q[1].sentAt, 2000);
});

console.log('Pharmacie');
test('Monte Carlo reproductible et ordonné : pessimiste ≥ médian ≥ optimiste', () => {
  const stock = {}; D.meds.forEach(m => { stock[m.id] = m.stock; });
  const run = mult => E.simulatePharmacy({ conditions: D.conditions, meds: D.meds, crewSize: 4, startDay: 0, endDay: 900, transitions: D.mission.gravityTransitions, multiplier: mult, runs: 800, seed: 3, stock });
  const a = run(0.7), b = run(1.0), c = run(1.6), b2 = run(1.0);
  const z = x => x.find(r => r.med === 'zolpidem').mean;
  assert.ok(z(c) > z(b) && z(b) > z(a));
  assert.strictEqual(z(b), z(b2));
  assert.ok(c.find(r => r.med === 'zolpidem').pStockout > 0.5, 'le zolpidem doit manquer en scénario pessimiste');
});
test('dose validée : demi-comprimé possible, pas de demi-ampoule', () => {
  const para = D.meds.find(m => m.id === 'paracetamol');
  const prom = D.meds.find(m => m.id === 'promethazine');
  assert.strictEqual(E.doseUnits(para, 1.5), 1.5);
  assert.strictEqual(E.doseUnits(prom, 1.5), 2);
});
test('un médicament qui périme avant la fin de mission est signalé', () => {
  const prom = D.meds.find(m => m.id === 'promethazine');
  const flags = E.medFlags(prom, 30, 58, D.mission);
  assert.ok(flags.some(f => f.code === 'peremption'));
});

console.log('Recherche documentaire hors connexion');
const index = E.buildIndex(KB.cards);
const top = q => E.search(index, q, KB.synonyms, 3).results.map(r => r.id);
test('« j’ai mal à la tête » trouve la fiche CO₂', () => { assert.ok(top('j’ai mal à la tête').slice(0, 2).indexOf('co2-cephalee') >= 0); });
test('« je dors mal » trouve le sommeil', () => { assert.ok(top('je dors mal').slice(0, 2).some(id => id.indexOf('sommeil') === 0)); });
test('« combien de radiations sur Mars » trouve la surface', () => { assert.ok(top('combien de radiations sur Mars ?').indexOf('radiation-surface') >= 0); });
test('« pourquoi ma température est plus haute » trouve la fiche température', () => { assert.strictEqual(top('pourquoi ma température est plus haute')[0], 'temp-vol'); });
test('« faut-il prendre 1,5 comprimé » trouve la fiche dose', () => { assert.ok(top('faut-il prendre 1,5 comprimé en vol ?').slice(0, 2).indexOf('dose-vol') >= 0); });
test('chaque fiche cite une source connue', () => {
  KB.cards.forEach(c => c.sources.forEach(sid => assert.ok(D.SOURCES[sid], c.id + ' : ' + sid)));
});

console.log('Simulation de la mission');
const s = S.createState({});
test('mission créée à J+58 avec un historique complet', () => {
  assert.strictEqual(Math.floor(s.now / 1440), 58);
  assert.ok(s.meas.length > 600);
  assert.ok(s.hab.length >= 58);
});
test('peu de fausses alertes sur 58 jours (moins d’une par jour pour tout l’équipage)', () => {
  const n = s.meas.filter(m => m.lv && m.lv !== 'normal').length;
  assert.ok(n < 58, n + ' mesures hors plage');
});
test('dose cumulée cohérente avec 1,8 mSv par jour en transit', () => {
  const r = S.radTotalNow(s);
  assert.ok(r > 95 && r < 115, r);
});
test('le rapport hebdomadaire fait ressortir le sommeil de Keiko Tanaka', () => {
  const rep = S.weeklyReport(s, 58);
  assert.ok(rep.points.some(p => p.who === 'a3' && p.kind === 'bienetre'));
});
test('le paracétamol chez Rafael Ortiz appelle une discussion de dose', () => {
  assert.ok(S.responses(s, 'a4', 'paracetamol').hint);
});
test('scénario éruption solaire : mode urgence et message prioritaire', () => {
  const st = S.runScenario('s4').state;
  assert.strictEqual(st.emergency.kind, 'spe');
  assert.ok(st.queue.some(q => q.prio === 1));
});
test('scénario conjonction : la file est bloquée puis se vide', () => {
  const st = S.runScenario('s6').state;
  assert.ok(st.queue.some(q => q.status === 'bloqué'));
  S.advanceTo(st, 457 * 1440 + 120);
  assert.ok(!st.queue.some(q => q.status === 'bloqué' || q.status === 'en attente'));
});
test('scénario mal de tête : le CO₂ est cité comme cause probable', () => {
  const st = S.runScenario('s3').state;
  const res = S.reportSymptom(st, { a: 'a4', sym: 'cephalee', intensity: 5 });
  assert.ok(res.analysis.findings.some(f => f.source === 'law2014'));
});
test('sauvegarde et rechargement de l’état', () => {
  const mem = {}; const storage = { setItem: (k, v) => { mem[k] = v; }, getItem: k => mem[k] || null, removeItem: k => { delete mem[k]; } };
  assert.ok(S.save(s, storage));
  const back = S.load(storage);
  assert.strictEqual(back.now, s.now);
  assert.strictEqual(back.meas.length, s.meas.length);
});

console.log('\n' + passed + ' test(s) réussi(s), ' + failed + ' échec(s).');
process.exit(failed ? 1 : 0);
