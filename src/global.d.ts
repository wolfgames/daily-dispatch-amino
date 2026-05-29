/// <reference types="vite/client" />

declare module "qrcode-terminal" {
  export function generate(url: string, options?: { small?: boolean }): void;
}

declare module "@wolfgames/components/solid" {
  import type { Accessor, Component, ParentComponent } from "solid-js";
  import type { AnalyticsService } from "@wolfgames/game-kit";
  import type { Manifest } from "@wolfgames/components/core";
  import type { ViewportMode } from "@wolfgames/components/core";

  type AnalyticsParamValidator = {
    infer: unknown;
  } & ((data: unknown) => unknown);

  export type AnalyticsServiceWithDefaults = AnalyticsService<
    Record<string, AnalyticsParamValidator>,
    Record<string, unknown>,
    unknown
  >;

  export const Spinner: Component<{
    size?: "sm" | "md" | "lg";
    class?: string;
  }>;

  export const DevOnly: ParentComponent;
  export const AnalyticsProvider: ParentComponent;
  export const GameConfigProvider: ParentComponent<{ debug?: boolean }>;
  export const ManifestProvider: ParentComponent<{
    manifest: Manifest;
    defaultGameData?: unknown;
    fetchUrl?: string | null;
  }>;
  export const PauseProvider: ParentComponent;
  export const ViewportModeWrapper: ParentComponent;
  export const ViewportToggle: Component;
  export const ViewportProvider: ParentComponent<{
    initialMode?: ViewportMode;
    onModeChange?: (mode: ViewportMode) => void;
  }>;
  export const GameManifestProvider: ParentComponent<{
    manifest: Manifest;
    defaultGameData?: unknown;
  }>;

  export function useAnalyticsService(): AnalyticsServiceWithDefaults;
  export function useConfigState(): {
    service: {
      get(): { projectId?: string } | undefined;
    };
  };
  export function useGameConfig(): {
    ready(): boolean;
    isProduction(): boolean;
  };
  export function useManifest(): {
    manifest: Accessor<Manifest>;
    gameData: Accessor<unknown | null>;
    mode: Accessor<"standalone" | "injected">;
    injectData(data: unknown): void;
  };
  export function useSignal<T>(signal: {
    get(): T;
    subscribe(fn: (value: T) => void): () => void;
  }): Accessor<T>;
}
