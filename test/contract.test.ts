import { describe, expect, it } from "vitest";
import {
  BucketSchema,
  FixtureFileSchema,
  WindowSummarySchema,
} from "../src/schema/index.js";
import { createMockSource } from "../src/sources/mockSource.js";

describe("fixture", () => {
  it("matches FixtureFileSchema", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const path = resolve(process.cwd(), "fixtures", "btcusdt.json");
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const parsed = FixtureFileSchema.parse(raw);
    expect(parsed.buckets.length).toBeGreaterThan(0);
    expect(parsed.summaries.length).toBeGreaterThan(0);
  });
});

describe("mockSource", () => {
  const source = createMockSource();

  it("advertises BTCUSDT and at least one window", async () => {
    expect(await source.listSymbols()).toContain("BTCUSDT");
    expect(source.supportedWindows().length).toBeGreaterThan(0);
  });

  it("returns the latest bucket via getCurrentHeartbeat", async () => {
    const bucket = await source.getCurrentHeartbeat("BTCUSDT");
    expect(bucket).not.toBeNull();
    BucketSchema.parse(bucket);
  });

  it("returns recent buckets in oldest-first order, clamped to history", async () => {
    const buckets = await source.getRecentHeartbeats("BTCUSDT", 10);
    expect(buckets).toHaveLength(10);
    for (const b of buckets) BucketSchema.parse(b);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].bucket_id).toBeGreaterThan(buckets[i - 1].bucket_id);
    }

    const big = await source.getRecentHeartbeats("BTCUSDT", 100000);
    expect(big.length).toBeGreaterThan(0);
  });

  it("returns a window summary for 5m", async () => {
    const summary = await source.getSummary("BTCUSDT", "5m");
    expect(summary).not.toBeNull();
    WindowSummarySchema.parse(summary);
    expect(summary?.window).toBe("5m");
  });

  it("rejects unknown symbols", async () => {
    await expect(source.getCurrentHeartbeat("UNKNOWN")).rejects.toThrow(
      /not available/i,
    );
  });

  it("rejects unsupported windows", async () => {
    await expect(source.getSummary("BTCUSDT", "1d")).rejects.toThrow(
      /not available/i,
    );
  });
});

describe("disclaimer", () => {
  it("ships the not-financial-advice string in tool registrations", async () => {
    const { DISCLAIMER } = await import("../src/lib/version.js");
    expect(DISCLAIMER).toMatch(/not financial advice/i);
    expect(DISCLAIMER).toMatch(/dollar-notional bucket/i);
  });
});
