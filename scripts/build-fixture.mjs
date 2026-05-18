// Deterministic synthetic fixture builder.
//
// Generates ~200 dollar-notional buckets for BTCUSDT and 6 rolling 5-minute
// window summaries. The data is synthetic (NOT from any exchange feed) and
// is meant only to let MCP clients exercise the tool shapes offline.
//
// Reproducible: a fixed seed + simple Mulberry32 PRNG. Re-run this script
// to regenerate fixtures/btcusdt.json byte-for-byte.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "fixtures", "btcusdt.json");

const SEED = 0xc0ffee;
const SYMBOL = "BTCUSDT";
const STREAM = "standard";
const THRESHOLD = 10000;
const BUCKETS = 400;
const START_MS = Date.UTC(2026, 0, 15, 12, 0, 0);
const START_PRICE = 78000;
const VOL_PER_SEC = 0.00018; // ~1bp/s baseline

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const normal = () => {
  // Box-Muller; bounded to avoid heavy tails in fixture
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

function classifyDirection(open, close) {
  const diff = close - open;
  if (Math.abs(diff) / open < 1e-5) return "neutral";
  return diff > 0 ? "bullish" : "bearish";
}

function clampZeroOne(x) {
  return Math.max(0, Math.min(1, x));
}

let price = START_PRICE;
let nowMs = START_MS;
let bucketId = 1;
const buckets = [];

for (let i = 0; i < BUCKETS; i++) {
  // Random duration between 2s and 10s, slightly clustered around 5s.
  const durationMs = Math.round(2000 + Math.abs(normal()) * 1800 + rand() * 1500);
  const startMs = nowMs;
  const endMs = startMs + durationMs;

  const open = price;
  // Per-bucket return ~ N(drift, vol*sqrt(dt))
  const dtSec = durationMs / 1000;
  const sigma = VOL_PER_SEC * Math.sqrt(dtSec);
  const drift = 0; // no directional bias in fixture
  const ret = drift + sigma * normal();
  const close = open * Math.exp(ret);

  // Intra-bucket high/low via two extra normal draws.
  const wickUp = Math.abs(normal()) * sigma * open;
  const wickDown = Math.abs(normal()) * sigma * open;
  const high = Math.max(open, close) + wickUp;
  const low = Math.min(open, close) - wickDown;

  // Notional fixed at threshold (dollar bar definition); jitter for realism.
  const notional = THRESHOLD * (1 + (rand() - 0.5) * 0.02);
  // VWAP between open and close, biased toward the side spent more time.
  const vwapBias = clampZeroOne(0.5 + 0.3 * (rand() - 0.5));
  const vwap = open * (1 - vwapBias) + close * vwapBias;
  const volume = notional / vwap;

  const tradeCount = Math.round(40 + rand() * 80);

  // Buy/sell split skewed slightly by per-bucket direction.
  const dirSign = close > open ? 1 : close < open ? -1 : 0;
  const buyShare = clampZeroOne(0.5 + dirSign * (0.05 + rand() * 0.15));
  const buyNotional = notional * buyShare;
  const sellNotional = notional - buyNotional;
  const imbalance =
    (buyNotional - sellNotional) / (buyNotional + sellNotional || 1);

  const returnLog = Math.log(close / open);
  const rangeAbs = high - low;
  const rangePct = rangeAbs / vwap;
  const direction = classifyDirection(open, close);
  const intensity = notional / (durationMs / 1000);

  buckets.push({
    symbol: SYMBOL,
    stream: STREAM,
    bucket_id: bucketId++,
    threshold_usd: THRESHOLD,
    start_ms: startMs,
    end_ms: endMs,
    duration_ms: durationMs,
    open: round2(open),
    high: round2(high),
    low: round2(low),
    close: round2(close),
    vwap: round2(vwap),
    notional: round2(notional),
    volume: round6(volume),
    trade_count: tradeCount,
    buy_notional: round2(buyNotional),
    sell_notional: round2(sellNotional),
    imbalance: round4(imbalance),
    return_log: round6(returnLog),
    range_abs: round2(rangeAbs),
    range_pct: round6(rangePct),
    direction,
    intensity: round2(intensity),
    // Forward-compatible placeholders for the attestation roadmap.
    prediction_id: null,
    feature_snapshot_hash: null,
    agent_id: null,
    attestation: null,
  });

  price = close;
  nowMs = endMs + Math.round(rand() * 50);
}

// Build 5-minute window summaries by walking through buckets.
const WINDOW_MS = 5 * 60 * 1000;
const summaries = [];
let cursorMs = START_MS;
const firstEnd = buckets[buckets.length - 1].end_ms;

while (cursorMs + WINDOW_MS <= firstEnd && summaries.length < 5) {
  const winStart = cursorMs;
  const winEnd = cursorMs + WINDOW_MS;
  const inWin = buckets.filter((b) => b.end_ms > winStart && b.end_ms <= winEnd);
  if (inWin.length === 0) {
    cursorMs += WINDOW_MS;
    continue;
  }

  const bucketCount = inWin.length;
  const heartbeatsPerMin = bucketCount / 5;
  const durations = inWin.map((b) => b.duration_ms).sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];
  const avg = inWin.reduce((s, b) => s + b.duration_ms, 0) / bucketCount;

  const firstClose = inWin[0].open;
  const lastClose = inWin[inWin.length - 1].close;
  const priceChangePct = (lastClose - firstClose) / firstClose;

  const rv = inWin.reduce((s, b) => s + b.return_log ** 2, 0);
  const posSemiVar = inWin
    .filter((b) => b.return_log > 0)
    .reduce((s, b) => s + b.return_log ** 2, 0);
  const negSemiVar = inWin
    .filter((b) => b.return_log < 0)
    .reduce((s, b) => s + b.return_log ** 2, 0);

  // Bipower variation (simplified).
  let bv = 0;
  for (let i = 1; i < inWin.length; i++) {
    bv += Math.abs(inWin[i].return_log) * Math.abs(inWin[i - 1].return_log);
  }
  bv *= Math.PI / 2;
  const jumpVar = Math.max(rv - bv, 0);
  const jumpRatio = rv > 0 ? jumpVar / rv : 0;

  const avgImbalance =
    inWin.reduce((s, b) => s + b.imbalance, 0) / bucketCount;

  // Activity regime relative to a fixed baseline (placeholder for fixture).
  const baselineHbpm = 6.0;
  const activityMultiple = heartbeatsPerMin / baselineHbpm;
  let activityRegime = "normal";
  if (activityMultiple < 0.5) activityRegime = "quiet";
  else if (activityMultiple >= 3) activityRegime = "very_active";
  else if (activityMultiple >= 1.5) activityRegime = "active";

  const vwapTrend = priceChangePct > 0.0005 ? "up" : priceChangePct < -0.0005 ? "down" : "flat";
  const liquidityShock = activityMultiple > 2 && Math.sqrt(rv) > 0.004;

  summaries.push({
    symbol: SYMBOL,
    stream: STREAM,
    window: "5m",
    threshold_usd: THRESHOLD,
    window_start_ms: winStart,
    window_end_ms: winEnd,
    bucket_count: bucketCount,
    heartbeats_per_min: round2(heartbeatsPerMin),
    avg_bucket_duration_ms: Math.round(avg),
    median_bucket_duration_ms: Math.round(median),
    price_change_pct: round6(priceChangePct),
    vwap_trend: vwapTrend,
    realized_volatility: round6(Math.sqrt(rv)),
    positive_semivariance: round6(posSemiVar),
    negative_semivariance: round6(negSemiVar),
    jump_ratio: round4(jumpRatio),
    imbalance: round4(avgImbalance),
    activity_regime: activityRegime,
    activity_multiple: round2(activityMultiple),
    liquidity_shock: liquidityShock,
    notable_events: liquidityShock
      ? [
          {
            type: "heartbeat_rate_spike",
            severity: "medium",
            reason: `heartbeats_per_min is ${round2(activityMultiple)}x the fixture baseline`,
          },
        ]
      : [],
    prediction_id: null,
    feature_snapshot_hash: null,
    agent_id: null,
    attestation: null,
  });

  cursorMs = winEnd;
}

const fixture = {
  meta: {
    source: "synthetic",
    seed: SEED,
    generator: "scripts/build-fixture.mjs",
    symbol: SYMBOL,
    stream: STREAM,
    threshold_usd: THRESHOLD,
    bucket_count: buckets.length,
    summary_count: summaries.length,
    note: "Synthetic data for offline MCP development. Not a real exchange feed.",
  },
  buckets,
  summaries,
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(fixture, null, 2) + "\n", "utf8");
console.log(
  `Wrote ${OUT_PATH} (${buckets.length} buckets, ${summaries.length} summaries)`,
);

function round2(x) {
  return Math.round(x * 100) / 100;
}
function round4(x) {
  return Math.round(x * 10000) / 10000;
}
function round6(x) {
  return Math.round(x * 1e6) / 1e6;
}
