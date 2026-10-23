// Tests des fonctions de la plateforme : signes d’alarme, vérifications avant
// un médicament, test de réaction, mission simulée, entretien de la semaine,
// liaison avec la Terre (destinataires et confidentialité) et étage IA.
// Lancer avec : npm test
'use strict';
const assert = require('assert');
const D = require('../docs/js/data.js');
const E = require('../docs/js/engine.js');
const S = require('../docs/js/store.js');
const AI = require('../docs/js/ai.js');

const DAY = 1440;
let passed = 0, failed = 0;
const queue = [];
function test(name, fn) { queue.push({ name, fn }); }
function section(title) { queue.push({ title }); }

/* ------------------------------------------------------------------ */
section('Signes d’alarme');
const flags = t => E.detectRedFlags(t, D.redFlags, { names: D.crew.map(c => c.name.split(' ')[0]) });
test('« j’ai très mal à la poitrine » : signe d’alarme, à la première personne', () => {
  const r = flags('J’ai très mal à la poitrine depuis dix minutes, ça serre.');
  const th = r.find(x => x.id === 'thorax');
  assert.ok(th, JSON.stringify(r));
  assert.strictEqual(th.self, true);
});
test('une négation n’est pas un signe d’alarme', () => {
  assert.strictEqual(flags('Je n’ai pas de douleur dans la poitrine, juste un peu de fatigue.').length, 0);
});
test('une question d’information reste une information', () => {
  const r = flags('Est-ce que la douleur thoracique est fréquente en apesanteur ?');
  assert.ok(r.length >= 1);
  assert.ok(r.every(x => !x.self));
});
test('le nom d’un membre d’équipage compte comme la personne concernée', () => {
  const r = flags('Keiko a perdu connaissance dans le module.');
  assert.ok(r.some(x => x.id === 'conscience' && x.self));
});
test('pas de fausse alerte sur des expressions courantes', () => {
  ['Il y a un malaise dans l’équipage depuis la réunion.', 'Je suis paralysé par le stress avant la sortie.', 'Cette réunion va me tuer.', 'Je suis confus, je ne comprends pas la procédure.']
    .forEach(t => assert.strictEqual(flags(t).filter(x => x.self).length, 0, t));
});
test('un signe d’alarme ouvre une alerte et le mode urgence', () => {
  const s = S.createState({});
  const r = S.reportRedFlag(s, { a: 'a2', flag: 'thorax', src: 'assistant', text: 'mal à la poitrine' });
  assert.strictEqual(r.alert.lv, 'urgence');
  assert.strictEqual(s.emergency.kind, 'alarme');
  assert.ok(s.queue.some(q => q.prio === 1), 'message prioritaire vers la Terre');
});

/* ------------------------------------------------------------------ */
section('Avant chaque médicament');
test('nausées de Lucas la veille d’une sortie : aucun médicament qui endort n’est proposé', () => {
  const s = S.createState({});
  const plan = S.actionOptions(s, 'a2', 'nausee');
  assert.ok(plan.allBlocked, 'tout est bloqué');
  assert.strictEqual(plan.level, 'medecin');
  const pro = plan.options.find(o => o.med === 'promethazine');
  assert.strictEqual(pro.checks.find(c => c.id === 'taches').state, 'no');
  assert.strictEqual(pro.checks.find(c => c.id === 'geste').state, 'warn');
});
test('mal de tête de Lucas : le paracétamol est proposé, avec le délai du sol', () => {
  const s = S.createState({});
  const plan = S.actionOptions(s, 'a2', 'cephalee');
  assert.strictEqual(plan.recommended, 'paracetamol');
  const para = plan.options.find(o => o.med === 'paracetamol');
  assert.ok(/décision se prend à bord/.test(para.checks.find(c => c.id === 'reponse').text));
});
test('un médicament périmé ou absent est bloqué', () => {
  const med = D.meds.find(m => m.id === 'ibuprofene');
  assert.ok(E.actionChecks(med, { stock: 20, day: med.expiryDay + 1, tasks: [] }).blocked);
  assert.ok(E.actionChecks(med, { stock: 0, day: 10, tasks: [] }).blocked);
  const old = E.actionChecks(med, { stock: 200, day: med.checkAfterDay + 1, tasks: [] });
  assert.ok(!old.blocked && old.caution, 'stockage long : à vérifier, pas bloqué');
});

