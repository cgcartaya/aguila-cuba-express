const ITEMS = [
  "PANADERÍA FRANCESA",
  "QUESOS & CHARCUTERÍA",
  "VINOS SELECTOS",
  "BAR & BISTRÓ",
  "MERCADO GOURMET",
  "DELIVERY EN MIAMI",
];

export default function DeParisMarquee() {
  const track = [...ITEMS, ...ITEMS];

  return (
    <div className="relative overflow-hidden border-y border-[#1B1410]/10 bg-[#FC6C26] py-2.5">
      <div className="dp-marquee-track flex w-max items-center gap-8 whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-8 pr-8">
            {track.map((item, i) => (
              <span
                key={`${copy}-${item}-${i}`}
                className="flex items-center gap-8 text-xs font-bold uppercase tracking-[0.24em] text-[#FFF4D6]"
              >
                {item}
                <span className="h-1 w-1 rounded-full bg-[#FFF4D6]/70" />
              </span>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        .dp-marquee-track {
          animation: dpMarquee 32s linear infinite;
        }
        @keyframes dpMarquee {
          from { transform: translate3d(0,0,0); }
          to { transform: translate3d(-50%,0,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dp-marquee-track { animation: none; }
        }
      `}</style>
    </div>
  );
}
