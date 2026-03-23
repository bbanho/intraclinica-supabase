import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.join(process.cwd(), '../documentacao/assets');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  console.log('Capturing: auth-login-screen.png');
  await page.goto(`${BASE_URL}/#/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '01-auth-login-screen.png') });

  console.log('Logging in as SUPER_ADMIN...');
  await page.locator('input[type="email"]').fill('bmbanho@gmail.com');
  await page.locator('input[type="password"]').fill('IntraTest2026!');
  await page.getByRole('button', { name: /acessar/i }).click();

  await page.waitForURL(url => url.hash !== '#/login', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  console.log('Switching context to a specific clinic...');
  await page.goto(`${BASE_URL}/#/admin`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const clinicsTab = page.locator('button', { hasText: /Clientes \/ Clínicas/i });
  if (await clinicsTab.isVisible()) {
    await clinicsTab.click();
    await page.waitForTimeout(1000);
  }

  const analyzeBtn = page.locator('tr', { hasText: 'IntraClinica Demo' }).locator('button', { hasText: 'Analisar' });
  if (await analyzeBtn.isVisible()) {
    await analyzeBtn.click();
    await page.waitForTimeout(3000); 
  } else {
    console.error('Could not find Analisar button for IntraClinica Demo.');
  }

  console.log('Capturing: inventory-products.png');
  await page.goto(`${BASE_URL}/#/inventory`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '02-inventory-products.png') });

  console.log('Capturing: reception-board.png');
  await page.goto(`${BASE_URL}/#/reception`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '03-reception-board.png') });

  console.log('Capturing: patients-list.png');
  await page.goto(`${BASE_URL}/#/patients`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '04-patients-list.png') });

  console.log('Capturing: clinical-execution-main.png');
  await page.goto(`${BASE_URL}/#/clinical`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '05-clinical-execution-main.png') });

  console.log('Capturing: procedures-recipes.png');
  await page.goto(`${BASE_URL}/#/procedures`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '06-procedures-recipes.png') });

  console.log('Capturing: appointments-list.png');
  await page.goto(`${BASE_URL}/#/appointments`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '07-appointments-list.png') });

  console.log('Capturing: reports-dashboard.png');
  await page.goto(`${BASE_URL}/#/reports`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '08-reports-dashboard.png') });

  console.log('Capturing: social-generator.png');
  await page.goto(`${BASE_URL}/#/social`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '09-social-generator.png') });

  console.log('Capturing: admin-ui-config.png');
  await page.goto(`${BASE_URL}/#/admin`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const settingsTab = page.locator('button', { hasText: /Configurações SaaS/i }).first();
  if (await settingsTab.isVisible()) {
    await settingsTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, '10-admin-ui-config.png') });

  console.log('Closing browser...');
  await browser.close();
}

run().catch(console.error);
