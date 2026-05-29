import gsap from 'gsap';
import { Container, Graphics, NineSliceSprite, Sprite, Text } from 'pixi.js';
import type { PixiLoader } from '~/core/systems/assets';
import { GAME_FONT_FAMILY } from '~/game/config';

const ATLAS_NAME = 'scene-daily-dispatch';

export type MartyPose = 'talking' | 'popup' | 'idle' | 'thumbsup' | 'surprised';

const MARTY_SPRITES: Record<MartyPose, string> = {
  talking: 'character-marty_talking.png',
  popup: 'character-marty_popup.png',
  idle: 'character-marty_idle.png',
  thumbsup: 'character-marty_thumbsup.png',
  surprised: 'character-marty_surprised.png',
};

const MARTY_BASE_SIZE = {
  width: 135,
  height: 244,
};

function requireTexture(
  gpuLoader: PixiLoader,
  frame: string,
) {
  const texture = gpuLoader.getTexture(ATLAS_NAME, frame);
  if (!texture) {
    throw new Error(`Daily Dispatch frame missing from ${ATLAS_NAME}: ${frame}`);
  }
  return texture;
}

function requireSprite(gpuLoader: PixiLoader, frame: string): Sprite {
  const sprite = gpuLoader.createSprite(ATLAS_NAME, frame);
  if (!sprite) {
    throw new Error(`Daily Dispatch frame missing from ${ATLAS_NAME}: ${frame}`);
  }
  return sprite;
}

export class DailyDispatchCharacterSprite extends Container {
  private readonly sprite: Sprite;

  constructor(gpuLoader: PixiLoader, pose: MartyPose, scale = 1) {
    super();
    this.label = `daily-dispatch-marty-${pose}`;
    this.sprite = requireSprite(gpuLoader, MARTY_SPRITES[pose]);
    this.sprite.anchor.set(0.5);
    this.sprite.width = MARTY_BASE_SIZE.width * scale;
    this.sprite.height = MARTY_BASE_SIZE.height * scale;
    this.addChild(this.sprite);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
    super.destroy(options ?? { children: true });
  }
}

export class DailyDispatchDialogueBox extends Container {
  private readonly boxSprite: NineSliceSprite;
  private readonly textField: Text;

  constructor(
    gpuLoader: PixiLoader,
    options: {
      width?: number;
      screenWidth?: number;
      screenHeight?: number;
      fontSize?: number;
      lineHeight?: number;
      heightScale?: number;
    } = {},
  ) {
    super();
    this.label = 'daily-dispatch-dialogue-box';
    const targetWidth =
      options.screenWidth != null
        ? Math.min(options.screenWidth * 0.9, 600)
        : (options.width ?? 390);
    const targetHeight = 90 * (options.heightScale ?? 1);
    this.boxSprite = new NineSliceSprite({
      texture: requireTexture(gpuLoader, 'ui-dialogue.png'),
      leftWidth: 20,
      topHeight: 20,
      rightWidth: 20,
      bottomHeight: 20,
    });
    this.boxSprite.width = targetWidth;
    this.boxSprite.height = targetHeight;
    this.addChild(this.boxSprite);

    this.textField = new Text({
      text: '',
      style: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: options.fontSize ?? 18,
        fill: 0x2c2c2c,
        wordWrap: true,
        wordWrapWidth: targetWidth - 40,
        lineHeight: options.lineHeight ?? 26,
      },
    });
    this.textField.anchor.set(0, 0.5);
    this.textField.x = 20;
    this.textField.y = targetHeight / 2;
    this.addChild(this.textField);

    if (options.screenWidth != null && options.screenHeight != null) {
      this.x = options.screenWidth / 2 - targetWidth / 2;
      this.y = options.screenHeight - 40;
    }
    this.alpha = 1;
  }

  setText(text: string): void {
    this.textField.text = text;
    const nextHeight = Math.max(90, this.textField.height + 40);
    this.boxSprite.height = nextHeight;
    this.textField.y = nextHeight / 2;
  }

  getWidth(): number {
    return this.boxSprite.width;
  }

  getHeight(): number {
    return this.boxSprite.height;
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
    super.destroy(options ?? { children: true });
  }
}

export class DailyDispatchSpriteButton extends Container {
  private readonly labelText: Text;

  constructor(
    gpuLoader: PixiLoader,
    label: string,
    onClick: () => void,
    width = 160,
    height = 60,
  ) {
    super();
    this.label = `daily-dispatch-button-${label.toLowerCase()}`;
    const sprite = new NineSliceSprite({
      texture: requireTexture(gpuLoader, 'ui-button_start.png'),
      leftWidth: 32,
      topHeight: 32,
      rightWidth: 32,
      bottomHeight: 32,
    });
    sprite.width = width;
    sprite.height = height;
    sprite.pivot.set(width / 2, height / 2);
    this.addChild(sprite);

    this.labelText = new Text({
      text: label,
      style: {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xffffff,
        stroke: { color: 0x1f1712, width: 3 },
      },
    });
    this.labelText.anchor.set(0.5);
    this.addChild(this.labelText);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', onClick);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
    this.removeAllListeners();
    super.destroy(options ?? { children: true });
  }
}

