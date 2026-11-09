/* ================= Océan au coucher du soleil ================= */
function woodTexture(seed) {
  return canvasTexture(512, 512, (c, W, H) => {
    const rnd = mulberry32(seed);
    c.fillStyle = '#7d6a55'; c.fillRect(0, 0, W, H);
    const planks = 8;
    for (let p = 0; p < planks; p++) {
      const y0 = p * H / planks;
      const tone = 0.82 + rnd() * 0.3;
      c.fillStyle = `rgb(${120 * tone | 0},${100 * tone | 0},${80 * tone | 0})`;
      c.fillRect(0, y0, W, H / planks);
      for (let i = 0; i < 26; i++) {
        const yy = y0 + rnd() * H / planks;
        c.strokeStyle = `rgba(${55 + rnd() * 30 | 0},${42 + rnd() * 20 | 0},${30 + rnd() * 15 | 0},${0.25 + rnd() * 0.35})`;
        c.lineWidth = 0.6 + rnd() * 1.6;
        c.beginPath(); c.moveTo(0, yy);
        for (let x = 0; x <= W; x += 32) c.lineTo(x, yy + Math.sin(x * 0.01 + rnd() * 6) * 1.5);
        c.stroke();
      }
      // usure grise du bois exposé au sel
      c.fillStyle = 'rgba(170,165,155,0.18)';
      for (let i = 0; i < 40; i++) c.fillRect(rnd() * W, y0 + rnd() * H / planks, 10 + rnd() * 60, 1 + rnd() * 2);
      c.fillStyle = 'rgba(20,14,10,0.85)';
      c.fillRect(0, y0, W, 2.5);
      for (const x of [W * 0.12, W * 0.88]) { c.beginPath(); c.arc(x, y0 + H / planks / 2, 3, 0, 7); c.fill(); }
    }
  }, { repeat: true });
}

function makeBird() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x15100e, side: THREE.DoubleSide, fog: false });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat);
  body.scale.set(1, 0.8, 3.2);
  g.add(body);
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.22, 0.95, 0.05, 0.12, 0.95, 0.05, 0.12, 0, 0, 0.22, 0.6, 0, 0.35], 3));
  wingGeo.computeVertexNormals();
  const L = new THREE.Mesh(wingGeo, mat), R = new THREE.Mesh(wingGeo, mat);
  R.scale.x = -1;
  g.add(L, R);
  g.userData.wings = [L, R];
  return g;
}

function oceanAudio(ctx, out) {
  const surf = noiseBand(ctx, out, 'brown', 'lowpass', 420, 0.6, 0.05);
  const hiss = noiseBand(ctx, out, 'pink', 'bandpass', 2400, 0.7, 0.0);
  const slosh = noiseBand(ctx, out, 'brown', 'bandpass', 260, 1.2, 0.0);
  const wind = noiseBand(ctx, out, 'pink', 'bandpass', 520, 0.35, 0.02);
  let t = 0, next = 0.5, nextSlosh = 1;
  return {
    update(dt) {
      t += dt;
      const now = ctx.currentTime;
      if (t >= next) {
        const dur = 4.5 + Math.random() * 3.5, peak = 0.22 + Math.random() * 0.3;
        surf.gain.gain.cancelScheduledValues(now);
        surf.gain.gain.setTargetAtTime(peak, now, dur * 0.22);
        surf.gain.gain.setTargetAtTime(0.05, now + dur * 0.45, dur * 0.3);
        surf.filter.frequency.cancelScheduledValues(now);
        surf.filter.frequency.setTargetAtTime(950, now, dur * 0.2);
        surf.filter.frequency.setTargetAtTime(360, now + dur * 0.4, dur * 0.35);
        hiss.gain.gain.setTargetAtTime(peak * 0.22, now + dur * 0.3, 0.5);
        hiss.gain.gain.setTargetAtTime(0.004, now + dur * 0.55, 1.1);
        next = t + dur * 0.8 + Math.random() * 2.5;
      }
      if (t >= nextSlosh) {
        slosh.gain.gain.setTargetAtTime(0.06 + Math.random() * 0.08, now, 0.15);
        slosh.gain.gain.setTargetAtTime(0.0, now + 0.35, 0.3);
        slosh.filter.frequency.setValueAtTime(200 + Math.random() * 160, now);
        nextSlosh = t + 1.2 + Math.random() * 2.2;
      }
      wind.gain.gain.setTargetAtTime(0.015 + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.13)), now, 1.5);
    },
    stop() { surf.stop(); hiss.stop(); slosh.stop(); wind.stop(); }
  };
}

