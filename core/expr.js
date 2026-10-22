// The expr language of recipe parameters: parsed into an AST and walked, never run as code.

/** Functions an expr may call: name -> [min args, max args, implementation]. */
const FUNCTIONS = Object.freeze({
  abs: [1, 1, Math.abs],
  min: [2, Infinity, Math.min],
  max: [2, Infinity, Math.max],
  clamp: [3, 3, (x, lo, hi) => Math.min(Math.max(x, lo), hi)],
  pow: [2, 2, Math.pow],
  exp: [1, 1, Math.exp],
  sin: [1, 1, Math.sin],
});

const MAX_LENGTH = 1000;

// Groups: number, name (`a` or `node.field`), operator, any other character (an error).
const TOKEN = /(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)|([-+*\/(),])|(\S)/g;

function tokenize(text) {
  const tokens = [];
  for (const m of text.matchAll(TOKEN)) {  // matchAll copies the regex: no shared lastIndex
    const pos = m.index;
    if (m[4] !== undefined) throw new Error(`unexpected character '${m[4]}' at ${pos}`);
    tokens.push(m[1] !== undefined ? { k: 'num', v: Number(m[1]), pos, text: m[0] }
      : m[2] !== undefined ? { k: 'name', v: m[2], pos, text: m[0] } : { k: m[3], pos, text: m[0] });
  }
  tokens.push({ k: 'end', pos: text.length });
  return tokens;
}

/**
 * Parses an expr string into an AST. Throws an Error whose message names the position.
 * AST: { k: 'num', v } | { k: 'ref', name } | { k: 'neg', a } | { k: 'bin', op, a, b } | { k: 'call', fn, args }.
 */
export function parseExpr(text) {
  text = String(text);
  // The AST is walked recursively: a bounded length keeps its depth far from the stack limit.
  if (text.length > MAX_LENGTH) throw new Error(`longer than ${MAX_LENGTH} characters`);
  const tokens = tokenize(text);
  let i = 0;
  const peek = () => tokens[i];
  const fail = (t) => { throw new Error(t.k === 'end' ? 'unexpected end' : `unexpected '${t.text}' at ${t.pos}`); };
  const expect = (k) => (peek().k === k ? tokens[i++] : fail(peek()));
  const sum = () => {
    let a = product();
    while (peek().k === '+' || peek().k === '-') a = { k: 'bin', op: tokens[i++].k, a, b: product() };
    return a;
  };
  const product = () => {
    let a = unary();
    while (peek().k === '*' || peek().k === '/') a = { k: 'bin', op: tokens[i++].k, a, b: unary() };
    return a;
  };
  const unary = () => {
    if (peek().k === '-') { i++; return { k: 'neg', a: unary() }; }
    if (peek().k === '+') { i++; return unary(); }
    return primary();
  };
  const primary = () => {
    const t = tokens[i++];
    if (t.k === 'num') return { k: 'num', v: t.v };
    if (t.k === '(') { const a = sum(); expect(')'); return a; }
    if (t.k !== 'name') fail(t);
    if (peek().k !== '(') return { k: 'ref', name: t.v };
    const f = Object.hasOwn(FUNCTIONS, t.v) ? FUNCTIONS[t.v] : null;
    if (!f) throw new Error(`unknown function '${t.v}' at ${t.pos} (known: ${Object.keys(FUNCTIONS).join(' ')})`);
    i++;
    const args = [sum()];
    while (peek().k === ',') { i++; args.push(sum()); }
    expect(')');
    if (args.length < f[0] || args.length > f[1]) throw new Error(`${t.v}() takes ${f[0] === f[1] ? f[0] : `at least ${f[0]}`} argument(s), got ${args.length}`);
    return { k: 'call', fn: t.v, args };
  };
  const ast = sum();
  if (peek().k !== 'end') fail(peek());
  return ast;
}

/** Every name an AST reads (`throttle`, `fire.gain`). */
export function exprRefs(ast, into = new Set()) {
  if (ast.k === 'ref') into.add(ast.name);
  for (const child of [ast.a, ast.b, ...(ast.args ?? [])]) if (child) exprRefs(child, into);
  return into;
}

/** Walks an AST; `scope[name]` gives each name's value. */
export function evaluate(ast, scope) {
  switch (ast.k) {
    case 'num': return ast.v;
    case 'ref': return scope[ast.name];
    case 'neg': return -evaluate(ast.a, scope);
    case 'call': return FUNCTIONS[ast.fn][2](...ast.args.map((a) => evaluate(a, scope)));
    default: {
      const a = evaluate(ast.a, scope), b = evaluate(ast.b, scope);
      return ast.op === '+' ? a + b : ast.op === '-' ? a - b : ast.op === '*' ? a * b : a / b;
    }
  }
}
