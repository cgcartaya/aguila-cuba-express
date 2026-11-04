"use client";
import { Truck, ArrowUpRight } from "lucide-react";
import PickupPlannerHero from "@/components/pickups/PickupPlannerHero";
import { contact } from "./content";
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
      <PickupPlannerHero
        storeSlug="wf-cago"
        storeName="WF Cargo Envíos"
        whatsappPhone={contact.whatsapp}
        renderTrigger={(openPlanner) => (
          <form
            className={s.pickupForm}
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              openPlanner({
                customerName: String(d.get("name") || ""),
                phone: String(d.get("phone") || ""),
                address: String(d.get("address") || ""),
                packageCount: String(d.get("boxes") || "1"),
                preferredDate: String(d.get("date") || ""),
              });
            }}
          >
            <h3>Coordina tu recogida</h3>
            <div className={s.formGrid}>
              <label>
                Nombre completo
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                />
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
                <input name="boxes" type="number" min="1" max="99" required />
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
              Continuar con mi solicitud
              <ArrowUpRight size={18} />
            </button>
            <p className={s.small}>
              Confirma tu dirección en el mapa y completa la solicitud. Quedará
              guardada con un código; después podrás avisar por WhatsApp.
            </p>
          </form>
        )}
      />
    </section>
  );
}
