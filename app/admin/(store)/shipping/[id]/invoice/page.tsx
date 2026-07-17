"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Hash,
  Loader2,
  MapPin,
  Package,
  Phone,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";

import InvoiceActions from "@/components/admin/shipping/InvoiceActions";
import PrintInvoiceButton from "@/components/admin/shipping/PrintInvoiceButton";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  getShipmentById,
  getShipmentItems,
} from "@/lib/services/shipping";
import {
  getShippingStatusLabel,
  type Shipment,
  type ShipmentItem,
} from "@/lib/shipping/types";

function currency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default function ShippingInvoicePage({
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

  const {
    store: selectedStore,
    loading: storeLoading,
  } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadInvoice() {
      if (!activeStore?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const [shipmentResult, itemsResult] = await Promise.all([
        getShipmentById(activeStore.id, id),
        getShipmentItems(activeStore.id, id),
      ]);

      if (shipmentResult.error || !shipmentResult.data) {
        setErrorMessage(
          shipmentResult.error?.message ||
            "No se encontró la operación solicitada."
        );
        setShipment(null);
      } else {
        setShipment(shipmentResult.data);
      }

      setItems((itemsResult.data || []) as ShipmentItem[]);
      setLoading(false);
    }

    if (!accessLoading && !storeLoading) {
      void loadInvoice();
    }
  }, [accessLoading, storeLoading, activeStore?.id, id]);

  if (loading || accessLoading || storeLoading) {
    return (
      <main className="p-10 text-center font-bold text-slate-500">
        <Loader2 className="mx-auto mb-3 animate-spin" />
        Preparando factura...
      </main>
    );
  }

  if (!shipment || errorMessage) {
    return (
      <main className="p-10 text-center font-bold text-red-700">
        {errorMessage || "No se encontró la factura."}
      </main>
    );
  }

  const fallbackItems: Partial<ShipmentItem>[] = [
    ...(shipment.contains_package
      ? [
          {
            id: "package",
            item_type: "PACKAGE" as const,
            description:
              shipment.service_type_name || "Servicio de paquete",
            quantity: shipment.weight_lb,
            unit: "lb",
            unit_price: shipment.rate_per_lb,
            subtotal: shipment.weight_subtotal,
            discount_amount: 0,
            total: shipment.weight_subtotal,
          },
        ]
      : []),

    ...(shipment.contains_money
      ? [
          {
            id: "money",
            item_type: "MONEY" as const,
            description: "Comisión por envío de dinero",
            quantity: shipment.money_amount,
            unit: "USD enviados",
            unit_price: shipment.money_commission_rate,
            subtotal: shipment.money_commission,
            discount_amount: shipment.money_discount,
            total: shipment.money_total,
          },
        ]
      : []),
  ];

  const rows = items.length ? items : fallbackItems;

  return (
    <>
      <style jsx global>{`
        @page {
          size: Letter;
          margin: 8mm;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          .invoice-document,
          .invoice-document * {
            visibility: visible !important;
          }

          .invoice-document {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .invoice-no-print {
            display: none !important;
          }

          .invoice-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .invoice-table-row {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <main className="min-h-screen bg-slate-100 p-4 py-7 print:min-h-0 print:bg-white print:p-0">
        <div className="mx-auto max-w-[900px]">
          <div className="invoice-no-print mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/shipping"
              className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black text-[#061b3a]"
            >
              <ArrowLeft size={18} />
              Volver a envíos
            </Link>

            <div className="flex flex-wrap gap-3">
              <InvoiceActions shipment={shipment} />
              <PrintInvoiceButton />
            </div>
          </div>

          <article className="invoice-document overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-xl">
            <header className="bg-[#061b3a] px-7 py-6 text-white">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200">
                    Factura de servicios
                  </p>

                  <h1 className="mt-2 text-2xl font-black tracking-tight">
                    Águila Cuba Express
                  </h1>

                  <p className="mt-1 text-sm font-semibold text-blue-100">
                    Gestión profesional de envíos y remesas
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-5 py-4 text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
                    Código de rastreo
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {shipment.tracking_code || shipment.id}
                  </p>

                  <p className="mt-2 text-xs font-semibold text-blue-100">
                    Emitida: {formatDate(shipment.created_at)}
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 md:p-7">
              <section className="invoice-avoid-break grid gap-4 md:grid-cols-3">
                <SummaryCard
                  icon={<Hash size={17} />}
                  label="Rastreo"
                  value={shipment.tracking_code || shipment.id}
                />

                <SummaryCard
                  icon={<ClipboardCheck size={17} />}
                  label="Estado"
                  value={getShippingStatusLabel(shipment.status)}
                />

                <SummaryCard
                  icon={<CalendarDays size={17} />}
                  label="Fecha"
                  value={formatDate(
                    shipment.created_date || shipment.created_at
                  )}
                />
              </section>

              <section className="invoice-avoid-break mt-5 grid gap-4 md:grid-cols-2">
                <PartyCard
                  title="Datos del remitente"
                  icon={<UserRound size={20} />}
                  name={shipment.sender_name || "Sin especificar"}
                  phone={shipment.sender_phone || "Sin teléfono"}
                />

                <PartyCard
                  title="Datos del destinatario"
                  icon={<Truck size={20} />}
                  name={shipment.recipient_name || "Sin especificar"}
                  phone={shipment.recipient_phone || "Sin teléfono"}
                  address={shipment.recipient_address || "Sin dirección"}
                  destination={shipment.location}
                />
              </section>

              <section className="invoice-avoid-break mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MiniInfo
                    icon={<MapPin size={17} />}
                    label="Destino operativo"
                    value={shipment.location}
                  />

                  <MiniInfo
                    icon={<Package size={17} />}
                    label="Tipo de operación"
                    value={
                      shipment.contains_package && shipment.contains_money
                        ? "Paquete + dinero"
                        : shipment.contains_money
                          ? "Envío de dinero"
                          : shipment.service_type_name || "Paquete"
                    }
                  />

                  <MiniInfo
                    icon={<Truck size={17} />}
                    label="Repartidor"
                    value={
                      shipment.assigned_driver_name || "Sin asignar"
                    }
                  />

                  <MiniInfo
                    icon={<CircleDollarSign size={17} />}
                    label="Forma de pago"
                    value={
                      shipment.payment_method
                        ? paymentMethodLabel(shipment.payment_method)
                        : "Sin especificar"
                    }
                  />
                </div>
              </section>

              <section className="mt-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                      Detalle comercial
                    </p>
                    <h2 className="mt-1 text-xl font-black text-[#061b3a]">
                      Desglose de servicios
                    </h2>
                  </div>

                  <p className="text-xs font-semibold text-slate-400">
                    Moneda: USD
                  </p>
                </div>

                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
                  <div className="hidden grid-cols-[1fr_105px_110px_115px] bg-slate-100 px-5 py-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 md:grid">
                    <span>Concepto</span>
                    <span className="text-right">Cantidad</span>
                    <span className="text-right">Precio</span>
                    <span className="text-right">Importe</span>
                  </div>

                  {rows.map((item: any) => (
                    <InvoiceRow
                      key={item.id}
                      item={item}
                      moneyDiscount={shipment.money_discount}
                    />
                  ))}
                </div>
              </section>

              <section className="invoice-avoid-break mt-5 grid items-start gap-5 md:grid-cols-[1fr_330px]">
                <div className="rounded-3xl border border-slate-200 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Observaciones
                  </p>

                  <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
                    {shipment.notes?.trim() ||
                      "Sin observaciones adicionales para esta operación."}
                  </p>

                  {shipment.discount_reason && (
                    <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                      Motivo del descuento: {shipment.discount_reason}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200">
                  <div className="bg-slate-100 px-5 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Resumen de cobro
                    </p>
                  </div>

                  <div className="space-y-3 p-5">
                    <TotalRow
                      label="Subtotal paquete"
                      value={currency(shipment.weight_subtotal)}
                      hidden={!shipment.contains_package}
                    />

                    <TotalRow
                      label="Comisión por dinero"
                      value={currency(shipment.money_commission)}
                      hidden={!shipment.contains_money}
                    />

                    <TotalRow
                      label="Descuento en comisión"
                      value={`-${currency(shipment.money_discount)}`}
                      hidden={shipment.money_discount <= 0}
                      positive
                    />

                    <TotalRow
                      label="Fees adicionales"
                      value={currency(shipment.extra_fees_total)}
                      hidden={shipment.extra_fees_total <= 0}
                    />

                    <TotalRow
                      label="Descuento general"
                      value={`-${currency(shipment.discount_amount)}`}
                      hidden={shipment.discount_amount <= 0}
                      positive
                    />

                    <div className="border-t border-dashed pt-3">
                      <TotalRow
                        label="Total de la factura"
                        value={currency(shipment.service_price)}
                        strong
                      />
                    </div>

                    <TotalRow
                      label="Monto pagado"
                      value={currency(shipment.amount_paid)}
                    />

                    <div className="rounded-2xl bg-[#061b3a] px-4 py-3 text-white">
                      <TotalRow
                        label="Saldo pendiente"
                        value={currency(shipment.balance_due)}
                        strong
                        inverse
                      />
                    </div>
                  </div>
                </div>
              </section>

              <footer className="invoice-avoid-break mt-6 border-t border-slate-200 pt-4">
                <div className="flex flex-col justify-between gap-3 text-xs font-semibold text-slate-500 sm:flex-row">
                  <div>
                    <p className="font-black text-[#061b3a]">
                      Gracias por confiar en Águila Cuba Express.
                    </p>
                    <p className="mt-1">
                      Conserve esta factura y el código de rastreo para
                      cualquier consulta.
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p>
                      Rastreo:
                      <span className="ml-1 font-black text-[#061b3a]">
                        {shipment.tracking_code || shipment.id}
                      </span>
                    </p>

                    <p className="mt-1">
                      www.aguilacubaexpress.com
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-blue-700">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>

      <p className="mt-2 truncate text-sm font-black text-[#061b3a]">
        {value}
      </p>
    </div>
  );
}

function PartyCard({
  title,
  icon,
  name,
  phone,
  address,
  destination,
}: {
  title: string;
  icon: React.ReactNode;
  name: string;
  phone: string;
  address?: string;
  destination?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>

          <p className="mt-0.5 text-base font-black text-[#061b3a]">
            {name}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
        <p className="flex items-center gap-2">
          <Phone size={15} className="text-blue-700" />
          {phone}
        </p>

        {address && (
          <p className="flex items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-blue-700" />
            <span>{address}</span>
          </p>
        )}

        {destination && (
          <p className="flex items-center gap-2">
            <Truck size={15} className="text-blue-700" />
            {destination}
          </p>
        )}
      </div>
    </div>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-blue-700">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>

      <p className="mt-1 truncate text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function InvoiceRow({
  item,
  moneyDiscount,
}: {
  item: any;
  moneyDiscount: number;
}) {
  const isMoney = item.item_type === "MONEY";
  const isDiscount = item.item_type === "DISCOUNT";

  return (
    <div className="invoice-table-row grid gap-2 border-t border-slate-200 px-5 py-4 first:border-t-0 md:grid-cols-[1fr_105px_110px_115px]">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            isMoney
              ? "bg-emerald-50 text-emerald-700"
              : isDiscount
                ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700"
          }`}
        >
          {isMoney ? (
            <WalletCards size={17} />
          ) : (
            <Package size={17} />
          )}
        </div>

        <div>
          <p className="font-black text-slate-900">
            {item.description}
          </p>

          {isMoney && moneyDiscount > 0 && (
            <p className="mt-1 text-xs font-bold text-emerald-700">
              Descuento aplicado a la comisión: -
              {currency(moneyDiscount)}
            </p>
          )}
        </div>
      </div>

      <p className="text-right text-sm font-bold text-slate-600">
        {Number(item.quantity || 0).toFixed(2)} {item.unit || ""}
      </p>

      <p className="text-right text-sm font-bold text-slate-600">
        {isMoney
          ? `${Number(item.unit_price || 0).toFixed(2)}%`
          : currency(item.unit_price)}
      </p>

      <p
        className={`text-right font-black ${
          Number(item.total || 0) < 0
            ? "text-emerald-700"
            : "text-slate-900"
        }`}
      >
        {currency(item.total)}
      </p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
  hidden = false,
  positive = false,
  inverse = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  hidden?: boolean;
  positive?: boolean;
  inverse?: boolean;
}) {
  if (hidden) return null;

  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong
          ? inverse
            ? "text-base font-black text-white"
            : "text-base font-black text-[#061b3a]"
          : "text-sm font-bold text-slate-600"
      }`}
    >
      <span>{label}</span>

      <span
        className={
          positive
            ? "text-emerald-700"
            : inverse
              ? "text-white"
              : ""
        }
      >
        {value}
      </span>
    </div>
  );
}

function paymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Efectivo",
    zelle: "Zelle",
    card: "Tarjeta",
    transfer: "Transferencia",
    other: "Otro",
  };

  return labels[method] || method;
}