/* ------------------------------------------------------------------ */
section('Test de réaction');
test('médiane, erreurs d’attention et réponses anticipées', () => {
  const st = E.reactionStats([250, 260, 270, 400, 80], 1, { lapse: 355 });
  assert.strictEqual(st.n, 4);
  assert.strictEqual(st.median, 265);
  assert.strictEqual(st.lapses, 1);
  assert.strictEqual(st.falseStarts, 1);
});
test('un test enregistré entre dans la tendance', () => {
  const s = S.createState({});
  const before = s.reactions.filter(x => x.a === 'a2').length;
  const rec = S.addReaction(s, { a: 'a2', rts: [300, 310, 320, 330], falseStarts: 0, secs: 60 });
  assert.strictEqual(rec.median, 315);
  assert.strictEqual(s.reactions.filter(x => x.a === 'a2').length, before + 1);
  assert.ok(S.reactionTrend(s, 'a2').last === rec);
});
test('le temps de réaction de Keiko Tanaka ralentit avec le sommeil court', () => {
  const s = S.createState({});
  assert.ok(S.reactionTrend(s, 'a3').slower);
});

/* ------------------------------------------------------------------ */
section('Mission simulée');
const stock = {}; D.meds.forEach(m => { stock[m.id] = m.stock; });
const mission = mult => E.simulateMission({ conditions: D.conditions, meds: D.meds, crewSize: 4, startDay: 0, endDay: 900, transitions: D.mission.gravityTransitions, multiplier: mult, runs: 600, seed: 11, stock });
test('temps de travail perdu : positif, plus élevé en scénario pessimiste', () => {
  const a = mission(1), b = mission(1.4);
  assert.ok(a.lost.mean > 0 && a.lost.pctMean > 0 && a.lost.pctMean < 0.2, a.lost.pctMean);
  assert.ok(b.lost.mean > a.lost.mean);
  assert.ok(a.lost.p90 >= a.lost.mean);
});
test('même graine, même résultat', () => {
  assert.deepStrictEqual(mission(1).lost, mission(1).lost);
});

/* ------------------------------------------------------------------ */
section('Entretien de la semaine');
test('la question sur le sommeil s’appuie sur la semaine de Keiko Tanaka', () => {
  const s = S.createState({});
  const itv = S.startInterview(s, 'a3');
  assert.ok(/plus courtes depuis/.test(itv.plan[0].q), itv.plan[0].q);
});
test('une réponse qui signale une gêne appelle une précision', () => {
  assert.ok(E.followUpNeeded('J’ai un peu mal au dos depuis mardi'));
  assert.ok(!E.followUpNeeded('Très bien, merci'));
});
test('la partie psychologique ne part qu’avec l’accord de la personne', () => {
  const s = S.createState({ day: 63, minute: 18 * 60 });
  const itv = S.startInterview(s, 'a2');
  itv.plan.forEach(tp => S.answerInterview(s, itv.id, { q: tp.q, text: tp.part === 'psy' ? 'Un peu seul ces jours-ci.' : 'Ça va.' }));
  S.finishInterview(s, itv.id);
  assert.ok(itv.summary.med.indexOf('Entretien de Lucas Moreau') === 0);
  const sansPsy = S.sendInterview(s, itv.id, { med: true, psy: false });
  assert.ok(sansPsy.item.body.indexOf('Partie psychologique') < 0);
  const itv2 = S.startInterview(s, 'a2');
  itv2.plan.forEach(tp => S.answerInterview(s, itv2.id, { q: tp.q, text: tp.part === 'psy' ? 'Un peu seul ces jours-ci.' : 'Ça va.' }));
  S.finishInterview(s, itv2.id);
  assert.ok(itv2.summary.psy, 'semaine impaire : partie psychologique abordée');
  const avec = S.sendInterview(s, itv2.id, { med: true, psy: true });
  assert.ok(avec.item.body.indexOf('Partie psychologique') >= 0);
  const rien = S.startInterview(s, 'a1');
  S.finishInterview(s, rien.id);
  assert.strictEqual(S.sendInterview(s, rien.id, { med: false, psy: false }).item, null, 'rien n’est envoyé sans accord');
});

