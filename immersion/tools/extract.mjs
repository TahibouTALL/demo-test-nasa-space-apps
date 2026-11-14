// usage: node extract.mjs in.glb out.glb Module1,Module2 texSize
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, textureCompress, meshopt, quantize } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder } from 'meshoptimizer';
const [input, output, mods, size] = process.argv.slice(2);
const keep = mods.split(',');
const S = parseInt(size || '1024', 10);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(input);
const root = doc.getRoot();
const iss = root.listNodes().find(n => n.getName() === 'ISS_Assembled_Interior');
for (const c of iss.listChildren()) if (!keep.includes(c.getName())) { c.traverse(n => n.dispose()); }
await doc.transform(
  prune(), dedup(), weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [S, S], quality: 82 }),
  quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' })
);
// report bounds per kept module
import('@gltf-transform/core').then(({ getBounds }) => {
  for (const c of iss.listChildren()) { const b = getBounds(c); console.log(c.getName(), 'min', b.min.map(v => v.toFixed(2)).join(','), 'max', b.max.map(v => v.toFixed(2)).join(',')); }
});
await io.write(output, doc);
const fs = await import('fs');
console.log('écrit', output, (fs.statSync(output).size / 1e6).toFixed(2), 'Mo');
