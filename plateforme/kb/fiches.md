# AURA : fiches et règles de la base de connaissances

Oct 31, 2026 · @Papa

Ce document explique ce qu'AURA sait en médecine et comment il s'en sert pour aider un équipage loin de la Terre. Il réunit 117 fiches de maladies et les règles de décision du logiciel, tirées des données de vol de la NASA, de la recherche sur la santé dans l'espace et de la médecine clinique sur Terre. Chaque information cite sa source, et ce qui manque encore est dit clairement, pour que la NASA puisse compléter la base sans toucher au logiciel.

## En bref

AURA aide un équipage à prendre soin de sa santé quand la Terre est loin, en s'appuyant sur une base de connaissances ouverte et sourcée.

- **117 fiches de maladies.** Elles couvrent les 100 conditions de la liste médicale de référence de la NASA (le modèle IMM), et 17 conditions décrites depuis par la NASA ou par des études de vol.
- **Des règles de décision en neuf familles** : urgences, mesures du corps, environnement du vaisseau, raisonnement, traitement, communication et confidentialité, pharmacie, apprentissage et gouvernance.
- **Trois familles de sources** : les données de vol de la NASA, la recherche sur la santé dans l'espace et la médecine clinique sur Terre.
- **Cinq statuts** pour dire d'où vient chaque information : publiée en vol, publiée sur Terre, choix d'AURA, à fournir par la NASA, ou encore inconnue.
- **Une règle d'or** : AURA propose, le responsable médical de bord décide, et le sol conseille quand il peut répondre.

Le document a trois parties. La première explique la base et ses règles, et se lit d'une traite. La deuxième contient les fiches, à consulter comme un manuel. La troisième, l'annexe technique, s'adresse aux développeurs et aux ingénieurs de la NASA.

## Pourquoi AURA a besoin d'une base de connaissances

Plus un équipage s'éloigne de la Terre, moins il peut compter sur un médecin au sol. AURA doit donc savoir à bord ce que l'équipage ne pourra plus demander à temps.

Sur la Station spatiale internationale, un médecin de vol suit chaque astronaute, la liaison est presque instantanée, et un retour sur Terre reste possible. Vers Mars, tout change. Un message met entre 3 et 22 minutes environ pour arriver. La liaison se coupe pendant environ deux semaines tous les 26 mois, quand le Soleil passe entre les deux planètes. Et aucune évacuation n'est possible.

La norme de la NASA demande alors des moyens de soins médicaux autonomes à bord (NASA-STD-3001, exigence V1 3004). Le responsable médical de l'équipage n'est pas forcément médecin. AURA ne le remplace pas : il lui apporte ce qu'un médecin au sol lui apporterait.

- Quelles maladies sont possibles, et lesquelles sont les plus probables.
- Comment les distinguer, et quels signes doivent inquiéter.
- Que faire avec ce qui est réellement à bord.
- Quand alerter le sol, et que faire s'il ne peut pas répondre.

La base de connaissances est cette mémoire. Elle doit être juste, donc sourcée ; complète, pour couvrir ce qui peut arriver ; ouverte, pour que la NASA la complète ; et honnête, en disant ce qu'elle ne sait pas.

## D'où viennent les connaissances

La base combine trois familles de sources, et chaque information garde la trace de la sienne.

| Famille | Ce qu'elle apporte | Exemples |
| --- | --- | --- |
| Données de vol de la NASA | Quelles maladies arrivent en mission, à quelle fréquence, et quelles limites de sécurité respecter | Liste IMM de 100 conditions et leurs probabilités (2015), norme NASA-STD-3001, limites des polluants de l'air (2024), procédures d'urgence de l'ISS |
| Recherche sur la santé dans l'espace | Ce que l'apesanteur change au corps, au sommeil et aux médicaments | Hausse de la température en vol, mal de l'espace, thrombose de la veine jugulaire, péremption des médicaments, isolement pendant Mars-520 |
| Médecine clinique sur Terre | Comment reconnaître une maladie à partir des signes, et comment soigner sans médecin | Valeur mesurée des signes cliniques (série « The Rational Clinical Examination » du JAMA), score d'alerte NEWS2, guide médical de l'OMS pour les navires, soins prolongés de l'armée américaine |

Chaque information porte l'un des cinq statuts suivants. Il dit d'où elle vient et ce qu'AURA en fait.

| Statut | Ce que cela veut dire | Ce que fait AURA |
| --- | --- | --- |
| Publié (vol) | Mesuré chez des astronautes ou fixé par la NASA, dans une source publique | Utilisé tel quel |
| Publié (Terre) | Mesuré chez des patients sur Terre | Utilisé, avec une note sur ce qui peut changer en apesanteur |
| Choix AURA | Décision de l'équipe AURA, raisonnable mais pas encore validée | Utilisé, avec la mention « à valider » pour le médecin |
| À fournir par la NASA | Existe à la NASA mais n'est pas public : fiches CliFF, procédures médicales de bord, stocks réels, dossiers médicaux | Valeur de repli, signalée comme telle |
| Inconnu | Personne ne connaît encore la valeur, faute de données | Incertitude large, décision laissée à l'humain |

Une donnée terrestre ne passe pas telle quelle dans l'espace. En apesanteur, les liquides du corps remontent vers la tête, et la température au repos monte d'environ 1 °C. C'est pourquoi les données mesurées sur Terre ont leur propre statut.

## Comment AURA raisonne

AURA suit toujours le même chemin : d'abord l'urgence, puis l'environnement, puis un calcul de probabilités. La décision finale revient toujours à un humain.

&#91;embedded content: chemin de décision · 8 étapes\]

1. **Les signes d'alarme passent en premier.** Douleur dans la poitrine, difficulté à respirer, faiblesse d'un côté du corps : un seul suffit pour déclencher l'alerte, sans aucun calcul.
2. **L'environnement est vérifié.** Si le CO₂ ou l'oxygène de la cabine sort des limites, AURA cherche la cause dans l'air avant de la chercher dans le corps.
3. **On part des fréquences.** Chaque maladie possible reçoit une probabilité de départ, tirée de la liste IMM de la NASA.
4. **Chaque signe change les chances.** Un rapport de vraisemblance dit combien de fois un signe est plus fréquent chez les malades que chez les autres. Au-dessus de 1, il rapproche du diagnostic ; en dessous de 1, il en éloigne.
5. **AURA pose la question la plus utile**, celle qui réduit le plus l'incertitude, puis recalcule. Il s'arrête quand une maladie atteint 80 %, quand plus aucune question n'aide, ou après 8 questions.
6. **Le traitement passe six vérifications.** Le produit est-il à bord, en quantité suffisante et encore bon ? Le geste est-il faisable en apesanteur ? Gêne-t-il une tâche prévue ? Quand le sol pourra-t-il répondre ?
7. **Un humain décide.** AURA parle d'orientation, jamais de diagnostic. Le responsable médical de bord choisit, et le sol conseille quand il peut répondre.

### Un exemple chiffré

Une astronaute a des brûlures en urinant et des envies fréquentes, sans pertes ni irritation vaginales. Chez une femme qui a au moins un symptôme urinaire, la probabilité d'infection est d'environ 50 % (Bent 2002).

Cette combinaison de signes a un rapport de vraisemblance de 24,6. Les chances passent de 1 contre 1 à 24,6 contre 1, soit 96 %. AURA s'arrête là et propose le traitement de la fiche « infection urinaire », après les six vérifications.

Quand aucune étude ne donne la valeur d'un signe, AURA utilise une échelle en mots : très typique, fréquent, possible, rare. Ces mots sont traduits en nombres et marqués « choix AURA », jusqu'à ce qu'une valeur publiée les remplace.

## Ce que la médecine clinique apporte

Trois apports de la médecine sur Terre rendent AURA plus fiable : la valeur mesurée des signes cliniques, un score d'alerte validé, et l'expérience des soins donnés sans médecin. Les données de la NASA disent quelles maladies arrivent ; la médecine clinique dit comment les reconnaître.

### La valeur mesurée des signes

Depuis le début des années 1990, la série « The Rational Clinical Examination » du JAMA mesure à quel point un signe de l'interrogatoire ou de l'examen annonce un diagnostic. Ces rapports de vraisemblance sont exactement ce dont le calcul d'AURA a besoin. Le tableau rassemble ceux qui répondent aux questions les plus importantes à bord.

| Question à bord | Signe | Rapport de vraisemblance | Source |
| --- | --- | --- | --- |
| Infection urinaire chez une femme | Brûlures et envies fréquentes, sans pertes ni irritation vaginales | 24,6 | Bent 2002 |
| Infection urinaire chez une femme | Pertes vaginales ; irritation vaginale | 0,3 ; 0,2 | Bent 2002 |
| Appendicite | Douleur en bas à droite du ventre | 8,4 (absente : 0,18) | Ebell 2008 |
| Appendicite | Douleur partie du nombril qui descend en bas à droite | 3,6 | Ebell 2008 |
| Appendicite | Fièvre | 3,2 (absente : 0,42) | Ebell 2008 |
| Appendicite | Douleur apparue avant les vomissements | 2,7 | Ebell 2008 |
| Infarctus | Douleur qui irradie dans les deux bras | 7,1 | Panju 1998 |
| Infarctus | Douleur augmentée par la respiration, douleur piquante, ou reproduite en appuyant | 0,2 à 0,4 | Panju 1998 |
| AVC | Au moins un des trois signes : visage qui tombe, bras qui retombe, parole anormale | 5,5 (aucun : 0,39) | Goldstein et Simel 2005 |
| Angine à streptocoque | Dépôts blancs sur les amygdales | 3,4 | Ebell 2000 |
| Angine à streptocoque | Pas de ganglion douloureux au cou | 0,6 | Ebell 2000 |

Trois règles cliniques complètent ce tableau :

- **Cheville ou pied tordu.** Les règles d'Ottawa détectent 97,6 % des fractures. Quand elles sont négatives, moins de 2 % des patients ont une fracture (Bachmann 2003).
- **Mal de gorge.** Le score de McIsaac compte la fièvre, les ganglions du cou, les dépôts sur les amygdales et l'absence de toux, avec un ajustement selon l'âge. À 4 points ou plus, 55 % des patients ont une angine à streptocoque ; à 2 ou 3 points, 29 % ; à 1 point ou moins, 12 % (Ebell 2014).
- **Mal de tête avec fièvre.** La fièvre est présente dans 85 % des méningites et la raideur de nuque dans 70 %. Sans fièvre, sans raideur de nuque et sans trouble de la conscience, une méningite est très peu probable (Attia 1999).

AURA multiplie les chances de départ par le rapport de chaque signe. Pour une douleur du ventre avec 10 % de chances d'appendicite au départ, une douleur en bas à droite porte la probabilité à 48 %. La fièvre la porte ensuite à 75 %, et une douleur apparue avant les vomissements à 89 %.

Ce calcul suppose que les signes sont indépendants, ce qui n'est jamais tout à fait vrai. Et ces chiffres viennent surtout de patients des urgences sur Terre, pas d'astronautes. Ils restent la meilleure base disponible, mais portent le statut « Publié (Terre) », et AURA affiche une orientation, jamais une certitude.

### Un score d'alerte validé : NEWS2

Le Royal College of Physicians britannique a publié en 2017 le score NEWS2. Il compte des points sur sept éléments : fréquence respiratoire, saturation en oxygène, tension artérielle, pouls, état de conscience, température et oxygène d'appoint. À 5 ou 6 points, il demande un avis urgent ; à 7 ou plus, une prise en charge d'urgence. Un seul élément à 3 points demande aussi un avis urgent.

AURA reprend ce score pour sa règle d'alerte, avec deux adaptations. La température est corrigée de la hausse liée au vol avant de compter les points. Et tant que les capteurs ne donnent que la température, le pouls et la saturation, le score reste partiel : il peut faire monter l'alerte, jamais rassurer.

### Soigner sans médecin, loin de tout

Deux guides terrestres décrivent déjà la situation d'AURA.

- **Le guide médical international de l'OMS pour les navires** (3e édition, 2007) s'adresse aux navires sans médecin. Un membre d'équipage non médecin soigne avec la pharmacie de bord, aidé par un avis médical par radio. Sa liste de référence compte 62 médicaments pour des traversées de trois semaines (Schlaich 2009).
- **Les recommandations américaines de soins prolongés** (Joint Trauma System, 2021, mises à jour en 2023) traitent le cas où l'évacuation est retardée. Des soignants, médecins ou non, gardent un patient pendant des heures ou des jours. Elles couvrent les hémorragies, la respiration, la douleur et la sédation, la septicémie, les brûlures, les attelles et les soins infirmiers.

AURA s'en inspire pour écrire la voie « sans sol » de chaque fiche : les gestes faisables par un non-médecin, la surveillance sur plusieurs jours, et le moment où il faut changer de plan. La NASA reste seule juge de ces voies.

### Ce qui n'a pas été intégré, et pourquoi

