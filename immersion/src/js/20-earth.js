/* ================= Terre vue de la coupole de l'ISS ================= */
const EARTH_R = 6371e3;
const ISS_ALT = 420e3;
const ISS_INC = 51.64 * DEG;
const MU_EARTH = 3.986004418e14;
const OMEGA_EARTH = 7.2921159e-5;
const SUN_DEC = -14.3 * DEG; // début novembre

const GLSL_ATMO = /* glsl */`
const float RP = 1.0;
const float RA = 1.0157;
const float HR = 0.0012557;
const float HM = 0.00018835;
const vec3 BR = vec3(36.95, 86.01, 210.9);
const float BM = 160.0;
float chap(float X, float h, float mu) {
  float c = sqrt(1.5707963 * (X + h));
  if (mu >= 0.0) return c / (c * mu + 1.0) * exp(-h);
  float x0 = sqrt(max(0.0, 1.0 - mu * mu)) * (X + h);
  float c0 = sqrt(1.5707963 * x0);
  return 2.0 * c0 * exp(X - x0) - c / (1.0 - c * mu) * exp(-h);
}
vec2 raySphere(vec3 o, vec3 d, float r) {
  float b = dot(o, d);
  float c = dot(o, o) - r * r;
  float disc = b * b - c;
  if (disc < 0.0) return vec2(-1.0, -1.0);
  float s = sqrt(disc);
  return vec2(-b - s, -b + s);
}
vec2 odToInf(vec3 p, vec3 d) {
  float r = length(p);
  float mu = dot(p, d) / r;
  float q = RP / r;
  float muH = -sqrt(max(0.0, 1.0 - q * q));
  if (mu < muH) return vec2(1e6);
  float h = max(r - RP, 0.0);
  return vec2(HR * chap(RP / HR, h / HR, mu), HM * chap(RP / HM, h / HM, mu));
}
vec3 sunTrans(vec3 p, vec3 s) {
  vec2 od = odToInf(p, s);
  return exp(-(BR * od.x + 1.1 * BM * od.y));
}
void scatter(vec3 o, vec3 d, float ta, float tb, vec3 s, int steps, out vec3 L, out vec3 T) {
  float ds = (tb - ta) / float(steps);
  vec2 odv = vec2(0.0);
  vec3 sumR = vec3(0.0), sumM = vec3(0.0);
  for (int i = 0; i < 24; i++) {
    if (i >= steps) break;
    float t = ta + ds * (float(i) + 0.5);
    vec3 p = o + d * t;
    float h = max(length(p) - RP, 0.0);
    float rr = exp(-h / HR), rm = exp(-h / HM);
    odv += vec2(rr, rm) * ds * 0.5;
    vec2 ods = odToInf(p, s);
    vec3 att = exp(-(BR * (odv.x + ods.x) + 1.1 * BM * (odv.y + ods.y)));
    sumR += rr * att * ds;
    sumM += rm * att * ds;
    odv += vec2(rr, rm) * ds * 0.5;
  }
  float mu = dot(d, s);
  float pr = 0.0596831 * (1.0 + mu * mu);
  const float g = 0.76;
  float pm = 0.0795775 * (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
  // diffusion multiple très approchée : un peu de lumière bleue ajoutée
  L = sumR * BR * (pr + 0.035) + sumM * BM * pm;
  T = exp(-(BR * odv.x + 1.1 * BM * odv.y));
}
`;

