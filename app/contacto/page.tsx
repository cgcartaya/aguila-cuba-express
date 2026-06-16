import Image from "next/image";

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-[#062446] px-6 py-16 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="font-black uppercase tracking-[0.3em] text-red-400">
              Contacto
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-6xl">
              Habla directamente con Águila Cuba Express
            </h1>

            <p className="mt-5 text-lg text-white/80">
              Coordina envíos, recogidas a domicilio, compras y entregas hacia Cuba.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="https://wa.me/13054974891"
                target="_blank"
                className="rounded-xl bg-green-500 px-8 py-4 text-center font-bold text-white"
              >
                WhatsApp
              </a>

              <a
                href="https://www.facebook.com/frank.aguila.envios.cienfuegos"
                target="_blank"
                className="rounded-xl bg-blue-600 px-8 py-4 text-center font-bold text-white"
              >
                Facebook
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-white p-3 shadow-xl">
            <Image
              src="/frank-contacto.jpg"
              alt="Águila Cuba Express"
              width={900}
              height={1100}
              className="h-[650px] w-full rounded-[1.5rem] object-cover object-top"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-14 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="text-4xl">📱</div>
          <h2 className="mt-4 text-2xl font-black text-[#062446]">WhatsApp</h2>
          <p className="mt-2 text-slate-600">
            Escríbenos para coordinar tu envío o solicitar recogida.
          </p>

          <a
            href="https://wa.me/13054974891"
            target="_blank"
            className="mt-6 inline-block rounded-xl bg-green-500 px-6 py-3 font-bold text-white"
          >
            Escribir ahora
          </a>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="text-4xl">📍</div>
          <h2 className="mt-4 text-2xl font-black text-[#062446]">Dirección</h2>
          <p className="mt-2 text-slate-600">
            2150 Sans Souci Blvd<br />
            North Miami, FL 33181
          </p>

          <a
            href="https://www.google.com/maps/search/?api=1&query=2150%20Sans%20Souci%20Blvd%20North%20Miami%20FL%2033181"
            target="_blank"
            className="mt-6 inline-block rounded-xl bg-[#062446] px-6 py-3 font-bold text-white"
          >
            Cómo llegar
          </a>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="text-4xl">🚚</div>
          <h2 className="mt-4 text-2xl font-black text-[#062446]">
            Recogida en Miami
          </h2>
          <p className="mt-2 text-slate-600">
            Vamos a tu casa a recoger tu paquete en todo Miami.
          </p>

          <a
            href="https://wa.me/13054974891?text=Hola,%20quiero%20solicitar%20recogida%20a%20domicilio."
            target="_blank"
            className="mt-6 inline-block rounded-xl bg-red-600 px-6 py-3 font-bold text-white"
          >
            Solicitar recogida
          </a>
        </div>
      </section>

      <section className="bg-white px-6 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div>
            <p className="font-black uppercase tracking-[0.3em] text-red-600">
              Ubicación
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#062446]">
              Encuéntranos en North Miami
            </h2>

            <p className="mt-4 text-lg text-slate-600">
              Puedes visitarnos o escribirnos para coordinar una recogida a domicilio.
            </p>
          </div>

          <div className="overflow-hidden rounded-[2rem] shadow-sm">
            <iframe
              src="https://www.google.com/maps?q=2150%20Sans%20Souci%20Blvd%20North%20Miami%20FL%2033181&output=embed"
              className="h-[420px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </main>
  );
}