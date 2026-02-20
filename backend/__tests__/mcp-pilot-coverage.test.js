const fs = require('fs');
const path = require('path');

function read(relPath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf-8');
}

describe('MCP pilot coverage', () => {
  test('registry contains read-only pilot tools', () => {
    const source = read('src/lib/mcp/registry.ts');
    expect(source.includes('breviai.web_search')).toBe(true);
    expect(source.includes('breviai.list_templates')).toBe(true);
    expect(source.includes('readOnly: true')).toBe(true);
    expect(source.includes('MCP_WEB_SEARCH_TIMEOUT_MS')).toBe(true);
    expect(source.includes('withTimeout(')).toBe(true);
  });

  test('MCP API route supports list and call actions', () => {
    const source = read('src/app/api/mcp/route.ts');
    expect(source.includes("action: z.literal('list_tools')")).toBe(true);
    expect(source.includes("action: z.literal('call_tool')")).toBe(true);
    expect(source.includes('verifyAppSecretAuth')).toBe(true);
  });
});
