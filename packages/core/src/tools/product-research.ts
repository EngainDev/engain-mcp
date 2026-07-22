import { z } from "zod";
import { defineTool, type EngainTool } from "./types.js";

export const productResearchTools: EngainTool[] = [
  defineTool({
    name: "engain_product_research",
    description:
      "Run agentic product research on Reddit for a project. Give a goal like 'find new hooks for headaches' (optionally with specific Reddit post links); an AI agent searches Reddit, reads posts and comments, and returns findings: pains, hooks, angles and flaws, each with source URLs. Consumes one monthly research run. Can take 1-2 minutes.",
    inputSchema: z.object({
      goal: z.string().min(3).max(500).describe("What to research, e.g. 'find new hooks for headaches'"),
      links: z.array(z.string()).max(5).optional().describe("Optional Reddit post URLs to analyze (max 5). Omit to let the agent search on its own."),
      projectId: z.string().optional().describe("Engain project (campaign) ID. Defaults to ENGAIN_PROJECT_ID if set."),
    }),
    // Consumes the monthly research-run quota, so treat as a spend tool (hidden when ENGAIN_MCP_READONLY).
    spendsCredits: true,
    handler: (args, client) =>
      client.request("POST", "/research", {
        body: {
          projectId: client.resolveProjectId(args.projectId),
          goal: args.goal,
          links: args.links ?? [],
        },
      }),
  }),
];
