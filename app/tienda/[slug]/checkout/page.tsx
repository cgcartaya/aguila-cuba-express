"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import {
  getActiveDeliveryZones,
  getStoreSettings,
  type DeliveryZone,
} from "@/lib/services/settings";
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
import RememberedCustomerBanner from "@/components/checkout/RememberedCustomerBanner";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { CheckoutContinueBar } from "@/components/checkout/CheckoutContinueBar";
import type { CheckoutForm, CheckoutTotals } from "@/components/checkout/types";
import type { AppliedDiscount } from "@/components/checkout/DiscountCouponBox";
import { CARD_PAYMENTS_ENABLED } from "@/lib/config/features";

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

// PERFIL DEL CLIENTE (sin login): el token vive en localStorage, uno por
// tienda (mismo criterio que el carrito, ver contexts/CartContext.tsx),
// para que un mismo navegador pueda "recordar" a distintas personas en
// distintas tiendas del marketplace sin mezclarlas.
function deviceTokenKey(slug: string) {
  return `tienda_device_${slug || "aguila"}`;
}

function readDeviceToken(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(deviceTokenKey(slug));
  } catch {
    return null;
  }
}

function saveDeviceToken(slug: string, token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(deviceTokenKey(slug), token);
  } catch {
    // si no se puede guardar, simplemente no se recuerda la próxima vez
  }
}

function forgetDeviceToken(slug: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(deviceTokenKey(slug));
  } catch {
    // no pasa nada si falla — es solo una conveniencia
  }
}

