# Attestation roadmap (NOT IMPLEMENTED in v0.1)

This document describes the post-v0.1 plan for letting agents commit
predictions and attestations alongside heartbeat data. **None of this is
implemented yet.** It exists so the v0.1 schema, tool names, and source
interface stay forward-compatible.

## What is reserved in v0.1

Every `Bucket` and `WindowSummary` carries four optional, currently-null
fields:

- `prediction_id?: string`
- `feature_snapshot_hash?: string`
- `agent_id?: string`
- `attestation?: { chain?, tx?, block_number?, issued_at_ms? }`

The `attestation` envelope is defined in
[`src/schema/attestation.ts`](../src/schema/attestation.ts). The v0.1 server
never populates these fields and never imports any chain SDK.

## What is intentionally absent

To keep the dependency surface small and the audit story simple, v0.1 must
not introduce:

- `ethers`, `viem`, or any other chain client
- Wallet management, key handling, or signing
- A `commit_prediction` / `resolve_prediction` tool

Adding any of those is a deliberate, separately-scoped decision.

## Future shape

When the attestation layer lands, expected additions:

1. A new tool namespace: `commit_prediction`, `resolve_prediction`,
   `get_agent_track_record`. Verbs are reserved now to avoid collision.
2. A new optional data source that reads commitments and resolutions from an
   indexer.
3. Documentation of which chain(s) are supported, gas costs, replay rules, and
   how feature snapshots are hashed.

## Design principles carried forward

- Only hashes / commitments / outcome summaries go on-chain.
- Raw ticks, full bucket history, and prediction prose stay off-chain.
- Track record indicators (Brier score, calibration, hit rate, etc.) are
  computed from resolved predictions, not from declarative agent claims.

See the upstream `bucket_heartbeat_data_analysis_guide.md` Section 15 for the
research-level rationale that this roadmap inherits.
