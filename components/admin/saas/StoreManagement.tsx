"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Search,
  Plus,
  MoreVertical,
  Receipt,
  Store as StoreIcon,
  Globe,
  Truck,
  ShoppingBag,
  Utensils,
  CalendarDays,
  Package,
  BarChart3,
  FileText,
} from "lucide-react";
import type { Store } from "@/lib/saas/store-types";
import { billingRequest, billingCommand } from "@/lib/saas-billing/client";
import { money, today, type Invoice } from "@/lib/saas-billing/model";
import EconomyModuleToggle from "./EconomyModuleToggle";
import ClientShowcaseToggle from "./ClientShowcaseToggle";
import BillingDialog from "./BillingDialog";
export type Lifecycle = { store_id: string; state: "suspended" | "archived" };
const modules = [
  ["has_landing", "Landing", Globe],
  ["module_store_enabled", "Tienda virtual", ShoppingBag],
  ["module_shipping_enabled", "Envíos", Truck],
  ["module_pickups_enabled", "Recogidas", Package],
  ["module_menu_enabled", "Restaurante", Utensils],
  ["module_reservas_enabled", "Reservas", CalendarDays],
  ["module_lockers_enabled", "Casillero virtual", Package],
  ["module_procedures_enabled", "Trámites", FileText],
  ["module_marketing_posts_enabled", "Publicaciones", FileText],
  ["module_marketing_catalogs_enabled", "Catálogos", ShoppingBag],
  ["module_marketing_analytics_enabled", "Analítica", BarChart3],
] as const;
export function storePayment(store: Store) {
  return store.payment_status === "overdue" ||
    (store.payment_status !== "paid" &&
      store.payment_status !== "cancelled" &&
      !!store.next_payment_date &&
      store.next_payment_date < today())
    ? "overdue"
    : store.payment_status || "pending";
}
export function filterStores(
  stores: Store[],
  lifecycle: Lifecycle[],
  search: string,
  filter: string,
  sort: string,
) {
  const states = new Map(lifecycle.map((l) => [l.store_id, l.state]));
  return stores
    .filter((s) => {
      const state = states.get(s.id),
        payment = storePayment(s);
      return (
        [s.name, s.domain, s.subdomain, s.slug, s.client_name].some((v) =>
          v?.toLowerCase().includes(search.toLowerCase()),
        ) &&
        (filter === "archived" ? state === "archived" : state !== "archived") &&
        (filter === "active"
          ? s.is_active
          : filter === "pending"
            ? ["pending", "overdue"].includes(payment)
            : filter === "suspended"
              ? state === "suspended"
              : true)
      );
    })
    .sort((a, b) =>
      sort === "price"
        ? Number(b.monthly_price) - Number(a.monthly_price)
        : sort === "due"
          ? (a.next_payment_date || "9999").localeCompare(
              b.next_payment_date || "9999",
            )
          : a.name.localeCompare(b.name),
    );
}
export default function StoreManagement() {
  const [stores, setStores] = useState<Store[]>([]),
    [lifecycle, setLifecycle] = useState<Lifecycle[]>([]),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("name");
  const [selected, setSelected] = useState<{
      store: Store;
      action: string;
    } | null>(null),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const data = await (await billingRequest()).json();
    setStores(
      data.stores.map((s: Store) => {
        const issued = (data.invoices as Invoice[]).filter(
          (i) => i.store_id === s.id && !["draft", "void"].includes(i.status),
        );
        const pending = issued
          .filter((i) => i.status === "pending")
          .sort((a, b) => a.due_on.localeCompare(b.due_on));
        return pending.length
          ? {
              ...s,
              payment_status:
                pending[0].due_on < today() ? "overdue" : "pending",
              next_payment_date: pending[0].due_on,
            }
          : issued.length
            ? { ...s, payment_status: "paid" }
            : s;
      }),
    );
    setLifecycle(data.lifecycle);
    setLoaded(true);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  const stateMap = new Map(lifecycle.map((l) => [l.store_id, l.state]));
  const visible = filterStores(stores, lifecycle, search, filter, sort),
    current = stores.filter((s) => stateMap.get(s.id) !== "archived");
  const pending = current.filter((s) => storePayment(s) === "pending").length,
    overdue = current.filter((s) => storePayment(s) === "overdue").length;
  async function mutate() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await billingCommand({
        action: selected.action,
        store_id: selected.store.id,
        confirmation,
      });
      await load();
      setSelected(null);
      setConfirmation("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportStore(s: Store) {
    try {
      const data = await (await billingRequest()).json();
      const invoices = data.invoices.filter(
        (i: Invoice) => i.store_id === s.id,
      );
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              scope:
                "Configuración y facturas SaaS. El archivado conserva todos los datos operativos en la base de datos.",
              store: data.stores.find((item: Store) => item.id === s.id),
              invoices,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${s.slug}-respaldo-saas.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function actions(s: Store) {
    const state = stateMap.get(s.id);
    return (
      <details className="relative">
        <summary
          aria-label={`Acciones de ${s.name}`}
          className="flex cursor-pointer list-none justify-center rounded-lg border border-slate-200 p-2 hover:bg-slate-100"
        >
          <MoreVertical size={17} />
        </summary>
        <div
          className="absolute right-0 top-10 z-20 grid w-60 gap-1 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-xl"
          onClick={(e) =>
            e.currentTarget.parentElement?.removeAttribute("open")
          }
        >
          <Link
            className="rounded-lg px-3 py-2 hover:bg-slate-50"
            href={`/admin/stores/${s.id}/edit`}
          >
            Editar tienda
          </Link>
          <Link
            className="rounded-lg px-3 py-2 hover:bg-slate-50"
            href={`/admin/stores/${s.id}/users`}
          >
            Administrar usuarios
          </Link>
          <Link
            className="rounded-lg px-3 py-2 hover:bg-slate-50"
            href={`/admin/stores/${s.id}/edit`}
          >
            Configurar módulos
          </Link>
          {state !== "archived" && (
            <Link
              className="rounded-lg px-3 py-2 hover:bg-slate-50"
              href={`/admin/stores/billing?store=${s.id}&new=1`}
            >
              Emitir factura
            </Link>
          )}
          <Link
            className="rounded-lg px-3 py-2 hover:bg-slate-50"
            href={`/admin/stores/billing?store=${s.id}`}
          >
            Historial de facturas
          </Link>
          <button
            onClick={() => void exportStore(s)}
            className="rounded-lg px-3 py-2 text-left hover:bg-slate-50"
          >
            Exportar configuración y facturas
          </button>
          {state !== "archived" && (
            <button
              className="rounded-lg px-3 py-2 text-left hover:bg-amber-50"
              onClick={() =>
                setSelected({
                  store: s,
                  action: s.is_active ? "suspend" : "reactivate",
                })
              }
            >
              {s.is_active ? "Suspender tienda" : "Reactivar tienda"}
            </button>
          )}
          <button
            className="rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50"
            onClick={() => {
              setConfirmation("");
              setSelected({
                store: s,
                action: state === "archived" ? "restore" : "archive",
              });
            }}
          >
            {state === "archived"
              ? "Restaurar tienda"
              : "Eliminar / archivar tienda"}
          </button>
        </div>
      </details>
    );
  }
  function identity(s: Store) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-indigo-50 text-indigo-600">
          {s.logo_url ? (
            <img
              src={s.logo_url}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <StoreIcon size={22} />
          )}
        </div>
        <div className="min-w-0">
          <p className="break-words font-bold text-slate-800">{s.name}</p>
          <p className="break-all text-xs text-slate-400">
            {s.domain || `${s.subdomain || s.slug}.perlamarketplace.com`}
          </p>
        </div>
      </div>
    );
  }
  function billing(s: Store) {
    const payment = storePayment(s);
    return (
      <div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${payment === "paid" ? "bg-emerald-50 text-emerald-700" : payment === "overdue" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
        >
          {
            {
              paid: "Pagado",
              pending: "Pendiente",
              overdue: "Vencido",
              cancelled: "Cancelado",
            }[payment]
          }
        </span>
        <p className="mt-2 text-xs text-slate-400">
          Próximo: {s.next_payment_date || "Sin registrar"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Último: {s.last_payment_date || "Sin registrar"}
        </p>
      </div>
    );
  }
  function status(s: Store) {
    return (
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
      >
        {stateMap.get(s.id) === "archived"
          ? "Archivada"
          : stateMap.get(s.id) === "suspended"
            ? "Suspendida"
            : s.is_active
              ? "Activa"
              : "Inactiva"}
      </span>
    );
  }
  function moduleIcons(s: Store) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {modules
          .filter(([key]) => s[key])
          .map(([key, name, Icon]) => (
            <span
              key={key}
              title={name}
              aria-label={name}
              className="rounded-lg bg-indigo-50 p-1.5 text-indigo-500"
            >
              <Icon size={15} />
            </span>
          ))}
      </div>
    );
  }
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-7 text-slate-700 md:px-8">
      <div className="mx-auto max-w-[1450px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-indigo-500">
              Administración SaaS
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F4D] md:text-3xl">
              Gestión de tiendas
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Administra tus clientes, suscripciones, módulos y facturación
              desde un solo lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/stores/billing"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
            >
              <Receipt size={17} />
              Facturación SaaS
            </Link>
            <Link
              href="/admin/stores/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm"
            >
              <Plus size={17} />
              Nueva tienda
            </Link>
          </div>
        </header>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            {error}{" "}
            <button
              className="underline"
              onClick={() =>
                void load()
                  .then(() => setError(""))
                  .catch((e) => setError(e.message))
              }
            >
              Reintentar
            </button>
          </p>
        )}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Tiendas registradas",
              current.length,
              Building2,
              "bg-indigo-50 text-indigo-600",
              "Clientes en la plataforma",
            ],
            [
              "Tiendas activas",
              current.filter((s) => s.is_active).length,
              CheckCircle2,
              "bg-emerald-50 text-emerald-600",
              "Habilitadas actualmente",
            ],
            [
              "Mensualidad total",
              money(
                current.reduce((a, s) => a + Number(s.monthly_price || 0), 0),
              ),
              Receipt,
              "bg-blue-50 text-blue-600",
              "Contratado · no equivale a cobrado",
            ],
            [
              "Pagos pendientes",
              pending + overdue,
              CalendarDays,
              "bg-amber-50 text-amber-600",
              `${pending} pendientes · ${overdue} vencidos`,
            ],
          ].map(([label, value, Icon, color, note]) => {
            const I = Icon as typeof Building2;
            return (
              <article
                key={String(label)}
                className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{String(label)}</p>
                  <span className={`rounded-xl p-2.5 ${color}`}>
                    <I size={20} />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-extrabold text-[#0B1F4D]">
                  {loaded ? String(value) : "—"}
                </p>
                <p className="mt-2 text-xs text-slate-400">{String(note)}</p>
              </article>
            );
          })}
        </section>
        <section className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-100 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-slate-800">
                Tus tiendas{" "}
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                  {visible.length}
                </span>
              </h2>
              <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-400">
                  <Search size={17} />
                  <input
                    aria-label="Buscar tiendas por nombre, dominio o propietario"
                    placeholder="Buscar tienda, dominio o propietario..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full min-w-0 text-sm text-slate-700 outline-none sm:w-72"
                  />
                </label>
                <select
                  aria-label="Ordenar tiendas"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="name">Nombre</option>
                  <option value="price">Mensualidad</option>
                  <option value="due">Próximo vencimiento</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "Todas"],
                ["active", "Activas"],
                ["pending", "Pendientes de pago"],
                ["suspended", "Suspendidas"],
                ["archived", "Archivadas"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === value ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden xl:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-[26%] p-4">Tienda / Dominio</th>
                  <th className="w-[8%]">Plan</th>
                  <th className="w-[10%]">Mensualidad</th>
                  <th className="w-[10%]">Estado</th>
                  <th className="w-[17%]">Facturación</th>
                  <th className="w-[15%]">Módulos</th>
                  <th className="w-[14%] pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="p-4">{identity(s)}</td>
                    <td className="text-xs font-semibold capitalize">
                      {s.plan === "basic" ? "Básico" : s.plan}
                    </td>
                    <td className="font-bold text-slate-800">
                      {money(s.monthly_price || 0)}
                      <p className="text-xs font-normal text-slate-400">
                        / mes
                      </p>
                    </td>
                    <td>{status(s)}</td>
                    <td>{billing(s)}</td>
                    <td className="pr-3">{moduleIcons(s)}</td>
                    <td className="pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600"
                          href={`/admin/stores/${s.id}/edit`}
                        >
                          Editar
                        </Link>
                        {actions(s)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:hidden">
            {visible.map((s) => (
              <article
                key={s.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  {identity(s)}
                  {actions(s)}
                </div>
                <div className="my-4 flex flex-wrap items-center gap-2">
                  {status(s)}
                  <span className="text-xs font-semibold capitalize">
                    {s.plan} · {money(s.monthly_price || 0)}/mes
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {billing(s)}
                  {moduleIcons(s)}
                </div>
                <Link
                  className="mt-4 block rounded-lg bg-indigo-50 p-2 text-center text-sm font-bold text-indigo-600"
                  href={`/admin/stores/${s.id}/edit`}
                >
                  Editar tienda
                </Link>
              </article>
            ))}
          </div>
          {!visible.length && (
            <p className="p-12 text-center text-sm text-slate-400">
              {loaded
                ? "No hay tiendas que coincidan con estos filtros."
                : "Cargando tiendas..."}
            </p>
          )}
          <div className="border-t border-slate-100 px-5 py-4">
            <details>
              <summary className="cursor-pointer text-xs font-bold text-slate-500">
                Controles rápidos · Economía y visibilidad en Perla
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {visible.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3"
                  >
                    <span className="mr-auto text-xs font-bold">{s.name}</span>
                    <EconomyModuleToggle storeId={s.id} />
                    <ClientShowcaseToggle
                      storeId={s.id}
                      active={Boolean(s.is_active)}
                    />
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>
      </div>
      {selected && (
        <BillingDialog
          title={`${{ archive: "Archivar", suspend: "Suspender", reactivate: "Reactivar", restore: "Restaurar" }[selected.action]} tienda`}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <p className="font-bold">{selected.store.name}</p>
          <p className="mt-3 text-sm text-slate-500">
            {selected.action === "archive"
              ? "La tienda dejará de estar disponible. Se conservan sus productos, órdenes, usuarios, envíos y contabilidad. Podrás restaurarla desde Archivadas. No se elimina ninguna relación."
              : selected.action === "suspend"
                ? "La tienda dejará de estar disponible temporalmente; conserva todos sus datos."
                : "Se recuperará el estado de acceso correspondiente sin modificar la facturación."}
          </p>
          {selected.action === "archive" && (
            <>
              <button
                className="my-4 text-sm font-semibold text-indigo-600 underline"
                onClick={() => void exportStore(selected.store)}
              >
                Descargar respaldo de configuración y facturas SaaS
              </button>
              <label className="block text-sm">
                Escribe exactamente <strong>{selected.store.name}</strong>
                <input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 p-3"
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              disabled={busy}
              onClick={() => setSelected(null)}
              className="rounded-xl border px-4 py-2"
            >
              Cancelar
            </button>
            <button
              disabled={
                busy ||
                (selected.action === "archive" &&
                  confirmation !== selected.store.name)
              }
              onClick={() => void mutate()}
              className="rounded-xl bg-[#0B1F4D] px-4 py-2 text-white disabled:opacity-40"
            >
              {busy ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </BillingDialog>
      )}
    </main>
  );
}
