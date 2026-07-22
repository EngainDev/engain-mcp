import type { z } from "zod";
import type { EngainClient } from "../client.js";

export interface EngainTool<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: S;
  spendsCredits: boolean;
  handler: (args: z.infer<S>, client: EngainClient) => Promise<unknown>;
}

export function defineTool<S extends z.ZodTypeAny>(t: EngainTool<S>): EngainTool {
  return t as unknown as EngainTool;
}
