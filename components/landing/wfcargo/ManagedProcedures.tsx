"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CatalogEntry } from "@/lib/procedures/catalog";
import Image from "next/image";
import { ChevronRight, Clock, FileText, Headset, Lock, MessageCircle, Phone, ShieldCheck, Users } from "lucide-react";
import { contact, whatsapp } from "./content";
import styles from "./wfcargo.module.css";

const servicePhotos: Record<string, { src: string; alt: string }> = {
  "pasaporte-cubano": { src: "/wfcargo/pasaporte.webp", alt: "Pasaporte cubano" },
  "pasaporte-americano": { src: "/wfcargo/tramites.webp", alt: "Documentación para trámites de pasaporte" },
  "apostilla": { src: "/wfcargo/tramites.webp", alt: "Documentos para trámites y apostillas" },
  "notarizacion": { src: "/wfcargo/tramites.webp", alt: "Documentación para notarización" },
  "evisa-cuba": { src: "/wfcargo/banner-tramites.webp", alt: "Documentos de viaje para Cuba" },
  "renta-carros": { src: "/wfcargo/autos.webp", alt: "Vehículo de alquiler" },
};
const serviceOrder = Object.keys(servicePhotos);

export default function ManagedProcedures() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [service, setService] = useState("");
  const [variant, setVariant] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/procedures", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Catálogo no disponible");
        setCatalog(await response.json());
      })
      .catch(() => { if (!controller.signal.aborted) setCatalogUnavailable(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const entry = catalog.find(item => item.service === service);
  const option = entry?.configuration.variants.find(item => item.id === variant);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entry || !option || busy) return;
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/public/procedures", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service, variant, version: entry.version,
          name: fields.get("name"), email: fields.get("email"),
          phone: fields.get("phone"),
          whatsapp: fields.has("whatsapp"),
          checklist: Object.fromEntries(option.requirements.map(item => [item.id, fields.get(item.id)])),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data.reference);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="tramites" className={styles.procedureSection} aria-labelledby="wf-procedures-title">
      <header className={styles.procedureHero}>
        <div>
          <span className={styles.procedureBadge}><FileText size={18} aria-hidden="true" /> Trámites con WF Cargo</span>
          <h2 id="wf-procedures-title">Gestión de Trámites</h2>
          <p>Te apoyamos con la preparación y gestión de tus documentos de forma segura, rápida y con asesoría personalizada.</p>
          <ul className={styles.procedureBenefits}>
            <li><ShieldCheck aria-hidden="true" /> Asesoría confiable</li>
            <li><Clock aria-hidden="true" /> Gestión ágil</li>
            <li><Users aria-hidden="true" /> Acompañamiento personalizado</li>
            <li><Lock aria-hidden="true" /> Confidencialidad de tus datos</li>
          </ul>
        </div>
        <div className={styles.procedureHeroImage}>
          <Image src="/wfcargo/banner-tramites.webp" alt="" fill sizes="(max-width: 700px) 100vw, 42vw" />
        </div>
      </header>
      <div className={styles.toolBody}>
        {!catalog.length && <p role="status">{loading ? "Cargando trámites…" : catalogUnavailable
          ? "No pudimos cargar los trámites. Inténtalo de nuevo en unos minutos."
          : "Las solicitudes en línea estarán disponibles cuando WF Cargo publique sus trámites."}</p>}
        <div className={styles.procedureCards}>
          {[...catalog].sort((a, b) => {
            const rank = (id: string) => serviceOrder.includes(id) ? serviceOrder.indexOf(id) : serviceOrder.length;
            return rank(a.service) - rank(b.service);
          }).map(item => {
            const photo = servicePhotos[item.service];
            return (
              <article className={styles.procedureCard} key={item.service}>
                <div className={styles.procedureArtwork}>{photo ? <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 30vw, 180px" /> : <FileText size={48} aria-hidden="true" />}</div>
                <div className={styles.procedureCardBody}>
                  <h3>{item.configuration.title}</h3>
                  <p>{item.configuration.description}</p>
                  {!!item.configuration.fees.length && <details>
                    <summary>Tarifas de terceros</summary>
                    <ul>{item.configuration.fees.map((fee, index) => <li key={index}>{fee.label} · ${fee.amount.toFixed(2)} {fee.unit}</li>)}</ul>
                  </details>}
                  {item.configuration.agencyFee !== null && <p>Gestión WF Cargo · ${item.configuration.agencyFee.toFixed(2)}</p>}
                  <details className={styles.procedureRequirements}>
                    <summary><FileText size={16} aria-hidden="true" /> {item.configuration.variants.some(v => v.requirements.length > 0) ? "Ver requisitos" : "Ver detalles"}</summary>
                    {item.configuration.variants.map(variant => (
                      <div key={variant.id}>
                        <strong>{variant.title}</strong>
                        <ul>{variant.requirements.length === 0 && <li>Consulta con WF Cargo las condiciones de este servicio.</li>}{variant.requirements.map(requirement => (
                          <li key={requirement.id}>{requirement.label}{requirement.optional && " (opcional)"}</li>
                        ))}</ul>
                      </div>
                    ))}
                  </details>
                  <button type="button" className={styles.procedureAction} disabled={busy} onClick={() => {
                    setService(item.service); setVariant(item.configuration.variants[0].id); setResult(""); setError("");
                    requestAnimationFrame(() => document.getElementById("solicitud-tramite")?.focus());
                  }}>Solicitar trámite <ChevronRight size={18} aria-hidden="true" /></button>
                </div>
              </article>
            );
          })}
        </div>
        {entry && option && <div id="solicitud-tramite" tabIndex={-1} className={styles.procedureForm}>
          <h3>{entry.configuration.title}</h3>
          {result ? <div role="status">
            <p>Solicitud recibida. Guarda tu referencia <strong>{result}</strong>.</p>
            <a href={whatsapp(`Hola, quisiera consultar mi solicitud ${result}.`)} target="_blank" rel="noreferrer">Contactar por WhatsApp</a>
          </div> : <form onSubmit={submit}>
            <label>Tipo de trámite<select value={variant} onChange={event => setVariant(event.target.value)} disabled={busy}>
              {entry.configuration.variants.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select></label>
            <fieldset disabled={busy}>
              <legend>Datos de contacto</legend>
              <label>Nombre<input name="name" autoComplete="name" required maxLength={120} /></label>
              <label>Teléfono<input name="phone" type="tel" autoComplete="tel" required maxLength={30} placeholder="+1 772 555 0100" /></label>
              <label>Correo<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
            </fieldset>
            <fieldset key={`${service}:${variant}`} disabled={busy}>
              <legend>¿Qué tienes listo?</legend>
              {option.requirements.map(item => <label key={item.id}>{item.label}
                <select name={item.id} required defaultValue="">
                  <option value="" disabled>Selecciona</option>
                  <option value="ready">Lo tengo listo</option>
                  <option value="missing">Me falta</option>
                  {item.optional && <option value="na">No aplica</option>}
                </select>
              </label>)}
            </fieldset>
            <p>WF Cargo usará tus datos para gestionar la solicitud y retirará el contacto a los 90 días de cerrarla. Trae los documentos cuando WF te indique. Evita compartir documentos o sus números por WhatsApp.</p>
            <label className={styles.procedureConsent}><input name="whatsapp" type="checkbox" disabled={busy} /> Acepto que WF Cargo me contacte por WhatsApp sobre esta solicitud.</label>
            {error && <p role="alert">{error}</p>}
            <button type="submit" className={styles.button} disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}</button>
          </form>}
        </div>}
        <aside className={styles.procedureContact} aria-label="Orientación sobre trámites">
          <div><Headset size={32} aria-hidden="true" /><span><strong>¿Necesitas orientación?</strong><br />Nuestro equipo te asesora en el trámite que necesites.</span></div>
          <a href={whatsapp("Hola, necesito orientación sobre un trámite.")} target="_blank" rel="noreferrer"><MessageCircle size={22} aria-hidden="true" /> Contáctanos por WhatsApp</a>
          <a href={`tel:+1${contact.phone.replace(/\D/g, "")}`}><Phone size={20} aria-hidden="true" /> {contact.phone}</a>
        </aside>
      </div>
    </section>
  );
}
