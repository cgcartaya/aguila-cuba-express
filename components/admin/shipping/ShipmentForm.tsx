"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Package, Save } from "lucide-react";
import CustomerRecipientPicker from "@/components/admin/shipping/CustomerRecipientPicker";
import type {
  Shipment, ShipmentFeeSelection, ShipmentInput, ShippingCountry,
  ShippingDriver, ShippingExtraFee, ShippingLocation, ShippingMunicipality,
  ShippingProvince, ShippingRate, ShippingServiceType, ShippingSettings,
  ShippingStatus,
} from "@/lib/shipping/types";
import { buildLegacyLocation, calculateMoneyCommission, getShippingStatusLabel, SHIPPING_STATUSES } from "@/lib/shipping/types";

type Props = {
  storeId: string;
  shipment?: Shipment | null;
  drivers: ShippingDriver[];
  settings: ShippingSettings | null;
  countries: ShippingCountry[];
  provinces: ShippingProvince[];
  municipalities: ShippingMunicipality[];
  locations: ShippingLocation[];
  serviceTypes: ShippingServiceType[];
  rates: ShippingRate[];
  extraFees: ShippingExtraFee[];
  initialSelectedFees?: ShipmentFeeSelection[];
  initialCustomerId?: string;
  initialRecipientId?: string;
  submitting: boolean;
  onSubmit: (input: ShipmentInput) => Promise<void>;
};