- **Les recommandations nationales de traitement** (NICE, HAS, liste des médicaments essentiels de l'OMS) : la NASA a ses propres procédures et sa propre pharmacie, qui priment. Recopier des doses sans validation médicale ajouterait surtout un risque d'erreur.
- **Les bases de patients fictifs** comme DDXPlus (environ 1,3 million de patients, 2022) : elles serviront plus tard à tester le moteur, pas à écrire les fiches.
- **Les codes CIM-11** de l'OMS : ils restent à ajouter à chaque fiche, après une vérification code par code.

## Les règles d'urgence

Une urgence passe avant tout calcul : un seul signe d'alarme suffit pour alerter, même si les mesures sont normales. Les urgences du vaisseau passent en premier, car elles menacent tout l'équipage. Chaque règle porte une référence (R-URG) qui la relie au code du logiciel.

### Urgences du vaisseau

Sur l'ISS, la NASA distingue trois urgences du vaisseau : l'incendie, la dépressurisation et l'atmosphère toxique. Le réflexe est toujours le même : alerter, se regrouper, agir. Les priorités vont dans cet ordre : la sécurité de l'équipage, celle du véhicule, puis la mission (Tobias et McMillan 2023).

| Situation | Ce que fait l'équipage, guidé par AURA | Réf. |
| --- | --- | --- |
| Incendie ou fumée | Masques, courant coupé sur l'appareil en cause, extincteur. Les masques restent en place tant que le monoxyde de carbone, le cyanure et le chlorure d'hydrogène dépassent leur limite d'une heure (425, 8 et 5 ppm). Ce critère de retrait est un choix AURA, à remplacer par celui de la NASA. | R-URG-02 |
| Dépressurisation | Calculer le temps restant avant 490 mmHg de pression, isoler les modules, rejoindre le véhicule de retour quand il reste 10 minutes ou moins. | R-URG-03 |
| Fuite toxique, ammoniac | Masques, repli vers une zone sûre, écoutilles fermées. La limite d'une heure pour l'ammoniac est de 30 ppm. | R-URG-04 |
| Éruption solaire | Rejoindre l'abri, reporter les sorties, vérifier les dosimètres. La dose de l'éruption de référence doit rester sous 250 mSv (V1 4031). | R-URG-05 |
| Liaison coupée pendant l'urgence | La décision se prend à bord. AURA garde le journal pour l'envoyer plus tard. | R-URG-06 |

### Signes d'alarme

Treize signes déclenchent l'alerte dès qu'une personne les décrit. AURA comprend la négation (« je n'ai pas mal à la poitrine ») et ne confond pas une question (« c'est quoi un AVC ? ») avec un signe vécu.

| Signe | À quoi penser d'abord | Premier geste | Réf. |
| --- | --- | --- | --- |
| Douleur dans la poitrine | Infarctus, trouble du rythme, blessure du thorax, caillot | Repos attaché, constantes, ECG, défibrillateur prêt | R-URG-10 |
| Difficulté à respirer | Allergie grave, fausse route, fumée, manque d'oxygène | Saturation, oxygène sous 90 %, air de la cabine | R-URG-11 |
| Perte de connaissance, malaise | Arrêt cardiaque, trouble du rythme, convulsion, malaise en se levant | Respiration, réponse, glycémie, ECG | R-URG-12 |
| Saignement important | Choc hémorragique, plaie | Compression forte, compresses qui absorbent (le sang flotte en gouttes), constantes | R-URG-13 |
| Faiblesse d'un côté, parole difficile | AVC, accident de décompression | Heure de début, glycémie, rien à avaler | R-URG-14 |
| Gorge, lèvres ou langue qui gonflent | Allergie grave (anaphylaxie) | Adrénaline de la trousse d'urgence, constantes | R-URG-15 |
| Mal de tête brutal et très violent, nuque raide | AVC, traumatisme crânien, méningite | Température, tension, avis prioritaire du sol | R-URG-16 |
| Douleur du ventre très forte, ventre dur | Appendicite, vésicule, pancréas, occlusion, calcul, traumatisme | À jeun, température, échographie | R-URG-17 |
| Perte brutale de la vue, douleur intense de l'œil | Décollement de rétine, glaucome, plaie ou brûlure de l'œil | Ne pas frotter, acuité, échographie de l'œil | R-URG-18 |
| Confusion soudaine | CO₂ élevé, manque d'oxygène, septicémie, AVC, sucre trop bas | Air de la cabine, saturation, glycémie, température | R-URG-19 |
| Convulsions | Crise convulsive, traumatisme crânien, sucre trop bas | Protéger la tête, chronométrer, glycémie | R-URG-20 |
| Choc violent à la tête ou blessure grave | Traumatisme du crâne, du thorax, du ventre, de la colonne | Nuque immobile, conscience vérifiée toutes les 15 minutes | R-URG-21 |
| Envie de se faire du mal | Urgence psychologique, dépression | Ne pas rester seul, responsable médical tout de suite, entretien prioritaire avec le psychologue au sol | R-URG-22 |

La liste des signes et les premiers gestes sont des choix AURA, à valider par un médecin ; les maladies citées viennent de la liste IMM.

### Garde-fous chiffrés

- **Seuils fixes (R-URG-30).** Une température d'au moins 39 °C ou d'au plus 35 °C, une saturation sous 90 %, un pouls de repos au-dessus de 120 ou sous 40 déclenchent toujours l'alerte, quelle que soit la référence de la personne. Ces seuils sont des choix AURA fondés sur les repères cliniques usuels.
- **Score d'alerte (R-URG-31).** Le score NEWS2, adapté au vol comme expliqué plus haut, fait monter l'alerte quand plusieurs mesures se dégradent ensemble.

### Ce que fait AURA pendant une urgence

- Les premiers gestes s'affichent en grand, en phrases courtes. Le responsable médical de bord est prévenu, un message prioritaire part en tête de la file vers le sol, et l'heure de début est notée (R-URG-40).
- Un signe d'alarme incertain déclenche une question de confirmation immédiate, jamais un silence (R-URG-42).
- Si le responsable médical est la personne touchée, AURA prévient son suppléant (R-URG-43).
- Les procédures d'urgence existent aussi sur papier, car l'équipage doit pouvoir agir sans ordinateur (R-URG-44, Tobias et McMillan 2023).

## Les règles sur les mesures du corps et l'environnement

AURA compare chaque mesure à la référence de la personne, et chaque symptôme à l'état de l'air et des radiations du moment.

### Une référence pour chaque personne

Une température de 37,8 °C n'a pas le même sens pour tout le monde, ni au sol et en vol. En apesanteur, la température au repos monte d'environ 1 °C en deux à trois mois (Stahn 2017). AURA construit donc une référence propre à chacun, en cinq couches :

1. le repère médical habituel sur Terre, par exemple 36,1 à 37,4 °C pour la température ;
2. l'effet connu du vol, comme cette hausse d'environ 1 °C ;
3. la moyenne d'au moins 20 mesures prises avant le départ ;
4. un ajustement quotidien avec les mesures prises en vol ;
5. le contexte du moment : effort, stress ou médicament.

L'écart à cette référence se compte en « score z », c'est-à-dire en multiples de la variation habituelle de la personne. Les seuils de ce tableau sont des choix AURA, sauf mention contraire.

| Situation | Ce que fait AURA | Réf. |
| --- | --- | --- |
| Écart faible (score z sous 2,5) | Rien : la mesure est normale pour cette personne | R-MES-01 |
| Écart moyen (score z de 2,5 à 3,5) | Demande de reprendre la mesure : dans 2 heures pour la température, après 10 minutes de repos pour le pouls | R-MES-02 |
| Écart fort (score z au-dessus de 3,5) | Alerte le responsable médical ; la mesure devient un fait, par exemple « fièvre mesurée » | R-MES-03 |
| Valeur très éloignée, sans raison (score z au-dessus de 4) | Redemande une mesure avant d'alerter, car un capteur mal placé est la cause la plus fréquente | R-MES-04 |
| Effort dans l'heure | Élargit la plage attendue. En vol, l'effort fait monter la température de 1,4 °C en moyenne, parfois au-delà de 40 °C (Stahn 2017) | R-MES-05 |
| Stress ou charge inhabituelle | Accepte un pouls un peu plus rapide | R-MES-06 |
| Médicament contre la fièvre dans les 6 heures | Prévient qu'une fièvre peut être masquée | R-MES-07 |
| Référence qui dérive trop vite | Le signale au médecin au lieu de s'y adapter en silence | R-MES-08 |
| Test de réaction de 3 minutes | Compte comme lente toute réponse au-delà de 355 ms (Basner 2011) ; une hausse des réponses lentes signale de la fatigue | R-MES-09 |
| Saturation basse | Vérifie d'abord le capteur et l'oxygène de la cabine, ensuite le corps | R-MES-10 |
| Mesure absente | Pose une question simple à la place, et n'invente jamais de valeur | R-MES-11 |
| Valeur impossible (température hors de 30 à 43 °C, par exemple) | La rejette comme erreur de capteur | R-MES-12 |

Certaines limites de la norme NASA se vérifient à intervalles, par des tests périodiques. AURA les suit dès que les résultats lui parviennent.

| Mesure | Limite de la NASA | Exigence |
| --- | --- | --- |
| Capacité aérobie en mission | Au moins 80 % de la valeur d'avant le vol | V1 4003 |
| Capacité aérobie avant une sortie | Au moins 32,9 ml/min/kg en apesanteur, 36,5 en surface | V1 4001, V1 4002 |
| Force musculaire en mission | Au moins 80 % de la référence | V1 4024 |
| Densité osseuse de la hanche et de la colonne | Au moins 95 % de la valeur d'avant le vol ; col du fémur au moins 90 % | V1 4027 |
| Apports en énergie et en nutriments | 100 % des besoins calculés | V1 4020 |
| Heures de travail, sommeil, exercice | Limites fixées par chaque programme | V1 4014 |

### L'environnement du vaisseau

Quand l'air, l'eau ou les radiations sortent des limites, AURA cherche la cause dans l'environnement avant de la chercher dans le corps. Les limites viennent de la norme NASA-STD-3001 et des concentrations maximales admissibles de 2024 (SMAC).

| Paramètre | Limite de la NASA | Ce que fait AURA | Réf. |
| --- | --- | --- | --- |
| CO₂ | Moyenne sur une heure d'au plus 3 mmHg (V2 6004) | Au-dessus, un mal de tête, de la fatigue ou un sommeil difficile sont d'abord attribués à l'air. Sur l'ISS, les chances de céphalée doublent environ à chaque mmHg supplémentaire (Law 2014). | R-ENV-01 |
| Oxygène | Pression inspirée normale d'environ 139 à 168 mmHg (V2 6003) | Saturation basse ou essoufflement avec un oxygène bas : l'air est suspecté avant le corps | R-ENV-02 |
| Pression de la cabine | Entre 34,5 et 103 kPa (V2 6006) | Douleur d'oreille ou de sinus après un changement de pression : barotraumatisme en premier | R-ENV-03 |
| Décompression | Risque d'accident d'au plus 15 %, et aucun accident neurologique (V2 6008) | Douleur des articulations, fourmillements ou trouble neurologique dans les 24 heures après une sortie : accident de décompression en premier | R-ENV-04 |
| Température et humidité | Confort de travail entre 20 et 25 °C et entre 30 et 60 % d'humidité (V2 6013) | Hors de cette zone, sommeil et chaleur à l'effort sont lus avec ce contexte | R-ENV-05 |
| Poussières | Moins de 3 mg/m³ au total ; moins de 0,3 mg/m³ pour la poussière lunaire fine (V2 6052, V2 6053) | Yeux ou gorge irrités après une sortie en surface : exposition aux poussières | R-ENV-06 |
| Polluants de l'air | Limite par produit et par durée (SMAC, JSC 20584) | Au-dessus d'une limite d'une heure ou d'un jour : urgence. Au-dessus d'une limite longue : enquête et avis du sol | R-ENV-07 |
| Eau | Qualité selon les normes de la NASA (SWEG) ; au moins 2,5 litres par personne et par jour | Diarrhée chez plusieurs équipiers avec une alarme sur l'eau : cause commune envisagée | R-ENV-08 |
| Bruit | Protection auditive obligatoire au-delà de 72 dBA sur 16 heures (Limardo) | Exposition cumulée suivie pour chacun ; baisse d'audition : bruit en premier | R-ENV-10 |

Limites d'une heure et de 180 jours pour les polluants qui comptent en cas d'incendie ou de fuite, en parties par million (SMAC 2024) :

| Produit | 1 heure | 180 jours |
| --- | --- | --- |
| Monoxyde de carbone | 425 | 15 |
| Ammoniac | 30 | 3 |
| Cyanure d'hydrogène | 8 | 1 |
| Chlorure d'hydrogène | 5 | 1 |
| Fluorure d'hydrogène | 3 | 0,3 |
| Formaldéhyde | 0,8 | 0,1 |
| Benzène | 40 | 0,07 |

### Les radiations

La sonde Curiosity a mesuré environ 1,8 mSv par jour pendant le trajet vers Mars (Zeitlin 2013) et 0,64 mSv par jour à la surface (Hassler 2014). La norme fixe les limites suivantes.

| Limite | Valeur | Exigence |
| --- | --- | --- |
| Dose efficace sur toute une carrière | Moins de 600 mSv | V1 4030 |
| Éruption solaire de référence | Moins de 250 mSv | V1 4031 |
| Rayonnement cosmique, séjour de plus de 60 jours | Moins de 1,3 mSv par jour en espace libre, 0,9 en surface | V1 4033 |
| Organes sur 30 jours | Moelle osseuse et cœur : 250 mGy-Eq ; système nerveux : 500 mGy ; cristallin : 1 000 mGy-Eq ; peau : 1 500 mGy-Eq | Tableau 4.8-1 |

AURA additionne chaque jour la dose de chaque personne et prévient à 80 % d'une limite (R-ENV-11, choix AURA). Des nausées après une forte dose orientent vers un syndrome d'irradiation (R-ENV-12). Pendant une alerte, AURA ne propose aucune sortie évitable, selon le principe de la dose la plus basse possible (R-ENV-13, V1 4029).

## Les règles de traitement, de communication et de confidentialité

Un traitement n'est proposé que s'il est réellement possible à bord. Les messages vers la Terre partent dès qu'une liaison s'ouvre, et ce qui est privé le reste.

### Six vérifications avant de proposer un traitement

Chaque fiche liste ses traitements dans l'ordre de préférence. AURA propose le premier qui passe ces six vérifications, et montre pourquoi les autres sont bloqués. Ces vérifications sont déjà codées dans le logiciel.

| Vérification | La question posée | Bloque le traitement si |
| --- | --- | --- |
| À bord | Le produit ou le matériel est-il dans le vaisseau ? | il n'y en a plus |
| Quantité | Y en a-t-il assez pour cette prise et les suivantes ? | il en manque pour une prise ; AURA prévient aussi quand le stock devient bas |
| Encore bon | Le lot est-il encore valable ? | il est périmé ; AURA prévient aussi quand il est à bord depuis plus de la moitié de sa durée de validité |
| Faisable à bord | Le geste est-il possible en apesanteur, et par qui ? | jamais ; AURA prévient quand le geste est réservé au responsable médical |
| Tâches à venir | Le produit gêne-t-il une tâche prévue ? | il endort et une sortie extravéhiculaire est prévue dans les 24 heures |
| Avis du sol | Quand le sol pourra-t-il répondre ? | jamais ; AURA affiche le délai, ou indique que la décision se prend à bord |

La vérification « Encore bon » compte beaucoup pour Mars. Sur 91 médicaments de l'ISS, 54 restent valables 36 mois ou moins (Diaz 2024). Des études ont aussi trouvé davantage de médicaments moins puissants après 28 mois à bord (Du 2011), même si huit sur neuf restaient conformes après 550 jours dans une autre analyse (Wotring 2015).

Cinq vérifications attendent des données de la NASA : les allergies de la personne, les interactions avec les médicaments déjà pris, la dose maximale par jour, les contre-indications, et une grossesse possible.

### Règles de décision

- Si tous les traitements sont bloqués, ou si un signe d'alarme est présent, la décision revient au responsable médical, et le sol est informé (R-TRT-02, R-TRT-03).
- À effet égal, le geste sans médicament passe d'abord. Contre le mal de dos en vol, la position recroquevillée a soulagé 91 % des astronautes, les antalgiques et l'exercice 85 % chacun (Kerstman 2012, R-TRT-04).
- AURA ne change jamais une dose seul, car l'effet des médicaments en apesanteur est encore mal mesuré (Dello Russo 2022). Il demande l'effet ressenti après chaque prise et le note (R-TRT-05).
- AURA ne propose jamais un geste au-delà des compétences présentes. Si le responsable médical est indisponible, la proposition passe à son suppléant, puis au sol (R-TRT-06).
- Le matériel (échographe, ECG, défibrillateur, oxygène) passe les mêmes vérifications qu'un médicament : présence, état et batterie (R-TRT-07).

### Quand le sol ne peut pas répondre

Chaque fiche a une voie « sans sol », écrite sur le modèle du guide de l'OMS pour les navires et des recommandations de soins prolongés. Elle dit trois choses : ce qu'un non-médecin peut faire, comment surveiller pendant plusieurs jours, et à quel moment changer de plan.

Vers Mars, l'évacuation est impossible. La norme demande donc que des soins de confort soient prévus quand aucun traitement n'est plus possible (V1 3009), et que les critères d'arrêt des soins soient fixés avant le vol (V1 3010). AURA ne rédige pas ces critères : il les affichera quand la NASA les fournira.

### Communication avec le sol

Tout reste à bord, puis part vers la Terre dès qu'une fenêtre s'ouvre : c'est le principe « stocker puis transmettre ».

- Les messages partent dans cet ordre : urgences, paquet médical du jour, puis messages privés et résumés de conférence (R-COM-01).
- Pendant une coupure, tout est gardé et envoyé au retour de la liaison. Vers Mars, la conjonction solaire coupe la liaison environ deux semaines tous les 26 mois (R-COM-02).
- Une réponse du sol arrive au plus tôt après deux fois le temps de trajet du signal, plus 45 minutes de réflexion, ou 15 minutes pour une urgence (R-COM-03).
- Chaque astronaute a une conférence médicale privée de 15 minutes par semaine, et une conférence psychologique privée toutes les deux semaines (R-COM-06). Quand le délai dépasse 5 minutes ou que la liaison est coupée, l'IA du vaisseau mène la conférence avec les mêmes questions, et l'astronaute relit le résumé avant envoi (R-COM-04).
- Un appel au sol tient en un seul message clair : qui, depuis quand, signes, mesures, trois orientations avec leurs pourcentages, traitements essayés, question précise et heure limite de réponse (R-COM-05).

### Confidentialité

- Chaque astronaute voit ses propres données. Le responsable médical de bord voit les données médicales de tous. Le commandant voit seulement si une personne est apte à une tâche, sans la raison (R-CONF-01).
- La partie psychologique ne quitte le vaisseau qu'avec l'accord de la personne (R-CONF-02). Seule exception proposée : un danger pour sa vie prévient tout de suite le responsable médical et le psychologue au sol (R-CONF-03, à valider avec la NASA).
- Les données médicales partent par une voie privée, comme l'exige la norme (V1 3004, R-CONF-04).
- Pour faire progresser la base, seuls des comptes anonymes quittent le vaisseau, jamais un dossier nominatif (R-CONF-05).

### Quand appeler le sol

AURA propose d'appeler le sol dans six cas : un signe d'alarme, des traitements tous bloqués, un tableau qu'il ne reconnaît pas, un critère d'appel écrit dans la fiche, une absence d'amélioration après la durée attendue, ou la demande du responsable médical (R-SOL-01). Chaque appel nomme le métier attendu au sol (R-SOL-02). Si la réponse ne peut pas arriver à temps, la voie « sans sol » s'applique et la décision est notée pour être relue plus tard (R-SOL-03).

## Les règles de pharmacie, d'apprentissage et de gouvernance

La pharmacie se prépare par simulation avant le départ et se vérifie à chaque prise. La base apprend des cas confirmés, mais aucune règle de sécurité ne change sans relecture humaine.

### Pharmacie et matériel

- **Prévoir les quantités par simulation (R-PHA-01).** AURA rejoue la mission des milliers de fois, en tirant au hasard les épisodes de chaque maladie selon sa fréquence. Il compare ensuite le besoin habituel et le besoin d'une mission difficile au stock prévu. Trois scénarios sont testés : optimiste, médian et pessimiste.
- **Partir des fréquences de la NASA (R-PHA-02).** Les taux utilisés aujourd'hui sont illustratifs ; ils seront tirés de la liste IMM. Par exemple, l'éruption cutanée, qui touche 82 % des astronautes en six mois, correspond à environ 3,4 épisodes par personne et par an.
- **Surveiller la péremption (R-PHA-03).** Tout médicament qui périme avant la fin de la mission est signalé dès la préparation. Selon les hypothèses, 60 à 98 % des médicaments de l'ISS périmeraient avant la fin d'une mission de trois ans (Diaz 2024).
- **Garder une réserve (R-PHA-04).** Le stock minimum de chaque médicament couvre le besoin d'une fin de mission difficile ; en dessous, AURA demande d'économiser.
- **Tout noter (R-PHA-05).** Chaque prise est inscrite : qui, quoi, quand et avec quel effet.
- **Partir de la liste de l'ISS (R-PHA-06).** En attendant la liste réelle de la mission, les fiches citent les médicaments de l'ISS publiés d'après les données de 2023, sans les doses.
- **Traiter le matériel comme un médicament (R-MAT-01, R-MAT-02).** Un appareil absent ou en panne bloque l'option qui en a besoin. L'échographie est l'examen d'image de référence à bord : c'est elle qui a révélé des caillots dans la veine jugulaire d'astronautes de l'ISS (Marshall-Goebel 2019).

### Apprentissage

La base s'améliore avec l'expérience, sous contrôle.

- Les fréquences de départ se corrigent peu à peu avec les épisodes observés en mission (R-APP-01).
- La valeur de chaque signe se corrige avec les cas confirmés par le responsable médical ou par le sol (R-APP-02).
- L'apprentissage ne touche jamais aux signes d'alarme, aux seuils fixes, aux médicaments ni aux doses. Un changement important devient une nouvelle version de fiche, à relire (R-APP-03).
- L'effet noté après chaque prise est montré au responsable médical, sans jamais modifier une dose (R-APP-04).
- Des patients fictifs, créés à partir des fiches, servent à tester le logiciel, pas à l'entraîner : ils ne pourraient que retrouver ce que disent déjà les fiches (R-APP-05).

Les formules de ces corrections sont dans l'annexe technique.

### Gouvernance : qui écrit, relit et valide une fiche

Le logiciel ne charge que les fiches en service. La relecture revient à un médecin de vol ou au spécialiste du métier concerné, et la mise en service à l'autorité médicale de la mission.

&#91;embedded content: cycle de vie d'une fiche · 6 états\]

Une fiche passe de brouillon à relue, puis en service. Elle repasse par « à revoir » à chaque changement de source, revue annuelle ou erreur signalée, et elle n'est jamais effacée : chaque version garde son auteur, sa date et la raison du changement (R-GOU-01 à R-GOU-05). Pendant une coupure de liaison, le responsable médical de bord peut adapter une fiche ; cette version de bord est relue au retour de la liaison (R-GOU-04). L'IA de langage peut proposer un brouillon, jamais modifier une fiche en service (R-GOU-06).

| Rôle | Créer un brouillon | Relire | Mettre en service | Modifier une règle d'urgence |
| --- | --- | --- | --- | --- |
| Équipe AURA | oui | non | non | non |
| Médecin de vol | oui | oui | avec l'autorité médicale | avec une deuxième signature |
| Spécialiste au sol | oui, dans son domaine | oui, dans son domaine | non | non |
| Autorité médicale de la mission | oui | oui | oui | avec une deuxième signature |
| Responsable médical de bord | des propositions | non | une version de bord, pendant une coupure | non |
| IA de langage | un brouillon marqué comme tel | non | non | non |

Cette organisation est un choix AURA, que la NASA adaptera à ses propres circuits de validation.

## Les maladies couvertes

Les 117 fiches se répartissent en huit familles. Les problèmes les plus fréquents sont aussi les moins graves, et les plus graves sont rares.

| Famille | Fiches | Les plus probables sur 6 mois à bord de l'ISS | Les plus graves |
| --- | --- | --- | --- |
| Adaptation à l'apesanteur | 16 | Mal de l'espace 73 %, nez bouché 59 %, mal de dos 53 % | Thrombose de la veine jugulaire, atteinte de la vision (SANS) |
| Infections, peau et allergies | 9 | Éruption cutanée 82 %, infection respiratoire 45 % | Septicémie, allergie grave |
| Yeux, oreilles, nez, gorge et dents | 21 | Corps étranger dans l'œil 72 %, barotraumatisme 43 % | Décollement de rétine, glaucome aigu, plaie de l'œil |
| Ventre, reins, voies urinaires et gynécologie | 16 | Diarrhée 45 %, infection urinaire (femmes 49 %) | Appendicite, pancréatite, occlusion |
| Blessures, os, muscles et chocs | 23 | Écorchure 82 %, blessure du dos 44 % | Traumatisme crânien, choc hémorragique |
| Cœur, vaisseaux et système nerveux | 9 | Céphalée tardive 59 % | Arrêt cardiaque, AVC, infarctus |
| Expositions et sorties extravéhiculaires | 16 | Céphalée liée au CO₂ 31 %, fourmillements liés aux sorties 11 % | Inhalation de fumée, accident de décompression, syndrome d'irradiation |
| Sommeil, santé mentale et comportement | 7 | Insomnie tardive 91 % | Urgence psychologique, dépression |

Voici les dix conditions les plus probables pour un astronaute, d'après la NASA. La seconde colonne montre ce que devient le risque sur une mission martienne de trois ans avec 50 sorties.

| Condition | 6 mois sur l'ISS | 3 ans vers Mars |
| --- | --- | --- |
| Insomnie tardive | 91 % | plus de 99,9 % |
| Écorchure | 82 % | plus de 99,9 % |
| Éruption cutanée | 82 % | plus de 99,9 % |
| Mal de l'espace | 73 % | 73 % |
| Corps étranger dans l'œil | 72 % | plus de 99,9 % |
| Céphalée tardive | 59 % | 99,5 % |
| Nez bouché | 59 % | 59 % |
| Mal de dos d'adaptation | 53 % | 53 % |
| Infection urinaire (femmes) | 49 % | 98 % |
| Diarrhée | 45 % | 97 % |

Les problèmes d'adaptation, comme le mal de l'espace, gardent la même probabilité sur six mois et sur trois ans : ils arrivent au début, au changement de gravité. Les autres s'accumulent avec la durée. Sur une mission martienne, les problèmes courants qui s'accumulent avec le temps deviennent presque certains pour chaque astronaute : la pharmacie et les fiches doivent en tenir compte.

Toutes les fiches et leurs probabilités sont dans la deuxième partie, à partir de l'index.

## Ce qui manque encore

AURA fonctionne déjà avec des valeurs de repli, clairement signalées. Seize familles de données le rendraient plus sûr, et la plupart existent déjà à la NASA.

| Ce qui manque | Qui l'a | Ce que fait AURA en attendant |
| --- | --- | --- |
| Fiches CliFF : durée de chaque maladie, ressources pour la soigner, heures de travail perdues | NASA (modèle IMM) | Quantités par épisode illustratives, durées inconnues |
| Probabilités récentes et liste complète IMPACT 1.0 de 120 conditions | NASA | Probabilités IMM de 2015, et 17 conditions ajoutées par AURA |
| Procédures médicales de bord (Medical Checklist) | NASA | Traitements de fiche marqués « à valider » |
| Liste réelle des médicaments de la mission : quantités, lots, dates, doses | Pharmacie du centre Johnson de la NASA | Liste de l'ISS de 2023, sans doses |
| Inventaire et état du matériel médical | Ingénieurs biomédicaux de la NASA | Matériel affiché comme « non vérifié » |
| Dossier médical de chaque astronaute : allergies, antécédents, vaccins, soins dentaires | Médecins de vol, sous secret médical | Questions posées à la personne |
| Données du véhicule en temps réel : CO₂ par zone, oxygène, pression, polluants, eau, radiations | Véhicule et équipes au sol | Saisie à la main ou valeurs simulées, marquées comme telles |
| Limites propres à la mission : heures de travail, sommeil, tension, fatigue | Programme de la mission | Seuils AURA marqués « à valider » |
| Tableaux de la norme publiés seulement en image (oxygène, produits de combustion) | Version officielle de la norme | Valeurs tirées du texte qui les justifie |
| Limites des microbes dans l'air | Laboratoire de microbiologie de la NASA | Aucune règle sur ce point |
| Critères d'évacuation, d'arrêt des soins, soins de confort, plan en cas de décès | Programme de la mission | Message « protocole non fourni » et appel au sol |
| Protocoles psychologiques : questionnaires, rythme des entretiens, conduite en crise | Équipe de santé comportementale | Conférence toutes les deux semaines, avec l'accord de la personne |
| Valeur mesurée des signes pour les fiches non couvertes par la médecine clinique | Littérature clinique | Échelle en mots, marquée « choix AURA » |
| Codes CIM-11 des fiches | OMS, en accès libre | Champ vide, à remplir |
| Effet des médicaments en apesanteur | Inconnu : peu de mesures publiées | Effet ressenti noté après chaque prise |
| Fréquence des maladies sur une mission martienne complète | Inconnu : aucune mission réalisée | Incertitude large, décision humaine |

Pour la NASA, compléter la base revient à trois gestes :

1. Remplir les champs concernés de la fiche, avec la source, dans le format décrit en annexe.
2. Faire relire puis mettre en service la nouvelle version, selon les règles de gouvernance.
3. Laisser l'apprentissage ajuster les valeurs avec les cas confirmés, sous la même relecture.

Aucune de ces étapes ne demande de modifier le logiciel.

## Comment lire une fiche

Toutes les fiches suivent le même plan, en phrases simples. Voici une fiche complète, puis ce que dit chaque ligne.

#### Exemple : calcul rénal

*F-DIG-12 · 0,18 % sur 6 mois à bord de l'ISS · 1,1 % sur 3 ans vers Mars*

- **Comment le reconnaître.** Douleur très forte du flanc, par vagues, qui descend vers l'aine, avec du sang dans les urines, des nausées et de l'agitation. Une douleur qui change avec les mouvements oriente plutôt vers le dos.
- **Signes d'alarme.** Fièvre avec douleur du flanc, car le rein peut être infecté et bloqué ; plus d'urines du tout.
- **Ce qu'on fait à bord.** Le responsable médical donne un anti-inflammatoire (kétorolac ou ibuprofène), puis de la tamsulosine pour aider le calcul à descendre, et un antalgique plus fort si la douleur persiste. L'astronaute boit et filtre ses urines. Une échographie du rein confirme.
- **Quand appeler le sol.** En cas de fièvre ou de douleur qui ne cède pas : médecin de vol, et ingénieur biomédical pour guider l'échographie.
- **Si le sol ne répond pas.** Douleur et température notées toutes les 4 heures. Avec de la fièvre, le responsable médical traite comme une infection grave, en suivant la fiche de la septicémie.
- **Ce qui manque.** La durée habituelle d'un épisode et les ressources nécessaires (fiche CliFF de la NASA), la procédure de bord et le stock réel.

#### Ce que dit chaque ligne

| Ligne | Ce qu'elle dit |
| --- | --- |
| Probabilité (en italique) | La chance qu'un astronaute ait au moins un épisode, d'après la NASA (2015), sur une mission de 6 mois à bord de l'ISS et sur une mission martienne de 3 ans. Quand les chiffres diffèrent, « H » vaut pour les hommes et « F » pour les femmes. |
| Comment le reconnaître | Les signes qui orientent vers cette condition, et ceux qui orientent ailleurs |
| Signes d'alarme | Ce qui fait passer en urgence, sans attendre le calcul |
| Ce qu'on fait à bord | Les traitements dans l'ordre de préférence, et qui peut les donner |
| Quand appeler le sol | Le moment, et le métier à joindre |
| Si le sol ne répond pas | Pour les cas graves : ce que l'équipage fait seul en attendant |
| Médecine clinique | Quand elle existe : la valeur mesurée des signes, avec sa source |
| Ce qui manque | Ce que la NASA peut fournir pour compléter la fiche |

Trois conventions valent pour toutes les fiches :

- **Le responsable médical** est le membre d'équipage chargé des soins ; il n'est pas forcément médecin. Les gestes sans mention peuvent être faits par l'astronaute lui-même.
- **Les médicaments** cités viennent de la liste de l'ISS publiée d'après les données de 2023. Les doses n'y figurent pas : elles viendront des procédures de la NASA.
- **Les signes et les traitements** sont des choix AURA à valider par un médecin, sauf quand une source est citée.

## Index des 117 fiches

L'index reprend les 100 conditions de la liste IMM de la NASA, famille par famille, puis les 17 conditions ajoutées par AURA. Les probabilités viennent du rapport de la NASA du 2 février 2015 (modèle iMED 5.0) et supposent l'environnement de l'ISS.

- **Pour un astronaute.** Chaque chiffre est la chance qu'une personne ait au moins un épisode. Pour un équipage de quatre, une condition à 18 % par personne touche au moins un équipier dans 55 % des cas.
- **« Sans objet »** signale une condition propre à un sexe. **« Non calculée »** : la NASA a exclu ces deux conditions pour son équipage de référence, sans chirurgie du ventre ni couronne dentaire.
- **« Déjà survenue en vol »** suit le rapport de la NASA : 50 des 100 conditions sont déjà arrivées en mission.

| Fiche | Nom dans la liste de la NASA | 6 mois, ISS | 3 ans, Mars | Déjà survenue en vol |
| --- | --- | --- | --- | --- |
| F-APE-01 Mal de l'espace | Space Motion Sickness (SA) | 73 % | 73 % | oui |
| F-APE-02 Nez bouché | Nasal Congestion (SA) | 59 % | 59 % | oui |
| F-APE-03 Mal de dos d'adaptation | Back Pain (SA) | 53 % | 53 % | oui |
| F-APE-04 Insomnie d'adaptation | Insomnia (SA) | 45 % | 45 % | oui |
| F-APE-05 Céphalée d'adaptation | Headache (SA) | 35 % | 35 % | oui |
| F-APE-06 Atteinte de la vision liée au vol (SANS) | VIIP (SA) | 34 % | 34 % | oui |
| F-APE-07 Constipation d'adaptation | Constipation (SA) | 17 % | 17 % | oui |
| F-APE-08 Rétention urinaire d'adaptation | Urinary Retention (SA) | H 0,70 % / F 5,6 % | H 0,70 % / F 5,6 % | oui |
| F-APE-09 Incontinence urinaire d'adaptation | Urinary Incontinence (SA) | H sans objet / F 5,6 % | H sans objet / F 5,6 % | oui |
| F-APE-10 Saignement de nez d'adaptation | Nose Bleed (SA) | 0,90 % | 0,90 % | oui |
| F-INF-01 Éruption cutanée | Skin Rash | 82 % | plus de 99,9 % | oui |
| F-INF-02 Infection respiratoire | Respiratory Infection | 45 % | 97 % | oui |
| F-INF-03 Infection de la peau | Skin Infection | 21 % | 76 % | oui |
| F-INF-04 Réaction allergique légère ou modérée | Allergic Reaction (Mild to Moderate) | 18 % | 70 % | oui |
| F-INF-05 Zona | Herpes Zoster Reactivation (Shingles) | 1,8 % | 10 % | oui |
| F-INF-06 Grippe | Influenza | 1,8 % | 10 % | oui |
| F-INF-07 Septicémie | Sepsis | 0,12 % | 0,72 % | non |
| F-INF-08 Allergie grave (anaphylaxie) | Anaphylaxis | 0,025 % | 0,15 % | non |
| F-TET-01 Corps étranger dans l'œil | Eye Abrasion (Foreign Body) | 72 % | plus de 99,9 % | oui |
| F-TET-02 Brûlure chimique de l'œil | Eye Chemical Burn | 10 % | 48 % | oui |
| F-TET-03 Infection de l'œil | Eye Infection | 8,7 % | 42 % | oui |
| F-TET-04 Ulcère de la cornée | Eye Corneal Ulcer | 0,0070 % | 0,042 % | non |
| F-TET-05 Décollement de la rétine | Retinal Detachment | H 0,0060 % / F 0,0033 % | H 0,036 % / F 0,020 % | non |
| F-TET-06 Glaucome aigu | Acute Glaucoma | H 0,0014 % / F 0,0028 % | H 0,0081 % / F 0,017 % | non |
| F-TET-07 Plaie de l'œil | Eye Penetration (Foreign Body) | 0,00047 % | 0,0028 % | non |
| F-TET-08 Barotraumatisme de l'oreille ou des sinus | Barotrauma (Ear/Sinus Block) | 43 % | 97 % | oui |
| F-TET-09 Mal de gorge | Pharyngitis | 18 % | 70 % | oui |
| F-TET-10 Sinusite | Acute Sinusitis | 10 % | 48 % | oui |
| F-TET-11 Perte d'audition | Hearing Loss | 9,4 % | 45 % | oui |
| F-TET-12 Otite externe | Otitis Externa | 5,3 % | 28 % | oui |
| F-TET-13 Otite moyenne | Otitis Media | 5,3 % | 28 % | oui |
| F-TET-14 Aphte | Mouth Ulcer | 15 % | 63 % | oui |
| F-TET-15 Carie | Dental Caries | 14 % | 59 % | non |
| F-TET-16 Abcès dentaire | Dental: Abscess | 1,1 % | 6,7 % | non |
| F-TET-17 Pulpe dentaire à nu | Dental: Exposed Pulp | 1,0 % | 5,9 % | non |
| F-TET-18 Perte d'un plombage | Dental: Filling Loss | 0,26 % | 1,5 % | non |
| F-TET-19 Dent arrachée | Dental: Avulsion (Tooth Loss) | 0,15 % | 0,87 % | non |
| F-TET-20 Perte d'une couronne | Dental: Crown Loss | non calculée | non calculée | non |
| F-TET-21 Fausse route | Choking/Obstructed Airway | 5,3 % | 28 % | oui |
| F-DIG-01 Diarrhée | Diarrhea | 45 % | 97 % | oui |
| F-DIG-02 Gastro-entérite | Gastroenteritis | 7,1 % | 36 % | oui |
| F-DIG-03 Indigestion, reflux | Indigestion | 10 % | 48 % | oui |
| F-DIG-04 Hémorroïdes | Hemorrhoids | 3,6 % | 20 % | oui |
| F-DIG-05 Appendicite | Appendicitis | 0,047 % | 0,28 % | non |
| F-DIG-06 Vésicule biliaire | Acute Cholecystitis/Biliary Colic | H 0,038 % / F 0,064 % | H 0,23 % / F 0,38 % | non |
| F-DIG-07 Diverticulite | Acute Diverticulitis | 0,071 % | 0,43 % | non |
| F-DIG-08 Pancréatite | Acute Pancreatitis | 0,015 % | 0,092 % | non |
| F-DIG-09 Occlusion de l'intestin | Small Bowel Obstruction | non calculée | non calculée | non |
| F-DIG-10 Hernie | Abdominal Wall Hernia | 0,023 % | 0,14 % | non |
| F-DIG-11 Infection urinaire | Urinary Tract Infection | H 8,1 % / F 49 % | H 40 % / F 98 % | oui |
| F-DIG-12 Calcul rénal | Nephrolithiasis | 0,18 % | 1,1 % | non |
| F-DIG-13 Prostatite | Acute Prostatitis | H 0,25 % / F sans objet | H 1,5 % / F sans objet | non |
| F-DIG-14 Mycose vaginale | Vaginal Yeast Infection | H sans objet / F 3,2 % | H sans objet / F 18 % | non |
| F-DIG-15 Saignement utérin anormal | Abnormal Uterine Bleeding | H sans objet / F 2,6 % | H sans objet / F 14 % | non |
| F-TRA-01 Écorchure | Skin Abrasion | 82 % | plus de 99,9 % | oui |
| F-TRA-02 Plaie | Skin Laceration | 1,8 % | 10 % | oui |
| F-TRA-03 Blessure du dos | Back Injury | 44 % | 97 % | oui |
| F-TRA-04 Blessure du cou | Neck Injury | 16 % | 64 % | oui |
| F-TRA-05 Entorse de l'épaule | Shoulder Sprain/Strain | 34 % | 92 % | oui |
| F-TRA-06 Entorse du coude | Elbow Sprain/Strain | 20 % | 74 % | oui |
| F-TRA-07 Entorse de la cheville | Ankle Sprain/Strain | 19 % | 71 % | oui |
| F-TRA-08 Entorse du genou | Knee Sprain/Strain | 12 % | 55 % | oui |
| F-TRA-09 Entorse du poignet | Wrist Sprain/Strain | 9,0 % | 43 % | oui |
| F-TRA-10 Entorse de la hanche | Hip Sprain/Strain | 7,3 % | 37 % | oui |
| F-TRA-11 Luxation d'un doigt | Finger Dislocation | 1,8 % | 10 % | oui |
| F-TRA-12 Luxation du coude | Elbow Dislocation | 0,0026 % | 0,016 % | non |
| F-TRA-13 Luxation de l'épaule | Shoulder Dislocation | 0,0019 % | 0,011 % | non |
| F-TRA-14 Fracture de fatigue de la jambe ou du pied | Lower Extremity Stress Fracture | H 2,1 % / F 3,3 % | H 12 % / F 18 % | non |
| F-TRA-15 Fracture du poignet | Wrist Fracture | 0,12 % | 0,71 % | non |
| F-TRA-16 Fracture de la hanche | Hip/Proximal Femur Fracture | H 0,021 % / F 0,0056 % | H 0,13 % / F 0,034 % | non |
| F-TRA-17 Fracture de la colonne lombaire | Lumbar Spine Fracture | H 0,010 % / F 0,0086 % | H 0,060 % / F 0,052 % | non |
| F-TRA-18 Arthrite aiguë | Acute Arthritis | H 0,077 % / F 0,19 % | H 0,46 % / F 1,1 % | non |
| F-TRA-19 Syndrome des loges | Acute Compartment Syndrome | H 0,0037 % / F 0,00035 % | H 0,022 % / F 0,0021 % | non |
| F-TRA-20 Traumatisme crânien | Head Injury | 0,021 % | 0,13 % | non |
| F-TRA-21 Traumatisme du thorax | Chest Injury | 0,013 % | 0,077 % | non |
| F-TRA-22 Traumatisme du ventre | Abdominal Injury | 0,0082 % | 0,049 % | non |
| F-TRA-23 Choc hémorragique | Traumatic Hypovolemic Shock | 0,032 % | 0,19 % | non |
| F-CVN-01 Céphalée tardive | Headache (Late) | 59 % | 99,5 % | oui |
| F-CVN-02 Hypertension | Hypertension | 0,32 % | 1,9 % | non |
| F-CVN-03 AVC | Stroke (Cerebrovascular Accident) | H 0,049 % / F 0,034 % | H 0,29 % / F 0,20 % | non |
| F-CVN-04 Fibrillation auriculaire | Atrial Fibrillation/Atrial Flutter | H 0,036 % / F 0,012 % | H 0,21 % / F 0,070 % | non |
| F-CVN-05 Angine de poitrine ou infarctus | Angina/Myocardial Infarction | H 0,032 % / F 0,024 % | H 0,19 % / F 0,14 % | non |
| F-CVN-06 Convulsions | Seizures | 0,014 % | 0,081 % | non |
| F-CVN-07 Arrêt cardiaque | Sudden Cardiac Arrest | 0,00075 % | 0,0045 % | non |
| F-CVN-08 Choc cardiaque après infarctus | Cardiogenic Shock Secondary to Myocardial Infarction | H 0,00037 % / F 0,00026 % | H 0,0023 % / F 0,0016 % | non |
| F-CVN-09 Choc d'origine nerveuse | Neurogenic Shock | 0,00025 % | 0,0015 % | non |
| F-EXP-01 Céphalée liée au CO₂ | Headache (CO2 Induced) | 31 % | 89 % | oui |
| F-EXP-02 Fourmillements liés aux sorties | Paresthesias | 11 % | 99,6 % | oui |
| F-EXP-03 Décollement d'un ongle | Fingernail Delamination | 6,5 % | 97 % | oui |
| F-EXP-04 Surdosage ou effet indésirable d'un médicament | Medication Overdose/Adverse Reaction | 3,6 % | 20 % | oui |
| F-EXP-05 Accident de décompression | Decompression Sickness Secondary to EVA | 1,2 % | 44 % | non |
| F-EXP-06 Inhalation de fumée | Smoke Inhalation | 1,1 % | 6,5 % | oui |
| F-EXP-07 Brûlures par le feu | Burns Secondary to Fire | 0,53 % | 3,1 % | non |
| F-EXP-08 Syndrome d'irradiation | Acute Radiation Syndrome | 0,14 % | 0,85 % | non |
| F-EXP-09 Mal d'altitude | Altitude Sickness | 0,0027 % | 0,016 % | non |
| F-EXP-10 Intoxication à l'ammoniac | Toxic Exposure: Ammonia | 0,000073 % | 0,00044 % | non |
| F-PSY-01 Insomnie tardive | Late Insomnia | 91 % | plus de 99,9 % | oui |
| F-PSY-02 Anxiété | Anxiety | H 0,095 % / F 0,35 % | H 0,57 % / F 2,1 % | non |
| F-PSY-03 Dépression | Depression | H 0,15 % / F 0,18 % | H 0,87 % / F 1,1 % | non |
| F-PSY-04 Urgence psychologique | Behavioral Emergency | 0,00072 % | 0,0043 % | non |

### Les 17 conditions ajoutées

Depuis 2015, la NASA a construit une nouvelle liste de 120 conditions, IMPACT 1.0, dont le contenu complet n'est pas public (Kreykes 2023). AURA ajoute les conditions connues de cette liste et celles que des études de vol ont révélées.

| Fiche | Condition | Pourquoi l'ajouter | Source |
| --- | --- | --- | --- |
| F-APE-11 | Caillot dans la veine jugulaire | Flux ralenti ou inversé chez 6 astronautes sur 11 ; un caillot qui bouchait la veine chez l'un d'eux | Marshall-Goebel 2019 |
| F-APE-12 | Mal des transports au retour dans la gravité | Ajouté à IMPACT 1.0 ; les symptômes peuvent revenir dans les 10 jours après le retour | Kreykes 2023 ; Khalid 2023 |
| F-APE-13 | Malaise en se levant au retour | La norme en fait une zone de prévention obligatoire | NASA-STD-3001 (V1 3003) |
| F-APE-14 | Perte osseuse | Hanche et colonne à garder au-dessus de 95 % de la densité d'avant le vol | V1 4027 ; fiche technique OCHMO-TB-030 |
| F-APE-15 | Perte de force et d'endurance | Force et capacité aérobie à garder au-dessus de 80 % | V1 4003 ; V1 4024 |
| F-APE-16 | Anémie spatiale | Le corps détruit plus de globules rouges en vol | Trudel 2022 |
| F-INF-09 | Réveil d'un virus sans symptôme | Virus de la varicelle retrouvé dans la salive d'environ la moitié des astronautes en mission courte, des deux tiers en mission longue | Crucian 2018 |
| F-DIG-16 | Grossesse du premier trimestre | Ajoutée à IMPACT 1.0 | Kreykes 2023 |
| F-EXP-11 | CO₂ élevé, autres effets | Sommeil, fatigue et irritabilité liés au CO₂ | Law 2014 |
| F-EXP-12 | Manque d'oxygène | Oxygène inspiré sous la plage normale | V2 6003 |
| F-EXP-13 | Chaleur à l'effort | +1,4 °C en moyenne à l'effort en vol, parfois plus de 40 °C | Stahn 2017 |
| F-EXP-14 | Poussières planétaires | Ajoutées à IMPACT 1.0 ; limite de 0,3 mg/m³ pour la poussière lunaire fine | Kreykes 2023 ; V2 6053 |
| F-EXP-15 | Blessure de l'épaule liée aux sorties | Proposée pendant la construction d'IMPACT 1.0 | Kreykes 2023 |
| F-EXP-16 | Dose de radiations cumulée | Limites par organe et sur la carrière, effets à long terme | V1 4030 |
| F-PSY-05 | Manque de sommeil et fatigue | Environ 6 heures de sommeil par nuit en mission ; trois astronautes de l'ISS sur quatre ont pris un somnifère | Barger 2014 |
| F-PSY-06 | Tensions dans l'équipage | Ajoutées à IMPACT 1.0 ; pendant Mars-520, deux personnes concentraient 85 % des conflits ressentis | Kreykes 2023 ; Basner 2014 |
| F-PSY-07 | Deuil pendant la mission | Proposé pendant la construction d'IMPACT 1.0 | Kreykes 2023 |

## Fiches : adaptation à l'apesanteur

Ces problèmes viennent du changement de gravité lui-même. Ils touchent beaucoup d'astronautes, surtout les premiers jours, et leur probabilité ne grandit pas avec la durée de la mission. Pour toutes ces fiches, la durée habituelle et les ressources nécessaires sont à fournir par la NASA (fiches CliFF).

#### Mal de l'espace

*F-APE-01 · ISS 6 mois : 73 % · Mars 3 ans : 73 %*

- **Comment le reconnaître.** Nausées, vomissements, vertiges, mal de tête, sueurs froides et fatigue, dans les 72 heures qui suivent un changement de gravité, avec un pic entre le premier et le cinquième jour. Environ 70 % des astronautes en souffrent (Khalid 2023). De la fièvre, une diarrhée ou une douleur du ventre bien localisée orientent ailleurs.
- **Signes d'alarme.** Vomissements répétés avec déshydratation ; trouble neurologique ; nausées pendant une sortie, à cause du risque de vomir dans le casque.
- **Ce qu'on fait à bord.** Bouger la tête lentement et garder un repère visuel fixe. Contre la nausée, le responsable médical peut donner de la prométhazine, de la méclizine ou de l'ondansétron ; la prométhazine endort, ce qui compte avant une sortie. Boire par petites gorgées.
- **Quand appeler le sol.** Vomissements au-delà de 72 heures, ou impossible de boire : médecin de vol.

#### Nez bouché

*F-APE-02 · ISS 6 mois : 59 % · Mars 3 ans : 59 %*

- **Comment le reconnaître.** Nez bouché, visage gonflé et goût diminué, surtout les premières semaines, car les liquides du corps remontent vers la tête. Fièvre, écoulement épais ou douleur du visage orientent vers une sinusite.
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Spray d'eau salée ; décongestionnant (pseudoéphédrine en comprimé ou oxymétazoline en spray) pendant quelques jours seulement ; corticoïde nasal (mométasone) si la gêne dure.
- **Quand appeler le sol.** Seulement si une douleur d'oreille apparaît lors d'un changement de pression.

#### Mal de dos d'adaptation

*F-APE-03 · ISS 6 mois : 53 % · Mars 3 ans : 53 %*

- **Comment le reconnaître.** Douleur lombaire en début de vol, sans choc, soulagée en se recroquevillant. Sur 728 astronautes de Mercury à la navette, 52 % ont eu mal au dos en vol, et la douleur était légère dans 86 % des cas (Kerstman 2012). Une douleur après un effort, une douleur du flanc avec des urines anormales, ou de la fièvre orientent ailleurs.
- **Signes d'alarme.** Faiblesse ou perte de sensibilité des jambes ; difficulté à uriner.
- **Ce qu'on fait à bord.** Position recroquevillée, efficace dans 91 % des cas ; exercice et antalgiques (paracétamol ou ibuprofène), efficaces dans 85 % des cas chacun.
- **Quand appeler le sol.** Douleur forte qui dure au-delà de l'adaptation : médecin de vol, équipe d'exercice.

#### Insomnie d'adaptation

*F-APE-04 · ISS 6 mois : 45 % · Mars 3 ans : 45 %*

- **Comment le reconnaître.** Endormissement difficile ou réveils les premières nuits, avec du bruit, de la lumière, de l'excitation ou le mal de l'espace. Un CO₂ élevé dans la zone de repos, ou une insomnie qui dure, orientent vers d'autres fiches.
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Horaires réguliers, lumière et écrans baissés, sac de couchage attaché ; mélatonine pour recaler le rythme ; zolpidem ou zaleplon selon le protocole du responsable médical. Ces produits endorment : aucune sortie dans les 24 heures.
- **Quand appeler le sol.** Pas nécessaire.

#### Céphalée d'adaptation

*F-APE-05 · ISS 6 mois : 35 % · Mars 3 ans : 35 %*

- **Comment le reconnaître.** Mal de tête des premiers jours, souvent avec le mal de l'espace et le visage gonflé. Un CO₂ au-dessus de 3 mmHg oriente vers la céphalée liée au CO₂.
- **Signes d'alarme.** Mal de tête brutal et très violent ; fièvre avec nuque raide.
- **Ce qu'on fait à bord.** Vérifier le CO₂ de la zone ; paracétamol, ibuprofène ou aspirine ; boire et se reposer.
- **Quand appeler le sol.** Mal de tête qui augmente avec un trouble de la vue.

#### Atteinte de la vision liée au vol (SANS)

*F-APE-06 · ISS 6 mois : 34 % · Mars 3 ans : 34 %*

- **Comment le reconnaître.** Vision de près moins nette en mission longue. À l'examen : gonflement du nerf optique, plis au fond de l'œil, arrière de l'œil aplati (revue SANS 2020).
- **Signes d'alarme.** Douleur intense ou perte brutale de la vue.
- **Ce qu'on fait à bord.** Lunettes de correction plus forte, prévues par la norme (V1 3004) ; examens réguliers de l'œil : acuité, fond d'œil, échographie selon le matériel.
- **Quand appeler le sol.** Vue qui continue de baisser : médecin de vol, ophtalmologiste.
- **Ce qui manque.** Le mécanisme et une contre-mesure efficace restent inconnus ; le rythme des examens est à fournir par la NASA.

#### Constipation d'adaptation

*F-APE-07 · ISS 6 mois : 17 % · Mars 3 ans : 17 %*

- **Comment le reconnaître.** Selles rares ou difficiles en début de vol, avec peu de boisson ou de fibres.
- **Signes d'alarme.** Ventre dur et douloureux, vomissements, arrêt des gaz : occlusion possible.
- **Ce qu'on fait à bord.** Boire, manger des fibres, bouger ; bisacodyl si besoin.
- **Quand appeler le sol.** Plus de 5 jours sans selles, ou douleur forte (seuil choisi par AURA).

#### Rétention urinaire d'adaptation

*F-APE-08 · ISS 6 mois : hommes 0,70 %, femmes 5,6 % · mêmes chiffres sur 3 ans*

- **Comment le reconnaître.** Envie d'uriner sans y parvenir et vessie tendue, en début de vol ; les médicaments contre la nausée peuvent y contribuer. Brûlures et fièvre orientent vers une infection urinaire.
- **Signes d'alarme.** Aucune urine depuis 8 heures avec douleur du bas-ventre (seuil choisi par AURA).
- **Ce qu'on fait à bord.** Uriner à heures fixes ; revoir les médicaments en cours ; sonde urinaire avec gel de lidocaïne, posée par le responsable médical ; tamsulosine.
- **Quand appeler le sol.** Tout de suite si la sonde ne passe pas.

#### Incontinence urinaire d'adaptation

*F-APE-09 · ISS 6 mois : femmes 5,6 % · la NASA ne la calcule pas chez les hommes*

- **Comment le reconnaître.** Fuites urinaires en début de vol. Brûlures ou fièvre orientent vers une infection.
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Uriner à heures fixes, protections absorbantes, recherche d'une infection.
- **Quand appeler le sol.** Pas nécessaire.

#### Saignement de nez d'adaptation

*F-APE-10 · ISS 6 mois : 0,90 % · Mars 3 ans : 0,90 %*

- **Comment le reconnaître.** Saignement de nez, souvent avec un nez bouché et un air sec.
- **Signes d'alarme.** Saignement abondant qui ne s'arrête pas ; traitement contre les caillots en cours.
- **Ce qu'on fait à bord.** Pincer le nez 10 minutes, tête droite, avec des compresses pour capter les gouttes ; mèche imbibée d'oxymétazoline ; nitrate d'argent posé par le responsable médical.
- **Quand appeler le sol.** Plus de 20 minutes de saignement malgré la compression.

#### Caillot dans la veine jugulaire

*F-APE-11 · condition ajoutée · fréquence en mission longue inconnue*

- **Comment le reconnaître.** Souvent aucun symptôme. Sur 11 astronautes de l'ISS, 6 avaient un flux ralenti ou inversé dans la veine jugulaire vers le 50e jour, et l'un d'eux un caillot qui la bouchait ; seule l'échographie du cou l'a montré (Marshall-Goebel 2019).
- **Signes d'alarme.** Douleur dans la poitrine ou essoufflement brutal : le caillot peut avoir migré vers le poumon.
- **Ce qu'on fait à bord.** Échographie du cou guidée par le sol ; traitement contre les caillots décidé par le sol. Une dépression appliquée au bas du corps a amélioré le flux dans 59 % des séances : c'est une piste encore à l'étude.
- **Quand appeler le sol.** Pour tout caillot : médecin de vol, spécialiste.
- **Ce qui manque.** Le produit contre les caillots et son stock, le rythme du dépistage, et la conduite à tenir sans évacuation.

#### Mal des transports au retour dans la gravité

*F-APE-12 · condition ajoutée · probabilité à fournir par la NASA*

- **Comment le reconnaître.** Nausées, vertiges et instabilité après l'arrivée sur Terre ou sur Mars ; les symptômes peuvent revenir dans les 10 jours après le retour (Khalid 2023).
- **Signes d'alarme.** Chute avec choc à la tête.
- **Ce qu'on fait à bord.** Mêmes médicaments que pour le mal de l'espace ; tête bougée lentement ; aide pour se déplacer ; aucune tâche à risque les premiers jours (choix AURA).
- **Quand appeler le sol.** Seulement en cas de blessure.

#### Malaise en se levant au retour

*F-APE-13 · condition ajoutée · probabilité à fournir par la NASA*

- **Comment le reconnaître.** Vertige, vue qui se trouble et pouls rapide en se levant après le retour dans la gravité. La norme en fait une zone de prévention obligatoire (V1 3003). Une douleur dans la poitrine ou des palpitations irrégulières orientent vers le cœur.
- **Signes d'alarme.** Perte de connaissance.
- **Ce qu'on fait à bord.** Se lever lentement et s'asseoir au premier signe ; boire avant l'entrée dans l'atmosphère (la norme prévoit au moins un litre plus 500 ml pour cette recharge) ; vêtements de compression si la mission en prévoit. Pouls et tension mesurés couché, puis debout.
- **Quand appeler le sol.** Malaise qui se répète.

#### Perte osseuse

*F-APE-14 · condition ajoutée · attendue en apesanteur sans contre-mesure*

- **Comment la reconnaître.** Aucun symptôme ; une densitométrie la mesure avant et après le vol. La norme demande de garder la hanche et la colonne au-dessus de 95 % de la densité d'avant le vol, et le col du fémur au-dessus de 90 % (V1 4027).
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Exercice de résistance chaque jour ; calcium et vitamine D ; boire assez, car le calcium perdu par les os passe dans les urines et favorise les calculs rénaux.
- **Quand appeler le sol.** Séances manquées plusieurs jours de suite : équipe d'exercice, nutrition.
- **Ce qui manque.** Un moyen de mesurer la densité osseuse en vol.

#### Perte de force et d'endurance

*F-APE-15 · condition ajoutée*

- **Comment la reconnaître.** Séances manquées, fatigue à l'effort, baisse aux tests périodiques. La norme demande au moins 80 % de la force et de la capacité aérobie d'avant le vol (V1 4003, V1 4024), et une capacité minimale avant chaque sortie.
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Programme d'exercice sur tapis, vélo et appareil de résistance. Si un appareil tombe en panne, plan de remplacement établi avec le sol.
- **Quand appeler le sol.** Test sous la limite avant une sortie : équipe d'exercice, ingénieur biomédical.

#### Anémie spatiale

*F-APE-16 · condition ajoutée · effet en mission longue inconnu*

- **Comment la reconnaître.** Fatigue et essoufflement à l'effort ; seule une prise de sang la montre. Le corps détruit plus de globules rouges en vol (Trudel 2022).
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Suivi de l'hémoglobine si le laboratoire de bord le permet ; alimentation adaptée.
- **Quand appeler le sol.** Fatigue inexpliquée qui dure : médecin de vol, nutrition.
- **Ce qui manque.** Un seuil d'alerte et la liste des analyses possibles à bord.

## Fiches : infections, peau et allergies

La peau et les voies respiratoires donnent la plupart des événements observés sur l'ISS. Chez 37 astronautes des expéditions 1 à 28, soit 16,75 années de vol cumulées, la NASA a compté 1,2 éruption ou réaction cutanée par année de vol, et 0,7 gêne respiratoire haute (Babiak-Vazquez et al., NASA). Le système immunitaire est perturbé en vol (Crucian 2018). Dès qu'une infection apparaît, AURA vérifie si d'autres équipiers ont les mêmes signes.

#### Éruption cutanée

*F-INF-01 · ISS 6 mois : 82 % · Mars 3 ans : plus de 99,9 %*

- **Comment la reconnaître.** Plaques rouges, démangeaisons, peau sèche ou irritée, parfois après un produit, un tissu ou un adhésif. Une bande douloureuse d'un seul côté oriente vers un zona ; une rougeur chaude qui s'étend, vers une infection.
- **Signes d'alarme.** Éruption avec fièvre, cloques, ou atteinte de la bouche et des yeux ; lèvres ou gorge qui gonflent.
- **Ce qu'on fait à bord.** Arrêter le produit suspect et hydrater la peau ; crème à l'hydrocortisone ; antihistaminique (loratadine ou fexofénadine) ; corticoïde plus fort (fluocinonide) sur décision du responsable médical.
- **Quand appeler le sol.** Éruption qui s'étend malgré le traitement, avec une photo : médecin de vol, dermatologue.

#### Infection respiratoire

*F-INF-02 · ISS 6 mois : 45 % · Mars 3 ans : 97 %*

- **Comment la reconnaître.** Nez qui coule, toux, mal de gorge, fièvre légère, fatigue. Un nez bouché seul en début de vol est plutôt lié à l'apesanteur ; des signes chez plusieurs équipiers après l'arrivée d'un véhicule font penser à une contagion.
- **Signes d'alarme.** Saturation sous 90 %, essoufflement, douleur dans la poitrine ; fièvre d'au moins 39 °C.
- **Ce qu'on fait à bord.** Repos, boisson, masque et lavage des mains pour protéger l'équipage ; paracétamol, médicament contre la toux (dextrométhorphane ou benzonatate), pseudoéphédrine. Un antibiotique (azithromycine, amoxicilline ou lévofloxacine) seulement si une cause bactérienne est probable, sur décision du responsable médical.
- **Quand appeler le sol.** Fièvre au-delà de 3 jours, ou essoufflement : médecin de vol.

#### Infection de la peau

*F-INF-03 · ISS 6 mois : 21 % · Mars 3 ans : 76 %*

- **Comment la reconnaître.** Rougeur chaude et douloureuse, souvent autour d'une écorchure, parfois avec du pus. Une démangeaison sans chaleur oriente plutôt vers une éruption.
- **Signes d'alarme.** Rougeur qui s'étend vite, traînées rouges, fièvre, douleur bien plus forte que ce que l'on voit.
- **Ce qu'on fait à bord.** Nettoyer, puis tracer au stylo le bord de la rougeur pour suivre son évolution ; pommade antibiotique (mupirocine ou bacitracine) ; antibiotique par la bouche (clindamycine, doxycycline ou sulfaméthoxazole-triméthoprime) donné par le responsable médical ; ceftriaxone injectable si l'infection progresse.
- **Quand appeler le sol.** Rougeur qui dépasse le trait après 24 heures de traitement : médecin de vol.

#### Réaction allergique légère ou modérée

*F-INF-04 · ISS 6 mois : 18 % · Mars 3 ans : 70 %*

- **Comment la reconnaître.** Urticaire, démangeaisons, yeux qui pleurent ou éternuements après une exposition. Des allergies nouvelles sont rapportées en vol (Crucian 2018). La fièvre oriente plutôt vers une infection.
- **Signes d'alarme.** Lèvres, langue ou gorge qui gonflent, souffle court, malaise : allergie grave.
- **Ce qu'on fait à bord.** Écarter la cause ; loratadine ou fexofénadine ; diphénhydramine, qui endort ; prednisone pendant quelques jours si la réaction est étendue, sur décision du responsable médical.
- **Quand appeler le sol.** Réaction qui revient sans cause trouvée : médecin de vol, équipe environnement.
- **Ce qui manque.** Les allergies connues de chaque astronaute (dossier médical).

#### Zona

*F-INF-05 · ISS 6 mois : 1,8 % · Mars 3 ans : 10 %*

- **Comment le reconnaître.** Douleur ou brûlure sur une bande d'un seul côté du corps, puis petites cloques sur cette bande. Le virus de la varicelle se réveille souvent en vol, le plus souvent sans symptôme. Une éruption des deux côtés oriente ailleurs.
- **Signes d'alarme.** Atteinte du front, du nez ou de l'œil, qui menace la vue ; fièvre avec confusion.
- **Ce qu'on fait à bord.** Valaciclovir dès les premiers jours, donné par le responsable médical ; antalgiques ; lésions couvertes.
- **Quand appeler le sol.** Toujours, et en priorité si l'œil est touché : médecin de vol, ophtalmologiste.
- **Ce qui manque.** Le statut vaccinal de chaque astronaute.

#### Grippe

*F-INF-06 · ISS 6 mois : 1,8 % · Mars 3 ans : 10 %*

- **Comment la reconnaître.** Fièvre brutale, courbatures, toux, grande fatigue.
- **Signes d'alarme.** Essoufflement, saturation basse, confusion.
- **Ce qu'on fait à bord.** Repos, boisson, masque et distance avec l'équipage ; paracétamol. La liste de 2023 consultée ne contient pas d'antiviral contre la grippe : à confirmer par la NASA.
- **Quand appeler le sol.** Toujours, pour organiser le travail de l'équipage : médecin de vol, direction de vol.
- **Ce qui manque.** Antiviraux et vaccins prévus pour la mission.

#### Septicémie

*F-INF-07 · ISS 6 mois : 0,12 % · Mars 3 ans : 0,72 %*

- **Comment la reconnaître.** Une infection connue, avec de la fièvre ou au contraire une température basse, un pouls et une respiration rapides, une tension basse, de la confusion.
- **Signes d'alarme.** C'est une urgence en soi ; le score d'alerte inspiré de NEWS2 la fait ressortir tôt.
- **Ce qu'on fait à bord.** Le responsable médical donne de l'oxygène et pose une perfusion ; antibiotique injectable au plus vite (ceftriaxone ou ertapénem) ; recherche de la source avec l'échographie : urines, peau, ventre ou poumons.
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol.
- **Si le sol ne répond pas.** Surveillance toutes les heures de la conscience, du pouls, de la saturation et des urines ; perfusion et antibiotique poursuivis selon la fiche ; soins de confort si rien n'agit, selon les critères fournis par la NASA.
- **Ce qui manque.** La quantité de perfusion à bord et la conduite complète sans évacuation.

#### Allergie grave (anaphylaxie)

*F-INF-08 · ISS 6 mois : 0,025 % · Mars 3 ans : 0,15 %*

- **Comment la reconnaître.** Après une exposition : gonflement des lèvres, de la langue ou de la gorge, souffle court, urticaire, malaise, tension qui baisse.
- **Signes d'alarme.** C'est une urgence en soi.
- **Ce qu'on fait à bord.** Adrénaline tout de suite, avec le stylo auto-injecteur ou la seringue de la trousse d'urgence. Puis le responsable médical donne de l'oxygène et pose une perfusion ; diphénhydramine injectable, corticoïde (méthylprednisolone ou dexaméthasone) ; salbutamol si la respiration siffle.
- **Quand appeler le sol.** Dès que les premiers gestes sont faits : médecin de vol.
- **Si le sol ne répond pas.** Surveillance rapprochée pendant plusieurs heures, car la réaction peut revenir ; nouvelle dose d'adrénaline si les signes reviennent.
- **Ce qui manque.** Le nombre de doses d'adrénaline à bord et la durée de surveillance recommandée.

#### Réveil d'un virus sans symptôme

*F-INF-09 · condition ajoutée*

- **Comment le reconnaître.** Le plus souvent, rien. Le virus de la varicelle a été retrouvé dans la salive d'environ la moitié des astronautes en mission courte, et des deux tiers en mission longue (Crucian 2018). Parfois apparaît un bouton de fièvre ou un zona.
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Rien sans symptôme ; valaciclovir si un zona apparaît.
- **Quand appeler le sol.** Pas nécessaire.
- **Ce qui manque.** Les analyses possibles à bord et un seuil d'action, encore inconnus.

## Fiches : yeux, oreilles, nez, gorge et dents

En apesanteur, rien ne tombe : poussières, miettes et débris flottent et finissent souvent dans les yeux. Le corps étranger dans l'œil est ainsi la cinquième condition la plus probable de la liste de la NASA. Les soins dentaires font partie des capacités exigées à bord (V1 3004).

### Yeux

#### Corps étranger dans l'œil

*F-TET-01 · ISS 6 mois : 72 % · Mars 3 ans : plus de 99,9 %*

- **Comment le reconnaître.** Sensation de grain de sable, larmes, œil rouge, gêne à la lumière, souvent après un travail qui projette des particules.
- **Signes d'alarme.** Baisse de la vue, douleur intense, objet planté dans l'œil.
- **Ce qu'on fait à bord.** Ne pas frotter ; rincer avec des larmes artificielles ou de l'eau propre. Le responsable médical examine l'œil avec de la fluorescéine et un collyre anesthésiant (tétracaïne), réservé à l'examen ; pommade antibiotique (érythromycine) si la cornée est éraillée.
- **Quand appeler le sol.** Gêne au-delà de 24 heures, ou vue qui baisse : médecin de vol, ophtalmologiste.

#### Brûlure chimique de l'œil

*F-TET-02 · ISS 6 mois : 10 % · Mars 3 ans : 48 %*

- **Comment la reconnaître.** Brûlure de l'œil après une projection de liquide, de poudre ou de vapeur.
- **Signes d'alarme.** C'est une urgence de quelques minutes : rincer avant tout.
- **Ce qu'on fait à bord.** Rincer longtemps et abondamment avec le lave-œil, aidé par un équipier ; identifier le produit ; examen à la fluorescéine par le responsable médical ; antibiotique local et antalgiques.
- **Quand appeler le sol.** Toujours, avec le nom du produit : médecin de vol, équipe environnement, ophtalmologiste.
- **Ce qui manque.** La liste des produits chimiques à bord et leurs risques pour l'œil.

#### Infection de l'œil

*F-TET-03 · ISS 6 mois : 8,7 % · Mars 3 ans : 42 %*

- **Comment la reconnaître.** Œil rouge, paupières collées, écoulement. Une douleur forte avec une baisse de la vue oriente vers un ulcère ou un glaucome.
- **Signes d'alarme.** Douleur forte, vue qui baisse, port de lentilles de contact.
- **Ce qu'on fait à bord.** Hygiène et compresses propres, pas de lentilles ; collyre ou pommade antibiotique (moxifloxacine, tobramycine, érythromycine) ; olopatadine si l'origine est allergique.
- **Quand appeler le sol.** Pas de mieux en 48 heures : médecin de vol.

#### Ulcère de la cornée

*F-TET-04 · ISS 6 mois : 0,0070 % · Mars 3 ans : 0,042 %*

- **Comment le reconnaître.** Douleur de l'œil, rougeur, tache blanche sur la cornée, vue floue, souvent chez un porteur de lentilles.
- **Signes d'alarme.** C'est une menace pour la vue.
- **Ce qu'on fait à bord.** Retirer les lentilles ; collyre antibiotique fréquent (moxifloxacine ou tobramycine), donné par le responsable médical ; examen à la fluorescéine chaque jour.
- **Quand appeler le sol.** Tout de suite : médecin de vol, ophtalmologiste.

#### Décollement de la rétine

*F-TET-05 · ISS 6 mois : hommes 0,0060 %, femmes 0,0033 %*

- **Comment le reconnaître.** Éclairs lumineux, pluie de points noirs, rideau qui cache une partie de la vue.
- **Signes d'alarme.** C'est une urgence pour la vue.
- **Ce qu'on fait à bord.** Noter l'heure du début ; échographie de l'œil par le responsable médical, guidée par le sol. Il n'existe pas de traitement à bord : la réparation est chirurgicale.
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol, ophtalmologiste.
- **Ce qui manque.** La conduite à tenir quand aucune évacuation n'est possible.

#### Glaucome aigu

*F-TET-06 · ISS 6 mois : hommes 0,0014 %, femmes 0,0028 %*

- **Comment le reconnaître.** Œil rouge et très douloureux, vue floue avec des halos, mal de tête, nausées.
- **Signes d'alarme.** C'est une urgence pour la vue. Les gouttes qui dilatent la pupille (cyclopentolate, tropicamide) sont à éviter.
- **Ce qu'on fait à bord.** Acétazolamide par la bouche pour baisser la pression de l'œil, sur avis, par le responsable médical ; antalgiques et médicament contre la nausée.
- **Quand appeler le sol.** Tout de suite : médecin de vol, ophtalmologiste.
- **Ce qui manque.** Les collyres contre le glaucome disponibles à bord.

#### Plaie de l'œil

*F-TET-07 · ISS 6 mois : 0,00047 % · Mars 3 ans : 0,0028 %*

- **Comment la reconnaître.** Objet planté dans l'œil ou plaie de l'œil, vue très diminuée.
- **Signes d'alarme.** C'est une urgence pour la vue.
- **Ce qu'on fait à bord.** Ne rien retirer, ne pas appuyer ; coque rigide sur l'œil ; antibiotique, antalgiques et médicament contre la nausée, donnés par le responsable médical.
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol, ophtalmologiste.

### Oreilles, nez et gorge

#### Barotraumatisme de l'oreille ou des sinus

*F-TET-08 · ISS 6 mois : 43 % · Mars 3 ans : 97 %*

- **Comment le reconnaître.** Douleur ou oreille bouchée pendant ou après un changement de pression, surtout avec un nez bouché.
- **Signes d'alarme.** Vertige fort, perte d'audition brutale.
- **Ce qu'on fait à bord.** Arrêter le changement de pression : la norme exige de pouvoir faire une pause à 1 psi près (V2 6150). Bâiller, avaler, souffler doucement nez pincé ; décongestionnant avant les changements prévus.
- **Quand appeler le sol.** Douleur qui dure, ou avant une sortie : médecin de vol.

#### Mal de gorge

*F-TET-09 · ISS 6 mois : 18 % · Mars 3 ans : 70 %*

- **Comment le reconnaître.** Gorge douloureuse, déglutition pénible, parfois fièvre. Toux et nez qui coule orientent vers un virus.
- **Signes d'alarme.** Impossible d'avaler sa salive, voix étouffée, souffle gêné.
- **Ce qu'on fait à bord.** Boire ; paracétamol ou ibuprofène ; antibiotique (amoxicilline ou azithromycine) seulement si une angine à streptocoque est probable, sur décision du responsable médical.
- **Médecine clinique.** Des dépôts blancs sur les amygdales multiplient par 3,4 les chances d'une angine à streptocoque (Ebell 2000). Le score de McIsaac guide l'antibiotique : à 4 points ou plus, 55 % des patients ont cette angine ; à 1 point ou moins, 12 % (Ebell 2014).
- **Quand appeler le sol.** Fièvre au-delà de 3 jours : médecin de vol.
- **Ce qui manque.** Les tests rapides disponibles à bord.

#### Sinusite

*F-TET-10 · ISS 6 mois : 10 % · Mars 3 ans : 48 %*

- **Comment la reconnaître.** Douleur du visage qui augmente en se penchant, nez bouché avec un écoulement épais, parfois fièvre, pendant plus de dix jours ou avec une aggravation. Un nez bouché seul en début de vol est lié à l'apesanteur.
- **Signes d'alarme.** Gonflement autour de l'œil, mal de tête violent, fièvre forte.
- **Ce qu'on fait à bord.** Eau salée, corticoïde nasal (mométasone), décongestionnant ; antibiotique (amoxicilline ou doxycycline) si cela dure, sur décision du responsable médical.
- **Quand appeler le sol.** En cas de signe d'alarme : médecin de vol.

#### Perte d'audition

*F-TET-11 · ISS 6 mois : 9,4 % · Mars 3 ans : 45 %*

- **Comment la reconnaître.** Sons étouffés, sifflement d'oreille, après du bruit, un barotraumatisme ou un bouchon de cire. Douleur et fièvre orientent vers une otite.
- **Signes d'alarme.** Perte brutale d'un côté.
- **Ce qu'on fait à bord.** Protections auditives au-delà de 72 dBA sur 16 heures ; peroxyde de carbamide contre un bouchon de cire ; test d'audition à bord si le matériel existe.
- **Quand appeler le sol.** Perte brutale, tout de suite : médecin de vol, spécialiste ORL.
- **Ce qui manque.** Un audiomètre à bord et des mesures de bruit par zone.

#### Otite externe

*F-TET-12 · ISS 6 mois : 5,3 % · Mars 3 ans : 28 %*

- **Comment la reconnaître.** Conduit de l'oreille douloureux et qui démange, douleur quand on tire l'oreille, parfois après des écouteurs portés longtemps.
- **Signes d'alarme.** Fièvre, gonflement derrière l'oreille.
- **Ce qu'on fait à bord.** Garder l'oreille sèche et arrêter les écouteurs ; gouttes de ciprofloxacine et dexaméthasone, données par le responsable médical.
- **Quand appeler le sol.** Pas de mieux en 72 heures : médecin de vol.

#### Otite moyenne

*F-TET-13 · ISS 6 mois : 5,3 % · Mars 3 ans : 28 %*

- **Comment la reconnaître.** Douleur profonde de l'oreille, audition diminuée, fièvre, souvent après un rhume.
- **Signes d'alarme.** Gonflement derrière l'oreille, mal de tête violent, vertige fort.
- **Ce qu'on fait à bord.** Antalgiques, décongestionnant ; amoxicilline si cela dure ou en cas de fièvre forte, sur décision du responsable médical.
- **Quand appeler le sol.** Avant tout changement de pression : médecin de vol.

### Bouche et dents

#### Aphte

*F-TET-14 · ISS 6 mois : 15 % · Mars 3 ans : 63 %*

- **Comment le reconnaître.** Petite plaie de la bouche, ronde, blanche et douloureuse.
- **Signes d'alarme.** Plaies nombreuses avec fièvre, ou atteinte des yeux.
- **Ce qu'on fait à bord.** Bains de bouche, aliments doux ; benzocaïne locale.
- **Quand appeler le sol.** Plaie qui dure plus de deux semaines.

#### Carie

*F-TET-15 · ISS 6 mois : 14 % · Mars 3 ans : 59 %*

- **Comment la reconnaître.** Douleur d'une dent au chaud, au froid ou au sucré. Jamais survenue en vol d'après la NASA ; la nouvelle liste IMPACT 1.0 l'a mise de côté pour une version future.
- **Signes d'alarme.** Gonflement de la joue, fièvre : abcès possible.
- **Ce qu'on fait à bord.** Brossage et fluor ; pansement provisoire à l'eugénol, posé par le responsable médical ; antalgiques.
- **Quand appeler le sol.** Douleur qui réveille la nuit : dentiste.

#### Abcès dentaire

*F-TET-16 · ISS 6 mois : 1,1 % · Mars 3 ans : 6,7 %*

- **Comment le reconnaître.** Douleur forte et continue d'une dent, gonflement de la gencive ou de la joue, parfois fièvre.
- **Signes d'alarme.** Gonflement du cou ou sous la langue, difficulté à avaler ou à respirer.
- **Ce qu'on fait à bord.** Antibiotique (amoxicilline ou clindamycine) et antalgiques, donnés par le responsable médical ; drainage seulement s'il a été formé à ce geste.
- **Quand appeler le sol.** Toujours : médecin de vol, dentiste.

#### Pulpe dentaire à nu

*F-TET-17 · ISS 6 mois : 1,0 % · Mars 3 ans : 5,9 %*

- **Comment la reconnaître.** Dent cassée avec un point rose ou rouge, douleur vive à l'air et au froid.
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Pansement provisoire à l'eugénol sur la pulpe, posé par le responsable médical ; antalgiques.
- **Quand appeler le sol.** Toujours : dentiste.

#### Perte d'un plombage

*F-TET-18 · ISS 6 mois : 0,26 % · Mars 3 ans : 1,5 %*

- **Comment la reconnaître.** Trou dans une dent déjà soignée, sensibilité.
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Pansement provisoire posé par le responsable médical ; antalgiques.
- **Quand appeler le sol.** Pas nécessaire.

#### Dent arrachée

*F-TET-19 · ISS 6 mois : 0,15 % · Mars 3 ans : 0,87 %*

- **Comment la reconnaître.** Dent sortie de son logement après un choc.
- **Signes d'alarme.** Choc à la tête associé.
- **Ce qu'on fait à bord.** Tenir la dent par la couronne sans toucher la racine, et la garder humide ; le responsable médical la remet en place au plus vite et la maintient ; antalgiques, antibiotique sur avis.
- **Quand appeler le sol.** Toujours : dentiste.

#### Perte d'une couronne

*F-TET-20 · non calculée par la NASA · à activer pour tout astronaute qui porte une couronne*

- **Comment la reconnaître.** Couronne décollée ou avalée.
- **Signes d'alarme.** Couronne inhalée, avec toux ou souffle gêné.
- **Ce qu'on fait à bord.** Recollage avec un ciment provisoire par le responsable médical.
- **Quand appeler le sol.** Seulement en cas d'inhalation.
- **Ce qui manque.** Le dossier dentaire de chaque astronaute.

### Voies aériennes

#### Fausse route

*F-TET-21 · ISS 6 mois : 5,3 % · Mars 3 ans : 28 %*

- **Comment la reconnaître.** Toux brutale en mangeant, mains à la gorge, impossible de parler ou de respirer.
- **Signes d'alarme.** C'est une urgence en soi.
- **Ce qu'on fait à bord.** Si la personne tousse, la laisser tousser. Sinon, compressions du ventre par un équipier qui s'ancre au véhicule. En cas de perte de connaissance, réanimation et matériel d'intubation du responsable médical.
- **Quand appeler le sol.** Après les premiers gestes : médecin de vol.
- **Ce qui manque.** Une technique de compression validée en apesanteur, et la formation de l'équipage.

## Fiches : ventre, reins, voies urinaires et gynécologie

Les troubles digestifs simples sont fréquents ; les urgences du ventre sont rares mais graves, car il n'y a pas de chirurgie à bord. L'échographie et les antibiotiques injectables font alors l'essentiel du travail, avec l'évacuation quand elle est possible. L'infection urinaire touche surtout les femmes : 49 % sur 6 mois, contre 8,1 % chez les hommes.

### Appareil digestif

#### Diarrhée

*F-DIG-01 · ISS 6 mois : 45 % · Mars 3 ans : 97 %*

- **Comment la reconnaître.** Selles liquides et fréquentes, parfois avec des crampes. Des vomissements et de la fièvre chez plusieurs équipiers font penser à une cause commune : eau, nourriture ou contagion.
- **Signes d'alarme.** Sang dans les selles, fièvre forte, signes de déshydratation (pouls rapide, urines rares).
- **Ce qu'on fait à bord.** Boire beaucoup, avec une solution de réhydratation ; lopéramide ou sous-salicylate de bismuth ; antibiotique (azithromycine) en cas de fièvre ou de sang, sur décision du responsable médical.
- **Quand appeler le sol.** Au-delà de 48 heures, ou si plusieurs équipiers sont touchés : médecin de vol, équipe environnement, nutrition.

#### Gastro-entérite

*F-DIG-02 · ISS 6 mois : 7,1 % · Mars 3 ans : 36 %*

- **Comment la reconnaître.** Vomissements et diarrhée, crampes, parfois une fièvre légère. Des nausées seules en début de vol orientent vers le mal de l'espace ; une douleur fixe en bas à droite, vers l'appendicite.
- **Signes d'alarme.** Impossible de boire, ventre dur, sang.
- **Ce qu'on fait à bord.** Réhydratation par petites gorgées ; ondansétron ou prométhazine ; perfusion posée par le responsable médical si la personne ne garde rien. Sacs à vomi et hygiène stricte pour l'équipage.
- **Quand appeler le sol.** Plus de 24 heures sans pouvoir boire : médecin de vol.

#### Indigestion, reflux

*F-DIG-03 · ISS 6 mois : 10 % · Mars 3 ans : 48 %*

- **Comment la reconnaître.** Brûlure derrière le sternum ou dans le haut du ventre après les repas, renvois acides. Une douleur dans la poitrine à l'effort, avec sueurs ou essoufflement, oriente vers le cœur.
- **Signes d'alarme.** Vomissement de sang, selles noires, douleur dans la poitrine.
- **Ce qu'on fait à bord.** Repas plus petits, rien juste avant de dormir ; oméprazole ou famotidine ; sous-salicylate de bismuth.
- **Quand appeler le sol.** Gêne au-delà de deux semaines : médecin de vol.

#### Hémorroïdes

*F-DIG-04 · ISS 6 mois : 3,6 % · Mars 3 ans : 20 %*

- **Comment les reconnaître.** Douleur ou gêne anale, sang rouge sur le papier, souvent avec de la constipation.
- **Signes d'alarme.** Saignement abondant.
- **Ce qu'on fait à bord.** Fibres et boisson, bisacodyl en cas de constipation ; crème à l'hydrocortisone, lidocaïne locale.
- **Quand appeler le sol.** Douleur forte avec une boule dure.

#### Appendicite

*F-DIG-05 · ISS 6 mois : 0,047 % · Mars 3 ans : 0,28 %*

- **Comment la reconnaître.** Douleur qui commence autour du nombril puis se fixe en bas à droite, perte d'appétit, nausées, fièvre modérée. Une diarrhée abondante dès le début oriente vers une gastro-entérite.
- **Signes d'alarme.** Ventre dur, fièvre forte.
- **Ce qu'on fait à bord.** Rester à jeun ; échographie par le responsable médical ; antibiotiques injectables, seule option sans chirurgie (ertapénem, ou ceftriaxone avec métronidazole), sur avis ; perfusion et antalgiques.
- **Médecine clinique.** Une douleur en bas à droite multiplie les chances par 8,4, et son absence les divise par plus de cinq (0,18). La migration de la douleur depuis le nombril compte pour 3,6, la fièvre pour 3,2 (Ebell 2008).
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol, chirurgien.
- **Si le sol ne répond pas.** Antibiotiques poursuivis, température et douleur notées toutes les 4 heures, alimentation reprise seulement quand la douleur recule.
- **Ce qui manque.** Le protocole antibiotique complet sans chirurgie.

#### Vésicule biliaire

*F-DIG-06 · ISS 6 mois : hommes 0,038 %, femmes 0,064 %*

- **Comment la reconnaître.** Douleur forte en haut à droite du ventre, souvent après un repas gras, parfois vers l'épaule droite ; fièvre en cas d'infection.
- **Signes d'alarme.** Fièvre avec peau ou yeux jaunes.
- **Ce qu'on fait à bord.** Rester à jeun ; échographie ; kétorolac contre la douleur et médicament contre la nausée ; antibiotiques (ceftriaxone avec métronidazole) en cas de fièvre, donnés par le responsable médical.
- **Quand appeler le sol.** Toujours : médecin de vol, chirurgien.

#### Diverticulite

*F-DIG-07 · ISS 6 mois : 0,071 % · Mars 3 ans : 0,43 %*

- **Comment la reconnaître.** Douleur en bas à gauche du ventre, fièvre, troubles du transit.
- **Signes d'alarme.** Ventre dur, fièvre forte.
- **Ce qu'on fait à bord.** Alimentation légère et liquide ; antibiotiques par la bouche, par exemple lévofloxacine avec métronidazole ; ertapénem injectable si c'est grave, donné par le responsable médical.
- **Quand appeler le sol.** Toujours : médecin de vol.

#### Pancréatite

*F-DIG-08 · ISS 6 mois : 0,015 % · Mars 3 ans : 0,092 %*

- **Comment la reconnaître.** Douleur très forte en haut du ventre, qui traverse vers le dos, avec des vomissements.
- **Signes d'alarme.** C'est une urgence.
- **Ce qu'on fait à bord.** Rester à jeun ; perfusion abondante posée par le responsable médical ; antalgique fort (hydromorphone) et médicament contre la nausée ; échographie à la recherche de calculs de la vésicule.
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol.
- **Si le sol ne répond pas.** Perfusion et antalgiques poursuivis, urines et conscience surveillées ; soins de confort si l'état s'aggrave, selon les critères fournis par la NASA.
- **Ce qui manque.** Les analyses de sang possibles à bord.

#### Occlusion de l'intestin

*F-DIG-09 · non calculée par la NASA · à activer pour tout astronaute déjà opéré du ventre*

- **Comment la reconnaître.** Crampes par vagues, ventre gonflé, vomissements, plus de gaz ni de selles.
- **Signes d'alarme.** C'est une urgence.
- **Ce qu'on fait à bord.** Rester à jeun ; perfusion posée par le responsable médical ; sonde dans l'estomac si la NASA en prévoit ; médicament contre la nausée et antalgiques.
- **Quand appeler le sol.** Tout de suite : médecin de vol, chirurgien.
- **Ce qui manque.** Les antécédents de chaque astronaute et le matériel prévu.

#### Hernie

*F-DIG-10 · ISS 6 mois : 0,023 % · Mars 3 ans : 0,14 %*

- **Comment la reconnaître.** Boule dans l'aine ou sur le ventre, qui sort à l'effort et rentre au repos.
- **Signes d'alarme.** Boule dure et douloureuse qui ne rentre plus, avec des vomissements.
- **Ce qu'on fait à bord.** Éviter les efforts qui poussent sur le ventre ; si la hernie ne rentre plus, tentative douce de la remettre en place par le responsable médical, guidé par le sol.
- **Quand appeler le sol.** Tout de suite si elle ne rentre plus : médecin de vol, chirurgien.

### Reins et voies urinaires

#### Infection urinaire

*F-DIG-11 · ISS 6 mois : femmes 49 %, hommes 8,1 % · Mars 3 ans : femmes 98 %, hommes 40 %*

- **Comment la reconnaître.** Brûlures en urinant, envies fréquentes, urines troubles. Des pertes ou une irritation vaginales orientent ailleurs ; une douleur du flanc avec de la fièvre fait craindre une infection du rein.
- **Signes d'alarme.** Fièvre, frissons, douleur du flanc.
- **Ce qu'on fait à bord.** Boire ; nitrofurantoïne ou sulfaméthoxazole-triméthoprime ; en cas de fièvre et de douleur du flanc, lévofloxacine ou ceftriaxone, données par le responsable médical.
- **Médecine clinique.** Chez une femme qui a au moins un symptôme urinaire, la probabilité d'infection est d'environ 50 %. Brûlures et envies fréquentes sans pertes ni irritation vaginales la portent au-delà de 90 % (rapport de vraisemblance 24,6) ; des pertes vaginales la font baisser (0,3) (Bent 2002).
- **Quand appeler le sol.** Fièvre, ou pas de mieux en 48 heures : médecin de vol.
- **Ce qui manque.** Les bandelettes urinaires et les cultures possibles à bord.

#### Calcul rénal

*F-DIG-12 · ISS 6 mois : 0,18 % · Mars 3 ans : 1,1 %*

- **Comment le reconnaître.** Douleur très forte du flanc, par vagues, qui descend vers l'aine, avec du sang dans les urines, des nausées et de l'agitation. La perte osseuse en vol rejette du calcium dans les urines et augmente ce risque. Une douleur qui change avec les mouvements oriente vers le dos.
- **Signes d'alarme.** Fièvre avec douleur du flanc ; plus d'urines du tout.
- **Ce qu'on fait à bord.** Le responsable médical donne un anti-inflammatoire (kétorolac ou ibuprofène), puis de la tamsulosine, et un antalgique plus fort (hydrocodone avec paracétamol) si la douleur persiste et qu'aucune sortie n'est prévue. L'astronaute boit et filtre ses urines ; une échographie du rein confirme.
- **Quand appeler le sol.** Fièvre, ou douleur qui ne cède pas : médecin de vol, ingénieur biomédical.
- **Si le sol ne répond pas.** Douleur et température notées toutes les 4 heures ; avec de la fièvre, suivre la fiche de la septicémie.

#### Prostatite

*F-DIG-13 · ISS 6 mois : hommes 0,25 % · Mars 3 ans : hommes 1,5 %*

- **Comment la reconnaître.** Fièvre, brûlures, douleur du bas-ventre ou du périnée, jet d'urine faible.
- **Signes d'alarme.** Impossible d'uriner ; frissons forts.
- **Ce qu'on fait à bord.** Antibiotique prolongé (lévofloxacine ou sulfaméthoxazole-triméthoprime), donné par le responsable médical ; antalgiques ; tamsulosine si le jet est gêné.
- **Quand appeler le sol.** Toujours : médecin de vol.

### Gynécologie

#### Mycose vaginale

*F-DIG-14 · ISS 6 mois : femmes 3,2 % · Mars 3 ans : femmes 18 %*

- **Comment la reconnaître.** Démangeaisons, pertes blanches épaisses, souvent après des antibiotiques.
- **Signes d'alarme.** Fièvre ou douleur du bas-ventre, qui orientent vers une autre cause.
- **Ce qu'on fait à bord.** Fluconazole par la bouche ou clotrimazole local.
- **Quand appeler le sol.** En cas de récidive : médecin de vol.

#### Saignement utérin anormal

*F-DIG-15 · ISS 6 mois : femmes 2,6 % · Mars 3 ans : femmes 14 %*

- **Comment le reconnaître.** Règles plus abondantes, plus longues, ou en dehors des dates habituelles.
- **Signes d'alarme.** Saignement abondant avec malaise.
- **Ce qu'on fait à bord.** Protections adaptées ; traitement hormonal selon le protocole de la personne (médroxyprogestérone, ou noréthistérone avec éthinylestradiol), sur avis ; hémoglobine si possible.
- **Quand appeler le sol.** Toujours, en privé : médecin de vol.
- **Ce qui manque.** Le protocole individuel, à choisir avant le vol.

#### Grossesse du premier trimestre

*F-DIG-16 · condition ajoutée à IMPACT 1.0 (Kreykes 2023) · probabilité à fournir par la NASA*

- **Comment la reconnaître.** Retard de règles, nausées, seins sensibles ; seul un test le confirme.
- **Signes d'alarme.** Douleur d'un côté du bas-ventre avec saignement ou malaise : grossesse mal placée possible.
- **Ce qu'on fait à bord.** Test, avec l'accord de la personne ; revue de tous les médicaments et des doses de radiations par le responsable médical et le sol.
- **Quand appeler le sol.** Toujours, en privé : médecin de vol, direction de vol pour les décisions de mission.
- **Ce qui manque.** Les tests disponibles à bord et la politique de la mission.

## Fiches : blessures, os, muscles et chocs

Les petites blessures sont les plus fréquentes : écorchures, dos, épaules, souvent en se tenant aux mains courantes, en déplaçant du matériel ou pendant l'exercice. Les traumatismes graves sont rares, mais la perte osseuse augmente le risque de fracture au retour dans la gravité. Les antalgiques cités viennent de la liste de l'ISS : paracétamol, ibuprofène, kétorolac, hydrocodone avec paracétamol, hydromorphone.

### Peau

#### Écorchure

*F-TRA-01 · ISS 6 mois : 82 % · Mars 3 ans : plus de 99,9 %*

- **Comment la reconnaître.** Peau éraflée, souvent aux mains et aux genoux.
- **Signes d'alarme.** Rougeur chaude qui s'étend : infection.
- **Ce qu'on fait à bord.** Nettoyer, pommade antibiotique (bacitracine), pansement.
- **Quand appeler le sol.** Pas nécessaire.

#### Plaie

*F-TRA-02 · ISS 6 mois : 1,8 % · Mars 3 ans : 10 %*

- **Comment la reconnaître.** Coupure qui ouvre la peau.
- **Signes d'alarme.** Saignement qui ne s'arrête pas ; plaie profonde de la main ou près d'une articulation ; fourmillements après la blessure.
- **Ce qu'on fait à bord.** Compression, puis nettoyage abondant. Le responsable médical endort la zone à la lidocaïne et ferme la plaie avec de la colle chirurgicale, des bandelettes ou des points. Surveillance de l'infection.
- **Quand appeler le sol.** Plaie profonde ou de la main : médecin de vol.
- **Ce qui manque.** Le statut vaccinal contre le tétanos de chaque astronaute.

### Dos et cou

#### Blessure du dos

*F-TRA-03 · ISS 6 mois : 44 % · Mars 3 ans : 97 %*

- **Comment la reconnaître.** Douleur du dos après un effort, une manipulation de charge ou un exercice, qui augmente au mouvement. Une douleur de début de vol sans effort oriente vers le mal de dos d'adaptation ; une douleur du flanc avec des urines anormales, vers un calcul.
- **Signes d'alarme.** Faiblesse ou perte de sensibilité des jambes, difficulté à uriner, choc violent.
- **Ce qu'on fait à bord.** Repos relatif, puis reprise progressive de l'exercice ; paracétamol ou ibuprofène ; conseils de l'équipe d'exercice.
- **Quand appeler le sol.** Douleur qui dure plus d'une semaine : médecin de vol, équipe d'exercice.

#### Blessure du cou

*F-TRA-04 · ISS 6 mois : 16 % · Mars 3 ans : 64 %*

- **Comment la reconnaître.** Douleur et raideur du cou après un mouvement brusque, un choc ou une posture tenue longtemps.
- **Signes d'alarme.** Fourmillements ou faiblesse des bras ; choc violent.
- **Ce qu'on fait à bord.** Repos et chaleur douce ; antalgiques ; collier si le sol le demande après un choc.
- **Quand appeler le sol.** Signe d'alarme, ou douleur qui dure : médecin de vol.

### Entorses et élongations

#### Six articulations, une même conduite

*F-TRA-05 à F-TRA-10*

| Fiche | Articulation | ISS 6 mois | Mars 3 ans | À savoir |
| --- | --- | --- | --- | --- |
| F-TRA-05 | Épaule | 34 % | 92 % | Sorties et manipulation de charges |
| F-TRA-06 | Coude | 20 % | 74 % | Outils et travail en scaphandre |
| F-TRA-07 | Cheville | 19 % | 71 % | Surtout en surface et au retour dans la gravité |
| F-TRA-08 | Genou | 12 % | 55 % | Surtout en surface |
| F-TRA-09 | Poignet | 9,0 % | 43 % | Penser à une fracture après une chute |
| F-TRA-10 | Hanche | 7,3 % | 37 % | Penser à une fracture après un choc |

- **Comment la reconnaître.** Douleur, gonflement et mouvement limité après un mouvement forcé.
- **Signes d'alarme.** Déformation, impossibilité de bouger, main ou pied froid ou engourdi.
- **Ce qu'on fait à bord.** Repos, froid si possible, bandage et élévation ; ibuprofène ou paracétamol ; attelle posée par le responsable médical ; échographie si une fracture est possible.
- **Médecine clinique.** Pour la cheville et le pied, les règles d'Ottawa (marcher quatre pas, douleur précise sur certains points des os) détectent 97,6 % des fractures ; quand elles sont négatives, moins de 2 % des patients ont une fracture (Bachmann 2003).
- **Quand appeler le sol.** Avant toute sortie, ou si la douleur dure plus d'une semaine : médecin de vol, équipe d'exercice.

### Luxations

#### Doigt, coude, épaule

*F-TRA-11 à F-TRA-13*

| Fiche | Articulation | ISS 6 mois | Mars 3 ans |
| --- | --- | --- | --- |
| F-TRA-11 | Doigt | 1,8 % | 10 % |
| F-TRA-12 | Coude | 0,0026 % | 0,016 % |
| F-TRA-13 | Épaule | 0,0019 % | 0,011 % |

- **Comment la reconnaître.** Articulation déformée, bloquée et très douloureuse après un choc ou un mouvement forcé.
- **Signes d'alarme.** Doigts ou main froids, pâles ou engourdis.
- **Ce qu'on fait à bord.** Vérifier la sensibilité et la couleur en dessous ; antalgiques ; remise en place par le responsable médical, guidé par le sol, avec un équipier qui sert d'appui ; attelle.
- **Quand appeler le sol.** Toujours pour le coude et l'épaule : médecin de vol, chirurgien orthopédiste.
- **Ce qui manque.** Une technique de remise en place validée en apesanteur.

### Fractures

#### Fatigue, poignet, hanche, colonne

*F-TRA-14 à F-TRA-17*

| Fiche | Fracture | ISS 6 mois | Mars 3 ans | À savoir |
| --- | --- | --- | --- | --- |
| F-TRA-14 | Fracture de fatigue de la jambe ou du pied | H 2,1 % / F 3,3 % | H 12 % / F 18 % | Marche en surface après des mois sans gravité |
| F-TRA-15 | Poignet | 0,12 % | 0,71 % | Chute sur la main |
| F-TRA-16 | Hanche | H 0,021 % / F 0,0056 % | H 0,13 % / F 0,034 % | Choc ou chute en gravité |
| F-TRA-17 | Colonne lombaire | H 0,010 % / F 0,0086 % | H 0,060 % / F 0,052 % | Choc violent, atterrissage |

- **Comment la reconnaître.** Douleur précise sur l'os, gonflement, impossible de s'appuyer. Pour la fracture de fatigue, la douleur monte au fil des jours de marche.
- **Signes d'alarme.** Os visible, déformation, main ou pied froid ; pour la colonne, faiblesse des jambes ou difficulté à uriner.
- **Ce qu'on fait à bord.** Immobiliser, sans bouger la colonne si elle peut être touchée ; antalgiques adaptés, donnés par le responsable médical ; échographie pour confirmer ; attelle.
- **Quand appeler le sol.** Toujours : médecin de vol, chirurgien orthopédiste.
- **Ce qui manque.** L'imagerie disponible à bord et la conduite sans évacuation.

### Autres atteintes des membres

#### Arthrite aiguë

*F-TRA-18 · ISS 6 mois : hommes 0,077 %, femmes 0,19 %*

- **Comment la reconnaître.** Articulation rouge, chaude, gonflée et très douloureuse, sans choc, parfois au gros orteil (goutte).
- **Signes d'alarme.** Fièvre, qui fait craindre une infection de l'articulation.
- **Ce qu'on fait à bord.** Repos et froid ; anti-inflammatoire (ibuprofène, kétorolac), ou prednisone sur avis ; antibiotiques si une infection est probable.
- **Quand appeler le sol.** Toujours en cas de fièvre : médecin de vol.

#### Syndrome des loges

*F-TRA-19 · ISS 6 mois : hommes 0,0037 %, femmes 0,00035 %*

- **Comment le reconnaître.** Après un écrasement ou une fracture, une douleur qui augmente et devient bien plus forte que la blessure, un muscle tendu, des fourmillements.
- **Signes d'alarme.** C'est une urgence : le membre est menacé.
- **Ce qu'on fait à bord.** Retirer tout bandage serré, garder le membre à hauteur du cœur ; antalgiques. Le traitement est chirurgical et n'existe pas à bord.
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol, chirurgien.

### Traumatismes graves

#### Traumatisme crânien

*F-TRA-20 · ISS 6 mois : 0,021 % · Mars 3 ans : 0,13 %*

- **Comment le reconnaître.** Choc à la tête, avec ou sans perte de connaissance.
- **Signes d'alarme.** Somnolence qui augmente, vomissements répétés, mal de tête qui s'aggrave, pupilles inégales, convulsion, faiblesse d'un côté.
- **Ce qu'on fait à bord.** Nuque immobile si le choc est violent ; conscience vérifiée toutes les 15 minutes pendant les premières heures ; aucun médicament qui endort ; paracétamol contre la douleur.
- **Quand appeler le sol.** Tout de suite : médecin de vol, neurologue.
- **Si le sol ne répond pas.** Surveillance de la conscience pendant au moins 24 heures, toujours par la même personne, pour repérer un changement.
- **Ce qui manque.** Un outil d'évaluation neurologique validé à bord.

#### Traumatisme du thorax

*F-TRA-21 · ISS 6 mois : 0,013 % · Mars 3 ans : 0,077 %*

- **Comment le reconnaître.** Douleur du thorax après un choc, douleur à la respiration.
- **Signes d'alarme.** Essoufflement, saturation qui baisse, pouls rapide : de l'air ou du sang autour du poumon est possible.
- **Ce qu'on fait à bord.** Oxygène ; échographie du thorax par le responsable médical, guidé par le sol ; antalgiques. Un geste pour libérer le poumon seulement si le responsable médical y est formé.
- **Quand appeler le sol.** Tout de suite : médecin de vol, chirurgien.
- **Ce qui manque.** Le matériel et la formation pour drainer le thorax.

#### Traumatisme du ventre

*F-TRA-22 · ISS 6 mois : 0,0082 % · Mars 3 ans : 0,049 %*

- **Comment le reconnaître.** Douleur du ventre après un choc. La nouvelle liste IMPACT 1.0 distingue le choc fermé et la plaie qui pénètre.
- **Signes d'alarme.** Ventre dur, pouls rapide, tension qui baisse.
- **Ce qu'on fait à bord.** Rester à jeun ; échographie à la recherche de sang dans le ventre ; perfusion si la tension baisse.
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol, chirurgien.

#### Choc hémorragique

*F-TRA-23 · ISS 6 mois : 0,032 % · Mars 3 ans : 0,19 %*

- **Comment le reconnaître.** Perte de sang visible ou cachée, peau pâle et froide, pouls rapide, tension basse, confusion.
- **Signes d'alarme.** C'est une urgence vitale.
- **Ce qu'on fait à bord.** Arrêter le saignement : compression forte, garrot si un membre saigne et si le matériel existe. Le responsable médical pose une perfusion et donne de l'oxygène ; garder la personne au chaud ; chercher la source à l'échographie.
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol.
- **Si le sol ne répond pas.** Les recommandations de soins prolongés donnent le modèle : contrôler le saignement, maintenir la circulation, soulager la douleur, noter chaque geste et chaque mesure.
- **Ce qui manque.** Le volume de perfusion à bord, les produits sanguins disponibles ou non, et les critères d'arrêt des soins (V1 3010).

## Fiches : cœur, vaisseaux et système nerveux

Ces conditions sont rares chez des astronautes sélectionnés et contrôlés chaque année (V1 3001), mais plusieurs menacent la vie en quelques minutes. La médecine clinique apporte ici ses chiffres les plus utiles, pour distinguer vite une urgence d'un problème bénin. Les médicaments cités viennent de la liste de l'ISS : aspirine, nitroglycérine, métoprolol, lisinopril, lévétiracétam, diazépam, lorazépam, adrénaline.

#### Céphalée tardive

*F-CVN-01 · ISS 6 mois : 59 % · Mars 3 ans : 99,5 %*

- **Comment la reconnaître.** Mal de tête après la période d'adaptation, souvent avec un manque de sommeil, un CO₂ élevé, peu de boisson ou une fatigue des yeux. Un trouble de la vue qui progresse oriente vers l'atteinte de la vision liée au vol.
- **Signes d'alarme.** Début brutal et très violent ; fièvre avec nuque raide ; confusion.
- **Ce qu'on fait à bord.** Vérifier le CO₂ de la zone et le sommeil des dernières nuits ; boire, faire une pause d'écran ; paracétamol, ibuprofène ou aspirine.
- **Médecine clinique.** Une méningite est très peu probable sans fièvre, sans raideur de nuque et sans trouble de la conscience : la fièvre est présente dans 85 % des méningites, la raideur de nuque dans 70 % (Attia 1999).
- **Quand appeler le sol.** Mal de tête plus de trois jours sur sept, ou nouveau type de douleur : médecin de vol.

#### Hypertension

*F-CVN-02 · ISS 6 mois : 0,32 % · Mars 3 ans : 1,9 %*

- **Comment la reconnaître.** Tension élevée à plusieurs mesures au repos, le plus souvent sans symptôme, comparée à la référence de la personne.
- **Signes d'alarme.** Tension très élevée avec mal de tête violent, trouble de la vue, douleur dans la poitrine ou faiblesse d'un côté.
- **Ce qu'on fait à bord.** Recontrôler au repos ; revoir le sel, le stress et les décongestionnants comme la pseudoéphédrine ; lisinopril sur décision du sol.
- **Quand appeler le sol.** Deux jours de suite au-dessus des seuils fixés par le médecin : médecin de vol.
- **Ce qui manque.** Les seuils de tension de la mission.

#### AVC

*F-CVN-03 · ISS 6 mois : hommes 0,049 %, femmes 0,034 %*

- **Comment le reconnaître.** Visage qui tombe, bras qui retombe, parole difficile, début brutal.
- **Signes d'alarme.** C'est une urgence.
- **Ce qu'on fait à bord.** Noter l'heure du début ; mesurer glycémie, tension et saturation ; ne rien donner à avaler. L'aspirine seulement sur décision du sol, car rien à bord ne distingue un caillot d'un saignement dans le cerveau. La liste de 2023 consultée ne contient pas de médicament qui dissout les caillots.
- **Médecine clinique.** Un seul des trois signes (visage, bras, parole) multiplie par 5,5 les chances d'un AVC ; aucun des trois les divise par plus de deux (0,39) (Goldstein et Simel 2005).
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol, neurologue.
- **Si le sol ne répond pas.** Surveillance de la conscience, de la déglutition et des signes toutes les heures ; soins de confort si l'état s'aggrave, selon les critères fournis par la NASA.

#### Fibrillation auriculaire

*F-CVN-04 · ISS 6 mois : hommes 0,036 %, femmes 0,012 %*

- **Comment la reconnaître.** Palpitations irrégulières, essoufflement, fatigue ; l'ECG confirme.
- **Signes d'alarme.** Malaise, douleur dans la poitrine, tension basse.
- **Ce qu'on fait à bord.** ECG ; métoprolol pour ralentir le cœur, sur avis ; si la personne est instable, choc électrique avec le défibrillateur par le responsable médical. Le traitement contre les caillots est décidé par le sol.
- **Quand appeler le sol.** Toujours : médecin de vol, cardiologue.

#### Angine de poitrine ou infarctus

*F-CVN-05 · ISS 6 mois : hommes 0,032 %, femmes 0,024 %*

- **Comment la reconnaître.** Douleur ou serrement de la poitrine, parfois vers le bras, le cou ou la mâchoire, avec des sueurs, des nausées ou un essoufflement. Une brûlure après les repas oriente vers le reflux.
- **Signes d'alarme.** C'est une urgence.
- **Ce qu'on fait à bord.** Repos, personne attachée ; ECG ; défibrillateur prêt. Aspirine à croquer, nitroglycérine si la tension le permet, données par le responsable médical ; oxygène si la saturation est sous 90 % ; métoprolol sur avis.
- **Médecine clinique.** Une douleur qui irradie dans les deux bras multiplie les chances d'infarctus par 7,1. Une douleur augmentée par la respiration, piquante, ou reproduite en appuyant les divise par 2,5 à 5 (0,2 à 0,4) (Panju 1998).
- **Quand appeler le sol.** Tout de suite, avec le tracé de l'ECG ; évacuation si elle existe : médecin de vol, cardiologue.
- **Ce qui manque.** Les tests sanguins cardiaques possibles à bord.

#### Convulsions

*F-CVN-06 · ISS 6 mois : 0,014 % · Mars 3 ans : 0,081 %*

- **Comment les reconnaître.** Secousses du corps, perte de connaissance, puis confusion. Il faut chercher une cause : choc à la tête, sucre trop bas, air de la cabine, médicament.
- **Signes d'alarme.** C'est une urgence, surtout si la crise dépasse 5 minutes.
- **Ce qu'on fait à bord.** Protéger la tête, ne rien mettre dans la bouche, chronométrer. Au-delà de 5 minutes, le responsable médical donne du diazépam ou du lorazépam, puis du lévétiracétam sur avis. Contrôler la glycémie, le CO₂ et l'oxygène de la cabine.
- **Quand appeler le sol.** Tout de suite : médecin de vol, neurologue.

#### Arrêt cardiaque

*F-CVN-07 · ISS 6 mois : 0,00075 % · Mars 3 ans : 0,0045 %*

- **Comment le reconnaître.** La personne ne répond pas et ne respire pas normalement.
- **Signes d'alarme.** C'est l'urgence la plus grave.
- **Ce qu'on fait à bord.** Donner l'alarme et apporter le défibrillateur tout de suite ; massage cardiaque, la personne fixée sur la table de contention ; adrénaline et matériel d'intubation du responsable médical.
- **Quand appeler le sol.** En même temps que les gestes : médecin de vol.
- **Ce qui manque.** Les critères d'arrêt de la réanimation (V1 3010) et le plan en cas de décès (V1 3050), à fixer avant le vol.

#### Choc cardiaque après infarctus

*F-CVN-08 · ISS 6 mois : hommes 0,00037 %, femmes 0,00026 %*

- **Comment le reconnaître.** Après un infarctus : tension basse, peau froide, confusion, essoufflement.
- **Signes d'alarme.** C'est une urgence vitale.
- **Ce qu'on fait à bord.** Oxygène ; perfusion prudente sur avis ; soins de confort si aucune issue n'existe (V1 3009).
- **Quand appeler le sol.** Tout de suite : médecin de vol, cardiologue.
- **Ce qui manque.** Les médicaments qui soutiennent le cœur, et la conduite sans évacuation.

#### Choc d'origine nerveuse

*F-CVN-09 · ISS 6 mois : 0,00025 % · Mars 3 ans : 0,0015 %*

- **Comment le reconnaître.** Après une blessure de la colonne : tension basse avec un pouls lent, peau chaude, membres paralysés.
- **Signes d'alarme.** C'est une urgence vitale.
- **Ce qu'on fait à bord.** Colonne immobilisée ; perfusion posée par le responsable médical ; oxygène.
- **Quand appeler le sol.** Tout de suite ; évacuation si elle existe : médecin de vol, neurochirurgien.
- **Ce qui manque.** La conduite complète, à fournir par la NASA.

## Fiches : expositions et sorties extravéhiculaires

Ces fiches partent de l'environnement : l'air, la pression, la chaleur, les radiations, les produits chimiques et le scaphandre. Elles sont examinées en premier dès qu'une valeur du vaisseau sort des limites. Sur une mission planétaire avec 50 sorties, les fourmillements et le décollement d'ongles dus aux gants deviennent presque certains.

### Air et pression

#### Céphalée liée au CO₂

*F-EXP-01 · ISS 6 mois : 31 % · Mars 3 ans : 89 %*

- **Comment la reconnaître.** Mal de tête quand le CO₂ de la zone dépasse 3 mmHg en moyenne sur une heure, souvent chez plusieurs équipiers. Sur l'ISS, les chances de céphalée doublent environ à chaque mmHg supplémentaire (Law 2014).
- **Signes d'alarme.** Confusion, essoufflement.
- **Ce qu'on fait à bord.** Aller dans une zone mieux ventilée, utiliser un ventilateur personnel ; limiter l'effort ; paracétamol ou ibuprofène si la douleur reste.
- **Quand appeler le sol.** CO₂ au-dessus de la limite : équipe environnement.
- **Ce qui manque.** Des capteurs de CO₂ dans chaque zone de travail et de repos.

#### CO₂ élevé, autres effets

*F-EXP-11 · condition ajoutée*

- **Comment le reconnaître.** Sommeil difficile, fatigue, irritabilité, moins de concentration quand le CO₂ monte (Law 2014). Seuls, ces signes disent peu ; avec un CO₂ haut, la cause est plutôt dans l'air.
- **Signes d'alarme.** Confusion.
- **Ce qu'on fait à bord.** Les mêmes gestes que pour la céphalée liée au CO₂, et une note dans le point du soir.
- **Quand appeler le sol.** Effets qui durent malgré un CO₂ corrigé : équipe environnement, psychologue.
- **Ce qui manque.** Le niveau de CO₂ à partir duquel la concentration baisse, encore inconnu.

#### Manque d'oxygène

*F-EXP-12 · condition ajoutée*

- **Comment le reconnaître.** Essoufflement, mal de tête, confusion et saturation basse, quand l'oxygène inspiré descend sous la plage normale d'environ 139 à 168 mmHg.
- **Signes d'alarme.** Saturation sous 90 %.
- **Ce qu'on fait à bord.** Masque à oxygène ; vérification de l'oxygène et de la pression de la cabine ; regroupement de l'équipage si la cause touche tout le monde.
- **Quand appeler le sol.** Toujours : équipe environnement, médecin de vol.
- **Ce qui manque.** Le tableau exact des limites d'oxygène de la norme (V2 6003).

#### Mal d'altitude

*F-EXP-09 · ISS 6 mois : 0,0027 % · Mars 3 ans : 0,016 %*

- **Comment le reconnaître.** Mal de tête, nausées, fatigue et mauvais sommeil après une baisse de pression de la cabine. Il devient plus probable avec les atmosphères à pression réduite prévues pour l'exploration.
- **Signes d'alarme.** Confusion, essoufflement au repos.
- **Ce qu'on fait à bord.** Oxygène ; acétazolamide, présent dans la liste de l'ISS pour cet usage, donné par le responsable médical.
- **Quand appeler le sol.** Toujours : médecin de vol, équipe environnement.

#### Accident de décompression

*F-EXP-05 · ISS 6 mois avec une sortie : 1,2 % · Mars 3 ans avec 50 sorties : 44 %*

- **Comment le reconnaître.** Dans les 24 heures après une sortie ou une baisse de pression : douleur profonde d'une articulation, démangeaisons ou marbrures de la peau, fourmillements. La norme limite ce risque à 15 % et interdit la forme neurologique (V2 6008).
- **Signes d'alarme.** Faiblesse, trouble de la vue ou de la parole, confusion, essoufflement.
- **Ce qu'on fait à bord.** Oxygène pur ; remise en pression selon la procédure de la mission ; boire ; surveillance des signes neurologiques.
- **Quand appeler le sol.** Toujours : médecin de vol, ingénieur biomédical.
- **Ce qui manque.** La procédure de remise en pression ; la norme exige de pouvoir diagnostiquer et traiter cet accident à bord (V1 3004).

### Feu, fumée et produits toxiques

#### Inhalation de fumée

*F-EXP-06 · ISS 6 mois : 1,1 % · Mars 3 ans : 6,5 %*

- **Comment la reconnaître.** Après un incendie : toux, voix rauque, suie dans le nez, mal de tête, confusion, dus au monoxyde de carbone ou au cyanure.
- **Signes d'alarme.** Essoufflement, confusion, perte de connaissance. La saturation peut paraître normale malgré une intoxication au monoxyde de carbone : il ne faut pas s'y fier.
- **Ce qu'on fait à bord.** Masques jusqu'à ce que l'air repasse sous les limites ; oxygène pur pour chaque personne exposée ; surveillance de la respiration pendant 24 heures.
- **Quand appeler le sol.** Toujours : médecin de vol, équipe environnement.
- **Ce qui manque.** Un antidote du cyanure à bord.

#### Brûlures par le feu

*F-EXP-07 · ISS 6 mois : 0,53 % · Mars 3 ans : 3,1 %*

- **Comment les reconnaître.** Peau rouge, cloques, ou peau blanche et insensible ; brûlure du visage avec atteinte possible des voies respiratoires.
- **Signes d'alarme.** Brûlure étendue, ou du visage, des mains, des organes génitaux ; voix rauque.
- **Ce qu'on fait à bord.** Refroidir avec des compresses mouillées, car l'eau ne coule pas en apesanteur ; couvrir avec un pansement propre ; antalgiques ; perfusion par le responsable médical si la brûlure est étendue.
- **Quand appeler le sol.** Toujours, avec la surface brûlée estimée : médecin de vol, spécialiste des brûlures.
- **Si le sol ne répond pas.** Les recommandations de soins prolongés guident les jours suivants : douleur, liquides, pansements et prévention de l'infection.
- **Ce qui manque.** Les pansements spéciaux et la quantité de perfusion à bord.

#### Intoxication à l'ammoniac

*F-EXP-10 · ISS 6 mois : 0,000073 % · Mars 3 ans : 0,00044 %*

- **Comment la reconnaître.** Odeur piquante, yeux qui brûlent, toux, gêne pour respirer. C'est l'urgence environnementale la plus grave de l'ISS, mais aussi la moins probable (Tobias et McMillan 2023).
- **Signes d'alarme.** C'est une urgence du vaisseau ; la limite d'une heure est de 30 ppm.
- **Ce qu'on fait à bord.** Masques, repli et écoutilles fermées ; rinçage long des yeux et de la peau ; oxygène ; salbutamol si la respiration siffle.
- **Quand appeler le sol.** Toujours : équipe environnement, médecin de vol.

#### Surdosage ou effet indésirable d'un médicament

*F-EXP-04 · ISS 6 mois : 3,6 % · Mars 3 ans : 20 %*

- **Comment le reconnaître.** Un symptôme nouveau après une prise : somnolence, éruption, nausées, respiration ralentie. Le journal des prises montre le lien dans le temps.
- **Signes d'alarme.** Respiration lente, personne qui ne se réveille pas, gorge qui gonfle.
- **Ce qu'on fait à bord.** Arrêter le produit ; naloxone si un antalgique opioïde est en cause, flumazénil si c'est une benzodiazépine, donnés par le responsable médical ; surveiller.
- **Quand appeler le sol.** Toujours : médecin de vol, pharmacie.
- **Ce qui manque.** Une base d'interactions, et l'effet des médicaments abîmés par un long stockage en vol.

### Chaleur, poussières et radiations

#### Chaleur à l'effort

*F-EXP-13 · condition ajoutée*

- **Comment la reconnaître.** Chaleur, sueur, fatigue, mal de tête pendant ou après l'exercice. En vol, l'effort fait monter la température de 1,4 °C en moyenne, parfois au-delà de 40 °C (Stahn 2017).
- **Signes d'alarme.** Confusion ; température d'au moins 39 °C qui ne baisse pas au repos.
- **Ce qu'on fait à bord.** Arrêter l'effort, ventiler, boire ; linges humides ; nouvelle mesure après 30 minutes de repos.
- **Quand appeler le sol.** Signe d'alarme, ou malaises à répétition : équipe d'exercice, médecin de vol.
- **Ce qui manque.** La température et l'humidité de la zone d'exercice.

#### Poussières planétaires

*F-EXP-14 · condition ajoutée à IMPACT 1.0 (Kreykes 2023)*

- **Comment les reconnaître.** Yeux irrités, nez bouché, éternuements, toux après une sortie en surface.
- **Signes d'alarme.** Essoufflement, saturation basse.
- **Ce qu'on fait à bord.** Rincer les yeux ; nettoyer scaphandres et sas, porter un masque ; antihistaminique si les symptômes ressemblent à une allergie.
- **Quand appeler le sol.** Toux qui dure : médecin de vol, équipe environnement.
- **Ce qui manque.** La toxicité de la poussière martienne, encore inconnue ; la norme ne fixe une limite que pour la poussière lunaire (V2 6053).

#### Syndrome d'irradiation

*F-EXP-08 · ISS 6 mois : 0,14 % · Mars 3 ans : 0,85 %*

- **Comment le reconnaître.** Nausées, vomissements et grande fatigue dans les heures qui suivent une forte dose, surtout après une éruption solaire.
- **Signes d'alarme.** Vomissements répétés après une alerte d'éruption.
- **Ce qu'on fait à bord.** Rester à l'abri tant que l'alerte dure ; ondansétron contre les nausées ; noter la dose de chacun ; surveillance du sang si possible.
- **Quand appeler le sol.** Toujours : radioprotection, médecin de vol.
- **Ce qui manque.** Les doses à partir desquelles agir, et les analyses de sang possibles à bord.

#### Dose de radiations cumulée

*F-EXP-16 · condition ajoutée · concerne tout l'équipage*

- **Comment la reconnaître.** Aucun symptôme : les risques sont à long terme. Vers Mars, la dose est d'environ 1,8 mSv par jour pendant le trajet et 0,64 mSv par jour en surface. La norme fixe des limites pour le cristallin, la peau, la moelle osseuse, le cœur et le système nerveux (V1 4030).
- **Signes d'alarme.** Aucun.
- **Ce qu'on fait à bord.** Suivre la dose de chacun, garder la dose la plus basse possible, se mettre à l'abri pendant les éruptions.
- **Quand appeler le sol.** À 80 % d'une limite : radioprotection.
- **Ce qui manque.** Les effets d'une mission martienne complète, encore inconnus.

### Sorties extravéhiculaires

#### Fourmillements liés aux sorties

*F-EXP-02 · ISS 6 mois avec une sortie : 11 % · Mars 3 ans avec 50 sorties : 99,6 %*

- **Comment les reconnaître.** Fourmillements ou engourdissement des doigts ou des pieds, dus à la pression du scaphandre et des gants. Des signes qui apparaissent après la sortie, avec une douleur d'articulation, orientent vers un accident de décompression.
- **Signes d'alarme.** Faiblesse, signes qui s'étendent.
- **Ce qu'on fait à bord.** Retirer le gant et masser doucement ; noter la taille et le réglage des gants ; vérifier que tout disparaît en quelques heures.
- **Quand appeler le sol.** Signes qui durent plus de 24 heures : ingénieur biomédical, médecin de vol.

#### Décollement d'un ongle

*F-EXP-03 · ISS 6 mois : 6,5 % · Mars 3 ans : 97 %*

- **Comment le reconnaître.** Ongle qui se soulève après une sortie, douleur au bout du doigt, parfois du sang sous l'ongle.
- **Signes d'alarme.** Rougeur et pus autour de l'ongle.
- **Ce qu'on fait à bord.** Ongles courts avant les sorties ; pansement protecteur ; pommade antibiotique si la peau est ouverte.
- **Quand appeler le sol.** En cas d'infection : médecin de vol.

#### Blessure de l'épaule liée aux sorties

*F-EXP-15 · condition proposée pendant la construction d'IMPACT 1.0 (Kreykes 2023)*

- **Comment la reconnaître.** Douleur de l'épaule après une sortie ou un entraînement en scaphandre, mouvement limité.
- **Signes d'alarme.** Épaule déformée : luxation possible.
- **Ce qu'on fait à bord.** Comme pour une entorse de l'épaule, avec du repos avant la sortie suivante.
- **Quand appeler le sol.** Toujours avant une nouvelle sortie : équipe d'exercice, médecin de vol.

## Fiches : sommeil, santé mentale et comportement

Le sommeil est le problème le plus probable de toute la liste de la NASA : sur une mission de six mois, 91 % des astronautes ont une insomnie tardive. En mission, les astronautes dorment environ 6 heures par nuit, et trois astronautes de l'ISS sur quatre ont pris un somnifère (Barger 2014). Les troubles psychiques graves sont rares, mais l'isolement d'une mission vers Mars les rendrait difficiles à soigner sans le sol. La norme demande des mesures de prévention psychosociale (V1 3003) et une communication privée avec le sol, la famille et les proches (V1 3004).

Dans toutes ces fiches, la partie psychologique ne quitte le vaisseau qu'avec l'accord de la personne. Seule exception proposée : un danger pour sa vie (R-CONF-02, R-CONF-03).

### Sommeil

#### Insomnie tardive

*F-PSY-01 · ISS 6 mois : 91 % · Mars 3 ans : plus de 99,9 %*

- **Comment la reconnaître.** Endormissement difficile, réveils, sommeil court, qui s'installent après les premières semaines de vol ; les premières nuits relèvent plutôt de l'insomnie d'adaptation. Causes à chercher d'abord : bruit, lumière, CO₂ élevé dans la zone de repos, horaires décalés, charge de travail, souci personnel.
- **Signes d'alarme.** Insomnie avec des idées noires.
- **Ce qu'on fait à bord.** D'abord des horaires réguliers, peu de lumière et pas d'écran avant de dormir, des bouchons d'oreilles et un masque de sommeil. Ensuite de la mélatonine. En dernier, du zolpidem ou du zaleplon, donnés par le responsable médical selon le protocole. AURA bloque tout somnifère quand une sortie extravéhiculaire est prévue dans les 24 heures.
- **Quand appeler le sol.** Plus de trois mauvaises nuits par semaine pendant deux semaines : médecin de vol, psychologue, et direction de vol si le planning doit changer.
- **Ce qui manque.** Les limites d'heures de travail et de sommeil de la mission (V1 4014).

#### Manque de sommeil et fatigue

*F-PSY-05 · condition ajoutée · fréquente en mission (Barger 2014)*

- **Comment le reconnaître.** Erreurs, lenteur, irritabilité, envie de dormir pendant le travail. Le test de réaction de 3 minutes compte comme lente toute réponse au-delà de 355 ms (Basner 2011) ; une hausse des réponses lentes par rapport à la référence de la personne signale la fatigue. Pendant Mars-520, une insomnie qui durait a privé un équipier de sommeil de façon chronique, avec des baisses de vigilance fréquentes (Basner 2014).
- **Signes d'alarme.** Une tâche à risque prévue, comme une sortie extravéhiculaire, avec une fatigue mesurée.
- **Ce qu'on fait à bord.** Protéger la période de sommeil, faire une sieste courte ; de la caféine, mais pas en fin de journée ; du modafinil seulement pour une opération critique, sur décision du sol, donné par le responsable médical.
- **Quand appeler le sol.** Fatigue mesurée avant une sortie ou une opération critique : médecin de vol, direction de vol.
- **Ce qui manque.** Les seuils de fatigue à partir desquels une tâche doit être reportée.

### Santé mentale

#### Anxiété

*F-PSY-02 · ISS 6 mois : hommes 0,095 %, femmes 0,35 % · Mars 3 ans : hommes 0,57 %, femmes 2,1 %*

- **Comment la reconnaître.** Inquiétude qui ne lâche pas, tension, cœur qui bat vite, sommeil troublé. Une douleur dans la poitrine à l'effort doit d'abord faire penser au cœur.
- **Signes d'alarme.** Crise avec douleur dans la poitrine ou malaise ; idées noires.
- **Ce qu'on fait à bord.** Respirer lentement, environ six cycles par minute, et faire une pause ; en parler en conférence privée avec le psychologue. Si cela dure : lorazépam ponctuel, ou sertraline ou venlafaxine, sur décision du sol, donnés par le responsable médical.
- **Médecine clinique.** Le questionnaire GAD-2 pose deux questions sur les deux dernières semaines : la nervosité, et les inquiétudes qu'on n'arrive pas à arrêter. Chacune est notée de 0 à 3. À 3 points ou plus, il repère 86 % des troubles anxieux généralisés, et reste sous ce seuil chez 83 % des personnes qui n'en ont pas (Kroenke 2007). Positif, il multiplie les chances par 5 environ ; négatif, il les divise par 6 environ.
- **Quand appeler le sol.** Gêne qui dure plus de deux semaines : psychologue.
- **Ce qui manque.** Le protocole de la mission pour l'anxiété.

#### Dépression

*F-PSY-03 · ISS 6 mois : hommes 0,15 %, femmes 0,18 % · Mars 3 ans : hommes 0,87 %, femmes 1,1 %*

- **Comment la reconnaître.** Humeur triste ou perte d'intérêt presque chaque jour pendant deux semaines, avec un sommeil, un appétit ou une énergie qui changent. Pendant les 520 jours d'isolement de Mars-520, un équipier a signalé des symptômes dépressifs 93 % des semaines (Basner 2014). AURA voit la baisse dans le point du soir et propose d'en parler.
- **Signes d'alarme.** Idées noires.
- **Ce qu'on fait à bord.** Une conférence privée avec le psychologue ; des routines, de l'exercice, de la lumière, des contacts avec les proches ; sertraline ou venlafaxine sur décision du sol, données par le responsable médical.
- **Médecine clinique.** Le questionnaire PHQ-2 pose deux questions sur les deux dernières semaines : l'humeur triste, et la perte d'intérêt ou de plaisir. Chacune est notée de 0 à 3. À 3 points ou plus, il repère 83 % des dépressions majeures, et reste sous ce seuil chez 92 % des personnes qui n'en ont pas (Kroenke 2003). Positif, il multiplie les chances par 10 environ ; négatif, il les divise par 5 environ. C'est un signal pour en parler, pas un diagnostic. Sa période de deux semaines correspond au rythme de la conférence psychologique : AURA peut le proposer à ce moment-là, avec l'accord de la personne.
- **Quand appeler le sol.** Humeur basse depuis plus de deux semaines : psychologue.
- **Si le sol ne répond pas.** L'IA du vaisseau mène la conférence avec les mêmes questions, et la personne relit le résumé avant envoi. Le responsable médical prend des nouvelles chaque jour. Une idée noire passe en urgence, même sans liaison.
- **Ce qui manque.** Des questionnaires validés chez des astronautes, en vol.

#### Urgence psychologique

*F-PSY-04 · ISS 6 mois : 0,00072 % · Mars 3 ans : 0,0043 %*

- **Comment la reconnaître.** Agitation extrême, propos sans lien avec la réalité, danger pour soi, pour l'équipage ou pour le vaisseau.
- **Signes d'alarme.** C'est une urgence en soi.
- **Ce qu'on fait à bord.** La sécurité d'abord : rester calme, ne jamais laisser la personne seule. Chercher une cause du corps : sucre trop bas, CO₂ élevé, manque d'oxygène, médicament. Un calmant (lorazépam, diazépam, ziprasidone ou aripiprazole) est donné par le responsable médical, sur avis du sol si possible. La contention n'est qu'un dernier recours, selon le protocole de la mission.
- **Quand appeler le sol.** Tout de suite : psychologue, médecin de vol, direction de vol.
- **Si le sol ne répond pas.** Le responsable médical décide à bord, en suivant le protocole écrit avant le vol. Quelqu'un reste toujours avec la personne, et chaque décision est notée avec l'heure, pour être relue au retour de la liaison.
- **Ce qui manque.** Le protocole de contention et d'isolement de la mission ; la norme exige des moyens de traiter ces troubles à bord (V1 3004).

### Vie de l'équipage

#### Tensions dans l'équipage

*F-PSY-06 · condition ajoutée à IMPACT 1.0 (Kreykes 2023)*

- **Comment les reconnaître.** Irritabilité, évitement, disputes qui reviennent, souvent avec de la fatigue et du stress. Pendant Mars-520, les deux équipiers les plus stressés et les plus épuisés concentraient 85 % des conflits ressentis. Les conflits avec le centre de contrôle ont été signalés cinq fois plus souvent que les conflits entre équipiers (Basner 2014) : AURA compte donc aussi les tensions avec le sol.
- **Signes d'alarme.** Menace ou violence : voir l'urgence psychologique.
- **Ce qu'on fait à bord.** Parler tôt d'une gêne, en privé, avec un fait précis ; garder un moment à soi chaque jour ; répartir les tâches pénibles à tour de rôle ; faire une pause quand le ton monte.
- **Quand appeler le sol.** Conflit qui gêne le travail ou qui dure : psychologue.
- **Ce qui manque.** Des données sur les tensions pendant les vols longs.

#### Deuil pendant la mission

*F-PSY-07 · condition proposée pendant la construction d'IMPACT 1.0 (Kreykes 2023)*

- **Comment le reconnaître.** L'annonce du décès ou de la maladie grave d'un proche, puis de la tristesse, des pleurs, un sommeil troublé, du mal à se concentrer. Vers Mars, aucun retour n'est possible avant la fin de la mission.
- **Signes d'alarme.** Idées noires.
- **Ce qu'on fait à bord.** Un appel privé avec la famille, que la norme prévoit (V1 3004) ; une conférence avec le psychologue ; un planning allégé les jours suivants ; la présence de l'équipage.
- **Quand appeler le sol.** Toujours : psychologue, direction de vol.
- **Ce qui manque.** La façon d'annoncer la nouvelle à bord, et le soutien prévu pour la famille.

## Les métiers de l'équipe au sol

Au sol, la santé de l'équipage ne repose pas sur un seul médecin. Pour l'ISS, plusieurs postes du centre de contrôle se partagent le corps, le matériel, l'air et les radiations (podcast NASA). AURA donne à chaque métier une fiche, de S-01 à S-10. Chaque fiche de maladie nomme les métiers à joindre, et chaque appel part vers le bon destinataire (R-SOL-02).

| Fiche | Métier | Son rôle pour l'ISS | AURA l'appelle pour | Ce qu'il reçoit |
| --- | --- | --- | --- | --- |
| S-01 | Médecin de vol | Suit l'état médical de l'équipage, l'exercice, les heures de travail et la fatigue ; mène chaque semaine une conférence médicale privée de 15 minutes avec chaque astronaute | Toute fiche, les signes d'alarme, les traitements bloqués | Le paquet médical du jour et les appels au sol |
| S-02 | Ingénieur biomédical | Gère le matériel médical, le matériel d'exercice et les appareils de mesure de l'environnement et des radiations ; planifie les activités médicales et les conférences | Un appareil en panne, une échographie à guider, une sortie extravéhiculaire | L'état du matériel et les examens prévus |
| S-03 | Psychologue ou psychiatre | Mène une conférence psychologique privée toutes les deux semaines ; soutient l'équipage et les familles | Le sommeil, l'humeur, les tensions, le deuil, les idées noires | Seulement ce que la personne accepte d'envoyer, sauf danger pour sa vie |
| S-04 | Radioprotection | Suit les radiations de la station ; peut recommander l'abri pendant une éruption solaire | Une alerte d'éruption, une dose qui approche d'une limite | La dose de chaque personne et le débit de dose |
| S-05 | Équipe environnement | Fait fonctionner le recyclage de l'eau, l'atmosphère (oxygène, CO₂, polluants, ventilation) et le contrôle de la température ; le laboratoire de toxicologie analyse l'air et l'eau | Une valeur du vaisseau hors limite, les mêmes signes chez plusieurs équipiers | Les mesures du vaisseau et les symptômes groupés |
| S-06 | Nutrition | Laboratoire de nutrition ; aide à compenser quand un appareil d'exercice tombe en panne | Une perte de poids, un calcul rénal, la perte osseuse, l'anémie | Les apports, le poids, les troubles digestifs |
| S-07 | Équipe d'exercice | Pas de poste à part pour l'ISS : l'ingénieur biomédical gère les appareils d'exercice, avec les équipes de santé osseuse | Une blessure, le mal de dos, des séances manquées, le retour dans la gravité | Les séances et les tests de force et d'endurance |
| S-08 | Pharmacie | Prépare les trousses de médicaments et calcule leur durée de validité | Une péremption, un stock bas, un effet indésirable | Le journal des prises et les stocks |
| S-09 | Spécialistes | Ophtalmologie, dentaire, chirurgie, cardiologie, neurologie, dermatologie, ORL et brûlures, à la demande du médecin de vol | Les fiches qui demandent un avis spécialisé | Le dossier transmis par le médecin de vol |
| S-10 | Direction de vol | Décide pour la mission ; un poste voisin planifie le temps de l'équipage | Alléger le planning, reporter une sortie, décider d'une évacuation | L'aptitude de chacun aux tâches, sans la raison médicale |

Les rôles viennent du podcast de la NASA sur les postes santé du centre de contrôle, sauf ceux du psychologue (Beven 2017) et de la pharmacie (document de la NASA de 2017 sur la pharmacie). Faire de l'exercice un métier à part (S-07) et la liste des spécialistes (S-09) sont des choix AURA, à compléter par la NASA.

Le centre de contrôle travaille en trois équipes par jour, et l'équipe de nuit est moins structurée (podcast NASA). Un message non urgent envoyé la nuit est donc traité par l'équipe de jour ; une urgence part tout de suite. Pour Mars, la NASA pourra ajouter à chaque fiche S ses horaires, ses seuils d'appel et ce que le métier peut faire en différé, sans toucher au logiciel.

## Annexe technique

Cette annexe s'adresse aux développeurs et aux ingénieurs de la NASA. Elle décrit le format informatique d'une fiche, le vocabulaire codé, les formules du moteur et leurs réglages, puis fait le lien avec le code de la démonstration et avec la norme NASA. Les fiches de la deuxième partie en sont la version lisible : chaque ligne d'une fiche correspond à un ou plusieurs champs décrits ici.

### Le format d'une fiche

Une fiche compte 22 champs, dont 10 obligatoires. Un champ obligatoire doit être présent, mais il peut valoir « inconnu » ou « à fournir par la NASA ». Un champ facultatif peut rester vide.

| Champ | Obligatoire | Contenu | Ligne de la fiche lisible |
| --- | --- | --- | --- |
| `id` | oui | Identifiant stable : F, famille, numéro (`F-DIG-12`) | Sous le titre |
| `nom` | oui | Nom en français, et nom exact dans la liste IMM ou IMPACT | Titre |
| `codes` | non | Code CIM-11 de l'OMS, ajouté après vérification | Aucune |
| `type` | oui | Maladie, blessure, adaptation, exposition ou comportement | Aucune |
| `version` | oui | Numéro, date, état (brouillon, relue, en service, à revoir, retirée), auteur, relecteur | Aucune |
| `apriori` | oui | Probabilité publiée pour chaque mission de référence, par sexe si besoin, avec sa source | Ligne en italique |
| `modificateurs` | non | Ce qui change cette probabilité : sortie, phase de la mission, sexe, antécédents, environnement | Comment le reconnaître |
| `incertitude` | non | Fourchette basse et haute, ou « inconnue » | Aucune |
| `pour` | oui | Faits codés qui orientent vers la fiche, chacun avec sa force en mots | Comment le reconnaître |
| `contre` | non | Faits qui orientent ailleurs | Comment le reconnaître |
| `preuves_terre` | non | Rapports de vraisemblance publiés, avec la population étudiée et la source | Médecine clinique |
| `mesures` | non | Capteurs et examens utiles | Ce qu'on fait à bord |
| `alarme` | oui | Signes qui font passer en urgence ; « aucun » doit être écrit | Signes d'alarme |
| `eliminer` | non | Diagnostics graves à écarter, par renvoi à leurs fiches | Comment le reconnaître |
| `options` | oui | Traitements dans l'ordre, chacun avec ses ressources, la compétence requise et les contre-indications | Ce qu'on fait à bord |
| `suivi` | non | Quoi mesurer, à quel rythme, durée attendue | Si le sol ne répond pas |
| `escalade` | oui | Quand appeler le sol, quand envisager l'évacuation, et la voie « sans sol » | Quand appeler le sol ; Si le sol ne répond pas |
| `mission` | non | Tâches à éviter, retour au travail, heures perdues | Ce qu'on fait à bord |
| `metiers` | non | Métiers au sol à joindre, de S-01 à S-10 | Quand appeler le sol |
| `sources` | oui | Références, avec le statut de chaque information | Les citations entre parenthèses |
| `manque` | non | Ce qui doit venir de la NASA | Ce qui manque |
| `revue` | non | Date de la prochaine revue | Aucune |

Trois listes de valeurs reviennent dans tout le format :

- **Statut** : `publie_vol`, `publie_terre`, `choix_aura`, `a_fournir_nasa` ou `inconnu`, les cinq statuts décrits au début du document.
- **Force d'un fait** : très typique, fréquent, possible, rare ou contre.
- **Compétence requise** : `astronaute` (la personne elle-même), `rmb` (le responsable médical de bord), `sol` (avis du médecin de vol ou d'un spécialiste avant le geste) ou `evac` (soins possibles seulement ailleurs).

### Exemple complet : le calcul rénal

Voici la fiche du calcul rénal, présentée plus haut, telle que le moteur la lit.

```json
{
  "id": "F-DIG-12",
  "nom": { "fr": "Calcul rénal", "imm": "Nephrolithiasis" },
  "codes": { "cim11": null },
  "type": "maladie",
  "version": { "num": "0.1", "date": "2026-10-31", "etat": "brouillon", "auteur": "AURA", "relecteur": null },
  "apriori": [
    { "mission": "ISS 6 mois", "p": 0.00182, "statut": "publie_vol", "source": "IMM 2015" },
    { "mission": "Mars 3 ans", "p": 0.0109, "statut": "publie_vol", "source": "IMM 2015" }
  ],
  "modificateurs": [
    { "fait": "apport_hydrique_bas", "effet": null, "statut": "a_fournir_nasa" }
  ],
  "incertitude": { "bas": null, "haut": null, "statut": "a_fournir_nasa" },
  "pour": [
    { "fait": "douleur_flanc", "force": "très typique" },
    { "fait": "douleur_par_vagues", "force": "fréquent" },
    { "fait": "douleur_irradiation_aine", "force": "fréquent" },
    { "fait": "sang_urines", "force": "fréquent" },
    { "fait": "nausee", "force": "fréquent" }
  ],
  "contre": [
    { "fait": "douleur_reproduite_mouvement", "force": "contre" }
  ],
  "preuves_terre": [],
  "mesures": ["temp_c", "fc_repos", "echographie_renale"],
  "alarme": [
    { "si": "fievre_mesuree ET douleur_flanc", "alors": "urgence", "statut": "choix_aura" },
    { "si": "plus_d_urines_12h", "alors": "urgence", "statut": "choix_aura" }
  ],
  "eliminer": ["F-DIG-05", "F-DIG-11", "F-TRA-03"],
  "options": [
    { "rang": 1, "action": "anti-inflammatoire contre la douleur", "ressources": ["kétorolac", "ibuprofène"], "competence": "rmb", "contre_indications": ["maladie rénale connue", "saignement"] },
    { "rang": 2, "action": "aider le calcul à descendre", "ressources": ["tamsulosine"], "competence": "rmb" },
    { "rang": 3, "action": "antalgique plus fort si la douleur persiste", "ressources": ["hydrocodone et paracétamol"], "competence": "rmb", "taches": "aucune sortie extravéhiculaire" },
    { "rang": 4, "action": "boire et filtrer les urines", "ressources": ["eau", "filtre"], "competence": "astronaute" }
  ],
  "suivi": { "mesurer": ["douleur de 0 à 10", "temp_c"], "rythme": "toutes les 4 heures", "duree_attendue": null },
  "escalade": {
    "sol": ["fièvre", "douleur non calmée par les options 1 et 3"],
    "evacuation": "rein infecté ou bloqué, si une évacuation existe",
    "sans_sol": "avec de la fièvre, traiter comme une infection grave selon F-INF-07",
    "statut": "choix_aura"
  },
  "mission": { "heures_perdues": null, "statut": "a_fournir_nasa" },
  "metiers": ["S-01", "S-02"],
  "sources": ["IMM 2015", "Liste des médicaments de l'ISS, données de 2023"],
  "manque": ["fiche CliFF Nephrolithiasis", "procédure de bord (Medical Checklist)", "stock réel de la mission"],
  "revue": "2027-10-31"
}
```

Le calcul rénal n'a pas encore de rapport de vraisemblance dans la base. Voici le champ `preuves_terre` de l'appendicite, tiré d'Ebell 2008 :

```json
"preuves_terre": [
  { "fait": "douleur_bas_droite", "rv_present": 8.4, "rv_absent": 0.18, "population": "adultes", "source": "Ebell 2008", "statut": "publie_terre" },
  { "fait": "douleur_migre_bas_droite", "rv_present": 3.6, "rv_absent": null, "population": "adultes", "source": "Ebell 2008", "statut": "publie_terre" },
  { "fait": "fievre_mesuree", "rv_present": 3.2, "rv_absent": 0.42, "population": "adultes", "source": "Ebell 2008", "statut": "publie_terre" },
  { "fait": "douleur_avant_vomissements", "rv_present": 2.7, "rv_absent": null, "population": "adultes", "source": "Ebell 2008", "statut": "publie_terre" }
]
```

### Le vocabulaire codé

Les fiches, les règles et les capteurs parlent la même langue : des faits codés. Chaque fait a un type, une unité et un mode de saisie. La valeur « inconnu » est toujours permise, et n'est jamais lue comme « non ». Cette liste est un choix AURA, ouverte aux ajouts.

| Famille | Exemples de codes | Type | Saisie |
| --- | --- | --- | --- |
| État général | `fievre_ressentie`, `frissons`, `fatigue_inhabituelle`, `perte_appetit`, `soif` | oui, non, inconnu | Point du soir, conversation |
| Douleur | `douleur_siege` (tête, œil, oreille, gorge, thorax, ventre, flanc, dos, membre), `douleur_intensite`, `douleur_debut`, `douleur_irradiation_aine`, `douleur_bas_droite` | catégorie, échelle de 0 à 10 | Conversation |
| Tête et nerfs | `cephalee`, `vertige`, `nausee`, `vomissement`, `trouble_vision`, `faiblesse_un_cote`, `trouble_parole`, `confusion`, `convulsion`, `paresthesie` | oui, non, inconnu | Conversation, observation d'un équipier |
| Cœur et respiration | `douleur_thoracique`, `dyspnee`, `toux`, `palpitations`, `malaise` | oui, non, inconnu | Conversation |
| Ventre et urines | `diarrhee`, `constipation`, `brulure_urinaire`, `sang_urines`, `retention_urinaire`, `douleur_flanc` | oui, non, inconnu | Conversation |
| Peau, yeux, ORL | `eruption`, `demangeaison`, `plaie`, `oeil_rouge`, `corps_etranger_oeil`, `nez_bouche`, `mal_gorge`, `oreille_douloureuse`, `saignement_nez` | oui, non, inconnu | Conversation, photo |
| Moral et sommeil | `humeur` (1 à 5), `stress` (1 à 5), `sommeil_heures`, `endormissement_difficile`, `idees_noires`, `phq2` et `gad2` (0 à 6) | échelle, nombre, oui ou non | Point du soir, conférence privée |
| Mesures du corps | `temp_c`, `fc_repos`, `spo2`, `ta_sys`, `ta_dia`, `freq_resp`, `glycemie`, `poids_kg`, `pvt_lentes` | nombre avec unité | Capteurs, test de réaction |
| Contexte récent | `effort_1h`, `stress_aigu`, `antipyretique_6h`, `medicament_pris` (code et heure), `sommeil_court` | oui, non ; liste | Saisie au moment de la mesure |
| Vaisseau | `ppco2_mmhg`, `pio2_mmhg`, `pression_kpa`, `temp_cabine_c`, `humidite_pct`, `alarme_feu`, `alarme_toxique`, `alarme_depress`, `debit_dose_msv_j`, `alerte_eruption`, `bruit_dba` | nombre, alarme | Mesures du vaisseau |
| Mission | `jour_vol`, `phase` (lancement, trajet, orbite, surface, retour), `gravite_g`, `jours_depuis_changement_g`, `eva_prevue_24h`, `eva_recente_24h`, `charge_travail` | nombre, catégorie | Planning de la mission |
| Liaison | `liaison` (directe, différée, coupée), `delai_min`, `prochaine_fenetre`, `jours_soins_definitifs` | catégorie, nombre | Système de communication, plan de mission |
| Ressources | `stock` (médicament, quantité, péremption), `materiel` (échographe, ECG, défibrillateur, oxygène), `rmb_disponible` | liste | Inventaire, équipage |

Quatre règles gardent ce vocabulaire ouvert :

- Chaque code a une définition, des synonymes en français et en anglais, et une unité. C'est ce que lit l'IA de langage quand elle traduit une phrase en faits (R-RAI-09).
- Un mot qui ne correspond à aucun code devient `autre_symptome`, avec le texte d'origine. Le responsable médical le voit et peut proposer un nouveau code.
- La NASA peut ajouter des codes sans toucher au moteur : un code nouveau ne compte que dans les fiches qui le citent.
- Les mesures deviennent des faits par les règles R-MES. Par exemple, une température au-dessus de la plage attendue crée `fievre_mesuree`.

### Les règles de raisonnement

Ces onze règles décrivent le calcul présenté dans « Comment AURA raisonne ». Ce sont des choix AURA, sauf les valeurs publiées qu'elles citent.

**R-RAI-01. Probabilité de départ.** Elle vient de la probabilité IMM de la mission de référence la plus proche, convertie en taux par jour. La classe « autre » garde 10 % ; les fiches se partagent le reste en proportion de leur taux. Quand l'IMM donne des valeurs par sexe, AURA prend celle de la personne.

```
taux par jour :          λ(c) = -ln(1 - p(c)) / D
probabilité de départ :  P₀(c) = 0,9 × λ(c) / Σ λ(k)

la somme porte sur toutes les fiches k
```

Ici, p est la probabilité IMM d'au moins un épisode, et D la durée de la mission de référence en jours. Les conditions d'adaptation font exception : l'IMM leur donne la même probabilité sur 6 mois et sur 3 ans, par exemple 73 % pour le mal de l'espace. AURA calcule donc leur taux sur les 14 jours qui suivent chaque changement de gravité, et le réduit fortement en dehors de cette période.

**R-RAI-02. Force d'un fait.** Quand aucune valeur publiée n'existe, les mots de la fiche deviennent des nombres : très typique 0,9 ; fréquent 0,6 ; possible 0,3 ; rare 0,1 ; contre 0,03. Ce nombre est la probabilité de voir le fait chez une personne qui a la condition. Un fait présent compte pour sa force, un fait absent pour 1 moins sa force, et un fait « inconnu » ne compte pas. Un fait que la fiche ne cite pas vaut 0,1. Ces nombres sont à remplacer par des valeurs publiées dès qu'elles existent.

**R-RAI-03. Calcul.** Le moteur multiplie la probabilité de départ par la valeur v de chaque fait connu, avec un plancher de 0,01 pour qu'un seul fait n'élimine pas une hypothèse, puis ramène le total à 100 %.

```
score(c)     = P₀(c) × max(v(c, f₁) ; 0,01) × max(v(c, f₂) ; 0,01) × …
P(c | faits) = score(c) / Σ score(k)

un terme par fait connu ; la somme porte sur toutes les fiches k
```

Quand une étude donne le rapport de vraisemblance d'un signe pour une fiche (champ `preuves_terre`), cette valeur publiée remplace l'échelle en mots pour cette fiche. Le calcul se fait alors sur les chances, avec le rapport du signe présent ou celui du signe absent :

```
chances de départ :     O  = P / (1 - P)
après le signe :        O' = O × RV
nouvelle probabilité :  P' = O' / (1 + O')
```

Les autres fiches se partagent le reste, 1 moins P', selon le calcul en mots. Pour l'appendicite à 10 % au départ, une douleur en bas à droite donne O' = 0,111 × 8,4 = 0,93, soit 48 %. Ce mélange des deux méthodes est un choix AURA, à valider.

**R-RAI-04. Modificateurs.** Le contexte multiplie les chances de départ avant le calcul. Les chances de céphalée doublent environ à chaque mmHg de CO₂ supplémentaire (Law 2014) ; AURA applique ce facteur au-dessus de 3 mmHg. Une sortie dans les 24 heures multiplie par 10 les chances des conditions liées aux sorties (F-EXP-02, F-EXP-03, F-EXP-05, F-EXP-15) ; ce facteur est un choix AURA.

```
O(céphalée) = O₀ × 2^(pCO₂ - 3)     quand pCO₂ > 3 mmHg
```

**R-RAI-05. Classe « autre ».** Elle existe toujours et donne 0,1 à chaque fait présent. Si elle dépasse 30 % après les questions, AURA dit qu'il ne reconnaît pas le tableau, garde le texte libre, et prévient le responsable médical et le sol.

**R-RAI-06. Question suivante.** AURA choisit la question qui réduit le plus l'incertitude, mesurée en bits. Exception : si une condition qui a des signes d'alarme dépasse 5 %, sa question d'alarme passe d'abord.

```
incertitude :  H(C) = - Σ P(c) × log₂ P(c)
gain :         Gain(q) = H(C) - Σ P(q = v) × H(C | q = v)

la première somme porte sur les fiches c, la seconde sur les réponses v possibles
```

**R-RAI-07. Arrêt.** AURA s'arrête quand une condition atteint 80 %, quand la meilleure question rapporte moins de 0,05 bit, ou après 8 questions. Il montre alors les trois conditions les plus probables, avec les faits pour, les faits contre et ce qui manque.

**R-RAI-08. Mots affichés.** AURA parle d'orientation, jamais de diagnostic. L'astronaute lit des phrases simples ; le responsable médical voit aussi les pourcentages et leurs raisons.

**R-RAI-09. Place de l'IA de langage.** Elle a deux tâches : traduire une phrase en faits codés selon un schéma JSON, puis rédiger l'explication d'un résultat déjà calculé. Sa sortie est vérifiée : codes connus, chiffres identiques à ceux du moteur, aucun médicament absent de la fiche. Elle ne calcule aucune probabilité et ne choisit aucun traitement. Sans IA, l'astronaute répond aux questions avec des boutons.

**R-RAI-10. Environnement d'abord.** Quand une valeur du vaisseau sort des limites, la fiche d'exposition correspondante est évaluée en premier.

**R-RAI-11. Cause commune.** Si plusieurs équipiers ont les mêmes signes en même temps, AURA envisage l'eau, la nourriture, l'air ou une contagion : la gastro-entérite, l'infection respiratoire, la grippe et les fiches d'exposition passent en tête.

### Les mesures du corps

La référence personnelle à cinq couches (R-MES) est déjà codée. Pour chaque mesure, AURA tient une référence x et son incertitude P, mises à jour comme un filtre de Kalman.

Avant le vol, la norme de population et les n mesures de la personne sont combinées, chacune pondérée par sa précision :

```
x₀ = (μpop / σpop² + n × x̄ / σj²) / (1 / σpop² + n / σj²)
P₀ = 1 / (1 / σpop² + n / σj²)

μpop, σpop : norme de population
x̄ : moyenne des n mesures d'avant vol
σj : variation d'un jour à l'autre
```

L'effet attendu du vol au jour t s'ajoute ensuite à la référence :

```
δ(t) = δmax × (1 - e^(-t / τ))

δmax : effet complet du vol, + 1,0 °C pour la température
τ : constante de temps, 30 jours
```

Entre deux mesures, la référence avance avec cet effet, et son incertitude grandit un peu. Une mesure normale v la corrige ; une mesure anormale ne la corrige jamais, pour que le système n'apprenne pas que l'anormal est normal.

```
prédiction :  x(t) = x(s) + δ(t) - δ(s)
              P(t) = P(s) + q × (t - s)
correction :  K = P(t) / (P(t) + σj²)
              x ← x(t) + K × (v - x(t))
              P ← (1 - K) × P(t)

s : moment de la mesure précédente
q : dérive permise par jour
v : la nouvelle mesure, si elle est normale
```

Le contexte du moment décale le centre d'une valeur d et élargit la plage d'un facteur k. L'écart se lit alors en score z :

```
z = (v - (x(t) + d)) / (k × √(P(t) + σj²))
```

Quatre mesures de vigilance de suite dans le même sens, ou une référence qui s'écarte de plus de trois écarts-types de sa trajectoire attendue, sont signalées au médecin au lieu d'être absorbées (R-MES-08).

| Réglage | Température | Pouls au repos | Saturation |
| --- | --- | --- | --- |
| Norme de population | 36,8 °C, écart-type 0,35 | 68 par minute, écart-type 9 | 97,5 %, écart-type 1,0 |
| Variation d'un jour à l'autre | 0,22 °C | 4 par minute | 0,8 % |
| Effet du vol | + 1,0 °C, atteint aux deux tiers en 30 jours (Stahn 2017) | aucun décalage retenu ; incertitude de 4 par minute | aucun décalage en cabine à pression normale ; incertitude de 0,5 % |
| Effort dans l'heure | + 0,6 °C, plage 1,6 fois plus large | + 18 par minute, plage 2 fois plus large | moins 1 %, plage 1,3 fois plus large |
| Autre contexte | médicament contre la fièvre : alerte sur une fièvre masquée | stress : + 4 par minute, plage 1,3 fois plus large | seule une baisse compte |
| Valeurs acceptées | 30 à 43 °C | 25 à 220 par minute | 50 à 100 % |

Ces réglages sont des choix AURA, sauf l'effet du vol sur la température.

### Le score d'alerte

Le score d'alerte (R-URG-31) reprend la grille NEWS2 du Royal College of Physicians (2017). Chaque mesure reçoit de 0 à 3 points.

| Mesure | 0 point | 1 point | 2 points | 3 points |
| --- | --- | --- | --- | --- |
| Fréquence respiratoire (par minute) | 12 à 20 | 9 à 11 | 21 à 24 | 8 ou moins ; 25 ou plus |
| Saturation en oxygène (%) | 96 ou plus | 94 à 95 | 92 à 93 | 91 ou moins |
| Oxygène d'appoint | non |  | oui |  |
| Tension systolique (mmHg) | 111 à 219 | 101 à 110 | 91 à 100 | 90 ou moins ; 220 ou plus |
| Pouls (par minute) | 51 à 90 | 41 à 50 ; 91 à 110 | 111 à 130 | 40 ou moins ; 131 ou plus |
| Conscience | normale |  |  | confusion nouvelle, ou réponse seulement à la voix, à la douleur, ou aucune réponse |
| Température corrigée (°C) | 36,1 à 38,0 | 35,1 à 36,0 ; 38,1 à 39,0 | 39,1 ou plus | 35,0 ou moins |

AURA y ajoute deux adaptations au vol, qui sont des choix AURA :

- La température est corrigée de l'écart propre à la personne entre sa référence en vol et sa référence d'avant le vol, environ 1 °C après deux mois (Stahn 2017).
- Tant que seuls la température, le pouls et la saturation sont mesurés, le score est partiel : c'est la somme des points disponibles. Il demande un avis urgent dès 5 points, ou dès 3 points sur une seule mesure, et une prise en charge d'urgence dès 7 points. Un score partiel bas ne rassure jamais : il ne peut que faire monter l'alerte.

```
T corrigée = T mesurée - (référence en vol - référence d'avant vol)
```

### L'apprentissage

Les fréquences et la force des faits se corrigent avec les cas confirmés par le responsable médical ou par le sol (R-APP-01, R-APP-02). La valeur de départ compte comme un petit nombre d'observations : elle bouge peu au début, puis suit les données quand elles s'accumulent.

```
fréquence :         λ nouveau = (α + n) / (β + T)
force d'un fait :   v nouveau = (a + k) / (a + b + m)
```

- Pour une fréquence, n épisodes ont été vus en T personnes-années. Au départ, α = 10 λ et β = 10 : le taux IMM compte comme 10 personnes-années d'observation. Ce taux annuel se tire de l'IMM comme le taux par jour, avec une durée en années ; l'éruption cutanée, à 82 % sur 6 mois, donne ainsi environ 3,4 épisodes par personne et par an.
- Pour la force d'un fait, k cas confirmés sur m avaient ce fait. Au départ, a = 10 v et b = 10 (1 − v) : le mot de la fiche compte comme 10 cas fictifs. « Fréquent » (0,6) vaut 6 cas avec le fait et 4 sans ; après 10 cas confirmés dont 9 avec le fait, la force passe à (6 + 9) / (10 + 10) = 0,75.
- Un rapport de vraisemblance publié ne change pas seul : les cas confirmés sont comptés à part, et un écart important est soumis au relecteur.
- Une force qui bouge de plus de 0,2, ou une fréquence doublée ou divisée par deux, devient une nouvelle version de fiche à relire (R-APP-03).

### Les réglages du moteur

| Réglage | Valeur | Statut | Règle |
| --- | --- | --- | --- |
| Part de la classe « autre » au départ | 10 % | Choix AURA | R-RAI-01 |
| Fenêtre des conditions d'adaptation | 14 jours après chaque changement de gravité | Choix AURA | R-RAI-01 |
| Échelle en mots | 0,9 ; 0,6 ; 0,3 ; 0,1 ; 0,03 | Choix AURA | R-RAI-02 |
| Fait non cité par la fiche | 0,1 | Choix AURA | R-RAI-02 |
| Plancher d'un fait | 0,01 | Choix AURA | R-RAI-03 |
| CO₂ et céphalée | chances doublées par mmHg | Publié (vol), Law 2014 | R-RAI-04 |
| Sortie dans les 24 heures | chances multipliées par 10 | Choix AURA | R-RAI-04 |
| Tableau non reconnu | classe « autre » au-dessus de 30 % | Choix AURA | R-RAI-05 |
| Question d'alarme en premier | condition à signes d'alarme au-dessus de 5 % | Choix AURA | R-RAI-06 |
| Arrêt des questions | 80 % ; gain sous 0,05 bit ; 8 questions | Choix AURA | R-RAI-07 |
| Scores z | 2,5 ; 3,5 ; 4 pour reprendre une mesure isolée | Choix AURA | R-MES-01 à R-MES-04 |
| Dérive de la référence | 4 vigilances de suite, ou écart de 3 écarts-types | Choix AURA | R-MES-08 |
| Réponse lente au test de réaction | au-delà de 355 ms | Publié (Terre), Basner 2011 | R-MES-09 |
| Pré-alerte de dose | 80 % d'une limite | Choix AURA | R-ENV-11 |
| Délai de réflexion du sol | 45 minutes ; 15 minutes pour une urgence | Choix AURA | R-COM-03 |
| Poids de départ dans l'apprentissage | 10 personnes-années ; 10 cas fictifs | Choix AURA | R-APP-01, R-APP-02 |

### Le lien avec le code de la démonstration

La démonstration code déjà une partie de ces règles, dans le fichier `docs/js/engine.js` du dépôt AURA. Le reste est décrit ici pour être codé ensuite.

| Partie de la base | État dans le code | Fonction |
| --- | --- | --- |
| Signes d'alarme, avec la négation et la différence entre une question et un symptôme vécu | Codé | `detectRedFlags` |
| Référence personnelle à cinq couches, scores z, dérive | Codé | `processMeasurement`, `validateDrift` |
| Six vérifications avant un traitement | Codé | `actionChecks`, `planActions` |
| Stocker puis transmettre, par ordre de priorité | Codé | `processQueue` |
| Simulation de la pharmacie | Codé, avec des taux illustratifs | `simulateMission` |
| Test de réaction de 3 minutes | Codé | `reactionStats` |
| Lien entre un symptôme et l'environnement : CO₂, sommeil, adaptation | Codé, en règles simples par symptôme | `analyzeSymptom` |
| Calcul de probabilités par fiche (R-RAI) | À coder |  |
| Score d'alerte adapté de NEWS2 | À coder |  |
| Fiches au format de cette annexe | À coder ; la base actuelle compte 39 fiches courtes, dans `docs/js/kb.js` |  |

### La correspondance avec la norme NASA

La norme NASA-STD-3001 demande 22 capacités médicales à bord (V1 3004). Le tableau dit ce qu'AURA apporte à chacune, et ce qui reste à la charge de la mission.

| N° | Capacité demandée | Ce qu'apporte AURA | Ce qui reste à la mission |
| --- | --- | --- | --- |
| 1 | Dossier médical, inventaire et rangement | Dossier à bord, inventaire de la pharmacie et du matériel | Le rangement |
| 2 | Trousses médicales et de survie, équipement de protection | Présence, quantité et péremption de chaque produit vérifiées | Le contenu des trousses |
| 3 | Un espace de soins privé | Données visibles seulement par la personne et le responsable médical (R-CONF-01) | L'espace lui-même |
| 4 | Recueil des antécédents | Questions guidées, réponses en faits codés | Le dossier d'avant vol |
| 5 | Examen clinique et compte rendu | Signes à chercher et mesures utiles dans chaque fiche | La formation de l'équipage |
| 6 | Surveillance et soins dentaires | Sept fiches de la bouche et des dents | Le matériel et la formation dentaires |
| 7 | Correction de la vue renforcée pour le SANS | Fiche de l'atteinte de la vision liée au vol | Les lunettes de correction |
| 8 | Suivi des signes vitaux et du comportement | Référence personnelle, point du soir, test de réaction | Les capteurs |
| 9 | Examens complémentaires : imagerie, laboratoire, ECG | L'examen utile indiqué dans chaque fiche, l'échographie en premier | Les appareils et les analyses |
| 10 | Gestes et compte rendu | Chaque geste noté avec son heure | Le matériel et la formation |
| 11 | Moyens d'attache adaptés à la gravité | Rappel d'attacher le patient et le soignant | La table de contention |
| 12 | Plans de traitement | Traitements classés, suivi, journal | La validation médicale |
| 13 | Administration et gestion des médicaments | Journal des prises, effet ressenti, stocks | La pharmacie réelle |
| 14 | Consommables | Suivi des stocks, alerte de stock bas | Les quantités embarquées |
| 15 | Diagnostic et traitement de l'accident de décompression | Fiche dédiée, règle après chaque sortie (R-ENV-04) | La procédure de remise en pression |
| 16 | Gestion du travail et du repos | Fiches du sommeil et de la fatigue, test de réaction | Les limites de la mission (V1 4014) |
| 17 | Traitement des troubles neurocomportementaux | Fiches de santé mentale, conférences, conduite en urgence | Les protocoles de l'équipe de santé comportementale |
| 18 | Communication privée avec le sol, la famille et les proches | File privée, conférences privées | La liaison |
| 19 | Envoi privé des données médicales, images comprises | Voie privée, stocker puis transmettre (R-CONF-04) | Le chiffrement et le réseau du vaisseau |
| 20 | Soins autonomes et réanimation avancée | Voie « sans sol » de chaque fiche, raisonnement à bord sans liaison | Le matériel de réanimation et la formation |
| 21 | Évacuation médicale | Critère d'évacuation dans chaque fiche | Le véhicule et le plan d'évacuation (V1 3007, V1 3008) |
| 22 | Soins palliatifs | Affichage des critères fournis par la NASA (V1 3009, V1 3010) | Les critères et les protocoles |

### Ajouter une fiche, une famille ou un métier

- Une nouvelle fiche prend le premier numéro libre de sa famille, par exemple F-PSY-08. Un identifiant n'est jamais réutilisé, même après le retrait d'une fiche.
- Une nouvelle famille prend un code de trois lettres, comme les huit actuelles : APE, INF, TET, DIG, TRA, CVN, EXP et PSY.
- Un nouveau métier au sol prend le numéro suivant, S-11 pour le premier.
- Un nouveau fait codé entre dans le vocabulaire avec sa définition, ses synonymes et son unité.
- Toute nouvelle fiche commence à l'état « brouillon » et suit le circuit de relecture de la gouvernance.

Le format est conçu pour que ces ajouts ne demandent aucune modification du moteur.

## Sources

Dans le texte, une étude est citée par son premier auteur et son année (par exemple Law 2014), et une exigence de la norme NASA-STD-3001 par son numéro : V1 pour le volume 1, V2 pour le volume 2. Toutes les pages ci-dessous ont été consultées pour préparer ce document ou la base AURA existante, sauf mention contraire.

**Listes de maladies et probabilités**

- [NASA, Ranking of Medical Conditions by Probability, 2 février 2015](https://www.nasa.gov/wp-content/uploads/2026/08/ranking-of-medical-conditions-by-probability.pdf?emrc=5bfeb9) : les 100 conditions de la liste IMM et leurs probabilités par mission de référence
- [Kreykes et al., Selecting Medical Conditions Relevant to Exploration Spaceflight to Create the IMPACT 1.0 Medical Condition List, 2023](https://meridian-asma-published.prime-prod-local.pubfactory.com/view/journals/amhp/94/7/article-p550.xml) : la nouvelle liste de 120 conditions
- [Babiak-Vazquez et al., Surveillance in a Telemedicine Setting, NASA JSC](https://ntrs.nasa.gov/api/citations/20160012380/downloads/20160012380.pdf) : événements médicaux observés chez 37 astronautes de l'ISS

**Normes et limites de la NASA**

- [NASA-STD-3001 Vol. 1, section 3.0 Health and Medical Care](https://www.nasa.gov/reference/3-0-health-and-medical-care/) : V1 3001 à V1 3012 et V1 3050, dont les 22 capacités médicales de V1 3004
- [NASA-STD-3001 Vol. 1, section 4.0 Human Performance](https://www.nasa.gov/reference/4-0-human-performance) : V1 4001 à V1 4033, dont les limites de radiations
- [NASA-STD-3001 Vol. 2, section 6.0 Natural and Induced Environments](https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2) : atmosphère, pression, décompression, température, poussières, eau et bruit
- [NASA JSC 20584 rév. C, Spacecraft Maximum Allowable Concentrations, 2024](https://ntrs.nasa.gov/api/citations/20240007713/downloads/JSC%2020584_SMACs_Rev%20C_FINAL.pdf) : limites des polluants de l'air (SMAC)
- [NASA OCHMO-TB-004, Carbon Dioxide](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf) : CO₂ dans les véhicules
- [NASA OCHMO, fiche technique sur la radioprotection](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) : principes et limites de dose
- [NASA OCHMO-TB-030, Bone Loss](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf) : perte osseuse en vol

**Médicaments**

- [WikEM, Common medication list onboard ISS, d'après les données de 2023](https://wikem.org/wiki/Common_medication_list_onboard_ISS) : médicaments de l'ISS, trousse par trousse
- [ScienceDaily, résumé de Diaz et al., npj Microgravity, 2024](https://www.sciencedaily.com/releases/2024/07/240723123332.htm) : péremption de 91 médicaments de l'ISS face à une mission de trois ans
- [NASA ExMC, The Research Plan: Closing the ExMC Med02 Pharmacy Gap, 2017](https://ntrs.nasa.gov/api/citations/20170000795/downloads/20170000795.pdf) : rôle de la pharmacie du centre Johnson, durée de validité des trousses
- [ScienceDaily, résumé de Du et al., 2011](https://sciencedaily.com/releases/2011/04/110414065128.htm) : médicaments analysés après 28 mois sur l'ISS
- [ScienceDaily, résumé de Wotring, 2015](https://www.sciencedaily.com/releases/2015/11/151110094026.htm) : médicaments analysés après 550 jours sur l'ISS
- Dello Russo et al., Physiological adaptations affecting drug pharmacokinetics in space, British Journal of Pharmacology, 2022 : référence de la base AURA, non rouverte pour ce document

**Recherche sur la santé dans l'espace**

- [Khalid et al., Pharmacological and non-pharmacological countermeasures to Space Motion Sickness, Frontiers, 2023](https://www.frontiersin.org/articles/10.3389/fncir.2023.1150233/full) : mal de l'espace
- [Kerstman et al., Space Adaptation Back Pain: A Retrospective Study, 2012](https://asma.kglmeridian.com/view/journals/asem/83/1/article-p2.xml) : mal de dos en vol et efficacité des traitements
- [Marshall-Goebel et al., Assessment of Jugular Venous Blood Flow Stasis and Thrombosis During Spaceflight, 2019](https://scholarlycommons.henryford.com/surgery_articles/390) : caillots de la veine jugulaire
- [Newswise, résumé de Law et al., 2014](https://www.newswise.com/articles/in-space-headaches-are-an-occupational-hazard) : CO₂ et maux de tête sur l'ISS
- [Stahn et al., 2017](https://doi.org/10.1038/s41598-017-15560-w) : température du corps en vol, au repos et à l'effort
- [ScienceDaily, résumé de Barger et al., 2014](https://www.sciencedaily.com/releases/2014/08/140807215803.htm) : sommeil et somnifères en mission
- [Basner et al., 2011](https://doi.org/10.1016/j.actaastro.2011.07.015) : test de réaction de 3 minutes
- [Basner et al., 2014](https://doi.org/10.1371/journal.pone.0093298) : humeur, sommeil et conflits pendant Mars-520
- [Crucian et al., 2018](https://www.frontiersin.org/journals/immunology/articles/10.3389/fimmu.2018.01437/full) : immunité en vol et réveil des virus
- [Revue sur le SANS, npj Microgravity, 2020](https://www.nature.com/articles/s41526-020-0097-9) : atteinte de la vision liée au vol
- [Institut de recherche de l'Hôpital d'Ottawa, résumé de Trudel et al., 2022](https://ohri.ca/en/newsroom/being-space-destroys-more-red-blood-cells) : anémie spatiale

**Radiations, environnement et urgences**

- [SwRI, résumé de Zeitlin et al., 2013](https://www.swri.org/press-release/swri-led-team-calculates-radiation-exposure-associated-trip-mars) : dose pendant le trajet vers Mars
- [IAS, résumé de Hassler et al., 2014](https://ias.universite-paris-saclay.fr/en/node/1424) : dose à la surface de Mars
- [Tobias et McMillan, Emergency Response Actions on the ISS, 2023](https://ntrs.nasa.gov/api/citations/20220019247/downloads/Emergency%20Ops%20History%20for%20SpaceOps%20Conference%202023.pdf) : urgences du vaisseau et procédures
- [Limardo et al., ISS Crewmembers' Noise Exposures](https://ntrs.nasa.gov/api/citations/20210016305/downloads/Inter-Noise2021_Paper2219_FINAL%20Manuscript.pdf) : bruit et protection auditive
- [NASA, Toxicology and Environmental Chemistry](https://www.nasa.gov/directorates/esdmd/hhp/toxicology-and-environmental-chemistry/) : analyses de l'air et de l'eau
- [Space.com, conjonction solaire de Mars, 2015](https://space.com/29576-nasa-mars-spacecraft-radio-blackout.html) : coupure de la liaison avec Mars

**Équipe au sol et conférences**

- [NASA, Houston We Have a Podcast, Mission Control Crew Health Consoles](https://www.nasa.gov/podcasts/houston-we-have-a-podcast/mission-control-crew-health-consoles) : métiers au sol, conférence médicale de 15 minutes, équipes de jour et de nuit
- [Beven, Behavioral Health and Performance Operations at NASA JSC, 2017](https://ntrs.nasa.gov/api/citations/20170003866/downloads/20170003866.pdf) : conférences psychologiques privées

**Médecine clinique sur Terre**

- [BCMJ, compte rendu du livre The Rational Clinical Examination de Simel et Rennie, 2008](https://bcmj.org/news/book-review-rational-clinical-examination) : la série du JAMA sur la valeur des signes cliniques
- [Bent et al., Does this woman have an acute uncomplicated urinary tract infection?, JAMA, 2002](https://read.qxmd.com/read/12020306/does-this-woman-have-an-acute-uncomplicated-urinary-tract-infection) : infection urinaire
- [Ebell, Diagnosis of Appendicitis: Part I, American Family Physician, 2008](https://www.aafp.org/pubs/afp/issues/2008/0315/p828.html) : appendicite
- [West et Daly, Predictors of Acute Myocardial Infarction, American Family Physician, 2017](https://www.aafp.org/pubs/afp/issues/2017/0901/p328.html) : résumé de Panju et al. (JAMA, 1998) sur l'infarctus
- [Goldstein et Simel, Is This Patient Having a Stroke?, JAMA, 2005](https://com-dom-im-a2.sites.medinfo.ufl.edu/files/2012/06/5.16.16.-Is-This-Patient-Having-a-Stroke.pdf) : AVC
- [Ebell, Diagnosis of Streptococcal Pharyngitis, American Family Physician, 2014](https://www.aafp.org/afp/2014/0615/p976) : score de McIsaac, et résumé d'Ebell et al. (JAMA, 2000) sur l'angine
- [American Family Physician, résumé de Bachmann et al., BMJ, 2003](https://www.aafp.org/pubs/afp/issues/2003/0815/p745a.html) : règles d'Ottawa pour la cheville et le pied
- [American Family Physician, résumé d'Attia et al., JAMA, 1999](https://www.aafp.org/afp/2000/0115/p493) : méningite chez l'adulte
- [Kroenke et al., The Patient Health Questionnaire-2, Medical Care, 2003](https://www.qxmd.com/r/14583691) : questionnaire PHQ-2
- [Université de Washington, Generalized Anxiety Disorder 2-item (GAD-2)](https://www.hiv.uw.edu/page/mental-health-screening/gad-2) : questionnaire GAD-2, d'après Kroenke et al., Annals of Internal Medicine, 2007
- [Royal College of Physicians, National Early Warning Score 2, résumé, 2017](https://www.rcp.ac.uk/media/ctulqqbn/news2-executive-summary_0.pdf) : score NEWS2 et seuils de réponse
- [MDCalc, National Early Warning Score 2](https://www.mdcalc.com/calc/10083/national-early-warning-score-2-news2) : points de chaque mesure du score
- [Schlaich et al., Guidance to the International Medical Guide for Ships 3rd edition, International Maritime Health, 2009](https://journals.viamedica.pl/international_maritime_health/article/download/26254/21048) : guide médical de l'OMS pour les navires sans médecin
- [Joint Trauma System, Prolonged Casualty Care Guidelines, 2021, mis à jour en 2023](https://jts.health.mil/assets/docs/cpgs/prolonged_casualty_care_guidelines_21_dec_2021_id91.pdf) : soins prolongés quand l'évacuation tarde
- [Fansi Tchango et al., DDXPlus: A New Dataset For Automatic Medical Diagnosis, arXiv, 2022](https://arxiv.org/abs/2205.09148) : base de patients fictifs, pour tester le moteur

**AURA**

- Code de la démonstration : `docs/js/engine.js`, `docs/js/data.js` et `docs/js/kb.js` du dépôt AURA, pour les règles déjà codées
