import gsap from 'gsap';
import {
  type AnimatedSprite,
  Application,
  Container,
  type FederatedPointerEvent,
  Rectangle,
  type Sprite,
  Text,
} from 'pixi.js';
import { createSignal } from 'solid-js';
import type { PixiLoader } from '~/core/systems/assets';
import { setActiveDb } from '~/core/systems/ecs';
import { GAME_FONT_FAMILY, GAME_TITLE } from '~/game/config';
import type {
  GameController,
  GameControllerDeps,
  SetupGame,
} from '~/game/mygame-contract';
import {
  createDailyDispatchWorld,
  type DailyDispatchCompletionAdvanceResult,
  type DailyDispatchDebugSnapshot,
  type DailyDispatchDockSnapshot,
  type DailyDispatchEraseResult,
  type DailyDispatchLoadLevelInput,
  type DailyDispatchRuntimeDatabase,
  type DailyDispatchSwipeResult,
  type DispatchDirection,
  type ShapeOffset,
} from '../ecs/daily-dispatch-plugin';
import { loadPlayableLevel } from '../services/daily-dispatch-level-service';
import {
  clearLegacyBlockState,
  LEGACY_BLOCK_STATE_KEY,
  LEGACY_HAS_PLAYED_KEY,
  LEGACY_PROGRESS_KEY,
  loadLegacyBlockState,
  resolveResumeTarget,
  saveBlockStateFromSnapshot,
  saveProgressFromSnapshot,
} from '../services/legacy-progress-adapter';
import {
  createLegacyAnalyticsAdapter,
  type ActiveLegacyAnalyticsEvent,
  type LegacyAnalyticsDebugEvent,
} from '../services/legacy-analytics-adapter';
import {
  createLevelCompletionController,
  type LevelCompletionController,
} from '../../../../node_modules/@wolfgames/components/src/modules/logic/level-completion';
import { GameAudioManager } from '~/game/audio/manager';
import {
  DailyDispatchCluePopup,
  DailyDispatchStoryOverlay,
} from '../ui/storytelling-counterparts';

const ATLAS_NAME = 'scene-daily-dispatch';
const FX_FLASH_SHEET = 'fx-daily-dispatch-flash';
const FX_GLOW_SHEET = 'fx-daily-dispatch-glow';
const AUDIO_SFX_BUNDLE = 'audio-sfx-daily-dispatch';
const AUDIO_MUSIC_BUNDLE = 'audio-music-warehouse-puzzle';
const CELL_SIZE = 64;
const MIN_SWIPE_DISTANCE = 4;
const SLIDE_DURATION_PER_CELL = 0.08;
const EXIT_DURATION = 0.4;
const DOCK_CLOSE_DURATION = 0.3;
const DOCK_STAGGER = 0.08;
const DOCK_DRIVE_DELAY = 0.1;
const DOCK_DRIVE_DURATION = 0.5;
const COMPLETION_CELEBRATION_DURATION_MS = 500;
const COMPLETION_CLUE_DURATION_MS = 3000;

const DIRECTION_VECTORS: Record<DispatchDirection, { x: number; y: number }> =
  {
    right: { x: 1, y: 0 },
    left: { x: -1, y: 0 },
    down: { x: 0, y: 1 },
    up: { x: 0, y: -1 },
  };

const DIRECTION_ROTATION: Record<DispatchDirection, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

const ACTIVE_GPU_BUNDLES = [ATLAS_NAME, FX_FLASH_SHEET, FX_GLOW_SHEET] as const;
const AUDIO_BUNDLES = [AUDIO_SFX_BUNDLE, AUDIO_MUSIC_BUNDLE] as const;

type AudioCueName =
  | 'block_slide'
  | 'block_exit'
  | 'truck_door_close'
  | 'truck_drive_away'
  | 'level_complete'
  | 'chapter_complete'
  | 'music_1';

function createAudioCueCounts(): Record<AudioCueName, number> {
  return {
    block_slide: 0,
    block_exit: 0,
    truck_door_close: 0,
    truck_drive_away: 0,
    level_complete: 0,
    chapter_complete: 0,
    music_1: 0,
  };
}

interface DockView {
  container: Container;
  openSprites: Sprite[];
  closedSprites: Sprite[];
}

