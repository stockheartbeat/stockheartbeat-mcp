import { describe, expect, it } from "vitest";
import {
  merkleLeaf,
  buildMerkleTree,
  resolveChallenge,
} from "@stockheartbeat/core/benchmark";
import { registerBenchmarkTools } from "../src/tools/benchmark.js";

type Handler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

function fakeServer() {
  const tools = new Map<string, Handler>();
  return {
    tools,
    registerTool(name: string, _meta: unknown, handler: Handler) {
      tools.set(name, handler);
    },
  };
}

function parse(res: { content: Array<{ text: string }> }) {
  return JSON.parse(res.content[0].text);
}

// Minimal direction_next frozen bundle (resolver only reads open/close).
function makeFrozen(tamper = false) {
  const challenge = {
    challenge_type: "direction_next" as const,
    window: "15m",
    outcome_space: ["up", "down"],
  };
  const resolveBuckets = [
    { bucket_id: 1, open: 100, close: 105 },
    { bucket_id: 2, open: 105, close: 110 },
  ];
  const data_root = buildMerkleTree(resolveBuckets.map((b) => merkleLeaf(b))).root;
  const out = resolveChallenge({
    challenge: challenge as never,
    resolveBuckets: resolveBuckets as never,
    lookbackBuckets: [],
  });
  return {
    challenge,
    resolve_buckets: resolveBuckets,
    lookback_buckets: [],
    data_root: tamper ? "deadbeef" : data_root,
    resolved_outcome: out.outcome,
    outcome_void: out.void,
  };
}

function fakeApi(frozen: ReturnType<typeof makeFrozen>) {
  return {
    async getRecord(commit_id: string) {
      return { judgment: { commit_id, challenge_id: "cid-1" }, verdict: { scored: true } };
    },
    async getFrozen() {
      return frozen;
    },
  } as never;
}

describe("benchmark MCP tools", () => {
  it("registers the four agent-builder funnel tools", () => {
    const server = fakeServer();
    registerBenchmarkTools(server as never, fakeApi(makeFrozen()));
    expect([...server.tools.keys()].sort()).toEqual(
      ["get_leaderboard", "list_open_challenges", "submit_judgment", "verify_record"].sort(),
    );
  });

  it("verify_record recomputes root + outcome locally (verified)", async () => {
    const server = fakeServer();
    registerBenchmarkTools(server as never, fakeApi(makeFrozen()));
    const out = parse(await server.tools.get("verify_record")!({ commit_id: "x" }));
    expect(out.root_ok).toBe(true);
    expect(out.outcome_ok).toBe(true);
    expect(out.verified).toBe(true);
    expect(out.recomputed_outcome).toBe("up");
  });

  it("verify_record flags a tampered data_root", async () => {
    const server = fakeServer();
    registerBenchmarkTools(server as never, fakeApi(makeFrozen(true)));
    const out = parse(await server.tools.get("verify_record")!({ commit_id: "x" }));
    expect(out.root_ok).toBe(false);
    expect(out.verified).toBe(false);
  });
});
