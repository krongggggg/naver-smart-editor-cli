#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WRITE_URL = process.env.NAVER_WRITE_URL;
if (!WRITE_URL) {
  console.error('Set NAVER_WRITE_URL to your Naver blog write page URL');
  process.exit(1);
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
let page = (await browser.pages()).find(p => p.url().includes('blog.naver.com'));
if (!page) page = await browser.newPage();
await page.bringToFront();
await page.goto(WRITE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(5000);
const info = await page.evaluate(() => ({
  url: location.href,
  hasMainFrame: !!document.querySelector('#mainFrame'),
}));
console.log(info);
browser.disconnect();
