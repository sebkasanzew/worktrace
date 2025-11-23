import { expect, test } from "@playwright/test"
import { mockNoJiraConfig } from "./mocks/jira"

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
})
