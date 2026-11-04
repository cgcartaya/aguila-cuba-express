"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Info,
  Layers,
  Package,
  Route,
  Ban,
  CheckCircle2,
  Clock3,
  History,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Truck,
  UserRoundX,
} from "lucide-react";
import s from "./pickups.module.css";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { openWhatsAppMessage, type WhatsAppApp } from "@/lib/utils/whatsapp";
import ManualPickupStopModal from "@/components/pickups/ManualPickupStopModal";
import type { PickupRequest } from "@/lib/pickups/types";

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
  address_verified?: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

type ViewMode = "pending" | "scheduled" | "cancelled" | "completed" | "all";

const PENDING_STATUSES = new Set([
  "new",
  "contacted",
  "pending_confirmation",
  "confirmed",
  "failed",
]);
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
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
  );
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
  const {
    store: accessStore,
    isSuperAdmin,
    loading: accessLoading,
  } = useAdminAccess();
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
  const [manualOpen, setManualOpen] = useState(false);
  const zoneAssignmentRef = useRef<HTMLSelectElement>(null);

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data.session?.access_token || ""}` };
  }

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    setError("");
    const response = await fetch(
      `/api/admin/pickups/planning?store_id=${encodeURIComponent(store.id)}`,
      {
        headers: await authHeaders(),
        cache: "no-store",
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      setError(payload.error || "No se pudo cargar la planificación.");
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

  const pendingRows = useMemo(
    () => rows.filter((row) => PENDING_STATUSES.has(row.status)),
    [rows],
  );

  const demand = useMemo(() => {
    const map = new Map<
      string,
      {
        zone: Zone | null;
        count: number;
        packages: number;
        weight: number;
        oldest: number;
        cities: Map<string, number>;
      }
    >();

    for (const row of pendingRows) {
      const key = row.zone?.id || "unassigned";
      if (!map.has(key)) {
        map.set(key, {
          zone: row.zone,
          count: 0,
          packages: 0,
          weight: 0,
          oldest: 0,
          cities: new Map(),
        });
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
      scheduled: rows.filter((row) => SCHEDULED_STATUSES.has(row.status))
        .length,
      cancelled: rows.filter((row) => row.status === "cancelled").length,
      completed: rows.filter((row) => COMPLETED_STATUSES.has(row.status))
        .length,
      all: rows.length,
    }),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (!belongsToView(row, view)) return false;
        if (
          zoneFilter !== "all" &&
          (zoneFilter === "unassigned"
            ? Boolean(row.zone)
            : row.zone?.id !== zoneFilter)
        ) {
          return false;
        }
        return `${row.customer_name} ${row.city} ${row.request_code} ${row.phone}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [rows, view, zoneFilter, search],
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function patchRequests(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/pickups/planning", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ store_id: store.id, ...payload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "No se pudo completar la operación.");
    return result;
  }

  async function assign(zoneId: string) {
    if (!selected.length) return;
    setError("");
    try {
      await patchRequests({
        request_ids: selected,
        assigned_zone_id: zoneId || null,
      });
      setNotice(`${selected.length} solicitud(es) actualizada(s).`);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo asignar la zona.",
      );
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
      setError(
        cause instanceof Error ? cause.message : "No se pudo abrir WhatsApp.",
      );
    }
  }

  async function cancelRequest() {
    if (!cancelTarget) return;
    setWorkingId(cancelTarget.id);
    setError("");
    const note = `CANCELACIÓN: ${cancelReason}${cancelDetails.trim() ? ` — ${cancelDetails.trim()}` : ""}`;
    try {
      await patchRequests({
        request_ids: [cancelTarget.id],
        status: "cancelled",
        internal_notes: note,
      });
      setRows((current) =>
        current.map((row) =>
          row.id === cancelTarget.id
            ? { ...row, status: "cancelled", internal_notes: note }
            : row,
        ),
      );
      setSelected((current) => current.filter((id) => id !== cancelTarget.id));
      setNotice(
        `${cancelTarget.request_code} fue cancelada y movida al historial.`,
      );
      setCancelTarget(null);
      setCancelDetails("");
      setCancelReason(CANCEL_REASONS[0]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cancelar la solicitud.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function restoreRequest(row: Row) {
    setWorkingId(row.id);
    setError("");
    try {
      await patchRequests({
        request_ids: [row.id],
        status: "new",
        internal_notes: `REACTIVADA: ${new Date().toLocaleString("es-US")}`,
      });
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, status: "new" } : item,
        ),
      );
      setNotice(`${row.request_code} volvió a Pendientes.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo reactivar la solicitud.",
      );
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

  const selectedRows = pendingRows.filter((row) => selected.includes(row.id));
  const packagesPending = pendingRows.reduce(
    (total, row) => total + (row.package_count || 0),
    0,
  );
  const unassigned = pendingRows.filter((row) => !row.zone).length;
  const visibleSelectable = filtered.filter((row) =>
    PENDING_STATUSES.has(row.status),
  );
  const allVisibleSelected =
    visibleSelectable.length > 0 &&
    visibleSelectable.every((row) => selected.includes(row.id));
  const viewLabels: Record<ViewMode, string> = {
    pending: "Solicitudes pendientes",
    scheduled: "Solicitudes programadas",
    cancelled: "Solicitudes canceladas",
    completed: "Recogidas completadas",
    all: "Historial de solicitudes",
  };

  function selectUnassigned() {
    setView("pending");
    setZoneFilter("unassigned");
    setSearch("");
    setSelected(pendingRows.filter((row) => !row.zone).map((row) => row.id));
    requestAnimationFrame(() => zoneAssignmentRef.current?.focus());
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <p className={s.breadcrumb}>
            Operaciones <span>/</span> Recogidas
          </p>
          <h1>Demanda de recogidas</h1>
          <p className={s.subtitle}>
            Organiza solicitudes y prepara tu próxima ruta.
          </p>
        </div>
        <div className={s.headerActions}>
          <Link href="/admin/pickups/routes" className={s.secondary}>
            <Route size={18} />
            Ver rutas
          </Link>
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className={s.primary}
          >
            <Plus size={19} />
            Nueva solicitud
          </button>
          <button
            type="button"
            aria-label="Actualizar solicitudes"
            onClick={() => void load()}
            className={s.iconButton}
          >
            <RefreshCw size={19} />
          </button>
        </div>
      </header>
      <nav className={s.tabs} aria-label="Estado de solicitudes">
        <ViewButton
          active={view === "pending"}
          icon={<Clock3 size={18} />}
          label="Pendientes"
          count={counts.pending}
          onClick={() => {
            setView("pending");
            setSelected([]);
          }}
        />
        <ViewButton
          active={view === "scheduled"}
          icon={<Truck size={18} />}
          label="Programadas"
          count={counts.scheduled}
          onClick={() => {
            setView("scheduled");
            setSelected([]);
          }}
        />
        <ViewButton
          active={view === "cancelled"}
          icon={<Ban size={18} />}
          label="Canceladas"
          count={counts.cancelled}
          onClick={() => {
            setView("cancelled");
            setSelected([]);
          }}
        />
        <ViewButton
          active={view === "completed"}
          icon={<CheckCircle2 size={18} />}
          label="Recogidas"
          count={counts.completed}
          onClick={() => {
            setView("completed");
            setSelected([]);
          }}
        />
        <ViewButton
          active={view === "all"}
          icon={<History size={18} />}
          label="Historial"
          count={counts.all}
          onClick={() => {
            setView("all");
            setSelected([]);
          }}
        />
      </nav>
      {notice && (
        <div role="status" className={s.success}>
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className={s.error}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}
      <div className={s.workspace}>
        <section className={s.requests} aria-labelledby="pickup-list-heading">
          <div className={s.filters}>
            <label className={s.search}>
              <Search size={18} />
              <input
                aria-label="Buscar solicitudes"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente, teléfono, ciudad o código"
              />
            </label>
            <select
              aria-label="Filtrar por zona"
              value={zoneFilter}
              onChange={(event) => setZoneFilter(event.target.value)}
            >
              <option value="all">Todas las zonas</option>
              <option value="unassigned">Sin zona</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
          <div className={s.listHeading}>
            <h2 id="pickup-list-heading">{viewLabels[view]}</h2>
            <p>
              {filtered.length}{" "}
              {filtered.length === 1 ? "solicitud" : "solicitudes"} ·{" "}
              {filtered.reduce((sum, row) => sum + (row.package_count || 0), 0)}{" "}
              paquetes
            </p>
          </div>
          {visibleSelectable.length > 1 && (
            <label className={s.selectAll}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() =>
                  setSelected((current) =>
                    allVisibleSelected
                      ? current.filter(
                          (id) =>
                            !visibleSelectable.some((row) => row.id === id),
                        )
                      : [
                          ...new Set([
                            ...current,
                            ...visibleSelectable.map((row) => row.id),
                          ]),
                        ],
                  )
                }
              />
              Seleccionar solicitudes visibles
            </label>
          )}
          {filtered.length === 0 ? (
            <div className={s.empty}>
              <UserRoundX size={34} />
              <h3>No hay solicitudes en esta vista</h3>
              <p>
                {search || zoneFilter !== "all"
                  ? "Prueba otros filtros o limpia la búsqueda."
                  : "Las solicitudes de esta tienda aparecerán aquí."}
              </p>
              {(search || zoneFilter !== "all") && (
                <button
                  type="button"
                  className={s.secondary}
                  onClick={() => {
                    setSearch("");
                    setZoneFilter("all");
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className={s.requestList}>
              {filtered.map((row) => {
                const canSelect = PENDING_STATUSES.has(row.status);
                const phone = normalizePhone(row.phone);
                const initials =
                  row.customer_name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase() || "?";
                return (
                  <article
                    key={row.id}
                    className={`${s.requestCard} ${selected.includes(row.id) ? s.selectedCard : ""}`}
                  >
                    <div className={s.requestTop}>
                      {canSelect && (
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${row.request_code}`}
                          checked={selected.includes(row.id)}
                          onChange={() => toggle(row.id)}
                          className={s.rowCheckbox}
                        />
                      )}
                      <span className={s.avatar} aria-hidden="true">
                        {initials}
                      </span>
                      <div className={s.customer}>
                        <div className={s.customerHeading}>
                          <h3>{row.customer_name}</h3>
                          <span className={s.code}>{row.request_code}</span>
                          <span className={row.zone ? s.zone : s.noZone}>
                            <MapPin size={12} />
                            {row.zone?.name || "Sin zona"}
                          </span>
                          <span className={s.age}>
                            {age(row.created_at) === 0
                              ? "Hoy"
                              : `Hace ${age(row.created_at)} días`}
                          </span>
                          {!canSelect && (
                            <span className={s.status}>
                              {row.status === "cancelled"
                                ? "Cancelada"
                                : COMPLETED_STATUSES.has(row.status)
                                  ? "Recogida"
                                  : "Programada"}
                            </span>
                          )}
                        </div>
                        <div className={s.details}>
                          <p>
                            <MapPin size={15} />
                            {row.address_line_1}, {row.city} {row.postal_code}
                          </p>
                          <a href={`tel:+${phone}`}>
                            <Phone size={14} />
                            {row.phone || "Sin teléfono"}
                          </a>
                        </div>
                        <div className={s.details}>
                          <p>
                            <Package size={15} />
                            {row.package_count} paquete(s)
                            {row.estimated_weight
                              ? ` · ${row.estimated_weight} lb`
                              : ""}
                          </p>
                          <p>
                            <CalendarDays size={15} />
                            {row.preferred_dates?.length
                              ? `Preferencias: ${row.preferred_dates.map((date) => new Date(`${date}T12:00:00`).toLocaleDateString("es-US", { day: "numeric", month: "short" })).join(", ")}`
                              : "Fecha por confirmar"}
                          </p>
                        </div>
                        {(!row.address_verified ||
                          row.latitude == null ||
                          row.longitude == null) && (
                          <p className={s.locationWarning}>
                            <AlertTriangle size={13} />
                            Sin ubicación confirmada
                          </p>
                        )}
                        {row.status === "cancelled" && row.internal_notes && (
                          <p className={s.cancelNote}>{row.internal_notes}</p>
                        )}
                      </div>
                    </div>
                    <div className={s.cardActions}>
                      <a href={`tel:+${phone}`} className={s.smallButton}>
                        <Phone size={15} />
                        Llamar
                      </a>
                      <button
                        type="button"
                        onClick={() => openWhatsApp(row, "personal")}
                        className={s.whatsapp}
                      >
                        <MessageCircle size={15} />
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => openWhatsApp(row, "business")}
                        className={s.business}
                      >
                        <MessageCircle size={15} />
                        Business
                      </button>
                      {canSelect && (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(row)}
                          className={s.cancel}
                        >
                          <Ban size={15} />
                          Cancelar solicitud
                        </button>
                      )}
                      {row.status === "cancelled" && (
                        <button
                          type="button"
                          disabled={workingId === row.id}
                          onClick={() => void restoreRequest(row)}
                          className={s.restore}
                        >
                          {workingId === row.id
                            ? "Restaurando..."
                            : "Reactivar"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {view === "pending" && unassigned > 0 && (
            <div className={s.zoneHint}>
              <Info size={20} />
              <span>Asigna una zona para facilitar la planificación.</span>
              <button type="button" onClick={selectUnassigned}>
                Asignar zona
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
        <aside className={s.sidebar} aria-label="Planificación de recogidas">
          <section className={s.panel}>
            <h2>
              <Layers size={21} />
              Resumen de demanda
            </h2>
            <div className={s.metrics}>
              <div>
                <strong>{counts.pending}</strong>
                <span>pendientes</span>
              </div>
              <div>
                <strong>{packagesPending}</strong>
                <span>paquetes</span>
              </div>
              <div className={unassigned ? s.warningMetric : ""}>
                <strong>{unassigned}</strong>
                <span>sin zona</span>
              </div>
            </div>
            <div className={s.zoneSummary}>
              {demand.length === 0 ? (
                <p className={s.muted}>Sin demanda pendiente.</p>
              ) : (
                demand.map((item) => (
                  <button
                    type="button"
                    key={item.zone?.id || "unassigned"}
                    onClick={() => {
                      setView("pending");
                      setSelected([]);
                      setZoneFilter(item.zone?.id || "unassigned");
                    }}
                    aria-pressed={
                      zoneFilter === (item.zone?.id || "unassigned")
                    }
                    className={s.zoneRow}
                  >
                    <span
                      className={s.zoneDot}
                      style={{ background: item.zone?.color || "#c08717" }}
                    />
                    <span>
                      <strong>{item.zone?.name || "Sin zona"}</strong>
                      <small>
                        {[...item.cities.keys()].slice(0, 3).join(" · ")}
                        {item.cities.size > 3
                          ? ` +${item.cities.size - 3}`
                          : ""}
                      </small>
                      <small>
                        {item.packages} paquetes
                        {item.weight ? ` · ${item.weight} lb` : ""} ·{" "}
                        {item.oldest === 0 ? "Hoy" : `${item.oldest} días máx.`}
                      </small>
                    </span>
                    <b>{item.count}</b>
                  </button>
                ))
              )}
            </div>
            {unassigned > 0 && (
              <p className={s.warning}>
                <AlertTriangle size={17} />
                Hay solicitudes sin zona asignada.
              </p>
            )}
          </section>
          <section className={s.panel}>
            <h2>
              <Route size={21} />
              Prepara una ruta
            </h2>
            <p className={s.muted}>
              Selecciona solicitudes para organizar una recogida.
            </p>
            <div className={s.selectionCount}>
              <CheckCircle2 size={18} />
              {selectedRows.length} solicitudes seleccionadas
            </div>
            {view === "pending" && selectedRows.length > 0 ? (
              <>
                <label className={s.assignLabel}>
                  Asignar zona
                  <select
                    ref={zoneAssignmentRef}
                    aria-label="Asignar zona a las solicitudes seleccionadas"
                    value="select"
                    onChange={(event) => void assign(event.target.value)}
                  >
                    <option value="select" disabled>
                      Selecciona una zona
                    </option>
                    <option value="">Sin zona</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!zones.length && (
                  <Link href="/admin/pickups/zones" className={s.manageZones}>
                    Configurar zonas →
                  </Link>
                )}
                <Link
                  href={`/admin/pickups/routes/new?requests=${selectedRows.map((row) => row.id).join(",")}`}
                  className={s.routeButton}
                >
                  <Route size={18} />
                  Preparar ruta
                </Link>
                <button
                  type="button"
                  className={s.clearSelection}
                  onClick={() => setSelected([])}
                >
                  Limpiar selección
                </button>
              </>
            ) : (
              <button type="button" disabled className={s.routeButton}>
                <Route size={18} />
                Preparar ruta
              </button>
            )}
          </section>
        </aside>
      </div>

      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">
              Cancelar {cancelTarget.request_code}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              La solicitud saldrá de Pendientes, pero permanecerá en el
              historial.
            </p>
            <label className="mt-5 block text-sm font-black text-slate-700">
              Motivo
              <select
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="mt-2 w-full rounded-xl border p-3 font-bold"
              >
                {CANCEL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-black text-slate-700">
              Detalles opcionales
              <textarea
                value={cancelDetails}
                onChange={(event) => setCancelDetails(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border p-3 font-semibold"
                placeholder="Ej. El cliente llamó para cancelar..."
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border px-4 py-3 font-black"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={workingId === cancelTarget.id}
                onClick={() => void cancelRequest()}
                className="rounded-xl bg-red-600 px-4 py-3 font-black text-white disabled:opacity-50"
              >
                {workingId === cancelTarget.id
                  ? "Cancelando..."
                  : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ManualPickupStopModal
        open={manualOpen}
        storeId={store?.id || ""}
        routeId={null}
        routeDate={new Date().toISOString().slice(0, 10)}
        requestMode
        onClose={() => setManualOpen(false)}
        onCreated={async (_request: PickupRequest) => {
          setNotice("Solicitud manual creada y guardada en Pendientes.");
          await load();
        }}
      />
    </div>
  );
}

function ViewButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${s.tab} ${active ? s.activeTab : ""}`}
    >
      <span>
        {icon}
        {label}
      </span>
      <b>{count}</b>
    </button>
  );
}
