import { faker } from "@faker-js/faker"
import {
  appSettingsSchema,
  jiraConfigSchema,
  jiraSearchResponseSchema,
  jiraUserSessionSchema,
} from "@/types/bindings.zod"

// Mock data generators
const mockUser = {
  self: "https://jira.example.com/rest/api/2/user?username=demo",
  name: "demo",
  key: "demo",
  emailAddress: "demo@example.com",
  avatarUrls: {
    "48x48": faker.image.avatar(),
    "24x24": faker.image.avatar(),
    "16x16": faker.image.avatar(),
    "32x32": faker.image.avatar(),
  },
  displayName: "Demo User",
  active: true,
  timeZone: "Europe/Berlin",
}

const mockAppSettings = {
  jiraInstanceUrl: "https://jira.example.com",
  jiraUsername: "demo",
  jiraApiToken: "token",
  theme: "system",
  worklogTypes: [
    { name: "Development", shortCode: "DEV" },
    { name: "Meeting", shortCode: "MEET" },
  ],
  defaultWorklogDescription: "",
  enableAutomaticUpdates: false,
  alwaysOnTop: false,
  customIssueKeys: [],
}

const mockStore = new Map<string, unknown>([["app_settings", mockAppSettings]])

// Polyfill window.__TAURI_INTERNALS__
if (typeof window !== "undefined" && !window.__TAURI_INTERNALS__) {
  console.log("[Mock Tauri] Initializing mock Tauri environment v2")

  // biome-ignore lint/suspicious/noExplicitAny: Mock implementation needs to be flexible
  ;(window as any).__TAURI_INTERNALS__ = {
    // biome-ignore lint/suspicious/noExplicitAny: Mock implementation needs to be flexible
    transformCallback: (_callback: any) => {
      // Return a fake callback ID
      return Math.floor(Math.random() * 1000000)
    },
    // biome-ignore lint/suspicious/noExplicitAny: Mock implementation needs to be flexible
    invoke: async (cmd: string, args: any) => {
      console.log(`[Mock Tauri] invoke: ${cmd}`, args)

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      switch (cmd) {
        case "get_jira_config":
          return jiraConfigSchema.parse({
            url: "https://jira.example.com",
            username: "demo",
            password: "token",
          })

        case "get_app_settings":
          return appSettingsSchema.parse(mockAppSettings)

        case "save_app_settings":
          Object.assign(mockAppSettings, args.settings)
          return null

        case "jira_get_current_user":
          return jiraUserSessionSchema.parse(mockUser)

        case "jira_api_request": {
          // Re-generate issues to ensure fresh data
          const issues = Array.from({ length: 5 }).map(() => ({
            id: faker.string.numeric(5),
            key: `PROJ-${faker.string.numeric(3)}`,
            fields: {
              summary: faker.company.catchPhrase(),
              status: {
                name: "In Progress",
                statusCategory: {
                  key: "indeterminate",
                  name: "In Progress",
                },
              },
              priority: { name: "Medium", iconUrl: faker.image.url() },
              issuetype: { name: "Task", iconUrl: faker.image.url() },
              assignee: mockUser,
              created: Date.now(),
              updated: Date.now(),
              subtasks: [],
            },
          }))

          const response = {
            issues,
            total: issues.length,
            isLast: true,
          }

          console.log("[Mock Tauri] jira_api_request response:", response)
          return jiraSearchResponseSchema.parse(response)
        }

        case "plugin:store|load":
          // Return a fake resource ID
          return 123

        case "plugin:store|get": {
          // In v2, get returns [value, exists]
          const value = mockStore.get(args.key)
          const exists = mockStore.has(args.key)
          return [value, exists]
        }

        case "plugin:store|set":
          mockStore.set(args.key, args.value)
          return null

        case "plugin:store|save":
          return null

        case "plugin:log|log":
          console.log(`[App Log] ${args.message}`)
          return null

        case "plugin:updater|check":
          return null

        case "plugin:event|listen":
          // Return a fake event ID
          return Math.floor(Math.random() * 1000000)

        case "plugin:event|unlisten":
          return null

        default:
          console.warn(`[Mock Tauri] Unhandled command: ${cmd}`)
          return null
      }
    },
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { windowLabel: "main", label: "main" },
    },
  }

  // biome-ignore lint/suspicious/noExplicitAny: Mock implementation needs to be flexible
  ;(window as any).__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: (event: string, eventId: number) => {
      console.log(`[Mock Tauri] unregisterListener: ${event} ${eventId}`)
    },
  }
}
