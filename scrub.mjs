// fallscrub · scrub.mjs — text in, text out, with every tell of WHICH model wrote it removed.
//
// Sovereignty applied to output: run whatever local/open model you like — the text should never
// advertise which one. This kernel strips the fingerprints, loudest first:
//   1. CHAT-TEMPLATE TOKENS — the literal special tokens that name a model family (ChatML's
//      <|im_start|>, Llama's <|eot_id|>, Mistral's [INST], Gemma's <start_of_turn>, and friends).
//   2. SELF-IDENTIFICATION — "As an AI language model…", "I am Qwen/LLaMA/…", cutoff lines.
//   3. BOILERPLATE — the opener/closer scaffolding ("Certainly!", "I hope this helps").
//   4. TELL-WORDS — the overused cluster (delve, leverage, utilize…) swapped for plain words.
//   5. HIDDEN STAMPS — the invisible watermark channel: zero-width marks, bidi controls, variation
//      selectors, and the Unicode TAGS block that can smuggle a whole hidden string between the
//      visible letters. Plus HOMOGLYPHS — Cyrillic/Greek letters disguised as Latin.
//   6. COSMETIC — smart quotes, exotic spaces, dashes, ellipses normalised.
//
// HONEST LIMIT, stated because the estate prints its limits: this removes the OBVIOUS,
// deterministic tells and every hidden/disguised character — it does NOT defeat a STATISTICAL
// watermark (SynthID-style: a bias in which words were chosen, not any character), which only
// paraphrasing can remove. It is a sovereignty tool (keep your stack private), not a tool for
// passing machine text as human to deceive. Pure, total, no I/O: same text in, same text out.

const str = (v) => typeof v === 'string' ? v : '';

// ── 1 · chat-template special tokens: the family fingerprints ──
export const CHAT_TOKENS = [
  /<\|im_start\|>/g, /<\|im_end\|>/g,                          // ChatML (Qwen, others)
  /<\|eot_id\|>/g, /<\|start_header_id\|>/g, /<\|end_header_id\|>/g, /<\|begin_of_text\|>/g,  // Llama 3
  /<\|endoftext\|>/g, /<\|end\|>/g, /<\|user\|>/g, /<\|assistant\|>/g, /<\|system\|>/g,
  /\[\/?INST\]/g, /<<\/?SYS>>/g,                               // Llama 2 / Mistral
  /<start_of_turn>/g, /<end_of_turn>/g,                        // Gemma
  /<｜(?:begin|end)▁of▁sentence｜>/g, /<｜User｜>/g, /<｜Assistant｜>/g,  // DeepSeek
  /<\/?s>/g,                                                    // sentence markers
  /◁think▷|◁\/think▷/g,                     // some reasoning tags
];

