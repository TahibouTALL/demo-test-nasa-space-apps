// Test de bout en bout dans un vrai navigateur (Chromium, via Playwright).
// Un petit serveur statique sert le dépôt ; on parcourt les parcours clés des
// trois profils (équipage, médecin de bord, médecin au sol), avec une IA et la
// base DONKI de la NASA simulées, puis on vérifie l’affichage sur téléphone.
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
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
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
const errors = [];

// Éruptions solaires réelles simulées (base DONKI de la NASA)
const FLARES = [
  { flrID: '1', classType: 'X1.2', peakTime: '2026-10-12T14:05Z', sourceLocation: 'S12W30', activeRegionNum: 14201 },
  { flrID: '2', classType: 'M3.4', peakTime: '2026-10-18T03:20Z', sourceLocation: 'N08E15', activeRegionNum: 14210 }
];
async function open(vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: 1440, height: 900 }, locale: 'fr-FR', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route('https://api.nasa.gov/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(FLARES) }));
  await page.goto(BASE + '/');
  await page.waitForURL(/\/docs\//, { timeout: 5000 });
  await page.waitForSelector('#page-title');
  return { ctx, page };
}
const main = page => page.evaluate(() => document.getElementById('main').innerText.replace(/[\u00a0\u202f]/g, ' '));
const go = async (page, hash) => { await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(220); };
const shot = async (page, name, full = true) => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full }); };
const pick = async (page, sel) => { await page.click(sel); await page.waitForTimeout(300); };

/* ------------------------------------------------------------------ */
console.log('Accueil');
{
  const { ctx, page } = await open();
  ok((await page.title()).includes('AURA'), 'titre de page');
  ok((await main(page)).includes('Bienvenue à bord'), 'page d’accueil affichée');
  ok(await page.evaluate(() => document.body.classList.contains('is-welcome') && getComputedStyle(document.querySelector('.sidebar')).display === 'none'), 'accueil sans menu tant qu’aucun profil n’est choisi');
  await shot(page, '01-accueil', false);
  await pick(page, '[data-act="profile"][data-me="a2"]');
  ok((await main(page)).includes('Lucas'), 'profil Lucas Moreau choisi');
  ok(await page.evaluate(() => !document.body.classList.contains('is-welcome')), 'le menu apparaît ensuite');
  await shot(page, '02-aujourdhui-equipage');

  console.log('Toutes les pages, trois profils');
  const routes = {
    crew: ['#/', '#/mesurer', '#/mesurer/temp', '#/mesurer/hr', '#/mesurer/spo2', '#/mesurer/symptome', '#/bien-etre', '#/bien-etre/respiration', '#/bien-etre/paysage', '#/bien-etre/reaction', '#/assistant', '#/conference', '#/dossier', '#/liaison', '#/mission', '#/urgence', '#/alertes', '#/reglages', '#/a-propos', '#/pharmacie', '#/planification'],
    doctor: ['#/', '#/alertes', '#/conference', '#/pharmacie', '#/planification', '#/bien-etre', '#/assistant', '#/liaison', '#/mission', '#/dossier/a3', '#/urgence'],
    ground: ['#/', '#/equipage', '#/liaison', '#/mission', '#/reglages']
  };
  for (const role of Object.keys(routes)) {
    await page.evaluate(r => { const A = window.AURA_APP; A.s.role = r; A.s.me = r === 'doctor' ? 'a3' : 'a2'; }, role);
    for (const r of routes[role]) {
      const before = errors.length;
      await go(page, r);
      const t = await main(page);
      ok(!t.includes('n’a pas pu s’afficher') && (await page.$('#page-title')) !== null && errors.length === before, role + ' ' + r);
    }
  }
  await ctx.close();
}

/* ------------------------------------------------------------------ */
console.log('Une fièvre qui n’en est pas une');
{
  const { ctx, page } = await open();
  await pick(page, '[data-act="profile"][data-me="a2"]');
  await go(page, '#/mesurer/temp');
  await page.fill('#m-v', '38.1');
  await pick(page, 'form[data-form="measure"] button[type="submit"]');
  const t = await main(page);
  ok(t.includes('Sur Terre, 38,1 °C serait lu comme fièvre'), 'la norme terrestre dit fièvre');
  ok(t.includes('pour vous'), 'AURA lit la valeur avec la référence de la personne');
  await page.click('details.disclose summary');
  await page.waitForTimeout(250);
  ok(await page.$('svg.ruler, .ruler svg, svg[aria-label*="Norme"]') !== null || (await main(page)).includes('Plage attendue'), 'explication détaillée avec la règle des deux lectures');
  await shot(page, '03-mesure-fausse-fievre');
  await ctx.close();
}

