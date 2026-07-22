# engain-mcp

> An [MCP](https://modelcontextprotocol.io) server that wraps the **Engain v1 API**, so Claude Code and other MCP clients can drive Engain — Reddit growth campaigns, tasks, upvote/downvote orders, opportunity & mention discovery — programmatically.

![node](https://img.shields.io/badge/node-%E2%89%A518-3c873a)
![types](https://img.shields.io/badge/TypeScript-ESM-3178c6)
![license](https://img.shields.io/badge/license-MIT-blue)

It's a thin, hand-authored wrapper over Engain's documented REST API. Each endpoint becomes an MCP tool with a typed input schema and an agent-friendly description, so an LLM agent can discover projects, scan opportunities, draft and schedule tasks, place upvote orders, and read account state — all through one connected MCP server.

## Quick start (Claude Code)

Add the server to your MCP config (`~/.claude.json`, or a project `.mcp.json`):

```jsonc
{
  "mcpServers": {
    "engain": {
      "command": "npx",
      "args": ["-y", "engain-mcp"],
      "env": {
        "ENGAIN_API_KEY": "eng_your_key_here",
        "ENGAIN_PROJECT_ID": "optional-default-project-id",
        "ENGAIN_MCP_READONLY": "false"
      }
    }
  }
}
```

Generate your `ENGAIN_API_KEY` in the Engain app under **Settings → API** (MAX-plan workspace). Restart your MCP client and the `engain_*` tools become available.

## Configuration

| Env var | Required | Default | Purpose |
|---|---|---|---|
| `ENGAIN_API_KEY` | ✅ | — | Your Engain API key (`eng_…`). Sent as the `X-API-Key` header. |
| `ENGAIN_BASE_URL` | | `https://api.engain.io` | API host. Point at a non-prod deployment for testing. |
| `ENGAIN_PROJECT_ID` | | — | Default project ID for project-scoped tools when one isn't passed. |
| `ENGAIN_MCP_READONLY` | | `false` | When truthy (`1`/`true`/`yes`), all credit-spending tools are hidden. |

## Spend safety

Seven tools spend credits: `engain_create_comment_task`, `engain_create_post_task`, `engain_create_reply_task`, `engain_create_thread_task_group`, `engain_create_upvote_order`, `engain_create_downvote_order`, `engain_product_research`.

Set **`ENGAIN_MCP_READONLY=true`** and those seven are never registered — the agent sees only the 23 read-only tools. With spending enabled, each spend tool returns the credits charged and remaining balance in its result, so the agent always sees what it just spent.

## Tools (30)

Every tool is prefixed `engain_`. Project-scoped tools take an optional `projectId` that falls back to `ENGAIN_PROJECT_ID`; call `engain_get_me` to discover project IDs.

**Account**
- `engain_get_me` — current user + accessible projects
- `engain_get_balance` — remaining credits and free comments
- `engain_list_credit_transactions` — paginated credit history

**Tasks** (read)
- `engain_list_tasks`, `engain_get_task`, `engain_get_tasks_bulk`
- `engain_get_rank_metrics` — recommended upvote metrics for a URL (no credits; 5 req/min)

**Tasks** (spend 💳)
- `engain_create_comment_task`, `engain_create_post_task`, `engain_create_reply_task`, `engain_create_thread_task_group`

**Orders** (read)
- `engain_list_orders`, `engain_get_order`, `engain_get_orders_bulk`

**Orders** (spend 💳)
- `engain_create_upvote_order`, `engain_create_downvote_order`

**Discovery**
- `engain_list_opportunities`, `engain_get_opportunity`
- `engain_list_mentions`, `engain_get_mention`, `engain_get_mention_stats`, `engain_get_mention_brands`

**Labels**
- `engain_list_labels`, `engain_create_label`, `engain_delete_label`
- `engain_add_task_labels`, `engain_remove_task_labels`, `engain_add_order_labels`, `engain_remove_order_labels`

**Product Research** (spend 💳)
- `engain_product_research` — agentic Reddit research for a goal, returns pains/hooks/angles with source URLs

## How it works

- **`X-API-Key` auth** on every request; the base path is always `/api/v1`.
- **Project resolution** — project-scoped tools use the call's `projectId`, else `ENGAIN_PROJECT_ID`, else return a clear error pointing you at `engain_get_me`.
- **Resilient errors** — non-2xx responses become structured errors (`status`, `code`, `message`); `429` rate limits are retried automatically with backoff (honoring `Retry-After`, up to 3 attempts).
- **Transport** — stdio today; the tool/client layer is transport-agnostic so a remote (HTTP) transport can be added without touching tools.

## Development

```bash
npm install
npm test          # vitest unit suite
npm run typecheck # tsc --noEmit (vitest does not typecheck)
npm run build     # emits dist/ (tests excluded from the package)
```

Architecture: `src/config.ts` (env) → `src/client.ts` (`EngainClient`/`EngainError`) → `src/tools/*` (one module per domain; each tool is an `EngainTool` made with `defineTool`) → `src/tools/index.ts` (`buildToolRegistry`, applies the readonly filter) → `src/server.ts` / `src/bin.ts` (MCP stdio wiring). Tools are plain data objects, so the whole surface is unit-testable without the MCP SDK.

## License

MIT
