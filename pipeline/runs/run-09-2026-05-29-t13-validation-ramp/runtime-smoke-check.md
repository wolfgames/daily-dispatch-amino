# T13 Runtime Smoke Check

Purpose: repeat the lightweight runtime gates without masking local asset failures. This check must run against the target repo's local `public/` assets and must fail if the browser requests `media.*.wolf.games`.

## Setup

```powershell
bun run dev -- --host 127.0.0.1 --port <free-port>
```

Open:

```text
http://127.0.0.1:<free-port>/?screen=game&t13=runtime-smoke
```

Before interacting, collect browser console errors and network failures. Do not add a Playwright route, request interception, or CDN rewrite. Remote requests whose host matches `media.*.wolf.games` are a failure for T13.

## Browser Assertions

Use the runtime debug bridge exposed by the game screen:

```javascript
const debug = window.__dailyDispatchDebug;
if (!debug) throw new Error('Daily Dispatch debug bridge missing');
const snapshot = debug.getSnapshot();
if (!snapshot) throw new Error('Daily Dispatch ECS snapshot missing');
if (document.querySelectorAll('canvas').length !== 1) throw new Error('Expected exactly one Pixi canvas');
if (snapshot.resources.levelSeed !== 42001) throw new Error(`Expected first seed 42001, got ${snapshot.resources.levelSeed}`);
```

## First Interaction And Level Completion

Run the seed `42001` first-level completion path through the public debug command boundary:

```javascript
await debug.continueStory();
await debug.continueStory();
for (const move of [
  ['block_cyan', 'up'],
  ['block_pink', 'down'],
  ['block_pink', 'left'],
  ['block_cyan', 'down'],
  ['block_cyan', 'left'],
  ['block_pink', 'up'],
]) {
  await debug.executeSwipe(move[0], move[1]);
}
const completed = debug.getSnapshot();
if (completed.resources.levelPhase !== 'complete') throw new Error('Level did not complete');
if (completed.resources.moveCount !== 6) throw new Error(`Expected 6 moves, got ${completed.resources.moveCount}`);
```

Expected behavior:

- `storyPhase` advances from `introduction` to `chapter-start` to `playing`.
- First swipe produces movement and increments `moveCount`.
- The full path exits `block_cyan` and `block_pink`, closes matching docks, and reaches `levelPhase: complete`.
- `debug.getAudioCueCounts()` includes six `block_slide`, two `block_exit`, two truck-door/drive-away cues, and one `level_complete`.

## Story Continuation

```javascript
await debug.continueCompletion();
const next = debug.getSnapshot();
if (next.resources.levelSeed !== 42002) throw new Error(`Expected next seed 42002, got ${next.resources.levelSeed}`);
```

Expected behavior: the next generated level loads from copied chapter JSON with no console errors and no failed local asset requests.

## Reload Resume

Reload the same URL after reaching seed `42002`, then verify legacy progress was used to resume:

```javascript
const debug = window.__dailyDispatchDebug;
const snapshot = debug.getSnapshot();
if (snapshot.resources.levelSeed !== 42002) throw new Error(`Expected reload resume seed 42002, got ${snapshot.resources.levelSeed}`);
const keys = debug.getProgressKeys();
if (!keys.game_progress || !keys.game_block_state || keys.game_has_played !== 'true') {
  throw new Error('Legacy progress keys were not preserved across reload');
}
```

Pass criteria: boot, first interaction, level completion, story continuation, reload resume, analytics/audio debug counts, one-canvas Pixi runtime, and local asset requests all pass without CDN routing.
