/**
 * Integration tests — requires live CDP connection with Naver blog editor open
 * Run: node --test test/integration.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect } from '../src/index.js';

const CDP_AVAILABLE = await fetch('http://127.0.0.1:9223/json/version')
  .then(r => r.ok)
  .catch(() => false);

describe('Smart Editor CLI', { skip: !CDP_AVAILABLE ? 'CDP not available on port 9223' : false }, () => {
  let session;

  before(async () => {
    session = await connect();
  });

  after(async () => {
    await session.disconnect();
  });

  it('connects to editor', async () => {
    assert.ok(session.editor);
    assert.ok(session.modules);
  });

  it('reads title', async () => {
    const title = await session.editor.getTitle();
    assert.equal(typeof title, 'string');
  });

  it('reads content text', async () => {
    const text = await session.editor.getContentText();
    assert.equal(typeof text, 'string');
  });

  it('lists components', async () => {
    const comps = await session.editor.getComponents();
    assert.ok(Array.isArray(comps));
    assert.ok(comps.some(c => c.compType === 'documentTitle'));
    assert.ok(comps.some(c => c.compType === 'text'));
  });

  it('lists commands', async () => {
    const cmds = await session.editor.listCommands();
    assert.ok(cmds.includes('insertComponents'));
    assert.ok(cmds.includes('insertImagesByUrl'));
  });

  it('gets document data with version', async () => {
    const data = await session.editor.getDocumentData();
    assert.ok(data.document);
    assert.ok(data.document.version);
    assert.ok(Array.isArray(data.document.components));
  });

  it('lists modules', () => {
    const doc = session.modules.listDocumentModules();
    const prop = session.modules.listPropertyModules();
    assert.ok(doc.length >= 15);
    assert.ok(prop.length >= 10);
    assert.ok(doc.some(m => m.key === 'image'));
    assert.ok(prop.some(m => m.key === 'bold'));
  });
});
