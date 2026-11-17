import { supabaseAdmin } from "@/lib/supabase-admin";
import Image from "next/image";
import { MessageCircle, Phone, ArrowUpRight } from "lucide-react";
import PromotionSlider from "./PromotionSlider";
import ShippingCalculator from "./ShippingCalculator";
import ManagedProcedures from "./ManagedProcedures";
import PickupForm from "./PickupForm";
import CatalogSection from "./CatalogSection";
import {
  ServiceGrid,
  Benefits,
  FeaturedServices,
  OtherServices,
  Branches,
  FaqSection,
} from "./ServiceSections";
import { contact, whatsapp } from "./content";
import s from "./wfcargo.module.css";
async function loadBoxRates() {
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("slug", "wf-cago")
    .eq("is_active", true)
    .single();
  if (storeError) throw storeError;

  const [countries, services, rates] = await Promise.all([
    supabaseAdmin.from("shipping_countries").select("id,name,code")
      .eq("store_id", store.id).eq("is_active", true).order("name"),
    supabaseAdmin.from("shipping_service_types").select("id,name")
      .eq("store_id", store.id).eq("is_active", true).eq("billing_mode", "fixed"),
    supabaseAdmin.from("shipping_rates").select("country_id,service_type_id,fixed_fee")
      .eq("store_id", store.id).eq("is_active", true).eq("scope_type", "country")
      .eq("transport_mode", "sea").gt("fixed_fee", 0)
      .order("priority", { ascending: false }).order("id"),
  ]);
  const error = countries.error ?? services.error ?? rates.error;
  if (error) throw error;
  const serviceNames = new Map(services.data?.map(({ id, name }) => [id, name]));

  return (countries.data ?? []).filter(({ code }) => code !== "CU").flatMap((country) => {
    const boxes = new Map<string, { id: string; size: string; price: number }>();
    for (const rate of rates.data ?? []) {
      if (rate.country_id !== country.id || boxes.has(rate.service_type_id)) continue;
      const name = serviceNames.get(rate.service_type_id);
      const size = name?.match(/\d+\s*[x×]\s*\d+\s*[x×]\s*\d+/i)?.[0];
      const price = Number(rate.fixed_fee);
      if (size && Number.isFinite(price)) {
        boxes.set(rate.service_type_id, {
          id: rate.service_type_id,
          size: size.replace(/\s*[x×]\s*/gi, " × "),
          price,
        });
      }
    }
    return boxes.size
      ? [{ id: country.id, name: country.name, boxes: [...boxes.values()].sort((a, b) => a.price - b.price) }]
      : [];
  });
}

export default async function WfCargoLanding() {
  const destinations = await loadBoxRates().catch((error: unknown) => {
    console.error("WF Cargo box rates unavailable", error);
    return null;
  });
  return (
    <div className={s.root}>
      <a href="#contenido" className={s.skip}>
        Saltar al contenido
      </a>
      <div className={s.topbar}>
        <span>Tu agencia de envíos y multiservicios en Port St. Lucie</span>
        <a href="tel:+17722127150">
          <Phone size={13} /> {contact.phone}
        </a>
      </div>
      <header className={s.header}>
        <nav className={s.nav} aria-label="Navegación principal">
          <a href="#inicio" className={s.brand}>
            <Image
              src="/wfcargo/logo.webp"
              alt="WF Cargo Envíos"
              width={76}
              height={76}
              preload
            />
            <span>
              WF Cargo <b>Envíos</b>
              <small>Tu mundo más cerca</small>
            </span>
          </a>
          <div className={s.desktopNav}>
            <a href="#servicios">Servicios</a>
            <a href="#cotizador">Envíos</a>
            <a href="#tramites">Trámites</a>
            <a href="/casillero">Casillero Virtual</a>
            <a href="#sucursales">Sucursales</a>
          </div>
          <a
            className={s.whatsappButton}
            href={whatsapp("Hola, quisiera información sobre sus servicios.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={19} />
            <span>WhatsApp</span>
          </a>
          <details className={s.mobileMenu}>
            <summary>Menú</summary>
            <div>
              <a href="#servicios">Servicios</a>
              <a href="#cotizador">Cotizar envío</a>
              <a href="#tramites">Trámites</a>
            <a href="/casillero">Casillero Virtual</a>
              <a href="#sucursales">Sucursales</a>
            </div>
          </details>
        </nav>
      </header>
      <main id="contenido">
        <PromotionSlider />
        <ServiceGrid />
        <CatalogSection />
        <div className={s.tools}>
          <ShippingCalculator destinations={destinations} />
        </div>
        <ManagedProcedures />
        <Benefits />
        <PickupForm />
        <FeaturedServices />
        <OtherServices />
        <Branches />
        <FaqSection />
        <section className={s.contactCta}>
          <div>
            <p className={s.eyebrow}>HABLEMOS DE LO QUE NECESITAS</p>
            <h2>Estamos para ayudarte.</h2>
            <p>Un mensaje puede ser el comienzo de tu próxima solución.</p>
          </div>
          <a
            className={s.button}
            href={whatsapp("Hola, quisiera hablar con el equipo de WF Cargo.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Escríbenos por WhatsApp
            <ArrowUpRight size={20} />
          </a>
        </section>
      </main>
      <footer className={s.footer}>
        <div>
          <strong>WF Cargo Envíos</strong>
          <p>
            Fournier Investment Services LLC
            <br />
            Envíos y multiservicios · Port St. Lucie, Florida
          </p>
        </div>
        <div>
          <a href="tel:+17722127150">{contact.phone}</a>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <a href="/privacidad">Política de privacidad</a>
          <a href="/condiciones">Condiciones del servicio</a>
          <a href="/login">Acceso de personal</a>
        </div>
        <small>
          Oficina de notaría pública. No ofrecemos asesoría legal ni de
          inmigración. Tarifas y servicios sujetos a confirmación.
        </small>
      </footer>
      <a
        className={s.floatingWhatsApp}
        aria-label="Contactar a WF Cargo por WhatsApp"
        href={whatsapp("Hola, quisiera información sobre WF Cargo Envíos.")}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={27} />
      </a>
    </div>
  );
}
