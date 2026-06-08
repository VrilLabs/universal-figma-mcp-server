/**
 * Figma MCP Access — Cloudflare Worker entry point.
 *
 * This is the main entry point for the Cloudflare Worker deployment.
 * It handles:
 * - CORS preflight requests
 * - Bearer token authentication
 * - Routing to the MCP JSON-RPC handler
 * - Serving the test client HTML page
 * - Health check endpoint
 */

import type { Env } from "./types";
import { authenticate, handleCorsPreflightRequest } from "./auth";
import { handleMcpRequest } from "./mcp-handler";
import { jsonResponse } from "./utils";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight requests
    const corsResponse = handleCorsPreflightRequest(request);
    if (corsResponse) {
      return corsResponse;
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check endpoint (no auth required)
    if (path === "/health" && request.method === "GET") {
      return jsonResponse({
        status: "ok",
        service: "figma-mcp-proxy",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      });
    }

    // Serve test client HTML (no auth required for convenience during testing)
    if (path === "/" || path === "/test" || path === "/test-client") {
      if (request.method === "GET") {
        try {
          const testClientUrl = new URL("/public/test-client.html", url.origin);
          const testClientResponse = await fetch(testClientUrl);
          if (testClientResponse.ok) {
            return testClientResponse;
          }
        } catch {
          // Fall through to JSON response if static asset not available
        }
        return jsonResponse({
          service: "figma-mcp-proxy",
          version: "1.0.0",
          endpoints: {
            mcp: "/mcp",
            health: "/health",
          },
        });
      }
    }

    // MCP endpoint — requires authentication
    if (path === "/mcp") {
      // Authenticate the request
      const authError = authenticate(request, env);
      if (authError) {
        return authError;
      }

      // Only accept POST requests for MCP
      if (request.method !== "POST") {
        return jsonResponse(
          { error: "Method not allowed", message: "The /mcp endpoint only accepts POST requests" },
          405
        );
      }

      // Parse request body and handle MCP protocol
      try {
        const body = await request.text();
        if (!body || body.trim().length === 0) {
          return jsonResponse(
            {
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32600,
                message: "Invalid Request: empty body",
              },
            }
          );
        }

        return await handleMcpRequest(body, env);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return jsonResponse(
          {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32603,
              message: `Internal error: ${message}`,
            },
          },
          500
        );
      }
    }

    // 404 for unknown paths
    return jsonResponse(
      { error: "Not found", message: `No handler for ${request.method} ${path}` },
      404
    );
  },
};
