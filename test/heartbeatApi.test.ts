import { describe, expect, it, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { createHeartbeatApi } from "../src/lib/heartbeatApi.js";

describe("heartbeatApi", () => {
  let server: http.Server;
  let port = 0;

  beforeEach(async () => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/v1/descriptive/commit" && req.method === "POST") {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            commit_id: "abc",
            context_snapshot_hash: "d".repeat(64),
            feature_set: "phase1",
            resolve_at_ms: 123,
          }),
        );
        return;
      }
      if (url.pathname === "/v1/agents/demo/track_record") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            agent_id: "demo",
            claim_type: "descriptive",
            total_resolved: 1,
            match: 1,
            mismatch: 0,
            void: 0,
            descriptive_accuracy: 1,
            commits: [],
          }),
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("commits descriptive via HTTP only", async () => {
    const api = createHeartbeatApi({ baseUrl: `http://127.0.0.1:${port}` });
    const result = await api.commitDescriptive({
      agent_id: "demo",
      claim_type: "descriptive",
      claim_type_id: "regime_quiet",
      symbol: "BTCUSDT",
      window: "5m",
    });
    expect(result.feature_set).toBe("phase1");
    expect(result.context_snapshot_hash).toHaveLength(64);
  });

  it("fetches agent track record via HTTP", async () => {
    const api = createHeartbeatApi({ baseUrl: `http://127.0.0.1:${port}` });
    const record = await api.getAgentTrackRecord("demo");
    expect(record.claim_type).toBe("descriptive");
    expect(record.match).toBe(1);
  });
});
