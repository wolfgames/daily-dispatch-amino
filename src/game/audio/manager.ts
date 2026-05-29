/**
 * Game Audio Manager — Template
 *
 * Extends BaseAudioManager with game-specific sound methods.
 * Add your playback methods here (e.g. playExplosion, playLevelComplete).
 *
 * Inherited from BaseAudioManager:
 * - playSound() / playRandomSound() — sound playback
 * - startMusic() / stopMusic() — music playback
 * - isMusicPlaying() — music state check
 */

import type { AudioLoader } from '~/core/systems/assets/loaders/audio';
import { BaseAudioManager } from '~/core/systems/audio';
import {
  MUSIC_WAREHOUSE_PUZZLE,
  SOUND_BLOCK_EXIT,
  SOUND_BLOCK_SLIDE,
  SOUND_BUTTON_CLICK,
  SOUND_CHAPTER_COMPLETE,
  SOUND_LEVEL_COMPLETE,
  SOUND_TRUCK_DOOR_CLOSE,
  SOUND_TRUCK_DRIVE_AWAY,
} from './sounds';

export class GameAudioManager extends BaseAudioManager {
  constructor(audioLoader: AudioLoader) {
    super(audioLoader);
  }

  playButtonClick(): void {
    this.playSound(SOUND_BUTTON_CLICK);
  }

  playBlockSlide(): void {
    this.playSound(SOUND_BLOCK_SLIDE);
  }

  playBlockExit(): void {
    this.playSound(SOUND_BLOCK_EXIT);
  }

  playTruckDoorClose(): void {
    this.playSound(SOUND_TRUCK_DOOR_CLOSE);
  }

  playTruckDriveAway(): void {
    this.playSound(SOUND_TRUCK_DRIVE_AWAY);
  }

  playLevelComplete(): void {
    this.playSound(SOUND_LEVEL_COMPLETE);
  }

  playChapterComplete(): void {
    this.playSound(SOUND_CHAPTER_COMPLETE);
  }

  startGameMusic(): void {
    this.startMusic(MUSIC_WAREHOUSE_PUZZLE);
  }
}
