import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s);

function replaceOnce(s, oldText, newText, label) {
  if (s.includes(newText)) {
    console.log(`✓ ${label}: ya aplicado`);
    return s;
  }
  if (!s.includes(oldText)) {
    throw new Error(`No encontré bloque para: ${label}`);
  }
  console.log(`→ Aplicando: ${label}`);
  return s.replace(oldText, newText);
}

// ---------------------------------------------------------
// 1) MenuPageClient — no abrir carrito tras personalizar
//    y no mostrar "Mesa X" en la V1 pública.
// ---------------------------------------------------------
{
  const p = "components/menu/MenuPageClient.tsx";
  let s = read(p);

  s = replaceOnce(
    s,
`          onAdd={(line) => {
            addFromModal(line);
            setActiveItem(null);
            setCartOpen(true);
          }}`,
`          onAdd={(line) => {
            addFromModal(line);
            setActiveItem(null);
            setCartOpen(false);
          }}`,
    "volver a la carta después de personalizar"
  );

  // Si el primer script ya lo modificó, no hace nada.
  if (s.includes(`{tableFromQr && (`)) {
    const start = s.indexOf(`            {tableFromQr && (`);
    const endMarker = `            )}\n\n            <button`;
    const end = s.indexOf(endMarker, start);
    if (start >= 0 && end > start) {
      s = s.slice(0, start) + `            <button` + s.slice(end + endMarker.length);
      console.log("→ Ocultando indicador de mesa en V1 pública");
    }
  }

  write(p, s);
}

