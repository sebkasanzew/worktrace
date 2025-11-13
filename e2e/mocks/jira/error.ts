import type { Page } from "@playwright/test";
import type { TauriCommand } from "../../utils/tauri";

interface JiraErrorMockOptions {
  /**
   * Playwright page instance to inject mock into
   */
  page: Page;
  /**
   * Error message to throw for JIRA API calls
   */
  errorMessage: string;
}

/**
 * Mock JIRA API error responses - main function for tests
 * Useful for testing error handling in the UI
 *
 * @param options.page - Playwright page instance
 * @param options.errorMessage - Error message to throw
 *
 * @example
 * ```ts
 * await mockJiraError({
 *   page,
 *   errorMessage: "Network error"
 * });
 * ```
 */
export async function mockJiraError(options: JiraErrorMockOptions): Promise<void> {
  await options.page.addInitScript((message: string) => {
    window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {};
    window.__TAURI_INTERNALS__.invoke = async (cmd: TauriCommand) => {
      if (cmd === "jira_api_request" || cmd === "jira_get_current_user") {
        throw new Error(message);
      }
      return null;
    };
  }, options.errorMessage);
}
