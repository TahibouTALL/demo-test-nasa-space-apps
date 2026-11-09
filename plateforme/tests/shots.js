// Captures d'écran et erreurs de la console, parcours principal.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
// usage : node shots.js <dossier du site> <dossier des captures> <parcours.json>
const [root, out, which] = process.argv.slice(2);
require('fs').mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = srv.address().port;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const base = 'http://127.0.0.1:' + port + '/';
  const shot = async (name, wait) => { await sleep(wait || 900); await page.screenshot({ path: path.join(out, name + '.png') }); console.log('capture', name); };
  const steps = JSON.parse(fs.readFileSync(which, 'utf8'));
  await page.goto(base + 'index.html');
  await sleep(1200);
  for (const s of steps) {
    try {
      if (s.size) await page.setViewportSize({ width: s.size[0], height: s.size[1] });
      if (s.hash !== undefined) { await page.evaluate(h => { location.hash = h; }, s.hash); }
      if (s.click) await page.click(s.click, { timeout: 4000 });
      if (s.fill) await page.fill(s.fill[0], s.fill[1]);
      if (s.press) await page.press(s.press[0], s.press[1]);
      if (s.js) { const r = await page.evaluate(s.js); if (r !== undefined && r !== null) console.log('js:', typeof r === 'string' ? r : JSON.stringify(r)); }
      if (s.shot) await shot(s.shot, s.wait);
      else if (s.wait) await sleep(s.wait);
    } catch (e) { console.log('ÉTAPE ÉCHOUÉE', JSON.stringify(s).slice(0, 120), e.message.split('\n')[0]); }
  }
  console.log('erreurs :', errors.length ? '\n  ' + errors.join('\n  ') : 'aucune');
  await browser.close();
  srv.close();
})();
