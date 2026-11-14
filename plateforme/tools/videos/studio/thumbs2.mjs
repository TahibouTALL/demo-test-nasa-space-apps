const T = 'const T = A.Trainer, W = T.W; T.clearHots && T.clearHots();';
export const STILLS = {
  ev_aurore: { url: 'scene=aurore&clean=1', setup: ``, settle: 4000 },
  ev_lake: { url: 'scene=lake&clean=1', setup: `A.look.pitch = 0.1;`, settle: 4000 },
  sim_plaie: { url: 'sim=plaie&go=1', step: 2, wait: 5000, setup: `${T} const P = W.patient; const f = P.world('forearmR'); const fr = P.front(), up = P.up(); const sd = up.clone().cross(fr).normalize();
    const c = f.clone().addScaledVector(fr, 0.5).addScaledVector(sd, -0.3).addScaledVector(up, 0.15); S.cam([c.x, c.y, c.z], [f.x, f.y, f.z], 42); S.light(P, { at: 'forearmR', side: -0.3, amb: 0.8, env: 0.45, exposure: 0.9 });` },
  sim_nez: { url: 'sim=nez&go=1', step: 0, wait: 6000, setup: `${T} const P = W.patient; S.portrait(P, { dist: 0.6, side: -0.32, exposure: 0.9 });` }
};
