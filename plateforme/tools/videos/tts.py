import json, os, re, sys, time
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
T = os.environ.get('KOKORO_DIR', 'kokoro') + '/'
k = Kokoro(T + 'kokoro-v1.0.onnx', T + 'voices-v1.0.bin')
SR = 24000
GAP = 0.38
vids = json.load(open('scripts.json'))
only = sys.argv[1:]
for v in vids:
    if only and v['id'] not in only: continue
    d = f"audio/{v['id']}"; os.makedirs(d, exist_ok=True)
    for i, say in enumerate(v['scenes']):
        out = f'{d}/s{i:02d}.wav'; meta = f'{d}/s{i:02d}.json'
        if os.path.exists(out) and os.path.exists(meta):
            if json.load(open(meta)).get('say') == say: continue
        sents = [x.strip() for x in re.split(r'(?<=[.!?])\s+', say) if x.strip()]
        parts, cues, t = [], [], 0.0
        for j, sent in enumerate(sents):
            a, sr = k.create(sent, voice='ff_siwis', speed=0.8, lang='fr-fr')
            # retire le silence de début et de fin
            nz = np.where(np.abs(a) > 0.004)[0]
            if len(nz): a = a[max(0, nz[0] - 240): min(len(a), nz[-1] + 1200)]
            cues.append({'t0': round(t, 3), 't1': round(t + len(a) / SR, 3), 'text': sent})
            parts.append(a); t += len(a) / SR
            if j < len(sents) - 1:
                parts.append(np.zeros(int(GAP * SR), dtype=np.float32)); t += GAP
        audio = np.concatenate(parts).astype(np.float32)
        sf.write(out, audio, SR)
        json.dump({'say': say, 'dur': round(len(audio) / SR, 3), 'cues': cues}, open(meta, 'w'), ensure_ascii=False)
        print(v['id'], i, round(len(audio) / SR, 1), 's', flush=True)
print('TTS terminé')
