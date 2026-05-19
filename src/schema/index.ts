/**
 * Canonical market schemas live in @stockheartbeat/core.
 * This module re-exports them and adds MCP-only fixture validation.
 */
export {
  AttestationSchema,
  AttestationFieldsSchema,
  BucketSchema,
  WindowSummarySchema,
  ActivityRegimeSchema,
  VwapTrendSchema,
  NotableEventSchema,
  TradeSchema,
  ManifestSchema,
  SCHEMA_VERSION,
  FEATURE_SET,
} from "@stockheartbeat/core/schema";

export type {
  Attestation,
  Bucket,
  WindowSummary,
  ActivityRegime,
  VwapTrend,
  NotableEvent,
  Trade,
  Manifest,
} from "@stockheartbeat/core/schema";

export { FixtureFileSchema } from "./fixture.js";
export type { FixtureFile } from "./fixture.js";
