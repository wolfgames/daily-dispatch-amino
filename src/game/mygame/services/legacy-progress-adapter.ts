import {
  createProgressService,
  type BaseProgress,
} from '../../../../node_modules/@wolfgames/components/src/modules/logic/progress';
import type {
  DailyDispatchDebugSnapshot,
  DailyDispatchProgressSnapshot,
} from '../ecs/daily-dispatch-plugin';

export const LEGACY_PROGRESS_KEY = 'game_progress';
export const LEGACY_BLOCK_STATE_KEY = 'game_block_state';
export const LEGACY_HAS_PLAYED_KEY = 'game_has_played';

export interface LegacyCurrentChapter {
  manifestUrl?: string;
  chapterId: string;
  countyName: string;
  chapterLength: number;
  currentLevel: number;
  startedAt: number;
  catalogIndex?: number;
  levelSeed?: number;
  tileRotations?: number[];
}

export interface LegacyCompletedChapter {
  chapterId: string;
  countyName: string;
  completedAt: number;
}

export interface LegacyProgressData extends BaseProgress {
  current: LegacyCurrentChapter | null;
  completed: LegacyCompletedChapter[];
  lastPlayedAt: number;
}

export interface LegacyBlockState {
  positions: Record<string, { col: number; row: number }>;
  exitedIds: string[];
  moveCount: number;
}

export interface LegacyResumeTarget {
  chapterIndex: number;
  levelIndex: number;
  currentLevel: number;
}

export interface LegacyStartState {
  isReturningPlayer: boolean;
  mode: 'new' | 'returning';
  label: string;
  countyName: string;
  currentLevel: number;
  totalLevels: number;
}

