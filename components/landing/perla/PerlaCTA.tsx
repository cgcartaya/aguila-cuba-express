import { whatsappUrl } from "./links";

export default function PerlaCTA() {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-400 to-blue-600 p-8 text-center text-slate-950 sm:p-12">
        <h2 className="text-3xl font-black sm:text-5xl">
          ¿Listo para vender online?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold opacity-80">
          Crea una tienda profesional para tu negocio y empieza a recibir pedidos.
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          className="mt-8 inline-block rounded-2xl bg-slate-950 px-8 py-4 font-black text-white"
        >
          Crear mi tienda ahora
        </a>
      </div>
    </section>
  );
}
