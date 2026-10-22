/* AURA : base documentaire embarquée.
   Fiches courtes rédigées par l’équipe à partir des sources citées.
   Elles servent à la recherche hors connexion (page Questions) et aux liens
   « En savoir plus ». Elles ne remplacent pas l’avis du médecin de bord. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AURA_KB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const cards = [
    {
      id: 'temp-vol',
      title: 'Pourquoi la température est plus élevée en vol',
      text: 'Au repos, la température centrale des astronautes augmente progressivement d’environ 1 °C pendant les deux à trois premiers mois de vol, puis se stabilise. Une valeur de 38 °C n’a donc pas le même sens à bord que sur Terre : AURA la compare à votre propre référence en vol, pas à la norme du sol.',
      tags: 'température fièvre chaud chaleur thermorégulation corps 38 degrés élevée hausse monte haute',
      sources: ['stahn2017'], context: 'temp'
    },
    {
      id: 'fievre-vraie',
      title: 'Quand une température doit inquiéter à bord',
      text: 'AURA alerte quand la température s’écarte nettement de votre référence en vol, même si elle reste sous 38 °C, et toujours au-delà de 39 °C, quel que soit votre profil. Un médicament contre la fièvre pris dans les six dernières heures peut masquer une hausse : signalez-le au moment de la mesure.',
      tags: 'fièvre infection frissons paracétamol alerte seuil température',
      sources: ['aura', 'stahn2017'], context: 'temp'
    },
    {
      id: 'exercice-chaleur',
      title: 'Effort physique et chaleur',
      text: 'Pendant l’exercice en vol, la température monte plus vite qu’au sol : la hausse moyenne mesurée est de 1,4 °C et dépasse parfois 40 °C. Indiquez un effort récent quand vous prenez une mesure, AURA élargit alors la plage attendue au lieu de déclencher une fausse alerte.',
      tags: 'exercice sport effort chaleur transpiration tapis vélo résistance',
      sources: ['stahn2017']
    },
    {
      id: 'co2-cephalee',
      title: 'Maux de tête et CO₂ de la cabine',
      text: 'À bord de l’ISS, le risque de mal de tête augmente avec le CO₂ : les chances de signaler une céphalée doublent environ pour chaque hausse de 1 mmHg. La norme NASA limite la moyenne sur une heure à 3 mmHg. Avant de prendre un antalgique, regardez la valeur de CO₂ et la ventilation de votre zone de travail.',
      tags: 'mal de tête céphalée migraine CO2 dioxyde de carbone air ventilation cabine',
      sources: ['law2014', 'ochmoCo2'], context: 'co2'
    },
    {
      id: 'co2-autres',
      title: 'Autres effets d’un CO₂ élevé',
      text: 'Un CO₂ élevé est aussi associé à des troubles du sommeil, de la fatigue et de l’irritabilité. Pris isolément, ces signes ne disent pas grand-chose. Quand ils coïncident avec une hausse du CO₂, la cause est plus probablement dans l’environnement que dans le corps.',
      tags: 'fatigue irritabilité concentration sommeil CO2 humeur énervement',
      sources: ['law2014'], context: 'co2'
    },
    {
      id: 'sommeil-vol',
      title: 'Dormir en vol',
      text: 'Les astronautes dorment en moyenne environ six heures par nuit en mission, nettement moins que les 8,5 heures prévues au planning. Trois quarts des équipages de l’ISS ont pris un médicament pour dormir à un moment de leur séjour. Bruit, lumière, charge de travail et CO₂ jouent tous un rôle.',
      tags: 'sommeil dormir insomnie fatigue somnifère nuit réveil',
      sources: ['barger2014'], context: 'sleep'
    },
    {
      id: 'sommeil-conseils',
      title: 'Mieux dormir à bord',
      text: 'Gardez des horaires réguliers, baissez les écrans et la lumière avant de dormir, attachez votre sac de couchage et signalez un CO₂ élevé dans la zone de repos. La mélatonine aide surtout à recaler le rythme ; un somnifère se prend selon le protocole validé par le médecin.',
      tags: 'sommeil conseils dormir mélatonine somnifère zolpidem horaires lumière',
      sources: ['barger2014', 'general']
    },
    {
      id: 'isolement-mars500',
      title: 'Isolement prolongé',
      text: 'Pendant la simulation Mars-520, l’activité physique de l’équipage a baissé au fil des mois et la durée comme les horaires de sommeil ont changé, avec de fortes différences d’une personne à l’autre. C’est pour cela qu’AURA suit le moral et le sommeil de chacun plutôt qu’une moyenne d’équipage.',
      tags: 'isolement moral ennui solitude motivation confinement Mars 520',
      sources: ['basner2013']
    },
    {
      id: 'moral-entretien',
      title: 'Parler de son moral',
      text: 'Les réponses du point quotidien restent entre vous et le médecin. Quand AURA voit une baisse qui dure, il propose simplement d’en parler pendant l’entretien privé de la semaine. Ce n’est ni un diagnostic ni une évaluation de votre travail.',
      tags: 'moral stress déprime tristesse anxiété psychologue entretien privé confidentialité',
      sources: ['aura']
    },
    {
      id: 'mal-espace',
      title: 'Mal de l’espace',
      text: 'Nausées, vertiges et maux de tête sont fréquents pendant les premiers jours en apesanteur, le temps que l’oreille interne et le cerveau s’adaptent. Les symptômes passent en général en quelques jours. Bougez la tête lentement, gardez un repère visuel fixe ; un traitement contre la nausée existe dans la pharmacie de bord.',
      tags: 'nausée vomissement vertige mal de l’espace mal des transports oreille interne',
      sources: ['general'], context: 'transition'
    },
    {
      id: 'dos',
      title: 'Mal de dos en début de vol',
      text: 'Sans pesanteur, la colonne vertébrale s’allonge et les muscles du dos travaillent moins, ce qui donne souvent des douleurs lombaires au début de la mission. Étirements doux, position recroquevillée et exercice soulagent ; un anti-inflammatoire peut être pris à la dose validée.',
      tags: 'dos lombaire colonne vertèbre douleur lombalgie étirement',
      sources: ['general']
    },
    {
      id: 'congestion',
      title: 'Nez bouché et visage gonflé',
      text: 'En apesanteur, une partie des liquides du corps remonte vers le haut du corps et la tête. Le visage paraît gonflé, le nez peut être bouché et les aliments semblent moins goûteux. C’est attendu, surtout pendant les premières semaines.',
      tags: 'nez bouché congestion sinus visage gonflé goût liquides',
      sources: ['general']
    },
    {
      id: 'yeux-corps',
      title: 'Poussière dans l’œil',
      text: 'Rien ne tombe en apesanteur : poussières, miettes et petits débris flottent et finissent souvent dans les yeux. Rincez avec les larmes artificielles ou l’eau prévue, sans frotter. Une douleur qui persiste ou une baisse de la vue doit être signalée au médecin.',
      tags: 'œil yeux poussière corps étranger irritation larmes rincer',
      sources: ['general']
    },
    {
      id: 'sans',
      title: 'Changements de la vision',
      text: 'Lors des longs séjours, certains astronautes développent un syndrome neuro-oculaire : gonflement du nerf optique, aplatissement de l’arrière de l’œil, plis de la choroïde et vision de près moins nette. Signalez tout changement de vue : un examen à bord permet de suivre l’évolution.',
      tags: 'vision vue voir flou œil nerf optique SANS lunettes',
      sources: ['sans2020']
    },
    {
      id: 'os',
      title: 'Perte osseuse',
      text: 'Sans pesanteur, les os qui portent le corps, comme la hanche et la colonne, perdent de leur densité. La norme NASA demande de garder la hanche et la colonne au-dessus de 95 % de leur densité d’avant vol. L’exercice de résistance quotidien est la contre-mesure la mieux documentée.',
      tags: 'os osseux densité fracture hanche colonne calcium exercice résistance',
      sources: ['ochmoBone']
    },
    {
      id: 'rein',
      title: 'Calculs rénaux',
      text: 'La perte osseuse libère du calcium dans les urines et l’on boit souvent moins en vol : le risque de calcul rénal augmente. Buvez régulièrement. Une douleur vive sur le côté du dos ou du ventre doit être signalée tout de suite.',
      tags: 'rein calcul colique douleur flanc urine boire eau hydratation',
      sources: ['general']
    },
    {
      id: 'immunite',
      title: 'Immunité et infections',
      text: 'Le système immunitaire est perturbé en vol. Des virus dormants peuvent se réactiver : le virus de la varicelle a été retrouvé dans la salive d’environ la moitié des astronautes en mission courte et deux tiers en mission longue, le plus souvent sans symptôme. Des allergies nouvelles sont aussi rapportées.',
      tags: 'immunité infection virus varicelle zona allergie défenses',
      sources: ['crucian2018']
    },
    {
      id: 'peau',
      title: 'Irritation ou éruption de la peau',
      text: 'Les réactions de la peau sont fréquentes en vol. Une crème à l’hydrocortisone ou un antihistaminique peuvent soulager. Une éruption douloureuse en bande, d’un seul côté du corps, peut évoquer un zona : signalez-la au médecin.',
      tags: 'peau bouton éruption démangeaison rougeur irritation zona crème',
      sources: ['crucian2018']
    },
    {
      id: 'radiation-transit',
      title: 'Radiations pendant le trajet vers Mars',
      text: 'Pendant le trajet de la sonde Curiosity vers Mars, l’exposition mesurée était d’environ 1,8 mSv par jour. Un aller-retour avec les moyens de propulsion actuels représenterait environ 0,66 Sv. Sur Terre, l’exposition naturelle est de l’ordre de 2 à 3 mSv par an.',
      tags: 'radiation rayonnement dose sievert mSv cosmique trajet transit',
      sources: ['zeitlin2013'], context: 'radiation'
    },
    {
      id: 'radiation-surface',
      title: 'Radiations à la surface de Mars',
      text: 'À la surface de Mars, l’exposition mesurée par Curiosity est d’environ 0,64 mSv par jour, l’atmosphère et la planète elle-même faisant écran. Pour 180 jours d’aller, 500 jours sur place et 180 jours de retour, l’estimation totale est d’environ 1 Sv.',
      tags: 'radiation surface Mars dose rayonnement sievert mSv sol',
      sources: ['hassler2014'], context: 'radiation'
    },
    {
      id: 'radiation-limite',
      title: 'Limite de dose sur une carrière',
      text: 'La NASA limite la dose efficace reçue en vol à 600 mSv sur toute une carrière. Une mission complète vers Mars dépasserait cette limite selon les estimations publiées : c’est un défi connu des missions d’exploration, que le blindage et des trajets plus courts cherchent à réduire.',
      tags: 'limite carrière dose 600 mSv radiation norme cancer',
      sources: ['ochmoRad', 'hassler2014'], context: 'radiation'
    },
    {
      id: 'eruption-solaire',
      title: 'Éruption solaire',
      text: 'Une éruption solaire peut envoyer en quelques heures un flux de particules énergétiques. Le blindage réduit environ de moitié la dose de ces particules, bien moins celle du rayonnement cosmique. En cas d’alerte : rejoindre l’abri, suspendre les sorties et y rester jusqu’à la fin de l’alerte.',
      tags: 'éruption solaire tempête particules abri blindage alerte urgence',
      sources: ['ochmoRad'], context: 'radiation'
    },
    {
      id: 'medicaments-stabilite',
      title: 'Médicaments qui vieillissent à bord',
      text: 'Après 28 mois sur l’ISS, une plus grande part de médicaments avaient une teneur en principe actif plus faible que les mêmes lots gardés au sol. Une autre analyse a trouvé huit médicaments sur neuf conformes, parfois après leur péremption. AURA signale les produits à vérifier selon leur durée à bord et leur date de péremption.',
      tags: 'médicament stabilité péremption puissance efficacité stockage vieillissement',
      sources: ['du2011', 'wotring2015'], context: 'pharmacy'
    },
    {
      id: 'dose-vol',
      title: 'Faut-il changer les doses en vol ?',
      text: 'L’apesanteur change la répartition des liquides et le flux sanguin, et peut modifier l’effet des médicaments, mais les mesures faites chez les astronautes restent rares. AURA ne change jamais une dose seul : le médecin peut valider un facteur de dose, et l’effet noté après chaque prise sert à éclairer cette décision.',
      tags: 'dose posologie comprimé médicament effet efficacité pharmacocinétique augmenter',
      sources: ['dellorusso2022'], context: 'pharmacy'
    },
    {
      id: 'delai-mars',
      title: 'Communiquer avec la Terre depuis Mars',
      text: 'Un message radio met entre 3 et 22 minutes environ pour aller de Mars à la Terre, selon la position des deux planètes. Une question et sa réponse peuvent donc prendre plus de 40 minutes, sans compter le temps de réflexion au sol.',
      tags: 'communication délai Terre message radio liaison sol réponse attente',
      sources: ['general'], context: 'link'
    },
    {
      id: 'conjonction',
      title: 'Conjonction solaire',
      text: 'Tous les 26 mois environ, le Soleil passe entre la Terre et Mars. Les communications sont alors suspendues pendant environ deux semaines. AURA continue de fonctionner à bord et garde les messages en file jusqu’au retour de la liaison.',
      tags: 'conjonction soleil coupure liaison communication blackout deux semaines',
      sources: ['conjonction'], context: 'link'
    },
    {
      id: 'autonomie',
      title: 'Autonomie médicale loin de la Terre',
      text: 'Sur une mission vers Mars, l’équipage ne peut compter ni sur une réponse immédiate du sol ni sur une évacuation. Les outils d’aide à la décision doivent fonctionner à bord, avec l’équipage et le médecin de bord, et laisser la décision à l’humain.',
      tags: 'autonomie EIMO évacuation décision médecin de bord aide',
      sources: ['russell2023']
    },
    {
      id: 'methode-normes',
      title: 'Comment AURA construit ses repères',
      text: 'AURA part de la norme terrestre, ajoute l’effet du vol connu dans la littérature, se recale sur votre référence d’avant le départ, puis s’ajuste chaque jour avec vos mesures en vol. Le contexte du moment (effort, stress, médicament) décale ou élargit ensuite la plage attendue.',
      tags: 'méthode norme repère référence calcul bayésien plage attendue',
      sources: ['aura']
    },
    {
      id: 'garde-fous',
      title: 'Les garde-fous absolus',
      text: 'La personnalisation ne peut jamais masquer une valeur dangereuse. Au-delà de seuils fixes, par exemple 39 °C, une saturation sous 90 % ou un pouls de repos au-dessus de 120, AURA déclenche toujours une alerte, quelle que soit la référence de la personne.',
      tags: 'seuil sécurité danger garde-fou alerte limite fixe',
      sources: ['aura']
    },
    {
      id: 'valeur-isolee',
      title: 'Pourquoi reprendre une mesure',
      text: 'Une valeur très éloignée de vos mesures récentes, sans raison apparente, vient souvent d’un capteur mal placé. AURA demande alors une deuxième mesure avant d’alerter. Si elle confirme, l’alerte part tout de suite.',
      tags: 'reprendre mesure capteur erreur valeur bizarre aberrante',
      sources: ['aura']
    },
    {
      id: 'hors-ligne',
      title: 'Fonctionner sans connexion',
      text: 'Le cœur d’AURA (repères, alertes, actions, pharmacie, file de messages) tourne entièrement à bord, sans internet et sans intelligence artificielle. Une IA peut aider à rédiger ou résumer, mais la plateforme reste utilisable si elle est absente.',
      tags: 'hors connexion internet IA intelligence artificielle autonomie fonctionnement',
      sources: ['aura', 'buras2025']
    },
    {
      id: 'gravite-retour',
      title: 'Retrouver la gravité',
      text: 'Après des mois sans pesanteur, se lever peut provoquer un malaise : le cœur et les vaisseaux ont perdu l’habitude de lutter contre la gravité. Sur Mars, à 0,38 g, les premiers jours demandent de la prudence avant tout effort.',
      tags: 'gravité malaise lever vertige retour atterrissage Mars orthostatique',
      sources: ['general']
    }
  ];

  /* Expressions et synonymes (formes sans accents, en minuscules) */
  const synonyms = [
    ['mal de tete', ['cephalee', 'migraine']],
    ['mal a la tete', ['cephalee', 'migraine']],
    ['cephalee', ['mal de tete']],
    ['fievre', ['temperature', 'chaud']],
    ['temperature', ['fievre']],
    ['chaud', ['temperature', 'chaleur']],
    ['dormir', ['sommeil', 'insomnie', 'nuit']],
    ['dors', ['sommeil', 'insomnie']],
    ['sommeil', ['dormir', 'insomnie']],
    ['fatigue', ['sommeil', 'fatigue']],
    ['radiation', ['rayonnement', 'dose', 'msv']],
    ['radiations', ['rayonnement', 'dose', 'msv']],
    ['rayonnement', ['radiation', 'dose']],
    ['nausee', ['vomissement', 'vertige', 'mal de l espace']],
    ['vomir', ['nausee', 'vomissement']],
    ['vertige', ['nausee', 'mal de l espace']],
    ['dos', ['lombaire', 'colonne']],
    ['yeux', ['oeil']],
    ['oeil', ['yeux']],
    ['vue', ['vision', 'voir']],
    ['flou', ['vision']],
    ['medicament', ['dose', 'comprime']],
    ['comprime', ['dose', 'medicament']],
    ['comprimes', ['dose', 'medicament']],
    ['terre', ['communication', 'liaison', 'message']],
    ['triste', ['moral', 'deprime']],
    ['stresse', ['stress', 'moral']],
    ['seul', ['isolement', 'solitude']],
    ['co2', ['carbone', 'ventilation']],
    ['bouton', ['peau', 'eruption']],
    ['gratte', ['demangeaison', 'peau']],
    ['bouche', ['congestion', 'nez']],
    ['os', ['osseux', 'densite']],
    ['soleil', ['solaire', 'eruption']],
    ['haute', ['elevee', 'hausse']],
    ['haut', ['elevee', 'hausse']],
    ['monte', ['hausse', 'elevee']],
    ['augmente', ['hausse', 'elevee']],
    ['maux de tete', ['cephalee', 'migraine']]
  ];

  return { cards, synonyms };
});
