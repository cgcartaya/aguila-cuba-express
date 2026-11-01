"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, MessageCircle, WalletCards } from "lucide-react";
import { calculateMoneyCommission, type ShippingSettings } from "@/lib/shipping/types";
import { ALVAREZ_WHATSAPP_URL } from "./constants";

type Rates = Pick<ShippingSettings, "currency" | "money_fixed_fee_below" | "money_fixed_fee" | "money_threshold" | "money_rate_below_threshold" | "money_rate_at_or_above_threshold">;
const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default function RemittanceCalculator() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [status, setStatus] = useState("Cargando tarifas…");
  const [amountText, setAmountText] = useState("100");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("Cargando tarifas…");
    fetch("/api/public/remittances/config", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.settings || data.settings.currency !== "USD") throw new Error("No se pudieron cargar las tarifas.");
        const values = ["money_fixed_fee_below", "money_fixed_fee", "money_threshold", "money_rate_below_threshold", "money_rate_at_or_above_threshold"];
        if (!values.every(key => data.settings[key] != null && Number.isFinite(Number(data.settings[key])) && Number(data.settings[key]) >= 0)) throw new Error("Tarifas incompletas.");
        setRates(data.settings);
        setStatus("");
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("No pudimos cargar las tarifas. Inténtalo otra vez o consulta por WhatsApp."); });
    return () => controller.abort();
  }, [retry]);

  const normalized = amountText.trim().replace(",", ".");
  const amount = Number(normalized);
  const valid = /^\d+(\.\d{1,2})?$/.test(normalized) && Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(Math.round(amount * 100));
  const quote = rates && valid ? calculateMoneyCommission(amount, rates) : null;
  const total = quote ? Number((amount + quote.commission).toFixed(2)) : 0;
  const fixed = rates && amount < Number(rates.money_fixed_fee_below);
  const message = quote
    ? `Hola, Álvarez Travel. Quisiera información para enviar una remesa a Cuba.\nMonto enviado: ${usd(amount)} USD\nComisión estimada: ${usd(quote.commission)} USD\nTotal a pagar: ${usd(total)} USD\n¿Me confirman los requisitos y las condiciones para realizarla?`
    : "Hola, Álvarez Travel. Quisiera información sobre las remesas a Cuba.";
  const whatsapp = `${ALVAREZ_WHATSAPP_URL}?text=${encodeURIComponent(message)}`;

  return (
    <section id="remesas" aria-labelledby="remittance-title" className="scroll-mt-28 border-y border-white/10 bg-[#000415] px-5 py-14 sm:px-7 sm:py-20 lg:px-10">
      <div className="mx-auto grid max-w-[1040px] gap-9 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-14">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#091D3D] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/80"><WalletCards size={16} /> Remesas a Cuba</span>
          <h2 id="remittance-title" className="mt-5 text-3xl font-black uppercase leading-tight tracking-tight sm:text-4xl">Más cerca de los tuyos.<br /><span className="text-[#FF2948]">Cuentas claras.</span></h2>
          <p className="mt-4 max-w-md leading-7 text-[#B5BFCD]">Elige cuánto quieres enviar. Conoce la comisión y el total antes de completar tu pedido.</p>
          {rates && <div className="mt-7 space-y-3">
            {[
              { label: `Menos de ${usd(Number(rates.money_fixed_fee_below))}`, value: `${usd(Number(rates.money_fixed_fee))} fijos`, active: valid && fixed },
              { label: `Desde ${usd(Number(rates.money_fixed_fee_below))} hasta menos de ${usd(Number(rates.money_threshold))}`, value: `${rates.money_rate_below_threshold}%`, active: valid && !fixed && amount < Number(rates.money_threshold) },
              { label: `Desde ${usd(Number(rates.money_threshold))}`, value: `${rates.money_rate_at_or_above_threshold}%`, active: valid && amount >= Number(rates.money_threshold) },
            ].map(tier => <div key={tier.label} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-4 ${tier.active ? "border-[#CA0C28] bg-[#CA0C28]/10" : "border-white/10 bg-[#091D3D]"}`}><span className="text-sm text-white/80">{tier.label}</span><strong className="shrink-0 text-lg">{tier.value}</strong></div>)}
          </div>}
          <p className="mt-5 flex items-center gap-2 text-sm text-[#B5BFCD]"><Check size={16} className="shrink-0" /> Los porcentajes se aplican a todo el monto enviado.</p>
        </div>
        <div className="min-w-0 rounded-[28px] bg-white p-6 text-[#091D3D] shadow-2xl sm:p-8">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#091D3D] text-white"><WalletCards size={23} /></span><div><p className="text-xs font-bold uppercase tracking-widest text-[#CA0C28]">Sin sorpresas</p><h3 className="text-xl font-black">Cotiza tu remesa</h3></div></div>
          <label htmlFor="remittance-amount" className="mt-7 block text-sm font-bold">¿Cuánto quieres enviar?</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-slate-200 px-4 focus-within:border-[#07409A]">
            <span aria-hidden="true" className="text-2xl font-bold">$</span>
            <input id="remittance-amount" type="text" inputMode="decimal" maxLength={14} value={amountText} onChange={event => setAmountText(event.target.value)} aria-describedby="remittance-help" aria-invalid={!valid} className="min-w-0 flex-1 bg-transparent py-4 text-3xl font-black text-[#091D3D] outline-none" />
            <span className="text-sm font-bold text-slate-500">USD</span>
          </div>
          <p id="remittance-help" className={`mt-2 text-xs ${valid ? "text-slate-500" : "text-red-700"}`}>{valid ? "El destinatario recibe el monto que indiques." : "Escribe un monto mayor que cero, con hasta dos decimales."}</p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-5" aria-live="polite" aria-atomic="true">
            {status ? <div role="status"><p className="text-sm text-slate-600">{status}</p>{status !== "Cargando tarifas…" && <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-3 text-sm font-bold text-[#07409A] underline">Reintentar</button>}</div> : quote ? <>
              <div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">Monto enviado</span><strong>{usd(amount)}</strong></div>
              <div className="mt-3 flex justify-between gap-3 text-sm"><span className="text-slate-500">Comisión · {fixed ? "cargo fijo" : `${quote.rate}%`}</span><strong>{usd(quote.commission)}</strong></div>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-2 border-t border-slate-200 pt-4"><span className="font-bold">Total a pagar</span><strong className="text-3xl font-black tracking-tight text-[#CA0C28]">{usd(total)} <span className="text-xs">USD</span></strong></div>
            </> : <p className="text-sm text-slate-600">Introduce un monto válido para ver tu cotización.</p>}
          </div>
          {quote && !status && <Link href={`/tienda/remesas?amount=${amount.toFixed(2)}`} className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#091D3D] px-4 text-center font-bold text-white">Continuar con mi remesa <ArrowRight size={18}/></Link>}
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#CA0C28] px-4 text-center font-bold text-white transition hover:bg-[#a80920] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#07409A]"><MessageCircle size={20} className="shrink-0" /> {quote ? "Consultar esta remesa" : "Consultar por WhatsApp"} <ArrowRight size={18} className="shrink-0" /></a>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">Importes en USD. Puedes completar el pedido y coordinar el pago con la agencia.</p>
        </div>
      </div>
    </section>
  );
}
