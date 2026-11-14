# Vignettes des cartes (évasion et simulations) en WebP 960 x 540, depuis les rendus du studio
import os, sys
from PIL import Image, ImageEnhance
V = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(V, '..', '..', '..', 'immersion', 'assets', 'img')
EV = {'earth': 'stills/cupola_day', 'lacrose': 'thumbs/ev_lacrose', 'savane': 'thumbs/ev_savane', 'ocean': 'thumbs/ev_ocean',
      'lake': 'thumbs/ev_lake', 'aurore': 'thumbs/ev_aurore', 'desert': 'thumbs/ev_desert'}
SIMS = {'arret': 'stills/cpr_float', 'anaphylaxie': 'thumbs/sim_anaphylaxie', 'etouffement': 'thumbs/sim_etouffement',
        'incendie': 'stills/fire_smoke', 'depress': 'thumbs/sim_depress', 'ammoniac': 'stills/ammonia_haze',
        'decompression': 'stills/airlock_emu', 'calcul': 'stills/kidney_us', 'plaie': 'thumbs/sim_plaie',
        'brulure': 'thumbs/sim_brulure', 'oeil': 'stills/eye_exam', 'nez': 'thumbs/sim_nez'}
for folder, table in (('evasion', EV), ('sims', SIMS)):
    os.makedirs(os.path.join(IMG, folder), exist_ok=True)
    for key, src in table.items():
        f = os.path.join(V, src + '.jpg')
        if not os.path.exists(f):
            print('absent', key, src); continue
        im = Image.open(f).convert('RGB').resize((960, 540), Image.LANCZOS)
        im = ImageEnhance.Contrast(im).enhance(1.04)
        if key in ('desert', 'aurore'):   # scènes de nuit : un peu plus lisibles en petit
            im = Image.eval(im, lambda v: int(255 * (v / 255) ** 0.82))
        out = os.path.join(IMG, folder, key + '.webp')
        im.save(out, 'WEBP', quality=80, method=6)
        print(folder, key, os.path.getsize(out) // 1024, 'Ko')
