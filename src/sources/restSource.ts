import {
  type DataSource,
  SymbolNotSupportedError,
  WindowNotSupportedError,
} from "./index.js";
import type { Bucket, WindowSummary } from "../schema/index.js";
import { BucketSchema, WindowSummarySchema } from "../schema/index.js";

export interface RestSourceOptions {
  baseUrl?: string;
  apiKey?: string;
  symbols?: string[];
  windows?: string[];
}

/**
 * Reads live heartbeat data from StockHeartbeat mcp-host HTTP API (Phase 0).
 */
export function createRestSource(options: RestSourceOptions = {}): DataSource {
  const baseUrl = (options.baseUrl ?? process.env.HEARTBEAT_API_BASE ?? "")
    .replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("restSource requires baseUrl or HEARTBEAT_API_BASE");
  }

  const apiKey = options.apiKey ?? process.env.HEARTBEAT_API_KEY;
  const supportedSymbols = options.symbols ?? ["BTCUSDT"];
  const supportedWindows = options.windows ?? ["5m", "15m", "1h"];

  function headers(): HeadersInit {
    const h: Record<string, string> = { Accept: "application/json" };
    if (apiKey) h.Authorization = `Bearer ${apiKey}`;
    return h;
  }

  async function fetchJson(path: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...headers(), ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`REST ${path} failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  return {
    id: "rest",

    async listSymbols(): Promise<string[]> {
      return supportedSymbols.slice();
    },

    async getCurrentHeartbeat(symbol: string): Promise<Bucket | null> {
      assertSymbol(symbol, supportedSymbols);
      const data = (await fetchJson(
        `/v1/heartbeat/current?symbol=${encodeURIComponent(symbol)}`,
      )) as { bucket?: unknown };
      if (!data.bucket) return null;
      return BucketSchema.parse(data.bucket);
    },

    async getRecentHeartbeats(symbol: string, limit: number): Promise<Bucket[]> {
      assertSymbol(symbol, supportedSymbols);
      const safe = Math.max(1, Math.min(limit, 100));
      const data = (await fetchJson(
        `/v1/heartbeat/recent?symbol=${encodeURIComponent(symbol)}&limit=${safe}`,
      )) as { buckets?: unknown[] };
      const buckets = data.buckets ?? [];
      return buckets.map((b) => BucketSchema.parse(b));
    },

    async getSummary(symbol: string, window: string): Promise<WindowSummary | null> {
      assertSymbol(symbol, supportedSymbols);
      if (!supportedWindows.includes(window)) {
        throw new WindowNotSupportedError(window, supportedWindows);
      }
      const data = (await fetchJson(`/v1/summary?symbol=${encodeURIComponent(symbol)}&window=${encodeURIComponent(window)}`)) as {
        summary?: unknown;
      };
      if (!data.summary) return null;
      return WindowSummarySchema.parse(data.summary);
    },

    supportedWindows(): string[] {
      return supportedWindows.slice();
    },
  };
}

function assertSymbol(s: string, supported: string[]): void {
  if (!supported.includes(s)) {
    throw new SymbolNotSupportedError(s, supported);
  }
}
