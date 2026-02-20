const fs = require('fs');
const path = require('path');

function read(relPath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf-8');
}

describe('API security coverage', () => {
  test('critical app routes enforce app secret validation', () => {
    const appProtectedRoutes = [
      'src/app/api/generate/route.ts',
      'src/app/api/templates/route.ts',
      'src/app/api/search/route.ts',
      'src/app/api/transcribe/route.ts',
      'src/app/api/feedback/route.ts',
      'src/app/api/email/send/route.ts',
      'src/app/api/email/read/route.ts',
      'src/app/api/google/sheets/read/route.ts',
      'src/app/api/mcp/route.ts',
    ];

    for (const routePath of appProtectedRoutes) {
      const source = read(routePath);
      expect(source.includes('verifyAppSecret')).toBe(true);
    }
  });

  test('admin routes enforce admin key validation', () => {
    const adminProtectedRoutes = [
      'src/app/api/admin/templates/route.ts',
      'src/app/api/admin/templates/[id]/route.ts',
      'src/app/api/admin/reseed/route.ts',
      'src/app/api/admin/generate-template/route.ts',
      'src/app/api/executions/route.ts',
    ];

    for (const routePath of adminProtectedRoutes) {
      const source = read(routePath);
      expect(source.includes('verifyAdminKey')).toBe(true);
    }
  });
});
