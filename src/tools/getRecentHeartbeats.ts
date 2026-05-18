import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DataSource } from "../sources/index.js";
import { DISCLAIMER } from "../lib/version.js";
import { jsonResult, errorResult } from "./_result.js";

export function registerGetRecentHeartbeats(
  server: McpServer,
  source: DataSource,
): void {
  const inputSchema = {
    symbol: z
      .string()
      .min(1)
      .max(20)
      .default("BTCUSDT")
      .describe("Trading symbol, e.g. BTCUSDT. Defaults to BTCUSDT."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe(
        "How many most recent closed buckets to return, oldest first. Default 20, max 100.",
      ),
  };

  server.registerTool(
    "get_recent_heartbeats",
    {
      title: "Get the recent closed heartbeats",
      description:
        "Returns the most recent N closed dollar-notional buckets for the given symbol, oldest first. " +
        "Use this to give the LLM a short timeline of trade activity. " +
        DISCLAIMER,
      inputSchema,
    },
    async ({ symbol, limit }) => {
      try {
        const buckets = await source.getRecentHeartbeats(symbol, limit);
        return jsonResult({
          symbol,
          count: buckets.length,
          buckets,
        });
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );
}