// RECORDATORIO DE CARRITO ABANDONADO: antes, el device_token solo se
// creaba DESPUÉS de completar una orden (en create-order/route.ts), así
// que un visitante que nunca terminaba de comprar no tenía ninguna
// identidad para poder recordarle su carrito más tarde. Ahora se genera
// (o se reutiliza) apenas entra al checkout, y ese mismo token es el que
// ya se le manda a create-order al final — no cambia nada del flujo de
// compra existente, solo lo adelanta.
function ensureDeviceToken(slug: string): string {
  const existing = readDeviceToken(slug);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `dt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  saveDeviceToken(slug, generated);
  return generated;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, addToCart } = useCart();
  const { store } = useStore();

  const isYoyo = store?.slug === YOYO_SLUG;
  const cartUrl = store?.slug ? `/tienda/${store.slug}/cart` : "/tienda/cart";
  const orderUrlBase = "/pedido";

  const [form, setForm] = useState<CheckoutForm>(initialForm);
  // CHECKOUT EN PASOS: antes todos los campos (cliente + destinatario +
  // dirección) se mostraban en una sola pantalla larga antes de llegar
  // al resumen/pago — en móvil eso significaba scrollear mucho antes de
  // poder pagar. Se divide en 3 pasos sin tocar la lógica de validación
  // ni de envío existente (missingCheckoutFields, canCheckout,
  // handleSubmit siguen siendo la misma fuente de verdad).
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [businessWhatsapp, setBusinessWhatsapp] = useState("");
  const [businessZelle, setBusinessZelle] = useState("");
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null);
  const [method, setMethod] = useState<CheckoutMethod>("cuba");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(true);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  // Telefono con el que se valido el bono. Si el cliente lo cambia despues
  // de aplicarlo, el bono deja de ser valido para ese numero y hay que
  // quitarlo (y avisar), en vez de dejarlo aplicado en silencio.
  const [discountAppliedForPhone, setDiscountAppliedForPhone] = useState<string | null>(null);
  const [checkoutRuleMap, setCheckoutRuleMap] = useState<Record<string, { minimum_order_exempt: boolean; delivery_included: boolean }>>({});
  const [loadingRules, setLoadingRules] = useState(false);
  const [cardPaymentAvailable, setCardPaymentAvailable] = useState(false);
  const [payWith, setPayWith] = useState<"whatsapp" | "card">("whatsapp");
  // PERFIL DEL CLIENTE (sin login) — reconocimiento por dispositivo.
  // Ver components/checkout/RememberedCustomerBanner.tsx y
  // app/api/checkout/remembered-profile/route.ts.
  const [rememberedProfile, setRememberedProfile] = useState<{
    customer: { name: string; email: string | null; phone: string };
    recipient: {
      recipient_name: string | null;
      recipient_phone: string | null;
      recipient_phone_alt: string | null;
      municipality: string | null;
      zone_name: string | null;
      delivery_zone_id: string | null;
      exact_address: string | null;
      country: string | null;
    } | null;
    recentOrders: Array<{
      id: string;
      order_number: string | null;
      created_at: string;
      total: number;
      items: Array<{
        order_id: string;
        item_type: "product" | "combo";
        product_id: string | null;
        product_name: string;
        quantity: number;
        current_price: number | null;
        current_stock: number | null;
        image_url: string | null;
        available: boolean;
      }>;
    }>;
  } | null>(null);

  useEffect(() => {
    async function loadCheckoutData() {
      if (!store?.id) return;

      try {
        setLoadingCheckout(true);
        const [zonesResponse, storeSettingsResponse, builderResponse, paymentAvailabilityResponse] = await Promise.all([
          getActiveDeliveryZones(store.id),
          getStoreSettings(store.id),
          getCheckoutSettings(store.id),
          fetch(`/api/checkout/payment-availability?storeId=${encodeURIComponent(store.id)}`).then((r) => r.json()).catch(() => ({ available: false })),
        ]);

        if (zonesResponse.error) throw zonesResponse.error;

        setZones(zonesResponse.data || []);
        setBusinessWhatsapp(
          storeSettingsResponse.data?.whatsapp?.replace(/\D/g, "") || ""
        );
        setBusinessZelle(storeSettingsResponse.data?.zelle_info || "");
        const cardAvailable = Boolean(paymentAvailabilityResponse?.available) && CARD_PAYMENTS_ENABLED;
        setCardPaymentAvailable(cardAvailable);
        // Tarjeta es el método preferido cuando está disponible; WhatsApp
        // queda como segunda opción, no como la que viene marcada.
        if (cardAvailable) setPayWith("card");

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

  // PERFIL DEL CLIENTE (sin login): si este navegador ya tiene un token
  // guardado de una compra anterior en esta tienda, se busca su perfil y
  // se precargan los campos que todavía estén vacíos — nunca se pisa lo
  // que la persona ya haya escrito.
  useEffect(() => {
    if (!store?.id) return;

    const token = readDeviceToken(store.slug || "");
    if (!token) return;

    let active = true;

    fetch(`/api/checkout/remembered-profile?storeId=${encodeURIComponent(store.id)}&token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data?.found) return;

        setRememberedProfile(data);

        setForm((prev) => ({
          ...prev,
          name: prev.name || data.customer.name || "",
          email: prev.email || data.customer.email || "",
          phone: prev.phone || data.customer.phone || "",
          recipient_name: prev.recipient_name || data.recipient?.recipient_name || "",
          recipient_phone: prev.recipient_phone || data.recipient?.recipient_phone || "",
          recipient_phone_alt: prev.recipient_phone_alt || data.recipient?.recipient_phone_alt || "",
          municipality: prev.municipality || data.recipient?.municipality || "",
          delivery_zone_id: prev.delivery_zone_id || data.recipient?.delivery_zone_id || "",
          exact_address: prev.exact_address || data.recipient?.exact_address || "",
          city:
            prev.city ||
            (data.recipient?.country === "Estados Unidos" ? data.recipient?.municipality || "" : ""),
        }));
      })
      .catch(() => {
        // si falla, no pasa nada — el checkout sigue funcionando vacío
      });

    return () => {
      active = false;
    };
  }, [store?.id, store?.slug]);

  function handleForgetProfile() {
    if (store?.slug) forgetDeviceToken(store.slug);
    setRememberedProfile(null);
  }

  function handleReorderItems(
    items: Array<{
      product_id: string | null;
      product_name: string;
      quantity: number;
      current_price: number | null;
      current_stock: number | null;
      image_url: string | null;
    }>
  ) {
    for (const item of items) {
      if (!item.product_id || item.current_price == null) continue;

      addToCart(
        {
          id: item.product_id,
          name: item.product_name,
          price: item.current_price,
          image_url: item.image_url || "/placeholder-product.png",
          stock: item.current_stock ?? undefined,
        },
        item.quantity
      );
    }
  }

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
      value: Number(finalTotalWithDiscount),
      metadata: { items: cart.length, fulfillmentMethod: method },
    });
  }, [store?.id, cart.length, method]);

  // RECORDATORIO DE CARRITO ABANDONADO: guarda un snapshot liviano
  // (nombre/email/teléfono + items) apenas hay suficiente info de
  // contacto, con un pequeño debounce para no pegarle a la API en cada
  // tecla. Nunca bloquea el checkout ni muestra error si falla — ver
  // app/api/checkout/session-snapshot/route.ts.
  useEffect(() => {
    if (!store?.id || cart.length === 0) return;
    if (!form.email.trim() && form.phone.trim().length < 7) return;

    const token = ensureDeviceToken(store.slug || "");

    const timeoutId = window.setTimeout(() => {
      fetch("/api/checkout/session-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          deviceToken: token,
          name: form.name,
          email: form.email,
          phone: form.phone,
          method,
          subtotal: totals.subtotal,
          items: cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      }).catch(() => {
        // Silencioso a propósito — esto es solo para el recordatorio,
        // nunca debe interrumpir la compra.
      });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [store?.id, store?.slug, cart, form.name, form.email, form.phone, method, totals.subtotal]);

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

  const missingCheckoutFields = useMemo(() => {
    const missing: Array<{ name: keyof CheckoutForm; label: string }> = [];
    const requireField = (name: keyof CheckoutForm, label: string) => {
      if (!String(form[name] || "").trim()) missing.push({ name, label });
    };

    requireField("name", "nombre del cliente");
    requireField("email", "email");
    requireField("phone", "teléfono del cliente");

    if (isYoyo && method === "delivery") {
      requireField("city", "ciudad");
      requireField("exact_address", "dirección de entrega");
    } else {
      requireField("recipient_name", "nombre del destinatario");
      requireField("recipient_phone", "teléfono del destinatario");
      requireField("municipality", "municipio");
      if (!selectedZone) {
        missing.push({ name: "delivery_zone_id", label: "zona de entrega" });
      }
      requireField("exact_address", "dirección de entrega");
    }

    return missing;
  }, [form, isYoyo, method, selectedZone]);

  // Mismo array de missingCheckoutFields, solo separado por a qué paso
  // pertenece cada campo — así el paso 1 (datos del cliente) y el paso 2
  // (destinatario/dirección) se validan cada uno con sus propios campos,
  // sin duplicar la lógica de qué es obligatorio.
  const CUSTOMER_STEP_FIELDS: Array<keyof CheckoutForm> = ["name", "email", "phone"];
  const step1MissingFields = missingCheckoutFields.filter((field) =>
    CUSTOMER_STEP_FIELDS.includes(field.name)
  );
  const step2MissingFields = missingCheckoutFields.filter(
    (field) => !CUSTOMER_STEP_FIELDS.includes(field.name)
  );

  function goToStep(nextStep: 1 | 2 | 3) {
    // Retroceder nunca necesita validación.
    if (nextStep < step) {
      setError("");
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 1 && nextStep >= 2 && step1MissingFields.length > 0) {
      const first = step1MissingFields[0];
      showCheckoutError(
        `Falta completar: ${step1MissingFields.map((f) => f.label).join(", ")}.`,
        first.name
      );
      return;
    }

    if (step === 2 && nextStep === 3 && step2MissingFields.length > 0) {
      const first = step2MissingFields[0];
      showCheckoutError(
        `Falta completar: ${step2MissingFields.map((f) => f.label).join(", ")}.`,
        first.name
      );
      return;
    }

    setError("");
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showCheckoutError(message: string, fieldName?: keyof CheckoutForm) {
    setError(message);

    if (!fieldName) return;

    window.requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(`[name="${fieldName}"]`);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus();
    });
  }

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;
    // Solo se quita el bono si el telefono realmente cambio respecto al
    // que se uso para validarlo (antes se borraba en cada tecla, incluso
    // sin cambios reales, y quedaba sin avisar).
    if (name === "phone" && appliedDiscount && value !== discountAppliedForPhone) {
      setAppliedDiscount(null);
      setDiscountAppliedForPhone(null);
      setError("El bono se quitó porque cambiaste el teléfono. Puedes volver a aplicarlo si sigue siendo válido para este número.");
    }

    setForm((current) => {
      if (name === "municipality") {
        return { ...current, municipality: value, delivery_zone_id: "" };
      }
      return { ...current, [name]: value };
    });
  }

  function applyDiscount(discount: AppliedDiscount) {
    setAppliedDiscount(discount);
    setDiscountAppliedForPhone(form.phone);
  }

  function removeDiscount() {
    setAppliedDiscount(null);
    setDiscountAppliedForPhone(null);
  }

  function changeMethod(nextMethod: CheckoutMethod) {
    if (nextMethod === "pickup") return;
    setMethod(nextMethod);
    setError("");
    removeDiscount();
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
        method: typeof method !== "undefined" ? method : "cuba",
        isLocalDelivery:
          typeof isYoyo !== "undefined" && typeof method !== "undefined"
            ? isYoyo && method === "delivery"
            : false,
        form,
        zoneId: selectedZone?.id || null,
        items: orderItems,
        discountCampaignId: appliedDiscount?.campaignId || null,
        discountCode: appliedDiscount?.code || null,
        customerPhone: form.phone,
        intendedPaymentMethod: payWith,
        deviceToken: ensureDeviceToken(store?.slug || ""),
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success || !result?.order) {
      throw new Error(result?.message || "No se pudo crear la orden.");
    }

    // Recuerda a este cliente en este navegador para la próxima compra —
    // ver deviceTokenKey() más arriba y RememberedCustomerBanner.
    if (result.deviceToken && store?.slug) {
      saveDeviceToken(store.slug, result.deviceToken);
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
    const host = window.location.hostname
      .replace(/^www\./, "")
      .toLowerCase();

    const isPlatformHost =
      host === "perlamarketplace.com" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".vercel.app");

    const storeUrl = isPlatformHost
      ? store?.slug
        ? `/tienda/${store.slug}`
        : "/tienda"
      : store?.has_landing
        ? "/tienda"
        : "/";

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

    // La orden ya fue creada correctamente en el servidor.
    // A partir de aquí el carrito no representa una compra pendiente:
    // lo limpiamos antes de entrar a la pantalla de éxito para impedir
    // duplicados accidentales y para que otra pestaña no recupere la compra vieja.
    clearCart();

    router.push(
      `/tienda/success?order=${encodeURIComponent(params.orderNumber)}`
    );
  }

  async function handleSubmit() {
    setError("");

    if (!store?.id) return showCheckoutError("No se pudo identificar la tienda del pedido. Recarga la página e inténtalo otra vez.");
    if (payWith === "whatsapp" && !businessWhatsapp) return showCheckoutError("Esta tienda todavía no tiene WhatsApp configurado.");
    if (cart.length === 0) return showCheckoutError("Tu carrito está vacío.");
    if (loadingRules) return showCheckoutError("Espera un momento mientras verificamos las reglas de entrega.");

    if (missingCheckoutFields.length > 0) {
      const firstMissing = missingCheckoutFields[0];
      const labels = missingCheckoutFields.map((field) => field.label);
      return showCheckoutError(
        `Falta completar: ${labels.join(", ")}.`,
        firstMissing.name
      );
    }

    if (totals.subtotal < totals.minimumOrder) {
      return showCheckoutError(
        `La compra mínima para esta zona es de $${totals.minimumOrder.toFixed(2)}. Te faltan $${totals.missingAmount.toFixed(2)}.`
      );
    }

    if (!canCheckout) {
      return showCheckoutError("Revisa los datos del pedido antes de continuar.");
    }

    try {
      setLoading(true);
      const orderItemsBase = buildOrderItemsBase();
      const order = await createOrderSecure(orderItemsBase);

      const orderNumber = order.order_number || order.id;

      if (payWith === "card") {
        const payResponse = await fetch("/api/checkout/pay-with-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            storeId: store.id,
          }),
        });
        const payResult = await payResponse.json().catch(() => null);

        if (!payResponse.ok || !payResult?.success || !payResult?.url) {
          throw new Error(payResult?.message || "No se pudo iniciar el cobro con tarjeta.");
        }

        void trackAnalyticsEvent({
          storeId: store.id,
          eventName: "order_created",
          orderId: order.id,
          value: Number(order.total),
          metadata: {
            orderNumber,
            items: cart.length,
            fulfillmentMethod: method,
            discountCode: appliedDiscount?.code || null,
            discountAmount: Number(order.discount_amount),
            paymentMethod: "card",
          },
        });

        window.location.href = payResult.url;
        return;
      }

      const orderUrl = `${window.location.origin}${orderUrlBase}/${orderNumber}`;
      const whatsappMessage = isYoyo
        ? buildYoyoWhatsappMessage(orderNumber, orderUrl)
        : buildWhatsappOrderMessage({
            orderNumber,
            form,
            cart,
            selectedZone: selectedZone!,
            subtotal: Number(order.subtotal),
            shippingCost: Number(order.delivery_fee),
            finalTotal: Number(order.total),
            discountCode: appliedDiscount?.code || null,
            discountAmount: Number(order.discount_amount),
            orderUrl,
          });

      void trackAnalyticsEvent({
        storeId: store.id,
        eventName: "order_created",
        orderId: order.id,
        value: Number(order.total),
        metadata: {
          orderNumber,
          items: cart.length,
          fulfillmentMethod: method,
          discountCode: appliedDiscount?.code || null,
          discountAmount: Number(order.discount_amount),
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f8fafc_38%,#f8fafc_100%)] pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6">
        <Link href={cartUrl} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600">
          <ArrowLeft size={18} />
          Volver al carrito
        </Link>

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
              <Sparkles size={14} /> Finaliza tu compra
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Checkout seguro</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">Completa los datos de entrega y elige cómo prefieres pagar. Tu pedido quedará listo en pocos pasos.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm"><LockKeyhole size={14} className="text-emerald-600" /> Pago protegido</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm"><ShieldCheck size={14} className="text-blue-600" /> Compra segura</span>
          </div>
        </div>

        {loadingCheckout ? (
          <div className="rounded-3xl bg-white p-8 text-center font-semibold text-gray-500 shadow-sm">
            Cargando checkout...
          </div>
        ) : (
          <>
            <CheckoutSteps step={step} onStepClick={goToStep} />

            {step < 3 ? (
              <div className="min-w-0 space-y-6 pb-28">
                {step === 1 && (
                  <>
                    {isYoyo && settings && (
                      <CheckoutMethodSelector
                        value={method}
                        enabledDelivery={settings.enabled_delivery}
                        enabledCuba={settings.enabled_cuba}
                        onChange={changeMethod}
                      />
                    )}

                    {rememberedProfile && (
                      <RememberedCustomerBanner
                        customerName={rememberedProfile.customer.name}
                        recentOrders={rememberedProfile.recentOrders}
                        onForget={handleForgetProfile}
                        onReorder={handleReorderItems}
                      />
                    )}

                    {(!isYoyo || settings?.blocks.customer !== false) && (
                      <CustomerInfoForm form={form} onChange={handleChange} />
                    )}
                  </>
                )}

                {step === 2 && (
                  <>
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
                  </>
                )}

                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {error}
                  </div>
                )}

                <CheckoutContinueBar
                  total={finalTotalWithDiscount}
                  step={step === 2 ? 2 : 1}
                  onBack={step === 2 ? () => goToStep(1) : undefined}
                  onContinue={() => goToStep(step === 1 ? 2 : 3)}
                />
              </div>
            ) : (
              <div className="min-w-0 space-y-4">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline"
                >
                  <ArrowLeft size={16} />
                  Editar datos de entrega
                </button>

                <OrderSummary
                  cart={cart}
                  selectedZone={selectedZone}
                  municipality={method === "delivery" ? form.city : form.municipality}
                  totals={totals}
                  error={error}
                  loading={loading}
                  canCheckout={canCheckout}
                  missingFields={missingCheckoutFields.map((field) => field.label)}
                  onSubmit={handleSubmit}
                  storeId={store?.id || ""}
                  customerPhone={form.phone}
                  appliedDiscount={appliedDiscount}
                  onApplyDiscount={applyDiscount}
                  onRemoveDiscount={removeDiscount}
                  showCoupon={showCoupon}
                  showDelivery={showDelivery}
                  deliveryLabel="Delivery"
                  deliveryRequiresZone={method === "cuba"}
                  locationLabel={
                    method === "delivery" && form.city
                      ? `Entrega en ${form.city}`
                      : undefined
                  }
                  cardPaymentAvailable={cardPaymentAvailable}
                  payWith={payWith}
                  onChangePayWith={setPayWith}
                  zelleInfo={businessZelle}
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
