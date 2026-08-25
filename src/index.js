import { BrowserConnection } from './cdp/browser.js';
import { SmartEditor } from './editor/smart-editor.js';
import { PublishPopup } from './editor/publish-popup.js';
import { EditorModules } from './modules/index.js';

/**
 * Main entry point: connect to CDP Chrome and get Smart Editor handle
 */
export async function connect(options = {}) {
  const conn = new BrowserConnection(options);
  await conn.connect();

  const page = await conn.findBlogPage(options.urlHint);
  if (!page) {
    await conn.disconnect();
    throw new Error('Naver blog write page not found. Open blog.naver.com write page first.');
  }

  await page.bringToFront();
  const frame = conn.getEditorFrame(page);
  if (!frame) {
    await conn.disconnect();
    throw new Error('PostWriteForm iframe not found. Wait for editor to load.');
  }

  const editor = new SmartEditor(frame, options.appId);
  await editor.assertReady();

  return {
    browser: conn,
    page,
    frame,
    editor,
    modules: new EditorModules(editor),
    publish: new PublishPopup(frame),
    async disconnect() {
      await conn.disconnect();
    },
  };
}

export { BrowserConnection, SmartEditor, PublishPopup, EditorModules };
export * from './modules/definitions.js';
export * from './modules/publish-definitions.js';