/* ------------------------------------------------------------------ */
console.log('Signe d’alarme dans l’assistant');
{
  const { ctx, page } = await open();
  await pick(page, '[data-act="profile"][data-me="a2"]');
  await go(page, '#/assistant');
  await page.fill('#ask-q', 'J’ai très mal à la poitrine depuis dix minutes, ça serre.');
  await pick(page, 'form[data-form="ask"] button[type="submit"]');
  await page.waitForTimeout(400);
  ok((await main(page)).includes('Prévenez la médecin de bord maintenant'), 'premiers gestes affichés avant toute réponse');
  ok(await page.evaluate(() => { const u = document.getElementById('urgency'); return u && !u.hidden; }), 'bandeau d’urgence sur toutes les pages');
  await go(page, '#/liaison');
  ok((await main(page)).includes('Urgent'), 'message prioritaire dans la file vers la Terre');
  await shot(page, '04-signe-alarme');
  await ctx.close();
}

/* ------------------------------------------------------------------ */
console.log('Visioconférence de la semaine avec AURA, sans IA');
{
  const { ctx, page } = await open();
  await pick(page, '[data-act="profile"][data-me="a2"]');
  await go(page, '#/conference');
  await pick(page, '[data-act="itv-start"]');
  ok(await page.$('#call #buddy') !== null, 'écran de visioconférence avec AURA');
  ok((await page.$$('.call-topics li')).length === 6, 'six sujets affichés');
  let n = 0;
  while (n < 20 && await page.$('#itv-a')) {
    await page.fill('#itv-a', 'Ça va, rien de particulier.');
    await pick(page, 'form[data-form="itv-answer"] button[type="submit"]');
    n++;
  }
  ok(n >= 6, n + ' questions posées une à une');
  const med = await page.$eval('#itv-med', el => el.value).catch(() => '');
  ok(med.includes('Conférence de Lucas Moreau'), 'résumé préparé à bord, modifiable');
  await shot(page, '05-entretien-resume');
  await pick(page, 'form[data-form="itv-send"] button[type="submit"]');
  const t = await main(page);
  ok(/Votre résumé (est en route vers la Terre|est arrivé au sol)/.test(t), 'résumé envoyé avec l’accord de la personne');
  ok(t.includes('La partie psychologique reste à bord'), 'partie psychologique gardée à bord par défaut');
  await ctx.close();
}

/* ------------------------------------------------------------------ */
console.log('Visioconférence avec le médecin au sol, près de la Terre');
{
  const { ctx, page } = await open();
  await pick(page, '[data-act="profile"][data-me="a2"]');
  await page.evaluate(() => { const A = window.AURA_APP; A.s = window.AURA_STORE.createState({ day: 9, minute: 9 * 60 }); A.s.role = 'crew'; A.s.me = 'a2'; location.hash = '#/conference'; });
  await page.waitForTimeout(300);
  ok((await main(page)).includes('avec le médecin au sol'), 'le médecin mène la visioconférence');
  await pick(page, '[data-act="conf-join"]');
  ok(await page.$('#call .call-doctor') !== null, 'écran d’appel avec le médecin');
  await pick(page, 'form[data-form="conf-live-end"] button[type="submit"]');
  ok((await main(page)).includes('est faite'), 'visioconférence notée comme faite');
  await ctx.close();
}

console.log('Écrire au médecin au sol');
{
  const { ctx, page } = await open();
  await pick(page, '[data-act="profile"][data-me="a2"]');
  await go(page, '#/liaison');
  await page.fill('#msg-b', 'Je dors mal depuis trois jours');
  await pick(page, '[data-act="msg-draft"]');
  const v = await page.$eval('#msg-b', el => el.value);
  ok(v.startsWith('Contexte : Lucas Moreau') && v.includes('Je dors mal depuis trois jours'), 'AURA ajoute le contexte de la mission');
  ok(await page.$('[data-act="msg-undo"]') !== null, 'on peut revenir à son texte');
  await pick(page, 'form[data-form="message"] button[type="submit"]');
  ok((await main(page)).includes('Je dors mal depuis trois jours'), 'message en file, objet repris du texte');
  await ctx.close();
}

/* ------------------------------------------------------------------ */
console.log('Médecin au sol');
{
  const { ctx, page } = await open();
  await pick(page, '[data-act="profile"][data-role="ground"]');
  ok((await main(page)).includes('Reçu du vaisseau'), 'vue du médecin au sol');
  ok(!(await main(page)).includes('Mon dossier'), 'pas de données de bord en direct');
  await go(page, '#/liaison');
  await page.selectOption('#gm-a', 'all');
  await page.fill('#gm-t', 'Rappel avant la sortie');
  await page.fill('#gm-b', 'Pensez à bien boire avant la sortie de demain.');
  await pick(page, 'form[data-form="ground-message"] button[type="submit"]');
  ok((await main(page)).includes('pour tout l’équipage'), 'message parti vers tout l’équipage, avec le délai');
  await shot(page, '06-medecin-au-sol');
  await ctx.close();
}

