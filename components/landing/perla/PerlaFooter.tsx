
import PerlaLogo from "./PerlaLogo";

const columns = [
  ["Producto", ["Características", "Cómo funciona", "Precios"]],
  ["Recursos", ["Blog", "Soporte", "Guías"]],
  ["Empresa", ["Sobre nosotros", "Contacto", "Términos"]],
];

export default function PerlaFooter() {
  return (
    <footer className="border-t border-violet-100 bg-white px-5 py-10 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_2fr_1fr]">
        <div>
          <PerlaLogo />
          <p className="mt-4 max-w-xs text-sm leading-6 text-[#5c6794]">
            SaaS para tiendas online modernas, rápidas y fáciles de administrar.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {columns.map(([title, links]) => (
            <div key={title as string}>
              <h4 className="font-black text-[#071044]">{title as string}</h4>

              <div className="mt-3 flex flex-col gap-2 text-sm font-semibold text-[#5c6794]">
                {(links as string[]).map((link) => (
                  <a key={link} href="#" className="hover:text-violet-600">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <h4 className="font-black text-[#071044]">Síguenos</h4>

       <div className="mt-3 flex items-center gap-3">
  {["f", "IG", "YT", "TT"].map((item) => (
    <a
      key={item}
      href="#"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-900 transition hover:bg-violet-100 hover:text-violet-700"
    >
      {item}
    </a>
  ))}
</div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-violet-100 pt-6 text-center text-xs font-semibold text-[#6b75a3] sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Perla Marketplace. Todos los derechos reservados.</p>
        <p>Hecho con ? en Miami</p>
      </div>
    </footer>
  );
}