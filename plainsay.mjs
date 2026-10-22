// si-didy-loop · plainsay.mjs — what local Kar is trying to say, in plain words, from the evidence alone.
//
// Found 2026-10-22: every nightly idea was one fill-in sentence ("A bundled with B as a paired offer for whoever already
// runs C") over three names a graph walk landed on, each scored the same 0.618, none carrying a reason. Simon read them
// and could not tell what Kar meant, because there was nothing in them to mean. The dream now keeps the ROUTE it walked
// (deepen.mjs), and this kernel says that route as sentences a person can check: which memory note names what, which
// session talked about what, which topic two repos share, which earlier night linked them.
//
// It invents nothing. Every clause is read off an edge or a node the estate already holds; a step whose reason was not
// kept is said as exactly that, never guessed. Pure, total, no clock, no I/O: the runner hands in a `look` with
// node(id) → { type, meta } and edge(from, type, to) → meta (or null), and, optionally, fresh(id) → true when the node
// is the day's own work.

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
const arr = (v) => Array.isArray(v) ? v : [];
const str = (v) => typeof v === 'string' ? v : '';
const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const call = (f, ...a) => { try { return typeof f === 'function' ? f(...a) : null; } catch { return null; } };

/** A node as a person would name it: a memory note, a session, a FallWorld wing, or the repo by its own name. */
export function nameOf(id, look) {
  const s = str(id);
  if (!s) return 'something unnamed';
  const meta = obj(obj(call(obj(look)?.node, s))?.meta) || {};
  if (s.startsWith('memory:')) return `your memory note "${cut(s.slice(7), 60)}"`;
  if (s.startsWith('chat:')) return `a session (${cut(s.slice(5, 13), 8)}${str(meta.day) ? ', ' + str(meta.day).slice(0, 10) : ''})`;
  if (s.startsWith('wing:')) return `FallWorld's "${cut(str(meta.name) || s.slice(5), 40)}" wing`;
  return cut(s, 80);
}

/** One hop of a route, as one clause. The edge's own record says why it exists; the clause says that and no more. */
export function sayStep(step, look) {
  const st = obj(step);
  if (!st || !str(st.from) || !str(st.to)) return '';
  const type = str(st.type);
  const m = obj(call(obj(look)?.edge, st.from, type, st.to)) || {};
  // a reverse edge is the same fact read backwards: say it the way it was written
  const [a, b] = m.rev ? [st.to, st.from] : [st.from, st.to];
  const A = nameOf(a, look), B = nameOf(b, look);
  const times = Number.isInteger(m.mentions) && m.mentions > 1 ? ` (${m.mentions} times)` : '';
  if (m.as === 'mentions') return m.rev ? `${B} is named in ${A}` : `${A} names ${B}`;
  if (m.as === 'discussed') return m.rev ? `${B} came up in ${A}${times}` : `${A} talked about ${B}${times}`;
  if (m.as === 'wiki-link') return `${A} links to ${B}`;
  if (str(m.topic)) return `${A} and ${B} share the topic "${cut(str(m.topic), 60)}"`;
  if (m.by === 'deepen') return `an earlier night linked ${A} to ${B}`;
  if (type === 'contains') return m.rev ? `${B} is in ${A}` : `${A} holds ${B}`;
  if (Object.keys(m).length) return `${A} is linked to ${B}${type ? ' (' + cut(type, 30) + ')' : ''}`;
  return `${A} is linked to ${B} (the reason for this link was not kept)`;
}

/**
 * A held dream branch, said whole: where it started, where it arrived, every hop between, and what the arrival is.
 * { ok, said, steps, from, to, fresh } — fresh is true when any node on the route is the day's own work.
 */
export function sayRoute(held, look) {
  const h = obj(held);
  if (!h || !str(h.root) || !str(h.node)) return { ok: false, said: '', steps: [], from: '', to: '', fresh: false };
  const path = arr(h.path).map(obj).filter(Boolean);
  const steps = path.map(p => sayStep(p, look)).filter(Boolean);
  const from = nameOf(h.root, look), to = nameOf(h.node, look);
  const ids = [h.root, ...path.map(p => str(p.to))].filter(Boolean);
  const fresh = ids.some(id => call(obj(look)?.fresh, id) === true);
  const desc = cut(str(obj(obj(call(obj(look)?.node, h.node))?.meta)?.desc).trim(), 140);
  const what = desc ? ` (${to}: ${desc})` : '';
  const said = steps.length
    ? `${from} led me to ${to}: ${steps.join('; then ')}.${what}`
    : `${from} led me to ${to}, but the route was not kept, so I cannot say why.${what}`;
  return { ok: true, said, steps, from, to, fresh };
}

/**
 * Two held branches from the same night, said as the idea they make together, with BOTH routes as the reasons and the
 * plain warning that nothing has checked it. Returns '' when there is not a pair to say.
 */
export function sayIdea(a, b, look) {
  const ra = sayRoute(a, look), rb = sayRoute(b, look);
  if (!ra.ok || !rb.ok) return '';
  if (ra.to === rb.to) return `I keep arriving at ${ra.to}. Why: ${ra.said} ${rb.said} Nothing has checked this yet; only a real turn confirms it.`;
  return `I think ${ra.to} and ${rb.to} might belong together. Why: ${ra.said} ${rb.said} Nothing has checked this yet; only a real turn confirms it.`;
}

export default sayRoute;
