import { z } from "zod";
import { BucketSchema, WindowSummarySchema } from "@stockheartbeat/core/schema";

/**
 * Root shape of fixtures/btcusdt.json. MCP-specific; buckets/summaries validate
 * against the canonical schemas from @stockheartbeat/core.
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
