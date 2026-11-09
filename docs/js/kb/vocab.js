/* AURA : vocabulaire codé (annexe technique des fiches, « Le vocabulaire codé »).
   Chaque fait a un code, un libellé simple, la question posée à l'astronaute
   et des synonymes en français, écrits naturellement : ils sont normalisés au
   chargement (minuscules, sans accents). Les mêmes synonymes servent à lire les
   fiches et à comprendre ce que dit l'astronaute.
   Ce vocabulaire est un choix AURA, ouvert aux ajouts (R-RAI-09). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AURA_VOCAB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // [code, libellé, question, synonymes, options]
  // options.urg : référence du signe d'alarme global (R-URG-10 à 22)
  // options.zone : partie du corps, pour la silhouette
  const F = [
    // État général
    ['fievre', 'Fièvre ou frissons', 'As-tu de la fièvre ou des frissons ?', ['fièvre', 'fiévreux', 'fébrile', 'frissons', 'frisson', 'chaud et froid', 'température élevée', '=de la température', '=de la temperature', 'température qui monte'], { zone: 'general' }],
    ['fatigue', 'Fatigue inhabituelle', 'Es-tu beaucoup plus fatigué que d\'habitude ?', ['fatigue', 'fatigué', 'fatiguée', 'épuisé', 'épuisée', 'épuisement', 'crevé', 'sans énergie', '=à plat', 'asthénie'], { zone: 'general' }],
    ['perte_appetit', 'Moins d\'appétit', 'As-tu moins faim que d\'habitude ?', ['perte d\'appétit', 'pas faim', 'plus faim', 'manque d\'appétit', 'appétit diminué'], { zone: 'general' }],
    ['sueurs', 'Sueurs', 'Transpires-tu beaucoup, avec des sueurs froides ?', ['sueurs', 'sueur', 'sueurs froides', 'transpire', 'transpiration'], { zone: 'general' }],
    ['deshydratation', 'Signes de déshydratation', 'As-tu très soif, la bouche sèche, ou peu d\'urines ?', ['déshydratation', 'déshydraté', 'bouche sèche', '=très soif', 'soif intense', '=peu d\'urines', '=pas beaucoup d\'urines', 'urines foncées'], { zone: 'general' }],
    ['agitation', 'Agitation', 'Est-ce que la douleur t\'empêche de tenir en place ?', ['agitation', 'agité', 'tenir en place', 'impossible de rester immobile'], { zone: 'general' }],
    ['perte_poids', 'Perte de poids', 'As-tu perdu du poids sans le vouloir ?', ['perte de poids', 'perdu du poids', 'maigri', 'amaigrissement'], { zone: 'general' }],
    ['paleur', 'Pâleur, essoufflement à l\'effort', 'Es-tu pâle, avec un souffle court à l\'effort ?', ['pâleur', 'pâle', 'teint pâle', 'anémie'], { zone: 'general' }],

    // Tête et nerfs
    ['cephalee', 'Mal de tête', 'As-tu mal à la tête ?', ['mal de tête', 'maux de tête', 'mal à la tête', 'céphalée', 'céphalées', 'migraine', 'tête qui fait mal', 'mal au crâne'], { zone: 'tete' }],
    ['cephalee_brutale', 'Mal de tête brutal et très violent', 'Ce mal de tête est-il arrivé d\'un coup, très violent, le pire de ta vie ?', ['mal de tête brutal', 'brutal et très violent', 'coup de tonnerre', 'pire mal de tête', 'mal de tête violent', 'mal de tête très violent', 'céphalée brutale'], { zone: 'tete', urg: 'R-URG-16', parent: 'cephalee' }],
    ['nuque_raide', 'Nuque raide', 'As-tu la nuque raide, difficile à pencher en avant ?', ['nuque raide', 'raideur de nuque', 'raideur de la nuque', 'cou raide'], { zone: 'tete', urg: 'R-URG-16' }],
    ['vertige', 'Vertiges', 'As-tu des vertiges, la tête qui tourne ?', ['vertige', 'vertiges', 'tête qui tourne', 'la tête me tourne', 'étourdi', 'étourdissement', 'déséquilibre', 'désorientation dans l\'espace'], { zone: 'tete' }],
    ['nausee', 'Nausées', 'As-tu la nausée, envie de vomir ?', ['nausée', 'nausées', 'nauséeux', 'envie de vomir', 'mal au cœur', 'écœuré', 'haut-le-cœur'], { zone: 'ventre' }],
    ['vomissement', 'Vomissements', 'As-tu vomi ?', ['vomi', 'vomis', 'vomit', 'vomir', 'vomissement', 'vomissements', '=j\'ai rendu mon repas'], { zone: 'ventre', parent: 'nausee', herite: true }],
    ['vomissements_repetes', 'Vomissements répétés', 'Vomis-tu sans arrêt, au point de ne plus pouvoir boire ?', ['vomissements répétés', 'vomis sans arrêt', 'vomit sans arrêt', 'impossible de boire', 'je ne garde rien'], { zone: 'ventre', parent: 'vomissement' }],
    ['trouble_vision', 'Vue trouble', 'Vois-tu flou, ou moins bien que d\'habitude ?', ['vision floue', 'vue floue', 'vois flou', 'voit flou', 'trouble de la vision', 'troubles de la vision', 'baisse de la vue', 'vue qui baisse', 'vision de près', 'voir double', 'vision double', 'moins bien voir', 'je vois moins bien', 'vois moins bien'], { zone: 'yeux' }],
    ['perte_vision_brutale', 'Perte brutale de la vue', 'As-tu perdu la vue d\'un coup, même en partie ?', ['perte brutale de la vue', 'perte de la vue', 'je ne vois plus', 'ne voit plus', 'voile noir', 'rideau devant l\'œil', 'rideau noir', 'baisse brutale de la vue', 'perte de vision'], { zone: 'yeux', urg: 'R-URG-18' }],
    ['eclairs_mouches', 'Éclairs ou taches qui flottent', 'Vois-tu des éclairs de lumière ou des taches qui flottent ?', ['éclairs lumineux', 'éclairs', 'mouches volantes', 'taches qui flottent', 'pluie de suie', 'flashs'], { zone: 'yeux' }],
    ['faiblesse_un_cote', 'Faiblesse d\'un côté du corps', 'As-tu une faiblesse ou un engourdissement d\'un seul côté du corps, ou le visage qui tombe ?', ['faiblesse d\'un côté', 'faiblesse d\'un seul côté', 'paralysie', 'paralysé', 'bras qui ne répond plus', 'jambe qui ne répond plus', 'visage qui tombe', 'bouche de travers', 'bras qui retombe', 'trouble neurologique', 'déficit neurologique'], { zone: 'tete', urg: 'R-URG-14' }],
    ['trouble_parole', 'Parole difficile', 'As-tu du mal à parler ou à trouver tes mots ?', ['difficulté à parler', 'du mal à parler', 'parole difficile', 'parole anormale', 'trouble de la parole', 'mots qui ne viennent pas', 'bafouille', 'articule mal'], { zone: 'tete', urg: 'R-URG-14' }],
    ['confusion', 'Confusion', 'Te sens-tu confus, perdu, ou quelqu\'un te trouve-t-il bizarre ?', ['confusion', 'confus', 'confuse', 'désorienté', 'désorientée', 'perdu dans le temps', 'embrouillé', 'pensée lente', 'trouble de la conscience'], { zone: 'tete', urg: 'R-URG-19' }],
    ['convulsion', 'Convulsions', 'As-tu fait une crise avec des secousses du corps ?', ['convulsion', 'convulsions', 'crise convulsive', 'secousses du corps', 'secousses dans tout le corps', 'corps qui tremble de partout', 'crise d\'épilepsie', 'épilepsie', 'spasmes de tout le corps'], { zone: 'tete', urg: 'R-URG-20' }],
    ['perte_connaissance', 'Perte de connaissance, malaise', 'As-tu perdu connaissance, ou fait un malaise ?', ['perte de connaissance', 'perdu connaissance', 'évanoui', 'évanouissement', 'tombé dans les pommes', 'malaise', 'syncope', 'inconscient', 'effondré', 'ne répond pas', 'ne répond plus', 'ne respire pas', 'ne respire pas normalement', '=ne respire plus', '=respire plus', '=ne respire presque plus', '=plus de pouls', '=pas de pouls', '=ne réagit plus', '=ne réagit pas', '=ne bouge plus', 'sans connaissance', 'a perdu connaissance'], { zone: 'general', urg: 'R-URG-12' }],
    ['paresthesie', 'Fourmillements', 'As-tu des fourmillements ou des engourdissements ?', ['fourmillements', 'fourmillement', 'picotements', 'engourdi', 'engourdie', 'engourdissement', 'engourdissements', 'fourmis'], { zone: 'membres' }],
    ['memoire_concentration', 'Concentration difficile', 'As-tu du mal à te concentrer ou à te souvenir ?', ['=manque de concentration', '=moins de concentration', 'concentration difficile', '=troubles de la concentration', '=du mal à me concentrer', '=mal à me concentrer', '=du mal à se concentrer', '=mal à se concentrer', 'difficulté à se concentrer', 'trous de mémoire', '=des oublis', '=j\'oublie tout'], { zone: 'tete' }],

    // Cœur et respiration
    ['douleur_thoracique', 'Douleur dans la poitrine', 'As-tu une douleur ou une oppression dans la poitrine ?', ['douleur dans la poitrine', 'douleur de poitrine', 'mal à la poitrine', 'mal dans la poitrine', 'oppression', 'poitrine qui serre', 'serrement', 'douleur thoracique', 'douleur au thorax', 'douleur du thorax', 'angine de poitrine'], { zone: 'poitrine', urg: 'R-URG-10' }],
    ['douleur_irradie_bras', 'Douleur qui part dans les bras', 'La douleur part-elle dans les deux bras ou la mâchoire ?', ['irradie dans les deux bras', 'dans les deux bras', 'irradie dans le bras', 'vers la mâchoire', 'dans la mâchoire'], { zone: 'poitrine' }],
    ['douleur_pleuretique', 'Douleur piquante, augmentée en respirant', 'La douleur augmente-t-elle quand tu respires ou quand on appuie dessus ?', ['augmentée par la respiration', 'augmente en respirant', '=mal quand je respire', '=douleur quand je respire', '=fait mal quand je respire', '=mal en respirant', '=douleur en respirant', '=pique quand je respire', 'douleur piquante', 'reproduite en appuyant', '=quand j\'appuie dessus', '=mal quand j\'appuie', '=douleur quand j\'appuie'], { zone: 'poitrine' }],
    ['dyspnee', 'Difficulté à respirer', 'As-tu du mal à respirer, le souffle court ?', ['difficulté à respirer', 'du mal à respirer', 'mal à respirer', 'respire mal', 'essoufflé', 'essoufflée', 'essoufflement', 'souffle court', 'manque d\'air', 'étouffe', 'étouffement', 'gêne respiratoire', '=ne respire pas bien', '=n\'arrive pas à respirer', '=n\'arrive plus à respirer', '=ne peux pas respirer', '=ne peux plus respirer', '=peux plus respirer', '=ne respire pas bien du tout'], { zone: 'poitrine', urg: 'R-URG-11' }],
    ['toux', 'Toux', 'Tousses-tu ?', ['toux', 'tousse', 'tousser', 'quinte'], { zone: 'poitrine' }],
    ['crachats', 'Crachats', 'Craches-tu, ou tousses-tu gras ?', ['crachats', 'crache', 'toux grasse', 'expectorations'], { zone: 'poitrine' }],
    ['palpitations', 'Palpitations', 'Sens-tu ton cœur battre trop vite ou de façon irrégulière ?', ['palpitations', 'cœur qui bat vite', 'cœur qui s\'emballe', 'cœur irrégulier', 'battements irréguliers', 'rythme irrégulier'], { zone: 'poitrine' }],
    ['voix_rauque', 'Voix enrouée', 'Ta voix est-elle enrouée ou rauque ?', ['voix rauque', 'voix enrouée', 'enroué', 'enrouée', 'voix cassée'], { zone: 'gorge' }],
    ['stridor', 'Respiration sifflante, bruyante', 'Ta respiration fait-elle un bruit, un sifflement ?', ['sifflement en respirant', 'respiration sifflante', 'respiration bruyante', 'bruit en respirant', 'stridor', 'sifflante'], { zone: 'gorge' }],
    ['gonflement_gorge', 'Gorge, lèvres ou langue qui gonflent', 'Ta gorge, tes lèvres ou ta langue gonflent-elles ?', ['gorge qui gonfle', 'gorge gonflée', 'lèvres qui gonflent', 'lèvres gonflées', 'langue qui gonfle', 'langue gonflée', 'gonflement de la gorge', 'gonflement des lèvres', 'gonflement de la langue'], { zone: 'gorge', urg: 'R-URG-15' }],
    ['fausse_route', 'Quelque chose coincé en avalant', 'As-tu avalé de travers, avec quelque chose de coincé ?', ['fausse route', 'avalé de travers', 'coincé dans la gorge', 'étouffe en mangeant'], { zone: 'gorge' }],
    ['jambe_gonflee', 'Jambe ou bras gonflé d\'un côté', 'Un bras ou une jambe est-il gonflé d\'un seul côté ?', ['jambe gonflée', 'mollet gonflé', 'bras gonflé', 'gonflement d\'un seul côté'], { zone: 'membres' }],

    // ORL, yeux, bouche
    ['mal_gorge', 'Mal de gorge', 'As-tu mal à la gorge ?', ['mal de gorge', 'mal à la gorge', 'gorge irritée', 'gorge qui gratte', 'angine', 'avaler fait mal', 'douleur en avalant'], { zone: 'gorge' }],
    ['depots_amygdales', 'Dépôts blancs sur les amygdales', 'Vois-tu des points blancs au fond de la gorge ?', ['dépôts blancs', 'points blancs', 'dépôts sur les amygdales', 'amygdales blanches'], { zone: 'gorge' }],
    ['ganglions_cou', 'Ganglions douloureux au cou', 'As-tu des boules douloureuses sur le cou ?', ['ganglion', 'ganglions', 'ganglions du cou', 'ganglion douloureux'], { zone: 'gorge' }],
    ['nez_bouche', 'Nez bouché', 'As-tu le nez bouché ?', ['nez bouché', 'nez pris', 'congestion', 'congestion nasale', 'sinus bouchés', 'visage gonflé', 'gonflement du visage'], { zone: 'nez' }],
    ['nez_coule', 'Nez qui coule', 'Ton nez coule-t-il, avec des éternuements ?', ['nez qui coule', 'rhume', 'éternue', 'éternuements', 'écoulement nasal'], { zone: 'nez' }],
    ['saignement_nez', 'Saignement de nez', 'Saignes-tu du nez ?', ['saigne du nez', 'saignement de nez', 'saignement du nez', 'nez qui saigne', 'épistaxis'], { zone: 'nez' }],
    ['douleur_sinus', 'Douleur des sinus', 'As-tu une douleur au front ou sous les yeux, qui augmente en te penchant ?', ['douleur des sinus', 'mal aux sinus', 'sinusite', 'pression au visage', 'douleur du visage', 'front douloureux'], { zone: 'nez' }],
    ['oreille_douloureuse', 'Mal à l\'oreille', 'As-tu mal à l\'oreille ?', ['mal à l\'oreille', 'mal aux oreilles', 'oreille douloureuse', 'douleur d\'oreille', 'douleur de l\'oreille', 'otite'], { zone: 'oreille' }],
    ['baisse_audition', 'Baisse de l\'audition', 'Entends-tu moins bien ?', ['entends mal', 'entend mal', 'entends moins bien', 'baisse de l\'audition', 'perte d\'audition', 'audition diminuée', 'audition qui baisse', '=mon audition baisse', 'sourd', 'oreille bouchée', 'oreilles bouchées', 'sons étouffés'], { zone: 'oreille' }],
    ['acouphenes', 'Sifflements dans l\'oreille', 'Entends-tu un sifflement ou un bourdonnement ?', ['acouphène', 'acouphènes', 'sifflement dans l\'oreille', 'bourdonnement', 'bourdonnements'], { zone: 'oreille' }],
    ['ecoulement_oreille', 'Écoulement de l\'oreille', 'Ton oreille coule-t-elle ?', ['oreille qui coule', 'écoulement de l\'oreille', 'écoulement d\'oreille'], { zone: 'oreille' }],
    ['douleur_oeil', 'Douleur de l\'œil', 'As-tu mal à l\'œil ?', ['mal à l\'œil', 'mal aux yeux', 'douleur de l\'œil', 'douleur à l\'œil', 'œil douloureux', 'douleur intense de l\'œil', 'yeux qui piquent', 'brûlure de l\'œil'], { zone: 'yeux' }],
    ['oeil_rouge', 'Œil rouge', 'Ton œil est-il rouge ?', ['œil rouge', 'yeux rouges', 'rougeur de l\'œil', 'œil injecté'], { zone: 'yeux' }],
    ['corps_etranger_oeil', 'Quelque chose dans l\'œil', 'Sens-tu quelque chose dans l\'œil, comme un grain de poussière ?', ['quelque chose dans l\'œil', 'poussière dans l\'œil', 'grain dans l\'œil', 'corps étranger', 'débris dans l\'œil', 'sensation de sable'], { zone: 'yeux', evenement: true }],
    ['larmoiement', 'Œil qui pleure', 'Ton œil pleure-t-il beaucoup ?', ['larmoiement', 'larmoie', 'œil qui pleure', 'larmes'], { zone: 'yeux' }],
    ['photophobie', 'Gêne à la lumière', 'La lumière te fait-elle mal aux yeux ?', ['gêne à la lumière', 'lumière fait mal', 'photophobie', 'éblouissement'], { zone: 'yeux' }],
    ['produit_oeil', 'Produit chimique dans l\'œil', 'Un produit chimique est-il entré dans ton œil ?', ['produit chimique dans l\'œil', 'produit dans l\'œil', 'projection dans l\'œil', 'brûlure chimique'], { zone: 'yeux', evenement: true }],
    ['mal_dent', 'Mal de dents', 'As-tu mal à une dent ?', ['mal aux dents', 'mal de dents', 'mal à une dent', 'mal à la dent', 'rage de dents', 'dent qui fait mal', 'douleur dentaire', 'sensible au chaud', 'sensible au froid', 'carie', 'caries', 'sensible au chaud et au froid'], { zone: 'bouche' }],
    ['dent_cassee', 'Dent, plombage ou couronne abîmé', 'Une dent, un plombage ou une couronne est-il cassé ou tombé ?', ['dent cassée', 'dent tombée', 'dent arrachée', 'plombage', 'couronne', 'perdu un plombage', 'perdu une couronne'], { zone: 'bouche' }],
    ['gonflement_joue', 'Joue ou gencive gonflée', 'Ta joue ou ta gencive est-elle gonflée ?', ['joue gonflée', 'gencive gonflée', 'abcès', 'gonflement de la joue'], { zone: 'bouche' }],
    ['aphte', 'Petite plaie dans la bouche', 'As-tu une petite plaie douloureuse dans la bouche ?', ['aphte', 'aphtes', 'ulcère dans la bouche', 'plaie dans la bouche'], { zone: 'bouche' }],

    // Ventre, urines
    ['douleur_ventre', 'Mal au ventre', 'As-tu mal au ventre ?', ['mal au ventre', 'douleur au ventre', 'douleur du ventre', 'douleur abdominale', 'douleurs abdominales', 'ventre douloureux', 'crampes au ventre', 'crampes', 'crampes abdominales', 'bas ventre', 'mal à l\'estomac'], { zone: 'ventre' }],
    ['ventre_dur', 'Ventre dur, douleur très forte', 'Ton ventre est-il dur, avec une douleur très forte ?', ['ventre dur', 'ventre très dur', 'douleur très forte au ventre', 'ventre de bois', 'ventre gonflé et dur'], { zone: 'ventre', urg: 'R-URG-17', parent: 'douleur_ventre' }],
    ['douleur_bas_droite', 'Douleur en bas à droite du ventre', 'La douleur est-elle en bas à droite du ventre ?', ['en bas à droite', 'bas droite du ventre', 'fosse iliaque droite', 'bas du ventre à droite'], { zone: 'ventre', parent: 'douleur_ventre' }],
    ['douleur_migre_bas_droite', 'Douleur partie du nombril vers la droite', 'La douleur a-t-elle commencé autour du nombril, puis s\'est-elle déplacée en bas à droite ?', ['partie du nombril', 'autour du nombril puis', 'descendue en bas à droite', 'qui descend en bas à droite'], { zone: 'ventre', parent: 'douleur_bas_droite' }],
    ['douleur_avant_vomissements', 'Douleur avant les vomissements', 'La douleur est-elle venue avant les vomissements ?', ['douleur avant les vomissements', 'apparue avant les vomissements'], { zone: 'ventre' }],
    ['douleur_haut_droite', 'Douleur en haut à droite du ventre', 'La douleur est-elle en haut à droite, sous les côtes ?', ['en haut à droite', 'sous les côtes à droite', 'haut du ventre à droite'], { zone: 'ventre', parent: 'douleur_ventre' }],
    ['douleur_haut_ventre', 'Douleur du haut du ventre', 'La douleur est-elle au creux de l\'estomac, vers le dos ?', ['haut du ventre', 'creux de l\'estomac', 'épigastre', 'qui traverse vers le dos'], { zone: 'ventre', parent: 'douleur_ventre' }],
    ['brulure_estomac', 'Brûlures d\'estomac, reflux', 'As-tu des brûlures qui remontent de l\'estomac ?', ['brûlures d\'estomac', 'brûlure d\'estomac', 'remontées acides', 'reflux', 'aigreurs', 'renvois acides'], { zone: 'ventre' }],
    ['diarrhee', 'Diarrhée', 'As-tu la diarrhée ?', ['diarrhée', 'diarrhées', 'selles liquides', 'selles molles', '=la courante'], { zone: 'ventre' }],
    ['constipation', 'Constipation', 'Es-tu constipé, sans selles depuis plusieurs jours ?', ['constipation', 'constipé', 'constipée', 'pas de selles', 'pas allé à la selle', 'selles dures'], { zone: 'ventre' }],
    ['sang_selles', 'Sang dans les selles', 'Y a-t-il du sang dans tes selles, ou sont-elles noires ?', ['sang dans les selles', 'selles noires', 'sang rouge en allant aux toilettes', 'saignement à la selle'], { zone: 'ventre' }],
    ['ventre_gonfle', 'Ventre gonflé, sans gaz', 'Ton ventre est-il gonflé, sans gaz ni selles ?', ['ventre gonflé', 'ballonnement', 'ballonnements', 'plus de gaz', 'ni gaz ni selles'], { zone: 'ventre' }],
    ['boule_aine', 'Boule à l\'aine ou au nombril', 'Vois-tu une boule à l\'aine ou au nombril, surtout à l\'effort ?', ['boule à l\'aine', 'boule au nombril', 'hernie', 'grosseur à l\'aine'], { zone: 'ventre' }],
    ['brulure_urinaire', 'Brûlures en urinant', 'As-tu des brûlures quand tu urines ?', ['brûlures en urinant', 'brûlure en urinant', 'brûle quand j\'urine', 'ça brûle quand je fais pipi', 'brûlures urinaires', 'brûlures mictionnelles', 'douleur en urinant'], { zone: 'ventre' }],
    ['envies_frequentes', 'Envies d\'uriner fréquentes', 'As-tu envie d\'uriner très souvent ?', ['envies fréquentes', 'envie d\'uriner souvent', 'urine souvent', 'besoin d\'uriner souvent', 'envies pressantes'], { zone: 'ventre' }],
    ['sang_urines', 'Sang dans les urines', 'Y a-t-il du sang dans tes urines ?', ['sang dans les urines', 'urines rouges', 'urine rouge', 'urines roses', 'urine rose'], { zone: 'ventre' }],
    ['retention_urinaire', 'Impossible d\'uriner', 'As-tu du mal à uriner, ou plus d\'urines du tout ?', ['n\'arrive pas à uriner', 'du mal à uriner', 'impossible d\'uriner', 'plus d\'urines', 'rétention', 'vessie pleine', 'vider la vessie', 'jet d\'urine faible', 'jet faible'], { zone: 'ventre' }],
    ['fuites_urinaires', 'Fuites d\'urine', 'As-tu des fuites d\'urine ?', ['fuites d\'urine', 'fuite d\'urine', 'incontinence', 'fuites urinaires'], { zone: 'ventre' }],
    ['douleur_flanc', 'Douleur du flanc', 'As-tu mal sur le côté, entre les côtes et la hanche, vers le dos ?', ['douleur du flanc', 'douleur au flanc', 'mal au flanc', 'mal sur le côté', 'mal aux reins', 'douleur des reins', 'flanc'], { zone: 'dos' }],
    ['douleur_par_vagues', 'Douleur par vagues', 'La douleur vient-elle par vagues, très forte puis moins forte ?', ['par vagues', 'va et vient', 'qui va et vient'], { zone: 'dos' }],
    ['douleur_irradiation_aine', 'Douleur qui descend vers l\'aine', 'La douleur descend-elle vers l\'aine ?', ['descend vers l\'aine', 'vers l\'aine', 'irradie vers l\'aine', 'jusqu\'à l\'aine'], { zone: 'dos' }],
    ['pertes_vaginales', 'Pertes vaginales', 'As-tu des pertes vaginales inhabituelles ?', ['pertes vaginales', 'pertes blanches', 'pertes inhabituelles'], { zone: 'ventre', sexe: 'F' }],
    ['irritation_vaginale', 'Irritation vaginale', 'As-tu une irritation ou des démangeaisons vaginales ?', ['irritation vaginale', 'démangeaisons vaginales', 'démangeaison vaginale', 'brûlure vaginale'], { zone: 'ventre', sexe: 'F' }],
    ['saignement_vaginal', 'Saignement inhabituel des règles', 'As-tu des saignements inhabituels, entre les règles ou très abondants ?', ['saignement entre les règles', 'règles abondantes', 'saignement vaginal', 'saignements inhabituels', 'règles plus abondantes', 'règles plus longues', 'en dehors des dates habituelles', 'saignement utérin'], { zone: 'ventre', sexe: 'F' }],
    ['retard_regles', 'Retard de règles', 'As-tu un retard de règles ?', ['retard de règles', 'pas eu mes règles', 'règles en retard'], { zone: 'ventre', sexe: 'F' }],

    // Dos, membres, peau, blessures
    ['mal_dos', 'Mal de dos', 'As-tu mal au dos ?', ['mal au dos', 'mal de dos', 'douleur du dos', 'douleur au dos', 'douleur dans le dos', 'douleurs lombaires', 'lombaires', 'lumbago', 'dos bloqué', 'bas du dos'], { zone: 'dos' }],
    ['douleur_cou', 'Mal au cou', 'As-tu mal au cou ?', ['mal au cou', 'douleur du cou', 'douleur au cou', 'torticolis', 'nuque douloureuse'], { zone: 'dos' }],
    ['douleur_mouvement', 'Douleur qui change avec les mouvements', 'La douleur change-t-elle quand tu bouges ?', ['change avec les mouvements', 'quand je bouge', 'en bougeant', 'aux mouvements', 'avec les mouvements', 'en tournant'], { zone: 'dos' }],
    ['douleur_membre', 'Douleur d\'un bras ou d\'une jambe', 'As-tu mal à un bras, une jambe ou une articulation ?', ['douleur articulaire', 'mal aux articulations', 'douleur de l\'épaule', 'mal à l\'épaule', 'mal au genou', 'mal à la cheville', 'mal au poignet', 'mal au coude', 'mal à la hanche', 'mal au bras', 'mal à la jambe', 'crampes aux jambes', 'crampe à la jambe', 'crampe au mollet', 'articulation'], { zone: 'membres' }],
    ['gonflement', 'Gonflement', 'Vois-tu un gonflement à l\'endroit qui fait mal ?', ['articulation gonflée', 'gonflement', 'gonflée', 'gonflé', 'enflé', 'enflée', 'œdème'], { zone: 'membres' }],
    ['mouvement_force', 'Mouvement forcé ou choc', 'As-tu fait un faux mouvement ou reçu un choc ?', ['faux mouvement', 'mouvement forcé', 'tordu', 'tordue', 'entorse', 'cogné', 'cognée', '=une chute', '=fait une chute', '=suis tombé', '=suis tombée', '=est tombé', '=est tombée', 'reçu un coup', 'écrasement'], { zone: 'membres', evenement: true }],
    ['deformation', 'Déformation, impossible de bouger', 'Y a-t-il une déformation, ou est-il impossible de bouger ?', ['déformation', 'déformé', 'impossible de bouger', 'ne peux plus bouger', 'os qui dépasse'], { zone: 'membres' }],
    ['extremite_froide', 'Main ou pied froid, engourdi', 'La main ou le pied est-il froid, pâle ou engourdi ?', ['main froide', 'pied froid', 'doigts froids', 'extrémité froide'], { zone: 'membres' }],
    ['plaie', 'Plaie, coupure', 'As-tu une coupure ou une plaie ?', ['plaie', 'coupure', 'entaille', '=me suis coupé', '=me suis coupée', '=s\'est coupé', '=s\'est coupée', '=coupé au', '=coupée au', '=coupé à la', '=coupée à la'], { zone: 'peau', evenement: true }],
    ['ecorchure', 'Écorchure', 'Est-ce une simple écorchure ?', ['écorchure', 'égratignure', 'éraflure', 'écorché'], { zone: 'peau', evenement: true }],
    ['saignement_important', 'Saignement important', 'Saignes-tu beaucoup, sans que ça s\'arrête ?', ['saignement important', 'saigne beaucoup', 'hémorragie', 'ne s\'arrête pas de saigner', 'beaucoup de sang'], { zone: 'peau', urg: 'R-URG-13' }],
    ['choc_tete', 'Choc à la tête ou blessure grave', 'T\'es-tu cogné fort à la tête, ou blessé gravement ?', ['choc à la tête', 'traumatisme crânien', 'blessure grave', 'choc violent', '=cogné fort', '=cogné très fort', '=cognée fort', '=cognée très fort', 'tête heurtée violemment', '=choc très fort', '=coup très fort'], { zone: 'tete', urg: 'R-URG-21', evenement: true }],
    ['coup_tete', 'Coup léger à la tête', 'T\'es-tu cogné la tête ?', ['cogné la tête', 'coup à la tête', 'coup sur la tête', 'tête heurtée', 'tête cognée', 'pris un coup à la tête', '=me suis cogné', '=me suis cognée'], { zone: 'tete', leger: 'choc_tete' }],
    ['brulure_peau', 'Brûlure de la peau', 'T\'es-tu brûlé la peau ?', ['brûlure de la peau', 'brûlures de la peau', 'brûlure par le feu', 'brûlures par le feu', 'peau brûlée', 'je me suis brûlé', 'je me suis brûlée', 'cloque', 'cloques', 'brûlé par'], { zone: 'peau', evenement: true }],
    ['eruption', 'Boutons ou plaques sur la peau', 'As-tu des boutons, des rougeurs ou des plaques sur la peau ?', ['éruption', 'éruption cutanée', 'éruption sur la peau', '=bouton de fièvre', '=boutons de fièvre', '=des boutons', '=plein de boutons', 'boutons rouges', 'boutons sur la peau', '=des plaques', 'plaques rouges', 'rougeurs', 'eczéma', 'peau sèche', 'irritation de la peau'], { zone: 'peau' }],
    ['demangeaison', 'Démangeaisons', 'Est-ce que ça gratte ?', ['démange', 'démangeaison', 'démangeaisons', 'ça gratte', 'gratte', 'prurit'], { zone: 'peau' }],
    ['peau_infectee', 'Peau rouge, chaude et gonflée', 'Une zone de peau est-elle rouge, chaude et gonflée ?', ['rouge et chaude', 'rouge, chaude', 'chaude et gonflée', 'peau infectée', 'pus'], { zone: 'peau' }],
    ['vesicules_bande', 'Petites cloques en bande d\'un côté', 'As-tu de petites cloques groupées, en bande d\'un seul côté du corps ?', ['cloques en bande', 'boutons en bande', 'zona', 'en bande d\'un côté', 'petites cloques groupées'], { zone: 'peau' }],
    ['urticaire', 'Plaques qui gonflent et grattent', 'As-tu des plaques qui gonflent et grattent, comme des piqûres d\'ortie ?', ['urticaire', 'plaques qui gonflent', 'piqûres d\'ortie'], { zone: 'peau', parent: 'eruption' }],
    ['ongle', 'Ongle qui se décolle', 'Un ongle se décolle-t-il ou est-il douloureux ?', ['ongle', 'ongles', 'ongle décollé', 'ongle qui se décolle'], { zone: 'membres' }],

    ['ecoulement_oeil', 'Œil qui coule, paupières collées', 'Ton œil coule-t-il, avec les paupières collées ?', ['=écoulement de l\'œil', '=écoulement des yeux', 'paupières collées', 'œil qui coule', 'yeux qui coulent', 'pus dans l\'œil'], { zone: 'yeux' }],
    ['douleur_bas_gauche', 'Douleur en bas à gauche du ventre', 'La douleur est-elle en bas à gauche du ventre ?', ['en bas à gauche', 'bas du ventre à gauche', 'fosse iliaque gauche'], { zone: 'ventre', parent: 'douleur_ventre' }],
    ['douleur_anus', 'Douleur ou gêne à l\'anus', 'As-tu une douleur ou une gêne à l\'anus, avec du sang rouge sur le papier ?', ['douleur anale', 'gêne anale', 'anus', 'hémorroïdes', 'sang rouge sur le papier'], { zone: 'ventre' }],
    ['tension_haute', 'Tension élevée', 'Ta tension est-elle plus haute que d\'habitude ?', ['tension élevée', 'tension très élevée', 'hypertension', 'tension artérielle élevée'], { zone: 'general' }],
    ['fracture', 'Os peut-être cassé', 'Penses-tu qu\'un os est cassé ?', ['fracture', 'fracture de fatigue', 'os cassé', '~(me|m|s|se|t|te) suis cass(e|ee)|(s|se) est cass(e|ee)', '~cass(e|ee) (le|la|l|un|une|les|mon|ma|mes) (bras|jambe|jambes|poignet|cheville|doigt|doigts|main|pied|orteil|cote|cotes|hanche|epaule|clavicule|nez|coude|genou|os)'], { zone: 'membres', evenement: true }],
    ['delire', 'Propos sans lien avec la réalité', 'La personne dit-elle des choses sans lien avec la réalité ?', ['propos sans lien avec la réalité', 'délire', 'hallucinations', 'voit des choses', 'entend des voix'], { zone: 'moral' }],

    // Lieux d'une douleur ou d'une blessure (ils s'ajoutent aux autres faits)
    ['loc_cheville', 'À la cheville', 'Est-ce à la cheville ?', ['cheville', 'chevilles'], { zone: 'membres', lieu: true }],
    ['loc_genou', 'Au genou', 'Est-ce au genou ?', ['genou', 'genoux'], { zone: 'membres', lieu: true }],
    ['loc_poignet', 'Au poignet', 'Est-ce au poignet ?', ['poignet', 'poignets'], { zone: 'membres', lieu: true }],
    ['loc_epaule', 'À l\'épaule', 'Est-ce à l\'épaule ?', ['épaule', 'épaules'], { zone: 'membres', lieu: true }],
    ['loc_coude', 'Au coude', 'Est-ce au coude ?', ['coude', 'coudes'], { zone: 'membres', lieu: true }],
    ['loc_hanche', 'À la hanche', 'Est-ce à la hanche ?', ['hanche', 'hanches'], { zone: 'membres', lieu: true }],
    ['loc_doigt', 'À un doigt', 'Est-ce à un doigt ?', ['doigt', 'doigts', 'pouce'], { zone: 'membres', lieu: true }],
    ['loc_pied', 'Au pied', 'Est-ce au pied ?', ['pied', 'pieds', 'orteil', 'orteils', 'talon'], { zone: 'membres', lieu: true }],
    ['loc_jambe', 'À la jambe', 'Est-ce à la jambe ?', ['jambe', 'jambes', 'mollet', 'tibia'], { zone: 'membres', lieu: true }],

    // Sommeil, moral, comportement
    ['insomnie', 'Sommeil difficile', 'As-tu du mal à t\'endormir ou à rester endormi ?', ['insomnie', 'dors mal', 'je dors mal', 'mal dormi', 'n\'arrive pas à dormir', 'pas dormi', 'réveillé la nuit', 'réveils la nuit', 'réveille la nuit', '=me réveille souvent', 'sommeil difficile', 'endormissement difficile', 'sommeil court'], { zone: 'moral' }],
    ['somnolence', 'Somnolence dans la journée', 'Te sens-tu somnolent pendant la journée ?', ['somnolence', 'somnolent', 'endormi la journée', 'coups de barre', 'paupières lourdes'], { zone: 'moral' }],
    ['anxiete', 'Inquiétude, stress', 'Te sens-tu inquiet ou stressé, au point que ça te gêne ?', ['anxiété', 'anxieux', 'anxieuse', 'angoisse', 'angoissé', 'stressé', 'stressée', 'inquiet', 'inquiète', 'panique', 'peur'], { zone: 'moral' }],
    ['tristesse', 'Tristesse, moral bas', 'Te sens-tu triste ou sans envie depuis plusieurs jours ?', ['triste', 'tristesse', 'déprimé', 'déprimée', 'déprime', 'moral bas', 'plus envie de rien', 'cafard', 'je pleure', 'perte d\'intérêt', 'découragé'], { zone: 'moral' }],
    ['idees_noires', 'Envie de se faire du mal', 'As-tu eu envie de te faire du mal ?', ['envie de mourir', '=me faire du mal', '=me faire mal exprès', '=me tuer', '=en finir', 'suicide', 'suicidaire', '=me suicider', 'idées noires', 'ne plus vouloir vivre', '=plus envie de vivre', 'disparaître pour toujours'], { zone: 'moral', urg: 'R-URG-22' }],
    ['irritabilite', 'Irritabilité', 'Es-tu plus irritable que d\'habitude ?', ['irritable', 'irritabilité', 'énervé', 'à cran', 'nerveux'], { zone: 'moral' }],
    ['conflit_equipage', 'Tensions avec l\'équipage', 'Y a-t-il des tensions avec un membre de l\'équipage ?', ['dispute', 'disputes', 'conflit', 'conflits', 'tensions dans l\'équipage', 'tension dans l\'équipage', 'je ne supporte plus', 'mésentente', 'on se dispute'], { zone: 'moral' }],
    ['deuil', 'Perte d\'un proche', 'As-tu appris la perte d\'un proche ?', ['deuil', 'décès', 'est décédé', 'est décédée', '=mort de mon', '=mort de ma', '=est mort', '=est morte', 'perdu mon père', 'perdu ma mère', 'perdu un proche'], { zone: 'moral', evenement: true }],
    ['isolement', 'Sentiment d\'isolement', 'Te sens-tu seul, loin des tiens ?', ['solitude', 'je me sens seul', 'je me sens seule', 'me sens seul', 'me sens seule', 'sentiment d\'isolement', 'ma famille me manque', 'mes proches me manquent', 'loin de chez moi', 'le mal du pays', 'isolement'], { zone: 'moral' }],

    // Expositions et contexte
    ['fumee', 'Fumée ou odeur de brûlé', 'As-tu respiré de la fumée, ou senti une odeur de brûlé ?', ['fumée', 'odeur de brûlé', 'incendie', 'feu', 'ça brûle'], { zone: 'expo', evenement: true }],
    ['ammoniac', 'Odeur forte, piquante', 'As-tu senti une odeur forte et piquante, comme l\'ammoniac ?', ['ammoniac', 'odeur piquante', 'odeur forte', 'fuite toxique'], { zone: 'expo', evenement: true }],
    ['changement_pression', 'Changement de pression récent', 'As-tu eu un changement de pression récent, comme une sortie ou un sas ?', ['changement de pression', 'barotraumatisme', 'sas', 'remise en pression', 'dépressurisation'], { zone: 'expo', evenement: true }],
    ['eva_recente', 'Sortie dans les dernières 24 heures', 'As-tu fait une sortie extravéhiculaire dans les dernières 24 heures ?', ['après la sortie', 'depuis la sortie', 'sortie extravéhiculaire', 'après l\'eva', 'pendant la sortie'], { zone: 'expo' }],
    ['poussiere', 'Poussière respirée', 'As-tu été exposé à de la poussière, après une sortie en surface ?', ['poussière', 'poussières', 'régolithe'], { zone: 'expo', evenement: true }],
    ['chaleur_effort', 'Coup de chaleur à l\'effort', 'As-tu eu très chaud pendant l\'effort, avec un malaise ?', ['coup de chaleur', 'très chaud pendant le sport', 'chaud à l\'effort', 'chaleur à l\'effort'], { zone: 'expo', evenement: true }],
    ['irradiation', 'Forte dose de radiations', 'As-tu reçu une alerte de forte dose de radiations ?', ['radiation', 'radiations', 'irradiation', '=éruption solaire', '=une éruption solaire', 'dose de radiations'], { zone: 'expo', evenement: true }],
    ['medicament_pris', 'Médicament pris récemment', 'As-tu pris un médicament juste avant ?', ['après avoir pris', 'surdosage', 'trop de comprimés', 'effet indésirable', 'médicament pris'], { zone: 'expo' }],
    ['changement_gravite', 'Changement de gravité récent', 'As-tu changé de gravité ces derniers jours, arrivée en apesanteur ou retour au sol ?', ['changement de gravité', 'arrivée en orbite', 'retour sur terre', 'retour dans la gravité', 'premiers jours', 'atterrissage'], { zone: 'expo' }],
    ['se_lever', 'Malaise en se levant', 'Te sens-tu mal quand tu te lèves ?', ['en se levant', 'quand je me lève', 'en me levant', 'debout'], { zone: 'general' }]
  ];

  // Synonymes ajoutés aux faits pour lire le texte des fiches (style écrit)
  const EXTRA_DOC = {
    cephalee: ['céphalée'], nausee: ['nausées'], dyspnee: ['respiration difficile', 'essoufflement'],
    douleur_flanc: ['douleur très forte du flanc'], sang_urines: ['sang dans les urines'],
    fievre: ['fièvre avec', 'de la fièvre'], perte_connaissance: ['perte de connaissance'],
    retention_urinaire: ['plus d\'urines du tout'], insomnie: ['difficulté à s\'endormir', '=réveils'],
    trouble_vision: ['vision de près', 'baisse de vision']
  };

  // Mots qui transforment une phrase en question d'information plutôt qu'en symptôme vécu
  const FACTS = {};
  F.forEach(row => {
    const [code, label, question, syn, opt] = row;
    FACTS[code] = Object.assign({ code, label, question, syn: syn.concat(EXTRA_DOC[code] || []) }, opt || {});
  });

  // Les treize signes d'alarme des règles d'urgence (R-URG-10 à 22), avec leur premier geste
  const URGENCES = [
    { ref: 'R-URG-10', facts: ['douleur_thoracique'], titre: 'Douleur dans la poitrine', penser: 'Infarctus, trouble du rythme, blessure du thorax, caillot', gestes: ['Reste au repos, attaché', 'Mesure des constantes', 'ECG', 'Défibrillateur prêt'] },
    { ref: 'R-URG-11', facts: ['dyspnee', 'stridor'], titre: 'Difficulté à respirer', penser: 'Allergie grave, fausse route, fumée, manque d\'oxygène', gestes: ['Saturation', 'Oxygène si moins de 90 %', 'Vérifier l\'air de la cabine'] },
    { ref: 'R-URG-12', facts: ['perte_connaissance'], titre: 'Perte de connaissance, malaise', penser: 'Arrêt cardiaque, trouble du rythme, convulsion, malaise en se levant', gestes: ['Vérifier la respiration', 'Vérifier la réponse', 'Glycémie', 'ECG'] },
    { ref: 'R-URG-13', facts: ['saignement_important'], titre: 'Saignement important', penser: 'Choc hémorragique, plaie', gestes: ['Compression forte', 'Compresses qui absorbent : le sang flotte en gouttes', 'Constantes'] },
    { ref: 'R-URG-14', facts: ['faiblesse_un_cote', 'trouble_parole'], titre: 'Faiblesse d\'un côté, parole difficile', penser: 'AVC, accident de décompression', gestes: ['Noter l\'heure de début', 'Glycémie', 'Rien à avaler'] },
    { ref: 'R-URG-15', facts: ['gonflement_gorge'], titre: 'Gorge, lèvres ou langue qui gonflent', penser: 'Allergie grave (anaphylaxie)', gestes: ['Adrénaline de la trousse d\'urgence', 'Constantes'] },
    { ref: 'R-URG-16', facts: ['cephalee_brutale', 'nuque_raide'], titre: 'Mal de tête brutal et très violent, nuque raide', penser: 'AVC, traumatisme crânien, méningite', gestes: ['Température', 'Tension', 'Avis prioritaire du sol'] },
    { ref: 'R-URG-17', facts: ['ventre_dur'], titre: 'Douleur du ventre très forte, ventre dur', penser: 'Appendicite, vésicule, pancréas, occlusion, calcul, traumatisme', gestes: ['Rester à jeun', 'Température', 'Échographie'] },
    { ref: 'R-URG-18', facts: ['perte_vision_brutale'], titre: 'Perte brutale de la vue, douleur intense de l\'œil', penser: 'Décollement de rétine, glaucome, plaie ou brûlure de l\'œil', gestes: ['Ne pas frotter', 'Acuité visuelle', 'Échographie de l\'œil'] },
    { ref: 'R-URG-19', facts: ['confusion'], titre: 'Confusion soudaine', penser: 'CO₂ élevé, manque d\'oxygène, septicémie, AVC, sucre trop bas', gestes: ['Vérifier l\'air de la cabine', 'Saturation', 'Glycémie', 'Température'] },
    { ref: 'R-URG-20', facts: ['convulsion'], titre: 'Convulsions', penser: 'Crise convulsive, traumatisme crânien, sucre trop bas', gestes: ['Protéger la tête', 'Chronométrer', 'Glycémie'] },
    { ref: 'R-URG-21', facts: ['choc_tete'], titre: 'Choc violent à la tête ou blessure grave', penser: 'Traumatisme du crâne, du thorax, du ventre, de la colonne', gestes: ['Nuque immobile', 'Conscience vérifiée toutes les 15 minutes'] },
    { ref: 'R-URG-22', facts: ['idees_noires'], titre: 'Envie de se faire du mal', penser: 'Urgence psychologique, dépression', gestes: ['Ne pas rester seul', 'Le responsable médical tout de suite', 'Entretien prioritaire avec le psychologue au sol'] }
  ];

  // Silhouette : zones et faits proposés quand on touche une zone
  const ZONES = [
    { id: 'tete', label: 'Tête', facts: ['cephalee', 'vertige', 'trouble_vision', 'nausee', 'confusion'] },
    { id: 'yeux', label: 'Yeux', facts: ['douleur_oeil', 'oeil_rouge', 'corps_etranger_oeil', 'trouble_vision', 'eclairs_mouches'] },
    { id: 'orl', label: 'Nez, oreilles, gorge', facts: ['nez_bouche', 'mal_gorge', 'oreille_douloureuse', 'saignement_nez', 'baisse_audition'] },
    { id: 'bouche', label: 'Bouche et dents', facts: ['mal_dent', 'dent_cassee', 'gonflement_joue', 'aphte'] },
    { id: 'poitrine', label: 'Poitrine', facts: ['douleur_thoracique', 'dyspnee', 'toux', 'palpitations'] },
    { id: 'ventre', label: 'Ventre', facts: ['douleur_ventre', 'nausee', 'diarrhee', 'constipation', 'brulure_urinaire'] },
    { id: 'dos', label: 'Dos', facts: ['mal_dos', 'douleur_flanc', 'douleur_cou'] },
    { id: 'membres', label: 'Bras et jambes', facts: ['douleur_membre', 'gonflement', 'paresthesie', 'mouvement_force'] },
    { id: 'peau', label: 'Peau', facts: ['eruption', 'demangeaison', 'plaie', 'brulure_peau'] },
    { id: 'general', label: 'Tout le corps', facts: ['fievre', 'fatigue', 'vertige', 'nausee'] },
    { id: 'moral', label: 'Sommeil et moral', facts: ['insomnie', 'anxiete', 'tristesse', 'isolement'] }
  ];

  return { FACTS, URGENCES, ZONES };
});
