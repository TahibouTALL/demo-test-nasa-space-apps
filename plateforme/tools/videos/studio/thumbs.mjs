// Vignettes des cartes : paysages (vue de départ) et simulations (étape la plus parlante, caméra de l'entraîneur)
const T = 'const T = A.Trainer; T.clearHots && T.clearHots(); A.camera.clearViewOffset(); A.camera.updateProjectionMatrix();';
export const STILLS = {
  ev_lacrose: { url: 'scene=lacrose&clean=1', setup: ``, settle: 4000 },
  ev_savane: { url: 'scene=savane&clean=1', setup: ``, settle: 4000 },
  ev_aurore: { url: 'scene=aurore&clean=1', setup: ``, settle: 4000 },
  ev_ocean: { url: 'scene=ocean&clean=1', setup: ``, settle: 4000 },
  ev_lake: { url: 'scene=lake&clean=1', setup: ``, settle: 4000 },
  ev_desert: { url: 'scene=desert&clean=1', setup: ``, settle: 4000 },
  sim_anaphylaxie: { url: 'sim=anaphylaxie&go=1', step: 0, wait: 3500, setup: T },
  sim_incendie: { url: 'sim=incendie&go=1', step: 3, wait: 5000, setup: T },
  sim_depress: { url: 'sim=depress&go=1', step: 4, wait: 3500, setup: T },
  sim_plaie: { url: 'sim=plaie&go=1', step: 1, wait: 3500, setup: T },
  sim_nez: { url: 'sim=nez&go=1', step: 1, wait: 3500, setup: T },
  sim_etouffement: { url: 'sim=etouffement&go=1', step: 2, wait: 3500, setup: T },
  sim_brulure: { url: 'sim=brulure&go=1', step: 0, wait: 3500, setup: T }
};
