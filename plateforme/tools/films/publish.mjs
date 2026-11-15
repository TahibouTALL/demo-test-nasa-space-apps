// Publie les films dans la plateforme : docs/videos/<id>.mp4, <id>.fr.vtt, <id>.en.vtt, <id>.jpg (grille), <id>-hd.jpg (affiche),
// et la liste FILMS dans plateforme/src/js/ui/videos.js (entre /*FILMS*/ et /*FIN*/).
// usage : node publish.mjs
import fs from 'fs';
import path from 'path';
import { ORDER } from './story.mjs';

const REPO = path.resolve('../../..');
const DEST = path.join(REPO, 'docs', 'videos');
const JS = path.join(REPO, 'plateforme', 'src', 'js', 'ui', 'videos.js');
fs.mkdirSync(DEST, { recursive: true });
const keep = new Set(), films = [];
for (const id of ORDER) {
  const b = path.join('out', id);
  if (!fs.existsSync(b + '.mp4') || !fs.existsSync(b + '.json')) { console.log('absent :', id); continue; }
  const meta = JSON.parse(fs.readFileSync(b + '.json', 'utf8'));
  for (const [src, dst] of [['.mp4', '.mp4'], ['.fr.vtt', '.fr.vtt'], ['.en.vtt', '.en.vtt'], ['.card.jpg', '.jpg'], ['.thumb.jpg', '-hd.jpg']]) {
    fs.copyFileSync(b + src, path.join(DEST, id + dst)); keep.add(id + dst);
  }
  films.push({ id, cat: meta.cat, title: meta.title, short: meta.short, fiche: meta.fiche, dur: meta.dur, chapters: meta.chapters, sources: meta.sources });
  console.log(id.padEnd(10), (fs.statSync(b + '.mp4').size / 1e6).toFixed(1), 'Mo', meta.dur, 's');
}
// les anciens fichiers (films précédents) disparaissent
for (const f of fs.readdirSync(DEST)) if (!keep.has(f)) { fs.unlinkSync(path.join(DEST, f)); console.log('retiré :', f); }
const js = fs.readFileSync(JS, 'utf8');
const a = js.indexOf('/*FILMS*/'), z = js.indexOf('/*FIN*/');
if (a < 0 || z < 0) throw new Error('marqueurs FILMS absents de videos.js');
const body = '[\n' + films.map(f => '    ' + JSON.stringify(f)).join(',\n') + '\n  ]';
fs.writeFileSync(JS, js.slice(0, a + 9) + body + js.slice(z));
const tot = fs.readdirSync(DEST).reduce((s, f) => s + fs.statSync(path.join(DEST, f)).size, 0);
console.log(films.length, 'films publiés,', (tot / 1e6).toFixed(1), 'Mo dans docs/videos');
