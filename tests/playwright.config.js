const { defineConfig, devices } = require("@playwright/test");
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } };
module.exports = defineConfig({
  testDir: ".", timeout: 90000, retries: 1, reporter: [["list"]], workers: 3,
  use: { baseURL: process.env.BASE || "https://bogs-pedidos.web.app", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "iPhone 13 (WebKit/Safari)", testMatch: /mobile\.spec\.js/, use: { ...devices["iPhone 13"] } },
    { name: "iPhone SE (WebKit/Safari)", testMatch: /mobile\.spec\.js/, use: { ...devices["iPhone SE"] } },
    { name: "Pixel 5 (Chrome Android)", testMatch: /mobile\.spec\.js/, use: { ...devices["Pixel 5"] } },
    { name: "Panel (Chrome escritorio)", testMatch: /admin\.spec\.js/, use: desktop },
    { name: "Login real (Chrome escritorio)", testMatch: /login\.spec\.js/, use: desktop },
  ],
});
