export { gameConfig, type GameConfig, type GameData } from './config';
export { gameState, type GameState } from './state';
import { CHAPTER_CATALOG_PATH } from './mygame/data/chapters';
import { GAME_SLUG, GAME_TITLE, type GameData } from './config';

export const defaultGameData: GameData = {
  uid: GAME_SLUG,
  slug: GAME_SLUG,
  name: GAME_TITLE,
  chapterCatalogPath: CHAPTER_CATALOG_PATH,
};
