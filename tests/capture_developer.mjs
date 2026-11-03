import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outPath = 'C:\\Users\\loyol\\.gemini\\antigravity\\brain\\3692547b-f46d-464f-9234-a5d3043d7ade\\port_5000_developer_verified.png';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5000/developer', { waitUntil: 'networkidle0' });
  
  // Enter operator key and click sign in so we capture the console workbench!
  await page.type('#ops-auth-key-input', 'ops-autopilot-secret-key-2026');
  await page.click('#btn-ops-auth');
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved screenshot to:', outPath);
  await browser.close();
})();
