import { describe, it, expect, vi } from "vitest";
import { discoveryTools } from "./discovery.js";
import { makeClient, jsonResponse } from "../test-helpers.js";

const byName = (n: string) => discoveryTools.find((t) => t.name === n)!;

describe("discovery tools", () => {
  it("list_opportunities requires type and forwards it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    const t = byName("engain_list_opportunities");
    await t.handler(
      t.inputSchema.parse({ projectId: "p1", type: "new_opportunities" }),
      makeClient(fetchMock)
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.engain.io/api/v1/opportunities?projectId=p1&type=new_opportunities"
    );
    expect(() => t.inputSchema.parse({ projectId: "p1" })).toThrow();
  });

  it("get_opportunity hits /opportunities/{id}", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "op1" }));
    const t = byName("engain_get_opportunity");
    await t.handler(t.inputSchema.parse({ opportunityId: "op1" }), makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.engain.io/api/v1/opportunities/op1");
  });

  it("list_mentions forwards brand + sentiment", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    const t = byName("engain_list_mentions");
    await t.handler(
      t.inputSchema.parse({ projectId: "p1", brand: "acme", sentiment: "positive" }),
      makeClient(fetchMock)
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.engain.io/api/v1/mentions?projectId=p1&brand=acme&sentiment=positive"
    );
  });

  it("get_mention_stats and get_mention_brands hit their paths", async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(200, {}));
    const client = makeClient(fetchMock);
    await byName("engain_get_mention_stats").handler({ projectId: "p1" } as any, client);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.engain.io/api/v1/mentions/stats?projectId=p1");
    await byName("engain_get_mention_brands").handler({ projectId: "p1" } as any, client);
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.engain.io/api/v1/mentions/brands?projectId=p1");
  });
});
