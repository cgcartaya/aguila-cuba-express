import Link from "next/link";
import PublicQuoteCalculator from "@/components/portal/PublicQuoteCalculator";
export default function QuotePage(){return <main className="min-h-screen bg-slate-100"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><Link href="/" className="text-xl font-black text-[#071d43]">Volver al inicio</Link><Link href="/rastrear" className="font-black text-blue-700">Rastrear envío</Link></div></header><section className="mx-auto max-w-7xl px-5 py-10"><PublicQuoteCalculator/></section></main>}
