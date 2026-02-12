"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const seed_templates_1 = require("./seed_templates");
// Hardcode envs to avoid dotenv issues in script
const supabaseUrl = "https://inhzwjvhnispiqbjhkpg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluaHp3anZobmlzcGlxYmpoa3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDk3MTQsImV4cCI6MjA4MzE4NTcxNH0.SaauRA9Tgtubys4vgmVIkiSiepj9pSPP_LNASEphSCc";
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function seed() {
    console.log('Starting local seed...');
    console.log(`Found ${seed_templates_1.SEED_TEMPLATES.length} templates to insert.`);
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
    for (let i = 0; i < seed_templates_1.SEED_TEMPLATES.length; i += batchSize) {
        const batch = seed_templates_1.SEED_TEMPLATES.slice(i, i + batchSize).map(t => ({
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
