"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Save,
  TicketPercent,
  Trash2,
  UserPlus,
  Users,
  MessageCircle,
  X,
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

const initialCreateForm = {
  name: "",
  code: "",
  discount_amount: "10",
  authorized_limit: "50",
  expires_at: "",
  is_active: true,
};

type CampaignEditForm = {
  name: string;
  code: string;
  discount_amount: string;
  authorized_limit: string;
  expires_at: string;
  is_active: boolean;
};

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 16);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}


function normalizeWhatsappPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  // Los teléfonos de EE. UU. guardados con 10 dígitos necesitan el prefijo 1.
  if (digits.length === 10) {
    return `1${digits}`;
  }

  return digits;
}

function buildStorePurchaseUrl(
  store: {
    slug?: string | null;
    domain?: string | null;
    subdomain?: string | null;
  } | null
) {
  if (!store) return "https://perlamarketplace.com";

  const cleanDomain = store.domain
    ?.replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

  if (cleanDomain) {
    return `https://${cleanDomain}/tienda`;
  }

  if (store.subdomain) {
    return `https://${store.subdomain}.perlamarketplace.com`;
  }

  if (store.slug) {
    return `https://perlamarketplace.com/tienda/${store.slug}`;
  }

  return "https://perlamarketplace.com";
}

