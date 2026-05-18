import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DataSource } from "../sources/index.js";
import { DISCLAIMER } from "../lib/version.js";
import { jsonResult, errorResult } from "./_result.js";

export function registerGetCurrentHeartbeat(
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
  };

  server.registerTool(
    "get_current_heartbeat",
    {
      title: "Get the latest closed heartbeat (dollar-notional bucket)",
      description:
        "Returns the most recently closed dollar-notional bucket for the given symbol. " +
        "Each bucket includes OHLC, VWAP, notional, trade count, direction and order-flow imbalance " +
        "(when available). " +
        DISCLAIMER,
      inputSchema,
    },
    async ({ symbol }) => {
      try {
        const bucket = await source.getCurrentHeartbeat(symbol);
        if (!bucket) {
          return errorResult(`No heartbeat available for symbol ${symbol}.`);
        }
        return jsonResult({ symbol, bucket });
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );
}