// ── 2 · self-identification: the model naming itself ──
export const SELF_ID = [
  /\bas an? (?:AI|artificial intelligence)(?: language)?(?: model)?\b[,:]?\s*/gi,
  /\bas a large language model\b[,:]?\s*/gi,
  /\bI(?:'| a)m (?:an? )?(?:AI|artificial intelligence|language model|large language model)\b[.,]?\s*/gi,
  /\bI am (?:Qwen|LLaMA|Llama|Mistral|Mixtral|DeepSeek|Gemma|GPT-?\d?|ChatGPT|Claude|Gemini|Phi|Yi|Command ?R|Grok)\b[.,]?\s*/gi,
  /\b(?:powered by|built on|built with|made with|running on|based on|using|via) (?:Qwen|LLaMA|Llama|Mistral|Mixtral|DeepSeek|Gemma|GPT-?\d?|Ollama|WebLLM)\b[.,]?\s*/gi,
  /\bas of my (?:last )?(?:knowledge cut-?off|training|update)[^.?!]*[.?!]\s*/gi,
  /\bmy training data (?:only )?(?:goes|extends|includes|is)[^.?!]*[.?!]\s*/gi,
  /\bI (?:don'?t|do not|cannot|can'?t) have (?:access to )?(?:real-?time|current|up-?to-?date)[^.?!]*[.?!]\s*/gi,
];

// ── 3 · boilerplate openers (start) and closers (end) ──
export const OPENERS = [
  /^(?:Certainly|Sure|Of course|Absolutely|Great question|Good question|Excellent question|I'd be happy to help|Happy to help)[!,.]?\s+/i,
  /^(?:Here(?:'s| is|'s a| is a)[^:\n]*:)\s*/i,
];
export const CLOSERS = [
  /\s*(?:I hope this helps|Hope (?:this|that) helps|Let me know if (?:you have any|there'?s anything|you need)[^.!?]*|Feel free to (?:ask|reach out)[^.!?]*|Is there anything else[^.!?]*)[.!?]?\s*$/i,
  /\s*(?:In conclusion|In summary|To summarize|Overall|All in all)[,:]\s*/gi,
];

// ── 4 · tell-word cluster → plain equivalents (case of first letter preserved) ──
export const WORD_SWAPS = Object.freeze({
  delve: 'look', delves: 'looks', delving: 'looking',
  utilize: 'use', utilizes: 'uses', utilizing: 'using', utilise: 'use', utilises: 'uses',
  leverage: 'use', leverages: 'uses', leveraging: 'using',
  showcase: 'show', showcases: 'shows', showcasing: 'showing',
  seamless: 'smooth', seamlessly: 'smoothly', robust: 'solid', elevate: 'raise',
  elevates: 'raises', elevating: 'raising', embark: 'start', embarks: 'starts',
  harness: 'use', harnesses: 'uses', foster: 'build', fosters: 'builds',
  meticulous: 'careful', meticulously: 'carefully', myriad: 'many', plethora: 'plenty',
  furthermore: 'also', moreover: 'also', additionally: 'also', nevertheless: 'still',
  commence: 'start', commences: 'starts', endeavor: 'try', endeavour: 'try',
  facilitate: 'help', facilitates: 'helps',
});

// ── 5a · HIDDEN STAMP CHARACTERS — the invisible watermark channel, no legit use in Latin prose ──
//    soft hyphen · mongolian sep · zero-width & bidi controls · word joiner · invisible ops · BOM
//    · variation selectors (BMP + supplement) · the Unicode TAGS block (can hide a whole string).
const HIDDEN_RE = /[­᠎​-‏‪-‮⁠-⁤⁦-⁩﻿︀-️]|[\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu;

// ── 5b · HOMOGLYPHS — Cyrillic/Greek letters disguised as Latin lookalikes → Latin ──
export const HOMOGLYPHS = Object.freeze({
  'а':'a','е':'e','о':'o','р':'p','с':'c','у':'y','х':'x','ѕ':'s','і':'i','ј':'j',
  'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','У':'Y','Х':'X','Ѕ':'S','І':'I','Ј':'J',
  'ο':'o','Α':'A','Β':'B','Ε':'E','Ζ':'Z','Η':'H','Ι':'I','Κ':'K','Μ':'M','Ν':'N','Ο':'O','Ρ':'P','Τ':'T','Υ':'Y','Χ':'X',
});
const HOMOGLYPH_RE = new RegExp('[' + Object.keys(HOMOGLYPHS).join('') + ']', 'g');

// ── 5c · cosmetic unicode: visible artifacts normalised ──
function cosmetic(s) {
  return s
    .replace(/[‘’‚‛]/g, "'")   // smart single quotes
    .replace(/[“”„‟]/g, '"')   // smart double quotes
    .replace(/…/g, '...')                     // ellipsis
    .replace(/[   -   　]/g, ' ')  // exotic spaces
    .replace(/[–—]/g, '-');              // en/em dash → hyphen
}

const capMatch = (repl, hit) => /^[A-Z]/.test(hit) ? repl.charAt(0).toUpperCase() + repl.slice(1) : repl;

/**
 * Scrub text of model-identifying tells. Returns { text, report } — the report is a transparent
 * count per category, because a scrubber you can't audit is just another black box. Deterministic.
 */
export function scrub(input, opts) {
  const swapWords = !(opts && typeof opts === 'object' && opts.swapWords === false);   // on unless turned off
  let s = str(input);
  const report = { chatTokens: 0, selfId: 0, boilerplate: 0, wordSwaps: 0, hidden: 0, homoglyphs: 0, cosmetic: 0 };

  // the hidden stamps first — before anything else can be confused by them
  s = s.replace(HIDDEN_RE, () => { report.hidden++; return ''; });
  s = s.replace(HOMOGLYPH_RE, (h) => { report.homoglyphs++; return HOMOGLYPHS[h]; });
  const beforeCos = s;
  s = cosmetic(s);
  report.cosmetic = beforeCos === s ? 0 : 1;

  for (const re of CHAT_TOKENS) s = s.replace(re, () => { report.chatTokens++; return ''; });
  for (const re of SELF_ID) s = s.replace(re, () => { report.selfId++; return ''; });
  for (const re of OPENERS) s = s.replace(re, () => { report.boilerplate++; return ''; });
  for (const re of CLOSERS) s = s.replace(re, () => { report.boilerplate++; return ''; });

  if (swapWords) {
    for (const [word, repl] of Object.entries(WORD_SWAPS)) {
      s = s.replace(new RegExp('\\b' + word + '\\b', 'gi'), (hit) => { report.wordSwaps++; return capMatch(repl, hit); });
    }
  }

  // tidy the removals: collapse double spaces, heal orphan space-before-punctuation left when a
  // token/hidden char was cut mid-sentence ("a , b" → "a, b"), trim blank-line spam and the edges
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.;:!?])/g, '$1').replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: s, report };
}

/** Detect tells WITHOUT changing the text — for a preview/report. Same report shape. */
export function tells(input) { return scrub(input).report; }

/** One number: how many tells were found (0 = clean). */
export function tellCount(input) {
  const r = tells(input);
  return r.chatTokens + r.selfId + r.boilerplate + r.wordSwaps + r.hidden + r.homoglyphs + r.cosmetic;
}

export default scrub;
