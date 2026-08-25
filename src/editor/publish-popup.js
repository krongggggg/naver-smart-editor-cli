import {
  PUBLISH_SELECTORS,
  OPEN_TYPE,
  PUBLISH_TIME,
  PUBLISH_OPTIONS,
} from '../modules/publish-definitions.js';

/**
 * Save / Publish popup controller
 * Operates on PostWriteForm iframe (same frame as SmartEditor)
 */
export class PublishPopup {
  constructor(frame) {
    this.frame = frame;
  }

  async evaluate(fn, ...args) {
    return this.frame.evaluate(fn, ...args);
  }

  // ─── Popup visibility ───────────────────────────────────────

  async isPublishOpen() {
    return this.evaluate((sel) => !!document.querySelector(sel), PUBLISH_SELECTORS.popup);
  }

  async getState() {
    return this.evaluate((selectors, openTypeMap, timeMap, optionMap) => {
      const popup = document.querySelector(selectors.popup);
      const getChecked = id => document.getElementById(id)?.checked ?? null;
      const getRadio = name => {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? { id: el.id, value: el.value } : null;
      };

      return {
        isOpen: !!popup,
        category: document.querySelector(selectors.categoryBtn)?.textContent?.trim() ?? null,
        topic: document.querySelector(selectors.topicArea)?.textContent?.trim()?.replace(/^주제/, '') ?? null,
        openType: getRadio('open_type'),
        publishTime: getRadio('radio_time'),
        tags: document.getElementById('tag-input')?.value ?? '',
        options: Object.fromEntries(
          Object.entries(optionMap).map(([key, { id }]) => [key, getChecked(id)])
        ),
      };
    }, PUBLISH_SELECTORS, OPEN_TYPE, PUBLISH_TIME, PUBLISH_OPTIONS);
  }

  // ─── Open / Close ───────────────────────────────────────────

  async openPublish() {
    const already = await this.isPublishOpen();
    if (already) return { ok: true, action: 'publish', alreadyOpen: true };
    return this.click(PUBLISH_SELECTORS.publishBtn, 'publish');
  }

  async closePublish() {
    return this.evaluate((popupSel, publishBtnSel) => {
      const popup = document.querySelector(popupSel);
      if (!popup) return { closed: true, method: 'already-closed' };

      // Escape first
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      // Toggle via publish button if still open
      if (document.querySelector(popupSel)) {
        const btn = document.querySelector(publishBtnSel);
        btn?.click();
      }

      return { closed: !document.querySelector(popupSel), method: 'escape-or-toggle' };
    }, PUBLISH_SELECTORS.popup, PUBLISH_SELECTORS.publishBtn);
  }

  async confirmPublish() {
    await this.ensurePublishOpen();
    return this.click(PUBLISH_SELECTORS.popupConfirm, 'confirmPublish');
  }

  async toggleSettingsFold() {
    await this.ensurePublishOpen();
    return this.click(PUBLISH_SELECTORS.settingsFold, 'toggleSettings');
  }

  // ─── Save ───────────────────────────────────────────────────

  async save() {
    return this.click(PUBLISH_SELECTORS.saveBtn, 'save');
  }

  async openDraftList() {
    return this.click(PUBLISH_SELECTORS.saveCountBtn, 'openDraftList');
  }

  async openReserveList() {
    return this.click(PUBLISH_SELECTORS.reserveBtn, 'openReserveList');
  }

  // ─── Category ───────────────────────────────────────────────

  async getCategory() {
    return this.evaluate((sel) => {
      return document.querySelector(sel)?.textContent?.trim() ?? null;
    }, PUBLISH_SELECTORS.categoryBtn);
  }

  async openCategoryDropdown() {
    await this.ensurePublishOpen();
    return this.click(PUBLISH_SELECTORS.categoryBtn, 'openCategory');
  }

  async selectCategory(name) {
    await this.ensurePublishOpen();
    return this.evaluate((categoryBtnSel, itemSel, name) => {
      const btn = document.querySelector(categoryBtnSel);
      if (!btn) throw new Error('Category button not found');
      btn.click();

      const items = [...document.querySelectorAll(itemSel)];
      const item = items.find(el => el.textContent?.trim() === name);
      if (!item) {
        const available = items.map(el => el.textContent?.trim()).filter(t => t && t.length < 30);
        throw new Error(`Category "${name}" not found. Available: ${available.slice(0, 20).join(', ')}`);
      }
      item.click();
      return { selected: name };
    }, PUBLISH_SELECTORS.categoryBtn, PUBLISH_SELECTORS.categoryItem, name);
  }

