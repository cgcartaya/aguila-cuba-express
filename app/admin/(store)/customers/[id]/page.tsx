"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Contact,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Star,
  UserRound,
  WalletCards,
} from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getShippingCustomerDetail } from "@/lib/services/shipping-customers";
import type {
  ShippingCustomer,
  ShippingRecipient,
} from "@/lib/shipping/customer-types";

function money(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function ShippingCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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

  const [customer, setCustomer] = useState<ShippingCustomer | null>(null);
  const [recipients, setRecipients] = useState<ShippingRecipient[]>([]);
  const [shipments, setShipments] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeStore?.id) {
        setLoading(false);
        return;
      }

      const { data } = await getShippingCustomerDetail(activeStore.id, id);
      setCustomer(data?.customer || null);
      setRecipients(data?.recipients || []);
      setShipments(data?.shipments || []);
      setLoading(false);
    }

    if (!accessLoading && !storeLoading) void load();
  }, [accessLoading, storeLoading, activeStore?.id, id]);

  if (loading || accessLoading || storeLoading) {
    return (
      <main className="p-10 text-center text-slate-500">
        <Loader2 className="mx-auto mb-3 animate-spin" />
        Cargando cliente...
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="p-10 text-center font-bold text-red-700">
        Cliente no encontrado.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/customers"
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-bold"
        >
          <ArrowLeft size={18} />
          Volver a clientes
        </Link>

        <header className="rounded-[2rem] bg-gradient-to-br from-[#061b3a] to-[#1554a6] p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                <UserRound size={30} />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-200">
                  Cliente #{customer.customer_number}
                </p>
                <h1 className="text-3xl font-extrabold">{customer.name}</h1>
                <p className="mt-1 text-blue-100">{customer.phone}</p>
              </div>
            </div>

            <a
              href={`https://wa.me/${customer.normalized_phone}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Operaciones" value={String(customer.operations_count || 0)} />
          <Metric label="Destinatarios" value={String(recipients.length)} />
          <Metric label="Facturado" value={money(customer.total_billed)} />
          <Metric
            label="Saldo pendiente"
            value={money(customer.total_balance)}
            alert={Number(customer.total_balance || 0) > 0}
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.25fr]">
          <section className="rounded-[2rem] border bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
                Agenda del cliente
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                Destinatarios
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {recipients.map((recipient) => (
                <article
                  key={recipient.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                      <Contact size={19} />
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-extrabold text-slate-950">
                        {recipient.name}
                        {recipient.is_favorite && (
                          <Star
                            size={14}
                            className="fill-amber-400 text-amber-400"
                          />
                        )}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <Phone size={14} />
                        {recipient.phone}
                      </p>
                      <p className="mt-1 flex items-start gap-2 text-sm text-slate-500">
                        <MapPin size={14} className="mt-1 shrink-0" />
                        {recipient.address}
                      </p>
                      {recipient.identity_card && (
                        <p className="mt-2 text-xs font-bold text-blue-700">
                          Carnet: {recipient.identity_card}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                Historial
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                Operaciones recientes
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {shipments.map((shipment) => (
                <Link
                  key={shipment.id}
                  href={`/admin/shipping/${shipment.id}/edit`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300"
                >
                  <div className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-violet-100 px-2 font-extrabold text-violet-700">
                    {shipment.order_number || "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold text-slate-950">
                      {shipment.recipient_name || "Sin destinatario"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {shipment.location} · {shipment.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-950">
                      {money(shipment.service_price)}
                    </p>
                    <p className="text-xs text-amber-700">
                      Saldo {money(shipment.balance_due)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-extrabold ${
          alert ? "text-amber-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
