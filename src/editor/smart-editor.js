import { EDITOR_APP_ID } from '../modules/definitions.js';

/**
 * Wrapper around SE.launcher.getEditor('blogpc001')
 * All Smart Editor ONE internal APIs accessed through this class.
 */
export class SmartEditor {
  constructor(frame, appId = EDITOR_APP_ID) {
    this.frame = frame;
    this.appId = appId;
  }

  /**
   * Run code inside the editor iframe with editor instance available
   */
  async evaluate(fn, ...args) {
    return this.frame.evaluate(fn, ...args);
  }

  async getEditorHandle() {
    return this.evaluate((appId) => {
      const editor = window.SE?.launcher?.getEditor?.(appId);
      if (!editor) throw new Error(`Editor instance '${appId}' not found. Is Smart Editor loaded?`);
      return true;
    }, this.appId);
  }

  async assertReady() {
    const ok = await this.evaluate((appId) => {
      return !!(window.SE?.launcher?.getEditor?.(appId));
    }, this.appId);
    if (!ok) throw new Error('Smart Editor not ready');
    return this;
  }

  // ─── Document API ───────────────────────────────────────────

  async getTitle() {
    return this.evaluate((appId) => {
      return window.SE.launcher.getEditor(appId)._documentService.getDocumentTitle();
    }, this.appId);
  }

  async setTitle(title) {
    return this.evaluate((appId, title) => {
      window.SE.launcher.getEditor(appId)._documentService.setDocumentTitle(title);
      return true;
    }, this.appId, title);
  }

  async getContentText() {
    return this.evaluate((appId) => {
      return window.SE.launcher.getEditor(appId)._documentService.getContentText();
    }, this.appId);
  }

  async getDocumentData() {
    return this.evaluate((appId) => {
      return window.SE.launcher.getEditor(appId)._documentService.getDocumentData();
    }, this.appId);
  }

  async isEmpty() {
    return this.evaluate((appId) => {
      return window.SE.launcher.getEditor(appId)._documentService.isEmptyDocumentContent();
    }, this.appId);
  }

  async getComponents() {
    return this.evaluate((appId) => {
      const store = window.SE.launcher.getEditor(appId)._papyrus._componentListStore;
      return store.getComponentList().map(c => ({
        id: c.id,
        compType: c.compType || c.ctype,
        align: c.align,
      }));
    }, this.appId);
  }

  // ─── Text Writing API ───────────────────────────────────────

  /** Append paragraph via document model (reliable for automation) */
  async appendParagraph(text, { newParagraph = false } = {}) {
    return this.evaluate((appId, text, newParagraph) => {
      const ds = window.SE.launcher.getEditor(appId)._documentService;
      const data = ds.getDocumentData();
      let textComp = data.document.components.find(c => c['@ctype'] === 'text');
      if (!textComp) {
        ds._insertDefaultComponents?.();
        const refreshed = ds.getDocumentData();
        textComp = refreshed.document.components.find(c => c['@ctype'] === 'text');
      }
      if (!textComp) throw new Error('No text component in document');

      const ts = Date.now();
      if (newParagraph) {
        textComp.value.push({
          id: `SE-e2e-p-${ts}`,
          nodes: [{ id: `SE-e2e-n-${ts}`, value: text, '@ctype': 'textNode' }],
          '@ctype': 'paragraph',
        });
      } else {
        const lastPara = textComp.value[textComp.value.length - 1];
        if (lastPara?.nodes?.length) {
          const lastNode = lastPara.nodes[lastPara.nodes.length - 1];
          if (lastNode?.['@ctype'] === 'textNode') {
            lastNode.value = (lastNode.value || '') + text;
          } else {
            lastPara.nodes.push({ id: `SE-e2e-n-${ts}`, value: text, '@ctype': 'textNode' });
          }
        } else {
          textComp.value.push({
            id: `SE-e2e-p-${ts}`,
            nodes: [{ id: `SE-e2e-n-${ts}`, value: text, '@ctype': 'textNode' }],
            '@ctype': 'paragraph',
          });
        }
      }
      ds.setDocumentData(data);
      return { method: 'documentModel', length: ds.getContentText().length };
    }, this.appId, text, newParagraph);
  }

  async writeText(text) {
    return this.evaluate((appId, text) => {
      const editor = window.SE.launcher.getEditor(appId);
      const es = editor._editingService;
      const ds = editor._documentService;
      const textComps = editor._papyrus._componentListStore.getComponentsByCtype('text');
      const comp = textComps[textComps.length - 1];
      if (comp) editor._papyrus.getSelection()?.setSelection?.(comp.id);

      try {
        if (es.isCursorMode?.()) {
          es.write(text);
          return { method: 'editingService' };
        }
      } catch { /* fall through */ }

      // Fallback: document model append
      const data = ds.getDocumentData();
      const textComp = data.document.components.find(c => c['@ctype'] === 'text');
      const ts = Date.now();
      const lastPara = textComp.value[textComp.value.length - 1];
      if (lastPara?.nodes?.length) {
        const lastNode = lastPara.nodes[lastPara.nodes.length - 1];
        if (lastNode?.['@ctype'] === 'textNode') lastNode.value = (lastNode.value || '') + text;
        else lastPara.nodes.push({ id: `SE-n-${ts}`, value: text, '@ctype': 'textNode' });
      }
      ds.setDocumentData(data);
      return { method: 'documentModel' };
    }, this.appId, text);
  }

