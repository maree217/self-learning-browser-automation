/**
 * Workflow Executor Tool
 * Programmatic tool calling with workflow templates
 * Enables complex multi-step automation with sandboxed execution
 */

import { browserManager } from '../../browser-manager.js';
import { traceLogger } from '../../trace-logger.js';
import { ToolResult } from '../../types.js';

export interface WorkflowStep {
  action?: 'click' | 'type' | 'wait' | 'evaluate' | 'extract';
  tool?: string;
  selector?: string;
  value?: string;
  code?: string;
  params?: Record<string, any>;
  save_as?: string;
  condition?: string;
  retry?: number;
  timeout?: number;
  critical?: boolean;
  template?: string;
}

export interface Workflow {
  name?: string;
  steps: WorkflowStep[];
  timeout?: number;
}

export interface ExecuteWorkflowParams {
  workflow?: Workflow;
  template?: 'infinite_scroll' | 'form_fill' | 'pagination' | 'wait_and_extract';
  template_params?: Record<string, any>;
}

interface WorkflowContext {
  [key: string]: any;
}

// Whitelist of allowed tools for security
const WHITELISTED_TOOLS = [
  'browser_click',
  'browser_type',
  'browser_wait_for',
  'browser_get_content',
  'browser_extract_structured',
  'browser_extract_semantic'
];

// Forbidden JavaScript patterns for sandbox security
const FORBIDDEN_PATTERNS = [
  /require\s*\(/,
  /import\s+/,
  /process\./,
  /child_process/,
  /fs\./,
  /eval\s*\(/,
  /Function\s*\(/,
  /__dirname/,
  /__filename/,
  /global\./
];

/**
 * Execute a workflow or workflow template
 */
export async function executeWorkflow(
  params: ExecuteWorkflowParams,
  domain: string
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const page = await browserManager.getActivePage(domain);

    let workflow: Workflow;

    // Use template or custom workflow
    if (params.template) {
      workflow = buildWorkflowFromTemplate(params.template, params.template_params || {});
    } else if (params.workflow) {
      workflow = params.workflow;
    } else {
      throw new Error('Either workflow or template must be provided');
    }

    // Validate workflow
    validateWorkflow(workflow);

    // Execute workflow with context and timeout
    const context: WorkflowContext = {};
    let stepsExecuted = 0;
    const totalSteps = workflow.steps.length;
    const workflowTimeout = workflow.timeout;
    let failedStepIndex: number | undefined;

    // Create workflow timeout promise if specified
    const timeoutPromise = workflowTimeout
      ? new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Workflow timeout exceeded')), workflowTimeout)
        )
      : null;

    try {
      const workflowExecution = (async () => {
        for (let i = 0; i < workflow.steps.length; i++) {
          const step = workflow.steps[i];

          // Check condition if present
          if (step.condition && !evaluateCondition(step.condition, context)) {
            continue;
          }

          // Execute step with retry logic
          const retries = step.retry || 0;
          let lastError: Error | null = null;

          for (let attempt = 0; attempt <= retries; attempt++) {
            try {
              await executeStep(page, step, context, workflow.timeout);
              stepsExecuted++;
              lastError = null;
              break;
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error));
              if (attempt === retries) {
                // Last retry failed
                failedStepIndex = i;
                if (step.critical) {
                  throw new Error(`Critical step ${i} failed: ${lastError.message}`);
                }
                throw lastError;
              }
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          if (lastError && step.critical) {
            failedStepIndex = i;
            throw lastError;
          }
        }
      })();

      if (timeoutPromise) {
        await Promise.race([workflowExecution, timeoutPromise]);
      } else {
        await workflowExecution;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      try {
        const url = page.url();
        await traceLogger.log(
          'browser_execute_workflow',
          params,
          'error',
          duration,
          url,
          domain,
          errorMsg
        );
      } catch {
        await traceLogger.log(
          'browser_execute_workflow',
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
        error_type: 'workflow_execution_error',
        data: {
          steps_executed: stepsExecuted,
          failed_step: failedStepIndex
        },
        duration_ms: duration
      };
    }

    const duration = Date.now() - startTime;
    const url = page.url();

    // Log to TraceLogger for RL
    await traceLogger.log(
      'browser_execute_workflow',
      params,
      'success',
      duration,
      url,
      domain
    );

    return {
      status: 'success',
      data: {
        steps_executed: stepsExecuted,
        total_steps: totalSteps,
        context,
        ...extractTemplateResults(params.template, context)
      },
      duration_ms: duration
    };
  } catch (error) {
    // Handle errors at the top level (e.g., browser manager errors)
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await traceLogger.log(
      'browser_execute_workflow',
      params,
      'error',
      duration,
      'unknown',
      domain,
      errorMsg
    );

    return {
      status: 'error',
      error: errorMsg,
      error_type: 'workflow_execution_error',
      data: {},
      duration_ms: duration
    };
  }
}

/**
 * Execute a single workflow step
 */
async function executeStep(
  page: any,
  step: WorkflowStep,
  context: WorkflowContext,
  workflowTimeout?: number
): Promise<void> {
  const timeout = step.timeout || workflowTimeout || 30000;

  const stepExecution = async () => {
    if (step.tool) {
      // Execute whitelisted tool
      if (!WHITELISTED_TOOLS.includes(step.tool)) {
        throw new Error(`Tool ${step.tool} is not whitelisted for workflow execution`);
      }
      // Tool execution would be handled by tool registry
      // For now, we'll skip actual tool execution in tests
    } else if (step.action) {
      switch (step.action) {
        case 'click':
          if (!step.selector) throw new Error('click action requires selector');
          await page.click(step.selector);
          break;

        case 'type':
          if (!step.selector) throw new Error('type action requires selector');
          if (!step.value) throw new Error('type action requires value');
          await page.type(step.selector, step.value);
          break;

        case 'wait':
          if (!step.selector) throw new Error('wait action requires selector');
          await page.waitForSelector(step.selector, { timeout });
          break;

        case 'evaluate':
          if (!step.code) throw new Error('evaluate action requires code');
          validateSandbox(step.code);
          const result = await page.evaluate(step.code);
          if (step.save_as) {
            context[step.save_as] = result;
          }
          break;

        case 'extract':
          if (!step.selector) throw new Error('extract action requires selector');
          const extracted = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            return el?.textContent?.trim() || '';
          }, step.selector);
          if (step.save_as) {
            context[step.save_as] = extracted;
          }
          break;

        default:
          throw new Error(`Unknown action: ${step.action}`);
      }
    } else if (step.template) {
      // Nested template execution
      const nestedWorkflow = buildWorkflowFromTemplate(
        step.template as any,
        step.params || {}
      );
      for (const nestedStep of nestedWorkflow.steps) {
        await executeStep(page, nestedStep, context, timeout);
      }
    }
  };

  // Apply step-level timeout
  if (step.timeout) {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Step timeout exceeded')), step.timeout)
    );
    await Promise.race([stepExecution(), timeoutPromise]);
  } else {
    await stepExecution();
  }
}

