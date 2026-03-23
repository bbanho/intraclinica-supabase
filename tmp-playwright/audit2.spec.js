import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';

test.setTimeout(120000);

test('audit production', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const errors = [];
  const consoleLogs = [];

  page.on('pageerror', (err) => {
    errors.push(`[PAGE ERROR] ${err.message}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleLogs.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on('response', (response) => {
    if (response.status() >= 400 && response.status() !== 401 && response.status() !== 403) {
      errors.push(`[NETWORK ERROR] ${response.status()} ${response.url()}`);
    }
  });

  try {
    await page.goto('https://intraclinica.axio.eng.br/', { waitUntil: 'networkidle', timeout: 60000 });
    
    await page.fill('input[type="email"], input[name="email"]', 'bmbanho@gmail.com');
    await page.fill('input[type="password"], input[name="password"]', 'IntraTest2026!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(10000); // Wait for login
    
    // Check elements
    const bodyText = await page.innerText('body');
    console.log('--- BODY TEXT ---');
    console.log(bodyText.substring(0, 1000));
    
    // Take screenshot
    await page.screenshot({ path: 'audit_main_layout.png' });

    // Try to open a menu if it's hidden
    const menuButtons = await page.locator('button:has-text("Menu"), button[aria-label="Menu"], .lucide-menu').all();
    if (menuButtons.length > 0) {
      await menuButtons[0].click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'audit_menu_open.png' });
    }

  } catch (e) {
    errors.push(`[FATAL ERROR] ${e.message}`);
  }

  const report = `
AUDIT REPORT 2
============
Errors:
${errors.join('\n')}

Console Errors:
${consoleLogs.join('\n')}
  `;

  fs.writeFileSync('audit_report2.txt', report);
  await browser.close();
});
