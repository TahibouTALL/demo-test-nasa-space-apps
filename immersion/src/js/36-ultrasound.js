/* ================= échographie simulée ================= */
// Repère du corps en centimètres : x vers la gauche du patient, y vers la tête, z vers l'avant (ventre).
const BODY = { a: 15.5, b: 11.0 };
const KID = {
  R: { c: new THREE.Vector3(-8.0, 3.0, -4.6), ang: -12 * DEG, side: -1 },
  L: { c: new THREE.Vector3(8.0, 4.6, -4.6), ang: 12 * DEG, side: 1 }
};
const STONE = new THREE.Vector3(-2.35, -20.8, 0.15);
const US_IDEAL = { rein_d: { theta: -132, y: 0.5, rot: -12, tilt: 16 }, rein_g: { theta: 132, y: 2.1, rot: 12, tilt: -16 }, vessie: { theta: 0, y: -20.8, rot: -90, tilt: 0 } };
function kidAxis(k) { return new THREE.Vector3(-Math.sin(k.ang), Math.cos(k.ang), 0); }
function kidMat(k) {
  // colonnes : axes du rein (latéral, long, antéropostérieur) dans le repère du corps
  const y = kidAxis(k), z = new THREE.Vector3(0, 0, 1), x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Matrix3().set(x.x, y.x, z.x, x.y, y.y, z.y, x.z, y.z, z.z);
}
function ribHeights(thetaDeg) {
  const t = Math.abs(thetaDeg);
  const out = [];
  if (t > 55) for (const Y of [11.5, 8.0, 4.5]) out.push(Y + 0.07 * (t - 90));
  if (t > 112) out.push(1.0 + 0.07 * (t - 90));
  return out;
}
function probeFrame(p) {
  const { a, b } = BODY;
  const th = p.theta * DEG;
  const P = new THREE.Vector3(a * Math.sin(th), p.y, b * Math.cos(th));
  const n = new THREE.Vector3(Math.sin(th) / a, 0, Math.cos(th) / b).normalize();
  const t = new THREE.Vector3(a * Math.cos(th), 0, -b * Math.sin(th)).normalize();
  const d0 = n.clone().negate();
  const phi = p.rot * DEG;
  const u = new THREE.Vector3(0, 1, 0).multiplyScalar(Math.cos(phi)).addScaledVector(t, Math.sin(phi)).normalize();
  const w = new THREE.Vector3().crossVectors(u, d0).normalize();
  const tilt = p.tilt * DEG;
  const d = d0.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(w, Math.sin(tilt)).normalize();
  const w2 = new THREE.Vector3().crossVectors(u, d).normalize();
  return { O: P.clone().addScaledVector(d0, 0.3), d, u, w: w2, P, n, t };
}

