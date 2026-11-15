/* ================= menu, navigation et démarrage ================= */
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
  SIM_ORDER.map(k => SIMS2[k]).forEach(d => s.appendChild(card({ title: d.title, text: d.card || d.intro, img: `img/sims/${d.key}.webp`, chips: [d.fiche ? 'Fiche ' + d.fiche : 'Urgence du vaisseau', 'environ ' + (d.minutes || 3) + ' min'] }, () => Trainer.intro(d.key))));
}

async function goMenu() {
  if (EMBED) { Relax.stop(); Trainer.stop(); Sound.setAmbience(null); postParent({ type: 'aura-exit' }); return; }
  Relax.stop();
  Trainer.stop();
  $$('.modal').forEach(m => m.hidden = true);
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
  const show = !DESKTOP && XR.supported && App.view !== 'sim' && !(App.view === 'relax' && Relax.noVR);
  b.hidden = !show;
  b.querySelector('.lbl').textContent = XR.session ? 'Quitter le casque' : 'Casque';
}

// pourquoi des paysages : études en milieu isolé et récits d'astronautes
const RELAX_SRC = [
  { title: 'Anderson A.P. et al. (2017). Relaxation with immersive natural scenes presented using virtual reality. Aerosp Med Hum Perform 88(6):520', url: 'https://asma.kglmeridian.com/view/journals/amhp/88/6/article-p520.xml' },
  { title: 'Thoolen S.J.J. et al. (2025). Virtual reality-based sensory stimulation preferences at Amundsen-Scott South Pole station in Antarctica. npj Microgravity', url: 'https://doi.org/10.1038/s41526-025-00471-2' },
  { title: 'Yaden D.B. et al. (2016). The overview effect : awe and self-transcendent experience in space flight. Psychology of Consciousness 3(1)', url: 'https://www.sciencedaily.com/releases/2016/04/160419120055.htm' }
];
function aboutHTML() {
  const src = ['hink', 'esc25', 'rcukAna', 'tobias', 'dcs', 'jones', 'hemo', 'eyeSpace'].map(k => SIM_SRC[k]);
  const li = s => `<li><a class="link" href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`;
  return `
    <p class="eyebrow">À propos</p>
    <h2 id="abTitle">AURA Immersion</h2>
    <p class="lead">Le volet immersif d'AURA : des pauses pour récupérer pendant une longue mission, et des urgences à répéter avant d'en avoir besoin.</p>
    <h3>Ce qui est réel, ce qui est calculé</h3>
    <ul>
      <li><strong>Intérieur de la station.</strong> Modèle 3D de l'intérieur de l'ISS publié par la NASA (NASA 3D Resources, domaine public) : laboratoire Destiny, nœuds Unity, Harmony et Tranquility, sas Quest et coupole.</li>
      <li><strong>Équipage.</strong> Personnages construits avec le maillage et les formes de MakeHuman (licence CC0) : morphologie, peau, vêtements et squelette pour les gestes. Les personnes sont fictives, comme l'équipage de démonstration d'AURA.</li>
      <li><strong>Terre vue de l'ISS.</strong> Images de la NASA (Blue Marble pour le jour, lumières des villes pour la nuit). L'orbite suit celle de la station : 420 km d'altitude, 51,6° d'inclinaison, un tour en 93 minutes.</li>
      <li><strong>Simulations.</strong> Les gestes et leur ordre suivent les fiches AURA et les recommandations citées. Les réactions du patient sont simplifiées.</li>
      <li><strong>Sons.</strong> Ventilation de la station, alarmes, vagues, vent et oiseaux sont synthétisés en direct.</li>
    </ul>
    <h3>Pourquoi ces paysages</h3>
    <p>En station polaire comme en analogue spatial, des scènes de nature en réalité virtuelle aident à récupérer, surtout quand elles durent plusieurs minutes. Les goûts varient beaucoup d'une personne à l'autre : d'où sept décors très différents, du lac Rose aux aurores boréales. La Terre vue de la coupole reprend ce que beaucoup d'astronautes décrivent comme le moment le plus fort de leur vol.</p>
    <ul class="src">${RELAX_SRC.map(li).join('')}</ul>
    <h3 class="vr-only">Avant d'utiliser un casque</h3>
    <p class="vr-only">Un casque peut aggraver le mal de l'espace : la vérification avant chaque séance le rappelle et laisse la scène à l'écran si besoin. En apesanteur, on s'attache ou on tient une main courante.</p>
    <h3>Sources des simulations</h3>
    <ul class="src">${src.filter(Boolean).map(li).join('')}</ul>
    <h3>Crédits</h3>
    <p class="small-print">Modèles et images : NASA (domaine public). Personnages : MakeHuman (licence CC0). Moteur 3D : three.js (licence MIT). Bruit procédural : Ashima Arts et Stefan Gustavson (licence MIT). Police : Atkinson Hyperlegible Next (licence SIL OFL).</p>
    <div class="actions"><button class="btn primary" data-close>Fermer</button></div>`;
}

function bindChrome() {
  $('#btnHome').onclick = () => {
    if (App.view === 'sim' && Trainer.running) { Trainer.finish(false); return; }
    if (EMBED) { Trainer.stop(); Sound.setAmbience(null); postParent({ type: 'aura-exit' }); return; }
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
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      for (const id of ['#about', '#precheck', '#trIntro']) if (!$(id).hidden) { $(id).hidden = true; return; }
      if (DESKTOP) window.auraDesktop.setFullscreen(false);
    }
  });
}
function bindClose() { $$('[data-close]').forEach(b => b.onclick = () => { b.closest('.modal').hidden = true; }); }

function hashParams() { return Object.fromEntries(new URLSearchParams(location.hash.slice(1))); }
async function boot() {
  if (DESKTOP) {
    document.body.classList.add('desktop');
    $('#chipMode').textContent = 'Démonstration en 3D';
  }
  $('#heroText').textContent = `Des lieux calmes pour souffler pendant la mission, et ${SIM_ORDER.length} urgences à répéter dans le vrai décor de l'ISS. Tout fonctionne à l'écran ; avec un casque compatible, on entre dans les lieux de détente.`;
  renderMenu();
  bindChrome();
  if (!HAS_GL) {
    $('#cardsRelax').insertAdjacentHTML('beforebegin', '<div class="alert amber">L\'affichage en trois dimensions (WebGL) n\'a pas pu démarrer sur cet appareil : les scènes et les simulations ne sont pas disponibles ici.</div>');
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
  if (p.sim && SIMS2[p.sim]) {
    $('#menu').hidden = true;
    Trainer.exam = p.mode === 'exam';
    if (p.go) { await Trainer.start(p.sim); }
    else {
      // fond de la simulation pendant l'introduction
      openExperience('iss-' + SIMS2[p.sim].env, { loadingText: 'Préparation du module' }).then(() => { App.view = 'sim'; }).catch(() => {});
      Trainer.intro(p.sim);
    }
    window.__ready = true;
    return;
  }
  await goMenu();
  window.__ready = true;
}
window.__aura = {
  Trainer, App, Relax, XR, look, SIMS2, Sound, camera, renderer, THREE, buildPatient, Props, openExperience, EXPERIENCES, Models, pressHands, orientGlove, glovePlace,
  // rendu d'images fixes (vignettes, vidéos) : résolution constante
  fixRes(pr = 1) { App.fixedRes = true; renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); }
};
boot();
