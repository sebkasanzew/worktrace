import { expect, test } from "@playwright/test"

test.describe("Early Error Screen Preview", () => {
  test("should display early error screen with all UI elements", async ({ page }) => {
    // Navigate to the preview route
    await page.goto("/?previewEarlyError")

    // Verify the error screen is displayed
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible()

    // Verify the description text
    await expect(
      page.getByText("The app failed to start. Please try resetting the configuration.")
    ).toBeVisible()

    // Verify the error message is shown
    await expect(page.getByText("Preview: Simulated initialization failure")).toBeVisible()

    // Verify the stack trace is shown
    await expect(page.getByText(/at initApp/)).toBeVisible()

    // Verify buttons are present
    await expect(page.getByRole("button", { name: "Reload App" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Reset Config/ })).toBeVisible()
  })

  test("should have clickable Reload App button", async ({ page }) => {
    await page.goto("/?previewEarlyError")

    const reloadButton = page.getByRole("button", { name: "Reload App" })
    await expect(reloadButton).toBeEnabled()
  })

  test("should have clickable Reset Config button", async ({ page }) => {
    await page.goto("/?previewEarlyError")

    // Set up dialog handler for the alert
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Reset Config")
      await dialog.accept()
    })

    const resetButton = page.getByRole("button", { name: /Reset Config/ })
    await expect(resetButton).toBeEnabled()
    await resetButton.click()
  })
})
