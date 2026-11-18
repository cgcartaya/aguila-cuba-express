"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Plus,
  Receipt,
  Settings,
  Download,
  Send,
  Check,
} from "lucide-react";
import type { Store } from "@/lib/saas/store-types";
import {
  money,
  today,
  balance,
  invoiceState,
  statusText,
  whatsappPhone,
  invoiceLineItems,
  invoicePeriodLabel,
  type BillingQuote,
  type Invoice,
} from "@/lib/saas-billing/model";
import {
  billingCommand,
  billingRequest,
  openInvoicePdf,
} from "@/lib/saas-billing/client";
import BillingDialog from "./BillingDialog";
import type { Lifecycle } from "./StoreManagement";
const input =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-indigo-400";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";
const primary = `${button.replace("bg-white", "bg-[#0B1F4D]")} border-transparent text-white`;
type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  paid_on: string;
  method: string;
  reference: string;
  notes: string;
};
type Event = {
  id: number;
  kind: string;
  created_at: string;
  detail: Record<string, unknown>;
};
type View =
  | { kind: "create" }
  | { kind: "settings" }
  | { kind: "invoice"; invoice: Invoice }
  | { kind: "pay"; invoice: Invoice }
  | { kind: "void"; invoice: Invoice }
  | {
      kind: "share";
      invoice: Invoice;
      message: string;
      phone: string;
      link: string;
    };
