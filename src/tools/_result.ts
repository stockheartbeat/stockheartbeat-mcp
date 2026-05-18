/**
 * Helpers for shaping MCP tool results.
 *
 * MCP returns content blocks; we wrap structured JSON payloads in a single
 * "text" block and rely on isError to flag failures. The return type is
 * the SDK's own CallToolResult so the McpServer typing accepts the handler
 * without manual casts.
 */
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function jsonResult(payload: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function errorResult(message: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: message }, null, 2),
      },
    ],
    isError: true,
  };
}
