/* AURA : vidéos de prévention et de sécurité.
   Les vidéos AURA sont des capsules animées, lues par Sophie : elles marchent
   sans internet. Le médecin de bord peut ajouter ses propres vidéos (fichier ou lien).
   Chaque jour, AURA propose à chacun la vidéo la plus utile pour lui. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, DATA = root.AURA_DATA;
  const $ = A.$, esc = A.esc, icon = A.icon;
  const V = A.videos = {};

  const CAPS = [
    { id: 'incendie', cat: 'securite', title: 'Incendie à bord : trois réflexes', hue: ['#FF9A6B', '#B4293F'], refresh: 30, scenes: [
      ['fire', 'Alarme incendie : on alerte, on se regroupe, on agit. Toujours dans cet ordre.'],
      ['icon:wind:rise', 'Le masque d\'abord. Il reste en place tant que l\'air n\'est pas redevenu sûr.'],
      ['icon:alert:pulse', 'On coupe le courant de l\'appareil en cause, puis on utilise l\'extincteur.'],
      ['icon:stetho:orbit', 'Après, chacun est examiné : la fumée peut gêner la respiration plusieurs heures plus tard.']] },
    { id: 'depress', cat: 'securite', title: 'Dépressurisation', hue: ['#9FC4FF', '#2B4FB8'], refresh: 30, scenes: [
      ['gauge', 'Une fuite fait baisser la pression. On calcule le temps qui reste avant 490 millimètres de mercure.'],
      ['hatch', 'On isole les modules en fermant les écoutilles, du plus loin vers le véhicule de retour.'],
      ['icon:clock:pulse', 'S\'il reste dix minutes ou moins, tout l\'équipage rejoint le véhicule de retour.']] },
    { id: 'ammoniac', cat: 'securite', title: 'Fuite d\'ammoniac', hue: ['#C9F0A8', '#3E8F5A'], refresh: 45, scenes: [
      ['icon:wind:wave', 'Une odeur forte et piquante : c\'est peut-être de l\'ammoniac, celui du circuit de refroidissement.'],
      ['icon:shield:pulse', 'Masques tout de suite, et repli vers une zone sûre.'],
      ['hatch', 'On ferme les écoutilles derrière soi. Les masques ne sont retirés que sur décision.']] },
    { id: 'eruption', cat: 'securite', title: 'Éruption solaire : rejoindre l\'abri', hue: ['#FFE08A', '#E0761E'], refresh: 60, scenes: [
      ['icon:sun:shine', 'Une éruption solaire envoie des particules très énergétiques vers le vaisseau.'],
      ['icon:shield:orbit', 'On rejoint l\'abri le plus protégé, entouré d\'eau et de réserves.'],
      ['icon:sparkle:pulse', 'On vérifie son dosimètre. Aucune sortie n\'est faite pendant l\'alerte.']] },
    { id: 'sortie', cat: 'securite', title: 'Après une sortie', hue: ['#B3E4FF', '#3567C9'], refresh: 90, scenes: [
      ['eva', 'Une sortie, ce sont des heures dans le scaphandre, à basse pression.'],
      ['icon:body:pulse', 'Douleur d\'une articulation, fourmillements ou fatigue étrange dans les 24 heures : on pense à la décompression.'],
      ['icon:call:wave', 'Dis-le tout de suite, même si ça semble petit. L\'oxygène se donne vite.']] },
    { id: 'dos', cat: 'prevention', title: 'Le dos en apesanteur', hue: ['#C9BFFF', '#5B47D6'], fiche: 'F-APE-03', scenes: [
      ['spine', 'En apesanteur, la colonne s\'allonge de quelques centimètres. C\'est ce qui donne mal au dos les premières semaines.'],
      ['icon:hand:pulse', 'La position recroquevillée, genoux contre la poitrine, a soulagé 91 % des astronautes qui l\'ont essayée.'],
      ['icon:dumbbell:rise', 'Étire-toi doucement le matin, et garde tes séances de musculation : elles protègent le dos.'],
      ['icon:alert:pulse', 'Une douleur qui descend dans la jambe, ou des fourmillements : parle-m\'en tout de suite.']] },
    { id: 'sommeil', cat: 'prevention', title: 'Bien dormir à bord', hue: ['#B8B0FF', '#3A2E9E'], fiche: 'F-PSY-05', scenes: [
      ['icon:moon:shine', 'En mission, on dort en moyenne six heures par nuit. Le corps a besoin de repères.'],
      ['icon:sun:wave', 'Le soir, l\'éclairage passe en lumière chaude. Évite les écrans lumineux la dernière heure.'],
      ['icon:sleep:rise', 'Attache ton sac de couchage, garde la même heure de coucher, et protège-toi du bruit.'],
      ['icon:call:orbit', 'Trois nuits courtes de suite ? Dis-le pendant ta conférence, on cherchera ensemble.']] },
    { id: 'os', cat: 'prevention', title: 'Protéger tes os', hue: ['#FFE3B8', '#C47A2C'], fiche: 'F-APE-14', scenes: [
      ['bone', 'Sans gravité, les os s\'affinent, surtout la hanche et la colonne.'],
      ['icon:dumbbell:pulse', 'La musculation sur l\'appareil résistif est la meilleure protection. Chaque séance compte.'],
      ['icon:sparkle:orbit', 'Calcium, vitamine D et assez de calories : ton menu fait partie de la protection.'],
      ['icon:check:shine', 'L\'objectif de la NASA : garder au moins 95 % de la densité d\'avant le vol.']] },
    { id: 'yeux', cat: 'prevention', title: 'Tes yeux et l\'apesanteur', hue: ['#9FE8FF', '#1E7FB8'], fiche: 'F-APE-06', scenes: [
      ['icon:eye:pulse', 'Pendant les longues missions, le fond de l\'œil change chez environ un astronaute sur trois.'],
      ['icon:eye:wave', 'Le signe à surveiller : la vision de près qui devient floue.'],
      ['icon:info:orbit', 'Des lunettes de correction sont à bord. Ne force pas : dis-le, on fait le point avec une échographie de l\'œil.']] },
    { id: 'eau', cat: 'prevention', title: 'Boire assez', hue: ['#A6E9FF', '#2077C9'], fiche: 'F-DIG-12', scenes: [
      ['water', 'En vol, on sent moins la soif. Il faut pourtant au moins 2,5 litres par jour.'],
      ['icon:drop:rise', 'Les os libèrent du calcium dans les urines : sans assez d\'eau, il peut former un calcul.'],
      ['icon:check:shine', 'Une gorgée à chaque pause. Des urines claires, c\'est bon signe.']] }
  ];
  V.CAPS = CAPS;
  CAPS.forEach(c => { c.kind = 'capsule'; c.dur = c.scenes.reduce((a, s) => a + 2 + s[1].split(' ').length * 0.42, 0); });
  V.all = () => CAPS.concat((S.state.videosLib || []).map(v => Object.assign({ kind: 'media' }, v)));
  V.get = id => V.all().find(v => v.id === id);

  /* ---------------- illustrations animées ---------------- */
  function bg(c) {
    return '<defs><radialGradient id="vbg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="' + c[0] + '" stop-opacity=".35"/><stop offset=".6" stop-color="' + c[1] + '" stop-opacity=".12"/><stop offset="1" stop-color="#060918" stop-opacity="0"/></radialGradient></defs><rect width="400" height="300" fill="url(#vbg)"/>';
  }
  function iconArt(name, mode, c) {
    const paths = A.ICONS[name] || A.ICONS.info;
    const rings = mode === 'pulse' ? [0, 1, 2].map(i => '<circle cx="200" cy="150" r="70" fill="none" stroke="' + c[0] + '" stroke-width="2" opacity="0"><animate attributeName="r" values="70;140" dur="3s" begin="' + i + 's" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0" dur="3s" begin="' + i + 's" repeatCount="indefinite"/></circle>').join('') : '';
    const orbit = mode === 'orbit' ? '<g><animateTransform attributeName="transform" type="rotate" from="0 200 150" to="360 200 150" dur="9s" repeatCount="indefinite"/><ellipse cx="200" cy="150" rx="120" ry="40" fill="none" stroke="' + c[0] + '" stroke-opacity=".35" stroke-dasharray="3 8"/><circle cx="320" cy="150" r="7" fill="' + c[0] + '"/></g>' : '';
    const rise = mode === 'rise' ? [0, 1, 2, 3, 4].map(i => '<circle cx="' + (130 + i * 35) + '" cy="260" r="' + (3 + i % 3) + '" fill="' + c[0] + '" opacity=".7"><animate attributeName="cy" values="270;40" dur="' + (3 + i * 0.4) + 's" begin="' + (i * 0.6) + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;0" dur="' + (3 + i * 0.4) + 's" begin="' + (i * 0.6) + 's" repeatCount="indefinite"/></circle>').join('') : '';
    const wave = mode === 'wave' ? [0, 1, 2].map(i => '<path d="M40 ' + (230 + i * 14) + ' Q120 ' + (210 + i * 14) + ' 200 ' + (230 + i * 14) + ' T360 ' + (230 + i * 14) + '" fill="none" stroke="' + c[0] + '" stroke-opacity="' + (0.5 - i * 0.12) + '" stroke-width="3"><animateTransform attributeName="transform" type="translate" values="-20 0;20 0;-20 0" dur="' + (4 + i) + 's" repeatCount="indefinite"/></path>').join('') : '';
    const shine = mode === 'shine' ? '<g opacity=".6"><animateTransform attributeName="transform" type="rotate" from="0 200 150" to="360 200 150" dur="24s" repeatCount="indefinite"/>' + Array.from({ length: 12 }, (_, i) => '<rect x="198" y="20" width="4" height="34" rx="2" fill="' + c[0] + '" transform="rotate(' + i * 30 + ' 200 150)"/>').join('') + '</g>' : '';
    return bg(c) + rings + orbit + rise + wave + shine +
      '<circle cx="200" cy="150" r="70" fill="' + c[1] + '" opacity=".55"/><circle cx="200" cy="150" r="70" fill="none" stroke="' + c[0] + '" stroke-width="2"/>' +
      '<g transform="translate(164 114) scale(3)" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + paths + '<animateTransform attributeName="transform" type="scale" additive="sum" values="1;1.04;1" dur="3s" repeatCount="indefinite"/></g>';
  }
  const ART = {
    fire: c => bg(c) + '<g transform="translate(200 210)">' + [[-40, 0.8, '#FF7A59'], [0, 1.1, '#FFB347'], [38, 0.75, '#FF5A6E']].map(([x, k, col], i) => '<path d="M' + x + ' 0 C' + (x - 40 * k) + ' -50 ' + (x - 10 * k) + ' -90 ' + x + ' -' + 140 * k + ' C' + (x + 10 * k) + ' -90 ' + (x + 40 * k) + ' -50 ' + x + ' 0Z" fill="' + col + '" opacity=".85"><animateTransform attributeName="transform" type="scale" values="1 1;1.06 .92;.96 1.08;1 1" dur="' + (1.2 + i * 0.3) + 's" repeatCount="indefinite" additive="sum"/></path>').join('') + '</g>' + [0, 1, 2].map(i => '<circle cx="' + (180 + i * 22) + '" cy="60" r="16" fill="#8C95C2" opacity="0"><animate attributeName="cy" values="80;10" dur="4s" begin="' + i * 1.3 + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.4;0" dur="4s" begin="' + i * 1.3 + 's" repeatCount="indefinite"/></circle>').join(''),
    gauge: c => bg(c) + '<path d="M80 220 A120 120 0 0 1 320 220" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="18" stroke-linecap="round"/><path d="M80 220 A120 120 0 0 1 120 135" fill="none" stroke="#FF6F6F" stroke-width="18" stroke-linecap="round"/><text x="200" y="250" fill="#F2F4FF" font-size="20" text-anchor="middle" font-family="sans-serif">pression de la cabine</text><g><line x1="200" y1="220" x2="200" y2="120" stroke="#F2F4FF" stroke-width="6" stroke-linecap="round"/><circle cx="200" cy="220" r="12" fill="' + c[0] + '"/><animateTransform attributeName="transform" type="rotate" values="40 200 220;-50 200 220;-50 200 220" keyTimes="0;.8;1" dur="5s" repeatCount="indefinite"/></g>',
    hatch: c => bg(c) + '<circle cx="200" cy="150" r="96" fill="#0E1436" stroke="' + c[0] + '" stroke-width="6"/><g><animateTransform attributeName="transform" type="scale" values="0.1;1;1" keyTimes="0;.6;1" dur="3.5s" repeatCount="indefinite" additive="sum"/><circle cx="0" cy="0" r="84" fill="' + c[1] + '" transform="translate(200 150)"/></g><g stroke="#fff" stroke-width="5" stroke-linecap="round"><line x1="150" y1="150" x2="250" y2="150"/><circle cx="200" cy="150" r="18" fill="none"/><animateTransform attributeName="transform" type="rotate" values="0 200 150;90 200 150;90 200 150" keyTimes="0;.7;1" dur="3.5s" repeatCount="indefinite"/></g>',
    spine: c => bg(c) + Array.from({ length: 7 }, (_, i) => '<rect x="170" width="60" height="22" rx="9" fill="' + c[0] + '" opacity="' + (0.95 - i * 0.06) + '"><animate attributeName="y" values="' + (60 + i * 26) + ';' + (44 + i * 32) + ';' + (60 + i * 26) + '" dur="4s" repeatCount="indefinite"/></rect>').join('') + '<text x="290" y="160" fill="#F2F4FF" font-size="26" font-family="sans-serif">+ 3 cm</text>',
    bone: c => bg(c) + '<path d="M120 120a22 22 0 1 1 30-26l100 0a22 22 0 1 1 30 26a22 22 0 1 1-30 26l-100 0a22 22 0 1 1-30-26Z" transform="translate(-10 40)" fill="' + c[0] + '" opacity=".9"/>' + Array.from({ length: 18 }, (_, i) => '<circle cx="' + (150 + (i % 6) * 22) + '" cy="' + (150 + Math.floor(i / 6) * 10 - 8) + '" r="3" fill="' + c[1] + '"><animate attributeName="opacity" values="1;.15;1" dur="4s" begin="' + (i * 0.12) + 's" repeatCount="indefinite"/></circle>').join(''),
    // sortie extravéhiculaire : un astronaute relié au vaisseau, qui flotte doucement
    eva: c => bg(c) +
      [[332, 48], [366, 226], [304, 262], [128, 36], [384, 118], [180, 270]].map(([x, y], i) => '<circle cx="' + x + '" cy="' + y + '" r="1.8" fill="#fff"><animate attributeName="opacity" values=".2;1;.2" dur="' + (2 + i * 0.5) + 's" repeatCount="indefinite"/></circle>').join('') +
      '<rect x="-30" y="34" width="118" height="232" rx="20" fill="#18204A" stroke="' + c[0] + '" stroke-opacity=".45" stroke-width="2"/>' +
      '<path d="M-30 96h118M-30 204h118" stroke="' + c[0] + '" stroke-opacity=".25" stroke-width="2"/>' +
      '<circle cx="58" cy="150" r="24" fill="#0B1030" stroke="' + c[0] + '" stroke-width="3"/><circle cx="58" cy="150" r="9" fill="none" stroke="' + c[0] + '" stroke-opacity=".6" stroke-width="2"/>' +
      '<path d="M82 150 C150 110 190 220 250 174" fill="none" stroke="#F2F4FF" stroke-width="2.5" stroke-linecap="round" opacity=".85"><animate attributeName="d" values="M82 150 C150 110 190 220 250 174;M82 150 C150 190 190 140 250 164;M82 150 C150 110 190 220 250 174" dur="6s" repeatCount="indefinite"/></path>' +
      '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -10;0 0" dur="6s" repeatCount="indefinite"/><g transform="translate(270 150) rotate(-12)">' +
        '<rect x="-31" y="-30" width="62" height="72" rx="13" fill="#B9C4EE"/>' +
        '<path d="M-22 -8 Q-46 6 -42 28" stroke="#E9EDFF" stroke-width="14" stroke-linecap="round" fill="none"/>' +
        '<path d="M22 -8 Q46 -2 52 -24" stroke="#E9EDFF" stroke-width="14" stroke-linecap="round" fill="none"/>' +
        '<path d="M-12 40 L-17 74M12 40 L21 72" stroke="#E9EDFF" stroke-width="16" stroke-linecap="round"/>' +
        '<rect x="-25" y="-22" width="50" height="66" rx="17" fill="#F2F4FF"/>' +
        '<rect x="-12" y="-2" width="24" height="15" rx="4" fill="' + c[1] + '"/><circle cx="-4" cy="5.5" r="2.4" fill="' + c[0] + '"/><circle cx="5" cy="5.5" r="2.4" fill="#FFC870"/>' +
        '<circle cx="0" cy="-44" r="25" fill="#F2F4FF"/><ellipse cx="2" cy="-44" rx="17" ry="13" fill="' + c[1] + '"/><ellipse cx="-5" cy="-48" rx="6" ry="3.4" fill="#fff" opacity=".75"/>' +
      '</g></g>',
    water: c => bg(c) + '<path d="M150 70h100l-10 170h-80Z" fill="none" stroke="#F2F4FF" stroke-width="5" stroke-linejoin="round"/><clipPath id="vglass"><path d="M152 72h96l-10 166h-76Z"/></clipPath><g clip-path="url(#vglass)"><rect x="140" width="120" height="200" fill="' + c[0] + '" opacity=".75"><animate attributeName="y" values="240;110;110" keyTimes="0;.7;1" dur="4s" repeatCount="indefinite"/></rect>' + [0, 1, 2].map(i => '<circle cx="' + (180 + i * 18) + '" r="4" fill="#fff" opacity=".7"><animate attributeName="cy" values="235;120" dur="2s" begin="' + i * 0.6 + 's" repeatCount="indefinite"/></circle>').join('') + '</g>'
  };
  let artN = 0;
  V.art = (spec, c) => {
    const [k, a, b] = spec.split(':');
    const n = ++artN;
    const inner = (k === 'icon' ? iconArt(a, b, c) : (ART[k] ? ART[k](c) : iconArt('video', 'pulse', c)))
      .replace(/id="(vbg|vglass)"/g, 'id="$1' + n + '"').replace(/url\(#(vbg|vglass)\)/g, 'url(#$1' + n + ')');
    return '<svg class="scene" viewBox="0 0 400 300" aria-hidden="true">' + inner + '</svg>';
  };
  V.thumb = v => v.kind === 'capsule' ? V.art(v.scenes[0][0], v.hue) : V.art('icon:play:pulse', v.hue || ['#9FD8FF', '#2F6FE0']);

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
  V.play = (which) => {
    const id = S.state.who;
    let v = which === 'daily' || !which ? V.daily(id) : V.get(which);
    if (!v) v = V.daily(id);
    const el = A.el('<div class="player" role="dialog" aria-modal="true" aria-label="' + esc(v.title) + '"><div class="head"><div class="t"><h2>' + esc(v.title) + '</h2><span class="muted small">' + (v.cat === 'securite' ? 'Sécurité' : 'Prévention') + (v.kind === 'capsule' ? ' · lue par ' + esc(S.sophieName(id)) : '') + '</span></div><button class="icon-btn" data-x aria-label="Fermer">' + icon('close') + '</button></div><div class="stage" id="pStage"></div><div class="foot" id="pFoot"></div></div>');
    document.body.appendChild(el);
    A.sky.paused = true;
    A.voice.stop();
    const stage = $('#pStage', el), foot = $('#pFoot', el);
    let cancelled = false;
    const close = () => { cancelled = true; A.voice.stop(); el.remove(); A.sky.paused = false; A.refresh(); };
    el.querySelector('[data-x]').onclick = close;
    const finish = () => {
      if (cancelled) return;
      const res = S.markVideo(id, v.id);
      stage.innerHTML = '<div class="end"><div style="width:140px">' + A.patchSVG({ nom: 'Vidéo vue', icon: 'check', c: v.hue || ['#9FD8FF', '#2F6FE0'] }) + '</div><h2>Vidéo terminée</h2><p class="muted">Merci, c\'est noté dans ton suivi.</p><div class="row"><button class="btn" data-again>' + icon('replay') + 'Revoir</button><button class="btn primary" data-close>' + icon('check') + 'Fermer</button></div></div>';
      foot.innerHTML = '';
      stage.querySelector('[data-again]').onclick = () => { el.remove(); V.play(v.id); };
      stage.querySelector('[data-close]').onclick = close;
      A.celebrate(res, 'vidéo regardée');
    };
    if (v.kind === 'media') {
      const src = v.src || '';
      const show = url => {
        stage.innerHTML = '<video controls autoplay playsinline src="' + esc(url) + '"></video>';
        const vid = stage.querySelector('video');
        vid.onended = finish;
        vid.onerror = () => { stage.innerHTML = '<div class="end"><h2>Cette vidéo ne peut pas être lue ici</h2><p class="muted">Le fichier n\'est pas disponible sur cet appareil, ou le lien demande internet.</p></div>'; };
      };
      if (v.blob) A.videoStore.get(v.id).then(b => show(b ? URL.createObjectURL(b) : src)); else show(src);
      return;
    }
    // capsule animée, lue par Sophie
    foot.innerHTML = '<div class="segbar">' + v.scenes.map(() => '<i><b></b></i>').join('') + '</div><div class="row" style="justify-content:center"><button class="icon-btn" data-prev aria-label="Précédent">' + icon('back') + '</button><button class="icon-btn" data-pause aria-label="Pause" style="width:56px;height:56px">' + icon('pause') + '</button><button class="icon-btn" data-next aria-label="Suivant">' + icon('next') + '</button></div>';
    const segs = foot.querySelectorAll('.segbar b');
    let i = 0, paused = false, token = 0;
    const m = S.member(id);
    const show = async (k) => {
      const my = ++token;
      i = k;
      segs.forEach((b, j) => { b.style.transition = 'none'; b.style.width = j < k ? '100%' : '0%'; });
      const [art, text] = v.scenes[k];
      stage.innerHTML = V.art(art, v.hue) + '<p class="cap"><span>' + esc(text) + '</span></p>';
      const est = 1.4 + text.split(' ').length * 0.42;
      requestAnimationFrame(() => { segs[k].style.transition = 'width ' + est + 's linear'; segs[k].style.width = '100%'; });
      await Promise.all([A.voice.speak(text, { gender: m.prefs.voice, rate: m.prefs.rate || 1, mute: !S.state.settings.sound }), A.sleep(est * 1000)]);
      if (my !== token || cancelled) return;
      while (paused && my === token) await A.sleep(200);
      if (my !== token || cancelled) return;
      if (k + 1 < v.scenes.length) show(k + 1); else finish();
    };
    foot.querySelector('[data-prev]').onclick = () => { A.voice.stop(); show(Math.max(0, i - 1)); };
    foot.querySelector('[data-next]').onclick = () => { A.voice.stop(); if (i + 1 < v.scenes.length) show(i + 1); else { token++; finish(); } };
    const pb = foot.querySelector('[data-pause]');
    pb.onclick = () => { paused = !paused; pb.innerHTML = icon(paused ? 'play' : 'pause'); pb.setAttribute('aria-label', paused ? 'Lecture' : 'Pause'); if (paused) A.voice.stop(); else show(i); };
    show(0);
  };

  /* ---------------- écran Vidéos ---------------- */
  A.views.videos = {
    render() {
      const id = S.state.who, m = S.member(id);
      const d = V.daily(id);
      const seen = v => m.videos[v.id];
      const card = v => '<button class="vcard" data-play="' + esc(v.id) + '"><div class="art">' + V.thumb(v) + (seen(v) ? '<span class="tag ok seen">' + icon('check') + 'Vue</span>' : '') + '</div><div class="meta"><b>' + esc(v.title) + '</b><small>' + Math.max(1, Math.round((v.dur || 60) / 60)) + ' min' + (seen(v) ? ' · ' + A.dayLabel(seen(v).d, S.day()) : '') + '</small></div></button>';
      const all = V.all();
      const lib = all.filter(v => v.kind === 'media');
      return '<div class="enter"><div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Vidéos</h1><p>Chaque jour, une vidéo choisie pour toi. Les autres sont là quand tu veux.</p></div></div>' +
        '<div class="panel vhero"><div class="art" id="vHeroArt">' + V.art(d.scenes ? d.scenes[0][0] : 'icon:video:pulse', d.hue || ['#9FD8FF', '#2F6FE0']) + '</div><div class="info"><span class="why">' + icon('sparkle') + esc(d.reason || 'Pour toi aujourd\'hui') + '</span><h2>' + esc(d.title) + '</h2><p class="muted">' + A.plural(Math.max(1, Math.round((d.dur || 60) / 60)), 'minute') + (d.kind === 'capsule' ? ', lue par ' + esc(S.sophieName(id)) : '') + '. ' + (seen(d) && seen(d).d === S.day() ? 'Déjà vue aujourd\'hui.' : '+20 points.') + '</p><div><button class="btn primary big" data-play="' + esc(d.id) + '">' + icon('play') + 'Regarder</button></div></div></div>' +
        '<h2 style="margin:34px 0 16px">Sécurité</h2><div class="vgrid">' + all.filter(v => v.cat === 'securite').map(card).join('') + '</div>' +
        '<h2 style="margin:34px 0 16px">Prévention</h2><div class="vgrid">' + all.filter(v => v.cat === 'prevention' && v.kind === 'capsule').map(card).join('') + '</div>' +
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
