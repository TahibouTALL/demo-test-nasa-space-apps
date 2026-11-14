#!/usr/bin/env python3
"""Mannequin d'entraînement médical d'AURA, produit par champs de distance (SDF).

Chaque segment (tronc, tête, bras, avant-bras, mains, cuisses, jambes, pieds) est calculé
dans son repère local, articulation à l'origine, puis maillé (marching cubes), lissé et
simplifié. Les vêtements (t-shirt et short d'équipage) sont des surfaces décalées de quelques
millimètres. Les gants bleus servent aux mains du sauveteur, en plusieurs poses.
Sortie : immersion/assets/models/manikin.glb (maillages nommés, sans texture)."""
import os, sys, json
import numpy as np
from skimage.measure import marching_cubes
import trimesh, fast_simplification

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'models', 'manikin.glb')
V = lambda *a: np.array(a, dtype=np.float64)

# ---------- primitives ----------
def ell(p, c, r):
    q = (p - c) / r
    k0 = np.linalg.norm(q, axis=1)
    k1 = np.linalg.norm(q / r, axis=1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)
def cap(p, a, b, ra, rb=None):
    rb = ra if rb is None else rb
    pa = p - a; ba = b - a
    h = np.clip((pa @ ba) / (ba @ ba), 0.0, 1.0)
    return np.linalg.norm(pa - np.outer(h, ba), axis=1) - (ra + (rb - ra) * h)
def rbox(p, c, half, r):
    q = np.abs(p - c) - (half - r)
    return np.linalg.norm(np.maximum(q, 0), axis=1) + np.minimum(np.max(q, axis=1), 0) - r
def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)
def ssub(a, b, k):  # a moins b, lissé
    return -smin(-a, b, k)
def U(*ds, k=0.02):
    d = ds[0]
    for x in ds[1:]: d = smin(d, x, k)
    return d

# ---------- segments (repère local : articulation à l'origine) ----------
def torso(p):
    d = ell(p, V(0, 0.0, -0.005), V(0.165, 0.115, 0.108))                      # bassin
    d = smin(d, ell(p, V(0, 0.17, 0.0), V(0.15, 0.13, 0.1)), 0.05)              # ventre
    d = smin(d, ell(p, V(0, 0.36, -0.005), V(0.168, 0.165, 0.113)), 0.06)       # cage thoracique
    d = smin(d, cap(p, V(-0.15, 0.47, -0.012), V(0.15, 0.47, -0.012), 0.062), 0.06)  # ceinture scapulaire
    for s in (-1, 1):
        d = smin(d, ell(p, V(s * 0.07, 0.405, 0.075), V(0.082, 0.062, 0.042)), 0.03)   # pectoraux
        d = smin(d, ell(p, V(s * 0.172, 0.478, -0.012), V(0.058, 0.052, 0.056)), 0.05)  # épaules
        d = smin(d, ell(p, V(s * 0.065, -0.035, -0.075), V(0.088, 0.1, 0.075)), 0.04)  # fessiers
        d = smin(d, ell(p, V(s * 0.09, 0.27, -0.06), V(0.07, 0.13, 0.05)), 0.04)       # dorsaux
    d = smin(d, cap(p, V(0, 0.48, -0.025), V(0, 0.585, -0.015), 0.085, 0.056), 0.05)    # trapèzes
    d = ssub(d, ell(p, V(0, 0.115, 0.098), V(0.008, 0.008, 0.008)), 0.006)      # nombril
    return d

