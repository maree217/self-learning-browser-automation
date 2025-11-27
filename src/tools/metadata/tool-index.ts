/**
 * Tool Metadata Index for Opus 4.5 Tool Search
 * Enables efficient tool discovery and reduces context window usage
 */

export interface ToolExample {
  scenario: string;
  input: Record<string, any>;
  when_to_use: string;
  expected_output?: any;
  common_mistakes?: string[];
}

export interface ToolMetadata {
  name: string;
  category: 'navigation' | 'interaction' | 'extraction' | 'content' | 'sessions' | 'advanced' | 'tabs';
  description: string;
  searchable_keywords: string[];
  use_cases: string[];
  related_tools: string[];
  when_to_use: string[];
  when_not_to_use: string[];
  examples?: ToolExample[];
}

/**
 * Comprehensive tool index with metadata for all MCP tools
 */
export const TOOL_INDEX: Record<string, ToolMetadata> = {
  // NAVIGATION TOOLS
  'browser_navigate': {
    name: 'browser_navigate',
    category: 'navigation',
    description: 'Navigate to a URL. Sessions are automatically saved per domain.',
    searchable_keywords: ['navigate', 'go', 'url', 'visit', 'open', 'load', 'page', 'website'],
    use_cases: [
      'Opening a website for the first time',
      'Navigating to a specific URL',
      'Loading a page and waiting for it to be ready',
      'Starting a browsing session'
    ],
    related_tools: ['browser_go_back', 'browser_go_forward', 'browser_wait_for'],
    when_to_use: [
      'Need to visit a new URL',
      'Starting a new task on a website',
      'Loading a page before interaction'
    ],
    when_not_to_use: [
      'Just going back in history (use browser_go_back)',
      'Page is already loaded',
      'Need to click a link instead (use browser_click)'
    ],
    examples: [
      {
        scenario: 'Open LinkedIn profile for research',
        input: { url: 'https://www.linkedin.com/in/johndoe' },
        when_to_use: 'Starting a new browsing session to gather profile information',
        expected_output: 'Page loads successfully, session saved for linkedin.com domain'
      },
      {
        scenario: 'Navigate to job posting',
        input: { url: 'https://www.linkedin.com/jobs/view/123456' },
        when_to_use: 'Need to view a specific job listing',
        common_mistakes: ['Using navigate when already on the domain (wasteful)', 'Not waiting for page load before interacting']
      },
      {
        scenario: 'Load search results page',
        input: { url: 'https://www.google.com/search?q=anthropic+claude' },
        when_to_use: 'Starting a search task on a search engine',
        expected_output: 'Google search results page loaded and ready'
      }
    ]
  },

  'browser_go_back': {
    name: 'browser_go_back',
    category: 'navigation',
    description: 'Navigate back in browser history for a domain',
    searchable_keywords: ['back', 'history', 'previous', 'return', 'navigate'],
    use_cases: [
      'Going back to previous page',
      'Undoing navigation',
      'Returning to search results'
    ],
    related_tools: ['browser_navigate', 'browser_go_forward'],
    when_to_use: [
      'Need to return to previous page',
      'Navigated too far forward',
      'Want to revisit earlier content'
    ],
    when_not_to_use: [
      'No history exists yet',
      'Need to go to specific URL (use browser_navigate)'
    ]
  },

  'browser_go_forward': {
    name: 'browser_go_forward',
    category: 'navigation',
    description: 'Navigate forward in browser history for a domain',
    searchable_keywords: ['forward', 'history', 'next', 'navigate', 'ahead'],
    use_cases: [
      'Going forward after going back',
      'Re-navigating to a page',
      'Moving through history'
    ],
    related_tools: ['browser_navigate', 'browser_go_back'],
    when_to_use: [
      'Went back too far',
      'Want to return to more recent page'
    ],
    when_not_to_use: [
      'No forward history exists',
      'Need to navigate to new URL'
    ]
  },

  // INTERACTION TOOLS
  'browser_click': {
    name: 'browser_click',
    category: 'interaction',
    description: 'Click an element on the page',
    searchable_keywords: ['click', 'press', 'button', 'link', 'tap', 'select', 'interact', 'activate'],
    use_cases: [
      'Clicking buttons to submit forms',
      'Clicking links to navigate',
      'Selecting options from menus',
      'Activating interactive elements',
      'Triggering JavaScript actions'
    ],
    related_tools: ['browser_hover', 'browser_wait_for', 'browser_type', 'browser_fill'],
    when_to_use: [
      'Need to interact with clickable elements',
      'Submitting forms',
      'Following links',
      'Triggering UI actions'
    ],
    when_not_to_use: [
      'Element not yet visible (use browser_wait_for first)',
      'Need to type text (use browser_type)',
      'Just hovering (use browser_hover)'
    ],
    examples: [
      {
        scenario: 'Click "Connect" button on LinkedIn profile',
        input: { selector: 'button[aria-label*="Connect"]' },
        when_to_use: 'Need to send a connection request to a LinkedIn profile',
        expected_output: 'Connection modal opens or request is sent',
        common_mistakes: ['Not waiting for button to be visible', 'Using text content instead of aria-label']
      },
      {
        scenario: 'Submit job application form',
        input: { selector: 'button[type="submit"]' },
        when_to_use: 'After filling out all form fields',
        expected_output: 'Form is submitted, confirmation page loads'
      },
      {
        scenario: 'Expand "See more" content section',
        input: { selector: '.show-more-less-html__button--more' },
        when_to_use: 'Need to view truncated LinkedIn content',
        expected_output: 'Hidden content becomes visible'
      }
    ]
  },

  'browser_type': {
    name: 'browser_type',
    category: 'interaction',
    description: 'Type text into an element character by character',
    searchable_keywords: ['type', 'input', 'text', 'enter', 'write', 'keyboard', 'keys'],
    use_cases: [
      'Typing search queries',
      'Filling text inputs with realistic typing',
      'Entering passwords',
      'Simulating human typing behavior'
    ],
    related_tools: ['browser_fill', 'browser_click', 'browser_press'],
    when_to_use: [
      'Need realistic typing simulation',
      'Form has JavaScript listeners on keystrokes',
      'Want to trigger autocomplete'
    ],
    when_not_to_use: [
      'Speed is more important than realism (use browser_fill)',
      'Just pressing keys without text (use browser_press)'
    ]
  },

  'browser_fill': {
    name: 'browser_fill',
    category: 'interaction',
    description: 'Fill a form field quickly (faster than typing)',
    searchable_keywords: ['fill', 'form', 'input', 'value', 'set', 'enter', 'complete'],
    use_cases: [
      'Filling out forms quickly',
      'Setting input values',
      'Completing text fields',
      'Automating form submission'
    ],
    related_tools: ['browser_type', 'browser_select', 'browser_click'],
    when_to_use: [
      'Speed is important',
      'Form fields don\'t require keystroke events',
      'Bulk form filling'
    ],
    when_not_to_use: [
      'Need to trigger keystroke listeners (use browser_type)',
      'Selecting from dropdown (use browser_select)'
    ]
  },

  'browser_select': {
    name: 'browser_select',
    category: 'interaction',
    description: 'Select option(s) from dropdown menu',
    searchable_keywords: ['select', 'dropdown', 'option', 'choose', 'pick', 'menu', 'combobox'],
    use_cases: [
      'Selecting from dropdown menus',
      'Choosing options in forms',
      'Setting select box values',
      'Multi-select operations'
    ],
    related_tools: ['browser_fill', 'browser_click'],
    when_to_use: [
      'Interacting with <select> elements',
      'Choosing from dropdown lists',
      'Setting select values in forms'
    ],
    when_not_to_use: [
      'Not a <select> element (use browser_click)',
      'Custom dropdown component (may need browser_click)'
    ]
  },

  'browser_press': {
    name: 'browser_press',
    category: 'interaction',
    description: 'Press keyboard key(s) like Enter, Tab, Escape',
    searchable_keywords: ['press', 'key', 'keyboard', 'enter', 'tab', 'escape', 'shortcut', 'hotkey'],
    use_cases: [
      'Pressing Enter to submit',
      'Using Tab for navigation',
      'Pressing Escape to close modals',
      'Keyboard shortcuts',
      'Special key combinations'
    ],
    related_tools: ['browser_type', 'browser_click'],
    when_to_use: [
      'Need to press non-text keys',
      'Using keyboard shortcuts',
      'Submitting with Enter',
      'Modal interactions'
    ],
    when_not_to_use: [
      'Typing actual text (use browser_type)',
      'Clicking is more reliable (use browser_click)'
    ]
  },

  'browser_hover': {
    name: 'browser_hover',
    category: 'interaction',
    description: 'Hover mouse over an element',
    searchable_keywords: ['hover', 'mouseover', 'mouse', 'pointer', 'tooltip', 'menu'],
    use_cases: [
      'Revealing dropdown menus',
      'Showing tooltips',
      'Triggering hover effects',
      'Displaying hidden elements'
    ],
    related_tools: ['browser_click', 'browser_wait_for'],
    when_to_use: [
      'Need to trigger hover effects',
      'Revealing hidden menus',
      'Before clicking on hover-revealed elements'
    ],
    when_not_to_use: [
      'Element doesn\'t have hover behavior',
      'Click is needed instead of hover'
    ]
  },

  'browser_wait_for': {
    name: 'browser_wait_for',
    category: 'interaction',
    description: 'Wait for an element or condition to be met',
    searchable_keywords: ['wait', 'delay', 'pause', 'until', 'element', 'visible', 'ready', 'loaded'],
    use_cases: [
      'Waiting for elements to appear',
      'Ensuring page is ready',
      'Waiting for AJAX requests',
      'Synchronizing with dynamic content',
      'Preventing race conditions'
    ],
    related_tools: ['browser_navigate', 'browser_click', 'browser_snapshot'],
    when_to_use: [
      'Element loads asynchronously',
      'Need to ensure element is visible before interaction',
      'Waiting for animations to complete',
      'Page has dynamic content'
    ],
    when_not_to_use: [
      'Element is already visible',
      'Using fixed delays is acceptable'
    ]
  },

  // CONTENT TOOLS
  'browser_snapshot': {
    name: 'browser_snapshot',
    category: 'content',
    description: 'Get accessibility tree snapshot (LLM-friendly page structure)',
    searchable_keywords: ['snapshot', 'accessibility', 'tree', 'structure', 'elements', 'page', 'content', 'analyze'],
    use_cases: [
      'Understanding page structure',
      'Finding interactive elements',
      'Analyzing accessibility',
      'Getting element hierarchy',
      'Discovering available actions'
    ],
    related_tools: ['browser_get_content', 'browser_screenshot', 'browser_evaluate'],
    when_to_use: [
      'Need to find elements by accessible name',
      'Want structured page representation',
      'Analyzing page for automation',
      'Accessibility testing'
    ],
    when_not_to_use: [
      'Need full text content (use browser_get_content)',
      'Need visual representation (use browser_screenshot)',
      'Need to run custom extraction (use browser_evaluate)'
    ]
  },

  'browser_screenshot': {
    name: 'browser_screenshot',
    category: 'content',
    description: 'Take screenshot of page or specific element',
    searchable_keywords: ['screenshot', 'image', 'capture', 'picture', 'visual', 'snap', 'photo'],
    use_cases: [
      'Capturing visual appearance',
      'Documenting page state',
      'Debugging visual issues',
      'Creating reports',
      'Verifying layouts'
    ],
    related_tools: ['browser_snapshot', 'browser_get_content'],
    when_to_use: [
      'Need visual representation',
      'Documenting results',
      'Visual verification required',
      'Debugging layout issues'
    ],
    when_not_to_use: [
      'Need structured data (use browser_snapshot or browser_get_content)',
      'Data extraction is the goal (use browser_evaluate)',
      'Visual analysis not required'
    ]
  },

  'browser_evaluate': {
    name: 'browser_evaluate',
    category: 'content',
    description: 'Execute JavaScript code on the page and return result',
    searchable_keywords: ['evaluate', 'execute', 'javascript', 'js', 'code', 'run', 'script', 'custom'],
    use_cases: [
      'Custom data extraction',
      'Running page-specific logic',
      'Getting computed values',
      'Complex DOM queries',
      'Extracting specific data'
    ],
    related_tools: ['browser_get_content', 'browser_snapshot'],
    when_to_use: [
      'Need custom extraction logic',
      'Standard tools don\'t provide needed data',
      'Complex DOM traversal required',
      'Page-specific calculations'
    ],
    when_not_to_use: [
      'Simple content extraction (use browser_get_content)',
      'Standard page structure (use browser_snapshot)',
      'Security concerns with arbitrary JS'
    ]
  },

  'browser_get_content': {
    name: 'browser_get_content',
    category: 'content',
    description: 'Get page content as text or HTML',
    searchable_keywords: ['content', 'text', 'html', 'get', 'extract', 'page', 'source', 'data'],
    use_cases: [
      'Extracting page text',
      'Getting HTML source',
      'Reading article content',
      'Scraping text data',
      'Content analysis'
    ],
    related_tools: ['browser_snapshot', 'browser_evaluate', 'browser_screenshot'],
    when_to_use: [
      'Need full page text',
      'Want HTML source',
      'Simple content extraction',
      'Text analysis required'
    ],
    when_not_to_use: [
      'Need structured data (use browser_snapshot)',
      'Visual layout matters (use browser_screenshot)',
      'Complex extraction needed (use browser_evaluate)'
    ]
  },

  // TABS
  'browser_tabs': {
    name: 'browser_tabs',
    category: 'tabs',
    description: 'Manage browser tabs (list/create/close/switch)',
    searchable_keywords: ['tabs', 'tab', 'window', 'manage', 'create', 'close', 'switch', 'list'],
    use_cases: [
      'Opening new tabs',
      'Switching between tabs',
      'Closing tabs',
      'Managing multiple pages'
    ],
    related_tools: ['browser_navigate'],
    when_to_use: [
      'Need multiple pages open',
      'Managing tab state',
      'Switching between contexts'
    ],
    when_not_to_use: [
      'Single page automation',
      'Navigation within same tab is sufficient'
    ]
  },

  // SESSIONS
  'browser_save_session': {
    name: 'browser_save_session',
    category: 'sessions',
    description: 'Manually save session (auto-saves on navigation)',
    searchable_keywords: ['save', 'session', 'persist', 'store', 'cookies', 'login'],
    use_cases: [
      'Forcing session save',
      'Preserving login state',
      'Saving cookies manually'
    ],
    related_tools: ['browser_list_sessions', 'browser_clear_session'],
    when_to_use: [
      'Want to ensure session is saved',
      'After important authentication step'
    ],
    when_not_to_use: [
      'Sessions auto-save on navigation',
      'No authentication to preserve'
    ]
  },

  'browser_list_sessions': {
    name: 'browser_list_sessions',
    category: 'sessions',
    description: 'List all saved domain sessions',
    searchable_keywords: ['list', 'sessions', 'show', 'domains', 'saved', 'cookies'],
    use_cases: [
      'Viewing saved sessions',
      'Checking which domains have login state',
      'Session management'
    ],
    related_tools: ['browser_save_session', 'browser_clear_session'],
    when_to_use: [
      'Need to see saved sessions',
      'Managing multiple domain sessions'
    ],
    when_not_to_use: [
      'Just want to use a session (happens automatically)'
    ]
  },

  'browser_clear_session': {
    name: 'browser_clear_session',
    category: 'sessions',
    description: 'Clear session for a domain (logout)',
    searchable_keywords: ['clear', 'delete', 'remove', 'session', 'logout', 'reset', 'cookies'],
    use_cases: [
      'Logging out',
      'Resetting session state',
      'Starting fresh',
      'Clearing cookies'
    ],
    related_tools: ['browser_save_session', 'browser_list_sessions'],
    when_to_use: [
      'Need to logout',
      'Session is corrupted',
      'Want fresh start'
    ],
    when_not_to_use: [
      'Session is working fine',
      'Logout via UI is preferred'
    ]
  },

  'browser_enable_shared_context': {
    name: 'browser_enable_shared_context',
    category: 'sessions',
    description: 'Enable shared context mode for OAuth flows (all domains share cookies)',
    searchable_keywords: ['oauth', 'shared', 'context', 'google', 'sso', 'authentication', 'signin', 'login'],
    use_cases: [
      'OAuth flows like "Sign in with Google"',
      'Cross-domain authentication',
      'SSO scenarios',
      'Shared cookie requirements'
    ],
    related_tools: ['browser_disable_shared_context', 'browser_navigate'],
    when_to_use: [
      'Using OAuth providers',
      'Cross-domain login flows',
      '"Sign in with X" patterns'
    ],
    when_not_to_use: [
      'Simple single-domain login',
      'Security isolation required between domains'
    ]
  },

  'browser_disable_shared_context': {
    name: 'browser_disable_shared_context',
    category: 'sessions',
    description: 'Disable shared context mode (return to per-domain isolation)',
    searchable_keywords: ['disable', 'shared', 'context', 'isolate', 'separate', 'domains'],
    use_cases: [
      'Returning to isolated mode after OAuth',
      'Re-enabling security isolation',
      'Separating domain contexts'
    ],
    related_tools: ['browser_enable_shared_context'],
    when_to_use: [
      'OAuth flow complete',
      'Need domain isolation again'
    ],
    when_not_to_use: [
      'Still in OAuth flow',
      'Shared context still needed'
    ]
  },

  // ADVANCED
  'browser_upload_file': {
    name: 'browser_upload_file',
    category: 'advanced',
    description: 'Upload file(s) to file input element',
    searchable_keywords: ['upload', 'file', 'attach', 'input', 'choose', 'document'],
    use_cases: [
      'Uploading documents',
      'Attaching files to forms',
      'Image uploads',
      'File input automation'
    ],
    related_tools: ['browser_click', 'browser_fill'],
    when_to_use: [
      'File upload required',
      'Automating file attachments'
    ],
    when_not_to_use: [
      'No file input on page',
      'Drag-and-drop upload (may need different approach)'
    ]
  },

  'browser_handle_dialog': {
    name: 'browser_handle_dialog',
    category: 'advanced',
    description: 'Handle browser dialogs (alert/confirm/prompt)',
    searchable_keywords: ['dialog', 'alert', 'confirm', 'prompt', 'popup', 'modal', 'accept', 'dismiss'],
    use_cases: [
      'Accepting alerts',
      'Handling confirm dialogs',
      'Responding to prompts',
      'Dismissing popups'
    ],
    related_tools: ['browser_click', 'browser_type'],
    when_to_use: [
      'Browser alert appears',
      'Confirm dialog needs response',
      'Prompt requires input'
    ],
    when_not_to_use: [
      'HTML modal (use browser_click)',
      'Custom popup component'
    ]
  },

  // NEW EXTRACTION TOOLS (Opus 4.5 Refactor)
  'browser_extract_structured': {
    name: 'browser_extract_structured',
    category: 'extraction',
    description: 'Deep extraction of DOM elements: links, forms, tables, interactive elements',
    searchable_keywords: ['extract', 'structured', 'dom', 'links', 'forms', 'tables', 'data', 'deep'],
    use_cases: [
      'Extract all links from a page with metadata',
      'Get form structures and field information',
      'Parse table data into structured format',
      'Identify interactive elements on page'
    ],
    related_tools: ['browser_get_content', 'browser_extract_semantic', 'browser_extract_by_pattern'],
    when_to_use: [
      'Need detailed DOM structure information',
      'Extracting navigation links',
      'Analyzing form fields',
      'Getting table data without screenshots'
    ],
    when_not_to_use: [
      'Need semantic understanding (use browser_extract_semantic)',
      'Looking for specific patterns (use browser_extract_by_pattern)',
      'Simple text extraction (use browser_get_content)'
    ]
  },

  'browser_extract_semantic': {
    name: 'browser_extract_semantic',
    category: 'extraction',
    description: 'AI-powered extraction of semantically meaningful content (articles, profiles, posts, products)',
    searchable_keywords: ['extract', 'semantic', 'article', 'profile', 'post', 'product', 'content', 'ai'],
    use_cases: [
      'Extract article content with metadata',
      'Get LinkedIn profile information',
      'Parse social media posts',
      'Extract product details from e-commerce'
    ],
    related_tools: ['browser_extract_structured', 'browser_extract_by_pattern', 'browser_get_content'],
    when_to_use: [
      'Need article title, author, date, content',
      'Extracting user profiles with experience/education',
      'Getting social post engagement metrics',
      'Product information with ratings/reviews'
    ],
    when_not_to_use: [
      'Need specific DOM patterns (use browser_extract_by_pattern)',
      'Raw HTML structure needed (use browser_extract_structured)',
      'Simple text content (use browser_get_content)'
    ]
  },

  'browser_extract_by_pattern': {
    name: 'browser_extract_by_pattern',
    category: 'extraction',
    description: 'Extract content using predefined patterns for common data types',
    searchable_keywords: ['extract', 'pattern', 'social', 'job', 'product', 'news', 'profile', 'linkedin'],
    use_cases: [
      'Extract multiple social posts from feed',
      'Get job listings with salary/location',
      'Parse product listings with prices',
      'Extract news articles from homepage',
      'Get user profiles from search results'
    ],
    related_tools: ['browser_extract_semantic', 'browser_extract_structured', 'browser_execute_workflow'],
    when_to_use: [
      'Extracting multiple items of same type',
      'LinkedIn feed scraping',
      'Job board extraction',
      'E-commerce product lists',
      'News aggregation'
    ],
    when_not_to_use: [
      'Single item extraction (use browser_extract_semantic)',
      'Custom non-standard patterns (use browser_extract_structured)',
      'Need workflow with pagination (use browser_execute_workflow)'
    ],
    examples: [
      {
        scenario: 'Extract LinkedIn posts from feed',
        input: { pattern: 'social_post', limit: 10 },
        when_to_use: 'Analyzing post engagement on LinkedIn feed',
        expected_output: 'Array of posts with author, content, likes, comments, shares'
      },
      {
        scenario: 'Get job listings with filters',
        input: { pattern: 'job_listing', filters: { location_contains: 'Remote' }, limit: 20 },
        when_to_use: 'Finding remote job opportunities',
        expected_output: 'Array of remote jobs with title, company, salary, requirements'
      }
    ]
  },

  'browser_execute_workflow': {
    name: 'browser_execute_workflow',
    category: 'advanced',
    description: 'Execute multi-step workflows with templates (infinite scroll, form fill, pagination)',
    searchable_keywords: ['workflow', 'automation', 'scroll', 'pagination', 'form', 'multi-step', 'template'],
    use_cases: [
      'Auto-scroll to load all content',
      'Fill and submit forms',
      'Navigate through paginated results',
      'Wait for elements and extract data',
      'Complex multi-step browser automation'
    ],
    related_tools: ['browser_extract_by_pattern', 'browser_click', 'browser_type', 'browser_wait_for'],
    when_to_use: [
      'Need to scroll through infinite feed',
      'Filling out multi-field forms',
      'Collecting data across multiple pages',
      'Complex automation requiring multiple steps'
    ],
    when_not_to_use: [
      'Simple single action (use individual tools)',
      'No repetitive patterns needed',
      'Static page extraction'
    ],
    examples: [
      {
        scenario: 'Scroll LinkedIn feed and extract posts',
        input: { template: 'infinite_scroll', template_params: { item_selector: '.feed-shared-update-v2', max_scrolls: 5 } },
        when_to_use: 'Need to load and extract posts from lazy-loaded feed',
        expected_output: 'All posts loaded after 5 scrolls with items collected count'
      },
      {
        scenario: 'Fill job application form',
        input: { template: 'form_fill', template_params: { fields: [{ selector: '#name', value: 'John Doe' }], submit_selector: 'button[type="submit"]' } },
        when_to_use: 'Automating job application submission',
        expected_output: 'Form filled and submitted successfully'
      }
    ]
  }
};

