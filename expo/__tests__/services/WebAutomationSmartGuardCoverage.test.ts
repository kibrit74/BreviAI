import fs from 'fs';
import path from 'path';

function read(relPath: string) {
    return fs.readFileSync(path.resolve(__dirname, '..', '..', relPath), 'utf-8');
}

describe('WebAutomation smart mode guard + finish coverage', () => {
    test('smart mode guardrails exist (step cap + duration cap)', () => {
        const source = read('src/components/WebAutomationView.tsx');
        expect(source.includes('maxSmartSteps')).toBe(true);
        expect(source.includes('maxSmartDurationMs')).toBe(true);
        expect(source.includes('Smart mode adim limiti asildi')).toBe(true);
        expect(source.includes('Smart mode zaman asimi')).toBe(true);
    });

    test('smart mode finish path reports steps and elapsed time', () => {
        const source = read('src/components/WebAutomationView.tsx');
        expect(source.includes("action.type === 'finish'")).toBe(true);
        expect(source.includes('steps: smartStepRef.current')).toBe(true);
        expect(source.includes('elapsedMs')).toBe(true);
    });
});

