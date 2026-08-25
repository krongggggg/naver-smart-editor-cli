#!/usr/bin/env node
import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('blog.naver.com'));
  const frame = page.frames().find(f => f.url().includes('PostWriteForm.naver'));

  const result = await frame.evaluate(() => {
    const editor = window.SE?.launcher?.getEditor?.('blogpc001');
    if (!editor) return { error: 'editor not found' };

    const info = {
      type: typeof editor,
      constructor: editor.constructor?.name,
      ownKeys: Object.getOwnPropertyNames(editor).slice(0, 80),
      protoMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(editor) || {}).slice(0, 80),
    };

    // Deep scan methods
    const methods = {};
    const allKeys = [...Object.getOwnPropertyNames(editor), ...Object.getOwnPropertyNames(Object.getPrototypeOf(editor) || {})];
    for (const key of [...new Set(allKeys)]) {
      try {
        const v = editor[key];
        if (typeof v === 'function') {
          methods[key] = v.toString().slice(0, 400);
        } else if (v && typeof v === 'object') {
          methods[key] = { type: 'object', keys: Object.keys(v).slice(0, 30) };
        }
      } catch {}
    }
    info.methods = methods;

    // COMMAND constants
    info.commands = window.SE?.launcher?.COMMAND;

    // Try getDocument / getModel
    const tryMethods = ['getDocument', 'getModel', 'getContent', 'getHTML', 'getJSON', 'getBody', 'insertText', 'setTitle', 'getTitle', 'execCommand', 'execute', 'dispatch', 'trigger'];
    info.tryResults = {};
    for (const m of tryMethods) {
      if (typeof editor[m] === 'function') {
        try {
          const r = editor[m]();
          info.tryResults[m] = { type: typeof r, preview: JSON.stringify(r)?.slice(0, 500) };
        } catch (e) {
          info.tryResults[m] = { error: e.message };
        }
      }
    }

    // Look for store/state on editor
    for (const key of Object.keys(editor)) {
      const v = editor[key];
      if (v && typeof v === 'object' && (key.includes('store') || key.includes('state') || key.includes('model') || key.includes('document'))) {
        info[key] = { keys: Object.keys(v).slice(0, 30) };
      }
    }

    return info;
  });

  console.log(JSON.stringify(result, null, 2));
  browser.disconnect();
}

main().catch(console.error);
