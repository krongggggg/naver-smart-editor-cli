import { DOCUMENT_TOOLBAR, PROPERTY_TOOLBAR } from './definitions.js';

/**
 * High-level module API for each Smart Editor toolbar feature
 */
export class EditorModules {
  constructor(editor) {
    this.editor = editor;
  }

  // ─── Document Toolbar Modules ───────────────────────────────

  async photo() {
    return this.editor.clickToolbar('image');
  }

  async mybox() {
    return this.editor.clickToolbar('social-media-image');
  }

  async video() {
    return this.editor.clickToolbar('video');
  }

  async sticker() {
    return this.editor.clickToolbar('sticker');
  }

  async quotation(variant = 0) {
    return this.editor.clickToolbarVariant('insert-quotation', variant);
  }

  async horizontalLine(variant = 0) {
    return this.editor.clickToolbarVariant('insert-horizontal-line', variant);
  }

  async oglink() {
    return this.editor.clickToolbar('oglink');
  }

  async file() {
    return this.editor.clickToolbar('file');
  }

  async schedule() {
    return this.editor.clickToolbar('schedule');
  }

  async code() {
    return this.editor.clickToolbar('code');
  }

  async table() {
    return this.editor.clickToolbar('table');
  }

  async formula() {
    return this.editor.clickToolbar('formula');
  }

  async map() {
    return this.editor.clickToolbar('map');
  }

  async shoppingConnect() {
    return this.editor.clickToolbar('shopping-connect');
  }

  async searchPanel() {
    return this.editor.clickToolbar('search');
  }

  async momentPanel() {
    return this.editor.clickToolbar('moment');
  }

  async libraryPanel() {
    return this.editor.clickToolbar('library');
  }

  async templatePanel() {
    return this.editor.clickToolbar('template');
  }

  // ─── Image via Command API ──────────────────────────────────

  async insertImageUrls(urls) {
    return this.editor.insertImagesByUrl(urls);
  }

  // ─── Property Toolbar (Text Formatting) ─────────────────────

  async bold() {
    return this.editor.toggleStyle('bold');
  }

  async italic() {
    return this.editor.toggleStyle('italic');
  }

  async underline() {
    return this.editor.toggleStyle('underline');
  }

  async strikethrough() {
    return this.editor.toggleStyle('strikethrough');
  }

  async fontColor(color) {
    return this.editor.updateStyle('color', color);
  }

  async backgroundColor(color) {
    return this.editor.updateStyle('backgroundColor', color);
  }

  async alignLeft() {
    return this.editor.changeAlign('left');
  }

  async alignCenter() {
    return this.editor.changeAlign('center');
  }

  async alignRight() {
    return this.editor.changeAlign('right');
  }

  async textLink(url) {
    return this.editor.changeLink(url);
  }

  async specialLetter() {
    return this.editor.clickToolbar('special-letter');
  }

  async speller() {
    return this.editor.clickToolbar('speller');
  }

  async fontSize(size) {
    return this.editor.clickToolbar('font-size');
  }

  async fontFamily() {
    return this.editor.clickToolbar('font-family');
  }

  async list() {
    return this.editor.clickToolbar('list');
  }

  async lineHeight() {
    return this.editor.clickToolbar('line-height');
  }

  // ─── Meta ───────────────────────────────────────────────────

  /** Title shortcuts (delegates to SmartEditor) */
  getTitle() { return this.editor.getTitle(); }
  setTitle(title) { return this.editor.setTitle(title); }

  /** Body text shortcuts */
  writeText(text) { return this.editor.writeText(text); }
  appendParagraph(text, opts) { return this.editor.appendParagraph(text, opts); }
  lineBreak() { return this.editor.lineBreak(); }

  listDocumentModules() {
    return Object.entries(DOCUMENT_TOOLBAR).map(([key, mod]) => ({
      key,
      label: mod.label,
      dataName: mod.dataName,
      type: mod.type,
      description: mod.description,
    }));
  }

  listPropertyModules() {
    return Object.entries(PROPERTY_TOOLBAR).map(([key, mod]) => ({
      key,
      label: mod.label,
      dataName: mod.dataName,
      method: mod.method,
    }));
  }
}

export default EditorModules;
