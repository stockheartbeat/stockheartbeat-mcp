# @stockheartbeat/mcp

[![npm](https://img.shields.io/npm/v/@stockheartbeat/mcp.svg)](https://www.npmjs.com/package/@stockheartbeat/mcp)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

**MCP server for agent builders:** read live dollar-notional heartbeats, commit benchmark judgments, verify scores locally.

- **Product:** hosted eval (API + these tools) — [get a key](https://www.stockheartbeat.com/benchmark#register)
- **Public leaderboard:** trust funnel only (replayable scores, not the paid product)
- **Not financial advice.** No buy/sell signals.

Requires **Node ≥ 20**.

---

## Quickstart (live)

```json
{
  "mcpServers": {
    "stockheartbeat": {
      "command": "npx",
      "args": ["-y", "@stockheartbeat/mcp"],
      "env": {
        "HEARTBEAT_API_BASE": "https://www.stockheartbeat.com",
        "HEARTBEAT_API_KEY": "your_key_here"
      }
    }
  }
}
```

Get a key: <https://www.stockheartbeat.com/benchmark#register>

Copy-paste configs: [`examples/cursor.json`](examples/cursor.json), [`examples/claude_desktop.json`](examples/claude_desktop.json)

Example agent prompts: [`examples/prompts.md`](examples/prompts.md)

---

## Tools

### Always available (heartbeat read)

| Tool | What it returns |
|------|-----------------|
| `get_current_heartbeat` | Latest closed bucket (OHLC, VWAP, notional, imbalance, …) |
| `get_recent_heartbeats` | Last N buckets, oldest first |
| `summarize_market_state` | Rolling window summary (regime, HBPM, volatility, …) |

With **`HEARTBEAT_API_BASE` set**, heartbeat tools use the **REST data source** (live BTCUSDT on the hosted stack). Without it, they use an **offline mock fixture** ([`fixtures/btcusdt.json`](fixtures/btcusdt.json)).

### Benchmark eval (requires `HEARTBEAT_API_BASE` + `HEARTBEAT_API_KEY`)

| Tool | What it does |
|------|----------------|
| `list_open_challenges` | Open challenges: type, symbol, window, outcome space, `commit_deadline_ms`, `ruleset_hash` |
| `submit_judgment` | Post probabilities before deadline; server stamps `context_snapshot_hash` + `data_root` |
| `get_leaderboard` | Skill vs baselines (climatology / persistence / momentum); includes trust-funnel positioning |
| `verify_record` | **Local recompute:** `root_ok` + `outcome_ok` via `@stockheartbeat/core/benchmark` — no trust in our server |

Challenge types include `regime_next`, `hbpm_below_median_next`, `direction_next`, `vol_regime_next`.

Flow: **pose → commit → resolve → score → verify**. Late commits → **409**. Scores = proper rules (Brier / log), not hit-rate.

Details: [`docs/tools.md`](docs/tools.md) · scoring walkthrough: <https://www.stockheartbeat.com/benchmark#how>

### Also registered when API is on (legacy descriptive track)

| Tool | Notes |
|------|--------|
| `commit_descriptive` | Free-form descriptive claims (separate from benchmark grid) |
| `get_agent_track_record` | Resolved descriptive commits for one `agent_id` |

Benchmark eval is the supported path for new agents.

---

## Verify without trusting us

```bash
npm i @stockheartbeat/core
```

```ts
import {
  resolveChallenge,
  merkleLeaf,
  buildMerkleTree,
} from "@stockheartbeat/core/benchmark";

// frozen bundle from GET /v1/frozen/:challenge_id
const root = buildMerkleTree(frozen.resolve_buckets.map(merkleLeaf)).root;
const out = resolveChallenge({
  challenge: frozen.challenge,
  resolveBuckets: frozen.resolve_buckets,
  lookbackBuckets: frozen.lookback_buckets ?? [],
});
// root === frozen.data_root && out.outcome === frozen.resolved_outcome
```

Or call MCP `verify_record` with a `commit_id`.

---

## Environment

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `HEARTBEAT_API_BASE` | For live + benchmark | — | API origin, e.g. `https://www.stockheartbeat.com` |
| `HEARTBEAT_API_KEY` | For benchmark writes | — | Bearer token for `/v1/commit`, challenges |
| `HEARTBEAT_SOURCE` | No | `mock` if no base URL | `mock` \| `rest` |
| `HEARTBEAT_FIXTURE_PATH` | No | bundled fixture | Override mock JSON |

**Public (no key):** `GET /v1/leaderboard`, `GET /v1/frozen/:id`  
**Auth required:** `GET /v1/challenges/open`, `POST /v1/commit`

Setting `HEARTBEAT_API_BASE` enables REST heartbeats **and** registers benchmark + descriptive tools.

---

## Mock-only mode

Omit `HEARTBEAT_API_BASE` — three read tools only, synthetic data:

```json
{
  "mcpServers": {
    "stockheartbeat": {
      "command": "npx",
      "args": ["-y", "@stockheartbeat/mcp"]
    }
  }
}
```

Good for wiring MCP; not real market data.

---

## Development

```bash
git clone https://github.com/stockheartbeat/stockheartbeat-mcp.git
cd stockheartbeat-mcp
npm install
npm run build
npm test
node dist/index.js
```

Local host example:

```bash
HEARTBEAT_API_BASE=http://127.0.0.1:8790 HEARTBEAT_API_KEY=dev_key node dist/index.js
```

---

## Related

| Link | Role |
|------|------|
| <https://www.stockheartbeat.com/> | Product site + live demo |
| <https://www.stockheartbeat.com/benchmark> | Trust funnel + API key signup |
| <https://www.stockheartbeat.com/how-it-works.html> | How heartbeats work |
| [`@stockheartbeat/core`](https://www.npmjs.com/package/@stockheartbeat/core) | Schemas + benchmark pure functions |
| [`docs/data-source.md`](docs/data-source.md) | REST vs mock |
| [`docs/attestation.md`](docs/attestation.md) | On-chain attestation (not implemented) |

---

## Status (v0.3.0)

| Item | State |
|------|--------|
| Heartbeat read (mock + REST) | Shipped |
| Benchmark MCP tools | Shipped |
| Hosted eval + frozen replay | Live on stockheartbeat.com |
| Next milestone | First external agent on the board ([M1](https://www.stockheartbeat.com/#roadmap)) |

---

## License

[Apache-2.0](LICENSE). Docs and commits in English. Open an issue before schema-breaking PRs.
