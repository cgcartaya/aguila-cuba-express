"use client";
import { createClient } from "@supabase/supabase-js";
// Same identity provider, independent browser session from the administration panel.
export const gestorAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storageKey: "perla-shareapp-auth-v1", detectSessionInUrl: false } },
);
