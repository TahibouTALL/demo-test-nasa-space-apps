# Outils de préparation des modèles 3D

Les fichiers de `immersion/assets/models/` sont produits par les scripts de ce dossier.
Rien n'est chargé depuis Internet au moment de l'exécution : tout est livré avec l'application.

Installation des dépendances JavaScript : `npm install` dans ce dossier.
Dépendances Python : `numpy`, `scipy` (et `scikit-image`, `trimesh`, `fast_simplification` pour `manikin.py`).

## Intérieur de la station (NASA, domaine public)

Source : dépôt NASA 3D Resources, dossier
`3D Models/International Space Station (ISS) (E) (Internal)/` (archive 7z en huit parties).
Le fichier FBX de l'archive est converti en glTF binaire (`iss_internal.glb`), puis chaque module
est extrait et compressé (textures WebP, géométrie quantifiée et meshopt) :

```
node inspect.mjs iss_internal.glb                      # liste des modules et nombre de triangles
node extract.mjs iss_internal.glb iss-node2.glb Node2 1024
node extract.mjs iss_internal.glb iss-cupola.glb Cupola 2048
```

Modules utilisés : laboratoire Destiny (`iss-lab`), nœuds Unity, Harmony et Tranquility
(`iss-node1`, `iss-node2`, `iss-node3`), sas Quest (`iss-airlock`) et coupole (`iss-cupola`).
Dans la coupole, les caches de hublots (`Cupola_WC_*`) et les vitres sont masqués au chargement
(`buildNasaCupola`, dans `src/js/20-earth.js`).

## Équipage (MakeHuman, licence CC0)

`crew.py` construit les quatre équipiers (Lucas, Rafael, Aminata, Keiko) à partir des données
de MakeHuman, publiées sous licence CC0 :

- maillage de base : `makehuman/data/3dobjs/base.obj`
- squelette et poids : `makehuman/data/rigs/default.mhskel`, `default_weights.mhw`
- formes : `makehuman/data/targets/macrodetails/*.target` (et `macrodetails/height/`,
  `macrodetails/proportions/`)

Toutes ces données se trouvent dans le dépôt `makehumancommunity/makehuman` sur GitHub
(branche `master`). On les place dans un dossier, par exemple `mh/` : `base.obj`, les deux
fichiers du squelette, et les fichiers `.target` utiles copiés à plat dans `mh/targets/`
(par exemple `african-female-young.target`, `universal-male-young-maxmuscle-averageweight.target`,
`male-young-averagemuscle-averageweight-maxheight.target`). Puis :

```
python3 crew.py mh/ sortie/              # crew-<nom>.raw.glb pour chaque équipier
node optimize.mjs sortie/crew-lucas.raw.glb ../assets/models/crew-lucas.glb
```

Le script applique les formes (sexe, origine, musculature, taille), ajoute t-shirt, short,
chaussettes, cheveux et yeux, calcule un ombrage de creux dans les couleurs de sommets et
enregistre des points de repère (sternum, épaules, cuisses, visage...) utilisés par les
simulations. Les points de repère sont exprimés par rapport aux os : ils restent justes quand
`optimize.mjs` réordonne les sommets.

## Mannequin et gants

`manikin.py` produit `manikin.glb` : les gants bleus du sauveteur, en plusieurs poses.
