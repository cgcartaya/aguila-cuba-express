"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ClientShowcaseToggle({ storeId, active }: { storeId: string; active: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data } = await supabase.auth.getSession();
        const res = await fetch(`/api/saas/client-showcase?store_id=${storeId}`, { headers: { Authorization: `Bearer ${data.session?.access_token || ""}` }, cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        if (mounted) setEnabled(body.enabled);
      } catch { if (mounted) setError("No se pudo cargar la visibilidad. Recarga la página."); }
      finally { if (mounted) setLoading(false); }
    }
    void load(); return () => { mounted = false; };
  }, [storeId]);
  async function toggle() {
    setSaving(true); setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/saas/client-showcase", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` }, body: JSON.stringify({ store_id: storeId, enabled: !enabled }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error);
      setEnabled(body.enabled);
    } catch { setError("No se guardó el cambio. Inténtalo de nuevo."); }
    finally { setSaving(false); }
  }
  return <div className="max-w-60"><button type="button" role="switch" aria-checked={enabled} disabled={loading || saving || (Boolean(error) && error.includes("Recarga"))} onClick={toggle}
    title="Mostrar este cliente en la web de Perla. Solo aparece si su tienda también está activa."
    className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold disabled:opacity-50 ${enabled ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}>
    {loading || saving ? <Loader2 size={14} className="animate-spin" /> : enabled ? <Eye size={14} /> : <EyeOff size={14} />}
    Mostrar en Perla: {enabled ? "Sí" : "No"}</button>
    {enabled && !active && <p className="mt-1 text-xs text-amber-700">Oculta mientras la tienda esté inactiva.</p>}
    {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}</div>;
}