function earthMaterial(tex) {
  // Un seul shader, posé sur la sphère de l'atmosphère : chaque pixel lance un rayon,
  // touche la planète (sol, mer, nuages, villes) ou la frôle (limbe bleu, lueur verte).
  return new THREE.ShaderMaterial({
    uniforms: {
      sunDir: { value: new THREE.Vector3(1, 0, 0) },
      camPos: { value: new THREE.Vector3(0, 1.0659, 0) },
      sunE: { value: 1.7 }, time: { value: 0 },
      dayMap: { value: tex.day }, nightMap: { value: tex.night }, maskMap: { value: tex.mask },
      nightGain: { value: 0.9 }, maxOct: { value: 9 }, shadowOct: { value: 5 }, steps: { value: 8 }, cumulus: { value: 1 },
      flashes: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }
    },
    vertexShader: /* glsl */`
      varying vec3 vPos;
      void main() {
        vPos = position / ${EARTH_R.toFixed(1)};
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D maskMap;
      uniform vec3 sunDir; uniform vec3 camPos; uniform float sunE; uniform float time;
      uniform float nightGain; uniform float maxOct; uniform float shadowOct; uniform int steps; uniform float cumulus;
      uniform vec4 flashes[4];
      varying vec3 vPos;
      ${GLSL_NOISE}
      ${GLSL_ATMO}
      vec2 gUv, gDx, gDy;
      vec3 gSx, gSy;
      vec4 tex(sampler2D t, vec2 off) { return textureGrad(t, gUv + off, gDx, gDy); }
      float climate(vec3 n) {
        float lat = degrees(asin(clamp(n.y, -1.0, 1.0)));
        float al = abs(lat);
        float c = 0.52;
        c += 0.34 * exp(-pow((lat - 6.0) / 7.5, 2.0));
        c -= 0.40 * exp(-pow((al - 22.0) / 8.5, 2.0));
        c += 0.20 * smoothstep(36.0, 58.0, al);
        c -= 0.12 * smoothstep(70.0, 85.0, al);
        return clamp(c, 0.04, 0.95);
      }
      float cloudVal(vec3 n, float octs) {
        vec3 p = n * 2.3 + vec3(3.1, 1.7, 5.3);
        vec3 w = vec3(snoise(p * 1.4), snoise(p * 1.4 + 7.7), snoise(p * 1.4 + 13.1));
        vec3 q = n * 7.0 + w * 0.6 + vec3(time * 0.00012, 0.0, time * 0.00005);
        float f = 0.0, a = 0.5, fr = 1.0, norm = 0.0;
        for (int i = 0; i < 11; i++) {
          float fi = float(i);
          if (fi >= octs) break;
          float k = clamp(octs - fi, 0.0, 1.0);
          f += a * k * snoise(q * fr);
          norm += a * k;
          fr *= 2.07; a *= 0.62;
        }
        return f / max(norm, 0.001) * 0.5 + 0.5;
      }
      float coverage(float v, float clim) {
        float th = 0.5 + (0.5 - clim) * 0.42;
        return smoothstep(th - 0.015, th + 0.055, v);
      }
      vec2 worley(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        float d = 1.0, id = 0.0;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
          vec3 g = vec3(float(x), float(y), float(z));
          vec3 o = vec3(hash13(i + g), hash13(i + g + 19.19), hash13(i + g + 47.47));
          vec3 r = g + o - f;
          float dd = dot(r, r);
          if (dd < d) { d = dd; id = hash13(i + g + 71.3); }
        }
        return vec2(sqrt(d), id);
      }
      vec3 surface(vec3 N, vec3 V, float fw) {
        float mu = dot(N, sunDir);
        vec4 msk = tex(maskMap, vec2(0.0));
        float coastN = snoise(N * 2600.0) * 0.06 + snoise(N * 900.0) * 0.06;
        float water = smoothstep(0.44, 0.56, msk.r + coastN);
        vec3 day = tex(dayMap, vec2(0.0)).rgb;
        float lum = dot(day, vec3(0.2126, 0.7152, 0.0722));
        vec3 deep = vec3(0.0030, 0.0105, 0.030);
        vec3 shelf = day * vec3(0.42, 0.80, 0.95) * 0.75;
        vec3 ocean = mix(deep, shelf, smoothstep(0.018, 0.075, lum));
        vec3 land = pow(day, vec3(1.08)) * 0.92;
        float det = snoise(N * 1400.0) * 0.5 + snoise(N * 3100.0) * 0.3;
        land *= 1.0 + det * 0.10 * (1.0 - smoothstep(0.0004, 0.004, fw));
        vec3 albedo = mix(land, ocean, water);
        // relief : pente de la carte d'altitude
        float h0 = msk.g;
        float hx = tex(maskMap, gDx).g - h0, hy = tex(maskMap, gDy).g - h0;
        vec3 sx = gSx, sy = gSy;
        vec3 r1 = cross(sy, N), r2 = cross(N, sx);
        float dt = dot(sx, r1);
        vec3 grad = sign(dt) * (hx * r1 + hy * r2) * 0.004;
        vec3 Nb = normalize(mix(normalize(abs(dt) * N - grad), N, water));
        // nuages
        float clim = climate(N);
        float octs = clamp(log2(0.55 / (7.0 * max(fw, 1e-7))), 2.0, maxOct);
        float cv = cloudVal(N, octs);
        float cloud = coverage(cv, clim);
        float thick = smoothstep(0.0, 0.25, cv - (0.5 + (0.5 - clim) * 0.42));
        float latA = abs(degrees(asin(clamp(N.y, -1.0, 1.0))));
        float cumW = cumulus * water * smoothstep(2.0, 9.0, latA) * (1.0 - smoothstep(27.0, 36.0, latA)) * (1.0 - cloud) * (1.0 - smoothstep(0.00025, 0.0011, fw));
        if (cumW > 0.01) {
          vec3 wq = vec3(N.x, N.y * 1.9, N.z) * 520.0 + vec3(snoise(N * 40.0), snoise(N * 40.0 + 3.3), snoise(N * 40.0 + 6.6)) * 0.9;
          vec2 wr = worley(wq);
          float jag = snoise(N * 1500.0) * 0.09 + snoise(N * 3300.0) * 0.05;
          float size = 0.10 + 0.20 * wr.y;
          float cum = (1.0 - smoothstep(size - 0.10, size + 0.04, wr.x + jag)) * step(0.35, wr.y);
          cum *= smoothstep(-0.35, 0.55, snoise(N * 55.0 + 2.0)) * (0.35 + 0.4 * wr.y);
          cloud = max(cloud, cum * cumW);
          thick = max(thick, cum * 0.3);
        }
        vec3 Nsh = normalize(N + sunDir * (0.00055 / max(mu, 0.06)));
        float shadow = coverage(cloudVal(Nsh, min(octs, shadowOct)), climate(Nsh));
        vec3 Ts = sunTrans(N * 1.00002, sunDir);
        float NdL = max(dot(Nb, sunDir), 0.0);
        vec3 E = sunE * Ts;
        vec3 col = albedo * E * NdL * (1.0 - 0.72 * shadow);
        if (water > 0.01) {
          float wn = snoise(N * 60.0 + time * 0.0002) * 0.5 + 0.5;
          float rough = mix(0.16, 0.34, wn);
          float a2 = rough * rough;
          vec3 H = normalize(sunDir + V);
          float NdH = max(dot(N, H), 0.0), NdV = max(dot(N, V), 0.001), NdLw = max(mu, 0.0);
          float dd = NdH * NdH * (a2 - 1.0) + 1.0;
          float D = a2 / (3.14159 * dd * dd);
          float F = 0.02 + 0.98 * pow(1.0 - max(dot(V, H), 0.0), 5.0);
          float vis = 0.5 / (NdLw * sqrt(NdV * NdV * (1.0 - a2) + a2) + NdV * sqrt(NdLw * NdLw * (1.0 - a2) + a2) + 1e-4);
          col += E * D * F * vis * NdLw * water * (1.0 - cloud) * (1.0 - 0.6 * shadow);
          float fr = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
          col += vec3(0.04, 0.08, 0.16) * sunE * fr * water * smoothstep(-0.1, 0.25, mu) * 0.35;
        }
        float wrap = clamp((mu + 0.08) / 1.08, 0.0, 1.0);
        float selfSh = clamp(shadow - cloud, 0.0, 1.0);
        vec3 cloudCol = vec3(0.86, 0.88, 0.92) * E * (0.12 + 0.88 * wrap) * (0.75 + 0.25 * thick) * (1.0 - 0.3 * selfSh);
        col = mix(col, cloudCol, cloud * (0.55 + 0.45 * thick));
        float night = 1.0 - smoothstep(-0.10, 0.04, mu);
        float li = tex(nightMap, vec2(0.0)).r;
        vec3 lights = pow(li, 1.15) * mix(vec3(1.0, 0.62, 0.28), vec3(1.0, 0.86, 0.62), smoothstep(0.1, 0.5, li));
        col += lights * nightGain * night * (1.0 - 0.82 * cloud);
        col += (albedo * 0.3 + cloud * 0.25) * vec3(0.7, 0.8, 1.0) * 0.0012 * night;
        for (int i = 0; i < 4; i++) {
          float k = flashes[i].w;
          if (k > 0.0) {
            float d = 1.0 - dot(N, flashes[i].xyz);
            col += vec3(0.72, 0.80, 1.0) * k * exp(-d * 45000.0) * (0.25 + cloud) * night;
          }
        }
        return col;
      }
      void main() {
        vec3 d = normalize(vPos - camPos);
        vec2 ta = raySphere(camPos, d, RA);
        vec2 tp = raySphere(camPos, d, RP);
        vec3 col;
        float alpha;
        // point touché (ou point le plus proche) calculé hors des branches pour des dérivées propres
        float tHit = tp.x > 0.0 ? tp.x : max(-dot(camPos, d), 0.0);
        vec3 N = normalize(camPos + d * tHit);
        float lon = atan(-N.z, N.x);
        gUv = vec2(lon / 6.2831853 + 0.5, asin(clamp(N.y, -1.0, 1.0)) / 3.1415927 + 0.5);
        vec2 uv2 = vec2(fract(gUv.x + 0.5), gUv.y);
        vec2 dx = dFdx(gUv), dy = dFdy(gUv), dx2 = dFdx(uv2), dy2 = dFdy(uv2);
        gDx = dot(dx2, dx2) < dot(dx, dx) ? dx2 : dx;
        gDy = dot(dy2, dy2) < dot(dy, dy) ? dy2 : dy;
        gSx = dFdx(N); gSy = dFdy(N);
        float fw = length(fwidth(N));
        if (tp.x > 0.0) {
          col = surface(N, -d, fw);
          vec3 Lin = vec3(0.0), Tv = vec3(1.0);
          int nst = dot(N, -d) < 0.2 ? 18 : steps;
          scatter(camPos, d, max(ta.x, 0.0), tp.x, sunDir, nst, Lin, Tv);
          col = col * Tv + Lin * sunE;
          alpha = 1.0;
        } else {
          if (ta.y <= 0.0) discard;
          vec3 L, T;
          scatter(camPos, d, max(ta.x, 0.0), ta.y, sunDir, 16, L, T);
          float tc = clamp(-dot(camPos, d), max(ta.x, 0.0), ta.y);
          float hmin = length(camPos + d * tc) - RP;
          float glow = exp(-pow((hmin - 0.0149) / 0.0011, 2.0));
          float nightSide = 1.0 - smoothstep(-0.25, 0.05, dot(normalize(camPos + d * tc), sunDir));
          col = L * sunE + vec3(0.18, 0.62, 0.26) * glow * nightSide * 0.010;
          alpha = 0.0;
        }
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    depthWrite: false, depthTest: false, transparent: false
  });
}

function buildCupola() {
  const g = new THREE.Group();
  const grain = canvasTexture(256, 256, (c, W, H) => {
    const rnd = mulberry32(3);
    c.fillStyle = '#c8cbd0'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { const v = 185 + rnd() * 40 | 0; c.fillStyle = `rgba(${v},${v + 2},${v + 5},0.35)`; c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2); }
    for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(90,95,100,0.06)'; c.beginPath(); c.ellipse(rnd() * W, rnd() * H, 10 + rnd() * 40, 6 + rnd() * 20, rnd() * 3, 0, 7); c.fill(); }
  }, { repeat: true });
  grain.repeat.set(3, 3);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grain, roughness: 0.55, metalness: 0.4 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.6, metalness: 0.3 });
  const yTop = -0.78, yBase = -0.06, rTop = 0.63, rBase = 1.2, rWin = 0.40, th = 0.055;
  const dir = a => new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
  // plaque centrale : hexagone percé d'un hublot rond de 80 cm
  const hex = new THREE.Shape();
  for (let k = 0; k < 6; k++) {
    const a = (k * 60 + 30) * DEG;
    const x = Math.sin(a) * rTop, y = Math.cos(a) * rTop;
    k ? hex.lineTo(x, y) : hex.moveTo(x, y);
  }
  hex.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, rWin, 0, Math.PI * 2, true);
  hex.holes.push(hole);
  const top = new THREE.Mesh(new THREE.ExtrudeGeometry(hex, { depth: th, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 64 }), [frameMat, edgeMat]);
  top.rotation.x = -Math.PI / 2;
  top.position.y = yTop - th;
  g.add(top);
  // anneau sombre autour du hublot central
  const ring = new THREE.Mesh(new THREE.TorusGeometry(rWin + 0.012, 0.016, 10, 96), edgeMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = yTop + 0.004;
  g.add(ring);
  // six hublots trapézoïdaux
  const aT = rTop * Math.cos(30 * DEG), aB = rBase * Math.cos(30 * DEG);
  const hwT = rTop / 2, hwB = rBase / 2;
  const L = Math.hypot(aB - aT, yBase - yTop);
  const m = 0.075;
  const hw = v => hwT + (hwB - hwT) * v / L;
  for (let k = 0; k < 6; k++) {
    const a = k * 60 * DEG;
    const s = new THREE.Shape();
    s.moveTo(-hwT, 0); s.lineTo(hwT, 0); s.lineTo(hwB, L); s.lineTo(-hwB, L); s.closePath();
    const h = new THREE.Path();
    const v0 = m, v1 = L - m * 1.1;
    h.moveTo(-(hw(v0) - m * 1.15), v0); h.lineTo(-(hw(v1) - m * 1.15), v1); h.lineTo(hw(v1) - m * 1.15, v1); h.lineTo(hw(v0) - m * 1.15, v0); h.closePath();
    s.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
    const mesh = new THREE.Mesh(geo, [frameMat, edgeMat]);
    const u = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const v = dir(a).multiplyScalar(aB - aT).add(new THREE.Vector3(0, yBase - yTop, 0)).normalize();
    const w = new THREE.Vector3().crossVectors(u, v);
    const o = dir(a).multiplyScalar(aT).add(new THREE.Vector3(0, yTop, 0));
    mesh.matrixAutoUpdate = false;
    mesh.matrix.makeBasis(u, v, w).setPosition(o);
    g.add(mesh);
  }
  // paroi intérieure, main courante et ouverture vers le module Node 3
  const wallTex = canvasTexture(1024, 256, (c, W, H) => {
    c.fillStyle = '#c9ccd0'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) {
      const x = i * W / 16;
      c.fillStyle = i % 3 ? '#c2c5ca' : '#b9bcc2'; c.fillRect(x + 3, 6, W / 16 - 6, H - 12);
      c.fillStyle = '#8d9096'; for (const yy of [18, H - 22]) { c.beginPath(); c.arc(x + 14, yy, 3, 0, 7); c.fill(); c.beginPath(); c.arc(x + W / 16 - 14, yy, 3, 0, 7); c.fill(); }
      if (i % 4 === 1) { c.fillStyle = '#3d4046'; c.fillRect(x + 18, 60, 26, 12); c.fillStyle = '#e8eaec'; c.fillRect(x + 50, 58, 40, 6); }
    }
  });
  wallTex.wrapS = THREE.RepeatWrapping;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.26, rBase + 0.01, 0.7, 48, 1, true), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.75, metalness: 0.1, side: THREE.BackSide }));
  wall.position.y = yBase + 0.35;
  g.add(wall);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.018, 10, 96), new THREE.MeshStandardMaterial({ color: 0xd8c690, roughness: 0.45, metalness: 0.2 }));
  rail.rotation.x = Math.PI / 2; rail.position.y = 0.06;
  g.add(rail);
  const lid = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.27, 64), new THREE.MeshStandardMaterial({ color: 0xb7bac0, roughness: 0.8, side: THREE.DoubleSide }));
  lid.rotation.x = Math.PI / 2; lid.position.y = 0.64;
  g.add(lid);
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 1.4, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x8c9096, roughness: 0.85, side: THREE.BackSide }));
  tunnel.position.y = 1.34;
  g.add(tunnel);
  // appareil photo à téléobjectif, comme sur les photos prises depuis la coupole
  const cam = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.5, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.115, 0.085), black);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.28, 32), black);
  lens.rotation.x = Math.PI / 2; lens.position.z = -0.18;
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.006, 8, 32), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.4 }));
  lensRing.position.z = -0.27;
  cam.add(body, lens, lensRing);
  cam.position.set(0.62, -0.34, -0.18);
  cam.lookAt(new THREE.Vector3(1.4, -0.9, -0.55));
  cam.visible = false;
  g.add(cam);
  g.userData.camera = cam;
  return g;
}

// position de l'ISS (vecteur unitaire, repère terrestre de three.js : y vers le pôle Nord)
function issOrbit(state, t) {
  const r = EARTH_R + ISS_ALT;
  const n = Math.sqrt(MU_EARTH / (r * r * r));
  const u = state.u0 + n * t;
  const Om = state.Om;
  const ci = Math.cos(ISS_INC), si = Math.sin(ISS_INC);
  const x = Math.cos(u) * Math.cos(Om) - Math.sin(u) * ci * Math.sin(Om);
  const y = Math.cos(u) * Math.sin(Om) + Math.sin(u) * ci * Math.cos(Om);
  const z = Math.sin(u) * si;
  const th = state.th0 + OMEGA_EARTH * t;
  const xe = x * Math.cos(th) + y * Math.sin(th);
  const ye = -x * Math.sin(th) + y * Math.cos(th);
  return new THREE.Vector3(xe, z, -ye);
}
function sunEarthFixed(state, t) {
  const th = state.th0 + OMEGA_EARTH * t;
  const x = Math.cos(SUN_DEC), y = 0, z = Math.sin(SUN_DEC);
  const xe = x * Math.cos(th) + y * Math.sin(th);
  const ye = -x * Math.sin(th) + y * Math.cos(th);
  return new THREE.Vector3(xe, z, -ye);
}
// conditions de départ : passage ascendant au-dessus de Dakar, à une heure solaire locale donnée
function orbitStart(localHour) {
  const lat = 14.69 * DEG, lon = -17.44 * DEG;
  const su = Math.sin(lat) / Math.sin(ISS_INC);
  const u0 = Math.asin(su);
  const dl = Math.atan2(su * Math.cos(ISS_INC), Math.cos(u0));
  const H = (localHour - 12) * 15 * DEG; // angle horaire du Soleil au point sous la station
  const th0 = H - lon; // Soleil en ascension droite 0
  const Om = lon - dl + th0;
  return { u0, Om, th0 };
}
const EARTH_PRESETS = {
  jour: { hour: 10.6, label: 'Jour', note: 'Passage au-dessus de Dakar en milieu de matinée, vers le nord-est.' },
  crepuscule: { hour: 18.9, label: 'Crépuscule', note: 'La station rattrape la nuit : le Soleil se couche derrière la Terre en quelques minutes.' },
  nuit: { hour: 22.6, t0: 230, label: 'Nuit', note: 'Côté nuit : lumières des villes, éclairs dans les orages, étoiles.' }
};

EXPERIENCES.earth = {
  title: 'Terre vue de l\'ISS',
  async create(opts) {
    const [day, night, mask] = await Promise.all([
      loadTexture('textures/earth-day.jpg', true),
      loadTexture('textures/earth-night.jpg', false),
      loadTexture('textures/earth-mask.jpg', false)
    ]);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const planetMat = earthMaterial({ day, night, mask });
    const mats = { earth: planetMat };
    const earthGroup = new THREE.Group();
    const planet = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.0158, 160, 80), planetMat);
    planet.renderOrder = 2; planet.frustumCulled = false;
    earthGroup.add(planet);
    scene.add(earthGroup);

    // étoiles (repère équatorial) et Soleil
    const cat = makeStarCatalog(11, 5200);
    const stars = makeStarPoints(cat, { depthTest: false, magLimit: 6.2 });
    stars.renderOrder = 0;
    stars.scale.setScalar(5e8);
    const starHolder = new THREE.Group();
    starHolder.add(stars);
    scene.add(starHolder);
    const sunMat = new THREE.ShaderMaterial({
      uniforms: { vis: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`
        uniform float vis; varying vec2 vUv;
        void main() {
          float r = length(vUv - 0.5) * 2.0;
          float disk = 1.0 - smoothstep(0.135, 0.155, r);
          float edge = 1.0 - smoothstep(0.6, 1.0, r);
          float glow = (exp(-r * 9.0) * 1.4 + exp(-r * 3.0) * 0.18) * edge;
          float rays = 0.0;
          float ang = atan(vUv.y - 0.5, vUv.x - 0.5);
          rays = pow(abs(cos(ang * 3.0)), 60.0) * exp(-r * 4.0) * 0.5 * edge;
          vec3 c = vec3(1.0, 0.97, 0.92) * (disk * 60.0 + glow * 3.0 + rays * 2.0) * vis;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
    });
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sunMat);
    sun.renderOrder = 1; sun.frustumCulled = false;
    scene.add(sun);
    const glareMat = sunMat.clone();
    glareMat.fragmentShader = glareMat.fragmentShader.replace('disk * 60.0 + glow * 3.0 + rays * 2.0', 'glow * 0.9 + rays * 0.8');
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glareMat);
    glare.renderOrder = 4; glare.frustumCulled = false;
    scene.add(glare);

    // coupole et lumières de cabine
    const cupola = buildCupola();
    cupola.traverse(o => { if (o.isMesh) o.renderOrder = 10; });
    scene.add(cupola);
    const sunLight = new THREE.DirectionalLight(0xfff4e8, 2.2);
    scene.add(sunLight, sunLight.target);
    const earthLight = new THREE.HemisphereLight(0x05070c, 0x5a7090, 0.6);
    scene.add(earthLight);
    const cabin = new THREE.PointLight(0xffe6c8, 2.0, 6, 1.6);
    cabin.position.set(0, 0.5, 0.25);
    scene.add(cabin);

    const st = { preset: 'jour', t: 0, speed: 1, orbit: orbitStart(EARTH_PRESETS.jour.hour), expo: 1, expoTarget: 1, flashes: [], nextFlash: 2, dayView: 1 };
    const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion();
    const up = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), back = new THREE.Vector3();
    const sunScene = new THREE.Vector3(), sunObj = new THREE.Vector3(), camW = new THREE.Vector3();
    const qInv = new THREE.Quaternion();
    const rFlash = mulberry32(5);
    const exp = {
      scene, keep: true, viewpoint: new THREE.Vector3(0, 0, 0), yaw: 0, pitch: -24 * DEG, fov: 72, near: 0.02, far: 2e9, exposure: 1,
      caption: 'Altitude 420 km, vitesse 7,7 km/s : la station fait le tour de la Terre en 93 minutes.',
      cupola, st, presets: EARTH_PRESETS,
      setPreset(key) {
        st.preset = key; st.t = EARTH_PRESETS[key].t0 || 0;
        st.orbit = orbitStart(EARTH_PRESETS[key].hour);
        st.flashes = [];
        this.place(st.t);
        st.dayView = smoothstep(-0.55, 0.15, st.cosSun);
        st.expoTarget = lerp(3.4, 1.0, st.dayView);
        st.expo = st.expoTarget;
      },
      setSpeed(s) { st.speed = s; },
      menuMode(on) { cupola.visible = !on; },
      faceSun() {
        // oriente le regard vers le Soleil (utile au crépuscule)
        const d = sunScene.clone();
        look.yaw = Math.atan2(-d.x, -d.z);
        look.pitch = clamp(Math.asin(clamp(d.y, -1, 1)), -40 * DEG, 30 * DEG);
      },
      place(t) {
        const p = issOrbit(st.orbit, t), p2 = issOrbit(st.orbit, t + 1);
        up.copy(p).normalize();
        fwd.copy(p2).sub(p); fwd.addScaledVector(up, -fwd.dot(up)).normalize();
        right.crossVectors(fwd, up).normalize();
        back.copy(fwd).negate();
        tmpM.makeBasis(right, up, back).invert();
        tmpQ.setFromRotationMatrix(tmpM);
        earthGroup.quaternion.copy(tmpQ);
        earthGroup.position.set(0, -(EARTH_R + ISS_ALT), 0);
        // étoiles : repère équatorial vers repère terrestre (rotation de la Terre) puis vers la scène
        const th = st.orbit.th0 + OMEGA_EARTH * t;
        const eqToThree = new THREE.Matrix4().set(
          Math.cos(th), Math.sin(th), 0, 0,
          0, 0, 1, 0,
          Math.sin(th), -Math.cos(th), 0, 0,
          0, 0, 0, 1);
        starHolder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeRotationFromQuaternion(tmpQ).multiply(eqToThree));
        // Soleil
        const sE = sunEarthFixed(st.orbit, t);
        sunObj.copy(sE);
        sunScene.copy(sE).applyQuaternion(tmpQ);
        mats.earth.uniforms.sunDir.value.copy(sunObj);
        camW.setFromMatrixPosition(camera.matrixWorld);
        qInv.copy(tmpQ).invert();
        const camObj = camW.clone().sub(earthGroup.position).applyQuaternion(qInv).divideScalar(EARTH_R);
        mats.earth.uniforms.camPos.value.copy(camObj);
        st.cosSun = up.dot(sE);
      },
      update(dt) {
        st.t += dt * st.speed;
        mats.earth.uniforms.time.value = st.t;
        this.place(st.t);
        // le Soleil est-il caché par la Terre ?
        const rIss = EARTH_R + ISS_ALT;
        const c = st.cosSun;
        const inShadow = c < -Math.sqrt(1 - (EARTH_R / rIss) ** 2);
        const sunVis = inShadow ? 0 : 1;
        const D = 4e8;
        sun.position.copy(sunScene).multiplyScalar(D).add(camW);
        sun.lookAt(camW); sun.scale.setScalar(D * 0.06);
        glare.position.copy(sun.position); glare.quaternion.copy(sun.quaternion); glare.scale.setScalar(D * 0.5);
        sunMat.uniforms.vis.value = sunVis;
        glareMat.uniforms.vis.value = sunVis * 0.35;
        sunLight.position.copy(sunScene).multiplyScalar(10);
        sunLight.intensity = 2.4 * sunVis;
        // exposition : l'œil s'adapte quand on passe côté nuit
        st.dayView = smoothstep(-0.55, 0.15, c);
        st.expoTarget = lerp(3.4, 1.0, st.dayView);
        st.expo = lerp(st.expo, st.expoTarget, 1 - Math.exp(-dt / 3));
        renderer.toneMappingExposure = st.expo;
        earthLight.intensity = 0.25 + 0.9 * st.dayView;
        cabin.intensity = lerp(0.35, 1.6, st.dayView);
        stars.material.uniforms.intensity.value = (1 - st.dayView) * 2.2 + 0.05;
        stars.material.uniforms.pxScale.value = renderer.getPixelRatio();
        // éclairs dans les orages du côté nuit
        const U = mats.earth.uniforms.flashes.value;
        st.nextFlash -= dt;
        if (st.nextFlash <= 0 && st.dayView < 0.45 && st.flashes.length < 4) {
          st.nextFlash = 0.6 + rFlash() * 3.5;
          const q = new THREE.Vector3((rFlash() - 0.5) * 0.5, 0, (rFlash() - 0.5) * 0.5 - 0.25).add(new THREE.Vector3(0, 1, 0)).normalize();
          const dirObj = q.applyQuaternion(qInv);
          st.flashes.push({ d: dirObj, t: 0, n: 2 + Math.floor(rFlash() * 3), dur: 0.5 + rFlash() * 0.6 });
        }
        st.flashes = st.flashes.filter(f => (f.t += dt) < f.dur);
        for (let i = 0; i < 4; i++) {
          const f = st.flashes[i];
          if (!f) { U[i].w = 0; continue; }
          const ph = (f.t / f.dur) * f.n;
          const k = Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 6) * (1 - f.t / f.dur);
          U[i].set(f.d.x, f.d.y, f.d.z, k * 3.0);
        }
        stars.material.uniforms.time.value += dt;
      },
      dispose() { disposeScene(scene); }
    };
    exp.setPreset('jour');
    return exp;
  }
};
