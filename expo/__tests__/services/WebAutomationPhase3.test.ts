import { VariableManager } from '../../src/services/VariableManager';

jest.mock('expo-linking', () => ({
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-web-browser', () => ({
    openBrowserAsync: jest.fn().mockResolvedValue(undefined),
}));

const requestWebAutomationMock = jest.fn();
jest.mock('../../src/services/InteractionService', () => ({
    interactionService: {
        requestWebAutomation: (...args: any[]) => requestWebAutomationMock(...args),
    },
}));

const executeBrowserScrapeMock = jest.fn();
jest.mock('../../src/services/nodes/backend', () => ({
    executeBrowserScrape: (...args: any[]) => executeBrowserScrapeMock(...args),
}));

import { executeWebAutomation } from '../../src/services/nodes/web';

describe('WebAutomation Phase3 unit+integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('unit: parses JSON-string actions and returns standardized fallback contract', async () => {
        const vm = new VariableManager();
        executeBrowserScrapeMock.mockResolvedValue({
            success: true,
            data: '1299 TL',
            empty: false,
        });

        const result = await executeWebAutomation(
            {
                url: 'https://example.com/pricing',
                mode: 'script',
                headless: true,
                variableName: 'automationResult',
                actions: JSON.stringify([
                    { id: 'w1', type: 'wait', value: '500' },
                    { id: 's1', type: 'scroll', value: '2' },
                    { id: 's2', type: 'scrape', selector: '.price', extract: 'text', variableName: 'price' },
                ]) as any,
            } as any,
            vm
        );

        expect(result.success).toBe(true);
        expect(result.nodeType).toBe('WEB_AUTOMATION');
        expect(result.mode).toBe('script');
        expect(result.runId).toContain('webrun_');
        expect(result.data?.price).toBe('1299 TL');
        expect(Array.isArray(result.steps)).toBe(true);
        expect(result.steps.some((step: any) => step.type === 'wait')).toBe(true);
        expect(result.steps.some((step: any) => step.type === 'scroll')).toBe(true);
        expect(result.steps.some((step: any) => step.type === 'scrape')).toBe(true);
        expect(result.meta?.executor).toBe('fallback_browser_scrape');

        expect(executeBrowserScrapeMock).toHaveBeenCalledTimes(1);
        expect(executeBrowserScrapeMock.mock.calls[0][0]).toMatchObject({
            selector: '.price',
            extract: 'text',
            preWaitMs: 500,
            scrollSteps: 2,
        });

        const stored = vm.get('automationResult');
        expect(stored).toBeTruthy();
        expect(stored.nodeType).toBe('WEB_AUTOMATION');
        expect(stored.data.price).toBe('1299 TL');
    });

    test('integration: smart mode interaction result is normalized to contract', async () => {
        const vm = new VariableManager();
        requestWebAutomationMock.mockResolvedValue({
            success: true,
            finalUrl: 'https://example.com/checkout',
            steps: [{ id: 'smart_1', type: 'finish', status: 'ok', durationMs: 15 }],
            results: { status: 'done' },
        });

        const result = await executeWebAutomation(
            {
                url: 'https://example.com',
                mode: 'smart',
                smartGoal: 'checkout tamamla',
                headless: false,
                variableName: 'smartResult',
                actions: [],
            },
            vm
        );

        expect(result.success).toBe(true);
        expect(result.nodeType).toBe('WEB_AUTOMATION');
        expect(result.mode).toBe('smart');
        expect(result.finalUrl).toBe('https://example.com/checkout');
        expect(result.meta?.executor).toBe('interaction_modal');
        expect(result.data?.status).toBe('done');
        expect(Array.isArray(result.steps)).toBe(true);
        expect(result.steps[0]?.type).toBe('finish');
    });
});

