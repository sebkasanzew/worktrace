import { expect, test } from "@playwright/test"
import {
  mockJiraConfig,
  mockJiraSearchResponse,
  mockJiraUserSession,
  setupWorklogMocks,
} from "./mocks/jira"

test.describe("Worklog Rounding", () => {
  test.beforeEach(async ({ page }) => {
    await mockJiraConfig({ page })
    await mockJiraUserSession({ page })
    await mockJiraSearchResponse({
      page,
      override: {
        total: 1,
        isLast: true,
        issues: [
          {
            id: "10001",
            key: "KAN-1",
            fields: {
              summary: "Test Issue",
              status: { name: "In Progress", statusCategory: null },
              assignee: null,
              created: 0,
              updated: 0,
              issuetype: { name: "Task", subtask: false },
              subtasks: [],
            },
          },
        ],
      },
    })
    await setupWorklogMocks({ page })
  })

  test("should not round when roundingStep is 0", async ({ page }) => {
    await mockJiraConfig({
      page,
      appSettings: {
        general: {
          theme: "system",
          worklogTypes: [],
          defaultWorklogDescription: "",
          enableAutomaticUpdates: false,
          alwaysOnTop: false,
          customIssueKeys: [],
          roundingStep: 0,
        },
      },
    })

    await page.goto("/")
    await page.waitForSelector('text="KAN-1"')

    // Start timer
    await page.click('button:has-text("Start")')

    // Wait a bit to ensure we have at least some duration (1s)
    await page.waitForTimeout(1100)

    // Stop timer
    await page.click('button:has-text("Stop")')

    // Check input value. Should be "1m" (since formatDurationHuman rounds up to nearest minute)
    const input = page.locator('input[value*="m"]').first()
    await expect(input).toHaveValue("1m")
  })

  test("should round up to 5m when roundingStep is 5", async ({ page }) => {
    await mockJiraConfig({
      page,
      appSettings: {
        general: {
          theme: "system",
          worklogTypes: [],
          defaultWorklogDescription: "",
          enableAutomaticUpdates: false,
          alwaysOnTop: false,
          customIssueKeys: [],
          roundingStep: 5,
        },
      },
    })

    await page.goto("/")
    await page.waitForSelector('text="KAN-1"')

    // Start timer
    await page.click('button:has-text("Start")')

    // Wait a bit (1s)
    await page.waitForTimeout(1100)

    // Stop timer
    await page.click('button:has-text("Stop")')

    // Check input value. Should be "5m"
    const input = page.locator('input[value*="m"]').first()
    await expect(input).toHaveValue("5m")
  })

  test("should round up to 1h when roundingStep is 60", async ({ page }) => {
    await mockJiraConfig({
      page,
      appSettings: {
        general: {
          theme: "system",
          worklogTypes: [],
          defaultWorklogDescription: "",
          enableAutomaticUpdates: false,
          alwaysOnTop: false,
          customIssueKeys: [],
          roundingStep: 60,
        },
      },
    })

    await page.goto("/")
    await page.waitForSelector('text="KAN-1"')

    // Start timer
    await page.click('button:has-text("Start")')

    // Wait a bit (1s)
    await page.waitForTimeout(1100)

    // Stop timer
    await page.click('button:has-text("Stop")')

    // Check input value. Should be "1h 0m"
    const input = page.locator('input[value*="m"]').first()
    await expect(input).toHaveValue("1h 0m")
  })
})
