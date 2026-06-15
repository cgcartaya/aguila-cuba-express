export default function ServiciosPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-black text-[#062446]">
          Nuestros Servicios
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          En Águila Cuba Express ofrecemos soluciones rápidas, seguras y confiables
          para enviar paquetes, compras y carga hacia Cuba.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["📦", "Envío de paquetes", "Entrega de paquetes personales y familiares hacia Cuba."],
            ["🛍️", "Compras en USA", "Compra productos y nosotros nos encargamos del envío."],
            ["🚚", "Carga y contenedores", "Soluciones para envíos de mayor volumen."],
            ["🛡️", "Seguridad garantizada", "Tus paquetes protegidos durante todo el proceso."],
            ["📍", "Seguimiento", "Consulta el estado de tus envíos en línea."],
            ["🤝", "Atención personalizada", "Acompañamiento directo para cada cliente."],
          ].map(([icon, title, text]) => (
            <div key={title} className="rounded-2xl border p-6 shadow-sm">
              <div className="text-4xl">{icon}</div>
              <h2 className="mt-4 text-xl font-black text-[#062446]">{title}</h2>
              <p className="mt-2 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}