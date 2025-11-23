import { expect, test } from "@playwright/test"
import { mockJiraConfig } from "./mocks/jira"
import { injectCommandMock } from "./utils/tauri"

// Helper update metadata matching the plugin's expected shape
const updateMetadata = {
  rid: 1,
  currentVersion: "0.1.0",
  version: "0.2.0",
  date: new Date().toISOString(),
  body: "Test release",
  rawJson: {},
}

// Opens the app and triggers the menu event to check for updates
async function triggerUpdateCheck(page: import("@playwright/test").Page) {
  await page.goto("/?openUpdate=1&mockUpdate=1&mockVersion=0.2.0")
  // Wait for initial DOM to be ready (avoid depending on specific view)
  await page.waitForLoadState("domcontentloaded")
}

test.describe("Updater", () => {
  test("shows update card once and can be dismissed", async ({ page }) => {
    // Mock stored JIRA config so app loads TaskList view
    await mockJiraConfig({ page })

    // Add mocks: updater check returns an available update
    await injectCommandMock(page, "plugin:updater|check", updateMetadata)

    await triggerUpdateCheck(page)

    // Try dispatching the app's test event a few times until the effect is ready
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => {
        window.dispatchEvent(new Event("worktrace:triggerUpdateCheck"))
      })
      // small pause between retries
      await page.waitForTimeout(250)
      const count = await page.getByText("Update Available").count()
      if (count > 0) break
    }

    // Expect update card visible with version
    await expect(page.getByText("Update Available")).toBeVisible()
    await expect(page.getByText(/Version 0\.2\.0 is now available/)).toBeVisible()

    // Dismiss via "Later"
    await page.getByRole("button", { name: "Later" }).click()

    // Card should disappear and not immediately re-open
    await expect(page.getByText("Update Available")).toHaveCount(0)

    // Trigger again: card should show again (fresh check)
    await triggerUpdateCheck(page)
    await expect(page.getByText("Update Available")).toBeVisible()
  })
})
