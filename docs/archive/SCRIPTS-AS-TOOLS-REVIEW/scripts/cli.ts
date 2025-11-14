#!/usr/bin/env node
import { Command } from 'commander';
import { loader } from './core/progressive-loader';
import { spawn } from 'child_process';
import path from 'path';

const program = new Command();

program
  .name('sb')
  .description('Social Browser Scripts - Progressive disclosure CLI')
  .version('1.0.0');

// List command
program
  .command('list [category]')
  .description('List available tools or tools in a category')
  .action(async (category?: string) => {
    try {
      if (!category) {
        console.log(await loader.listCategories());
      } else {
        console.log(await loader.listCategoryTools(category));
      }
    } catch (error) {
      console.error(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exit(1);
    }
  });

// Help command for specific tools
program
  .command('help <tool>')
  .description('Get detailed help for a specific tool')
  .action(async (tool: string) => {
    try {
      console.log(await loader.getToolInfo(tool));
    } catch (error) {
      console.error(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exit(1);
    }
  });

// Search command
program
  .command('search <keyword>')
  .description('Search tools by keyword')
  .action(async (keyword: string) => {
    try {
      console.log(await loader.searchTools(keyword));
    } catch (error) {
      console.error(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exit(1);
    }
  });

// Summary command (minimal context)
program
  .command('summary')
  .description('Show minimal tool summary (500 bytes)')
  .action(async () => {
    try {
      console.log(await loader.getSummary());
    } catch (error) {
      console.error(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exit(1);
    }
  });

// Execute a tool (passthrough to script)
program
  .command('exec <tool> [args...]')
  .description('Execute a tool with arguments')
  .allowUnknownOption()
  .action(async (tool: string, args: string[]) => {
    try {
      const scriptPath = await loader.getToolScriptPath(tool);

      // Spawn the script with remaining arguments
      const child = spawn('node', [scriptPath, ...args], {
        stdio: 'inherit',
      });

      child.on('exit', (code) => {
        process.exit(code || 0);
      });
    } catch (error) {
      console.error(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exit(1);
    }
  });

// Shorthand: Allow direct tool execution (sb navigate --url ...)
program.action(async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments, show summary
    console.log(await loader.getSummary());
    return;
  }

  const toolName = args[0];

  // Check if it's a valid tool
  try {
    const scriptPath = await loader.getToolScriptPath(toolName);

    // Execute the tool
    const child = spawn('node', [scriptPath, ...args.slice(1)], {
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (error) {
    // Not a tool, show help
    program.help();
  }
});

program.parse();
