#!/usr/bin/env python3
"""Équipage AURA : personnages réalistes pour les simulations.

Chaque équipier est construit à partir du maillage de base de MakeHuman et de ses cibles
(« targets »), publiés sous licence CC0 par le projet MakeHuman. Le script applique les
cibles (sexe, origine, musculature, taille), ajoute un t-shirt, un short, des cheveux et des
yeux, calcule un ombrage de creux dans les couleurs de sommets, puis écrit un fichier glTF
binaire avec squelette et poids (un os par articulation utile).

Usage : python3 crew.py <dossier MakeHuman> <dossier de sortie>
Le dossier MakeHuman contient base.obj, default.mhskel, default_weights.mhw et targets/*.target
(adresses dans tools/README.md). Les fichiers produits sont ensuite compressés (meshopt).
"""
import json
import math
import os
import struct
import sys

import numpy as np
import scipy.sparse as sp
from scipy.spatial import cKDTree

SRC, OUT = sys.argv[1], sys.argv[2]
DM = 0.1  # MakeHuman travaille en décimètres

CREW = {
    'lucas': dict(race={'caucasian': 1.0}, gender=1.0, muscle=0.62, weight=0.5, height=0.52, proportions=0.8,
                  hair='short', hair_color=(0.20, 0.14, 0.09), iris=(0.32, 0.45, 0.55)),
    'rafael': dict(race={'caucasian': 0.55, 'african': 0.3, 'asian': 0.15}, gender=1.0, muscle=0.58, weight=0.42, height=0.5, proportions=0.75,
                   hair='short', hair_color=(0.05, 0.04, 0.035), iris=(0.22, 0.14, 0.08)),
    'aminata': dict(race={'african': 1.0}, gender=0.0, muscle=0.55, weight=0.45, height=0.53, proportions=0.8,
                    hair='bun', hair_color=(0.035, 0.03, 0.028), iris=(0.16, 0.10, 0.06)),
    'keiko': dict(race={'asian': 1.0}, gender=0.0, muscle=0.52, weight=0.4, height=0.58, proportions=0.75,
                  hair='bob', hair_color=(0.03, 0.03, 0.035), iris=(0.14, 0.09, 0.06)),
}


# ---------------------------------------------------------------- lecture des données MakeHuman
def load_obj(path):
    V, faces, cur = [], {}, None
    with open(path) as f:
        for line in f:
            if line.startswith('v '):
                V.append([float(x) for x in line.split()[1:4]])
            elif line.startswith('g '):
                cur = line.split()[1]
            elif line.startswith('f '):
                faces.setdefault(cur, []).append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
    return np.array(V), faces


TARGET_CACHE = {}


def load_target(name, n):
    if name in TARGET_CACHE:
        return TARGET_CACHE[name]
    d = np.zeros((n, 3))
    path = os.path.join(SRC, 'targets', name + '.target')
    with open(path) as f:
        for line in f:
            p = line.split()
            if len(p) == 4 and not line.startswith('#'):
                d[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    TARGET_CACHE[name] = d
    return d


def macro_deltas(cfg, n):
    """Somme pondérée des cibles « macro » de MakeHuman pour un adulte jeune."""
    g = cfg['gender']
    gw = {'female': 1 - g, 'male': g}
    D = np.zeros((n, 3))

    def add(name, w):
        nonlocal D
        if w > 1e-6:
            D = D + w * load_target(name, n)

    for race, rw in cfg['race'].items():
        for G, w in gw.items():
            add(f'{race}-{G}-young', rw * w)
    m, wt = cfg.get('muscle', 0.5), cfg.get('weight', 0.5)
    mw = {'averagemuscle': 1 - abs(m - 0.5) * 2, ('maxmuscle' if m > 0.5 else 'minmuscle'): abs(m - 0.5) * 2}
    ww = {'averageweight': 1 - abs(wt - 0.5) * 2, ('maxweight' if wt > 0.5 else 'minweight'): abs(wt - 0.5) * 2}
    for G, w in gw.items():
        for M, a in mw.items():
            for Wn, b in ww.items():
                if M == 'averagemuscle' and Wn == 'averageweight':
                    continue  # cible vide
                add(f'universal-{G}-young-{M}-{Wn}', w * a * b)
    h = cfg.get('height', 0.5)
    if abs(h - 0.5) > 1e-6:
        for G, w in gw.items():
            add(f'{G}-young-averagemuscle-averageweight-{"maxheight" if h > 0.5 else "minheight"}', w * abs(h - 0.5) * 2)
    p = cfg.get('proportions', 0.5)
    if p > 0.5:
        for G, w in gw.items():
            add(f'{G}-young-averagemuscle-averageweight-idealproportions', w * (p - 0.5) * 2)
    return D


# ---------------------------------------------------------------- géométrie
def tris_of(quads):
    t = []
    for f in quads:
        for k in range(1, len(f) - 1):
            t.append([f[0], f[k], f[k + 1]])
    return np.array(t, dtype=np.int64)


def vertex_normals(P, T):
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    N = np.zeros_like(P)
    for k in range(3):
        np.add.at(N, T[:, k], fn)
    ln = np.linalg.norm(N, axis=1, keepdims=True)
    return N / np.maximum(ln, 1e-12)


def adjacency(T, n):
    i = np.concatenate([T[:, 0], T[:, 1], T[:, 2], T[:, 1], T[:, 2], T[:, 0]])
    j = np.concatenate([T[:, 1], T[:, 2], T[:, 0], T[:, 0], T[:, 1], T[:, 2]])
    A = sp.coo_matrix((np.ones(len(i)), (i, j)), shape=(n, n)).tocsr()
    A.data[:] = 1.0
    deg = np.asarray(A.sum(1)).ravel()
    return A, np.maximum(deg, 1)


def smooth(P, A, deg, iters, mask=None):
    Q = P.copy()
    for _ in range(iters):
        S = (A @ Q) / deg[:, None]
        if mask is None:
            Q = S
        else:
            Q[mask] = S[mask]
    return Q


def taubin(P, A, deg, iters, mask=None, lam=0.5, mu=-0.53):
    """Lissage sans rétrécissement (Taubin) : enlève les petits reliefs, garde le volume."""
    Q = P.copy()
    for k in range(iters * 2):
        S = (A @ Q) / deg[:, None]
        step = (lam if k % 2 == 0 else mu) * (S - Q)
        if mask is None:
            Q = Q + step
        else:
            Q[mask] += step[mask]
    return Q


def boundary_vertices(T, n):
    """Sommets du bord d'une surface ouverte (arêtes portées par un seul triangle)."""
    e = np.sort(np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]), axis=1)
    u, c = np.unique(e, axis=0, return_counts=True)
    b = np.zeros(n, bool)
    b[u[c == 1].ravel()] = True
    return b


