import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const baseUrl = process.env.DAILY_DISPATCH_GATE_URL ?? 'http://127.0.0.1:5192';
const runDir = resolve(
  'pipeline/runs/run-07-2026-05-29-t11-storytelling-counterparts',
);
const screenshotPath = resolve(runDir, 'runtime-gate-story-continuation.png');
const chromeExecutable =
  process.env.CHROME_EXECUTABLE ??
  'C:/Program Files/Google/Chrome/Application/chrome.exe';
const cdpPort = Number(process.env.DAILY_DISPATCH_CDP_PORT ?? 59311);
const userDataDir = resolve(runDir, '.chrome-runtime-gate');

async function waitFor(page, fn, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await page.evaluate(fn);
    if (value) return value;
    await page.waitForTimeout(100);
  }
  throw new Error('Timed out waiting for browser runtime condition.');
}

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

async function evaluate(cdp, sessionId, expression, timeout = 60000) {
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
  await mkdir(dirname(screenshotPath), { recursive: true });
  await rm(userDataDir, { recursive: true, force: true });

  const consoleMessages = [];
  const requestFailures = [];
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

    cdp.onEvent(async (message) => {
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
          url: message.params.requestId,
          failure: message.params.errorText,
        });
      }
      if (message.method === 'Fetch.requestPaused') {
        const url = message.params.request.url;
        const marker = '/data/';
        const markerIndex = url.indexOf(marker);
        if (markerIndex >= 0) {
          const relativePath = url.slice(markerIndex + marker.length);
          const localResponse = await fetch(`${baseUrl}/${relativePath}`);
          if (localResponse.ok) {
            const body = Buffer.from(await localResponse.arrayBuffer()).toString(
              'base64',
            );
            await cdp.send(
              'Fetch.fulfillRequest',
              {
                requestId: message.params.requestId,
                responseCode: localResponse.status,
                responseHeaders: [
                  {
                    name: 'content-type',
                    value:
                      localResponse.headers.get('content-type') ??
                      'application/octet-stream',
                  },
                ],
                body,
              },
              sessionId,
            );
            return;
          }
        }
        await cdp.send(
          'Fetch.continueRequest',
          { requestId: message.params.requestId },
          sessionId,
        );
      }
    });

    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send(
      'Fetch.enable',
      { patterns: [{ urlPattern: 'https://media.dev.wolf.games/*' }] },
      sessionId,
    );
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    }, sessionId);
    await cdp.send(
      'Page.navigate',
      { url: `${baseUrl}/?screen=game&t11=cdp` },
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
          throw new Error('Timed out waiting for Daily Dispatch runtime gate condition');
        };
        const debug = await waitFor(() => window.__dailyDispatchDebug);
        await waitFor(() => {
          const snapshot = debug.getSnapshot?.();
          return snapshot?.resources?.levelSeed === 42001 ? snapshot : null;
        });
        await debug.continueStory();
        await debug.continueStory();
        const before = await waitFor(() => {
          const snapshot = debug.getSnapshot?.();
          return snapshot?.resources?.levelSeed === 42001 &&
            snapshot?.resources?.storyPhase === 'playing'
            ? snapshot
            : null;
        });
        const swipes = [
          ['block_cyan', 'up'],
          ['block_pink', 'down'],
          ['block_pink', 'left'],
          ['block_cyan', 'down'],
          ['block_cyan', 'left'],
          ['block_pink', 'up'],
        ];
        for (const [uid, direction] of swipes) {
          await debug.executeSwipe(uid, direction);
        }
        const completion = await waitFor(() => {
          const snapshot = debug.getSnapshot?.();
          const completionState = debug.getCompletionState?.();
          return snapshot?.resources?.levelPhase === 'complete' && completionState?.canContinue
            ? {
                snapshot,
                audioCueCounts: debug.getAudioCueCounts?.(),
                completionState,
                storyState: debug.getStoryState?.(),
                canvasCount: document.querySelectorAll('canvas').length,
                visibleText: document.body.innerText,
              }
            : null;
        });
        return { before, completion };
      })()`,
    );

    const captured = await cdp.send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true },
      sessionId,
    );
    await writeFile(screenshotPath, Buffer.from(captured.data, 'base64'));

    const advanceResult = await evaluate(
      cdp,
      sessionId,
      `(async () => {
        const waitFor = async (predicate, timeoutMs = 30000) => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const value = predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('Timed out waiting for next story beat');
        };
        const debug = window.__dailyDispatchDebug;
        const advance = await debug.continueCompletion();
        const nextBeat = await waitFor(() => {
          const snapshot = debug.getSnapshot?.();
          return snapshot?.resources?.levelSeed === 42002 ? snapshot : null;
        });
        return { advance, nextBeat };
      })()`,
    );

    const consoleErrors = consoleMessages.filter(
      (message) => message.type === 'error',
    );

    console.log(
      JSON.stringify(
        {
          before: {
            levelUid: result.before.resources.levelUid,
            seed: result.before.resources.levelSeed,
            storyPhase: result.before.resources.storyPhase,
            introText: result.before.resources.storyIntroText,
            chapterStartText: result.before.resources.storyChapterStartText,
          },
          completion: {
            levelUid: result.completion.snapshot.resources.levelUid,
            seed: result.completion.snapshot.resources.levelSeed,
            moveCount: result.completion.snapshot.resources.moveCount,
            levelPhase: result.completion.snapshot.resources.levelPhase,
            storyPhase: result.completion.snapshot.resources.storyPhase,
            clueText: result.completion.snapshot.resources.currentClueText,
          },
          advance: {
            kind: advanceResult.advance?.advance.kind,
            nextLevelUid: advanceResult.nextBeat.resources.levelUid,
            nextSeed: advanceResult.nextBeat.resources.levelSeed,
            nextStoryPhase: advanceResult.nextBeat.resources.storyPhase,
          },
          audioCueCounts: result.completion.audioCueCounts,
          completionState: result.completion.completionState,
          canvasCount: result.completion.canvasCount,
          consoleErrors: consoleErrors.map((message) => message.text),
          requestFailures,
          screenshotPath,
        },
        null,
        2,
      ),
    );
    cdp.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