// ---------------------------------------------------------
// 2) MenuCartDrawer — asegurar V1 pickup/delivery + zona.
//    Es tolerante a cambios ya aplicados por el script anterior.
// ---------------------------------------------------------
{
  const p = "components/menu/MenuCartDrawer.tsx";
  let s = read(p);

  if (s.includes(`import { useMemo, useState } from "react";`)) {
    s = s.replace(
      `import { useMemo, useState } from "react";`,
      `import { useEffect, useMemo, useState } from "react";`
    );
  }

  s = s.replace(`  UtensilsCrossed,\n`, "");

  const dineBlock =
`  {
    value: "dine_in",
    title: "En mesa",
    description: "Estoy en el restaurante",
    icon: UtensilsCrossed,
  },
`;
  if (s.includes(dineBlock)) {
    s = s.replace(dineBlock, "");
    console.log("→ Quitando modalidad En mesa de V1");
  }

  const oldState =
`  const [orderType, setOrderType] = useState<MenuOrderType>(
    initialTableNumber ? "dine_in" : "takeaway"
  );
  const [tableNumber, setTableNumber] = useState(initialTableNumber ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState("");`;

  const newState =
`  const [orderType, setOrderType] = useState<MenuOrderType>("takeaway");
  const [tableNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [deliveryZones, setDeliveryZones] = useState<Array<{
    id: string;
    name: string;
    fee: number;
    minimum_order: number;
    estimated_minutes_min: number | null;
    estimated_minutes_max: number | null;
  }>>([]);`;

  if (s.includes(oldState)) {
    s = s.replace(oldState, newState);
    console.log("→ Configurando estado de zonas");
  }

  if (!s.includes(`/api/public/menu-delivery-zones?slug=`)) {
    s = replaceOnce(
      s,
`  const total = getCartTotal(cart);`,
`  useEffect(() => {
    fetch(\`/api/public/menu-delivery-zones?slug=\${encodeURIComponent(storeSlug)}\`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setDeliveryZones(data?.zones || []))
      .catch(() => setDeliveryZones([]));
  }, [storeSlug]);

  const selectedZone =
    deliveryZones.find((zone) => zone.id === deliveryZoneId) || null;

  const total = getCartTotal(cart);`,
      "cargar zonas públicas"
    );
  }

  if (s.includes(
    `if (orderType === "delivery") return deliveryAddress.trim().length >= 5;`
  )) {
    s = s.replace(
      `if (orderType === "delivery") return deliveryAddress.trim().length >= 5;`,
      `if (orderType === "delivery") return Boolean(deliveryZoneId) && deliveryAddress.trim().length >= 5;`
    );
  }

  if (s.includes(`}, [orderType, deliveryAddress]);`)) {
    s = s.replace(
      `}, [orderType, deliveryAddress]);`,
      `}, [orderType, deliveryAddress, deliveryZoneId]);`
    );
  }

  if (!s.includes(`delivery_zone_id:`)) {
    s = replaceOnce(
      s,
`          delivery_address:
            orderType === "delivery" ? deliveryAddress.trim() : undefined,`,
`          delivery_address:
            orderType === "delivery" ? deliveryAddress.trim() : undefined,
          delivery_zone_id:
            orderType === "delivery" ? deliveryZoneId : undefined,`,
      "enviar zona al servidor"
    );
  }

  // Quitar bloque de mesa si todavía existe.
  const mesaStart = s.indexOf(`              {orderType === "dine_in" && (`);
  if (mesaStart >= 0) {
    const deliveryStart = s.indexOf(
      `              {orderType === "delivery" && (`,
      mesaStart
    );
    if (deliveryStart > mesaStart) {
      s = s.slice(0, mesaStart) + s.slice(deliveryStart);
      console.log("→ Quitando campo de mesa");
    }
  }

  // Sustituir delivery simple por selector de zona si aún no está.
  if (!s.includes(`Selecciona tu zona de entrega`)) {
    const oldDelivery =
`              {orderType === "delivery" && (
                <input
                  value={deliveryAddress}
                  onChange={(e) =>
                    setDeliveryAddress(e.target.value)
                  }
                  placeholder="Dirección de entrega"
                  className="mt-5 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"
                />
              )}`;

    const newDelivery =
`              {orderType === "delivery" && (
                <div className="mt-5 space-y-3">
                  <select
                    value={deliveryZoneId}
                    onChange={(e) => setDeliveryZoneId(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"
                  >
                    <option value="">Selecciona tu zona de entrega</option>
                    {deliveryZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} · $\{Number(zone.fee).toFixed(2)}
                      </option>
                    ))}
                  </select>

                  {selectedZone && (
                    <div className="rounded-2xl bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-900">
                      Delivery $\{Number(selectedZone.fee).toFixed(2)}
                      {selectedZone.minimum_order > 0
                        ? ` · Pedido mínimo $\${Number(selectedZone.minimum_order).toFixed(2)}`
                        : ""}
                      {selectedZone.estimated_minutes_min
                        ? ` · \${selectedZone.estimated_minutes_min}\${
                            selectedZone.estimated_minutes_max
                              ? `–\${selectedZone.estimated_minutes_max}`
                              : ""
                          } min aprox.`
                        : ""}
                    </div>
                  )}

                  <input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Dirección exacta y referencia"
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>
              )}`;

    s = replaceOnce(s, oldDelivery, newDelivery, "selector de zona");
  }

  // Validación visual al continuar.
  const oldValidation =
`                  if (
                    orderType === "delivery" &&
                    deliveryAddress.trim().length < 5
                  ) {`;

  if (s.includes(oldValidation) && !s.includes(`Selecciona tu zona de entrega.");`)) {
    s = s.replace(
      oldValidation,
`                  if (orderType === "delivery" && !deliveryZoneId) {
                    setSubmitError("Selecciona tu zona de entrega.");
                    return;
                  }

                  if (
                    orderType === "delivery" &&
                    deliveryAddress.trim().length < 5
                  ) {`
    );
    console.log("→ Agregando validación visual de zona");
  }

  // Botón seguir agregando.
  if (!s.includes(`Seguir agregando`)) {
    s = replaceOnce(
      s,
`                <button
                  onClick={() => setStep("fulfillment")}`,
`                <button
                  onClick={onClose}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-black text-[#1B1410]"
                >
                  <Plus size={14} /> Seguir agregando
                </button>

                <button
                  onClick={() => setStep("fulfillment")}`,
      "botón Seguir agregando"
    );
  }

  write(p, s);
}