EXPERIENCES.ocean = {
  title: 'Océan au coucher du soleil',
  async create() {
    const scene = new THREE.Scene();
    const st = { elev: 2.4, t: 0 };
    const sun = new THREE.Vector3();
    const sky = new Sky();
    sky.scale.setScalar(30000);
    const su = sky.material.uniforms;
    su.turbidity.value = 10; su.rayleigh.value = 2.9; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.9;
    // étalonnage chaud du ciel près de l'horizon, comme sur une photo de coucher de soleil
    sky.material.fragmentShader = sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', `
      float lumC = dot(retColor, vec3(0.299, 0.587, 0.114));
      retColor = mix(vec3(lumC), retColor, 1.45);
      float hzc = pow(1.0 - clamp(direction.y, 0.0, 1.0), 7.0);
      retColor *= mix(vec3(1.0), vec3(1.18, 0.86, 0.62), hzc * 0.85);
      retColor = max(retColor, 0.0);
      gl_FragColor = vec4( retColor, 1.0 );`);
    scene.add(sky);

    const waterNormals = tileableNormalMap(256, { count: 110, kmin: 3, kmax: 60, decay: 0.85, pow: 1.2 }, 2.2, 7);
    const water = new Water(new THREE.PlaneGeometry(60000, 60000), {
      textureWidth: 512, textureHeight: 512, waterNormals, sunDirection: new THREE.Vector3(),
      sunColor: 0xffb070, waterColor: 0x001520, distortionScale: 1.5, alpha: 1
    });
    water.rotation.x = -Math.PI / 2;
    water.material.uniforms.size.value = 2.6;
    scene.add(water);

    // couche de nuages éclairée par le soleil couchant
    const cloudMat = new THREE.ShaderMaterial({
      uniforms: { sunDir: { value: sun }, time: { value: 0 }, light: { value: 1 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */`
        uniform vec3 sunDir; uniform float time; uniform float light;
        varying vec3 vW;
        ${GLSL_NOISE}
        void main() {
          vec2 p = vW.xz;
          float d = length(p - cameraPosition.xz);
          vec2 q = p * 0.00019 + vec2(time * 0.0006, 0.0);
          float n = fbm2(q * vec2(1.0, 2.6), 7);
          float n2 = fbm2(q * 3.7 + 7.0, 5);
          float dens = smoothstep(0.52, 0.80, n * 0.78 + n2 * 0.32);
          vec3 V = normalize(vW - cameraPosition);
          float cs = max(dot(normalize(vec3(V.x, 0.0, V.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0);
          float low = clamp(1.0 - sunDir.y * 6.0, 0.0, 1.0);
          vec3 away = mix(vec3(0.40, 0.30, 0.38), vec3(0.30, 0.16, 0.24), low);
          vec3 nearS = mix(vec3(1.5, 0.95, 0.55), vec3(1.7, 0.55, 0.18), low);
          vec3 col = mix(away, nearS, pow(cs, 2.5));
          float edge = 1.0 - smoothstep(0.0, 0.35, dens);
          col += vec3(1.6, 0.85, 0.40) * edge * pow(cs, 10.0) * 1.6;
          col *= mix(1.0, 0.5, smoothstep(0.35, 1.0, dens));
          col *= light;
          float fade = 1.0 - smoothstep(9000.0, 26000.0, d);
          gl_FragColor = vec4(col, dens * fade * 0.94);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    const clouds = new THREE.Mesh(new THREE.PlaneGeometry(70000, 70000), cloudMat);
    clouds.rotation.x = -Math.PI / 2; clouds.position.y = 1700;
    scene.add(clouds);

    // jetée en bois : l'observateur se tient au bout
    const deckY = 2.3;
    const wood = woodTexture(4);
    const deckMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.88, metalness: 0 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 });
    const pier = new THREE.Group();
    const len = 90;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, len), deckMat);
    deck.position.set(0, deckY, len / 2 - 1.6);
    deck.material.map.repeat.set(1, len / 1.3);
    pier.add(deck);
    const postGeo = new THREE.CylinderGeometry(0.13, 0.15, 5.6, 10);
    for (let z = -1.5; z < len; z += 3.2) {
      for (const x of [-1.5, 1.5]) {
        const p = new THREE.Mesh(postGeo, postMat);
        p.position.set(x, deckY - 2.2, z);
        pier.add(p);
        if (z > 1) {
          const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.05, 0.1), postMat);
          r.position.set(x, deckY + 0.55, z);
          pier.add(r);
        }
      }
    }
    for (const x of [-1.5, 1.5]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, len - 3), deckMat);
      rail.position.set(x, deckY + 1.08, len / 2 + 0.2);
      pier.add(rail);
    }
    scene.add(pier);
    // plage et côte basse derrière l'observateur
    const shore = radialGrid(30, 9000, 90, 160, (x, z) => {
      const d = z - 95;
      if (d < 0) return -8;
      return -1.5 + Math.min(d * 0.05, 6) + Math.max(0, d - 250) * 0.02 + Math.sin(x * 0.004) * 3 * smoothstep(200, 900, d);
    });
    const sc = [];
    const pa = shore.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i), z = pa.getZ(i);
      const c = y < 1.5 ? new THREE.Color(0xb8a27c) : new THREE.Color(0x4f5a35).lerp(new THREE.Color(0x3a4428), clamp((z - 200) / 900, 0, 1));
      sc.push(c.r, c.g, c.b);
    }
    shore.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    const shoreMesh = new THREE.Mesh(shore, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    shoreMesh.position.z = 0;
    scene.add(shoreMesh);

    // disque du soleil et halo, rougis près de l'horizon
    const sunTex = canvasTexture(256, 256, (cx, W) => {
      const gr = cx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
      gr.addColorStop(0, 'rgba(255,240,205,1)'); gr.addColorStop(0.07, 'rgba(255,226,170,1)'); gr.addColorStop(0.085, 'rgba(255,170,80,0.55)');
      gr.addColorStop(0.25, 'rgba(255,130,50,0.16)'); gr.addColorStop(1, 'rgba(255,110,40,0)');
      cx.fillStyle = gr; cx.fillRect(0, 0, W, W);
    });
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sunSprite.scale.setScalar(20000 * 0.11);
    scene.add(sunSprite);
    const sunLight = new THREE.DirectionalLight(0xffb27a, 2.0);
    scene.add(sunLight);
    const hemi = new THREE.HemisphereLight(0x8a8fbf, 0x3a2a22, 0.65);
    scene.add(hemi);

    // oiseaux de mer qui planent au loin
    const birds = [];
    const rb = mulberry32(21);
    for (let i = 0; i < 7; i++) {
      const b = makeBird();
      b.userData.path = { r: 60 + rb() * 140, cx: (rb() - 0.5) * 300, cz: -120 - rb() * 300, h: 14 + rb() * 30, w: (rb() < 0.5 ? -1 : 1) * (0.05 + rb() * 0.05), ph: rb() * 6.28, flap: rb() * 6 };
      b.scale.setScalar(1.6);
      birds.push(b); scene.add(b);
    }
    let pmremRT = null;
    const exp = {
      scene, viewpoint: new THREE.Vector3(0, deckY + 1.62, 1.4), yaw: 0, pitch: 1.5 * DEG, fov: 70, near: 0.1, far: 80000, exposure: 0.32,
      caption: 'Face à l\'Atlantique, le soleil descend à sa vitesse réelle : environ un quart de degré par minute.',
      st,
      setSun(elev) {
        st.elev = elev;
        sun.setFromSphericalCoords(1, (90 - elev) * DEG, 186 * DEG);
        su.sunPosition.value.copy(sun);
        water.material.uniforms.sunDirection.value.copy(sun);
        sunLight.position.copy(sun).multiplyScalar(100);
        const k = smoothstep(-5, 3, elev);
        sunLight.intensity = 2.0 * smoothstep(-0.8, 1.5, elev);
        sunLight.color.setRGB(1.0, lerp(0.42, 0.66, k), lerp(0.22, 0.42, k));
        hemi.intensity = lerp(0.18, 0.65, k);
        cloudMat.uniforms.light.value = lerp(0.35, 1.0, smoothstep(-5, 1, elev));
        renderer.toneMappingExposure = lerp(0.62, 0.3, k);
        sunSprite.position.copy(sun).multiplyScalar(20000);
        sunSprite.material.opacity = smoothstep(-0.6, 0.4, elev);
        exp.exposure = renderer.toneMappingExposure;
      },
      updateEnv() {
        // reflets du ciel sur le bois de la jetée
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
        water.material.uniforms.time.value += dt * 0.55;
        cloudMat.uniforms.time.value += dt;
        // coucher réel : 0,25 degré par minute environ
        const e = st.elev - dt * 0.25 / 60;
        if (e > -6) this.setSun(e);
        if (Math.floor(st.t / 30) !== Math.floor((st.t - dt) / 30)) this.updateEnv();
        for (const b of birds) {
          const p = b.userData.path;
          p.ph += dt * p.w;
          b.position.set(p.cx + Math.cos(p.ph) * p.r, p.h + Math.sin(p.ph * 2.3) * 2, p.cz + Math.sin(p.ph) * p.r);
          b.rotation.y = -p.ph - (p.w > 0 ? 0 : Math.PI);
          p.flap += dt;
          const glide = (Math.sin(p.flap * 0.35) > 0.2);
          const a = glide ? 0.12 : Math.sin(p.flap * 7) * 0.55;
          b.userData.wings[0].rotation.z = a; b.userData.wings[1].rotation.z = -a;
        }
      },
      enter() { Sound.setAmbience(oceanAudio); },
      dispose() { if (pmremRT) pmremRT.dispose(); disposeScene(scene); }
    };
    exp.setSun(2.4);
    exp.updateEnv();
    return exp;
  }
};
