import { contact } from "@/components/landing/wfcargo/content";
import { wfCargoOrigin } from "@/lib/saas/wfcargo-hosts";

export const metadata = {
  title: "Política de privacidad | WF Cargo Envíos",
  description: "Cómo WF Cargo Envíos usa los datos de tu cuenta y de tu casillero virtual.",
  alternates: { canonical: wfCargoOrigin + "/privacidad" },
};

export default function PrivacyPage() {
  return <>
    <h1 className="text-4xl font-bold">Política de privacidad</h1>
    <p>Fournier Investment Services LLC opera WF Cargo Envíos y su casillero virtual.</p>
    <h2 className="text-xl font-bold">Acceso con Google</h2>
    <p>Si eliges Continuar con Google, utilizamos los datos básicos de perfil que autorizas, como tu nombre, correo electrónico y foto de perfil. Supabase Auth procesa y conserva los datos de la cuenta necesarios para iniciar sesión. Usamos el correo confirmado para vincular tu cuenta a un casillero existente y mostrarte su código y sus paquetes.</p>
    <h2 className="text-xl font-bold">Registro y gestión del casillero</h2>
    <p>Al abrir un casillero, guardamos tu nombre, correo, teléfono, destino de entrega, datos de identificación y aceptación de las reglas. Usamos estos datos para gestionar tu cuenta, identificar tus paquetes, verificar al titular y coordinar la recepción y el despacho. Si nos contactas por WhatsApp, tratamos los datos y comprobantes que envíes para gestionar tu consulta o prealerta.</p>
    <h2 className="text-xl font-bold">Acceso, proveedores y conservación</h2>
    <p>El personal autorizado accede a los datos necesarios para atender el servicio. Utilizamos proveedores de autenticación, alojamiento y base de datos para operar el portal. Podemos compartir la información necesaria con quienes intervengan en la gestión de tu envío o cuando corresponda por obligación legal. Conservamos los datos mientras sean necesarios para gestionar tu cuenta, tus envíos y las obligaciones asociadas.</p>
    <h2 className="text-xl font-bold">Consultas y solicitudes sobre tus datos</h2>
    <p>Para solicitar acceso, corrección o eliminación de datos, escribe a <a className="text-blue-800 underline" href={`mailto:${contact.email}`}>{contact.email}</a>. WF Cargo puede verificar que eres el titular antes de atender tu solicitud.</p>
  </>;
}
