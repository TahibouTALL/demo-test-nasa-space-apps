/* AURA : personnages dessinés (équipage) et mouvements animés.
   Le même code dessine les exercices de la section sport (navigateur) et les films (rendu hors ligne).
   Unités : 1 = taille d'un personnage debout ; origine au bassin ; y vers le bas. */
(function (root) {
  'use strict';
  const A = root.AURA = root.AURA || {};
  const R = A.rig = {};
  const PI = Math.PI, sin = Math.sin, cos = Math.cos;

  // ---------------------------------------------------------------- équipage
  R.CAST = {
    lucas: { skin: '#F1C4A0', hair: '#6B4528', style: 'short', shirt: '#3567D6', pants: '#2A3247', socks: '#E9ECF3' },
    rafael: { skin: '#C2875E', hair: '#2A1E18', style: 'curly', beard: true, shirt: '#F08A3C', pants: '#2A3247', socks: '#E9ECF3' },
    aminata: { skin: '#7E4E32', hair: '#17110F', style: 'bun', shirt: '#15A58E', pants: '#2A3247', socks: '#E9ECF3' },
    keiko: { skin: '#F4D1AE', hair: '#121016', style: 'bob', shirt: '#7C5CDB', pants: '#2A3247', socks: '#E9ECF3' },
    coach: { skin: '#B98463', hair: '#1E1814', style: 'short', shirt: '#4FB3FF', pants: '#28304A', socks: '#E9ECF3' }
  };
  // proportions (grosse tête, membres épais : style dessin animé)
  const L = { torso: 0.3, neck: 0.035, head: 0.112, upper: 0.155, fore: 0.145, thigh: 0.2, shin: 0.2, foot: 0.1, shW: 0.105, hipW: 0.06 };
  R.L = L;
  const W = { upper: 0.056, fore: 0.05, thigh: 0.078, shin: 0.062, hand: 0.031 };

  // ---------------------------------------------------------------- couleurs
  function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function shade(c, k) { const [r, g, b] = hex(c); const f = v => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)))); return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')'; }
  function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')'; }
  R.shade = shade; R.mix = mix;
  R.ACCENT = '#FF6B5A';

  // ---------------------------------------------------------------- outils
  const dir = a => [sin(a), cos(a)];              // angle mesuré depuis la verticale descendante, positif vers l'avant (+x)
  function seg(ctx, x1, y1, x2, y2, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function dot(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fill(); }
  const lerp = (a, b, t) => a + (b - a) * t;
  R.lerp = lerp;
  R.ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  R.smooth = t => t * t * (3 - 2 * t);
  R.wave = (t, f = 1, ph = 0) => sin((t * f + ph) * PI * 2);

  // mélange de deux poses (les angles et la position du bassin) ; les expressions prennent la seconde
  R.blend = function (p, q, t) {
    if (t <= 0) return p; if (t >= 1) return q;
    const o = Object.assign({}, q);
    for (const k in q) if (typeof q[k] === 'number' && typeof p[k] === 'number') o[k] = lerp(p[k], q[k], t);
    o.face = t < 0.5 ? p.face : q.face;
    return o;
  };

  // ---------------------------------------------------------------- visage
  // face : { eye: open|closed|happy|squint|wide|dizzy, mouth: smile|grin|neutral|frown|o|talk|wavy|grit|sleep, brow: 0 (neutre) .. 1 (inquiet) | -1 (fâché), tint: 0..1 (malade), blush }
  function eyes(ctx, ex, ey, r, f, t) {
    const e = f.eye || 'open';
    ctx.lineCap = 'round';
    if (e === 'closed' || e === 'happy') {
      ctx.strokeStyle = '#1C1B26'; ctx.lineWidth = r * 0.7; ctx.beginPath();
      if (e === 'happy') ctx.arc(ex, ey + r * 0.4, r * 1.05, PI * 1.15, PI * 1.85); else ctx.arc(ex, ey - r * 0.6, r * 1.05, PI * 0.2, PI * 0.8);
      ctx.stroke(); return;
    }
    if (e === 'squint') { seg(ctx, ex - r * 1.1, ey, ex + r * 1.1, ey - r * 0.2, r * 0.75, '#1C1B26'); return; }
    if (e === 'dizzy') {
      ctx.strokeStyle = '#1C1B26'; ctx.lineWidth = r * 0.45; ctx.beginPath();
      for (let i = 0; i <= 20; i++) { const a = i / 20 * PI * 3.2 + t * 8, rr = r * 1.3 * i / 20; const x = ex + cos(a) * rr, y = ey + sin(a) * rr; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke(); return;
    }
    // clignement de temps en temps
    const blink = f.blink !== false && ((t * 0.31) % 1) > 0.965;
    if (blink) { seg(ctx, ex - r, ey, ex + r, ey, r * 0.6, '#1C1B26'); return; }
    const rr = e === 'wide' ? r * 1.35 : r;
    if (e === 'wide') dot(ctx, ex, ey, rr * 1.25, '#FFFFFF');
    dot(ctx, ex, ey, rr, '#1C1B26');
    dot(ctx, ex - rr * 0.32, ey - rr * 0.35, rr * 0.33, 'rgba(255,255,255,0.9)');
  }
  function brow(ctx, bx, by, w, f, side) {
    const b = f.brow || 0;   // 1 = inquiet (côté intérieur relevé), -1 = fâché
    const inner = side > 0 ? -1 : 1;  // pour le profil : l'intérieur est vers le nez
    const y1 = by - b * w * 0.35 * (inner < 0 ? 1 : 0) + (b < 0 ? -b * w * 0.3 : 0);
    const y2 = by - b * w * 0.35 * (inner > 0 ? 1 : 0) - (b < 0 ? -b * w * 0.1 : 0);
    seg(ctx, bx - w / 2, y1, bx + w / 2, y2, w * 0.22, 'rgba(28,27,38,0.85)');
  }
  function mouth(ctx, mx, my, w, f, t, skin) {
    const m = f.mouth || 'smile';
    ctx.lineCap = 'round'; ctx.strokeStyle = '#3B1F1F'; ctx.lineWidth = w * 0.16;
    if (m === 'smile') { ctx.beginPath(); ctx.arc(mx, my - w * 0.35, w * 0.5, PI * 0.2, PI * 0.8); ctx.stroke(); }
    else if (m === 'grin') {
      ctx.fillStyle = '#5A2328'; ctx.beginPath(); ctx.moveTo(mx - w * 0.5, my - w * 0.08); ctx.quadraticCurveTo(mx, my + w * 0.6, mx + w * 0.5, my - w * 0.08); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(mx - w * 0.36, my - w * 0.08, w * 0.72, w * 0.13);
    } else if (m === 'neutral') { seg(ctx, mx - w * 0.3, my, mx + w * 0.3, my, w * 0.16, '#3B1F1F'); }
    else if (m === 'frown') { ctx.beginPath(); ctx.arc(mx, my + w * 0.45, w * 0.45, PI * 1.2, PI * 1.8); ctx.stroke(); }
    else if (m === 'o') { ctx.fillStyle = '#5A2328'; ctx.beginPath(); ctx.ellipse(mx, my, w * 0.17, w * 0.22, 0, 0, PI * 2); ctx.fill(); }
    else if (m === 'talk') {
      const o = 0.12 + 0.3 * Math.abs(sin(t * 11)) * (0.6 + 0.4 * sin(t * 3.7));
      ctx.fillStyle = '#5A2328'; ctx.beginPath(); ctx.ellipse(mx, my, w * 0.32, w * o, 0, 0, PI * 2); ctx.fill();
    } else if (m === 'wavy') {
      ctx.beginPath(); for (let i = 0; i <= 8; i++) { const x = mx - w * 0.38 + i / 8 * w * 0.76, y = my + sin(i * 1.6 + t * 6) * w * 0.07; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    } else if (m === 'grit') {
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#3B1F1F'; ctx.lineWidth = w * 0.1;
      ctx.beginPath(); ctx.rect(mx - w * 0.36, my - w * 0.1, w * 0.72, w * 0.22); ctx.fill(); ctx.stroke();
      seg(ctx, mx - w * 0.36, my + w * 0.01, mx + w * 0.36, my + w * 0.01, w * 0.06, '#3B1F1F');
    } else if (m === 'sleep') { ctx.fillStyle = '#5A2328'; ctx.beginPath(); ctx.ellipse(mx, my, w * 0.1, w * 0.08, 0, 0, PI * 2); ctx.fill(); }
  }

  // ---------------------------------------------------------------- cheveux
  function hairSide(ctx, c, r) {
    ctx.fillStyle = c.hair; ctx.beginPath();
    if (c.style === 'bob') {
      ctx.moveTo(r * 0.78, -r * 0.42);
      ctx.bezierCurveTo(r * 0.7, -r * 1.25, -r * 1.2, -r * 1.25, -r * 1.12, -r * 0.1);
      ctx.bezierCurveTo(-r * 1.1, r * 0.5, -r * 0.95, r * 0.78, -r * 0.55, r * 0.72);
      ctx.lineTo(-r * 0.3, r * 0.2); ctx.bezierCurveTo(-r * 0.2, -r * 0.3, r * 0.2, -r * 0.5, r * 0.78, -r * 0.42);
      ctx.fill();
      return;
    }
    ctx.moveTo(r * 0.82, -r * 0.48);
    ctx.bezierCurveTo(r * 0.8, -r * 1.22, -r * 1.15, -r * 1.25, -r * 1.06, -r * 0.05);
    ctx.bezierCurveTo(-r * 1.05, r * 0.35, -r * 0.8, r * 0.55, -r * 0.55, r * 0.42);
    ctx.bezierCurveTo(-r * 0.45, 0, -r * 0.1, -r * 0.4, r * 0.3, -r * 0.55);
    ctx.quadraticCurveTo(r * 0.6, -r * 0.6, r * 0.82, -r * 0.48);
    ctx.fill();
    if (c.style === 'curly') {
      for (let i = 0; i < 9; i++) { const a = PI * 1.05 + i / 8 * PI * 0.9; dot(ctx, cos(a) * r * 0.98, sin(a) * r * 0.98 - r * 0.08, r * 0.24, c.hair); }
    }
    if (c.style === 'bun') { dot(ctx, -r * 0.78, -r * 0.78, r * 0.4, c.hair); dot(ctx, -r * 0.88, -r * 0.88, r * 0.12, shade(c.hair, 1.25)); }
  }
  function hairFront(ctx, c, r) {
    ctx.fillStyle = c.hair; ctx.beginPath();
    if (c.style === 'bob') {
      ctx.moveTo(-r * 1.08, r * 0.62);
      ctx.bezierCurveTo(-r * 1.32, -r * 0.4, -r * 0.7, -r * 1.25, 0, -r * 1.18);
      ctx.bezierCurveTo(r * 0.7, -r * 1.25, r * 1.32, -r * 0.4, r * 1.08, r * 0.62);
      ctx.lineTo(r * 0.78, r * 0.62); ctx.bezierCurveTo(r * 0.85, 0, r * 0.7, -r * 0.42, r * 0.1, -r * 0.5);
      ctx.bezierCurveTo(-r * 0.4, -r * 0.55, -r * 0.85, -r * 0.3, -r * 0.78, r * 0.62); ctx.closePath(); ctx.fill();
      return;
    }
    ctx.moveTo(-r * 0.98, r * 0.05);
    ctx.bezierCurveTo(-r * 1.15, -r * 0.95, r * 1.15, -r * 0.95, r * 0.98, r * 0.05);
    ctx.bezierCurveTo(r * 0.85, -r * 0.35, r * 0.4, -r * 0.62, 0, -r * 0.56);
    ctx.bezierCurveTo(-r * 0.4, -r * 0.62, -r * 0.85, -r * 0.35, -r * 0.98, r * 0.05);
    ctx.fill();
    if (c.style === 'curly') for (let i = 0; i < 9; i++) { const a = PI * 1.08 + i / 8 * PI * 0.84; dot(ctx, cos(a) * r * 0.98, sin(a) * r * 0.98 - r * 0.05, r * 0.24, c.hair); }
    if (c.style === 'bun') { dot(ctx, 0, -r * 1.12, r * 0.38, c.hair); dot(ctx, -r * 0.1, -r * 1.22, r * 0.11, shade(c.hair, 1.25)); }
  }

  // ---------------------------------------------------------------- tête
  function head(ctx, c, f, t, view, tilt) {
    const r = L.head;
    ctx.save(); ctx.rotate(tilt || 0);
    const skin = f.tint ? mix(c.skin, '#9BCB7A', f.tint * 0.55) : c.skin;
    if (view === 'side') {
      // oreille, crâne, nez
      dot(ctx, -r * 0.1, r * 0.08, r * 0.2, shade(c.skin, 0.88));
      dot(ctx, 0, 0, r, skin);
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(r * 0.96, r * 0.08, r * 0.16, r * 0.13, 0, 0, PI * 2); ctx.fill();
      // ombre douce sur l'arrière du crâne
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.beginPath(); ctx.arc(0, 0, r, PI * 0.55, PI * 1.45); ctx.fill();
      hairSide(ctx, c, r);
      if (c.beard) { ctx.fillStyle = shade(c.hair, 1.05); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(-r * 0.05, r * 0.3); ctx.bezierCurveTo(0, r * 1.05, r * 0.85, r * 1.0, r * 0.88, r * 0.42); ctx.bezierCurveTo(r * 0.6, r * 0.72, r * 0.2, r * 0.7, -r * 0.05, r * 0.3); ctx.fill(); ctx.globalAlpha = 1; }
      if (f.blush || f.tint) dot(ctx, r * 0.42, r * 0.32, r * 0.16, f.tint ? 'rgba(120,170,90,0.35)' : 'rgba(255,120,110,0.28)');
      eyes(ctx, r * 0.48, -r * 0.08, r * 0.1, f, t);
      brow(ctx, r * 0.47, -r * 0.36, r * 0.32, f, 1);
      mouth(ctx, r * 0.66, r * 0.45, r * 0.42, f, t, skin);
    } else {
      dot(ctx, -r * 0.98, r * 0.1, r * 0.2, shade(c.skin, 0.88));
      dot(ctx, r * 0.98, r * 0.1, r * 0.2, shade(c.skin, 0.88));
      dot(ctx, 0, 0, r, skin);
      ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.beginPath(); ctx.arc(0, 0, r, -PI * 0.1, PI * 0.9); ctx.fill();
      hairFront(ctx, c, r);
      if (c.beard) { ctx.fillStyle = c.hair; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(-r * 0.86, r * 0.25); ctx.bezierCurveTo(-r * 0.7, r * 1.15, r * 0.7, r * 1.15, r * 0.86, r * 0.25); ctx.bezierCurveTo(r * 0.5, r * 0.72, -r * 0.5, r * 0.72, -r * 0.86, r * 0.25); ctx.fill(); ctx.globalAlpha = 1; }
      const lx = (f.look || 0) * r * 0.18;
      if (f.blush || f.tint) { dot(ctx, -r * 0.48 + lx, r * 0.3, r * 0.15, f.tint ? 'rgba(120,170,90,0.35)' : 'rgba(255,120,110,0.28)'); dot(ctx, r * 0.48 + lx, r * 0.3, r * 0.15, f.tint ? 'rgba(120,170,90,0.35)' : 'rgba(255,120,110,0.28)'); }
      eyes(ctx, -r * 0.34 + lx, -r * 0.04, r * 0.1, f, t); eyes(ctx, r * 0.34 + lx, -r * 0.04, r * 0.1, f, t);
      brow(ctx, -r * 0.36 + lx, -r * 0.33, r * 0.3, f, -1); brow(ctx, r * 0.36 + lx, -r * 0.33, r * 0.3, f, 1);
      ctx.fillStyle = shade(skin, 0.9); ctx.beginPath(); ctx.ellipse(lx * 1.2, r * 0.17, r * 0.09, r * 0.06, 0, 0, PI * 2); ctx.fill();
      mouth(ctx, lx * 1.1, r * 0.46, r * 0.4, f, t, skin);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- squelette
  // pose de profil : spine, head, shN, elN, shF, elF, hipN, knN, ankN, hipF, knF, ankF (radians)
  // pose de face   : view 'front', spine, head, shL, elL, shR, elR, hipL, knL, hipR, knR
  R.solve = function (p) {
    const o = {};
    const up = [sin(p.spine || 0), -cos(p.spine || 0)];
    o.S = [up[0] * L.torso, up[1] * L.torso];
    const hd = (p.spine || 0) + (p.head || 0);
    o.H = [o.S[0] + sin(hd) * (L.neck + L.head), o.S[1] - cos(hd) * (L.neck + L.head)];
    o.hd = hd;
    // poses d'origine : angles des membres mesurés depuis l'axe du torse ; poses « world » : angles absolus
    const base = p.world ? 0 : (p.spine || 0);
    const arm = (sx, sy, sh, el) => { const a1 = base + sh, e = [sx + sin(a1) * L.upper, sy + cos(a1) * L.upper]; const a2 = a1 + el; return { S: [sx, sy], E: e, W: [e[0] + sin(a2) * L.fore, e[1] + cos(a2) * L.fore], a1, a2 }; };
    const leg = (hx, hy, hip, kn, ank) => { const a1 = base + hip, k = [hx + sin(a1) * L.thigh, hy + cos(a1) * L.thigh]; const a2 = a1 - kn; const an = [k[0] + sin(a2) * L.shin, k[1] + cos(a2) * L.shin]; const a3 = (p.world ? 0 : a2) + PI / 2 - (ank || 0); return { H: [hx, hy], K: k, A: an, T: [an[0] + sin(a3) * L.foot, an[1] + cos(a3) * L.foot], a1, a2, a3 }; };
    if (p.view === 'front') {
      // de face : les angles tournent dans le plan de l'image, positif = vers l'extérieur
      const sp = p.spine || 0, c = cos(sp), s = sin(sp);
      const rot = (x, y) => [x * c - y * s, x * s + y * c];
      const shY = -L.torso + 0.03;
      const sL = rot(-L.shW, shY), sR = rot(L.shW, shY), hL = rot(-L.hipW, 0.01), hR = rot(L.hipW, 0.01);
      const armF = (S0, side, sh, el) => {
        const d1 = [side * sin(sh || 0), cos(sh || 0)], r1 = rot(d1[0], d1[1]); const Ep = [S0[0] + r1[0] * L.upper, S0[1] + r1[1] * L.upper];
        const a2 = (sh || 0) - (el || 0), d2 = [side * sin(a2), cos(a2)], r2 = rot(d2[0], d2[1]); const Wp = [Ep[0] + r2[0] * L.fore, Ep[1] + r2[1] * L.fore];
        return { S: S0, E: Ep, W: Wp };
      };
      const legF = (H0, side, hip, kn) => {
        const d1 = [side * sin(hip || 0), cos(hip || 0)], r1 = rot(d1[0], d1[1]); const K = [H0[0] + r1[0] * L.thigh, H0[1] + r1[1] * L.thigh];
        const a2 = (hip || 0) - (kn || 0), d2 = [side * sin(a2), cos(a2)], r2 = rot(d2[0], d2[1]); const An = [K[0] + r2[0] * L.shin, K[1] + r2[1] * L.shin];
        return { H: H0, K, A: An };
      };
      o.armL = armF(sL, -1, p.shL, p.elL); o.armR = armF(sR, 1, p.shR, p.elR);
      o.legL = legF(hL, -1, p.hipL, p.knL); o.legR = legF(hR, 1, p.hipR, p.knR);
      o.sL = sL; o.sR = sR; o.hL = hL; o.hR = hR;
      const nk = rot(0, -L.torso - L.neck - L.head + 0.01); o.H = nk; o.hd = sp + (p.head || 0);
      o.S = rot(0, -L.torso);
      return o;
    }
    o.armN = arm(o.S[0] + 0.012, o.S[1] + 0.03, p.shN || 0, p.elN || 0);
    o.armF = arm(o.S[0] - 0.012, o.S[1] + 0.03, p.shF || 0, p.elF || 0);
    o.legN = leg(0.012, 0.02, p.hipN || 0, p.knN || 0, p.ankN || 0);
    o.legF = leg(-0.012, 0.02, p.hipF || 0, p.knF || 0, p.ankF || 0);
    return o;
  };

  // ---------------------------------------------------------------- surbrillance des muscles
  // hl : { quads, hams, glutes, calves, chest, back, lowback, abs, shoulders, biceps, triceps } -> 0..1
  function glow(hl, k) { return hl && hl[k] ? hl[k] : 0; }
  const GLOW = 'rgba(255,107,90,'; // corail AURA

  // ---------------------------------------------------------------- dessin d'un membre (deux segments)
  function limb2(ctx, a, b, c, w1, w2, col1, col2, joint) {
    // ombre portée légère, puis le membre
    seg(ctx, a[0], a[1], b[0], b[1], w1, col1);
    seg(ctx, b[0], b[1], c[0], c[1], w2, col2);
    if (joint) dot(ctx, b[0], b[1], Math.min(w1, w2) / 2, joint);
  }
  function hlSeg(ctx, a, b, w, amt, side) {
    if (!amt) return;
    // une demi-épaisseur colorée, côté avant (side=1) ou arrière (side=-1) du segment
    const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n * side, ny = dx / n * side;
    const off = w * 0.2;
    ctx.save(); ctx.globalAlpha = amt; ctx.strokeStyle = GLOW + '0.95)'; ctx.lineWidth = w * 0.55; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0] + nx * off + dx * 0.12, a[1] + ny * off + dy * 0.12); ctx.lineTo(b[0] + nx * off - dx * 0.12, b[1] + ny * off - dy * 0.12); ctx.stroke(); ctx.restore();
  }

  // ---------------------------------------------------------------- personnage complet
  // opts : { who, s (pixels par unité), x, y, flip, rot, hl (muscles), suit (scaphandre), alpha,
  //          item / itemFront : dessin d'un objet (dans la main, sur le visage), headK : tête gonflée, legK : jambes affinées }
  let HK = 1, LK = 1;
  R.draw = function (ctx, pose, opts) {
    const c = typeof opts.who === 'object' ? opts.who : (R.CAST[opts.who] || R.CAST.lucas);
    const t = opts.t || 0, f = pose.face || {}, hl = opts.hl;
    const j = R.solve(pose);
    HK = opts.headK || 1; LK = opts.legK || 1;
    ctx.save();
    ctx.translate(opts.x || 0, opts.y || 0);
    if (opts.rot) ctx.rotate(opts.rot);
    ctx.scale((opts.flip ? -1 : 1) * opts.s, opts.s);
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    const suit = opts.suit;
    const shirt = suit ? '#EEF1F6' : c.shirt, pants = suit ? '#E3E7EE' : c.pants;
    const dk = 0.78;
    if (pose.view === 'front') drawFront(ctx, c, pose, j, f, t, shirt, pants, hl, suit, opts);
    else drawSide(ctx, c, pose, j, f, t, shirt, pants, hl, suit, dk, opts);
    ctx.restore();
    HK = 1; LK = 1;
    return j;
  };

  function hand(ctx, p, skin, k, grip) { dot(ctx, p[0], p[1], W.hand * (k || 1), skin); if (grip) dot(ctx, p[0] + W.hand * 0.4, p[1] - W.hand * 0.3, W.hand * 0.45, shade(skin, 0.9)); }

  function drawSide(ctx, c, p, j, f, t, shirt, pants, hl, suit, dk, opts) {
    const skin = suit ? '#EEF1F6' : c.skin, sk2 = shade(skin, 0.86);
    const sleeve = (arm, k) => { const m = [lerp(arm.S[0], arm.E[0], 0.62), lerp(arm.S[1], arm.E[1], 0.62)]; seg(ctx, arm.S[0], arm.S[1], m[0], m[1], W.upper * 1.18, shade(shirt, k)); };
    // bras et jambe du fond (plus sombres)
    const lf = j.legF, af = j.armF;
    limb2(ctx, lf.H, lf.K, lf.A, W.thigh * LK, W.shin * LK, shade(pants, dk), shade(pants, dk * 0.97));
    seg(ctx, lf.A[0], lf.A[1], lf.T[0], lf.T[1], W.shin * 0.92 * Math.max(LK, 0.85), shade(suit ? '#D9DEE7' : c.socks, dk));
    limb2(ctx, af.S, af.E, af.W, W.upper, W.fore, shade(skin, dk), shade(skin, dk * 0.98));
    if (!suit) sleeve(af, dk);
    hand(ctx, af.W, shade(skin, dk));
    // torse
    ctx.save(); ctx.rotate(p.spine || 0);
    const T = L.torso;
    ctx.fillStyle = shirt; ctx.beginPath();
    ctx.moveTo(-0.07, 0.04);
    ctx.bezierCurveTo(-0.088, -T * 0.35, -0.085, -T * 0.8, -0.06, -T - 0.012);
    ctx.quadraticCurveTo(0.0, -T - 0.045, 0.06, -T - 0.01);
    ctx.bezierCurveTo(0.088, -T * 0.82, 0.092, -T * 0.45, 0.07, -T * 0.12);
    ctx.quadraticCurveTo(0.075, 0.03, 0.05, 0.055);
    ctx.quadraticCurveTo(-0.01, 0.075, -0.07, 0.04);
    ctx.fill();
    // ombre du dos
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(-0.07, 0.04); ctx.bezierCurveTo(-0.088, -T * 0.35, -0.085, -T * 0.8, -0.06, -T - 0.012); ctx.quadraticCurveTo(-0.03, -T * 0.6, -0.035, 0.03); ctx.closePath(); ctx.fill();
    // ceinture du pantalon
    ctx.fillStyle = pants; ctx.beginPath(); ctx.moveTo(-0.076, -0.03); ctx.lineTo(0.074, -0.03); ctx.quadraticCurveTo(0.078, 0.035, 0.05, 0.058); ctx.quadraticCurveTo(-0.01, 0.08, -0.074, 0.045); ctx.closePath(); ctx.fill();
    if (!suit) { ctx.fillStyle = shade(shirt, 0.85); ctx.beginPath(); ctx.moveTo(0.03, -T - 0.02); ctx.lineTo(0.06, -T + 0.03); ctx.lineTo(0.075, -T - 0.005); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = '#C9D0DB'; ctx.fillRect(-0.03, -T * 0.7, 0.07, 0.06); dot(ctx, 0.02, -T * 0.55, 0.012, '#E2463F'); }
    // muscles du tronc
    const tb = (k, x0, y0, x1, y1) => { const a = glow(hl, k); if (!a) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = GLOW + '0.9)'; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, PI * 2); ctx.fill(); ctx.restore(); };
    tb('chest', 0.01, -T * 0.9, 0.088, -T * 0.6); tb('abs', 0.02, -T * 0.55, 0.075, -T * 0.08); tb('back', -0.088, -T * 0.92, -0.02, -T * 0.5); tb('lowback', -0.085, -T * 0.48, -0.03, -T * 0.05); tb('glutes', -0.09, -0.04, -0.02, 0.07);
    ctx.restore();
    // cou et tête
    const nb = [j.S[0] + sin(j.hd) * 0.01, j.S[1] - cos(j.hd) * 0.01], ne = [j.H[0] - sin(j.hd) * L.head * 0.7, j.H[1] + cos(j.hd) * L.head * 0.7];
    seg(ctx, nb[0], nb[1], ne[0], ne[1], 0.048, suit ? '#D7DCE4' : sk2);
    ctx.save(); ctx.translate(j.H[0], j.H[1]); if (HK !== 1) ctx.scale(HK, HK);
    if (suit && opts.helmet !== false) { dot(ctx, 0, 0, L.head * 1.42, 'rgba(235,240,247,0.98)'); ctx.fillStyle = '#C79A2C'; ctx.beginPath(); ctx.ellipse(L.head * 0.45, 0.005, L.head * 0.85, L.head * 0.95, 0, -PI / 2, PI / 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(L.head * 0.62, -L.head * 0.42, L.head * 0.18, L.head * 0.3, 0.4, 0, PI * 2); ctx.fill(); }
    else head(ctx, c, f, t, 'side', j.hd);
    ctx.restore();
    // jambe et bras de devant
    const ln = j.legN, an = j.armN;
    limb2(ctx, ln.H, ln.K, ln.A, W.thigh * LK, W.shin * LK, pants, shade(pants, 0.97));
    hlSeg(ctx, ln.H, ln.K, W.thigh, glow(hl, 'quads'), 1); hlSeg(ctx, ln.H, ln.K, W.thigh, glow(hl, 'hams'), -1); hlSeg(ctx, ln.K, ln.A, W.shin, glow(hl, 'calves'), -1);
    seg(ctx, ln.A[0], ln.A[1], ln.T[0], ln.T[1], W.shin * 0.92, suit ? '#D9DEE7' : c.socks);
    if (opts.item) opts.item(ctx, j, t);
    limb2(ctx, an.S, an.E, an.W, W.upper, W.fore, skin, skin);
    if (!suit) sleeve(an, 1); else seg(ctx, an.S[0], an.S[1], an.E[0], an.E[1], W.upper * 1.25, '#E7EBF1');
    hlSeg(ctx, an.S, an.E, W.upper, glow(hl, 'biceps'), 1); hlSeg(ctx, an.S, an.E, W.upper, glow(hl, 'triceps'), -1);
    if (glow(hl, 'shoulders')) { ctx.save(); ctx.globalAlpha = glow(hl, 'shoulders'); dot(ctx, an.S[0], an.S[1] + 0.01, W.upper * 0.62, GLOW + '0.95)'); ctx.restore(); }
    hand(ctx, an.W, suit ? '#E7EBF1' : skin, suit ? 1.2 : 1);
    if (opts.itemFront) opts.itemFront(ctx, j, t);
    // les mollets et cuisses du fond aussi (moins visibles)
    hlSeg(ctx, lf.H, lf.K, W.thigh, glow(hl, 'quads') * 0.5, 1); hlSeg(ctx, lf.K, lf.A, W.shin, glow(hl, 'calves') * 0.5, -1);
  }

  function drawFront(ctx, c, p, j, f, t, shirt, pants, hl, suit, opts) {
    const skin = suit ? '#EEF1F6' : c.skin;
    // jambes
    for (const lg of [j.legL, j.legR]) {
      limb2(ctx, lg.H, lg.K, lg.A, W.thigh * LK, W.shin * LK, pants, shade(pants, 0.96));
      dot(ctx, lg.A[0], lg.A[1] + 0.02, W.shin * 0.62, suit ? '#D9DEE7' : c.socks);
      hlSeg(ctx, lg.H, lg.K, W.thigh, glow(hl, 'quads'), 1);
      hlSeg(ctx, lg.K, lg.A, W.shin, glow(hl, 'calves'), 1);
    }
    // bras du fond n'existent pas de face : les deux bras sont dessinés après le torse
    ctx.save(); ctx.rotate(p.spine || 0);
    const T = L.torso;
    ctx.fillStyle = shirt; ctx.beginPath();
    ctx.moveTo(-L.hipW - 0.035, 0.03);
    ctx.bezierCurveTo(-L.hipW - 0.045, -T * 0.4, -L.shW - 0.03, -T * 0.7, -L.shW - 0.02, -T + 0.03);
    ctx.quadraticCurveTo(-L.shW, -T - 0.02, -0.05, -T - 0.02);
    ctx.lineTo(0.05, -T - 0.02);
    ctx.quadraticCurveTo(L.shW, -T - 0.02, L.shW + 0.02, -T + 0.03);
    ctx.bezierCurveTo(L.shW + 0.03, -T * 0.7, L.hipW + 0.045, -T * 0.4, L.hipW + 0.035, 0.03);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.moveTo(L.hipW + 0.035, 0.03); ctx.bezierCurveTo(L.hipW + 0.045, -T * 0.4, L.shW + 0.03, -T * 0.7, L.shW + 0.02, -T + 0.03); ctx.lineTo(L.shW * 0.55, -T * 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pants; ctx.beginPath(); ctx.moveTo(-L.hipW - 0.04, -0.025); ctx.lineTo(L.hipW + 0.04, -0.025); ctx.lineTo(L.hipW + 0.036, 0.05); ctx.quadraticCurveTo(0, 0.07, -L.hipW - 0.036, 0.05); ctx.closePath(); ctx.fill();
    if (!suit) { ctx.fillStyle = shade(shirt, 0.82); ctx.beginPath(); ctx.moveTo(-0.045, -T - 0.018); ctx.lineTo(0, -T + 0.045); ctx.lineTo(0.045, -T - 0.018); ctx.closePath(); ctx.fill(); dot(ctx, 0, -T * 0.66, 0.009, shade(shirt, 0.7)); }
    else { ctx.fillStyle = '#C9D0DB'; ctx.fillRect(-0.05, -T * 0.72, 0.1, 0.07); dot(ctx, -0.025, -T * 0.68, 0.01, '#E2463F'); dot(ctx, 0.0, -T * 0.68, 0.01, '#3FB4E2'); }
    const tb = (k, x0, y0, x1, y1) => { const a = glow(hl, k); if (!a) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = GLOW + '0.9)'; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, PI * 2); ctx.fill(); ctx.restore(); };
    tb('chest', -0.09, -T * 0.92, 0.09, -T * 0.62); tb('abs', -0.05, -T * 0.58, 0.05, -T * 0.08);
    ctx.restore();
    // cou
    seg(ctx, j.S[0], j.S[1] - 0.005, j.H[0], j.H[1] + L.head * 0.6, 0.05, shade(skin, 0.86));
    // bras
    for (const [arm, side] of [[j.armL, -1], [j.armR, 1]]) {
      limb2(ctx, arm.S, arm.E, arm.W, W.upper, W.fore, skin, skin);
      const m = [lerp(arm.S[0], arm.E[0], 0.6), lerp(arm.S[1], arm.E[1], 0.6)];
      seg(ctx, arm.S[0], arm.S[1], m[0], m[1], W.upper * 1.2, suit ? '#E7EBF1' : shirt);
      hlSeg(ctx, arm.S, arm.E, W.upper, glow(hl, 'biceps'), side);
      hlSeg(ctx, arm.S, arm.E, W.upper, glow(hl, 'triceps'), -side);
      if (glow(hl, 'shoulders')) { ctx.save(); ctx.globalAlpha = glow(hl, 'shoulders'); dot(ctx, arm.S[0], arm.S[1] + 0.01, W.upper * 0.65, GLOW + '0.95)'); ctx.restore(); }
      hand(ctx, arm.W, suit ? '#E7EBF1' : skin, suit ? 1.2 : 1);
    }
    if (opts.item) opts.item(ctx, j, t);
    ctx.save(); ctx.translate(j.H[0], j.H[1]); if (HK !== 1) ctx.scale(HK, HK);
    if (suit && opts.helmet !== false) { dot(ctx, 0, 0, L.head * 1.45, 'rgba(235,240,247,0.98)'); ctx.fillStyle = '#C79A2C'; ctx.beginPath(); ctx.ellipse(0, 0.01, L.head * 1.0, L.head * 0.82, 0, 0, PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(-L.head * 0.4, -L.head * 0.32, L.head * 0.22, L.head * 0.14, -0.5, 0, PI * 2); ctx.fill(); }
    else head(ctx, c, f, t, 'front', (p.head || 0) + (p.spine || 0));
    ctx.restore();
    if (opts.itemFront) opts.itemFront(ctx, j, t);
  }

  // ---------------------------------------------------------------- effets autour d'un personnage
  R.fx = {
    sweat(ctx, x, y, s, t) { const k = ((t * 0.8) % 1); ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#8FD3FF'; ctx.beginPath(); const yy = y + k * s * 0.08; ctx.moveTo(x, yy - s * 0.03); ctx.quadraticCurveTo(x + s * 0.022, yy + s * 0.01, x, yy + s * 0.02); ctx.quadraticCurveTo(x - s * 0.022, yy + s * 0.01, x, yy - s * 0.03); ctx.fill(); ctx.restore(); },
    stars(ctx, x, y, s, t) { for (let i = 0; i < 3; i++) { const a = t * 3 + i * PI * 2 / 3; star(ctx, x + cos(a) * s * 0.16, y + sin(a) * s * 0.05, s * 0.03, '#FFD166'); } },
    zzz(ctx, x, y, s, t) { ctx.save(); ctx.fillStyle = '#CFE3FF'; ctx.font = '800 ' + Math.round(s * 0.07) + 'px Atkinson, sans-serif'; for (let i = 0; i < 3; i++) { const k = ((t * 0.45 + i / 3) % 1); ctx.globalAlpha = Math.sin(k * PI); ctx.font = '800 ' + Math.round(s * (0.05 + k * 0.05)) + 'px Atkinson, sans-serif'; ctx.fillText('z', x + k * s * 0.12, y - k * s * 0.2); } ctx.restore(); },
    pain(ctx, x, y, s, t) { ctx.save(); ctx.strokeStyle = '#FF5A4E'; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.012; const k = 0.8 + 0.2 * sin(t * 12); for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2 + 0.3; ctx.beginPath(); ctx.moveTo(x + cos(a) * s * 0.035 * k, y + sin(a) * s * 0.035 * k); ctx.lineTo(x + cos(a) * s * 0.07 * k, y + sin(a) * s * 0.07 * k); ctx.stroke(); } ctx.restore(); },
    sparkle(ctx, x, y, s, t) { for (let i = 0; i < 4; i++) { const k = (t * 0.9 + i / 4) % 1; ctx.save(); ctx.globalAlpha = sin(k * PI); star(ctx, x + cos(i * 1.7) * s * 0.18, y + sin(i * 2.3) * s * 0.14, s * 0.025 * (0.6 + k), '#FFFFFF'); ctx.restore(); } },
    mark(ctx, x, y, s, t, ch) { const k = 1 + 0.08 * sin(t * 6); ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = ch === '!' ? '#FF5A4E' : '#FFD166'; ctx.font = '800 ' + Math.round(s * 0.12) + 'px Atkinson, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ch || '?', 0, 0); ctx.restore(); }
  };
  function star(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2 - PI / 2, rr = i % 2 ? r * 0.42 : r; ctx.lineTo(x + cos(a) * rr, y + sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  R.star = star;

  // ---------------------------------------------------------------- poses et mouvements
  // Chaque mouvement renvoie une pose pour un temps t (secondes). Les exercices ont une période (cycle).
  const F = (o) => Object.assign({ eye: 'open', mouth: 'smile', brow: 0 }, o);
  const P = R.P = {};
  // flotter en apesanteur : posture neutre (bras à demi levés, genoux pliés)
  P.float = (t, o = {}) => ({ view: 'side', spine: 0.12 + 0.03 * sin(t * 0.7), head: -0.05 + 0.04 * sin(t * 0.5), shN: 0.75 + 0.08 * sin(t * 0.9), elN: 0.85, shF: 0.55 + 0.08 * sin(t * 0.8 + 1), elF: 0.95, hipN: 0.55 + 0.06 * sin(t * 0.6), knN: 1.0, ankN: 0.15, hipF: 0.4 + 0.06 * sin(t * 0.6 + 1), knF: 0.85, ankF: 0.1, face: F(o.face) });
  P.stand = (t, o = {}) => ({ view: 'side', spine: 0.02 * sin(t * 0.8), head: 0, shN: 0.12 + 0.03 * sin(t), elN: 0.25, shF: -0.08, elF: 0.2, hipN: 0.04, knN: 0.06, hipF: -0.03, knF: 0.04, face: F(o.face) });
  P.talk = (t, o = {}) => ({ view: 'front', spine: 0.03 * sin(t * 0.9), head: 0.06 * sin(t * 1.3), shL: 0.35 + 0.15 * sin(t * 2.1), elL: 1.2 + 0.3 * sin(t * 2.6), shR: 0.25 + 0.2 * Math.max(0, sin(t * 1.7)), elR: 1.0 + 0.4 * Math.max(0, sin(t * 1.7)), hipL: 0.06, knL: 0.04, hipR: 0.06, knR: 0.04, face: F(Object.assign({ mouth: 'talk' }, o.face)) });
  P.front = (t, o = {}) => ({ view: 'front', spine: 0.02 * sin(t * 0.8), head: 0.04 * sin(t * 0.6), shL: 0.2, elL: 0.3, shR: 0.2, elR: 0.3, hipL: 0.06, knL: 0.03, hipR: 0.06, knR: 0.03, face: F(o.face) });
  P.floatFront = (t, o = {}) => ({ view: 'front', spine: 0.06 * sin(t * 0.5), head: 0.05 * sin(t * 0.7), shL: 0.9 + 0.1 * sin(t * 0.8), elL: 0.7, shR: 0.85 + 0.1 * sin(t * 0.9 + 1), elR: 0.75, hipL: 0.25, knL: 0.7, hipR: 0.2, knR: 0.6, face: F(o.face) });
  P.wave = (t, o = {}) => ({ view: 'front', spine: 0, head: 0.05, shL: 0.15, elL: 0.3, shR: 2.4, elR: 0.6 + 0.45 * sin(t * 9), hipL: 0.06, knL: 0.03, hipR: 0.06, knR: 0.03, face: F(Object.assign({ mouth: 'grin', eye: 'happy' }, o.face)) });
  P.thumbs = (t, o = {}) => ({ view: 'front', spine: 0, head: 0.08, shL: 0.18, elL: 0.3, shR: 0.55, elR: 2.4, hipL: 0.06, knL: 0.03, hipR: 0.06, knR: 0.03, face: F(Object.assign({ mouth: 'grin', eye: 'happy' }, o.face)) });
  P.point = (t, o = {}) => ({ view: 'side', spine: 0.05, head: -0.05, shN: 1.5 + 0.04 * sin(t * 3), elN: 0.05, shF: 0.1, elF: 0.3, hipN: 0.05, knN: 0.05, hipF: -0.05, knF: 0.05, face: F(Object.assign({ mouth: 'talk' }, o.face)) });
  P.dizzy = (t, o = {}) => ({ view: 'front', spine: 0.12 * sin(t * 1.6), head: 0.18 * sin(t * 2.1), shL: 1.3 + 0.25 * sin(t * 2.3), elL: 0.3, shR: 1.2 + 0.25 * sin(t * 2.3 + 2), elR: 0.35, hipL: 0.2, knL: 0.3, hipR: 0.12, knR: 0.25, face: F(Object.assign({ eye: 'dizzy', mouth: 'wavy', tint: 0.7, brow: 1 }, o.face)) });
  P.nausea = (t, o = {}) => ({ view: 'front', spine: 0.08, head: 0.12 + 0.04 * sin(t * 2), shL: 0.35, elL: 2.2, shR: 0.4, elR: 2.6, hipL: 0.15, knL: 0.3, hipR: 0.1, knR: 0.25, face: F(Object.assign({ eye: 'squint', mouth: 'wavy', tint: 0.85, brow: 1 }, o.face)) });
  P.headache = (t, o = {}) => ({ view: 'front', spine: 0.03 * sin(t * 1.5), head: 0.06 * sin(t * 1.8), shL: 2.5, elL: 1.75, shR: 2.5, elR: 1.75, hipL: 0.08, knL: 0.06, hipR: 0.08, knR: 0.06, face: F(Object.assign({ eye: 'squint', mouth: 'grit', brow: 1 }, o.face)) });
  P.backpain = (t, o = {}) => ({ view: 'side', spine: 0.32 + 0.04 * sin(t * 2), head: -0.25, shN: -0.55, elN: 1.9, shF: 0.4, elF: 0.6, hipN: 0.35, knN: 0.45, hipF: 0.2, knF: 0.35, face: F(Object.assign({ eye: 'squint', mouth: 'grit', brow: 1 }, o.face)) });
  P.tuck = (t, o = {}) => ({ view: 'side', spine: 0.55 + 0.04 * sin(t * 1.2), head: 0.35, shN: 1.05, elN: 1.5, shF: 0.95, elF: 1.6, hipN: 2.25, knN: 2.45, ankN: 0.3, hipF: 2.15, knF: 2.4, ankF: 0.3, face: F(Object.assign({ eye: 'closed', mouth: 'smile' }, o.face)) });
  P.sleep = (t, o = {}) => ({ view: 'side', spine: 0.04, head: 0.08 + 0.02 * sin(t * 0.9), shN: 0.1, elN: 0.35, shF: 0.05, elF: 0.3, hipN: 0.18, knN: 0.3, hipF: 0.12, knF: 0.25, face: F(Object.assign({ eye: 'closed', mouth: 'sleep' }, o.face)) });
  P.drink = (t, o = {}) => ({ view: 'side', spine: 0.05, head: -0.18, shN: 1.75 + 0.05 * sin(t * 2), elN: 2.35, shF: 0.3, elF: 0.5, hipN: 0.25, knN: 0.35, hipF: 0.15, knF: 0.3, face: F(Object.assign({ eye: 'closed', mouth: 'o' }, o.face)) });
  P.type = (t, o = {}) => ({ view: 'side', spine: 0.1, head: 0.12, shN: 1.0 + 0.04 * sin(t * 13), elN: 0.9 + 0.08 * sin(t * 17), shF: 0.95 + 0.04 * sin(t * 11 + 1), elF: 0.95 + 0.08 * sin(t * 15 + 2), hipN: 0.3, knN: 0.4, hipF: 0.22, knF: 0.35, face: F(Object.assign({ mouth: 'neutral' }, o.face)) });
  P.read = (t, o = {}) => ({ view: 'side', spine: 0.08, head: 0.28, shN: 0.9, elN: 1.2, shF: 0.8, elF: 1.25, hipN: 0.35, knN: 0.5, hipF: 0.25, knF: 0.4, face: F(Object.assign({ mouth: 'neutral' }, o.face)) });
  P.squintRead = (t, o = {}) => Object.assign(P.read(t), { head: 0.2 + 0.04 * sin(t * 2), shN: 1.15, elN: 0.7, shF: 1.05, elF: 0.75, face: F(Object.assign({ eye: 'squint', mouth: 'frown', brow: 1 }, o.face)) });
  P.look = (t, o = {}) => ({ view: 'side', spine: 0.1, head: -0.25 + 0.04 * sin(t * 0.5), shN: 0.85, elN: 0.8, shF: 0.6, elF: 0.9, hipN: 0.45, knN: 0.8, hipF: 0.35, knF: 0.7, face: F(Object.assign({ mouth: 'smile' }, o.face)) });
  P.worry = (t, o = {}) => ({ view: 'front', spine: 0.04 * sin(t), head: 0.1, shL: 0.45, elL: 2.55, shR: 0.45, elR: 2.55, hipL: 0.1, knL: 0.15, hipR: 0.1, knR: 0.15, face: F(Object.assign({ eye: 'wide', mouth: 'o', brow: 1 }, o.face)) });
  P.press = (t, o = {}) => { const k = Math.min(1, (t % 1.6) / 0.35); return { view: 'side', spine: 0.1, head: -0.05, shN: 1.35 + 0.2 * k, elN: 0.6 - 0.5 * k, shF: 0.2, elF: 0.4, hipN: 0.15, knN: 0.2, hipF: 0.05, knF: 0.15, face: F(Object.assign({ eye: 'wide', mouth: 'o', brow: 1 }, o.face)) }; };
  P.mask = (t, o = {}) => ({ view: 'side', spine: 0.06, head: -0.04, shN: 1.85, elN: 2.25, shF: 1.5, elF: 2.4, hipN: 0.25, knN: 0.35, hipF: 0.15, knF: 0.3, face: F(Object.assign({ eye: 'open', mouth: 'neutral', brow: 0.6 }, o.face)) });
  P.aim = (t, o = {}) => ({ view: 'side', spine: 0.18, head: 0.05, shN: 1.25 + 0.04 * sin(t * 20), elN: 0.35, shF: 1.05, elF: 0.6, hipN: 0.3, knN: 0.35, hipF: 0.15, knF: 0.25, face: F(Object.assign({ eye: 'open', mouth: 'grit', brow: -0.6 }, o.face)) });
  P.glide = (t, o = {}) => ({ view: 'side', spine: 1.35, head: -0.6, shN: 2.6 + 0.1 * sin(t * 2), elN: 0.2, shF: 2.4 + 0.1 * sin(t * 2 + 1), elF: 0.25, hipN: 0.05 + 0.08 * sin(t * 2.4), knN: 0.25, ankN: -0.4, hipF: -0.05 + 0.08 * sin(t * 2.4 + 2), knF: 0.3, ankF: -0.4, face: F(o.face) });
  P.cheer = (t, o = {}) => ({ view: 'front', spine: 0, head: 0.05 * sin(t * 4), shL: 2.6 + 0.15 * sin(t * 5), elL: 0.3, shR: 2.6 + 0.15 * sin(t * 5 + 1), elR: 0.3, hipL: 0.15, knL: 0.2, hipR: 0.15, knR: 0.2, face: F(Object.assign({ eye: 'happy', mouth: 'grin' }, o.face)) });
  P.rub = (t, o = {}) => ({ view: 'front', spine: 0.05, head: -0.15, shL: 0.6, elL: 1.6 + 0.15 * sin(t * 8), shR: 0.35, elR: 0.5, hipL: 0.06, knL: 0.04, hipR: 0.06, knR: 0.04, face: F(Object.assign({ eye: 'squint', mouth: 'frown', brow: 1 }, o.face)) });
  P.lie = (t, o = {}) => ({ view: 'side', spine: 0, head: 0.05, shN: 0.15, elN: 0.1, shF: 0.1, elF: 0.1, hipN: 0.02, knN: 0.02, hipF: 0, knF: 0, face: F(Object.assign({ eye: 'closed', mouth: 'neutral' }, o.face)) });
  // marche (sur Terre) : les jambes se croisent, les bras balancent à l'opposé
  P.walk = (t, o = {}) => { const u = t * PI * 2 / 1.05, a = sin(u), b = sin(u + PI);
    const kn = s => 0.12 + 0.55 * Math.max(0, sin(s + 0.9));
    return { view: 'side', spine: 0.05, head: -0.02, shN: -0.38 * a, elN: 0.35, shF: -0.38 * b, elF: 0.35, hipN: 0.36 * a, knN: kn(u), ankN: 0, hipF: 0.36 * b, knF: kn(u + PI), ankF: 0, face: F(o.face) }; };
  // manger : la cuillère va du plateau à la bouche
  P.eat = (t, o = {}) => { const k = R.smooth(0.5 + 0.5 * sin(t * 2.4));
    return { view: 'side', spine: 0.06, head: -0.06 + 0.06 * k, shN: lerp(0.75, 1.45, k), elN: lerp(1.2, 2.45, k), shF: 0.85, elF: 1.25, hipN: 0.35, knN: 0.5, hipF: 0.25, knF: 0.4, face: F(Object.assign({ mouth: k > 0.75 ? 'o' : 'smile' }, o.face)) }; };
  // flotter sans effort, la tablette à la main
  P.lazy = (t, o = {}) => ({ view: 'side', spine: 0.32 + 0.03 * sin(t * 0.6), head: 0.2, shN: 1.0, elN: 1.15, shF: 0.85, elF: 1.25, hipN: 0.85 + 0.05 * sin(t * 0.5), knN: 1.25, ankN: 0.2, hipF: 0.45, knF: 0.75, ankF: 0.1, face: F(Object.assign({ mouth: 'smile', eye: 'open' }, o.face)) });
  // examen des yeux : le bras tendu tient l'appareil à hauteur du visage
  P.exam = (t, o = {}) => ({ view: 'side', spine: 0.04, head: -0.05, shN: 1.5 + 0.03 * sin(t * 1.5), elN: 0.35, shF: 0.7, elF: 1.2, hipN: 0.2, knN: 0.3, hipF: 0.1, knF: 0.25, face: F(Object.assign({ mouth: 'neutral', brow: 0.2 }, o.face)) });
  // porter un appareil à deux mains en flottant
  P.carry = (t, o = {}) => ({ view: 'side', spine: 0.28 + 0.03 * sin(t), head: -0.2, shN: 0.75, elN: 1.05, shF: 0.7, elF: 1.1, hipN: -0.15 + 0.08 * sin(t * 1.4), knN: 0.4, ankN: -0.3, hipF: -0.3 + 0.08 * sin(t * 1.4 + 1), knF: 0.5, ankF: -0.3, face: F(Object.assign({ mouth: 'neutral', brow: -0.2 }, o.face)) });
  // abattu : épaules basses, tête penchée
  P.sad = (t, o = {}) => ({ view: 'front', spine: 0.02 * sin(t * 0.6), head: 0.12, shL: 0.1, elL: 0.12, shR: 0.1, elR: 0.12, hipL: 0.05, knL: 0.03, hipR: 0.05, knR: 0.03, face: F(Object.assign({ mouth: 'frown', brow: 1, look: -0.4 }, o.face)) });
  // rire franc
  P.laugh = (t, o = {}) => ({ view: 'front', spine: 0.04 * sin(t * 7), head: -0.08 + 0.05 * sin(t * 7), shL: 0.5, elL: 1.6, shR: 0.45, elR: 1.5, hipL: 0.08, knL: 0.06, hipR: 0.08, knR: 0.06, face: F(Object.assign({ eye: 'happy', mouth: 'grin' }, o.face)) });
  // une main sur le flanc (douleur au côté)
  P.side = (t, o = {}) => ({ view: 'front', spine: -0.08 + 0.03 * sin(t * 2), head: 0.08, shL: 0.55, elL: 1.85, shR: 0.3, elR: 0.5, hipL: 0.12, knL: 0.2, hipR: 0.05, knR: 0.05, face: F(Object.assign({ eye: 'squint', mouth: 'grit', brow: 1 }, o.face)) });
  // frotter son bras
  P.rubArm = (t, o = {}) => ({ view: 'front', spine: 0.03, head: 0.06, shL: 0.45, elL: 2.0 + 0.12 * sin(t * 8), shR: 0.2, elR: 0.4, hipL: 0.06, knL: 0.04, hipR: 0.06, knR: 0.04, face: F(Object.assign({ eye: 'open', mouth: 'frown', brow: 1 }, o.face)) });
  // genoux contre la poitrine, tenus (respiration lente)
  P.tuckhold = (t, o = {}) => Object.assign(P.tuck(t), { spine: 0.55 + 0.05 * sin(t * 1.1), face: F(Object.assign({ eye: 'closed', mouth: 'smile' }, o.face)) });
  // étirement en flottant, bras au-dessus de la tête
  P.stretchfloat = (t, o = {}) => ({ view: 'side', spine: -0.08 + 0.03 * sin(t * 0.8), head: -0.12, shN: 2.85 + 0.06 * sin(t), elN: 0.1, shF: 2.75 + 0.06 * sin(t + 1), elF: 0.15, hipN: 0.12, knN: 0.2, ankN: -0.2, hipF: -0.05, knF: 0.15, ankF: -0.2, face: F(Object.assign({ eye: 'happy', mouth: 'smile' }, o.face)) });
  // bras tendus au-dessus de la tête (on le retourne pour masser depuis le plafond)
  P.handstand = (t, o = {}) => ({ view: 'side', spine: 0.0, head: -0.1, shN: 3.05, elN: 0.05, shF: 3.0, elF: 0.06, hipN: 0.02, knN: 0.05, ankN: -0.3, hipF: -0.04, knF: 0.05, ankF: -0.3, face: F(Object.assign({ mouth: 'grit', brow: -0.4 }, o.face)) });

  // ---------------------------------------------------------------- exercices (cycle en secondes)
  // chaque exercice renvoie aussi la position du bassin (bx, by) par rapport au sol ou à l'appareil
  const C = (t, per) => (t % per) / per;
  const ud = u => 0.5 - 0.5 * cos(u * PI * 2);   // 0 -> 1 -> 0
  R.EX = {
    // squat sur la machine de musculation (ARED) : barre sur les épaules
    squat: { per: 3.2, bar: 'shoulders', pose(t) { const k = R.ease(ud(C(t, this.per))), sp = 0.1 + 0.45 * k, hp = 0.04 + 1.3 * k;
      return { view: 'side', world: true, spine: sp, head: -0.05 - 0.3 * k, shN: sp - 0.5, elN: 3.25, shF: sp - 0.45, elF: 3.2, hipN: hp, knN: hp + 0.45 * k, ankN: 0, hipF: hp - 0.02, knF: hp - 0.02 + 0.45 * k, ankF: 0, face: F({ mouth: k > 0.6 ? 'grit' : 'neutral', brow: -0.3 }) }; } },
    // soulevé de terre : charnière de hanche, dos droit, bras tendus
    deadlift: { per: 3.4, bar: 'hands', pose(t) { const k = R.ease(ud(C(t, this.per))), sp = 0.08 + 1.0 * k, hp = 0.03 + 0.42 * k;
      return { view: 'side', world: true, spine: sp, head: -0.1 - 0.55 * k, shN: 0.03, elN: 0.02, shF: 0.0, elF: 0.02, hipN: hp, knN: hp + 0.12 * k, ankN: 0, hipF: hp - 0.02, knF: hp - 0.02 + 0.12 * k, ankF: 0, face: F({ mouth: k > 0.6 ? 'grit' : 'neutral', brow: -0.3 }) }; } },
    // mollets : montée sur la pointe des pieds, barre sur les épaules
    calf: { per: 2.0, bar: 'shoulders', pose(t) { const k = R.ease(ud(C(t, this.per)));
      return { view: 'side', world: true, spine: 0.04, head: -0.05, shN: -0.45, elN: 3.25, shF: -0.4, elF: 3.2, hipN: 0.03, knN: 0.04, ankN: 0.75 * k, hipF: 0.01, knF: 0.03, ankF: 0.75 * k, face: F({ mouth: 'neutral' }) }; } },
    // développé couché : allongé, la barre descend vers la poitrine
    bench: { per: 2.8, bar: 'hands', lying: true, pose(t) { const k = R.ease(ud(C(t, this.per)));
      return { view: 'side', world: true, spine: 0, head: 0, shN: 1.57 - 2.8 * k, elN: 2.8 * k, shF: 1.55 - 2.8 * k, elF: 2.8 * k, hipN: 0.95, knN: 2.2, ankN: -0.6, hipF: 0.9, knF: 2.15, ankF: -0.6, face: F({ mouth: k > 0.5 ? 'grit' : 'neutral' }) }; } },
    // tirage buste penché : on ramène la barre vers le ventre
    row: { per: 2.6, bar: 'hands', pose(t) { const k = R.ease(ud(C(t, this.per)));
      return { view: 'side', world: true, spine: 1.0, head: -0.7, shN: -1.75 * k, elN: 0.05 + 1.75 * k, shF: -1.75 * k - 0.03, elF: 0.05 + 1.75 * k, hipN: 0.32, knN: 0.45, ankN: 0, hipF: 0.3, knF: 0.43, ankF: 0, face: F({ mouth: k > 0.6 ? 'grit' : 'neutral', brow: -0.3 }) }; } },
    // développé épaules, vu de face : la barre passe des épaules au-dessus de la tête
    press: { per: 3.0, bar: 'hands', front: true, pose(t) { const k = R.ease(ud(C(t, this.per))), sh = 1.32 + 1.5 * k, a2 = lerp(3.3, 2.84, k);
      return { view: 'front', spine: 0, head: 0, shL: sh, elL: sh - a2, shR: sh, elR: sh - a2, hipL: 0.1, knL: 0.03, hipR: 0.1, knR: 0.03, face: F({ mouth: k > 0.6 ? 'grit' : 'neutral', brow: -0.2 }) }; } },
    // course sur le tapis, tenu par le harnais
    run: { per: 0.72, harness: true, pose(t) { const u = C(t, this.per) * PI * 2, s1 = sin(u), s2 = sin(u + PI);
      const lg = (s, c) => { const hip = 0.15 + 0.72 * s; return { hip, kn: hip - (-0.25 - 0.95 * Math.max(0, c)) }; };
      const a = lg(s1, -cos(u)), b = lg(s2, -cos(u + PI));
      return { view: 'side', world: true, spine: 0.18, head: -0.16, shN: -0.8 * s1, elN: 1.6, shF: -0.8 * s2, elF: 1.6, hipN: a.hip, knN: a.kn, ankN: 0.15, hipF: b.hip, knF: b.kn, ankF: 0.15, face: F({ mouth: 'o', brow: -0.2 }) }; } },
    // vélo ergomètre : le pied suit le pédalier, hanche et genou se déduisent de la géométrie
    bike: { per: 1.1, bike: true, pose(t) {
      const u = C(t, this.per) * PI * 2, cx = 0.3, cy = 0.33, rr = 0.085;
      const legAt = (ph) => { const fx = cx + cos(u + ph) * rr, fy = cy + sin(u + ph) * rr; const d = Math.min(Math.hypot(fx, fy), L.thigh + L.shin - 0.001); const aF = Math.atan2(fx, fy); const cK = (L.thigh * L.thigh + d * d - L.shin * L.shin) / (2 * L.thigh * d); const th = aF + Math.acos(Math.max(-1, Math.min(1, cK))); const kx = sin(th) * L.thigh, ky = cos(th) * L.thigh; const sh = Math.atan2(fx - kx, fy - ky); return { hip: th, kn: th - sh }; };
      const n = legAt(0), f2 = legAt(PI);
      return { view: 'side', world: true, spine: 0.3, head: -0.25, shN: 1.0, elN: 0.15, shF: 0.98, elF: 0.17, hipN: n.hip, knN: n.kn, ankN: 0, hipF: f2.hip, knF: f2.kn, ankF: 0, face: F({ mouth: 'o' }) }; } },
    // gainage sur les avant-bras (le personnage est tourné à l'horizontale)
    plank: { per: 3.0, plank: true, pose(t) { const k = 0.5 + 0.5 * sin(t * 2);
      return { view: 'side', world: true, spine: 0, head: -0.05, shN: 1.57, elN: 1.57, shF: 1.55, elF: 1.57, hipN: 0.02 + 0.015 * k, knN: 0.02, ankN: -1.3, hipF: 0.0, knF: 0.02, ankF: -1.3, face: F({ mouth: k > 0.7 ? 'grit' : 'neutral', brow: -0.3 }) }; } },
    // genoux contre la poitrine : le geste qui soulage le dos
    tuck: { per: 4.0, pose(t) { const k = R.ease(ud(C(t, this.per))); const p = P.tuck(t); const q = P.float(t); return Object.assign(R.blend(q, p, 0.3 + 0.7 * k), { face: F({ eye: k > 0.5 ? 'closed' : 'open', mouth: 'smile' }) }); } },
    // étirement : bras tendus vers le haut, sur la pointe des pieds
    stretch: { per: 4.0, pose(t) { const k = R.ease(ud(C(t, this.per)));
      return { view: 'side', world: true, spine: -0.06 * k, head: -0.15 - 0.15 * k, shN: 2.85 + 0.2 * k, elN: 0.1, shF: 2.8 + 0.2 * k, elF: 0.12, hipN: 0.02, knN: 0.03, ankN: 0.3 * k, hipF: 0.0, knF: 0.03, ankF: 0.3 * k, face: F({ eye: k > 0.5 ? 'closed' : 'open', mouth: 'smile' }) }; } }
  };

  // ---------------------------------------------------------------- appareils (vue de profil, en unités du personnage)
  R.gear = {
    // barre de musculation (ARED) : sur les épaules ou dans les mains
    bar(ctx, j, where) {
      const p = where === 'hands' ? j.armN.W : [j.S[0] - 0.01, j.S[1] + 0.005];
      ctx.save(); ctx.lineCap = 'round';
      seg(ctx, p[0] - 0.02, p[1], p[0] + 0.02, p[1], 0.02, '#5A6273');
      dot(ctx, p[0], p[1], 0.055, '#3E4554'); dot(ctx, p[0], p[1], 0.034, '#A7B0C0'); dot(ctx, p[0], p[1], 0.012, '#3E4554');
      ctx.restore();
    },
    // la même barre vue de face : d'une main à l'autre, avec les disques de chaque côté
    barFront(ctx, j) {
      const a = j.armL.W, b = j.armR.W, dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n;
      ctx.save(); ctx.lineCap = 'round';
      seg(ctx, a[0] - ux * 0.13, a[1] - uy * 0.13, b[0] + ux * 0.13, b[1] + uy * 0.13, 0.018, '#5A6273');
      for (const [p, sgn] of [[a, -1], [b, 1]]) {
        const cx = p[0] + sgn * ux * 0.1, cy = p[1] + sgn * uy * 0.1;
        ctx.fillStyle = '#3E4554'; roundRect(ctx, cx - 0.018, cy - 0.06, 0.036, 0.12, 0.012); ctx.fill();
        ctx.fillStyle = '#A7B0C0'; roundRect(ctx, cx - 0.008, cy - 0.045, 0.016, 0.09, 0.006); ctx.fill();
      }
      ctx.restore();
    },
    platform(ctx, w) { ctx.fillStyle = '#4A5264'; roundRect(ctx, -w / 2, 0.44, w, 0.06, 0.02); ctx.fill(); ctx.fillStyle = '#5E6880'; roundRect(ctx, -w / 2 + 0.02, 0.43, w - 0.04, 0.02, 0.01); ctx.fill(); },
    treadmill(ctx, t) {
      ctx.fillStyle = '#3E4556'; roundRect(ctx, -0.42, 0.45, 0.84, 0.07, 0.035); ctx.fill();
      ctx.strokeStyle = '#2A2F3B'; ctx.lineWidth = 0.012; ctx.setLineDash([0.04, 0.04]); ctx.lineDashOffset = -t * 0.5; ctx.beginPath(); ctx.moveTo(-0.38, 0.452); ctx.lineTo(0.38, 0.452); ctx.stroke(); ctx.setLineDash([]);
      dot(ctx, -0.38, 0.485, 0.03, '#2A2F3B'); dot(ctx, 0.38, 0.485, 0.03, '#2A2F3B');
    },
    harness(ctx, j) {
      // harnais et élastiques qui tirent vers le tapis (ils remplacent la gravité)
      ctx.strokeStyle = '#2F3747'; ctx.lineWidth = 0.022; ctx.beginPath(); ctx.moveTo(j.S[0] - 0.06, j.S[1] + 0.02); ctx.lineTo(0.06, -0.04); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,190,70,0.95)'; ctx.lineWidth = 0.01; ctx.setLineDash([0.018, 0.012]);
      ctx.beginPath(); ctx.moveTo(-0.07, 0.0); ctx.lineTo(-0.3, 0.45); ctx.moveTo(0.06, 0.0); ctx.lineTo(0.28, 0.45); ctx.stroke(); ctx.setLineDash([]);
    },
    bike(ctx, t) {
      // vélo ergomètre (CEVIS), dans le repère du personnage (bassin à l'origine, pédalier en 0.3, 0.33)
      ctx.lineCap = 'round';
      seg(ctx, -0.015, 0.06, 0.2, 0.43, 0.03, '#4A5264');                       // tige de selle
      ctx.fillStyle = '#3E4556'; roundRect(ctx, -0.02, 0.43, 0.5, 0.055, 0.027); ctx.fill();   // socle
      ctx.fillStyle = '#525B70'; roundRect(ctx, 0.245, 0.245, 0.11, 0.2, 0.035); ctx.fill();   // carter
      seg(ctx, 0.33, 0.27, 0.392, -0.075, 0.026, '#4A5264');                     // potence
      seg(ctx, 0.392, -0.075, 0.36, -0.112, 0.024, '#3E4556');                   // guidon
      const a = (t % 1.1) / 1.1 * PI * 2; dot(ctx, 0.3, 0.33, 0.045, '#6A7488');
      seg(ctx, 0.3, 0.33, 0.3 + cos(a) * 0.085, 0.33 + sin(a) * 0.085, 0.018, '#2A2F3B');
      seg(ctx, 0.3, 0.33, 0.3 + cos(a + PI) * 0.085, 0.33 + sin(a + PI) * 0.085, 0.018, '#2A2F3B');
      ctx.fillStyle = '#2F3646'; roundRect(ctx, -0.09, 0.032, 0.15, 0.034, 0.017); ctx.fill();  // selle
    },
    bench(ctx) { ctx.fillStyle = '#4A5264'; roundRect(ctx, -0.35, 0.08, 0.62, 0.06, 0.03); ctx.fill(); ctx.fillStyle = '#3A4152'; ctx.fillRect(-0.3, 0.14, 0.04, 0.3); ctx.fillRect(0.18, 0.14, 0.04, 0.3); },
    mat(ctx) { ctx.fillStyle = '#3A4466'; roundRect(ctx, -0.5, 0.42, 1.0, 0.035, 0.017); ctx.fill(); }
  };
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
  R.roundRect = roundRect;

  // ---------------------------------------------------------------- un exercice complet (personnage + appareil), centré dans un cadre
  // dessine dans un rectangle (w x h) ; t en secondes ; hl : muscles à mettre en valeur (0..1, pulsés)
  R.drawExercise = function (ctx, key, t, w, h, opts) {
    opts = opts || {};
    const ex = R.EX[key]; if (!ex) return;
    const pose = ex.pose(t);
    const s = Math.min(w / 1.2, h / 1.1) * (opts.zoom || 1);
    const cx = w / 2, floor = h * 0.86;          // le sol de l'appareil
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * sin(t * 4));
    const hl = {}; for (const k in (opts.hl || {})) hl[k] = opts.hl[k] * pulse;
    const j = R.solve(pose);
    let x = cx, y = 0, rot = 0;
    // repère de l'appareil : sol à y = 0, en unités du personnage
    const gearAt = (fn) => { ctx.save(); ctx.translate(cx, floor); ctx.scale(s, s); fn(); ctx.restore(); };
    if (key === 'bench') {
      gearAt(() => { ctx.fillStyle = '#4A5264'; roundRect(ctx, -0.38, -0.3, 0.66, 0.06, 0.03); ctx.fill(); ctx.fillStyle = '#3A4152'; ctx.fillRect(-0.32, -0.24, 0.04, 0.24); ctx.fillRect(0.2, -0.24, 0.04, 0.24); });
      rot = -PI / 2; x = cx + 0.02 * s; y = floor - 0.38 * s;
    } else if (key === 'plank') {
      gearAt(() => { ctx.fillStyle = '#3A4466'; roundRect(ctx, -0.55, -0.02, 1.1, 0.035, 0.017); ctx.fill(); });
      rot = PI / 2; x = cx - 0.12 * s; y = floor - 0.21 * s;
    } else if (key === 'bike') {
      // le vélo est dessiné dans le repère du personnage : les pieds suivent exactement les pédales
      x = cx - 0.2 * s; y = floor - 0.485 * s;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); R.gear.bike(ctx, t); ctx.restore();
    } else if (key === 'tuck') {
      x = cx; y = floor - 0.5 * s;
    } else {
      // pieds posés : le point le plus bas (chevilles ou orteils) touche le sol
      const low = ex.front ? Math.max(j.legL.A[1], j.legR.A[1]) + 0.058 : Math.max(j.legN.A[1], j.legF.A[1], j.legN.T[1], j.legF.T[1]) + 0.022;
      y = floor - low * s;
      if (ex.harness) gearAt(() => { ctx.translate(0, -0.47); R.gear.treadmill(ctx, t); });
      else if (key === 'stretch') gearAt(() => { ctx.fillStyle = '#3A4466'; roundRect(ctx, -0.45, -0.005, 0.9, 0.035, 0.017); ctx.fill(); });
      else gearAt(() => { ctx.fillStyle = '#4A5264'; roundRect(ctx, -0.32, -0.005, 0.64, 0.06, 0.02); ctx.fill(); ctx.fillStyle = '#5E6880'; roundRect(ctx, -0.3, -0.012, 0.6, 0.02, 0.01); ctx.fill(); });
    }
    // câbles de la machine (derrière le personnage)
    if (ex.bar && key !== 'bench') {
      const pts = ex.front ? [j.armL.W, j.armR.W] : [ex.bar === 'hands' ? j.armN.W : [j.S[0] - 0.01, j.S[1] + 0.005]];
      ctx.save(); ctx.strokeStyle = 'rgba(62,69,84,0.55)'; ctx.lineWidth = Math.max(1, 0.008 * s);
      for (const p of pts) {
        const bx = x + p[0] * s, by = y + p[1] * s;
        for (const d of (ex.front ? [0] : [-0.012, 0.012])) { ctx.beginPath(); ctx.moveTo(bx + d * s, by); ctx.lineTo(bx + d * s * 3 + (ex.front ? Math.sign(p[0]) * 0.03 * s : 0), floor); ctx.stroke(); }
      }
      ctx.restore();
    }
    const item = (c2, jj) => {
      if (ex.front) R.gear.barFront(c2, jj);
      else if (ex.bar && key !== 'bench') R.gear.bar(c2, jj, ex.bar);
      if (ex.harness) R.gear.harness(c2, jj);
    };
    R.draw(ctx, pose, { who: opts.who || 'coach', s, x, y, rot, t, hl, item, itemFront: key === 'bench' ? (c2, jj) => R.gear.bar(c2, jj, 'hands') : null });
  };
})(typeof self !== 'undefined' ? self : this);
