"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Loader2,
  Phone,
  Search,
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

export default function ShippingCustomersPage() {
  const {
    loading: accessLoading,
    isSuperAdmin,
    store: accessStore,
  } = useAdminAccess();
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

    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
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

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] to-[#1554a6] p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-200">CRM de envíos</p>
              <h1 className="mt-1 text-3xl font-extrabold">
                Clientes y destinatarios
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-blue-100/80">
                Encuentra al cliente por teléfono, revisa sus destinatarios y
                consulta su historial financiero.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroMetric
                label="Clientes"
                value={customers.length.toString()}
                icon={<UsersRound size={18} />}
              />
              <HeroMetric
                label="Saldo total"
                value={money(totalBalance)}
                icon={<WalletCards size={18} />}
              />
            </div>
          </div>
        </header>

        <section className="mb-5 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-blue-400"
                placeholder="Nombre, teléfono o número de cliente"
              />
            </label>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
            >
              <option value="all">Todos</option>
              <option value="debt">Con saldo pendiente</option>
              <option value="vip">VIP</option>
              <option value="recent">Actividad reciente</option>
            </select>
          </div>
        </section>

        {errorMessage && (
          <div className="mb-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
            <Loader2 className="mx-auto mb-3 animate-spin" />
            Cargando clientes...
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <UserRound size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-slate-950">
                          {customer.name}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
                          <Phone size={14} />
                          {customer.phone}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        #{customer.customer_number}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniMetric
                        label="Operaciones"
                        value={Number(customer.operations_count || 0).toString()}
                      />
                      <MiniMetric
                        label="Destinatarios"
                        value={Number(customer.recipients_count || 0).toString()}
                      />
                      <MiniMetric
                        label="Saldo"
                        value={money(customer.total_balance)}
                        alert={Number(customer.total_balance || 0) > 0}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <p className="text-xs font-semibold text-slate-400">
                        Facturado: {money(customer.total_billed)}
                      </p>
                      <ArrowRight
                        size={17}
                        className="text-blue-700 transition group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function HeroMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-blue-100">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-xl font-extrabold">{value}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
      <p
        className={`font-extrabold ${
          alert ? "text-amber-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
        {label}
      </p>
    </div>
  );
}
