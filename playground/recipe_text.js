// Turns pasted text (often an LLM reply) into a parsed recipe object. Pure functions, no DOM.
// The text is data: it is only scanned and handed to JSON.parse, never run.

/** The longest input accepted, in characters (about 200 KB). */
export const MAX_RECIPE_TEXT = 200 * 1024;

/**
 * Finds the first balanced `{ ... }` block in `input`, skipping braces inside JSON string
 * literals, so a recipe wrapped in Markdown fences or in prose is found.
 * Returns `{ text }` or `{ error }`.
 */
export function extractRecipeText(input) {
  if (input.length > MAX_RECIPE_TEXT) {
    return { error: `the text is ${input.length} characters; at most ${MAX_RECIPE_TEXT} are accepted` };
  }
  const start = input.indexOf('{');
  if (start < 0) return { error: input.trim() ? 'no { ... } block found in the text' : 'paste a recipe first' };
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < input.length; i++) {
    const c = input[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return { text: input.slice(start, i + 1) };
  }
  return { error: 'the { ... } block is not closed: a } is missing or a string is not terminated' };
}

/** Extracts the first `{ ... }` block and parses it as JSON. Returns `{ recipe }` or `{ error }`. */
export function parseRecipeText(input) {
  const { text, error } = extractRecipeText(input);
  if (error) return { error };
  try {
    return { recipe: JSON.parse(text) };
  } catch (parseError) {
    return { error: `not valid JSON: ${parseError.message}` };
  }
}
