# Son des films : la voix (Kokoro), une musique douce générée ici, des bruitages discrets.
# Lit out/<id>.events.json (écrit par film.mjs), écrit out/<id>.wav puis out/<id>.mp4 (image + son).
# usage : python3 mix.py <id> [...]
import json, subprocess, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def place(buf, x, t, gain=1.0, pan=0.0):
    """ajoute un son mono x à l'instant t (s), avec un panoramique de -1 (gauche) à 1 (droite)"""
    i = int(round(t * SR))
    if i >= buf.shape[0] or i + len(x) <= 0:
        return
    a, b = max(0, i), min(buf.shape[0], i + len(x))
    seg = x[a - i:b - i] * gain
    buf[a:b, 0] += seg * np.sqrt(0.5 * (1 - pan))
    buf[a:b, 1] += seg * np.sqrt(0.5 * (1 + pan))


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)


def lp(x, f):
    return sosfilt(butter(2, f, btype='low', fs=SR, output='sos'), x)


def hp(x, f):
    return sosfilt(butter(2, f, btype='high', fs=SR, output='sos'), x)


# ---------------------------------------------------------------- instruments
def pluck(f, dur=0.9, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * env_exp(n, 0.32) + 0.28 * bright * np.sin(2 * np.pi * f * 3.93 * t) * env_exp(n, 0.045)
    x += 0.12 * np.sin(2 * np.pi * f * 2 * t) * env_exp(n, 0.12)
    att = np.minimum(1, np.arange(n) / (0.004 * SR))
    return x * att


def bass(f, dur=0.7):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return x * env_exp(n, 0.35) * np.minimum(1, np.arange(n) / (0.01 * SR))


def kick():
    n = int(0.3 * SR); t = np.arange(n) / SR
    f = 50 + 70 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.09)


def shaker():
    n = int(0.06 * SR)
    return hp(rng.standard_normal(n), 6000) * env_exp(n, 0.015)


def pad_chord(notes, dur, wide=0.003):
    n = int(dur * SR); t = np.arange(n) / SR
    L = np.zeros(n); Rr = np.zeros(n)
    for m in notes:
        f = hz(m)
        for d, side in ((1 - wide, 0), (1 + wide, 1)):
            w = np.sin(2 * np.pi * f * d * t + rng.random() * 6) + 0.3 * np.sin(2 * np.pi * 2 * f * d * t) + 0.12 * np.sin(2 * np.pi * 3 * f * d * t)
            (L if side == 0 else Rr)[:] += w
    a = np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 0.9).clip(0, 1)
    return lp(L * a, 2200) / len(notes), lp(Rr * a, 2200) / len(notes)


PROG = {
    'prevention': dict(bpm=100, chords=[[48, 55, 60, 64, 71], [45, 52, 57, 60, 67], [41, 48, 53, 57, 64], [43, 50, 55, 59, 62]], pat=[0, 2, 1, 3, 2, 4, 3, 1], eighths=True),
    'securite': dict(bpm=88, chords=[[45, 52, 57, 60, 64], [41, 48, 53, 57, 64], [48, 55, 60, 64, 67], [43, 50, 55, 59, 62]], pat=[0, 2, 3, 1], eighths=False),
}


