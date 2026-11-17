"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { CatalogEntry } from "@/lib/procedures/catalog";
export function usePublicProcedures() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [service, setService] = useState("");
  const [variant, setVariant] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/procedures", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Catálogo no disponible");
        setCatalog(await response.json());
      })
      .catch(() => { if (!controller.signal.aborted) setCatalogUnavailable(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const entry = catalog.find(item => item.service === service);
  const option = entry?.configuration.variants.find(item => item.id === variant);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entry || !option || busy) return;
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/public/procedures", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service, variant, version: entry.version,
          name: fields.get("name"), email: fields.get("email"),
          phone: fields.get("phone"),
          whatsapp: fields.has("whatsapp"),
          checklist: Object.fromEntries(option.requirements.map(item => [item.id, fields.get(`requirement-${item.id}`)])),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data.reference);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return { catalog, loading, catalogUnavailable, service, setService, variant, setVariant, result, setResult, error, setError, busy, entry, option, submit };
}
