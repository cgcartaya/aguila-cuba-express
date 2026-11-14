import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isWfCargoHost } from "@/lib/saas/wfcargo-hosts";
import { normalizeStoreHost } from "@/lib/saas/store-metadata";

export default async function WfLegalLayout({ children }: { children: ReactNode }) {
  const host = normalizeStoreHost((await headers()).get("host") ?? "");
  if (!host || !isWfCargoHost(host)) notFound();
  return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
    <article lang="es" className="mx-auto grid max-w-3xl gap-5 rounded-2xl bg-white p-6 sm:p-10">
      <Link className="text-blue-800 underline" href="/">Volver a WF Cargo Envíos</Link>
      {children}
    </article>
  </main>;
}
