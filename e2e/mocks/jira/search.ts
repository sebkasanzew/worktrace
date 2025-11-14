import { faker } from "@faker-js/faker"
import type { Page } from "@playwright/test"
import { mergePartially } from "merge-partially"
import type {
  JiraAssignee,
  JiraFields,
  JiraIssue,
  JiraSearchResponse,
  JiraStatus,
} from "@/types/bindings"
import { injectCommandMock } from "../../utils/tauri"

interface SearchResponseMockOptions {
  /**
   * Playwright page instance to inject mock into
   */
  page: Page
  /**
   * Number of issues to generate in the response
   * @default 2
   */
  issueCount?: number
  /**
   * Partial search response to override default values
   */
  override?: Partial<JiraSearchResponse>
}

/**
 * Generate a mock JIRA assignee
 */
function mockJiraAssignee(): JiraAssignee {
  return {
    displayName: faker.person.fullName(),
    emailAddress: faker.internet.email(),
  }
}

/**
 * Generate a mock JIRA status
 */
function mockJiraStatus(): JiraStatus {
  return {
    name: faker.helpers.arrayElement(["To Do", "In Progress", "Done", "Blocked", "In Review"]),
  }
}

/**
 * Generate a mock JIRA issue
 */
function mockJiraIssue(): JiraIssue {
  const projectKey = faker.string.alpha({ length: 3, casing: "upper" })
  const issueNumber = faker.number.int({ min: 1, max: 9999 })

  const fields: JiraFields = {
    summary: faker.lorem.sentence({ min: 3, max: 8 }),
    status: mockJiraStatus(),
    assignee: faker.datatype.boolean() ? mockJiraAssignee() : null,
    created: faker.date.past().getTime(),
    updated: faker.date.recent().getTime(),
  }

  return {
    id: faker.string.numeric({ length: 5 }),
    key: `${projectKey}-${issueNumber}`,
    fields,
  }
}

/**
 * Generate JIRA search response mock data with faker
 * @param options.issueCount - Number of issues to generate (default: 2)
 * @param options.override - Partial search response to override default values
 * @returns JiraSearchResponse object
 */
function generateJiraSearchResponse(
  options: { issueCount?: number; override?: Partial<JiraSearchResponse> } = {}
): JiraSearchResponse {
  const issueCount = options.issueCount ?? 2

  const response: JiraSearchResponse = {
    issues: Array.from({ length: issueCount }, () => mockJiraIssue()),
    total: issueCount,
    isLast: true,
  }

  return options.override ? mergePartially.deep(response, options.override) : response
}

/**
 * Mock JIRA search response - main function for tests
 * Injects mocked search results into the page
 *
 * @param options.page - Playwright page instance
 * @param options.issueCount - Number of issues to generate (default: 2)
 * @param options.override - Partial search response to override default faker values
 *
 * @example
 * ```ts
 * await mockJiraSearchResponse({
 *   page,
 *   issueCount: 5,
 *   override: { isLast: false }
 * });
 * ```
 */
export async function mockJiraSearchResponse(options: SearchResponseMockOptions): Promise<void> {
  const searchResponse = generateJiraSearchResponse({
    issueCount: options.issueCount,
    override: options.override,
  })

  await injectCommandMock(options.page, "jira_api_request", searchResponse)
}

/**
 * Get default mock search response data for use in mockJiraData
 * @internal
 */
export function getDefaultMockSearchResponse(): JiraSearchResponse {
  return generateJiraSearchResponse({ issueCount: 2 })
}
