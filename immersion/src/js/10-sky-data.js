/* ================= ciel : étoiles brillantes (J2000) et repères galactiques ================= */
// [ascension droite en heures, déclinaison en degrés, magnitude visuelle, indice de couleur B-V]
const BRIGHT_STARS = [
  [6.7525, -16.716, -1.46, 0.00], [6.3992, -52.696, -0.74, 0.15], [14.2610, 19.182, -0.05, 1.23], [14.6600, -60.834, -0.27, 0.71],
  [18.6156, 38.784, 0.03, 0.00], [5.2782, 45.998, 0.08, 0.80], [5.2423, -8.202, 0.13, -0.03], [7.6550, 5.225, 0.34, 0.42],
  [1.6286, -57.237, 0.46, -0.16], [5.9195, 7.407, 0.50, 1.85], [14.0637, -60.373, 0.61, -0.23], [19.8464, 8.868, 0.77, 0.22],
  [12.4433, -63.099, 0.76, -0.24], [4.5987, 16.509, 0.86, 1.54], [16.4901, -26.432, 0.96, 1.83], [13.4199, -11.161, 0.97, -0.23],
  [7.7553, 28.026, 1.14, 1.00], [22.9608, -29.622, 1.16, 0.09], [20.6905, 45.280, 1.25, 0.09], [12.7953, -59.689, 1.25, -0.23],
  [10.1395, 11.967, 1.35, -0.11], [6.9771, -28.972, 1.50, -0.21], [7.5767, 31.888, 1.58, 0.03], [17.5601, -37.104, 1.62, -0.22],
  [12.5194, -57.113, 1.64, 1.60], [5.4189, 6.350, 1.64, -0.22], [5.4382, 28.608, 1.65, -0.13], [9.2200, -69.717, 1.68, 0.07],
  [5.6036, -1.202, 1.69, -0.18], [22.1372, -46.961, 1.74, -0.07], [5.6793, -1.943, 1.77, -0.21], [12.9005, 55.960, 1.77, -0.02],
  [11.0621, 61.751, 1.79, 1.07], [3.4054, 49.861, 1.80, 0.48], [18.4029, -34.385, 1.85, -0.03], [7.1399, -26.393, 1.83, 0.68],
  [17.6219, -42.998, 1.86, 0.40], [13.7923, 49.313, 1.86, -0.10], [8.3752, -59.510, 1.86, 1.28], [5.9921, 44.947, 1.90, 0.08],
  [16.8111, -69.028, 1.91, 1.45], [6.6285, 16.399, 1.93, 0.00], [20.4275, -56.735, 1.94, -0.20], [2.5303, 89.264, 1.98, 0.60],
  [6.3783, -17.956, 1.98, -0.23], [9.4598, -8.659, 1.98, 1.44], [2.1195, 23.463, 2.00, 1.15], [18.9211, -26.297, 2.05, -0.13],
  [0.7265, -17.987, 2.04, 1.02], [5.7959, -9.670, 2.06, -0.17], [5.5334, -0.299, 2.23, -0.22], [0.1398, 29.091, 2.06, -0.11],
  [1.1622, 35.621, 2.05, 1.58], [14.8451, 74.156, 2.08, 1.47], [17.5822, 12.560, 2.08, 0.15], [3.1361, 40.956, 2.12, -0.05],
  [2.0650, 42.330, 2.10, 1.37], [11.8177, 14.572, 2.14, 0.09], [0.6751, 56.537, 2.24, 1.17], [0.1530, 59.150, 2.28, 0.34],
  [0.9451, 60.717, 2.47, -0.15], [1.4303, 60.235, 2.68, 0.13], [1.9066, 63.670, 3.38, -0.15], [20.3705, 40.257, 2.23, 0.67],
  [20.7702, 33.970, 2.48, 1.03], [19.5120, 27.960, 3.08, 1.13], [19.7495, 45.131, 2.87, -0.03], [19.7709, 10.613, 2.72, 1.52],
  [19.9219, 6.407, 3.71, 0.86], [21.7364, 9.875, 2.39, 1.53], [23.0794, 15.205, 2.49, -0.04], [23.0629, 28.083, 2.42, 1.67],
  [0.2206, 15.184, 2.83, -0.23], [17.9434, 51.489, 2.24, 1.52], [18.3499, -29.828, 2.70, 1.38], [18.4662, -25.422, 2.81, 1.04],
  [19.0435, -29.880, 2.60, 0.08], [18.0968, -30.424, 2.99, 1.00], [18.7609, -26.991, 3.17, -0.11], [19.1157, -27.670, 3.32, 1.19],
  [16.0056, -22.622, 2.29, -0.12], [16.0907, -19.806, 2.56, -0.07], [16.8361, -34.293, 2.29, 1.15], [17.7081, -39.030, 2.41, -0.17],
  [17.5127, -37.296, 2.70, -0.22], [16.3531, -25.593, 2.89, 0.13], [16.5980, -28.216, 2.82, -0.25], [16.8645, -38.048, 3.04, -0.20],
  [16.9097, -42.361, 3.62, 1.37], [17.2025, -43.239, 3.32, 0.41], [17.7931, -40.127, 3.03, 0.51], [14.7498, 27.074, 2.37, 0.97],
  [13.9114, 18.398, 2.68, 0.58], [15.5781, 26.715, 2.23, -0.02], [11.0307, 56.382, 2.37, -0.02], [11.8972, 53.695, 2.44, 0.04],
  [12.2571, 57.033, 3.31, 0.08], [13.3988, 54.925, 2.23, 0.02], [3.0379, 4.090, 2.54, 1.64], [3.7914, 24.105, 2.87, -0.09],
  [3.8194, 24.053, 3.62, -0.08], [3.7481, 24.113, 3.70, -0.11], [3.7639, 24.368, 3.87, -0.07], [3.7722, 23.948, 4.18, -0.06],
  [3.7533, 24.467, 4.30, -0.11], [4.4778, 15.871, 3.40, 0.18], [4.3300, 15.628, 3.65, 0.99], [4.3822, 17.543, 3.76, 0.98],
  [4.4769, 19.180, 3.53, 1.01], [5.5856, 9.934, 3.39, -0.16], [5.5906, -5.910, 2.77, -0.24], [7.4017, -29.303, 2.45, -0.08],
  [6.3828, 22.514, 2.88, 1.64], [6.7322, 25.131, 3.06, 1.38], [5.9954, 37.213, 2.62, -0.08], [3.7153, 47.788, 3.01, -0.13],
  [3.9642, 40.010, 2.89, -0.18], [3.0799, 53.506, 2.93, 0.70], [5.6275, 21.143, 3.00, -0.19], [19.4250, 3.115, 3.36, 0.32],
  [19.0903, 13.863, 2.99, 0.01], [19.1042, -4.882, 3.43, -0.09], [20.1884, -0.821, 3.24, -0.07], [18.8347, 33.363, 3.45, 0.00],
  [18.9825, 32.690, 3.24, -0.05], [16.6881, 31.603, 2.81, 0.65], [16.5036, 21.490, 2.78, 0.94], [17.1731, -15.725, 2.43, 0.06],
  [16.6194, -10.567, 2.56, 0.02], [16.2391, -3.694, 2.75, 1.58], [21.7840, -16.127, 2.85, 0.29], [21.5260, -5.571, 2.91, 0.83],
  [22.0964, -0.320, 2.94, 0.98], [22.7111, -46.885, 2.07, 1.60], [14.1114, -36.370, 2.06, 1.01], [12.2633, -17.542, 2.59, -0.11],
  [12.5731, -23.397, 2.65, 0.89], [10.3329, 19.842, 2.08, 1.15], [11.2351, 20.524, 2.56, 0.12], [21.3096, 62.586, 2.45, 0.22],
  [1.9108, 20.808, 2.64, 0.13], [8.0597, -40.003, 2.21, -0.27], [8.1589, -47.337, 1.83, -0.22], [8.7451, -54.709, 1.96, 0.04],
  [9.1333, -43.433, 2.21, 1.66], [9.2848, -59.275, 2.25, 0.18], [15.2834, -9.383, 2.61, -0.11], [14.8479, -16.042, 2.75, 0.15],
  [14.6988, -47.388, 2.30, -0.20]
];
// galactique vers équatorial (J2000) : colonnes = axes galactiques exprimés en équatorial
const GAL_X = [-0.0548755604, -0.8734370902, -0.4838350155];
const GAL_Y = [0.4941094279, -0.4448296300, 0.7469822445];
const GAL_Z = [-0.8676661490, -0.1980763734, 0.4559837762];
function eqVec(raHours, decDeg) {
  const a = raHours * 15 * DEG, d = decDeg * DEG;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}
