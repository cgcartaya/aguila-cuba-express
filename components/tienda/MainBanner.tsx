import Image from "next/image";

export default function MainBanner() {
  return (
    <section className="relative h-[285px] overflow-hidden rounded-3xl bg-[#f4f7fb] px-5 py-5 shadow-sm md:h-[420px] md:px-10 md:py-10">
      <div className="relative z-10 w-[48%] md:w-[45%]">
        <h2 className="text-[28px] font-black leading-[1.05] text-[#061b3a] md:text-5xl">
          ENVÍA MÁS,
          <br />
          <span className="text-red-600">PAGA MENOS</span>
        </h2>

        <p className="mt-3 max-w-[190px] text-xs font-bold leading-snug text-slate-700 md:text-base">
          Miles de productos para tu familia en Cuba
        </p>

        <div className="mt-4 grid max-w-[220px] grid-cols-3 gap-2 text-center text-[9px] font-bold text-slate-700 md:text-[10px]">
          <div>
            <div className="mb-1 text-xl">🛡️</div>
            100% Seguro
          </div>
          <div>
            <div className="mb-1 text-xl">🕒</div>
            Entrega rápida
          </div>
          <div>
            <div className="mb-1 text-xl">📍</div>
            Cobertura
          </div>
        </div>

        <a
          href="#ofertas"
          className="mt-4 inline-flex rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-sm md:px-5 md:py-3 md:text-sm"
        >
          Ver ofertas ❯
        </a>
      </div>

      <Image
        src="/logo-tienda.png"
        alt="Productos para enviar a Cuba"
        width={850}
        height={520}
        priority
        className="absolute bottom-6 right-[-18px] h-auto w-[60%] object-contain md:bottom-4 md:right-8 md:w-[52%]"
      />

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        <span className="h-2 w-6 rounded-full bg-red-600" />
        <span className="h-2 w-4 rounded-full bg-slate-300" />
        <span className="h-2 w-4 rounded-full bg-slate-300" />
      </div>
    </section>
  );
}