/**
 * CDP Accessibility Tree Module
 * Provides rich accessibility tree access via Chrome DevTools Protocol
 */

import { CDPSession } from 'playwright';
import { browserManager } from '../../browser-manager.js';
import {
  AccessibilityNode,
  AccessibilityTree,
  AccessibilityQueryOptions,
  ResolvedDOMNode
} from './types.js';

/**
 * Cache for accessibility trees (5 second TTL)
 */
const treeCache = new Map<string, { tree: AccessibilityTree; timestamp: number }>();
const CACHE_TTL_MS = 5000;

/**
 * Get full accessibility tree using CDP
 * Returns rich, LLM-friendly accessibility tree with UIDs
 *
 * @param domain - Domain to get tree for
 * @param options - Query options
 * @returns Accessibility tree with indexed nodes
 */
export async function getAccessibilityTree(
  domain: string,
  options?: AccessibilityQueryOptions
): Promise<AccessibilityTree> {
  // Check cache
  const cached = treeCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.tree;
  }

  const cdpSession = await browserManager.getOrCreateCDPSession(domain);

  try {
    // Enable accessibility domain
    await cdpSession.send('Accessibility.enable');

    // Get full accessibility tree
    const response = await cdpSession.send('Accessibility.getFullAXTree');
    const nodes = response.nodes as AccessibilityNode[];

    // Filter ignored nodes if requested
    const filteredNodes = options?.includeIgnored
      ? nodes
      : nodes.filter(n => !n.ignored);

    // Build node map for fast lookups
    const nodeMap = new Map<string, AccessibilityNode>();
    filteredNodes.forEach(node => {
      nodeMap.set(node.nodeId, node);
    });

    const tree: AccessibilityTree = {
      nodes: filteredNodes,
      nodeMap,
      timestamp: Date.now()
    };

    // Cache the tree
    treeCache.set(domain, { tree, timestamp: Date.now() });

    return tree;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get accessibility tree: ${errorMsg}`);
  }
}

/**
 * Query accessibility tree by role/name
 * More efficient than fetching full tree when you know what you're looking for
 *
 * @param domain - Domain to query
 * @param options - Query options (role, name)
 * @returns Matching accessibility nodes
 */
export async function queryAccessibilityTree(
  domain: string,
  options: AccessibilityQueryOptions
): Promise<AccessibilityNode[]> {
  const cdpSession = await browserManager.getOrCreateCDPSession(domain);

  try {
    // Enable accessibility domain
    await cdpSession.send('Accessibility.enable');

    // Query accessibility tree
    const response = await cdpSession.send('Accessibility.queryAXTree', {
      ...(options.role && { role: options.role }),
      ...(options.name && { accessibleName: options.name })
    });

    const nodes = response.nodes as AccessibilityNode[];

    // Filter ignored nodes if requested
    return options.includeIgnored
      ? nodes
      : nodes.filter(n => !n.ignored);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to query accessibility tree: ${errorMsg}`);
  }
}

/**
 * Find nodes by role
 * Convenience method for common use case
 *
 * @param domain - Domain to search
 * @param role - ARIA role (e.g., 'button', 'link', 'textbox')
 * @returns Matching nodes
 */
export async function findNodesByRole(
  domain: string,
  role: string
): Promise<AccessibilityNode[]> {
  const tree = await getAccessibilityTree(domain);
  return tree.nodes.filter(node => node.role.value === role);
}

/**
 * Find nodes by name (partial match)
 * Useful for finding elements by visible text
 *
 * @param domain - Domain to search
 * @param name - Name to search for (partial match)
 * @param caseSensitive - Whether search should be case sensitive
 * @returns Matching nodes
 */
export async function findNodesByName(
  domain: string,
  name: string,
  caseSensitive: boolean = false
): Promise<AccessibilityNode[]> {
  const tree = await getAccessibilityTree(domain);
  const searchName = caseSensitive ? name : name.toLowerCase();

  return tree.nodes.filter(node => {
    if (!node.name?.value) return false;
    const nodeName = caseSensitive ? node.name.value : node.name.value.toLowerCase();
    return nodeName.includes(searchName);
  });
}

/**
 * Find node by exact name
 * More efficient when you know the exact name
 *
 * @param domain - Domain to search
 * @param name - Exact name to match
 * @returns First matching node or undefined
 */
export async function findNodeByExactName(
  domain: string,
  name: string
): Promise<AccessibilityNode | undefined> {
  const tree = await getAccessibilityTree(domain);
  return tree.nodes.find(node => node.name?.value === name);
}

/**
 * Find nodes by role AND name
 * Common pattern for finding specific interactive elements
 *
 * @param domain - Domain to search
 * @param role - ARIA role
 * @param name - Name to search for (partial match)
 * @returns Matching nodes
 */
export async function findNodesByRoleAndName(
  domain: string,
  role: string,
  name: string
): Promise<AccessibilityNode[]> {
  const tree = await getAccessibilityTree(domain);
  const searchName = name.toLowerCase();

  return tree.nodes.filter(node => {
    if (node.role.value !== role) return false;
    if (!node.name?.value) return false;
    return node.name.value.toLowerCase().includes(searchName);
  });
}

