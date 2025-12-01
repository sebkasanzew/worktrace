/**
 * Preview component for the early error screen (from index.html)
 * This is only used for testing/development purposes
 *
 * Uses inline styles to match the index.html early error handler exactly
 */
export function EarlyErrorPreview() {
  const mockError = {
    message: "Preview: Simulated initialization failure",
    stack:
      "Error: Preview: Simulated initialization failure\n    at initApp (main.tsx:42)\n    at async bootstrap",
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1rem",
      }}
    >
      <div
        style={{
          maxWidth: "32rem",
          width: "100%",
          background: "#1a1a1a",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          border: "1px solid #333",
        }}
      >
        <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem" }}>Something went wrong</h1>
        <p style={{ margin: 0, color: "#888", fontSize: "0.875rem" }}>
          The app failed to start. Please try resetting the configuration.
        </p>
        <pre
          style={{
            background: "#0a0a0a",
            padding: "0.75rem",
            borderRadius: "0.375rem",
            color: "#ef4444",
            fontSize: "0.75rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "200px",
            overflowY: "auto",
            margin: "1rem 0",
          }}
        >
          {mockError.message}
          {"\n\n"}
          {mockError.stack}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            marginTop: "0.5rem",
          }}
        >
          Reload App
        </button>
        <button
          type="button"
          onClick={() => alert("Reset Config would be called here")}
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            background: "#374151",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            marginTop: "0.5rem",
          }}
        >
          Reset Config &amp; Reload
        </button>
      </div>
    </div>
  )
}
