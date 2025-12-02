// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30000,
  retries: 0,
  reporter: [['list']],
  use: {
    actionTimeout: 0
  }
});
