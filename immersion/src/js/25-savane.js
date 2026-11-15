/* ================= Savane aux baobabs (Sénégal) =================
   Fin d'après-midi dans la savane du Sine-Saloum : herbes sèches dorées, baobabs sans feuilles
   de la saison sèche, acacias en parasol, termitières de latérite. */

// écorce lisse et grise du baobab, plissée de longues stries verticales
function barkMaterial(hex) {
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;\n' + GLSL_NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ang = atan(vLp.z, vLp.x);
        float st = fbm2(vec2(ang * 7.0, vLp.y * 0.3), 4);
        float fine = fbm2(vec2(ang * 46.0, vLp.y * 2.2), 3);
        diffuseColor.rgb *= 0.74 + 0.36 * st + 0.16 * (fine - 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 0.94, 0.86), smoothstep(0.55, 0.8, st));
        diffuseColor.rgb *= 0.82 + 0.18 * smoothstep(0.0, 3.0, vLp.y);`);
  };
  return m;
}
// baobab : tronc en bouteille plissé, grosses branches tortueuses (saison sèche), fruits pendants
function makeBaobab(seed, H = 13) {
  const rnd = mulberry32(seed);
  const g = new THREE.Group();
  const bark = barkMaterial(0x7e6f66);
  const prof = [];
  const R0 = 1.8 + rnd() * 1.1;
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, y = t * H * 0.62;
    const r = R0 * (1.05 - 0.35 * t + 0.25 * Math.sin(t * Math.PI) - (t > 0.85 ? (t - 0.85) * 2.2 : 0));
    prof.push(new THREE.Vector2(Math.max(0.35, r), y));
  }
  const tg = new THREE.LatheGeometry(prof, 28);
  const p = tg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x);
    const k = 1 + 0.07 * Math.sin(a * 9 + seed) + 0.04 * Math.sin(a * 17 + y * 0.8) + 0.03 * (rnd() - 0.5);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  tg.computeVertexNormals();
  g.add(new THREE.Mesh(tg, bark));
  const topY = H * 0.6, topR = prof[13].x;
  const nb = 6 + Math.floor(rnd() * 4);
  for (let b = 0; b < nb; b++) {
    const a = b / nb * Math.PI * 2 + rnd() * 0.5;
    const len = H * (0.28 + rnd() * 0.22);
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(new THREE.Vector3(Math.cos(a) * (topR * 0.6 + len * t), topY + len * (0.55 * t - 0.12 * t * t) + Math.sin(t * 5 + b) * 0.3, Math.sin(a) * (topR * 0.6 + len * t)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const br = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.32 * (1 - 0.3 * rnd()), 7), bark);
    g.add(br);
    // rameaux
    for (let s = 0; s < 3; s++) {
      const t0 = 0.5 + rnd() * 0.45, p0 = curve.getPoint(t0);
      const a2 = a + (rnd() - 0.5) * 1.6, l2 = len * (0.25 + rnd() * 0.25);
      const p1 = p0.clone().add(new THREE.Vector3(Math.cos(a2) * l2, l2 * (0.35 + rnd() * 0.4), Math.sin(a2) * l2));
      const tw = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, 0.4, 0)), p1), 5, 0.1, 5), bark);
      g.add(tw);
      // « pain de singe » : fruits oblongs au bout de longs pédoncules
      if (rnd() < 0.7) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), fruitMat);
        f.scale.set(1, 1.9, 1); f.position.copy(p1).add(new THREE.Vector3(0, -0.55 - rnd() * 0.4, 0));
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, p1.y - f.position.y, 4), bark);
        stalk.position.copy(p1).lerp(f.position, 0.5);
        g.add(f, stalk);
      }
    }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}
const fruitMat = new THREE.MeshStandardMaterial({ color: 0x8a7a52, roughness: 0.75 });
// acacia en parasol
function makeAcacia(seed, H = 7) {
  const rnd = mulberry32(seed);
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4b3a2e, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, H * 0.5, 7), wood); trunk.position.y = H * 0.25; g.add(trunk);
  // tronc qui se divise en trois ou quatre branches obliques
  const tops = [];
  for (let b = 0, nb = 3 + Math.floor(rnd() * 2); b < nb; b++) {
    const a = b / nb * Math.PI * 2 + rnd(), r = 1.6 + rnd() * 1.6;
    const p0 = new THREE.Vector3(0, H * 0.48, 0), p1 = new THREE.Vector3(Math.cos(a) * r, H * (0.8 + rnd() * 0.08), Math.sin(a) * r);
    const br = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, 0.3, 0)), p1), 6, 0.09, 5), wood);
    g.add(br); tops.push(p1);
  }
  const blob = new THREE.IcosahedronGeometry(1, 1);
  const leaves = [];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 3.6;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(a) * r, H * (0.84 + rnd() * 0.06) + (1 - r / 3.6) * 0.3, Math.sin(a) * r),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 0.3, rnd() * 6.3, rnd() * 0.3)),
      new THREE.Vector3(1.1 + rnd() * 0.9, 0.32 + rnd() * 0.18, 1.1 + rnd() * 0.9));
    const gg = blob.clone().applyMatrix4(m);
    const n = gg.attributes.position.count, col = new Float32Array(n * 3), cc = new THREE.Color().setHSL(0.2 + rnd() * 0.04, 0.35, 0.22 + rnd() * 0.07);
    for (let k = 0; k < n; k++) { const up = gg.attributes.normal.getY(k); const f = 0.7 + 0.4 * Math.max(0, up); col[k * 3] = cc.r * f; col[k * 3 + 1] = cc.g * f; col[k * 3 + 2] = cc.b * f; }
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    leaves.push(gg);
  }
  g.add(new THREE.Mesh(mergeGeometries(leaves), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })));
  return g;
}
// termitière de latérite : colonne bosselée au sommet arrondi, plus sombre et terreuse à la base
function makeMound(seed) {
  const rnd = mulberry32(seed);
  const H = 2.0 + rnd() * 1.8, R = 0.75 + rnd() * 0.45;
  const prof = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const r = R * (1.25 - 0.55 * t - 0.5 * Math.pow(t, 6)) * (1 + 0.08 * Math.sin(t * 11 + seed));
    prof.push(new THREE.Vector2(Math.max(0.02, r), t * H));
  }
  const geo = new THREE.LatheGeometry(prof, 22);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const ph = rnd() * 6;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = y / H;
    const k = 1 + 0.12 * Math.sin(a * 3 + ph) * (1 - t) + 0.06 * Math.sin(a * 7 + y * 2.3) + (rnd() - 0.5) * 0.05;
    p.setX(i, x * k); p.setZ(i, z * k);
    const c = new THREE.Color(0x9a5534).lerp(new THREE.Color(0x6b4a33), (1 - Math.min(1, t * 3)) * 0.6).multiplyScalar(0.85 + 0.25 * rnd());
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.translate(0, -0.15, 0);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
}
// touffe d'herbe sèche : plusieurs brins fins et courbés, plus clairs à la pointe
function grassClump(nb, seed) {
  const rnd = mulberry32(seed);
  const pos = [], col = [], nor = [];
  for (let b = 0; b < nb; b++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 0.14;
    const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    const h = 0.4 + rnd() * 0.6, w = 0.01 + rnd() * 0.008;
    const la = a + (rnd() - 0.5) * 0.9, lean = (0.18 + rnd() * 0.4) * h;
    const dx = Math.cos(la) * lean, dz = Math.sin(la) * lean;
    const ang = rnd() * Math.PI, px = Math.cos(ang) * w, pz = Math.sin(ang) * w;
    const P = (t, sd) => [x0 + dx * t * t + px * sd * (1 - t * 0.85), h * t, z0 + dz * t * t + pz * sd * (1 - t * 0.85)];
    const tone = 0.85 + rnd() * 0.3;
    const fs = rnd() < 0.5 ? -1 : 1, fnx = -pz / w * fs, fnz = px / w * fs;
    const C = t => { const k = (0.42 + 0.58 * t) * tone; return [k, k * (0.97 + 0.03 * t), k * (0.9 + 0.1 * t)]; };
    const ts = [0, 0.4, 0.75, 1];
    const tri = (A, B, Cc, ta, tb, tc) => { pos.push(...A, ...B, ...Cc); col.push(...C(ta), ...C(tb), ...C(tc)); for (let k = 0; k < 3; k++) nor.push(fnx * 0.75, 0.65, fnz * 0.75); };
    for (let k = 0; k < 3; k++) {
      const t0 = ts[k], t1 = ts[k + 1];
      const A = P(t0, -1), B = P(t0, 1), D = P(t1, -1), E = P(t1, 1);
      if (k < 2) { tri(A, B, E, t0, t0, t1); tri(A, E, D, t0, t1, t1); }
      else tri(A, B, P(1, 0), t0, t0, 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
// champ de touffes animées par le vent (instances)
function grassField(n, r0, r1, seed, HG = () => 0, sc = 1, nb = 10, hsl = [0.105, 0.5, 0.5]) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide, vertexColors: true });
  const U = { time: { value: 0 } };
  mat.onBeforeCompile = sh => {
    sh.uniforms.time = U.time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sway = sin(time * 1.4 + ip.x * 0.31 + ip.z * 0.23) * 0.16 + sin(time * 2.9 + ip.x * 1.3) * 0.04;
        transformed.x += sway * position.y * position.y;
        transformed.z += sway * 0.45 * position.y * position.y;`);
    // les deux faces d'un brin reçoivent la même lumière (pas de brins noirs vus de dos)
    sh.fragmentShader = sh.fragmentShader.replace('normal *= faceDirection;', '');
  };
  const m = new THREE.InstancedMesh(grassClump(nb, seed * 13 + 1), mat, n);
  const rnd = mulberry32(seed), d = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = r0 + Math.pow(rnd(), 0.75) * (r1 - r0), a = rnd() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    d.position.set(x, HG(x, z) - 0.12, z);
    d.rotation.set((rnd() - 0.5) * 0.25, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.25);
    const k = (0.7 + rnd() * 0.6) * sc; d.scale.set(k, k * (0.8 + rnd() * 0.5), k);
    d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    c.setHSL(hsl[0] + (rnd() - 0.5) * 0.03, hsl[1] + (rnd() - 0.5) * 0.2, hsl[2] + (rnd() - 0.5) * 0.16); m.setColorAt(i, c);
  }
  m.frustumCulled = false;
  m.userData.U = U;
  return m;
}

