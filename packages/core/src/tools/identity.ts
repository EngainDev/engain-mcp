import { z } from "zod";
import { defineTool, type EngainTool } from "./types.js";

const projectIdField = z
  .string()
  .optional()
  .describe("Engain project (campaign) ID. Defaults to ENGAIN_PROJECT_ID if set.");

export const identityTools: EngainTool[] = [
  defineTool({
    name: "engain_get_me",
    description:
      "Get the current Engain user and the list of projects (campaigns) they can access. Use this first to discover projectId values for other tools.",
    inputSchema: z.object({}),
    spendsCredits: false,
    handler: (_args, client) => client.request("GET", "/me"),
  }),
  defineTool({
    name: "engain_get_balance",
    description: "Get remaining credits and free comments for the authenticated Engain workspace.",
    inputSchema: z.object({}),
    spendsCredits: false,
    handler: (_args, client) => client.request("GET", "/balance"),
  }),
  defineTool({
    name: "engain_list_credit_transactions",
    description: "List credit transaction history for a project (newest first), paginated via cursor.",
    inputSchema: z.object({
      projectId: projectIdField,
      numItems: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
      type: z.enum(["subscription_created","subscription_cycle","task_scheduled","task_refunded","manual_adjustment","purchase","upvote_order","upvote_refund","edit_request","delete_request","edit_refund","delete_refund","referral_reward","referral_join_reward"]).optional(),
      createdAfter: z.string().optional().describe("ISO 8601 datetime lower bound"),
      createdBefore: z.string().optional().describe("ISO 8601 datetime upper bound"),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/credit-transactions", {
        query: {
          projectId: client.resolveProjectId(args.projectId),
          numItems: args.numItems,
          cursor: args.cursor,
          type: args.type,
          createdAfter: args.createdAfter,
          createdBefore: args.createdBefore,
        },
      }),
  }),
];
