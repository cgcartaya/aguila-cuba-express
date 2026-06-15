export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-black text-[#062446]">
          Contacto
        </h1>

        <p className="mt-4 text-lg text-slate-600">
          Comunícate con Águila Cuba Express para coordinar tus envíos, compras o consultas.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#062446]">WhatsApp</h2>
            <p className="mt-2 text-slate-600">
              Escríbenos directamente para recibir atención personalizada.
            </p>

            <a
              href="https://wa.me/13054974891"
              target="_blank"
              className="mt-6 inline-block rounded-xl bg-green-500 px-6 py-3 font-bold text-white"
            >
              Escribir por WhatsApp
            </a>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#062446]">Información</h2>
            <p className="mt-3 text-slate-600">Miami, Florida</p>
            <p className="mt-2 text-slate-600">Envíos a Cuba rápidos, seguros y confiables.</p>
          </div>
        </div>
      </section>
    </main>
  );
}