import { PROCESS_STEPS } from "./constants";

export default function AguilaProcess() {
  return (
    <section id="proceso" className="bg-[#0d1b30] py-20 text-white">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#d7a13f]">Así funciona</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
              Un camino claro, de tus manos a las de tu gente.
            </h2>
          </div>
          <p className="max-w-md font-semibold leading-7 text-white/55">
            Cada etapa queda organizada y visible para que tengas más tranquilidad.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {PROCESS_STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="relative rounded-[2rem] border border-white/10 bg-white/[.045] p-6">
                <span className="absolute right-5 top-4 text-5xl font-black text-white/[.05]">0{index + 1}</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d7a13f] text-[#0d1b30]">
                  <Icon size={21} />
                </div>
                <h3 className="mt-7 text-xl font-black">{item.title}</h3>
                <p className="mt-2 font-medium leading-7 text-white/55">{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
