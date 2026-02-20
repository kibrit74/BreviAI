
import { createClient } from '@supabase/supabase-js';

const RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const RAW_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(RAW_SUPABASE_URL && RAW_SUPABASE_ANON_KEY);
export const supabaseConfigError = isSupabaseConfigured
    ? null
    : 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';

const SUPABASE_URL = RAW_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = RAW_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
