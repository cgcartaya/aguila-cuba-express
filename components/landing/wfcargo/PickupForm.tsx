"use client";
import { Truck, ArrowUpRight } from "lucide-react";
import { whatsapp } from "./content";
import s from "./wfcargo.module.css";
export default function PickupForm() {
  return (
    <section id="recogida" className={s.pickup}>
      <div>
        <p className={s.eyebrow}>VAMOS HASTA TI</p>
        <Truck size={45} />
        <h2>
          Tu envío empieza
          <br />
          en la puerta de casa.
        </h2>
        <p>
          Solicita recogida a domicilio para tus envíos a Cuba. Nuestro equipo
          te ayudará a coordinarla.
        </p>
        <span className={s.pill}>Recogidas todas las tardes</span>
        <p className={s.small}>
          Sujeto a cobertura y disponibilidad. La fecha se confirma con la
          agencia.
        </p>
      </div>
      <form
        className={s.pickupForm}
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          window.open(
            whatsapp(
              `Hola, quisiera solicitar una recogida para enviar a Cuba.\nNombre: ${d.get("name")}\nTeléfono: ${d.get("phone")}\nDirección: ${d.get("address")}\nCajas: ${d.get("boxes")}\nFecha solicitada: ${d.get("date")}\nQuedo pendiente de confirmar cobertura y disponibilidad.`,
            ),
            "_blank",
            "noopener,noreferrer",
          );
        }}
      >
        <h3>Coordina tu recogida</h3>
        <div className={s.formGrid}>
          <label>
            Nombre completo
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
          <label>
            Teléfono
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={30}
            />
          </label>
        </div>
        <label>
          Dirección y código postal
          <input
            name="address"
            autoComplete="street-address"
            required
            maxLength={250}
          />
        </label>
        <div className={s.formGrid}>
          <label>
            Cantidad de cajas
            <input name="boxes" type="number" min="1" max="100" required />
          </label>
          <label>
            Fecha preferida
            <input
              name="date"
              type="date"
              required
              min={new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/New_York",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date())}
            />
          </label>
        </div>
        <button className={s.button}>
          Continuar en WhatsApp
          <ArrowUpRight size={18} />
        </button>
        <p className={s.small}>
          Se abrirá WhatsApp con tu solicitud preparada. Revisa y envía el
          mensaje para contactar a la agencia.
        </p>
      </form>
    </section>
  );
}
