/**
 * CDP UID-Based Interaction Module
 * Interact with elements using accessibility UIDs instead of CSS selectors
 */

import { CDPSession } from 'playwright';
import { browserManager } from '../../browser-manager.js';
import {
  getNodeByUID,
  resolveToDOMObject,
  isInteractive
} from './accessibility.js';
import { AccessibilityNode } from './types.js';

/**
 * Click element by accessibility UID
 * More reliable than CSS selectors on dynamic pages
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 * @param options - Click options
 */
export async function clickByUID(
  domain: string,
  uid: string,
  options?: {
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
    scrollIntoView?: boolean;
  }
): Promise<void> {
  const node = await getNodeByUID(domain, uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  if (node.ignored) {
    throw new Error(`Node is ignored by accessibility tree: ${uid}`);
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const domObject = await resolveToDOMObject(node, cdpSession);

  try {
    // Scroll into view if requested
    if (options?.scrollIntoView !== false) {
      await cdpSession.send('Runtime.callFunctionOn', {
        objectId: domObject.objectId,
        functionDeclaration: `function() {
          this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }`
      });

      // Wait for scroll animation
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Click the element
    const button = options?.button || 'left';
    const clickCount = options?.clickCount || 1;

    await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function(button, clickCount) {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: button === 'left' ? 0 : button === 'right' ? 2 : 1,
          detail: clickCount
        });
        this.dispatchEvent(event);
        this.click();
      }`,
      arguments: [
        { value: button },
        { value: clickCount }
      ]
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to click element ${uid}: ${errorMsg}`);
  }
}

/**
 * Fill input by accessibility UID
 * Works with textboxes, searchboxes, and other input fields
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 * @param value - Text to fill
 */
export async function fillByUID(
  domain: string,
  uid: string,
  value: string
): Promise<void> {
  const node = await getNodeByUID(domain, uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  if (node.ignored) {
    throw new Error(`Node is ignored by accessibility tree: ${uid}`);
  }

  // Verify it's an input field
  const inputRoles = ['textbox', 'searchbox', 'combobox'];
  if (!inputRoles.includes(node.role.value)) {
    throw new Error(`Node ${uid} is not an input field (role: ${node.role.value})`);
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const domObject = await resolveToDOMObject(node, cdpSession);

  try {
    // Focus, clear, and fill the input
    await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function(value) {
        // Scroll into view
        this.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Focus the element
        this.focus();

        // Clear existing value
        this.value = '';

        // Set new value
        this.value = value;

        // Trigger input events
        this.dispatchEvent(new Event('input', { bubbles: true }));
        this.dispatchEvent(new Event('change', { bubbles: true }));

        // Trigger keyboard events for frameworks that listen to them
        this.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        this.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      }`,
      arguments: [{ value }]
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fill element ${uid}: ${errorMsg}`);
  }
}

/**
 * Type text into element by UID (character by character)
 * Slower than fillByUID but triggers all keyboard events
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 * @param text - Text to type
 * @param options - Typing options
 */
export async function typeByUID(
  domain: string,
  uid: string,
  text: string,
  options?: {
    delay?: number;
  }
): Promise<void> {
  const node = await getNodeByUID(domain, uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const domObject = await resolveToDOMObject(node, cdpSession);
  const delay = options?.delay || 50;

  try {
    // Focus the element
    await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function() {
        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.focus();
      }`
    });

    // Type each character with delay
    for (const char of text) {
      await cdpSession.send('Runtime.callFunctionOn', {
        objectId: domObject.objectId,
        functionDeclaration: `function(char) {
          // Append character
          this.value += char;

          // Trigger events
          this.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
          this.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
          this.dispatchEvent(new Event('input', { bubbles: true }));
          this.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
        }`,
        arguments: [{ value: char }]
      });

      // Delay between characters
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Trigger final change event
    await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function() {
        this.dispatchEvent(new Event('change', { bubbles: true }));
      }`
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to type into element ${uid}: ${errorMsg}`);
  }
}

/**
 * Get text content from element by UID
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 * @returns Text content
 */
export async function getTextByUID(
  domain: string,
  uid: string
): Promise<string> {
  const node = await getNodeByUID(domain, uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const domObject = await resolveToDOMObject(node, cdpSession);

  try {
    const result = await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function() {
        return this.textContent || this.innerText || '';
      }`,
      returnByValue: true
    });

    return String(result.result.value || '');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get text from element ${uid}: ${errorMsg}`);
  }
}

/**
 * Get value from input element by UID
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 * @returns Input value
 */
export async function getValueByUID(
  domain: string,
  uid: string
): Promise<string> {
  const node = await getNodeByUID(domain, uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const domObject = await resolveToDOMObject(node, cdpSession);

  try {
    const result = await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function() {
        return this.value || '';
      }`,
      returnByValue: true
    });

    return String(result.result.value || '');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get value from element ${uid}: ${errorMsg}`);
  }
}

/**
 * Hover over element by UID
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 */
export async function hoverByUID(
  domain: string,
  uid: string
): Promise<void> {
  const node = await getNodeByUID(domain, uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const domObject = await resolveToDOMObject(node, cdpSession);

  try {
    await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function() {
        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const event = new MouseEvent('mouseover', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        this.dispatchEvent(event);
      }`
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to hover over element ${uid}: ${errorMsg}`);
  }
}

/**
 * Check if element is visible
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 * @returns True if visible
 */
export async function isVisibleByUID(
  domain: string,
  uid: string
): Promise<boolean> {
  const node = await getNodeByUID(domain, uid);
  if (!node || node.ignored) {
    return false;
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const domObject = await resolveToDOMObject(node, cdpSession);

  try {
    const result = await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function() {
        const rect = this.getBoundingClientRect();
        const style = window.getComputedStyle(this);

        return rect.width > 0 &&
               rect.height > 0 &&
               style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0';
      }`,
      returnByValue: true
    });

    return Boolean(result.result.value);
  } catch (error) {
    return false;
  }
}

