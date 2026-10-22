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

## Ce que fait la plateforme

| Page | Ce qu’on y fait |
|---|---|
| Vue d’ensemble | État de la personne (vue équipage) ou de tout l’équipage (vue médecin de bord) |
| Équipage et fiches | Chaque mesure lue avec la norme du sol et avec la référence AURA, les cinq étapes du calcul, l’historique |
| Nouvelle saisie | Mesures (température, pouls, saturation) et symptômes reliés aux conditions du vol |
| Alertes | Vigilance, alerte, mode urgence avec procédure et message prioritaire vers la Terre |
| Pharmacie | Stock, dose validée par le médecin, suivi de l’effet après chaque prise, stabilité des produits |
| Planification | Simulation Monte Carlo des besoins en médicaments pour une mission sans réapprovisionnement |
| Bien-être | Point du jour privé (humeur, stress, sommeil), repérage d’une baisse qui dure |
| Habitat | CO₂ de la cabine et dose de radiation, avec les limites NASA |
| Conférence | Synthèse de la semaine préparée sans IA à partir du journal |
| Questions | Recherche hors connexion dans une base de fiches sourcées, avec le contexte de la mission |
| Liaison Terre | Délai radio réel, file d’attente par priorité, coupure de conjonction |
| Mission | Profil, frise, données réelles prévues, réglages de la simulation |
| Démonstration guidée | Les six scénarios à présenter, dans l’ordre |

Deux vues sur les mêmes données : **équipage** (langage simple, chacun voit ses propres mesures) et
**médecin de bord** (vocabulaire clinique, tout l’équipage, décisions de validation).

## Comment AURA lit une mesure

1. Norme terrestre (repère clinique au sol)
2. Effet du vol connu dans la littérature (par exemple +1 °C au repos, Stahn et al., 2017)
3. Référence personnelle mesurée avant le départ
4. Ajustement quotidien avec les mesures en vol (filtre bayésien de Kalman, niveau local)
5. Contexte du moment (effort, stress, médicament)

Règles de sécurité : une valeur anormale n’est jamais intégrée à la référence ; les seuils fixes
(39 °C, saturation sous 90 %, pouls de repos au-dessus de 120) ne sont jamais personnalisés ; un décalage
persistant demande la décision du médecin ; AURA ne change jamais une dose lui-même.

## Ce qui est calculé, ce qui est simulé

Tout le calcul est réel et tourne dans le navigateur : filtre bayésien, plages attendues, alertes, trois
contrôles de cohérence des mesures (valeur impossible, donnée manquante, valeur isolée), Monte Carlo,
file vers la Terre, recherche documentaire (BM25), synthèse hebdomadaire.

Sont simulés : l’équipage et ses capteurs (fictifs, reproductibles), le CO₂ et l’éruption solaire, les
réponses du médecin au sol, les fréquences des situations médicales (illustratives) et la distance
Terre-Mars (modèle simplifié). Les données réelles prévues sont listées dans la page Mission (LSDA, OSDR,
PhysioNet, NASA-STD-3001).

La plateforme fonctionne **sans connexion** après le premier chargement (service worker, polices
hébergées avec le site).

## Lancer en local

Le dossier `docs/` est un site statique : n’importe quel serveur de fichiers suffit.

```bash
npm start            # serveur Node (sans dépendance) : http://localhost:3000
npm test             # 36 tests du moteur et de la simulation
npm run test:navigateur   # parcours complet dans Chromium (nécessite Playwright)
```

Le serveur Node expose aussi une petite API (`/api/etat`, `/api/mesures`, `/api/avancer`, `/api/journal`)
pour brancher plus tard de vrais capteurs. Il utilise exactement le même moteur que le navigateur.

## GitHub Pages

Le site fonctionne avec les deux réglages possibles de GitHub Pages (Settings, Pages, branche `main`) :
dossier `/docs` (recommandé), ou `/ (root)`, où la page d’accueil redirige vers `docs/`.

## Structure

```
docs/                 la plateforme (site statique)
  index.html
  assets/             styles, polices Atkinson Hyperlegible Next (licence OFL), icônes, code QR
  js/data.js          données de référence et sources
  js/kb.js            base documentaire embarquée
  js/engine.js        moteur de calcul (fonctions pures)
  js/store.js         état, simulation de la mission, actions
  js/ui.js            règle de lecture et graphiques
  js/views-*.js       pages
  js/app.js           navigation, actions, sauvegarde locale
  sw.js               fonctionnement hors connexion
server/server.js      serveur et API facultatifs
tests/                tests du moteur et test de bout en bout
```

## Sources principales

Stahn et al. 2017 (température), Law et al. 2014 et fiche NASA OCHMO sur le CO₂, Barger et al. 2014
(sommeil), Basner et al. 2013 (Mars-520), Zeitlin et al. 2013 et Hassler et al. 2014 (radiation),
fiche NASA OCHMO radioprotection (limite de 600 mSv), Du et al. 2011 et Wotring 2015 (stabilité des
médicaments), Dello Russo et al. 2022 (pharmacocinétique en vol), Crucian et al. 2018 (immunité),
Russell et al. 2023 (autonomie médicale), Buras et Hilmers 2025 (IA embarquée). La liste complète, avec
les liens, est dans la page À propos.

## Utilisation de l’IA

Le code et les textes de cette plateforme ont été produits avec l’aide d’un assistant d’intelligence
artificielle. C’est à déclarer dans la soumission, conformément aux règles du concours.
