import { z } from "zod";
import { defineTool, type EngainTool } from "./types.js";

const projectIdField = z
  .string()
  .optional()
  .describe("Engain project (campaign) ID. Defaults to ENGAIN_PROJECT_ID if set.");

const keywordField = z.string().min(1).max(200).describe("The keyword to find Reddit threads for.");

const searchModeField = z
  .enum(["web_ranking", "ai_overview"])
  .optional()
  .describe(
    "web_ranking (default): threads Google ranks for the keyword, plus Reddit's own search. ai_overview: threads cited in Google's AI Overview (currently switched off; runs web_ranking)."
  );

const exactSpellingField = z
  .boolean()
  .optional()
  .describe("Search the keyword exactly as typed, without Google's spelling correction. Web ranking only.");

export const smartSearchTools: EngainTool[] = [
  defineTool({
    name: "engain_smart_search",
    description:
      "Run a Smart Search: find Reddit threads for a keyword in the project's location and language — Google Ranked threads (with Google position) and threads found through Reddit's own search. SPENDS ONE KEYWORD OF SMART SEARCH QUOTA (not credits) on every call, including repeat searches answered from cache, so confirm with the user before calling. To look at a keyword this project already searched, use engain_get_smart_search_results instead (free). Returns quotaRemaining. Traffic estimates of Google Ranked results may arrive shortly after; re-read for free to pick them up. 5 req/min.",
    inputSchema: z.object({
      projectId: projectIdField,
      keyword: keywordField,
      searchMode: searchModeField,
      exactSpelling: exactSpellingField,
    }),
    spendsCredits: true,
    handler: (args, client) =>
      client.request("POST", "/smart-search", {
        body: {
          projectId: client.resolveProjectId(args.projectId),
          keyword: args.keyword,
          searchMode: args.searchMode,
          exactSpelling: args.exactSpelling,
        },
      }),
  }),
  defineTool({
    name: "engain_get_smart_search_results",
    description:
      "Free re-read of Smart Search results for a keyword this project already searched (by anyone in the project) in the same search mode and spelling. Spends no quota. Returns 404 for a keyword the project never searched. Includes fetchedAt and isStale.",
    inputSchema: z.object({
      projectId: projectIdField,
      keyword: keywordField,
      searchMode: searchModeField,
      exactSpelling: exactSpellingField,
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/smart-search/results", {
        query: {
          projectId: client.resolveProjectId(args.projectId),
          keyword: args.keyword,
          searchMode: args.searchMode,
          exactSpelling: args.exactSpelling,
        },
      }),
  }),
  defineTool({
    name: "engain_list_smart_search_history",
    description:
      "List your own recent Smart Searches in a project, newest first, with result counts and traffic. Free.",
    inputSchema: z.object({
      projectId: projectIdField,
      limit: z.number().int().min(1).max(100).optional().describe("Maximum entries to return (default 10, max 100)."),
    }),
    spendsCredits: false,
    handler: (args, client) =>
      client.request("GET", "/smart-search/history", {
        query: { projectId: client.resolveProjectId(args.projectId), limit: args.limit },
      }),
  }),
];
