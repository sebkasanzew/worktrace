// Type definitions for Playwright E2E tests

interface TauriInternals {
  metadata: {
    currentWindow: { label: string };
    currentWebview: { windowLabel: string; label: string };
  };
  invoke: (cmd: string, args: unknown) => Promise<unknown>;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__: TauriInternals;
  }
}

export {};
