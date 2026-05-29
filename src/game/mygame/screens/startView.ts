/**
 * Daily Dispatch start screen.
 *
 * Called by screens/StartScreen.tsx — the bridge between Solid.js and your start screen.
 *
 * In DOM mode: the Play button loads core + audio bundles, then navigates.
 * In Pixi mode: you can also call initGpu() here to set up the GPU early,
 * then build your start screen scene graph with PixiJS.
 */

import type {
  StartScreenDeps,
  StartScreenController,
  SetupStartScreen,
} from '~/game/mygame-contract';
import { GAME_FONT_FAMILY, GAME_TITLE } from '~/game/config';
import {
  getLegacyStartState,
  loadLegacyProgress,
  markHasPlayed,
} from '../services/legacy-progress-adapter';
import {
  createGameStartEvent,
  createLegacyAnalyticsAdapter,
} from '../services/legacy-analytics-adapter';

export const setupStartScreen: SetupStartScreen = (deps: StartScreenDeps): StartScreenController => {
  let wrapper: HTMLDivElement | null = null;
  const analyticsAdapter = createLegacyAnalyticsAdapter(deps.analytics);

  return {
    backgroundColor: '#4A3728',

    init(container: HTMLDivElement) {
      const startState = getLegacyStartState();
      const progress = loadLegacyProgress();
      wrapper = document.createElement('div');
      wrapper.style.cssText =
        'box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'height:100%;gap:20px;padding:32px;text-align:center;color:#fff7df;';

      const title = document.createElement('h1');
      title.textContent = GAME_TITLE;
      title.style.cssText =
        `font-size:3rem;font-weight:800;letter-spacing:0.02em;margin:0;font-family:${GAME_FONT_FAMILY};`;

      const subtitle = document.createElement('p');
      subtitle.textContent = 'Keep your town moving, one warehouse dispatch at a time.';
      subtitle.style.cssText =
        `max-width:320px;font-size:1.05rem;line-height:1.45;margin:0;color:#f4d8a8;font-family:${GAME_FONT_FAMILY};`;

      const martyLine = document.createElement('p');
      martyLine.textContent =
        startState.mode === 'returning'
          ? `Marty saved ${startState.countyName}, level ${startState.currentLevel} of ${startState.totalLevels}.`
          : 'Marty has the first chapter manifest ready.';
      martyLine.style.cssText =
        `max-width:320px;font-size:0.95rem;line-height:1.4;margin:0;color:#d9c09a;font-family:${GAME_FONT_FAMILY};`;

      const playBtn = document.createElement('button');
      playBtn.textContent = startState.label;
      playBtn.style.cssText =
        `font-size:1.15rem;font-weight:700;padding:14px 36px;border:none;border-radius:12px;` +
        `background:#d86f2a;color:#fff;cursor:pointer;font-family:${GAME_FONT_FAMILY};` +
        'box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.1s,box-shadow 0.1s;';
      playBtn.onmouseenter = () => { playBtn.style.transform = 'scale(1.05)'; };
      playBtn.onmouseleave = () => { playBtn.style.transform = 'scale(1)'; };

      playBtn.addEventListener('click', async () => {
        playBtn.disabled = true;
        playBtn.textContent = 'Opening manifest...';
        await deps.initGpu();
        deps.unlockAudio();
        await deps.loadCore();
        try { await deps.loadAudio(); } catch { /* audio optional */ }
        markHasPlayed();
        analyticsAdapter.trackGameStart(
          createGameStartEvent({
            startSource: startState.mode === 'new' ? 'new_game' : 'continue',
            isReturningPlayer: startState.isReturningPlayer,
            chapterId: progress.current?.chapterId,
            chapterCount:
              progress.current?.catalogIndex != null
                ? progress.current.catalogIndex + 1
                : 1,
            countyTheme: progress.current?.countyName ?? startState.countyName,
          }),
        );
        deps.goto('game');
      }, { once: true });

      wrapper.append(title, subtitle, martyLine, playBtn);
      container.append(wrapper);
    },

    destroy() {
      wrapper?.remove();
      wrapper = null;
    },
  };
}
