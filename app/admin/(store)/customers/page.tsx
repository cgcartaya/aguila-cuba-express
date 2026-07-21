"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Clock3,
  Loader2,
  PackagePlus,
  Phone,
  Search,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getShippingCustomers } from "@/lib/services/shipping-customers";
import type { ShippingCustomer } from "@/lib/shipping/customer-types";

function money(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin operaciones";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ShippingCustomersPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

  const [customers, setCustomers] = useState<ShippingCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!activeStore?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await getShippingCustomers(activeStore.id);

      if (error) {
        setErrorMessage(error.message);
        setCustomers([]);
      } else {
        setCustomers(data || []);
      }

      setLoading(false);
    }

    if (!accessLoading && !storeLoading) void load();
  }, [accessLoading, storeLoading, activeStore?.id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const digits = search.replace(/\D/g, "");

    return customers.filter((customer) => {
      const code = customer.customer_code || `AG-${String(customer.customer_number).padStart(4, "0")}`;
      const matchesSearch =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(digits || query) ||
        code.toLowerCase().includes(query) ||
        String(customer.customer_number).includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "debt" && Number(customer.total_balance || 0) > 0) ||
        (filter === "vip" && customer.customer_type === "vip") ||
        (filter === "recent" &&
          customer.last_operation_at &&
          new Date(customer.last_operation_at) >
            new Date(Date.now() - 30 * 86400000));

      return matchesSearch && matchesFilter;
    });
  }, [customers, filter, search]);

  const totalBalance = customers.reduce(
    (sum, customer) => sum + Number(customer.total_balance || 0),
    0
  );
  const totalRecipients = customers.reduce(
    (sum, customer) => sum + Number(customer.recipients_count || 0),
    0
  );
  const activeThisMonth = customers.filter(
    (customer) =>
      customer.last_operation_at &&
      new Date(customer.last_operation_at) >
        new Date(Date.now() - 30 * 86400000)
  ).length;

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-3 pb-28 sm:p-5 lg:p-7 lg:pb-10">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#0b3d7c] to-[#0878c9] p-5 text-white shadow-[0_24px_70px_-35px_rgba(2,32,71,.8)] sm:p-7 lg:p-9">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-blue-300/10 blur-2xl" />

          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[.16em] text-blue-100 backdrop-blur">
                <Sparkles size={15} /> CRM de envíos
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Clientes y destinatarios
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-100/85 sm:text-base">
                Busca un cliente, abre su libreta de destinatarios y crea un envío con sus datos cargados en segundos.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/admin/shipping/new"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#061b3a] shadow-lg transition hover:-translate-y-0.5"
                >
                  <PackagePlus size={19} /> Crear envío
                </Link>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-blue-50 backdrop-blur">
                  {filtered.length} de {customers.length} clientes visibles
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[600px]">
              <HeroMetric label="Clientes" value={String(customers.length)} icon={<UsersRound size={18} />} />
              <HeroMetric label="Destinatarios" value={String(totalRecipients)} icon={<UserRound size={18} />} />
              <HeroMetric label="Activos 30 días" value={String(activeThisMonth)} icon={<Clock3 size={18} />} />
              <HeroMetric label="Saldo total" value={money(totalBalance)} icon={<WalletCards size={18} />} alert={totalBalance > 0} />
            </div>
          </div>
        </header>

        <section className="sticky top-2 z-20 rounded-[1.6rem] border border-slate-200/80 bg-white/95 p-3 shadow-lg shadow-slate-200/40 backdrop-blur sm:p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_230px]">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                placeholder="Buscar por AG-0043, nombre o teléfono..."
              />
            </label>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="all">Todos los clientes</option>
              <option value="recent">Actividad reciente</option>
              <option value="debt">Con saldo pendiente</option>
              <option value="vip">Clientes VIP</option>
            </select>
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-[2rem] border bg-white p-12 text-center font-bold text-slate-500 shadow-sm">
            <Loader2 className="mx-auto mb-3 animate-spin" />
            Cargando clientes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <Search className="mx-auto text-slate-300" size={38} />
            <h2 className="mt-4 text-xl font-black text-slate-900">No encontramos clientes</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Prueba otro nombre, código o teléfono.</p>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((customer) => {
              const code = customer.customer_code || `AG-${String(customer.customer_number).padStart(4, "0")}`;
              const hasDebt = Number(customer.total_balance || 0) > 0;

              return (
                <article
                  key={customer.id}
                  className="group overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-700 ring-1 ring-blue-100">
                        <UserRound size={23} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black text-slate-950">{customer.name}</p>
                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                              <Phone size={14} /> {customer.phone}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#061b3a] px-3 py-1.5 text-xs font-black text-white">
                            {code}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-2">
                          <MiniMetric label="Envíos" value={String(Number(customer.operations_count || 0))} />
                          <MiniMetric label="Destinatarios" value={String(Number(customer.recipients_count || 0))} accent="blue" />
                          <MiniMetric label="Saldo" value={money(customer.total_balance)} alert={hasDebt} />
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Última operación</p>
                            <p className="mt-1 text-sm font-black text-slate-700">{formatDate(customer.last_operation_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Facturado</p>
                            <p className="mt-1 text-sm font-black text-slate-900">{money(customer.total_billed)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/70 p-3">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black text-slate-700 transition hover:bg-white hover:text-blue-700"
                    >
                      Ver expediente <ArrowRight size={16} />
                    </Link>
                    <Link
                      href={`/admin/shipping/new?customerId=${customer.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#061b3a] px-3 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-900"
                    >
                      <PackagePlus size={17} /> Nuevo envío
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function HeroMetric({ label, value, icon, alert = false }: { label: string; value: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-bold text-blue-100">{icon}<span>{label}</span></div>
      <p className={`mt-2 truncate text-xl font-black ${alert ? "text-amber-200" : "text-white"}`}>{value}</p>
    </div>
  );
}

function MiniMetric({ label, value, alert = false, accent }: { label: string; value: string; alert?: boolean; accent?: "blue" }) {
  return (
    <div className={`rounded-xl px-2 py-3 text-center ${accent === "blue" ? "bg-blue-50" : "bg-slate-50"}`}>
      <p className={`truncate text-sm font-black ${alert ? "text-amber-700" : accent === "blue" ? "text-blue-800" : "text-slate-950"}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold text-slate-400">{label}</p>
    </div>
  );
}
