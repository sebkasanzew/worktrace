import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import "./i18n"
import packageJson from "../package.json"

// Global error handler for uncaught errors (before React mounts)
function showFatalError(error: unknown) {
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
          ${errorStack ? `<pre style="color: #666; font-size: 0.75rem; margin: 0.5rem 0 0 0; white-space: pre-wrap; word-break: break-word;">${errorStack}</pre>` : ""}
        </div>
        <div style="text-align: center; color: #666; font-size: 0.875rem; margin-bottom: 1rem;">
          App Version: ${packageJson.version}
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <button onclick="window.location.reload()" style="width: 100%; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem;">
            Reload App
          </button>
        </div>
      </div>
    </div>
  `
}

// Track if we've already shown an error to prevent multiple error screens
let hasShownError = false

// Check if we should enable global error handlers
// In production: always enabled
// In dev/test: enabled via URL param for e2e testing
const shouldEnableGlobalErrorHandler =
  !import.meta.env.DEV || new URLSearchParams(window.location.search).has("testFatalError")

if (shouldEnableGlobalErrorHandler) {
  window.onerror = (message, _source, _lineno, _colno, error) => {
    if (hasShownError) return
    hasShownError = true
    showFatalError(error || message)
  }

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    if (hasShownError) return
    hasShownError = true
    showFatalError(event.reason)
  }
}

async function initApp() {
  if (import.meta.env.DEV && !window.__TAURI_INTERNALS__ && !navigator.webdriver) {
    await import("./lib/mock-tauri")
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

initApp().catch((error) => {
  // In production, show the error screen
  if (!import.meta.env.DEV && !hasShownError) {
    hasShownError = true
    showFatalError(error)
  }
})