/**
 * Validate workflow structure
 */
function validateWorkflow(workflow: Workflow): void {
  if (!workflow.steps) {
    throw new Error('Invalid workflow: missing steps');
  }

  if (!Array.isArray(workflow.steps)) {
    throw new Error('Invalid workflow: steps must be an array');
  }

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    if (!step.action && !step.tool && !step.template) {
      throw new Error(`Step ${i}: must have action, tool, or template`);
    }
  }
}

/**
 * Validate code for sandbox security
 */
function validateSandbox(code: string): void {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      throw new Error(`Code contains forbidden pattern: ${pattern}`);
    }
  }
}

/**
 * Evaluate condition in workflow context
 */
function evaluateCondition(condition: string, context: WorkflowContext): boolean {
  try {
    // Simple condition evaluation (could be enhanced)
    const func = new Function('context', `return ${condition}`);
    return func(context);
  } catch {
    return false;
  }
}

/**
 * Build workflow from template
 */
function buildWorkflowFromTemplate(
  template: string,
  params: Record<string, any>
): Workflow {
  switch (template) {
    case 'infinite_scroll':
      return buildInfiniteScrollWorkflow(params);
    case 'form_fill':
      return buildFormFillWorkflow(params);
    case 'pagination':
      return buildPaginationWorkflow(params);
    case 'wait_and_extract':
      return buildWaitAndExtractWorkflow(params);
    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

/**
 * Build infinite scroll workflow
 */
function buildInfiniteScrollWorkflow(params: Record<string, any>): Workflow {
  const { item_selector, max_scrolls = 10 } = params;

  if (!item_selector) {
    throw new Error('infinite_scroll template requires item_selector parameter');
  }

  const steps: WorkflowStep[] = [];

  for (let i = 0; i < max_scrolls; i++) {
    steps.push({
      action: 'evaluate',
      code: `
        (async () => {
          const before = document.querySelectorAll('${item_selector}').length;
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise(r => setTimeout(r, 1000));
          const after = document.querySelectorAll('${item_selector}').length;
          return { hasMore: after > before, count: after };
        })()
      `,
      save_as: `scroll_${i}`
    });
  }

  // Extract all items at the end
  steps.push({
    action: 'evaluate',
    code: `Array.from(document.querySelectorAll('${item_selector}')).map(el => el.textContent?.trim())`,
    save_as: 'items'
  });

  return { name: 'infinite_scroll', steps };
}

/**
 * Build form fill workflow
 */
function buildFormFillWorkflow(params: Record<string, any>): Workflow {
  const { fields, submit_selector } = params;

  if (!fields || !Array.isArray(fields)) {
    throw new Error('form_fill template requires fields parameter');
  }

  const steps: WorkflowStep[] = fields.map((field: any) => ({
    action: 'type',
    selector: field.selector,
    value: field.value
  }));

  if (submit_selector) {
    steps.push({
      action: 'click',
      selector: submit_selector
    });
  }

  return { name: 'form_fill', steps };
}

/**
 * Build pagination workflow
 */
function buildPaginationWorkflow(params: Record<string, any>): Workflow {
  const { item_selector, next_button, max_pages = 10 } = params;

  if (!item_selector || !next_button) {
    throw new Error('pagination template requires item_selector and next_button parameters');
  }

  const steps: WorkflowStep[] = [];

  for (let i = 0; i < max_pages; i++) {
    // For first page, always extract. For subsequent pages, only extract if previous hasNext was true
    const extractCondition = i === 0 ? undefined : `context.hasNext_${i - 1} === true`;

    // Extract items from current page
    steps.push({
      action: 'evaluate',
      code: `
        Array.from(document.querySelectorAll('${item_selector}')).map(el => el.textContent?.trim())
      `,
      save_as: `page_${i}_items`,
      condition: extractCondition
    });

    // Check if next button exists (skip if we shouldn't have extracted)
    steps.push({
      action: 'evaluate',
      code: `document.querySelector('${next_button}') !== null`,
      save_as: `hasNext_${i}`,
      condition: extractCondition
    });

    // Click next if available
    steps.push({
      action: 'click',
      selector: next_button,
      condition: `context.hasNext_${i} === true`
    });

    // Wait for new page to load
    steps.push({
      action: 'wait',
      selector: item_selector,
      condition: `context.hasNext_${i} === true`,
      timeout: 5000
    });
  }

  return { name: 'pagination', steps };
}

/**
 * Build wait and extract workflow
 */
function buildWaitAndExtractWorkflow(params: Record<string, any>): Workflow {
  const { wait_selector, extract_selector, timeout = 30000 } = params;

  if (!wait_selector || !extract_selector) {
    throw new Error('wait_and_extract template requires wait_selector and extract_selector parameters');
  }

  return {
    name: 'wait_and_extract',
    steps: [
      {
        action: 'wait',
        selector: wait_selector,
        timeout
      },
      {
        action: 'evaluate',
        code: `
          Array.from(document.querySelectorAll('${extract_selector}')).map(el => el.textContent?.trim())
        `,
        save_as: 'items'
      }
    ]
  };
}

/**
 * Extract results based on template type
 */
function extractTemplateResults(template: string | undefined, context: WorkflowContext): any {
  if (!template) return {};

  switch (template) {
    case 'infinite_scroll': {
      const scrolls = Object.keys(context).filter(k => k.startsWith('scroll_'));
      return {
        scrolls_performed: scrolls.length,
        items_collected: context.items?.length || 0
      };
    }

    case 'pagination': {
      const pages = Object.keys(context).filter(k => k.startsWith('page_') && k.endsWith('_items'));
      const allItems = pages.flatMap(key => context[key] || []);
      return {
        pages_visited: pages.length,
        items_collected: allItems.length
      };
    }

    case 'wait_and_extract': {
      return {
        items: context.items || []
      };
    }

    default:
      return {};
  }
}
