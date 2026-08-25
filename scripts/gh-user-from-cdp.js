#!/usr/bin/env node
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
const page = (await browser.pages()).find(p => p.url().includes('github.com/settings')) 
  || (await browser.pages()).find(p => p.url().includes('github.com'));

await page.goto('https://github.com/settings/tokens', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

const data = await page.evaluate(() => ({
  url: location.href,
  login: document.querySelector('meta[name="user-login"]')?.content,
  hasTokens: !!document.querySelector('[data-testid="tokens-list"]'),
  title: document.title,
}));

console.log(JSON.stringify(data, null, 2));
browser.disconnect();