  async writeSpecialCharacter(char) {
    return this.writeText(char);
  }

  async lineBreak() {
    return this.appendParagraph('\n', { newParagraph: true });
  }

  // ─── Command Manager API ────────────────────────────────────

  async execCommand(commandName, ...args) {
    return this.evaluate((appId, commandName, args) => {
      const cm = window.SE.launcher.getEditor(appId)._commandManager;
      return cm.execCommand(commandName, ...args);
    }, this.appId, commandName, args);
  }

  async listCommands() {
    return this.evaluate((appId) => {
      const cm = window.SE.launcher.getEditor(appId)._commandManager;
      return Object.keys(cm._commandMap || {});
    }, this.appId);
  }

  // ─── Property / Formatting API ──────────────────────────────

  async toggleStyle(style) {
    return this.evaluate((appId, style) => {
      window.SE.launcher.getEditor(appId)._propertyChangeService.toggleStyle(style);
      return true;
    }, this.appId, style);
  }

  async updateStyle(property, value) {
    return this.evaluate((appId, property, value) => {
      window.SE.launcher.getEditor(appId)._propertyChangeService.updateStyle(property, value);
      return true;
    }, this.appId, property, value);
  }

  async changeLink(url) {
    return this.evaluate((appId, url) => {
      window.SE.launcher.getEditor(appId)._propertyChangeService.changeLink({ link: url });
      return true;
    }, this.appId, url);
  }

  async changeAlign(align) {
    return this.evaluate((appId, align) => {
      const editor = window.SE.launcher.getEditor(appId);
      const pcs = editor._propertyChangeService;
      const comp = editor._papyrus._componentListStore.getComponentsByCtype('text').pop();
      if (comp) editor._papyrus.getSelection()?.setSelection?.(comp.id);
      pcs.changeAllComponentsAlign(align);
      // Also set on document model for reliability
      const data = editor._documentService.getDocumentData();
      for (const c of data.document.components) {
        if (c['@ctype'] === 'text') c.align = align;
      }
      editor._documentService.setDocumentData(data);
      return { align };
    }, this.appId, align);
  }

  // ─── Toolbar API ────────────────────────────────────────────

  async clickToolbar(dataName) {
    return this.evaluate((dataName) => {
      const btn = document.querySelector(`[data-name="${dataName}"]`);
      if (!btn) throw new Error(`Toolbar button not found: ${dataName}`);
      btn.click();
      return { clicked: dataName };
    }, dataName);
  }

  async clickToolbarVariant(dataName, variantIndex = 0) {
    return this.evaluate((dataName, variantIndex) => {
      const container = document.querySelector(`[data-name="${dataName}"]`);
      if (!container) throw new Error(`Toolbar container not found: ${dataName}`);
      const options = container.querySelectorAll('button[data-name]');
      const btn = options[variantIndex] || container.querySelector('button');
      if (!btn) throw new Error(`No button in container: ${dataName}`);
      btn.click();
      return { clicked: dataName, variant: variantIndex };
    }, dataName, variantIndex);
  }

  // ─── Image API ──────────────────────────────────────────────

  async insertImagesByUrl(urls) {
    const urlList = Array.isArray(urls) ? urls : [urls];
    return this.execCommand('insertImagesByUrl', urlList);
  }

  // ─── Selection API ──────────────────────────────────────────

  async getSelection() {
    return this.evaluate((appId) => {
      const sel = window.SE.launcher.getEditor(appId)._papyrus.getSelection();
      if (!sel) return null;
      return {
        componentId: sel.getComponentId?.(),
        isCollapsed: sel.isCollapsed?.(),
      };
    }, this.appId);
  }

  async focusComponent(compType = 'text') {
    return this.evaluate((appId, compType) => {
      const editor = window.SE.launcher.getEditor(appId);
      const comps = editor._papyrus._componentListStore.getComponentsByCtype(compType);
      const comp = comps[comps.length - 1];
      if (comp) editor._papyrus.getSelection()?.setSelection?.(comp.id);
      return comp?.id ?? null;
    }, this.appId, compType);
  }

  // ─── Page Actions (outside iframe, on parent page) ─────────

  static async clickPublish(page) {
    return page.evaluate(() => {
      const btn = document.querySelector('.publish_btn__m9KHH, [class*="publish_btn"]:not([class*="area"])');
      if (btn) { btn.click(); return true; }
      // Try inside iframe
      return false;
    });
  }

  static async clickSave(page) {
    return page.evaluate(() => {
      const btn = document.querySelector('.save_btn__bzc5B, [class*="save_btn"]');
      if (btn) { btn.click(); return true; }
      return false;
    });
  }
}

export default SmartEditor;
