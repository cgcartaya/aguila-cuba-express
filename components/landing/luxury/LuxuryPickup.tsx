"use client";
import { ArrowUpRight, Truck } from "lucide-react";
import PickupPlannerHero from "@/components/pickups/PickupPlannerHero";
import { LUXURY_PICKUP_CITIES, LUXURY_PICKUP_STORE_SLUG } from "@/lib/pickups/luxury-coverage";
import { contact } from "./content";
import s from "./luxury.module.css";

export default function LuxuryPickup() {
  return <PickupPlannerHero
    storeSlug={LUXURY_PICKUP_STORE_SLUG}
    storeName="Luxury Travel Point"
    whatsappPhone={contact.whatsapp}
    renderTrigger={(openPlanner) => <div id="recogidas" className={s.pickup}>
      <Truck size={38} strokeWidth={1.3} aria-hidden="true" />
      <div>
        <h3>De tu casa, camino a los tuyos.</h3>
        <p>Recogida <b>gratis en Lehigh Acres</b>. Fort Myers, North Fort Myers, Cape Coral, LaBelle, Bonita Springs y Estero: <b>$25</b>.</p>
        <p className={s.pickupCities}>Cobertura: {LUXURY_PICKUP_CITIES.join(" · ")}.</p>
        <small>Martes a sábado, 9 a. m.–6 p. m. Lunes y domingos: según disponibilidad y coordinación previa. La agencia confirmará la fecha y el cargo.</small>
      </div>
      <button type="button" className={s.goldButton} onClick={() => openPlanner()}>
        Solicitar recogida <ArrowUpRight size={18} />
      </button>
    </div>}
  />;
}
