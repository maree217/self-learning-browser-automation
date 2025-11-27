/**
 * Semantic Content Extraction Tool
 * AI-powered extraction of semantically meaningful content
 * Extracts articles, profiles, posts, products in AI-ready formats
 */

import { browserManager } from '../../browser-manager.js';
import { traceLogger } from '../../trace-logger.js';
import { ToolResult } from '../../types.js';

export interface ExtractSemanticParams {
  content_type: 'article' | 'profile' | 'post' | 'product' | 'auto';
  include_metadata?: boolean;
  format?: 'markdown' | 'json';
}

export interface ArticleContent {
  type: 'article';
  title?: string;
  author?: string;
  publishedDate?: string;
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    publishedDate?: string;
    tags?: string[];
    readingTime?: string;
  };
  related_links?: Array<{ text: string; url: string }>;
  images?: Array<{ src: string; alt?: string; caption?: string }>;
  detected?: boolean;
  confidence?: number;
}

export interface ProfileContent {
  type: 'profile';
  name?: string;
  headline?: string;
  location?: string;
  about?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    year: string;
  }>;
  skills?: string[];
  endorsements?: number;
  detected?: boolean;
}

export interface PostContent {
  type: 'post';
  author?: string;
  content: string;
  timestamp?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  detected?: boolean;
}

export interface ProductContent {
  type: 'product';
  name: string;
  price?: string;
  description?: string;
  specs?: Record<string, string>;
  rating?: number;
  reviews?: number;
  detected?: boolean;
}

export type SemanticContent = ArticleContent | ProfileContent | PostContent | ProductContent;

/**
 * Extract semantic content from page
 */
export async function extractSemantic(
  params: ExtractSemanticParams,
  domain: string
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const page = await browserManager.getActivePage(domain);
    const { content_type, include_metadata = true, format = 'markdown' } = params;

    // Validate content type
    const validTypes = ['article', 'profile', 'post', 'product', 'auto'];
    if (!validTypes.includes(content_type)) {
      throw new Error(`Unsupported content type: ${content_type}. Must be one of: ${validTypes.join(', ')}`);
    }

    let data: SemanticContent;

    if (content_type === 'auto') {
      // Auto-detect content type
      data = await detectAndExtractContent(page, include_metadata);
    } else {
      // Extract specific content type
      data = await extractContentByType(page, content_type, include_metadata, format);
    }

    const duration = Date.now() - startTime;
    const url = page.url();

    // Log to TraceLogger for RL
    await traceLogger.log(
      'browser_extract_semantic',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data,
      duration_ms: duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    try {
      const page = await browserManager.getActivePage(domain);
      await traceLogger.log(
        'browser_extract_semantic',
        params,
        'error',
        duration,
        page.url(),
        domain,
        errorMsg
      );
    } catch {
      await traceLogger.log(
        'browser_extract_semantic',
        params,
        'error',
        duration,
        'unknown',
        domain,
        errorMsg
      );
    }

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'semantic_extraction_error',
      duration_ms: duration
    };
  }
}

/**
 * Auto-detect and extract content
 */
