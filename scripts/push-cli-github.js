#!/usr/bin/env node
/**
 * Push each git-tracked file to GitHub with correct path via /new/main (CDP).
 */
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const REPO = process.env.REPO_URL;
const ROOT = process.env.PROJECT_ROOT || process.cwd();
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!REPO) {
  console.error('Set REPO_URL');
  process.exit(1);
}

const api = REPO.replace('https://github.com', 'https://api.github.com/repos');

function gitFiles() {
  return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
}

async function existsOnGithub(filePath) {
  return fetch(`${api}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`)
    .then(r => r.ok)
    .catch(() => false);
}

async function commitNewFile(page, filePath, content) {
  await page.goto(`${REPO}/new/main`, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(1800);
  await page.waitForSelector('.cm-content[contenteditable="true"]', { timeout: 20000 });

  const nameInput = await page.$('input[type="text"]');
  await nameInput.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.keyboard.type(filePath, { delay: 5 });

  await page.evaluate((text) => {
    const cm = document.querySelector('.cm-content');
    cm.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  }, content);
  await sleep(500);

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find(b =>
      /^commit changes/i.test((b.textContent || '').trim().replace(/\s+/g, ' '))
    )?.click();
  });
  await sleep(1000);

  if (await page.$('[role="dialog"]')) {
    await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      [...d.querySelectorAll('button')].find(b => /^commit changes$/i.test((b.textContent || '').trim()))?.click();
    });
  }

  await page.waitForFunction(() => !location.href.includes('/new/'), { timeout: 90000 });
}

const files = gitFiles();
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
const page = (await browser.pages()).find(p => p.url().includes('github.com') && !p.url().includes('assets'));
if (!page) throw new Error('No GitHub tab');
await page.bringToFront();

let uploaded = 0;
for (const rel of files) {
  if (await existsOnGithub(rel)) {
    console.log('skip', rel);
    continue;
  }
  const content = fs.readFileSync(`${ROOT}/${rel}`, 'utf8');
  console.log('upload', rel, `(${content.length} bytes)`);
  try {
    await commitNewFile(page, rel, content);
    uploaded++;
  } catch (e) {
    console.error('FAIL', rel, e.message);
  }
}

console.log(`Done. Uploaded ${uploaded} files.`, REPO);
browser.disconnect();
