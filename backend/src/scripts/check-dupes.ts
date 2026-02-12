
import { SEED_TEMPLATES } from '../data/seed_templates';

const ids = SEED_TEMPLATES.map(t => t.id);
const uniqueIds = new Set(ids);

if (ids.length !== uniqueIds.size) {
    console.error('❌ Duplicate IDs found in SEED_TEMPLATES!');

    // Find duplicates
    const counts: Record<string, number> = {};
    ids.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
    });

    Object.entries(counts).forEach(([id, count]) => {
        if (count > 1) {
            console.error(`- Duplicate ID: ${id} (Count: ${count})`);
        }
    });
} else {
    console.log('✅ No duplicate IDs found in SEED_TEMPLATES array.');
}
