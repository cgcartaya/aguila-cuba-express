"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  Clock3,
  History,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Truck,
  UserRoundX,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { openWhatsAppMessage, type WhatsAppApp } from "@/lib/utils/whatsapp";

type Zone = {
  id: string;
  name: string;
  color: string | null;
  is_active: boolean;
};

type Row = {
  id: string;
  request_code: string;
  customer_name: string;
  phone: string;
  city: string;
  address_line_1: string;
  postal_code: string;
  package_count: number;
  estimated_weight: number | null;
  status: string;
  created_at: string;
  internal_notes?: string | null;
  assigned_zone_id: string | null;
  suggested_zone_id: string | null;
  preferred_dates: string[];
  zone: Zone | null;
};

type ViewMode = "pending" | "scheduled" | "cancelled" | "completed" | "all";

const PENDING_STATUSES = new Set(["new", "contacted", "pending_confirmation", "confirmed", "failed"]);
const SCHEDULED_STATUSES = new Set(["assigned", "en_route"]);
const COMPLETED_STATUSES = new Set(["picked_up"]);
const CANCEL_REASONS = [
  "El cliente canceló",
  "No se pudo contactar",
  "Solicitud duplicada",
  "Dirección incorrecta",
  "Fuera de cobertura",
  "Otro",
];

function age(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `1${digits}` : digits;
}

function belongsToView(row: Row, view: ViewMode) {
  if (view === "pending") return PENDING_STATUSES.has(row.status);
  if (view === "scheduled") return SCHEDULED_STATUSES.has(row.status);
  if (view === "cancelled") return row.status === "cancelled";
  if (view === "completed") return COMPLETED_STATUSES.has(row.status);
  return true;
}

