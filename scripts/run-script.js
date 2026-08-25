#!/usr/bin/env node
/**
 * Run a JSON script against the Smart Editor
 *
 * Script format:
 * {
 *   "steps": [
 *     { "action": "setTitle", "value": "My Title" },
 *     { "action": "writeText", "value": "Hello" },
 *     { "action": "format", "style": "bold" },
 *     { "action": "module", "name": "table" },
 *     { "action": "toolbar", "dataName": "video" },
 *     { "action": "imageUrl", "urls": ["https://..."] },
 *     { "action": "lineBreak" },
 *     { "action": "align", "value": "center" },
 *     { "action": "wait", "ms": 500 }
 *   ]
 * }
 */
import { readFileSync } from 'fs';
import { connect } from '../src/index.js';

const MODULE_MAP = {
  photo: 'photo', image: 'photo', video: 'video', table: 'table',
  quotation: 'quotation', quote: 'quotation', link: 'oglink', oglink: 'oglink',
  code: 'code', map: 'map', sticker: 'sticker', file: 'file',
  schedule: 'schedule', formula: 'formula', line: 'horizontalLine',
};

async function runStep(session, step) {
  const { editor, modules } = session;
  switch (step.action) {
    case 'setTitle':
      return editor.setTitle(step.value);
    case 'writeText':
      return editor.writeText(step.value);
    case 'lineBreak':
      return editor.lineBreak();
    case 'format':
      return editor.toggleStyle(step.style);
    case 'align':
      return editor.changeAlign(step.value);
    case 'toolbar':
      return editor.clickToolbar(step.dataName);
    case 'module': {
      const method = MODULE_MAP[step.name];
      if (!method) throw new Error(`Unknown module: ${step.name}`);
      return modules[method](step.variant ?? 0);
    }
    case 'imageUrl':
      return modules.insertImageUrls(step.urls);
    case 'link':
      return editor.changeLink(step.url);
    case 'focus':
      return editor.focusComponent(step.compType ?? 'text');
    case 'wait':
      return new Promise(r => setTimeout(r, step.ms ?? 500));
    case 'getTitle':
      return editor.getTitle();
    case 'getContent':
      return editor.getContentText();
    case 'getDocument':
      return editor.getDocumentData();
    // Publish popup actions
    case 'save':
      return session.publish.save();
    case 'publishOpen':
      return session.publish.openPublish();
    case 'publishState':
      return session.publish.getState();
    case 'publishClose':
      return session.publish.closePublish();
    case 'publishCategory':
      return session.publish.selectCategory(step.name);
    case 'publishTags':
      return session.publish.setTags(step.tags);
    case 'publishVisibility':
      return session.publish.setOpenType(step.value);
    case 'publishOption':
      return session.publish.setOption(step.name, step.enabled);
    case 'publishTime':
      return session.publish.setPublishTime(step.value);
    case 'publishConfirm':
      return session.publish.confirmPublish();
    case 'publishConfig':
      return session.publish.configure(step.config);
    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
}

async function main() {
  const scriptPath = process.argv[2];
  if (!scriptPath) {
    console.error('Usage: node scripts/run-script.js <script.json>');
    process.exit(1);
  }

  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const session = await connect();
  const { editor, modules } = session;

  const results = [];
  try {
    for (const [i, step] of script.steps.entries()) {
      try {
        const result = await runStep(session, step);
        results.push({ step: i, action: step.action, ok: true, result });
        console.log(`[${i}] ${step.action} ✓`);
      } catch (err) {
        results.push({ step: i, action: step.action, ok: false, error: err.message });
        console.error(`[${i}] ${step.action} ✗ ${err.message}`);
        if (script.stopOnError) break;
      }
    }
  } finally {
    await session.disconnect();
  }

  console.log(JSON.stringify({ results }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
