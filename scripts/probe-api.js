#!/usr/bin/env node
/** Deep probe of SmartEditor JavaScript API */
import puppeteer from 'puppeteer-core';

const CDP_PORT = process.env.CDP_PORT || '9223';

async function getEditorFrame(page) {
  const frames = page.frames();
  return frames.find(f => f.url().includes('PostWriteForm.naver')) || null;
}

async function probeApi(frame) {
  return frame.evaluate(() => {
    const result = {
      SE: null,
      SmartEditor: null,
      launcher: null,
      editorInstances: [],
      commands: [],
      events: [],
      reduxState: null,
      reactQuery: null,
    };

    // SE.launcher
    if (window.SE?.launcher) {
      const launcher = window.SE.launcher;
      result.launcher = {
        type: typeof launcher,
        keys: typeof launcher === 'object' ? Object.keys(launcher).slice(0, 80) : [],
        proto: launcher?.constructor?.name,
      };

      // Try to find editor instance
      for (const key of Object.keys(launcher)) {
        try {
          const v = launcher[key];
          if (v && typeof v === 'object') {
            const subkeys = Object.keys(v).slice(0, 30);
            result.editorInstances.push({ path: `SE.launcher.${key}`, keys: subkeys, type: typeof v });
          }
        } catch {}
      }
    }

    // SmartEditor constructor
    if (window.SmartEditor) {
      result.SmartEditor = {
        name: SmartEditor.name,
        length: SmartEditor.length,
        protoMethods: Object.getOwnPropertyNames(SmartEditor.prototype || {}).slice(0, 50),
      };
    }

    // __se_editor_jsonp - loaded modules
    if (window.__se_editor_jsonp) {
      result.seJsonpCount = window.__se_editor_jsonp.length;
    }

    // Redux persist state
    try {
      const persistKey = Object.keys(sessionStorage).find(k => k.includes('persist'));
      if (persistKey) {
        const raw = sessionStorage.getItem(persistKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          result.reduxState = {
            key: persistKey,
            topKeys: Object.keys(parsed).slice(0, 20),
          };
        }
      }
    } catch {}

    // Find editor canvas and its React fiber / internal props
    const canvas = document.querySelector('.se-canvas, .se-main-container');
    if (canvas) {
      const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
      if (fiberKey) {
        result.hasReactFiber = true;
      }
    }

    // Document model - look for SE document structure
    const components = document.querySelectorAll('.se-component');
    result.componentCount = components.length;
    result.componentClasses = [...new Set([...components].map(c => {
      return [...c.classList].filter(cl => cl.startsWith('se-component')).join(' ');
    }))].slice(0, 20);

    // Title input
    const titleEl = document.querySelector('.se-title-text, input.se-title-input, [placeholder*="제목"]');
    result.titleSelector = titleEl ? {
      tag: titleEl.tagName,
      class: titleEl.className?.toString?.(),
      placeholder: titleEl.placeholder,
      contentEditable: titleEl.contentEditable,
    } : null;

    // Body paragraphs
    const paragraphs = document.querySelectorAll('.se-text-paragraph, .se-component-content');
    result.paragraphCount = paragraphs.length;
    result.paragraphSample = paragraphs[0] ? {
      class: paragraphs[0].className?.toString?.(),
      contentEditable: paragraphs[0].contentEditable,
      html: paragraphs[0].innerHTML?.slice(0, 200),
    } : null;

    // Toolbar click handlers - data-name mapping
    const toolbarMap = {};
    document.querySelectorAll('[data-name]').forEach(el => {
      const name = el.getAttribute('data-name');
      if (name && el.closest('.se-document-toolbar, .se-property-toolbar')) {
        toolbarMap[name] = {
          tag: el.tagName,
          class: el.className?.toString?.().slice(0, 100),
          toolbar: el.closest('.se-document-toolbar') ? 'document' : 'property',
        };
      }
    });
    result.toolbarMap = toolbarMap;

    // Property toolbar (text formatting)
    const propertyTools = {};
    document.querySelectorAll('.se-property-toolbar [data-name]').forEach(el => {
      propertyTools[el.getAttribute('data-name')] = el.className?.toString?.().slice(0, 80);
    });
    result.propertyTools = propertyTools;

    // Try dispatching via SE internal API
    const apiProbe = {};
    const paths = [
      ['SE', 'launcher'],
      ['SE', 'launcher', 'editor'],
      ['SE', 'launcher', 'getEditor'],
      ['SE', 'launcher', 'getActiveEditor'],
    ];

    function getPath(obj, path) {
      let cur = window;
      for (const p of path) {
        if (cur == null) return undefined;
        cur = cur[p];
      }
      return cur;
    }

    for (const path of paths) {
      const v = getPath(null, path);
      if (v !== undefined) {
        apiProbe[path.join('.')] = {
          type: typeof v,
          keys: typeof v === 'object' && v ? Object.keys(v).slice(0, 40) : undefined,
          fn: typeof v === 'function' ? v.toString().slice(0, 300) : undefined,
        };
      }
    }
    result.apiProbe = apiProbe;

    // Category selector
    const category = document.querySelector('[class*="category"], select[name*="category"], .selectbox_category');
    result.category = category ? { class: category.className?.toString?.(), tag: category.tagName } : null;

    // Publish panel
    const publishBtn = document.querySelector('.publish_btn__m9KHH, [class*="publish_btn"]');
    result.publishBtn = publishBtn ? publishBtn.className : null;

    return result;
  });
}

