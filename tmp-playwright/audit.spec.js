import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';

test.setTimeout(120000);

test('audit production', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
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
    console.log('Navigating to https://intraclinica.axio.eng.br/ ...');
    await page.goto('https://intraclinica.axio.eng.br/', { waitUntil: 'networkidle', timeout: 60000 });
    
    console.log('Logging in...');
    await page.fill('input[type="email"], input[name="email"], [formcontrolname="email"]', 'bmbanho@gmail.com');
    await page.fill('input[type="password"], input[name="password"], [formcontrolname="password"]', 'IntraTest2026!');
    
    // Check if the button is enabled and click
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    
    console.log('Waiting for login to process...');
    await page.waitForTimeout(10000); // 10s delay to let everything load
    
    console.log('Current URL after login: ' + page.url());

    const links = await page.locator('a, button').allInnerTexts();
    console.log('Visible texts: ', links.join(', ').slice(0, 200));

    const pagesToVisit = [
      { name: 'Recepcao', selector: 'text=Recepção' },
      { name: 'Pacientes', selector: 'text=Pacientes' },
      { name: 'Estoque', selector: 'text=Estoque' },
      { name: 'Clinical', selector: 'text=Clinical' }
    ];

    for (const p of pagesToVisit) {
      console.log(`Navigating to ${p.name}...`);
      try {
        const el = page.locator(p.selector).first();
        if (await el.isVisible()) {
          await el.click();
          await page.waitForTimeout(10000); // 10s wait for load
          await page.screenshot({ path: `audit_${p.name}.png` });
        } else {
          errors.push(`[NAVIGATION ERROR] Element not visible for ${p.name}`);
        }
      } catch (e) {
        errors.push(`[NAVIGATION ERROR] Failed to navigate to ${p.name}: ${e.message}`);
      }
    }
  } catch (e) {
    errors.push(`[FATAL ERROR] ${e.message}`);
  }

  const report = `
AUDIT REPORT
============
Errors:
${errors.join('\n')}

Console Errors:
${consoleLogs.join('\n')}
  `;

  fs.writeFileSync('audit_report.txt', report);
  await browser.close();
});
