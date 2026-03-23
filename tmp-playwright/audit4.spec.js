import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';

test.setTimeout(120000);

test('audit production URLs', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const errors = [];
  
  page.on('response', (response) => {
    if (response.status() >= 400 && response.status() !== 401 && response.status() !== 403) {
      errors.push(`[NETWORK ERROR] ${response.status()} ${response.url()}`);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  try {
    await page.goto('https://intraclinica.axio.eng.br/', { waitUntil: 'networkidle', timeout: 60000 });
    
    await page.fill('input[type="email"], input[name="email"]', 'bmbanho@gmail.com');
    await page.fill('input[type="password"], input[name="password"]', 'IntraTest2026!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    const routes = ['/patients', '/inventory', '/clinical'];
    for (const r of routes) {
      errors.push(`--- Testing ${r} ---`);
      console.log(`Navigating directly to ${r}...`);
      await page.goto(`https://intraclinica.axio.eng.br${r}`);
      await page.waitForTimeout(4000);
      const text = await page.innerText('body');
      
      errors.push(`Page Content Snippet for ${r}:`);
      errors.push(text.substring(0, 300).replace(/\n/g, ' '));
      
      await page.screenshot({ path: `audit_direct_${r.substring(1)}.png` });
    }
    
  } catch (e) {
    errors.push(`[FATAL ERROR] ${e.message}`);
  }

  const report = `
AUDIT REPORT 4
============
${errors.join('\n')}
  `;

  fs.writeFileSync('audit_report4.txt', report);
  await browser.close();
});
