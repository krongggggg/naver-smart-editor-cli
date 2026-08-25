#!/usr/bin/env node
/**
 * Example: programmatic blog post draft via Smart Editor API
 */
import { connect } from '../src/index.js';

async function main() {
  const { editor, modules, disconnect } = await connect();

  try {
    console.log('Current title:', await editor.getTitle());
    console.log('Components:', await editor.getComponents());
    console.log('Available commands:', await editor.listCommands());

    // Example workflow (uncomment to run on live editor):
    // await editor.setTitle('테스트 글 제목');
    // await editor.focusComponent('text');
    // await editor.writeText('\n\n--- CLI로 추가된 텍스트 ---');
    // await modules.bold();
    // await editor.writeText('굵은 텍스트');

    console.log('\nDocument modules:');
    for (const m of modules.listDocumentModules()) {
      console.log(`  ${m.key.padEnd(18)} ${m.label}`);
    }
  } finally {
    await disconnect();
  }
}

main().catch(console.error);
