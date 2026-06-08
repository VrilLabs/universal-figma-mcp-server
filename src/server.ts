/**
 * Figma MCP Access — Standalone Bun server.
 *
 * This is an alternative entry point that runs as a standalone Node.js/Bun
 * server on port 8788, implementing the same MCP protocol as the Cloudflare
 * Worker version. This allows local testing without Cloudflare.
 *
 * Usage:
 *   bun run src/server.ts
 *   # or
 *   bun run start
 *
 * Environment variables (or .env file):
 *   FIGMA_PAT             - Figma Personal Access Token (required)
 *   SERVICE_BEARER_TOKEN  - Bearer token for client authentication (required)
 *   PORT                  - Server port (default: 8788)
 */

import { handleMcpRequest } from "./mcp-handler";
import { jsonResponse } from "./utils";

/** Standalone server environment (mirrors Cloudflare Worker Env) */
interface ServerEnv {
  FIGMA_PAT: string;
  SERVICE_BEARER_TOKEN: string;
}

/** Load environment variables */
function loadEnv(): ServerEnv {
  const FIGMA_PAT = process.env.FIGMA_PAT || "";
  const SERVICE_BEARER_TOKEN = process.env.SERVICE_BEARER_TOKEN || "";

  if (!FIGMA_PAT) {
    console.error("ERROR: FIGMA_PAT environment variable is not set");
    console.error("  Set it in your environment or create a .env file");
    process.exit(1);
  }

  if (!SERVICE_BEARER_TOKEN) {
    console.error("ERROR: SERVICE_BEARER_TOKEN environment variable is not set");
    console.error("  Generate one with: openssl rand -hex 32");
    process.exit(1);
  }

  return { FIGMA_PAT, SERVICE_BEARER_TOKEN };
}

/** Validate Bearer token authentication */
function authenticate(request: Request, env: ServerEnv): Response | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return jsonResponse(
      { error: "Unauthorized", message: "Missing Authorization header" },
      401
    );
  }

  if (authHeader !== `Bearer ${env.SERVICE_BEARER_TOKEN}`) {
    return jsonResponse(
      { error: "Unauthorized", message: "Invalid bearer token" },
      401
    );
  }

  return null;
}

/** Handle CORS preflight requests */
function handleCorsPreflightRequest(request: Request): Response | null {
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

/** Main request handler */
async function handleRequest(request: Request, env: ServerEnv): Promise<Response> {
  // Handle CORS preflight
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
      mode: "standalone",
      timestamp: new Date().toISOString(),
    });
  }

  // Root endpoint — server info
  if (path === "/" || path === "/test" || path === "/test-client") {
    if (request.method === "GET") {
      // Try to serve test client HTML from public directory
      try {
        const fs = await import("fs");
        const pathModule = await import("path");
        const htmlPath = pathModule.join(import.meta.dir, "..", "public", "test-client.html");
        const html = fs.readFileSync(htmlPath, "utf-8");
        return new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch {
        // Fall through to JSON response
      }

      return jsonResponse({
        service: "figma-mcp-proxy",
        version: "1.0.0",
        mode: "standalone",
        endpoints: {
          mcp: "/mcp",
          health: "/health",
          testClient: "/test-client",
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
        return jsonResponse({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32600,
            message: "Invalid Request: empty body",
          },
        });
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
}

// Start the server
const env = loadEnv();
const port = parseInt(process.env.PORT || "8788", 10);

const server = Bun.serve({
  port,
  async fetch(request: Request): Promise<Response> {
    return handleRequest(request, env);
  },
});

console.log(`\n  🎨 Figma MCP Access Server (standalone)`);
console.log(`  ─────────────────────────────────────────`);
console.log(`  Local:    http://localhost:${port}`);
console.log(`  MCP:      http://localhost:${port}/mcp`);
console.log(`  Health:   http://localhost:${port}/health`);
console.log(`  Test UI:  http://localhost:${port}/test-client`);
console.log(`  ─────────────────────────────────────────`);
console.log(`  Auth:     Bearer token required for /mcp`);
console.log(`  Figma:    PAT configured (${env.FIGMA_PAT.substring(0, 8)}...)`);
console.log(`\n  Ready.\n`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n  Shutting down...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n  Shutting down...");
  server.stop();
  process.exit(0);
});
