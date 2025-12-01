import { expect, test } from "@playwright/test"
import { getDefaultMockUserWorklogs } from "./mocks/jira"
import { setupTauriMocks } from "./utils/tauri"

test.describe("Worklog Calendar & Today Indicator", () => {
  test.beforeEach(async ({ page }) => {
    // Setup all mocks including user worklogs
    await setupTauriMocks(page, {
      get_jira_config: {
        instanceUrl: "https://test.atlassian.net",
        username: "test@example.com",
        apiToken: "test-token",
        apiVersion: "3",
        authType: "basic",
      },
      jira_get_current_user: {
        name: "Test User",
        apiVersion: "3",
        authType: "basic",
      },
      jira_api_request: {
        issues: [],
        total: 0,
        isLast: true,
      },
      jira_get_user_worklogs_by_date_range: getDefaultMockUserWorklogs(),
    })

    await page.goto("/")
  })

  test("shows today's tracked time in header", async ({ page }) => {
    // Wait for the indicator to appear
    const indicator = page.getByText(/Today: 2h 0m/)
    await expect(indicator).toBeVisible()

    // Check badge count - Badge is inside the Button component
    await expect(page.locator("button").getByText("1")).toBeVisible()
  })

  test("opens detail dialog when clicking indicator", async ({ page }) => {
    await page.getByText(/Today: 2h 0m/).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await expect(dialog.getByText("Total Time Tracked")).toBeVisible()
    await expect(dialog.getByText("TEST-1")).toBeVisible()
    await expect(dialog.getByText("Test Issue 1")).toBeVisible()
    // Time is shown in a Badge as "2h" - use exact match to avoid ambiguity
    await expect(dialog.getByText("2h", { exact: true })).toBeVisible()
  })
})
