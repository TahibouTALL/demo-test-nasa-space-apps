/* AURA : la journée de chaque astronaute et ses rappels.
   Cinq rendez-vous au plus, à heure fixe : les mesures, le sport (cardio puis force), la vidéo du
   jour, et la conférence quand elle tombe. Le prochain est mis en avant avec le temps qui reste.
   À l'heure, un bandeau s'affiche (et une notification, si l'astronaute l'a permise).
   Un rendez-vous manqué est simplement reproposé plus tard, sans reproche. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, esc = A.esc, icon = A.icon;
  const R = A.rappels = {};
  const END = 21 * 60 + 30;          // après 21 h 30, on ne repropose plus : on reprend demain

  const BASE = [
    { key: 'mesures', min: 450, dur: 10, ic: 'health', a: '#9BF0D6', b: '#1E9E8C' },
    { key: 'cardio', min: 600, dur: 45, ic: 'bike', a: '#FFE3A3', b: '#E08A1E' },
    { key: 'video', min: 780, dur: 5, ic: 'play', a: '#B5E3FF', b: '#2F6FE0' },
    { key: 'force', min: 990, dur: 45, ic: 'dumbbell', a: '#FFD0B8', b: '#D2603C' },
    { key: 'conference', min: 1080, dur: 15, ic: 'call', a: '#D6CEFF', b: '#6B57E8' }
  ];

  const low1 = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  const up1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  R.inWords = n => n <= 1 ? 'dans une minute' : n < 60 ? 'dans ' + n + ' minutes' : n === 60 ? 'dans une heure' : 'dans ' + Math.floor(n / 60) + ' h' + (n % 60 ? ' ' + String(n % 60).padStart(2, '0') : '');
  R.inShort = n => n < 60 ? 'Dans ' + Math.max(1, n) + ' min' : 'Dans ' + Math.floor(n / 60) + ' h' + (n % 60 ? ' ' + String(n % 60).padStart(2, '0') : '');

  // l'état du jour (heures déplacées, rendez-vous remis à demain, rappels déjà faits)
  function day(m) {
    const d = S.day();
    if (!m.plan || m.plan.d !== d) m.plan = { d, moved: {}, skip: {}, told: {} };
    return m.plan;
  }

  // l'heure proposée quand on remet à plus tard : au moins une heure après, au quart d'heure
  R.proposal = () => { const q = Math.ceil((S.minute() + 60) / 15) * 15; return q <= END ? q : null; };

  // la glycémie se prend à jeun, une fois par semaine
  const gluDue = id => { const l = S.lastMeasure(id, 'glu'); return !l || S.day() - l.d >= 7; };

  function define(id, b, c) {
    const { m, G, ex, dm } = c;
    switch (b.key) {
      case 'mesures': return {
        title: 'Tes mesures du matin', short: 'Mesures', nm: 'tes mesures du matin', cta: 'Mesurer',
        sub: S.measuredToday(id) ? 'Faites pour aujourd\'hui' : 'Température, pouls, saturation et tension' + (gluDue(id) ? ', et la glycémie à jeun' : ''),
        done: S.measuredToday(id), act: () => A.go('sante'),
        now: 'C\'est l\'heure de tes mesures du matin.', soon: cd => 'Tes mesures du matin, c\'est ' + cd + '.',
        missed: 'Tes mesures du matin t\'attendent, quand tu veux.' };
      case 'cardio': return {
        title: 'Ton sport : cardio', short: 'Cardio', nm: 'ton cardio', cta: 'Commencer',
        sub: ex.cardio + ' sur ' + G.cardio + ' minutes, au vélo ou au tapis',
        done: ex.cardio >= G.cardio, act: () => A.go('defis'),
        now: 'C\'est l\'heure de ton cardio.', soon: cd => 'Ton cardio commence ' + cd + '.',
        missed: 'Ton cardio peut se faire un peu plus tard, rien ne presse.' };
      case 'video': {
        const v = dm.video.v; if (!v) return null;
        return {
          title: v.title, short: 'Vidéo', nm: 'ta vidéo du jour', cta: 'Regarder',
          sub: Math.max(1, Math.round((v.dur || 60) / 60)) + ' min' + (v.reason ? ', ' + low1(v.reason) : ''),
          done: dm.video.done, act: () => A.videos.play('daily'),
          now: 'C\'est l\'heure de ta vidéo du jour.', soon: cd => 'Ta vidéo du jour, c\'est ' + cd + '.',
          missed: 'Ta vidéo du jour t\'attend toujours, elle dure une minute.' };
      }
      case 'force': return {
        title: 'Ton sport : force', short: 'Force', nm: 'ta séance de force', cta: 'Commencer',
        sub: ex.force + ' sur ' + G.force + ' minutes de musculation',
        done: ex.force >= G.force, act: () => A.go('defis'),
        now: 'C\'est l\'heure de ta séance de force.', soon: cd => 'Ta séance de force commence ' + cd + '.',
        missed: 'Ta séance de force peut se faire un peu plus tard, rien ne presse.' };
      case 'conference': {
        if (!S.confDue(id).today) return null;
        const done = m.conferences.some(c => c.d === S.day());
        return {
          title: 'Ta conférence de la semaine', short: 'Conférence', nm: 'ta conférence de la semaine', cta: 'Commencer',
          sub: done ? 'Faite, merci' : '15 minutes avec ' + S.sophieName(id),
          done, act: () => A.go('conference'),
          now: 'C\'est l\'heure de ta conférence de la semaine.', soon: cd => 'Ta conférence de la semaine commence ' + cd + '.',
          missed: 'Ta conférence t\'attend toujours, quand tu as quinze minutes.' };
      }
    }
    return null;
  }

  // les rendez-vous du jour, dans l'ordre de l'heure, avec leur état
  R.today = id => {
    const m = S.member(id), p = day(m), now = S.minute();
    const c = { m, G: A.gamify.GOALS, ex: S.exerciseToday(id), dm: A.gamify.dayMissions(id) };
    const items = [];
    for (const b of BASE) {
      const d = define(id, b, c); if (!d) continue;
      const t = p.moved[b.key] !== undefined ? p.moved[b.key] : b.min;
      const grace = Math.max(30, b.dur);
      const status = d.done ? 'done' : p.skip[b.key] ? 'later' : now < t ? (t - now <= 90 ? 'soon' : 'upcoming') : now < t + grace ? 'now' : 'missed';
      items.push(Object.assign({ key: b.key, t, ic: b.ic, a: b.a, b: b.b, status, moved: p.moved[b.key] !== undefined }, d));
    }
    items.sort((x, y) => x.t - y.t);
    return items;
  };

  // le rendez-vous à mettre en avant : celui de maintenant, puis le prochain proche, puis un manqué
  R.next = id => {
    const it = R.today(id), now = S.minute();
    const n = it.find(x => x.status === 'now') || it.find(x => x.status === 'soon') || it.find(x => x.status === 'missed') || it.find(x => x.status === 'upcoming');
    if (!n) return null;
    n.line = n.status === 'now' ? n.now : n.status === 'soon' ? n.soon(R.inWords(n.t - now)) : n.status === 'missed' ? n.missed : 'Prochain rendez-vous : ' + n.nm + ', à ' + A.hm(n.t) + '.';
    return n;
  };

  // remettre à plus tard : une heure après au moins, ou demain si la journée est finie
  R.later = (id, key) => {
    const p = day(S.member(id)), q = R.proposal();
    if (q) { p.moved[key] = q; delete p.skip[key]; } else p.skip[key] = true;
    S.save();
    A.emit('rappels:change');
    return q;
  };
  const laterToast = q => A.toast(icon('clock') + (q ? 'C\'est noté, je te le repropose à ' + A.hm(q) + '.' : 'Pas de souci, on reprend demain.'));

  /* ---------------------------------------------------------------- */
  /* La journée sur l'accueil                                          */
  /* ---------------------------------------------------------------- */
  const canNotify = () => 'Notification' in root && root.isSecureContext !== false;
  function bell(id) {
    if (!canNotify() || Notification.permission === 'denied') return '';
    const on = S.member(id).prefs.notify && Notification.permission === 'granted';
    return '<button class="bell' + (on ? ' on' : '') + '" data-bell aria-pressed="' + on + '">' + icon(on ? 'check' : 'bell') + (on ? 'Rappels activés' : 'Me prévenir à l\'heure') + '</button>';
  }

  R.html = id => {
    const items = R.today(id), now = S.minute(), n = R.next(id);
    // la carte du prochain rendez-vous
    let hero;
    if (!n) {
      hero = '<div class="day-next s-done"><span class="disc" style="--a:#9BF0D6;--b:#1E9E8C">' + icon('check') + '</span><div class="tx"><span class="when">Journée complète</span><h3>Tout est fait pour aujourd\'hui</h3><p>Bravo. Repose-toi bien ce soir.</p></div></div>';
    } else {
      let when, sub = n.sub, ac;
      if (n.status === 'now') {
        when = 'C\'est l\'heure, ' + A.hm(n.t);
        ac = '<button class="btn primary" data-act>' + esc(n.cta) + '</button><button class="btn ghost" data-later>Plus tard</button>';
      } else if (n.status === 'missed') {
        const q = R.proposal();
        when = 'Prévu à ' + A.hm(n.t) + ', pas encore fait';
        sub = q ? 'Pas de souci : on cale ça à ' + A.hm(q) + ' ?' : 'Pas de souci, on reprend demain.';
        ac = '<button class="btn primary" data-act>Maintenant</button><button class="btn ghost" data-later>' + (q ? 'À ' + A.hm(q) : 'Demain') + '</button>';
      } else {
        when = R.inShort(n.t - now) + ', ' + A.hm(n.t);
        ac = '<button class="btn" data-act>' + esc(n.cta) + '</button>';
      }
      hero = '<div class="day-next s-' + n.status + '"><span class="disc" style="--a:' + n.a + ';--b:' + n.b + '">' + icon(n.ic) + '</span>' +
        '<div class="tx"><span class="when">' + esc(when) + '</span><h3>' + esc(n.title) + '</h3><p>' + esc(sub) + '</p></div>' +
        '<div class="ac" data-key="' + n.key + '">' + ac + '</div></div>';
    }
    // la ligne de la journée, avec le moment présent
    const k = items.length;
    let pos = null;
    if (k) {
      const ts = items.map(x => x.t);
      if (now < ts[0]) pos = now >= ts[0] - 120 ? (0.5 / k) * (1 - (ts[0] - now) / 120) : null;
      else if (now >= ts[k - 1]) pos = Math.min(1, (k - 0.5) / k + (0.5 / k) * Math.min(1, (now - ts[k - 1]) / 180));
      else { let i = 0; while (ts[i + 1] <= now) i++; pos = (i + 0.5 + (now - ts[i]) / Math.max(1, ts[i + 1] - ts[i])) / k; }
    }
    const lab = { done: 'fait', now: 'c\'est l\'heure', soon: 'bientôt', upcoming: 'à venir', missed: 'à reprendre', later: 'demain' };
    const line = '<ol class="day-line" style="--n:' + k + '">' +
      (pos !== null ? '<span class="fill" style="width:' + Math.max(0, (pos - 0.5 / k) * 100).toFixed(2) + '%"></span><span class="nowm" style="left:' + (pos * 100).toFixed(2) + '%" title="Maintenant, ' + A.hm(now) + '"></span>' : '') +
      items.map(x => '<li class="x-' + x.status + '"><button data-node="' + x.key + '" aria-label="' + esc(A.hm(x.t) + ', ' + x.short + ', ' + lab[x.status]) + '">' +
        '<span class="tm">' + (x.status === 'later' ? 'demain' : A.hm(x.t)) + '</span><span class="dot">' + (x.status === 'done' ? icon('check') : '') + '</span><span class="lb">' + esc(x.short) + '</span></button></li>').join('') +
      '</ol>';
    // ce qui compte en plus : une sortie proche, une orientation en cours
    const m = S.member(id), foot = [];
    const eva = S.tasksAhead(id, 30).find(t => t.kind === 'eva');
    if (eva) foot.push(icon('calendar') + '<span>' + esc(up1(eva.when) + ' : ' + low1(eva.label.replace(' : ', ', '))) + '</span>');
    const pend = m.triages.length ? m.triages[m.triages.length - 1] : null;
    if (pend && pend.d === S.day() && pend.ficheNom) foot.push(icon('stetho') + '<span>Orientation en cours : ' + esc(pend.ficheNom) + '</span>');
    return '<div class="day-head"><span>Aujourd\'hui</span>' + bell(id) + '</div>' +
      '<div class="day-card">' + hero + line + '</div>' +
      (foot.length ? '<div class="day-foot">' + foot.map(f => '<p>' + f + '</p>').join('') + '</div>' : '');
  };

  R.bind = (node, id) => {
    const items = R.today(id);
    const find = key => items.find(x => x.key === key);
    const ac = node.querySelector('.day-next .ac');
    if (ac) {
      const it = find(ac.dataset.key);
      const go = ac.querySelector('[data-act]'), later = ac.querySelector('[data-later]');
      if (go && it) go.onclick = () => it.act();
      if (later && it) later.onclick = () => laterToast(R.later(id, it.key));
    }
    node.querySelectorAll('[data-node]').forEach(b => b.onclick = () => { const it = find(b.dataset.node); if (it) it.act(); });
    const bl = node.querySelector('[data-bell]');
    if (bl) bl.onclick = () => {
      const m = S.member(id);
      if (m.prefs.notify && Notification.permission === 'granted') {
        m.prefs.notify = false; S.save(); A.toast(icon('info') + 'Rappels coupés. Je te préviendrai seulement dans AURA.'); A.emit('rappels:change'); return;
      }
      Notification.requestPermission().then(p => {
        m.prefs.notify = p === 'granted'; S.save();
        A.toast(icon(p === 'granted' ? 'check' : 'info') + (p === 'granted' ? 'C\'est noté : je te préviens à l\'heure, même quand AURA est en arrière-plan.' : 'D\'accord : je te préviendrai seulement dans AURA.'));
        A.emit('rappels:change');
      }).catch(() => { /* rien */ });
    };
  };

  /* ---------------------------------------------------------------- */
  /* À l'heure : bandeau et notification                               */
  /* ---------------------------------------------------------------- */
  function banner(it, id) {
    const old = document.querySelector('.rbanner'); if (old) old.remove();
    const b = A.el('<div class="rbanner" role="status" aria-live="polite"><span class="disc" style="--a:' + it.a + ';--b:' + it.b + '">' + icon(it.ic) + '</span>' +
      '<div class="tx"><b>' + esc(it.now) + '</b><span>' + esc(it.title + ', ' + A.hm(it.t)) + '</span></div>' +
      '<div class="ac"><button class="btn small primary" data-go>' + esc(it.cta) + '</button><button class="btn small ghost" data-later>Plus tard</button><button class="icon-btn" data-x aria-label="Fermer">' + icon('close') + '</button></div></div>');
    document.body.appendChild(b);
    requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('in')));
    let gone = false;
    const close = () => { if (gone) return; gone = true; b.classList.remove('in'); setTimeout(() => b.remove(), 400); };
    b.querySelector('[data-go]').onclick = () => { close(); it.act(); };
    b.querySelector('[data-later]').onclick = () => { close(); laterToast(R.later(id, it.key)); };
    b.querySelector('[data-x]').onclick = close;
    setTimeout(close, 120000);
  }
  function notify(it, m) {
    if (!m.prefs.notify || !canNotify() || Notification.permission !== 'granted' || !document.hidden) return;
    const opts = { body: it.now + ' ' + it.title + '.', tag: 'aura-' + it.key, icon: 'assets/icon.svg' };
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification('AURA', opts)).catch(() => {});
      else { const n = new Notification('AURA', opts); n.onclick = () => { root.focus(); n.close(); it.act(); }; }
    } catch (e) { /* ce navigateur refuse les notifications ici */ }
  }
  function tick() {
    const id = S.state.who;
    if (!id || S.state.role === 'cmo' || !S.member(id)) return;
    const m = S.member(id), p = day(m);
    const path = A.route().path, home = !path || path === 'accueil';
    let changed = false;
    for (const it of R.today(id)) {
      if (it.status !== 'now') continue;
      const k = it.key + '@' + it.t;
      if (p.told[k]) continue;
      // une fenêtre est ouverte (une mesure, une fiche) : le rappel attend qu'elle se referme
      if (!document.hidden && document.querySelector('.backdrop')) continue;
      p.told[k] = 1; changed = true;
      if (!home) banner(it, id);
      notify(it, m);
    }
    if (changed) S.save();
    A.emit('rappels:tick');
  }
  R.tick = tick;
  let timer = null;
  R.start = () => {
    if (timer) return;
    timer = setInterval(tick, 20000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    setTimeout(tick, 1500);
  };
})(typeof self !== 'undefined' ? self : this);
