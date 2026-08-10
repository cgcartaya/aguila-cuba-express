import { Gem } from "lucide-react";

export default function PerlaLogo() {
  return (
    <a href="/" className="group flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-blue-500 text-white shadow-xl shadow-violet-300/70 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-violet-400/70">
        <Gem className="h-6 w-6" strokeWidth={2.5} />
      </div>

      <div className="leading-tight">
        <p className="text-lg font-black tracking-tight text-[#071044]">
          Perla
        </p>
        <p className="text-sm font-bold text-[#4c5a8a]">Marketplace</p>
      </div>
    </a>
  );
}
