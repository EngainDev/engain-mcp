import { buildToolRegistry } from "engain-mcp/tools";
import { EngainClient, EngainError } from "engain-mcp/client";

export interface RegisterOpts {
  baseUrl: string;
  readonly: boolean;
}

// Minimal shape we depend on from an McpServer (also satisfied by mcp-handler's server).
export interface McpLike {
  registerTool(
    name: string,
    config: { description: string; inputSchema: unknown },
    handler: (
      args: any,
      extra: { authInfo?: { token?: string; extra?: { mode?: string } } }
    ) => Promise<any>
  ): void;
}

export function registerEngainTools(server: McpLike, opts: RegisterOpts): void {
  for (const tool of buildToolRegistry(opts.readonly)) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (args, extra) => {
        const authInfo = extra?.authInfo;
        const token = authInfo?.token ?? "";
        const client =
          authInfo?.extra?.mode === "bearer"
            ? new EngainClient({ apiKey: "", bearerToken: token, baseUrl: opts.baseUrl, readonly: opts.readonly })
            : new EngainClient({ apiKey: token, baseUrl: opts.baseUrl, readonly: opts.readonly });
        try {
          const result = await tool.handler(args, client);
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        } catch (err) {
          const e = err instanceof EngainError ? err : new EngainError(500, "internal_error", String(err));
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: e.code, message: e.message, status: e.status }, null, 2),
              },
            ],
          };
        }
      }
    );
  }
}
