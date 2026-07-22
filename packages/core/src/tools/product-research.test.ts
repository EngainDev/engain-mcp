import { describe, expect, test, vi } from 'vitest';
import { productResearchTools } from './product-research.js';

describe('engain_product_research', () => {
    const tool = productResearchTools.find((t) => t.name === 'engain_product_research')!;

    test('POSTs to /research with resolved projectId', async () => {
        const client = {
            resolveProjectId: vi.fn().mockReturnValue('proj_1'),
            request: vi.fn().mockResolvedValue({ findings: [] }),
        };
        await tool.handler({ goal: 'find hooks for headaches', links: ['https://reddit.com/r/x/comments/1/a/'] }, client as never);
        expect(client.request).toHaveBeenCalledWith('POST', '/research', {
            body: { projectId: 'proj_1', goal: 'find hooks for headaches', links: ['https://reddit.com/r/x/comments/1/a/'] },
        });
    });

    test('sends an empty links array when links is omitted', async () => {
        const client = {
            resolveProjectId: vi.fn().mockReturnValue('proj_1'),
            request: vi.fn().mockResolvedValue({ findings: [] }),
        };
        await tool.handler({ goal: 'find hooks for headaches' }, client as never);
        expect(client.request).toHaveBeenCalledWith('POST', '/research', {
            body: { projectId: 'proj_1', goal: 'find hooks for headaches', links: [] },
        });
    });

    test('is a spend tool (hidden in readonly mode)', () => {
        expect(tool.spendsCredits).toBe(true);
    });

    test('schema rejects empty goal', () => {
        expect(tool.inputSchema.safeParse({ goal: '' }).success).toBe(false);
    });
});
