import { Suspense } from 'react';
import RemittanceShop from '@/components/remittances/RemittanceShop';
export const metadata={title:'Enviar una remesa | Álvarez Travel',robots:{index:false,follow:false}};
export default function Page(){return <Suspense fallback={<p className="p-8">Cargando remesas…</p>}><RemittanceShop/></Suspense>;}
