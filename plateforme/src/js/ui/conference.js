/* AURA : conférence médicale de la semaine (à la voix ou par écrit) et journal privé.
   Quand le délai avec la Terre dépasse 5 minutes ou que la liaison est coupée,
   l'IA du vaisseau mène la conférence avec les mêmes questions ; l'astronaute
   relit le résumé avant l'envoi (R-COM-04). La partie moral ne part qu'avec son accord (R-CONF-02). */
(function (root) {
  'use strict';
  const A = root.AURA;
  const S = A.store, VOCAB = root.AURA_VOCAB, LIB = root.AURA_FICHES_LIB;
  const $ = A.$, esc = A.esc, icon = A.icon;

  const TOPICS = [
    { id: 'alimentation', label: 'Alimentation', part: 'med' },
    { id: 'sommeil', label: 'Sommeil', part: 'med' },
    { id: 'sport', label: 'Exercice', part: 'med' },
    { id: 'elimination', label: 'Élimination', part: 'med' },
    { id: 'charge', label: 'Charge de travail', part: 'med' },
    { id: 'moral', label: 'Moral', part: 'psy' }
  ];
  function question(topic, id) {
    const m = S.member(id);
    const wk = m.measures.sleep.slice(-7);
    const sleep = wk.reduce((a, x) => a + x.v, 0) / Math.max(1, wk.length);
    const prev = m.measures.sleep.slice(-28, -7);
    const sleepPrev = prev.reduce((a, x) => a + x.v, 0) / Math.max(1, prev.length);
    const ex = m.exercise.filter(x => x.d > S.day() - 7);
    const minDay = ex.reduce((a, x) => a + x.min, 0) / 7;
    switch (topic) {
      case 'alimentation': return 'On commence par les repas. Comment vont l\'appétit et l\'envie de boire cette semaine ?';
      case 'sommeil': return 'Tu as dormi ' + A.hm(sleep * 60).replace(' h ', ' h ') + ' en moyenne cette semaine' + (sleep < sleepPrev - 0.4 ? ', un peu moins que d\'habitude' : '') + '. Comment se passent tes nuits ?';
      case 'sport': return 'Côté sport, tu fais ' + Math.round(minDay) + ' minutes par jour en moyenne. Comment le corps répond-il aux séances ?';
      case 'elimination': return 'Côté digestion et urines, as-tu remarqué quelque chose d\'inhabituel ?';
      case 'charge': return 'Comment as-tu vécu la charge de travail cette semaine ?';
      default: return 'Et toi, comment te sens-tu en ce moment : le moral, la fatigue, l\'ambiance à bord ? Cette partie reste privée si tu le souhaites.';
    }
  }
  const NEGATIVE = /\b(mal|douleur|difficile|dur|pas bien|fatigue|fatiguee|epuise|stresse|stress|triste|inquiet|inquiete|reveille|insomnie|peu dormi|peu mange|peu d appetit|pas assez|pas faim|constipe|diarrhee|brule|tendu|dispute|seul|seule|ennui|lourd|lourde|manque|cafard)\b/;

  A.views.conference = {
    render() {
      const id = S.state.who;
      const name = S.sophieName(id);
      const L = S.light();
      const withDoctor = !S.blackout() && L * 2 < 10;
      return '<div class="call" id="cRoot"><div class="head"><div class="t"><h2>Conférence de la semaine</h2><span class="live"><i></i>Avec ' + esc(name) + (withDoctor ? '' : ' : la Terre est à ' + A.num(L, 0) + ' minutes, je mène la conférence et le résumé partira ensuite') + '</span></div><span class="muted" id="cTime">0:00 / 15:00</span><button class="icon-btn" data-x aria-label="Quitter la conférence">' + icon('close') + '</button></div>' +
        '<div class="stage"><div class="sophie-frame" id="cSophie"></div><p class="say" id="cSay" aria-live="polite"></p><p class="heard" id="cHeard"></p><div class="topics" id="cTopics">' + TOPICS.map(t => '<span data-t="' + t.id + '">' + t.label + '</span>').join('') + '</div></div>' +
        '<div class="foot" id="cFoot"></div></div>';
    },
    mount(node, params) {
      const id = S.state.who;
      const self = this;
      const ch = self.ch = A.character.create($('#cSophie', node));
      A.talk.attach(ch, $('#cSay', node), $('#cHeard', node));
      let written = !!params.ecrit;
      let idx = -1, followed = false, ended = false, turn = 0;
      const answers = {};
      const t0 = Date.now();
      self.timer = setInterval(() => { const el = $('#cTime', node); if (el) el.textContent = A.mmss((Date.now() - t0) / 1000) + ' / 15:00'; }, 1000);
      const foot = $('#cFoot', node);
      const topicEls = () => node.querySelectorAll('#cTopics span');
      const paintTopics = () => topicEls().forEach((s, i) => { s.classList.toggle('on', i === idx); s.classList.toggle('done', i < idx); });

      const sayIt = (text, emo) => A.talk.say(text, { emotion: emo, mute: written });
      function controls() {
        if (ended) return;
        foot.innerHTML = written
          ? '<div class="written"><form class="ask" id="cAsk"><input id="cIn" autocomplete="off" placeholder="Ta réponse" aria-label="Ta réponse"><button class="icon-btn" aria-label="Envoyer">' + icon('send') + '</button></form><div class="row" style="justify-content:center;margin-top:12px"><button class="btn ghost small" id="cMode">' + icon('mic') + 'Revenir à la voix</button><button class="btn ghost small" id="cSkip">' + icon('next') + 'Passer cette question</button></div></div>'
          : '<button class="mic" id="cMic">' + icon('mic') + '<span>Répondre</span></button><button class="btn" id="cMode">' + icon('keyboard') + 'Par écrit</button><button class="btn ghost" id="cSkip">' + icon('next') + 'Passer</button><button class="btn ghost" id="cEnd">Terminer</button>';
        const mode = $('#cMode', foot);
        mode.onclick = () => { written = !written; A.voice.stop(); controls(); };
        $('#cSkip', foot).onclick = () => { A.voice.stop(); answer(''); };
        const end = $('#cEnd', foot);
        if (end) end.onclick = () => summary();
        if (written) {
          $('#cAsk', foot).onsubmit = e => { e.preventDefault(); const v = $('#cIn', foot).value.trim(); if (v) { $('#cIn', foot).value = ''; answer(v); } };
          setTimeout(() => { const i = $('#cIn', foot); if (i) i.focus(); }, 50);
        } else {
          const mic = $('#cMic', foot);
          mic.onclick = () => A.talk.listen({ onFinal: answer, onState: s => { mic.classList.toggle('on', s === 'listening'); mic.querySelector('span').textContent = s === 'listening' ? 'Je t\'écoute' : 'Répondre'; }, fallback: () => { written = true; controls(); } });
        }
      }
      function autoListen() {
        if (written || ended || !A.voice.canListen()) return;
        const mic = $('#cMic', foot);
        if (mic && !A.voice.isListening()) mic.click();
      }
      // Sophie parle, puis écoute, si personne n'a repris la parole entre-temps
      function speak(text, emo) {
        const my = ++turn;
        sayIt(text, emo).then(() => { if (my === turn && !ended) autoListen(); });
      }
      // L'état avance tout de suite : une réponse tapée pendant que Sophie parle
      // va toujours au sujet affiché à l'écran.
      function next(ack) {
        idx++;
        followed = false;
        if (idx >= TOPICS.length) return summary();
        paintTopics();
        if (!ack) { const h = $('#cHeard', node); if (h) h.innerHTML = ''; }
        speak((ack ? ack + ' ' : '') + question(TOPICS[idx].id, id), 'neutral');
      }
      function answer(text) {
        if (ended) return;
        const topic = TOPICS[idx];
        if (!topic) return;
        if (!text) return next('');
        answers[topic.id] = answers[topic.id] ? answers[topic.id].replace(/[\s.!?…]*$/, '') + '. ' + text.charAt(0).toUpperCase() + text.slice(1) : text;
        $('#cHeard', node).innerHTML = '<q>' + esc(text) + '</q>';
        // un signe d'alarme passe avant tout, même pendant la conférence
        const f = LIB.findFacts(text, A.brain.patterns());
        const u = VOCAB.URGENCES.find(x => x.facts.some(c => f.facts.some(y => y.code === c && !y.neg)));
        if (u && !f.info) { ended = true; A.voice.stop(); A.emergency.open(u, text); return; }
        if (!followed && NEGATIVE.test(LIB.normalize(text))) {
          followed = true;
          speak(topic.part === 'psy' ? 'Merci de me le dire. Tu veux m\'en dire un peu plus ?' : 'D\'accord. Depuis quand, et est-ce que ça te gêne dans ta journée ?', 'concerned');
          return;
        }
        next(['Merci, c\'est noté.', 'Entendu.', 'D\'accord, merci.'][idx % 3]);
      }
      function summary() {
        ended = true;
        turn++;
        A.voice.stopListening();
        clearInterval(self.timer);
        idx = TOPICS.length; paintTopics();
        // les signes repérés dans la partie moral restent privés tant qu'elle n'est pas partagée (R-CONF-02)
        const signs = part => {
          const out = [];
          TOPICS.filter(t => t.part === part && answers[t.id]).forEach(t => LIB.findFacts(answers[t.id], A.brain.patterns()).facts.forEach(f => { if (!f.neg && VOCAB.FACTS[f.code] && !VOCAB.FACTS[f.code].lieu && !out.includes(f.code)) out.push(f.code); }));
          return out;
        };
        const medSigns = signs('med'), psySigns = signs('psy').filter(c => !medSigns.includes(c));
        const rows = TOPICS.map(t => '<div class="setting"><div class="txt"><b>' + t.label + (t.part === 'psy' ? ' <span class="tag sophie">privé</span>' : '') + '</b><small>' + esc(answers[t.id] || 'Pas de réponse') + '</small></div></div>').join('');
        const stage = node.querySelector('.stage');
        stage.classList.add('review');
        stage.innerHTML = '<div class="sheet" style="animation:none;max-height:none;width:min(720px,100%)"><h2>Ton résumé, à relire</h2><p class="muted" style="margin:6px 0 10px">Rien ne part sans ton accord. Tu peux corriger en recommençant une question.</p>' + rows +
          '<div id="cSigns"></div>' +
          '<div class="setting"><div class="txt"><b>Partager la partie moral</b><small>Avec Keiko et le psychologue au sol. Sinon, elle reste à bord.</small></div><button class="toggle" role="switch" id="cShare" aria-checked="false" aria-label="Partager la partie moral"></button></div>' +
          '<button class="btn sophie big block" id="cSend" style="margin-top:16px">' + icon('send') + 'Envoyer le résumé</button></div>';
        foot.innerHTML = '';
        const sh = $('#cShare', stage);
        const flaggedNow = () => medSigns.concat(sh.getAttribute('aria-checked') === 'true' ? psySigns : []);
        const paintSigns = () => {
          const f = flaggedNow();
          $('#cSigns', stage).innerHTML = f.length ? '<div class="env-note" style="margin-top:14px">' + icon('info') + '<div><b>À signaler à Keiko</b><p class="muted">' + f.map(c => VOCAB.FACTS[c].label).join(', ') + '</p></div></div>' : '';
        };
        paintSigns();
        sh.onclick = () => { sh.setAttribute('aria-checked', sh.getAttribute('aria-checked') !== 'true'); paintSigns(); };
        $('#cSend', stage).onclick = () => {
          const share = sh.getAttribute('aria-checked') === 'true';
          const flagged = flaggedNow();
          const resume = TOPICS.filter(t => t.part === 'med' || share).map(t => t.label + ' : ' + (answers[t.id] || 'pas de réponse')).join(' ; ');
          const sent = {};
          TOPICS.forEach(t => { if ((t.part === 'med' || share) && answers[t.id]) sent[t.id] = answers[t.id]; });
          S.saveConference(id, { mode: written ? 'écrit' : 'voix', reponses: sent, partage: share, resume, signes: flagged, duree: Math.round((Date.now() - t0) / 60000) });
          if (flagged.length) S.alert({ who: id, niveau: 'info', titre: 'Conférence : signes à regarder', texte: A.first(S.profile(id).name) + ' : ' + flagged.map(c => VOCAB.FACTS[c].label).join(', ') });
          const res = A.gamify.award(id, 'conference');
          A.celebrate(res, 'conférence de la semaine');
          sayIt('Merci. Ton résumé est envoyé. À la semaine prochaine.', 'happy');
          setTimeout(() => A.go('accueil'), 2600);
        };
        sayIt('C\'est terminé. Relis ton résumé, et choisis si la partie moral est partagée.', 'happy');
      }
      node.querySelector('[data-x]').onclick = () => { ended = true; A.voice.stop(); A.go('accueil'); };
      controls();
      // l'accueil et la première question dans la même phrase : on peut répondre tout de suite
      next('Bonjour ' + A.first(S.profile(id).name) + '. On fait le point de la semaine : six sujets, un petit quart d\'heure. ' + (written ? 'On le fait par écrit.' : 'Réponds-moi à voix haute, ou par écrit si tu préfères.'));
    },
    unmount() { clearInterval(this.timer); A.talk.detach(this.ch); if (this.ch) this.ch.destroy(); A.voice.stop(); A.voice.stopListening(); }
  };

  /* ================================================================ */
  /* Journal privé                                                     */
  /* ================================================================ */
  const FACES = [
    ['#7AA7FF', 'M8 17q4-3.5 8 0'], ['#9FB8FF', 'M8.5 16.5q3.5-2 7 0'], ['#C9C2FF', 'M8.5 15.5h7'], ['#FFD58A', 'M8.5 14.5q3.5 2.5 7 0'], ['#FFC870', 'M7.5 14q4.5 4.5 9 0']
  ];
  const face = (i, size) => '<svg viewBox="0 0 24 24" width="' + (size || 40) + '" height="' + (size || 40) + '" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="' + FACES[i][0] + '" opacity=".95"/><circle cx="9" cy="10" r="1.3" fill="#141B44"/><circle cx="15" cy="10" r="1.3" fill="#141B44"/><path d="' + FACES[i][1] + '" fill="none" stroke="#141B44" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const MOODS = ['Très difficile', 'Pas terrible', 'Moyen', 'Bien', 'Très bien'];

  A.views.journal = {
    render() {
      const id = S.state.who, m = S.member(id);
      const entries = m.journal.slice().reverse();
      return '<div class="enter"><div class="screen-head"><button class="icon-btn back" data-back aria-label="Retour">' + icon('back') + '</button><div class="titles"><h1>Mon journal</h1><p class="private">' + icon('lock') + 'Seul toi peux le lire. ' + esc(S.sophieName(id)) + ' ne le transmet à personne, sauf si tu es en danger.</p></div></div>' +
        '<div class="split"><div class="panel stack-lg">' +
          '<div><p class="muted" style="margin-bottom:12px">Comment s\'est passée ta journée ?</p><div class="moods" id="jMoods">' + FACES.map((f, i) => '<button class="mood" data-m="' + (i + 1) + '" aria-pressed="false" aria-label="' + MOODS[i] + '">' + face(i) + '</button>').join('') + '</div></div>' +
          '<textarea class="input" id="jText" placeholder="Écris ou dicte ce que tu veux garder de cette journée" aria-label="Ton texte"></textarea>' +
          '<div class="spread"><button class="btn" id="jMic">' + icon('mic') + 'Dicter</button><label class="row small muted"><button class="toggle" role="switch" id="jReply" aria-checked="true" aria-label="' + esc(S.sophieName(id)) + ' me répond"></button>' + esc(S.sophieName(id)) + ' me répond</label></div>' +
          '<button class="btn sophie big block" id="jSave">' + icon('check') + 'Garder cette page</button>' +
        '</div><div><div class="entries" id="jList">' + (entries.length ? entries.map(entryHTML).join('') : '<p class="muted">Ton journal est vide. La première page t\'attend.</p>') + '</div></div></div></div>';
    },
    mount(node) {
      const id = S.state.who;
      let mood = null;
      node.querySelector('[data-back]').onclick = () => A.go('accueil');
      node.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mood = +b.dataset.m; node.querySelectorAll('[data-m]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
      const rep = $('#jReply', node);
      rep.onclick = () => rep.setAttribute('aria-checked', rep.getAttribute('aria-checked') !== 'true');
      const ta = $('#jText', node);
      const mic = $('#jMic', node);
      mic.onclick = () => {
        const before = ta.value;
        A.talk.listen({ onInterim: s => { ta.value = (before ? before + ' ' : '') + s; }, onFinal: s => { ta.value = (before ? before + ' ' : '') + s; }, onState: s => mic.classList.toggle('primary', s === 'listening') });
      };
      $('#jSave', node).onclick = () => {
        const text = ta.value.trim();
        if (!text) { ta.focus(); return; }
        const f = LIB.findFacts(text, A.brain.patterns());
        const danger = VOCAB.URGENCES.find(u => u.ref === 'R-URG-22' && u.facts.some(c => f.facts.some(y => y.code === c && !y.neg)));
        const e = S.addJournal(id, text, mood);
        if (rep.getAttribute('aria-checked') === 'true') e.reply = A.brain.journalReply(text, mood);
        S.save();
        if (danger) { A.emergency.open(danger, ''); return; }
        const res = A.gamify.award(id, 'journal');
        A.celebrate(res, 'page de journal');
        A.render();
        if (e.reply && S.member(id).prefs.guided) setTimeout(() => A.dockSay(e.reply, 'happy'), 500);
      };
    }
  };
  function entryHTML(e) {
    return '<article class="entry"><div class="meta">' + (e.mood ? face(e.mood - 1, 22) : '') + '<span>' + esc(A.dayLabel(e.d, S.day())) + ' à ' + A.hm(e.min || 0) + '</span></div><p>' + esc(e.text) + '</p>' + (e.reply ? '<div class="reply">' + esc(e.reply) + '</div>' : '') + '</article>';
  }
})(typeof self !== 'undefined' ? self : this);
