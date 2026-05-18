import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  type DataSource,
  SymbolNotSupportedError,
  WindowNotSupportedError,
} from "./index.js";
import {
  FixtureFileSchema,
  type Bucket,
  type FixtureFile,
  type WindowSummary,
} from "../schema/index.js";

/**
 * Offline data source backed by a static JSON fixture.
 *
 * Loaded once at startup and validated against the Zod schema. Path resolves
 * relative to the package root so the same code works whether invoked from
 * `npm run dev`, `node dist/index.js`, or `npx @stockheartbeat/mcp`.
 */
export function createMockSource(fixturePath?: string): DataSource {
  const resolvedPath = fixturePath ?? defaultFixturePath();
  const raw = readFileSync(resolvedPath, "utf8");
  const fixture: FixtureFile = FixtureFileSchema.parse(JSON.parse(raw));

  const symbol = fixture.meta.symbol;
  const supportedSymbols = [symbol];
  const supportedWindows = uniqueWindows(fixture.summaries);

  return {
    id: "mock",

    async listSymbols(): Promise<string[]> {
      return supportedSymbols.slice();
    },

    async getCurrentHeartbeat(s: string): Promise<Bucket | null> {
      assertSymbol(s, supportedSymbols);
      const last = fixture.buckets[fixture.buckets.length - 1];
      return last ?? null;
    },

    async getRecentHeartbeats(s: string, limit: number): Promise<Bucket[]> {
      assertSymbol(s, supportedSymbols);
      const safeLimit = Math.max(1, Math.min(limit, fixture.buckets.length));
      return fixture.buckets.slice(-safeLimit);
    },

    async getSummary(
      s: string,
      window: string,
    ): Promise<WindowSummary | null> {
      assertSymbol(s, supportedSymbols);
      if (!supportedWindows.includes(window)) {
        throw new WindowNotSupportedError(window, supportedWindows);
      }
      const matches = fixture.summaries.filter((x) => x.window === window);
      return matches[matches.length - 1] ?? null;
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

function uniqueWindows(summaries: WindowSummary[]): string[] {
  return Array.from(new Set(summaries.map((x) => x.window)));
}

function defaultFixturePath(): string {
  // Walk up from the current module's directory until we find fixtures/btcusdt.json.
  // This handles both layouts: src/sources/ (dev, tests) and dist/ (bundled).
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, "fixtures", "btcusdt.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    "Could not locate fixtures/btcusdt.json. " +
      "Set HEARTBEAT_FIXTURE_PATH to override the default lookup.",
  );
}