def head(p):
    d = cap(p, V(0, -0.02, 0), V(0, 0.085, 0.012), 0.06, 0.055)                # cou
    d = smin(d, ell(p, V(0, 0.205, -0.012), V(0.079, 0.1, 0.098)), 0.04)        # crâne
    d = smin(d, ell(p, V(0, 0.162, 0.03), V(0.071, 0.082, 0.078)), 0.035)       # visage
    d = smin(d, ell(p, V(0, 0.128, 0.04), V(0.062, 0.046, 0.06)), 0.03)         # mâchoire
    d = smin(d, ell(p, V(0, 0.103, 0.068), V(0.03, 0.024, 0.026)), 0.025)       # menton
    for s in (-1, 1):
        d = smin(d, ell(p, V(s * 0.052, 0.17, 0.065), V(0.022, 0.02, 0.02)), 0.02)   # pommettes
        d = smin(d, ell(p, V(s * 0.079, 0.18, -0.008), V(0.012, 0.03, 0.021)), 0.008) # oreilles
        d = ssub(d, ell(p, V(s * 0.033, 0.193, 0.093), V(0.021, 0.013, 0.015)), 0.008) # orbites
        d = smin(d, ell(p, V(s * 0.033, 0.192, 0.087), V(0.016, 0.0095, 0.011)), 0.004) # paupières closes
    d = smin(d, cap(p, V(-0.046, 0.208, 0.087), V(0.046, 0.208, 0.087), 0.011), 0.02)   # arcade
    d = smin(d, cap(p, V(0, 0.195, 0.097), V(0, 0.155, 0.113), 0.009, 0.015), 0.012)   # nez
    for s in (-1, 1):
        d = smin(d, ell(p, V(s * 0.011, 0.152, 0.104), V(0.009, 0.007, 0.008)), 0.006) # ailes du nez
    d = smin(d, ell(p, V(0, 0.1315, 0.0965), V(0.022, 0.0055, 0.008)), 0.005)   # lèvre supérieure
    d = smin(d, ell(p, V(0, 0.1205, 0.0945), V(0.019, 0.0062, 0.008)), 0.005)   # lèvre inférieure
    d = ssub(d, cap(p, V(-0.019, 0.1262, 0.104), V(0.019, 0.1262, 0.104), 0.0018), 0.002)  # bouche
    return d

def upper_arm(p):
    d = cap(p, V(0, 0.01, 0), V(0, -0.29, 0), 0.053, 0.037)
    d = smin(d, ell(p, V(0, -0.12, 0.016), V(0.043, 0.09, 0.043)), 0.03)        # biceps
    d = smin(d, ell(p, V(0, -0.1, -0.018), V(0.04, 0.1, 0.04)), 0.03)           # triceps
    return d

def forearm(p):
    d = cap(p, V(0, 0.005, 0), V(0, -0.25, 0), 0.037, 0.025)
    d = smin(d, ell(p, V(0.006, -0.06, 0.004), V(0.043, 0.085, 0.036)), 0.03)
    d = smin(d, ell(p, V(0, -0.012, -0.022), V(0.022, 0.02, 0.02)), 0.015)      # coude
    return d

def hand(p, curl=0.35, thumb=0.3, spread=0.0, fist=False):
    """Main droite, paume vers +Z quand le bras pend (pouce vers +X)."""
    d = rbox(p, V(0, -0.052, 0), V(0.043, 0.05, 0.0145), 0.012)                 # paume
    d = smin(d, ell(p, V(0.0, -0.005, 0), V(0.028, 0.02, 0.016)), 0.015)        # poignet
    xs = [0.029, 0.01, -0.01, -0.029]
    lens = [0.075, 0.083, 0.078, 0.062]
    rads = [0.0095, 0.0098, 0.0093, 0.0085]
    for i, (x, L, r) in enumerate(zip(xs, lens, rads)):
        c = (0.95 if fist else curl)
        a = V(x * 1.0 + spread * (x * 0.6), -0.098, 0.0)
        segs = [0.42, 0.33, 0.25]
        ang = 0.0; pt = a
        prev = a
        for j, f in enumerate(segs):
            ang += c * (0.9 if j == 0 else 1.25)
            dirv = V(spread * x * 0.8, -np.cos(ang), np.sin(ang))
            nxt = prev + dirv / np.linalg.norm(dirv) * L * f
            d = smin(d, cap(p, prev, nxt, r * (1 - 0.08 * j), r * (1 - 0.08 * (j + 1))), 0.006)
            prev = nxt
    # pouce
    base = V(0.04, -0.03, 0.008)
    t1 = base + V(0.024, -0.022, 0.012 + 0.02 * thumb)
    t2 = t1 + V(0.006 - 0.02 * thumb, -0.026, 0.012 + 0.012 * thumb)
    d = smin(d, cap(p, base, t1, 0.013, 0.011), 0.012)
    d = smin(d, cap(p, t1, t2, 0.0105, 0.009), 0.006)
    return d

