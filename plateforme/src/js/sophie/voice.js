/* Sophie : la voix (synthèse vocale du système) et l'écoute (dictée du navigateur).
   Voix féminine par défaut, masculine sur demande. Sans voix disponible, ou son coupé,
   Sophie « parle » quand même : sous-titres et bouche suivent un rythme de lecture. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const V = A.voice = {};
  const synth = root.speechSynthesis || null;
  const SR = root.SpeechRecognition || root.webkitSpeechRecognition || null;

  const FEM = /(amelie|amélie|audrey|aurelie|aurélie|marie|julie|hortense|denise|eloise|éloise|celine|céline|virginie|lea|léa|chantal|sylvie|claire|josephine|joséphine|vivienne|brigitte|coralie|jacqueline|yvette|ariane|charline|female|femme|google français|google francais|elsa|caroline|sabine|mathilde|juliette)/i;
  const MAL = /(thomas|nicolas|paul|henri|claude|jerome|jérôme|antoine|fabrice|alain|remy|rémy|guillaume|mathieu|jean|gerard|gérard|yves|maxime|male|homme|daniel|olivier|pierre|louis|eric|éric|alexandre|reed|grandpa|rocko)/i;

  let voices = [];
  function load() { if (synth) voices = synth.getVoices().filter(v => /^fr/i.test(v.lang)); return voices; }
  if (synth) { load(); if ('onvoiceschanged' in synth) synth.onvoiceschanged = load; }
  V.available = () => !!synth;
  V.canListen = () => !!SR;
  V.list = () => load();

  V.pick = (gender) => {
    const vs = load();
    if (!vs.length) return { voice: null, pitch: gender === 'm' ? 0.75 : 1.1, exact: false };
    const want = gender === 'm' ? MAL : FEM;
    const not = gender === 'm' ? FEM : MAL;
    const score = v => (want.test(v.name) ? 10 : 0) - (not.test(v.name) ? 10 : 0) + (/fr-FR/i.test(v.lang) ? 3 : 0) + (v.localService ? 2 : 0) + (/natural|neural|premium|enhanced/i.test(v.name) ? 2 : 0);
    const best = vs.slice().sort((a, b) => score(b) - score(a))[0];
    const exact = want.test(best.name);
    // sans voix du bon genre, on ajuste la hauteur pour s'en approcher
    const pitch = exact ? 1 : (gender === 'm' ? 0.72 : 1.15);
    return { voice: best, pitch, exact };
  };

  // Découpe en phrases (Chrome coupe les longues lectures)
  function chunks(text) {
    return String(text).replace(/\s+/g, ' ').match(/[^.!?;:]+[.!?;:]*\s*/g) || [String(text)];
  }

  let current = null;
  // arrêter la lecture en cours ; sa promesse se résout avec false (lecture interrompue)
  V.stop = () => {
    const j = current;
    current = null;
    if (j) { j.cancelled = true; clearTimeout(j.timer); if (j.finish) j.finish(); }
    if (synth) try { synth.cancel(); } catch (e) { /* rien */ }
  };

  /* speak(text, o) : o.gender ('f'|'m'), o.rate, o.mute, o.onWord(i), o.onPulse(), o.onStart(), o.onEnd()
     Renvoie une promesse résolue à la fin de la lecture (ou à l'annulation). */
  V.speak = (text, o) => {
    o = o || {};
    V.stop();
    const job = { cancelled: false, timer: null };
    current = job;
    const words = String(text).split(/\s+/).filter(Boolean);
    const parts = chunks(text);
    let wordBase = 0;
    return new Promise(resolve => {
      job.finish = () => resolve(false);
      const done = () => { if (current === job) current = null; o.onEnd && o.onEnd(); resolve(!job.cancelled); };
      o.onStart && o.onStart();
      const useSynth = synth && !o.mute;
      const pick = V.pick(o.gender || 'f');
      // lecture simulée : sous-titres et bouche au rythme d'une voix calme
      const simulate = (i) => {
        if (job.cancelled) return done();
        if (i >= words.length) return done();
        o.onWord && o.onWord(i);
        o.onPulse && o.onPulse();
        const w = words[i];
        const ms = 120 + w.length * 52 + (/[.!?]$/.test(w) ? 380 : /[,;:]$/.test(w) ? 170 : 0);
        job.timer = setTimeout(() => simulate(i + 1), ms / (o.rate || 1));
      };
      if (!useSynth) { simulate(0); return; }
      let k = 0;
      let watchdog = null;
      const next = () => {
        if (job.cancelled) return done();
        if (k >= parts.length) return done();
        const part = parts[k++];
        const u = new SpeechSynthesisUtterance(part);
        u.lang = 'fr-FR';
        if (pick.voice) u.voice = pick.voice;
        u.pitch = pick.pitch;
        u.rate = (o.rate || 1) * 0.98;
        const pw = part.split(/\s+/).filter(Boolean);
        const base = wordBase;
        wordBase += pw.length;
        let lastIdx = -1;
        let ticking = null;
        u.onstart = () => {
          // repli si le navigateur ne signale pas les mots : on avance au rythme moyen
          let j = 0;
          ticking = setInterval(() => { if (j < pw.length && lastIdx < base + j) { o.onWord && o.onWord(base + j); } o.onPulse && o.onPulse(); j++; }, 300 / (o.rate || 1));
        };
        u.onboundary = e => {
          if (e.name && e.name !== 'word') return;
          const before = part.slice(0, e.charIndex).split(/\s+/).filter(Boolean).length;
          lastIdx = base + before;
          o.onWord && o.onWord(lastIdx);
          o.onPulse && o.onPulse();
        };
        const end = () => { clearInterval(ticking); clearTimeout(watchdog); o.onWord && o.onWord(base + pw.length - 1); next(); };
        u.onend = end;
        u.onerror = end;
        clearTimeout(watchdog);
        watchdog = setTimeout(() => { try { synth.cancel(); } catch (e) { /* rien */ } end(); }, 2500 + part.length * 110);
        try { synth.speak(u); } catch (e) { end(); }
      };
      next();
    });
  };

  /* Écoute : dictée du navigateur, avec le niveau du micro pour le halo de Sophie */
  let rec = null;
  let meter = null;
  async function startMeter(onLevel) {
    if (!onLevel || !root.navigator.mediaDevices || !root.navigator.mediaDevices.getUserMedia) return null;
    try {
      const stream = await root.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const AC = root.AudioContext || root.webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      let raf = 0;
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let s = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
        onLevel(Math.min(1, Math.sqrt(s / buf.length) * 5));
        raf = requestAnimationFrame(tick);
      };
      tick();
      return { stop() { cancelAnimationFrame(raf); stream.getTracks().forEach(t => t.stop()); ctx.close(); onLevel(0); } };
    } catch (e) { return null; }
  }

  V.listen = (o) => {
    o = o || {};
    V.stopListening();
    if (!SR) { o.onError && o.onError('indisponible'); return null; }
    const r = new SR();
    r.lang = 'fr-FR';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let final = '';
    let ended = false;
    r.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      o.onInterim && o.onInterim((final + ' ' + interim).trim());
    };
    r.onerror = e => { o.onError && o.onError(e.error || 'erreur'); };
    r.onend = () => {
      if (ended) return;
      ended = true;
      if (meter) { meter.stop(); meter = null; }
      rec = null;
      o.onEnd && o.onEnd(final.trim());
    };
    try { r.start(); } catch (e) { o.onError && o.onError('occupe'); return null; }
    rec = r;
    startMeter(o.onLevel).then(m => { if (rec === r) meter = m; else if (m) m.stop(); });
    return r;
  };
  V.stopListening = () => {
    if (rec) { try { rec.stop(); } catch (e) { /* rien */ } }
    if (meter) { meter.stop(); meter = null; }
  };
  V.isListening = () => !!rec;
})(typeof self !== 'undefined' ? self : this);
