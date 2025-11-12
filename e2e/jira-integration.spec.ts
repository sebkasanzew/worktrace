import { test, expect } from "@playwright/test";
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";

test.describe("JIRA Integration with Mocked Tauri APIs", () => {
    test.beforeEach(async ({ page }) => {
        // Inject Tauri API mocks before navigating
        await page.addInitScript(() => {
            // Mock window.__TAURI_INTERNALS__
            (window as any).__TAURI_INTERNALS__ = {
                metadata: {
                    currentWindow: { label: "main" },
                    currentWebview: { windowLabel: "main", label: "main" },
                },
                invoke: async (cmd: string, args: any) => {
                    // Mock IPC responses
                    if (cmd === "save_jira_config") {
                        return Promise.resolve();
                    }
                    if (cmd === "get_jira_config") {
                        // Return null initially to show login form
                        return null;
                    }
                    if (cmd === "jira_get_current_user") {
                        return {
                            accountId: "test-account",
                            emailAddress: "test@example.com",
                            displayName: "Test User",
                        };
                    }
                    if (cmd === "jira_api_request") {
                        return {
                            issues: [
                                {
                                    id: "1",
                                    key: "TEST-1",
                                    fields: {
                                        summary: "Test issue",
                                        status: { name: "In Progress" },
                                        issuetype: { name: "Task" },
                                        priority: { name: "Medium" },
                                        assignee: {
                                            displayName: "Test User",
                                        },
                                        updated: new Date().toISOString(),
                                    },
                                },
                            ],
                            total: 1,
                        };
                    }
                    return Promise.reject(new Error(`Unknown command: ${cmd}`));
                },
            };
        });

        await page.goto("/");
    });

    test("should show login form elements", async ({ page }) => {
        await expect(page.getByLabel("JIRA URL")).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/api token/i)).toBeVisible();
    });

    test("should accept valid credentials input", async ({ page }) => {
        await page.getByLabel("JIRA URL").fill("https://test.atlassian.net");
        await page.getByLabel(/email/i).fill("test@example.com");
        await page.getByLabel(/api token/i).fill("test-token-123");

        await expect(page.getByLabel("JIRA URL")).toHaveValue(
            "https://test.atlassian.net",
        );
        await expect(page.getByLabel(/email/i)).toHaveValue("test@example.com");
    });

    test("should validate HTTPS requirement", async ({ page }) => {
        await page.getByLabel("JIRA URL").fill("http://insecure.com");
        await page.getByLabel(/email/i).fill("test@example.com");
        await page.getByLabel(/api token/i).fill("token");
        await page.getByRole("button", { name: /save/i }).click();

        await expect(page.getByText(/https/i)).toBeVisible();
    });
});
