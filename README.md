# stockheartbeat-mcp

> Agent-readable market heartbeat over MCP.
> Dollar-notional bucket events for BTCUSDT, designed for AI agents to read
> and explain. Not for trading signals.

`stockheartbeat-mcp` is a minimal [Model Context Protocol](https://modelcontextprotocol.io)
server that lets any MCP-enabled client (Cursor, Claude Desktop, and others)
read a structured stream of market "heartbeats" — closed dollar-notional
buckets — and ask an LLM to explain the current state in plain language.

v0.1 ships with an **offline mock data source** so you can wire up a client
and exercise the tools end-to-end without any backend.

## Quickstart

### Cursor (once published to npm)

Add the snippet from [`examples/cursor.json`](examples/cursor.json) to your
Cursor MCP config:

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

### Claude Desktop (once published to npm)

Same shape, in `claude_desktop_config.json` (see
[`examples/claude_desktop.json`](examples/claude_desktop.json)).

### Run from source (always works, no npm publish required)

```bash
git clone https://github.com/stockheartbeat/stockheartbeat-mcp.git
cd stockheartbeat-mcp
npm install
npm run build
```

Then point your MCP client at the built entry point:

```json
{
  "mcpServers": {
    "stockheartbeat": {
      "command": "node",
      "args": ["/absolute/path/to/stockheartbeat-mcp/dist/index.js"]
    }
  }
}
```

Then open a new chat and try a prompt from [`examples/prompts.md`](examples/prompts.md).

## Tools

| Tool                       | Returns                                                                |
|----------------------------|------------------------------------------------------------------------|
| `get_current_heartbeat`    | The most recently closed dollar-notional bucket.                       |
| `get_recent_heartbeats`    | The most recent N closed buckets, oldest first.                        |
| `summarize_market_state`   | Rolling window summary (HBPM, regime, volatility, imbalance, events).  |

Full input/output shapes are in [`docs/tools.md`](docs/tools.md).

## Data source

v0.1 only ships `mockSource`, backed by a deterministic synthetic fixture in
[`fixtures/btcusdt.json`](fixtures/btcusdt.json) (400 buckets, 5 × 5m
summaries). It is **not** real exchange data.

The `DataSource` interface (see
[`src/sources/index.ts`](src/sources/index.ts)) reserves room for two future
sources without changing the tool layer:

- `restSource` — calls the upstream StockHeartbeat REST API.
- `binanceSource` — subscribes to a public exchange feed and aggregates locally.

See [`docs/data-source.md`](docs/data-source.md) for the planned switching
mechanism.

## Not financial advice

Every tool description ends with:

> Returns event-based market state, not financial advice. Heartbeat = dollar-notional bucket.

Tools intentionally do not expose forecasts, buy/sell signals, or position
sizing. The example prompts ask the model to use probabilistic, observational
language.

## Roadmap

| Phase     | Scope                                                            | Status            |
|-----------|------------------------------------------------------------------|-------------------|
| v0.1      | Stdio MCP, three read-only tools, offline mock fixture.          | This release.     |
| v0.2      | `restSource` against the public StockHeartbeat REST endpoints.   | Planned.          |
| v0.3      | `binanceSource` for self-contained live demos.                   | Planned.          |
| v0.x+     | Hermes / OpenClaw adapters (see [`adapters/`](adapters/)).       | Planned.          |
| Post-v0.x | Prediction-commit / attestation tools (see [`docs/attestation.md`](docs/attestation.md)). | Reserved, not implemented. |

Reserved schema fields (`prediction_id`, `feature_snapshot_hash`, `agent_id`,
`attestation`) are present today as forward-compatible placeholders. v0.1 does
not implement signing or any chain interaction.

## Development

```bash
npm install
npm run build
npm test
node dist/index.js
```

Regenerate the fixture (deterministic, seeded):

```bash
node scripts/build-fixture.mjs
```

## License

[Apache License 2.0](LICENSE). See [`NOTICE`](NOTICE) for attribution.

## Contributing

All repository content — code, comments, docs, examples, commit messages — is
in English. Open an issue before sending a PR that changes schemas or adds an
adapter.
