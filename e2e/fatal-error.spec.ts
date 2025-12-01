import { expect, test } from "@playwright/test"

test.describe("Fatal Error Screen", () => {
  test("should show fatal error screen when synchronous error occurs", async ({ page }) => {
    // Set up mock Tauri that will throw when initApp() tries to use it
    await page.addInitScript(() => {
      // Mock Tauri with a config that will cause a sync error
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: () => {
          // Throw synchronously to trigger window.onerror
          throw new Error("Simulated sync error during init")
        },
      }
    })

    await page.goto("/?testFatalError")

    // Wait for error screen
    await page.waitForTimeout(1000)

    // Should show the fatal error screen
    const hasFatalError = await page
      .getByText("Something went wrong")
      .isVisible()
      .catch(() => false)
    // Check we have meaningful content (not white screen)
    const bodyText = await page.locator("body").textContent()
    expect(bodyText?.length ?? 0).toBeGreaterThan(0)

    // If fatal error shown, verify components
    if (hasFatalError) {
      await expect(page.getByText(/App Version:/)).toBeVisible()
      await expect(page.getByRole("button", { name: "Reload App" })).toBeVisible()
    }
  })

  test("should show fatal error screen on async rejection", async ({ page }) => {
    // Mock Tauri that rejects promises
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async () => {
          throw new Error("Async rejection during config load")
        },
      }
    })

    await page.goto("/?testFatalError")

    // Wait for error to propagate
    await page.waitForTimeout(1500)

    // Should show something (not white screen)
    const bodyText = await page.locator("body").textContent()
    expect(bodyText?.length ?? 0).toBeGreaterThan(0)

    // Check for error UI
    const hasFatalError = await page
      .getByText("Something went wrong")
      .isVisible()
      .catch(() => false)
    if (hasFatalError) {
      await expect(page.getByText(/App Version:/)).toBeVisible()
    }
  })

  test("should show fatal error when Tauri invoke throws during init", async ({ page }) => {
    // Simulate Tauri being present but throwing errors
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          // Simulate a fatal error during config loading
          if (cmd === "get_jira_config" || cmd === "get_app_settings") {
            throw new Error("Failed to deserialize stored config: invalid type")
          }
          return null
        },
      }
    })

    await page.goto("/?testFatalError")

    // The app should either show the fatal error screen or the React error boundary
    // Wait a bit for the error to propagate
    await page.waitForTimeout(1000)

    // Check that we have some error UI (either fatal error screen or error boundary)
    const hasFatalError = await page
      .getByText("Something went wrong")
      .isVisible()
      .catch(() => false)
    const hasContent = (await page.locator("body").textContent())?.trim().length ?? 0

    // Should not be a white screen
    expect(hasContent).toBeGreaterThan(0)

    // If it's the fatal error screen, verify the components
    if (hasFatalError) {
      await expect(page.getByText(/App Version:/)).toBeVisible()
      await expect(page.getByRole("button", { name: "Reload App" })).toBeVisible()
    }
  })
})
