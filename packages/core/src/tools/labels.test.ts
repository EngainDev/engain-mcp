import { describe, it, expect, vi } from "vitest";
import { labelTools } from "./labels.js";
import { makeClient, jsonResponse } from "../test-helpers.js";

const byName = (n: string) => labelTools.find((t) => t.name === n)!;

describe("label tools", () => {
  it("list_labels GETs /labels with projectId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { labels: [] }));
    await byName("engain_list_labels").handler({ projectId: "p1" } as any, makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.engain.io/api/v1/labels?projectId=p1");
  });

  it("create_label POSTs name", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = byName("engain_create_label");
    await t.handler(t.inputSchema.parse({ projectId: "p1", name: "hot" }), makeClient(fetchMock));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.engain.io/api/v1/labels");
    expect(JSON.parse(init.body)).toEqual({ projectId: "p1", name: "hot" });
  });

  it("delete_label DELETEs /labels/{name} with projectId query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = byName("engain_delete_label");
    await t.handler(t.inputSchema.parse({ projectId: "p1", labelName: "hot" }), makeClient(fetchMock));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.engain.io/api/v1/labels/hot?projectId=p1");
    expect(init.method).toBe("DELETE");
  });

  it("add_task_labels POSTs taskId + labels", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = byName("engain_add_task_labels");
    await t.handler(t.inputSchema.parse({ taskId: "t1", labels: ["a", "b"] }), makeClient(fetchMock));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.engain.io/api/v1/labels/add-to-task");
    expect(JSON.parse(init.body)).toEqual({ taskId: "t1", labels: ["a", "b"] });
  });

  it("remove_order_labels POSTs orderId + labels", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const t = byName("engain_remove_order_labels");
    await t.handler(t.inputSchema.parse({ orderId: "o1", labels: ["x"] }), makeClient(fetchMock));
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.engain.io/api/v1/labels/remove-from-order");
  });
});
