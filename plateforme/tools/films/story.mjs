// Films AURA : texte lu (anglais), sous-titres (français) et découpage image par image.
//
// Chaque film est une suite de plans. Un plan contient :
//   say : les phrases lues, [anglais, français] ; la voix anglaise est générée par tts.py
//   ch  : titre du chapitre qui commence à ce plan (facultatif)
//   tr  : transition d'entrée (slide, fade, zoom, circle, cut) ; slide par défaut
//   cam : [zoom de départ, zoom d'arrivée] (lent travelling avant par défaut)
//   L   : les calques, du fond vers l'avant (voir engine/*.mjs)
// Les temps (at, out) se comptent depuis le début de la voix du plan : un nombre (secondes),
// 's1' (début de la phrase 1), 'e1' (fin), 's1@0.5' (milieu de la phrase 1), 'end', avec +x ou -x.
// Les nombres lus sont écrits en toutes lettres quand la synthèse vocale pourrait hésiter.

export const SOURCES = {
  csaMuscles: { t: "Agence spatiale canadienne : que deviennent les muscles dans l'espace ?", u: 'https://asc-csa.gc.ca/eng/astronauts/space-medicine/muscles.asp' },
  nasaBone: { t: 'NASA : risque de modification osseuse en vol (Human Research Program)', u: 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/' },
  nasaCardio: { t: 'NASA : santé cardiovasculaire et vision (déplacement des liquides, SANS)', u: 'https://www.nasa.gov/directorates/esdmd/hhp/cardiovascular-and-vision' },
  barger: { t: 'Barger L. et al. (2014), The Lancet Neurology : le sommeil des astronautes', u: 'https://www.eurekalert.org/news-releases/595450' },
  kerstman: { t: 'Kerstman E. et al. (2012), Aviat Space Environ Med : douleur du dos en apesanteur', u: 'https://asma.kglmeridian.com/view/journals/asem/83/1/article-p2.xml' },
  smsCU: { t: "Université du Colorado (2024) : le mal de l'espace", u: 'https://www.colorado.edu/today/2024/02/27/space-travel-comes-motion-sickness-these-engineers-want-help' },
  stones: { t: 'Whitson P. et al., NASA : risque de calcul rénal en vol', u: 'https://ntrs.nasa.gov/citations/20000020539' },
  water98: { t: "NASA (2023) : 98 % de l'eau récupérée à bord de l'ISS", u: 'https://www.space.com/astronaut-pee-iss-water-recycling-98-percent-milestone' },
  hazards: { t: 'NASA : les cinq dangers du vol habité', u: 'https://www.nasa.gov/hrp/hazards/' },
  thoolen: { t: 'Thoolen S. et al. (2025), npj Microgravity : réalité virtuelle et nature à la station Amundsen-Scott (pôle Sud)', u: 'https://doi.org/10.1038/s41526-025-00471-2' },
  mirFire: { t: "Incendie de Mir, 24 février 1997 (Windows to the Universe, d'après la NASA)", u: 'https://ftp.windows2universe.org/headline_universe/shuttle_news/mir_fire.html' },
  tobias: { t: "Tobias B. et McMillan C. (2023), SpaceOps : la réponse aux urgences à bord de l'ISS", u: 'https://ntrs.nasa.gov/citations/20220019247' },
  soyuz: { t: 'Spaceflight Now (30 août 2018) : la fuite du Soyouz MS-09', u: 'https://spaceflightnow.com/2018/08/30/cosmonauts-plug-small-air-leak-on-the-international-space-station/' },
  ammonia: { t: "Phys.org (14 janvier 2015) : alarme ammoniac à bord de l'ISS", u: 'https://phys.org/news/2015-01-space-station-crew-safe-ammonia.html' },
  sep: { t: 'NASA : protéger les astronautes des radiations près de la Lune', u: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon' },
  dcs: { t: 'NASA OCHMO-TB-037 : maladie de décompression', u: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-037-decompression-sickness.pdf' },
  hink: { t: 'Hinkelbein J. et al. (2020) : réanimation en apesanteur (DGLRM, ESAM)', u: 'https://doi.org/10.1186/s13049-020-00793-y' },
  sleepNeed: { t: "American Academy of Sleep Medicine : sept heures ou plus par nuit pour l'adulte", u: 'https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/' },
  fiches: { t: 'Base de connaissances AURA : fiches de conduite à tenir', u: '' }
};

// raccourcis pour les calques les plus courants
const mod = (light = 'day', variant = 'lab', o = {}) => Object.assign({ k: 'module', light, variant }, o);
const act = (who, pose, x, y, h, o = {}) => Object.assign({ k: 'actor', who, pose, x, y, h }, o);

export const STORY = {
  // ======================================================================================
  arrivee: {
    cat: 'prevention', fiche: 'F-APE-01', title: 'Les premiers jours en apesanteur',
    short: "Tête qui tourne, visage gonflé : ce que vit le corps en arrivant, et comment passer le cap.",
    sources: ['smsCU', 'nasaCardio', 'fiches'],
    thumb: { text: 'Tout tourne ?', who: 'lucas', pose: 'dizzy', tone: 'blue', fx: 'stars', bg: 'module' },
    shots: [
      { ch: 'Début', say: [["Your first days in weightlessness.", "Tes premiers jours en apesanteur."],
        ["Here's what your body goes through, and how to get past it.", "Ce que ton corps traverse, et comment passer le cap."]],
        L: [{ k: 'orbit', iss: true }, act('lucas', 'float', 0.74, 0.5, 0.5, { in: 'right', rot: -0.2, spin: 0.05, face: { mouth: 'grin' } }), { k: 'title' }] },
      { ch: "Le mal de l'espace", say: [["Day one. Lucas has just arrived, and the whole room seems to spin.", "Premier jour. Lucas vient d'arriver, et toute la pièce semble tourner."]],
        L: [mod('day', 'node', { roll: 0.07 }), act('lucas', 'dizzy', 0.5, 0.56, 0.6, { in: 'left', fx: ['stars'] }), { k: 'stamp', text: 'Jour 1', at: 0 }] },
      { tr: 'zoom', say: [["His inner ear can't find up or down anymore, but his eyes still see a floor and a ceiling.", "Son oreille interne ne trouve plus ni haut ni bas, mais ses yeux voient encore un sol et un plafond."],
        ["The two signals don't match, and his brain gets confused.", "Les deux messages ne collent pas, et son cerveau s'embrouille."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'senses', who: 'lucas' }] },
      { say: [["That's space motion sickness. Most newcomers feel it, and it usually fades within two to three days.", "C'est le mal de l'espace. La plupart des nouveaux venus le ressentent, et en général ça passe en deux ou trois jours."]],
        L: [mod('day', 'node'), act('lucas', 'nausea', 0.3, 0.56, 0.58, { poses: [['s0@0.85', 'float']] }), { k: 'd', d: 'days', n: 3, x: 0.68, y: 0.42, at: 's0@0.45' }] },
      { ch: 'Le visage qui gonfle', tr: 'circle', say: [["At the same time, about two liters of fluid shift from your legs up toward your head.", "En même temps, environ deux litres de liquide remontent des jambes vers la tête."]],
        L: [{ k: 'flat', tone: 'teal' }, { k: 'd', d: 'fluid', x: 0.5, y: 0.5 }] },
      { say: [["Your face gets puffy, your nose feels blocked, and your legs get thinner.", "Ton visage gonfle, ton nez se bouche et tes jambes s'affinent."],
        ["Astronauts call it puffy face, bird legs. It's normal.", "Les astronautes appellent ça « tête bouffie, jambes de poulet ». C'est normal."]],
        L: [mod('day', 'node'), act('lucas', 'front', 0.42, 0.55, 0.64, { puffy: 's0', thin: 's0@0.75', face: { blush: 1 } }),
          { k: 'tag', text: 'Visage gonflé', x: 0.62, y: 0.17, to: 'head', at: 's0@0.1' },
          { k: 'tag', text: 'Nez bouché', x: 0.66, y: 0.31, to: 'nose', at: 's0@0.45' },
          { k: 'tag', text: 'Jambes plus fines', x: 0.64, y: 0.66, to: 'legs', at: 's0@0.75' },
          { k: 'note', text: "C'est normal", icon: 'check', at: 's1@0.7', tone: 'ok' }] },
      { ch: 'Ce qui aide', say: [["What helps: move your head slowly, keep the same up as your crewmates, eat light, and drink in small sips.", "Ce qui aide : bouge la tête doucement, garde le même « haut » que tes équipiers, mange léger et bois par petites gorgées."]],
        L: [mod('day', 'galley'), act('lucas', 'drink', 0.25, 0.55, 0.56, { item: 'pouch' }),
          { k: 'chips', x: 0.53, y: 0.2, items: [['head', 'Tête doucement'], ['up', 'Le même « haut »'], ['food', 'Repas légers'], ['drop', 'Petites gorgées']], at: ['s0@0.12', 's0@0.36', 's0@0.62', 's0@0.82'] }] },
      { say: [["There's also medicine for it in the medical kit.", "Il existe aussi un médicament dans la trousse médicale."],
        ["If you keep vomiting, or can't keep water down, tell Keiko right away.", "Si tu vomis sans arrêt ou si tu ne gardes pas l'eau, préviens Keiko tout de suite."]],
        L: [mod('day', 'lab'), act('lucas', 'nausea', 0.3, 0.57, 0.56), act('keiko', 'talk', 0.68, 0.56, 0.58, { in: 'right', item: 'medkit', flip: false }),
          { k: 'warn', text: "Tu vomis sans arrêt ? Préviens Keiko", at: 's1' }] },
      { tr: 'fade', say: [["Within a few days, your body adapts, and floating starts to feel like home.", "En quelques jours, ton corps s'adapte, et flotter devient naturel."]],
        L: [{ k: 'cupola' }, act('lucas', 'float', 0.5, 0.52, 0.48, { spin: 0.45, face: { eye: 'happy', mouth: 'grin' }, fx: ['sparkle'] })] }
    ]
  },
  // ======================================================================================
  dos: {
    cat: 'prevention', fiche: 'F-APE-03', title: 'Le dos en apesanteur',
    short: 'Pourquoi le bas du dos fait mal les premières semaines, et le geste qui soulage.',
    sources: ['kerstman', 'nasaBone', 'fiches'],
    thumb: { text: 'Mal au dos ?', who: 'rafael', pose: 'backpain', tone: 'orange', fx: 'pain', bg: 'module' },
    shots: [
      { ch: 'Début', say: [["Why your back hurts in space, and the simple move that eases it.", "Pourquoi le dos fait mal dans l'espace, et le geste simple qui soulage."]],
        L: [mod('night', 'quarters'), act('rafael', 'backpain', 0.74, 0.56, 0.58, { in: 'right', fx: ['pain@lowback'] }), { k: 'title' }] },
      { say: [["In his first week on board, Rafael wakes up with a sore lower back.", "Pendant sa première semaine à bord, Rafael se réveille avec le bas du dos douloureux."]],
        L: [mod('night', 'quarters', { lights: 's0@0.35' }), act('rafael', 'sleep', 0.5, 0.52, 0.6, { item: 'sleepbag', faceAt: ['s0@0.5', { eye: 'squint', mouth: 'grit', brow: 1 }], fx: [['zzz', -9, 's0@0.45'], ['pain@lowback', 's0@0.55']] })] },
      { tr: 'zoom', say: [["He's not alone. About half of all astronauts feel this in their first days.", "Il n'est pas seul : environ la moitié des astronautes le ressentent les premiers jours."]],
        L: [{ k: 'flat', tone: 'orange' }, { k: 'd', d: 'people', n: 10, on: 5, x: 0.5, y: 0.42, at: 's0@0.3' }, { k: 'stat', big: '1 sur 2', small: 'astronautes', x: 0.5, y: 0.74, at: 's0@0.5' }] },
      { ch: 'Pourquoi', say: [["Without gravity pressing down, the discs between your vertebrae soak up fluid and swell.", "Sans la gravité qui les tasse, les disques entre tes vertèbres se gorgent de liquide et gonflent."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'spine', x: 0.5, y: 0.47 }] },
      { say: [["Your spine stretches, and you can grow up to five centimeters taller.", "Ta colonne s'allonge, et tu peux grandir jusqu'à cinq centimètres."],
        ["The muscles and ligaments around it complain.", "Les muscles et les ligaments autour protestent."]],
        L: [mod('day', 'node'), { k: 'd', d: 'ruler', x: 0.62, y: 0.5, at: 's0@0.3' }, act('rafael', 'front', 0.4, 0.56, 0.6, { grow: 's0@0.3', hlAt: ['s1', { lowback: 1 }], poses: [['s1', 'rub']], fx: [['pain@lowback', 's1@0.3']] })] },
      { ch: 'Le geste qui soulage', say: [["The move many astronauts use: pull your knees to your chest, and hold for thirty seconds.", "Le geste de beaucoup d'astronautes : ramène tes genoux contre ta poitrine et tiens trente secondes."],
        ["Breathe slowly.", "Respire lentement."]],
        L: [mod('day', 'node'), act('rafael', 'tuckhold', 0.42, 0.55, 0.62, { hl: { lowback: 1 } }), { k: 'd', d: 'timer', secs: 30, x: 0.77, y: 0.38, at: 's0@0.6' }] },
      { say: [["Sleep with your knees slightly bent, and keep up your daily exercise, especially on the resistance machine.", "Dors les genoux un peu pliés, et garde ton sport chaque jour, surtout sur la machine de musculation."]],
        L: [mod('day', 'gym'), { k: 'ex', ex: 'deadlift', who: 'rafael', x: 0.33, y: 0.53, w: 0.42, h: 0.74, hl: { lowback: 1, glutes: 1, hams: 1 } },
          { k: 'chips', x: 0.62, y: 0.28, items: [['bed', 'Genoux pliés la nuit'], ['dumbbell', 'Du sport chaque jour']], at: ['s0@0.1', 's0@0.5'] }] },
      { ch: 'Quand prévenir', tr: 'fade', say: [["If the pain shoots down a leg, or you feel numbness or weakness, tell Keiko.", "Si la douleur descend dans une jambe, ou si tu sens un engourdissement ou une faiblesse, préviens Keiko."]],
        L: [{ k: 'flat', tone: 'red' }, { k: 'd', d: 'body', x: 0.32, y: 0.57, view: 'back', zap: 'leg', at: 's0@0.1' }, { k: 'warn', text: 'Douleur dans la jambe, engourdissement : préviens Keiko', at: 's0@0.55', x: 0.6 }] },
      { tr: 'fade', say: [["Most of the time, the pain fades as your body adapts.", "La plupart du temps, la douleur passe à mesure que ton corps s'adapte."],
        ["Back on Earth, go easy on heavy lifting at first, while your spine readjusts.", "De retour sur Terre, vas-y doucement avec les charges lourdes au début, le temps que ta colonne se réadapte."]],
        L: [{ k: 'cupola' }, act('rafael', 'stretchfloat', 0.5, 0.52, 0.5, { face: { eye: 'happy', mouth: 'smile' }, fx: ['sparkle'] })] }
    ]
  },
  // ======================================================================================
  os: {
    cat: 'prevention', fiche: 'F-APE-14', title: 'Protéger tes os',
    short: "Les os perdent un à un et demi pour cent de leur densité par mois. Le sport et l'assiette font la différence.",
    sources: ['nasaBone', 'stones', 'fiches'],
    thumb: { text: 'Des os fragiles ?', who: 'aminata', pose: 'worry', tone: 'teal', bg: 'flat', d: 'bone' },
    shots: [
      { ch: 'Début', say: [["Protect your bones.", "Protège tes os."], ["In orbit, they quietly lose strength, unless you fight back.", "En orbite, ils perdent leur solidité sans bruit, sauf si tu ripostes."]],
        L: [{ k: 'flat', tone: 'teal' }, act('aminata', 'float', 0.74, 0.52, 0.56, { in: 'right' }), { k: 'title' }] },
      { ch: 'Ce qui se passe', say: [["Bone is living tissue: it's rebuilt all the time, and it adapts to the load it carries.", "L'os est un tissu vivant : il se renouvelle sans cesse, et s'adapte à la charge qu'il porte."],
        ["On Earth, every step you take loads your bones, and that's what keeps them strong.", "Sur Terre, chaque pas charge tes os, et c'est ce qui les garde solides."]],
        L: [{ k: 'earth' }, act('aminata', 'walk', 0.45, 0.6, 0.56, { walk: 0.05 }), { k: 'd', d: 'weight', x: 0.45, y: 0.6, h: 0.56, at: 's0@0.35' }] },
      { say: [["In orbit, your bones no longer carry your weight.", "En orbite, tes os ne portent plus ton poids."],
        ["They lose one to one and a half percent of their density, every month.", "Ils perdent un à un et demi pour cent de leur densité, chaque mois."]],
        L: [{ k: 'flat', tone: 'teal' }, act('aminata', 'float', 0.24, 0.55, 0.48, { out: 's1' }), { k: 'd', d: 'bone', x: 0.34, y: 0.48, s: 0.95, at: 's1-0.3' }, { k: 'stat', big: '-1 à 1,5 %', small: 'de densité par mois', x: 0.72, y: 0.48, at: 's1@0.5' }] },
      { say: [["Hips and spine lose the most. Over a six-month mission, it adds up.", "Les hanches et la colonne perdent le plus. Sur une mission de six mois, ça s'additionne."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'skeleton', x: 0.36, y: 0.5 }, { k: 'd', d: 'months', n: 6, x: 0.7, y: 0.5, at: 's0@0.55' }] },
      { say: [["The lost calcium ends up in your urine, which also raises the risk of kidney stones.", "Le calcium perdu finit dans les urines, ce qui augmente aussi le risque de calculs rénaux."]],
        L: [{ k: 'flat', tone: 'teal' }, { k: 'd', d: 'calcium', x: 0.5, y: 0.48 }] },
      { ch: 'Le sport', tr: 'circle', say: [["Your best defense is heavy lifting on the resistance machine.", "Ta meilleure défense : soulever lourd sur la machine de musculation."],
        ["Squats and deadlifts load exactly the bones that need it.", "Squats et soulevés de terre chargent justement les os qui en ont besoin."]],
        L: [mod('day', 'gym'), { k: 'ex', ex: 'squat', who: 'aminata', x: 0.32, y: 0.53, w: 0.4, h: 0.74, hl: { glutes: 1, quads: 1 }, swap: ['s1', 'deadlift', { glutes: 1, hams: 1, lowback: 1 }] },
          { k: 'tag', text: 'Hanches et colonne chargées', x: 0.64, y: 0.3, at: 's1@0.4' }] },
      { ch: "L'assiette", say: [["Eat your full meals, take your vitamin D, and go easy on salt.", "Mange tes repas en entier, prends ta vitamine D et limite le sel."]],
        L: [mod('day', 'galley'), act('aminata', 'eat', 0.27, 0.55, 0.56, { item: 'tray' }),
          { k: 'chips', x: 0.55, y: 0.24, items: [['food', 'Des repas complets'], ['sun', 'La vitamine D'], ['salt', 'Moins de sel']], at: ['s0@0.08', 's0@0.45', 's0@0.78'] }] },
      { tr: 'fade', say: [["Bone you keep in space is bone you won't have to rebuild on Earth.", "L'os que tu gardes dans l'espace, tu n'auras pas à le reconstruire sur Terre."]],
        L: [{ k: 'cupola' }, act('aminata', 'thumbs', 0.5, 0.54, 0.52, { fx: ['sparkle'] })] }
    ]
  },
  // ======================================================================================
  muscles: {
    cat: 'prevention', fiche: 'F-APE-15', title: 'Garder ses muscles',
    short: "Jusqu'à vingt pour cent de muscle en moins en deux semaines sans sport. Environ deux heures par jour pour l'éviter.",
    sources: ['csaMuscles', 'nasaBone', 'fiches'],
    thumb: { text: '-20 % de muscle', who: 'lucas', ex: 'squat', tone: 'blue', hl: { quads: 1, glutes: 1 }, bg: 'module' },
    shots: [
      { ch: 'Début', say: [["Keep your muscles.", "Garde tes muscles."], ["Here's what weightlessness does to them, and how the crew fights back.", "Ce que l'apesanteur leur fait, et comment l'équipage résiste."]],
        L: [mod('day', 'gym'), { k: 'ex', ex: 'squat', who: 'lucas', x: 0.72, y: 0.53, w: 0.38, h: 0.72, hl: { quads: 1, glutes: 1 } }, { k: 'title' }] },
      { ch: 'Ce qui fond', say: [["In weightlessness, your legs and back barely have to work.", "En apesanteur, tes jambes et ton dos n'ont presque plus rien à faire."],
        ["Even holding yourself up takes no effort.", "Même te tenir droit ne demande aucun effort."],
        ["And muscle you don't use, your body stops maintaining.", "Et un muscle qui ne sert pas, le corps arrête de l'entretenir."]],
        L: [mod('day', 'node'), act('lucas', 'lazy', 0.5, 0.52, 0.56, { spin: 0.08, item: 'tablet' })] },
      { tr: 'zoom', say: [["Without exercise, you could lose up to twenty percent of your muscle mass in about two weeks.", "Sans sport, tu pourrais perdre jusqu'à vingt pour cent de ta masse musculaire, en deux semaines environ."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'muscle', x: 0.27, y: 0.5 }, { k: 'stat', big: "jusqu'à -20 %", small: 'en deux semaines environ', x: 0.66, y: 0.48, at: 's0@0.5' }] },
      { say: [["Calves, thighs, and the deep back muscles go first: the ones that hold you up on Earth.", "Les mollets, les cuisses et les muscles profonds du dos partent en premier : ceux qui te tiennent debout sur Terre."]],
        L: [{ k: 'flat', tone: 'violet' }, { k: 'd', d: 'body', view: 'back', x: 0.5, y: 0.5, seq: [['calves', 's0@0.02'], ['hams', 's0@0.14'], ['quads', 's0@0.14'], ['lowback', 's0@0.32']] },
          { k: 'tag', text: 'Mollets', x: 0.7, y: 0.74, to: [0.52, 0.72], at: 's0@0.02' }, { k: 'tag', text: 'Cuisses', x: 0.7, y: 0.58, to: [0.53, 0.58], at: 's0@0.14' }, { k: 'tag', text: 'Dos profond', x: 0.7, y: 0.38, to: [0.52, 0.4], at: 's0@0.32' }] },
      { ch: "L'entraînement", say: [["That's why the crew trains about two hours a day.", "C'est pour ça que l'équipage s'entraîne environ deux heures par jour."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'clock', hours: 2, x: 0.38, y: 0.48, at: 's0@0.2' }, { k: 'stat', big: '2 h', small: 'de sport par jour', x: 0.68, y: 0.48, at: 's0@0.55' }] },
      { say: [["On the treadmill, a harness pulls you down, so you can run.", "Sur le tapis, un harnais te tire vers le bas, pour que tu puisses courir."]],
        L: [mod('day', 'gym'), { k: 'ex', ex: 'run', who: 'lucas', x: 0.38, y: 0.53, w: 0.46, h: 0.76, hl: { quads: 0.8, calves: 1 } }, { k: 'tag', text: 'Le harnais', x: 0.68, y: 0.3, to: [0.42, 0.34], at: 's0@0.25' }] },
      { say: [["The bike works your heart and lungs. And the resistance machine builds strength.", "Le vélo fait travailler le cœur et le souffle. Et la machine de musculation entretient la force."]],
        L: [mod('day', 'gym'), { k: 'ex', ex: 'bike', who: 'rafael', x: 0.3, y: 0.53, w: 0.36, h: 0.7, hl: { quads: 1 } }, { k: 'ex', ex: 'squat', who: 'aminata', x: 0.7, y: 0.53, w: 0.36, h: 0.7, hl: { quads: 1, glutes: 1 }, at: 's0@0.62', in: 'pop' },
          { k: 'tag', text: 'Cœur et souffle', x: 0.3, y: 0.12, at: 's0@0.2' }, { k: 'tag', text: 'Force', x: 0.7, y: 0.12, at: 's0@0.75' }] },
      { ch: "Suivre, et savoir s'arrêter", say: [["Log every session in AURA, so you and Keiko can follow your progress.", "Note chaque séance dans AURA, pour que Keiko et toi suiviez tes progrès."],
        ["Sharp pain, or a swollen calf? Stop, and tell Keiko.", "Douleur vive ou mollet gonflé ? Arrête-toi et préviens Keiko."]],
        L: [{ k: 'flat', tone: 'violet' }, { k: 'd', d: 'phone', screen: 'sport', x: 0.5, y: 0.58, s: 0.82 }, { k: 'warn', text: 'Douleur vive, mollet gonflé : stop, préviens Keiko', at: 's1' }] },
      { tr: 'fade', say: [["Strong legs today mean walking off the ship on your own.", "Des jambes fortes aujourd'hui, c'est descendre du vaisseau sur tes deux pieds."]],
        L: [{ k: 'earth', dusk: true }, act('lucas', 'walk', 0.5, 0.6, 0.56, { walk: 0.04, poses: [['end-0.6', 'cheer']] })] }
    ]
  },
  // ======================================================================================
  yeux: {
    cat: 'prevention', fiche: 'F-APE-06', title: "Tes yeux et l'apesanteur",
    short: "Sept astronautes sur dix en mission longue ont des changements au fond de l'œil. Le signe à surveiller : la vision de près.",
    sources: ['nasaCardio', 'fiches'],
    thumb: { text: 'Tout est flou ?', who: 'aminata', pose: 'squintRead', item: 'tablet', tone: 'violet', bg: 'module' },
    shots: [
      { ch: 'Début', say: [["Your eyes in weightlessness.", "Tes yeux en apesanteur."], ["A change that's easy to miss, and worth catching early.", "Un changement facile à manquer, qu'il vaut mieux repérer tôt."]],
        L: [{ k: 'flat', tone: 'violet' }, { k: 'd', d: 'eyeIcon', x: 0.74, y: 0.48 }, { k: 'title' }] },
      { say: [["After a few weeks on board, Aminata notices something odd: her checklist looks blurry up close.", "Après quelques semaines à bord, Aminata remarque quelque chose : sa liste de contrôle est floue de près."],
        ["At first, she blames the screen.", "Au début, elle accuse l'écran."]],
        L: [mod('day', 'lab'), act('aminata', 'squintRead', 0.36, 0.56, 0.6, { item: 'tablet' }), { k: 'd', d: 'blurCard', x: 0.72, y: 0.36, at: 's0@0.55' }] },
      { ch: 'Pourquoi', tr: 'zoom', say: [["Remember the fluid that moves up toward the head? It also presses on the back of the eye.", "Tu te souviens du liquide qui remonte vers la tête ? Il appuie aussi sur l'arrière de l'œil."]],
        L: [{ k: 'flat', tone: 'teal' }, { k: 'd', d: 'headFluid', x: 0.32, y: 0.5 }, { k: 'd', d: 'eye', x: 0.7, y: 0.48, at: 's0@0.45', stage: 1 }] },
      { say: [["The back of the eyeball flattens slightly, and the optic nerve can swell.", "L'arrière du globe de l'œil s'aplatit un peu, et le nerf optique peut gonfler."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'eye', x: 0.5, y: 0.45, stage: 2, s: 1.35 }, { k: 'tag', text: 'SANS : syndrome neuro-oculaire du vol spatial', x: 0.5, y: 0.84, at: 's0@0.6', center: true }] },
      { say: [["About seven in ten astronauts on long missions show changes like these.", "Environ sept astronautes sur dix en mission longue ont ce type de changements."]],
        L: [{ k: 'flat', tone: 'violet' }, { k: 'd', d: 'people', n: 10, on: 7, x: 0.5, y: 0.42, at: 's0@0.2' }, { k: 'stat', big: '7 sur 10', small: 'en mission longue', x: 0.5, y: 0.74, at: 's0@0.45' }] },
      { ch: 'Les contrôles', say: [["That's why your eyes are checked regularly on board, with eye scans and vision tests.", "C'est pour ça que tes yeux sont contrôlés régulièrement à bord, avec des examens et des tests de vision."],
        ["Keiko compares each result with the ones taken before the flight.", "Keiko compare chaque résultat avec ceux d'avant le vol."]],
        L: [mod('day', 'lab'), act('aminata', 'front', 0.36, 0.56, 0.58, { face: { look: 0.8 } }), act('keiko', 'exam', 0.64, 0.56, 0.58, { flip: true, item: 'scope', in: 'right' })] },
      { ch: 'Quand prévenir', say: [["If your near vision changes, don't wait: tell Keiko.", "Si ta vision de près change, n'attends pas : préviens Keiko."],
        ["Adjustable glasses are on board.", "Il y a des lunettes réglables à bord."]],
        L: [mod('day', 'lab'), act('aminata', 'read', 0.32, 0.56, 0.6, { item: 'tablet', glasses: 's1', face: { mouth: 'smile' } }), { k: 'warn', text: "Vision de près qui change : préviens Keiko", at: 0, out: 's1' }, { k: 'note', text: 'Lunettes réglables à bord', icon: 'glasses', at: 's1+0.35', tone: 'ok' }] },
      { tr: 'fade', say: [["Caught early, these changes can be followed closely.", "Repérés tôt, ces changements peuvent être suivis de près."]],
        L: [{ k: 'cupola' }, act('aminata', 'look', 0.5, 0.55, 0.52, { glasses: -9, face: { mouth: 'smile' } })] }
    ]
  },
  // ======================================================================================
  eau: {
    cat: 'prevention', fiche: 'F-DIG-12', title: 'Boire assez',
    short: "Moins de soif, plus de calcium dans les urines : le risque de calcul rénal monte dès l'arrivée. Environ deux litres et demi par jour.",
    sources: ['stones', 'water98', 'fiches'],
    thumb: { text: 'Bois plus !', who: 'rafael', pose: 'drink', item: 'pouch', tone: 'teal', bg: 'module' },
    shots: [
      { ch: 'Début', say: [["Drink enough.", "Bois assez."], ["It sounds simple, but in orbit, it protects your kidneys.", "Ça paraît simple, mais en orbite, ça protège tes reins."]],
        L: [{ k: 'flat', tone: 'teal' }, act('rafael', 'drink', 0.74, 0.54, 0.56, { item: 'pouch', in: 'right' }), { k: 'title' }] },
      { say: [["In space, you feel less thirsty.", "Dans l'espace, on a moins soif."], ["And on a busy day, it's easy to forget to drink.", "Et une journée chargée fait vite oublier de boire."],
        ["Rafael has been working for hours, and his water pouch hasn't moved.", "Rafael travaille depuis des heures, et sa poche d'eau n'a pas bougé."]],
        L: [mod('day', 'lab'), act('rafael', 'type', 0.42, 0.56, 0.6, { item: 'laptop' }), { k: 'd', d: 'pouchFloat', x: 0.74, y: 0.42 }, { k: 'd', d: 'dayclock', x: 0.82, y: 0.17, at: 's1' }] },
      { ch: 'Le risque', say: [["Meanwhile, calcium from your bones passes through your kidneys.", "Pendant ce temps, le calcium de tes os passe par tes reins."]],
        L: [{ k: 'flat', tone: 'teal' }, { k: 'd', d: 'calcium', x: 0.5, y: 0.48 }] },
      { say: [["With too little water, it can form crystals, then a kidney stone.", "Avec trop peu d'eau, il peut former des cristaux, puis un calcul rénal."], ["And a stone in orbit is a real problem.", "Et un calcul en orbite, c'est un vrai problème."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'kidney', x: 0.5, y: 0.46 }] },
      { ch: 'Combien boire', tr: 'circle', say: [["Aim for about two and a half liters a day, spread from morning to evening.", "Vise environ deux litres et demi par jour, répartis du matin au soir."]],
        L: [{ k: 'flat', tone: 'teal' }, { k: 'd', d: 'pouches', x: 0.5, y: 0.46 }, { k: 'stat', big: '2,5 L', small: 'par jour, environ', x: 0.5, y: 0.8, at: 's0@0.35' }] },
      { say: [["Don't worry about the supply: the station recycles ninety-eight percent of its water.", "Pas d'inquiétude pour la réserve : la station recycle quatre-vingt-dix-huit pour cent de son eau."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'ring', pct: 98, label: "de l'eau recyclée", x: 0.5, y: 0.46, at: 's0@0.25' }] },
      { say: [["A simple check: pale urine means you're drinking enough.", "Un repère simple : des urines claires, c'est que tu bois assez."], ["Darker means drink more.", "Plus foncées, bois davantage."]],
        L: [{ k: 'flat', tone: 'violet' }, { k: 'd', d: 'urine', x: 0.5, y: 0.48 }] },
      { ch: 'Quand prévenir', say: [["Sudden, severe pain in your side or back? Tell Keiko immediately.", "Une douleur soudaine et violente sur le côté ou dans le dos ? Préviens Keiko tout de suite."]],
        L: [mod('day', 'lab'), act('rafael', 'side', 0.36, 0.56, 0.6, { fx: [['pain@side', 's0@0.1']] }), { k: 'warn', text: 'Douleur soudaine au côté : préviens Keiko', at: 's0@0.45' }] },
      { tr: 'fade', say: [["Keep your water pouch within reach, and sip all day long.", "Garde ta poche d'eau à portée de main, et bois un peu toute la journée."]],
        L: [mod('day', 'galley'), act('rafael', 'drink', 0.42, 0.55, 0.58, { item: 'pouch', poses: [['end-0.9', 'thumbs']] }), { k: 'd', d: 'drops', x: 0.68, y: 0.3 }] }
    ]
  },
  // ======================================================================================
  sommeil: {
    cat: 'prevention', fiche: 'F-PSY-05', title: 'Bien dormir à bord',
    short: 'Seize levers de soleil par jour et le bruit des ventilateurs : en moyenne six heures de sommeil. Comment faire mieux.',
    sources: ['barger', 'sleepNeed', 'fiches'],
    thumb: { text: 'Nuits trop courtes', who: 'lucas', pose: 'sleep', item: 'sleepbag', tone: 'night', fx: 'zzz', bg: 'module' },
    shots: [
      { ch: 'Début', say: [["Sleeping well on board: why it's hard, and what really helps.", "Bien dormir à bord : pourquoi c'est difficile, et ce qui aide vraiment."]],
        L: [mod('night', 'quarters'), act('lucas', 'sleep', 0.75, 0.5, 0.58, { item: 'sleepbag', fx: ['zzz'] }), { k: 'title' }] },
      { ch: "Pourquoi c'est dur", tr: 'zoom', say: [["The station circles the Earth about every ninety minutes.", "La station fait le tour de la Terre en quatre-vingt-dix minutes environ."], ["That's sixteen sunrises a day.", "Ça fait seize levers de soleil par jour."]],
        L: [{ k: 'space' }, { k: 'd', d: 'orbit16', x: 0.5, y: 0.5 }] },
      { say: [["Add the hum of the fans and the excitement of the mission, and nights get short.", "Ajoute le bruit des ventilateurs et l'excitation de la mission, et les nuits raccourcissent."],
        ["Lucas lies awake, his mind still racing.", "Lucas reste éveillé, la tête encore pleine de sa journée."]],
        L: [mod('night', 'quarters'), act('lucas', 'sleep', 0.48, 0.5, 0.6, { item: 'sleepbag', face: { eye: 'wide', mouth: 'neutral', blink: true } }), { k: 'd', d: 'fan', x: 0.78, y: 0.3 }] },
      { say: [["Studies found astronauts sleep about six hours a night on average, less than the seven or more that adults need.", "Les études montrent que les astronautes dorment environ six heures par nuit en moyenne, moins que les sept heures ou plus dont un adulte a besoin."]],
        L: [{ k: 'flat', tone: 'night' }, { k: 'd', d: 'bars', x: 0.5, y: 0.5, items: [['En orbite, en moyenne', 6, 'coral', '6 h'], ["Besoin d'un adulte", 7.5, 'ok', '7 h ou plus']], max: 9, at: 's0@0.2' }] },
      { ch: 'Ce qui aide', say: [["Protect your sleep. Dim the lights an hour before bed, and use the eye mask and earplugs.", "Protège ton sommeil : baisse la lumière une heure avant, et utilise le masque et les bouchons d'oreilles."]],
        L: [mod('day', 'quarters', { dim: ['s0@0.15', 's0@0.45'] }), act('lucas', 'sleep', 0.48, 0.5, 0.6, { item: 'sleepbag', eyemask: 's0@0.7', face: { eye: 'closed', mouth: 'smile' } }),
          { k: 'chips', x: 0.66, y: 0.2, items: [['moon', 'Lumière douce'], ['mask', 'Masque'], ['ear', 'Bouchons']], at: ['s0@0.18', 's0@0.68', 's0@0.86'], col: true }] },
      { say: [["Keep the same bedtime every day, and skip coffee in the afternoon.", "Couche-toi à la même heure chaque jour, et évite le café l'après-midi."]],
        L: [{ k: 'flat', tone: 'violet' }, { k: 'd', d: 'bedclock', x: 0.34, y: 0.47, at: 's0@0.05' }, { k: 'd', d: 'nocoffee', x: 0.68, y: 0.47, at: 's0@0.6' }] },
      { say: [["Log your nights in AURA, in ten seconds each morning, so a bad streak gets noticed early.", "Note tes nuits dans AURA, en dix secondes chaque matin, pour repérer tôt une mauvaise série."]],
        L: [{ k: 'flat', tone: 'night' }, { k: 'd', d: 'phone', screen: 'sleep', x: 0.5, y: 0.47 }] },
      { ch: 'Les somnifères', say: [["And never take a sleeping pill without asking Keiko first.", "Et ne prends jamais de somnifère sans en parler d'abord à Keiko."]],
        L: [mod('day', 'lab'), act('keiko', 'talk', 0.62, 0.56, 0.58, { in: 'right' }), { k: 'd', d: 'pill', x: 0.3, y: 0.42 }, { k: 'warn', text: "Un somnifère ? D'abord, demande à Keiko", at: 's0@0.35' }] },
      { tr: 'fade', say: [["A rested crew is a safer crew: fewer mistakes, and a better mood.", "Un équipage reposé, c'est un équipage plus sûr : moins d'erreurs, et une meilleure humeur."]],
        L: [mod('night', 'quarters'), act('lucas', 'sleep', 0.5, 0.5, 0.6, { item: 'sleepbag', eyemask: -9, fx: ['zzz'] })] }
    ]
  },
  // ======================================================================================
  moral: {
    cat: 'prevention', fiche: 'F-PSY-06', title: 'Le moral en mission longue',
    short: 'Isolement, confinement, messages qui mettent vingt minutes : ce qui use le moral, et ce qui le protège.',
    sources: ['hazards', 'thoolen', 'fiches'],
    thumb: { text: 'Loin de chez soi', who: 'aminata', pose: 'look', tone: 'violet', bg: 'cupola' },
    shots: [
      { ch: 'Début', say: [["Staying well, far from home.", "Garder le moral, loin de chez soi."], ["What wears you down, and what keeps you going.", "Ce qui use, et ce qui aide à tenir."]],
        L: [{ k: 'cupola' }, act('aminata', 'look', 0.72, 0.56, 0.52), { k: 'title' }] },
      { ch: 'Ce qui use', say: [["Months in a small space, with the same faces, far from family and friends.", "Des mois dans un petit espace, avec les mêmes visages, loin de la famille et des amis."],
        ["Small irritations can grow.", "Les petits agacements peuvent grandir."]],
        cam: [1, 1.16], L: [mod('day', 'node', { tight: true }), act('rafael', 'float', 0.2, 0.55, 0.5, { flip: false }), act('keiko', 'read', 0.4, 0.6, 0.5, { item: 'tablet' }), act('lucas', 'type', 0.62, 0.55, 0.5, { item: 'laptop' }), act('aminata', 'look', 0.82, 0.55, 0.5, { flip: true, face: { mouth: 'neutral' } })] },
      { tr: 'zoom', say: [["On the way to Mars, a message home can take up to twenty minutes to arrive.", "En route vers Mars, un message peut mettre jusqu'à vingt minutes pour arriver."],
        ["No quick phone call to cheer you up.", "Pas de petit coup de fil pour se remonter le moral."]],
        L: [{ k: 'space' }, { k: 'd', d: 'mars', x: 0.5, y: 0.5 }] },
      { ch: 'Ce qui protège', say: [["What helps is simple: a steady routine, good sleep, exercise, and real time together.", "Ce qui aide est simple : une routine régulière, du sommeil, du sport et de vrais moments ensemble."]],
        L: [mod('day', 'galley'), act('rafael', 'talk', 0.28, 0.56, 0.56), act('keiko', 'laugh', 0.5, 0.58, 0.54), { k: 'chips', x: 0.66, y: 0.18, items: [['calendar', 'Une routine'], ['moon', 'Du sommeil'], ['dumbbell', 'Du sport'], ['people', 'Des moments ensemble']], at: ['s0@0.3', 's0@0.48', 's0@0.62', 's0@0.8'], col: true }] },
      { say: [["Record messages for your family, and stay in touch as often as you can.", "Enregistre des messages pour ta famille, et garde le contact aussi souvent que possible."]],
        L: [mod('day', 'quarters'), act('aminata', 'talk', 0.4, 0.56, 0.6, { face: { eye: 'happy' } }), { k: 'd', d: 'camera', x: 0.72, y: 0.4 }, { k: 'd', d: 'hearts', x: 0.72, y: 0.3, at: 's0@0.4' }] },
      { say: [["Short breaks in nature scenes help too.", "De courtes pauses dans des paysages de nature aident aussi."], ["At the South Pole, winter crews ask for exactly that.", "Au pôle Sud, les équipes d'hivernage demandent justement ça."]],
        L: [{ k: 'flat', tone: 'teal' }, { k: 'd', d: 'nature', x: 0.5, y: 0.45 }, { k: 'stamp', text: 'Pôle Sud, station Amundsen-Scott', at: 's1' }] },
      { ch: 'En parler', say: [["If you feel low for more than a few days, talk to Keiko.", "Si tu te sens au plus bas plusieurs jours de suite, parles-en à Keiko."], ["It's part of the mission, not a weakness.", "Ça fait partie de la mission, ce n'est pas une faiblesse."]],
        L: [mod('night', 'quarters', { lamp: true }), act('rafael', 'sad', 0.36, 0.57, 0.56, { poses: [['s1', 'front']], face: { brow: 1 } }), act('keiko', 'talk', 0.64, 0.56, 0.56, { at: 's0@0.4', in: 'right' }), { k: 'note', text: 'Plusieurs jours au plus bas : parles-en à Keiko', icon: 'chat', at: 's0@0.7', tone: 'violet' }] },
      { tr: 'fade', say: [["Looking after your mind is looking after the crew.", "Prendre soin de ta tête, c'est prendre soin de l'équipage."]],
        L: [{ k: 'cupola' }, act('rafael', 'float', 0.3, 0.55, 0.46), act('aminata', 'wave', 0.5, 0.52, 0.48), act('keiko', 'floatFront', 0.7, 0.56, 0.46)] }
    ]
  },
  // ======================================================================================
  incendie: {
    cat: 'securite', fiche: 'F-EXP-06', title: 'Feu à bord : alerter, se regrouper, agir',
    short: "En 1997, un générateur d'oxygène a pris feu sur Mir. Les trois réflexes qui en sont sortis.",
    sources: ['mirFire', 'tobias', 'fiches'],
    thumb: { text: 'Feu à bord !', who: 'rafael', pose: 'aim', item: 'extinguisher', tone: 'red', fx: 'fire', bg: 'module', light: 'smoke' },
    shots: [
      { ch: 'Début', say: [["Fire on board.", "Feu à bord."], ["Three reflexes that can save the crew.", "Trois réflexes qui peuvent sauver l'équipage."]],
        L: [mod('alarm', 'lab'), { k: 'd', d: 'fire', x: 0.76, y: 0.55, s: 1.1 }, { k: 'title' }] },
      { ch: 'Mir, 1997', say: [["February nineteen ninety-seven. On the Mir space station, an oxygen generator catches fire.", "Février 1997. À bord de la station Mir, un générateur d'oxygène prend feu."]],
        L: [mod('day', 'ru', { smoke: 's0@0.5' }), { k: 'd', d: 'fire', x: 0.6, y: 0.62, at: 's0@0.55', s: 0.9 }, { k: 'stamp', text: 'Station Mir, février 1997', at: 0 }] },
      { say: [["Smoke fills the module in seconds.", "La fumée envahit le module en quelques secondes."], ["Without gravity, it doesn't rise: the fans spread it everywhere.", "Sans gravité, elle ne monte pas : la ventilation la répand partout."],
        ["The crew puts on masks, and fights the fire for several minutes.", "L'équipage met les masques et combat le feu pendant plusieurs minutes."]],
        L: [mod('smoke', 'ru'), { k: 'd', d: 'fire', x: 0.78, y: 0.62, s: 0.8 }, act('lucas', 'mask', 0.28, 0.56, 0.54, { item: 'o2mask', at: 's1' , in: 'left'}), act('rafael', 'aim', 0.52, 0.56, 0.56, { item: 'extinguisher', spray: 's1@0.4', at: 's1@0.2', in: 'left' })] },
      { ch: 'Les trois réflexes', tr: 'zoom', say: [["Everyone survived, and the lessons became three reflexes.", "Tout le monde s'en est sorti, et les leçons sont devenues trois réflexes."],
        ["Today, every crew trains for them.", "Aujourd'hui, chaque équipage s'y entraîne."]],
        L: [{ k: 'flat', tone: 'red' }, { k: 'steps', items: ['Alerter', 'Se regrouper', 'Agir'], icons: ['alarm', 'people', 'fire'], big: true, at: 's0@0.45' }] },
      { say: [["One: alert. Press the fire alarm, and warn everyone.", "Un : alerter. Appuie sur l'alarme incendie et préviens tout le monde."],
        ["Even if you're not sure: alert first.", "Même si tu n'es pas sûr : alerte d'abord."]],
        L: [mod('alarm', 'lab', { alarmAt: 's0@0.3' }), act('lucas', 'press', 0.44, 0.56, 0.6, { item: 'alarmpanel' }), { k: 'steps', items: ['Alerter', 'Se regrouper', 'Agir'], icons: ['alarm', 'people', 'fire'], cur: 0 }] },
      { say: [["Two: gather. Put on your mask, and join the crew at the safe spot.", "Deux : se regrouper. Mets ton masque et rejoins l'équipage au point de ralliement."]],
        L: [mod('smoke', 'node'), act('lucas', 'glide', 0.2, 0.5, 0.46, { item: 'o2mask', move: [[0, 0.1, 0.5], ['end', 0.42, 0.52]] }), act('aminata', 'mask', 0.62, 0.56, 0.52, { item: 'o2mask' }), act('keiko', 'mask', 0.8, 0.57, 0.52, { item: 'o2mask', flip: true }),
          { k: 'steps', items: ['Alerter', 'Se regrouper', 'Agir'], icons: ['alarm', 'people', 'fire'], cur: 1 }] },
      { say: [["Three: act. Cut the power to the smoking rack, then use the extinguisher through its fire port.", "Trois : agir. Coupe le courant du rack qui fume, puis utilise l'extincteur par son port incendie."]],
        L: [mod('smoke', 'lab', { port: true }), act('rafael', 'aim', 0.42, 0.56, 0.6, { item: 'extinguisher', spray: 's0@0.62', at: 's0@0.45', in: 'left' }), act('rafael', 'press', 0.42, 0.56, 0.6, { out: 's0@0.45' }),
          { k: 'steps', items: ['Alerter', 'Se regrouper', 'Agir'], icons: ['alarm', 'people', 'fire'], cur: 2 }, { k: 'tag', text: 'Courant coupé', x: 0.75, y: 0.24, at: 's0@0.2' }, { k: 'tag', text: 'Port incendie', x: 0.7, y: 0.33, to: [0.805, 0.49], at: 's0@0.6' }] },
      { ch: "S'entraîner", say: [["Alert, gather, act. Practice it in the fire simulation, until it becomes automatic.", "Alerter, se regrouper, agir. Entraîne-toi dans la simulation incendie, jusqu'à ce que ça devienne automatique."]],
        L: [{ k: 'flat', tone: 'red' }, { k: 'steps', items: ['Alerter', 'Se regrouper', 'Agir'], icons: ['alarm', 'people', 'fire'], big: true, done: ['s0@0.05', 's0@0.18', 's0@0.3'] }, { k: 'note', text: 'Simulation incendie dans AURA', icon: 'play', at: 's0@0.55', tone: 'gold', y: 0.8 }] }
    ]
  },
  // ======================================================================================
  depress: {
    cat: 'securite', fiche: null, title: "Fuite d'air : le temps qui reste",
    short: 'En 2018, un trou de deux millimètres dans un Soyouz. Le temps de réserve, et comment on cherche la fuite.',
    sources: ['soyuz', 'tobias', 'fiches'],
    thumb: { text: "Fuite d'air", who: 'keiko', pose: 'worry', tone: 'red', bg: 'flat', d: 'gauge' },
    shots: [
      { ch: 'Début', say: [["Air leak: the time you have, and how to use it.", "Fuite d'air : le temps qui reste, et comment l'utiliser."]],
        L: [{ k: 'flat', tone: 'red' }, { k: 'd', d: 'gauge', x: 0.74, y: 0.48, drop: [0, 4] }, { k: 'title' }] },
      { ch: 'Soyouz, 2018', say: [["August twenty eighteen. On the station, the pressure starts to drop, very slowly.", "Août 2018. À bord de la station, la pression commence à baisser, très lentement."],
        ["Ground teams notice it first, while the crew sleeps.", "Les équipes au sol le remarquent en premier, pendant que l'équipage dort."]],
        L: [mod('night', 'node'), act('lucas', 'sleep', 0.3, 0.52, 0.5, { item: 'sleepbag' }), { k: 'd', d: 'gauge', x: 0.7, y: 0.44, drop: ['s0@0.4', 'end+1'], s: 0.8 }, { k: 'stamp', text: 'ISS, août 2018', at: 0 }] },
      { tr: 'zoom', say: [["The cause: a hole just two millimeters wide, in a Soyuz spacecraft docked to the station.", "La cause : un trou de deux millimètres seulement, dans un vaisseau Soyouz amarré à la station."]],
        L: [{ k: 'outside', focus: 'soyuz', zoomAt: 's0@0.45' }, { k: 'tag', text: 'Un trou de 2 mm', x: 0.7, y: 0.28, at: 's0@0.55' }] },
      { ch: 'Le temps de réserve', say: [["The leak was slow, so the crew had time.", "La fuite était lente : l'équipage avait du temps."], ["The key number is the reserve time: how long until the air becomes unsafe.", "Le chiffre clé, c'est le temps de réserve : le temps avant que l'air devienne dangereux."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'gauge', x: 0.32, y: 0.47, drop: [0, 'end'] }, { k: 'd', d: 'hourglass', x: 0.7, y: 0.42, at: 's1' }, { k: 'tag', text: 'Temps de réserve', x: 0.7, y: 0.76, at: 's1@0.4', center: true }] },
      { ch: 'Trouver la fuite', say: [["First, gather the crew.", "D'abord, rassemble l'équipage."], ["Then close the hatches, module by module, to find where the air escapes.", "Puis ferme les écoutilles, module par module, pour trouver d'où l'air s'échappe."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'hatches', x: 0.5, y: 0.47, gather: 0, close: ['s1@0.1', 's1@0.95'], leak: 4 }] },
      { say: [["In twenty eighteen, the crew found the hole, and sealed it with gauze and epoxy.", "En 2018, l'équipage a trouvé le trou et l'a bouché avec de la gaze et de la résine."]],
        L: [mod('day', 'ru'), act('rafael', 'press', 0.44, 0.56, 0.6, { item: 'patch' }), { k: 'tag', text: 'Gaze et résine', x: 0.74, y: 0.3, to: [0.6, 0.38], at: 's0@0.55' }] },
      { say: [["Stay calm and follow the numbers: a small leak usually leaves hours, not seconds.", "Reste calme et suis les chiffres : une petite fuite laisse en général des heures, pas des secondes."],
        ["Close each hatch calmly, then check the pressure again.", "Ferme chaque écoutille calmement, puis vérifie de nouveau la pression."]],
        L: [mod('day', 'node'), act('keiko', 'read', 0.34, 0.56, 0.56, { item: 'tablet' }), act('lucas', 'thumbs', 0.62, 0.56, 0.56, { at: 's0@0.5', in: 'pop' }), { k: 'note', text: 'Des heures, pas des secondes', icon: 'clock', at: 's0@0.55', tone: 'ok' }] },
      { tr: 'fade', say: [["Practice it in the depressurization simulation.", "Entraîne-toi dans la simulation de dépressurisation."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'simcard', x: 0.5, y: 0.45, label: 'Dépressurisation', icon: 'gauge' }] }
    ]
  },
  // ======================================================================================
  ammoniac: {
    cat: 'securite', fiche: 'F-EXP-10', title: "Fuite d'ammoniac",
    short: "Le refroidissement de la station utilise de l'ammoniac, toxique. En 2015, une alarme a fait évacuer le segment américain.",
    sources: ['ammonia', 'tobias', 'fiches'],
    thumb: { text: 'Alerte ammoniac', who: 'rafael', pose: 'mask', item: 'o2mask', tone: 'red', bg: 'module', light: 'alarm' },
    shots: [
      { ch: 'Début', say: [["Ammonia leak.", "Fuite d'ammoniac."], ["What to do when the alarm sounds.", "Que faire quand l'alarme sonne."]],
        L: [mod('alarm', 'node'), act('rafael', 'mask', 0.75, 0.56, 0.56, { item: 'o2mask' }), { k: 'title' }] },
      { say: [["Outside the station, pipes full of ammonia carry the heat away.", "À l'extérieur de la station, des tuyaux remplis d'ammoniac évacuent la chaleur."], ["It works great, but ammonia is toxic to breathe.", "Ça marche très bien, mais l'ammoniac est toxique à respirer."]],
        L: [{ k: 'outside', focus: 'radiators', flow: true }, { k: 'tag', text: 'Ammoniac : toxique à respirer', x: 0.5, y: 0.8, at: 's1@0.4', center: true, tone: 'signal' }] },
      { ch: "L'alerte de 2015", say: [["In January twenty fifteen, an alarm sent the whole crew out of the American segment.", "En janvier 2015, une alarme a fait évacuer tout l'équipage du segment américain."],
        ["Within minutes, everyone was in the Russian segment, with the hatch closed.", "En quelques minutes, tout le monde était dans le segment russe, écoutille fermée."]],
        L: [mod('alarm', 'node'), act('lucas', 'glide', 0.3, 0.5, 0.42, { move: [[0, 0.05, 0.48], ['end', 0.85, 0.5]], item: 'o2mask' }), act('aminata', 'glide', 0.1, 0.56, 0.42, { move: [['s0@0.2', -0.15, 0.56], ['end', 0.65, 0.56]], item: 'o2mask' }), { k: 'stamp', text: 'ISS, janvier 2015', at: 0 }] },
      { say: [["It turned out to be a false alarm, and the procedure worked perfectly.", "C'était une fausse alerte, et la procédure a parfaitement fonctionné."]],
        L: [mod('day', 'ru'), act('lucas', 'thumbs', 0.38, 0.56, 0.56), act('aminata', 'cheer', 0.62, 0.57, 0.54), { k: 'note', text: 'Fausse alerte, bons réflexes', icon: 'check', at: 's0@0.45', tone: 'ok' }] },
      { ch: 'Les bons gestes', say: [["If the ammonia alarm sounds, put on your mask right away.", "Si l'alarme ammoniac sonne, mets ton masque tout de suite."], ["Don't wait to smell it: trust the alarm.", "N'attends pas de le sentir : fais confiance à l'alarme."]],
        L: [mod('alarm', 'lab'), act('rafael', 'mask', 0.42, 0.56, 0.6, { item: 'o2mask', maskAt: 's0@0.5' }), { k: 'chips', x: 0.66, y: 0.26, items: [['mask2', 'Masque, tout de suite'], ['alarm', "L'alarme d'abord"]], at: ['s0@0.5', 's1@0.5'], col: true }] },
      { say: [["Move to the safe segment, and close the hatch behind you.", "Rejoins le segment sûr, et ferme l'écoutille derrière toi."],
        ["Every crew member knows where the safe segment is.", "Chaque membre de l'équipage sait où se trouve le segment sûr."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'hatches', x: 0.5, y: 0.47, segments: true, close: ['s0@0.6', 's0@0.8'] }] },
      { say: [["Burning eyes or throat? Rinse with plenty of water, and tell Keiko.", "Les yeux ou la gorge qui brûlent ? Rince à grande eau et préviens Keiko."]],
        L: [mod('day', 'ru'), act('rafael', 'rub', 0.38, 0.56, 0.6), { k: 'warn', text: 'Yeux ou gorge qui brûlent : rince, préviens Keiko', at: 's0@0.4' }] },
      { tr: 'fade', say: [["Mask first, questions later.", "Le masque d'abord, les questions ensuite."]],
        L: [mod('alarm', 'node'), act('lucas', 'mask', 0.3, 0.57, 0.52, { item: 'o2mask' }), act('aminata', 'mask', 0.7, 0.57, 0.52, { item: 'o2mask', flip: true }), { k: 'big', text: "Le masque d'abord", at: 0.2 }] }
    ]
  },
  // ======================================================================================
  eruption: {
    cat: 'securite', fiche: 'F-EXP-16', title: "Éruption solaire : rejoindre l'abri",
    short: "Certaines éruptions envoient des protons qui arrivent en moins d'une heure. Comment l'équipage est prévenu et où il s'abrite.",
    sources: ['sep', 'hazards', 'fiches'],
    thumb: { text: 'Tempête solaire', who: 'keiko', pose: 'worry', tone: 'gold', bg: 'sun' },
    shots: [
      { ch: 'Début', say: [["Solar storm.", "Tempête solaire."], ["When the Sun flares up, here's where to go.", "Quand le Soleil s'emballe, voici où aller."]],
        L: [{ k: 'space' }, { k: 'd', d: 'sun', x: 0.8, y: 0.5, s: 1, calm: false }, { k: 'title' }] },
      { ch: 'Le danger', say: [["Sometimes, the Sun erupts, and throws out a burst of high-energy protons.", "Parfois, le Soleil entre en éruption, et projette une bouffée de protons très énergétiques."]],
        L: [{ k: 'space' }, { k: 'd', d: 'sun', x: 0.3, y: 0.5, s: 1.2, flare: 's0@0.25' }] },
      { say: [["The fastest can reach you in less than an hour, and they go right through the walls.", "Les plus rapides peuvent t'atteindre en moins d'une heure, et ils traversent les parois."],
        ["Far from Earth's magnetic field, on the way to the Moon or Mars, the risk is even higher.", "Loin du champ magnétique terrestre, en route vers la Lune ou Mars, le risque est encore plus fort."]],
        L: [{ k: 'outside', focus: 'station', particles: true }, { k: 'stat', big: "moins d'1 h", small: 'pour arriver', x: 0.76, y: 0.2, at: 's0@0.3' }] },
      { say: [["Space weather forecasters watch the Sun around the clock, and send the alert.", "Les prévisionnistes de la météo spatiale surveillent le Soleil jour et nuit, et donnent l'alerte."]],
        L: [{ k: 'space' }, { k: 'd', d: 'forecast', x: 0.5, y: 0.5 }] },
      { ch: "L'abri", say: [["When it comes, the crew moves to the most shielded spot, surrounded by water and supplies.", "Quand elle arrive, l'équipage rejoint l'endroit le plus protégé, entouré d'eau et de réserves."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'shelter', x: 0.5, y: 0.48, build: [0, 'end'] }] },
      { say: [["The more mass around you, the fewer particles get through.", "Plus il y a de matière autour de toi, moins les particules passent."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'shelter', x: 0.5, y: 0.48, build: [-9, -9], particles: true }] },
      { say: [["You may stay there for hours. Wear your dosimeter, and wait for the all clear.", "Tu peux y rester plusieurs heures. Garde ton dosimètre et attends la fin de l'alerte."]],
        L: [mod('night', 'quarters', { bags: true }), act('keiko', 'read', 0.34, 0.56, 0.54, { item: 'tablet', badge: true }), act('lucas', 'float', 0.62, 0.55, 0.52, { badge: true, flip: true }), { k: 'tag', text: 'Dosimètre', x: 0.8, y: 0.26, to: 'badge:1', at: 's0@0.5' }] },
      { tr: 'fade', say: [["A few hours in the shelter can spare you a large dose.", "Quelques heures à l'abri peuvent t'éviter une forte dose."]],
        L: [{ k: 'cupola' }, act('keiko', 'wave', 0.4, 0.52, 0.48), act('lucas', 'thumbs', 0.6, 0.53, 0.48)] }
    ]
  },
  // ======================================================================================
  sortie: {
    cat: 'securite', fiche: 'F-EXP-05', title: 'Après une sortie : la décompression',
    short: "Pourquoi on respire de l'oxygène pur avant de sortir, et les signes à surveiller dans les heures qui suivent.",
    sources: ['dcs', 'fiches'],
    thumb: { text: "Bulles d'azote", who: 'lucas', pose: 'glide', suit: true, tone: 'blue', bg: 'outside' },
    shots: [
      { ch: 'Début', say: [["After a spacewalk, the danger isn't over.", "Après une sortie, le danger n'est pas terminé."], ["Here's what to watch for.", "Voici ce qu'il faut surveiller."]],
        L: [{ k: 'outside', focus: 'eva' }, act('lucas', 'glide', 0.72, 0.45, 0.5, { suit: true, rot: -0.5 }), { k: 'title' }] },
      { ch: "Les bulles d'azote", say: [["To stay flexible, the spacesuit runs at a much lower pressure than the cabin.", "Pour rester souple, le scaphandre fonctionne à une pression bien plus basse que la cabine."],
        ["About a third of it.", "Environ un tiers."]],
        L: [{ k: 'flat', tone: 'blue' }, { k: 'd', d: 'pressure', x: 0.5, y: 0.5 }] },
      { say: [["Like a diver coming up too fast, the nitrogen dissolved in your blood can form bubbles.", "Comme un plongeur qui remonte trop vite, l'azote dissous dans ton sang peut former des bulles."]],
        L: [{ k: 'flat', tone: 'teal' }, { k: 'd', d: 'bubbles', x: 0.5, y: 0.47, grow: ['s0@0.45', 'end'] }] },
      { say: [["That's decompression sickness.", "C'est la maladie de décompression."], ["To prevent it, you breathe pure oxygen before going out: it flushes the nitrogen away.", "Pour l'éviter, tu respires de l'oxygène pur avant de sortir : il chasse l'azote."],
        ["This preparation can take a few hours.", "Cette préparation peut prendre plusieurs heures."]],
        L: [mod('day', 'node'), act('lucas', 'float', 0.3, 0.55, 0.54, { item: 'o2mask', at: 's1' }), { k: 'd', d: 'bubbles', x: 0.68, y: 0.44, s: 0.6, flush: ['s1@0.5', 'end'] }, { k: 'tag', text: 'Oxygène pur', x: 0.3, y: 0.14, at: 's1@0.2' }] },
      { ch: 'Les signes', say: [["Even so, watch your body in the hours after.", "Malgré ça, surveille ton corps dans les heures qui suivent."]],
        L: [mod('day', 'node'), act('lucas', 'float', 0.44, 0.55, 0.56, { face: { eye: 'open', mouth: 'neutral' } }), { k: 'd', d: 'dayclock', x: 0.75, y: 0.32, fast: true }] },
      { say: [["Joint pain, itchy skin, tingling, or unusual tiredness are warning signs.", "Douleur aux articulations, peau qui démange, fourmillements ou fatigue inhabituelle : ce sont des signes d'alerte."],
        ["They can appear several hours later.", "Ils peuvent apparaître plusieurs heures après."]],
        L: [{ k: 'flat', tone: 'red' }, { k: 'd', d: 'body', view: 'front', x: 0.36, y: 0.5, marks: [['knee', 's0@0.02'], ['arm', 's0@0.25'], ['hand', 's0@0.45'], ['head', 's0@0.62']] },
          { k: 'chips', x: 0.62, y: 0.22, items: [['joint', 'Douleur articulaire'], ['itch', 'Peau qui démange'], ['tingle', 'Fourmillements'], ['tired', 'Fatigue inhabituelle']], at: ['s0@0.02', 's0@0.25', 's0@0.45', 's0@0.62'], col: true }] },
      { ch: 'Quand prévenir', say: [["Any of these? Tell Keiko right away.", "Un de ces signes ? Préviens Keiko tout de suite."], ["Treatment works best when it starts early.", "Le traitement marche mieux s'il commence tôt."]],
        L: [mod('day', 'lab'), act('lucas', 'rubArm', 0.34, 0.56, 0.56), act('keiko', 'talk', 0.64, 0.56, 0.56, { in: 'right', item: 'medkit' }), { k: 'warn', text: 'Un de ces signes : préviens Keiko', at: 0.2 }] },
      { tr: 'fade', say: [["Don't tough it out: report it.", "Ne serre pas les dents : signale-le."]],
        L: [{ k: 'outside', focus: 'eva' }, act('lucas', 'glide', 0.6, 0.45, 0.46, { suit: true, rot: -0.4 }), { k: 'big', text: 'Signale-le', at: 0.1 }] }
    ]
  },
  // ======================================================================================
  arret: {
    cat: 'securite', fiche: 'F-CVN-07', title: 'Arrêt cardiaque en apesanteur',
    short: 'Masser quand rien ne tient en place : se caler, la table médicale, le rythme et le défibrillateur.',
    sources: ['hink', 'fiches'],
    thumb: { text: 'Masser sans gravité', who: 'keiko', pose: 'worry', tone: 'red', bg: 'module', d: 'heart' },
    shots: [
      { ch: 'Début', say: [["Cardiac arrest in weightlessness.", "Arrêt cardiaque en apesanteur."], ["Every second counts. Here's how to keep the blood moving when nothing stays put.", "Chaque seconde compte. Voici comment faire circuler le sang quand rien ne tient en place."]],
        L: [{ k: 'flat', tone: 'red' }, { k: 'd', d: 'heart', x: 0.76, y: 0.48, bpm: 0 }, { k: 'title' }] },
      { ch: 'Le problème', say: [["On Earth, your body weight helps you push down on the chest.", "Sur Terre, ton poids t'aide à appuyer sur la poitrine."], ["In orbit, every push sends you floating away, and your compressions lose their strength.", "En orbite, chaque poussée t'envoie flotter plus loin, et tes compressions perdent leur force."]],
        L: [{ k: 'd', d: 'cprEarth', x: 0.5, y: 0.5, out: 's1' }, { k: 'd', d: 'cprDrift', x: 0.5, y: 0.5, at: 's1' }] },
      { ch: 'Se caler', say: [["So you brace yourself.", "Alors on se cale."], ["Wrap your legs around the patient's chest, or plant your feet on the ceiling and push with your arms.", "Entoure le thorax du patient avec tes jambes, ou plante tes pieds au plafond et pousse avec les bras."]],
        L: [mod('day', 'node'), { k: 'd', d: 'cprBrace', x: 0.5, y: 0.5, mode: 'legs', out: 's1@0.5' }, { k: 'd', d: 'cprBrace', x: 0.5, y: 0.5, mode: 'ceiling', at: 's1@0.5' }] },
      { ch: 'Masser et défibriller', say: [["As soon as you can, strap the patient to the medical table.", "Dès que possible, attache le patient sur la table médicale."]],
        L: [mod('day', 'lab'), { k: 'd', d: 'cprTable', x: 0.5, y: 0.52, straps: ['s0@0.4', 's0@0.8'] }] },
      { say: [["Push hard and fast: one hundred to one hundred and twenty times a minute.", "Appuie fort et vite : cent à cent vingt fois par minute."]],
        L: [{ k: 'flat', tone: 'red' }, { k: 'd', d: 'heart', x: 0.34, y: 0.47, bpm: 110 }, { k: 'stat', big: '100 à 120', small: 'compressions par minute', x: 0.68, y: 0.47, at: 's0@0.35' }] },
      { say: [["Meanwhile, a crewmate brings the defibrillator, sticks on the pads, and follows its voice instructions.", "Pendant ce temps, un équipier apporte le défibrillateur, colle les électrodes et suit ses instructions vocales."]],
        L: [mod('day', 'lab'), { k: 'd', d: 'cprTable', x: 0.42, y: 0.52, pumping: true, s: 0.85 }, act('aminata', 'carry', 0.82, 0.55, 0.52, { item: 'aed', flip: true, in: 'right' }), { k: 'bubble', text: 'Ne touchez plus le patient', x: 0.74, y: 0.17, at: 's0@0.62' }] },
      { say: [["Swap rescuers every two minutes: compressions in orbit are exhausting.", "Changez de sauveteur toutes les deux minutes : masser en orbite épuise très vite."]],
        L: [mod('day', 'lab'), { k: 'd', d: 'cprTable', x: 0.44, y: 0.52, pumping: true, s: 0.85, swap: 's0@0.55' }, { k: 'd', d: 'timer', secs: 120, x: 0.82, y: 0.3, at: 0, label: '2 min' }] },
      { tr: 'fade', say: [["Practice in the cardiac arrest simulation, with your whole crew, until it becomes automatic.", "Entraîne-toi dans la simulation d'arrêt cardiaque, avec tout l'équipage, jusqu'à ce que ça devienne automatique."]],
        L: [{ k: 'flat', tone: 'red' }, { k: 'd', d: 'simcard', x: 0.5, y: 0.45, label: 'Arrêt cardiaque', icon: 'heart' }] }
    ]
  }
};

export const ORDER = ['arrivee', 'dos', 'os', 'muscles', 'yeux', 'eau', 'sommeil', 'moral', 'incendie', 'depress', 'ammoniac', 'eruption', 'sortie', 'arret'];

// texte seul, pour la synthèse vocale (tts.py lit text.json)
export function textJSON() {
  const text = {};
  for (const id of ORDER) text[id] = { shots: STORY[id].shots.map(s => s.say) };
  return { order: ORDER, text };
}
