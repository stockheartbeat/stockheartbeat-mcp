/**
 * Binance public-stream data source -- NOT IMPLEMENTED in v0.1.
 *
 * Will subscribe to a public Binance spot trade stream and aggregate buckets
 * in-process so the MCP server can run self-contained without a backend.
 * Reserved here so the tool layer remains source-agnostic.
 */
import { type DataSource } from "./index.js";

export interface BinanceSourceOptions {
  wsUrl?: string;
  symbols?: string[];
  thresholdUsd?: number;
}

export function createBinanceSource(_options: BinanceSourceOptions = {}): DataSource {
  throw new Error(
    "binanceSource is not implemented in v0.1. " +
      "Track the roadmap in docs/data-source.md.",
  );
}
