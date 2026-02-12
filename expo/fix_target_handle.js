const fs = require('fs');
const path = 'src/data/seed_templates.ts';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Rename "targetHandle: " -> "targetPort: "
    content = content.replace(/targetHandle:\s*/g, 'targetPort: ');

    fs.writeFileSync(path, content, 'utf8');
    console.log('Fix complete.');

} catch (err) {
    console.error('Fix failed:', err);
    process.exit(1);
}
