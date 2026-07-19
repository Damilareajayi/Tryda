import { chromium, Browser, Page } from 'playwright';

export interface ChatElementConfig {
  buttonSelector: string;
  inputSelector: string;
  historySelector: string;
  messageSelector: string;
  sendButtonSelector?: string;
}

// Heuristics for popular chat widgets
const WIDGET_HEURISTICS: Record<string, ChatElementConfig> = {
  crisp: {
    buttonSelector: '.crisp-client [role="button"]',
    inputSelector: '.crisp-client textarea, .crisp-client input',
    historySelector: '.crisp-client .crisp-message-list',
    messageSelector: '.crisp-client .crisp-message'
  },
  intercom: {
    buttonSelector: '.intercom-launcher, [class*="intercom-launcher"]',
    inputSelector: '.intercom-composer textarea, .intercom-text-input',
    historySelector: '.intercom-conversation-body',
    messageSelector: '.intercom-comment-container, .intercom-post'
  },
  generic: {
    buttonSelector: 'button:has-text("chat"), button:has-text("support"), [aria-label*="chat"], [class*="chat-launcher"], [id*="chat-button"], svg[class*="chat"]',
    inputSelector: 'textarea[placeholder*="message" i], input[placeholder*="message" i], textarea[placeholder*="ask" i], input[placeholder*="ask" i], [role="textbox"]',
    historySelector: '[class*="chat-history"], [class*="message-list"], [id*="chat-box"]',
    messageSelector: '[class*="message-bubble"], [class*="chat-message"], [class*="bubble"]'
  }
};

export class ChatCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async start(url: string) {
    this.browser = await chromium.launch({
      headless: true,
      // Playwright browser path is set via env var
    });
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    this.page = await context.newPage();
    
    console.log(`Navigating to ${url}...`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait slightly for dynamic scripts to load
    await this.page.waitForTimeout(3000);
  }

  async findChatWidget(): Promise<ChatElementConfig | null> {
    if (!this.page) throw new Error('Page not initialized. Call start() first.');

    // 1. Check heuristics
    for (const [name, config] of Object.entries(WIDGET_HEURISTICS)) {
      try {
        const btn = await this.page.$(config.buttonSelector);
        if (btn && await btn.isVisible()) {
          console.log(`Detected likely ${name} chat widget.`);
          return config;
        }
      } catch (err) {
        // Skip selector issues
      }
    }

    // 2. Try generic search if specific ones failed
    try {
      const generic = WIDGET_HEURISTICS.generic;
      const genericBtn = await this.page.$(generic.buttonSelector);
      if (genericBtn && await genericBtn.isVisible()) {
        console.log('Detected generic chat widget.');
        return generic;
      }
    } catch (err) {
      // Ignore
    }

    return null;
  }

  async openChat(config: ChatElementConfig) {
    if (!this.page) throw new Error('Page not initialized');
    console.log('Attempting to open chat widget...');
    const btn = await this.page.$(config.buttonSelector);
    if (btn) {
      await btn.click();
      await this.page.waitForTimeout(2000); // wait for open animation
    } else {
      console.log('Could not find chat open button, assuming already open or inline.');
    }
  }

  async sendMessage(config: ChatElementConfig, text: string) {
    if (!this.page) throw new Error('Page not initialized');
    console.log(`Sending message: "${text}"`);
    
    // Focus and type
    await this.page.focus(config.inputSelector);
    await this.page.fill(config.inputSelector, text);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async waitForReply(config: ChatElementConfig, lastMessageCount: number, timeoutMs = 15000): Promise<string[]> {
    if (!this.page) throw new Error('Page not initialized');
    console.log('Waiting for AI reply...');

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await this.page.waitForTimeout(1000);
      const messages = await this.page.$$eval(config.messageSelector, (elems) => 
        elems.map(el => el.textContent?.trim() || '')
      );
      
      const filtered = messages.filter(m => m.length > 0);
      if (filtered.length > lastMessageCount) {
        // Return only the new messages
        return filtered.slice(lastMessageCount);
      }
    }
    
    console.log('Timeout waiting for reply.');
    return [];
  }

  async getMessageCount(config: ChatElementConfig): Promise<number> {
    if (!this.page) return 0;
    try {
      const messages = await this.page.$$eval(config.messageSelector, (elems) => 
        elems.map(el => el.textContent?.trim() || '').filter(m => m.length > 0)
      );
      return messages.length;
    } catch {
      return 0;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
