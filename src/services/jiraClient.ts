import { invoke } from "@tauri-apps/api/core"
import { debug, info, error as logError } from "@tauri-apps/plugin-log"
import { z } from "zod"
import { redactSensitive } from "@/lib/utils"
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
} from "@/types/bindings.zod"
import type { WorklogPayload, WorklogResponse } from "@/types/jira"

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
  const { username, apiToken: password } = config

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
        logError(`[JIRA Client] Failed to get current user: ${error}`)
        throw mapJiraError(error, config)
      }
    },

    /**
     * Searches for issues using JQL
     */
    async searchIssues(jql: string): Promise<JiraSearchResponse> {
      info("[JIRA Client] Searching issues")
      debug(`[JIRA Client] JQL: "${jql}"`)

      try {
        const result = await commands.jiraApiRequest(normalizedUrl, username, password, jql)

        if (result.status === "error") {
          throw new Error(result.error)
        }

        // Validate response with Zod
        const validated = jiraSearchResponseSchema.parse(result.data)
        info(`[JIRA Client] Found ${validated.issues.length} issues`)

        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to search issues: ${error}`)
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
      debug(
        `[JIRA Client] Payload: ${payload.timeSpentSeconds}s, comment: "${payload.comment}", started: ${payload.started}`
      )
      const schema = z.object({ id: z.string() })
      try {
        const result = await invoke("jira_add_worklog", {
          url: normalizedUrl,
          username,
          password,
          issueKey,
          payload,
        })
        const validated = schema.parse(result)
        debug(`[JIRA Client] Worklog created: ${validated.id}`)
        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to add worklog: ${error}`)
        throw mapJiraError(error, config)
      }
    },

    /**
     * Gets worklogs for a specific issue
     */
    async getWorklogs(issueKey: string): Promise<JiraWorklogListResponse> {
      info(`[JIRA Client] Fetching worklogs for ${issueKey}`)

      try {
        const result = await commands.jiraGetWorklogs(normalizedUrl, username, password, issueKey)

        if (result.status === "error") {
          throw new Error(result.error)
        }

        // Validate response with Zod
        const validated = jiraWorklogListResponseSchema.parse(result.data)
        debug(`[JIRA Client] Found ${validated.worklogs.length} worklogs`)

        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to get worklogs: ${error}`)
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
      debug(
        `[JIRA Client] Payload: ${payload.timeSpentSeconds}s, comment: "${payload.comment}", started: ${payload.started}`
      )
      const schema = z.object({ id: z.string() })
      try {
        const result = await invoke("jira_update_worklog", {
          url: normalizedUrl,
          username,
          password,
          issueKey,
          worklogId,
          payload,
        })
        const validated = schema.parse(result)
        debug(`[JIRA Client] Worklog updated: ${validated.id}`)
        return validated
      } catch (error) {
        logError(`[JIRA Client] Failed to update worklog: ${error}`)
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
          url: normalizedUrl,
          username,
          password,
          issueKey,
          worklogId,
        })
        debug(`[JIRA Client] Worklog deleted: ${worklogId}`)
      } catch (error) {
        logError(`[JIRA Client] Failed to delete worklog: ${error}`)
        throw mapJiraError(error, config)
      }
    },
  }
}

export type JiraClient = ReturnType<typeof createJiraClient>
