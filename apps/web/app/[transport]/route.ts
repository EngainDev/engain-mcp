import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { auth } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { registerEngainTools } from "../../lib/register-tools";
import { webConfig } from "../../lib/config";

export const maxDuration = 60;

const { baseUrl, readonly } = webConfig();

const handler = createMcpHandler(
  (server) => {
    registerEngainTools(server as never, { baseUrl, readonly });
  },
  { serverInfo: { name: "engain-mcp", version: "0.1.0" }, capabilities: { tools: {} } },
  { basePath: "" }
);

// Dual-mode: an `eng_` key (Stage 1 / CLI) OR a Clerk OAuth token (claude.ai).
const verify = async (req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  const raw = bearerToken ?? req.headers.get("x-api-key") ?? undefined;
  const token = raw?.trim();
  if (!token) return undefined;

  if (token.startsWith("eng_")) {
    return { token, scopes: [], clientId: "engain-api-key", extra: { mode: "apiKey" } };
  }

  const clerkAuth = await auth({ acceptsToken: "oauth_token" });
  const info = await verifyClerkToken(clerkAuth, token);
  if (!info) return undefined;
  return { ...info, extra: { ...info.extra, mode: "bearer" } };
};

const authHandler = withMcpAuth(handler, verify, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
