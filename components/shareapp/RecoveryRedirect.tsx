"use client";
import { useEffect } from "react";
// Supabase may fall back to the project's Site URL if redirect URLs have not
// been configured yet. Forward recovery callbacks served by this same app.
export default function RecoveryRedirect() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (
      hash.get("type") === "recovery" &&
      window.location.pathname !== "/gestores/recuperar" &&
      hash.get("access_token")
    ) {
      window.location.replace(`/gestores/recuperar${window.location.hash}`);
    }
  }, []);
  return null;
}
