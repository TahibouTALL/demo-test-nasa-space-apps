# AURA

AURA rend le suivi médical de l'équipage autonome pendant une mission lointaine. Vers Mars, le médecin
au sol répond avec jusqu'à 44 minutes de retard, et plus du tout pendant la conjonction solaire. À bord,
personne n'est médecin à plein temps. AURA met la connaissance médicale à bord et guide chaque astronaute,
pas à pas, avec Sophie.

Projet préparé pour le défi *Create Health Monitoring Software for Astronauts on Space Missions* du
NASA Space Apps Challenge 2026 (événement local de Dakar).

**En ligne : https://tahiboutall.github.io/demo-test-nasa-space-apps/**

## Deux exigences

**La simplicité.** Les astronautes ne sont pas médecins, et un écran chargé ajoute du stress. On parle
à Sophie, ou on lui écrit, et elle ouvre le bon écran ou répond. Une seule chose à la fois, peu de
texte, des animations douces. Tout reste aussi accessible sans Sophie, par les grandes portes de
l'accueil.

**La précision.** Une erreur peut être grave. Les orientations viennent des fiches et des règles de la
base de connaissances de l'équipe, jamais d'une IA de langage. Un signe d'alarme passe avant tout le
reste. Avant de proposer un médicament, AURA fait six vérifications (à bord, quantité, encore bon,
faisable en apesanteur, tâches à venir, délai du sol). La médecin de bord valide.

## Ce que fait la plateforme

