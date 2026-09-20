// Supabase client for the Projects feature (and the admin workspace).
//
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are meant to be public —
// Supabase's anon key is designed to sit in client-side bundles. What
// actually protects the data is Row Level Security (see
// supabase/schema.sql), not keeping this key secret. Never put the
// "service_role" key here; that one bypasses RLS entirely and must
// only ever be used server-side.
//
// See README.md → "Projects" → "Supabase setup" for how to get these
// two values and where to set them (a local .env file for `npm run
// dev`, and your Vercel project's Environment Variables for the
// deployed site).

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase isn't configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
        "to .env (locally) and to your Vercel project's Environment Variables " +
        "(deployed) — see README.md → Projects → Supabase setup."
    );
  }
}
