import { expect, test } from "@playwright/test";
import { mockJiraConfig } from "./utils/tauri";

async function triggerUpdateCheck(page: import("@playwright/test").Page) {
  await page.goto("/?openUpdate=1&mockUpdateError=fetch");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => {
    window.dispatchEvent(new Event("worktrace:triggerUpdateCheck"));
  });
}

test("Updater error triggers no update UI and returns control", async ({ page }) => {
  await mockJiraConfig(page);
  // Override updater check to throw
  await page.addInitScript(() => {
    type Invoke = (cmd: string, args?: unknown) => Promise<unknown>;
    window.__TAURI_INTERNALS__.invoke = new Proxy(window.__TAURI_INTERNALS__.invoke, {
      apply(target: Invoke, thisArg: unknown, argArray: [string, unknown?]) {
        const [cmd] = argArray;
        if (cmd === "plugin:updater|check") {
          throw new Error("fetch failed");
        }
        return target.apply(thisArg, argArray);
      },
    });
  });

  await triggerUpdateCheck(page);

  // Assert that the Update Available card does not appear on error
  await expect(page.getByText("Update Available")).toHaveCount(0);
});