def clip(P, N, W, T, f):
    """Garde la partie f >= 0 d'un maillage triangulé ; les triangles coupés sont refaits
    exactement le long de la ligne f = 0 (ourlets nets)."""
    P, N, W = list(P), list(N), list(W)
    src = list(range(len(P)))
    cache = {}

    def cut(a, b):
        k = (min(a, b), max(a, b))
        if k not in cache:
            t = f[a] / (f[a] - f[b])
            P.append(P[a] + t * (P[b] - P[a]))
            n = N[a] + t * (N[b] - N[a])
            N.append(n / max(np.linalg.norm(n), 1e-9))
            W.append(W[a] + t * (W[b] - W[a]))
            src.append(a if t < 0.5 else b)
            cache[k] = len(P) - 1
        return cache[k]
    out = []
    for tri in T:
        ins = [f[v] >= 0 for v in tri]
        c = sum(ins)
        if c == 3:
            out.append(list(tri))
        elif c == 0:
            continue
        else:
            # rotation pour que le motif commence au bon sommet (ordre conservé)
            for r in range(3):
                a, b, cc = tri[r], tri[(r + 1) % 3], tri[(r + 2) % 3]
                ia, ib, ic = ins[r], ins[(r + 1) % 3], ins[(r + 2) % 3]
                if c == 1 and ia:
                    out.append([a, cut(a, b), cut(a, cc)])
                    break
                if c == 2 and ia and ib:
                    bc, ca = cut(b, cc), cut(cc, a)
                    out += [[a, b, bc], [a, bc, ca]]
                    break
    out = np.array(out, dtype=np.int64)
    used = np.unique(out)
    rm = -np.ones(len(P), np.int64)
    rm[used] = np.arange(len(used))
    return np.array(P)[used], np.array(N)[used], np.array(W)[used], rm[out], np.array(src)[used]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- écriture glTF binaire
class GLB:
    def __init__(self):
        self.bin = bytearray()
        self.views, self.accs = [], []

    def acc(self, arr, comp, typ, target=None, normalized=False, minmax=False):
        a = np.ascontiguousarray(arr)
        while len(self.bin) % 4:
            self.bin.append(0)
        off = len(self.bin)
        self.bin += a.tobytes()
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': a.nbytes}
        if target:
            v['target'] = target
        self.views.append(v)
        acc = {'bufferView': len(self.views) - 1, 'componentType': comp, 'count': int(a.shape[0]), 'type': typ}
        if normalized:
            acc['normalized'] = True
        if minmax:
            acc['min'] = [float(x) for x in a.min(0)]
            acc['max'] = [float(x) for x in a.max(0)]
        self.accs.append(acc)
        return len(self.accs) - 1

    def write(self, path, gltf):
        gltf['buffers'] = [{'byteLength': len(self.bin)}]
        gltf['bufferViews'] = self.views
        gltf['accessors'] = self.accs
        js = json.dumps(gltf, separators=(',', ':')).encode()
        js += b' ' * ((4 - len(js) % 4) % 4)
        bn = bytes(self.bin) + b'\0' * ((4 - len(self.bin) % 4) % 4)
        total = 12 + 8 + len(js) + 8 + len(bn)
        with open(path, 'wb') as f:
            f.write(struct.pack('<4sII', b'glTF', 2, total))
            f.write(struct.pack('<I4s', len(js), b'JSON') + js)
            f.write(struct.pack('<I4s', len(bn), b'BIN\0') + bn)


# ---------------------------------------------------------------- squelette réduit
KEEP_PREFIX = ('clavicle', 'shoulder01', 'upperarm01', 'upperarm02', 'lowerarm01', 'lowerarm02', 'wrist',
               'metacarpal', 'finger', 'pelvis', 'upperleg01', 'upperleg02', 'lowerleg01', 'lowerleg02', 'foot')
