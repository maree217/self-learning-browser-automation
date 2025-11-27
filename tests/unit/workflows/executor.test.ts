/**
 * Unit tests for browser_execute_workflow
 * TDD: Write tests first for programmatic workflow execution
 */

import { executeWorkflow } from '../../../src/tools/workflows/executor';
import { browserManager } from '../../../src/browser-manager';
import { traceLogger } from '../../../src/trace-logger';

jest.mock('../../../src/browser-manager');
jest.mock('../../../src/trace-logger');

describe('browser_execute_workflow', () => {
  let mockPage: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPage = {
      url: jest.fn().mockReturnValue('https://example.com'),
      evaluate: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
      waitForSelector: jest.fn(),
      $$eval: jest.fn()
    };

    (browserManager.getActivePage as jest.Mock).mockResolvedValue(mockPage);
    (traceLogger.log as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Basic Workflow Execution', () => {
    it('should execute a simple workflow with steps', async () => {
      const workflow = {
        steps: [
          { action: 'click', selector: 'button.submit' },
          { action: 'wait', selector: '.result' }
        ]
      };

      mockPage.click.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockResolvedValue(undefined);

      const result = await executeWorkflow(
        { workflow },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.click).toHaveBeenCalledWith('button.submit');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.result', { timeout: 30000 });
    });

    it('should execute workflow steps in order', async () => {
      const executionOrder: string[] = [];

      mockPage.click.mockImplementation(async (selector: string) => {
        executionOrder.push(`click:${selector}`);
      });

      mockPage.type.mockImplementation(async (selector: string) => {
        executionOrder.push(`type:${selector}`);
      });

      const workflow = {
        steps: [
          { action: 'type', selector: '#email', value: 'test@example.com' },
          { action: 'click', selector: 'button[type="submit"]' }
        ]
      };

      await executeWorkflow({ workflow }, 'example.com');

      expect(executionOrder).toEqual([
        'type:#email',
        'click:button[type="submit"]'
      ]);
    });

    it('should return workflow results with execution metadata', async () => {
      mockPage.click.mockResolvedValue(undefined);

      const result = await executeWorkflow(
        { workflow: { steps: [{ action: 'click', selector: 'button' }] } },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.steps_executed).toBe(1);
      expect(result.data.total_steps).toBe(1);
      expect(result.duration_ms).toBeDefined();
    });
  });

  describe('Workflow Templates', () => {
    it('should execute infinite scroll template', async () => {
      // Mock scroll evaluations (10 scrolls)
      for (let i = 0; i < 10; i++) {
        mockPage.evaluate.mockResolvedValueOnce({ hasMore: i < 5, count: (i + 1) * 3 });
      }
      // Mock final items extraction
      mockPage.evaluate.mockResolvedValueOnce(['item1', 'item2', 'item3', 'item4', 'item5', 'item6']);

      const result = await executeWorkflow(
        {
          template: 'infinite_scroll',
          template_params: {
            item_selector: '.item',
            max_scrolls: 10
          }
        },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.items_collected).toBeGreaterThan(0);
      expect(result.data.scrolls_performed).toBeGreaterThan(0);
    });

    it('should execute form fill template', async () => {
      mockPage.type.mockResolvedValue(undefined);
      mockPage.click.mockResolvedValue(undefined);

      const result = await executeWorkflow(
        {
          template: 'form_fill',
          template_params: {
            fields: [
              { selector: '#name', value: 'John Doe' },
              { selector: '#email', value: 'john@example.com' }
            ],
            submit_selector: 'button[type="submit"]'
          }
        },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.type).toHaveBeenCalledWith('#name', 'John Doe');
      expect(mockPage.type).toHaveBeenCalledWith('#email', 'john@example.com');
      expect(mockPage.click).toHaveBeenCalledWith('button[type="submit"]');
    });

    it('should execute pagination template', async () => {
      mockPage.click.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockResolvedValue(undefined);

      // Sequence: extract page 0, check hasNext_0, extract page 1, check hasNext_1, extract page 2, check hasNext_2
      mockPage.evaluate.mockResolvedValueOnce(['item1', 'item2'])  // page 0 items
                       .mockResolvedValueOnce(true)                 // hasNext_0
                       .mockResolvedValueOnce(['item3', 'item4'])  // page 1 items
                       .mockResolvedValueOnce(true)                 // hasNext_1
                       .mockResolvedValueOnce(['item5'])           // page 2 items
                       .mockResolvedValueOnce(false);               // hasNext_2 (no more pages)

      const result = await executeWorkflow(
        {
          template: 'pagination',
          template_params: {
            item_selector: '.product',
            next_button: 'button.next',
            max_pages: 5
          }
        },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.pages_visited).toBe(3);
      expect(result.data.items_collected).toBe(5);
    });

    it('should execute wait_and_extract template', async () => {
      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue(['data1', 'data2']);

      const result = await executeWorkflow(
        {
          template: 'wait_and_extract',
          template_params: {
            wait_selector: '.loaded',
            extract_selector: '.data-item',
            timeout: 5000
          }
        },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.loaded', { timeout: 5000 });
      expect(result.data.items).toHaveLength(2);
    });
  });

  describe('Workflow Context and State', () => {
    it('should maintain state between workflow steps', async () => {
      mockPage.evaluate.mockResolvedValueOnce('initial_value')
                       .mockResolvedValueOnce('updated_value');

      const workflow = {
        steps: [
          { action: 'extract', selector: '#value', save_as: 'myValue' },
          { action: 'evaluate', code: 'console.log(context.myValue)' }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('success');
      expect(result.data.context).toBeDefined();
      expect(result.data.context.myValue).toBeDefined();
    });

    it('should support conditional steps based on context', async () => {
      mockPage.evaluate.mockResolvedValue(true);
      mockPage.click.mockResolvedValue(undefined);

      const workflow = {
        steps: [
          { action: 'evaluate', code: 'document.querySelector(".modal") !== null', save_as: 'hasModal' },
          { action: 'click', selector: '.close-modal', condition: 'context.hasModal === true' }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('success');
    });

    it('should pass context between template executions', async () => {
      mockPage.$$eval.mockResolvedValue(['item1', 'item2']);
      mockPage.type.mockResolvedValue(undefined);
      mockPage.click.mockResolvedValue(undefined);

      const workflow = {
        steps: [
          { template: 'wait_and_extract', params: { wait_selector: '.items', extract_selector: '.item' }, save_as: 'items' },
          { template: 'form_fill', params: { fields: [{ selector: '#count', value: 'context.items.length' }] } }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('success');
    });
  });

  describe('Tool Whitelisting and Sandboxing', () => {
    it('should only allow whitelisted tools in workflows', async () => {
      const workflow = {
        steps: [
          { tool: 'browser_click', params: { selector: 'button' } }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('success');
    });

    it('should reject non-whitelisted tools', async () => {
      const workflow = {
        steps: [
          { tool: 'dangerous_tool', params: {} }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error).toContain('not whitelisted');
    });

    it('should prevent access to dangerous JavaScript APIs', async () => {
      const workflow = {
        steps: [
          { action: 'evaluate', code: 'require("fs").readFileSync("/etc/passwd")' }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error).toContain('forbidden');
    });

    it('should sandbox workflow execution context', async () => {
      const workflow = {
        steps: [
          { action: 'evaluate', code: 'process.exit(1)' }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error).toContain('forbidden');
    });
  });

  describe('Error Handling', () => {
    it('should handle step execution errors gracefully', async () => {
      mockPage.click.mockRejectedValue(new Error('Element not found'));

      const workflow = {
        steps: [
          { action: 'click', selector: '.nonexistent' }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Element not found');
      expect(result.data.failed_step).toBe(0);
    });

    it('should support error recovery in workflows', async () => {
      mockPage.click.mockRejectedValueOnce(new Error('First attempt failed'))
                     .mockResolvedValueOnce(undefined);

      const workflow = {
        steps: [
          { action: 'click', selector: 'button', retry: 2 }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('success');
      expect(mockPage.click).toHaveBeenCalledTimes(2);
    });

    it('should stop workflow on critical errors', async () => {
      mockPage.click.mockResolvedValue(undefined);
      mockPage.type.mockRejectedValue(new Error('Critical error'));

      const workflow = {
        steps: [
          { action: 'click', selector: 'button' },
          { action: 'type', selector: 'input', value: 'text', critical: true },
          { action: 'click', selector: 'submit' }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.data.steps_executed).toBe(1); // Only first step
    });

    it('should handle browser manager errors', async () => {
      (browserManager.getActivePage as jest.Mock).mockRejectedValue(
        new Error('Browser not initialized')
      );

      const result = await executeWorkflow(
        { workflow: { steps: [] } },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Browser not initialized');
    });
  });

  describe('TraceLogger Integration', () => {
    it('should log successful workflow execution', async () => {
      mockPage.click.mockResolvedValue(undefined);

      const workflow = {
        name: 'test_workflow',
        steps: [{ action: 'click', selector: 'button' }]
      };

      await executeWorkflow({ workflow }, 'example.com');

      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_execute_workflow',
        expect.objectContaining({ workflow: expect.objectContaining({ name: 'test_workflow' }) }),
        'success',
        expect.any(Number),
        'https://example.com',
        'example.com'
      );
    });

    it('should log workflow errors', async () => {
      mockPage.click.mockRejectedValue(new Error('Workflow failed'));

      const result = await executeWorkflow(
        { workflow: { steps: [{ action: 'click', selector: 'button' }] } },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(traceLogger.log).toHaveBeenCalledWith(
        'browser_execute_workflow',
        expect.any(Object),
        'error',
        expect.any(Number),
        'https://example.com',
        'example.com',
        'Workflow failed'
      );
    });

    it('should measure workflow execution duration', async () => {
      mockPage.click.mockResolvedValue(undefined);

      const result = await executeWorkflow(
        { workflow: { steps: [{ action: 'click', selector: 'button' }] } },
        'example.com'
      );

      expect(result.duration_ms).toBeDefined();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should log each step execution for RL training', async () => {
      mockPage.click.mockResolvedValue(undefined);
      mockPage.type.mockResolvedValue(undefined);

      const workflow = {
        steps: [
          { action: 'click', selector: 'button' },
          { action: 'type', selector: 'input', value: 'text' }
        ]
      };

      await executeWorkflow({ workflow }, 'example.com');

      // Should log workflow start and completion
      expect(traceLogger.log).toHaveBeenCalled();
    });
  });

  describe('Workflow Validation', () => {
    it('should validate workflow structure', async () => {
      const result = await executeWorkflow(
        { workflow: {} as any },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid workflow');
    });

    it('should validate step parameters', async () => {
      const workflow = {
        steps: [
          { action: 'click' } // missing selector
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error).toContain('selector');
    });

    it('should validate template parameters', async () => {
      const result = await executeWorkflow(
        {
          template: 'infinite_scroll',
          template_params: {} // missing required params
        },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('requires');
    });
  });

  describe('Workflow Timeout Handling', () => {
    it('should timeout long-running workflows', async () => {
      mockPage.waitForSelector.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const workflow = {
        steps: [{ action: 'wait', selector: '.never-appears' }],
        timeout: 1000
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error).toContain('timeout');
    });

    it('should respect per-step timeouts', async () => {
      mockPage.click.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      const workflow = {
        steps: [
          { action: 'click', selector: 'button' },
          { action: 'wait', selector: '.result', timeout: 100 }
        ]
      };

      const result = await executeWorkflow({ workflow }, 'example.com');

      expect(result.status).toBe('error');
    });
  });

  describe('Default Parameters', () => {
    it('should use default timeout when not specified', async () => {
      mockPage.click.mockResolvedValue(undefined);

      const result = await executeWorkflow(
        { workflow: { steps: [{ action: 'click', selector: 'button' }] } },
        'example.com'
      );

      expect(result.status).toBe('success');
    });

    it('should handle empty workflow gracefully', async () => {
      const result = await executeWorkflow(
        { workflow: { steps: [] } },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.steps_executed).toBe(0);
    });
  });
});
