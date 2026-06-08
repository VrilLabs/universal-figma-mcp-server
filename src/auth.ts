/**
 * Bearer token authentication for the Figma MCP Access server.
 */

import type { Env } from "./types";
import { jsonResponse } from "./utils";

/**
 * Validate the Authorization header against the configured SERVICE_BEARER_TOKEN.
 * Returns null if authentication passes, or a 401 Response if it fails.
 */
export function authenticate(
  request: Request,
  env: Env
): Response | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return jsonResponse(
      { error: "Unauthorized", message: "Missing Authorization header" },
      401
    );
  }

  if (!env.SERVICE_BEARER_TOKEN) {
    return jsonResponse(
      { error: "Server configuration error", message: "SERVICE_BEARER_TOKEN is not configured" },
      500
    );
  }

  const expected = `Bearer ${env.SERVICE_BEARER_TOKEN}`;
  if (authHeader !== expected) {
    return jsonResponse(
      { error: "Unauthorized", message: "Invalid bearer token" },
      401
    );
  }

  return null;
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns a Response for OPTIONS, or null for non-OPTIONS requests.
 */
export function handleCorsPreflightRequest(request: Request): Response | null {
  if (request.method !== "OPTIONS") {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
