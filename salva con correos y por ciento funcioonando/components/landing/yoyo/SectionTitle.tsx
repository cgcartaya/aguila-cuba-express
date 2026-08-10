export default function SectionTitle({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description: string; dark?: boolean }) {
  return <div><p className={`text-xs font-black uppercase tracking-[0.18em] ${dark ? "text-blue-300" : "text-blue-700"}`}>{eyebrow}</p><h2 className={`mt-2 text-4xl font-black tracking-tight sm:text-5xl ${dark ? "text-white" : "text-[#071d43]"}`}>{title}</h2><p className={`mt-4 max-w-2xl text-base font-semibold leading-7 ${dark ? "text-blue-100/70" : "text-slate-500"}`}>{description}</p></div>;
}