KEEP_NAMES = {'root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'neck02', 'neck03', 'head', 'jaw'}


def kept(b):
    return b in KEEP_NAMES or b.split('.')[0].startswith(KEEP_PREFIX)


def build(name, cfg, V0, faces, skel, wts):
    n = len(V0)
    V = V0 + macro_deltas(cfg, n)
    joints = {k: V[idx].mean(0) for k, idx in skel['joints'].items()}
    bones = skel['bones']
    head = {b: joints[d['head']] for b, d in bones.items()}
    tail = {b: joints[d['tail']] for b, d in bones.items()}
    # origine : 7 cm au-dessus du milieu des hanches (comme l'ancien mannequin)
    hip = (head['upperleg01.L'] + head['upperleg01.R']) / 2
    origin = hip + np.array([0, 0.7, 0])
    P = (V - origin) * DM
    H = {b: (h - origin) * DM for b, h in head.items()}
    Tl = {b: (t - origin) * DM for b, t in tail.items()}

    # ordre des os gardés (parents d'abord)
    children = {}
    for b, d in bones.items():
        children.setdefault(d['parent'], []).append(b)
    order = []

    def walk(b):
        if kept(b):
            order.append(b)
        for c in sorted(children.get(b, [])):
            walk(c)
    walk('root')
    bidx = {b: i for i, b in enumerate(order)}

    def kept_ancestor(b):
        while not kept(b):
            b = bones[b]['parent']
        return b
    parent = {b: (kept_ancestor(bones[b]['parent']) if bones[b]['parent'] else None) for b in order}

    # poids : les os retirés (visage, orteils, poitrine) passent à leur ancêtre gardé
    Wm = np.zeros((n, len(order)))
    for b, lst in wts.items():
        if b not in bones:
            continue
        t = bidx[kept_ancestor(b)]
        for vi, w in lst:
            Wm[vi, t] += w

    # ---------------- corps
    body_q = faces['body']
    T = tris_of(body_q)
    used = np.unique(T)
    remap = -np.ones(n, np.int64)
    remap[used] = np.arange(len(used))
    Tb = remap[T]
    Pb = P[used]
    Nb = vertex_normals(Pb, Tb)
    A, deg = adjacency(Tb, len(Pb))
    Wb = Wm[used]

    # creux : différence entre la surface et sa version lissée, à deux échelles
    def cavity(iters):
        S = smooth(Pb, A, deg, iters)
        return np.einsum('ij,ij->i', S - Pb, Nb)
    c1, c2 = cavity(6), cavity(40)
    ao = 1 - 0.28 * smoothstep(0.0004, 0.004, c1) - 0.32 * smoothstep(0.002, 0.02, c2)

    # repères du visage (en mètres, repère du corps)
    eyes = {}
    for side in ('l', 'r'):
        q = faces['helper-%s-eye' % side]
        vi = np.unique(np.array(q).ravel())
        c = P[vi].mean(0)
        eyes[side] = (vi, c, np.linalg.norm(P[vi] - c, axis=1).mean())
    eye_c = (eyes['l'][1] + eyes['r'][1]) / 2
    x, y, z = Pb[:, 0], Pb[:, 1], Pb[:, 2]
    w_head = Wb[:, bidx['head']] + Wb[:, bidx['jaw']]
    front = (z > eye_c[2] - 0.035) & (w_head > 0.5)

    col = np.ones((len(Pb), 3)) * ao[:, None]
    # sourcils : deux arcs au-dessus des yeux
    brow = np.zeros(len(Pb))
    for s in (-1, 1):
        ex = eyes['l' if s > 0 else 'r'][1]
        u = (x - ex[0]) * s  # vers l'extérieur
        yc = ex[1] + 0.024 + 0.006 * np.cos(np.clip(u / 0.03, -1.6, 1.6)) - 0.004 * smoothstep(0.0, 0.028, u)
        thick = 0.0055 - 0.0025 * smoothstep(0.0, 0.03, u)
        inside = smoothstep(-0.022, -0.012, u) * (1 - smoothstep(0.026, 0.034, u))
        brow = np.maximum(brow, inside * (1 - smoothstep(thick * 0.6, thick * 1.4, np.abs(y - yc))) * front)
    hc = np.array(cfg['hair_color'])
    col = col * (1 - brow[:, None] * 0.8) + brow[:, None] * 0.8 * (hc / 0.45)[None, :] * ao[:, None]
    # lèvres : un peu plus rouges et plus sombres
    teeth = np.unique(np.array(faces['helper-upper-teeth'] + faces['helper-lower-teeth']).ravel())
    tc = P[teeth].mean(0)
    lip = np.exp(-(((x - tc[0]) / 0.024) ** 2 + ((y - (tc[1] + 0.001)) / 0.0105) ** 2)) * (z > tc[2] - 0.005) * front
    lip = smoothstep(0.35, 0.75, lip)
    col *= 1 - lip[:, None] * np.array([0.12, 0.38, 0.34])[None, :]
    # joues légèrement rosées
    for s in (-1, 1):
        ck = np.exp(-(((x - s * 0.042) / 0.022) ** 2 + ((y - (eye_c[1] - 0.035)) / 0.02) ** 2)) * front
        col *= 1 - ck[:, None] * np.array([0.0, 0.07, 0.06])[None, :]
    # ligne de cils : le bord des paupières, juste devant l'œil, est assombri
    for side in ('l', 'r'):
        vi, c, r = eyes[side]
        dd = np.linalg.norm(Pb - c, axis=1)
        rim = (1 - smoothstep(r * 1.02, r * 1.22, dd)) * (z > c[2] + r * 0.25)
        col *= 1 - rim[:, None] * 0.55
    col = np.clip(col, 0, 1)

    # ---------------- vêtements (surfaces décalées du corps, mêmes poids)
    def wsum(names):
        return sum(Wb[:, bidx[b]] for b in names if b in bidx)
    torso_b = ['spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'clavicle.L', 'clavicle.R', 'shoulder01.L', 'shoulder01.R']
    arm_b = ['upperarm01.L', 'upperarm01.R', 'upperarm02.L', 'upperarm02.R']
    neck_w = wsum(['neck01', 'neck02', 'neck03', 'head', 'jaw'])
    hip_y = (H['upperleg01.L'][1] + H['upperleg01.R'][1]) / 2
    neck_base = H['neck01']

    def along(p, a, b):
        d = b - a
        return ((p - a) @ d) / (d @ d)
    t_arm = np.maximum(np.where(x < 0, along(Pb, H['upperarm01.R'], H['lowerarm01.R']), 0),
                       np.where(x > 0, along(Pb, H['upperarm01.L'], H['lowerarm01.L']), 0))
    armw = wsum(arm_b)
    torso_w = wsum(torso_b)
    # col rond : plus bas devant
    fz = np.clip((z - neck_base[2]) / 0.06, -1, 1)
    collar_y = neck_base[1] - 0.012 - 0.03 * np.maximum(fz, 0) + 0.008 * np.maximum(-fz, 0)
    shirt = ((torso_w + armw) > 0.45) & (neck_w < 0.3) & (y < collar_y) & (y > hip_y + 0.035)
    shirt &= ~((armw > 0.5) & (t_arm > 0.48))
    def along_side(p, key_a, key_b):
        return np.where(p[:, 0] < 0, along(p, H[key_a + '.R'], H[key_b + '.R']), along(p, H[key_a + '.L'], H[key_b + '.L']))
    t_leg = along_side(Pb, 'upperleg01', 'lowerleg01')
    legw = wsum(['upperleg01.L', 'upperleg01.R', 'upperleg02.L', 'upperleg02.R'])
    arm_len = np.linalg.norm(H['lowerarm01.R'] - H['upperarm01.R'])
    leg_len = np.linalg.norm(H['lowerleg01.R'] - H['upperleg01.R'])
    t_arm2 = along_side(Pb, 'upperarm01', 'lowerarm01')
    forew = wsum(['lowerarm01.L', 'lowerarm01.R', 'lowerarm02.L', 'lowerarm02.R', 'wrist.L', 'wrist.R'])
    # champs : positifs là où le vêtement existe
    handw = wsum([b for b in order if b.split('.')[0] in ('wrist', 'metacarpal1', 'metacarpal2', 'metacarpal3', 'metacarpal4') or b.startswith('finger')])
    f_shirt = np.minimum.reduce([
        (0.25 - handw) * 0.2,
        y - (hip_y + 0.03),
        collar_y - y,
        np.where(armw + forew > 0.3, (0.5 - t_arm2) * arm_len, 1.0),
        (0.35 - forew) * 0.2,
        (0.3 - neck_w) * 0.2,
        (0.4 - legw) * 0.2,
    ])
    waist_y = hip_y + 0.105
    footw = wsum(['foot.L', 'foot.R'])
    lowlegw = wsum(['lowerleg01.L', 'lowerleg01.R', 'lowerleg02.L', 'lowerleg02.R'])
    f_shorts = np.minimum.reduce([
        (0.25 - handw) * 0.2,
        waist_y - y,
        np.where(legw + lowlegw > 0.3, (0.44 - t_leg) * leg_len, 1.0),
        (0.3 - armw - forew) * 0.2,
        (0.3 - lowlegw) * 0.2,
    ])
    ank_y = (H['foot.L'][1] + H['foot.R'][1]) / 2
    f_socks = np.minimum((ank_y + 0.065) - y, (footw + lowlegw - 0.3) * 0.2)

    KD = cKDTree(Pb)

    def garment(field, off, extra=None, iters=10, drape=0):
        """Surface de tissu : la forme du corps sans ses petits reliefs (lissée), décalée vers
        l'extérieur, découpée proprement le long de la ligne field = 0."""
        G0, N0, W0, Tg, srcv = clip(Pb, Nb, Wb, Tb, field)
        o = np.full(len(G0), off)
        if extra is not None:
            o = o + extra[srcv]
        Ag, dg = adjacency(Tg, len(G0))
        bd = boundary_vertices(Tg, len(G0))
        base = taubin(G0, Ag, dg, drape, mask=~bd) if drape else G0
        Nbase = vertex_normals(base, Tg)
        G = base + Nbase * o[:, None]
        G = taubin(G, Ag, dg, iters, mask=~bd)
        # jamais à moins de 2,5 mm de la peau la plus proche (aisselles, entrejambe, poitrine)
        for _ in range(3):
            dist, j = KD.query(G, k=1)
            d = np.einsum('ij,ij->i', G - Pb[j], Nb[j])
            G += Nb[j] * np.maximum(0, 0.0025 - d)[:, None]
        # distance au bord (pour adoucir la lisière des cheveux)
        e = bd.astype(float)
        for _ in range(6):
            e = np.maximum(e, (Ag @ e) / dg * 0.82)
        return G, Tg, W0, srcv, 1 - e

    loose = 0.006 * smoothstep(-0.02, 0.1, Pb[:, 2]) * smoothstep(0.3, 0.6, torso_w) + 0.003 * smoothstep(0.3, 0.6, torso_w)  # le tissu flotte un peu devant le ventre
    over = 0.006 * smoothstep(waist_y + 0.04, waist_y - 0.005, y)  # le t-shirt passe par-dessus le short
    garments = {
        'shirt': garment(f_shirt, 0.0075, loose + over, 10, drape=45),
        'shorts': garment(f_shorts, 0.0065, 0.005 * smoothstep(0.02, 0.12, waist_y - y), 6, drape=22),
        'socks': garment(f_socks, 0.0032, None, 6, drape=25),
    }
    # bords côtelés : un petit boudin de tissu suit le col, le bas des manches et le bas du short.
    # Il cache la ligne de coupe et donne l'aspect d'un vrai t-shirt.
    def with_ribs(gar, pick, r, lift, K=7):
        G, Tg, Wg, srcv, inner = gar
        Ng = vertex_normals(G, Tg)
        V_, T_, W_, S_ = [G], [Tg], [Wg], [srcv]
        n0 = len(G)
        loops = boundary_loops(Tg)
        if os.environ.get("RIBDBG"): print("  boucles", sorted(len(l) for l in loops), "gardées", [len(l) for l in pick(loops)])
        for loop in pick(loops):
            L = G[loop].copy()
            m = len(loop)
            for _ in range(10):
                L = 0.5 * L + 0.25 * (np.roll(L, 1, 0) + np.roll(L, -1, 0))
            tn = np.roll(L, -1, 0) - np.roll(L, 1, 0)
            tn /= np.linalg.norm(tn, axis=1, keepdims=True) + 1e-12
            nr = Ng[loop] - tn * np.einsum('ij,ij->i', Ng[loop], tn)[:, None]
            nr /= np.linalg.norm(nr, axis=1, keepdims=True) + 1e-12
            bn = np.cross(tn, nr)
            C = L + nr * lift
            th = np.linspace(0, 2 * np.pi, K, endpoint=False)
            ring = C[:, None, :] + r * (np.cos(th)[None, :, None] * nr[:, None, :] + np.sin(th)[None, :, None] * bn[:, None, :])
            ring = ring.reshape(-1, 3)
            tri = []
            for i in range(m):
                j = (i + 1) % m
                for k in range(K):
                    k2 = (k + 1) % K
                    a, b, c, d = i * K + k, j * K + k, j * K + k2, i * K + k2
                    tri += [[a, b, c], [a, c, d]]
            tri = np.array(tri)
            # orientation : les faces doivent regarder vers l'extérieur du boudin
            fn = np.cross(ring[tri[:, 1]] - ring[tri[:, 0]], ring[tri[:, 2]] - ring[tri[:, 0]])
            out = ring[tri].mean(1) - np.repeat(C, 2 * K, 0)
            if np.einsum('ij,ij->i', fn, out).mean() < 0:
                tri = tri[:, [0, 2, 1]]
            V_.append(ring)
            T_.append(tri + n0)
            W_.append(np.repeat(Wg[loop], K, 0))
            S_.append(np.repeat(srcv[loop], K))
            n0 += len(ring)
        G2 = np.vstack(V_)
        return G2, np.vstack(T_), np.vstack(W_), np.concatenate(S_), np.concatenate([inner, np.ones(len(G2) - len(G))])

    def boundary_loops(T):
        e = np.sort(np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]), axis=1)
        u, c = np.unique(e, axis=0, return_counts=True)
        nb = {}
        for a, b in u[c == 1]:
            nb.setdefault(int(a), []).append(int(b))
            nb.setdefault(int(b), []).append(int(a))
        seen, loops = set(), []
        for s in nb:
            if s in seen:
                continue
            loop, prev, cur = [s], None, s
            seen.add(s)
            while True:
                nxt = [v for v in nb[cur] if v != prev and v not in seen]
                if not nxt:
                    break
                prev, cur = cur, nxt[0]
                loop.append(cur)
                seen.add(cur)
            # on ne garde que les boucles fermées et assez longues
            if len(loop) >= 12 and s in nb[cur]:
                loops.append(np.array(loop))
        return loops

    def by(key, count, reverse=True):
        def pick(loops):
            return sorted(loops, key=key, reverse=reverse)[:count]
        return pick
    sh = garments['shirt']
    garments['shirt'] = with_ribs(sh, by(lambda l: sh[0][l, 1].mean(), 1), 0.0042, 0.0018)
    sh = garments['shirt']
    garments['shirt'] = with_ribs(sh, by(lambda l: np.abs(sh[0][l, 0]).mean(), 2), 0.0034, 0.0012)
    so = garments['shorts']
    garments['shorts'] = with_ribs(so, by(lambda l: -so[0][l, 1].mean(), 2), 0.0032, 0.0012)

    # ---------------- cheveux
    ey = eye_c[1]
    hcen = np.array([0, ey + 0.02, eye_c[2] - 0.075])
    th = np.arctan2(x - hcen[0], z - hcen[2])
    a = np.abs(th)
    style = cfg['hair']
    # hauteur de la lisière des cheveux selon l'angle autour de la tête (0 : front)
    if style == 'short':
        ks = [(0, 0.066), (0.55, 0.06), (1.0, 0.047), (1.35, 0.032), (1.75, 0.022), (2.3, -0.02), (math.pi, -0.045)]
    elif style == 'bob':
        ks = [(0, 0.062), (0.55, 0.055), (1.0, 0.04), (1.35, 0.022), (1.75, 0.0), (2.3, -0.06), (math.pi, -0.075)]
    else:
        ks = [(0, 0.064), (0.55, 0.058), (1.0, 0.044), (1.35, 0.028), (1.75, 0.02), (2.3, -0.025), (math.pi, -0.05)]
    hl = np.interp(a, [k[0] for k in ks], [k[1] for k in ks]) + ey
    # oreilles : centre de chaque oreille, mesuré sur le maillage (sommets les plus écartés à hauteur des yeux)
    f_ear = np.ones(len(Pb))
    for sgn in (-1, 1):
        band = (np.abs(y - (ey - 0.012)) < 0.03) & (w_head > 0.5) & (sgn * x > 0)
        ib = np.where(band)[0]
        tip = Pb[ib[np.argmax(sgn * x[ib])]]
        ec = np.array([tip[0] - sgn * 0.012, ey - 0.012, tip[2]])
        f_ear = np.minimum(f_ear, np.linalg.norm((Pb - ec) / np.array([1.0, 0.85, 1.0]), axis=1) - 0.04)
    f_hair = np.minimum.reduce([y - hl, f_ear, (w_head - 0.4) * 0.2])
    vol = {'short': 0.0042, 'bob': 0.01, 'bun': 0.007}[style]
    hextra = vol * smoothstep(0.0, 0.016, y - hl) + 0.004 * smoothstep(0.0, 0.03, f_ear) * 0
    garments['hair'] = garment(f_hair, 0.0012, hextra, 6, drape=4)

    meshes = {}
    meshes['body'] = (np.arange(len(Pb)), Pb, Tb, Nb, Wb, col, None)
    for k, (G, Tg, Wg, srcv, inner) in garments.items():
        Ng = vertex_normals(G, Tg)
        C = np.repeat(inner[:, None], 3, 1) if k == 'hair' else None
        meshes[k] = (srcv, G, Tg, Ng, Wg, C, None)

    # chignon (ou volume de la coupe au carré) : ellipsoïde accroché à la tête
    if style in ('bun', 'bob'):
        u, v = np.meshgrid(np.linspace(0, math.pi, 14), np.linspace(0, 2 * math.pi, 24, endpoint=False))
        S = np.stack([np.sin(u) * np.cos(v), np.cos(u), np.sin(u) * np.sin(v)], -1).reshape(-1, 3)
        if style == 'bun':
            rad = np.array([0.036, 0.034, 0.03])
            cen = hcen + np.array([0, 0.035, -0.088])
        else:
            rad = np.array([0.083, 0.07, 0.088])
            cen = hcen + np.array([0, 0.004, -0.004])
        G = cen + S * rad
        if style == 'bob':
            # coupe au carré : on ne garde que la coque sous le crâne, derrière et sur les côtés
            pass
        nu, nv = 14, 24
        tri = []
        for j in range(nv):
            for i in range(nu - 1):
                a0 = j * nu + i
                b0 = ((j + 1) % nv) * nu + i
                tri += [[a0, b0, a0 + 1], [a0 + 1, b0, b0 + 1]]
        Tg = np.array(tri)
        if style == 'bob':
            keep_v = (G[:, 1] < hcen[1] + 0.02) & (G[:, 1] > hcen[1] - 0.075) & ((G[:, 2] - hcen[2]) < 0.035)
            Tg = Tg[keep_v[Tg].all(1)]
        Ng = vertex_normals(G, Tg)
        hb = bidx['head']
        Wg = np.zeros((len(G), len(order)))
        Wg[:, hb] = 1
        meshes['hairbun'] = (None, G, Tg, Ng, Wg, None, None)

    # yeux (sphères de MakeHuman) avec coordonnées de texture pour l'iris
    ev, eg, et, euv = [], [], [], []
    for side in ('l', 'r'):
        vi, c, r = eyes[side]
        q = faces['helper-%s-eye' % side]
        tri = tris_of(q)
        rm = {v: i + len(ev) for i, v in enumerate(vi)}
        for v in vi:
            ev.append(v)
            d = (P[v] - c) / r
            euv.append([0.5 + d[0] * 0.5, 0.5 - d[1] * 0.5])
        et += [[rm[a], rm[b], rm[cc]] for a, b, cc in tri]
    ev = np.array(ev)
    G = P[ev]
    Te = np.array(et)
    Ne = vertex_normals(G, Te)
    if (Ne[:, 2] * np.sign(G[:, 2] - G[:, 2].mean())).mean() < 0:
        Te = Te[:, [0, 2, 1]]
        Ne = -Ne
    We = np.zeros((len(ev), len(order)))
    We[:, bidx['head']] = 1
    meshes['eyes'] = (ev, G, Te, Ne, We, None, np.array(euv))

    # cils : on garde la géométrie de MakeHuman hors du fichier (trop épaisse), voir la ligne de cils
    lv, lt = [], []
    faces = {k: v for k, v in faces.items() if 'eyelashes' not in k}
    for g, q in faces.items():
        if 'eyelashes' in g:
            tri = tris_of(q)
            vi = np.unique(tri)
            rm = {v: i + len(lv) for i, v in enumerate(vi)}
            lv += list(vi)
            lt += [[rm[a], rm[b], rm[c]] for a, b, c in tri]
    if lv:
        lv = np.array(lv)
        G = P[lv]
        Tl_ = np.array(lt)
        meshes['lashes'] = (lv, G, Tl_, vertex_normals(G, Tl_), Wm[lv], None, None)

    # ---------------- repères (sommet, décalage le long de la normale)
    def surf(pred, score):
        idx = np.where(pred)[0]
        return int(idx[np.argmax(score[idx])])
    br_y = (H['breast.L'][1] + H['breast.R'][1]) / 2 if 'breast.L' in H else H['spine02'][1] + 0.12
    notch = (H['clavicle.L'] + H['clavicle.R']) / 2
    st_y = br_y - 0.01
    A_ = {}
    A_['sternum'] = (surf((np.abs(x) < 0.012) & (np.abs(y - st_y) < 0.015) & (torso_w > 0.5), z), 0.0)
    A_['chest'] = (surf((np.abs(x) < 0.012) & (np.abs(y - st_y - 0.03) < 0.015) & (torso_w > 0.5), z), 0.0)
    A_['padR'] = (surf((np.abs(x + 0.065) < 0.012) & (np.abs(y - (notch[1] - 0.06)) < 0.015) & (torso_w > 0.5), z), 0.0)
    A_['padL'] = (surf((np.abs(y - (st_y - 0.05)) < 0.015) & (torso_w > 0.5) & (z > notch[2] - 0.02) & (z < notch[2] + 0.07), x), 0.0)
    A_['belly'] = (surf((np.abs(x) < 0.012) & (np.abs(y - (H['spine03'][1] + 0.03)) < 0.015) & (torso_w > 0.3), z), 0.0)
    A_['back'] = (surf((np.abs(x) < 0.015) & (np.abs(y - (notch[1] - 0.09)) < 0.015) & (torso_w > 0.5), -z), 0.0)
    A_['throat'] = (surf((np.abs(x) < 0.01) & (np.abs(y - (neck_base[1] + 0.035)) < 0.012) & (neck_w > 0.4), z), 0.0)
    A_['nose'] = (surf((np.abs(x) < 0.006) & (np.abs(y - (eye_c[1] - 0.03)) < 0.015) & front, z), 0.0)
    A_['mouth'] = (surf((np.abs(x) < 0.006) & (np.abs(y - tc[1]) < 0.01) & front, z), 0.0)
    A_['face'] = (surf((np.abs(x) < 0.006) & (np.abs(y - (eye_c[1] - 0.012)) < 0.008) & front, z), 0.0)
    A_['head'] = (surf((np.abs(x) < 0.01) & (w_head > 0.5), y), -0.1)
    for s, S_ in (('R', -1), ('L', 1)):
        sh = H['upperarm01.' + s]
        A_['shoulder' + s] = (surf((np.linalg.norm(Pb - sh, axis=1) < 0.12) & (S_ * x > 0), (Pb - sh) @ np.array([S_ * 0.7, 0.55, 0.45])), 0.0)
        A_['flank' + s] = (surf((np.abs(y - (H['spine03'][1] + 0.01)) < 0.015) & (torso_w > 0.4) & (S_ * x > 0), Pb @ np.array([S_ * 0.8, 0, -0.6])), 0.0)
        tl = (t_leg > 0.4) & (t_leg < 0.5) & (legw > 0.6) & (S_ * x > 0)
        A_['thigh' + s] = (surf(tl, Pb @ np.array([S_ * 0.55, 0, 0.83])), 0.0)
        la, wr = H['lowerarm01.' + s], H['wrist.' + s]
        tf = along(Pb, la, wr)
        fw = wsum(['lowerarm01.' + s, 'lowerarm02.' + s])
        A_['forearm' + s] = (surf((tf > 0.45) & (tf < 0.55) & (fw > 0.6) & (S_ * x > 0), Pb @ np.array([S_ * 0.3, 0.75, 0.6])), 0.0)
        A_['elbow' + s] = (surf((np.linalg.norm(Pb - la, axis=1) < 0.04) & (S_ * x > 0), -z), 0.0)
        hw = wsum(['wrist.' + s, 'metacarpal1.' + s, 'metacarpal2.' + s, 'metacarpal3.' + s, 'metacarpal4.' + s])
        hc_ = (H['metacarpal2.' + s] + Tl['metacarpal2.' + s]) / 2
        A_['hand' + s] = (surf((np.linalg.norm(Pb - hc_, axis=1) < 0.035) & (hw > 0.4), Pb @ np.array([S_ * 0.2, 0.9, 0.3])), 0.0)
        ua = along(Pb, H['upperarm01.' + s], H['lowerarm01.' + s])
        A_['arm' + s] = (surf((ua > 0.25) & (ua < 0.35) & (armw > 0.6) & (S_ * x > 0), Pb @ np.array([S_ * 1.0, 0, 0.3])), 0.0)
        kn = H['lowerleg01.' + s]
        A_['knee' + s] = (surf(np.linalg.norm(Pb - kn, axis=1) < 0.05, z), 0.0)
    A_['arm'] = A_['armL']
    A_['legs'] = A_['kneeR']
    anchors = {}
    for k, (vi, d) in A_.items():
        anchors[k] = {'v': vi, 'n': [round(float(t), 4) for t in Nb[vi]], 'd': d,
                      'b': order[int(np.argmax(Wb[vi]))].replace('.', '_'), 'p': [round(float(t), 4) for t in Pb[vi]]}
    for s, ek in (('R', 'r'), ('L', 'l')):
        c, r = eyes[ek][1], eyes[ek][2]
        anchors['eye' + s] = {'v': None, 'b': 'head', 'p': [round(float(t), 4) for t in c + np.array([0, 0, r])], 'n': [0, 0, 1], 'd': 0}

    extras = {
        'aura': 'crew', 'name': name,
        'anchors': anchors,
        'deform': {
            'sternum': [round(float(t), 4) for t in Pb[A_['sternum'][0]]],
            'mouth': [round(float(t), 4) for t in Pb[A_['mouth'][0]]],
            'chestY': round(float(st_y + 0.02), 4), 'spineZ': round(float(H['spine02'][2]), 4)
        },
        'eyeRadius': round(float(eyes['l'][2]), 4),
        'hair': cfg['hair'], 'hairColor': cfg['hair_color'], 'iris': cfg['iris'],
        'height': round(float(P[:, 1].max() - P[:, 1].min()), 3),
        'source': 'MakeHuman 1.x base mesh, targets and default skeleton (CC0)'
    }

    # ---------------- écriture
    g = GLB()
    nodes = []
    for b in order:
        p = parent[b]
        t = H[b] - (H[p] if p else 0)
        nodes.append({'name': b.replace('.', '_'), 'translation': [float(v) for v in t]})
    for b in order:
        ch = [bidx[c] for c in order if parent[c] == b]
        if ch:
            nodes[bidx[b]]['children'] = ch
    ibm = np.zeros((len(order), 16), np.float32)
    for i, b in enumerate(order):
        m = np.eye(4, dtype=np.float32)
        m[:3, 3] = -H[b]
        ibm[i] = m.T.ravel()
    ibm_acc = g.acc(ibm, 5126, 'MAT4')
    mats = []
    MAT = {
        'body': {'baseColorFactor': [0.8, 0.6, 0.5, 1], 'metallicFactor': 0, 'roughnessFactor': 0.55},
        'shirt': {'baseColorFactor': [0.14, 0.2, 0.36, 1], 'metallicFactor': 0, 'roughnessFactor': 0.9},
        'shorts': {'baseColorFactor': [0.2, 0.21, 0.24, 1], 'metallicFactor': 0, 'roughnessFactor': 0.92},
        'socks': {'baseColorFactor': [0.12, 0.12, 0.13, 1], 'metallicFactor': 0, 'roughnessFactor': 0.95},
        'hair': {'baseColorFactor': list(cfg['hair_color']) + [1], 'metallicFactor': 0, 'roughnessFactor': 0.6},
        'hairbun': {'baseColorFactor': list(cfg['hair_color']) + [1], 'metallicFactor': 0, 'roughnessFactor': 0.6},
        'eyes': {'baseColorFactor': [0.9, 0.9, 0.9, 1], 'metallicFactor': 0, 'roughnessFactor': 0.15},
        'lashes': {'baseColorFactor': [0.02, 0.02, 0.02, 1], 'metallicFactor': 0, 'roughnessFactor': 0.8},
    }
    gl_meshes, mesh_nodes = [], []
    for k, (vi, G, Tg, Ng, Wv, C, UV) in meshes.items():
        top = np.argsort(-Wv, axis=1)[:, :4]
        tw = np.take_along_axis(Wv, top, 1)
        s = tw.sum(1, keepdims=True)
        bad = s[:, 0] < 1e-6
        tw[bad] = [1, 0, 0, 0]
        top[bad] = bidx['spine02']
        tw = tw / tw.sum(1, keepdims=True)
        attrs = {
            'POSITION': g.acc(G.astype(np.float32), 5126, 'VEC3', 34962, minmax=True),
            'NORMAL': g.acc(Ng.astype(np.float32), 5126, 'VEC3', 34962),
            'JOINTS_0': g.acc(top.astype(np.uint8), 5121, 'VEC4', 34962),
            'WEIGHTS_0': g.acc(tw.astype(np.float32), 5126, 'VEC4', 34962),
        }
        if C is not None:
            attrs['COLOR_0'] = g.acc(C.astype(np.float32), 5126, 'VEC3', 34962)
        if UV is not None:
            attrs['TEXCOORD_0'] = g.acc(UV.astype(np.float32), 5126, 'VEC2', 34962)
        idx = g.acc(Tg.astype(np.uint16 if len(G) < 65535 else np.uint32).ravel(), 5123 if len(G) < 65535 else 5125, 'SCALAR', 34963)
        mats.append({'name': k, 'pbrMetallicRoughness': MAT[k], 'doubleSided': k in ('shirt', 'shorts', 'socks', 'hair')})
        gl_meshes.append({'name': k, 'primitives': [{'attributes': attrs, 'indices': idx, 'material': len(mats) - 1}]})
        nodes.append({'name': k, 'mesh': len(gl_meshes) - 1, 'skin': 0})
        mesh_nodes.append(len(nodes) - 1)
    gltf = {
        'asset': {'version': '2.0', 'generator': 'AURA crew.py (MakeHuman CC0)'},
        'scene': 0,
        'scenes': [{'name': name, 'nodes': [0] + mesh_nodes, 'extras': extras}],
        'nodes': nodes,
        'skins': [{'joints': list(range(len(order))), 'inverseBindMatrices': ibm_acc, 'skeleton': 0}],
        'meshes': gl_meshes,
        'materials': mats,
    }
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, 'crew-%s.raw.glb' % name)
    g.write(path, gltf)
    print(name, 'os', len(order), 'sommets', {k: len(m[1]) for k, m in meshes.items()}, 'taille', round(extras['height'], 3), 'm', path)


def main():
    V0, faces = load_obj(os.path.join(SRC, 'base.obj'))
    skel = json.load(open(os.path.join(SRC, 'default.mhskel')))
    wts = json.load(open(os.path.join(SRC, 'default_weights.mhw')))['weights']
    names = sys.argv[3:] or list(CREW)
    for k in names:
        build(k, CREW[k], V0, faces, skel, wts)


if __name__ == '__main__':
    main()
