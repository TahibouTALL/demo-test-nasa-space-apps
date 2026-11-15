# Films AURA

Quatorze films de trois à quatre minutes, en français, sous-titrés. Chaque film suit une fiche
AURA et cite ses sources (affichées à la fin du film et sous le lecteur).

Les fichiers publiés sont dans `docs/videos/` : `<id>.mp4` (1280 x 720, H.264 et AAC),
`<id>.vtt` (sous-titres) et `<id>.jpg` (affiche). `plateforme/tools/build.py` ne touche jamais
à ce dossier : les films sont produits ici, à part, puis publiés.

## Ce que contient chaque film

- **Images de la station** : rendues par le moteur d'AURA Immersion (`studio/`), dans
  l'intérieur réel de l'ISS (modèle 3D de la NASA) avec l'équipage de démonstration.
- **Schémas animés** (`diagrams.mjs`) : oreille interne, déplacement des liquides, os,
  rein, pression, radiations, bulles d'azote...
- **Chiffres** : chaque chiffre affiché porte sa source.
- **Voix** : synthèse vocale Kokoro (modèle `kokoro-v1.0.onnx`, voix `ff_siwis`), lue lentement.
- **Musique** : nappe calme générée par le script, qui baisse sous la voix.

## Fabrication

```
npm install                                   # @napi-rs/canvas et playwright
pip install kokoro-onnx soundfile numpy
# 1) voix : un fichier par scène et le minutage de chaque phrase (pour les sous-titres)
KOKORO_DIR=/chemin/vers/kokoro python3 tts.py [id...]
# 2) images de la station (moteur d'immersion construit dans immersion/dist)
cd studio && W=1600 H=900 node studio.js stills.mjs ../stills [clé...] && cd ..
# 3) montage : images, schémas, voix, musique, sous-titres
node render.mjs arrivee                       # out/arrivee.mp4, .vtt, .poster.png, .json
node render.mjs arrivee --preview 5,30,61     # images de contrôle dans preview/
# 4) publication dans docs/videos et liste des films dans plateforme/src/js/ui/videos.js
node publish.mjs ../../..
```

Le texte lu et les images de chaque scène sont dans `scripts.mjs` ; les sources sont listées en
tête du fichier. Le texte lu écrit les nombres en toutes lettres pour la synthèse vocale.

`node queue.mjs` rend les films les uns après les autres, dès que leurs images existent.

Les vignettes des cartes d'évasion et de simulation viennent du même studio
(`studio/thumbs*.mjs`, puis `python3 thumbs.py`, qui écrit les fichiers WebP dans
`immersion/assets/img/evasion/` et `immersion/assets/img/sims/`).

Police : Atkinson Hyperlegible Next (licence SIL OFL, voir `fonts/OFL.txt`).
