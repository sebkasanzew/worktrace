import { expect, test } from "@playwright/test"
import {
  mockJiraConfig,
  mockJiraSearchResponse,
  mockJiraUserSession,
  setupWorklogMocks,
} from "./mocks/jira"

test.describe("Worklog Dialog", () => {
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
              status: {
                name: "In Progress",
                statusCategory: {
                  key: "indeterminate",
                  name: "In Progress",
                },
              },
              assignee: { displayName: "Test User", emailAddress: "test@example.com" },
              created: Date.parse("2025-11-20T10:00:00.000Z"),
              updated: Date.parse("2025-11-21T14:30:00.000Z"),
              subtasks: [],
            },
          },
        ],
      },
    })
    await setupWorklogMocks({ page })
    await page.goto("/")
  })

  test("should allow deleting log and stopping timer", async ({ page }) => {
    await page.waitForSelector('text="KAN-1"')

    // Start timer
    await page.click('button:has-text("Start")')
    await expect(page.locator('button:has-text("Stop")')).toBeVisible()

    // Stop timer to open dialog
    await page.click('button:has-text("Stop")')
    await expect(page.locator('text="Log Work for KAN-1"')).toBeVisible()

    // Click Delete & Stop Timer
    await page.click('button:has-text("Delete")')

    // Confirm delete
    await page.click('button:has-text("Click again")')

    // Dialog should close and timer should be stopped (Start button visible)
    await expect(page.locator('text="Log Work for KAN-1"')).not.toBeVisible()
    await expect(page.locator('button:has-text("Start")')).toBeVisible()
  })

  test("should allow changing start time", async ({ page }) => {
    await page.waitForSelector('text="KAN-1"')

    // Start timer
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(1000) // Wait a bit

    // Stop timer
    await page.click('button:has-text("Stop")')

    // Change start time
    const specificTime = "08:00"
    await page.fill('input[type="time"]', specificTime)

    // Submit
    await page.click('button:has-text("Submit")')

    // Verify dialog closed
    await expect(page.locator('text="Log Work for KAN-1"')).not.toBeVisible()
    await expect(page.locator('button:has-text("Start")')).toBeVisible()
  })
})
