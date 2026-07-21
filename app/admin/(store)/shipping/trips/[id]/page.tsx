"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Package,
  Printer,
  Search,
  Ship,
  SlidersHorizontal,
  Trash2,
  Truck,
  UserRoundCheck,
  X,
} from "lucide-react";

import InvoiceActions from "@/components/admin/shipping/InvoiceActions";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  bulkAssignShipmentDriver,
  bulkMoveShipmentsToTrash,
  bulkMoveShipmentsToTrip,
  bulkUpdateShipmentStatus,
  getShippingDriversByStoreId,
  updateShipmentStatus,
} from "@/lib/services/shipping";
import {
  changeShippingTripStatus,
  closeShippingTrip,
  getOpenShippingTripsByStoreId,
  getShipmentsByTripId,
  getShippingTripById,
} from "@/lib/services/shipping-trips";
import {
  getShippingStatusLabel,
  getShippingTripStatusLabel,
  type Shipment,
  type ShippingDriver,
  type ShippingStatus,
  type ShippingTrip,
  type ShippingTripStatus,
} from "@/lib/shipping/types";

const shipmentStatuses: Array<{ value: ShippingStatus; label: string }> = [
  { value: "preparing", label: "Pendiente de salida" },
  { value: "in_transit", label: "En tránsito hacia Cuba" },
  { value: "received_cuba", label: "Recibido en Cuba" },
  { value: "out_for_delivery", label: "En reparto" },
  { value: "delivered", label: "Entregado" },
  { value: "issue", label: "Incidencia" },
];

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Sin definir";
}

