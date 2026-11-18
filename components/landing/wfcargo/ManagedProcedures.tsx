"use client";

import { wfCopy, type WfLocale } from "./Language";
import { usePublicProcedures } from "@/components/procedures/usePublicProcedures";
import Image from "next/image";
import { ChevronRight, Clock, FileText, Headset, Lock, MessageCircle, Phone, ShieldCheck, Users } from "lucide-react";
import { contact, whatsapp } from "./content";
import NotaryNotice from "./NotaryNotice";
import { localizeProcedure } from "./procedure-copy";
import styles from "./wfcargo.module.css";

const servicePhotos: Record<string, { src: string }> = {
  "pasaporte-cubano": { src: "/wfcargo/pasaporte-cubano.webp" },
  "pasaporte-americano": { src: "/wfcargo/pasaporte-americano.webp" },
  "apostilla": { src: "/wfcargo/apostilla.webp" },
  "notarizacion": { src: "/wfcargo/notarizacion.webp" },
  "evisa-cuba": { src: "/wfcargo/evisa-cuba.webp" },
  "renta-carros": { src: "/wfcargo/renta-carros.webp" },
};
const serviceOrder = Object.keys(servicePhotos);

export default function ManagedProcedures({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  const { catalog, loading, catalogUnavailable, service, setService, variant, setVariant, result, setResult, error, setError, busy, entry, option, submit } = usePublicProcedures();

  const selectedConfiguration = entry ? localizeProcedure(entry, locale) : null;
  const selectedOption = selectedConfiguration?.variants.find(item => item.id === option?.id);

  return (
    <section id="tramites" className={styles.procedureSection} aria-labelledby="wf-procedures-title">
      <header className={styles.procedureHero}>
        <div>
          <span className={styles.procedureBadge}><FileText size={18} aria-hidden="true" /> {t("Trámites con WF Cargo", "Document services at WF Cargo")}</span>
          <h2 id="wf-procedures-title">{t("Gestión de Trámites", "Document services")}</h2>
          <p>{t("Te apoyamos con la preparación y gestión de tus documentos de forma segura, rápida y con atención personalizada.", "We help you prepare and manage your documents with prompt, confidential, personalized support.")}</p>
          <ul className={styles.procedureBenefits}>
            <li><ShieldCheck aria-hidden="true" /> {t("Apoyo confiable", "Reliable support")}</li>
            <li><Clock aria-hidden="true" /> {t("Gestión ágil", "Prompt service")}</li>
            <li><Users aria-hidden="true" /> {t("Acompañamiento personalizado", "Personalized help")}</li>
            <li><Lock aria-hidden="true" /> {t("Confidencialidad de tus datos", "Confidential handling of your information")}</li>
          </ul>
        </div>
        <div className={styles.procedureHeroImage}>
          <Image src="/wfcargo/hero-tramites.webp" alt="" fill unoptimized />
        </div>
      </header>
      <div className={styles.procedureBody}>
        {!catalog.length && <p role="status">{loading ? t("Cargando trámites…", "Loading document services…") : catalogUnavailable
          ? t("No pudimos cargar los trámites. Inténtalo de nuevo en unos minutos.", "We couldn’t load document services. Try again in a few minutes.")
          : t("Las solicitudes en línea estarán disponibles cuando WF Cargo publique sus trámites.", "Online requests will be available when WF Cargo publishes its services.")}</p>}
        <div className={styles.procedureCards}>
          {[...catalog].sort((a, b) => {
            const rank = (id: string) => serviceOrder.includes(id) ? serviceOrder.indexOf(id) : serviceOrder.length;
            return rank(a.service) - rank(b.service);
          }).map(item => {
            const photo = servicePhotos[item.service];
            const configuration = localizeProcedure(item, locale);
            return (
              <article className={photo ? styles.procedureCard : `${styles.procedureCard} ${styles.procedureCardWithoutPhoto}`} key={item.service}>
                {photo && (
                  <div className={styles.procedureArtwork}>
                    <Image src={photo.src} alt="" fill unoptimized />
                  </div>
                )}
                <div className={styles.procedureCardBody}>
                  <h3>{configuration.title}</h3>
                  <p>{configuration.description}</p>
                  {item.service === "notarizacion" && <NotaryNotice />}
                  {!!configuration.fees.length && <details>
                    <summary>{t("Tarifas de terceros", "Third-party fees")}</summary>
                    <ul>{configuration.fees.map((fee, index) => <li key={index}>{fee.label} · ${fee.amount.toFixed(2)} {fee.unit}</li>)}</ul>
                  </details>}
                  {configuration.agencyFee !== null && <p>{t("Gestión WF Cargo", "WF Cargo service fee")} · ${configuration.agencyFee.toFixed(2)}</p>}
                  <details className={styles.procedureRequirements}>
                    <summary><FileText size={16} aria-hidden="true" /> {configuration.variants.some(v => v.requirements.length > 0) ? t("Ver requisitos", "View requirements") : t("Ver detalles", "View details")}</summary>
                    {configuration.variants.map(variant => (
                      <div key={variant.id}>
                        <strong>{variant.title}</strong>
                        <ul>{variant.requirements.length === 0 && <li>{t("Consulta con WF Cargo las condiciones de este servicio.", "Ask WF Cargo about the terms of this service.")}</li>}{variant.requirements.map(requirement => (
                          <li key={requirement.id}>{requirement.label}{requirement.optional && t(" (opcional)", " (optional)")}</li>
                        ))}</ul>
                      </div>
                    ))}
                  </details>
                  <button type="button" className={styles.procedureAction} disabled={busy} onClick={() => {
                    setService(item.service); setVariant(configuration.variants[0].id); setResult(""); setError("");
                    requestAnimationFrame(() => document.getElementById("solicitud-tramite")?.focus());
                  }}>{t("Solicitar trámite", "Request this service")} <ChevronRight size={18} aria-hidden="true" /></button>
                </div>
              </article>
            );
          })}
        </div>
        {entry && selectedConfiguration && selectedOption && <div id="solicitud-tramite" tabIndex={-1} className={styles.procedureForm}>
          <h3>{selectedConfiguration.title}</h3>
          {entry.service === "notarizacion" && <NotaryNotice />}
          {result ? <div role="status">
            <p>{t("Solicitud recibida. Guarda tu referencia", "Request received. Save your reference")} <strong>{result}</strong>.</p>
            <a href={whatsapp(`${t("Hola, quisiera consultar mi solicitud", "Hello, I’d like to check on my request")} ${result}.`)} target="_blank" rel="noreferrer">{t("Contactar por WhatsApp", "Contact us on WhatsApp")}</a>
          </div> : <form onSubmit={submit}>
            <label>{t("Tipo de trámite", "Request type")}<select value={variant} onChange={event => setVariant(event.target.value)} disabled={busy}>
              {selectedConfiguration.variants.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select></label>
            <fieldset disabled={busy}>
              <legend>{t("Datos de contacto", "Contact information")}</legend>
              <label>{t("Nombre", "Name")}<input name="name" autoComplete="name" required maxLength={120} /></label>
              <label>{t("Teléfono", "Phone")}<input name="phone" type="tel" autoComplete="tel" required maxLength={30} placeholder="+1 772 555 0100" /></label>
              <label>{t("Correo", "Email")}<input name="email" type="email" autoComplete="email" required={entry.configuration.emailRequired !== false} maxLength={254} /></label>
            </fieldset>
            <fieldset key={`${service}:${variant}`} disabled={busy}>
              <legend>{t("¿Qué tienes listo?", "What do you have ready?")}</legend>
              {selectedOption.requirements.map(item => <label key={item.id}>{item.label}
                <select name={`requirement-${item.id}`} required defaultValue="">
                  <option value="" disabled>{t("Selecciona", "Select an option")}</option>
                  <option value="ready">{t("Lo tengo listo", "I have it ready")}</option>
                  <option value="missing">{t("Me falta", "I still need it")}</option>
                  {item.optional && <option value="na">{t("No aplica", "Not applicable")}</option>}
                </select>
              </label>)}
            </fieldset>
            <p>{t("WF Cargo usará tus datos para gestionar la solicitud y retirará el contacto a los 90 días de cerrarla. Trae los documentos cuando WF te indique. Evita compartir documentos o sus números por WhatsApp.", "WF Cargo uses your information to manage the request and removes your contact details 90 days after closing it. Bring your documents when asked. Avoid sharing documents or document numbers on WhatsApp.")}</p>
            <label className={styles.procedureConsent}><input name="whatsapp" type="checkbox" disabled={busy} /> {t("Acepto que WF Cargo me contacte por WhatsApp sobre esta solicitud.", "I agree to receive WhatsApp messages from WF Cargo about this request.")}</label>
            {error && <p role="alert">{locale === "en" ? "We couldn’t submit your request. Check your information and try again." : error}</p>}
            <button type="submit" className={styles.button} disabled={busy}>{busy ? t("Enviando…", "Sending…") : t("Enviar solicitud", "Submit request")}</button>
          </form>}
        </div>}
        <section aria-labelledby="wf-farelas-title">
          <h3 id="wf-farelas-title">Farelas Inmigración Services</h3>
          <NotaryNotice />
        </section>
        <aside className={styles.procedureContact} aria-label={t("Orientación sobre trámites", "Document services assistance")}>
          <div><Headset size={32} aria-hidden="true" /><span><strong>{t("¿Necesitas orientación?", "Need help?")}</strong><br />{t("Nuestro equipo te explica los pasos para tu trámite.", "Our team can explain the steps for your request.")}</span></div>
          <a href={whatsapp(t("Hola, necesito orientación sobre un trámite.", "Hello, I need help with a document service."))} target="_blank" rel="noreferrer"><MessageCircle size={22} aria-hidden="true" /> {t("Contáctanos por WhatsApp", "Message us on WhatsApp")}</a>
          <a href={`tel:+1${contact.phone.replace(/\D/g, "")}`}><Phone size={20} aria-hidden="true" /> {contact.phone}</a>
        </aside>
      </div>
    </section>
  );
}
