import type { DailyDispatchDebugSnapshot } from '../ecs/daily-dispatch-plugin';
import {
  chapterCompleteSchema,
  chapterStartSchema,
  gameStartSchema,
  levelCompleteSchema,
  levelStartSchema,
} from '~/game/setup/events';

export const ACTIVE_LEGACY_ANALYTICS_EVENTS = [
  'session_start',
  'session_pause',
  'session_resume',
  'session_end',
  'game_start',
  'level_start',
  'level_complete',
  'chapter_start',
  'chapter_complete',
  'audio_setting_changed',
] as const;

export const OMITTED_STALE_LEGACY_ANALYTICS_EVENTS = [
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
] as const;

export type ActiveLegacyAnalyticsEvent =
  (typeof ACTIVE_LEGACY_ANALYTICS_EVENTS)[number];

export type LegacyAnalyticsPayloads = {
  game_start: typeof gameStartSchema.infer;
  level_start: typeof levelStartSchema.infer;
  level_complete: typeof levelCompleteSchema.infer;
  chapter_start: typeof chapterStartSchema.infer;
  chapter_complete: typeof chapterCompleteSchema.infer;
};

export interface LegacyAnalyticsSink {
  trackGameStart?: (params: LegacyAnalyticsPayloads['game_start']) => void;
  trackLevelStart?: (params: LegacyAnalyticsPayloads['level_start']) => void;
  trackLevelComplete?: (params: LegacyAnalyticsPayloads['level_complete']) => void;
  trackChapterStart?: (params: LegacyAnalyticsPayloads['chapter_start']) => void;
  trackChapterComplete?: (
    params: LegacyAnalyticsPayloads['chapter_complete'],
  ) => void;
}

export interface LegacyAnalyticsDebugEvent<
  TName extends keyof LegacyAnalyticsPayloads = keyof LegacyAnalyticsPayloads,
> {
  name: TName;
  payload: LegacyAnalyticsPayloads[TName];
}

export interface LegacyAnalyticsAdapter {
  trackGameStart: (params: LegacyAnalyticsPayloads['game_start']) => void;
  trackLevelStart: (snapshot: DailyDispatchDebugSnapshot) => void;
  trackLevelComplete: (
    snapshot: DailyDispatchDebugSnapshot,
    durationMs: number,
  ) => void;
  trackChapterStart: (snapshot: DailyDispatchDebugSnapshot) => void;
  trackChapterComplete: (
    snapshot: DailyDispatchDebugSnapshot,
    durationMs: number,
  ) => void;
  getDebugEvents: () => LegacyAnalyticsDebugEvent[];
  getEventCounts: () => Partial<Record<ActiveLegacyAnalyticsEvent, number>>;
}

const globalDebugEvents: LegacyAnalyticsDebugEvent[] = [];
const globalCounts: Partial<Record<ActiveLegacyAnalyticsEvent, number>> = {};

export function resetLegacyAnalyticsDebug(): void {
  globalDebugEvents.length = 0;
  for (const key of Object.keys(globalCounts)) {
    delete globalCounts[key as ActiveLegacyAnalyticsEvent];
  }
}

function roundSeconds(durationMs: number): number {
  return parseFloat((Math.max(0, durationMs) / 1000).toFixed(2));
}

function chapterProgress(snapshot: DailyDispatchDebugSnapshot): string {
  const { levelNumber, levelCount } = snapshot.resources;
  return `${levelNumber}/${Math.max(1, levelCount)}`;
}

function difficultyForLevel(levelNumber: number): 'easy' | 'medium' | 'hard' {
  if (levelNumber <= 3) return 'easy';
  if (levelNumber <= 7) return 'medium';
  return 'hard';
}

export function createGameStartEvent(params: {
  startSource: string;
  isReturningPlayer: boolean;
  chapterId?: string;
  chapterCount?: number;
  countyTheme?: string;
}): LegacyAnalyticsPayloads['game_start'] {
  return {
    start_source: params.startSource,
    is_returning_player: params.isReturningPlayer,
    chapter_id: params.chapterId ?? 'default',
    chapter_count: params.chapterCount ?? 1,
    county_theme: params.countyTheme ?? 'warehouse',
  };
}

