#!/usr/bin/env node
/** Quick probe: setTitle + writeText actually work */
import { connect } from '../src/index.js';

const MARKER = `[e2e-probe-${Date.now()}]`;

const session = await connect();
const { editor, disconnect } = session;

const origTitle = await editor.getTitle();
const origText = await editor.getContentText();

try {
  const testTitle = `${MARKER}-title`;
  await editor.setTitle(testTitle);
  const titleAfter = await editor.getTitle();
  console.log('setTitle:', { expected: testTitle, got: titleAfter, ok: titleAfter === testTitle });

  await editor.focusComponent('text');
  await editor.writeText(MARKER);
  const textAfter = await editor.getContentText();
  console.log('writeText:', { contains: textAfter.includes(MARKER), preview: textAfter.slice(-80) });

  await editor.lineBreak();
  await editor.writeText(`${MARKER}-line2`);
  const afterBreak = await editor.getContentText();
  console.log('lineBreak+write:', { contains: afterBreak.includes(`${MARKER}-line2`) });

  await editor.toggleStyle('bold');
  console.log('toggleStyle bold: ok');

  // restore
  await editor.setTitle(origTitle);
  console.log('restored title');
} finally {
  await disconnect();
}
