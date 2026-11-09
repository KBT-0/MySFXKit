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

/**
 * Why a press of an event button must not reach the player, or null when it may: before the
 * first Play there is no player, and while the `AudioContext` is not `running` (after Stop) the
 * event would wait and sound on the next Play.
 */
export function eventPressBlocked(hasPlayer, contextState) {
  if (!hasPlayer) return 'Press Play first, then fire the event.';
  if (contextState !== 'running') return 'The sound is stopped: press Play, then fire the event.';
  return null;
}
