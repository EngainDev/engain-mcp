import { describe, expect, test, vi } from 'vitest';
import { ruleCheckTools } from './rule-check.js';

const tool = (name: string) => ruleCheckTools.find((t) => t.name === name)!;

/** A real comment permalink — the same shape engain_create_reply_task takes. */
const COMMENT_URL = 'https://www.reddit.com/r/AskReddit/comments/abc123/some_title/def456/';

const makeClient = () => ({
    resolveProjectId: vi.fn().mockReturnValue('proj_1'),
    request: vi.fn().mockResolvedValue({}),
});

describe('engain_rule_check', () => {
    const ruleCheck = tool('engain_rule_check');

    test('POSTs the draft to /rule-check with the resolved projectId', async () => {
        const client = makeClient();
        await ruleCheck.handler(
            { subreddit: 'AskReddit', taskType: 'comment', content: 'my draft', mediaKind: 'text' },
            client as never
        );
        expect(client.request).toHaveBeenCalledWith('POST', '/rule-check', {
            body: {
                projectId: 'proj_1',
                subreddit: 'AskReddit',
                taskType: 'comment',
                title: undefined,
                content: 'my draft',
                mediaKind: 'text',
                context: undefined,
            },
        });
    });

    test('forwards the parent comment URL for a reply', async () => {
        const client = makeClient();
        await ruleCheck.handler(
            { subreddit: 'AskReddit', taskType: 'reply', content: 'my reply', context: { parentCommentUrl: COMMENT_URL } },
            client as never
        );
        const [, , opts] = client.request.mock.calls[0] ?? [];
        expect(opts.body.context).toEqual({ parentCommentUrl: COMMENT_URL });
    });

    test('accepts all three task types, including reply', () => {
        for (const taskType of ['post', 'comment', 'reply'] as const) {
            expect(ruleCheck.inputSchema.safeParse({ subreddit: 'test', taskType, content: 'x' }).success).toBe(true);
        }
    });

    test('rejects an unknown task type', () => {
        expect(ruleCheck.inputSchema.safeParse({ subreddit: 'test', taskType: 'upvote', content: 'x' }).success).toBe(false);
    });

    test('requires a subreddit and content', () => {
        expect(ruleCheck.inputSchema.safeParse({ taskType: 'post', content: 'x' }).success).toBe(false);
        expect(ruleCheck.inputSchema.safeParse({ subreddit: 'test', taskType: 'post' }).success).toBe(false);
    });

    test('rejects a parentCommentUrl that is not a URL', () => {
        const parsed = ruleCheck.inputSchema.safeParse({
            subreddit: 'test',
            taskType: 'reply',
            content: 'x',
            context: { parentCommentUrl: 'def456' },
        });
        expect(parsed.success).toBe(false);
    });

    test('refuses a reply with no parent context without spending a request', async () => {
        const client = makeClient();
        await expect(ruleCheck.handler({ subreddit: 'AskReddit', taskType: 'reply', content: 'my reply' }, client as never)).rejects.toThrow(
            /parentCommentUrl/
        );
        // The API rejects this too, but failing here does not burn one of 5 requests per minute.
        expect(client.request).not.toHaveBeenCalled();
    });

    test('accepts a reply whose parent is supplied as text', async () => {
        const client = makeClient();
        await ruleCheck.handler(
            { subreddit: 'AskReddit', taskType: 'reply', content: 'my reply', context: { parentComment: 'the thread so far' } },
            client as never
        );
        expect(client.request).toHaveBeenCalled();
    });

    test('is not a spend tool, so it survives readonly mode', () => {
        // Preflight publishes nothing — a cautious configuration must not be forced to advise blind.
        expect(ruleCheck.spendsCredits).toBe(false);
    });

    test('the description tells an agent it publishes nothing and to batch rather than loop', () => {
        expect(ruleCheck.description).toContain('PUBLISHES NOTHING');
        expect(ruleCheck.description).toContain('engain_rule_check_batch');
    });

    test('the description says an absent advice list is not a "ship it"', () => {
        expect(ruleCheck.description).toContain('an EMPTY list means it already reads naturally');
        expect(ruleCheck.description).toContain("never a 'ship it'");
    });

    test('the description distinguishes removal risk from the subreddit removal rate', () => {
        expect(ruleCheck.description).toContain('judgement about THIS draft');
        expect(ruleCheck.description).toContain('NOT a judgement about this draft');
    });
});

