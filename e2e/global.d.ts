// Type definitions for Playwright E2E tests

interface TauriInternals {
    metadata: {
        currentWindow: { label: string };
        currentWebview: { windowLabel: string; label: string };
    };
    invoke: (cmd: string, args: any) => Promise<any>;
}

declare global {
    interface Window {
        __TAURI_INTERNALS__: TauriInternals;
    }
}

export { };
