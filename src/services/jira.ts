import { invoke } from "@tauri-apps/api/core";
import { JiraConfig, JiraSearchResponse } from "@/types/jira";

export const configService = {
  async save(config: { url: string; email: string; token: string }): Promise<void> {
    await invoke("save_jira_config", {
      url: config.url,
      email: config.email,
      token: config.token,
    });
  },

  async get(): Promise<JiraConfig> {
    const config = await invoke<JiraConfig>("get_jira_config");
    return config;
  },

  async clear(): Promise<void> {
    await invoke("clear_jira_config");
  },
};

export const jiraApi = {
  async searchIssues(config: JiraConfig, jql: string): Promise<JiraSearchResponse> {
    if (!config.url || !config.email || !config.token) {
      throw new Error("JIRA configuration is incomplete");
    }

    const auth = btoa(`${config.email}:${config.token}`);
    const url = `${config.url}/rest/api/2/search?jql=${encodeURIComponent(jql)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.statusText}`);
    }

    return response.json();
  },

  async getCurrentUserIssues(config: JiraConfig): Promise<JiraSearchResponse> {
    // Get issues assigned to the current user
    return this.searchIssues(
      config,
      "assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC"
    );
  },
};
