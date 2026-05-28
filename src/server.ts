import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./lib/version.js";
import type { createHeartbeatApi } from "./lib/heartbeatApi.js";
import type { DataSource } from "./sources/index.js";
import { registerGetCurrentHeartbeat } from "./tools/getCurrentHeartbeat.js";
import { registerGetRecentHeartbeats } from "./tools/getRecentHeartbeats.js";
import { registerSummarizeMarketState } from "./tools/summarizeMarketState.js";
import { registerCommitDescriptive } from "./tools/commitDescriptive.js";
import { registerGetAgentTrackRecord } from "./tools/getAgentTrackRecord.js";

type HeartbeatApi = ReturnType<typeof createHeartbeatApi>;

/**
 * Build an MCP server wired to a given data source. Kept pure so tests can
 * construct a server with a fake source and exercise tool handlers without
 * touching stdio.
 */
export function buildServer(source: DataSource, api?: HeartbeatApi): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerGetCurrentHeartbeat(server, source);
  registerGetRecentHeartbeats(server, source);
  registerSummarizeMarketState(server, source);

  if (api) {
    registerCommitDescriptive(server, api);
    registerGetAgentTrackRecord(server, api);
  }

  return server;
}
