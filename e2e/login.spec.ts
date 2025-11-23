import { expect, test } from "@playwright/test"
import { mockNoJiraConfig } from "./mocks/jira"
import { setupTauriMocks } from "./utils/tauri"

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await mockNoJiraConfig({ page })
  })

  test("should display login form when no credentials stored", async ({ page }) => {
    await page.goto("/")

    // Check for login form elements
    await expect(page.getByLabel("JIRA URL")).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("API Token")).toBeVisible()
    await expect(page.getByRole("button", { name: /connect to jira/i })).toBeVisible()
  })

  test("should show validation errors for invalid inputs", async ({ page }) => {
    await page.goto("/")

    // Click save without filling fields
    await page.getByRole("button", { name: /connect to jira/i }).click()

    // Check for validation errors
    await expect(page.getByText(/required/i).first()).toBeVisible()
  })

  test("should show error when JIRA connection fails", async ({ page }) => {
    // Mock failed connection
    await setupTauriMocks(page, {
      jira_get_current_user: () => Promise.reject("Unauthorized"),
    })

    await page.goto("/")

    // Fill form
    await page.getByLabel("JIRA URL").fill("https://test.atlassian.net")
    await page.getByLabel("Email").fill("test@example.com")
    await page.getByLabel("API Token").fill("invalid-token")

    // Submit
    await page.getByRole("button", { name: /connect to jira/i }).click()

    // Check for error message
    await expect(
      page.getByText("Failed to connect to JIRA. Please check your credentials.")
    ).toBeVisible()
  })
})
