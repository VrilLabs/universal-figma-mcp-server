/**
 * Tool: get_team_components
 *
 * List all published components across the entire Figma team or organization.
 * Supports pagination for large component libraries.
 *
 * Figma API: GET /v1/teams/:team_id/components?page_number=N
 */

import type { ToolEntry, Env, ToolResult } from "../types";
import { figmaGet } from "../figma-api";
import { isNonEmptyString, isNonNegativeInteger } from "../utils";

const definition = {
  name: "get_team_components",
  description:
    "List all published components across the entire Figma team or organization. " +
    "Returns component metadata across all team projects. Supports pagination. " +
    "The team_id can be found in the Figma URL: figma.com/files/team/TEAM_ID/...",
  inputSchema: {
    type: "object" as const,
    properties: {
      team_id: {
        type: "string",
        description:
          "The Figma team ID (from figma.com/files/team/TEAM_ID/...)",
      },
      page: {
        type: "number",
        description:
          "Page number for pagination (default: 1). Each page contains up to 50 components.",
      },
    },
    required: ["team_id"],
  },
};

async function handler(
  params: Record<string, unknown>,
  env: Env
): Promise<ToolResult> {
  const { team_id } = params;

  if (!isNonEmptyString(team_id)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: team_id is required and must be a non-empty string",
        },
      ],
      isError: true,
    };
  }

  const page = params.page;
  let path = `/teams/${team_id}/components`;

  if (page !== undefined) {
    if (!isNonNegativeInteger(page) || page < 1) {
      return {
        content: [
          {
            type: "text",
            text: "Error: page must be a positive integer",
          },
        ],
        isError: true,
      };
    }
    path += `?page_number=${page}`;
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

export const getTeamComponents: ToolEntry = { definition, handler };
