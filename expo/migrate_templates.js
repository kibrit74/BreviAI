const fs = require('fs');
const path = 'src/data/seed_templates.ts';

try {
    let content = fs.readFileSync(path, 'utf8');
    const originalLength = content.length;

    console.log(`Read ${originalLength} bytes.`);

    // 1. Remove empty data objects (used in new mixed templates)
    // Matches "data: {}," with optional whitespace
    content = content.replace(/data:\s*{},\s*/g, '');

    // 2. Rename remaining "data:" to "config:"
    // Matches "data: {" with optional whitespace
    content = content.replace(/data:\s*{/g, 'config: {');

    // 3. Rename edge properties
    // Matches "source: " -> "sourceNodeId: "
    content = content.replace(/source:\s*/g, 'sourceNodeId: ');

    // Matches "target: " -> "targetNodeId: "
    content = content.replace(/target:\s*/g, 'targetNodeId: ');

    // Matches "sourceHandle: " -> "sourcePort: "
    content = content.replace(/sourceHandle:\s*/g, 'sourcePort: ');

    console.log(`Writing ${content.length} bytes...`);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Migration complete.');

} catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
}
