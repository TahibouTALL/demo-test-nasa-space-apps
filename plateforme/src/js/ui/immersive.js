/* AURA : simulations et évasion en 3D (AURA Immersion, intégrée telle quelle).
   Un geste suffit : la scène ou la simulation s'ouvre directement, sans menu.
   Avec un casque compatible, le bouton Casque apparaît dans la scène. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store;
  const $ = A.$, esc = A.esc, icon = A.icon;
  const I = A.immersive = {};

  I.SCENES = [
    { key: 'earth', title: 'Terre vue de l\'ISS', text: 'La coupole de la station, la Terre qui défile à 7,7 km/s, de jour, au crépuscule et de nuit.', tags: ['Images NASA', 'Orbite réelle'], img: 'immersion/img/thumb-earth.jpg' },
    { key: 'ocean', title: 'Océan au coucher du soleil', text: 'Au bout d\'une jetée, face à l\'Atlantique, pendant que le soleil descend.', tags: ['Vagues', 'Respiration guidée'], img: 'immersion/img/thumb-ocean.jpg' },
    { key: 'lake', title: 'Lac de montagne au matin', text: 'Un lac calme entre des sommets enneigés, la brume qui monte de l\'eau.', tags: ['Chants d\'oiseaux', 'Brume'], img: 'immersion/img/thumb-lake.jpg' },
    { key: 'desert', title: 'Désert de Lompoul la nuit', text: 'Sur la crête d\'une dune, sous la Voie lactée, un campement éclairé en contrebas.', tags: ['Ciel réel', 'Sénégal'], img: 'immersion/img/thumb-desert.jpg' }
  ];
  I.SIMS = [
    { key: 'anaphylaxie', fiche: 'F-INF-08', title: 'Allergie grave', text: 'Rafael réagit à un antibiotique. Tu mènes les soins pendant que la médecin de bord est dans le sas.', dur: '15 à 30 min', img: 'immersion/img/thumb-anaphylaxie.jpg' },
    { key: 'arret', fiche: 'F-CVN-07', title: 'Arrêt cardiaque en apesanteur', text: 'Lucas s\'effondre sur le tapis de course. Massage en apesanteur, défibrillateur, médicaments.', dur: '15 à 25 min', img: 'immersion/img/thumb-arret.jpg' },
    { key: 'fumee', fiche: 'F-EXP-06', title: 'Inhalation de fumée', text: 'Une carte électronique prend feu. Masques, air de la cabine, et une saturation qui trompe.', dur: 'temps accéléré', img: 'immersion/img/thumb-fumee.jpg' },
    { key: 'calcul', fiche: 'F-DIG-12', title: 'Calcul rénal et échographie', text: 'La médecin de bord a une colique néphrétique. Tu fais l\'échographie, guidé comme sur l\'ISS.', dur: 'échographie', img: 'immersion/img/thumb-calcul.jpg' }
  ];

  let vrSupported = null;
  I.vr = async () => {
    if (vrSupported !== null) return vrSupported;
    try { vrSupported = !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-vr')); } catch (e) { vrSupported = false; }
    return vrSupported;
  };

  function open(hash, meta) {
    const id = S.state.who;
    A.voice.stop();
    const el = A.el('<div class="immersive" role="dialog" aria-modal="true" aria-label="' + esc(meta.title) + '"><div class="loading" id="imLoad"><div class="stack center"><div id="imSophie" class="sophie-frame" style="width:150px"></div><p>' + esc(meta.title) + '</p></div></div><iframe title="' + esc(meta.title) + '" allow="xr-spatial-tracking; fullscreen; autoplay; microphone" allowfullscreen></iframe></div>');
    document.body.appendChild(el);
    const ch = A.character.create($('#imSophie', el));
    ch.setState('thinking');
    A.sky.paused = true;
    const frame = el.querySelector('iframe');
    frame.src = 'immersion/index.html#embed=1&' + hash;
    frame.onload = () => setTimeout(() => { const l = $('#imLoad', el); if (l) { l.style.opacity = 0; setTimeout(() => { ch.destroy(); l.remove(); }, 500); } }, 900);
    const started = Date.now();
    const close = () => { removeEventListener('message', onMsg); el.remove(); A.sky.paused = false; A.refresh(); };
    const onMsg = e => {
      const d = e.data || {};
      if (d.source !== 'aura-immersion' || e.source !== frame.contentWindow) return;
      if (d.type === 'aura-exit') {
        if (meta.kind === 'scene' && Date.now() - started > 60000) { const r = S.escapeDone(id, meta.key, Math.round((Date.now() - started) / 60000)); close(); A.celebrate(r, 'pause d\'évasion'); return; }
        close();
      }
      if (d.type === 'aura-relax-end') { const r = S.escapeDone(id, meta.key, d.minutes || 0); close(); A.celebrate(r, 'pause d\'évasion'); }
      if (d.type === 'aura-sim-end') {
        const ok = d.outcome === 'succes' && /bien|correct/i.test(d.verdict || '');
        const r = S.simResult(id, meta.key, { ok, verdict: d.verdict, score: d.verdict === 'Bien mené' ? 3 : d.verdict === 'Correct' ? 2 : 1 });
        close();
        A.celebrate(r, ok ? 'simulation réussie' : 'simulation terminée');
      }
    };
    addEventListener('message', onMsg);
  }
  I.scene = key => { const m = I.SCENES.find(s => s.key === key) || I.SCENES[0]; open('scene=' + m.key, Object.assign({ kind: 'scene' }, m)); };
  I.sim = (key, exam) => { const m = I.SIMS.find(s => s.key === key) || I.SIMS[0]; open('sim=' + m.key + (exam ? '&mode=exam' : ''), Object.assign({ kind: 'sim' }, m)); };

  function vrLine(kind) {
    return '<div class="panel vr-line" style="margin-top:22px"><span class="ic">' + icon('headset') + '</span><div style="flex:1"><b id="vrState">Avec un casque de réalité virtuelle</b><p class="muted small" id="vrText">Choisis un lieu, puis appuie sur Casque en haut de la scène.</p></div><button class="btn" data-vr>' + icon('headset') + 'Ouvrir dans le casque</button></div>';
  }
  function bindVR(node) {
    I.vr().then(ok => {
      const s = $('#vrState', node), t = $('#vrText', node);
      if (!s) return;
      if (ok) { s.textContent = 'Casque détecté'; t.textContent = 'Choisis un lieu : il s\'ouvre à l\'écran, puis appuie sur Casque en haut de la scène pour y entrer.'; }
    });
    const b = node.querySelector('[data-vr]');
    if (b) b.onclick = vrSheet;
  }
  function vrSheet() {
    const base = (S.state.settings.publicUrl || 'https://tahiboutall.github.io/demo-test-nasa-space-apps/').replace(/\/?$/, '/');
    const url = base + 'immersion/';
    let qr = '';
    try { const q = root.qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { qr = ''; }
    A.sheet('Ouvrir dans le casque', '<div class="grid2" style="align-items:center"><ol class="steps">' +
      '<li><span class="n">1</span><span>Mets le casque et ouvre son navigateur.</span></li>' +
      '<li><span class="n">2</span><span>Vise ce code avec le casque, ou tape l\'adresse ci-dessous.</span></li>' +
      '<li><span class="n">3</span><span>Choisis un lieu, puis appuie sur Casque.</span></li></ol>' +
      '<div class="center"><div class="qr" style="margin:0 auto">' + qr + '</div><p class="small muted" style="margin-top:10px;word-break:break-all">' + esc(url) + '</p></div></div>' +
      '<p class="faint small" style="margin-top:16px">En apesanteur, attache-toi ou tiens une main courante avant de mettre un casque. Si tu as le mal de l\'espace, reste à l\'écran : la scène est la même.</p>', { wide: true });
  }

  function card(x, attrs, tags) {
    return '<button class="scene" ' + attrs + '><img src="' + esc(x.img) + '" alt="" loading="lazy"><span class="go">' + icon('play') + '</span><span class="txt"><h3>' + esc(x.title) + '</h3><p>' + esc(x.text) + '</p><span class="meta">' + tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</span></span></button>';
  }

  A.views.evasion = {
    render() {
      return '<div class="enter"><div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Évasion</h1><p>Une pause loin de la station. Touche un lieu, tu y es.</p></div></div>' +
        '<div class="scenes">' + I.SCENES.map(x => card(x, 'data-scene="' + x.key + '"', x.tags.concat(['10 min']))).join('') + '</div>' + vrLine('scene') + '</div>';
    },
    mount(node, params) {
      node.querySelector('[data-back]').onclick = () => A.go('accueil');
      node.querySelectorAll('[data-scene]').forEach(b => b.onclick = () => I.scene(b.dataset.scene));
      bindVR(node);
      if (params.vr) setTimeout(vrSheet, 400);
    }
  };

  A.views.simulations = {
    render() {
      const m = S.member(S.state.who);
      return '<div class="enter"><div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Simulations</h1><p>Des urgences rares à répéter avant d\'en avoir besoin. Touche une carte, la simulation démarre.</p></div>' +
        '<label class="row small muted" style="flex:none"><button class="toggle" role="switch" id="simExam" aria-checked="false" aria-label="Mode examen"></button>Mode examen</label></div>' +
        '<div class="scenes">' + I.SIMS.map(x => {
          const r = m.sims[x.key];
          const best = r ? (r.wins ? 'réussie ' + A.plural(r.wins, 'fois', 'fois') : 'essayée ' + A.plural(r.runs, 'fois', 'fois')) : 'jamais faite';
          return card(x, 'data-sim="' + x.key + '"', ['Fiche ' + x.fiche, x.dur, best]);
        }).join('') + '</div>' + vrLine('sim') + '</div>';
    },
    mount(node) {
      node.querySelector('[data-back]').onclick = () => A.go('accueil');
      const ex = $('#simExam', node);
      ex.onclick = () => ex.setAttribute('aria-checked', ex.getAttribute('aria-checked') !== 'true');
      node.querySelectorAll('[data-sim]').forEach(b => b.onclick = () => I.sim(b.dataset.sim, ex.getAttribute('aria-checked') === 'true'));
      bindVR(node);
    }
  };
})(typeof self !== 'undefined' ? self : this);
