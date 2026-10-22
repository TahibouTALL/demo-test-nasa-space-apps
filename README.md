# AURA — surveillance de la santé des astronautes

Projet préparé pour le **NASA Space Apps Challenge 2026** (Local Event Dakar),
challenge *Create Health Monitoring Software for Astronauts on Space Missions*.

AURA adapte les normes médicales, les seuils d'alarme et les actions proposées
aux conditions réelles du vol (microgravité, isolement, délai de
communication), plutôt que d'appliquer des repères conçus pour un corps qui
reste sur Terre.

## Lancer le projet en local

```bash
npm start
```

Puis ouvrir `http://localhost:3000`.

Lancer les tests :

```bash
npm test
```

## Structure

```
public/            interface (présentation + démonstrateur)
server/
  server.js        API HTTP (Node.js natif, sans dépendance externe)
  pipeline.js       chaîne de traitement d'une mesure (F3 → F6)
  lib/
    bayesian.js      mise à jour bayésienne de la référence personnelle
    validate.js       les 3 vérifications de cohérence (F3)
    norms.js           norme adaptée à 5 couches (F4) + évaluation d'alarme (F5)
    actions.js          table de règles pour l'action proposée (F6)
  data/
    metrics.json         normes terrestres + décalages spatiaux sourcés
    astronauts.seed.json  profils de départ de l'équipage (référence pré-vol)
    scenarios.json          les 6 scénarios de démonstration
  server.test.js     tests (node:assert, sans dépendance)
```

## Ce qui est réellement implémenté

- Mise à jour bayésienne réelle de la référence personnelle de chaque
  astronaute (modèle normal-normal conjugué), pas une valeur pré-calculée.
- Norme adaptée calculée à partir de la norme terrestre, du décalage spatial
  documenté dans la littérature, de la référence personnelle et du contexte
  de mission.
- Les 3 vérifications de cohérence de F3 (valeur impossible ignorée, donnée
  manquante non bloquante, mesure isolée aberrante redemandée à partir de
  l'historique réel du journal).
- Journal de mission et file de transmission persistés (fichier JSON).
- Les 6 scénarios de démonstration rejouent la vraie chaîne de traitement
  (`POST /api/scenarios/:id/replay`) — rien n'est renvoyé en dur.

## Ce qui ne l'est pas (périmètre volontairement laissé de côté)

- Pas de capteur réel connecté — les mesures viennent de scénarios simulés ou
  de l'API `POST /api/measurements` appelée à la main.
- Pas d'étage IA (conférence médicale, RAG) — décrit dans le document de
  fonctionnalités, à construire pendant le hackathon.
- Indice de fiabilité des capteurs et protection logicielle contre les
  radiations : écartés du périmètre (voir le document de fonctionnalités,
  section perspectives).
- Authentification, gestion multi-mission, interface d'administration.

## API

| Méthode | Route                          | Description |
|---|---|---|
| GET | `/api/astronauts` | Liste de l'équipage avec référence courante |
| GET | `/api/astronauts/:id` | Un astronaute |
| POST | `/api/measurements` | Traite une mesure `{ astronautId, metric, value, context }` |
| GET | `/api/journal` | Journal de mission (50 dernières entrées) |
| GET | `/api/metrics` | Normes terrestres et décalages spatiaux |
| GET | `/api/scenarios` | Liste des 6 scénarios |
| POST | `/api/scenarios/:id/replay` | Rejoue un scénario à travers la vraie chaîne de traitement |
| GET | `/api/state` | État de la liaison et file de transmission |
| POST | `/api/reset` | Remet l'état de démonstration à zéro |