/* ------------------------------------------------------------------ */
section('Liaison avec la Terre');
test('les réponses aux rapports médicaux ne reviennent qu’à la médecin de bord', () => {
  const s = S.createState({});
  const reportReplies = s.inbox.filter(m => m.kind === 'reponse' && /Rapport médical/.test(m.title));
  assert.ok(reportReplies.length > 0);
  const lucas = S.inboxFor(s, 'a2');
  assert.ok(!lucas.some(m => /Rapport médical/.test(m.title)), 'rien sur les autres membres');
  assert.ok(S.inboxFor(s, 'doctor').some(m => /Rapport médical/.test(m.title)));
});
test('un message de Lucas : la réponse simulée revient à Lucas seulement', () => {
  const s = S.createState({});
  const it = S.sendMessage(s, { title: 'Question sur le sommeil', text: 'Je dors mal depuis trois jours.', prio: 2, a: 'a2' });
  S.advanceTo(s, s.now + 3 * 60);
  const reply = s.inbox.find(m => m.ref === it.id);
  assert.ok(reply && reply.status === 'reçu');
  assert.ok(S.inboxFor(s, 'a2').indexOf(reply) >= 0);
  assert.ok(S.inboxFor(s, 'a1').indexOf(reply) < 0);
  assert.ok(S.inboxFor(s, 'doctor').indexOf(reply) >= 0);
});
test('le médecin au sol peut répondre avant la réponse simulée', () => {
  const s = S.createState({});
  const it = S.sendMessage(s, { title: 'Douleur au genou', text: 'Depuis hier soir.', prio: 2, a: 'a4' });
  S.advanceTo(s, s.now + 10);
  assert.strictEqual(it.status, 'reçu');
  S.sendDown(s, { ref: it.id, title: 'Réponse', text: 'Glace et repos, on en reparle demain.' });
  S.advanceTo(s, s.now + 4 * 60);
  const replies = s.inbox.filter(m => m.ref === it.id);
  assert.strictEqual(replies.length, 1);
  assert.strictEqual(replies[0].from, 'Médecin au sol');
  assert.strictEqual(replies[0].to, 'a4');
});
test('une demande au psychologue reste privée, même pour la médecin de bord', () => {
  const s = S.createState({});
  const it = S.sendMessage(s, { title: 'Demande d’entretien avec le psychologue au sol', text: 'Entretien privé souhaité.', kind: 'psy', prio: 2, a: 'a1' });
  S.advanceTo(s, s.now + 3 * 60);
  const reply = s.inbox.find(m => m.ref === it.id);
  assert.ok(reply && reply.priv);
  assert.ok(S.inboxFor(s, 'a1').indexOf(reply) >= 0);
  assert.ok(S.inboxFor(s, 'doctor').indexOf(reply) < 0);
});
test('un message du sol pour tout l’équipage est lu par chacun', () => {
  const s = S.createState({});
  const m = S.sendDown(s, { to: 'all', title: 'Rappel', text: 'Hydratation pendant la sortie.' });
  S.advanceTo(s, s.now + 10);
  D.crew.forEach(c => assert.ok(S.inboxFor(s, c.id).indexOf(m) >= 0, c.id));
  const d = S.sendDown(s, { to: 'doctor', title: 'Pour la médecin de bord', text: 'Protocole mis à jour.' });
  S.advanceTo(s, s.now + 10);
  assert.ok(S.inboxFor(s, 'doctor').indexOf(d) >= 0);
  assert.ok(S.inboxFor(s, 'a2').indexOf(d) < 0);
});
test('élision des prénoms', () => {
  assert.strictEqual(S.de('Aminata Sarr'), 'd’Aminata Sarr');
  assert.strictEqual(S.de('Lucas Moreau'), 'de Lucas Moreau');
});

