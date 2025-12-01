import { expect, test } from "@playwright/test"

test.describe("Config Mismatch - White Screen Bug", () => {
  test("should not show white screen when config has unexpected shape (missing required fields)", async ({
    page,
  }) => {
    // Mock a config with missing required fields - simulates corrupted/old config
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            // Return config with missing required fields
            return {
              instanceUrl: "https://test.atlassian.net",
              // missing: username, apiToken
            }
          }
          if (cmd === "get_app_settings") {
            return {
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
                // missing: username, apiToken
              },
            }
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")

    // App should not show white screen - should either show login or error
    // Wait for DOM to be stable
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show either login form or some content
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when config has wrong types", async ({ page }) => {
    // Mock a config with wrong field types
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            // Return config with wrong types (number instead of string)
            return {
              instanceUrl: 12345, // should be string
              username: null, // should be string
              apiToken: undefined, // should be string
            }
          }
          if (cmd === "get_app_settings") {
            return {
              general: {
                theme: "system",
                worklogTypes: [],
                defaultWorklogDescription: "",
                enableAutomaticUpdates: false,
                alwaysOnTop: false,
                customIssueKeys: [],
              },
              jira: {
                instanceUrl: 12345,
                username: null,
                apiToken: undefined,
              },
            }
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show either login form or some content
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when general settings have unexpected structure", async ({
    page,
  }) => {
    // Mock app settings with malformed general settings
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            return null
          }
          if (cmd === "get_app_settings") {
            // Return settings with wrong structure
            return {
              general: {
                theme: 123, // should be string
                worklogTypes: "not-an-array", // should be array
                // missing other fields
              },
              jira: null,
            }
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show login form since no valid jira config
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when get_jira_config throws an error", async ({ page }) => {
    // Mock config retrieval that throws an error
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            throw new Error("Failed to deserialize config: missing field `username`")
          }
          if (cmd === "get_app_settings") {
            return {
              general: {
                theme: "system",
                worklogTypes: [],
                defaultWorklogDescription: "",
                enableAutomaticUpdates: false,
                alwaysOnTop: false,
                customIssueKeys: [],
              },
              jira: null,
            }
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show login form or error, not white screen
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when get_app_settings throws an error", async ({ page }) => {
    // Mock app settings retrieval that throws an error
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            return null
          }
          if (cmd === "get_app_settings") {
            throw new Error("Failed to deserialize settings: invalid type for field `theme`")
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show login form or error, not white screen
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when config is empty object", async ({ page }) => {
    // Mock config as empty object
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            return {} // Empty object instead of null or valid config
          }
          if (cmd === "get_app_settings") {
            return {
              general: {
                theme: "system",
                worklogTypes: [],
                defaultWorklogDescription: "",
                enableAutomaticUpdates: false,
                alwaysOnTop: false,
                customIssueKeys: [],
              },
              jira: {}, // Empty jira config
            }
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show login form since config is effectively empty
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when app settings has null general", async ({ page }) => {
    // Mock app settings with null general (completely missing required field)
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            return null
          }
          if (cmd === "get_app_settings") {
            // Return settings with null general - should never happen but tests resilience
            return {
              general: null,
              jira: null,
            }
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show login form or error, not white screen
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when app settings is completely empty object", async ({
    page,
  }) => {
    // Mock app settings as empty object
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            return null
          }
          if (cmd === "get_app_settings") {
            return {} // Completely empty - missing both general and jira
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show login form or error, not white screen
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when app settings is null", async ({ page }) => {
    // Mock app settings returning null
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            return null
          }
          if (cmd === "get_app_settings") {
            return null // Null instead of object
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show login form or error, not white screen
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when worklogTypes contains invalid items", async ({
    page,
  }) => {
    // Mock config with worklogTypes having wrong structure
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            return null
          }
          if (cmd === "get_app_settings") {
            return {
              general: {
                theme: "system",
                worklogTypes: [
                  { invalid: "structure" }, // Missing name and shortCode
                  null, // Null item
                  "string-instead-of-object", // Wrong type
                ],
                defaultWorklogDescription: "",
                enableAutomaticUpdates: false,
                alwaysOnTop: false,
                customIssueKeys: [],
              },
              jira: null,
            }
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show login form or error, not white screen
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })

  test("should not show white screen when customIssueKeys is not an array", async ({ page }) => {
    // Mock config with customIssueKeys as string instead of array
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string) => {
          if (cmd === "get_jira_config") {
            return null
          }
          if (cmd === "get_app_settings") {
            return {
              general: {
                theme: "system",
                worklogTypes: [],
                defaultWorklogDescription: "",
                enableAutomaticUpdates: false,
                alwaysOnTop: false,
                customIssueKeys: "PROJ-123", // Should be array, not string
              },
              jira: null,
            }
          }
          if (cmd === "save_app_settings") {
            return null
          }
          return null
        },
      }
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Check that we don't have a blank/white screen
    const bodyContent = await page.locator("body").textContent()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)

    // Should show login form or error, not white screen
    const hasLogin = await page
      .getByLabel("JIRA URL")
      .isVisible()
      .catch(() => false)
    const hasError = await page
      .getByText(/error/i)
      .isVisible()
      .catch(() => false)
    const hasLoading = await page
      .getByText(/loading/i)
      .isVisible()
      .catch(() => false)

    expect(hasLogin || hasError || hasLoading).toBe(true)
  })
})
