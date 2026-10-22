/* AURA : données de référence.
   Tout ce qui est fictif ou illustratif est marqué comme tel (champ "fictif"
   ou "illustratif"). Les valeurs tirées de la littérature citent leur source.
   Ce fichier fonctionne dans le navigateur (window.AURA_DATA) et dans Node
   (require), pour que les tests vérifient exactement ce que voit l’équipage. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AURA_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Sources                                                             */
  /* ------------------------------------------------------------------ */
  const SOURCES = {
    stahn2017: {
      label: 'Stahn et al., 2017',
      ref: 'Stahn A.C. et al. « Increased core body temperature in astronauts during long-duration space missions ». Scientific Reports 7, 16180 (2017). 11 astronautes, hausse d’environ 1 °C au repos, plateau après 75 jours.',
      url: 'https://doi.org/10.1038/s41598-017-15560-w'
    },
    law2014: {
      label: 'Law et al., 2014',
      ref: 'Law J. et al. « Relationship between carbon dioxide levels and reported headaches on the International Space Station ». Journal of Occupational and Environmental Medicine, 2014. Les chances de céphalée doublent environ par hausse de 1 mmHg de CO₂.',
      url: 'https://www.newswise.com/articles/in-space-headaches-are-an-occupational-hazard'
    },
    ochmoCo2: {
      label: 'NASA, fiche technique CO₂',
      ref: 'NASA Office of the Chief Health and Medical Officer, fiche OCHMO-TB-004 « Carbon Dioxide ». Exigence NASA-STD-3001 V2 6004 : CO₂ moyen sur une heure limité à 3 mmHg.',
      url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf'
    },
    ochmoRad: {
      label: 'NASA, fiche technique radioprotection',
      ref: 'NASA Office of the Chief Health and Medical Officer, fiche « Radiation Protection ». Exigence NASA-STD-3001 V1 4030 : dose efficace de carrière inférieure à 600 mSv. Le blindage réduit d’environ moitié la dose d’une éruption solaire, mais d’environ 7 % seulement celle du rayonnement cosmique.',
      url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf'
    },
    zeitlin2013: {
      label: 'Zeitlin et al., 2013',
      ref: 'Zeitlin C. et al. « Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory ». Science, 2013. Environ 1,8 mSv par jour en croisière, environ 0,66 Sv pour un aller-retour.',
      url: 'https://www.swri.org/press-release/swri-led-team-calculates-radiation-exposure-associated-trip-mars'
    },
    hassler2014: {
      label: 'Hassler et al., 2014',
      ref: 'Hassler D.M. et al. « Mars’ surface radiation environment measured with the Mars Science Laboratory’s Curiosity rover ». Science, 2014. Environ 0,64 mSv par jour en surface, environ 1,01 Sv pour 180 jours d’aller, 500 jours sur place et 180 jours de retour.',
      url: 'https://ias.universite-paris-saclay.fr/en/node/1424'
    },
    barger2014: {
      label: 'Barger et al., 2014',
      ref: 'Barger L.K. et al. « Prevalence of sleep deficiency and use of hypnotic drugs in astronauts before, during, and after spaceflight ». The Lancet Neurology, 2014. Environ 6 h de sommeil par nuit en mission ; trois quarts des équipages de l’ISS ont pris un médicament pour dormir.',
      url: 'https://www.sciencedaily.com/releases/2014/08/140807215803.htm'
    },
    basner2013: {
      label: 'Basner et al., 2013',
      ref: 'Basner M. et al. « Mars 520-d mission simulation reveals protracted crew hypokinesis and alterations of sleep duration and timing ». PNAS, 2013.',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3574912'
    },
    du2011: {
      label: 'Du et al., 2011',
      ref: 'Du B. et al. « Evaluation of physical and chemical changes in pharmaceuticals flown on space missions ». The AAPS Journal, 2011. 35 formulations, 28 mois sur l’ISS : plus de médicaments à teneur réduite que les témoins restés au sol.',
      url: 'https://sciencedaily.com/releases/2011/04/110414065128.htm'
    },
    wotring2015: {
      label: 'Wotring, 2015',
      ref: 'Wotring V.E. « Chemical potency and degradation products of medications stored over 550 Earth days at the International Space Station ». The AAPS Journal, 2015. Huit médicaments sur neuf conformes ; le seul hors norme, un somnifère en complément alimentaire, a été testé 11 mois après sa péremption.',
      url: 'https://www.sciencedaily.com/releases/2015/11/151110094026.htm'
    },
    dellorusso2022: {
      label: 'Dello Russo et al., 2022',
      ref: 'Dello Russo C. et al. « Physiological adaptations affecting drug pharmacokinetics in space: what do we really know? ». British Journal of Pharmacology, 2022. Les données mesurées chez les astronautes restent rares.',
      url: null
    },
    crucian2018: {
      label: 'Crucian et al., 2018',
      ref: 'Crucian B.E. et al. « Immune system dysregulation during spaceflight: potential countermeasures for deep space exploration missions ». Frontiers in Immunology 9, 1437 (2018).',
      url: 'https://www.frontiersin.org/journals/immunology/articles/10.3389/fimmu.2018.01437/full'
    },
    ochmoBone: {
      label: 'NASA, fiche technique perte osseuse',
      ref: 'NASA Office of the Chief Health and Medical Officer, fiche OCHMO-TB-030 « Bone Loss ». Exigence NASA-STD-3001 V1 4027 : hanche et colonne au moins à 95 % de la densité d’avant vol.',
      url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf'
    },
    sans2020: {
      label: 'Revue SANS, npj Microgravity, 2020',
      ref: 'Revue sur le syndrome neuro-oculaire associé aux vols spatiaux (SANS). npj Microgravity, 2020.',
      url: 'https://www.nature.com/articles/s41526-020-0097-9'
    },
    conjonction: {
      label: 'Conjonction solaire de Mars',
      ref: 'Les communications avec Mars sont suspendues environ deux semaines, tous les 26 mois, quand le Soleil passe entre la Terre et Mars (Space.com, 2015).',
      url: 'https://space.com/29576-nasa-mars-spacecraft-radio-blackout.html'
    },
    russell2023: {
      label: 'Russell et al., 2023',
      ref: 'Russell B.K. et al. Système d’aide à la décision clinique pour les opérations médicales indépendantes de la Terre (EIMO). npj Microgravity, 2023.',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10284846/'
    },
    buras2025: {
      label: 'Buras et Hilmers, 2025',
      ref: 'Buras M. et Hilmers D. Modèles de langage embarqués pour l’assistance médicale en mission. npj Microgravity, 2025.',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12317972/'
    },
    nasaStd3001: {
      label: 'NASA-STD-3001 Vol. 2',
      ref: 'NASA Space Flight Human-System Standard, Volume 2 : facteurs humains, habitabilité et santé environnementale.',
      url: 'https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf'
    },
    aura: {
      label: 'Méthode AURA',
      ref: 'Règle de conception de la plateforme AURA (voir la page À propos).',
      url: null
    },
    general: {
      label: 'Connaissance générale de médecine spatiale',
      ref: 'Notion générale de médecine spatiale, à confirmer par le médecin de bord.',
      url: null
    }
  };

  /* ------------------------------------------------------------------ */
  /* Mission (fictive)                                                   */
  /* ------------------------------------------------------------------ */
  const mission = {
    name: 'Mission de démonstration vers Mars',
    fictif: true,
    durationDays: 900,
    defaultDay: 58,
    defaultMinute: 9 * 60,
    phases: [
      { id: 'aller', label: 'Transit aller', start: 0, end: 180, gravity: 0 },
      { id: 'surface', label: 'Séjour en surface', start: 180, end: 720, gravity: 0.38 },
      { id: 'retour', label: 'Transit retour', start: 720, end: 900, gravity: 0 }
    ],
    // Modèle simplifié du temps de trajet radio (minutes, dans un seul sens)
    light: { atArrival: 12.0, peak: 22.3, atDeparture: 12.0 },
    conjunction: { start: 443, end: 457 },
    // Débit de transmission utilisé pour ordonner la file (ko par minute)
    linkKbPerMin: 900,
    // Changements de gravité qui provoquent souvent un mal de l’espace
    gravityTransitions: [0, 720],
    onboard: [
      'Échographe portable',
      'Analyseur sanguin de base (glycémie, ionogramme, hémoglobine)',
      'Oxymètre, tensiomètre, thermomètre',
      'Défibrillateur et matériel de réanimation de base',
      'Pharmacie de bord (voir Pharmacie)',
      'Dosimètres personnels et moniteur de rayonnement'
    ]
  };

  /* ------------------------------------------------------------------ */
  /* Mesures physiologiques                                              */
  /* popMean/popSd : norme de population (couche 1)                       */
  /* withinSd : variation d’un jour à l’autre et erreur de mesure         */
  /* q : variance de dérive autorisée par jour (adaptation lente)         */
  /* spatial : effet du vol attendu (couche 2)                            */
  /* hard : garde-fous absolus, jamais personnalisés                      */
  /* ------------------------------------------------------------------ */
  const metrics = {
    temp: {
      id: 'temp',
      label: 'Température corporelle',
      short: 'Température',
      lc: 'température',
      unit: '°C',
      decimals: 1,
      step: 0.1,
      popMean: 36.8,
      popSd: 0.35,
      withinSd: 0.22,
      q: 0.0015,
      driftAllow: 0.2,
      spatial: {
        kind: 'exp', max: 1.0, tau: 30, sd: 0.25, source: 'stahn2017',
        crew: 'en apesanteur, la température du corps monte d’environ 1 °C pendant les premières semaines',
        doctor: 'δ(t) = 1,0 °C × (1 − e^(−t/30)), approximation de Stahn et al. (2017) : +1,01 °C au repos, plateau vers J+75'
      },
      terrestrial: {
        low: 36.1, high: 37.4, lowLabel: 'température basse', highLabel: 'fébricule',
        alertHigh: 38.0, alertHighLabel: 'fièvre', alertLow: 35.0, alertLowLabel: 'hypothermie',
        text: 'repère clinique usuel : 36,1 à 37,4 °C, fièvre à partir de 38,0 °C'
      },
      hard: { low: 35.0, high: 39.0 },
      plausible: { min: 30, max: 43 },
      context: {
        effort: { offset: 0.6, tol: 1.6 },
        antipyretique: { offset: 0, tol: 1, mask: true }
      }
    },
    hr: {
      id: 'hr',
      label: 'Fréquence cardiaque au repos',
      short: 'Pouls au repos',
      lc: 'pouls au repos',
      unit: 'bpm',
      decimals: 0,
      step: 1,
      popMean: 68,
      popSd: 9,
      withinSd: 4,
      q: 0.4,
      driftAllow: 5,
      spatial: {
        kind: 'none', max: 0, sd: 4, source: null,
        crew: 'les études ne montrent pas de changement moyen fiable du pouls au repos en vol, votre propre référence compte donc plus que la moyenne',
        doctor: 'aucun décalage moyen retenu (résultats divergents) ; incertitude de ±4 bpm ajoutée à l’entrée en vol'
      },
      terrestrial: {
        low: 60, high: 100, lowLabel: 'bradycardie', highLabel: 'tachycardie',
        alertHigh: 120, alertHighLabel: 'tachycardie marquée', alertLow: 40, alertLowLabel: 'bradycardie marquée',
        text: 'repère clinique usuel : 60 à 100 bpm au repos'
      },
      hard: { low: 40, high: 120 },
      plausible: { min: 25, max: 220 },
      context: {
        effort: { offset: 18, tol: 2.0 },
        stress: { offset: 4, tol: 1.3 }
      }
    },
    spo2: {
      id: 'spo2',
      label: 'Saturation en oxygène',
      short: 'SpO₂',
      lc: 'SpO₂',
      unit: '%',
      decimals: 0,
      step: 1,
      popMean: 97.5,
      popSd: 1.0,
      withinSd: 0.8,
      q: 0.02,
      driftAllow: 1,
      oneSided: 'low',
      spatial: {
        kind: 'none', max: 0, sd: 0.5, source: null,
        crew: 'dans une cabine à pression normale, la saturation ne change pas en moyenne',
        doctor: 'aucun décalage retenu en atmosphère cabine standard ; incertitude de ±0,5 % à l’entrée en vol'
      },
      terrestrial: {
        low: 95, high: 100, lowLabel: 'saturation basse', highLabel: '',
        alertLow: 90, alertLowLabel: 'hypoxémie', alertHigh: null,
        text: 'repère clinique usuel : 95 % ou plus'
      },
      hard: { low: 90, high: null },
      plausible: { min: 50, max: 100 },
      context: {
        effort: { offset: -1, tol: 1.3 }
      }
    }
  };

  const contextLabels = {
    effort: 'Effort physique dans la dernière heure',
    stress: 'Stress ou charge de travail inhabituels',
    antipyretique: 'Médicament contre la fièvre dans les 6 dernières heures'
  };

  /* Actions proposées par mesure et par niveau, dans les deux langages */
  const measureActions = {
    temp: {
      normal: { crew: 'rien de particulier, continuez comme d’habitude.', doctor: 'pas d’action particulière.' },
      vigilance: {
        crew: 'Reprenez la mesure dans 2 heures. Notez si vous avez des frissons, des douleurs ou une fatigue inhabituelle.',
        doctor: 'Recontrôle à H+2. Rechercher un foyer infectieux si la valeur se maintient.'
      },
      urgence: {
        crew: 'Prévenez le médecin de bord maintenant. Reprenez la mesure pour confirmer, buvez et restez au repos.',
        doctor: 'Évaluation clinique immédiate. Bilan infectieux selon les moyens du bord. Antipyrétique à la dose validée.'
      }
    },
    hr: {
      normal: { crew: 'rien de particulier, continuez comme d’habitude.', doctor: 'pas d’action particulière.' },
      vigilance: {
        crew: 'Reposez-vous 10 minutes, assis, puis reprenez la mesure.',
        doctor: 'Recontrôle au repos strict. Croiser avec l’effort récent, le sommeil et le stress.'
      },
      urgence: {
        crew: 'Asseyez-vous ou allongez-vous et prévenez le médecin de bord.',
        doctor: 'Évaluation immédiate : ECG si disponible, recherche de déshydratation, fièvre ou trouble du rythme.'
      }
    },
    spo2: {
      normal: { crew: 'rien de particulier, continuez comme d’habitude.', doctor: 'pas d’action particulière.' },
      vigilance: {
        crew: 'Vérifiez que le capteur est bien placé, réchauffez vos doigts et reprenez la mesure.',
        doctor: 'Contrôle du capteur, puis recontrôle. Vérifier l’atmosphère cabine (ppO₂).'
      },
      urgence: {
        crew: 'Prévenez le médecin de bord. Asseyez-vous et respirez calmement. Oxygène selon la procédure si la valeur reste sous 90 %.',
        doctor: 'Oxygénothérapie selon procédure, auscultation, contrôle de l’atmosphère cabine.'
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /* Habitat                                                             */
  /* ------------------------------------------------------------------ */
  const habitat = {
    co2: {
      label: 'CO₂ cabine',
      unit: 'mmHg',
      limit: 3.0,
      urgent: 6.0,
      sources: ['ochmoCo2', 'law2014'],
      text: 'moyenne sur une heure limitée à 3 mmHg (NASA-STD-3001 V2 6004). Au-delà de 6 mmHg, AURA suppose une panne du système d’épuration (seuil de démonstration).'
    },
    radiation: {
      transit: 1.8,
      surface: 0.64,
      careerLimit: 600,
      speFactor: 10,
      earthYear: 2.5,
      sources: ['zeitlin2013', 'hassler2014', 'ochmoRad']
    }
  };

  /* ------------------------------------------------------------------ */
  /* Équipage (fictif)                                                    */
  /* pre : mesures de référence avant vol (moyenne de n mesures au repos) */
  /* truth : paramètres utilisés seulement pour simuler les capteurs      */
  /* ------------------------------------------------------------------ */
  const crew = [
    {
      id: 'a1', name: 'Aminata Sarr', role: 'Commandante', fictif: true,
      pre: { temp: { mean: 36.7, n: 20 }, hr: { mean: 56, n: 20 }, spo2: { mean: 98.1, n: 20 } },
      truth: { tempRise: 1.05, hr: 57, spo2: 98.0 },
      wb: { mood: 4.1, stress: 2.4, sleep: 6.4, load: 3.2 }
    },
    {
      id: 'a2', name: 'Lucas Moreau', role: 'Ingénieur de vol', fictif: true,
      pre: { temp: { mean: 36.9, n: 20 }, hr: { mean: 63, n: 20 }, spo2: { mean: 97.6, n: 20 } },
      truth: { tempRise: 0.95, hr: 64, spo2: 97.5 },
      wb: { mood: 3.8, stress: 2.8, sleep: 6.1, load: 3.6 }
    },
    {
      id: 'a3', name: 'Keiko Tanaka', role: 'Médecin de bord', fictif: true,
      pre: { temp: { mean: 36.6, n: 20 }, hr: { mean: 59, n: 20 }, spo2: { mean: 98.0, n: 20 } },
      truth: { tempRise: 1.15, hr: 60, spo2: 97.9 },
      wb: { mood: 4.0, stress: 2.6, sleep: 6.3, load: 3.4 },
      sleepDecline: { from: 46, to: 5.1 }
    },
    {
      id: 'a4', name: 'Rafael Ortiz', role: 'Spécialiste scientifique', fictif: true,
      pre: { temp: { mean: 36.8, n: 20 }, hr: { mean: 51, n: 20 }, spo2: { mean: 97.8, n: 20 } },
      truth: { tempRise: 0.85, hr: 52, spo2: 97.7 },
      wb: { mood: 3.9, stress: 2.5, sleep: 6.0, load: 3.3 }
    }
  ];

  /* ------------------------------------------------------------------ */
  /* Pharmacie de démonstration                                           */
  /* units : unité de prise ; dose : unités par prise (facteur 1,0)       */
  /* followUp : minutes avant de demander l’effet ressenti                */
  /* expiryDay : jour de mission où le lot périme                         */
  /* checkAfterDay : jour à partir duquel la puissance est à vérifier      */
  /* ------------------------------------------------------------------ */
  const meds = [
    { id: 'paracetamol', name: 'Paracétamol 500 mg', units: 'comprimé', stock: 340, minStock: 60, dose: 1, maxPerDay: 6, followUp: 60, expiryDay: 1095, checkAfterDay: 548, use: 'Douleur, fièvre' },
    { id: 'ibuprofene', name: 'Ibuprofène 400 mg', units: 'comprimé', stock: 340, minStock: 60, dose: 1, maxPerDay: 3, followUp: 60, expiryDay: 1095, checkAfterDay: 548, use: 'Douleur, inflammation' },
    { id: 'promethazine', name: 'Prométhazine 25 mg injectable', units: 'ampoule', stock: 30, minStock: 8, dose: 1, maxPerDay: 2, followUp: 45, expiryDay: 730, checkAfterDay: 365, use: 'Nausées du mal de l’espace' },
    { id: 'scopolamine', name: 'Scopolamine 1 mg patch', units: 'patch', stock: 20, minStock: 6, dose: 1, maxPerDay: 1, followUp: 240, expiryDay: 730, checkAfterDay: 365, use: 'Prévention du mal de l’espace' },
    { id: 'zolpidem', name: 'Zolpidem 10 mg', units: 'comprimé', stock: 450, minStock: 80, dose: 1, maxPerDay: 1, followUp: 600, expiryDay: 1095, checkAfterDay: 548, use: 'Insomnie (protocole médical)' },
    { id: 'melatonine', name: 'Mélatonine 3 mg', units: 'comprimé', stock: 480, minStock: 80, dose: 1, maxPerDay: 1, followUp: 600, expiryDay: 730, checkAfterDay: 365, use: 'Décalage du rythme veille-sommeil' },
    { id: 'loratadine', name: 'Loratadine 10 mg', units: 'comprimé', stock: 160, minStock: 30, dose: 1, maxPerDay: 1, followUp: 120, expiryDay: 1095, checkAfterDay: 548, use: 'Allergie, démangeaisons' },
    { id: 'pseudoephedrine', name: 'Pseudoéphédrine 60 mg', units: 'comprimé', stock: 140, minStock: 25, dose: 1, maxPerDay: 4, followUp: 60, expiryDay: 1095, checkAfterDay: 548, use: 'Nez bouché' },
    { id: 'amoxicilline', name: 'Amoxicilline et acide clavulanique 1 g', units: 'comprimé', stock: 105, minStock: 30, dose: 1, maxPerDay: 3, followUp: 2880, expiryDay: 730, checkAfterDay: 365, use: 'Infection bactérienne (sur avis médical)' },
    { id: 'ciprofloxacine', name: 'Ciprofloxacine 500 mg', units: 'comprimé', stock: 40, minStock: 14, dose: 1, maxPerDay: 2, followUp: 2880, expiryDay: 1095, checkAfterDay: 548, use: 'Infection urinaire (sur avis médical)' },
    { id: 'omeprazole', name: 'Oméprazole 20 mg', units: 'gélule', stock: 220, minStock: 30, dose: 1, maxPerDay: 1, followUp: 240, expiryDay: 1095, checkAfterDay: 548, use: 'Reflux, brûlures d’estomac' },
    { id: 'loperamide', name: 'Lopéramide 2 mg', units: 'gélule', stock: 60, minStock: 12, dose: 1, maxPerDay: 6, followUp: 240, expiryDay: 1095, checkAfterDay: 548, use: 'Diarrhée' },
    { id: 'hydrocortisone', name: 'Hydrocortisone crème 1 %', units: 'tube', stock: 14, minStock: 3, dose: 1, maxPerDay: 1, followUp: 1440, expiryDay: 730, checkAfterDay: 365, use: 'Irritation de la peau' },
    { id: 'collyre', name: 'Larmes artificielles', units: 'unidose', stock: 100, minStock: 20, dose: 1, maxPerDay: 6, followUp: 30, expiryDay: 730, checkAfterDay: 365, use: 'Œil irrité, corps étranger' }
  ];

  /* ------------------------------------------------------------------ */
  /* Planification de la pharmacie (Monte Carlo)                          */
  /* Taux ILLUSTRATIFS : épisodes par personne et par an. À remplacer par */
  /* les données du modèle IMM et de la surveillance LSAH.                */
  /* ------------------------------------------------------------------ */
  const conditions = [
    { id: 'cephalee', label: 'Maux de tête', rate: 6, meds: [{ med: 'paracetamol', min: 1, max: 4 }] },
    { id: 'fievre', label: 'Fièvre, syndrome grippal', rate: 0.6, meds: [{ med: 'paracetamol', min: 4, max: 12 }] },
    { id: 'dos', label: 'Douleurs dorsales', rate: 1.5, meds: [{ med: 'ibuprofene', min: 3, max: 12 }] },
    { id: 'musculaire', label: 'Douleurs musculaires, entorses', rate: 1.2, meds: [{ med: 'ibuprofene', min: 3, max: 10 }] },
    { id: 'insomnie', label: 'Nuits difficiles traitées', rate: 40, meds: [{ med: 'zolpidem', min: 1, max: 1 }] },
    { id: 'rythme', label: 'Décalage du rythme de sommeil', rate: 30, meds: [{ med: 'melatonine', min: 1, max: 1 }] },
    { id: 'congestion', label: 'Nez bouché', rate: 2, meds: [{ med: 'pseudoephedrine', min: 2, max: 6 }] },
    { id: 'allergie', label: 'Allergie, irritation cutanée', rate: 1, meds: [{ med: 'loratadine', min: 3, max: 10 }, { med: 'hydrocortisone', min: 0, max: 1 }] },
    { id: 'infection', label: 'Infection bactérienne', rate: 0.15, meds: [{ med: 'amoxicilline', min: 14, max: 21 }] },
    { id: 'urinaire', label: 'Infection urinaire', rate: 0.1, meds: [{ med: 'ciprofloxacine', min: 6, max: 14 }] },
    { id: 'reflux', label: 'Reflux', rate: 1, meds: [{ med: 'omeprazole', min: 7, max: 14 }] },
    { id: 'diarrhee', label: 'Diarrhée', rate: 0.5, meds: [{ med: 'loperamide', min: 2, max: 6 }] },
    { id: 'oeil', label: 'Œil irrité, corps étranger', rate: 1.2, meds: [{ med: 'collyre', min: 2, max: 6 }] },
    { id: 'malespace', label: 'Mal de l’espace (par changement de gravité)', perTransition: 0.6, meds: [{ med: 'promethazine', min: 1, max: 3 }, { med: 'scopolamine', min: 0, max: 2 }] }
  ];

  const planningScenarios = {
    optimiste: { label: 'Optimiste', multiplier: 0.7 },
    median: { label: 'Médian', multiplier: 1.0 },
    pessimiste: { label: 'Pessimiste', multiplier: 1.4 }
  };

  /* ------------------------------------------------------------------ */
  /* Symptômes que l’équipage peut signaler                               */
  /* ------------------------------------------------------------------ */
  const symptoms = [
    { id: 'cephalee', label: 'Mal de tête', meds: ['paracetamol', 'ibuprofene'], kb: ['co2-cephalee', 'sommeil-vol'] },
    { id: 'nausee', label: 'Nausées, vertiges', meds: ['promethazine', 'scopolamine'], kb: ['mal-espace'] },
    { id: 'dos', label: 'Mal de dos', meds: ['ibuprofene', 'paracetamol'], kb: ['dos'] },
    { id: 'sommeil', label: 'Difficultés à dormir', meds: ['melatonine', 'zolpidem'], kb: ['sommeil-vol', 'sommeil-conseils'] },
    { id: 'oeil', label: 'Gêne ou poussière dans l’œil', meds: ['collyre'], kb: ['yeux-corps'] },
    { id: 'vision', label: 'Changement de la vision', meds: [], kb: ['sans'] },
    { id: 'nez', label: 'Nez bouché, visage gonflé', meds: ['pseudoephedrine'], kb: ['congestion'] },
    { id: 'peau', label: 'Irritation ou éruption de la peau', meds: ['hydrocortisone', 'loratadine'], kb: ['peau', 'immunite'] },
    { id: 'fievre', label: 'Sensation de fièvre', meds: ['paracetamol'], kb: ['temp-vol', 'fievre-vraie'] },
    { id: 'moral', label: 'Moral bas, irritabilité', meds: [], kb: ['moral-entretien', 'isolement-mars500', 'co2-autres'] }
  ];

  /* ------------------------------------------------------------------ */
  /* Procédures d’urgence (procédures de démonstration)                   */
  /* ------------------------------------------------------------------ */
  const protocols = {
    spe: {
      title: 'Éruption solaire',
      steps: [
        'Rejoindre l’abri anti-rayonnement (zone la plus blindée du véhicule)',
        'Suspendre toute sortie extravéhiculaire en cours ou prévue',
        'Vérifier que chacun porte son dosimètre personnel',
        'Rester à l’abri tant que le débit de dose reste au-dessus du seuil',
        'Noter la dose reçue par chaque membre d’équipage'
      ]
    },
    vital: {
      title: 'Valeur vitale critique',
      steps: [
        'Reprendre la mesure pour confirmer',
        'Évaluer la conscience et la respiration',
        'Prévenir le médecin de bord',
        'Appliquer la procédure médicale correspondante',
        'Envoyer un message prioritaire au sol'
      ]
    },
    co2: {
      title: 'CO₂ cabine critique',
      steps: [
        'Vérifier le système d’épuration du CO₂',
        'Rejoindre un module mieux ventilé',
        'Limiter l’effort physique',
        'Surveiller maux de tête, essoufflement et confusion',
        'Envoyer un message prioritaire au sol'
      ]
    }
  };

  /* ------------------------------------------------------------------ */
  /* Démonstration guidée : les six scénarios                             */
  /* ------------------------------------------------------------------ */
  const scenarios = [
    {
      id: 's1', title: 'Préparer la pharmacie avant le départ', route: '#/planification',
      shows: 'Mille missions simulées en quelques millisecondes : AURA estime ce que l’équipage risque de consommer et repère les médicaments dont le stock ne couvre pas un scénario défavorable.',
      look: 'La colonne « Risque de rupture » en scénario pessimiste.'
    },
    {
      id: 's2', title: 'Une fièvre qui n’en est pas une', route: '#/saisie',
      shows: 'Lucas Moreau mesure 38,1 °C au réveil, à J+70. Sur Terre, c’est une fièvre. À bord, après dix semaines de vol, c’est sa température normale.',
      look: 'La règle de lecture : la bande grise (norme terrestre) contre la bande violette (référence AURA).'
    },
    {
      id: 's3', title: 'Mal de tête : chercher la cause dans la cabine', route: '#/saisie',
      shows: 'Rafael Ortiz signale un mal de tête à J+30. AURA croise le symptôme avec le CO₂ de la cabine, au-dessus de la limite depuis plusieurs heures.',
      look: 'La première action proposée : vérifier la ventilation, avant l’antalgique.'
    },
    {
      id: 's4', title: 'Éruption solaire', route: '#/alertes',
      shows: 'Le débit de dose est multiplié par quarante. AURA passe en mode urgence, affiche la procédure et met un message prioritaire en tête de la file vers la Terre.',
      look: 'Le bandeau rouge sur toutes les pages et l’heure d’arrivée du message au sol.'
    },
    {
      id: 's5', title: 'Conférence médicale de la semaine', route: '#/conference',
      shows: 'La synthèse de la semaine se prépare sans intelligence artificielle, à partir du journal : tendances, alertes, médicaments, sommeil, points à discuter.',
      look: 'Les points à discuter, dont le sommeil de Keiko Tanaka.'
    },
    {
      id: 's6', title: 'Conjonction solaire : deux semaines sans la Terre', route: '#/liaison',
      shows: 'À J+446, le Soleil coupe la liaison. AURA continue de tout calculer à bord et garde les messages en file jusqu’au retour du signal.',
      look: 'La file d’attente bloquée, puis vidée par ordre de priorité quand vous avancez le temps.'
    }
  ];

  /* Données réelles prévues pour la suite (bibliographie de l’équipe) */
  const realData = [
    { name: 'NASA Life Sciences Data Archive (LSDA)', use: 'données physiologiques d’équipages réels pour calibrer les effets du vol', url: 'https://lsda.jsc.nasa.gov/' },
    { name: 'NASA Open Science Data Repository (OSDR)', use: 'données multi-omiques et physiologiques, dont la mission civile Inspiration4', url: 'https://osdr.nasa.gov/bio/data/' },
    { name: 'PhysioNet, jeu BIDMC (PPG et SpO₂)', use: 'signaux de capteurs portés pour tester la chaîne de mesure', url: 'https://physionet.org/content/bidmc/1.0.0/' },
    { name: 'NASA-STD-3001', use: 'seuils et exigences de santé (CO₂, radiation, os)', url: 'https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf' }
  ];

  return {
    SOURCES, mission, metrics, contextLabels, measureActions, habitat, crew, meds,
    conditions, planningScenarios, symptoms, protocols, scenarios, realData
  };
});
