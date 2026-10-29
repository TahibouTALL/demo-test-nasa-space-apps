# AURA : santé de l’équipage

Plateforme de suivi de la santé des astronautes pour les missions lointaines, préparée pour le défi
*Create Health Monitoring Software for Astronauts on Space Missions* du **NASA Space Apps Challenge 2026**
(événement local de Dakar).

**En ligne : https://tahiboutall.github.io/demo-test-nasa-space-apps/**

## L’idée

Aujourd’hui, l’adaptation des repères médicaux aux conditions du vol se fait surtout dans la tête du
médecin au sol : il sait que la température monte d’environ 1 °C en apesanteur, qu’un mal de tête peut
venir du CO₂ de la cabine, qu’un médicament stocké longtemps peut perdre de sa puissance. Vers Mars, ce
médecin répond avec jusqu’à 44 minutes de retard, et plus du tout pendant les deux semaines de conjonction
solaire. AURA met cette connaissance à bord, écrite, sourcée et vérifiable.

Exemple : Lucas Moreau mesure 38,1 °C au réveil, à J+70. La norme du sol dit « fièvre ». AURA, qui connaît
l’effet du vol et la référence de Lucas, répond « normale pour vous en ce moment ». À l’inverse, un pouls de
92 au repos passe pour normal sur Terre, mais AURA alerte pour Rafael Ortiz, dont la référence est à 51.

## Les treize fonctionnalités

| | Fonctionnalité | Où la trouver |
|---|---|---|
| F1 | Profil de mission et contexte spatial, avec les éruptions solaires **réelles** de la base DONKI de la NASA | Mission et cabine |
| F2 | Préparation de la pharmacie en trois scénarios (Monte Carlo), péremptions avant la fin de mission, temps de travail perdu | Planification |
| F3 | Lecture et vérification des mesures : valeur impossible, donnée manquante, valeur isolée | Mesurer |
| F4 | Normes adaptées à l’espace et à chaque personne, en cinq étapes visibles | Mesurer, Mon dossier |
| F5 | Signes d’alarme reconnus dans toutes les saisies, mode urgence, message prioritaire vers la Terre | Urgence, Assistant, Entretien |
| F6 | Proposition d’action adaptée au vol : six vérifications avant chaque médicament (à bord, quantité, encore bon, faisable en apesanteur, tâches à venir, délai du sol) | Je ne me sens pas bien |
| F7 | Visioconférence médicale de 15 minutes chaque semaine pour chaque membre d’équipage : alimentation, sommeil, exercice, élimination, charge de travail, bien-être. Avec le médecin au sol tant qu’on peut se parler en direct (moins de 10 secondes de délai) ; sinon (délai, conjonction, médecin indisponible) avec AURA, personnage animé qui parle, écoute et réagit. Résumé relu, partie psychologique envoyée seulement avec l’accord de la personne | Conférence ; profil « Médecin au sol », Conférences |
| F8 | Questions libres avec réponses tirées des fiches de bord, numérotées et sourcées ; AURA dit quand il ne sait pas | Assistant |
| F9 | Langage adapté : simple pour l’équipage, clinique pour la médecin de bord, anglais avec une IA | partout (« Voir en langage médical ») |
| F10 | Moral, stress et isolement : point du soir privé, test de réaction de 3 minutes, pause respiration, paysage de la Terre à 360°, conseils si l’ambiance se tend | Bien-être |
| F11 | Envoi vers la Terre : délai réel, file par priorité, paquet du jour compressé, coupure de conjonction | Liaison Terre |
| F12 | Écran du médecin au sol (ce qui est arrivé, avec le retard) et vue de l’équipage | profil « Médecin au sol » |
| F13 | Fonctionnement sans connexion : tout le calcul tourne dans le navigateur | toujours |

Trois profils sur les mêmes données : **équipage** (chacun voit ses propres mesures, en mots simples),
**médecin de bord** (tout l’équipage, vocabulaire clinique, décisions) et **médecin au sol** (seulement
ce qui est arrivé sur Terre, avec le délai de la liaison).

## Une interface qui ne met pas la pression

Un astronaute vit des mois avec son outil de santé. AURA est pensé pour ne jamais ajouter de stress :

- pas de score ni de note : une couleur calme quand tout va bien, l’ambre pour « à regarder », le rouge
  réservé aux urgences ;
- une seule chose à la fois, les détails repliés derrière « Comment AURA a lu cette mesure » ;
- tout peut attendre : « Plus tard », « Passer cette question », « Garder à bord » ;
- la vie privée d’abord : le point du soir reste entre la personne et la médecin de bord, la partie
  psychologique de l’entretien ne part qu’avec son accord, une demande au psychologue reste privée ;
- police Atkinson Hyperlegible Next, mode sombre, animations réduites si le système le demande,
  navigation par onglets sur téléphone.

## Comment AURA lit une mesure

1. Norme terrestre (repère clinique au sol)
2. Effet du vol connu dans la littérature (par exemple +1 °C au repos, Stahn et al., 2017)
3. Référence personnelle mesurée avant le départ
4. Ajustement quotidien avec les mesures en vol (filtre bayésien de Kalman, niveau local)
5. Contexte du moment (effort, stress, médicament)

Règles de sécurité : un signe d’alarme passe avant tout calcul ; une valeur anormale n’est jamais intégrée
à la référence ; les seuils fixes (39 °C, saturation sous 90 %, pouls de repos au-dessus de 120) ne sont
jamais personnalisés ; un décalage persistant demande la décision du médecin ; AURA ne change jamais une
dose lui-même.

## L’intelligence artificielle, facultative

