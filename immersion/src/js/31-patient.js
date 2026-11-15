/* ================= patient : un équipier réaliste, articulé =================
   Corps, vêtements et squelette viennent de tools/crew.py (maillage de base et cibles de
   MakeHuman, licence CC0). Le tronc accepte un enfoncement du sternum (massage cardiaque) et
   une respiration ; la peau peut rougir, pâlir, bleuir ou se couvrir de plaques (urticaire) ;
   les lèvres peuvent gonfler. Les poses sont des rotations d'articulations dans le repère du
   corps, appliquées sur la position « debout, bras le long du corps ». */
const SKINS = { clair: 0xdcae90, mat: 0xc08a68, brun: 0x946043, fonce: 0x6a412c, keiko: 0xe2b996 };
const CREW_SKIN = { lucas: 'clair', rafael: 'mat', aminata: 'fonce', keiko: 'keiko' };

// petit bruit 3D pour l'urticaire et le grain de la peau
const GLSL_SKIN_NOISE = `
float hsh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hsh(i), hsh(i + vec3(1,0,0)), f.x), mix(hsh(i + vec3(0,1,0)), hsh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hsh(i + vec3(0,0,1)), hsh(i + vec3(1,0,1)), f.x), mix(hsh(i + vec3(0,1,1)), hsh(i + vec3(1,1,1)), f.x), f.y), f.z); }`;

// déformations dans le repère de repos du corps (avant le squelette) : sternum, respiration, lèvres
// les sommets sont quantifiés (fichier compressé) : uDQ ramène une position en mètres, au repos
function injectRest(sh, DQ) {
  Object.assign(sh.uniforms, { uDQ: DQ.m, uDQi: DQ.inv });
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform mat4 uDQ; uniform mat4 uDQi;\nvarying vec3 vRest;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec3 rp = (uDQ * vec4(position, 1.0)).xyz; vRest = rp;');
}
function injectDeform(sh, U, D, lips, DQ) {
  injectRest(sh, DQ);
  Object.assign(sh.uniforms, { uPress: U.press, uBreath: U.breath, uSwell: U.swell });
  const s = D.sternum, m = D.mouth;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uPress; uniform float uBreath; uniform float uSwell;')
    .replace('vec3 rp = (uDQ * vec4(position, 1.0)).xyz; vRest = rp;', `vec3 rp = (uDQ * vec4(position, 1.0)).xyz; vRest = rp;
      {
        vec3 dc = rp - vec3(${s[0].toFixed(4)}, ${s[1].toFixed(4)}, ${s[2].toFixed(4)});
        float fall = exp(-dot(dc.xy, dc.xy) / 0.0085) * smoothstep(-0.11, -0.03, dc.z);
        vec3 rd = rp;
        rd.z -= uPress * 0.05 * fall;
        float br = exp(-pow((rp.y - ${D.chestY.toFixed(4)}) / 0.13, 2.0)) * step(-0.25, rp.y - ${D.chestY.toFixed(4)});
        rd.x *= 1.0 + uBreath * 0.022 * br;
        rd.z = ${D.spineZ.toFixed(4)} + (rd.z - ${D.spineZ.toFixed(4)}) * (1.0 + uBreath * 0.03 * br);
        ${lips ? `vec3 dl = (rp - vec3(${m[0].toFixed(4)}, ${m[1].toFixed(4)}, ${(m[2] - 0.006).toFixed(4)})) * vec3(1.0, 2.0, 1.4);
        rd += normalize(normal) * uSwell * 0.0075 * exp(-dot(dl, dl) / 0.0005);` : ''}
        transformed = (uDQi * vec4(rd, 1.0)).xyz;
      }`);
}

