import { createClient } from "@supabase/supabase-js";

// Public catalog reads must never wait for an administrator's token refresh.
// This client uses only the public key and existing anon RLS policies.
export const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storageKey: "perla-public-catalog",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
