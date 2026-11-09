/* ================= Désert de Lompoul la nuit ================= */
const LOMPOUL = { lat: 15.42, lon: -16.70 };
function gmstRad(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const g = 280.46061837 + 360.98564736629 * (jd - 2451545.0);
  return ((g % 360) + 360) % 360 * DEG;
}
// équatorial (x vers le point vernal, z vers le pôle nord céleste) vers la scène (x est, y zénith, -z nord)
function equatorialToScene(latDeg, lst) {
  const p = latDeg * DEG, cp = Math.cos(p), sp = Math.sin(p);
  const A = new THREE.Matrix4().set(0, 1, 0, 0, cp, 0, sp, 0, sp, 0, -cp, 0, 0, 0, 0, 1);
  const Rz = new THREE.Matrix4().set(Math.cos(lst), Math.sin(lst), 0, 0, -Math.sin(lst), Math.cos(lst), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  return A.multiply(Rz);
}
function altAzVec(altDeg, azDeg) {
  const a = altDeg * DEG, z = azDeg * DEG;
  return new THREE.Vector3(Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z));
}

function desertAudio(ctx, out) {
  const wind = noiseBand(ctx, out, 'pink', 'bandpass', 520, 0.45, 0.035);
  const whistle = noiseBand(ctx, out, 'white', 'bandpass', 1350, 9, 0.0);
  const low = noiseBand(ctx, out, 'brown', 'lowpass', 160, 0.5, 0.05);
  const crickets = [];
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 4300 + i * 380 + Math.random() * 100;
    g.gain.value = 0;
    let node = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = [-0.7, 0.2, 0.8][i]; g.connect(p); node = p; }
    o.connect(g); node.connect(out); o.start();
    crickets.push({ o, g, next: Math.random() * 2, rate: 0.55 + Math.random() * 0.5, vol: 0.006 + Math.random() * 0.006 });
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      const now = ctx.currentTime;
      const gust = 0.5 + 0.5 * Math.sin(t * 0.11) * Math.sin(t * 0.037 + 1.3);
      wind.gain.gain.setTargetAtTime(0.02 + 0.05 * gust, now, 1.5);
      wind.filter.frequency.setTargetAtTime(380 + 520 * gust, now, 2);
      whistle.gain.gain.setTargetAtTime(0.004 * gust * gust, now, 2);
      for (const c of crickets) {
        if (t >= c.next) {
          const t0 = now + 0.02;
          for (let k = 0; k < 3; k++) { c.g.gain.setValueAtTime(c.vol, t0 + k * 0.045); c.g.gain.setValueAtTime(0, t0 + k * 0.045 + 0.017); }
          c.next = t + c.rate * (0.85 + Math.random() * 0.3) + (Math.random() < 0.08 ? 3 + Math.random() * 4 : 0);
        }
      }
    },
    stop() { wind.stop(); whistle.stop(); low.stop(); crickets.forEach(c => { try { c.o.stop(); } catch (e) { /* rien */ } }); }
  };
}

function tentGeometry(w, d, hWall, hRoof) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hWall); s.lineTo(w * 0.15, hWall + hRoof); s.lineTo(-w * 0.15, hWall + hRoof); s.lineTo(-w / 2, hWall); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

