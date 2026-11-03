import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\loyol\\.gemini\\antigravity\\brain\\3692547b-f46d-464f-9234-a5d3043d7ade\\scratch\\screenshots';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  // Fresh context without stored merchant session for login screenshot
  const incognitoContext = await browser.createBrowserContext();
  const loginPage = await incognitoContext.newPage();
  await loginPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('Capturing Login page in clean session...');
  await loginPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await loginPage.screenshot({ path: path.join(OUTPUT_DIR, '01-login-desktop.png'), fullPage: false });

  // Developer Sign In
  const devPage = await incognitoContext.newPage();
  await devPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  console.log('Capturing Developer Sign In...');
  await devPage.goto('http://localhost:3000/developer', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await devPage.screenshot({ path: path.join(OUTPUT_DIR, '04-developer-signin-desktop.png'), fullPage: false });

  // Merchant Dashboard Desktop & Mobile
  const dashPage = await browser.newPage();
  await dashPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  console.log('Capturing Merchant Dashboard Overview Desktop...');
  await dashPage.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await dashPage.screenshot({ path: path.join(OUTPUT_DIR, '02-dashboard-overview-desktop.png'), fullPage: false });

  console.log('Capturing Merchant Dashboard Mobile...');
  await dashPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await dashPage.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await dashPage.screenshot({ path: path.join(OUTPUT_DIR, '03-dashboard-overview-mobile.png'), fullPage: false });

  await browser.close();
  console.log('All screenshots captured successfully in:', OUTPUT_DIR);
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
