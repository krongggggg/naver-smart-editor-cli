#!/usr/bin/env node
/** Push local HEAD to GitHub via Git Database API (fine-grained PAT). */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || 'krongggggg/naver-smart-editor-cli';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

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

async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers, ...opts });
  const text = await r.text();
  const data = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path}: ${r.status} ${data.message || text}`);
  return data;
}

function gitFiles() {
  return execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
}

function commitMessage() {
  return execSync('git log -1 --format=%B', { encoding: 'utf8' }).trim();
}

const files = gitFiles();
console.log(`Creating blobs for ${files.length} files...`);

const tree = [];
for (const path of files) {
  const content = fs.readFileSync(path);
  const blob = await gh('/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content: content.toString('base64'), encoding: 'base64' }),
  });
  tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  process.stdout.write('.');
}
console.log('');

const treeObj = await gh('/git/trees', {
  method: 'POST',
  body: JSON.stringify({ tree }),
});

const commitBody = {
  message: commitMessage(),
  tree: treeObj.sha,
  author: {
    name: 'krongggggg',
    email: 'krongggggg@users.noreply.github.com',
    date: new Date().toISOString(),
  },
};

let parentSha;
try {
  const ref = await gh(`/git/ref/heads/${BRANCH}`);
  parentSha = ref.object.sha;
  commitBody.parents = [parentSha];
} catch {
  console.log('No existing branch — creating initial commit');
}

const commit = await gh('/git/commits', {
  method: 'POST',
  body: JSON.stringify(commitBody),
});

try {
  await gh(`/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: true }),
  });
} catch {
  await gh('/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commit.sha }),
  });
}

console.log(`Pushed ${commit.sha.slice(0, 8)} to ${REPO}@${BRANCH}`);