def music(total, cat):
    P = PROG[cat]; beat = 60 / P['bpm']; bar = 4 * beat; chord_len = 2 * bar
    out = np.zeros((int((total + 2) * SR), 2))
    end_at = total - 5.0          # la carte de fin : un dernier accord qui résonne
    t = 0.0; k = 0
    while t < end_at:
        ch = P['chords'][k % 4]
        L, Rr = pad_chord([m for m in ch if m >= 52] + [ch[0] + 12], chord_len + 0.9)
        place(out, L, t, 0.55, -0.6); place(out, Rr, t, 0.55, 0.6)
        tones = [m + 12 for m in ch]
        step = beat / 2 if P['eighths'] else beat
        nsteps = int(round(chord_len / step))
        for s in range(nsteps):
            ts = t + s * step
            if ts >= end_at or (t < 2 * bar and s % 2):   # entrée plus légère
                continue
            m = tones[P['pat'][s % len(P['pat'])] % len(tones)]
            acc = 1.0 if s % (8 if P['eighths'] else 4) == 0 else 0.75
            place(out, pluck(hz(m), 0.9, 1.0 if cat == 'prevention' else 0.6), ts, 0.22 * acc, 0.35 if s % 2 else -0.35)
        for b in range(8):
            tb = t + b * beat
            if tb >= end_at or t < bar:
                continue
            if b % 2 == 0:
                place(out, bass(hz(ch[0] - 12 if ch[0] > 40 else ch[0])), tb, 0.42)
                place(out, kick(), tb, 0.32 if cat == 'prevention' else 0.22)
            if cat == 'prevention':
                place(out, shaker(), tb + beat / 2, 0.05, 0.4); place(out, shaker(), tb, 0.025, 0.4)
            else:
                place(out, bass(hz(ch[0] - 12)), tb + beat / 2, 0.16)
        t += chord_len; k += 1
    # accord final sur la carte de fin
    root = PROG[cat]['chords'][0]
    L, Rr = pad_chord([m for m in root if m >= 52] + [root[0] + 12], 5.5)
    place(out, L, end_at, 0.6, -0.6); place(out, Rr, end_at, 0.6, 0.6)
    for i, m in enumerate(root[1:4]):
        place(out, pluck(hz(m + 12), 2.0), end_at + 0.15 + i * 0.16, 0.2, -0.3 + i * 0.3)
    n = int(total * SR); out = out[:n]
    fade = np.ones(n); fo = int(2.5 * SR); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
    fi = int(0.6 * SR); fade[:fi] *= np.linspace(0, 1, fi)
    return out * fade[:, None]


# ---------------------------------------------------------------- bruitages
def sfx(k, ev):
    v = ev.get('v', 0)
    if k == 'pop':
        n = int(0.09 * SR); t = np.arange(n) / SR; f0 = 700 * 2 ** (v * 2 / 12)
        f = f0 * (1.35 - 0.35 * np.minimum(1, t / 0.05))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.03), 0.16
    if k == 'pop2':
        return (pluck(659, 0.5) + 0.7 * pluck(988, 0.5)) * 0.8, 0.2
    if k in ('whoosh', 'swoosh'):
        d = 0.45 if k == 'whoosh' else 0.7; n = int(d * SR); t = np.arange(n) / SR
        x = bp(rng.standard_normal(n), 400, 4000)
        e = np.sin(np.pi * t / d) ** 2
        return x * e * 0.5, 0.09 if k == 'whoosh' else 0.05
    if k == 'ding':
        n = int(1.2 * SR); t = np.arange(n) / SR; f = 1318.5
        x = np.sin(2 * np.pi * f * t) * env_exp(n, 0.5) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * env_exp(n, 0.18) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * env_exp(n, 0.07)
        return x, 0.1
    if k == 'warn':
        parts = []
        for f in (880, 660):
            n = int(0.13 * SR); t = np.arange(n) / SR
            parts.append((np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t)) * np.minimum(1, (n - np.arange(n)) / (0.02 * SR)) * np.minimum(1, np.arange(n) / (0.005 * SR)))
            parts.append(np.zeros(int(0.03 * SR)))
        return np.concatenate(parts), 0.12
    if k == 'type':
        d = ev.get('d', 0.6); out = np.zeros(int(d * SR) + 400)
        for i in range(int(d / 0.045)):
            c = hp(rng.standard_normal(240), 3000) * env_exp(240, 0.002)
            a = int(i * 0.045 * SR); out[a:a + 240] += c
        return out, 0.08
    if k == 'alarm':
        d = ev.get('d', 3); n = int(d * SR); t = np.arange(n) / SR
        on = ((t % 1.0) < 0.22) | (((t % 1.0) > 0.3) & ((t % 1.0) < 0.52))
        x = np.sin(2 * np.pi * 1250 * t) * on
        x = lp(x, 3000)
        return x, 0.035
    if k == 'heart':
        d = ev.get('d', 3); bpm = ev.get('bpm', 110); out = np.zeros(int(d * SR) + SR)
        per = 60 / bpm
        for i in range(int(d / per)):
            for off, g in ((0, 1.0), (0.14, 0.7)):
                n = int(0.16 * SR); t = np.arange(n) / SR
                th = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 85 * t)) * env_exp(n, 0.05) * g
                a = int((i * per + off) * SR); out[a:a + n] += th
        return out, 0.35
    if k == 'fire':
        d = ev.get('d', 3); n = int(d * SR)
        x = lp(rng.standard_normal(n), 400) * 0.6
        cr = (rng.random(n) > 0.9993).astype(float); x += hp(cr * rng.standard_normal(n) * 6, 2000)
        e = np.minimum(1, np.arange(n) / (0.8 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.5 * SR))
        return x * e, 0.08
    if k == 'tick':
        d = ev.get('d', 3); out = np.zeros(int(d * SR) + 400)
        for i in range(int(d / 0.5)):
            c = bp(rng.standard_normal(200), 2500, 6000) * env_exp(200, 0.0015)
            a = int(i * 0.5 * SR); out[a:a + 200] += c
        return out, 0.12
    if k == 'clunk':
        n = int(0.35 * SR); t = np.arange(n) / SR
        x = np.sin(2 * np.pi * 85 * t) * env_exp(n, 0.07) + 0.5 * bp(rng.standard_normal(n), 1500, 3500) * env_exp(n, 0.012)
        return x, 0.3
    if k == 'title':
        n = int(1.1 * SR); t = np.arange(n) / SR
        x = bp(rng.standard_normal(n), 800, 6000) * (t / 1.1) ** 2 * 0.25
        x[-int(0.15 * SR):] *= np.linspace(1, 0, int(0.15 * SR))
        return x, 0.12
    if k == 'chime':
        out = np.zeros(int(2.4 * SR))
        for i, m in enumerate((84, 88, 91)):
            p = pluck(hz(m), 1.8, 0.4); a = int(i * 0.14 * SR); out[a:a + len(p)] += p
        return out, 0.09
    return np.zeros(10), 0


