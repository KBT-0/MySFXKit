// Recipe validation: checks a recipe and turns it into the plan the interpreter runs.
import { BLOCKS } from './blocks.js';
import { parseExpr, exprRefs } from './expr.js';

const NAME = /^[A-Za-z_]\w*$/;
/** Most nodes one recipe may have. */
export const MAX_NODES = 1000;
const TOP_KEYS = ['name', 'description', 'version', 'seed', 'inputs', 'params', 'nodes', 'out'];
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validates a recipe (parsed JSON). Returns `{ ok, errors }`; each error is
 * `{ node, path, message }`, with `node` the node id or null.
 */
export function validateRecipe(json) {
  const { errors } = analyzeRecipe(json);
  return { ok: errors.length === 0, errors };
}

/**
 * Validates a recipe and builds its plan: `{ errors, plan }`, where `plan` is null when there
 * are errors. Plan: `{ seed, inputs, params: [{ name, rate, slew }], nodes: [...] (run order), out }`.
 */
export function analyzeRecipe(recipe) {
  const errors = [];
  const report = (node, path, message) => errors.push({ node, path, message });
  if (!isObject(recipe)) {
    report(null, '', 'a recipe must be a JSON object');
    return { errors, plan: null };
  }
  for (const key of Object.keys(recipe)) if (!TOP_KEYS.includes(key)) report(null, key, `unknown key (known: ${TOP_KEYS.join(', ')})`);
  if (typeof recipe.name !== 'string' || recipe.name === '') report(null, 'name', 'must be a non-empty string');
  if (recipe.version !== 0) report(null, 'version', 'must be 0');
  if (!Number.isInteger(recipe.seed) || recipe.seed < 0 || recipe.seed > 0xffffffff) report(null, 'seed', 'must be an integer from 0 to 4294967295');

  // Inputs: game state, set from outside.
  const inputs = Object.create(null);  // no prototype: a name like __proto__ stays a plain key
  const inputSpecs = recipe.inputs ?? {};
  if (!isObject(inputSpecs)) report(null, 'inputs', 'must be an object of name: { min, max, default }');
  else for (const [name, spec] of Object.entries(inputSpecs)) {
    const path = `inputs.${name}`;
    if (!NAME.test(name)) report(null, path, 'is not a valid name (letters, digits, _)');
    else if (!isObject(spec) || ![spec.min, spec.max, spec.default].every(Number.isFinite)) report(null, path, 'must be { min, max, default }, three numbers');
    else if (!(spec.min <= spec.default && spec.default <= spec.max)) report(null, path, 'needs min <= default <= max');
    else inputs[name] = { min: spec.min, max: spec.max, default: spec.default };
  }

  // Exprs: a number, or a string parsed into an AST whose names must already be known.
  const known = new Set(Object.keys(inputs));
  const parse = (value, node, path, refs) => {
    if (typeof value === 'number' && Number.isFinite(value)) return { k: 'num', v: value };
    if (typeof value !== 'string') { report(node, path, 'must be a number or an expr string'); return null; }
    let ast;
    try { ast = parseExpr(value); } catch (e) {
      report(node, path, `${node ? `node "${node}", ` : ''}parameter "${path.split('.').pop()}": cannot parse "${value}": ${e.message}`);
      return null;
    }
    for (const name of exprRefs(ast)) {
      if (known.has(name)) continue;
      if (refs && name.includes('.')) refs.push({ name, path, text: value });
      else report(node, path, `"${value}" reads "${name}", which is not ${refs ? 'an input, a param or a node field' : 'an input or an earlier param'}`);
    }
    return ast;
  };

  // Params: evaluated in order; each may read inputs and earlier params.
  const params = [];
  const paramSpecs = recipe.params ?? {};
  if (!isObject(paramSpecs)) report(null, 'params', 'must be an object of name: value');
  else for (const [name, value] of Object.entries(paramSpecs)) {
    const path = `params.${name}`;
    if (!NAME.test(name) || known.has(name)) { report(null, path, known.has(name) ? 'is already an input or a param' : 'is not a valid name (letters, digits, _)'); continue; }
    if (isObject(value)) {
      const extra = Object.keys(value).filter((k) => k !== 'slew' && k !== 'rate');
      if (extra.length || value.slew === undefined || value.rate === undefined) report(null, path, 'a glided param is { slew, rate }: it moves toward rate with time constant slew (seconds)');
      else params.push({ name, rate: parse(value.rate, null, `${path}.rate`), slew: parse(value.slew, null, `${path}.slew`) });
    } else params.push({ name, rate: parse(value, null, path), slew: null });
    known.add(name);
  }

  // Nodes.
  if (!Array.isArray(recipe.nodes) || recipe.nodes.length === 0) {
    report(null, 'nodes', 'must be a non-empty array');
    return { errors, plan: null };
  }
  // The run-order walk recurses once per node; a few thousand nodes overflow the stack.
  if (recipe.nodes.length > MAX_NODES) {
    report(null, 'nodes', `has ${recipe.nodes.length} nodes; at most ${MAX_NODES} are allowed`);
    return { errors, plan: null };
  }
  const byId = new Map();
  recipe.nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    if (!isObject(node)) return report(null, path, 'must be an object { id, type, ... }');
    if (typeof node.id !== 'string' || !NAME.test(node.id)) return report(null, `${path}.id`, 'must be a name (letters, digits, _)');
    if (byId.has(node.id) || known.has(node.id)) return report(node.id, `${path}.id`, `"${node.id}" is used twice`);
    byId.set(node.id, { node, index });  // kept even with a bad type, so references to it raise no second error
    if (!Object.hasOwn(BLOCKS, node.type)) report(node.id, `${path}.type`, `unknown block type "${node.type}" (known: ${Object.keys(BLOCKS).join(', ')})`);
  });
  const typed = (id) => Object.hasOwn(BLOCKS, byId.get(id).node.type);
  const fieldsOf = (id) => {
    const def = BLOCKS[byId.get(id).node.type];
    return [...(def.trigger ? [] : ['gain']), ...Object.keys(def.params), ...(def.fields?.(byId.get(id).node) ?? [])];
  };

  const planned = new Map();
  for (const [id, { node, index }] of byId) {
    if (!typed(id)) continue;
    const def = BLOCKS[node.type];
    const at = (key) => `nodes[${index}].${key}`;
    const deps = new Set(), refs = [];
    const allowed = ['id', 'type', ...(def.trigger ? [] : ['gain', 'env']), ...Object.keys(def.params), ...(def.in ? ['in'] : []),
      ...(def.in === 'list' ? ['gains'] : []), ...(def.sync ? ['sync'] : []), ...(def.options ?? [])];
    for (const key of Object.keys(node)) if (!allowed.includes(key)) report(id, at(key), `unknown key for a ${node.type} node`);
    def.check?.(node, (key, message) => report(id, at(key), message));

    const nodeId = (value, key, pulse) => {
      if (typeof value !== 'string' || !byId.has(value)) { report(id, at(key), `"${value}" is not a node id`); return null; }
      if (pulse && typed(value) && byId.get(value).node.type !== 'pulse') { report(id, at(key), `"${value}" must be a pulse node`); return null; }
      deps.add(value);
      return value;
    };
    const exprs = {};
    for (const [key, fallback] of Object.entries({ ...(def.trigger ? {} : { gain: 1 }), ...def.params })) exprs[key] = parse(node[key] ?? fallback, id, at(key), refs);

    let input = null, gains = null;
    if (def.in === 'one') input = nodeId(node.in, 'in');
    if (def.in === 'list') {
      if (!Array.isArray(node.in) || node.in.length === 0) report(id, at('in'), 'must be a non-empty array of node ids');
      else input = node.in.map((v, j) => nodeId(v, `in[${j}]`));
      const list = node.gains ?? (Array.isArray(node.in) ? node.in.map(() => 1) : []);
      if (!Array.isArray(list) || (Array.isArray(node.in) && list.length !== node.in.length)) report(id, at('gains'), 'must be an array with one gain per input');
      else gains = list.map((g, j) => parse(g, id, at(`gains[${j}]`), refs));
    }
    const sync = node.sync === undefined ? null : nodeId(node.sync, 'sync', true);
    let env = null;
    if (node.env !== undefined) {
      if (!isObject(node.env) || node.env.trigger === undefined || node.env.decay === undefined || Object.keys(node.env).length !== 2) report(id, at('env'), 'must be { trigger: <pulse id>, decay: <seconds> }');
      else env = { trigger: nodeId(node.env.trigger, 'env.trigger', true), decay: parse(node.env.decay, id, at('env.decay'), refs) };
    }
    for (const { name, path, text } of refs) {
      const [other, field] = name.split('.');
      if (!byId.has(other)) report(id, path, `"${text}" reads "${name}", but "${other}" is not a node id`);
      else if (typed(other) && !fieldsOf(other).includes(field)) report(id, path, `"${text}" reads "${name}"; a ${byId.get(other).node.type} node has ${fieldsOf(other).join(', ')}`);
      else deps.add(other);
    }
    planned.set(id, { id, type: node.type, node, exprs, input, gains, sync, env, deps });
  }

  // Output and run order (dependencies first); a cycle is an error.
  const out = recipe.out ?? 'out';
  if (!byId.has(out)) report(null, 'out', recipe.out === undefined ? 'missing: name the output node in "out", or give one node the id "out"' : `"${out}" is not a node id`);
  const order = [], state = new Map(), stack = [];
  const visit = (n) => {
    if (state.get(n.id) === 'done') return;
    if (state.get(n.id) === 'open') {
      const cycle = [...stack.slice(stack.indexOf(n.id)), n.id];
      return report(n.id, `nodes[${byId.get(n.id).index}]`, `cycle: ${cycle.join(' -> ')}`);
    }
    state.set(n.id, 'open');
    stack.push(n.id);
    for (const d of n.deps) if (planned.has(d)) visit(planned.get(d));
    stack.pop();
    state.set(n.id, 'done');
    order.push(n);
  };
  planned.forEach((n) => visit(n));

  if (errors.length) return { errors, plan: null };
  return { errors, plan: { seed: recipe.seed, inputs, params, nodes: order, out } };
}
