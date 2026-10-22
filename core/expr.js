// The expr language of recipe parameters: parsed into an AST, compiled to a stack program and run; never run as code.

// Opcodes of a compiled expr (`compileExpr`); NUM, REF, MIN and MAX take one operand.
const NUM = 0, REF = 1, NEG = 2, ADD = 3, SUB = 4, MUL = 5, DIV = 6;
const ABS = 7, MIN = 8, MAX = 9, CLAMP = 10, POW = 11, EXP = 12, SIN = 13;
const OPS = Object.freeze({ '+': ADD, '-': SUB, '*': MUL, '/': DIV });

/** Functions an expr may call: name -> [min args, max args, opcode]. */
const FUNCTIONS = Object.freeze({
  abs: [1, 1, ABS],
  min: [2, Infinity, MIN],
  max: [2, Infinity, MAX],
  clamp: [3, 3, CLAMP],
  pow: [2, 2, POW],
  exp: [1, 1, EXP],
  sin: [1, 1, SIN],
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

/**
 * Compiles an AST into a flat postfix program for `runExpr`, which runs it on a fixed stack and
 * so allocates nothing (an audio thread runs it). `slot(name)` gives the index in `values` each
 * name is read from. Returns `{ code, stack }`.
 */
export function compileExpr(ast, slot) {
  const code = [];
  let depth = 0, max = 0;
  const push = () => { max = Math.max(max, ++depth); };
  const emit = (node) => {
    switch (node.k) {
      case 'num': code.push(NUM, node.v); push(); break;
      case 'ref': code.push(REF, slot(node.name)); push(); break;
      case 'neg': emit(node.a); code.push(NEG); break;
      case 'call':
        node.args.forEach(emit);
        code.push(FUNCTIONS[node.fn][2]);
        if (node.fn === 'min' || node.fn === 'max') code.push(node.args.length);
        depth -= node.args.length - 1;
        break;
      default: emit(node.a); emit(node.b); code.push(OPS[node.op]); depth--;
    }
  };
  emit(ast);
  return { code: Float64Array.from(code), stack: new Float64Array(max) };
}

/** Runs a program from `compileExpr` and writes its result to `into[at]`. Allocates nothing. */
export function runExpr({ code, stack }, values, into, at) {
  let sp = 0;
  for (let pc = 0; pc < code.length;) {
    switch (code[pc++]) {
      case NUM: stack[sp++] = code[pc++]; break;
      case REF: stack[sp++] = values[code[pc++]]; break;
      case NEG: stack[sp - 1] = -stack[sp - 1]; break;
      case ADD: sp--; stack[sp - 1] = stack[sp - 1] + stack[sp]; break;
      case SUB: sp--; stack[sp - 1] = stack[sp - 1] - stack[sp]; break;
      case MUL: sp--; stack[sp - 1] = stack[sp - 1] * stack[sp]; break;
      case DIV: sp--; stack[sp - 1] = stack[sp - 1] / stack[sp]; break;
      case ABS: stack[sp - 1] = Math.abs(stack[sp - 1]); break;
      case EXP: stack[sp - 1] = Math.exp(stack[sp - 1]); break;
      case SIN: stack[sp - 1] = Math.sin(stack[sp - 1]); break;
      case POW: sp--; stack[sp - 1] = Math.pow(stack[sp - 1], stack[sp]); break;
      case CLAMP: sp -= 2; stack[sp - 1] = Math.min(Math.max(stack[sp - 1], stack[sp]), stack[sp + 1]); break;
      default: {  // MIN or MAX over the top n values, folded left to right
        const isMin = code[pc - 1] === MIN, n = code[pc++];
        sp -= n - 1;
        for (let j = 0; j < n - 1; j++) stack[sp - 1] = isMin ? Math.min(stack[sp - 1], stack[sp + j]) : Math.max(stack[sp - 1], stack[sp + j]);
      }
    }
  }
  into[at] = stack[0];
}

/** Evaluates an AST once; `scope[name]` gives each name's value (a missing name reads NaN). */
export function evaluate(ast, scope) {
  const names = [...exprRefs(ast)], result = new Float64Array(1);
  runExpr(compileExpr(ast, (name) => names.indexOf(name)), Float64Array.from(names, (name) => scope[name]), result, 0);
  return result[0];
}
