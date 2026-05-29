import type { GameTuningBase } from '~/core/systems/tuning/types';

// ============================================
// GAME TUNING TYPES — Template
//
// Add your game-specific tuning interfaces here.
// Each section maps to a Tweakpane folder in dev mode.
// ============================================

export interface DevModeConfig {
  /** Skip the start screen and go directly into gameplay */
  skipStartScreen: boolean;
}

export interface GameScreensConfig {
  startBackgroundColor: string;
  loadingBackgroundColor: string;
}

export interface DailyDispatchGridConfig {
  width: number;
  height: number;
  swipeMinDistance: number;
}

export interface DailyDispatchTimingConfig {
  startDelayMs: number;
  resumeLoadingPauseMs: number;
  startLoadingPauseMs: number;
  clueDisplayMs: number;
  clueFadeInMs: number;
  clueFadeOutMs: number;
  slideDurationPerCell: number;
  exitDuration: number;
  dockCloseDuration: number;
  truckDriveAwayDuration: number;
}

export interface DailyDispatchAdapterConfig {
  progressSaveOnMove: boolean;
  resumeLegacyProgress: boolean;
  analyticsDebugLogging: boolean;
}

export interface GameTuning extends GameTuningBase {
  devMode: DevModeConfig;
  screens: GameScreensConfig;
  grid: DailyDispatchGridConfig;
  timing: DailyDispatchTimingConfig;
  adapters: DailyDispatchAdapterConfig;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const GAME_DEFAULTS: GameTuning = {
  version: '1.0.0',
  devMode: {
    skipStartScreen: false,
  },
  screens: {
    startBackgroundColor: '#4A3728',
    loadingBackgroundColor: '#4A3728',
  },
  grid: {
    width: 6,
    height: 6,
    swipeMinDistance: 4,
  },
  timing: {
    startDelayMs: 200,
    resumeLoadingPauseMs: 300,
    startLoadingPauseMs: 500,
    clueDisplayMs: 3000,
    clueFadeInMs: 400,
    clueFadeOutMs: 300,
    slideDurationPerCell: 0.08,
    exitDuration: 0.4,
    dockCloseDuration: 0.3,
    truckDriveAwayDuration: 0.5,
  },
  adapters: {
    progressSaveOnMove: true,
    resumeLegacyProgress: true,
    analyticsDebugLogging: true,
  },
};

// ============================================
// HELPERS
// ============================================

/** Parse theme from URL params — override in your game if needed */
export function getThemeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('theme') ?? null;
}
