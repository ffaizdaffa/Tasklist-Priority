import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Optional Supabase persistence. When env is unset, the app runs purely on
// bundled seed data + in-memory sync state.

export function supabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

let _admin: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (_admin) return _admin;
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  return _admin;
}

export function supabaseBrowser(): SupabaseClient | null {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
