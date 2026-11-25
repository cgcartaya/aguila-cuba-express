"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { canAccessAdminPath } from "@/lib/admin/navigation-access";
import { supabase } from "@/lib/supabase";

type Option = { id: string; name: string; active: boolean };

export default function FolioCatalogPage() {
  const { catalog } = useParams<{ catalog: string }>();
  const { access, store, isSuperAdmin, loading } = useAdminAccess();
  const { store: selected, loading: storeLoading } = useStore();
  const agency = isSuperAdmin ? selected || store : store;
  const kind = catalog === "proveedores" ? "provider" : catalog === "formas-de-pago" ? "method" : null;

  if (loading || storeLoading) return <p role="status">Cargando agencia…</p>;
  if (!kind || agency?.slug !== "luxury-travel-point" || !agency.module_shipping_enabled
    || !canAccessAdminPath("/admin/folios", access?.storeMembership ?? null, isSuperAdmin)) {
    return <p className="p-6">Catálogo no disponible.</p>;
  }
  return <Catalog key={agency.id + kind} storeId={agency.id} kind={kind} />;
}

function Catalog({ storeId, kind }: { storeId: string; kind: "provider" | "method" }) {
  const [options, setOptions] = useState<Option[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const label = kind === "provider" ? "Proveedor" : "Forma de pago";

  useEffect(() => {
    let current = true;
    void (async () => {
      const result = await supabase.from("luxury_folio_options").select("id,name,active")
        .eq("store_id", storeId).eq("kind", kind).order("name").returns<Option[]>();
      if (!current) return;
      setOptions(result.data ?? []);
      setError(result.error?.message ?? "");
      setBusy(false);
    })();
    return () => { current = false; };
  }, [storeId, kind]);

  async function save(option?: Option) {
    if (busy) return;
    const value = name.trim();
    if (!option && !value) return;
    setBusy(true);
    setError("");
    try {
      const table = supabase.from("luxury_folio_options");
      const query = option
        ? table.update({ active: !option.active }).eq("store_id", storeId).eq("kind", kind).eq("id", option.id)
        : table.insert({ store_id: storeId, kind, name: value });
      const { data, error: cause } = await query.select("id,name,active").single<Option>();
      if (cause || !data) throw new Error(cause?.code === "23505" ? "Ese nombre ya existe. Si está inactivo, puedes reactivarlo." : cause?.message || "No se pudo guardar.");
      setOptions(current => [...current.filter(item => item.id !== data.id), data].sort((a, b) => a.name.localeCompare(b.name, "es")));
      if (!option) setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto max-w-4xl space-y-5 p-5">
    <h1 className="text-3xl font-black text-slate-950">{kind === "provider" ? "Proveedores" : "Formas de pago"}</h1>
    <form className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label className="flex-1 text-sm font-bold">{label}
        <input required maxLength={100} className="mt-1 block w-full rounded-xl border p-2.5" value={name} onChange={event => setName(event.target.value)} />
      </label>
      <button disabled={busy || !name.trim()} className="rounded-xl bg-slate-950 px-4 py-2.5 font-bold text-white disabled:opacity-50">Agregar</button>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <ul aria-busy={busy} className="divide-y rounded-2xl border bg-white px-4">
      {options.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <span><strong>{item.name}</strong> · {item.active ? "Activo" : "Inactivo"}</span>
        <button type="button" disabled={busy} onClick={() => void save(item)} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-50">
          {item.active ? "Desactivar" : "Reactivar"}
        </button>
      </li>)}
      {!busy && !error && !options.length && <li className="py-4">Todavía no hay opciones registradas.</li>}
    </ul>
  </main>;
}
