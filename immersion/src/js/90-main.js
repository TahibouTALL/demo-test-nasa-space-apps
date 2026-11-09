/* ================= menu, navigation et démarrage ================= */
const SIM_CARDS = [
  { key: 'anaphylaxie', title: 'Allergie grave', text: 'Rafael réagit à un antibiotique. Vous menez les soins pendant que la médecin de bord est dans le sas.', chips: ['Fiche F-INF-08', '15 à 30 min'], img: 'img/thumb-anaphylaxie.jpg' },
  { key: 'arret', title: 'Arrêt cardiaque en apesanteur', text: 'Lucas s\'effondre sur le tapis de course. Massage en apesanteur, défibrillateur, médicaments.', chips: ['Fiche F-CVN-07', '15 à 25 min'], img: 'img/thumb-arret.jpg' },
  { key: 'fumee', title: 'Inhalation de fumée', text: 'Une carte électronique prend feu. Masques, air de la cabine, et une saturation qui trompe.', chips: ['Fiche F-EXP-06', 'Temps accéléré'], img: 'img/thumb-fumee.jpg' },
  { key: 'calcul', title: 'Calcul rénal et échographie', text: 'La médecin de bord a une colique néphrétique. Vous faites l\'échographie, guidé comme sur l\'ISS.', chips: ['Fiche F-DIG-12', 'Échographie interactive'], img: 'img/thumb-calcul.jpg' }
];

function card(c, onClick) {
  const b = document.createElement('button');
  b.className = 'card';
  b.innerHTML = `<div class="thumb" style="background-image:url('${c.img}')"></div><div class="body"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p><div class="meta">${c.chips.map((x, i) => `<span class="chip ${i === 0 ? 'aura' : ''}">${esc(x)}</span>`).join('')}</div></div>`;
  b.onclick = onClick;
  return b;
}
function renderMenu() {
  const r = $('#cardsRelax'), s = $('#cardsSim');
  r.innerHTML = ''; s.innerHTML = '';
  RELAX_CARDS.forEach(c => r.appendChild(card(c, () => { if (!HAS_GL) return; Relax.precheck(c.key); })));
  SIM_CARDS.forEach(c => s.appendChild(card(c, () => Sim.open(c.key))));
}

async function goMenu() {
  if (EMBED) { Relax.stop(); if (Sim.S) Sim.stop(); Sound.setAmbience(null); postParent({ type: 'aura-exit' }); return; }
  Relax.stop();
  if (Sim.S) Sim.stop();
  $$('.modal').forEach(m => m.hidden = true);
  $('#usPanel').hidden = true;
  App.view = 'menu';
  App.setTitle('');
  Sound.setAmbience(null);
  $('#menu').hidden = false;
  updateVRButton();
  if (!HAS_GL) return;
  const exp = await openExperience('earth', { loadingText: 'Chargement de la Terre' });
  exp.menuMode(true);
  exp.setPreset('jour'); exp.setSpeed(1);
  look.yaw = 0; look.pitch = -16 * DEG; look.fov = 70;
}

const DESKTOP = !!(window.auraDesktop && window.auraDesktop.isDesktop);
const EMBED = /(^|&)embed=1(&|$)/.test(location.hash.slice(1)) && window.parent !== window;
function postParent(msg) { try { window.parent.postMessage(Object.assign({ source: 'aura-immersion' }, msg), '*'); } catch (e) { /* rien */ } }
function updateVRButton() {
  const b = $('#btnVR');
  const show = !DESKTOP && XR.supported && !(App.view === 'relax' && Relax.noVR);
  b.hidden = !show;
  b.querySelector('.lbl').textContent = XR.session ? 'Quitter le casque' : 'Casque';
}

