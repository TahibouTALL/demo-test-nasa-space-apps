/* ================= Lac Rose au coucher du soleil (Sénégal) =================
   Le lac Retba, à une trentaine de kilomètres de Dakar : une eau très salée que des micro-algues
   colorent en rose, des tas de sel blanc sur la rive et les pirogues peintes des récolteurs. */

// pirogue sénégalaise : coque longue et étroite, proues très relevées terminées en bec,
// flancs peints en bandes (liseré jaune, motifs, bas sombre), intérieur en bois brut
function pirogueTexture(seed) {
  return canvasTexture(1024, 256, (c, W, H) => {
    const rnd = mulberry32(seed);
    const pal = [['#1f5fb0', '#f2c230', '#d8352a'], ['#2e8b57', '#f4d03f', '#c0392b'], ['#e9ecef', '#1f5fb0', '#d8352a'], ['#f2c230', '#1d3f8f', '#2e8b57']][seed % 4];
    // v = 0 et v = 1 : plat-bord ; v = 0,5 : quille. La peinture est symétrique.
    const band = (v0, v1, col) => { c.fillStyle = col; c.fillRect(0, v0 * H, W, (v1 - v0) * H); c.fillRect(0, (1 - v1) * H, W, (v1 - v0) * H); };
    band(0, 0.5, '#2a2a2e');
    band(0, 0.05, pal[1]);
    band(0.05, 0.2, pal[0]);
    band(0.2, 0.235, '#f4f1e8');
    band(0.235, 0.33, pal[2]);
    // motifs : triangles et losanges répétés le long de la coque
    for (const mid of [0.125, 0.875]) {
      for (let x = 10; x < W; x += 34 + Math.floor(rnd() * 3) * 6) {
        c.fillStyle = rnd() < 0.5 ? pal[1] : '#f4f1e8';
        c.beginPath(); c.moveTo(x, mid * H - 11); c.lineTo(x + 11, mid * H); c.lineTo(x, mid * H + 11); c.lineTo(x - 11, mid * H); c.closePath(); c.fill();
      }
    }
    // usure : traînées claires et éclats
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(255,255,255,${rnd() * 0.1})`; c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 6, 1); }
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(60,40,25,${rnd() * 0.25})`; c.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 4, 1 + rnd() * 2); }
  });
}
function makePirogue(seed, len = 11) {
  const g = new THREE.Group();
  const n = 48, m = 12;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = (u - 0.5) * len, e = Math.abs(u - 0.5) * 2;
    const w = Math.pow(Math.sin(Math.PI * u), 0.55) * 0.72;
    const sheer = 0.62 + 1.25 * Math.pow(e, 3.2);          // plat-bord qui remonte fort aux extrémités
    const depth = 0.62 * Math.pow(Math.sin(Math.PI * u), 0.35);
    for (let j = 0; j <= m; j++) {
      const v = j / m, a = Math.PI * v;
      const y = sheer - depth * Math.pow(Math.sin(a), 0.8);
      pos.push(x, y, Math.cos(a) * w);
      uv.push(u * 3, v);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = i * (m + 1) + j, b = a + m + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const tex = pirogueTexture(seed); tex.wrapS = THREE.RepeatWrapping;
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, side: THREE.FrontSide })));
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6e5641, roughness: 0.95, side: THREE.BackSide })));
  // proues en bec, prolongées et relevées
  for (const sd of [-1, 1]) {
    const tip = new THREE.Vector3(sd * len * 0.5, 0.62 + 1.25, 0);
    const curve = new THREE.QuadraticBezierCurve3(tip.clone().add(new THREE.Vector3(-sd * 0.4, -0.25, 0)), tip.clone().add(new THREE.Vector3(sd * 0.3, 0.12, 0)), tip.clone().add(new THREE.Vector3(sd * 0.95, 0.05, 0)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.07, 6), new THREE.MeshStandardMaterial({ color: sd > 0 ? 0xd8352a : 0xf2c230, roughness: 0.7 })));
  }
  // plat-bord sombre et bancs
  for (const x of [-len * 0.22, 0, len * 0.22]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 1.25), new THREE.MeshStandardMaterial({ color: 0x5b4532, roughness: 0.9 })); b.position.set(x, 0.5, 0); g.add(b); }
  return g;
}
// tas de sel récolté sur la rive : cône irrégulier, sommet arrondi, base salie de sable
function saltHeap(r, h, seed) {
  const geo = new THREE.ConeGeometry(r, h, 36, 10, false);
  const rnd = mulberry32(seed), p = geo.attributes.position;
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), k = (y + h / 2) / h, a = Math.atan2(p.getZ(i), p.getX(i));
    const lump = 1 + 0.09 * Math.sin(a * 3 + ph[0]) * (1 - k) + 0.05 * Math.sin(a * 7 + ph[1] + k * 4) * (1 - k) + (rnd() - 0.5) * 0.06 * (1 - k);
    const round = k > 0.8 ? 1 + (k - 0.8) * 1.6 : 1;   // sommet arrondi
    p.setX(i, p.getX(i) * lump * round); p.setZ(i, p.getZ(i) * lump * round);
    p.setY(i, (y + h / 2) * (k > 0.8 ? 1 - (k - 0.8) * 0.35 : 1) + Math.sin(a * 5 + ph[2]) * 0.03 * (1 - k));
    const dirt = 1 - Math.min(1, k * 4);
    const c = new THREE.Color(0xf4f0ea).lerp(new THREE.Color(0xd9c9bd), 0.25 + 0.25 * Math.sin(a * 4 + ph[0] + k * 3)).lerp(new THREE.Color(0xa88a70), dirt * 0.55);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
}
// palmier en silhouette
function makePalm(seed, h = 11) {
  const g = new THREE.Group();
  const rnd = mulberry32(seed);
  const lean = (rnd() - 0.5) * 0.5;
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(Math.sin(t * 1.2) * lean * h * 0.25, t * h, 0)); }
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 1 }));
  g.add(trunk);
  const top = pts[10];
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2f4a24, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2 + rnd() * 0.3;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9, 6, 1), frondMat);
    const p = f.geometry.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k) + 2.1; p.setX(k, x); p.setY(k, p.getY(k) * (1 - x / 4.6) - x * x * 0.08); }
    f.geometry.computeVertexNormals();
    f.position.copy(top); f.rotation.set(0, a, -0.25 - rnd() * 0.35);
    g.add(f);
  }
  return g;
}

