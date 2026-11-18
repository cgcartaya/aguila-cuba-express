import { z } from "zod";

export const money = (value: number | string) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dateText = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("es-US", {
    timeZone: "UTC",
  });
export interface Invoice {
  id: string;
  store_id: string;
  number: string | null;
  status: "draft" | "pending" | "paid" | "void";
  issued_on: string;
  due_on: string;
  period: string;
  client_name: string;
  store_name: string;
  phone: string;
  email: string;
  issuer: {
    name: string;
    address?: string;
    tax_id?: string;
    email?: string;
    phone?: string;
  };
  description: string;
  subtotal: number;
  billing_month?: string | null;
  subscription_amount?: number | null;
  order_commission?: number | null;
  shipping_commission?: number | null;
  discount: number;
  adjustment: number;
  tax: number;
  total: number;
  paid: number;
}
export type BillingQuote = {
  subscription: number;
  orders: number;
  shipping: number;
  subtotal: number;
  revision: string;
};
export const invoicePeriodLabel = (i: Invoice) =>
  i.billing_month
    ? new Intl.DateTimeFormat("es-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${i.billing_month}T12:00:00Z`))
    : i.period;
export const invoiceLineItems = (i: Invoice) =>
  (
    [
      ["Suscripción mensual", Number(i.subscription_amount ?? 0)],
      ["Comisión de pedidos", Number(i.order_commission ?? 0)],
      ["Comisión de envíos", Number(i.shipping_commission ?? 0)],
    ] as const
  ).filter(([, amount]) => amount > 0);
export const balance = (i: Invoice) =>
  Math.round((Number(i.total) - Number(i.paid)) * 100) / 100;
export function invoiceState(i: Invoice, now = today()) {
  return i.status === "pending" && i.due_on < now ? "overdue" : i.status;
}
export const statusText: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  paid: "Pagada",
  overdue: "Vencida",
  void: "Anulada",
};
export function whatsappMessage(i: Invoice, url: string) {
  const overdue = invoiceState(i) === "overdue";
  return `Hola, ${i.client_name || i.store_name}. 👋\n\nEsperamos que se encuentre muy bien.\n\n${overdue ? "Le recordamos respetuosamente que tiene un saldo pendiente de la factura de" : "Le compartimos la factura de"} *Perla Marketplace* de su negocio *${i.store_name}*, correspondiente a *${invoicePeriodLabel(i)}*.\n\n💳 Total: ${money(i.total)} USD\n💳 Saldo pendiente: ${money(balance(i))} USD\n📅 ${overdue ? "Vencimiento original" : "Fecha de vencimiento"}: ${dateText(i.due_on)}\n\n📄 Puede descargar su factura aquí (enlace válido por 30 días):\n${url}\n\nLe agradecemos su confianza y preferencia. Seguimos a su disposición para cualquier consulta.\n\n¡Muchas gracias!\n*Equipo Perla Marketplace*`;
}
export function whatsappPhone(value: string) {
  if (!/^\+[1-9][\d\s()-]{6,22}$/.test(value.trim()))
    throw new Error(
      "Escribe el WhatsApp con prefijo internacional, por ejemplo +13055551234.",
    );
  const phone = value.replace(/\D/g, "");
  if (phone.length < 7 || phone.length > 15)
    throw new Error("Número internacional no válido.");
  return phone;
}
const amount = z
  .number()
  .finite()
  .min(0)
  .max(1000000)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
    "Usa como máximo dos decimales",
  );
const signedAmount = z
  .number()
  .finite()
  .min(-1000000)
  .max(1000000)
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001);
const date = z.iso.date();
const uuid = z.uuid();
const invoiceId = { invoice_id: uuid };
export const commandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    store_id: uuid,
    request_id: uuid,
    draft: z.boolean(),
    issued_on: date,
    due_on: date,
    billing_month: z.iso.date().refine((value) => value.endsWith("-01")),
    quote_revision: z.string().regex(/^[a-f0-9]{32}$/),
    client_name: z.string().trim().min(1).max(200),
    phone: z.string().max(40),
    email: z.union([z.email(), z.literal("")]),
    description: z.string().trim().min(1).max(500),
    discount: amount,
    adjustment: signedAmount,
    tax: amount,
  }),
  z.object({ action: z.enum(["issue", "revoke", "opened"]), ...invoiceId }),
  z.object({
    action: z.literal("share"),
    ...invoiceId,
    phone: z.string().max(40),
  }),
  z.object({
    action: z.literal("void"),
    ...invoiceId,
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("pay"),
    ...invoiceId,
    request_id: uuid,
    paid_on: date,
    amount: amount.refine((n) => n > 0),
    method: z.enum(["Zelle", "Transferencia", "Efectivo", "Otro"]),
    reference: z.string().max(200),
    notes: z.string().max(1000),
  }),
  z.object({
    action: z.enum(["suspend", "reactivate", "restore"]),
    store_id: uuid,
  }),
  z.object({
    action: z.literal("archive"),
    store_id: uuid,
    confirmation: z.string().max(200),
  }),
  z.object({
    action: z.literal("settings"),
    issuer: z.object({
      name: z.string().trim().min(1).max(150),
      address: z.string().max(300),
      tax_id: z.string().max(80),
      email: z.union([z.email(), z.literal("")]),
      phone: z.string().max(40),
    }),
  }),
]);
