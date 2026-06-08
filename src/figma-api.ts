/**
 * Figma REST API client.
 *
 * All Figma API calls go through the `figmaGet` function, which handles
 * authentication, error mapping, and rate limit header parsing.
 */

import type { RateLimitInfo } from "./types";

const FIGMA_API_BASE = "https://api.figma.com/v1";

/** Result of a Figma API call including rate limit metadata */
export interface FigmaApiResult {
  data: unknown;
  rateLimit: RateLimitInfo;
}

/**
 * Parse rate limit information from Figma API response headers.
 */
function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  const limit = headers.get("X-RateLimit-Limit");
  const remaining = headers.get("X-RateLimit-Remaining");
  const retryAfter = headers.get("Retry-After");

  return {
    limit: limit !== null ? parseInt(limit, 10) : null,
    remaining: remaining !== null ? parseInt(remaining, 10) : null,
    retryAfter: retryAfter !== null ? parseInt(retryAfter, 10) : null,
  };
}

/**
 * Map Figma API HTTP status codes to human-readable error messages.
 */
function mapFigmaError(status: number, body: string): string {
  switch (status) {
    case 401:
      return "Figma API authentication failed: Invalid or expired Personal Access Token";
    case 403:
      return "Figma API access forbidden: The token does not have permission to access this resource";
    case 404:
      return "Figma API resource not found: The requested file, node, or team does not exist or is not accessible";
    case 429:
      return "Figma API rate limit exceeded: Too many requests. Please retry after the indicated time";
    case 500:
      return "Figma API internal server error: The request could not be completed";
    case 502:
      return "Figma API bad gateway: The server received an invalid response from an upstream server";
    case 503:
      return "Figma API service unavailable: The server is temporarily unable to handle the request";
    default:
      return `Figma API error ${status}: ${body}`;
  }
}

/**
 * Make an authenticated GET request to the Figma REST API.
 *
 * @param path - API path relative to /v1 (e.g., "/files/ABC123?depth=2")
 * @param pat - Figma Personal Access Token
 * @returns Parsed JSON response and rate limit info
 * @throws Error with descriptive message on any API failure
 */
export async function figmaGet(path: string, pat: string): Promise<FigmaApiResult> {
  const url = `${FIGMA_API_BASE}${path}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Figma-Token": pat,
      "Accept": "application/json",
    },
  });

  const rateLimit = parseRateLimitHeaders(response.headers);

  if (!response.ok) {
    const body = await response.text();
    const errorMessage = mapFigmaError(response.status, body);

    const errorDetail: Record<string, unknown> = {
      status: response.status,
      message: errorMessage,
    };

    if (rateLimit.retryAfter !== null) {
      errorDetail.retryAfter = rateLimit.retryAfter;
    }
    if (rateLimit.limit !== null) {
      errorDetail.rateLimitLimit = rateLimit.limit;
    }
    if (rateLimit.remaining !== null) {
      errorDetail.rateLimitRemaining = rateLimit.remaining;
    }

    throw new Error(JSON.stringify(errorDetail));
  }

  const data = await response.json();
  return { data, rateLimit };
}
