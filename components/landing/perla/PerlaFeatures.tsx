import {
  BarChart3,
  Globe2,
  MessageCircle,
  PackageCheck,
  ShoppingCart,
  Store,
} from "lucide-react";

const features = [
  [Store, "Tiendas", "Varias marcas en un panel."],
  [PackageCheck, "Stock", "Productos e inventario."],
  [ShoppingCart, "Órdenes", "Pedidos y clientes."],
  [MessageCircle, "WhatsApp", "Contacto instantáneo."],
  [Globe2, "Dominios", "Dominio o subdominio."],
  [BarChart3, "Reportes", "Datos para decidir."],
];

export default function PerlaFeatures() {
  return (
    <section id="caracteristicas" className="px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-violet-100 bg-white p-4 shadow-2xl shadow-violet-100/80 sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {features.map(([Icon, title, text]) => {
            const FeatureIcon = Icon as typeof Store;

            return (
              <div
                key={title as string}
                className="rounded-2xl border border-violet-100 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:bg-violet-50 hover:shadow-md"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 sm:h-14 sm:w-14">
                  <FeatureIcon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.4} />
                </div>

                <h3 className="mt-3 text-sm font-black text-[#071044] sm:mt-4">
                  {title as string}
                </h3>

                <p className="mt-2 text-xs leading-5 text-[#5c6794] sm:text-sm sm:leading-6">
                  {text as string}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