- **Sophie** : un personnage animé qui parle (voix de femme, ou d'homme sur demande) et écoute, à la
  voix ou par écrit. Chaque astronaute peut lui donner un autre nom. Elle ouvre l'écran demandé, répond
  aux questions à partir des fiches, discute, et tient le journal privé.
- **Je ne me sens pas bien** : quelques questions, les signes d'alarme d'abord, puis l'orientation la plus
  probable, les gestes à faire et une proposition de traitement vérifiée, envoyée à la médecin de bord.
- **Urgences** : écran d'urgence avec les premiers gestes, médecin de bord prévenue, message prioritaire
  vers la Terre, et une suppléante quand la médecin de bord est elle-même la patiente.
- **Mesures** : température, pouls au repos, saturation et sommeil, lus avec la référence personnelle
  de chacun (filtre de Kalman) et l'effet connu du vol.
- **Conférence de la semaine** : quinze minutes avec Sophie, à la voix ou par écrit, sur six sujets
  (alimentation, sommeil, exercice, élimination, charge de travail, moral). Le résumé est relu avant
  l'envoi, et la partie moral reste privée sans accord.
- **Évasion** : quatre lieux en 3D (lac de montagne, plage, désert, la Terre vue de l'orbite) avec
  respiration guidée, sur l'écran ou dans un casque de réalité virtuelle.
- **Simulations** : quatre entraînements (arrêt cardiaque, allergie grave, fumée à bord, calcul rénal avec
  échographie), lancés en une phrase ou un geste.
- **Vidéos** : des capsules de prévention et de sécurité, et chaque jour la vidéo la plus utile pour
  chacun (sortie prévue, sommeil en baisse, rappel de sécurité).
- **Défis** : points, niveaux, badges et un objectif commun à l'équipage, pour le sport, les
  entraînements, l'évasion, les vidéos, le journal et les conférences.
- **Espace de la médecin de bord** : équipage, propositions à valider, pharmacie et simulation Monte
  Carlo des stocks, fiches (cycle de vie et test), vidéos, liaison avec la Terre, réglages de la mission.

## L'essayer

1. Ouvrir le lien ci-dessus, de préférence dans Chrome ou Edge (la dictée vocale en dépend).
2. Choisir un astronaute, par exemple Lucas, ou la médecin de bord, Keiko.
3. Parler ou écrire à Sophie : « j'ai mal à la tête », « je me suis cogné la tête », « emmène-moi au
   lac », « lance la simulation d'arrêt cardiaque », « appelle-toi Nova », « parle avec une voix
   d'homme ».

Pour le casque : dans Évasion, « Ouvrir dans le casque » affiche un code QR à viser avec le navigateur
du casque ; dans la scène, le bouton Casque fait entrer dedans. Les données sont des données de
démonstration, gardées dans le navigateur ; Réglages, puis Réinitialiser, remet tout à zéro.

AURA est un prototype de concours. Elle aide l'équipage, elle ne remplace pas un médecin.

## Précision : ce que l'équipe médicale doit relire

- La base de connaissances est l'export du document « AURA : fiches et règles de la base de
  connaissances » (`plateforme/kb/fiches.md`). `npm run build:fiches` la transforme en données.
- Pour chaque fiche, les faits « pour », « contre » et les signes d'alarme sont repérés automatiquement
  dans le texte. Ils sont à relire fiche par fiche, dans l'espace de la médecin de bord, onglet Fiches.
- Le moteur d'orientation suit les règles R-RAI du document. Les valeurs marquées « choix AURA » dans
  Réglages, Moteur d'orientation, sont à valider. Une règle ajoutée par AURA : on ne compare que les
  fiches qui citent au moins un fait décrit, et pour une blessure ou une exposition, seulement celles
  qui la citent.
- Un coup léger à la tête n'ouvre pas l'écran d'urgence d'emblée : Sophie demande d'abord si le choc
  était fort.

## L'intelligence artificielle, facultative

Sans IA de langage, tout fonctionne : Sophie comprend les demandes avec le vocabulaire de la base, et
répond à partir des fiches. Avec une IA connectée (Réglages de la mission), Sophie converse plus
librement. Services possibles : Claude (Anthropic), services compatibles avec l'API OpenAI, ou Ollama
sur l'ordinateur, sans internet.

L'IA ne calcule aucune probabilité et ne choisit aucun traitement. La clé reste dans le navigateur et
n'est envoyée qu'au service choisi ; elle n'est jamais écrite dans le dépôt.

## Construire et tester

Le site publié est le dossier `docs/`, construit à partir des sources.

```bash
npm run build            # construit docs/ (contrôles, immersion, plateforme)
npm run build:fiches     # régénère les données des fiches après une mise à jour du document
npm start                # http://localhost:8000
npm test                 # scénarios du moteur d'orientation
npm run test:navigateur  # parcours dans Chromium, avec captures (nécessite Playwright)
```

La construction demande Python 3 et Node.js, sans autre dépendance. GitHub Pages fonctionne avec les
deux réglages (Settings, Pages, branche `main`) : dossier `/docs`, ou `/ (root)`, où la page d'accueil
redirige vers `docs/`.

## Structure

```
docs/                    site publié (généré par npm run build)
plateforme/
  src/index.html         page, avec la liste des scripts insérée à la construction
  src/css/aura.css       système visuel
  src/fonts/             Atkinson Hyperlegible Next (licence OFL)
  src/js/core/           données de référence, moteur de calcul, pharmacie, défis, état
  src/js/kb/             vocabulaire, lecture des fiches, données des fiches, moteur d'orientation
  src/js/sophie/         personnage, voix, compréhension des demandes, IA facultative
  src/js/ui/             écrans : accueil, santé, orientation, conférence, journal, vidéos,
                         évasion et simulations, défis, espace de la médecin de bord
  kb/fiches.md           base de connaissances (export du document)
  tools/                 construction du site et des données des fiches
  tests/                 scénarios du moteur et parcours dans le navigateur
immersion/
  src/                   scènes 3D, simulations, réalité virtuelle
  assets/                textures de la Terre, images, polices
  lib/three/             three.js 0.160.1 (licence MIT)
  build.py               assemble immersion/dist/, intégré ensuite dans docs/immersion/
```

## Sources

Chaque fiche et chaque règle cite ses sources dans le document des fiches (probabilités de l'Integrated
Medical Model de la NASA, norme NASA-STD-3001, publications citées fiche par fiche). Les repères de
lecture des mesures sont dans `plateforme/src/js/core/data.js`, par exemple Stahn et al. 2017 pour la
température en apesanteur.

## Licences

Code sous licence MIT. three.js : licence MIT (`immersion/lib/three/LICENSE`). Police Atkinson
Hyperlegible Next : licence SIL Open Font (`plateforme/src/fonts/OFL.txt`). qrcode-generator : licence
MIT (en tête de `plateforme/src/js/lib/qrcode.js`).

## Utilisation de l'IA

Le code et les textes de cette plateforme ont été produits avec l'aide d'un assistant d'intelligence
artificielle. C'est à déclarer dans la soumission, conformément aux règles du concours.
