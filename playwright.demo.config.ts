import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config for demo video recording.
 * This config enables video recording and has longer timeouts for the demo test.
 *
 * Run with: pnpm test:e2e:demo
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/demo-video.spec.ts",
  // Longer timeout for demo with slow animations
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:1420",
    trace: "off",
    // Enable video recording
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
    // Use a consistent viewport for demo
    viewport: { width: 1280, height: 720 },
    // Slow down actions slightly for visibility
    actionTimeout: 10000,
  },

  projects: [
    {
      name: "demo",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        // Run in headed mode to show cursor in video
        headless: false,
        // Enable video recording for demo
        video: {
          mode: "on",
          size: { width: 1280, height: 720 },
        },
      },
    },
  ],

  webServer: {
    command: "pnpm dev:vite",
    url: "http://localhost:1420",
    reuseExistingServer: true,
    timeout: 120000,
  },

  // Output videos to a specific folder
  outputDir: "./test-results/demo-videos",
})
