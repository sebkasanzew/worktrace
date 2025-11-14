import { invoke } from "@tauri-apps/api/core"
import { info } from "@tauri-apps/plugin-log"
import type { JiraSearchResponse, JiraUserSession } from "@/types/bindings"
import type { JiraConfig } from "@/types/jira"
import { createJiraClient } from "./jiraClient"

export const configService = {
  async save(config: { url: string; username: string; password: string }): Promise<void> {
    await invoke("save_jira_config", {
      url: config.url,
      username: config.username,
      password: config.password,
    })
  },

  async get(): Promise<JiraConfig> {
    const config = await invoke<JiraConfig>("get_jira_config")
    return config
  },

  async clear(): Promise<void> {
    await invoke("clear_jira_config")
  },
}

export const jiraApi = {
  async getCurrentUser(config: JiraConfig): Promise<JiraUserSession> {
    info("[JIRA API] Fetching current user info")
    const client = createJiraClient(config)
    return client.getCurrentUser()
  },

  async getCurrentUserIssues(config: JiraConfig): Promise<JiraSearchResponse> {
    info("[JIRA API] Fetching current user issues")
    const client = createJiraClient(config)
    return client.getCurrentUserIssues()
  },
}
