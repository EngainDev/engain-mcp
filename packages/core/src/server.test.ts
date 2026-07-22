import { describe, it, expect } from "vitest";
import { buildToolRegistry } from "./tools/index.js";

// createServer wires the SDK; the registration logic under test is the registry +
// readonly filter, which we assert directly to avoid coupling tests to SDK internals.
describe("server tool selection", () => {
  it("registers 30 tools normally and 23 in readonly", () => {
    expect(buildToolRegistry(false)).toHaveLength(30);
    expect(buildToolRegistry(true)).toHaveLength(23);
  });
});
