/* ================= séances de détente ================= */
const RELAX_CARDS = [
  { key: 'earth', title: 'Terre vue de l\'ISS', text: 'La coupole de la station, la Terre qui défile à 7,7 km/s, de jour, au crépuscule et de nuit.',
    long: 'Vous flottez dans la coupole de la station, à 420 km d\'altitude. La Terre passe sous les hublots en temps réel : un tour complet prend 93 minutes.', chips: ['Orbite réelle', 'Images NASA'], img: 'img/thumb-earth.jpg' },
  { key: 'ocean', title: 'Océan au coucher du soleil', text: 'Au bout d\'une jetée, face à l\'Atlantique, pendant que le soleil descend vers l\'horizon.',
    long: 'Au bout d\'une jetée en bois, face à l\'Atlantique. Le soleil se couche à sa vitesse réelle, les vagues frappent doucement les piliers.', chips: ['Vagues', 'Coucher réel'], img: 'img/thumb-ocean.jpg' },
  { key: 'lake', title: 'Lac de montagne au matin', text: 'Un lac calme entre des sommets enneigés, la brume qui monte de l\'eau, les oiseaux.',
    long: 'Sur la rive d\'un lac de montagne, au lever du jour. La brume flotte au ras de l\'eau, les sommets s\'éclairent, les oiseaux chantent.', chips: ['Brume', 'Chants d\'oiseaux'], img: 'img/thumb-lake.jpg' },
  { key: 'desert', title: 'Désert de Lompoul la nuit', text: 'Sur la crête d\'une dune, sous la Voie lactée, avec un campement éclairé en contrebas.',
    long: 'Sur la crête d\'une dune de Lompoul, entre Dakar et Saint-Louis. Le ciel est celui d\'une nuit de septembre, avec la Voie lactée et un mince croissant de lune.', chips: ['Ciel réel', 'Vent, grillons'], img: 'img/thumb-desert.jpg' }
];
const STRESS = ['aucun', 'léger', 'moyen', 'fort', 'très fort'];
function renderScale(el, onPick, value) {
  el.innerHTML = STRESS.map((s, i) => `<button data-v="${i + 1}" aria-pressed="${value === i + 1}"><b>${i + 1}</b>${s}</button>`).join('');
  $$('button', el).forEach(b => b.onclick = () => { $$('button', el).forEach(x => x.setAttribute('aria-pressed', String(x === b))); onPick(+b.dataset.v); });
}
function cupolaAudio(ctx, out) {
  const fans = noiseBand(ctx, out, 'pink', 'lowpass', 650, 0.5, 0.035);
  const low = noiseBand(ctx, out, 'brown', 'lowpass', 140, 0.5, 0.045);
  return { stop() { fans.stop(); low.stop(); } };
}

