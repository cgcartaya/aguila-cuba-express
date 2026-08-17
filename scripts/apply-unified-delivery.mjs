import fs from "node:fs";

const p = "lib/services/menu-orders-public.ts";
let s = fs.readFileSync(p, "utf8");

function mustReplace(oldText, newText, label) {
  if (s.includes(newText)) {
    console.log("✓ " + label + ": ya aplicado");
    return;
  }

  if (!s.includes(oldText)) {
    throw new Error("No encontré bloque: " + label);
  }

  s = s.replace(oldText, newText);
  console.log("→ " + label);
}

mustReplace(
  '.from("menu_delivery_zones")',
  '.from("delivery_zones")',
  "usar delivery_zones existente"
);

mustReplace(
  '.select("id, name, fee, minimum_order")',
  '.select("id, municipality, zone_name, delivery_fee, minimum_order, free_delivery_from")',
  "leer columnas reales de tienda"
);

mustReplace(
`        error:
          "El pedido mínimo para " +
          zone.name +
          " es $" +
          Number(zone.minimum_order).toFixed(2) +
          ".",`,
`        error:
          "El pedido mínimo para " +
          zone.zone_name +
          " es $" +
          Number(zone.minimum_order).toFixed(2) +
          ".",`,
  "mensaje de mínimo"
);

mustReplace(
  "    deliveryFee = Number(zone.fee || 0);",
`    const freeDeliveryFrom = Number(zone.free_delivery_from || 0);

    deliveryFee =
      freeDeliveryFrom > 0 && subtotal >= freeDeliveryFrom
        ? 0
        : Number(zone.delivery_fee || 0);`,
  "usar delivery_fee y domicilio gratis"
);

mustReplace(
  "    deliveryZoneName = zone.name;",
  "    deliveryZoneName = `${zone.municipality} · ${zone.zone_name}`;",
  "snapshot legible de zona"
);

fs.writeFileSync(p, s);

console.log("");
console.log("✅ menu-orders-public.ts ahora usa delivery_zones.");