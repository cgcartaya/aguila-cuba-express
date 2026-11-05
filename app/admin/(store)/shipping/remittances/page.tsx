"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import RemittanceInbox, { type RemittanceOrder, type RemittanceStatus } from "@/components/admin/remittances/RemittanceInbox";
import RemittanceActionDialog, { receivedAmountMatches, type RemittanceAction } from "@/components/admin/remittances/RemittanceActionDialog";

import RemittanceWhatsappStatus from "@/components/admin/remittances/RemittanceWhatsappStatus";

type LoadedOrders = { storeId: string; status: RemittanceStatus; page: number; orders: RemittanceOrder[] };
type Success = { storeId: string; text: string; shipmentId?: string };

export default function RemittanceOrders() {
  const { store: selected, loading: storeLoading } = useStore();
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selected ?? accessStore : accessStore;
  const storeId = store?.id;
  const [loaded, setLoaded] = useState<LoadedOrders | null>(null);
  const [status, setStatus] = useState<RemittanceStatus>("pending");
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ storeId: string; message: string } | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [action, setAction] = useState<RemittanceAction | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    if (!storeId) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (controller.signal.aborted) return;
      const response = await fetch(`/api/admin/remittances?${new URLSearchParams({ storeId, status, page: String(page) })}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` }, cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las órdenes.");
      if (!controller.signal.aborted) setLoaded({ storeId, status, page, orders: data.orders || [] });
    } catch (cause) {
      if (!controller.signal.aborted) setError({ storeId, message: cause instanceof Error ? cause.message : "No se pudieron cargar las órdenes." });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [storeId, status, page]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => { clearTimeout(timer); requestRef.current?.abort(); };
  }, [load, refresh]);

  async function save(reference: string, received: string) {
    if (!action || !storeId || action.storeId !== storeId || savingRef.current) return;
    if (action.type === "confirm" && (!receivedAmountMatches(received, action.order.total) || reference.trim().length < 3 || reference.trim().length > 120)) {
      setError({ storeId, message: "Verifica el importe recibido y la referencia del pago." });
      return;
    }
    savingRef.current = true;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/remittances", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` }, body: JSON.stringify({ storeId, id: action.order.id, action: action.type, payment_reference: reference }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
      setSuccess({ storeId, text: action.type === "confirm" ? "Pago confirmado. Tu envío de dinero está listo." : "Solicitud cancelada.", shipmentId: action.type === "confirm" ? data.shipmentId : undefined });
      setAction(null);
      setLoaded(null);
      setRefresh(value => value + 1);
    } catch (cause) {
      setError({ storeId, message: cause instanceof Error ? cause.message : "No se pudo completar la operación." });
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  const current = loaded && loaded.storeId === storeId && loaded.status === status && loaded.page === page ? loaded : null;
  const currentAction = action?.storeId === storeId ? action : null;
  const currentError = error && error.storeId === storeId ? error.message : "";

  return <>
    {storeId && store?.slug === "alvarez-travel" && <RemittanceWhatsappStatus key={storeId} storeId={storeId} />}
    <RemittanceInbox storeName={store?.name || ""} orders={current?.orders || []} status={status} page={page} search={search} busy={busy} loading={accessLoading || storeLoading || Boolean(storeId) && (loading || !current && !currentError)} error={currentAction ? "" : currentError || (!storeId && !accessLoading && !storeLoading ? "Selecciona una tienda para consultar sus órdenes." : "")} success={success?.storeId === storeId ? success : null}
      onStatus={value => { setStatus(value); setPage(0); setSearch(""); setSuccess(null); }} onSearch={setSearch} onRefresh={() => { void load(); }} onPage={value => { setPage(value); setSearch(""); }}
      onConfirm={order => { if (storeId) { setAction({ order, type: "confirm", storeId }); setError(null); } }} onCancel={order => { if (storeId) { setAction({ order, type: "cancel", storeId }); setError(null); } }} />
    {currentAction && <RemittanceActionDialog key={`${currentAction.storeId}:${currentAction.order.id}:${currentAction.type}`} action={currentAction} busy={busy} error={currentError} onClose={() => { if (!busy) { setAction(null); setError(null); } }} onSubmit={(reference, received) => { void save(reference, received); }} />}
  </>;
}