const Relax = {
  key: null, dur: 600, left: 600, breath: true, moodBefore: null, running: false, cyc: 0, noVR: false, startT: 0,
  precheck(key) {
    Sound.init();
    this.key = key;
    const c = RELAX_CARDS.find(x => x.key === key);
    $('#pcScene').textContent = c.long;
    this.moodBefore = null;
    renderScale($('#pcMood'), v => this.moodBefore = v);
    $('#pcNausea').checked = false; $('#pcGrav').checked = false; $('#pcWarn').hidden = true;
    const upd = () => { $('#pcWarn').hidden = !($('#pcNausea').checked || $('#pcGrav').checked); };
    $('#pcNausea').onchange = upd; $('#pcGrav').onchange = upd;
    seg($('#pcDur'), String(this.dur / 60), v => this.dur = +v * 60);
    $('#precheck').hidden = false;
    $('#pcGo').onclick = () => this.start();
  },
  async start(fromXR) {
    $('#precheck').hidden = true;
    if (!fromXR) { this.noVR = $('#pcNausea').checked || $('#pcGrav').checked; this.breath = $('#pcBreath').checked; }
    App.view = 'relax';
    $('#menu').hidden = true;
    let exp;
    try { exp = await openExperience(this.key); } catch (e) { goMenu(); return; }
    if (exp.menuMode) exp.menuMode(false);
    if (exp.setPreset) { exp.setPreset('jour'); exp.setSpeed(1); }
    if (this.key === 'earth') Sound.setAmbience(cupolaAudio);
    App.setTitle(EXPERIENCES[this.key].title);
    $('#relaxCaption').textContent = exp.caption || '';
    this.renderPresets(exp);
    this.left = this.dur; this.running = true; this.cyc = 0; this.startT = performance.now();
    $('#relaxHud').hidden = false;
    $('#lookHint').style.opacity = '1'; look.moved = false;
    setTimeout(() => App.hideHint(), 9000);
    $('#btnBreath').setAttribute('aria-pressed', String(this.breath));
    $('#btnBreath').onclick = () => { this.breath = !this.breath; $('#btnBreath').setAttribute('aria-pressed', String(this.breath)); };
    $('#btnEndRelax').onclick = () => this.end(false);
    App.frameHooks.add(this.hook);
    updateVRButton();
  },
  renderPresets(exp) {
    const el = $('#relaxPresets');
    el.innerHTML = '';
    if (!exp.presets) return;
    el.innerHTML = `<div class="seg" id="rpPreset">${Object.entries(exp.presets).map(([k, p]) => `<button data-v="${k}" aria-pressed="${k === 'jour'}">${esc(p.label)}</button>`).join('')}</div>
      <div class="seg" id="rpSpeed"><button data-v="1" aria-pressed="true">Temps réel</button><button data-v="10">× 10</button></div>`;
    seg($('#rpPreset'), 'jour', v => {
      exp.setPreset(v);
      if (v === 'crepuscule') { exp.update(0.016); exp.faceSun(); }
      else { look.yaw = 0; look.pitch = -24 * DEG; }
      $('#relaxCaption').textContent = exp.presets[v].note;
    });
    seg($('#rpSpeed'), '1', v => exp.setSpeed(+v));
  },
  hook: dt => Relax.frame(dt),
  frame(dt) {
    if (!this.running) return;
    this.left -= dt;
    if (this.left <= 0 && isFinite(this.left)) { this.end(true); return; }
    $('#relaxTimer').textContent = isFinite(this.left) ? fmtClock(this.left) : '';
    const ring = $('#breathRing .ring');
    if (this.breath) {
      this.cyc = (this.cyc + dt) % 10;
      const inh = this.cyc < 4;
      const k = inh ? smoothstep(0, 4, this.cyc) : 1 - smoothstep(4, 10, this.cyc);
      ring.style.transform = `scale(${(0.55 + 0.45 * k).toFixed(3)})`;
      $('#breathWord').textContent = inh ? 'Inspirez' : 'Expirez';
      $('#breathSub').textContent = (inh ? Math.ceil(4 - this.cyc) : Math.ceil(10 - this.cyc)) + ' s';
      this.breathK = k; this.breathWord = inh ? 'Inspirez' : 'Expirez';
    } else {
      ring.style.transform = 'scale(0.78)';
      $('#breathWord').textContent = 'Respirez'; $('#breathSub').textContent = 'à votre rythme';
      this.breathK = 0.5; this.breathWord = 'Respirez';
    }
  },
  end(timeUp) {
    this.running = false;
    const mins = Math.max(1, Math.round((performance.now() - this.startT) / 60000));
    this.after = null;
    renderScale($('#afMood'), v => {
      this.after = v;
      this.saveResult(mins);
    });
    $('#afResult').innerHTML = this.history();
    $('#after').hidden = false;
    $('#afStay').onclick = () => { $('#after').hidden = true; this.left = Infinity; this.running = true; };
    if (typeof EMBED !== 'undefined' && EMBED) $('#afMenu').textContent = 'Revenir à AURA';
    $('#afMenu').onclick = () => {
      $('#after').hidden = true;
      if (typeof EMBED !== 'undefined' && EMBED) { Relax.stop(); Sound.setAmbience(null); postParent({ type: 'aura-relax-end', key: this.key, minutes: mins, mood: this.after }); return; }
      goMenu();
    };
    if (timeUp) Sound.beep(528, 1.2, 0.05, 'sine');
  },
  saveResult(mins) {
    const log = store.get('relax', []);
    const entry = { d: Date.now(), k: this.key, b: this.moodBefore, a: this.after, m: mins };
    if (log.length && log[0].d > Date.now() - 5000 && log[0].k === this.key) log[0] = entry; else log.unshift(entry);
    store.set('relax', log.slice(0, 40));
    $('#afResult').innerHTML = this.history();
  },
  history() {
    const log = store.get('relax', []);
    const now = this.moodBefore && this.after ? `<div class="alert ${this.after < this.moodBefore ? 'earth' : 'aura'}">Stress ${this.moodBefore} avant, ${this.after} après${this.after < this.moodBefore ? ' : il a baissé.' : this.after === this.moodBefore ? ' : stable.' : '.'}</div>` : '';
    if (!log.length) return now;
    const rows = log.slice(0, 5).map(e => {
      const c = RELAX_CARDS.find(x => x.key === e.k);
      const d = new Date(e.d);
      return `<tr><td>${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td><td>${esc(c ? c.title : e.k)}</td><td>${e.m} min</td><td>${e.b ?? '?'} → ${e.a ?? '?'}</td></tr>`;
    }).join('');
    return now + `<h3>Vos dernières séances</h3><table class="timeline">${rows}</table>`;
  },
  stop() {
    this.running = false;
    App.frameHooks.delete(this.hook);
    $('#relaxHud').hidden = true; $('#after').hidden = true; $('#precheck').hidden = true;
  }
};