def thigh(p):
    d = cap(p, V(0, 0.02, 0), V(0, -0.42, 0), 0.086, 0.05)
    d = smin(d, ell(p, V(0.008, -0.17, 0.022), V(0.078, 0.17, 0.072)), 0.04)
    return d

def shin(p):
    d = cap(p, V(0, 0.01, 0), V(0, -0.41, 0), 0.05, 0.032)
    d = smin(d, ell(p, V(0, -0.12, -0.028), V(0.048, 0.11, 0.048)), 0.035)      # mollet
    d = smin(d, ell(p, V(0, -0.005, 0.038), V(0.033, 0.034, 0.02)), 0.015)      # rotule
    return d

def foot(p):
    d = cap(p, V(0, 0.01, -0.005), V(0, -0.04, -0.01), 0.035, 0.03)              # cheville
    d = smin(d, ell(p, V(0, -0.055, -0.03), V(0.034, 0.03, 0.045)), 0.02)       # talon
    d = smin(d, ell(p, V(0.0, -0.06, 0.07), V(0.045, 0.026, 0.1)), 0.03)        # plante
    d = smin(d, ell(p, V(0.005, -0.065, 0.16), V(0.046, 0.02, 0.032)), 0.02)    # orteils
    return d

# ---------- maillage ----------
def mesh_sdf(fn, lo, hi, step, faces, smooth=8, dilate=0.0, clip=None):
    lo = np.array(lo, float); hi = np.array(hi, float)
    n = np.ceil((hi - lo) / step).astype(int) + 1
    xs = [lo[i] + np.arange(n[i]) * step for i in range(3)]
    X, Y, Z = np.meshgrid(*xs, indexing='ij')
    P = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
    out = np.empty(len(P))
    for i in range(0, len(P), 400000):
        q = P[i:i + 400000]
        d = fn(q) - dilate
        if clip is not None: d = -smin(-d, -clip(q), 0.004)   # intersection lissée : ourlets arrondis
        out[i:i + 400000] = d
    vol = out.reshape(n)
    v, f, _, _ = marching_cubes(vol, level=0.0, spacing=(step, step, step))
    v += lo
    m = trimesh.Trimesh(v, f, process=True)
    trimesh.smoothing.filter_taubin(m, iterations=smooth)
    if faces and len(m.faces) > faces:
        v2, f2 = fast_simplification.simplify(m.vertices, m.faces, target_reduction=1 - faces / len(m.faces))
        m = trimesh.Trimesh(v2, f2, process=True)
    m.fix_normals()
    return m

def garment(body, planes, offset, hem=0.0032):
    m = body.copy()
    for o, n in planes:
        m = m.slice_plane(plane_origin=o, plane_normal=n, cap=False)
    m = trimesh.Trimesh(m.vertices, m.faces, process=True)
    m.vertices = m.vertices + m.vertex_normals * offset
    parts = [m]
    # ourlets : un tube le long de chaque bord libre
    edges = m.edges[trimesh.grouping.group_rows(m.edges_sorted, require_count=1)]
    if len(edges):
        import networkx as nx
        g = nx.Graph(); g.add_edges_from(edges.tolist())
        for comp in nx.connected_components(g):
            sub = g.subgraph(comp)
            try: cyc = nx.cycle_basis(sub)
            except Exception: cyc = []
            for loop in cyc:
                if len(loop) < 6: continue
                pts = m.vertices[loop]
                # lissage du contour
                for _ in range(3): pts = (np.roll(pts, 1, 0) + 2 * pts + np.roll(pts, -1, 0)) / 4
                ring = []
                k = 8
                for i in range(len(pts)):
                    a = pts[i]; b = pts[(i + 1) % len(pts)]
                    t = b - a; t /= (np.linalg.norm(t) + 1e-12)
                    up = np.array([0, 1.0, 0]) if abs(t[1]) < 0.9 else np.array([1.0, 0, 0])
                    u = np.cross(t, up); u /= np.linalg.norm(u); w = np.cross(t, u)
                    ring.append([a + hem * (np.cos(j / k * 2 * np.pi) * u + np.sin(j / k * 2 * np.pi) * w) for j in range(k)])
                ring = np.array(ring).reshape(-1, 3)
                n = len(pts); f = []
                for i in range(n):
                    for j in range(k):
                        a = i * k + j; b = i * k + (j + 1) % k; c = ((i + 1) % n) * k + j; d = ((i + 1) % n) * k + (j + 1) % k
                        f += [[a, c, b], [b, c, d]]
                parts.append(trimesh.Trimesh(ring, np.array(f), process=True))
    out = trimesh.util.concatenate(parts)
    return out

