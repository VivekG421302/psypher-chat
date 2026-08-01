import UnoGame from './uno/UnoGame.jsx';
import GuessWhoGame from './guesswho/GuessWhoGame.jsx';

/**
 * Add future games here, keyed by the same `id` the backend registers in
 * src/games/registry.js. The GamesDrawer hub renders whatever the backend
 * reports via GET /api/games, and only enables the ones that have a
 * matching entry here.
 */
export const GAME_COMPONENTS = {
  uno: UnoGame,
  guesswho: GuessWhoGame,
};
