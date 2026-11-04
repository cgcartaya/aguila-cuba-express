import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as db } from '@/lib/supabase-admin';
import { COOKIE, checkOrigin, fail, login, PortalError, session, sha } from '@/lib/delivery/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest) {
  try { const {name,store}=await session(req);return NextResponse.json({name,store},{headers:{'Cache-Control':'no-store'}}); } catch(e){return fail(e);}
}
export async function POST(req:NextRequest) {
  try {
    checkOrigin(req);
    if(Number(req.headers.get('content-length'))>4096) throw new PortalError('Solicitud demasiado grande.',413);
    const body=await req.json();
    const slug=String(body.store||'').trim().toLowerCase(), user=String(body.username||'').trim().toLowerCase(), password=String(body.password||'');
    if(!/^[a-z0-9-]{1,100}$/.test(slug)||!user||user.length>100||!password||password.length>256) throw new PortalError('Completa la agencia, el usuario y la contraseña.');
    const token=await login(slug,user,password);
    const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    response.cookies.set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/delivery',maxAge:16*3600});
    return response;
  } catch(e){return fail(e);}
}
export async function DELETE(req:NextRequest) {
  try {
    checkOrigin(req);
    const token=req.cookies.get(COOKIE)?.value;
    if(token) { const {error}=await db.from('driver_portal_sessions').delete().eq('token_hash',sha(token)); if(error) throw error; }
    const res=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    res.cookies.set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/delivery',maxAge:0});
    return res;
  }catch(e){return fail(e);}
}
