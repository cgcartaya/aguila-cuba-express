import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s);

function replaceOnce(s, oldText, newText, label) {
  if (s.includes(newText)) {
    console.log("✓ " + label + ": ya aplicado");
    return s;
  }
  if (!s.includes(oldText)) {
    throw new Error("No encontré bloque para: " + label);
  }
  console.log("→ Aplicando: " + label);
  return s.replace(oldText, newText);
}

function ensureContains(s, text, label) {
  if (!s.includes(text)) {
    throw new Error("No encontré referencia esperada para: " + label);
  }
}

// 1) MenuPageClient
{
  const p = "components/menu/MenuPageClient.tsx";
  let s = read(p);

  const oldAdd = [
    '          onAdd={(line) => {',
    '            addFromModal(line);',
    '            setActiveItem(null);',
    '            setCartOpen(true);',
    '          }}'
  ].join("\n");

  const newAdd = [
    '          onAdd={(line) => {',
    '            addFromModal(line);',
    '            setActiveItem(null);',
    '            setCartOpen(false);',
    '          }}'
  ].join("\n");

  if (s.includes(oldAdd)) {
    s = s.replace(oldAdd, newAdd);
    console.log("→ Volver a la carta después de personalizar");
  } else if (s.includes(newAdd)) {
    console.log("✓ Volver a la carta: ya aplicado");
  }

  // Quitar badge de mesa público si todavía existe
  const mesaStart = s.indexOf('            {tableFromQr && (');
  if (mesaStart >= 0) {
    const buttonMarker = '            <button';
    const nextButton = s.indexOf(buttonMarker, mesaStart);
    if (nextButton > mesaStart) {
      s = s.slice(0, mesaStart) + s.slice(nextButton);
      console.log("→ Ocultando referencia de mesa en V1");
    }
  }

  write(p, s);
}