export class DailyDispatchStoryOverlay extends Container {
  private readonly backdrop = new Graphics();
  private readonly dialogue: DailyDispatchDialogueBox;
  private readonly marty: DailyDispatchCharacterSprite;
  private readonly continueButton: DailyDispatchSpriteButton;

  constructor(
    gpuLoader: PixiLoader,
    private readonly onContinue: () => void,
  ) {
    super();
    this.label = 'daily-dispatch-story-overlay';
    this.eventMode = 'passive';

    this.addChild(this.backdrop);
    this.dialogue = new DailyDispatchDialogueBox(gpuLoader, {
      width: 390,
      fontSize: 18,
      lineHeight: 25,
    });
    this.marty = new DailyDispatchCharacterSprite(gpuLoader, 'talking', 0.92);
    this.continueButton = new DailyDispatchSpriteButton(
      gpuLoader,
      'NEXT',
      this.onContinue,
    );
    this.addChild(this.dialogue, this.marty, this.continueButton);
    this.alpha = 0;
  }

  show(text: string, screenWidth: number, screenHeight: number): void {
    this.backdrop.clear();
    this.backdrop.rect(0, 0, screenWidth, screenHeight);
    this.backdrop.fill({ color: 0x000000, alpha: 0.62 });
    this.backdrop.eventMode = 'static';
    this.backdrop.cursor = 'pointer';
    this.backdrop.removeAllListeners();
    this.backdrop.on('pointertap', this.onContinue);

    this.dialogue.setText(text);
    this.dialogue.x = screenWidth / 2 - this.dialogue.getWidth() / 2;
    this.dialogue.y = screenHeight * 0.36;

    this.marty.x = screenWidth / 2;
    this.marty.y = this.dialogue.y + this.dialogue.getHeight() + 112;

    this.continueButton.x = screenWidth / 2;
    this.continueButton.y = Math.min(screenHeight - 70, this.marty.y + 96);

    this.visible = true;
    this.alpha = 0;
    this.marty.alpha = 0;
    this.marty.y += 24;
    this.dialogue.scale.set(0.92);
    this.continueButton.alpha = 0;

    gsap.to(this, { alpha: 1, duration: 0.3, ease: 'power2.out' });
    gsap.to(this.dialogue.scale, {
      x: 1,
      y: 1,
      duration: 0.35,
      ease: 'back.out(1.4)',
    });
    gsap.to(this.marty, {
      alpha: 1,
      y: this.marty.y - 24,
      duration: 0.4,
      ease: 'power2.out',
    });
    gsap.to(this.continueButton, {
      alpha: 1,
      duration: 0.25,
      delay: 0.2,
      ease: 'power2.out',
    });
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.dialogue.scale);
    gsap.killTweensOf(this.marty);
    gsap.killTweensOf(this.continueButton);
    this.backdrop.removeAllListeners();
    super.destroy(options ?? { children: true });
  }
}

export class DailyDispatchCluePopup extends Container {
  private readonly dialogue: DailyDispatchDialogueBox;
  private readonly marty: DailyDispatchCharacterSprite;
  private readonly continueButton: DailyDispatchSpriteButton;

  constructor(
    gpuLoader: PixiLoader,
    private readonly onContinue: () => void,
  ) {
    super();
    this.label = 'daily-dispatch-clue-popup';
    this.dialogue = new DailyDispatchDialogueBox(gpuLoader, {
      width: 390,
      fontSize: 16,
      lineHeight: 22,
    });
    this.marty = new DailyDispatchCharacterSprite(gpuLoader, 'popup', 0.78);
    this.continueButton = new DailyDispatchSpriteButton(
      gpuLoader,
      'CONTINUE',
      this.onContinue,
      176,
      54,
    );
    this.addChild(this.dialogue, this.marty, this.continueButton);
    this.alpha = 0;
  }

  show(
    text: string,
    screenWidth: number,
    screenHeight: number,
    canContinue: boolean,
  ): void {
    this.dialogue.setText(text);
    this.dialogue.x = screenWidth / 2 - this.dialogue.getWidth() / 2;
    this.dialogue.y = screenHeight * 0.7;
    this.marty.x = this.dialogue.x + 54;
    this.marty.y = this.dialogue.y + this.dialogue.getHeight() - 14;
    this.continueButton.x = screenWidth / 2;
    this.continueButton.y = this.dialogue.y + this.dialogue.getHeight() + 42;
    this.continueButton.visible = canContinue;
    this.continueButton.alpha = canContinue ? 1 : 0;

    this.visible = true;
    this.alpha = 0;
    this.scale.set(0.92);
    gsap.to(this, { alpha: 1, duration: 0.18, ease: 'power2.out' });
    gsap.to(this.scale, {
      x: 1,
      y: 1,
      duration: 0.35,
      ease: 'back.out(1.7)',
    });
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
    super.destroy(options ?? { children: true });
  }
}

