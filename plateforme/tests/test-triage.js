const path = require('path');
const SRC = path.join(__dirname, '..', 'src', 'js');
const KB = require(path.join(SRC, 'kb', 'fiches-data.js'));
const VOCAB = require(path.join(SRC, 'kb', 'vocab.js'));
const LIB = require(path.join(SRC, 'kb', 'fiches.js'));
const TR = require(path.join(SRC, 'kb', 'triage.js'));
const ENGINE = require(path.join(SRC, 'core', 'engine.js'));
const PHARMA = require(path.join(SRC, 'core', 'pharma.js'));
const pats = LIB.compile(VOCAB.FACTS);
function run(name, ctx, text, truth) {
  const s = TR.create(KB, VOCAB, ctx);
  const f = s.addText(text, pats);
  console.log('\n===', name, '|', text, '\n   faits lus :', f.facts.map(x => (x.neg ? '!' : '') + x.code).join(', '));
  let st = s.state();
  if (st.urgences.length) console.log('   URGENCE :', st.urgences.map(u => u.titre + ' (' + (u.ref || u.fiche) + ')').join(' ; '));
  let guard = 0;
  while (!st.stop && st.next && guard++ < 12) {
    const q = st.next;
    const v = truth.includes(q.code) ? true : false;
    s.answer(q.code, v);
    st = s.state();
    console.log('   ?', (q.kind === 'alarme' ? '[alarme] ' : '') + q.question, '->', v ? 'oui' : 'non', '| tête :', st.top[0].nom, (st.top[0].p * 100).toFixed(0) + '%');
    if (st.urgences.length) { console.log('   URGENCE :', st.urgences.map(u => u.titre).join(' ; ')); break; }
  }
  console.log('   arrêt :', st.stop, '| autre', (st.autre * 100).toFixed(0) + '%');
  st.top.forEach(t => console.log('   ->', t.nom, (t.p * 100).toFixed(1) + '%', '| pour', t.pour.join(','), '| contre', t.contre.join(',')));
  const fiche = KB.fiches.find(x => x.id === st.top[0].id);
  const stocks = {}; PHARMA.meds.forEach(m => { stocks[m.id] = m.stock; });
  const pl = TR.plan(fiche, { day: ctx.day, stocks, tasks: ctx.tasks || [], light: 6 }, ENGINE, PHARMA.meds);
  console.log('   proposition :', pl.propose ? pl.propose.action.slice(0, 120) + ' [' + pl.propose.ressources.map(r => r.name + (r.blocked ? ' BLOQUÉ' : '')).join(', ') + ']' : 'aucune', pl.allBlocked ? '(tout bloqué)' : '');
}
const base = { mission: 'mars', day: 58, gravityChanges: [0], pco2: 2.6 };
run('Lucas, CO2 haut', Object.assign({}, base, { sexe: 'H', pco2: 4.2 }), "J'ai mal à la tête depuis ce matin", ['cephalee', 'fatigue', 'irritabilite']);
run('Keiko, calcul', Object.assign({}, base, { sexe: 'F' }), "J'ai très mal sur le côté droit, ça vient par vagues et ça descend vers l'aine", ['douleur_flanc', 'douleur_par_vagues', 'douleur_irradiation_aine', 'sang_urines', 'nausee', 'agitation']);
run('Aminata, urines', Object.assign({}, base, { sexe: 'F' }), "Ça me brûle quand j'urine et j'ai tout le temps envie d'uriner souvent", ['brulure_urinaire', 'envies_frequentes']);
run('Rafael, dos', Object.assign({}, base, { sexe: 'H' }), "J'ai mal au dos", ['mal_dos']);
run('Rafael, poitrine', Object.assign({}, base, { sexe: 'H' }), "J'ai une douleur dans la poitrine", ['douleur_thoracique']);
run('Lucas, question', Object.assign({}, base, { sexe: 'H' }), "C'est quoi un AVC ?", []);
run('Keiko, sommeil', Object.assign({}, base, { sexe: 'F' }), "Je dors mal depuis une semaine", ['insomnie', 'fatigue']);
run('Aminata, gorge', Object.assign({}, base, { sexe: 'F' }), "J'ai mal à la gorge et un peu de fièvre", ['mal_gorge', 'fievre', 'depots_amygdales', 'ganglions_cou']);
run('Lucas, nausée J+2', Object.assign({}, base, { sexe: 'H', day: 2 }), "J'ai envie de vomir et la tête qui tourne", ['nausee', 'vertige', 'changement_gravite']);
run('Rafael, après sortie', Object.assign({}, base, { sexe: 'H', evaRecente: true }), "J'ai des fourmillements dans les doigts depuis la sortie", ['paresthesie', 'eva_recente']);
