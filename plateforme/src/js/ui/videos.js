/* AURA : vidéos de prévention et de sécurité.
   Quatorze films de trois à quatre minutes, sourcés et sous-titrés. Le médecin de bord peut
   ajouter ses propres vidéos (fichier ou lien). Chaque jour, AURA propose à chacun la vidéo
   la plus utile pour lui. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, DATA = root.AURA_DATA;
  const $ = A.$, esc = A.esc, icon = A.icon;
  const V = A.videos = {};

  /* Films AURA : vidéos de 3 à 4 minutes (décor de l'ISS d'après le modèle 3D de la NASA,
     équipage de démonstration, schémas et chiffres sourcés), lues par une voix de synthèse.
     Fichiers dans videos/ : <id>.mp4, <id>.jpg (affiche), <id>.vtt (sous-titres). */
  const FILMS = /*FILMS*/[
    {"id":"arrivee","cat":"prevention","title":"Les premiers jours en apesanteur","short":"Nausée, visage gonflé, mal de tête : ce que le corps vit en arrivant, et comment passer le cap.","fiche":"F-APE-01","dur":238,"chapters":[{"t":31.7,"title":"Le mal de l'espace"},{"t":100.2,"title":"Le visage qui gonfle"},{"t":158,"title":"Le dos qui s'allonge"},{"t":185.7,"title":"Et au retour"}],"sources":[{"t":"Université du Colorado (2024) : le mal de l'espace","u":"https://www.colorado.edu/today/2024/02/27/space-travel-comes-motion-sickness-these-engineers-want-help"},{"t":"NASA : santé cardiovasculaire et vision (déplacement des liquides, SANS)","u":"https://www.nasa.gov/directorates/esdmd/hhp/cardiovascular-and-vision"},{"t":"NASA : risque de modification osseuse en vol (Human Research Program)","u":"https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"dos","cat":"prevention","title":"Le dos en apesanteur","short":"Pourquoi le dos fait mal les premières semaines, et la position qui soulage neuf astronautes sur dix.","fiche":"F-APE-03","dur":241,"chapters":[{"t":57.7,"title":"Une douleur fréquente"},{"t":86.2,"title":"Ce qui soulage"},{"t":156.7,"title":"Les signes d'alerte"}],"sources":[{"t":"Kerstman E. et al. (2012), Aviat Space Environ Med : douleur du dos en apesanteur","u":"https://asma.kglmeridian.com/view/journals/asem/83/1/article-p2.xml"},{"t":"NASA : risque de modification osseuse en vol (Human Research Program)","u":"https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"os","cat":"prevention","title":"Protéger tes os","short":"Les os perdent un à un et demi pour cent de leur densité par mois. L'exercice et l'assiette font la différence.","fiche":"F-APE-14","dur":220,"chapters":[{"t":102.8,"title":"L'exercice, première protection"},{"t":147.9,"title":"L'assiette"},{"t":173.4,"title":"Le suivi"}],"sources":[{"t":"NASA : risque de modification osseuse en vol (Human Research Program)","u":"https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/"},{"t":"Whitson P. et al., NASA : risque de calcul rénal en vol","u":"https://ntrs.nasa.gov/citations/20000020539"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"muscles","cat":"prevention","title":"Garder ses muscles","short":"Jusqu'à vingt pour cent de masse musculaire en moins en deux semaines sans exercice. Deux heures et demie par jour pour l'éviter.","fiche":"F-APE-15","dur":212,"chapters":[{"t":75.7,"title":"Deux heures et demie par jour"},{"t":132.9,"title":"Pourquoi c'est vital"}],"sources":[{"t":"Agence spatiale canadienne : que deviennent les muscles dans l'espace ?","u":"https://asc-csa.gc.ca/eng/astronauts/space-medicine/muscles.asp"},{"t":"NASA : risque de modification osseuse en vol (Human Research Program)","u":"https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/"}]},
    {"id":"yeux","cat":"prevention","title":"Tes yeux et l'apesanteur","short":"Sept astronautes sur dix en mission longue ont des changements au fond de l'œil. Le signe à surveiller : la vision de près.","fiche":"F-APE-06","dur":208,"chapters":[{"t":46.4,"title":"Ce qui change dans l'œil"},{"t":100.2,"title":"Le signe à surveiller"},{"t":150.4,"title":"Les pistes de protection"}],"sources":[{"t":"NASA : santé cardiovasculaire et vision (déplacement des liquides, SANS)","u":"https://www.nasa.gov/directorates/esdmd/hhp/cardiovascular-and-vision"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"eau","cat":"prevention","title":"Boire assez","short":"Moins de soif, plus de calcium dans les urines : le risque de calcul rénal monte dès l'arrivée. Deux litres et demi par jour.","fiche":"F-DIG-12","dur":200,"chapters":[{"t":56.1,"title":"Combien boire"},{"t":144.6,"title":"Les signes d'un calcul"}],"sources":[{"t":"Whitson P. et al., NASA : risque de calcul rénal en vol","u":"https://ntrs.nasa.gov/citations/20000020539"},{"t":"NASA (2023) : 98 % de l'eau récupérée à bord de l'ISS","u":"https://www.space.com/astronaut-pee-iss-water-recycling-98-percent-milestone"},{"t":"NASA : risque de modification osseuse en vol (Human Research Program)","u":"https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"sommeil","cat":"prevention","title":"Bien dormir à bord","short":"Seize levers de soleil par jour, le bruit des ventilateurs : en moyenne, six heures de sommeil. Comment faire mieux.","fiche":"F-PSY-05","dur":208,"chapters":[{"t":44.9,"title":"Ce que disent les mesures"},{"t":96.8,"title":"Ce qui aide"},{"t":176.2,"title":"Quand en parler"}],"sources":[{"t":"Barger L. et al. (2014), The Lancet Neurology : le sommeil des astronautes","u":"https://www.eurekalert.org/news-releases/595450"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"moral","cat":"prevention","title":"Le moral en mission longue","short":"Isolement, confinement, messages qui mettent vingt minutes : ce qui use le moral, et ce qui le protège.","fiche":"F-PSY-06","dur":221,"chapters":[{"t":67.1,"title":"Les signes à repérer"},{"t":104.4,"title":"Ce qui protège"},{"t":173.1,"title":"En parler"}],"sources":[{"t":"NASA : les cinq dangers du vol habité","u":"https://www.nasa.gov/hrp/hazards/"},{"t":"Thoolen S. et al. (2025), npj Microgravity : préférences de réalité virtuelle à la station Amundsen-Scott (pôle Sud)","u":"https://www.nature.com/search?q=Amundsen-Scott%20virtual%20reality&journal=npjmgrav"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"incendie","cat":"securite","title":"Feu à bord : alerter, se regrouper, agir","short":"En 1997, un générateur d'oxygène a pris feu sur Mir. Les trois réflexes qui ont été tirés de cette expérience.","fiche":"F-EXP-06","dur":215,"chapters":[{"t":65.2,"title":"Alerter"},{"t":104.6,"title":"Se regrouper"},{"t":128.3,"title":"Agir"}],"sources":[{"t":"Incendie de Mir, 24 février 1997 (Windows to the Universe, d'après la NASA)","u":"https://ftp.windows2universe.org/headline_universe/shuttle_news/mir_fire.html"},{"t":"Tobias B. et McMillan C. (2023), SpaceOps : la réponse aux urgences à bord de l'ISS","u":"https://ntrs.nasa.gov/citations/20220019247"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"depress","cat":"securite","title":"Fuite d'air : le temps qui reste","short":"En 2018, un trou de deux millimètres dans un Soyouz. Comment on calcule le temps de réserve et où on cherche la fuite.","fiche":null,"dur":219,"chapters":[{"t":64,"title":"Alerter et lire la pression"},{"t":112.9,"title":"Deux cas"}],"sources":[{"t":"Spaceflight Now (30 août 2018) : la fuite du Soyouz MS-09","u":"https://spaceflightnow.com/2018/08/30/cosmonauts-plug-small-air-leak-on-the-international-space-station/"},{"t":"Tobias B. et McMillan C. (2023), SpaceOps : la réponse aux urgences à bord de l'ISS","u":"https://ntrs.nasa.gov/citations/20220019247"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"ammoniac","cat":"securite","title":"Fuite d'ammoniac","short":"Le refroidissement de la station utilise de l'ammoniac, toxique. En 2015, une alarme a fait évacuer le segment américain.","fiche":"F-EXP-10","dur":199,"chapters":[{"t":51,"title":"Janvier 2015"},{"t":114.6,"title":"Les bons gestes"},{"t":154.9,"title":"Si les yeux brûlent"}],"sources":[{"t":"Phys.org (14 janvier 2015) : alarme ammoniac à bord de l'ISS","u":"https://phys.org/news/2015-01-space-station-crew-safe-ammonia.html"},{"t":"Tobias B. et McMillan C. (2023), SpaceOps : la réponse aux urgences à bord de l'ISS","u":"https://ntrs.nasa.gov/citations/20220019247"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"eruption","cat":"securite","title":"Éruption solaire : rejoindre l'abri","short":"Certaines éruptions envoient des protons qui arrivent en moins d'une heure. Comment l'équipage est prévenu et où il s'abrite.","fiche":"F-EXP-16","dur":205,"chapters":[{"t":86.1,"title":"Être prévenu"},{"t":104.9,"title":"S'abriter"}],"sources":[{"t":"NASA : protéger les astronautes des radiations près de la Lune","u":"https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon"},{"t":"NASA : les cinq dangers du vol habité","u":"https://www.nasa.gov/hrp/hazards/"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"sortie","cat":"securite","title":"Après une sortie : la décompression","short":"Pourquoi on respire de l'oxygène pur avant de sortir, et les signes de la maladie de décompression dans les heures qui suivent.","fiche":"F-EXP-05","dur":198,"chapters":[{"t":49.2,"title":"Avant la sortie"},{"t":94.4,"title":"Les signes"},{"t":137.3,"title":"Le traitement"}],"sources":[{"t":"NASA OCHMO-TB-037 : maladie de décompression","u":"https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-037-decompression-sickness.pdf"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]},
    {"id":"arret","cat":"securite","title":"Arrêt cardiaque en apesanteur","short":"Masser quand rien ne tient en place : la méthode des jambes, la position du poirier, la table médicale et le défibrillateur.","fiche":"F-CVN-07","dur":210,"chapters":[{"t":53.1,"title":"Masser en flottant"},{"t":105.9,"title":"La table médicale"},{"t":163.1,"title":"Tenir dans la durée"}],"sources":[{"t":"Hinkelbein J. et al. (2020) : réanimation en apesanteur (DGLRM, ESAM)","u":"https://doi.org/10.1186/s13049-020-00793-y"},{"t":"Société européenne de cardiologie (2025) : massage automatique en apesanteur","u":"https://www.escardio.org/"},{"t":"Base de connaissances AURA : fiches de conduite à tenir","u":""}]}
  ]/*FIN*/;
  V.FILMS = FILMS;
  FILMS.forEach(f => { f.kind = 'film'; f.src = 'videos/' + f.id + '.mp4'; f.poster = 'videos/' + f.id + '.jpg'; f.vtt = 'videos/' + f.id + '.vtt'; });
  V.all = () => FILMS.concat((S.state.videosLib || []).map(v => Object.assign({ kind: 'media' }, v)));
  V.get = id => V.all().find(v => v.id === id);
  const mins = v => Math.max(1, Math.round((v.dur || 60) / 60));
  V.thumb = v => v.kind === 'film'
    ? '<img src="' + esc(v.poster) + '" alt="" loading="lazy" decoding="async">'
    : '<span class="vph">' + icon('play') + '</span>';

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
      m.missions[d].video = best.id;
      m.missions[d].videoWhy = best.why;
      S.save();
    }
    const v = V.get(m.missions[d].video);
    return Object.assign({}, v, { reason: m.missions[d].videoWhy });
  };

  /* ---------------- lecteur ---------------- */
  const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  V.play = (which) => {
    const id = S.state.who;
    let v = which === 'daily' || !which ? V.daily(id) : V.get(which);
    if (!v) v = V.daily(id);
    const film = v.kind === 'film';
    const el = A.el('<div class="player" role="dialog" aria-modal="true" aria-label="' + esc(v.title) + '"><div class="head"><div class="t"><h2>' + esc(v.title) + '</h2><span class="muted small">' + (v.cat === 'securite' ? 'Sécurité' : v.cat === 'prevention' ? 'Prévention' : 'Ajoutée par Keiko') + (film ? ', ' + mins(v) + ' min' + (v.fiche ? ', fiche ' + esc(v.fiche) : '') : '') + '</span></div><button class="icon-btn" data-x aria-label="Fermer">' + icon('close') + '</button></div><div class="stage" id="pStage"></div><div class="foot" id="pFoot"></div></div>');
    document.body.appendChild(el);
    A.sky.paused = true;
    A.voice.stop();
    const stage = $('#pStage', el), foot = $('#pFoot', el);
    let done = false;
    const close = () => { const vid = stage.querySelector('video'); if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); } el.remove(); A.sky.paused = false; A.refresh(); };
    el.querySelector('[data-x]').onclick = close;
    const onKey = e => { if (e.key === 'Escape') { removeEventListener('keydown', onKey); close(); } };
    addEventListener('keydown', onKey);
    const finish = () => {
      if (done) return; done = true;
      const res = S.markVideo(id, v.id);
      stage.innerHTML = '<div class="end"><div style="width:140px">' + A.patchSVG({ nom: 'Vidéo vue', icon: 'check', c: v.cat === 'securite' ? ['#FFC98A', '#C9692B'] : ['#9FE8FF', '#1E7FB8'] }) + '</div><h2>Vidéo terminée</h2><p class="muted">Merci, c\'est noté dans ton suivi.</p><div class="row"><button class="btn" data-again>' + icon('replay') + 'Revoir</button><button class="btn primary" data-close>' + icon('check') + 'Fermer</button></div></div>';
      foot.innerHTML = '';
      stage.querySelector('[data-again]').onclick = () => { el.remove(); removeEventListener('keydown', onKey); V.play(v.id); };
      stage.querySelector('[data-close]').onclick = () => { removeEventListener('keydown', onKey); close(); };
      A.celebrate(res, 'vidéo regardée');
    };
    const show = (url, poster, vtt) => {
      stage.innerHTML = '<video controls autoplay playsinline preload="metadata"' + (poster ? ' poster="' + esc(poster) + '"' : '') + ' src="' + esc(url) + '">' + (vtt ? '<track kind="captions" srclang="fr" label="Français" src="' + esc(vtt) + '" default>' : '') + '</video>';
      const vid = stage.querySelector('video');
      vid.onended = finish;
      vid.onerror = () => { stage.innerHTML = '<div class="end"><h2>Cette vidéo ne peut pas être lue ici</h2><p class="muted">Le fichier n\'est pas sur cet appareil, ou il demande une connexion. Les vidéos d\'AURA se téléchargent à la lecture.</p></div>'; };
      return vid;
    };
    if (!film) {
      if (v.blob) A.videoStore.get(v.id).then(b => show(b ? URL.createObjectURL(b) : v.src || '')); else show(v.src || '');
      return;
    }
    const vid = show(v.src, v.poster, v.vtt);
    // chapitres et sources
    const chaps = (v.chapters || []);
    foot.innerHTML = (chaps.length ? '<div class="chaps" role="list">' + '<button class="chap" data-t="0" role="listitem"><b>' + fmt(0) + '</b>Début</button>' + chaps.map(c => '<button class="chap" role="listitem" data-t="' + c.t + '"><b>' + fmt(c.t) + '</b>' + esc(c.title) + '</button>').join('') + '</div>' : '') +
      '<details class="vsrc"><summary>Sources de la vidéo</summary><ul>' + (v.sources || []).map(x => '<li>' + (x.u ? '<a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.t) + '</a>' : esc(x.t)) + '</li>').join('') + '</ul><p class="faint small">Décor : modèle 3D de l\'intérieur de l\'ISS publié par la NASA. Équipage de démonstration et voix de synthèse.</p></details>';
    foot.querySelectorAll('.chap').forEach(b => b.onclick = () => { try { vid.currentTime = +b.dataset.t; vid.play(); } catch (e) { /* rien */ } });
    const marks = Array.from(foot.querySelectorAll('.chap'));
    vid.ontimeupdate = () => { let k = 0; marks.forEach((b, i) => { if (vid.currentTime >= +b.dataset.t - 0.2) k = i; }); marks.forEach((b, i) => b.classList.toggle('on', i === k)); };
  };

  /* ---------------- écran Vidéos ---------------- */
  A.views.videos = {
    render() {
      const id = S.state.who, m = S.member(id);
      const d = V.daily(id);
      const seen = v => m.videos[v.id];
      const card = v => '<button class="vcard" data-play="' + esc(v.id) + '"><div class="art">' + V.thumb(v) + '<span class="vdur">' + mins(v) + ' min</span>' + (seen(v) ? '<span class="tag ok seen">' + icon('check') + 'Vue</span>' : '') + '</div><div class="meta"><b>' + esc(v.title) + '</b>' + (v.short ? '<p>' + esc(v.short) + '</p>' : '') + (seen(v) ? '<small>Vue ' + A.dayLabel(seen(v).d, S.day()).toLowerCase() + '</small>' : '') + '</div></button>';
      const all = V.all();
      const lib = all.filter(v => v.kind === 'media');
      return '<div class="enter"><div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Vidéos</h1><p>Chaque jour, une vidéo choisie pour toi : trois à quatre minutes, sous-titrées, avec leurs sources. Les autres sont là quand tu veux.</p></div></div>' +
        '<div class="panel vhero"><button class="art" data-play="' + esc(d.id) + '" aria-label="Regarder ' + esc(d.title) + '">' + V.thumb(d) + '<span class="vplay">' + icon('play') + '</span></button><div class="info"><span class="why">' + icon('sparkle') + esc(d.reason || 'Pour toi aujourd\'hui') + '</span><h2>' + esc(d.title) + '</h2>' + (d.short ? '<p>' + esc(d.short) + '</p>' : '') + '<p class="muted small">' + A.plural(mins(d), 'minute') + (d.fiche ? ', fiche ' + esc(d.fiche) : '') + '. ' + (seen(d) && seen(d).d === S.day() ? 'Déjà vue aujourd\'hui.' : '+20 points.') + '</p><div><button class="btn primary big" data-play="' + esc(d.id) + '">' + icon('play') + 'Regarder</button></div></div></div>' +
        '<h2 style="margin:34px 0 16px">Sécurité</h2><div class="vgrid">' + all.filter(v => v.cat === 'securite').map(card).join('') + '</div>' +
        '<h2 style="margin:34px 0 16px">Prévention</h2><div class="vgrid">' + all.filter(v => v.cat === 'prevention' && v.kind === 'film').map(card).join('') + '</div>' +
        (lib.length ? '<h2 style="margin:34px 0 16px">Ajoutées par Keiko</h2><div class="vgrid">' + lib.map(card).join('') + '</div>' : '') +
        '</div>';
    },
    mount(node) {
      node.querySelector('[data-back]').onclick = () => A.go('accueil');
      node.querySelectorAll('[data-play]').forEach(b => b.onclick = () => V.play(b.dataset.play));
    }
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
