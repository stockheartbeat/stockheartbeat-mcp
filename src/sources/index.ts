import type { Bucket, WindowSummary } from "../schema/index.js";

/**
 * DataSource abstracts where heartbeat data comes from.
 *
 * v0.1 only ships `mockSource` (offline, deterministic fixture). Future
 * implementations will add `restSource` (calls the StockHeartbeat REST API)
 * and `binanceSource` (subscribes to a public exchange feed and computes
 * buckets in-process). The tool layer never imports a concrete source,
 * keeping all tools agnostic to the underlying provider.
 */
export interface DataSource {
  /** Stable identifier used in logs / telemetry. */
  readonly id: string;

  /** Symbols this source can serve. */
  listSymbols(): Promise<string[]>;

  /** Latest closed bucket for the symbol, or null when nothing is known. */
  getCurrentHeartbeat(symbol: string): Promise<Bucket | null>;

  /** Most recent N closed buckets, oldest first. */
  getRecentHeartbeats(symbol: string, limit: number): Promise<Bucket[]>;

  /**
   * Window-level summary (e.g. "5m") used by the LLM-facing tool. The window
   * argument is opaque to the interface; sources advertise which windows they
   * support via supportedWindows().
   */
  getSummary(symbol: string, window: string): Promise<WindowSummary | null>;

  /** Windows this source can produce (e.g. ["5m"]). */
  supportedWindows(): string[];
}

export class SymbolNotSupportedError extends Error {
  constructor(symbol: string, supported: string[]) {
    super(
      `Symbol "${symbol}" is not available from this data source. ` +
        `Supported: ${supported.join(", ") || "(none)"}`,
    );
    this.name = "SymbolNotSupportedError";
  }
}

export class WindowNotSupportedError extends Error {
  constructor(window: string, supported: string[]) {
    super(
      `Window "${window}" is not available from this data source. ` +
        `Supported: ${supported.join(", ") || "(none)"}`,
    );
    this.name = "WindowNotSupportedError";
  }
}
