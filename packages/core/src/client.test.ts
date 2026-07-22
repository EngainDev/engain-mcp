import { describe, it, expect, vi } from "vitest";
import { EngainClient, EngainError } from "./client.js";
import type { EngainConfig } from "./config.js";

const base: EngainConfig = {
  apiKey: "eng_test",
  baseUrl: "https://api.engain.io",
  readonly: false,
};

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("EngainClient.request", () => {
  it("sends X-API-Key and builds the /api/v1 URL with query, omitting undefined", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = new EngainClient(base, { fetch: fetchMock });
    const out = await client.request("GET", "/tasks", {
      query: { projectId: "p1", status: undefined, numItems: 10 },
    });
    expect(out).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.engain.io/api/v1/tasks?projectId=p1&numItems=10");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("eng_test");
    expect(init.method).toBe("GET");
  });

  it("serializes body for POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "t1" }));
    const client = new EngainClient(base, { fetch: fetchMock });
    await client.request("POST", "/tasks/comment", { body: { projectId: "p1", content: "hi" } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(JSON.stringify({ projectId: "p1", content: "hi" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("maps non-2xx to EngainError with code/message from body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(400, { code: "bad_request", message: "nope" }));
    const client = new EngainClient(base, { fetch: fetchMock });
    await expect(client.request("GET", "/me")).rejects.toMatchObject({
      name: "EngainError",
      status: 400,
      code: "bad_request",
      message: "nope",
    });
  });

  it("retries on 429 then succeeds, honoring retry-after", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { message: "slow down" }, { "retry-after": "2" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = new EngainClient(base, { fetch: fetchMock, sleep });
    const out = await client.request("GET", "/me");
    expect(out).toEqual({ ok: true });
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 retries on persistent 429", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(429, { message: "slow" }));
    const client = new EngainClient(base, { fetch: fetchMock, sleep });
    await expect(client.request("GET", "/me")).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 retries
  });

  it("resolveProjectId prefers explicit, falls back to default, else throws", () => {
    const withDefault = new EngainClient({ ...base, defaultProjectId: "pdef" });
    expect(withDefault.resolveProjectId("p9")).toBe("p9");
    expect(withDefault.resolveProjectId()).toBe("pdef");
    const without = new EngainClient(base);
    expect(() => without.resolveProjectId()).toThrow(/projectId/i);
  });

  it("sends Authorization: Bearer and omits X-API-Key when bearerToken is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = new EngainClient({ ...base, bearerToken: "tok123" }, { fetch: fetchMock });
    await client.request("GET", "/me");
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer tok123");
    expect(headers.has("x-api-key")).toBe(false);
  });

  it("sends X-API-Key and omits Authorization when only apiKey is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = new EngainClient(base, { fetch: fetchMock });
    await client.request("GET", "/me");
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("x-api-key")).toBe("eng_test");
    expect(headers.has("authorization")).toBe(false);
  });
});
