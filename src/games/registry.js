import UnoGame from './uno/UnoGame.jsx';
import GuessWhoGame from './guesswho/GuessWhoGame.jsx';
import TicTacToeGame from './tictactoe/TicTacToeGame.jsx';
import GlassBridgeGame from './glass-bridge/GlassBridgeGame.jsx';
import ChessGame from './chess/ChessGame.jsx';
import SketchGame from './sketch/SketchGame.jsx';

/**
 * Add future games here, keyed by the same `id` the backend registers in
 * src/games/registry.js. The GamesDrawer hub renders whatever the backend
 * reports via GET /api/games, and only enables the ones that have a
 * matching entry here.
 */
export const GAME_COMPONENTS = {
  uno: UnoGame,
  guesswho: GuessWhoGame,
  tictactoe: TicTacToeGame,
  'glass-bridge': GlassBridgeGame,
  chess: ChessGame,
  sketch: SketchGame,
};
