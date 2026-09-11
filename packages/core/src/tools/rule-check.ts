import { z } from "zod";
import { EngainError } from "../client.js";
import { defineTool, type EngainTool } from "./types.js";

const projectIdField = z
  .string()
  .optional()
  .describe("Engain project (campaign) ID. Defaults to ENGAIN_PROJECT_ID if set.");

const taskTypeField = z
  .enum(["post", "comment", "reply"])
  .describe("What is being drafted. 'reply' answers a specific comment and REQUIRES parent context.");

const mediaKindField = z
  .enum(["text", "link", "image"])
  .optional()
  .describe("For posts: whether the submission is text, a link, or an image. Affects which historical removal rate applies.");

const contextSchema = z
  .object({
    parentCommentUrl: z
      .string()
      .url()
      .optional()
      .describe(
        "REQUIRED for taskType 'reply' unless parentComment is supplied: the Reddit permalink of the comment being replied to — the same URL you would pass to engain_create_reply_task. Engain retrieves the post title, post body, and ancestor comment chain from it server-side, so do NOT scrape or flatten the thread yourself. Must be in the same subreddit as the `subreddit` argument."
      ),
    parentComment: z
      .string()
      .optional()
      .describe(
        "The thread being replied to as text, oldest-to-newest. Only needed if you already have it and do not want a server-side fetch; prefer parentCommentUrl."
      ),
    postUrl: z
      .string()
      .url()
      .optional()
      .describe(
        "The Reddit post/thread this submission responds to. Engain fills in the post title, body, and other top-level comments from it. Must be in the same subreddit as the `subreddit` argument."
      ),
    postTitle: z.string().optional().describe("Title of the post being responded to, if already known."),
    postBody: z.string().optional().describe("Body of the post being responded to, if already known."),
    postCreatedUtc: z.number().optional().describe("Unix seconds the target post was created, if already known. Old threads raise risk."),
    topComments: z.array(z.string()).optional().describe("Other top-level comment bodies already on the thread, if already known."),
  })
  .optional()
  .describe("What the draft responds to. Optional for posts and comments; a reply needs parentCommentUrl or parentComment.");

/**
 * Shared wording for the two preflight tools. An agent decides whether to call these at all purely
 * from the description, so the two facts most likely to stop it — "this might publish something" and
 * "this might be the expensive one" — are stated up front, and batching is steered explicitly because
 * a per-comment loop over a thread walks straight into the 5-requests-per-minute limit.
 */
const PREFLIGHT_NOTE =
  "PUBLISHES NOTHING and creates no task — it is safe to call before every draft, including in read-only mode. Rate-limited to 5 requests/minute per user.";

/** Removal Risk and Removal Rate sit side by side in the response and mean opposite things. */
const VERDICT_FIELDS_NOTE =
  "Returns: verdict (pass | warn | fail | skipped | unavailable), violatedRules (names of the subreddit rules the draft is at risk under), removalRisk (0-100 judgement about THIS draft), marketingIntentRisk (0-100, how much it reads as promotion rather than participation), authenticityRisk (0-100, how much it reads as machine-written; 0 reads human), naturalnessAdvice (concrete edits to make it read more human — an EMPTY list means it already reads naturally, so ship it, while an ABSENT list means there was no advice to give and is never a 'ship it'), estimatedPublishTime (how long until it goes live, with a reason when elevated), riskFactors, subredditStats (the subreddit's historical REMOVAL RATE for comparable submissions — a measurement of the subreddit, NOT a judgement about this draft; absent for a text-only post, and its removalRate is omitted when sampleCount is too small to report) and contextWarnings (context that could not be retrieved — qualify your recommendation when present). 'skipped' means Engain has no rules captured for this subreddit; the authenticity fields are still returned.";

type DraftContext = z.infer<typeof contextSchema>;

/**
 * Refuse a reply that names no thread before spending a request on it. The API rejects this too — a
 * reply judged without its thread is the weak verdict preflight exists to remove — but failing here
 * turns a wasted round trip against a 5-per-minute budget into an immediate, actionable message.
 * Deliberately a handler check rather than a schema `refine`: the input schema is published as JSON
 * Schema to the client, and a cross-field constraint there would not survive the conversion.
 */
