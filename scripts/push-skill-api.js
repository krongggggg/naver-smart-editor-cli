#!/usr/bin/env node
/** Update skill repo files via GitHub Contents API */
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || 'krongggggg/naver-smart-editor-skill';
const SKILL_DIR = process.env.SKILL_DIR || path.join(process.env.HOME, '.cursor/skills/naver-smart-editor');

if (!TOKEN) {
  console.error('Set GITHUB_TOKEN');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const readme = `# naver-smart-editor-skill

Cursor Agent Skill for **Naver Blog Smart Editor ONE** via CDP (port 9223).

## Install

\`\`\`bash
git clone https://github.com/${REPO}.git ~/.cursor/skills/naver-smart-editor
\`\`\`

Or invoke in Cursor: \`/naver-smart-editor\`

## CLI project

Set \`SMART_EDITOR_ROOT\` to your \`naver-smart-editor-cli\` checkout.
`;

const files = [
  { path: 'SKILL.md', content: fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8') },
  { path: 'reference.md', content: fs.readFileSync(path.join(SKILL_DIR, 'reference.md'), 'utf8') },
  { path: 'examples.md', content: fs.readFileSync(path.join(SKILL_DIR, 'examples.md'), 'utf8') },
  { path: 'README.md', content: readme },
];

for (const file of files) {
  const url = `https://api.github.com/repos/${REPO}/contents/${file.path}`;
  const existing = await fetch(url, { headers }).then(r => r.ok ? r.json() : null);
  const body = {
    message: `Update ${file.path} (sanitize for open source)`,
    content: Buffer.from(file.content, 'utf8').toString('base64'),
  };
  if (existing?.sha) body.sha = existing.sha;

  const r = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok) throw new Error(`${file.path}: ${data.message}`);
  console.log('updated', file.path);
}

console.log('Done:', `https://github.com/${REPO}`);