async function detectAndExtractContent(page: any, includeMetadata: boolean): Promise<SemanticContent> {
  // @ts-ignore - Browser context
  return await page.evaluate((includeMetadata) => {
    // Detection heuristics
    const url = window.location.href;
    const hasArticleTag = !!document.querySelector('article');
    const hasH1 = !!document.querySelector('h1');
    const hasParagraphs = document.querySelectorAll('p').length > 3;

    // Detect LinkedIn profile
    if (url.includes('linkedin.com/in/')) {
      return detectProfileContent();
    }

    // Detect article
    if (hasArticleTag || (hasH1 && hasParagraphs)) {
      return detectArticleContent(includeMetadata);
    }

    // Detect social post
    if (url.includes('/posts/') || url.includes('/feed/')) {
      return detectPostContent();
    }

    // Default to article
    return detectArticleContent(includeMetadata);

    function detectArticleContent(includeMetadata: boolean): ArticleContent {
      const article = document.querySelector('article') || document.body;
      const h1 = document.querySelector('h1');
      const title = h1?.textContent?.trim() || document.title;

      // Extract main content
      const paragraphs = Array.from(article.querySelectorAll('p'));
      const content = paragraphs.map(p => p.textContent?.trim()).filter(Boolean).join('\n\n');

      // Extract author
      const authorMeta = document.querySelector('meta[name="author"]') as HTMLMetaElement;
      const author = authorMeta?.content ||
                    document.querySelector('[rel="author"]')?.textContent?.trim();

      // Extract date
      const dateMeta = document.querySelector('meta[property="article:published_time"]') as HTMLMetaElement;
      const publishedDate = dateMeta?.content ||
                           document.querySelector('time')?.getAttribute('datetime');

      // Extract images
      const images = Array.from(article.querySelectorAll('img')).map((img: any) => ({
        src: img.src,
        alt: img.alt,
        caption: img.nextElementSibling?.tagName === 'FIGCAPTION' ?
                img.nextElementSibling.textContent?.trim() : undefined
      }));

      // Extract related links
      const links = Array.from(article.querySelectorAll('a')).map((a: any) => ({
        text: a.textContent?.trim(),
        url: a.href
      })).slice(0, 10);

      const result: ArticleContent = {
        type: 'article',
        title,
        content,
        detected: true,
        confidence: 0.95
      };

      if (includeMetadata) {
        result.metadata = {
          title,
          author: author || undefined,
          publishedDate: publishedDate || undefined,
          tags: [],
          readingTime: Math.ceil(content.split(' ').length / 200) + ' min'
        };
        result.related_links = links;
        result.images = images;
      }

      return result;
    }

    function detectProfileContent(): ProfileContent {
      // LinkedIn profile extraction
      const name = document.querySelector('h1')?.textContent?.trim();
      const headline = document.querySelector('.text-body-medium')?.textContent?.trim();

      return {
        type: 'profile',
        name,
        headline,
        detected: true
      };
    }

    function detectPostContent(): PostContent {
      const content = document.querySelector('[data-test-id="post-text"]')?.textContent?.trim() ||
                     document.querySelector('.feed-shared-text')?.textContent?.trim() ||
                     '';

      return {
        type: 'post',
        content,
        detected: true
      };
    }
  }, includeMetadata);
}

/**
 * Extract content by specific type
 */
