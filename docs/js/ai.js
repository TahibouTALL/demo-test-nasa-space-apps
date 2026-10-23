/* AURA : étage IA facultatif.
   Le cœur d’AURA (normes, alertes, pharmacie, file vers la Terre) ne passe
   jamais par ici. Ce module ne sert qu’à rédiger : répondre à une question à
   partir des fiches de bord, mener l’entretien de la semaine, préparer une
   synthèse, reformuler, proposer un message. Sans IA connectée, chaque
   fonction a une version à base de règles dans le reste de la plateforme.

   Fournisseurs : Claude (API Anthropic), tout service compatible avec l’API
   OpenAI (OpenAI, Gemini, Mistral, Groq, OpenRouter) et Ollama, qui fait
   tourner un modèle sur l’ordinateur, sans internet. La clé reste dans ce
   navigateur : elle n’est envoyée qu’au fournisseur choisi. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AURA_AI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const KEY = 'aura.ia';
  const ANTHROPIC_VERSION = '2023-06-01';

  const PRESETS = {
    none: { label: 'Sans IA', kind: 'none', note: 'AURA répond avec les fiches de bord et des règles. Rien ne sort de ce navigateur.' },
    anthropic: {
      label: 'Claude (Anthropic)', kind: 'anthropic', base: 'https://api.anthropic.com/v1', model: 'claude-sonnet-5-5',
      models: [
        { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5, rapide et précis' },
        { id: 'claude-opus-5-5', name: 'Claude Opus 5.5, plus approfondi' },
        { id: 'claude-fable-5-1', name: 'Claude Fable 5.1, le plus puissant' },
        { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5, le plus rapide' }
      ],
      keyHint: 'sk-ant-…', keyUrl: 'https://console.anthropic.com/settings/keys',
      note: 'Clé à créer dans la console Anthropic. La page appelle l’API directement depuis le navigateur.'
    },
    openai: { label: 'OpenAI', kind: 'openai', base: 'https://api.openai.com/v1', model: '', modelHint: 'nom du modèle, ou « Lister les modèles »', keyHint: 'sk-…', tokenParam: 'max_completion_tokens', noTemperature: true },
    gemini: { label: 'Google Gemini', kind: 'openai', base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: '', modelHint: 'par exemple gemini-2.5-flash', keyHint: 'clé Google AI Studio' },
    mistral: { label: 'Mistral', kind: 'openai', base: 'https://api.mistral.ai/v1', model: 'mistral-small-latest', modelHint: 'par exemple mistral-small-latest', keyHint: 'clé Mistral' },
    groq: { label: 'Groq', kind: 'openai', base: 'https://api.groq.com/openai/v1', model: '', modelHint: 'nom du modèle, ou « Lister les modèles »', keyHint: 'gsk_…' },
    openrouter: { label: 'OpenRouter', kind: 'openai', base: 'https://openrouter.ai/api/v1', model: '', modelHint: 'par exemple anthropic/claude-sonnet-5-5', keyHint: 'sk-or-…' },
    ollama: {
      label: 'Ollama, sur cet ordinateur', kind: 'openai', base: 'http://localhost:11434/v1', model: '', modelHint: 'par exemple llama3.2 ou qwen2.5', noKey: true, local: true,
      note: 'Le modèle tourne sur l’ordinateur, sans internet. Depuis la version en ligne, lancez Ollama avec OLLAMA_ORIGINS=https://tahiboutall.github.io pour l’autoriser.'
    },
    custom: { label: 'Autre service compatible OpenAI', kind: 'openai', base: '', model: '', modelHint: 'nom du modèle', keyHint: 'clé du service' }
  };

  /* ------------------------------------------------------------------ */
  /* Réglages (navigateur seulement)                                      */
  /* ------------------------------------------------------------------ */
  function defaults() { return { provider: 'none', providers: {} }; }
  function load(storage) {
    try {
      const st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      const raw = st && st.getItem(KEY);
      const cfg = raw ? JSON.parse(raw) : defaults();
      if (!cfg.providers) cfg.providers = {};
      if (!PRESETS[cfg.provider]) cfg.provider = 'none';
      return cfg;
    } catch (e) { return defaults(); }
  }
  function save(cfg, storage) {
    try {
      const st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (st) st.setItem(KEY, JSON.stringify(cfg));
      return true;
    } catch (e) { return false; }
  }
  function current(cfg) {
    cfg = cfg || defaults();
    const id = PRESETS[cfg.provider] ? cfg.provider : 'none';
    const p = PRESETS[id];
    const own = (cfg.providers && cfg.providers[id]) || {};
    return {
      id, preset: p, kind: p.kind,
      key: (own.key || '').trim(),
      model: (own.model || p.model || '').trim(),
      base: ((own.base || p.base || '').trim()).replace(/\/+$/, '')
    };
  }
  function ready(cfg) {
    const c = current(cfg);
    if (c.kind === 'none') return false;
    if (!c.model || !c.base) return false;
    return !!(c.key || c.preset.noKey);
  }
  function modelName(c) {
    if (c.kind === 'none') return 'Sans IA';
    const m = (c.preset.models || []).find(x => x.id === c.model);
    if (m) return m.name.split(',')[0];
    return c.model || c.preset.label;
  }
  function label(cfg) {
    const c = current(cfg);
    if (c.kind === 'none') return 'Sans IA';
    return modelName(c) + (c.preset.local ? ' (sur l’ordinateur)' : '');
  }

  /* ------------------------------------------------------------------ */
  /* Requêtes                                                             */
  /* ------------------------------------------------------------------ */
  function buildRequest(c, o) {
    const max = o.maxTokens || 700;
    if (c.kind === 'anthropic') {
      const body = {
        model: c.model, max_tokens: max, stream: o.stream !== false,
        system: o.system || undefined,
        messages: o.messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      };
      return {
        url: c.base + '/messages',
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': c.key,
            'anthropic-version': ANTHROPIC_VERSION,
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify(body)
        }
      };
    }
    const msgs = [];
    if (o.system) msgs.push({ role: 'system', content: o.system });
    o.messages.forEach(m => msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
    const body = { model: c.model, messages: msgs, stream: o.stream !== false };
    if (!o.minimal) {
      body[c.preset.tokenParam || 'max_tokens'] = max;
      if (!c.preset.noTemperature) body.temperature = o.temperature === undefined ? 0.3 : o.temperature;
    }
    const headers = { 'content-type': 'application/json' };
    if (c.key) headers.authorization = 'Bearer ' + c.key;
    if (c.id === 'openrouter') { headers['X-Title'] = 'AURA'; }
    return { url: c.base + '/chat/completions', init: { method: 'POST', headers, body: JSON.stringify(body) } };
  }

  // Découpe un flux SSE en événements { event, data }
  function sseParser() {
    let buf = '', ev = null, data = [];
    return function feed(chunk, flush) {
      buf += chunk || '';
      const out = [];
      const lines = buf.split(/\r?\n/);
      buf = flush ? '' : lines.pop();
      const emit = () => { if (data.length) out.push({ event: ev, data: data.join('\n') }); ev = null; data = []; };
      for (const line of lines) {
        if (line === '') { emit(); continue; }
        if (line.charAt(0) === ':') continue;
        const i = line.indexOf(':');
        const field = i < 0 ? line : line.slice(0, i);
        let value = i < 0 ? '' : line.slice(i + 1);
        if (value.charAt(0) === ' ') value = value.slice(1);
        if (field === 'event') ev = value;
        else if (field === 'data') data.push(value);
      }
      if (flush) emit();
      return out;
    };
  }

  // Interprète un événement selon le fournisseur. Renvoie { text, done, stop, error }
  function readEvent(kind, e) {
    if (kind === 'anthropic') {
      let j;
      try { j = JSON.parse(e.data); } catch (err) { return {}; }
      if (j.type === 'content_block_delta' && j.delta && j.delta.type === 'text_delta') return { text: j.delta.text || '' };
      if (j.type === 'message_delta' && j.delta) return { stop: j.delta.stop_reason || null };
      if (j.type === 'message_stop') return { done: true };
      if (j.type === 'error') return { error: (j.error && (j.error.message || j.error.type)) || 'erreur du service', errorType: j.error && j.error.type };
      return {};
    }
    if (e.data === '[DONE]') return { done: true };
    let j;
    try { j = JSON.parse(e.data); } catch (err) { return {}; }
    if (j.error) return { error: j.error.message || String(j.error) };
    const ch = j.choices && j.choices[0];
    if (!ch) return {};
    const piece = ch.delta && typeof ch.delta.content === 'string' ? ch.delta.content : (ch.message && typeof ch.message.content === 'string' ? ch.message.content : '');
    return { text: piece, stop: ch.finish_reason || null };
  }

  function textFromJson(kind, j) {
    if (kind === 'anthropic') return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const ch = j.choices && j.choices[0];
    return ch && ch.message ? (ch.message.content || '') : '';
  }

  class AIError extends Error {
    constructor(message, info) { super(message); this.name = 'AIError'; this.info = info || {}; }
  }

  function friendly(status, detail, c) {
    const d = detail ? ' (' + String(detail).slice(0, 160) + ')' : '';
    if (status === 401 || status === 403) return 'Clé refusée par le service. Vérifiez la clé dans les réglages.' + d;
    if (status === 404) return 'Modèle ou adresse introuvable. Vérifiez le nom du modèle dans les réglages.' + d;
    if (status === 429) return 'Trop de demandes pour le moment. Réessayez dans une minute ; AURA continue sans IA en attendant.';
    if (status === 400) return 'Le service a refusé la demande.' + d;
    if (status >= 500) return 'Le service d’IA est surchargé ou indisponible. AURA continue sans IA.' + d;
    return 'Le service d’IA a répondu avec une erreur ' + status + '.' + d;
  }
  function networkMessage(c) {
    if (c && c.preset && c.preset.local) return 'Ollama ne répond pas. Vérifiez qu’il tourne sur cet ordinateur et que OLLAMA_ORIGINS autorise cette page.';
    return 'Pas de connexion au service d’IA. AURA continue sans IA : les réponses viennent des fiches de bord.';
  }

  async function stream(cfg, o) {
    const c = current(cfg);
    if (!ready(cfg)) throw new AIError('Aucune IA n’est connectée.', { code: 'none' });
    const fetchFn = o.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) throw new AIError('Ce navigateur ne permet pas d’appeler un service d’IA.', { code: 'nofetch' });
    const attempt = async (minimal) => {
      const req = buildRequest(c, Object.assign({}, o, { minimal }));
      let res;
      try {
        res = await fetchFn(req.url, Object.assign({}, req.init, { signal: o.signal }));
      } catch (err) {
        if (err && err.name === 'AbortError') throw new AIError('Réponse arrêtée.', { code: 'abort' });
        throw new AIError(networkMessage(c), { code: 'network' });
      }
      if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = (j.error && (j.error.message || j.error.type)) || j.message || ''; } catch (e) { /* rien */ }
        if (res.status === 400 && !minimal && c.kind === 'openai' && /max_tokens|max_completion_tokens|temperature|unsupported|not support/i.test(detail)) return attempt(true);
        throw new AIError(friendly(res.status, detail, c), { code: 'http', status: res.status });
      }
      return res;
    };
    const res = await attempt(false);
    const t0 = Date.now();
    let text = '', stop = null;
    const ctype = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
    if (ctype.indexOf('application/json') >= 0 || !res.body || !res.body.getReader) {
      const raw = await res.text();
      let j = null;
      try { j = JSON.parse(raw); } catch (e) { j = null; }
      if (j) text = textFromJson(c.kind, j);
      else {
        const feed = sseParser();
        feed(raw, true).forEach(e => { const r = readEvent(c.kind, e); if (r.text) text += r.text; if (r.error) throw new AIError(friendly(500, r.error, c), { code: 'stream' }); });
      }
      if (o.onText) o.onText(text, text);
      return { text, stop, ms: Date.now() - t0, model: c.model, provider: c.id };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    const feed = sseParser();
    let finished = false;
    try {
      while (!finished) {
        const { value, done } = await reader.read();
        const events = feed(done ? '' : dec.decode(value, { stream: true }), done);
        for (const e of events) {
          const r = readEvent(c.kind, e);
          if (r.error) throw new AIError(r.errorType === 'overloaded_error' ? 'Le service d’IA est surchargé. Réessayez dans un instant ; AURA continue sans IA.' : friendly(500, r.error, c), { code: 'stream' });
          if (r.text) { text += r.text; if (o.onText) o.onText(text, r.text); }
          if (r.stop) stop = r.stop;
          if (r.done) finished = true;
        }
        if (done) break;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') throw new AIError('Réponse arrêtée.', { code: 'abort', partial: text });
      if (err instanceof AIError) { err.info.partial = text; throw err; }
      throw new AIError(networkMessage(c), { code: 'network', partial: text });
    }
    return { text, stop, ms: Date.now() - t0, model: c.model, provider: c.id };
  }

  async function listModels(cfg, fetchFn) {
    const c = current(cfg);
    fetchFn = fetchFn || fetch;
    if (c.kind === 'none') return [];
    const headers = c.kind === 'anthropic'
      ? { 'x-api-key': c.key, 'anthropic-version': ANTHROPIC_VERSION, 'anthropic-dangerous-direct-browser-access': 'true' }
      : (c.key ? { authorization: 'Bearer ' + c.key } : {});
    let res;
    try { res = await fetchFn(c.base + '/models' + (c.kind === 'anthropic' ? '?limit=50' : ''), { headers }); }
    catch (e) { throw new AIError(networkMessage(c), { code: 'network' }); }
    if (!res.ok) throw new AIError(friendly(res.status, '', c), { code: 'http', status: res.status });
    const j = await res.json();
    const list = (j.data || j.models || []).map(m => ({ id: m.id || m.name, name: m.display_name || m.id || m.name }));
    return list.filter(m => m.id);
  }

  async function test(cfg, fetchFn) {
    const r = await stream(cfg, {
      fetch: fetchFn, maxTokens: 20, stream: true,
      system: 'Réponds par un seul mot.',
      messages: [{ role: 'user', content: 'Réponds simplement : prêt' }]
    });
    return r;
  }

  /* ------------------------------------------------------------------ */
  /* Consignes (prompts)                                                  */
  /* ------------------------------------------------------------------ */
  const RULES = [
    'Tu es l’assistant de santé d’AURA, à bord d’une mission habitée vers Mars. La mission, l’équipage et les données sont fictifs : c’est une démonstration.',
    'Tu écris en français courant, en phrases simples et complètes. N’utilise jamais de tiret long ni de tiret moyen. Pas de formule creuse, pas de point d’exclamation, pas d’émoticône.',
    'Tu ne poses pas de diagnostic et tu ne prescris rien. Tu ne modifies jamais une dose : seule la dose validée par la médecin de bord compte.',
    'Si la situation décrite peut être grave, ta première phrase est exactement : « Prévenez la médecin de bord maintenant. »'
  ].join('\n');

  const LEVELS = {
    simple: 'Tu parles à un membre d’équipage qui n’est pas médecin. Mots de tous les jours, gestes concrets, 120 mots au plus.',
    medical: 'Tu parles à la médecin de bord. Vocabulaire clinique précis et concis, 180 mots au plus.',
    english: 'Answer in plain English, for a crew member who is not a doctor, in 120 words at most. Keep the card numbers in brackets.'
  };

  function cardsBlock(cards) {
    return cards.map((c, i) => '[' + (i + 1) + '] ' + c.title + '\n' + c.text + (c.ctx ? '\nDans la mission en ce moment : ' + c.ctx : '')).join('\n\n');
  }

  function assistantPrompt(o) {
    const system = [
      RULES,
      LEVELS[o.level] || LEVELS.simple,
      'Tu réponds uniquement à partir des fiches de bord et des données de bord ci-dessous. Après chaque information, indique la fiche utilisée entre crochets, par exemple [2]. Si les fiches ne permettent pas de répondre, dis-le en une phrase et propose de poser la question à la médecin de bord ou de l’ajouter à la conférence de la semaine. N’invente aucun chiffre, aucun nom de médicament et aucune dose.',
      'Données de bord\n' + o.context,
      'Fiches de bord\n' + cardsBlock(o.cards)
    ].join('\n\n');
    const messages = (o.history || []).slice(-6).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })).filter(m => m.content);
    messages.push({ role: 'user', content: o.question });
    return { system, messages, maxTokens: o.level === 'medical' ? 700 : 520 };
  }

  function interviewerSystem(o) {
    return [
      RULES,
      'Tu mènes l’entretien médical de la semaine avec ' + o.name + ', comme le ferait son médecin de vol. Tu poses une seule question à la fois, en une ou deux phrases courtes, avec chaleur et sans jugement. Tu ne donnes pas de conseil médical pendant l’entretien et tu ne commentes pas longuement les réponses.',
      'Ce que tu sais déjà de sa semaine (données de bord) :\n' + o.facts
    ].join('\n\n');
  }
  function interviewTurn(o) {
    let user;
    if (o.first) {
      user = 'Commence l’entretien : salue ' + o.first + ' en une courte phrase, puis pose la première question, que tu peux reformuler : « ' + o.next.q + ' ». Termine par la balise [SUIVANTE].';
    } else if (!o.next) {
      user = 'Dernière réponse : « ' + o.last + ' ».\nL’entretien est terminé. Remercie en une phrase et demande s’il reste quelque chose à dire au médecin au sol. Termine par la balise [FIN].';
    } else {
      user = 'Dernière réponse : « ' + o.last + ' ».\nSujet suivant : ' + o.next.label + '. Question de base : « ' + o.next.q + ' ».\n' +
        (o.canFollow ? 'Si la dernière réponse signale une douleur, une gêne ou une inquiétude qui mérite une précision, pose d’abord UNE question de précision sur ce point et termine par la balise [PRECISION]. Sinon, ' : '') +
        'pose la question du sujet suivant en la reformulant librement, et termine par la balise [SUIVANTE].';
    }
    return { system: interviewerSystem(o), messages: [{ role: 'user', content: user }], maxTokens: 220 };
  }
  function parseTurn(text) {
    const t = String(text || '');
    const tag = /\[PRECISION\]/i.test(t) ? 'precision' : /\[FIN\]/i.test(t) ? 'fin' : 'suivante';
    return { tag, text: clean(t.replace(/\[(PRECISION|SUIVANTE|FIN)\]/gi, '')).trim() };
  }

  function summaryPrompt(o) {
    const system = [
      RULES,
      'Tu rédiges le résumé de l’entretien médical de la semaine de ' + o.name + ' pour le médecin au sol. Tu t’en tiens à ce qui a été dit et aux données fournies, sans rien ajouter ni interpréter au-delà.',
      'Réponds en deux parties, avec exactement ces titres sur leur propre ligne : « ### Partie médicale » puis « ### Partie psychologique ». La partie psychologique ne reprend que ce qui touche au moral, aux relations dans l’équipage et aux proches ; si ces sujets n’ont pas été abordés, écris « Non abordée cette semaine. ». Phrases courtes, 150 mots au plus par partie.'
    ].join('\n\n');
    const user = 'Données de la semaine :\n' + o.facts + '\n\nEntretien :\n' + o.transcript.map(x => 'Question : ' + x.q + '\nRéponse : ' + (x.skipped ? '(question passée)' : x.text)).join('\n\n');
    return { system, messages: [{ role: 'user', content: user }], maxTokens: 900 };
  }
  function parseSummary(text) {
    const t = clean(text || '');
    const i = t.search(/#+\s*Partie m[ée]dicale/i);
    const j = t.search(/#+\s*Partie psychologique/i);
    if (i < 0 && j < 0) return { med: t.trim(), psy: '' };
    const med = (j > i ? t.slice(i, j) : t.slice(i)).replace(/#+\s*Partie m[ée]dicale\s*/i, '').trim();
    const psy = j >= 0 ? t.slice(j).replace(/#+\s*Partie psychologique\s*/i, '').trim() : '';
    return { med, psy: /^non abord/i.test(psy) ? '' : psy };
  }

  function synthesisPrompt(o) {
    const system = [
      RULES,
      LEVELS.medical,
      'Tu prépares, pour le médecin au sol, la synthèse médicale de la semaine de l’équipage. Tu t’appuies seulement sur le rapport et les entretiens fournis, sans rien ajouter.',
      'Structure, avec ces titres : « #### Points à discuter » (puces courtes), « #### Par membre d’équipage » (une ligne par personne), « #### Habitat et pharmacie », « #### Questions pour le médecin au sol ». 260 mots au plus.'
    ].join('\n\n');
    const user = 'Rapport de la semaine (préparé à bord par des règles) :\n' + o.report + (o.interviews ? '\n\nEntretiens de la semaine (parties partagées) :\n' + o.interviews : '');
    return { system, messages: [{ role: 'user', content: user }], maxTokens: 1100 };
  }

  const REPHRASE = {
    simple: 'Reformule ce texte plus simplement, pour une personne qui n’est pas médecin, en phrases courtes.',
    detail: 'Reformule ce texte avec un peu plus de détails utiles, sans rien inventer qui ne soit pas dans le texte.',
    medical: 'Reformule ce texte en vocabulaire médical, pour la médecin de bord.',
    english: 'Translate this text into plain English.'
  };
  function rephrasePrompt(o) {
    return {
      system: RULES + '\n\n' + REPHRASE[o.mode] + ' Garde les numéros de fiches entre crochets, par exemple [1]. N’ajoute aucun fait. Réponds seulement avec le texte reformulé.',
      messages: [{ role: 'user', content: o.text }], maxTokens: 700
    };
  }

  function messagePrompt(o) {
    return {
      system: RULES + '\n\nTu aides ' + o.name + ' à écrire au médecin au sol. Le message mettra ' + o.delay + ' à arriver : il doit se suffire à lui-même. Une phrase de contexte (jour de mission, personne concernée), les faits, puis la question précise. 120 mots au plus. Première ligne : « Objet : … », puis le message.',
      messages: [{ role: 'user', content: 'Contexte de bord :\n' + o.context + '\n\nNotes à mettre en forme :\n' + o.notes }], maxTokens: 450
    };
  }
  function parseMessage(text) {
    const t = clean(text || '').trim();
    const m = t.match(/^\s*\**\s*objet\s*:\s*(.+)$/im);
    if (!m) return { title: '', text: t };
    const title = m[1].replace(/\*+/g, '').trim();
    const body = t.slice(t.indexOf(m[0]) + m[0].length).trim();
    return { title, text: body };
  }

  function carePlanPrompt(o) {
    return {
      system: RULES.replace('Tu es l’assistant de santé d’AURA, à bord', 'Tu es l’assistant du médecin au sol, pour une mission') + '\n\nTu aides le médecin au sol à préparer sa réponse au vaisseau à partir de ce qu’il vient de recevoir. Propose une réponse prudente : ce qu’il faut surveiller, les gestes simples, les critères pour rappeler le sol. Tu ne prescris pas : si un traitement te semble à discuter, écris-le comme une question au médecin. Le message mettra ' + o.delay + ' à arriver. 150 mots au plus. Le médecin relira et validera avant l’envoi.',
      messages: [{ role: 'user', content: 'Reçu du vaisseau : ' + o.title + '\n\n' + o.body }], maxTokens: 600
    };
  }

  /* ------------------------------------------------------------------ */
  /* Mise en forme des réponses : Markdown simple, sûr, avec citations    */
  /* ------------------------------------------------------------------ */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // Retire les tirets longs et moyens que certains modèles ajoutent
  function clean(t) {
    return String(t || '').replace(/\s+[—–]\s+/g, ', ').replace(/[—–]/g, ', ');
  }
  function inline(s, opts) {
    let h = esc(s);
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
    const n = opts && opts.cites ? opts.cites : 0;
    h = h.replace(/\[(\d+(?:\s*[,;]\s*\d+)*)\]/g, (m, list) => {
      const nums = list.split(/[,;]/).map(x => parseInt(x, 10)).filter(x => x >= 1 && (!n || x <= n));
      if (!nums.length) return m;
      return nums.map(x => '<a class="cite" href="#fiche-' + (opts && opts.prefix ? opts.prefix : '') + x + '" data-cite="' + x + '" aria-label="Fiche ' + x + '">' + x + '</a>').join('');
    });
    return h;
  }
  function md(text, opts) {
    const lines = clean(text).replace(/\r/g, '').split('\n');
    const out = [];
    let list = null, para = [];
    const flushPara = () => { if (para.length) { out.push('<p>' + para.map(l => inline(l, opts)).join('<br>') + '</p>'); para = []; } };
    const flushList = () => { if (list) { out.push('<' + list.tag + '>' + list.items.map(i => '<li>' + inline(i, opts) + '</li>').join('') + '</' + list.tag + '>'); list = null; } };
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) { flushPara(); flushList(); continue; }
      const h = line.match(/^\s*#{1,6}\s+(.+)$/);
      if (h) { flushPara(); flushList(); out.push('<h4>' + inline(h[1].replace(/\*\*/g, ''), opts) + '</h4>'); continue; }
      const b = line.match(/^\s*(?:[-*•])\s+(.+)$/);
      const o = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (b || o) {
        flushPara();
        const tag = b ? 'ul' : 'ol';
        if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
        list.items.push((b || o)[1]);
        continue;
      }
      flushList();
      para.push(line.trim());
    }
    flushPara(); flushList();
    return out.join('');
  }
  function plain(text) {
    return clean(text).replace(/\[(\d+(?:\s*[,;]\s*\d+)*)\]/g, '').replace(/[#*]/g, '').replace(/\s+/g, ' ').trim();
  }

  return {
    KEY, PRESETS, ANTHROPIC_VERSION, AIError,
    defaults, load, save, current, ready, label, modelName,
    buildRequest, sseParser, readEvent, stream, listModels, test,
    RULES, LEVELS, assistantPrompt, interviewTurn, parseTurn, summaryPrompt, parseSummary,
    synthesisPrompt, rephrasePrompt, messagePrompt, parseMessage, carePlanPrompt,
    md, plain, clean, esc
  };
});