export default function ShipmentForm(props: Props) {
  const { storeId, shipment, drivers, settings, countries, provinces, municipalities, locations, serviceTypes, rates, extraFees, initialSelectedFees = [], initialCustomerId = "", initialRecipientId = "", submitting, onSubmit } = props;
  const [error, setError] = useState("");
  const [form, setForm] = useState<ShipmentInput>({
    customer_id: shipment?.customer_id || null,
    recipient_id: shipment?.recipient_id || null,
    recipient_identity_card: shipment?.recipient_identity_card || "",
    location: shipment?.location || "",
    country_id: shipment?.country_id || settings?.default_country_id || null,
    province_id: shipment?.province_id || settings?.default_province_id || null,
    municipality_id: shipment?.municipality_id || null,
    shipping_location_id: shipment?.shipping_location_id || null,
    service_type_id: shipment?.service_type_id || null,
    service_type_name: shipment?.service_type_name || null,
    recipient_name: shipment?.recipient_name || "",
    recipient_address: shipment?.recipient_address || "",
    recipient_phone: shipment?.recipient_phone || "",
    sender_name: shipment?.sender_name || "",
    sender_phone: shipment?.sender_phone || "",
    notes: shipment?.notes || "",
    status: (shipment?.status || "preparing") as ShippingStatus,
    assigned_driver_id: shipment?.assigned_driver_id || null,
    assigned_driver_name: shipment?.assigned_driver_name || null,
    public_tracking_enabled: shipment?.public_tracking_enabled ?? true,
    contains_package: shipment?.contains_package ?? true,
    contains_money: shipment?.contains_money ?? false,
    weight_lb: Number(shipment?.weight_lb || 0),
    rate_per_lb: Number(shipment?.rate_per_lb || 0),
    weight_subtotal: Number(shipment?.weight_subtotal || 0),
    money_amount: Number(shipment?.money_amount || 0),
    money_commission_rate: Number(shipment?.money_commission_rate || 0),
    money_commission: Number(shipment?.money_commission || 0),
    money_discount: Number(shipment?.money_discount || 0),
    money_discount_reason: shipment?.money_discount_reason || "",
    money_total: Number(shipment?.money_total || 0),
    extra_fees_total: Number(shipment?.extra_fees_total || 0),
    discount_amount: Number(shipment?.discount_amount || 0),
    discount_reason: shipment?.discount_reason || "",
    service_price: Number(shipment?.service_price || 0),
    amount_paid: Number(shipment?.amount_paid || 0),
    balance_due: Number(shipment?.balance_due || 0),
    payment_method: shipment?.payment_method || "",
    selected_fees: initialSelectedFees,
  });

  const filteredProvinces = useMemo(() => provinces.filter(x => !form.country_id || x.country_id === form.country_id), [provinces, form.country_id]);
  const filteredMunicipalities = useMemo(() => municipalities.filter(x => !form.province_id || x.province_id === form.province_id), [municipalities, form.province_id]);
  const filteredLocations = useMemo(() => locations.filter(x => !form.municipality_id || x.municipality_id === form.municipality_id), [locations, form.municipality_id]);

  useEffect(() => {
    const location = locations.find(x => x.id === form.shipping_location_id);
    const service = serviceTypes.find(x => x.id === form.service_type_id);
    const matchingRates = rates.filter(
      (item) => item.service_type_id === service?.id && item.is_active
    );
    const rate =
      matchingRates.find(
        (item) =>
          item.scope_type === "location" &&
          item.location_id === form.shipping_location_id
      ) ||
      matchingRates.find(
        (item) =>
          item.scope_type === "municipality" &&
          item.municipality_id === form.municipality_id
      ) ||
      matchingRates.find(
        (item) =>
          item.scope_type === "province" &&
          item.province_id === form.province_id
      ) ||
      matchingRates.find(
        (item) =>
          item.scope_type === "country" &&
          item.country_id === form.country_id
      );
    const effectiveWeight = Math.max(Number(form.weight_lb || 0), Number(rate?.minimum_weight_lb || 0));
    const specificRate = Number(rate?.rate_per_lb || 0);
    const fallbackRate = Number(settings?.default_rate_per_lb || 0);
    const ratePerLb = form.contains_package
      ? specificRate > 0
        ? specificRate
        : fallbackRate
      : 0;
    const packageSubtotal = form.contains_package ? Math.max(effectiveWeight * ratePerLb, Number(rate?.minimum_charge || 0)) : 0;
    const calculatedFees = form.selected_fees.map(fee => {
      let amount = Number(fee.configured_amount || 0);
      if (fee.calculation_type === "per_lb") amount *= effectiveWeight;
      if (fee.calculation_type === "percentage") amount = packageSubtotal * amount / 100;
      return { ...fee, calculated_amount: Number(amount.toFixed(2)) };
    });
    const feesTotal = calculatedFees.reduce((sum, fee) => sum + fee.calculated_amount, 0);
    const money = settings ? calculateMoneyCommission(form.money_amount, settings) : { rate: 0, commission: 0 };
    const maxDiscount = settings?.maximum_manual_discount;
    const requestedDiscount = settings?.allow_manual_discount ? Math.max(form.money_discount, 0) : 0;
    const moneyDiscount = maxDiscount == null ? requestedDiscount : Math.min(requestedDiscount, Number(maxDiscount));
    const moneyTotal = form.contains_money ? Math.max(money.commission - moneyDiscount, 0) : 0;
    const total = Math.max(packageSubtotal + moneyTotal + feesTotal - Math.max(form.discount_amount, 0), 0);
    const balance = Math.max(total - Math.max(form.amount_paid, 0), 0);
    const legacy = location ? buildLegacyLocation(location.legacy_code, form.contains_package ? (service?.legacy_prefix || "") : "") : form.location;

    setForm(current => ({
      ...current,
      location: legacy,
      service_type_name: service?.name || current.service_type_name,
      rate_per_lb: Number(ratePerLb.toFixed(2)),
      weight_subtotal: Number(packageSubtotal.toFixed(2)),
      selected_fees: calculatedFees,
      extra_fees_total: Number(feesTotal.toFixed(2)),
      money_commission_rate: money.rate,
      money_commission: money.commission,
      money_discount: Number(moneyDiscount.toFixed(2)),
      money_total: Number(moneyTotal.toFixed(2)),
      service_price: Number(total.toFixed(2)),
      balance_due: Number(balance.toFixed(2)),
    }));
  }, [form.contains_package, form.contains_money, form.shipping_location_id, form.service_type_id, form.weight_lb, form.money_amount, form.money_discount, form.discount_amount, form.amount_paid, form.selected_fees.map(x => x.fee_id).join(","), locations, serviceTypes, rates, settings]);

  const set = <K extends keyof ShipmentInput>(key: K, value: ShipmentInput[K]) => setForm(current => ({ ...current, [key]: value }));
  const phone = (value: string) => value.replace(/\D/g, "").slice(0, settings?.phone_digits_max || 15);
  const toggleFee = (fee: ShippingExtraFee) => set("selected_fees", form.selected_fees.some(x => x.fee_id === fee.id) ? form.selected_fees.filter(x => x.fee_id !== fee.id) : [...form.selected_fees, { fee_id: fee.id, fee_name: fee.name, calculation_type: fee.calculation_type, configured_amount: Number(fee.amount), calculated_amount: Number(fee.amount) }]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!form.contains_package && !form.contains_money) return setError("Selecciona paquete, dinero o ambos.");
    if (!form.shipping_location_id) return setError("Selecciona el lugar de entrega.");
    if (form.contains_package && (!form.service_type_id || form.weight_lb <= 0)) return setError("Selecciona el tipo de paquete y un peso mayor que cero.");
    if (form.contains_money && form.money_amount <= 0) return setError("Escribe el monto de dinero enviado.");
    if (!form.recipient_name.trim()) return setError("El destinatario es obligatorio.");
    if (form.recipient_phone.length < (settings?.phone_digits_min || 1)) return setError("El teléfono del destinatario no es válido.");
    try { await onSubmit(form); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
  }

  return <form onSubmit={submit} className="space-y-6">
    {error && <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}

    <CustomerRecipientPicker
      storeId={storeId}
      countries={countries}
      provinces={provinces}
      municipalities={municipalities}
      locations={locations}
      initialPhone={form.sender_phone}
      initialCustomerId={initialCustomerId}
      initialRecipientId={initialRecipientId}
      onApply={(selection) =>
        setForm((current) => ({
          ...current,
          customer_id: selection.customer_id,
          recipient_id: selection.recipient_id,
          sender_name: selection.sender_name,
          sender_phone: selection.sender_phone,
          recipient_name: selection.recipient_name || current.recipient_name,
          recipient_phone: selection.recipient_phone || current.recipient_phone,
          recipient_address:
            selection.recipient_address || current.recipient_address,
          recipient_identity_card:
            selection.recipient_identity_card ||
            current.recipient_identity_card,
          country_id: selection.country_id || current.country_id,
          province_id: selection.province_id || current.province_id,
          municipality_id:
            selection.municipality_id || current.municipality_id,
          shipping_location_id:
            selection.shipping_location_id ||
            current.shipping_location_id,
          location: selection.location || current.location,
        }))
      }
    />

    <Section title="Contenido de la operación">
      <div className="grid gap-3 md:grid-cols-2">
        <Toggle checked={form.contains_package} onChange={v => set("contains_package", v)} icon={<Package />} title="Incluye paquete" />
        <Toggle checked={form.contains_money} onChange={v => set("contains_money", v)} icon={<Banknote />} title="Incluye dinero" />
      </div>
    </Section>

    <Section title="Destino y destinatario">
      <div className="grid gap-4 md:grid-cols-3">
        <Select label="País" value={form.country_id || ""} onChange={v => { set("country_id", v || null); set("province_id", null); set("municipality_id", null); set("shipping_location_id", null); }} options={countries.filter(x=>x.is_active).map(x=>[x.id,x.name])} />
        <Select label="Provincia" value={form.province_id || ""} onChange={v => { set("province_id", v || null); set("municipality_id", null); set("shipping_location_id", null); }} options={filteredProvinces.filter(x=>x.is_active).map(x=>[x.id,x.name])} />
        <Select label="Municipio" value={form.municipality_id || ""} onChange={v => { set("municipality_id", v || null); set("shipping_location_id", null); }} options={filteredMunicipalities.filter(x=>x.is_active).map(x=>[x.id,x.name])} />
        <Select label="Lugar" value={form.shipping_location_id || ""} onChange={v => set("shipping_location_id", v || null)} options={filteredLocations.filter(x=>x.is_active).map(x=>[x.id,x.name])} />
        {form.contains_package && <Select label="Tipo de paquete" value={form.service_type_id || ""} onChange={v => set("service_type_id", v || null)} options={serviceTypes.filter(x=>x.is_active && x.code.toLowerCase() !== "money").map(x=>[x.id,x.name])} />}
        <Input label="Código APK" value={form.location} readOnly />
        <Input label="Destinatario" value={form.recipient_name} onChange={v=>set("recipient_name",v)} />
        <Input label="Teléfono destinatario" value={form.recipient_phone} onChange={v=>set("recipient_phone",phone(v))} inputMode="numeric" />
        <Input label="Dirección" value={form.recipient_address} onChange={v=>set("recipient_address",v)} />
      </div>
      <label className="block"><span className="mb-2 block text-sm font-black">Notas</span><textarea className={inputClass+" min-h-24"} value={form.notes} onChange={e=>set("notes",e.target.value)} /></label>
    </Section>

    <Section title="Remitente y operación">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Remitente" value={form.sender_name} onChange={v=>set("sender_name",v)} />
        <Input label="Teléfono remitente" value={form.sender_phone} onChange={v=>set("sender_phone",phone(v))} inputMode="numeric" />
        <Select label="Estado" value={form.status} onChange={v=>set("status",v as ShippingStatus)} options={SHIPPING_STATUSES.map(x=>[x,getShippingStatusLabel(x)])} />
        <Select label="Repartidor" value={form.assigned_driver_id || ""} onChange={v=>{ const d=drivers.find(x=>x.id===v); set("assigned_driver_id",d?.id||null); set("assigned_driver_name",d?.name||null); }} options={drivers.filter(x=>x.is_active).map(x=>[x.id,x.name])} />
      </div>
    </Section>

    {form.contains_package && <Section title="Cálculo del paquete">
      <div className="grid gap-4 md:grid-cols-3">
        <NumberInput label="Peso (lb)" value={form.weight_lb} onChange={v=>set("weight_lb",v)} />
        <Input label="Tarifa por libra" value={form.rate_per_lb.toFixed(2)} readOnly />
        <Input label="Subtotal paquete" value={form.weight_subtotal.toFixed(2)} readOnly />
      </div>
      {form.rate_per_lb <= 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          No existe una tarifa para este lugar y tipo de paquete. Configura una tarifa específica o la tarifa general en Ajustes de envíos.
        </div>
      )}
    </Section>}

    {form.contains_money && <Section title="Cálculo del dinero">
      <div className="grid gap-4 md:grid-cols-4"><NumberInput label="Monto enviado" value={form.money_amount} onChange={v=>set("money_amount",v)} /><Input label="Porcentaje" value={`${form.money_commission_rate.toFixed(2)}%`} readOnly /><Input label="Comisión" value={form.money_commission.toFixed(2)} readOnly /><Input label="Total dinero" value={form.money_total.toFixed(2)} readOnly /></div>
      {settings?.allow_manual_discount && <div className="grid gap-4 md:grid-cols-2"><NumberInput label="Descuento comisión" value={form.money_discount} onChange={v=>set("money_discount",v)} /><Input label="Motivo descuento" value={form.money_discount_reason} onChange={v=>set("money_discount_reason",v)} /></div>}
      <div className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-900">{form.money_amount >= Number(settings?.money_threshold || 1000) ? `${settings?.money_rate_at_or_above_threshold || 5}% sobre todo el monto.` : `${settings?.money_rate_below_threshold || 8}% sobre el monto.`}</div>
    </Section>}

    <Section title="Fees, descuentos y total">
      <div className="grid gap-3 md:grid-cols-2">{extraFees.filter(x=>x.is_active).map(fee=><label key={fee.id} className="flex items-center justify-between rounded-2xl border p-4"><span className="font-bold">{fee.name}</span><input type="checkbox" checked={form.selected_fees.some(x=>x.fee_id===fee.id)} onChange={()=>toggleFee(fee)} /></label>)}</div>
      <div className="grid gap-4 md:grid-cols-3"><Input label="Fees" value={form.extra_fees_total.toFixed(2)} readOnly /><NumberInput label="Descuento general" value={form.discount_amount} onChange={v=>set("discount_amount",v)} /><Input label="Motivo descuento" value={form.discount_reason} onChange={v=>set("discount_reason",v)} /><Input label="Total" value={form.service_price.toFixed(2)} readOnly /><NumberInput label="Pagado" value={form.amount_paid} onChange={v=>set("amount_paid",v)} /><Input label="Saldo" value={form.balance_due.toFixed(2)} readOnly /></div>
    </Section>

    <button disabled={submitting} className="inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-6 py-3 font-black text-white">{submitting?<Loader2 className="animate-spin"/>:<Save/>}{shipment?"Guardar cambios":"Crear operación"}</button>
  </form>;
}

