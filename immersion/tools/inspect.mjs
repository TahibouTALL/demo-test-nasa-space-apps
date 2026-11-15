import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
console.log('scenes', root.listScenes().length, 'nodes', root.listNodes().length, 'meshes', root.listMeshes().length, 'materials', root.listMaterials().length, 'textures', root.listTextures().length);
// top-level hierarchy with triangle counts
function tri(node) {
  let t = 0; const m = node.getMesh();
  if (m) for (const p of m.listPrimitives()) { const i = p.getIndices(); t += i ? i.getCount() / 3 : p.getAttribute('POSITION').getCount() / 3; }
  for (const c of node.listChildren()) t += tri(c);
  return t;
}
function walk(n, d) {
  if (d > 2) return;
  console.log('  '.repeat(d) + n.getName() + '  tris=' + Math.round(tri(n)) + ' children=' + n.listChildren().length);
  for (const c of n.listChildren()) walk(c, d + 1);
}
for (const s of root.listScenes()) for (const n of s.listChildren()) walk(n, 0);
const texs = root.listTextures().map(t => [t.getName() || t.getURI(), t.getMimeType(), t.getImage()?.byteLength]);
texs.sort((a,b)=>b[2]-a[2]);
console.log('largest textures:', texs.slice(0, 15));
