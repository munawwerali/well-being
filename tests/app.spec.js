const { _electron: electron, test, expect } = require('@playwright/test');
const path = require('path');

// Basic Electron startup test

test('launches main window and has correct title', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await expect(window).toHaveTitle(/Well-being/i);
  await electronApp.close();
});
