import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock3, MapPin, MessageCircle, Wallet } from "lucide-react";
import { isWfCargoHost, wfCargoOrigin } from "@/lib/saas/wfcargo-hosts";
import { normalizeStoreHost } from "@/lib/saas/store-metadata";
import { wfCopy, wfLocale } from "@/components/landing/wfcargo/Language";
import { contact, whatsapp } from "@/components/landing/wfcargo/content";
import {
  cashRemittanceFee,
  wfRemittanceCoverage,
  wfRemittanceRates,
  wfRemittancesHref,
} from "@/components/landing/wfcargo/remittances";
import s from "./remesas.module.css";

type Props = { searchParams: Promise<{ lang?: string | string[] }> };

async function requireWfCargoHost() {
  const host = normalizeStoreHost((await headers()).get("host") ?? "");
  if (!host || !isWfCargoHost(host)) notFound();
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await requireWfCargoHost();
  const locale = wfLocale((await searchParams).lang);
  const t = wfCopy(locale);
  const languages = { es: wfCargoOrigin + wfRemittancesHref("es"), en: wfCargoOrigin + wfRemittancesHref("en") };
  return {
    title: t("Remesas a Cuba | WF Cargo Envíos", "Money transfers to Cuba | WF Cargo Envíos"),
    description: t("Consulta cómo enviar remesas a Cuba, las tasas de referencia, los cargos de efectivo y la cobertura por municipio.", "See how to send money to Cuba, including reference rates, cash delivery fees, and coverage by municipality."),
    alternates: { canonical: languages[locale], languages },
  };
}

