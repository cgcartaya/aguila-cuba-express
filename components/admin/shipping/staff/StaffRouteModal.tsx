"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, MapPin, PackageCheck, Route, Truck, X } from "lucide-react";
import { getStaffShipments } from "@/lib/services/shipping-staff";
import type { StaffShipment, StaffUser } from "@/lib/shipping/staff-types";
import { getShippingStatusLabel } from "@/lib/shipping/types";

type Props = {
  open: boolean;
  storeId: string;
  user: StaffUser | null;
  onClose: () => void;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function StaffRouteModal({ open, storeId, user, onClose }: Props) {
  const [shipments, setShipments] = useState<StaffShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void getStaffShipments(storeId, user.id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error.message || "No se pudieron cargar los envíos del repartidor.");
        return;
      }
      setShipments(result.data);
    });
    return () => { cancelled = true; };
  }, [open, storeId, user]);

  const stats = useMemo(() => {
    const delivered = shipments.filter((item) => item.delivered || item.status === "delivered").length;
    const issues = shipments.filter((item) => item.status === "issue").length;
    return { total: shipments.length, delivered, pending: shipments.length - delivered, issues };
  }, [shipments]);

  if (!open || !user) return null;

  const progress = stats.total ? Math.round((stats.delivered / stats.total) * 100) : 0;
  const initials = `${user.first_name.slice(0, 1)}${user.last_name.slice(0, 1)}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-[2rem] bg-[#f5f7fb] shadow-2xl md:max-w-5xl md:rounded-[2rem]">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-r from-[#061b3a] via-[#0a2d63] to-[#1554a6] px-5 py-5 text-white md:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {user.photo_url ? <img src={user.photo_url} alt="" className="h-16 w-16 rounded-2xl border-2 border-white/30 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-black">{initials}</div>}
              <div>
                <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black"><Route size={14}/> Ruta y progreso</div>
                <h2 className="text-2xl font-black">{user.first_name} {user.last_name}</h2>
                <p className="text-sm font-semibold text-blue-100/80">{user.vehicle_type || "Sin vehículo"}{user.vehicle_plate ? ` · ${user.vehicle_plate}` : ""}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="Cerrar"><X /></button>
          </div>
        </header>

        <div className="space-y-5 p-4 md:p-7">
          <section className="grid gap-3 sm:grid-cols-4">
            <Metric icon={<Truck size={19}/>} label="Paradas" value={stats.total} tone="blue" />
            <Metric icon={<PackageCheck size={19}/>} label="Completadas" value={stats.delivered} tone="green" />
            <Metric icon={<MapPin size={19}/>} label="Pendientes" value={stats.pending} tone="amber" />
            <Metric icon={<CircleAlert size={19}/>} label="Incidencias" value={stats.issues} tone="red" />
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Progreso de la ruta</p><p className="mt-1 text-lg font-black text-slate-900">{stats.delivered} de {stats.total} paradas completadas</p></div>
              <p className="text-3xl font-black text-[#0a2d63]">{progress}%</p>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}

          <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b px-5 py-4"><h3 className="font-black text-slate-900">Recorrido de entregas</h3><p className="text-sm font-medium text-slate-500">Las pendientes aparecen primero; las completadas quedan marcadas.</p></div>

            {loading ? <div className="flex min-h-56 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin"/> Cargando ruta...</div> : shipments.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center text-slate-500"><Route size={44} className="mb-3 text-slate-300"/><p className="font-black text-slate-800">Este repartidor todavía no tiene envíos asignados</p><p className="mt-1 text-sm">Cuando asignes envíos usando su identificador, aparecerán aquí.</p></div> : <div className="p-4 md:p-6">
              <div className="relative">
                <div className="absolute bottom-5 left-[22px] top-5 w-1 rounded-full bg-slate-100" />
                <div className="space-y-4">
                  {shipments.map((shipment, index) => {
                    const done = shipment.delivered || shipment.status === "delivered";
                    const issue = shipment.status === "issue";
                    return (
                      <article key={shipment.id} className="relative grid grid-cols-[46px_1fr] gap-3">
                        <div className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white shadow ${done ? "bg-emerald-500 text-white" : issue ? "bg-rose-500 text-white" : "bg-blue-100 text-blue-700"}`}>
                          {done ? <CheckCircle2 size={21}/> : issue ? <CircleAlert size={21}/> : <span className="text-sm font-black">{shipment.trip_order || index + 1}</span>}
                        </div>
                        <div className={`rounded-2xl border p-4 ${done ? "border-emerald-200 bg-emerald-50/60" : issue ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-white"}`}>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-900">{shipment.recipient_name || "Sin destinatario"}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${done ? "bg-emerald-100 text-emerald-700" : issue ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>{getShippingStatusLabel(shipment.status)}</span></div>
                              <p className="mt-1 text-sm font-semibold text-slate-600">{shipment.location || "Sin localidad"}</p>
                              <p className="mt-1 text-sm text-slate-500">{shipment.recipient_address || "Sin dirección"}</p>
                              {shipment.recipient_phone && <p className="mt-1 text-xs font-bold text-slate-500">Tel. {shipment.recipient_phone}</p>}
                            </div>
                            <div className="text-left sm:text-right"><p className="text-xs font-black text-blue-700">{shipment.tracking_code || `#${shipment.order_number || index + 1}`}</p><p className="mt-1 text-xs font-semibold text-slate-500">{done ? `Entregado: ${formatDate(shipment.delivered_date)}` : `Creado: ${formatDate(shipment.created_at)}`}</p></div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>}
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "blue" | "green" | "amber" | "red" }) {
  const tones = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-rose-50 text-rose-700" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className={`rounded-xl p-2.5 ${tones[tone]}`}>{icon}</div><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="text-2xl font-black text-slate-900">{value}</p></div></div></div>;
}
