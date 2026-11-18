"use client";
import { wfCopy, type WfLocale } from "./Language";
import { Truck, ArrowUpRight } from "lucide-react";
import PickupPlannerHero from "@/components/pickups/PickupPlannerHero";
import { contact } from "./content";
import s from "./wfcargo.module.css";
export default function PickupForm({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  return (
    <section id="recogida" className={s.pickup}>
      <div>
        <p className={s.eyebrow}>{t("VAMOS HASTA TI", "WE COME TO YOU")}</p>
        <Truck size={45} />
        <h2>
          {t("Tu envío empieza", "Your shipment starts")}
          <br />
          {t("en la puerta de casa.", "at your doorstep.")}
        </h2>
        <p>
          {t("Solicita recogida a domicilio para tus envíos a Cuba. Nuestro equipo te ayudará a coordinarla.", "Request a home pickup for shipments to Cuba. Our team will help you schedule it.")}
        </p>
        <span className={s.pill}>{t("Recogidas todas las tardes", "Afternoon pickups")}</span>
        <p className={s.small}>
          {t("Sujeto a cobertura y disponibilidad. La fecha se confirma con la agencia.", "Subject to service area and availability. Confirm the date with our team.")}
        </p>
      </div>
      <PickupPlannerHero
        storeSlug="wf-cago"
        locale={locale}
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
            <h3>{t("Coordina tu recogida", "Schedule your pickup")}</h3>
            <div className={s.formGrid}>
              <label>
                {t("Nombre completo", "Full name")}
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                />
              </label>
              <label>
                {t("Teléfono", "Phone")}
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
              {t("Dirección y código postal", "Street address and ZIP code")}
              <input
                name="address"
                autoComplete="street-address"
                required
                maxLength={250}
              />
            </label>
            <div className={s.formGrid}>
              <label>
                {t("Cantidad de cajas", "Number of boxes")}
                <input name="boxes" type="number" min="1" max="99" required />
              </label>
              <label>
                {t("Fecha preferida", "Preferred date")}
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
              {t("Continuar con mi solicitud", "Continue with my request")}
              <ArrowUpRight size={18} />
            </button>
            <p className={s.small}>
              {t("Confirma tu dirección en el mapa y completa la solicitud. Quedará guardada con un código; después podrás avisar por WhatsApp.", "Confirm your address on the map and complete your request. You’ll get a reference code and can follow up on WhatsApp.")}
            </p>
          </form>
        )}
      />
    </section>
  );
}
