import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { FACEBOOK_URL, INSTAGRAM_URL, NAV_LINKS, RESERVAS_URL, STORE_URL, WHATSAPP_URL } from "./constants";

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

export default function JotaJotaFooter({ reservasHref = RESERVAS_URL }: { reservasHref?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#0B0A08] pb-8 pt-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="relative h-12 w-12 overflow-hidden rounded-full ring-1 ring-[#FEBB1B]/25">
              <Image src="/jotajota/logo.webp" alt="Jota Jota" fill className="object-cover" />
            </div>
            <p className="mt-4 max-w-[220px] text-sm leading-6 text-white/45">
              Pizza al horno de leña y cocina napolitana, hecha para pedirse dos veces.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Navegación</p>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map(([label, href]) => (
                <li key={href}>
                  <a href={href} className="text-sm text-white/70 transition hover:text-[#FEBB1B]">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Visítanos</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li>
                <Link href={STORE_URL} className="transition hover:text-[#FEBB1B]">
                  Pedir online
                </Link>
              </li>
              <li>
                <Link href={reservasHref} className="transition hover:text-[#FEBB1B]">
                  Reservar mesa
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Síguenos</p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-[#FEBB1B]/50 hover:text-[#FEBB1B]"
              >
                <InstagramIcon size={17} />
              </a>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-[#FEBB1B]/50 hover:text-[#FEBB1B]"
              >
                <FacebookIcon size={17} />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-[#FEBB1B]/50 hover:text-[#FEBB1B]"
              >
                <MessageCircle size={17} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row">
          <p>© {year} Jota Jota. Todos los derechos reservados.</p>
          <p>Cocina Napolitana · Cuba</p>
        </div>
      </div>
    </footer>
  );
}
