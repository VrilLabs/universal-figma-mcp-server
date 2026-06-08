/**
 * Tool: get_figma_comments
 *
 * Retrieve all comments on a Figma file. Useful for reading design
 * annotations, feedback, and reviewer notes left by designers.
 *
 * Figma API: GET /v1/files/:file_key/comments
 */

import type { ToolEntry, Env, ToolResult } from "../types";
import { figmaGet } from "../figma-api";
import { isNonEmptyString } from "../utils";

const definition = {
  name: "get_figma_comments",
  description:
    "Retrieve all comments on a Figma file. " +
    "Returns comments including the author, timestamp, message text, " +
    "and location (frame/node the comment is attached to). " +
    "Useful for reading design annotations, review feedback, and designer notes.",
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

  const path = `/files/${file_key}/comments`;

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

export const getFigmaComments: ToolEntry = { definition, handler };
