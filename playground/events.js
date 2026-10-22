// The game events of a recipe: its `trigger` nodes, for the playground's event buttons.

/**
 * Lists the game events of a recipe that passed `validateRecipe`: one `{ id, range: [lo, hi] }`
 * per `trigger` node, in node order; `range` defaults to [0, 1] as in core.
 */
export function listEvents(recipe) {
  return recipe.nodes
    .filter((node) => node.type === 'trigger')
    .map(({ id, range = [0, 1] }) => ({ id, range: [range[0], range[1]] }));
}