function crewMaterials(cfg, U, D, extras, DQ) {
  const skinHex = SKINS[cfg.skin] || cfg.skin || SKINS[CREW_SKIN[cfg.who]] || SKINS.mat;
  const skin = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.52, metalness: 0, vertexColors: true });
  skin.onBeforeCompile = sh => {
    injectDeform(sh, U, D, true, DQ.body);
    sh.uniforms.uHives = U.hives;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vRest; uniform float uHives;' + GLSL_SKIN_NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float grain = vnoise(vRest * 420.0) * 0.5 + vnoise(vRest * 90.0) * 0.5;
        diffuseColor.rgb *= 0.95 + grain * 0.08;
        if (uHives > 0.001) {
          float n = vnoise(vRest * 34.0) * 0.6 + vnoise(vRest * 11.0) * 0.4;
          float w = smoothstep(0.5, 0.68, n) * uHives;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.45, 0.72, 0.68) + vec3(0.08, 0.0, 0.0), w * 0.8);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (vnoise(vRest * 260.0) - 0.5) * 0.12, 0.3, 0.8);`);
  };
  skin.customProgramCacheKey = () => 'aura-crew-skin-' + extras.name;
  const cloth = (hex, rough, deform, dq) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      if (deform) injectDeform(sh, U, D, false, dq);
      else injectRest(sh, dq);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRest;' + GLSL_SKIN_NOISE)
        .replace('#include <color_fragment>', `#include <color_fragment>
          // trame du tissu et légers plis
          float weave = vnoise(vRest * vec3(900.0, 900.0, 900.0));
          float fold = vnoise(vRest * vec3(28.0, 9.0, 28.0));
          diffuseColor.rgb *= 0.9 + weave * 0.08 + fold * 0.07;
          if (!gl_FrontFacing) diffuseColor.rgb *= 0.45;`);
    };
    m.customProgramCacheKey = () => 'aura-cloth-' + (deform ? 1 : 0);
    return m;
  };
  const shirt = cloth(cfg.shirt || 0x24365f, 0.9, true, DQ.shirt);
  const shorts = cloth(cfg.shorts || 0x34373f, 0.93, false, DQ.shorts);
  const socks = cloth(0x2b2c30, 0.95, false, DQ.socks);
  const hc = new THREE.Color().setRGB(...(extras.hairColor || [0.05, 0.04, 0.03]), THREE.SRGBColorSpace);
  const hair = new THREE.MeshStandardMaterial({ color: hc, roughness: 0.62, metalness: 0, vertexColors: false, side: THREE.DoubleSide });
  const skinC = new THREE.Color(skinHex);
  hair.onBeforeCompile = sh => {
    sh.uniforms.uSkin = { value: skinC };
    injectRest(sh, DQ.hair);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 color; varying float vIn;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvIn = color.r;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSkin; varying float vIn; varying vec3 vRest;' + GLSL_SKIN_NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // mèches fines et lisière douce
        float str = vnoise(vRest * vec3(1400.0, 160.0, 1400.0)) * 0.6 + vnoise(vRest * vec3(500.0, 60.0, 500.0)) * 0.4;
        diffuseColor.rgb *= 0.72 + str * 0.6;
        float edge = smoothstep(0.0, 0.85, vIn) * (0.75 + 0.25 * vnoise(vRest * 700.0));
        diffuseColor.rgb = mix(uSkin * 0.82, diffuseColor.rgb, edge);`);
  };
  hair.customProgramCacheKey = () => 'aura-hair';
  const bun = new THREE.MeshStandardMaterial({ color: hc, roughness: 0.6 });
  bun.onBeforeCompile = sh => {
    injectRest(sh, DQ.hairbun || DQ.hair);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;' + GLSL_SKIN_NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float str = vnoise(vRest * vec3(1200.0, 1200.0, 160.0)) * 0.6 + vnoise(vRest * 300.0) * 0.4;
        diffuseColor.rgb *= 0.72 + str * 0.6;`);
  };
  bun.customProgramCacheKey = () => 'aura-bun';
  const eyes = new THREE.MeshStandardMaterial({ map: irisTexture(extras.iris), roughness: 0.08, metalness: 0 });
  // œil droit irrité (corps étranger) : la sclère rougit
  eyes.onBeforeCompile = sh => {
    sh.uniforms.uRed = U.redEye;
    injectRest(sh, DQ.eyes);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vX;').replace('vRest = rp;', 'vRest = rp; vX = rp.x;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRed; varying float vX;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float scl = smoothstep(0.2, 0.26, length(vMapUv - 0.5));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.42, 0.4), uRed * scl * step(vX, 0.0) * 0.75);`);
  };
  eyes.customProgramCacheKey = () => 'aura-eyes';
  return { skin, shirt, shorts, socks, hair, bun, eyes };
}

