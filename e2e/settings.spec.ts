import { expect, test } from "@playwright/test"
import { mockJiraConfig, mockJiraUserSession } from "./mocks/jira"

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockJiraConfig({ page })
    await mockJiraUserSession({ page })
    await page.goto("/")
  })

  test("should open settings page", async ({ page }) => {
    await page.click('button[aria-label="Settings"]')
    await expect(page.locator("h1")).toHaveText("Settings")
  })

  test("should update JIRA configuration", async ({ page }) => {
    await page.click('button[aria-label="Settings"]')

    // Fill JIRA fields
    await page.fill("input#jiraUrl", "https://new-jira.atlassian.net")
    await page.fill("input#jiraUsername", "new-user@example.com")
    await page.fill("input#jiraToken", "new-token-123")

    // Verify save was called (we can check if the values persist in the UI since the mock is stateful in the component's local state,
    // but strictly speaking the component calls saveMutation.mutate which calls save_app_settings)

    // To verify the save command was actually called with correct data, we would need to spy on the mock.
    // For now, we verify the inputs hold the value.
    await expect(page.locator("input#jiraUrl")).toHaveValue("https://new-jira.atlassian.net")
    await expect(page.locator("input#jiraUsername")).toHaveValue("new-user@example.com")
    await expect(page.locator("input#jiraToken")).toHaveValue("new-token-123")
  })

  test("should toggle automatic updates", async ({ page }) => {
    await page.click('button[aria-label="Settings"]')

    const checkbox = page.locator("text=Enable Automatic Updates")

    // Initial state (false)
    await expect(page.locator('input[type="checkbox"]').first()).not.toBeChecked()

    // Click to toggle
    await checkbox.click()

    // Should be checked
    // Note: We need to be careful with which checkbox we are selecting if there are multiple.
    // The label "Enable Automatic Updates" wraps the input.
    await expect(
      page.locator("label").filter({ hasText: "Enable Automatic Updates" }).locator("input")
    ).toBeChecked()
  })

  test("should manage worklog types", async ({ page }) => {
    await page.click('button[aria-label="Settings"]')

    // Add a new type
    await page.click('button:has-text("Add Type")')

    // Verify new inputs appear
    const nameInputs = page.locator('input[placeholder="Type Name"]')
    await expect(nameInputs).toHaveCount(1)

    await nameInputs.fill("Development")
    await page.locator('input[placeholder="(Code)"]').fill("(DEV)")

    // Add another type
    await page.click('button:has-text("Add Type")')
    await expect(nameInputs).toHaveCount(2)

    await nameInputs.nth(1).fill("Meeting")

    // Remove the first type
    await page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-trash-2") })
      .first()
      .click()

    await expect(nameInputs).toHaveCount(1)
    await expect(nameInputs.first()).toHaveValue("Meeting")
  })

  test("should close settings page", async ({ page }) => {
    await page.click('button[aria-label="Settings"]')
    await expect(page.locator("h1")).toHaveText("Settings")

    await page.click('button:has-text("Close")')

    // Should be back to task list
    await expect(page.locator("h1")).toHaveText("My JIRA Issues")
  })

  test("should load existing settings", async ({ page }) => {
    // Override settings for this test
    await mockJiraConfig({
      page,
      appSettings: {
        general: {
          theme: "system",
          worklogTypes: [{ name: "Existing Type", shortCode: "(ET)" }],
          defaultWorklogDescription: "",
          enableAutomaticUpdates: true,
          alwaysOnTop: false,
          customIssueKeys: [],
          language: "en",
        },
        jira: {
          instanceUrl: "https://existing.atlassian.net",
          username: "test@example.com",
          apiToken: "test-token",
        },
      },
    })
    // Reload page to apply new mock
    await page.reload()

    await page.click('button[aria-label="Settings"]')

    await expect(page.locator("input#jiraUrl")).toHaveValue("https://existing.atlassian.net")
    await expect(
      page.locator("label").filter({ hasText: "Enable Automatic Updates" }).locator("input")
    ).toBeChecked()
    await expect(page.locator('input[value="Existing Type"]')).toBeVisible()
  })
})