interface DebugWindow {
  __dailyDispatchDebug?: {
    getDb: () => DailyDispatchRuntimeDatabase | null;
    getSnapshot: () => DailyDispatchDebugSnapshot | null;
    loadGeneratedLevel: (
      chapterIndex?: number,
      levelIndex?: number,
      options?: {
        storyPhase?: DailyDispatchLoadLevelInput['storyPhase'];
        levelPhase?: DailyDispatchLoadLevelInput['levelPhase'];
      },
    ) => Promise<DailyDispatchDebugSnapshot | null>;
    executeSwipe: (
      blockUid: string,
      direction: DispatchDirection,
    ) => Promise<DailyDispatchSwipeResult | null>;
    eraseBlock: (blockUid: string) => Promise<DailyDispatchEraseResult | null>;
    advanceAfterCompletion: () => Promise<{
      advance: DailyDispatchCompletionAdvanceResult;
      snapshot: DailyDispatchDebugSnapshot | null;
    } | null>;
    continueCompletion: () => Promise<{
      advance: DailyDispatchCompletionAdvanceResult;
      snapshot: DailyDispatchDebugSnapshot | null;
    } | null>;
    continueStory: () => Promise<DailyDispatchDebugSnapshot | null>;
    getAudioCueCounts: () => Record<AudioCueName, number>;
    getLastAudioLoadError: () => string | null;
    getCompletionState: () => {
      state: 'playing' | 'completing' | 'complete';
      isInputBlocked: boolean;
      canContinue: boolean;
    } | null;
    getStoryState: () => DailyDispatchDebugSnapshot['resources'] | null;
    getProgressKeys: () => Record<string, unknown>;
    getAnalyticsEvents: () => LegacyAnalyticsDebugEvent[];
    getAnalyticsEventCounts: () => Partial<
      Record<ActiveLegacyAnalyticsEvent, number>
    >;
  };
}

