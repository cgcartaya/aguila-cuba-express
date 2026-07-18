"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  CircleDollarSign,
  Edit3,
  Loader2,
  MapPin,
  PackageSearch,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import InvoiceActions from "@/components/admin/shipping/InvoiceActions";
import ShippingAdvancedFilters, {
  type ShippingListFilters,
} from "@/components/admin/shipping/ShippingAdvancedFilters";
import ShippingStatusBadge from "@/components/admin/shipping/ShippingStatusBadge";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getShipmentsByStoreId, moveShipmentToTrash } from "@/lib/services/shipping";
import { getShippingConfiguration } from "@/lib/services/shipping-settings";
import type {
  Shipment,
  ShippingLocation,
  ShippingMunicipality,
  ShippingProvince,
} from "@/lib/shipping/types";

const defaultFilters: ShippingListFilters = {
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

function asLocalDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
  const [provinces, setProvinces] = useState<ShippingProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<ShippingMunicipality[]>([]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ShippingListFilters>({
    ...defaultFilters,
    status: searchParams.get("status") || "all",
  });
  const [errorMessage, setErrorMessage] = useState("");

  async function load() {
    if (!activeStore?.id) {
      setShipments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const [shipmentResult, configResult] = await Promise.all([
      getShipmentsByStoreId(activeStore.id),
      getShippingConfiguration(activeStore.id),
    ]);

    if (shipmentResult.error) {
      setErrorMessage(shipmentResult.error.message);
      setShipments([]);
    } else {
      setShipments(shipmentResult.data || []);
    }

    if (configResult.error) {
      setErrorMessage((current) => current || configResult.error?.message || "No se pudo cargar la configuración territorial.");
    }

    setProvinces(configResult.provinces || []);
    setMunicipalities(configResult.municipalities || []);
    setLocations(configResult.locations || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!accessLoading && !storeLoading) void load();
  }, [accessLoading, storeLoading, activeStore?.id]);

  const driverNames = useMemo(
    () => Array.from(new Set(shipments.map((item) => item.assigned_driver_name).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b)),
    [shipments]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;

    const result = shipments.filter((shipment) => {
      const orderNumber = shipment.order_number;
      const created = asLocalDate(shipment.created_at || shipment.created_date);

      const matchesSearch =
        !query ||
        String(orderNumber || "").includes(query) ||
        shipment.tracking_code?.toLowerCase().includes(query) ||
        shipment.recipient_name?.toLowerCase().includes(query) ||
        shipment.recipient_phone?.includes(query) ||
        shipment.sender_name?.toLowerCase().includes(query) ||
        shipment.sender_phone?.includes(query) ||
        shipment.recipient_identity_card?.toLowerCase().includes(query) ||
        shipment.recipient_address?.toLowerCase().includes(query) ||
        shipment.location?.toLowerCase().includes(query);

      const matchesContent =
        filters.contentType === "all" ||
        (filters.contentType === "package" && shipment.contains_package && !shipment.contains_money) ||
        (filters.contentType === "money" && shipment.contains_money && !shipment.contains_package) ||
        (filters.contentType === "mixed" && shipment.contains_package && shipment.contains_money);

      const matchesAssignment =
        filters.assignment === "all" ||
        (filters.assignment === "assigned" && Boolean(shipment.assigned_driver_id || shipment.assigned_driver_name)) ||
        (filters.assignment === "unassigned" && !shipment.assigned_driver_id && !shipment.assigned_driver_name);

      return (
        matchesSearch &&
        (filters.status === "all" || shipment.status === filters.status) &&
        (!filters.provinceId || shipment.province_id === filters.provinceId) &&
        (!filters.municipalityId || shipment.municipality_id === filters.municipalityId) &&
        (!filters.locationId || shipment.shipping_location_id === filters.locationId) &&
        (!filters.driverName || shipment.assigned_driver_name === filters.driverName) &&
        matchesContent &&
        (filters.paymentStatus === "all" || shipment.payment_status === filters.paymentStatus) &&
        matchesAssignment &&
        (!from || (created && created >= from)) &&
        (!to || (created && created <= to))
      );
    });

    return result.sort((a, b) => {
      if (filters.sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (filters.sort === "order_asc") return Number(a.order_number || Number.MAX_SAFE_INTEGER) - Number(b.order_number || Number.MAX_SAFE_INTEGER);
      if (filters.sort === "order_desc") return Number(b.order_number || -1) - Number(a.order_number || -1);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filters, search, shipments]);

  async function trash(shipment: Shipment) {
    if (!activeStore?.id || !window.confirm(`¿Mover ${shipment.tracking_code || "este envío"} a la papelera?`)) return;
    const { error } = await moveShipmentToTrash(activeStore.id, shipment.id);
    if (error) return alert(error.message);
    setShipments((current) => current.filter((item) => item.id !== shipment.id));
  }

  const canCreate =
    access?.isSuperAdmin || ["OWNER", "ADMIN", "OPERATIONS"].includes(access?.storeMembership?.role || "");

  const pendingCount = shipments.filter((item) => item.payment_status !== "paid").length;
  const unassignedCount = shipments.filter((item) => !item.assigned_driver_id && !item.assigned_driver_name).length;

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <AdminPageHeader
          eyebrow="Centro operativo"
          title="Lista de envíos"
          description="Consulta, filtra y administra toda la operación logística hacia Cuba desde una sola pantalla."
          storeName={activeStore?.name}
          breadcrumbs={[
            { label: "Envíos", href: "/admin/shipping" },
            { label: "Lista" },
          ]}
          actions={
            <>
              <Link href="/admin/shipping" className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15">
                Dashboard
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
              <HeaderStat label="Envíos activos" value={shipments.length} icon={<Truck size={17} />} />
              <HeaderStat label="Cobro pendiente/parcial" value={pendingCount} icon={<CircleDollarSign size={17} />} />
              <HeaderStat label="Sin repartidor" value={unassignedCount} icon={<UserRound size={17} />} />
            </div>
          }
        />

        <section className="mb-5 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                placeholder="Número, rastreo, cliente, destinatario, teléfono, carnet, dirección o lugar"
              />
            </label>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 lg:min-w-52">
              <span>Resultados</span>
              <span className="rounded-full bg-white px-3 py-1 text-[#061b3a] shadow-sm">{filtered.length}</span>
            </div>
          </div>

          <ShippingAdvancedFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(defaultFilters)}
            provinces={provinces}
            municipalities={municipalities}
            locations={locations}
            driverNames={driverNames}
            expanded={filtersOpen}
            onToggleExpanded={() => setFiltersOpen((current) => !current)}
            activeCount={activeFilterCount}
          />
        </section>

        {errorMessage && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{errorMessage}</div>}

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-3xl border bg-white p-10 text-center font-bold text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin" />Cargando envíos...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border bg-white p-10 text-center"><PackageSearch className="mx-auto mb-4 text-slate-300" size={44} /><h2 className="text-xl font-extrabold">No hay envíos con estos filtros</h2><p className="mt-2 text-sm text-slate-500">Prueba limpiando alguno de los criterios de búsqueda.</p></div>
        ) : (
          <div className="space-y-4">
            {filtered.map((shipment) => (
              <article key={shipment.id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                <div className="flex flex-col xl:flex-row">
                  <div className="flex min-w-28 shrink-0 items-center justify-center bg-gradient-to-br from-[#061b3a] to-[#1554a6] p-5 text-white xl:flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Orden</span>
                    <span className="ml-2 text-3xl font-extrabold xl:ml-0 xl:mt-1">{shipment.order_number ? `#${shipment.order_number}` : "—"}</span>
                  </div>

                  <div className="min-w-0 flex-1 p-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-extrabold text-[#061b3a]">{shipment.tracking_code || shipment.id.slice(0, 8)}</h2>
                          <ShippingStatusBadge status={shipment.status} />
                          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${shipment.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : shipment.payment_status === "partial" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                            {shipment.payment_status === "paid" ? "Pagado" : shipment.payment_status === "partial" ? "Pago parcial" : "Pendiente"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <Info icon={<UserRound size={16} />} label="Cliente" value={shipment.sender_name || "Sin cliente"} subvalue={shipment.sender_phone || "Sin teléfono"} />
                          <Info icon={<UserRound size={16} />} label="Destinatario" value={shipment.recipient_name || "Sin destinatario"} subvalue={shipment.recipient_phone || "Sin teléfono"} />
                          <Info icon={<MapPin size={16} />} label="Destino" value={shipment.location || "Sin lugar"} subvalue={shipment.recipient_address || "Sin dirección"} />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-extrabold">
                          {shipment.contains_package && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">Paquete · {Number(shipment.weight_lb || 0).toFixed(2)} lb</span>}
                          {shipment.contains_money && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">Dinero · {money(shipment.money_amount)}</span>}
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Total · {money(shipment.service_price)}</span>
                          {Number(shipment.balance_due || 0) > 0 && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">Saldo · {money(shipment.balance_due)}</span>}
                          {shipment.recipient_identity_card && <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">CI · {shipment.recipient_identity_card}</span>}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1.5"><Truck size={14} />{shipment.assigned_driver_name || "Sin repartidor"}</span>
                          <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{shipment.created_at ? new Date(shipment.created_at).toLocaleDateString("es-US") : "Sin fecha"}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:max-w-72 xl:justify-end">
                        <InvoiceActions shipment={shipment} compact />
                        <Link href={`/admin/shipping/${shipment.id}/edit`} className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold"><Edit3 size={17} />Editar</Link>
                        <button onClick={() => void trash(shipment)} className="inline-flex items-center gap-2 rounded-2xl border border-red-100 px-4 py-2.5 text-sm font-extrabold text-red-600"><Trash2 size={17} />Papelera</button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
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

function Info({ icon, label, value, subvalue }: { icon: React.ReactNode; label: string; value: string; subvalue: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-3">
      <div className="mt-0.5 text-blue-700">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-extrabold text-slate-900">{value}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{subvalue}</p>
      </div>
    </div>
  );
}
