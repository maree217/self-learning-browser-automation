#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool handlers
import { navigate, goBack, goForward } from './tools/navigation.js';
import { click, type, fill, select, press, hover, waitFor } from './tools/interaction.js';
import { snapshot, screenshot, evaluate, getContent } from './tools/content.js';
import { manageTabs } from './tools/tabs.js';
import { saveSession, listSessions, clearSession, enableSharedContext, disableSharedContext } from './tools/sessions.js';
import { uploadFile, handleDialog } from './tools/advanced.js';
import { browserManager } from './browser-manager.js';

/**
 * Browser Automation MCP Server
 * Provides generic browser automation capabilities for any website
 */
class BrowserMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'browser-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Navigation
        {
          name: 'browser_navigate',
          description: 'Navigate to a URL. Sessions are automatically saved per domain.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to navigate to' },
              waitUntil: {
                type: 'string',
                enum: ['load', 'domcontentloaded', 'networkidle'],
                description: 'Wait until this event fires',
                default: 'load'
              },
              timeout: { type: 'number', description: 'Timeout in milliseconds', default: 60000 }
            },
            required: ['url']
          }
        },
        {
          name: 'browser_go_back',
          description: 'Navigate back in history for a domain',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Domain to navigate back (e.g., linkedin.com)' }
            },
            required: ['domain']
          }
        },
        {
          name: 'browser_go_forward',
          description: 'Navigate forward in history for a domain',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Domain to navigate forward' }
            },
            required: ['domain']
          }
        },

        // Interaction
        {
          name: 'browser_click',
          description: 'Click an element on the page',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Domain (e.g., linkedin.com)' },
              selector: { type: 'string', description: 'CSS selector for element to click' },
              button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' },
              clickCount: { type: 'number', default: 1 },
              timeout: { type: 'number', default: 30000 }
            },
            required: ['domain', 'selector']
          }
        },
        {
          name: 'browser_type',
          description: 'Type text into an element',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              selector: { type: 'string', description: 'CSS selector for input element' },
              text: { type: 'string', description: 'Text to type' },
              delay: { type: 'number', description: 'Delay between keystrokes in ms', default: 0 }
            },
            required: ['domain', 'selector', 'text']
          }
        },
        {
          name: 'browser_fill',
          description: 'Fill a form field (faster than typing)',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              selector: { type: 'string' },
              value: { type: 'string', description: 'Value to fill' }
            },
            required: ['domain', 'selector', 'value']
          }
        },
        {
          name: 'browser_select',
          description: 'Select option from dropdown',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              selector: { type: 'string' },
              value: {
                oneOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } }
                ],
                description: 'Option value(s) to select'
              }
            },
            required: ['domain', 'selector', 'value']
          }
        },
        {
          name: 'browser_press',
          description: 'Press keyboard key(s)',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              key: { type: 'string', description: 'Key to press (e.g., Enter, Tab, Escape)' },
              modifiers: {
                type: 'array',
                items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] }
              }
            },
            required: ['domain', 'key']
          }
        },
        {
          name: 'browser_hover',
          description: 'Hover over an element',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              selector: { type: 'string' }
            },
            required: ['domain', 'selector']
          }
        },
        {
          name: 'browser_wait_for',
          description: 'Wait for an element or condition',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              selector: { type: 'string', description: 'CSS selector to wait for' },
              state: {
                type: 'string',
                enum: ['attached', 'detached', 'visible', 'hidden'],
                default: 'visible'
              },
              timeout: { type: 'number', default: 30000 }
            },
            required: ['domain']
          }
        },

        // Content
        {
          name: 'browser_snapshot',
          description: 'Get accessibility tree snapshot (LLM-friendly page structure)',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' }
            },
            required: ['domain']
          }
        },
        {
          name: 'browser_screenshot',
          description: 'Take screenshot of page or element',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              selector: { type: 'string', description: 'Optional: selector for specific element' },
              fullPage: { type: 'boolean', default: false },
              type: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
              quality: { type: 'number', description: 'JPEG/WebP quality 0-100' },
              path: { type: 'string', description: 'Optional: path to save screenshot' }
            },
            required: ['domain']
          }
        },
        {
          name: 'browser_evaluate',
          description: 'Execute JavaScript code on the page and return result',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              script: { type: 'string', description: 'JavaScript code to execute' },
              args: { type: 'array', description: 'Optional arguments for the script' }
            },
            required: ['domain', 'script']
          }
        },
        {
          name: 'browser_get_content',
          description: 'Get page content as text or HTML',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              format: { type: 'string', enum: ['text', 'html'], default: 'text' }
            },
            required: ['domain']
          }
        },

        // Tabs
        {
          name: 'browser_tabs',
          description: 'Manage tabs (list/create/close/switch)',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              action: { type: 'string', enum: ['list', 'create', 'close', 'switch'] },
              url: { type: 'string', description: 'URL for new tab (create only)' },
              pageId: { type: 'string', description: 'Page ID for close/switch' }
            },
            required: ['domain', 'action']
          }
        },

        // Sessions
        {
          name: 'browser_save_session',
          description: 'Manually save session (auto-saves on navigation)',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' }
            },
            required: ['domain']
          }
        },
        {
          name: 'browser_list_sessions',
          description: 'List all saved domain sessions',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'browser_clear_session',
          description: 'Clear session for a domain (logout)',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' }
            },
            required: ['domain']
          }
        },
        {
          name: 'browser_enable_shared_context',
          description: 'Enable shared context mode for OAuth flows. When enabled, all domains share the same browser context and cookies, allowing cross-domain authentication like "Sign in with Google" to work.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'browser_disable_shared_context',
          description: 'Disable shared context mode and return to per-domain isolation. Each domain will have its own separate browser context and cookies.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },

        // Advanced
        {
          name: 'browser_upload_file',
          description: 'Upload file(s) to file input',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              selector: { type: 'string', description: 'File input selector' },
              filePaths: {
                type: 'array',
                items: { type: 'string' },
                description: 'Absolute paths to files'
              }
            },
            required: ['domain', 'selector', 'filePaths']
          }
        },
        {
          name: 'browser_handle_dialog',
          description: 'Handle browser dialog (alert/confirm/prompt)',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              action: { type: 'string', enum: ['accept', 'dismiss'] },
              text: { type: 'string', description: 'Text for prompt dialog' }
            },
            required: ['domain', 'action']
          }
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error('Missing arguments');
      }

      try {
        let result;
        const params = args as any; // Cast to any for flexibility

        switch (name) {
          // Navigation
          case 'browser_navigate':
            result = await navigate(params);
            break;
          case 'browser_go_back':
            result = await goBack(params.domain);
            break;
          case 'browser_go_forward':
            result = await goForward(params.domain);
            break;

          // Interaction
          case 'browser_click':
            result = await click(params, params.domain);
            break;
          case 'browser_type':
            result = await type(params, params.domain);
            break;
          case 'browser_fill':
            result = await fill(params, params.domain);
            break;
          case 'browser_select':
            result = await select(params, params.domain);
            break;
          case 'browser_press':
            result = await press(params, params.domain);
            break;
          case 'browser_hover':
            result = await hover(params, params.domain);
            break;
          case 'browser_wait_for':
            result = await waitFor(params, params.domain);
            break;

          // Content
          case 'browser_snapshot':
            result = await snapshot(params.domain);
            break;
          case 'browser_screenshot':
            result = await screenshot(params, params.domain);
            break;
          case 'browser_evaluate':
            result = await evaluate(params, params.domain);
            break;
          case 'browser_get_content':
            result = await getContent(params.domain, params.format);
            break;

          // Tabs
          case 'browser_tabs':
            result = await manageTabs(params, params.domain);
            break;

          // Sessions
          case 'browser_save_session':
            result = await saveSession(params.domain);
            break;
          case 'browser_list_sessions':
            result = await listSessions();
            break;
          case 'browser_clear_session':
            result = await clearSession(params.domain);
            break;
          case 'browser_enable_shared_context':
            result = await enableSharedContext();
            break;
          case 'browser_disable_shared_context':
            result = await disableSharedContext();
            break;

          // Advanced
          case 'browser_upload_file':
            result = await uploadFile(params, params.domain);
            break;
          case 'browser_handle_dialog':
            result = await handleDialog(params, params.domain);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error: errorMsg,
                tool: name,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling() {
    // Cleanup on exit
    process.on('SIGINT', async () => {
      await browserManager.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await browserManager.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Browser MCP Server running on stdio');
  }
}

// Start the server
const server = new BrowserMCPServer();
server.run().catch(console.error);
