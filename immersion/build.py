#!/usr/bin/env python3
"""Assemble AURA Immersion (scènes 3D de détente et simulations médicales) dans immersion/dist/.

La plateforme l'intègre ensuite dans docs/immersion/ (voir plateforme/tools/build.py).
three.js est fourni dans lib/three (version 0.160.1, licence MIT) : rien n'est chargé depuis Internet."""
import glob, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'dist')

css = open(os.path.join(SRC, 'style.css'), encoding='utf-8').read()
body = open(os.path.join(SRC, 'body.html'), encoding='utf-8').read()
js_files = sorted(glob.glob(os.path.join(SRC, 'js', '*.js')))
js = '\n'.join(f'/* ---- {os.path.basename(f)} ---- */\n' + open(f, encoding='utf-8').read() for f in js_files)

# pas de tiret long ni moyen dans les textes
for bad in ('—', '–'):
    for name, text in (('css', css), ('body', body), ('js', js)):
        if bad in text:
            i = text.index(bad)
            sys.exit(f'tiret interdit dans {name}: ...{text[max(0, i - 60):i + 20]!r}')

# contrôle de syntaxe du module assemblé
with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, dir=ROOT) as f:
    f.write(js)
r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True)
os.remove(f.name)
if r.returncode:
    sys.exit('Erreur de syntaxe JS :\n' + r.stderr[:2000])

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)
for d in ('textures', 'fonts', 'img'):
    shutil.copytree(os.path.join(ROOT, 'assets', d), os.path.join(OUT, d))
shutil.copytree(os.path.join(ROOT, 'lib'), os.path.join(OUT, 'lib'))

head = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<title>AURA Immersion</title>\n'
        '<meta name="description" content="Réalité virtuelle de l\'équipage AURA : quatre scènes de détente et quatre simulations médicales.">\n')
importmap = '<script type="importmap">{"imports": {"three": "./lib/three/three.module.js", "three/addons/": "./lib/three/addons/"}}</script>'
page = (head + f'<style>\n{css}\n</style>\n' + importmap + '\n</head>\n<body>\n' + body +
        '\n<script type="module">\n' + js + '\n</script>\n</body>\n</html>\n')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page)
print(f'immersion : {len(js_files)} fichiers JS, page de {len(page) // 1024} Ko')