Sans IA, tout fonctionne : l’assistant affiche les passages des fiches de bord, l’entretien pose les
questions préparées à partir de la semaine, la synthèse est écrite par des règles. Avec une IA connectée,
AURA rédige les réponses (à partir des fiches seulement, avec leurs numéros), mène l’entretien, prépare la
synthèse, reformule et aide à écrire au sol. Les normes, les alertes et la pharmacie ne passent jamais
par l’IA.

Pour la connecter : **Réglages, Intelligence artificielle**, puis choisir le service et coller une clé.

- **Claude (Anthropic)** : Sonnet 5.5, Opus 5.5, Fable 5.1 ou Haiku 5.5. Clé à créer dans la console
  Anthropic ; la page appelle l’API directement depuis le navigateur.
- **Services compatibles avec l’API OpenAI** : OpenAI, Google Gemini, Mistral, Groq, OpenRouter, ou une
  adresse au choix.
- **Ollama**, pour un modèle qui tourne sur l’ordinateur, sans internet. Depuis la version en ligne,
  lancer Ollama avec `OLLAMA_ORIGINS=https://tahiboutall.github.io ollama serve`.

La clé reste dans ce navigateur (stockage local) et n’est envoyée qu’au service choisi. Elle n’est
jamais écrite dans le dépôt.

La voix utilise la synthèse et la dictée du navigateur, en français. Selon le navigateur, la dictée peut
demander une connexion.

## Ce qui est calculé, ce qui est simulé

Calculé dans le navigateur : filtre bayésien et plages attendues, contrôles des mesures, alertes et
signes d’alarme, vérifications avant un médicament, Monte Carlo de la pharmacie, file vers la Terre et
compression du paquet du jour, recherche documentaire (BM25, avec synonymes), statistiques du test de
réaction, synthèse de la semaine.

Réel : les éruptions solaires des 30 derniers jours, lues dans la base DONKI de la NASA quand la
connexion le permet (clé `DEMO_KEY` par défaut, modifiable dans les réglages).

Simulé : l’équipage et ses capteurs (fictifs, reproductibles), le CO₂ de la cabine, les réponses
automatiques du médecin au sol, les fréquences des situations médicales (illustratives) et la distance
Terre-Mars (modèle simplifié). Les données réelles prévues sont listées dans la page Mission (LSDA,
OSDR, PhysioNet, NASA-STD-3001).

## Démonstration guidée

Neuf scénarios, accessibles depuis **Démonstration** : préparer la pharmacie avant le départ, une fièvre
qui n’en est pas une, un mal de tête dont la cause est dans la cabine, une éruption solaire, la
visioconférence de la semaine avec le médecin au sol, la visioconférence avec AURA quand le médecin ne
peut pas, la conjonction solaire, un signe d’alarme qui passe avant tout, et
le moral pendant l’isolement.

## Lancer en local

Le dossier `docs/` est un site statique : n’importe quel serveur de fichiers suffit.

```bash
npm start                  # serveur Node (sans dépendance) : http://localhost:3000
npm test                   # tests du moteur, de la simulation et des fonctions de la plateforme
npm run test:navigateur    # parcours complets dans Chromium (nécessite Playwright)
```

Le serveur Node expose aussi une petite API (`/api/etat`, `/api/mesures`, `/api/avancer`, `/api/journal`)
pour brancher plus tard de vrais capteurs. Il utilise exactement le même moteur que le navigateur.

## GitHub Pages

Le site fonctionne avec les deux réglages possibles de GitHub Pages (Settings, Pages, branche `main`) :
dossier `/docs` (recommandé), ou `/ (root)`, où la page d’accueil redirige vers `docs/`.

## Structure

```
docs/                    la plateforme (site statique)
  index.html
  assets/                styles, polices Atkinson Hyperlegible Next (licence OFL), icônes, code QR
  js/data.js             données de référence, scénarios et sources
  js/kb.js               fiches de bord embarquées
  js/engine.js           moteur de calcul (fonctions pures)
  js/store.js            état, simulation de la mission, liaison avec la Terre
  js/ai.js               étage IA facultatif (Claude, services compatibles OpenAI, Ollama)
  js/ui.js               règle de lecture et graphiques
  js/relax.js            respiration, paysage à 360°, test de réaction
  js/views-core.js       aides communes aux pages
  js/views-crew.js       pages de l’équipage
  js/views-doctor.js     pages des médecins
  js/views-shared.js     pages communes
  js/app.js              navigation, actions, voix, sauvegarde locale
  sw.js                  fonctionnement hors connexion
server/server.js         serveur et API facultatifs
tests/                   tests du moteur, de la plateforme et test de bout en bout
```

## Sources principales

Stahn et al. 2017 (température), Law et al. 2014 et fiche NASA OCHMO sur le CO₂, Barger et al. 2014
(sommeil), Basner et al. 2011 (test de réaction), Basner et al. 2013 et 2014 (Mars-520, conflits),
Zeitlin et al. 2013 et Hassler et al. 2014 (radiation), fiche NASA OCHMO radioprotection (limite de
600 mSv), Du et al. 2011 et Wotring 2015 (stabilité des médicaments), Dello Russo et al. 2022
(pharmacocinétique en vol), Crucian et al. 2018 (immunité), Russell et al. 2023 (autonomie médicale),
Buras et Hilmers 2025 (IA embarquée), Anderson et al. 2025 (réponses appuyées sur des documents), NASA
DONKI. La liste complète, avec les liens, est dans la page À propos.

## Utilisation de l’IA

Le code et les textes de cette plateforme ont été produits avec l’aide d’un assistant d’intelligence
artificielle. C’est à déclarer dans la soumission, conformément aux règles du concours.