export default function PickupsAdminPage() {
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;

  const [rows, setRows] = useState<Row[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [view, setView] = useState<ViewMode>("pending");
  const [selected, setSelected] = useState<string[]>([]);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelDetails, setCancelDetails] = useState("");

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data.session?.access_token || ""}` };
  }

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/pickups/planning?store_id=${encodeURIComponent(store.id)}`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || "No se pudo cargar la planificación.");
    else {
      setRows(payload.requests || []);
      setZones(payload.zones || []);
      setSelected([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [store?.id]);

  const pendingRows = useMemo(() => rows.filter((row) => PENDING_STATUSES.has(row.status)), [rows]);

  const demand = useMemo(() => {
    const map = new Map<
      string,
      { zone: Zone | null; count: number; packages: number; weight: number; oldest: number; cities: Map<string, number> }
    >();

    for (const row of pendingRows) {
      const key = row.zone?.id || "unassigned";
      if (!map.has(key)) {
        map.set(key, { zone: row.zone, count: 0, packages: 0, weight: 0, oldest: 0, cities: new Map() });
      }
      const item = map.get(key)!;
      item.count += 1;
      item.packages += row.package_count || 0;
      item.weight += Number(row.estimated_weight || 0);
      item.oldest = Math.max(item.oldest, age(row.created_at));
      item.cities.set(row.city, (item.cities.get(row.city) || 0) + 1);
    }

    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [pendingRows]);

  const counts = useMemo(
    () => ({
      pending: rows.filter((row) => PENDING_STATUSES.has(row.status)).length,
      scheduled: rows.filter((row) => SCHEDULED_STATUSES.has(row.status)).length,
      cancelled: rows.filter((row) => row.status === "cancelled").length,
      completed: rows.filter((row) => COMPLETED_STATUSES.has(row.status)).length,
      all: rows.length,
    }),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (!belongsToView(row, view)) return false;
        if (zoneFilter !== "all" && (zoneFilter === "unassigned" ? Boolean(row.zone) : row.zone?.id !== zoneFilter)) {
          return false;
        }
        return `${row.customer_name} ${row.city} ${row.request_code} ${row.phone}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [rows, view, zoneFilter, search],
  );

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  async function patchRequests(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/pickups/planning", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ store_id: store.id, ...payload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo completar la operación.");
    return result;
  }

  async function assign(zoneId: string) {
    if (!selected.length) return;
    setError("");
    try {
      await patchRequests({ request_ids: selected, assigned_zone_id: zoneId || null });
      setNotice(`${selected.length} solicitud(es) actualizada(s).`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo asignar la zona.");
    }
  }

  function openWhatsApp(row: Row, app: WhatsAppApp) {
    setError("");
    try {
      openWhatsAppMessage({
        app,
        phone: row.phone,
        message: `Hola ${row.customer_name}, le contactamos de ${store?.name || "la agencia"} sobre su solicitud de recogida ${row.request_code} en ${row.city}.`,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir WhatsApp.");
    }
  }

  async function cancelRequest() {
    if (!cancelTarget) return;
    setWorkingId(cancelTarget.id);
    setError("");
    const note = `CANCELACIÓN: ${cancelReason}${cancelDetails.trim() ? ` — ${cancelDetails.trim()}` : ""}`;
    try {
      await patchRequests({ request_ids: [cancelTarget.id], status: "cancelled", internal_notes: note });
      setRows((current) =>
        current.map((row) =>
          row.id === cancelTarget.id ? { ...row, status: "cancelled", internal_notes: note } : row,
        ),
      );
      setSelected((current) => current.filter((id) => id !== cancelTarget.id));
      setNotice(`${cancelTarget.request_code} fue cancelada y movida al historial.`);
      setCancelTarget(null);
      setCancelDetails("");
      setCancelReason(CANCEL_REASONS[0]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cancelar la solicitud.");
    } finally {
      setWorkingId(null);
    }
  }

  async function restoreRequest(row: Row) {
    setWorkingId(row.id);
    setError("");
    try {
      await patchRequests({ request_ids: [row.id], status: "new", internal_notes: `REACTIVADA: ${new Date().toLocaleString("es-US")}` });
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status: "new" } : item)));
      setNotice(`${row.request_code} volvió a Pendientes.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo reactivar la solicitud.");
    } finally {
      setWorkingId(null);
    }
  }

  if (accessLoading || storeLoading || loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="mx-auto animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] bg-[#071d43] p-7 text-white">
        <p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Planificación por demanda</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black">Demanda de recogidas</h1>
            <p className="mt-2 text-blue-100">Contacta al cliente, cancela solicitudes y prepara rutas sin acumular pendientes antiguos.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/pickups/routes" className="rounded-xl border border-white/20 px-4 py-3 font-black">
              Ver rutas
            </Link>
            <button onClick={() => void load()} className="rounded-xl bg-white px-4 py-3 font-black text-[#071d43]">
              <RefreshCw className="mr-2 inline" size={17} /> Actualizar
            </button>
          </div>
        </div>
      </header>

      <nav className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ViewButton active={view === "pending"} icon={<Clock3 size={17} />} label="Pendientes" count={counts.pending} onClick={() => { setView("pending"); setSelected([]); }} />
        <ViewButton active={view === "scheduled"} icon={<Truck size={17} />} label="Programadas" count={counts.scheduled} onClick={() => { setView("scheduled"); setSelected([]); }} />
        <ViewButton active={view === "cancelled"} icon={<Ban size={17} />} label="Canceladas" count={counts.cancelled} onClick={() => { setView("cancelled"); setSelected([]); }} />
        <ViewButton active={view === "completed"} icon={<CheckCircle2 size={17} />} label="Recogidas" count={counts.completed} onClick={() => { setView("completed"); setSelected([]); }} />
        <ViewButton active={view === "all"} icon={<History size={17} />} label="Historial" count={counts.all} onClick={() => { setView("all"); setSelected([]); }} />
      </nav>

      {view === "pending" && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {demand.map((item) => (
            <button
              key={item.zone?.id || "none"}
              onClick={() => setZoneFilter(item.zone?.id || "unassigned")}
              className="rounded-[1.6rem] border bg-white p-5 text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="h-3 w-3 rounded-full" style={{ background: item.zone?.color || "#94a3b8" }} />
                <span className="text-xs font-black text-slate-400">{item.oldest} días máx.</span>
              </div>
              <h2 className="mt-3 text-xl font-black">{item.zone?.name || "Sin zona"}</h2>
              <p className="mt-1 text-4xl font-black">{item.count}</p>
              <p className="text-sm font-bold text-slate-500">solicitudes · {item.packages} paquetes</p>
              <p className="mt-3 truncate text-xs font-bold text-slate-500">
                {[...item.cities.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([city, total]) => `${city} ${total}`)
                  .join(" · ")}
              </p>
            </button>
          ))}
        </section>
      )}

      <section className="grid gap-3 rounded-[1.5rem] border bg-white p-4 md:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-12 w-full rounded-xl border pl-11 pr-3 font-bold"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente, teléfono, ciudad o código..."
          />
        </label>
        <select className="h-12 rounded-xl border px-3 font-black" value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
          <option value="all">Todas las zonas</option>
          <option value="unassigned">Sin zona</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>{zone.name}</option>
          ))}
        </select>
      </section>

      {selected.length > 0 && view === "pending" && (
        <div className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#071d43] p-4 text-white shadow-xl">
          <b>{selected.length} seleccionadas</b>
          <div className="flex flex-wrap gap-2">
            <select onChange={(event) => void assign(event.target.value)} defaultValue="select" className="rounded-xl bg-white px-3 py-2 font-black text-slate-900">
              <option value="select" disabled>Asignar zona...</option>
              <option value="">Sin zona</option>
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </select>
            <Link href={`/admin/pickups/routes/new?requests=${selected.join(",")}`} className="rounded-xl bg-white px-4 py-2 font-black text-[#071d43]">
              Preparar ruta
            </Link>
            <button onClick={() => setSelected([])} className="rounded-xl border border-white/20 px-4 py-2 font-black">Cancelar selección</button>
          </div>
        </div>
      )}

      {notice && <div className="rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div>}
      {error && <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}

      {filtered.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed bg-white p-12 text-center text-slate-500">
          <UserRoundX className="mx-auto mb-3" />
          <p className="font-black">No hay solicitudes en esta vista.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((row) => {
            const canSelect = PENDING_STATUSES.has(row.status);
            const phone = normalizePhone(row.phone);
            return (
              <article key={row.id} className={`rounded-[1.5rem] border bg-white p-5 shadow-sm ${selected.includes(row.id) ? "ring-2 ring-blue-400" : ""}`}>
                <div className="flex gap-3">
                  {canSelect && (
                    <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} className="mt-1 h-5 w-5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{row.request_code}</span>
                      <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: `${row.zone?.color || "#94a3b8"}22`, color: row.zone?.color || "#475569" }}>
                        {row.zone?.name || "Sin zona"}
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                        <Clock3 size={12} className="mr-1 inline" />{age(row.created_at)} días
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-black">{row.customer_name}</h2>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      <MapPin size={15} className="mr-1 inline text-red-500" />{row.address_line_1}, {row.city} {row.postal_code}
                    </p>
                    <a href={`tel:+${phone}`} className="mt-2 inline-flex items-center gap-2 text-sm font-black text-[#071d43] hover:underline">
                      <Phone size={15} />{row.phone || "Sin teléfono"}
                    </a>
                    <p className="mt-3 text-sm font-bold text-slate-500">
                      {row.package_count} paquete(s){row.estimated_weight ? ` · ${row.estimated_weight} lb` : ""}
                    </p>
                    {row.status === "cancelled" && row.internal_notes && (
                      <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{row.internal_notes}</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                  <a href={`tel:+${phone}`} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black text-slate-700">
                    <Phone size={16} /> Llamar
                  </a>
                  <button type="button" onClick={() => openWhatsApp(row, "personal")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white">
                    <MessageCircle size={16} /> WhatsApp
                  </button>
                  <button type="button" onClick={() => openWhatsApp(row, "business")} className="inline-flex items-center gap-2 rounded-xl bg-[#0b6b54] px-3 py-2 text-sm font-black text-white">
                    <MessageCircle size={16} /> Business
                  </button>
                  {canSelect && (
                    <button type="button" onClick={() => setCancelTarget(row)} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-black text-red-600">
                      <Ban size={16} /> Cancelar solicitud
                    </button>
                  )}
                  {row.status === "cancelled" && (
                    <button type="button" disabled={workingId === row.id} onClick={() => void restoreRequest(row)} className="ml-auto rounded-xl border border-blue-200 px-3 py-2 text-sm font-black text-blue-700 disabled:opacity-50">
                      {workingId === row.id ? "Restaurando..." : "Reactivar"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">Cancelar {cancelTarget.request_code}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">La solicitud saldrá de Pendientes, pero permanecerá en el historial.</p>
            <label className="mt-5 block text-sm font-black text-slate-700">
              Motivo
              <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-2 w-full rounded-xl border p-3 font-bold">
                {CANCEL_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-black text-slate-700">
              Detalles opcionales
              <textarea value={cancelDetails} onChange={(event) => setCancelDetails(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border p-3 font-semibold" placeholder="Ej. El cliente llamó para cancelar..." />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setCancelTarget(null)} className="rounded-xl border px-4 py-3 font-black">Volver</button>
              <button type="button" disabled={workingId === cancelTarget.id} onClick={() => void cancelRequest()} className="rounded-xl bg-red-600 px-4 py-3 font-black text-white disabled:opacity-50">
                {workingId === cancelTarget.id ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${active ? "border-[#071d43] bg-[#071d43] text-white" : "bg-white text-slate-700 hover:border-slate-400"}`}>
      <span className="flex items-center gap-2 font-black">{icon}{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? "bg-white/15" : "bg-slate-100"}`}>{count}</span>
    </button>
  );
}
