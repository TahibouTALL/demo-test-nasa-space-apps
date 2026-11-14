/* ================= Aurores boréales sur un lac de montagne =================
   Nuit d'automne au bord d'un lac, sommets enneigés, ciel étoilé et rideaux d'aurore qui
   ondulent lentement. Le lac, sans vent, reflète le ciel. */

function auroraAudio(ctx, out) {
  const wind = noiseBand(ctx, out, 'pink', 'lowpass', 380, 0.5, 0.022);
  const high = noiseBand(ctx, out, 'pink', 'bandpass', 1400, 0.6, 0.004);
  const lap = noiseBand(ctx, out, 'brown', 'lowpass', 260, 0.7, 0.0);
  let t = 0, next = 1;
  return {
    update(dt) {
      t += dt;
      const now = ctx.currentTime;
      if (t > next) { lap.gain.gain.setTargetAtTime(0.03 + Math.random() * 0.04, now, 0.2); lap.gain.gain.setTargetAtTime(0.005, now + 0.6, 0.8); next = t + 2.5 + Math.random() * 3.5; }
    },
    stop() { wind.stop(); high.stop(); lap.stop(); }
  };
}

EXPERIENCES.aurore = {
  title: 'Aurores boréales',
  async create() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);
    const noise = new SimplexNoise({ random: mulberry32(12) });
    const H = makeLakeTerrain(noise);
    scene.fog = new THREE.FogExp2(0x070c18, 0.00006);

    // ciel nocturne : dégradé, étoiles
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`
        varying vec3 vD;
        void main() {
          float h = clamp(vD.y, -0.1, 1.0);
          vec3 c = mix(vec3(0.020, 0.040, 0.075), vec3(0.004, 0.008, 0.022), smoothstep(0.0, 0.6, h));
          c += vec3(0.02, 0.06, 0.05) * exp(-max(h, 0.0) * 9.0);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(14000, 48, 24), skyMat); dome.renderOrder = -3; scene.add(dome);
    const cat = makeStarCatalog(31, 9000);
    const stars = makeStarPoints(cat, { horizon: true, magLimit: 6.0 });
    stars.scale.setScalar(13000); stars.renderOrder = -2; stars.material.uniforms.intensity.value = 1.7;
    stars.rotation.set(0.9, 0.4, 0);
    scene.add(stars);

    // rideaux d'aurore : rubans courbes, rayons verticaux, vert en bas, pourpre en haut
    const auroraMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: /* glsl */`
        uniform float time; varying vec2 vUv; varying float vWave;
        void main() {
          vUv = uv;
          vec3 p = position;
          float w = sin(uv.x * 9.0 + time * 0.07) * 0.6 + sin(uv.x * 23.0 - time * 0.11) * 0.25;
          p.z += w * 900.0; vWave = w;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform float time; varying vec2 vUv; varying float vWave;
        ${GLSL_NOISE}
        void main() {
          float x = vUv.x, y = vUv.y;
          float rays = fbm2(vec2(x * 160.0 + time * 0.35, time * 0.04), 4);
          rays = pow(clamp(rays * 1.25, 0.0, 1.0), 2.2);
          float base = smoothstep(0.0, 0.05, y) * (1.0 - smoothstep(0.05, 1.0, y));
          float body = exp(-y * 2.4) * smoothstep(0.0, 0.03, y);
          float fold = pow(fbm2(vec2(x * 6.0 - time * 0.02, 1.7), 3), 2.2) * 2.6;
          float ends = smoothstep(0.0, 0.12, x) * (1.0 - smoothstep(0.88, 1.0, x));
          // vert de l'oxygène (557,7 nm) dominant, pourpre au sommet, liseré rose à la base
          vec3 green = vec3(0.22, 1.0, 0.5), violet = vec3(0.6, 0.25, 0.85), pink = vec3(1.0, 0.35, 0.6);
          vec3 col = mix(green, violet, smoothstep(0.55, 1.0, y));
          col = mix(pink, col, smoothstep(0.0, 0.05, y));
          float a = (body * 1.4 + base * 0.4) * (0.35 + 0.95 * rays) * fold * ends;
          gl_FragColor = vec4(col * a * 0.5, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide, fog: false
    });
    const aurora = new THREE.Group();
    for (const [rad, a0, a1, y0, h, rot] of [[9500, -1.0, 0.5, 2400, 5200, 0], [11500, -0.3, 1.3, 3600, 4600, 0.1], [8600, 0.7, 1.8, 2000, 3800, -0.05]]) {
      const segs = 220, geo = new THREE.PlaneGeometry(1, 1, segs, 12);
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const u = uv.getX(i), v = uv.getY(i), a = a0 + (a1 - a0) * u;
        p.setXYZ(i, Math.sin(a) * rad, y0 + v * h, -Math.cos(a) * rad);
      }
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, auroraMat); m.rotation.y = rot; m.renderOrder = -1; m.frustumCulled = false;
      aurora.add(m);
    }
    scene.add(aurora);

    // relief enneigé
    const geo = radialGrid(1.5, 16000, 260, 560, H);
    const terrMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
    terrMat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nvarying vec3 vWn;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWn = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nvarying vec3 vWn;\n' + GLSL_NOISE)
        .replace('#include <color_fragment>', `
          float hgt = vWp.y; float ny = normalize(vWn).y;
          float n1 = fbm2(vWp.xz * 0.004, 4), n2 = fbm2(vWp.xz * 0.05, 3);
          vec3 snow = vec3(0.80, 0.86, 0.95);
          vec3 rock = mix(vec3(0.10, 0.10, 0.11), vec3(0.20, 0.20, 0.21), n2);
          vec3 forest = vec3(0.025, 0.04, 0.035);
          vec3 col = mix(forest, snow, smoothstep(700.0, 1000.0, hgt + (n1 - 0.5) * 300.0));
          col = mix(col, rock, (1.0 - smoothstep(0.55, 0.78, ny + (n2 - 0.5) * 0.1)) * 0.85);
          col = mix(vec3(0.07, 0.07, 0.08), col, smoothstep(0.2, 1.5, hgt));
          diffuseColor.rgb = col;`);
    };
    scene.add(new THREE.Mesh(geo, terrMat));
    // sapins en silhouette
    const treeGeo = conifer();
    const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, color: 0x6a7a70 }), 4000);
    const rt = mulberry32(9);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p3 = new THREE.Vector3();
    let placed = 0;
    for (let tries = 0; tries < 60000 && placed < 4000; tries++) {
      const r = 140 + Math.pow(rt(), 1.4) * 5200, a = rt() * Math.PI * 2;
      const x = Math.cos(a) * r, z = 30 + Math.sin(a) * r, y = H(x, z);
      if (y < 2.2 || y > 950) continue;
      if (Math.abs(H(x + 4, z) - y) + Math.abs(H(x, z + 4) - y) > 3.4) continue;
      if (z > 30 && Math.abs(x) < 400 && rt() < 0.85) continue;
      const s = 11 + rt() * 15;
      p3.set(x, y - 0.4, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rt() * 6.28); sc.set(s * 0.8, s, s * 0.8);
      m4.compose(p3, q, sc); trees.setMatrixAt(placed++, m4);
    }
    trees.count = placed; scene.add(trees);

    // lac sans vent : il reflète l'aurore
    const waterNormals = tileableNormalMap(256, { count: 60, kmin: 3, kmax: 40, decay: 0.85, pow: 1.2 }, 0.6, 3);
    const water = new Water(new THREE.CircleGeometry(1100, 96), {
      textureWidth: 512, textureHeight: 512, waterNormals, sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0x000000, waterColor: 0x02060c, distortionScale: 0.25, alpha: 1, fog: false
    });
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.05, -1030);
    water.material.uniforms.size.value = 0.8;
    // de nuit, pas de gris de fond : l'eau ne montre que ce qu'elle reflète
    water.material.fragmentShader = water.material.fragmentShader.replace('( vec3( 0.1 ) + reflectionSample * 0.9', '( reflectionSample * 0.95');
    scene.add(water);

    const moon = new THREE.DirectionalLight(0xa9bde6, 0.6); moon.position.set(-3, 2, 1); scene.add(moon);
    const glow = new THREE.HemisphereLight(0x4a9c84, 0x05070c, 0.24); scene.add(glow);
    const exp = {
      scene, viewpoint: new THREE.Vector3(0, H(0, 0) + 1.7, 0), yaw: 0, pitch: 6 * DEG, fov: 80, near: 0.2, far: 30000, exposure: 1.5,
      caption: 'Les aurores naissent quand les particules du Soleil frappent la haute atmosphère, vers 100 à 300 km d\'altitude.',
      update(dt) {
        auroraMat.uniforms.time.value += dt;
        water.material.uniforms.time.value += dt * 0.2;
        glow.intensity = 0.22 + 0.06 * Math.sin(auroraMat.uniforms.time.value * 0.13);
      },
      enter() { Sound.setAmbience(auroraAudio); },
      dispose() { disposeScene(scene); }
    };
    return exp;
  }
};
