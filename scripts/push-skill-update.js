#!/usr/bin/env node
/**
 * Update skill files on GitHub via CDP (edit existing files with execCommand).
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const SKILL_DIR = process.env.SKILL_DIR || path.join(process.env.HOME, '.cursor/skills/naver-smart-editor');
const REPO = process.env.REPO_URL;
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!REPO) {
  console.error('Set REPO_URL');
  process.exit(1);
}

const files = ['SKILL.md', 'reference.md', 'examples.md', 'README.md'].map(name => ({
  name,
  content: name === 'README.md'
    ? `# naver-smart-editor-skill

Cursor Agent Skill for **Naver Blog Smart Editor ONE** via CDP (port 9223).

## Install

\`\`\`bash
git clone ${REPO}.git ~/.cursor/skills/naver-smart-editor
\`\`\`

Or invoke in Cursor: \`/naver-smart-editor\`

## CLI project

Set \`SMART_EDITOR_ROOT\` to your \`naver-smart-editor-cli\` checkout.
`
    : fs.readFileSync(path.join(SKILL_DIR, name), 'utf8'),
}));

async function updateFile(page, file) {
  const editUrl = `${REPO}/edit/main/${file.name}`;
  console.log('Updating', file.name);
  await page.goto(editUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2500);
  await page.waitForSelector('.cm-content[contenteditable="true"]', { timeout: 20000 });

  await page.evaluate((text) => {
    const cm = document.querySelector('.cm-content');
    cm.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  }, file.content);
  await sleep(800);

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find(b =>
      /^commit changes/i.test((b.textContent || '').trim().replace(/\s+/g, ' '))
    )?.click();
  });
  await sleep(1500);

  const hasDialog = await page.$('[role="dialog"]');
  if (hasDialog) {
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      [...dialog.querySelectorAll('button')].find(b =>
        /^commit changes$/i.test((b.textContent || '').trim())
      )?.click();
    });
  }

  await page.waitForFunction(
    (name) => location.href.includes(`/blob/main/${name}`),
    { timeout: 60000 },
    file.name,
  );
  console.log('  done');
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
const page = (await browser.pages()).find(p => p.url().includes('github.com') && !p.url().includes('assets'));
if (!page) throw new Error('No GitHub tab');
await page.bringToFront();

for (const file of files) {
  await updateFile(page, file);
}

console.log('Skill repo updated:', REPO);
browser.disconnect();
