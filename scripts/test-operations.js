#!/usr/bin/env node
/** Test actual editor operations */
import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('blog.naver.com'));
  const frame = page.frames().find(f => f.url().includes('PostWriteForm.naver'));

  const results = await frame.evaluate(async () => {
    const editor = window.SE.launcher.getEditor('blogpc001');
    const cm = editor._commandManager;
    const ds = editor._documentService;
    const es = editor._editingService;
    const out = {};

    // Get current title
    try { out.title = ds.getDocumentTitle(); } catch (e) { out.titleError = e.message; }

    // Get content text
    try { out.contentText = ds.getContentText()?.slice(0, 200); } catch (e) { out.contentError = e.message; }

    // Get document data structure
    try {
      const data = ds.getDocumentData();
      out.documentDataKeys = Object.keys(data);
      out.documentDataPreview = JSON.stringify(data)?.slice(0, 1500);
    } catch (e) { out.documentDataError = e.message; }

    // Get component list with types
    try {
      const list = editor._papyrus._componentListStore.getComponentList();
      out.components = list.map(c => ({
        id: c.id,
        compType: c.compType || c.getCompType?.() || c.ctype,
        keys: Object.keys(c).slice(0, 15),
      }));
    } catch (e) { out.componentsError = e.message; }

    // Test toolbar click simulation
    out.toolbarSelectors = {};
    for (const name of ['image', 'video', 'bold', 'table', 'oglink']) {
      const btn = document.querySelector(`[data-name="${name}"]`);
      out.toolbarSelectors[name] = btn ? { found: true, tag: btn.tagName, disabled: btn.disabled } : { found: false };
    }

    // Get command function signatures
    for (const cmd of ['insertComponents', 'insertImages', 'insertImagesByUrl']) {
      const fn = cm.getCommand?.(cmd) || cm._commandMap?.[cmd];
      if (fn) out[`cmd_${cmd}`] = fn.toString().slice(0, 600);
    }

    return out;
  });

  console.log(JSON.stringify(results, null, 2));
  browser.disconnect();
}

main().catch(console.error);
