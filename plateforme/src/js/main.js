/* AURA : démarrage de la plateforme. */
(function (root) {
  'use strict';
  const A = root.AURA;
  function boot() {
    A.store.load();
    const ts = A.storage.get('aura-text', null);
    if (ts) document.documentElement.dataset.text = ts;
    const mand = A.store.state.mandatory || {};
    A.videos.CAPS.forEach(c => { c.mandatory = !!mand[c.id]; });
    A.brain.init();
    A.shell.init();
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|anthropic|usercontent/.test(location.hostname)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* hors ligne indisponible ici */ });
    }
    root.__aura = A;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof self !== 'undefined' ? self : this);
