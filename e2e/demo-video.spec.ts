/**
 * Demo video recording test
 *
 * This test is tagged with @demo and excluded from normal test runs.
 * It produces a video demonstrating the main use case of the app.
 *
 * Run with: pnpm test:e2e:demo
 */
import { expect, type Locator, type Page, test } from "@playwright/test"
import type { AppSettings, JiraIssue, JiraSettings, JiraUserSession } from "../src/types/bindings"

// Slow motion mouse helper - moves cursor visibly to target
async function slowMouseMove(page: Page, target: Locator, options?: { steps?: number }) {
  const box = await target.boundingBox()
  if (!box) throw new Error("Target not visible")
  const targetX = box.x + box.width / 2
  const targetY = box.y + box.height / 2
  await page.mouse.move(targetX, targetY, { steps: options?.steps ?? 25 })
}

// Slow click with visible mouse movement
async function slowClick(page: Page, target: Locator) {
  await slowMouseMove(page, target)
  await page.waitForTimeout(200)
  await target.click()
}

// Slow fill with visible mouse movement
async function slowFill(page: Page, target: Locator, text: string, options?: { delay?: number }) {
  await slowMouseMove(page, target)
  await page.waitForTimeout(200)
  await target.click()
  await target.fill("")
  // Type character by character for visibility
  await target.pressSequentially(text, { delay: options?.delay ?? 50 })
}

// Mock data types for serialization to addInitScript
interface MockData {
  mockConfig: JiraSettings
  mockUser: JiraUserSession
  assignedIssue: JiraIssue
  customIssue: JiraIssue
  initialSettings: AppSettings
  fixedTimestamp: number
}