export const DEFAULT_LEGACY_PROGRESS: LegacyProgressData = {
  version: 1,
  current: null,
  completed: [],
  lastPlayedAt: 0,
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLegacyCurrentChapter(value: unknown): value is LegacyCurrentChapter {
  if (!isRecord(value)) return false;
  return (
    typeof value.chapterId === 'string' &&
    typeof value.countyName === 'string' &&
    typeof value.chapterLength === 'number' &&
    typeof value.currentLevel === 'number' &&
    typeof value.startedAt === 'number'
  );
}

function isLegacyProgressData(value: unknown): value is LegacyProgressData {
  if (!isRecord(value)) return false;
  return (
    typeof value.version === 'number' &&
    (value.current === null || isLegacyCurrentChapter(value.current)) &&
    Array.isArray(value.completed) &&
    typeof value.lastPlayedAt === 'number'
  );
}

function clampLevelIndex(currentLevel: number, chapterLength: number): number {
  const level = Number.isFinite(currentLevel) ? currentLevel : 1;
  const maxLevel = Math.max(1, chapterLength);
  return Math.min(Math.max(1, Math.trunc(level)), maxLevel) - 1;
}

const progressService = createProgressService<LegacyProgressData>({
  key: LEGACY_PROGRESS_KEY,
  version: 1,
  defaults: DEFAULT_LEGACY_PROGRESS,
  validate: isLegacyProgressData,
});

export function loadLegacyProgress(): LegacyProgressData {
  return progressService.load();
}

export function saveLegacyProgress(progress: LegacyProgressData): void {
  progressService.save({
    ...progress,
    lastPlayedAt: Date.now(),
  });
}

export function clearLegacyProgress(): void {
  progressService.clear();
  const storage = getStorage();
  storage?.removeItem(LEGACY_BLOCK_STATE_KEY);
}

export function hasPlayedBefore(): boolean {
  return getStorage()?.getItem(LEGACY_HAS_PLAYED_KEY) === 'true';
}

export function markHasPlayed(): void {
  getStorage()?.setItem(LEGACY_HAS_PLAYED_KEY, 'true');
}

export function resolveResumeTarget(
  progress = loadLegacyProgress(),
): LegacyResumeTarget | null {
  if (!progress.current) return null;
  const chapterIndex = Math.max(0, progress.current.catalogIndex ?? 0);
  const levelIndex = clampLevelIndex(
    progress.current.currentLevel,
    progress.current.chapterLength,
  );
  return {
    chapterIndex,
    levelIndex,
    currentLevel: levelIndex + 1,
  };
}

export function hasResumeProgress(): boolean {
  return resolveResumeTarget() !== null;
}

export function getLegacyStartState(
  progress = loadLegacyProgress(),
): LegacyStartState {
  const current = progress.current;
  if (current) {
    return {
      isReturningPlayer: true,
      mode: 'returning',
      label: `Continue Level ${current.currentLevel}`,
      countyName: current.countyName,
      currentLevel: current.currentLevel,
      totalLevels: current.chapterLength,
    };
  }

  return {
    isReturningPlayer: hasPlayedBefore(),
    mode: 'new',
    label: 'Start Dispatch',
    countyName: 'warehouse',
    currentLevel: 1,
    totalLevels: 0,
  };
}

export function createProgressFromSnapshot(
  snapshot: DailyDispatchDebugSnapshot,
  existing = loadLegacyProgress(),
): LegacyProgressData {
  const { resources } = snapshot;
  const currentLevel = Math.max(1, resources.levelIndex + 1);
  return {
    ...existing,
    current: {
      manifestUrl: '',
      chapterId: resources.chapterUid || resources.chapterId,
      countyName: resources.countyName || 'warehouse',
      chapterLength: resources.levelCount,
      currentLevel,
      startedAt: existing.current?.startedAt ?? Date.now(),
      catalogIndex: resources.chapterIndex,
      levelSeed: resources.levelSeed,
    },
    lastPlayedAt: Date.now(),
  };
}

export function progressSnapshotFromLegacy(
  progress = loadLegacyProgress(),
): Partial<DailyDispatchProgressSnapshot> | null {
  if (!progress.current) return null;
  return {
    chapterId: progress.current.chapterId,
    chapterUid: progress.current.chapterId,
    chapterIndex: progress.current.catalogIndex ?? 0,
    levelIndex: clampLevelIndex(
      progress.current.currentLevel,
      progress.current.chapterLength,
    ),
    levelNumber: progress.current.currentLevel,
    levelSeed: progress.current.levelSeed ?? 0,
    levelCount: progress.current.chapterLength,
    countyName: progress.current.countyName,
  };
}

export function saveProgressFromSnapshot(
  snapshot: DailyDispatchDebugSnapshot,
): LegacyProgressData {
  const progress = createProgressFromSnapshot(snapshot);
  saveLegacyProgress(progress);
  markHasPlayed();
  return progress;
}

export function createBlockStateFromSnapshot(
  snapshot: DailyDispatchDebugSnapshot,
): LegacyBlockState {
  const positions: LegacyBlockState['positions'] = {};
  const exitedIds: string[] = [];

  for (const block of snapshot.blocks) {
    positions[block.uid] = { ...block.position };
    if (block.exited) exitedIds.push(block.uid);
  }

  return {
    positions,
    exitedIds,
    moveCount: snapshot.resources.moveCount,
  };
}

export function saveBlockStateFromSnapshot(
  snapshot: DailyDispatchDebugSnapshot,
): LegacyBlockState {
  const state = createBlockStateFromSnapshot(snapshot);
  getStorage()?.setItem(LEGACY_BLOCK_STATE_KEY, JSON.stringify(state));
  return state;
}

export function loadLegacyBlockState(): LegacyBlockState | null {
  const raw = getStorage()?.getItem(LEGACY_BLOCK_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LegacyBlockState;
    if (!isRecord(parsed) || !isRecord(parsed.positions)) return null;
    return {
      positions: parsed.positions as LegacyBlockState['positions'],
      exitedIds: Array.isArray(parsed.exitedIds) ? parsed.exitedIds : [],
      moveCount:
        typeof parsed.moveCount === 'number' && Number.isFinite(parsed.moveCount)
          ? parsed.moveCount
          : 0,
    };
  } catch {
    return null;
  }
}

export function clearLegacyBlockState(): void {
  getStorage()?.removeItem(LEGACY_BLOCK_STATE_KEY);
}
