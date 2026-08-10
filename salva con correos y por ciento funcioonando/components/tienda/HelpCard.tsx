type HelpCardProps = {
  storeName?: string | null;
  whatsapp?: string | null;
};

function normalizeWhatsAppNumber(value?: string | null) {
  if (!value) return "";

  const cleanValue = value.trim();

  if (cleanValue.includes("wa.me/")) {
    const [, afterWaMe] = cleanValue.split("wa.me/");
    return afterWaMe?.split(/[?/#]/)[0]?.replace(/\D/g, "") || "";
  }

  return cleanValue.replace(/\D/g, "");
}

export default function HelpCard({ storeName, whatsapp }: HelpCardProps) {
  const cleanPhone = normalizeWhatsAppNumber(whatsapp);

  if (!cleanPhone) return null;

  const safeStoreName = storeName?.trim() || "esta tienda";

  const message = encodeURIComponent(
    `Hola, necesito ayuda con un pedido de ${safeStoreName}.`
  );

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

        <a
          href={`https://wa.me/${cleanPhone}?text=${message}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#061b3a]"
        >
          Ayuda
        </a>
      </div>
    </section>
  );
}
