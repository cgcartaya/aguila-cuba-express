import 'server-only';
import { headers } from 'next/headers';
import { resolvePublicStore } from '@/lib/saas/public-store-resolution';
export async function deliveryBranding(slug:string){
 const store=await resolvePublicStore(slug,(await headers()).get('host')||'');
 return store?{id:store.id,name:store.name,slug:store.slug,logoUrl:store.logo_url||null}:null;
}
