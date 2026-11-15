// Rend les films dès que leurs images sont prêtes, un à la fois.
import fs from 'fs';
import { spawnSync } from 'child_process';
import { VIDEOS } from './scripts.mjs';
// une image est prête quand son fichier existe dans stills/
const fresh = () => true;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const done = id => fs.existsSync(`out/${id}.mp4`);
for (;;) {
  const left = VIDEOS.filter(v => !done(v.id));
  if (!left.length) break;
  const ready = left.find(v => {
    const need = [...new Set(v.scenes.filter(s => s.v.img).map(s => s.v.img))];
    return need.every(k => fs.existsSync(`stills/${k}.jpg`) && fresh(k));
  });
  if (!ready) { await sleep(20000); continue; }
  console.log('rendu', ready.id, new Date().toTimeString().slice(0, 8));
  const r = spawnSync('node', ['render.mjs', ready.id], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(ready.id, r.status === 0 ? 'ok' : 'ERREUR ' + r.status, new Date().toTimeString().slice(0, 8));
  if (r.status !== 0) break;
}
console.log('file terminée');
