// Charge le code partagé de la plateforme (personnages) dans Node, et les polices.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GlobalFonts } from '@napi-rs/canvas';
const HERE = path.dirname(fileURLToPath(import.meta.url));
for (const w of [400, 500, 700, 800]) GlobalFonts.registerFromPath(path.join(HERE, 'fonts', `atkinson-${w}.ttf`), 'Atkinson');
const root = { AURA: {} };
new Function('self', fs.readFileSync(path.join(HERE, '..', '..', 'src', 'js', 'ui', 'rig.js'), 'utf8'))(root);
export const R = root.AURA.rig;
