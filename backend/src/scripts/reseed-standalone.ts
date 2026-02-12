
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SEED_TEMPLATES } from '../data/seed_templates';

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' }); // Fallback

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function reseed() {
    console.log('🚀 Starting reseed process...');

    // 1. Delete all
    console.log('🗑️ Deleting existing templates...');
    const { error: deleteError } = await supabase
        .from('templates')
        .delete()
        .neq('id', '');

    if (deleteError) {
        console.error('❌ Delete failed:', deleteError.message);
        process.exit(1);
    }

    // 2. Upsert (Insert or Update)
    console.log(`📦 Upserting ${SEED_TEMPLATES.length} templates...`);
    const templatesForInsert = SEED_TEMPLATES.map(t => ({
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

    const { data, error: insertError } = await supabase
        .from('templates')
        .upsert(templatesForInsert, { onConflict: 'id' })
        .select();

    if (insertError) {
        console.error('❌ Upsert failed:', insertError.message);
        process.exit(1);
    }

    console.log(`✅ Success! Upserted ${data?.length} templates.`);
}

reseed();
