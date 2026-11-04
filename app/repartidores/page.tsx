import DriverPortal from '@/components/delivery/DriverPortal';
export default async function Page({searchParams}:{searchParams:Promise<{tienda?:string}>}){
 const {tienda}=await searchParams;
 return <DriverPortal initialStore={typeof tienda==='string'?tienda:''}/>;
}
