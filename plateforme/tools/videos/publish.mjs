// Publie les films rendus dans la plateforme : docs/videos/<id>.mp4, .vtt, .jpg (affiche 640 x 360)
// et la liste FILMS dans plateforme/src/js/ui/videos.js (entre /*FILMS*/ et /*FIN*/).
// usage : node publish.mjs <dossier du dépôt>
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { VIDEOS } from './scripts.mjs';

const REPO = path.resolve(process.argv[2] || '../../..');
const DEST = path.join(REPO, 'docs', 'videos');
const JS = path.join(REPO, 'plateforme', 'src', 'js', 'ui', 'videos.js');
fs.mkdirSync(DEST, { recursive: true });

const films = [];
for (const V of VIDEOS) {
  const base = path.join('out', V.id);
  if (!fs.existsSync(base + '.mp4') || !fs.existsSync(base + '.json')) { console.log('absent :', V.id); continue; }
  const meta = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
  fs.copyFileSync(base + '.mp4', path.join(DEST, V.id + '.mp4'));
  fs.copyFileSync(base + '.vtt', path.join(DEST, V.id + '.vtt'));
  const im = await loadImage(base + '.poster.png');
  const c = createCanvas(640, 360), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(im, 0, 0, 640, 360);
  fs.writeFileSync(path.join(DEST, V.id + '.jpg'), c.toBuffer('image/jpeg', 84));
  films.push({ id: meta.id, cat: meta.cat, title: meta.title, short: meta.short, fiche: meta.fiche, dur: meta.dur, chapters: meta.chapters, sources: meta.sources });
  console.log(V.id.padEnd(10), (fs.statSync(base + '.mp4').size / 1e6).toFixed(1), 'Mo', Math.round(meta.dur / 6) / 10, 'min');
}
const js = fs.readFileSync(JS, 'utf8');
const a = js.indexOf('/*FILMS*/'), b = js.indexOf('/*FIN*/');
if (a < 0 || b < 0) throw new Error('marqueurs FILMS absents de videos.js');
const body = '[\n' + films.map(f => '    ' + JSON.stringify(f)).join(',\n') + '\n  ]';
fs.writeFileSync(JS, js.slice(0, a + 9) + body + js.slice(b));
const tot = fs.readdirSync(DEST).reduce((s, f) => s + fs.statSync(path.join(DEST, f)).size, 0);
console.log(films.length, 'films publiés,', (tot / 1e6).toFixed(1), 'Mo dans docs/videos');
