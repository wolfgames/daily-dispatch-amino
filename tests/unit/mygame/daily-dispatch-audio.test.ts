import { describe, expect, it, vi } from 'vitest';
import { GameAudioManager } from '~/game/audio/manager';

describe('daily dispatch audio manager', () => {
  it('maps active source-equivalent cues to Daily Dispatch audio sprites', () => {
    const play = vi.fn(() => 1);
    const manager = new GameAudioManager({
      play,
      stop: vi.fn(),
      setMasterVolume: vi.fn(),
    });

    manager.playBlockSlide();
    manager.playBlockExit();
    manager.playTruckDoorClose();
    manager.playTruckDriveAway();
    manager.playLevelComplete();

    expect(play.mock.calls).toEqual([
      [
        'audio-sfx-daily-dispatch',
        'block_slide',
        { volume: 0.5 },
      ],
      ['audio-sfx-daily-dispatch', 'block_exit', { volume: 0.7 }],
      [
        'audio-sfx-daily-dispatch',
        'truck_door_close',
        { volume: 0.6 },
      ],
      [
        'audio-sfx-daily-dispatch',
        'truck_drive_away',
        { volume: 0.5 },
      ],
      ['audio-sfx-daily-dispatch', 'level_complete', { volume: 0.8 }],
    ]);
  });
});