test.describe("Demo Video", () => {
  // Tag this test to exclude from normal runs
  test("@demo main use case walkthrough", async ({ page }) => {
    // Fix the clock to a consistent date/time for reproducible videos
    // Using a Monday morning for realistic work scenario
    const fixedDate = new Date("2025-03-10T09:30:00.000Z")
    await page.clock.install({ time: fixedDate })

    // Add a visual cursor indicator for the video
    // This creates a visible dot that follows the mouse cursor
    await page.addInitScript(() => {
      const cursor = document.createElement("div")
      cursor.id = "demo-cursor"
      cursor.style.cssText = `
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, rgba(255,100,100,0.9) 0%, rgba(255,100,100,0.4) 50%, transparent 70%);
        border-radius: 50%;
        position: fixed;
        pointer-events: none;
        z-index: 999999;
        transform: translate(-50%, -50%);
        transition: transform 0.05s ease-out;
      `
      document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(cursor)
        document.addEventListener("mousemove", (e) => {
          cursor.style.left = `${e.clientX}px`
          cursor.style.top = `${e.clientY}px`
        })
      })
    })

    // App settings state
    const appSettings: AppSettings = {
      general: {
        theme: "dark",
        worklogTypes: [
          { name: "Development", shortCode: "[DEV]" },
          { name: "Code Review", shortCode: "[CR]" },
          { name: "Meeting", shortCode: "[MTG]" },
        ],
        defaultWorklogDescription: "",
        enableAutomaticUpdates: false,
        alwaysOnTop: false,
        customIssueKeys: [],
      },
      jira: null,
    }

    // Mock data - use fixed timestamps relative to fixedDate
    const fixedTimestamp = fixedDate.getTime()

    const mockConfig: JiraSettings = {
      instanceUrl: "https://acme-corp.atlassian.net",
      username: "john.doe@acme.com",
      apiToken: "demo-api-token-12345",
    }

    const mockUser: JiraUserSession = {
      name: "John Doe",
      apiVersion: "3",
      authType: "Basic",
    }

    const assignedIssue: JiraIssue = {
      id: "10001",
      key: "PROJ-42",
      fields: {
        summary: "Implement user dashboard feature",
        status: {
          name: "In Progress",
          statusCategory: { key: "indeterminate", name: "In Progress" },
        },
        assignee: { displayName: "John Doe", emailAddress: "john.doe@acme.com" },
        created: fixedTimestamp - 86400000 * 3, // 3 days ago
        updated: fixedTimestamp - 3600000, // 1 hour ago
        issuetype: { name: "Story", subtask: false },
        subtasks: [],
      },
    }

    const customIssue: JiraIssue = {
      id: "20001",
      key: "INFRA-101",
      fields: {
        summary: "Upgrade database connection pooling",
        status: { name: "To Do", statusCategory: { key: "new", name: "To Do" } },
        assignee: { displayName: "Jane Smith", emailAddress: "jane.smith@acme.com" },
        created: fixedTimestamp - 86400000 * 5, // 5 days ago
        updated: fixedTimestamp - 86400000, // 1 day ago
        issuetype: { name: "Task", subtask: false },
        subtasks: [],
      },
    }

    const mockData: MockData = {
      mockConfig,
      mockUser,
      assignedIssue,
      customIssue,
      initialSettings: appSettings,
      fixedTimestamp,
    }

    // Setup comprehensive mocks
    await page.addInitScript((data: MockData) => {
      // Declare types inside addInitScript since external types are not available
      type JiraWorklogItem = {
        id: string
        timeSpentSeconds: number
        timeSpent: string
        started: string
        comment: string
        created: string
        updated: string
        author: { displayName: string; emailAddress: string; avatarUrls: null }
        updateAuthor: { displayName: string; emailAddress: string; avatarUrls: null }
      }

      // State variables (will be mutated by mock handlers)
      let isLoggedIn = false
      let appSettingsState = data.initialSettings
      let customIssueKeys: string[] = []
      let worklogs: JiraWorklogItem[] = []

      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async (cmd: string, args?: unknown) => {
          const typedArgs = args as {
            jql?: string
            settings?: typeof data.initialSettings
            issueKey?: string
            payload?: { timeSpentSeconds: number; comment: string; started: string }
          }

          // Config commands
          if (cmd === "get_jira_config") {
            return isLoggedIn ? data.mockConfig : null
          }
          if (cmd === "save_jira_config") {
            isLoggedIn = true
            return null
          }
          if (cmd === "clear_jira_config") {
            isLoggedIn = false
            return null
          }

          // User session - always return user data since login flow calls this before save
          if (cmd === "jira_get_current_user") {
            return data.mockUser
          }

          // App settings
          if (cmd === "get_app_settings") {
            return {
              ...appSettingsState,
              general: { ...appSettingsState.general, customIssueKeys },
            }
          }
          if (cmd === "save_app_settings") {
            if (typedArgs.settings) {
              appSettingsState = typedArgs.settings
              customIssueKeys = typedArgs.settings.general.customIssueKeys || []
            }
            return null
          }

          // JIRA API requests (search)
          if (cmd === "jira_api_request") {
            const jql = typedArgs.jql || ""

            // Search for assigned issues
            if (jql.includes("assignee = currentUser()")) {
              return {
                issues: [data.assignedIssue],
                total: 1,
                isLast: true,
              }
            }

            // Search for custom issue by key or summary
            if (jql.includes("INFRA") || jql.includes("database") || jql.includes("pooling")) {
              return {
                issues: [data.customIssue],
                total: 1,
                isLast: true,
              }
            }

            // Fetch custom issues by key
            if (jql.includes("key in") && jql.includes("INFRA-101")) {
              return {
                issues: [data.customIssue],
                total: 1,
                isLast: true,
              }
            }

            return { issues: [], total: 0, isLast: true }
          }

          // Worklog commands
          if (cmd === "jira_get_worklogs") {
            // Return worklogs for the issue - React Query will refetch after adding
            return {
              worklogs,
              total: worklogs.length,
              maxResults: 100,
              startAt: 0,
            }
          }
          if (cmd === "jira_add_worklog") {
            const seconds = typedArgs.payload?.timeSpentSeconds || 0
            // Format timeSpent properly (1h, 30m, etc.)
            const hours = Math.floor(seconds / 3600)
            const minutes = Math.floor((seconds % 3600) / 60)
            let timeSpent = ""
            if (hours > 0) timeSpent += `${hours}h`
            if (minutes > 0) timeSpent += `${hours > 0 ? " " : ""}${minutes}m`
            if (!timeSpent) timeSpent = "0m"

            const newWorklog: JiraWorklogItem = {
              id: String(Date.now()),
              timeSpentSeconds: seconds,
              timeSpent,
              started: typedArgs.payload?.started || new Date().toISOString(),
              comment: typedArgs.payload?.comment || "",
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              author: {
                displayName: data.mockUser.name,
                emailAddress: "john.doe@acme.com",
                avatarUrls: null,
              },
              updateAuthor: {
                displayName: data.mockUser.name,
                emailAddress: "john.doe@acme.com",
                avatarUrls: null,
              },
            }
            worklogs = [newWorklog, ...worklogs]
            return newWorklog
          }

          // Plugin mocks
          if (cmd === "plugin:updater|check") return null
          if (cmd.startsWith("plugin:store|")) return null
          if (cmd.startsWith("plugin:log|")) return null

          return null
        },
      }

      // Mock log plugin
      const internals = window.__TAURI_INTERNALS__ as unknown as Record<string, unknown>
      internals.log = {
        log: () => Promise.resolve(),
        info: () => Promise.resolve(),
        warn: () => Promise.resolve(),
        error: () => Promise.resolve(),
        debug: () => Promise.resolve(),
      }

      // Mock event API
      const listeners = new Map<string, Array<(event: unknown) => void>>()
      internals.event = {
        listen: async (event: string, cb: (event: unknown) => void) => {
          const arr = listeners.get(event) || []
          arr.push(cb)
          listeners.set(event, arr)
          return () => {
            const list = listeners.get(event) || []
            const idx = list.indexOf(cb)
            if (idx > -1) list.splice(idx, 1)
            listeners.set(event, list)
          }
        },
      }
      window.__TAURI_MOCK_EMIT = (event: string, payload: unknown) => {
        const list = listeners.get(event) || []
        for (const cb of list) cb({ event, payload })
      }
    }, mockData)

    // Navigate to the app
    await page.goto("/")
    await page.waitForTimeout(1000)

    // ==========================================
    // STEP 1: Login
    // ==========================================
    await expect(page.getByText("Worktrace - JIRA Configuration")).toBeVisible()
    await page.waitForTimeout(500)

    // Fill JIRA URL
    const urlInput = page.getByLabel("JIRA URL")
    await slowFill(page, urlInput, "https://acme-corp.atlassian.net")
    await page.waitForTimeout(300)

    // Fill Email
    const emailInput = page.getByLabel("Email Address")
    await slowFill(page, emailInput, "john.doe@acme.com")
    await page.waitForTimeout(300)

    // Fill API Token
    const tokenInput = page.getByLabel("API Token")
    await slowFill(page, tokenInput, "demo-api-token-12345")
    await page.waitForTimeout(300)

    // Click Connect button
    const connectButton = page.getByRole("button", { name: /connect to jira/i })
    await slowClick(page, connectButton)
    await page.waitForTimeout(1500)

    // ==========================================
    // STEP 2: See the task list with 1 assigned issue
    // ==========================================
    await expect(page.getByText("My JIRA Issues")).toBeVisible()
    await expect(page.getByText("Showing 1 issue")).toBeVisible()
    await expect(page.getByText("PROJ-42")).toBeVisible()
    await expect(page.getByText("Implement user dashboard feature")).toBeVisible()
    await page.waitForTimeout(1500)

    // ==========================================
    // STEP 3: Start the timer on the first issue
    // ==========================================
    const startButton = page.getByRole("button", { name: "Start" })
    await slowClick(page, startButton)
    await page.waitForTimeout(500)

    // Verify timer is running
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible()
    // Let timer run for a moment to show it's working
    await page.waitForTimeout(3000)

    // ==========================================
    // STEP 4: Add more issues with "More issues" dialog
    // ==========================================
    const moreIssuesButton = page.getByRole("button", { name: "More issues" })
    await slowClick(page, moreIssuesButton)
    await page.waitForTimeout(500)

    // Dialog should be visible
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText("Manage Custom Issues")).toBeVisible()
    await page.waitForTimeout(500)

    // Search for an issue
    const searchInput = page.getByPlaceholder("Search by issue key or summary...")
    await slowFill(page, searchInput, "INFRA-101", { delay: 80 })
    await page.waitForTimeout(800) // Wait for debounce

    // Issue should appear in search results
    await expect(page.getByText("INFRA-101")).toBeVisible()
    await expect(page.getByText("Upgrade database connection pooling")).toBeVisible()
    await page.waitForTimeout(500)

    // Click the add button (plus icon)
    const addButton = page.locator("button").filter({ has: page.locator("svg.lucide-plus") })
    await slowClick(page, addButton)
    await page.waitForTimeout(500)

    // Verify it's added to selected issues
    await expect(page.getByText("Selected Issues (1)")).toBeVisible()
    await page.waitForTimeout(500)

    // Close dialog
    await page.keyboard.press("Escape")
    await page.waitForTimeout(500)

    // ==========================================
    // STEP 5: Show the new issue appeared in the task list
    // ==========================================
    // Filter should auto-switch to include custom issues
    await expect(page.getByText("Showing 2 issues")).toBeVisible()
    await expect(page.getByText("INFRA-101")).toBeVisible()
    await page.waitForTimeout(1500)

    // ==========================================
    // STEP 6: Stop the timer and submit worklog
    // ==========================================
    const stopButton = page.getByRole("button", { name: "Stop" })
    await slowClick(page, stopButton)
    await page.waitForTimeout(500)

    // Worklog dialog should open
    await expect(page.getByText("Log Work for PROJ-42")).toBeVisible()
    await page.waitForTimeout(500)

    // Change the logged time to 1h
    const timeInput = page.locator("input#wl-time")
    await slowClick(page, timeInput)
    await timeInput.fill("")
    await timeInput.pressSequentially("1h", { delay: 100 })
    await page.waitForTimeout(500)

    // Select work type from dropdown
    const workTypeSelect = page.locator("#wl-type")
    await slowClick(page, workTypeSelect)
    await page.waitForTimeout(300)
    const developmentOption = page.getByRole("option", { name: "Development" })
    await slowClick(page, developmentOption)
    await page.waitForTimeout(500)

    // Add a comment
    const commentInput = page.locator("textarea#wl-comment")
    await slowFill(
      page,
      commentInput,
      "Implemented initial dashboard layout and component structure",
      { delay: 30 }
    )
    await page.waitForTimeout(500)

    // Submit the worklog
    const submitButton = page.getByRole("button", { name: "Submit" })
    await slowClick(page, submitButton)
    await page.waitForTimeout(1500)

    // Dialog should close
    await expect(page.getByText("Log Work for PROJ-42")).not.toBeVisible()
    await page.waitForTimeout(1000)

    // ==========================================
    // STEP 7: Open worklog history on the issue
    // ==========================================
    // Click on the issue to expand it and show worklog history
    const issueCard = page.locator("text=PROJ-42").first()
    await slowClick(page, issueCard)
    await page.waitForTimeout(1500)

    // ==========================================
    // STEP 8: See the submitted worklog in history
    // ==========================================
    // Wait for worklog history to load - should show "Work Log History (1)"
    await expect(page.getByText("Work Log History (1)")).toBeVisible({ timeout: 5000 })

    // Verify the worklog details are visible
    // The worklog card should show the comment with [DEV] prefix
    await expect(page.getByText(/\[DEV\].*Implemented initial dashboard layout/)).toBeVisible({
      timeout: 5000,
    })

    await page.waitForTimeout(2000)

    // Final pause for video
    await page.waitForTimeout(1000)
  })
})