async function extractContentByType(
  page: any,
  contentType: string,
  includeMetadata: boolean,
  format: string
): Promise<SemanticContent> {
  // @ts-ignore - Browser context
  return await page.evaluate((contentType, includeMetadata, format) => {
    switch (contentType) {
      case 'article':
        return extractArticle(includeMetadata, format);
      case 'profile':
        return extractProfile();
      case 'post':
        return extractPost();
      case 'product':
        return extractProduct();
      default:
        throw new Error('Invalid content type');
    }

    function extractArticle(includeMetadata: boolean, format: string): ArticleContent {
      const article = document.querySelector('article') || document.body;
      const h1 = document.querySelector('h1');
      const title = h1?.textContent?.trim() || document.title;

      // Extract content
      const paragraphs = Array.from(article.querySelectorAll('p'));
      let content = '';

      if (format === 'markdown') {
        // Convert to markdown
        content = `# ${title}\n\n`;
        content += paragraphs.map(p => p.textContent?.trim()).filter(Boolean).join('\n\n');
      } else {
        content = paragraphs.map(p => p.textContent?.trim()).filter(Boolean).join('\n\n');
      }

      const result: ArticleContent = {
        type: 'article',
        title,
        content
      };

      if (includeMetadata) {
        const authorMeta = document.querySelector('meta[name="author"]') as HTMLMetaElement;
        const author = authorMeta?.content;

        const dateMeta = document.querySelector('meta[property="article:published_time"]') as HTMLMetaElement;
        const publishedDate = dateMeta?.content;

        const tagMeta = Array.from(document.querySelectorAll('meta[property="article:tag"]')) as HTMLMetaElement[];
        const tags = tagMeta.map(m => m.content);

        result.metadata = {
          title,
          author,
          publishedDate,
          tags,
          readingTime: Math.ceil(content.split(' ').length / 200) + ' min'
        };

        // Extract images
        result.images = Array.from(article.querySelectorAll('img')).map((img: any) => ({
          src: img.src,
          alt: img.alt,
          caption: img.nextElementSibling?.tagName === 'FIGCAPTION' ?
                  img.nextElementSibling.textContent?.trim() : undefined
        }));

        // Extract related links
        result.related_links = Array.from(article.querySelectorAll('a')).map((a: any) => ({
          text: a.textContent?.trim(),
          url: a.href
        })).slice(0, 10);
      }

      return result;
    }

    function extractProfile(): ProfileContent {
      // Generic profile extraction
      const name = document.querySelector('h1')?.textContent?.trim();
      const headline = document.querySelector('[class*="headline"]')?.textContent?.trim();
      const about = document.querySelector('[class*="about"]')?.textContent?.trim();
      const location = document.querySelector('[class*="location"]')?.textContent?.trim();

      // Extract experience
      const experienceElements = Array.from(document.querySelectorAll('[class*="experience"] li'));
      const experience = experienceElements.slice(0, 5).map((el: any) => ({
        title: el.querySelector('[class*="title"]')?.textContent?.trim() || '',
        company: el.querySelector('[class*="company"]')?.textContent?.trim() || '',
        duration: el.querySelector('[class*="duration"]')?.textContent?.trim() || ''
      }));

      // Extract education
      const educationElements = Array.from(document.querySelectorAll('[class*="education"] li'));
      const education = educationElements.slice(0, 3).map((el: any) => ({
        school: el.querySelector('[class*="school"]')?.textContent?.trim() || '',
        degree: el.querySelector('[class*="degree"]')?.textContent?.trim() || '',
        year: el.querySelector('[class*="year"]')?.textContent?.trim() || ''
      }));

      // Extract skills
      const skillElements = Array.from(document.querySelectorAll('[class*="skill"]'));
      const skills = skillElements.slice(0, 10).map((el: any) => el.textContent?.trim()).filter(Boolean);

      return {
        type: 'profile',
        name,
        headline,
        location,
        about,
        experience: experience.length > 0 ? experience : undefined,
        education: education.length > 0 ? education : undefined,
        skills: skills.length > 0 ? skills : undefined
      };
    }

    function extractPost(): PostContent {
      const author = document.querySelector('[class*="author"]')?.textContent?.trim();
      const content = document.querySelector('[class*="post-text"]')?.textContent?.trim() ||
                     document.querySelector('[class*="content"]')?.textContent?.trim() || '';
      const timestamp = document.querySelector('time')?.textContent?.trim();

      // Extract engagement
      const likesElement = document.querySelector('[aria-label*="like"]');
      const likes = likesElement ? parseInt(likesElement.textContent?.replace(/\D/g, '') || '0') : undefined;

      const commentsElement = document.querySelector('[aria-label*="comment"]');
      const comments = commentsElement ? parseInt(commentsElement.textContent?.replace(/\D/g, '') || '0') : undefined;

      const sharesElement = document.querySelector('[aria-label*="share"]');
      const shares = sharesElement ? parseInt(sharesElement.textContent?.replace(/\D/g, '') || '0') : undefined;

      return {
        type: 'post',
        author,
        content,
        timestamp,
        likes,
        comments,
        shares,
        engagement: (likes !== undefined || comments !== undefined) ? {
          likes: likes || 0,
          comments: comments || 0,
          shares: shares || 0
        } : undefined
      };
    }

    function extractProduct(): ProductContent {
      const name = document.querySelector('h1')?.textContent?.trim() ||
                  document.querySelector('[class*="product-name"]')?.textContent?.trim() || '';
      const price = document.querySelector('[class*="price"]')?.textContent?.trim();
      const description = document.querySelector('[class*="description"]')?.textContent?.trim();

      // Extract rating
      const ratingElement = document.querySelector('[class*="rating"]');
      const ratingText = ratingElement?.textContent?.trim() || '';
      const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '0');

      // Extract review count
      const reviewsElement = document.querySelector('[class*="review"]');
      const reviewsText = reviewsElement?.textContent?.trim() || '';
      const reviews = parseInt(reviewsText.replace(/\D/g, '') || '0');

      return {
        type: 'product',
        name,
        price,
        description,
        rating: rating > 0 ? rating : undefined,
        reviews: reviews > 0 ? reviews : undefined
      };
    }
  }, contentType, includeMetadata, format);
}
