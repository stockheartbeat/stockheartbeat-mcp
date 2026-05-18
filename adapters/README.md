# Adapters

Reserved directory for agent-framework adapters that wrap the same data layer
as the MCP server but expose framework-native skills/tools instead of MCP.

**Nothing is implemented here in v0.1.** This README only documents the
intended layout so contributors do not propose conflicting structures.

## Planned adapters

| Adapter   | Status   | Notes                                                                 |
|-----------|----------|-----------------------------------------------------------------------|
| `hermes`  | Planned  | First-class citizen alongside MCP. Will expose the same three tools.  |
| `openclaw`| Planned  | Skill package mirroring the MCP tool shape.                           |

## Design rules

- Adapters import the **same** `DataSource` and Zod schemas as the MCP server;
  they never re-implement bucket semantics.
- Adapters never bundle credentials or chain SDKs in v0.x.
- Each adapter ships in its own subdirectory with its own `README.md` and,
  where applicable, its own `package.json` so it can be released independently.

## Out of scope for v0.1

- Real Hermes / OpenClaw integration code
- Cross-adapter test harness
- Adapter-specific tool extensions beyond the core three

If you are building such an adapter and want it merged here, please open an
issue first so the schema and source contract can be reviewed together.
