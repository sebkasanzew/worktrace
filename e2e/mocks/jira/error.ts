import type { Page } from "@playwright/test";
import { injectCommandErrors } from "../../utils/tauri";

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
  await injectCommandErrors(
    options.page,
    ["jira_api_request", "jira_get_current_user"],
    options.errorMessage
  );
}
