/* AURA : simulations et évasion en 3D (AURA Immersion, intégrée telle quelle).
   Un geste suffit : la scène ou la simulation s'ouvre directement, sans menu.
   Avec un casque compatible, le bouton Casque apparaît dans la scène. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store;
  const $ = A.$, esc = A.esc, icon = A.icon;
  const I = A.immersive = {};

  // lieux d'évasion : choisis d'après les études sur l'isolement (pôle Sud, Antarctique, analogues spatiaux)
  I.SCENES = [
    { key: 'earth', title: 'Terre vue de la coupole', text: 'La vraie coupole de l\'ISS, d\'après le modèle 3D de la NASA, et la Terre qui défile sous ses sept hublots.', tags: ['Modèle NASA', 'Orbite réelle'], img: 'immersion/img/evasion/earth.webp' },
    { key: 'lacrose', title: 'Lac Rose au coucher du soleil', text: 'Le lac Retba, près de Dakar : une eau rose, des tas de sel blanc et les pirogues des récolteurs.', tags: ['Sénégal', 'Coucher réel'], img: 'immersion/img/evasion/lacrose.webp' },
    { key: 'savane', title: 'Savane aux baobabs', text: 'Fin d\'après-midi dans le Sine-Saloum : herbes dorées qui ondulent, baobabs, vautours qui planent.', tags: ['Sénégal', 'Vent, grillons'], img: 'immersion/img/evasion/savane.webp' },
    { key: 'ocean', title: 'Océan au coucher du soleil', text: 'Au bout d\'une jetée, face à l\'Atlantique, pendant que le soleil descend.', tags: ['Vagues', 'Coucher réel'], img: 'immersion/img/evasion/ocean.webp' },
    { key: 'lake', title: 'Lac de montagne au matin', text: 'Un lac calme entre des sommets enneigés, la brume qui monte de l\'eau, les oiseaux.', tags: ['Brume', 'Chants d\'oiseaux'], img: 'immersion/img/evasion/lake.webp' },
    { key: 'aurore', title: 'Aurores boréales', text: 'Un lac sans vent sous des rideaux d\'aurore verts et pourpres, au pied de sommets enneigés.', tags: ['Nuit', 'Lac miroir'], img: 'immersion/img/evasion/aurore.webp' },
    { key: 'desert', title: 'Désert de Lompoul la nuit', text: 'Sur la crête d\'une dune, sous la Voie lactée, un campement éclairé en contrebas.', tags: ['Ciel réel', 'Sénégal'], img: 'immersion/img/evasion/desert.webp' }
  ];
  // simulations : décor réel de l'ISS (modèle NASA), équipage de démonstration, gestes des fiches AURA
  I.SIMS = [
    { key: 'arret', fiche: 'F-CVN-07', title: 'Arrêt cardiaque en apesanteur', text: 'Lucas s\'effondre dans le laboratoire. Massage en flottant, table médicale, défibrillateur.', dur: '4 min', cat: 'Urgence vitale' },
    { key: 'anaphylaxie', fiche: 'F-INF-08', title: 'Allergie grave', text: 'Rafael réagit à un antibiotique : plaques, lèvres qui gonflent, souffle qui siffle.', dur: '4 min', cat: 'Urgence vitale' },
    { key: 'etouffement', fiche: null, title: 'Étouffement au repas', text: 'Une bouchée bloquée. Tapes dans le dos, compressions du ventre, et bien se caler.', dur: '3 min', cat: 'Urgence vitale' },
    { key: 'incendie', fiche: 'F-EXP-06', title: 'Feu à bord', text: 'Une fumée sort d\'un rack du laboratoire. Alerter, se regrouper, agir : dans cet ordre.', dur: '4 min', cat: 'Urgence du vaisseau' },
    { key: 'depress', fiche: null, title: 'Fuite d\'air\u00a0: dépressurisation', text: 'La pression baisse. Calculer le temps qui reste, isoler la fuite, ne jamais se couper du vaisseau.', dur: '3 min', cat: 'Urgence du vaisseau' },
    { key: 'ammoniac', fiche: 'F-EXP-10', title: 'Fuite d\'ammoniac', text: 'Odeur piquante, yeux qui brûlent : masque, repli, écoutille fermée, puis rinçage.', dur: '3 min', cat: 'Urgence du vaisseau' },
    { key: 'decompression', fiche: 'F-EXP-05', title: 'Après une sortie\u00a0: la décompression', text: 'Une douleur du coude deux heures après une sortie. Oxygène, sol, remise en pression.', dur: '3 min', cat: 'Sorties' },
    { key: 'calcul', fiche: 'F-DIG-12', title: 'Calcul rénal et échographie', text: 'Une douleur du flanc qui vient par vagues. L\'échographie montre le calcul.', dur: '3 min', cat: 'Soins' },
    { key: 'plaie', fiche: 'F-TRA-02', title: 'Coupure qui saigne', text: 'Une entaille à l\'avant-bras : en apesanteur, le sang forme des gouttes qui flottent.', dur: '3 min', cat: 'Soins' },
    { key: 'brulure', fiche: 'F-EXP-07', title: 'Brûlure de la main', text: 'Une bulle d\'eau chaude sur la main. Refroidir quand l\'eau ne coule pas.', dur: '2 min', cat: 'Soins' },
    { key: 'oeil', fiche: 'F-TET-01', title: 'Poussière dans l\'œil', text: 'Le plus fréquent des petits accidents en vol : ne pas frotter, rincer, examiner.', dur: '3 min', cat: 'Soins' },
    { key: 'nez', fiche: 'F-APE-10', title: 'Saignement de nez', text: 'Air sec et sang qui monte à la tête : pincer, capter les gouttes, attendre.', dur: '2 min', cat: 'Soins' }
  ];
  I.SIMS.forEach(x => { x.img = 'immersion/img/sims/' + x.key + '.webp'; });

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
        '<div class="scenes feature">' + I.SCENES.map(x => card(x, 'data-scene="' + x.key + '"', x.tags.concat(['10 min']))).join('') + '</div>' + vrLine('scene') + '</div>';
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
        ['Urgence vitale', 'Urgence du vaisseau', 'Sorties', 'Soins'].map(cat => '<h2 class="simgroup">' + esc(cat) + '</h2><div class="scenes">' + I.SIMS.filter(x => x.cat === cat).map(x => {
          const r = m.sims[x.key];
          const best = r ? (r.wins ? 'réussie ' + A.plural(r.wins, 'fois', 'fois') : 'essayée ' + A.plural(r.runs, 'fois', 'fois')) : 'jamais faite';
          return card(x, 'data-sim="' + x.key + '"', [x.fiche ? 'Fiche ' + x.fiche : 'Procédure du vaisseau', x.dur, best]);
        }).join('') + '</div>').join('') + vrLine('sim') + '</div>';
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
