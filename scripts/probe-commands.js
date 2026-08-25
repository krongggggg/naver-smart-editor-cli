#!/usr/bin/env node
import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('blog.naver.com'));
  const frame = page.frames().find(f => f.url().includes('PostWriteForm.naver'));

  const result = await frame.evaluate(() => {
    const editor = window.SE.launcher.getEditor('blogpc001');
    const out = {};

    // Command manager
    const cm = editor._commandManager;
    if (cm) {
      out.commandManager = {
        keys: Object.keys(cm),
        protoMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(cm)).filter(k => typeof cm[k] === 'function'),
      };
      if (typeof cm.execute === 'function') out.commandManager.executeSrc = cm.execute.toString().slice(0, 500);
      if (typeof cm.register === 'function') out.commandManager.registerSrc = cm.register.toString().slice(0, 300);
      // List registered commands
      if (cm._commands) out.commandManager.commands = Object.keys(cm._commands).slice(0, 100);
      if (cm._commandMap) out.commandManager.commandMap = Object.keys(cm._commandMap).slice(0, 100);
    }

    // SE.launcher.COMMAND
    out.COMMAND = window.SE.launcher.COMMAND;

    // Document service
    const ds = editor._documentService;
    if (ds) {
      out.documentService = {
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(ds)).filter(k => typeof ds[k] === 'function').slice(0, 50),
      };
      // Try get document data
      if (ds._documentDataStore) {
        out.documentDataStore = { keys: Object.keys(ds._documentDataStore).slice(0, 30) };
      }
    }

    // Editing service methods
    const es = editor._editingService;
    if (es) {
      out.editingService = {
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(es)).filter(k => typeof es[k] === 'function').slice(0, 50),
      };
    }

    // Papyrus - core
    const p = editor._papyrus;
    if (p) {
      out.papyrus = {
        keys: Object.keys(p).slice(0, 40),
        protoMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(p)).filter(k => typeof p[k] === 'function').slice(0, 50),
      };
      if (p._toolbarService) {
        out.toolbarService = {
          keys: Object.keys(p._toolbarService),
          methods: Object.getOwnPropertyNames(Object.getPrototypeOf(p._toolbarService)).filter(k => typeof p._toolbarService[k] === 'function'),
        };
      }
    }

    // Public methods on editor prototype
    out.editorPublicMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(editor)).filter(k => {
      return typeof editor[k] === 'function' && !k.startsWith('_');
    });

    // Try getDocumentModel
    for (const path of [
      () => editor.getDocument?.(),
      () => editor.getDocumentModel?.(),
      () => editor._document?.document,
      () => editor._documentService?.getDocument?.(),
      () => editor._documentService?._documentDataStore?.getState?.(),
    ]) {
      try {
        const r = path();
        if (r) {
          out.documentModel = {
            type: typeof r,
            keys: typeof r === 'object' ? Object.keys(r).slice(0, 30) : undefined,
            preview: JSON.stringify(r)?.slice(0, 800),
          };
          break;
        }
      } catch (e) {
        out.documentModelError = e.message;
      }
    }

    // Component list store
    const cls = editor._papyrus?._componentListStore;
    if (cls) {
      out.componentListStore = {
        keys: Object.keys(cls),
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(cls)).filter(k => typeof cls[k] === 'function').slice(0, 30),
      };
      try {
        if (typeof cls.getComponentList === 'function') {
          const list = cls.getComponentList();
          out.componentList = list?.map?.(c => ({ id: c.id, type: c.compType || c.type, className: c.className }))?.slice(0, 10);
        }
        if (typeof cls.toJSON === 'function') {
          out.componentListJSON = JSON.stringify(cls.toJSON())?.slice(0, 1000);
        }
      } catch (e) {
        out.componentListError = e.message;
      }
    }

    // Service config modules
    out.modules = editor._serviceConfig?.modules;
    out.plugins = editor._serviceConfig?.plugins;

    return out;
  });

  console.log(JSON.stringify(result, null, 2));
  browser.disconnect();
}

main().catch(console.error);