async function probeLauncherMethods(frame) {
  return frame.evaluate(() => {
    const methods = {};
    const launcher = window.SE?.launcher;
    if (!launcher) return { error: 'no launcher' };

    for (const key of Object.keys(launcher)) {
      const v = launcher[key];
      if (typeof v === 'function') {
        methods[key] = v.toString().slice(0, 500);
      } else if (v && typeof v === 'object') {
        methods[key] = {
          type: 'object',
          keys: Object.keys(v).slice(0, 50),
          methods: Object.keys(v).filter(k => typeof v[k] === 'function').slice(0, 30),
        };
      } else {
        methods[key] = { type: typeof v, value: String(v).slice(0, 100) };
      }
    }
    return methods;
  });
}

async function testTextInsert(frame) {
  return frame.evaluate(() => {
    const results = { attempts: [] };

    // Find editable area
    const editable = document.querySelector('.se-text-paragraph[contenteditable="true"], .se-component-content[contenteditable="true"], .se-module-text p');
    if (editable) {
      results.foundEditable = {
        class: editable.className,
        tag: editable.tagName,
      };

      // Try focus and insert
      editable.focus();
      const before = editable.textContent;
      document.execCommand('insertText', false, '[TEST]');
      const after = editable.textContent;
      results.execCommandInsert = { before: before?.slice(0, 50), after: after?.slice(0, 50), worked: after !== before };
    }

    // Title
    const title = document.querySelector('.se-title-text[contenteditable], .se_documentTitle');
    if (title) {
      results.title = { class: title.className?.toString?.(), contentEditable: title.contentEditable };
    }

    return results;
  });
}

async function main() {
  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:9223`,
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('blog.naver.com')) || pages[0];
  const frame = await getEditorFrame(page);

  if (!frame) {
    console.error('Editor frame not found');
    process.exit(1);
  }

  console.log('Editor frame:', frame.url());

  const api = await probeApi(frame);
  console.log('\n=== API Probe ===');
  console.log(JSON.stringify(api, null, 2));

  const launcher = await probeLauncherMethods(frame);
  console.log('\n=== SE.launcher methods ===');
  console.log(JSON.stringify(launcher, null, 2));

  const textTest = await testTextInsert(frame);
  console.log('\n=== Text Insert Test ===');
  console.log(JSON.stringify(textTest, null, 2));

  browser.disconnect();
}

main().catch(console.error);
