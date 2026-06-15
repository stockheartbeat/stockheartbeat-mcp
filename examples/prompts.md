# Example prompts

Drop these into a chat in any MCP-enabled client (Cursor, Claude Desktop, etc.)
that already has the `stockheartbeat` MCP server configured.

The server returns event-based market state, not financial advice. The prompts
below are written to keep the model's output probabilistic and observational.

---

## 1. Quick read of current state

```
Use the stockheartbeat tools to read the latest BTCUSDT market state.

1. Call `summarize_market_state` with symbol=BTCUSDT, window=5m.
2. Call `get_current_heartbeat` with symbol=BTCUSDT.

Then explain in plain language:
- Is the market currently active, quiet, or showing a liquidity shock?
- Is the most recent heartbeat consistent with the 5m summary, or does it look like an outlier?
- What would you watch next?

Rules:
- Use probabilistic language.
- Do not produce buy/sell signals.
- Do not give personalized financial advice.
```

## 2. Short timeline review

```
Use the stockheartbeat tools to review the recent BTCUSDT timeline.

1. Call `get_recent_heartbeats` with symbol=BTCUSDT, limit=20.
2. Call `summarize_market_state` with symbol=BTCUSDT, window=5m.

Then describe:
- How did duration_ms and direction change across the last 20 heartbeats?
- Where is most of the notional concentrated?
- Does order-flow imbalance lean one way?

Constraints:
- This is event-based data (dollar-notional buckets), not time-based candles.
- Use neutral, observational language.
- Do not output trading recommendations.
```

## 3. Anomaly check

```
Use the stockheartbeat tools to look for anomalies in BTCUSDT.

1. Call `summarize_market_state` with symbol=BTCUSDT, window=5m.
2. If activity_regime is "active" or "very_active" or liquidity_shock is true,
   call `get_recent_heartbeats` with symbol=BTCUSDT, limit=30 and report which
   heartbeats look unusual (e.g. very short duration_ms, large range_pct,
   skewed imbalance).

Do not infer causes or predict direction. Stick to what the data shows.
```

## 4. Build a verifiable track record (benchmark funnel)

Requires a live host (`HEARTBEAT_API_BASE` + `HEARTBEAT_API_KEY`).

```
Use the stockheartbeat benchmark tools to give "my-agent" a track record.

1. Call `list_open_challenges`. Note each challenge_id, its outcome_space and
   commit_deadline_ms.
2. For each open challenge, decide a calibrated probability over its
   outcome_space (it must sum to 1), then call `submit_judgment` with
   agent_id="my-agent". Prefer honest uncertainty over overconfident point bets.
3. After some have resolved, call `get_leaderboard` and compare "my-agent" to the
   reference baselines (climatology, persistence, momentum). Positive avg_skill
   means we beat the naive lines.
4. Pick one resolved commit and call `verify_record` to confirm root_ok and
   outcome_ok — proving the score was recomputed from frozen data, not asserted.

Rules:
- Calibrated probabilities, not buy/sell signals.
- The board is a trust funnel; the goal is a provable, beats-baseline record.
```

---

## System prompt fragment (optional)

If your client lets you set a system prompt, this fragment keeps the model
inside the intended use-case:

```
You are analyzing event-based market data, not standard candlesticks.

Use the stockheartbeat MCP tools to:
1. Describe current market activity level.
2. Note whether trade intensity is rising or falling.
3. Note whether price movement is supported by traded notional.
4. Flag any evidence of liquidity shock or jump risk.
5. Suggest what to observe next.

Always use probabilistic language. Never produce a guaranteed buy/sell signal.
Never give personalized financial advice.
```
