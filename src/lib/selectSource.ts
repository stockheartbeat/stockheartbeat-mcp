import { createMockSource } from "../sources/mockSource.js";
import { createRestSource } from "../sources/restSource.js";
import type { DataSource } from "../sources/index.js";

export type HeartbeatSourceKind = "mock" | "rest";

export interface SelectSourceOptions {
  fixturePath?: string;
}

/**
 * Pick data source from environment (Phase 0).
 *
 * Precedence:
 *  1. HEARTBEAT_SOURCE=mock|rest
 *  2. HEARTBEAT_API_BASE set -> rest
 *  3. default mock
 */
export function selectDataSource(opts: SelectSourceOptions = {}): DataSource {
  const explicit = process.env.HEARTBEAT_SOURCE?.trim().toLowerCase();
  const baseUrl = process.env.HEARTBEAT_API_BASE?.trim();
  const apiKey = process.env.HEARTBEAT_API_KEY?.trim();

  if (explicit === "rest" || (!explicit && baseUrl)) {
    return createRestSource({
      baseUrl: baseUrl ?? "http://127.0.0.1:8790",
      apiKey,
    });
  }

  if (explicit && explicit !== "mock") {
    throw new Error(
      `Unknown HEARTBEAT_SOURCE="${explicit}". Supported: mock, rest`,
    );
  }

  return createMockSource(opts.fixturePath);
}
