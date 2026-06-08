/**
 * Tool: get_figma_styles
 *
 * Retrieve all shared styles (colors, text styles, effects, grids)
 * from a Figma file. These are the design system primitives.
 *
 * Figma API: GET /v1/files/:file_key/styles
 */

import type { ToolEntry, Env, ToolResult } from "../types";
import { figmaGet } from "../figma-api";
import { isNonEmptyString } from "../utils";

const definition = {
  name: "get_figma_styles",
  description:
    "Retrieve all shared styles from a Figma file. " +
    "Returns fill styles (colors), text styles (typography), effect styles (shadows, blurs), " +
    "and grid styles. These are the reusable design primitives defined in the Figma file's " +
    "design system. Style types include: FILL, TEXT, EFFECT, GRID.",
  inputSchema: {
    type: "object" as const,
    properties: {
      file_key: {
        type: "string",
        description: "The Figma file key",
      },
    },
    required: ["file_key"],
  },
};

async function handler(
  params: Record<string, unknown>,
  env: Env
): Promise<ToolResult> {
  const { file_key } = params;

  if (!isNonEmptyString(file_key)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: file_key is required and must be a non-empty string",
        },
      ],
      isError: true,
    };
  }

  const path = `/files/${file_key}/styles`;

  try {
    const result = await figmaGet(path, env.FIGMA_PAT);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Figma API error: ${message}` }],
      isError: true,
    };
  }
}

export const getFigmaStyles: ToolEntry = { definition, handler };
