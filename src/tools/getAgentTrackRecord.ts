import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { createHeartbeatApi } from "../lib/heartbeatApi.js";
import { DISCLAIMER } from "../lib/version.js";
import { jsonResult, errorResult } from "./_result.js";

type HeartbeatApi = ReturnType<typeof createHeartbeatApi>;

export function registerGetAgentTrackRecord(
  server: McpServer,
  api: HeartbeatApi,
): void {
  const inputSchema = {
    agent_id: z
      .string()
      .min(1)
      .max(64)
      .describe("Agent identifier to look up resolved descriptive commits"),
  };

  server.registerTool(
    "get_agent_track_record",
    {
      title: "Get descriptive track record for an agent",
      description:
        "Returns resolved descriptive commits and descriptive accuracy metrics " +
        "(match vs mismatch). Not a predictive hit-rate leaderboard. " +
        DISCLAIMER,
      inputSchema,
    },
    async ({ agent_id }) => {
      try {
        const record = await api.getAgentTrackRecord(agent_id);
        return jsonResult(record);
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );
}
