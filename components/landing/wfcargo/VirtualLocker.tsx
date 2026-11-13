"use client";

import { useState, type FormEvent } from "react";
import s from "./wfcargo.module.css";

export default function VirtualLocker() {
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { accepted, ...details } = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setMessage("");
    try {
      const result = await fetch("/api/public/lockers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, accepted: accepted === "on" }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error);
      setAddress(`${details.customer_name} – ${data.code}\n10546 S US Hwy 1\nPort St. Lucie, FL 34952\nTel. 772-212-7150`);
      setWhatsapp(`https://wa.me/17725771507?text=${encodeURIComponent(`Hola, quiero prealertar una compra para ${data.code}. Rastreo: \nTienda: \nContenido: \nValor pagado: `)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el casillero.");
    } finally {
      setBusy(false);
    }
  }

  return <section id="casillero" className={s.tools}>
    <h2>Casillero Virtual</h2>
    <p>Recibe tus compras de Amazon, Walmart, eBay y otras tiendas en WF Cargo. Usa tu nombre completo y tu código WF en la dirección de entrega de cada compra.</p>
    {address ? <>
      <h3>Tu dirección para comprar en Estados Unidos</h3>
      <p style={{ whiteSpace: "pre-line" }}>{address}</p>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(address); setMessage("Dirección copiada."); }
        catch { setMessage("Selecciona la dirección para copiarla."); }
      }}>Copiar dirección</button>
      <p>Guarda tu código. Prealerta cada compra con el rastreo, la tienda, el contenido, el valor pagado y la factura.</p>
      <a href={whatsapp}>Prealertar por WhatsApp</a>
    </> : <form onSubmit={register} className="grid max-w-xl gap-3">
      <label>Nombre completo <input name="customer_name" autoComplete="name" required maxLength={120} /></label>
      <label>Correo <input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>Teléfono <input name="phone" type="tel" autoComplete="tel" required maxLength={24} /></label>
      <label>País y dirección de entrega <textarea name="destination" required maxLength={350} /></label>
      <label>Número de identificación <input name="identification" required maxLength={60} /></label>
      <details>
        <summary>Reglas del casillero</summary>
        <p>Fournier Investment Services LLC opera el servicio. El casillero es personal. WF Cargo verifica la identificación antes del despacho y retiene los paquetes cuyo nombre o código no coincide hasta que se acredite la compra.</p>
        <p>Prealerta cada compra por WhatsApp con su factura. La recepción se confirma cuando WF Cargo registra el paquete. La agencia puede abrirlo para inspección. Tienes 30 días de almacenaje gratuito y luego se cobra $1 por paquete al día.</p>
        <p>La agencia confirma el destino, los artículos admitidos, la tarifa, el seguro y los cargos antes del pago. Puedes solicitar consolidación. El despacho requiere el pago total.</p>
      </details>
      <label><input type="checkbox" name="accepted" required /> Leí y acepto las reglas del casillero.</label>
      <button className={s.whatsappButton} disabled={busy}>{busy ? "Registrando…" : "Abrir mi casillero"}</button>
    </form>}
    <p role="status">{message}</p>
  </section>;
}
