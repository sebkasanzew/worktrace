import type { Page } from "@playwright/test"
import type { JiraWorklog, JiraWorklogListResponse } from "@/types/bindings"

/**
 * Generate mock worklog data
 */
export function generateMockWorklogs(): JiraWorklog[] {
  return [
    {
      id: "10001",
      timeSpentSeconds: 3600,
      timeSpent: "1h",
      started: "2025-11-21T10:00:00.000+0100",
      comment: "First worklog",
      created: "2025-11-21T09:00:00.000+0100",
      updated: "2025-11-21T09:00:00.000+0100",
      author: {
        displayName: "Test User",
        emailAddress: "test@example.com",
        avatarUrls: null,
      },
      updateAuthor: {
        displayName: "Test User",
        emailAddress: "test@example.com",
        avatarUrls: null,
      },
    },
    {
      id: "10002",
      timeSpentSeconds: 7200,
      timeSpent: "2h",
      started: "2025-11-21T12:00:00.000+0100",
      comment: "Second worklog",
      created: "2025-11-21T11:00:00.000+0100",
      updated: "2025-11-21T11:00:00.000+0100",
      author: {
        displayName: "Test User",
        emailAddress: "test@example.com",
        avatarUrls: null,
      },
      updateAuthor: {
        displayName: "Test User",
        emailAddress: "test@example.com",
        avatarUrls: null,
      },
    },
  ]
}

/**
 * Mock worklog list response with default data
 */
export function getDefaultMockWorklogList(): JiraWorklogListResponse {
  const worklogs = generateMockWorklogs()
  return {
    worklogs,
    total: worklogs.length,
    maxResults: 100,
    startAt: 0,
  }
}

/**
 * Setup worklog management mocks with stateful worklog data
 * This allows testing update and delete operations
 *
 * @param page - Playwright page instance
 *
 * @example
 * ```ts
 * await setupWorklogMocks({ page });
 * ```
 */
export async function setupWorklogMocks(options: { page: Page }): Promise<void> {
  await options.page.addInitScript(() => {
    let worklogData = [
      {
        id: "10001",
        timeSpentSeconds: 3600,
        timeSpent: "1h",
        started: "2025-11-21T10:00:00.000+0100",
        comment: "First worklog",
        created: "2025-11-21T09:00:00.000+0100",
        updated: "2025-11-21T09:00:00.000+0100",
        author: {
          displayName: "Test User",
          emailAddress: "test@example.com",
          avatarUrls: null,
        },
        updateAuthor: {
          displayName: "Test User",
          emailAddress: "test@example.com",
          avatarUrls: null,
        },
      },
      {
        id: "10002",
        timeSpentSeconds: 7200,
        timeSpent: "2h",
        started: "2025-11-21T12:00:00.000+0100",
        comment: "Second worklog",
        created: "2025-11-21T11:00:00.000+0100",
        updated: "2025-11-21T11:00:00.000+0100",
        author: {
          displayName: "Test User",
          emailAddress: "test@example.com",
          avatarUrls: null,
        },
        updateAuthor: {
          displayName: "Test User",
          emailAddress: "test@example.com",
          avatarUrls: null,
        },
      },
    ]

    // Setup window.__TAURI_INTERNALS__ if it doesn't exist
    if (!window.__TAURI_INTERNALS__) {
      window.__TAURI_INTERNALS__ = {
        metadata: {
          currentWindow: { label: "main" },
          currentWebview: { windowLabel: "main", label: "main" },
        },
        invoke: async () => null,
      } as unknown as typeof window.__TAURI_INTERNALS__
    }

    // Override invoke to handle worklog commands
    const previousInvoke = window.__TAURI_INTERNALS__.invoke
    window.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: unknown) => {
      if (cmd === "jira_get_worklogs") {
        return {
          worklogs: worklogData,
          total: worklogData.length,
          maxResults: 100,
          startAt: 0,
        }
      }

      if (cmd === "jira_update_worklog") {
        const payload = (args as Record<string, unknown> | undefined)?.payload as
          | { timeSpentSeconds: number; comment: string }
          | undefined
        if (payload) {
          const worklogId = (args as Record<string, unknown>).worklogId
          const worklog = worklogData.find((w) => w.id === worklogId)
          if (worklog) {
            worklog.timeSpentSeconds = payload.timeSpentSeconds
            worklog.comment = payload.comment
          }
        }
        const worklogId = (args as Record<string, unknown> | undefined)?.worklogId
        return { id: worklogId }
      }

      if (cmd === "jira_delete_worklog") {
        const worklogId = (args as Record<string, unknown> | undefined)?.worklogId
        worklogData = worklogData.filter((w) => w.id !== worklogId)
        return null
      }

      if (cmd === "jira_add_worklog") {
        const payload = (args as Record<string, unknown> | undefined)?.payload as
          | { timeSpentSeconds: number; comment: string; started: string }
          | undefined
        if (payload) {
          const newWorklog = {
            id: String(Date.now()),
            timeSpentSeconds: payload.timeSpentSeconds,
            timeSpent: "1h", // Simplified
            started: payload.started,
            comment: payload.comment,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            author: {
              displayName: "Test User",
              emailAddress: "test@example.com",
              avatarUrls: null,
            },
            updateAuthor: {
              displayName: "Test User",
              emailAddress: "test@example.com",
              avatarUrls: null,
            },
          }
          worklogData.unshift(newWorklog)
          return { id: newWorklog.id }
        }
      }

      // Call previous invoke for other commands
      return previousInvoke(cmd as never, args)
    }
  })
}
