export class DOMAnalyzer {
  static analyzePage(): {
    isArticle: boolean;
    isVideo: boolean;
    isShopping: boolean;
    isForum: boolean;
    isDocumentation: boolean;
  } {
    return {
      isArticle: this.isArticlePage(),
      isVideo: this.isVideoPage(),
      isShopping: this.isShoppingPage(),
      isForum: this.isForumPage(),
      isDocumentation: this.isDocumentationPage()
    };
  }

  private static isArticlePage(): boolean {
    const articleElements = document.querySelectorAll(
      'article, [itemtype*="Article"], [itemtype*="BlogPosting"], [itemtype*="NewsArticle"]'
    );
    
    const hasPublishDate = !!document.querySelector(
      'time[datetime], [itemprop="datePublished"], .publish-date, .article-date'
    );
    
    const hasAuthor = !!document.querySelector(
      '[itemprop="author"], .author, .by-author, .article-author'
    );
    
    return articleElements.length > 0 || (hasPublishDate && hasAuthor);
  }

  private static isVideoPage(): boolean {
    const videoElements = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
    const hasVideoSchema = !!document.querySelector('[itemtype*="VideoObject"]');
    const isYouTube = window.location.hostname.includes('youtube.com');
    const isVimeo = window.location.hostname.includes('vimeo.com');
    
    return videoElements.length > 0 || hasVideoSchema || isYouTube || isVimeo;
  }

  private static isShoppingPage(): boolean {
    const priceElements = document.querySelectorAll(
      '[itemprop="price"], .price, .product-price, [class*="price"], [data-price]'
    );
    
    const addToCartButtons = document.querySelectorAll(
      'button[class*="cart"], button[class*="buy"], [class*="add-to-cart"], [id*="add-to-cart"]'
    );
    
    const hasProductSchema = !!document.querySelector('[itemtype*="Product"]');
    
    return priceElements.length > 2 || addToCartButtons.length > 0 || hasProductSchema;
  }

  private static isForumPage(): boolean {
    const forumIndicators = [
      '.forum', '.thread', '.topic', '.discussion',
      '[class*="forum"]', '[class*="thread"]', '[class*="topic"]',
      '[itemtype*="DiscussionForumPosting"]'
    ];
    
    const hasForumElements = forumIndicators.some(selector => 
      document.querySelector(selector) !== null
    );
    
    const hasMultiplePosts = document.querySelectorAll('.post, .comment, .reply').length > 5;
    
    return hasForumElements || hasMultiplePosts;
  }

  private static isDocumentationPage(): boolean {
    const docIndicators = [
      '.documentation', '.docs', '.api-reference',
      'code', 'pre', '.code-block', '.highlight'
    ];
    
    const codeElements = document.querySelectorAll('code, pre');
    const hasTableOfContents = !!document.querySelector('.toc, #toc, .table-of-contents, nav[aria-label*="contents"]');
    const hasAPIReference = document.body.textContent?.includes('API') && codeElements.length > 3;
    
    return codeElements.length > 5 || hasTableOfContents || hasAPIReference;
  }

  static extractStructuredData(): any {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const structuredData: any[] = [];
    
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        structuredData.push(data);
      } catch (e) {
        // Invalid JSON, skip
      }
    });
    
    return structuredData;
  }
}