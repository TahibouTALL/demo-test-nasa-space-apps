/* AURA : défis (sport, série, niveau, objectif d'équipage, écussons). */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, G = A.gamify;
  const $ = A.$, esc = A.esc, icon = A.icon;

  function rings(cardio, force) {
    const R = [96, 74], W = 18;
    const val = [cardio / G.GOALS.cardio, force / G.GOALS.force];
    const col = [['#9BE4FF', '#3D8BFF'], ['#FFE0A6', '#FF9F45']];
    return '<svg class="rings" viewBox="0 0 220 220" aria-hidden="true"><defs>' + col.map((c, i) => '<linearGradient id="rg' + i + '" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient>').join('') + '</defs>' +
      R.map((r, i) => { const c = 2 * Math.PI * r; const f = Math.min(val[i], 1); return '<circle cx="110" cy="110" r="' + r + '" stroke="rgba(255,255,255,.08)" stroke-width="' + W + '"/><circle class="rr" cx="110" cy="110" r="' + r + '" stroke="url(#rg' + i + ')" stroke-width="' + W + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '" data-off="' + (c * (1 - f)).toFixed(1) + '" transform="rotate(-90 110 110)" style="transition:stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1) ' + (i * 0.15) + 's"/>'; }).join('') +
      '<text x="110" y="106" text-anchor="middle" fill="#F2F4FF" font-size="34" font-weight="200" font-family="Atkinson Hyperlegible Next, sans-serif">' + (cardio + force) + '</text><text x="110" y="130" text-anchor="middle" fill="#8C95C2" font-size="13" font-family="Atkinson Hyperlegible Next, sans-serif">minutes</text></svg>';
  }

  function orbit() {
    const st = G.teamStage();
    const total = st.total;
    const C = 230, R = 160;
    const ang = km => -Math.PI / 2 + (km / total) * Math.PI * 2;
    const pt = (km, r) => [C + Math.cos(ang(km)) * (r || R), C + Math.sin(ang(km)) * (r || R)];
    const prog = Math.min(st.km, total);
    const large = prog / total > 0.5 ? 1 : 0;
    const [ex, ey] = pt(prog);
    const arc = prog > 0 ? 'M' + C + ' ' + (C - R) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + ex.toFixed(1) + ' ' + ey.toFixed(1) : '';
    const marks = G.route.slice(0, -1).map((p, i) => {
      const [x, y] = pt(p.km), [lx, ly] = pt(p.km, R + 26);
      const passed = p.km <= st.km;
      const anchor = lx < C - 10 ? 'end' : lx > C + 10 ? 'start' : 'middle';
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (i === 0 ? 7 : 4.5) + '" fill="' + (passed ? '#FFC870' : '#2A3570') + '" stroke="' + (passed ? '#FFE3A3' : '#5A68B0') + '" stroke-width="1.5"/>' +
        '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="' + anchor + '" fill="' + (passed ? '#FFE3A3' : '#8C95C2') + '" font-size="12.5" font-family="Atkinson Hyperlegible Next, sans-serif">' + esc(p.nom) + '</text>';
    }).join('');
    const crew = S.crewIds().map((id, i) => { const m = S.member(id); const [x, y] = pt(prog, R - 2 - i * 0); return '<g transform="translate(' + (x + (i - 1.5) * 9).toFixed(1) + ' ' + (y - 16 - (i % 2) * 8).toFixed(1) + ')"><circle r="7" fill="hsl(' + m.hue + ' 70% 60%)" stroke="#0C1230" stroke-width="2"/></g>'; }).join('');
    return '<svg viewBox="0 0 460 460" role="img" aria-label="Le tour de la Terre en équipage : ' + Math.round(st.km) + ' kilomètres sur ' + total + '">' +
      '<defs><radialGradient id="og" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#5FA8FF"/><stop offset=".6" stop-color="#1F4FB0"/><stop offset="1" stop-color="#0B1E55"/></radialGradient></defs>' +
      '<circle cx="' + C + '" cy="' + C + '" r="92" fill="url(#og)"/><circle cx="' + C + '" cy="' + C + '" r="96" fill="none" stroke="#9BE4FF" stroke-opacity=".5" stroke-width="3"/>' +
      '<text x="' + C + '" y="' + (C - 6) + '" text-anchor="middle" fill="#F2F4FF" font-size="30" font-weight="200" font-family="Atkinson Hyperlegible Next, sans-serif">' + A.num(st.km) + ' km</text>' +
      '<text x="' + C + '" y="' + (C + 18) + '" text-anchor="middle" fill="#C9E6FF" font-size="12.5" font-family="Atkinson Hyperlegible Next, sans-serif">sur ' + A.num(total) + ' km</text>' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="none" stroke="rgba(176,194,255,.18)" stroke-width="6" stroke-dasharray="2 8"/>' +
      (arc ? '<path d="' + arc + '" fill="none" stroke="#FFC870" stroke-width="6" stroke-linecap="round"/>' : '') + marks + crew + '</svg>';
  }

  A.views.defis = {
    render() {
      const id = S.state.who, m = S.member(id);
      const ex = S.exerciseToday(id);
      const lv = G.level(m.xp);
      const streak = G.streak(m);
      const st = G.teamStage();
      const byDay = {};
      m.exercise.forEach(x => { byDay[x.d] = (byDay[x.d] || 0) + x.min; });
      const goal = G.GOALS.cardio + G.GOALS.force;
      const week = Array.from({ length: 7 }, (_, i) => { const d = S.day() - 6 + i; return '<i class="' + ((byDay[d] || 0) >= goal * 0.8 ? 'ok' : '') + '">' + (d === S.day() ? 'auj.' : 'J' + d) + '</i>'; }).join('');
      const patches = G.PATCHES.map(p => '<button class="patch' + (m.badges[p.id] ? '' : ' locked') + '" data-patch="' + p.id + '">' + A.patchSVG(p, !m.badges[p.id]) + '<b>' + esc(p.nom) + '</b></button>').join('');
      const toNext = st.to.km - st.km;
      return '<div class="enter"><div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Défis</h1><p>Ton sport protège tes os, tes muscles et ton cœur. Chaque minute compte, pour toi et pour l\'équipage.</p></div></div>' +
        '<div class="split">' +
          '<div class="panel"><div class="panel-title"><h2>Aujourd\'hui</h2><span class="tag gold">' + icon('star') + '1 point par minute</span></div>' +
            '<div class="rings-wrap">' + rings(ex.cardio, ex.force) + '<div class="legend">' +
              '<div class="l"><i style="background:#79D8FF"></i><b>Cardio</b><span>' + ex.cardio + ' / ' + G.GOALS.cardio + ' min</span></div>' +
              '<div class="l"><i style="background:#FFC870"></i><b>Force</b><span>' + ex.force + ' / ' + G.GOALS.force + ' min</span></div>' +
              '<p class="muted small">La musculation protège les os ; le cardio, le cœur et l\'endurance.</p></div></div>' +
            '<p class="muted" style="margin:20px 0 12px">Ajouter une séance</p><div class="log-ex">' +
              [['velo', 'bike', 'Vélo'], ['tapis', 'run', 'Tapis'], ['muscu', 'dumbbell', 'Musculation']].map(([k, ic, l]) => '<button data-log="' + k + '">' + icon(ic) + '<b>' + l + '</b></button>').join('') + '</div></div>' +
          '<div class="stack">' +
            '<div class="panel"><div class="level-card"><div class="big">' + lv.n + '</div><div><span class="muted small">Niveau ' + lv.n + '</span><h2>' + esc(lv.name) + '</h2><div class="levelbar"><i style="width:' + (lv.frac * 100).toFixed(0) + '%"></i></div><p class="muted small" style="margin-top:8px">' + (lv.next ? 'Encore ' + A.num(lv.toNext) + ' points pour ' + esc(lv.next) : 'Tu es au sommet.') + '</p></div></div></div>' +
            '<div class="panel"><div class="streak"><span class="fl">' + icon('flame') + '</span><div><div class="n">' + streak + '</div><span class="muted">' + (streak > 1 ? 'jours de suite' : 'jour') + ' avec ton sport</span></div></div><div class="week">' + week + '</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="panel orbit-goal" style="margin-top:22px"><div class="split" style="align-items:center"><div>' + orbit() + '</div><div class="stack"><h2>Le tour de la Terre, ensemble</h2><p class="muted">Les kilomètres de vélo et de tapis de tout l\'équipage s\'additionnent, au départ de Dakar.</p><p class="lead" style="color:var(--ink)">Prochaine étape : <b>' + esc(st.to.nom) + '</b>, dans ' + A.num(Math.max(0, toNext)) + ' km.</p><p class="muted small">' + st.passed + ' étape' + (st.passed > 1 ? 's' : '') + ' franchie' + (st.passed > 1 ? 's' : '') + ' sur ' + (G.route.length - 1) + '. Pas de classement entre vous : on avance ensemble.</p></div></div></div>' +
        '<h2 style="margin:34px 0 16px">Écussons de mission</h2><div class="patches">' + patches + '</div>' +
        '</div>';
    },
    mount(node, params) {
      node.querySelector('[data-back]').onclick = () => A.go('accueil');
      requestAnimationFrame(() => setTimeout(() => node.querySelectorAll('.rr').forEach(c => { c.style.strokeDashoffset = c.dataset.off; }), 60));
      node.querySelectorAll('[data-log]').forEach(b => b.onclick = () => logSheet(b.dataset.log));
      node.querySelectorAll('[data-patch]').forEach(b => b.onclick = () => {
        const p = G.PATCHES.find(x => x.id === b.dataset.patch);
        const m = S.member(S.state.who);
        A.sheet(p.nom, '<div class="center stack"><div style="width:180px;margin:0 auto">' + A.patchSVG(p, !m.badges[p.id]) + '</div><p class="lead" style="margin:0 auto">' + esc(p.texte) + '</p><p class="muted">' + (m.badges[p.id] ? 'Obtenu au jour ' + m.badges[p.id] + '.' : 'Pas encore obtenu.') + '</p></div>');
      });
      if (params.log) setTimeout(() => logSheet(params.log), 300);
    }
  };

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
})(typeof self !== 'undefined' ? self : this);
