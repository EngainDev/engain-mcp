import { vi } from "vitest";
import { EngainClient } from "./client.js";

/** Build an EngainClient backed by a fetch mock for tool tests. */
export function makeClient(fetchMock: ReturnType<typeof vi.fn>, defaultProjectId?: string) {
  return new EngainClient(
    { apiKey: "eng_test", baseUrl: "https://api.engain.io", readonly: false, defaultProjectId },
    { fetch: fetchMock, sleep: async () => {} }
  );
}

export function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
