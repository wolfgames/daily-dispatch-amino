import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const baseUrl = process.env.DAILY_DISPATCH_GATE_URL ?? 'http://127.0.0.1:59280';
const runDir = resolve(
  'pipeline/runs/run-08-2026-05-29-t12-progress-services-analytics',
);
const resultPath = resolve(runDir, 'orchestrator-runtime-gate-result.json');
const screenshotPath = resolve(runDir, 'orchestrator-runtime-gate-progress-reload.png');
const chromeExecutable =
  process.env.CHROME_EXECUTABLE ??
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

const staleNames = [
  'level_restart',
  'level_fail',
  'chapter_fail',
  'cutscene_show',
  'cutscene_skip',
  'cutscene_complete',
  'cutscene_interact',
  'story_link_click',
  'landmark_connected',
  'blockMoved',
  'block_moved',
];

async function waitFor(page, predicateSource, timeoutMs = 45000) {
  return page.evaluate(
    async ({ source, timeout }) => {
      const predicate = new Function(`return (${source})`)();
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const value = predicate();
        if (value) return value;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error('Timed out waiting for Daily Dispatch runtime condition');
    },
    { source: predicateSource, timeout: timeoutMs },
  );
}

async function main() {
  await mkdir(dirname(resultPath), { recursive: true });
  console.log('launching chrome');
  const browser = await chromium.launch({
    executablePath: chromeExecutable,
    headless: true,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  console.log('chrome launched');

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();
  const consoleMessages = [];
  const requestFailures = [];

  page.on('console', (message) => {
    consoleMessages.push({ type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => {
    consoleMessages.push({ type: 'error', text: error.message });
  });
  page.on('requestfailed', (request) => {
    requestFailures.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? 'unknown',
    });
  });

  await page.route('**/favicon.ico', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
  await page.route('https://media.dev.wolf.games/**', async (route) => {
    const url = route.request().url();
    const marker = '/data/';
    const markerIndex = url.indexOf(marker);
    if (markerIndex < 0) {
      await route.continue();
      return;
    }
    const relativePath = url.slice(markerIndex + marker.length);
    const localResponse = await fetch(`${baseUrl}/${relativePath}`);
    if (!localResponse.ok) {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: localResponse.status,
      headers: {
        'content-type':
          localResponse.headers.get('content-type') ?? 'application/octet-stream',
      },
      body: Buffer.from(await localResponse.arrayBuffer()),
    });
  });

  try {
    console.log('loading first run');
    await page.goto(`${baseUrl}/?screen=game&t12=orchestrator`, {
      waitUntil: 'domcontentloaded',
    });
    await waitFor(page, "() => window.__dailyDispatchDebug");
    const levelOne = await waitFor(
      page,
      "() => { const snapshot = window.__dailyDispatchDebug?.getSnapshot?.(); return snapshot?.resources?.levelSeed === 42001 ? snapshot : null; }",
    );
    await page.evaluate(async () => {
      await window.__dailyDispatchDebug.continueStory();
      await window.__dailyDispatchDebug.continueStory();
      await window.__dailyDispatchDebug.loadGeneratedLevel(0, 1, {
        storyPhase: 'playing',
        levelPhase: 'playing',
      });
    });
    const levelTwo = await waitFor(
      page,
      "() => { const snapshot = window.__dailyDispatchDebug?.getSnapshot?.(); return snapshot?.resources?.levelSeed === 42002 ? snapshot : null; }",
    );
    const firstRun = await page.evaluate(() => ({
      progressKeys: window.__dailyDispatchDebug.getProgressKeys(),
      analyticsEvents: window.__dailyDispatchDebug.getAnalyticsEvents(),
      analyticsCounts: window.__dailyDispatchDebug.getAnalyticsEventCounts(),
      canvasCount: document.querySelectorAll('canvas').length,
    }));

    console.log('reloading');
    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloadSnapshot = await waitFor(
      page,
      "() => { const snapshot = window.__dailyDispatchDebug?.getSnapshot?.(); return snapshot?.resources?.levelSeed === 42002 ? snapshot : null; }",
    );
    const reload = await page.evaluate(() => ({
      progressKeys: window.__dailyDispatchDebug.getProgressKeys(),
      analyticsEvents: window.__dailyDispatchDebug.getAnalyticsEvents(),
      analyticsCounts: window.__dailyDispatchDebug.getAnalyticsEventCounts(),
      canvasCount: document.querySelectorAll('canvas').length,
    }));

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const emittedNames = [
      ...firstRun.analyticsEvents.map((event) => event.name),
      ...reload.analyticsEvents.map((event) => event.name),
    ];
    const summary = {
      firstRun: {
        levelOneSeed: levelOne.resources.levelSeed,
        levelTwoSeed: levelTwo.resources.levelSeed,
        progressKeys: firstRun.progressKeys,
        analyticsCounts: firstRun.analyticsCounts,
        analyticsEventNames: firstRun.analyticsEvents.map((event) => event.name),
        canvasCount: firstRun.canvasCount,
      },
      reload: {
        seed: reloadSnapshot.resources.levelSeed,
        chapterUid: reloadSnapshot.resources.chapterUid,
        levelNumber: reloadSnapshot.resources.levelNumber,
        storyPhase: reloadSnapshot.resources.storyPhase,
        progressKeys: reload.progressKeys,
        analyticsCounts: reload.analyticsCounts,
        analyticsEventNames: reload.analyticsEvents.map((event) => event.name),
        canvasCount: reload.canvasCount,
      },
      staleEmitted: emittedNames.filter((name) => staleNames.includes(name)),
      consoleErrors: consoleMessages
        .filter((message) => message.type === 'error')
        .map((message) => message.text),
      requestFailures,
      screenshotPath,
    };
    await writeFile(resultPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