function aboutHTML() {
  const src = [SRC.rcukAna, SRC.rcukAls, SRC.hink, SRC.coTox, SRC.smac, SRC.jones];
  return `
    <p class="eyebrow">À propos</p>
    <h2 id="abTitle">AURA Immersion</h2>
    <p class="lead">Le volet immersif d'AURA : des pauses pour récupérer pendant une longue mission, et des urgences médicales à répéter avant d'en avoir besoin.</p>
    <h3>Ce qui est réel, ce qui est calculé</h3>
    <ul>
      <li><strong>Terre vue de l'ISS.</strong> Images de la NASA (Blue Marble pour le jour, lumières des villes pour la nuit). L'orbite suit celle de la station : 420 km d'altitude, 51,6° d'inclinaison, un tour en 93 minutes, au-dessus de Dakar au départ. L'atmosphère, les nuages, les reflets du soleil sur la mer, les éclairs et la lueur verte de la haute atmosphère sont calculés.</li>
      <li><strong>Océan, lac, désert.</strong> Relief, eau, ciel et nuages sont produits par le programme, sans photo. Au désert de Lompoul (15,4° nord), les étoiles brillantes et la Voie lactée sont placées pour une nuit de septembre vers 21 h 30.</li>
      <li><strong>Sons.</strong> Vagues, vent, oiseaux, grillons, ventilation de la station et moniteur sont synthétisés en direct.</li>
      <li><strong>Simulations.</strong> Les gestes et l'ordre des décisions suivent les fiches AURA et les recommandations citées. Les réactions du patient viennent de modèles simplifiés, choix AURA : ils servent à répéter, pas à prédire.</li>
    </ul>
    <h3 class="vr-only">Avant d'utiliser un casque</h3>
    <p class="vr-only">Un casque peut aggraver le mal de l'espace : la vérification avant chaque séance le rappelle et laisse la scène à l'écran si besoin. En apesanteur, on s'attache ou on tient une main courante. Le bouton Casque n'apparaît que si le navigateur gère la réalité virtuelle (WebXR) et que la page est ouverte directement, en https ou en local.</p>
    <h3>Respiration guidée</h3>
    <p>Inspirer 4 secondes, expirer 6 secondes, soit six respirations par minute. Le niveau de stress noté avant et après chaque séance reste uniquement sur cet appareil.</p>
    <h3>Sources des simulations</h3>
    <ul class="src">${src.map(s => `<li><a class="link" href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}<li>${esc(SRC.issKit.title)}</li></ul>
    <h3>Crédits</h3>
    <p class="small-print">Images de la Terre : NASA Visible Earth (domaine public), lumières nocturnes isolées de l'image d'origine pour cette page. Moteur 3D : three.js (licence MIT). Bruit procédural : Ashima Arts et Stefan Gustavson (licence MIT). Police : Atkinson Hyperlegible Next (licence SIL OFL). Personnages des simulations : fictifs, comme l'équipage de démonstration d'AURA.</p>
    <div class="actions"><button class="btn primary" data-close>Fermer</button></div>`;
}

function bindChrome() {
  $('#btnHome').onclick = () => {
    if (App.view === 'sim' && Sim.S && !Sim.S.ended) { Sim.finish({ outcome: 'arret', title: 'Simulation arrêtée', text: 'Vous avez quitté la simulation avant la fin.' }); return; }
    if (EMBED) { Sound.setAmbience(null); postParent({ type: 'aura-exit' }); return; }
    goMenu();
  };
  const sb = $('#btnSound');
  const syncSound = () => { sb.setAttribute('aria-pressed', String(Sound.on)); $$('.w1, .w2', sb).forEach(p => p.style.opacity = Sound.on ? 1 : 0.15); };
  sb.onclick = () => { Sound.init(); Sound.setOn(!Sound.on); syncSound(); };
  syncSound();
  const fb = $('#btnFull');
  if (DESKTOP) {
    fb.onclick = () => window.auraDesktop.toggleFullscreen();
    $('#btnQuit').onclick = () => window.auraDesktop.quit();
  } else {
    if (!document.fullscreenEnabled) fb.hidden = true;
    fb.onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => { fb.hidden = true; }); } catch (e) { fb.hidden = true; } };
  }
  $('#btnVR').onclick = () => XR.enter();
  const openAbout = () => { $('#abBody').innerHTML = aboutHTML(); $('#about').hidden = false; bindClose(); };
  $('#btnAbout').onclick = openAbout; $('#btnAbout2').onclick = openAbout;
  bindClose();
  $('#cprTap').onclick = () => cprTapNow();
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      for (const id of ['#about', '#precheck', '#brief']) if (!$(id).hidden) { $(id).hidden = true; return; }
      if (DESKTOP) window.auraDesktop.setFullscreen(false);
    }
    if (e.code === 'Space' && !$('#cprPanel').hidden) { e.preventDefault(); cprTapNow(); }
  });
}
function bindClose() { $$('[data-close]').forEach(b => b.onclick = () => { b.closest('.modal').hidden = true; }); }

function hashParams() { return Object.fromEntries(new URLSearchParams(location.hash.slice(1))); }
async function boot() {
  if (DESKTOP) {
    document.body.classList.add('desktop');
    $('#heroText').textContent = 'Quatre lieux calmes pour prendre une pause pendant la mission, et quatre urgences médicales à répéter avec l\'aide d\'AURA. Cliquez sur une carte pour entrer dans la scène, puis faites glisser la souris pour regarder autour de vous.';
    $('#chipMode').textContent = 'Démonstration en 3D';
  }
  renderMenu();
  bindChrome();
  if (!HAS_GL) {
    $('#cardsRelax').insertAdjacentHTML('beforebegin', '<div class="alert amber">L\'affichage en trois dimensions (WebGL) n\'a pas pu démarrer sur cet appareil. Les scènes de détente ne sont pas disponibles ici ; les simulations fonctionnent sans la vue du module.</div>');
    window.__ready = true;
    return;
  }
  renderer.setAnimationLoop(frame);
  if (!DESKTOP) XR.detect().then(updateVRButton);
  const p = hashParams();
  if (p.clean) $('#ui').style.display = 'none';
  if (EMBED) {
    document.body.classList.add('embed');
    $('#btnHome').innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5.5 8.5 12l6.5 6.5"/></svg><b>Retour</b>';
    $('#btnHome').setAttribute('aria-label', 'Revenir à AURA');
  }
  if (EMBED && p.scene) {
    $('#menu').hidden = true;
    Relax.key = p.scene; Relax.breath = true; Relax.noVR = false; Relax.dur = 600; Relax.moodBefore = null;
    await Relax.start();
    window.__ready = true;
    return;
  }
  if (p.scene) {
    $('#menu').hidden = true;
    const exp = await openExperience(p.scene);
    App.view = 'relax';
    if (p.preset && exp.setPreset) exp.setPreset(p.preset);
    if (p.yaw) look.yaw = +p.yaw * DEG;
    if (p.pitch) look.pitch = +p.pitch * DEG;
    if (p.fov) look.fov = +p.fov;
    if (p.sun && exp.faceSun) { exp.update(0.016); exp.faceSun(); }
    if (p.menu && exp.menuMode) exp.menuMode(true);
    window.__ready = true;
    return;
  }
  if (p.sim) {
    Sim.def = SIMS[p.sim]; Sim.mode = p.mode || 'guide'; Sim.comm = 'directe';
    await Sim.start();
    window.__ready = true;
    return;
  }
  await goMenu();
  window.__ready = true;
}
window.__aura = { Sim, App, US, Relax, XR, look, SIMS, Sound };
boot();
