/* Sophie : intelligence artificielle de langage, facultative.
   Sans elle, tout fonctionne. Avec elle, Sophie converse plus librement et
   reformule, à partir des fiches seulement. Elle ne calcule aucune probabilité,
   ne choisit aucun traitement et ne change aucune dose (R-RAI-09, R-TRT-05).
   La clé reste dans ce navigateur et n'est envoyée qu'au service choisi. */
(function (root) {
  'use strict';
  const A = root.AURA;
  const L = A.llm = {};
  L.PROVIDERS = {
    aucune: { label: 'Aucune (tout fonctionne sans)' },
    claude: { label: 'Claude (Anthropic)', model: 'claude-sonnet-5-5', models: ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'] },
    openai: { label: 'Service compatible OpenAI', model: 'gpt-4o-mini', url: 'https://api.openai.com/v1' },
    ollama: { label: 'Ollama, sur l\'ordinateur, sans internet', model: 'llama3.1', url: 'http://localhost:11434' }
  };
  const cfg = () => A.store.state.settings.ai || {};
  const keyed = () => { const c = cfg(); return !!(c.provider && c.provider !== 'aucune' && (c.provider === 'ollama' || !!c.key)); };

  // Dans un artefact claude.ai, la page peut demander à Claude sans clé : l'accord est demandé
  // à la personne au premier message ; sans accord, Sophie continue sans IA de langage.
  let sample = null, sampleOff = false;
  L.inArtifact = () => !!(root.claude && typeof root.claude.use === 'function');
  if (L.inArtifact()) {
    try { root.claude.use('sample').then(s => { sample = s || null; }, () => { sample = null; }); } catch (e) { /* rien */ }
  }
  const viaSample = () => !keyed() && !!sample && !sampleOff;
  L.ready = () => keyed() || viaSample();

  const ACTIONS = ['go', 'sim', 'scene', 'video', 'conference', 'journal', 'triage'];
  function system(o) {
    const S = A.store, id = S.state.who, p = S.profile(id), m = S.member(id);
    const name = S.sophieName(id);
    const kb = (o.kb || []).filter(Boolean).map(f => '[' + f.id + '] ' + f.nom + '. Reconnaître : ' + (f.textes.reconnaitre || '') + ' À bord : ' + (f.textes.bord || '') + ' Alarme : ' + (f.textes.alarme || '')).join('\n');
    return [
      'Tu es ' + name + ', l\'assistante de santé à bord d\'un vaisseau en route vers Mars (jour ' + S.day() + '). Tu parles français, tu tutoies, phrases courtes, ton chaleureux et calme. Pas de listes, pas de markdown, deux à quatre phrases au plus.',
      'Tu parles avec ' + p.name + ' (' + p.role + '). L\'équipage n\'est pas médecin. La médecin de bord est Keiko Tanaka.',
      'Règles strictes : tu ne poses jamais de diagnostic, tu parles d\'orientation ; tu ne calcules aucune probabilité ; tu ne proposes aucun médicament ni aucune dose ; pour un symptôme, propose l\'orientation guidée (action triage) ; pour un signe grave, dis de prévenir Keiko immédiatement.',
      'Pour une question médicale, réponds seulement à partir des fiches ci-dessous, et cite leur numéro entre crochets. Si les fiches ne répondent pas, dis-le simplement.',
      'Fiches utiles :\n' + (kb || 'aucune'),
      'Réponds uniquement avec un objet JSON : {"dire": "ta réponse", "action": null} ou avec une action parmi : {"type":"go","route":"sante|journal|videos|simulations|evasion|defis|conference"}, {"type":"sim","key":"arret|anaphylaxie|fumee|calcul"}, {"type":"scene","key":"earth|ocean|lake|desert"}, {"type":"triage","text":"..."}.'
    ].join('\n\n');
  }
  function history() {
    const m = A.store.me();
    return (m ? m.chat : []).slice(-8).map(x => ({ role: x.from === 'me' ? 'user' : 'assistant', content: x.text }));
  }
  async function call(sys, msgs) {
    if (viaSample()) {
      // consignes dans un premier tour « user », puis l'historique ; la liste finit sur le message de la personne
      const turns = [{ role: 'user', content: sys }];
      msgs.forEach(m => { if (m.content) turns.push({ role: m.role, content: String(m.content).slice(0, 2000) }); });
      if (turns[turns.length - 1].role !== 'user') return null;
      try {
        const r = await sample(turns, { modelTier: 'quick', cache: false });
        return r && r.text;
      } catch (e) {
        if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e && e.code)) sampleOff = true;
        throw new Error('IA ' + ((e && e.code) || 'indisponible'));
      }
    }
    const c = cfg();
    const P = L.PROVIDERS[c.provider];
    const model = c.model || P.model;
    if (c.provider === 'claude') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model, max_tokens: 400, system: sys, messages: msgs })
      });
      if (!r.ok) throw new Error('Claude ' + r.status);
      const j = await r.json();
      return (j.content || []).map(x => x.text || '').join('');
    }
    if (c.provider === 'openai') {
      const r = await fetch((c.url || P.url).replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + c.key },
        body: JSON.stringify({ model, max_tokens: 400, messages: [{ role: 'system', content: sys }].concat(msgs) })
      });
      if (!r.ok) throw new Error('IA ' + r.status);
      const j = await r.json();
      return j.choices[0].message.content;
    }
    if (c.provider === 'ollama') {
      const r = await fetch((c.url || P.url).replace(/\/$/, '') + '/api/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'system', content: sys }].concat(msgs) })
      });
      if (!r.ok) throw new Error('Ollama ' + r.status);
      const j = await r.json();
      return j.message.content;
    }
    return null;
  }
  function parse(txt) {
    if (!txt) return null;
    const m = txt.match(/\{[\s\S]*\}/);
    let o = null;
    try { o = JSON.parse(m ? m[0] : txt); } catch (e) { return { say: txt.replace(/[*#_`]/g, '').slice(0, 600) }; }
    const out = { say: String(o.dire || o.say || '').slice(0, 700) };
    if (o.action && ACTIONS.includes(o.action.type)) out.action = o.action;
    const src = out.say.match(/\[(F-[A-Z]{3}-\d\d)\]/);
    if (src) { out.source = src[1]; out.say = out.say.replace(/\s*\[(F-[A-Z]{3}-\d\d)\]/g, ''); }
    return out;
  }
  L.chat = async (text, o) => {
    const h = history();
    // le message vient d'être noté dans l'historique : on ne l'envoie qu'une fois
    if (h.length && h[h.length - 1].role === 'user' && h[h.length - 1].content === text) h.pop();
    return parse(await call(system(o || {}), h.concat([{ role: 'user', content: text }])));
  };
  L.test = async () => parse(await call('Réponds en JSON {"dire":"..."} : une phrase courte en français pour dire que la connexion fonctionne.', [{ role: 'user', content: 'Test' }]));
})(typeof self !== 'undefined' ? self : this);
