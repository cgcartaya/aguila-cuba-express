import LockerRules from "@/components/landing/wfcargo/LockerRules";
import { contact } from "@/components/landing/wfcargo/content";
import { wfCargoOrigin } from "@/lib/saas/wfcargo-hosts";

export const metadata = {
  title: "Condiciones del servicio | WF Cargo Envíos",
  description: "Reglas del casillero virtual de WF Cargo Envíos para recibir y despachar tus compras.",
  alternates: { canonical: wfCargoOrigin + "/condiciones" },
};

export default function TermsPage() {
  return <>
    <h1 className="text-4xl font-bold">Condiciones del servicio</h1>
    <h2 className="text-xl font-bold">Casillero virtual</h2>
    <p>Usa tu nombre completo y tu código WF en la dirección de entrega de tus compras.</p>
    <LockerRules />
    <p>Para consultas sobre estas condiciones, escribe a <a className="text-blue-800 underline" href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
  </>;
}
