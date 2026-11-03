import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outPath = 'C:\\Users\\loyol\\.gemini\\antigravity\\brain\\3692547b-f46d-464f-9234-a5d3043d7ade\\figma_dashboard_desktop.png';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved screenshot to:', outPath);
  await browser.close();
})();