def mirror(m):
    v = m.vertices.copy(); v[:, 0] *= -1
    return trimesh.Trimesh(v, m.faces[:, ::-1].copy(), process=True)

def build():
    S = {}
    print('tronc'); S['torso'] = mesh_sdf(torso, (-0.27, -0.17, -0.19), (0.27, 0.66, 0.15), 0.004, 14000)
    print('tête'); S['head'] = mesh_sdf(head, (-0.1, -0.05, -0.13), (0.1, 0.33, 0.14), 0.0018, 12000, smooth=6)
    print('bras'); S['upperarm_R'] = mesh_sdf(upper_arm, (-0.07, -0.34, -0.07), (0.07, 0.07, 0.07), 0.0035, 2600)
    S['forearm_R'] = mesh_sdf(forearm, (-0.06, -0.29, -0.06), (0.06, 0.05, 0.05), 0.003, 2200)
    print('mains'); S['hand_R'] = mesh_sdf(lambda p: hand(p, 0.28, 0.25), (-0.06, -0.2, -0.06), (0.09, 0.03, 0.09), 0.0016, 3200, smooth=5)
    print('jambes'); S['thigh_R'] = mesh_sdf(thigh, (-0.11, -0.48, -0.11), (0.11, 0.12, 0.12), 0.004, 3000)
    S['shin_R'] = mesh_sdf(shin, (-0.07, -0.46, -0.09), (0.07, 0.06, 0.07), 0.0035, 2600)
    S['foot_R'] = mesh_sdf(foot, (-0.06, -0.1, -0.09), (0.07, 0.06, 0.21), 0.0025, 2200)
    # vêtements : la peau découpée proprement par des plans, puis décalée vers l'extérieur,
    # avec un ourlet tubulaire sur chaque bord (t-shirt d'équipage et short)
    print('vêtements')
    S['shirt'] = garment(S['torso'], [((0, 0.03, 0), (0, 1, 0)), ((0, 0.598, -0.01), (0, -1, -0.42))], 0.0065)
    S['sleeve_R'] = garment(S['upperarm_R'], [((0, -0.13, 0), (0, 1, 0))], 0.0075)
    S['shorts'] = garment(S['torso'], [((0, 0.075, 0), (0, -1, 0))], 0.008)
    S['shortleg_R'] = garment(S['thigh_R'], [((0, -0.22, 0), (0, 1, 0)), ((0, 0.06, 0), (0, -1, 0))], 0.0095)
    # gants du sauveteur (main droite) en plusieurs poses
    print('gants')
    S['glove_open'] = mesh_sdf(lambda p: hand(p, 0.08, 0.1, 0.15), (-0.065, -0.2, -0.05), (0.095, 0.03, 0.07), 0.0018, 2600, dilate=0.0015, smooth=5)
    S['glove_grip'] = mesh_sdf(lambda p: hand(p, 0.75, 0.85), (-0.06, -0.17, -0.05), (0.095, 0.03, 0.11), 0.0018, 2600, dilate=0.0015, smooth=5)
    S['glove_fist'] = mesh_sdf(lambda p: hand(p, 0.0, 0.7, fist=True), (-0.06, -0.17, -0.05), (0.095, 0.03, 0.11), 0.0018, 2600, dilate=0.0015, smooth=5)
    # côté gauche par symétrie
    for k in list(S):
        if k.endswith('_R'): S[k[:-2] + '_L'] = mirror(S[k])
    return S

if __name__ == '__main__':
    S = build()
    scene = trimesh.Scene()
    tot = 0
    for name, m in S.items():
        m.visual = trimesh.visual.ColorVisuals(m, vertex_colors=None)
        scene.add_geometry(m, node_name=name, geom_name=name)
        tot += len(m.faces)
        print(f'  {name}: {len(m.faces)} triangles')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    scene.export(OUT, include_normals=True)
    print('écrit', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'Mo,', tot, 'triangles')
