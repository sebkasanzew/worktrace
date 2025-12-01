import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import "./i18n"
import packageJson from "../package.json"

// Signal that the main script has started loading
declare global {
  interface Window {
    __APP_INIT_STARTED__?: boolean
    __APP_INIT_COMPLETE__?: boolean
    __DEBUG_LOGS__?: string[]
    resetConfig?: () => Promise<void>
  }
}

// Debug logging function that syncs with early debug panel
function debugLog(msg: string) {
  const timestamp = new Date().toISOString().substr(11, 12)
  const entry = `[${timestamp}] ${msg}`
  window.__DEBUG_LOGS__ = window.__DEBUG_LOGS__ || []
  window.__DEBUG_LOGS__.push(entry)

  const debugEl = document.getElementById("early-debug")
  if (debugEl) {
    debugEl.classList.add("show")
    debugEl.textContent = window.__DEBUG_LOGS__.join("\n")
    debugEl.scrollTop = debugEl.scrollHeight
  }
}

debugLog("main.tsx module loaded")
window.__APP_INIT_STARTED__ = true
debugLog("__APP_INIT_STARTED__ = true")

// Track if we've already shown an error to prevent multiple error screens
let hasShownError = false

// Global error handler for uncaught errors (before React mounts)
function showFatalError(error: unknown) {
  if (hasShownError) return
  hasShownError = true

  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0a0a0a; color: #fafafa; font-family: system-ui, sans-serif; padding: 1rem;">
      <div style="max-width: 32rem; width: 100%; background: #1a1a1a; border-radius: 0.5rem; padding: 1.5rem; border: 1px solid #333;">
        <div style="text-align: center; margin-bottom: 1rem;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; background: rgba(239, 68, 68, 0.1); border-radius: 50%; margin-bottom: 1rem;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
            </svg>
          </div>
          <h1 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0;">Something went wrong</h1>
          <p style="color: #888; margin: 0; font-size: 0.875rem;">The app failed to start. Please try reloading or check for updates.</p>
        </div>
        <div style="background: #0a0a0a; padding: 0.75rem; border-radius: 0.375rem; margin-bottom: 1rem;">
          <p style="color: #ef4444; font-size: 0.875rem; margin: 0; word-break: break-word;">${errorMessage}</p>
          ${errorStack ? `<pre style="color: #666; font-size: 0.75rem; margin: 0.5rem 0 0 0; white-space: pre-wrap; word-break: break-word; max-height: 150px; overflow-y: auto;">${errorStack}</pre>` : ""}
        </div>
        <div style="text-align: center; color: #666; font-size: 0.875rem; margin-bottom: 1rem;">
          App Version: ${packageJson.version}
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <button onclick="window.location.reload()" style="width: 100%; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
            Reload App
          </button>
          <button onclick="resetConfig()" style="width: 100%; padding: 0.5rem 1rem; background: #374151; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
            Reset Config & Reload
          </button>
        </div>
      </div>
    </div>
  `
}

window.resetConfig = async () => {
  try {
    // Try to reset all config via Tauri command if available
    if (window.__TAURI_INTERNALS__) {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("reset_all_config")
    }
  } catch {
    // Ignore errors during reset
  }
  window.location.reload()
}

// Check if we should enable global error handlers
// Enable in production builds OR when running in Tauri (but NOT in Playwright tests)
// navigator.webdriver is true when Playwright is controlling the browser
const shouldEnableGlobalErrorHandler =
  !navigator.webdriver &&
  (!import.meta.env.DEV ||
    !!window.__TAURI_INTERNALS__ ||
    new URLSearchParams(window.location.search).has("testFatalError"))

if (shouldEnableGlobalErrorHandler) {
  window.onerror = (message, _source, _lineno, _colno, error) => {
    showFatalError(error || message)
  }

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    showFatalError(event.reason)
  }
}

async function initApp() {
  debugLog("initApp() called")

  if (import.meta.env.DEV && !window.__TAURI_INTERNALS__ && !navigator.webdriver) {
    debugLog("Loading mock-tauri (dev mode)")
    await import("./lib/mock-tauri")
    debugLog("mock-tauri loaded")
  }

  // Check for early error preview route (for testing)
  if (new URLSearchParams(window.location.search).has("previewEarlyError")) {
    debugLog("Loading early error preview")
    const { EarlyErrorPreview } = await import("./components/EarlyErrorPreview")
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <EarlyErrorPreview />
      </React.StrictMode>
    )
    window.__APP_INIT_COMPLETE__ = true
    return
  }

  debugLog("Rendering React app")
  const rootEl = document.getElementById("root")
  debugLog(`Root element: ${rootEl ? "found" : "NOT FOUND"}`)

  ReactDOM.createRoot(rootEl as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  debugLog("React.render called")

  // Signal that initialization is complete
  window.__APP_INIT_COMPLETE__ = true
  debugLog("__APP_INIT_COMPLETE__ = true")
}

debugLog("Calling initApp()")
initApp().catch((error) => {
  debugLog(`initApp error: ${error}`)
  showFatalError(error)
})
