import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ALVAREZ_STORE_SLUG } from '@/components/landing/alvarez/constants';

export default function RemittanceEntry({ storeSlug }: { storeSlug?: string }) {
  if (storeSlug !== ALVAREZ_STORE_SLUG) return null;

  return (
    <section aria-label="Remesas a Cuba" className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4">
      <Link
        href={`/tienda/${storeSlug}/remesas`}
        className="group flex min-h-28 items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:h-28 sm:min-h-0"
      >
        <div className="relative w-24 shrink-0 border-l-4 border-red-600 sm:w-44 lg:w-56">
          {/* A decorative local thumbnail keeps the entire strip one accessible link. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/alvarez/remittance-family.webp"
            alt=""
            width={640}
            height={427}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[48%_42%]"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-3 sm:px-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-700 sm:text-xs">Remesas a Cuba</p>
          <h2 className="mt-1 text-base font-black leading-tight text-[#091D3D] sm:text-xl lg:text-2xl">Más cerca de los tuyos</h2>
          <p className="mt-1 text-xs leading-snug text-slate-600 sm:text-sm">Elige el importe y consulta la comisión.</p>
          <span className="mt-2 inline-flex items-center gap-2 text-xs font-extrabold text-blue-800 sm:hidden">
            Enviar remesa <ArrowRight aria-hidden="true" size={15} />
          </span>
        </div>
        <div className="hidden shrink-0 items-center pr-5 sm:flex lg:pr-6">
          <span className="inline-flex items-center gap-3 rounded-xl bg-[#091D3D] px-5 py-3 text-sm font-extrabold text-white transition group-hover:bg-blue-800">
            Enviar remesa <ArrowRight aria-hidden="true" size={18} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </section>
  );
}