describe('engain_rule_check_batch', () => {
    const batch = tool('engain_rule_check_batch');

    test('POSTs the items to /rule-check/batch with the resolved projectId', async () => {
        const client = makeClient();
        const items = [
            { key: 'a', taskType: 'reply' as const, content: 'draft a', context: { parentCommentUrl: COMMENT_URL } },
            { key: 'b', taskType: 'reply' as const, content: 'draft b', context: { parentCommentUrl: COMMENT_URL } },
        ];
        await batch.handler({ subreddit: 'AskReddit', items }, client as never);
        expect(client.request).toHaveBeenCalledWith('POST', '/rule-check/batch', {
            body: { projectId: 'proj_1', subreddit: 'AskReddit', items },
        });
    });

    test('accepts 25 items and rejects 26', () => {
        const item = { key: 'k', taskType: 'comment', content: 'x' };
        const makeItems = (n: number) => Array.from({ length: n }, (_, i) => ({ ...item, key: `k${i}` }));
        expect(batch.inputSchema.safeParse({ subreddit: 'test', items: makeItems(25) }).success).toBe(true);
        expect(batch.inputSchema.safeParse({ subreddit: 'test', items: makeItems(26) }).success).toBe(false);
    });

    test('rejects an empty batch', () => {
        expect(batch.inputSchema.safeParse({ subreddit: 'test', items: [] }).success).toBe(false);
    });

    test('requires a key on every item so verdicts can be matched back', () => {
        expect(batch.inputSchema.safeParse({ subreddit: 'test', items: [{ taskType: 'comment', content: 'x' }] }).success).toBe(false);
    });

    test('refuses a reply item with no parent context, naming its index', async () => {
        const client = makeClient();
        const items = [
            { key: 'a', taskType: 'comment' as const, content: 'draft a' },
            { key: 'b', taskType: 'reply' as const, content: 'draft b' },
        ];
        await expect(batch.handler({ subreddit: 'AskReddit', items }, client as never)).rejects.toThrow(/items\[1\]/);
        expect(client.request).not.toHaveBeenCalled();
    });

    test('is not a spend tool', () => {
        expect(batch.spendsCredits).toBe(false);
    });

    test('the description steers an agent here instead of a loop', () => {
        expect(batch.description).toContain('Prefer this over looping');
        expect(batch.description).toContain('PUBLISHES NOTHING');
    });
});

describe('engain_get_subreddit_stats', () => {
    const stats = tool('engain_get_subreddit_stats');

    test('GETs /subreddit-stats with the subreddit as a query parameter', async () => {
        const client = makeClient();
        await stats.handler({ subreddit: 'AskReddit' }, client as never);
        expect(client.request).toHaveBeenCalledWith('GET', '/subreddit-stats', { query: { subreddit: 'AskReddit' } });
    });

    test('never resolves or sends a projectId', async () => {
        const client = makeClient();
        await stats.handler({ subreddit: 'AskReddit' }, client as never);
        // Global Reddit data, not project data — a general question about Reddit needs no tenant context.
        expect(client.resolveProjectId).not.toHaveBeenCalled();
        expect(stats.inputSchema.safeParse({ subreddit: 'test', projectId: 'p1' }).success).toBe(true);
        expect(Object.keys(stats.inputSchema.parse({ subreddit: 'test', projectId: 'p1' }))).toEqual(['subreddit']);
    });

    test('requires a subreddit', () => {
        expect(stats.inputSchema.safeParse({}).success).toBe(false);
    });

    test('is not a spend tool', () => {
        expect(stats.spendsCredits).toBe(false);
    });

    test('the description says it needs no project and warns against reading absence as zero', () => {
        expect(stats.description).toContain('Takes NO projectId');
        expect(stats.description).toContain("never infer 'no removals' from its absence");
    });
});
