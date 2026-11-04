import type { Metadata } from 'next';
import DriverPortal from '@/components/delivery/DriverPortal';
import { deliveryBranding } from '@/lib/delivery/branding';
type Props={searchParams:Promise<{tienda?:string}>};
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{
 const {tienda}=await searchParams;const brand=await deliveryBranding(typeof tienda==='string'?tienda:'');
 const slug=brand?.slug||'';
 return {title:{absolute:brand?`${brand.name} · Repartidores`:'Repartidores'},manifest:'/repartidores/manifest.webmanifest?tienda='+encodeURIComponent(slug),appleWebApp:{capable:true,title:brand?.name||'Repartidores',statusBarStyle:'default'},icons:{icon:brand?.logoUrl||'/repartidores/icon/192',apple:brand?.logoUrl||'/repartidores/icon/180'}};
}
export default async function Page({searchParams}:Props){
 const {tienda}=await searchParams;const brand=await deliveryBranding(typeof tienda==='string'?tienda:'');
 return <DriverPortal initialStore={brand?.slug||(typeof tienda==='string'?tienda:'')} initialBrand={brand}/>;
}
