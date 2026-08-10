"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

import type { AdminAccess, AdminArea } from "@/lib/admin/access";
import { getCurrentAdminAccess } from "@/lib/admin/access-service";

type GuardState = "checking" | "allowed" | "forbidden";

type AdminAccessGuardProps = {
  children: ReactNode;
  area: AdminArea;
};

function getErrorMessage(error: string | null) {
  if (error === "NO_PROFILE") {
    return "Tu usuario existe en Auth, pero todavía no tiene perfil administrativo en la tabla profiles.";
  }

  if (error === "PROFILE_INACTIVE") {
    return "Tu usuario está desactivado.";
  }

  if (error === "NO_STORE_ACCESS") {
    return "Tu usuario no está relacionado con ninguna tienda activa.";
  }

  if (error === "STORE_INACTIVE") {
    return "La tienda asignada a este usuario está desactivada.";
  }

  return "No tienes permisos para entrar a esta zona.";
}

export default function AdminAccessGuard({ children, area }: AdminAccessGuardProps) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("checking");
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const result = await getCurrentAdminAccess();

      if (result.error === "NO_SESSION") {
        router.replace("/login");
        return;
      }

      if (!result.data) {
        setError(result.error);
        setState("forbidden");
        return;
      }

      if (area === "saas" && !result.data.isSuperAdmin) {
        setAccess(result.data);
        setError("SAAS_ONLY");
        setState("forbidden");
        return;
      }

      if (area === "store" && !result.data.isSuperAdmin && !result.data.store) {
        setAccess(result.data);
        setError("NO_STORE_ACCESS");
        setState("forbidden");
        return;
      }

      setAccess(result.data);
      setState("allowed");
    };

    checkAccess();
  }, [area, router]);

  if (state === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-3xl border bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
          <Loader2 className="animate-spin text-[#061b3a]" size={22} />
          Verificando permisos desde Supabase...
        </div>
      </main>
    );
  }

  if (state === "forbidden") {
    const title = error === "SAAS_ONLY" ? "Esta zona es solo para Super Admin" : "Acceso administrativo restringido";

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="w-full max-w-lg rounded-[2rem] border bg-white p-7 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
            <AlertTriangle size={32} />
          </div>

          <p className="mb-2 text-sm font-black uppercase tracking-wide text-red-600">
            Acceso restringido
          </p>

          <h1 className="text-2xl font-black text-[#061b3a]">{title}</h1>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            {getErrorMessage(error)}
          </p>

          {access?.store && (
            <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
              Tienda asignada: {access.store.name}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white"
            >
              Ir al admin de tienda
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-black text-[#061b3a]"
            >
              Cambiar usuario
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
      </div>
      {children}
    </>
  );
}
