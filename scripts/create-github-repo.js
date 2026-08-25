#!/usr/bin/env node
/** Create GitHub repo via CDP browser session */
import puppeteer from 'puppeteer-core';

const GITHUB_USER = process.env.GITHUB_USER;
const REPO_NAME = process.env.REPO_NAME || 'naver-smart-editor-cli';
const DESCRIPTION = process.env.REPO_DESCRIPTION || 'CLI to control Naver Blog Smart Editor ONE via Chrome DevTools Protocol';
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!GITHUB_USER) {
  console.error('Set GITHUB_USER');
  process.exit(1);
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
const page = (await browser.pages()).find(p => p.url().includes('github.com') && !p.url().includes('assets'));
if (!page) throw new Error('No GitHub tab');
await page.bringToFront();

const exists = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}`).then(r => r.ok).catch(() => false);
if (exists) {
  console.log('Repo already exists:', `https://github.com/${GITHUB_USER}/${REPO_NAME}`);
  browser.disconnect();
  process.exit(0);
}

await page.goto('https://github.com/new', { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1500);
await page.waitForSelector('#repository-name-input', { timeout: 15000 });
await page.click('#repository-name-input', { clickCount: 3 });
await page.keyboard.type(REPO_NAME, { delay: 15 });
await sleep(500);

await page.evaluate((desc) => {
  const ta = document.querySelector('#repository-description-input, textarea[name="Description"]');
  if (ta) {
    ta.value = desc;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}, DESCRIPTION);

await page.evaluate(() => {
  const pub = document.querySelector('input[name="visibility"][value="public"], #visibility-radio-public');
  pub?.click();
});

await sleep(800);
await page.evaluate(() => {
  document.querySelector('button[type="submit"]')?.click();
});
await sleep(5000);

console.log('Created:', page.url());
browser.disconnect();
