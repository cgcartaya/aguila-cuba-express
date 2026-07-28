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
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import {
  getActiveDeliveryZones,
  getStoreSettings,
  type DeliveryZone,
} from "@/lib/services/settings";

import { CustomerInfoForm } from "@/components/checkout/CustomerInfoForm";
import { RecipientInfoForm } from "@/components/checkout/RecipientInfoForm";
import { DeliveryAddressForm } from "@/components/checkout/DeliveryAddressForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import type { CheckoutForm } from "@/components/checkout/types";
import type { AppliedDiscount } from "@/components/checkout/DiscountCouponBox";

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

  city: "",
  reference: "",
  municipality: "",
  delivery_zone_id: "",
  exact_address: "",
  notes: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart } = useCart();

  const { store } = useStore();

  const isDefaultStore = store?.slug === "aguila";

  const cartUrl =
    store?.slug && !isDefaultStore
      ? `/tienda/${store.slug}/cart`
      : "/tienda/cart";

  const orderUrlBase = "/pedido";

  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [businessWhatsapp, setBusinessWhatsapp] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [checkoutRuleMap, setCheckoutRuleMap] = useState<Record<string, { minimum_order_exempt: boolean; delivery_included: boolean }>>({});
  const [loadingRules, setLoadingRules] = useState(false);

  useEffect(() => {
    async function loadCheckoutData() {
      try {
        setLoadingZones(true);

        if (!store?.id) return;

        const [zonesResponse, settingsResponse] = await Promise.all([
          getActiveDeliveryZones(store.id),
          getStoreSettings(store.id),
        ]);

        if (zonesResponse.error) throw zonesResponse.error;

        setZones(zonesResponse.data || []);

        const cleanWhatsapp = settingsResponse.data?.whatsapp?.replace(/\D/g, "") || "";
        setBusinessWhatsapp(cleanWhatsapp);
      } catch (err: any) {
        console.error("ERROR CARGANDO CHECKOUT:", err);
        setError("No se pudo cargar la información del checkout.");
      } finally {
        setLoadingZones(false);
      }
    }

    loadCheckoutData();
  }, [store?.id]);

  useEffect(() => {
    async function loadCheckoutRules() {
      if (!store?.id || cart.length === 0) { setCheckoutRuleMap({}); return; }
      const productIds = cart.filter((item) => item.type === "product").map((item) => getOriginalCartItemId(item.id));
      if (productIds.length === 0) { setCheckoutRuleMap({}); return; }
      setLoadingRules(true);
      try {
        const [{ data: products, error: productsError }, { data: categories, error: categoriesError }] = await Promise.all([
          supabase.from("products").select("id, category, minimum_order_exempt, delivery_included").eq("store_id", store.id).in("id", productIds),
          supabase.from("categories").select("name, minimum_order_exempt, delivery_included").eq("store_id", store.id),
        ]);
        if (productsError) throw productsError;
        if (categoriesError) throw categoriesError;
        const categoryMap = new Map((categories || []).map((category) => [String(category.name).trim().toLowerCase(), category]));
        const nextMap: Record<string, { minimum_order_exempt: boolean; delivery_included: boolean }> = {};
        for (const product of products || []) {
          const category = categoryMap.get(String(product.category || "").trim().toLowerCase());
          nextMap[String(product.id)] = {
            minimum_order_exempt: product.minimum_order_exempt ?? category?.minimum_order_exempt ?? false,
            delivery_included: product.delivery_included ?? category?.delivery_included ?? false,
          };
        }
        setCheckoutRuleMap(nextMap);
      } catch (ruleError) {
        console.error("No se pudieron cargar las reglas especiales del checkout:", ruleError);
        setCheckoutRuleMap({});
      } finally { setLoadingRules(false); }
    }
    void loadCheckoutRules();
  }, [store?.id, cart]);

  const checkoutCart = useMemo(() => cart.map((item) => {
    if (item.type !== "product") return item;
    const rule = checkoutRuleMap[getOriginalCartItemId(item.id)];
    return { ...item, minimum_order_exempt: rule?.minimum_order_exempt ?? false, delivery_included: rule?.delivery_included ?? false };
  }), [cart, checkoutRuleMap]);

  const availableZones = useMemo(() => {
    if (!form.municipality) return [];

    return zones.filter((zone) => zone.municipality === form.municipality);
  }, [zones, form.municipality]);

  const selectedZone = useMemo(() => {
    return zones.find((zone) => zone.id === form.delivery_zone_id) || null;
  }, [zones, form.delivery_zone_id]);

  const totals = useMemo(() => {
    return calculateCheckoutTotals(checkoutCart, selectedZone);
  }, [checkoutCart, selectedZone]);

  const discountAmount = appliedDiscount?.discountAmount || 0;
  const finalTotalWithDiscount = Math.max(
    totals.finalTotal - discountAmount,
    0
  );

  useEffect(() => {
    if (!store?.id || cart.length === 0) return;

    void trackAnalyticsEvent({
      storeId: store.id,
      eventName: "begin_checkout",
      value: Number(order.total),
      metadata: { items: cart.length },
    });
  }, [store?.id, cart.length]);

  const municipalityHasNoZones =
    Boolean(form.municipality) && !loadingZones && availableZones.length === 0;

  const canCheckout = isCheckoutFormComplete(
    form,
    checkoutCart,
    selectedZone,
    totals
  );

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;

    if (name === "phone") setAppliedDiscount(null);

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

  async function createOrderSecure(orderItems: ReturnType<typeof buildOrderItemsBase>) {
    const response = await fetch("/api/checkout/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store?.id,
        method: "cuba",
        isLocalDelivery: false,
        form,
        zoneId: selectedZone?.id || null,
        items: orderItems,
        discountCampaignId: appliedDiscount?.campaignId || null,
        discountCode: appliedDiscount?.code || null,
        customerPhone: form.phone,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success || !result?.order) {
      throw new Error(result?.message || "No se pudo crear la orden.");
    }

    return result.order as {
      id: string;
      order_number?: string | null;
      subtotal: number;
      delivery_fee: number;
      discount_amount: number;
      total: number;
    };
  }

  function continueToWhatsappStep(params: {
    orderNumber: string;
    orderUrl: string;
    whatsappMessage: string;
  }) {
    const storeUrl =
      store?.slug && !isDefaultStore ? `/tienda/${store.slug}` : "/tienda";

    window.sessionStorage.setItem(
      "perla_pending_whatsapp_order",
      JSON.stringify({
        orderNumber: params.orderNumber,
        orderUrl: params.orderUrl,
        storeUrl,
        businessWhatsapp,
        whatsappMessage: params.whatsappMessage,
      })
    );

    router.push(`/tienda/success?order=${encodeURIComponent(params.orderNumber)}`);
  }

  async function handleSubmit() {
    setError("");

    if (!store?.id) {
      setError("No se pudo identificar la tienda del pedido.");
      return;
    }

    if (!businessWhatsapp) {
      setError("Esta tienda todavía no tiene WhatsApp configurado.");
      return;
    }

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
      const orderItemsBase = buildOrderItemsBase();
      const order = await createOrderSecure(orderItemsBase);

      const orderNumber = order.order_number || order.id;
      const origin = window.location.origin;
      const orderUrl = `${origin}${orderUrlBase}/${orderNumber}`;

      const whatsappMessage = buildWhatsappOrderMessage({
        orderNumber,
        form,
        cart,
        selectedZone,
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.delivery_fee),
        finalTotal: Number(order.total),
        discountCode: appliedDiscount?.code || null,
        discountAmount: Number(order.discount_amount),
        orderUrl,
      });

      // Analítica Fase 2: registrar la conversión solo después de crear
      // correctamente la orden, sus artículos y descontar el inventario.
      if (store?.id) {
        void trackAnalyticsEvent({
          storeId: store.id,
          eventName: "order_created",
          orderId: order.id,
          value: Number(order.total),
          metadata: {
            orderNumber,
            items: cart.length,
            discountCode: appliedDiscount?.code || null,
            discountAmount: Number(order.discount_amount),
          },
        });
      }

      continueToWhatsappStep({
        orderNumber,
        orderUrl,
        whatsappMessage,
      });
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
            storeId={store?.id || ""}
            customerPhone={form.phone}
            appliedDiscount={appliedDiscount}
            onApplyDiscount={setAppliedDiscount}
            onRemoveDiscount={() => setAppliedDiscount(null)}
          />
        </div>
      </div>
    </main>
  );
}