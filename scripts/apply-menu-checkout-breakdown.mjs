import fs from "node:fs";

const p = "components/menu/MenuCartDrawer.tsx";
let s = fs.readFileSync(p, "utf8");

function replaceOnce(oldText, newText, label) {
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

// 1) Cuba como país inicial SOLO en el checkout del restaurante.
// El PhoneCountryField detecta el país por el prefijo del value.
replaceOnce(
  '  const [customerPhone, setCustomerPhone] = useState("");',
  '  const [customerPhone, setCustomerPhone] = useState("+53 ");',
  "Cuba +53 como prefijo inicial"
);

// 2) Completar el tipo de zona para poder mostrar delivery gratis.
replaceOnce(
  '  const [deliveryZones, setDeliveryZones] = useState<Array<{id:string;name:string;fee:number;minimum_order:number;estimated_minutes_min:number|null;estimated_minutes_max:number|null}>>([]);',
  [
    '  const [deliveryZones, setDeliveryZones] = useState<Array<{',
    '    id: string;',
    '    name: string;',
    '    fee: number;',
    '    minimum_order: number;',
    '    free_delivery_from?: number;',
    '    estimated_minutes_min: number | null;',
    '    estimated_minutes_max: number | null;',
    '  }>>([]);'
  ].join("\n"),
  "tipo de zona completo"
);

// 3) Calcular exactamente el mismo desglose visual que el servidor:
// comida + delivery (o gratis) = total.
replaceOnce(
  [
    '  const selectedZone = deliveryZones.find(z => z.id === deliveryZoneId) || null;',
    '  const total = getCartTotal(cart);',
    '  const totalUnits = cart.reduce((sum, line) => sum + line.quantity, 0);'
  ].join("\n"),
  [
    '  const selectedZone = deliveryZones.find(z => z.id === deliveryZoneId) || null;',
    '  const total = getCartTotal(cart);',
    '',
    '  const selectedZoneRegularFee = Number(selectedZone?.fee || 0);',
    '  const selectedZoneFreeFrom = Number(selectedZone?.free_delivery_from || 0);',
    '  const qualifiesForFreeDelivery =',
    '    orderType === "delivery" &&',
    '    selectedZoneFreeFrom > 0 &&',
    '    total >= selectedZoneFreeFrom;',
    '',
    '  const deliveryFeePreview =',
    '    orderType === "delivery" && selectedZone',
    '      ? qualifiesForFreeDelivery',
    '        ? 0',
    '        : selectedZoneRegularFee',
    '      : 0;',
    '',
    '  const grandTotal = total + deliveryFeePreview;',
    '  const totalUnits = cart.reduce((sum, line) => sum + line.quantity, 0);'
  ].join("\n"),
  "desglose comida + delivery"
);

// 4) En el paso Datos, mejorar la tarjeta del método seleccionado.
replaceOnce(
  [
    '                  {orderType === "dine_in" && tableNumber && (',
    '                    <span className="text-xs font-bold text-black/40">',
    '                      · Mesa {tableNumber}',
    '                    </span>',
    '                  )}'
  ].join("\n"),
  [
    '                  {orderType === "delivery" && selectedZone && (',
    '                    <span className="text-xs font-bold text-black/40">',
    '                      · {selectedZone.name}',
    '                    </span>',
    '                  )}'
  ].join("\n"),
  "mostrar zona seleccionada"
);

// 5) Reemplazar Total estimado por un desglose profesional.
replaceOnce(
  [
    '              <div className="mb-4 flex items-center justify-between">',
    '                <span className="text-sm font-black text-[#1B1410]">',
    '                  Total estimado',
    '                </span>',
    '                <strong className="text-xl text-[#1B1410]">',
    '                  ${total.toFixed(2)}',
    '                </strong>',
    '              </div>'
  ].join("\n"),
  [
    '              <div className="mb-4 rounded-2xl border border-black/[0.07] bg-white p-4">',
    '                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-black/35">',
    '                  Resumen de pago',
    '                </p>',
    '',
    '                <div className="space-y-2 text-sm">',
    '                  <div className="flex items-center justify-between gap-3">',
    '                    <span className="font-semibold text-black/55">Comida</span>',
    '                    <strong className="text-[#1B1410]">${total.toFixed(2)}</strong>',
    '                  </div>',
    '',
    '                  <div className="flex items-center justify-between gap-3">',
    '                    <div className="min-w-0">',
    '                      <span className="font-semibold text-black/55">Delivery</span>',
    '                      {orderType === "delivery" && selectedZone && (',
    '                        <span className="ml-1 text-[10px] font-bold text-black/35">',
    '                          · {selectedZone.name}',
    '                        </span>',
    '                      )}',
    '                    </div>',
    '',
    '                    {orderType === "delivery" ? (',
    '                      qualifiesForFreeDelivery ? (',
    '                        <div className="text-right">',
    '                          {selectedZoneRegularFee > 0 && (',
    '                            <span className="mr-2 text-xs font-semibold text-black/30 line-through">',
    '                              ${selectedZoneRegularFee.toFixed(2)}',
    '                            </span>',
    '                          )}',
    '                          <strong className="text-emerald-600">GRATIS</strong>',
    '                        </div>',
    '                      ) : (',
    '                        <strong className="text-[#1B1410]">',
    '                          ${deliveryFeePreview.toFixed(2)}',
    '                        </strong>',
    '                      )',
    '                    ) : (',
    '                      <strong className="text-emerald-600">No aplica</strong>',
    '                    )}',
    '                  </div>',
    '',
    '                  <div className="my-2 border-t border-dashed border-black/10" />',
    '',
    '                  <div className="flex items-end justify-between gap-3">',
    '                    <div>',
    '                      <p className="text-sm font-black text-[#1B1410]">Total</p>',
    '                      <p className="text-[10px] font-semibold text-black/35">',
    '                        {totalUnits} {totalUnits === 1 ? "artículo" : "artículos"}',
    '                      </p>',
    '                    </div>',
    '                    <strong className="text-2xl text-[#1B1410]">',
    '                      ${grandTotal.toFixed(2)}',
    '                    </strong>',
    '                  </div>',
    '                </div>',
    '              </div>'
  ].join("\n"),
  "resumen financiero final"
);

fs.writeFileSync(p, s);
console.log("");
console.log("✅ Checkout del restaurante actualizado.");
console.log("Ahora ejecuta: npm run build");
