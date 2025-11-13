import { faker } from "@faker-js/faker";
import type { Page } from "@playwright/test";
import { mergePartially } from "merge-partially";
import type { JiraUserSession } from "@/types/bindings";
import { injectCommandMock } from "../../utils/tauri";

interface UserSessionMockOptions {
  /**
   * Playwright page instance to inject mock into
   */
  page: Page;
  /**
   * Partial user session to override default values
   */
  override?: Partial<JiraUserSession>;
}

/**
 * Generate JIRA user session mock data with faker
 * @param options.override - Partial user session to override default values
 * @returns JiraUserSession object
 */
function generateJiraUserSession(
  options: { override?: Partial<JiraUserSession> } = {}
): JiraUserSession {
  const response: JiraUserSession = {
    name: faker.person.fullName(),
  };

  return mergePartially.deep(response, options.override);
}

/**
 * Mock JIRA user session - main function for tests
 * Injects a mocked current user session into the page
 *
 * @param options.page - Playwright page instance
 * @param options.override - Partial user session to override default faker values
 *
 * @example
 * ```ts
 * await mockJiraUserSession({
 *   page,
 *   override: { name: "John Doe" }
 * });
 * ```
 */
export async function mockJiraUserSession(options: UserSessionMockOptions): Promise<void> {
  const userSession = generateJiraUserSession({ override: options.override });
  await injectCommandMock(options.page, "jira_get_current_user", userSession);
}

/**
 * Get default mock user session data for use in mockJiraData
 * @internal
 */
export function getDefaultMockUserSession(): JiraUserSession {
  return generateJiraUserSession({
    override: {
      name: "Test User",
    },
  });
}
