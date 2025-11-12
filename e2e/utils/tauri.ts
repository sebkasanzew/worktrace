import type { Page } from "@playwright/test";

/**
 * Mock data for JIRA API responses
 */
export const mockJiraData = {
  config: {
    url: "https://test.atlassian.net",
    username: "test@example.com",
    password: "test-token",
  },
  currentUser: {
    name: "Test User",
  },
  searchResponse: {
    issues: [
      {
        id: "10001",
        key: "TEST-1",
        fields: {
          summary: "Test Issue 1",
          status: { name: "In Progress" },
          assignee: {
            displayName: "Test User",
            emailAddress: "test@example.com",
          },
          created: Date.now() - 86400000,
          updated: Date.now(),
        },
      },
      {
        id: "10002",
        key: "TEST-2",
        fields: {
          summary: "Test Issue 2",
          status: { name: "To Do" },
          assignee: {
            displayName: "Test User",
            emailAddress: "test@example.com",
          },
          created: Date.now() - 172800000,
          updated: Date.now() - 3600000,
        },
      },
    ],
    total: 2,
    isLast: true,
  },
};

/**
 * Sets up Tauri IPC mocks for e2e tests
 * Call this in page.addInitScript() before navigating
 */
export function setupTauriMocks(responses: Record<string, unknown> = {}) {
  return `
    window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {};
    window.__TAURI_INTERNALS__.invoke = async (cmd, args) => {
      // simple call log for debugging
      const w = window as any;
      w.__TAURI_INVOKE_LOG = w.__TAURI_INVOKE_LOG || [];
      w.__TAURI_INVOKE_LOG.push(cmd);
      const responses = ${JSON.stringify(responses)};
      
      // Return mocked response if available
      if (responses[cmd]) {
        return responses[cmd];
      }
      
      // Updater plugin mock: return no update by default
      if (cmd === 'plugin:updater|check') {
        return null;
      }

      // Default responses for common commands
      switch (cmd) {
        case 'get_jira_config':
          return ${JSON.stringify(mockJiraData.config)};
        
        case 'save_jira_config':
          return null;
        
        case 'clear_jira_config':
          return null;
        
        case 'jira_get_current_user':
          return ${JSON.stringify(mockJiraData.currentUser)};
        
        case 'jira_api_request':
          return ${JSON.stringify(mockJiraData.searchResponse)};
        
        default:
          throw new Error(\`Unhandled Tauri command: \${cmd}\`);
      }
    };
    
    // Mock plugin-log
    window.__TAURI_INTERNALS__.log = {
      log: () => Promise.resolve(),
      info: () => Promise.resolve(),
      warn: () => Promise.resolve(),
      error: () => Promise.resolve(),
      debug: () => Promise.resolve(),
    };

    // Mock tauri event API
    (function(){
      const listeners = new Map();
      window.__TAURI_INTERNALS__.event = {
        listen: async (event, cb) => {
          const arr = listeners.get(event) || [];
          arr.push(cb);
          listeners.set(event, arr);
          return () => {
            const list = listeners.get(event) || [];
            const idx = list.indexOf(cb);
            if (idx > -1) list.splice(idx, 1);
            listeners.set(event, list);
          };
        },
      };
      // helper to emit events from tests
      window.__TAURI_MOCK_EMIT = (event, payload) => {
        const list = listeners.get(event) || [];
        for (const cb of list) cb({ event, payload });
      };
    })();
  `;
}

/**
 * Helper to mock Tauri invoke responses for a page
 */
export async function mockTauriInvoke(
  page: Page,
  responses: Record<string, unknown> = {}
): Promise<void> {
  await page.addInitScript(setupTauriMocks(responses));
}

/**
 * Mock JIRA config as stored
 */
export async function mockJiraConfig(page: Page, config = mockJiraData.config): Promise<void> {
  await mockTauriInvoke(page, {
    get_jira_config: config,
  });
}

/**
 * Mock JIRA config as empty/not configured
 */
export async function mockNoJiraConfig(page: Page): Promise<void> {
  await mockTauriInvoke(page, {
    get_jira_config: {
      url: null,
      username: null,
      password: null,
    },
  });
}

/**
 * Mock JIRA API error responses
 */
export async function mockJiraError(page: Page, errorMessage: string): Promise<void> {
  await page.addInitScript(`
    window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {};
    window.__TAURI_INTERNALS__.invoke = async (cmd) => {
      if (cmd === 'jira_api_request' || cmd === 'jira_get_current_user') {
        throw new Error('${errorMessage}');
      }
      return null;
    };
  `);
}
