import puppeteer from 'puppeteer-core';

/**
 * Connect to an existing Chrome instance via CDP (agent-browser autoconnect)
 */
export class BrowserConnection {
  constructor(options = {}) {
    this.port = options.port ?? process.env.CDP_PORT ?? '9223';
    this.host = options.host ?? '127.0.0.1';
    this.browser = null;
  }

  get browserURL() {
    return `http://${this.host}:${this.port}`;
  }

  async connect() {
    this.browser = await puppeteer.connect({
      browserURL: this.browserURL,
      defaultViewport: null,
    });
    return this.browser;
  }

  async disconnect() {
    if (this.browser) {
      this.browser.disconnect();
      this.browser = null;
    }
  }

  async listTargets() {
    const res = await fetch(`${this.browserURL}/json/list`);
    return res.json();
  }

  /**
   * Find Naver blog write page
   */
  async findBlogPage(urlHint = 'blog.naver.com') {
    if (!this.browser) await this.connect();
    const pages = await this.browser.pages();
    for (const page of pages) {
      const url = page.url();
      if (url.includes(urlHint) && (url.includes('Write') || url.includes('PostWrite'))) {
        return page;
      }
    }
    for (const page of pages) {
      if (page.url().includes(urlHint)) return page;
    }
    return null;
  }

  /**
   * Get Smart Editor iframe frame
   */
  getEditorFrame(page) {
    const frames = page.frames();
    return frames.find(f => f.url().includes('PostWriteForm.naver')) ?? null;
  }
}

export default BrowserConnection;
