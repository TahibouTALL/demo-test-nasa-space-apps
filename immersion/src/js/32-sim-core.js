/* ================= moteur commun des simulations médicales ================= */
const SIMS = {};
const CAT_LABELS = {
  evaluer: 'Évaluer', surveiller: 'Surveiller', air: 'Air et oxygène', circ: 'Circulation', medic: 'Médicaments',
  gestes: 'Gestes', securite: 'Sécurité', equipe: 'Équipe et sol'
};
const COMM = {
  directe: { label: 'Sol : liaison directe', dot: '', delay: 25 },
  differee: { label: 'Sol : 5 min de délai', dot: 'amber', delay: 300 },
  coupee: { label: 'Sol : liaison coupée', dot: 'red', delay: Infinity }
};

function newVitals() {
  return { hr: 80, sbp: 120, dbp: 78, spo2: 98, rr: 14, temp: 36.8, etco2: 36, rhythm: 'sinus', perf: 1, effort: 0.6,
    leads: false, spo2Probe: false, cuff: false, capno: false, nibp: null, nibpBusy: false, cpr: false, cprRate: 0 };
}

const Sim = {
  def: null, S: null, running: false, speed: 1, monitor: null, exp: null, tab: null, uiT: 0, alarmT: 0, nibpT: 0, lastAlarm: null,
  async open(key) {
    const def = SIMS[key];
    this.def = def;
    $('#brTitle').textContent = def.title;
    $('#brContext').textContent = def.context;
    $('#brFacts').innerHTML = def.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    $('#brNote').innerHTML = def.note;
    this.mode = 'guide'; this.comm = def.commDefault || 'directe';
    seg($('#brMode'), this.mode, v => this.mode = v);
    seg($('#brComm'), this.comm, v => this.comm = v);
    $('#brief').hidden = false;
    $('#brGo').onclick = () => { $('#brief').hidden = true; this.start(); };
  },
  async start() {
    const def = this.def;
    Sound.init();
    App.view = 'sim';
    $('#menu').hidden = true;
    App.setTitle(def.title);
    if (!this.monitor) this.monitor = new PatientMonitor($('#monitor'));
    this.monitor.clearAll();
    const S = {
      t: 0, v: newVitals(), look: {}, done: {}, count: {}, flags: {}, stock: Object.assign({}, def.stock || {}),
      crew: def.crew.map(c => Object.assign({ busy: null }, c)), queue: [], log: [], ended: null, silencedUntil: -1,
      ground: { calls: 0, pending: [] }, marks: {}, mode: this.mode, comm: this.comm, notes: [], rnd: mulberry32(Date.now() % 100000)
    };
    this.S = S;
    def.init(S);
    this.tab = def.cats[0];
    this.speed = 1; this.running = true; this.uiT = 0; this.alarmT = 0; this.nibpT = 0;
    seg($('#simSpeed'), '1', v => { this.speed = +v; });
    $('#simComm').querySelector('.dot').className = 'dot ' + COMM[S.comm].dot;
    $('#simComm').querySelector('span').textContent = COMM[S.comm].label;
    $('#monWho').textContent = def.patient.name;
    $('#patWho').textContent = `${def.patient.name}, ${def.patient.role}`;
    $('#guideRef').textContent = S.mode === 'exam' ? 'mode examen' : `fiche ${def.fiche}`;
    $('#cprPanel').hidden = true;
    $('#simHud').hidden = false; $('#relaxHud').hidden = true;
    this.renderTabs();
    this.addLog(0, 'aura', def.firstLog);
    if (HAS_GL) {
      const exp = await openExperience('module', { loadingText: 'Préparation du module' });
      this.exp = exp;
      exp.setPatient(def.patient.look);
      exp.setPose(def.startPose || 'neutre');
      exp.monTex.needsUpdate = true;
      exp.monitorRef = this.monitor;
      this.monitor.texture = exp.monTex;
      Sound.setAmbience(stationAudio);
    }
    $('#simEnd').onclick = () => this.finish({ outcome: 'arret', title: 'Simulation arrêtée', text: 'Vous avez arrêté la simulation avant la fin.' });
    App.frameHooks.add(this.frameHook);
    this.renderAll();
  },
  frameHook: (dt) => Sim.frame(dt),
  frame(dtWall) {
    const S = this.S;
    if (!S) return;
    const paused = !this.running || this.speed === 0 || !!S.ended || !$('#usPanel').hidden && this.def.pauseDuringUS;
    if (S.skip > 0 && !S.ended) {
      // avance rapide pendant une surveillance : quelques minutes simulées par image
      const k = Math.min(S.skip, 150);
      S.skip -= k;
      this.advance(k);
      if (S.skip <= 0 && this.def.afterSkip) this.def.afterSkip(S);
    } else if (!paused) this.advance(dtWall * this.speed);
    // moniteur en temps réel
    this.monitor.step(dtWall, S.v, paused, () => this.onBeat());
    this.uiT += dtWall;
    if (this.uiT > 0.25) { this.uiT = 0; this.renderAll(); }
    this.monitor.drawStatic(S.v, { name: this.def.patient.name, clock: fmtClock(S.t), now: S.t, alarm: this.alarmNow() });
    if (this.exp && this.exp.setLook) this.exp.setLook(Object.assign({}, S.look, { rr: S.v.rr, effort: S.v.effort, cpr: S.v.cpr, cprRate: S.v.cprRate }));
    if (!paused) this.alarmSound(dtWall);
  },
  advance(dt) {
    const S = this.S, def = this.def;
    let left = dt;
    while (left > 0 && !S.ended) {
      const h = Math.min(0.25, left);
      left -= h;
      S.t += h;
      def.physio(S, h);
      this.crewStep();
      this.nibpStep(h);
      // réponses du sol arrivées
      for (const m of S.ground.pending.slice()) {
        if (S.t >= m.due) {
          S.ground.pending.splice(S.ground.pending.indexOf(m), 1);
          this.addLog(S.t, 'sol', m.text);
          if (m.after) m.after(S);
        }
      }
      const end = def.check(S);
      if (end) { this.finish(end); break; }
    }
  },
  crewStep() {
    const S = this.S;
    for (const c of S.crew) {
      if (c.busy && S.t >= c.busy.end) {
        const a = c.busy.act;
        c.busy = null;
        this.complete(a, c);
      }
    }
    // tâches en attente
    for (const q of S.queue.slice()) {
      const c = this.freeCrew(q.act);
      if (c) { S.queue.splice(S.queue.indexOf(q), 1); this.begin(q.act, c); }
    }
  },
  nibpStep(h) {
    const S = this.S, v = S.v;
    if (!v.cuff) return;
    this.nibpT -= h;
    if (v.nibpBusy && this.nibpT <= 0) {
      v.nibpBusy = false;
      if (v.perf > 0.2 && v.sbp > 45 && !v.cpr) {
        const s = Math.round(v.sbp), d = Math.round(v.dbp);
        v.nibp = { s, d, m: Math.round((s + 2 * d) / 3), t: S.t };
        this.addLog(S.t, 'find', `Tension mesurée : ${s}/${d} mmHg.`);
      } else {
        v.nibp = null;
        this.addLog(S.t, 'find', 'Le brassard ne trouve pas de tension mesurable.');
      }
      this.nibpT = S.flags.nibpAuto ? 180 : Infinity;
      S.flags.nibpNext = S.t + this.nibpT;
    } else if (!v.nibpBusy && this.nibpT <= 0) {
      v.nibpBusy = true; this.nibpT = 25;
    }
  },
  measureNIBP() { const v = this.S.v; if (!v.cuff) return; v.nibpBusy = true; this.nibpT = 25; },
  freeCrew(a) {
    const S = this.S;
    const ok = c => !c.busy && (!a.who || a.who === 'any' || (a.who === 'medecin' && c.skill === 'medecin') || (a.who === 'vous' && c.you) || (a.who === 'autre' && !c.you));
    return S.crew.find(c => ok(c) && !c.you) || S.crew.find(ok);
  },
  avail(a) {
    const S = this.S;
    if (a.hidden && a.hidden(S)) return { hide: true };
    if (a.once && S.done[a.id] !== undefined) return { done: true };
    if (a.stock && (S.stock[a.stock] || 0) <= 0) return { reason: a.noStock || 'Plus en stock dans cette simulation.' };
    if (a.req) { const r = a.req(S); if (r !== true) return { reason: r }; }
    return { ok: true };
  },
  act(id) {
    const S = this.S, def = this.def;
    if (!S || S.ended) return;
    const a = def.actions.find(x => x.id === id);
    if (!a) return;
    const st = this.avail(a);
    if (st.done) return;
    if (st.reason) { this.addLog(S.t, 'aura', st.reason); this.renderAll(); return; }
    if (this.running && this.speed === 0) { this.speed = 1; seg($('#simSpeed'), '1'); }
    if (S.crew.some(c => c.busy && c.busy.act === a) || S.queue.some(q => q.act === a)) return;
    const dur = typeof a.dur === 'function' ? a.dur(S) : (a.dur || 0);
    if (!dur) { this.run(a, null); this.renderAll(); return; }
    const c = this.freeCrew(a);
    if (c) this.begin(a, c);
    else { S.queue.push({ act: a, t: S.t }); this.addLog(S.t, 'aura', `En attente : personne n'est libre pour « ${a.label} ».`); }
    this.renderAll();
  },
  begin(a, c) {
    const S = this.S;
    const dur = (typeof a.dur === 'function' ? a.dur(S) : a.dur) * (a.slowUnrestrained && !S.flags.restrained ? 1.5 : 1);
    c.busy = { act: a, end: S.t + dur, start: S.t };
    if (a.start) a.start(S, c);
    if (a.startLog) this.addLog(S.t, 'crew', `${c.short} : ${typeof a.startLog === 'function' ? a.startLog(S) : a.startLog}`);
  },
  complete(a, c) { this.run(a, c); },
  run(a, c) {
    const S = this.S;
    if (a.stock) S.stock[a.stock] = (S.stock[a.stock] || 0) - 1;
    if (S.done[a.id] === undefined) S.done[a.id] = S.t;
    S.count[a.id] = (S.count[a.id] || 0) + 1;
    let msg = null;
    try { msg = a.run ? a.run(S, c) : null; } catch (e) { console.error(e); }
    const who = c ? c.short + ' : ' : '';
    if (msg !== false) this.addLog(S.t, a.kind || 'crew', who + (msg || a.doneText || (a.label + ', fait.')));
  },
  callGround(textFn) {
    const S = this.S;
    S.ground.calls++;
    const sentAt = S.t;
    const d = COMM[S.comm].delay;
    if (!isFinite(d)) { this.addLog(S.t, 'sol', 'Pas de réponse : la liaison avec le sol est coupée. AURA reste votre seule aide.'); return; }
    const txt = textFn(S);
    const due = S.comm === 'directe' ? S.t + d : S.t + 2 * d + 60;
    S.ground.pending.push({ due, text: (S.comm === 'directe' ? '' : `Réponse à votre message de ${fmtClock(sentAt)} : `) + txt.text, after: txt.after });
    if (S.comm !== 'directe') this.addLog(S.t, 'aura', `Message parti. Avec ${d / 60} minutes dans chaque sens, la réponse arrivera vers ${fmtClock(due)}.`);
  },
  say(text, ms = 3500) {
    const el = $('#speech');
    el.textContent = text; el.hidden = false;
    clearTimeout(this._sayT);
    this._sayT = setTimeout(() => { el.hidden = true; }, ms);
  },
  addLog(t, kind, text) {
    const S = this.S;
    if (!text) return;
    S.log.push({ t, kind, text });
    const el = $('#log');
    const d = document.createElement('div');
    d.className = 'k-' + kind;
    d.innerHTML = `<b>${fmtClock(t)}</b>${esc(text)}`;
    el.prepend(d);
    while (el.children.length > 60) el.lastChild.remove();
    $('#logCount').textContent = S.log.length + ' entrées';
  },
  onBeat() {
    const v = this.S.v;
    if (!Sound.on || !Sound.ctx) return;
    if (v.spo2Probe && v.perf > 0.2 && v.rhythm !== 'fv' && v.rhythm !== 'asystolie') {
      Sound.beep(880 * Math.pow(2, (clamp(v.spo2, 60, 100) - 100) / 12), 0.07, 0.05, 'sine');
    } else if (v.leads && v.rhythm !== 'fv' && v.rhythm !== 'asystolie') Sound.beep(960, 0.05, 0.035, 'sine');
  },
  alarmNow() {
    const v = this.S.v, A = [];
    const fvLike = v.rhythm === 'fv' || v.rhythm === 'asystolie';
    if (v.leads) {
      if (v.rhythm === 'fv') A.push({ prio: 'haute', text: 'FV / TV' });
      if (v.rhythm === 'tv') A.push({ prio: 'haute', text: 'TV' });
      if (v.rhythm === 'asystolie') A.push({ prio: 'haute', text: 'ASYSTOLIE' });
      if (!fvLike && !v.cpr && v.hr > 140) A.push({ prio: 'moyenne', text: 'FC HAUTE' });
      if (!fvLike && !v.cpr && v.hr < 40) A.push({ prio: 'haute', text: 'FC BASSE' });
      if (!v.capno && v.rr < 5 && !fvLike) A.push({ prio: 'haute', text: 'APNÉE' });
    }
    if (v.spo2Probe) {
      if (v.perf <= 0.2 || fvLike) A.push({ prio: 'moyenne', text: 'SpO₂ SANS SIGNAL' });
      else if (v.spo2 < 85) A.push({ prio: 'haute', text: 'SpO₂ BASSE' });
      else if (v.spo2 < 90) A.push({ prio: 'moyenne', text: 'SpO₂ BASSE' });
    }
    if (v.nibp && v.nibp.s < 90) A.push({ prio: 'moyenne', text: 'PNI BASSE' });
    A.sort((a, b) => (a.prio === 'haute' ? 0 : 1) - (b.prio === 'haute' ? 0 : 1));
    return A[0] || null;
  },
  alarmSound(dt) {
    const a = this.alarmNow();
    const S = this.S;
    const line = $('#alarmLine');
    if (a) { line.hidden = false; line.textContent = 'Alarme : ' + a.text + (S.t < S.silencedUntil ? ' (son coupé)' : ''); }
    else line.hidden = true;
    if (!a || S.t < S.silencedUntil) { this.alarmT = 0; return; }
    this.alarmT -= dt;
    if (this.alarmT <= 0) {
      if (a.prio === 'haute') {
        [0, 0.12, 0.24, 0.5, 0.62].forEach((w, i) => Sound.beep(i < 3 ? 988 : 784, 0.09, 0.07, 'triangle', w));
        this.alarmT = 2.6;
      } else {
        [0, 0.2, 0.4].forEach(w => Sound.beep(660, 0.12, 0.05, 'triangle', w));
        this.alarmT = 7;
      }
    }
  },
  renderTabs() {
    const def = this.def;
    $('#actTabs').innerHTML = def.cats.map(c => `<button role="tab" data-c="${c}" aria-selected="${c === this.tab}">${esc(CAT_LABELS[c] || c)}</button>`).join('');
    $$('#actTabs button').forEach(b => b.onclick = () => { this.tab = b.dataset.c; this.renderTabs(); this.renderActions(); });
  },
  renderActions() {
    const S = this.S, def = this.def;
    const list = def.actions.filter(a => a.cat === this.tab);
    const html = [];
    for (const a of list) {
      const st = this.avail(a);
      if (st.hide) continue;
      const crew = S.crew.find(c => c.busy && c.busy.act === a);
      const queued = S.queue.some(q => q.act === a);
      let cls = 'act', small = typeof a.detail === 'function' ? a.detail(S) : (a.detail || '');
      if (st.done) { cls += ' done'; small = (a.doneLabel ? a.doneLabel(S) : 'Fait à ' + fmtClock(S.done[a.id])); }
      else if (st.reason) { cls += ' na warn'; small = st.reason; }
      if (a.stock && !st.reason) small += (small ? ' · ' : '') + `stock : ${S.stock[a.stock]}`;
      let bar = '';
      if (crew) {
        cls += ' running';
        const k = clamp((S.t - crew.busy.start) / (crew.busy.end - crew.busy.start), 0, 1);
        small = `${crew.short} s'en occupe` + (isFinite(crew.busy.end) ? ` · ${Math.ceil(crew.busy.end - S.t)} s` : '');
        bar = `<span class="bar"><i style="width:${(k * 100).toFixed(0)}%"></i></span>`;
      } else if (queued) { cls += ' running'; small = 'En attente d\'un membre d\'équipage libre'; }
      html.push(`<button class="${cls}" data-a="${a.id}"><span>${esc(typeof a.label === 'function' ? a.label(S) : a.label)}</span>${small ? `<small>${esc(small)}</small>` : ''}${bar}</button>`);
    }
    const el = $('#actList');
    const scroll = el.scrollTop;
    el.innerHTML = html.join('') || '<p class="small-print" style="padding:8px">Rien à faire ici pour le moment.</p>';
    el.scrollTop = scroll;
    $$('#actList .act').forEach(b => b.onclick = () => this.act(b.dataset.a));
    const free = S.crew.filter(c => !c.busy).map(c => c.short);
    $('#crewFree').textContent = free.length ? 'Libres : ' + free.join(', ') : 'Tout le monde est occupé';
  },
  renderAll() {
    const S = this.S, def = this.def;
    if (!S) return;
    $('#simClock').innerHTML = `${fmtClock(S.t)}<small>depuis l'alerte</small>`;
    $('#patObs').textContent = def.observe(S);
    this.renderActions();
    const g = $('#guide');
    if (S.mode === 'exam') {
      g.innerHTML = '<p>Mode examen : AURA note ce que vous faites et vous répondra au bilan. Le moniteur, l\'équipage et le sol restent disponibles.</p>';
    } else {
      let nowSet = false;
      const items = def.guide.map(it => {
        const ok = it.done(S);
        let cls = ok ? 'ok' : '';
        if (!ok && !nowSet && (!it.when || it.when(S))) { cls = 'now'; nowSet = true; }
        if (!ok && it.when && !it.when(S)) return '';
        return `<li class="${cls}">${esc(it.text)}</li>`;
      }).join('');
      const tip = def.tip ? def.tip(S) : '';
      const open = !!this.guideOpen;
      const ok = def.guide.filter(it => it.done(S)).length;
      g.innerHTML = `${tip ? `<div class="tip" style="margin-top:0">${esc(tip)}</div>` : ''}
        <button class="linkbtn" id="guideToggle" style="margin-top:8px">${open ? 'Masquer la fiche' : `Voir la fiche (${ok} étape${ok > 1 ? 's' : ''} sur ${def.guide.length})`}</button>
        ${open ? `<ol>${items}</ol>` : ''}`;
      $('#guideToggle').onclick = () => { this.guideOpen = !this.guideOpen; this.renderAll(); };
    }
  },
  finish(end) {
    const S = this.S;
    if (!S || S.ended) return;
    S.ended = end;
    this.running = false;
    try { speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* rien */ }
    const def = this.def;
    const d = def.debrief(S);
    const hist = store.get('sims', []);
    hist.unshift({ d: Date.now(), k: def.id, v: d.verdict, t: Math.round(S.t) });
    store.set('sims', hist.slice(0, 30));
    const crit = d.criteria.map(c => `<div class="crit"><span class="${c.ok === true ? 'i-ok' : c.ok === 'mid' ? 'i-mid' : 'i-ko'}">${c.ok === true ? '✓' : c.ok === 'mid' ? '~' : '✗'}</span><span>${esc(c.text)}</span></div>`).join('');
    const tl = S.log.filter(l => l.kind !== 'aura' || /^Alerte/.test(l.text)).slice(0, 80)
      .map(l => `<tr><td>${fmtClock(l.t)}</td><td>${esc(l.text)}</td></tr>`).join('');
    $('#dbBody').innerHTML = `
      <p class="eyebrow">Bilan de la simulation</p>
      <h2 id="dbTitle">${esc(end.title)}</h2>
      <p class="lead">${esc(end.text)}</p>
      <div class="score-big"><span class="val">${esc(d.verdict)}</span><span class="chip">${fmtDur(S.t)} de prise en charge</span><span class="chip">${S.mode === 'exam' ? 'mode examen' : 'mode guidé'}</span><span class="chip">${esc(COMM[S.comm].label)}</span></div>
      <h3>Ce qui compte dans cette urgence</h3>${crit}
      ${d.learn && d.learn.length ? `<h3>À retenir</h3><ul>${d.learn.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <h3>Déroulé</h3><table class="timeline">${tl}</table>
      <h3>Sources</h3><ul class="src">${d.sources.map(s => s.url ? `<li><a class="link" href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a></li>` : `<li>${esc(s.title)}</li>`).join('')}</ul>
      <p class="small-print">Modèle simplifié à but d'entraînement : les réactions du patient sont des choix AURA, calibrés sur les sources citées, pas une prédiction médicale.</p>
      <div class="actions"><button class="btn" id="dbAgain">Recommencer</button><button class="btn primary" id="dbMenu">Retour au menu</button></div>`;
    $('#debrief').hidden = false;
    $('#dbAgain').onclick = () => { $('#debrief').hidden = true; this.stop(); this.open(def.id); };
    if (EMBED) $('#dbMenu').textContent = 'Revenir à AURA';
    $('#dbMenu').onclick = () => {
      $('#debrief').hidden = true;
      if (EMBED) { postParent({ type: 'aura-sim-end', key: def.id, outcome: end.outcome, verdict: d.verdict, seconds: Math.round(S.t) }); this.stop(); return; }
      this.stop(); goMenu();
    };
  },
  stop() {
    App.frameHooks.delete(this.frameHook);
    this.S = null; this.running = false;
    $('#simHud').hidden = true; $('#usPanel').hidden = true; $('#speech').hidden = true; $('#cprPanel').hidden = true;
    App.frameHooks.delete(US.hook);
    $('#log').innerHTML = '';
  }
};

function stationAudio(ctx, out) {
  const fans = noiseBand(ctx, out, 'pink', 'lowpass', 900, 0.4, 0.05);
  const low = noiseBand(ctx, out, 'brown', 'lowpass', 180, 0.5, 0.06);
  const hums = [97, 194, 291].map((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f + Math.random(); g.gain.value = [0.006, 0.004, 0.002][i]; o.connect(g).connect(out); o.start(); return o; });
  return { stop() { fans.stop(); low.stop(); hums.forEach(o => { try { o.stop(); } catch (e) { /* rien */ } }); } };
}
