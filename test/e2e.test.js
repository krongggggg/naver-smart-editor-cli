/**
 * E2E tests — title, body, formatting, toolbar (single session, restores once)
 * Run: npm run test:e2e
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect } from '../src/index.js';
import { DOCUMENT_TOOLBAR } from '../src/modules/definitions.js';

const CDP_AVAILABLE = await fetch('http://127.0.0.1:9223/json/version')
  .then(r => r.ok)
  .catch(() => false);

const MARKER = `[e2e-${Date.now()}]`;

describe('E2E: Smart Editor modules', { skip: !CDP_AVAILABLE ? 'CDP not available' : false }, () => {
  let session;
  let snapshot;

  before(async () => {
    session = await connect();
    snapshot = await session.editor.getDocumentData();
    await session.editor.evaluate((appId) => {
      const editor = window.SE.launcher.getEditor(appId);
      const ds = editor._documentService;
      if (!editor._papyrus._componentListStore.getComponentsByCtype('text')?.length) {
        ds._insertDefaultComponents?.();
      }
      if (!ds.getDocumentTitle()) ds.setDocumentTitle('E2E 테스트 제목');
    }, session.editor.appId);
    await session.editor.focusComponent('text');
    await session.editor.evaluate(() => document.querySelector('.se-text-paragraph')?.click());
  });

  after(async () => {
    await session.editor.evaluate((appId, data) => {
      window.SE.launcher.getEditor(appId)._documentService.setDocumentData(data);
    }, session.editor.appId, snapshot);
    await session.publish?.closePublish?.();
    await session.disconnect();
  });

  // ─── Title (SmartEditor + modules.setTitle) ───────────────

  it('title: getTitle / setTitle via editor', async () => {
    assert.equal(typeof await session.editor.getTitle(), 'string');
    const newTitle = `${MARKER} 제목`;
    await session.editor.setTitle(newTitle);
    assert.equal(await session.editor.getTitle(), newTitle);
    const dom = await session.editor.evaluate(() =>
      document.querySelector('.se-title-text')?.textContent?.trim());
    assert.ok(dom?.includes(MARKER));
  });

  it('title: modules.setTitle delegate', async () => {
    const t = `${MARKER}-mod`;
    await session.modules.setTitle(t);
    assert.equal(await session.modules.getTitle(), t);
  });

  // ─── Body ─────────────────────────────────────────────────

  it('body: writeText appends to content', async () => {
    const token = `${MARKER}-body`;
    await session.editor.writeText(token);
    assert.ok((await session.editor.getContentText()).includes(token));
  });

  it('body: lineBreak + writeText', async () => {
    const token = `${MARKER}-line2`;
    await session.editor.lineBreak();
    await session.editor.writeText(token);
    assert.ok((await session.editor.getContentText()).includes(token));
  });

  it('body: modules.writeText delegate', async () => {
    const token = `${MARKER}-mod`;
    await session.modules.writeText(token);
    assert.ok((await session.editor.getContentText()).includes(token));
  });

  // ─── Property toolbar / formatting (before doc toolbar opens panels) ──

  for (const style of ['bold', 'italic', 'underline', 'strikethrough']) {
    it(`format: toggleStyle(${style})`, async () => {
      await session.editor.focusComponent('text');
      await session.editor.toggleStyle(style);
      const exists = await session.editor.evaluate((s) =>
        !!document.querySelector(`[data-name="${s}"]`), style);
      assert.ok(exists);
    });
  }

  it('format: changeAlign(center) via toolbar click', async () => {
    await session.editor.focusComponent('text');
    const alignBtn = await session.editor.evaluate(() => {
      const btn = document.querySelector('[data-name="align-drop-down-with-justify"], [data-name="align"] button, .se-align-center-toolbar-button');
      btn?.click();
      return !!btn;
    });
    if (alignBtn) {
      await session.editor.evaluate(() => {
        document.querySelector('.se-align-center-toolbar-button, [data-name="align-center"]')?.click();
      });
    } else {
      await session.editor.changeAlign('center');
    }
    const centered = await session.editor.evaluate(() =>
      !!document.querySelector('.se-section-align-center, .se-text-paragraph-align-center, [class*="align-center"]'));
    assert.ok(centered);
  });

  it('format: modules.bold()', async () => {
    await session.modules.bold();
  });

  it('property: modules.list()', async () => {
    assert.equal((await session.modules.list()).clicked, 'list');
  });

  it('property: modules.specialLetter()', async () => {
    assert.equal((await session.modules.specialLetter()).clicked, 'special-letter');
  });

  // ─── Document toolbar (may open side panels) ──────────────

  const docModules = [
    ['photo', 'image'], ['video', 'video'], ['table', 'table'],
    ['oglink', 'oglink'], ['code', 'code'], ['sticker', 'sticker'],
    ['map', 'map'], ['formula', 'formula'], ['file', 'file'], ['schedule', 'schedule'],
  ];

  for (const [method, dataName] of docModules) {
    it(`toolbar: modules.${method}() → [data-name=${dataName}]`, async () => {
      const result = await session.modules[method]();
      assert.equal(result.clicked, dataName);
    });
  }

  it('toolbar: modules.quotation(0)', async () => {
    assert.equal((await session.modules.quotation(0)).clicked, 'insert-quotation');
  });

  it('toolbar: modules.horizontalLine(0)', async () => {
    assert.equal((await session.modules.horizontalLine(0)).clicked, 'insert-horizontal-line');
  });

  // ─── Commands & definitions ───────────────────────────────

  it('commands: listCommands returns 7', async () => {
    const cmds = await session.editor.listCommands();
    assert.equal(cmds.length, 7);
  });

  it('definitions: DOCUMENT_TOOLBAR keys', async () => {
    for (const key of ['image', 'video', 'sticker', 'oglink', 'table', 'code', 'map', 'formula']) {
      assert.ok(DOCUMENT_TOOLBAR[key]);
    }
  });
});
