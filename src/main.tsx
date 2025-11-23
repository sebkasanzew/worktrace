import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import "./i18n"

if (import.meta.env.DEV && !window.__TAURI_INTERNALS__ && !navigator.webdriver) {
  await import("./lib/mock-tauri")
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
