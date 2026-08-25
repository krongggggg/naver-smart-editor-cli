#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
const page = (await browser.pages()).find(p => p.url().includes('github.com') && !p.url().includes('assets'));
await page.bringToFront();
await page.goto('https://github.com/settings/tokens/new', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 2000));
const info = await page.evaluate(() => ({
  url: location.href,
  title: document.title,
  inputs: [...document.querySelectorAll('input, textarea, select, button')].slice(0, 30).map(el => ({
    tag: el.tagName,
    type: el.type,
    id: el.id,
    name: el.name,
    placeholder: el.placeholder,
    text: el.textContent?.trim().slice(0, 40),
  })),
  links: [...document.querySelectorAll('a')].map(a => a.textContent?.trim()).filter(t => /token/i.test(t || '')).slice(0, 10),
}));
console.log(JSON.stringify(info, null, 2));

const api = await page.evaluate(async () => {
  const r = await fetch('https://api.github.com/user', { credentials: 'include', headers: { Accept: 'application/vnd.github+json' } });
  return { status: r.status, body: await r.text() };
});
console.log('api user:', api);
browser.disconnect();
