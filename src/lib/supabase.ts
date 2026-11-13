import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidHttpUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured =
  isValidHttpUrl(rawUrl) &&
  Boolean(rawAnonKey) &&
  rawAnonKey !== 'YOUR_SUPABASE_PUBLISHABLE_ANON_KEY';

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawAnonKey! : 'placeholder-anon-key';

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    '[Chestlist] Running in local storage mode (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable Supabase sync).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
});
