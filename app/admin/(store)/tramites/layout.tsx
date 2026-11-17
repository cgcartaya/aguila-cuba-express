import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveStoreByHost } from "@/lib/saas/store-metadata";
import { publicStore } from "@/lib/procedures/server";
import { supabaseAdmin as db } from "@/lib/supabase-admin";

export default async function ProceduresLayout({ children }: { children: ReactNode }) {
  const host = (await headers()).get("host") || "invalid.local";
  const tenant = await resolveStoreByHost(host) || await publicStore(new Request(`https://${host}`));
  // Tenant-hosted URLs cannot render a disabled module. On the neutral platform
  // host, the existing session shell selects the store; each API request then
  // verifies that selection, membership, role and module on the server.
  if (tenant) {
    const { data } = await db.from("stores").select("id").eq("id", tenant.id)
      .eq("is_active", true).eq("module_procedures_enabled", true).maybeSingle();
    if (!data) notFound();
  }
  return children;
}
