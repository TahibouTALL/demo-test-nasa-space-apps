/* ================= Lac de montagne au matin ================= */
function makeLakeTerrain(noise) {
  const fbm = (x, z, o) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise.noise(x * f, z * f); f *= 2.03; a *= 0.5; } return s; };
  const ridged = (x, z) => {
    let s = 0, a = 0.55, f = 1, w = 1;
    for (let i = 0; i < 7; i++) {
      let n = 1 - Math.abs(noise.noise(x * f + 11.3 * i, z * f - 7.1 * i));
      n = n * n * w;
      w = clamp(n * 1.6, 0, 1);
      s += n * a; f *= 2.05; a *= 0.5;
    }
    return s;
  };
  return (x, z) => {
    const ex = x / 760, ez = (z + 1030) / 1000;
    const ld = Math.sqrt(ex * ex + ez * ez);
    let h;
    if (ld < 1) h = -24 * (1 - ld * ld) - 0.6;
    else h = -0.6 + 40 * Math.pow(ld - 1, 1.2);
    const m = smoothstep(1.12, 2.4, ld);
    const back = z > 0 ? lerp(1, 0.22, smoothstep(0, 1400, z)) : 1;
    h += m * back * (140 + 1150 * ridged(x * 0.00038, z * 0.00038) * smoothstep(1.3, 3.0, ld));
    const m2 = smoothstep(1.05, 1.7, ld);
    h += m2 * 1350 * Math.exp(-((x + 420) ** 2 + (z + 3900) ** 2) / (2 * 1150 * 1150));
    h += m2 * 700 * Math.exp(-((x - 2400) ** 2 + (z + 2500) ** 2) / (2 * 950 * 950));
    h += m2 * 520 * Math.exp(-((x + 2600) ** 2 + (z + 1700) ** 2) / (2 * 800 * 800));
    h += fbm(x * 0.0035, z * 0.0035, 5) * 9 * smoothstep(1.0, 1.25, ld);
    h += noise.noise(x * 0.04, z * 0.04) * 0.5;
    return h;
  };
}

function conifer() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.05, 0.08, 0.35, 6); trunk.translate(0, 0.17, 0);
  parts.push([trunk, 0x4a3524]);
  const tiers = [[0.42, 0.55, 0.28], [0.34, 0.5, 0.52], [0.25, 0.42, 0.74], [0.15, 0.32, 0.92]];
  for (const [r, h, y] of tiers) { const c = new THREE.ConeGeometry(r, h, 8); c.translate(0, y, 0); parts.push([c, 0x33573a]); }
  const geos = parts.map(([g, col]) => {
    const n = g.attributes.position.count, cc = new THREE.Color(col), arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const y = g.attributes.position.getY(i);
      const k = 0.75 + 0.35 * y;
      arr[i * 3] = cc.r * k; arr[i * 3 + 1] = cc.g * k; arr[i * 3 + 2] = cc.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g.index ? g.toNonIndexed() : g;
  });
  return mergeGeometries(geos);
}

function birdSong(ctx, out, when, pan) {
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  const g0 = ctx.createGain(); g0.gain.value = 0.05 + Math.random() * 0.05;
  if (p) { p.pan.value = pan; g0.connect(p).connect(out); } else g0.connect(out);
  const type = Math.floor(Math.random() * 3);
  let t = when;
  const n = type === 0 ? 6 + Math.floor(Math.random() * 6) : 3 + Math.floor(Math.random() * 4);
  const base = 2600 + Math.random() * 2200;
  for (let i = 0; i < n; i++) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    let f0, f1, d;
    if (type === 0) { f0 = base * (1 + 0.04 * i); f1 = f0 * 0.82; d = 0.06; }
    else if (type === 1) { f0 = base * (i % 2 ? 1.25 : 0.95); f1 = f0 * 1.15; d = 0.11; }
    else { f0 = base * 1.3; f1 = base * 0.7; d = 0.16 + Math.random() * 0.08; }
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + d * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(g0);
    o.start(t); o.stop(t + d + 0.02);
    t += d + (type === 0 ? 0.025 : 0.06 + Math.random() * 0.08);
  }
}

function lakeAudio(ctx, out) {
  const lap = noiseBand(ctx, out, 'brown', 'lowpass', 280, 0.7, 0.0);
  const leaves = noiseBand(ctx, out, 'pink', 'bandpass', 1500, 0.5, 0.012);
  const air = noiseBand(ctx, out, 'pink', 'lowpass', 400, 0.5, 0.02);
  let t = 0, nextLap = 0.3, nextBird = 1.5;
  return {
    update(dt) {
      t += dt;
      const now = ctx.currentTime;
      if (t > nextLap) {
        lap.gain.gain.setTargetAtTime(0.10 + Math.random() * 0.12, now, 0.12);
        lap.gain.gain.setTargetAtTime(0.01, now + 0.4, 0.5);
        nextLap = t + 1.4 + Math.random() * 2.6;
      }
      if (t > nextBird) {
        birdSong(ctx, out, now + 0.05, (Math.random() * 2 - 1) * 0.8);
        nextBird = t + 3 + Math.random() * 9;
      }
      leaves.gain.gain.setTargetAtTime(0.008 + 0.014 * (0.5 + 0.5 * Math.sin(t * 0.21 + Math.sin(t * 0.05) * 3)), now, 1.2);
    },
    stop() { lap.stop(); leaves.stop(); air.stop(); }
  };
}

