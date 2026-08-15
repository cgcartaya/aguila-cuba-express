"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Armchair, Loader2, ShieldCheck } from "lucide-react";

import type { AdminAccess } from "@/lib/admin/access";
import { getCurrentAdminAccess } from "@/lib/admin/access-service";

type State = "checking" | "allowed" | "forbidden";

export default function ReservasAccessGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let mounted = true;

    async function verify() {
      const result = await getCurrentAdminAccess();

      if (!mounted) return;

      if (result.error === "NO_SESSION") {
        const next = encodeURIComponent("/admin/reservas");
        router.replace(`/login?next=${next}`);
        return;
      }

      if (!result.data) {
        setReason(result.error || "NO_ACCESS");
        setState("forbidden");
        return;
      }

      if (result.data.isSuperAdmin) {
        setAccess(result.data);
        setState("allowed");
        return;
      }

      const store = result.data.store;

      if (!store?.module_reservas_enabled) {
        setAccess(result.data);
        setReason("MODULE_DISABLED");
        setState("forbidden");
        return;
      }

      setAccess(result.data);
      setState("allowed");
    }

    void verify();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (state === "checking") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-3xl border bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
          <Loader2 className="animate-spin text-blue-700" size={22} />
          Verificando acceso al módulo de reservas...
        </div>
      </main>
    );
  }

  if (state === "forbidden") {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-xl rounded-[2rem] border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600">
            <AlertTriangle size={32} />
          </div>

          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
            Acceso restringido
          </p>

          <h1 className="mt-2 text-2xl font-black text-[#061b3a]">
            El módulo de reservas no está activado
          </h1>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            El Super Admin debe activar &quot;Reservas de mesas&quot; para esta
            tienda desde Admin → Tiendas → Editar.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white"
            >
              Volver al panel
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="sr-only">
        <ShieldCheck />
        <Armchair />
      </div>
      {children}
    </>
  );
}
