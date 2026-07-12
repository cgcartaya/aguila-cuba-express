
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  Save,
  TicketPercent,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  addCampaignPhones,
  createDiscountCampaign,
  deleteDiscountCampaign,
  getCampaignCustomers,
  getDiscountCampaigns,
  removeCampaignCustomer,
  updateCampaignCustomerStatus,
  updateDiscountCampaign,
  type DiscountCampaign,
  type DiscountCampaignCustomer,
} from "@/lib/services/discounts";

const initialForm = {
  name: "",
  code: "",
  discount_amount: "10",
  authorized_limit: "50",
  expires_at: "",
  is_active: true,
};

export default function DiscountsAdminPage() {
  const { isSuperAdmin, store: accessStore, loading: accessLoading } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [isSuperAdmin, selectedStore, accessStore]
  );

  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [selected, setSelected] = useState<DiscountCampaign | null>(null);
  const [customers, setCustomers] = useState<DiscountCampaignCustomer[]>([]);
  const [form, setForm] = useState(initialForm);
  const [phonesText, setPhonesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function loadCampaigns() {
    if (!activeStore?.id) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await getDiscountCampaigns(activeStore.id);

    if (error) {
      setFeedback(error.message);
      setCampaigns([]);
    } else {
      setCampaigns(data || []);
    }

    setLoading(false);
  }

  async function loadCustomers(campaign: DiscountCampaign) {
    const { data, error } = await getCampaignCustomers(
      campaign.id,
      campaign.store_id
    );

    if (error) {
      setFeedback(error.message);
      return;
    }

    setCustomers(data || []);
  }

  useEffect(() => {
    if (accessLoading || storeLoading) return;
    void loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  async function handleCreate() {
    if (!activeStore?.id) return;

    if (!form.name.trim() || !form.code.trim() || !form.expires_at) {
      setFeedback("Completa nombre, código y fecha de vencimiento.");
      return;
    }

    setSaving(true);
    setFeedback("");

    const { error } = await createDiscountCampaign(activeStore.id, {
      name: form.name.trim(),
      code: form.code,
      discount_amount: Number(form.discount_amount || 10),
      authorized_limit: Number(form.authorized_limit || 50),
      expires_at: new Date(form.expires_at).toISOString(),
      is_active: form.is_active,
    });

    if (error) {
      setFeedback(error.message);
    } else {
      setForm(initialForm);
      setFeedback("Campaña creada correctamente.");
      await loadCampaigns();
    }

    setSaving(false);
  }

  async function handleSaveCampaign(campaign: DiscountCampaign) {
    const currentCount = customers.length;

    if (campaign.authorized_limit < currentCount) {
      setFeedback(
        `El límite no puede ser menor que los ${currentCount} teléfonos ya asociados.`
      );
      return;
    }

    const { error } = await updateDiscountCampaign(
      campaign.id,
      campaign.store_id,
      {
        name: campaign.name,
        code: campaign.code,
        discount_amount: Number(campaign.discount_amount),
        authorized_limit: Number(campaign.authorized_limit),
        expires_at: campaign.expires_at,
        is_active: campaign.is_active,
      }
    );

    setFeedback(error ? error.message : "Campaña actualizada.");
    if (!error) await loadCampaigns();
  }

  async function handleAddPhones() {
    if (!selected) return;

    const phones = phonesText.split(/[\n,;]+/g);

    const { error } = await addCampaignPhones(selected, phones);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setPhonesText("");
    setFeedback("Teléfonos asociados correctamente.");
    await loadCustomers(selected);
  }

  async function handleDeleteCampaign(campaign: DiscountCampaign) {
    if (!confirm(`¿Eliminar la campaña ${campaign.name}?`)) return;

    const { error } = await deleteDiscountCampaign(
      campaign.id,
      campaign.store_id
    );

    setFeedback(error ? error.message : "Campaña eliminada.");

    if (!error) {
      if (selected?.id === campaign.id) {
        setSelected(null);
        setCustomers([]);
      }
      await loadCampaigns();
    }
  }

  if (accessLoading || storeLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-center">
          <Loader2 className="mx-auto animate-spin" />
          <p className="mt-3 font-bold text-slate-500">Cargando bonos...</p>
        </div>
      </main>
    );
  }

  if (!activeStore?.id) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-center">
          <h1 className="text-2xl font-black text-[#061b3a]">
            Selecciona una tienda
          </h1>
          <p className="mt-2 text-slate-500">
            Elige una tienda antes de administrar sus bonos.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-r from-[#061b3a] to-[#2563eb] p-6 text-white shadow-xl md:p-8">
          <div className="flex items-center gap-3">
            <TicketPercent size={28} />
            <div>
              <p className="text-sm font-bold text-blue-100">Marketing</p>
              <h1 className="text-3xl font-black">Bonos de descuento</h1>
              <p className="mt-2 text-blue-100">
                Campañas de monto fijo para teléfonos autorizados.
              </p>
            </div>
          </div>
        </section>

        {feedback && (
          <div className="rounded-2xl border bg-white px-4 py-3 font-bold text-slate-700">
            {feedback}
          </div>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#061b3a]">
            Crear campaña
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Nombre"
              value={form.name}
              onChange={(value) => setForm((p) => ({ ...p, name: value }))}
              placeholder="Primera compra"
            />
            <Field
              label="Código"
              value={form.code}
              onChange={(value) =>
                setForm((p) => ({ ...p, code: value.toUpperCase() }))
              }
              placeholder="PRIMERA10"
            />
            <Field
              label="Descuento fijo ($)"
              type="number"
              value={form.discount_amount}
              onChange={(value) =>
                setForm((p) => ({ ...p, discount_amount: value }))
              }
            />
            <Field
              label="Cantidad autorizada"
              type="number"
              value={form.authorized_limit}
              onChange={(value) =>
                setForm((p) => ({ ...p, authorized_limit: value }))
              }
            />
            <Field
              label="Vence"
              type="datetime-local"
              value={form.expires_at}
              onChange={(value) =>
                setForm((p) => ({ ...p, expires_at: value }))
              }
            />

            <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 font-bold">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((p) => ({ ...p, is_active: e.target.checked }))
                }
              />
              Campaña activa
            </label>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-black text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Crear campaña
          </button>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className={`rounded-3xl border bg-white p-5 shadow-sm ${
                  selected?.id === campaign.id
                    ? "border-blue-400 ring-4 ring-blue-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={async () => {
                      setSelected(campaign);
                      await loadCustomers(campaign);
                    }}
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-red-600">
                      {campaign.code}
                    </p>
                    <h3 className="mt-1 truncate text-xl font-black text-[#061b3a]">
                      {campaign.name}
                    </h3>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCampaign(campaign)}
                    className="rounded-xl bg-red-50 p-2 text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Descuento" value={`$${Number(campaign.discount_amount).toFixed(2)}`} />
                  <Stat label="Límite" value={String(campaign.authorized_limit)} />
                  <Stat
                    label="Estado"
                    value={campaign.is_active ? "Activa" : "Inactiva"}
                  />
                  <Stat
                    label="Vence"
                    value={new Date(campaign.expires_at).toLocaleDateString("es-US")}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Límite autorizado"
                    type="number"
                    value={String(campaign.authorized_limit)}
                    onChange={(value) =>
                      setCampaigns((prev) =>
                        prev.map((item) =>
                          item.id === campaign.id
                            ? { ...item, authorized_limit: Number(value || 0) }
                            : item
                        )
                      )
                    }
                  />

                  <label className="flex items-center gap-3 rounded-2xl border px-4 py-3 font-bold">
                    <input
                      type="checkbox"
                      checked={campaign.is_active}
                      onChange={(event) =>
                        setCampaigns((prev) =>
                          prev.map((item) =>
                            item.id === campaign.id
                              ? { ...item, is_active: event.target.checked }
                              : item
                          )
                        )
                      }
                    />
                    Activa
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveCampaign(campaign)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#061b3a] px-4 py-2.5 font-black text-white"
                >
                  <Save size={17} />
                  Guardar cambios
                </button>
              </article>
            ))}
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            {!selected ? (
              <div className="py-16 text-center">
                <TicketPercent className="mx-auto text-slate-300" size={42} />
                <p className="mt-4 font-bold text-slate-500">
                  Selecciona una campaña para administrar teléfonos.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-red-600">
                      {selected.code}
                    </p>
                    <h2 className="text-xl font-black text-[#061b3a]">
                      Clientes autorizados
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(selected.code)}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black"
                  >
                    <Copy size={16} />
                    Copiar código
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <label className="text-sm font-black text-[#061b3a]">
                    Agregar teléfonos
                  </label>
                  <textarea
                    value={phonesText}
                    onChange={(e) => setPhonesText(e.target.value)}
                    rows={5}
                    placeholder={"3051111111\n3052222222\n3053333333"}
                    className="mt-2 w-full rounded-2xl border bg-white p-3 outline-none"
                  />
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Puedes pegarlos separados por línea, coma o punto y coma.
                  </p>

                  <button
                    type="button"
                    onClick={handleAddPhones}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-black text-white"
                  >
                    <UserPlus size={18} />
                    Asociar teléfonos
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {customers.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                      Todavía no hay teléfonos autorizados.
                    </p>
                  ) : (
                    customers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-black text-[#061b3a]">
                            {customer.customer_phone}
                          </p>
                          <p
                            className={`mt-1 text-xs font-bold ${
                              customer.status === "available"
                                ? "text-green-600"
                                : customer.status === "used"
                                ? "text-blue-600"
                                : "text-red-600"
                            }`}
                          >
                            {customer.status === "available"
                              ? "Disponible"
                              : customer.status === "used"
                              ? "Usado"
                              : "Revocado"}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {customer.status !== "used" && (
                            <button
                              type="button"
                              onClick={async () => {
                                const next =
                                  customer.status === "available"
                                    ? "revoked"
                                    : "available";

                                await updateCampaignCustomerStatus(
                                  customer.id,
                                  customer.store_id,
                                  next
                                );
                                await loadCustomers(selected);
                              }}
                              className="rounded-xl bg-slate-100 p-2"
                              aria-label="Cambiar estado"
                            >
                              {customer.status === "available" ? (
                                <XCircle size={18} className="text-red-600" />
                              ) : (
                                <CheckCircle2 size={18} className="text-green-600" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm("¿Eliminar este teléfono?")) return;
                              await removeCampaignCustomer(
                                customer.id,
                                customer.store_id
                              );
                              await loadCustomers(selected);
                            }}
                            className="rounded-xl bg-red-50 p-2 text-red-600"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-600">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border bg-white px-4 py-3 outline-none"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-[#061b3a]">{value}</p>
    </div>
  );
}
