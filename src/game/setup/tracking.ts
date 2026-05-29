import {
  useAnalyticsService,
  type AnalyticsServiceWithDefaults,
} from '@wolfgames/components/solid';
import {
  gameStartSchema,
  audioSettingChangedSchema,
  screenEnterSchema,
  screenExitSchema,
  errorCapturedSchema,
  levelStartSchema,
  levelCompleteSchema,
  chapterStartSchema,
  chapterCompleteSchema,
} from './events';

// ============================================================================
// GAME TRACKING HOOK
// ============================================================================

export interface GameTracking {
  trackGameStart: (params: typeof gameStartSchema.infer) => void;
  trackLevelStart: (params: typeof levelStartSchema.infer) => void;
  trackLevelComplete: (params: typeof levelCompleteSchema.infer) => void;
  trackChapterStart: (params: typeof chapterStartSchema.infer) => void;
  trackChapterComplete: (params: typeof chapterCompleteSchema.infer) => void;
  trackAudioSettingChanged: (params: typeof audioSettingChangedSchema.infer) => void;
  trackScreenView: (params: typeof screenEnterSchema.infer) => void;
  trackScreenExit: (params: typeof screenExitSchema.infer) => void;
  trackError: (params: typeof errorCapturedSchema.infer) => void;
  service: AnalyticsServiceWithDefaults;
}

export function useGameTracking(): GameTracking {
  const service = useAnalyticsService();

  return {
    trackGameStart: service.createTracker('game_start', gameStartSchema, ['base'], {}),
    trackLevelStart: service.createTracker('level_start', levelStartSchema, ['base'], {}),
    trackLevelComplete: service.createTracker('level_complete', levelCompleteSchema, ['base'], {}),
    trackChapterStart: service.createTracker('chapter_start', chapterStartSchema, ['base'], {}),
    trackChapterComplete: service.createTracker('chapter_complete', chapterCompleteSchema, ['base'], {}),
    trackAudioSettingChanged: service.createTracker('audio_setting_changed', audioSettingChangedSchema, ['base'], {}),
    trackScreenView: service.createTracker('screen_enter', screenEnterSchema, ['base'], {}),
    trackScreenExit: service.createTracker('screen_exit', screenExitSchema, ['base'], {}),
    trackError: service.createTracker('error_captured', errorCapturedSchema, ['base'], {}),
    service,
  };
}
