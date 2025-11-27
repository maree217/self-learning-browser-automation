/**
 * Unit tests for browser_extract_semantic
 * TDD: Write tests first for semantic content extraction
 */

import { extractSemantic } from '../../../src/tools/extraction/semantic';
import { browserManager } from '../../../src/browser-manager';
import { traceLogger } from '../../../src/trace-logger';

jest.mock('../../../src/browser-manager');
jest.mock('../../../src/trace-logger');

describe('browser_extract_semantic', () => {
  let mockPage: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPage = {
      url: jest.fn().mockReturnValue('https://example.com/article'),
      evaluate: jest.fn(),
      title: jest.fn().mockResolvedValue('Article Title'),
      $eval: jest.fn()
    };

    (browserManager.getActivePage as jest.Mock).mockResolvedValue(mockPage);
    (traceLogger.log as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Article Extraction', () => {
    it('should extract article content with metadata', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'article',
        title: 'How to Build AI Systems',
        author: 'John Doe',
        publishedDate: '2025-01-15',
        content: '# Introduction\n\nThis is the article content...',
        tags: ['AI', 'Technology'],
        readingTime: '5 min'
      });

      const result = await extractSemantic(
        { content_type: 'article' },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.type).toBe('article');
      expect(result.data.title).toBe('How to Build AI Systems');
      expect(result.data.author).toBe('John Doe');
      expect(result.data.content).toContain('Introduction');
    });

    it('should extract article metadata', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'article',
        metadata: {
          title: 'Article Title',
          author: 'Jane Smith',
          publishedDate: '2025-01-15',
          tags: ['Tech', 'AI'],
          readingTime: '8 min'
        }
      });

      const result = await extractSemantic(
        { content_type: 'article', include_metadata: true },
        'example.com'
      );

      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata.author).toBe('Jane Smith');
      expect(result.data.metadata.tags).toContain('AI');
    });

    it('should extract related links from article', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'article',
        related_links: [
          { text: 'Related Article', url: '/related' }
        ]
      });

      const result = await extractSemantic(
        { content_type: 'article' },
        'example.com'
      );

      expect(result.data.related_links).toBeDefined();
      expect(result.data.related_links).toHaveLength(1);
    });

    it('should extract article images with captions', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'article',
        images: [
          {
            src: 'https://example.com/image.jpg',
            alt: 'Diagram',
            caption: 'Figure 1: Architecture'
          }
        ]
      });

      const result = await extractSemantic(
        { content_type: 'article' },
        'example.com'
      );

      expect(result.data.images).toBeDefined();
      expect(result.data.images[0].caption).toBe('Figure 1: Architecture');
    });
  });

  describe('Profile Extraction', () => {
    it('should extract LinkedIn profile data', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'profile',
        name: 'John Doe',
        headline: 'AI Engineer at TechCorp',
        location: 'San Francisco, CA',
        about: 'Passionate about AI and ML...',
        experience: [
          {
            title: 'Senior Engineer',
            company: 'TechCorp',
            duration: '2020-Present'
          }
        ],
        education: [
          {
            school: 'MIT',
            degree: 'BS Computer Science',
            year: '2018'
          }
        ]
      });

      const result = await extractSemantic(
        { content_type: 'profile' },
        'linkedin.com'
      );

      expect(result.data.type).toBe('profile');
      expect(result.data.name).toBe('John Doe');
      expect(result.data.experience).toHaveLength(1);
      expect(result.data.education).toHaveLength(1);
    });

    it('should extract profile skills and endorsements', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'profile',
        skills: ['Python', 'Machine Learning', 'AWS'],
        endorsements: 45
      });

      const result = await extractSemantic(
        { content_type: 'profile' },
        'linkedin.com'
      );

      expect(result.data.skills).toContain('Python');
      expect(result.data.endorsements).toBe(45);
    });
  });

  describe('Social Post Extraction', () => {
    it('should extract social media post', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'post',
        author: 'Jane Smith',
        content: 'Just launched our new AI product! 🚀',
        timestamp: '2 hours ago',
        likes: 142,
        comments: 23,
        shares: 8
      });

      const result = await extractSemantic(
        { content_type: 'post' },
        'linkedin.com'
      );

      expect(result.data.type).toBe('post');
      expect(result.data.content).toContain('AI product');
      expect(result.data.likes).toBe(142);
    });

    it('should extract post engagement metrics', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'post',
        engagement: {
          likes: 500,
          comments: 45,
          shares: 12,
          views: 5000
        }
      });

      const result = await extractSemantic(
        { content_type: 'post' },
        'linkedin.com'
      );

      expect(result.data.engagement).toBeDefined();
      expect(result.data.engagement.views).toBe(5000);
    });
  });

  describe('Product Page Extraction', () => {
    it('should extract product information', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'product',
        name: 'Laptop Pro 2025',
        price: '$1,299',
        description: 'High-performance laptop...',
        specs: {
          cpu: 'M3 Pro',
          ram: '16GB',
          storage: '512GB'
        },
        rating: 4.5,
        reviews: 234
      });

      const result = await extractSemantic(
        { content_type: 'product' },
        'example.com'
      );

      expect(result.data.type).toBe('product');
      expect(result.data.name).toBe('Laptop Pro 2025');
      expect(result.data.rating).toBe(4.5);
    });
  });

  describe('Auto Content Type Detection', () => {
    it('should auto-detect article content', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'article',
        detected: true,
        confidence: 0.95
      });

      const result = await extractSemantic(
        { content_type: 'auto' },
        'example.com'
      );

      expect(result.data.type).toBe('article');
      expect(result.data.detected).toBe(true);
    });

    it('should auto-detect profile content', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'profile',
        detected: true
      });

      const result = await extractSemantic(
        { content_type: 'auto' },
        'linkedin.com'
      );

      expect(result.data.type).toBe('profile');
    });
  });

  describe('Format Options', () => {
    it('should return markdown format by default', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'article',
        content: '# Heading\n\nContent here'
      });

      const result = await extractSemantic(
        { content_type: 'article' },
        'example.com'
      );

      expect(result.data.content).toContain('# Heading');
    });

    it('should return JSON format when specified', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'article',
        content: { sections: ['intro', 'body', 'conclusion'] }
      });

      const result = await extractSemantic(
        { content_type: 'article', format: 'json' },
        'example.com'
      );

      expect(result.data.content).toBeDefined();
    });
  });

  describe('TraceLogger Integration', () => {
    it('should log successful semantic extraction', async () => {
      mockPage.evaluate.mockResolvedValue({ type: 'article' });

      await extractSemantic(
        { content_type: 'article' },
        'example.com'
      );

      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_extract_semantic',
        expect.objectContaining({ content_type: 'article' }),
        'success',
        expect.any(Number),
        'https://example.com/article',
        'example.com'
      );
    });

    it('should log extraction errors', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Extraction failed'));

      const result = await extractSemantic(
        { content_type: 'article' },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_extract_semantic',
        expect.any(Object),
        'error',
        expect.any(Number),
        expect.any(String),
        'example.com',
        'Extraction failed'
      );
    });

    it('should measure extraction duration', async () => {
      mockPage.evaluate.mockResolvedValue({ type: 'article' });

      const result = await extractSemantic(
        { content_type: 'article' },
        'example.com'
      );

      expect(result.duration_ms).toBeDefined();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported content types', async () => {
      const result = await extractSemantic(
        { content_type: 'invalid' as any },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Unsupported content type');
    });

    it('should handle page evaluation errors', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Page error'));

      const result = await extractSemantic(
        { content_type: 'article' },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('semantic_extraction_error');
    });

    it('should handle browser manager errors', async () => {
      (browserManager.getActivePage as jest.Mock).mockRejectedValue(
        new Error('Browser not ready')
      );

      const result = await extractSemantic(
        { content_type: 'article' },
        'example.com'
      );

      expect(result.status).toBe('error');
    });
  });

  describe('Include Metadata Option', () => {
    it('should include metadata when requested', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'article',
        metadata: {
          author: 'John',
          date: '2025-01-15'
        }
      });

      const result = await extractSemantic(
        { content_type: 'article', include_metadata: true },
        'example.com'
      );

      expect(result.data.metadata).toBeDefined();
    });

    it('should exclude metadata when not requested', async () => {
      mockPage.evaluate.mockResolvedValue({
        type: 'article',
        content: 'Article content'
      });

      const result = await extractSemantic(
        { content_type: 'article', include_metadata: false },
        'example.com'
      );

      expect(result.data).toBeDefined();
    });
  });
});
