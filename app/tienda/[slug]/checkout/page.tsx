"use client";

/* =========================================================
   CHECKOUT - TIENDA PÚBLICA

   Refactor profesional:
   - Crea cliente
   - Crea orden
   - Guarda items
   - Descuenta inventario
   - Genera mensaje compacto para WhatsApp
   - Abre WhatsApp app en móvil y WhatsApp Web en escritorio
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";
import {
  getActiveDeliveryZones,
  getStoreSettings,
  type DeliveryZone,
} from "@/lib/services/settings";
import {
  processOrderInventory,
  validateOrderStock,
} from "@/lib/services/inventory";

import { CustomerInfoForm } from "@/components/checkout/CustomerInfoForm";
import { RecipientInfoForm } from "@/components/checkout/RecipientInfoForm";
import { DeliveryAddressForm } from "@/components/checkout/DeliveryAddressForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import type { CheckoutForm } from "@/components/checkout/types";

import {
  buildWhatsappOrderMessage,
  calculateCheckoutTotals,
  getOriginalCartItemId,
  isCheckoutFormComplete,
} from "@/lib/utils/checkout";

const initialForm: CheckoutForm = {
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
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();

  const { store } = useStore();

const isDefaultStore = store?.slug === "aguila";

const cartUrl =
  store?.slug && !isDefaultStore
    ? `/tienda/${store.slug}/cart`
    : "/tienda/cart";

  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [businessWhatsapp, setBusinessWhatsapp] = useState("13054974891");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);

  useEffect(() => {
    async function loadCheckoutData() {
      try {
        setLoadingZones(true);

        const [zonesResponse, settingsResponse] = await Promise.all([
          getActiveDeliveryZones(),
          getStoreSettings(),
        ]);

        if (zonesResponse.error) throw zonesResponse.error;

        setZones(zonesResponse.data || []);

        if (settingsResponse.data?.whatsapp) {
          setBusinessWhatsapp(settingsResponse.data.whatsapp.replace(/\D/g, ""));
        }
      } catch (err: any) {
        console.error("ERROR CARGANDO CHECKOUT:", err);
        setError("No se pudo cargar la información del checkout.");
      } finally {
        setLoadingZones(false);
      }
    }

    loadCheckoutData();
  }, []);

  const availableZones = useMemo(() => {
    if (!form.municipality) return [];

    return zones.filter((zone) => zone.municipality === form.municipality);
  }, [zones, form.municipality]);

  const selectedZone = useMemo(() => {
    return zones.find((zone) => zone.id === form.delivery_zone_id) || null;
  }, [zones, form.delivery_zone_id]);

  const totals = useMemo(() => {
    return calculateCheckoutTotals(cart, selectedZone);
  }, [cart, selectedZone]);

  const municipalityHasNoZones =
    Boolean(form.municipality) && !loadingZones && availableZones.length === 0;

  const canCheckout = isCheckoutFormComplete(
    form,
    cart,
    selectedZone,
    totals
  );

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

  async function createOrUpdateCustomer() {
    const { data: existingCustomer, error: existingCustomerError } =
      await supabase
        .from("customers")
        .select("*")
        .eq("email", form.email)
        .maybeSingle();

    if (existingCustomerError) throw existingCustomerError;

    if (existingCustomer) {
      const { error: updateCustomerError } = await supabase
        .from("customers")
        .update({
          name: form.name,
          phone: form.phone,
          city: form.municipality,
        })
        .eq("id", existingCustomer.id);

      if (updateCustomerError) throw updateCustomerError;

      return existingCustomer;
    }

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

    return newCustomer;
  }

  function buildOrderItemsBase() {
    return cart.map((item) => {
      const originalId = getOriginalCartItemId(item.id);

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
  }

 async function createOrder(customerId: string, zone: DeliveryZone) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      store_id: store?.id,

      status: "pending",
      payment_status: "pending",

        subtotal: totals.subtotal,
        delivery_fee: totals.shippingCost,
        total: totals.finalTotal,

        country: "Cuba",
        state: "Cienfuegos",
        municipality: form.municipality,
        delivery_zone_id: zone.id,
        zone_name: zone.zone_name,
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

    return order;
  }

  function openWhatsappByDevice(whatsappMessage: string, orderNumber: string) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = `whatsapp://send?phone=${businessWhatsapp}&text=${whatsappMessage}`;

      setTimeout(() => {
        router.push(`/pedido/${orderNumber}`);
      }, 2000);

      return;
    }

    window.open(
      `https://web.whatsapp.com/send?phone=${businessWhatsapp}&text=${whatsappMessage}`,
      "_blank"
    );

    router.push(`/pedido/${orderNumber}`);
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

    if (totals.subtotal < totals.minimumOrder) {
      setError(
        `La compra mínima para esta zona es de $${totals.minimumOrder.toFixed(
          2
        )}. Te faltan $${totals.missingAmount.toFixed(2)}.`
      );
      return;
    }

    if (!canCheckout) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    try {
      setLoading(true);

      const customer = await createOrUpdateCustomer();
      const orderItemsBase = buildOrderItemsBase();

      await validateOrderStock(orderItemsBase);

      const order = await createOrder(customer.id, selectedZone);

      const orderItems = orderItemsBase.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await processOrderInventory(orderItems);

      const orderNumber = order.order_number || order.id;
      const origin = window.location.origin;
      const orderUrl = `${origin}/pedido/${orderNumber}`;

      const whatsappMessage = buildWhatsappOrderMessage({
        orderNumber,
        form,
        cart,
        selectedZone,
        subtotal: totals.subtotal,
        shippingCost: totals.shippingCost,
        finalTotal: totals.finalTotal,
        orderUrl,
      });

      clearCart();
      openWhatsappByDevice(whatsappMessage, orderNumber);
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
          href={cartUrl}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver al carrito
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <CustomerInfoForm form={form} onChange={handleChange} />

            <RecipientInfoForm form={form} onChange={handleChange} />

            <DeliveryAddressForm
              form={form}
              zones={zones}
              selectedZone={selectedZone}
              availableZones={availableZones}
              loadingZones={loadingZones}
              municipalityHasNoZones={municipalityHasNoZones}
              onChange={handleChange}
            />
          </section>

          <OrderSummary
            cart={cart}
            selectedZone={selectedZone}
            municipality={form.municipality}
            totals={totals}
            error={error}
            loading={loading}
            canCheckout={canCheckout}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </main>
  );
}