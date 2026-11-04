import type { NextRequest } from 'next/server';
import { deliveryBranding } from '@/lib/delivery/branding';
export async function GET(req:NextRequest){
 const store=new URL(req.url).searchParams.get('tienda')||'';
 const brand=await deliveryBranding(store);
 const suffix=/^[a-z0-9-]{1,100}$/.test(store)?`?tienda=${store}`:'';
 return Response.json({id:'/repartidores'+suffix,name:brand?.name||'Repartidores',short_name:brand?.name||'Repartos',lang:'es',start_url:'/repartidores'+suffix,scope:'/repartidores',display:'standalone',background_color:'#f4f6f3',theme_color:'#133f39',icons:brand?.logoUrl?[{src:brand.logoUrl,sizes:'any',purpose:'any'}]:[{src:'/repartidores/icon/192',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/repartidores/icon/512',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-cache'}});
}