function lacRoseAudio(ctx, out) {
  const lap = noiseBand(ctx, out, 'brown', 'lowpass', 320, 0.7, 0.0);
  const wind = noiseBand(ctx, out, 'pink', 'bandpass', 700, 0.4, 0.018);
  const air = noiseBand(ctx, out, 'pink', 'lowpass', 300, 0.5, 0.02);
  let t = 0, nextLap = 0.4, nextBird = 2.5;
  return {
    update(dt) {
      t += dt;
      const now = ctx.currentTime;
      if (t > nextLap) { lap.gain.gain.setTargetAtTime(0.07 + Math.random() * 0.08, now, 0.15); lap.gain.gain.setTargetAtTime(0.012, now + 0.5, 0.6); nextLap = t + 1.8 + Math.random() * 2.4; }
      if (t > nextBird) { birdSong(ctx, out, now + 0.05, (Math.random() - 0.5) * 1.6); nextBird = t + 5 + Math.random() * 9; }
    },
    stop() { lap.stop(); wind.stop(); air.stop(); }
  };
}

EXPERIENCES.lacrose = {
  title: 'Lac Rose au coucher du soleil',
  async create() {
    const scene = new THREE.Scene();
    const st = { elev: 4.5, t: 0 };
    const sun = new THREE.Vector3();
    const sky = new Sky();
    sky.scale.setScalar(30000);
    const su = sky.material.uniforms;
    su.turbidity.value = 12; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.007; su.mieDirectionalG.value = 0.88;
    sky.material.fragmentShader = sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', `
      float lumC = dot(retColor, vec3(0.299, 0.587, 0.114));
      retColor = mix(vec3(lumC), retColor, 1.35);
      float hzc = pow(1.0 - clamp(direction.y, 0.0, 1.0), 6.0);
      retColor *= mix(vec3(1.0), vec3(1.2, 0.84, 0.72), hzc * 0.8);
      retColor = max(retColor, 0.0);
      gl_FragColor = vec4( retColor, 1.0 );`);
    scene.add(sky);

    // eau rose : très salée, presque sans vagues
    const waterNormals = tileableNormalMap(256, { count: 90, kmin: 4, kmax: 70, decay: 0.85, pow: 1.2 }, 1.4, 11);
    const LZ = -2606, LR = 2600;   // le lac commence 6 m devant l'observateur
    const water = new Water(new THREE.CircleGeometry(LR, 128), {
      textureWidth: 512, textureHeight: 512, waterNormals, sunDirection: new THREE.Vector3(),
      sunColor: 0xffc2a0, waterColor: 0x9a3556, distortionScale: 0.55, alpha: 1
    });
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0, LZ);
    water.material.uniforms.size.value = 1.6;
    // la couleur rose du lac vient surtout de l'eau elle-même, pas seulement des reflets
    water.material.fragmentShader = water.material.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, alpha );', `
      outgoingLight = mix(outgoingLight, outgoingLight * vec3(1.32, 0.7, 0.84) + vec3(0.09, 0.012, 0.045), 0.78);
      gl_FragColor = vec4( outgoingLight, alpha );`);
    scene.add(water);

    // rive de sable, dunes basses autour du lac
    const ground = radialGrid(1.5, 12000, 130, 180, (x, z) => {
      const dz = z - LZ, r = Math.sqrt(x * x + dz * dz);
      if (r < LR - 3) return -1.2;
      const k = r - LR;
      return -0.35 + Math.min(Math.max(k, 0) * 0.045, 1.6) + Math.max(0, k - 60) * 0.01 + (Math.sin(x * 0.006) + Math.sin(z * 0.005 + 1)) * 7 * smoothstep(250, 1600, k) + Math.sin(x * 1.7 + z * 0.4) * Math.sin(z * 1.3 - x * 0.2) * 0.03;
    });
    // la rive où se tient l'observateur : bande de sable devant lui
    const pa = ground.attributes.position, gc = [];
    for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i), x = pa.getX(i), z = pa.getZ(i);
      const dz = z - LZ, r = Math.sqrt(x * x + dz * dz);
      const sand = new THREE.Color(0xf0cfa2), wet = new THREE.Color(0xb88a78), far = new THREE.Color(0xdab48a);
      const c = r < LR + 2.5 ? wet : sand.clone().lerp(far, clamp((r - LR - 200) / 3000, 0, 1));
      if (y > 6) c.lerp(new THREE.Color(0x8b8a5a), 0.25);
      gc.push(c.r, c.g, c.b);
    }
    ground.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
    const sandMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 });
    sandMat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\n' + GLSL_NOISE)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec2 q = vWp.xz;
          float rip = sin(q.x * 3.1 + fbm2(q * 0.6, 2) * 6.0) * 0.5 + 0.5;
          float n = fbm2(q * 0.35, 3), f = fbm2(q * 4.0, 2);
          diffuseColor.rgb *= 0.86 + 0.1 * rip + 0.12 * (n - 0.5) + 0.1 * (f - 0.5);
          float shore = 1.0 - smoothstep(-6.5, 1.5, vWp.z + (n - 0.5) * 3.0);
          float crust = smoothstep(0.58, 0.7, fbm2(q * 0.5 + 3.0, 3)) * smoothstep(-7.0, -2.0, vWp.z) * (1.0 - smoothstep(-1.0, 6.0, vWp.z));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.9, 0.88), crust * 0.75);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.62, 0.62), shore * 0.6);`);
    };
    const groundMesh = new THREE.Mesh(ground, sandMat);
    scene.add(groundMesh);

    // nuages éclairés par le soleil couchant
    const cloudMat = new THREE.ShaderMaterial({
      uniforms: { sunDir: { value: sun }, time: { value: 0 }, light: { value: 1 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */`
        uniform vec3 sunDir; uniform float time; uniform float light;
        varying vec3 vW;
        ${GLSL_NOISE}
        void main() {
          vec2 p = vW.xz; float d = length(p - cameraPosition.xz);
          vec2 q = p * 0.00016 + vec2(time * 0.0005, 0.0);
          float n = fbm2(q * vec2(1.0, 3.2), 7), n2 = fbm2(q * 3.1 + 5.0, 5);
          float dens = smoothstep(0.58, 0.84, n * 0.8 + n2 * 0.3);
          vec3 V = normalize(vW - cameraPosition);
          float cs = max(dot(normalize(vec3(V.x, 0.0, V.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0);
          vec3 col = mix(vec3(0.62, 0.42, 0.52), vec3(1.7, 0.85, 0.55), pow(cs, 2.2));
          col += vec3(1.5, 0.75, 0.45) * (1.0 - smoothstep(0.0, 0.35, dens)) * pow(cs, 9.0);
          col *= mix(1.0, 0.55, smoothstep(0.35, 1.0, dens)) * light;
          gl_FragColor = vec4(col, dens * (1.0 - smoothstep(8000.0, 24000.0, d)) * 0.9);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    const clouds = new THREE.Mesh(new THREE.PlaneGeometry(70000, 70000), cloudMat);
    clouds.rotation.x = -Math.PI / 2; clouds.position.y = 1900;
    scene.add(clouds);

    // tas de sel en rangée le long de la rive (à gauche), pirogues tirées sur le sable ou à l'eau
    const props = new THREE.Group();
    const rs = mulberry32(31);
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const h = saltHeap(1.3 + rs() * 0.9, 1.25 + rs() * 0.8, i * 7 + 3);
      h.position.set(-6 - t * 78 + rs() * 1.5, -0.3, -2.4 + rs() * 1.6 + t * 1.5);
      props.add(h);
    }
    for (let i = 0; i < 6; i++) {
      const h = saltHeap(1.0 + rs() * 0.8, 1.0 + rs() * 0.7, 100 + i);
      h.position.set(26 + i * 5.5 + rs() * 2, -0.3, -3 + rs() * 1.5);
      props.add(h);
    }
    const piro = [[-7.5, -4.3, 0.25, 1, 0], [3.5, -11, 0.5, 2, 1], [-12, -17, -0.35, 3, 1], [16, -26, 0.9, 4, 1], [-2, -48, 0.3, 5, 1], [30, -80, -0.4, 6, 1], [-40, -9, 0.1, 7, 1]];
    for (const [x, z, ry, sd, fl] of piro) {
      const p = makePirogue(sd, 10 + (sd % 3) * 1.5); p.position.set(x, fl ? -0.66 : -0.32, z); p.rotation.y = ry;
      if (fl) p.userData.float = true;
      props.add(p);
    }
    for (const [x, z, h, sd] of [[-60, 120, 12, 1], [-48, 140, 10, 2], [70, 160, 13, 3], [-420, -3600, 14, 4], [-380, -3650, 12, 5], [500, -3500, 13, 6], [900, -3400, 11, 7]]) {
      const p = makePalm(sd, h); p.position.set(x, z < 0 ? 1 : -0.3, z); props.add(p);
    }
    scene.add(props);

    const sunTex = canvasTexture(256, 256, (cx, W) => {
      const gr = cx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
      gr.addColorStop(0, 'rgba(255,240,215,1)'); gr.addColorStop(0.07, 'rgba(255,220,170,1)'); gr.addColorStop(0.085, 'rgba(255,165,95,0.55)');
      gr.addColorStop(0.25, 'rgba(255,125,80,0.16)'); gr.addColorStop(1, 'rgba(255,110,70,0)');
      cx.fillStyle = gr; cx.fillRect(0, 0, W, W);
    });
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sunSprite.scale.setScalar(2000);
    scene.add(sunSprite);
    const sunLight = new THREE.DirectionalLight(0xffb27a, 2.0);
    scene.add(sunLight);
    const hemi = new THREE.HemisphereLight(0xb8a0c8, 0x7a5040, 0.95);
    scene.add(hemi);
    scene.fog = new THREE.Fog(0xd8a49a, 2500, 14000);

    // sternes au-dessus du lac
    const birds = [];
    const rb = mulberry32(44);
    for (let i = 0; i < 6; i++) {
      const b = makeBird();
      b.userData.path = { r: 40 + rb() * 120, cx: (rb() - 0.5) * 200, cz: -150 - rb() * 250, h: 10 + rb() * 22, w: (rb() < 0.5 ? -1 : 1) * (0.05 + rb() * 0.06), ph: rb() * 6.28, flap: rb() * 6 };
      b.scale.setScalar(1.2); birds.push(b); scene.add(b);
    }
    let pmremRT = null;
    const exp = {
      scene, viewpoint: new THREE.Vector3(0, 1.65, 4), yaw: 30 * DEG, pitch: -1 * DEG, fov: 70, near: 0.1, far: 80000, exposure: 0.34,
      caption: 'Le lac Retba, près de Dakar : son eau, dix fois plus salée que la mer, est colorée en rose par une micro-algue.',
      st,
      setSun(elev) {
        st.elev = elev;
        sun.setFromSphericalCoords(1, (90 - elev) * DEG, 192 * DEG);
        su.sunPosition.value.copy(sun);
        water.material.uniforms.sunDirection.value.copy(sun);
        sunLight.position.copy(sun).multiplyScalar(100);
        const k = smoothstep(-5, 4, elev);
        sunLight.intensity = 2.1 * smoothstep(-0.8, 1.5, elev);
        sunLight.color.setRGB(1.0, lerp(0.48, 0.7, k), lerp(0.32, 0.5, k));
        hemi.intensity = lerp(0.25, 0.95, k);
        cloudMat.uniforms.light.value = lerp(0.35, 1.0, smoothstep(-5, 1, elev));
        renderer.toneMappingExposure = lerp(0.6, 0.32, k);
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
        water.material.uniforms.time.value += dt * 0.3;
        cloudMat.uniforms.time.value += dt;
        const e = st.elev - dt * 0.25 / 60;
        if (e > -6) this.setSun(e);
        if (Math.floor(st.t / 30) !== Math.floor((st.t - dt) / 30)) this.updateEnv();
        props.children.forEach((o, i) => { if (o.userData.float) { o.position.y = -0.66 + Math.sin(st.t * 0.8 + i) * 0.04; o.rotation.z = Math.sin(st.t * 0.6 + i) * 0.015; } });
        for (const b of birds) {
          const p = b.userData.path;
          p.ph += dt * p.w;
          b.position.set(p.cx + Math.cos(p.ph) * p.r, p.h + Math.sin(p.ph * 2.3) * 2, p.cz + Math.sin(p.ph) * p.r);
          b.rotation.y = -p.ph - (p.w > 0 ? 0 : Math.PI);
          p.flap += dt;
          const a = Math.sin(p.flap * 0.4) > 0.3 ? 0.1 : Math.sin(p.flap * 8) * 0.55;
          b.userData.wings[0].rotation.z = a; b.userData.wings[1].rotation.z = -a;
        }
      },
      enter() { Sound.setAmbience(lacRoseAudio); },
      dispose() { if (pmremRT) pmremRT.dispose(); disposeScene(scene); }
    };
    exp.setSun(4.5);
    exp.updateEnv();
    return exp;
  }
};