const US_FRAG = /* glsl */`
precision highp float;
uniform vec3 uO; uniform vec3 uD; uniform vec3 uU; uniform float uDepth; uniform float uGain; uniform float uBreath;
uniform float uHydro; uniform float uTime; uniform float uContact; uniform mat3 kRm; uniform mat3 kLm; uniform vec3 kRc; uniform vec3 kLc;
uniform vec3 uStone; uniform float uAspect;
varying vec2 vUv;
float h31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn3(vec3 p) {
  vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), u.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), u.x), u.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), u.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), u.x), u.y), u.z);
}
float ell(vec3 p, vec3 c, vec3 r) { return length((p - c) / r) - 1.0; }
float seg(vec3 p, vec3 a, vec3 b) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
// type : 0 air, 1 graisse, 2 muscle, 3 foie, 4 rate, 5 cortex rénal, 6 pyramide, 7 sinus, 8 liquide, 9 os, 10 calcul, 11 gaz, 12 paroi
vec2 tissue(vec3 p) {
  const float A = ${BODY.a.toFixed(1)}, B = ${BODY.b.toFixed(1)};
  float rn = length(vec2(p.x / A, p.z / B));
  if (rn > 1.0 || p.y > 26.0 || p.y < -27.0) return vec2(0.0, 0.0);
  float dsk = (1.0 - rn) * 13.0;
  float th = degrees(atan(p.x / A, p.z / B));
  float at = abs(th);
  // côtes
  if (at > 55.0 && dsk > 0.7 && dsk < 1.9) {
    for (int k = 0; k < 4; k++) {
      float Y = k == 0 ? 11.5 : k == 1 ? 8.0 : k == 2 ? 4.5 : 1.0;
      if (k == 3 && at < 112.0) continue;
      float yr = Y + 0.07 * (at - 90.0);
      if (abs(p.y - yr) < 0.8) return vec2(9.0, 1.0);
    }
  }
  // colonne vertébrale
  if (length(vec2(p.x, p.z + 8.2)) < 2.6 && p.y < 22.0) return vec2(9.0, 1.0);
  // calcul et uretère droit
  float sb = uBreath * 2.5;
  if (uHydro > 0.0 && length(p - uStone) < 0.31) return vec2(10.0, 1.0);
  vec3 pel = kRc - vec3(0.0, sb, 0.0) + vec3(1.3, -1.6, 1.1);
  float ur = min(seg(p, pel, vec3(-4.2, -9.0, -3.6)), seg(p, vec3(-4.2, -9.0, -3.6), uStone + vec3(-0.1, 0.35, -0.2)));
  if (ur < 0.17 + 0.25 * uHydro) return vec2(8.0, 0.0);
  // vessie et sa paroi
  float bl = ell(p, vec3(0.0, -20.5, 3.2), vec3(4.6, 3.6, 3.6));
  if (bl < 0.0) return vec2(8.0, 0.0);
  if (bl < 0.06) return vec2(12.0, 0.0);
  // gaz intestinal (en avant)
  if (ell(p, vec3(-5.0, -2.0, 5.5), vec3(3.0, 2.0, 2.4)) < 0.0 || ell(p, vec3(4.0, -4.0, 6.0), vec3(3.0, 2.4, 2.4)) < 0.0 || ell(p, vec3(0.0, -10.0, 6.5), vec3(4.0, 2.0, 2.2)) < 0.0) return vec2(11.0, 0.0);
  // vaisseaux
  if (length(vec2(p.x - 1.2, p.z + 4.6)) < 1.1 && p.y < 20.0 && p.y > -12.0) return vec2(8.0, 0.0);
  if (length(vec2(p.x + 2.2, p.z + 4.4)) < 1.2 && p.y < 16.0 && p.y > -12.0) return vec2(8.0, 0.0);
  // reins
  for (int s = 0; s < 2; s++) {
    vec3 kc = (s == 0 ? kRc : kLc) - vec3(0.0, sb, 0.0);
    mat3 km = s == 0 ? kRm : kLm;
    vec3 q = transpose(km) * (p - kc);
    float e = length(q / vec3(2.9, 5.6, 2.5)) - 1.0;
    if (e < 0.0) {
      float hyd = s == 0 ? uHydro : 0.0;
      float sideSign = s == 0 ? 1.0 : -1.0;
      vec3 hil = vec3(0.9 * sideSign, 0.0, 0.5);
      // cavités dilatées : bassinet et calices remplis d'urine
      if (hyd > 0.0) {
        float pv = ell(q, hil * 1.2, vec3(1.0, 1.7, 0.85) * (0.6 + 0.6 * hyd));
        float cal = min(min(length(q - vec3(0.25 * sideSign, 2.6, 0.15)), length(q - vec3(0.25 * sideSign, -2.6, 0.15))), length(q - vec3(0.1 * sideSign, 0.3, 0.1))) - 0.55 * hyd - 0.1;
        float inf = min(seg(q, hil * 0.8, vec3(0.25 * sideSign, 2.4, 0.15)), seg(q, hil * 0.8, vec3(0.25 * sideSign, -2.4, 0.15))) - 0.28 * hyd;
        if (pv < 0.0 || cal < 0.0 || inf < 0.0) return vec2(8.0, 0.0);
      }
      float sinus = ell(q, hil * 0.6, vec3(1.25, 3.7, 1.0));
      if (sinus < 0.0) return vec2(7.0, 0.0);
      // pyramides de la médullaire, sombres, autour du sinus
      for (int j = 0; j < 5; j++) {
        float yy = -3.6 + 1.8 * float(j);
        for (int sx = 0; sx < 2; sx++) {
          vec3 pc = vec3((sx == 0 ? -1.0 : 1.0) * (1.45 - 0.08 * abs(yy)), yy, 0.0);
          if (length((q - pc) / vec3(0.5, 0.62, 0.85)) < 1.0) return vec2(6.0, 0.0);
        }
      }
      return vec2(5.0, 0.0);
    }
  }
  // vésicule biliaire
  if (ell(p, vec3(-4.5, 3.8 - sb, 5.5), vec3(1.6, 3.2, 1.6)) < 0.0) return vec2(8.0, 0.0);
  // foie et rate
  if (ell(p, vec3(-6.5, 9.5 - sb, 1.0), vec3(10.0, 7.5, 9.0)) < 0.0) return vec2(3.0, 0.0);
  if (ell(p, vec3(8.0, 10.0 - sb, -3.5), vec3(3.5, 6.0, 3.0)) < 0.0) return vec2(4.0, 0.0);
  // psoas
  if (p.y < 6.0 && (length(vec2(p.x - 3.8, p.z + 6.0)) < 2.0 || length(vec2(p.x + 3.8, p.z + 6.0)) < 2.0)) return vec2(2.0, 0.0);
  if (dsk < 1.6) return vec2(1.0, 0.0);
  return vec2(2.5, 0.0);
}
float echo(float t) {
  if (t < 0.5) return 0.0;
  if (t < 1.5) return 0.55;
  if (t < 2.25) return 0.30;
  if (t < 2.75) return 0.40;
  if (t < 3.5) return 0.50;
  if (t < 4.5) return 0.48;
  if (t < 5.5) return 0.27;
  if (t < 6.5) return 0.09;
  if (t < 7.5) return 0.92;
  if (t < 8.5) return 0.015;
  if (t < 10.5) return 1.0;
  if (t < 11.5) return 0.9;
  return 0.75;
}
float mu(float t) {
  if (t > 8.5 && t < 9.5) return 3.6;
  if (t > 9.5 && t < 10.5) return 5.0;
  if (t > 10.5 && t < 11.5) return 2.6;
  if (t > 7.5 && t < 8.5) return -0.055;
  if (t < 0.5) return 9.0;
  return 0.0;
}
void main() {
  vec2 q = vec2((vUv.x - 0.5) * uAspect, 1.0 - vUv.y - 0.035);
  float r = length(q) / 0.9 * uDepth;
  float al = atan(q.x, q.y);
  const float half_ = 0.593;
  if (q.y < 0.0 || abs(al) > half_ || r > uDepth) {
    // repères de profondeur
    float rr = length(q) / 0.9 * uDepth;
    float edgeA = abs(abs(al) - half_ - 0.03);
    float tick = (al > 0.0 && edgeA < 0.008 && abs(fract(rr + 0.5) - 0.5) < 0.04 && rr < uDepth) ? 0.7 : 0.0;
    gl_FragColor = vec4(vec3(tick), 1.0);
    return;
  }
  if (uContact < 0.5) { gl_FragColor = vec4(vec3(0.0), 1.0); return; }
  vec3 dir = normalize(cos(al) * uD + sin(al) * uU);
  float att = 0.0;
  const int N = 44;
  float dr = r / float(N);
  float jit = h31(vec3(gl_FragCoord.xy, 1.7));
  for (int i = 0; i < N; i++) {
    vec3 pp = uO + dir * (float(i) + jit) * dr;
    float tt = tissue(pp).x;
    if (tt > 9.5 && tt < 10.5) continue;
    att += mu(tt) * dr;
  }
  // ombre du calcul calculée exactement (corde du rayon dans la sphère)
  if (uHydro > 0.0) {
    vec3 oc = uStone - uO;
    float tc = dot(oc, dir);
    float d2 = dot(oc, oc) - tc * tc;
    float R2 = 0.31 * 0.31;
    if (d2 < R2 && tc < r) { float hc = sqrt(R2 - d2); float inside = clamp(r - (tc - hc), 0.0, 2.0 * hc); att += 5.0 * inside; }
  }
  vec3 P = uO + dir * r;
  vec2 T = tissue(P);
  float tp = tissue(P - dir * 0.14).x;
  float e = echo(T.x);
  // texture de chaque tissu (granulation dite speckle)
  // granulation allongée en travers du faisceau, comme sur un vrai appareil
  vec3 bq = vec3(r * 15.0, al * r * 6.0, dot(P, cross(uD, uU)) * 6.0);
  float sp = 0.6 * vn3(bq) + 0.4 * vn3(bq * 2.1 + 7.3);
  sp = pow(sp, 1.5) * 2.0;
  float tissueVar = 0.85 + 0.3 * vn3(P * 0.9);
  float tex = (T.x > 2.9 && T.x < 4.6) ? (0.55 + 0.45 * sp) * tissueVar : (0.35 + 0.65 * sp) * tissueVar;
  if (T.x > 0.5 && T.x < 1.5) tex *= 0.7 + 0.6 * vn3(vec3(P.x * 0.6, P.y * 0.6, length(P.xz) * 4.0));
  float val = e * tex;
  // interfaces : capsules, diaphragme, parois
  bool kidA = T.x > 4.5 && T.x < 7.5, kidB = tp > 4.5 && tp < 7.5;
  if (abs(T.x - tp) > 0.5 && T.x > 0.5 && tp > 0.5 && !(kidA && kidB)) val += (T.x > 7.5 && T.x < 8.5) ? 0.0 : 0.42;
  // surfaces des os et du calcul très brillantes, bruit derrière le gaz
  if (T.x > 8.5 && T.x < 10.5 && tp < 8.5) val = 1.3;
  val *= clamp(exp(-att), 0.0, 1.75);
  val += 0.4 * exp(-r / 0.35);
  val *= pow(10.0, uGain / 20.0) * (0.92 + 0.08 * h31(vec3(gl_FragCoord.xy, uTime)));
  val = clamp(val, 0.0, 1.0);
  gl_FragColor = vec4(vec3(pow(val, 0.85)) * vec3(0.98, 0.99, 1.0), 1.0);
}`;