EXPERIENCES.lake = {
  title: 'Lac de montagne au matin',
  async create() {
    const scene = new THREE.Scene();
    const noise = new SimplexNoise({ random: mulberry32(12) });
    const H = makeLakeTerrain(noise);
    const fogCol = new THREE.Color(0xaec3d6);
    scene.fog = new THREE.FogExp2(fogCol, 0.000085);

    const sun = new THREE.Vector3().setFromSphericalCoords(1, (90 - 11) * DEG, 42 * DEG);
    const sky = new Sky(); sky.scale.setScalar(40000);
    const su = sky.material.uniforms;
    su.turbidity.value = 3.0; su.rayleigh.value = 1.25; su.mieCoefficient.value = 0.0045; su.mieDirectionalG.value = 0.82;
    su.sunPosition.value.copy(sun);
    scene.add(sky);

    // relief : couleurs calculées pixel par pixel (herbe, forêt, roche, neige) pour des limites nettes
    const geo = radialGrid(1.5, 16000, 300, 720, H);
    const terrMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
    terrMat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nvarying vec3 vWn;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWn = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nvarying vec3 vWn;\n' + GLSL_NOISE)
        .replace('#include <color_fragment>', `
          float hgt = vWp.y; float ny = normalize(vWn).y;
          float dist = length(vWp - cameraPosition);
          float n1 = fbm2(vWp.xz * 0.004, 4), n2 = fbm2(vWp.xz * 0.05, 3);
          vec3 grass = mix(vec3(0.11, 0.18, 0.045), vec3(0.21, 0.25, 0.085), n1);
          vec3 forest = vec3(0.035, 0.07, 0.032);
          vec3 rock = mix(vec3(0.21, 0.20, 0.185), vec3(0.36, 0.34, 0.31), n2);
          vec3 snow = vec3(0.86, 0.89, 0.93);
          vec3 shore = mix(vec3(0.22, 0.20, 0.17), vec3(0.32, 0.30, 0.27), n2);
          vec3 col = grass;
          col = mix(col, forest, smoothstep(0.42, 0.62, fbm2(vWp.xz * 0.0015, 3)) * (1.0 - smoothstep(900.0, 1180.0, hgt)) * smoothstep(4.0, 25.0, hgt));
          float rockK = 1.0 - smoothstep(0.60, 0.80, ny + (n2 - 0.5) * 0.12);
          rockK = max(rockK, smoothstep(1250.0, 1650.0, hgt + (n1 - 0.5) * 300.0));
          col = mix(col, rock, clamp(rockK, 0.0, 1.0));
          float snowLine = 1430.0 + (n1 - 0.5) * 360.0;
          col = mix(col, snow, smoothstep(snowLine, snowLine + 110.0, hgt) * smoothstep(0.40, 0.60, ny));
          col = mix(shore, col, smoothstep(0.15, 0.8, hgt));
          col *= mix(0.78 + 0.44 * fbm2(vWp.xz * 0.45, 3), 1.0, smoothstep(60.0, 350.0, dist));
          diffuseColor.rgb = col;`);
    };
    const terrain = new THREE.Mesh(geo, terrMat);
    terrain.receiveShadow = true; terrain.castShadow = true;
    scene.add(terrain);

    // forêt de conifères
    const treeGeo = conifer();
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const N = 7000;
    const trees = new THREE.InstancedMesh(treeGeo, treeMat, N);
    const rt = mulberry32(8);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p3 = new THREE.Vector3(), tc = new THREE.Color();
    let placed = 0;
    for (let tries = 0; tries < 90000 && placed < N; tries++) {
      const r = 140 + Math.pow(rt(), 1.4) * 5200, a = rt() * Math.PI * 2;
      const x = Math.cos(a) * r, z = 30 + Math.sin(a) * r;
      const y = H(x, z);
      if (y < 2.2 || y > 1180 + noise.noise(x * 0.002, z * 0.002) * 130) continue;
      const sl = Math.abs(H(x + 4, z) - y) + Math.abs(H(x, z + 4) - y);
      if (sl > 3.4) continue;
      const dens = 0.55 + 0.45 * noise.noise(x * 0.0012, z * 0.0012);
      if (rt() > dens) continue;
      if (z > 30 && Math.abs(x) < 400 && rt() < 0.85) continue;
      const s = 11 + rt() * 17;
      p3.set(x, y - 0.4, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rt() * 6.28); sc.set(s * (0.75 + rt() * 0.3), s, s * (0.75 + rt() * 0.3));
      m4.compose(p3, q, sc);
      trees.setMatrixAt(placed, m4);
      tc.setRGB(0.8 + rt() * 0.35, 0.85 + rt() * 0.3, 0.8 + rt() * 0.3);
      trees.setColorAt(placed, tc);
      placed++;
    }
    for (const [x, z, s] of [[-34, 42, 19], [-46, 18, 23], [-29, 60, 16], [41, 55, 21], [52, 30, 24], [63, 8, 18]]) {
      if (placed >= N) break;
      p3.set(x, H(x, z) - 0.4, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rt() * 6.28); sc.set(s * 0.85, s, s * 0.85);
      m4.compose(p3, q, sc); trees.setMatrixAt(placed, m4); tc.setRGB(1, 1, 1); trees.setColorAt(placed, tc); placed++;
    }
    trees.count = placed;
    trees.castShadow = true; trees.receiveShadow = true;
    scene.add(trees);

    // rochers au bord de l'eau, près de l'observateur
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7d7a73, roughness: 0.85, flatShading: true });
    const rr = mulberry32(31);
    for (let i = 0; i < 26; i++) {
      const g = new THREE.IcosahedronGeometry(1, 1);
      const pa = g.attributes.position;
      for (let k = 0; k < pa.count; k++) { const f = 0.75 + rr() * 0.5; pa.setXYZ(k, pa.getX(k) * f, pa.getY(k) * f * 0.7, pa.getZ(k) * f); }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, rockMat);
      const x = (rr() - 0.5) * 70, z = -3 + rr() * 22;
      const s = 0.25 + rr() * rr() * 1.6;
      m.scale.setScalar(s); m.position.set(x, H(x, z) - s * 0.25, z);
      m.rotation.set(rr() * 3, rr() * 3, rr() * 3);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
    }

    // lac miroir
    const waterNormals = tileableNormalMap(256, { count: 50, kmin: 2, kmax: 30, decay: 1.25, pow: 1.4 }, 3.0, 17);
    const water = new Water(new THREE.PlaneGeometry(5000, 5000), {
      textureWidth: 768, textureHeight: 768, waterNormals, sunDirection: sun.clone(), sunColor: 0xfff0dc,
      waterColor: 0x0f2a2c, distortionScale: 0.55, fog: true, alpha: 1
    });
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0, -1030);
    water.material.uniforms.size.value = 2.2;
    scene.add(water);

    // brume du matin au ras de l'eau
    const mistMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, sunDir: { value: sun }, fogColor: { value: fogCol } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */`
        uniform float time; uniform vec3 sunDir; uniform vec3 fogColor;
        varying vec3 vW;
        ${GLSL_NOISE}
        void main() {
          vec2 e = vec2(vW.x / 760.0, (vW.z + 1030.0) / 1000.0);
          float ld = length(e);
          float inside = 1.0 - smoothstep(0.75, 1.05, ld);
          float n = fbm2(vW.xz * 0.0045 + vec2(time * 0.006, time * 0.002), 5);
          float n2 = fbm2(vW.xz * 0.018 - vec2(time * 0.01, 0.0), 3);
          float a = smoothstep(0.42, 0.78, n * 0.8 + n2 * 0.3) * inside;
          vec3 V = normalize(vW - cameraPosition);
          float fs = pow(max(dot(V, sunDir), 0.0), 4.0);
          vec3 col = mix(vec3(0.82, 0.86, 0.9), vec3(1.25, 1.08, 0.88), 0.35 + 0.65 * fs);
          float near = smoothstep(4.0, 60.0, distance(vW, cameraPosition));
          gl_FragColor = vec4(col, a * 0.42 * near);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    for (const [y, s] of [[1.8, 1], [5.5, 1.07], [11, 1.12]]) {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(1800 * s, 2200 * s), mistMat);
      mist.rotation.x = -Math.PI / 2; mist.position.set(0, y, -1030);
      scene.add(mist);
    }

    // lumière du matin et ombres des montagnes
    const sunLight = new THREE.DirectionalLight(0xffe0bd, 3.3);
    sunLight.position.copy(sun).multiplyScalar(6000).add(new THREE.Vector3(0, 0, -1500));
    sunLight.target.position.set(0, 0, -1500);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    const sc2 = sunLight.shadow.camera;
    sc2.left = -5200; sc2.right = 5200; sc2.top = 5200; sc2.bottom = -5200; sc2.near = 100; sc2.far = 16000;
    sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 3;
    scene.add(sunLight, sunLight.target);
    const hemi = new THREE.HemisphereLight(0xb4cdef, 0x4a5a36, 1.25);
    scene.add(hemi);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const y0 = H(0, 30);
    return {
      scene, viewpoint: new THREE.Vector3(0, Math.max(y0, 0.4) + 1.62, 30), yaw: -8 * DEG, pitch: 2 * DEG, fov: 70, near: 0.15, far: 60000, exposure: 0.72,
      caption: 'Un lac de montagne au lever du jour. La brume monte lentement de l\'eau.',
      update(dt) {
        water.material.uniforms.time.value += dt * 0.25;
        mistMat.uniforms.time.value += dt;
      },
      enter() { renderer.shadowMap.enabled = true; Sound.setAmbience(lakeAudio); },
      leave() { renderer.shadowMap.enabled = false; },
      dispose() { renderer.shadowMap.enabled = false; disposeScene(scene); }
    };
  }
};