function bvToRGB(bv) {
  // approximation simple de la couleur d'une étoile selon son indice B-V
  bv = clamp(bv, -0.4, 2.0);
  const t = (bv + 0.4) / 2.4;
  const r = clamp(0.62 + 0.55 * t, 0, 1), g = clamp(0.75 + 0.25 * t - 0.35 * t * t, 0, 1), b = clamp(1.0 - 0.75 * t * t, 0, 1);
  return [r, g, b];
}
// Champ d'étoiles en coordonnées équatoriales (vecteurs unitaires), étoiles faibles concentrées vers la Voie lactée
function makeStarCatalog(seed, faintCount) {
  const rnd = mulberry32(seed);
  const pos = [], col = [], mag = [];
  for (const [ra, dec, m, bv] of BRIGHT_STARS) {
    pos.push(...eqVec(ra, dec)); col.push(...bvToRGB(bv)); mag.push(m);
  }
  for (let i = 0; i < faintCount; i++) {
    let x, y, z;
    if (rnd() < 0.58) {
      // près du plan galactique
      const l = rnd() * Math.PI * 2;
      const b = (rnd() + rnd() + rnd() - 1.5) * 0.22;
      const gx = Math.cos(b) * Math.cos(l), gy = Math.cos(b) * Math.sin(l), gz = Math.sin(b);
      x = gx * GAL_X[0] + gy * GAL_Y[0] + gz * GAL_Z[0];
      y = gx * GAL_X[1] + gy * GAL_Y[1] + gz * GAL_Z[1];
      z = gx * GAL_X[2] + gy * GAL_Y[2] + gz * GAL_Z[2];
    } else {
      z = rnd() * 2 - 1; const a = rnd() * Math.PI * 2, s = Math.sqrt(1 - z * z);
      x = s * Math.cos(a); y = s * Math.sin(a);
    }
    pos.push(x, y, z);
    // distribution de magnitudes : beaucoup plus d'étoiles faibles
    const m = 3.4 + 3.2 * Math.pow(rnd(), 0.42);
    mag.push(m);
    col.push(...bvToRGB(rnd() < 0.7 ? 0.2 + rnd() * 0.9 : -0.2 + rnd() * 1.8));
  }
  return { pos: new Float32Array(pos), col: new Float32Array(col), mag: new Float32Array(mag), count: mag.length };
}
function makeStarPoints(cat, opts = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(cat.pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(cat.col, 3));
  g.setAttribute('mag', new THREE.BufferAttribute(cat.mag, 1));
  const phase = new Float32Array(cat.count);
  for (let i = 0; i < cat.count; i++) phase[i] = (i * 0.61803) % 1 * 6.283;
  g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { intensity: { value: 1 }, time: { value: 0 }, pxScale: { value: 1 }, horizonFade: { value: opts.horizon ? 1 : 0 }, magLimit: { value: opts.magLimit ?? 6.5 } },
    vertexShader: /* glsl */`
      attribute float mag; attribute float phase; attribute vec3 color;
      uniform float intensity; uniform float time; uniform float pxScale; uniform float horizonFade; uniform float magLimit;
      varying vec3 vCol; varying float vB;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 wd = normalize(wp.xyz - cameraPosition);
        float alt = wd.y;
        float b = pow(10.0, -0.4 * (mag - 1.0));
        // extinction et scintillation près de l'horizon
        float air = mix(1.0, smoothstep(-0.02, 0.35, alt), horizonFade);
        float tw = 1.0 + horizonFade * (0.45 * (1.0 - smoothstep(0.0, 0.6, alt))) * sin(time * (9.0 + 7.0 * fract(phase * 3.1)) + phase);
        b *= air * tw * intensity * (1.0 - smoothstep(magLimit - 0.5, magLimit + 0.5, mag));
        vB = b;
        vCol = color;
        vec4 mv = viewMatrix * wp;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((1.6 + 2.2 * sqrt(max(b, 0.0))) * pxScale, 1.0, 12.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol; varying float vB;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(c, c);
        if (r2 > 1.0) discard;
        float core = exp(-r2 * 5.0);
        gl_FragColor = vec4(vCol * vB * core * 1.6, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: opts.depthTest ?? true, transparent: false
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}
