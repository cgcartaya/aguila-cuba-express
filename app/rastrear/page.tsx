export default function RastrearPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-slate-900">
      <section className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-black text-[#062446]">
          Rastrear Envío
        </h1>

        <p className="mt-4 text-lg text-slate-600">
          Ingresa tu código de rastreo para consultar el estado de tu paquete.
        </p>

        <div className="mx-auto mt-10 flex max-w-2xl overflow-hidden rounded-2xl border bg-white shadow-sm">
          <input
            placeholder="Ejemplo: ACE-0001"
            className="w-full px-5 py-4 outline-none"
          />

          <button className="bg-red-600 px-8 font-bold text-white">
            Rastrear
          </button>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-slate-50 p-6 text-left">
          <h2 className="text-xl font-black text-[#062446]">
            Estado del envío
          </h2>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full bg-green-500"></span>
              <p>Recibido en Miami</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full bg-yellow-500"></span>
              <p>En tránsito hacia Cuba</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full bg-slate-300"></span>
              <p>Pendiente de entrega</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}