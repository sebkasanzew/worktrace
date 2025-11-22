import { expect, test } from "@playwright/test"
import type {
  AppSettings,
  JiraConfig,
  JiraSearchResponse,
  JiraUserSession,
} from "../src/types/bindings"

test.describe("Custom Issues", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const defaultSettings: AppSettings = {
        jiraInstanceUrl: "https://test.atlassian.net",
        jiraUsername: "test@example.com",
        jiraApiToken: "test-token",
        theme: "system",
        worklogTypes: [],
        defaultWorklogDescription: "",
        enableAutomaticUpdates: false,
        alwaysOnTop: false,
        customIssueKeys: [],
      }

      const getSettings = () => {
        const stored = localStorage.getItem("mockAppSettings")
        return stored ? JSON.parse(stored) : defaultSettings
      }

      const saveSettings = (settings: AppSettings) => {
        localStorage.setItem("mockAppSettings", JSON.stringify(settings))
      }

      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string, args: unknown) => {
          const typedArgs = args as { jql?: string; settings?: AppSettings }
          if (cmd === "get_jira_config") {
            return {
              url: "https://test.atlassian.net",
              username: "test@example.com",
              password: "test-token",
            } as const satisfies JiraConfig
          }
          if (cmd === "jira_get_current_user") {
            return { name: "Test User" } as const satisfies JiraUserSession
          }
          if (cmd === "get_app_settings") {
            return getSettings()
          }
          if (cmd === "save_app_settings") {
            if (typedArgs.settings) {
              saveSettings(typedArgs.settings)
            }
            return Promise.resolve()
          }
          if (cmd === "jira_api_request") {
            // Check if it's a search request
            if (typedArgs.jql?.includes("assignee = currentUser()")) {
              return {
                issues: [
                  {
                    id: "10001",
                    key: "TEST-1",
                    fields: {
                      summary: "My Issue",
                      status: {
                        name: "In Progress",
                        statusCategory: { key: "indeterminate", name: "In Progress" },
                      },
                      assignee: { displayName: "Test User", emailAddress: "test@example.com" },
                      created: Date.now(),
                      updated: Date.now(),
                      subtasks: [],
                    },
                  },
                ],
                total: 1,
                isLast: true,
              } as const satisfies JiraSearchResponse
            }

            // Search for custom issues
            if (typedArgs.jql?.includes('key = "CUSTOM-1"')) {
              return {
                issues: [
                  {
                    id: "20001",
                    key: "CUSTOM-1",
                    fields: {
                      summary: "Custom Issue",
                      status: { name: "To Do", statusCategory: { key: "new", name: "To Do" } },
                      assignee: { displayName: "Other User", emailAddress: "other@example.com" },
                      created: Date.now(),
                      updated: Date.now(),
                      subtasks: [],
                    },
                  },
                ],
                total: 1,
                isLast: true,
              } as const satisfies JiraSearchResponse
            }

            // Search for project key prefix
            if (typedArgs.jql?.includes('issueKey ~ "KAN*"')) {
              return {
                issues: [
                  {
                    id: "30001",
                    key: "KAN-5",
                    fields: {
                      summary: "Project Issue",
                      status: { name: "To Do", statusCategory: { key: "new", name: "To Do" } },
                      assignee: { displayName: "Other User", emailAddress: "other@example.com" },
                      created: Date.now(),
                      updated: Date.now(),
                      subtasks: [],
                    },
                  },
                ],
                total: 1,
                isLast: true,
              } as const satisfies JiraSearchResponse
            }

            // Fetch custom issues by key
            if (typedArgs.jql?.includes("key in (CUSTOM-1)")) {
              return {
                issues: [
                  {
                    id: "20001",
                    key: "CUSTOM-1",
                    fields: {
                      summary: "Custom Issue",
                      status: { name: "To Do", statusCategory: { key: "new", name: "To Do" } },
                      assignee: { displayName: "Other User", emailAddress: "other@example.com" },
                      created: Date.now(),
                      updated: Date.now(),
                      subtasks: [],
                    },
                  },
                ],
                total: 1,
                isLast: true,
              } as const satisfies JiraSearchResponse
            }

            return { issues: [], total: 0, isLast: true }
          }
          return Promise.resolve()
        },
      }
    })
    await page.goto("/")
  })

  test("should open custom issues dialog and add an issue", async ({ page }) => {
    await page.getByRole("button", { name: "More issues" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    await page.getByPlaceholder("Search by issue key or summary...").fill("CUSTOM-1")
    // Wait for debounce
    await page.waitForTimeout(600)

    await expect(page.getByText("CUSTOM-1")).toBeVisible()
    // Click the add button (plus icon)
    await page.locator("button:has(svg.lucide-plus)").click()

    await expect(page.getByText("Selected Issues (1)")).toBeVisible()
    // Check if it appears in the selected list (second occurrence of CUSTOM-1)
    await expect(
      page
        .locator("div")
        .filter({ hasText: /^CUSTOM-1$/ })
        .nth(1)
    ).toBeVisible()
  })

  test("should filter issues in task list", async ({ page }) => {
    // First add the issue (simulating state)
    await page.evaluate(() => {
      window.__TAURI_INTERNALS__.invoke("save_app_settings", {
        settings: {
          jiraInstanceUrl: "https://test.atlassian.net",
          jiraUsername: "test@example.com",
          jiraApiToken: "test-token",
          theme: "system",
          worklogTypes: [],
          defaultWorklogDescription: "",
          enableAutomaticUpdates: false,
          alwaysOnTop: false,
          customIssueKeys: ["CUSTOM-1"],
        },
      })
    })

    // Reload to pick up settings
    await page.reload()

    await expect(page.getByText("Showing 1 issues")).toBeVisible()
    await expect(page.getByText("TEST-1")).toBeVisible()
    await expect(page.getByText("CUSTOM-1")).not.toBeVisible()

    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "Assigned + Custom" }).click()

    await expect(page.getByText("Showing 2 issues")).toBeVisible()
    await expect(page.getByText("TEST-1")).toBeVisible()
    await expect(page.getByText("CUSTOM-1")).toBeVisible()
  })

  test("should find issue by project key prefix", async ({ page }) => {
    await page.getByRole("button", { name: "More issues" }).click()
    await page.getByPlaceholder("Search by issue key or summary...").fill("KAN")
    // Wait for debounce
    await page.waitForTimeout(600)

    await expect(page.getByText("KAN-5")).toBeVisible()
    await expect(page.getByText("Project Issue")).toBeVisible()
  })

  test("should automatically switch filter to 'Assigned + Custom' when custom issues change", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "More issues" }).click()

    // Search and add an issue
    await page.getByPlaceholder("Search by issue key or summary...").fill("CUSTOM-1")
    await page.waitForTimeout(600)
    await page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-plus") })
      .click()

    // Close dialog by clicking outside or pressing escape
    await page.keyboard.press("Escape")

    // Check if filter switched automatically
    await expect(page.getByText("Showing 2 issues")).toBeVisible()
    await expect(page.getByText("CUSTOM-1")).toBeVisible()
    await expect(page.getByRole("combobox")).toHaveText("Assigned + Custom")
  })
})