/**
 * Search tools by query string
 * Returns top 10 most relevant tools ranked by score
 *
 * @param query - Search query
 * @returns Array of matching tools with scores, sorted by relevance
 */
export function searchTools(query: string): Array<{ name: string; score: number }> {
  const queryLower = query.toLowerCase();
  const results: Array<{ name: string; score: number }> = [];

  for (const [name, metadata] of Object.entries(TOOL_INDEX)) {
    let score = 0;

    // Score by keyword matches (weight: 2)
    for (const keyword of metadata.searchable_keywords) {
      if (queryLower.includes(keyword) || keyword.includes(queryLower)) {
        score += 2;
      }
    }

    // Score by use case matches (weight: 3 - higher priority)
    for (const useCase of metadata.use_cases) {
      if (useCase.toLowerCase().includes(queryLower)) {
        score += 3;
      }
    }

    // Score by description match (weight: 1)
    if (metadata.description.toLowerCase().includes(queryLower)) {
      score += 1;
    }

    // Score by category match (weight: 2)
    if (metadata.category.includes(queryLower)) {
      score += 2;
    }

    if (score > 0) {
      results.push({ name, score });
    }
  }

  // Sort by score descending, limit to top 10
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolMetadata['category']): ToolMetadata[] {
  return Object.values(TOOL_INDEX).filter(t => t.category === category);
}

/**
 * Get tool metadata by name
 */
export function getToolMetadata(toolName: string): ToolMetadata | undefined {
  return TOOL_INDEX[toolName];
}
