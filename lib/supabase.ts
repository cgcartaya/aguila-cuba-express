import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Recovery tokens for ShareAPP are handled only by its independent client.
    detectSessionInUrl:
      typeof window === "undefined" ||
      (!/^\/gestores(?:\/|$)/.test(window.location.pathname) &&
        new URLSearchParams(window.location.hash.slice(1)).get("type") !==
          "recovery"),
  },
});
