import browser from 'webextension-polyfill';
import { PageContent } from '../types';
import { isExtractContentMessage } from '../utils/typeGuards';

class ContentExtractor {
  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    browser.runtime.onMessage.addListener((message: unknown) => {
      if (isExtractContentMessage(message)) {
        return Promise.resolve(this.extractPageContent());
      }
      return undefined;
    });
  }

  private extractPageContent(): PageContent {
    const content: PageContent = {
      url: window.location.href,
      title: document.title,
      description: this.getMetaDescription(),
      content: this.getMainContent(),
      keywords: this.getKeywords()
    };

    return content;
  }

  private getMetaDescription(): string | undefined {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      return (metaDescription as HTMLMetaElement).content;
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      return (ogDescription as HTMLMetaElement).content;
    }

    return undefined;
  }

  private getMainContent(): string {
    // Priority order for content extraction
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#content',
      '.content',
      '#main',
      '.main'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.extractTextContent(element);
      }
    }

    // Fallback to body content
    return this.extractTextContent(document.body);
  }

  private extractTextContent(element: Element): string {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement;

    // Remove script and style elements
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());

    // Get text content and clean it up
    let text = clone.textContent || '';
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();

    // Limit content length to avoid overwhelming the AI
    const maxLength = 2000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }

    return text;
  }

  private getKeywords(): string[] {
    const keywords: string[] = [];

    // Meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      const content = (metaKeywords as HTMLMetaElement).content;
      keywords.push(...content.split(',').map(k => k.trim()));
    }

    // Article tags
    const articleTags = document.querySelector('meta[property="article:tag"]');
    if (articleTags) {
      keywords.push((articleTags as HTMLMetaElement).content);
    }

    // H1 and H2 headings as potential keywords
    const headings = document.querySelectorAll('h1, h2');
    headings.forEach(heading => {
      const text = heading.textContent?.trim();
      if (text && text.length < 50) {
        keywords.push(text);
      }
    });

    return [...new Set(keywords)]; // Remove duplicates
  }
}

// Initialize the content extractor
new ContentExtractor();

// Also send a message to background when the page loads
// This helps with pages that are already open when the extension is installed
if (document.readyState === 'complete') {
  sendContentToBackground();
} else {
  window.addEventListener('load', sendContentToBackground);
}

function sendContentToBackground() {
  const extractor = new ContentExtractor();
  const content = (extractor as any).extractPageContent();
  
  browser.runtime.sendMessage({
    type: 'CONTENT_EXTRACTED',
    payload: content
  }).catch(error => {
    // Extension context might not be available
    console.log('Could not send content to background:', error);
  });
}