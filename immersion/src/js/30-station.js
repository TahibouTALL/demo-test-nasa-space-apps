/* ================= station : intérieur de l'ISS (modèle 3D de la NASA) =================
   Les modules viennent du modèle « International Space Station (ISS) (E) (Internal) » de la NASA
   (NASA 3D Resources, domaine public), allégés pour le navigateur (voir tools/README.md).
   Chaque module est ramené dans un repère commun : allée centrée à l'origine, axe long selon Z,
   plafond vers +Y, pont (sol) vers -Y, mètres. */
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
const Models = {
  cache: {},
  load(name) { return this.cache[name] || (this.cache[name] = gltfLoader.loadAsync('models/' + name + '.glb')); }
};
let roomEnvTex = null;
function roomEnvironment() {
  if (!roomEnvTex && HAS_GL) {
    const pm = new THREE.PMREMGenerator(renderer);
    roomEnvTex = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    pm.dispose();
  }
  return roomEnvTex;
}

const MODULES = {
  lab: { file: 'iss-lab', name: 'Laboratoire Destiny', long: 'x' },
  node3: { file: 'iss-node3', name: 'Nœud 3 Tranquility', long: 'z' },
  node1: { file: 'iss-node1', name: 'Nœud 1 Unity', long: 'x' },
  node2: { file: 'iss-node2', name: 'Nœud 2 Harmony', long: 'x' },
  airlock: { file: 'iss-airlock', name: 'Sas Quest', long: 'z' }
};

// réglage des matériaux de la NASA : peinture mate pour les racks, métal pour les pièces de structure
function tuneStationMaterial(m) {
  if (m.userData.tuned) return;
  m.userData.tuned = true;
  const n = m.name || '';
  m.envMapIntensity = 0.55;
  if (/HubAndMetals/.test(n)) { m.metalness = 0.55; m.roughness = 0.42; }
  else if (/Lights/.test(n)) {
    m.metalness = 0; m.roughness = 0.5;
    if (m.map) { m.emissiveMap = m.map; m.emissive = new THREE.Color(0xfff8ee); m.emissiveIntensity = 0.55; }
  } else if (/Patches/.test(n)) { m.metalness = 0; m.roughness = 0.75; }
  else { m.metalness = 0.06; m.roughness = 0.62; }
  if (m.transparent || m.alphaMode === 'BLEND') { m.transparent = false; m.alphaTest = 0.45; m.depthWrite = true; }
  m.side = THREE.FrontSide;
  m.needsUpdate = true;
}

async function buildStationModule(key) {
  const def = MODULES[key];
  const g = await Models.load(def.file);
  const src = g.scene.clone(true);
  src.traverse(o => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; mats.forEach(tuneStationMaterial); o.frustumCulled = true; } });
  src.scale.setScalar(0.1);
  if (def.long === 'x') src.rotation.y = Math.PI / 2;
  const wrap = new THREE.Group();
  wrap.name = 'module-' + key;
  wrap.add(src);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src);
  const c = box.getCenter(new THREE.Vector3());
  src.position.sub(c);
  wrap.updateMatrixWorld(true);
  // centre de l'allée : on mesure la distance aux parois dans plusieurs sections
  const ray = new THREE.Raycaster(); ray.far = 4;
  const meshes = []; src.traverse(o => { if (o.isMesh) meshes.push(o); });
  const dist = (o, d) => { ray.set(o, d); const h = ray.intersectObjects(meshes, false)[0]; return h ? h.distance : null; };
  const off = new THREE.Vector3(); let n = 0;
  for (const z of [-1.2, -0.4, 0.4, 1.2]) {
    const o = new THREE.Vector3(0, 0, z);
    const xp = dist(o, new THREE.Vector3(1, 0, 0)), xn = dist(o, new THREE.Vector3(-1, 0, 0));
    const yp = dist(o, new THREE.Vector3(0, 1, 0)), yn = dist(o, new THREE.Vector3(0, -1, 0));
    if (xp && xn && yp && yn) { off.x += (xp - xn) / 2; off.y += (yp - yn) / 2; n++; }
  }
  if (n) { off.divideScalar(n); src.position.x -= off.x; src.position.y -= off.y; }
  wrap.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(src);
  // demi-largeurs de l'allée (parois à gauche et à droite, pont et plafond)
  const aisle = { xp: 0, xn: 0, yp: 0, yn: 0 }; let m = 0;
  for (const z of [-1.2, -0.4, 0.4, 1.2]) {
    const o = new THREE.Vector3(0, 0, z);
    const v = [dist(o, new THREE.Vector3(1, 0, 0)), dist(o, new THREE.Vector3(-1, 0, 0)), dist(o, new THREE.Vector3(0, 1, 0)), dist(o, new THREE.Vector3(0, -1, 0))];
    if (v.every(x => x)) { aisle.xp += v[0]; aisle.xn += v[1]; aisle.yp += v[2]; aisle.yn += v[3]; m++; }
  }
  if (m) for (const k in aisle) aisle[k] /= m;
  wrap.userData = { meshes, half: Math.max(1.5, (box2.max.z - box2.min.z) / 2 - 0.4), box: box2, aisle };
  return wrap;
}

function stationLights(scene) {
  const hemi = new THREE.HemisphereLight(0xf3f5f8, 0x857d72, 1.05);
  scene.add(hemi);
  const lights = [];
  for (const z of [-2.4, 0, 2.4]) {
    const p = new THREE.PointLight(0xfff5ea, 2.6, 5.5, 1.5);
    p.position.set(0.25, 0.75, z);
    scene.add(p); lights.push(p);
  }
  return { hemi, lights };
}

// bruit de fond de la station : ventilateurs et ronronnement des pompes
function stationAudio(ctx, out) {
  const fans = noiseBand(ctx, out, 'pink', 'lowpass', 900, 0.4, 0.05);
  const low = noiseBand(ctx, out, 'brown', 'lowpass', 180, 0.5, 0.06);
  const hums = [97, 194, 291].map((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f + Math.random(); g.gain.value = [0.006, 0.004, 0.002][i]; o.connect(g).connect(out); o.start(); return o; });
  return { stop() { fans.stop(); low.stop(); hums.forEach(o => { try { o.stop(); } catch (e) { /* rien */ } }); } };
}

for (const key of Object.keys(MODULES)) {
  EXPERIENCES['iss-' + key] = {
    title: MODULES[key].name,
    async create() {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x15171b);
      scene.environment = roomEnvironment();
      const mod = await buildStationModule(key);
      scene.add(mod);
      stationLights(scene);
      const extras = new THREE.Group(); extras.name = 'extras'; scene.add(extras);
      const updaters = new Set();
      return {
        scene, module: mod, extras, updaters, keep: true,
        viewpoint: new THREE.Vector3(0, 0, 0), yaw: 0, pitch: 0, fov: 55, near: 0.02, far: 60, exposure: 0.92,
        clearExtras() {
          for (const o of extras.children.slice()) { extras.remove(o); disposeScene(o); }
          updaters.clear();
        },
        update(dt, t) { updaters.forEach(f => { try { f(dt, t); } catch (e) { console.error(e); updaters.delete(f); } }); },
        dispose() { this.clearExtras(); }
      };
    }
  };
}
