/**
 * TypeScript interfaces for the Figma MCP Access server.
 */

/** Cloudflare Worker environment bindings */
export interface Env {
  FIGMA_PAT: string;
  SERVICE_BEARER_TOKEN: string;
}

/** MCP JSON-RPC 2.0 request */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

/** MCP JSON-RPC 2.0 response (success) */
export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
}

/** MCP JSON-RPC 2.0 error response */
export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/** JSON-RPC error codes */
export const JsonRpcErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

/** MCP server info returned by initialize */
export interface ServerInfo {
  name: string;
  version: string;
}

/** MCP server capabilities */
export interface ServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
}

/** MCP tool definition (for tools/list) */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** MCP tool result content item */
export interface ToolResultContent {
  type: "text";
  text: string;
}

/** MCP tool result (for tools/call) */
export interface ToolResult {
  content: ToolResultContent[];
  isError?: boolean;
}

/** Tool handler function signature */
export type ToolHandler = (
  params: Record<string, unknown>,
  env: Env
) => Promise<ToolResult>;

/** Tool registration entry */
export interface ToolEntry {
  definition: McpToolDefinition;
  handler: ToolHandler;
}

/** Figma API error response shape */
export interface FigmaApiError {
  status: number;
  err: string;
}

/** Rate limit info parsed from Figma API response headers */
export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  retryAfter: number | null;
}

/** Initialize result */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: ServerInfo;
}
