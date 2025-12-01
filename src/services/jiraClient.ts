import { invoke } from "@tauri-apps/api/core"
import { debug, info, error as logError } from "@tauri-apps/plugin-log"
import { z } from "zod"
import { redactSensitive, safeStringify } from "@/lib/utils"
import type { UserWorklogsResponse, WorklogPayload, WorklogResponse } from "@/types/bindings"
import {
  commands,
  type JiraSearchResponse,
  type JiraSettings,
  type JiraUserSession,
  type JiraWorklogListResponse,
} from "@/types/bindings"
import {
  jiraSearchResponseSchema,
  jiraUserSessionSchema,
  jiraWorklogListResponseSchema,
  userWorklogsResponseSchema,
} from "@/types/bindings.zod"

/**
 * Validates that JIRA config has all required fields
 * @throws Error if config is incomplete
 */
export function assertJiraConfig(config: JiraSettings): asserts config is JiraSettings {
  if (!config.instanceUrl || !config.username || !config.apiToken) {
    throw new Error("JIRA configuration is incomplete")
  }
}

/**
 * Normalizes JIRA URL by ensuring protocol and removing trailing slash
 */
export function normalizeJiraUrl(url: string): string {
  let normalized = url.trim()

  // Add https:// if no protocol specified
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`
  }

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, "")

  return normalized
}

/**
 * Maps JIRA API errors to user-friendly messages
 */
export function mapJiraError(error: unknown, config: JiraSettings): Error {
  if (!(error instanceof Error)) {
    return new Error("Unknown error occurred while communicating with JIRA")
  }

  const message = error.message
  logError(`[JIRA Client] Error: ${message}`)

  if (message.includes("401")) {
    return new Error(
      "Authentication failed. Please check your JIRA credentials (email and API token)."
    )
  }
  if (message.includes("403")) {
    return new Error("Access forbidden. Please check your permissions in JIRA.")
  }
  if (message.includes("404")) {
    return new Error(
      `JIRA instance not found. Please verify the URL: ${redactSensitive(config.instanceUrl)}`
    )
  }
  if (message.toLowerCase().includes("connection") || message.includes("network")) {
    return new Error(
      `Cannot connect to ${redactSensitive(config.instanceUrl)}. Please check the URL and your internet connection.`
    )
  }

  return new Error(`JIRA API error: ${message}`)
}

/**
 * Creates a typed JIRA API client with validation
 */
export function createJiraClient(config: JiraSettings) {
  assertJiraConfig(config)
  const normalizedUrl = normalizeJiraUrl(config.instanceUrl)
  const { username, apiToken: password, apiVersion, authType } = config

  debug(`[JIRA Client] Using URL: ${redactSensitive(normalizedUrl)}`)

  return {
    /**
     * Fetches current user session info
     */
    async getCurrentUser(): Promise<JiraUserSession> {
      info("[JIRA Client] Fetching current user info")

      try {
        const result = await commands.jiraGetCurrentUser(normalizedUrl, username, password)

        if (result.status === "error") {
          throw new Error(result.error)
        }

        // Validate response with Zod
        const validated = jiraUserSessionSchema.parse(result.data)
        debug(`[JIRA Client] Current user: ${validated.name}`)

        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to get current user: ${redactSensitive(String(error))}`)
        throw mapJiraError(error, config)
      }
    },

    /**
     * Searches for issues using JQL
     */
    async searchIssues(jql: string): Promise<JiraSearchResponse> {
      info("[JIRA Client] Searching issues")
      debug(`[JIRA Client] JQL: "${redactSensitive(jql)}"`)

      try {
        const data = await invoke<JiraSearchResponse>("jira_api_request", {
          url: normalizedUrl,
          username,
          password,
          jql,
          apiVersion: apiVersion ?? null,
          authType: authType ?? null,
        })

        // Validate response with Zod
        const validated = jiraSearchResponseSchema.parse(data)
        info(`[JIRA Client] Found ${validated.issues.length} issues`)

        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to search issues: ${redactSensitive(String(error))}`)
        throw mapJiraError(error, config)
      }
    },

    /**
     * Gets current user's unresolved issues
     */
    async getCurrentUserIssues(): Promise<JiraSearchResponse> {
      const jql = "assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC"
      return this.searchIssues(jql)
    },

    /**
     * Adds a worklog to a JIRA issue
     */
    async addWorklog(issueKey: string, payload: WorklogPayload): Promise<WorklogResponse> {
      info(`[JIRA Client] Adding worklog to ${issueKey}`)
      debug(`[JIRA Client] Payload: ${safeStringify(payload, true)}`)
      const schema = z.object({ id: z.string() })
      try {
        const result = await invoke("jira_add_worklog", {
          connection: {
            url: normalizedUrl,
            username,
            password,
            apiVersion: apiVersion ?? "3",
            authType: authType ?? "Basic",
          },
          issueKey,
          payload,
        })
        const validated = schema.parse(result)
        debug(`[JIRA Client] Worklog created: ${validated.id}`)
        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to add worklog: ${redactSensitive(String(error))}`)
        throw mapJiraError(error, config)
      }
    },

    /**
     * Gets worklogs for a specific issue
     */
    async getWorklogs(issueKey: string): Promise<JiraWorklogListResponse> {
      info(`[JIRA Client] Fetching worklogs for ${issueKey}`)

      try {
        const data = await invoke<JiraWorklogListResponse>("jira_get_worklogs", {
          connection: {
            url: normalizedUrl,
            username,
            password,
            apiVersion: apiVersion ?? "3",
            authType: authType ?? "Basic",
          },
          issueKey,
        })

        // Validate response with Zod
        const validated = jiraWorklogListResponseSchema.parse(data)
        debug(`[JIRA Client] Found ${validated.worklogs.length} worklogs`)

        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to get worklogs: ${redactSensitive(String(error))}`)
        throw mapJiraError(error, config)
      }
    },

    /**
     * Gets worklogs for the current user within a date range
     */
    async getUserWorklogsByDateRange(
      startDate: string,
      endDate: string
    ): Promise<UserWorklogsResponse> {
      info(`[JIRA Client] Fetching user worklogs from ${startDate} to ${endDate}`)

      try {
        const data = await invoke<UserWorklogsResponse>("jira_get_user_worklogs_by_date_range", {
          connection: {
            url: normalizedUrl,
            username,
            password,
            apiVersion: apiVersion ?? "3",
            authType: authType ?? "Basic",
          },
          startDate,
          endDate,
        })

        // Validate response with Zod
        const validated = userWorklogsResponseSchema.parse(data)
        debug(
          `[JIRA Client] Found ${validated.entries.length} worklogs totaling ${validated.totalTimeSeconds}s`
        )

        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to get user worklogs: ${redactSensitive(String(error))}`)
        throw mapJiraError(error, config)
      }
    },

    /**
     * Updates a worklog
     */
    async updateWorklog(
      issueKey: string,
      worklogId: string,
      payload: WorklogPayload
    ): Promise<WorklogResponse> {
      info(`[JIRA Client] Updating worklog ${worklogId} for ${issueKey}`)
      debug(`[JIRA Client] Payload: ${safeStringify(payload, true)}`)
      const schema = z.object({ id: z.string() })
      try {
        const result = await invoke("jira_update_worklog", {
          connection: {
            url: normalizedUrl,
            username,
            password,
            apiVersion: apiVersion ?? "3",
            authType: authType ?? "Basic",
          },
          issueKey,
          worklogId,
          payload,
        })
        const validated = schema.parse(result)
        debug(`[JIRA Client] Worklog updated: ${validated.id}`)
        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to update worklog: ${redactSensitive(String(error))}`)
        throw mapJiraError(error, config)
      }
    },

    /**
     * Deletes a worklog
     */
    async deleteWorklog(issueKey: string, worklogId: string): Promise<void> {
      info(`[JIRA Client] Deleting worklog ${worklogId} from ${issueKey}`)

      try {
        await invoke("jira_delete_worklog", {
          connection: {
            url: normalizedUrl,
            username,
            password,
            apiVersion: apiVersion ?? "3",
            authType: authType ?? "Basic",
          },
          issueKey,
          worklogId,
        })
        debug(`[JIRA Client] Worklog deleted: ${worklogId}`)
      } catch (error) {
        logError(`[JIRA Client] Failed to delete worklog: ${redactSensitive(String(error))}`)
        throw mapJiraError(error, config)
      }
    },
  }
}

export type JiraClient = ReturnType<typeof createJiraClient>
