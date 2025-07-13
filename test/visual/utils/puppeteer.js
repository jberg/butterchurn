import puppeteer from 'puppeteer';

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

async function createPage() {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser console error:', msg.text());
    }
  });

  page.on('pageerror', err => console.error('Browser page error:', err.toString()));

  return page;
}

export {
  getBrowser,
  closeBrowser,
  createPage
};
