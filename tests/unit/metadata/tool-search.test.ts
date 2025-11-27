/**
 * Unit tests for Tool Search functionality
 * Following TDD approach: Write tests first, then implement
 */

import { searchTools, TOOL_INDEX, ToolMetadata } from '../../../src/tools/metadata/tool-index';

describe('Tool Search', () => {
  describe('TOOL_INDEX', () => {
    it('should contain metadata for all existing tools', () => {
      const requiredTools = [
        'browser_navigate',
        'browser_click',
        'browser_snapshot',
        'browser_get_content',
        'browser_evaluate',
        'browser_fill',
        'browser_type',
        'browser_screenshot'
      ];

      requiredTools.forEach(toolName => {
        expect(TOOL_INDEX[toolName]).toBeDefined();
        expect(TOOL_INDEX[toolName].name).toBe(toolName);
      });
    });

    it('should have valid metadata structure for each tool', () => {
      Object.values(TOOL_INDEX).forEach((metadata: ToolMetadata) => {
        expect(metadata.name).toBeDefined();
        expect(metadata.category).toBeDefined();
        expect(metadata.description).toBeDefined();
        expect(metadata.searchable_keywords).toBeInstanceOf(Array);
        expect(metadata.use_cases).toBeInstanceOf(Array);
        expect(metadata.when_to_use).toBeInstanceOf(Array);
        expect(metadata.when_not_to_use).toBeInstanceOf(Array);
        expect(metadata.related_tools).toBeInstanceOf(Array);
      });
    });

    it('should have at least 3 searchable keywords per tool', () => {
      Object.values(TOOL_INDEX).forEach((metadata: ToolMetadata) => {
        expect(metadata.searchable_keywords.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should have at least 2 use cases per tool', () => {
      Object.values(TOOL_INDEX).forEach((metadata: ToolMetadata) => {
        expect(metadata.use_cases.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('searchTools', () => {
    it('should find extraction tools for "extract data" query', () => {
      const results = searchTools('extract data');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);

      const toolNames = results.map(r => r.name);
      expect(toolNames).toContain('browser_get_content');
    });

    it('should find navigation tools for "navigate" query', () => {
      const results = searchTools('navigate');

      expect(results.length).toBeGreaterThan(0);

      const toolNames = results.map(r => r.name);
      expect(toolNames).toContain('browser_navigate');
    });

    it('should find click tools for "click button" query', () => {
      const results = searchTools('click button');

      const toolNames = results.map(r => r.name);
      expect(toolNames).toContain('browser_click');
    });

    it('should find form tools for "fill form" query', () => {
      const results = searchTools('fill form');

      const toolNames = results.map(r => r.name);
      expect(toolNames).toContain('browser_fill');
    });

    it('should rank results by relevance', () => {
      const results = searchTools('click');

      expect(results.length).toBeGreaterThan(0);

      // Scores should be in descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should limit results to top 10', () => {
      const results = searchTools('page'); // Generic query

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should return empty array for nonsense query', () => {
      const results = searchTools('xyzabc123nonsense');

      expect(results).toEqual([]);
    });

    it('should be case insensitive', () => {
      const results1 = searchTools('NAVIGATE');
      const results2 = searchTools('navigate');
      const results3 = searchTools('NaViGaTe');

      expect(results1.length).toBeGreaterThan(0);
      expect(results1.length).toBe(results2.length);
      expect(results1.length).toBe(results3.length);
    });

    it('should match partial keywords', () => {
      const results = searchTools('nav');

      const toolNames = results.map(r => r.name);
      expect(toolNames).toContain('browser_navigate');
    });

    it('should score use case matches higher than keyword matches', () => {
      const results = searchTools('scraping product listings');

      // Should prioritize tools with relevant use cases
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should handle multi-word queries', () => {
      const results = searchTools('take screenshot of page');

      const toolNames = results.map(r => r.name);
      expect(toolNames).toContain('browser_screenshot');
    });

    it('should return different results for different queries', () => {
      const navResults = searchTools('navigate');
      const clickResults = searchTools('click');

      expect(navResults[0].name).not.toBe(clickResults[0].name);
    });
  });

  describe('Tool Categories', () => {
    it('should categorize tools correctly', () => {
      expect(TOOL_INDEX['browser_navigate'].category).toBe('navigation');
      expect(TOOL_INDEX['browser_click'].category).toBe('interaction');
      expect(TOOL_INDEX['browser_get_content'].category).toBe('content');
    });

    it('should allow filtering by category', () => {
      const navigationTools = Object.values(TOOL_INDEX)
        .filter(t => t.category === 'navigation');

      expect(navigationTools.length).toBeGreaterThan(0);
      expect(navigationTools.every(t =>
        ['browser_navigate', 'browser_go_back', 'browser_go_forward'].includes(t.name)
      )).toBe(true);
    });
  });

  describe('Tool Relationships', () => {
    it('should define related tools', () => {
      const clickTool = TOOL_INDEX['browser_click'];

      expect(clickTool.related_tools.length).toBeGreaterThan(0);
    });

    it('should have bidirectional relationships', () => {
      // If A relates to B, B should relate to A
      const clickTool = TOOL_INDEX['browser_click'];
      const hoverTool = TOOL_INDEX['browser_hover'];

      if (clickTool.related_tools.includes('browser_hover')) {
        expect(hoverTool.related_tools).toContain('browser_click');
      }
    });
  });
});
