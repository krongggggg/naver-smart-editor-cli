#!/usr/bin/env node
/**
 * Deep analysis of Naver Blog Smart Editor via CDP
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CDP_PORT = process.env.CDP_PORT || '9223';
const TARGET_URL = process.env.TARGET_URL || 'blog.naver.com';

async function findBlogPage(browser) {
  const pages = await browser.pages();
  for (const page of pages) {
    const url = page.url();
    if (url.includes(TARGET_URL) && (url.includes('Write') || url.includes('PostWrite'))) {
      return page;
    }
  }
  // fallback: any naver blog page
  for (const page of pages) {
    if (page.url().includes('blog.naver.com')) return page;
  }
  return null;
}

async function analyzeFrame(frame, depth = 0) {
  return frame.evaluate((depth) => {
    const result = {
      url: location.href,
      title: document.title,
      depth,
      globals: [],
      editorHints: [],
      toolbarButtons: [],
      iframes: [],
      dataAttributes: [],
      classPatterns: [],
      reactRoots: [],
      windowKeys: [],
    };

    // Scan window for editor-related globals
    const editorPatterns = /editor|smart|se2|SE_|naver|blog|post|write|component|module|toolbar|canvas|draft/i;
    for (const key of Object.keys(window)) {
      if (editorPatterns.test(key)) {
        try {
          const val = window[key];
          const type = val === null ? 'null' : typeof val;
          result.globals.push({ key, type });
        } catch {
          result.globals.push({ key, type: 'inaccessible' });
        }
      }
    }

    // Find SE (Smart Editor) objects specifically
    const seKeys = ['SE', 'SE2', 'SmartEditor', 'smartEditor', 'editor', 'Editor', 'blogEditor', 'PostWriteForm'];
    for (const k of seKeys) {
      if (window[k] !== undefined) {
        result.editorHints.push({ key: k, type: typeof window[k] });
      }
    }

    // Toolbar / module buttons
    const buttons = document.querySelectorAll('button, [role="button"], .se-toolbar-item, .se-component, [class*="toolbar"], [class*="module"], [data-name]');
    for (const btn of buttons) {
      const text = (btn.textContent || '').trim().slice(0, 50);
      const cls = btn.className?.toString?.() || '';
      const dataName = btn.getAttribute('data-name') || btn.getAttribute('data-type') || btn.getAttribute('aria-label') || '';
      if (text || dataName || cls.includes('se-')) {
        result.toolbarButtons.push({
          tag: btn.tagName,
          text,
          class: cls.slice(0, 120),
          dataName,
          id: btn.id || undefined,
        });
      }
    }

    // Smart Editor class patterns
    const allEls = document.querySelectorAll('[class*="se-"], [class*="SE_"], [id*="se-"], [id*="editor"]');
    const classSet = new Set();
    for (const el of allEls) {
      const cls = el.className?.toString?.() || '';
      cls.split(/\s+/).filter(c => /se-|SE_/.test(c)).forEach(c => classSet.add(c));
    }
    result.classPatterns = [...classSet].slice(0, 100);

    // data-* attributes on editor elements
    const dataEls = document.querySelectorAll('[data-name], [data-type], [data-module], [data-component]');
    for (const el of dataEls) {
      result.dataAttributes.push({
        tag: el.tagName,
        dataName: el.getAttribute('data-name'),
        dataType: el.getAttribute('data-type'),
        dataModule: el.getAttribute('data-module'),
        dataComponent: el.getAttribute('data-component'),
        class: (el.className?.toString?.() || '').slice(0, 80),
      });
    }

    // contenteditable / editor body
    const editables = document.querySelectorAll('[contenteditable], .se-main-container, .se-component-content, .se-text-paragraph');
    result.editorHints.push({
      key: 'editables',
      count: editables.length,
      selectors: [...new Set([...editables].map(e => e.className?.toString?.().split(' ')[0]).filter(Boolean))].slice(0, 20),
    });

    // iframe children
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      result.iframes.push({ src: iframe.src?.slice(0, 200), id: iframe.id, name: iframe.name, class: iframe.className });
    }

    return result;
  }, depth);
}

async function deepInspectEditor(page) {
  const report = {
    pageUrl: page.url(),
    frames: [],
    editorApi: null,
    modules: [],
    networkScripts: [],
  };

  // Collect all frames
  const frames = page.frames();
  for (const frame of frames) {
    try {
      const frameData = await analyzeFrame(frame, frames.indexOf(frame));
      report.frames.push(frameData);
    } catch (e) {
      report.frames.push({ url: frame.url(), error: e.message });
    }
  }

  // Try to find the main editor frame and extract API
  for (const frame of frames) {
    try {
      const api = await frame.evaluate(() => {
        const findings = {
          frameUrl: location.href,
          se: null,
          seMethods: [],
          editorInstance: null,
          reactFiber: null,
          moduleMap: {},
        };

        // Naver Smart Editor ONE (SE ONE) - common patterns
        const candidates = [
          window.__SE_ONE__,
          window.__INITIAL_STATE__,
          window.__PRELOADED_STATE__,
          window.editor,
          window.Editor,
          window.SE,
        ].filter(Boolean);

        if (window.__SE_ONE__) {
          findings.se = 'window.__SE_ONE__';
          try {
            findings.seMethods = Object.keys(window.__SE_ONE__).slice(0, 50);
          } catch {}
        }

        // Look for editor store/state
        for (const key of Object.keys(window)) {
          if (/store|state|editor|SE/i.test(key)) {
            try {
              const v = window[key];
              if (v && typeof v === 'object') {
                findings.moduleMap[key] = Object.keys(v).slice(0, 30);
              }
            } catch {}
          }
        }

        // Toolbar module list from DOM
        const modules = [];
        document.querySelectorAll('[class*="se-toolbar"], [class*="se-sidebar"], .se-document-toolbar').forEach(el => {
          el.querySelectorAll('button, li, [data-log], [data-name]').forEach(item => {
            const name = item.getAttribute('data-name') || item.getAttribute('data-log') || item.getAttribute('aria-label') || item.title || item.textContent?.trim()?.slice(0, 30);
            if (name) modules.push({ name, class: item.className?.toString?.().slice(0, 60) });
          });
        });
        findings.toolbarModules = modules;

        // Component types in document
        const components = [];
        document.querySelectorAll('[class*="se-component"], [data-comp-type]').forEach(el => {
          const type = el.getAttribute('data-comp-type') || el.className?.toString?.().match(/se-component-(\w+)/)?.[1];
          if (type) components.push(type);
        });
        findings.componentTypes = [...new Set(components)];

        // Main editor container structure
        const main = document.querySelector('.se-main-container, #se_canvas, .se-canvas, [class*="PostWrite"]');
        if (main) {
          findings.mainEditor = {
            tag: main.tagName,
            id: main.id,
            class: main.className?.toString?.().slice(0, 200),
            childCount: main.children.length,
          };
        }

        return findings;
      });
      if (api && (api.se || api.toolbarModules?.length || api.componentTypes?.length)) {
        report.editorApi = api;
        break;
      }
    } catch {}
  }

  // Extract module buttons from all frames combined
  const allButtons = new Map();
  for (const f of report.frames) {
    for (const btn of f.toolbarButtons || []) {
      const key = btn.dataName || btn.text || btn.class;
      if (key && !allButtons.has(key)) allButtons.set(key, btn);
    }
  }
  report.modules = [...allButtons.values()];

  return report;
}

async function inspectPostWriteIframe(page) {
  // Naver blog uses nested iframes - main editor is often in #mainFrame or similar
  return page.evaluate(() => {
    const info = { iframes: [], forms: [], inputs: [] };

    document.querySelectorAll('iframe').forEach(f => {
      info.iframes.push({ id: f.id, name: f.name, src: f.src?.slice(0, 300) });
    });

    document.querySelectorAll('input, textarea, [contenteditable]').forEach(el => {
      info.inputs.push({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        class: el.className?.toString?.().slice(0, 80),
        contentEditable: el.contentEditable,
      });
    });

    return info;
  });
}

async function main() {
  console.log(`Connecting to CDP on port ${CDP_PORT}...`);
  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${CDP_PORT}`,
    defaultViewport: null,
  });

  let page = await findBlogPage(browser);
  if (!page) {
    console.error('No Naver blog write page found. Open:', TARGET_URL);
    process.exit(1);
  }

  console.log('Found page:', page.url());

  // Bring to front
  await page.bringToFront();

  const iframeInfo = await inspectPostWriteIframe(page);
  console.log('\n=== Page iframe structure ===');
  console.log(JSON.stringify(iframeInfo, null, 2));

  const report = await deepInspectEditor(page);
  console.log('\n=== Editor API findings ===');
  console.log(JSON.stringify(report.editorApi, null, 2));

  console.log('\n=== Frames analyzed:', report.frames.length, '===');
  for (const f of report.frames) {
    if (f.globals?.length || f.classPatterns?.length) {
      console.log(`\nFrame: ${f.url}`);
      console.log('  Globals:', f.globals?.slice(0, 15));
      console.log('  Classes:', f.classPatterns?.slice(0, 20));
      console.log('  Buttons:', f.toolbarButtons?.length);
    }
  }

  console.log('\n=== Module buttons (unique):', report.modules.length, '===');
  console.log(JSON.stringify(report.modules.slice(0, 40), null, 2));

  const outPath = path.join(__dirname, '../analysis/editor-report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ iframeInfo, ...report }, null, 2));
  console.log('\nFull report saved to:', outPath);

  browser.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
