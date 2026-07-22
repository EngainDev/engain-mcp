import { describe, it, expect, vi } from "vitest";
import { orderTools } from "./orders.js";
import { makeClient, jsonResponse } from "../test-helpers.js";

const byName = (n: string) => orderTools.find((t) => t.name === n)!;

describe("order tools", () => {
  it("list_orders forwards projectId + campaignId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    const t = byName("engain_list_orders");
    await t.handler(t.inputSchema.parse({ projectId: "p1", campaignId: "c1" }), makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.engain.io/api/v1/orders?projectId=p1&campaignId=c1"
    );
  });

  it("create_upvote_order POSTs body, flagged spendsCredits", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "o1", creditsCharged: 5 }));
    const t = byName("engain_create_upvote_order");
    expect(t.spendsCredits).toBe(true);
    const args = t.inputSchema.parse({
      projectId: "p1",
      url: "https://reddit.com/r/x/1",
      quantity: 50,
      target: "post",
    });
    await t.handler(args, makeClient(fetchMock));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.engain.io/api/v1/orders/upvote");
    expect(JSON.parse(init.body)).toMatchObject({ quantity: 50, target: "post" });
  });

  it("create_downvote_order hits /orders/downvote", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "o2" }));
    const t = byName("engain_create_downvote_order");
    const args = t.inputSchema.parse({ projectId: "p1", url: "https://r/x", quantity: 10, target: "comment" });
    await t.handler(args, makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.engain.io/api/v1/orders/downvote");
  });

  it("upvote quantity is bounded 1..2000", () => {
    const t = byName("engain_create_upvote_order");
    expect(() => t.inputSchema.parse({ projectId: "p1", url: "https://r/x", quantity: 3000, target: "post" })).toThrow();
  });
});
