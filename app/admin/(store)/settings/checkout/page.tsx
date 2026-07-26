"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Eye,
  Loader2,
  Map,
  MapPin,
  MessageCircle,
  PackageCheck,
  Save,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  getCheckoutSettings,
  saveCheckoutSettings,
} from "@/lib/checkout/settings-service";
import {
  type CheckoutBlocks,
  type CheckoutMethod,
  type CheckoutSettings,
} from "@/lib/checkout/types";

const methodOptions = [
  {
    key: "delivery" as const,
    title: "Entrega a domicilio",
    description: "Para tiendas locales, restaurantes, floristerías y delivery.",
    icon: Truck,
  },
  {
    key: "cuba" as const,
    title: "Enviar a Cuba",
    description: "Mantiene destinatario, municipio, zona y dirección.",
    icon: PackageCheck,
  },
  {
    key: "pickup" as const,
    title: "Recoger en tienda",
    description: "Permite elegir fecha y hora de recogida.",
    icon: Store,
  },
];

const blockOptions: Array<{
  key: keyof CheckoutBlocks;
  label: string;
  icon: typeof UserRound;
}> = [
  { key: "customer", label: "Información del cliente", icon: UserRound },
  { key: "recipient", label: "Datos del destinatario", icon: PackageCheck },
  { key: "address", label: "Dirección", icon: MapPin },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "coupon", label: "Cupón", icon: CircleDollarSign },
  { key: "notes", label: "Notas", icon: ClipboardList },
  { key: "summary", label: "Resumen", icon: ShoppingBag },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`relative h-7 w-12 rounded-full transition ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function isMethodEnabled(settings: CheckoutSettings, method: CheckoutMethod) {
  if (method === "delivery") return settings.enabled_delivery;
  if (method === "cuba") return settings.enabled_cuba;
  return settings.enabled_pickup;
}

export default function CheckoutBuilderPage() {
  const { store: accessStore, loading: accessLoading, error: accessError } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const store = accessStore || selectedStore;
  const [settings, setSettings] = useState<CheckoutSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (accessLoading || storeLoading) return;
      if (!store?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await getCheckoutSettings(store.id);
      setSettings(result.data);
      if (result.error) setError(result.error);
      setLoading(false);
    }

    void load();
  }, [accessLoading, storeLoading, store?.id]);

  const enabledMethods = useMemo(() => {
    if (!settings) return [];
    return methodOptions.filter((method) => isMethodEnabled(settings, method.key));
  }, [settings]);

  function update<K extends keyof CheckoutSettings>(key: K, value: CheckoutSettings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    setMessage("");
    setError("");
  }

  function toggleMethod(method: CheckoutMethod) {
    if (!settings) return;
    const next = { ...settings };
    if (method === "delivery") next.enabled_delivery = !settings.enabled_delivery;
    if (method === "cuba") next.enabled_cuba = !settings.enabled_cuba;
    if (method === "pickup") next.enabled_pickup = !settings.enabled_pickup;

    const stillEnabled = methodOptions
      .filter((item) => isMethodEnabled(next, item.key))
      .map((item) => item.key);

    if (stillEnabled.length === 0) {
      setError("El checkout necesita al menos un método activo.");
      return;
    }

    if (!stillEnabled.includes(next.default_method)) {
      next.default_method = stillEnabled[0];
    }

    setSettings(next);
    setMessage("");
    setError("");
  }

  function toggleBlock(key: keyof CheckoutBlocks) {
    if (!settings) return;
    update("blocks", { ...settings.blocks, [key]: !settings.blocks[key] });
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    setError("");

    const result = await saveCheckoutSettings(settings);
    if (result.error || !result.data) {
      setError(result.error || "No se pudo guardar la configuración.");
    } else {
      setSettings(result.data);
      setMessage("Checkout Builder guardado correctamente.");
    }
    setSaving(false);
  }

  if (accessLoading || storeLoading || loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Cargando Checkout Builder...
        </div>
      </main>
    );
  }

  if (!store?.id || accessError) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          No se pudo identificar la tienda activa. {accessError || ""}
        </div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          No se pudo cargar la configuración. Recarga la página después de ejecutar la migración SQL.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AdminBackButton />
        <AdminPageHeader
          title="Checkout Builder"
          description="Configura cómo cada tienda recibe pedidos sin tocar código. En esta primera fase no se modifica todavía el checkout público."
          badge="V17.0"
          icon={ShoppingBag}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0B1F4D]">Métodos de entrega</h2>
              <p className="mt-1 text-sm text-slate-500">Activa uno, dos o los tres métodos.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {methodOptions.map((method) => {
                  const Icon = method.icon;
                  const enabled = isMethodEnabled(settings, method.key);
                  return (
                    <div key={method.key} className={`rounded-3xl border p-5 transition ${enabled ? "border-blue-300 bg-blue-50/50" : "border-slate-200"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${enabled ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <Icon size={22} />
                        </div>
                        <Toggle checked={enabled} onChange={() => toggleMethod(method.key)} />
                      </div>
                      <h3 className="mt-4 font-bold text-[#0B1F4D]">{method.title}</h3>
                      <p className="mt-2 text-sm leading-5 text-slate-500">{method.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="text-sm font-bold text-[#0B1F4D]">Método predeterminado</label>
                <select
                  value={settings.default_method}
                  onChange={(e) => update("default_method", e.target.value as CheckoutMethod)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {enabledMethods.map((method) => (
                    <option key={method.key} value={method.key}>{method.title}</option>
                  ))}
                </select>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0B1F4D]">Direcciones</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <AddressModeCard
                  title="Entrega a domicilio"
                  value={settings.delivery_address_mode}
                  onChange={(value) => update("delivery_address_mode", value)}
                  disabled={!settings.enabled_delivery}
                />
                <AddressModeCard
                  title="Enviar a Cuba"
                  value={settings.cuba_address_mode}
                  onChange={(value) => update("cuba_address_mode", value)}
                  disabled={!settings.enabled_cuba}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0B1F4D]">Bloques visibles</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {blockOptions.map((block) => {
                  const Icon = block.icon;
                  return (
                    <div key={block.key} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-3">
                        <Icon size={19} className="text-blue-600" />
                        <span className="font-semibold text-slate-700">{block.label}</span>
                      </div>
                      <Toggle checked={settings.blocks[block.key]} onChange={() => toggleBlock(block.key)} />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0B1F4D]">Costo de delivery</h2>
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-bold text-slate-700">Mostrar delivery en el resumen</p>
                  <p className="text-sm text-slate-500">La conexión real se hará en V17.1 sobre una tienda de prueba.</p>
                </div>
                <Toggle checked={settings.show_delivery_price} onChange={() => update("show_delivery_price", !settings.show_delivery_price)} />
              </div>
              <label className="mt-5 block text-sm font-bold text-[#0B1F4D]">Costo fijo opcional</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.fixed_delivery_fee}
                onChange={(e) => update("fixed_delivery_fee", Number(e.target.value || 0))}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </section>

            {(message || error) && (
              <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {error || message}
              </div>
            )}

            <div className="flex justify-end">
              <AdminButton onClick={handleSave} disabled={saving} icon={Save}>
                {saving ? "Guardando..." : "Guardar Checkout Builder"}
              </AdminButton>
            </div>
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <CheckoutPreview settings={settings} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function AddressModeCard({ title, value, onChange, disabled }: {
  title: string;
  value: "free" | "zones";
  onChange: (value: "free" | "zones") => void;
  disabled: boolean;
}) {
  return (
    <div className={`rounded-3xl border border-slate-200 p-5 ${disabled ? "opacity-50" : ""}`}>
      <h3 className="font-bold text-[#0B1F4D]">{title}</h3>
      <div className="mt-4 space-y-3">
        {[
          { value: "free" as const, label: "Dirección libre", icon: MapPin },
          { value: "zones" as const, label: "Provincias y zonas", icon: Map },
        ].map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
            >
              <span className="flex items-center gap-3 font-semibold text-slate-700"><Icon size={18} />{option.label}</span>
              {selected && <Check size={18} className="text-blue-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckoutPreview({ settings }: { settings: CheckoutSettings }) {
  const activeMethod = methodOptions.find((method) => method.key === settings.default_method) || methodOptions[0];
  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-r from-[#0B1F4D] to-[#2563EB] p-6 text-white">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-100"><Eye size={17} /> Vista previa en tiempo real</div>
        <h2 className="mt-2 text-2xl font-bold">Finalizar pedido</h2>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">¿Cómo deseas recibir tu pedido?</p>
          <div className="mt-3 space-y-2">
            {methodOptions.filter((method) => isMethodEnabled(settings, method.key)).map((method) => (
              <div key={method.key} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-sm font-semibold ${method.key === settings.default_method ? "border-blue-500 bg-white text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>
                {method.title}<ChevronRight size={16} />
              </div>
            ))}
          </div>
        </div>

        {settings.blocks.customer && <PreviewBlock title="Información del cliente" fields={["Nombre", "Teléfono", "Email"]} />}
        {settings.blocks.recipient && activeMethod.key === "cuba" && <PreviewBlock title="Datos del destinatario" fields={["Destinatario", "Teléfono destinatario"]} />}
        {settings.blocks.address && activeMethod.key !== "pickup" && (
          <PreviewBlock
            title="Dirección"
            fields={(activeMethod.key === "cuba" ? settings.cuba_address_mode : settings.delivery_address_mode) === "zones" ? ["Provincia", "Municipio", "Zona", "Dirección"] : ["Dirección", "Ciudad", "Referencia"]}
          />
        )}
        {activeMethod.key === "pickup" && <PreviewBlock title="Recogida" fields={["Fecha", "Hora"]} />}
        {settings.blocks.notes && <PreviewBlock title="Notas" fields={["Escribe una nota opcional..."]} />}
        {settings.blocks.summary && (
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>$32.00</span></div>
            {settings.show_delivery_price && <div className="mt-2 flex justify-between text-sm text-slate-500"><span>Delivery</span><span>${settings.fixed_delivery_fee.toFixed(2)}</span></div>}
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold text-[#0B1F4D]"><span>Total</span><span>${(32 + (settings.show_delivery_price ? settings.fixed_delivery_fee : 0)).toFixed(2)}</span></div>
          </div>
        )}
        {settings.blocks.whatsapp && <div className="rounded-2xl bg-green-600 px-4 py-3 text-center font-bold text-white">Enviar pedido por WhatsApp</div>}
      </div>
    </section>
  );
}

function PreviewBlock({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h3 className="font-bold text-[#0B1F4D]">{title}</h3>
      <div className="mt-3 space-y-2">
        {fields.map((field) => <div key={field} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">{field}</div>)}
      </div>
    </div>
  );
}
