import Image from "next/image";

export default function DeliveryBanner() {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl bg-[#eef3fb] px-5 py-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="w-[42%] shrink-0">
          <h2 className="text-[26px] font-black leading-[0.95] text-[#061b3a]">
            ENTREGA EN
            <br />
            24-48 HORAS
          </h2>

          <p className="mt-2 text-xs font-semibold leading-snug text-slate-700">
            En la mayoría de las provincias de Cuba
          </p>

          <button className="mt-3 rounded-xl bg-[#061b3a] px-4 py-3 text-xs font-black text-white">
            Conoce más ❯
          </button>
        </div>

        <div className="relative h-[130px] flex-1 md:h-[170px]">
          <Image
            src="/carro-cajas-mapa.png"
            alt="Entrega en Cuba"
            fill
            className="object-contain object-right"
          />
        </div>
      </div>
    </section>
  );
}