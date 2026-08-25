#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('blog.naver.com'));
  const frame = page.frames().find(f => f.url().includes('PostWriteForm.naver'));

  await frame.evaluate(() => document.querySelector('button.publish_btn__m9KHH')?.click());
  await sleep(1500);

  // Category dropdown
  const catProbe = await frame.evaluate(() => {
    const out = {};
    const catBtn = document.querySelector('button.selectbox_button__jb1Dt, [data-click-area="tpb*i.category"]');
    if (catBtn) {
      out.currentCategory = catBtn.textContent?.trim();
      catBtn.click();
    }
    return out;
  });
  await sleep(1000);

  const catList = await frame.evaluate(() => {
    const items = [];
    document.querySelectorAll('[class*="selectbox"], [class*="category"], [class*="list_item"], li, [role="option"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      const text = el.textContent?.trim();
      const cls = el.className?.toString?.() || '';
      if (text && text.length < 40 && /category|select|item|option|list/i.test(cls + text)) {
        items.push({ text, class: cls.slice(0, 80) });
      }
    });
    // Also look for dropdown lists specifically
    document.querySelectorAll('[class*="dropdown"], [class*="Dropdown"], [class*="option_list"], [class*="select_list"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      el.querySelectorAll('li, button, [role="option"]').forEach(item => {
        items.push({ text: item.textContent?.trim(), class: item.className?.toString?.().slice(0, 80), parent: el.className?.toString?.().slice(0, 60) });
      });
    });
    return items.slice(0, 30);
  });
  console.log('Category probe:', catProbe);
  console.log('Category list:', JSON.stringify(catList, null, 2));

  // Topic selector
  const topicProbe = await frame.evaluate(() => {
    const out = { topicElements: [] };
    document.querySelectorAll('[class*="subject"], [class*="Subject"], [class*="topic"], [class*="Topic"], [class*="theme"]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      out.topicElements.push({
        class: el.className?.toString?.().slice(0, 100),
        text: el.textContent?.trim()?.slice(0, 100),
        tag: el.tagName,
      });
    });
    return out;
  });
  console.log('\nTopic:', JSON.stringify(topicProbe, null, 2));

  // Get popup state reader
  const state = await frame.evaluate(() => {
    const popup = document.querySelector('[class*="layer_popup"][class*="is_show"], .layer_publish__vA9PX');
    const getChecked = id => document.getElementById(id)?.checked;
    const getRadio = name => {
      const checked = document.querySelector(`input[name="${name}"]:checked`);
      return checked ? { id: checked.id, value: checked.value } : null;
    };
    return {
      isOpen: !!popup,
      category: document.querySelector('button.selectbox_button__jb1Dt')?.textContent?.trim(),
      openType: getRadio('open_type'),
      publishTime: getRadio('radio_time'),
      tags: document.getElementById('tag-input')?.value,
      options: {
        comment: getChecked('publish-option-comment'),
        sympathy: getChecked('publish-option-sympathy'),
        search: getChecked('publish-option-search'),
        scrap: getChecked('publish-option-scrap'),
        outside: getChecked('publish-option-outside'),
        setDefault: getChecked('set-default'),
        notice: getChecked('set-notice'),
      },
    };
  });
  console.log('\nPopup state:', JSON.stringify(state, null, 2));

  // Close
  await frame.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  browser.disconnect();
}

main().catch(console.error);
