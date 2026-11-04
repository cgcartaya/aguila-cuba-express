import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
const WRITE_ROLES = new Set(["OWNER", "ADMIN"]);
const clean = (v: unknown, n = 500) => String(v ?? "").trim().slice(0, n);
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// Mismo patrón de autenticación que stripe-connect/route.ts.
async function access(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { denied: fail("No se recibió la sesión.", 401) };
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return { denied: fail("Sesión inválida.", 401) };
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return { denied: fail("Usuario inactivo.", 403) };
  if (profile.role === "super_admin") return { denied: null };
  const { data: membership } = await supabaseAdmin.from("store_users").select("role,active").eq("store_id", storeId).eq("user_id", data.user.id).eq("active", true).maybeSingle();
  if (!membership) return { denied: fail("No tienes acceso a esta tienda.", 403) };
  if (!WRITE_ROLES.has(String(membership.role).toUpperCase())) return { denied: fail("Solo el dueño o un admin puede cambiar esto.", 403) };
  return { denied: null };
}


export async function GET(request: NextRequest) {
 const storeId=clean(request.nextUrl.searchParams.get("store_id"),64);
 if(!storeId) return fail("Falta la tienda.");
 const {denied}=await access(request,storeId); if(denied) return denied;
 const {data,error}=await supabaseAdmin.from("store_clover_settings").select("enabled,environment,merchant_id,private_token,webhook_secret").eq("store_id",storeId).maybeSingle();
 if(error) return fail("No se pudo consultar Clover.",500);
 const {data:reviews,error:reviewError}=await supabaseAdmin.from("clover_payment_sessions").select("id,target_type,target_id,created_at,total_cents,payment_id").eq("store_id",storeId).eq("status","review").order("created_at",{ascending:false}).limit(20);
 if(reviewError) return fail("No se pudieron consultar los cobros por revisar.",500);
 return NextResponse.json({ok:true,reviews:reviews||[],enabled:Boolean(data?.enabled),environment:data?.environment||"production",merchantId:data?.merchant_id||"",configured:Boolean(data?.private_token&&data?.webhook_secret),webhookPath:`/api/webhooks/clover/${storeId}`}, {headers:{"Cache-Control":"no-store"}});
}
export async function POST(request: NextRequest) {
 const body=await request.json().catch(()=>({})); const storeId=clean(body.store_id,64);
 if(!storeId) return fail("Falta la tienda.");
 const {denied}=await access(request,storeId); if(denied) return denied;
 const {data:current,error:readError}=await supabaseAdmin.from("store_clover_settings").select("*").eq("store_id",storeId).maybeSingle();
 if(readError) return fail("No se pudo consultar Clover.",500);
 const merchantId=clean(body.merchantId||current?.merchant_id,64);
 const privateToken=clean(body.privateToken||current?.private_token,1000);
 const webhookSecret=clean(body.webhookSecret||current?.webhook_secret,1000);
 const environment=body.environment===undefined?(current?.environment||"production"):body.environment;
 if(!["sandbox","production"].includes(environment)) return fail("Entorno inválido.");
 if(!/^[A-Za-z0-9]{8,64}$/.test(merchantId)||!privateToken||!webhookSecret) return fail("Completa Merchant ID, token privado y secreto del webhook.");
 // Never change credentials while a payment can still arrive for them.
 if(current&&(current.merchant_id!==merchantId||current.environment!==environment||current.webhook_secret!==webhookSecret)) {
  const {count,error}=await supabaseAdmin.from("clover_payment_sessions").select("id",{count:"exact",head:true}).eq("store_id",storeId).in("status",["creating","pending"]);
  if(error||count) return fail("Hay cobros pendientes. Resuélvelos antes de cambiar el comercio, entorno o secreto.",409);
 }
 const {error}=await supabaseAdmin.from("store_clover_settings").upsert({store_id:storeId,merchant_id:merchantId,private_token:privateToken,webhook_secret:webhookSecret,environment,enabled:typeof body.enabled==="boolean"?body.enabled:Boolean(current?.enabled),updated_at:new Date().toISOString()});
 if(error) return fail("No se pudo guardar Clover.",500);
 revalidateTag("payment-availability",{expire:0});
 return NextResponse.json({ok:true});
}
