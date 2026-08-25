#!/usr/bin/env node
import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('blog.naver.com'));
  const frame = page.frames().find(f => f.url().includes('PostWriteForm.naver'));

  const result = await frame.evaluate(() => {
    const editor = window.SE.launcher.getEditor('blogpc001');
    const es = editor._editingService;
    const ds = editor._documentService;
    const out = {};

    // Focus body text component
    const textComp = editor._papyrus._componentListStore.getComponentsByCtype('text')?.[0];
    if (textComp) {
      out.textCompId = textComp.id;
      // Try to focus
      try {
        editor._papyrus.getSelection()?.setSelection?.(textComp.id);
      } catch (e) { out.focusError = e.message; }
    }

    // write method signature
    out.writeSrc = es.write?.toString()?.slice(0, 400);
    out.insertSrc = es.insert?.toString()?.slice(0, 400);
    out.setDocumentTitleSrc = ds.setDocumentTitle?.toString()?.slice(0, 400);

    // Property change for bold
    const pcs = editor._propertyChangeService;
    if (pcs) {
      out.propertyChangeMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(pcs)).filter(k => typeof pcs[k] === 'function');
    }

    // Hotkey binder
    const hb = editor._papyrus._hotkeyBinder;
    if (hb) out.hotkeyBinderKeys = Object.keys(hb).slice(0, 20);

    // execCommand insertComponents - get the actual command object
    const cmd = editor._commandManager.getCommand('insertComponents');
    out.insertComponentsCmd = cmd ? Object.keys(cmd) : null;
    if (cmd?.execute) out.insertComponentsExecute = cmd.execute.toString().slice(0, 800);

    return out;
  });

  console.log(JSON.stringify(result, null, 2));
  browser.disconnect();
}

main().catch(console.error);
