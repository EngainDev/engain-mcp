import { describe, it, expect, vi } from "vitest";
import { identityTools } from "./identity.js";
import { makeClient, jsonResponse } from "../test-helpers.js";

const byName = (n: string) => identityTools.find((t) => t.name === n)!;

describe("identity tools", () => {
  it("get_me calls GET /me", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { userId: "u1", projects: [] }));
    const out = await byName("engain_get_me").handler({}, makeClient(fetchMock));
    expect(out).toEqual({ userId: "u1", projects: [] });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.engain.io/api/v1/me");
  });

  it("get_balance calls GET /balance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { creditsRemaining: 5, freeComments: 2 }));
    await byName("engain_get_balance").handler({}, makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.engain.io/api/v1/balance");
  });

  it("list_credit_transactions resolves projectId from env default and forwards filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    const tool = byName("engain_list_credit_transactions");
    const args = tool.inputSchema.parse({ numItems: 10, type: "purchase" });
    await tool.handler(args, makeClient(fetchMock, "pdef"));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.engain.io/api/v1/credit-transactions?projectId=pdef&numItems=10&type=purchase"
    );
  });
});