// 2) MenuCartDrawer
{
  const p = "components/menu/MenuCartDrawer.tsx";
  let s = read(p);

  if (s.includes('import { useMemo, useState } from "react";')) {
    s = s.replace(
      'import { useMemo, useState } from "react";',
      'import { useEffect, useMemo, useState } from "react";'
    );
  }

  s = s.replace("  UtensilsCrossed,\n", "");

  const dineBlock = [
    '  {',
    '    value: "dine_in",',
    '    title: "En mesa",',
    '    description: "Estoy en el restaurante",',
    '    icon: UtensilsCrossed,',
    '  },',
    ''
  ].join("\n");

  if (s.includes(dineBlock)) {
    s = s.replace(dineBlock, "");
    console.log("→ Quitando modalidad En mesa");
  }

  const oldState = [
    '  const [orderType, setOrderType] = useState<MenuOrderType>(',
    '    initialTableNumber ? "dine_in" : "takeaway"',
    '  );',
    '  const [tableNumber, setTableNumber] = useState(initialTableNumber ?? "");',
    '  const [deliveryAddress, setDeliveryAddress] = useState("");'
  ].join("\n");

  const newState = [
    '  const [orderType, setOrderType] = useState<MenuOrderType>("takeaway");',
    '  const [tableNumber] = useState("");',
    '  const [deliveryAddress, setDeliveryAddress] = useState("");',
    '  const [deliveryZoneId, setDeliveryZoneId] = useState("");',
    '  const [deliveryZones, setDeliveryZones] = useState<Array<{',
    '    id: string;',
    '    name: string;',
    '    fee: number;',
    '    minimum_order: number;',
    '    estimated_minutes_min: number | null;',
    '    estimated_minutes_max: number | null;',
    '  }>>([]);'
  ].join("\n");

  if (s.includes(oldState)) {
    s = s.replace(oldState, newState);
    console.log("→ Configurando estado de delivery por zonas");
  }

  if (!s.includes("/api/public/menu-delivery-zones?slug=")) {
    const oldTotal = '  const total = getCartTotal(cart);';
    const newTotal = [
      '  useEffect(() => {',
      '    fetch("/api/public/menu-delivery-zones?slug=" + encodeURIComponent(storeSlug))',
      '      .then((response) => (response.ok ? response.json() : null))',
      '      .then((data) => setDeliveryZones(data?.zones || []))',
      '      .catch(() => setDeliveryZones([]));',
      '  }, [storeSlug]);',
      '',
      '  const selectedZone =',
      '    deliveryZones.find((zone) => zone.id === deliveryZoneId) || null;',
      '',
      '  const total = getCartTotal(cart);'
    ].join("\n");
    s = replaceOnce(s, oldTotal, newTotal, "cargar zonas públicas");
  }

  s = s.replace(
    'if (orderType === "delivery") return deliveryAddress.trim().length >= 5;',
    'if (orderType === "delivery") return Boolean(deliveryZoneId) && deliveryAddress.trim().length >= 5;'
  );

  s = s.replace(
    '}, [orderType, deliveryAddress]);',
    '}, [orderType, deliveryAddress, deliveryZoneId]);'
  );

  if (!s.includes("delivery_zone_id:")) {
    const oldBody = [
      '          delivery_address:',
      '            orderType === "delivery" ? deliveryAddress.trim() : undefined,'
    ].join("\n");

    const newBody = [
      '          delivery_address:',
      '            orderType === "delivery" ? deliveryAddress.trim() : undefined,',
      '          delivery_zone_id:',
      '            orderType === "delivery" ? deliveryZoneId : undefined,'
    ].join("\n");

    s = replaceOnce(s, oldBody, newBody, "enviar zona al servidor");
  }

  // Quitar bloque dine-in
  const dStart = s.indexOf('              {orderType === "dine_in" && (');
  if (dStart >= 0) {
    const deliveryStart = s.indexOf(
      '              {orderType === "delivery" && (',
      dStart
    );
    if (deliveryStart > dStart) {
      s = s.slice(0, dStart) + s.slice(deliveryStart);
      console.log("→ Quitando campo de mesa");
    }
  }

  if (!s.includes("Selecciona tu zona de entrega")) {
    const oldDelivery = [
      '              {orderType === "delivery" && (',
      '                <input',
      '                  value={deliveryAddress}',
      '                  onChange={(e) =>',
      '                    setDeliveryAddress(e.target.value)',
      '                  }',
      '                  placeholder="Dirección de entrega"',
      '                  className="mt-5 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"',
      '                />',
      '              )}'
    ].join("\n");

    const newDelivery = [
      '              {orderType === "delivery" && (',
      '                <div className="mt-5 space-y-3">',
      '                  <select',
      '                    value={deliveryZoneId}',
      '                    onChange={(e) => setDeliveryZoneId(e.target.value)}',
      '                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"',
      '                  >',
      '                    <option value="">Selecciona tu zona de entrega</option>',
      '                    {deliveryZones.map((zone) => (',
      '                      <option key={zone.id} value={zone.id}>',
      '                        {zone.name + " · $" + Number(zone.fee).toFixed(2)}',
      '                      </option>',
      '                    ))}',
      '                  </select>',
      '',
      '                  {selectedZone && (',
      '                    <div className="rounded-2xl bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-900">',
      '                      {"Delivery $" + Number(selectedZone.fee).toFixed(2)}',
      '                      {selectedZone.minimum_order > 0',
      '                        ? " · Pedido mínimo $" + Number(selectedZone.minimum_order).toFixed(2)',
      '                        : ""}',
      '                      {selectedZone.estimated_minutes_min',
      '                        ? " · " + selectedZone.estimated_minutes_min +',
      '                          (selectedZone.estimated_minutes_max',
      '                            ? "–" + selectedZone.estimated_minutes_max',
      '                            : "") +',
      '                          " min aprox."',
      '                        : ""}',
      '                    </div>',
      '                  )}',
      '',
      '                  <input',
      '                    value={deliveryAddress}',
      '                    onChange={(e) => setDeliveryAddress(e.target.value)}',
      '                    placeholder="Dirección exacta y referencia"',
      '                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"',
      '                  />',
      '                </div>',
      '              )}'
    ].join("\n");

    s = replaceOnce(s, oldDelivery, newDelivery, "selector de zona");
  }

  if (!s.includes('setSubmitError("Selecciona tu zona de entrega.")')) {
    const oldValidation = [
      '                  if (',
      '                    orderType === "delivery" &&',
      '                    deliveryAddress.trim().length < 5',
      '                  ) {'
    ].join("\n");

    const newValidation = [
      '                  if (orderType === "delivery" && !deliveryZoneId) {',
      '                    setSubmitError("Selecciona tu zona de entrega.");',
      '                    return;',
      '                  }',
      '',
      '                  if (',
      '                    orderType === "delivery" &&',
      '                    deliveryAddress.trim().length < 5',
      '                  ) {'
    ].join("\n");

    if (s.includes(oldValidation)) {
      s = s.replace(oldValidation, newValidation);
      console.log("→ Agregando validación visual de zona");
    }
  }

  if (!s.includes("Seguir agregando")) {
    const oldContinue = [
      '                <button',
      '                  onClick={() => setStep("fulfillment")}'
    ].join("\n");

    const newContinue = [
      '                <button',
      '                  onClick={onClose}',
      '                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-black text-[#1B1410]"',
      '                >',
      '                  <Plus size={14} /> Seguir agregando',
      '                </button>',
      '',
      '                <button',
      '                  onClick={() => setStep("fulfillment")}'
    ].join("\n");

    s = replaceOnce(s, oldContinue, newContinue, "botón Seguir agregando");
  }

  write(p, s);
}

