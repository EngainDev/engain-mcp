import { z } from "zod";
import { defineTool, type EngainTool } from "./types.js";

const projectIdField = z
  .string()
  .optional()
  .describe("Engain project (campaign) ID. Defaults to ENGAIN_PROJECT_ID if set.");

export const discoveryTools: EngainTool[] = [
  defineTool({
    name: "engain_list_opportunities",
    description:
      "List discovered opportunities for a project. type selects new Reddit opportunities or SEO opportunities.",
    inputSchema: z.object({
      projectId: projectIdField,
      type: z.enum(["new_opportunities", "seo_opportunities"]),
      sortBy: z.string().optional(),
      cursor: z.string().optional(),
      numItems: z.number().int().min(1).max(100).optional(),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/opportunities", {
        query: {
          projectId: client.resolveProjectId(args.projectId),
          type: args.type,
          sortBy: args.sortBy,
          cursor: args.cursor,
          numItems: args.numItems,
        },
      }),
  }),
  defineTool({
    name: "engain_get_opportunity",
    description: "Get a single opportunity by ID.",
    inputSchema: z.object({ opportunityId: z.string() }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", `/opportunities/${encodeURIComponent(args.opportunityId)}`),
  }),
  defineTool({
    name: "engain_list_mentions",
    description: "List brand mentions discovered for a project, filterable by brand and sentiment.",
    inputSchema: z.object({
      projectId: projectIdField,
      brand: z.string().optional(),
      sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
      sortBy: z.string().optional(),
      cursor: z.string().optional(),
      numItems: z.number().int().min(1).max(100).optional(),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/mentions", {
        query: {
          projectId: client.resolveProjectId(args.projectId),
          brand: args.brand,
          sentiment: args.sentiment,
          sortBy: args.sortBy,
          cursor: args.cursor,
          numItems: args.numItems,
        },
      }),
  }),
  defineTool({
    name: "engain_get_mention",
    description: "Get a single mention by ID.",
    inputSchema: z.object({ mentionId: z.string() }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", `/mentions/${encodeURIComponent(args.mentionId)}`),
  }),
  defineTool({
    name: "engain_get_mention_stats",
    description: "Get aggregated sentiment counts for a project's mentions, optionally for one brand.",
    inputSchema: z.object({ projectId: projectIdField, brand: z.string().optional() }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/mentions/stats", {
        query: { projectId: client.resolveProjectId(args.projectId), brand: args.brand },
      }),
  }),
  defineTool({
    name: "engain_get_mention_brands",
    description: "Get per-brand mention counts for a project.",
    inputSchema: z.object({ projectId: projectIdField }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/mentions/brands", {
        query: { projectId: client.resolveProjectId(args.projectId) },
      }),
  }),
];