EXPERIENCES.desert = {
  title: 'Désert de Lompoul la nuit',
  async create() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070b, 0.00011);
    const noise = new SimplexNoise({ random: mulberry32(41) });
    const camp = { x: -72, z: 104 };
    const wa = 0.35, wx = Math.cos(wa), wz = Math.sin(wa);
    const raw = (x, z) => {
      const u = x * wx + z * wz, v = -x * wz + z * wx;
      const warp = noise.noise(x * 0.0018, z * 0.0018) * 0.55 + noise.noise(x * 0.006, z * 0.006) * 0.12;
      const ph = u / 135 + warp + v * 0.0007;
      const f = ph - Math.floor(ph);
      const prof = f < 0.76 ? Math.pow(smoothstep(0, 0.76, f), 1.25) : 1 - smoothstep(0.76, 1.0, f);
      const amp = 14 + 10 * noise.noise(x * 0.0011 + 3, z * 0.0011);
      let h = amp * prof;
      const ph2 = (x * 0.6 - z * 0.8) / 55 + noise.noise(x * 0.004 + 9, z * 0.004) * 0.4;
      const f2 = ph2 - Math.floor(ph2);
      h += 2.4 * (f2 < 0.7 ? smoothstep(0, 0.7, f2) : 1 - smoothstep(0.7, 1, f2));
      h += 18 * noise.noise(x * 0.0006, z * 0.0006);
      h += 16 * Math.exp(-(x * x + z * z) / (2 * 50 * 50));
      return h;
    };
    // place le campement là où on le voit depuis la crête (visée le long du terrain)
    const eye = raw(0, 0) + 1.65;
    let best = null;
    for (let az = 196; az <= 240 && !best; az += 4) {
      for (let dist = 85; dist <= 220; dist += 15) {
        const x = Math.sin(az * DEG) * dist, z = -Math.cos(az * DEG) * dist;
        const target = Math.atan2(raw(x, z) + 2.5 - eye, dist);
        let ok = true;
        for (let k = 1; k < 40; k++) {
          const f = k / 40, d = dist * f;
          if (Math.atan2(raw(x * f, z * f) - eye, d) > target - 0.004) { ok = false; break; }
        }
        if (ok) { best = { x, z }; break; }
      }
    }
    if (best) { camp.x = best.x; camp.z = best.z; }
    const campLevel = raw(camp.x, camp.z) + 0.5;
    const H = (x, z) => {
      const dc = (x - camp.x) ** 2 + (z - camp.z) ** 2;
      return lerp(raw(x, z), campLevel, Math.exp(-dc / (2 * 38 * 38)));
    };
    const geo = radialGrid(0.8, 9000, 170, 520, H);
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    const uv = new Float32Array(pos.count * 2), cols = new Float32Array(pos.count * 3);
    const cA = new THREE.Color(0xc98a52), cB = new THREE.Color(0xb7703f), cC = new THREE.Color(0xd6a06a), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      uv[i * 2] = x / 1.3; uv[i * 2 + 1] = z / 1.3;
      const n = noise.noise(x * 0.01, z * 0.01);
      c.copy(cA).lerp(n > 0 ? cC : cB, Math.abs(n) * 0.8);
      c.lerp(cB, smoothstep(0.93, 0.75, nor.getY(i)) * 0.5);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const ripples = tileableNormalMap(256, { count: 30, kmin: 5, kmax: 12, dir: 0.35, spread: 0.6, decay: 1.0 }, 1.4, 9);
    const sand = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, normalMap: ripples, normalScale: new THREE.Vector2(0.28, 0.28) });
    sand.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>',
        THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * (1.0 - smoothstep(2.0, 14.0, length(vViewPosition)));'));
    };
    const dunes = new THREE.Mesh(geo, sand);
    dunes.receiveShadow = true; dunes.castShadow = true;
    scene.add(dunes);

    // ciel : date choisie pour placer étoiles et Voie lactée (nuit de septembre, 21 h 30 heure de Dakar)
    const when = new Date(Date.UTC(2026, 8, 12, 21, 30, 0));
    const lst = gmstRad(when) + LOMPOUL.lon * DEG;
    const eq2s = equatorialToScene(LOMPOUL.lat, lst);
    const m3 = new THREE.Matrix3().setFromMatrix4(eq2s);
    const s2eq = m3.clone().transpose();
    const G = new THREE.Matrix3().set(...GAL_X, ...GAL_Y, ...GAL_Z);
    const toGal = G.clone().multiply(s2eq);
    const moonDir = altAzVec(9, 255);
    const sunDir = altAzVec(-28, 282);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: { toGal: { value: toGal }, moonDir: { value: moonDir }, sunDir: { value: sunDir }, time: { value: 0 } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: /* glsl */`
        uniform mat3 toGal; uniform vec3 moonDir; uniform vec3 sunDir; uniform float time;
        varying vec3 vDir;
        ${GLSL_NOISE}
        float fbm3(vec3 p, int o) { float s = 0.0, a = 0.5; for (int i = 0; i < 8; i++) { if (i >= o) break; s += a * snoise(p); p = p * 2.02 + 1.7; a *= 0.5; } return s; }
        void main() {
          vec3 d = normalize(vDir);
          float alt = d.y;
          float hz = pow(1.0 - clamp(alt, 0.0, 1.0), 5.0);
          vec3 col = vec3(0.00055, 0.0008, 0.0018) + vec3(0.0026, 0.0036, 0.0030) * hz;
          float sw = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0);
          col += vec3(0.004, 0.0024, 0.0016) * pow(sw, 5.0) * hz;
          vec3 g = toGal * d;
          float b = asin(clamp(g.z, -1.0, 1.0));
          float l = atan(g.y, g.x);
          float bd = degrees(b), ldg = degrees(l);
          float width = mix(7.0, 15.0, exp(-pow(ldg / 55.0, 2.0)));
          float band = exp(-pow(bd / width, 2.0));
          float bulge = exp(-pow(ldg / 16.0, 2.0) - pow(bd / 8.0, 2.0));
          float clouds = 0.62 + 0.6 * (fbm3(g * 7.0, 5) * 0.5 + 0.5);
          float fine = fbm3(g * 30.0 + 4.0, 4) * 0.5 + 0.5;
          float rift = exp(-pow((bd - 1.2) / 2.6, 2.0)) * (1.0 - smoothstep(10.0, 75.0, abs(ldg - 35.0)));
          float dust = smoothstep(0.50, 0.80, fbm3(g * 11.0 + 2.0, 5) * 0.5 + 0.5 + 0.35 * rift);
          float mw = (band * clouds * (0.6 + 0.8 * fine) + bulge * 1.7) * (1.0 - 0.82 * dust);
          vec3 mwCol = mix(vec3(0.70, 0.77, 0.96), vec3(1.0, 0.86, 0.66), clamp(bulge * 1.6, 0.0, 1.0));
          float ext = smoothstep(-0.02, 0.4, alt);
          col += mwCol * mw * 0.0095 * ext;
          float cm = dot(d, moonDir);
          float ang = acos(clamp(cm, -1.0, 1.0));
          const float rm = 0.0052;
          if (ang < rm * 1.3) {
            vec3 rgt = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0)));
            vec3 upm = cross(rgt, moonDir);
            vec3 off = d - moonDir * cm;
            vec2 q = vec2(dot(off, rgt), dot(off, upm)) / rm;
            float r2 = dot(q, q);
            if (r2 < 1.0) {
              vec3 n = q.x * rgt + q.y * upm - sqrt(1.0 - r2) * moonDir;
              float lit = smoothstep(-0.03, 0.07, dot(n, sunDir));
              float mare = 0.82 + 0.18 * snoise(vec3(q * 2.6, 3.0));
              vec3 moon = vec3(1.0, 0.96, 0.88) * (lit * 1.6 * mare + 0.010 * mare);
              col = mix(col, moon, 1.0 - smoothstep(0.90, 1.0, r2));
            }
          }
          col += vec3(0.85, 0.88, 1.0) * 0.0035 * exp(-ang / 0.05) + vec3(0.6, 0.65, 0.8) * 0.0005 * exp(-ang / 0.35);
          col *= ext * 0.85 + 0.15;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(12000, 64, 32), skyMat);
    skyDome.renderOrder = -2;
    scene.add(skyDome);
    const cat = makeStarCatalog(23, 11000);
    const stars = makeStarPoints(cat, { horizon: true, magLimit: 6.3 });
    stars.scale.setScalar(11000);
    stars.matrixAutoUpdate = false;
    stars.matrix.copy(eq2s).scale(new THREE.Vector3(11000, 11000, 11000));
    stars.renderOrder = -1;
    stars.material.uniforms.intensity.value = 2.0;
    scene.add(stars);

    // étoiles filantes
    const metMat = new THREE.ShaderMaterial({
      uniforms: { k: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float k; varying vec2 vUv; void main(){ float a = smoothstep(0.0, 1.0, vUv.x) * (1.0 - abs(vUv.y - 0.5) * 2.0); gl_FragColor = vec4(vec3(0.9, 0.95, 1.0) * a * a * k * 2.5, 1.0); }',
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: false
    });
    const meteor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), metMat);
    meteor.visible = false; meteor.renderOrder = 0;
    scene.add(meteor);

    // campement de tentes mauritaniennes et feu de camp
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d2, roughness: 1, emissive: 0x5a3414, emissiveIntensity: 0.6 });
    const doorMat = new THREE.MeshBasicMaterial({ color: 0xffb05a });
    const campG = new THREE.Group();
    const rc = mulberry32(77);
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + i * 0.42 + rc() * 0.1, r = 22 + rc() * 6;
      const t = new THREE.Mesh(tentGeometry(5.2, 4.2, 1.9, 0.9), tentMat);
      const x = camp.x + Math.cos(a) * r, z = camp.z + Math.sin(a) * r;
      t.position.set(x, H(x, z) - 0.1, z);
      t.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      t.castShadow = true;
      campG.add(t);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), doorMat);
      door.position.set(0, 0.75, 2.11);
      t.add(door);
    }
    const fireY = H(camp.x, camp.z);
    const fireLight = new THREE.PointLight(0xff8a3a, 900, 120, 2);
    fireLight.position.set(camp.x, fireY + 1.4, camp.z);
    fireLight.castShadow = false;
    campG.add(fireLight);
    const fireMat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`
        uniform float t; varying vec2 vUv;
        ${GLSL_NOISE}
        void main() {
          vec2 p = vUv - vec2(0.5, 0.0);
          float n = fbm2(vec2(p.x * 5.0, p.y * 3.0 - t * 2.2), 4);
          float shape = (1.0 - smoothstep(0.0, 0.5, abs(p.x) * (1.6 + p.y * 2.5))) * (1.0 - smoothstep(0.2, 0.95, p.y + n * 0.35));
          vec3 c = mix(vec3(1.8, 0.45, 0.08), vec3(2.6, 1.6, 0.6), shape) * shape * 3.0;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, transparent: true
    });
    for (let k = 0; k < 3; k++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), fireMat);
      f.position.set(camp.x, fireY + 1.0, camp.z); f.rotation.y = k * Math.PI / 3;
      campG.add(f);
    }
    const glowMat = new THREE.SpriteMaterial({ color: 0xff9a4a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
      map: canvasTexture(128, 128, (cx, W) => { const gr = cx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,200,140,1)'); gr.addColorStop(0.3, 'rgba(255,140,60,0.35)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, W, W); }) });
    const glow = new THREE.Sprite(glowMat); glow.scale.setScalar(14); glow.position.set(camp.x, fireY + 1.2, camp.z);
    campG.add(glow);
    scene.add(campG);

    // lumières : lune basse, ciel nocturne
    const moonLight = new THREE.DirectionalLight(0xa8b8ff, 0.95);
    moonLight.position.copy(moonDir).multiplyScalar(3000);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    const msc = moonLight.shadow.camera;
    msc.left = -1400; msc.right = 1400; msc.top = 1400; msc.bottom = -1400; msc.near = 10; msc.far = 7000;
    moonLight.shadow.bias = -0.0005; moonLight.shadow.normalBias = 1.5;
    scene.add(moonLight, moonLight.target);
    const hemi = new THREE.HemisphereLight(0x2c3b6e, 0x16100c, 0.6);
    scene.add(hemi);

    const st = { t: 0, nextMet: 6 + Math.random() * 10, met: null };
    const vy = H(0, 0) + 1.65;
    return {
      scene, viewpoint: new THREE.Vector3(0, vy, 0), yaw: 142 * DEG, pitch: 12 * DEG, fov: 72, near: 0.2, far: 30000, exposure: 1.6,
      caption: 'Les dunes de Lompoul, entre Dakar et Saint-Louis. Les étoiles et la Voie lactée sont à leur place pour une nuit de septembre vers 21 h 30.',
      update(dt) {
        st.t += dt;
        stars.material.uniforms.time.value = st.t;
        stars.material.uniforms.pxScale.value = renderer.getPixelRatio();
        fireMat.uniforms.t.value = st.t;
        const fl = 0.8 + 0.2 * Math.sin(st.t * 11.0) * Math.sin(st.t * 7.3 + 1.0) + 0.08 * Math.sin(st.t * 23.0);
        fireLight.intensity = 900 * fl; glowMat.opacity = 0.42 + 0.14 * fl;
        tentMat.emissiveIntensity = 0.55 + 0.07 * fl;
        st.nextMet -= dt;
        if (st.nextMet <= 0 && !st.met) {
          const az = Math.random() * 360, alt = 35 + Math.random() * 40;
          const a = altAzVec(alt, az), dir = altAzVec(alt - 12 - Math.random() * 10, az + (Math.random() - 0.5) * 40).sub(a).normalize();
          st.met = { a: a.multiplyScalar(9000), dir, t: 0, dur: 0.55 + Math.random() * 0.5, len: 900 + Math.random() * 700 };
          st.nextMet = 12 + Math.random() * 25;
        }
        if (st.met) {
          const m = st.met; m.t += dt;
          const k = m.t / m.dur;
          if (k >= 1) { st.met = null; meteor.visible = false; }
          else {
            const head = m.a.clone().addScaledVector(m.dir, m.len * 2.2 * k);
            const mid = head.clone().addScaledVector(m.dir, -m.len / 2);
            meteor.position.copy(mid);
            const camP = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
            const toCam = camP.sub(mid).normalize();
            const side = new THREE.Vector3().crossVectors(m.dir, toCam).normalize();
            const nrm = new THREE.Vector3().crossVectors(m.dir, side);
            meteor.matrixAutoUpdate = false;
            meteor.matrix.makeBasis(m.dir, side, nrm).scale(new THREE.Vector3(m.len, 14, 1)).setPosition(mid);
            metMat.uniforms.k.value = Math.sin(k * Math.PI);
            meteor.visible = true;
          }
        }
      },
      enter() { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; Sound.setAmbience(desertAudio); },
      leave() { renderer.shadowMap.enabled = false; },
      dispose() { renderer.shadowMap.enabled = false; disposeScene(scene); }
    };
  }
};
