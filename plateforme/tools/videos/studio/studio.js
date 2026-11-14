// Rendu d'images fixes avec le moteur d'immersion : node studio.js <specs.mjs> <sortie> [clé...]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..', '..', '..', '..', 'immersion', 'dist');
const [specFile, outDir, ...only] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HELP = `window.__studio = {
  V: (x, y, z) => new window.__aura.THREE.Vector3(x, y, z),
  async crew(who, pose, pos, rot = [0, 0, 0], o = {}) {
    const A = window.__aura, exp = A.App.exp;
    const P = await A.buildPatient(Object.assign({ who }, o));
    (exp.extras || exp.scene).add(P.root);
    P.setPose(pose); P.place(new A.THREE.Vector3(...pos), new A.THREE.Euler(...rot));
    P.breathing = false; P.float = 0;
    if (o.tint) P.tint(o.tint);
    if (o.hives) P.U.hives.value = o.hives;
    if (o.swell) P.U.swell.value = o.swell;
    if (o.redEye) P.U.redEye.value = o.redEye;
    if (o.noShirt) P.showShirt(false);
    if (exp.updaters) exp.updaters.add(dt => P.update(dt));
    P.update(0.016);
    return P;
  },
  cam(pos, target, fov = 50) {
    const A = window.__aura, c = A.camera;
    A.App.camMode = 'orbit'; A.App.orbitUpdate = null; c.clearViewOffset();
    c.position.set(...pos); c.fov = fov; c.updateProjectionMatrix(); c.lookAt(new A.THREE.Vector3(...target));
  },
  // portrait : visage sur le tiers droit de l'image, lumière principale de côté, contre-jour léger
  portrait(P, o = {}) {
    const A = window.__aura, T = A.THREE, exp = A.App.exp;
    const f = P.world(o.at || 'face'); const fr = P.front(), up = P.up(), sd = up.clone().cross(fr).normalize();
    const side = o.side ?? -0.3, dist = o.dist ?? 0.75;
    const c = f.clone().addScaledVector(fr, dist).addScaledVector(sd, side).addScaledVector(up, o.up ?? 0.03);
    const dir = f.clone().sub(c).normalize(); const right = dir.clone().cross(up).normalize();
    const tgt = f.clone().addScaledVector(right, -(o.shift ?? 0.12) * dist).addScaledVector(up, (o.tilt ?? -0.03));
    this.cam([c.x, c.y, c.z], [tgt.x, tgt.y, tgt.z], o.fov ?? 38);
    this.light(P, o);
  },
  light(P, o = {}) {
    const A = window.__aura, T = A.THREE, exp = A.App.exp;
    const f = P.world(o.at || 'face'); const fr = P.front(), up = P.up(), sd = up.clone().cross(fr).normalize();
    const side = o.side ?? -0.3, ks = Math.sign(side || -1);
    if (!o.keepAmb) exp.scene.traverse(x => { if (x.isHemisphereLight) x.intensity *= (o.amb ?? 0.5); if (x.isPointLight) x.intensity *= (o.pts ?? 0.6); });
    exp.scene.traverse(x => { if (x.isSkinnedMesh && x.material) [].concat(x.material).forEach(m => { m.envMapIntensity = o.env ?? 0.35; }); });
    if (o.exposure) A.renderer.toneMappingExposure = o.exposure;
    const key = new T.DirectionalLight(0xfff0e0, o.key ?? 1.9); key.position.copy(f).addScaledVector(fr, 1.0).addScaledVector(sd, -ks * 0.9).addScaledVector(up, 0.7); key.target.position.copy(f);
    const rim = new T.DirectionalLight(0xd8e6ff, o.rim ?? 1.2); rim.position.copy(f).addScaledVector(fr, -1.0).addScaledVector(sd, ks * 0.9).addScaledVector(up, 0.5); rim.target.position.copy(f);
    exp.scene.add(key, key.target, rim, rim.target);
  },
  hideUI() { for (const s of ['#ui', '#trHud', '#trIntro', '#trEnd', '#menu', '#relaxHud', '#loading', '#precheck']) { const e = document.querySelector(s); if (e) e.style.display = 'none'; } }
};`;
(async () => {
  const specs = (await import(path.resolve(specFile))).STILLS;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const W = +(process.env.W || 1920), H = +(process.env.H || 1080);
  for (const [key, sp] of Object.entries(specs)) {
    if (only.length && !only.includes(key)) continue;
    const t0 = Date.now();
    const pg = await b.newPage({ viewport: { width: W, height: H } });
    pg.on('pageerror', e => console.log(key, 'pageerror', e.message));
    try {
      await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html#' + sp.url);
      if (sp.url.startsWith('sim=')) {
        await pg.waitForFunction('window.__aura && window.__aura.Trainer.running && window.__aura.Trainer.i >= 0', null, { timeout: 900000 });
        for (let i = 0; i < (sp.step || 0); i++) {
          await pg.waitForFunction(i2 => window.__aura.Trainer.i === i2, i, { timeout: 900000 });
          await sleep(400);
          await pg.evaluate(i2 => { const T = window.__aura.Trainer; if (T.camTween) T.camTween.t = 0.999; if (T.i === i2 && T._complete) { try { T._complete(); } catch (e) {} } }, i);
        }
        await pg.waitForFunction(i2 => window.__aura.Trainer.i === i2, sp.step || 0, { timeout: 900000 });
        await sleep(+(sp.wait || 2500));
      } else {
        await pg.waitForFunction('window.__ready === true', null, { timeout: 900000 });
      }
      await pg.evaluate(HELP);
      await pg.evaluate(() => window.__aura.fixRes(1));
      await pg.evaluate(`(async () => { const S = window.__studio, A = window.__aura, exp = A.App.exp, V = S.V; ${sp.setup || ''} })()`);
      await pg.evaluate(() => window.__studio.hideUI());
      await sleep(+(sp.settle || 2500));
      await pg.screenshot({ path: path.join(outDir, key + '.jpg'), type: 'jpeg', quality: 92, timeout: 900000 });
      console.log(key, 'ok', Math.round((Date.now() - t0) / 1000) + ' s');
    } catch (e) { console.log(key, 'ERREUR', e.message.split('\n')[0]); }
    await pg.close();
  }
  await b.close(); srv.close();
})();
