import { wfCopy, type WfLocale } from "./Language";
import { headers } from "next/headers";
import { procedurePublicStore } from "@/lib/procedures/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Phone, ArrowUpRight } from "lucide-react";
import PromotionSlider from "./PromotionSlider";
import ShippingCalculator from "./ShippingCalculator";
import ManagedProcedures from "./ManagedProcedures";
import PickupForm from "./PickupForm";
import { wfRemittancesHref } from "./remittances";
import AboutSection from "./AboutSection";
import CatalogSection from "./CatalogSection";
import {
  ServiceGrid,
  Benefits,
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
      ? [{ id: country.id, name: country.name, code: country.code, boxes: [...boxes.values()].sort((a, b) => a.price - b.price) }]
      : [];
  });
}

export default async function WfCargoLanding({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  const host = (await headers()).get("host") || "invalid.local";
  const [procedureStore, destinations] = await Promise.all([
    procedurePublicStore(new Request(`https://${host}`)),
    loadBoxRates().catch((error: unknown) => {
      console.error("WF Cargo box rates unavailable", error);
      return null;
    }),
  ]);
  return (
    <div className={s.root} lang={locale}>
      <a href="#contenido" className={s.skip}>
        {t("Saltar al contenido", "Skip to content")}
      </a>
      <div className={s.topbar}>
        <span>{t("Tu agencia de envíos y multiservicios en Port St. Lucie", "Your shipping and service center in Port St. Lucie")}</span>
        <a href="tel:+17722127150">
          <Phone size={13} /> {contact.phone}
        </a>
      </div>
      <header className={s.header}>
        <nav className={s.nav} aria-label={t("Navegación principal", "Main navigation")}>
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
              <small>{t("Tu mundo más cerca", "Bringing your world closer")}</small>
            </span>
          </a>
          <div className={s.desktopNav}>
            <a href="#servicios">{t("Servicios", "Services")}</a>
            <a href="#cotizador">{t("Envíos", "Shipping")}</a>
            <Link href={wfRemittancesHref(locale)}>{t("Remesas", "Money transfers")}</Link>
            <a href="#tramites">{t("Trámites", "Document services")}</a>
            <Link href="/casillero">{t("Casillero Virtual", "Virtual locker")}</Link>
            <a href="#sucursales">{t("Sucursales", "Locations")}</a>
            <a href="#quienes-somos">{t("Quiénes somos", "About us")}</a>
          </div>
          <div className={s.languageLinks} role="group" aria-label={t("Idioma", "Language")}>
            <Link href="/" lang="es" hrefLang="es" aria-label="Español" aria-current={locale === "es" ? "page" : undefined}>ES</Link>
            <Link href="/?lang=en" lang="en" hrefLang="en" aria-label="English" aria-current={locale === "en" ? "page" : undefined}>EN</Link>
          </div>
          <a
            className={s.whatsappButton}
            href={whatsapp(t("Hola, quisiera información sobre sus servicios.", "Hello, I’d like information about your services."))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={19} />
            <span>WhatsApp</span>
          </a>
          <details className={s.mobileMenu}>
            <summary>{t("Menú", "Menu")}</summary>
            <div>
              <a href="#servicios">{t("Servicios", "Services")}</a>
              <a href="#cotizador">{t("Cotizar envío", "Get a shipping quote")}</a>
              <Link href={wfRemittancesHref(locale)}>{t("Remesas", "Money transfers")}</Link>
              <a href="#tramites">{t("Trámites", "Document services")}</a>
              <Link href="/casillero">{t("Casillero Virtual", "Virtual locker")}</Link>
              <a href="#sucursales">{t("Sucursales", "Locations")}</a>
              <a href="#quienes-somos">{t("Quiénes somos", "About us")}</a>
            </div>
          </details>
        </nav>
      </header>
      <main id="contenido">
        <PromotionSlider locale={locale} />
        <ServiceGrid locale={locale} />
        <div className={s.tools}>
          <ShippingCalculator locale={locale} destinations={destinations} />
        </div>
        <CatalogSection locale={locale} />
        {procedureStore && <ManagedProcedures locale={locale} />}
        <Benefits locale={locale} />
        <PickupForm locale={locale} />
        <Branches locale={locale} />
        <FaqSection locale={locale} />
        <AboutSection locale={locale} />
        <section className={s.contactCta}>
          <div>
            <p className={s.eyebrow}>{t("HABLEMOS DE LO QUE NECESITAS", "TELL US WHAT YOU NEED")}</p>
            <h2>{t("Estamos para ayudarte.", "We’re here to help.")}</h2>
            <p>{t("Un mensaje puede ser el comienzo de tu próxima solución.", "Send us a message and we’ll help you get started.")}</p>
          </div>
          <a
            className={s.button}
            href={whatsapp(t("Hola, quisiera hablar con el equipo de WF Cargo.", "Hello, I’d like to speak with the WF Cargo team."))}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Escríbenos por WhatsApp", "Message us on WhatsApp")}
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
            {t("Envíos y multiservicios · Port St. Lucie, Florida", "Shipping and related services · Port St. Lucie, Florida")}
          </p>
        </div>
        <div>
          <a href="tel:+17722127150">{contact.phone}</a>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <a href="#quienes-somos">{t("Quiénes somos", "About us")}</a>
          <Link href={wfRemittancesHref(locale)}>{t("Remesas", "Money transfers")}</Link>
          <Link href="/privacidad">{t("Política de privacidad", "Privacy policy")}</Link>
          <Link href="/condiciones">{t("Condiciones del servicio", "Terms of service")}</Link>
          <Link href="/login">{t("Acceso de personal", "Staff sign-in")}</Link>
        </div>
        <small>
          {t("Tarifas y servicios sujetos a confirmación.", "Rates and services are subject to confirmation.")}
        </small>
      </footer>
      <a
        className={s.floatingWhatsApp}
        aria-label={t("Contactar a WF Cargo por WhatsApp", "Contact WF Cargo on WhatsApp")}
        href={whatsapp(t("Hola, quisiera información sobre WF Cargo Envíos.", "Hello, I’d like information about WF Cargo Envíos."))}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={27} />
      </a>
    </div>
  );
}