/**
 * Scroll to element by UID
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 * @param options - Scroll options
 */
export async function scrollToByUID(
  domain: string,
  uid: string,
  options?: {
    block?: 'start' | 'center' | 'end' | 'nearest';
    behavior?: 'auto' | 'smooth';
  }
): Promise<void> {
  const node = await getNodeByUID(domain, uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const domObject = await resolveToDOMObject(node, cdpSession);

  const block = options?.block || 'center';
  const behavior = options?.behavior || 'smooth';

  try {
    await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function(block, behavior) {
        this.scrollIntoView({ block, behavior });
      }`,
      arguments: [
        { value: block },
        { value: behavior }
      ]
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to scroll to element ${uid}: ${errorMsg}`);
  }
}

/**
 * Wait for element to become visible by UID
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 * @param timeout - Timeout in milliseconds
 */
export async function waitForVisibleByUID(
  domain: string,
  uid: string,
  timeout: number = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const visible = await isVisibleByUID(domain, uid);
      if (visible) {
        return;
      }
    } catch (error) {
      // Element might not exist yet, continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Element ${uid} did not become visible within ${timeout}ms`);
}

/**
 * Click multiple elements in sequence
 * Useful for batch operations
 *
 * @param domain - Domain
 * @param uids - Array of UIDs to click
 * @param delay - Delay between clicks in ms
 */
export async function clickMultiple(
  domain: string,
  uids: string[],
  delay: number = 1000
): Promise<void> {
  for (const uid of uids) {
    await clickByUID(domain, uid);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Get attribute value from element by UID
 *
 * @param domain - Domain
 * @param uid - Accessibility node UID
 * @param attribute - Attribute name
 * @returns Attribute value or null
 */
export async function getAttributeByUID(
  domain: string,
  uid: string,
  attribute: string
): Promise<string | null> {
  const node = await getNodeByUID(domain, uid);
  if (!node) {
    throw new Error(`Accessibility node not found: ${uid}`);
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);
  const domObject = await resolveToDOMObject(node, cdpSession);

  try {
    const result = await cdpSession.send('Runtime.callFunctionOn', {
      objectId: domObject.objectId,
      functionDeclaration: `function(attr) {
        return this.getAttribute(attr);
      }`,
      arguments: [{ value: attribute }],
      returnByValue: true
    });

    return result.result.value as string | null;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get attribute ${attribute} from element ${uid}: ${errorMsg}`);
  }
}
