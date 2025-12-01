import { expect, test } from "@playwright/test"
import type { JiraSearchResponse, JiraSettings, JiraUserSession } from "../src/types/bindings"
import type { TauriCommand } from "./utils/tauri"

test.describe("Task List UI", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Tauri API with successful login and issues
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            // Return saved config to show task list
            return {
              instanceUrl: "https://test.atlassian.net",
              username: "test@example.com",
              apiToken: "test-token",
            } as const satisfies JiraSettings
          }
          if (cmd === "jira_get_current_user") {
            return {
              name: "Test User",
              apiVersion: "3",
              authType: "basic",
            } as const satisfies JiraUserSession
          }
          if (cmd === "jira_api_request") {
            // Mock JIRA search response
            return {
              issues: [
                {
                  id: "10001",
                  key: "TEST-123",
                  fields: {
                    summary: "Implement user authentication",
                    status: {
                      name: "In Progress",
                      statusCategory: { key: "indeterminate", name: "In Progress" },
                    },
                    assignee: {
                      displayName: "Test User",
                      emailAddress: "test@example.com",
                    },
                    created: Date.parse("2025-11-09T10:00:00.000Z"),
                    updated: Date.parse("2025-11-10T14:30:00.000Z"),
                    issuetype: { name: "Task", subtask: false },
                    subtasks: [],
                  },
                },
                {
                  id: "10002",
                  key: "TEST-456",
                  fields: {
                    summary: "Fix login bug",
                    status: {
                      name: "To Do",
                      statusCategory: { key: "new", name: "To Do" },
                    },
                    assignee: {
                      displayName: "Test User",
                      emailAddress: "test@example.com",
                    },
                    created: Date.parse("2025-11-11T08:00:00.000Z"),
                    updated: Date.parse("2025-11-12T09:15:00.000Z"),
                    issuetype: { name: "Task", subtask: false },
                    subtasks: [],
                  },
                },
                {
                  id: "10003",
                  key: "PROJ-789",
                  fields: {
                    summary: "Update documentation",
                    status: {
                      name: "Done",
                      statusCategory: { key: "done", name: "Done" },
                    },
                    assignee: {
                      displayName: "Test User",
                      emailAddress: "test@example.com",
                    },
                    created: Date.parse("2025-11-07T12:00:00.000Z"),
                    updated: Date.parse("2025-11-08T16:45:00.000Z"),
                    issuetype: { name: "Task", subtask: false },
                    subtasks: [],
                  },
                },
              ],
              total: 3,
              isLast: true,
            } as const satisfies JiraSearchResponse
          }
          if (cmd === "save_jira_config") {
            return Promise.resolve()
          }
          if (cmd === "clear_jira_config") {
            return Promise.resolve()
          }
          return Promise.reject(new Error(`Unknown command: ${cmd}`))
        },
      }
    })

    await page.goto("/")
  })

  test("should display task list header with title and controls", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "My JIRA Issues" })).toBeVisible()
    await expect(page.getByRole("button", { name: /refresh/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /logout/i })).toBeVisible()
  })

  test("should show all assigned issues", async ({ page }) => {
    // Wait for issues to load
    await expect(page.getByText("Showing 3 issues")).toBeVisible()

    // Check all three issues are displayed
    await expect(page.getByText("TEST-123")).toBeVisible()
    await expect(page.getByText("Implement user authentication")).toBeVisible()

    await expect(page.getByText("TEST-456")).toBeVisible()
    await expect(page.getByText("Fix login bug")).toBeVisible()

    await expect(page.getByText("PROJ-789")).toBeVisible()
    await expect(page.getByText("Update documentation")).toBeVisible()
  })

  test("should display issue details correctly", async ({ page }) => {
    // Wait for issues to load
    await expect(page.getByText("TEST-123")).toBeVisible()

    // Check issue key
    await expect(page.getByText("TEST-123")).toBeVisible()

    // Check summary
    await expect(page.getByText("Implement user authentication")).toBeVisible()

    // Check status badge
    await expect(page.getByText("In Progress")).toBeVisible()

    // Check assignee (use first() since multiple issues have the same assignee)
    await expect(page.getByText(/Assigned to: Test User/).first()).toBeVisible()

    // Check updated date (formatted)
    await expect(page.getByText(/Updated: 11\/10\/2025/)).toBeVisible()
  })

  test("should display different statuses for different issues", async ({ page }) => {
    // Wait for issues to load
    await expect(page.getByText("TEST-123")).toBeVisible()

    // Check all status badges
    await expect(page.getByText("In Progress")).toBeVisible()
    await expect(page.getByText("To Do")).toBeVisible()
    await expect(page.getByText("Done")).toBeVisible()
  })

  test("should show issue count", async ({ page }) => {
    await expect(page.getByText("Showing 3 issues")).toBeVisible()
  })

  test("should handle refresh button click", async ({ page }) => {
    // Wait for initial load
    await expect(page.getByText("TEST-123")).toBeVisible()

    const refreshButton = page.getByRole("button", { name: /refresh/i })
    await expect(refreshButton).toBeEnabled()

    // Click refresh
    await refreshButton.click()

    // Should still show issues after refresh (mock returns same data)
    await expect(page.getByText("TEST-123")).toBeVisible()
    await expect(page.getByText("Showing 3 issues")).toBeVisible()
  })

  test("should handle logout button click", async ({ page }) => {
    // Wait for task list to load
    await expect(page.getByText("TEST-123")).toBeVisible()

    // Click logout
    await page.getByRole("button", { name: /logout/i }).click()

    // Should navigate back to login form after logout
    await expect(page.getByLabel("JIRA URL")).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
  })

  test("should format dates correctly", async ({ page }) => {
    await expect(page.getByText("TEST-123")).toBeVisible()

    // Check that dates are formatted (not showing raw ISO string)
    const dateText = await page
      .getByText(/Updated: \d{1,2}\/\d{1,2}\/\d{4}/)
      .first()
      .textContent()
    expect(dateText).toMatch(/Updated: \d{1,2}\/\d{1,2}\/\d{4}/)
  })

  test("should display multiple issues in cards", async ({ page }) => {
    await expect(page.getByText("TEST-123")).toBeVisible()

    // Each issue should be in its own card - check by finding all issue keys
    await expect(page.getByText("TEST-123")).toBeVisible()
    await expect(page.getByText("TEST-456")).toBeVisible()
    await expect(page.getByText("PROJ-789")).toBeVisible()

    // Verify we have the correct number of unique issues displayed
    const issueKeys = ["TEST-123", "TEST-456", "PROJ-789"]
    for (const key of issueKeys) {
      await expect(page.getByText(key)).toBeVisible()
    }
  })

  test("should have accessible refresh button with icon", async ({ page }) => {
    const refreshButton = page.getByRole("button", { name: /refresh/i })
    await expect(refreshButton).toBeVisible()
    await expect(refreshButton).toBeEnabled()

    // Check that icon exists (lucide-react RefreshCw icon)
    const icon = refreshButton.locator("svg").first()
    await expect(icon).toBeVisible()
  })

  test("should have accessible logout button with icon", async ({ page }) => {
    const logoutButton = page.getByRole("button", { name: /logout/i })
    await expect(logoutButton).toBeVisible()
    await expect(logoutButton).toBeEnabled()

    // Check that icon exists (lucide-react LogOut icon)
    const icon = logoutButton.locator("svg").first()
    await expect(icon).toBeVisible()
  })
})

