"use client";

/* =========================================================
   CHECKOUT - TIENDA PÚBLICA

   Incluye:
   - Información del cliente que compra
   - Información de la persona que recibe en Cuba
   - Municipio y zona de entrega
   - Dirección exacta
   - Reglas reales de domicilio por zona
   - Validación de inventario
   - Creación de orden
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import {
  getActiveDeliveryZones,
  type DeliveryZone,
} from "@/lib/services/settings";
import {
  processOrderInventory,
  validateOrderStock,
} from "@/lib/services/inventory";

/* =========================================================
   MUNICIPIOS FIJOS DE CIENFUEGOS

   Aunque un municipio todavía no tenga zonas creadas,
   se muestra en el checkout para que el usuario vea todas
   las opciones reales de la provincia.
========================================================= */

const MUNICIPALITIES = [
  "Cienfuegos",
  "Aguada de Pasajeros",
  "Rodas",
  "Palmira",
  "Lajas",
  "Cruces",
  "Cumanayagua",
  "Abreus",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",

    recipient_name: "",
    recipient_phone: "",
    recipient_phone_alt: "",

    municipality: "",
    delivery_zone_id: "",
    exact_address: "",
    notes: "",
  });

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);

  useEffect(() => {
    async function loadZones() {
      try {
        setLoadingZones(true);

        const { data, error } = await getActiveDeliveryZones();

        if (error) throw error;

        setZones(data || []);
      } catch (err: any) {
        console.error("ERROR CARGANDO ZONAS:", err);
        setError("No se pudieron cargar las zonas de entrega.");
      } finally {
        setLoadingZones(false);
      }
    }

    loadZones();
  }, []);

  const availableZones = useMemo(() => {
    if (!form.municipality) return [];

    return zones.filter((zone) => zone.municipality === form.municipality);
  }, [zones, form.municipality]);

  const selectedZone = useMemo(() => {
    return zones.find((zone) => zone.id === form.delivery_zone_id) || null;
  }, [zones, form.delivery_zone_id]);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const minimumOrder = Number(selectedZone?.minimum_order || 0);
  const baseDeliveryFee = Number(selectedZone?.delivery_fee || 0);
  const freeDeliveryFrom = Number(selectedZone?.free_delivery_from || 0);

  const hasFreeDelivery =
    Boolean(selectedZone) && freeDeliveryFrom > 0 && subtotal >= freeDeliveryFrom;

  const shippingCost = selectedZone
    ? hasFreeDelivery
      ? 0
      : baseDeliveryFee
    : 0;

  const finalTotal = subtotal + shippingCost;
  const missingAmount = Math.max(minimumOrder - subtotal, 0);

  const municipalityHasNoZones =
    Boolean(form.municipality) && !loadingZones && availableZones.length === 0;

  const canCheckout =
    cart.length > 0 &&
    Boolean(selectedZone) &&
    subtotal >= minimumOrder &&
    Boolean(form.name) &&
    Boolean(form.email) &&
    Boolean(form.phone) &&
    Boolean(form.recipient_name) &&
    Boolean(form.recipient_phone) &&
    Boolean(form.municipality) &&
    Boolean(form.delivery_zone_id) &&
    Boolean(form.exact_address);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;

    setForm((current) => {
      if (name === "municipality") {
        return {
          ...current,
          municipality: value,
          delivery_zone_id: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  }

  function getOriginalId(cartId: string) {
    return cartId.replace("product-", "").replace("combo-", "");
  }

  async function handleSubmit() {
    setError("");

    if (cart.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    if (!selectedZone) {
      setError("Selecciona una zona de entrega.");
      return;
    }

    if (subtotal < minimumOrder) {
      setError(
        `La compra mínima para esta zona es de $${minimumOrder.toFixed(
          2
        )}. Te faltan $${missingAmount.toFixed(2)}.`
      );
      return;
    }

    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.recipient_name ||
      !form.recipient_phone ||
      !form.municipality ||
      !form.delivery_zone_id ||
      !form.exact_address
    ) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    try {
      setLoading(true);

      let customer = null;

      const { data: existingCustomer, error: existingCustomerError } =
        await supabase
          .from("customers")
          .select("*")
          .eq("email", form.email)
          .maybeSingle();

      if (existingCustomerError) throw existingCustomerError;

      if (existingCustomer) {
        customer = existingCustomer;

        const { error: updateCustomerError } = await supabase
          .from("customers")
          .update({
            name: form.name,
            phone: form.phone,
            city: form.municipality,
          })
          .eq("id", existingCustomer.id);

        if (updateCustomerError) throw updateCustomerError;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: form.name,
            email: form.email,
            phone: form.phone,
            city: form.municipality,
          })
          .select()
          .single();

        if (customerError) throw customerError;

        customer = newCustomer;
      }

      const orderItemsBase = cart.map((item) => {
        const originalId = getOriginalId(item.id);

        return {
          item_type: item.type,
          product_id: item.type === "product" ? originalId : null,
          combo_id: item.type === "combo" ? originalId : null,
          product_name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          subtotal: Number(item.price) * item.quantity,
        };
      });

      await validateOrderStock(orderItemsBase);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customer.id,

          status: "pending",

          subtotal,
          delivery_fee: shippingCost,
          total: finalTotal,

          country: "Cuba",
          state: "Cienfuegos",
          municipality: form.municipality,
          delivery_zone_id: selectedZone.id,
          zone_name: selectedZone.zone_name,
          exact_address: form.exact_address,

          recipient_name: form.recipient_name,
          recipient_phone: form.recipient_phone,
          recipient_phone_alt: form.recipient_phone_alt,

          address: form.exact_address,
          notes: form.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = orderItemsBase.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await processOrderInventory(orderItems);

      clearCart();
      router.push(`/tienda/success?order=${order.id}`);
    } catch (err: any) {
      console.error("ERROR CHECKOUT:", err);
      setError(err?.message || "Ocurrió un error al crear la orden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link
          href="/tienda/cart"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver al carrito
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <UserRound size={20} />
                Información del cliente
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="name"
                  placeholder="Nombre completo *"
                  value={form.name}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black"
                />

                <input
                  name="email"
                  type="email"
                  placeholder="Email *"
                  value={form.email}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black"
                />

                <input
                  name="phone"
                  placeholder="Teléfono *"
                  value={form.phone}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black md:col-span-2"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <Phone size={20} />
                Persona que recibe en Cuba
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="recipient_name"
                  placeholder="Nombre del destinatario *"
                  value={form.recipient_name}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black"
                />

                <input
                  name="recipient_phone"
                  placeholder="Teléfono principal *"
                  value={form.recipient_phone}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black"
                />

                <input
                  name="recipient_phone_alt"
                  placeholder="Teléfono alternativo"
                  value={form.recipient_phone_alt}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black md:col-span-2"
                />
              </div>

              <p className="mt-3 text-sm text-gray-500">
                Estos datos son de la persona que recibirá el pedido en Cuba.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900">
                <MapPin size={20} />
                ¿Dónde la entregamos?
              </h2>

              <p className="mb-5 text-sm text-gray-500">
                País fijo: Cuba · Provincia fija: Cienfuegos
              </p>

              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500">País</p>
                    <p className="font-bold text-gray-900">Cuba</p>
                  </div>

                  <div className="rounded-xl border bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Provincia
                    </p>
                    <p className="font-bold text-gray-900">Cienfuegos</p>
                  </div>
                </div>

                <select
                  name="municipality"
                  value={form.municipality}
                  onChange={handleChange}
                  disabled={loadingZones}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingZones
                      ? "Cargando municipios..."
                      : "Selecciona un municipio *"}
                  </option>

                  {MUNICIPALITIES.map((municipality) => (
                    <option key={municipality} value={municipality}>
                      {municipality}
                    </option>
                  ))}
                </select>

                <select
                  name="delivery_zone_id"
                  value={form.delivery_zone_id}
                  onChange={handleChange}
                  disabled={!form.municipality || municipalityHasNoZones}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black disabled:bg-gray-100"
                >
                  <option value="">
                    {form.municipality
                      ? municipalityHasNoZones
                        ? "Este municipio no tiene zonas configuradas"
                        : "Selecciona una zona *"
                      : "Primero selecciona un municipio"}
                  </option>

                  {availableZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.zone_name}
                    </option>
                  ))}
                </select>

                {municipalityHasNoZones && (
                  <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                    Este municipio todavía no tiene zonas activas. Agrégalas
                    desde Administración → Ajustes → Zonas de entrega.
                  </div>
                )}

                <textarea
                  name="exact_address"
                  placeholder="Tu dirección exacta *"
                  value={form.exact_address}
                  onChange={handleChange}
                  rows={4}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black"
                />

                <textarea
                  name="notes"
                  placeholder="¿Quieres aclararnos algo? Ej: Toque el timbre varias veces..."
                  value={form.notes}
                  onChange={handleChange}
                  rows={4}
                  className="rounded-xl border px-4 py-3 outline-none focus:border-black"
                />
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Resumen de pedido
            </h2>

            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div>
                    <span
                      className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${
                        item.type === "combo"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.type === "combo" ? (
                        <Package size={11} />
                      ) : (
                        <ShoppingBag size={11} />
                      )}
                      {item.type === "combo" ? "Combo" : "Producto"}
                    </span>

                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-gray-500">Cantidad: {item.quantity}</p>
                  </div>

                  <p className="font-semibold">
                    ${(Number(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="my-5 border-t" />

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold">${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-gray-500">
                  <Truck size={15} />
                  Domicilio
                </span>

                <span className="font-bold">
                  {!selectedZone
                    ? "Selecciona zona"
                    : shippingCost === 0
                    ? "Gratis"
                    : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>

              {selectedZone && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                  Zona:{" "}
                  <strong>
                    {form.municipality} / {selectedZone.zone_name}
                  </strong>
                </div>
              )}

              {selectedZone &&
                freeDeliveryFrom > 0 &&
                subtotal < freeDeliveryFrom && (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
                    Te faltan ${(freeDeliveryFrom - subtotal).toFixed(2)} para
                    domicilio gratis en esta zona.
                  </div>
                )}

              {selectedZone && hasFreeDelivery && (
                <div className="rounded-xl bg-green-50 p-3 text-xs font-bold text-green-700">
                  🎉 ¡Tu domicilio es GRATIS!
                </div>
              )}

              {selectedZone && subtotal < minimumOrder && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                  La compra mínima para esta zona es de $
                  {minimumOrder.toFixed(2)}. Te faltan $
                  {missingAmount.toFixed(2)}.
                </div>
              )}
            </div>

            <div className="my-5 border-t" />

            <div className="mb-5 flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !canCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creando orden...
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  Continuar al pago con tarjeta
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-gray-500">
              Por ahora se crea la orden. El próximo paso será Stripe.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}