// iris dessiné : sclère légèrement rosée, iris strié, pupille, reflet
function irisTexture(rgb = [0.25, 0.16, 0.1]) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const sc = x.createRadialGradient(128, 128, 30, 128, 128, 140);
  sc.addColorStop(0, '#f4efe9'); sc.addColorStop(0.75, '#e9dcd2'); sc.addColorStop(1, '#d9b9ad');
  x.fillStyle = sc; x.fillRect(0, 0, 256, 256);
  const col = `rgb(${rgb.map(v => Math.round(v * 255)).join(',')})`;
  const ir = x.createRadialGradient(128, 128, 8, 128, 128, 52);
  ir.addColorStop(0, '#0b0806'); ir.addColorStop(0.32, col); ir.addColorStop(0.85, col); ir.addColorStop(1, '#120d0a');
  x.fillStyle = ir; x.beginPath(); x.arc(128, 128, 52, 0, Math.PI * 2); x.fill();
  x.globalAlpha = 0.35; x.strokeStyle = '#000';
  for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2; x.beginPath(); x.moveTo(128 + Math.cos(a) * 20, 128 + Math.sin(a) * 20); x.lineTo(128 + Math.cos(a) * (40 + (i % 3) * 5), 128 + Math.sin(a) * (40 + (i % 3) * 5)); x.stroke(); }
  x.globalAlpha = 1; x.fillStyle = '#050403'; x.beginPath(); x.arc(128, 128, 17, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(116, 114, 6, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// poses : rotations (radians, axes du corps) appliquées à la position debout, bras le long du corps
const POSES = {
  stand: {},
  supine: { shR: [0, 0, -0.22], shL: [0, 0, 0.22], elR: [-0.15, 0, 0], elL: [-0.15, 0, 0], hpR: [0, 0, -0.03], hpL: [0, 0, 0.03], anR: [0.35, 0, 0], anL: [0.35, 0, 0] },
  neutral: { spine: [0.18, 0, 0], head: [-0.2, 0, 0], shR: [-0.8, 0, -0.55], shL: [-0.8, 0, 0.55], elR: [-1.1, 0, 0], elL: [-1.1, 0, 0], hpR: [-0.75, 0, -0.08], hpL: [-0.7, 0, 0.08], knR: [1.0, 0, 0], knL: [0.95, 0, 0], anR: [0.45, 0, 0], anL: [0.45, 0, 0] },
  slumped: { spine: [0.35, 0, 0], head: [0.5, 0.15, 0], shR: [-0.25, 0, -0.3], shL: [-0.2, 0, 0.28], elR: [-0.5, 0, 0], elL: [-0.45, 0, 0], hpR: [-0.55, 0, -0.08], hpL: [-0.5, 0, 0.08], knR: [0.9, 0, 0], knL: [0.85, 0, 0] },
  armOut: { shR: [-1.05, 0, -0.25], elR: [-0.3, 0, 0], wrR: [0, -1.2, 0], shL: [-0.15, 0, 0.12], elL: [-0.45, 0, 0], hpR: [-0.12, 0, 0], knR: [0.2, 0, 0] },
  handOut: { shR: [-0.75, 0, -0.15], elR: [-0.8, 0, 0], wrR: [0, -1.3, 0], shL: [-0.15, 0, 0.12], elL: [-0.4, 0, 0], hpR: [-0.12, 0, 0], knR: [0.2, 0, 0] },
  pinch: { shR: [-1.45, 0, -0.3], elR: [-2.05, 0, 0], wrR: [0, -0.4, 0], shL: [-0.2, 0, 0.18], elL: [-0.6, 0, 0] },
  legsUp: { shR: [0, 0, -0.22], shL: [0, 0, 0.22], hpR: [-0.5, 0, -0.03], hpL: [-0.5, 0, 0.03], anR: [0.3, 0, 0], anL: [0.3, 0, 0] },
  throat: { spine: [0.15, 0, 0], head: [0.2, 0, 0], shR: [-0.95, 0, -0.45], shL: [-0.95, 0, 0.45], elR: [-2.1, 0.3, 0], elL: [-2.1, -0.3, 0], wrR: [0, -0.6, 0], wrL: [0, 0.6, 0], hpR: [-0.2, 0, 0], hpL: [-0.15, 0, 0], knR: [0.35, 0, 0], knL: [0.3, 0, 0] },
  curled: { spine: [0.45, 0, 0], head: [0.3, 0, 0], shR: [-0.6, 0, -0.2], shL: [-0.6, 0, 0.2], elR: [-1.5, 0, 0], elL: [-1.5, 0, 0], hpR: [-1.2, 0, -0.05], hpL: [-1.2, 0, 0.05], knR: [1.6, 0, 0], knL: [1.6, 0, 0] },
  drink: { head: [0.06, 0, 0], shR: [-0.95, 0, -0.32], elR: [-2.15, 0.25, 0], wrR: [0, -0.5, 0], shL: [-0.25, 0, 0.18], elL: [-0.6, 0, 0], hpR: [-0.2, 0, 0], hpL: [-0.12, 0, 0], knR: [0.3, 0, 0], knL: [0.22, 0, 0] },
  work: { spine: [0.1, 0, 0], head: [0.28, 0, 0], shR: [-0.8, 0, -0.12], elR: [-0.95, 0, 0], shL: [-0.72, 0, 0.12], elL: [-1.0, 0, 0], hpR: [-0.18, 0, 0], hpL: [-0.1, 0, 0], knR: [0.3, 0, 0], knL: [0.22, 0, 0] },
  look: { spine: [0.3, 0, 0], head: [0.4, 0, 0], shR: [-0.55, 0, -0.32], shL: [-0.55, 0, 0.32], elR: [-0.9, 0, 0], elL: [-0.85, 0, 0], hpR: [-0.35, 0, -0.05], hpL: [-0.3, 0, 0.05], knR: [0.55, 0, 0], knL: [0.5, 0, 0] },
  sleep: { spine: [0.22, 0, 0], head: [0.3, 0, 0], shR: [-0.45, 0, -0.1], shL: [-0.45, 0, 0.1], elR: [-1.25, 0, 0], elL: [-1.25, 0, 0], hpR: [-0.55, 0, 0], hpL: [-0.55, 0, 0], knR: [0.85, 0, 0], knL: [0.85, 0, 0] },
  float: { spine: [0.08, 0, 0], head: [-0.05, 0, 0], shR: [-0.35, 0, -0.42], shL: [-0.3, 0, 0.45], elR: [-0.85, 0, 0], elL: [-0.8, 0, 0], hpR: [-0.35, 0, -0.06], hpL: [-0.3, 0, 0.06], knR: [0.6, 0, 0], knL: [0.55, 0, 0], anR: [0.3, 0, 0], anL: [0.3, 0, 0] }
};
const JOINTS = ['spine', 'head', 'shR', 'shL', 'elR', 'elL', 'wrR', 'wrL', 'hpR', 'hpL', 'knR', 'knL', 'anR', 'anL'];
// articulation du mannequin -> os du squelette (fraction de la rotation pour les chaînes)
const JOINT_BONES = {
  spine: [['spine05', 0.15], ['spine04', 0.25], ['spine03', 0.3], ['spine02', 0.3]],
  head: [['neck01', 0.3], ['neck02', 0.2], ['neck03', 0.2], ['head', 0.3]],
  shR: [['upperarm01_R', 1]], shL: [['upperarm01_L', 1]], elR: [['lowerarm01_R', 1]], elL: [['lowerarm01_L', 1]],
  wrR: [['wrist_R', 1]], wrL: [['wrist_L', 1]], hpR: [['upperleg01_R', 1]], hpL: [['upperleg01_L', 1]],
  knR: [['lowerleg01_R', 1]], knL: [['lowerleg01_L', 1]], anR: [['foot_R', 1]], anL: [['foot_L', 1]]
};

async function loadCrew(who) {
  const g = await Models.load('crew-' + who);
  const root = SkeletonUtils.clone(g.scene);
  root.userData = g.scene.userData;
  return root;
}

async function buildPatient(cfg = {}) {
  const who = cfg.who || ({ clair: 'lucas', mat: 'rafael', fonce: 'aminata' })[cfg.skin] || 'lucas';
  const model = await loadCrew(who);
  const X = model.userData;
  const U = { hives: { value: 0 }, press: { value: 0 }, breath: { value: 0 }, swell: { value: 0 }, redEye: { value: 0 } };
  const meshes = {};
  model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; meshes[o.name] = o; } });
  const body = meshes.body;
  const root = new THREE.Group(); root.name = 'patient';
  root.add(model);
  const bones = {};
  model.traverse(o => { if (o.isBone) bones[o.name] = o; });
  // repos : position de chaque os dans le repère du modèle (orientations nulles)
  model.updateMatrixWorld(true);
  const restHead = {};
  for (const k in bones) restHead[k] = model.worldToLocal(bones[k].getWorldPosition(new THREE.Vector3()));
  // matrice qui ramène les sommets quantifiés de chaque maillage en mètres (repos)
  const DQ = {};
  for (const k in meshes) {
    const m = meshes[k];
    if (!m.isSkinnedMesh) { DQ[k] = { m: { value: new THREE.Matrix4() }, inv: { value: new THREE.Matrix4() } }; continue; }
    const ri = m.skeleton.bones.findIndex(b => b.name === 'root');
    const T = new THREE.Matrix4().makeTranslation(restHead.root.x, restHead.root.y, restHead.root.z).multiply(m.skeleton.boneInverses[Math.max(0, ri)]);
    DQ[k] = { m: { value: T }, inv: { value: T.clone().invert() } };
  }
  const mats = crewMaterials(Object.assign({ who }, cfg), U, X.deform, X, DQ);
  for (const k in meshes) {
    meshes[k].material = k === 'body' ? mats.skin : k === 'shirt' ? mats.shirt : k === 'shorts' ? mats.shorts : k === 'socks' ? mats.socks
      : k === 'hair' ? mats.hair : k === 'hairbun' ? mats.bun : k === 'eyes' ? mats.eyes : mats.skin;
  }
  // corrections : de la pose en A du maillage à la pose debout, bras le long du corps
  const corr = {};
  const qFromTo = (a, b) => new THREE.Quaternion().setFromUnitVectors(a.clone().normalize(), b.clone().normalize());
  const dirOf = (a, b) => restHead[b].clone().sub(restHead[a]);
  for (const [s, sg] of [['R', -1], ['L', 1]]) {
    const ua = 'upperarm01_' + s, la = 'lowerarm01_' + s, wr = 'wrist_' + s;
    const cs = qFromTo(dirOf(ua, la), V3n(sg * 0.13, -1, 0.02));
    corr[ua] = cs;
    const f1 = dirOf(la, wr).applyQuaternion(cs);
    corr[la] = cs.clone().invert().multiply(qFromTo(f1, V3n(sg * 0.05, -1, 0.2))).multiply(cs);
    const ul = 'upperleg01_' + s, ll = 'lowerleg01_' + s;
    corr[ul] = qFromTo(dirOf(ul, ll), V3n(sg * 0.035, -1, 0.0));
    // doigts légèrement fléchis (main au repos)
    const palmN = new THREE.Vector3().crossVectors(dirOf(wr, 'finger2-1_' + s), dirOf(wr, 'finger5-1_' + s)).normalize().multiplyScalar(sg);
    for (let f = 1; f <= 5; f++) for (let j = 1; j <= 3; j++) {
      const b = 'finger' + f + '-' + j + '_' + s, nb = j < 3 ? 'finger' + f + '-' + (j + 1) + '_' + s : null;
      if (!bones[b]) continue;
      const fd = nb && bones[nb] ? dirOf(b, nb) : dirOf('finger' + f + '-' + (j - 1) + '_' + s, b);
      const ax = new THREE.Vector3().crossVectors(fd, palmN).normalize();
      corr[b] = new THREE.Quaternion().setFromAxisAngle(ax, -(f === 1 ? 0.14 : 0.24 + j * 0.07));
    }
  }
  // orientation cumulée « debout » de chaque os (repère du corps)
  const K = {};
  const accum = (b, parentK) => {
    K[b.name] = parentK.clone().multiply(corr[b.name] || new THREE.Quaternion());
    for (const c of b.children) if (c.isBone) accum(c, K[b.name]);
  };
  accum(bones.root, new THREE.Quaternion());
  const parentK = b => (bones[b].parent && bones[b].parent.isBone ? K[bones[b].parent.name] : new THREE.Quaternion());
  for (const b in bones) bones[b].quaternion.copy(corr[b] || new THREE.Quaternion());
  const J = {};
  for (const j of JOINTS) J[j] = new THREE.Quaternion();
  const applyJoints = () => {
    for (const j of JOINTS) {
      for (const [b, frac] of JOINT_BONES[j]) {
        const bn = bones[b]; if (!bn) continue;
        const q = new THREE.Quaternion().slerp(J[j], frac);
        const kp = parentK(b);
        bn.quaternion.copy(kp.clone().invert().multiply(q).multiply(kp).multiply(corr[b] || new THREE.Quaternion()));
      }
    }
  };
  const base = new THREE.Color(SKINS[cfg.skin] || SKINS[CREW_SKIN[who]] || SKINS.mat);
  const tween = { from: null, to: null, t: 1, dur: 1 };
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
  const A = X.anchors;
  const P = {
    root, who, model, bones, meshes, body, U, skins: [mats.skin], base, shirt: meshes.shirt, sleeves: [], pose: 'stand', t: 0,
    breathRate: 14, breathing: true, pressing: 0, float: 0, height: X.height,
    setPose(name, dur = 0) {
      const target = {};
      const src = typeof name === 'object' ? name : (POSES[name] || {});   // nom de pose ou pose sur mesure
      for (const j of JOINTS) { const r = src[j] || [0, 0, 0]; target[j] = new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2])); }
      if (!dur) { for (const j of JOINTS) J[j].copy(target[j]); applyJoints(); tween.t = 1; }
      else { tween.from = {}; for (const j of JOINTS) tween.from[j] = J[j].clone(); tween.to = target; tween.t = 0; tween.dur = dur; }
      this.pose = name;
    },
    tint({ flush = 0, pale = 0, cyan = 0 } = {}) {
      const c = base.clone();
      if (flush) c.lerp(new THREE.Color(0xd0645a), flush * 0.3);
      if (pale) c.lerp(new THREE.Color(0xcfc6bc), pale * 0.35);
      if (cyan) c.lerp(new THREE.Color(0x8a90a8), cyan * 0.4);
      mats.skin.color.copy(c);
    },
    showShirt(v) { if (meshes.shirt) meshes.shirt.visible = v; },
    // repères du corps en coordonnées du monde
    world(name) {
      root.updateMatrixWorld(true);
      const a = A[name] || A[{ legs: 'kneeR', arm: 'armL' }[name]];
      if (!a) return root.localToWorld(new THREE.Vector3());
      // point de surface rattaché à son os principal (indépendant de l'ordre des sommets du fichier)
      const off = new THREE.Vector3(...a.p).sub(restHead[a.b]);
      const p = bones[a.b].localToWorld(off);
      if (a.d) p.addScaledVector(new THREE.Vector3(...a.n).applyQuaternion(bones[a.b].getWorldQuaternion(tmpQ)), a.d);
      return p;
    },
    press(k) { this.pressing = k; },
    front() { root.updateMatrixWorld(true); return new THREE.Vector3(0, 0, 1).applyQuaternion(bones.spine02.getWorldQuaternion(tmpQ)).normalize(); },
    up() { root.updateMatrixWorld(true); return new THREE.Vector3(0, 1, 0).applyQuaternion(bones.spine02.getWorldQuaternion(tmpQ)).normalize(); },
    place(pos, euler) { root.position.copy(pos); if (euler) root.rotation.copy(euler); },
    // amené au-dessus de la table, à l'horizontale, avant d'être attaché
    async hoverOver(board, h = 0.3, dur = 1.6) {
      board.updateMatrixWorld(true);
      const top = board.localToWorld(new THREE.Vector3(0, 0.04, -0.03));
      const pos = top.add(new THREE.Vector3(0, (X.backDepth || 0.115) + h, 0));
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.1, 0.08, 0.06));
      this.float = 0.4;
      this.setPose('neutral', dur);
      await tweenObj(root, { pos, quat: q, dur });
    },
    // allonger le patient sur la table de contention (dos sur la planche, tête vers -Z)
    async layOn(board, dur = 1.6) {
      board.updateMatrixWorld(true);
      const top = board.localToWorld(new THREE.Vector3(0, 0.04, -0.03));
      const pos = top.add(new THREE.Vector3(0, X.backDepth || 0.115, 0));
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      this.float = 0;
      this.setPose('supine', dur);
      await tweenObj(root, { pos, quat: q, dur });
    },
    update(dt) {
      this.t += dt;
      if (tween.t < 1) {
        tween.t = Math.min(1, tween.t + dt / tween.dur);
        const e = tween.t * tween.t * (3 - 2 * tween.t);
        for (const j of JOINTS) J[j].slerpQuaternions(tween.from[j], tween.to[j], e);
        applyJoints();
      }
      U.press.value += (this.pressing - U.press.value) * Math.min(1, dt * 30);
      if (this.breathing) U.breath.value = Math.sin(this.t * Math.PI * 2 * this.breathRate / 60) * 0.5 + 0.5;
      else U.breath.value += (0 - U.breath.value) * Math.min(1, dt * 2);
      if (this.float) { root.position.y += Math.sin(this.t * 0.6) * 0.0006 * this.float; root.rotation.z += Math.sin(this.t * 0.37) * 0.0003 * this.float; }
    }
  };
  P.setPose('stand');
  return P;
}
const V3n = (x, y, z) => new THREE.Vector3(x, y, z).normalize();

