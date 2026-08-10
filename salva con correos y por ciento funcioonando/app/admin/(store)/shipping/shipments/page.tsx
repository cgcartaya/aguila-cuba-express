"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Edit3,
  Loader2,
  MapPin,
  PackageSearch,
  Plus,
  Route,
  Search,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import InvoiceActions from "@/components/admin/shipping/InvoiceActions";
import PaymentCollectButton from "@/components/admin/shipping/PaymentCollectButton";
import ShippingAdvancedFilters, {
  type ShippingListFilters,
} from "@/components/admin/shipping/ShippingAdvancedFilters";
import ShippingStatusBadge from "@/components/admin/shipping/ShippingStatusBadge";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  bulkMoveShipmentsToTrip,
  getShipmentsPage,
  getShipmentsSummaryCounts,
  getShippingDriversByStoreId,
  moveShipmentToTrash,
} from "@/lib/services/shipping";
import { getShippingConfiguration } from "@/lib/services/shipping-settings";
import { getShippingTripsByStoreId } from "@/lib/services/shipping-trips";
import type {
  Shipment,
  ShippingLocation,
  ShippingMunicipality,
  ShippingProvince,
  ShippingTrip,
} from "@/lib/shipping/types";

const PAGE_SIZE = 50;

const defaultFilters: ShippingListFilters = {
  tripId: "all",
  status: "all",
  provinceId: "",
  municipalityId: "",
  locationId: "",
  driverName: "",
  contentType: "all",
  paymentStatus: "all",
  assignment: "all",
  dateFrom: "",
  dateTo: "",
  sort: "newest",
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function ShippingShipmentsPage() {
  const searchParams = useSearchParams();
  const { access, loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [trips, setTrips] = useState<ShippingTrip[]>([]);
  const [provinces, setProvinces] = useState<ShippingProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<ShippingMunicipality[]>([]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [driverNames, setDriverNames] = useState<string[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, unassigned: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ShippingListFilters>({
    ...defaultFilters,
    status: searchParams.get("status") || "all",
    tripId: searchParams.get("trip") || "all",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [assigningShipmentId, setAssigningShipmentId] = useState<string | null>(null);
  const [tripSelections, setTripSelections] = useState<Record<string, string>>({});

  // Espera a que la persona deje de escribir antes de volver a consultar.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Cualquier cambio de filtros o búsqueda regresa a la página 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  // Catálogos y viajes: se cargan una sola vez por tienda (son livianos).
  async function loadStatic() {
    if (!activeStore?.id) {
      setTrips([]);
      return;
    }

    const [configResult, tripResult, driversResult, summaryResult] = await Promise.all([
      getShippingConfiguration(activeStore.id),
      getShippingTripsByStoreId(activeStore.id),
      getShippingDriversByStoreId(activeStore.id),
      getShipmentsSummaryCounts(activeStore.id),
    ]);

    if (tripResult.error) {
      setErrorMessage((current) => current || tripResult.error.message);
      setTrips([]);
    } else {
      setTrips(tripResult.data || []);
    }

    if (!driversResult.error) setDriverNames((driversResult.data || []).map((driver) => driver.name).sort());
    if (!summaryResult.error) setSummary(summaryResult);

    setProvinces(configResult.provinces || []);
    setMunicipalities(configResult.municipalities || []);
    setLocations(configResult.locations || []);
  }

  // Página de envíos: se recarga cada vez que cambian filtros/búsqueda/página.
  async function loadPage() {
    if (!activeStore?.id) {
      setShipments([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const result = await getShipmentsPage(activeStore.id, {
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      status: filters.status,
      tripId: filters.tripId,
      provinceId: filters.provinceId,
      municipalityId: filters.municipalityId,
      locationId: filters.locationId,
      driverName: filters.driverName,
      contentType: filters.contentType,
      paymentStatus: filters.paymentStatus,
      assignment: filters.assignment,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      sort: filters.sort,
    });

    if (result.error) {
      setErrorMessage(result.error.message);
      setShipments([]);
      setTotalCount(0);
    } else {
      setShipments(result.data || []);
      setTotalCount(result.count || 0);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!accessLoading && !storeLoading) void loadStatic();
  }, [accessLoading, storeLoading, activeStore?.id]);

  useEffect(() => {
    if (!accessLoading && !storeLoading) void loadPage();
  }, [accessLoading, storeLoading, activeStore?.id, debouncedSearch, filters, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function assignShipmentToTrip(shipment: Shipment) {
    if (!activeStore?.id) return;
    const tripId = tripSelections[shipment.id];
    if (!tripId) {
      setErrorMessage("Selecciona el viaje al que deseas asignar el envío.");
      return;
    }
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;
    if (!window.confirm(`¿Asignar el envío #${shipment.order_number || "—"} al viaje “${trip.name}”?`)) return;

    setAssigningShipmentId(shipment.id);
    setErrorMessage("");
    const result = await bulkMoveShipmentsToTrip(activeStore.id, [shipment.id], tripId);
    if (result.error) {
      setErrorMessage(result.error.message || "No se pudo asignar el envío al viaje.");
    } else {
      setTripSelections((current) => {
        const next = { ...current };
        delete next[shipment.id];
        return next;
      });
      await loadPage();
      await loadStatic();
    }
    setAssigningShipmentId(null);
  }

  const tripMap = useMemo(
    () => new Map(trips.map((trip) => [trip.id, trip])),
    [trips]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.tripId !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.provinceId) count++;
    if (filters.municipalityId) count++;
    if (filters.locationId) count++;
    if (filters.driverName) count++;
    if (filters.contentType !== "all") count++;
    if (filters.paymentStatus !== "all") count++;
    if (filters.assignment !== "all") count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.sort !== "newest") count++;
    return count;
  }, [filters]);

  async function trash(shipment: Shipment) {
    if (!activeStore?.id || !window.confirm(`¿Mover ${shipment.tracking_code || "este envío"} a la papelera?`)) return;
    const { error } = await moveShipmentToTrash(activeStore.id, shipment.id, access?.profile?.id);
    if (error) return alert(error.message);
    setShipments((current) => current.filter((item) => item.id !== shipment.id));
    setTotalCount((current) => Math.max(0, current - 1));
  }

  const canCreate =
    access?.isSuperAdmin || ["OWNER", "ADMIN", "OPERATIONS"].includes(access?.storeMembership?.role || "");

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <AdminPageHeader
          eyebrow="Centro operativo"
          title="Todos los envíos"
          description="Buscador global de paquetes de todos los viajes, con una vista compacta y filtros operativos."
          storeName={activeStore?.name}
          breadcrumbs={[
            { label: "Envíos", href: "/admin/shipping" },
            { label: "Todos los envíos" },
          ]}
          actions={
            <>
              <Link href="/admin/shipping/trips" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15">
                <Route size={17} />
                Viajes
              </Link>
              <Link href="/admin/shipping/shipments/trash" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15">
                <Archive size={17} />
                Papelera
              </Link>
              {canCreate && activeStore && (
                <Link href="/admin/shipping/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-[#061b3a] shadow-lg">
                  <Plus size={18} />
                  Nuevo envío
                </Link>
              )}
            </>
          }
          stats={
            <div className="grid gap-3 sm:grid-cols-3">
              <HeaderStat label="Envíos activos" value={summary.total} icon={<Truck size={17} />} />
              <HeaderStat label="Cobro pendiente/parcial" value={summary.pending} icon={<CircleDollarSign size={17} />} />
              <HeaderStat label="Sin repartidor" value={summary.unassigned} icon={<UserRound size={17} />} />
            </div>
          }
        />

        <section className="mb-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                placeholder="Buscar número, rastreo, viaje, cliente, destinatario, teléfono, dirección o lugar"
              />
            </label>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 lg:min-w-44">
              <span>Resultados</span>
              <span className="rounded-full bg-white px-3 py-1 text-[#061b3a] shadow-sm">{totalCount}</span>
            </div>
          </div>

          <ShippingAdvancedFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(defaultFilters)}
            provinces={provinces}
            municipalities={municipalities}
            locations={locations}
            trips={trips}
            driverNames={driverNames}
            expanded={filtersOpen}
            onToggleExpanded={() => setFiltersOpen((current) => !current)}
            activeCount={activeFilterCount}
          />
        </section>

        {errorMessage && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{errorMessage}</div>}

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-3xl border bg-white p-10 text-center font-bold text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin" />Cargando envíos...</div>
        ) : shipments.length === 0 ? (
          <div className="rounded-3xl border bg-white p-10 text-center"><PackageSearch className="mx-auto mb-4 text-slate-300" size={44} /><h2 className="text-xl font-extrabold">No hay envíos con estos filtros</h2><p className="mt-2 text-sm text-slate-500">Prueba limpiando alguno de los criterios de búsqueda.</p></div>
        ) : (
          <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[80px_minmax(190px,1.2fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(135px,.8fr)_110px_260px] gap-3 border-b bg-slate-50 px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 xl:grid">
              <span>Orden</span>
              <span>Cliente / rastreo</span>
              <span>Destinatario</span>
              <span>Destino</span>
              <span>Viaje</span>
              <span>Total</span>
              <span className="text-right">Acciones</span>
            </div>

            <div className="divide-y divide-slate-100">
              {shipments.map((shipment) => {
                const trip = shipment.trip_id ? tripMap.get(shipment.trip_id) : null;
                return (
                  <article key={shipment.id} className="group px-4 py-3 transition hover:bg-blue-50/35">
                    <div className="grid gap-3 xl:grid-cols-[80px_minmax(190px,1.2fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(135px,.8fr)_110px_260px] xl:items-center">
                      <div className="flex items-center justify-between xl:block">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 xl:hidden">Orden</span>
                        <span className="text-base font-black text-[#061b3a]">{shipment.order_number ? `#${shipment.order_number}` : "—"}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-extrabold text-slate-900">{shipment.sender_name || "Sin cliente"}</p>
                          <ShippingStatusBadge status={shipment.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs font-bold text-blue-700">{shipment.tracking_code || shipment.id.slice(0, 8)}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{shipment.sender_phone || "Sin teléfono"}</p>
                      </div>

                      <CompactCell label="Destinatario" primary={shipment.recipient_name || "Sin destinatario"} secondary={shipment.recipient_phone || "Sin teléfono"} />

                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase text-slate-400 xl:hidden">Destino</p>
                        <p className="truncate text-sm font-bold text-slate-800">{shipment.location || "Sin lugar"}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{shipment.recipient_address || "Sin dirección"}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase text-slate-400 xl:hidden">Viaje</p>
                        {trip ? (
                          <Link href={`/admin/shipping/trips/${trip.id}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 hover:bg-blue-100">
                            <Route size={13} />
                            <span className="truncate">Viaje {trip.trip_number}</span>
                          </Link>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700">Sin viaje</span>
                            <div className="flex min-w-[170px] gap-1">
                              <select
                                value={tripSelections[shipment.id] || ""}
                                onChange={(event) => setTripSelections((current) => ({ ...current, [shipment.id]: event.target.value }))}
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-400"
                                aria-label={`Seleccionar viaje para el envío ${shipment.order_number || shipment.tracking_code || shipment.id}`}
                              >
                                <option value="">Asignar viaje…</option>
                                {trips
                                  .filter((item) => item.is_active && !item.deleted_at && !["completed", "cancelled"].includes(item.status))
                                  .map((item) => <option key={item.id} value={item.id}>Viaje {item.trip_number} · {item.name}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => void assignShipmentToTrip(shipment)}
                                disabled={!tripSelections[shipment.id] || assigningShipmentId === shipment.id}
                                className="rounded-lg bg-[#0a2d63] px-2.5 py-1.5 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {assigningShipmentId === shipment.id ? "…" : "Asignar"}
                              </button>
                            </div>
                          </div>
                        )}
                        <p className="mt-1 truncate text-[11px] text-slate-500">{shipment.assigned_driver_name || "Sin repartidor"}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-slate-400 xl:hidden">Total</p>
                        <p className="text-sm font-black text-slate-900">{money(shipment.service_price)}</p>
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${shipment.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : shipment.payment_status === "partial" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                          {shipment.payment_status === "paid" ? "Pagado" : shipment.payment_status === "partial" ? "Parcial" : "Pendiente"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
                        <InvoiceActions shipment={shipment} compact />
                        <PaymentCollectButton shipment={shipment} onPaid={() => void loadPage()} compact />
                        <Link
                          href={`/admin/shipping/${shipment.id}/edit`}
                          title="Editar envío"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-blue-300 hover:bg-white hover:text-blue-700"
                        >
                          <Edit3 size={16} />
                        </Link>
                        <button
                          onClick={() => void trash(shipment)}
                          title="Mover a papelera"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500 xl:hidden">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{shipment.created_at ? new Date(shipment.created_at).toLocaleDateString("es-US") : "Sin fecha"}</span>
                      {shipment.contains_package && <span>Paquete · {Number(shipment.weight_lb || 0).toFixed(2)} lb</span>}
                      {shipment.contains_money && <span>Dinero · {money(shipment.money_amount)}</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!loading && totalCount > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs font-bold text-slate-500">
              Página {page} de {totalPages} · {totalCount} envíos
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function HeaderStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500">{icon}<span className="text-xs font-bold">{label}</span></div>
      <span className="text-lg font-extrabold text-[#061b3a]">{value}</span>
    </div>
  );
}

function CompactCell({ label, primary, secondary }: { label: string; primary: string; secondary: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-extrabold uppercase text-slate-400 xl:hidden">{label}</p>
      <p className="truncate text-sm font-bold text-slate-800">{primary}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">{secondary}</p>
    </div>
  );
}