/* ------------------------------------------------------------------ */
section('Étage IA');
const cfgA = { provider: 'anthropic', providers: { anthropic: { key: 'sk-ant-test' } } };
test('sans clé, l’IA n’est pas prête ; Ollama n’a pas besoin de clé', () => {
  assert.ok(!AI.ready({ provider: 'anthropic', providers: {} }));
  assert.ok(AI.ready(cfgA));
  assert.ok(!AI.ready({ provider: 'ollama', providers: {} }), 'il faut un modèle');
  assert.ok(AI.ready({ provider: 'ollama', providers: { ollama: { model: 'llama3.2' } } }));
  assert.strictEqual(AI.label(cfgA), 'Claude Sonnet 5.5');
});
test('requête Claude : en-têtes de l’API Anthropic, sans température', () => {
  const req = AI.buildRequest(AI.current(cfgA), { system: 'S', messages: [{ role: 'user', content: 'Bonjour' }] });
  assert.strictEqual(req.url, 'https://api.anthropic.com/v1/messages');
  assert.strictEqual(req.init.headers['x-api-key'], 'sk-ant-test');
  assert.strictEqual(req.init.headers['anthropic-version'], '2023-06-01');
  assert.strictEqual(req.init.headers['anthropic-dangerous-direct-browser-access'], 'true');
  const body = JSON.parse(req.init.body);
  assert.strictEqual(body.model, 'claude-sonnet-5-5');
  assert.strictEqual(body.stream, true);
  assert.strictEqual(body.system, 'S');
  assert.ok(!('temperature' in body));
});
test('requête OpenAI : max_completion_tokens, sans température ; Mistral : max_tokens', () => {
  const o = AI.buildRequest(AI.current({ provider: 'openai', providers: { openai: { key: 'k', model: 'm' } } }), { messages: [{ role: 'user', content: 'x' }] });
  const b = JSON.parse(o.init.body);
  assert.ok(b.max_completion_tokens && !('temperature' in b) && !('max_tokens' in b));
  assert.strictEqual(o.init.headers.authorization, 'Bearer k');
  const m = JSON.parse(AI.buildRequest(AI.current({ provider: 'mistral', providers: { mistral: { key: 'k' } } }), { messages: [{ role: 'user', content: 'x' }] }).init.body);
  assert.ok(m.max_tokens && m.temperature === 0.3);
});
test('flux SSE découpé n’importe où', () => {
  const raw = 'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Bon"}}\n\n' +
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"jour"}}\n\n' +
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n';
  const feed = AI.sseParser();
  let text = '', stop = null, done = false;
  for (let i = 0; i < raw.length; i += 7) feed(raw.slice(i, i + 7)).forEach(e => { const r = AI.readEvent('anthropic', e); if (r.text) text += r.text; if (r.stop) stop = r.stop; if (r.done) done = true; });
  feed('', true);
  assert.strictEqual(text, 'Bonjour');
  assert.strictEqual(stop, 'end_turn');
  assert.ok(done);
  assert.deepStrictEqual(AI.readEvent('openai', { data: '[DONE]' }), { done: true });
  assert.strictEqual(AI.readEvent('openai', { data: '{"choices":[{"delta":{"content":"x"}}]}' }).text, 'x');
});
test('consignes et lecture des réponses', () => {
  const t = AI.parseTurn('Merci. Et votre appétit, cette semaine ? [SUIVANTE]');
  assert.strictEqual(t.tag, 'suivante');
  assert.ok(t.text.indexOf('[') < 0);
  assert.strictEqual(AI.parseTurn('Depuis quand ? [PRECISION]').tag, 'precision');
  const sum = AI.parseSummary('### Partie médicale\nSommeil court.\n### Partie psychologique\nNon abordée cette semaine.');
  assert.strictEqual(sum.med, 'Sommeil court.');
  assert.strictEqual(sum.psy, '');
  const msg = AI.parseMessage('Objet : Maux de tête répétés\n\nDepuis J+55, maux de tête le matin.');
  assert.strictEqual(msg.title, 'Maux de tête répétés');
  assert.ok(msg.text.indexOf('Depuis J+55') === 0);
});
test('mise en forme sûre, citations, tirets retirés', () => {
  const h = AI.md('**Important** : buvez de l’eau [1].\n- un\n- deux\n<script>alert(1)</script>', { cites: 2 });
  assert.ok(h.indexOf('<b>Important</b>') >= 0);
  assert.ok(h.indexOf('data-cite="1"') >= 0);
  assert.ok(h.indexOf('<ul><li>un</li><li>deux</li></ul>') >= 0);
  assert.ok(h.indexOf('<script>') < 0 && h.indexOf('&lt;script&gt;') >= 0);
  assert.strictEqual(AI.clean('le CO₂ — surtout la nuit'), 'le CO₂, surtout la nuit');
});

