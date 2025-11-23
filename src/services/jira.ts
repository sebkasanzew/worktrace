import { info } from "@tauri-apps/plugin-log"
import {
  commands,
  type JiraSearchResponse,
  type JiraSettings,
  type JiraUserSession,
} from "@/types/bindings"
import { createJiraClient } from "./jiraClient"

export const configService = {
  async save(settings: JiraSettings): Promise<void> {
    await commands.saveJiraConfig(settings)
  },

  async get(): Promise<JiraSettings | null> {
    const result = await commands.getJiraConfig()
    if (result.status === "error") throw new Error(result.error)
    return result.data
  },

  async clear(): Promise<void> {
    await commands.clearJiraConfig()
  },
}

export const jiraApi = {
  async getCurrentUser(config: JiraSettings): Promise<JiraUserSession> {
    info("[JIRA API] Fetching current user info")
    const client = createJiraClient(config)
    return client.getCurrentUser()
  },

  async getCurrentUserIssues(config: JiraSettings): Promise<JiraSearchResponse> {
    info("[JIRA API] Fetching current user issues")
    const client = createJiraClient(config)
    return client.getCurrentUserIssues()
  },
}