// ---------------------------------------------------------
// 3) API pública — rechazar dine_in y exigir delivery_zone_id
// ---------------------------------------------------------
{
  const p = "app/api/public/menu-orders/route.ts";
  let s = read(p);

  if (!s.includes(`const deliveryZoneId = clean(body.delivery_zone_id`)) {
    s = replaceOnce(
      s,
`    const deliveryAddress = clean(body.delivery_address, 300);`,
`    const deliveryAddress = clean(body.delivery_address, 300);
    const deliveryZoneId = clean(body.delivery_zone_id, 100);`,
      "leer delivery_zone_id"
    );
  }

  s = s.replace(
    `["dine_in", "takeaway", "delivery"].includes(orderType)`,
    `["takeaway", "delivery"].includes(orderType)`
  );

  if (!s.includes(`Selecciona una zona de entrega.`)) {
    s = replaceOnce(
      s,
`    if (orderType === "delivery" && !deliveryAddress) {`,
`    if (orderType === "delivery" && !deliveryZoneId) {
      return NextResponse.json(
        { error: "Selecciona una zona de entrega." },
        { status: 400 }
      );
    }

    if (orderType === "delivery" && !deliveryAddress) {`,
      "exigir zona en API"
    );
  }

  if (!s.includes(`      deliveryZoneId,`)) {
    s = replaceOnce(
      s,
`      deliveryAddress,
      customerName,`,
`      deliveryAddress,
      deliveryZoneId,
      customerName,`,
      "pasar zona al servicio"
    );
  }

  write(p, s);
}

// ---------------------------------------------------------
// 4) Servicio servidor — validar zona, mínimo y tarifa real
// ---------------------------------------------------------
{
  const p = "lib/services/menu-orders-public.ts";
  let s = read(p);

  if (!s.includes(`  deliveryZoneId?: string;`)) {
    s = replaceOnce(
      s,
`  deliveryAddress?: string;
  customerName: string;`,
`  deliveryAddress?: string;
  deliveryZoneId?: string;
  customerName: string;`,
      "tipo deliveryZoneId"
    );
  }

  if (!s.includes(`.from("menu_delivery_zones")`)) {
    s = replaceOnce(
      s,
`  const deliveryFee =
    input.orderType === "delivery"
      ? Number(operationSettings?.menu_delivery_fee || 0)
      : 0;

  const total = subtotal + deliveryFee;`,
`  let deliveryFee = 0;
  let deliveryZoneName: string | null = null;

  if (input.orderType === "delivery") {
    if (!input.deliveryZoneId) {
      return {
        ok: false,
        status: 400,
        error: "Selecciona una zona de entrega.",
      };
    }

    const { data: zone, error: zoneError } = await supabaseAdmin
      .from("menu_delivery_zones")
      .select("id, name, fee, minimum_order")
      .eq("id", input.deliveryZoneId)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .maybeSingle();

    if (zoneError || !zone) {
      return {
        ok: false,
        status: 422,
        error: "La zona de entrega seleccionada no está disponible.",
      };
    }

    if (subtotal < Number(zone.minimum_order || 0)) {
      return {
        ok: false,
        status: 422,
        error: \`El pedido mínimo para \${zone.name} es $\${Number(
          zone.minimum_order
        ).toFixed(2)}.\`,
      };
    }

    deliveryFee = Number(zone.fee || 0);
    deliveryZoneName = zone.name;
  }

  const total = subtotal + deliveryFee;`,
      "validar tarifa y mínimo por zona"
    );
  }

  if (!s.includes(`      delivery_zone_id:`)) {
    s = replaceOnce(
      s,
`      delivery_fee: deliveryFee,
      customer_name:`,
`      delivery_fee: deliveryFee,
      delivery_zone_id:
        input.orderType === "delivery"
          ? input.deliveryZoneId || null
          : null,
      delivery_zone_name: deliveryZoneName,
      customer_name:`,
      "guardar zona en orden"
    );
  }

  write(p, s);
}

console.log("");
console.log("✅ Reparación V1 completada.");
console.log("Ahora ejecuta: npm run build");
