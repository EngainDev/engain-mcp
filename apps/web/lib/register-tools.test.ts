import { describe, it, expect, vi } from "vitest";
import { registerEngainTools } from "./register-tools.js";

// Capture registrations from a fake McpServer.
function fakeServer() {
  const tools = new Map<string, { config: any; handler: Function }>();
  return {
    tools,
    registerTool(name: string, config: any, handler: Function) {
      tools.set(name, { config, handler });
    },
  };
}

describe("registerEngainTools", () => {
  it("registers the full tool set and hides spend tools when readonly", () => {
    const full = fakeServer();
    registerEngainTools(full as any, { baseUrl: "https://api.engain.io", readonly: false });
    const ro = fakeServer();
    registerEngainTools(ro as any, { baseUrl: "https://api.engain.io", readonly: true });
    expect(full.tools.size).toBeGreaterThan(ro.tools.size);
    expect(full.tools.has("engain_create_comment_task")).toBe(true);
    expect(ro.tools.has("engain_create_comment_task")).toBe(false);
    expect(ro.tools.has("engain_get_me")).toBe(true);
  });

  it("builds a per-request client from the bearer token and returns tool JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ userId: "u1", projects: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const srv = fakeServer();
    registerEngainTools(srv as any, { baseUrl: "https://api.engain.io", readonly: false });
    const getMe = srv.tools.get("engain_get_me")!;
    const res = await getMe.handler({}, { authInfo: { token: "eng_reqkey" } });
    // outgoing request carried the per-request key
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("eng_reqkey");
    expect(res.content[0].text).toContain("u1");
    vi.unstubAllGlobals();
  });

  it("builds a bearer-auth client when authInfo.extra.mode is 'bearer'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ userId: "u1", projects: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const srv = fakeServer();
    registerEngainTools(srv as any, { baseUrl: "https://api.engain.io", readonly: false });
    const getMe = srv.tools.get("engain_get_me")!;
    const res = await getMe.handler(
      {},
      { authInfo: { token: "clerk_tok", extra: { mode: "bearer" } } }
    );
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer clerk_tok");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBeUndefined();
    expect(res.content[0].text).toContain("u1");
    vi.unstubAllGlobals();
  });

  it("returns a structured isError result when the tool throws", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "INVALID_API_KEY", message: "bad" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const srv = fakeServer();
    registerEngainTools(srv as any, { baseUrl: "https://api.engain.io", readonly: false });
    const getMe = srv.tools.get("engain_get_me")!;
    const res = await getMe.handler({}, { authInfo: { token: "eng_bad" } });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("INVALID_API_KEY");
    vi.unstubAllGlobals();
  });
});
