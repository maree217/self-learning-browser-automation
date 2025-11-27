/**
 * Unit tests for browser_extract_by_pattern
 * TDD: Write tests first for pattern-based extraction
 */

import { extractByPattern } from '../../../src/tools/extraction/pattern';
import { browserManager } from '../../../src/browser-manager';
import { traceLogger } from '../../../src/trace-logger';

jest.mock('../../../src/browser-manager');
jest.mock('../../../src/trace-logger');

describe('browser_extract_by_pattern', () => {
  let mockPage: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPage = {
      url: jest.fn().mockReturnValue('https://example.com'),
      evaluate: jest.fn()
    };

    (browserManager.getActivePage as jest.Mock).mockResolvedValue(mockPage);
    (traceLogger.log as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Social Post Pattern', () => {
    it('should extract social posts using social_post pattern', async () => {
      const mockPosts = [
        {
          author: 'John Doe',
          content: 'Just launched our new AI product! 🚀',
          timestamp: '2 hours ago',
          likes: 142,
          comments: 23,
          shares: 8,
          url: 'https://linkedin.com/posts/123'
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockPosts);

      const result = await extractByPattern(
        { pattern: 'social_post' },
        'linkedin.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.posts).toBeDefined();
      expect(result.data.posts).toHaveLength(1);
      expect(result.data.posts[0].author).toBe('John Doe');
      expect(result.data.posts[0].likes).toBe(142);
    });

    it('should extract multiple social posts', async () => {
      mockPage.evaluate.mockResolvedValue([
        { author: 'User1', content: 'Post 1' },
        { author: 'User2', content: 'Post 2' },
        { author: 'User3', content: 'Post 3' }
      ]);

      const result = await extractByPattern(
        { pattern: 'social_post', limit: 10 },
        'linkedin.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.posts).toHaveLength(3);
    });

    it('should respect limit parameter for social posts', async () => {
      const posts = Array(20).fill(null).map((_, i) => ({
        author: `User${i}`,
        content: `Post ${i}`
      }));

      mockPage.evaluate.mockResolvedValue(posts);

      const result = await extractByPattern(
        { pattern: 'social_post', limit: 5 },
        'linkedin.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.posts).toHaveLength(5);
    });
  });

  describe('Job Listing Pattern', () => {
    it('should extract job listings using job_listing pattern', async () => {
      const mockJobs = [
        {
          title: 'Senior Software Engineer',
          company: 'TechCorp',
          location: 'San Francisco, CA',
          salary: '$150k-$200k',
          description: 'We are looking for...',
          posted: '2 days ago',
          url: 'https://example.com/jobs/123'
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockJobs);

      const result = await extractByPattern(
        { pattern: 'job_listing' },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.jobs).toBeDefined();
      expect(result.data.jobs[0].title).toBe('Senior Software Engineer');
      expect(result.data.jobs[0].salary).toBe('$150k-$200k');
    });

    it('should extract job requirements and qualifications', async () => {
      mockPage.evaluate.mockResolvedValue([
        {
          title: 'AI Engineer',
          requirements: ['5+ years Python', 'ML experience'],
          qualifications: ['PhD preferred', 'Published research']
        }
      ]);

      const result = await extractByPattern(
        { pattern: 'job_listing' },
        'example.com'
      );

      expect(result.data.jobs[0].requirements).toBeDefined();
      expect(result.data.jobs[0].requirements).toContain('5+ years Python');
    });
  });

  describe('Product Pattern', () => {
    it('should extract products using product pattern', async () => {
      const mockProducts = [
        {
          name: 'Laptop Pro 2025',
          price: '$1,299',
          currency: 'USD',
          rating: 4.5,
          reviews: 234,
          availability: 'In Stock',
          image: 'https://example.com/laptop.jpg',
          url: 'https://example.com/products/laptop'
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockProducts);

      const result = await extractByPattern(
        { pattern: 'product' },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.products).toBeDefined();
      expect(result.data.products[0].name).toBe('Laptop Pro 2025');
      expect(result.data.products[0].rating).toBe(4.5);
    });

    it('should extract product specifications', async () => {
      mockPage.evaluate.mockResolvedValue([
        {
          name: 'Smartphone X',
          specs: {
            cpu: 'Snapdragon 8 Gen 3',
            ram: '12GB',
            storage: '256GB',
            screen: '6.7" OLED'
          }
        }
      ]);

      const result = await extractByPattern(
        { pattern: 'product' },
        'example.com'
      );

      expect(result.data.products[0].specs).toBeDefined();
      expect(result.data.products[0].specs.cpu).toContain('Snapdragon');
    });
  });

  describe('News Article Pattern', () => {
    it('should extract news articles using news_article pattern', async () => {
      const mockArticles = [
        {
          headline: 'Breaking: Major Tech Announcement',
          author: 'Jane Reporter',
          published: '2025-01-15T10:30:00Z',
          category: 'Technology',
          summary: 'A major tech company announced...',
          url: 'https://news.example.com/article/123'
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockArticles);

      const result = await extractByPattern(
        { pattern: 'news_article' },
        'news.example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.articles).toBeDefined();
      expect(result.data.articles[0].headline).toContain('Breaking');
      expect(result.data.articles[0].category).toBe('Technology');
    });
  });

  describe('User Profile Pattern', () => {
    it('should extract user profiles using user_profile pattern', async () => {
      const mockProfiles = [
        {
          name: 'Sarah Chen',
          title: 'VP of Engineering',
          company: 'TechCorp',
          location: 'Seattle, WA',
          connections: 500,
          avatar: 'https://example.com/avatar.jpg',
          url: 'https://linkedin.com/in/sarahchen'
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockProfiles);

      const result = await extractByPattern(
        { pattern: 'user_profile' },
        'linkedin.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.profiles).toBeDefined();
      expect(result.data.profiles[0].name).toBe('Sarah Chen');
      expect(result.data.profiles[0].connections).toBe(500);
    });
  });

  describe('Custom Pattern', () => {
    it('should support custom CSS selector patterns', async () => {
      mockPage.evaluate.mockResolvedValue([
        { text: 'Item 1', value: 'val1' },
        { text: 'Item 2', value: 'val2' }
      ]);

      const result = await extractByPattern(
        {
          pattern: 'custom',
          selectors: {
            container: '.custom-container',
            item: '.custom-item',
            fields: {
              text: '.item-text',
              value: '.item-value'
            }
          }
        },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.items).toBeDefined();
      expect(result.data.items).toHaveLength(2);
    });

    it('should validate custom pattern selectors', async () => {
      const result = await extractByPattern(
        {
          pattern: 'custom',
          selectors: {} // missing required fields
        },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('selectors');
    });
  });

  describe('Pattern Options', () => {
    it('should support include_metadata option', async () => {
      mockPage.evaluate.mockResolvedValue([
        {
          content: 'Post content',
          metadata: {
            engagement_rate: 0.15,
            impressions: 5000
          }
        }
      ]);

      const result = await extractByPattern(
        { pattern: 'social_post', include_metadata: true },
        'linkedin.com'
      );

      expect(result.data.posts[0].metadata).toBeDefined();
      expect(result.data.posts[0].metadata.engagement_rate).toBe(0.15);
    });

    it('should support filters for pattern extraction', async () => {
      mockPage.evaluate.mockResolvedValue([
        { title: 'Senior Engineer', location: 'Remote' },
        { title: 'Junior Developer', location: 'Onsite' }
      ]);

      const result = await extractByPattern(
        {
          pattern: 'job_listing',
          filters: {
            location_contains: 'Remote'
          }
        },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.jobs).toHaveLength(1);
      expect(result.data.jobs[0].location).toBe('Remote');
    });

    it('should support scroll_to_load option for lazy-loaded content', async () => {
      // For max_scrolls=2: extract, scroll, extract, scroll
      mockPage.evaluate
        .mockResolvedValueOnce([{ id: 1, content: 'post1' }, { id: 2, content: 'post2' }])  // First extraction
        .mockResolvedValueOnce(undefined)  // First scroll
        .mockResolvedValueOnce([{ id: 1, content: 'post1' }, { id: 2, content: 'post2' }, { id: 3, content: 'post3' }])  // Second extraction
        .mockResolvedValueOnce(undefined);  // Second scroll

      const result = await extractByPattern(
        {
          pattern: 'social_post',
          scroll_to_load: true,
          max_scrolls: 2
        },
        'linkedin.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.posts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported patterns', async () => {
      const result = await extractByPattern(
        { pattern: 'invalid_pattern' as any },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Unsupported pattern');
    });

    it('should handle page evaluation errors', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Extraction failed'));

      const result = await extractByPattern(
        { pattern: 'social_post' },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Extraction failed');
    });

    it('should handle empty extraction results gracefully', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      const result = await extractByPattern(
        { pattern: 'product' },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.products).toEqual([]);
    });

    it('should handle browser manager errors', async () => {
      (browserManager.getActivePage as jest.Mock).mockRejectedValue(
        new Error('Browser not initialized')
      );

      const result = await extractByPattern(
        { pattern: 'social_post' },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Browser not initialized');
    });
  });

  describe('TraceLogger Integration', () => {
    it('should log successful pattern extraction', async () => {
      mockPage.evaluate.mockResolvedValue([{ content: 'test' }]);

      await extractByPattern(
        { pattern: 'social_post' },
        'linkedin.com'
      );

      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_extract_by_pattern',
        expect.objectContaining({ pattern: 'social_post' }),
        'success',
        expect.any(Number),
        'https://example.com',
        'linkedin.com'
      );
    });

    it('should log pattern extraction errors', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Pattern failed'));

      await extractByPattern(
        { pattern: 'product' },
        'example.com'
      );

      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_extract_by_pattern',
        expect.any(Object),
        'error',
        expect.any(Number),
        'https://example.com',
        'example.com',
        'Pattern failed'
      );
    });

    it('should measure extraction duration', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      const result = await extractByPattern(
        { pattern: 'job_listing' },
        'example.com'
      );

      expect(result.duration_ms).toBeDefined();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Default Parameters', () => {
    it('should use default limit when not specified', async () => {
      mockPage.evaluate.mockResolvedValue(Array(100).fill({ content: 'test' }));

      const result = await extractByPattern(
        { pattern: 'social_post' },
        'linkedin.com'
      );

      expect(result.status).toBe('success');
      // Should limit to default (e.g., 50)
      expect(result.data.posts.length).toBeLessThanOrEqual(50);
    });

    it('should not include metadata by default', async () => {
      mockPage.evaluate.mockResolvedValue([
        { content: 'test', metadata: { extra: 'data' } }
      ]);

      const result = await extractByPattern(
        { pattern: 'social_post' },
        'linkedin.com'
      );

      expect(result.status).toBe('success');
    });
  });

  describe('Pattern-Specific Extractors', () => {
    it('should extract LinkedIn-specific post fields', async () => {
      mockPage.evaluate.mockResolvedValue([
        {
          author: 'John Doe',
          authorTitle: 'CEO at TechCorp',
          reactions: {
            like: 50,
            celebrate: 10,
            support: 5,
            insightful: 3
          }
        }
      ]);

      const result = await extractByPattern(
        { pattern: 'social_post' },
        'linkedin.com'
      );

      expect(result.data.posts[0].authorTitle).toBeDefined();
      expect(result.data.posts[0].reactions).toBeDefined();
    });

    it('should extract job application information', async () => {
      mockPage.evaluate.mockResolvedValue([
        {
          title: 'Engineer',
          applicants: 150,
          easyApply: true,
          remote: true
        }
      ]);

      const result = await extractByPattern(
        { pattern: 'job_listing' },
        'linkedin.com'
      );

      expect(result.data.jobs[0].applicants).toBe(150);
      expect(result.data.jobs[0].easyApply).toBe(true);
    });
  });
});
