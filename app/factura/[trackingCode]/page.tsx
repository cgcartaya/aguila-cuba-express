"use client";

import { use, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Hash,
  Loader2,
  MapPin,
  Package,
  Phone,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";

import PublicInvoiceButtons from "@/components/public/invoice/PublicInvoiceButtons";
import {
  getPublicShippingInvoice,
  type PublicShippingInvoice,
} from "@/lib/services/public-shipping-invoice";

function currency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string | number | Date | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value);
  } else {
    const cleanValue = String(value).trim();

    // Compatibilidad con fechas guardadas como DD/MM/YYYY o DD-MM-YYYY.
    const dayFirstMatch = cleanValue.match(
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s.*)?$/
    );

    if (dayFirstMatch) {
      const [, day, month, year] = dayFirstMatch;
      date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );
    } else {
      date = new Date(cleanValue);
    }
  }

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    received_miami: "Recibido en Miami",
    preparing: "Preparando salida",
    in_transit: "En tránsito hacia Cuba",
    received_cuba: "Recibido en Cuba",
    out_for_delivery: "En reparto",
    delivered: "Entregado",
    issue: "Incidencia",
  };

  return labels[status || ""] || status || "Sin especificar";
}

export default function PublicInvoicePage({
  params,
}: {
  params: Promise<{ trackingCode: string }>;
}) {
  const { trackingCode } = use(params);

  const [invoice, setInvoice] =
    useState<PublicShippingInvoice | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadInvoice() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } =
        await getPublicShippingInvoice(trackingCode);

      if (error || !data?.shipment) {
        setInvoice(null);
        setErrorMessage(
          "La factura no está disponible o el código no es válido."
        );
      } else {
        setInvoice(data);
      }

      setLoading(false);
    }

    void loadInvoice();
  }, [trackingCode]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="text-center font-semibold text-slate-500">
          <Loader2 className="mx-auto mb-3 animate-spin" />
          Preparando factura...
        </div>
      </main>
    );
  }

  if (!invoice?.shipment || errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-950">
            Factura no disponible
          </h1>

          <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
            {errorMessage}
          </p>
        </div>
      </main>
    );
  }

  const shipment = invoice.shipment;
  const rows = invoice.items || [];

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
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }

          .invoice-no-print {
            display: none !important;
          }

          main {
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .invoice-document {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .invoice-document,
          .invoice-document * {
            visibility: visible !important;
          }

          .invoice-avoid-break,
          .invoice-table-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-slate-100 p-4 py-7 print:min-h-0 print:bg-white print:p-0">
        <div className="mx-auto max-w-[900px]">
          <div className="invoice-no-print mb-5 flex flex-col justify-between gap-4 rounded-3xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
                Factura disponible
              </p>

              <h1 className="mt-1 text-xl font-extrabold text-slate-950">
                {shipment.tracking_code}
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Puede descargarla como PDF o imprimirla.
              </p>
            </div>

            <PublicInvoiceButtons />
          </div>

          <article className="invoice-document overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-xl">
            <header className="bg-slate-950 px-7 py-6 text-white">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-blue-200">
                    Factura de servicios
                  </p>

                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
                    Águila Cuba Express
                  </h2>

                  <p className="mt-1 text-sm font-medium text-blue-100">
                    Gestión profesional de envíos y remesas
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-5 py-4 text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-200">
                    Código de rastreo
                  </p>

                  <p className="mt-1 text-xl font-extrabold">
                    {shipment.tracking_code}
                  </p>

                  <p className="mt-2 text-xs font-medium text-blue-100">
                    Emitida: {formatDate(shipment.created_at)}
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 md:p-7">
              <section className="invoice-avoid-break grid gap-4 md:grid-cols-3">
                <Summary
                  icon={<Hash size={17} />}
                  label="Rastreo"
                  value={shipment.tracking_code}
                />

                <Summary
                  icon={<CheckCircle2 size={17} />}
                  label="Estado"
                  value={statusLabel(shipment.status)}
                />

                <Summary
                  icon={<CalendarDays size={17} />}
                  label="Fecha"
                  value={formatDate(
                    shipment.created_date || shipment.created_at
                  )}
                />
              </section>

              <section className="invoice-avoid-break mt-5 grid gap-4 md:grid-cols-2">
                <Party
                  title="Datos del remitente"
                  icon={<UserRound size={20} />}
                  name={shipment.sender_name || "Sin especificar"}
                  phone={shipment.sender_phone || "Sin teléfono"}
                />

                <Party
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
                    label="Destino"
                    value={shipment.location}
                  />

                  <MiniInfo
                    icon={<Package size={17} />}
                    label="Operación"
                    value={
                      shipment.contains_package &&
                      shipment.contains_money
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
                    value={shipment.payment_method || "Sin especificar"}
                  />
                </div>
              </section>

              <section className="mt-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">
                      Detalle comercial
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                      Desglose de servicios
                    </h2>
                  </div>

                  <p className="text-xs font-medium text-slate-400">
                    Moneda: USD
                  </p>
                </div>

                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
                  {rows.map((item: any) => (
                    <div
                      key={item.id}
                      className="invoice-table-row grid gap-2 border-t border-slate-200 px-5 py-4 first:border-t-0 md:grid-cols-[1fr_110px_110px_115px]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            item.item_type === "MONEY"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {item.item_type === "MONEY" ? (
                            <WalletCards size={17} />
                          ) : (
                            <Package size={17} />
                          )}
                        </div>

                        <div>
                          <p className="font-extrabold text-slate-900">
                            {item.description}
                          </p>

                          {item.discount_amount > 0 && (
                            <p className="mt-1 text-xs font-semibold text-emerald-700">
                              Descuento: -
                              {currency(item.discount_amount)}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="text-right text-sm font-semibold text-slate-600">
                        {Number(item.quantity || 0).toFixed(2)}{" "}
                        {item.unit || ""}
                      </p>

                      <p className="text-right text-sm font-semibold text-slate-600">
                        {item.item_type === "MONEY"
                          ? `${Number(item.unit_price || 0).toFixed(2)}%`
                          : currency(item.unit_price)}
                      </p>

                      <p className="text-right font-extrabold text-slate-900">
                        {currency(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="invoice-avoid-break mt-5 grid items-start gap-5 md:grid-cols-[1fr_330px]">
                <div className="rounded-3xl border border-slate-200 p-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                    Observaciones
                  </p>

                  <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-600">
                    {shipment.notes?.trim() ||
                      "Sin observaciones adicionales."}
                  </p>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200">
                  <div className="bg-slate-100 px-5 py-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Resumen de cobro
                    </p>
                  </div>

                  <div className="space-y-3 p-5">
                    {shipment.extra_fees_total > 0 && (
                      <Total
                        label="Fees adicionales"
                        value={currency(shipment.extra_fees_total)}
                      />
                    )}

                    {shipment.discount_amount > 0 && (
                      <Total
                        label="Descuento general"
                        value={`-${currency(
                          shipment.discount_amount
                        )}`}
                        positive
                      />
                    )}

                    <div className="border-t border-dashed pt-3">
                      <Total
                        label="Total de la factura"
                        value={currency(shipment.service_price)}
                        strong
                      />
                    </div>

                    <Total
                      label="Monto pagado"
                      value={currency(shipment.amount_paid)}
                    />

                    <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                      <Total
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
                <div className="flex flex-col justify-between gap-3 text-xs font-medium text-slate-500 sm:flex-row">
                  <div>
                    <p className="font-extrabold text-slate-950">
                      Gracias por confiar en Águila Cuba Express.
                    </p>

                    <p className="mt-1">
                      Conserve esta factura y su código de rastreo.
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="font-extrabold text-slate-950">
                      {shipment.tracking_code}
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

function Summary({
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
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>

      <p className="mt-2 truncate text-sm font-extrabold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Party({
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
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
            {title}
          </p>

          <p className="mt-0.5 text-base font-extrabold text-slate-950">
            {name}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm font-medium text-slate-600">
        <p className="flex items-center gap-2">
          <Phone size={15} className="text-blue-700" />
          {phone}
        </p>

        {address && (
          <p className="flex items-start gap-2">
            <MapPin
              size={15}
              className="mt-0.5 shrink-0 text-blue-700"
            />
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

        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em]">
          {label}
        </p>
      </div>

      <p className="mt-1 truncate text-sm font-extrabold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function Total({
  label,
  value,
  strong = false,
  positive = false,
  inverse = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  positive?: boolean;
  inverse?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong
          ? inverse
            ? "text-base font-extrabold text-white"
            : "text-base font-extrabold text-slate-950"
          : "text-sm font-semibold text-slate-600"
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
