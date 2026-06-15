import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="bg-[#062446] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Águila Cuba Express" width={90} height={90} />
            <div>
              <h1 className="text-2xl font-black leading-tight">
                ÁGUILA <span className="text-red-500">CUBA EXPRESS</span>
              </h1>
              <p className="tracking-[0.35em] text-sm">ENVÍOS A CUBA</p>
            </div>
          </div>

<nav className="hidden gap-8 font-bold lg:flex">
  <a href="/">INICIO</a>
  <a href="/servicios">SERVICIOS</a>
  <a href="/tienda">TIENDA</a>
  <a href="/rastrear">RASTREAR ENVÍO</a>
  <a href="/contacto">CONTACTO</a>
</nav>

          <a
            href="https://wa.me/13054974891"
            className="hidden rounded-xl bg-green-500 px-6 py-3 font-bold lg:block"
          >
            WhatsApp
          </a>
        </div>
      </header>

      <section className="relative min-h-[620px] overflow-hidden">
        <Image
          src="/hero-banner.png"
          alt="Envíos a Cuba"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/55 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[620px] max-w-7xl items-center px-6">
          <div className="max-w-xl">
            <h2 className="text-6xl font-black leading-none text-[#062446] md:text-7xl">
              ENVÍOS A <span className="block text-red-600">CUBA</span>
            </h2>

            <p className="mt-6 text-2xl font-bold text-[#062446]">
              Rápido, seguro y confiable
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a className="rounded-xl bg-[#062446] px-8 py-4 text-center font-bold text-white">
                📦 Rastrear envío
              </a>

              <a className="rounded-xl bg-red-600 px-8 py-4 text-center font-bold text-white">
                🛒 Tienda online
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <h3 className="text-center text-3xl font-black text-[#062446]">
          NUESTROS SERVICIOS
        </h3>

        <div className="mx-auto mt-3 h-1 w-20 rounded bg-red-600" />

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            ["📦", "Envío de paquetes", "Envíos seguros y rápidos a toda Cuba."],
            ["🛍️", "Compras en USA", "Compramos por ti y lo enviamos a Cuba."],
            ["🚚", "Carga y contenedores", "Envíos de carga a mayor escala."],
            ["🛡️", "Seguridad garantizada", "Tu envío protegido de principio a fin."],
          ].map(([icon, title, text]) => (
            <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-4 text-4xl">{icon}</div>
              <h4 className="font-black text-[#062446]">{title}</h4>
              <p className="mt-2 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#062446]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-12 md:grid-cols-2">
          <div className="text-white">
            <h3 className="text-3xl font-black">RASTREA TU ENVÍO</h3>
            <p className="mt-3 text-lg text-white/80">
              Ingresa tu código de rastreo y conoce el estado de tu paquete.
            </p>
          </div>

          <div className="flex overflow-hidden rounded-xl bg-white">
            <input
              placeholder="Ingresa tu código de rastreo"
              className="w-full px-5 py-4 outline-none"
            />
            <button className="bg-red-600 px-8 font-bold text-white">
              Rastrear
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <h3 className="text-4xl font-black text-[#062446]">
            Compras y envíos en un solo lugar
          </h3>
          <p className="mt-4 text-lg text-slate-600">
            Compra productos desde nuestra tienda online y nosotros nos encargamos
            de llevarlos a Cuba de forma segura.
          </p>
        </div>

        <Image
          src="/services-boxes.png"
          alt="Cajas Águila Cuba Express"
          width={700}
          height={450}
          className="rounded-2xl"
        />
      </section>

      <footer className="bg-[#03172d] px-6 py-8 text-center text-white">
        <p className="font-bold">Águila Cuba Express</p>
        <p className="text-sm text-white/70">Envíos a Cuba rápidos, seguros y confiables.</p>
      </footer>
    </main>
  );
}