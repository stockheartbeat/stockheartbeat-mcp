import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";
import { selectDataSource } from "./lib/selectSource.js";
import { createHeartbeatApi } from "./lib/heartbeatApi.js";
import { SERVER_NAME, SERVER_VERSION } from "./lib/version.js";

/**
 * stdio entry point. All diagnostic logging is sent to stderr so it does not
 * corrupt the MCP JSON-RPC stream on stdout.
 */
async function main(): Promise<void> {
  const fixturePath = process.env.HEARTBEAT_FIXTURE_PATH;
  const source = selectDataSource({ fixturePath });
  const symbols = await source.listSymbols();
  const windows = source.supportedWindows();

  let api;
  if (process.env.HEARTBEAT_API_BASE) {
    api = createHeartbeatApi();
  }

  process.stderr.write(
    `[${SERVER_NAME}@${SERVER_VERSION}] source=${source.id} ` +
      `symbols=[${symbols.join(",")}] windows=[${windows.join(",")}] ` +
      `descriptive=${api ? "on" : "off"}\n`,
  );

  const server = buildServer(source, api);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const toolList = api
    ? "get_current_heartbeat, get_recent_heartbeats, summarize_market_state, commit_descriptive, get_agent_track_record"
    : "get_current_heartbeat, get_recent_heartbeats, summarize_market_state";

  process.stderr.write(`[${SERVER_NAME}] ready on stdio. Tools: ${toolList}.\n`);
}

main().catch((err) => {
  process.stderr.write(`[${SERVER_NAME}] fatal: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
