/**
 * Centralised version constants. Avoid importing package.json from runtime
 * code so the bundler does not pull the file into dist/.
 */
export const SERVER_NAME = "stockheartbeat-mcp";
export const SERVER_VERSION = "0.3.0";

export const DISCLAIMER =
  "Returns event-based market state, not financial advice. " +
  "Heartbeat = dollar-notional bucket.";
