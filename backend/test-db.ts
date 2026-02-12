
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://inhzwjvhnispiqbjhkpg.supabase.co"; // Retrieved from .env view earlier
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluaHp3anZobmlzcGlxYmpoa3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDk3MTQsImV4cCI6MjA4MzE4NTcxNH0.SaauRA9Tgtubys4vgmVIkiSiepj9pSPP_LNASEphSCc";

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log('Testing connection...');

    // 1. Try to fetch
    const { data: fetchDat, error: fetchErr } = await supabase
        .from('templates')
        .select('*')
        .limit(1);

    if (fetchErr) {
        console.error('Fetch error:', fetchErr);
        return;
    }
    console.log('Fetch success. Count:', fetchDat.length);

    // 2. Try to insert a dummy template with the NEW structure
    const dummyTemplate = {
        id: 'test-insert-' + Date.now(),
        title: 'Test Template',
        description: 'Test description',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '0',
        tags: ['test'],
        template_json: {
            shortcut_name: "Test Shortcut",
            steps: [
                {
                    step_id: 1,
                    type: "INTENT_ACTION",
                    action: "OPEN_APP",
                    params: { app_category: "music" },
                    requires_app_selection: true // THIS IS THE NEW FIELD
                }
            ]
        }
    };

    console.log('Inserting dummy template with new field...');
    const { data: insertData, error: insertErr } = await supabase
        .from('templates')
        .insert([dummyTemplate])
        .select();

    if (insertErr) {
        console.error('Insert error:', insertErr);
    } else {
        console.log('Insert success!', insertData);
        // Clean up
        await supabase.from('templates').delete().eq('id', dummyTemplate.id);
    }
}

testInsert();
