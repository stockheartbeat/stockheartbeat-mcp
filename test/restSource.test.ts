import { describe, expect, it, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { createRestSource } from "../src/sources/restSource.js";

describe("restSource", () => {
  let server: http.Server;
  let port = 0;

  beforeEach(async () => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/v1/heartbeat/current") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            symbol: "BTCUSDT",
            bucket: {
              symbol: "BTCUSDT",
              stream: "standard",
              bucket_id: 1,
              threshold_usd: 1_000_000,
              start_ms: 1,
              end_ms: 2,
              duration_ms: 1,
              open: 100,
              high: 101,
              low: 99,
              close: 100.5,
              vwap: 100.2,
              notional: 1_000_000,
              volume: 10,
              trade_count: 5,
              return_log: 0.001,
              range_abs: 2,
              range_pct: 0.02,
              direction: "bullish",
              intensity: 1,
            },
          }),
        );
        return;
      }
      if (url.pathname === "/v1/heartbeat/recent") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ symbol: "BTCUSDT", buckets: [] }));
        return;
      }
      if (url.pathname === "/v1/summary") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            symbol: "BTCUSDT",
            window: "5m",
            summary: {
              symbol: "BTCUSDT",
              stream: "standard",
              window: "5m",
              threshold_usd: 1_000_000,
              window_start_ms: 1,
              window_end_ms: 2,
              bucket_count: 1,
              heartbeats_per_min: 1,
              avg_bucket_duration_ms: 1000,
              median_bucket_duration_ms: 1000,
              price_change_pct: 0.01,
              vwap_trend: "flat",
              realized_volatility: 0.01,
              positive_semivariance: 0.01,
              negative_semivariance: 0,
              jump_ratio: 0,
              imbalance: 0,
              activity_regime: "normal",
              activity_multiple: 1,
              liquidity_shock: false,
              notable_events: [],
            },
            disclaimer: "not financial advice",
          }),
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("fetches current heartbeat from mock HTTP server", async () => {
    const source = createRestSource({
      baseUrl: `http://127.0.0.1:${port}`,
      symbols: ["BTCUSDT"],
    });
    const bucket = await source.getCurrentHeartbeat("BTCUSDT");
    expect(bucket?.bucket_id).toBe(1);
  });

  it("fetches window summary", async () => {
    const source = createRestSource({
      baseUrl: `http://127.0.0.1:${port}`,
      symbols: ["BTCUSDT"],
      windows: ["5m"],
    });
    const summary = await source.getSummary("BTCUSDT", "5m");
    expect(summary?.window).toBe("5m");
  });
});
