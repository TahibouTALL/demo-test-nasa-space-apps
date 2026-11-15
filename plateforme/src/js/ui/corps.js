/* AURA : « Mon corps ». Une silhouette dont chaque partie se touche : à quoi elle sert, ce que le vol
   lui fait, comment elle va chez l'astronaute (d'après ses mesures et son sport), et quoi faire.
   La couleur dit l'état d'un coup d'œil : vert, ça va ; ambre, à regarder ; rouge, à voir vite ;
   bleu, pas de mesure à bord, seulement des conseils. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, DATA = root.AURA_DATA, esc = A.esc, icon = A.icon;

  const COL = { ok: '#7BE3C6', warn: '#FFB65C', bad: '#FF6F6F', na: '#8FB4FF' };
  const WORD = { ok: 'Va bien', warn: 'À regarder', bad: 'À voir vite', na: 'Conseils' };
  const lvl = l => l === 'urgence' ? 'bad' : l === 'vigilance' ? 'warn' : 'ok';
  const worstOf = (...xs) => xs.includes('bad') ? 'bad' : xs.includes('warn') ? 'warn' : xs.includes('ok') ? 'ok' : 'na';
  const last = (id, k) => S.lastMeasure(id, k);
  const recent = (l, days) => l && S.day() - l.d <= days;

  // minutes de sport des sept derniers jours, par type
  function week(id) {
    const m = S.member(id), from = S.day() - 6;
    const ex = m.exercise.filter(x => x.d >= from);
    return { cardio: ex.filter(x => x.type !== 'muscu').reduce((a, x) => a + x.min, 0), force: ex.filter(x => x.type === 'muscu').reduce((a, x) => a + x.min, 0) };
  }

  // chaque partie : nom, rôle, effet du vol (sourcé), état chez l'astronaute, actions
  function parts(id) {
    const m = S.member(id), G = A.gamify.GOALS, w = week(id);
    const sl = m.measures.sleep.slice(-7), sleepAvg = sl.reduce((a, x) => a + x.v, 0) / Math.max(1, sl.length);
    const hr = last(id, 'hr'), sys = last(id, 'sys'), dia = last(id, 'dia'), spo2 = last(id, 'spo2'), glu = last(id, 'glu'), temp = last(id, 'temp'), mass = last(id, 'mass');
    const pre = S.profile(id).pre.mass.mean, loss = mass ? (pre - mass.v) / pre * 100 : 0, water = S.waterToday(id);
    const n = (v, d) => A.num(v, d || 0);
    return [
      { key: 'tete', name: 'Cerveau, sommeil et moral',
        role: 'Le cerveau règle tout le corps, et le sommeil le répare chaque nuit.',
        space: 'Isolement, confinement, seize levers de soleil par jour : en mission, on dort en moyenne six heures. Pendant Mars-500, la plupart de l\'équipage a mal dormi.', src: 'Barger, 2014 ; Basner, 2013',
        st: sleepAvg < 6 ? 'warn' : 'ok',
        you: 'Sommeil : ' + A.num(sleepAvg, 1) + ' h par nuit en moyenne cette semaine' + (sleepAvg < 6 ? ', un peu court.' : '.'),
        acts: [['Respirer au calme', 'escape', () => A.go('evasion')], ['Mon journal', 'journal', () => A.go('journal')]] },
      { key: 'yeux', name: 'Yeux',
        role: 'Ils voient de près et de loin, et s\'adaptent à la lumière.',
        space: 'Les liquides remontent vers la tête : sept astronautes sur dix, en mission longue, ont des changements au fond de l\'œil. Le signe à surveiller, c\'est la vision de près.', src: 'NASA, santé cardiovasculaire et vision',
        st: A.photo.waiting(id, 'oeil') ? 'warn' : 'na',
        you: 'Pas de mesure à bord. Dis-le tout de suite si ta vision de près devient floue.' + (A.photo.status(id, 'oeil') ? ' ' + A.photo.status(id, 'oeil') : ''),
        acts: [['La vidéo sur les yeux', 'play', () => A.go('videos/yeux')], ['Je vois moins bien', 'hand', () => A.go('triage', { t: 'je vois moins bien de près' })], [A.photo.label(id), 'camera', () => A.photoSheet('oeil')]] },
      { key: 'coeur', name: 'Cœur et vaisseaux',
        role: 'Le cœur pousse le sang, et avec lui l\'oxygène, dans tout le corps.',
        space: 'En apesanteur, le sang remonte vers le haut du corps et la tension baisse d\'environ 8 à 10 mmHg. Sans sport, le cœur se déconditionne.', src: 'Norsk, 2015',
        st: worstOf(recent(hr, 3) ? lvl(hr.lvl) : 'na', recent(sys, 3) ? lvl(sys.lvl) : 'na', recent(dia, 3) ? lvl(dia.lvl) : 'na'),
        you: [hr ? 'Pouls au repos ' + n(hr.v) + '/min' : '', sys && dia ? 'tension ' + sys.v + '/' + dia.v + ' mmHg' : ''].filter(Boolean).join(', ') + (hr || sys ? ' (' + A.dayLabel(Math.max(hr ? hr.d : 0, sys ? sys.d : 0), S.day()).toLowerCase() + ').' : 'Pas encore de mesure.'),
        acts: [['Prendre ma tension', 'gauge', () => A.measureSheet('bp')], ['Mon pouls', 'pulse', () => A.measureSheet('hr')]] },
      { key: 'poumons', name: 'Poumons',
        role: 'Ils font entrer l\'oxygène dans le sang et sortir le gaz carbonique.',
        space: 'L\'air du vaisseau est recyclé : le CO₂ s\'y accumule, et chaque mmHg de plus double le risque de mal de tête.', src: 'Law, 2014 ; NASA, fiche CO₂',
        st: recent(spo2, 3) ? lvl(spo2.lvl) : 'na',
        you: spo2 ? 'Saturation ' + n(spo2.v) + ' % (' + A.dayLabel(spo2.d, S.day()).toLowerCase() + ').' : 'Pas encore de mesure.',
        acts: [['Ma saturation', 'drop', () => A.measureSheet('spo2')]] },
      { key: 'ventre', name: 'Digestion et nutrition',
        role: 'L\'estomac et l\'intestin tirent l\'énergie des repas ; l\'insuline fait entrer le sucre dans les cellules.',
        space: 'En vol, on mange souvent moins que ce dont on a besoin : sur Mir, deux astronautes ont perdu plus de 10 % de leur poids en quatre mois. Le corps peut aussi devenir moins sensible à l\'insuline.', src: 'Smith, 2001 ; Hughson, 2016',
        st: worstOf(glu && S.day() - glu.d <= 10 ? lvl(glu.lvl) : 'warn', loss >= 5 ? 'warn' : 'ok'),
        you: (mass ? 'Masse ' + A.num(mass.v, 1) + ' kg, ' + (loss > 0 ? A.num(loss, 1) + ' % de moins' : 'pas de perte') + ' depuis le départ' + (loss >= 5 ? ', à surveiller' : '') + '. ' : '') + (glu ? 'Glycémie à jeun ' + n(glu.v) + ' mg/dL (' + A.dayLabel(glu.d, S.day()).toLowerCase() + ')' + (S.day() - glu.d >= 7 ? ', à reprendre cette semaine.' : '.') : 'Glycémie à prendre à jeun, une fois par semaine.'),
        acts: [['Ma masse', 'scale', () => A.measureSheet('mass')], ['Ma glycémie', 'glucose', () => A.measureSheet('glu')]] },
      { key: 'reins', name: 'Reins',
        role: 'Ils filtrent le sang et fabriquent l\'urine.',
        space: 'Le calcium qui sort des os passe dans les urines, et on a moins soif en apesanteur : le risque de calcul rénal monte dès l\'arrivée. Environ deux litres et demi d\'eau par jour.', src: 'Whitson, NASA',
        st: water >= 2500 ? 'ok' : S.minute() >= 18 * 60 && water < 1500 ? 'warn' : 'na',
        you: 'Eau bue aujourd\'hui : ' + A.num(water / 1000, 2) + ' L sur 2,5. Une douleur brutale dans le bas du dos ou sur le côté : préviens Keiko.',
        acts: [['J\'ai bu un verre', 'cup', () => { S.addWater(id, 250); A.toast(icon('check') + 'Un verre de plus : ' + A.num(S.waterToday(id) / 1000, 2) + ' L aujourd\'hui.'); A.render(); }], ['La vidéo sur l\'eau', 'play', () => A.go('videos/eau')]] },
      { key: 'os', name: 'Os',
        role: 'Ils portent le corps, protègent les organes et gardent le calcium.',
        space: 'Sans poids à porter, les os perdent 1 à 1,5 % de leur densité par mois. Seul l\'exercice contre une charge les protège.', src: 'NASA, risque osseux',
        st: w.force >= G.force * 7 * 0.7 ? 'ok' : 'warn',
        you: w.force + ' minutes de musculation sur 7 jours, pour ' + (G.force * 7) + ' conseillées.',
        acts: [['Ma séance', 'dumbbell', () => A.go('defis')]] },
      { key: 'muscles', name: 'Muscles',
        role: 'Ils font bouger le corps et soutiennent le dos et les os.',
        space: 'Sans entraînement, on peut perdre jusqu\'à 20 % de muscle en deux semaines. Les astronautes font environ deux heures de sport par jour.', src: 'Agence spatiale canadienne',
        st: (w.cardio + w.force) >= (G.cardio + G.force) * 7 * 0.7 ? 'ok' : 'warn',
        you: (w.cardio + w.force) + ' minutes de sport sur 7 jours, pour ' + ((G.cardio + G.force) * 7) + ' conseillées.',
        acts: [['Ma séance', 'bike', () => A.go('defis')]] },
      { key: 'defenses', name: 'Défenses du corps',
        role: 'Les globules blancs et les ganglions repèrent et combattent les microbes.',
        space: 'En vol, le système immunitaire se dérègle : des virus endormis, comme celui de l\'herpès, se réveillent plus souvent, et la peau réagit davantage.', src: 'Crucian, 2018',
        st: temp && recent(temp, 3) ? lvl(temp.lvl) : 'na',
        you: temp ? 'Température ' + A.num(temp.v, 1) + ' °C (' + A.dayLabel(temp.d, S.day()).toLowerCase() + '), ' + (lvl(temp.lvl) === 'ok' ? 'pas de fièvre pour toi.' : 'à regarder.') : 'Pas encore de température.',
        acts: [['Je ne me sens pas bien', 'hand', () => A.go('triage')], ['Ma température', 'temp', () => A.measureSheet('temp')]] },
      { key: 'peau', name: 'Peau',
        role: 'Elle protège de l\'extérieur et aide à garder la bonne température.',
        space: 'Les éruptions et irritations de la peau sont parmi les petits problèmes les plus fréquents en vol : elles touchent la grande majorité des astronautes en six mois.', src: 'Fiches AURA, modèle IMM de la NASA',
        st: A.photo.waiting(id, 'peau') ? 'warn' : 'na',
        you: A.photo.status(id, 'peau') || 'Pas de mesure de la peau à bord. Une rougeur, des démangeaisons ou une plaie qui ne guérit pas : dis-le à ' + S.sophieName(id) + ', ou envoie une photo ' + (S.isCmo(id) ? 'au médecin au sol.' : 'à ' + A.first(S.profile(S.cmoId()).name) + '.'),
        acts: [[A.photo.label(id), 'camera', () => A.photoSheet('peau')], ['Un problème de peau', 'hand', () => A.go('triage', { t: 'j\'ai un problème de peau' })]] }
    ];
  }

  // dose de radiations reçue depuis le départ : environ 1,8 mSv par jour en trajet (Zeitlin, 2013),
  // 0,64 mSv par jour à la surface de Mars (Hassler, 2014)
  const E = root.AURA_ENGINE;
  function dose() {
    let d = 0;
    for (let k = 1; k <= S.day(); k++) d += E.phaseAt(DATA.mission, k).id === 'surface' ? 0.64 : 1.8;
    return d;
  }
  // les cinq dangers du vol habité (NASA, Human Research Program) et ce qu'AURA fait pour chacun
  function hazards(id) {
    const dz = dose(), lim = 600, light = S.light ? S.light() : null;
    return [
      { key: 'rad', name: 'Radiations', ic: 'sun', a: '#FFE3A3', b: '#E08A1E',
        does: 'Hors du champ magnétique de la Terre, les rayons cosmiques et les éruptions solaires traversent le vaisseau.',
        you: 'Tu as reçu environ ' + A.num(dz, 0) + ' mSv depuis le départ, sur ' + lim + ' permis par la NASA pour toute une carrière.',
        bar: dz / lim, act: ['Rejoindre l\'abri', () => A.go('videos/eruption')] },
      { key: 'iso', name: 'Isolement et confinement', ic: 'users', a: '#D6CEFF', b: '#6B57E8',
        does: 'Peu de monde, peu d\'espace, des mois sans changer de décor : le sommeil et le moral s\'usent.',
        you: 'La conférence de la semaine, ton journal privé et les évasions en 3D t\'aident à souffler.',
        act: ['Une évasion', () => A.go('evasion')] },
      { key: 'dist', name: 'Distance de la Terre', ic: 'satellite', a: '#B5E3FF', b: '#2F6FE0',
        does: 'Aucune évacuation possible, et la Terre répond avec du retard, ou plus du tout pendant la conjonction.',
        you: 'La Terre est à ' + (light ? A.num(light, 0) + ' min' : 'plusieurs minutes') + ' : diagnostic, traitement et premiers gestes se font à bord.',
        act: ['M\'entraîner aux urgences', () => A.go('simulations')] },
      { key: 'grav', name: 'Champs de gravité', ic: 'orbit', a: '#9BF0D6', b: '#1E9E8C',
        does: 'Sans pesanteur, les os et les muscles fondent, les liquides remontent vers la tête, l\'équilibre se dérègle.',
        you: 'Tes os et tes muscles sont suivis dans Mon corps, et ton sport du jour les protège.',
        act: ['Ma séance', () => A.go('defis')] },
      { key: 'env', name: 'Environnement hostile et fermé', ic: 'wind', a: '#FFD0B8', b: '#D2603C',
        does: 'Un air recyclé où le CO₂ s\'accumule, des microbes qui circulent, du bruit, de la lumière artificielle.',
        you: 'AURA tient compte du CO₂ de la cabine, et cherche une cause commune quand plusieurs équipiers tombent malades.',
        act: ['Je ne me sens pas bien', () => A.go('triage')] }
    ];
  }

  /* ---------------- la silhouette ---------------- */
  // mêmes proportions que les personnages du sport et des films : 1 = la hauteur du corps
  const heart = (cx, cy, s) => 'M' + cx + ' ' + (cy + 0.35 * s) + ' C' + (cx - 0.62 * s) + ' ' + (cy - 0.02 * s) + ' ' + (cx - 0.36 * s) + ' ' + (cy - 0.58 * s) + ' ' + cx + ' ' + (cy - 0.24 * s) + ' C' + (cx + 0.36 * s) + ' ' + (cy - 0.58 * s) + ' ' + (cx + 0.62 * s) + ' ' + (cy - 0.02 * s) + ' ' + cx + ' ' + (cy + 0.35 * s) + ' Z';
  const SHAPES = {
    tete: '<ellipse cx="0" cy="-.438" rx=".05" ry=".03"/><path d="M0 -.466 V-.41" stroke="rgba(10,16,48,.45)" stroke-width=".004" fill="none"/>',
    yeux: '<ellipse cx="-.026" cy="-.404" rx=".015" ry=".0095"/><ellipse cx=".026" cy="-.404" rx=".015" ry=".0095"/>',
    poumons: '<path d="M-.018 -.29 C-.06 -.3 -.1 -.27 -.104 -.22 C-.108 -.17 -.09 -.15 -.06 -.155 C-.03 -.16 -.018 -.18 -.018 -.21 Z"/><path d="M.018 -.29 C.06 -.3 .1 -.27 .104 -.22 C.108 -.17 .09 -.15 .06 -.155 C.04 -.158 .03 -.165 .026 -.18 Z"/>',
    coeur: '<path d="' + heart(0.024, -0.214, 0.062) + '"/>',
    ventre: '<path d="M-.02 -.135 C.03 -.15 .07 -.13 .066 -.1 C.062 -.075 .03 -.07 .005 -.08 C-.02 -.088 -.045 -.1 -.04 -.12 C-.036 -.13 -.028 -.133 -.02 -.135 Z"/>',
    reins: '<path d="M-.09 -.098 C-.1 -.12 -.084 -.14 -.07 -.13 C-.064 -.124 -.07 -.112 -.066 -.102 C-.062 -.092 -.066 -.078 -.076 -.078 C-.084 -.078 -.088 -.09 -.09 -.098 Z"/><path d="M.09 -.098 C.1 -.12 .084 -.14 .07 -.13 C.064 -.124 .07 -.112 .066 -.102 C.062 -.092 .066 -.078 .076 -.078 C.084 -.078 .088 -.09 .09 -.098 Z"/>',
    os: '<g stroke-linecap="round" fill="none">' + [-1, 1].map(s => '<line x1="' + s * 0.066 + '" y1=".07" x2="' + s * 0.074 + '" y2=".235" stroke-width=".022"/><line x1="' + s * 0.076 + '" y1=".27" x2="' + s * 0.079 + '" y2=".44" stroke-width=".018"/><circle cx="' + s * 0.075 + '" cy=".253" r=".017" stroke="none"/>').join('') + '</g>',
    defenses: [[-0.032, -0.352], [0.032, -0.352], [-0.118, -0.268], [0.118, -0.268], [-0.052, 0.04], [0.052, 0.04]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r=".0115"/>').join(''),
    muscles: '<g stroke-linecap="round" fill="none">' + [-1, 1].map(s => '<line x1="' + s * 0.172 + '" y1="-.255" x2="' + s * 0.193 + '" y2="-.1" stroke-width=".052"/><ellipse cx="' + s * 0.16 + '" cy="-.285" rx=".038" ry=".034" stroke="none"/>').join('') + '</g>'
  };
  const SIL = '<circle cx="0" cy="-.415" r=".072"/>' +
    '<path d="M-.15 -.31 Q0 -.335 .15 -.31 L.12 -.12 L.115 -.04 L.13 .05 L0 .08 L-.13 .05 L-.115 -.04 L-.12 -.12 Z"/>' +
    '<g stroke="currentColor" stroke-linecap="round">' + [-1, 1].map(s => '<line x1="' + s * 0.165 + '" y1="-.29" x2="' + s * 0.2 + '" y2="-.06" stroke-width=".076"/><line x1="' + s * 0.2 + '" y1="-.06" x2="' + s * 0.215 + '" y2=".12" stroke-width=".064"/><line x1="' + s * 0.065 + '" y1=".04" x2="' + s * 0.075 + '" y2=".25" stroke-width=".116"/><line x1="' + s * 0.075 + '" y1=".25" x2="' + s * 0.08 + '" y2=".46" stroke-width=".09"/><circle cx="' + s * 0.218 + '" cy=".155" r=".03" stroke="none"/><ellipse cx="' + s * 0.09 + '" cy=".485" rx=".05" ry=".022" stroke="none"/>').join('') + '</g>' +
    '<line x1="0" y1="-.37" x2="0" y2="-.3" stroke="currentColor" stroke-width=".064" stroke-linecap="round"/>';

  function figure(list, sel) {
    const by = Object.fromEntries(list.map(p => [p.key, p]));
    // ordre de dessin : du fond vers l'avant
    const order = ['muscles', 'os', 'reins', 'poumons', 'ventre', 'coeur', 'defenses', 'tete', 'yeux'];
    const orgs = order.map(k => {
      const p = by[k], c = COL[p.st];
      return '<g class="org' + (k === sel ? ' on' : '') + '" data-o="' + k + '" tabindex="0" role="button" aria-pressed="' + (k === sel) + '" aria-label="' + esc(p.name + ', ' + WORD[p.st].toLowerCase()) + '" style="--c:' + c + '" fill="' + c + '" stroke="' + c + '" stroke-width="0">' +
        '<g class="glow" filter="url(#corpsGlow)">' + SHAPES[k] + '</g>' + SHAPES[k] + '</g>';
    }).join('');
    const skin = by.peau;
    return '<svg class="corps-fig" viewBox="-.3 -.53 .6 1.06" role="group" aria-label="Ton corps : touche une partie">' +
      '<defs><filter id="corpsGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".012"/></filter>' +
      '<linearGradient id="corpsSkin" gradientUnits="userSpaceOnUse" x1="0" y1="-.5" x2="0" y2=".5"><stop offset="0" stop-color="#3E4A96"/><stop offset="1" stop-color="#222B63"/></linearGradient></defs>' +
      '<g class="org skin' + (sel === 'peau' ? ' on' : '') + '" data-o="peau" tabindex="0" role="button" aria-pressed="' + (sel === 'peau') + '" aria-label="' + esc(skin.name + ', ' + WORD[skin.st].toLowerCase()) + '" style="--c:' + COL[skin.st] + '" fill="url(#corpsSkin)" stroke-width="0">' + SIL.replace(/currentColor/g, 'url(#corpsSkin)') + '</g>' +
      orgs + '</svg>';
  }

  function detail(p) {
    return '<div class="corps-detail" style="--c:' + COL[p.st] + '"><div class="cd-head"><h2>' + esc(p.name) + '</h2><span class="cd-st"><i></i>' + WORD[p.st] + '</span></div>' +
      '<dl><dt>À quoi ça sert</dt><dd>' + esc(p.role) + '</dd>' +
      '<dt>Dans l\'espace</dt><dd>' + esc(p.space) + ' <span class="src">' + esc(p.src) + '</span></dd>' +
      '<dt>Chez toi</dt><dd class="you">' + esc(p.you) + '</dd></dl>' +
      '<div class="row wrap">' + p.acts.map((a, i) => '<button class="btn' + (i === 0 ? ' primary' : '') + '" data-a="' + i + '">' + icon(a[1]) + esc(a[0]) + '</button>').join('') + '</div></div>';
  }

  A.corps = { parts, summary: id => { const n = parts(id).filter(p => p.st === 'warn' || p.st === 'bad').length; return n ? A.plural(n, 'point') + ' à regarder' : 'tout va bien'; } };

  A.views.corps = {
    wide: true,
    render(node, params) {
      const id = S.state.who, list = parts(id);
      // par défaut : la partie qui demande le plus d'attention, sinon le cœur
      const first = list.find(p => p.st === 'bad') || list.find(p => p.st === 'warn' && p.key !== 'ventre') || list.find(p => p.key === 'coeur');
      this.sel = params.o && list.some(p => p.key === params.o) ? params.o : first.key;
      const p = list.find(x => x.key === this.sel);
      return '<div class="enter corps">' +
        '<div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Mon corps</h1><p>Touche une partie du corps : à quoi elle sert, ce que le vol lui fait, et comment elle va chez toi.</p></div></div>' +
        '<div class="corps-grid">' +
          '<div class="corps-stage">' + figure(list, this.sel) +
            '<ul class="corps-legend" aria-label="Couleurs">' + ['ok', 'warn', 'bad', 'na'].map(k => '<li><i style="background:' + COL[k] + '"></i>' + WORD[k] + '</li>').join('') + '</ul></div>' +
          '<div class="corps-side">' +
            '<nav class="corps-list" aria-label="Parties du corps">' + list.map(x => '<button data-o="' + x.key + '" aria-pressed="' + (x.key === this.sel) + '" style="--c:' + COL[x.st] + '"><i></i>' + esc(x.name) + '</button>').join('') + '</nav>' +
            '<div id="cDetail" aria-live="polite">' + detail(p) + '</div>' +
          '</div>' +
        '</div>' +
        '<section class="hz" aria-labelledby="hzT"><div class="hz-head"><h2 id="hzT">Les cinq dangers du vol habité</h2><p class="muted">La NASA range les dangers d\'un vol habité en cinq familles. Vers Mars, l\'équipage les vit toutes à la fois. Voici ce que chacune fait, et ce qu\'AURA fait pour toi.</p></div>' +
          '<ol class="hz-list">' + hazards(id).map((h, i) => '<li style="--a:' + h.a + ';--b:' + h.b + '"><span class="disc">' + icon(h.ic) + '</span><h3>' + esc(h.name) + '</h3><p>' + esc(h.does) + '</p><p class="you">' + esc(h.you) + '</p>' +
            (h.bar !== undefined ? '<span class="hz-bar" role="img" aria-label="' + Math.round(h.bar * 100) + ' % de la limite"><i style="width:' + Math.min(100, h.bar * 100).toFixed(1) + '%"></i></span>' : '') +
            '<button class="btn small" data-hz="' + i + '">' + esc(h.act[0]) + '</button></li>').join('') + '</ol>' +
          '<p class="hz-src">Sources : <a href="https://www.nasa.gov/hrp/hazards" target="_blank" rel="noopener">NASA, Human Research Program, les cinq dangers du vol habité</a> ; <a href="https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp" target="_blank" rel="noopener">Agence spatiale canadienne, surveiller les radiations</a> ; doses : Zeitlin, 2013, et Hassler, 2014 ; limite : NASA-STD-3001.</p>' +
        '</section>' +
        '</div>';
    },
    mount(node) {
      const id = S.state.who;
      node.querySelector('[data-back]').onclick = () => A.back();
      const show = key => {
        const list = parts(id), p = list.find(x => x.key === key); if (!p) return;
        this.sel = key;
        node.querySelectorAll('[data-o]').forEach(el => { const on = el.dataset.o === key; el.classList.toggle('on', on); el.setAttribute('aria-pressed', on); });
        const box = node.querySelector('#cDetail');
        box.innerHTML = detail(p);
        box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => p.acts[+b.dataset.a][2]());
        if (root.matchMedia && root.matchMedia('(max-width: 860px)').matches) box.scrollIntoView({ behavior: A.reduced() ? 'auto' : 'smooth', block: 'nearest' });
      };
      node.querySelectorAll('[data-o]').forEach(el => {
        el.addEventListener('click', e => { e.stopPropagation(); show(el.dataset.o); });
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(el.dataset.o); } });
      });
      const hz = hazards(id);
      node.querySelectorAll('[data-hz]').forEach(b => b.onclick = () => hz[+b.dataset.hz].act[1]());
      const p = parts(id).find(x => x.key === this.sel);
      node.querySelectorAll('#cDetail [data-a]').forEach(b => b.onclick = () => p.acts[+b.dataset.a][2]());
    }
  };
})(typeof self !== 'undefined' ? self : this);
