#!/usr/bin/env node
/**
 * Push naver-smart-editor skill to GitHub via CDP browser session (port 9223).
 *
 * Requires REPO_URL env, e.g. https://github.com/YOUR_ORG/naver-smart-editor-skill
 * Uses GitHub /upload/main page.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SKILL_DIR = process.env.SKILL_DIR || path.join(process.env.HOME, '.cursor/skills/naver-smart-editor');
const REPO = process.env.REPO_URL;
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!REPO) {
  console.error('Set REPO_URL, e.g. REPO_URL=https://github.com/YOUR_ORG/naver-smart-editor-skill');
  process.exit(1);
}

const repoSlug = REPO.replace(/^https:\/\/github.com\//, '').replace(/\/$/, '');

const files = [
  ...['SKILL.md', 'reference.md', 'examples.md'].map(f => ({
    path: f,
    content: fs.readFileSync(path.join(SKILL_DIR, f), 'utf8'),
  })),
  {
    path: 'README.md',
    content: `# naver-smart-editor-skill

Cursor Agent Skill for **Naver Blog Smart Editor ONE** via CDP (port 9223).

## Install

\`\`\`bash
git clone https://github.com/${repoSlug}.git ~/.cursor/skills/naver-smart-editor
\`\`\`

Or invoke in Cursor: \`/naver-smart-editor\`

## CLI project

Set \`SMART_EDITOR_ROOT\` to your \`naver-smart-editor-cli\` checkout.
`,
  },
];

function getGithubPage(pages) {
  return pages.find(p => p.url().includes('github.com') && !p.url().includes('assets-cdn'))
    || pages.find(p => p.url().includes('github.com'));
}

async function fileExistsOnGithub(filePath) {
  const api = REPO.replace('https://github.com', 'https://api.github.com/repos');
  return fetch(`${api}/contents/${filePath}`).then(r => r.ok).catch(() => false);
}

async function uploadFiles(page, batch) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-upload-'));
  const tmpPaths = batch.map(f => {
    const p = path.join(tmpDir, f.path);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, f.content);
    return p;
  });

  await page.goto(`${REPO}/upload/main`, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2000);

  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) throw new Error('file input not found');
  await fileInput.uploadFile(...tmpPaths);
  await sleep(2000);

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find(b =>
      /^commit changes$/i.test((b.textContent || '').trim()) && !b.disabled
    )?.click();
  });

  await page.waitForFunction(() => !location.href.includes('/upload/main'), { timeout: 90000 });

  for (const p of tmpPaths) fs.unlinkSync(p);
  fs.rmdirSync(tmpDir);
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
const page = getGithubPage(await browser.pages());
if (!page) throw new Error('No GitHub tab in CDP browser (port 9223)');
await page.bringToFront();

const missing = [];
for (const file of files) {
  if (await fileExistsOnGithub(file.path)) {
    console.log('Skipping (exists):', file.path);
  } else {
    missing.push(file);
  }
}

if (missing.length) {
  console.log('Uploading:', missing.map(f => f.path).join(', '));
  await uploadFiles(page, missing);
  console.log('Done ->', page.url());
} else {
  console.log('All files already present.');
}

console.log('Repository:', REPO);
browser.disconnect();
