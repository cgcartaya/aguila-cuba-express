"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, Loader2 } from "lucide-react";
import {
  getEconomyModuleStatus,
  setEconomyModuleStatus,
} from "@/lib/services/economy";

export default function EconomyModuleToggle({
  storeId,
}: {
  storeId: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    getEconomyModuleStatus(storeId).then((settings) => {
      if (!mounted) return;
      setEnabled(Boolean(settings?.module_economy_enabled));
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [storeId]);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    const { error } = await setEconomyModuleStatus(storeId, next);
    if (error) {
      console.error("Error actualizando módulo Economía:", error);
      window.alert("No se pudo cambiar el módulo Economía.");
    } else {
      setEnabled(next);
    }
    setSaving(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || saving}
      title="Activar o desactivar Economía y rentabilidad"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${
        enabled
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {loading || saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CircleDollarSign className="h-3.5 w-3.5" />
      )}
      Economía {enabled ? "ON" : "OFF"}
    </button>
  );
}
