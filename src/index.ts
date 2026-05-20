import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";
import { selectDataSource } from "./lib/selectSource.js";
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

  process.stderr.write(
    `[${SERVER_NAME}@${SERVER_VERSION}] source=${source.id} ` +
      `symbols=[${symbols.join(",")}] windows=[${windows.join(",")}]\n`,
  );

  const server = buildServer(source);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `[${SERVER_NAME}] ready on stdio. ` +
      `Tools: get_current_heartbeat, get_recent_heartbeats, summarize_market_state.\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[${SERVER_NAME}] fatal: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