/* ------------------------------------------------------------------ */
// Appels réseau simulés (fetch remplacé), exécutés à la suite
const asyncTests = [];
asyncTests.push(['réponse Claude en flux, texte reconstitué', async () => {
  const enc = new TextEncoder();
  const chunks = ['event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Prévenez "}}\n\n', 'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"la médecin."}}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n'];
  let seen = null;
  const fetchFn = async (url, init) => {
    seen = { url, init };
    const body = new ReadableStream({ start(c) { chunks.forEach(x => c.enqueue(enc.encode(x))); c.close(); } });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  const parts = [];
  const r = await AI.stream(cfgA, { fetch: fetchFn, messages: [{ role: 'user', content: 'test' }], onText: (all, piece) => parts.push(piece) });
  assert.strictEqual(r.text, 'Prévenez la médecin.');
  assert.strictEqual(parts.length, 2);
  assert.strictEqual(seen.init.headers['x-api-key'], 'sk-ant-test');
}]);
asyncTests.push(['clé refusée : message clair, sans plantage', async () => {
  const fetchFn = async () => new Response(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status: 401, headers: { 'content-type': 'application/json' } });
  await assert.rejects(AI.stream(cfgA, { fetch: fetchFn, messages: [{ role: 'user', content: 'x' }] }), e => e instanceof AI.AIError && /Clé refusée/.test(e.message));
}]);
asyncTests.push(['service compatible OpenAI qui refuse un paramètre : nouvel essai minimal', async () => {
  const bodies = [];
  const fetchFn = async (url, init) => {
    bodies.push(JSON.parse(init.body));
    if (bodies.length === 1) return new Response(JSON.stringify({ error: { message: 'Unsupported parameter: max_tokens' } }), { status: 400, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'prêt' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const r = await AI.stream({ provider: 'groq', providers: { groq: { key: 'k', model: 'm' } } }, { fetch: fetchFn, messages: [{ role: 'user', content: 'x' }] });
  assert.strictEqual(r.text, 'prêt');
  assert.strictEqual(bodies.length, 2);
  assert.ok(!('max_tokens' in bodies[1]) && !('temperature' in bodies[1]));
}]);
asyncTests.push(['pas de réseau : AURA continue sans IA', async () => {
  const fetchFn = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(AI.stream(cfgA, { fetch: fetchFn, messages: [{ role: 'user', content: 'x' }] }), e => /continue sans IA/.test(e.message));
}]);

(async () => {
  for (const t of queue) {
    if (t.title) { console.log(t.title); continue; }
    try { t.fn(); passed++; console.log('  ok   ' + t.name); }
    catch (e) { failed++; console.log('  ÉCHEC ' + t.name + '\n       ' + (e && e.message)); }
  }
  console.log('Appels au service d’IA (simulés)');
  for (const [name, fn] of asyncTests) {
    try { await fn(); passed++; console.log('  ok   ' + name); }
    catch (e) { failed++; console.log('  ÉCHEC ' + name + '\n       ' + (e && e.message)); }
  }
  console.log('\n' + passed + ' test(s) réussi(s), ' + failed + ' échec(s).');
  process.exit(failed ? 1 : 0);
})();
