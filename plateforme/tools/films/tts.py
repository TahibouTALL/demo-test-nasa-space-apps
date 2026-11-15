# Voix des films : Kokoro (anglais), une piste par plan et le minutage de chaque phrase.
# usage : KOKORO_DIR=... python3 tts.py [id ...]
import json, os, sys, time
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

K = os.environ.get('KOKORO_DIR', 'kokoro')
VOICE = os.environ.get('VOICE', 'af_heart')
SPEED = float(os.environ.get('SPEED', '0.95'))
GAP = 0.32                      # silence entre deux phrases d'un même plan
k = Kokoro(os.path.join(K, 'kokoro-v1.0.onnx'), os.path.join(K, 'voices-v1.0.bin'))
data = json.load(open('text.json', encoding='utf-8'))
ids = sys.argv[1:] or data['order']
for fid in ids:
    film = data['text'][fid]
    os.makedirs(f'audio/{fid}', exist_ok=True)
    t0 = time.time(); total = 0
    for i, shot in enumerate(film['shots']):
        parts, cues, pos, sr = [], [], 0.0, 24000
        for j, (en, fr) in enumerate(shot):
            s, sr = k.create(en, voice=VOICE, speed=SPEED, lang='en-us')
            s = np.asarray(s, dtype=np.float32)
            # on retire les silences de bord pour un enchaînement net
            nz = np.where(np.abs(s) > 0.01)[0]
            if len(nz): s = s[max(0, nz[0] - 240): min(len(s), nz[-1] + 1200)]
            if j: parts.append(np.zeros(int(GAP * sr), np.float32)); pos += GAP
            cues.append({'start': round(pos, 3), 'end': round(pos + len(s) / sr, 3), 'en': en, 'fr': fr})
            parts.append(s); pos += len(s) / sr
        audio = np.concatenate(parts)
        sf.write(f'audio/{fid}/s{i:02d}.wav', audio, sr)
        json.dump({'dur': round(len(audio) / sr, 3), 'sr': sr, 'cues': cues}, open(f'audio/{fid}/s{i:02d}.json', 'w', encoding='utf-8'), ensure_ascii=False)
        total += len(audio) / sr
    print(f'{fid} : {total:.1f} s de voix, calcul {time.time() - t0:.0f} s', flush=True)
print('voix terminée', flush=True)
