#!/usr/bin/env node
/** Analyze save/publish popup UI - use evaluate click to avoid hang */
import puppeteer from 'puppeteer-core';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function scanPopup(frame, label) {
  return frame.evaluate((label) => {
    const out = { label, layers: [], fields: [], buttons: [], tags: [], radios: [], checkboxes: [] };

    const isVisible = el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };

    document.querySelectorAll('[class*="layer"], [class*="Layer"], [class*="popup"], [class*="Popup"], [class*="modal"], [class*="publish"], [class*="Publish"], [class*="setting"], [class*="Setting"]').forEach(el => {
      if (!isVisible(el)) return;
      const cls = el.className?.toString?.() || '';
      if (cls.length < 3) return;
      out.layers.push({
        class: cls.slice(0, 150),
        text: el.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 300),
      });
    });

    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (!isVisible(el)) return;
      out.fields.push({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        class: el.className?.toString?.().slice(0, 120),
        value: el.value?.slice?.(0, 80),
        ariaLabel: el.getAttribute('aria-label'),
      });
    });

    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => {
      if (!isVisible(el)) return;
      const item = {
        type: el.type,
        name: el.name,
        id: el.id,
        value: el.value,
        class: el.className?.toString?.().slice(0, 80),
        checked: el.checked,
        label: el.closest('label')?.textContent?.trim()?.slice(0, 60) || el.parentElement?.textContent?.trim()?.slice(0, 60),
      };
      if (el.type === 'radio') out.radios.push(item);
      else out.checkboxes.push(item);
    });

    document.querySelectorAll('button, [role="button"], a[class*="btn"], label[class*="btn"]').forEach(btn => {
      if (!isVisible(btn)) return;
      const text = btn.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 50);
      if (!text) return;
      out.buttons.push({
        text,
        class: btn.className?.toString?.().slice(0, 120),
        dataClick: btn.getAttribute('data-click-area'),
        disabled: btn.disabled,
      });
    });

    // Tag chips
    document.querySelectorAll('[class*="tag"], [class*="Tag"]').forEach(el => {
      if (!isVisible(el)) return;
      const cls = el.className?.toString?.() || '';
      if (/tag/i.test(cls)) {
        out.tags.push({ class: cls.slice(0, 100), text: el.textContent?.trim()?.slice(0, 80) });
      }
    });

    return out;
  }, label);
}

async function clickInFrame(frame, selector) {
  return frame.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return { ok: false, error: 'not found: ' + selector };
    el.click();
    return { ok: true, text: el.textContent?.trim()?.slice(0, 30) };
  }, selector);
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('blog.naver.com'));
  const frame = page.frames().find(f => f.url().includes('PostWriteForm.naver'));
  if (!frame) throw new Error('frame not found');

  // Publish popup
  console.log('Clicking publish...');
  const pubClick = await clickInFrame(frame, 'button.publish_btn__m9KHH, button[data-click-area="tpb.publish"]');
  console.log('Publish click:', pubClick);
  await sleep(2000);
  const publishScan = await scanPopup(frame, 'publish');
  console.log('\n=== PUBLISH POPUP ===');
  console.log(JSON.stringify(publishScan, null, 2));

  // Close publish popup if possible
  await frame.evaluate(() => {
    const close = document.querySelector('[class*="close"], [class*="cancel"], button[aria-label*="닫"], button[aria-label*="취소"]');
    if (close) close.click();
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  await sleep(1000);

  // Save - might be direct action or popup
  console.log('\nClicking save...');
  const saveClick = await clickInFrame(frame, 'button.save_btn__bzc5B, button[class*="save_btn"]:not([class*="count"])');
  console.log('Save click:', saveClick);
  await sleep(2000);
  const saveScan = await scanPopup(frame, 'save');
  console.log('\n=== SAVE RESULT ===');
  console.log(JSON.stringify(saveScan, null, 2));

  browser.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
