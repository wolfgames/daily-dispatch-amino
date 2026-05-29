import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

const baseUrl = process.env.DAILY_DISPATCH_GATE_URL ?? 'http://127.0.0.1:5195';
const runDir = resolve(
  'pipeline/runs/run-10-2026-05-29-t14-full-chapter-parity-polish',
);
const resultPath = resolve(runDir, 'runtime-gate-result.json');
const screenshotPath = resolve(runDir, 'runtime-gate-chapter-10.png');
const chromeExecutable =
  process.env.CHROME_EXECUTABLE ??
  'C:/Program Files/Google/Chrome/Application/chrome.exe';
const cdpPort = Number(process.env.DAILY_DISPATCH_CDP_PORT ?? 59414);
const userDataDir = resolve(
  tmpdir(),
  `daily-dispatch-t14-cdp-profile-${process.pid}`,
);

async function waitForJson(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createCdpClient(wsUrl) {
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  const ws = new WebSocket(wsUrl);

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const { resolve: resolvePending, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolvePending(message.result);
      return;
    }
    for (const listener of listeners) listener(message);
  });

  const open = new Promise((resolveOpen, rejectOpen) => {
    ws.addEventListener('open', resolveOpen, { once: true });
    ws.addEventListener('error', rejectOpen, { once: true });
  });

  return {
    async send(method, params = {}, sessionId) {
      await open;
      const messageId = ++id;
      const payload = { id: messageId, method, params };
      if (sessionId) payload.sessionId = sessionId;
      const response = new Promise((resolveResponse, rejectResponse) => {
        pending.set(messageId, {
          resolve: resolveResponse,
          reject: rejectResponse,
        });
      });
      ws.send(JSON.stringify(payload));
      return response;
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(cdp, sessionId, expression, timeout = 90000) {
  const result = await cdp.send(
    'Runtime.evaluate',
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
      timeout,
    },
    sessionId,
  );
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

async function main() {
  await mkdir(dirname(resultPath), { recursive: true });
  await rm(userDataDir, { recursive: true, force: true });

  const consoleMessages = [];
  const requestFailures = [];
  const badResponses = [];
  const mediaRequests = [];
  const chrome = spawn(
    chromeExecutable,
    [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--autoplay-policy=no-user-gesture-required',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let cdp;
  try {
    const version = await waitForJson(
      `http://127.0.0.1:${cdpPort}/json/version`,
    );
    cdp = createCdpClient(version.webSocketDebuggerUrl);
    const target = await cdp.send('Target.createTarget', {
      url: 'about:blank',
    });
    const attached = await cdp.send('Target.attachToTarget', {
      targetId: target.targetId,
      flatten: true,
    });
    const sessionId = attached.sessionId;

    cdp.onEvent((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === 'Runtime.consoleAPICalled') {
        consoleMessages.push({
          type: message.params.type,
          text: message.params.args
            .map((arg) => arg.value ?? arg.description ?? '')
            .join(' '),
        });
      }
      if (message.method === 'Network.loadingFailed') {
        requestFailures.push({
          requestId: message.params.requestId,
          failure: message.params.errorText,
        });
      }
      if (message.method === 'Network.requestWillBeSent') {
        const url = message.params.request.url;
        if (/media\..*wolf\.games/.test(new URL(url).host)) {
          mediaRequests.push(url);
        }
      }
      if (message.method === 'Network.responseReceived') {
        const { response } = message.params;
        if (response.status >= 400 && !response.url.endsWith('/favicon.ico')) {
          badResponses.push({ url: response.url, status: response.status });
        }
      }
    });

    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      },
      sessionId,
    );
    await cdp.send(
      'Page.navigate',
      { url: `${baseUrl}/?screen=game&t14=cdp-smoke` },
      sessionId,
    );

    const result = await evaluate(
      cdp,
      sessionId,
      `(async () => {
        const waitFor = async (predicate, timeoutMs = 45000) => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const value = predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('Timed out waiting for Daily Dispatch runtime gate.');
        };
        const debug = await waitFor(() => window.__dailyDispatchDebug);
        const initial = await waitFor(() => {
          const snapshot = debug.getSnapshot?.();
          return snapshot?.resources?.levelSeed === 42001 ? snapshot : null;
        });
        await debug.continueStory();
        await debug.continueStory();
        const playing = await waitFor(() => {
          const snapshot = debug.getSnapshot?.();
          return snapshot?.resources?.storyPhase === 'playing' ? snapshot : null;
        });
        for (const [blockUid, direction] of [
          ['block_cyan', 'up'],
          ['block_pink', 'down'],
          ['block_pink', 'left'],
          ['block_cyan', 'down'],
          ['block_cyan', 'left'],
          ['block_pink', 'up'],
        ]) {
          await debug.executeSwipe(blockUid, direction);
        }
        const completed = await waitFor(() => {
          const snapshot = debug.getSnapshot?.();
          const completion = debug.getCompletionState?.();
          return snapshot?.resources?.levelPhase === 'complete' && completion?.canContinue
            ? { snapshot, completion }
            : null;
        });
        const continued = await debug.continueCompletion();
        const nextLevel = await waitFor(() => {
          const snapshot = debug.getSnapshot?.();
          return snapshot?.resources?.levelSeed === 42002 ? snapshot : null;
        });
        const laterChapter = await debug.loadGeneratedLevel(9, 0, {
          storyPhase: 'chapter-start',
          levelPhase: 'playing',
        });
        return {
          initial: {
            chapterUid: initial.resources.chapterUid,
            levelUid: initial.resources.levelUid,
            seed: initial.resources.levelSeed,
            storyPhase: initial.resources.storyPhase,
            introText: initial.resources.storyIntroText,
          },
          playing: {
            storyPhase: playing.resources.storyPhase,
            chapterStartText: playing.resources.storyChapterStartText,
          },
          completed: {
            levelUid: completed.snapshot.resources.levelUid,
            seed: completed.snapshot.resources.levelSeed,
            moveCount: completed.snapshot.resources.moveCount,
            levelPhase: completed.snapshot.resources.levelPhase,
            audioCueCounts: debug.getAudioCueCounts?.(),
            completionState: completed.completion,
          },
          nextLevel: {
            advanceKind: continued?.advance?.kind,
            levelUid: nextLevel.resources.levelUid,
            seed: nextLevel.resources.levelSeed,
            storyPhase: nextLevel.resources.storyPhase,
          },
          laterChapter: {
            chapterUid: laterChapter?.resources.chapterUid,
            levelUid: laterChapter?.resources.levelUid,
            seed: laterChapter?.resources.levelSeed,
            levelCount: laterChapter?.resources.levelCount,
            storyPhase: laterChapter?.resources.storyPhase,
            chapterStartText: laterChapter?.resources.storyChapterStartText,
            completionText: laterChapter?.resources.storyCompletionText,
          },
          progressKeys: debug.getProgressKeys?.(),
          analyticsCounts: debug.getAnalyticsEventCounts?.(),
          canvasCount: document.querySelectorAll('canvas').length,
        };
      })()`,
    );

    const captured = await cdp.send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true },
      sessionId,
    );
    await writeFile(screenshotPath, Buffer.from(captured.data, 'base64'));

    const summary = {
      ...result,
      consoleErrors: consoleMessages
        .filter((message) => message.type === 'error')
        .map((message) => message.text),
      requestFailures,
      badResponses,
      mediaRequests,
      screenshotPath,
    };

    if (summary.canvasCount !== 1) {
      throw new Error(`Expected one Pixi canvas, got ${summary.canvasCount}`);
    }
    if (summary.completed.moveCount !== 6) {
      throw new Error('Expected seed 42001 to complete in 6 moves.');
    }
    if (summary.nextLevel.seed !== 42002) {
      throw new Error('Expected story continuation to load seed 42002.');
    }
    if (summary.laterChapter.chapterUid !== 'dispatch-chapter-10') {
      throw new Error('Expected later chapter load to reach chapter 10.');
    }
    if (summary.consoleErrors.length > 0) {
      throw new Error(`Console errors: ${summary.consoleErrors.join('\\n')}`);
    }
    if (requestFailures.length > 0 || badResponses.length > 0) {
      throw new Error('Browser request failures detected.');
    }
    if (mediaRequests.length > 0) {
      throw new Error('Unexpected remote media requests detected.');
    }

    await writeFile(resultPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    cdp.close();
  } finally {
    chrome.kill();
    try {
      await rm(userDataDir, { recursive: true, force: true });
    } catch {
      // Chrome can release its profile lock a moment after process shutdown.
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
