/* Sophie, le personnage : un petit astre lumineux qui écoute, réfléchit, parle et sourit.
   Animation procédurale (une seule boucle pour tous les exemplaires) : flottement,
   respiration, clignements, regard qui suit le pointeur, bouche qui suit la voix,
   halo qui réagit au micro, antenne souple, étincelles quand elle est contente. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const C = A.character = {};
  const instances = new Set();
  let pointer = { x: null, y: null, t: 0 };
  root.addEventListener && root.addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });

  let n = 0;
  function svg(id) {
    return `
<svg class="sophie" viewBox="0 0 260 270" role="img" aria-label="Sophie">
  <defs>
    <radialGradient id="${id}b" cx="36%" cy="28%" r="78%"><stop offset="0" stop-color="#F3EFFF"/><stop offset=".3" stop-color="#C2B6FF"/><stop offset=".7" stop-color="#7F69F3"/><stop offset="1" stop-color="#3F2CA8"/></radialGradient>
    <radialGradient id="${id}h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#B3A6FF" stop-opacity=".55"/><stop offset=".55" stop-color="#8E7BFF" stop-opacity=".18"/><stop offset="1" stop-color="#8E7BFF" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}t" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#FFFBEA"/><stop offset=".6" stop-color="#FFD98A"/><stop offset="1" stop-color="#FFB347"/></radialGradient>
    <radialGradient id="${id}c" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FF9FC9" stop-opacity=".75"/><stop offset="1" stop-color="#FF9FC9" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}r" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#79D8FF" stop-opacity="0"/><stop offset=".25" stop-color="#79D8FF" stop-opacity=".9"/><stop offset=".7" stop-color="#C9BFFF" stop-opacity=".85"/><stop offset="1" stop-color="#C9BFFF" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}rim" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#79D8FF" stop-opacity=".9"/><stop offset=".45" stop-color="#79D8FF" stop-opacity="0"/><stop offset=".6" stop-color="#FFB3D6" stop-opacity="0"/><stop offset="1" stop-color="#FFB3D6" stop-opacity=".7"/></linearGradient>
    <clipPath id="${id}top"><rect x="0" y="0" width="260" height="132"/></clipPath>
    <clipPath id="${id}bot"><rect x="0" y="132" width="260" height="140"/></clipPath>
    <filter id="${id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <ellipse class="s-shadow" cx="130" cy="252" rx="56" ry="8" fill="#05081A" opacity=".45"/>
  <circle class="s-halo" cx="130" cy="132" r="118" fill="url(#${id}h)"/>
  <g class="s-float">
    <g class="s-ring-back" clip-path="url(#${id}top)"><ellipse cx="130" cy="132" rx="122" ry="30" fill="none" stroke="url(#${id}r)" stroke-width="3" stroke-dasharray="2 10" transform="rotate(-14 130 132)" class="s-ringl"/></g>
    <g class="s-body">
      <g class="s-antenna"><path d="M130 56 C 128 40, 138 30, 146 22" fill="none" stroke="#6E58E8" stroke-width="6" stroke-linecap="round"/><circle class="s-tipglow" cx="147" cy="20" r="16" fill="#FFD98A" opacity=".35" filter="url(#${id}g)"/><circle class="s-tip" cx="147" cy="20" r="9" fill="url(#${id}t)"/></g>
      <circle cx="130" cy="132" r="80" fill="url(#${id}b)"/>
      <circle cx="130" cy="132" r="79" fill="none" stroke="url(#${id}rim)" stroke-width="3"/>
      <ellipse cx="100" cy="94" rx="26" ry="13" fill="#fff" opacity=".34" transform="rotate(-28 100 94)"/>
      <ellipse cx="88" cy="88" rx="6" ry="4" fill="#fff" opacity=".6" transform="rotate(-28 88 88)"/>
      <g class="s-face">
        <ellipse class="s-cheek" cx="86" cy="156" rx="17" ry="11" fill="url(#${id}c)"/>
        <ellipse class="s-cheek" cx="174" cy="156" rx="17" ry="11" fill="url(#${id}c)"/>
        <path class="s-brow s-brow-l" d="M93 100 Q104 94 115 99" fill="none" stroke="#3A2AA0" stroke-width="5" stroke-linecap="round" opacity=".75"/>
        <path class="s-brow s-brow-r" d="M145 99 Q156 94 167 100" fill="none" stroke="#3A2AA0" stroke-width="5" stroke-linecap="round" opacity=".75"/>
        <g class="s-eyes">
          <g class="s-eye s-eye-l"><ellipse cx="104" cy="128" rx="13.5" ry="17.5" fill="#fff"/><g class="s-pupil"><circle cx="104" cy="130" r="8" fill="#1F1757"/><circle cx="108" cy="124.5" r="3.4" fill="#fff"/><circle cx="101" cy="134" r="1.6" fill="#fff" opacity=".8"/></g></g>
          <g class="s-eye s-eye-r"><ellipse cx="156" cy="128" rx="13.5" ry="17.5" fill="#fff"/><g class="s-pupil"><circle cx="156" cy="130" r="8" fill="#1F1757"/><circle cx="160" cy="124.5" r="3.4" fill="#fff"/><circle cx="153" cy="134" r="1.6" fill="#fff" opacity=".8"/></g></g>
        </g>
        <path class="s-happy" d="M92 131 Q104 115 116 131 M144 131 Q156 115 168 131" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0"/>
        <path class="s-mouth" d="M118 160 Q130 170 142 160" fill="none" stroke="#2A1F6E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse class="s-tongue" cx="130" cy="167" rx="6" ry="3" fill="#FF8FB8" opacity="0"/>
      </g>
    </g>
    <g class="s-ring-front" clip-path="url(#${id}bot)"><ellipse cx="130" cy="132" rx="122" ry="30" fill="none" stroke="url(#${id}r)" stroke-width="3" stroke-dasharray="2 10" transform="rotate(-14 130 132)" class="s-ringl"/></g>
    <g class="s-sparks" opacity="0">
      <path d="M44 70 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="#FFE3A3"/>
      <path d="M214 84 l2.4 7 7 2.4 -7 2.4 -2.4 7 -2.4 -7 -7 -2.4 7 -2.4z" fill="#C9F1FF"/>
      <path d="M206 196 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#FFC6E3"/>
      <path d="M56 186 l1.8 5 5 1.8 -5 1.8 -1.8 5 -1.8 -5 -5 -1.8 5 -1.8z" fill="#FFE3A3"/>
    </g>
    <g class="s-dots" opacity="0"><circle cx="186" cy="58" r="6" fill="#E6E1FF"/><circle cx="204" cy="42" r="7.5" fill="#E6E1FF"/><circle cx="224" cy="24" r="9" fill="#E6E1FF"/></g>
  </g>
</svg>`;
  }

  C.create = function (host, opts) {
    opts = opts || {};
    const id = 'so' + (++n);
    host.insertAdjacentHTML('beforeend', svg(id));
    const el = host.lastElementChild;
    // le nom choisi par l'astronaute, pour les lecteurs d'écran
    try { if (A.store && A.store.state && A.store.state.who) el.setAttribute('aria-label', A.store.sophieName(A.store.state.who)); } catch (e) { /* rien */ }
    const q = s => el.querySelector(s);
    const parts = {
      float: q('.s-float'), body: q('.s-body'), halo: q('.s-halo'), shadow: q('.s-shadow'), antenna: q('.s-antenna'), tip: q('.s-tipglow'),
      eyes: q('.s-eyes'), eyeL: q('.s-eye-l'), eyeR: q('.s-eye-r'), pupils: el.querySelectorAll('.s-pupil'), happy: q('.s-happy'),
      browL: q('.s-brow-l'), browR: q('.s-brow-r'), mouth: q('.s-mouth'), tongue: q('.s-tongue'), sparks: q('.s-sparks'), dots: q('.s-dots'),
      rings: el.querySelectorAll('.s-ringl'), cheeks: el.querySelectorAll('.s-cheek'), face: q('.s-face')
    };
    const inst = {
      el, host, parts, state: 'idle', emotion: 'neutral', level: 0, levelS: 0,
      blinkAt: performance.now() + 1500 + Math.random() * 3000, blinkT: -1,
      gaze: { x: 0, y: 0 }, gazeT: { x: 0, y: 0 }, wanderAt: 0,
      hopT: -1, pulse: 0, mouthO: 0, talkPhase: Math.random() * 10, ant: 0, antV: 0, small: !!opts.small, seed: Math.random() * 100,
      setState(s) { this.state = s; host.dataset.state = s; },
      setEmotion(e) { this.emotion = e || 'neutral'; },
      setLevel(v) { this.level = A.clamp(v || 0, 0, 1); },
      speakPulse(k) { this.pulse = Math.min(1, this.pulse + (k || 0.6)); },
      hop() { this.hopT = performance.now(); this.antV += 4; },
      destroy() { instances.delete(this); el.remove(); }
    };
    instances.add(inst);
    ensureLoop();
    return inst;
  };

  let running = false;
  function ensureLoop() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }
  const reduced = () => A.reduced();
  function frame(now) {
    if (!instances.size) { running = false; return; }
    const t = now / 1000;
    instances.forEach(inst => { if (inst.el.isConnected) step(inst, now, t); else instances.delete(inst); });
    requestAnimationFrame(frame);
  }

  function mouthPath(w, open, smile) {
    const cx = 130, y = 160;
    if (open < 0.06) {
      const c = y + smile * 11;
      return { d: `M${cx - w} ${y} Q${cx} ${c} ${cx + w} ${y}`, fill: 'none', tongue: 0 };
    }
    const top = y - 2 + smile * 3;
    const bot = y + 4 + open * 18 + smile * 3;
    return { d: `M${cx - w} ${y} Q${cx} ${top} ${cx + w} ${y} Q${cx + w * .55} ${bot} ${cx} ${bot} Q${cx - w * .55} ${bot} ${cx - w} ${y} Z`, fill: '#2A1F6E', tongue: open > .35 ? (open - .35) * 1.6 : 0, bot };
  }

  function step(I, now, t) {
    const P = I.parts;
    const red = reduced();
    const st = I.state;
    // flottement et respiration
    const sp = st === 'talking' ? 2.2 : st === 'listening' ? 1.8 : 1.25;
    let fy = red ? 0 : Math.sin(t * sp + I.seed) * (st === 'thinking' ? 3 : 6);
    let sx = 1, sy = 1;
    if (!red) { const br = Math.sin(t * sp * 1.1 + I.seed) * 0.012; sx = 1 + br; sy = 1 - br; }
    if (I.hopT > 0) {
      const k = (now - I.hopT) / 700;
      if (k >= 1) I.hopT = -1;
      else { fy -= Math.sin(k * Math.PI) * 26; const sq = Math.sin(k * Math.PI * 2) * 0.05; sx += sq; sy -= sq; }
    }
    I.pulse *= 0.9;
    if (st === 'talking' && !red) { sy += I.pulse * 0.025; sx -= I.pulse * 0.02; }
    P.float.setAttribute('transform', `translate(0 ${fy.toFixed(2)})`);
    P.body.setAttribute('transform', `translate(130 212) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-130 -212)`);
    P.shadow.setAttribute('rx', (56 - fy * 0.6).toFixed(1));
    P.shadow.setAttribute('opacity', (0.45 - fy * 0.008).toFixed(2));

    // halo : réagit au micro quand elle écoute
    I.levelS += (I.level - I.levelS) * 0.25;
    let hs = 1 + (red ? 0 : Math.sin(t * 1.4) * 0.03);
    if (st === 'listening') hs = 1.04 + I.levelS * 0.32 + (red ? 0 : Math.sin(t * 5) * 0.02);
    if (st === 'talking') hs = 1.02 + I.pulse * 0.08;
    P.halo.setAttribute('transform', `translate(130 132) scale(${hs.toFixed(3)}) translate(-130 -132)`);

    // anneau qui tourne
    const off = (-(t * (st === 'thinking' ? 40 : 14)) % 48).toFixed(1);
    P.rings.forEach(r => r.setAttribute('stroke-dashoffset', off));

    // antenne souple (ressort)
    const target = st === 'listening' ? Math.sin(t * 6) * 6 : Math.sin(t * 1.6 + I.seed) * 5;
    I.antV += (target - I.ant) * 0.08; I.antV *= 0.86; I.ant += I.antV;
    P.antenna.setAttribute('transform', `rotate(${(red ? 0 : I.ant).toFixed(2)} 130 58)`);
    const glow = st === 'listening' ? 0.45 + I.levelS * 0.5 : st === 'thinking' ? 0.3 + (Math.sin(t * 6) + 1) * 0.2 : 0.3 + (Math.sin(t * 2) + 1) * 0.08;
    P.tip.setAttribute('opacity', glow.toFixed(2));

    // regard : suit le pointeur, sinon se promène
    const r = I.el.getBoundingClientRect();
    if (pointer.x !== null && now - pointer.t < 2500 && r.width) {
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.48;
      const dx = pointer.x - cx, dy = pointer.y - cy;
      const d = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, d / 260);
      I.gazeT = { x: dx / d * 4.2 * k, y: dy / d * 3.6 * k };
    } else if (now > I.wanderAt) {
      I.wanderAt = now + 1600 + Math.random() * 2600;
      I.gazeT = Math.random() < 0.5 ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * 7, y: (Math.random() - 0.5) * 4 };
    }
    if (st === 'thinking') I.gazeT = { x: 3.5, y: -4 };
    I.gaze.x += (I.gazeT.x - I.gaze.x) * 0.12;
    I.gaze.y += (I.gazeT.y - I.gaze.y) * 0.12;
    P.pupils.forEach(p => p.setAttribute('transform', `translate(${I.gaze.x.toFixed(2)} ${I.gaze.y.toFixed(2)})`));
    P.face.setAttribute('transform', `translate(${(I.gaze.x * 0.6).toFixed(2)} ${(I.gaze.y * 0.5).toFixed(2)})`);

    // clignements
    let blink = 0;
    if (now > I.blinkAt && I.blinkT < 0) I.blinkT = now;
    if (I.blinkT > 0) {
      const k = (now - I.blinkT) / 150;
      if (k >= 1) { I.blinkT = -1; I.blinkAt = now + 2200 + Math.random() * 4200; if (Math.random() < 0.18) I.blinkAt = now + 220; }
      else blink = Math.sin(k * Math.PI);
    }
    const emo = I.emotion;
    const happy = emo === 'happy' && st !== 'listening';
    let eyeSy = 1 - blink * 0.92;
    if (emo === 'concerned') eyeSy *= 0.9;
    if (emo === 'surprised') eyeSy *= 1.1;
    [P.eyeL, P.eyeR].forEach((e, i) => {
      const cx = i ? 156 : 104;
      e.setAttribute('transform', `translate(${cx} 128) scale(1 ${eyeSy.toFixed(3)}) translate(${-cx} -128)`);
      e.setAttribute('opacity', happy ? 0 : 1);
    });
    P.happy.setAttribute('opacity', happy ? 1 : 0);

    // sourcils selon l'émotion
    const bl = emo === 'concerned' ? 'rotate(10 104 98) translate(0 2)' : emo === 'happy' ? 'translate(0 -4)' : emo === 'surprised' ? 'translate(0 -7)' : st === 'thinking' ? 'rotate(-6 104 98) translate(0 -3)' : 'translate(0 0)';
    const brr = emo === 'concerned' ? 'rotate(-10 156 98) translate(0 2)' : emo === 'happy' ? 'translate(0 -4)' : emo === 'surprised' ? 'translate(0 -7)' : st === 'thinking' ? 'rotate(4 156 98) translate(0 -1)' : 'translate(0 0)';
    P.browL.setAttribute('transform', bl);
    P.browR.setAttribute('transform', brr);

    // bouche
    let open = 0;
    if (st === 'talking') {
      I.talkPhase += 0.32 + Math.random() * 0.08;
      const base = (Math.sin(I.talkPhase) + 1) / 2 * 0.55 + Math.abs(Math.sin(I.talkPhase * 0.47)) * 0.25;
      open = red ? 0.3 : A.clamp(base * 0.75 + I.pulse * 0.5, 0.08, 1);
    } else if (emo === 'surprised') open = 0.45;
    I.mouthO += (open - I.mouthO) * 0.45;
    const smile = emo === 'happy' ? 1 : emo === 'concerned' ? -0.25 : st === 'listening' ? 0.45 : 0.7;
    const w = 12 + (emo === 'happy' ? 4 : 0) - I.mouthO * 2;
    const m = mouthPath(w, I.mouthO, smile);
    P.mouth.setAttribute('d', m.d);
    P.mouth.setAttribute('fill', m.fill);
    P.tongue.setAttribute('opacity', (m.tongue || 0).toFixed(2));
    if (m.bot) P.tongue.setAttribute('cy', (m.bot - 4).toFixed(1));
    P.cheeks.forEach(c => c.setAttribute('opacity', emo === 'happy' ? 1 : emo === 'concerned' ? 0.35 : 0.7));

    // étincelles et points de réflexion
    const sOp = happy ? 0.9 + Math.sin(t * 6) * 0.1 : 0;
    P.sparks.setAttribute('opacity', sOp.toFixed(2));
    if (happy && !red) P.sparks.setAttribute('transform', `rotate(${(Math.sin(t) * 4).toFixed(2)} 130 132) translate(130 132) scale(${(1 + Math.sin(t * 3) * 0.04).toFixed(3)}) translate(-130 -132)`);
    if (st === 'thinking') {
      P.dots.setAttribute('opacity', 1);
      Array.from(P.dots.children).forEach((c, i) => c.setAttribute('opacity', (0.25 + 0.75 * Math.max(0, Math.sin(t * 5 - i * 0.9))).toFixed(2)));
    } else P.dots.setAttribute('opacity', 0);
  }
})(typeof self !== 'undefined' ? self : this);
