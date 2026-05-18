import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DataSource } from "../sources/index.js";
import { DISCLAIMER } from "../lib/version.js";
import { jsonResult, errorResult } from "./_result.js";

export function registerSummarizeMarketState(
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
    window: z
      .string()
      .default("5m")
      .describe(
        "Rolling window identifier, e.g. \"5m\". The set of supported windows depends on the data source.",
      ),
  };

  server.registerTool(
    "summarize_market_state",
    {
      title: "Summarize recent market state over a rolling window",
      description:
        "Returns an LLM-friendly summary of the most recent window: heartbeats per minute, " +
        "activity regime, realized volatility, jump ratio, order-flow imbalance and any notable events. " +
        "Intended as the primary input for natural-language explanations of the current market state. " +
        DISCLAIMER,
      inputSchema,
    },
    async ({ symbol, window }) => {
      try {
        const summary = await source.getSummary(symbol, window);
        if (!summary) {
          return errorResult(
            `No summary available for ${symbol} window=${window}.`,
          );
        }
        return jsonResult({ symbol, window, summary });
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );
}
