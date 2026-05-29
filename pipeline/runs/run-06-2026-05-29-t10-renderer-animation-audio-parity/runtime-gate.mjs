import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const baseUrl = 'http://127.0.0.1:5192';
const runDir = resolve(
  'pipeline/runs/run-06-2026-05-29-t10-renderer-animation-audio-parity',
);
const screenshotPath = resolve(runDir, 'runtime-gate-complete.png');

async function waitFor(page, fn, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await page.evaluate(fn);
    if (value) return value;
    await page.waitForTimeout(100);
  }
  throw new Error('Timed out waiting for browser runtime condition.');
}

async function main() {
  await mkdir(dirname(screenshotPath), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });

  await context.route('https://media.dev.wolf.games/games/**/data/**', async (route) => {
    const url = route.request().url();
    if (!url.startsWith('https://media.dev.wolf.games/')) {
      await route.continue();
      return;
    }

    const marker = '/data/';
    const markerIndex = url.indexOf(marker);
    const relativePath = markerIndex >= 0 ? url.slice(markerIndex + marker.length) : '';
    const localResponse = await context.request.get(`${baseUrl}/${relativePath}`);
    if (localResponse.ok()) {
      await route.fulfill({ response: localResponse });
      return;
    }

    await route.continue();
  });

  const page = await context.newPage();
  const consoleMessages = [];
  page.on('console', (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
    });
  });
  await page.goto(`${baseUrl}/?screen=game`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await waitFor(page, () => Boolean(window.__dailyDispatchDebug?.getSnapshot?.()));

  const before = await page.evaluate(() => window.__dailyDispatchDebug.getSnapshot());
  const swipes = [
    ['block_cyan', 'up'],
    ['block_pink', 'down'],
    ['block_pink', 'left'],
    ['block_cyan', 'down'],
    ['block_cyan', 'left'],
    ['block_pink', 'up'],
  ];

  for (const [blockUid, direction] of swipes) {
    await page.evaluate(
      ([uid, dir]) => window.__dailyDispatchDebug.executeSwipe(uid, dir),
      [blockUid, direction],
    );
  }

  const after = await waitFor(
    page,
    () => {
      const debug = window.__dailyDispatchDebug;
      const snapshot = debug?.getSnapshot?.();
      return snapshot?.resources.levelPhase === 'complete'
        ? {
            snapshot,
            audioCueCounts: debug.getAudioCueCounts(),
            completionState: debug.getCompletionState(),
            audioLoadError: debug.getLastAudioLoadError(),
            canvasCount: document.querySelectorAll('canvas').length,
          }
        : null;
    },
    30000,
  );

  await page.waitForTimeout(900);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const advance = await page.evaluate(() =>
    window.__dailyDispatchDebug.advanceAfterCompletion(),
  );
  const consoleErrors = consoleMessages.filter((message) => message.type === 'error');

  await browser.close();

  console.log(
    JSON.stringify(
      {
        before: {
          levelUid: before.resources.levelUid,
          seed: before.resources.levelSeed,
          moveCount: before.resources.moveCount,
          remainingBlocks: before.resources.remainingBlocks,
          optimalMoves: before.resources.optimalMoves,
        },
        after: {
          levelUid: after.snapshot.resources.levelUid,
          seed: after.snapshot.resources.levelSeed,
          moveCount: after.snapshot.resources.moveCount,
          remainingBlocks: after.snapshot.resources.remainingBlocks,
          openDocks: after.snapshot.resources.openDocks,
          levelPhase: after.snapshot.resources.levelPhase,
        },
        advance: {
          kind: advance.advance.kind,
          nextLevelUid: advance.snapshot?.resources.levelUid,
          nextSeed: advance.snapshot?.resources.levelSeed,
          nextMoveCount: advance.snapshot?.resources.moveCount,
        },
        audioCueCounts: after.audioCueCounts,
        completionState: after.completionState,
        audioLoadError: after.audioLoadError,
        canvasCount: after.canvasCount,
        consoleErrors: consoleErrors.map((message) => message.text),
        screenshotPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