const assertReplyHasParentContext = (taskType: string, context: DraftContext, label: string): void => {
  if (taskType !== "reply") return;
  if (context?.parentCommentUrl?.trim() || context?.parentComment?.trim()) return;
  throw new EngainError(
    400,
    "missing_parent_context",
    `${label}taskType "reply" needs context.parentCommentUrl (the permalink of the comment being replied to — Engain fetches the thread from it) or context.parentComment (the thread text). A reply judged without its thread would return a weak verdict that looks confident.`
  );
};

export const ruleCheckTools: EngainTool[] = [
  defineTool({
    name: "engain_rule_check",
    description: `Preflight ONE Reddit draft (post, comment, or reply) against a subreddit before creating a task. ${PREFLIGHT_NOTE} For a whole thread or several competing drafts, use engain_rule_check_batch instead of calling this in a loop — a loop exhausts the per-minute budget. ${VERDICT_FIELDS_NOTE}`,
    inputSchema: z.object({
      projectId: projectIdField,
      subreddit: z.string().describe("Target subreddit name, with or without the 'r/' prefix."),
      taskType: taskTypeField,
      title: z.string().optional().describe("Post title. Posts only."),
      content: z.string().describe("The draft text to check."),
      mediaKind: mediaKindField,
      context: contextSchema,
    }),
    // Preflight publishes nothing, so it stays available in read-only mode; cost is governed
    // server-side by the per-user rate limit and per-item budget, not by this flag.
    spendsCredits: false,
    // `async` so a refusal surfaces as a rejected promise rather than a synchronous throw, matching
    // how every other failure in this layer reaches the caller.
    handler: async (args, client) => {
      assertReplyHasParentContext(args.taskType, args.context, "");
      return client.request("POST", "/rule-check", {
        body: {
          projectId: client.resolveProjectId(args.projectId),
          subreddit: args.subreddit,
          taskType: args.taskType,
          title: args.title,
          content: args.content,
          mediaKind: args.mediaKind,
          context: args.context,
        },
      });
    },
  }),
  defineTool({
    name: "engain_rule_check_batch",
    description: `Preflight up to 25 Reddit drafts against ONE subreddit in a single call — a whole thread, or several competing versions of the same comment. Prefer this over looping engain_rule_check: it costs one request instead of one per draft, and items sharing a parentCommentUrl or postUrl reuse a single fetch of the thread context. ${PREFLIGHT_NOTE} Each item carries your own \`key\`, and every verdict is returned keyed back to it so you can match verdicts to drafts. ${VERDICT_FIELDS_NOTE}`,
    inputSchema: z.object({
      projectId: projectIdField,
      subreddit: z.string().describe("Target subreddit for every item in the batch, with or without the 'r/' prefix."),
      items: z
        .array(
          z.object({
            key: z.string().describe("Your own identifier for this draft. Returned verbatim on the matching verdict."),
            taskType: taskTypeField,
            title: z.string().optional().describe("Post title. Posts only."),
            content: z.string().describe("The draft text to check."),
            mediaKind: mediaKindField,
            context: contextSchema,
          })
        )
        .min(1)
        .max(25)
        .describe("The drafts to check, at most 25. Each item's context is independent; identical URLs across items share one fetch."),
    }),
    spendsCredits: false,
    handler: async (args, client) => {
      args.items.forEach((item, index) => assertReplyHasParentContext(item.taskType, item.context, `items[${index}]: `));
      return client.request("POST", "/rule-check/batch", {
        body: {
          projectId: client.resolveProjectId(args.projectId),
          subreddit: args.subreddit,
          items: args.items,
        },
      });
    },
  }),
  defineTool({
    name: "engain_get_subreddit_stats",
    description:
      "Look up a subreddit's historical REMOVAL RATES — the fraction of comparable submissions Engain has posted there that were removed — without needing a draft. Use it to advise on which subreddit to target, or to tell a user a subreddit is unusually strict. Takes NO projectId: this is global Reddit data, not project data. Cheap and generously rate-limited (the general 30/minute budget), so exploring several subreddits does not consume your preflight budget. PUBLISHES NOTHING. Returns one bucket per (contentType, mediaType) pair with sampleCount, windowEnd (how current the figure is) and removalRate — removalRate is OMITTED when sampleCount is too small to report honestly, so never infer 'no removals' from its absence. A removal rate describes the subreddit; for a judgement about a specific draft use engain_rule_check.",
    inputSchema: z.object({
      subreddit: z.string().describe("Subreddit name, with or without the 'r/' prefix."),
    }),
    spendsCredits: false,
    handler: (args, client) => client.request("GET", "/subreddit-stats", { query: { subreddit: args.subreddit } }),
  }),
];
