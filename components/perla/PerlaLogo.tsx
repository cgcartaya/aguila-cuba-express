import Image from "next/image";
import Link from "next/link";

export default function PerlaLogo() {
  return (
    <Link
      href="/"
      aria-label="Perla Marketplace — Inicio"
      className="group inline-flex min-h-14 items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
    >
      <span className="relative flex h-14 w-16 shrink-0 items-center justify-center">
        <Image
          src="/perla/perla-shell.png"
          alt=""
          width={128}
          height={108}
          priority
          className="h-auto w-[62px] object-contain drop-shadow-[0_8px_16px_rgba(91,33,182,0.28)] transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </span>

      <span className="leading-none">
        <span className="block text-[30px] font-black tracking-[-0.045em] text-[#0d1238]">
          Perla
        </span>
        <span className="mt-1 block text-[14px] font-bold tracking-[0.13em] text-violet-700">
          Marketplace
        </span>
      </span>
    </Link>
  );
}
