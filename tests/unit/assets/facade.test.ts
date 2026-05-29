/**
 * Tests for scaffold's createCoordinatorFacade — the thin wrapper
 * over game-components' createAssetFacade.
 *
 * Validates scaffold-specific behavior:
 * - Parameterless initGpu() auto-creates a PixiLoader
 * - audio.play / audio.setMasterVolume / audio.unlock
 * - getGpuLoader() returns the auto-created loader
 * - Underlying facade methods are delegated correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@wolfgames/components/core', () => {
  const createSignal = (initial: unknown) => {
    let value = initial;
    const subscribers = new Set<(value: unknown) => void>();
    return {
      get: vi.fn(() => value),
      set: vi.fn((next: unknown) => {
        value = next;
        for (const subscriber of subscribers) subscriber(value);
      }),
      subscribe: vi.fn((subscriber: (value: unknown) => void) => {
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
      }),
    };
  };
  const createDomLoader = vi.fn(() => ({
    init: vi.fn(),
    loadBundle: vi.fn(async () => {}),
    getSpritesheet: vi.fn(() => null),
    unloadBundle: vi.fn(),
    dispose: vi.fn(),
  }));
  const createAssetCoordinator = vi.fn(({ loaders }: { loaders?: Record<string, unknown> }) => {
    const loaded: string[] = [];
    const loaderMap = new Map(Object.entries(loaders ?? {}));
    const loadingState = createSignal({ loading: [], loaded, errors: {}, bundleProgress: {}, progress: 0, backgroundLoading: [], unloaded: [] });
    return {
      loadBundle: vi.fn(async (name: string) => { loaded.push(name); }),
      isLoaded: vi.fn((name: string) => loaded.includes(name)),
      initLoader: vi.fn((type: string, loader: unknown) => {
        loaderMap.set(type, loader);
      }),
      getLoader: vi.fn((type: string) => loaderMap.get(type) ?? null),
      unloadBundle: vi.fn((name: string) => {
        const index = loaded.indexOf(name);
        if (index >= 0) loaded.splice(index, 1);
      }),
      unloadBundles: vi.fn(),
      loadingState,
      dispose: vi.fn(),
      _loaders: loaders,
    };
  });

  return {
    createAssetCoordinator,
    createDomLoader,
    createSignal,
    KIND_TO_PREFIX: { boot: 'boot-', core: 'core-', theme: 'theme-', audio: 'audio-', scene: 'scene-', fx: 'fx-', data: 'data-' },
    KIND_TO_LOADER: { boot: 'dom', core: 'gpu', theme: 'dom', audio: 'audio', scene: 'gpu', fx: 'gpu', data: 'dom' },
    validateManifest: vi.fn(() => ({ valid: true, errors: [] })),
  };
});

vi.mock('@wolfgames/components/howler', () => {
  const mockHowl = { play: vi.fn(() => 1), volume: vi.fn() };
  const createHowlerLoader = vi.fn(() => ({
    init: vi.fn(),
    loadBundle: vi.fn(async () => {}),
    get: vi.fn((alias: string) => alias === 'sfx' ? mockHowl : null),
    has: vi.fn(() => false),
    stop: vi.fn(),
    setVolume: vi.fn(),
    getVolume: vi.fn(() => 1),
    unlock: vi.fn(async () => {}),
    unloadBundle: vi.fn(),
    dispose: vi.fn(),
    _mockHowl: mockHowl,
  }));
  return { createHowlerLoader };
});

vi.mock('@wolfgames/components/pixi', () => {
  const mockPixiLoader = {
    init: vi.fn(),
    loadBundle: vi.fn(async () => {}),
    get: vi.fn(() => null),
    has: vi.fn(() => false),
    unloadBundle: vi.fn(),
    dispose: vi.fn(),
  };
  const createPixiLoader = vi.fn(() => mockPixiLoader);
  return { createPixiLoader };
});

import { createCoordinatorFacade } from '~/core/systems/assets/facade';
import type { Manifest } from '@wolfgames/components/core';

const testManifest: Manifest = {
  cdnBase: '/assets',
  bundles: [
    { name: 'boot-splash', assets: [{ alias: 'spinner', src: 'spinner.png' }] },
    { name: 'audio-sfx', assets: [{ alias: 'click', src: 'click.json' }] },
  ],
};

describe('createCoordinatorFacade', () => {
  let facade: ReturnType<typeof createCoordinatorFacade>;

  beforeEach(() => {
    vi.clearAllMocks();
    facade = createCoordinatorFacade(testManifest);
  });

  it('delegates loadBoot to the underlying facade', async () => {
    await facade.loadBoot();
    expect(facade.loadBoot).toBeDefined();
  });

  it('initGpu() creates a PixiLoader automatically (no param)', async () => {
    const { createPixiLoader } = await import('@wolfgames/components/pixi');
    await facade.initGpu();
    expect(createPixiLoader).toHaveBeenCalled();
  });

  it('initGpu() is idempotent — second call reuses the same promise', async () => {
    const { createPixiLoader } = await import('@wolfgames/components/pixi');
    await facade.initGpu();
    await facade.initGpu();
    expect(createPixiLoader).toHaveBeenCalledTimes(1);
  });

  it('getGpuLoader() returns the auto-created loader after initGpu', async () => {
    expect(facade.getGpuLoader()).toBeNull();
    await facade.initGpu();
    expect(facade.getGpuLoader).toBeDefined();
  });

  it('audio.play delegates to HowlerLoader', () => {
    const result = facade.audio.play('sfx', 'click');
    expect(result).toBe(1);
  });

  it('audio.play returns -1 for unknown channel', () => {
    const result = facade.audio.play('nonexistent');
    expect(result).toBe(-1);
  });

  it('audio.play with volume option does not throw', () => {
    const result = facade.audio.play('sfx', 'click', { volume: 0.5 });
    expect(result).toBe(1);
  });

  it('audio.setMasterVolume does not throw', () => {
    expect(() => facade.audio.setMasterVolume(0.5)).not.toThrow();
  });

  it('audio.unlock delegates to howlerLoader', async () => {
    await facade.audio.unlock();
  });

  it('exposes loadingState and loadingStateSignal', () => {
    expect(typeof facade.loadingState).toBe('function');
    expect(facade.loadingStateSignal).toBeDefined();
    expect(typeof facade.loadingStateSignal.get).toBe('function');
    expect(typeof facade.loadingStateSignal.subscribe).toBe('function');
  });
});
