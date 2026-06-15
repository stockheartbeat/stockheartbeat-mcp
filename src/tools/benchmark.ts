/**
 * Benchmark protocol tools — the agent-builder funnel (R1/R2).
 *
 * The StockHeartbeat Benchmark gives a market-judgment agent a neutral,
 * unfakeable track record: the protocol poses standardized questions, the agent
 * commits a probabilistic answer before the deadline, and every score is a
 * deterministic recomputation from frozen buckets that anyone can replay.
 *
 *   list_open_challenges — what to answer right now.
 *   submit_judgment      — commit your agent's probabilities (the product).
 *   get_leaderboard      — the public trust funnel (skill vs naive baselines).
 *   verify_record        — independently recompute any score locally.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  resolveChallenge,
  merkleLeaf,
  buildMerkleTree,
} from "@stockheartbeat/core/benchmark";
import type { createHeartbeatApi } from "../lib/heartbeatApi.js";
import { jsonResult, errorResult } from "./_result.js";

type HeartbeatApi = ReturnType<typeof createHeartbeatApi>;

const TRUST_FUNNEL_NOTE =
  "The public leaderboard is a trust funnel (proof scoring is fair & verifiable), " +
  "not the product. The product is this hosted API + these MCP tools your agent " +
  "commits answers through. Customer = agent builders/employers who need an " +
  "independent track record.";

export function registerBenchmarkTools(
  server: McpServer,
  api: HeartbeatApi,
): void {
  server.registerTool(
    "list_open_challenges",
    {
      title: "List open benchmark challenges",
      description:
        "Returns the currently open standardized challenges (symbol × window × type), " +
        "their outcome_space, commit_deadline_ms and resolve_at_ms, plus the active " +
        "ruleset_hash. Answer them with submit_judgment before each deadline. " +
        TRUST_FUNNEL_NOTE,
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await api.listOpenChallenges());
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );

  server.registerTool(
    "submit_judgment",
    {
      title: "Commit a probabilistic judgment to the benchmark",
      description:
        "Commits your agent's probability distribution over a challenge's outcome_space " +
        "before its commit_deadline_ms (anti look-ahead). probs must sum to 1; omit " +
        "probs or pass abstain=true to abstain. Returns commit_id, context_snapshot_hash " +
        "and data_root for audit. This is how your agent builds a verifiable track record.",
      inputSchema: {
        challenge_id: z
          .string()
          .min(1)
          .describe("challenge_id from list_open_challenges"),
        agent_id: z
          .string()
          .min(1)
          .max(64)
          .describe("Your agent identifier (stable across commits)"),
        probs: z
          .record(z.string(), z.number().min(0).max(1))
          .optional()
          .describe("Probabilities over outcome_space; must sum to 1"),
        abstain: z
          .boolean()
          .optional()
          .describe("Set true (and omit probs) to abstain on this challenge"),
      },
    },
    async ({ challenge_id, agent_id, probs, abstain }) => {
      try {
        return jsonResult(
          await api.submitJudgment({ challenge_id, agent_id, probs, abstain }),
        );
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );

  server.registerTool(
    "get_leaderboard",
    {
      title: "Get the benchmark leaderboard (trust funnel)",
      description:
        "Public, verifiable ranking by skill (Brier vs naive baselines), with coverage. " +
        "Three reference baselines (climatology, persistence, momentum) are always present. " +
        TRUST_FUNNEL_NOTE,
      inputSchema: {
        ruleset: z.string().optional().describe("ruleset_hash to scope to"),
        symbol: z.string().optional(),
        window: z.string().optional(),
      },
    },
    async ({ ruleset, symbol, window }) => {
      try {
        return jsonResult(await api.getLeaderboard({ ruleset, symbol, window }));
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );

  server.registerTool(
    "verify_record",
    {
      title: "Independently verify a benchmark record",
      description:
        "Fetches a commit's frozen bundle and re-derives it LOCALLY with " +
        "@stockheartbeat/core/benchmark: recomputes the Merkle data_root and re-runs " +
        "resolveChallenge on the frozen buckets. Returns root_ok / outcome_ok so you can " +
        "trust the leaderboard without trusting the server.",
      inputSchema: {
        commit_id: z.string().min(1).describe("commit_id to verify"),
      },
    },
    async ({ commit_id }) => {
      try {
        const record = (await api.getRecord(commit_id)) as {
          judgment?: { challenge_id?: string };
          verdict?: unknown;
        };
        const challengeId = record?.judgment?.challenge_id;
        if (!challengeId) {
          return errorResult("record has no challenge_id");
        }
        const frozen = (await api.getFrozen(challengeId)) as {
          challenge: Parameters<typeof resolveChallenge>[0]["challenge"];
          resolve_buckets: Parameters<typeof resolveChallenge>[0]["resolveBuckets"];
          lookback_buckets?: Parameters<typeof resolveChallenge>[0]["lookbackBuckets"];
          data_root: string;
          resolved_outcome: string | null;
          outcome_void: boolean;
        };
        const recomputedRoot = buildMerkleTree(
          frozen.resolve_buckets.map((b) => merkleLeaf(b)),
        ).root;
        const recomputed = resolveChallenge({
          challenge: frozen.challenge,
          resolveBuckets: frozen.resolve_buckets,
          lookbackBuckets: frozen.lookback_buckets ?? [],
        });
        const root_ok = recomputedRoot === frozen.data_root;
        const outcome_ok =
          recomputed.outcome === frozen.resolved_outcome &&
          recomputed.void === frozen.outcome_void;
        return jsonResult({
          commit_id,
          challenge_id: challengeId,
          root_ok,
          outcome_ok,
          verified: root_ok && outcome_ok,
          recomputed_outcome: recomputed.outcome,
          server_outcome: frozen.resolved_outcome,
          verdict: record.verdict ?? null,
        });
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );
}
