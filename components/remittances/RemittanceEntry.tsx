import Link from 'next/link';
import { ArrowRight,WalletCards } from 'lucide-react';
import { ALVAREZ_STORE_SLUG } from '@/components/landing/alvarez/constants';
export default function RemittanceEntry({storeSlug}:{storeSlug?:string}){
 if(storeSlug!==ALVAREZ_STORE_SLUG)return null;
 return <section className="mx-auto max-w-7xl px-3 py-4 sm:px-4"><Link href={`/tienda/${storeSlug}/remesas`} className="flex items-center gap-4 rounded-3xl border border-blue-100 bg-gradient-to-r from-[#091D3D] to-[#07409A] p-5 text-white shadow-sm sm:p-7"><span className="rounded-2xl bg-white/10 p-4"><WalletCards size={30}/></span><div className="flex-1"><p className="text-xs font-bold uppercase tracking-widest text-blue-200">Remesas a Cuba</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Envía el dinero que tú elijas</h2><p className="mt-2 text-sm text-blue-100">Indica el importe, consulta la comisión y completa tu pedido.</p></div><ArrowRight className="shrink-0"/></Link></section>;
}
