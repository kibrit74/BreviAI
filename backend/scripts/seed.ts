
import { createClient } from '@supabase/supabase-js';
import { SEED_TEMPLATES } from '../src/data/seed_templates';

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) dotenv.config(); // Fallback to .env

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Starting local seed...');
    console.log(`Found ${SEED_TEMPLATES.length} templates to insert.`);

    // 1. Delete all existing templates
    console.log('Deleting existing templates...');
    const { error: deleteError } = await supabase
        .from('templates')
        .delete()
        .neq('id', '');

    if (deleteError) {
        console.error('Error deleting templates:', deleteError);
        return;
    }
    console.log('Templates deleted.');

    // 2. Insert new templates in batches to be safe
    const batchSize = 10;
    for (let i = 0; i < SEED_TEMPLATES.length; i += batchSize) {
        const batch = SEED_TEMPLATES.slice(i, i + batchSize).map(t => ({
            id: t.id,
            title: t.title,
            title_en: t.title_en || null,
            description: t.description,
            description_en: t.description_en || null,
            category: t.category,
            author: t.author,
            downloads: t.downloads || '0',
            tags: t.tags || [],
            template_json: t.template_json || {},
        }));

        console.log(`Inserting batch ${i} to ${i + batchSize}...`);
        const { error: insertError } = await supabase
            .from('templates')
            .upsert(batch, { onConflict: 'id' });

        if (insertError) {
            console.error('Error inserting batch:', insertError);
            // Don't stop, try next batch? No, stop on error
            return;
        }
    }

    console.log('Seed completed successfully! ✅');
}

seed();
