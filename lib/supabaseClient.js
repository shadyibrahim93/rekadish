// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// 1) URL - Must be available globally
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('Supabase URL missing: set NEXT_PUBLIC_SUPABASE_URL');
}

// 2) PUBLIC KEY - Safe for Browser & Server (limited permissions)
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!publicKey) {
  throw new Error(
    'Supabase Public Key missing: set NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// 3) SERVICE ROLE KEY - SERVER ONLY (Full Admin Access)
// We use a fallback to publicKey so the app doesn't crash in environments
// where the Service Key isn't set (like client-side builds),
// but it will only have Admin privileges if the env var is actually present.
const serviceKey =
  typeof window === 'undefined'
    ? process.env.SUPABASE_SERVICE_ROLE_KEY || publicKey
    : publicKey;

// --- A. STANDARD CLIENT (Public/Anon) ---
// Use this for: Client-side components, basic fetches, public data.
// It respects Row Level Security (RLS).
export const supabase = createClient(supabaseUrl, publicKey);

// --- B. ADMIN CLIENT (Server Only) ---
// Use this for: API Routes, getServerSideProps, or bypassing RLS.
// NOTE: We export a function to ensure a fresh instance or specific config if needed.
export const getServerSupabase = () =>
  createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false, // Server doesn't need to persist sessions in local storage
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
