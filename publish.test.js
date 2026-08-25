/**
 * Integration tests for Save/Publish popup — requires live CDP
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect } from '../src/index.js';

const CDP_AVAILABLE = await fetch('http://127.0.0.1:9223/json/version')
  .then(r => r.ok)
  .catch(() => false);

describe('Publish Popup', { skip: !CDP_AVAILABLE ? 'CDP not available' : false }, () => {
  let session;

  before(async () => {
    session = await connect();
  });

  after(async () => {
    await session.publish.closePublish();
    await session.disconnect();
  });

  it('opens publish popup', async () => {
    const result = await session.publish.openPublish();
    assert.equal(result.ok, true);
    assert.equal(result.action, 'publish');
  });

  it('reads publish state', async () => {
    if (!(await session.publish.isPublishOpen())) await session.publish.openPublish();
    await new Promise(r => setTimeout(r, 800));
    const state = await session.publish.getState();
    assert.equal(state.isOpen, true, 'publish popup should be open');
    assert.ok(state.category);
    assert.ok(state.openType);
    assert.ok(state.publishTime);
    assert.equal(typeof state.options, 'object');
  });

  it('lists categories', async () => {
    const cats = await session.publish.listCategories();
    assert.ok(Array.isArray(cats));
    assert.ok(cats.length > 0);
  });

  it('sets open type without error', async () => {
    const result = await session.publish.setOpenType('public');
    assert.ok(result.openType);
  });

  it('sets tag input', async () => {
    const result = await session.publish.setTags(['test-tag']);
    assert.ok(result.tags !== undefined);
  });

  it('toggles option', async () => {
    const result = await session.publish.setOption('comment', true);
    assert.equal(result.checked, true);
  });

  it('closes publish popup', async () => {
    const result = await session.publish.closePublish();
    const open = await session.publish.isPublishOpen();
    assert.equal(open, false, `Popup still open after close: ${JSON.stringify(result)}`);
  });

  it('save button is clickable', async () => {
    const result = await session.publish.save();
    assert.equal(result.ok, true);
    assert.equal(result.action, 'save');
  });
});
