import fs from "node:fs";

const p = "components/landing/deparis/DeParisFeaturedDishes.tsx";
let s = fs.readFileSync(p, "utf8");

function rep(oldText, newText, label) {
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

// 1) Nuevo flag devuelto por el endpoint.
rep(
`  remaining?: number | null;
};`,
`  remaining?: number | null;
  available_by_menu_now?: boolean;
};`,
"tipo available_by_menu_now"
);

// 2) Diferenciar agotado de fuera de horario.
rep(
`  const soldOut = liveReady && dish.remaining === 0;
  const groups = dish.menu_item_option_groups || [];
  const customizable = liveReady && groups.length > 0;`,
`  const soldOut = liveReady && dish.remaining === 0;
  const unavailableBySchedule =
    liveReady &&
    dish.venue_type !== "bar" &&
    dish.available_by_menu_now === false;

  const groups = dish.menu_item_option_groups || [];
  const customizable =
    liveReady &&
    !unavailableBySchedule &&
    groups.length > 0;`,
"estado fuera de horario"
);

// 3) Etiqueta sobre la foto cuando no corresponde pedir todavía.
rep(
`        {soldOut && <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-[8px] font-black uppercase text-white shadow-sm">Agotado</span>}
        {customizable && !soldOut && (`,
`        {soldOut && <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-[8px] font-black uppercase text-white shadow-sm">Agotado</span>}

        {!soldOut && unavailableBySchedule && (
          <span className="absolute right-2 top-2 rounded-full bg-[#1B1410]/90 px-2.5 py-1 text-[8px] font-black uppercase text-white shadow-sm">
            Según horario
          </span>
        )}

        {customizable && !soldOut && (`,
"badge según horario"
);

// 4) Prioridad de CTA: fuera de horario antes de personalizar/agregar.
rep(
`          ) : soldOut ? (
            <div className="rounded-full bg-red-50 px-3 py-2.5 text-center text-[9px] font-black uppercase text-red-600">No disponible ahora</div>
          ) : customizable ? (`,
`          ) : soldOut ? (
            <div className="rounded-full bg-red-50 px-3 py-2.5 text-center text-[9px] font-black uppercase text-red-600">
              No disponible ahora
            </div>
          ) : unavailableBySchedule ? (
            <a
              href="/menu/deparis"
              className="flex w-full items-center justify-center rounded-full border border-[#1B1410]/15 bg-[#1B1410]/[.04] px-3 py-2.5 text-[9px] font-black uppercase text-[#1B1410]/60"
            >
              Ver disponibilidad en la carta
            </a>
          ) : customizable ? (`,
"cta fuera de horario"
);

// 5) No permitir quick-add fuera de horario por seguridad visual.
rep(
`  const quickAdd = (dish: FeaturedDish) => {
    if (dish.remaining === 0) return;`,
`  const quickAdd = (dish: FeaturedDish) => {
    if (dish.remaining === 0) return;
    if (
      dish.venue_type !== "bar" &&
      dish.available_by_menu_now === false
    ) {
      return;
    }`,
"bloquear quick add fuera de horario"
);

fs.writeFileSync(p, s);
console.log("");
console.log("✅ Landing corregida: los platos destacados ya no desaparecen fuera de horario.");