export default function ShippingTripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdShipmentId = searchParams.get("created") || "";
  const { access, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore],
  );

  const canManage =
    access?.isSuperAdmin ||
    ["OWNER", "ADMIN", "OPERATIONS"].includes(
      access?.storeMembership?.role || "",
    );

  const [trip, setTrip] = useState<ShippingTrip | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<ShippingDriver[]>([]);
  const [openTrips, setOpenTrips] = useState<ShippingTrip[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [bulkStatus, setBulkStatus] = useState<ShippingStatus | "">("");
  const [driverChoice, setDriverChoice] = useState("");
  const [tripChoice, setTripChoice] = useState("");
  const selectAllRef = useRef<HTMLInputElement>(null);

  async function load(options?: { preserveSelection?: boolean }) {
    if (!activeStore?.id || !params.id) return;

    setLoading(true);
    setError("");

    const [tripResult, shipmentResult, driverResult, openTripsResult] =
      await Promise.all([
        getShippingTripById(activeStore.id, params.id),
        getShipmentsByTripId(activeStore.id, params.id),
        getShippingDriversByStoreId(activeStore.id),
        getOpenShippingTripsByStoreId(activeStore.id),
      ]);

    if (tripResult.error) setError(tripResult.error.message);
    if (shipmentResult.error) setError(shipmentResult.error.message);

    const nextShipments = (shipmentResult.data || []) as Shipment[];
    setTrip(tripResult.data || null);
    setShipments(nextShipments);
    setDrivers((driverResult.data || []) as ShippingDriver[]);
    setOpenTrips(
      ((openTripsResult.data || []) as ShippingTrip[]).filter(
        (item) => item.id !== params.id,
      ),
    );

    if (options?.preserveSelection) {
      const availableIds = new Set(nextShipments.map((item) => item.id));
      setSelectedIds((current) =>
        new Set([...current].filter((id) => availableIds.has(id))),
      );
    } else {
      setSelectedIds(new Set());
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [activeStore?.id, params.id]);

  useEffect(() => {
    if (!createdShipmentId || loading) return;

    const element = document.getElementById(`shipment-${createdShipmentId}`);
    if (!element) return;

    const timer = window.setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    const cleanupUrl = window.setTimeout(() => {
      router.replace(`/admin/shipping/trips/${params.id}`, { scroll: false });
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(cleanupUrl);
    };
  }, [createdShipmentId, loading, params.id, router]);

  async function setTripStatus(status: ShippingTripStatus) {
    if (!activeStore?.id || !trip) return;
    setWorking(true);
    setError("");
    const result = await changeShippingTripStatus(activeStore.id, trip.id, status);
    if (result.error) setError(result.error.message || "No se pudo cambiar el estado.");
    await load({ preserveSelection: true });
    setWorking(false);
  }

  async function closeTrip(force = false) {
    if (!activeStore?.id || !trip) return;
    setWorking(true);
    setError("");
    const result = await closeShippingTrip(activeStore.id, trip.id, force);
    if (result.error) {
      setError(result.error.message || "No se pudo cerrar el viaje.");
      setWorking(false);
      return;
    }
    await load({ preserveSelection: true });
    setWorking(false);
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        shipment.order_number,
        shipment.tracking_code,
        shipment.sender_name,
        shipment.sender_phone,
        shipment.recipient_name,
        shipment.recipient_phone,
        shipment.location,
        shipment.recipient_address,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        );
    return (
      matchesSearch &&
      (statusFilter === "all" || shipment.status === statusFilter) &&
      (paymentFilter === "all" || shipment.payment_status === paymentFilter)
    );
  });

  const visibleIds = filteredShipments.map((item) => item.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const selectedShipments = shipments.filter((item) => selectedIds.has(item.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  function toggleShipment(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function runBulkStatus() {
    if (!activeStore?.id || !bulkStatus || selectedIds.size === 0) return;
    const label = getShippingStatusLabel(bulkStatus);
    if (!window.confirm(`¿Cambiar ${selectedIds.size} envío(s) a “${label}”?`)) return;
    setWorking(true);
    const result = await bulkUpdateShipmentStatus(activeStore.id, [...selectedIds], bulkStatus);
    if (result.error) setError(result.error.message || "No se pudo cambiar el estado.");
    else setBulkStatus("");
    await load({ preserveSelection: true });
    setWorking(false);
  }

  async function runBulkTrash() {
    if (!activeStore?.id || selectedIds.size === 0) return;
    if (!window.confirm(`¿Enviar ${selectedIds.size} envío(s) a la papelera? Podrán restaurarse después.`)) return;
    setWorking(true);
    const result = await bulkMoveShipmentsToTrash(activeStore.id, [...selectedIds]);
    if (result.error) setError(result.error.message || "No se pudieron enviar a la papelera.");
    await load();
    setWorking(false);
  }

  async function runBulkDriver() {
    if (!activeStore?.id || selectedIds.size === 0) return;
    const driver = drivers.find((item) => item.id === driverChoice) || null;
    const actionLabel = driver ? `asignar a ${driver.name}` : "quitar la asignación";
    if (!window.confirm(`¿${actionLabel} en ${selectedIds.size} envío(s)?`)) return;
    setWorking(true);
    const result = await bulkAssignShipmentDriver(activeStore.id, [...selectedIds], driver);
    if (result.error) setError(result.error.message || "No se pudo actualizar el repartidor.");
    await load({ preserveSelection: true });
    setWorking(false);
  }

  async function runBulkTrip() {
    if (!activeStore?.id || !tripChoice || selectedIds.size === 0) return;
    const destinationTrip = openTrips.find((item) => item.id === tripChoice);
    if (!destinationTrip) return;
    if (!window.confirm(`¿Mover ${selectedIds.size} envío(s) al viaje “${destinationTrip.name}”?`)) return;
    setWorking(true);
    const result = await bulkMoveShipmentsToTrip(activeStore.id, [...selectedIds], tripChoice);
    if (result.error) setError(result.error.message || "No se pudieron mover los envíos.");
    await load();
    setWorking(false);
  }

  async function changeOneStatus(shipment: Shipment, status: ShippingStatus) {
    if (!activeStore?.id || shipment.status === status) return;
    if (!window.confirm(`¿Cambiar el envío #${shipment.order_number || "—"} a “${getShippingStatusLabel(status)}”?`)) return;
    setWorking(true);
    const result = await updateShipmentStatus(activeStore.id, shipment.id, status);
    if (result.error) setError(result.error.message || "No se pudo cambiar el estado.");
    await load({ preserveSelection: true });
    setWorking(false);
  }

  function printSelectedManifest() {
    if (!trip || selectedShipments.length === 0) return;
    const rows = selectedShipments
      .map(
        (shipment) => `<tr>
          <td>#${shipment.order_number || "—"}</td>
          <td>${escapeHtml(shipment.tracking_code || shipment.id.slice(0, 8))}</td>
          <td>${escapeHtml(shipment.sender_name || "Sin cliente")}<br><small>${escapeHtml(shipment.sender_phone || "")}</small></td>
          <td>${escapeHtml(shipment.recipient_name || "Sin destinatario")}<br><small>${escapeHtml(shipment.recipient_phone || "")}</small></td>
          <td>${escapeHtml(shipment.location || "Sin lugar")}<br><small>${escapeHtml(shipment.recipient_address || "")}</small></td>
          <td>${Number(shipment.weight_lb || 0).toFixed(1)} lb</td>
          <td>${escapeHtml(getShippingStatusLabel(shipment.status))}</td>
          <td>${escapeHtml(shipment.assigned_driver_name || "Sin asignar")}</td>
        </tr>`,
      )
      .join("");
    const totalWeight = selectedShipments.reduce((sum, item) => sum + Number(item.weight_lb || 0), 0);
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      setError("El navegador bloqueó la ventana de impresión.");
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Manifiesto ${escapeHtml(trip.trip_number.toString())}</title><style>
      body{font-family:Arial,sans-serif;color:#0f172a;padding:24px}h1{margin:0}.meta{margin:8px 0 20px;color:#475569}.summary{display:flex;gap:24px;margin:16px 0;font-weight:700}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left;vertical-align:top}th{background:#e2e8f0}small{color:#64748b}@media print{body{padding:0}}
    </style></head><body><h1>Manifiesto parcial · Viaje ${escapeHtml(trip.trip_number.toString())}</h1><div class="meta"><strong>${escapeHtml(trip.name)}</strong> · ${escapeHtml(trip.origin || "Origen sin definir")} → ${escapeHtml(trip.destination || "Destino sin definir")}<br>Impreso: ${escapeHtml(new Date().toLocaleString("es-US"))}</div><div class="summary"><span>Envíos: ${selectedShipments.length}</span><span>Peso: ${totalWeight.toFixed(1)} lb</span></div><table><thead><tr><th>Orden</th><th>Rastreo</th><th>Remitente</th><th>Destinatario</th><th>Destino</th><th>Peso</th><th>Estado</th><th>Repartidor</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();}</script></body></html>`);
    printWindow.document.close();
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
  }

  if (loading) {
    return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={34} /></main>;
  }

  if (!trip) {
    return <main className="p-8"><p className="font-black text-rose-700">No se encontró el viaje.</p></main>;
  }

  const tripClosed = trip.status === "completed";
  const totalWeight = shipments.reduce((sum, shipment) => sum + Number(shipment.weight_lb || 0), 0);
  const billed = shipments.reduce((sum, shipment) => sum + Number(shipment.service_price || 0), 0);
  const delivered = shipments.filter((shipment) => shipment.status === "delivered").length;
  const issues = shipments.filter((shipment) => shipment.status === "issue").length;
  const open = shipments.length - delivered - issues;
  const progress = shipments.length > 0 ? Math.round(((delivered + issues) / shipments.length) * 100) : 0;
  const filtersActive = Boolean(normalizedSearch) || statusFilter !== "all" || paymentFilter !== "all";

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-28 md:p-7">
      <div className="mx-auto max-w-[1500px]">
        <button onClick={() => router.push("/admin/shipping/trips")} className="mb-5 inline-flex items-center gap-2 font-black text-slate-600"><ArrowLeft size={18} />Volver a viajes</button>

        <header className="rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#0a2d63] to-[#1554a6] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">Viaje {trip.trip_number}</p><h1 className="mt-2 text-3xl font-black md:text-4xl">{trip.name}</h1><p className="mt-2 font-semibold text-blue-100/80">{trip.origin || "Origen sin definir"} → {trip.destination || "Destino sin definir"}</p><span className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-black">{getShippingTripStatusLabel(trip.status)}</span></div>
            {canManage && !tripClosed && <div className="flex flex-wrap gap-2">{trip.status === "preparing" && <Action icon={<Truck size={18} />} label="Salió hacia Cuba" onClick={() => setTripStatus("in_transit")} disabled={working} />}{trip.status === "in_transit" && <Action icon={<Ship size={18} />} label="Recibido en Cuba" onClick={() => setTripStatus("received_cuba")} disabled={working} />}{trip.status === "received_cuba" && <Action icon={<Package size={18} />} label="Comenzar reparto" onClick={() => setTripStatus("in_delivery")} disabled={working} />}<button onClick={() => closeTrip(false)} disabled={working} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-black text-white disabled:opacity-50"><CheckCircle2 size={18} />Cerrar viaje</button></div>}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5"><Metric label="Envíos" value={shipments.length.toString()} /><Metric label="Pendientes" value={open.toString()} /><Metric label="Entregados" value={delivered.toString()} /><Metric label="Libras" value={totalWeight.toFixed(1)} /><Metric label="Facturado" value={money(billed)} /></div>
          <div className="mt-5 rounded-2xl bg-white/10 p-4"><div className="flex items-center justify-between gap-4 text-sm font-black"><span>Progreso operativo</span><span>{progress}%</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs font-semibold text-blue-100/80">{delivered} entregados · {issues} incidencias · {open} pendientes</p></div>
        </header>

        {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700"><AlertTriangle className="mr-2 inline" size={18} />{error}</div>}

        <section className="mt-6 grid gap-4 md:grid-cols-3"><Info title="Salida" value={date(trip.departure_date)} /><Info title="Llegada estimada" value={date(trip.estimated_arrival_date)} /><Info title="Responsable" value={trip.driver_name || "Sin asignar"} /></section>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-black text-[#061b3a]">Envíos del viaje</h2><p className="text-sm font-semibold text-slate-500">Factura y WhatsApp permanecen disponibles incluso después de cerrar el viaje.</p></div>{!tripClosed && canManage && <Link href={`/admin/shipping/new?tripId=${encodeURIComponent(trip.id)}`} className="rounded-2xl bg-[#0a2d63] px-5 py-3 text-center font-black text-white">Registrar envío</Link>}</div>

          {shipments.length > 0 && <div className="border-b border-slate-100 bg-slate-50/70 p-4 md:p-5"><div className="grid gap-3 xl:grid-cols-[1fr_220px_220px_auto]"><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar orden, rastreo, cliente, destinatario, teléfono o lugar" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label><label className="relative block"><SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-bold text-slate-700 outline-none focus:border-blue-400"><option value="all">Todos los estados</option>{shipmentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-700 outline-none focus:border-blue-400"><option value="all">Todos los cobros</option><option value="pending">Pendiente</option><option value="partial">Pago parcial</option><option value="paid">Pagado</option></select><div className="flex items-center gap-2"><span className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">{filteredShipments.length} resultado{filteredShipments.length === 1 ? "" : "s"}</span>{filtersActive && <button type="button" onClick={clearFilters} title="Limpiar filtros" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"><X size={18} /></button>}</div></div></div>}

          {selectedIds.size > 0 && canManage && !tripClosed && <div className="sticky top-0 z-20 border-b border-blue-200 bg-blue-50 p-4 shadow-sm"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="shrink-0 rounded-2xl bg-[#0a2d63] px-4 py-3 font-black text-white">{selectedIds.size} seleccionado{selectedIds.size === 1 ? "" : "s"}</div><div className="flex flex-1 flex-wrap gap-2"><select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as ShippingStatus | "")} className="h-11 rounded-xl border border-blue-200 bg-white px-3 font-bold"><option value="">Cambiar estado…</option>{shipmentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><button disabled={!bulkStatus || working} onClick={runBulkStatus} className="h-11 rounded-xl bg-blue-700 px-4 font-black text-white disabled:opacity-40">Aplicar estado</button><select value={driverChoice} onChange={(e) => setDriverChoice(e.target.value)} className="h-11 rounded-xl border border-blue-200 bg-white px-3 font-bold"><option value="">Quitar repartidor</option>{drivers.filter((driver) => driver.is_active).map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select><button disabled={working} onClick={runBulkDriver} className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 font-black text-blue-800"><UserRoundCheck size={17} />Asignar</button><select value={tripChoice} onChange={(e) => setTripChoice(e.target.value)} className="h-11 rounded-xl border border-blue-200 bg-white px-3 font-bold"><option value="">Mover a otro viaje…</option>{openTrips.map((item) => <option key={item.id} value={item.id}>#{item.trip_number} · {item.name}</option>)}</select><button disabled={!tripChoice || working} onClick={runBulkTrip} className="h-11 rounded-xl border border-blue-200 bg-white px-4 font-black text-blue-800 disabled:opacity-40">Mover</button><button disabled={working} onClick={printSelectedManifest} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-black text-slate-800"><Printer size={17} />Manifiesto</button><button disabled={working} onClick={runBulkTrash} className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 font-black text-white"><Trash2 size={17} />Papelera</button><button onClick={() => setSelectedIds(new Set())} className="inline-flex h-11 items-center gap-2 rounded-xl px-3 font-black text-slate-600"><X size={17} />Cancelar</button></div></div></div>}

          {shipments.length === 0 ? <div className="p-12 text-center text-slate-500"><Package className="mx-auto mb-3 text-slate-300" size={48} /><p className="font-black">Este viaje todavía está vacío.</p></div> : filteredShipments.length === 0 ? <div className="p-12 text-center text-slate-500"><Search className="mx-auto mb-3 text-slate-300" size={46} /><p className="font-black text-slate-800">No hay envíos que coincidan.</p><p className="mt-1 text-sm font-semibold">Prueba otra búsqueda o limpia los filtros.</p><button type="button" onClick={clearFilters} className="mt-4 rounded-2xl bg-[#0a2d63] px-5 py-3 font-black text-white">Limpiar filtros</button></div> : <div className="overflow-x-auto"><div className="min-w-[1220px]"><div className="grid grid-cols-[42px_80px_1.25fr_1.1fr_1fr_190px_120px_270px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500"><label className="flex items-center"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Seleccionar todos los envíos visibles" className="h-5 w-5 rounded border-slate-300 accent-blue-700" /></label><span>Orden</span><span>Cliente / rastreo</span><span>Destinatario</span><span>Destino</span><span>Estado</span><span>Total</span><span className="text-right">Acciones</span></div><div className="divide-y divide-slate-100">{filteredShipments.map((shipment) => <article id={`shipment-${shipment.id}`} key={shipment.id} className={`grid grid-cols-[42px_80px_1.25fr_1.1fr_1fr_190px_120px_270px] items-center gap-4 px-5 py-4 transition ${createdShipmentId === shipment.id ? "relative z-10 bg-emerald-50 ring-2 ring-inset ring-emerald-400" : selectedIds.has(shipment.id) ? "bg-blue-50" : "hover:bg-slate-50"}`}><label className="flex items-center"><input type="checkbox" checked={selectedIds.has(shipment.id)} onChange={() => toggleShipment(shipment.id)} aria-label={`Seleccionar envío ${shipment.order_number || shipment.tracking_code || shipment.id}`} className="h-5 w-5 rounded border-slate-300 accent-blue-700" /></label><div className="font-black text-[#0a2d63]">#{shipment.order_number || "—"}</div><div className="min-w-0"><p className="truncate font-black text-slate-900">{shipment.sender_name || "Sin cliente"}</p><p className="truncate text-xs font-bold text-blue-700">{shipment.tracking_code || shipment.id.slice(0, 8)}</p><p className="truncate text-xs text-slate-500">{shipment.sender_phone || "Sin teléfono"}</p></div><div className="min-w-0"><p className="truncate font-bold text-slate-800">{shipment.recipient_name || "Sin destinatario"}</p><p className="truncate text-xs text-slate-500">{shipment.recipient_phone || "Sin teléfono"}</p></div><div className="min-w-0"><p className="truncate font-bold text-slate-800">{shipment.location || "Sin lugar"}</p><p className="truncate text-xs text-slate-500">{shipment.recipient_address || "Sin dirección"}</p><p className="truncate text-[11px] font-bold text-blue-700">{shipment.assigned_driver_name || "Sin repartidor"}</p></div><div>{canManage && !tripClosed ? <select value={shipment.status} disabled={working} onChange={(event) => void changeOneStatus(shipment, event.target.value as ShippingStatus)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-blue-400">{shipmentStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{getShippingStatusLabel(shipment.status)}</span>}</div><div><p className="font-black text-slate-900">{money(shipment.service_price)}</p><p className="mt-1 text-xs font-bold text-slate-500">{shipment.payment_status === "paid" ? "Pagado" : shipment.payment_status === "partial" ? "Pago parcial" : "Pendiente"}</p></div><div className="flex items-center justify-end gap-2"><InvoiceActions shipment={shipment} compact />{!tripClosed && canManage && <Link href={`/admin/shipping/${shipment.id}/edit`} title="Editar envío" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><Edit3 size={17} /></Link>}</div></article>)}</div></div></div>}
        </section>
      </div>
    </main>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character] || character);
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs font-black uppercase tracking-wider text-blue-200">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>; }
function Info({ title, value }: { title: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</p><p className="mt-2 font-black text-slate-900">{value}</p></div>; }
function Action({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled: boolean }) { return <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#061b3a] disabled:opacity-50">{icon}{label}</button>; }
