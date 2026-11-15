#!/usr/bin/env bash
# Fabrique les films AURA de bout en bout : texte, voix, images, son, vignettes, publication.
# usage : KOKORO_DIR=/chemin/vers/kokoro ./make.sh [id ...]   (sans KOKORO_DIR, la voix déjà générée est gardée)
set -euo pipefail
cd "$(dirname "$0")"
node -e "import('./story.mjs').then(m => require('fs').writeFileSync('text.json', JSON.stringify(m.textJSON(), null, 1)))"
if [ -n "${KOKORO_DIR:-}" ]; then python3 tts.py "$@"; fi
IDS="$*"
if [ -z "$IDS" ]; then IDS=$(node -e "import('./story.mjs').then(m => console.log(m.ORDER.join(' ')))"); fi
for id in $IDS; do node film.mjs "$id"; python3 mix.py "$id"; done
node thumbs.mjs $IDS
node publish.mjs
