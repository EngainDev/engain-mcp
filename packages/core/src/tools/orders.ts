import { z } from "zod";
import { defineTool, type EngainTool } from "./types.js";

const projectIdField = z
  .string()
  .optional()
  .describe("Engain project (campaign) ID. Defaults to ENGAIN_PROJECT_ID if set.");

const voteOrderInput = z.object({
  projectId: projectIdField,
  url: z.string().url().describe("Reddit post or comment URL to act on."),
  quantity: z.number().int().min(1).max(2000),
  target: z.enum(["post", "comment"]),
  scheduledAt: z.string().optional(),
  votesPerDay: z.number().int().min(1).max(10).optional().describe("Delivery speed; default 5."),
  labels: z.array(z.string()).optional(),
});

function voteOrderBody(args: z.infer<typeof voteOrderInput>, client: import("../client.js").EngainClient) {
  return {
    projectId: client.resolveProjectId(args.projectId),
    url: args.url,
    quantity: args.quantity,
    target: args.target,
    scheduledAt: args.scheduledAt,
    votesPerDay: args.votesPerDay,
    labels: args.labels,
  };
}

export const orderTools: EngainTool[] = [
  defineTool({
    name: "engain_list_orders",
    description: "List a project's upvote/downvote orders, paginated. Filter by status OR campaignId (not both).",
    inputSchema: z.object({
      projectId: projectIdField,
      numItems: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
      status: z.string().optional(),
      campaignId: z.string().optional(),
      createdAfter: z.string().optional(),
      createdBefore: z.string().optional(),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/orders", {
        query: {
          projectId: client.resolveProjectId(args.projectId),
          numItems: args.numItems,
          cursor: args.cursor,
          status: args.status,
          campaignId: args.campaignId,
          createdAfter: args.createdAfter,
          createdBefore: args.createdBefore,
        },
      }),
  }),
  defineTool({
    name: "engain_get_order",
    description: "Get a single order by ID.",
    inputSchema: z.object({ orderId: z.string() }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", `/orders/${encodeURIComponent(args.orderId)}`),
  }),
  defineTool({
    name: "engain_get_orders_bulk",
    description: "Fetch up to 100 orders by ID in one call.",
    inputSchema: z.object({
      projectId: projectIdField,
      ids: z.array(z.string()).min(1).max(100),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/orders/bulk", {
        query: { projectId: client.resolveProjectId(args.projectId), ids: args.ids.join(",") },
      }),
  }),
  defineTool({
    name: "engain_create_upvote_order",
    description: "Create an upvote order on a Reddit post or comment. SPENDS CREDITS (~0.1 per vote).",
    inputSchema: voteOrderInput,
    spendsCredits: true,
    handler: (args, client) => client.request("POST", "/orders/upvote", { body: voteOrderBody(args, client) }),
  }),
  defineTool({
    name: "engain_create_downvote_order",
    description: "Create a downvote order on a Reddit post or comment. SPENDS CREDITS.",
    inputSchema: voteOrderInput,
    spendsCredits: true,
    handler: (args, client) => client.request("POST", "/orders/downvote", { body: voteOrderBody(args, client) }),
  }),
];
