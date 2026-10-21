import { describe, it, expect, vi } from "vitest";
import { smartSearchTools } from "./smart-search.js";
import { makeClient, jsonResponse } from "../test-helpers.js";

const byName = (n: string) => smartSearchTools.find((t) => t.name === n)!;

describe("smart search tools", () => {
  it("smart_search POSTs the keyword, mode and spelling to /smart-search", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { results: [], quotaRemaining: 9 }));
    const t = byName("engain_smart_search");
    await t.handler(
      t.inputSchema.parse({ projectId: "p1", keyword: "best crm", searchMode: "web_ranking", exactSpelling: true }),
      makeClient(fetchMock)
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.engain.io/api/v1/smart-search");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ projectId: "p1", keyword: "best crm", searchMode: "web_ranking", exactSpelling: true });
  });

  it("smart_search falls back to the default project and leaves optional fields out", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    const t = byName("engain_smart_search");
    await t.handler(t.inputSchema.parse({ keyword: "best crm" }), makeClient(fetchMock, "pdefault"));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ projectId: "pdefault", keyword: "best crm" });
  });

  it("smart_search says it spends Smart Search Quota and rejects an empty keyword", () => {
    const t = byName("engain_smart_search");
    expect(t.description).toContain("SMART SEARCH QUOTA");
    expect(t.spendsCredits).toBe(true);
    expect(() => t.inputSchema.parse({ projectId: "p1", keyword: "" })).toThrow();
  });

  it("get_smart_search_results GETs /smart-search/results with the same keyword parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { results: [] }));
    const t = byName("engain_get_smart_search_results");
    await t.handler(
      t.inputSchema.parse({ projectId: "p1", keyword: "best crm", exactSpelling: false }),
      makeClient(fetchMock)
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.engain.io/api/v1/smart-search/results?projectId=p1&keyword=best+crm&exactSpelling=false"
    );
    expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(t.spendsCredits).toBe(false);
  });

  it("list_smart_search_history GETs /smart-search/history with the limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { history: [] }));
    const t = byName("engain_list_smart_search_history");
    await t.handler(t.inputSchema.parse({ projectId: "p1", limit: 25 }), makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.engain.io/api/v1/smart-search/history?projectId=p1&limit=25");
    expect(() => t.inputSchema.parse({ projectId: "p1", limit: 101 })).toThrow();
  });
});
