export interface HeartbeatApiOptions {
  baseUrl?: string;
  apiKey?: string;
}

export interface DescriptiveCommitInput {
  agent_id: string;
  claim_type: "descriptive";
  claim_type_id: "regime_quiet" | "hbpm_below_median";
  statement?: string;
  symbol: string;
  window: string;
}

export interface DescriptiveCommitResult {
  commit_id: string;
  context_snapshot_hash: string;
  feature_set: string;
  resolve_at_ms: number;
}

export interface AgentTrackRecord {
  agent_id: string;
  claim_type: string;
  total_resolved: number;
  match: number;
  mismatch: number;
  void: number;
  descriptive_accuracy: number | null;
  commits: Array<Record<string, unknown>>;
}

export interface JudgmentInput {
  challenge_id: string;
  agent_id: string;
  /** Probability over the challenge's outcome_space; must sum to 1. */
  probs?: Record<string, number>;
  abstain?: boolean;
}

export interface LeaderboardQuery {
  ruleset?: string;
  symbol?: string;
  window?: string;
}

/**
 * HTTP client for StockHeartbeat mcp-host descriptive endpoints (Phase 1).
 */
export function createHeartbeatApi(options: HeartbeatApiOptions = {}) {
  const baseUrl = (options.baseUrl ?? process.env.HEARTBEAT_API_BASE ?? "")
    .replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("heartbeatApi requires baseUrl or HEARTBEAT_API_BASE");
  }

  const apiKey = options.apiKey ?? process.env.HEARTBEAT_API_KEY;

  function headers(): HeadersInit {
    const h: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (apiKey) h.Authorization = `Bearer ${apiKey}`;
    return h;
  }

  async function fetchJson(path: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...headers(), ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`REST ${path} failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  return {
    async commitDescriptive(
      input: DescriptiveCommitInput,
    ): Promise<DescriptiveCommitResult> {
      const data = (await fetchJson("/v1/descriptive/commit", {
        method: "POST",
        body: JSON.stringify(input),
      })) as DescriptiveCommitResult;
      return data;
    },

    async getAgentTrackRecord(agentId: string): Promise<AgentTrackRecord> {
      return (await fetchJson(
        `/v1/agents/${encodeURIComponent(agentId)}/track_record`,
      )) as AgentTrackRecord;
    },

    // --- Benchmark protocol (R1/R2: the agent-builder funnel) ---

    /** Open standardized challenges to answer (auth). */
    async listOpenChallenges(): Promise<Record<string, unknown>> {
      return (await fetchJson("/v1/challenges/open")) as Record<string, unknown>;
    },

    /** Commit a probabilistic judgment before the challenge deadline (auth). */
    async submitJudgment(input: JudgmentInput): Promise<Record<string, unknown>> {
      return (await fetchJson("/v1/commit", {
        method: "POST",
        body: JSON.stringify(input),
      })) as Record<string, unknown>;
    },

    /** Public, verifiable leaderboard (the trust funnel). */
    async getLeaderboard(
      query: LeaderboardQuery = {},
    ): Promise<Record<string, unknown>> {
      const qs = new URLSearchParams();
      if (query.ruleset) qs.set("ruleset", query.ruleset);
      if (query.symbol) qs.set("symbol", query.symbol);
      if (query.window) qs.set("window", query.window);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return (await fetchJson(`/v1/leaderboard${suffix}`)) as Record<string, unknown>;
    },

    /** Public record: { judgment, challenge, verdict } for a commit. */
    async getRecord(commitId: string): Promise<Record<string, unknown>> {
      return (await fetchJson(
        `/v1/record/${encodeURIComponent(commitId)}`,
      )) as Record<string, unknown>;
    },

    /** Public frozen bundle for a resolved challenge (for independent replay). */
    async getFrozen(challengeId: string): Promise<Record<string, unknown>> {
      return (await fetchJson(
        `/v1/frozen/${encodeURIComponent(challengeId)}`,
      )) as Record<string, unknown>;
    },
  };
}