/* ------------------------------------------------------------------ */
console.log('IA connectée (Claude, réponse simulée)');
{
  const { ctx, page } = await open();
  let seen = null;
  await page.route('https://api.anthropic.com/v1/messages', async route => {
    const req = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    seen = { headers: req.headers(), body: JSON.parse(req.postData() || '{}') };
    const ev = (o) => 'event: ' + o.type + '\ndata: ' + JSON.stringify(o) + '\n\n';
    const sse = ev({ type: 'message_start', message: { id: 'm', role: 'assistant', content: [] } }) +
      ev({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Le CO₂ de la cabine peut donner mal à la tête [1]. ' } }) +
      ev({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Vérifiez la ventilation de votre zone.' } }) +
      ev({ type: 'message_delta', delta: { stop_reason: 'end_turn' } }) + ev({ type: 'message_stop' });
    return route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'text/event-stream' }, cors), body: sse });
  });
  await pick(page, '[data-act="profile"][data-me="a2"]');
  await go(page, '#/reglages');
  await pick(page, '[data-act="ai-provider"][data-id="anthropic"]');
  await page.fill('#ai-key', 'sk-ant-test');
  await pick(page, 'form[data-form="ai-config"] button[type="submit"]');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('aura.ia') || '{}').provider === 'anthropic'), 'clé gardée dans ce navigateur seulement');
  await go(page, '#/assistant');
  await page.fill('#ask-q', 'J’ai mal à la tête, est-ce le CO₂ ?');
  await pick(page, 'form[data-form="ask"] button[type="submit"]');
  await page.waitForFunction(() => (document.getElementById('chat') || {}).innerText && document.getElementById('chat').innerText.includes('Vérifiez la ventilation'), null, { timeout: 5000 }).catch(() => {});
  const t = await main(page);
  ok(t.includes('Le CO₂ de la cabine peut donner mal à la tête'), 'réponse rédigée par l’IA à partir des fiches');
  ok(await page.$('#chat a.cite[data-cite="1"]') !== null, 'citation cliquable vers la fiche de bord');
  ok(seen && seen.headers['x-api-key'] === 'sk-ant-test' && seen.headers['anthropic-version'] === '2023-06-01', 'en-têtes de l’API Anthropic');
  ok(seen && seen.body.model === 'claude-sonnet-5-5' && seen.body.stream === true && /Fiches de bord/.test(seen.body.system || ''), 'modèle, flux et fiches envoyées comme contexte');
  await shot(page, '07-assistant-ia');
  await ctx.close();
}

/* ------------------------------------------------------------------ */
console.log('Données réelles de la NASA et paysage');
{
  const { ctx, page } = await open();
  await pick(page, '[data-act="profile"][data-me="a2"]');
  await go(page, '#/mission');
  await page.waitForTimeout(600);
  ok((await main(page)).includes('X1.2'), 'éruptions solaires lues dans DONKI');
  await go(page, '#/bien-etre/paysage');
  await page.waitForTimeout(700);
  const lit = await page.evaluate(() => { const c = document.getElementById('scene-canvas'); const d = c.getContext('2d').getImageData(Math.floor(c.width / 2), Math.floor(c.height / 3), 1, 1).data; return d[3] > 0 && (d[0] + d[1] + d[2]) > 0; });
  ok(lit, 'paysage dessiné');
  await shot(page, '08-paysage', false);
  await ctx.close();
}

/* ------------------------------------------------------------------ */
console.log('Téléphone (390 et 320 px)');
for (const width of [390, 320]) {
  const { ctx, page } = await open({ width, height: 844 });
  await pick(page, '[data-act="profile"][data-me="a2"]');
  for (const r of ['#/', '#/mesurer/temp', '#/bien-etre', '#/assistant', '#/conference', '#/dossier', '#/liaison', '#/mission']) {
    await go(page, r);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(over <= 0, width + ' px ' + r + ' sans défilement horizontal');
  }
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display !== 'none'), width + ' px : barre d’onglets en bas');
  if (width === 390) { await go(page, '#/'); await shot(page, '09-telephone'); }
  await ctx.close();
}

console.log('\nErreurs JavaScript : ' + errors.length);
errors.slice(0, 10).forEach(e => console.log('  ' + e));
ok(errors.length === 0, 'aucune erreur JavaScript');
console.log('\n' + (checks - failures) + ' vérification(s) réussie(s), ' + failures + ' échec(s). Captures : ' + OUT);
await browser.close(); server.close();
process.exit(failures ? 1 : 0);
