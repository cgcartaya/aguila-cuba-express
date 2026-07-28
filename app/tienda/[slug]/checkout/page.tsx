"use client";

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
import {
  processOrderInventory,
  validateOrderStock,
} from "@/lib/services/inventory";
import { getCheckoutSettings } from "@/lib/checkout/settings-service";
import {
  createDefaultCheckoutSettings,
  type CheckoutMethod,
  type CheckoutSettings,
} from "@/lib/checkout/types";

import { CustomerInfoForm } from "@/components/checkout/CustomerInfoForm";
import { RecipientInfoForm } from "@/components/checkout/RecipientInfoForm";
import { DeliveryAddressForm } from "@/components/checkout/DeliveryAddressForm";
import { LocalDeliveryAddressForm } from "@/components/checkout/LocalDeliveryAddressForm";
import { CheckoutMethodSelector } from "@/components/checkout/CheckoutMethodSelector";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import type { CheckoutForm, CheckoutTotals } from "@/components/checkout/types";
import type { AppliedDiscount } from "@/components/checkout/DiscountCouponBox";

import {
  buildWhatsappOrderMessage,
  calculateCheckoutTotals,
  getOriginalCartItemId,
  isCheckoutFormComplete,
} from "@/lib/utils/checkout";

const YOYO_SLUG = "yoyo-envios";

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

  const isYoyo = store?.slug === YOYO_SLUG;
  const cartUrl = store?.slug ? `/tienda/${store.slug}/cart` : "/tienda/cart";
  const orderUrlBase = "/pedido";

  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [businessWhatsapp, setBusinessWhatsapp] = useState("");
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null);
  const [method, setMethod] = useState<CheckoutMethod>("cuba");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(true);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [checkoutRuleMap, setCheckoutRuleMap] = useState<Record<string, { minimum_order_exempt: boolean; delivery_included: boolean }>>({});
  const [loadingRules, setLoadingRules] = useState(false);

  useEffect(() => {
    async function loadCheckoutData() {
      if (!store?.id) return;

      try {
        setLoadingCheckout(true);
        const [zonesResponse, storeSettingsResponse, builderResponse] = await Promise.all([
          getActiveDeliveryZones(store.id),
          getStoreSettings(store.id),
          getCheckoutSettings(store.id),
        ]);

        if (zonesResponse.error) throw zonesResponse.error;

        setZones(zonesResponse.data || []);
        setBusinessWhatsapp(
          storeSettingsResponse.data?.whatsapp?.replace(/\D/g, "") || ""
        );

        const settings = builderResponse.data || createDefaultCheckoutSettings(store.id);
        setCheckoutSettings(settings);

        const allowedDefault =
          (settings.default_method === "delivery" && settings.enabled_delivery) ||
          (settings.default_method === "cuba" && settings.enabled_cuba);

        setMethod(
          allowedDefault
            ? settings.default_method
            : settings.enabled_delivery
              ? "delivery"
              : "cuba"
        );
      } catch (checkoutError: any) {
        console.error("ERROR CARGANDO CHECKOUT:", checkoutError);
        setError("No se pudo cargar la información del checkout.");
      } finally {
        setLoadingCheckout(false);
      }
    }

    void loadCheckoutData();
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

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === form.delivery_zone_id) || null,
    [zones, form.delivery_zone_id]
  );

  const cubaTotals = useMemo(
    () => calculateCheckoutTotals(checkoutCart, selectedZone),
    [checkoutCart, selectedZone]
  );

  const totals = useMemo<CheckoutTotals>(() => {
    if (!isYoyo || method === "cuba") return cubaTotals;

    const subtotal = cart.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
    const shippingCost = checkoutSettings?.show_delivery_price
      ? Number(checkoutSettings.fixed_delivery_fee || 0)
      : 0;

    return {
      subtotal,
      minimumOrder: 0,
      baseDeliveryFee: shippingCost,
      freeDeliveryFrom: 0,
      hasFreeDelivery: shippingCost === 0,
      shippingCost,
      finalTotal: subtotal + shippingCost,
      missingAmount: 0,
      minimumOrderExempt: false,
      deliveryIncludedForAllItems: false,
    };
  }, [cart, checkoutSettings, cubaTotals, isYoyo, method]);

  const discountAmount = appliedDiscount?.discountAmount || 0;
  const finalTotalWithDiscount = Math.max(totals.finalTotal - discountAmount, 0);

  useEffect(() => {
    if (!store?.id || cart.length === 0) return;
    void trackAnalyticsEvent({
      storeId: store.id,
      eventName: "begin_checkout",
      value: finalTotalWithDiscount,
      metadata: { items: cart.length, fulfillmentMethod: method },
    });
  }, [store?.id, cart.length, method]);

  const municipalityHasNoZones =
    Boolean(form.municipality) && !loadingCheckout && availableZones.length === 0;

  const canCheckout = useMemo(() => {
    if (!isYoyo || method === "cuba") {
      return isCheckoutFormComplete(form, checkoutCart, selectedZone, totals);
    }

    return (
      cart.length > 0 &&
      Boolean(form.name.trim()) &&
      Boolean(form.email.trim()) &&
      Boolean(form.phone.trim()) &&
      Boolean(form.city.trim()) &&
      Boolean(form.exact_address.trim())
    );
  }, [cart, form, isYoyo, method, selectedZone, totals]);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;
    if (name === "phone") setAppliedDiscount(null);

    setForm((current) => {
      if (name === "municipality") {
        return { ...current, municipality: value, delivery_zone_id: "" };
      }
      return { ...current, [name]: value };
    });
  }

  function changeMethod(nextMethod: CheckoutMethod) {
    if (nextMethod === "pickup") return;
    setMethod(nextMethod);
    setError("");
    setAppliedDiscount(null);
  }

  async function createOrUpdateCustomer() {
    const { data: existingCustomer, error: existingCustomerError } = await supabase
      .from("customers")
      .select("*")
      .eq("email", form.email)
      .maybeSingle();

    if (existingCustomerError) throw existingCustomerError;

    const city = method === "delivery" ? form.city : form.municipality;

    if (existingCustomer) {
      const { error: updateCustomerError } = await supabase
        .from("customers")
        .update({ name: form.name, phone: form.phone, city })
        .eq("id", existingCustomer.id);
      if (updateCustomerError) throw updateCustomerError;
      return existingCustomer;
    }

    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({ name: form.name, email: form.email, phone: form.phone, city })
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

  async function createOrder(customerId: string) {
    const isLocalDelivery = isYoyo && method === "delivery";
    const zone = isLocalDelivery ? null : selectedZone;

    const payload = {
      customer_id: customerId,
      store_id: store?.id,
      status: "pending",
      payment_status: "pending",
      subtotal: totals.subtotal,
      delivery_fee: totals.shippingCost,
      discount_campaign_id: appliedDiscount?.campaignId || null,
      discount_code: appliedDiscount?.code || null,
      discount_amount: discountAmount,
      total: finalTotalWithDiscount,
      country: isLocalDelivery ? "Estados Unidos" : "Cuba",
      state: isLocalDelivery ? null : "Cienfuegos",
      municipality: isLocalDelivery ? form.city : form.municipality,
      delivery_zone_id: zone?.id || null,
      zone_name: zone?.zone_name || null,
      exact_address: form.exact_address,
      recipient_name: isLocalDelivery ? form.name : form.recipient_name,
      recipient_phone: isLocalDelivery ? form.phone : form.recipient_phone,
      recipient_phone_alt: isLocalDelivery ? null : form.recipient_phone_alt,
      address: form.exact_address,
      notes: [form.reference ? `Referencia: ${form.reference}` : "", form.notes]
        .filter(Boolean)
        .join("\n"),
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(payload)
      .select()
      .single();

    if (orderError) throw orderError;
    return order;
  }

  function buildYoyoWhatsappMessage(orderNumber: string, orderUrl: string) {
    const products = cart
      .map(
        (item) =>
          `${item.quantity}x ${item.name}: $${(
            Number(item.price) * item.quantity
          ).toFixed(2)}`
      )
      .join("\n");

    const deliverySection =
      method === "delivery"
        ? `ENTREGA A DOMICILIO\nCiudad: ${form.city}\nDirección: ${form.exact_address}${
            form.reference ? `\nReferencia: ${form.reference}` : ""
          }`
        : `ENVÍO A CUBA\nDestinatario: ${form.recipient_name}\nTeléfono: ${
            form.recipient_phone
          }${form.recipient_phone_alt ? `\nTeléfono alternativo: ${form.recipient_phone_alt}` : ""}\nMunicipio: ${form.municipality}\nZona: ${selectedZone?.zone_name || ""}\nDirección: ${form.exact_address}`;

    return encodeURIComponent(`YOYO ENVÍOS
--------------------
PEDIDO NUEVO
Orden: ${orderNumber}

CLIENTE
Nombre: ${form.name}
Teléfono: ${form.phone}
Email: ${form.email}

${deliverySection}

PRODUCTOS
${products}

RESUMEN
Subtotal: $${totals.subtotal.toFixed(2)}${
      totals.shippingCost > 0 ? `\nDelivery: $${totals.shippingCost.toFixed(2)}` : ""
    }${
      appliedDiscount
        ? `\nDescuento (${appliedDiscount.code}): -$${discountAmount.toFixed(2)}`
        : ""
    }
TOTAL: $${finalTotalWithDiscount.toFixed(2)}

NOTAS
${form.notes || "Sin notas"}

Ver pedido:
${orderUrl}`);
  }

  function continueToWhatsappStep(params: {
    orderNumber: string;
    orderUrl: string;
    whatsappMessage: string;
  }) {
    const storeUrl = store?.slug ? `/tienda/${store.slug}` : "/tienda";

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

    if (!store?.id) return setError("No se pudo identificar la tienda del pedido.");
    if (!businessWhatsapp) return setError("Esta tienda todavía no tiene WhatsApp configurado.");
    if (cart.length === 0) return setError("Tu carrito está vacío.");
    if (loadingRules) return setError("Espera un momento mientras verificamos las reglas de entrega.");
    if (method === "cuba" && !selectedZone) return setError("Selecciona una zona de entrega.");
    if (totals.subtotal < totals.minimumOrder) {
      return setError(
        `La compra mínima para esta zona es de $${totals.minimumOrder.toFixed(2)}. Te faltan $${totals.missingAmount.toFixed(2)}.`
      );
    }
    if (!canCheckout) return setError("Completa todos los campos obligatorios.");

    try {
      setLoading(true);
      const customer = await createOrUpdateCustomer();
      const orderItemsBase = buildOrderItemsBase();
      await validateOrderStock(orderItemsBase);
      const order = await createOrder(customer.id);

      if (appliedDiscount) {
        const redeemResponse = await fetch("/api/discounts/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: appliedDiscount.campaignId,
            storeId: store.id,
            phone: form.phone,
            orderId: order.id,
          }),
        });
        const redeemResult = await redeemResponse.json();
        if (!redeemResponse.ok || !redeemResult.success) {
          await supabase.from("orders").delete().eq("id", order.id);
          throw new Error(redeemResult.message || "El bono ya no está disponible.");
        }
      }

      const { error: itemsError } = await supabase.from("order_items").insert(
        orderItemsBase.map((item) => ({ ...item, order_id: order.id }))
      );

      if (itemsError) {
        if (appliedDiscount) {
          await fetch("/api/discounts/release", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId: appliedDiscount.campaignId,
              phone: form.phone,
              orderId: order.id,
            }),
          });
        }
        throw itemsError;
      }

      await processOrderInventory(orderItemsBase.map((item) => ({ ...item, order_id: order.id })));

      const orderNumber = order.order_number || order.id;
      const orderUrl = `${window.location.origin}${orderUrlBase}/${orderNumber}`;
      const whatsappMessage = isYoyo
        ? buildYoyoWhatsappMessage(orderNumber, orderUrl)
        : buildWhatsappOrderMessage({
            orderNumber,
            form,
            cart,
            selectedZone: selectedZone!,
            subtotal: totals.subtotal,
            shippingCost: totals.shippingCost,
            finalTotal: finalTotalWithDiscount,
            discountCode: appliedDiscount?.code || null,
            discountAmount,
            orderUrl,
          });

      void trackAnalyticsEvent({
        storeId: store.id,
        eventName: "order_created",
        orderId: order.id,
        value: finalTotalWithDiscount,
        metadata: {
          orderNumber,
          items: cart.length,
          fulfillmentMethod: method,
          discountCode: appliedDiscount?.code || null,
          discountAmount,
        },
      });

      continueToWhatsappStep({
        orderNumber,
        orderUrl,
        whatsappMessage,
      });
    } catch (submitError: any) {
      console.error("ERROR CHECKOUT:", submitError);
      setError(submitError?.message || "Ocurrió un error al crear la orden.");
    } finally {
      setLoading(false);
    }
  }

  const settings = checkoutSettings || (store?.id ? createDefaultCheckoutSettings(store.id) : null);
  const showRecipient = !isYoyo || (method === "cuba" && settings?.blocks.recipient !== false);
  const showAddress = !isYoyo || settings?.blocks.address !== false;
  const showNotes = !isYoyo || settings?.blocks.notes !== false;
  const showCoupon = !isYoyo || settings?.blocks.coupon !== false;
  const showDelivery = !isYoyo || settings?.show_delivery_price === true;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link href={cartUrl} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600">
          <ArrowLeft size={18} />
          Volver al carrito
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

        {loadingCheckout ? (
          <div className="rounded-3xl bg-white p-8 text-center font-semibold text-gray-500 shadow-sm">
            Cargando checkout...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-6 lg:col-span-2">
              {isYoyo && settings && (
                <CheckoutMethodSelector
                  value={method}
                  enabledDelivery={settings.enabled_delivery}
                  enabledCuba={settings.enabled_cuba}
                  onChange={changeMethod}
                />
              )}

              {(!isYoyo || settings?.blocks.customer !== false) && (
                <CustomerInfoForm form={form} onChange={handleChange} />
              )}

              {showRecipient && <RecipientInfoForm form={form} onChange={handleChange} />}

              {showAddress && method === "delivery" && isYoyo ? (
                <LocalDeliveryAddressForm
                  form={form}
                  showNotes={showNotes}
                  onChange={handleChange}
                />
              ) : showAddress ? (
                <DeliveryAddressForm
                  form={form}
                  zones={zones}
                  selectedZone={selectedZone}
                  availableZones={availableZones}
                  loadingZones={loadingCheckout}
                  municipalityHasNoZones={municipalityHasNoZones}
                  showNotes={showNotes}
                  onChange={handleChange}
                />
              ) : null}
            </section>

            <OrderSummary
              cart={cart}
              selectedZone={selectedZone}
              municipality={method === "delivery" ? form.city : form.municipality}
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
              showCoupon={showCoupon}
              showDelivery={showDelivery}
              deliveryLabel="Delivery"
              deliveryRequiresZone={method === "cuba"}
              locationLabel={
                method === "delivery" && form.city
                  ? `Entrega en ${form.city}`
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}
