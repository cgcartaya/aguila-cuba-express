import { MARQUEE_ITEMS } from "./constants";

export default function JotaJotaMarquee() {
  const track = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="relative overflow-hidden bg-[#FEBB1B] py-2.5 [transform:skewY(-1.2deg)] [transform-origin:top_left]">
      <div className="jj-marquee-track flex w-max items-center gap-8 whitespace-nowrap [transform:skewY(1.2deg)]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-8 pr-8">
            {track.map((item, i) => (
              <span
                key={`${copy}-${item}-${i}`}
                className="flex items-center gap-8 text-xs font-black uppercase tracking-[0.24em] text-[#0B0A08]"
              >
                {item}
                <span className="h-1.5 w-1.5 rounded-full bg-[#0B0A08]/70" />
              </span>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        .jj-marquee-track {
          animation: jjMarquee 30s linear infinite;
        }
        @keyframes jjMarquee {
          from { transform: translate3d(0,0,0) skewY(1.2deg); }
          to { transform: translate3d(-50%,0,0) skewY(1.2deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .jj-marquee-track { animation: none; }
        }
      `}</style>
    </div>
  );
}