// 3) API pública
{
  const p = "app/api/public/menu-orders/route.ts";
  let s = read(p);

  if (!s.includes("const deliveryZoneId = clean(body.delivery_zone_id")) {
    s = replaceOnce(
      s,
      '    const deliveryAddress = clean(body.delivery_address, 300);',
      [
        '    const deliveryAddress = clean(body.delivery_address, 300);',
        '    const deliveryZoneId = clean(body.delivery_zone_id, 100);'
      ].join("\n"),
      "leer delivery_zone_id"
    );
  }

  s = s.replace(
    '["dine_in", "takeaway", "delivery"].includes(orderType)',
    '["takeaway", "delivery"].includes(orderType)'
  );

  if (!s.includes('{ error: "Selecciona una zona de entrega." }')) {
    s = replaceOnce(
      s,
      '    if (orderType === "delivery" && !deliveryAddress) {',
      [
        '    if (orderType === "delivery" && !deliveryZoneId) {',
        '      return NextResponse.json(',
        '        { error: "Selecciona una zona de entrega." },',
        '        { status: 400 }',
        '      );',
        '    }',
        '',
        '    if (orderType === "delivery" && !deliveryAddress) {'
      ].join("\n"),
      "exigir zona en API"
    );
  }

  if (!s.includes("      deliveryZoneId,")) {
    s = replaceOnce(
      s,
      [
        '      deliveryAddress,',
        '      customerName,'
      ].join("\n"),
      [
        '      deliveryAddress,',
        '      deliveryZoneId,',
        '      customerName,'
      ].join("\n"),
      "pasar zona al servicio"
    );
  }

  write(p, s);
}

// 4) Servicio de creación de pedidos
{
  const p = "lib/services/menu-orders-public.ts";
  let s = read(p);

  if (!s.includes("  deliveryZoneId?: string;")) {
    s = replaceOnce(
      s,
      [
        '  deliveryAddress?: string;',
        '  customerName: string;'
      ].join("\n"),
      [
        '  deliveryAddress?: string;',
        '  deliveryZoneId?: string;',
        '  customerName: string;'
      ].join("\n"),
      "tipo deliveryZoneId"
    );
  }

  if (!s.includes('.from("menu_delivery_zones")')) {
    const oldFee = [
      '  const deliveryFee =',
      '    input.orderType === "delivery"',
      '      ? Number(operationSettings?.menu_delivery_fee || 0)',
      '      : 0;',
      '',
      '  const total = subtotal + deliveryFee;'
    ].join("\n");

    const newFee = [
      '  let deliveryFee = 0;',
      '  let deliveryZoneName: string | null = null;',
      '',
      '  if (input.orderType === "delivery") {',
      '    if (!input.deliveryZoneId) {',
      '      return {',
      '        ok: false,',
      '        status: 400,',
      '        error: "Selecciona una zona de entrega.",',
      '      };',
      '    }',
      '',
      '    const { data: zone, error: zoneError } = await supabaseAdmin',
      '      .from("menu_delivery_zones")',
      '      .select("id, name, fee, minimum_order")',
      '      .eq("id", input.deliveryZoneId)',
      '      .eq("store_id", store.id)',
      '      .eq("is_active", true)',
      '      .maybeSingle();',
      '',
      '    if (zoneError || !zone) {',
      '      return {',
      '        ok: false,',
      '        status: 422,',
      '        error: "La zona de entrega seleccionada no está disponible.",',
      '      };',
      '    }',
      '',
      '    if (subtotal < Number(zone.minimum_order || 0)) {',
      '      return {',
      '        ok: false,',
      '        status: 422,',
      '        error:',
      '          "El pedido mínimo para " +',
      '          zone.name +',
      '          " es $" +',
      '          Number(zone.minimum_order).toFixed(2) +',
      '          ".",',
      '      };',
      '    }',
      '',
      '    deliveryFee = Number(zone.fee || 0);',
      '    deliveryZoneName = zone.name;',
      '  }',
      '',
      '  const total = subtotal + deliveryFee;'
    ].join("\n");

    s = replaceOnce(s, oldFee, newFee, "validar tarifa y mínimo por zona");
  }

  if (!s.includes("      delivery_zone_id:")) {
    s = replaceOnce(
      s,
      [
        '      delivery_fee: deliveryFee,',
        '      customer_name:'
      ].join("\n"),
      [
        '      delivery_fee: deliveryFee,',
        '      delivery_zone_id:',
        '        input.orderType === "delivery"',
        '          ? input.deliveryZoneId || null',
        '          : null,',
        '      delivery_zone_name: deliveryZoneName,',
        '      customer_name:'
      ].join("\n"),
      "guardar zona en la orden"
    );
  }

  write(p, s);
}

console.log("");
console.log("✅ Reparación V1 completada correctamente.");
console.log("Siguiente paso: npm run build");
