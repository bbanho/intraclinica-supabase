import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';

test.setTimeout(120000);

test('audit production', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const errors = [];
  const consoleLogs = [];

  page.on('response', (response) => {
    if (response.status() >= 400 && response.status() !== 401 && response.status() !== 403) {
      errors.push(`[NETWORK ERROR] ${response.status()} ${response.url()}`);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleLogs.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  try {
    await page.goto('https://intraclinica.axio.eng.br/', { waitUntil: 'networkidle', timeout: 60000 });
    
    await page.fill('input[type="email"], input[name="email"]', 'bmbanho@gmail.com');
    await page.fill('input[type="password"], input[name="password"]', 'IntraTest2026!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(5000); // Wait for login
    
    // Try to open the context/clinic selector
    const workspaceElement = await page.locator('text=Workspace').first();
    if (await workspaceElement.isVisible()) {
      await workspaceElement.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'audit_context_open.png' });
      
      const options = await page.locator('div[role="listbox"] div, div[role="option"]').allInnerTexts();
      console.log('Context options:', options.join(', '));

      // Try clicking the first clinic if there's any
      const optionElements = await page.locator('div[role="option"]').all();
      if (optionElements.length > 0) {
          // click the second one, assuming the first is "Workspace/All"
          await optionElements[optionElements.length > 1 ? 1 : 0].click();
          await page.waitForTimeout(4000);
          console.log('Clicked clinic option.');
      }
    }
    
    const bodyText = await page.innerText('body');
    console.log('--- BODY TEXT AFTER CONTEXT CHANGE ---');
    console.log(bodyText.substring(0, 1000));
    
  } catch (e) {
    errors.push(`[FATAL ERROR] ${e.message}`);
  }

  const report = `
AUDIT REPORT 3
============
Errors:
${errors.join('\n')}

Console Errors:
${consoleLogs.join('\n')}
  `;

  fs.writeFileSync('audit_report3.txt', report);
  await browser.close();
});