export default async function WfRemittancesPage({ searchParams }: Props) {
  await requireWfCargoHost();
  const locale = wfLocale((await searchParams).lang);
  const t = wfCopy(locale);
  const format = new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US");
  const rate = wfRemittanceRates;
  const bulletinDate = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    month: "long", day: "numeric", timeZone: "UTC",
  }).format(Date.UTC(2000, rate.month - 1, rate.day));
  const methods = [
    { label: "MLC", currency: "MLC", value: rate.mlc },
    { label: t("CUP por transferencia", "CUP by bank transfer"), currency: "CUP", value: rate.cupTransfer },
    { label: t("CUP en efectivo", "CUP in cash"), currency: "CUP", value: rate.cupCash },
    { label: t("USD en efectivo", "USD in cash"), currency: "USD", value: 1 },
  ];
  const cashExamples = [50, 100];
  const help = whatsapp(t("Hola, quisiera confirmar la tasa y la cobertura para enviar una remesa a Cuba.", "Hello, I’d like to confirm the exchange rate and coverage for a money transfer to Cuba."));

  return (
    <div lang={locale} className={s.page}>
      <header className={s.header}>
        <nav className={s.shell} aria-label={t("Navegación de remesas", "Money transfer navigation")}>
          <Link href={locale === "en" ? "/?lang=en" : "/"}><ArrowLeft size={18} aria-hidden="true" /> WF Cargo Envíos</Link>
          <div className={s.languages} role="group" aria-label={t("Idioma", "Language")}>
            <Link href={wfRemittancesHref("es")} hrefLang="es" lang="es" aria-current={locale === "es" ? "page" : undefined}>Español</Link>
            <Link href={wfRemittancesHref("en")} hrefLang="en" lang="en" aria-current={locale === "en" ? "page" : undefined}>English</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className={s.hero}>
          <div className={s.shell}>
            <p className={s.eyebrow}>WF CARGO ENVÍOS · PORT ST. LUCIE</p>
            <h1>{t("Remesas a Cuba", "Money transfers to Cuba")}</h1>
            <p>{t("Consulta cuánto puede recibir tu familia, cómo se entrega la remesa y si hay cobertura en su municipio.", "Find out how much your family can receive, how the money is delivered, and whether their municipality is covered.")}</p>
            <a className={s.primary} href={wfRemittanceCoverage} target="_blank" rel="noopener noreferrer">{t("Verificar cobertura", "Check coverage")} <ArrowUpRight size={18} aria-hidden="true" /></a>
          </div>
        </section>

        <div className={`${s.shell} ${s.sections}`}>
          <section aria-labelledby="wf-rates">
            <h2 id="wf-rates">{t("Tasas de cambio", "Exchange rates")}</h2>
            <p className={s.date}>{t("Boletín de referencia del", "Reference bulletin dated")} {bulletinDate}</p>
            <p>{t("Las tasas pueden cambiar. Confirma la tasa y el total con WF Cargo antes de pagar.", "Rates may change. Confirm the rate and total with WF Cargo before paying.")}</p>
            <dl className={s.rateGrid}>
              {methods.map(({ label, value, currency }) => (
                <div className={s.card} key={label}>
                  <dt>{label}</dt>
                  <dd><small>1 USD =</small> {format.format(value)} {currency}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={s.panel} aria-labelledby="wf-fees">
            <h2 id="wf-fees"><Wallet aria-hidden="true" /> {t("Cargos para entregas en efectivo", "Cash delivery fees")}</h2>
            <p>{t("La misma regla aplica a CUP y USD en efectivo. El cargo de mensajería se suma al monto enviado.", "The same rule applies to CUP and USD in cash. The delivery fee is added to the amount you send.")}</p>
            <ul>
              <li>{t("Menos de 100 USD", "Under 100 USD")} <strong>· 3 USD</strong></li>
              <li>{t("100 USD o más", "100 USD or more")} <strong>· 3%</strong></li>
            </ul>
            <div className={s.tableWrap}>
              <table>
                <caption>{t("Ejemplos con las tasas del boletín", "Examples using the bulletin rates")}</caption>
                <thead><tr>
                  <th scope="col">{t("Monto enviado", "Amount sent")}</th>
                  <th scope="col">{t("Recibe por transferencia", "Received by bank transfer")}</th>
                  <th scope="col">{t("Recibe en efectivo", "Received in cash")}</th>
                  <th scope="col">{t("Pagas por la entrega en efectivo", "Total you pay for cash delivery")}</th>
                </tr></thead>
                <tbody>{cashExamples.map(usd => (
                  <tr key={usd}>
                    <th scope="row">{usd} USD</th>
                    <td>{format.format(usd * rate.cupTransfer)} CUP</td>
                    <td>{format.format(usd * rate.cupCash)} CUP {t("o", "or")} {usd} USD</td>
                    <td><strong>{format.format(usd + cashRemittanceFee(usd))} USD</strong></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <div className={s.supportGrid}>
            <section className={s.panel} aria-labelledby="wf-coverage">
              <h2 id="wf-coverage"><MapPin aria-hidden="true" /> {t("Consulta el municipio", "Check the municipality")}</h2>
              <p>{t("Verifica el municipio antes de pagar. Si el destino aparece disponible, WF Cargo puede procesar la remesa. Si figura como no disponible, espera a que se restablezca la cobertura.", "Check the municipality before paying. If the destination is available, WF Cargo can process the transfer. If it is unavailable, wait for coverage to resume.")}</p>
              <a className={s.textLink} href={wfRemittanceCoverage} target="_blank" rel="noopener noreferrer">{t("Consultar cobertura por municipio", "Check coverage by municipality")} <ArrowUpRight size={17} aria-hidden="true" /></a>
            </section>
            <section className={s.panel} aria-labelledby="wf-timing">
              <h2 id="wf-timing"><Clock3 aria-hidden="true" /> {t("Tiempos estimados", "Estimated delivery times")}</h2>
              <ul>
                <li>{t("La Habana y cabeceras municipales", "Havana and municipal seats")} <strong>· {t("24–48 horas", "24–48 hours")}</strong></li>
                <li>{t("Otros municipios", "Other municipalities")} <strong>· {t("72 horas", "72 hours")}</strong></li>
              </ul>
              <p>{t("No se realizan entregas los domingos. Los tiempos dependen de la cobertura y la logística local.", "Deliveries exclude Sundays. Timing depends on coverage and local logistics.")}</p>
            </section>
          </div>

          <section className={s.contact} aria-labelledby="wf-remittance-contact">
            <div><h2 id="wf-remittance-contact">{t("Confirma tu remesa con WF Cargo", "Confirm your transfer with WF Cargo")}</h2>
              <p>{t("Consulta la tasa del día, el total a pagar y la disponibilidad para tu destino.", "Ask about today’s rate, the total you’ll pay, and availability at your destination.")}</p></div>
            <a className={s.primary} href={help} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true" /> WhatsApp</a>
          </section>
        </div>
      </main>
      <footer className={`${s.shell} ${s.footer}`}><strong>WF Cargo Envíos</strong><a href={`tel:+1${contact.phone.replace(/\D/g, "")}`}>{contact.phone}</a></footer>
    </div>
  );
}