def mix(fid):
    ev = json.load(open(f'out/{fid}.events.json', encoding='utf-8'))
    total = ev['total']; n = int(total * SR)
    voice = np.zeros((n, 2))
    for v in ev['voice']:
        x, sr = sf.read(v['file'], dtype='float32')
        if x.ndim > 1:
            x = x.mean(1)
        x = resample_poly(x, SR, sr)
        place(voice, x, v['t'], 0.95)
    mus = music(total, ev['cat'])
    fx = np.zeros((n, 2))
    for e in ev['sfx']:
        x, g = sfx(e['k'], e)
        pan = 0.3 if e['k'] in ('pop', 'pop2') else 0.0
        place(fx, x, e['t'], g, pan)
    # la musique (et l'alarme) baissent sous la voix
    lvl = np.abs(voice[:, 0]); win = int(0.03 * SR)
    rms = np.sqrt(np.convolve(lvl ** 2, np.ones(win) / win, mode='same'))
    target = (rms > 0.02).astype(float)
    duck = np.zeros(n); d = 0.0; att = 1 - np.exp(-1 / (0.06 * SR)); rel = 1 - np.exp(-1 / (0.5 * SR))
    for i in range(0, n, 32):
        tv = target[i]; d += (tv - d) * (att if tv > d else rel) * 32; d = min(1, max(0, d)); duck[i:i + 32] = d
    mg = (1 - 0.55 * duck)[:, None]
    out = voice + mus * 0.16 * mg + fx * (1 - 0.3 * duck)[:, None]
    out = np.tanh(out * 1.1) / 1.1
    pk = np.abs(out).max()
    if pk > 0.89:
        out *= 0.89 / pk
    sf.write(f'out/{fid}.wav', out.astype(np.float32), SR, subtype='PCM_16')
    # volume sonore homogène entre les films (deux passes de loudnorm), puis assemblage avec l'image
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f'out/{fid}.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    af = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    tmp = f'out/{fid}.part.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'out/{fid}.video.mp4', '-i', f'out/{fid}.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest', tmp], check=True)
    subprocess.run(['mv', tmp, f'out/{fid}.mp4'], check=True)
    print(f'{fid} : son mixé, {total:.1f} s', flush=True)


if __name__ == '__main__':
    for fid in sys.argv[1:]:
        mix(fid)
