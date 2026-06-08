/**
 * Tool: get_figma_variables
 *
 * Retrieve all local variables (design tokens) from a Figma file.
 * Includes colors, spacing, typography, and other design tokens
 * defined as Figma variables.
 *
 * Figma API: GET /v1/files/:file_key/variables/local
 */

import type { ToolEntry, Env, ToolResult } from "../types";
import { figmaGet } from "../figma-api";
import { isNonEmptyString } from "../utils";

const definition = {
  name: "get_figma_variables",
  description:
    "Retrieve all local variables (design tokens) from a Figma file. " +
    "Returns color values, spacing scales, typography tokens, border radii, " +
    "and other design tokens defined as Figma variables. " +
    "Variables are organized by variable collections and modes (e.g., light/dark themes).",
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

  const path = `/files/${file_key}/variables/local`;

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

export const getFigmaVariables: ToolEntry = { definition, handler };