const inputClass="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none";
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-[2rem] border bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-black text-[#061b3a]">{title}</h2><div className="space-y-4">{children}</div></section>}
function Toggle({checked,onChange,icon,title}:{checked:boolean;onChange:(v:boolean)=>void;icon:React.ReactNode;title:string}){return <label className={`flex items-center gap-4 rounded-3xl border p-5 ${checked?"border-blue-500 bg-blue-50":""}`}><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>{icon}<span className="font-black">{title}</span></label>}
function Input({label,value,onChange,readOnly,inputMode}:{label:string;value:string;onChange?:(v:string)=>void;readOnly?:boolean;inputMode?:React.HTMLAttributes<HTMLInputElement>["inputMode"]}){return <label className="block"><span className="mb-2 block text-sm font-black">{label}</span><input className={readOnly?inputClass+" bg-slate-50":inputClass} value={value} readOnly={readOnly} inputMode={inputMode} onChange={e=>onChange?.(e.target.value)}/></label>}
function NumberInput({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){return <label className="block"><span className="mb-2 block text-sm font-black">{label}</span><input type="number" min="0" step="0.01" className={inputClass} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:(string[])[]}){return <label className="block"><span className="mb-2 block text-sm font-black">{label}</span><select className={inputClass} value={value} onChange={e=>onChange(e.target.value)}><option value="">Seleccionar</option>{options.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}
