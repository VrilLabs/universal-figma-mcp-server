/**
 * MCP JSON-RPC 2.0 protocol handler.
 *
 * Implements the Model Context Protocol server-side logic:
 * - initialize: Returns server capabilities and info
 * - tools/list: Returns all registered Figma tools with schemas
 * - tools/call: Dispatches to the appropriate tool handler
 *
 * All responses follow JSON-RPC 2.0 specification with proper
 * error codes: -32600 (Invalid Request), -32601 (Method not found),
 * -32602 (Invalid params).
 */

import type {
  Env,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcErrorResponse,
  InitializeResult,
  ToolEntry,
} from "./types";

import {
  createSuccessResponse,
  createErrorResponse,
  parseErrorResponse,
  invalidRequestResponse,
  methodNotFoundResponse,
  invalidParamsResponse,
  internalErrorResponse,
  jsonResponse,
  safeJsonParse,
} from "./utils";

import { getFigmaFile } from "./tools/get-figma-file";
import { getFigmaNode } from "./tools/get-figma-node";
import { getFigmaComponents } from "./tools/get-figma-components";
import { getFigmaVariables } from "./tools/get-figma-variables";
import { getFigmaComments } from "./tools/get-figma-comments";
import { getTeamComponents } from "./tools/get-team-components";
import { getFigmaStyles } from "./tools/get-figma-styles";

/** All registered tools indexed by name */
const tools: Map<string, ToolEntry> = new Map();

function registerTool(entry: ToolEntry): void {
  tools.set(entry.definition.name, entry);
}

// Register all 7 Figma tools
registerTool(getFigmaFile);
registerTool(getFigmaNode);
registerTool(getFigmaComponents);
registerTool(getFigmaVariables);
registerTool(getFigmaComments);
registerTool(getTeamComponents);
registerTool(getFigmaStyles);

/** Server metadata */
const SERVER_NAME = "figma-mcp-proxy";
const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2024-11-05";

/**
 * Handle the `initialize` method.
 * Returns server capabilities and info per the MCP specification.
 */
function handleInitialize(
  id: string | number | null,
  _params: Record<string, unknown> | undefined
): JsonRpcResponse {
  const result: InitializeResult = {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  };

  return createSuccessResponse(id, result);
}

/**
 * Handle the `tools/list` method.
 * Returns all registered tool definitions with their input schemas.
 */
function handleToolsList(
  id: string | number | null
): JsonRpcResponse {
  const toolDefinitions = Array.from(tools.values()).map(
    (entry) => entry.definition
  );

  return createSuccessResponse(id, {
    tools: toolDefinitions,
  });
}

/**
 * Handle the `tools/call` method.
 * Validates required params, looks up the tool, and dispatches to its handler.
 */
async function handleToolsCall(
  id: string | number | null,
  params: Record<string, unknown> | undefined,
  env: Env
): Promise<JsonRpcResponse | JsonRpcErrorResponse> {
  if (!params || typeof params !== "object") {
    return invalidParamsResponse(id, "tools/call requires a params object");
  }

  const toolName = params.name;
  if (typeof toolName !== "string" || toolName.length === 0) {
    return invalidParamsResponse(
      id,
      "tools/call requires a 'name' parameter (non-empty string)"
    );
  }

  const toolEntry = tools.get(toolName);
  if (!toolEntry) {
    return invalidParamsResponse(
      id,
      `Unknown tool: ${toolName}. Available tools: ${Array.from(tools.keys()).join(", ")}`
    );
  }

  const toolArguments = (params.arguments as Record<string, unknown>) ?? {};

  try {
    const result = await toolEntry.handler(toolArguments, env);
    return createSuccessResponse(id, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return internalErrorResponse(id, `Tool execution error: ${message}`);
  }
}

/**
 * Validate that a parsed object is a valid JSON-RPC 2.0 request.
 */
function isValidRequest(obj: unknown): obj is JsonRpcRequest {
  if (obj === null || typeof obj !== "object") return false;
  const candidate = obj as Record<string, unknown>;
  if (candidate.jsonrpc !== "2.0") return false;
  if (typeof candidate.method !== "string") return false;
  return true;
}

/**
 * Main MCP request handler.
 *
 * Parses the incoming JSON-RPC request, routes to the appropriate
 * method handler, and returns a JSON-RPC response.
 */
export async function handleMcpRequest(
  body: string,
  env: Env
): Promise<Response> {
  let parsed: unknown;

  try {
    parsed = safeJsonParse(body);
  } catch {
    return jsonResponse(parseErrorResponse());
  }

  if (parsed === null || typeof parsed !== "object") {
    return jsonResponse(parseErrorResponse());
  }

  // Handle batch requests (array of requests)
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return jsonResponse(invalidRequestResponse(null, "Empty batch request"));
    }

    const responses = await Promise.all(
      parsed.map((item) => processSingleRequest(item, env))
    );
    return jsonResponse(responses);
  }

  const response = await processSingleRequest(parsed, env);
  return jsonResponse(response);
}

/**
 * Process a single JSON-RPC request and return a response.
 */
async function processSingleRequest(
  request: unknown,
  env: Env
): Promise<JsonRpcResponse | JsonRpcErrorResponse> {
  if (!isValidRequest(request)) {
    return invalidRequestResponse(null);
  }

  const id = request.id ?? null;
  const { method, params } = request;

  switch (method) {
    case "initialize":
      return handleInitialize(id, params);

    case "notifications/initialized":
      // Client notification — no response needed, but we return empty for HTTP
      return createSuccessResponse(id, {});

    case "tools/list":
      return handleToolsList(id);

    case "tools/call":
      return await handleToolsCall(id, params, env);

    case "ping":
      return createSuccessResponse(id, {});

    default:
      return methodNotFoundResponse(id, method);
  }
}
