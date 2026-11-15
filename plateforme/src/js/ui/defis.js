/* AURA : sport, à la manière d'une application d'entraînement.
   Chaque exercice des machines de la station est animé, avec les muscles qu'il fait travailler
   et ce qu'il protège. Une séance guidée plein écran (minuteur, répétitions, repos, la suite),
   la carte des muscles de la semaine, la série, le niveau, le tour de la Terre et les écussons. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, G = A.gamify, R = A.rig;
  const $ = A.$, esc = A.esc, icon = A.icon;
  const SP = A.sport = {};

  /* ---------------- les exercices ---------------- */
  const EX = SP.EX = [
    { id: 'squat', name: 'Squat', where: 'Machine de musculation', group: 'jambes', hl: { quads: 1, glutes: 1, lowback: 0.35 }, protects: ['Os des hanches', 'Cuisses'], cues: ['Dos droit', 'Pousse dans les talons', 'Genoux dans l\'axe des pieds'], who: 'lucas' },
    { id: 'deadlift', name: 'Soulevé de terre', where: 'Machine de musculation', group: 'jambes', hl: { hams: 1, glutes: 1, lowback: 0.9 }, protects: ['Colonne', 'Hanches'], cues: ['Dos plat', 'La barre frôle les jambes', 'Les hanches vers l\'avant'], who: 'rafael' },
    { id: 'calf', name: 'Mollets', where: 'Machine de musculation', group: 'jambes', hl: { calves: 1 }, protects: ['Os des jambes', 'Chevilles'], cues: ['Monte sur la pointe', 'Redescends lentement'], who: 'aminata' },
    { id: 'bench', name: 'Développé couché', where: 'Machine de musculation', group: 'haut', hl: { chest: 1, triceps: 0.8, shoulders: 0.4 }, protects: ['Bras', 'Épaules'], cues: ['La barre vers la poitrine', 'Pousse en soufflant'], who: 'keiko' },
    { id: 'row', name: 'Tirage penché', where: 'Machine de musculation', group: 'haut', hl: { back: 1, biceps: 0.8 }, protects: ['Dos', 'Posture'], cues: ['Dos plat', 'Coudes vers l\'arrière'], who: 'lucas' },
    { id: 'press', name: 'Développé épaules', where: 'Machine de musculation', group: 'haut', hl: { shoulders: 1, triceps: 0.8 }, protects: ['Épaules', 'Bras'], cues: ['Ventre gainé', 'Bras tendus en haut'], who: 'rafael' },
    { id: 'run', name: 'Tapis et harnais', where: 'Tapis de course', group: 'cardio', hl: { calves: 1, quads: 0.6, hams: 0.5 }, protects: ['Cœur', 'Os des jambes'], cues: ['Le harnais te tient au tapis', 'Petites foulées régulières'], who: 'aminata', type: 'tapis', time: true },
    { id: 'bike', name: 'Vélo', where: 'Vélo ergomètre', group: 'cardio', hl: { quads: 1, calves: 0.4 }, protects: ['Cœur', 'Souffle'], cues: ['Pédale en rond', 'Respire régulièrement'], who: 'keiko', type: 'velo', time: true },
    { id: 'plank', name: 'Gainage', where: 'Tapis de sol', group: 'gainage', hl: { abs: 1, lowback: 0.5, shoulders: 0.3 }, protects: ['Colonne', 'Ventre'], cues: ['Corps bien droit', 'Respire, ne bloque pas'], who: 'lucas', time: true },
    { id: 'tuck', name: 'Genoux poitrine', where: 'En flottant', group: 'gainage', hl: { lowback: 0.9 }, protects: ['Bas du dos'], cues: ['Tiens trente secondes', 'Respire lentement'], who: 'rafael', time: true },
    { id: 'stretch', name: 'Grand étirement', where: 'Debout', group: 'gainage', hl: { back: 0.6, abs: 0.3, shoulders: 0.4 }, protects: ['Souplesse', 'Colonne'], cues: ['Grandis-toi', 'Bras au-dessus de la tête'], who: 'aminata', time: true }
  ];
  SP.get = id => EX.find(e => e.id === id);
  const GROUPS = [['tout', 'Tout'], ['jambes', 'Jambes'], ['haut', 'Haut du corps'], ['cardio', 'Cardio'], ['gainage', 'Gainage et dos']];

  // séance du jour : une journée jambes, une journée cardio, une journée haut du corps
  const PROGRAMS = SP.PROGRAMS = {
    jambes: { id: 'jambes', name: 'Jambes et os', type: 'muscu', items: ['squat', 'deadlift', 'calf', 'plank', 'tuck'] },
    cardio: { id: 'cardio', name: 'Cœur et souffle', type: 'velo', items: ['bike', 'run', 'bike', 'stretch'] },
    haut: { id: 'haut', name: 'Haut du corps', type: 'muscu', items: ['bench', 'row', 'press', 'plank', 'stretch'] }
  };
  SP.todayProgram = () => PROGRAMS[['jambes', 'cardio', 'haut'][((S.day() % 3) + 3) % 3]];
  // une séance = une suite d'étapes (effort, repos)
  SP.steps = (items, short) => {
    const out = [];
    items.forEach((key, i) => {
      const e = SP.get(key), cardio = e.group === 'cardio';
      const sets = short ? 1 : cardio || e.id === 'tuck' || e.id === 'stretch' ? 1 : 2;
      const work = short ? 40 : cardio ? 120 : e.id === 'tuck' || e.id === 'stretch' ? 30 : 40;
      for (let s = 0; s < sets; s++) {
        out.push({ kind: 'work', ex: e, set: s + 1, sets, dur: work });
        const last = i === items.length - 1 && s === sets - 1;
        if (!last) out.push({ kind: 'rest', dur: 15, next: s + 1 < sets ? e : SP.get(items[i + 1]) });
      }
    });
    return out;
  };
  const totalMin = steps => Math.round(steps.reduce((a, s) => a + s.dur, 0) / 60);
  const muscleNames = { quads: 'Cuisses', hams: 'Ischios', glutes: 'Fessiers', calves: 'Mollets', chest: 'Pectoraux', back: 'Dos', lowback: 'Bas du dos', abs: 'Abdos', shoulders: 'Épaules', biceps: 'Biceps', triceps: 'Triceps' };
  const mainMuscles = hl => Object.entries(hl).filter(([, v]) => v >= 0.8).map(([k]) => muscleNames[k]);

  /* ---------------- silhouette (face et dos) avec les muscles ---------------- */
  // unités : 1 = la hauteur du corps, origine au centre (mêmes proportions que les films)
  const ZONES = {
    front: {
      chest: '<ellipse cx="-.06" cy="-.24" rx=".055" ry=".042"/><ellipse cx=".06" cy="-.24" rx=".055" ry=".042"/>',
      abs: '<rect x="-.05" y="-.18" width=".1" height=".15" rx=".03"/>',
      shoulders: '<ellipse cx="-.16" cy="-.285" rx=".042" ry=".04"/><ellipse cx=".16" cy="-.285" rx=".042" ry=".04"/>',
      biceps: '<line x1="-.17" y1="-.25" x2="-.195" y2="-.09"/><line x1=".17" y1="-.25" x2=".195" y2="-.09"/>',
      quads: '<line x1="-.068" y1=".07" x2="-.075" y2=".22"/><line x1=".068" y1=".07" x2=".075" y2=".22"/>'
    },
    back: {
      back: '<rect x="-.11" y="-.29" width=".22" height=".14" rx=".03"/>',
      lowback: '<rect x="-.07" y="-.14" width=".14" height=".12" rx=".03"/>',
      glutes: '<ellipse cx="-.06" cy=".035" rx=".055" ry=".04"/><ellipse cx=".06" cy=".035" rx=".055" ry=".04"/>',
      hams: '<line x1="-.068" y1=".08" x2="-.075" y2=".22"/><line x1=".068" y1=".08" x2=".075" y2=".22"/>',
      calves: '<line x1="-.076" y1=".29" x2="-.079" y2=".4"/><line x1=".076" y1=".29" x2=".079" y2=".4"/>',
      triceps: '<line x1="-.17" y1="-.25" x2="-.195" y2="-.09"/><line x1=".17" y1="-.25" x2=".195" y2="-.09"/>',
      shoulders: '<ellipse cx="-.16" cy="-.285" rx=".042" ry=".04"/><ellipse cx=".16" cy="-.285" rx=".042" ry=".04"/>'
    }
  };
  const LIMB_W = { biceps: 0.06, triceps: 0.06, quads: 0.084, hams: 0.084, calves: 0.072 };
  let gid = 0;
  SP.body = (hl, view, o) => {
    o = o || {};
    const id = 'bm' + (++gid);
    const shape = '<circle cx="0" cy="-.415" r=".072"/>' +
      '<path d="M-.15 -.31 Q0 -.335 .15 -.31 L.12 -.12 L.115 -.04 L.13 .05 L0 .08 L-.13 .05 L-.115 -.04 L-.12 -.12 Z"/>' +
      '<g stroke="currentColor" stroke-linecap="round">' + [-1, 1].map(s => '<line x1="' + s * 0.165 + '" y1="-.29" x2="' + s * 0.2 + '" y2="-.06" stroke-width=".076"/><line x1="' + s * 0.2 + '" y1="-.06" x2="' + s * 0.215 + '" y2=".12" stroke-width=".064"/><line x1="' + s * 0.065 + '" y1=".04" x2="' + s * 0.075 + '" y2=".25" stroke-width=".116"/><line x1="' + s * 0.075 + '" y1=".25" x2="' + s * 0.08 + '" y2=".46" stroke-width=".09"/><circle cx="' + s * 0.218 + '" cy=".155" r=".03" stroke="none"/><ellipse cx="' + s * 0.09 + '" cy=".485" rx=".05" ry=".022" stroke="none"/>').join('') + '</g>' +
      '<line x1="0" y1="-.37" x2="0" y2="-.3" stroke="currentColor" stroke-width=".064" stroke-linecap="round"/>';
    const zones = Object.entries(ZONES[view]).filter(([k]) => hl[k] > 0.05).map(([k, svg]) => '<g opacity="' + Math.min(1, 0.25 + hl[k] * 0.75).toFixed(2) + '" stroke-width="' + (LIMB_W[k] || 0) + '">' + svg + '</g>').join('');
    return '<svg class="body" viewBox="-.3 -.52 .6 1.04" role="img" aria-label="' + esc(o.label || ('Muscles travaillés, vue ' + (view === 'front' ? 'de face' : 'de dos'))) + '"><defs><filter id="' + id + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".012"/></filter></defs>' +
      '<g class="sil" fill="currentColor" stroke-width="0">' + shape + '</g>' +
      (view === 'back' ? '<line x1="0" y1="-.3" x2="0" y2=".03" stroke="rgba(255,255,255,.14)" stroke-width=".006"/>' : '') +
      '<g class="mus" fill="#FF6B5A" stroke="#FF6B5A" stroke-linecap="round" filter="url(#' + id + ')">' + zones + '</g>' +
      '<g class="mus" fill="#FF8F80" stroke="#FF8F80" stroke-linecap="round">' + zones + '</g></svg>';
  };
  SP.bodyPair = (hl, o) => '<div class="bodypair' + (o && o.small ? ' small' : '') + '"><figure>' + SP.body(hl, 'front') + '<figcaption>Face</figcaption></figure><figure>' + SP.body(hl, 'back') + '<figcaption>Dos</figcaption></figure></div>';

  /* ---------------- animations (canevas), une seule boucle pour toutes ---------------- */
  const live = new Set();
  let raf = 0, io = null;
  const T0 = performance.now();
  function frame() {
    raf = 0;
    const t = (performance.now() - T0) / 1000;
    live.forEach(a => {
      if (!a.c.isConnected) { live.delete(a); return; }
      if (!a.vis) return;
      drawOne(a, a.paused ? a.pt : t + a.ph);
    });
    if (live.size && !A.reduced()) raf = requestAnimationFrame(frame);
  }
  function drawOne(a, t) {
    const dpr = Math.min(2, devicePixelRatio || 1), w = a.c.clientWidth, h = a.c.clientHeight;
    if (!w || !h) return;
    if (a.c.width !== Math.round(w * dpr)) { a.c.width = Math.round(w * dpr); a.c.height = Math.round(h * dpr); }
    const g = a.c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const ex = SP.get(a.key);
    R.drawExercise(g, a.key, t, w, h, { hl: a.hl === false ? null : (a.hl || ex.hl), who: a.who || ex.who, zoom: a.zoom || 1 });
  }
  SP.animate = (canvas, key, o) => {
    o = o || {};
    const a = { c: canvas, key, hl: o.hl, who: o.who, zoom: o.zoom, ph: o.ph || 0, vis: true, paused: false, pt: 0 };
    live.add(a);
    if ('IntersectionObserver' in root) {
      if (!io) io = new IntersectionObserver(es => es.forEach(e => { live.forEach(x => { if (x.c === e.target) x.vis = e.isIntersecting; }); }), { rootMargin: '80px' });
      io.observe(canvas);
    }
    drawOne(a, 1.2 + a.ph);
    if (!raf && !A.reduced()) raf = requestAnimationFrame(frame);
    return a;
  };
  SP.stopAll = () => { live.clear(); if (io) { io.disconnect(); io = null; } };

  /* ---------------- anneaux du jour (cardio, force) ---------------- */
  function rings(cardio, force) {
    const Rr = [52, 38], Wd = 11;
    const val = [cardio / G.GOALS.cardio, force / G.GOALS.force];
    const col = [['#9BE4FF', '#3D8BFF'], ['#FFE0A6', '#FF9F45']];
    return '<svg class="rings" viewBox="0 0 124 124" aria-hidden="true"><defs>' + col.map((c, i) => '<linearGradient id="rg' + i + '" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient>').join('') + '</defs>' +
      Rr.map((r, i) => { const c = 2 * Math.PI * r; const f = Math.min(val[i], 1); return '<circle cx="62" cy="62" r="' + r + '" stroke="rgba(255,255,255,.08)" stroke-width="' + Wd + '"/><circle class="rr" cx="62" cy="62" r="' + r + '" stroke="url(#rg' + i + ')" stroke-width="' + Wd + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '" data-off="' + (c * (1 - f)).toFixed(1) + '" transform="rotate(-90 62 62)" style="transition:stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1) ' + (i * 0.15) + 's"/>'; }).join('') + '</svg>';
  }

  /* ---------------- tour de la Terre en équipage ---------------- */
  function orbit() {
    const st = G.teamStage();
    const total = st.total;
    const C = 230, Rr = 160;
    const ang = km => -Math.PI / 2 + (km / total) * Math.PI * 2;
    const pt = (km, r) => [C + Math.cos(ang(km)) * (r || Rr), C + Math.sin(ang(km)) * (r || Rr)];
    const prog = Math.min(st.km, total);
    const large = prog / total > 0.5 ? 1 : 0;
    const [ex, ey] = pt(prog);
    const arc = prog > 0 ? 'M' + C + ' ' + (C - Rr) + ' A' + Rr + ' ' + Rr + ' 0 ' + large + ' 1 ' + ex.toFixed(1) + ' ' + ey.toFixed(1) : '';
    const marks = G.route.slice(0, -1).map((p, i) => {
      const [x, y] = pt(p.km), [lx, ly] = pt(p.km, Rr + 26);
      const passed = p.km <= st.km;
      const anchor = lx < C - 10 ? 'end' : lx > C + 10 ? 'start' : 'middle';
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (i === 0 ? 7 : 4.5) + '" fill="' + (passed ? '#FFC870' : '#2A3570') + '" stroke="' + (passed ? '#FFE3A3' : '#5A68B0') + '" stroke-width="1.5"/>' +
        '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="' + anchor + '" fill="' + (passed ? '#FFE3A3' : '#8C95C2') + '" font-size="12.5" font-family="Atkinson Hyperlegible Next, sans-serif">' + esc(p.nom) + '</text>';
    }).join('');
    const crew = S.crewIds().map((id, i) => { const m = S.member(id); const [x, y] = pt(prog); return '<g transform="translate(' + (x + (i - 1.5) * 9).toFixed(1) + ' ' + (y - 16 - (i % 2) * 8).toFixed(1) + ')"><circle r="7" fill="hsl(' + m.hue + ' 70% 60%)" stroke="#0C1230" stroke-width="2"/></g>'; }).join('');
    return '<svg viewBox="0 0 460 460" role="img" aria-label="Le tour de la Terre en équipage : ' + Math.round(st.km) + ' kilomètres sur ' + total + '">' +
      '<defs><radialGradient id="og" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#5FA8FF"/><stop offset=".6" stop-color="#1F4FB0"/><stop offset="1" stop-color="#0B1E55"/></radialGradient></defs>' +
      '<circle cx="' + C + '" cy="' + C + '" r="92" fill="url(#og)"/><circle cx="' + C + '" cy="' + C + '" r="96" fill="none" stroke="#9BE4FF" stroke-opacity=".5" stroke-width="3"/>' +
      '<text x="' + C + '" y="' + (C - 6) + '" text-anchor="middle" fill="#F2F4FF" font-size="30" font-weight="200" font-family="Atkinson Hyperlegible Next, sans-serif">' + A.num(st.km) + ' km</text>' +
      '<text x="' + C + '" y="' + (C + 18) + '" text-anchor="middle" fill="#C9E6FF" font-size="12.5" font-family="Atkinson Hyperlegible Next, sans-serif">sur ' + A.num(total) + ' km</text>' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + Rr + '" fill="none" stroke="rgba(176,194,255,.18)" stroke-width="6" stroke-dasharray="2 8"/>' +
      (arc ? '<path d="' + arc + '" fill="none" stroke="#FFC870" stroke-width="6" stroke-linecap="round"/>' : '') + marks + crew + '</svg>';
  }

  /* ---------------- muscles travaillés cette semaine ---------------- */
  const DEFAULT_MUS = {
    muscu: { quads: 0.5, glutes: 0.5, hams: 0.4, back: 0.5, chest: 0.4, shoulders: 0.4, calves: 0.3, lowback: 0.4, abs: 0.3, biceps: 0.3, triceps: 0.3 },
    velo: { quads: 1, calves: 0.5 }, tapis: { calves: 1, quads: 0.6, hams: 0.5 }
  };
  SP.weekMuscles = id => {
    const m = S.member(id), acc = {};
    m.exercise.filter(x => x.d > S.day() - 7).forEach(x => {
      const mus = x.mus || Object.fromEntries(Object.entries(DEFAULT_MUS[x.type] || {}).map(([k, v]) => [k, v * x.min * 60]));
      Object.entries(mus).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
    });
    const mx = Math.max(1, ...Object.values(acc));
    return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v / mx]));
  };

  /* ---------------- l'écran Sport ---------------- */
  A.views.defis = {
    wide: true,
    render(node, params) {
      const id = S.state.who, m = S.member(id);
      const ex = S.exerciseToday(id);
      const lv = G.level(m.xp);
      const streak = G.streak(m);
      const st = G.teamStage();
      const prog = SP.todayProgram(), steps = SP.steps(prog.items);
      const g = params.g || 'tout';
      const byDay = {};
      m.exercise.forEach(x => { byDay[x.d] = (byDay[x.d] || 0) + x.min; });
      const goal = G.GOALS.cardio + G.GOALS.force;
      const week = Array.from({ length: 7 }, (_, i) => { const d = S.day() - 6 + i; const v = byDay[d] || 0; return '<i class="' + (v >= goal * 0.8 ? 'ok' : v > 0 ? 'part' : '') + (d === S.day() ? ' now' : '') + '" title="Jour ' + d + ' : ' + v + ' min"></i>'; }).join('');
      const wk = SP.weekMuscles(id);
      const patches = G.PATCHES.map(p => '<button class="patch' + (m.badges[p.id] ? '' : ' locked') + '" data-patch="' + p.id + '">' + A.patchSVG(p, !m.badges[p.id]) + '<b>' + esc(p.nom) + '</b></button>').join('');
      const toNext = st.to.km - st.km;
      const list = EX.filter(e => g === 'tout' || e.group === g);
      const allMus = {}; prog.items.forEach(k => Object.entries(SP.get(k).hl).forEach(([mm, v]) => { allMus[mm] = Math.max(allMus[mm] || 0, v); }));
      return '<div class="enter sport">' +
        '<div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Sport</h1><p>Chaque séance protège tes os, tes muscles et ton cœur.</p></div></div>' +
        // séance du jour
        '<section class="sx-hero">' +
          '<div class="stage big"><canvas data-anim="' + prog.items[0] + '" data-cycle="' + prog.items.join(',') + '" aria-label="Animation : ' + esc(SP.get(prog.items[0]).name) + '"></canvas><span class="tagline">Séance du jour</span></div>' +
          '<div class="sx-info"><h2>' + esc(prog.name) + '</h2>' +
            '<p class="sx-meta"><span>' + icon('clock') + totalMin(steps) + ' min</span><span>' + icon(prog.type === 'muscu' ? 'dumbbell' : 'bike') + A.plural(prog.items.length, 'exercice') + '</span></p>' +
            '<div class="sx-seq">' + prog.items.map(k => '<span>' + esc(SP.get(k).name) + '</span>').join('') + '</div>' +
            SP.bodyPair(allMus, { small: true }) +
            '<button class="btn primary big sx-go" data-start>' + icon('play') + 'Commencer</button>' +
          '</div>' +
        '</section>' +
        // aujourd'hui
        '<section class="sx-today">' +
          '<div class="tile ringtile">' + rings(ex.cardio, ex.force) + '<div><b>' + (ex.cardio + ex.force) + ' <small>/ ' + goal + ' min</small></b><span><i class="d c"></i>Cardio ' + ex.cardio + ' min</span><span><i class="d f"></i>Force ' + ex.force + ' min</span></div></div>' +
          '<div class="tile streaktile"><span class="fl">' + icon('flame') + '</span><div><b>' + streak + '</b><span>' + (streak > 1 ? 'jours de suite' : 'jour') + '</span></div><div class="wdots" aria-label="Les sept derniers jours">' + week + '</div></div>' +
          '<div class="tile logtile"><span class="lab">Noter une séance</span><div class="log-ex">' + [['velo', 'bike', 'Vélo'], ['tapis', 'run', 'Tapis'], ['muscu', 'dumbbell', 'Muscu']].map(([k, ic, l]) => '<button data-log="' + k + '">' + icon(ic) + '<b>' + l + '</b></button>').join('') + '</div></div>' +
        '</section>' +
        // exercices
        '<div class="sx-head"><h2>Exercices</h2><div class="vchips" role="group" aria-label="Filtrer les exercices">' + GROUPS.map(([k, l]) => '<button class="vchip' + (k === g ? ' on' : '') + '" data-g="' + k + '" aria-pressed="' + (k === g) + '">' + l + '</button>').join('') + '</div></div>' +
        '<div class="sx-grid">' + list.map((e, i) => '<button class="sx-card" data-ex="' + e.id + '"><span class="stage"><canvas data-anim="' + e.id + '" data-ph="' + (i * 0.37) + '" aria-hidden="true"></canvas></span><span class="nm"><b>' + esc(e.name) + '</b><span>' + esc(mainMuscles(e.hl).join(', ')) + '</span></span><span class="pr">' + e.protects.map(p => '<i>' + esc(p) + '</i>').join('') + '</span></button>').join('') + '</div>' +
        // la semaine
        '<section class="sx-week panel"><div><h2>Ta semaine</h2><p class="muted">Plus la couleur est vive, plus le muscle a travaillé ces sept derniers jours.</p>' +
          (Object.keys(wk).length ? '<div class="sx-legend"><span><i style="opacity:.3"></i>Un peu</span><span><i></i>Beaucoup</span></div>' : '<p class="muted small">Pas encore de séance cette semaine.</p>') + '</div>' + SP.bodyPair(wk) + '</section>' +
        // tour de la Terre, niveau, écussons
        '<section class="panel orbit-goal"><div class="split" style="align-items:center"><div>' + orbit() + '</div><div class="stack"><h2>Le tour de la Terre, ensemble</h2><p class="muted">Les kilomètres de vélo et de tapis de tout l\'équipage s\'additionnent, au départ de Dakar.</p><p class="lead" style="color:var(--ink)">Prochaine étape : <b>' + esc(st.to.nom) + '</b>, dans ' + A.num(Math.max(0, toNext)) + ' km.</p>' +
          '<div class="level-card"><div class="big">' + lv.n + '</div><div><span class="muted small">Niveau ' + lv.n + '</span><h3>' + esc(lv.name) + '</h3><div class="levelbar"><i style="width:' + (lv.frac * 100).toFixed(0) + '%"></i></div><p class="muted small" style="margin-top:8px">' + (lv.next ? 'Encore ' + A.num(lv.toNext) + ' points pour ' + esc(lv.next) : 'Tu es au sommet.') + '</p></div></div></div></div></section>' +
        '<h2 style="margin:34px 0 16px">Écussons de mission</h2><div class="patches">' + patches + '</div>' +
        '</div>';
    },
    mount(node, params) {
      node.querySelector('[data-back]').onclick = () => A.go('accueil');
      requestAnimationFrame(() => setTimeout(() => node.querySelectorAll('.rr').forEach(c => { c.style.strokeDashoffset = c.dataset.off; }), 60));
      node.querySelectorAll('canvas[data-anim]').forEach(c => {
        const a = SP.animate(c, c.dataset.anim, { ph: +(c.dataset.ph || 0) });
        // la séance du jour fait défiler ses exercices
        if (c.dataset.cycle) { const keys = c.dataset.cycle.split(','); let k = 0; this.cyc = setInterval(() => { k = (k + 1) % keys.length; a.key = keys[k]; c.setAttribute('aria-label', 'Animation : ' + SP.get(keys[k]).name); }, 5200); }
      });
      node.querySelector('[data-start]').onclick = () => SP.session(SP.todayProgram().items, { name: SP.todayProgram().name, type: SP.todayProgram().type });
      node.querySelectorAll('[data-g]').forEach(b => b.onclick = () => A.go('defis', b.dataset.g === 'tout' ? { keep: 1 } : { g: b.dataset.g, keep: 1 }));
      node.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => exSheet(b.dataset.ex));
      node.querySelectorAll('[data-log]').forEach(b => b.onclick = () => logSheet(b.dataset.log));
      node.querySelectorAll('[data-patch]').forEach(b => b.onclick = () => {
        const p = G.PATCHES.find(x => x.id === b.dataset.patch);
        const m = S.member(S.state.who);
        A.sheet(p.nom, '<div class="center stack"><div style="width:180px;margin:0 auto">' + A.patchSVG(p, !m.badges[p.id]) + '</div><p class="lead" style="margin:0 auto">' + esc(p.texte) + '</p><p class="muted">' + (m.badges[p.id] ? 'Obtenu au jour ' + m.badges[p.id] + '.' : 'Pas encore obtenu.') + '</p></div>');
      });
      if (params.log) setTimeout(() => logSheet(params.log), 300);
      if (params.seance) setTimeout(() => node.querySelector('[data-start]').click(), 200);
    },
    unmount() { clearInterval(this.cyc); SP.stopAll(); }
  };

  /* ---------------- fiche d'un exercice ---------------- */
  function exSheet(key) {
    const e = SP.get(key);
    const sh = A.sheet(e.name, '<div class="sx-sheet"><div class="stage big"><canvas data-x aria-label="Animation : ' + esc(e.name) + '"></canvas></div><div class="stack">' +
      '<p class="muted">' + esc(e.where) + '</p>' + SP.bodyPair(e.hl) +
      '<div class="pr big">' + e.protects.map(p => '<i>' + icon('shield') + esc(p) + '</i>').join('') + '</div>' +
      '<ul class="cues">' + e.cues.map(c => '<li>' + icon('check') + esc(c) + '</li>').join('') + '</ul>' +
      '<button class="btn primary block" data-try>' + icon('play') + 'Essayer, 40 secondes</button></div></div>', { wide: true, onClose: () => { live.delete(a); } });
    const a = SP.animate(sh.querySelector('[data-x]'), key);
    sh.querySelector('[data-try]').onclick = () => { A.closeSheet(); SP.session([key], { name: e.name, type: e.type || 'muscu', short: true }); };
  }

  /* ---------------- séance guidée, plein écran ---------------- */
  let actx = null;
  function beep(f, d, v) {
    if (!S.state.settings.sound) return;
    try {
      actx = actx || new (root.AudioContext || root.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.0001;
      o.connect(g); g.connect(actx.destination);
      const t = actx.currentTime; g.gain.exponentialRampToValueAtTime(v || 0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* pas de son */ }
  }
  SP.session = (items, o) => {
    o = o || {};
    const id = S.state.who;
    const steps = SP.steps(items, o.short);
    const el = A.el('<div class="coach" role="dialog" aria-modal="true" aria-label="Séance : ' + esc(o.name || 'Sport') + '">' +
      '<div class="ch-top"><div class="ch-prog">' + steps.filter(s => s.kind === 'work').map(() => '<i><b></b></i>').join('') + '</div><button class="icon-btn" data-quit aria-label="Arrêter la séance">' + icon('close') + '</button></div>' +
      '<div class="ch-stage"><canvas aria-hidden="true"></canvas><div class="ch-bodies"></div><div class="ch-rest"><span>Repos</span></div></div>' +
      '<div class="ch-panel"><div class="ch-name"><b></b><span></span></div>' +
        '<div class="ch-timer"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle class="r" cx="60" cy="60" r="52"/></svg><div><b>0:40</b><span></span></div></div>' +
        '<div class="ch-next"><span class="lab">Ensuite</span><span class="nx"><canvas aria-hidden="true"></canvas><b></b></span></div>' +
        '<div class="ch-ctl"><button class="icon-btn big" data-pause aria-label="Pause">' + icon('pause') + '</button><button class="icon-btn" data-skip aria-label="Passer">' + icon('next') + '</button></div>' +
      '</div></div>');
    document.body.appendChild(el);
    document.documentElement.classList.add('coaching');
    A.sky.paused = true; A.voice.stop();
    const cv = el.querySelector('.ch-stage canvas'), nx = el.querySelector('.nx canvas');
    const a = SP.animate(cv, steps[0].ex.id, { zoom: 1.08 });
    const an = SP.animate(nx, (steps[1] && steps[1].next ? steps[1].next.id : steps[0].ex.id), { hl: false });
    const ring = el.querySelector('.ch-timer .r'), C = 2 * Math.PI * 52;
    ring.style.strokeDasharray = C.toFixed(1);
    let i = 0, left = steps[0].dur, paused = false, done = 0, last = performance.now(), lastSec = -1, rafId = 0;
    const secBy = {}, musBy = {};
    const bars = Array.from(el.querySelectorAll('.ch-prog b'));
    const workIdx = s => steps.slice(0, s + 1).filter(x => x.kind === 'work').length - 1;
    function enter() {
      const s = steps[i];
      left = s.dur; lastSec = -1;
      el.classList.toggle('rest', s.kind === 'rest');
      if (s.kind === 'work') {
        a.key = s.ex.id; a.hl = s.ex.hl; a.paused = false;
        el.querySelector('.ch-name b').textContent = s.ex.name;
        el.querySelector('.ch-name span').textContent = s.sets > 1 ? 'Série ' + s.set + ' sur ' + s.sets : s.ex.where;
        el.querySelector('.ch-bodies').innerHTML = SP.bodyPair(s.ex.hl, { small: true });
        const nxt = steps.slice(i + 1).find(x => x.kind === 'work');
        el.querySelector('.ch-next').hidden = !nxt;
        if (nxt) { an.key = nxt.ex.id; el.querySelector('.nx b').textContent = nxt.ex.name; }
        beep(1320, 0.25, 0.2);
        if (S.state.settings.sound && s.set === 1) A.voice.speak(s.ex.name + '. ' + s.ex.cues[0] + '.', { rate: 1.05 });
      } else {
        a.key = s.next.id; a.paused = true; a.pt = 0.6;
        el.querySelector('.ch-name b').textContent = 'Repos';
        el.querySelector('.ch-name span').textContent = 'Ensuite : ' + s.next.name;
        el.querySelector('.ch-next').hidden = true;
        beep(660, 0.3, 0.14);
      }
    }
    function paint() {
      const s = steps[i], f = 1 - left / s.dur;
      ring.style.strokeDashoffset = (C * f).toFixed(1);
      const sec = Math.ceil(left);
      el.querySelector('.ch-timer b').textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
      const per = s.kind === 'work' && R.EX[s.ex.id] ? R.EX[s.ex.id].per : 0;
      el.querySelector('.ch-timer span').textContent = s.kind === 'work' && !s.ex.time && per ? A.plural(Math.floor((s.dur - left) / per), 'répétition') : '';
      if (s.kind === 'work') { const w = workIdx(i); bars.forEach((b, k) => { b.style.width = (k < w ? 100 : k === w ? f * 100 : 0) + '%'; }); }
      if (sec !== lastSec) { if (sec <= 3 && sec > 0) beep(880, 0.09, 0.16); lastSec = sec; }
    }
    function tick(now) {
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      if (!paused) {
        left -= dt;
        const s = steps[i];
        if (s.kind === 'work') { const ty = s.ex.type || (o.type === 'velo' ? 'muscu' : o.type) || 'muscu'; secBy[ty] = (secBy[ty] || 0) + dt; Object.entries(s.ex.hl).forEach(([k, v]) => { musBy[k] = (musBy[k] || 0) + v * dt; }); done += dt; }
        if (left <= 0) { i++; if (i >= steps.length) return finish(); enter(); }
        paint();
      }
      rafId = requestAnimationFrame(tick);
    }
    const setPause = p => { paused = p; a.paused = p; a.pt = (performance.now() - T0) / 1000; el.classList.toggle('paused', p); const b = el.querySelector('[data-pause]'); b.innerHTML = icon(p ? 'play' : 'pause'); b.setAttribute('aria-label', p ? 'Reprendre' : 'Pause'); };
    el.querySelector('[data-pause]').onclick = () => setPause(!paused);
    el.querySelector('[data-skip]').onclick = () => { left = 0; };
    el.querySelector('.ch-stage').onclick = () => setPause(!paused);
    const close = () => { cancelAnimationFrame(rafId); live.delete(a); live.delete(an); el.remove(); document.documentElement.classList.remove('coaching'); A.sky.paused = false; removeEventListener('keydown', onKey); A.voice.stop(); };
    const onKey = e => { if (e.key === ' ') { e.preventDefault(); setPause(!paused); } if (e.key === 'Escape') quit(); };
    addEventListener('keydown', onKey);
    function quit() {
      if (done < 50) { close(); return; }
      setPause(true);
      if (el.querySelector('.ch-ask')) return;
      const ask = A.el('<div class="ch-ask" role="alertdialog" aria-label="Arrêter la séance ?"><div><b>Arrêter la séance ?</b><p>Les minutes déjà faites seront notées.</p><div class="row"><button class="btn" data-k>Continuer</button><button class="btn primary" data-s>Arrêter</button></div></div></div>');
      el.appendChild(ask);
      ask.querySelector('[data-k]').onclick = () => { ask.remove(); setPause(false); };
      ask.querySelector('[data-s]').onclick = () => { ask.remove(); finish(true); };
      ask.querySelector('[data-k]').focus();
    }
    el.querySelector('[data-quit]').onclick = quit;
    function finish(early) {
      cancelAnimationFrame(rafId);
      const results = [];
      Object.entries(secBy).forEach(([ty, sec]) => { const min = Math.max(1, Math.round(sec / 60)); if (sec >= 20) { const r = S.logExercise(id, ty, min); r.x.mus = Object.fromEntries(Object.entries(musBy).map(([k, v]) => [k, Math.round(v * (sec / Math.max(1, done)))])); r.x.prog = o.name; results.push(r); } });
      S.save();
      const mins = Math.max(1, Math.round(done / 60));
      const mus = {}; const mx = Math.max(1, ...Object.values(musBy)); Object.entries(musBy).forEach(([k, v]) => { mus[k] = v / mx; });
      el.classList.remove('rest'); el.classList.add('end');
      el.querySelector('.ch-stage').innerHTML = '<div class="ch-done"><span class="medal">' + icon('check') + '</span><h2>' + (early ? 'Séance notée' : 'Séance terminée') + '</h2><p><b>' + mins + ' min</b> de ' + esc(o.name || 'sport') + '</p>' + SP.bodyPair(mus) + '</div>';
      el.querySelector('.ch-panel').innerHTML = '<button class="btn gold big" data-ok>' + icon('check') + 'Super</button>';
      el.querySelector('.ch-panel [data-ok]').onclick = () => { close(); A.render(); };
      beep(1046, 0.18, 0.16); setTimeout(() => beep(1318, 0.18, 0.16), 160); setTimeout(() => beep(1568, 0.35, 0.18), 320);
      const last = results[results.length - 1];
      if (last) A.celebrate(last.res, 'séance guidée');
      A.burst(innerWidth / 2, innerHeight * 0.35, ['#FFC870', '#79D8FF', '#FFE3A3', '#7BE3C6']);
    }
    enter(); paint();
    rafId = requestAnimationFrame(t => { last = t; tick(t); });
  };

  /* ---------------- noter une séance faite sans l'application ---------------- */
  function logSheet(type) {
    const id = S.state.who;
    const names = { velo: 'Vélo', tapis: 'Tapis de course', muscu: 'Musculation' };
    let min = type === 'muscu' ? 45 : 30;
    const sh = A.sheet(names[type], '<div class="stack-lg"><div class="stepper"><button class="icon-btn" id="lMinus" aria-label="Moins">' + icon('minus') + '</button><div class="val" id="lVal"></div><button class="icon-btn" id="lPlus" aria-label="Plus">' + icon('plus') + '</button></div><div class="row wrap" style="justify-content:center">' + [15, 30, 45, 60].map(v => '<button class="chip" data-v="' + v + '">' + v + ' min</button>').join('') + '</div><p class="muted center" id="lKm"></p><button class="btn gold big block" id="lSave">' + icon('check') + 'Enregistrer la séance</button></div>');
    const paint = () => { sh.querySelector('#lVal').innerHTML = min + '<small>min</small>'; const km = S.kmOf(type, min); sh.querySelector('#lKm').textContent = km ? 'Environ ' + A.num(km, 1) + ' km pour le tour de la Terre.' : 'La force ne compte pas en kilomètres, mais elle protège tes os.'; };
    paint();
    sh.querySelector('#lMinus').onclick = () => { min = Math.max(5, min - 5); paint(); };
    sh.querySelector('#lPlus').onclick = () => { min = Math.min(180, min + 5); paint(); };
    sh.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { min = +b.dataset.v; paint(); });
    sh.querySelector('#lSave').onclick = () => {
      const r = S.logExercise(id, type, min);
      A.closeSheet();
      A.render();
      A.celebrate(r.res, names[type].toLowerCase());
      const rect = document.querySelector('.rings');
      if (rect) { const b = rect.getBoundingClientRect(); A.burst(b.left + b.width / 2, b.top + b.height / 2, ['#FFC870', '#79D8FF', '#FFE3A3']); }
    };
  }
  SP.logSheet = logSheet;
})(typeof self !== 'undefined' ? self : this);
