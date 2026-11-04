import { notFound } from 'next/navigation';
import DriverPortal, { type DeliveryRow } from '@/components/delivery/DriverPortal';
import '../../repartidores/portal.css';
export const dynamic='force-dynamic';
const base:DeliveryRow={id:'demo-1',tracking_code:'ENV-02418',package_number:2418,recipient_name:'María Rodríguez',recipient_phone:'+5300000000',recipient_address:'Calle 23, entre L y M. Vedado, La Habana',location:'La Habana',notes:'Llamar antes de llegar. Preguntar por María.',contains_package:true,contains_money:false,money_amount:0,status:'out_for_delivery',delivered:false,delivered_date:null,trip_id:null,trip_order:1,updated_at:'2026-11-04T09:00:00Z',photoUrl:null};
export default function Page(){
 if(process.env.VERCEL_ENV!=='preview')notFound();
 return <DriverPortal demo={{identity:{name:'Daniel Pérez',store:{id:'demo',name:'Agencia de envíos',slug:'demo',logoUrl:null}},rows:[base,{...base,id:'demo-2',tracking_code:'REM-00821',recipient_name:'Roberto Fernández',recipient_address:'Avenida 51, Marianao, La Habana',contains_package:false,contains_money:true,money_amount:150,status:'pending',trip_order:2},{...base,id:'demo-3',tracking_code:'ENV-02420',recipient_name:'Ana García',recipient_address:'Calle 60, Playa, La Habana',contains_money:true,money_amount:100,status:'issue',trip_order:3},{...base,id:'demo-4',recipient_name:'Luis Martínez',tracking_code:'ENV-02412',status:'delivered',delivered:true,trip_order:4}]}}/>;
}
