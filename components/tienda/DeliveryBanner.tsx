import Image from "next/image";

export default function DeliveryBanner() {
  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-[#eef3fb] px-5 py-4 shadow-sm">
      {/* IMAGEN DE FONDO INTEGRADA */}
      <Image
        src="/carro-cajas-mapa.png"
        alt=""
        fill
        aria-hidden="true"
        className="pointer-events-none object-cover object-right opacity-70"
      />

      {/* CAPA PARA QUE EL TEXTO SE LEA BIEN */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#eef3fb] via-[#eef3fb]/90 to-[#eef3fb]/40" />

      {/* CONTENIDO */}
      <div className="relative z-10 flex min-h-[155px] items-center">
        <div className="max-w-[58%]">
          <h2 className="text-[24px] font-black leading-[0.95] text-[#061b3a] sm:text-3xl">
            ENTREGA EN
            <br />
            24-48 HORAS
          </h2>

          <p className="mt-2 text-xs font-semibold leading-snug text-slate-700 sm:text-sm">
            En la mayoría de las provincias de Cuba
          </p>

          <button className="mt-3 rounded-xl bg-[#061b3a] px-4 py-2.5 text-xs font-black text-white shadow-sm">
            Conoce más ❯
          </button>
        </div>
      </div>
    </section>
  );
}