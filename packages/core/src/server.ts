import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config.js";
import { EngainClient, EngainError } from "./client.js";
import { buildToolRegistry } from "./tools/index.js";

export function createServer(): McpServer {
  const config = loadConfig();
  const client = new EngainClient(config);
  const server = new McpServer({ name: "engain-mcp", version: "0.1.0" });

  for (const tool of buildToolRegistry(config.readonly)) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args: unknown) => {
        try {
          const result = await tool.handler(args as never, client);
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        } catch (err) {
          const e =
            err instanceof EngainError
              ? err
              : new EngainError(500, "internal_error", String(err));
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { error: e.code, message: e.message, status: e.status },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }
    );
  }

  return server;
}