function savaneAudio(ctx, out) {
  const wind = noiseBand(ctx, out, 'pink', 'bandpass', 900, 0.45, 0.025);
  const low = noiseBand(ctx, out, 'brown', 'lowpass', 220, 0.6, 0.03);
  // grillons et cigales : impulsions aiguës régulières
  const cr = ctx.createOscillator(), crg = ctx.createGain(), lfo = ctx.createOscillator(), lfg = ctx.createGain();
  cr.type = 'sine'; cr.frequency.value = 4300; crg.gain.value = 0;
  lfo.type = 'square'; lfo.frequency.value = 17; lfg.gain.value = 0.006;
  lfo.connect(lfg).connect(crg.gain); cr.connect(crg).connect(out); cr.start(); lfo.start();
  let t = 0, nextBird = 2, nextGust = 3;
  return {
    update(dt) {
      t += dt;
      const now = ctx.currentTime;
      if (t > nextGust) { wind.gain.gain.setTargetAtTime(0.05 + Math.random() * 0.05, now, 0.8); wind.gain.gain.setTargetAtTime(0.02, now + 2.2, 1.4); nextGust = t + 5 + Math.random() * 6; }
      if (t > nextBird) { birdSong(ctx, out, now + 0.05, (Math.random() - 0.5) * 1.8); nextBird = t + 4 + Math.random() * 8; }
    },
    stop() { wind.stop(); low.stop(); try { cr.stop(); lfo.stop(); } catch (e) { /* rien */ } }
  };
}

