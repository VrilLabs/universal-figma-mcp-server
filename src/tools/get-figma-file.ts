/**
 * Tool: get_figma_file
 *
 * Retrieve the document tree of a Figma file including all pages,
 * frames, and layers. Supports depth control for limiting traversal.
 *
 * Figma API: GET /v1/files/:file_key?depth=N
 */

import type { ToolEntry, Env, ToolResult } from "../types";
import { figmaGet } from "../figma-api";
import { isNonEmptyString, isNonNegativeInteger } from "../utils";

const definition = {
  name: "get_figma_file",
  description:
    "Retrieve the document tree of a Figma file including all pages, frames, and layers. " +
    "Use depth parameter to control how deep to traverse the tree (default: 2). " +
    "The file_key can be found in the Figma URL: figma.com/design/FILE_KEY/file-name",
  inputSchema: {
    type: "object" as const,
    properties: {
      file_key: {
        type: "string",
        description:
          "The Figma file key (from the file URL: figma.com/design/FILE_KEY/...)",
      },
      depth: {
        type: "number",
        description:
          "How deep to traverse the document tree (default: 2). Use 1 for top-level pages only.",
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

  const depth = params.depth;
  let path = `/files/${file_key}`;

  if (depth !== undefined) {
    if (!isNonNegativeInteger(depth)) {
      return {
        content: [
          {
            type: "text",
            text: "Error: depth must be a non-negative integer",
          },
        ],
        isError: true,
      };
    }
    path += `?depth=${depth}`;
  } else {
    path += "?depth=2";
  }

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

export const getFigmaFile: ToolEntry = { definition, handler };
