/* AURA : lecture des fiches.
   Lit le document « AURA : fiches et règles de la base de connaissances »
   exporté en Markdown, et en tire des fiches au format du moteur : probabilités
   de départ (index IMM), textes de chaque ligne, faits codés pour et contre,
   signes d'alarme et options de traitement dans l'ordre.
   Le codage des faits à partir du texte est automatique : il est marqué
   « codage automatique, à relire » et le responsable médical peut le corriger.
   Fonctionne dans Node (construction) et dans le navigateur (import d'une
   nouvelle version du document par le responsable médical). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AURA_FICHES_LIB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------------------------------------------------------- */
  /* Texte                                                              */
  /* ---------------------------------------------------------------- */
  function normalize(s) {
    return String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’'`´-]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function stem(w) {
    if (w.length > 4 && (w.endsWith('s') || w.endsWith('x'))) w = w.slice(0, -1);
    if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
    return w;
  }
  const STOP = new Set(('le la les l d de du des a au aux un une en et ou mon ma mes ton ta tes son sa ses ' +
    'me m te t se s j je tu il elle on nous vous ils elles y ce cet cette ces c qu que qui est sont ai as ' +
    'suis es etre avoir sur dans avec par pour tres un peu ca cela ceci quand').split(' '));
  const NEG = new Set(['pas', 'aucun', 'aucune', 'sans', 'jamais', 'ni', 'non', 'rien']);
  // Les mots gardent le numéro de leur proposition (coupée aux virgules et aux points) :
  // une négation ne déborde pas sur la proposition suivante.
  function analyse(text) {
    const raw = [], clause = [];
    String(text || '').split(/[,;:.!?()«»]+/).forEach((part, k) => {
      normalize(part).split(' ').filter(Boolean).forEach(w => { raw.push(w); clause.push(k); });
    });
    const content = [];
    raw.forEach((w, i) => { if (!STOP.has(w)) content.push({ w: stem(w), i }); });
    return { raw, clause, content };
  }

  /* ---------------------------------------------------------------- */
  /* Repérage des faits dans une phrase                                 */
  /* ---------------------------------------------------------------- */
  // Trois formes de synonymes :
  //   « mal de tête »  : suite de mots porteurs de sens (les mots outils sont ignorés) ;
  //   « =en finir »    : expression exacte, mots outils compris (là où « finir » seul serait trompeur) ;
  //   « ~cass(e|ee) (le|la) bras » : expression régulière sur le texte normalisé.
  function compile(FACTS) {
    const pats = [];
    Object.values(FACTS).forEach(f => {
      f.syn.forEach(s => {
        if (s.charAt(0) === '=') {
          const words = normalize(s.slice(1)).split(' ').filter(Boolean);
          if (words.length) pats.push({ code: f.code, words, rank: 100 + words.length });
        } else if (s.charAt(0) === '~') {
          pats.push({ code: f.code, re: new RegExp('(?:^| )(' + s.slice(1) + ')(?= |$)', 'g'), rank: 100 });
        } else {
          const seq = analyse(s).content.map(x => x.w);
          // un lieu du corps (« cheville ») s'ajoute aux autres faits sans leur prendre leurs mots
          if (seq.length) pats.push({ code: f.code, seq, rank: seq.length, libre: !!f.lieu });
        }
      });
    });
    pats.sort((a, b) => b.rank - a.rank);
    pats.facts = FACTS;
    return pats;
  }
  const BREAK = new Set(['mais', 'et', 'sauf', 'cependant', 'pourtant']);
  // true : nié (« pas de fièvre ») ; 'neutre' : « avec ou sans » ; false : affirmé
  function negatedAt(an, i) {
    const before = [];
    for (let k = i - 1; k >= 0 && k >= i - 4; k--) {
      if (an.clause[k] !== an.clause[i] || BREAK.has(an.raw[k])) break;
      before.unshift(an.raw[k]);
    }
    const n = before.length;
    if (n >= 3 && before[n - 3] === 'avec' && before[n - 2] === 'ou' && before[n - 1] === 'sans') return 'neutre';
    if (before.some(w => NEG.has(w))) return true;
    const p = before.lastIndexOf('plus');
    if (p >= 0 && (before.indexOf('n') >= 0 || before.indexOf('ne') >= 0)) return true;
    return false;
  }
  const selfNegating = ws => ws.some(w => NEG.has(w) || w === 'ne' || w === 'n' || w === 'plus');
  const INFO = /(^| )(c est quoi|qu est ce|pourquoi|comment on|comment se|est ce qu on|explique|definition|risque de|frequen)( |$)/;
  function findFacts(text, pats) {
    const an = analyse(text);
    const out = [];
    const push = (code, selfNeg, at) => {
      if (out.some(o => o.code === code)) return;
      const n = selfNeg ? false : negatedAt(an, at);
      out.push({ code, neg: n === true, neutral: n === 'neutre', at });
    };
    // 1) expressions exactes, sur les mots tels quels ; les mots pris ne servent plus
    const usedRaw = new Array(an.raw.length).fill(false);
    const joined = an.raw.join(' ');
    for (const p of pats) {
      if (p.words) {
        const L = p.words.length;
        for (let i = 0; i + L <= an.raw.length; i++) {
          let ok = true;
          for (let j = 0; j < L; j++) if (usedRaw[i + j] || an.raw[i + j] !== p.words[j]) { ok = false; break; }
          if (!ok) continue;
          for (let j = 0; j < L; j++) usedRaw[i + j] = true;
          push(p.code, selfNegating(p.words), i);
        }
      } else if (p.re) {
        p.re.lastIndex = 0;
        let m;
        while ((m = p.re.exec(joined))) {
          const start = m.index + (m[0].charAt(0) === ' ' ? 1 : 0);
          const i = start ? joined.slice(0, start).trim().split(' ').length : 0;
          const L = m[1].split(' ').length;
          if (usedRaw.slice(i, i + L).some(Boolean)) continue;
          for (let j = 0; j < L; j++) usedRaw[i + j] = true;
          push(p.code, selfNegating(m[1].split(' ')), i);
        }
      }
    }
    // 2) suites de mots porteurs de sens, sur les mots restants
    const used = an.content.map(c => usedRaw[c.i]);
    for (const p of pats) {
      if (!p.seq) continue;
      if (p.libre) {
        for (let i = 0; i + p.seq.length <= an.content.length; i++) {
          if (p.seq.every((w, j) => an.content[i + j].w === w)) push(p.code, false, an.content[i].i);
        }
        continue;
      }
      const L = p.seq.length;
      for (let i = 0; i + L <= an.content.length; i++) {
        let ok = true;
        for (let j = 0; j < L; j++) if (used[i + j] || an.content[i + j].w !== p.seq[j]) { ok = false; break; }
        if (!ok) continue;
        for (let j = 0; j < L; j++) used[i + j] = true;
        push(p.code, selfNegating(p.seq), an.content[i].i);
      }
    }
    const norm = joined;
    const info = INFO.test(norm) || /\?\s*$/.test(String(text || '').trim()) && !/(^| )(j ai|je|me|mon|ma|mes)( |$)/.test(norm);
    out.sort((a, b) => a.at - b.at);
    return { facts: out, info };
  }

  /* ---------------------------------------------------------------- */
  /* Lecture du document                                                */
  /* ---------------------------------------------------------------- */
  function pct(s) {
    const m = String(s).replace(/\s/g, ' ').match(/([0-9]+(?:,[0-9]+)?)\s*%/);
    return m ? parseFloat(m[1].replace(',', '.')) / 100 : null;
  }
  // "34 %", "H 2,1 % / F 3,3 %", "femmes 49 %, hommes 8,1 %", "Sans objet", "Non calculée"
  function parseProb(s) {
    s = String(s || '').trim();
    if (!s) return null;
    const h = s.match(/(?:\bH\b|hommes)\s*([0-9]+(?:,[0-9]+)?)\s*%/i);
    const f = s.match(/(?:\bF\b|femmes)\s*([0-9]+(?:,[0-9]+)?)\s*%/i);
    if (h || f) return { H: h ? parseFloat(h[1].replace(',', '.')) / 100 : 0, F: f ? parseFloat(f[1].replace(',', '.')) / 100 : 0 };
    const v = pct(s);
    return v === null ? null : { H: v, F: v };
  }
  function cells(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  }
  function stripMd(s) {
    return String(s || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/&#91;/g, '[').replace(/\\\]/g, ']').trim();
  }
  const LABELS = [
    [/^comment (le|la|les) reconna[iî]tre/i, 'reconnaitre'],
    [/^signes d.alarme/i, 'alarme'],
    [/^ce qu.on fait à bord/i, 'bord'],
    [/^quand appeler le sol/i, 'sol'],
    [/^si le sol ne répond pas/i, 'sansSol'],
    [/^médecine clinique/i, 'clinique'],
    [/^ce qui manque/i, 'manque']
  ];
  const FAMILLES = { APE: 'Adaptation à l\'apesanteur', INF: 'Infections, peau et allergies', TET: 'Yeux, oreilles, nez, gorge et dents', DIG: 'Ventre, reins, voies urinaires et gynécologie', TRA: 'Blessures, os, muscles et chocs', CVN: 'Cœur, vaisseaux et système nerveux', EXP: 'Expositions et sorties extravéhiculaires', PSY: 'Sommeil, santé mentale et comportement' };

  function parseDocument(md) {
    const lines = String(md).replace(/\r/g, '').split('\n');
    const index = {};
    const added = {};
    const blocks = [];
    const sections = [];
    let h2 = '', h3 = '', cur = null, sec = null;
    const flush = () => { if (cur) blocks.push(cur); cur = null; };
    for (let n = 0; n < lines.length; n++) {
      const line = lines[n];
      let m;
      if ((m = line.match(/^## (.+)/))) {
        flush(); h2 = m[1].trim(); h3 = '';
        sec = { title: h2, level: 2, lines: [] }; sections.push(sec);
        continue;
      }
      if ((m = line.match(/^### (.+)/))) {
        flush(); h3 = m[1].trim();
        sec = { title: h3, parent: h2, level: 3, lines: [] }; sections.push(sec);
        continue;
      }
      if ((m = line.match(/^#### (.+)/))) {
        flush();
        cur = { title: m[1].trim(), h2, h3, lines: [] };
        continue;
      }
      if (cur) cur.lines.push(line); else if (sec) sec.lines.push(line);
      // index des fiches
      if (/^\|\s*F-[A-Z]{3}-\d\d\s/.test(line) && /^Index des/.test(h2)) {
        const c = cells(line);
        const mm = c[0].match(/^(F-[A-Z]{3}-\d\d)\s+(.+)$/);
        if (mm) index[mm[1]] = { id: mm[1], nom: stripMd(mm[2]), imm: c[1], iss: parseProb(c[2]), mars: parseProb(c[3]), issTexte: c[2], marsTexte: c[3], survenue: /oui/i.test(c[4] || '') };
      }
      if (/^\|\s*F-[A-Z]{3}-\d\d\s*\|/.test(line) && /conditions ajoutées/.test(h3)) {
        const c = cells(line);
        added[c[0]] = { id: c[0], nom: stripMd(c[1]), pourquoi: stripMd(c[2]), source: stripMd(c[3]) };
      }
    }
    flush();
    return { index, added, blocks, sections };
  }

  function parseBlock(b) {
    const out = { titre: b.title, h2: b.h2, h3: b.h3, codes: [], table: [], textes: {}, proba: '' };
    for (const raw of b.lines) {
      const line = raw.trim();
      if (!line) continue;
      let m;
      if (!out.codes.length && (m = line.match(/^\*(F-[A-Z]{3}-\d\d)(?:\s+à\s+(F-[A-Z]{3}-\d\d))?([^*]*)\*$/))) {
        if (m[2]) {
          const fam = m[1].slice(0, 6), a = +m[1].slice(6), z = +m[2].slice(6);
          for (let k = a; k <= z; k++) out.codes.push(fam + String(k).padStart(2, '0'));
        } else out.codes.push(m[1]);
        out.proba = (m[3] || '').replace(/^\s*·\s*/, '').trim();
        continue;
      }
      if (/^\|\s*F-[A-Z]{3}-\d\d\s*\|/.test(line)) { out.table.push(cells(line)); continue; }
      if ((m = line.match(/^- \*\*([^*]+?)\.?\*\*\s*(.*)$/))) {
        const lab = m[1].trim();
        const hit = LABELS.find(([re]) => re.test(lab));
        if (hit) out.textes[hit[1]] = stripMd(m[2]);
        continue;
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- */
  /* Codage automatique des faits et des options                        */
  /* ---------------------------------------------------------------- */
  function sentences(t) {
    return String(t || '').split(/(?<=[.;!?])\s+(?=[A-ZÀ-ÖØ-Þ0-9«(])/).map(s => s.trim()).filter(Boolean);
  }
  const FORCE = { 'très typique': 0.9, 'fréquent': 0.6, 'possible': 0.3, 'rare': 0.1, 'contre': 0.03 };
  function codeFacts(fiche, pats) {
    const pour = [], contre = [], alarme = [];
    const put = (arr, code, force) => {
      if (pour.some(x => x.fait === code) || contre.some(x => x.fait === code)) return;
      arr.push({ fait: code, force });
    };
    // le nom de la fiche porte le fait le plus typique
    findFacts(fiche.nom, pats).facts.forEach(f => { if (!f.neg) put(pour, f.code, 'très typique'); });
    sentences(fiche.textes.reconnaitre).forEach((s, i) => {
      const isContre = /orient(e|ent)\s+(ailleurs|plutôt|vers)/i.test(s);
      const found = findFacts(s, pats).facts.filter(f => !f.neutral);
      const an = analyse(s).raw;
      found.forEach((f, j) => {
        const next = an.slice(f.at + 1, f.at + 4);
        if (isContre && next.some(w => /^seul/.test(w))) return;
        if (isContre || f.neg) put(contre, f.code, 'contre');
        else if (i === 0) put(pour, f.code, (j === 0 && !pour.length) ? 'très typique' : 'fréquent');
        else put(pour, f.code, 'possible');
      });
    });
    // un fait précis (« douleur en bas à droite ») porte aussi le fait général (« mal au ventre »), avec la même force ;
    // un fait général marqué « herite » donne à son fait précis une force d'un cran plus faible (nausées -> vomissements)
    const F = pats.facts || {};
    const ORDRE = ['très typique', 'fréquent', 'possible', 'rare'];
    for (let pass = 0; pass < 3; pass++) {
      pour.slice().forEach(x => {
        const par = F[x.fait] && F[x.fait].parent;
        if (par && !contre.some(y => y.fait === par)) {
          const cur = pour.find(y => y.fait === par);
          if (!cur) pour.push({ fait: par, force: x.force });
          else if (ORDRE.indexOf(x.force) < ORDRE.indexOf(cur.force)) cur.force = x.force;
        }
      });
      Object.values(F).forEach(c => {
        if (!c.parent || !c.herite) return;
        const par = pour.find(y => y.fait === c.parent);
        if (par && !pour.some(y => y.fait === c.code) && !contre.some(y => y.fait === c.code)) {
          const k = Math.min(ORDRE.length - 1, ORDRE.indexOf(par.force) + 1);
          pour.push({ fait: c.code, force: ORDRE[k] });
        }
      });
    }
    // un fait « pour » ou un fait de contexte n'est jamais un signe d'alarme à lui seul
    const CONTEXTE = new Set(['eva_recente', 'changement_gravite', 'changement_pression', 'se_lever', 'medicament_pris']);
    findFacts(fiche.textes.alarme || '', pats).facts.forEach(f => {
      if (f.neg || alarme.includes(f.code) || CONTEXTE.has(f.code) || (F[f.code] && F[f.code].lieu) || pour.some(x => x.fait === f.code)) return;
      alarme.push(f.code);
    });
    return { pour, contre, alarme };
  }
  function medMatchers(meds) {
    const list = [];
    meds.forEach(m => m.syn.forEach(s => list.push({ id: m.id, seq: analyse(s).content.map(x => x.w) })));
    list.sort((a, b) => b.seq.length - a.seq.length);
    return list;
  }
  function findMeds(text, mm) {
    const an = analyse(text).content.map(x => x.w);
    const ids = [];
    for (const p of mm) {
      for (let i = 0; i + p.seq.length <= an.length; i++) {
        let ok = true;
        for (let j = 0; j < p.seq.length; j++) if (an[i + j] !== p.seq[j]) { ok = false; break; }
        if (ok && !ids.includes(p.id)) ids.push(p.id);
      }
    }
    return ids;
  }
  function codeOptions(fiche, mm) {
    const opts = [];
    sentences(fiche.textes.bord).forEach((s, i) => {
      const ressources = findMeds(s, mm);
      const rmb = /responsable médical|médecin/i.test(s);
      const sol = /(avis|accord|décision) du sol|sur avis/i.test(s);
      opts.push({ rang: i + 1, action: s, ressources, competence: sol ? 'sol' : rmb ? 'rmb' : 'astronaute' });
    });
    return opts;
  }

  /* ---------------------------------------------------------------- */
  /* Construction de la base                                            */
  /* ---------------------------------------------------------------- */
  function build(md, VOCAB, PHARMA, opts) {
    opts = opts || {};
    const doc = parseDocument(md);
    const pats = compile(VOCAB.FACTS);
    const mm = medMatchers(PHARMA.meds);
    const parsed = doc.blocks.filter(b => /^Fiches/.test(b.h2)).map(parseBlock).filter(p => p.codes.length);
    const fiches = [];
    const seen = new Set();
    parsed.forEach(p => {
      p.codes.forEach(code => {
        if (seen.has(code)) return;
        seen.add(code);
        const ix = doc.index[code] || {};
        const ad = doc.added[code] || null;
        let nom = ix.nom || (ad && ad.nom) || p.titre;
        const row = p.table.find(r => r[0] === code);
        let iss = ix.iss || null, mars = ix.mars || null;
        if (!ix.iss && row) { iss = parseProb(row[2]); mars = parseProb(row[3]); }
        if (!ix.iss && !row && p.proba) {
          const mI = p.proba.match(/ISS 6 mois\s*:?\s*([^·]+)/i), mM = p.proba.match(/Mars 3 ans\s*:?\s*([^·]+)/i);
          if (mI) iss = parseProb(mI[1]);
          if (mM) mars = parseProb(mM[1]);
          if (/mêmes chiffres sur 3 ans/i.test(p.proba)) mars = iss;
        }
        const fam = code.slice(2, 5);
        const f = {
          id: code, nom, imm: ix.imm || null, famille: fam, familleNom: FAMILLES[fam] || p.h2.replace(/^Fiches\s*:\s*/, ''),
          groupe: p.h3 || null, titreFiche: p.titre, ajoutee: !!ad, pourquoi: ad ? ad.pourquoi : null,
          apriori: { iss, mars, issTexte: ix.issTexte || (row ? row[2] : null), marsTexte: ix.marsTexte || (row ? row[3] : null), survenue: !!ix.survenue },
          note: row && row[4] ? stripMd(row[4]) : null,
          textes: p.textes,
          version: { num: '0.1', etat: opts.etat || 'brouillon', auteur: 'AURA', codage: 'automatique, à relire' }
        };
        const c = codeFacts(f, pats);
        f.pour = c.pour; f.contre = c.contre; f.alarmeFaits = c.alarme;
        f.options = codeOptions(f, mm);
        f.urgenceEnSoi = /urgence/i.test(f.textes.alarme || '');
        f.adaptation = fam === 'APE' && iss && mars && Math.abs((iss.H || 0) - (mars.H || 0)) < 1e-9 && Math.abs((iss.F || 0) - (mars.F || 0)) < 1e-9;
        fiches.push(f);
      });
    });
    // Valeurs publiées (preuves_terre) du document, rattachées à leur fiche
    const lr = (re, list) => { const f = fiches.find(x => re.test(x.nom)); if (f) f.preuves = list; };
    lr(/^Appendicite/i, [
      { fait: 'douleur_bas_droite', rvP: 8.4, rvA: 0.18, source: 'Ebell 2008' },
      { fait: 'douleur_migre_bas_droite', rvP: 3.6, rvA: null, source: 'Ebell 2008' },
      { fait: 'fievre', rvP: 3.2, rvA: 0.42, source: 'Ebell 2008' },
      { fait: 'douleur_avant_vomissements', rvP: 2.7, rvA: null, source: 'Ebell 2008' }
    ]);
    lr(/^Infection urinaire/i, [
      { fait: 'triade_urinaire', rvP: 24.6, rvA: null, source: 'Bent 2002', sexe: 'F' },
      { fait: 'pertes_vaginales', rvP: 0.3, rvA: null, source: 'Bent 2002', sexe: 'F' },
      { fait: 'irritation_vaginale', rvP: 0.2, rvA: null, source: 'Bent 2002', sexe: 'F' }
    ]);
    lr(/infarctus/i, [
      { fait: 'douleur_irradie_bras', rvP: 7.1, rvA: null, source: 'Panju 1998' },
      { fait: 'douleur_pleuretique', rvP: 0.3, rvA: null, source: 'Panju 1998' }
    ]);
    lr(/^AVC/i, [{ fait: 'signe_fast', rvP: 5.5, rvA: 0.39, source: 'Goldstein et Simel 2005' }]);
    lr(/^Mal de gorge/i, [
      { fait: 'depots_amygdales', rvP: 3.4, rvA: null, source: 'Ebell 2000' },
      { fait: 'ganglions_cou', rvP: null, rvA: 0.6, source: 'Ebell 2000' }
    ]);
    // Règles (pour l'écran Règles du responsable médical et les réponses de Sophie)
    const regles = doc.sections.filter(s => /^Les règles|^Comment AURA raisonne|^Les métiers/.test(s.title) || /^Les règles/.test(s.parent || ''))
      .map(s => ({ titre: s.title, parent: s.parent || null, md: s.lines.join('\n').trim() }))
      .filter(s => s.md);
    const metiers = [];
    doc.sections.filter(s => /^Les métiers/.test(s.title)).forEach(s => s.lines.forEach(l => {
      if (/^\|\s*S-\d\d/.test(l)) { const c = cells(l); metiers.push({ id: c[0], nom: c[1], role: stripMd(c[2]), pour: stripMd(c[3]) }); }
    }));
    return { fiches, regles, metiers, stats: { index: Object.keys(doc.index).length, fiches: fiches.length } };
  }

  /* ---------------------------------------------------------------- */
  /* Recherche plein texte (BM25) dans les fiches                       */
  /* ---------------------------------------------------------------- */
  function buildIndex(fiches) {
    const docs = fiches.map(f => {
      const text = [f.nom, f.nom, f.textes.reconnaitre, f.textes.bord, f.textes.alarme, f.groupe || ''].join(' ');
      const toks = analyse(text).content.map(x => x.w);
      const tf = {};
      toks.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      return { id: f.id, tf, len: toks.length };
    });
    const df = {};
    docs.forEach(d => Object.keys(d.tf).forEach(t => { df[t] = (df[t] || 0) + 1; }));
    const avg = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length);
    return { docs, df, avg, N: docs.length };
  }
  function search(ix, query, k) {
    const q = analyse(query).content.map(x => x.w);
    const k1 = 1.4, b = 0.75;
    const res = ix.docs.map(d => {
      let s = 0;
      q.forEach(t => {
        const f = d.tf[t];
        if (!f) return;
        const idf = Math.log(1 + (ix.N - ix.df[t] + 0.5) / (ix.df[t] + 0.5));
        s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / ix.avg));
      });
      return { id: d.id, score: s };
    }).filter(r => r.score > 0).sort((a, b2) => b2.score - a.score);
    return res.slice(0, k || 5);
  }

  return { normalize, stem, analyse, compile, findFacts, parseDocument, build, buildIndex, search, sentences, FORCE, FAMILLES };
});