export default function DiscountsAdminPage() {
  const {
    isSuperAdmin,
    store: accessStore,
    loading: accessLoading,
  } = useAdminAccess();

  const {
    store: selectedStore,
    loading: storeLoading,
  } = useStore();

  const activeStore = useMemo(() => {
    return isSuperAdmin
      ? selectedStore || accessStore
      : accessStore;
  }, [isSuperAdmin, selectedStore, accessStore]);

  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] =
    useState<DiscountCampaign | null>(null);

  const [customers, setCustomers] = useState<
    DiscountCampaignCustomer[]
  >([]);

  const [createForm, setCreateForm] =
    useState(initialCreateForm);

  const [editForm, setEditForm] =
    useState<CampaignEditForm | null>(null);

  const [phonesText, setPhonesText] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingCustomers, setLoadingCustomers] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addingPhones, setAddingPhones] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const availableCount = customers.filter(
    (customer) => customer.status === "available"
  ).length;

  const usedCount = customers.filter(
    (customer) => customer.status === "used"
  ).length;

  const revokedCount = customers.filter(
    (customer) => customer.status === "revoked"
  ).length;

  async function loadCampaigns(
    autoSelectCampaignId?: string
  ) {
    if (!activeStore?.id) {
      setCampaigns([]);
      setSelectedCampaign(null);
      setCustomers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await getDiscountCampaigns(
        activeStore.id
      );

      if (error) {
        setCampaigns([]);
        setFeedback({
          type: "error",
          message: error.message,
        });
        return;
      }

      const nextCampaigns = data || [];
      setCampaigns(nextCampaigns);

      const campaignToSelect =
        nextCampaigns.find(
          (item) => item.id === autoSelectCampaignId
        ) ||
        nextCampaigns.find(
          (item) => item.id === selectedCampaign?.id
        ) ||
        null;

      if (campaignToSelect) {
        setSelectedCampaign(campaignToSelect);
        await loadCustomers(campaignToSelect);
      } else {
        setSelectedCampaign(null);
        setCustomers([]);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "No se pudieron cargar las campañas."
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers(
    campaign: DiscountCampaign
  ) {
    setLoadingCustomers(true);

    try {
      const { data, error } = await getCampaignCustomers(
        campaign.id,
        campaign.store_id
      );

      if (error) {
        setFeedback({
          type: "error",
          message: error.message,
        });
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "No se pudieron cargar los teléfonos."
        ),
      });
    } finally {
      setLoadingCustomers(false);
    }
  }

  useEffect(() => {
    if (accessLoading || storeLoading) return;

    void loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accessLoading,
    storeLoading,
    activeStore?.id,
  ]);

  function openEditCampaign(
    campaign: DiscountCampaign
  ) {
    setSelectedCampaign(campaign);

    setEditForm({
      name: campaign.name,
      code: campaign.code,
      discount_amount: String(
        campaign.discount_amount
      ),
      authorized_limit: String(
        campaign.authorized_limit
      ),
      expires_at: toLocalDateTimeInput(
        campaign.expires_at
      ),
      is_active: campaign.is_active,
    });
  }

  async function handleSelectCampaign(
    campaign: DiscountCampaign
  ) {
    setSelectedCampaign(campaign);
    setEditForm(null);
    setFeedback(null);
    await loadCustomers(campaign);
  }

  async function handleCreate() {
    if (!activeStore?.id) return;

    if (
      !createForm.name.trim() ||
      !createForm.code.trim() ||
      !createForm.expires_at
    ) {
      setFeedback({
        type: "error",
        message:
          "Completa nombre, código y fecha de vencimiento.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const { data, error } =
        await createDiscountCampaign(
          activeStore.id,
          {
            name: createForm.name.trim(),
            code: createForm.code,
            discount_amount: Number(
              createForm.discount_amount || 10
            ),
            authorized_limit: Number(
              createForm.authorized_limit || 50
            ),
            expires_at: new Date(
              createForm.expires_at
            ).toISOString(),
            is_active: createForm.is_active,
          }
        );

      if (error) {
        setFeedback({
          type: "error",
          message: error.message,
        });
        return;
      }

      setCreateForm(initialCreateForm);

      setFeedback({
        type: "success",
        message:
          "Campaña creada. Ya puedes agregar teléfonos autorizados.",
      });

      if (data?.id) {
        await loadCampaigns(data.id);
      } else {
        await loadCampaigns();
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "No se pudo crear la campaña."
        ),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (
      !selectedCampaign ||
      !editForm
    ) {
      return;
    }

    const nextLimit = Number(
      editForm.authorized_limit || 0
    );

    if (nextLimit < customers.length) {
      setFeedback({
        type: "error",
        message: `El límite no puede ser menor que los ${customers.length} teléfonos ya asociados.`,
      });
      return;
    }

    if (
      !editForm.name.trim() ||
      !editForm.code.trim() ||
      !editForm.expires_at
    ) {
      setFeedback({
        type: "error",
        message:
          "Completa nombre, código y fecha de vencimiento.",
      });
      return;
    }

    setSavingEdit(true);
    setFeedback(null);

    try {
      const { data, error } =
        await updateDiscountCampaign(
          selectedCampaign.id,
          selectedCampaign.store_id,
          {
            name: editForm.name.trim(),
            code: editForm.code,
            discount_amount: Number(
              editForm.discount_amount || 10
            ),
            authorized_limit: nextLimit,
            expires_at: new Date(
              editForm.expires_at
            ).toISOString(),
            is_active: editForm.is_active,
          }
        );

      if (error) {
        setFeedback({
          type: "error",
          message: error.message,
        });
        return;
      }

      setEditForm(null);

      setFeedback({
        type: "success",
        message: "Campaña actualizada correctamente.",
      });

      await loadCampaigns(
        data?.id || selectedCampaign.id
      );
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "No se pudo actualizar la campaña."
        ),
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAddPhones() {
    if (!selectedCampaign) return;

    if (!phonesText.trim()) {
      setFeedback({
        type: "error",
        message:
          "Escribe o pega al menos un teléfono.",
      });
      return;
    }

    setAddingPhones(true);
    setFeedback(null);

    try {
      const phones = phonesText.split(
        /[\n,;]+/g
      );

      const { error } = await addCampaignPhones(
        selectedCampaign,
        phones
      );

      if (error) {
        setFeedback({
          type: "error",
          message: error.message,
        });
        return;
      }

      setPhonesText("");

      setFeedback({
        type: "success",
        message:
          "Teléfonos asociados correctamente.",
      });

      await loadCustomers(selectedCampaign);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "No se pudieron asociar los teléfonos."
        ),
      });
    } finally {
      setAddingPhones(false);
    }
  }

  async function handleDeleteCampaign(
    campaign: DiscountCampaign
  ) {
    const confirmed = window.confirm(
      `¿Eliminar la campaña "${campaign.name}"?`
    );

    if (!confirmed) return;

    const { error } =
      await deleteDiscountCampaign(
        campaign.id,
        campaign.store_id
      );

    if (error) {
      setFeedback({
        type: "error",
        message: error.message,
      });
      return;
    }

    if (
      selectedCampaign?.id === campaign.id
    ) {
      setSelectedCampaign(null);
      setCustomers([]);
      setEditForm(null);
    }

    setFeedback({
      type: "success",
      message: "Campaña eliminada.",
    });

    await loadCampaigns();
  }


  function shareCouponByWhatsapp(
    customer: DiscountCampaignCustomer
  ) {
    if (!selectedCampaign || !activeStore) return;

    if (customer.status !== "available") {
      setFeedback({
        type: "error",
        message:
          "Solo puedes enviar instrucciones de un bono que todavía esté disponible.",
      });
      return;
    }

    const whatsappPhone = normalizeWhatsappPhone(
      customer.customer_phone
    );

    if (!whatsappPhone) {
      setFeedback({
        type: "error",
        message: "El teléfono asociado no es válido.",
      });
      return;
    }

    const storeInfo = activeStore as typeof activeStore & {
      slug?: string | null;
      domain?: string | null;
      subdomain?: string | null;
    };

    const storeUrl = buildStorePurchaseUrl(storeInfo);
    const discountAmount = Number(
      selectedCampaign.discount_amount || 0
    ).toFixed(2);

    const message = [
      `Hola 👋 Tienes un bono de descuento de $${discountAmount} en ${activeStore.name}.`,
      "",
      `🎟️ Código promocional: ${selectedCampaign.code}`,
      `📱 Teléfono autorizado: ${customer.customer_phone}`,
      `📅 Válido hasta: ${new Date(
        selectedCampaign.expires_at
      ).toLocaleDateString("es-US")}`,
      "",
      "Cómo usar tu bono:",
      `1. Entra a la tienda: ${storeUrl}`,
      "2. Agrega los productos que deseas al carrito.",
      "3. Continúa al checkout.",
      `4. En el teléfono del comprador escribe exactamente: ${customer.customer_phone}`,
      `5. En la sección “¿Tienes un bono?” escribe: ${selectedCampaign.code}`,
      "6. Pulsa “Aplicar” y verifica que el descuento aparezca antes de enviar el pedido.",
      "",
      "Importante: este bono es válido una sola vez y únicamente con el teléfono indicado.",
    ].join("\n");

    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
      message
    )}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (
    accessLoading ||
    storeLoading ||
    loading
  ) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-center">
          <Loader2 className="mx-auto animate-spin" />
          <p className="mt-3 font-bold text-slate-500">
            Cargando bonos...
          </p>
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
            <TicketPercent size={30} />

            <div>
              <p className="text-sm font-bold text-blue-100">
                Marketing
              </p>

              <h1 className="text-3xl font-black">
                Bonos de descuento
              </h1>

              <p className="mt-2 text-blue-100">
                Crea campañas y administra los teléfonos autorizados de forma clara.
              </p>
            </div>
          </div>
        </section>

        {feedback && (
          <div
            className={`rounded-2xl border px-4 py-3 font-bold ${
              feedback.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#061b3a]">
            Crear campaña
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Nombre"
              value={createForm.name}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  name: value,
                }))
              }
              placeholder="Primera compra"
            />

            <Field
              label="Código"
              value={createForm.code}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  code: value.toUpperCase(),
                }))
              }
              placeholder="PRIMERA10"
            />

            <Field
              label="Descuento fijo ($)"
              type="number"
              value={createForm.discount_amount}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  discount_amount: value,
                }))
              }
            />

            <Field
              label="Cantidad autorizada"
              type="number"
              value={createForm.authorized_limit}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  authorized_limit: value,
                }))
              }
            />

            <Field
              label="Vence"
              type="datetime-local"
              value={createForm.expires_at}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  expires_at: value,
                }))
              }
            />

            <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 font-bold">
              <input
                type="checkbox"
                checked={createForm.is_active}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    is_active:
                      event.target.checked,
                  }))
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
            {saving ? (
              <Loader2
                className="animate-spin"
                size={18}
              />
            ) : (
              <Plus size={18} />
            )}

            Crear campaña
          </button>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#061b3a]">
                Campañas creadas
              </h2>

              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                {campaigns.length}
              </span>
            </div>

            {campaigns.length === 0 ? (
              <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                <TicketPercent
                  className="mx-auto text-slate-300"
                  size={42}
                />

                <p className="mt-4 font-bold text-slate-500">
                  Todavía no hay campañas.
                </p>
              </div>
            ) : (
              campaigns.map((campaign) => (
                <article
                  key={campaign.id}
                  className={`rounded-3xl border bg-white p-5 shadow-sm transition ${
                    selectedCampaign?.id ===
                    campaign.id
                      ? "border-blue-400 ring-4 ring-blue-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-red-600">
                        {campaign.code}
                      </p>

                      <h3 className="mt-1 truncate text-xl font-black text-[#061b3a]">
                        {campaign.name}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteCampaign(
                          campaign
                        )
                      }
                      className="rounded-xl bg-red-50 p-2 text-red-600"
                      aria-label={`Eliminar ${campaign.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Stat
                      label="Descuento"
                      value={`$${Number(
                        campaign.discount_amount
                      ).toFixed(2)}`}
                    />

                    <Stat
                      label="Límite"
                      value={String(
                        campaign.authorized_limit
                      )}
                    />

                    <Stat
                      label="Estado"
                      value={
                        campaign.is_active
                          ? "Activa"
                          : "Inactiva"
                      }
                    />

                    <Stat
                      label="Vence"
                      value={new Date(
                        campaign.expires_at
                      ).toLocaleDateString(
                        "es-US"
                      )}
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleSelectCampaign(
                          campaign
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 font-black text-white"
                    >
                      <Users size={18} />
                      Administrar teléfonos
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openEditCampaign(campaign)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-[#061b3a]"
                    >
                      <Pencil size={18} />
                      Editar campaña
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        campaign.code
                      )
                    }
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                  >
                    <Copy size={17} />
                    Copiar código
                  </button>
                </article>
              ))
            )}
          </div>

          <div className="space-y-6">
            {editForm &&
              selectedCampaign && (
                <section className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                        Edición
                      </p>

                      <h2 className="text-xl font-black text-[#061b3a]">
                        Editar campaña
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditForm(null)
                      }
                      className="rounded-xl bg-slate-100 p-2 text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Nombre"
                      value={editForm.name}
                      onChange={(value) =>
                        setEditForm((current) =>
                          current
                            ? {
                                ...current,
                                name: value,
                              }
                            : current
                        )
                      }
                    />

                    <Field
                      label="Código"
                      value={editForm.code}
                      onChange={(value) =>
                        setEditForm((current) =>
                          current
                            ? {
                                ...current,
                                code:
                                  value.toUpperCase(),
                              }
                            : current
                        )
                      }
                    />

                    <Field
                      label="Descuento fijo ($)"
                      type="number"
                      value={
                        editForm.discount_amount
                      }
                      onChange={(value) =>
                        setEditForm((current) =>
                          current
                            ? {
                                ...current,
                                discount_amount:
                                  value,
                              }
                            : current
                        )
                      }
                    />

                    <Field
                      label="Cantidad autorizada"
                      type="number"
                      value={
                        editForm.authorized_limit
                      }
                      onChange={(value) =>
                        setEditForm((current) =>
                          current
                            ? {
                                ...current,
                                authorized_limit:
                                  value,
                              }
                            : current
                        )
                      }
                    />

                    <Field
                      label="Vence"
                      type="datetime-local"
                      value={editForm.expires_at}
                      onChange={(value) =>
                        setEditForm((current) =>
                          current
                            ? {
                                ...current,
                                expires_at: value,
                              }
                            : current
                        )
                      }
                    />

                    <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 font-bold">
                      <input
                        type="checkbox"
                        checked={
                          editForm.is_active
                        }
                        onChange={(event) =>
                          setEditForm((current) =>
                            current
                              ? {
                                  ...current,
                                  is_active:
                                    event.target
                                      .checked,
                                }
                              : current
                          )
                        }
                      />

                      Campaña activa
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 font-black text-white disabled:opacity-60"
                  >
                    {savingEdit ? (
                      <Loader2
                        className="animate-spin"
                        size={18}
                      />
                    ) : (
                      <Save size={18} />
                    )}

                    Guardar cambios
                  </button>
                </section>
              )}

            <section className="rounded-3xl bg-white p-5 shadow-sm">
              {!selectedCampaign ? (
                <div className="py-16 text-center">
                  <Users
                    className="mx-auto text-slate-300"
                    size={42}
                  />

                  <h2 className="mt-4 text-xl font-black text-[#061b3a]">
                    Administra los teléfonos
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
                    Pulsa “Administrar teléfonos” dentro de una campaña.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-red-600">
                        {selectedCampaign.code}
                      </p>

                      <h2 className="text-xl font-black text-[#061b3a]">
                        Clientes autorizados
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {customers.length} de{" "}
                        {
                          selectedCampaign.authorized_limit
                        } teléfonos asociados
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          selectedCampaign.code
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-black"
                    >
                      <Copy size={16} />
                      Copiar código
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Stat
                      label="Disponibles"
                      value={String(availableCount)}
                    />

                    <Stat
                      label="Usados"
                      value={String(usedCount)}
                    />

                    <Stat
                      label="Revocados"
                      value={String(revokedCount)}
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <label className="text-sm font-black text-[#061b3a]">
                      Agregar teléfonos
                    </label>

                    <textarea
                      value={phonesText}
                      onChange={(event) =>
                        setPhonesText(
                          event.target.value
                        )
                      }
                      rows={5}
                      placeholder={
                        "3051111111\n3052222222\n3053333333"
                      }
                      className="mt-2 w-full rounded-2xl border bg-white p-3 outline-none"
                    />

                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Puedes pegarlos separados por línea, coma o punto y coma.
                    </p>

                    <button
                      type="button"
                      onClick={handleAddPhones}
                      disabled={addingPhones}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-black text-white disabled:opacity-60"
                    >
                      {addingPhones ? (
                        <Loader2
                          className="animate-spin"
                          size={18}
                        />
                      ) : (
                        <UserPlus size={18} />
                      )}

                      Asociar teléfonos
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {loadingCustomers ? (
                      <div className="rounded-2xl bg-slate-50 p-5 text-center">
                        <Loader2 className="mx-auto animate-spin" />
                        <p className="mt-2 text-sm font-bold text-slate-500">
                          Cargando teléfonos...
                        </p>
                      </div>
                    ) : customers.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                        Todavía no hay teléfonos autorizados.
                      </p>
                    ) : (
                      customers.map(
                        (customer) => (
                          <div
                            key={customer.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border p-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-black text-[#061b3a]">
                                {
                                  customer.customer_phone
                                }
                              </p>

                              <p
                                className={`mt-1 text-xs font-bold ${
                                  customer.status ===
                                  "available"
                                    ? "text-green-600"
                                    : customer.status ===
                                      "used"
                                    ? "text-blue-600"
                                    : "text-red-600"
                                }`}
                              >
                                {customer.status ===
                                "available"
                                  ? "Disponible"
                                  : customer.status ===
                                    "used"
                                  ? "Usado"
                                  : "Revocado"}
                              </p>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  shareCouponByWhatsapp(
                                    customer
                                  )
                                }
                                disabled={
                                  customer.status !==
                                  "available"
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                aria-label={`Enviar bono por WhatsApp a ${customer.customer_phone}`}
                                title={
                                  customer.status ===
                                  "available"
                                    ? "Enviar instrucciones por WhatsApp"
                                    : "Este bono ya no está disponible"
                                }
                              >
                                <MessageCircle
                                  size={17}
                                />
                                <span className="hidden sm:inline">
                                  Enviar bono
                                </span>
                              </button>

                              {customer.status !==
                                "used" && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextStatus =
                                      customer.status ===
                                      "available"
                                        ? "revoked"
                                        : "available";

                                    await updateCampaignCustomerStatus(
                                      customer.id,
                                      customer.store_id,
                                      nextStatus
                                    );

                                    await loadCustomers(
                                      selectedCampaign
                                    );
                                  }}
                                  className="rounded-xl bg-slate-100 p-2"
                                  aria-label="Cambiar estado"
                                >
                                  {customer.status ===
                                  "available" ? (
                                    <XCircle
                                      size={18}
                                      className="text-red-600"
                                    />
                                  ) : (
                                    <CheckCircle2
                                      size={18}
                                      className="text-green-600"
                                    />
                                  )}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmed =
                                    window.confirm(
                                      "¿Eliminar este teléfono?"
                                    );

                                  if (!confirmed)
                                    return;

                                  await removeCampaignCustomer(
                                    customer.id,
                                    customer.store_id
                                  );

                                  await loadCustomers(
                                    selectedCampaign
                                  );
                                }}
                                className="rounded-xl bg-red-50 p-2 text-red-600"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </>
              )}
            </section>
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
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-2xl border bg-white px-4 py-3 outline-none"
      />
    </label>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-black text-[#061b3a]">
        {value}
      </p>
    </div>
  );
}
