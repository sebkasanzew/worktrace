import { invoke } from "@tauri-apps/api/core";
import { debug, info, error as logError, warn } from "@tauri-apps/plugin-log";
import type { JiraConfig, JiraSearchResponse } from "@/types/jira";

export const configService = {
  async save(config: { url: string; username: string; password: string }): Promise<void> {
    await invoke("save_jira_config", {
      url: config.url,
      username: config.username,
      password: config.password,
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
  async getCurrentUser(config: JiraConfig): Promise<unknown> {
    info("[JIRA API] Fetching current user info");

    if (!config.url || !config.username || !config.password) {
      throw new Error("JIRA configuration is incomplete");
    }

    try {
      const userInfo = await invoke("jira_get_current_user", {
        url: config.url,
        username: config.username,
        password: config.password,
      });

      debug(`[JIRA API] Current user info: ${JSON.stringify(userInfo)}`);
      return userInfo;
    } catch (error) {
      logError(`[JIRA API] Failed to get current user: ${error}`);
      throw error;
    }
  },

  async getCurrentUserIssues(config: JiraConfig): Promise<JiraSearchResponse> {
    info("[JIRA API] Fetching current user issues");
    debug(`[JIRA API] Config URL: ${config.url}`);
    debug(`[JIRA API] Config username: ${config.username}`);

    if (!config.url || !config.username || !config.password) {
      const errorMsg = "JIRA configuration is incomplete";
      logError(`[JIRA API] Error: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    try {
      // Query for all unresolved issues assigned to the current user
      const jql = "assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC";
      debug(`[JIRA API] Using JQL: "${jql}"`);

      const result = await invoke<JiraSearchResponse>("jira_api_request", {
        url: config.url,
        username: config.username,
        password: config.password,
        jql,
      });

      debug(`[JIRA API] Response received: ${JSON.stringify(result)}`);
      info(`[JIRA API] Issues found: ${result.issues?.length || 0}`);

      if (!result.issues || result.issues.length === 0) {
        warn("[JIRA API] No issues returned. This could mean:");
        warn("  - No issues are assigned to you");
        warn("  - All your issues are resolved");
        warn("  - The JQL query doesn't match any issues");
      }

      info(`[JIRA API] Successfully fetched ${result.issues?.length ?? 0} issues`);

      return result;
    } catch (error) {
      logError(`[JIRA API] Error details: ${error}`);

      if (error instanceof Error) {
        const errorMessage = error.message;
        logError(`[JIRA API] Error message: ${errorMessage}`);

        if (errorMessage.includes("401")) {
          throw new Error(
            "Authentication failed. Please check your JIRA credentials (email and API token)."
          );
        }
        if (errorMessage.includes("403")) {
          throw new Error("Access forbidden. Please check your permissions in JIRA.");
        }
        if (errorMessage.includes("404")) {
          throw new Error(`JIRA instance not found. Please verify the URL: ${config.url}`);
        }
        if (errorMessage.toLowerCase().includes("connection") || errorMessage.includes("network")) {
          throw new Error(
            `Cannot connect to ${config.url}. Please check the URL and your internet connection.`
          );
        }

        throw new Error(`JIRA API error: ${errorMessage}`);
      }

      throw new Error("Unknown error occurred while fetching issues");
    }
  },
};
