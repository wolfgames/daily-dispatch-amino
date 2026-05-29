import { chromium } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const baseUrl = process.env.DAILY_DISPATCH_GATE_URL ?? 'http://127.0.0.1:59280';
const runDir = resolve(
  'pipeline/runs/run-08-2026-05-29-t12-progress-services-analytics',
);
const screenshotPath = resolve(runDir, 'runtime-gate-progress-reload.png');
const resultPath = resolve(runDir, 'runtime-gate-result.json');
const userDataDir = resolve(tmpdir(), 'daily-dispatch-t12-playwright-profile');
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

async function main() {
  await mkdir(dirname(screenshotPath), { recursive: true });
  await rm(userDataDir, { recursive: true, force: true });

  const consoleMessages = [];
  const requestFailures = [];
  const browser = await chromium.launchPersistentContext(userDataDir, {
    executablePath: chromeExecutable,
    headless: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  const page = browser.pages()[0] ?? (await browser.newPage());

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
    let localResponse;
    try {
      localResponse = await fetch(`${baseUrl}/${relativePath}`);
    } catch {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
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
    await page.goto(`${baseUrl}/?screen=game&t12=playwright`, {
      waitUntil: 'domcontentloaded',
    });

    const firstRun = await page.evaluate(async () => {
      const waitFor = async (predicate, timeoutMs = 45000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          const value = predicate();
          if (value) return value;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('Timed out waiting for Daily Dispatch runtime condition');
      };
      const debug = await waitFor(() => window.__dailyDispatchDebug);
      const levelOne = await waitFor(() => {
        const snapshot = debug.getSnapshot?.();
        return snapshot?.resources?.levelSeed === 42001 ? snapshot : null;
      });
      await debug.continueStory();
      await debug.continueStory();
      await debug.loadGeneratedLevel(0, 1, {
        storyPhase: 'playing',
        levelPhase: 'playing',
      });
      const levelTwo = await waitFor(() => {
        const snapshot = debug.getSnapshot?.();
        return snapshot?.resources?.levelSeed === 42002 ? snapshot : null;
      });
      return {
        levelOne,
        levelTwo,
        progressKeys: debug.getProgressKeys?.(),
        analyticsEvents: debug.getAnalyticsEvents?.(),
        analyticsCounts: debug.getAnalyticsEventCounts?.(),
        canvasCount: document.querySelectorAll('canvas').length,
      };
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    const reload = await page.evaluate(async () => {
      const waitFor = async (predicate, timeoutMs = 45000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          const value = predicate();
          if (value) return value;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('Timed out waiting for Daily Dispatch reload condition');
      };
      const debug = await waitFor(() => window.__dailyDispatchDebug);
      const snapshot = await waitFor(() => {
        const value = debug.getSnapshot?.();
        return value?.resources?.levelSeed === 42002 ? value : null;
      });
      return {
        snapshot,
        progressKeys: debug.getProgressKeys?.(),
        analyticsEvents: debug.getAnalyticsEvents?.(),
        analyticsCounts: debug.getAnalyticsEventCounts?.(),
        canvasCount: document.querySelectorAll('canvas').length,
      };
    });

    await page.screenshot({ path: screenshotPath, fullPage: true });

    const emittedNames = [
      ...(firstRun.analyticsEvents ?? []).map((event) => event.name),
      ...(reload.analyticsEvents ?? []).map((event) => event.name),
    ];
    const summary = {
      firstRun: {
        levelOneSeed: firstRun.levelOne.resources.levelSeed,
        levelTwoSeed: firstRun.levelTwo.resources.levelSeed,
        progressKeys: firstRun.progressKeys,
        analyticsCounts: firstRun.analyticsCounts,
        analyticsEventNames: firstRun.analyticsEvents.map((event) => event.name),
        canvasCount: firstRun.canvasCount,
      },
      reload: {
        seed: reload.snapshot.resources.levelSeed,
        chapterUid: reload.snapshot.resources.chapterUid,
        levelNumber: reload.snapshot.resources.levelNumber,
        storyPhase: reload.snapshot.resources.storyPhase,
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
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
