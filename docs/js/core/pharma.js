/* AURA : pharmacie et matériel de bord (démonstration).
   Les noms suivent la liste des médicaments de l'ISS citée par les fiches
   (données de 2023). Les quantités, les dates de péremption et les unités
   sont illustratives : la pharmacie réelle de la mission les remplacera.
   Aucune dose n'est donnée : elles viennent des procédures de la NASA. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AURA_PHARMA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // [id, nom affiché, synonymes, classe, voie, endort, stock, stock minimum, jour de péremption]
  // voie : oral, injectable, cutane, oculaire, nasal, inhale, auriculaire, materiel
  const ROWS = [
    ['paracetamol', 'Paracétamol', ['paracétamol', 'acétaminophène'], 'Douleur, fièvre', 'oral', false, 340, 60, 1095],
    ['ibuprofene', 'Ibuprofène', ['ibuprofène'], 'Douleur, inflammation', 'oral', false, 340, 60, 1095],
    ['naproxene', 'Naproxène', ['naproxène'], 'Douleur, inflammation', 'oral', false, 120, 20, 1095],
    ['ketorolac', 'Kétorolac', ['kétorolac'], 'Douleur forte', 'injectable', false, 30, 8, 730],
    ['aspirine', 'Aspirine', ['aspirine'], 'Douleur thoracique, sur décision médicale', 'oral', false, 100, 20, 1095],
    ['hydrocodone', 'Hydrocodone et paracétamol', ['hydrocodone', 'antalgique plus fort'], 'Douleur forte', 'oral', true, 40, 10, 1095],
    ['hydromorphone', 'Hydromorphone', ['hydromorphone', 'opioïde', 'opioïdes'], 'Douleur très forte', 'injectable', true, 20, 6, 730],
    ['naloxone', 'Naloxone', ['naloxone'], 'Surdosage d\'opioïde', 'injectable', false, 10, 4, 730],
    ['lidocaine', 'Lidocaïne', ['lidocaïne'], 'Anesthésie locale', 'injectable', false, 20, 6, 730],
    ['tetracaine', 'Tétracaïne collyre', ['tétracaïne'], 'Anesthésie de l\'œil', 'oculaire', false, 20, 6, 545],
    ['benzocaine', 'Benzocaïne', ['benzocaïne'], 'Douleur de la bouche', 'cutane', false, 10, 3, 1095],
    ['eugenol', 'Eugénol', ['eugénol'], 'Douleur dentaire', 'cutane', false, 6, 2, 1095],
    ['promethazine', 'Prométhazine', ['prométhazine'], 'Nausées', 'injectable', true, 30, 8, 730],
    ['meclizine', 'Méclizine', ['méclizine'], 'Nausées, mal des transports', 'oral', true, 60, 12, 1095],
    ['ondansetron', 'Ondansétron', ['ondansétron'], 'Nausées', 'oral', false, 60, 12, 1095],
    ['diphenhydramine', 'Diphénhydramine', ['diphénhydramine'], 'Allergie, sommeil', 'oral', true, 60, 12, 1095],
    ['loratadine', 'Loratadine', ['loratadine', 'antihistaminique'], 'Allergie, démangeaisons', 'oral', false, 160, 30, 1095],
    ['fexofenadine', 'Fexofénadine', ['fexofénadine'], 'Allergie', 'oral', false, 60, 12, 1095],
    ['olopatadine', 'Olopatadine collyre', ['olopatadine'], 'Allergie de l\'œil', 'oculaire', false, 10, 3, 545],
    ['pseudoephedrine', 'Pseudoéphédrine', ['pseudoéphédrine'], 'Nez bouché', 'oral', false, 140, 25, 1095],
    ['oxymetazoline', 'Oxymétazoline spray nasal', ['oxymétazoline'], 'Nez bouché, saignement de nez', 'nasal', false, 20, 5, 1095],
    ['mometasone', 'Mométasone spray nasal', ['mométasone'], 'Nez bouché', 'nasal', false, 12, 3, 730],
    ['salbutamol', 'Salbutamol inhalé', ['salbutamol'], 'Respiration sifflante', 'inhale', false, 8, 2, 730],
    ['benzonatate', 'Benzonatate', ['benzonatate'], 'Toux', 'oral', false, 60, 12, 1095],
    ['adrenaline', 'Adrénaline (trousse d\'urgence)', ['adrénaline', 'épinéphrine'], 'Allergie grave', 'injectable', false, 12, 4, 545],
    ['methylprednisolone', 'Méthylprednisolone', ['méthylprednisolone'], 'Inflammation grave, allergie grave', 'injectable', false, 12, 4, 730],
    ['prednisone', 'Prednisone', ['prednisone', 'corticoïde', 'corticoïdes'], 'Inflammation', 'oral', false, 60, 12, 1095],
    ['dexamethasone', 'Dexaméthasone', ['dexaméthasone'], 'Inflammation, mal d\'altitude', 'oral', false, 40, 10, 1095],
    ['hydrocortisone', 'Hydrocortisone crème', ['hydrocortisone'], 'Irritation de la peau', 'cutane', false, 14, 3, 730],
    ['fluocinonide', 'Fluocinonide crème', ['fluocinonide'], 'Inflammation de la peau', 'cutane', false, 6, 2, 730],
    ['amoxicilline', 'Amoxicilline et acide clavulanique', ['amoxicilline', 'augmentin'], 'Infection bactérienne', 'oral', false, 105, 30, 730],
    ['azithromycine', 'Azithromycine', ['azithromycine'], 'Infection respiratoire', 'oral', false, 30, 9, 1095],
    ['ciprofloxacine', 'Ciprofloxacine', ['ciprofloxacine'], 'Infection urinaire, intestinale', 'oral', false, 40, 14, 1095],
    ['levofloxacine', 'Lévofloxacine', ['lévofloxacine'], 'Infection', 'oral', false, 30, 10, 1095],
    ['moxifloxacine', 'Moxifloxacine', ['moxifloxacine'], 'Infection', 'oral', false, 20, 6, 1095],
    ['ceftriaxone', 'Ceftriaxone', ['ceftriaxone'], 'Infection grave', 'injectable', false, 20, 6, 730],
    ['clindamycine', 'Clindamycine', ['clindamycine'], 'Infection de la peau, dentaire', 'oral', false, 40, 12, 1095],
    ['doxycycline', 'Doxycycline', ['doxycycline'], 'Infection', 'oral', false, 40, 12, 1095],
    ['metronidazole', 'Métronidazole', ['métronidazole'], 'Infection du ventre', 'oral', false, 40, 12, 1095],
    ['nitrofurantoine', 'Nitrofurantoïne', ['nitrofurantoïne'], 'Infection urinaire', 'oral', false, 40, 12, 1095],
    ['sulfamethoxazole', 'Sulfaméthoxazole et triméthoprime', ['sulfaméthoxazole', 'triméthoprime'], 'Infection urinaire, peau', 'oral', false, 40, 12, 1095],
    ['erythromycine', 'Érythromycine pommade', ['érythromycine'], 'Infection de l\'œil', 'oculaire', false, 8, 2, 730],
    ['tobramycine', 'Tobramycine collyre', ['tobramycine'], 'Infection de l\'œil', 'oculaire', false, 8, 2, 545],
    ['mupirocine', 'Mupirocine pommade', ['mupirocine'], 'Infection de la peau', 'cutane', false, 8, 2, 730],
    ['bacitracine', 'Bacitracine pommade', ['bacitracine'], 'Plaie', 'cutane', false, 10, 3, 730],
    ['fluconazole', 'Fluconazole', ['fluconazole'], 'Mycose', 'oral', false, 12, 4, 1095],
    ['clotrimazole', 'Clotrimazole crème', ['clotrimazole'], 'Mycose', 'cutane', false, 8, 2, 1095],
    ['valaciclovir', 'Valaciclovir', ['valaciclovir'], 'Zona, herpès', 'oral', false, 42, 21, 1095],
    ['omeprazole', 'Oméprazole', ['oméprazole'], 'Reflux, brûlures d\'estomac', 'oral', false, 220, 30, 1095],
    ['famotidine', 'Famotidine', ['famotidine'], 'Reflux', 'oral', false, 60, 12, 1095],
    ['loperamide', 'Lopéramide', ['lopéramide'], 'Diarrhée', 'oral', false, 60, 12, 1095],
    ['bisacodyl', 'Bisacodyl', ['bisacodyl'], 'Constipation', 'oral', false, 60, 12, 1095],
    ['tamsulosine', 'Tamsulosine', ['tamsulosine'], 'Calcul rénal, difficulté à uriner', 'oral', false, 30, 10, 1095],
    ['acetazolamide', 'Acétazolamide', ['acétazolamide'], 'Glaucome, mal d\'altitude', 'oral', false, 30, 10, 1095],
    ['nitroglycerine', 'Nitroglycérine', ['nitroglycérine', 'nitrate', 'nitrés'], 'Douleur thoracique', 'oral', false, 25, 8, 545],
    ['metoprolol', 'Métoprolol', ['métoprolol'], 'Rythme cardiaque rapide', 'oral', false, 60, 12, 1095],
    ['lisinopril', 'Lisinopril', ['lisinopril'], 'Hypertension', 'oral', false, 60, 12, 1095],
    ['zolpidem', 'Zolpidem', ['zolpidem', 'somnifère', 'somnifères'], 'Insomnie (sur avis médical)', 'oral', true, 450, 80, 1095],
    ['melatonine', 'Mélatonine', ['mélatonine'], 'Rythme du sommeil', 'oral', true, 480, 80, 730],
    ['modafinil', 'Modafinil', ['modafinil'], 'Vigilance (sur avis médical)', 'oral', false, 30, 8, 1095],
    ['lorazepam', 'Lorazépam', ['lorazépam', 'benzodiazépine'], 'Anxiété aiguë, convulsions', 'oral', true, 30, 8, 1095],
    ['diazepam', 'Diazépam', ['diazépam'], 'Convulsions, spasmes', 'injectable', true, 20, 6, 730],
    ['sertraline', 'Sertraline', ['sertraline'], 'Dépression, anxiété (sur avis médical)', 'oral', false, 90, 30, 1095],
    ['venlafaxine', 'Venlafaxine', ['venlafaxine'], 'Dépression (sur avis médical)', 'oral', false, 60, 20, 1095],
    ['aripiprazole', 'Aripiprazole', ['aripiprazole', 'ziprasidone'], 'Urgence psychiatrique (sur avis médical)', 'oral', true, 20, 6, 1095],
    ['vitamine_d', 'Vitamine D', ['vitamine d', 'vitamine'], 'Os, nutrition', 'oral', false, 900, 120, 1095],
    ['fluoresceine', 'Fluorescéine', ['fluorescéine'], 'Examen de l\'œil', 'oculaire', false, 20, 5, 730],
    ['larmes', 'Larmes artificielles', ['larmes artificielles', 'collyre', 'rincer'], 'Œil irrité, corps étranger', 'oculaire', false, 100, 20, 730],
    ['carbamide', 'Peroxyde de carbamide', ['carbamide'], 'Bouchon de cérumen', 'auriculaire', false, 6, 2, 1095],
    // Matériel : vérifié comme un médicament (R-TRT-07, R-MAT-01)
    ['echographe', 'Échographe portable', ['échographie', 'échographe'], 'Imagerie', 'materiel', false, 1, 1, 99999],
    ['defibrillateur', 'Défibrillateur', ['défibrillateur'], 'Réanimation', 'materiel', false, 1, 1, 99999],
    ['oxygene', 'Oxygène médical', ['oxygène'], 'Respiration', 'materiel', false, 18, 4, 99999],
    ['ecg', 'Électrocardiographe', ['ecg', 'électrocardiogramme'], 'Rythme cardiaque', 'materiel', false, 1, 1, 99999],
    ['attelle', 'Attelles', ['attelle', 'attelles'], 'Immobilisation', 'materiel', false, 6, 2, 99999],
    ['perfusion', 'Matériel de perfusion', ['perfusion'], 'Perfusion', 'materiel', false, 20, 6, 1095],
    ['masques', 'Masques de protection', ['masque', 'masques'], 'Fumée, produits toxiques', 'materiel', false, 12, 6, 99999],
    ['pansements', 'Pansements et compresses', ['pansement', 'pansements', 'compresses', 'compresse'], 'Plaie', 'materiel', false, 120, 30, 1825]
  ];
  const meds = ROWS.map(r => ({
    id: r[0], name: r[1], syn: r[2], use: r[3], route: r[4], drowsy: r[5], stock: r[6], minStock: r[7],
    expiryDay: r[8], checkAfterDay: r[8] >= 99999 ? 99999 : Math.round(r[8] / 2),
    units: r[4] === 'materiel' ? 'unité' : r[4] === 'injectable' ? 'ampoule' : r[4] === 'oral' ? 'comprimé' : 'unité',
    dose: 1, maxPerDay: 4, followUp: 60, illustratif: true
  }));
  return { meds };
});
