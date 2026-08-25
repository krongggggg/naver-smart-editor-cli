#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
const pages = await browser.pages();
for (const p of pages.slice(0, 15)) {
  console.log(p.url().slice(0, 140));
}
const gh = pages.find(p => p.url().includes('github.com') && !p.url().includes('assets'));
if (gh) {
  await gh.bringToFront();
  await gh.goto('https://github.com/settings/profile', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  const login = await gh.evaluate(() => document.querySelector('meta[name="user-login"]')?.content || document.querySelector('input#user_login_name_field')?.value);
  console.log('github login:', login);
}
browser.disconnect();