export function invoiceTotals(
  invoices: Invoice[],
  month = today().slice(0, 7),
  storeId = "",
  payments: Pick<Payment, "paid_on" | "invoice_id" | "amount">[] = [],
) {
  const valid = invoices.filter(
    (i) =>
      (!storeId || i.store_id === storeId) &&
      (i.status === "pending" || i.status === "paid"),
  );
  const invoiceIds = new Set(valid.map((invoice) => invoice.id));
  return {
    collected: payments
      .filter(
        (payment) =>
          payment.paid_on.startsWith(month) &&
          invoiceIds.has(payment.invoice_id),
      )
      .reduce((sum, payment) => sum + Number(payment.amount), 0),
    billed: valid
      .filter((i) => i.issued_on.startsWith(month))
      .reduce((s, i) => s + Number(i.total), 0),
    pending: valid.reduce((s, i) => s + balance(i), 0),
    overdue: valid
      .filter((i) => invoiceState(i) === "overdue")
      .reduce((s, i) => s + balance(i), 0),
  };
}
export default function SubscriptionBilling() {
  const router = useRouter();
  const params = useSearchParams();
  const storeId = params.get("store") || "";
  const openNew = params.get("new") === "1";
  const [stores, setStores] = useState<Store[]>([]),
    [invoices, setInvoices] = useState<Invoice[]>([]),
    [lifecycle, setLifecycle] = useState<Lifecycle[]>([]),
    [issuer, setIssuer] = useState<Invoice["issuer"]>({
      name: "Perla Marketplace",
    });
  const [payments, setPayments] = useState<Payment[]>([]),
    [events, setEvents] = useState<Event[]>([]),
    [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [view, setView] = useState<View | null>(null),
    [status, setStatus] = useState("all"),
    [period, setPeriod] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loaded, setLoaded] = useState(false),
    [createStore, setCreateStore] = useState("");
  const [billingMonth, setBillingMonth] = useState(() => today().slice(0, 7));
  const [quote, setQuote] = useState<{
    key: string;
    data?: BillingQuote;
    error?: string;
  } | null>(null);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const quoteKey = `${createStore}/${billingMonth}/${quoteAttempt}`;
  const currentQuote = quote?.key === quoteKey ? quote : null;
  const pricing = currentQuote?.data;
  const [draftAmounts, setDraftAmounts] = useState({
    discount: 0,
    adjustment: 0,
    tax: 0,
  });
  const requestId = useRef("");
  const previousStore = useRef(storeId);
  useEffect(() => {
    if (previousStore.current === storeId) return;
    previousStore.current = storeId;
    setView(null);
    setNotice("");
    setError("");
  }, [storeId]);

  async function load(invoice?: string) {
    const data = await (
      await billingRequest(invoice ? `?invoice=${invoice}` : "")
    ).json();
    setStores(data.stores);
    setInvoices(data.invoices);
    setLifecycle(data.lifecycle);
    setIssuer(data.issuer);
    setAllPayments(data.allPayments || []);
    if (invoice) {
      setPayments(data.payments);
      setEvents(data.events);
    }
    setLoaded(true);
    return data;
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!loaded || !openNew) return;
    const valid =
      stores.some((store) => store.id === storeId) &&
      !lifecycle.some(
        (row) => row.store_id === storeId && row.state === "archived",
      );
    if (valid) {
      requestId.current = crypto.randomUUID();
      setCreateStore(storeId);
      setBillingMonth(today().slice(0, 7));
      setDraftAmounts({ discount: 0, adjustment: 0, tax: 0 });
      setQuoteAttempt((attempt) => attempt + 1);
      setView({ kind: "create" });
    }
    router.replace(
      valid ? `?store=${encodeURIComponent(storeId)}` : "/admin/stores/billing",
      { scroll: false },
    );
  }, [loaded, openNew, stores, lifecycle, storeId, router]);

  const creating = view?.kind === "create";
  useEffect(() => {
    if (!creating || !createStore || !billingMonth) return;
    let cancelled = false;
    const query = new URLSearchParams({
      quote: "1",
      store: createStore,
      month: `${billingMonth}-01`,
    });
    billingRequest(`?${query}`)
      .then((response) => response.json())
      .then((data: BillingQuote) => {
        if (!cancelled) setQuote({ key: quoteKey, data });
      })
      .catch((err: Error) => {
        if (!cancelled) setQuote({ key: quoteKey, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [creating, createStore, billingMonth, quoteKey]);

  async function act(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const current = stores.filter(
    (s) =>
      !lifecycle.some((l) => l.store_id === s.id && l.state === "archived"),
  );
  const month = today().slice(0, 7);
  const clientInvoices = storeId
    ? invoices.filter((i) => i.store_id === storeId)
    : invoices;
  const totals = invoiceTotals(invoices, month, storeId, allPayments);
  const visible = clientInvoices
    .filter(
      (i) =>
        (status === "all" || invoiceState(i) === status) &&
        (!period ||
          `${invoicePeriodLabel(i)} ${invoicePeriodLabel(i)}`
            .toLowerCase()
            .includes(period.toLowerCase())) &&
        (!from || i.issued_on >= from) &&
        (!to || i.issued_on <= to) &&
        (!search ||
          `${i.number} ${i.store_name} ${i.client_name}`
            .toLowerCase()
            .includes(search.toLowerCase())),
    )
    .sort((a, b) => b.issued_on.localeCompare(a.issued_on));
  function newInvoice() {
    requestId.current = crypto.randomUUID();
    const id = storeId || current[0]?.id || "";
    if (!current.some((store) => store.id === id)) return;
    setCreateStore(id);
    setBillingMonth(today().slice(0, 7));
    setQuoteAttempt((attempt) => attempt + 1);
    setDraftAmounts({ discount: 0, adjustment: 0, tax: 0 });
    setError("");
    setView({ kind: "create" });
  }
  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pricing || pricing.subtotal <= 0) return;
    const f = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    f.set("save", submitter?.value || "issue");
    await act(async () => {
      const text = (key: string) => String(f.get(key) || "");
      const result = await billingCommand({
        action: "create",
        store_id: createStore,
        request_id: requestId.current,
        draft: text("save") === "draft",
        issued_on: text("issued_on"),
        due_on: text("due_on"),
        billing_month: `${billingMonth}-01`,
        quote_revision: pricing.revision,
        client_name: text("client_name"),
        phone: text("phone"),
        email: text("email"),
        description: text("description"),
        ...draftAmounts,
      });
      await load(result.invoice.id);
      setView({ kind: "invoice", invoice: result.invoice });
      setNotice(
        result.invoice.status === "draft"
          ? "Borrador guardado."
          : "Factura emitida.",
      );
    });
  }
  async function detail(i: Invoice) {
    await act(async () => {
      await load(i.id);
      setView({ kind: "invoice", invoice: i });
    });
  }
  async function share(i: Invoice) {
    setError("");
    setView({
      kind: "share",
      invoice: i,
      message: "",
      phone: i.phone,
      link: "",
    });
  }
  async function pay(event: FormEvent<HTMLFormElement>, i: Invoice) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    await act(async () => {
      const result = await billingCommand({
        action: "pay",
        invoice_id: i.id,
        request_id: requestId.current,
        amount: Number(f.get("amount")),
        paid_on: String(f.get("paid_on")),
        method: String(f.get("method")),
        reference: String(f.get("reference") || ""),
        notes: String(f.get("notes") || ""),
      });
      await load(i.id);
      setView({ kind: "invoice", invoice: result.invoice });
      setNotice(
        "Pago registrado. No se modifica la activación ni el próximo vencimiento de la tienda.",
      );
    });
  }
  function badge(i: Invoice) {
    const state = invoiceState(i);
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${state === "paid" ? "bg-emerald-50 text-emerald-700" : state === "overdue" ? "bg-red-50 text-red-600" : state === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}
      >
        {statusText[state]}
      </span>
    );
  }
  function invoiceActions(i: Invoice) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          className={button}
          onClick={() =>
            void act(async () => {
              await openInvoicePdf(i.id);
            })
          }
        >
          <Download size={15} />
          PDF
        </button>
        {!["draft", "void"].includes(i.status) && (
          <>
            <button
              disabled={busy}
              className={button}
              onClick={() => void share(i)}
            >
              <Send size={15} />
              {invoiceState(i) === "overdue" ? "Recordar pago" : "WhatsApp"}
            </button>
            <button
              disabled={busy}
              className={button}
              onClick={() =>
                void act(async () => {
                  await billingCommand({ action: "revoke", invoice_id: i.id });
                  setNotice(
                    "Todos los enlaces de esta factura fueron revocados.",
                  );
                })
              }
            >
              Revocar enlaces
            </button>
          </>
        )}
        {i.status === "pending" && (
          <button
            disabled={busy}
            className={primary}
            onClick={() => {
              requestId.current = crypto.randomUUID();
              setError("");
              setView({ kind: "pay", invoice: i });
            }}
          >
            <Check size={15} />
            Registrar pago
          </button>
        )}
        {i.status === "draft" && (
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const result = await billingCommand({
                  action: "issue",
                  invoice_id: i.id,
                });
                await load(i.id);
                setView({ kind: "invoice", invoice: result.invoice });
              })
            }
          >
            Emitir borrador
          </button>
        )}
        {i.status !== "draft" &&
          i.status !== "void" &&
          Number(i.paid) === 0 && (
            <button
              disabled={busy}
              className={`${button} text-red-600`}
              onClick={() => setView({ kind: "void", invoice: i })}
            >
              Anular
            </button>
          )}
      </div>
    );
  }
  const selectedStore = stores.find((s) => s.id === createStore);
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-7 text-slate-700 md:px-8">
      <div className="mx-auto max-w-[1450px] space-y-6">
        <Link
          href="/admin/stores"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft size={16} />
          Gestión de tiendas
        </Link>
        {stores.some((store) => store.id === storeId) && (
          <Link
            href={`/admin/stores/${storeId}/edit?section=billing`}
            className="ml-4 text-sm font-semibold text-indigo-700 hover:underline"
          >
            Ficha del cliente
          </Link>
        )}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
              Cuentas de clientes
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#0B1F4D]">
              Facturación SaaS
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Facturas de suscripción y comisiones de Perla Marketplace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              onClick={() => setView({ kind: "settings" })}
            >
              <Settings size={16} />
              Datos del emisor
            </button>
            <button
              className={primary}
              disabled={
                busy ||
                !current.length ||
                Boolean(
                  storeId && !current.some((store) => store.id === storeId),
                )
              }
              onClick={newInvoice}
            >
              <Plus size={16} />
              Emitir factura
            </button>
          </div>
        </header>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {notice}
          </p>
        )}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            [
              "Mensual contratado",
              money(
                current
                  .filter((i) => !storeId || i.id === storeId)
                  .reduce((s, i) => s + Number(i.monthly_price || 0), 0),
              ),
              "Configuración de las tiendas",
            ],
            ["Facturado este mes", money(totals.billed), month],
            [
              "Cobrado este mes",
              money(totals.collected),
              "Por fecha real del pago",
            ],
            ["Saldo pendiente", money(totals.pending), "Todos los períodos"],
            [
              "Saldo vencido",
              money(totals.overdue),
              "Incluido en el pendiente",
            ],
          ].map(([label, value, note]) => (
            <article
              key={label}
              className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className="mt-3 text-2xl font-extrabold text-[#0B1F4D]">
                {loaded &&
                (!storeId || stores.some((store) => store.id === storeId))
                  ? value
                  : "—"}
              </p>
              <p className="mt-2 text-xs text-slate-400">{note}</p>
            </article>
          ))}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold">
              Cliente
              <select
                className={input}
                value={storeId}
                onChange={(e) => {
                  setView(null);
                  setError("");
                  setNotice("");
                  const id = e.target.value;
                  router.push(
                    id
                      ? `?store=${encodeURIComponent(id)}`
                      : "/admin/stores/billing",
                    { scroll: false },
                  );
                }}
              >
                <option value="">Todos los clientes</option>
                {storeId &&
                  loaded &&
                  !stores.some((store) => store.id === storeId) && (
                    <option value={storeId} disabled>
                      Cliente no disponible
                    </option>
                  )}
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Estado
              <select
                className={input}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Todos</option>
                {Object.entries(statusText).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Período
              <input
                className={input}
                placeholder="Ej. Noviembre 2026"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold">
              Emisión desde
              <input
                type="date"
                className={input}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold">
              Emisión hasta
              <input
                type="date"
                className={input}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold">
              Buscar factura
              <input
                className={input}
                placeholder="Número o cliente"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="hidden lg:block">
            <table className="w-full table-fixed text-left text-sm [overflow-wrap:anywhere]">
              <thead className="border-y border-slate-100 bg-slate-50 text-xs text-slate-400">
                <tr>
                  {[
                    "Factura / Cliente",
                    "Período",
                    "Emisión / Vencimiento",
                    "Importe / Saldo",
                    "Estado",
                    "",
                  ].map((h, n) => (
                    <th key={n} className="p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((i) => (
                  <tr key={i.id}>
                    <td className="p-3">
                      <p className="font-bold">{i.number || "Borrador"}</p>
                      <p className="text-xs text-slate-400">{i.store_name}</p>
                    </td>
                    <td className="p-3">{invoicePeriodLabel(i)}</td>
                    <td className="p-3 text-xs">
                      {i.issued_on}
                      <p className="mt-1 text-slate-400">{i.due_on}</p>
                    </td>
                    <td className="p-3 font-semibold">
                      {money(i.total)}
                      <p className="text-xs text-slate-400">
                        Saldo {money(balance(i))}
                      </p>
                    </td>
                    <td>{badge(i)}</td>
                    <td>
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() => void detail(i)}
                      >
                        Ver factura
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:hidden">
            {visible.map((i) => (
              <article
                key={i.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <b>{i.number || "Borrador"}</b>
                  {badge(i)}
                </div>
                <p className="mt-2 text-sm">
                  {i.store_name} · {invoicePeriodLabel(i)}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Emisión {i.issued_on} · Vence {i.due_on}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <b>{money(i.total)}</b>
                    <p className="text-xs text-slate-400">
                      Saldo {money(balance(i))}
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() => void detail(i)}
                  >
                    Ver factura
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="py-16 text-center text-slate-400">
              <Receipt className="mx-auto mb-3" />
              <p className="text-sm">
                {loaded
                  ? "No hay facturas con estos filtros."
                  : "Cargando facturación..."}
              </p>
            </div>
          )}
        </section>
      </div>
      {view && (
        <BillingDialog
          title={
            view.kind === "create"
              ? "Nueva factura de suscripción"
              : view.kind === "settings"
                ? "Datos del emisor"
                : view.kind === "share"
                  ? "Preparar WhatsApp"
                  : view.kind === "pay"
                    ? "Registrar pago"
                    : view.kind === "void"
                      ? "Anular factura"
                      : view.invoice.number || "Borrador"
          }
          onClose={() => {
            if (!busy) {
              setView(null);
              setError("");
            }
          }}
        >
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          {view.kind === "create" && (
            <form onSubmit={submitCreate} className="space-y-4">
              <label className="block text-sm font-semibold">
                Tienda
                <select
                  required
                  value={createStore}
                  onChange={(e) => {
                    requestId.current = crypto.randomUUID();
                    setCreateStore(e.target.value);
                    setQuoteAttempt((attempt) => attempt + 1);
                    setDraftAmounts({ discount: 0, adjustment: 0, tax: 0 });
                    setError("");
                  }}
                  className={input}
                >
                  {current.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-400">
                El número consecutivo se asigna al emitir la factura. Los datos
                y montos quedan guardados como historial.
              </p>
              <div key={createStore} className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Nombre del cliente
                  <input
                    required
                    maxLength={200}
                    name="client_name"
                    defaultValue={
                      selectedStore?.client_name || selectedStore?.name || ""
                    }
                    className={input}
                  />
                </label>
                <label className="text-sm">
                  WhatsApp con prefijo internacional
                  <input
                    name="phone"
                    placeholder="+13055551234"
                    defaultValue={selectedStore?.client_phone || ""}
                    className={input}
                  />
                </label>
                <label className="text-sm">
                  Correo electrónico
                  <input
                    name="email"
                    type="email"
                    defaultValue={selectedStore?.client_email || ""}
                    className={input}
                  />
                </label>
                <label className="text-sm">
                  Mes de facturación
                  <input
                    type="month"
                    value={billingMonth}
                    max={month}
                    onChange={(e) => {
                      setBillingMonth(e.target.value);
                      setQuoteAttempt((attempt) => attempt + 1);
                      setError("");
                    }}
                    required
                    className={input}
                  />
                </label>
                <label className="text-sm">
                  Fecha de emisión
                  <input
                    name="issued_on"
                    type="date"
                    defaultValue={today()}
                    required
                    className={input}
                  />
                </label>
                <label className="text-sm">
                  Fecha de vencimiento
                  <input
                    name="due_on"
                    type="date"
                    defaultValue={
                      selectedStore?.next_payment_date &&
                      selectedStore.next_payment_date >= today()
                        ? selectedStore.next_payment_date
                        : today()
                    }
                    required
                    className={input}
                  />
                </label>
              </div>
              <label className="block text-sm">
                Concepto
                <textarea
                  name="description"
                  maxLength={500}
                  required
                  defaultValue="Servicios de Perla Marketplace"
                  className={input}
                />
              </label>
              <section
                className="rounded-xl bg-slate-50 p-4 text-sm"
                aria-label="Conceptos de facturación"
              >
                {pricing ? (
                  <dl className="space-y-2">
                    {(
                      [
                        ["Suscripción mensual", pricing.subscription],
                        ["Comisión de pedidos", pricing.orders],
                        ["Comisión de envíos", pricing.shipping],
                      ] as const
                    ).map(([label, amount]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <dt>{label}</dt>
                        <dd className="font-semibold">{money(amount)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p role="status">
                    {currentQuote?.error ||
                      (billingMonth
                        ? "Calculando conceptos…"
                        : "Selecciona un mes de facturación.")}
                  </p>
                )}
                {pricing &&
                  billingMonth !== month &&
                  pricing.subscription > 0 && (
                    <p className="mt-2 text-xs text-slate-600">
                      La mensualidad usa la tarifa configurada actualmente para
                      este cliente.
                    </p>
                  )}
                {pricing?.subtotal === 0 && (
                  <p className="mt-2">
                    No hay conceptos pendientes para este mes.
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy || !billingMonth}
                  className={`${button} mt-3`}
                  onClick={() => {
                    setError("");
                    setQuoteAttempt((attempt) => attempt + 1);
                  }}
                >
                  Actualizar importes
                </button>
              </section>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    ["discount", "Descuento USD"],
                    ["adjustment", "Ajuste / cargo USD"],
                    ["tax", "Impuesto configurado USD"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-sm">
                    {label}
                    <input
                      required
                      type="number"
                      step="0.01"
                      min={key === "adjustment" ? -1000000 : 0}
                      max={1000000}
                      value={draftAmounts[key]}
                      onChange={(e) =>
                        setDraftAmounts((a) => ({
                          ...a,
                          [key]: Number(e.target.value),
                        }))
                      }
                      className={input}
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Añade impuestos solo si corresponden. La activación de la tienda
                y sus fechas se gestionan con las reglas existentes.
              </p>
              <div className="flex items-center justify-between rounded-xl bg-indigo-50 p-4">
                <b>Total USD</b>
                <b className="text-xl text-indigo-700">
                  {pricing
                    ? money(
                        Number(pricing.subtotal) -
                          draftAmounts.discount +
                          draftAmounts.adjustment +
                          draftAmounts.tax,
                      )
                    : "—"}
                </b>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="submit"
                  name="save"
                  value="draft"
                  disabled={busy || !pricing || pricing.subtotal <= 0}
                  className={button}
                >
                  Guardar borrador
                </button>
                <button
                  type="submit"
                  name="save"
                  value="issue"
                  disabled={busy || !pricing || pricing.subtotal <= 0}
                  className={primary}
                >
                  {busy ? "Guardando..." : "Emitir factura pendiente"}
                </button>
              </div>
            </form>
          )}
          {view.kind === "settings" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void act(async () => {
                  await billingCommand({
                    action: "settings",
                    issuer: Object.fromEntries(
                      ["name", "address", "tax_id", "email", "phone"].map(
                        (k) => [k, String(f.get(k) || "")],
                      ),
                    ),
                  });
                  await load();
                  setView(null);
                  setNotice(
                    "Datos del emisor guardados. Las facturas anteriores conservan sus datos originales.",
                  );
                });
              }}
            >
              <p className="text-sm text-slate-500">
                Introduce los datos reales del emisor. Se guardarán en las
                nuevas facturas.
              </p>
              {(
                [
                  ["name", "Nombre del emisor"],
                  ["address", "Dirección"],
                  ["tax_id", "Identificación fiscal (si corresponde)"],
                  ["email", "Correo electrónico"],
                  ["phone", "Teléfono"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  {label}
                  <input
                    name={key}
                    type={key === "email" ? "email" : "text"}
                    required={key === "name"}
                    defaultValue={issuer[key] || ""}
                    className={input}
                  />
                </label>
              ))}
              <button disabled={busy} className={primary}>
                Guardar datos
              </button>
            </form>
          )}
          {view.kind === "invoice" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{view.invoice.store_name}</p>
                  <p className="text-sm text-slate-400">
                    {view.invoice.client_name}
                  </p>
                </div>
                {badge(view.invoice)}
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <p>{view.invoice.description}</p>
                <p className="mt-2">
                  Período: {invoicePeriodLabel(view.invoice)}
                </p>
                <p className="mt-2">
                  Emisión: {view.invoice.issued_on} · Vencimiento:{" "}
                  {view.invoice.due_on}
                </p>
                {invoiceLineItems(view.invoice).map(([label, amount]) => (
                  <p className="mt-2 flex justify-between gap-4" key={label}>
                    <span>{label}</span>
                    <strong>{money(amount)}</strong>
                  </p>
                ))}
                <p className="mt-3">
                  Subtotal {money(view.invoice.subtotal)} · Descuento{" "}
                  {money(view.invoice.discount)} · Ajuste{" "}
                  {money(view.invoice.adjustment)} · Impuesto{" "}
                  {money(view.invoice.tax)}
                </p>
                <p className="mt-3 text-xl font-bold">
                  Total {money(view.invoice.total)}
                </p>
                <p className="mt-1">
                  Pagado {money(view.invoice.paid)} · Saldo{" "}
                  <strong>{money(balance(view.invoice))}</strong>
                </p>
              </div>
              {invoiceActions(view.invoice)}
              <section>
                <h3 className="mb-2 text-sm font-bold">Pagos registrados</h3>
                {payments.length ? (
                  payments.map((p) => (
                    <div
                      key={p.id}
                      className="border-t border-slate-100 py-2 text-sm"
                    >
                      <b>{money(p.amount)}</b> · {p.paid_on} · {p.method}
                      <p className="text-xs text-slate-500">
                        {p.reference} {p.notes}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">
                    Sin pagos registrados.
                  </p>
                )}
              </section>
              <section>
                <h3 className="mb-2 text-sm font-bold">Historial de eventos</h3>
                {events.map((e) => (
                  <div
                    key={e.id}
                    className="border-t border-slate-100 py-2 text-xs"
                  >
                    <p>
                      {(
                        {
                          draft_created: "Borrador creado",
                          issued: "Factura emitida",
                          payment_registered: "Pago registrado",
                          voided: "Factura anulada",
                          whatsapp_prepared: "Mensaje de WhatsApp preparado",
                          whatsapp_open_requested:
                            "Apertura de WhatsApp solicitada",
                          links_revoked: "Enlaces revocados",
                        } as Record<string, string>
                      )[e.kind] || e.kind}
                    </p>
                    <time className="text-slate-400">
                      {new Date(e.created_at).toLocaleString("es-US", {
                        timeZone: "America/New_York",
                      })}
                    </time>
                    {Boolean(e.detail.reason) && (
                      <p className="mt-1">{String(e.detail.reason)}</p>
                    )}
                  </div>
                ))}
              </section>
            </div>
          )}
          {view.kind === "pay" && (
            <form
              className="space-y-4"
              onSubmit={(e) => void pay(e, view.invoice)}
            >
              <p className="text-sm">
                {view.invoice.number} · Saldo pendiente:{" "}
                <strong>{money(balance(view.invoice))}</strong>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Importe recibido USD
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={balance(view.invoice)}
                    defaultValue={balance(view.invoice)}
                    required
                    className={input}
                  />
                </label>
                <label className="text-sm">
                  Fecha de pago
                  <input
                    name="paid_on"
                    type="date"
                    required
                    max={today()}
                    defaultValue={today()}
                    className={input}
                  />
                </label>
                <label className="text-sm">
                  Método
                  <select name="method" className={input}>
                    {["Zelle", "Transferencia", "Efectivo", "Otro"].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Referencia
                  <input name="reference" maxLength={200} className={input} />
                </label>
              </div>
              <label className="block text-sm">
                Observaciones
                <textarea name="notes" maxLength={1000} className={input} />
              </label>
              <button disabled={busy} className={primary}>
                {busy ? "Registrando..." : "Confirmar pago"}
              </button>
            </form>
          )}
          {view.kind === "void" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void act(async () => {
                  const result = await billingCommand({
                    action: "void",
                    invoice_id: view.invoice.id,
                    reason: String(f.get("reason")),
                  });
                  await load(view.invoice.id);
                  setView({ kind: "invoice", invoice: result.invoice });
                });
              }}
            >
              <p className="text-sm">
                Se anulará <b>{view.invoice.number}</b>. Su número no se
                reutiliza; se conserva el historial y se revocan sus enlaces.
              </p>
              <label className="block text-sm">
                Motivo
                <textarea
                  name="reason"
                  minLength={3}
                  maxLength={500}
                  required
                  className={input}
                />
              </label>
              <button
                disabled={busy}
                className={`${button} bg-red-600 text-white`}
              >
                Confirmar anulación
              </button>
            </form>
          )}
          {view.kind === "share" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Revisa y edita el mensaje. El enlace da acceso únicamente a esta
                factura durante 30 días y puede revocarse. Abrir WhatsApp no
                confirma el envío.
              </p>
              <label className="block text-sm">
                WhatsApp internacional
                <input
                  value={view.phone}
                  onChange={(e) => setView({ ...view, phone: e.target.value })}
                  className={input}
                />
              </label>
              <label className="block text-sm">
                Mensaje
                <textarea
                  disabled={!view.link}
                  placeholder="Primero prepara el mensaje para generar su enlace seguro."
                  rows={15}
                  value={view.message}
                  onChange={(e) =>
                    setView({ ...view, message: e.target.value })
                  }
                  className={input}
                />
              </label>
              {!view.link ? (
                <button
                  disabled={busy}
                  className={primary}
                  onClick={() =>
                    void act(async () => {
                      whatsappPhone(view.phone);
                      const result = await billingCommand({
                        action: "share",
                        invoice_id: view.invoice.id,
                        phone: view.phone,
                      });
                      setView({
                        ...view,
                        message: result.message,
                        link: result.link,
                      });
                    })
                  }
                >
                  Preparar mensaje y enlace seguro
                </button>
              ) : (
                <button
                  disabled={busy}
                  className={primary}
                  onClick={() => {
                    let phone: string;
                    try {
                      phone = whatsappPhone(view.phone);
                    } catch (e) {
                      setError((e as Error).message);
                      return;
                    }
                    const win = window.open("about:blank", "_blank");
                    if (!win) {
                      setError(
                        "Permite las ventanas emergentes para abrir WhatsApp.",
                      );
                      return;
                    }
                    void act(async () => {
                      try {
                        await billingCommand({
                          action: "opened",
                          invoice_id: view.invoice.id,
                        });
                        win.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(view.message)}`;
                        win.opener = null;
                        await load();
                        setView(null);
                        setNotice(
                          "Se solicitó abrir WhatsApp. Revisa el mensaje y pulsa Enviar allí.",
                        );
                      } catch (e) {
                        win.close();
                        throw e;
                      }
                    });
                  }}
                >
                  <Send size={16} />
                  Abrir WhatsApp con mensaje
                </button>
              )}
            </div>
          )}
        </BillingDialog>
      )}
    </main>
  );
}
