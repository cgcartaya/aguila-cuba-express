"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Filter,
  MapPinned,
  Package,
  RotateCcw,
  Route,
  Truck,
  UserRound,
} from "lucide-react";

import type {
  ShippingLocation,
  ShippingMunicipality,
  ShippingProvince,
  ShippingTrip,
} from "@/lib/shipping/types";

export type ShippingListFilters = {
  tripId: string;
  status: string;
  provinceId: string;
  municipalityId: string;
  locationId: string;
  driverName: string;
  contentType: "all" | "package" | "money" | "mixed";
  paymentStatus: "all" | "pending" | "partial" | "paid";
  assignment: "all" | "assigned" | "unassigned";
  dateFrom: string;
  dateTo: string;
  sort: "newest" | "oldest" | "order_desc" | "order_asc";
};

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos los estados" },
  { value: "received_miami", label: "Recibido en Miami" },
  { value: "preparing", label: "Pendiente de salida" },
  { value: "in_transit", label: "En tránsito hacia Cuba" },
  { value: "received_cuba", label: "Recibido en Cuba" },
  { value: "out_for_delivery", label: "En reparto" },
  { value: "delivered", label: "Entregado" },
  { value: "issue", label: "Incidencia" },
];

export default function ShippingAdvancedFilters({
  filters,
  onChange,
  onReset,
  provinces,
  municipalities,
  locations,
  trips,
  driverNames,
  expanded,
  onToggleExpanded,
  activeCount,
}: {
  filters: ShippingListFilters;
  onChange: (next: ShippingListFilters) => void;
  onReset: () => void;
  provinces: ShippingProvince[];
  municipalities: ShippingMunicipality[];
  locations: ShippingLocation[];
  trips: ShippingTrip[];
  driverNames: string[];
  expanded: boolean;
  onToggleExpanded: () => void;
  activeCount: number;
}) {
  const visibleMunicipalities = useMemo(
    () => municipalities.filter((item) => !filters.provinceId || item.province_id === filters.provinceId),
    [filters.provinceId, municipalities]
  );

  const visibleLocations = useMemo(
    () => locations.filter((item) => !filters.municipalityId || item.municipality_id === filters.municipalityId),
    [filters.municipalityId, locations]
  );

  function set<K extends keyof ShippingListFilters>(key: K, value: ShippingListFilters[K]) {
    const next = { ...filters, [key]: value };

    if (key === "provinceId") {
      next.municipalityId = "";
      next.locationId = "";
    }
    if (key === "municipalityId") next.locationId = "";

    onChange(next);
  }

  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <QuickSelect
          icon={<Route size={16} />}
          label="Viaje"
          value={filters.tripId}
          onChange={(value) => set("tripId", value)}
        >
          <option value="all">Todos los viajes</option>
          <option value="unassigned">Sin viaje asignado</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              Viaje {trip.trip_number} · {trip.name}
            </option>
          ))}
        </QuickSelect>

        <QuickSelect
          icon={<Truck size={16} />}
          label="Estado"
          value={filters.status}
          onChange={(value) => set("status", value)}
        >
          {statusOptions.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </QuickSelect>

        <QuickSelect
          icon={<CircleDollarSign size={16} />}
          label="Cobro"
          value={filters.paymentStatus}
          onChange={(value) => set("paymentStatus", value as ShippingListFilters["paymentStatus"])}
        >
          <option value="all">Todos los cobros</option>
          <option value="pending">Pendiente</option>
          <option value="partial">Pago parcial</option>
          <option value="paid">Pagado</option>
        </QuickSelect>

        <QuickSelect
          icon={<Filter size={16} />}
          label="Orden"
          value={filters.sort}
          onChange={(value) => set("sort", value as ShippingListFilters["sort"])}
        >
          <option value="newest">Más recientes primero</option>
          <option value="oldest">Más antiguos primero</option>
          <option value="order_desc">Número mayor primero</option>
          <option value="order_asc">Número menor primero</option>
        </QuickSelect>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-extrabold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
        >
          <Filter size={16} />
          Más filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">{activeCount}</span>
          )}
          <ChevronDown size={15} className={`transition ${expanded ? "rotate-180" : ""}`} />
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
          >
            <RotateCcw size={15} />
            Limpiar filtros
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterField icon={<MapPinned size={16} />} label="Provincia">
              <select value={filters.provinceId} onChange={(e) => set("provinceId", e.target.value)} className={selectClass}>
                <option value="">Todas las provincias</option>
                {provinces.filter((item) => item.is_active).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </FilterField>

            <FilterField icon={<MapPinned size={16} />} label="Municipio">
              <select value={filters.municipalityId} onChange={(e) => set("municipalityId", e.target.value)} className={selectClass} disabled={!filters.provinceId}>
                <option value="">Todos los municipios</option>
                {visibleMunicipalities.filter((item) => item.is_active).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </FilterField>

            <FilterField icon={<MapPinned size={16} />} label="Lugar de entrega">
              <select value={filters.locationId} onChange={(e) => set("locationId", e.target.value)} className={selectClass} disabled={!filters.municipalityId}>
                <option value="">Todos los lugares</option>
                {visibleLocations.filter((item) => item.is_active).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </FilterField>

            <FilterField icon={<UserRound size={16} />} label="Repartidor">
              <select value={filters.driverName} onChange={(e) => set("driverName", e.target.value)} className={selectClass}>
                <option value="">Todos los repartidores</option>
                {driverNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </FilterField>

            <FilterField icon={<UserRound size={16} />} label="Asignación">
              <select value={filters.assignment} onChange={(e) => set("assignment", e.target.value as ShippingListFilters["assignment"])} className={selectClass}>
                <option value="all">Todos</option>
                <option value="assigned">Con repartidor</option>
                <option value="unassigned">Sin repartidor</option>
              </select>
            </FilterField>

            <FilterField icon={<Package size={16} />} label="Contenido">
              <select value={filters.contentType} onChange={(e) => set("contentType", e.target.value as ShippingListFilters["contentType"])} className={selectClass}>
                <option value="all">Paquete, dinero o mixto</option>
                <option value="package">Solo paquetes</option>
                <option value="money">Solo dinero</option>
                <option value="mixed">Operaciones mixtas</option>
              </select>
            </FilterField>

            <FilterField icon={<CalendarDays size={16} />} label="Desde">
              <input type="date" value={filters.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} className={selectClass} />
            </FilterField>

            <FilterField icon={<CalendarDays size={16} />} label="Hasta">
              <input type="date" value={filters.dateTo} onChange={(e) => set("dateTo", e.target.value)} className={selectClass} />
            </FilterField>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickSelect({
  icon,
  label,
  value,
  onChange,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="shrink-0 text-blue-700">{icon}</span>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function FilterField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">{icon}{label}</span>
      {children}
    </label>
  );
}

const selectClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400";
