export default function HelpCard() {
  return (
    <section className="mt-5 rounded-2xl bg-[#061b3a] px-4 py-3 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🟢</div>

          <div>
            <h3 className="text-sm font-black">
              ¿Necesitas ayuda con tu pedido?
            </h3>

            <p className="text-xs text-white/70">
              Escríbenos y te ayudamos de inmediato.
            </p>
          </div>
        </div>

        <button className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#061b3a]">
          Ayuda ❯
        </button>
      </div>
    </section>
  );
}