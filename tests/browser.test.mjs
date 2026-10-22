// Test de bout en bout dans un vrai navigateur (Chromium, via Playwright).
// Lance un petit serveur statique sur le dépôt, ouvre la plateforme, parcourt
// toutes les pages, joue les interactions clés et prend des captures.
// Lancer avec : npm run test:navigateur   (Playwright doit être installé)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let pw;
try { pw = await import('playwright'); } catch (e) { pw = await import('/opt/npm-tools/node_modules/playwright/index.mjs'); }
const { chromium } = pw;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.CAPTURES || path.join(ROOT, 'tests', 'captures');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(ROOT, p);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, r));
const BASE = 'http://localhost:' + server.address().port;

let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.log('  ÉCHEC ' + msg); } else console.log('  ok   ' + msg); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const shot = async (name, p = page) => { await p.waitForTimeout(350); await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); };
const goto = async (hash) => { await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(250); };
const text = async () => page.evaluate(() => document.getElementById('main').innerText);

console.log('Chargement');
await page.goto(BASE + '/');
await page.waitForURL(/\/docs\//, { timeout: 5000 });
await page.waitForSelector('#page-title');
ok(page.url().includes('/docs/'), 'la racine du dépôt redirige vers la plateforme');
ok((await page.title()).includes('AURA'), 'titre de page');
ok((await text()).includes('Votre température ce matin'), 'vue d’ensemble équipage affichée');
await shot('01-vue-ensemble-equipage');

console.log('Toutes les pages');
const routes = ['#/', '#/equipage', '#/equipage/a2', '#/saisie', '#/saisie?type=symptome', '#/alertes', '#/pharmacie', '#/planification', '#/bien-etre', '#/habitat', '#/conference', '#/questions', '#/liaison', '#/mission', '#/demo', '#/a-propos'];
for (const r of routes) {
  await goto(r);
  const t = await text();
  ok(!t.includes('n’a pas pu s’afficher') && (await page.$('#page-title')) !== null, 'page ' + r);
}

console.log('Saisie d’une mesure : la fausse fièvre');
await goto('#/saisie?type=mesure');
await page.click('button.chip[data-v="38.1"]');
await page.waitForTimeout(300);
let t = await text();
ok(t.includes('Sur Terre') && t.includes('Lecture AURA'), 'la règle de lecture s’affiche avec les deux lectures');
ok(await page.$('svg.ruler') !== null, 'règle SVG présente');
await shot('02-saisie-fievre');
await page.click('button.chip[data-v="45.3"]'); await page.waitForTimeout(200);
ok((await text()).includes('Valeur impossible'), 'contrôle 1 : valeur impossible ignorée');
await page.click('button.chip[data-v=""]'); await page.waitForTimeout(200);
ok((await text()).includes('Aucune valeur'), 'contrôle 2 : donnée manquante gérée');
await page.click('button.chip[data-v="91"]'); await page.waitForTimeout(200);
ok((await text()).includes('Reprenez la mesure'), 'contrôle 3 : valeur isolée, nouvelle mesure demandée');
await page.click('button.chip[data-v="92"]'); await page.waitForTimeout(200);
t = await text();
ok(t.includes('passerait pour normal') || t.includes('Reprenez'), 'pouls de 92 chez Rafael : inhabituel pour lui');

console.log('Symptôme');
await goto('#/saisie?type=symptome');
await page.check('input[name="sym"][value="cephalee"]', { force: true });
await page.click('form[data-form="symptom"] button[type="submit"]');
await page.waitForTimeout(300);
ok((await text()).includes('À faire, dans l’ordre'), 'analyse du symptôme affichée');

console.log('Vue médecin');
await page.click('button[data-role="doctor"]');
await page.waitForTimeout(250);
await goto('#/');
ok((await text()).includes('Alertes ouvertes'), 'vue d’ensemble médecin');
await shot('03-vue-ensemble-medecin');
await goto('#/equipage/a2?m=temp');
t = await text();
ok(t.includes('Plage attendue') && t.includes('Filtre bayésien'), 'fiche astronaute : les cinq couches et le détail clinique');
await shot('04-fiche-lucas-temperature');
await page.hover('svg[data-chart] .hit', { position: { x: 300, y: 80 } });
await page.waitForTimeout(150);
ok(await page.$eval('#tooltip', el => el.classList.contains('show')), 'infobulle au survol du graphique');

console.log('Pharmacie et dose');
await goto('#/pharmacie');
ok((await text()).includes('Discuter la dose'), 'réponses aux traitements : discussion de dose proposée');
await page.click('button[data-act="factor-open"][data-med="paracetamol"]');
await page.check('form[data-form="factor"] input[value="1.5"]', { force: true });
await page.fill('#fac-n', 'Effet partiel sur trois prises, pas d’effet indésirable');
await page.click('form[data-form="factor"] button[type="submit"]');
await page.waitForTimeout(250);
ok((await text()).includes('facteur 1,50'), 'facteur de dose validé et affiché');
await shot('05-pharmacie-medecin');

console.log('Planification');
await goto('#/planification');
await page.check('input[name="scenario"][value="pessimiste"]', { force: true });
await page.click('form[data-form="plan"] button[type="submit"]');
await page.waitForTimeout(800);
ok((await text()).includes('Risque de rupture'), 'simulation Monte Carlo exécutée');
await shot('06-planification');

console.log('Questions');
await goto('#/questions');
await page.fill('#ask-q', 'j’ai mal à la tête');
await page.click('form[data-form="ask"] button[type="submit"]');
await page.waitForTimeout(300);
ok((await text()).includes('Maux de tête et CO₂'), 'recherche : fiche CO₂ trouvée');
await shot('07-questions');

console.log('Temps qui passe');
const before = await page.$eval('.clock-day', el => el.textContent);
await page.click('button[data-act="advance"][data-min="1440"]');
await page.waitForTimeout(300);
const after = await page.$eval('.clock-day', el => el.textContent);
ok(before !== after, 'avancer d’un jour change le jour de mission (' + before + ' → ' + after + ')');

console.log('Démonstration guidée');
for (const id of ['s1', 's2', 's3', 's4', 's5', 's6']) {
  await goto('#/demo');
  await page.click('button[data-act="scenario"][data-id="' + id + '"]');
  await page.waitForTimeout(700);
  t = await text();
  ok(t.includes('Scénario ' + id.slice(1) + ' sur 6'), 'scénario ' + id + ' lancé');
  if (id === 's2') ok(t.includes('Sur Terre, 38,1') , 's2 : 38,1 °C lu sur Terre comme fièvre, normal pour Lucas');
  if (id === 's3') ok(t.includes('CO₂ de la cabine est à'), 's3 : le CO₂ est cité');
  if (id === 's4') ok(await page.$eval('#urgency', el => !el.hidden && el.textContent.includes('Éruption solaire')), 's4 : bandeau du mode urgence');
  if (id === 's6') ok(t.includes('La liaison est coupée'), 's6 : liaison coupée affichée');
  await shot('08-scenario-' + id);
}
await page.click('button[data-act="advance-to"]');
await page.waitForTimeout(600);
ok(!(await text()).includes('La liaison est coupée'), 's6 : après la conjonction, la liaison revient');
await shot('09-apres-conjonction');

console.log('Tablette et téléphone');
for (const vp of [{ w: 1024, h: 768, n: 'tablette' }, { w: 390, h: 844, n: 'telephone' }]) {
  const p2 = await ctx.newPage();
  await p2.setViewportSize({ width: vp.w, height: vp.h });
  await p2.goto(BASE + '/docs/#/');
  await p2.waitForSelector('#page-title');
  for (const r of ['#/', '#/equipage/a2', '#/saisie', '#/pharmacie', '#/liaison']) {
    await p2.evaluate(h => { location.hash = h; }, r);
    await p2.waitForTimeout(250);
    const over = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 1, vp.n + ' ' + r + ' : pas de défilement horizontal (' + over + ' px)');
  }
  await p2.evaluate(() => { location.hash = '#/'; });
  await p2.waitForTimeout(300);
  await shot('10-' + vp.n + '-accueil', p2);
  if (vp.n === 'telephone') {
    await p2.click('.menu-btn');
    await p2.waitForTimeout(300);
    ok(await p2.$eval('#nav', el => el.classList.contains('open')), 'téléphone : le menu s’ouvre');
    await shot('11-telephone-menu', p2);
  }
  await p2.close();
}

console.log('Thème sombre');
const dark = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const p3 = await dark.newPage();
p3.on('pageerror', e => errors.push('pageerror (sombre): ' + e.message));
await p3.goto(BASE + '/docs/#/equipage/a2?m=temp');
await p3.waitForSelector('#page-title');
await p3.click('button[data-role="doctor"]');
await p3.waitForTimeout(300);
await shot('12-sombre-fiche', p3);
await dark.close();

ok(errors.length === 0, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.slice(0, 5).join(' | ') : ''));
await browser.close();
server.close();
console.log('\n' + (checks - failures) + ' vérification(s) réussie(s), ' + failures + ' échec(s). Captures : ' + OUT);
process.exit(failures ? 1 : 0);
