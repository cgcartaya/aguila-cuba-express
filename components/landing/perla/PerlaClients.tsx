import { aguilaStoreUrl, demoUrl } from "./links";

const clients = [
  {
    category: "Informática",
    name: "DL Racing Cyber",
    description: "Tienda de componentes, computadoras y accesorios tecnológicos.",
    href: demoUrl,
    button: "Ver tienda",
  },
  {
    category: "Envíos a Cuba",
    name: "Águila Cuba Express",
    description: "Landing corporativa más tienda online integrada en su dominio.",
    href: aguilaStoreUrl,
    button: "Ver tienda",
  },
];

export default function PerlaClients() {
  return (
    <section id="clientes" className="bg-[#081426] px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-black uppercase tracking-[0.3em] text-cyan-300">
            Clientes y demos
          </p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">
            Tiendas reales dentro del ecosistema
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {clients.map((client) => (
            <div
              key={client.name}
              className="rounded-[2rem] border border-white/10 bg-slate-950 p-7"
            >
              <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-300">
                {client.category}
              </p>
              <h3 className="mt-4 text-3xl font-black">{client.name}</h3>
              <p className="mt-3 leading-7 text-white/60">
                {client.description}
              </p>
              <a
                href={client.href}
                target="_blank"
                className="mt-6 inline-block rounded-xl border border-white/15 px-6 py-3 font-black hover:border-cyan-300/70"
              >
                {client.button}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
