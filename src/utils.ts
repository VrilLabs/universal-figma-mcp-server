/**
 * Utility functions for the Figma MCP Access server.
 */

import { type JsonRpcErrorResponse, type JsonRpcResponse, JsonRpcErrorCodes } from "./types";

/**
 * Create a successful JSON-RPC 2.0 response.
 */
export function createSuccessResponse(
  id: string | number | null,
  result: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

/**
 * Create a JSON-RPC 2.0 error response.
 */
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcErrorResponse {
  const error: JsonRpcErrorResponse["error"] = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return {
    jsonrpc: "2.0",
    id,
    error,
  };
}

/**
 * Create a parse error response (code -32700).
 */
export function parseErrorResponse(): JsonRpcErrorResponse {
  return createErrorResponse(null, JsonRpcErrorCodes.PARSE_ERROR, "Parse error");
}

/**
 * Create an invalid request error response (code -32600).
 */
export function invalidRequestResponse(
  id: string | number | null,
  message = "Invalid Request"
): JsonRpcErrorResponse {
  return createErrorResponse(id, JsonRpcErrorCodes.INVALID_REQUEST, message);
}

/**
 * Create a method not found error response (code -32601).
 */
export function methodNotFoundResponse(
  id: string | number | null,
  method: string
): JsonRpcErrorResponse {
  return createErrorResponse(
    id,
    JsonRpcErrorCodes.METHOD_NOT_FOUND,
    `Method not found: ${method}`
  );
}

/**
 * Create an invalid params error response (code -32602).
 */
export function invalidParamsResponse(
  id: string | number | null,
  message: string
): JsonRpcErrorResponse {
  return createErrorResponse(id, JsonRpcErrorCodes.INVALID_PARAMS, message);
}

/**
 * Create an internal error response (code -32603).
 */
export function internalErrorResponse(
  id: string | number | null,
  message: string
): JsonRpcErrorResponse {
  return createErrorResponse(id, JsonRpcErrorCodes.INTERNAL_ERROR, message);
}

/**
 * Create a CORS-friendly Response object with JSON body.
 */
export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...extraHeaders,
    },
  });
}

/**
 * Validate that a value is a string and non-empty.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Validate that a value is a non-negative integer.
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Safely parse JSON, returning null on failure.
 */
export function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
