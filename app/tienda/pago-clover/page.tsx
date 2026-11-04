"use client";
import {Suspense,useEffect,useState} from "react";
import {useSearchParams,useRouter} from "next/navigation";
function CloverConfirmation(){
 const params=useSearchParams();const router=useRouter();
 const session=params.get("session")||"";const next=params.get("next")||"/tienda";
 const [status,setStatus]=useState("pending");const [stopped,setStopped]=useState(false);
 useEffect(()=>{
  let cancelled=false;let timer:ReturnType<typeof setTimeout>;let attempts=0;
  async function poll(){
   try{
    const response=await fetch(`/api/checkout/clover-status?session=${encodeURIComponent(session)}`,{cache:"no-store"});
    const body=await response.json();if(cancelled)return;
    if(response.ok){setStatus(body.status);
     if(body.status==="paid"){
      const destination=new URL(next,window.location.origin);
      router.replace(destination.origin===window.location.origin?destination.pathname+destination.search:"/tienda");return;
     }
     if(["review","failed","expired"].includes(body.status)){setStopped(true);return;}
    }
   }catch{/* Keep polling a transient network failure without claiming payment. */}
   if(cancelled)return;
   if(++attempts>=30){setStopped(true);return;}
   timer=setTimeout(()=>void poll(),2000);
  }
  void poll();return ()=>{cancelled=true;clearTimeout(timer);};
 },[session,next,router]);
 return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center"><h1 className="text-2xl font-black text-slate-950">{status==="review"?"Estamos revisando tu pago":stopped?"Confirmación pendiente":"Confirmando tu pago…"}</h1><p role="status" className="mt-3 text-slate-600">{stopped?"Todavía no podemos confirmar el pago de este pedido o envío. Si Clover mostró un cobro aprobado, no vuelvas a pagar; consulta con la tienda para verificarlo.":"Esperamos la confirmación segura de Clover. Esta página se actualizará automáticamente."}</p>{stopped&&<a href="/tienda" className="mt-6 inline-block font-bold text-emerald-700">Volver a la tienda</a>}</div></main>;
}
export default function CloverConfirmationPage(){return <Suspense fallback={<p>Confirmando pago…</p>}><CloverConfirmation/></Suspense>;}
