/**
 * CDP Accessibility Types
 * Types for Chrome DevTools Protocol Accessibility domain
 */

/**
 * Accessibility node from CDP
 */
export interface AccessibilityNode {
  nodeId: string;
  backendDOMNodeId: number;
  role: {
    type: string;
    value: string;
  };
  name?: {
    type: string;
    value: string;
    sources?: Array<{
      type: string;
      value?: { type: string; value: string };
      attribute?: string;
      attributeValue?: { type: string; value: string };
      superseded?: boolean;
      invalid?: boolean;
      invalidReason?: string;
    }>;
  };
  description?: {
    type: string;
    value: string;
    sources?: any[];
  };
  value?: {
    type: string;
    value: string | number;
  };
  properties?: Array<{
    name: string;
    value: {
      type: string;
      value: any;
    };
  }>;
  childIds?: string[];
  parentId?: string;
  ignored?: boolean;
  ignoredReasons?: Array<{
    name: string;
    value?: { type: string; value: any };
  }>;
}

/**
 * Accessibility tree with indexed nodes
 */
export interface AccessibilityTree {
  nodes: AccessibilityNode[];
  nodeMap: Map<string, AccessibilityNode>;
  timestamp: number;
}

/**
 * Query options for accessibility tree
 */
export interface AccessibilityQueryOptions {
  role?: string;
  name?: string;
  includeIgnored?: boolean;
  maxDepth?: number;
}

/**
 * DOM node resolution result
 */
export interface ResolvedDOMNode {
  objectId: string;
  nodeId: number;
  backendNodeId: number;
}