/**
 * Get node by UID
 * Fast lookup using cached node map
 *
 * @param domain - Domain
 * @param uid - Node UID (nodeId)
 * @returns Node or undefined
 */
export async function getNodeByUID(
  domain: string,
  uid: string
): Promise<AccessibilityNode | undefined> {
  const tree = await getAccessibilityTree(domain);
  return tree.nodeMap.get(uid);
}

/**
 * Resolve accessibility node to DOM object
 * Required for interacting with the element (click, fill, etc.)
 *
 * @param node - Accessibility node
 * @param cdpSession - CDP session
 * @returns Resolved DOM object
 */
export async function resolveToDOMObject(
  node: AccessibilityNode,
  cdpSession: CDPSession
): Promise<ResolvedDOMNode> {
  try {
    const response = await cdpSession.send('DOM.resolveNode', {
      backendNodeId: node.backendDOMNodeId
    });

    if (!response.object.objectId) {
      throw new Error('Failed to get objectId from DOM resolution');
    }

    return {
      objectId: response.object.objectId,
      nodeId: 0, // Not available in CDP response
      backendNodeId: node.backendDOMNodeId
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve node to DOM object: ${errorMsg}`);
  }
}

/**
 * Get children of a node
 *
 * @param domain - Domain
 * @param node - Parent node
 * @returns Child nodes
 */
export async function getNodeChildren(
  domain: string,
  node: AccessibilityNode
): Promise<AccessibilityNode[]> {
  if (!node.childIds || node.childIds.length === 0) {
    return [];
  }

  const tree = await getAccessibilityTree(domain);
  const children: AccessibilityNode[] = [];

  for (const childId of node.childIds) {
    const child = tree.nodeMap.get(childId);
    if (child) {
      children.push(child);
    }
  }

  return children;
}

/**
 * Get parent of a node
 *
 * @param domain - Domain
 * @param node - Child node
 * @returns Parent node or undefined
 */
export async function getNodeParent(
  domain: string,
  node: AccessibilityNode
): Promise<AccessibilityNode | undefined> {
  if (!node.parentId) {
    return undefined;
  }

  const tree = await getAccessibilityTree(domain);
  return tree.nodeMap.get(node.parentId);
}

/**
 * Get property value from node
 * Helper to extract specific property values
 *
 * @param node - Accessibility node
 * @param propertyName - Property name
 * @returns Property value or undefined
 */
export function getNodeProperty(
  node: AccessibilityNode,
  propertyName: string
): any {
  if (!node.properties) return undefined;

  const prop = node.properties.find(p => p.name === propertyName);
  return prop?.value.value;
}

/**
 * Check if node is interactive
 * Determines if node can be clicked/focused
 *
 * @param node - Accessibility node
 * @returns True if interactive
 */
export function isInteractive(node: AccessibilityNode): boolean {
  const interactiveRoles = [
    'button',
    'link',
    'textbox',
    'searchbox',
    'checkbox',
    'radio',
    'combobox',
    'listbox',
    'menu',
    'menuitem',
    'tab',
    'switch',
    'slider'
  ];

  return interactiveRoles.includes(node.role.value);
}

/**
 * Check if node is focusable
 *
 * @param node - Accessibility node
 * @returns True if focusable
 */
export function isFocusable(node: AccessibilityNode): boolean {
  const focusable = getNodeProperty(node, 'focusable');
  return focusable === true;
}

/**
 * Get node description
 * Returns the most useful description of a node for LLMs
 *
 * @param node - Accessibility node
 * @returns Human-readable description
 */
export function getNodeDescription(node: AccessibilityNode): string {
  const parts: string[] = [];

  // Role
  parts.push(`Role: ${node.role.value}`);

  // Name
  if (node.name?.value) {
    parts.push(`Name: "${node.name.value}"`);
  }

  // Description
  if (node.description?.value) {
    parts.push(`Description: "${node.description.value}"`);
  }

  // Value (for inputs)
  if (node.value?.value !== undefined) {
    parts.push(`Value: "${node.value.value}"`);
  }

  // Interactive status
  if (isInteractive(node)) {
    parts.push('(interactive)');
  }

  // Ignored status
  if (node.ignored) {
    parts.push('(ignored)');
  }

  return parts.join(', ');
}

/**
 * Clear tree cache
 * Useful when page has updated and you need fresh data
 *
 * @param domain - Domain to clear cache for (or undefined for all)
 */
export function clearTreeCache(domain?: string): void {
  if (domain) {
    treeCache.delete(domain);
  } else {
    treeCache.clear();
  }
}

/**
 * Export tree to JSON
 * Useful for debugging and analysis
 *
 * @param tree - Accessibility tree
 * @returns JSON string
 */
export function exportTreeToJSON(tree: AccessibilityTree): string {
  return JSON.stringify({
    timestamp: tree.timestamp,
    nodeCount: tree.nodes.length,
    nodes: tree.nodes.map(node => ({
      nodeId: node.nodeId,
      backendDOMNodeId: node.backendDOMNodeId,
      role: node.role.value,
      name: node.name?.value,
      description: node.description?.value,
      value: node.value?.value,
      properties: node.properties?.map(p => ({
        name: p.name,
        value: p.value.value
      })),
      childIds: node.childIds,
      ignored: node.ignored
    }))
  }, null, 2);
}
