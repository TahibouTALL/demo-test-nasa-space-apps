/* AURA : écrans de l'astronaute (bienvenue, accueil, santé, orientation, urgence, réglages). */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, DATA = root.AURA_DATA, E = root.AURA_ENGINE, VOCAB = root.AURA_VOCAB, LIB = root.AURA_FICHES_LIB;
  const $ = A.$, esc = A.esc, icon = A.icon;
  const greeted = {};

  /* ================================================================ */
  /* Bienvenue : qui utilise la plateforme                             */
  /* ================================================================ */
  A.views.bienvenue = {
    render() {
      const cards = DATA.crew.map(c => {
        const m = S.member(c.id);
        return '<button class="crew-card" data-id="' + c.id + '"><span class="avatar xl" style="--h:' + m.hue + '">' + A.initials(c.name) + '</span><b>' + esc(c.name) + '</b><small>' + esc(c.role) + '</small></button>';
      }).join('');
      return '<div class="welcome"><div class="inner enter">' +
        '<div id="wSophie" class="sophie-frame" style="width:min(200px,46vw)"></div>' +
        '<h1>Qui est là ?</h1><p class="lead">Je suis Sophie. Je prends soin de la santé de l\'équipage pendant la mission, avec Keiko, notre médecin de bord.</p>' +
        '<div class="crew-pick">' + cards + '</div>' +
        '<p class="cmo-entry"><button class="btn ghost" data-cmo>' + icon('stetho') + 'Entrer comme médecin de bord</button></p></div></div>';
    },
    mount(node) {
      this.ch = A.character.create($('#wSophie', node));
      this.ch.setEmotion('happy');
      node.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { S.setWho(b.dataset.id, 'crew'); A.go('accueil'); });
      node.querySelector('[data-cmo]').onclick = () => { S.setWho(S.cmoId(), 'cmo'); A.go('cmo'); };
    },
    unmount() { if (this.ch) this.ch.destroy(); }
  };

  /* ================================================================ */
  /* Accueil                                                           */
  /* ================================================================ */
  function ringSVG(frac, color, size) {
    const r = 20, c = 2 * Math.PI * r;
    return '<svg class="ring" viewBox="0 0 46 46"><circle cx="23" cy="23" r="' + r + '" stroke="rgba(255,255,255,.12)" stroke-width="4" fill="none"/><circle cx="23" cy="23" r="' + r + '" stroke="' + color + '" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - A.clamp(frac, 0, 1))).toFixed(1) + '" style="transition:stroke-dashoffset 1s var(--ease)"/></svg>';
  }
  A.ringSVG = ringSVG;

  function greeting(id) {
    const p = S.profile(id);
    const first = A.first(p.name);
    const hello = A.greet(S.minute()) + ' ' + first + '.';
    const lvls = ['temp', 'hr', 'spo2'].map(k => S.lastMeasure(id, k)).filter(x => x && x.d === S.day());
    const dm = A.gamify.dayMissions(id);
    // une seule chose à dire, la plus utile
    if (lvls.some(x => x.lvl !== 'normal')) return hello + ' Une de tes mesures de ce matin est à regarder.';
    if (dm.sante.kind === 'conference' && !dm.sante.done) return hello + ' Ta conférence de la semaine t\'attend.';
    if (!lvls.length) return hello + ' Commençons par tes mesures du jour ?';
    const left = Math.max(0, A.gamify.GOALS.cardio - dm.sport.cardio) + Math.max(0, A.gamify.GOALS.force - dm.sport.force);
    if (left > 0) return hello + ' Tout va bien. Il te reste ' + left + ' minutes de sport.';
    return hello + ' Tout est fait pour aujourd\'hui. Bravo !';
  }

  A.views.accueil = {
    render(node) {
      const id = S.state.who, m = S.member(id);
      const name = S.sophieName(id);
      const dm = A.gamify.dayMissions(id);
      const G = A.gamify.GOALS;
      const sportFrac = (Math.min(dm.sport.cardio, G.cardio) + Math.min(dm.sport.force, G.force)) / (G.cardio + G.force);
      const vid = dm.video.v;
      const conf = S.confDue(id);
      const santeQ = dm.sante.kind === 'conference'
        ? { go: 'conference', ic: 'call', b: dm.sante.done ? 'Conférence faite' : 'Ta conférence', s: dm.sante.done ? 'Merci, à la semaine prochaine' : '15 minutes avec ' + name }
        : { go: 'sante', ic: 'health', b: dm.sante.done ? 'Mesures prises' : 'Tes mesures du matin', s: dm.sante.done ? 'Normales pour toi' : 'Température, pouls, saturation' };
      const ex = S.exerciseToday(id);
      const pending = m.triages.length ? m.triages[m.triages.length - 1] : null;
      const doors = [
        ['sante', 'health', 'Santé', '#7BE3C6', '#1E9E8C', S.measuredToday(id) ? 'tout va bien' : 'mesures du jour'],
        ['conference', 'call', 'Conférence', '#C9BFFF', '#6B57E8', conf.today ? 'aujourd\'hui' : 'dans ' + A.plural(conf.inDays, 'jour')],
        ['journal', 'journal', 'Journal', '#FFC7E6', '#C2569E', 'privé'],
        ['videos', 'video', 'Vidéos', '#9FD8FF', '#2F6FE0', dm.video.done ? 'vue' : '1 à voir'],
        ['simulations', 'sim', 'Simulations', '#FFB8A8', '#D9534F', '4 urgences'],
        ['evasion', 'escape', 'Évasion', '#A8F0E0', '#2A8FB0', '4 lieux'],
        ['defis', 'trophy', 'Défis', '#FFE3A3', '#E08A1E', A.gamify.streak(m) + ' j de suite']
      ];
      return '<div class="home">' +
        '<div class="sophie-frame" id="hSophie" role="button" tabindex="0" aria-label="Parler à ' + esc(name) + '"></div>' +
        '<p class="say" id="hSay" aria-live="polite"></p>' +
        '<p class="heard" id="hHeard"></p>' +
        '<div class="talkbar"><button class="mic" id="hMic">' + icon('mic') + '<span>Parler à ' + esc(name) + '</span></button><button class="btn" id="hWrite">' + icon('keyboard') + 'Écrire</button></div>' +
        '<form class="ask" id="hAsk" hidden><input id="hIn" autocomplete="off" placeholder="Écris ce que tu veux faire ou voir" aria-label="Écrire à ' + esc(name) + '"><button class="icon-btn" aria-label="Envoyer">' + icon('send') + '</button></form>' +
        '<div class="chips" id="hChips">' + ['Je ne me sens pas bien', 'Mes mesures', 'Une pause au lac', 'Ma vidéo du jour'].map(c => '<button class="chip" data-say="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
        '<div class="today-head"><span>Aujourd\'hui</span><span>' + (pending && pending.d === S.day() ? 'Orientation en cours : ' + esc(pending.ficheNom || '') : '') + '</span></div>' +
        '<div class="today">' +
          '<button class="q' + (dm.sport.done ? ' done' : '') + '" data-go="defis"><span class="qmark">' + ringSVG(sportFrac, '#FFC870') + icon(dm.sport.done ? 'check' : 'bike') + '</span><span class="t"><b>' + (dm.sport.done ? 'Sport fait' : 'Ton sport') + '</b><small>' + (ex.cardio + ex.force) + ' sur ' + (G.cardio + G.force) + ' minutes</small></span></button>' +
          '<button class="q' + (dm.video.done ? ' done' : '') + '" data-video><span class="qmark">' + ringSVG(dm.video.done ? 1 : 0, '#79D8FF') + icon(dm.video.done ? 'check' : 'play') + '</span><span class="t"><b>' + (vid ? esc(vid.title) : 'Vidéo du jour') + '</b><small>' + (dm.video.done ? 'Regardée' : (vid ? Math.max(1, Math.round(vid.dur / 60)) + ' min · ' + esc(vid.reason || '') : '')) + '</small></span></button>' +
          '<button class="q' + (dm.sante.done ? ' done' : '') + '" data-go="' + santeQ.go + '"><span class="qmark">' + ringSVG(dm.sante.done ? 1 : 0, '#7BE3C6') + icon(dm.sante.done ? 'check' : santeQ.ic) + '</span><span class="t"><b>' + esc(santeQ.b) + '</b><small>' + esc(santeQ.s) + '</small></span></button>' +
        '</div>' +
        '<nav class="doors" aria-label="Espaces">' + doors.map(d => '<button class="door" data-go="' + d[0] + '"><span class="disc" style="--a:' + d[3] + ';--b:' + d[4] + '">' + icon(d[1]) + '</span><span class="lab">' + d[2] + '</span><span class="sub">' + esc(d[5]) + '</span></button>').join('') + '</nav>' +
        '</div>';
    },
    mount(node) {
      const id = S.state.who;
      const ch = this.ch = A.character.create($('#hSophie', node));
      A.talk.attach(ch, $('#hSay', node), $('#hHeard', node));
      const mic = $('#hMic', node);
      const setMic = s => { mic.classList.toggle('on', s === 'listening'); mic.querySelector('span').textContent = s === 'listening' ? 'Je t\'écoute' : 'Parler à ' + S.sophieName(id); };
      mic.onclick = () => A.talk.listen({ onState: setMic, fallback: () => { $('#hAsk', node).hidden = false; $('#hIn', node).focus(); } });
      $('#hSophie', node).onclick = () => mic.click();
      $('#hSophie', node).onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mic.click(); } };
      $('#hWrite', node).onclick = () => { const f = $('#hAsk', node); f.hidden = !f.hidden; if (!f.hidden) $('#hIn', node).focus(); };
      $('#hAsk', node).onsubmit = e => { e.preventDefault(); const i = $('#hIn', node); const v = i.value; i.value = ''; A.talk.handle(v); };
      node.querySelectorAll('[data-say]').forEach(b => b.onclick = () => A.talk.handle(b.dataset.say));
      node.querySelectorAll('[data-go]').forEach(b => b.onclick = () => A.go(b.dataset.go));
      const vb = node.querySelector('[data-video]');
      if (vb) vb.onclick = () => A.videos.play('daily');
      this.off = A.on('reply', r => {
        const box = $('#hChips', node);
        if (box && r.chips && r.chips.length) box.innerHTML = r.chips.map(c => '<button class="chip" data-say="' + esc(c) + '">' + esc(c) + '</button>').join('');
        if (box) box.querySelectorAll('[data-say]').forEach(b => b.onclick = () => A.talk.handle(chipToText(b.dataset.say, r)));
      });
      const text = greeting(id);
      const m = S.member(id);
      const speak = !greeted[id] && m.prefs.guided;
      greeted[id] = true;
      if (speak) setTimeout(() => A.talk.say(text, { emotion: 'happy' }), 350);
      else { $('#hSay', node).innerHTML = text.split(/\s+/).map(w => '<span class="w on">' + esc(w) + '</span>').join(' '); }
    },
    unmount() { A.talk.detach(this.ch); if (this.ch) this.ch.destroy(); if (this.off) this.off(); A.voice.stop(); }
  };
  function chipToText(label, r) {
    if (label === 'Voir la fiche' && r && r.fiche) { A.ficheSheet(r.fiche); return ''; }
    if (label === 'J\'ai ces signes') return 'je ne me sens pas bien';
    if (label === 'Le lac') return 'emmène-moi au lac';
    if (label === 'Le désert') return 'emmène-moi au désert';
    if (label === 'Mon journal') return 'ouvre mon journal';
    if (label === 'En parler') return 'je veux en parler';
    if (label === 'Ma conférence') return 'ma conférence';
    if (label === 'Oui, on y va') return 'on y va';
    if (label === 'Plus tard') return 'merci';
    if (label === 'Respiration guidée') return 'emmène-moi au lac';
    if (label === 'Regarder ça ensemble' && r && r.triageText) { A.act({ type: 'triage', text: r.triageText }); return ''; }
    if (label === 'Garde-le dans mon journal' && r && r.keep) { A.brain.endListening(); A.act({ type: 'journal', text: r.keep }); A.talk.say('C\'est gardé dans ton journal. Il reste entre toi et moi.', { emotion: 'happy' }); return ''; }
    if (label === 'Appeler Keiko') return 'appelle Keiko';
    return label;
  }
  A.chipToText = chipToText;

  /* ================================================================ */
  /* Santé                                                             */
  /* ================================================================ */
  const MET = {
    temp: { label: 'Température', icon: 'temp', unit: '°C', d: 1, color: '#FFB38A' },
    hr: { label: 'Pouls au repos', icon: 'pulse', unit: '/min', d: 0, color: '#FF8FA3' },
    spo2: { label: 'Saturation', icon: 'drop', unit: '%', d: 0, color: '#79D8FF' },
    sleep: { label: 'Sommeil', icon: 'moon', unit: 'h', d: 1, color: '#B3A6FF' }
  };
  function spark(arr, color, ref) {
    const vals = arr.map(x => x.v);
    if (vals.length < 2) return '';
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (ref) { lo = Math.min(lo, ref.lo); hi = Math.max(hi, ref.hi); }
    const pad = (hi - lo) * 0.15 || 1;
    lo -= pad; hi += pad;
    const W = 200, H = 38;
    const X = i => (i / (vals.length - 1)) * W, Y = v => H - ((v - lo) / (hi - lo)) * H;
    const d = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const band = ref ? '<rect x="0" y="' + Y(ref.hi).toFixed(1) + '" width="' + W + '" height="' + Math.max(1, Y(ref.lo) - Y(ref.hi)).toFixed(1) + '" fill="' + color + '" opacity=".1" rx="4"/>' : '';
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + band + '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="' + X(vals.length - 1) + '" cy="' + Y(vals[vals.length - 1]).toFixed(1) + '" r="3.5" fill="' + color + '"/></svg>';
  }
  function levelWord(l) { return l === 'normal' ? ['ok', 'Normal pour toi'] : l === 'vigilance' ? ['warn', 'À reprendre'] : ['bad', 'À regarder vite']; }

  A.health = {
    summarySentence(id) {
      const parts = [];
      ['temp', 'hr', 'spo2'].forEach(k => {
        const l = S.lastMeasure(id, k);
        if (l) parts.push(MET[k].label.toLowerCase().replace(' au repos', '') + ' ' + A.num(l.v, MET[k].d) + (k === 'temp' ? ' degrés' : k === 'spo2' ? ' %' : ''));
      });
      const bad = ['temp', 'hr', 'spo2'].some(k => { const l = S.lastMeasure(id, k); return l && l.lvl !== 'normal'; });
      return 'Dernières mesures : ' + parts.join(', ') + '. ' + (bad ? 'Une valeur est à regarder.' : 'Tout est normal pour toi.');
    }
  };

  A.views.sante = {
    render() {
      const id = S.state.who, m = S.member(id);
      const last = k => S.lastMeasure(id, k);
      const anyBad = ['temp', 'hr', 'spo2'].some(k => last(k) && last(k).lvl !== 'normal' && last(k).d >= S.day() - 1);
      const conf = S.confDue(id);
      const vit = ['temp', 'hr', 'spo2', 'sleep'].map(k => {
        const arr = m.measures[k].slice(-14);
        const l = arr[arr.length - 1];
        const ref = k !== 'sleep' ? S.reference(id, k) : null;
        const lv = k === 'sleep' ? (l && l.v < 6 ? ['warn', 'Un peu court'] : ['ok', 'Reposant']) : levelWord(l ? l.lvl : 'normal');
        return '<button class="vital" data-detail="' + k + '"><span class="k">' + icon(MET[k].icon) + MET[k].label + '</span><span class="v">' + (l ? A.num(l.v, MET[k].d) : '·') + '<small>' + MET[k].unit + '</small></span><span class="s"><i class="dot ' + (lv[0] === 'ok' ? '' : lv[0]) + '"></i>' + lv[1] + (l ? ' · ' + A.dayLabel(l.d, S.day()) : '') + '</span>' + spark(arr, MET[k].color, ref) + '</button>';
      }).join('');
      const tr = S.state.validations.filter(v => v.who === id).slice(0, 3);
      return '<div class="enter">' +
        '<div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Ma santé</h1></div><button class="btn primary" data-measure>' + icon('plus') + 'Prendre une mesure</button></div>' +
        '<div class="panel status-hero ' + (anyBad ? 'warn' : '') + '"><span class="halo">' + icon(anyBad ? 'info' : 'check') + '</span><div><h2>' + (anyBad ? 'Une mesure est à regarder' : 'Tout va bien pour toi') + '</h2><p class="muted">' + (anyBad ? 'Rien d\'alarmant pour l\'instant. Je te propose de la reprendre.' : 'Tes mesures sont dans ta plage habituelle, en tenant compte de l\'apesanteur.') + '</p></div></div>' +
        '<div class="vitals" style="margin-top:20px">' + vit + '</div>' +
        '<div class="grid2" style="margin-top:20px">' +
          '<button class="feel-btn" data-triage><span class="ic">' + icon('hand') + '</span><span><b>Je ne me sens pas bien</b><small>Dis-le à ' + esc(S.sophieName(id)) + ', elle t\'oriente en quelques questions.</small></span></button>' +
          '<button class="feel-btn" data-go="conference" style="background:linear-gradient(120deg, rgba(121,216,255,.16), rgba(179,166,255,.08));border-color:rgba(121,216,255,.3)"><span class="ic" style="background:rgba(121,216,255,.2);color:var(--atmo)">' + icon('call') + '</span><span><b>Ma conférence de la semaine</b><small>' + (conf.today ? 'C\'est aujourd\'hui, 15 minutes.' : 'Dans ' + A.plural(conf.inDays, 'jour') + '.') + '</small></span></button>' +
        '</div>' +
        (tr.length ? '<div class="panel" style="margin-top:20px"><div class="panel-title"><h3>' + icon('pill') + 'Mes traitements</h3></div><div class="stack">' + tr.map(v => '<div class="spread"><span>' + esc(v.medNom || 'Gestes de la fiche') + ' <span class="faint small">· ' + esc(v.ficheNom) + '</span></span><span class="tag ' + (v.statut === 'validé' ? 'ok' : v.statut === 'refusé' ? 'bad' : 'warn') + '">' + (v.statut === 'attente' ? 'Keiko va valider' : v.statut === 'validé' ? 'Validé par Keiko' : 'Non retenu') + '</span></div>').join('') + '</div></div>' : '') +
        '</div>';
    },
    mount(node, params) {
      node.querySelector('[data-back]').onclick = () => A.go('accueil');
      node.querySelector('[data-measure]').onclick = () => measureSheet('temp');
      node.querySelector('[data-triage]').onclick = () => A.go('triage');
      node.querySelectorAll('[data-go]').forEach(b => b.onclick = () => A.go(b.dataset.go));
      node.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => detailSheet(b.dataset.detail));
      if (params.mesure) setTimeout(() => measureSheet(params.mesure), 300);
    }
  };

  function detailSheet(k) {
    const id = S.state.who, m = S.member(id);
    const arr = m.measures[k].slice(-30);
    const ref = k !== 'sleep' ? S.reference(id, k) : null;
    const W = 560, H = 200;
    const vals = arr.map(x => x.v);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (ref) { lo = Math.min(lo, ref.lo); hi = Math.max(hi, ref.hi); }
    const pad = (hi - lo) * 0.2 || 1; lo -= pad; hi += pad;
    const X = i => 30 + (i / Math.max(1, vals.length - 1)) * (W - 40), Y = v => H - 20 - ((v - lo) / (hi - lo)) * (H - 40);
    const path = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const band = ref ? '<rect x="30" y="' + Y(ref.hi).toFixed(1) + '" width="' + (W - 40) + '" height="' + (Y(ref.lo) - Y(ref.hi)).toFixed(1) + '" fill="' + MET[k].color + '" opacity=".1" rx="6"/><text x="' + (W - 12) + '" y="' + (Y(ref.hi) - 6).toFixed(1) + '" fill="#8C95C2" font-size="11" text-anchor="end">ta plage normale</text>' : '';
    const dots = arr.map((x, i) => '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(x.v).toFixed(1) + '" r="3" fill="' + (x.lvl && x.lvl !== 'normal' ? '#FFB65C' : MET[k].color) + '"/>').join('');
    const explain = k === 'temp' ? 'En apesanteur, la température du corps monte d\'environ 1 °C en deux à trois mois (Stahn, 2017). Ta plage normale en tient compte, avec ta référence d\'avant le départ.' :
      k === 'hr' ? 'Ton pouls au repos est comparé à ta propre référence, pas à une moyenne. Un effort ou un stress récent est pris en compte.' :
      k === 'spo2' ? 'Une saturation basse fait d\'abord vérifier le capteur et l\'oxygène de la cabine, puis le corps. En dessous de 90 %, c\'est toujours une alerte.' :
      'Environ 6 heures par nuit, c\'est la moyenne en mission. Un sommeil court plusieurs nuits de suite se rattrape mieux en en parlant tôt.';
    A.sheet(MET[k].label, '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">' + band + '<path d="' + path + '" fill="none" stroke="' + MET[k].color + '" stroke-width="2.4" stroke-linejoin="round"/>' + dots + '<text x="30" y="' + (H - 4) + '" fill="#8C95C2" font-size="11">jour ' + arr[0].d + '</text><text x="' + (W - 10) + '" y="' + (H - 4) + '" fill="#8C95C2" font-size="11" text-anchor="end">aujourd\'hui</text></svg><p class="muted" style="margin-top:14px">' + explain + '</p>' + (k !== 'sleep' ? '<div class="row" style="margin-top:18px"><button class="btn primary" id="dMeasure">' + icon('plus') + 'Prendre une mesure</button></div>' : ''), { wide: true });
    const b = $('#dMeasure');
    if (b) b.onclick = () => { A.closeSheet(); measureSheet(k); };
  }

  function measureSheet(metric) {
    const id = S.state.who;
    let k = metric || 'temp';
    const cfg = () => DATA.metrics[k];
    const start = () => { const l = S.lastMeasure(id, k); return l ? l.v : (k === 'temp' ? 37.2 : k === 'hr' ? 62 : 98); };
    let val = start();
    const ctx = { effort: false, stress: false, antipyretique: false };
    const sh = A.sheet('Prendre une mesure',
      '<div class="stack-lg"><div class="seg" role="group" aria-label="Mesure" id="mSeg">' + ['temp', 'hr', 'spo2'].map(x => '<button data-k="' + x + '" aria-pressed="' + (x === k) + '">' + MET[x].label + '</button>').join('') + '</div>' +
      '<div class="stepper"><button class="icon-btn" id="mMinus" aria-label="Moins">' + icon('minus') + '</button><div class="val" id="mVal" aria-live="polite"></div><button class="icon-btn" id="mPlus" aria-label="Plus">' + icon('plus') + '</button></div>' +
      '<div><p class="muted small" style="margin-bottom:10px">Dans l\'heure qui précède :</p><div class="row wrap" id="mCtx">' +
      [['effort', 'J\'ai fait du sport'], ['stress', 'J\'ai été stressé'], ['antipyretique', 'J\'ai pris un médicament contre la fièvre']].map(([c, l]) => '<button class="chip" data-c="' + c + '" aria-pressed="false">' + l + '</button>').join('') + '</div></div>' +
      '<div id="mRes"></div><button class="btn primary big block" id="mSave">' + icon('check') + 'Enregistrer</button></div>');
    const paint = () => { sh.querySelector('#mVal').innerHTML = A.num(val, cfg().decimals) + '<small>' + cfg().unit + '</small>'; };
    paint();
    sh.querySelectorAll('#mSeg button').forEach(b => b.onclick = () => { k = b.dataset.k; val = start(); sh.querySelectorAll('#mSeg button').forEach(x => x.setAttribute('aria-pressed', x === b)); paint(); });
    sh.querySelector('#mMinus').onclick = () => { val = +(val - cfg().step).toFixed(cfg().decimals); paint(); };
    sh.querySelector('#mPlus').onclick = () => { val = +(val + cfg().step).toFixed(cfg().decimals); paint(); };
    sh.querySelectorAll('#mCtx [data-c]').forEach(b => b.onclick = () => { ctx[b.dataset.c] = !ctx[b.dataset.c]; b.setAttribute('aria-pressed', ctx[b.dataset.c]); });
    sh.querySelector('#mSave').onclick = () => {
      const context = {};
      if (ctx.effort) context.effort = true;
      if (ctx.stress) context.stress = true;
      if (ctx.antipyretique) context.antipyretique = true;
      const res = S.addMeasure(id, k, val, context);
      const box = sh.querySelector('#mRes');
      if (res.status === 'rejected') { box.innerHTML = '<div class="env-note">' + icon('info') + '<p>Cette valeur n\'est pas possible pour un corps humain. Vérifie le capteur et recommence.</p></div>'; return; }
      if (res.status === 'retake') { box.innerHTML = '<div class="env-note">' + icon('info') + '<p>Cette valeur est très loin de tes mesures habituelles. Le plus souvent, c\'est le capteur. Reprends-la calmement dans quelques minutes.</p></div>'; return; }
      const ev = res.ev;
      const terr = ev.terrestrial;
      let text = '';
      if (k === 'temp') {
        const shift = E.spatialOffset(DATA.metrics.temp, S.now());
        text = (terr.level !== 'normal' ? 'Sur Terre, ' + A.num(val, 1) + ' °C serait une ' + terr.label + '. ' : '') + 'En apesanteur, ton corps est plus chaud d\'environ ' + A.num(shift, 1) + ' °C. ';
      }
      text += ev.level === 'normal' ? 'Pour toi, aujourd\'hui, c\'est normal.' : ev.level === 'vigilance' ? 'C\'est un peu en dehors de ta plage habituelle. Reprends cette mesure ' + (k === 'temp' ? 'dans deux heures.' : 'après dix minutes de repos.') : 'C\'est loin de ta plage habituelle. Je préviens Keiko.';
      if (ctx.antipyretique && k === 'temp') text += ' Attention : un médicament contre la fièvre peut cacher une fièvre.';
      box.innerHTML = '<div class="panel tight" style="background:' + (ev.level === 'normal' ? 'rgba(123,227,198,.1)' : 'rgba(255,182,92,.12)') + '"><div class="row"><i class="dot ' + (ev.level === 'normal' ? '' : 'warn') + '"></i><b>' + (ev.level === 'normal' ? 'Normal pour toi' : 'À regarder') + '</b></div><p style="margin-top:8px">' + esc(text) + '</p></div>';
      const btn = sh.querySelector('#mSave');
      btn.innerHTML = icon('check') + 'Terminé';
      btn.onclick = () => { A.closeSheet(); A.render(); };
      A.dockSay(text, ev.level === 'normal' ? 'happy' : 'concerned');
      A.celebrate(res.reward, 'mesure du jour');
    };
  }
  A.measureSheet = measureSheet;

  /* ================================================================ */
  /* Je ne me sens pas bien : orientation guidée (R-RAI)               */
  /* ================================================================ */
  const BODY = '<svg viewBox="0 0 200 420" role="group" aria-label="Où as-tu mal ?">' +
    '<path class="zone" data-z="tete" tabindex="0" aria-label="Tête" d="M100 12c20 0 34 15 34 36s-14 38-34 38-34-17-34-38 14-36 34-36Z"/>' +
    '<path class="zone" data-z="orl" tabindex="0" aria-label="Cou et gorge" d="M86 84h28l3 22H83Z"/>' +
    '<path class="zone" data-z="poitrine" tabindex="0" aria-label="Poitrine" d="M62 108c10-5 66-5 76 0l8 70H54Z"/>' +
    '<path class="zone" data-z="ventre" tabindex="0" aria-label="Ventre" d="M54 180h92l-4 74H58Z"/>' +
    '<path class="zone" data-z="membres" tabindex="0" aria-label="Bras" d="M60 110 34 196l-10 68 14 4 18-66 10-40ZM140 110l26 86 10 68-14 4-18-66-10-40Z"/>' +
    '<path class="zone" data-z="membres" tabindex="0" aria-label="Jambes" d="M60 256h38l-4 150H74ZM102 256h38l-12 150h-20Z"/>' +
    '</svg>';
  const ZONE_CHIPS = ['tete', 'yeux', 'orl', 'bouche', 'poitrine', 'ventre', 'dos', 'membres', 'peau', 'general', 'moral'];

  A.views.triage = {
    render() {
      return '<div class="enter" id="trRoot"></div>';
    },
    mount(node, params) {
      const id = S.state.who;
      const self = this;
      const root = $('#trRoot', node);
      const sess = A.kb.triage(id);
      const pats = A.brain.patterns();
      let initial = params.t || '';
      self.sess = sess;
      const say = (t, e) => { if (S.member(id).prefs.guided) A.dockSay(t, e); };

      const head = (title, sub) => '<div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div></div>';
      const bindBack = () => { const b = root.querySelector('[data-back]'); if (b) b.onclick = () => A.go('sante'); };

      function checkUrgent() {
        const st = sess.state();
        if (st.urgences.length) {
          const u = st.urgences[0];
          save(st, 'urgence');
          A.emergency.open(u.type === 'signe' ? VOCAB.URGENCES.find(x => x.ref === u.ref) : { ref: 'Fiche ' + u.fiche, titre: u.titre, penser: u.nom, gestes: LIB.sentences(A.kb.get(u.fiche).textes.bord).slice(0, 3).concat(['Keiko est prévenue']) }, initial);
          return true;
        }
        return false;
      }
      function start() {
        root.innerHTML = head('Qu\'est-ce qui ne va pas ?', 'Touche l\'endroit, choisis ce qui te ressemble, ou dis-le à ' + S.sophieName(id) + '.') +
          '<div class="panel"><div class="bodymap"><div>' + BODY + '</div><div class="stack-lg">' +
          '<div><p class="muted small" style="margin-bottom:10px">Ou choisis une partie du corps</p><div class="zone-list">' + ZONE_CHIPS.map(z => '<button class="chip" data-zone="' + z + '" aria-pressed="false">' + esc(VOCAB.ZONES.find(x => x.id === z).label) + '</button>').join('') + '</div></div>' +
          '<div id="trFacts"></div>' +
          '<div class="talkbar" style="justify-content:flex-start;margin-top:6px"><button class="mic" id="trMic">' + icon('mic') + '<span>Le dire</span></button></div>' +
          '<form class="ask" id="trAsk" style="margin:0"><input id="trIn" autocomplete="off" placeholder="Par exemple : j\'ai mal à la tête depuis ce matin" aria-label="Décris ce que tu ressens"><button class="icon-btn" aria-label="Envoyer">' + icon('send') + '</button></form>' +
          '</div></div></div>';
        bindBack();
        const showZone = z => {
          root.querySelectorAll('[data-zone]').forEach(b => b.setAttribute('aria-pressed', b.dataset.zone === z));
          root.querySelectorAll('.zone').forEach(p => p.classList.toggle('on', p.dataset.z === z));
          const zone = VOCAB.ZONES.find(x => x.id === z);
          root.querySelector('#trFacts').innerHTML = '<p class="muted small" style="margin-bottom:10px">Qu\'est-ce que tu ressens ? Touche tout ce qui va.</p><div class="facts row wrap">' + zone.facts.map(f => '<button class="chip" data-fact="' + f + '" aria-pressed="false">' + esc(VOCAB.FACTS[f].label) + '</button>').join('') + '</div><button class="btn sophie" id="trGo" style="margin-top:16px" disabled>' + icon('next') + 'Continuer</button>';
          const chosen = new Set();
          root.querySelectorAll('[data-fact]').forEach(b => b.onclick = () => { const f = b.dataset.fact; if (chosen.has(f)) chosen.delete(f); else chosen.add(f); b.setAttribute('aria-pressed', chosen.has(f)); root.querySelector('#trGo').disabled = !chosen.size; });
          root.querySelector('#trGo').onclick = () => { chosen.forEach(f => sess.setFact(f, true, 'choix')); initial = Array.from(chosen).map(f => VOCAB.FACTS[f].label).join(', '); if (!checkUrgent()) ask(); };
        };
        root.querySelectorAll('.zone').forEach(p => { p.onclick = () => showZone(p.dataset.z); p.onkeydown = e => { if (e.key === 'Enter') showZone(p.dataset.z); }; });
        root.querySelectorAll('[data-zone]').forEach(b => b.onclick = () => showZone(b.dataset.zone));
        const submit = txt => {
          if (!txt) return;
          initial = txt;
          const f = sess.addText(txt, pats);
          if (!f.facts.filter(x => !x.neg).length) { A.toast(icon('info') + 'Je n\'ai pas reconnu de signe. Choisis une partie du corps.'); return; }
          if (!checkUrgent()) ask();
        };
        root.querySelector('#trAsk').onsubmit = e => { e.preventDefault(); submit(root.querySelector('#trIn').value); };
        const mic = root.querySelector('#trMic');
        mic.onclick = () => A.talk.listen({ onFinal: submit, onState: s => mic.classList.toggle('on', s === 'listening'), onInterim: s => { root.querySelector('#trIn').value = s; } });
        say('Dis-moi où tu as mal, ou ce que tu ressens.', 'concerned');
      }

      function ask() {
        const st = sess.state();
        if (st.stop || !st.next) return result(st);
        const q = st.next;
        const max = sess.settings.arretQuestions;
        root.innerHTML = head('Quelques questions', initial ? 'Tu as dit : ' + initial : '') +
          '<div class="panel qcard"><div class="progress-dots" aria-label="Question ' + (st.asked + 1) + ' sur ' + max + ' au plus">' + Array.from({ length: max }, (_, i) => '<i class="' + (i <= st.asked ? 'on' : '') + '"></i>').join('') + '</div>' +
          '<p class="q">' + esc(q.question) + '</p>' + (q.kind === 'alarme' ? '<p class="why">Je vérifie d\'abord que ce n\'est pas urgent.</p>' : '') +
          '<div class="answers"><button class="btn primary big" data-a="1">' + icon('check') + 'Oui</button><button class="btn big" data-a="0">' + icon('close') + 'Non</button><button class="btn ghost big" data-a="">Je ne sais pas</button></div>' +
          '<div class="talkbar"><button class="btn ghost small" id="qMic">' + icon('mic') + 'Répondre à voix haute</button></div></div>';
        bindBack();
        const answer = v => { sess.answer(q.code, v === '' ? null : v === '1'); if (!checkUrgent()) ask(); };
        root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => answer(b.dataset.a));
        root.querySelector('#qMic').onclick = () => A.talk.listen({ onFinal: txt => { const t = LIB.normalize(txt); if (/\b(oui|ouais|exact|effectivement|un peu|beaucoup)\b/.test(t)) answer('1'); else if (/\b(non|pas du tout|aucun|jamais)\b/.test(t)) answer('0'); else answer(''); } });
        say(q.question, q.kind === 'alarme' ? 'concerned' : 'neutral');
      }

      function save(st, statut, extra) {
        const top = st.top[0];
        return S.addTriage(id, Object.assign({ texte: initial, facts: Object.keys(st.known).filter(k => st.known[k]), connus: st.known, top: st.top.map(t => ({ id: t.id, nom: t.nom, p: t.p, pour: t.pour, contre: t.contre })), autre: st.autre, statut, fiche: top ? top.id : null, ficheNom: top ? top.nom : null }, extra || {}));
      }

      function result(st) {
        const top = st.top[0];
        const f = A.kb.get(top.id);
        const plan = A.kb.plan(f, id);
        const known = st.known;
        const pco2 = S.state.settings.pco2;
        const envFirst = pco2 > 3 && (known.cephalee || known.fatigue || known.insomnie);
        const word = top.p >= 0.8 ? 'Très probable' : top.p >= 0.5 ? 'Probable' : 'Possible';
        const sentences = LIB.sentences(f.textes.bord);
        const crewSteps = f.options.filter(o => o.competence === 'astronaute').map(o => o.action).slice(0, 3);
        const steps = (crewSteps.length ? crewSteps : sentences.slice(0, 2));
        const med = plan.propose ? plan.propose.ressources.find(r => !r.materiel && !r.blocked) : null;
        const tr = save(st, st.reconnu ? 'orientation' : 'non reconnu', { medId: med ? med.id : null });
        let v = null;
        if (st.reconnu) v = S.proposeTreatment(id, { triage: tr.id, fiche: f.id, ficheNom: f.nom, p: top.p, med: med ? med.id : null, medNom: med ? med.name : null, checks: med ? med.checks : null, autres: st.top.slice(1).map(t => ({ nom: t.nom, p: t.p })), pour: top.pour, contre: top.contre, texte: initial, allBlocked: plan.allBlocked });
        else S.alert({ who: id, niveau: 'vigilance', titre: 'Tableau non reconnu', texte: A.first(S.profile(id).name) + ' : « ' + initial + ' »' });
        const alarmeSimple = f.textes.alarme && !/^aucun/i.test(f.textes.alarme) ? f.textes.alarme : null;
        root.innerHTML = head(st.reconnu ? 'Voici ce que je pense' : 'Je préviens Keiko') +
          (envFirst ? '<div class="env-note" style="margin-bottom:18px">' + icon('wind') + '<div><b>D\'abord l\'air de la cabine</b><p class="muted">Le CO₂ est à ' + A.num(pco2, 1) + ' mmHg, au-dessus de la limite de 3. Un mal de tête, la fatigue ou un sommeil difficile viennent souvent de l\'air. L\'équipe environnement est prévenue.</p></div></div>' : '') +
          (st.reconnu ?
            '<div class="split"><div class="stack">' +
              '<div class="panel result-hero"><span class="kicker">Mon orientation</span><h2>' + esc(f.nom) + '</h2><div class="likely"><span class="meter"><i style="width:' + (top.p * 100).toFixed(0) + '%"></i></span>' + word + '</div><p class="muted" style="margin-top:14px">' + esc(LIB.sentences(f.textes.reconnaitre)[0] || '') + '</p><p class="faint small" style="margin-top:10px">C\'est une orientation, pas un diagnostic. Keiko décide.</p></div>' +
              '<div class="panel"><h3>' + icon('hand') + ' Ce que tu peux faire maintenant</h3><ul class="steps" style="margin-top:14px">' + steps.map((s, i) => '<li><span class="n">' + (i + 1) + '</span><span>' + esc(s) + '</span></li>').join('') + '</ul></div>' +
            '</div><div class="stack">' +
              '<div class="panel"><h3>' + icon('stetho') + ' Ce que je propose à Keiko</h3><p style="margin-top:10px">' + (med ? '<b>' + esc(med.name) + '</b>, selon la fiche. Les doses viennent de la procédure de bord.' : plan.allBlocked ? 'Aucun médicament de la fiche n\'est utilisable à bord. Keiko décide, et le sol est informé.' : 'Les gestes de la fiche, sans médicament pour l\'instant.') + '</p>' +
              (med ? '<div class="checks" style="margin-top:14px">' + med.checks.map(c => '<div class="check"><span class="st ' + c.state + '">' + icon(c.state === 'ok' ? 'check' : c.state === 'no' ? 'close' : 'info') + '</span><span class="lab muted">' + esc(c.label) + '</span><span>' + esc(c.text) + '</span></div>').join('') + '</div>' : '') +
              '<p class="tag warn" style="margin-top:14px">' + icon('clock') + 'Keiko va valider</p></div>' +
              (alarmeSimple ? '<div class="panel"><h3>' + icon('alert') + ' Si ça s\'aggrave</h3><p class="muted" style="margin-top:8px">' + esc(alarmeSimple) + ' Dans ce cas, appelle-moi tout de suite.</p></div>' : '') +
            '</div></div>'
            : '<div class="panel result-hero"><h2>Je ne reconnais pas bien ce que tu ressens</h2><p class="muted" style="margin-top:10px">Ce n\'est pas forcément grave, mais je préfère que Keiko te voie. Je lui ai transmis tes mots exacts.</p></div>') +
          '<div class="row wrap" style="margin-top:22px"><button class="btn primary" data-done>' + icon('check') + 'Compris</button><button class="btn" data-fiche>' + icon('book') + 'Voir la fiche</button><button class="btn ghost" data-redo>' + icon('replay') + 'Recommencer</button></div>';
        bindBack();
        root.querySelector('[data-done]').onclick = () => A.go('sante');
        root.querySelector('[data-fiche]').onclick = () => A.ficheSheet(f.id);
        root.querySelector('[data-redo]').onclick = () => A.go('triage', { r: Date.now() });
        const spoken = st.reconnu ? (envFirst ? 'Le CO₂ de la cabine est un peu haut, ça peut suffire à l\'expliquer. ' : '') + 'Je pense plutôt à : ' + f.nom + '. J\'ai envoyé ma proposition à Keiko.' : 'Je ne reconnais pas bien ce que tu ressens. J\'ai prévenu Keiko avec tes mots exacts.';
        say(spoken, st.reconnu ? 'neutral' : 'concerned');
      }

      if (initial) {
        const f = sess.addText(initial, pats);
        if (!checkUrgent()) { if (f.facts.filter(x => !x.neg).length) ask(); else start(); }
      } else start();
    },
    unmount() { A.voice.stopListening(); }
  };

  /* Fiche lisible (astronaute et médecin) */
  A.ficheSheet = (fid) => {
    const f = A.kb.get(fid);
    if (!f) return;
    const rows = [['reconnaitre', 'Comment le reconnaître'], ['alarme', 'Signes d\'alarme'], ['bord', 'Ce qu\'on fait à bord'], ['sol', 'Quand appeler le sol'], ['sansSol', 'Si le sol ne répond pas'], ['clinique', 'Médecine clinique']];
    const pr = f.apriori.issTexte ? '<p class="faint small">' + esc(f.id) + ' · ISS 6 mois : ' + esc(f.apriori.issTexte) + (f.apriori.marsTexte ? ' · Mars 3 ans : ' + esc(f.apriori.marsTexte) : '') + '</p>' : '<p class="faint small">' + esc(f.id) + '</p>';
    A.sheet(f.nom, '<div class="fiche-body">' + pr + rows.filter(r => f.textes[r[0]]).map(r => '<h3>' + r[1] + '</h3><p>' + esc(f.textes[r[0]]) + '</p>').join('') + '<p class="faint small" style="margin-top:18px">Fiche ' + esc(f.version.etat) + ', version ' + esc(f.version.num) + '. Source : AURA, fiches et règles de la base de connaissances.</p></div>', { wide: true });
  };

  /* ================================================================ */
  /* Urgence (R-URG-40 à 43)                                          */
  /* ================================================================ */
  A.emergency = {
    open(u, text) {
      const id = S.state.who;
      if (!u || !id) return;
      const p = S.profile(id);
      const t0 = Date.now();
      S.alert({ who: id, niveau: 'urgence', titre: 'Urgence : ' + u.titre, texte: A.first(p.name) + (text ? ' : « ' + text + ' »' : ''), ref: u.ref });
      S.queue({ prio: 0, kind: 'urgence', who: id, titre: 'Urgence ' + u.ref + ' : ' + u.titre + ' (' + p.name + ')' });
      const cmoIsMe = S.isCmo(id);
      const el = A.el('<div class="emergency" role="alertdialog" aria-modal="true" aria-label="Urgence"><div class="wrap">' +
        '<div class="top"><span class="beacon">' + icon('alert') + '</span><div style="flex:1"><h1>' + esc(u.titre) + '</h1><p class="timer" id="emT">Début noté à ' + A.hm(S.minute()) + '</p></div><button class="icon-btn" data-x aria-label="Fermer">' + icon('close') + '</button></div>' +
        '<div class="gestes">' + u.gestes.map((g, i) => '<button class="geste" data-i="' + i + '"><span class="n">' + (i + 1) + '</span><span>' + esc(g) + '</span></button>').join('') + '</div>' +
        '<div class="alerted">' +
          '<div class="panel">' + icon('stetho') + ' <b>' + (cmoIsMe ? 'Aminata, ta suppléante, est prévenue' : 'Keiko est prévenue') + '</b><p class="muted small" style="margin-top:6px">' + (cmoIsMe ? 'Tu es la personne touchée : AURA prévient la suppléante (R-URG-43).' : 'Elle a reçu l\'alerte avec ce que tu as dit.') + '</p></div>' +
          '<div class="panel">' + icon('satellite') + ' <b>Message prioritaire vers la Terre</b><p class="muted small" style="margin-top:6px">' + (S.blackout() ? 'Liaison coupée : décision à bord, le message part au retour de la liaison.' : 'Il part en tête de la file. Réponse au plus tôt dans ' + A.dur(2 * S.light() + 15) + '.') + '</p></div>' +
          '<div class="panel">' + icon('book') + ' <b>À penser d\'abord</b><p class="muted small" style="margin-top:6px">' + esc(u.penser || '') + '</p></div>' +
        '</div>' +
        '<div class="row wrap" style="margin-top:26px"><button class="btn danger big" data-call>' + icon('call') + 'Appeler Keiko maintenant</button><button class="btn ghost" data-x>C\'était une erreur</button></div>' +
        '<p class="faint small" style="margin-top:18px">' + esc(u.ref || '') + ' · Les premiers gestes sont des choix AURA à valider par un médecin. Les procédures d\'urgence existent aussi sur papier.</p>' +
        '</div></div>');
      document.body.appendChild(el);
      A.sky.paused = true;
      const timer = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); const tt = el.querySelector('#emT'); if (tt) tt.textContent = 'Depuis ' + A.mmss(s) + ' · début noté à ' + A.hm(S.minute()); }, 1000);
      el.querySelectorAll('.geste').forEach(b => b.onclick = () => b.classList.toggle('done'));
      const close = () => { clearInterval(timer); el.remove(); A.sky.paused = false; A.voice.stop(); };
      el.querySelectorAll('[data-x]').forEach(b => b.onclick = close);
      el.querySelector('[data-call]').onclick = () => { A.toast(icon('call') + 'Appel de Keiko en cours'); el.querySelector('[data-call]').innerHTML = icon('check') + 'Keiko arrive'; };
      setTimeout(() => A.talk.say(u.titre + '. ' + u.gestes.slice(0, 2).join('. ') + '. Keiko est prévenue.', { emotion: 'concerned' }), 300);
      el.querySelector('.geste').focus();
    }
  };

  /* ================================================================ */
  /* Réglages                                                          */
  /* ================================================================ */
  A.views.reglages = {
    render() {
      const id = S.state.who, m = S.member(id), st = S.state.settings;
      const seg = (name, opts, cur) => '<div class="seg" data-seg="' + name + '">' + opts.map(([v, l]) => '<button data-v="' + v + '" aria-pressed="' + (String(cur) === String(v)) + '">' + l + '</button>').join('') + '</div>';
      const tog = (name, on) => '<button class="toggle" role="switch" data-tog="' + name + '" aria-checked="' + !!on + '" aria-label="' + name + '"></button>';
      return '<div class="enter"><div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Réglages</h1></div></div>' +
        '<div class="split"><div class="panel">' +
          '<h2>' + esc(S.sophieName(id)) + '</h2>' +
          '<div class="setting"><div class="txt"><b>Son prénom</b><small>Chaque astronaute peut lui donner le sien.</small></div><input class="input" id="sName" style="max-width:200px" value="' + esc(m.prefs.sophieName) + '" aria-label="Prénom de l\'assistante"></div>' +
          '<div class="setting"><div class="txt"><b>Sa voix</b><small>Féminine par défaut.</small></div>' + seg('voice', [['f', 'Femme'], ['m', 'Homme']], m.prefs.voice) + '</div>' +
          '<div class="setting"><div class="txt"><b>Vitesse</b></div>' + seg('rate', [['0.85', 'Lente'], ['1', 'Normale'], ['1.15', 'Rapide']], m.prefs.rate || 1) + '</div>' +
          '<div class="setting"><div class="txt"><b>Me guider</b><small>Elle parle en premier et commente les écrans.</small></div>' + tog('guided', m.prefs.guided) + '</div>' +
          '<div class="setting"><div class="txt"><b>Voix activée</b></div>' + tog('sound', st.sound) + '</div>' +
          '<button class="btn" id="sTest" style="margin-top:12px">' + icon('volume') + 'L\'écouter</button>' +
        '</div><div class="panel">' +
          '<h2>Affichage</h2>' +
          '<div class="setting"><div class="txt"><b>Taille du texte</b></div>' + seg('text', [['normal', 'Normale'], ['grand', 'Grande']], document.documentElement.dataset.text || 'normal') + '</div>' +
          '<div class="setting"><div class="txt"><b>Lumière circadienne</b><small>Comme l\'éclairage de l\'ISS : plus chaude le soir, plus sombre la nuit.</small></div>' + tog('circadien', st.circadien) + '</div>' +
          '<div class="setting"><div class="txt"><b>Données de démonstration</b><small>Repartir de l\'équipage fictif du jour ' + S.day() + '.</small></div><button class="btn small ghost" id="sReset">' + icon('replay') + 'Réinitialiser</button></div>' +
        '</div></div></div>';
    },
    mount(node) {
      const id = S.state.who;
      node.querySelector('[data-back]').onclick = () => A.back();
      node.querySelector('#sName').onchange = e => { const v = e.target.value.trim() || 'Sophie'; S.setPref('sophieName', v.charAt(0).toUpperCase() + v.slice(1)); A.toast(icon('check') + 'Elle s\'appelle maintenant ' + esc(S.sophieName(id))); };
      node.querySelectorAll('[data-seg]').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => {
        sg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
        const k = sg.dataset.seg, v = b.dataset.v;
        if (k === 'voice') S.setPref('voice', v);
        if (k === 'rate') S.setPref('rate', +v);
        if (k === 'text') { document.documentElement.dataset.text = v; A.storage.set('aura-text', v); }
      }));
      node.querySelectorAll('[data-tog]').forEach(t => t.onclick = () => {
        const on = t.getAttribute('aria-checked') !== 'true';
        t.setAttribute('aria-checked', on);
        const k = t.dataset.tog;
        if (k === 'guided') S.setPref('guided', on); else S.setSetting(k, on);
        if (k === 'sound') A.renderTop();
      });
      node.querySelector('#sTest').onclick = () => A.voice.speak('Bonjour, je suis ' + S.sophieName(id) + '. Je suis là pour toi pendant toute la mission.', { gender: S.member(id).prefs.voice, rate: S.member(id).prefs.rate || 1, mute: !S.state.settings.sound });
      A.armConfirm(node.querySelector('#sReset'), 'Confirmer : tout effacer', () => { S.reset(); A.go(''); });
    }
  };
})(typeof self !== 'undefined' ? self : this);
