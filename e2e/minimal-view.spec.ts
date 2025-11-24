import { expect, test } from "@playwright/test"
import { getDefaultMockConfig, getDefaultMockUserSession } from "./mocks/jira"
import { setupTauriMocks } from "./utils/tauri"

test.describe("Minimal View", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Tauri API
    await setupTauriMocks(page, {
      get_jira_config: getDefaultMockConfig(),
      jira_get_current_user: getDefaultMockUserSession(),
      jira_api_request: {
        issues: [
          {
            id: "10001",
            key: "TEST-123",
            fields: {
              summary: "Test Issue",
              status: {
                name: "In Progress",
                statusCategory: { key: "indeterminate", name: "In Progress" },
              },
              assignee: { displayName: "Test User", emailAddress: "test@example.com" },
              created: 1732350000000,
              updated: 1732350000000,
              issuetype: { name: "Task", subtask: false }, subtasks: [],
            },
          },
        ],
        total: 1,
        isLast: true,
      },
      get_app_settings: {
        general: {
          theme: "system",
          worklogTypes: [],
          defaultWorklogDescription: "",
          enableAutomaticUpdates: false,
          alwaysOnTop: false,
          customIssueKeys: [],
        },
        jira: {
          instanceUrl: "https://test.atlassian.net",
          username: "test@example.com",
          apiToken: "test-token",
        },
      },
      save_app_settings: null,
      set_mini_mode: null,
    })
    await page.goto("/")
  })

  test("should switch to minimal view and back", async ({ page }) => {
    // Wait for task list to load
    await expect(page.getByText("My JIRA Issues")).toBeVisible()

    // Click Mini Mode button
    await page.getByLabel("Mini Mode").click()

    // Verify Minimal View is shown
    // The minimal view has a maximize button and "No active task" text initially
    await expect(page.getByText("No active task")).toBeVisible()
    await expect(page.getByText("00:00:00")).toBeVisible()

    // Click Maximize button to go back
    await page
      .locator("button")
      .filter({ has: page.locator(".lucide-maximize-2") })
      .click()

    // Verify Task List is shown again
    await expect(page.getByText("My JIRA Issues")).toBeVisible()
  })

  test("should show active task in minimal view", async ({ page }) => {
    // Start a task first
    await expect(page.getByText("My JIRA Issues")).toBeVisible()
    // Wait for issue to be visible
    await expect(page.getByText("TEST-123")).toBeVisible()
    await page.getByText("Start").first().click()

    // Switch to minimal view
    await page.getByLabel("Mini Mode").click()

    // Verify active task key is shown
    await expect(page.getByText("TEST-123")).toBeVisible()

    // Verify Stop button is visible
    await expect(page.getByText("Stop")).toBeVisible()
  })

  test("should toggle always on top", async ({ page }) => {
    await page.getByLabel("Mini Mode").click()

    const checkbox = page.getByLabel("Always on Top")
    await expect(checkbox).toBeVisible()
    await expect(checkbox).not.toBeChecked()

    await checkbox.click()
    // Wait for the state to update
    await expect(checkbox).toBeChecked({ timeout: 5000 })
  })
})
