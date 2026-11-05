import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { supabaseAdmin as db } from '@/lib/supabase-admin';
import { assignmentFilter, type DriverScope } from './policy';
export const COOKIE = 'delivery_session';
export const sha = (value: string) => createHash('sha256').update(value).digest('hex');
export const fingerprint = (value: string) => createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update('driver-portal:'+value).digest('hex');
export class PortalError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function fail(error: unknown) {
  const known = error instanceof PortalError;
  // Avoid logging credentials, session tokens or request bodies.
  if (!known) console.error('Delivery portal backend request failed');
  return Response.json({ error: known ? error.message : 'No se pudo completar la operación. Reintenta.' }, { status: known ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
}
export function checkOrigin(req: NextRequest) {
  if (req.headers.get('origin') !== new URL(req.url).origin || req.headers.get('x-delivery-request') !== '1') throw new PortalError('Solicitud no permitida.', 403);
}
export async function storeFor(id: string) {
  const {data,error} = await db.from('stores').select('id,name,slug,logo_url,is_active,module_shipping_enabled').eq('id',id).maybeSingle();
  if (error) throw error;
  if (!data?.is_active || !data.module_shipping_enabled) throw new PortalError('La agencia no tiene disponible el módulo de envíos.',403);
  return { id:data.id, name:data.name, slug:data.slug, logoUrl:data.logo_url };
}
const staffFields='id,store_id,username,password_hash,role,status,first_name,last_name,photo_url,legacy_app_user_id';
const legacyFields='id,store_id,username,password_hash,role,is_active,name';
type Account = { id:string; store_id:string|null; username:string; password_hash:string; role:string; status?:string; is_active?:boolean; first_name?:string; last_name?:string; legacy_app_user_id?:string|null; name?:string; photo_url?:string|null };
export async function identity(source: string, account: Account, storeId: string) {
  const scope: DriverScope = { storeId, staffId: null, legacyId: null };
  let photoUrl=account.photo_url||null;
  if (source === 'staff') {
    if (account.store_id !== storeId || account.status !== 'ACTIVE' || account.role !== 'DELIVERY') throw new PortalError('Cuenta de repartidor no disponible.',401);
    scope.staffId=account.id; scope.legacyId=account.legacy_app_user_id || null;
  } else {
    if (!account.is_active || account.role !== 'DRIVER' || (account.store_id && account.store_id !== storeId)) throw new PortalError('Cuenta de repartidor no disponible.',401);
    const {data:linked,error} = await db.from('staff_users').select(staffFields).eq('store_id',storeId).eq('legacy_app_user_id',account.id).limit(2);
    if(error) throw error;
    if(linked && linked.length > 1) throw new PortalError('Revisa la vinculación de esta cuenta con la agencia.',403);
    if(linked?.[0]) {
      if(linked[0].status !== 'ACTIVE' || linked[0].role !== 'DELIVERY') throw new PortalError('Cuenta de repartidor no disponible.',401);
      scope.staffId=linked[0].id; photoUrl=linked[0].photo_url||null;
    }
    scope.legacyId=account.id;
    if (!account.store_id) {
      const {data,error} = await db.from('shipments').select('id').eq('store_id',storeId).eq('assigned_driver_id',account.id).is('deleted_at',null).limit(1);
      if(error) throw error;
      if(!data?.length) throw new PortalError('Esta cuenta no está vinculada a la agencia indicada.',401);
    }
  }
  return { scope, photoUrl, name: account.name || [account.first_name,account.last_name].filter(Boolean).join(' ') || account.username };
}
export async function login(storeSlug: string, username: string, password: string) {
  const key=fingerprint('login:'+storeSlug+':'+username);
  const {data:attempts,error:rateError}=await db.rpc('driver_portal_login_attempt',{p_key:key});
  if(rateError) throw rateError;
  if(Number(attempts)>10) throw new PortalError('Demasiados intentos. Espera 15 minutos antes de reintentar.',429);
  const {data:store,error:storeError}=await db.from('stores').select('id').eq('slug',storeSlug).maybeSingle();
  if(storeError) throw storeError;
  if(!store) throw new PortalError('Agencia, usuario o contraseña incorrectos.',401);
  await storeFor(store.id);
  const {data:staff,error}=await db.from('staff_users').select(staffFields).eq('store_id',store.id).eq('username',username).maybeSingle();
  if(error) throw error;
  let account: Account|null=staff; let source='staff';
  // An inactive staff account must never fall back to an older account.
  if(!account) {
    source='legacy';
    const {data,error}=await db.from('app_users').select(legacyFields).eq('username',username).or(`store_id.eq.${store.id},store_id.is.null`).limit(2);
    if(error) throw error;
    if(data?.length===1) account=data[0];
  }
  const actual=Buffer.from(account?.password_hash || '0'.repeat(64));
  const expected=Buffer.from(sha(password));
  if(actual.length!==expected.length || !timingSafeEqual(actual,expected) || !account) throw new PortalError('Agencia, usuario o contraseña incorrectos.',401);
  await identity(source,account,store.id);
  const token=randomBytes(32).toString('hex');
  const {error:saveError}=await db.from('driver_portal_sessions').insert({token_hash:sha(token),account_id:account.id,account_source:source,store_id:store.id,credential_fingerprint:fingerprint(account.password_hash),expires_at:new Date(Date.now()+16*3600000).toISOString()});
  if(saveError) throw saveError;
  return token;
}
export async function session(req: NextRequest) {
  const token=req.cookies.get(COOKIE)?.value || '';
  if(!/^[a-f0-9]{64}$/.test(token)) throw new PortalError('Inicia sesión para ver tus entregas.',401);
  const {data:s,error}=await db.from('driver_portal_sessions').select('*').eq('token_hash',sha(token)).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(error) throw error;
  if(!s) throw new PortalError('La sesión ha caducado. Vuelve a entrar.',401);
  const {data:account,error:accountError}=s.account_source==='staff'
    ? await db.from('staff_users').select(staffFields).eq('id',s.account_id).maybeSingle()
    : await db.from('app_users').select(legacyFields).eq('id',s.account_id).maybeSingle();
  if(accountError) throw accountError;
  if(!account || fingerprint(account.password_hash)!==s.credential_fingerprint) throw new PortalError('La cuenta ha cambiado. Vuelve a entrar.',401);
  const store=await storeFor(s.store_id);
  const driver=await identity(s.account_source,account as unknown as Account,s.store_id);
  return { ...driver, store };
}
export const shipmentFields='id,store_id,tracking_code,package_number,recipient_name,recipient_phone,recipient_address,location,notes,contains_package,contains_money,money_amount,money_delivery_currency,money_exchange_rate,money_delivery_amount,store_products,status,delivered,delivered_date,delivery_photo_url,trip_id,trip_order,updated_at,assigned_staff_id,assigned_driver_id';
export function assigned(scope: DriverScope) {
  return db.from('shipments').select(shipmentFields).eq('store_id',scope.storeId).is('deleted_at',null).or(assignmentFilter(scope));
}
