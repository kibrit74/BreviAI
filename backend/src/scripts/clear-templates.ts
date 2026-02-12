
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Env Vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function clear() {
    console.log('🗑️ Clearing templates table...');
    const { error, count } = await supabase
        .from('templates')
        .delete()
        .neq('id', 'nomatch'); // Delete all

    if (error) {
        console.error('❌ Delete failed:', error.message);
    } else {
        console.log(`✅ Delete command executed.`);
    }
}

clear();
