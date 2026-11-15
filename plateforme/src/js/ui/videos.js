/* AURA : vidéos de prévention et de sécurité.
   Quatorze films d'animation d'environ une minute, sourcés, avec une voix anglaise et des
   sous-titres français. Une grille pour choisir, une page de lecture avec un lecteur sur mesure
   (chapitres, sous-titres, vitesse, plein écran) et la vidéo suivante qui s'enchaîne.
   Le médecin de bord peut ajouter ses propres vidéos. Chaque jour, AURA en choisit une pour chacun. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store;
  const $ = A.$, esc = A.esc, icon = A.icon;
  const V = A.videos = {};

  /* Films AURA. Fichiers dans videos/ : <id>.mp4, <id>.jpg (vignette), <id>-hd.jpg (affiche),
     <id>.fr.vtt et <id>.en.vtt (sous-titres). Liste écrite par plateforme/tools/films/publish.mjs. */
  const FILMS = /*FILMS*/[
    {"id":"arrivee","cat":"prevention","title":"Les premiers jours en apesanteur","short":"Tête qui tourne, visage gonflé : ce que vit le corps en arrivant, et comment passer le cap.","fiche":"F-APE-01","dur":70,"chapters":[{"t":0,"title":"Début"},{"t":6.9,"title":"Le mal de l'espace"},{"t":29.4,"title":"Le visage qui gonfle"},{"t":44.1,"title":"Ce qui aide"}],"sources":[{"t":"Université du Colorado (2024) : le mal de l'espace","u":"https://www.colorado.edu/today/2024/02/27/space-travel-comes-motion-sickness-these-engineers-want-help"},{"t":"NASA : santé cardiovasculaire et vision (déplacement des liquides, SANS)","u":"https://www.nasa.gov/directorates/esdmd/hhp/cardiovascular-and-vision"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"dos","cat":"prevention","title":"Le dos en apesanteur","short":"Pourquoi le bas du dos fait mal les premières semaines, et le geste qui soulage.","fiche":"F-APE-03","dur":65,"chapters":[{"t":0,"title":"Début"},{"t":16.1,"title":"Pourquoi"},{"t":30,"title":"Le geste qui soulage"},{"t":45,"title":"Quand prévenir"}],"sources":[{"t":"Kerstman E. et al. (2012), Aviat Space Environ Med : douleur du dos en apesanteur","u":"https://asma.kglmeridian.com/view/journals/asem/83/1/article-p2.xml"},{"t":"NASA : risque de modification osseuse en vol (Human Research Program)","u":"https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"os","cat":"prevention","title":"Protéger tes os","short":"Les os perdent un à un et demi pour cent de leur densité par mois. Le sport et l'assiette font la différence.","fiche":"F-APE-14","dur":61,"chapters":[{"t":0,"title":"Début"},{"t":6.6,"title":"Ce qui se passe"},{"t":36.7,"title":"Le sport"},{"t":45,"title":"L'assiette"}],"sources":[{"t":"NASA : risque de modification osseuse en vol (Human Research Program)","u":"https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/"},{"t":"Whitson P. et al., NASA : risque de calcul rénal en vol","u":"https://ntrs.nasa.gov/citations/20000020539"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"muscles","cat":"prevention","title":"Garder ses muscles","short":"Jusqu'à vingt pour cent de muscle en moins en deux semaines sans sport. Environ deux heures par jour pour l'éviter.","fiche":"F-APE-15","dur":61,"chapters":[{"t":0,"title":"Début"},{"t":6.8,"title":"Ce qui fond"},{"t":29.6,"title":"L'entraînement"},{"t":42.5,"title":"Suivre, et savoir s'arrêter"}],"sources":[{"t":"Agence spatiale canadienne : que deviennent les muscles dans l'espace ?","u":"https://asc-csa.gc.ca/eng/astronauts/space-medicine/muscles.asp"},{"t":"NASA : risque de modification osseuse en vol (Human Research Program)","u":"https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"yeux","cat":"prevention","title":"Tes yeux et l'apesanteur","short":"Sept astronautes sur dix en mission longue ont des changements au fond de l'œil. Le signe à surveiller : la vision de près.","fiche":"F-APE-06","dur":58,"chapters":[{"t":0,"title":"Début"},{"t":15.7,"title":"Pourquoi"},{"t":32.2,"title":"Les contrôles"},{"t":42.2,"title":"Quand prévenir"}],"sources":[{"t":"NASA : santé cardiovasculaire et vision (déplacement des liquides, SANS)","u":"https://www.nasa.gov/directorates/esdmd/hhp/cardiovascular-and-vision"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"eau","cat":"prevention","title":"Boire assez","short":"Moins de soif, plus de calcium dans les urines : le risque de calcul rénal monte dès l'arrivée. Environ deux litres et demi par jour.","fiche":"F-DIG-12","dur":61,"chapters":[{"t":0,"title":"Début"},{"t":16.8,"title":"Le risque"},{"t":29,"title":"Combien boire"},{"t":45.9,"title":"Quand prévenir"}],"sources":[{"t":"Whitson P. et al., NASA : risque de calcul rénal en vol","u":"https://ntrs.nasa.gov/citations/20000020539"},{"t":"NASA (2023) : 98 % de l'eau récupérée à bord de l'ISS","u":"https://www.space.com/astronaut-pee-iss-water-recycling-98-percent-milestone"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"sommeil","cat":"prevention","title":"Bien dormir à bord","short":"Seize levers de soleil par jour et le bruit des ventilateurs : en moyenne six heures de sommeil. Comment faire mieux.","fiche":"F-PSY-05","dur":61,"chapters":[{"t":0,"title":"Début"},{"t":5.4,"title":"Pourquoi c'est dur"},{"t":27.8,"title":"Ce qui aide"},{"t":45.8,"title":"Les somnifères"}],"sources":[{"t":"Barger L. et al. (2014), The Lancet Neurology : le sommeil des astronautes","u":"https://www.eurekalert.org/news-releases/595450"},{"t":"American Academy of Sleep Medicine : sept heures ou plus par nuit pour l'adulte","u":"https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"moral","cat":"prevention","title":"Le moral en mission longue","short":"Isolement, confinement, messages qui mettent vingt minutes : ce qui use le moral, et ce qui le protège.","fiche":"F-PSY-06","dur":56,"chapters":[{"t":0,"title":"Début"},{"t":6,"title":"Ce qui use"},{"t":21.5,"title":"Ce qui protège"},{"t":40,"title":"En parler"}],"sources":[{"t":"NASA : les cinq dangers du vol habité","u":"https://www.nasa.gov/hrp/hazards/"},{"t":"Thoolen S. et al. (2025), npj Microgravity : réalité virtuelle et nature à la station Amundsen-Scott (pôle Sud)","u":"https://doi.org/10.1038/s41526-025-00471-2"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"incendie","cat":"securite","title":"Feu à bord : alerter, se regrouper, agir","short":"En 1997, un générateur d'oxygène a pris feu sur Mir. Les trois réflexes qui en sont sortis.","fiche":"F-EXP-06","dur":61,"chapters":[{"t":0,"title":"Début"},{"t":5.4,"title":"Mir, 1997"},{"t":23.5,"title":"Les trois réflexes"},{"t":49.2,"title":"S'entraîner"}],"sources":[{"t":"Incendie de Mir, 24 février 1997 (Windows to the Universe, d'après la NASA)","u":"https://ftp.windows2universe.org/headline_universe/shuttle_news/mir_fire.html"},{"t":"Tobias B. et McMillan C. (2023), SpaceOps : la réponse aux urgences à bord de l'ISS","u":"https://ntrs.nasa.gov/citations/20220019247"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"depress","cat":"securite","title":"Fuite d'air : le temps qui reste","short":"En 2018, un trou de deux millimètres dans un Soyouz. Le temps de réserve, et comment on cherche la fuite.","fiche":null,"dur":60,"chapters":[{"t":0,"title":"Début"},{"t":4.4,"title":"Soyouz, 2018"},{"t":20.4,"title":"Le temps de réserve"},{"t":28.5,"title":"Trouver la fuite"}],"sources":[{"t":"Spaceflight Now (30 août 2018) : la fuite du Soyouz MS-09","u":"https://spaceflightnow.com/2018/08/30/cosmonauts-plug-small-air-leak-on-the-international-space-station/"},{"t":"Tobias B. et McMillan C. (2023), SpaceOps : la réponse aux urgences à bord de l'ISS","u":"https://ntrs.nasa.gov/citations/20220019247"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"ammoniac","cat":"securite","title":"Fuite d'ammoniac","short":"Le refroidissement de la station utilise de l'ammoniac, toxique. En 2015, une alarme a fait évacuer le segment américain.","fiche":"F-EXP-10","dur":57,"chapters":[{"t":0,"title":"Début"},{"t":12.8,"title":"L'alerte de 2015"},{"t":28.3,"title":"Les bons gestes"}],"sources":[{"t":"Phys.org (14 janvier 2015) : alarme ammoniac à bord de l'ISS","u":"https://phys.org/news/2015-01-space-station-crew-safe-ammonia.html"},{"t":"Tobias B. et McMillan C. (2023), SpaceOps : la réponse aux urgences à bord de l'ISS","u":"https://ntrs.nasa.gov/citations/20220019247"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"eruption","cat":"securite","title":"Éruption solaire : rejoindre l'abri","short":"Certaines éruptions envoient des protons qui arrivent en moins d'une heure. Comment l'équipage est prévenu et où il s'abrite.","fiche":"F-EXP-16","dur":53,"chapters":[{"t":0,"title":"Début"},{"t":5.3,"title":"Le danger"},{"t":27.5,"title":"L'abri"}],"sources":[{"t":"NASA : protéger les astronautes des radiations près de la Lune","u":"https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon"},{"t":"NASA : les cinq dangers du vol habité","u":"https://www.nasa.gov/hrp/hazards/"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"sortie","cat":"securite","title":"Après une sortie : la décompression","short":"Pourquoi on respire de l'oxygène pur avant de sortir, et les signes à surveiller dans les heures qui suivent.","fiche":"F-EXP-05","dur":57,"chapters":[{"t":0,"title":"Début"},{"t":6.1,"title":"Les bulles d'azote"},{"t":30.3,"title":"Les signes"},{"t":42.6,"title":"Quand prévenir"}],"sources":[{"t":"NASA OCHMO-TB-037 : maladie de décompression","u":"https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-037-decompression-sickness.pdf"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"arret","cat":"securite","title":"Arrêt cardiaque en apesanteur","short":"Masser quand rien ne tient en place : se caler, la table médicale, le rythme et le défibrillateur.","fiche":"F-CVN-07","dur":60,"chapters":[{"t":0,"title":"Début"},{"t":8.5,"title":"Le problème"},{"t":17.6,"title":"Se caler"},{"t":25.6,"title":"Masser et défibriller"}],"sources":[{"t":"Hinkelbein J. et al. (2020) : réanimation en apesanteur (DGLRM, ESAM)","u":"https://doi.org/10.1186/s13049-020-00793-y"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]}
  ]/*FIN*/;
  V.FILMS = FILMS;
  FILMS.forEach(f => {
    f.kind = 'film'; f.src = 'videos/' + f.id + '.mp4'; f.poster = 'videos/' + f.id + '.jpg'; f.posterHd = 'videos/' + f.id + '-hd.jpg';
    f.subs = [{ lang: 'fr', label: 'Français', src: 'videos/' + f.id + '.fr.vtt' }, { lang: 'en', label: 'English', src: 'videos/' + f.id + '.en.vtt' }];
  });
  V.all = () => FILMS.concat((S.state.videosLib || []).map(v => Object.assign({ kind: 'media' }, v)));
  V.get = id => V.all().find(v => v.id === id);
  const fmt = t => { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const catLabel = v => v.cat === 'securite' ? 'Sécurité' : v.cat === 'prevention' ? 'Prévention' : 'Ajoutée par Keiko';
  const catIcon = v => v.cat === 'securite' ? 'shield' : v.cat === 'prevention' ? 'health' : 'stetho';

  /* ---------------- suivi : vue, position de lecture ---------------- */
  const prog = (id, vid) => { const m = S.member(id); return (m && m.vprog && m.vprog[vid]) || 0; };
  const setProg = (id, vid, t) => { const m = S.member(id); if (!m) return; m.vprog = m.vprog || {}; m.vprog[vid] = Math.round(t * 10) / 10; S.save(); };

  /* ---------------- la vidéo du jour ---------------- */
  function scoreFor(id, v) {
    const m = S.member(id);
    const seen = m.videos[v.id];
    const day = S.day();
    let s = 0, why = '';
    const add = (n, w) => { s += n; if (n > 2 && (!why || n > 3)) why = w; };
    if (!seen) add(2, 'Tu ne l\'as pas encore vue');
    else if (day - seen.d < 7) s -= 6;
    if (v.cat === 'securite' && (!seen || day - seen.d >= (v.refresh || 30))) add(3.5, 'Rappel de sécurité');
    const eva = S.tasksAhead(id, 72).find(t => t.kind === 'eva');
    if (v.id === 'sortie' && eva) add(8, 'Ta sortie est ' + (eva.day === day ? 'aujourd\'hui' : eva.day === day + 1 ? 'demain' : 'dans ' + (eva.day - day) + ' jours'));
    const sl = m.measures.sleep.slice(-7);
    const avg = sl.reduce((a, x) => a + x.v, 0) / Math.max(1, sl.length);
    if (v.id === 'sommeil' && avg < 5.8) add(6, 'Tu as peu dormi cette semaine');
    if (v.id === 'dos' && m.triages.some(t => t.d >= day - 10 && (t.facts || []).includes('mal_dos'))) add(6, 'Ton dos t\'a gêné récemment');
    if (v.id === 'eau' && m.triages.some(t => t.d >= day - 10 && (t.facts || []).includes('douleur_flanc'))) add(6, 'Pour éviter un nouveau calcul');
    if (v.id === 'eruption' && S.state.settings.alerteEruption) add(9, 'Alerte d\'éruption solaire en cours');
    if (v.id === 'arrivee' && day <= 4) add(7, 'Tes premiers jours en apesanteur');
    if (v.mandatory) add(4, 'Demandée par Keiko');
    if (v.for && v.for.includes(id)) add(5, 'Choisie pour toi par Keiko');
    // petit décalage stable par personne, pour varier entre équipiers
    s += ((id.charCodeAt(1) * 7 + v.id.length * 3) % 10) / 20;
    return { s, why: why || (v.cat === 'securite' ? 'Rappel de sécurité' : 'Prévention') };
  }
  V.ranked = id => V.all().map(v => Object.assign({}, v, scoreFor(id, v))).sort((a, b) => b.s - a.s);
  V.daily = id => {
    const m = S.member(id);
    if (!m) return null;
    const d = S.day();
    m.missions[d] = m.missions[d] || {};
    if (!m.missions[d].video || !V.get(m.missions[d].video)) {
      const best = V.ranked(id)[0];
      if (!best) return null;
      m.missions[d].video = best.id;
      m.missions[d].videoWhy = best.why;
      S.save();
    }
    const v = V.get(m.missions[d].video);
    return v ? Object.assign({}, v, { reason: m.missions[d].videoWhy }) : null;
  };

  // ouvrir une vidéo : la page de lecture
  V.play = (which) => {
    const id = S.state.who;
    let v = which === 'daily' || !which ? V.daily(id) : V.get(which);
    if (!v) v = V.daily(id);
    if (v) A.go('videos/' + v.id);
  };

  /* ---------------- vignettes ---------------- */
  const seenLine = (m, v) => {
    const s = m.videos[v.id];
    if (s) return 'Vue ' + A.dayLabel(s.d, S.day()).toLowerCase();
    const p = prog(S.state.who, v.id);
    return p > 3 ? 'Commencée' : 'Pas encore vue';
  };
  function thumb(v, big) {
    const id = S.state.who, p = prog(id, v.id), f = v.dur ? A.clamp(p / v.dur, 0, 1) : 0;
    const watched = S.member(id).videos[v.id];
    return '<span class="th' + (big ? ' big' : '') + '">' +
      (v.kind === 'film' ? '<img src="' + esc(big ? v.posterHd : v.poster) + '" alt="" loading="lazy" decoding="async">' : '<span class="ph">' + icon('play') + '</span>') +
      (v.dur ? '<span class="dur">' + fmt(v.dur) + '</span>' : '') +
      (f > 0.02 || watched ? '<span class="pg"><i style="width:' + ((watched && f < 0.02 ? 1 : f) * 100).toFixed(0) + '%"></i></span>' : '') +
      '</span>';
  }
  function card(v, o) {
    const m = S.member(S.state.who);
    o = o || {};
    return '<button class="yt' + (o.compact ? ' compact' : '') + '" data-open="' + esc(v.id) + '" aria-label="' + esc(v.title) + ', ' + fmt(v.dur || 0) + '">' + thumb(v) +
      '<span class="ym">' + (o.compact ? '' : '<span class="ch ' + esc(v.cat || 'media') + '">' + icon(catIcon(v)) + '</span>') +
      '<span class="tx"><b>' + esc(v.title) + '</b><span>' + esc(catLabel(v)) + (v.fiche ? ', fiche ' + esc(v.fiche) : '') + '</span><span>' + esc(o.why || seenLine(m, v)) + '</span></span></span></button>';
  }
  // aperçu muet au survol (souris seulement)
  function hoverPreviews(node) {
    if (!(root.matchMedia && root.matchMedia('(hover: hover) and (pointer: fine)').matches) || A.reduced()) return;
    node.querySelectorAll('.yt').forEach(b => {
      const v = V.get(b.dataset.open); if (!v || v.kind !== 'film') return;
      let timer = null, vid = null;
      b.addEventListener('pointerenter', () => {
        timer = setTimeout(() => {
          vid = document.createElement('video');
          vid.muted = true; vid.playsInline = true; vid.preload = 'auto'; vid.src = v.src + '#t=6'; vid.className = 'pv';
          b.querySelector('.th').appendChild(vid);
          vid.play().then(() => vid.classList.add('on')).catch(() => {});
        }, 650);
      });
      b.addEventListener('pointerleave', () => { clearTimeout(timer); if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); vid.remove(); vid = null; } });
    });
  }

  /* ---------------- écran Vidéos : la grille ---------------- */
  const FILTERS = [['tout', 'Tout'], ['toi', 'Pour toi'], ['securite', 'Sécurité'], ['prevention', 'Prévention'], ['avoir', 'À voir'], ['keiko', 'Ajoutées par Keiko']];
  function gridView(node, params) {
    const id = S.state.who, m = S.member(id);
    const all = V.all(), d = V.daily(id);
    const f = params.f || 'tout';
    const lib = all.filter(v => v.kind === 'media');
    let list;
    if (f === 'toi') list = V.ranked(id);
    else if (f === 'securite' || f === 'prevention') list = all.filter(v => v.cat === f);
    else if (f === 'avoir') list = all.filter(v => !m.videos[v.id]);
    else if (f === 'keiko') list = lib;
    else list = all;
    const chips = FILTERS.filter(([k]) => k !== 'keiko' || lib.length).map(([k, l]) => '<button class="vchip' + (k === f ? ' on' : '') + '" data-f="' + k + '" aria-pressed="' + (k === f) + '">' + l + '</button>').join('');
    const feat = d && f === 'tout' ? '<button class="vfeat" data-open="' + esc(d.id) + '">' + thumb(d, true) +
      '<span class="fi"><span class="why">' + icon('sparkle') + esc(d.reason || 'Pour toi aujourd\'hui') + '</span><b>' + esc(d.title) + '</b>' + (d.short ? '<span class="sh">' + esc(d.short) + '</span>' : '') +
      '<span class="cta">' + icon('play') + (m.videos[d.id] && m.videos[d.id].d === S.day() ? 'Revoir' : 'Regarder, ' + fmt(d.dur || 0)) + '</span></span></button>' : '';
    const rest = list.filter(v => !(feat && v.id === d.id));
    return '<div class="enter vids"><div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Vidéos</h1><p>Des films d\'une minute environ, avec leurs sources. Chaque jour, l\'un d\'eux est choisi pour toi.</p></div></div>' +
      '<div class="vchips" role="group" aria-label="Filtrer les vidéos">' + chips + '</div>' + feat +
      (rest.length ? '<div class="ytgrid">' + rest.map(v => card(v, f === 'toi' ? { why: v.why } : null)).join('') + '</div>' : '<div class="vempty">' + icon('check') + '<p>Tu as tout vu. Bravo ! Les films restent là quand tu veux les revoir.</p></div>') +
      '</div>';
  }

  /* ---------------- page de lecture ---------------- */
  const SVG = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.6-6.8c.6-.4.6-1.4 0-1.8L9.6 4.3C8.9 3.9 8 4.4 8 5.2Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect fill="currentColor" x="6.5" y="5" width="4" height="14" rx="1.2"/><rect fill="currentColor" x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 6.2v11.6c0 .8.9 1.3 1.6.8l8.3-5.8c.6-.4.6-1.3 0-1.7L7.6 5.3C6.9 4.9 6 5.4 6 6.2Z"/><rect fill="currentColor" x="16.5" y="5.5" width="2.5" height="13" rx="1"/></svg>',
    vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9.5h3l4.3-3.6c.6-.5 1.7 0 1.7.8v10.6c0 .8-1 1.3-1.7.8L7 14.5H4c-.6 0-1-.4-1-1v-3c0-.6.4-1 1-1Z"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.5a7.6 7.6 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9.5h3l4.3-3.6c.6-.5 1.7 0 1.7.8v10.6c0 .8-1 1.3-1.7.8L7 14.5H4c-.6 0-1-.4-1-1v-3c0-.6.4-1 1-1Z"/><path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    cc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.4 10.3a2.3 2.3 0 1 0 0 3.4M17 10.3a2.3 2.3 0 1 0 0 3.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2.6-1.5L14.2 2.5h-4.4l-.3 2.6a7.6 7.6 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 2.6 1.5l.3 2.6h4.4l.3-2.6a7.6 7.6 0 0 0 2.6-1.5l2.3 1 2-3.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    theater: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4.5h4.5M20 9V4.5h-4.5M4 15v4.5h4.5M20 15v4.5h-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    exit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 4v4.5H4M15.5 4v4.5H20M8.5 20v-4.5H4M15.5 20v-4.5H20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back10: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 7 8.5l4 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 8.5H14a5.5 5.5 0 1 1-5.2 7.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  const SPEEDS = [0.75, 1, 1.25, 1.5];
  const speedLabel = r => r === 1 ? 'Normale' : String(r).replace('.', ',') + ' ×';

  function watchView(v) {
    const id = S.state.who, m = S.member(id);
    const film = v.kind === 'film';
    const next = V.ranked(id).filter(x => x.id !== v.id);
    const chaps = film ? [{ t: 0, title: 'Début' }].concat((v.chapters || []).filter(c => c.t > 0.5)) : [];
    const watched = m.videos[v.id];
    return '<div class="enter watch' + (S.state.settings.theater ? ' theater' : '') + '">' +
      '<div class="wmain">' +
        '<div class="vp paused" tabindex="0" role="region" aria-label="Lecteur : ' + esc(v.title) + '">' +
          '<video playsinline preload="metadata"' + (film ? ' poster="' + esc(v.posterHd) + '"' : '') + '>' + (film ? v.subs.map(s => '<track kind="subtitles" srclang="' + s.lang + '" label="' + esc(s.label) + '" src="' + esc(s.src) + '">').join('') : '') + '</video>' +
          '<div class="vp-cap"><span></span></div>' +
          '<button class="vp-big" data-c="play" aria-label="Lire">' + SVG.play + '</button>' +
          '<div class="vp-spin" aria-hidden="true"></div>' +
          '<div class="vp-ui">' +
            '<div class="vp-bar" role="slider" tabindex="0" aria-label="Position dans la vidéo" aria-valuemin="0" aria-valuemax="' + Math.round(v.dur || 0) + '" aria-valuenow="0" aria-valuetext="0:00">' +
              '<div class="segs"></div><span class="knob"></span><div class="tip"><b></b><span></span></div></div>' +
            '<div class="vp-row">' +
              '<button data-c="play" class="pp" aria-label="Lire (k)">' + SVG.play + '</button>' +
              '<button data-c="back10" aria-label="Reculer de 10 secondes (j)">' + SVG.back10 + '</button>' +
              (next.length ? '<button data-c="next" aria-label="Vidéo suivante">' + SVG.next + '</button>' : '') +
              '<span class="vol"><button data-c="mute" aria-label="Couper le son (m)">' + SVG.vol + '</button><input type="range" min="0" max="1" step="0.05" aria-label="Volume"></span>' +
              '<span class="time"><b>0:00</b> / <span class="tot">' + fmt(v.dur || 0) + '</span></span>' +
              '<span class="cname"></span>' +
              '<span class="sp"></span>' +
              (film ? '<button data-c="cc" class="ccb" aria-label="Sous-titres (c)" aria-pressed="true">' + SVG.cc + '</button>' : '') +
              '<button data-c="menu" aria-label="Réglages de lecture" aria-haspopup="true">' + SVG.gear + '</button>' +
              '<button data-c="theater" class="thb" aria-label="Mode cinéma (t)">' + SVG.theater + '</button>' +
              '<button data-c="full" aria-label="Plein écran (f)">' + SVG.full + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="vp-menu" hidden></div>' +
          '<div class="vp-next" hidden></div>' +
        '</div>' +
        '<h1 class="wt">' + esc(v.title) + '</h1>' +
        '<div class="wrow"><span class="wch"><span class="ch ' + esc(v.cat || 'media') + '">' + icon(catIcon(v)) + '</span><span><b>' + esc(catLabel(v)) + '</b><small>' + (film ? 'Film AURA, ' + fmt(v.dur) : 'Vidéo de bord') + '</small></span></span>' +
          '<span class="sp"></span>' +
          (watched ? '<span class="tag ok">' + icon('check') + 'Vue ' + esc(A.dayLabel(watched.d, S.day()).toLowerCase()) + '</span>' : '<span class="tag gold">' + icon('star') + '+20 points</span>') +
          (v.fiche && A.ficheSheet ? '<button class="btn small" data-fiche="' + esc(v.fiche) + '">' + icon('book') + 'Fiche ' + esc(v.fiche) + '</button>' : '') +
          '<button class="btn small ghost" data-back>' + icon('back') + 'Toutes les vidéos</button>' +
        '</div>' +
        '<div class="wdesc">' +
          (v.short ? '<p class="lead">' + esc(v.short) + '</p>' : '') +
          (chaps.length > 1 ? '<h3>Chapitres</h3><div class="wchaps">' + chaps.map((c, i) => '<button data-t="' + c.t + '" data-ci="' + i + '"><b>' + fmt(c.t) + '</b><span>' + esc(c.title) + '</span></button>').join('') + '</div>' : '') +
          (film ? '<details class="more"><summary>Sources et fabrication</summary><ul>' + (v.sources || []).map(x => '<li>' + (x.u ? '<a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.t) + '</a>' : esc(x.t)) + '</li>').join('') + '</ul><p class="faint small">Film d\'animation réalisé pour AURA. Voix anglaise de synthèse (Kokoro), sous-titres en français et en anglais. Les chiffres viennent des sources ci-dessus.</p></details>' : '') +
        '</div>' +
      '</div>' +
      '<aside class="wside" aria-label="À suivre"><h2>À suivre</h2><div class="wlist">' + next.slice(0, 8).map(x => card(x, { compact: true })).join('') + '</div></aside>' +
    '</div>';
  }

  // le lecteur : commandes, sous-titres, chapitres, raccourcis, enchaînement
  function mountPlayer(node, v, view) {
    const id = S.state.who, film = v.kind === 'film', set = S.state.settings;
    const vp = $('.vp', node), vid = $('video', vp), bar = $('.vp-bar', vp), segs = $('.segs', bar), knob = $('.knob', bar), tip = $('.tip', bar);
    const capBox = $('.vp-cap span', vp), menu = $('.vp-menu', vp), nextBox = $('.vp-next', vp);
    const timeEl = $('.time b', vp), cname = $('.cname', vp), vol = $('.vol input', vp);
    const next = V.ranked(id).filter(x => x.id !== v.id)[0];
    let dur = v.dur || 0, chaps = [], marked = false, idle = null, lastSave = 0, nextTimer = null;
    const listeners = [];
    const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); listeners.push(() => el.removeEventListener(ev, fn, o)); };

    // source
    if (film) vid.src = v.src;
    else if (v.blob) A.videoStore.get(v.id).then(b => { vid.src = b ? URL.createObjectURL(b) : (v.src || ''); });
    else vid.src = v.src || '';
    vid.volume = set.volume !== undefined ? set.volume : 1;
    vid.muted = !!set.muted;
    vol.value = vid.muted ? 0 : vid.volume;
    vid.playbackRate = set.rate || 1;

    // chapitres sur la barre
    const buildSegs = () => {
      const pts = film ? [0].concat((v.chapters || []).map(c => c.t).filter(t => t > 0.5 && t < dur - 0.5)) : [0];
      chaps = pts.map((t, i) => ({ t, end: pts[i + 1] !== undefined ? pts[i + 1] : dur, title: i === 0 ? 'Début' : (v.chapters.find(c => c.t === t) || {}).title }));
      segs.innerHTML = chaps.map(c => '<span class="seg" style="flex:' + Math.max(0.001, c.end - c.t).toFixed(2) + '"><i class="buf"></i><i class="fill"></i></span>').join('');
    };
    buildSegs();
    const chapAt = t => { let k = 0; chaps.forEach((c, i) => { if (t >= c.t - 0.05) k = i; }); return k; };

    // affichage de la position
    const paint = () => {
      const t = vid.currentTime || 0, d = dur || 1;
      knob.style.left = (t / d * 100) + '%';
      segs.querySelectorAll('.seg').forEach((s, i) => {
        const c = chaps[i]; const f = A.clamp((t - c.t) / Math.max(0.01, c.end - c.t), 0, 1);
        s.querySelector('.fill').style.width = (f * 100) + '%';
        let b = 0; try { for (let k = 0; k < vid.buffered.length; k++) if (vid.buffered.start(k) <= c.end && vid.buffered.end(k) >= c.t) b = Math.max(b, A.clamp((vid.buffered.end(k) - c.t) / (c.end - c.t), 0, 1)); } catch (e) { /* rien */ }
        s.querySelector('.buf').style.width = (b * 100) + '%';
      });
      timeEl.textContent = fmt(t);
      bar.setAttribute('aria-valuenow', Math.round(t)); bar.setAttribute('aria-valuetext', fmt(t) + ' sur ' + fmt(d));
      const k = chapAt(t);
      cname.textContent = chaps.length > 1 ? chaps[k].title : '';
      node.querySelectorAll('.wchaps button').forEach((b, i) => b.classList.toggle('on', i === k));
    };
    const setPlaying = p => {
      vp.classList.toggle('paused', !p);
      vp.querySelectorAll('[data-c="play"]').forEach(b => { b.innerHTML = p ? SVG.pause : SVG.play; b.setAttribute('aria-label', p ? 'Pause (k)' : 'Lire (k)'); });
    };
    const toggle = () => { if (vid.paused || vid.ended) { hideNext(); vid.play().catch(() => {}); } else vid.pause(); };
    const seek = t => { vid.currentTime = A.clamp(t, 0, Math.max(0, (dur || 0) - 0.05)); paint(); };

    on(vid, 'loadedmetadata', () => {
      if (vid.duration && isFinite(vid.duration)) { dur = vid.duration; buildSegs(); $('.tot', vp).textContent = fmt(dur); }
      const p = prog(id, v.id);
      if (p > 4 && p < dur - 6) { vid.currentTime = p; A.toast(icon('replay') + 'Reprise à ' + fmt(p)); }
      paint();
      setCaptions(set.cc || 'fr');
    });
    on(vid, 'play', () => { setPlaying(true); poke(); });
    on(vid, 'pause', () => { setPlaying(false); setProg(id, v.id, vid.currentTime); vp.classList.remove('idle'); });
    on(vid, 'waiting', () => vp.classList.add('wait'));
    on(vid, 'playing', () => vp.classList.remove('wait'));
    on(vid, 'progress', paint);
    on(vid, 'timeupdate', () => {
      paint();
      const t = vid.currentTime;
      if (t - lastSave > 4 || t < lastSave) { lastSave = t; setProg(id, v.id, t); }
      if (!marked && dur && t >= dur - 4) markDone();
    });
    on(vid, 'ended', () => { markDone(); setProg(id, v.id, 0); setPlaying(false); showNext(); });
    on(vid, 'error', () => { if (!vid.getAttribute('src')) return; vp.classList.add('err'); capBox.parentNode.hidden = true; $('.vp-big', vp).hidden = true; vp.insertAdjacentHTML('beforeend', '<div class="vp-err">' + icon('alert') + '<b>Cette vidéo ne peut pas être lue ici</b><span>Le fichier n\'est pas sur cet appareil, ou il demande une connexion.</span></div>'); });

    function markDone() {
      if (marked) return; marked = true;
      const res = S.markVideo(id, v.id);
      A.celebrate(res, 'vidéo regardée');
    }

    // sous-titres : rendus par AURA (lisibles, à la police de la plateforme)
    let track = null;
    function setCaptions(lang) {
      if (!film) return;
      set.cc = lang; S.save();
      Array.from(vid.textTracks).forEach(tr => { tr.mode = tr.language === lang ? 'hidden' : 'disabled'; if (tr.language === lang) track = tr; });
      if (lang === 'off') track = null;
      const b = $('.ccb', vp); if (b) { b.classList.toggle('on', lang !== 'off'); b.setAttribute('aria-pressed', String(lang !== 'off')); b.dataset.lang = lang === 'off' ? '' : lang.toUpperCase(); }
      showCue();
    }
    function showCue() {
      const cues = track && track.activeCues ? Array.from(track.activeCues) : [];
      const t = cues.map(c => c.text).join('\n');
      capBox.innerHTML = t ? esc(t).replace(/\n/g, '<br>') : '';
      capBox.parentNode.classList.toggle('on', !!t);
    }
    Array.from(vid.textTracks).forEach(tr => on(tr, 'cuechange', showCue));

    // barre de lecture : cliquer, glisser, survoler
    const tAt = e => { const r = bar.getBoundingClientRect(); return A.clamp((e.clientX - r.left) / r.width, 0, 1) * (dur || 0); };
    let drag = false, wasPlaying = false;
    on(bar, 'pointerdown', e => { drag = true; wasPlaying = !vid.paused; bar.setPointerCapture(e.pointerId); vp.classList.add('scrub'); seek(tAt(e)); });
    on(bar, 'pointermove', e => {
      const t = tAt(e), r = bar.getBoundingClientRect();
      tip.style.left = A.clamp(e.clientX - r.left, 40, r.width - 40) + 'px';
      tip.querySelector('b').textContent = chaps.length > 1 ? chaps[chapAt(t)].title : '';
      tip.querySelector('span').textContent = fmt(t);
      if (drag) seek(t);
    });
    on(bar, 'pointerup', () => { drag = false; vp.classList.remove('scrub'); if (wasPlaying) vid.play().catch(() => {}); });
    on(bar, 'keydown', e => { if (e.key === 'ArrowRight') { seek(vid.currentTime + 5); e.preventDefault(); } if (e.key === 'ArrowLeft') { seek(vid.currentTime - 5); e.preventDefault(); } });

    // boutons
    const fullOn = () => document.fullscreenElement === vp || document.webkitFullscreenElement === vp;
    const full = () => {
      if (fullOn()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (vp.requestFullscreen) vp.requestFullscreen().catch(() => {});
      else if (vp.webkitRequestFullscreen) vp.webkitRequestFullscreen();
      else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();
    };
    on(document, 'fullscreenchange', () => { const b = vp.querySelector('[data-c="full"]'); b.innerHTML = fullOn() ? SVG.exit : SVG.full; b.setAttribute('aria-label', fullOn() ? 'Quitter le plein écran (f)' : 'Plein écran (f)'); });
    const theater = () => { set.theater = !set.theater; S.save(); $('.watch', node).classList.toggle('theater', !!set.theater); };
    const muteT = () => { vid.muted = !vid.muted || vid.volume === 0; if (!vid.muted && vid.volume === 0) vid.volume = 0.6; set.muted = vid.muted; set.volume = vid.volume; S.save(); paintVol(); };
    const paintVol = () => { const b = vp.querySelector('[data-c="mute"]'); const off = vid.muted || vid.volume === 0; b.innerHTML = off ? SVG.mute : SVG.vol; b.setAttribute('aria-label', off ? 'Remettre le son (m)' : 'Couper le son (m)'); vol.value = off ? 0 : vid.volume; vol.style.setProperty('--v', (off ? 0 : vid.volume * 100) + '%'); };
    paintVol();
    on(vol, 'input', () => { vid.volume = +vol.value; vid.muted = +vol.value === 0; set.volume = vid.volume; set.muted = vid.muted; S.save(); paintVol(); });
    const openMenu = () => {
      if (!menu.hidden) { menu.hidden = true; return; }
      const cc = set.cc || 'fr', rate = vid.playbackRate;
      menu.innerHTML = (film ? '<p>Sous-titres</p>' + [['fr', 'Français'], ['en', 'English'], ['off', 'Désactivés']].map(([k, l]) => '<button data-cc="' + k + '" class="' + (cc === k ? 'on' : '') + '">' + (cc === k ? icon('check') : '<i></i>') + l + '</button>').join('') : '') +
        '<p>Vitesse</p>' + SPEEDS.map(r => '<button data-rate="' + r + '" class="' + (rate === r ? 'on' : '') + '">' + (rate === r ? icon('check') : '<i></i>') + speedLabel(r) + '</button>').join('');
      menu.hidden = false;
      menu.querySelectorAll('[data-cc]').forEach(b => b.onclick = () => { setCaptions(b.dataset.cc); menu.hidden = true; });
      menu.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => { vid.playbackRate = +b.dataset.rate; set.rate = +b.dataset.rate; S.save(); menu.hidden = true; });
    };
    const act = c => {
      if (c === 'play') toggle();
      else if (c === 'back10') seek(vid.currentTime - 10);
      else if (c === 'next' && next) A.go('videos/' + next.id);
      else if (c === 'mute') muteT();
      else if (c === 'cc') setCaptions((set.cc || 'fr') === 'off' ? (set.ccLast || 'fr') : (set.ccLast = set.cc || 'fr', 'off'));
      else if (c === 'menu') openMenu();
      else if (c === 'theater') theater();
      else if (c === 'full') full();
    };
    vp.querySelectorAll('[data-c]').forEach(b => on(b, 'click', e => { e.stopPropagation(); act(b.dataset.c); poke(); }));
    // un clic sur l'image : lecture ou pause ; double clic : plein écran ; au doigt, un toucher montre les commandes
    let lastTap = 0;
    on(vid, 'click', () => {
      if (!menu.hidden) { menu.hidden = true; return; }
      if (matchMedia('(hover: none)').matches && vp.classList.contains('idle')) { poke(); return; }
      const now = Date.now();
      if (now - lastTap < 280) full(); else setTimeout(() => { if (Date.now() - lastTap >= 280) toggle(); }, 290);
      lastTap = now;
    });
    // les commandes s'effacent pendant la lecture
    function poke() { vp.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => { if (!vid.paused && menu.hidden && !drag) vp.classList.add('idle'); }, 2600); }
    on(vp, 'pointermove', poke);
    on(vp, 'pointerleave', () => { if (!vid.paused) vp.classList.add('idle'); });

    // raccourcis clavier (comme sur les plateformes de vidéos)
    on(document, 'keydown', e => {
      if (e.target.closest && e.target.closest('input, textarea, select, .backdrop, .sheet')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const map = { ' ': 'play', k: 'play', m: 'mute', f: 'full', c: 'cc', t: 'theater' };
      if (k === ' ' && e.target.tagName === 'BUTTON' && !vp.contains(e.target)) return;
      if (map[k]) { e.preventDefault(); act(map[k]); poke(); }
      else if (k === 'j') { seek(vid.currentTime - 10); poke(); }
      else if (k === 'l') { seek(vid.currentTime + 10); poke(); }
      else if (k === 'arrowleft' && e.target !== bar) { seek(vid.currentTime - 5); poke(); e.preventDefault(); }
      else if (k === 'arrowright' && e.target !== bar) { seek(vid.currentTime + 5); poke(); e.preventDefault(); }
      else if (k === 'arrowup' && vp.contains(e.target)) { vid.volume = Math.min(1, vid.volume + 0.1); vid.muted = false; paintVol(); e.preventDefault(); }
      else if (k === 'arrowdown' && vp.contains(e.target)) { vid.volume = Math.max(0, vid.volume - 0.1); paintVol(); e.preventDefault(); }
      else if (/^[0-9]$/.test(k) && dur) seek(dur * (+k) / 10);
    });

    // la suite : compte à rebours, puis la vidéo suivante
    function showNext() {
      if (!next) return;
      let n = 6;
      nextBox.innerHTML = '<div class="nb"><span class="lab">À suivre</span><button class="nx" data-go-next><span class="nth">' + (next.kind === 'film' ? '<img src="' + esc(next.poster) + '" alt="">' : '') + '<svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28"/><circle class="r" cx="32" cy="32" r="28"/></svg><span class="pl">' + SVG.play + '</span></span><b>' + esc(next.title) + '</b><small>' + esc(catLabel(next)) + ', ' + fmt(next.dur || 0) + '</small></button><div class="row"><button class="btn small ghost" data-cancel>Annuler</button><button class="btn small" data-replay>' + icon('replay') + 'Revoir</button></div></div>';
      nextBox.hidden = false;
      const r = nextBox.querySelector('.r'); r.style.strokeDashoffset = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => { r.style.transition = 'stroke-dashoffset ' + n + 's linear'; r.style.strokeDashoffset = '176'; }));
      nextTimer = setTimeout(() => A.go('videos/' + next.id), n * 1000);
      nextBox.querySelector('[data-go-next]').onclick = () => A.go('videos/' + next.id);
      nextBox.querySelector('[data-cancel]').onclick = hideNext;
      nextBox.querySelector('[data-replay]').onclick = () => { hideNext(); seek(0); vid.play().catch(() => {}); };
    }
    function hideNext() { clearTimeout(nextTimer); nextBox.hidden = true; nextBox.innerHTML = ''; }

    // chapitres sous la vidéo
    node.querySelectorAll('.wchaps button').forEach(b => on(b, 'click', () => { seek(+b.dataset.t); vid.play().catch(() => {}); vp.focus({ preventScroll: true }); if (innerWidth < 900) vp.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));

    // lancement (le clic qui a ouvert la page autorise la lecture avec le son)
    setPlaying(false);
    if (view.autoplay !== false) vid.play().catch(() => setPlaying(false));
    vp.focus({ preventScroll: true });

    return () => { clearTimeout(idle); clearTimeout(nextTimer); try { setProg(id, v.id, vid.ended ? 0 : vid.currentTime); } catch (e) { /* rien */ } listeners.forEach(f => f()); vid.pause(); vid.removeAttribute('src'); vid.load(); };
  }

  /* ---------------- écran Vidéos (grille ou lecture) ---------------- */
  A.views.videos = {
    wide: true,
    render(node, params) {
      const v = params.arg ? V.get(params.arg) : null;
      this.v = v;
      if (params.arg && !v) return '<div class="enter"><div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Vidéo introuvable</h1><p>Elle a peut-être été retirée par Keiko.</p></div></div></div>';
      return v ? watchView(v) : gridView(node, params);
    },
    mount(node, params) {
      node.querySelectorAll('[data-back]').forEach(b => b.onclick = () => A.go(this.v ? 'videos' : 'accueil'));
      node.querySelectorAll('[data-open]').forEach(b => b.onclick = () => A.go('videos/' + b.dataset.open));
      node.querySelectorAll('[data-f]').forEach(b => b.onclick = () => A.go('videos', b.dataset.f === 'tout' ? {} : { f: b.dataset.f }));
      node.querySelectorAll('[data-fiche]').forEach(b => b.onclick = () => A.ficheSheet(b.dataset.fiche));
      if (this.v) {
        A.voice.stop();
        A.sky.paused = true;
        this.stop = mountPlayer(node, this.v, params);
      } else hoverPreviews(node);
    },
    unmount() { if (this.stop) this.stop(); this.stop = null; A.sky.paused = false; }
  };

  /* ---------------- fichiers vidéo ajoutés (IndexedDB) ---------------- */
  A.videoStore = {
    db() {
      return new Promise((res, rej) => {
        try {
          const r = indexedDB.open('aura-videos', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('v');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
    },
    async put(id, blob) { const db = await this.db(); return new Promise((res, rej) => { const tx = db.transaction('v', 'readwrite'); tx.objectStore('v').put(blob, id); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }); },
    async get(id) { try { const db = await this.db(); return await new Promise(res => { const r = db.transaction('v').objectStore('v').get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); } catch (e) { return null; } },
    async del(id) { try { const db = await this.db(); db.transaction('v', 'readwrite').objectStore('v').delete(id); } catch (e) { /* rien */ } }
  };
})(typeof self !== 'undefined' ? self : this);
