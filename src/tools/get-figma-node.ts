/**
 * Tool: get_figma_node
 *
 * Retrieve a specific node (frame, component, layer) from a Figma file
 * by node ID. Returns detailed properties of the requested node.
 *
 * Figma API: GET /v1/files/:file_key/nodes?ids=ENCODED_NODE_ID
 */

import type { ToolEntry, Env, ToolResult } from "../types";
import { figmaGet } from "../figma-api";
import { isNonEmptyString } from "../utils";

const definition = {
  name: "get_figma_node",
  description:
    "Retrieve a specific node (frame, component, layer) from a Figma file by its node ID. " +
    "The node_id can be found in the Figma URL (?node-id=...) or from get_figma_file output. " +
    "Node IDs containing colons must be URL-encoded (e.g., '1:2' becomes '1%3A2'). " +
    "This tool handles encoding automatically.",
  inputSchema: {
    type: "object" as const,
    properties: {
      file_key: {
        type: "string",
        description: "The Figma file key",
      },
      node_id: {
        type: "string",
        description:
          "The node ID to retrieve (from the Figma URL ?node-id=... or from get_figma_file output)",
      },
    },
    required: ["file_key", "node_id"],
  },
};

async function handler(
  params: Record<string, unknown>,
  env: Env
): Promise<ToolResult> {
  const { file_key, node_id } = params;

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

  if (!isNonEmptyString(node_id)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: node_id is required and must be a non-empty string",
        },
      ],
      isError: true,
    };
  }

  const encodedNodeId = encodeURIComponent(node_id);
  const path = `/files/${file_key}/nodes?ids=${encodedNodeId}`;

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

export const getFigmaNode: ToolEntry = { definition, handler };
