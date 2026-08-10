import Image from "next/image";
import Link from "next/link";
import { MapPin, MessageCircle, ShieldCheck } from "lucide-react";

import { NAV_LINKS, STORE_URL, WHATSAPP_URL } from "./constants";

export default function AguilaFooter({ logoUrl }: { logoUrl?: string | null } = {}) {
  const links = [...NAV_LINKS, { label: "Tienda", href: STORE_URL }];
  const resolvedLogo = logoUrl || "/logo.webp";

  return (
    <footer className="bg-[#0d1b30] text-white">
      <div className="mx-auto grid max-w-7xl gap-9 px-5 py-12 sm:px-6 md:grid-cols-[1.3fr_.7fr_.7fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
              <Image src={resolvedLogo} alt="Aguila Express USA" width={56} height={56} className="h-10 w-10 object-contain" />
            </div>
            <p className="font-black">
              AGUILA <span className="text-[#ef4b57]">EXPRESS USA</span>
            </p>
          </div>
          <p className="mt-5 max-w-md text-sm font-semibold leading-6 text-white/50">
            Envíos, compras y seguimiento para llevar lo tuyo a donde más importa.
          </p>
        </div>
        <div>
          <p className="font-black">Navegación</p>
          <div className="mt-4 grid gap-2 text-sm font-semibold text-white/50">
            {links.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="font-black">Contacto</p>
          <div className="mt-4 space-y-3 text-sm font-semibold text-white/50">
            <p className="flex items-center gap-2">
              <MapPin size={16} /> Miami, Florida
            </p>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2">
              <MessageCircle size={16} /> WhatsApp
            </a>
            <p className="flex items-center gap-2">
              <ShieldCheck size={16} /> Atención personalizada
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs font-semibold text-white/35">
        © {new Date().getFullYear()} Aguila Express USA. Todos los derechos reservados.
      </div>
    </footer>
  );
}
