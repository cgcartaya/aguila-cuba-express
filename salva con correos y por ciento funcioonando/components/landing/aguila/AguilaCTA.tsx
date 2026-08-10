import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";

import { TRACKING_URL, WHATSAPP_URL } from "./constants";

export default function AguilaCTA() {
  return (
    <section className="px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[3rem] bg-[#d7a13f] p-8 text-[#0d1b30] md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em]">Estamos cerca</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              Lo importante no es solo que llegue. Es saber que va en buenas manos.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0d1b30] px-7 py-4 font-black text-white"
            >
              <MessageCircle size={19} /> Hablar por WhatsApp
            </a>
            <Link
              href={TRACKING_URL}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0d1b30]/20 bg-white/35 px-7 py-4 font-black"
            >
              <Search size={19} /> Rastrear envío
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
