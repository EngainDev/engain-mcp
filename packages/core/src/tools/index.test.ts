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
  "engain_smart_search",
];

describe("buildToolRegistry", () => {
  it("includes all tools (36) when not readonly", () => {
    const tools = buildToolRegistry(false);
    expect(tools).toHaveLength(36);
    expect(new Set(tools.map((t) => t.name)).size).toBe(36); // unique names
  });

  it("omits the 8 spend tools in readonly mode", () => {
    const tools = buildToolRegistry(true);
    expect(tools).toHaveLength(28);
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

  it("keeps the preflight tools available in readonly mode", () => {
    // Preflight publishes nothing, so a read-only connector must not be forced to advise blind.
    const readonlyNames = buildToolRegistry(true).map((t) => t.name);
    expect(readonlyNames).toContain("engain_rule_check");
    expect(readonlyNames).toContain("engain_rule_check_batch");
    expect(readonlyNames).toContain("engain_get_subreddit_stats");
  });

  it("keeps the free Smart Search reads available in readonly mode", () => {
    const readonlyNames = buildToolRegistry(true).map((t) => t.name);
    expect(readonlyNames).toContain("engain_get_smart_search_results");
    expect(readonlyNames).toContain("engain_list_smart_search_history");
  });

  it("all tool names are prefixed engain_", () => {
    for (const t of buildToolRegistry(false)) {
      expect(t.name.startsWith("engain_")).toBe(true);
    }
  });
});