// géométries du mannequin ramenées en mètres (le fichier est quantifié et compressé)
const MANIKIN = { geo: null };
async function manikinGeometries() {
  if (MANIKIN.geo) return MANIKIN.geo;
  const g = await Models.load('manikin');
  g.scene.updateMatrixWorld(true);
  const out = {};
  g.scene.traverse(src => {
    if (!src.isMesh) return;
    const geo = new THREE.BufferGeometry();
    for (const k of ['position', 'normal']) {
      const a = src.geometry.getAttribute(k);
      if (!a) continue;
      const f = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
      geo.setAttribute(k, new THREE.BufferAttribute(f, 3));
    }
    if (src.geometry.index) geo.setIndex(src.geometry.index.clone());
    geo.applyMatrix4(src.matrixWorld);
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    geo.computeBoundingSphere();
    out[src.name] = geo;
  });
  MANIKIN.geo = out;
  return out;
}

/* ---------- mains du sauveteur (gants bleus) et gestes fantômes ---------- */
const GLOVE_MATS = {
  real: () => new THREE.MeshStandardMaterial({ color: 0x4a74d8, roughness: 0.38 }),
  ghost: () => new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.38, depthWrite: false })
};
async function makeGlove(pose = 'open', side = 'R', kind = 'real') {
  const G = await manikinGeometries();
  const m = new THREE.Mesh(G['glove_' + pose], GLOVE_MATS[kind]());
  if (kind === 'ghost') m.renderOrder = 5;
  const holder = new THREE.Group(); holder.add(m);
  if (side === 'L') m.scale.x = -1;
  holder.userData.pose = pose;
  return holder;
}
// oriente un gant : paume vers « palm », doigts vers « fingers » (vecteurs du monde)
// (le gant gauche est le droit en miroir dans son propre repère : même orientation du support)
function orientGlove(obj, palm, fingers) {
  const z = palm.clone().normalize();
  const y = fingers.clone().negate().projectOnPlane(z).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
