import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { weightInPounds, shippingCharge } from "./product-weight";
import { ALVAREZ_STORE_ID, alvarezShippingPolicy } from "./alvarez-policy";
export type CartShippingSelection = { rate_id: string };
export type ShippingCartItem = {
  item_type: string;
  product_id?: string | null;
  combo_id?: string | null;
  quantity: number;
};
export async function quoteCartShipping(
  storeId: string,
  items: ShippingCartItem[],
  selection: CartShippingSelection,
) {
  const { data: store, error: se } = await db
    .from("stores")
    .select("id,module_shipping_enabled,is_active")
    .eq("id", storeId)
    .eq("is_active", true)
    .maybeSingle();
  if (se || !store?.module_shipping_enabled)
    throw new Error("Esta tienda no tiene habilitado el módulo de envíos.");
  if (!items.length || items.length > 200) throw new Error("Carrito inválido.");
  const needs = new Map<string, number>();
  const comboIds: string[] = [];
  for (const item of items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100000
    )
      throw new Error("Cantidad inválida.");
    if (item.item_type === "product" && item.product_id)
      needs.set(
        item.product_id,
        (needs.get(item.product_id) || 0) + item.quantity,
      );
    else if (item.item_type === "combo" && item.combo_id)
      comboIds.push(item.combo_id);
    else throw new Error("Producto inválido.");
  }
  if (comboIds.length) {
    const { data: combos, error } = await db
      .from("combos")
      .select("id,combo_items(product_id,quantity)")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("id", comboIds);
    if (error) throw new Error("No se pudieron consultar los combos.");
    for (const item of items.filter((i) => i.item_type === "combo")) {
      const combo = combos?.find((c) => c.id === item.combo_id);
      if (!combo?.combo_items?.length)
        throw new Error("Un combo no está disponible o no tiene productos.");
      for (const part of combo.combo_items)
        needs.set(
          part.product_id,
          (needs.get(part.product_id) || 0) +
            Number(part.quantity) * item.quantity,
        );
    }
  }
  const { data: products, error: pe } = await db
    .from("products")
    .select("id,name,weight,weight_unit,is_active")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .in("id", [...needs.keys()]);
  if (pe || products?.length !== needs.size)
    throw new Error("Uno de los productos ya no está disponible.");
  let weight = 0;
  for (const product of products || []) {
    if (!product.is_active)
      throw new Error(`${product.name}: producto no disponible.`);
    try {
      weight +=
        weightInPounds(product.weight, product.weight_unit) *
        needs.get(product.id)!;
    } catch {
      throw new Error(
        `${product.name}: falta configurar su peso. Contacta a la tienda.`,
      );
    }
  }
  const { data: rate, error: re } = await db
    .from("shipping_rates")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", selection.rate_id)
    .eq("is_active", true)
    .maybeSingle();
  if (re || !rate)
    throw new Error("La tarifa seleccionada ya no está disponible.");
  const { data: service } = await db
    .from("shipping_service_types")
    .select("id,name,code,billing_mode")
    .eq("store_id", storeId)
    .eq("id", rate.service_type_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!service || service.billing_mode !== "per_lb")
    throw new Error("Selecciona un servicio con tarifa por peso.");
  const targets = {
    country: ["shipping_countries", rate.country_id],
    province: ["shipping_provinces", rate.province_id],
    municipality: ["shipping_municipalities", rate.municipality_id],
    location: ["shipping_locations", rate.location_id],
  } as const;
  const target = targets[rate.scope_type as keyof typeof targets];
  if (!target?.[1]) throw new Error("El destino de la tarifa no es válido.");
  const { data: destination } = await db
    .from(target[0])
    .select("id,name")
    .eq("store_id", storeId)
    .eq("id", target[1])
    .eq("is_active", true)
    .maybeSingle();
  if (!destination) throw new Error("El destino ya no está disponible.");
  // Resolve the selected destination hierarchy from this agency only.
  const location = rate.location_id
    ? await db
        .from("shipping_locations")
        .select("id,name,municipality_id")
        .eq("store_id", storeId)
        .eq("id", rate.location_id)
        .eq("is_active", true)
        .maybeSingle()
    : null;
  const municipalityId =
    rate.municipality_id || location?.data?.municipality_id;
  const municipality = municipalityId
    ? await db
        .from("shipping_municipalities")
        .select("id,name,province_id")
        .eq("store_id", storeId)
        .eq("id", municipalityId)
        .eq("is_active", true)
        .maybeSingle()
    : null;
  const provinceId = rate.province_id || municipality?.data?.province_id;
  const province = provinceId
    ? await db
        .from("shipping_provinces")
        .select("id,name,country_id")
        .eq("store_id", storeId)
        .eq("id", provinceId)
        .eq("is_active", true)
        .maybeSingle()
    : null;
  const countryId = rate.country_id || province?.data?.country_id;
  const country = countryId
    ? await db
        .from("shipping_countries")
        .select("id,name")
        .eq("store_id", storeId)
        .eq("id", countryId)
        .eq("is_active", true)
        .maybeSingle()
    : null;
  if (
    !country?.data ||
    (provinceId && !province?.data) ||
    (municipalityId && !municipality?.data) ||
    (rate.location_id && !location?.data)
  )
    throw new Error("El destino ya no está disponible.");
  const destinationLabel = [
    country.data.name,
    province?.data?.name,
    municipality?.data?.name,
    location?.data?.name,
  ]
    .filter(Boolean)
    .join(" / ");
  let pricing = shippingCharge(rate, weight);
  if (storeId === ALVAREZ_STORE_ID) {
    const policy = alvarezShippingPolicy(service.code, province?.data?.name);
    if (weight < policy.minimumWeight)
      throw new Error(
        `El peso mínimo para este servicio es ${policy.minimumWeight} lb.`,
      );
    pricing = shippingCharge(
      { ...rate, minimum_weight_lb: 0, minimum_charge: 0, fixed_fee: 0 },
      weight,
    );
  }
  const airportFee =
    storeId !== ALVAREZ_STORE_ID &&
    /energ|power|station|bater/i.test(`${service.code} ${service.name}`) &&
    ["air", "express"].includes(rate.transport_mode)
      ? 50
      : 0;
  return {
    ...pricing,
    amount: Number((pricing.amount + airportFee).toFixed(2)),
    airport_fee_amount: airportFee,
    weight_lb: Number(weight.toFixed(6)),
    shipping_rate_id: rate.id,
    service_type_id: service.id,
    service_name: service.name,
    transport_mode: rate.transport_mode,
    destination: destinationLabel,
    country: country.data.name,
    province: province?.data?.name || null,
    municipality: municipality?.data?.name || null,
    currency: "USD",
  };
}
