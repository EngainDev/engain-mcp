import type { EngainTool } from "./types.js";
import { identityTools } from "./identity.js";
import { taskTools } from "./tasks.js";
import { orderTools } from "./orders.js";
import { discoveryTools } from "./discovery.js";
import { labelTools } from "./labels.js";
import { productResearchTools } from "./product-research.js";

export function buildToolRegistry(readonly: boolean): EngainTool[] {
  const all: EngainTool[] = [
    ...identityTools,
    ...taskTools,
    ...orderTools,
    ...discoveryTools,
    ...labelTools,
    ...productResearchTools,
  ];
  return readonly ? all.filter((t) => !t.spendsCredits) : all;
}
