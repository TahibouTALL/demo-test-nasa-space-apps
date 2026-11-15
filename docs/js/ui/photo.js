/* AURA : une photo de la peau ou de l'œil, pour la médecin de bord.
   AURA n'analyse pas l'image. Elle la range dans le dossier de l'astronaute et prévient Keiko,
   qui la compare à la précédente, répond, et peut demander l'avis du médecin au sol.
   Les images restent dans ce navigateur (IndexedDB) ; l'état de la mission n'en garde que la trace. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, VOCAB = root.AURA_VOCAB, esc = A.esc, icon = A.icon;

  const Z = {
    peau: {
      label: 'Peau', de: 'de la peau', capture: 'environment', urg: 'R-URG-15',
      hint: 'En pleine lumière, sans flash, l\'appareil à une main de distance. Un doigt ou une règle à côté donne la taille.',
      alarm: 'Les lèvres, la langue ou la gorge gonflent, ou tu respires mal ? N\'attends pas la photo.',
      ask: 'Où, et depuis quand ?', ex: 'Avant-bras gauche, depuis hier. Ça gratte un peu.',
      worse: 'Ça s\'étend, ou ça fait de plus en plus mal'
    },
    oeil: {
      label: 'Œil', de: 'de l\'œil', capture: 'user', urg: 'R-URG-18',
      hint: 'Face à une lumière douce, sans flash. Regarde droit devant, la paupière bien ouverte.',
      alarm: 'Tu vois moins bien d\'un coup, ou ton œil te fait très mal ? N\'attends pas la photo.',
      ask: 'Quel œil, et depuis quand ?', ex: 'Œil droit, rouge depuis ce matin. Il pique un peu.',
      worse: 'Ma vue a changé'
    }
  };
  const doc = () => A.first(S.profile(S.cmoId()).name);
  const list = id => { const m = S.member(id); if (!m.photos) m.photos = []; return m.photos; };
  const when = p => A.dayLabel(p.d, S.day()) + ' à ' + A.hm(p.min);
  const up1 = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------------- les images : IndexedDB, ou la mémoire si le navigateur refuse ---------------- */
  const mem = new Map();
  A.photoStore = {
    db() {
      return new Promise((res, rej) => {
        try {
          const r = indexedDB.open('aura-photos', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('p');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
    },
    async put(id, blob) {
      try {
        const db = await this.db();
        await new Promise((res, rej) => { const tx = db.transaction('p', 'readwrite'); tx.objectStore('p').put(blob, id); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
        return true;
      } catch (e) { mem.set(id, blob); return false; }
    },
    async get(id) {
      if (mem.has(id)) return mem.get(id);
      try { const db = await this.db(); return await new Promise(res => { const r = db.transaction('p').objectStore('p').get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); } catch (e) { return null; }
    },
    async clear() { mem.clear(); try { const db = await this.db(); db.transaction('p', 'readwrite').objectStore('p').clear(); } catch (e) { /* rien à effacer */ } }
  };
  A.on('state:reset', () => A.photoStore.clear());

  // la photo réduite à 1600 px de côté au plus, en JPEG : assez pour voir, assez léger pour le sol
  function shrink(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? res({ blob: b, w, h }) : rej(new Error('jpeg')), 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
      img.src = url;
    });
  }
  // met l'image d'une photo gardée dans une balise <img> ; l'adresse temporaire est libérée une fois l'image affichée
  async function fill(img) {
    const b = await A.photoStore.get(img.dataset.ph);
    if (!b) { const box = img.parentElement; box.classList.add('gone'); box.innerHTML = icon('camera') + '<small>Image absente de ce navigateur</small>'; return; }
    const u = URL.createObjectURL(b);
    img.onload = () => URL.revokeObjectURL(u);
    img.src = u;
  }

  /* ---------------- ce que l'astronaute et Keiko en voient ailleurs ---------------- */
  A.photo = {
    Z, list, fill,
    label: id => S.isCmo(id) ? 'Une photo pour le médecin au sol' : 'Une photo pour ' + doc(),
    last: (id, zone) => list(id).filter(p => !zone || p.zone === zone).slice(-1)[0] || null,
    status(id, zone) {
      const p = A.photo.last(id, zone);
      if (!p) return '';
      if (p.reponse) return doc() + ' a répondu à ta photo : « ' + p.reponse + ' »';
      if (S.isCmo(id)) return 'Photo envoyée au sol ' + when(p) + '.';
      return 'Photo envoyée ' + when(p) + (p.vue ? ', vue par ' + doc() + '.' : ', pas encore vue.');
    },
    // une photo qui dit « ça empire » et qui attend encore sa réponse
    waiting: (id, zone) => { const p = A.photo.last(id, zone); return !!(p && p.worse && !p.reponse && !S.isCmo(id)); },
    // la dernière réponse de Keiko, montrée deux jours sur l'accueil
    reply: id => list(id).filter(p => p.reponse && S.day() - p.repD <= 1).slice(-1)[0] || null,
    unseen: id => list(id).filter(p => !p.vue).length
  };

  /* ---------------- l'astronaute : prendre la photo et l'envoyer ---------------- */
  A.photoSheet = (zone) => {
    const id = S.state.who;
    if (!id) return;
    zone = Z[zone] ? zone : 'peau';
    const self = S.isCmo(id), first = A.first(S.profile(id).name);
    let shot = null, worse = false, sent = false, url = null;
    const sh = A.sheet(self ? 'Une photo pour ton dossier' : 'Une photo pour ' + doc(),
      '<div class="ph">' +
        '<div class="seg" role="group" aria-label="Ce que tu photographies" id="phZone">' + Object.keys(Z).map(k => '<button data-z="' + k + '" aria-pressed="' + (k === zone) + '">' + Z[k].label + '</button>').join('') + '</div>' +
        '<div class="ph-alarm" id="phAlarm"></div>' +
        '<p class="m-hint" id="phHint"></p>' +
        '<div class="ph-frame" id="phFrame"></div>' +
        '<div class="row wrap ph-pick"><button class="btn primary big" data-pick="phCam">' + icon('camera') + '<span>Prendre la photo</span></button><button class="btn big ghost" data-pick="phFile">' + icon('upload') + 'Choisir une image</button></div>' +
        '<input type="file" accept="image/*" id="phCam" hidden><input type="file" accept="image/*" id="phFile" hidden>' +
        '<label class="field ph-note"><span id="phAsk"></span><textarea id="phNote" rows="2" maxlength="400"></textarea></label>' +
        '<div><button class="chip" id="phWorse" aria-pressed="false"></button></div>' +
        '<button class="btn primary big block" id="phSend" disabled>' + icon('send') + (self ? 'Garder et demander l\'avis du sol' : 'Envoyer à ' + esc(doc())) + '</button>' +
        '<p class="faint small">' + esc(self ? 'AURA n\'analyse pas la photo. Elle va dans ton dossier médical et part vers le médecin au sol, par la voie privée des données médicales.' : 'AURA n\'analyse pas la photo. Elle va dans ton dossier médical : seule ' + doc() + ' la voit, et le médecin au sol si elle lui demande son avis.') + '</p>' +
        '<p class="small muted" id="phLast"></p>' +
      '</div>', { onClose: () => { if (url) URL.revokeObjectURL(url); } });
    const $ = s => sh.querySelector(s);

    const draw = () => {
      const z = Z[zone];
      sh.querySelectorAll('#phZone [data-z]').forEach(b => b.setAttribute('aria-pressed', b.dataset.z === zone));
      $('#phAlarm').innerHTML = icon('alert') + '<span>' + esc(z.alarm) + '</span><button class="btn small" id="phUrg">C\'est une urgence</button>';
      $('#phUrg').onclick = () => {
        const u = (VOCAB.URGENCES || []).find(x => x.ref === z.urg), said = $('#phNote').value.trim();
        A.closeSheet();
        if (u) A.emergency.open(u, said);
      };
      $('#phHint').innerHTML = icon('info') + '<span>' + esc(z.hint) + '</span>';
      $('#phAsk').textContent = z.ask;
      $('#phNote').placeholder = z.ex;
      $('#phWorse').textContent = z.worse;
      $('#phCam').setAttribute('capture', z.capture);
      $('#phLast').textContent = A.photo.status(id, zone);
    };
    const frame = () => {
      const fr = $('#phFrame');
      if (url) { URL.revokeObjectURL(url); url = null; }
      if (shot) { url = URL.createObjectURL(shot.blob); fr.innerHTML = '<img src="' + url + '" alt="Ta photo, avant l\'envoi">'; }
      else fr.innerHTML = icon('camera') + '<span>La photo s\'affiche ici avant l\'envoi.</span>';
      fr.classList.toggle('has', !!shot);
      const cam = $('[data-pick="phCam"]');
      cam.classList.toggle('primary', !shot);
      cam.querySelector('span').textContent = shot ? 'Reprendre la photo' : 'Prendre la photo';
      $('#phSend').disabled = !shot;
    };
    draw();
    frame();

    sh.querySelectorAll('#phZone [data-z]').forEach(b => b.onclick = () => { zone = b.dataset.z; draw(); });
    sh.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => $('#' + b.dataset.pick).click());
    const onFile = async (inp) => {
      const f = inp.files && inp.files[0];
      inp.value = '';
      if (!f) return;
      if (f.type && !/^image\//.test(f.type)) { A.toast(icon('info') + 'Ce fichier n\'est pas une image.'); return; }
      $('#phFrame').classList.add('busy');
      try { shot = await shrink(f); } catch (e) { A.toast(icon('info') + 'Cette image ne s\'ouvre pas ici. Essaie une autre photo.'); }
      $('#phFrame').classList.remove('busy');
      frame();
    };
    $('#phCam').onchange = () => onFile($('#phCam'));
    $('#phFile').onchange = () => onFile($('#phFile'));
    $('#phWorse').onclick = () => { worse = !worse; $('#phWorse').setAttribute('aria-pressed', worse); };

    $('#phSend').onclick = async () => {
      if (!shot || sent) return;
      sent = true;
      $('#phSend').disabled = true;
      const z = Z[zone], note = $('#phNote').value.trim().slice(0, 400);
      const before = A.photo.last(id, zone);
      const pid = A.uid('ph');
      const kept = await A.photoStore.put(pid, shot.blob);
      const p = { id: pid, d: S.day(), min: S.minute(), zone, note, worse, w: shot.w, h: shot.h, vue: self, sol: self, reponse: null };
      list(id).push(p);
      const titre = 'Photo ' + z.de + ' de ' + first;
      if (self) S.queue({ prio: 1, kind: 'photo', who: id, photo: pid, titre: titre + ' : avis demandé' });
      else S.alert({ who: id, niveau: worse ? 'vigilance' : 'info', titre, texte: note || 'Sans commentaire.', photo: pid });
      S.save();
      A.emit('photo', p);
      const next = self ? 'Le médecin au sol la recevra avec le prochain envoi vers la Terre.'
        : doc() + (before ? ' la compare à la précédente' : ' la regarde') + ' et te répond ici et dans Mon corps.';
      $('.sheet-body').innerHTML = '<div class="ph">' +
        '<div class="ph-frame has"><img src="' + url + '" alt="La photo envoyée"></div>' +
        '<div class="panel tight ph-done"><div class="row"><i class="dot"></i><b>' + (self ? 'Gardée, avis du sol demandé' : 'Envoyée à ' + esc(doc())) + '</b></div>' +
          '<p style="margin-top:8px">' + esc(next) + '</p>' +
          (kept ? '' : '<p class="faint small" style="margin-top:8px">Ce navigateur ne peut garder la photo que jusqu\'à sa fermeture.</p>') + '</div>' +
        '<button class="btn primary big block" id="phDone">' + icon('check') + 'Terminé</button></div>';
      $('#phDone').onclick = () => { A.closeSheet(); A.render(); };
      $('#phDone').focus();
      A.dockSay(self ? 'C\'est gardé dans ton dossier, et l\'avis du sol est demandé.' : 'C\'est envoyé. ' + doc() + ' va la regarder.', 'happy');
    };
  };

  /* ---------------- la médecin de bord : voir, comparer, répondre ---------------- */
  A.photo.view = (who, pid) => {
    const all = list(who), i = all.findIndex(p => p.id === pid);
    if (i < 0) { A.toast(icon('info') + 'Cette photo n\'est plus dans le dossier.'); return; }
    const p = all[i], z = Z[p.zone] || Z.peau, first = A.first(S.profile(who).name);
    const prev = all.slice(0, i).filter(x => x.zone === p.zone).slice(-1)[0] || null;
    if (!p.vue) { p.vue = true; S.state.alerts.forEach(a => { if (a.photo === pid) a.lu = true; }); S.save(); }
    const fig = (x, cap) => '<figure><span class="im"><img data-ph="' + x.id + '" alt="' + esc('Photo ' + z.de + ' de ' + first + ', ' + when(x)) + '"></span><figcaption>' + esc(cap) + '</figcaption></figure>';
    const sh = A.sheet('Photo ' + z.de + ' de ' + first,
      '<div class="ph">' +
        '<div class="ph-cmp' + (prev ? ' two' : '') + '">' + (prev ? fig(prev, 'Avant : ' + when(prev)) : '') + fig(p, prev ? 'Maintenant : ' + when(p) : up1(when(p))) + '</div>' +
        '<div>' + (p.worse ? '<span class="tag warn">' + esc(z.worse) + '</span>' : '') +
          '<p style="margin-top:8px">' + (p.note ? '« ' + esc(p.note) + ' »' : '<span class="muted">Sans commentaire.</span>') + '</p>' +
          (prev && prev.reponse ? '<p class="muted small" style="margin-top:6px">Ta réponse à la photo d\'avant : « ' + esc(prev.reponse) + ' »</p>' : '') + '</div>' +
        '<label class="field ph-note"><span>Ta réponse à ' + esc(first) + '</span><textarea id="phRep" rows="3" maxlength="600" placeholder="Ce que tu en penses, et quand refaire une photo">' + esc(p.reponse || '') + '</textarea></label>' +
        '<div class="row wrap"><button class="btn primary" id="phRepSend">' + icon('send') + (p.reponse ? 'Modifier la réponse' : 'Envoyer la réponse') + '</button>' +
          '<button class="btn" id="phSol"' + (p.sol ? ' disabled' : '') + '>' + icon('satellite') + (p.sol ? 'Avis du sol demandé' : 'Demander l\'avis du sol') + '</button></div>' +
        '<p class="faint small">AURA n\'analyse pas les photos. Vers le sol, elles partent par la voie privée des données médicales (R-CONF-04)' + (prev ? ', avec celle d\'avant.' : '.') + '</p>' +
      '</div>', { wide: true, onClose: () => A.render() });
    sh.querySelectorAll('img[data-ph]').forEach(fill);
    sh.querySelector('#phRepSend').onclick = () => {
      const ta = sh.querySelector('#phRep'), txt = ta.value.trim();
      if (!txt) { ta.focus(); return; }
      p.reponse = txt.slice(0, 600); p.repD = S.day(); p.repMin = S.minute();
      S.save();
      A.emit('photo', p);
      A.toast(icon('check') + 'Réponse envoyée à ' + esc(first) + '.');
      A.closeSheet();
    };
    sh.querySelector('#phSol').onclick = () => {
      if (p.sol) return;
      p.sol = true;
      S.queue({ prio: 1, kind: 'photo', who, photo: pid, titre: 'Photo ' + z.de + ' de ' + first + ' : avis demandé' + (prev ? ', avec celle d\'avant' : '') });
      S.save();
      const b = sh.querySelector('#phSol');
      b.disabled = true;
      b.innerHTML = icon('satellite') + 'Avis du sol demandé';
      A.toast(icon('satellite') + 'Dans la file vers la Terre.');
    };
  };
})(typeof self !== 'undefined' ? self : this);
