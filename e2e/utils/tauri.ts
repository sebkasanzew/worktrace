import type { Page } from "@playwright/test"
import {
  getDefaultMockConfig,
  getDefaultMockSearchResponse,
  getDefaultMockUserSession,
} from "../mocks/jira"

// Tauri command names from bindings.ts
export type TauriCommand =
  | "jira_api_request"
  | "jira_get_current_user"
  | "jira_add_worklog"
  | "save_jira_config"
  | "get_jira_config"
  | "clear_jira_config"
  | "plugin:updater|check"
  | "plugin:store|load"
  | "plugin:store|set"
  | "plugin:store|save"
  | "plugin:store|get"

// Tauri type definitions for E2E tests
interface TauriInternals {
  metadata: {
    currentWindow: { label: string }
    currentWebview: { windowLabel: string; label: string }
  }
  invoke: (cmd: TauriCommand, args: unknown) => Promise<unknown>
}

declare global {
  interface Window {
    __TAURI_INTERNALS__: TauriInternals
    __TAURI_INVOKE_LOG?: string[]
    __TAURI_MOCK_EMIT?: (event: string, payload: unknown) => void
  }
}

interface TauriEvent {
  event: string
  payload: unknown
}

/**
 * Default mock data for JIRA API responses
 * Using faker-based mock functions for consistent test data
 */
export const mockJiraData = {
  config: getDefaultMockConfig(),
  currentUser: getDefaultMockUserSession(),
  searchResponse: getDefaultMockSearchResponse(),
}

/**
 * Helper to inject a mock for a single Tauri command
 * Reduces duplication in mock files by providing a reusable pattern
 *
 * @param page - Playwright page instance
 * @param commandName - The Tauri command to mock
 * @param mockData - The data to return for that command
 */
export async function injectCommandMock<T>(
  page: Page,
  commandName: TauriCommand,
  mockData: T
): Promise<void> {
  await page.addInitScript(
    ([cmd, data]) => {
      window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {}
      const originalInvoke = window.__TAURI_INTERNALS__.invoke

      window.__TAURI_INTERNALS__.invoke = async (command, args) => {
        if (command === cmd) {
          return data
        }
        return originalInvoke ? originalInvoke(command, args) : null
      }
    },
    [commandName, mockData]
  )
}

/**
 * Helper to inject error mocks for multiple Tauri commands
 * Useful for testing error handling in the UI
 *
 * @param page - Playwright page instance
 * @param commands - Array of commands that should throw errors
 * @param errorMessage - Error message to throw
 */
export async function injectCommandErrors(
  page: Page,
  commands: TauriCommand[],
  errorMessage: string
): Promise<void> {
  await page.addInitScript(
    ([cmds, message]) => {
      window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {}
      window.__TAURI_INTERNALS__.invoke = async (cmd) => {
        if (cmds.includes(cmd)) {
          const errorMessage = typeof message === "string" ? message : "message is not a string"
          throw new Error(errorMessage)
        }
        return null
      }
    },
    [commands, errorMessage]
  )
}

/**
 * Creates the mock invoke handler function
 * Separated for clarity and easier maintenance
 */
function createMockInvokeHandler(responses: Record<string, unknown>) {
  return async (cmd: TauriCommand, _args?: unknown) => {
    // Simple call log for debugging
    window.__TAURI_INVOKE_LOG = window.__TAURI_INVOKE_LOG || []
    window.__TAURI_INVOKE_LOG.push(cmd)

    // Return mocked response if available
    if (responses[cmd]) {
      return responses[cmd]
    }

    // Updater plugin mock: return no update by default
    if (cmd === "plugin:updater|check") {
      return null
    }

    // Store plugin minimal mocks
    if (cmd === "plugin:store|load") return null
    if (cmd === "plugin:store|set") return null
    if (cmd === "plugin:store|save") return null
    if (cmd === "plugin:store|get") return null

    // Default responses for common commands
    switch (cmd) {
      case "get_jira_config":
        return mockJiraData.config

      case "save_jira_config":
        return null

      case "clear_jira_config":
        return null

      case "jira_get_current_user":
        return mockJiraData.currentUser

      case "jira_api_request":
        return mockJiraData.searchResponse

      case "jira_add_worklog":
        return { id: "1" }

      default:
        throw new Error(`Unhandled Tauri command: ${cmd}`)
    }
  }
}

/**
 * Sets up Tauri IPC mocks for e2e tests
 * Call this in page.addInitScript() before navigating
 */
export function setupTauriMocks(responses: Record<string, unknown> = {}) {
  // Use proper function instead of string template
  return () => {
    const mockInvoke = createMockInvokeHandler(responses)

    window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {}
    window.__TAURI_INTERNALS__.invoke = mockInvoke

    // Mock plugin-log (cast to unknown first to avoid type conflicts)
    ;(window.__TAURI_INTERNALS__ as unknown as Record<string, unknown>).log = {
      log: () => Promise.resolve(),
      info: () => Promise.resolve(),
      warn: () => Promise.resolve(),
      error: () => Promise.resolve(),
      debug: () => Promise.resolve(),
    }

    // Mock tauri event API
    const listeners = new Map<string, Array<(event: TauriEvent) => void>>()
    ;(window.__TAURI_INTERNALS__ as unknown as Record<string, unknown>).event = {
      listen: async (event: string, cb: (event: TauriEvent) => void) => {
        const arr = listeners.get(event) || []
        arr.push(cb)
        listeners.set(event, arr)
        return () => {
          const list = listeners.get(event) || []
          const idx = list.indexOf(cb)
          if (idx > -1) list.splice(idx, 1)
          listeners.set(event, list)
        }
      },
    }

    // Helper to emit events from tests
    window.__TAURI_MOCK_EMIT = (event: string, payload: unknown) => {
      const list = listeners.get(event) || []
      for (const cb of list) cb({ event, payload })
    }
  }
}

/**
 * Helper to mock Tauri invoke responses for a page
 */
export async function mockTauriInvoke(
  page: Page,
  responses: Record<string, unknown> = {}
): Promise<void> {
  await page.addInitScript(setupTauriMocks(responses))
}
