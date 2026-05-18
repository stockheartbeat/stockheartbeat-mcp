# MCP tools

`stockheartbeat-mcp` v0.1 exposes three read-only tools. Every tool description
ends with the same disclaimer:

> Returns event-based market state, not financial advice. Heartbeat = dollar-notional bucket.

All payloads are emitted as a single MCP `text` content block containing
formatted JSON.

---

## `get_current_heartbeat`

Returns the most recently closed dollar-notional bucket for the symbol.

**Input**

| Field    | Type    | Default    | Notes                           |
|----------|---------|------------|---------------------------------|
| `symbol` | string  | `BTCUSDT`  | 1-20 chars. v0.1 mock: BTCUSDT. |

**Output (shape)**

```json
{
  "symbol": "BTCUSDT",
  "bucket": {
    "symbol": "BTCUSDT",
    "stream": "standard",
    "bucket_id": 400,
    "threshold_usd": 10000,
    "start_ms": 0,
    "end_ms": 0,
    "duration_ms": 0,
    "open": 0,
    "high": 0,
    "low": 0,
    "close": 0,
    "vwap": 0,
    "notional": 0,
    "volume": 0,
    "trade_count": 0,
    "buy_notional": 0,
    "sell_notional": 0,
    "imbalance": 0,
    "return_log": 0,
    "range_abs": 0,
    "range_pct": 0,
    "direction": "bullish",
    "intensity": 0,
    "prediction_id": null,
    "feature_snapshot_hash": null,
    "agent_id": null,
    "attestation": null
  }
}
```

`prediction_id`, `feature_snapshot_hash`, `agent_id`, and `attestation` are
reserved for the post-v0.1 attestation roadmap and are always `null` here.

---

## `get_recent_heartbeats`

Returns the most recent N closed buckets, oldest first.

**Input**

| Field    | Type    | Default    | Notes                                    |
|----------|---------|------------|------------------------------------------|
| `symbol` | string  | `BTCUSDT`  | 1-20 chars.                              |
| `limit`  | integer | `20`       | 1-100. Clamped to the available history. |

**Output (shape)**

```json
{
  "symbol": "BTCUSDT",
  "count": 20,
  "buckets": [
    {
      "bucket_id": 381,
      "start_ms": 0,
      "end_ms": 0,
      "duration_ms": 0,
      "open": 0,
      "high": 0,
      "low": 0,
      "close": 0,
      "vwap": 0,
      "notional": 0,
      "volume": 0,
      "trade_count": 0,
      "direction": "bullish",
      "imbalance": 0
    }
  ]
}
```

---

## `summarize_market_state`

LLM-friendly summary of the most recent rolling window. This is the primary
input you should give a model that needs to explain "what is happening right
now" in plain language.

**Input**

| Field    | Type   | Default   | Notes                                         |
|----------|--------|-----------|-----------------------------------------------|
| `symbol` | string | `BTCUSDT` | 1-20 chars.                                   |
| `window` | string | `5m`      | Source-dependent. Mock source supports `5m`.  |

**Output (shape)**

```json
{
  "symbol": "BTCUSDT",
  "window": "5m",
  "summary": {
    "symbol": "BTCUSDT",
    "stream": "standard",
    "window": "5m",
    "threshold_usd": 10000,
    "window_start_ms": 0,
    "window_end_ms": 0,
    "bucket_count": 0,
    "heartbeats_per_min": 0,
    "avg_bucket_duration_ms": 0,
    "median_bucket_duration_ms": 0,
    "price_change_pct": 0,
    "vwap_trend": "up",
    "realized_volatility": 0,
    "positive_semivariance": 0,
    "negative_semivariance": 0,
    "jump_ratio": 0,
    "imbalance": 0,
    "activity_regime": "normal",
    "activity_multiple": 0,
    "liquidity_shock": false,
    "notable_events": [],
    "prediction_id": null,
    "feature_snapshot_hash": null,
    "agent_id": null,
    "attestation": null
  }
}
```

`activity_regime` is one of `quiet`, `normal`, `active`, `very_active`.
`vwap_trend` is one of `up`, `flat`, `down`.

---

## Error shape

When a tool fails, the result is marked with `isError: true` and the text block
contains a JSON object:

```json
{ "error": "Symbol \"XYZ\" is not available from this data source. Supported: BTCUSDT" }
```

Typical error cases: unknown symbol, unsupported window, or (post-v0.1)
upstream connectivity failure.
