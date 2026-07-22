import { describe, it, expect } from "vitest";
import { buildToolRegistry } from "./index.js";

const SPEND = [
  "engain_create_comment_task",
  "engain_create_post_task",
  "engain_create_reply_task",
  "engain_create_thread_task_group",
  "engain_create_upvote_order",
  "engain_create_downvote_order",
  "engain_product_research",
];

describe("buildToolRegistry", () => {
  it("includes all tools (30) when not readonly", () => {
    const tools = buildToolRegistry(false);
    expect(tools).toHaveLength(30);
    expect(new Set(tools.map((t) => t.name)).size).toBe(30); // unique names
  });

  it("omits the 7 spend tools in readonly mode", () => {
    const tools = buildToolRegistry(true);
    expect(tools).toHaveLength(23);
    for (const name of SPEND) {
      expect(tools.find((t) => t.name === name)).toBeUndefined();
    }
  });

  it("every spend tool is flagged spendsCredits", () => {
    const all = buildToolRegistry(false);
    for (const name of SPEND) {
      expect(all.find((t) => t.name === name)?.spendsCredits).toBe(true);
    }
  });

  it("all tool names are prefixed engain_", () => {
    for (const t of buildToolRegistry(false)) {
      expect(t.name.startsWith("engain_")).toBe(true);
    }
  });
});