const US = {
  renderer: null, mat: null, scene: null, cam: null, probe: { theta: -100, y: 3.5, rot: -15, tilt: 0, depth: 15, gain: 0 }, breath: 0, target: 'rein_d', shots: [], dirty: true, t: 0,
  init() {
    if (this.renderer || !HAS_GL) return;
    const cv = $('#usImage');
    this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(cv.width, cv.height, false);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uO: { value: new THREE.Vector3() }, uD: { value: new THREE.Vector3() }, uU: { value: new THREE.Vector3() }, uDepth: { value: 15 }, uGain: { value: 0 },
        uBreath: { value: 0 }, uHydro: { value: 0.65 }, uTime: { value: 0 }, uContact: { value: 1 }, kRm: { value: kidMat(KID.R) }, kLm: { value: kidMat(KID.L) },
        kRc: { value: KID.R.c.clone() }, kLc: { value: KID.L.c.clone() }, uStone: { value: STONE.clone() }, uAspect: { value: cv.width / cv.height }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: US_FRAG
    });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
    this.cam = new THREE.Camera();
    this.bind();
  },
  bind() {
    const body = $('#usBody');
    let drag = false;
    const toProbe = e => {
      const r = body.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * body.width, y = (e.clientY - r.top) / r.height * body.height;
      this.probe.theta = clamp((x - 300) / 260 * 165, -165, 165);
      this.probe.y = clamp(24 - (y - 60) / 700 * 50, -26, 24);
      this.dirty = true;
    };
    body.addEventListener('pointerdown', e => { drag = true; try { body.setPointerCapture(e.pointerId); } catch (err) { /* rien */ } toProbe(e); });
    body.addEventListener('pointermove', e => { if (drag) toProbe(e); });
    body.addEventListener('pointerup', () => { drag = false; });
    body.addEventListener('wheel', e => { e.preventDefault(); this.probe.rot = clamp(this.probe.rot + Math.sign(e.deltaY) * 5, -90, 90); $('#usRot').value = this.probe.rot; this.dirty = true; }, { passive: false });
    const sl = (id, key, fmt) => { const el = $(id); el.oninput = () => { this.probe[key] = +el.value; $(id + 'V').textContent = fmt(+el.value); this.dirty = true; }; };
    sl('#usRot', 'rot', v => v + '°'); sl('#usTilt', 'tilt', v => v + '°'); sl('#usDepth', 'depth', v => v + ' cm'); sl('#usGain', 'gain', v => (v > 0 ? '+' : '') + v + ' dB');
    $('#usBreath').onclick = () => { this.breath = this.breath > 0.5 ? 0 : 1; $('#usBreath').setAttribute('aria-pressed', String(this.breath > 0.5)); $('#usBreath').textContent = this.breath > 0.5 ? 'Respiration libre' : 'Inspiration bloquée'; this.dirty = true; };
    $('#usSnap').onclick = () => this.snap();
    $('#usRead').onclick = () => this.quiz();
    $('#usClose').onclick = () => this.close();
  },
  open(onClose) {
    this.init();
    this.onClose = onClose;
    $('#usPanel').hidden = false;
    $('#usQuiz').innerHTML = '';
    this.renderTargets();
    this.syncSliders();
    this.dirty = true;
    App.frameHooks.add(this.hook);
  },
  hook: (dt) => US.frame(dt),
  syncSliders() {
    const p = this.probe;
    for (const [id, k, f] of [['#usRot', 'rot', v => v + '°'], ['#usTilt', 'tilt', v => v + '°'], ['#usDepth', 'depth', v => v + ' cm'], ['#usGain', 'gain', v => (v > 0 ? '+' : '') + v + ' dB']]) { $(id).value = p[k]; $(id + 'V').textContent = f(p[k]); }
  },
  renderTargets() {
    const guide = Sim.S && Sim.S.mode !== 'exam';
    const T = [['rein_d', 'Rein droit'], ['rein_g', 'Rein gauche'], ['vessie', 'Vessie']];
    $('#usHelp').innerHTML = 'Faites glisser la sonde sur le corps ; la molette ou le curseur la tourne. Ce que vous cherchez : ' +
      T.map(([k, l]) => `<button class="linkbtn" data-t="${k}" style="${this.target === k ? 'font-weight:700' : ''}">${l}</button>`).join(' · ') + (guide ? '' : ' (mode examen : pas d\'aide)');
    $$('#usHelp [data-t]').forEach(b => b.onclick = () => { this.target = b.dataset.t; this.renderTargets(); this.dirty = true; });
  },
  frame(dt) {
    this.t += dt;
    if ($('#usPanel').hidden) return;
    this.tAcc = (this.tAcc || 0) + dt;
    if (!this.dirty && this.tAcc < 0.12) return;
    this.tAcc = 0; this.dirty = false;
    const f = probeFrame(this.probe);
    const U = this.mat.uniforms;
    U.uO.value.copy(f.O); U.uD.value.copy(f.d); U.uU.value.copy(f.u).negate();
    U.uDepth.value = this.probe.depth; U.uGain.value = this.probe.gain; U.uBreath.value = this.breath; U.uTime.value = this.t;
    U.uHydro.value = Sim.S && Sim.S.flags.hydro !== undefined ? Sim.S.flags.hydro : 0.65;
    this.renderer.render(this.scene, this.cam);
    this.drawBody(f);
    const qy = this.quality();
    this.lastQ = qy;
    $('#usOverlay').innerHTML = `AURA ÉCHO · ${this.probe.depth} cm · gain ${this.probe.gain >= 0 ? '+' : ''}${this.probe.gain} dB<br>${Math.abs(this.probe.rot) < 35 ? 'coupe longitudinale' : Math.abs(this.probe.rot) > 60 ? 'coupe transversale' : 'coupe oblique'}${this.breath > 0.5 ? ' · inspiration bloquée' : ''}`;
    $('#usGuide').textContent = Sim.S && Sim.S.mode === 'exam' ? 'Mode examen : interprétez seul, comme sans liaison avec le sol.' : qy.msg;
  },
  ribHit(O, P) {
    for (let i = 1; i < 30; i++) {
      const p = O.clone().lerp(P, i / 30);
      const rn = Math.hypot(p.x / BODY.a, p.z / BODY.b);
      const dsk = (1 - rn) * 13;
      const th = Math.atan2(p.x / BODY.a, p.z / BODY.b) / DEG;
      if (Math.abs(th) > 55 && dsk > 0.7 && dsk < 1.9) for (const yr of ribHeights(th)) if (Math.abs(p.y - yr) < 0.8) return true;
    }
    return false;
  },
  quality() {
    const p = this.probe;
    const sb = this.breath * 2.5;
    const isK = this.target !== 'vessie';
    const k = this.target === 'rein_d' ? KID.R : KID.L;
    const target = isK ? k.c.clone().add(new THREE.Vector3(0, -sb, 0)) : STONE.clone();
    const axis = isK ? kidAxis(k) : null;
    const offAt = q => { const f2 = probeFrame(q); return target.clone().sub(f2.O).dot(f2.w); };
    const angAt = q => { const f2 = probeFrame(q); return Math.asin(clamp(Math.abs(axis.dot(f2.w)), 0, 1)) / DEG; };
    const f = probeFrame(p);
    const rel = target.clone().sub(f.O);
    const depth = rel.dot(f.d), lat = rel.dot(f.u), off = rel.dot(f.w);
    const res = { ok: false, msg: '' };
    const side = this.target === 'rein_d' ? 'droit' : 'gauche';
    if (isK) {
      const want = this.target === 'rein_d' ? -1 : 1;
      if (Math.sign(p.theta) !== want || Math.abs(p.theta) < 100) { res.msg = `Placez la sonde sur le flanc ${side} du patient, un peu en arrière de la ligne pointillée (ligne axillaire moyenne), au niveau des dernières côtes.`; return res; }
      if (Math.abs(p.theta) > 150) { res.msg = 'Vous êtes trop dans le dos : revenez un peu vers le flanc.'; return res; }
    } else if (Math.abs(p.theta) > 25) { res.msg = 'Placez la sonde au milieu du ventre, juste au-dessus du pubis.'; return res; }
    const dy = target.y - p.y;
    if (Math.abs(dy) > (isK ? 3 : 1.2)) { res.msg = dy > 0 ? `Remontez la sonde d'environ ${Math.round(dy)} cm.` : `Descendez la sonde d'environ ${Math.round(-dy)} cm.`; return res; }
    if (isK && this.ribHit(f.O, target)) { res.msg = 'Une côte fait de l\'ombre sur le rein : glissez la sonde d\'un centimètre entre deux côtes, ou demandez une grande inspiration bloquée.'; return res; }
    if (!isK && Math.abs(p.rot) < 60) { res.msg = 'Tournez la sonde en travers du corps (rotation proche de 90°).'; return res; }
    if (Math.abs(off) > (isK ? 1.0 : 0.22)) {
      const up = Math.abs(offAt({ ...p, tilt: p.tilt + 5 })), dn = Math.abs(offAt({ ...p, tilt: p.tilt - 5 }));
      const canUp = p.tilt + 5 <= 40, canDn = p.tilt - 5 >= -40;
      if ((up < Math.abs(off) && canUp) || (dn < Math.abs(off) && canDn)) {
        const right = up < dn;
        const w = probeFrame({ ...p, tilt: p.tilt + (right ? 5 : -5) }).d.clone().sub(f.d);
        const toward = isK ? (w.z < 0 ? 'vers le dos' : 'vers le ventre') : (w.y > 0 ? 'vers la tête' : 'vers les pieds');
        res.msg = `Le ${isK ? 'rein' : 'calcul'} est juste à côté du plan de coupe : inclinez la sonde pour viser un peu plus ${toward} (curseur Inclinaison vers la ${right ? 'droite' : 'gauche'}).`;
      } else {
        const back = Math.abs(offAt({ ...p, theta: p.theta + Math.sign(p.theta || 1) * 5 })) < Math.abs(off);
        res.msg = isK ? `Déplacez la sonde un peu plus ${back ? 'vers le dos' : 'vers le ventre'}.` : 'Recentrez la sonde au-dessus du pubis.';
      }
      return res;
    }
    if (depth >= p.depth - 0.5) { res.msg = 'Augmentez la profondeur.'; return res; }
    if (Math.abs(Math.atan2(lat, depth)) > 0.5) { res.msg = lat > 0 ? 'La cible est au bord de l\'image : faites glisser la sonde vers le repère.' : 'La cible est au bord de l\'image : faites glisser la sonde à l\'opposé du repère.'; return res; }
    if (isK) {
      const ang = angAt(p);
      if (ang > 14) {
        const r = angAt({ ...p, rot: p.rot + 5 }) < angAt({ ...p, rot: p.rot - 5 });
        res.msg = `Le rein est coupé de travers : tournez la sonde d'environ ${Math.round(ang)}° (curseur Rotation vers la ${r ? 'droite' : 'gauche'}) pour suivre son grand axe.`;
        return res;
      }
    }
    res.ok = true;
    res.msg = isK ? `Bonne coupe du rein ${side} dans son grand axe. Enregistrez l'image.` : 'Coupe transversale de la vessie, avec l\'entrée de l\'uretère droit. Enregistrez l\'image.';
    return res;
  },
  drawBody(f) {
    const c = $('#usBody'), g = c.getContext('2d'), W = c.width, H = c.height;
    g.fillStyle = '#0a0b0e'; g.fillRect(0, 0, W, H);
    const X = th => 300 + th / 165 * 260, Y = y => 60 + (24 - y) / 50 * 700;
    const skin = g.createLinearGradient(40, 0, 560, 0);
    skin.addColorStop(0, '#5a4235'); skin.addColorStop(0.5, '#a07a62'); skin.addColorStop(1, '#5a4235');
    g.fillStyle = skin; g.beginPath(); g.roundRect ? g.roundRect(40, 60, 520, 700, 40) : g.rect(40, 60, 520, 700); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2;
    for (const side of [-1, 1]) {
      for (let th = 55; th <= 165; th += 2) {
        for (const yr of ribHeights(th)) { g.fillStyle = 'rgba(240,235,225,0.25)'; g.fillRect(X(side * th) - 1.5, Y(yr) - 5, 3.5, 10); }
      }
    }
    g.setLineDash([6, 6]);
    for (const th of [-90, 0, 90]) { g.beginPath(); g.moveTo(X(th), 70); g.lineTo(X(th), 750); g.stroke(); }
    g.setLineDash([]);
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.beginPath(); for (let th = -150; th <= 150; th += 5) { const y = -12 - 0.02 * Math.abs(th); th === -150 ? g.moveTo(X(th), Y(y)) : g.lineTo(X(th), Y(y)); } g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(X(0), Y(-5), 5, 0, 7); g.fill();
    g.font = '600 15px ' + getComputedStyle(document.body).fontFamily; g.fillStyle = '#d9dbe3'; g.textAlign = 'center';
    g.fillText('ventre', X(0), 44); g.fillText('flanc droit', X(-90), 44); g.fillText('flanc gauche', X(90), 44);
    g.fillText('dos', X(-150), 44); g.fillText('dos', X(150), 44);
    g.font = '500 13px ' + getComputedStyle(document.body).fontFamily; g.fillStyle = '#b7b9c7';
    g.fillText('côtes', X(-128), Y(12.5)); g.fillText('nombril', X(0) + 36, Y(-5) + 4); g.fillText('pubis', X(0), Y(-24.5)); g.fillText('crête iliaque', X(-95), Y(-14.5));
    g.textAlign = 'left';
    // zone cible (mode guidé)
    if (Sim.S && Sim.S.mode !== 'exam') {
      g.strokeStyle = 'rgba(155,140,246,0.75)'; g.lineWidth = 2; g.setLineDash([4, 4]);
      const z = this.target === 'vessie' ? [0, -20.5, 22, 3.5] : this.target === 'rein_d' ? [-128, 2.0, 26, 8] : [128, 3.6, 26, 8];
      g.strokeRect(X(z[0] - z[2] / 2), Y(z[1] + z[3] / 2), X(z[2] / 2) - X(-z[2] / 2) - 0, Y(-z[3] / 2) - Y(z[3] / 2));
      g.setLineDash([]);
    }
    // sonde : empreinte orientée et repère vers la tête quand la rotation est nulle
    const px = X(this.probe.theta), py = Y(this.probe.y);
    const ang = -this.probe.rot * DEG;
    g.save(); g.translate(px, py); g.rotate(ang);
    g.fillStyle = 'rgba(235,236,240,0.95)'; g.strokeStyle = '#1b1c22'; g.lineWidth = 2;
    g.beginPath(); g.roundRect ? g.roundRect(-9, -36, 18, 72, 8) : g.rect(-9, -36, 18, 72); g.fill(); g.stroke();
    g.fillStyle = '#9b8cf6'; g.beginPath(); g.arc(0, -30, 5, 0, 7); g.fill();
    g.restore();
  },
  snap() {
    const q = this.quality();
    const url = $('#usImage').toDataURL('image/jpeg', 0.75);
    this.shots.push({ target: this.target, ok: q.ok, url, t: Sim.S ? Sim.S.t : 0 });
    const img = document.createElement('img'); img.src = url; img.alt = 'Image enregistrée : ' + this.target;
    $('#usShots').appendChild(img);
    if (Sim.S) {
      const F = Sim.S.flags;
      F.usShots = (F.usShots || 0) + 1;
      if (q.ok) { F['us_' + this.target] = true; Sim.addLog(Sim.S.t, 'find', `Image enregistrée : ${this.target === 'vessie' ? 'vessie' : this.target === 'rein_d' ? 'rein droit' : 'rein gauche'}, coupe de bonne qualité.`); }
      else Sim.addLog(Sim.S.t, 'find', 'Image enregistrée, mais la coupe n\'est pas celle qu\'on cherche.');
    }
  },
  quiz() {
    const F = Sim.S ? Sim.S.flags : {};
    const qs = [];
    if (F.us_rein_d) qs.push({ k: 'qd', q: 'Que montre le rein droit ?', o: ['Il est normal', 'Ses cavités sont dilatées par de l\'urine (hydronéphrose)', 'Du liquide entoure le rein', 'Une masse dans le rein'], a: 1 });
    if (F.us_rein_g) qs.push({ k: 'qg', q: 'Et le rein gauche ?', o: ['Il est normal', 'Ses cavités sont dilatées'], a: 0 });
    if (F.us_vessie) qs.push({ k: 'qv', q: 'Près de la vessie, à droite ?', o: ['Rien de particulier', 'Une tache très blanche avec une ombre noire derrière : un calcul', 'Un caillot de sang'], a: 1 });
    if (!qs.length) { $('#usQuiz').innerHTML = '<p class="small-print" style="margin-top:10px">Enregistrez d\'abord au moins une coupe de bonne qualité.</p>'; return; }
    $('#usQuiz').innerHTML = qs.map(x => `<div style="margin-top:12px"><b>${esc(x.q)}</b><div class="seg" data-k="${x.k}" style="margin-top:6px">${x.o.map((o, i) => `<button data-v="${i}">${esc(o)}</button>`).join('')}</div><div class="small-print" id="fb_${x.k}"></div></div>`).join('');
    for (const x of qs) {
      seg($(`[data-k="${x.k}"]`), undefined, v => {
        const ok = +v === x.a;
        $('#fb_' + x.k).textContent = ok ? 'Juste.' : 'Pas tout à fait : regardez à nouveau l\'image enregistrée.';
        if (Sim.S) { Sim.S.flags['quiz_' + x.k] = ok; }
      });
    }
  },
  close() {
    $('#usPanel').hidden = true;
    App.frameHooks.delete(this.hook);
    if (this.onClose) this.onClose();
  }
};
