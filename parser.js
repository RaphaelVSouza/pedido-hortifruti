/*
 * Hortifruti Digital — parser de listas de WhatsApp
 *
 * Arquitetura (pipes-and-filters):
 *   texto -> normalizar -> classificar linha -> extrair candidatos -> pontuar
 *         -> mesclar linhas (nome/preço em linhas separadas) -> itens + não reconhecidos
 *
 * Camadas de regras, nesta ordem (Chain of Responsibility):
 *   1. Templates aprendidos (regex induzidas de exemplos corrigidos pelo usuário)
 *   2. Heurística genérica (candidatos numéricos + pontuação por contexto)
 *
 * Sem dependências. Funciona como <script> (window.HortiParser) ou em Node (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HortiParser = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- vocabulário

  const UNIT_ALTS = {
    kg: 'kgs?|quilos?|kilos?|quilogramas?',
    g: 'gramas?|grs?|g',
    un: 'unidades?|unids?|unds?|uni|un|cada|p[cç]s?|pe[cç]as?|p[eé]s?|cabe[cç]as?',
    bandeja: 'bandejas?|bdjs?|bdja|band|bj',
    maco: 'ma[cç]os?|molhos?|m[cç]|mlh',
    duzia: 'd[uú]zias?|dz',
    caixa: 'caixas?|cxs?',
    pacote: 'pacotes?|pcts?|sacos?|sacolas?|potes?',
    penca: 'pencas?',
    litro: 'litros?|lts?|l',
    ml: 'ml',
  };
  const UNIT = '(?:' + Object.values(UNIT_ALTS).join('|') + ')';
  const UNIT_END = '(?![\\p{L}])';
  const UNIT_CANON = Object.entries(UNIT_ALTS).map(([k, a]) => [k, new RegExp('^(?:' + a + ')$', 'iu')]);
  const SIZE_UNITS = new Set(['g', 'ml', 'kg', 'litro']);
  const COUNT_UNITS = new Set(['un', 'duzia', 'bandeja', 'maco', 'caixa', 'pacote', 'penca']);

  // Número monetário: 8 | 8,0 | 8,00 | 4.99. Sem separador de milhar (preços de FLV < 1000).
  const CANDIDATE_RE = /(R\s?\$\s?)?(\d+(?:[.,]\d{1,2})?)(?!\d)/gu;

  // Unidade depois do número: "4,99kg", "4,99 /kg", "4,99 o kg", "4,99 por maço", "(kg)"
  const AFTER_UNIT_RE = new RegExp(
    '^(\\s*)\\(?\\s*(\\/\\s*|(?:p\\/|por|o|a|ao)\\s+)?(' + UNIT + ')' + UNIT_END + '\\.?\\)?', 'iu');
  // Unidade antes do número: "kg R$ 4,99", "Valor do kg: R$", "mç - 4,00"
  const BEFORE_UNIT_RE = new RegExp(
    '(^|[^\\p{L}\\d.,])(' + UNIT + ')' + UNIT_END + '[\\s.…:=\\-–_]*(?:(?:por|a)\\s*)?$', 'iu');
  // Combo: "3 por R$ 10", "2 bandejas por 15", "3x 10,00"
  const COMBO_RE = new RegExp('^\\s*(?:(' + UNIT + ')' + UNIT_END + '\\s*)?(?:por|x|=)\\s*(?:R\\s?\\$\\s?)?\\d', 'iu');
  const OLD_PRICE_BEFORE_RE = /(?:^|\s)(?:de|antes|era)\s*:?\s*$/iu;
  const WEIGHT_CONTEXT_RE = /(?:peso|m[eé]dio|aprox\.?|aproximadamente|cerca de)\s*$/iu;

  // Unidade inferida do nome ("Chuchu Unidade", "Alface (pé)", "Banana penca")
  const NAME_UNIT_RE = new RegExp('(?:^|[^\\p{L}])(unidades?|cada|p[eé]|ma[cç]os?|molhos?|bandejas?|d[uú]zias?|caixas?|pacotes?|sacos?|pencas?)' + UNIT_END, 'iu');

  // Código de unidade no INÍCIO do nome: "Bdj. Quiabo", "Cx. Morango", "Kg quiabo".
  // Só abreviações e códigos (palavra por extenso como "Caixa de ovos" fica no nome: descreve o produto).
  const LEAD_UNIT_RE = /^(bdjs?|bdja|bj|band|kgs?|und?s?|unids?|cxs?|pcts?|mç|mc(?=\.)|mlh|dz|lts?)\.?(?=\s)\s*/iu;

  const CATEGORY_RE = /^(?:frutas?|legumes?|verduras?|folhas?|folhosas|hortali[cç]as|temperos?|ervas|ra[ií]zes|tub[eé]rculos|ovos|granja|mercearia|latic[ií]nios|outros|diversos|org[aâ]nicos|promo[cç](?:[aã]o|[oõ]es)|ofertas?(?:\s+d[oa]\s+\p{L}+)?|destaques?)$/iu;
  const PROMO_CATEGORY_RE = /promo|oferta|destaque|imperd/iu;
  const PROMO_WORD_RE = /promo|oferta|imperd[ií]vel|baixou|🔥|‼️|⚡/iu;

  const NOISE_RE = /(?:https?:\/\/|www\.|@\w|\bpix\b|\bchave\b|whats|\bzap\b|telefone|\bfone\b|contato|hor[aá]rio|entregamos|entregas?\b|delivery|pedidos?\b|aceitamos|cart[aã]o|bom dia|boa tarde|boa noite|\bol[aá]\b|obrigad|aten[cç][aã]o|sujeito|estoque|v[aá]lid[ao]s?|endere[cç]o|\brua\b|\bav\.|bairro|\btaxa\b|frete|m[ií]nimo|\blista\b|\bsegue\b|confira)/iu;

  const DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
  const PHONE_RE = /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\s?\d{4}[-\s]?\d{4}/g;
  const TIME_RE = /\b\d{1,2}(?::\d{2}|h\d{0,2})(?![\p{L}])/giu;
  const EMOJI_RE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[️⃣\u{1F3FB}-\u{1F3FF}])/gu;
  const INVISIBLE_RE = /[​-‍⁠﻿­]/g;

  const PRICE_ONLY_STOP = new Set(['peso', 'medio', 'médio', 'valor', 'do', 'da', 'de', 'por', 'apenas', 'so', 'só',
    'o', 'a', 'preco', 'preço', 'aprox', 'r', 'reais']);

  // ------------------------------------------------------------------ utilitários

  function canonUnit(tok) {
    if (!tok) return null;
    for (const [k, re] of UNIT_CANON) if (re.test(tok)) return k;
    return null;
  }

  function toNumber(raw) {
    return Math.round(parseFloat(String(raw).replace(',', '.')) * 100) / 100;
  }

  /** Substitui trechos por espaços preservando índices. */
  function blank(s, re) {
    return s.replace(re, (m) => ' '.repeat(m.length));
  }

  // Linhas reais de lista têm dezenas de caracteres. O limite evita custo quadrático
  // em entradas hostis (uma linha gigante cheia de números).
  const MAX_LINE = 500;
  // Contexto à esquerda de cada número: só os últimos caracteres importam (as regexes
  // de contexto são ancoradas no fim). Janela fixa mantém a extração linear.
  const BEFORE_WINDOW = 60;
  // Inteiro sem moeda nem unidade acima disso não é preço plausível de FLV ("Caixa 123").
  const MAX_BARE_INT = 200;

  function normalizeText(text) {
    return String(text || '')
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(INVISIBLE_RE, '')
      .replace(/[  \t]/g, ' ');
  }

  function foldAccents(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // Aparo das pontas sem regex terminada em `$` (que reescaneia a string a cada posição
  // e custa O(n²) em linhas longas).
  const LEAD_TRIM = new Set('-–—•·*>+_=:.,|/~'.split(''));
  const TRAIL_TRIM = new Set('-–—•·*>+_=:.,|/(~'.split(''));
  const TRAIL_WORD_RE = /^(?:por|a|apenas|s[oó]|de|o|ao|cada|=)$/iu;
  const isSpace = (ch) => /\s/.test(ch);

  function trimEdges(n) {
    let a = 0;
    let b = n.length;
    while (a < b && (isSpace(n[a]) || LEAD_TRIM.has(n[a]))) a++;
    while (b > a && (isSpace(n[b - 1]) || TRAIL_TRIM.has(n[b - 1]))) b--;
    return n.slice(a, b);
  }

  function dropTrailingWord(n) {
    let j = n.length;
    while (j > 0 && !isSpace(n[j - 1])) j--;
    if (j > 0 && TRAIL_WORD_RE.test(n.slice(j))) return n.slice(0, j);
    return n;
  }

  function cleanName(s) {
    let n = s.replace(EMOJI_RE, ' ').replace(/R\s?\$/g, ' ');
    n = n.replace(/\(\s*\)/g, ' ');
    let prev;
    do {
      prev = n;
      n = trimEdges(n);
      n = dropTrailingWord(n);
      n = n.replace(/^(?:por|apenas|s[oó])\s+/iu, '');
    } while (n !== prev);
    return n.replace(/\s{2,}/g, ' ').trim();
  }

  // ------------------------------------------------------- candidatos e pontuação

  function scanCandidates(s) {
    const out = [];
    CANDIDATE_RE.lastIndex = 0;
    let m;
    while ((m = CANDIDATE_RE.exec(s))) {
      const start = m.index;
      if (/[\d.,]/.test(s[start - 1] || '') && /\d/.test(s[start - 2] || '')) continue;
      const numEnd = start + m[0].length;
      const raw = m[2];
      const dec = ((raw.match(/[.,](\d+)$/) || [])[1] || '').length;
      const c = {
        start, numEnd, end: numEnd, raw, value: toNumber(raw), cur: !!m[1], dec,
        reais: false, unit: null, unitFrom: null, attached: false,
        before: s.slice(Math.max(0, start - BEFORE_WINDOW), start), beforeFrom: Math.max(0, start - BEFORE_WINDOW),
        score: 0, role: 'price',
      };
      let rest = s.slice(c.end);

      if (/^\s?%/.test(rest)) { c.role = 'discard'; out.push(c); continue; }

      const combo = !c.cur && dec === 0 && c.value <= 24 && COMBO_RE.exec(rest);
      if (combo) {
        c.role = 'combo';
        c.unit = canonUnit(combo[1]);
        c.end += combo[0].length - 1; // consome até antes do dígito do preço
        out.push(c);
        continue;
      }

      const reais = rest.match(/^\s*reais(?![\p{L}])/iu);
      if (reais) { c.reais = true; c.end += reais[0].length; rest = s.slice(c.end); }

      const ua = rest.match(AFTER_UNIT_RE);
      if (ua) {
        c.unit = canonUnit(ua[3]);
        c.unitFrom = 'after';
        c.attached = ua[1] === '' && !ua[2];
        c.end += ua[0].length;
      } else {
        const ub = c.before.match(BEFORE_UNIT_RE);
        if (ub && ub[2].length >= 2 && !/\d\s?$/.test(c.before.slice(0, ub.index + ub[1].length))) {
          c.unit = canonUnit(ub[2]);
          c.unitFrom = 'before';
          c.unitStart = c.beforeFrom + ub.index + ub[1].length;
        }
      }
      out.push(c);
    }
    return out;
  }

  function scoreCandidates(cands) {
    const live = cands.filter((c) => c.role === 'price');
    live.forEach((c, i) => {
      let sc = 0;
      if (c.cur) sc += 6;
      if (c.reais) sc += 5;
      if (c.dec === 2) sc += 3; else if (c.dec === 1) sc += 1;
      if (c.attached && !c.cur) {
        if (c.unit === 'g' || c.unit === 'ml') sc -= 10;
        else if (SIZE_UNITS.has(c.unit) && c.dec < 2) sc -= 4;
        else if (COUNT_UNITS.has(c.unit) && c.dec === 0) sc -= 5;
      }
      if (WEIGHT_CONTEXT_RE.test(c.before.replace(/R\s?\$\s?$/, ''))) sc -= 8;
      if (/\(\s*$/.test(c.before)) sc -= 1;
      // "de 5,99 por 3,99" / "antes 5,99"
      if (OLD_PRICE_BEFORE_RE.test(c.before) && i < live.length - 1) c.role = 'old';
      c.score = sc + i * 0.01; // desempate: o mais à direita
    });
    return cands;
  }

  /** Divide linhas com vários itens ("Banana 4,99 | Maçã 9,90"). */
  function splitSegments(s, cands) {
    const strong = cands.filter((c) => c.role === 'price' && c.score >= 3);
    const cuts = [];
    for (let i = 0; i < strong.length - 1; i++) {
      const between = s.slice(strong[i].end, strong[i + 1].start)
        .replace(new RegExp('(?:^|\\s)(?:de|por|a|ao|apenas|s[oó]|' + UNIT + ')' + UNIT_END, 'giu'), ' ');
      if ((between.match(/\p{L}/gu) || []).length >= 3) cuts.push(strong[i].end);
    }
    if (!cuts.length) return null;
    const segs = [];
    let from = 0;
    for (const c of cuts) { segs.push(s.slice(from, c)); from = c; }
    segs.push(s.slice(from));
    return segs;
  }

  // ---------------------------------------------------------- análise de uma linha

  function analyzeSegment(s, raw) {
    const cands = scoreCandidates(scanCandidates(s));
    const prices = cands.filter((c) => c.role === 'price' && c.score >= 0);
    if (!prices.length) return { kind: 'text', text: s, raw, cands };

    const best = prices.reduce((a, b) => (b.score > a.score ? b : a));
    const old = cands.find((c) => c.role === 'old');
    const combo = cands.find((c) => c.role === 'combo' && c.end <= best.start + 12);

    // Remove do texto os trechos consumidos para sobrar o nome
    const cuts = [[best.start, best.end]];
    if (best.unitFrom === 'before') cuts.push([best.unitStart, best.start]);
    if (old) cuts.push([old.start - (old.before.match(/(?:de|antes|era)\s*:?\s*$/iu) || [''])[0].length, old.end]);
    if (combo) cuts.push([combo.start, combo.end]);
    let rest = s;
    cuts.sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { rest = rest.slice(0, a) + ' ' + rest.slice(b); });

    let unit = best.unit || (combo && combo.unit) || null;
    let unitFrom = unit ? best.unitFrom || 'combo' : null;
    let name = cleanName(rest);
    if (!unit) {
      const lead = name.match(LEAD_UNIT_RE);
      const leadUnit = lead && canonUnit(lead[1]);
      if (leadUnit && name.length > lead[0].length) {
        unit = leadUnit;
        unitFrom = 'nameStart';
        name = cleanName(name.slice(lead[0].length).replace(/^de\s+/iu, ''));
      }
    }
    if (!unit) {
      const nu = rest.match(NAME_UNIT_RE);
      if (nu) { unit = canonUnit(nu[1]) || (/sacos?/i.test(nu[1]) ? 'pacote' : null); unitFrom = 'name'; }
    }

    return {
      kind: 'item',
      name,
      residual: rest,
      price: best.value,
      unit,
      unitFrom,
      oldPrice: old ? old.value : null,
      packQty: combo ? combo.value : null,
      strong: best.cur || best.reais,
      // inteiro sem R$, 'reais' nem unidade: "Alface 3" (ambíguo; ver regra por documento em parse)
      bare: best.dec === 0 && !best.cur && !best.reais && !best.unit,
      score: best.score,
      raw,
    };
  }

  function isPriceOnly(item) {
    const words = foldAccents(item.residual)
      .replace(new RegExp('(?:^|[^\\p{L}])' + UNIT + UNIT_END, 'giu'), ' ')
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/).filter(Boolean);
    return words.every((w) => PRICE_ONLY_STOP.has(w));
  }

  function analyzeLine(rawLine) {
    const raw = rawLine;
    const line = normalizeText(rawLine).trim();
    if (!line) return [{ kind: 'blank', raw }];

    const hadEmoji = EMOJI_RE.test(line);
    EMOJI_RE.lastIndex = 0;
    const promoMarkup = /\*[^*]*\d[^*]*\*/.test(line);
    const promoWord = PROMO_WORD_RE.test(line);
    const dates = [...line.matchAll(DATE_RE)].map((m) => m[0]);

    // Riscado ~R$ 8,99~ => preço antigo explícito
    let struck = null;
    let s = line.replace(/~([^~]*\d[^~]*)~/g, (_, inner) => {
      const m = inner.match(/\d+(?:[.,]\d{1,2})?/);
      if (m) struck = toNumber(m[0]);
      return ' '.repeat(inner.length + 2);
    });
    s = s.replace(/\*/g, ' ').replace(/(^|\s)_|_(\s|$)/g, '$1 $2');
    s = blank(blank(blank(s, PHONE_RE), DATE_RE), TIME_RE);
    s = s.replace(/^\s*\d{1,2}[.)]\s+/, (m) => ' '.repeat(m.length)); // numeração "1. " / "2) "

    const lettersOnly = cleanName(s.replace(/[^\p{L}\s:&/-]/gu, ' '));

    if (NOISE_RE.test(s)) return [{ kind: 'noise', raw, dates }];

    // Cabeçalho inline: "FRUTAS: Banana 4,99 | Maçã 9,90"
    let inlineCategory = null;
    const ih = s.match(/^\s*([^\p{Ll}\d:]*\p{Lu}[^\p{Ll}\d:]{2,30}):\s+(?=.*\d)/u);
    if (ih) { inlineCategory = cleanName(ih[1]); s = ' '.repeat(ih[0].length) + s.slice(ih[0].length); }

    const cands = scoreCandidates(scanCandidates(s));
    const hasPrice = cands.some((c) => c.role === 'price' && c.score >= 0);

    if (!hasPrice) {
      const letters = lettersOnly.replace(/[^\p{L}]/gu, '');
      const isCaps = letters.length >= 3 && letters === letters.toUpperCase();
      const wrapped = /^[^\p{L}\d]*\*[^*]+\*[^\p{L}\d]*$/u.test(line);
      if (lettersOnly && lettersOnly.length <= 40 && !/\d/.test(s) &&
          (wrapped || isCaps || CATEGORY_RE.test(lettersOnly.replace(/:$/, '')))) {
        return [{ kind: 'header', name: lettersOnly.replace(/:$/, ''), raw, dates, hadEmoji }];
      }
      return [{ kind: 'text', text: s, raw, dates }];
    }

    const segs = splitSegments(s, cands) || [s];
    return segs.map((seg) => {
      const r = analyzeSegment(seg, raw);
      if (r.kind === 'item') {
        if (struck != null && r.oldPrice == null) r.oldPrice = struck;
        r.promo = promoMarkup || promoWord || r.oldPrice != null;
      }
      r.inlineCategory = inlineCategory;
      r.dates = dates;
      return r;
    });
  }

  // --------------------------------------------------- templates aprendidos (PBE)

  const PRICE_GROUP = '(?<price>\\d+(?:[.,]\\d{1,2})?)';
  const NAME_GROUP = '(?<name>.+?)';
  const UNIT_GROUP = '(?<unit>' + UNIT + ')' + UNIT_END;

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'); }

  /** Generaliza um trecho literal: espaços -> \s*, dígitos -> \d+, pontuação repetida -> X+. */
  function generalizeLiteral(lit) {
    let out = '';
    const re = /(\s+)|(\d+(?:[.,]\d+)?)|(\p{L}+)|((\p{Extended_Pictographic}|[️‍])+)|(([^\s\p{L}\d])\7*)/gu;
    let m;
    while ((m = re.exec(lit))) {
      if (m[1]) out += '\\s*';
      else if (m[2]) out += '\\d+(?:[.,]\\d+)?';
      else if (m[3]) out += escapeRe(m[3]);
      else if (m[4]) out += '[\\p{Extended_Pictographic}\\uFE0F\\u200D]*';
      else if (m[6]) out += escapeRe(m[7]) + (m[6].length > 1 ? '+' : '');
    }
    return out.replace(/(?:\\s\*)+/g, '\\s*');
  }

  /**
   * Induz uma regex a partir de UMA linha anotada pelo usuário.
   * ann = { name: 'Jaca inteira', price: '15', unit?: 'kg' } — substrings da linha.
   */
  function induceTemplate(line, ann) {
    const norm = normalizeText(line).trim();
    const spans = [];
    let cursor = 0;
    for (const key of ['name', 'price', 'unit']) {
      if (!ann[key]) continue;
      const needle = key === 'price' ? String(ann.price).replace(/^R\s?\$\s?/, '') : ann[key];
      const idx = norm.indexOf(needle);
      if (idx < 0) throw new Error(`"${needle}" não encontrado na linha`);
      spans.push({ key, start: idx, end: idx + needle.length });
    }
    spans.sort((a, b) => a.start - b.start);
    for (let i = 1; i < spans.length; i++) {
      if (spans[i].start < spans[i - 1].end) throw new Error('anotações sobrepostas');
    }
    let src = '^\\s*';
    cursor = 0;
    for (const sp of spans) {
      src += generalizeLiteral(norm.slice(cursor, sp.start));
      src += sp.key === 'name' ? NAME_GROUP : sp.key === 'price' ? PRICE_GROUP : UNIT_GROUP;
      cursor = sp.end;
    }
    src += generalizeLiteral(norm.slice(cursor)) + '\\s*$';
    src = src.replace(/(?:\\s\*)+/g, '\\s*');

    const tpl = { source: src, flags: 'iu', fixedUnit: ann.unit ? null : (ann.fixedUnit || null), createdAt: Date.now(), hits: 0 };
    const check = matchTemplate(tpl, norm);
    if (!check || check.name !== cleanName(ann.name) || check.price !== toNumber(String(ann.price).replace(/^R\s?\$\s?/, ''))) {
      throw new Error('template induzido não reproduz a anotação');
    }
    return tpl;
  }

  function matchTemplate(tpl, line) {
    const re = tpl._re || (tpl._re = new RegExp(tpl.source, tpl.flags));
    const m = re.exec(normalizeText(line).trim());
    if (!m || !m.groups) return null;
    return {
      kind: 'item',
      name: cleanName(m.groups.name || ''),
      price: toNumber(m.groups.price),
      unit: m.groups.unit ? canonUnit(m.groups.unit) : tpl.fixedUnit,
      unitFrom: 'template',
      oldPrice: null, packQty: null, strong: true, score: 99, promo: false,
      raw: line, viaTemplate: true,
    };
  }

  // ------------------------------------------------------------------ parse geral

  /**
   * @param {string} text
   * @param {{templates?: Array}} [opts]
   * @returns {{items, unparsed, promoDate, stats}}
   */
  function parse(text, opts = {}) {
    const templates = opts.templates || [];
    const lines = normalizeText(text).split('\n');
    const analyzed = lines.map((l) => {
      if (l.length > MAX_LINE) return [{ kind: 'long', raw: l.slice(0, 80) }];
      for (const t of templates) {
        const hit = matchTemplate(t, l);
        if (hit) { t.hits = (t.hits || 0) + 1; return [hit]; }
      }
      return analyzeLine(l);
    });

    const items = [];
    const unparsed = [];
    let category = null;
    let pending = null; // linha só com nome, aguardando preço na linha seguinte
    let promoDate = null;

    const flushPending = () => {
      if (pending) unparsed.push({ line: pending.raw, reason: 'sem preço' });
      pending = null;
    };

    for (let li = 0; li < analyzed.length; li++) {
      for (const r of analyzed[li]) {
        if (!promoDate && r.dates && r.dates.length && r.kind !== 'item') promoDate = r.dates[0];
        if (r.kind === 'blank') continue;
        if (r.kind === 'noise') { flushPending(); continue; }
        if (r.kind === 'long') { flushPending(); unparsed.push({ line: r.raw, reason: 'linha muito longa' }); continue; }
        if (r.kind === 'header') { flushPending(); category = r.name; continue; }
        if (r.kind === 'text') { flushPending(); pending = r; continue; }

        // item
        if (r.inlineCategory) category = r.inlineCategory;

        // Preço "fraco" (sem R$) seguido por linha só-preço forte => esta linha é nome
        const next = analyzed[li + 1] && analyzed[li + 1][0];
        if (!r.viaTemplate && !r.strong && next && next.kind === 'item' && next.strong && isPriceOnly(next) &&
            analyzed[li].length === 1) {
          flushPending();
          pending = { raw: r.raw, text: r.raw };
          continue;
        }

        let item = r;
        if (!r.viaTemplate && isPriceOnly(r)) {
          if (!pending) { unparsed.push({ line: r.raw, reason: 'preço sem nome' }); continue; }
          const nm = cleanName(normalizeText(pending.raw).replace(/[*_~]/g, ' '));
          let unit = r.unit;
          if (!unit) { const nu = nm.match(NAME_UNIT_RE); unit = nu ? canonUnit(nu[1]) : null; }
          item = { ...r, name: nm, unit, raw: pending.raw + '\n' + r.raw };
          pending = null;
        } else {
          flushPending();
        }
        if (!item.name) { unparsed.push({ line: item.raw, reason: 'nome vazio' }); continue; }

        items.push({
          name: item.name,
          price: item.price,
          unit: item.unit || null,
          unitFrom: item.unitFrom || null,
          oldPrice: item.oldPrice,
          packQty: item.packQty,
          promo: !!item.promo || (category != null && PROMO_CATEGORY_RE.test(category)),
          category,
          _bare: !!item.bare,
          _strong: !!item.strong,
          confidence: item.viaTemplate ? 1 : Math.max(0.1, Math.min(1, (item.score + 2) / 10)),
          source: item.viaTemplate ? 'template' : 'heuristic',
          raw: item.raw,
        });
      }
    }
    flushPending();

    // Regra por documento: inteiro "pelado" só vale se a maioria dos demais itens também
    // vem sem R$. Fornecedor que escreve "R$ 4,99" em tudo não escreve "Alface 3".
    const others = items.filter((i) => !i._bare);
    const withoutCur = others.filter((i) => !i._strong).length;
    const bareAllowed = others.length === 0 || withoutCur / others.length >= 0.5;
    const kept = [];
    for (const it of items) {
      if (it._bare && (!bareAllowed || it.price > MAX_BARE_INT)) {
        unparsed.push({ line: it.raw, reason: 'preço inteiro sem moeda' });
        continue;
      }
      delete it._bare; delete it._strong;
      kept.push(it);
    }
    items.length = 0;
    items.push(...kept);

    const candidateLines = lines.filter((l) => /\d/.test(l) && /\p{L}/u.test(l)).length;
    return {
      items,
      unparsed,
      promoDate,
      stats: { lines: lines.length, items: items.length, unparsed: unparsed.length, candidateLines },
    };
  }

  // ------------------------------------------------------ armazenamento de regras

  /** Repositório de templates por fornecedor (localStorage no navegador, memória em Node). */
  function createTemplateStore(storage, key = 'hortifruti.templates.v1') {
    let mem = [];
    const load = () => {
      try { return storage ? JSON.parse(storage.getItem(key) || '[]') : mem; } catch { return []; }
    };
    const save = (list) => {
      const plain = list.map(({ _re, ...t }) => t);
      try { if (storage) storage.setItem(key, JSON.stringify(plain)); else mem = plain; } catch { mem = plain; }
    };
    return {
      list: load,
      learn(line, ann) {
        const tpl = induceTemplate(line, ann);
        const list = load().filter((t) => t.source !== tpl.source);
        list.unshift(tpl);
        save(list.slice(0, 200));
        return tpl;
      },
      remove(source) { save(load().filter((t) => t.source !== source)); },
      clear() { save([]); },
    };
  }

  return { parse, analyzeLine, induceTemplate, matchTemplate, createTemplateStore, canonUnit, _internals: { UNIT, CANDIDATE_RE, AFTER_UNIT_RE, BEFORE_UNIT_RE, COMBO_RE } };
});
