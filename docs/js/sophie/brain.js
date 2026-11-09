/* Sophie : comprendre une demande et choisir quoi faire.
   Ordre fixe : 1) un signe d'alarme passe avant tout ; 2) les commandes (ouvrir,
   lancer, noter) ; 3) les symptômes, vers l'orientation guidée ; 4) les questions,
   avec les fiches ; 5) la conversation. Une IA de langage, si elle est branchée,
   ne sert qu'à la conversation et à reformuler : elle ne calcule rien et ne
   choisit aucun traitement (R-RAI-09). */
(function (root) {
  'use strict';
  const A = root.AURA;
  const B = A.brain = {};
  const LIB = root.AURA_FICHES_LIB, VOCAB = root.AURA_VOCAB;
  let pats = null, kbIndex = null, listening = null;
  const norm = s => LIB.normalize(s);
  const has = (t, re) => re.test(t);

  B.init = () => {
    pats = LIB.compile(VOCAB.FACTS);
    kbIndex = LIB.buildIndex(A.kb.fiches());
  };
  B.patterns = () => pats;
  B.reindex = () => { kbIndex = LIB.buildIndex(A.kb.fiches()); };

  /* ---------------- nombres en lettres ---------------- */
  const NUM = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
  function minutesIn(t) {
    let m = t.match(/(\d+)\s*h(?:eures?)?\s*(\d+)?/);
    if (m) return +m[1] * 60 + (m[2] ? +m[2] : 0);
    m = t.match(/(\d+)\s*(?:min|minutes?|mn)/);
    if (m) return +m[1];
    if (/demi heure/.test(t)) return 30;
    if (/une heure et demie/.test(t)) return 90;
    if (/(une|1) heure/.test(t)) return 60;
    if (/trois quarts d heure/.test(t)) return 45;
    if (/quart d heure/.test(t)) return 15;
    const w = t.match(/\b(vingt|trente|quarante|cinquante|soixante|dix|quinze|douze|cinq)(?: et (un|cinq))?(?: cinq)?\s+minutes?/);
    if (w) return NUM[w[1]] + (w[2] === 'cinq' ? 5 : w[2] === 'un' ? 1 : 0);
    m = t.match(/\b(\d+)\b/);
    return m ? +m[1] : null;
  }

  /* ---------------- vocabulaire des commandes ---------------- */
  const SCENES = [
    ['earth', /\b(terre|iss|cupole|station|orbite|hublot|planete)\b/], ['ocean', /\b(ocean|mer|plage|coucher de soleil|vagues?|jetee|atlantique)\b/],
    ['lake', /\b(lac|montagnes?|foret|matin)\b/], ['desert', /\b(desert|lompoul|dunes?|etoiles|nuit etoilee|voie lactee|campement)\b/]
  ];
  const SIMS = [
    ['arret', /\b(arret cardiaque|massage cardiaque|reanimation|defibrillateur|cardiaque)\b/], ['anaphylaxie', /\b(allergie|anaphylax|adrenaline|choc allergique)\b/],
    ['fumee', /\b(fumee|incendie|feu)\b/], ['calcul', /\b(calcul|rein|renal|colique|echographie|echo)\b/]
  ];
  const VIDEO_WORDS = [
    ['sommeil', /\b(sommeil|dormir|insomnie)\b/], ['dos', /\b(dos|colonne)\b/], ['os', /\b(os|osseuse|squelette)\b/], ['yeux', /\b(yeux|vision|vue|oeil)\b/],
    ['eau', /\b(boire|hydrat|eau)\b/], ['incendie', /\b(incendie|feu|fumee)\b/], ['depress', /\b(depressuris|pression|fuite d air)\b/],
    ['ammoniac', /\b(ammoniac|toxique)\b/], ['eruption', /\b(eruption solaire|radiation|abri)\b/], ['sortie', /\b(sortie|eva|decompression|scaphandre)\b/]
  ];
  const sceneIn = t => { const s = SCENES.find(([, re]) => re.test(t)); return s ? s[0] : null; };
  const simIn = t => { const s = SIMS.find(([, re]) => re.test(t)); return s ? s[0] : null; };
  const videoIn = t => { const s = VIDEO_WORDS.find(([, re]) => re.test(t)); return s ? s[0] : null; };

  /* ---------------- conversation ---------------- */
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function smallTalk(t, ctx) {
    const nm = ctx.name, me = ctx.first;
    if (has(t, /^(bonjour|salut|coucou|hello|bonsoir|hey|yo)\b/) && t.split(' ').length <= 4) return { say: pick([A.greet(A.store.minute()) + ' ' + me + '. Je suis là. Qu\'est-ce que tu veux faire ?', 'Salut ' + me + ' ! Content de t\'entendre. Je t\'écoute.']), emotion: 'happy', chips: ['Mes mesures', 'Une pause', 'Mes défis'] };
    if (has(t, /\b(merci|super|genial|parfait|top|cool)\b/) && t.split(' ').length <= 5) return { say: pick(['Avec plaisir.', 'Toujours là pour toi.', 'Je t\'en prie, ' + me + '.']), emotion: 'happy' };
    if (has(t, /^(tu es la|t es la|tu m entends|tu m ecoutes|allo|il y a quelqu un)\b/)) return { say: 'Oui, je suis là, ' + me + '. Je t\'écoute.', emotion: 'happy' };
    if (has(t, /\b(comment (ca|tu) va|tu vas bien|ca va toi)\b/)) return { say: pick(['Très bien, merci ! Mes circuits sont au calme. Et toi, comment tu te sens ?', 'Bien, et contente de te parler. Et toi ?']), emotion: 'happy' };
    if (has(t, /\b(qui es tu|tu es qui|t es qui|presente toi|c est quoi ton nom|comment tu t appelles)\b/)) return { say: 'Je suis ' + nm + ', l\'assistante de santé du vaisseau. Je t\'aide à suivre ta santé, je t\'oriente quand ça ne va pas, et je fais le lien avec Keiko, notre médecin de bord. Tu peux aussi juste discuter avec moi.', emotion: 'happy' };
    if (has(t, /\b(blague|fais moi rire|drole)\b/)) return { say: pick(['Pourquoi les astronautes ne se disputent jamais ? Parce qu\'ils ont besoin d\'espace.', 'Sur Mars, les restaurants ont de bons plats, mais aucune atmosphère.', 'J\'ai voulu raconter une blague sur l\'apesanteur, mais elle ne retombe jamais.']), emotion: 'happy' };
    if (has(t, /\b(je m ennuie|ennui)\b/)) return { say: 'Je comprends, les journées se ressemblent ici. Une visite du désert de Lompoul sous les étoiles, ou un petit défi de sport ?', chips: ['Le désert', 'Mes défis'] };
    if (has(t, /\b(bonne nuit|je vais dormir|je vais me coucher)\b/)) return { say: 'Bonne nuit ' + me + '. Je baisse les lumières de l\'écran. Si tu veux, je te guide pour une respiration lente avant de dormir.', emotion: 'happy', chips: ['Respiration guidée'] };
    if (has(t, /\b(je t aime|tu es gentille|tu es genial|je t adore)\b/)) return { say: 'Ça me touche. Je suis là pour toi, tous les jours de la mission.', emotion: 'happy' };
    if (has(t, /\b(deuil|deces|decede|decedee|est mort|est morte)\b/)) return { say: 'Je suis vraiment désolée, ' + me + '. Prends le temps qu\'il faut. Tu veux en parler avec moi, ou que je prévienne Keiko ? Le psychologue au sol peut aussi t\'appeler.', emotion: 'concerned', chips: ['En parler', 'Appeler Keiko'] };
    if (has(t, /\b(dispute|disputes|conflit|tension|tensions|supporte plus|enerve|agace)\b/)) return { say: 'Une tension à bord, c\'est fréquent dans un espace aussi petit. Tu veux en parler, ou l\'écrire dans ton journal pour y voir plus clair ?', emotion: 'concerned', chips: ['En parler', 'Mon journal'] };
    if (has(t, /\b(stress|stresse|stressee|angoisse|angoissee|peur|inquiet|inquiete|triste|cafard|seul|seule|solitude|manque|manquent|deprime|deprimee|mal du pays)\b/)) return { say: 'Merci de me le dire. C\'est normal de ressentir ça, si loin de chez soi. Tu veux en parler un peu, l\'écrire dans ton journal, ou faire une pause au bord du lac ?', emotion: 'concerned', chips: ['En parler', 'Mon journal', 'Le lac'] };
    if (has(t, /\b(dormir|dors|dormi|sommeil|insomnie|reveille|nuit|nuits)\b/)) return { say: 'Les nuits difficiles, ça use. Tu as dormi ' + A.num(ctx.sleep, 1) + ' heures en moyenne cette semaine. Ce soir, une respiration lente avant de dormir peut aider. Tu veux qu\'on regarde ça ensemble ?', emotion: 'concerned', chips: ['Regarder ça ensemble', 'Respiration guidée'] };
    if (has(t, /\b(fatigue|fatiguee|creve|crevee|epuise|epuisee|a plat|somnolent)\b/) && !has(t, /\b(mal|douleur)\b/)) return { say: 'Je note. Tu as dormi ' + A.num(ctx.sleep, 1) + ' heures en moyenne cette semaine. Une sieste courte ou une respiration de cinq minutes peut aider. Si ça dure, on regarde ça ensemble.', emotion: 'concerned', chips: ['Regarder ça ensemble', 'Respiration guidée'] };
    return null;
  }
  // Sentiments et fatigue : on écoute d'abord, l'orientation guidée est proposée ensuite
  const SOFT = new Set(['fatigue', 'somnolence', 'insomnie', 'anxiete', 'tristesse', 'isolement', 'irritabilite', 'conflit_equipage', 'deuil']);

  /* ---------------- médicaments : à quoi ils servent, jamais de dose ---------------- */
  function drugAnswer(t) {
    const P = root.AURA_PHARMA;
    if (!P) return null;
    let hit = null;
    P.meds.forEach(m => m.syn.concat([m.name]).forEach(s => { const k = norm(s); if (k.length >= 4 && (' ' + t + ' ').includes(' ' + k + ' ') && (!hit || k.length > hit.len)) hit = { m, len: k.length }; }));
    if (!hit) return null;
    const m = hit.m;
    if (m.route === 'materiel') return { say: m.name + '. On l\'utilise pour : ' + m.use.toLowerCase() + '. Il y en a à bord : Keiko sait s\'en servir, et je guide chaque étape.', source: 'Pharmacie de bord' };
    const forme = { oral: 'en comprimé', injectable: 'en injection', cutane: 'sur la peau', oculaire: 'dans l\'œil', nasal: 'dans le nez', inhale: 'à inhaler', auriculaire: 'dans l\'oreille' }[m.route] || '';
    return {
      say: m.name + (forme ? ', ' + forme : '') + '. On l\'utilise pour : ' + m.use.charAt(0).toLowerCase() + m.use.slice(1) + '.' + (m.drowsy ? ' Ce médicament endort : pas avant une sortie ou un travail délicat.' : '') + ' Ne prends jamais un médicament seul : Keiko vérifie d\'abord tes allergies, tes autres médicaments et ton état.',
      source: 'Pharmacie de bord', emotion: 'neutral', chips: ['Je ne me sens pas bien']
    };
  }

  /* ---------------- réponses tirées des fiches ---------------- */
  // Une phrase courte pour la voix : on coupe à la fin d'une énumération (virgule ou point-virgule
  // après au moins huit mots). Sans coupure propre, la phrase reste entière : la fiche complète
  // est à un geste (« Voir la fiche »).
  function brief(s, max) {
    const w = String(s).split(/\s+/).filter(Boolean);
    if (w.length <= max) return s;
    for (let i = 7; i < Math.min(w.length - 1, max + 4); i++) {
      if (/[,;]$/.test(w[i])) return w.slice(0, i + 1).join(' ').replace(/[,;]$/, '.');
    }
    return s;
  }
  // une fiche nommée dans la question passe avant la recherche par mots (« c'est quoi le mal de l'espace ? »)
  function namedFiche(text) {
    const t = ' ' + norm(text) + ' ';
    let best = null;
    A.kb.fiches().forEach(f => [f.nom, f.titreFiche].forEach(n => {
      if (!n) return;
      const k = norm(String(n).replace(/\(.*?\)/g, ''));
      if (k.length >= 4 && t.includes(' ' + k + ' ') && (!best || k.length > best.len)) best = { f, len: k.length };
    }));
    return best ? best.f : null;
  }
  function kbAnswer(text) {
    let f = namedFiche(text);
    if (!f) {
      const res = LIB.search(kbIndex, text, 3);
      if (!res.length || res[0].score < 2.2) return null;
      f = A.kb.get(res[0].id);
    }
    if (!f) return null;
    const first = brief(LIB.sentences(f.textes.reconnaitre)[0] || '', 16);
    const bord = brief(LIB.sentences(f.textes.bord)[0] || '', 16);
    return {
      say: (f.nom + '. ' + first + (bord ? ' À bord : ' + bord.charAt(0).toLowerCase() + bord.slice(1) : '')).replace(/\s+([.,])/g, '$1'),
      source: f.id, fiche: f.id,
      chips: ['Voir la fiche', 'J\'ai ces signes'],
      action: null, kbHit: f.id
    };
  }
  function ruleAnswer(t) {
    if (/\bco2\b|\bgaz carbonique\b/.test(t)) {
      const p = A.store.state.settings.pco2;
      return { say: 'Le CO₂ de la cabine est à ' + A.num(p, 1) + ' mmHg. La limite de la NASA est de 3 mmHg en moyenne sur une heure. Au-dessus, un mal de tête, la fatigue ou un sommeil difficile sont d\'abord attribués à l\'air, et sur l\'ISS les chances de mal de tête doublent environ à chaque mmHg de plus.', source: 'R-ENV-01', emotion: p > 3 ? 'concerned' : 'neutral' };
    }
    if (/\b(delai|retard|liaison|terre repond|terre reponde|temps de reponse|minutes de la terre|parler a la terre|joindre la terre|appeler la terre|message (a|vers|pour) la terre)\b/.test(t) || (/\bterre\b/.test(t) && /\b(combien de temps|repond|reponde|reponse|joindre|message)\b/.test(t))) {
      const S = A.store, L = S.light();
      if (S.blackout()) return { say: 'La liaison avec la Terre est coupée en ce moment, à cause de la conjonction solaire. Tout est gardé à bord et partira au retour de la liaison. Les décisions se prennent ici, avec Keiko.', source: 'R-COM-02' };
      return { say: 'Un message met ' + A.num(L, 0) + ' minutes pour atteindre la Terre. Une réponse arrive au plus tôt dans ' + A.dur(2 * L + 45) + '. Pour une urgence, on agit à bord sans attendre.', source: 'R-COM-03' };
    }
    if (/\b(radiation|dose|eruption solaire)\b/.test(t)) return { say: 'Pendant le trajet vers Mars, la dose est d\'environ 1,8 millisievert par jour. Je l\'additionne chaque jour pour chacun et je préviens à 80 % d\'une limite. Pendant une éruption solaire, on rejoint l\'abri et aucune sortie évitable n\'est proposée.', source: 'R-ENV-11' };
    return null;
  }

  /* ---------------- données personnelles ---------------- */
  function personal(t, ctx) {
    const S = A.store, id = S.state.who;
    if (!id) return null;
    if (/\b(ma temperature|mon pouls|ma saturation|mes mesures|comment je vais|ma sante|mes constantes)\b/.test(t)) return { say: A.health ? A.health.summarySentence(id) : 'Voici tes mesures.', action: { type: 'go', route: 'sante' } };
    if (/\b(mon niveau|mes points|combien de points|mes ecussons|mes badges)\b/.test(t)) {
      const lv = A.gamify.level(S.member(id).xp);
      return { say: 'Tu es au niveau ' + lv.n + ', ' + lv.name + ', avec ' + A.num(S.member(id).xp) + ' points. Encore ' + A.num(lv.toNext) + ' points pour atteindre ' + (lv.next || 'le sommet') + '.', emotion: 'happy', action: { type: 'go', route: 'defis' } };
    }
    if (/\b(ma conference|quand est ma conference|prochaine conference|la conference)\b/.test(t)) {
      const c = S.confDue(id);
      return c.today ? { say: 'Ta conférence de la semaine, c\'est aujourd\'hui. Quinze minutes ensemble. On la fait maintenant ?', chips: ['Oui, on y va', 'Plus tard'] } : { say: 'Ta prochaine conférence est dans ' + A.plural(c.inDays, 'jour') + '.' };
    }
    if (/\b(quel jour|jour de mission|on est quel jour)\b/.test(t)) return { say: 'Nous sommes au jour ' + S.day() + ' de la mission, en route vers Mars.' };
    if (/\b(quelle heure|l heure qu il est|heure de bord)\b/.test(t)) return { say: 'Il est ' + A.hm(S.minute()) + ', heure de bord.' };
    return null;
  }

  /* ---------------- commandes ---------------- */
  function command(t, raw, ctx) {
    const S = A.store;
    const cmo = S.state.role === 'cmo';
    // nom et voix de Sophie
    let m = raw.match(/(?:appelle[- ]toi|je vais t'appeler|je vais t’appeler|je t'appelle|je t’appelle|ton nom (?:sera|est)|tu t'appelles|tu t’appelles)\s+(?:maintenant\s+)?([A-Za-zÀ-ÿ'-]{2,20})/i);
    if (m && !/^(comment|quoi|qui)$/i.test(m[1])) {
      const name = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      return { say: 'D\'accord ! À partir de maintenant, je m\'appelle ' + name + '.', emotion: 'happy', action: { type: 'rename', name } };
    }
    if (/\b(reprends? (ton nom|sophie)|appelle toi sophie)\b/.test(t)) return { say: 'Je redeviens Sophie.', emotion: 'happy', action: { type: 'rename', name: 'Sophie' } };
    if (/\bvoix\b/.test(t) && /\b(homme|masculin|masculine|grave|garcon)\b/.test(t)) return { say: 'Voilà, je parle maintenant avec une voix d\'homme. Tu peux me redonner une voix de femme quand tu veux.', action: { type: 'voice', gender: 'm' }, emotion: 'happy' };
    if (/\bvoix\b/.test(t) && /\b(femme|feminin|feminine|fille)\b/.test(t)) return { say: 'C\'est fait, je reprends une voix de femme.', action: { type: 'voice', gender: 'f' }, emotion: 'happy' };
    if (/\b(parle|parles) (plus )?(moins vite|lentement|doucement)\b/.test(t)) return { say: 'D\'accord, je parle plus lentement.', action: { type: 'rate', value: 0.85 } };
    if (/\b(parle|parles) (plus )?vite\b/.test(t)) return { say: 'D\'accord, je parle un peu plus vite.', action: { type: 'rate', value: 1.15 } };
    if (/^(stop|arrete|silence|tais toi|chut)\b/.test(t)) return { say: '', action: { type: 'silence' } };
    if (/\b(ne me guide plus|mode manuel|sans ton aide|je me debrouille)\b/.test(t)) return { say: 'Entendu. Je reste discrète : appuie sur moi quand tu as besoin.', action: { type: 'guided', value: false } };
    if (/\b(guide moi|guide-moi|mode guide|aide moi a naviguer)\b/.test(t)) return { say: 'Avec plaisir, je te guide.', action: { type: 'guided', value: true } };

    // sport : « j'ai fait 30 minutes de vélo »
    const sportType = /\b(velo|cevis|pedale)\b/.test(t) ? 'velo' : /\b(tapis|course|couru|courir|cours)\b/.test(t) ? 'tapis' : /\b(muscu|musculation|ared|force|halteres?)\b/.test(t) ? 'muscu' : null;
    if (sportType && /\b(j ai fait|je viens de faire|note|enregistre|ajoute|fini|termine|j ai)\b/.test(t)) {
      const min = minutesIn(t);
      if (min && min > 0 && min <= 240) return { say: 'Bravo ! ' + A.dur(min) + ' de ' + (sportType === 'velo' ? 'vélo' : sportType === 'tapis' ? 'tapis' : 'musculation') + ', c\'est noté.', emotion: 'happy', action: { type: 'sport', sport: sportType, min } };
      return { say: 'Combien de minutes as-tu fait ?', action: { type: 'go', route: 'defis', params: { log: sportType } } };
    }
    // mesures
    if (/\b(prendre|mesurer|noter|enregistrer|ajouter)\b.*\b(temperature|pouls|saturation|mesure|tension)\b/.test(t)) {
      const metric = /pouls/.test(t) ? 'hr' : /saturation/.test(t) ? 'spo2' : 'temp';
      return { say: 'D\'accord, on prend ta mesure.', action: { type: 'measure', metric } };
    }
    // simulations
    const sim = simIn(t);
    if (sim && /\b(simulation|simuler|entrainer|entraine|exercice|repeter|scenario|lance|lancer|faire)\b/.test(t)) return { say: 'C\'est parti. Je lance la simulation.', action: { type: 'sim', key: sim } };
    if (/\b(simulations?|m entrainer|entrainement|scenarios?)\b/.test(t)) return { say: 'Voici les simulations. Laquelle veux-tu répéter ?', action: { type: 'go', route: 'simulations' } };
    // évasion
    const scene = sceneIn(t);
    if (scene && /\b(emmene|amene|montre|aller|va|visite|voir|lance|pause|evasion|detendre|ouvre|voyage|partir|m evader)\b/.test(t)) return { say: 'On y va. Respire, je t\'emmène.', action: { type: 'scene', key: scene }, emotion: 'happy' };
    if (/\b(casque|realite virtuelle|vr)\b/.test(t)) return { say: 'Pour le casque, c\'est simple : ouvre l\'évasion, choisis un lieu, puis appuie sur Casque. Je te montre.', action: { type: 'go', route: 'evasion', params: { vr: 1 } } };
    if (/\b(evasion|me detendre|une pause|souffler|me relaxer|respiration guidee|respirer)\b/.test(t)) return { say: 'Bonne idée. Choisis un lieu, je m\'occupe du reste.', action: { type: 'go', route: 'evasion' } };
    // vidéos
    if (/\b(videos?|regarder|film)\b/.test(t)) {
      const v = videoIn(t);
      if (/\b(du jour|aujourd hui|dois regarder|quelle video)\b/.test(t) || !v) return { say: 'Voici ta vidéo du jour.', action: { type: 'video', which: v || 'daily' } };
      return { say: 'Je te lance la vidéo.', action: { type: 'video', which: v } };
    }
    // conférence
    if ((/\b(conference|point de la semaine|entretien|consultation|visio|visioconference)\b/.test(t) && !/\b(quand|prochaine|quel jour|dans combien)\b/.test(t)) || /^(oui on y va|on y va)$/.test(t)) {
      const written = /\b(ecrit|par ecrit|ecrire|texte|sans la voix)\b/.test(t);
      return { say: written ? 'D\'accord, on fait la conférence par écrit.' : 'On commence ta conférence de la semaine.', action: { type: 'conference', written } };
    }
    // journal
    m = raw.match(/(?:note|écris|ecris|ajoute)\s+(?:dans|à)\s+mon journal\s*(?:que|:)?\s*(.+)/i);
    if (m && m[1].length > 3) return { say: 'C\'est noté dans ton journal. Il reste entre toi et moi.', action: { type: 'journal', text: m[1] }, emotion: 'happy' };
    if (/\b(journal|carnet|raconter ma journee|ecrire ma journee)\b/.test(t)) return { say: 'Ton journal est ouvert. Tu peux me dicter ou écrire, c\'est privé.', action: { type: 'go', route: 'journal' } };
    // défis
    if (/\b(defis?|gamification|recompenses?|tour de la terre|objectif d equipage|ma serie)\b/.test(t)) return { say: 'Voici tes défis.', action: { type: 'go', route: 'defis' } };
    if (/\b(sport|seance|exercice physique)\b/.test(t)) return { say: 'Voici ton activité du jour.', action: { type: 'go', route: 'defis' } };
    // santé
    if (/\b(sante|mesures?|constantes|signes vitaux)\b/.test(t)) return { say: 'Voici ta santé.', action: { type: 'go', route: 'sante' } };
    if (/\b(je ne me sens pas bien|je me sens mal|je suis malade|pas en forme|j ai un probleme|bobo)\b/.test(t)) return { say: 'Je suis là. Dis-moi ce qui ne va pas.', action: { type: 'triage', text: '' }, emotion: 'concerned' };
    // médecin de bord
    if (/\b(pharmacie|stocks?|medicaments a bord|monte carlo)\b/.test(t)) return { say: cmo ? 'Voici la pharmacie.' : 'La pharmacie est suivie par Keiko. Si tu as besoin d\'un médicament, dis-moi ce qui ne va pas.', action: cmo ? { type: 'go', route: 'cmo/pharmacie' } : null };
    if (/\b(fiches?|base de connaissances?)\b/.test(t) && cmo) return { say: 'Voici les fiches.', action: { type: 'go', route: 'cmo/fiches' } };
    if (/\b(equipage|tout le monde|l equipe)\b/.test(t) && cmo) return { say: 'Voici l\'équipage.', action: { type: 'go', route: 'cmo' } };
    if (/\b(a valider|validations?|propositions?)\b/.test(t) && cmo) return { say: 'Voici ce qui attend ta décision.', action: { type: 'go', route: 'cmo/valider' } };
    // navigation simple
    if (/\b(accueil|menu|retour|maison)\b/.test(t)) return { say: '', action: { type: 'go', route: 'accueil' } };
    if (/\b(reglages|parametres|options)\b/.test(t)) return { say: 'Voici les réglages.', action: { type: 'go', route: 'reglages' } };
    if (/\b(appelle|previens|contacte)\b.*\b(keiko|medecin|docteur)\b/.test(t)) return { say: 'Je préviens Keiko tout de suite.', action: { type: 'call-cmo' }, emotion: 'concerned' };
    return null;
  }

  /* ---------------- point d'entrée ---------------- */
  B.handle = async (raw, opts) => {
    opts = opts || {};
    const S = A.store;
    const id = S.state.who;
    const t = norm(raw);
    const prof = id ? S.profile(id) : null;
    const member = id ? S.member(id) : null;
    const ctx = {
      name: S.sophieName(id), first: prof ? A.first(prof.name) : '',
      sleep: member ? member.measures.sleep.slice(-7).reduce((a, x) => a + x.v, 0) / Math.max(1, member.measures.sleep.slice(-7).length) : 6
    };
    if (!t) return { say: 'Je t\'écoute.' };

    // 1. signes d'alarme, dans toutes les saisies (R-URG) ; l'écran d'urgence parle lui-même
    const found = LIB.findFacts(raw, pats);
    const urg = (VOCAB.URGENCES || []).filter(u => u.facts.some(c => found.facts.some(f => f.code === c && !f.neg)));
    if (urg.length && !found.info) { listening = null; return { say: 'Je m\'en occupe tout de suite. Keiko est prévenue.', emotion: 'concerned', action: { type: 'emergency', urg: urg[0], text: raw } }; }

    // l'astronaute se confie (après « En parler ») : on écoute, sans orienter ni conseiller
    if (listening && Date.now() - listening.t < 10 * 60000 && !/^(stop|arrete|merci|non|c est tout|rien|ca va)\b/.test(t)) {
      const c0 = command(t, raw, ctx);
      if (c0) { listening = null; return c0; }
      const said = (listening.text ? listening.text + ' ' : '') + raw;
      listening = { t: Date.now(), text: said };
      return { say: listenReply(raw) + ' Tu veux que je le garde dans ton journal ?', emotion: 'concerned', chips: ['Garde-le dans mon journal', 'Non merci'], keep: said };
    }
    listening = null;
    if (/^(je veux en parler|en parler|on peut parler|j ai besoin de parler|parlons)\b/.test(t)) {
      listening = { t: Date.now(), text: '' };
      return { say: 'Je t\'écoute. Prends ton temps, ce que tu me dis reste entre nous.', emotion: 'concerned' };
    }

    // 2. commandes
    const c = command(t, raw, ctx);
    if (c) return c;

    // 3. données personnelles
    const p = personal(t, ctx);
    if (p) return p;

    // 4. symptômes vécus : orientation guidée (les sentiments et la fatigue seuls : on écoute d'abord)
    const symptoms = found.facts.filter(f => !f.neg && VOCAB.FACTS[f.code] && VOCAB.FACTS[f.code].zone !== 'expo' && !VOCAB.FACTS[f.code].lieu);
    const asks = /\b(c est quoi|qu est ce|pourquoi|comment|explique|definition|est ce que c est grave|ca sert a quoi|est ce dangereux|c est dangereux|est dangereux)\b/.test(t);
    if (symptoms.length && !found.info && !asks) {
      const soft = symptoms.every(f => SOFT.has(f.code));
      const st0 = soft ? smallTalk(t, ctx) : null;
      if (st0) return Object.assign(st0, { triageText: raw });
      return { say: 'Je comprends. On va regarder ça ensemble, quelques questions rapides.', emotion: 'concerned', action: { type: 'triage', text: raw } };
    }

    // 5. questions : règles, médicaments, puis fiches
    const r = ruleAnswer(t);
    if (r) return r;
    const d = drugAnswer(t);
    if (d) return d;
    if (asks || found.info || symptoms.length) {
      const k = kbAnswer(raw);
      if (k) return k;
    }
    // 6. conversation
    const st = smallTalk(t, ctx);
    if (st) return st;
    if (A.llm && A.llm.ready()) {
      try {
        const res = await A.llm.chat(raw, { kb: LIB.search(kbIndex, raw, 3).map(x => A.kb.get(x.id)), mode: opts.mode || 'conversation' });
        if (res) return res;
      } catch (e) { console.warn('IA indisponible', e); }
    }
    // une fiche citée par son nom, même sans question claire ; jamais une fiche devinée au hasard
    const named = namedFiche(raw);
    if (named) return kbAnswer(raw);
    return { say: 'Je n\'ai pas bien compris. Tu peux me dire par exemple « j\'ai mal à la tête », « emmène-moi au lac » ou « lance la simulation d\'arrêt cardiaque ».', chips: ['Je ne me sens pas bien', 'Une pause au lac', 'Mes défis'] };
  };

  B.endListening = () => { listening = null; };
  // Écoute : une phrase qui reflète ce qui est dit, sans conseil ni question de plus
  function listenReply(text) {
    const t = norm(text);
    if (/\b(nuit|nuits|dormi|dors|reveille|sommeil|insomnie)\b/.test(t)) return 'Ces nuits courtes pèsent, je comprends.';
    if (/\b(terre|famille|enfant|enfants|maman|papa|mari|femme|manque|manquent|maison|proches)\b/.test(t)) return 'Ils sont loin, et ils comptent les jours avec toi.';
    if (/\b(dispute|tension|tensions|enerve|agace|conflit|supporte)\b/.test(t)) return 'Une tension dans un espace aussi petit, c\'est lourd à porter.';
    if (/\b(triste|cafard|pleure|pleurer|deprime|vide)\b/.test(t)) return 'Merci de me confier ça. Je suis là avec toi.';
    if (/\b(stress|stresse|peur|angoisse|inquiet|inquiete|panique)\b/.test(t)) return 'C\'est beaucoup à porter. On avance pas à pas.';
    if (/\b(travail|charge|planning|taches|fatigue|epuise)\b/.test(t)) return 'Beaucoup de choses à la fois, je comprends que ça fatigue.';
    return 'Je t\'entends. Merci de me le dire.';
  }

  /* Réponse courte et chaleureuse à une page de journal (sans conseil médical) */
  B.journalReply = (text, mood) => {
    const t = norm(text);
    if (/\b(nuit|dormi|reveille|sommeil|insomnie)\b/.test(t)) return 'Ces nuits courtes pèsent. Ce soir, on peut essayer la respiration lente avant de dormir. Et si ça dure, on en parle à ta conférence.';
    if (/\b(terre|famille|enfant|maman|papa|mari|femme|manque|maison)\b/.test(t)) return 'Ils sont loin, mais ils comptent les jours avec toi. Tu veux préparer un message pour eux, ou regarder la Terre depuis la cupole un moment ?';
    if (/\b(dispute|tension|enerve|agace|conflit)\b/.test(t)) return 'Merci de l\'avoir posé ici. Une tension à bord, c\'est fréquent dans un espace aussi petit. Une pause, puis une discussion au calme, ça aide souvent.';
    if (mood && mood >= 4) return 'Belle journée, ça fait plaisir à lire. Garde ce moment en tête pour les jours plus gris.';
    if (mood && mood <= 2) return 'Merci de me le confier. Les jours difficiles font partie du voyage. Je suis là si tu veux en parler.';
    return 'C\'est noté, en sécurité. Merci de partager ta journée avec moi.';
  };
})(typeof self !== 'undefined' ? self : this);
