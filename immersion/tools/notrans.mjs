// retire la transmission (export FBX vers glTF) : le scaphandre redevient opaque
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [i, o] = process.argv.slice(2);
const doc = await io.read(i);
let n = 0;
for (const m of doc.getRoot().listMaterials()) { if (m.getExtension('KHR_materials_transmission')) { m.setExtension('KHR_materials_transmission', null); n++; } }
for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === 'KHR_materials_transmission') e.dispose();
await io.write(o, doc);
const fs = await import('fs');
console.log('transmission retirée de', n, 'matériaux ;', (fs.statSync(o).size / 1e6).toFixed(2), 'Mo');
