import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import {
  FACEBOOK_URL,
  INSTAGRAM_URL,
  NAV_LINKS,
  STORE_URL,
  WHATSAPP_URL,
} from "./constants";

/* lucide-react ya no incluye íconos de marcas (Instagram/Facebook),
   así que se dibujan como SVG en línea con el mismo estilo "stroke". */
function InstagramIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4h-2.5A3.5 3.5 0 0 0 9 7.5V10H7v3h2v7h3v-7h2.5l.5-3H12V7.5c0-.4.3-.5.6-.5H15V4Z" />
    </svg>
  );
}

export default function DeParisFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#1B1410]/10 bg-[#FFF4D6] pb-8 pt-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="relative h-12 w-16">
              <Image
                src="/deparis/logo.png"
                alt="De Paris — Mercado"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="mt-4 max-w-[220px] text-sm leading-6 text-[#1B1410]/60">
              Mercado y bistró de inspiración francesa en Cienfuegos, Cuba.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B1410]/50">
              Navegación
            </p>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-sm text-[#1B1410]/75 transition hover:text-[#FC6C26]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B1410]/50">
              Visítanos
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#1B1410]/75">
              <li>
                <Link href={STORE_URL} className="transition hover:text-[#FC6C26]">
                  Tienda online
                </Link>
              </li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-[#FC6C26]"
                >
                  Reservar mesa
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B1410]/50">
              Síguenos
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1B1410]/15 text-[#1B1410] transition hover:border-[#FC6C26]/50 hover:text-[#FC6C26]"
              >
                <InstagramIcon size={17} />
              </a>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1B1410]/15 text-[#1B1410] transition hover:border-[#FC6C26]/50 hover:text-[#FC6C26]"
              >
                <FacebookIcon size={17} />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1B1410]/15 text-[#1B1410] transition hover:border-[#FC6C26]/50 hover:text-[#FC6C26]"
              >
                <MessageCircle size={17} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[#1B1410]/10 pt-6 text-xs text-[#1B1410]/45 sm:flex-row">
          <p>© {year} De Paris. Todos los derechos reservados.</p>
          <p>Mercado &amp; Bistró francés · Cienfuegos, Cuba</p>
        </div>
      </div>
    </footer>
  );
}