export const setupGame: SetupGame = (
  _deps: GameControllerDeps,
): GameController => {
  const [ariaText, setAriaText] = createSignal(
    'Daily Dispatch loading source chapter data...',
  );
  let app: Application | null = null;
  let stageRoot: Container | null = null;
  let boardView: Container | null = null;
  let db: DailyDispatchRuntimeDatabase | null = null;
  let gpuLoader: PixiLoader | null = null;
  let audioManager: GameAudioManager | null = null;
  let completionController: LevelCompletionController | null = null;
  let lastAudioLoadError: string | null = null;
  let resizeHandler: (() => void) | null = null;
  let resizeListener: (() => void) | null = null;
  let destroyed = false;
  let isAnimating = false;
  let musicStarted = false;
  let levelStartedAt = Date.now();
  let chapterStartedAt = Date.now();
  let storyOverlay: DailyDispatchStoryOverlay | null = null;
  let cluePopup: DailyDispatchCluePopup | null = null;
  let pointerStart: { x: number; y: number; blockUid: string | null } | null =
    null;
  const blockViews = new Map<string, Container>();
  const dockViews = new Map<string, DockView>();
  const activeTimelines = new Set<gsap.core.Timeline>();
  const audioCueCounts = createAudioCueCounts();
  const analyticsAdapter = createLegacyAnalyticsAdapter(_deps.analytics);

  const getSnapshot = () => db?.actions.snapshot() ?? null;

  const persistCurrentSnapshot = (saveBlockState = true) => {
    const snapshot = getSnapshot();
    if (!snapshot) return null;
    saveProgressFromSnapshot(snapshot);
    if (saveBlockState && snapshot.resources.levelPhase !== 'complete') {
      saveBlockStateFromSnapshot(snapshot);
    }
    return snapshot;
  };

  const killDisplayTreeTweens = (node: Container) => {
    for (const child of node.children) {
      if (child instanceof Container) {
        killDisplayTreeTweens(child);
      }
    }
    gsap.killTweensOf(node);
    gsap.killTweensOf(node.scale);
    node.removeAllListeners();
  };

  const destroyDisplayTree = (node: Container) => {
    killDisplayTreeTweens(node);
    node.parent?.removeChild(node);
    node.destroy({ children: true });
  };

  const clearStageRoot = () => {
    if (!stageRoot) return;
    for (const timeline of activeTimelines) {
      timeline.kill();
    }
    activeTimelines.clear();
    for (const child of stageRoot.removeChildren()) {
      destroyDisplayTree(child);
    }
    blockViews.clear();
    dockViews.clear();
    boardView = null;
    storyOverlay = null;
    cluePopup = null;
  };

  const createAtlasSprite = (frame: string): Sprite => {
    const sprite = gpuLoader?.createSprite(ATLAS_NAME, frame);
    if (!sprite) {
      throw new Error(
        `Daily Dispatch frame missing from ${ATLAS_NAME}: ${frame}`,
      );
    }
    return sprite;
  };

  const trackTimeline = (timeline: gsap.core.Timeline): gsap.core.Timeline => {
    activeTimelines.add(timeline);
    const onComplete = timeline.eventCallback('onComplete') as
      | (() => void)
      | undefined;
    timeline.eventCallback('onComplete', () => {
      onComplete?.();
      activeTimelines.delete(timeline);
    });
    const onInterrupt = timeline.eventCallback('onInterrupt') as
      | (() => void)
      | undefined;
    timeline.eventCallback('onInterrupt', () => {
      onInterrupt?.();
      activeTimelines.delete(timeline);
    });
    return timeline;
  };

  const recordAudioCue = (cue: AudioCueName, play: () => void) => {
    audioCueCounts[cue] += 1;
    console.info('[Daily Dispatch] Audio cue trigger', {
      cue,
      count: audioCueCounts[cue],
    });
    play();
  };

  const loadAudioForGame = async () => {
    const results = await Promise.allSettled(
      AUDIO_BUNDLES.map(async (bundle) => {
        if (!_deps.coordinator.isLoaded(bundle)) {
          await _deps.coordinator.loadBundle(bundle);
        }
      }),
    );
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    lastAudioLoadError = rejected
      ? rejected.reason instanceof Error
        ? rejected.reason.message
        : String(rejected.reason)
      : null;
    if (lastAudioLoadError) {
      console.warn('[Daily Dispatch] Audio bundle load incomplete', {
        error: lastAudioLoadError,
      });
    }
    if (!musicStarted) {
      musicStarted = true;
      recordAudioCue('music_1', () => audioManager?.startGameMusic());
    }
  };

  const createBlockView = (
    block: DailyDispatchDebugSnapshot['blocks'][number],
  ): Container => {
    const view = new Container();
    view.label = `block-${block.uid}`;
    view.x = block.position.col * CELL_SIZE;
    view.y = block.position.row * CELL_SIZE;
    view.eventMode = 'none';

    for (const offset of block.shapeOffsets) {
      const cell = createAtlasSprite(block.spriteKey);
      cell.anchor.set(0);
      cell.width = CELL_SIZE;
      cell.height = CELL_SIZE;
      cell.x = offset.col * CELL_SIZE;
      cell.y = offset.row * CELL_SIZE;
      view.addChild(cell);
    }

    return view;
  };

  const positionDockSprite = (
    sprite: Sprite,
    dock: DailyDispatchDockSnapshot,
    index: number,
    gridSize: number,
  ) => {
    const gridPixelSize = gridSize * CELL_SIZE;
    const dockOffset = CELL_SIZE * 0.6;
    const cellCenter = index * CELL_SIZE + CELL_SIZE / 2;

    sprite.anchor.set(0.5);
    sprite.width = CELL_SIZE;
    sprite.height = CELL_SIZE;

    if (dock.side === 'left') {
      sprite.x = -dockOffset;
      sprite.y = cellCenter;
      sprite.scale.x *= -1;
    } else if (dock.side === 'right') {
      sprite.x = gridPixelSize + dockOffset;
      sprite.y = cellCenter;
    } else if (dock.side === 'top') {
      sprite.x = cellCenter;
      sprite.y = -dockOffset;
    } else {
      sprite.x = cellCenter;
      sprite.y = gridPixelSize + dockOffset;
    }
  };

  const createDockView = (
    dock: DailyDispatchDockSnapshot,
    gridSize: number,
  ): DockView => {
    const container = new Container();
    container.label = `dock-${dock.uid}`;
    const openSprites: Sprite[] = [];
    const closedSprites: Sprite[] = [];

    for (const index of dock.indices) {
      const open = createAtlasSprite(dock.openSpriteFrame);
      const closed = createAtlasSprite(dock.closedSpriteFrame);
      positionDockSprite(open, dock, index, gridSize);
      positionDockSprite(closed, dock, index, gridSize);
      open.visible = !dock.closed;
      closed.visible = dock.closed;
      container.addChild(open, closed);
      openSprites.push(open);
      closedSprites.push(closed);
    }

    return { container, openSprites, closedSprites };
  };

  const createHudIcon = (frame: string, label: string): Container => {
    const icon = new Container();
    icon.label = `hud-${label}`;

    const sprite = createAtlasSprite(frame);
    sprite.anchor.set(0.5);
    sprite.width = 42;
    sprite.height = 42;
    icon.addChild(sprite);

    return icon;
  };

  const createCompletionOverlay = (
    snapshot: DailyDispatchDebugSnapshot,
    screenWidth: number,
    screenHeight: number,
    canContinue: boolean,
  ): Container => {
    const overlay = new Container();
    overlay.label = 'daily-dispatch-completion-feedback';
    overlay.alpha = 0;

    cluePopup = new DailyDispatchCluePopup(
      gpuLoader!,
      () => void continueCompletion(),
    );
    cluePopup.show(
      snapshot.resources.currentClueText,
      screenWidth,
      screenHeight,
      canContinue,
    );
    overlay.addChild(cluePopup);

    const title = new Text({
      text: 'Level Complete!',
      style: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: 28,
        fontWeight: '800',
        fill: 0xfff7df,
        stroke: { color: 0x1f1712, width: 5 },
      },
    });
    title.anchor.set(0.5);
    title.position.set(screenWidth / 2, screenHeight * 0.62);
    title.scale.set(0);
    overlay.addChild(title);

    const tl = trackTimeline(gsap.timeline());
    tl.to(overlay, { alpha: 1, duration: 0.3, ease: 'power2.out' });
    tl.to(
      title.scale,
      { x: 1, y: 1, duration: 0.4, ease: 'back.out(1.7)' },
      '-=0.2',
    );

    return overlay;
  };

  const playAnimatedVfx = (
    sheet: string,
    animation: string,
  ): AnimatedSprite | null => {
    if (!gpuLoader?.hasSheet(sheet)) return null;
    const sprite = gpuLoader.createAnimatedSprite(sheet, animation);
    if (!sprite) return null;
    sprite.loop = false;
    sprite.onComplete = () => {
      sprite.parent?.removeChild(sprite);
      sprite.destroy();
    };
    return sprite;
  };

  const playSwipeFlash = (
    blockView: Container,
    block: DailyDispatchDebugSnapshot['blocks'][number],
    direction: DispatchDirection,
  ) => {
    if (!boardView) return;
    const vector = DIRECTION_VECTORS[direction];
    const halfCell = CELL_SIZE / 2;

    for (const offset of block.shapeOffsets) {
      const flash = playAnimatedVfx(FX_FLASH_SHEET, 'flash');
      if (!flash) continue;
      flash.anchor.set(0.5);
      flash.position.set(
        blockView.x + offset.col * CELL_SIZE + halfCell + vector.x * CELL_SIZE,
        blockView.y + offset.row * CELL_SIZE + halfCell + vector.y * CELL_SIZE,
      );
      flash.rotation = DIRECTION_ROTATION[direction];
      flash.scale.set(CELL_SIZE / 48);
      flash.alpha = 0.85;
      flash.animationSpeed = 0.6;
      boardView.addChild(flash);
      flash.play();
    }
  };

  const playDockGlow = (dockView: DockView) => {
    if (!boardView) return;
    const glow = playAnimatedVfx(FX_GLOW_SHEET, 'glow');
    const reference =
      dockView.closedSprites[0] ?? dockView.openSprites[0] ?? null;
    if (!glow || !reference) return;
    glow.anchor.set(0.5);
    glow.position.set(
      dockView.container.x + reference.x,
      dockView.container.y + reference.y,
    );
    glow.rotation = Math.PI / 4;
    glow.scale.set(CELL_SIZE / 40);
    glow.alpha = 0.9;
    glow.animationSpeed = 0.5;
    boardView.addChild(glow);
    glow.play();
  };

  const getDockDriveVector = (
    dock: DailyDispatchDockSnapshot,
  ): { x: number; y: number } => {
    if (dock.side === 'left') return { x: -1, y: 0 };
    if (dock.side === 'right') return { x: 1, y: 0 };
    if (dock.side === 'top') return { x: 0, y: -1 };
    return { x: 0, y: 1 };
  };

  const closeDockView = (
    dockView: DockView,
    dock: DailyDispatchDockSnapshot,
  ): Promise<void> => {
    if (dockView.closedSprites.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
      let completed = 0;
      const driveVector = getDockDriveVector(dock);
      const driveDistance = CELL_SIZE * 2.5;

      dockView.closedSprites.forEach((closed, index) => {
        const open = dockView.openSprites[index];
        const baseScaleX = closed.scale.x;
        const baseScaleY = closed.scale.y;
        const tl = trackTimeline(
          gsap.timeline({
            delay: index * DOCK_STAGGER,
            onComplete: () => {
              completed += 1;
              if (completed >= dockView.closedSprites.length) resolve();
            },
          }),
        );

        tl.call(() => {
          if (open) open.visible = false;
          closed.visible = true;
          closed.alpha = 1;
          if (index === 0) {
            recordAudioCue('truck_door_close', () =>
              audioManager?.playTruckDoorClose(),
            );
          }
        });
        tl.fromTo(
          closed.scale,
          { x: baseScaleX * 1.15, y: baseScaleY * 1.15 },
          {
            x: baseScaleX,
            y: baseScaleY,
            duration: DOCK_CLOSE_DURATION * 0.5,
            ease: 'back.out(2)',
          },
        );
        tl.call(
          () => {
            if (index === 0) {
              recordAudioCue('truck_drive_away', () =>
                audioManager?.playTruckDriveAway(),
              );
            }
          },
          undefined,
          `+=${DOCK_DRIVE_DELAY}`,
        );
        tl.to(closed, {
          x: closed.x + driveVector.x * driveDistance,
          y: closed.y + driveVector.y * driveDistance,
          alpha: 0,
          duration: DOCK_DRIVE_DURATION,
          ease: 'power2.in',
        });
      });
    });
  };

  const blockUidAt = (
    snapshot: DailyDispatchDebugSnapshot,
    localX: number,
    localY: number,
  ): string | null => {
    const col = Math.floor(localX / CELL_SIZE);
    const row = Math.floor(localY / CELL_SIZE);
    if (
      col < 0 ||
      col >= snapshot.resources.gridSize ||
      row < 0 ||
      row >= snapshot.resources.gridSize
    ) {
      return null;
    }

    const blockUidAtCell = (
      cellCol: number,
      cellRow: number,
    ): string | null => {
      for (const block of snapshot.blocks) {
        if (block.exited) continue;
        const cells = block.shapeOffsets.map((offset: ShapeOffset) => ({
          col: block.position.col + offset.col,
          row: block.position.row + offset.row,
        }));
        if (
          cells.some((cell) => cell.col === cellCol && cell.row === cellRow)
        ) {
          return block.uid;
        }
      }

      return null;
    };

    const exactHit = blockUidAtCell(col, row);
    if (exactHit) return exactHit;

    const neighbors = [
      { col: col - 1, row },
      { col: col + 1, row },
      { col, row: row - 1 },
      { col, row: row + 1 },
    ];
    for (const neighbor of neighbors) {
      if (
        neighbor.col >= 0 &&
        neighbor.col < snapshot.resources.gridSize &&
        neighbor.row >= 0 &&
        neighbor.row < snapshot.resources.gridSize
      ) {
        const forgivingHit = blockUidAtCell(neighbor.col, neighbor.row);
        if (forgivingHit) return forgivingHit;
      }
    }

    return null;
  };

  const resolveDirection = (dx: number, dy: number): DispatchDirection => {
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  };

  const getStoryText = (
    snapshot: DailyDispatchDebugSnapshot,
  ): string | null => {
    const { resources } = snapshot;
    if (resources.storyPhase === 'introduction') {
      return resources.storyIntroText;
    }
    if (resources.storyPhase === 'chapter-start') {
      return resources.storyChapterStartText;
    }
    if (resources.storyPhase === 'chapter-end') {
      return resources.storyCompletionText || resources.headline;
    }
    if (resources.storyPhase === 'all-done') {
      return "Amazing work! You've delivered all the packages. Check back soon for more!";
    }
    return null;
  };

  const continueStory = async (): Promise<DailyDispatchDebugSnapshot | null> => {
    if (!db) return null;
    const snapshot = getSnapshot();
    if (!snapshot) return null;

    if (snapshot.resources.storyPhase === 'introduction') {
      db.actions.advanceStoryPhase('loading-puzzle');
      db.actions.advanceStoryPhase('chapter-start');
      syncRenderFromEcs();
      return getSnapshot();
    }

    if (snapshot.resources.storyPhase === 'chapter-start') {
      db.actions.advanceStoryPhase('playing');
      syncRenderFromEcs();
      return getSnapshot();
    }

    if (snapshot.resources.storyPhase === 'chapter-end') {
      return loadGeneratedLevelIntoEcs(
        snapshot.resources.nextChapterIndex,
        0,
        { storyPhase: 'chapter-start', levelPhase: 'playing' },
      );
    }

    syncRenderFromEcs();
    return getSnapshot();
  };

  const renderScene = (snapshot: DailyDispatchDebugSnapshot) => {
    if (!app || !stageRoot) return;
    clearStageRoot();

    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;
    const gridSize = snapshot.resources.gridSize;
    const gridPixelSize = gridSize * CELL_SIZE;

    const background = createAtlasSprite('bg-gameboard.png');
    background.anchor.set(0.5);
    background.x = screenWidth / 2;
    background.y = screenHeight / 2;
    background.scale.set(
      Math.max(
        screenWidth / background.texture.width,
        screenHeight / background.texture.height,
      ),
    );
    stageRoot.addChild(background);

    const title = new Text({
      text: GAME_TITLE,
      style: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: 28,
        fontWeight: '800',
        fill: 0xfff7df,
        stroke: { color: 0x1f1712, width: 5 },
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(screenWidth / 2, 18);
    stageRoot.addChild(title);

    const hud = new Text({
      text: `Level ${snapshot.resources.levelNumber} | Moves ${String(snapshot.resources.moveCount).padStart(2, '0')} | ${snapshot.resources.levelPhase}`,
      style: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: 18,
        fill: 0xffffff,
        stroke: { color: 0x1f1712, width: 4 },
      },
    });
    hud.anchor.set(0.5, 0);
    hud.position.set(screenWidth / 2, 52);
    stageRoot.addChild(hud);

    const hudIcons = new Container();
    hudIcons.label = 'daily-dispatch-hud-source-icons';
    const deleteIcon = createHudIcon('ui-button_delete.png', 'delete');
    const restartIcon = createHudIcon('ui-button_restart.png', 'restart');
    const audioIcon = createHudIcon('ui-button_audio.png', 'audio');
    deleteIcon.position.set(screenWidth / 2 - 72, 102);
    restartIcon.position.set(screenWidth / 2, 102);
    audioIcon.position.set(screenWidth / 2 + 72, 102);
    hudIcons.addChild(deleteIcon, restartIcon, audioIcon);
    stageRoot.addChild(hudIcons);

    const board = new Container();
    board.label = 'daily-dispatch-board';
    board.eventMode = 'static';
    board.hitArea = new Rectangle(0, 0, gridPixelSize, gridPixelSize);
    const boardScale = Math.min(
      1,
      (screenWidth - 96) / gridPixelSize,
      (screenHeight - 180) / gridPixelSize,
    );
    board.scale.set(boardScale);
    board.x = (screenWidth - gridPixelSize * boardScale) / 2;
    board.y = (screenHeight - gridPixelSize * boardScale) / 2 + 34;

    board.on('pointerdown', (event: FederatedPointerEvent) => {
      if (isAnimating) return;
      const latest = getSnapshot();
      if (!latest) return;
      const local = board.toLocal(event.global);
      pointerStart = {
        x: local.x,
        y: local.y,
        blockUid: blockUidAt(latest, local.x, local.y),
      };
    });
    board.on('pointermove', (event: FederatedPointerEvent) => {
      if (!pointerStart?.blockUid || isAnimating) return;
      const local = board.toLocal(event.global);
      const dx = local.x - pointerStart.x;
      const dy = local.y - pointerStart.y;
      if (Math.hypot(dx, dy) < MIN_SWIPE_DISTANCE) return;
      const blockUid = pointerStart.blockUid;
      pointerStart = null;
      void executeSwipe(blockUid, resolveDirection(dx, dy));
    });
    board.on('pointerup', () => {
      pointerStart = null;
    });
    board.on('pointerupoutside', () => {
      pointerStart = null;
    });

    const gridBacking = createAtlasSprite('prop-grid_backing.png');
    gridBacking.anchor.set(0);
    gridBacking.width = gridPixelSize;
    gridBacking.height = gridPixelSize;
    board.addChild(gridBacking);

    for (const dock of snapshot.docks) {
      const view = createDockView(dock, gridSize);
      dockViews.set(dock.uid, view);
      board.addChild(view.container);
    }

    for (const block of snapshot.blocks) {
      if (block.exited) continue;
      const view = createBlockView(block);
      blockViews.set(block.uid, view);
      board.addChild(view);
    }

    stageRoot.addChild(board);
    boardView = board;

    const clue = new Text({
      text: snapshot.resources.currentClueText,
      style: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: 16,
        fill: 0xfff7df,
        stroke: { color: 0x1f1712, width: 4 },
        align: 'center',
        wordWrap: true,
        wordWrapWidth: Math.min(340, screenWidth - 48),
      },
    });
    clue.anchor.set(0.5, 1);
    clue.position.set(screenWidth / 2, screenHeight - 28);
    stageRoot.addChild(clue);

    if (snapshot.resources.levelPhase === 'complete') {
      stageRoot.addChild(
        createCompletionOverlay(
          snapshot,
          screenWidth,
          screenHeight,
          completionController?.canContinue ?? false,
        ),
      );
    }

    const storyText = getStoryText(snapshot);
    if (storyText) {
      storyOverlay = new DailyDispatchStoryOverlay(
        gpuLoader!,
        () => void continueStory(),
      );
      stageRoot.addChild(storyOverlay);
      storyOverlay.show(storyText, screenWidth, screenHeight);
    }
  };

  const syncRenderFromEcs = () => {
    const snapshot = getSnapshot();
    if (!snapshot) return;
    renderScene(snapshot);
    setAriaText(
      `Daily Dispatch ${snapshot.resources.chapterUid}, level ${snapshot.resources.levelNumber}, ${snapshot.resources.moveCount} moves, ${snapshot.resources.remainingBlocks} target blocks remaining.`,
    );
  };

  const loadGeneratedLevelIntoEcs = async (
    chapterIndex = 0,
    levelIndex = 0,
    options: {
      storyPhase?: DailyDispatchLoadLevelInput['storyPhase'];
      levelPhase?: DailyDispatchLoadLevelInput['levelPhase'];
    } = {},
  ): Promise<DailyDispatchDebugSnapshot | null> => {
    if (!db) return null;
    const levelInput: DailyDispatchLoadLevelInput = await loadPlayableLevel(
      chapterIndex,
      levelIndex,
      options,
    );
    if (destroyed || !db) return null;
    db.actions.loadLevel(levelInput);
    const resumeTarget = resolveResumeTarget();
    if (
      resumeTarget &&
      resumeTarget.chapterIndex === chapterIndex &&
      resumeTarget.levelIndex === levelIndex
    ) {
      const savedBlockState = loadLegacyBlockState();
      if (savedBlockState) {
        db.actions.hydrateBlockState(savedBlockState);
      }
    } else {
      clearLegacyBlockState();
    }
    levelStartedAt = Date.now();
    if (levelIndex === 0) {
      chapterStartedAt = levelStartedAt;
    }
    completionController?.reset();
    syncRenderFromEcs();
    const snapshot = getSnapshot();
    if (snapshot) {
      saveProgressFromSnapshot(snapshot);
      saveBlockStateFromSnapshot(snapshot);
      analyticsAdapter.trackLevelStart(snapshot);
      if (snapshot.resources.levelIndex === 0) {
        analyticsAdapter.trackChapterStart(snapshot);
      }
      console.info('[Daily Dispatch] Generated source chapter level loaded', {
        chapterUid: snapshot.resources.chapterUid,
        levelUid: snapshot.resources.levelUid,
        levelNumber: snapshot.resources.levelNumber,
        seed: snapshot.resources.levelSeed,
        blocks: snapshot.blocks.length,
        docks: snapshot.docks.length,
        optimalMoves: snapshot.resources.optimalMoves,
      });
    }
    return snapshot;
  };

  const advanceAfterCompletion = async (): Promise<{
    advance: DailyDispatchCompletionAdvanceResult;
    snapshot: DailyDispatchDebugSnapshot | null;
  } | null> => {
    if (!db) return null;
    const advance = db.actions.advanceAfterCompletion();
    if (advance.kind === 'next-level') {
      const snapshot = await loadGeneratedLevelIntoEcs(
        advance.chapterIndex,
        advance.levelIndex,
        { storyPhase: 'playing', levelPhase: 'playing' },
      );
      return { advance, snapshot };
    }

    if (advance.kind === 'next-chapter') {
      syncRenderFromEcs();
      return { advance, snapshot: getSnapshot() };
    }

    syncRenderFromEcs();
    const snapshot = getSnapshot();
    if (advance.kind === 'all-done') {
      setAriaText('Daily Dispatch complete. All generated chapters are done.');
    }
    return { advance, snapshot };
  };

  const continueCompletion = async (): Promise<{
    advance: DailyDispatchCompletionAdvanceResult;
    snapshot: DailyDispatchDebugSnapshot | null;
  } | null> => {
    if (!completionController?.canContinue) return null;
    completionController.continue();
    return advanceAfterCompletion();
  };

  const startCompletionHook = (snapshot: DailyDispatchDebugSnapshot) => {
    if (
      snapshot.resources.levelPhase !== 'complete' ||
      completionController?.state !== 'playing'
    )
      return;
    completionController.startCompletion(
      snapshot.resources.levelNumber,
      snapshot.resources.moveCount,
      Date.now() - levelStartedAt,
      snapshot.resources.currentClueText,
    );
    analyticsAdapter.trackLevelComplete(snapshot, Date.now() - levelStartedAt);
    if (!snapshot.resources.hasNextLevel) {
      analyticsAdapter.trackChapterComplete(
        snapshot,
        Date.now() - chapterStartedAt,
      );
    }
    saveProgressFromSnapshot(snapshot);
    clearLegacyBlockState();
    console.info('[Daily Dispatch] Level completion hook ready', {
      levelNumber: snapshot.resources.levelNumber,
      moves: snapshot.resources.moveCount,
      durationMs: Date.now() - levelStartedAt,
      clue: snapshot.resources.currentClueText,
      nextChapterIndex: snapshot.resources.nextChapterIndex,
      nextLevelIndex: snapshot.resources.nextLevelIndex,
    });
    setAriaText(
      'Daily Dispatch level complete. Next generated level is ready to load.',
    );
  };

  const executeSwipe = async (
    blockUid: string,
    direction: DispatchDirection,
  ): Promise<DailyDispatchSwipeResult | null> => {
    if (!db || isAnimating) return null;
    const beforeSnapshot = getSnapshot();
    const blockSnapshot =
      beforeSnapshot?.blocks.find((block) => block.uid === blockUid) ?? null;
    const blockView = blockViews.get(blockUid);
    const result = db.actions.executeSwipe({ blockUid, direction });
    if (!result.moved) return result;

    isAnimating = true;
    recordAudioCue('block_slide', () => audioManager?.playBlockSlide());
    if (blockView && blockSnapshot) {
      playSwipeFlash(blockView, blockSnapshot, direction);
    }
    if (blockView) {
      await new Promise<void>((resolve) => {
        gsap.to(blockView, {
          x: result.to.col * CELL_SIZE,
          y: result.to.row * CELL_SIZE,
          duration: result.distance * SLIDE_DURATION_PER_CELL,
          ease: 'power2.out',
          onComplete: resolve,
        });
      });

      if (result.exited) {
        recordAudioCue('block_exit', () => audioManager?.playBlockExit());
        const vector = DIRECTION_VECTORS[direction];
        await new Promise<void>((resolve) => {
          gsap.to(blockView, {
            x: blockView.x + vector.x * CELL_SIZE * 2,
            y: blockView.y + vector.y * CELL_SIZE * 2,
            alpha: 0,
            duration: EXIT_DURATION,
            ease: 'power2.in',
            onComplete: resolve,
          });
        });
      }
    }

    const dockView = result.dockUid ? dockViews.get(result.dockUid) : null;
    const dockSnapshot = result.dockUid
      ? beforeSnapshot?.docks.find((dock) => dock.uid === result.dockUid)
      : null;
    if (dockView && dockSnapshot) {
      playDockGlow(dockView);
      await closeDockView(dockView, dockSnapshot);
    }

    isAnimating = false;
    syncRenderFromEcs();
    const snapshot = getSnapshot();
    if (snapshot) {
      persistCurrentSnapshot(snapshot.resources.levelPhase !== 'complete');
      startCompletionHook(snapshot);
    }
    return result;
  };

  const eraseBlock = async (
    blockUid: string,
  ): Promise<DailyDispatchEraseResult | null> => {
    if (!db || isAnimating) return null;
    const blockView = blockViews.get(blockUid);
    const result = db.actions.eraseBlock({ blockUid });
    if (!result.erased) return result;

    isAnimating = true;
    if (blockView) {
      await new Promise<void>((resolve) => {
        gsap.to(blockView.scale, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'back.in(2)',
        });
        gsap.to(blockView, {
          alpha: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: resolve,
        });
      });
    }

    isAnimating = false;
    syncRenderFromEcs();
    const snapshot = getSnapshot();
    if (snapshot) {
      persistCurrentSnapshot(snapshot.resources.levelPhase !== 'complete');
      startCompletionHook(snapshot);
    }
    return result;
  };

  const mount = async (container: HTMLDivElement) => {
    db = createDailyDispatchWorld();
    app = new Application();
    await app.init({
      resizeTo: container,
      background: '#1f1712',
      antialias: true,
    });

    if (destroyed || !app) {
      return;
    }

    setActiveDb(db);
    await _deps.coordinator.initGpu();
    gpuLoader = _deps.coordinator.getLoader<PixiLoader>('gpu');
    if (!gpuLoader) {
      throw new Error('Daily Dispatch Pixi loader was not initialized.');
    }
    await Promise.all(
      ACTIVE_GPU_BUNDLES.map(async (bundle) => {
        if (!_deps.coordinator.isLoaded(bundle)) {
          await _deps.coordinator.loadBundle(bundle);
        }
      }),
    );
    audioManager = new GameAudioManager(_deps.coordinator.audio);
    completionController = createLevelCompletionController({
      celebrationDuration: COMPLETION_CELEBRATION_DURATION_MS,
      clueDuration: COMPLETION_CLUE_DURATION_MS,
      events: {
        onLevelComplete: ({ levelId, moves, durationMs }) => {
          console.info('[Daily Dispatch] Level completion controller event', {
            levelId,
            moves,
            durationMs,
          });
        },
        onCompletionStart: () => {
          syncRenderFromEcs();
        },
        onClueTimerEnd: () => {
          syncRenderFromEcs();
        },
        onCompletionEnd: () => {},
      },
      onPlaySound: () => {
        const snapshot = getSnapshot();
        if (snapshot && !snapshot.resources.hasNextLevel) {
          recordAudioCue('chapter_complete', () =>
            audioManager?.playChapterComplete(),
          );
        } else {
          recordAudioCue('level_complete', () =>
            audioManager?.playLevelComplete(),
          );
        }
      },
    });
    void loadAudioForGame();

    container.appendChild(app.canvas);
    stageRoot = new Container();
    stageRoot.label = 'daily-dispatch-root';
    app.stage.addChild(stageRoot);

    (window as Window & DebugWindow).__dailyDispatchDebug = {
      getDb: () => db,
      getSnapshot,
      loadGeneratedLevel: loadGeneratedLevelIntoEcs,
      executeSwipe,
      eraseBlock,
      advanceAfterCompletion,
      continueCompletion,
      continueStory,
      getAudioCueCounts: () => ({ ...audioCueCounts }),
      getLastAudioLoadError: () => lastAudioLoadError,
      getCompletionState: () =>
        completionController
          ? {
              state: completionController.state,
              isInputBlocked: completionController.isInputBlocked,
              canContinue: completionController.canContinue,
            }
          : null,
      getStoryState: () => getSnapshot()?.resources ?? null,
      getProgressKeys: () => ({
        [LEGACY_PROGRESS_KEY]:
          window.localStorage.getItem(LEGACY_PROGRESS_KEY) ?? null,
        [LEGACY_HAS_PLAYED_KEY]:
          window.localStorage.getItem(LEGACY_HAS_PLAYED_KEY) ?? null,
        [LEGACY_BLOCK_STATE_KEY]:
          window.localStorage.getItem(LEGACY_BLOCK_STATE_KEY) ?? null,
      }),
      getAnalyticsEvents: () => analyticsAdapter.getDebugEvents(),
      getAnalyticsEventCounts: () => analyticsAdapter.getEventCounts(),
    };

    resizeHandler = () => syncRenderFromEcs();
    resizeListener = () => resizeHandler?.();
    window.addEventListener('resize', resizeListener);

    try {
      const resumeTarget = resolveResumeTarget();
      await loadGeneratedLevelIntoEcs(
        resumeTarget?.chapterIndex ?? 0,
        resumeTarget?.levelIndex ?? 0,
        {
          storyPhase: resumeTarget ? 'playing' : 'introduction',
          levelPhase: 'playing',
        },
      );
    } catch (error) {
      console.error(
        '[Daily Dispatch] Failed to load copied chapter data:',
        error,
      );
      setAriaText('Daily Dispatch source chapter data could not be loaded.');
    }
  };

  return {
    gameMode: 'pixi',

    init(container: HTMLDivElement) {
      destroyed = false;
      void mount(container);
    },

    destroy() {
      destroyed = true;
      isAnimating = false;
      pointerStart = null;
      completionController?.destroy();
      completionController = null;
      audioManager?.stopMusic();
      audioManager = null;
      musicStarted = false;
      if (stageRoot) {
        clearStageRoot();
        stageRoot.parent?.removeChild(stageRoot);
        stageRoot.destroy({ children: true });
        stageRoot = null;
      }
      if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
        resizeListener = null;
      }
      app?.destroy(true, { children: true });
      app = null;
      setActiveDb(null);
      delete (window as Window & DebugWindow).__dailyDispatchDebug;
      db = null;
      gpuLoader = null;
      resizeHandler = null;
    },

    ariaText,
  };
};
