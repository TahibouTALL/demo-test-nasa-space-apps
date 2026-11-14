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
  const FILMS = /*FILMS*/[]/*FIN*/;
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
