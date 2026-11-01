import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import http from 'node:http';
import {pipeline} from 'node:stream/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createBrotliDecompress} from 'node:zlib';
import path from 'node:path';
const root=process.cwd();
const qa=createRequire('/tmp/remittances-qa/package.json');
const {build}=qa('esbuild');
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'__qa.cjs')):qa;
const {chromium}=runtime('playwright');
const binary='/tmp/remittances-qa-chromium';
try{await fs.access(binary);}catch{await pipeline(createReadStream('/tmp/remittances-qa/node_modules/@sparticuz/chromium/bin/chromium.br'),createBrotliDecompress(),createWriteStream(binary));await fs.chmod(binary,0o755);}
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import Shop from '${root}/components/remittances/RemittanceShop.tsx';import Admin from '${root}/app/admin/(store)/shipping/remittances/page.tsx';createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).has('admin')?<Admin/>:<Shop/>);`;
const output='/tmp/remittance-shop-qa.js';
await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},outfile:output,bundle:true,format:'iife',platform:'browser',jsx:'automatic',plugins:[{name:'mocks',setup(b){
 b.onResolve({filter:/^\//,namespace:'mock'},args=>({path:args.path,namespace:'file'}));
 b.onResolve({filter:/^next\/(link|navigation)$/},args=>({path:args.path,namespace:'mock'}));
 b.onResolve({filter:/^@\/(hooks\/useStore|hooks\/useAdminAccess|lib\/supabase)$/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({loader:'js',contents:args.path==='next/link'?`import React from '${root}/node_modules/react/index.js';export default function Link(props){return React.createElement('a',props);}`:args.path==='next/navigation'?`export const useParams=()=>({slug:'alvares-travel'});export const useSearchParams=()=>new URLSearchParams(location.search);`:args.path==='@/lib/supabase'?`export const supabase={auth:{getSession:async()=>({data:{session:{access_token:'valid'}}})}};`:`export const useStore=()=>({store:{id:'211dd255-7168-4045-a278-afc4164a3172',slug:'alvares-travel'}});export const useAdminAccess=()=>({store:{id:'211dd255-7168-4045-a278-afc4164a3172',slug:'alvares-travel'},isSuperAdmin:false});` }));
 b.onResolve({filter:/^@\//},args=>({path:path.resolve(root,args.path.slice(2))+(/\.[a-z]+$/.test(args.path)?'':args.path.includes('/constants')||args.path.includes('/validation')||args.path.includes('/cuba-provinces')?'.ts':'.tsx')}));
}}]});
const script=await fs.readFile(output);
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?script:'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:binary,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const id='10000000-0000-4000-8000-000000000001';
 let tariff=8;let total=216;let created=false;let paid=false;let failOnce=true;const submissions=[];let adminPending=true;
 const order=()=>({reference:id,status:paid?'paid':'pending',amount:200,commission:16,total:216,trackingCode:paid?'ACE-TEST123':null});
 await page.route('**/api/public/remittances/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/quote')){const amount=Number(url.searchParams.get('amount'));total=amount+Math.round(amount*tariff)/100;return route.fulfill({json:{agency:{name:'Álvarez Travel'},quote:{amount,commission:total-amount,total,rate:tariff,currency:'USD'}}});}
  if(route.request().method()==='POST'){
   const data=route.request().postDataJSON();submissions.push(data);assert.equal(data.amount,'200.00');assert.equal(data.expected_total,submissions.length===1?216:218);assert.equal(data.recipient_name,'Destinatario Prueba');
   created=true;
   if(failOnce){failOnce=false;return route.abort('failed');}
   return route.fulfill({status:201,json:{order:order()}});
  }
  assert.equal(created,true);return route.fulfill({json:{order:order()}});
 });
 const base=`http://127.0.0.1:${server.address().port}`;
 await page.goto(base+'/tienda/alvares-travel/remesas?amount=200');
 await page.getByRole('button',{name:'Continuar al checkout'}).waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.querySelector('button[disabled]'));
 await page.getByRole('button',{name:'Continuar al checkout'}).click();
 await page.getByLabel('Nombre y apellidos',{exact:true}).nth(0).fill('Cliente Prueba');
 await page.getByLabel('Teléfono con prefijo del país',{exact:true}).fill('+13055550123');
 await page.getByLabel('Nombre y apellidos',{exact:true}).nth(1).fill('Destinatario Prueba');
 await page.getByLabel('Teléfono con prefijo +53',{exact:true}).fill('+5355550123');
 await page.getByLabel('Dirección completa',{exact:true}).fill('Direccion prueba 123');
 await page.getByLabel('Municipio',{exact:true}).fill('Plaza');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Confirmar pedido de remesa'}).click();
 await page.getByRole('alert').waitFor();
 tariff=9;await page.getByRole('button',{name:'Reintentar',exact:true}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('$218.00'));
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Confirmar pedido de remesa'}).click();
 await page.getByRole('heading',{name:'Pedido recibido · Pago pendiente'}).waitFor();
 assert.equal(submissions.length,2);assert.equal(submissions[0].idempotency_key,submissions[1].idempotency_key);
 assert.match(await page.getByRole('link',{name:'Coordinar pago con la agencia'}).getAttribute('href'),/wa.me\/13055090981/);
 paid=true;await page.getByRole('button',{name:'Consultar estado'}).click();
 await page.getByRole('link',{name:'Rastrear mi remesa'}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Rastrear mi remesa'}).getAttribute('href'),'/rastrear/ACE-TEST123');
 await page.route('**/api/admin/remittances**',async route=>{
  if(route.request().method()==='POST'){
   const data=route.request().postDataJSON();assert.equal(data.action,'confirm');assert.equal(data.payment_reference,'RECIBO-123');adminPending=false;return route.fulfill({json:{shipmentId:'shipment-test'}});
  }
  return route.fulfill({json:{orders:adminPending?[{id,payload:{sender_name:'Cliente',sender_phone:'13055550123',recipient_name:'Destinatario',recipient_phone:'5355550123',recipient_address:'Direccion',recipient_municipality:'Plaza',recipient_province:'La Habana'},amount:200,commission:16,total:216,status:'pending',created_at:'2026-11-01T12:00:00Z'}]:[]}});
 });
 await page.goto(base+'/?admin=1');
 await page.getByRole('button',{name:'Confirmar pago recibido'}).click();
 await page.getByLabel('Importe recibido (USD)').fill('216');
 await page.getByLabel('Referencia o comprobante del pago').fill('RECIBO-123');
 await page.getByRole('button',{name:'Confirmar',exact:true}).click();
 await page.getByRole('status').waitFor();assert.match(await page.getByRole('status').textContent(),/envío de dinero/);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('Browser: checkout móvil, reintento idempotente, consulta de pago/rastreo y confirmación administrativa verificados.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
