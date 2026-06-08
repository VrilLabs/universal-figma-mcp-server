/**
 * Tool: get_figma_components
 *
 * List all published components in a Figma file. Returns component metadata
 * including name, description, and component properties.
 *
 * Figma API: GET /v1/files/:file_key/components
 */

import type { ToolEntry, Env, ToolResult } from "../types";
import { figmaGet } from "../figma-api";
import { isNonEmptyString } from "../utils";

const definition = {
  name: "get_figma_components",
  description:
    "List all published components in a Figma file. " +
    "Returns component metadata including name, description, component properties, " +
    "and the component set they belong to. Useful for understanding the design system " +
    "and available UI components.",
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

  const path = `/files/${file_key}/components`;

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

export const getFigmaComponents: ToolEntry = { definition, handler };