  async listCategories() {
    await this.ensurePublishOpen();
    await this.openCategoryDropdown();
    await new Promise(r => setTimeout(r, 500));
    const categories = await this.evaluate((categoryBtnSel, itemSel) => {
      const btn = document.querySelector(categoryBtnSel);
      btn?.click();
      const current = btn?.textContent?.trim();
      const items = [...document.querySelectorAll(itemSel)]
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length < 30 && t.length > 0);
      // Deduplicate, filter out non-category items heuristically
      const skip = new Set(['전체공개', '이웃공개', '서로이웃공개', '비공개', '댓글허용', '공감허용', '현재', '예약']);
      return [...new Set(items)].filter(t => !skip.has(t));
    }, PUBLISH_SELECTORS.categoryBtn, PUBLISH_SELECTORS.categoryItem);
    return categories;
  }

  // ─── Topic ──────────────────────────────────────────────────

  async openTopicSelector() {
    await this.ensurePublishOpen();
    return this.click(PUBLISH_SELECTORS.topicArea, 'openTopic');
  }

  async getTopic() {
    return this.evaluate((sel) => {
      return document.querySelector(sel)?.textContent?.trim()?.replace(/^주제/, '') ?? null;
    }, PUBLISH_SELECTORS.topicArea);
  }

  // ─── Open type (visibility) ─────────────────────────────────

  async setOpenType(type) {
    await this.ensurePublishOpen();
    const mapping = OPEN_TYPE[type];
    if (!mapping) throw new Error(`Unknown open type: ${type}. Use: ${Object.keys(OPEN_TYPE).join(', ')}`);
    return this.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Open type radio not found: ${id}`);
      el.click();
      return { openType: id, checked: el.checked };
    }, mapping.id);
  }

  // ─── Publish time ───────────────────────────────────────────

  async setPublishTime(mode) {
    await this.ensurePublishOpen();
    const mapping = PUBLISH_TIME[mode];
    if (!mapping) throw new Error(`Unknown time mode: ${mode}. Use: now, schedule`);
    return this.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Time radio not found: ${id}`);
      el.click();
      return { time: id, checked: el.checked };
    }, mapping.id);
  }

  // ─── Tags ───────────────────────────────────────────────────

  async setTags(tags) {
    await this.ensurePublishOpen();
    const tagStr = Array.isArray(tags) ? tags.join(', ') : tags;
    return this.evaluate((inputId, tagStr) => {
      const input = document.getElementById(inputId);
      if (!input) throw new Error('Tag input not found');
      input.focus();
      input.value = tagStr;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      // Enter to confirm tag chip if needed
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return { tags: input.value };
    }, 'tag-input', tagStr);
  }

  async addTag(tag) {
    await this.ensurePublishOpen();
    return this.evaluate((inputId, tag) => {
      const input = document.getElementById(inputId);
      if (!input) throw new Error('Tag input not found');
      input.focus();
      input.value = tag;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return { added: tag };
    }, 'tag-input', tag);
  }

  // ─── Options (checkboxes) ───────────────────────────────────

  async setOption(option, enabled) {
    await this.ensurePublishOpen();
    const mapping = PUBLISH_OPTIONS[option];
    if (!mapping) throw new Error(`Unknown option: ${option}. Use: ${Object.keys(PUBLISH_OPTIONS).join(', ')}`);
    return this.evaluate((id, enabled) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Option checkbox not found: ${id}`);
      if (el.checked !== enabled) el.click();
      return { option: id, checked: el.checked };
    }, mapping.id, enabled);
  }

  async setOptions(options) {
    const results = {};
    for (const [key, value] of Object.entries(options)) {
      results[key] = await this.setOption(key, value);
    }
    return results;
  }

  // ─── High-level publish workflow ────────────────────────────

  /**
   * Configure publish popup and optionally confirm
   * @param {object} config
   * @param {string} [config.category]
   * @param {string} [config.openType] - public|neighbor|both_neighbor|private
   * @param {string|string[]} [config.tags]
   * @param {string} [config.time] - now|schedule
   * @param {object} [config.options] - comment, sympathy, search, scrap, outside, setDefault, notice
   * @param {boolean} [config.confirm=false] - click final publish button
   */
  async configure(config = {}) {
    await this.openPublish();
    await new Promise(r => setTimeout(r, 800));

    const results = { steps: [] };

    if (config.category) {
      results.steps.push({ category: await this.selectCategory(config.category) });
    }
    if (config.openType) {
      results.steps.push({ openType: await this.setOpenType(config.openType) });
    }
    if (config.tags) {
      results.steps.push({ tags: await this.setTags(config.tags) });
    }
    if (config.time) {
      results.steps.push({ time: await this.setPublishTime(config.time) });
    }
    if (config.options) {
      results.steps.push({ options: await this.setOptions(config.options) });
    }

    results.state = await this.getState();

    if (config.confirm) {
      results.steps.push({ confirm: await this.confirmPublish() });
    }

    return results;
  }

  // ─── Helpers ────────────────────────────────────────────────

  async ensurePublishOpen() {
    const open = await this.isPublishOpen();
    if (!open) await this.openPublish();
    return open;
  }

  async click(selector, action) {
    return this.evaluate((selector, action) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Element not found for ${action}: ${selector}`);
      el.click();
      return { ok: true, action, text: el.textContent?.trim()?.slice(0, 40) };
    }, selector, action);
  }
}

export default PublishPopup;
