import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("requires ENGAIN_API_KEY", () => {
    expect(() => loadConfig({})).toThrow(/ENGAIN_API_KEY/);
  });

  it("applies defaults", () => {
    const c = loadConfig({ ENGAIN_API_KEY: "eng_x" });
    expect(c.apiKey).toBe("eng_x");
    expect(c.baseUrl).toBe("https://api.engain.io");
    expect(c.defaultProjectId).toBeUndefined();
    expect(c.readonly).toBe(false);
  });

  it("reads overrides and strips trailing slash", () => {
    const c = loadConfig({
      ENGAIN_API_KEY: "eng_x",
      ENGAIN_BASE_URL: "https://api.example.com/",
      ENGAIN_PROJECT_ID: "proj_1",
      ENGAIN_MCP_READONLY: "true",
    });
    expect(c.baseUrl).toBe("https://api.example.com");
    expect(c.defaultProjectId).toBe("proj_1");
    expect(c.readonly).toBe(true);
  });

  it("treats 1/yes/TRUE as readonly truthy", () => {
    for (const v of ["1", "yes", "TRUE"]) {
      expect(loadConfig({ ENGAIN_API_KEY: "x", ENGAIN_MCP_READONLY: v }).readonly).toBe(true);
    }
    expect(loadConfig({ ENGAIN_API_KEY: "x", ENGAIN_MCP_READONLY: "0" }).readonly).toBe(false);
  });
});
