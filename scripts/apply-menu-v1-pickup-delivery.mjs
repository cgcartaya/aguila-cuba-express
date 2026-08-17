import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8"), write=(p,s)=>fs.writeFileSync(p,s);
function rep(s,a,b,label){if(!s.includes(a))throw new Error("No encontré bloque: "+label);return s.replace(a,b)}

let p="components/menu/MenuPageClient.tsx",s=read(p);
s=rep(s,`          onAdd={(line) => {
            addFromModal(line);
            setActiveItem(null);
            setCartOpen(true);
          }}`,`          onAdd={(line) => {
            addFromModal(line);
            setActiveItem(null);
            setCartOpen(false);
          }}`,"volver a carta");
write(p,s);

p="components/menu/MenuCartDrawer.tsx";s=read(p);
s=rep(s,'import { useMemo, useState } from "react";','import { useEffect, useMemo, useState } from "react";',"useEffect");
s=s.replace("  UtensilsCrossed,\n","");
s=rep(s,`  {
    value: "dine_in",
    title: "En mesa",
    description: "Estoy en el restaurante",
    icon: UtensilsCrossed,
  },
`,"","quitar mesa");
s=rep(s,`  const [orderType, setOrderType] = useState<MenuOrderType>(
    initialTableNumber ? "dine_in" : "takeaway"
  );
  const [tableNumber, setTableNumber] = useState(initialTableNumber ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState("");`,`  const [orderType, setOrderType] = useState<MenuOrderType>("takeaway");
  const [tableNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [deliveryZones, setDeliveryZones] = useState<Array<{id:string;name:string;fee:number;minimum_order:number;estimated_minutes_min:number|null;estimated_minutes_max:number|null}>>([]);`,"estado delivery");
s=rep(s,"  const total = getCartTotal(cart);",`  useEffect(() => {
    fetch(\`/api/public/menu-delivery-zones?slug=\${encodeURIComponent(storeSlug)}\`)
      .then(r => r.ok ? r.json() : null).then(data => setDeliveryZones(data?.zones || []))
      .catch(() => setDeliveryZones([]));
  }, [storeSlug]);
  const selectedZone = deliveryZones.find(z => z.id === deliveryZoneId) || null;
  const total = getCartTotal(cart);`,"cargar zonas");
s=s.replace('if (orderType === "delivery") return deliveryAddress.trim().length >= 5;','if (orderType === "delivery") return Boolean(deliveryZoneId) && deliveryAddress.trim().length >= 5;').replace('}, [orderType, deliveryAddress]);','}, [orderType, deliveryAddress, deliveryZoneId]);');
s=rep(s,`          delivery_address:
            orderType === "delivery" ? deliveryAddress.trim() : undefined,`,`          delivery_address:
            orderType === "delivery" ? deliveryAddress.trim() : undefined,
          delivery_zone_id: orderType === "delivery" ? deliveryZoneId : undefined,`,"zone body");
const a=s.indexOf('              {orderType === "dine_in" && ('),b=s.indexOf('              {orderType === "delivery" && (',a);if(a>=0&&b>a)s=s.slice(0,a)+s.slice(b);
s=rep(s,`              {orderType === "delivery" && (
                <input
                  value={deliveryAddress}
                  onChange={(e) =>
                    setDeliveryAddress(e.target.value)
                  }
                  placeholder="Dirección de entrega"
                  className="mt-5 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"
                />
              )}`,`              {orderType === "delivery" && (
                <div className="mt-5 space-y-3">
                  <select value={deliveryZoneId} onChange={e=>setDeliveryZoneId(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none">
                    <option value="">Selecciona tu zona de entrega</option>
                    {deliveryZones.map(z=><option key={z.id} value={z.id}>{z.name} · ${"${"}Number(z.fee).toFixed(2)}</option>)}
                  </select>
                  {selectedZone && <div className="rounded-2xl bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-900">Delivery ${"${"}Number(selectedZone.fee).toFixed(2)} · mínimo ${"${"}Number(selectedZone.minimum_order).toFixed(2)}</div>}
                  <input value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} placeholder="Dirección exacta y referencia" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"/>
                </div>
              )}`,"selector zona");
s=rep(s,`                <button
                  onClick={() => setStep("fulfillment")}`,`                <button onClick={onClose} className="mb-2 flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-black text-[#1B1410]"><Plus size={14}/> Seguir agregando</button>
                <button
                  onClick={() => setStep("fulfillment")}`,"seguir agregando");
write(p,s);

p="app/api/public/menu-orders/route.ts";s=read(p);
s=rep(s,'    const deliveryAddress = clean(body.delivery_address, 300);','    const deliveryAddress = clean(body.delivery_address, 300);\\n    const deliveryZoneId = clean(body.delivery_zone_id, 100);',"zone id");
s=s.replace('["dine_in", "takeaway", "delivery"]','["takeaway", "delivery"]');
s=rep(s,'    if (orderType === "delivery" && !deliveryAddress) {','    if (orderType === "delivery" && !deliveryZoneId) return NextResponse.json({ error: "Selecciona una zona de entrega." }, { status: 400 });\\n\\n    if (orderType === "delivery" && !deliveryAddress) {',"zone required");
s=rep(s,'      deliveryAddress,\\n      customerName,','      deliveryAddress,\\n      deliveryZoneId,\\n      customerName,',"input zone");
write(p,s);

p="lib/services/menu-orders-public.ts";s=read(p);
s=rep(s,'  deliveryAddress?: string;\\n  customerName: string;','  deliveryAddress?: string;\\n  deliveryZoneId?: string;\\n  customerName: string;',"service type");
s=rep(s,`  const deliveryFee =
    input.orderType === "delivery"
      ? Number(operationSettings?.menu_delivery_fee || 0)
      : 0;

  const total = subtotal + deliveryFee;`,`  let deliveryFee = 0;
  let deliveryZoneName: string | null = null;
  if (input.orderType === "delivery") {
    if (!input.deliveryZoneId) return {ok:false,status:400,error:"Selecciona una zona de entrega."};
    const {data:zone}=await supabaseAdmin.from("menu_delivery_zones").select("id,name,fee,minimum_order").eq("id",input.deliveryZoneId).eq("store_id",store.id).eq("is_active",true).maybeSingle();
    if(!zone)return {ok:false,status:422,error:"La zona de entrega seleccionada no está disponible."};
    if(subtotal<Number(zone.minimum_order||0))return {ok:false,status:422,error:\`El pedido mínimo para \${zone.name} es $\${Number(zone.minimum_order).toFixed(2)}.\`};
    deliveryFee=Number(zone.fee||0); deliveryZoneName=zone.name;
  }
  const total = subtotal + deliveryFee;`,"precio zona");
s=rep(s,'      delivery_fee: deliveryFee,\\n      customer_name:','      delivery_fee: deliveryFee,\\n      delivery_zone_id: input.orderType === "delivery" ? input.deliveryZoneId || null : null,\\n      delivery_zone_name: deliveryZoneName,\\n      customer_name:',"guardar zona");
write(p,s);
console.log("Ajuste V1 aplicado.");
