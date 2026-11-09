#!/usr/bin/env python3
"""Assemble la plateforme AURA dans docs/ (le dossier publié par GitHub Pages).

Étapes : contrôles (tirets, syntaxe), construction de l'immersion, copie des sources,
puis index.html avec les scripts dans l'ordre de chargement."""
import os, re, shutil, subprocess, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # plateforme/
REPO = os.path.dirname(ROOT)
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(REPO, 'docs')
VR = os.path.join(REPO, 'immersion', 'dist')
ORDER = ['core/util.js', 'core/data.js', 'core/engine.js', 'core/pharma.js', 'kb/vocab.js', 'kb/fiches.js', 'kb/fiches-data.js', 'kb/triage.js',
         'core/gamify.js', 'core/store.js', 'core/kb.js', 'sophie/character.js', 'sophie/voice.js', 'sophie/llm.js', 'sophie/brain.js', 'lib/qrcode.js',
         'ui/shell.js', 'ui/crew.js', 'ui/conference.js', 'ui/videos.js', 'ui/immersive.js', 'ui/defis.js', 'ui/cmo.js', 'main.js']

# 1) contrôles : pas de tiret long ni moyen dans notre code et nos textes
bad = []
for dirpath, _, files in os.walk(SRC):
    for f in files:
        p = os.path.join(dirpath, f)
        if f.endswith(('.js', '.css', '.html', '.webmanifest')) and not p.endswith(('qrcode.js', 'fiches-data.js')):
            t = open(p, encoding='utf-8').read()
            for ch in ('—', '–'):
                if ch in t:
                    i = t.index(ch); bad.append(f'{os.path.relpath(p, SRC)}: ...{t[max(0, i-50):i+10]!r}')
if bad:
    sys.exit('Tirets interdits :\n' + '\n'.join(bad))
kbt = open(os.path.join(SRC, 'js', 'kb', 'fiches-data.js'), encoding='utf-8').read()
print('tirets dans les fiches (texte du document) :', kbt.count('—') + kbt.count('–'))
for f in ORDER:
    r = subprocess.run(['node', '--check', os.path.join(SRC, 'js', f)], capture_output=True, text=True)
    if r.returncode:
        sys.exit('Erreur de syntaxe dans ' + f + ' :\n' + r.stderr[:1500])

# 2) immersion (scènes 3D et simulations)
r = subprocess.run([sys.executable, os.path.join(REPO, 'immersion', 'build.py')], capture_output=True, text=True)
print(r.stdout.strip())
if r.returncode:
    sys.exit('Immersion :\n' + (r.stderr or r.stdout)[:2000])

# 3) assemblage
if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)
shutil.copytree(os.path.join(SRC, 'js'), os.path.join(OUT, 'js'))
shutil.copytree(os.path.join(SRC, 'css'), os.path.join(OUT, 'css'))
shutil.copytree(os.path.join(SRC, 'assets'), os.path.join(OUT, 'assets'))
shutil.copytree(os.path.join(SRC, 'fonts'), os.path.join(OUT, 'fonts'))
for f in ('sw.js', 'manifest.webmanifest'):
    shutil.copy(os.path.join(SRC, f), os.path.join(OUT, f))
shutil.copytree(VR, os.path.join(OUT, 'immersion'))
open(os.path.join(OUT, '.nojekyll'), 'w').close()
tags = '\n'.join(f'<script src="js/{f}"></script>' for f in ORDER)
html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read().replace('<!--SCRIPTS-->', tags)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs)
n = sum(len(fs) for _, _, fs in os.walk(OUT))
print(f'docs : {n} fichiers, {size/1e6:.1f} Mo')
