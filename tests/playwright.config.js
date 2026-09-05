const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: ".", timeout: 90000, retries: 1, reporter: [["list"]], workers: 3,
  use: { baseURL: process.env.BASE || "https://bogs-pedidos.web.app", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "iPhone 13 (WebKit/Safari)", testMatch: /mobile\.spec\.js/, use: { ...devices["iPhone 13"] } },
    { name: "iPhone SE (WebKit/Safari)", testMatch: /mobile\.spec\.js/, use: { ...devices["iPhone SE"] } },
    { name: "Pixel 5 (Chrome Android)", testMatch: /mobile\.spec\.js/, use: { ...devices["Pixel 5"] } },
    { name: "Panel (Chrome escritorio)", testMatch: /admin\.spec\.js/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
  ],
});
