import fs from 'fs/promises';
import path from 'path';

/**
 * Progressive disclosure tool loader
 * Loads tool information on-demand to minimize context usage
 */

interface ToolInfo {
  script: string;
  description: string;
  usage: string;
  context_cost: string;
  related: string[];
}

interface CategoryInfo {
  description: string;
  context_cost: string;
  tools: Record<string, ToolInfo>;
}

interface ToolRegistry {
  version: string;
  description: string;
  categories: Record<string, CategoryInfo>;
}

class ProgressiveLoader {
  private registry: ToolRegistry | null = null;
  private registryPath: string;

  constructor() {
    this.registryPath = path.join(__dirname, '../tools.json');
  }

  /**
   * Load tool registry
   */
  private async loadRegistry(): Promise<ToolRegistry> {
    if (this.registry) {
      return this.registry;
    }

    const content = await fs.readFile(this.registryPath, 'utf-8');
    this.registry = JSON.parse(content);
    return this.registry!;
  }

  /**
   * Get summary (minimal context)
   */
  async getSummary(): Promise<string> {
    const registry = await this.loadRegistry();
    const categories = Object.keys(registry.categories);
    const totalTools = Object.values(registry.categories)
      .reduce((sum, cat) => sum + Object.keys(cat.tools).length, 0);

    return JSON.stringify({
      name: 'social-browser-scripts',
      version: registry.version,
      description: registry.description,
      categories,
      total_tools: totalTools,
      usage: 'Run "sb list <category>" to see available tools',
    }, null, 2);
  }

  /**
   * List categories
   */
  async listCategories(): Promise<string> {
    const registry = await this.loadRegistry();
    const categories = Object.entries(registry.categories).map(([name, info]) => ({
      name,
      description: info.description,
      context_cost: info.context_cost,
      tool_count: Object.keys(info.tools).length,
    }));

    return JSON.stringify({ categories }, null, 2);
  }

  /**
   * List tools in a category
   */
  async listCategoryTools(category: string): Promise<string> {
    const registry = await this.loadRegistry();
    const categoryInfo = registry.categories[category];

    if (!categoryInfo) {
      throw new Error(`Unknown category: ${category}. Available: ${Object.keys(registry.categories).join(', ')}`);
    }

    const tools = Object.entries(categoryInfo.tools).map(([name, info]) => ({
      name,
      description: info.description,
      usage: info.usage,
      context_cost: info.context_cost,
    }));

    return JSON.stringify({
      category,
      description: categoryInfo.description,
      tools,
    }, null, 2);
  }

  /**
   * Get detailed tool info
   */
  async getToolInfo(toolName: string): Promise<string> {
    const registry = await this.loadRegistry();

    // Find tool in any category
    for (const [categoryName, categoryInfo] of Object.entries(registry.categories)) {
      if (categoryInfo.tools[toolName]) {
        const tool = categoryInfo.tools[toolName];
        return JSON.stringify({
          tool: toolName,
          category: categoryName,
          ...tool,
        }, null, 2);
      }
    }

    throw new Error(`Unknown tool: ${toolName}`);
  }

  /**
   * Get tool script path
   */
  async getToolScriptPath(toolName: string): Promise<string> {
    const registry = await this.loadRegistry();

    // Find tool in any category
    for (const categoryInfo of Object.values(registry.categories)) {
      if (categoryInfo.tools[toolName]) {
        const tool = categoryInfo.tools[toolName];
        return path.join(__dirname, '..', tool.script);
      }
    }

    throw new Error(`Unknown tool: ${toolName}`);
  }

  /**
   * Search tools by keyword
   */
  async searchTools(keyword: string): Promise<string> {
    const registry = await this.loadRegistry();
    const results: Array<{ category: string; tool: string; description: string; usage: string }> = [];

    for (const [categoryName, categoryInfo] of Object.entries(registry.categories)) {
      for (const [toolName, toolInfo] of Object.entries(categoryInfo.tools)) {
        if (
          toolName.includes(keyword) ||
          toolInfo.description.toLowerCase().includes(keyword.toLowerCase())
        ) {
          results.push({
            category: categoryName,
            tool: toolName,
            description: toolInfo.description,
            usage: toolInfo.usage,
          });
        }
      }
    }

    return JSON.stringify({ keyword, results }, null, 2);
  }
}

// Singleton instance
export const loader = new ProgressiveLoader();
