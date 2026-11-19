"use client";

import { useState } from "react";
import { ArrowUpRight, PackageSearch, X } from "lucide-react";
import { wfCopy, type WfLocale } from "./Language";
import s from "./wfcargo.module.css";

const portal = "https://zaicargo.controlbox.net/app/rastreo/";
const dialogId = "wf-cargo-tracking";
const countries = [
  { code: "CO", flag: "🇨🇴", es: "Colombia", en: "Colombia" },
  { code: "MX", flag: "🇲🇽", es: "México", en: "Mexico" },
  { code: "VE", flag: "🇻🇪", es: "Venezuela", en: "Venezuela" },
  { code: "HN", flag: "🇭🇳", es: "Honduras", en: "Honduras" },
  { code: "SV", flag: "🇸🇻", es: "El Salvador", en: "El Salvador" },
] as const;

export function TrackingButton({ locale, primary = false }: { locale: WfLocale; primary?: boolean }) {
  const t = wfCopy(locale);

  return (
    <button
      type="button"
      className={primary ? s.button : s.trackingNav}
      aria-haspopup="dialog"
      aria-controls={dialogId}
      onClick={() => {
        const dialog = document.getElementById(dialogId);
        if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
      }}
    >
      {primary && <PackageSearch size={19} aria-hidden="true" />}
      {t("Rastreo internacional", "International tracking")}
    </button>
  );
}

export function TrackingDialog({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  const [country, setCountry] = useState<(typeof countries)[number] | null>(null);

  return (
    <dialog
      id={dialogId}
      className={s.trackingDialog}
      aria-labelledby="wf-tracking-title"
      onClose={() => setCountry(null)}
    >
      <div className={s.trackingHeading}>
        <div>
          <h2 id="wf-tracking-title">{t("Rastrea tu envío", "Track your shipment")}</h2>
          <p>{t("Rastreo disponible únicamente para los destinos de esta lista.", "Tracking is available only for the destinations listed below.")}</p>
        </div>
        <form method="dialog">
          <button type="submit" className={s.trackingClose} aria-label={t("Cerrar rastreo", "Close tracking")}>
            <X size={22} aria-hidden="true" />
          </button>
        </form>
      </div>
      <fieldset className={s.trackingCountries}>
        <legend>{t("Selecciona el país de destino", "Select your destination country")}</legend>
        <div>
          {countries.map((destination) => (
            <button
              type="button"
              key={destination.code}
              aria-pressed={country?.code === destination.code}
              onClick={() => setCountry(destination)}
            >
              <span className={s.trackingFlag} aria-hidden="true">{destination.flag}</span>
              {destination[locale]}
            </button>
          ))}
        </div>
      </fieldset>
      {country && (
        <div className={s.trackingPortal}>
          <h3>{country[locale]} · ZAI Cargo</h3>
          <iframe
            src={portal}
            className={s.trackingFrame}
            title={t("Formulario de rastreo de ZAI Cargo", "ZAI Cargo tracking form")}
          />
          <a href={portal} target="_blank" rel="noopener noreferrer">
            {t("Abrir rastreo en ZAI Cargo (nueva pestaña)", "Open ZAI Cargo tracking (new tab)")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      )}
    </dialog>
  );
}
