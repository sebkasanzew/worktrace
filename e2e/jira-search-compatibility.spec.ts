import { expect, type Page, test } from "@playwright/test"
import type { AppSettings, JiraSearchResponse, JiraUserSession } from "../src/types/bindings"

// Define a type for the window object with our custom property
type CustomWindow = Window & {
  // biome-ignore lint/suspicious/noExplicitAny: Mocking global object
  __TAURI_INTERNALS__: any
  __LAST_JQL__: string | undefined
}

test.describe("JIRA Search JQL Compatibility", () => {
  const setupMock = async (page: Page, apiVersion: "2" | "3") => {
    await page.addInitScript((version: string) => {
      const defaultSettings: AppSettings = {
        general: {
          theme: "system",
          worklogTypes: [],
          defaultWorklogDescription: "",
          enableAutomaticUpdates: false,
          alwaysOnTop: false,
          customIssueKeys: [],
        },
        jira: {
          instanceUrl: "https://jira.example.com",
          username: "test@example.com",
          apiToken: "test-token",
          apiVersion: version,
        },
      }

      const customWindow = window as unknown as CustomWindow

      customWindow.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string, args: unknown) => {
          const typedArgs = args as { jql?: string; settings?: AppSettings }

          if (cmd === "get_app_settings") {
            return defaultSettings
          }

          if (cmd === "get_jira_config") {
            return defaultSettings.jira
          }

          if (cmd === "jira_get_current_user") {
            return {
              name: "Test User",
              apiVersion: version,
              authType: "Basic",
            } as const satisfies JiraUserSession
          }

          if (cmd === "jira_api_request") {
            // Store JQL for verification
            customWindow.__LAST_JQL__ = typedArgs.jql

            return {
              issues: [],
              total: 0,
              isLast: true,
            } as const satisfies JiraSearchResponse
          }

          return null
        },
      }
    }, apiVersion)
  }

  test.describe("API v2 (Server/DC)", () => {
    test.beforeEach(async ({ page }) => {
      await setupMock(page, "2")
    })

    test("should NOT use issueKey ~ operator for partial keys", async ({ page }) => {
      await page.goto("/")

      // Open Custom Issues dialog
      await page.getByRole("button", { name: "More issues" }).click()

      // Type a project key prefix
      const searchInput = page.getByPlaceholder("Search by issue key or summary...")
      await searchInput.fill("BSS-")

      // Wait for debounce and request
      await page.waitForTimeout(1000)

      // Get the last JQL used
      const lastJql = await page.evaluate(() => (window as unknown as CustomWindow).__LAST_JQL__)

      // Verify JQL
      expect(lastJql).toBeDefined()
      expect(lastJql).toContain('summary ~ "BSS-*"')
      expect(lastJql).not.toContain("issueKey ~")
      expect(lastJql).not.toContain("key =")
    })

    test("should use key = for full issue keys", async ({ page }) => {
      await page.goto("/")

      // Open Custom Issues dialog
      await page.getByRole("button", { name: "More issues" }).click()

      // Type a full issue key
      const searchInput = page.getByPlaceholder("Search by issue key or summary...")
      await searchInput.fill("BSS-123")

      // Wait for debounce and request
      await page.waitForTimeout(1000)

      // Get the last JQL used
      const lastJql = await page.evaluate(() => (window as unknown as CustomWindow).__LAST_JQL__)

      // Verify JQL
      expect(lastJql).toBeDefined()
      expect(lastJql).toContain('key = "BSS-123"')
      expect(lastJql).toContain('summary ~ "BSS-123*"')
    })
  })

  test.describe("API v3 (Cloud)", () => {
    test.beforeEach(async ({ page }) => {
      await setupMock(page, "3")
    })

    test("should use issueKey ~ operator for partial keys", async ({ page }) => {
      await page.goto("/")

      // Open Custom Issues dialog
      await page.getByRole("button", { name: "More issues" }).click()

      // Type a project key prefix
      const searchInput = page.getByPlaceholder("Search by issue key or summary...")
      await searchInput.fill("BSS-")

      // Wait for debounce and request
      await page.waitForTimeout(1000)

      // Get the last JQL used
      const lastJql = await page.evaluate(() => (window as unknown as CustomWindow).__LAST_JQL__)

      // Verify JQL
      expect(lastJql).toBeDefined()
      expect(lastJql).toContain('summary ~ "BSS-*"')
      // API v3 supports issueKey ~ for finding issues by project key prefix
      expect(lastJql).toContain('issueKey ~ "BSS*"')
    })
  })
})
