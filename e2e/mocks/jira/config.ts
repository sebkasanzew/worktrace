import { faker } from "@faker-js/faker"
import type { Page } from "@playwright/test"
import { mergePartially } from "merge-partially"
import type { AppSettings, JiraSettings } from "@/types/bindings"
import { injectCommandMock } from "../../utils/tauri"

interface ConfigMockOptions {
  /**
   * Playwright page instance to inject mock into
   */
  page: Page
  /**
   * Partial config to override default values
   */
  override?: Partial<JiraSettings>
  /**
   * Partial app settings to override default values
   */
  appSettings?: Partial<AppSettings>
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
 * @returns JiraSettings object
 */
function generateJiraConfig(options: { override?: Partial<JiraSettings> } = {}): JiraSettings {
  const response: JiraSettings = {
    instanceUrl: faker.internet.url({ appendSlash: false, protocol: "https" }),
    username: faker.internet.email(),
    apiToken: faker.string.alphanumeric({ length: 24 }),
  }

  return options.override ? mergePartially.deep(response, options.override) : response
}

const defaultAppSettings: AppSettings = {
  general: {
    theme: "system",
    worklogTypes: [],
    defaultWorklogDescription: "",
    enableAutomaticUpdates: false,
    alwaysOnTop: false,
    customIssueKeys: [],
    language: null,
  },
  jira: null,
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
 *   override: { instanceUrl: "https://mycompany.atlassian.net" }
 * });
 * ```
 */
export async function mockJiraConfig(options: ConfigMockOptions): Promise<void> {
  const config = generateJiraConfig({ override: options.override })
  const appSettings = options.appSettings
    ? mergePartially.deep(defaultAppSettings, options.appSettings)
    : { ...defaultAppSettings }

  // Ensure jira settings are synced if not explicitly provided in appSettings
  if (!appSettings.jira) {
    appSettings.jira = config
  }

  await injectCommandMock(options.page, "get_jira_config", config)
  await injectCommandMock(options.page, "get_app_settings", appSettings)
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
  await injectCommandMock(options.page, "get_jira_config", null)
  await injectCommandMock(options.page, "get_app_settings", defaultAppSettings)
  await injectCommandMock(options.page, "save_app_settings", null)
}

/**
 * Get default mock config data for use in mockJiraData
 * @internal
 */
export function getDefaultMockConfig(): JiraSettings {
  return generateJiraConfig({
    override: {
      instanceUrl: "https://test.atlassian.net",
      username: "test@example.com",
      apiToken: "test-token",
    },
  })
}