export function createLevelStartEvent(
  snapshot: DailyDispatchDebugSnapshot,
): LegacyAnalyticsPayloads['level_start'] {
  const { resources } = snapshot;
  return {
    chapter_id: resources.chapterUid || resources.chapterId || 'default',
    chapter_count: resources.chapterIndex + 1,
    county_theme: resources.countyName || 'warehouse',
    level_order: resources.levelNumber,
    chapter_progress: chapterProgress(snapshot),
    level_id:
      resources.levelUid ||
      `${resources.chapterUid || 'default'}_L${resources.levelNumber}`,
    level_difficulty: difficultyForLevel(resources.levelNumber),
    is_tutorial: resources.chapterIndex === 0 && resources.levelIndex === 0,
    level_seed: resources.levelSeed,
    grid_size: resources.gridSize,
  };
}

export function createLevelCompleteEvent(
  snapshot: DailyDispatchDebugSnapshot,
  durationMs: number,
): LegacyAnalyticsPayloads['level_complete'] {
  return {
    moves_used: snapshot.resources.moveCount,
    optimal_moves: snapshot.resources.optimalMoves,
    time_spent: roundSeconds(durationMs),
    total_rotations: 0,
  };
}

export function createChapterStartEvent(
  snapshot: DailyDispatchDebugSnapshot,
): LegacyAnalyticsPayloads['chapter_start'] {
  const { resources } = snapshot;
  return {
    chapter_id: resources.chapterUid || resources.chapterId || 'default',
    chapter_count: resources.chapterIndex + 1,
    county_theme: resources.countyName || 'warehouse',
    is_tutorial: resources.chapterIndex === 0,
    chapter_size: resources.levelCount,
    story_id: `${resources.chapterUid || resources.chapterId || 'default'}:story`,
    story_headline: resources.headline,
  };
}

export function createChapterCompleteEvent(
  snapshot: DailyDispatchDebugSnapshot,
  durationMs: number,
): LegacyAnalyticsPayloads['chapter_complete'] {
  const { resources } = snapshot;
  return {
    chapter_id: resources.chapterUid || resources.chapterId || 'default',
    time_spent: roundSeconds(durationMs),
    is_tutorial: resources.chapterIndex === 0,
  };
}

export function createLegacyAnalyticsAdapter(
  sink: LegacyAnalyticsSink = {},
): LegacyAnalyticsAdapter {
  const emit = <TName extends keyof LegacyAnalyticsPayloads>(
    name: TName,
    payload: LegacyAnalyticsPayloads[TName],
    track?: (params: LegacyAnalyticsPayloads[TName]) => void,
  ) => {
    globalCounts[name] = (globalCounts[name] ?? 0) + 1;
    globalDebugEvents.push({ name, payload } as LegacyAnalyticsDebugEvent);
    track?.(payload);
  };

  return {
    trackGameStart(params) {
      emit('game_start', params, sink.trackGameStart);
    },
    trackLevelStart(snapshot) {
      emit('level_start', createLevelStartEvent(snapshot), sink.trackLevelStart);
    },
    trackLevelComplete(snapshot, durationMs) {
      emit(
        'level_complete',
        createLevelCompleteEvent(snapshot, durationMs),
        sink.trackLevelComplete,
      );
    },
    trackChapterStart(snapshot) {
      emit(
        'chapter_start',
        createChapterStartEvent(snapshot),
        sink.trackChapterStart,
      );
    },
    trackChapterComplete(snapshot, durationMs) {
      emit(
        'chapter_complete',
        createChapterCompleteEvent(snapshot, durationMs),
        sink.trackChapterComplete,
      );
    },
    getDebugEvents() {
      return [...globalDebugEvents];
    },
    getEventCounts() {
      return { ...globalCounts };
    },
  };
}
