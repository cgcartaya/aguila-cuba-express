"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  MoreVertical,
  PackagePlus,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  archiveShippingCustomer,
  deleteShippingCustomer,
  getShippingCustomersWithArchived,
  restoreShippingCustomer,
  saveShippingCustomer,
} from "@/lib/services/shipping-customers";
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

type EditForm = {
  name: string;
  phone: string;
  birth_date: string;
  email: string;
  address: string;
  notes: string;
};

const EMPTY_EDIT_FORM: EditForm = {
  name: "",
  phone: "",
  birth_date: "",
  email: "",
  address: "",
  notes: "",
};

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
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<ShippingCustomer | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);
  const [actionCustomer, setActionCustomer] = useState<ShippingCustomer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadCustomers() {
    if (!activeStore?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    const { data, error } = await getShippingCustomersWithArchived(activeStore.id);

    if (error) {
      setErrorMessage(error.message);
      setCustomers([]);
    } else {
      setCustomers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!accessLoading && !storeLoading) void loadCustomers();
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
        (filter === "all") ||
        (filter === "active" && customer.is_active !== false) ||
        (filter === "archived" && customer.is_active === false) ||
        (filter === "debt" && customer.is_active !== false && Number(customer.total_balance || 0) > 0) ||
        (filter === "vip" && customer.is_active !== false && customer.customer_type === "vip") ||
        (filter === "recent" &&
          customer.is_active !== false &&
          customer.last_operation_at &&
          new Date(customer.last_operation_at) > new Date(Date.now() - 30 * 86400000));

      return matchesSearch && matchesFilter;
    });
  }, [customers, filter, search]);

  const activeCustomers = customers.filter((customer) => customer.is_active !== false);
  const totalBalance = activeCustomers.reduce(
    (sum, customer) => sum + Number(customer.total_balance || 0),
    0
  );
  const totalRecipients = activeCustomers.reduce(
    (sum, customer) => sum + Number(customer.recipients_count || 0),
    0
  );
  const activeThisMonth = activeCustomers.filter(
    (customer) =>
      customer.last_operation_at &&
      new Date(customer.last_operation_at) > new Date(Date.now() - 30 * 86400000)
  ).length;

  function beginEdit(customer: ShippingCustomer) {
    setOpenMenuId(null);
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
      birth_date: customer.birth_date || "",
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setErrorMessage("");
  }

  async function saveEdit() {
    if (!activeStore?.id || !editingCustomer) return;
    const phone = editForm.phone.replace(/\D/g, "");
    if (!editForm.name.trim() || !phone) {
      setErrorMessage("El nombre y el teléfono son obligatorios.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    const { data, error } = await saveShippingCustomer({
      id: editingCustomer.id,
      store_id: activeStore.id,
      name: editForm.name.trim(),
      phone,
      birth_date: editForm.birth_date || null,
      email: editForm.email.trim(),
      address: editForm.address.trim(),
      notes: editForm.notes.trim(),
    });
    setSaving(false);

    if (error || !data) {
      setErrorMessage(error?.message || "No se pudieron guardar los cambios.");
      return;
    }

    setCustomers((current) =>
      current.map((item) =>
        item.id === editingCustomer.id
          ? { ...item, ...data, is_active: editingCustomer.is_active }
          : item
      )
    );
    setEditingCustomer(null);
    setSuccessMessage("Datos del cliente actualizados correctamente.");
  }

  async function copyPhone(customer: ShippingCustomer) {
    await navigator.clipboard.writeText(customer.phone);
    setOpenMenuId(null);
    setSuccessMessage("Teléfono copiado.");
  }

  async function confirmCustomerAction() {
    if (!activeStore?.id || !actionCustomer) return;
    setActionLoading(true);
    setErrorMessage("");

    const hasOperations = Number(actionCustomer.operations_count || 0) > 0;
    const result = hasOperations
      ? await archiveShippingCustomer(activeStore.id, actionCustomer.id)
      : await deleteShippingCustomer(activeStore.id, actionCustomer.id);

    setActionLoading(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      setActionCustomer(null);
      return;
    }

    if (hasOperations) {
      setCustomers((current) =>
        current.map((item) =>
          item.id === actionCustomer.id ? { ...item, is_active: false } : item
        )
      );
      setSuccessMessage("Cliente archivado. Su historial se conserva.");
    } else {
      setCustomers((current) => current.filter((item) => item.id !== actionCustomer.id));
      setSuccessMessage("Cliente eliminado definitivamente.");
    }

    setActionCustomer(null);
  }

  async function restoreCustomer(customer: ShippingCustomer) {
    if (!activeStore?.id) return;
    setOpenMenuId(null);
    const { error } = await restoreShippingCustomer(activeStore.id, customer.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setCustomers((current) =>
      current.map((item) => (item.id === customer.id ? { ...item, is_active: true } : item))
    );
    setSuccessMessage("Cliente restaurado correctamente.");
  }

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
                Edita clientes, conserva su historial y elimina con seguridad los registros de prueba.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/admin/shipping/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#061b3a] shadow-lg transition hover:-translate-y-0.5">
                  <PackagePlus size={19} /> Crear envío
                </Link>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-blue-50 backdrop-blur">
                  {filtered.length} de {customers.length} clientes visibles
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[600px]">
              <HeroMetric label="Clientes activos" value={String(activeCustomers.length)} icon={<UsersRound size={18} />} />
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
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Buscar por AG-0043, nombre o teléfono..." />
            </label>

            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none focus:border-blue-400">
              <option value="active">Clientes activos</option>
              <option value="archived">Clientes archivados</option>
              <option value="all">Todos los clientes</option>
              <option value="recent">Actividad reciente</option>
              <option value="debt">Con saldo pendiente</option>
              <option value="vip">Clientes VIP</option>
            </select>
          </div>
        </section>

        {successMessage && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
            <span className="flex items-center gap-2"><CheckCircle2 size={19} />{successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage("")}><X size={18} /></button>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage("")}><X size={18} /></button>
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
            <p className="mt-2 text-sm font-semibold text-slate-500">Prueba otro nombre, código, teléfono o filtro.</p>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((customer) => {
              const code = customer.customer_code || `AG-${String(customer.customer_number).padStart(4, "0")}`;
              const hasDebt = Number(customer.total_balance || 0) > 0;
              const archived = customer.is_active === false;

              return (
                <article key={customer.id} className={`group relative overflow-visible rounded-[1.8rem] border bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${archived ? "border-slate-300 opacity-80" : "border-slate-200 hover:border-blue-200 hover:shadow-blue-100/60"}`}>
                  <div className="overflow-hidden rounded-t-[1.8rem] p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-700 ring-1 ring-blue-100">
                        <UserRound size={23} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-lg font-black text-slate-950">{customer.name}</p>
                              {archived && <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black uppercase text-slate-600">Archivado</span>}
                            </div>
                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500"><Phone size={14} /> {customer.phone}</p>
                          </div>

                          <div className="flex shrink-0 items-start gap-2">
                            <span className="rounded-full bg-[#061b3a] px-3 py-1.5 text-xs font-black text-white">{code}</span>
                            <button type="button" aria-label="Acciones del cliente" onClick={() => setOpenMenuId((current) => current === customer.id ? null : customer.id)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100">
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-2">
                          <MiniMetric label="Envíos" value={String(Number(customer.operations_count || 0))} />
                          <MiniMetric label="Destinatarios" value={String(Number(customer.recipients_count || 0))} accent="blue" />
                          <MiniMetric label="Saldo" value={money(customer.total_balance)} alert={hasDebt} />
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                          <div><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Última operación</p><p className="mt-1 text-sm font-black text-slate-700">{formatDate(customer.last_operation_at)}</p></div>
                          <div className="text-right"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Facturado</p><p className="mt-1 text-sm font-black text-slate-900">{money(customer.total_billed)}</p></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {openMenuId === customer.id && (
                    <div className="absolute right-4 top-16 z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                      <button type="button" onClick={() => beginEdit(customer)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black text-slate-700 hover:bg-blue-50 hover:text-blue-800"><Pencil size={16} /> Editar cliente</button>
                      <button type="button" onClick={() => void copyPhone(customer)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black text-slate-700 hover:bg-slate-100"><Copy size={16} /> Copiar teléfono</button>
                      {archived ? (
                        <button type="button" onClick={() => void restoreCustomer(customer)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black text-emerald-700 hover:bg-emerald-50"><RotateCcw size={16} /> Restaurar cliente</button>
                      ) : (
                        <button type="button" onClick={() => { setOpenMenuId(null); setActionCustomer(customer); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black text-red-700 hover:bg-red-50">{Number(customer.operations_count || 0) > 0 ? <Archive size={16} /> : <Trash2 size={16} />}{Number(customer.operations_count || 0) > 0 ? "Archivar cliente" : "Eliminar cliente"}</button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 rounded-b-[1.8rem] border-t border-slate-100 bg-slate-50/70 p-3">
                    <Link href={`/admin/customers/${customer.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black text-slate-700 transition hover:bg-white hover:text-blue-700">Ver expediente <ArrowRight size={16} /></Link>
                    <Link href={`/admin/shipping/new?customerId=${customer.id}`} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black text-white shadow-sm transition ${archived ? "pointer-events-none bg-slate-400" : "bg-[#061b3a] hover:bg-blue-900"}`}><PackagePlus size={17} /> Nuevo envío</Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {editingCustomer && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[2rem]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 p-5 backdrop-blur sm:p-6">
              <div><p className="text-xs font-black uppercase tracking-[.14em] text-blue-700">Editar expediente</p><h3 className="mt-1 text-2xl font-black text-slate-950">{editingCustomer.name}</h3></div>
              <button type="button" onClick={() => setEditingCustomer(null)} className="rounded-xl bg-slate-100 p-3 text-slate-600"><X size={20} /></button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <Field label="Nombre completo *" value={editForm.name} onChange={(value) => setEditForm((current) => ({ ...current, name: value }))} />
              <Field label="Teléfono *" value={editForm.phone} onChange={(value) => setEditForm((current) => ({ ...current, phone: value.replace(/\D/g, "").slice(0, 15) }))} inputMode="numeric" />
              <Field label="Fecha de nacimiento" value={editForm.birth_date} onChange={(value) => setEditForm((current) => ({ ...current, birth_date: value }))} type="date" />
              <Field label="Correo electrónico" value={editForm.email} onChange={(value) => setEditForm((current) => ({ ...current, email: value }))} type="email" />
              <div className="sm:col-span-2"><Field label="Dirección" value={editForm.address} onChange={(value) => setEditForm((current) => ({ ...current, address: value }))} /></div>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Notas</span><textarea value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 p-5 backdrop-blur sm:flex-row sm:justify-end sm:p-6">
              <button type="button" onClick={() => setEditingCustomer(null)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">Cancelar</button>
              <button type="button" onClick={() => void saveEdit()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-6 py-3 text-sm font-black text-white disabled:opacity-50">{saving && <Loader2 size={18} className="animate-spin" />} Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {actionCustomer && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/55 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${Number(actionCustomer.operations_count || 0) > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{Number(actionCustomer.operations_count || 0) > 0 ? <Archive size={25} /> : <Trash2 size={25} />}</div>
            <h3 className="mt-5 text-2xl font-black text-slate-950">{Number(actionCustomer.operations_count || 0) > 0 ? "Archivar cliente" : "Eliminar cliente"}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              {Number(actionCustomer.operations_count || 0) > 0
                ? `${actionCustomer.name} tiene historial de envíos. Se ocultará de la lista activa, pero sus envíos y destinatarios permanecerán intactos.`
                : `${actionCustomer.name} no tiene envíos. Se eliminará definitivamente junto con sus destinatarios. Esta acción no se puede deshacer.`}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setActionCustomer(null)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">Cancelar</button>
              <button type="button" onClick={() => void confirmCustomerAction()} disabled={actionLoading} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white disabled:opacity-50 ${Number(actionCustomer.operations_count || 0) > 0 ? "bg-amber-600" : "bg-red-600"}`}>{actionLoading && <Loader2 size={18} className="animate-spin" />}{Number(actionCustomer.operations_count || 0) > 0 ? "Archivar" : "Eliminar definitivamente"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function HeroMetric({ label, value, icon, alert = false }: { label: string; value: string; icon: React.ReactNode; alert?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><div className="flex items-center gap-2 text-xs font-bold text-blue-100">{icon}<span>{label}</span></div><p className={`mt-2 truncate text-xl font-black ${alert ? "text-amber-200" : "text-white"}`}>{value}</p></div>;
}

function MiniMetric({ label, value, alert = false, accent }: { label: string; value: string; alert?: boolean; accent?: "blue" }) {
  return <div className={`rounded-xl px-2 py-3 text-center ${accent === "blue" ? "bg-blue-50" : "bg-slate-50"}`}><p className={`truncate text-sm font-black ${alert ? "text-amber-700" : accent === "blue" ? "text-blue-800" : "text-slate-950"}`}>{value}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{label}</p></div>;
}

function Field({ label, value, onChange, inputMode, type = "text" }: { label: string; value: string; onChange: (value: string) => void; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; type?: string }) {
  return <label><span className="mb-2 block text-sm font-black text-slate-700">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>;
}
