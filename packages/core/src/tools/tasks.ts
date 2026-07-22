import { z } from "zod";
import { defineTool, type EngainTool } from "./types.js";

const projectIdField = z
  .string()
  .optional()
  .describe("Engain project (campaign) ID. Defaults to ENGAIN_PROJECT_ID if set.");

const rankSchema = z
  .object({
    upvotesGoal: z.union([z.number().int().min(1).max(2000), z.literal("automatic")]),
    upvotesPerDay: z.number().int().min(1).max(10),
    startingDate: z.enum(["immediately", "after_3_days", "after_5_days", "after_7_days"]).optional(),
  })
  .describe("Optional upvote boosting plan for the task.");

const postRankSchema = z.object({
  upvotesGoal: z.number().int().min(1).max(2000),
  upvotesPerDay: z.number().int().min(1).max(10),
  startingDate: z.enum(["immediately", "after_3_days", "after_5_days", "after_7_days"]).optional(),
});

export const taskTools: EngainTool[] = [
  defineTool({
    name: "engain_list_tasks",
    description: "List a project's tasks (comments/posts/replies), newest first, paginated via cursor.",
    inputSchema: z.object({
      projectId: projectIdField,
      numItems: z.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
      status: z.string().optional().describe("Filter by task status, e.g. scheduled, published, removed."),
      createdAfter: z.string().optional(),
      createdBefore: z.string().optional(),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/tasks", {
        query: {
          projectId: client.resolveProjectId(args.projectId),
          numItems: args.numItems,
          cursor: args.cursor,
          status: args.status,
          createdAfter: args.createdAfter,
          createdBefore: args.createdBefore,
        },
      }),
  }),
  defineTool({
    name: "engain_get_task",
    description: "Get a single task by ID. Set refreshMetrics to pull live upvote/reply counts.",
    inputSchema: z.object({
      taskId: z.string(),
      refreshMetrics: z.boolean().optional(),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", `/tasks/${encodeURIComponent(args.taskId)}`, {
        query: { refreshMetrics: args.refreshMetrics },
      }),
  }),
  defineTool({
    name: "engain_get_tasks_bulk",
    description: "Fetch up to 100 tasks by ID in one call.",
    inputSchema: z.object({
      projectId: projectIdField,
      ids: z.array(z.string()).min(1).max(100),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/tasks/bulk", {
        query: { projectId: client.resolveProjectId(args.projectId), ids: args.ids.join(",") },
      }),
  }),
  defineTool({
    name: "engain_get_rank_metrics",
    description:
      "Get recommended upvote metrics for a Reddit post or comment URL. Rate-limited to 5 requests/minute. Does not spend credits.",
    inputSchema: z.object({
      type: z.enum(["post", "comment"]),
      url: z.string().url(),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("POST", "/rank-metrics", { body: { type: args.type, url: args.url } }),
  }),
  defineTool({
    name: "engain_create_comment_task",
    description: "Create a Reddit comment task on a thread URL. SPENDS CREDITS (typically 5).",
    inputSchema: z.object({
      projectId: projectIdField,
      url: z.string().url().describe("Reddit thread/post URL to comment on."),
      content: z.string(),
      scheduledAt: z.string().optional().describe("ISO 8601 datetime to schedule the comment."),
      rank: rankSchema.optional(),
      labels: z.array(z.string()).optional(),
    }),
    spendsCredits: true,
    handler: (args, client) =>
      client.request("POST", "/tasks/comment", {
        body: {
          projectId: client.resolveProjectId(args.projectId),
          url: args.url,
          content: args.content,
          scheduledAt: args.scheduledAt,
          rank: args.rank,
          labels: args.labels,
        },
      }),
  }),
  defineTool({
    name: "engain_create_post_task",
    description: "Create a Reddit post task in a subreddit. SPENDS CREDITS (typically 10).",
    inputSchema: z.object({
      projectId: projectIdField,
      subredditUrl: z.string().url(),
      postTitle: z.string(),
      content: z.string(),
      scheduledAt: z.string().optional(),
      rank: postRankSchema.optional(),
      labels: z.array(z.string()).optional(),
    }),
    spendsCredits: true,
    handler: (args, client) =>
      client.request("POST", "/tasks/post", {
        body: {
          projectId: client.resolveProjectId(args.projectId),
          subredditUrl: args.subredditUrl,
          postTitle: args.postTitle,
          content: args.content,
          scheduledAt: args.scheduledAt,
          rank: args.rank,
          labels: args.labels,
        },
      }),
  }),
  defineTool({
    name: "engain_create_reply_task",
    description: "Create a Reddit reply task to a specific comment URL. SPENDS CREDITS (typically 5).",
    inputSchema: z.object({
      projectId: projectIdField,
      url: z.string().url().describe("Reddit comment URL to reply to."),
      content: z.string(),
      scheduledAt: z.string().optional(),
      rank: rankSchema.optional(),
      labels: z.array(z.string()).optional(),
    }),
    spendsCredits: true,
    handler: (args, client) =>
      client.request("POST", "/tasks/reply", {
        body: {
          projectId: client.resolveProjectId(args.projectId),
          url: args.url,
          content: args.content,
          scheduledAt: args.scheduledAt,
          rank: args.rank,
          labels: args.labels,
        },
      }),
  }),
  defineTool({
    name: "engain_create_thread_task_group",
    description:
      "Create a threaded group of tasks (a parent task plus child replies). SPENDS CREDITS per task in the group.",
    inputSchema: z.object({
      projectId: projectIdField,
      parentTask: z.object({
        type: z.enum(["comment", "reply", "post"]),
        content: z.string(),
        url: z.string().url().optional().describe("Required for parent type comment/reply."),
        subredditUrl: z.string().url().optional().describe("Required for parent type post."),
        postTitle: z.string().optional().describe("Required for parent type post."),
        scheduledAt: z.union([z.string(), z.number()]).optional().describe("ISO 8601 datetime or Unix ms."),
        rank: postRankSchema.optional(),
      }).describe("Parent/root thread task."),
      childTasks: z.array(z.object({
        id: z.string().max(64).regex(/^[A-Za-z0-9_-]+$/).describe("Client node id; unique within childTasks; cannot be 'root'."),
        parentId: z.string().max(64).regex(/^[A-Za-z0-9_-]+$/).nullable().describe("Parent node id; null = direct child of root parent."),
        type: z.enum(["comment", "reply"]),
        posterAccount: z.number().int().min(1).max(10),
        content: z.string(),
        rank: postRankSchema.optional(),
        threadOrder: z.number().int().min(0).describe("Zero-based, unique within childTasks."),
        scheduleDelay: z.object({ amount: z.number().min(1), unit: z.enum(["minutes", "hours"]) }),
      })).optional(),
      labels: z.array(z.string()).optional(),
    }),
    spendsCredits: true,
    handler: (args, client) =>
      client.request("POST", "/tasks/thread", {
        body: {
          projectId: client.resolveProjectId(args.projectId),
          parentTask: args.parentTask,
          childTasks: args.childTasks,
          labels: args.labels,
        },
      }),
  }),
];
