/* AURA : outils communs (espace de noms, DOM, formats, icônes, événements). */
(function (root) {
  'use strict';
  const A = root.AURA = root.AURA || {};

  /* ---------- DOM ---------- */
  A.$ = (s, el) => (el || document).querySelector(s);
  A.$$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  A.esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  A.el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  A.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  A.lerp = (a, b, t) => a + (b - a) * t;
  A.sleep = ms => new Promise(r => setTimeout(r, ms));
  A.uid = (p) => (p || 'id') + Math.random().toString(36).slice(2, 9);
  A.reduced = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Événements ---------- */
  const handlers = {};
  A.on = (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); return () => { handlers[ev] = handlers[ev].filter(f => f !== fn); }; };
  A.emit = (ev, data) => { (handlers[ev] || []).slice().forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); };

  /* ---------- Stockage local (protégé : peut être absent ou plein) ---------- */
  A.storage = {
    get(k, d) { try { const v = root.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { root.localStorage.removeItem(k); } catch (e) { /* rien */ } }
  };

  /* ---------- Formats français ---------- */
  const NB = ' ';
  A.num = (v, d) => (v === null || v === undefined || Number.isNaN(v)) ? '·' : Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  A.pct = (p, d) => A.num(p * 100, d || 0) + NB + '%';
  A.plural = (n, one, many) => n + ' ' + (Math.abs(n) >= 2 ? (many || one + 's') : one);
  A.first = name => String(name || '').split(' ')[0];
  A.initials = name => String(name || '').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  A.hm = min => { min = Math.round(min); const h = Math.floor(min / 60) % 24, m = min % 60; return h + ' h ' + String(m).padStart(2, '0'); };
  A.dur = min => { min = Math.round(min); if (min < 60) return min + ' min'; const h = Math.floor(min / 60), m = min % 60; return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };
  A.mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  A.dayLabel = (day, today) => {
    const d = today - day;
    if (d === 0) return 'aujourd\'hui';
    if (d === 1) return 'hier';
    if (d > 1 && d < 7) return 'il y a ' + d + ' jours';
    return 'jour ' + day;
  };
  // « Bonne nuit » se dit en partant se coucher, pas pour saluer : la nuit, on dit bonsoir
  A.greet = minute => { const h = Math.floor(minute / 60) % 24; return h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir'; };

  /* ---------- Hasard reproductible ---------- */
  A.rng = seed => { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  A.gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  /* ---------- Icônes (traits arrondis, 24 × 24) ---------- */
  const P = {
    home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/><path d="M10 19v-5h4v5"/>',
    health: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/><path d="M8.5 12h2l1-2 1.6 4 1-2h1.4"/>',
    call: '<rect x="3.5" y="6" width="12" height="12" rx="3"/><path d="m15.5 10.5 5-3v9l-5-3"/>',
    journal: '<path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4Z"/><path d="M6 16.5A1.5 1.5 0 0 1 7.5 15H18"/><path d="M10 8h5M10 11h3"/>',
    video: '<rect x="3.5" y="5" width="17" height="14" rx="3.5"/><path d="m10.5 9.2 4.5 2.8-4.5 2.8Z"/>',
    sim: '<path d="M12 3.5 19.5 7.7v8.6L12 20.5l-7.5-4.2V7.7Z"/><path d="M12 12 19.5 7.7M12 12 4.5 7.7M12 12v8.5"/>',
    escape: '<path d="m3.5 18 5.5-8 3.5 5 2-3 6 6Z"/><circle cx="16.5" cy="6.5" r="2"/>',
    trophy: '<path d="M8 4.5h8v4a4 4 0 0 1-8 0v-4Z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 3.3M16 6h2.5a2.5 2.5 0 0 1-2.6 3.3"/><path d="M12 12.5V16M8.5 19.5h7M10 16h4l.5 3.5h-5Z"/>',
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3"/>',
    keyboard: '<rect x="3" y="6.5" width="18" height="11" rx="2.5"/><path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M8 14h8"/>',
    send: '<path d="M4.5 12 19.5 5 15 19.5l-3.2-5.8Z"/><path d="m11.8 13.7 3.6-4"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5Z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 4.5v4h4"/>',
    back: '<path d="M15 5.5 8.5 12l6.5 6.5"/>',
    next: '<path d="M9 5.5 15.5 12 9 18.5"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    alert: '<path d="M12 4 21 19.5H3Z"/><path d="M12 10v4.5M12 17.2v.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01"/>',
    temp: '<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z"/><path d="M12 17.5v-6"/>',
    pulse: '<path d="M3 12h4l2-5 3.5 10 2.5-6.5 1.5 1.5H21"/>',
    drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z"/>',
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0M9.3 9.6v.01M14.7 9.6v.01"/>',
    bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16 9.5 9h5l3.5 7M9.5 9 12 16h-6M13 6h2.5"/>',
    run: '<circle cx="14" cy="4.8" r="1.8"/><path d="m7 21 3.5-5.5 3 2V21M10.5 15.5 12 10l3 2.5h3.5M12 10 8.5 11 7 13.5"/>',
    dumbbell: '<path d="M3.5 10v4M6.5 7.5v9M17.5 7.5v9M20.5 10v4M6.5 12h11"/>',
    flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-5.5-3.5-9-2 1.5-3.5 3.5-3.5 6-1-1-1.5-2-1.5-3C7.5 10.5 6 12.5 6 15a6 6 0 0 0 6 6Z"/>',
    star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    headset: '<path d="M3.5 9c0-1.1.9-2 2-2h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3.6l-1.8-2.4h-2.2L9.1 17H5.5a2 2 0 0 1-2-2Z"/><circle cx="8.2" cy="12" r="1.5"/><circle cx="15.8" cy="12" r="1.5"/>',
    pill: '<rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m10 9.3 4.2 5.4"/>',
    flask: '<path d="M9.5 3.5h5M10.5 3.5v5L5.5 18a1.8 1.8 0 0 0 1.6 2.5h9.8a1.8 1.8 0 0 0 1.6-2.5l-5-9.5v-5"/><path d="M8 14.5h8"/>',
    book: '<path d="M4 5.5A2 2 0 0 1 6 4h5v15H6a2 2 0 0 0-2 1.5Z"/><path d="M20 5.5A2 2 0 0 0 18 4h-5v15h5a2 2 0 0 1 2 1.5Z"/>',
    users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"/>',
    chart: '<path d="M4 19.5h16"/><path d="M6.5 16v-4M11 16V7.5M15.5 16v-6M20 16V5"/>',
    upload: '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>',
    download: '<path d="M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5"/><path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m15.5 15.5 4 4"/>',
    edit: '<path d="M5 19h3.5L18.5 9 15 5.5 5 15.5Z"/><path d="m13 7.5 3.5 3.5"/>',
    trash: '<path d="M5.5 7h13M10 7V5h4v2M7.5 7l.8 12.5h7.4L16.5 7"/>',
    satellite: '<path d="m13.5 10.5 3-3"/><rect x="14.5" y="2.5" width="5" height="5" rx="1" transform="rotate(45 17 5)"/><path d="M4 13.5a6.5 6.5 0 0 0 6.5 6.5M4 17.5a2.5 2.5 0 0 0 2.5 2.5"/><path d="M9.5 9.5 5 14l5 5 4.5-4.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sparkle: '<path d="M12 3.5 13.8 10.2 20.5 12l-6.7 1.8L12 20.5l-1.8-6.7L3.5 12l6.7-1.8Z"/>',
    volume: '<path d="M11 5 6.5 9H3.5v6h3L11 19Z"/><path d="M15 9a4 4 0 0 1 0 6M17.8 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M11 5 6.5 9H3.5v6h3L11 19Z"/><path d="m15.5 9.5 5 5M20.5 9.5l-5 5"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    logout: '<path d="M14 4.5h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-4"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
    stetho: '<path d="M6 4v5a4 4 0 0 0 8 0V4"/><path d="M10 13v2a5 5 0 0 0 10 0v-1.5"/><circle cx="20" cy="12" r="2"/>',
    shield: '<path d="M12 3.5 19 6v5.5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    body: '<circle cx="12" cy="4.8" r="2"/><path d="M8 9h8l-1 6h-1.5l-.5 5.5h-2L10.5 15H9Z"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    wind: '<path d="M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7"/>',
    sleep: '<path d="M4 18.5h16M5.5 18.5v-6.5h13a1.5 1.5 0 0 1 1.5 1.5v5"/><path d="M8.5 12V9.5h4V12M14 4.5h3l-3 3.5h3"/>',
    orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-25 12 12)"/>',
    planet: '<circle cx="12" cy="12" r="5.5"/><path d="M4.2 15.8C2.6 17.6 2.3 19 3 19.6c1.3 1.2 6.2-1.4 10.8-5.9s7.3-9.4 6.1-10.6c-.6-.7-2-.4-3.8 1.1"/>',
    hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 6V4.5a1.5 1.5 0 0 1 3 0V12M14 6.5a1.5 1.5 0 0 1 3 0v6.5a7 7 0 0 1-7 7 6 6 0 0 1-5.2-3L3.5 14.5a1.5 1.5 0 0 1 2.5-1.6L8 15"/>',
    text: '<path d="M5 6.5h14M5 11.5h14M5 16.5h9"/>'
  };
  A.icon = (name, cls) => '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.info) + '</svg>';
  A.ICONS = P;
  /* Confirmation dans la page (les fenêtres du navigateur sont bloquées dans certains cadres) :
     le premier appui change le libellé du bouton, le second confirme ; sans second appui, il revient. */
  A.armConfirm = (btn, label, action) => {
    btn.onclick = () => {
      if (btn.dataset.armed) { delete btn.dataset.armed; action(); return; }
      const before = btn.innerHTML;
      btn.dataset.armed = '1';
      btn.classList.add('armed');
      btn.innerHTML = A.icon('alert') + label;
      setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.classList.remove('armed'); btn.innerHTML = before; } }, 4000);
    };
  };
})(typeof self !== 'undefined' ? self : this);
