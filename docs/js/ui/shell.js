/* AURA : coquille de l'application (ciel, navigation, barre du haut, Sophie
   toujours à portée, conversation, panneaux, notifications, récompenses). */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store;
  const $ = A.$, esc = A.esc, icon = A.icon;
  A.views = {};

  /* ================================================================ */
  /* Ciel : étoiles, nébuleuse, bord de la Terre, teinte circadienne   */
  /* ================================================================ */
  const Sky = A.sky = { mode: 'home', paused: false };
  function lightPhase() {
    const h = S.minute() / 60;
    if (!S.state.settings.circadien) return 'jour';
    return h >= 5.5 && h < 10 ? 'matin' : h >= 10 && h < 18.5 ? 'jour' : h >= 18.5 && h < 22.5 ? 'soir' : 'nuit';
  }
  A.lightPhase = lightPhase;
  const PAL = {
    matin: { top: '#0C1638', mid: '#13245E', limb: ['#BFF0FF', '#5FC8FF', '#3B6BFF'], neb: ['rgba(90,170,255,.16)', 'rgba(160,140,255,.12)'] },
    jour: { top: '#0B1230', mid: '#16205A', limb: ['#C9F3FF', '#79D8FF', '#4D7DFF'], neb: ['rgba(121,170,255,.14)', 'rgba(179,166,255,.12)'] },
    soir: { top: '#120F2E', mid: '#2A1C55', limb: ['#FFE2B8', '#FFAE7A', '#C76BD9'], neb: ['rgba(255,160,120,.12)', 'rgba(190,120,255,.13)'] },
    nuit: { top: '#07091C', mid: '#120F33', limb: ['#FFC9A8', '#E07A6B', '#7A3E8E'], neb: ['rgba(200,90,110,.08)', 'rgba(120,80,200,.08)'] }
  };
  Sky.init = () => {
    const c = document.createElement('canvas');
    c.id = 'sky';
    document.body.prepend(c);
    const g = c.getContext('2d');
    const rnd = A.rng(42);
    let W = 0, H = 0, dpr = 1, stars = [];
    const resize = () => {
      dpr = Math.min(2, root.devicePixelRatio || 1);
      W = c.width = Math.round(innerWidth * dpr); H = c.height = Math.round(innerHeight * dpr);
      c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
      const n = Math.round(innerWidth * innerHeight / 3800);
      stars = Array.from({ length: n }, () => ({ x: rnd(), y: rnd(), r: Math.pow(rnd(), 3) * 1.6 + 0.35, a: 0.25 + rnd() * 0.75, tw: rnd() * 6.28, sp: 0.4 + rnd() * 1.6, z: rnd() }));
    };
    resize();
    addEventListener('resize', resize);
    let mx = 0, my = 0;
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
    let last = 0, shoot = null, nextShoot = performance.now() + 9000;
    const draw = now => {
      requestAnimationFrame(draw);
      if (Sky.paused || document.hidden) return;
      if (now - last < 33) return;
      last = now;
      const t = now / 1000;
      const ph = PAL[lightPhase()];
      document.documentElement.dataset.light = lightPhase();
      const grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, ph.top); grd.addColorStop(1, ph.mid);
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      // nébuleuse lente
      [[0.22, 0.28, 0.55, ph.neb[0], 0.07], [0.78, 0.36, 0.5, ph.neb[1], 0.05]].forEach(([x, y, r, col, s], i) => {
        const cx = (x + Math.sin(t * s + i) * 0.03) * W, cy = (y + Math.cos(t * s * 0.8 + i) * 0.02) * H;
        const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r * Math.max(W, H));
        rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
      });
      // étoiles avec parallaxe
      const night = lightPhase() === 'nuit' ? 0.75 : 1;
      for (const s of stars) {
        const px = (s.x * W + mx * 14 * s.z * dpr) % W, py = (s.y * H * 0.92 + my * 10 * s.z * dpr) % H;
        const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.tw);
        g.globalAlpha = s.a * tw * night;
        g.fillStyle = s.z > 0.85 ? '#D7E4FF' : '#FFFFFF';
        g.beginPath(); g.arc(px, py, s.r * dpr, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
      // étoile filante, rare
      if (!A.reduced() && now > nextShoot && !shoot) { shoot = { x: rnd() * 0.6 + 0.2, y: rnd() * 0.3, t0: now }; nextShoot = now + 14000 + rnd() * 20000; }
      if (shoot) {
        const k = (now - shoot.t0) / 900;
        if (k > 1) shoot = null;
        else {
          const x = (shoot.x + k * 0.18) * W, y = (shoot.y + k * 0.09) * H;
          const lg = g.createLinearGradient(x, y, x - 120 * dpr, y - 60 * dpr);
          lg.addColorStop(0, 'rgba(255,255,255,' + (0.8 * (1 - k)) + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
          g.strokeStyle = lg; g.lineWidth = 1.6 * dpr; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 120 * dpr, y - 60 * dpr); g.stroke();
        }
      }
      // bord de la Terre et liseré d'atmosphère
      const home = Sky.mode === 'home';
      const R = Math.max(W, H) * (home ? 1.25 : 1.6);
      const cx = W * 0.5 + mx * 10 * dpr, cy = H + R - H * (home ? 0.17 : 0.07);
      const earth = g.createRadialGradient(cx, cy - R * 0.2, R * 0.6, cx, cy, R);
      earth.addColorStop(0, '#0A1A44'); earth.addColorStop(0.92, '#0E2A66'); earth.addColorStop(1, '#1B4FA8');
      g.fillStyle = earth; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.fill();
      const glowW = (home ? 42 : 26) * dpr;
      const breathe = 0.85 + 0.15 * Math.sin(t * 0.5);
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = ph.limb[i];
        g.globalAlpha = [0.95, 0.5, 0.25][i] * breathe;
        g.lineWidth = [2.2, glowW * 0.35, glowW][i];
        g.shadowColor = ph.limb[1]; g.shadowBlur = [8, 24, 50][i] * dpr;
        g.beginPath(); g.arc(cx, cy, R + [0, glowW * 0.15, glowW * 0.45][i], Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      }
      g.shadowBlur = 0; g.globalAlpha = 1;
    };
    requestAnimationFrame(draw);
  };

  /* ================================================================ */
  /* Navigation                                                        */
  /* ================================================================ */
  let currentView = null, currentRoute = null;
  // L'écran demandé est gardé en mémoire : la navigation marche aussi dans un cadre qui
  // n'applique pas l'adresse (#/...). L'adresse suit quand elle le peut.
  let wanted = null, prevRoute = null;
  const readHash = () => { try { return location.hash; } catch (e) { return ''; } };
  A.route = () => {
    const h = (wanted !== null ? wanted : readHash()).replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs || ''));
    return { path: path || '', params };
  };
  A.go = (path, params) => {
    const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const target = '#/' + path + qs;
    prevRoute = wanted !== null ? wanted : readHash();
    wanted = target;
    // sur le site : une entrée d'historique par écran (le bouton Retour du téléphone marche) ;
    // dans un cadre (aperçu claude.ai) : on remplace, pour ne pas toucher à l'historique de la page hôte
    const framed = (() => { try { return root.self !== root.top; } catch (e) { return true; } })();
    try { if (readHash() !== target) history[framed ? 'replaceState' : 'pushState'](null, '', target); } catch (e) { /* le cadre garde son adresse */ }
    render();
  };
  // retour à l'écran précédent de la plateforme, sans toucher à l'historique de la page qui l'accueille
  A.back = () => {
    const p = prevRoute && prevRoute !== wanted ? prevRoute.replace(/^#\/?/, '') : '';
    if (p) { const [path, qs] = p.split('?'); A.go(path, Object.fromEntries(new URLSearchParams(qs || ''))); }
    else A.go(S.state.role === 'cmo' ? 'cmo' : 'accueil');
  };
  // une adresse changée de l'extérieur (lien, saisie) reprend la main
  const onHash = () => { const h = readHash(); if (h !== wanted) { wanted = h; render(); } };

  function resolve(path) {
    if (!S.state.who) return { name: 'bienvenue', arg: null };
    if (!path) return { name: S.state.role === 'cmo' ? 'cmo' : 'accueil', arg: null };
    const parts = path.split('/');
    if (parts[0] === 'cmo') {
      if (!S.isCmo(S.state.who)) return { name: 'accueil', arg: null };
      if (S.state.role !== 'cmo') { S.state.role = 'cmo'; S.save(); }
      return { name: 'cmo', arg: parts.slice(1) };
    }
    if (S.state.role === 'cmo' && parts[0] !== 'reglages') { S.state.role = 'crew'; S.save(); }
    return { name: parts[0], arg: parts[1] || null };
  }

  function render() {
    const { path, params } = A.route();
    const r = resolve(path);
    const view = A.views[r.name] || A.views.accueil;
    const doRender = () => {
      if (currentView && currentView.unmount) try { currentView.unmount(); } catch (e) { console.error(e); }
      A.voice.stopListening();
      const main = $('#main');
      main.innerHTML = '';
      const node = document.createElement('div');
      node.className = 'view' + (view.wide ? ' wide' : '');
      main.appendChild(node);
      currentView = view;
      currentRoute = r;
      Sky.mode = r.name === 'accueil' || r.name === 'bienvenue' ? 'home' : 'page';
      renderTop();
      try {
        const html = view.render(node, Object.assign({ arg: r.arg }, params));
        if (typeof html === 'string') node.innerHTML = html;
        if (view.mount) view.mount(node, Object.assign({ arg: r.arg }, params));
      } catch (e) {
        console.error(e);
        node.innerHTML = '<div class="panel"><h2>Cet écran n\'a pas pu s\'ouvrir</h2><p class="muted">' + esc(e.message) + '</p></div>';
      }
      renderDock(r.name);
      main.focus({ preventScroll: true });
      if (!params.keep) root.scrollTo({ top: 0, behavior: 'instant' });
    };
    let done = false;
    const safe = () => { if (done) return; done = true; try { doRender(); } catch (e) { console.error('Rendu impossible', e); } };
    safe();
  }
  A.render = render;
  A.refresh = () => { if (currentView && currentView.refresh) currentView.refresh(); else render(); };

  /* ================================================================ */
  /* Barre du haut                                                     */
  /* ================================================================ */
  function renderTop() {
    const top = $('#top');
    const id = S.state.who;
    if (!id) {
      top.innerHTML = '<button class="brand" data-go="" aria-label="AURA"><b>AURA</b><span>santé de l\'équipage</span></button><div class="top-spacer"></div>' + soundBtn();
      bindTop(top);
      return;
    }
    const p = S.profile(id), m = S.member(id);
    const L = S.light();
    const lv = A.gamify.level(m.xp);
    const cmo = S.state.role === 'cmo';
    top.innerHTML =
      '<button class="brand" data-go="' + (cmo ? 'cmo' : 'accueil') + '" aria-label="Accueil"><b>AURA</b><span>' + (cmo ? 'médecin de bord' : 'santé de l\'équipage') + '</span></button>' +
      '<div class="mission-line"><span>Jour ' + S.day() + '</span><i class="sep"></i><span>En route vers Mars</span><i class="sep"></i>' +
      (S.blackout() ? '<span class="link-cut">Liaison coupée</span>' : '<span class="link-ok">Terre à ' + A.num(L, 0) + ' min</span>') + '</div>' +
      '<div class="top-spacer"></div>' +
      (cmo ? '' : '<button class="xp-chip" data-go="defis" aria-label="Niveau ' + lv.n + ', ' + A.num(m.xp) + ' points"><span class="lvl">' + lv.n + '</span><span class="bar"><i style="width:' + (lv.frac * 100).toFixed(0) + '%"></i></span><span class="pts">' + A.num(m.xp) + '</span></button>') +
      soundBtn() +
      '<button class="me-btn" data-act="me" aria-label="Profil et réglages"><span class="avatar" style="--h:' + m.hue + '">' + A.initials(p.name) + '</span><span class="who">' + esc(A.first(p.name)) + '</span></button>';
    bindTop(top);
  }
  function soundBtn() {
    const on = S.state.settings.sound;
    return '<button class="icon-btn" data-act="sound" aria-pressed="' + on + '" aria-label="' + (on ? 'Couper la voix de Sophie' : 'Remettre la voix de Sophie') + '">' + icon(on ? 'volume' : 'mute') + '</button>';
  }
  function bindTop(top) {
    top.querySelectorAll('[data-go]').forEach(b => b.onclick = () => A.go(b.dataset.go));
    const sb = top.querySelector('[data-act="sound"]');
    if (sb) sb.onclick = () => { S.setSetting('sound', !S.state.settings.sound); if (!S.state.settings.sound) A.voice.stop(); renderTop(); };
    const me = top.querySelector('[data-act="me"]');
    if (me) me.onclick = profileMenu;
  }
  A.renderTop = renderTop;

  function profileMenu() {
    const id = S.state.who, p = S.profile(id);
    const cmo = S.state.role === 'cmo';
    const body = '<div class="stack">' +
      '<div class="row"><span class="avatar lg" style="--h:' + S.member(id).hue + '">' + A.initials(p.name) + '</span><div><b>' + esc(p.name) + '</b><div class="muted small">' + esc(p.role) + '</div></div></div>' +
      (S.isCmo(id) ? '<button class="btn block ' + (cmo ? '' : 'sophie') + '" data-m="role">' + icon(cmo ? 'home' : 'stetho') + (cmo ? 'Revenir à mon espace' : 'Espace médecin de bord') + '</button>' : '') +
      '<button class="btn block" data-m="settings">' + icon('gear') + 'Réglages</button>' +
      '<button class="btn block ghost" data-m="switch">' + icon('users') + 'Changer de membre d\'équipage</button></div>';
    const sh = A.sheet('Profil', body);
    sh.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      A.closeSheet();
      if (b.dataset.m === 'role') A.go(cmo ? 'accueil' : 'cmo');
      if (b.dataset.m === 'settings') A.go('reglages');
      if (b.dataset.m === 'switch') { A.voice.stop(); S.setWho(null); A.go(''); }
    });
  }

  /* ================================================================ */
  /* Panneaux, notifications                                           */
  /* ================================================================ */
  A.sheet = (title, html, o) => {
    A.closeSheet();
    o = o || {};
    const bd = A.el('<div class="backdrop" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="sheet' + (o.wide ? ' wide' : '') + '"><div class="sheet-head"><h2>' + esc(title) + '</h2><button class="icon-btn" data-close aria-label="Fermer">' + icon('close') + '</button></div><div class="sheet-body"></div></div></div>');
    bd.querySelector('.sheet-body').innerHTML = html;
    document.body.appendChild(bd);
    const close = () => A.closeSheet();
    bd.addEventListener('click', e => { if (e.target === bd) close(); });
    bd.querySelector('[data-close]').onclick = close;
    const prev = document.activeElement;
    bd._prev = prev;
    setTimeout(() => { const f = bd.querySelector('input, textarea, button:not([data-close])'); if (f) f.focus(); }, 60);
    if (o.onClose) bd._onClose = o.onClose;
    return bd.querySelector('.sheet');
  };
  A.closeSheet = () => {
    const bd = $('.backdrop');
    if (!bd) return;
    if (bd._onClose) bd._onClose();
    bd.remove();
    if (bd._prev && bd._prev.focus) bd._prev.focus();
  };
  addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('.backdrop')) A.closeSheet(); } });

  A.toast = (html, o) => {
    o = o || {};
    let box = $('.toasts');
    if (!box) { box = A.el('<div class="toasts" aria-live="polite"></div>'); document.body.appendChild(box); }
    const t = A.el('<div class="toast ' + (o.kind || '') + '">' + html + '</div>');
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, o.ms || 2800);
  };

  /* ================================================================ */
  /* Écussons de mission (récompenses)                                 */
  /* ================================================================ */
  let pn = 0;
  A.patchSVG = (p, locked) => {
    const id = 'pt' + (++pn);
    const [a, b] = p.c;
    return '<svg viewBox="0 0 120 120" aria-hidden="true"><defs>' +
      '<radialGradient id="' + id + 'g" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient>' +
      '<path id="' + id + 'p" d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0"/></defs>' +
      '<circle cx="60" cy="60" r="57" fill="#0E1436" stroke="' + a + '" stroke-width="2.5"/>' +
      '<circle cx="60" cy="60" r="52.5" fill="none" stroke="' + a + '" stroke-width="1.2" stroke-dasharray="2.2 2.6" opacity=".9"/>' +
      '<circle cx="60" cy="60" r="34" fill="url(#' + id + 'g)"/>' +
      '<circle cx="60" cy="60" r="34" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
      '<g transform="translate(43 43) scale(1.42)" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (A.ICONS[p.icon] || A.ICONS.star) + '</g>' +
      '<text font-size="9.2" font-weight="700" letter-spacing="1.4" fill="' + a + '" font-family="Atkinson Hyperlegible Next, sans-serif"><textPath href="#' + id + 'p" startOffset="50%" text-anchor="middle">' + esc(p.nom.toUpperCase()) + '</textPath></text>' +
      (locked ? '<g transform="translate(78 78)"><circle r="13" fill="#0E1436" stroke="' + a + '" stroke-width="1.5"/><g transform="translate(-8 -8) scale(.68)" fill="none" stroke="#B9C0E3" stroke-width="2.2" stroke-linecap="round">' + A.ICONS.lock + '</g></g>' : '') +
      '</svg>';
  };

  /* ================================================================ */
  /* Récompenses : points, niveau, écusson                             */
  /* ================================================================ */
  A.burst = (x, y, colors) => {
    if (A.reduced()) return;
    const c = A.el('<canvas class="burst"></canvas>');
    document.body.appendChild(c);
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext('2d');
    const P = Array.from({ length: 70 }, () => { const a = Math.random() * 6.283, v = 2 + Math.random() * 7; return { x: x * dpr, y: y * dpr, vx: Math.cos(a) * v * dpr, vy: Math.sin(a) * v * dpr - 2 * dpr, r: (1.5 + Math.random() * 3) * dpr, c: colors[Math.floor(Math.random() * colors.length)], life: 1 }; });
    const t0 = performance.now();
    const f = now => {
      const k = (now - t0) / 1400;
      g.clearRect(0, 0, c.width, c.height);
      P.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.12 * dpr; p.vx *= 0.985; g.globalAlpha = Math.max(0, 1 - k); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); });
      if (k < 1) requestAnimationFrame(f); else c.remove();
    };
    requestAnimationFrame(f);
  };
  A.celebrate = (res, label) => {
    if (!res) return;
    if (res.pts > 0) A.toast(icon('star') + '<b>+' + res.pts + ' points</b>' + (label ? '<span class="muted">' + esc(label) + '</span>' : '') + (res.bonus ? '<span class="tag gold">Journée complète</span>' : ''), { kind: 'gold' });
    const big = res.levelUp ? { title: 'Niveau ' + res.levelUp.n, text: res.levelUp.name, art: '<div class="level-card"><div class="big">' + res.levelUp.n + '</div></div>' } :
      (res.badges && res.badges.length ? { title: 'Nouvel écusson', text: res.badges[0].nom, art: '<div class="patch" style="width:150px">' + A.patchSVG(res.badges[0]) + '</div>' } : null);
    if (big) {
      setTimeout(() => {
        const r = A.el('<div class="reward"><div class="card"><div>' + big.art + '</div><div class="xp">' + esc(big.title) + '</div><div><b>' + esc(big.text) + '</b></div><button class="btn gold small">Super</button></div></div>');
        document.body.appendChild(r);
        A.burst(innerWidth / 2, innerHeight / 2, ['#FFC870', '#FFE3A3', '#B3A6FF', '#79D8FF']);
        const close = () => { const c = r.querySelector('.card'); c.classList.add('out'); setTimeout(() => r.remove(), 380); };
        r.querySelector('button').onclick = close;
        setTimeout(close, 4200);
        A.renderTop();
      }, 600);
    } else A.renderTop();
  };
  A.on('reward', ({ res }) => { if (res) setTimeout(() => A.renderTop(), 50); });

  /* ================================================================ */
  /* Sophie : conversation et actions                                  */
  /* ================================================================ */
  const T = A.talk = { char: null, sayEl: null, heardEl: null, busy: false };
  // Le personnage et la zone de texte qui parlent en ce moment (accueil, conférence ou bulle)
  T.attach = (char, sayEl, heardEl) => { T.char = char; T.sayEl = sayEl; T.heardEl = heardEl; };
  T.detach = char => { if (T.char === char) { T.char = null; T.sayEl = null; T.heardEl = null; } };
  const target = () => T.char || (dock && dock.char);

  function paintWords(el, text) {
    if (!el) return [];
    const words = String(text).split(/\s+/).filter(Boolean);
    el.classList.toggle('long', words.length > 26);
    el.innerHTML = words.map(w => '<span class="w">' + esc(w) + '</span> ').join('');
    return Array.from(el.querySelectorAll('.w'));
  }

  let saySeq = 0;
  T.say = (text, o) => {
    o = o || {};
    if (!text) return Promise.resolve(true);
    const my = ++saySeq;
    const ch = target();
    const id = S.state.who;
    const m = id ? S.member(id) : null;
    let el = T.sayEl;
    if (!el && dock) { el = dock.showBubble(''); }
    const spans = paintWords(el, text);
    if (o.emotion && ch) ch.setEmotion(o.emotion);
    if (ch) ch.setState('talking');
    return A.voice.speak(text, {
      gender: m ? m.prefs.voice : 'f', rate: m ? m.prefs.rate || 1 : 1, mute: !S.state.settings.sound || o.mute,
      onWord: i => { for (let k = 0; k <= i && k < spans.length; k++) spans[k].classList.add('on'); },
      onPulse: () => ch && ch.speakPulse(0.5)
    }).then(ok => {
      spans.forEach(s => s.classList.add('on'));
      // une phrase plus récente a pris la parole : on ne touche plus au personnage
      if (my !== saySeq) return ok;
      if (ch && (ok || ch.state === 'talking')) { ch.setState('idle'); setTimeout(() => ch.setEmotion('neutral'), 2500); }
      if (!T.sayEl && dock) dock.hideBubbleLater();
      return ok;
    });
  };

  T.remember = (from, text, extra) => {
    const m = S.me();
    if (!m || !text) return;
    m.chat.push(Object.assign({ from, text, d: S.day(), min: S.minute() }, extra || {}));
    if (m.chat.length > 60) m.chat.splice(0, m.chat.length - 60);
    S.save();
  };

  T.handle = async (text, o) => {
    o = o || {};
    text = String(text || '').trim();
    if (!text) return;
    T.remember('me', text);
    if (T.heardEl) T.heardEl.innerHTML = '<q>' + esc(text) + '</q>';
    const ch = target();
    if (ch) ch.setState('thinking');
    const reply = await A.brain.handle(text, o);
    if (ch) ch.setState('idle');
    if (reply.say) T.remember('ai', reply.say, { source: reply.source });
    A.emit('reply', reply);
    if (reply.action && reply.action.type === 'silence') { A.voice.stop(); return reply; }
    const run = () => reply.action && A.act(reply.action);
    const goesAway = reply.action && ['go', 'sim', 'scene', 'video', 'conference', 'triage', 'emergency', 'measure'].includes(reply.action.type);
    if (goesAway) {
      // on change d'écran : Sophie le dit depuis sa bulle, en même temps
      run();
      // l'écran d'urgence lit lui-même les premiers gestes
      if (reply.say && reply.action.type !== 'emergency') setTimeout(() => T.say(reply.say, { emotion: reply.emotion }), 250);
    } else {
      if (reply.say) await T.say(reply.say, { emotion: reply.emotion });
      run();
    }
    return reply;
  };

  T.listen = (o) => {
    o = o || {};
    const ch = target();
    if (A.voice.isListening()) { A.voice.stopListening(); return; }
    if (!A.voice.canListen()) {
      A.toast(icon('info') + 'La dictée n\'est pas disponible ici. Écris à ' + esc(S.sophieName()) + ', elle te répond à voix haute.');
      if (o.fallback) o.fallback();
      return;
    }
    A.voice.stop();
    if (ch) ch.setState('listening');
    if (o.onState) o.onState('listening');
    if (T.heardEl) T.heardEl.innerHTML = '<span class="faint">Je t\'écoute…</span>';
    A.voice.listen({
      onLevel: v => ch && ch.setLevel(v),
      onInterim: s => { if (T.heardEl) T.heardEl.innerHTML = '<q>' + esc(s) + '</q>'; if (o.onInterim) o.onInterim(s); },
      onError: err => {
        if (ch) ch.setState('idle');
        if (o.onState) o.onState('idle');
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          A.toast(icon('mic') + (A.llm && A.llm.inArtifact() ? 'Le micro n\'est pas disponible dans cet aperçu. Écris à ' + esc(S.sophieName()) + ', elle te répond à voix haute.' : 'Le micro est bloqué. Autorise-le, ou écris à ' + esc(S.sophieName()) + '.'));
          if (o.fallback) o.fallback();
        } else if (err !== 'no-speech' && err !== 'aborted') A.toast(icon('info') + 'Je n\'ai pas pu t\'écouter. Tu peux écrire.');
      },
      onEnd: final => {
        if (ch) { ch.setState('idle'); ch.setLevel(0); }
        if (o.onState) o.onState('idle');
        if (final) (o.onFinal || T.handle)(final);
        else if (T.heardEl) T.heardEl.innerHTML = '';
      }
    });
  };

  /* Exécution des actions demandées à Sophie */
  A.act = (a) => {
    if (!a) return;
    const id = S.state.who;
    switch (a.type) {
      case 'go': A.go(a.route, a.params); break;
      case 'triage': A.go('triage', a.text ? { t: a.text } : {}); break;
      case 'emergency': A.emergency.open(a.urg, a.text); break;
      case 'sim': A.immersive.sim(a.key); break;
      case 'scene': A.immersive.scene(a.key); break;
      case 'video': A.videos.play(a.which); break;
      case 'conference': A.go('conference', a.written ? { ecrit: 1 } : {}); break;
      case 'measure': A.go('sante', { mesure: a.metric }); break;
      case 'sport': { const r = S.logExercise(id, a.sport, a.min); A.celebrate(r.res, 'séance enregistrée'); A.refresh(); break; }
      case 'journal': { S.addJournal(id, a.text, null); A.toast(icon('lock') + 'Ajouté à ton journal privé'); A.celebrate(A.gamify.award(id, 'journal'), 'page de journal'); A.refresh(); break; }
      case 'rename': S.setPref('sophieName', a.name); A.refresh(); break;
      case 'voice': S.setPref('voice', a.gender); break;
      case 'rate': S.setPref('rate', a.value); break;
      case 'guided': S.setPref('guided', a.value); break;
      case 'call-cmo': S.alert({ who: id, niveau: 'urgence', titre: A.first(S.profile(id).name) + ' demande la médecin de bord', texte: 'Demande d\'aide depuis Sophie' }); A.toast(icon('stetho') + 'Keiko est prévenue'); break;
      default: break;
    }
  };

  /* ================================================================ */
  /* Sophie en petit (dock) et panneau de conversation                 */
  /* ================================================================ */
  let dock = null;
  function renderDock(viewName) {
    const hidden = !S.state.who || ['accueil', 'bienvenue', 'conference'].includes(viewName);
    if (hidden) { if (dock) { dock.char.destroy(); dock.el.remove(); dock = null; } return; }
    if (dock) return;
    const el = A.el('<div class="dock"><div class="bubble" hidden aria-live="polite"></div><button class="orb" aria-label="Parler à ' + esc(S.sophieName()) + '"></button></div>');
    document.body.appendChild(el);
    const ch = A.character.create(el.querySelector('.orb'), { small: true });
    let hideT = null;
    dock = {
      el, char: ch,
      showBubble(html) { const b = el.querySelector('.bubble'); clearTimeout(hideT); b.hidden = false; b.innerHTML = html; return b; },
      hideBubbleLater(ms) { clearTimeout(hideT); hideT = setTimeout(() => { el.querySelector('.bubble').hidden = true; }, ms || 6000); }
    };
    el.querySelector('.orb').onclick = () => openTalk();
  }
  A.dockSay = (text, emotion) => { if (dock) T.say(text, { emotion }); };

  function openTalk(o) {
    o = o || {};
    const m = S.me();
    const name = S.sophieName();
    const log = (m ? m.chat : []).slice(-12).map(x => '<div class="msg ' + (x.from === 'me' ? 'me' : 'ai') + '">' + esc(x.text) + (x.source ? '<span class="src">Source : ' + esc(x.source) + '</span>' : '') + '</div>').join('');
    const sh = A.sheet(name, '<div class="talk-sheet"><div class="log" id="talkLog">' + (log || '<p class="muted">Demande-moi ce que tu veux : une mesure, une pause, une simulation, ou juste parler.</p>') + '</div>' +
      '<div class="chips" id="tChips"></div>' +
      '<div class="talkbar"><button class="mic" id="tMic">' + icon('mic') + '<span>Parler</span></button></div>' +
      '<form class="ask" id="tAsk"><input id="tIn" autocomplete="off" placeholder="Écrire à ' + esc(name) + '" aria-label="Écrire à ' + esc(name) + '"><button class="icon-btn" aria-label="Envoyer">' + icon('send') + '</button></form></div>');
    const lg = sh.querySelector('#talkLog');
    lg.scrollTop = lg.scrollHeight;
    const add = (cls, text, src) => { lg.insertAdjacentHTML('beforeend', '<div class="msg ' + cls + '">' + esc(text) + (src ? '<span class="src">Source : ' + esc(src) + '</span>' : '') + '</div>'); lg.scrollTop = lg.scrollHeight; };
    const chipsEl = sh.querySelector('#tChips');
    const off = A.on('reply', r => {
      if (r.say) add('ai', r.say, r.source);
      chipsEl.innerHTML = (r.chips || []).map(c => '<button class="chip" data-say="' + esc(c) + '">' + esc(c) + '</button>').join('');
      chipsEl.querySelectorAll('[data-say]').forEach(b => b.onclick = () => { chipsEl.innerHTML = ''; const txt = A.chipToText ? A.chipToText(b.dataset.say, r) : b.dataset.say; if (txt) send(txt); });
    });
    const sheetBd = sh.closest('.backdrop');
    sheetBd._onClose = () => off();
    const send = txt => { if (!txt) return; add('me', txt); T.handle(txt); };
    sh.querySelector('#tAsk').onsubmit = e => { e.preventDefault(); const i = sh.querySelector('#tIn'); const v = i.value; i.value = ''; send(v); };
    const mic = sh.querySelector('#tMic');
    mic.onclick = () => T.listen({ onFinal: send, onState: s => { mic.classList.toggle('on', s === 'listening'); mic.querySelector('span').textContent = s === 'listening' ? 'Je t\'écoute' : 'Parler'; } });
    if (o.listen) mic.click();
  }
  A.openTalk = openTalk;

  /* ================================================================ */
  /* Démarrage                                                         */
  /* ================================================================ */
  A.shell = {
    init() {
      document.body.insertAdjacentHTML('afterbegin', '<a class="sr" href="#main">Aller au contenu</a>');
      $('#app').innerHTML = '<header class="topbar" id="top"></header><main id="main" tabindex="-1"></main>';
      Sky.init();
      addEventListener('hashchange', onHash);
      addEventListener('popstate', onHash);
      A.on('alert', a => { if (S.state.role === 'cmo') A.renderTop(); });
      render();
    }
  };
})(typeof self !== 'undefined' ? self : this);