EXPERIENCES.savane = {
  title: 'Savane aux baobabs',
  async create() {
    const scene = new THREE.Scene();
    const st = { elev: 9, t: 0 };
    const sun = new THREE.Vector3();
    const sky = new Sky();
    sky.scale.setScalar(30000);
    const su = sky.material.uniforms;
    su.turbidity.value = 16; su.rayleigh.value = 1.3; su.mieCoefficient.value = 0.012; su.mieDirectionalG.value = 0.84;
    sky.material.fragmentShader = sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', `
      float hzc = pow(1.0 - clamp(direction.y, 0.0, 1.0), 5.0);
      retColor *= mix(vec3(1.0), vec3(1.25, 0.95, 0.7), hzc * 0.75);
      retColor = max(retColor, 0.0);
      gl_FragColor = vec4( retColor, 1.0 );`);
    scene.add(sky);
    // sol : paille, taches de latérite rouge et terre nue (presque plat autour de l'observateur)
    const HG = (x, z) => (Math.sin(x * 0.0021) * 7 + Math.sin(z * 0.0017 + 2) * 6 - 5.46) * smoothstep(40, 500, Math.hypot(x, z)) + Math.sin(x * 0.011 + z * 0.007) * 0.6 * smoothstep(10, 80, Math.hypot(x, z));
    const ground = radialGrid(1.2, 14000, 150, 200, HG);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    groundMat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\n' + GLSL_NOISE)
        .replace('#include <color_fragment>', `
          vec2 q = vWp.xz;
          float n1 = fbm2(q * 0.018, 4), n2 = fbm2(q * 0.16, 3), n3 = fbm2(q * 1.7, 2);
          vec3 straw = mix(vec3(0.56, 0.42, 0.22), vec3(0.70, 0.56, 0.31), n2);
          vec3 col = mix(straw, vec3(0.40, 0.31, 0.17), smoothstep(0.5, 0.72, n1) * 0.55);
          float lat = smoothstep(0.6, 0.72, fbm2(q * 0.006 + 7.0, 3));
          col = mix(col, vec3(0.55, 0.28, 0.16), lat * 0.75);
          col *= 0.84 + 0.3 * n3;
          float d = length(vWp.xz - cameraPosition.xz);
          col = mix(col, vec3(0.62, 0.52, 0.37), smoothstep(700.0, 6000.0, d) * 0.55);
          diffuseColor.rgb = col;`);
    };
    const groundMesh = new THREE.Mesh(ground, groundMat);
    groundMesh.position.y = -0.1;
    scene.add(groundMesh);
    const grass = grassField(5200, 1.0, 34, 5, HG, 1, 10); scene.add(grass);
    const grassFar = grassField(4200, 34, 150, 6, HG, 1.5, 8, [0.1, 0.45, 0.46]); scene.add(grassFar);

    // baobabs, acacias, termitières : un grand baobab à gauche, un autre plus loin à droite
    const trees = new THREE.Group();
    const placements = [[-15, -30, 21, 1], [44, -125, 17, 2], [-130, -300, 15, 3], [210, -420, 13, 4], [-420, -760, 15, 5], [520, -900, 14, 6], [30, -1300, 16, 7], [-900, -1500, 13, 8], [1200, -1700, 15, 9]];
    for (const [x, z, h, sd] of placements) { const b = makeBaobab(sd, h); b.position.set(x, HG(x, z) - 0.5, z); b.rotation.y = sd; trees.add(b); }
    for (const [x, z, sd] of [[24, -62, 11], [-85, -210, 12], [140, -260, 13], [-260, -520, 14], [330, -620, 15], [-60, -820, 16]]) { const a = makeAcacia(sd, 6 + (sd % 3)); a.position.set(x, HG(x, z) - 0.3, z); trees.add(a); }
    for (const [x, z, sd] of [[7, -21, 21], [-6, -30, 22], [44, -78, 23], [-70, -120, 24]]) { const m = makeMound(sd); m.position.set(x, HG(x, z) - 0.2, z); trees.add(m); }
    scene.add(trees);

    const sunTex = canvasTexture(256, 256, (cx, W) => {
      const gr = cx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
      gr.addColorStop(0, 'rgba(255,246,225,1)'); gr.addColorStop(0.07, 'rgba(255,232,180,1)'); gr.addColorStop(0.09, 'rgba(255,190,110,0.5)');
      gr.addColorStop(0.3, 'rgba(255,160,80,0.14)'); gr.addColorStop(1, 'rgba(255,140,70,0)');
      cx.fillStyle = gr; cx.fillRect(0, 0, W, W);
    });
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sunSprite.scale.setScalar(2200);
    scene.add(sunSprite);
    const sunLight = new THREE.DirectionalLight(0xffc489, 2.6);
    scene.add(sunLight);
    const hemi = new THREE.HemisphereLight(0xb8c4d6, 0x8a6038, 0.55);
    scene.add(hemi);
    scene.fog = new THREE.Fog(0xe6c39a, 500, 9000);

    // quelques nuages de saison sèche, hauts et effilochés, dorés par le soleil bas
    const cloudMat = new THREE.ShaderMaterial({
      uniforms: { sunDir: { value: sun }, time: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */`
        uniform vec3 sunDir; uniform float time;
        varying vec3 vW;
        ${GLSL_NOISE}
        void main() {
          vec2 p = vW.xz; float d = length(p - cameraPosition.xz);
          vec2 q = p * 0.00012 + vec2(time * 0.0004, 0.0);
          float n = fbm2(q * vec2(1.0, 2.6), 7), n2 = fbm2(q * 3.3 + 5.0, 5);
          float dens = smoothstep(0.62, 0.86, n * 0.78 + n2 * 0.3);
          vec3 V = normalize(vW - cameraPosition);
          float cs = max(dot(normalize(vec3(V.x, 0.0, V.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0);
          vec3 col = mix(vec3(1.0, 0.86, 0.74), vec3(1.25, 0.95, 0.7), pow(cs, 2.0));
          col *= mix(1.0, 0.72, smoothstep(0.35, 1.0, dens));
          gl_FragColor = vec4(col, dens * (1.0 - smoothstep(9000.0, 26000.0, d)) * 0.85);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    const clouds = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000), cloudMat);
    clouds.rotation.x = -Math.PI / 2; clouds.position.y = 2600;
    scene.add(clouds);

    // vautours qui tournent haut dans le ciel
    const birds = [];
    const rb = mulberry32(77);
    for (let i = 0; i < 5; i++) {
      const b = makeBird();
      b.userData.path = { r: 60 + rb() * 90, cx: -100 + rb() * 300, cz: -400 - rb() * 300, h: 70 + rb() * 50, w: 0.06 + rb() * 0.05, ph: rb() * 6.28, flap: rb() * 6 };
      b.scale.setScalar(3); birds.push(b); scene.add(b);
    }
    let pmremRT = null;
    const exp = {
      scene, viewpoint: new THREE.Vector3(0, 1.65, 6), yaw: 6 * DEG, pitch: 4 * DEG, fov: 70, near: 0.1, far: 80000, exposure: 0.36,
      caption: 'Savane du Sine-Saloum en saison sèche : les baobabs ont perdu leurs feuilles, l\'herbe a la couleur de la paille.',
      st,
      setSun(elev) {
        st.elev = elev;
        sun.setFromSphericalCoords(1, (90 - elev) * DEG, 38 * DEG);
        su.sunPosition.value.copy(sun);
        sunLight.position.copy(sun).multiplyScalar(100);
        const k = smoothstep(-4, 10, elev);
        sunLight.intensity = 2.8 * smoothstep(-0.5, 2, elev);
        sunLight.color.setRGB(1.0, lerp(0.52, 0.8, k), lerp(0.3, 0.58, k));
        hemi.intensity = lerp(0.2, 0.55, k);
        renderer.toneMappingExposure = lerp(0.75, 0.5, k);
        sunSprite.position.copy(sun).multiplyScalar(20000);
        sunSprite.material.opacity = smoothstep(-0.6, 0.4, elev);
        exp.exposure = renderer.toneMappingExposure;
      },
      updateEnv() {
        const pm = new THREE.PMREMGenerator(renderer);
        const sk = new THREE.Scene(); const s2 = new Sky(); s2.scale.setScalar(1000);
        for (const k in su) s2.material.uniforms[k].value = su[k].value;
        sk.add(s2);
        const rt = pm.fromScene(sk, 0, 0.1, 2000);
        if (pmremRT) pmremRT.dispose();
        pmremRT = rt; scene.environment = rt.texture;
        pm.dispose(); s2.geometry.dispose(); s2.material.dispose();
      },
      update(dt) {
        st.t += dt;
        grass.userData.U.time.value = st.t; grassFar.userData.U.time.value = st.t; cloudMat.uniforms.time.value = st.t;
        const e = st.elev - dt * 0.25 / 60;
        if (e > -5) this.setSun(e);
        if (Math.floor(st.t / 30) !== Math.floor((st.t - dt) / 30)) this.updateEnv();
        for (const b of birds) {
          const p = b.userData.path;
          p.ph += dt * p.w;
          b.position.set(p.cx + Math.cos(p.ph) * p.r, p.h + Math.sin(p.ph * 1.7) * 3, p.cz + Math.sin(p.ph) * p.r);
          b.rotation.y = -p.ph; b.rotation.z = 0.25;
          b.userData.wings[0].rotation.z = 0.08; b.userData.wings[1].rotation.z = -0.08;
        }
      },
      enter() { Sound.setAmbience(savaneAudio); },
      dispose() { if (pmremRT) pmremRT.dispose(); disposeScene(scene); }
    };
    exp.setSun(6.5);
    exp.updateEnv();
    return exp;
  }
};
