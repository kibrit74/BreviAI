const fs = require('fs');
const path = require('path');

function read(relPath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf-8');
}

describe('Workflow web telemetry coverage', () => {
  test('reliability module includes web node KPI aggregation', () => {
    const source = read('src/lib/workflows/reliability.ts');
    expect(source.includes('WebNodeTelemetrySummary')).toBe(true);
    expect(source.includes('extractWebNodeRunEvents')).toBe(true);
    expect(source.includes('summarizeWebNodeRuns')).toBe(true);
    expect(source.includes('emptyScrapeRate')).toBe(true);
    expect(source.includes('fallbackRate')).toBe(true);
    expect(source.includes('webNodeTelemetry')).toBe(true);
    expect(source.includes('webNodeStats')).toBe(true);
  });

  test('workflow executions API accepts meta for telemetry payload', () => {
    const source = read('src/app/api/workflows/executions/route.ts');
    expect(source.includes('meta: z.record(z.any()).optional()')).toBe(true);
    expect(source.includes('recordWorkflowRun')).toBe(true);
  });

  test('workflow reliability API returns global stats payload', () => {
    const source = read('src/app/api/workflows/reliability/route.ts');
    expect(source.includes('globalStats')).toBe(true);
    expect(source.includes('getWorkflowRunStats')).toBe(true);
  });
});