test.describe("Task List States", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Tauri API basic setup without navigation
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            return {
              instanceUrl: "https://test.atlassian.net",
              username: "test@example.com",
              apiToken: "test-token",
            } as const satisfies JiraSettings
          }
          if (cmd === "jira_get_current_user") {
            return {
              name: "Test User",
              apiVersion: "3",
              authType: "basic",
            } as const satisfies JiraUserSession
          }
          // jira_api_request will be mocked by individual tests
          return Promise.reject(new Error(`Unknown command: ${cmd}`))
        },
      }
    })
  })

  test("should show loading state initially", async ({ page }) => {
    await page.addInitScript(() => {
      const originalInvoke = window.__TAURI_INTERNALS__.invoke
      window.__TAURI_INTERNALS__.invoke = async (cmd: TauriCommand, args: unknown) => {
        if (cmd === "jira_api_request") {
          // Delay response to show loading state
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return { issues: [], total: 0 }
        }
        return originalInvoke(cmd, args)
      }
    })

    await page.goto("/")
    await expect(page.getByText("Loading issues...")).toBeVisible()
  })

  test("should show empty state when no issues", async ({ page }) => {
    await page.addInitScript(() => {
      const originalInvoke = window.__TAURI_INTERNALS__.invoke
      window.__TAURI_INTERNALS__.invoke = async (cmd: TauriCommand, args: unknown) => {
        if (cmd === "jira_api_request") {
          return { issues: [], total: 0, isLast: true } as const satisfies JiraSearchResponse
        }
        return originalInvoke(cmd, args)
      }
    })

    await page.goto("/")

    // Wait for loading to complete
    await page.waitForSelector('text="Showing 0 issues"', { timeout: 5000 })

    // Check empty state message
    await expect(page.getByText("No unresolved issues assigned to you.")).toBeVisible()
    await expect(page.getByText("Showing 0 issues")).toBeVisible()
  })

  test("should display error state when API fails", async ({ page }) => {
    await page.addInitScript(() => {
      const originalInvoke = window.__TAURI_INTERNALS__.invoke
      window.__TAURI_INTERNALS__.invoke = async (cmd: TauriCommand, args: unknown) => {
        if (cmd === "jira_api_request") {
          throw new Error("Failed to fetch issues: Network error")
        }
        return originalInvoke(cmd, args)
      }
    })

    await page.goto("/")

    // Wait for error to be displayed
    await expect(page.getByText("Error Loading Issues")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Failed to fetch issues: Network error/)).toBeVisible()

    // Should show config details in error message
    await expect(page.getByText("JIRA URL: https://test.atlassian.net")).toBeVisible()
    await expect(page.getByText("Username: test@example.com")).toBeVisible()
  })
})
