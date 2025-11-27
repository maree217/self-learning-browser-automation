/**
 * Pattern-Based Extraction Tool
 * Extract content using predefined patterns for common data types
 * Supports: social posts, job listings, products, news articles, user profiles
 */

import { browserManager } from '../../browser-manager.js';
import { traceLogger } from '../../trace-logger.js';
import { ToolResult } from '../../types.js';

export type PatternType = 'social_post' | 'job_listing' | 'product' | 'news_article' | 'user_profile' | 'custom';

export interface ExtractByPatternParams {
  pattern: PatternType;
  limit?: number;
  include_metadata?: boolean;
  filters?: Record<string, any>;
  scroll_to_load?: boolean;
  max_scrolls?: number;
  selectors?: CustomPatternSelectors;
}

export interface CustomPatternSelectors {
  container?: string;
  item?: string;
  fields?: Record<string, string>;
}

/**
 * Extract content by pattern
 */
export async function extractByPattern(
  params: ExtractByPatternParams,
  domain: string
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const page = await browserManager.getActivePage(domain);
    const {
      pattern,
      limit = 50,
      include_metadata = false,
      filters = {},
      scroll_to_load = false,
      max_scrolls = 3,
      selectors
    } = params;

    // Validate pattern
    const validPatterns: PatternType[] = ['social_post', 'job_listing', 'product', 'news_article', 'user_profile', 'custom'];
    if (!validPatterns.includes(pattern)) {
      throw new Error(`Unsupported pattern: ${pattern}. Must be one of: ${validPatterns.join(', ')}`);
    }

    // Validate custom pattern
    if (pattern === 'custom') {
      if (!selectors || !selectors.item) {
        throw new Error('Custom pattern requires selectors with at least an item selector');
      }
    }

    let extractedData: any[] = [];

    if (scroll_to_load) {
      // Extract with scrolling for lazy-loaded content
      extractedData = await extractWithScroll(
        page,
        pattern,
        include_metadata,
        max_scrolls,
        selectors
      );
    } else {
      // Single extraction
      extractedData = await extractPattern(
        page,
        pattern,
        include_metadata,
        selectors
      );
    }

    // Apply filters
    if (Object.keys(filters).length > 0) {
      extractedData = applyFilters(extractedData, filters);
    }

    // Apply limit
    extractedData = extractedData.slice(0, limit);

    const duration = Date.now() - startTime;
    const url = page.url();

    // Log to TraceLogger for RL
    await traceLogger.log(
      'browser_extract_by_pattern',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: formatExtractedData(pattern, extractedData),
      duration_ms: duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    try {
      const page = await browserManager.getActivePage(domain);
      await traceLogger.log(
        'browser_extract_by_pattern',
        params,
        'error',
        duration,
        page.url(),
        domain,
        errorMsg
      );
    } catch {
      await traceLogger.log(
        'browser_extract_by_pattern',
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
      error_type: 'pattern_extraction_error',
      duration_ms: duration
    };
  }
}

/**
 * Extract pattern from page
 */
async function extractPattern(
  page: any,
  pattern: PatternType,
  includeMetadata: boolean,
  customSelectors?: CustomPatternSelectors
): Promise<any[]> {
  // @ts-ignore - Browser context
  return await page.evaluate((pattern, includeMetadata, customSelectors) => {
    switch (pattern) {
      case 'social_post':
        return extractSocialPosts(includeMetadata);
      case 'job_listing':
        return extractJobListings(includeMetadata);
      case 'product':
        return extractProducts(includeMetadata);
      case 'news_article':
        return extractNewsArticles(includeMetadata);
      case 'user_profile':
        return extractUserProfiles(includeMetadata);
      case 'custom':
        return extractCustomPattern(customSelectors);
      default:
        return [];
    }

    function extractSocialPosts(includeMetadata: boolean): any[] {
      const posts: any[] = [];

      // LinkedIn post selectors
      const postElements = document.querySelectorAll('[data-urn*="urn:li:activity"], .feed-shared-update-v2, article.feed-shared-update-v2__content');

      postElements.forEach((post: any) => {
        try {
          const authorEl = post.querySelector('.update-components-actor__name, [data-test-link-to-profile-link]');
          const authorTitleEl = post.querySelector('.update-components-actor__description');
          const contentEl = post.querySelector('.feed-shared-text, .update-components-text');
          const timestampEl = post.querySelector('time, .update-components-actor__sub-description');
          const likesEl = post.querySelector('[aria-label*="reaction"], .social-details-social-counts__reactions-count');
          const commentsEl = post.querySelector('[aria-label*="comment"], .social-details-social-counts__comments');
          const sharesEl = post.querySelector('[aria-label*="repost"], .social-details-social-counts__reposts');

          const postData: any = {
            author: authorEl?.textContent?.trim() || '',
            content: contentEl?.textContent?.trim() || '',
            timestamp: timestampEl?.textContent?.trim() || '',
            url: (post.querySelector('a[href*="/posts/"]') as HTMLAnchorElement)?.href || ''
          };

          // Add author title if available (LinkedIn-specific)
          const authorTitle = authorTitleEl?.textContent?.trim();
          if (authorTitle) {
            postData.authorTitle = authorTitle;
          }

          // Extract engagement
          const likesText = likesEl?.textContent?.replace(/\D/g, '') || '0';
          const commentsText = commentsEl?.textContent?.replace(/\D/g, '') || '0';
          const sharesText = sharesEl?.textContent?.replace(/\D/g, '') || '0';

          postData.likes = parseInt(likesText) || 0;
          postData.comments = parseInt(commentsText) || 0;
          postData.shares = parseInt(sharesText) || 0;

          // Extract reactions breakdown (LinkedIn-specific)
          const reactionsEl = post.querySelectorAll('[data-test-reactions-icon-type]');
          if (reactionsEl.length > 0) {
            postData.reactions = {
              like: 0,
              celebrate: 0,
              support: 0,
              insightful: 0
            };
            reactionsEl.forEach((reaction: any) => {
              const type = reaction.getAttribute('data-test-reactions-icon-type')?.toLowerCase();
              if (type && postData.reactions[type] !== undefined) {
                postData.reactions[type]++;
              }
            });
          }

          if (includeMetadata) {
            postData.metadata = {
              engagement_rate: (postData.likes + postData.comments + postData.shares) / 1000,
              impressions: (postData.likes + postData.comments + postData.shares) * 10 // Estimate
            };
          }

          posts.push(postData);
        } catch (e) {
          // Skip malformed posts
        }
      });

      return posts;
    }

    function extractJobListings(includeMetadata: boolean): any[] {
      const jobs: any[] = [];

      // Job listing selectors (works for LinkedIn, Indeed, etc.)
      const jobElements = document.querySelectorAll('.job-card-container, .job-card, [data-job-id], .jobs-search__results-list li');

      jobElements.forEach((job: any) => {
        try {
          const titleEl = job.querySelector('.job-card-list__title, h3, .job-title');
          const companyEl = job.querySelector('.job-card-container__company-name, .company-name, [data-test-employer-name]');
          const locationEl = job.querySelector('.job-card-container__metadata-item, .job-location, [data-test-job-location]');
          const salaryEl = job.querySelector('.job-card-container__metadata-item--salary, .salary, [data-test-salary]');
          const descEl = job.querySelector('.job-card-list__description, .job-description');
          const postedEl = job.querySelector('.job-card-container__listed-time, .date');
          const urlEl = job.querySelector('a[href*="/jobs/"], a[href*="/view/"]') as HTMLAnchorElement;

          const jobData: any = {
            title: titleEl?.textContent?.trim() || '',
            company: companyEl?.textContent?.trim() || '',
            location: locationEl?.textContent?.trim() || '',
            url: urlEl?.href || ''
          };

          // Optional fields
          if (salaryEl) jobData.salary = salaryEl.textContent?.trim();
          if (descEl) jobData.description = descEl.textContent?.trim();
          if (postedEl) jobData.posted = postedEl.textContent?.trim();

          // Extract requirements (look for bullet points or lists)
          const requirementsEl = job.querySelectorAll('.job-card-list__requirements li, .requirements li');
          if (requirementsEl.length > 0) {
            jobData.requirements = Array.from(requirementsEl).map((r: any) => r.textContent?.trim());
          }

          // Extract qualifications
          const qualificationsEl = job.querySelectorAll('.qualifications li');
          if (qualificationsEl.length > 0) {
            jobData.qualifications = Array.from(qualificationsEl).map((q: any) => q.textContent?.trim());
          }

          // LinkedIn-specific fields
          const applicantsEl = job.querySelector('[data-test-applicant-count]');
          if (applicantsEl) {
            const applicantsText = applicantsEl.textContent?.replace(/\D/g, '') || '0';
            jobData.applicants = parseInt(applicantsText);
          }

          const easyApplyEl = job.querySelector('[data-test-easy-apply-button]');
          jobData.easyApply = !!easyApplyEl;

          const remoteEl = job.querySelector('[data-test-remote-label]');
          jobData.remote = !!remoteEl || jobData.location?.toLowerCase().includes('remote');

          jobs.push(jobData);
        } catch (e) {
          // Skip malformed jobs
        }
      });

      return jobs;
    }

    function extractProducts(includeMetadata: boolean): any[] {
      const products: any[] = [];

      // Product selectors (works for Amazon, Shopify, etc.)
      const productElements = document.querySelectorAll('[data-component-type="s-search-result"], .product-card, .product-item, [data-product-id]');

      productElements.forEach((product: any) => {
        try {
          const nameEl = product.querySelector('h2, .product-title, [data-test-product-name]');
          const priceEl = product.querySelector('.a-price-whole, .price, [data-test-product-price]');
          const currencyEl = product.querySelector('.a-price-symbol, .currency');
          const ratingEl = product.querySelector('[aria-label*="star"], .rating, .stars');
          const reviewsEl = product.querySelector('[aria-label*="rating"], .reviews-count');
          const availabilityEl = product.querySelector('.availability, [data-test-availability]');
          const imageEl = product.querySelector('img') as HTMLImageElement;
          const urlEl = product.querySelector('a[href]') as HTMLAnchorElement;

          const productData: any = {
            name: nameEl?.textContent?.trim() || '',
            price: priceEl?.textContent?.trim() || '',
            url: urlEl?.href || ''
          };

          // Optional fields
          if (currencyEl) productData.currency = currencyEl.textContent?.trim();
          if (availabilityEl) productData.availability = availabilityEl.textContent?.trim();
          if (imageEl) productData.image = imageEl.src;

          // Extract rating
          if (ratingEl) {
            const ratingText = ratingEl.getAttribute('aria-label') || ratingEl.textContent || '';
            const ratingMatch = ratingText.match(/[\d.]+/);
            if (ratingMatch) {
              productData.rating = parseFloat(ratingMatch[0]);
            }
          }

          // Extract review count
          if (reviewsEl) {
            const reviewsText = reviewsEl.textContent?.replace(/\D/g, '') || '0';
            productData.reviews = parseInt(reviewsText);
          }

          // Extract specs (look for technical specifications)
          const specsEl = product.querySelectorAll('.product-specs dt, .product-specs dd');
          if (specsEl.length > 0) {
            productData.specs = {};
            for (let i = 0; i < specsEl.length; i += 2) {
              const key = specsEl[i]?.textContent?.trim().replace(':', '').toLowerCase();
              const value = specsEl[i + 1]?.textContent?.trim();
              if (key && value) {
                productData.specs[key] = value;
              }
            }
          }

          products.push(productData);
        } catch (e) {
          // Skip malformed products
        }
      });

      return products;
    }

    function extractNewsArticles(includeMetadata: boolean): any[] {
      const articles: any[] = [];

      // News article selectors
      const articleElements = document.querySelectorAll('article, .article-card, .news-item, [data-article-id]');

      articleElements.forEach((article: any) => {
        try {
          const headlineEl = article.querySelector('h1, h2, h3, .headline, .article-title');
          const authorEl = article.querySelector('[rel="author"], .author, .byline');
          const publishedEl = article.querySelector('time, .published-date, [data-publish-date]');
          const categoryEl = article.querySelector('.category, .tag, .section');
          const summaryEl = article.querySelector('.summary, .excerpt, .description');
          const urlEl = article.querySelector('a[href]') as HTMLAnchorElement;

          const articleData: any = {
            headline: headlineEl?.textContent?.trim() || '',
            url: urlEl?.href || ''
          };

          // Optional fields
          if (authorEl) articleData.author = authorEl.textContent?.trim();
          if (publishedEl) {
            articleData.published = publishedEl.getAttribute('datetime') || publishedEl.textContent?.trim();
          }
          if (categoryEl) articleData.category = categoryEl.textContent?.trim();
          if (summaryEl) articleData.summary = summaryEl.textContent?.trim();

          articles.push(articleData);
        } catch (e) {
          // Skip malformed articles
        }
      });

      return articles;
    }

    function extractUserProfiles(includeMetadata: boolean): any[] {
      const profiles: any[] = [];

      // User profile selectors (LinkedIn, Twitter, etc.)
      const profileElements = document.querySelectorAll('.entity-result, .profile-card, [data-control-name="search_srp_result"]');

      profileElements.forEach((profile: any) => {
        try {
          const nameEl = profile.querySelector('.entity-result__title-text, .profile-name, h3');
          const titleEl = profile.querySelector('.entity-result__primary-subtitle, .profile-title');
          const companyEl = profile.querySelector('.entity-result__secondary-subtitle, .profile-company');
          const locationEl = profile.querySelector('.entity-result__location, .profile-location');
          const connectionsEl = profile.querySelector('[aria-label*="connection"], .connections-count');
          const avatarEl = profile.querySelector('img') as HTMLImageElement;
          const urlEl = profile.querySelector('a[href*="/in/"]') as HTMLAnchorElement;

          const profileData: any = {
            name: nameEl?.textContent?.trim() || '',
            url: urlEl?.href || ''
          };

          // Optional fields
          if (titleEl) profileData.title = titleEl.textContent?.trim();
          if (companyEl) profileData.company = companyEl.textContent?.trim();
          if (locationEl) profileData.location = locationEl.textContent?.trim();
          if (avatarEl) profileData.avatar = avatarEl.src;

          // Extract connections count
          if (connectionsEl) {
            const connectionsText = connectionsEl.textContent?.replace(/\D/g, '') || '0';
            profileData.connections = parseInt(connectionsText);
          }

          profiles.push(profileData);
        } catch (e) {
          // Skip malformed profiles
        }
      });

      return profiles;
    }

    function extractCustomPattern(selectors: any): any[] {
      if (!selectors || !selectors.item) return [];

      const items: any[] = [];
      const itemElements = document.querySelectorAll(selectors.item);

      itemElements.forEach((item: any) => {
        try {
          const itemData: any = {};

          if (selectors.fields) {
            for (const [key, selector] of Object.entries(selectors.fields)) {
              const el = item.querySelector(selector as string);
              if (el) {
                itemData[key] = el.textContent?.trim();
              }
            }
          }

          items.push(itemData);
        } catch (e) {
          // Skip malformed items
        }
      });

      return items;
    }
  }, pattern, includeMetadata, customSelectors);
}

/**
 * Extract pattern with scrolling for lazy-loaded content
 */
async function extractWithScroll(
  page: any,
  pattern: PatternType,
  includeMetadata: boolean,
  maxScrolls: number,
  customSelectors?: CustomPatternSelectors
): Promise<any[]> {
  let allData: any[] = [];
  let previousCount = 0;

  for (let i = 0; i < maxScrolls; i++) {
    // Extract current data
    const currentData = await extractPattern(page, pattern, includeMetadata, customSelectors);

    // Merge with existing (deduplicate by URL or content)
    const newData = currentData.filter(item =>
      !allData.some(existing =>
        existing.url === item.url || existing.content === item.content
      )
    );

    allData = [...allData, ...newData];

    // Check if we got new items
    if (allData.length === previousCount) {
      // No new items, stop scrolling
      break;
    }

    previousCount = allData.length;

    // Scroll down
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allData;
}

/**
 * Apply filters to extracted data
 */
function applyFilters(data: any[], filters: Record<string, any>): any[] {
  return data.filter(item => {
    for (const [key, value] of Object.entries(filters)) {
      if (key.endsWith('_contains')) {
        const field = key.replace('_contains', '');
        if (!item[field] || !item[field].toLowerCase().includes(value.toLowerCase())) {
          return false;
        }
      } else if (key.endsWith('_equals')) {
        const field = key.replace('_equals', '');
        if (item[field] !== value) {
          return false;
        }
      }
    }
    return true;
  });
}

/**
 * Format extracted data based on pattern type
 */
function formatExtractedData(pattern: PatternType, data: any[]): any {
  switch (pattern) {
    case 'social_post':
      return { posts: data };
    case 'job_listing':
      return { jobs: data };
    case 'product':
      return { products: data };
    case 'news_article':
      return { articles: data };
    case 'user_profile':
      return { profiles: data };
    case 'custom':
      return { items: data };
    default:
      return { data };
  }
}
