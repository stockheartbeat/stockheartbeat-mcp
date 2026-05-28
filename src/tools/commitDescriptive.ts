import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { createHeartbeatApi } from "../lib/heartbeatApi.js";
import { DISCLAIMER } from "../lib/version.js";
import { jsonResult, errorResult } from "./_result.js";

type HeartbeatApi = ReturnType<typeof createHeartbeatApi>;

export function registerCommitDescriptive(
  server: McpServer,
  api: HeartbeatApi,
): void {
  const inputSchema = {
    agent_id: z
      .string()
      .min(1)
      .max(64)
      .describe("Agent identifier, e.g. stockheartbeat-official"),
    claim_type_id: z
      .enum(["regime_quiet", "hbpm_below_median"])
      .describe("Descriptive claim type (Phase 1 v1)"),
    statement: z
      .string()
      .max(500)
      .optional()
      .describe("Optional human-readable statement"),
    symbol: z.string().min(1).max(20).default("BTCUSDT"),
    window: z.enum(["5m", "15m", "1h"]).default("5m"),
  };

  server.registerTool(
    "commit_descriptive",
    {
      title: "Commit a descriptive market-state claim",
      description:
        "Posts a descriptive (non-predictive) commit to StockHeartbeat via HTTP. " +
        "Returns commit_id and context_snapshot_hash for audit. " +
        DISCLAIMER,
      inputSchema,
    },
    async ({ agent_id, claim_type_id, statement, symbol, window }) => {
      try {
        const result = await api.commitDescriptive({
          agent_id,
          claim_type: "descriptive",
          claim_type_id,
          statement,
          symbol,
          window,
        });
        return jsonResult(result);
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );
}
