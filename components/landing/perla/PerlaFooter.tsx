import { aguilaStoreUrl, demoUrl, whatsappUrl } from "./links";

export default function PerlaFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
        <div>
          <h3 className="text-xl font-black">Perla Marketplace</h3>
          <p className="mt-3 text-white/50">
            SaaS para crear y administrar tiendas online multiempresa.
          </p>
        </div>

        <div>
          <h4 className="font-black">Producto</h4>
          <div className="mt-3 flex flex-col gap-2 text-white/50">
            <a href="#funciones">Funciones</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#clientes">Clientes</a>
          </div>
        </div>

        <div>
          <h4 className="font-black">Demos</h4>
          <div className="mt-3 flex flex-col gap-2 text-white/50">
            <a href={demoUrl} target="_blank">
              DL Racing
            </a>
            <a href={aguilaStoreUrl} target="_blank">
              Águila Cuba Express
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-black">Contacto</h4>
          <a
            href={whatsappUrl}
            target="_blank"
            className="mt-3 inline-block rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-6 text-center text-sm text-white/40">
        © 2026 Perla Marketplace. Todos los derechos reservados.
      </div>
    </footer>
  );
}
