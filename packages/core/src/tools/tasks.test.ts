import { describe, it, expect, vi } from "vitest";
import { taskTools } from "./tasks.js";
import { makeClient, jsonResponse } from "../test-helpers.js";

const byName = (n: string) => taskTools.find((t) => t.name === n)!;

describe("task tools", () => {
  it("list_tasks forwards projectId + status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    const t = byName("engain_list_tasks");
    await t.handler(t.inputSchema.parse({ projectId: "p1", status: "published" }), makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.engain.io/api/v1/tasks?projectId=p1&status=published"
    );
  });

  it("get_task hits /tasks/{id} with refreshMetrics", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "t1" }));
    const t = byName("engain_get_task");
    await t.handler(t.inputSchema.parse({ taskId: "t1", refreshMetrics: true }), makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.engain.io/api/v1/tasks/t1?refreshMetrics=true"
    );
  });

  it("get_tasks_bulk joins ids", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    const t = byName("engain_get_tasks_bulk");
    await t.handler(t.inputSchema.parse({ projectId: "p1", ids: ["a", "b"] }), makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.engain.io/api/v1/tasks/bulk?projectId=p1&ids=a%2Cb"
    );
  });

  it("get_rank_metrics POSTs type+url and does not spend credits", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { recommended: 100 }));
    const t = byName("engain_get_rank_metrics");
    expect(t.spendsCredits).toBe(false);
    await t.handler(t.inputSchema.parse({ type: "post", url: "https://r/x" }), makeClient(fetchMock));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.engain.io/api/v1/rank-metrics");
    expect(JSON.parse(init.body)).toEqual({ type: "post", url: "https://r/x" });
  });

  it("create_comment_task POSTs body and is flagged spendsCredits", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { id: "t9", creditsCharged: 5 }));
    const t = byName("engain_create_comment_task");
    expect(t.spendsCredits).toBe(true);
    const args = t.inputSchema.parse({
      projectId: "p1",
      url: "https://reddit.com/r/x/comments/1",
      content: "great point",
    });
    await t.handler(args, makeClient(fetchMock));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.engain.io/api/v1/tasks/comment");
    expect(JSON.parse(init.body)).toMatchObject({ projectId: "p1", content: "great point" });
  });

  it("create_post_task requires postTitle + subredditUrl", async () => {
    const t = byName("engain_create_post_task");
    expect(() => t.inputSchema.parse({ projectId: "p1", content: "x" })).toThrow();
    expect(() =>
      t.inputSchema.parse({ projectId: "p1", content: "x", postTitle: "T", subredditUrl: "https://r/x" })
    ).not.toThrow();
  });
});
