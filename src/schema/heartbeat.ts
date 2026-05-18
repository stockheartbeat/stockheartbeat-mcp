import { z } from "zod";
import { AttestationFieldsSchema } from "./attestation.js";

/**
 * Bucket / Heartbeat = one closed dollar-notional bar.
 *
 * Field semantics follow the StockHeartbeat bucket feature research notes
 * (see the upstream micro repository for the formal definition). Unknown
 * fields are intentionally not rejected so the schema can evolve without
 * breaking older clients.
 */
export const BucketSchema = z
  .object({
    symbol: z.string().min(1).max(20),
    stream: z.enum(["slow", "standard", "fast"]).default("standard"),
    bucket_id: z.number().int().nonnegative(),
    threshold_usd: z.number().positive(),

    start_ms: z.number().int().nonnegative(),
    end_ms: z.number().int().nonnegative(),
    duration_ms: z.number().int().nonnegative(),

    open: z.number().positive(),
    high: z.number().positive(),
    low: z.number().positive(),
    close: z.number().positive(),
    vwap: z.number().positive(),

    notional: z.number().nonnegative(),
    volume: z.number().nonnegative(),
    trade_count: z.number().int().nonnegative(),

    buy_notional: z.number().nonnegative().optional(),
    sell_notional: z.number().nonnegative().optional(),
    imbalance: z.number().min(-1).max(1).optional(),

    return_log: z.number(),
    range_abs: z.number().nonnegative(),
    range_pct: z.number().nonnegative(),

    direction: z.enum(["bullish", "bearish", "neutral"]),
    intensity: z.number().nonnegative(),

    ...AttestationFieldsSchema,
  })
  .passthrough();

export type Bucket = z.infer<typeof BucketSchema>;

export const ActivityRegimeSchema = z.enum([
  "quiet",
  "normal",
  "active",
  "very_active",
]);

export type ActivityRegime = z.infer<typeof ActivityRegimeSchema>;

export const VwapTrendSchema = z.enum(["up", "flat", "down"]);

export const NotableEventSchema = z
  .object({
    type: z.string(),
    severity: z.enum(["low", "medium", "high"]).default("medium"),
    reason: z.string(),
  })
  .strict();

export const WindowSummarySchema = z
  .object({
    symbol: z.string().min(1).max(20),
    stream: z.enum(["slow", "standard", "fast"]).default("standard"),
    window: z.string(),
    threshold_usd: z.number().positive(),

    window_start_ms: z.number().int().nonnegative(),
    window_end_ms: z.number().int().nonnegative(),

    bucket_count: z.number().int().nonnegative(),
    heartbeats_per_min: z.number().nonnegative(),
    avg_bucket_duration_ms: z.number().nonnegative(),
    median_bucket_duration_ms: z.number().nonnegative(),

    price_change_pct: z.number(),
    vwap_trend: VwapTrendSchema,

    realized_volatility: z.number().nonnegative(),
    positive_semivariance: z.number().nonnegative(),
    negative_semivariance: z.number().nonnegative(),

    jump_ratio: z.number().min(0).max(1),
    imbalance: z.number().min(-1).max(1),

    activity_regime: ActivityRegimeSchema,
    activity_multiple: z.number().nonnegative(),
    liquidity_shock: z.boolean(),

    notable_events: z.array(NotableEventSchema).default([]),

    ...AttestationFieldsSchema,
  })
  .passthrough();

export type WindowSummary = z.infer<typeof WindowSummarySchema>;

/**
 * Root shape of fixtures/btcusdt.json. Validated once at startup so the rest
 * of the server can rely on it.
 */
export const FixtureFileSchema = z
  .object({
    meta: z
      .object({
        source: z.string(),
        seed: z.number().int(),
        generator: z.string(),
        symbol: z.string(),
        stream: z.enum(["slow", "standard", "fast"]),
        threshold_usd: z.number().positive(),
        bucket_count: z.number().int().nonnegative(),
        summary_count: z.number().int().nonnegative(),
        note: z.string(),
      })
      .passthrough(),
    buckets: z.array(BucketSchema).min(1),
    summaries: z.array(WindowSummarySchema),
  })
  .strict();

export type FixtureFile = z.infer<typeof FixtureFileSchema>;
