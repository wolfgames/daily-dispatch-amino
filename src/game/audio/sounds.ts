import type { SoundDefinition } from '~/core/systems/audio';

export type { SoundDefinition };

export const DAILY_DISPATCH_SFX_CHANNEL = 'audio-sfx-daily-dispatch';
export const DAILY_DISPATCH_MUSIC_CHANNEL = 'audio-music-warehouse-puzzle';

export const SOUND_BUTTON_CLICK: SoundDefinition = {
  channel: DAILY_DISPATCH_SFX_CHANNEL,
  sprite: 'button_click',
  volume: 0.7,
};

export const SOUND_BLOCK_SLIDE: SoundDefinition = {
  channel: DAILY_DISPATCH_SFX_CHANNEL,
  sprite: 'block_slide',
  volume: 0.5,
};

export const SOUND_BLOCK_EXIT: SoundDefinition = {
  channel: DAILY_DISPATCH_SFX_CHANNEL,
  sprite: 'block_exit',
  volume: 0.7,
};

export const SOUND_TRUCK_DOOR_CLOSE: SoundDefinition = {
  channel: DAILY_DISPATCH_SFX_CHANNEL,
  sprite: 'truck_door_close',
  volume: 0.6,
};

export const SOUND_TRUCK_DRIVE_AWAY: SoundDefinition = {
  channel: DAILY_DISPATCH_SFX_CHANNEL,
  sprite: 'truck_drive_away',
  volume: 0.5,
};

export const SOUND_LEVEL_COMPLETE: SoundDefinition = {
  channel: DAILY_DISPATCH_SFX_CHANNEL,
  sprite: 'level_complete',
  volume: 0.8,
};

export const SOUND_CHAPTER_COMPLETE: SoundDefinition = {
  channel: DAILY_DISPATCH_SFX_CHANNEL,
  sprite: 'chapter_complete',
  volume: 0.9,
};

export const MUSIC_WAREHOUSE_PUZZLE: SoundDefinition = {
  channel: DAILY_DISPATCH_MUSIC_CHANNEL,
  sprite: 'music_1',
  volume: 0.4,
};
