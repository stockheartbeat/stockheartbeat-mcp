import { z } from "zod";

/**
 * Forward-compatible attestation envelope.
 *
 * The MVP server never populates these fields. They exist in the schema so
 * downstream agents and indexers can rely on a stable shape once a future
 * prediction-ledger or on-chain attestation layer fills them in.
 *
 * See docs/attestation.md for the roadmap. This module intentionally has no
 * runtime dependencies on any chain SDK (no ethers, no viem) to keep v0.1
 * lean and reviewable.
 */
export const AttestationSchema = z
  .object({
    chain: z.string().optional(),
    tx: z.string().optional(),
    block_number: z.number().int().nonnegative().optional(),
    issued_at_ms: z.number().int().nonnegative().optional(),
  })
  .strict();

export type Attestation = z.infer<typeof AttestationSchema>;

/**
 * Shape fragment shared by Bucket and WindowSummary. All fields are optional;
 * they are reserved verbs for the post-v0.1 prediction / attestation pipeline.
 */
export const AttestationFieldsSchema = {
  prediction_id: z.string().nullable().optional(),
  feature_snapshot_hash: z.string().nullable().optional(),
  agent_id: z.string().nullable().optional(),
  attestation: AttestationSchema.nullable().optional(),
};
