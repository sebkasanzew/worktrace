import { faker } from "@faker-js/faker"
import type { Page } from "@playwright/test"
import { mergePartially } from "merge-partially"
import type { JiraConfig } from "@/types/bindings"
import { injectCommandMock } from "../../utils/tauri"

interface ConfigMockOptions {
  /**
   * Playwright page instance to inject mock into
   */
  page: Page
  /**
   * Partial config to override default values
   */
  override?: Partial<JiraConfig>
}

interface EmptyConfigMockOptions {
  /**
   * Playwright page instance to inject mock into
   */
  page: Page
}

/**
 * Generate JIRA configuration mock data with faker
 * @param options.override - Partial config to override default values
 * @returns JiraConfig object
 */
function generateJiraConfig(options: { override?: Partial<JiraConfig> } = {}): JiraConfig {
  const response: JiraConfig = {
    url: faker.internet.url({ appendSlash: false, protocol: "https" }),
    username: faker.internet.email(),
    password: faker.string.alphanumeric({ length: 24 }),
  }

  return options.override ? mergePartially.deep(response, options.override) : response
}

const defaultAppSettings = {
  jiraInstanceUrl: "",
  jiraUsername: "",
  jiraApiToken: "",
  theme: "system",
  worklogTypes: [],
  defaultWorklogDescription: "",
  enableAutomaticUpdates: false,
  alwaysOnTop: false,
}

/**
 * Mock JIRA config as stored - main function for tests
 * Injects a mocked JIRA configuration into the page
 *
 * @param options.page - Playwright page instance
 * @param options.override - Partial config to override default faker values
 *
 * @example
 * ```ts
 * await mockJiraConfig({
 *   page,
 *   override: { url: "https://mycompany.atlassian.net" }
 * });
 * ```
 */
export async function mockJiraConfig(options: ConfigMockOptions): Promise<void> {
  const config = generateJiraConfig({ override: options.override })
  await injectCommandMock(options.page, "get_jira_config", config)
  await injectCommandMock(options.page, "get_app_settings", defaultAppSettings)
  await injectCommandMock(options.page, "save_app_settings", null)
}

/**
 * Mock JIRA config as empty/not configured
 * Useful for testing login/setup flows
 *
 * @param options.page - Playwright page instance
 *
 * @example
 * ```ts
 * await mockNoJiraConfig({ page });
 * ```
 */
export async function mockNoJiraConfig(options: EmptyConfigMockOptions): Promise<void> {
  const emptyConfig: JiraConfig = {
    url: null,
    username: null,
    password: null,
  }

  await injectCommandMock(options.page, "get_jira_config", emptyConfig)
  await injectCommandMock(options.page, "get_app_settings", defaultAppSettings)
  await injectCommandMock(options.page, "save_app_settings", null)
}

/**
 * Get default mock config data for use in mockJiraData
 * @internal
 */
export function getDefaultMockConfig(): JiraConfig {
  return generateJiraConfig({
    override: {
      url: "https://test.atlassian.net",
      username: "test@example.com",
      password: "test-token",
    },
  })
}
