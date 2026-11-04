import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function GET(request:NextRequest) {
 const id=request.nextUrl.searchParams.get("session")||"";
 if(!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:"Sesión inválida"},{status:400});
 // The random reservation UUID is a capability; return no customer or payment data.
 const {data,error}=await supabaseAdmin.from("clover_payment_sessions").select("status").eq("id",id).maybeSingle();
 if(error)return NextResponse.json({error:"No se pudo consultar"},{status:503});
 if(!data)return NextResponse.json({error:"Sesión no encontrada"},{status:404});
 return NextResponse.json({status:data.status},{headers:{"Cache-Control":"no-store"}});
}
