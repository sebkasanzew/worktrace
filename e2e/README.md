# E2E Testing with Playwright

## Overview

E2E tests verify UI behavior with mocked Tauri backend APIs using Playwright.

## Test Approach

Tests run against Vite dev server with Tauri API mocks injected via `page.addInitScript()`:
- Mock `window.__TAURI_INTERNALS__.invoke()` for IPC calls
- Mock config/JIRA API responses
- Test form validation, navigation, error handling
- Works offline, no real Tauri backend needed

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug
```

## Writing Tests

```typescript
import { test, expect } from "@playwright/test";

test("my test", async ({ page }) => {
  // Mock Tauri IPC before navigation
  await page.addInitScript(() => {
    (window as any).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: any) => {
        if (cmd === "my_command") {
          return { result: "mocked" };
        }
      }
    };
  });

  await page.goto("/");
  // ... test UI interactions
});
```

## Test Files

### Worklog Management
- **`worklog-edit.spec.ts`** - Tests for editing existing worklogs (form pre-fill, update API, state management)
- **`worklog-delete.spec.ts`** - Tests for deleting worklogs (two-click confirmation, API calls, error handling)
- **`worklog-sort.spec.ts`** - Tests for worklog sorting (reverse chronological order, refresh behavior)
- **`duration-parsing.spec.ts`** - Tests for time duration parsing (2h, 1.5h, 90m, 2h 30m, 1:30, etc.)

### Authentication & Tasks
- **`login.spec.ts`** - JIRA authentication flow
- **`task-list.spec.ts`** - Task list display and management
- **`jira-integration.spec.ts`** - JIRA API integration

### Application Updates
- **`updater.spec.ts`** - Update functionality
- **`updater-error.spec.ts`** - Update error handling

## Benefits

- No real JIRA instance needed
- Fast, deterministic tests
- Offline development
- Full control over backend responses
- Test error scenarios easily
